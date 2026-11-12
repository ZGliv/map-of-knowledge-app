// What the learner's attention says they care about, learned on this device from what they do with
// each video (engagement.ts turns an impression into a reward between 0 and 1). Pure.
//
// The model keeps two numbers per feature, the weight of good and bad evidence, for:
//   p:<place>   every atlas place a video is tagged to, and each of its ancestors up to its territory
//   c:<channel> the channel
//   w:<word>    the plain words of its title and its "what you'll learn" line
//   g           everything, the learner's overall appetite
// Evidence fades: each new impression keeps DECAY of everything before it, and a day away counts as
// a few impressions, so a shift in interest shows within a session and old tastes fade over weeks.
//
// Beside that long memory the model keeps a short one, for places and channels: each area's last few
// verdicts, older ones counting less each time the area comes round again, all of it fading over a
// session and the days after (TUNING.recent). It answers "what about now?". Recent no's count on top
// of the long-term, and when an area's recent no's outweigh its recent yes's its old yes's count for
// less, down every place beneath it, and the channels and words learned there lean back toward the
// overall appetite, until it is liked again: a learner who quick-skips their old favourite three
// times running has moved on, and their old taste stops winning. (Recent yes's only offset recent
// no's: counted again on top, one long accidental watch would pull the feed after it.) The model
// also counts the no's in a row, so the planner can explore harder when nothing lands.
//
// Reading it back is hierarchical: a place with little evidence of its own leans on its parent (a new
// corner of physics starts where physics stands, physics where science stands, science where the
// learner's overall appetite stands). Thompson sampling draws from those same posteriors, parent
// first, so an area the model knows little about sometimes draws high and gets tested, and an area
// the learner keeps skipping almost never does.

import type { FeedVideo } from './pool';
import { beta } from './rng';

export const TUNING = {
  /** Each impression keeps this share of all earlier evidence (about 46 impressions to half). */
  decay: 0.985,
  /** A day away forgets as much as this many impressions. */
  idlePerDay: 6,
  /** What a learner makes of a video before anything is known. */
  prior: 0.4,
  /** How many impressions a parent's view counts for, for a child with little of its own. */
  backoff: { place: 4, channel: 5, word: 6, global: 2 },
  /** A video's second and third places learn at this share. */
  secondary: 0.6,
  /** Each of its words learns at this share. */
  word: 0.35,
  maxWords: 6,
  /** How a video's interest is made up. */
  weights: { place: 0.62, channel: 0.24, words: 0.14 },
  /** Features kept on the device; the faintest go first. */
  maxStats: 2500,
  /** The short memory, for places and channels: an area's last few verdicts. */
  recent: {
    /** Each time an area is shown again, it keeps this share of its earlier recent evidence. */
    keep: 0.7,
    /** And each impression, shown or not, keeps this share (about 14 impressions to half). */
    fade: 0.95,
    /** How much recent no's count on top of the long-term. */
    no: 1,
    /** Recent no's beyond recent yes's that halve how much an area's old yes's count. */
    doubt: 1,
    /** Old yes's never count for less than this share. */
    floor: 0.1,
    /** Below this reward an impression is a no, for the count of no's in a row. */
    noBelow: 0.25,
  },
} as const;

/** Good and bad evidence, decayed to clock `n` (the last time it changed). */
export interface Stat { readonly a: number; readonly b: number; readonly n: number }
export interface InterestModel {
  /** Impressions recorded (plus days away, as forgetting). */
  readonly clock: number;
  readonly stats: Readonly<Record<string, Stat>>;
  /** The short memory: places and channels, each area's last few verdicts (TUNING.recent). */
  readonly recent?: Readonly<Record<string, Stat>>;
  /** No's in a row (impressions judged under TUNING.recent.noBelow), back to 0 at the first yes or a new day. */
  readonly streak?: number;
}

export const createInterest = (): InterestModel => ({ clock: 0, stats: {}, recent: {}, streak: 0 });

// --- Features ------------------------------------------------------------------------------------

/** A place and its ancestors, territory first, never the bare root: a.b.c.d → a.b, a.b.c, a.b.c.d. */
export function chain(place: string): string[] {
  const parts = place.split('.');
  const out: string[] = [];
  for (let i = 2; i <= parts.length; i++) out.push(parts.slice(0, i).join('.'));
  return out;
}

const STOP = new Set(('about above after again against also among another around because been before being below between both '
  + 'could does doing down during each every from further have having here into itself just like made make makes making many more most '
  + 'much must never only other over same should since some still such than that their them then there these they thing things this '
  + 'those through under until very want ways were what when where which while whole will with within without would your yours youre '
  + 'actually really learn learning understand explained explains explain video videos short shorts part episode why how way new '
  + 'first best good great little world people time years year day days look looks looking work works using used real').split(' '));

