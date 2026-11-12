import { describe, expect, it } from 'vitest';
import { cameraPoint, cameraPolygon, cameraProjection, cameraRegions, cameraReshapeProgress, createCameraJourney } from './CameraNavigation';
import { polygonArea, polygonCentroid, SpatialLayoutEngine } from './SpatialLayoutEngine';
import { NodeStore } from './NodeStore';
import type { CompletionProjection } from './CompletionProjection';
import type { Polygon } from './types';

const selected: Polygon = [[18, 90], [32, 158], [107, 132], [92, 67]];
const viewport: Polygon = [[0, 0], [0, 486], [390, 486], [390, 0]];

describe('camera navigation decomposition', () => {
  it('preserves identity references and exactly the existing destination geography', () => {
    const journey = createCameraJourney(selected, viewport);
    expect(journey.sourceClip).toBe(selected);
    expect(cameraPolygon(selected, journey.cameraAt(0))).toBe(selected);
    expect(cameraPoint(selected[0], journey.cameraAt(0))).toBe(selected[0]);
    const restored = cameraPolygon(journey.targetClip, journey.cameraAt(1));
    restored.forEach((point, index) => point.forEach((value, axis) => expect(value).toBeCloseTo(viewport[index][axis], 10)));
    const arbitrary = [279.38, 414.59] as const;
    cameraPoint(journey.toLocal(arbitrary), journey.cameraAt(1)).forEach((value, axis) => expect(value).toBeCloseTo(arbitrary[axis], 10));
    expect(polygonArea(journey.targetClip)).toBeLessThan(polygonArea(selected));
    // Every viewport corner is strictly inside the unchanged selected polygon.
    for (const point of journey.targetClip) {
      const sides = selected.map((a, index) => {
        const b = selected[(index + 1) % selected.length];
        return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
      });
      expect(sides.every(value => value > 0) || sides.every(value => value < 0)).toBe(true);
    }
  });

  it('moves the chosen region center inward without ricochet even for a large zoom', () => {
    const journey = createCameraJourney(selected, viewport);
    const sourceCenter = polygonCentroid(selected), targetCenter = polygonCentroid(viewport);
    expect(journey.cameraAt(1).scale).toBeGreaterThan(Math.E);
    let previousDistance = Infinity, previousScale = 0;
    for (let step = 0; step <= 100; step++) {
      const progress = step / 100, camera = journey.cameraAt(progress);
      const center = cameraPoint(sourceCenter, camera);
      const distance = Math.hypot(center[0] - targetCenter[0], center[1] - targetCenter[1]);
      expect(distance).toBeLessThanOrEqual(previousDistance + 1e-9);
      expect(camera.scale).toBeGreaterThanOrEqual(previousScale);
      center.forEach((value, axis) => expect(value).toBeCloseTo(sourceCenter[axis] + (targetCenter[axis] - sourceCenter[axis]) * progress, 10));
      previousDistance = distance; previousScale = camera.scale;
    }
    expect(journey.cameraAt(-1)).toEqual(journey.cameraAt(0));
    expect(journey.cameraAt(2)).toEqual(journey.cameraAt(1));
  });

  it('transforms all spatial fields and keeps completion visibility measured in screen pixels', () => {
    const store = new NodeStore(), engine = new SpatialLayoutEngine();
    const regions = engine.layout(store.root, store.getChildren(store.root), viewport);
    const journey = createCameraJourney(selected, viewport), identity = journey.cameraAt(0), camera = journey.cameraAt(0.5);
    expect(cameraRegions(regions, identity)).toBe(regions);
    const transformed = cameraRegions(regions, camera);
    transformed.forEach((region, index) => {
      expect(region.node).toBe(regions[index].node);
      expect(region.site).toEqual(cameraPoint(regions[index].site, camera));
      expect(region.area).toBeCloseTo(polygonArea(region.polygon), 7);
      expect(region.centroid[0]).toBeCloseTo(polygonCentroid(region.polygon)[0], 8);
      expect(region.bounds.width).toBeCloseTo(regions[index].bounds.width * camera.scale, 8);
    });
    const projection: CompletionProjection = {nodeId:'test.deep',polygon:selected,centroid:polygonCentroid(selected),area:polygonArea(selected),estimatedArea:0.12,relativeDepth:8,remainingDepth:2,collapsed:true};
    expect(cameraProjection(projection, identity)).toBe(projection);
    const result = cameraProjection(projection, camera);
    expect(result.estimatedArea).toBeCloseTo(0.12 * camera.scale ** 2, 12);
    expect(result.centroid).toEqual(cameraPoint(projection.centroid, camera));
    expect(result.collapsed).toBe(true); expect(result.relativeDepth).toBe(8); expect(result.remainingDepth).toBe(2);
  });

  it('bounds residual reshaping to its intended pacing window', () => {
    expect(cameraReshapeProgress(0.08)).toBe(0); expect(cameraReshapeProgress(0.9)).toBe(1);
    const values = Array.from({length:101}, (_, index) => cameraReshapeProgress(index / 100));
    expect(values).toEqual([...values].sort((a,b) => a-b));
    expect(() => createCameraJourney([[0,0],[1,0],[2,0]],viewport)).toThrow('positive polygon areas');
  });
});
