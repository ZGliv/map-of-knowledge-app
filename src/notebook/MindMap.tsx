import { memo, useId, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { TerritoryGradient } from '../components/TerritoryGradient';
import { TerritoryBorders, TerritoryLight } from '../components/TerritoryBorders';
import { FreshGlow } from '../components/FreshGlow';
import { createShapeScope } from '../spatial/MapShape';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { Polygon } from '../spatial/types';
import type { PlaceState, Territory } from './journal';

// Your map: the field as the atlas draws it (same layout engine, curved borders and territory
// spectrum), painted only by your own record. Lit land is filled, underway land is hatched in
// its own color, land you have read about is stippled (a scatter of points, never a fill: reading
// is not proof), the rest stays dark.

export const engine = new SpatialLayoutEngine();
const LAND = '#0c1124';

/** How one cell is painted for a state: its pattern or gradient (if any), its fill and opacity. Shared with the world map. */
export function cellPaint(uid: string, nodeId: string, index: number, state: PlaceState, reads = 1): { def: ReactNode; fill: string; opacity: number } {
  const id = `${uid}-paint-${index}`;
  if (state === 'lit' || state === 'lasting') return { def: <TerritoryGradient key={id} id={id} nodeId={nodeId} />, fill: `url(#${id})`, opacity: state === 'lit' ? .8 : .94 };
  if (state === 'underway') return {
    def: <pattern key={id} id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="6" height="6" fill={LAND} />
      <path d="M0 0v6" stroke={territoryColor(nodeId)} strokeOpacity=".34" strokeWidth="1.6" />
    </pattern>, fill: `url(#${id})`, opacity: 1,
  };
  if (state === 'read') {
    // The more you have read about a place, the denser its points of light: one book is a faint scatter.
    const strength = Math.min(1, Math.max(1, reads) / 5);
    const r = (.56 + .26 * strength).toFixed(2);
    const alpha = (.5 + .42 * strength).toFixed(2);
    return {
      def: <pattern key={id} id={id} width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill={LAND} />
        <circle cx="1.25" cy="1.25" r={r} fill={territoryColor(nodeId)} fillOpacity={alpha} />
        <circle cx="3.75" cy="3.75" r={r} fill={territoryColor(nodeId)} fillOpacity={alpha} />
      </pattern>, fill: `url(#${id})`, opacity: 1,
    };
  }
  return { def: null, fill: LAND, opacity: 1 };
}
export const STATE_SUFFIX: Record<NonNullable<PlaceState>, string> = { lasting: ', Lasting', lit: ', lit', underway: ', underway', read: ', read about' };
/** The frame's own straight edges sit just outside the view, so the land runs off the page. */
const INSET = 5;

function lines(name: string): string[] {
  const words = name.split(' ');
  if (name.length <= 12 || words.length === 1) return [name];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

export const MindMap = memo(function MindMap({ fieldId, territories, width = 360, height = 250, selected, onSelect, compact }: {
  fieldId: string;
  territories: readonly Territory[];
  width?: number;
  height?: number;
  selected?: string | null;
  onSelect?: (nodeId: string) => void;
  /** Labels only on your land. */
  compact?: boolean;
}) {
  const uid = useId().replaceAll(':', '_');
  const { regions, shapes } = useMemo(() => {
    const field = catalog.get(fieldId)!;
    const clip: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
    const regions = engine.layout(field, catalog.getChildren(field), clip);
    return { regions, shapes: createShapeScope(regions, { frame: clip, pxPerUnit: 1, sibling: 1 }).cells };
  }, [fieldId, width, height]);
  const state = new Map(territories.map(t => [t.nodeId, t.state]));
  const reads = new Map(territories.map(t => [t.nodeId, t.reads ?? 1]));
  const fresh = territories.filter(t => t.glow && (t.state === 'lit' || t.state === 'lasting')).map(t => ({ id: t.nodeId, d: shapes.get(t.nodeId)?.path ?? '', glow: t.glow! }));
  const key = (event: KeyboardEvent, id: string) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(id); } };
  return (
    <svg className="lib-map" viewBox={`${INSET} ${INSET} ${width - INSET * 2} ${height - INSET * 2}`} preserveAspectRatio="xMidYMid slice" role="group" aria-label={`Your map of ${catalog.get(fieldId)?.name}`}>
      <defs>{regions.map(region => cellPaint(uid, region.node.id, region.node.index, state.get(region.node.id) ?? null, reads.get(region.node.id)).def)}</defs>
      <rect width={width} height={height} fill="#070a14" />
      <g>
        {regions.map(region => {
          const s = state.get(region.node.id) ?? null;
          const paint = cellPaint(uid, region.node.id, region.node.index, s, reads.get(region.node.id));
          const label = `${region.node.name}${s ? STATE_SUFFIX[s] : ''}`;
          return <path
            key={region.node.id}
            className={`lib-cell${s ? ` is-${s}` : ''}${selected === region.node.id ? ' is-selected' : ''}`}
            d={shapes.get(region.node.id)?.path}
            fill={paint.fill}
            fillOpacity={paint.opacity}
            stroke="#04060d"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            data-place-id={region.node.id}
            data-state={s ?? 'dark'}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? label : undefined}
            onClick={onSelect ? () => onSelect(region.node.id) : undefined}
            onKeyDown={onSelect ? event => key(event, region.node.id) : undefined}
          />;
        })}
      </g>
      <FreshGlow items={fresh} />
      <TerritoryLight regions={regions} shapes={shapes} />
      <TerritoryBorders regions={regions} shapes={shapes} namespace={`library-${uid}`} />
      <g className="lib-map-labels" aria-hidden="true">
        {regions.map(region => {
          const s = state.get(region.node.id);
          if (compact && !s) return null;
          const text = lines(region.node.name);
          // Keep the whole name on the page: a label at the frame slides inward.
          const half = Math.max(...text.map(line => line.length)) * 2.7 + 4;
          const x = Math.min(width - INSET - half, Math.max(INSET + half, region.centroid[0]));
          const y = Math.min(height - INSET - 14, Math.max(INSET + 12, region.centroid[1]));
          return <text key={region.node.id} x={x} y={y - (text.length - 1) * 5.5} className={`lib-label${s ? ` is-${s}` : ''}`} textAnchor="middle">
            {text.map((line, i) => <tspan key={i} x={x} dy={i ? 11 : 3.5}>{line}</tspan>)}
          </text>;
        })}
      </g>
    </svg>
  );
});

