// FROZEN: Watch's recommender as it was before version 2 (commit 05f27cd), kept only as the baseline
// scripts/feed/eval.mjs measures version 2 against. Not part of the app; never edit it.

// The feed's order, decided on this device from the learner's own map. Pure: the same inputs and
// seed give the same feed, so every rule here is tested.
//
// Cadence: every 8th card is a checkpoint; every other card is a video (YouTube only: MoK's own
// reels have the Reels tab). Each video card draws from a lane in a fixed rotation:
//   near       the place in view, places underway or recently visited, pinned things
//   neighbour  other fields of the same territories
//   explore    the territory the learner has visited least (interleaving)
// and never repeats the previous card's channel, and avoids the previous card's territory when it
// can. Watched, hidden, broken and twice-passed videos stay out unless asked for by name.

import { fieldOf, isWithin, placeDistance, territoryOf } from '../../../src/feed/places';
import type { FeedMemory } from './v1-memory';
import type { FeedVideo } from '../../../src/feed/pool';

export const CHECKPOINT_EVERY = 8;
/** Near half the time, neighbours and exploring a quarter each, interleaved. */
export const LANES = ['near', 'near', 'neighbour', 'explore', 'near', 'neighbour', 'near', 'explore'] as const;
export type Lane = (typeof LANES)[number];
export const TERRITORIES = ['science', 'technology', 'humanities', 'society', 'mathematics', 'arts', 'earth', 'economics'].map(key => `knowledge.${key}`);

/** Card `index` (0-based) is a checkpoint. */
export const isCheckpointSlot = (index: number) => (index + 1) % CHECKPOINT_EVERY === 0;
export const laneFor = (videoIndex: number): Lane => LANES[videoIndex % LANES.length];

export type FeedItem =
  | { kind: 'video'; key: string; video: FeedVideo; lane: Lane | 'asked' | 'like' }
  | { kind: 'checkpoint'; key: string }
  | { kind: 'end'; key: string };

export interface FeedSignals {
  /** The atlas place in view, unless that is the whole atlas. */
  focus: string | null;
  /** Places with recent progress or visits, newest first. */
  recent: readonly string[];
  /** Places of pinned reels and videos. */
  pinned: readonly string[];
}

export interface PlanContext {
  pool: readonly FeedVideo[];
  signals: FeedSignals;
  memory: FeedMemory;
  seed: string;
}

export interface PlanState {
  items: FeedItem[];
  /** "More like this": the next few video picks lean hard toward these places. */
  boost: { places: readonly string[]; left: number } | null;
}

export const createPlan = (): PlanState => ({ items: [], boost: null });

