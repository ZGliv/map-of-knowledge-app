import { describe, expect, it } from 'vitest';
import { CatalogStore, conceptNodeId, FOUNDATIONS_ID, MATH_ID, objectiveNodeId } from './catalog';
import { OBJECTIVES } from './curriculum';
import { NavigationLayoutResolver } from '../spatial/NavigationMotion';
import { projectCompletion } from '../spatial/CompletionProjection';
import { polygonArea, SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { Polygon } from '../spatial/types';

const portrait: Polygon = [[0, 0], [0, 844], [390, 844], [390, 0]];

describe('finite learner catalog', () => {
  it('has eight real top-level regions, closed parent links, one home per objective and finite leaves', () => {
    const store = new CatalogStore();
    expect(store.getChildren(store.root)).toHaveLength(8);
    const nodes = store.all();
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
    for (const node of nodes) {
      const path = store.getPath(node);
      expect(path[0].id).toBe(store.root.id);
      expect(new Set(path.map(step => step.id)).size).toBe(path.length);
      expect(path.at(-1)?.id).toBe(node.id);
      expect(path.length).toBe(node.depth + 1);
      for (const child of store.getChildren(node)) {
        expect(child.parentId).toBe(node.id);
        expect(store.get(child.id)).toBe(child);
      }
    }
    expect(nodes.filter(node => node.objective)).toHaveLength(8);
    for (const objective of OBJECTIVES) {
      const node = store.get(objectiveNodeId(objective.key))!;
      expect(node.objective).toBe(objective.key);
      expect(node.parentId).toBe(conceptNodeId(objective.key));
      expect(store.getPath(node).map(step => step.id)).toContain(FOUNDATIONS_ID);
      expect(store.getChildren(node)).toHaveLength(0);
    }
    const initial = store.generatedCount;
    for (let repeat = 0; repeat < 20; repeat++) nodes.forEach(node => store.getChildren(node));
    expect(store.generatedCount).toBe(initial);
    expect(nodes.filter(node => !node.id.startsWith(`${MATH_ID}.`)).every(node => !node.objective)).toBe(true);
  });

  it('restores exactly the narrow objective parcel and can project it back to the world', () => {
    const store = new CatalogStore();
    const engine = new SpatialLayoutEngine();
    const resolver = new NavigationLayoutResolver(store, engine);
    for (const objective of OBJECTIVES) {
      const objectiveId = objectiveNodeId(objective.key);
      const projection = projectCompletion({ store, layoutEngine: engine, scope: store.root, clip: portrait, completedId: objectiveId });
      expect(projection?.nodeId).toBe(objectiveId);
      expect(projection?.relativeDepth).toBe(4);
      expect(projection?.centroid.every(Number.isFinite)).toBe(true);
      const concept = store.get(conceptNodeId(objective.key))!;
      const regions = resolver.layoutForViewport(concept, portrait);
      const parcel = regions.find(region => region.node.id === objectiveId)!;
      expect(parcel.area).toBeGreaterThan(0);
      expect(parcel.area).toBeLessThan(polygonArea(portrait));
    }
  });

  it('reconstructs the same real route and geometry after layout caches have evicted it', () => {
    const store = new CatalogStore();
    // A small layout cache, so the churn below really evicts the route.
    const engine = new SpatialLayoutEngine(384);
    const resolver = new NavigationLayoutResolver(store, engine);
    const target = store.get(conceptNodeId('quarter-unit-path'))!;
    const before = resolver.layoutForViewport(target, portrait);
    // Distinct viewport sizes churn the caches without inventing learner nodes.
    for (let width = 400; width < 540; width++) {
      const viewport: Polygon = [[0, 0], [0, 844], [width, 844], [width, 0]];
      resolver.layoutForViewport(target, viewport);
    }
    const engineCache = (engine as unknown as { cache: Map<string, unknown> }).cache;
    const resolverCache = (resolver as unknown as { cache: Map<string, unknown> }).cache;
    expect(engineCache.size).toBeLessThanOrEqual(384);
    expect(resolverCache.size).toBeLessThanOrEqual(384);
    const revisited = resolver.layoutForViewport(target, portrait);
    expect(revisited).not.toBe(before); // Recomputed, not an accidentally retained reference.
    expect(revisited).toEqual(before);
    const restoredStore = new CatalogStore();
    const restored = new NavigationLayoutResolver(restoredStore, new SpatialLayoutEngine()).layoutForViewport(restoredStore.get(target.id)!, portrait);
    expect(restored).toEqual(before);
    expect(restoredStore.getPath(restoredStore.get(target.id)!).map(node => node.id)).toEqual(store.getPath(target).map(node => node.id));
  });
});