/** One territory's own outline, drawn alone: the thumbnail beside a lit row. */
export function PlaceGlyph({ nodeId, size = 52 }: { nodeId: string; size?: number }) {
  const uid = useId().replaceAll(':', '_');
  const shape = useMemo(() => {
    const parentId = catalog.get(nodeId)?.parentId;
    const field = parentId ? catalog.get(parentId) : undefined;
    if (!field) return null;
    const clip: Polygon = [[0, 0], [360, 0], [360, 250], [0, 250]];
    const regions = engine.layout(field, catalog.getChildren(field), clip);
    const region = regions.find(r => r.node.id === nodeId);
    if (!region) return null;
    const path = createShapeScope(regions, { frame: clip, pxPerUnit: 1, sibling: 1 }).cells.get(nodeId)?.path;
    const { x, y, width, height } = region.bounds;
    const side = Math.max(width, height) * 1.12;
    return { path, box: `${x + width / 2 - side / 2} ${y + height / 2 - side / 2} ${side} ${side}` };
  }, [nodeId]);
  if (!shape?.path) return <span className="lib-glyph" style={{ width: size, height: size, ['--place' as string]: territoryColor(nodeId) }} aria-hidden="true" />;
  return <svg className="lib-glyph" width={size} height={size} viewBox={shape.box} aria-hidden="true">
    <defs><TerritoryGradient id={`${uid}-g`} nodeId={nodeId} /></defs>
    <path d={shape.path} fill={`url(#${uid}-g)`} fillOpacity=".86" stroke={territoryColor(nodeId)} strokeOpacity=".9" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
  </svg>;
}