/** A stable 0–1 number per seed and key: variety without randomness in tests. */
export function jitter(seed: string, key: string): number {
  let h = 2166136261;
  for (const ch of `${seed}|${key}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

interface Anchor { place: string; weight: number }

/** Where the learner's attention is, weighted: boost > focus > recent > pinned > watched places. */
export function anchorsFor(signals: FeedSignals, memory: FeedMemory, boost: PlanState['boost']): Anchor[] {
  const out: Anchor[] = [];
  const add = (place: string | null | undefined, weight: number) => {
    if (!place || place === 'knowledge') return;
    const existing = out.find(anchor => anchor.place === place);
    if (existing) existing.weight = Math.max(existing.weight, weight);
    else out.push({ place, weight });
  };
  if (boost) for (const place of boost.places) add(place, 1.4);
  add(signals.focus, 1);
  signals.recent.slice(0, 8).forEach((place, i) => add(place, 0.85 * 0.9 ** i));
  for (const place of signals.pinned.slice(0, 12)) add(place, 0.75);
  const seen = Object.entries(memory.seen).sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [place] of seen) add(place, 0.5);
  return out;
}

/** How near a place is to the anchors: same field, closer on the tree, heavier anchor. */
export function nearness(place: string, anchors: readonly Anchor[]): number {
  let best = 0;
  for (const anchor of anchors) {
    const sameBranch = anchor.place.split('.').length <= 2 ? territoryOf(place) === anchor.place : fieldOf(place) === fieldOf(anchor.place);
    if (!sameBranch) continue;
    best = Math.max(best, anchor.weight / (1 + 0.4 * placeDistance(place, anchor.place)));
  }
  return best;
}

/** Same territory as an anchor, different field. */
export function neighbourliness(place: string, anchors: readonly Anchor[]): number {
  let best = 0;
  for (const anchor of anchors) {
    if (territoryOf(place) !== territoryOf(anchor.place) || anchor.place.split('.').length <= 2 || fieldOf(place) === fieldOf(anchor.place)) continue;
    best = Math.max(best, anchor.weight * 0.8);
  }
  return best;
}

/** How much the learner has been to each territory: anchors, places explored by watching, and this session's cards. */
export function territoryVisits(anchors: readonly Anchor[], memory: FeedMemory, items: readonly FeedItem[]): Map<string, number> {
  const visits = new Map(TERRITORIES.map(t => [t, 0]));
  const add = (place: string, n: number) => { const t = territoryOf(place); if (visits.has(t)) visits.set(t, visits.get(t)! + n); };
  for (const anchor of anchors) add(anchor.place, anchor.weight * 2);
  for (const [place, n] of Object.entries(memory.seen)) add(place, n);
  for (const item of items) add(itemPlace(item) ?? 'knowledge', 1);
  return visits;
}

export const itemPlace = (item: FeedItem): string | null => item.kind === 'video' ? item.video.places[0] : null;
const itemChannel = (item: FeedItem | undefined): string | null => item?.kind === 'video' ? item.video.channel : null;

/** The quality of a video on its own: preferences, format and freshness, and a sink for passing over. */
export function quality(video: FeedVideo, memory: FeedMemory, now: number): number {
  const placePref = Math.max(...video.places.map(place => (memory.prefs.places[place] ?? 0) + 0.5 * (memory.prefs.places[fieldOf(place)] ?? 0)));
  const pref = Math.exp(0.3 * Math.max(-6, Math.min(6, (memory.prefs.channels[video.channel] ?? 0) + placePref)));
  const format = video.short ? 1.3 : video.duration === null ? 0.85 : video.duration <= 480 ? 1.1 : video.duration <= 1200 ? 0.9 : 0.6;
  const fresh = video.published && now - Date.parse(video.published) < 21 * 86_400_000 ? 1.15 : 1;
  const passed = 0.5 ** (memory.passed[video.id] ?? 0);
  return pref * format * fresh * passed;
}

const isAvailable = (video: FeedVideo, memory: FeedMemory, served: ReadonlySet<string>) =>
  !served.has(video.id) && !memory.watched[video.id] && !memory.hidden.includes(video.id) && !memory.broken.includes(video.id) && (memory.passed[video.id] ?? 0) < 2;

function servedIds(items: readonly FeedItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) if (item.kind === 'video') ids.add(item.video.id);
  return ids;
}

export interface Pick { video: FeedVideo; lane: Lane | 'like' }

/** Choose the next video for `lane` (and say which lane it really came from), or null when
 * nothing is left at all. */
export function pickVideo(ctx: PlanContext, state: PlanState, lane: Lane, now = Date.now()): Pick | null {
  const served = servedIds(state.items);
  const available = ctx.pool.filter(video => isAvailable(video, ctx.memory, served));
  if (!available.length) return null;
  const anchors = anchorsFor(ctx.signals, ctx.memory, state.boost);
  const content = state.items.filter(item => item.kind === 'video');
  const previous = content.at(-1);
  const recentTerritories = content.slice(-2).map(item => territoryOf(itemPlace(item) ?? ''));
  const notSameChannel = available.filter(video => video.channel !== itemChannel(previous));
  const pool = notSameChannel.length ? notSameChannel : available;

  const relevance = (video: FeedVideo, which: Lane): number => {
    const places = video.places.map((place, i) => ({ place, w: i === 0 ? 1 : 0.8 }));
    if (which === 'near') return Math.max(...places.map(({ place, w }) => w * nearness(place, anchors)));
    if (which === 'neighbour') return Math.max(...places.map(({ place, w }) => w * neighbourliness(place, anchors)));
    return 0;
  };
  const score = (video: FeedVideo, base: number) => base * quality(video, ctx.memory, now) * (0.8 + 0.4 * jitter(ctx.seed, video.id));
  const best = (list: readonly FeedVideo[], base: (video: FeedVideo) => number) => {
    let top: FeedVideo | null = null, topScore = 0;
    for (const video of list) { const s = score(video, base(video)); if (s > topScore) { top = video; topScore = s; } }
    return top;
  };
  // Interleave territories: avoid the last card's territory, and never three in a row.
  const varied = (list: readonly FeedVideo[]) => {
    const fresh = list.filter(video => territoryOf(video.places[0]) !== recentTerritories.at(-1));
    return fresh.length ? fresh : list.filter(video => !(recentTerritories.length === 2 && recentTerritories.every(t => t === territoryOf(video.places[0]))));
  };

  const boosted = !!state.boost && state.boost.left > 0;
  if (boosted) {
    // "More like this" may stay in its territory for a card or two.
    const pick = best(pool.filter(video => relevance(video, 'near') > 0), video => relevance(video, 'near'));
    if (pick) return { video: pick, lane: 'like' };
  }
  if (lane === 'near' || lane === 'neighbour') {
    const pick = best(varied(pool.filter(video => relevance(video, lane) > 0)), video => relevance(video, lane));
    if (pick) return { video: pick, lane };
  }
  // Explore: the least-visited territory that is not the last card's, then anything left.
  const visits = territoryVisits(anchors, ctx.memory, state.items);
  const order = [...visits.entries()].sort((a, b) => a[1] - b[1] || jitter(ctx.seed, `${a[0]}|${state.items.length}`) - jitter(ctx.seed, `${b[0]}|${state.items.length}`)).map(([t]) => t);
  for (const territory of order) {
    if (territory === recentTerritories.at(-1)) continue;
    const pick = best(pool.filter(video => territoryOf(video.places[0]) === territory), () => 1);
    if (pick) return { video: pick, lane: 'explore' };
  }
  const pick = best(varied(pool), () => 1) ?? best(pool, () => 1);
  return pick && { video: pick, lane: 'explore' };
}

/** Extend the plan by `count` cards. Stops with an end card once no video is left. */
export function extendPlan(ctx: PlanContext, state: PlanState, count: number, now = Date.now()): PlanState {
  let current: PlanState = { items: [...state.items], boost: state.boost && { ...state.boost } };
  for (let n = 0; n < count; n++) {
    if (current.items.at(-1)?.kind === 'end') break;
    const index = current.items.length;
    if (isCheckpointSlot(index)) { current.items.push({ kind: 'checkpoint', key: `checkpoint-${index}` }); continue; }
    const boosted = !!current.boost && current.boost.left > 0;
    const videoIndex = current.items.filter(item => item.kind === 'video').length;
    const pick = pickVideo(ctx, current, laneFor(videoIndex), now);
    if (!pick) { current.items.push({ kind: 'end', key: 'end' }); break; }
    current.items.push({ kind: 'video', key: `video-${pick.video.id}`, video: pick.video, lane: pick.lane });
    if (boosted) current = { ...current, boost: current.boost!.left > 1 ? { ...current.boost!, left: current.boost!.left - 1 } : null };
  }
  return current;
}

/** Keep the cards up to and including `keep` (already seen or on screen) and plan the rest again,
 * after the learner said something about the feed. */
export function replanAfter(state: PlanState, keep: number, boost: PlanState['boost'] = state.boost): PlanState {
  return { items: state.items.slice(0, keep + 1), boost };
}

/** Start a session with a video asked for by name (a hub's Watch row, the Library): it plays even
 * if it was watched before. */
export function planStartingWith(video: FeedVideo): PlanState {
  return { items: [{ kind: 'video', key: `video-${video.id}`, video, lane: 'asked' }], boost: { places: video.places, left: 2 } };
}

/** Is `place` inside or around any of `scopes`? Used by the hub's Watch row and the checkpoint. */
export const touches = (place: string, scopes: readonly string[]) => scopes.some(scope => isWithin(place, scope) || isWithin(scope, place));
