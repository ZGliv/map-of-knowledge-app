import { describe, expect, it } from 'vitest';
import { projectCompletion } from './CompletionProjection';
import { NodeStore } from './NodeStore';
import {
  NavigationLayoutResolver,
  createPolygonMorph,
  interpolatePolygonMorph,
  interpolateVoronoiTransition,
  smoothNavigationProgress,
} from './NavigationMotion';
import { ProgressAggregator } from './ProgressAggregator';
import { SpatialLayoutEngine, polygonArea } from './SpatialLayoutEngine';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from './types';

const VIEWPORT = [[0, 0], [0, 700], [1000, 700], [1000, 0]] as const;
const PORTRAIT_VIEWPORT = [[0, 0], [0, 844], [390, 844], [390, 0]] as const;

const distance = (first: Point, second: Point): number => Math.hypot(
  second[0] - first[0],
  second[1] - first[1],
);

interface MotionExpectation {
  readonly engine: SpatialLayoutEngine;
  readonly parent: KnowledgeNode;
  readonly children: readonly KnowledgeNode[];
  readonly source: readonly RegionLayout[];
  readonly target: readonly RegionLayout[];
  readonly sourceClip: Polygon;
  readonly viewport: Polygon;
}

const expectCoherentMotion = ({
  engine,
  parent,
  children,
  source,
  target,
  sourceClip,
  viewport,
}: MotionExpectation): void => {
  const xs = viewport.map(([x]) => x);
  const ys = viewport.map(([, y]) => y);
  const viewportWidth = Math.max(...xs) - Math.min(...xs);
  const viewportHeight = Math.max(...ys) - Math.min(...ys);
  const viewportDiagonal = Math.hypot(viewportWidth, viewportHeight);
  const viewportArea = polygonArea(viewport);
  const clipMorph = createPolygonMorph(sourceClip, viewport);
  const sourceSites = source.map(({ site }) => site);
  const targetSites = target.map(({ site }) => site);
  const frames = Array.from(
    { length: 65 },
    (_, sample) => interpolateVoronoiTransition(
      engine,
      parent,
      children,
      clipMorph,
      sourceSites,
      targetSites,
      sample / 64,
    ),
  );

  frames.forEach((frame, sample) => {
    const clipArea = polygonArea(interpolatePolygonMorph(clipMorph, sample / 64));
    const frameArea = frame.reduce((sum, region) => sum + region.area, 0);
    expect(frameArea, `${parent.id} must remain a full partition`).toBeCloseTo(clipArea, 4);
  });

  for (let regionIndex = 0; regionIndex < source.length; regionIndex += 1) {
    const centroids = frames.map((frame) => frame[regionIndex].centroid);
    const areas = frames.map((frame) => frame[regionIndex].area);
    const endpointDistance = distance(centroids[0], centroids[centroids.length - 1]);
    const pathLength = centroids.slice(1).reduce(
      (total, point, index) => total + distance(centroids[index], point),
      0,
    );
    expect(
      (pathLength - endpointDistance) / viewportDiagonal,
      `${source[regionIndex].node.id} centroid path`,
    ).toBeLessThanOrEqual(0.05);

    const destinationVector: Point = [
      centroids[centroids.length - 1][0] - centroids[0][0],
      centroids[centroids.length - 1][1] - centroids[0][1],
    ];
    const destinationLength = Math.max(0.000001, Math.hypot(...destinationVector));
    let backwardTravel = 0;
    for (let index = 1; index < centroids.length; index += 1) {
      const step: Point = [
        centroids[index][0] - centroids[index - 1][0],
        centroids[index][1] - centroids[index - 1][1],
      ];
      const forwardDistance = (
        step[0] * destinationVector[0] + step[1] * destinationVector[1]
      ) / destinationLength;
      if (forwardDistance < 0) backwardTravel -= forwardDistance;
    }
    expect(
      backwardTravel,
      `${source[regionIndex].node.id} backward travel`,
    ).toBeLessThanOrEqual(Math.max(endpointDistance * 0.1, viewportDiagonal * 0.01));

    const netAreaChange = Math.abs(areas[areas.length - 1] - areas[0]);
    const direction = Math.sign(areas[areas.length - 1] - areas[0]);
    let areaBacktrack = 0;
    for (let index = 1; index < areas.length; index += 1) {
      const directedStep = (areas[index] - areas[index - 1]) * direction;
      if (directedStep < 0) areaBacktrack -= directedStep;
    }
    expect(
      areaBacktrack,
      `${source[regionIndex].node.id} area backtrack`,
    ).toBeLessThanOrEqual(Math.max(netAreaChange * 0.1, viewportArea * 0.005));
  }
};

