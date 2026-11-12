// What the feed remembers on this device (localStorage, mok-feed-v2): the interest model learned from
// what the learner does with each video (interest.ts, engagement.ts), the videos already judged (so
// nothing comes round again unless asked for by name), videos watched through, videos that would not
// play here, and places explored by watching. Version 1 (mok-feed-v1: "more like this" / "not for me"
// preferences, passes and watches) is read once and folded into the model when the pool is loaded;
// its record is left as it was. (Sound is Explore's own preference: explore/sound.ts.)
//
// None of it is evidence: watching never colors land. Only proof does.

import { isThrough, judge, LEARNING, type Impression } from './engagement';
import { createInterest, idle, observe, observeKey, observePlace, packInterest, unpackInterest, type InterestModel } from './interest';
import type { FeedVideo } from './pool';

export const FEED_MEMORY_KEY = 'mok-feed-v2';
export const LEGACY_FEED_MEMORY_KEY = 'mok-feed-v1';
const LIMIT = 6_000;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Version 1, as it was stored. */
export interface LegacyFeedMemory {
  readonly watched: Readonly<Record<string, string>>;
  readonly passed: Readonly<Record<string, number>>;
  readonly hidden: readonly string[];
  readonly broken: readonly string[];
  readonly prefs: { readonly channels: Readonly<Record<string, number>>; readonly places: Readonly<Record<string, number>> };
}

export interface FeedMemory {
  readonly version: 2;
  readonly model: InterestModel;
  /** When the model last learned something: time away since is forgetting. */
  readonly at: string | null;
  /** Video ID → when it was watched through. */
  readonly watched: Readonly<Record<string, string>>;
  /** On screen long enough to be judged (more than a glance): never planned again, only asked for by name. Oldest first. */
  readonly seen: readonly string[];
  /** Hidden with version 1's "Not for me": never planned again. */
  readonly hidden: readonly string[];
  /** Videos the player could not play here. */
  readonly broken: readonly string[];
  /** Atlas place → videos watched through there. For recommendations only. */
  readonly explored: Readonly<Record<string, number>>;
  /** Learning actions (expeditions, cases, checks) up to this time are in the model already. */
  readonly learnedThrough: string | null;
  /** Version 1's record, until the pool is here to fold it into the model. */
  readonly legacy?: LegacyFeedMemory;
}

export const createFeedMemory = (): FeedMemory => ({ version: 2, model: createInterest(), at: null, watched: {}, seen: [], hidden: [], broken: [], explored: {}, learnedThrough: null });

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isTime = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
const numbers = (value: unknown, min: number, max: number): Record<string, number> => {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, n] of Object.entries(value).slice(0, LIMIT)) if (typeof n === 'number' && Number.isFinite(n)) out[key] = Math.max(min, Math.min(max, n));
  return out;
};
const strings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length <= 64))].slice(-LIMIT) : [];
const times = (value: unknown) => {
  const out: Record<string, string> = {};
  if (isRecord(value)) for (const [id, at] of Object.entries(value).slice(-LIMIT)) if (isTime(at)) out[id] = at;
  return out;
};

/** Reads a version 1 record, or null. */
export function parseLegacyFeedMemory(raw: string | null): LegacyFeedMemory | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value) || value.version !== 1) return null;
  const prefs = isRecord(value.prefs) ? value.prefs : {};
  return { watched: times(value.watched), passed: numbers(value.passed, 0, 99), hidden: strings(value.hidden), broken: strings(value.broken), prefs: { channels: numbers(prefs.channels, -6, 6), places: numbers(prefs.places, -6, 6) } };
}

/** Reads a saved record, dropping anything malformed rather than failing the page. */
export function parseFeedMemory(raw: string | null): FeedMemory {
  if (!raw) return createFeedMemory();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return createFeedMemory(); }
  if (!isRecord(value) || value.version !== 2) return createFeedMemory();
  const legacy = isRecord(value.legacy) ? parseLegacyFeedMemory(JSON.stringify({ ...value.legacy, version: 1 })) : null;
  return {
    version: 2,
    model: unpackInterest(value.model),
    at: isTime(value.at) ? value.at : null,
    watched: times(value.watched),
    seen: strings(value.seen),
    hidden: strings(value.hidden),
    broken: strings(value.broken),
    explored: numbers(value.explored, 0, 9_999),
    learnedThrough: isTime(value.learnedThrough) ? value.learnedThrough : null,
    ...(legacy ? { legacy } : {}),
  };
}

/** Version 1 as a fresh version 2 record waiting to be folded in: what it hid, watched and could not
 * play counts at once; its preferences and passes join the model when the pool is here. */
