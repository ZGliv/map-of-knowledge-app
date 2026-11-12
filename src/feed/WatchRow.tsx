import { useMemo, type CSSProperties } from 'react';
import { territoryColor } from '../core/territoryTheme';
import { loadFeedMemory } from './memory';
import { isWithin } from './places';
import type { FeedPool, FeedVideo } from './pool';
import { usePool } from './usePool';
import { posterUrls } from './youtube';
import './feed.css';

// A place's hub: the videos the learner saved here first, then the videos pinned to it or anywhere
// inside it. Each opens the Watch feed at that video, playing, even one already watched (a rewatch on
// purpose).

const MAX = 14;

/** The videos for a place, best first: the ones saved here (newest save first), then the rest. All of
 * them strictly pinned here: a video is pinned to its primary tag (places[0]) only, so it shows on that
 * place and the places above it, never on a place it is only a secondary tag of (saved there or not),
 * and a place with none shows none (no borrowing from its parent). Pinned right here before deeper
 * places, unwatched before watched, Shorts before long ones, newest first, and one card per title from a channel. */
export function videosFor(nodeId: string, videos: readonly FeedVideo[], watched: Readonly<Record<string, string>>, saved: readonly string[] = []): FeedVideo[] {
  const byId = new Map(videos.map(video => [video.id, video]));
  const kept = saved.flatMap(id => { const video = byId.get(id); return video?.places[0] && isWithin(video.places[0], nodeId) ? [video] : []; });
  const keptIds = new Set(kept.map(video => video.id));
  const scored = videos.flatMap(video => {
    const primary = video.places[0];
    if (keptIds.has(video.id) || !primary || !isWithin(primary, nodeId)) return [];
    return [{ video, key: [primary === nodeId ? 0 : 1, watched[video.id] ? 1 : 0, video.short ? 0 : 1] }];
  });
  scored.sort((a, b) => a.key.reduce((d, n, i) => d || n - b.key[i], 0) || (b.video.published ?? '').localeCompare(a.video.published ?? ''));
  // A channel's Short and long cut of one title read as the same card twice: keep the better-ranked.
  const same = (video: FeedVideo) => `${video.channel}|${video.title.trim().toLowerCase()}`;
  const shown = new Set(kept.map(same));
  return [...kept, ...scored.map(item => item.video).filter(video => !shown.has(same(video)) && !!shown.add(same(video)))];
}

/** The place itself when videos are tagged in it, else its nearest field or territory that has some.
 * Only the library-b lab borrows a parent's videos like this; hubs and the shelf use videosFor alone. */
export function watchScope(nodeId: string, videos: readonly FeedVideo[]): string | null {
  for (let parts = nodeId.split('.'); parts.length > 1; parts.pop()) {
    const scope = parts.join('.');
    if (videos.some(video => video.places.some(place => isWithin(place, scope)))) return scope;
  }
  return null;
}

function SavedMark() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" fill="currentColor" /></svg>;
}

function DoneMark() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export interface WatchCardsProps {
  nodeId: string;
  videos: readonly FeedVideo[];
  channels: FeedPool['channels'];
  watched: Readonly<Record<string, string>>;
  saved?: ReadonlySet<string>;
  /** Videos finished (the shelf's video:<id> items): marked done on their card. */
  done?: ReadonlySet<string>;
  onOpen: (videoId: string) => void;
}

/** The row of video cards: portrait for Shorts, wide for the rest. */
export function WatchCards({ nodeId, videos, channels, watched, saved = NONE, done = NONE, onOpen }: WatchCardsProps) {
  return <ul className="watch-cards" data-watch-row={nodeId}>
    {videos.map(video => {
      const isSaved = saved.has(video.id);
      const isDone = done.has(video.id);
      return <li key={video.id} style={{ '--place-color': territoryColor(video.places[0]) } as CSSProperties}>
        <button type="button" className={`watch-card${video.short ? ' is-tall' : ' is-wide'}${watched[video.id] && !isSaved && !isDone ? ' is-watched' : ''}${isDone ? ' is-done' : ''}`} onClick={() => onOpen(video.id)} data-action="hub-watch" data-video-id={video.id} data-saved={isSaved || undefined} data-done={isDone || undefined} aria-label={`Watch ${video.title}, ${channels[video.channel]?.name ?? ''}${isSaved ? ', saved' : ''}${isDone ? ', done' : ''}`}>
          <span className="watch-card-media" aria-hidden="true"><img src={posterUrls(video, 'card')[0]} alt="" loading="lazy" decoding="async" />{isDone ? <span className="watch-card-saved watch-card-done"><DoneMark /></span> : isSaved && <span className="watch-card-saved"><SavedMark /></span>}</span>
          <span className="watch-card-title">{video.title}</span>
          <span className="watch-card-channel">{channels[video.channel]?.name}</span>
        </button>
      </li>;
    })}
  </ul>;
}
const NONE: ReadonlySet<string> = new Set();

/** A place's videos, best first (see videosFor), at most MAX, once the pool has loaded. */
export function usePlaceVideos(nodeId: string, saved: readonly string[], enabled = true): { pool: FeedPool | null; videos: FeedVideo[]; total: number; watched: Readonly<Record<string, string>> } {
  const pool = usePool(enabled);
  const watched = useMemo(() => loadFeedMemory().watched, [nodeId]);
  const all = useMemo(() => pool && enabled ? videosFor(nodeId, pool.videos, watched, saved) : [], [pool, enabled, nodeId, watched, saved]);
  return { pool, videos: all.slice(0, MAX), total: all.length, watched };
}

/** `saved`: videos the learner saved under this place or inside it, newest first (any not in the pool are skipped). */
export function WatchRow({ nodeId, saved = [], onOpen }: { nodeId: string; saved?: readonly string[]; onOpen: (videoId: string) => void }) {
  const { pool, videos, total, watched } = usePlaceVideos(nodeId, saved);
  const savedSet = useMemo(() => new Set(saved), [saved]);
  if (!pool || !videos.length) return null;
  return <section className="hub-section hub-section--wide" aria-labelledby="hub-watch" data-hub-section="watch">
    <header className="hub-section-head"><h2 id="hub-watch">Watch</h2><span>{String(total).padStart(2, '0')}</span></header>
    <WatchCards nodeId={nodeId} videos={videos} channels={pool.channels} watched={watched} saved={savedSet} onOpen={onOpen} />
  </section>;
}
