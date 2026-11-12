import type { CompletionProjection } from './CompletionProjection';
import type { NodeStore } from './NodeStore';
import { blendWeights, polygonCentroid, type SpatialLayoutEngine } from './SpatialLayoutEngine';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from './types';

const EPSILON = 0.0000001;
const TAU = Math.PI * 2;
const DEFAULT_RAY_COUNT = 24;
const DESTINATION_RELAXATION = 0.18;
const NAVIGATION_LAYOUT_VERSION = 'radial-lloyd-18-v1';

export interface PolygonMorph {
  readonly source: Polygon;
  readonly target: Polygon;
  readonly sourceRing: Polygon;
  readonly targetRing: Polygon;
}

export interface CompletionMorph {
  readonly source: CompletionProjection;
  readonly target: CompletionProjection;
  readonly polygon: PolygonMorph;
}

export interface NavigationDestination {
  readonly regions: readonly RegionLayout[];
  readonly sites: readonly Point[];
}

export interface RegionDetailMorph {
  readonly regionId: string;
  readonly parent: KnowledgeNode;
  readonly children: readonly KnowledgeNode[];
  readonly sourceClip: Polygon;
  readonly targetClip: Polygon;
  readonly source: readonly RegionLayout[];
  readonly target: readonly RegionLayout[];
}

const cross = ([firstX, firstY]: Point, [secondX, secondY]: Point): number => (
  firstX * secondY - firstY * secondX
);

const distanceBetween = (first: Point, second: Point): number => Math.hypot(
  second[0] - first[0],
  second[1] - first[1],
);

const normalizeAngle = (angle: number): number => {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
};

const uniqueAngles = (angles: readonly number[]): readonly number[] => {
  const sorted = [...angles].map(normalizeAngle).sort((first, second) => first - second);
  const result: number[] = [];
  for (const angle of sorted) {
    const previous = result[result.length - 1];
    if (previous === undefined || Math.abs(angle - previous) > EPSILON) result.push(angle);
  }
  if (result.length > 1 && TAU - result[result.length - 1] + result[0] <= EPSILON) result.pop();
  return result;
};

const rayBoundaryPoint = (polygon: Polygon, center: Point, angle: number): Point => {
  const direction: Point = [Math.cos(angle), Math.sin(angle)];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edge: Point = [end[0] - start[0], end[1] - start[1]];
    const fromCenter: Point = [start[0] - center[0], start[1] - center[1]];
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) <= EPSILON) continue;
    const distance = cross(fromCenter, edge) / denominator;
    const edgeProgress = cross(fromCenter, direction) / denominator;
    if (
      distance >= -EPSILON
      && edgeProgress >= -EPSILON
      && edgeProgress <= 1 + EPSILON
    ) {
      nearestDistance = Math.min(nearestDistance, Math.max(0, distance));
    }
  }

  if (!Number.isFinite(nearestDistance)) return center;
  return [
    center[0] + direction[0] * nearestDistance,
    center[1] + direction[1] * nearestDistance,
  ];
};

const vertexAngles = (polygon: Polygon, center: Point): readonly number[] => polygon.map(
  ([x, y]) => Math.atan2(y - center[1], x - center[0]),
);

export const createPolygonMorph = (
  source: Polygon,
  target: Polygon,
  minimumRayCount = DEFAULT_RAY_COUNT,
): PolygonMorph => {
  if (source.length < 3 || target.length < 3) {
    throw new Error('Navigation polygon morphs require at least three points per endpoint');
  }
  const sourceCenter = polygonCentroid(source);
  const targetCenter = polygonCentroid(target);
  const rayCount = Math.max(3, minimumRayCount);
  const uniformAngles = Array.from(
    { length: rayCount },
    (_, index) => (index / rayCount) * TAU,
  );
  const angles = uniqueAngles([
    ...uniformAngles,
    ...vertexAngles(source, sourceCenter),
    ...vertexAngles(target, targetCenter),
  ]);
  return {
    source,
    target,
    sourceRing: angles.map((angle) => rayBoundaryPoint(source, sourceCenter, angle)),
    targetRing: angles.map((angle) => rayBoundaryPoint(target, targetCenter, angle)),
  };
};

export const interpolatePoint = (source: Point, target: Point, progress: number): Point => [
  source[0] + (target[0] - source[0]) * progress,
  source[1] + (target[1] - source[1]) * progress,
];