/** The plain words of a line: lower case, four letters or more, no common words, plurals folded. */
export function keywords(text: string, max: number = TUNING.maxWords): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/)) {
    if (raw.length < 4 || STOP.has(raw)) continue;
    const word = raw.length > 4 && raw.endsWith('s') && !raw.endsWith('ss') && !raw.endsWith('us') && !raw.endsWith('is') ? raw.slice(0, -1) : raw;
    if (STOP.has(word) || out.includes(word)) continue;
    out.push(word);
    if (out.length >= max) break;
  }
  return out;
}

/** The video's words: its title's first, then its learn line's. */
export const videoWords = (video: Pick<FeedVideo, 'title' | 'learn'>) => keywords(`${video.title} ${video.learn}`);

/** Every feature a video teaches the model, with how much of each impression it learns. */
export function featuresOf(video: Pick<FeedVideo, 'places' | 'channel' | 'title' | 'learn'>): Map<string, number> {
  const out = new Map<string, number>();
  const add = (key: string, w: number) => out.set(key, Math.max(out.get(key) ?? 0, w));
  video.places.forEach((place, i) => { for (const node of chain(place)) add(`p:${node}`, i === 0 ? 1 : TUNING.secondary); });
  add(`c:${video.channel}`, 1);
  for (const word of videoWords(video)) add(`w:${word}`, TUNING.word);
  return out;
}

// --- Learning --------------------------------------------------------------------------------------

const WEIGHTS = TUNING.weights;
const factor = (from: number, to: number, decay: number = TUNING.decay) => decay ** Math.max(0, to - from);
/** A stat's evidence as of `clock`. */
export function counts(stat: Stat | undefined, clock: number, decay: number = TUNING.decay): { a: number; b: number } {
  if (!stat) return { a: 0, b: 0 };
  const f = factor(stat.n, clock, decay);
  return { a: stat.a * f, b: stat.b * f };
}
/** A feature's recent evidence (the short memory) as of the model's clock. */
export const recentCounts = (model: InterestModel, key: string) => counts(model.recent?.[key], model.clock, TUNING.recent.fade);

/** Add evidence to a stat, first fading what it had to `clock` and keeping `keep` of it. */
function learn(stats: Record<string, Stat>, key: string, clock: number, r: number, w: number, decay: number = TUNING.decay, keep = 1) {
  const { a, b } = counts(stats[key], clock, decay);
  stats[key] = { a: keep * a + w * r, b: keep * b + w * (1 - r), n: clock };
}
/** The short memory holds places and channels, not words or the overall appetite. */
const isRecent = (key: string) => key.startsWith('p:') || key.startsWith('c:');

/** One impression of `video`, judged `r` (0–1) with weight `w`: one tick of the clock. */
export function observe(model: InterestModel, video: Pick<FeedVideo, 'places' | 'channel' | 'title' | 'learn'>, r: number, w: number): InterestModel {
  const clock = model.clock + 1;
  const stats = { ...model.stats };
  const recent = { ...model.recent };
  const reward = Math.max(0, Math.min(1, r));
  learn(stats, 'g', clock, reward, w);
  for (const [key, share] of featuresOf(video)) {
    learn(stats, key, clock, reward, w * share);
    if (isRecent(key)) learn(recent, key, clock, reward, w * share, TUNING.recent.fade, TUNING.recent.keep);
  }
  return { clock, stats, recent, streak: reward < TUNING.recent.noBelow ? (model.streak ?? 0) + 1 : 0 };
}

/** Evidence about one feature from outside the feed (a case started at a place, an old preference):
 * the clock stays where it is. */
export function observeKey(model: InterestModel, key: string, r: number, w: number): InterestModel {
  const stats = { ...model.stats };
  learn(stats, key, model.clock, Math.max(0, Math.min(1, r)), w);
  return { ...model, stats };
}

/** The same for a place, all the way up its chain (nearer ancestors learn more). */
export function observePlace(model: InterestModel, place: string, r: number, w: number): InterestModel {
  const nodes = chain(place);
  let next = model;
  nodes.forEach((node, i) => { next = observeKey(next, `p:${node}`, r, w * 0.7 ** (nodes.length - 1 - i)); });
  return next;
}

/** Time away: forgetting, as if `days` × idlePerDay impressions had gone by (the short memory fades
 * with it: about a quarter a day, mostly gone in a week). A new day starts with no run of no's. */
