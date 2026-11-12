import { memo, useId, useMemo } from 'react';

/** Stacked faint strokes, clipped to the shape, read as light falling off from the edge without a blur filter. */
const BANDS = [6, 12, 20, 30, 42, 56] as const;
/** How far in the widest band reaches (half its width shows inside the clip). */
const REACH = BANDS[BANDS.length - 1] / 2;
/** The light never reaches further in than this share of a piece's inner radius. */
const DEPTH = 0.35;
/** Smaller than this (inner radius, px), a piece is too small for the wash: it keeps its own color. */
const SMALL = 40;

export interface FreshGlowItem {
  readonly id: string;
  readonly d: string;
  readonly glow: number;
  /** A piece below the map's current level: it shows only a faint rim, never a wash over its color. */
  readonly deep?: boolean;
}

/**
 * About how far a shape's middle sits from its edge, in its own units: twice its area over its
 * perimeter (exact for a circle or a regular polygon). Read from the path's own points, so curves
 * count by their control points, which is close enough for sizing a glow.
 */
export function innerRadius(d: string): number {
  let area = 0;
  let perimeter = 0;
  for (const part of d.split(/(?=M)/)) {
    const n = part.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    const points: [number, number][] = [];
    for (let i = 0; i + 1 < n.length; i += 2) points.push([n[i], n[i + 1]]);
    if (points.length < 3) continue;
    let twice = 0;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      twice += x1 * y2 - x2 * y1;
      perimeter += Math.hypot(x2 - x1, y2 - y1);
    }
    area += Math.abs(twice) / 2;
  }
  return perimeter ? (2 * area) / perimeter : 0;
}

/**
 * The freshness glow on proved land (checks/freshness.ts): a soft rim of light just inside each
 * place's own outline, bright after a proof and dimming until its next refresh falls due. The color
 * underneath never changes: the light reaches only part of the way in, scaled to the piece, and a
 * small or deeper piece gets a faint rim alone. Drawn only on the idle map (never during a camera
 * flight), from paths the map already has, with plain strokes clipped to each shape: no filters,
 * nothing per frame.
 */
export const FreshGlow = memo(function FreshGlow({ items }: { items: readonly FreshGlowItem[] }) {
  const uid = useId().replaceAll(':', '_');
  const lit = useMemo(() => items.filter(item => item.glow > 0.01 && item.d).map(item => {
    const r = innerRadius(item.d);
    const quiet = !!item.deep || r < SMALL;
    return { ...item, quiet, scale: Math.min(1, (r * (quiet ? DEPTH * 0.6 : DEPTH)) / REACH) };
  }), [items]);
  if (!lit.length) return null;
  return (
    <g className="fresh-glow" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <defs>{lit.map((item, i) => <clipPath key={item.id} id={`${uid}-fresh-${i}`}><path d={item.d} /></clipPath>)}</defs>
      {lit.map((item, i) => (
        <g key={item.id} className={item.quiet ? 'is-quiet' : undefined} clipPath={`url(#${uid}-fresh-${i})`} opacity={item.glow} data-fresh-id={item.id} data-glow={item.glow}>
          {!item.quiet && <path d={item.d} className="fresh-glow-wash" />}
          {item.scale > 0.05 && BANDS.map(width => <path key={width} d={item.d} className="fresh-glow-band" strokeWidth={width * item.scale} vectorEffect="non-scaling-stroke" />)}
          <path d={item.d} className="fresh-glow-rim" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </g>
  );
});
