import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { SAMPLE_TERRITORIES, sampleLeaf } from '../core/sampleTerritories';
import { createCameraJourney, type NavigationCamera } from './CameraNavigation';
import { createCameraRoute } from './CameraRoute';
import { NavigationLayoutResolver } from './NavigationMotion';
import { SpatialLayoutEngine } from './SpatialLayoutEngine';
import type { Polygon } from './types';

const cameraValues = (camera: NavigationCamera) => [camera.scale, camera.x, camera.y];

describe('continuous ancestor camera route', () => {
  it.each([[390, 490], [1440, 594], [844, 196]])('keeps every level moving through one covered, continuous camera path at %i×%i', (width, height) => {
    const viewport: Polygon = [[0, 0], [0, height], [width, height], [width, 0]];
    const engine = new SpatialLayoutEngine();
    const resolver = new NavigationLayoutResolver(catalog, engine);
    for (const { subject } of SAMPLE_TERRITORIES) {
      const path = catalog.getPath(catalog.get(sampleLeaf(subject))!);
      const journeys = path.slice(1).map((node, index) => {
        const region = resolver.layoutForViewport(path[index], viewport).find(region => region.node.id === node.id)!;
        return createCameraJourney(region.polygon, viewport);
      }).reverse();
      const route = createCameraRoute(journeys);
      expect(route.length).toBe(path.length - 1);
      expect(route.sample(0).camera).toEqual(journeys[0].cameraAt(1));
      expect(route.sample(0).globalCamera).toEqual({scale: 1, x: 0, y: 0});
      expect(route.sample(1).camera).toEqual({scale: 1, x: 0, y: 0});
      expect(route.sample(1).leg).toBe(path.length - 2);
      expect(route.sample(1).progress).toBe(1);
      const finalScale = journeys.reduce((value, journey) => value / journey.cameraAt(1).scale, 1);
      expect(route.sample(1).globalCamera.scale).toBeCloseTo(finalScale, 12);

      // One logarithmic distance is the clock across all levels: no re-easing,
      // tiny pauses, or changing zoom velocity at a level's bookkeeping boundary.
      let previousScale = Infinity;
      for (let frame = 0; frame <= 500; frame++) {
        const progress = frame / 500;
        const sample = route.sample(progress);
        expect(sample.globalCamera.scale).toBeLessThan(previousScale);
        expect(Math.log(sample.globalCamera.scale)).toBeCloseTo(-progress * route.distance, 10);
        expect(cameraValues(sample.camera).every(Number.isFinite)).toBe(true);
        expect(sample.camera.scale).toBeGreaterThanOrEqual(1 - 1e-9);
        // Off-center branches must never expose a stripe of empty background.
        // The old unconstrained spline could leave 18% of a desktop uncovered.
        expect(sample.camera.x).toBeLessThanOrEqual(1e-7);
        expect(sample.camera.y).toBeLessThanOrEqual(1e-7);
        expect(sample.camera.x + width * sample.camera.scale).toBeGreaterThanOrEqual(width - 1e-7);
        expect(sample.camera.y + height * sample.camera.scale).toBeGreaterThanOrEqual(height - 1e-7);
        previousScale = sample.globalCamera.scale;
      }

      for (const boundary of route.boundaries.slice(1, -1)) {
        const epsilon = 1e-7;
        const before = route.sample(boundary - epsilon);
        const at = route.sample(boundary);
        const after = route.sample(boundary + epsilon);
        const beforePose = cameraValues(before.globalCamera), pose = cameraValues(at.globalCamera), afterPose = cameraValues(after.globalCamera);
        expect(after.leg).toBe(before.leg + 1);
        for (let axis = 0; axis < 3; axis++) {
          const incomingVelocity = (pose[axis] - beforePose[axis]) / epsilon;
          const outgoingVelocity = (afterPose[axis] - pose[axis]) / epsilon;
          expect(Math.abs(incomingVelocity - outgoingVelocity)).toBeLessThan(.2);
          expect(Math.abs(pose[axis] - beforePose[axis])).toBeLessThan(.01);
          expect(Math.abs(afterPose[axis] - pose[axis])).toBeLessThan(.01);
        }
        expect((pose[0] - beforePose[0]) / epsilon).toBeLessThan(0);
        // The next local coordinate frame starts at precisely its canonical zoom.
        const nextCamera = journeys[after.leg].cameraAt(1);
        cameraValues(at.camera).forEach((value, axis) => expect(value).toBeCloseTo(cameraValues(nextCamera)[axis], 7));
      }
    }
  });

  it('rejects empty routes and clamps request progress to the exact endpoints', () => {
    const viewport: Polygon = [[0, 0], [0, 600], [1000, 600], [1000, 0]];
    const journey = createCameraJourney([[100,100],[100,300],[300,300],[300,100]], viewport);
    expect(() => createCameraRoute([])).toThrow('at least one journey');
    const route = createCameraRoute([journey]);
    expect(route.sample(-2)).toEqual(route.sample(0));
    expect(route.sample(2)).toEqual(route.sample(1));
  });
});
