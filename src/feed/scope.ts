import { useEffect, useSyncExternalStore } from 'react';

// The scope the learner just asked for from Explore (the header's "up one level", "Whole map", or an
// end card's "Widen to"). The app moves its map there, which takes as long as the camera's flight;
// meanwhile the feed and the reels already show the new scope. Once the map's place changes (to that
// place or anywhere else), the map's place is the scope again.

let pending: { id: string; from: string } | null = null;
const listeners = new Set<() => void>();
const read = () => pending;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Ask for a scope now, while the map (at `from`) is still on its way there. */
export function askScope(id: string, from: string): void {
  pending = id === from ? null : { id, from };
  for (const listener of listeners) listener();
}

/** The scope as the learner sees it: the one just asked for while the map has not moved yet, else the map's. */
export const effectiveScope = (mapScope: string, asked: { id: string; from: string } | null) => asked && asked.from === mapScope ? asked.id : mapScope;

export function useScope(mapScope: string): string {
  const asked = useSyncExternalStore(subscribe, read, read);
  // The map has moved since: what was asked for is done with (so going back there later is the map's own).
  useEffect(() => { if (pending && pending.from !== mapScope) askScope(mapScope, mapScope); }, [mapScope]);
  return effectiveScope(mapScope, asked);
}
