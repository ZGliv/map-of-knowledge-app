import { memo, useId } from 'react';
import { TerritoryGradient } from './TerritoryGradient';
import { polygonPath } from '../spatial/SpatialLayoutEngine';
import type { ShapedCell } from '../spatial/MapShape';
import type { RegionLayout } from '../spatial/types';

export interface TerritoryBordersProps {
  readonly regions: readonly RegionLayout[];
  readonly namespace: string;
  readonly opacity?: number;
  readonly hoveredId?: string | null;
  /** Curved outlines by region; a region without one is drawn as its polygon. */
  readonly shapes?: ReadonlyMap<string, ShapedCell>;
}

// A centered 3.6px stroke has 1.8px inside its polygon. The centered 0.6px
// seam covers the innermost 0.3px, leaving 1.5px of that region's own color.
// Both paths are clipped to the owner, never painted across a neighbor.
const COLOR_STROKE_WIDTH = 3.6;
const SEAM_STROKE_WIDTH = 0.6;
const SEAM_COLOR = '#04060d';
// Rim light: wide, faint strokes of the same spectrum, clipped inside the owner,
// so each territory glows inward from its own edge like a lit island. Plain
// strokes (no SVG filters) keep every camera frame as cheap as the borders.
// Five nested widths whose combined alpha falls off roughly linearly over ~14px
// (narrower on phones, through the rim-N classes in the theme stylesheet).
const RIM_LAYERS = [
  { width: 28, opacity: .065 }, { width: 20, opacity: .1 }, { width: 13, opacity: .12 }, { width: 7, opacity: .14 }, { width: 3, opacity: .16 },
] as const;

// Escape underscores too, so literal text cannot collide with an escaped ID.
const svgIdPart = (value: string): string => Array.from(value, character => (
  /[a-zA-Z0-9]/.test(character) ? character : `_${character.codePointAt(0)!.toString(16)}_`
)).join('');

/** Overlay after territory fills; use the same polygons as the visible frame. */
// Memoized: the parent layer inside the moving camera keeps the same regions for a
// whole journey, so it renders once per journey instead of once per frame.
export const TerritoryBorders = memo(function TerritoryBorders({ regions, namespace, opacity = 1, hoveredId = null, shapes }: TerritoryBordersProps) {
  const instanceId = useId();
  const prefix = `territory-border-${svgIdPart(namespace)}-${svgIdPart(instanceId)}`;
  const paths = regions.filter(region => region.polygon.length >= 3).map(region => ({
    region,
    path: shapes?.get(region.node.id)?.path ?? polygonPath(region.polygon),
    clipId: `${prefix}-${svgIdPart(region.node.id)}`,
  }));

  return <g className="territory-borders" data-border-namespace={namespace} opacity={opacity} pointerEvents="none" aria-hidden="true">
    <defs>{paths.map(({ region, path, clipId }) => <g key={region.node.id}><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={path} /></clipPath><TerritoryGradient id={`${clipId}-paint`} nodeId={region.node.id}/></g>)}</defs>
    <g className="territory-rims" pointerEvents="none">
      {paths.map(({ region, path, clipId }) => <g
        key={region.node.id}
        className={`territory-rim${region.node.id === hoveredId ? ' is-hovered' : ''}`}
        data-rim-owner={region.node.id}
        clipPath={`url(#${clipId})`}
      >
        {RIM_LAYERS.map((layer, index) => <path
          key={layer.width}
          className={`rim-${index}`}
          d={path}
          fill="none"
          stroke={`url(#${clipId}-paint)`}
          strokeWidth={layer.width}
          strokeOpacity={layer.opacity}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />)}
      </g>)}
    </g>
    <g className="territory-color-edges" pointerEvents="none">
      {paths.map(({ region, path, clipId }) => <path
        key={region.node.id}
        className={region.node.id === hoveredId ? 'is-hovered' : undefined}
        data-border-owner={region.node.id}
        d={path}
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={`url(#${clipId}-paint)`}
        strokeWidth={COLOR_STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />)}
    </g>
    <g className="territory-dark-seams" pointerEvents="none">
      {paths.map(({ region, path, clipId }) => <path
        key={region.node.id}
        d={path}
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={SEAM_COLOR}
        strokeWidth={SEAM_STROKE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />)}
    </g>
  </g>;
});

/**
 * Inner luminance: a neutral lift toward each territory's middle and a soft fall
 * into shadow at its edge, so the land reads as rounded islands rather than flat
 * tiles. Deliberately colorless: territory color stays at the edge, and interiors
 * only take color when understanding is earned. One gradient, shared by every cell.
 */
export const TerritoryLight = memo(function TerritoryLight({ regions, opacity = 1, hoveredId = null, shapes }: {
  readonly regions: readonly RegionLayout[];
  readonly opacity?: number;
  readonly hoveredId?: string | null;
  readonly shapes?: ReadonlyMap<string, ShapedCell>;
}) {
  const id = `territory-light-${useId().replaceAll(':', '_')}`;
  if (opacity <= 0) return null;
  return <g className="territory-light" opacity={opacity} pointerEvents="none" aria-hidden="true">
    <defs>
      <radialGradient id={id} cx=".5" cy=".44" r=".72" fx=".5" fy=".36">
        <stop offset="0" stopColor="#c3cfff" stopOpacity=".085"/>
        <stop offset=".46" stopColor="#c3cfff" stopOpacity=".025"/>
        <stop offset=".78" stopColor="#03050d" stopOpacity="0"/>
        <stop offset="1" stopColor="#03050d" stopOpacity=".34"/>
      </radialGradient>
      {/* The territory under the pointer rises toward the light. */}
      <radialGradient id={`${id}-lifted`} cx=".5" cy=".44" r=".72" fx=".5" fy=".36">
        <stop offset="0" stopColor="#c9d4ff" stopOpacity=".17"/>
        <stop offset=".5" stopColor="#c9d4ff" stopOpacity=".06"/>
        <stop offset=".82" stopColor="#c9d4ff" stopOpacity=".015"/>
        <stop offset="1" stopColor="#03050d" stopOpacity=".2"/>
      </radialGradient>
    </defs>
    {regions.filter(region => region.polygon.length >= 3).map(region => <path
      key={region.node.id}
      className={region.node.id === hoveredId ? 'is-hovered' : undefined}
      d={shapes?.get(region.node.id)?.path ?? polygonPath(region.polygon)}
      fill={`url(#${id}${region.node.id === hoveredId ? '-lifted' : ''})`}
    />)}
  </g>;
});
