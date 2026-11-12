import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { SAMPLE_TERRITORIES, samplePath } from '../core/sampleTerritories';
import { createCameraJourney, type NavigationCamera } from './CameraNavigation';
import { createCameraFlight, createFlightClock, flightDuration, flightLevels, type CameraFlight, type FlightLeg } from './CameraFlight';
import { NavigationLayoutResolver } from './NavigationMotion';
import { SpatialLayoutEngine } from './SpatialLayoutEngine';
import type { KnowledgeNode, Polygon } from './types';

const VIEWPORTS: readonly (readonly [number, number])[] = [[390, 490], [1440, 594], [844, 196]];
const FRAME = 1000 / 120;

const compose = (outer: NavigationCamera, inner: NavigationCamera): NavigationCamera => ({
  scale: outer.scale * inner.scale, x: outer.x + outer.scale * inner.x, y: outer.y + outer.scale * inner.y,
});

/** Builds legs exactly as the atlas does: each journey from its parent's resting layout. */
function flightBetween(fromId: string, toId: string, viewport: Polygon) {
  const resolver = new NavigationLayoutResolver(catalog, new SpatialLayoutEngine());
  const levels = flightLevels(catalog.getPath(catalog.get(fromId)!), catalog.getPath(catalog.get(toId)!));
  const legs: (FlightLeg & { parent: KnowledgeNode })[] = levels.slice(1).map((to, index) => {
    const from = levels[index];
    const direction = to.parentId === from.id ? 'in' : 'out';
    const [parent, child] = direction === 'in' ? [from, to] : [to, from];
    const region = resolver.layoutForViewport(parent, viewport).find(candidate => candidate.node.id === child.id)!;
    return { journey: createCameraJourney(region.polygon, viewport), direction, parent };
  });
  // Resting pose of every level relative to the apex (shallowest) level.
  const apexIndex = levels.reduce((best, node, index) => node.depth < levels[best].depth ? index : best, 0);
  const poses = new Map<string, NavigationCamera>([[levels[apexIndex].id, { scale: 1, x: 0, y: 0 }]]);
  for (const [start, step] of [[apexIndex, -1], [apexIndex, 1]] as const) {
    for (let index = start + step; index >= 0 && index < levels.length; index += step) {
      const leg = legs[step < 0 ? index : index - 1];
      poses.set(levels[index].id, compose(leg.journey.cameraAt(1), poses.get(leg.parent.id)!));
    }
  }
  return { flight: createCameraFlight(legs), legs, levels, poses };
}

/** Plays a flight from rest with its production clock, one 120 Hz frame at a time. */
function play(flight: CameraFlight) {
  const clock = createFlightClock({ start: 0, end: flight.distance, apex: flight.apex, duration: flightDuration(flight.length) });
  const frames = [];
  for (let time = 0; time < clock.duration + FRAME; time += FRAME) {
    const t = Math.min(time, clock.duration);
    frames.push({ t, s: clock.position(t), ...flight.sample(clock.position(t)) });
  }
  return { clock, frames };
}

/** Largest on-screen displacement of the viewport's corners and centre between two cameras. */
const pixelMotion = (a: NavigationCamera, b: NavigationCamera, width: number, height: number) => Math.max(
  ...[[0, 0], [width, 0], [0, height], [width, height], [width / 2, height / 2]].map(([x, y]) => {
    const wx = (x - a.x) / a.scale, wy = (y - a.y) / a.scale;
    return Math.hypot(b.scale * wx + b.x - x, b.scale * wy + b.y - y);
  }),
);