export const idle = (model: InterestModel, days: number): InterestModel => days > 0 ? { ...model, clock: model.clock + Math.round(days * TUNING.idlePerDay), streak: 0 } : model;

/** How much the model has seen at all (decayed impressions). */
export const evidence = (model: InterestModel, key = 'g') => { const { a, b } = counts(model.stats[key], model.clock); return a + b; };

// --- Reading it back -------------------------------------------------------------------------------

const parents = new Map<string, string | null>();
export const parentKey = (key: string): string | null => {
  let parent = parents.get(key);
  if (parent !== undefined) return parent;
  if (key === 'g') parent = null;
  else if (!key.startsWith('p:')) parent = 'g';
  else { const id = key.slice(2), cut = id.lastIndexOf('.'); parent = id.split('.').length <= 2 || cut < 0 ? 'g' : `p:${id.slice(0, cut)}`; }
  if (parents.size < 20_000) parents.set(key, parent);
  return parent;
};
/** The bandit's arms: territories and fields, always drawn, even with nothing known about them. */
const isArm = (key: string) => key.startsWith('p:') && key.split('.').length <= 3;
const strength = (key: string) => key === 'g' ? TUNING.backoff.global : key.startsWith('p:') ? TUNING.backoff.place : key.startsWith('c:') ? TUNING.backoff.channel : TUNING.backoff.word;

export interface Posterior {
  /** Evidence for a feature: the model's (its old yes's discounted by doubt, its recent evidence on
   * top), plus any pseudo-evidence (the learner's map focus). */
  counts(key: string): { a: number; b: number };
  /** The expected reward for a feature, leaning on its parent where it knows little. */
  mean(key: string): number;
  /** How much a feature's old yes's count now (1 in full, down to TUNING.recent.floor). */
  trust(key: string): number;
}

/** The model read back, with `pseudo` good evidence added on top (never saved): the places in view,
 * underway, saved and lit, which say where the learner's attention is before the feed has learned it. */
export function posterior(model: InterestModel, pseudo: ReadonlyMap<string, number> = new Map()): Posterior {
  const means = new Map<string, number>();
  const trusts = new Map<string, number>();
  const R = TUNING.recent;
  // Recent no's beyond recent yes's: the old yes's count for less, here and in every place beneath.
  const trust = (key: string): number => {
    const known = trusts.get(key);
    if (known !== undefined) return known;
    let value = 1;
    if (isRecent(key)) {
      const { a, b } = recentCounts(model, key);
      value = Math.max(R.floor, 1 / (1 + Math.max(0, b - a) / R.doubt));
      const parent = parentKey(key);
      if (parent && parent !== 'g') value = Math.min(value, trust(parent));
    }
    trusts.set(key, value);
    return value;
  };
  // Read once per feature: the planner asks again for every video and every pick.
  const reads = new Map<string, { a: number; b: number }>();
  const read = (key: string) => {
    let out = reads.get(key);
    if (out) return out;
    const c = counts(model.stats[key], model.clock);
    const r = isRecent(key) ? recentCounts(model, key) : { b: 0 };
    reads.set(key, out = { a: c.a * trust(key) + (pseudo.get(key) ?? 0), b: c.b + R.no * r.b });
    return out;
  };
  const mean = (key: string): number => {
    const known = means.get(key);
    if (known !== undefined) return known;
    const parent = parentKey(key);
    const base = parent ? mean(parent) : TUNING.prior;
    const { a, b } = read(key), s = strength(key);
    const value = (a + s * base) / (a + b + s);
    means.set(key, value);
    return value;
  };
  return { counts: read, mean, trust };
}

/** Thompson sampling over a posterior, parent first, each feature drawn once per pick. `sharpness`
 * multiplies every count: 1 is a true posterior draw, more keeps draws closer to the mean. */
export function sampler(post: Posterior, rand: () => number, sharpness = 1): (key: string) => number {
  const drawn = new Map<string, number>();
  const draw = (key: string): number => {
    const known = drawn.get(key);
    if (known !== undefined) return known;
    const parent = parentKey(key);
    const base = parent ? draw(parent) : TUNING.prior;
    const { a, b } = post.counts(key), s = strength(key);
    // A deeper place or a channel with nothing of its own is its parent's draw: uncertainty lives in
    // the territories and fields (a few dozen arms), not in each of hundreds of untouched places.
    const value = parent && a + b < 0.05 && !isArm(key) ? base : beta(rand, sharpness * (a + s * base) + 0.05, sharpness * (b + s * (1 - base)) + 0.05);
    drawn.set(key, value);
    return value;
  };
  return draw;
}

