// Something spreading along routes: by sea, by river or by road, each at its own pace. Pure: the
// spread case engine (cases/engines.ts) computes arrival days from it.
//
// Every route is walked as drawn (its waypoints let a ship sail around land), measured on the
// globe, and travelled at the pace of its kind. A place falls sick when the fastest chain of routes
// from the origin reaches it (Dijkstra's shortest paths, by days).

export type Pt = [number, number];
export type Via = 'sea' | 'river' | 'road';

/** Great-circle kilometres between two [lat, lon] points. */
export function km(a: Pt, b: Pt): number {
  const r = Math.PI / 180, [lat1, lon1] = a, [lat2, lon2] = b;
  const h = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Kilometres along a drawn path. */
export const pathKm = (points: Pt[]): number => points.slice(1).reduce((sum, p, i) => sum + km(points[i], p), 0);

export interface SpreadPlace { id: string; lat: number; lon: number }
export interface SpreadRoute { from: string; to: string; via: Via; /** Waypoints between the ends, [lat, lon]. */ path?: Pt[] }

/** A route's points, end to end. */
export function routePoints(route: SpreadRoute, places: readonly SpreadPlace[]): Pt[] {
  const at = (id: string): Pt => { const p = places.find(x => x.id === id); if (!p) throw new Error(`no place "${id}"`); return [p.lat, p.lon]; };
  return [at(route.from), ...(route.path ?? []), at(route.to)];
}

export interface Arrival { days: number; /** The place it came from, or null for the origin. */ from: string | null; via: Via | null }

/** Days until each place is reached from `origin` (Infinity when no route leads there). Routes run both ways. */
export function arrivals(places: readonly SpreadPlace[], routes: readonly SpreadRoute[], origin: string, speeds: Partial<Record<Via, number>>): Record<string, Arrival> {
  const out: Record<string, Arrival> = {};
  for (const p of places) out[p.id] = { days: Infinity, from: null, via: null };
  if (!out[origin]) throw new Error(`no place "${origin}"`);
  out[origin] = { days: 0, from: null, via: null };
  const edges = routes.map(r => {
    const speed = speeds[r.via];
    if (!(speed && speed > 0)) throw new Error(`no pace for ${r.via}`);
    return { a: r.from, b: r.to, via: r.via, days: pathKm(routePoints(r, places)) / speed };
  });
  const done = new Set<string>();
  for (;;) {
    let next: string | null = null;
    for (const p of places) if (!done.has(p.id) && Number.isFinite(out[p.id].days) && (next === null || out[p.id].days < out[next].days)) next = p.id;
    if (next === null) break;
    done.add(next);
    for (const e of edges) {
      const other = e.a === next ? e.b : e.b === next ? e.a : null;
      if (!other || done.has(other)) continue;
      const days = out[next].days + e.days;
      if (days < out[other].days) out[other] = { days, from: next, via: e.via };
    }
  }
  return out;
}