describe('one continuous multi-level camera flight', () => {
  it.each(VIEWPORTS)('dives and returns 1 to the deepest level with monotonic zoom and no stationary frame at %i×%i', (width, height) => {
    const viewport: Polygon = [[0, 0], [0, height], [width, height], [width, 0]];
    for (const { subject } of SAMPLE_TERRITORIES) {
      const path = samplePath(subject);
      for (const depth of new Set([1, 2, 3, 4, 5, path.length - 1])) {
        for (const [from, to] of [[path[0], path[depth]], [path[depth], path[0]]]) {
          const { flight, legs, poses } = flightBetween(from, to, viewport);
          const inward = to !== path[0];
          const { clock, frames } = play(flight);
          expect(flight.length).toBe(depth);
          expect(clock.duration).toBeCloseTo(flightDuration(depth), 6);
          expect(frames[0].globalCamera.scale).toBeCloseTo(inward ? 1 : Math.exp(flight.distance), 6);
          expect(frames.at(-1)!.globalCamera.scale).toBeCloseTo(inward ? Math.exp(flight.distance) : 1, 6);
          const speeds: number[] = [];
          for (let index = 1; index < frames.length; index++) {
            const before = frames[index - 1], frame = frames[index];
            // Rendering consistency: the leg's local camera on its parent's resting
            // pose is exactly the flight's global camera, at every frame.
            const composed = compose(frame.camera, poses.get(legs[frame.leg].parent.id)!);
            expect(composed.scale / frame.globalCamera.scale).toBeCloseTo(1, 9);
            expect(pixelMotion(composed, frame.globalCamera, width, height)).toBeLessThan(1e-3);
            const zoomStep = Math.log(frame.globalCamera.scale / before.globalCamera.scale);
            if (frame.t - before.t < 1e-3) continue;
            // Zoom is strictly monotonic: never pauses, never backs up, at any level handoff.
            expect(inward ? zoomStep : -zoomStep, `${subject} ${depth} ${from}->${to} t=${frame.t} of ${clock.duration} leg ${frame.leg} p=${frame.progress} s=${frame.s}`).toBeGreaterThan(0);
            speeds.push(Math.abs(zoomStep) / (frame.t - before.t));
          }
          const mean = flight.distance / clock.duration;
          const middle = speeds.filter((_, index) => frames[index + 1].t > clock.duration * .08 && frames[index + 1].t < clock.duration * .92);
          expect(Math.min(...middle)).toBeGreaterThan(mean * .1);
          // One ease for the whole trip: speed never dips and recovers mid-journey.
          const peak = speeds.indexOf(Math.max(...speeds));
          speeds.slice(1, peak).forEach((speed, index) => expect(speed).toBeGreaterThanOrEqual(speeds[index] - mean * 1e-6));
          speeds.slice(peak + 1).forEach((speed, index) => expect(speed).toBeLessThanOrEqual(speeds[peak + index] + mean * 1e-6));
          if (depth > 1) {
            for (const { camera } of frames) {
              // Off-centre branches never uncover an edge of the parent scene.
              expect(camera.x).toBeLessThanOrEqual(1e-6);
              expect(camera.y).toBeLessThanOrEqual(1e-6);
              expect(camera.x + width * camera.scale).toBeGreaterThanOrEqual(width - 1e-6);
              expect(camera.y + height * camera.scale).toBeGreaterThanOrEqual(height - 1e-6);
            }
          }
        }
      }
    }
  });

  it.each(VIEWPORTS)('crosses branches as one rise and one fall through the common ancestor at %i×%i', (width, height) => {
    const viewport: Polygon = [[0, 0], [0, height], [width, height], [width, 0]];
    const science = samplePath('science'), arts = samplePath('arts'), technology = samplePath('technology');
    for (const [from, to, rise] of [[science[5], arts[5], 5], [technology[7], arts[3], 7], [arts[2], science[6], 2]] as const) {
      const { flight } = flightBetween(from, to, viewport);
      const { clock, frames } = play(flight);
      expect(flight.boundaries[rise]).toBeCloseTo(flight.apex, 12);
      const apex = flight.sample(flight.apex);
      expect(apex.globalCamera.scale).toBeCloseTo(1, 9);
      expect(Math.abs(apex.globalCamera.x) + Math.abs(apex.globalCamera.y)).toBeLessThan(1e-6);
      const steps = frames.slice(1).map((frame, index) => ({
        t: frame.t, dt: frame.t - frames[index].t,
        zoom: Math.log(frame.globalCamera.scale / frames[index].globalCamera.scale),
        px: pixelMotion(frames[index].globalCamera, frame.globalCamera, width, height),
      })).filter(step => step.dt > 1e-3);
      // Exactly one reversal of zoom direction, at the common ancestor.
      const signs = steps.map(step => Math.sign(step.zoom)).filter(Boolean);
      expect(signs.slice(1).filter((sign, index) => sign !== signs[index]).length).toBe(1);
      const turn = clock.duration * (flight.apex / flight.distance);
      // The turnaround is a smooth bounce: the camera keeps moving on every frame,
      // and only frames right at the apex fall below a pixel of motion.
      const interior = steps.filter(step => step.t > clock.duration * .08 && step.t < clock.duration * .92);
      expect(Math.min(...interior.map(step => step.px))).toBeGreaterThan(0);
      for (const step of interior) {
        const nearApex = Math.abs(step.t - turn) < 400;
        if (!nearApex) expect(step.px).toBeGreaterThan(.5);
      }
    }
  });

  it('rejects a route that descends and then rises again', () => {
    const viewport: Polygon = [[0, 0], [0, 600], [1000, 600], [1000, 0]];
    const journey = createCameraJourney([[100, 100], [100, 300], [300, 300], [300, 100]], viewport);
    expect(() => createCameraFlight([])).toThrow('at least one leg');
    expect(() => createCameraFlight([{ journey, direction: 'in' }, { journey, direction: 'out' }])).toThrow('rises to one common ancestor');
  });
});

