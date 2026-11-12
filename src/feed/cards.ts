// Zoom is the filter: the feed shows only what is pinned inside the map's current place, and mixes
// place cards (one per charted place with a generated card) in with the videos. Pure, so the scope
// filter and the card order are tested (cards.test.ts).

import type { CoreMinutes } from '../shelf/types';
import { cardId, reelItemId } from '../shelf/types';
import { isWithin } from './places';
import type { FeedVideo } from './pool';
import { rng } from './rng';

/** The top of the map: scoped there, the feed is the whole map. */
export const MAP_ROOT = 'knowledge';
/** Of every three cards (checkpoints aside), the second is a place card: about one card per two videos. */
export const CARD_EVERY = 3;
export const CARD_AT = 1;

export const isRootScope = (scope: string | null | undefined, root = MAP_ROOT) => !scope || scope === root;

/** Videos whose primary place lies inside the scope (all of them at the root). Secondary tags never count. */
export function scopeVideos<T extends Pick<FeedVideo, 'places'>>(videos: readonly T[], scope: string | null | undefined, root = MAP_ROOT): T[] {
  if (isRootScope(scope, root)) return [...videos];
  return videos.filter(video => !!video.places[0] && isWithin(video.places[0], scope!));
}

/** Reels pinned inside the scope (all of them at the root). */
export function scopeReels<T extends { nodeId: string }>(reels: readonly T[], scope: string | null | undefined, root = MAP_ROOT): T[] {
  if (isRootScope(scope, root)) return [...reels];
  return reels.filter(reel => isWithin(reel.nodeId, scope!));
}

/** The branch of `scope` a place is in: the scope's child on the way down to it (the place itself when it is the scope). */
export function branchOf(placeId: string, scope: string): string {
  if (placeId === scope) return placeId;
  const rest = placeId.slice(scope.length + 1).split('.');
  return `${scope}.${rest[0]}`;
}

export interface CardQueueInput {
  /** Core minutes per place (the shelf index): a place has a card when its card minutes are positive. */
  core: Readonly<Record<string, CoreMinutes>>;
  scope: string | null | undefined;
  /** Finished item ids. */
  done: ReadonlySet<string>;
  seed: string;
  root?: string;
}

/** The place cards for a scope, in the order the feed shows them: the ones not yet done first; within
 * each group, the places near the top of the scope first, with a seeded jitter, never two in a row
 * from one branch of the scope while another branch still has one waiting, so a whole-map feed moves
 * between territories. Deterministic for a seed. */
export function cardQueue({ core, scope, done, seed, root = MAP_ROOT }: CardQueueInput): string[] {
  const top = isRootScope(scope, root) ? root : scope!;
  const ids = Object.keys(core).filter(id => core[id][0] > 0 && isWithin(id, top)).sort();
  const depth = (id: string) => id.split('.').length;
  const base = depth(top);
  const order = (list: string[]) => {
    const rand = rng(`${seed}|cards|${top}`);
    const ranked = list.map(id => ({ id, branch: branchOf(id, top), rank: depth(id) - base + rand() * 1.6 })).sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
    const out: string[] = [];
    let last: string | null = null;
    while (ranked.length) {
      // The best-ranked card from another branch than the last, among the next few; else the best.
      let pick = ranked.slice(0, 8).findIndex(item => item.branch !== last);
      if (pick < 0) pick = 0;
      const [item] = ranked.splice(pick, 1);
      out.push(item.id);
      last = item.branch;
    }
    return out;
  };
  return [...order(ids.filter(id => !done.has(cardId(id)))), ...order(ids.filter(id => done.has(cardId(id))))];
}

/** Is content slot `n` (0-based, checkpoints not counted) a place card's, when both are on offer? */
export const isCardSlot = (n: number) => n % CARD_EVERY === CARD_AT;
/** Of every six content slots, the fourth is a MoK reel's (never a card's slot). */
export const REEL_EVERY = 6;
export const REEL_AT = 3;
export const isReelSlot = (n: number) => n % REEL_EVERY === REEL_AT;

/** How a scope's feed stands: nothing in it to show, every card and reel in it seen (and no videos),
 * or still something to see. `reels`: the ids of the reels inside the scope. */
export type ScopeState = 'empty' | 'complete' | 'open';
export function scopeState(queue: readonly string[], done: ReadonlySet<string>, videos: number, reels: readonly string[] = []): ScopeState {
  if (!queue.length && !videos && !reels.length) return 'empty';
  if (!videos && queue.every(id => done.has(cardId(id))) && reels.every(id => done.has(reelItemId(id)))) return 'complete';
  return 'open';
}

/** The place one level up from the scope (null at the root), by its id. */
export function parentScope(scope: string | null | undefined, root = MAP_ROOT): string | null {
  if (isRootScope(scope, root)) return null;
  const at = scope!.lastIndexOf('.');
  return at > 0 ? scope!.slice(0, at) : root;
}
