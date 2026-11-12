// The feed's order, decided on this device. Pure: the same pool, memory, map and seed give the same
// feed, so every rule here is tested (recommend.test.ts) and measured against personas over the real
// pool (scripts/feed/eval.mjs).
//
// Every 8th card is a checkpoint; the rest are videos, with place cards and MoK's own reels mixed in
// (cards.ts isCardSlot, isReelSlot), and cards and reels alone where no video is left. Each video is chosen by:
//   - the interest model (interest.ts): what this learner's watching, skipping, saving and learning
//     says, read hierarchically (place → field → territory → overall) with the channel and the words;
//   - the learner's map, as pseudo-evidence on top: the place in view, places underway or recently
//     visited, saved things and lit places, so a learner who has just started Evolution sees it from
//     the first card, before the feed has learned anything;
//   - Thompson sampling over those posteriors, so areas the model knows little about keep getting
//     tested, and every PLAN.exploreEvery-th video is drawn only from fields the learner has hardly met
//     and has not been shown lately; after PLAN.slump no's in a row with no field the model still
//     believes in (the learner has moved on, or the feed has it wrong), two cards in three explore
//     like that until one lands, while the model's short memory (interest.ts) stops an old favourite
//     they keep skipping from winning;
//   - freshness (new uploads) and the short-video format;
//   - variety: never the same channel twice in a row, never more than PLAN.maxRun in a row from one
//     territory, and a gentle push away from the last card's territory and field.
// A video judged once (more than a glance), watched, hidden or broken never comes round again
// unless asked for by name. With nothing learned yet (a first session) the feed opens on Shorts
// spread across territories and channels.

import { chain, counts, interestIn, keysOf, posterior, recentCounts, sampler, videoWords, wordsScore, type Posterior } from './interest';
import type { FeedMemory } from './memory';
import { fieldOf, isWithin, territoryOf } from './places';
import type { FeedVideo } from './pool';
import type { Reel } from '../explore/types';
import { isCardSlot, isReelSlot } from './cards';
import { rng } from './rng';

export const CHECKPOINT_EVERY = 8;
export const TERRITORIES = ['science', 'technology', 'humanities', 'society', 'mathematics', 'arts', 'earth', 'economics'].map(key => `knowledge.${key}`);

/** The planner's dials, in one place (scripts/feed/eval.mjs measures them against personas). */
export const PLAN = {
  /** Every fifth video tests a field the learner has hardly met. */
  exploreEvery: 5,
  /** Never more than three cards in a row from one territory. */
  maxRun: 3,
  /** How tightly the usual picks keep to what the model believes (an exploring pick draws freely, at 1). */
  sharpness: 12,
  /** How much more a video's interest counts than the gentle lifts and pushes (format, freshness, variety). */
  contrast: 4,
  /** Below this much evidence (decayed impressions), none of it a clear yes, the model knows nothing
   * yet: a first session. */
  cold: 3,
  /** A field with less evidence than this is barely met: what an exploring pick is drawn from. */
  uncharted: 1.5,
  /** A field with more recent evidence than this (in the model's short memory: a quick skip there in
   * about the last ten cards) was shown lately: an exploring pick looks elsewhere. */
  lately: 1.2,
  /** After this many no's in a row, two cards in three explore until one lands (the third is still
   * the model's best guess)... */
  slump: 4,
  /** ...unless some field still looks this good (a favourite to go back to, or the place in view). */
  sure: 0.5,
  /** Lifts: a Short (more in a first session or a slump's exploring picks), a new upload (more in its
   * first days), and how well a video lands with people at large (popularity: a little, more in a
   * first session or a slump's exploring picks). */
  short: 1.08, coldShort: 1.3, fresh: 1.06, newest: 1.12, popular: 0.1, coldPopular: 0.5,
  /** Pushes: a channel seen in the last four cards, the last card's territory, the last two cards' field,
   * and (in a first session) each card of the same territory in the last eight. */
  sameChannel: 0.75, sameTerritory: 0.85, sameField: 0.75, coldSpread: 0.6,
};
/** Uploaded within this long: new. */
const FRESH_MS = 21 * 86_400_000;

/** Card `index` (0-based) is a checkpoint. */
export const isCheckpointSlot = (index: number) => (index + 1) % CHECKPOINT_EVERY === 0;
/** Video `videoIndex` (0-based, videos only) is an exploring pick. The first never is. In a slump
 * (PLAN.slump no's in a row), two in three are. */
