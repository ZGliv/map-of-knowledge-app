import { createRandom } from './deterministic';
import type { NodeStore } from './NodeStore';
import {
  polygonArea,
  polygonCentroid,
  type SpatialLayoutEngine,
} from './SpatialLayoutEngine';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from './types';

// Crossing the LOD boundary can move the unresolved anchor within its final
// parent cell. Keep that cell well below one CSS pixel so any change remains
// visually continuous while avoiding unstable sub-pixel Voronoi work.
const MIN_PROJECTABLE_AREA = 0.18;
const MIN_PROJECTABLE_SPAN = 0.35;

export interface CompletionProjection {
  readonly nodeId: string;
  readonly polygon: Polygon;
  readonly centroid: Point;
  readonly area: number;
  readonly estimatedArea: number;
  readonly relativeDepth: number;
  readonly remainingDepth: number;
  readonly collapsed: boolean;
}

interface ProjectionOptions {
  readonly store: NodeStore;
  readonly layoutEngine: SpatialLayoutEngine;
  readonly scope: KnowledgeNode;
  readonly clip: Polygon;
  readonly completedId: string;
  readonly firstRegions?: readonly RegionLayout[];
  readonly dynamic?: boolean;
}

const routeFrom = (store:NodeStore, scopeId:string, completedId:string): readonly number[]|null => {
 const target=store.get(completedId);
 if(!target)return null;
 const path=store.getPath(target); const scopeIndex=path.findIndex(n=>n.id===scopeId);
 return scopeIndex<0?null:path.slice(scopeIndex+1).map(n=>n.index);
};

const minimumSpan = (polygon: Polygon): number => {
  if (polygon.length === 0) return 0;
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  return Math.min(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
};

// Voronoi cells are convex, so a weighted average of their vertices is always
// inside the cell. This preserves a stable sub-pixel address after we stop
// recursively constructing geometry that is too small to render accurately.
const deepAnchor = (polygon: Polygon, seed: string): Point => {
  if (polygon.length < 3) return polygonCentroid(polygon);
  const random = createRandom(`${seed}:completion-anchor`);
  let totalWeight = 0;
  let x = 0;
  let y = 0;
  for (const [pointX, pointY] of polygon) {
    const weight = 0.4 + random();
    totalWeight += weight;
    x += pointX * weight;
    y += pointY * weight;
  }
  const [centerX, centerY] = polygonCentroid(polygon);
  return [
    centerX * 0.42 + (x / totalWeight) * 0.58,
    centerY * 0.42 + (y / totalWeight) * 0.58,
  ];
};

const estimateRemainingArea = (
  store: NodeStore,
  start: KnowledgeNode,
  route: readonly number[],
  startArea: number,
): number => {
  let cursor = start;
  let area = startArea;
  for (const childIndex of route) {
    const children = store.getChildren(cursor);
    const child = children[childIndex];
    if (!child || children.length === 0) return 0;
    area /= children.length;
    cursor = child;
  }
  return area;
};

export const projectCompletion = ({
  store,
  layoutEngine,
  scope,
  clip,
  completedId,
  firstRegions,
  dynamic = false,
}: ProjectionOptions): CompletionProjection | null => {
  const route = routeFrom(store, scope.id, completedId);
  if (!route || route.length === 0) return null;

  let cursor = scope;
  let polygon = clip;

  for (let step = 0; step < route.length; step += 1) {
    const childIndex = route[step];
    const children = store.getChildren(cursor);
    const child = children[childIndex];
    if (!child) return null;

    const candidates = step === 0 && firstRegions
      ? firstRegions
      : dynamic
        ? layoutEngine.layoutUncached(cursor, children, polygon)
        : layoutEngine.layout(cursor, children, polygon);
    const region = candidates.find(({ node }) => node.id === child.id);
    if (!region || region.polygon.length < 3) return null;

    polygon = region.polygon;
    cursor = child;
    const remainingRoute = route.slice(step + 1);
    const area = region.area;
    const tooSmallToRecurse = (
      remainingRoute.length > 0
      && (area <= MIN_PROJECTABLE_AREA || minimumSpan(polygon) <= MIN_PROJECTABLE_SPAN)
    );

    if (tooSmallToRecurse) {
      return {
        nodeId: completedId,
        polygon,
        centroid: deepAnchor(polygon, completedId),
        area,
        estimatedArea: estimateRemainingArea(store, cursor, remainingRoute, area),
        relativeDepth: route.length,
        remainingDepth: remainingRoute.length,
        collapsed: true,
      };
    }
  }

  const area = polygonArea(polygon);
  return {
    nodeId: completedId,
    polygon,
    centroid: polygonCentroid(polygon),
    area,
    estimatedArea: area,
    relativeDepth: route.length,
    remainingDepth: 0,
    collapsed: false,
  };
};

export const projectCompletions = (
  options: Omit<ProjectionOptions, 'completedId'> & { readonly completedIds: readonly string[] },
): readonly CompletionProjection[] => options.completedIds
  .map((completedId) => projectCompletion({ ...options, completedId }))
  .filter((projection): projection is CompletionProjection => projection !== null);
