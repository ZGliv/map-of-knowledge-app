import { cardId, guessPlace, packId, readId, type CoreMinutes, type ShelfState } from './types';

/** How much of each place is filled in: pure, one pass over the catalog. */

export interface FillNode { readonly id: string; readonly parentId: string | null }

export interface FillInput {
  /** Every place on the map (catalog.all()), in any order. */
  nodes: Iterable<FillNode>;
  /** Core minutes per place, from the shelf index. */
  core: Readonly<Record<string, CoreMinutes>>;
  /** Finished item ids (the store's done set). */
  done: ReadonlySet<string>;
  /** Places the app already counts as completed (App's mapCompletedIds): each, and all inside it, is fully finished. */
  legacy?: Iterable<string>;
  /** Demo marks among `legacy`: they light like legacy, but a place with one inside it never latches. */
  mock?: Iterable<string>;
  /** Places latched complete (the store's complete map): each stays at 100% whatever is added to it later. Only
   * the place itself: what is inside it, and its minutes in its ancestors' sums, are counted as they are. */
  complete?: Iterable<string>;
  /** Places with hand-built content (lessons, discoveries): charted even without core minutes. */
  handBuilt?: Iterable<string>;
}

export interface PlaceTotals { readonly done: number; readonly core: number }

export interface FillResult {
  /** 0..1 per place; places at 0 are left out (read with `?? 0`). */
  fill: ReadonlyMap<string, number>;
  /** Places with core minutes anywhere inside, legacy completion, or hand-built content. Everything else is uncharted (fog). */
  charted: ReadonlySet<string>;
  /** Finished and total core minutes over each place and everything inside it; places with none are left out. */
  totals: ReadonlyMap<string, PlaceTotals>;
  /** The top of the map (the first node without a parent), or null for an empty map. */
  root: string | null;
  /** Places to latch now: at 100% from finished core minutes, with every place inside them holding minutes of
   * their own or completed (so nothing there is still to be published), no demo mark inside, not lit by legacy
   * completion and not latched already. */
  full: ReadonlySet<string>;
  /** Latched places, except those legacy completion lights. */
  latched: ReadonlySet<string>;
}

export interface PlaceProgress { fill: number; done: number; core: number; charted: boolean }

const NONE: PlaceTotals = { done: 0, core: 0 };

export function computeFill({ nodes, core, done, legacy = [], mock = [], complete = [], handBuilt = [] }: FillInput): FillResult {
  const list = [...nodes];
  const count = list.length;
  const at = new Map<string, number>();
  for (let i = 0; i < count; i++) at.set(list[i].id, i);
  // Children as linked lists: first child, next sibling.
  const parent = new Int32Array(count).fill(-1);
  const first = new Int32Array(count).fill(-1);
  const next = new Int32Array(count).fill(-1);
  const roots: number[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const p = list[i].parentId === null ? undefined : at.get(list[i].parentId!);
    if (p === undefined || p === i) { roots.push(i); continue; }
    parent[i] = p; next[i] = first[p]; first[p] = i;
  }
  roots.reverse();
  const legacySet = new Set(legacy);
  const mockSet = new Set(mock);
  const completeSet = new Set(complete);
  const handSet = new Set(handBuilt);
  // Pre-order from the roots: parents before children, so lit (completed or inside a completed place) flows down.
  const order = new Int32Array(count);
  const lit = new Uint8Array(count);
  let filled = 0;
  const stack: number[] = [...roots].reverse();
  while (stack.length) {
    const i = stack.pop()!;
    order[filled++] = i;
    lit[i] = legacySet.has(list[i].id) || (parent[i] >= 0 && lit[parent[i]]) ? 1 : 0;
    for (let child = first[i]; child >= 0; child = next[child]) stack.push(child);
  }
  // Reverse pre-order is a post-order: every child is summed before its parent.
  const subCore = new Float64Array(count);
  const subDone = new Float64Array(count);
  // Minutes from the index alone (not the one-of-one a completed place without any counts as): a latch needs real ones.
  const subReal = new Float64Array(count);
  const hand = new Uint8Array(count);
  // Something inside (or the place itself) that blocks a latch: a place with no minutes yet and not completed, or a demo mark.
  const open = new Uint8Array(count);
  const fill = new Map<string, number>();
  const charted = new Set<string>();
  const totals = new Map<string, PlaceTotals>();
  const full = new Set<string>();
  const latched = new Set<string>();
  for (let k = filled - 1; k >= 0; k--) {
    const i = order[k];
    const id = list[i].id;
    const minutes = core[id];
    if (minutes) {
      const [card, read, pack] = minutes;
      const own = card + read + pack;
      subCore[i] += own;
      subReal[i] += own;
      subDone[i] += lit[i] ? own : (done.has(cardId(id)) ? card : 0) + (done.has(readId(id)) ? read : 0) + (done.has(packId(id)) ? pack : 0);
    }
    // A completed place with nothing to finish inside it still counts: one finished minute of one.
    if (subCore[i] === 0 && legacySet.has(id)) { subCore[i] = 1; subDone[i] = 1; }
    if (handSet.has(id)) hand[i] = 1;
    if ((subReal[i] === 0 && !lit[i]) || mockSet.has(id)) open[i] = 1;
    const value = subCore[i] > 0 ? Math.min(1, subDone[i] / subCore[i]) : lit[i] ? 1 : 0;
    const isLatched = completeSet.has(id) && !lit[i];
    if (isLatched) latched.add(id);
    else if (value >= 1 && !lit[i] && !open[i]) full.add(id);
    if (value > 0 || isLatched) fill.set(id, isLatched ? 1 : value);
    if (subCore[i] > 0) totals.set(id, { done: subDone[i], core: subCore[i] });
    if (subCore[i] > 0 || lit[i] || hand[i] || isLatched) charted.add(id);
    const p = parent[i];
    if (p >= 0) { subCore[p] += subCore[i]; subDone[p] += subDone[i]; subReal[p] += subReal[i]; if (hand[i]) hand[p] = 1; if (open[i]) open[p] = 1; }
  }
  return { fill, charted, totals, root: roots.length ? list[roots[0]].id : null, full, latched };
}