export const isExploreSlot = (videoIndex: number, slump = false) => videoIndex > 0 && ((videoIndex + 1) % PLAN.exploreEvery === 0 || (slump && videoIndex % 3 !== 0));

export type Lane = 'fit' | 'explore' | 'asked';
export type FeedItem =
  | { kind: 'video'; key: string; video: FeedVideo; lane: Lane }
  | { kind: 'card'; key: string; placeId: string }
  | { kind: 'reel'; key: string; reel: Reel }
  | { kind: 'checkpoint'; key: string }
  /** Everything in the scope already explored: said first, then the cards come round again. */
  | { kind: 'scope'; key: string }
  | { kind: 'end'; key: string };

export interface FeedSignals {
  /** The atlas place in view, unless that is the whole atlas. */
  focus: string | null;
  /** Places with recent progress, visits or work underway, newest first. */
  recent: readonly string[];
  /** Places of saved things: pinned reels, saved links and videos. */
  pinned: readonly string[];
  /** Lit places: proved by an expedition, a case or a check. */
  lit: readonly string[];
}

export interface PlanContext {
  pool: readonly FeedVideo[];
  signals: FeedSignals;
  memory: FeedMemory;
  seed: string;
  /** Place cards to mix in, in the order to show them (cards.ts cardQueue). None: videos only. */
  cards?: readonly string[];
  /** MoK reels to mix in, in the order to show them (inside the scope, not yet done first). */
  reels?: readonly Reel[];
}

export interface PlanState {
  items: FeedItem[];
  /** Places of a video asked for by name (a hub's Watch row, the Library): the session leans there. */
  asked: readonly string[] | null;
}

export const createPlan = (): PlanState => ({ items: [], asked: null });

/** Where the learner's attention is, as good evidence added to the model for planning (never saved):
 * full weight at the place, fading up its chain, so its field and territory lean that way too. */
export function pseudoCounts(signals: FeedSignals, asked: readonly string[] | null = null): Map<string, number> {
  const out = new Map<string, number>();
  const add = (place: string | null | undefined, weight: number) => {
    if (!place || place === 'knowledge') return;
    const nodes = chain(place);
    nodes.forEach((node, i) => {
      const key = `p:${node}`, w = weight * 0.55 ** (nodes.length - 1 - i);
      out.set(key, Math.max(out.get(key) ?? 0, w));
    });
  };
  for (const place of asked ?? []) add(place, 2.5);
  add(signals.focus, 3);
  signals.recent.slice(0, 8).forEach((place, i) => add(place, 2 * 0.88 ** i));
  for (const place of signals.pinned.slice(0, 12)) add(place, 1.2);
  for (const place of signals.lit.slice(0, 16)) add(place, 0.8);
  return out;
}

export const itemPlace = (item: FeedItem): string | null => item.kind === 'video' ? item.video.places[0] : item.kind === 'card' ? item.placeId : item.kind === 'reel' ? item.reel.nodeId : null;

/** What the planner reads from a video again and again, worked out once. */
interface Meta { territory: string; field: string; fieldKey: string; words: string[]; keys: ReturnType<typeof keysOf>; published: number | null }
const metas = new WeakMap<FeedVideo, Meta>();
function metaOf(video: FeedVideo): Meta {
  let meta = metas.get(video);
  if (!meta) {
    const field = fieldOf(video.places[0]);
    metas.set(video, meta = { territory: territoryOf(video.places[0]), field, fieldKey: `p:${field}`, words: videoWords(video), keys: keysOf(video), published: video.published ? Date.parse(video.published) : null });
  }
  return meta;
}

const lift = (published: number | null, now: number) => {
  if (published === null) return 1;
  const age = now - published;
  return age < 4 * 86_400_000 ? PLAN.newest : age < FRESH_MS ? PLAN.fresh : 1;
};
/** New uploads first: a lift for anything from the last three weeks, more for the last few days. */
export const freshness = (video: Pick<FeedVideo, 'published'>, now: number): number => lift(video.published ? Date.parse(video.published) : null, now);

const ranks = new WeakMap<readonly FeedVideo[], Map<string, number>>();
/** How well each video lands with people at large: its views per day since upload, ranked within the
 * pool (0 the least watched, 1 the most). Unknown counts sit in the middle. */
export function popularity(pool: readonly FeedVideo[], now: number): Map<string, number> {
  let out = ranks.get(pool);
  if (out) return out;
  const rate = (video: FeedVideo) => video.views == null ? null : video.views / Math.max(1, (now - Date.parse(video.published ?? '2020-01-01')) / 86_400_000);
  const known = pool.flatMap(video => { const r = rate(video); return r === null ? [] : [{ id: video.id, r }]; }).sort((a, b) => a.r - b.r);
  out = new Map(pool.map(video => [video.id, 0.5]));
  known.forEach((item, i) => out!.set(item.id, known.length > 1 ? i / (known.length - 1) : 0.5));
  ranks.set(pool, out);
  return out;
}

