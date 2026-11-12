import { useCallback, useEffect, useState } from 'react';

/** Screens layered over the atlas, addressable by URL so the browser's Back works:
 *   #/hub/<nodeId>                         a place's hub
 *   #/expedition/<packId>[/<beat>][?from=<nodeId>]   the player; `from` is the hub to return to
 *   #/mission/<nodeId>[?from=<nodeId>]     a field mission: one new case for one node
 *   #/check/<nodeId>[?from=<nodeId>]       the same place proved in words (the question bank) */
export type AtlasRoute =
  | { kind: 'map' }
  | { kind: 'hub'; nodeId: string }
  | { kind: 'expedition'; packId: string; beat: number; from: string | null }
  | { kind: 'mission'; nodeId: string; from: string | null }
  | { kind: 'check'; nodeId: string; from: string | null };

export function parseRoute(hash: string): AtlasRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { return part; } });
  if (parts[0] === 'hub' && parts[1]) return { kind: 'hub', nodeId: parts[1] };
  if (parts[0] === 'expedition' && parts[1]) {
    const from = new URLSearchParams(query).get('from');
    return { kind: 'expedition', packId: parts[1], beat: Math.max(0, Number(parts[2]) || 0), from };
  }
  if (parts[0] === 'mission' && parts[1]) return { kind: 'mission', nodeId: parts[1], from: new URLSearchParams(query).get('from') };
  if (parts[0] === 'check' && parts[1]) return { kind: 'check', nodeId: parts[1], from: new URLSearchParams(query).get('from') };
  return { kind: 'map' };
}

export function routeHash(route: AtlasRoute): string {
  if (route.kind === 'hub') return `#/hub/${encodeURIComponent(route.nodeId)}`;
  if (route.kind === 'mission') return `#/mission/${encodeURIComponent(route.nodeId)}${route.from ? `?from=${encodeURIComponent(route.from)}` : ''}`;
  if (route.kind === 'check') return `#/check/${encodeURIComponent(route.nodeId)}${route.from ? `?from=${encodeURIComponent(route.from)}` : ''}`;
  if (route.kind === 'expedition') return `#/expedition/${encodeURIComponent(route.packId)}${route.beat ? `/${route.beat}` : ''}${route.from ? `?from=${encodeURIComponent(route.from)}` : ''}`;
  return '';
}

const CHANGE = 'mok-route-change';
// Each history entry we push records how many in-app screens deep it is and the screen
// it came from. Leaving uses the browser's Back only when that really returns to the
// expected screen, so a deep link or a jump between hubs never strands the learner.
interface RouteState { mokDepth: number; prev: string }
const stateOf = (state: unknown): RouteState => {
  const raw = state as Partial<RouteState> | null;
  return { mokDepth: typeof raw?.mokDepth === 'number' ? raw.mokDepth : 0, prev: typeof raw?.prev === 'string' ? raw.prev : '' };
};

/** Push a new screen, or replace the current one. Usable outside React (see explore/proveIt.ts). */
export function pushRoute(next: AtlasRoute, mode: 'push' | 'replace' = 'push'): void {
  const url = `${window.location.pathname}${window.location.search}${routeHash(next)}`;
  const current = stateOf(window.history.state);
  if (mode === 'push') window.history.pushState({ mokDepth: current.mokDepth + 1, prev: window.location.hash } satisfies RouteState, '', url);
  else window.history.replaceState(current satisfies RouteState, '', url);
  window.dispatchEvent(new Event(CHANGE));
}

export function useAtlasRoute() {
  const [route, setRoute] = useState<AtlasRoute>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener(CHANGE, sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); window.removeEventListener(CHANGE, sync); };
  }, []);
  /** Push a new screen, or replace the current one. */
  const go = useCallback((next: AtlasRoute, mode: 'push' | 'replace' = 'push') => pushRoute(next, mode), []);
  /** Leave this screen for `target`: Back when that is where we came from, otherwise replace. */
  const leave = useCallback((target: AtlasRoute) => {
    const current = stateOf(window.history.state);
    if (current.mokDepth > 0 && current.prev === routeHash(target)) window.history.back();
    else go(target, 'replace');
  }, [go]);
  /** Return to the map, unwinding every screen opened on top of it. */
  const toMap = useCallback(() => {
    const { mokDepth } = stateOf(window.history.state);
    if (mokDepth > 0) window.history.go(-mokDepth);
    else go({ kind: 'map' }, 'replace');
  }, [go]);
  return { route, go, leave, toMap };
}
