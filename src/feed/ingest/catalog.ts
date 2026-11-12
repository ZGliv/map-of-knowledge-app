// The stored video catalog (content/feed/catalog.json): what the ingest learned about each video
// on the allowlist, merged from the free RSS feeds, YouTube's oEmbed check and, when a key is set,
// the Data API. Pure functions over plain data; scripts/feed/ingest.mjs does the fetching.
//
// YouTube's developer policies ask that stored metadata be refreshed (or dropped) within 30 days,
// so every video carries the time it was last confirmed and the ingest re-checks before then.

import type { FeedEntry } from './rss';

export interface StoredVideo {
  id: string;
  channelId: string;
  title: string;
  /** The start of the description: enough to classify, never a copy of the page. */
  description: string;
  publishedAt: string | null;
  short: boolean;
  views: number | null;
  firstSeenAt: string;
  /** When a feed, oEmbed or the Data API last confirmed this video's metadata. */
  refreshedAt: string;
  /** When embeddability was last checked; null until it has been. */
  checkedAt: string | null;
  checkedBy: 'oembed' | 'api' | null;
  /** null until checked. */
  embeddable: boolean | null;
  /** Player width over height: under 1 is vertical. */
  aspect: number | null;
  /** Data API only. */
  durationSec: number | null;
  madeForKids: boolean | null;
  /** Private, removed or age-restricted: never shown. */
  gone?: boolean;
}

export interface VideoCatalog {
  version: 1;
  updatedAt: string;
  videos: StoredVideo[];
}

export const REFRESH_DAYS = 25;
export const MAX_AGE_DAYS = 30;
export const DESCRIPTION_CHARS = 320;
const DAY = 86_400_000;

export const createCatalog = (now: string): VideoCatalog => ({ version: 1, updatedAt: now, videos: [] });

const trimDescription = (text: string) => {
  const flat = text.replace(/\r/g, '').trim();
  return flat.length <= DESCRIPTION_CHARS ? flat : `${flat.slice(0, DESCRIPTION_CHARS).replace(/\s+\S*$/, '')}…`;
};

/** Merge one feed's entries for `channelId`. Returns the IDs that were new. */
export function mergeEntries(videos: Map<string, StoredVideo>, channelId: string, entries: readonly FeedEntry[], now: string): string[] {
  const added: string[] = [];
  for (const entry of entries) {
    if (entry.channelId && entry.channelId !== channelId) continue;
    const before = videos.get(entry.videoId);
    const description = trimDescription(entry.description);
    if (!before) {
      added.push(entry.videoId);
      videos.set(entry.videoId, {
        id: entry.videoId, channelId, title: entry.title, description, publishedAt: entry.published, short: entry.short, views: entry.views,
        firstSeenAt: now, refreshedAt: now, checkedAt: null, checkedBy: null, embeddable: null, aspect: null, durationSec: null, madeForKids: null,
      });
      continue;
    }
    videos.set(entry.videoId, {
      ...before,
      title: entry.title || before.title,
      description: description || before.description,
      publishedAt: entry.published ?? before.publishedAt,
      short: before.short || entry.short,
      views: entry.views ?? before.views,
      refreshedAt: now,
    });
  }
  return added;
}

const ageDays = (iso: string | null, now: string) => iso ? (Date.parse(now) - Date.parse(iso)) / DAY : Infinity;

/** Not yet checked, or its last check is old enough that the next run should repeat it. */
export const dueForCheck = (video: StoredVideo, now: string, days = REFRESH_DAYS) => !video.gone && (video.embeddable === null || ageDays(video.checkedAt, now) >= days || ageDays(video.refreshedAt, now) >= days);

/** Metadata older than the policy allows: it must be refreshed before it is shown again. */
export const isStale = (video: StoredVideo, now: string, days = MAX_AGE_DAYS) => ageDays(video.refreshedAt, now) > days;

