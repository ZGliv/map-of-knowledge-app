import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { sampleLeaf } from '../core/sampleTerritories';
import { projectCompletions } from './CompletionProjection';
import {
  NavigationLayoutResolver, createPolygonMorph, createRegionDetailMorphs,
  interpolateRegionDetails, interpolateVoronoiTransition,
  createCompletionMorphs, interpolateCompletionMorphs,
} from './NavigationMotion';
import { SpatialLayoutEngine, polygonArea } from './SpatialLayoutEngine';
import type { Polygon } from './types';

describe('production atlas transition endpoints', () => {
  it.each([[390, 490], [1440, 594], [844, 196]])('keeps forward/reverse cells, contours and completed pieces continuous at %i×%i', (width, height) => {
    const viewport: Polygon = [[0, 0], [0, height], [width, height], [width, 0]];
    const engine = new SpatialLayoutEngine();
    const resolver = new NavigationLayoutResolver(catalog, engine);
    const completedId = sampleLeaf('technology');
    const path = catalog.getPath(catalog.get(completedId)!);
    for (let depth = 1; depth < path.length - 1; depth++) {
      const child = path[depth];
      const parentRegions = resolver.layoutForViewport(path[depth - 1], viewport);
      const parentRegion = parentRegions.find(region => region.node.id === child.id)!;
      const children = catalog.getChildren(child);
      const source = engine.layout(child, children, parentRegion.polygon);
      const target = resolver.layoutForViewport(child, viewport);
      const forward = createPolygonMorph(parentRegion.polygon, viewport);
      const reverse = createPolygonMorph(viewport, parentRegion.polygon);
      const sites = (regions: typeof source) => regions.map(region => region.site);
      const frame = (progress: number) => interpolateVoronoiTransition(engine, child, children, forward, sites(source), sites(target), progress);
      const detailMorphs = createRegionDetailMorphs(engine, catalog, source, target);
      expect(frame(0)).toEqual(source);
      expect(frame(1)).toEqual(target);
      for (const progress of [0, 0.001, 0.25, 0.5, 0.75, 0.999, 1]) {
        const regions = frame(progress);
        const back = interpolateVoronoiTransition(engine, child, children, reverse, sites(target), sites(source), 1 - progress);
        const details = interpolateRegionDetails(engine, detailMorphs, regions, progress);
        regions.forEach((region, index) => {
          expect(region.centroid[0]).toBeCloseTo(back[index].centroid[0], 7);
          expect(region.centroid[1]).toBeCloseTo(back[index].centroid[1], 7);
          const cells = details.get(region.node.id)!;
          if (cells.length) {
            expect(cells.every(cell => cell.polygon.length >= 3 && cell.centroid.every(Number.isFinite))).toBe(true);
            expect(cells.reduce((sum, cell) => sum + cell.area, 0)).toBeCloseTo(polygonArea(region.polygon), 5);
          }
          if (progress === 0 || progress === 1) {
            expect(cells).toEqual(engine.layout(region.node, catalog.getChildren(region.node), region.polygon));
          }
        });
      }
      const projections = (clip: Polygon, firstRegions: typeof source) => projectCompletions({store: catalog, layoutEngine: engine, scope: child, clip, firstRegions, completedIds: [completedId]});
      const start = projections(parentRegion.polygon, source);
      const finish = projections(viewport, target);
      const completionMorphs = createCompletionMorphs(start, finish);
      expect(interpolateCompletionMorphs(completionMorphs, 0)).toEqual(start);
      expect(interpolateCompletionMorphs(completionMorphs, 1)).toEqual(finish);
    }
  });
});
