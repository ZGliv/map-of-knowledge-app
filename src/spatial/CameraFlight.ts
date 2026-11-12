import type { CameraJourney, NavigationCamera } from './CameraNavigation';
import { createCameraRoute, type CameraRoute } from './CameraRoute';

/**
 * One camera flight across any number of nested map levels.
 *
 * A flight is a chain of parent/child legs: zero or more outward legs up to the
 * shallowest level on the way (the apex, i.e. the common ancestor), then zero or
 * more inward legs down to the destination. Its route coordinate `s` is the
 * logarithmic zoom distance travelled, so a constant speed in `s` reads as a
 * constant zoom rate however large or small each territory is.
 *
 * Geometry and timing are separate: `createCameraFlight` maps `s` to the pose
 * every level renders with, and `createFlightClock` maps time to `s` with one
 * ease for the whole trip. No leg owns a timer, so nothing stops between levels.
 */

export interface FlightLeg {
  readonly journey: CameraJourney;
  /** 'in' travels parent to child; 'out' travels child to parent. */
  readonly direction: 'in' | 'out';
}

export interface FlightFrame {
  readonly leg: number;
  /** Progress through the leg in its own direction (0 at the level the leg leaves). */
  readonly progress: number;
  /** Canonical parent-to-child zoom, shared by both directions of the same leg. */
  readonly zoom: number;
  /** Camera for the leg's parent scene, in that parent's resting screen coordinates. */
  readonly camera: NavigationCamera;
  /** Camera in the apex level's resting coordinates (scale 1 there). */
  readonly globalCamera: NavigationCamera;
}

export interface CameraFlight {
  readonly length: number;
  /** Log zoom distance of each leg. */
  readonly distances: readonly number[];
  /** Route coordinate of each level on the way, from 0 to `distance`. */
  readonly boundaries: readonly number[];
  readonly distance: number;
  /** Route coordinate of the shallowest level, where a flight that rises and falls turns around. */
  readonly apex: number;
  readonly sample: (s: number) => FlightFrame;
}

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

export function createCameraFlight(legs: readonly FlightLeg[]): CameraFlight {
  if (!legs.length) throw new Error('A camera flight needs at least one leg');
  const rising = legs.findIndex(leg => leg.direction === 'in');
  const outward = rising < 0 ? legs.length : rising;
  if (legs.slice(outward).some(leg => leg.direction !== 'in')) {
    throw new Error('A camera flight rises to one common ancestor, then descends');
  }
  const distances = legs.map(leg => Math.log(leg.journey.cameraAt(1).scale));
  if (distances.some(distance => !Number.isFinite(distance) || distance <= 0)) {
    throw new Error('Camera flights require positive zoom distances');
  }
  const boundaries = distances.reduce<number[]>((sums, distance) => [...sums, sums.at(-1)! + distance], [0]);
  const distance = boundaries.at(-1)!;
  const apex = boundaries[outward];

  // A single level keeps the canonical journey exactly: one region's centre
  // glides to the screen centre while the zoom grows at a constant log rate.
  if (legs.length === 1) {
    const [{ journey, direction }] = legs;
    return {
      length: 1, distances, boundaries, distance, apex,
      sample: s => {
        const progress = Math.max(0, Math.min(1, s / distance));
        const zoom = direction === 'in' ? progress : 1 - progress;
        const camera = journey.cameraAt(zoom);
        return { leg: 0, progress, zoom, camera, globalCamera: camera };
      },
    };
  }

  // Several levels share one C1 path per side of the apex. An inward descent is
  // the outward ascent from its destination played backwards, so both directions
  // through the same levels follow the same covered, velocity-continuous curve.
  const up: CameraRoute | null = outward > 0 ? createCameraRoute(legs.slice(0, outward).map(leg => leg.journey)) : null;
  const down: CameraRoute | null = outward < legs.length ? createCameraRoute(legs.slice(outward).map(leg => leg.journey).reverse()) : null;
  const upApex = up ? inverse(up.sample(1).globalCamera) : null;
  const downApex = down ? inverse(down.sample(1).globalCamera) : null;

  return {
    length: legs.length, distances, boundaries, distance, apex,
    sample: s => {
      const bounded = Math.max(0, Math.min(distance, s));
      if (up && (bounded <= apex || !down)) {
        const frame = up.sample(bounded / apex);
        return {
          leg: frame.leg, progress: frame.progress, zoom: 1 - frame.progress,
          camera: frame.camera, globalCamera: compose(frame.globalCamera, upApex!),
        };
      }
      const frame = down!.sample(1 - (bounded - apex) / (distance - apex));
      const progress = 1 - frame.progress;
      return {
        leg: legs.length - 1 - frame.leg, progress, zoom: progress,
        camera: frame.camera, globalCamera: compose(frame.globalCamera, downApex!),
      };
    },
  };
}

/* ------------------------------------------------------------------ timing */

