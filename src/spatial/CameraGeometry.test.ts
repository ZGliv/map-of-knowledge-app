import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { sampleLeaf } from '../core/sampleTerritories';
import { cameraRegions, cameraProjection, createCameraJourney, cameraReshapeProgress, clipCameraRegions, interpolateOwnedCompletionMorphs } from './CameraNavigation';
import { createCompletionMorphs, NavigationLayoutResolver } from './NavigationMotion';
import { projectCompletions } from './CompletionProjection';
import { polygonArea, SpatialLayoutEngine } from './SpatialLayoutEngine';
import type { Point, Polygon } from './types';

const inside = (point: Point, polygon: Polygon): boolean => {
  const sides = polygon.map((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
  });
  return sides.every(value => value >= -1e-6) || sides.every(value => value <= 1e-6);
};

describe('camera display and completion ownership', () => {
  it('clips a full partition to either viewport winding without moving sites or mutating cells', () => {
    const engine = new SpatialLayoutEngine(), full: Polygon = [[-200,-200],[-200,600],[800,600],[800,-200]];
    const viewport: Polygon = [[0,0],[0,300],[390,300],[390,0]];
    const regions = engine.layout(catalog.root, catalog.getChildren(catalog.root), full);
    const original = regions.map(region => region.polygon);
    for (const clip of [viewport,[...viewport].reverse()]) {
      const visible = clipCameraRegions(regions, clip);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.reduce((area, region) => area + region.area, 0)).toBeCloseTo(390 * 300, 7);
      visible.forEach(region => {
        expect(region.polygon.every(point => inside(point, viewport))).toBe(true);
        expect(inside(region.centroid, viewport)).toBe(true);
        expect(region.site).toBe(regions.find(original => original.node.id === region.node.id)!.site);
        expect(region.bounds.width).toBeLessThanOrEqual(390 + 1e-8);
      });
    }
    expect(regions.map(region => region.polygon)).toEqual(original);
    expect(clipCameraRegions(regions, full).every((region, index) => region === regions[index])).toBe(true);
    expect(clipCameraRegions(regions, [[900,900],[900,1000],[1000,1000],[1000,900]])).toEqual([]);
  });

  it('keeps Society completion points and footprints in their moving child at every sampled frame', () => {
    const viewport: Polygon = [[0,0],[0,588],[1440,588],[1440,0]];
    const engine = new SpatialLayoutEngine(), resolver = new NavigationLayoutResolver(catalog, engine);
    const parent = catalog.get('knowledge.society')!, child = catalog.get('knowledge.society.psychology')!;
    const selected = resolver.layoutForViewport(parent, viewport).find(region => region.node.id === child.id)!;
    const children = catalog.getChildren(child), source = engine.layout(child, children, selected.polygon);
    const expanded = resolver.layoutForViewport(child, viewport), journey = createCameraJourney(selected.polygon, viewport), end = journey.cameraAt(1);
    const inverse = {scale:1/end.scale,x:-end.x/end.scale,y:-end.y/end.scale};
    const localTarget = cameraRegions(expanded, inverse);
    const target = engine.layoutFromSites(child, children, selected.polygon, localTarget.map(region => region.site));
    const completedId = sampleLeaf('society');
    const projections = (clip: Polygon, firstRegions: typeof source) => projectCompletions({store:catalog,layoutEngine:engine,scope:child,clip,firstRegions,completedIds:[completedId]});
    const sourceMarks = projections(selected.polygon, source), targetMarks = projections(viewport, expanded).map(projection => cameraProjection(projection, inverse));
    const morphs = createCompletionMorphs(sourceMarks, targetMarks);
    expect(interpolateOwnedCompletionMorphs(morphs,source,target,source,0)[0]).toBe(sourceMarks[0]);
    expect(interpolateOwnedCompletionMorphs(morphs,source,target,target,1)[0]).toBe(targetMarks[0]);
    for (let sample=0; sample<=100; sample++) {
      const reshape = cameraReshapeProgress(sample/100);
      const sites = source.map((region,index) => region.site.map((value,axis) => value+(localTarget[index].site[axis]-value)*reshape) as unknown as Point);
      const current = engine.layoutFromSites(child,children,selected.polygon,sites);
      const mark = interpolateOwnedCompletionMorphs(morphs,source,target,current,reshape)[0];
      const owner = current.find(region => completedId.startsWith(region.node.id+'.'))!;
      expect(inside(mark.centroid,owner.polygon)).toBe(true);
      expect(mark.polygon.every(point => inside(point,owner.polygon))).toBe(true);
      expect(mark.area).toBeCloseTo(polygonArea(mark.polygon),7);
    }
    // The final extended cells, clipped for display, reproduce the resting partition.
    const displayed = clipCameraRegions(cameraRegions(target,end),viewport);
    displayed.forEach(region => {
      const resting = expanded.find(candidate => candidate.node.id === region.node.id)!;
      expect(region.area).toBeCloseTo(resting.area,6);
      expect(region.centroid[0]).toBeCloseTo(resting.centroid[0],7);
      expect(region.centroid[1]).toBeCloseTo(resting.centroid[1],7);
    });
  });
});
