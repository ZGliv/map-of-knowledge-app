import { memo } from 'react';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import { createShapeScope } from '../../spatial/MapShape';
import type { Polygon } from '../../spatial/types';
import { NavigationLayoutResolver } from '../../spatial/NavigationMotion';
import { SpatialLayoutEngine } from '../../spatial/SpatialLayoutEngine';

/*
 * A place's small map mark: the Atlas's own screen for the level the place sits on, drawn the way the
 * Atlas draws it (same resolver, same engine, same frame: the map's size on this device, portrait on a
 * phone, and the same curved borders), every neighbour as a hairline and the place itself filled in
 * its own colour. Fly the Atlas to the place's parent and this is what fills the screen.
 */

interface Cell { readonly id: string; readonly path: string; readonly box: { x: number; y: number; w: number; h: number } }
interface Drawn { readonly cells: readonly Cell[]; readonly w: number; readonly h: number }
const drawn = new Map<string, Drawn | null>();
const layouts = new NavigationLayoutResolver(catalog, new SpatialLayoutEngine());

/** The Atlas's frame: the map's own size (it stays mounted, hidden, while the Library shows). */
function atlasFrame(): { w: number; h: number } {
  const map = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.map-system');
  const w = map?.clientWidth || (typeof window === 'undefined' ? 390 : window.innerWidth) || 390;
  const h = map?.clientHeight || (typeof window === 'undefined' ? 844 : window.innerHeight) || 844;
  return { w: Math.round(w), h: Math.round(h) };
}

function drawLevel(parentId: string): Drawn | null {
  const { w, h } = atlasFrame();
  const key = `${parentId}|${w}x${h}`;
  if (drawn.has(key)) return drawn.get(key)!;
  const parent = catalog.get(parentId);
  let result: Drawn | null = null;
  if (parent && catalog.getChildren(parent).length) {
    const frame: Polygon = [[0, 0], [0, h], [w, h], [w, 0]];
    try {
      const regions = layouts.layoutForViewport(parent, frame);
      const scope = createShapeScope(regions, { frame, pxPerUnit: 1, sibling: 1 });
      const cells = regions.map(r => ({ id: r.node.id, path: scope.cells.get(r.node.id)?.path ?? '', box: { x: r.bounds.x, y: r.bounds.y, w: r.bounds.width, h: r.bounds.height } })).filter(c => c.path);
      if (cells.length) result = { cells, w, h };
    } catch { result = null; }
  }
  if (drawn.size > 400) drawn.delete(drawn.keys().next().value!);
  drawn.set(key, result);
  return result;
}

/** The place a mark draws: the node itself, or (when it is an only child, which would fill its whole
 * frame) the nearest ancestor that has neighbours to be told apart from. */
function shown(nodeId: string): string | null {
  let node = catalog.get(nodeId);
  while (node?.parentId) {
    const parent = catalog.get(node.parentId);
    if (parent && catalog.getChildren(parent).length > 1) return node.id;
    node = parent;
  }
  return null;
}

/**
 * `size` is the mark's longer side. A small mark is a square cut of that screen around the place, so its
 * shape and its neighbours read at a glance; `whole` draws the whole screen (portrait on a phone), for a
 * header with the room to show where on the Atlas the place sits.
 */
export const MapMark = memo(function MapMark({ nodeId, size = 34, whole = false }: { nodeId: string; size?: number; whole?: boolean }) {
  const id = shown(nodeId);
  const node = id ? catalog.get(id) : undefined;
  if (!id || !node?.parentId) return null;
  const level = drawLevel(node.parentId);
  const cell = level?.cells.find(c => c.id === id);
  if (!level || !cell) return null;
  let view: { x: number; y: number; w: number; h: number };
  if (whole) view = { x: 0, y: 0, w: level.w, h: level.h };
  else {
    // The place and a ring of its neighbours: the cell's own size again on every side, kept inside the screen.
    const side = Math.min(level.w, level.h, Math.max(cell.box.w, cell.box.h) * 2.4);
    const cx = cell.box.x + cell.box.w / 2, cy = cell.box.y + cell.box.h / 2;
    view = { x: Math.max(0, Math.min(level.w - side, cx - side / 2)), y: Math.max(0, Math.min(level.h - side, cy - side / 2)), w: side, h: side };
  }
  const wide = view.w >= view.h;
  const width = Math.round(wide ? size : size * view.w / view.h);
  const height = Math.round(wide ? size * view.h / view.w : size);
  return <svg className={`lc-mark${whole ? ' is-whole' : ''}`} width={width} height={height} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} aria-hidden="true" data-mark={id}>
    <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="currentColor" fillOpacity=".06" />
    {level.cells.map(c => c.id === id
      ? <path key={c.id} d={c.path} fill={territoryColor(nodeId)} />
      : <path key={c.id} d={c.path} fill="none" stroke="currentColor" strokeOpacity=".6" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
  </svg>;
});
