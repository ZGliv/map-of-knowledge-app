import { cameraPolygon, type CameraJourney, type NavigationCamera } from './CameraNavigation';

interface RouteFrame {
  readonly leg: number;
  /** Outward progress within the current parent/child pair. */
  readonly progress: number;
  readonly camera: NavigationCamera;
  /** Camera pose in the coordinate system in which the whole trip began. */
  readonly globalCamera: NavigationCamera;
}

export interface CameraRoute {
  readonly length: number;
  readonly distance: number;
  readonly boundaries: readonly number[];
  readonly sample: (progress: number) => RouteFrame;
}

const IDENTITY: NavigationCamera = { scale: 1, x: 0, y: 0 };
const compose = (outer: NavigationCamera, inner: NavigationCamera): NavigationCamera => ({
  scale: outer.scale * inner.scale,
  x: outer.x + outer.scale * inner.x,
  y: outer.y + outer.scale * inner.y,
});
const inverse = (camera: NavigationCamera): NavigationCamera => ({
  scale: 1 / camera.scale,
  x: -camera.x / camera.scale,
  y: -camera.y / camera.scale,
});

const hermite = (from: number, to: number, fromSlope: number, toSlope: number, length: number, t: number): number => {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * from
    + (t3 - 2 * t2 + t) * fromSlope * length
    + (-2 * t3 + 3 * t2) * to
    + (t3 - t2) * toSlope * length;
};

/** A C1 boundary band avoids a velocity kink when a path reaches the map edge. */
const coverCoordinate = (value: number, low: number, high: number, progress: number): number => {
  if (high <= low) return low;
  const reveal = Math.min(1, progress / .18);
  const band = (high - low) * .06 * reveal * reveal * (3 - 2 * reveal);
  const edge = (distance: number) => {
    const t = distance / band;
    return band * t * t * (2 - t);
  };
  if (value <= low) return low;
  if (value < low + band) return low + edge(value - low);
  if (value >= high) return high;
  if (value > high - band) return high - edge(high - value);
  return value;
};

/**
 * A return to an ancestor is one camera journey. Each level supplies a canonical
 * coordinate frame, but no level owns a timer or a separate ease-in/ease-out.
 *
 * Logarithmic scale measures visual travel, so small and large territories get
 * the same perceived zoom speed. Translation is a C1 Hermite path in a shared
 * coordinate frame; adjacent levels therefore agree on velocity as well as
 * position when the visible detail switches between them.
 */
export function createCameraRoute(journeys: readonly CameraJourney[]): CameraRoute {
  if (!journeys.length) throw new Error('A camera route needs at least one journey');
  const viewport = cameraPolygon(journeys[0].targetClip, journeys[0].cameraAt(1));
  const min = [Math.min(...viewport.map(point => point[0])), Math.min(...viewport.map(point => point[1]))];
  const max = [Math.max(...viewport.map(point => point[0])), Math.max(...viewport.map(point => point[1]))];
  const distances = journeys.map(journey => Math.log(journey.cameraAt(1).scale));
  if (distances.some(distance => !Number.isFinite(distance) || distance <= 0)) {
    throw new Error('Outward camera routes require positive zoom distances');
  }
  const distancesBefore = [0];
  const poses: NavigationCamera[] = [IDENTITY];
  journeys.forEach((journey, index) => {
    distancesBefore.push(distancesBefore[index] + distances[index]);
    poses.push(compose(inverse(journey.cameraAt(1)), poses[index]));
  });
  const distance = distancesBefore.at(-1)!;
  const boundaries = distancesBefore.map(value => value / distance);

  // Canonical derivatives are measured once, before animation. Centered values
  // at shared endpoints blend the two paths without pausing at either endpoint.
  const slope = (index: number, end: boolean): readonly [number, number] => {
    const epsilon = 1e-5;
    const q = end ? 0 : 1;
    const a = compose(journeys[index].cameraAt(end ? q : q - epsilon), poses[index + 1]);
    const b = compose(journeys[index].cameraAt(end ? q + epsilon : q), poses[index + 1]);
    return [(a.x - b.x) / (epsilon * distances[index]), (a.y - b.y) / (epsilon * distances[index])];
  };
  const startSlopes = journeys.map((_, index) => slope(index, false));
  const endSlopes = journeys.map((_, index) => slope(index, true));
  const slopes = poses.map((_, index): readonly [number, number] => {
    if (index === 0) return startSlopes[0];
    const desired = index === journeys.length ? endSlopes[index - 1]
      : [(endSlopes[index - 1][0] + startSlopes[index][0]) / 2,
        (endSlopes[index - 1][1] + startSlopes[index][1]) / 2];
    // At a level handoff the outgoing parent viewport exactly meets the screen.
    // Its derivative must point into the interval that still covers the screen.
    // A small interior margin leaves the smooth coverage band inactive here,
    // so both coordinate frames retain the same global derivative.
    const translation = [poses[index].x, poses[index].y];
    return desired.map((value, axis) => {
      const margin = (max[axis] - min[axis]) * .08;
      return Math.max(min[axis] + margin - translation[axis],
        Math.min(max[axis] - margin - translation[axis], value));
    }) as unknown as readonly [number, number];
  });

  return {
    length: journeys.length,
    distance,
    boundaries,
    sample: progress => {
      const bounded = Math.max(0, Math.min(1, progress));
      const travel = bounded * distance;
      let leg = 0;
      while (leg < journeys.length - 1 && bounded >= boundaries[leg + 1]) leg++;
      const local = bounded === boundaries[leg] ? 0 : bounded === 1 ? 1
        : Math.max(0, Math.min(1, (travel - distancesBefore[leg]) / distances[leg]));
      const from = poses[leg], to = poses[leg + 1];
      const desiredGlobalCamera = local <= 0 ? from : local >= 1 ? to : {
        scale: Math.exp(-travel),
        x: hermite(from.x, to.x, slopes[leg][0], slopes[leg + 1][0], distances[leg], local),
        y: hermite(from.y, to.y, slopes[leg][1], slopes[leg + 1][1], distances[leg], local),
      };
      // The visible scene is expressed in this leg's parent coordinate frame.
      // Exact endpoints also avoid introducing rounding at a scene handoff.
      const desiredCamera = local <= 0 ? journeys[leg].cameraAt(1)
        : local >= 1 ? journeys[leg].cameraAt(0)
          : compose(desiredGlobalCamera, inverse(poses[leg + 1]));
      const camera = local <= 0 || local >= 1 ? desiredCamera : {
        scale: desiredCamera.scale,
        x: coverCoordinate(desiredCamera.x, max[0] * (1 - desiredCamera.scale), min[0] * (1 - desiredCamera.scale), local),
        y: coverCoordinate(desiredCamera.y, max[1] * (1 - desiredCamera.scale), min[1] * (1 - desiredCamera.scale), local),
      };
      const globalCamera = local <= 0 || local >= 1 ? desiredGlobalCamera : compose(camera, poses[leg + 1]);
      return { leg, progress: local, camera, globalCamera };
    },
  };
}
