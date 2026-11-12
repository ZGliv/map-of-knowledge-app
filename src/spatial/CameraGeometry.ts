import type { CompletionProjection } from './CompletionProjection';
import { interpolateCompletionMorphs, interpolatePoint, transportSites, type CompletionMorph } from './NavigationMotion';
import { polygonArea, polygonCentroid } from './SpatialLayoutEngine';
import type { Point, Polygon, RegionLayout } from './types';

const EPSILON = 1e-8;
const edgeSide = (a: Point, b: Point, point: Point): number => (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);

/** Clip display geometry only; camera motion and ownership retain full world cells. */
export function clipCameraRegions(regions: readonly RegionLayout[], viewport: Polygon): readonly RegionLayout[] {
  if (viewport.length < 3 || polygonArea(viewport) <= EPSILON) return [];
  const signedArea = viewport.reduce((sum, point, index) => {
    const next = viewport[(index + 1) % viewport.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  const direction = Math.sign(signedArea);
  return regions.flatMap(region => {
    let polygon = region.polygon;
    if (polygon.length < 3) return [];
    let changed = false;
    for (let edge = 0; edge < viewport.length && polygon.length; edge++) {
      const a = viewport[edge], b = viewport[(edge + 1) % viewport.length];
      if (polygon.every(point => direction * edgeSide(a, b, point) >= -EPSILON)) continue;
      changed = true;
      const clipped: Point[] = [];
      for (let index = 0; index < polygon.length; index++) {
        const previous = polygon[(index + polygon.length - 1) % polygon.length], current = polygon[index];
        const from = direction * edgeSide(a, b, previous), to = direction * edgeSide(a, b, current);
        if ((from >= -EPSILON) !== (to >= -EPSILON)) {
          clipped.push(interpolatePoint(previous, current, Math.max(0, Math.min(1, from / (from - to)))));
        }
        if (to >= -EPSILON) clipped.push(current);
      }
      polygon = clipped;
    }
    if (!changed) return [region];
    const area = polygonArea(polygon);
    if (polygon.length < 3 || area <= EPSILON) return [];
    const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return [{...region, polygon, area, centroid: polygonCentroid(polygon), bounds: {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y}}];
  });
}

/** Endpoints and current owners must all use the same, unclipped world boundary. */
export function interpolateOwnedCompletionMorphs(
  morphs: readonly CompletionMorph[],
  sourceOwners: readonly RegionLayout[],
  targetOwners: readonly RegionLayout[],
  currentOwners: readonly RegionLayout[],
  progress: number,
): readonly CompletionProjection[] {
  if (progress <= 0) return morphs.map(morph => morph.source);
  if (progress >= 1) return morphs.map(morph => morph.target);
  const owns = (region: RegionLayout, nodeId: string) => nodeId === region.node.id || nodeId.startsWith(region.node.id + '.');
  return morphs.map(morph => {
    const nodeId = morph.source.nodeId;
    const source = sourceOwners.find(region => owns(region, nodeId));
    const target = targetOwners.find(region => owns(region, nodeId));
    const current = currentOwners.find(region => owns(region, nodeId));
    if (!source || !target || !current) throw new Error(`Missing navigation owner for completion ${nodeId}`);
    const sourceRing = transportSites(morph.polygon.sourceRing, source.polygon, current.polygon, 1);
    const targetRing = transportSites(morph.polygon.targetRing, target.polygon, current.polygon, 1);
    const polygon = sourceRing.map((point, index) => interpolatePoint(point, targetRing[index], progress));
    const sourceCenter = transportSites([morph.source.centroid], source.polygon, current.polygon, 1)[0];
    const targetCenter = transportSites([morph.target.centroid], target.polygon, current.polygon, 1)[0];
    return {
      ...interpolateCompletionMorphs([morph], progress)[0],
      polygon,
      centroid: interpolatePoint(sourceCenter, targetCenter, progress),
      area: polygonArea(polygon),
    };
  });
}
