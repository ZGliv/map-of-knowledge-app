import { memo, useMemo } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { TerritoryBorders, TerritoryLight } from '../components/TerritoryBorders';
import { createShapeScope } from '../spatial/MapShape';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { Point, Polygon } from '../spatial/types';

// The atlas's world view, laid out by the same engine, with a point of light where this session
// went. The land stays dark: watching never colors it, only proof does.

const engine = new SpatialLayoutEngine();
const LAND = '#0c1124';

/** Where a place sits on the world map: its own cell, found by laying out each level inside the last. */
export function placePoint(id: string, clip: Polygon): Point | null {
  const node = catalog.get(id);
  if (!node) return null;
  const path = catalog.getPath(node);
  let polygon = clip;
  let centroid: Point | null = null;
  for (let i = 1; i < path.length; i++) {
    const parent = path[i - 1];
    const region = engine.layout(parent, catalog.getChildren(parent), polygon).find(r => r.node.id === path[i].id);
    if (!region || region.polygon.length < 3) break;
    polygon = region.polygon;
    centroid = region.centroid;
  }
  return centroid;
}

export const SessionMap = memo(function SessionMap({ places, width = 360, height = 300 }: { places: readonly string[]; width?: number; height?: number }) {
  const { regions, shapes, clip } = useMemo(() => {
    const clip: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
    const regions = engine.layout(catalog.root, catalog.getChildren(catalog.root), clip);
    return { regions, clip, shapes: createShapeScope(regions, { frame: clip, pxPerUnit: 1, sibling: 1 }).cells };
  }, [width, height]);
  const points = useMemo(() => places.flatMap(id => {
    const at = placePoint(id, clip);
    return at ? [{ id, at, color: territoryColor(id), name: catalog.get(id)?.name ?? '' }] : [];
  }), [places, clip]);
  const touched = new Set(places.map(id => id.split('.').slice(0, 2).join('.')));
  return <svg className="feed-map" viewBox={`4 4 ${width - 8} ${height - 8}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Your map: ${points.map(p => p.name).join(', ') || 'nowhere yet'}`} data-session-places={places.join(' ')}>
    <rect width={width} height={height} fill="#070a14" />
    {regions.map(region => <path key={region.node.id} d={shapes.get(region.node.id)?.path} fill={LAND} stroke="#04060d" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity={touched.has(region.node.id) ? 1 : 0.72} />)}
    <TerritoryLight regions={regions} shapes={shapes} />
    <TerritoryBorders regions={regions} shapes={shapes} namespace="feed-session" opacity={0.85} />
    <g aria-hidden="true">
      {regions.map(region => <text key={region.node.id} className={`feed-map-label${touched.has(region.node.id) ? ' is-touched' : ''}`} x={region.centroid[0]} y={region.centroid[1] - 12} textAnchor="middle">{region.node.name}</text>)}
      {points.map((point, i) => <g key={point.id} className="feed-map-point" style={{ animationDelay: `${0.25 + i * 0.12}s`, color: point.color }} transform={`translate(${point.at[0].toFixed(1)} ${point.at[1].toFixed(1)})`}>
        <circle r="9" fill="currentColor" opacity=".16" />
        <circle r="3.4" fill="currentColor" />
        <circle r="1.4" fill="#fff" />
      </g>)}
    </g>
  </svg>;
});
