// The pool the app plays from (src/feed/pool.json): every video that is embeddable, recently
// confirmed, judged educational and tagged to real atlas places. scripts/feed/build.mjs writes it
// from content/feed (catalog + tags + hand overrides) with buildPool below.

import type { StoredVideo } from './ingest/catalog';
import { checkPlaces, type PlaceLookup } from './places';

export interface FeedVideo {
  /** The provider's video ID (YouTube's 11 characters). */
  id: string;
  channel: string;
  title: string;
  /** One plain line on what you learn. */
  learn: string;
  /** 1–3 atlas places, primary first. */
  places: string[];
  short: boolean;
  /** Player width over height; under 1 is vertical. */
  aspect: number;
  /** Seconds, when known (Data API). */
  duration: number | null;
  /** YYYY-MM-DD. */
  published: string | null;
  /** YouTube's view count when the catalog last looked: with its age, a rough sign of how well it lands. */
  views?: number | null;
}

export interface FeedPool {
  version: 1;
  builtAt: string;
  channels: Record<string, { name: string }>;
  videos: FeedVideo[];
}

export interface Tag { educational: boolean; places?: string[]; learn?: string; reason?: string }
export interface Override { educational?: boolean; places?: string[]; learn?: string; note?: string }

export interface BuildInput {
  videos: readonly StoredVideo[];
  tags: Readonly<Record<string, Tag>>;
  overrides: Readonly<Record<string, Override>>;
  channels: readonly { id: string; name: string }[];
  lookup: Pick<PlaceLookup, 'get'>;
  /** Decides whether a stored video may be shown now (ingest/catalog.isPlayable). */
  playable: (video: StoredVideo) => boolean;
  now: string;
}

export interface BuildReport {
  pool: FeedPool;
  untagged: number;
  rejected: number;
  unplayable: number;
  /** Educational, but too long for a feed. */
  long: number;
  moved: { id: string; from: string; to: string }[];
  dropped: { id: string; place: string }[];
}