/** Velocity ramp shapes: f(0)=0, f(1)=1, with F the integral of f from 0 to x. */
const SHAPES = {
  // Zero acceleration at both ends: departures from and arrivals at rest.
  smooth: { f: (x: number) => x * x * (3 - 2 * x), F: (x: number) => x * x * x * (1 - x / 2) },
  // Into a turnaround: velocity falls to zero with a finite deceleration, so the
  // zoom reverses like a thrown ball at its peak instead of hanging there.
  reach: { f: (x: number) => 1 - Math.cos(Math.PI * x / 2), F: (x: number) => x - (2 / Math.PI) * Math.sin(Math.PI * x / 2) },
  // Out of a turnaround, mirroring `reach`.
  leave: { f: (x: number) => Math.sin(Math.PI * x / 2), F: (x: number) => (2 / Math.PI) * (1 - Math.cos(Math.PI * x / 2)) },
} as const;
type Shape = keyof typeof SHAPES;

interface Segment { readonly t0: number; readonly duration: number; readonly s0: number; readonly v0: number; readonly v1: number; readonly shape: Shape | null }

export interface FlightClock {
  /** Milliseconds from the clock's start to arrival. */
  readonly duration: number;
  readonly position: (t: number) => number;
  /** Route units per millisecond. */
  readonly velocity: (t: number) => number;
}

export interface FlightClockOptions {
  readonly start: number;
  readonly end: number;
  /** Shallowest level on the route; the zoom reverses there when it lies strictly between start and end. */
  readonly apex?: number;
  /** Route units per millisecond already under way (negative means moving back toward the route's start). */
  readonly velocity?: number;
  readonly duration: number;
}

/** Ease once for the whole journey: accelerate, keep a constant zoom rate, settle. */
export function createFlightClock({ start, end, apex = start, velocity = 0, duration }: FlightClockOptions): FlightClock {
  const length = end - start;
  if (!(duration > 0) || !(length > 1e-9)) {
    return { duration: 0, position: () => end, velocity: () => 0 };
  }
  const turns = apex > start + 1e-9 && apex < end - 1e-9;
  const phases = turns
    ? [{ from: start, to: apex, share: (apex - start) / length, enter: velocity, leaveShape: 'reach' as Shape }, { from: apex, to: end, share: (end - apex) / length, enter: 0, leaveShape: 'smooth' as Shape }]
    : [{ from: start, to: end, share: 1, enter: velocity, leaveShape: 'smooth' as Shape }];
  const segments: Segment[] = [];
  let t = 0;
  phases.forEach((phase, index) => {
    const span = duration * phase.share;
    const distance = phase.to - phase.from;
    const entering: Shape = index > 0 ? 'leave' : 'smooth';
    let rampIn = Math.min(span * (index > 0 ? .35 : .42), index > 0 ? 300 : phase.enter ? 360 : 420);
    let rampOut = Math.min(span * (phase.leaveShape === 'reach' ? .35 : .48), phase.leaveShape === 'reach' ? 300 : 500);
    const u = phase.enter;
    // Arriving faster than the remaining distance allows: brake within it instead of overshooting.
    if (u > 0) rampIn = Math.min(rampIn, distance / (u * (1 - SHAPES[entering].F(1))));
    const cruise = Math.max(0, span - rampIn - rampOut);
    if (rampIn + rampOut > span) { const k = span / (rampIn + rampOut); rampIn *= k; rampOut *= k; }
    const fin = SHAPES[entering].F(1), fout = SHAPES[phase.leaveShape].F(1);
    const peak = (distance - rampIn * u * (1 - fin)) / (rampIn * fin + cruise + rampOut * (1 - fout));
    let s = phase.from;
    const push = (segmentDuration: number, v0: number, v1: number, shape: Shape | null) => {
      if (segmentDuration <= 0) return;
      segments.push({ t0: t, duration: segmentDuration, s0: s, v0, v1, shape });
      s += shape ? segmentDuration * (v0 + (v1 - v0) * SHAPES[shape].F(1)) : segmentDuration * v0;
      t += segmentDuration;
    };
    push(rampIn, u, peak, entering);
    push(cruise, peak, peak, null);
    push(rampOut, peak, 0, phase.leaveShape);
  });
  const total = t;
  const find = (time: number) => {
    let index = 0;
    while (index < segments.length - 1 && time >= segments[index + 1].t0) index++;
    return segments[index];
  };
  return {
    duration: total,
    position: time => {
      if (time <= 0) return start;
      if (time >= total) return end;
      const { t0, duration: span, s0, v0, v1, shape } = find(time);
      const x = Math.min(1, (time - t0) / span);
      return shape ? s0 + span * (v0 * x + (v1 - v0) * SHAPES[shape].F(x)) : s0 + v0 * (time - t0);
    },
    velocity: time => {
      if (time >= total) return 0;
      if (time <= 0) return velocity;
      const { t0, duration: span, v0, v1, shape } = find(time);
      return shape ? v0 + (v1 - v0) * SHAPES[shape].f(Math.min(1, (time - t0) / span)) : v0;
    },
  };
}

/** One level takes about a second; every doubling of levels adds half a second. */
export function flightDuration(levels: number): number {
  if (!(levels > 0)) return 0;
  return levels >= 1 ? 950 + 500 * Math.log2(levels) : Math.max(280, 950 * Math.sqrt(levels));
}

/**
 * Levels a flight passes, given both root-first paths: up from the first to their
 * deepest shared ancestor, then down to the second. Both ends are included.
 */
export function flightLevels<T extends { readonly id: string }>(from: readonly T[], to: readonly T[]): T[] {
  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared].id === to[shared].id) shared++;
  if (!shared) throw new Error('Flight endpoints must share a root');
  return [...from.slice(shared - 1).reverse(), ...to.slice(shared)];
}