export const transportSites = (
  sourceSites: readonly Point[],
  sourceClip: Polygon,
  targetClip: Polygon,
  maximumRadius = 0.9,
): readonly Point[] => {
  const sourceCenter = polygonCentroid(sourceClip);
  const targetCenter = polygonCentroid(targetClip);
  return sourceSites.map((site) => {
    const angle = Math.atan2(site[1] - sourceCenter[1], site[0] - sourceCenter[0]);
    const direction: Point = [Math.cos(angle), Math.sin(angle)];
    const sourceBoundary = rayBoundaryPoint(sourceClip, sourceCenter, angle);
    const targetBoundary = rayBoundaryPoint(targetClip, targetCenter, angle);
    const sourceRadius = Math.max(EPSILON, distanceBetween(sourceCenter, sourceBoundary));
    const targetRadius = distanceBetween(targetCenter, targetBoundary);
    const normalizedRadius = Math.min(
      maximumRadius,
      distanceBetween(sourceCenter, site) / sourceRadius,
    );
    return [
      targetCenter[0] + direction[0] * targetRadius * normalizedRadius,
      targetCenter[1] + direction[1] * targetRadius * normalizedRadius,
    ];
  });
};

export const createNavigationDestination = (
  layoutEngine: SpatialLayoutEngine,
  parent: KnowledgeNode,
  children: readonly KnowledgeNode[],
  sourceSites: readonly Point[],
  sourceClip: Polygon,
  targetClip: Polygon,
): NavigationDestination => {
  const radialSites = transportSites(sourceSites, sourceClip, targetClip);
  const radialRegions = layoutEngine.layoutFromSites(parent, children, targetClip, radialSites);
  const sites = radialSites.map((site, index) => {
    const centroid = radialRegions[index]?.centroid;
    if (!centroid?.every(Number.isFinite)) return site;
    return interpolatePoint(site, centroid, DESTINATION_RELAXATION);
  });
  return {
    sites,
    regions: layoutEngine.layoutFromSites(parent, children, targetClip, sites),
  };
};

