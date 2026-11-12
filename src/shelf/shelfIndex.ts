import { useEffect, useState } from 'react';
import type { CoreMinutes, ShelfIndex } from './types';

export const EMPTY_SHELF_INDEX: ShelfIndex = { schema: 'mok.shelf/1', core: {} };

const minutes = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** Validates /auto/shelf.json: anything else reads as an empty index. Malformed entries are dropped. */
export function parseShelfIndex(value: unknown): ShelfIndex {
  if (!value || typeof value !== 'object' || (value as ShelfIndex).schema !== 'mok.shelf/1') return EMPTY_SHELF_INDEX;
  const { core, quick } = value as { core?: unknown; quick?: unknown };
  const cleanCore: Record<string, CoreMinutes> = {};
  if (core && typeof core === 'object') for (const [id, entry] of Object.entries(core)) {
    if (Array.isArray(entry)) cleanCore[id] = [minutes(entry[0]), minutes(entry[1]), minutes(entry[2])];
  }
  const cleanQuick: Record<string, number> = {};
  if (quick && typeof quick === 'object') for (const [id, count] of Object.entries(quick)) if (minutes(count)) cleanQuick[id] = Math.round(count as number);
  return { schema: 'mok.shelf/1', core: cleanCore, quick: cleanQuick };
}

let pending: Promise<ShelfIndex> | null = null;
let loaded: ShelfIndex | null = null;
/** The shelf index, fetched once per page. A missing or unreadable file is an empty index. */
export function loadShelfIndex(): Promise<ShelfIndex> {
  pending ??= fetch('/auto/shelf.json')
    .then(response => response.ok && response.headers.get('content-type')?.includes('json') ? response.json() : null)
    .then(parseShelfIndex, () => EMPTY_SHELF_INDEX)
    .then(index => (loaded = index));
  return pending;
}

/** The shelf index: null until it has loaded (a missing file loads as an empty index), then the same
 * object for the life of the page. Until then nothing can tell charted from uncharted. */
export function useShelfIndex(): ShelfIndex | null {
  const [index, setIndex] = useState<ShelfIndex | null>(() => loaded);
  useEffect(() => {
    let live = true;
    void loadShelfIndex().then(next => { if (live) setIndex(next); });
    return () => { live = false; };
  }, []);
  return index;
}