describe('recursive spatial engines', () => {
  it('keeps 30 levels of production transitions free of centroid ricochet and area pulsing', () => {
    for (const viewport of [VIEWPORT, PORTRAIT_VIEWPORT]) {
      const store = new NodeStore();
      const engine = new SpatialLayoutEngine();
      const resolver = new NavigationLayoutResolver(store, engine);

      for (let seed = 0; seed < 12; seed += 1) {
        let visible = resolver.layoutForViewport(store.root, viewport);
        for (let depth = 0; depth < 30; depth += 1) {
          const selectedIndex = (seed * 7 + depth * 5 + depth * depth) % visible.length;
          const selected = visible[selectedIndex];
          const children = store.getChildren(selected.node);
          const source = engine.layout(selected.node, children, selected.polygon);
          const target = resolver.layoutForViewport(selected.node, viewport);
          expectCoherentMotion({
            engine,
            parent: selected.node,
            children,
            source,
            target,
            sourceClip: selected.polygon,
            viewport,
          });
          visible = target;
        }
      }
    }
  }, 15_000); // 720 multi-frame routes; allow concurrent browser verification on the host.

  it('uses a symmetric navigation curve and exactly reversible polygon paths', () => {
    const source = [[20, 20], [20, 280], [180, 320], [240, 90]] as const;
    const target = VIEWPORT;
    const forward = createPolygonMorph(source, target);
    const backward = createPolygonMorph(target, source);
    for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(smoothNavigationProgress(progress)).toBeCloseTo(
        1 - smoothNavigationProgress(1 - progress),
        12,
      );
      if (progress > 0 && progress < 1) {
        const forwardFrame = interpolatePolygonMorph(forward, progress);
        const backwardFrame = interpolatePolygonMorph(backward, 1 - progress);
        forwardFrame.forEach((point, index) => {
          expect(point[0]).toBeCloseTo(backwardFrame[index][0], 9);
          expect(point[1]).toBeCloseTo(backwardFrame[index][1], 9);
        });
      }
    }
  });

  it('resolves viewport geography independently of cache history', () => {
    const firstStore = new NodeStore();
    const firstEngine = new SpatialLayoutEngine();
    const firstResolver = new NavigationLayoutResolver(firstStore, firstEngine);
    const firstTarget = firstStore.ensurePath(12, 'deterministic-navigation');
    const seededBefore = firstEngine.layout(
      firstTarget,
      firstStore.getChildren(firstTarget),
      VIEWPORT,
    );
    const firstResolved = firstResolver.layoutForViewport(firstTarget, VIEWPORT);
    const seededAfter = firstEngine.layout(
      firstTarget,
      firstStore.getChildren(firstTarget),
      VIEWPORT,
    );

    const secondStore = new NodeStore();
    const secondEngine = new SpatialLayoutEngine();
    const secondResolver = new NavigationLayoutResolver(secondStore, secondEngine);
    const secondTarget = secondStore.ensurePath(12, 'deterministic-navigation');
    secondResolver.layoutForViewport(secondStore.root, VIEWPORT);
    const secondResolved = secondResolver.layoutForViewport(secondTarget, VIEWPORT);

    expect(seededAfter).toEqual(seededBefore);
    expect(secondResolved).toEqual(firstResolved);
  });

  it('lazily reaches depth 50 with one node model', () => {
    const store = new NodeStore();
    const engine = new SpatialLayoutEngine();
    const resolver = new NavigationLayoutResolver(store, engine);
    const node = store.ensurePath(50);
    expect(node.depth).toBe(50);
    expect(store.getPath(node)).toHaveLength(51);
    expect(resolver.layoutForViewport(node, PORTRAIT_VIEWPORT)).toHaveLength(
      store.getChildren(node).length,
    );
    expect(store.generatedCount).toBeLessThan(500);
  });

  it('produces a deterministic full-space partition', () => {
    const store = new NodeStore();
    const firstEngine = new SpatialLayoutEngine();
    const secondEngine = new SpatialLayoutEngine();
    const children = store.getChildren(store.root);
    const first = firstEngine.layout(store.root, children, VIEWPORT);
    const second = secondEngine.layout(store.root, children, VIEWPORT);
    expect(first.map(({ polygon }) => polygon)).toEqual(second.map(({ polygon }) => polygon));
    const coveredArea = first.reduce((sum, region) => sum + polygonArea(region.polygon), 0);
    expect(coveredArea).toBeCloseTo(700_000, 2);
  });

  it('recreates exact transition endpoints from stable sites', () => {
    const store = new NodeStore();
    const engine = new SpatialLayoutEngine();
    const children = store.getChildren(store.root);
    const layout = engine.layout(store.root, children, VIEWPORT);
    const recreated = engine.layoutFromSites(
      store.root,
      children,
      VIEWPORT,
      layout.map(({ site }) => site),
    );
    expect(recreated.map(({ polygon }) => polygon)).toEqual(layout.map(({ polygon }) => polygon));
    expect(engine.layoutUncached(store.root, children, VIEWPORT).map(({ polygon }) => polygon))
      .toEqual(layout.map(({ polygon }) => polygon));
  });

  it('propagates a deep completion to every ancestor', () => {
    const store = new NodeStore();
    const progress = new ProgressAggregator(store);
    const deepNode = store.ensurePath(25, 'completion-route');
    progress.toggle(deepNode);
    const path = store.getPath(deepNode);
    expect(progress.progress(deepNode)).toBe(1);
    for (const ancestor of path.slice(0, -1)) {
      expect(progress.progress(ancestor)).toBeGreaterThan(0);
      expect(progress.progress(ancestor)).toBeLessThan(1);
    }
  });

  it('keeps completion coverage prefix-free and queryable', () => {
    const store = new NodeStore();
    const progress = new ProgressAggregator(store);
    const deepNode = store.ensurePath(12, 'coverage-route');
    const descendant = store.getChildren(deepNode)[0];

    progress.toggle(deepNode);
    expect(progress.snapshot()).toEqual([deepNode.id]);
    expect(progress.isCovered(deepNode)).toBe(true);
    expect(progress.isCovered(descendant)).toBe(true);
    expect(progress.isCovered(store.root)).toBe(false);

    progress.toggle(store.root);
    expect(progress.snapshot()).toEqual([store.root.id]);
    expect(progress.isCovered(deepNode)).toBe(true);
  });

  it('projects a depth-50 completion as a stable root pixel and resolves it nearby', () => {
    const store = new NodeStore();
    const engine = new SpatialLayoutEngine();
    const target = store.ensurePath(50, 'projection-route');
    const rootRegions = engine.layout(store.root, store.getChildren(store.root), VIEWPORT);
    const rootProjection = projectCompletion({
      store,
      layoutEngine: engine,
      scope: store.root,
      clip: VIEWPORT,
      completedId: target.id,
      firstRegions: rootRegions,
    });

    expect(rootProjection).not.toBeNull();
    expect(rootProjection?.collapsed).toBe(true);
    expect(rootProjection?.relativeDepth).toBe(50);
    expect(rootProjection?.centroid.every(Number.isFinite)).toBe(true);
    expect(rootProjection?.centroid[0]).toBeGreaterThanOrEqual(0);
    expect(rootProjection?.centroid[0]).toBeLessThanOrEqual(1000);
    expect(rootProjection?.centroid[1]).toBeGreaterThanOrEqual(0);
    expect(rootProjection?.centroid[1]).toBeLessThanOrEqual(700);

    const nearbyScope = store.getPath(target)[47];
    const nearbyRegions = engine.layout(nearbyScope, store.getChildren(nearbyScope), VIEWPORT);
    const nearbyProjection = projectCompletion({
      store,
      layoutEngine: engine,
      scope: nearbyScope,
      clip: VIEWPORT,
      completedId: target.id,
      firstRegions: nearbyRegions,
    });

    expect(nearbyProjection?.collapsed).toBe(false);
    expect(nearbyProjection?.area).toBeGreaterThan(rootProjection?.estimatedArea ?? 0);
  });

  it('uses the same spatial address when the view is rebased into a child', () => {
    const store = new NodeStore();
    const engine = new SpatialLayoutEngine();
    const target = store.ensurePath(3, 'endpoint-route');
    const path = store.getPath(target);
    const rootRegions = engine.layout(store.root, store.getChildren(store.root), VIEWPORT);
    const firstRegion = rootRegions.find(({ node }) => node.id === path[1].id);
    expect(firstRegion).toBeDefined();
    if (!firstRegion) return;

    const rootProjection = projectCompletion({
      store,
      layoutEngine: engine,
      scope: store.root,
      clip: VIEWPORT,
      completedId: target.id,
      firstRegions: rootRegions,
    });
    const childRegions = engine.layout(path[1], store.getChildren(path[1]), firstRegion.polygon);
    const rebasedProjection = projectCompletion({
      store,
      layoutEngine: engine,
      scope: path[1],
      clip: firstRegion.polygon,
      completedId: target.id,
      firstRegions: childRegions,
    });

    expect(rebasedProjection?.polygon).toEqual(rootProjection?.polygon);
    expect(rebasedProjection?.centroid).toEqual(rootProjection?.centroid);
  });
});