const polygonSignature = (polygon: Polygon): string => polygon
  .map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`)
  .join(';');

export class NavigationLayoutResolver {
  private readonly cache = new Map<string, readonly RegionLayout[]>();

  constructor(
    private readonly store: NodeStore,
    private readonly layoutEngine: SpatialLayoutEngine,
  ) {}

  layoutForViewport(
    node: KnowledgeNode,
    viewport: Polygon,
  ): readonly RegionLayout[] {
    const viewportKey = polygonSignature(viewport);
    const path = this.store.getPath(node);
    const root = path[0];
    let visible = this.layoutEngine.layout(root, this.store.getChildren(root), viewport);

    for (let index = 1; index < path.length; index += 1) {
      const current = path[index];
      const parent = path[index - 1];
      const children = this.store.getChildren(current);
      const parentRegion = visible.find((region) => region.node.id === current.id);
      if (!parentRegion) throw new Error(`Missing region ${current.id} inside ${parent.id}`);
      const key = [
        NAVIGATION_LAYOUT_VERSION,
        current.id,
        children.map(({ id }) => id).join(','),
        viewportKey,
        polygonSignature(parentRegion.polygon),
      ].join('|');
      const cached = this.cache.get(key);
      if (cached) {
        visible = cached;
        continue;
      }

      const source = this.layoutEngine.layout(current, children, parentRegion.polygon);
      const destination = createNavigationDestination(
        this.layoutEngine,
        current,
        children,
        source.map(({ site }) => site),
        parentRegion.polygon,
        viewport,
      );
      if(this.cache.size>=384)this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, destination.regions);
      visible = destination.regions;
    }
    return visible;
  }
}

export const interpolatePolygonMorph = (morph: PolygonMorph, progress: number): Polygon => {
  if (progress <= 0) return morph.source;
  if (progress >= 1) return morph.target;
  return morph.sourceRing.map((point, index) => (
    interpolatePoint(point, morph.targetRing[index], progress)
  ));
};

export const interpolateVoronoiTransition = (
  layoutEngine: SpatialLayoutEngine,
  parent: KnowledgeNode,
  children: readonly KnowledgeNode[],
  clipMorph: PolygonMorph,
  sourceSites: readonly Point[],
  targetSites: readonly Point[],
  progress: number,
  sourceWeights?: readonly number[],
  targetWeights?: readonly number[],
): readonly RegionLayout[] => layoutEngine.layoutFromSites(
  parent,
  children,
  interpolatePolygonMorph(clipMorph, progress),
  progress <= 0 ? sourceSites : progress >= 1 ? targetSites
    : sourceSites.map((site, index) => interpolatePoint(site, targetSites[index], progress)),
  sourceWeights && targetWeights
    ? sourceWeights.map((weight, index) => weight + (targetWeights[index] - weight) * Math.max(0, Math.min(1, progress)))
    : undefined,
);

/** Capture the same nested cells MapDetails uses at rest, before animation starts. */
export const createRegionDetailMorphs = (
  layoutEngine: SpatialLayoutEngine,
  store: NodeStore,
  sourceRegions: readonly RegionLayout[],
  targetRegions: readonly RegionLayout[],
): readonly RegionDetailMorph[] => sourceRegions.map((sourceRegion, index) => {
  const targetRegion = targetRegions[index];
  if (sourceRegion.node.id !== targetRegion?.node.id) throw new Error('Navigation detail endpoints must have matching regions');
  const parent = sourceRegion.node;
  const children = store.getChildren(parent);
  return {
    regionId: parent.id, parent, children,
    sourceClip: sourceRegion.polygon,
    targetClip: targetRegion.polygon,
    source: layoutEngine.layout(parent, children, sourceRegion.polygon),
    target: layoutEngine.layout(parent, children, targetRegion.polygon),
  };
});

/** Transport established sites inside each moving cell instead of reseeding its contours. */
export const interpolateRegionDetails = (
  layoutEngine: SpatialLayoutEngine,
  morphs: readonly RegionDetailMorph[],
  regions: readonly RegionLayout[],
  progress: number,
): ReadonlyMap<string, readonly RegionLayout[]> => new Map(morphs.map((morph, index) => {
  if (progress <= 0) return [morph.regionId, morph.source];
  if (progress >= 1) return [morph.regionId, morph.target];
  const clip = regions[index].polygon;
  const sourceSites = transportSites(morph.source.map(({site}) => site), morph.sourceClip, clip, 1);
  const targetSites = transportSites(morph.target.map(({site}) => site), morph.targetClip, clip, 1);
  const sites = sourceSites.map((site, siteIndex) => interpolatePoint(site, targetSites[siteIndex], progress));
  return [morph.regionId, layoutEngine.layoutFromSites(morph.parent, morph.children, clip, sites, blendWeights(morph.source, morph.target, progress))];
}));

export const createCompletionMorphs = (
  sourceProjections: readonly CompletionProjection[],
  targetProjections: readonly CompletionProjection[],
): readonly CompletionMorph[] => {
  const sourcesById = new Map(sourceProjections.map((projection) => [projection.nodeId, projection]));
  const targetsById = new Map(targetProjections.map((projection) => [projection.nodeId, projection]));
  const ids = [
    ...sourceProjections.map(({ nodeId }) => nodeId),
    ...targetProjections
      .map(({ nodeId }) => nodeId)
      .filter((nodeId) => !sourcesById.has(nodeId)),
  ];
  return ids.map((nodeId) => {
    const source = sourcesById.get(nodeId) ?? targetsById.get(nodeId);
    const target = targetsById.get(nodeId) ?? sourcesById.get(nodeId);
    if (!source || !target) throw new Error(`Missing completion endpoint for ${nodeId}`);
    return { source, target, polygon: createPolygonMorph(source.polygon, target.polygon, 12) };
  });
};

export const interpolateCompletionMorphs = (
  morphs: readonly CompletionMorph[],
  progress: number,
): readonly CompletionProjection[] => morphs.map((morph) => {
  if (progress <= 0) return morph.source;
  if (progress >= 1) return morph.target;
  const useTargetDetail = progress >= 0.5;
  return {
    nodeId: morph.source.nodeId,
    polygon: interpolatePolygonMorph(morph.polygon, progress),
    centroid: interpolatePoint(morph.source.centroid, morph.target.centroid, progress),
    area: morph.source.area + (morph.target.area - morph.source.area) * progress,
    estimatedArea: morph.source.estimatedArea
      + (morph.target.estimatedArea - morph.source.estimatedArea) * progress,
    relativeDepth: useTargetDetail ? morph.target.relativeDepth : morph.source.relativeDepth,
    remainingDepth: useTargetDetail ? morph.target.remainingDepth : morph.source.remainingDepth,
    collapsed: useTargetDetail ? morph.target.collapsed : morph.source.collapsed,
  };
});

export const smoothNavigationProgress = (progress: number): number => {
  const clamped = Math.min(1, Math.max(0, progress));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
};
