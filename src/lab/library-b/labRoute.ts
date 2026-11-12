import { useEffect, useState } from 'react';
import { parseRoute } from '../../hub/route';

/*
 * The hidden route of prototype B, "The Index":
 *   #/lab/library-b                  the index
 *   #/lab/library-b/place/<nodeId>   one place's page
 * The app's own router reads either as the map, so the shell stays as it is. A case or lesson opened
 * from here returns here: the page it was opened from stays under it while it is up, and when the
 * app leaves it for the map, that page comes back instead.
 */

export const LAB_HASH = '#/lab/library-b';
export interface LabRoute { readonly place: string | null }

export function parseLabHash(hash: string): LabRoute | null {
  if (hash !== LAB_HASH && !hash.startsWith(`${LAB_HASH}/`)) return null;
  const [kind, id] = hash.slice(LAB_HASH.length + 1).split('/');
  if (kind === 'place' && id) { try { return { place: decodeURIComponent(id) }; } catch { return { place: id }; } }
  return { place: null };
}

export const labHash = (route: LabRoute): string => route.place ? `${LAB_HASH}/place/${encodeURIComponent(route.place)}` : LAB_HASH;

const CHANGE = 'mok-route-change';
interface RouteState { mokDepth: number; prev: string }
const stateOf = (state: unknown): RouteState => {
  const raw = state as Partial<RouteState> | null;
  return { mokDepth: typeof raw?.mokDepth === 'number' ? raw.mokDepth : 0, prev: typeof raw?.prev === 'string' ? raw.prev : '' };
};

/** Open a page of the index, as a new history entry (so Back returns), the way the app's router does. */
export function goLab(route: LabRoute, mode: 'push' | 'replace' = 'push'): void {
  const url = `${window.location.pathname}${window.location.search}${labHash(route)}`;
  const current = stateOf(window.history.state);
  if (mode === 'push') window.history.pushState({ mokDepth: current.mokDepth + 1, prev: window.location.hash } satisfies RouteState, '', url);
  else window.history.replaceState(current, '', url);
  window.dispatchEvent(new Event(CHANGE));
}

/** Back to `route`: the browser's Back when that is where this page came from, otherwise a replace. */
export function leaveLab(route: LabRoute): void {
  const current = stateOf(window.history.state);
  if (current.mokDepth > 0 && current.prev === labHash(route)) window.history.back();
  else goLab(route, 'replace');
}

/** What the address says when the hash moves from `before` to `after`: the lab page to show, and
 * whether a proof screen opened from the lab is under way (so its exit to the map comes back here). */
export function nextLabState(before: { lab: string | null; returning: boolean }, hash: string): { lab: string | null; returning: boolean; restore: string | null } {
  if (parseLabHash(hash)) return { lab: hash, returning: false, restore: null };
  const route = parseRoute(hash);
  if (route.kind === 'mission' || route.kind === 'check' || route.kind === 'expedition') return { lab: before.lab, returning: before.returning || !!before.lab, restore: null };
  if (route.kind === 'map' && !hash.replace(/^#\/?/, '') && before.returning && before.lab) return { lab: before.lab, returning: false, restore: before.lab };
  return { lab: null, returning: false, restore: null };
}

let memory: { lab: string | null; returning: boolean } = { lab: null, returning: false };

/** The lab page the address names (or, while a case or lesson opened from it is up, the page under
 * it), or null. One instance, in App. */
export function useLibraryLab(): LabRoute | null {
  const [hash, setHash] = useState(() => {
    memory = nextLabState(memory, window.location.hash);
    return memory.lab;
  });
  useEffect(() => {
    const sync = () => {
      const next = nextLabState(memory, window.location.hash);
      memory = { lab: next.lab, returning: next.returning };
      if (next.restore) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${next.restore}`);
      setHash(next.lab);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener(CHANGE, sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); window.removeEventListener(CHANGE, sync); };
  }, []);
  return hash ? parseLabHash(hash) : null;
}