/** What the planner holds still across one extension: the videos it may not plan, the posterior,
 * and what each video's words score (they are read as means, never drawn). */
interface Frame { gone: Set<string>; post: Posterior; cold: boolean; slump: boolean; said: Map<FeedVideo, number> }
function frameFor(ctx: PlanContext, state: PlanState): Frame {
  const { model } = ctx.memory;
  const pseudo = pseudoCounts(ctx.signals, state.asked);
  const { a, b } = counts(model.stats.g, model.clock);
  const gone = new Set([...ctx.memory.seen, ...Object.keys(ctx.memory.watched), ...ctx.memory.hidden, ...ctx.memory.broken]);
  const post = posterior(model, pseudo);
  // A slump: no's in a row, and no field the model still believes in.
  const slump = (model.streak ?? 0) >= PLAN.slump && !fieldsOf(ctx.pool).some(key => post.mean(key) >= PLAN.sure);
  return { gone, post, cold: a + b < PLAN.cold && a < 0.9 && pseudo.size === 0, slump, said: new Map() };
}
const fieldSets = new WeakMap<readonly FeedVideo[], string[]>();
/** The pool's fields, as feature keys. */
function fieldsOf(pool: readonly FeedVideo[]): string[] {
  let out = fieldSets.get(pool);
  if (!out) fieldSets.set(pool, out = [...new Set(pool.map(video => metaOf(video).fieldKey))]);
  return out;
}

export interface Choice { video: FeedVideo; lane: Lane }

/** Choose the next video, or null when nothing is left at all. */
export function pickVideo(ctx: PlanContext, state: PlanState, now = Date.now(), frame: Frame = frameFor(ctx, state)): Choice | null {
  const served = new Set<string>();
  for (const item of state.items) if (item.kind === 'video') served.add(item.video.id);
  const available = ctx.pool.filter(video => !served.has(video.id) && !frame.gone.has(video.id));
  if (!available.length) return null;

  const shown = state.items.flatMap(item => item.kind === 'video' ? [item.video] : []);
  const last = shown.at(-1);
  const recentChannels = shown.slice(-4).map(video => video.channel);
  const lastTerritories = shown.slice(-PLAN.maxRun).map(video => metaOf(video).territory);
  const lastFields = shown.slice(-2).map(video => metaOf(video).field);
  const sessionTerritories = shown.slice(-8).map(video => metaOf(video).territory);
  const runFull = lastTerritories.length === PLAN.maxRun && lastTerritories.every(t => t === lastTerritories[0]);
  const allowed = (video: FeedVideo) => video.channel !== last?.channel && !(runFull && metaOf(video).territory === lastTerritories[0]);
  let pool = available.filter(allowed);
  if (!pool.length) pool = available.filter(video => video.channel !== last?.channel);
  if (!pool.length) pool = available;

  const explore = isExploreSlot(shown.length, frame.slump);
  if (explore) {
    // Fields the learner has hardly met (by what they did, not by the map) and has not been shown
    // lately; parent-first draws decide among them.
    const { model } = ctx.memory;
    // Shown lately: in the model's short memory, or among the last cards (planned, maybe not yet left).
    const planned = new Set(shown.slice(-6).map(video => metaOf(video).fieldKey));
    const lately = (video: FeedVideo) => { const { fieldKey } = metaOf(video); if (planned.has(fieldKey)) return true; const r = recentCounts(model, fieldKey); return r.a + r.b >= PLAN.lately; };
    const met = (video: FeedVideo) => { const { a, b } = counts(model.stats[metaOf(video).fieldKey], model.clock); return a + b; };
    let barely = pool.filter(video => met(video) < PLAN.uncharted);
    // Every field met already (a long session in a small pool): the five least met.
    if (!barely.length) {
      const levels = [...new Set(pool.map(video => met(video)))].sort((x, y) => x - y);
      const cut = levels[Math.min(levels.length - 1, 4)];
      barely = pool.filter(video => met(video) <= cut);
    }
    const unseen = barely.filter(video => !lately(video));
    pool = unseen.length ? unseen : barely;
  }
  const rand = rng(`${ctx.seed}:${state.items.length}`);
  const popular = popularity(ctx.pool, now);
  const draw = sampler(frame.post, rand, explore ? 1 : PLAN.sharpness);

  let best: FeedVideo | null = null, top = -Infinity;
  for (const video of pool) {
    const meta = metaOf(video);
    let said = frame.said.get(video);
    if (said === undefined) frame.said.set(video, said = wordsScore(meta.words, frame.post));
    // Raised to a power so that a real difference in interest outweighs format, freshness and variety.
    let s = interestIn(meta.keys, said, draw, frame.post.trust(meta.fieldKey)) ** PLAN.contrast;
    // Knowing nothing yet, or in a slump (what it knows is not landing), lean on what lands with
    // people at large, as a first session does.
    const unsure = frame.cold || (frame.slump && explore);
    s *= video.short ? (unsure ? PLAN.coldShort : PLAN.short) : 1;
    s *= lift(meta.published, now);
    s *= 1 - (unsure ? PLAN.coldPopular : PLAN.popular) * (0.5 - (popular.get(video.id) ?? 0.5));
    const { territory, field } = meta;
    if (recentChannels.includes(video.channel)) s *= PLAN.sameChannel;
    if (territory === lastTerritories.at(-1)) s *= PLAN.sameTerritory;
    if (lastFields.length === 2 && lastFields.every(f => f === field)) s *= PLAN.sameField;
    // A first session: spread across territories.
    if (frame.cold) s *= PLAN.coldSpread ** sessionTerritories.filter(t => t === territory).length;
    if (s > top) { top = s; best = video; }
  }
  return best && { video: best, lane: explore ? 'explore' : 'fit' };
}

