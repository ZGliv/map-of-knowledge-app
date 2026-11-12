import { useId, type CSSProperties } from 'react';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import { TerritoryGradient } from '../../components/TerritoryGradient';
import { createShapeScope } from '../../spatial/MapShape';
import type { Polygon, RegionLayout } from '../../spatial/types';
import { engine } from '../../notebook/MindMap';
import type { Mark } from './indexModel';

/** A place's color, for the CSS of everything that carries it. */
export const hue = (nodeId: string | null | undefined): CSSProperties | undefined => nodeId ? { ['--hue' as string]: territoryColor(nodeId) } as CSSProperties : undefined;

export const MARK_WORD: Record<NonNullable<Mark>, string> = { refresh: 'Ready to refresh', lasting: 'Lasting', proved: 'Proved', underway: 'Underway' };

// A place among its siblings as the atlas lays them out, once per parent (the layout is the map's own).
const FRAME = { width: 360, height: 250 } as const;
interface Layout { readonly regions: readonly RegionLayout[]; readonly paths: ReadonlyMap<string, string> }
const LAYOUTS = new Map<string, Layout | null>();
function layoutOf(parentId: string): Layout | null {
  if (LAYOUTS.has(parentId)) return LAYOUTS.get(parentId)!;
  const parent = catalog.get(parentId);
  let layout: Layout | null = null;
  if (parent) {
    const clip: Polygon = [[0, 0], [FRAME.width, 0], [FRAME.width, FRAME.height], [0, FRAME.height]];
    const regions = engine.layout(parent, catalog.getChildren(parent), clip);
    const cells = createShapeScope(regions, { frame: clip, pxPerUnit: 1, sibling: 1 }).cells;
    layout = { regions, paths: new Map(regions.flatMap(r => { const path = cells.get(r.node.id)?.path; return path ? [[r.node.id, path] as const] : []; })) };
  }
  LAYOUTS.set(parentId, layout);
  return layout;
}

// The outline of a place as the atlas draws it.
const SHAPES = new Map<string, { path: string; box: string } | null>();
function shapeOf(nodeId: string) {
  if (SHAPES.has(nodeId)) return SHAPES.get(nodeId)!;
  let shape: { path: string; box: string } | null = null;
  const parentId = catalog.get(nodeId)?.parentId;
  const layout = parentId ? layoutOf(parentId) : null;
  const region = layout?.regions.find(r => r.node.id === nodeId);
  const path = layout?.paths.get(nodeId);
  if (region && path) {
    const { x, y, width, height } = region.bounds;
    const side = Math.max(width, height) * 1.18;
    shape = { path, box: `${x + width / 2 - side / 2} ${y + height / 2 - side / 2} ${side} ${side}` };
  }
  SHAPES.set(nodeId, shape);
  return shape;
}

/** The small map mark: the place's own outline. Filled with its light once proved, drawn in line
 * while it is only gathered into, and dimmed when its refresh is due. */
export function MapMark({ nodeId, mark, size = 18 }: { nodeId: string; mark?: Mark; size?: number }) {
  const uid = useId().replaceAll(':', '_');
  const shape = shapeOf(nodeId);
  const color = territoryColor(nodeId);
  const lit = mark === 'proved' || mark === 'lasting' || mark === 'refresh';
  if (!shape) return <span className="lbx-mapmark is-dot" style={{ width: size, height: size, ['--hue' as string]: color } as CSSProperties} aria-hidden="true" />;
  return <svg className={`lbx-mapmark${mark ? ` is-${mark}` : ''}`} width={size} height={size} viewBox={shape.box} aria-hidden="true">
    {lit && <defs><TerritoryGradient id={`${uid}-g`} nodeId={nodeId} /></defs>}
    <path d={shape.path} fill={lit ? `url(#${uid}-g)` : mark === 'underway' ? color : 'none'} fillOpacity={mark === 'refresh' ? .38 : lit ? .92 : .22}
      stroke={color} strokeOpacity={lit ? .95 : .8} strokeWidth={lit ? 1 : 1.15} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
  </svg>;
}

const LAND = '#0c1124';
const clamp = (value: number, low: number, high: number) => low > high ? (low + high) / 2 : Math.min(high, Math.max(low, value));

/** Where a place sits: its own cell lit among its neighbours drawn in line, framed on it. A territory
 * is shown on the whole map of knowledge; a deeper place close enough that its neighbours name it. */
