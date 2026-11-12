// FROZEN: Watch's recommender as it was before version 2 (commit 05f27cd), kept only as the baseline
// scripts/feed/eval.mjs measures version 2 against. Not part of the app; never edit it.

// What the feed remembers on this device (localStorage, mok-feed-v1): videos watched, shown and
// passed over, hidden or broken; the quiet "more like this" / "not for me" preferences; and places
// explored by watching. (Sound is Explore's own preference: explore/sound.ts.) None of it is
// evidence: watching never colors land.
// Only proof does. Places seen here shape recommendations, nothing else.

import { fieldOf } from '../../../src/feed/places';
import type { FeedVideo } from '../../../src/feed/pool';

export const FEED_MEMORY_KEY = 'mok-feed-v1';
const LIMIT = 4_000;
const PREF_LIMIT = 6;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface FeedPrefs {
  /** By channel ID: up for "more like this", down for "not for me". */
  readonly channels: Readonly<Record<string, number>>;
  /** By atlas place (and, at half strength, its field). */
  readonly places: Readonly<Record<string, number>>;
}

export interface FeedMemory {
  readonly version: 1;
  /** Video ID → when it was watched (played most of the way, or to its end). */
  readonly watched: Readonly<Record<string, string>>;
  /** Video ID → times it was on screen for a moment and passed over. */
  readonly passed: Readonly<Record<string, number>>;
  /** "Not for me". */
  readonly hidden: readonly string[];
  /** Videos the player could not play here. */
  readonly broken: readonly string[];
  readonly prefs: FeedPrefs;
  /** Atlas place → how many videos there were watched. For recommendations only. */
  readonly seen: Readonly<Record<string, number>>;
}

export const createFeedMemory = (): FeedMemory => ({ version: 1, watched: {}, passed: {}, hidden: [], broken: [], prefs: { channels: {}, places: {} }, seen: {} });

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const numbers = (value: unknown, min: number, max: number): Record<string, number> => {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, n] of Object.entries(value).slice(0, LIMIT)) if (typeof n === 'number' && Number.isFinite(n)) out[key] = Math.max(min, Math.min(max, n));
  return out;
};
const strings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))].slice(-LIMIT) : [];

/** Reads a saved record, dropping anything malformed rather than failing the page. */
export function parseFeedMemory(raw: string | null): FeedMemory {
  if (!raw) return createFeedMemory();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return createFeedMemory(); }
  if (!isRecord(value) || value.version !== 1) return createFeedMemory();
  const watched: Record<string, string> = {};
  if (isRecord(value.watched)) for (const [id, at] of Object.entries(value.watched).slice(-LIMIT)) if (typeof at === 'string' && !Number.isNaN(Date.parse(at))) watched[id] = at;
  const prefs = isRecord(value.prefs) ? value.prefs : {};
  return {
    version: 1,
    watched,
    passed: numbers(value.passed, 0, 99),
    hidden: strings(value.hidden),
    broken: strings(value.broken),
    prefs: { channels: numbers(prefs.channels, -PREF_LIMIT, PREF_LIMIT), places: numbers(prefs.places, -PREF_LIMIT, PREF_LIMIT) },
    seen: numbers(value.seen, 0, 9_999),
  };
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
export function loadFeedMemory(target?: StorageLike): FeedMemory {
  try { return parseFeedMemory(storage(target)?.getItem(FEED_MEMORY_KEY) ?? null); } catch { return createFeedMemory(); }
}
/** Returns true once the browser has kept it. A failure only costs this session's memory. */
export function saveFeedMemory(memory: FeedMemory, target?: StorageLike): boolean {
  try { storage(target)?.setItem(FEED_MEMORY_KEY, JSON.stringify(memory)); return true; } catch { return false; }
}

const bump = (record: Readonly<Record<string, number>>, key: string, by: number) => ({ ...record, [key]: Math.max(-PREF_LIMIT, Math.min(PREF_LIMIT, (record[key] ?? 0) + by)) });

/** Watched most of the way: it leaves the feed, and its places count as explored by watching. */
export function markWatched(memory: FeedMemory, video: FeedVideo, at = new Date().toISOString()): FeedMemory {
  if (memory.watched[video.id]) return memory;
  let seen = memory.seen;
  for (const place of video.places.slice(0, 1)) seen = { ...seen, [place]: Math.min(9_999, (seen[place] ?? 0) + 1) };
  return { ...memory, watched: { ...memory.watched, [video.id]: at }, seen };
}

/** On screen for a moment, then passed over: it sinks, and after two passes stays out. */
export function markPassed(memory: FeedMemory, videoId: string): FeedMemory {
  if (memory.watched[videoId]) return memory;
  return { ...memory, passed: { ...memory.passed, [videoId]: Math.min(99, (memory.passed[videoId] ?? 0) + 1) } };
}

/** "More like this": its channel and places rise. */
export function moreLikeThis(memory: FeedMemory, video: FeedVideo): FeedMemory {
  let places = memory.prefs.places;
  video.places.forEach((place, index) => {
    places = bump(places, place, index === 0 ? 1 : 0.5);
    if (fieldOf(place) !== place) places = bump(places, fieldOf(place), 0.5);
  });
  return { ...memory, prefs: { channels: bump(memory.prefs.channels, video.channel, 1), places } };
}

/** "Not for me": this video goes, and its channel and places sink. */
export function notForMe(memory: FeedMemory, video: FeedVideo): FeedMemory {
  let places = memory.prefs.places;
  video.places.forEach((place, index) => { places = bump(places, place, index === 0 ? -1 : -0.5); });
  return {
    ...memory,
    hidden: memory.hidden.includes(video.id) ? memory.hidden : [...memory.hidden, video.id].slice(-LIMIT),
    prefs: { channels: bump(memory.prefs.channels, video.channel, -1), places },
  };
}

export const markBroken = (memory: FeedMemory, videoId: string): FeedMemory => memory.broken.includes(videoId) ? memory : { ...memory, broken: [...memory.broken, videoId].slice(-LIMIT) };
