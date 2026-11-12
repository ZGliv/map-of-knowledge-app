import { territoryHueRange } from './territoryTheme';

export interface AtlasAtmosphereFrame {
  readonly parentId: string;
  readonly childId: string;
  /** The same canonical parent-to-child zoom coordinate used by the camera. */
  readonly zoom: number;
}

export function atmosphereHue(nodeId: string): number {
  const [start, end] = territoryHueRange(nodeId);
  return (start + end) / 2;
}

/** Follow the shorter arc, including a smooth reverse through the zero boundary. */
export function interpolateAtmosphereHue(from: number, to: number, progress: number): number {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (t === 0) return from;
  if (t === 1) return to;
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * t + 360) % 360;
}

export function atmosphereFrameHue(frame: AtlasAtmosphereFrame): number {
  return interpolateAtmosphereHue(atmosphereHue(frame.parentId), atmosphereHue(frame.childId), frame.zoom);
}

export interface AtlasAccent {
  /** Hue of the territory light carried by accents (current place, focus, primary glow). */
  readonly hue: number;
  /** 0 at the world view (accents are neutral starlight), 1 inside any territory. */
  readonly tint: number;
}

/**
 * The chrome is always deep space; a territory only lends its hue to accents.
 * The world view has no territory of its own, so legs that leave or reach it keep
 * the territory's hue fixed and fade the tint instead of sweeping through the
 * arbitrary neutral hue (which would flash unrelated colors mid-dive).
 */
export function atmosphereAccent(frame: AtlasAtmosphereFrame, rootId: string): AtlasAccent {
  const t = Number.isFinite(frame.zoom) ? Math.max(0, Math.min(1, frame.zoom)) : 0;
  const parentAtRoot = frame.parentId === rootId;
  const childAtRoot = frame.childId === rootId;
  if (parentAtRoot && childAtRoot) return { hue: atmosphereHue(rootId), tint: 0 };
  if (parentAtRoot) return { hue: atmosphereHue(frame.childId), tint: t };
  return { hue: atmosphereFrameHue(frame), tint: 1 };
}