export function Locator({ nodeId }: { nodeId: string }) {
  const node = catalog.get(nodeId);
  const layout = node?.parentId ? layoutOf(node.parentId) : null;
  const region = layout?.regions.find(r => r.node.id === nodeId);
  if (!node || !layout || !region) return null;
  const whole = node.depth <= 1;
  const aspect = whole ? FRAME.width / FRAME.height : 1.8;
  // Frame the cell with room around it, never past the map's own edge.
  const { x, y, width, height } = region.bounds;
  let w = whole ? FRAME.width : Math.min(FRAME.width, Math.max(width * 2.4, height * 2.4 * aspect, 170));
  let h = w / aspect;
  if (h > FRAME.height) { h = FRAME.height; w = h * aspect; }
  const vx = whole ? 0 : clamp(x + width / 2 - w / 2, 0, FRAME.width - w);
  const vy = whole ? 0 : clamp(y + height / 2 - h / 2, 0, FRAME.height - h);
  const color = territoryColor(nodeId);
  // Names set in the page's own type over the drawing: the place's own first, then its neighbours
  // nearest first, each only where it fits whole and clear of the names already set.
  const LABEL_W = 360, CHAR = 6.1, LINE = 15, MAX = LABEL_W * .34;
  const sx = LABEL_W, sy = LABEL_W / aspect;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const [hx, hy] = region.centroid;
  const names = [...layout.regions].sort((a, b) => a.node.id === nodeId ? -1 : b.node.id === nodeId ? 1
    : Math.hypot(a.centroid[0] - hx, a.centroid[1] - hy) - Math.hypot(b.centroid[0] - hx, b.centroid[1] - hy)).flatMap(r => {
    const left = (r.centroid[0] - vx) / w, top = (r.centroid[1] - vy) / h;
    const width = Math.min(r.node.name.length * CHAR, MAX), lines = Math.ceil(r.node.name.length * CHAR / MAX);
    const box = { x0: left * sx - width / 2 - 5, x1: left * sx + width / 2 + 5, y0: top * sy - lines * LINE / 2 - 3, y1: top * sy + lines * LINE / 2 + 3 };
    const inside = box.x0 > 0 && box.x1 < sx && box.y0 > 0 && box.y1 < sy;
    if (r.node.id !== nodeId && (!inside || placed.some(p => box.x0 < p.x1 && p.x0 < box.x1 && box.y0 < p.y1 && p.y0 < box.y1))) return [];
    placed.push(box);
    return [{ id: r.node.id, name: r.node.name, left: Math.min(.9, Math.max(.1, left)), top: Math.min(.9, Math.max(.1, top)) }];
  });
  return <span className={`lbx-locator-map${whole ? ' is-whole' : ''}`} style={{ aspectRatio: `${aspect}` }}>
    <svg viewBox={`${vx} ${vy} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x={vx} y={vy} width={w} height={h} fill="#070a14" />
      {layout.regions.map(r => r.node.id === nodeId ? null
        : <path key={r.node.id} d={layout.paths.get(r.node.id)} fill={LAND} stroke={territoryColor(r.node.id)} strokeOpacity=".34" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)}
      <path d={layout.paths.get(nodeId)} fill={color} fillOpacity=".5" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" data-lbx-here={nodeId} />
    </svg>
    {names.map(n => <span key={n.id} className={n.id === nodeId ? 'is-here' : undefined} style={{ left: `${n.left * 100}%`, top: `${n.top * 100}%` }}>{n.name}</span>)}
  </span>;
}

/** Small line icons in the index's own weight. */
export type IconName = 'search' | 'plus' | 'close' | 'back' | 'arrow' | 'play' | 'chevron' | 'fold' | 'map' | 'reel' | 'quote' | 'question' | 'link';
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'chevron' && <path d="m9.5 6 6 6-6 6" />}
    {name === 'fold' && <path d="m6 9.5 6 6 6-6" />}
    {name === 'arrow' && <path d="M5 12h13m-5-5 5 5-5 5" />}
    {name === 'play' && <path d="M9 6.8v10.4l8.2-5.2Z" fill="currentColor" stroke="none" />}
    {name === 'map' && <><path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5Z" /><path d="M9 4v13.5M15 6.5V20" /></>}
    {name === 'reel' && <><rect x="6.5" y="3.5" width="11" height="17" rx="2.4" /><path d="M10.6 9.6v4.8l3.9-2.4Z" fill="currentColor" stroke="none" /></>}
    {name === 'link' && <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>}
  </svg>;
}