/** oEmbed answers 200 for an embeddable video (with its player size), 401/403 when embedding is
 * off, and 404 when the video is private or gone. Anything else leaves the video as it was. */
export function applyOembed(video: StoredVideo, result: { status: number; width?: number; height?: number; title?: string }, now: string): StoredVideo {
  if (result.status === 200) {
    const aspect = result.width && result.height ? Math.round((result.width / result.height) * 1000) / 1000 : video.aspect;
    return { ...video, embeddable: true, aspect, title: result.title || video.title, checkedAt: now, refreshedAt: now, checkedBy: video.checkedBy === 'api' ? 'api' : 'oembed', gone: undefined };
  }
  if (result.status === 401 || result.status === 403) return { ...video, embeddable: false, checkedAt: now, refreshedAt: now, checkedBy: video.checkedBy ?? 'oembed' };
  if (result.status === 404) return { ...video, gone: true, checkedAt: now };
  return video;
}

/** ISO 8601 durations as YouTube writes them: PT1M3S, PT2H, P1DT4M. */
export function parseIsoDuration(value: string | undefined | null): number | null {
  const match = value?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match || value === 'P' || value === 'PT') return null;
  const [, d, h, m, s] = match.map(part => Number(part ?? 0));
  return d * 86_400 + h * 3_600 + m * 60 + s;
}

/** The parts of a Data API videos.list item (part=snippet,contentDetails,status,player) we keep. */
export interface ApiVideo {
  id: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; channelId?: string };
  contentDetails?: { duration?: string; contentRating?: { ytRating?: string }; regionRestriction?: { allowed?: string[]; blocked?: string[] } };
  status?: { embeddable?: boolean; madeForKids?: boolean; privacyStatus?: string; uploadStatus?: string };
  player?: { embedWidth?: string | number; embedHeight?: string | number };
}

/** Fold one API item into a stored video. Age-restricted, private and region-blocked (for `region`)
 * videos are marked gone: none of them can play in an embed here. */
export function applyApi(video: StoredVideo, item: ApiVideo, now: string, region = 'US'): StoredVideo {
  const width = Number(item.player?.embedWidth), height = Number(item.player?.embedHeight);
  const restriction = item.contentDetails?.regionRestriction;
  const blocked = !!restriction && ((restriction.blocked ?? []).includes(region) || (!!restriction.allowed && !restriction.allowed.includes(region)));
  const unplayable = item.status?.privacyStatus === 'private' || item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted' || blocked
    || (item.status?.uploadStatus !== undefined && item.status.uploadStatus !== 'processed');
  return {
    ...video,
    title: item.snippet?.title || video.title,
    description: item.snippet?.description !== undefined ? trimDescription(item.snippet.description) || video.description : video.description,
    publishedAt: item.snippet?.publishedAt ?? video.publishedAt,
    durationSec: parseIsoDuration(item.contentDetails?.duration) ?? video.durationSec,
    embeddable: item.status?.embeddable ?? video.embeddable,
    madeForKids: item.status?.madeForKids ?? video.madeForKids,
    aspect: width > 0 && height > 0 ? Math.round((width / height) * 1000) / 1000 : video.aspect,
    checkedAt: now,
    refreshedAt: now,
    checkedBy: 'api',
    gone: unplayable || undefined,
  };
}

/** A video the API no longer returns (removed or private). */
export const markGone = (video: StoredVideo, now: string): StoredVideo => ({ ...video, gone: true, checkedAt: now });

/** Embeddable, not made for kids, still there, and confirmed within the policy window. */
export const isPlayable = (video: StoredVideo, now: string) => video.embeddable === true && video.madeForKids !== true && !video.gone && !isStale(video, now);

/** Stored order: newest first, so a diff of the catalog reads like a feed. */
export function sortVideos(videos: Iterable<StoredVideo>): StoredVideo[] {
  return [...videos].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.id.localeCompare(b.id));
}
