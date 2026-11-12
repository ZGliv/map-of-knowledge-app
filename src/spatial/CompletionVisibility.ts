import type { CompletionProjection } from './CompletionProjection';

export const DISTANT_CORE_RADIUS = 0.65;
export const DISTANT_HALO_RADIUS = 1.6;
const COLLISION_BUCKET_SIZE = 1;

export interface CompletionAppearance {
  /** A collapsed polygon belongs to an ancestor and must never be painted as earned. */
  readonly showGeometry: boolean;
  readonly coreRadius: number;
  readonly haloRadius: number;
  readonly coreOpacity: number;
  readonly haloOpacity: number;
}

export interface CompletionVisual extends CompletionAppearance {
  readonly projection: CompletionProjection;
  readonly collisionCount: number;
  readonly beaconRepresentative: boolean;
}

const smoothstep = (start: number, end: number, value: number): number => {
  const amount = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return amount * amount * (3 - 2 * amount);
};

/** The beacon is a visibility floor, not an enlargement of the earned footprint. */
export function completionAppearance(projection: CompletionProjection): CompletionAppearance {
  const area = Math.max(0, projection.estimatedArea);
  const coreOpacity = 0.94 * (1 - smoothstep(0.4, 2.4, area));
  const haloOpacity = 0.16 * (1 - smoothstep(0.2, 1.2, area));
  return {
    showGeometry: !projection.collapsed && projection.polygon.length >= 3,
    coreRadius: coreOpacity > 0 ? DISTANT_CORE_RADIUS : 0,
    haloRadius: haloOpacity > 0 ? DISTANT_HALO_RADIUS : 0,
    coreOpacity,
    haloOpacity,
  };
}

/**
 * Keep every projection, polygon and centroid unchanged. Only redundant tiny
 * beacons share a draw operation. The representative sits on a real projected
 * centroid, never at a rounded bucket centre or an invented larger footprint.
 * Coordinates are CSS pixels: the atlas viewBox must match its displayed size.
 */
export function completionVisuals(projections: readonly CompletionProjection[]): readonly CompletionVisual[] {
  const unique = new Map<string, CompletionProjection>();
  for (const projection of projections) {
    if (!projection.nodeId || !Number.isFinite(projection.estimatedArea) || projection.estimatedArea < 0 || !projection.centroid.every(Number.isFinite)) continue;
    if (!unique.has(projection.nodeId)) unique.set(projection.nodeId, projection);
  }
  const buckets = new Map<string, CompletionProjection[]>();
  for (const projection of unique.values()) {
    if (projection.estimatedArea >= 1) continue;
    const [x, y] = projection.centroid;
    const key = `${Math.floor(x / COLLISION_BUCKET_SIZE)},${Math.floor(y / COLLISION_BUCKET_SIZE)}`;
    const members = buckets.get(key) ?? [];
    members.push(projection);
    buckets.set(key, members);
  }
  const representatives = new Map<string, { id: string; count: number }>();
  for (const members of buckets.values()) {
    // A stable ID order avoids changing the anchor when input order changes.
    const representative = members.reduce((first, next) => next.nodeId < first.nodeId ? next : first);
    for (const member of members) representatives.set(member.nodeId, { id: representative.nodeId, count: members.length });
  }
  return [...unique.values()].map(projection => {
    const appearance = completionAppearance(projection);
    const shared = representatives.get(projection.nodeId);
    const beaconRepresentative = !shared || shared.id === projection.nodeId;
    return {
      projection,
      ...appearance,
      coreRadius: beaconRepresentative ? appearance.coreRadius : 0,
      haloRadius: beaconRepresentative ? appearance.haloRadius : 0,
      coreOpacity: beaconRepresentative ? appearance.coreOpacity : 0,
      haloOpacity: beaconRepresentative ? appearance.haloOpacity : 0,
      collisionCount: shared?.count ?? 1,
      beaconRepresentative,
    };
  });
}