/** A title as the card shows it: no hashtags, no emoji, no channel name tacked on the end. */
export function displayTitle(title: string, channel: string): string {
  const escaped = channel.replace(/^the\s+/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleaned = title
    .replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, '')
    .replace(/(^|[\s|])#[\p{L}_][\p{L}\p{N}_]*/gu, ' ')
    .replace(new RegExp(`\\s*[|\\-–—:]\\s*(the\\s+)?${escaped}\\s*$`, 'i'), '')
    .replace(/\s*[|\-–—]\s*(shorts?)?\s*$/i, '')
    .replace(/\s*[|\-–—]\s*(?=[|\-–—])/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[|\-–—:]\s*|\s*[|\-–—:]$/g, '');
  return cleaned || title.trim();
}

/** Longer than a feed should hold: over 40 minutes when the Data API gave a duration, and, without
 * one, titles that announce a full-length documentary, episode, compilation or stream. */
export const MAX_FEED_SECONDS = 40 * 60;
const LONG_TITLE = /\bfull[- ](?:length[- ])?(?:documentary|episode|movie|film|lecture|course)\b|\bcompilation\b|\blive ?stream\b|\b(?:[2-9]|\d{2,}|two|three|four|five|six|seven|eight|nine|ten)\+?\s*hours?\s+of\b|\bhour[- ]long\b/i;
export const isTooLong = (video: Pick<StoredVideo, 'durationSec' | 'title' | 'short'>) => !video.short && (video.durationSec !== null ? video.durationSec > MAX_FEED_SECONDS : LONG_TITLE.test(video.title));

const SHORT_ASPECT = 9 / 16;
const WIDE_ASPECT = 16 / 9;

export function buildPool(input: BuildInput): BuildReport {
  const channelNames = new Map(input.channels.map(c => [c.id, c.name]));
  const report: BuildReport = { pool: { version: 1, builtAt: input.now, channels: {}, videos: [] }, untagged: 0, rejected: 0, unplayable: 0, long: 0, moved: [], dropped: [] };
  for (const video of input.videos) {
    if (!channelNames.has(video.channelId) || !input.playable(video)) { report.unplayable++; continue; }
    const tag = input.tags[video.id];
    const override = input.overrides[video.id];
    if (!tag && !override?.places) { report.untagged++; continue; }
    const educational = override?.educational ?? tag?.educational ?? false;
    if (!educational) { report.rejected++; continue; }
    if (isTooLong(video)) { report.long++; continue; }
    const check = checkPlaces(override?.places ?? tag?.places ?? [], input.lookup);
    for (const move of check.moved) report.moved.push({ id: video.id, ...move });
    for (const place of check.dropped) report.dropped.push({ id: video.id, place });
    const learn = (override?.learn ?? tag?.learn ?? '').trim();
    if (!check.places.length || !learn) { report.rejected++; continue; }
    report.pool.channels[video.channelId] = { name: channelNames.get(video.channelId)! };
    report.pool.videos.push({
      id: video.id,
      channel: video.channelId,
      title: displayTitle(video.title, channelNames.get(video.channelId)!),
      learn,
      places: check.places,
      short: video.short,
      aspect: video.aspect ?? (video.short ? SHORT_ASPECT : WIDE_ASPECT),
      duration: video.durationSec,
      published: video.publishedAt?.slice(0, 10) ?? null,
      views: video.views,
    });
  }
  return report;
}

/** The YouTube links on published places as Watch videos: /auto/videos.json, written by scripts/auto/videos.mjs. */
export interface LinkVideos { channels: FeedPool['channels']; videos: FeedVideo[] }
export const NO_LINK_VIDEOS: LinkVideos = { channels: {}, videos: [] };

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/** Validates videos.json: anything else reads as no videos. Malformed entries are dropped. */
export function parseLinkVideos(value: unknown): LinkVideos {
  if (!value || typeof value !== 'object' || (value as { schema?: unknown }).schema !== 'mok.videos/1') return NO_LINK_VIDEOS;
  const { channels, videos } = value as { channels?: unknown; videos?: unknown };
  const names: FeedPool['channels'] = {};
  if (channels && typeof channels === 'object') for (const [id, channel] of Object.entries(channels)) { const name = text((channel as { name?: unknown } | null)?.name); if (name) names[id] = { name }; }
  const clean: FeedVideo[] = [];
  for (const video of Array.isArray(videos) ? videos as Partial<Record<keyof FeedVideo, unknown>>[] : []) {
    const id = text(video?.id), title = text(video?.title), channel = text(video?.channel);
    const places = Array.isArray(video?.places) ? video.places.filter((place): place is string => typeof place === 'string' && !!place).slice(0, 3) : [];
    if (!/^[\w-]{11}$/.test(id) || !title || !names[channel] || !places.length) continue;
    clean.push({ id, channel, title, learn: text(video.learn), places, short: video.short === true, aspect: positive(video.aspect) ?? (video.short === true ? SHORT_ASPECT : WIDE_ASPECT), duration: positive(video.duration), published: text(video.published) || null });
  }
  return { channels: names, videos: clean };
}

/** The pool with the link videos it lacks: the curated entry wins for a video in both, one too long
 * for a feed stays a link, and a channel the pool already has (by name) is that channel. The pool
 * itself when nothing is added. */
export function mergeLinkVideos(pool: FeedPool, extra: LinkVideos): FeedPool {
  const have = new Set(pool.videos.map(video => video.id));
  const byName = new Map(Object.entries(pool.channels).map(([id, channel]) => [channel.name.toLowerCase(), id]));
  const channels = { ...pool.channels };
  const added: FeedVideo[] = [];
  for (const video of extra.videos) {
    const name = extra.channels[video.channel]?.name;
    if (!name || have.has(video.id) || isTooLong({ durationSec: video.duration, title: video.title, short: video.short })) continue;
    have.add(video.id);
    const channel = byName.get(name.toLowerCase()) ?? video.channel;
    channels[channel] ??= { name };
    added.push({ ...video, channel, title: displayTitle(video.title, name) });
  }
  return added.length ? { ...pool, channels, videos: [...pool.videos, ...added] } : pool;
}

/** videos.json, or no videos when it is missing or unreadable. */
const loadLinkVideos = (): Promise<LinkVideos> => fetch('/auto/videos.json')
  .then(response => response.ok && response.headers.get('content-type')?.includes('json') ? response.json() : null)
  .then(parseLinkVideos, () => NO_LINK_VIDEOS);

let pending: Promise<FeedPool> | null = null;
let loaded: FeedPool | null = null;
/** The pool, loaded once as its own chunk the first time something asks for it, with the link videos
 * from published places added (the pool alone when those cannot load). */
export function loadPool(): Promise<FeedPool> {
  return pending ??= Promise.all([import('./pool.json'), loadLinkVideos()])
    .then(([module, extra]) => (loaded = mergeLinkVideos(module.default as unknown as FeedPool, extra)), error => { pending = null; throw error; });
}
/** The pool if it has loaded already, else null. */
export const loadedPool = (): FeedPool | null => loaded;
