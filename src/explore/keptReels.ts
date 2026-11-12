import { isPlayableReel } from './reelShape';
import { isEngineReel, type EngineReel, type Reel } from './types';

// A saved reel from a dated deck, kept whole on this device (localStorage). A dated reel leaves the
// Reels tab when it expires or its deck ages out (today.ts), and the app ships only the evergreen
// deck, so without its own copy a reel the learner saved would vanish from its hubs and the Library.
// Evergreen reels are never copied: the app always has them. Like the shelf (pins.ts), never evidence.

export const KEPT_REELS_KEY = 'mok-kept-reels-v1';
/** Copies kept at most (a dated reel is about 6 KB), newest save first. */
export const MAX_KEPT = 60;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Reads the kept copies, dropping any that would not play rather than failing the page. */
export function parseKeptReels(raw: string | null): EngineReel[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { version?: unknown; reels?: unknown } | null;
    if (!data || data.version !== 1 || !Array.isArray(data.reels)) return [];
    const seen = new Set<string>();
    return data.reels.filter(isPlayableReel).filter(reel => !seen.has(reel.id) && !!seen.add(reel.id)).slice(0, MAX_KEPT);
  } catch { return []; }
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadKeptReels(target?: StorageLike): EngineReel[] {
  try { return parseKeptReels(storage(target)?.getItem(KEPT_REELS_KEY) ?? null); } catch { return []; }
}

/** Returns an error message, or null once the browser has kept them (or has no storage at all, which
 * the shelf already says). */
export function saveKeptReels(reels: readonly EngineReel[], target?: StorageLike): string | null {
  const store = storage(target);
  if (!store) return null;
  try { store.setItem(KEPT_REELS_KEY, JSON.stringify({ version: 1, reels })); return null; } catch { return 'A saved reel could not be kept in this browser.'; }
}

/** One copy for each saved dated reel, in the shelf's order (newest save first): the copy kept
 * already, else the reel from `loaded` (what the Reels tab holds now). Copies of reels no longer
 * saved are dropped. The same array back when nothing changed. */
export function keepSaved(kept: readonly EngineReel[], savedIds: readonly string[], loaded: readonly Reel[]): readonly EngineReel[] {
  const byId = new Map<string, EngineReel>(kept.map(reel => [reel.id, reel]));
  for (const reel of loaded) if (isEngineReel(reel) && !byId.has(reel.id)) byId.set(reel.id, reel);
  const next = savedIds.flatMap(id => byId.get(id) ?? []).slice(0, MAX_KEPT);
  return next.length === kept.length && next.every((reel, index) => reel === kept[index]) ? kept : next;
}