/** What the model makes of a video's words: the mean of those it has evidence for, else the overall mean. */
export function wordsScore(words: readonly string[], post: Posterior): number {
  let sum = 0, n = 0;
  for (const word of words) { const key = `w:${word}`, { a, b } = post.counts(key); if (a + b >= 0.3) { sum += post.mean(key); n++; } }
  return n ? sum / n : post.mean('g');
}

/** How much the learner should want `video`, from any per-feature reader (a mean, or a draw): its
 * best place, its channel, and what its words score (wordsScore). `trust`: how much the old yes's
 * about its area count now (Posterior.trust); the channel and words learned there lean back toward
 * the overall appetite by as much as the area has lost it. */
export function interestIn(keys: { places: readonly string[]; channel: string }, said: number, value: (key: string) => number, trust = 1): number {
  let place = 0;
  keys.places.forEach((key, i) => { place = Math.max(place, (i === 0 ? 1 : 0.92) * value(key)); });
  const rest = WEIGHTS.channel * value(keys.channel) + WEIGHTS.words * said;
  return WEIGHTS.place * place + (trust < 1 ? trust * rest + (1 - trust) * (WEIGHTS.channel + WEIGHTS.words) * value('g') : rest);
}

/** A video's feature keys, as interestIn reads them. */
export const keysOf = (video: Pick<FeedVideo, 'places' | 'channel'>) => ({ places: video.places.map(id => `p:${id}`), channel: `c:${video.channel}` });

// --- Keeping it --------------------------------------------------------------------------------

const round = (n: number) => Math.round(n * 1000) / 1000;
type Packed = Record<string, [number, number, number]>;
/** Stats as stored: [a, b, n] per feature, the faintest dropped past `max`. */
function packStats(source: Readonly<Record<string, Stat>>, clock: number, decay: number, max: number, keep = 0.005): Packed {
  let entries = Object.entries(source).map(([key, stat]) => ({ key, stat, mass: (stat.a + stat.b) * factor(stat.n, clock, decay) }));
  entries = entries.filter(entry => entry.mass >= keep || entry.key === 'g');
  if (entries.length > max) entries = entries.sort((x, y) => y.mass - x.mass).slice(0, max);
  const out: Packed = {};
  for (const { key, stat } of entries) out[key] = [round(stat.a), round(stat.b), stat.n];
  return out;
}
/** The model as stored: [a, b, n] per feature, the faintest dropped past maxStats (the short memory
 * keeps only what has not faded). */
export function packInterest(model: InterestModel): { clock: number; stats: Packed; recent: Packed; streak: number } {
  return {
    clock: model.clock,
    stats: packStats(model.stats, model.clock, TUNING.decay, TUNING.maxStats),
    recent: packStats(model.recent ?? {}, model.clock, TUNING.recent.fade, 400, 0.02),
    streak: model.streak ?? 0,
  };
}

const KEY = /^(g|[pcw]:[\w.:-]{1,160})$/;
function unpackStats(value: unknown, clock: number, max: number): Record<string, Stat> {
  const stats: Record<string, Stat> = {};
  if (!value || typeof value !== 'object') return stats;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, max * 2)) {
    if (!KEY.test(key) || !Array.isArray(entry) || entry.length !== 3) continue;
    const [a, b, n] = entry as unknown[];
    if (typeof a !== 'number' || typeof b !== 'number' || typeof n !== 'number' || ![a, b, n].every(Number.isFinite) || a < 0 || b < 0 || n < 0) continue;
    stats[key] = { a: Math.min(a, 1e4), b: Math.min(b, 1e4), n: Math.min(Math.floor(n), clock) };
  }
  return stats;
}
/** A stored model, dropping anything malformed rather than failing. */
export function unpackInterest(value: unknown): InterestModel {
  if (!value || typeof value !== 'object') return createInterest();
  const raw = value as { clock?: unknown; stats?: unknown; recent?: unknown; streak?: unknown };
  const clock = typeof raw.clock === 'number' && Number.isFinite(raw.clock) && raw.clock >= 0 ? Math.floor(raw.clock) : 0;
  const recent = Object.fromEntries(Object.entries(unpackStats(raw.recent, clock, 400)).filter(([key]) => isRecent(key)));
  const streak = typeof raw.streak === 'number' && Number.isFinite(raw.streak) && raw.streak >= 0 ? Math.min(Math.floor(raw.streak), 999) : 0;
  return { clock, stats: unpackStats(raw.stats, clock, TUNING.maxStats), recent, streak };
}
