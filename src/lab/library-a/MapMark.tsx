import { memo } from 'react';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import { createShapeScope } from '../../spatial/MapShape';
import type { Polygon } from '../../spatial/types';
import { engine } from '../../notebook/MindMap';
import type { PlaceState } from '../../notebook/journal';

/*
 * A place's map mark: its neighbourhood as the Atlas draws it (the same layout engine, the same cells),
 * in hairlines, with the place itself filled in its territory's colour. Proved land is solid; land with
 * nothing proved yet is only drawn round. A locator, the way a museum plan marks the room you are in.
 */

const W = 360, H = 250;
const FRAME: Polygon = [[0, 0], [W, 0], [W, H], [0, H]];
const SHAPES = new Map<string, Map<string, string>>();

function cellsOf(parentId: string): Map<string, string> {
  let cells = SHAPES.get(parentId);
  if (cells) return cells;
  const parent = catalog.get(parentId);
  cells = new Map();
  if (parent) {
    const regions = engine.layout(parent, catalog.getChildren(parent), FRAME);
    const scope = createShapeScope(regions, { frame: FRAME, pxPerUnit: 1, sibling: 1 }).cells;
    for (const region of regions) { const path = scope.get(region.node.id)?.path; if (path) cells.set(region.node.id, path); }
  }
  SHAPES.set(parentId, cells);
  return cells;
}

export const MapMark = memo(function MapMark({ nodeId, state, size = 30, ring }: { nodeId: string; state?: PlaceState; size?: number; ring?: boolean }) {
  // A place alone in its parent (the Black Death in the Medieval World, alone in History) is marked by
  // the first ancestor with neighbours to stand among.
  let here = catalog.get(nodeId);
  while (here?.parentId && catalog.getChildren(catalog.get(here.parentId)!).length < 3 && catalog.get(here.parentId)!.depth > 0) here = catalog.get(here.parentId);
  const parentId = here?.parentId ?? null;
  const cells = parentId ? cellsOf(parentId) : null;
  const color = territoryColor(nodeId);
  const proved = state === 'lit' || state === 'lasting';
  const own = here?.id ?? nodeId;
  if (!cells?.size || !cells.has(own)) return <span className="lxa-mark is-dot" style={{ width: size, height: size * H / W, ['--mark' as string]: color }} aria-hidden="true" />;
  return <svg className={`lxa-mark${proved ? ' is-proved' : ''}${ring ? ' is-ring' : ''}`} width={size} height={Math.round(size * H / W)} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ ['--mark' as string]: color }}>
    {[...cells].map(([id, d]) => id === own ? null : <path key={id} d={d} className="lxa-mark-cell" vectorEffect="non-scaling-stroke" />)}
    <path d={cells.get(own)} className="lxa-mark-here" vectorEffect="non-scaling-stroke" />
  </svg>;
});