export function fromLegacy(legacy: LegacyFeedMemory): FeedMemory {
  return { ...createFeedMemory(), watched: legacy.watched, hidden: legacy.hidden, broken: legacy.broken, seen: Object.keys(legacy.watched).slice(-LIMIT), legacy };
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
/** Version 2 when there is one; else version 1 waiting to be folded in; else a fresh record. Never writes. */
export function loadFeedMemory(target?: StorageLike): FeedMemory {
  try {
    const store = storage(target);
    const raw = store?.getItem(FEED_MEMORY_KEY) ?? null;
    if (raw) return parseFeedMemory(raw);
    const legacy = parseLegacyFeedMemory(store?.getItem(LEGACY_FEED_MEMORY_KEY) ?? null);
    return legacy ? fromLegacy(legacy) : createFeedMemory();
  } catch { return createFeedMemory(); }
}
/** Returns true once the browser has kept it. A failure only costs this session's learning. */
export function saveFeedMemory(memory: FeedMemory, target?: StorageLike): boolean {
  try { storage(target)?.setItem(FEED_MEMORY_KEY, JSON.stringify({ ...memory, model: packInterest(memory.model) })); return true; } catch { return false; }
}

/** Fold version 1 into the model: each watch a yes, each pass a soft no, "Not for me" a strong no,
 * "More like this" a yes about its places and channel. Videos no longer in the pool are skipped. */
export function migrateLegacy(memory: FeedMemory, videos: ReadonlyMap<string, FeedVideo>): FeedMemory {
  const legacy = memory.legacy;
  if (!legacy) return memory;
  let model = memory.model;
  const watched = Object.entries(legacy.watched).sort((a, b) => a[1].localeCompare(b[1]));
  for (const [id] of watched) { const video = videos.get(id); if (video) model = observe(model, video, 1, 1); }
  for (const [id, n] of Object.entries(legacy.passed)) { const video = videos.get(id); if (video && !legacy.watched[id]) model = observe(model, video, 0.2, 0.5 * Math.min(n, 3)); }
  for (const id of legacy.hidden) { const video = videos.get(id); if (video) model = observe(model, video, 0, 1.6); }
  for (const [place, n] of Object.entries(legacy.prefs.places)) if (n) model = observePlace(model, place, n > 0 ? 1 : 0, 0.6 * Math.abs(n));
  for (const [channel, n] of Object.entries(legacy.prefs.channels)) if (n) model = observeKey(model, `c:${channel}`, n > 0 ? 1 : 0, 0.8 * Math.abs(n));
  const explored: Record<string, number> = { ...memory.explored };
  for (const [id] of watched) { const place = videos.get(id)?.places[0]; if (place) explored[place] = Math.min(9_999, (explored[place] ?? 0) + 1); }
  const seen = [...new Set([...memory.seen, ...Object.keys(legacy.passed).filter(id => legacy.passed[id] >= 2)])].slice(-LIMIT);
  const { legacy: _, ...rest } = memory;
  // All of it is old news: none of it belongs in the model's short memory.
  return { ...rest, model: { ...model, recent: {}, streak: 0 }, explored, seen, at: watched.at(-1)?.[1] ?? memory.at };
}

/** A new session: the time away since the model last learned is forgetting. */
export function startSession(memory: FeedMemory, now = Date.now()): FeedMemory {
  if (!memory.at) return memory;
  const days = (now - Date.parse(memory.at)) / 86_400_000;
  return days >= 0.5 ? { ...memory, model: idle(memory.model, Math.min(days, 120)) } : memory;
}

/** What one impression teaches: the model learns from it, and a judged video leaves the feed. */
export function recordImpression(memory: FeedMemory, video: FeedVideo, impression: Impression, at = new Date().toISOString()): FeedMemory {
  const verdict = judge(impression);
  if (verdict.kind === 'glance') return memory;
  const model = observe(memory.model, video, verdict.r, verdict.w);
  const seen = memory.seen.includes(video.id) ? memory.seen : [...memory.seen, video.id].slice(-LIMIT);
  let { watched, explored } = memory;
  if (isThrough(impression) && !watched[video.id]) {
    watched = { ...watched, [video.id]: at };
    const place = video.places[0];
    explored = { ...explored, [place]: Math.min(9_999, (explored[place] ?? 0) + 1) };
  }
  return { ...memory, model, seen, watched, explored, at };
}

export interface LearningEvent { place: string; at: string; kind: keyof typeof LEARNING }
/** Learning actions since the last look (an expedition or case started or proved, a check passed):
 * evidence about their places. Each is folded in once. */
export function applyLearning(memory: FeedMemory, events: readonly LearningEvent[]): FeedMemory {
  const fresh = events.filter(event => !memory.learnedThrough || event.at > memory.learnedThrough).sort((a, b) => a.at.localeCompare(b.at));
  if (!fresh.length) return memory;
  let model = memory.model;
  for (const event of fresh) model = observePlace(model, event.place, LEARNING[event.kind].r, LEARNING[event.kind].w);
  return { ...memory, model, learnedThrough: fresh.at(-1)!.at };
}

export const markBroken = (memory: FeedMemory, videoId: string): FeedMemory => memory.broken.includes(videoId) ? memory : { ...memory, broken: [...memory.broken, videoId].slice(-LIMIT) };