describe('flight clock', () => {
  it('eases once from rest to rest with continuous velocity', () => {
    for (const duration of [flightDuration(1), flightDuration(5), flightDuration(8)]) {
      const clock = createFlightClock({ start: 0, end: 12, duration });
      expect(clock.duration).toBeCloseTo(duration, 9);
      expect(clock.position(0)).toBe(0);
      expect(clock.position(clock.duration)).toBe(12);
      expect(clock.velocity(0)).toBe(0);
      let previous = 0;
      for (let t = 1; t < clock.duration; t += 1) {
        const position = clock.position(t);
        expect(position).toBeGreaterThan(previous);
        expect(position - previous).toBeCloseTo(clock.velocity(t - .5), 4);
        previous = position;
      }
    }
  });

  it('keeps the speed of a redirected camera, and reverses it smoothly when the new route turns back', () => {
    const ahead = createFlightClock({ start: 1, end: 9, velocity: .004, duration: 1500 });
    expect(ahead.velocity(0)).toBeCloseTo(.004, 9);
    expect(ahead.position(10) - ahead.position(0)).toBeCloseTo(.04, 3);
    const back = createFlightClock({ start: 1, end: 9, velocity: -.004, duration: 1500 });
    expect(back.velocity(0)).toBeCloseTo(-.004, 9);
    const positions = Array.from({ length: 1501 }, (_, t) => back.position(t));
    const lowest = Math.min(...positions);
    expect(lowest).toBeLessThan(1);
    expect(lowest).toBeGreaterThan(.5);
    expect(positions.at(-1)).toBe(9);
    // A camera arriving faster than the remaining route allows brakes inside it.
    const fast = createFlightClock({ start: 0, end: .2, velocity: .01, duration: 300 });
    for (let t = 0; t <= fast.duration; t += 1) expect(fast.position(t)).toBeLessThanOrEqual(.2 + 1e-9);
  });

  it('turns around at the apex with zero speed and matching deceleration', () => {
    const clock = createFlightClock({ start: 0, end: 10, apex: 5, duration: 2400 });
    const turn = Array.from({ length: 2401 }, (_, t) => t).find(t => clock.position(t) >= 5)!;
    expect(Math.abs(clock.velocity(turn))).toBeLessThan(1e-4);
    const slope = (t: number) => (clock.velocity(t + 1) - clock.velocity(t - 1)) / 2;
    expect(Math.abs(slope(turn - 3) + slope(turn + 3))).toBeLessThan(Math.abs(slope(turn - 3)) * .1);
  });

  it('scales duration gently with the number of levels', () => {
    expect(flightDuration(1)).toBe(950);
    expect(flightDuration(4)).toBeCloseTo(1950, 6);
    expect(flightDuration(5)).toBeGreaterThan(2000);
    expect(flightDuration(5)).toBeLessThan(2200);
    expect(flightDuration(.25)).toBeGreaterThan(280);
    expect(flightDuration(0)).toBe(0);
  });
});

describe('flight levels', () => {
  const path = (id: string) => catalog.getPath(catalog.get(id)!);
  const ids = (nodes: readonly KnowledgeNode[]) => nodes.map(node => node.id);
  it('rises to the deepest shared ancestor, then descends', () => {
    const science = samplePath('science'), arts = samplePath('arts');
    expect(ids(flightLevels(path(science[0]), path(science[4])))).toEqual(science.slice(0, 5));
    expect(ids(flightLevels(path(science[4]), path(science[1])))).toEqual(science.slice(1, 5).reverse());
    expect(ids(flightLevels(path(science[3]), path(arts[2])))).toEqual([...science.slice(0, 4).reverse(), ...arts.slice(1, 3)]);
    expect(ids(flightLevels(path(science[5]), path('knowledge.science.biology')))).toEqual([...science.slice(1, 6).reverse(), 'knowledge.science.biology']);
    expect(ids(flightLevels(path(arts[3]), path(arts[3])))).toEqual([arts[3]]);
  });
});
