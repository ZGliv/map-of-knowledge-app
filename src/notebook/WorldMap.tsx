import { memo, useId, useMemo, type KeyboardEvent } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { TerritoryBorders, TerritoryLight } from '../components/TerritoryBorders';
import { FreshGlow } from '../components/FreshGlow';
import { createShapeScope } from '../spatial/MapShape';
import type { Polygon } from '../spatial/types';
import type { Territory } from './journal';
import { cellPaint, engine, STATE_SUFFIX } from './MindMap';

// Your map of all knowledge: the atlas's eight subjects, each holding its fields, laid out by the
// same engine and painted only by your own record: lit and Lasting land filled, underway hatched,
// read-about stippled. The subjects keep their colored borders so the map reads like the Atlas.

const INSET = 5;
const words = (name: string) => name.split(' ');
function lines(name: string, max: number): string[] {
  if (name.length <= max || words(name).length === 1) return [name];
  const half = Math.ceil(words(name).length / 2);
  return [words(name).slice(0, half).join(' '), words(name).slice(half).join(' ')];
}

export const WorldMap = memo(function WorldMap({ fields, width = 360, height = 250, selected, onSelect }: {
  /** Every field (the subjects' children), each with its state. */
  fields: readonly Territory[];
  width?: number;
  height?: number;
  selected?: string | null;
  onSelect?: (nodeId: string) => void;
}) {
  const uid = useId().replaceAll(':', '_');
  const map = useMemo(() => {
    const clip: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
    const subjects = engine.layout(catalog.root, catalog.getChildren(catalog.root), clip);
    const scope = createShapeScope(subjects, { frame: clip, pxPerUnit: 1, sibling: 1 });
    const inside = subjects.map(subject => {
      const cells = engine.layout(subject.node, catalog.getChildren(subject.node), subject.polygon);
      return { subject, cells, shapes: scope.inside(subject.node.id, cells) };
    });
    return { subjects, scope, inside };
  }, [width, height]);
  const state = new Map(fields.map(t => [t.nodeId, t.state]));
  const reads = new Map(fields.map(t => [t.nodeId, t.reads ?? 1]));
  const key = (event: KeyboardEvent, id: string) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(id); } };
  const cells = map.inside.flatMap(({ cells: list, shapes }) => list.map((cell, index) => ({ cell, index, path: shapes.get(cell.node.id)?.path })));
  const lit = new Set(cells.filter(({ cell }) => state.get(cell.node.id)).map(({ cell }) => cell.node.parentId));
  const glow = new Map(fields.filter(t => t.glow && (t.state === 'lit' || t.state === 'lasting')).map(t => [t.nodeId, t.glow!]));
  const fresh = cells.filter(({ cell }) => glow.has(cell.node.id)).map(({ cell, path }) => ({ id: cell.node.id, d: path ?? '', glow: glow.get(cell.node.id)! }));
  return (
    <svg className="lib-map is-world" viewBox={`${INSET} ${INSET} ${width - INSET * 2} ${height - INSET * 2}`} preserveAspectRatio="xMidYMid slice" role="group" aria-label="Your map of all knowledge">
      <defs>{cells.map(({ cell }, i) => cellPaint(uid, cell.node.id, i, state.get(cell.node.id) ?? null, reads.get(cell.node.id)).def)}</defs>
      <rect width={width} height={height} fill="#070a14" />
      <g>
        {cells.map(({ cell, path }, i) => {
          const s = state.get(cell.node.id) ?? null;
          const paint = cellPaint(uid, cell.node.id, i, s, reads.get(cell.node.id));
          return <path
            key={cell.node.id}
            className={`lib-cell${s ? ` is-${s}` : ''}${selected === cell.node.id ? ' is-selected' : ''}`}
            d={path}
            fill={paint.fill}
            fillOpacity={paint.opacity}
            stroke="#04060d"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            data-place-id={cell.node.id}
            data-state={s ?? 'dark'}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? (s ? 0 : -1) : undefined}
            aria-label={onSelect ? `${cell.node.name}${s ? STATE_SUFFIX[s] : ''}` : undefined}
            onClick={onSelect ? () => onSelect(cell.node.id) : undefined}
            onKeyDown={onSelect ? event => key(event, cell.node.id) : undefined}
          />;
        })}
      </g>
      <FreshGlow items={fresh} />
      <TerritoryLight regions={map.subjects} shapes={map.scope.cells} />
      <TerritoryBorders regions={map.subjects} shapes={map.scope.cells} namespace={`library-world-${uid}`} />
      <g className="lib-map-labels" aria-hidden="true">
        {map.inside.flatMap(({ cells: list }) => list.filter(cell => state.get(cell.node.id)).map(cell => {
          const s = state.get(cell.node.id)!;
          const text = lines(cell.node.name, 11);
          const half = Math.max(...text.map(line => line.length)) * 2.1 + 3;
          const x = Math.min(width - INSET - half, Math.max(INSET + half, cell.centroid[0]));
          const y = Math.min(height - INSET - 10, Math.max(INSET + 9, cell.centroid[1]));
          return <text key={cell.node.id} x={x} y={y - (text.length - 1) * 4.2} className={`lib-label is-field is-${s}`} textAnchor="middle">
            {text.map((line, i) => <tspan key={i} x={x} dy={i ? 8.4 : 2.6}>{line}</tspan>)}
          </text>;
        }))}
        {map.subjects.filter(subject => !lit.has(subject.node.id)).map(subject => {
          // A subject is named only while none of its fields carries a name of its own.
          const x = Math.min(width - INSET - 30, Math.max(INSET + 30, subject.centroid[0]));
          const y = Math.min(height - INSET - 8, Math.max(INSET + 12, subject.centroid[1] + 3));
          return <text key={subject.node.id} x={x} y={y} className="lib-label is-subject" textAnchor="middle" style={{ fill: territoryColor(subject.node.id) }}>{subject.node.name}</text>;
        })}
      </g>
    </svg>
  );
});