/** Places to latch complete now: full in `result` and not already in the store's `complete` map. Empty
 * once they are latched (a latched place is never full again), which is what stops the latch looping. */
export function newlyComplete(result: FillResult, complete: Readonly<Record<string, string>>): string[] {
  return [...result.full].filter(id => !complete[id]);
}

/** One place's numbers, for a fill bar ("Explored 40%, 2 of 5 core minutes"). */
export function placeProgress(result: FillResult, placeId: string): PlaceProgress {
  const totals = result.totals.get(placeId) ?? NONE;
  return { fill: result.fill.get(placeId) ?? 0, done: totals.done, core: totals.core, charted: result.charted.has(placeId) };
}

/** The whole map's fill as a percentage with one decimal (1.4 for "You've filled 1.4% of the map"). */
export function mapPercent(result: FillResult): number {
  return result.root ? Math.round((result.fill.get(result.root) ?? 0) * 1000) / 10 : 0;
}

/** A fill fraction as the learner reads it: one decimal, and never "0.0%" once anything is filled. */
export function formatPercent(fraction: number): string {
  if (fraction <= 0) return '0%';
  const tenths = Math.round(fraction * 1000) / 10;
  return tenths < 0.1 ? 'under 0.1%' : `${tenths.toFixed(1)}%`;
}

/** A place's glow from quick guesses: right answers over its number of questions (`quick`), or over
 * the questions answered where that count is unknown. Merged with `base` (the freshness glow) by max. */
export function glowFromGuesses(guesses: ShelfState['guesses'], quick: Readonly<Record<string, number>> = {}, base: ReadonlyMap<string, number> = new Map()): Map<string, number> {
  const right = new Map<string, number>();
  const answered = new Map<string, number>();
  for (const [id, guess] of Object.entries(guesses)) {
    const place = guessPlace(id);
    if (!place) continue;
    answered.set(place, (answered.get(place) ?? 0) + 1);
    if (guess.right) right.set(place, (right.get(place) ?? 0) + 1);
  }
  const glow = new Map(base);
  for (const [place, count] of right) {
    const of = Math.max(quick[place] ?? 0, answered.get(place) ?? 0);
    const value = Math.min(1, count / of);
    if (value > (glow.get(place) ?? 0)) glow.set(place, value);
  }
  return glow;
}

/** Same numbers, to a thousandth: a recomputed fill that would paint the same keeps its old identity. */
export function sameFill(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [id, value] of a) { const other = b.get(id); if (other === undefined || Math.abs(other - value) > 0.0005) return false; }
  return true;
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