/** Extend the plan by `count` cards. Place cards (ctx.cards, in order) take every third content slot
 * (cards.ts isCardSlot) and reels (ctx.reels, in order) every sixth (isReelSlot); once no video is
 * left, cards and reels take every slot, reels still at their own. Checkpoints come only in a feed
 * with videos. Stops with an end card once nothing is left. */
export function extendPlan(ctx: PlanContext, state: PlanState, count: number, now = Date.now()): PlanState {
  const current: PlanState = { items: [...state.items], asked: state.asked };
  const frame = frameFor(ctx, current);
  const placed = new Set(current.items.flatMap(item => item.kind === 'card' ? [item.placeId] : item.kind === 'reel' ? [`reel:${item.reel.id}`] : []));
  const queue = (ctx.cards ?? []).filter(id => !placed.has(id));
  const reels = (ctx.reels ?? []).filter(reel => !placed.has(`reel:${reel.id}`));
  let slot = current.items.filter(item => item.kind === 'video' || item.kind === 'card' || item.kind === 'reel').length;
  for (let n = 0; n < count; n++) {
    if (current.items.at(-1)?.kind === 'end') break;
    const index = current.items.length;
    if (isCheckpointSlot(index) && ctx.pool.length) { current.items.push({ kind: 'checkpoint', key: `checkpoint-${index}` }); continue; }
    const card = queue[0], reel = reels[0];
    const reelHere = !!reel && isReelSlot(slot);
    const pick = reelHere || (card !== undefined && isCardSlot(slot)) ? null : pickVideo(ctx, current, now, frame);
    if (pick) current.items.push({ kind: 'video', key: `video-${pick.video.id}`, video: pick.video, lane: pick.lane });
    else if (reel && (reelHere || card === undefined)) { reels.shift(); current.items.push({ kind: 'reel', key: `reel-${reel.id}`, reel }); }
    else if (card !== undefined) { queue.shift(); current.items.push({ kind: 'card', key: `card-${card}`, placeId: card }); }
    else { current.items.push({ kind: 'end', key: 'end' }); break; }
    slot++;
  }
  return current;
}

/** Keep the cards up to and including `keep` (already seen, on screen, or warming) and plan the rest
 * again: after each card the learner leaves, the model has learned something. */
export function replanAfter(state: PlanState, keep: number): PlanState {
  return { items: state.items.slice(0, keep + 1), asked: state.asked };
}

/** Start a session with a video asked for by name (a hub's Watch row, the Library): it plays even
 * if it was watched before, and the session leans toward its places. */
export function planStartingWith(video: FeedVideo): PlanState {
  return { items: [{ kind: 'video', key: `video-${video.id}`, video, lane: 'asked' }], asked: video.places };
}

/** Is `place` inside or around any of `scopes`? Used by the hub's Watch row and the checkpoint. */
export const touches = (place: string, scopes: readonly string[]) => scopes.some(scope => isWithin(place, scope) || isWithin(scope, place));
