// The world's land, loaded once and shared by every map that draws coastlines (Natural Earth via
// world-atlas, public domain).
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landUrl from 'world-atlas/land-50m.json?url';

let landCache: GeoPermissibleObjects | null = null;

/** The land, if it has already loaded. */
export const cachedLand = (): GeoPermissibleObjects | null => landCache;

export async function loadLand(): Promise<GeoPermissibleObjects> {
  if (landCache) return landCache;
  const topo = await (await fetch(landUrl)).json();
  landCache = feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects;
  return landCache;
}
