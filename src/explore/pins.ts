// Saved (pinned) reels, each under the places the learner chose for it, and which reels have been
// watched, on this device only (localStorage). Nothing here is evidence: watching or saving a reel
// never colors the map.

export const REEL_SHELF_KEY = 'mok-reels-v1';
const MAX_ITEMS = 500;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** A saved reel. `places`: where the learner saved it (from the Save sheet), when they chose; else its own place. */
export interface ReelPin { readonly id: string; readonly at: string; readonly places?: readonly string[] }
const MAX_PLACES = 5;

export interface ReelShelf {
  readonly version: 1;
  /** Newest first. */
  readonly pinned: readonly ReelPin[];
  /** Reels played to their end card, in the order first finished. */
  readonly watched: readonly string[];
}

export const createReelShelf = (): ReelShelf => ({ version: 1, pinned: [], watched: [] });

/** Reads a saved shelf, dropping anything malformed rather than failing the page. */
export function parseReelShelf(raw: string | null): ReelShelf {
  if (!raw) return createReelShelf();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return createReelShelf(); }
  const data = value as { version?: unknown; pinned?: unknown; watched?: unknown } | null;
  if (!data || data.version !== 1) return createReelShelf();
  const pinned = Array.isArray(data.pinned) ? data.pinned.filter((item): item is ReelPin =>
    !!item && typeof item.id === 'string' && typeof item.at === 'string' && !Number.isNaN(Date.parse(item.at))).map((item): ReelPin => {
    const places = Array.isArray(item.places) ? [...new Set(item.places.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200))].slice(0, MAX_PLACES) : [];
    return places.length ? { id: item.id, at: item.at, places } : { id: item.id, at: item.at };
  }) : [];
  const watched = Array.isArray(data.watched) ? data.watched.filter((id): id is string => typeof id === 'string') : [];
  const seen = new Set<string>();
  return {
    version: 1,
    pinned: pinned.filter(item => !seen.has(item.id) && seen.add(item.id)).slice(0, MAX_ITEMS),
    watched: [...new Set(watched)].slice(0, MAX_ITEMS),
  };
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadReelShelf(target?: StorageLike): ReelShelf {
  try { return parseReelShelf(storage(target)?.getItem(REEL_SHELF_KEY) ?? null); } catch { return createReelShelf(); }
}

/** Returns an error message, or null once the browser has kept it. */
export function saveReelShelf(shelf: ReelShelf, target?: StorageLike): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Pins will last only for this session.';
  try { store.setItem(REEL_SHELF_KEY, JSON.stringify(shelf)); return null; } catch { return 'Your pinned reels could not be saved in this browser.'; }
}

export const isPinned = (shelf: ReelShelf, id: string) => shelf.pinned.some(item => item.id === id);
/** Where a saved reel sits: the places chosen for it, else its own. */
export const pinPlaces = (pin: ReelPin, ownPlace: string | undefined): string[] => pin.places?.length ? [...pin.places] : ownPlace ? [ownPlace] : [];

/** Save a reel under `places` (or move it there): it goes to the front, as newest. */
export function savePin(shelf: ReelShelf, id: string, places: readonly string[], at = new Date().toISOString()): ReelShelf {
  const kept = [...new Set(places)].slice(0, MAX_PLACES);
  const pin: ReelPin = kept.length ? { id, at, places: kept } : { id, at };
  return { ...shelf, pinned: [pin, ...shelf.pinned.filter(item => item.id !== id)].slice(0, MAX_ITEMS) };
}
export const removePin = (shelf: ReelShelf, id: string): ReelShelf => isPinned(shelf, id) ? { ...shelf, pinned: shelf.pinned.filter(item => item.id !== id) } : shelf;

export function togglePin(shelf: ReelShelf, id: string, at = new Date().toISOString()): ReelShelf {
  return isPinned(shelf, id)
    ? { ...shelf, pinned: shelf.pinned.filter(item => item.id !== id) }
    : { ...shelf, pinned: [{ id, at }, ...shelf.pinned].slice(0, MAX_ITEMS) };
}

export function markWatched(shelf: ReelShelf, id: string): ReelShelf {
  return shelf.watched.includes(id) ? shelf : { ...shelf, watched: [...shelf.watched, id].slice(-MAX_ITEMS) };
}

/** Where the feed opens: the first reel not yet watched, or the start once all have been. */
export function firstUnwatched(ids: readonly string[], shelf: ReelShelf): number {
  const index = ids.findIndex(id => !shelf.watched.includes(id));
  return index < 0 ? 0 : index;
}
