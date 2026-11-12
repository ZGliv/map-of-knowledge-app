import { catalog } from '../core/catalog';
import { subjectTheme, territoryColor, territoryHueRange } from '../core/territoryTheme';
import { hashString } from '../spatial/deterministic';
import { blendWeights, placeWorldOnRing, polygonArea, sizeAreasBy, polygonCentroid, SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from '../spatial/types';

/*
 * The atlas as one mosaic, all the way down: every level's territories are subdivided into their
 * descendants to the last leaf, and each leaf is painted. Unlearned land is a shade of grey, learned
 * land its own colour. Both shades come from the territory's place in its subject's spectrum
 * (territoryHueRange): neighbours sit next to each other on it, so the shades run as one gradient
 * across a subject however deep you look. Positions are never stored: the layout is worked out from
 * the tree on every paint, so a new place simply takes its share of its parent.
 *
 * Painted once per resting level into a bitmap. A flight zooms the bitmap, not thousands of paths.
 */

const SUBJECT_BANDS = new Map<string, readonly [number, number]>();
const band = (subjectId: string) => {
  let range = SUBJECT_BANDS.get(subjectId);
  if (!range) SUBJECT_BANDS.set(subjectId, range = territoryHueRange(subjectId));
  return range;
};

/** Where a territory sits along its subject's spectrum, 0 to 1. */
function spectrumAt(nodeId: string): number {
  const subject = subjectTheme(nodeId);
  if (!subject) return .5;
  const [a, b] = band(subject.nodeId);
  const [x, y] = territoryHueRange(nodeId);
  return b > a ? Math.max(0, Math.min(1, ((x + y) / 2 - a) / (b - a))) : .5;
}

/**
 * How much lighter or darker a territory is than the middle: half its parent's offset, plus its own
 * place among its siblings. Siblings always span a clear range at every depth, and a place's subtree
 * still leans toward its shade, so zoomed out the steps read as one gradient and zoomed in as distinct
 * neighbours.
 */
const offsets = new Map<string, number>();
function offsetOf(nodeId: string): number {
  const known = offsets.get(nodeId);
  if (known !== undefined) return known;
  const node = catalog.get(nodeId);
  const parent = node?.parentId ? catalog.get(node.parentId) : undefined;
  let offset = 0;
  if (node && parent && node.depth >= 2) {
    const siblings = catalog.getChildren(parent);
    const rank = siblings.length > 1 ? node.index / (siblings.length - 1) - .5 : 0;
    offset = offsetOf(parent.id) * .55 + rank * .5;
  }
  offsets.set(nodeId, offset);
  return offset;
}
const shade = (nodeId: string) => Math.max(0, Math.min(1, .5 + offsetOf(nodeId) + (spectrumAt(nodeId) - .5) * .2 + ((hashString(nodeId) % 1000) / 1000 - .5) * .05));

/**
 * Prototype switch for how shades are laid across the land, read once at load from `?shade=`:
 * - rank: each place a step from its siblings, as above (the look before the wheel)
 * - smooth: one gradient across each subject, by where a place sits in it, bright in one corner to
 *   deep in the other, its colour sliding along the subject's band of hues the same way
 * - radial: the same, bright at the subject's heart and deepening toward its edges
 * - ring (default): the subjects sit around the map in the order of the colour wheel, and every place takes its
 *   hue from where it sits on that wheel, so the whole map is one ring of colour; inside it, hue and
 *   depth drift in soft patches at every scale, so each area is many colours, never one
 */
export type ShadeMode = 'rank' | 'smooth' | 'radial' | 'ring';
export const SHADE_MODE: ShadeMode = (() => {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get('shade');
    return value === 'smooth' || value === 'radial' || value === 'rank' ? value : 'ring';
  } catch { return 'ring'; }
})();

/*
 * Where a place sits in its subject, 0 to 1 on each axis, from the subject laid out in a square.
 * Every territory places its children by one arrangement stretched to its box (SpatialLayoutEngine),
 * so a place's spot within its subject's box is the same on any screen and at any zoom: its colour
 * never changes as the map re-fits.
 */
const CANVAS = 1000;
const SUBJECT_SQUARE: Polygon = [[0, 0], [0, CANVAS], [CANVAS, CANVAS], [CANVAS, 0]];
const canonicalEngine = new SpatialLayoutEngine();
const canonical = new Map<string, Polygon>();
function canonicalPolygon(node: KnowledgeNode): Polygon {
  const known = canonical.get(node.id);
  if (known) return known;
  const parent = node.parentId ? catalog.get(node.parentId) : undefined;
  if (!parent || node.depth <= (SHADE_MODE === 'ring' ? 0 : 1)) {
    const outline = SHADE_MODE === 'ring' ? WORLD : SUBJECT_SQUARE;
    canonical.set(node.id, outline);
    return outline;
  }
  const outline = canonicalPolygon(parent);
  const kids = catalog.getChildren(parent);
  const cells = outline.length >= 3 && polygonArea(outline) > 1e-3 ? canonicalEngine.layout(parent, kids, outline) : [];
  for (const kid of kids) canonical.set(kid.id, cells.find(cell => cell.node.id === kid.id && cell.polygon.length >= 3)?.polygon ?? outline);
  return canonical.get(node.id)!;
}
// The world laid out once at a phone's proportions: the ring's angles are read from it.
const WORLD_HEIGHT = CANVAS * 2.165;
const WORLD: Polygon = [[0, 0], [0, WORLD_HEIGHT], [CANVAS, WORLD_HEIGHT], [CANVAS, 0]];

/**
 * How the subjects go round, read once at load from `?ring=` (with `?shade=ring`). All keep the
 * wheel's order, so every border is a neighbouring colour:
 * - even: equal steps on an oval, fully balanced
 * - organic: each subject's step sized by how much it holds, its distance from the middle varied
 * - offset: the ring's middle pushed up and left, the oval tipped, so one side swells
 * - spiral: the ring winds outward from one subject near the middle
 * - today: today's places, the wheel's colours handed out around them instead (core/territoryTheme.ts)
 * - bold (default): organic, with sizes pushed further apart and the spots left unbalanced, so the land is lopsided
 */
type RingShape = 'even' | 'organic' | 'offset' | 'spiral' | 'today' | 'bold';
const RING_SHAPE: RingShape = (() => {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get('ring');
    return value === 'even' || value === 'offset' || value === 'spiral' || value === 'today' || value === 'organic' ? value : 'bold';
  } catch { return 'bold'; }
})();
const RING_MIDDLE: Point = RING_SHAPE === 'offset' ? [.44, .44] : RING_SHAPE === 'spiral' ? [.52, .47] : [.5, .5];
const WORLD_CENTRE: Point = [RING_MIDDLE[0] * CANVAS, RING_MIDDLE[1] * WORLD_HEIGHT];
const leavesUnder = (node: KnowledgeNode): number => {
  const kids = catalog.getChildren(node);
  return kids.length ? kids.reduce((sum, kid) => sum + leavesUnder(kid), 0) : 1;
};
if (SHADE_MODE === 'ring' && RING_SHAPE !== 'today') {
  const wheel = [...catalog.getChildren(catalog.root)].sort((a, b) => territoryHueRange(a.id)[0] - territoryHueRange(b.id)[0]);
  const weight = (node: KnowledgeNode) => RING_SHAPE === 'even' ? 1 : RING_SHAPE === 'bold' ? leavesUnder(node) ** 1.5 : Math.sqrt(leavesUnder(node));
  const total = wheel.reduce((sum, node) => sum + weight(node), 0);
  const spots = new Map<string, Point>();
  let turn = RING_SHAPE === 'offset' ? .08 : RING_SHAPE === 'spiral' ? -.1 : 0;
  wheel.forEach((node, rank) => {
    const step = weight(node) / total;
    const middle = turn + step / 2;
    turn += step;
    const wobble = RING_SHAPE === 'even' ? 0 : ((hashString(node.id) % 1000) / 1000 - .5);
    const reach = RING_SHAPE === 'spiral' ? .07 + .34 * rank / (wheel.length - 1)
      : RING_SHAPE === 'organic' ? .3 + wobble * .14 : RING_SHAPE === 'bold' ? .29 + wobble * .2 : RING_SHAPE === 'offset' ? .32 + wobble * .1 : .3;
    const tilt = RING_SHAPE === 'offset' ? .5 : 0;
    const angle = (middle - .25) * Math.PI * 2;
    const [x, y] = [Math.cos(angle) * reach, Math.sin(angle) * reach * 1.06];
    spots.set(node.id, [RING_MIDDLE[0] + x * Math.cos(tilt) - y * Math.sin(tilt), RING_MIDDLE[1] + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  });
  placeWorldOnRing(child => spots.get(child.id) ?? [.5, .5], RING_SHAPE === 'even' ? 3 : RING_SHAPE === 'bold' ? 0 : 1);
  // Room by how much there is to learn: a place's share of its parent follows the places under it
  // (eased, so a small place never shrinks out of sight). `?size=equal` keeps every share equal.
  const sizes = new Map<string, number>();
  if (new URLSearchParams(globalThis.location?.search ?? '').get('size') !== 'equal') sizeAreasBy(node => {
    let size = sizes.get(node.id);
    if (size === undefined) sizes.set(node.id, size = leavesUnder(node) ** (RING_SHAPE === 'bold' && node.depth === 1 ? 2 : .75));
    return size;
  });
}
/** Clockwise turn around the world's centre from the top, 0 to 1. */
const turnOf = ([x, y]: Point) => ((Math.atan2(y - WORLD_CENTRE[1], x - WORLD_CENTRE[0]) / (Math.PI * 2) + .25) % 1 + 1) % 1;
const sweeps = new Map<string, readonly [number, number]>();
/** The turns a subject's land spans, unwrapped around its own middle. */
function sweepOf(subject: KnowledgeNode): readonly [number, number] {
  let known = sweeps.get(subject.id);
  if (known) return known;
  const outline = canonicalPolygon(subject);
  const middle = turnOf(polygonCentroid(outline));
  const turns = outline.map(point => { let t = turnOf(point) - middle; if (t > .5) t -= 1; if (t < -.5) t += 1; return t; });
  sweeps.set(subject.id, known = [middle + Math.min(...turns), middle + Math.max(...turns)]);
  return known;
}
// Soft patches at four scales (world units): hue and depth drift together across neighbours.
const OCTAVES = [[640, 13, .11], [210, 8, .08], [70, 5, .06], [24, 3, .05]] as const;
const drift = ([x, y]: Point, salt: number) => OCTAVES.reduce(([hue, depth], [length, hueSwing, depthSwing], octave) => {
  const a = 1.3 + octave * 2.1 + salt, b = a + 1.9;
  const wave = (Math.sin((x * Math.cos(a) + y * Math.sin(a)) * 2 * Math.PI / length + octave * 1.7 + salt)
    + Math.sin((x * Math.cos(b) + y * Math.sin(b)) * 2 * Math.PI / (length * 1.37) + octave * .9)) / 2;
  return [hue + wave * hueSwing, depth + wave * depthSwing];
}, [0, 0]);
const rings = new Map<string, { hue: number; depth: number; saturation: number }>();
/** A place on the wheel: its hue from its turn around the map, mapped into its subject's band. */
function ringAt(nodeId: string): { hue: number; depth: number; saturation: number } {
  let known = rings.get(nodeId);
  if (known) return known;
  const node = catalog.get(nodeId);
  const subject = subjectTheme(nodeId);
  if (!node || node.depth < 1 || !subject) { rings.set(nodeId, known = { hue: 153, depth: .5, saturation: .5 }); return known; }
  const subjectNode = catalog.get(subject.nodeId)!;
  const centre = polygonCentroid(canonicalPolygon(node));
  const [from, to] = sweepOf(subjectNode);
  let turn = turnOf(centre);
  if (turn < from - .5) turn += 1;
  if (turn > to + .5) turn -= 1;
  const along = to > from ? Math.max(0, Math.min(1, (turn - from) / (to - from))) : .5;
  const [a, b] = band(subject.nodeId);
  const [hueDrift, depthDrift] = drift(centre, 0);
  const [, saturationDrift] = drift(centre, 3.1);
  const grain = (hashString(nodeId) % 1000) / 1000 - .5;
  known = {
    hue: a + (b - a) * along + hueDrift + grain * 6,
    depth: Math.max(0, Math.min(1, .62 + depthDrift * 1.6 + grain * .1)),
    saturation: Math.max(.3, Math.min(.75, .55 + saturationDrift)),
  };
  rings.set(nodeId, known);
  return known;
}

const spots = new Map<string, number>();
/** How far along the subject's gradient a place sits: 0 at its bright end, 1 at its deep end. */
function gradientAt(nodeId: string): number {
  const known = spots.get(nodeId);
  if (known !== undefined) return known;
  const node = catalog.get(nodeId);
  let at = .5;
  if (node && node.depth >= 1) {
    const [x, y] = polygonCentroid(canonicalPolygon(node)).map(v => v / CANVAS);
    at = SHADE_MODE === 'radial' ? Math.min(1, Math.hypot(x - .5, y - .5) / Math.SQRT1_2) : (x * .45 + y * .55);
  }
  spots.set(nodeId, at);
  return at;
}
const hslToRgb = (hue: number, saturation: number, lightness: number): readonly number[] => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const h = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs(h % 2 - 1));
  const rgb = h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] : h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma] : h < 5 ? [x, 0, chroma] : [chroma, 0, x];
  return rgb.map(channel => (channel + lightness - chroma / 2) * 255);
};
/** A place's shade, 0 (deep) to 1 (bright), under the chosen arrangement. */
const brightness = (nodeId: string) => SHADE_MODE === 'rank' ? shade(nodeId) : SHADE_MODE === 'ring' ? ringAt(nodeId).depth : 1 - gradientAt(nodeId);

/** Unlearned: a shade of grey, a step apart from each neighbour. */
export function greyFor(nodeId: string): string {
  const lightness = .075 + brightness(nodeId) * .14;
  const v = Math.round(lightness * 255);
  // A cool grey, so the land belongs to the night sky around it.
  return `rgb(${v - 3},${v - 1},${v + 6})`;
}

/** Uncharted: fog. Below every grey, its steps squeezed to a third so the fog lies flat, and a touch
 * bluer, so it reads as unmapped night rather than land waiting to be lit. Taken from the same
 * brightness as the grey, so a fogged place and the fogged places inside it match at every zoom. */
export function fogFor(nodeId: string): string {
  const lightness = .052 + brightness(nodeId) * .045;
  const v = Math.round(lightness * 255);
  return `rgb(${v - 3},${v},${v + 9})`;
}

/** Learned: its own shade of its territory's colour, from deep to bright along the same steps. */
export function colourFor(nodeId: string): string {
  if (SHADE_MODE === 'ring') {
    const { hue, depth, saturation } = ringAt(nodeId);
    const k = .3 + depth * .7;
    return `rgb(${hslToRgb(hue, saturation, .65).map(v => Math.round(v * k + 10 * (1 - k))).join(',')})`;
  }
  if (SHADE_MODE !== 'rank') {
    const subject = subjectTheme(nodeId);
    const [a, b] = subject ? band(subject.nodeId) : [153, 153];
    const t = gradientAt(nodeId);
    const k = .22 + (1 - t) * .78;
    return `rgb(${hslToRgb(a + (b - a) * t, .53, .65).map(v => Math.round(v * k + 10 * (1 - k))).join(',')})`;
  }
  const hex = territoryColor(nodeId);
  const k = .16 + shade(nodeId) * .84;
  const mix = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k + 10 * (1 - k));
  return `rgb(${mix(1)},${mix(3)},${mix(5)})`;
}

/** How much of a territory is learned, 0 to 1: itself, or the mean of its children. A cell too small to
 * divide is painted at this share, so a place's colour shines through at every zoom. */
const shares = new WeakMap<(id: string) => boolean, Map<string, number>>();
export function shareOf(node: KnowledgeNode, learned: (id: string) => boolean): number {
  let known = shares.get(learned);
  if (!known) shares.set(learned, known = new Map());
  const cached = known.get(node.id);
  if (cached !== undefined) return cached;
  const kids = catalog.getChildren(node);
  const share = learned(node.id) ? 1 : kids.length ? kids.reduce((sum, kid) => sum + shareOf(kid, learned), 0) / kids.length : 0;
  known.set(node.id, share);
  return share;
}

const rgb = (colour: string) => colour.match(/\d+/g)!.map(Number);
function blend(from: string, to: string, t: number): string {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const a = rgb(from), b = rgb(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

/**
 * How the land is lit. Either the legacy test (is this place learned?), or the shelf's fill: how much
 * of each place is finished, 0 to 1, already rolled up over everything inside it (src/shelf/fill.ts),
 * with the places that have anything to explore at all; every other place is fog.
 */
export interface FillPaint { readonly fill: ReadonlyMap<string, number>; readonly charted?: ReadonlySet<string> }
export type Paint = ((id: string) => boolean) | FillPaint;

// Grey, colour and fog never change for a place, and the land asks for them once per cell per paint.
const tones = new Map<string, { grey: string; colour: string; fog: string }>();
const toneOf = (nodeId: string) => {
  let known = tones.get(nodeId);
  if (!known) tones.set(nodeId, known = { grey: greyFor(nodeId), colour: colourFor(nodeId), fog: fogFor(nodeId) });
  return known;
};
/** Steps of fill a cell is painted at: fine enough to see one finished minute, few enough to batch. */
const FILL_STEPS = 64;

/** A place's shade under the fill: fog when uncharted, else grey blended toward its colour by its fill. */
/** Uncharted under the fill: nothing to explore anywhere inside, and nothing finished. */
export const isFog = (nodeId: string, paint: Paint): boolean =>
  typeof paint !== 'function' && !!paint.charted && !paint.charted.has(nodeId) && !(paint.fill.get(nodeId)! > 0);
/** Fog's cell edges: a cool line, so the edges show without the territory's hue. */
const FOG_SEAM = 'rgb(70,84,112)';

export function fillShade(nodeId: string, { fill, charted }: FillPaint): string {
  const share = fill.get(nodeId) ?? 0;
  const tone = toneOf(nodeId);
  if (share <= 0) return charted && !charted.has(nodeId) ? tone.fog : tone.grey;
  return blend(tone.grey, tone.colour, Math.ceil(share * FILL_STEPS) / FILL_STEPS);
}

/** A place's shade: its colour where learned (or inside a learned place), grey where not, and for a
 * place drawn as one cell, between the two by its learned share. Under the fill, every level alike:
 * grey to colour by its fill, fog when uncharted (the fill already lights what is inside a learned place). */
export function shadeOf(node: KnowledgeNode, paint: Paint, lit = false): string {
  if (typeof paint !== 'function') return fillShade(node.id, paint);
  const learned = paint;
  if (lit || learned(node.id)) return colourFor(node.id);
  return catalog.getChildren(node).length ? blend(greyFor(node.id), colourFor(node.id), shareOf(node, learned)) : greyFor(node.id);
}

/** A short signature of a fill (or charted set) that changes whenever what it paints changes: the
 * per-level canvases are kept under it, so a finished item repaints once and nothing else does. */
export function paintKey(fill?: ReadonlyMap<string, number>, charted?: ReadonlySet<string>): string {
  if (!fill) return '';
  let hash = 2166136261;
  const mix = (text: string) => { for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); };
  for (const [id, value] of fill) { mix(id); hash = Math.imul(hash ^ Math.ceil(value * FILL_STEPS), 16777619); }
  const fillHash = hash >>> 0;
  hash = 2166136261;
  if (charted) for (const id of charted) mix(id);
  return `${fill.size}.${fillHash.toString(36)}|${charted ? `${charted.size}.${(hash >>> 0).toString(36)}` : '-'}`;
}

/** Below this many screen pixels² a place is one cell. */
export const SMALLEST = 4;

const bounds = (polygon: Polygon) => {
  const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x || 1, height: Math.max(...ys) - y || 1 };
};

/**
 * Where a place's children sit inside it: their sites (each child is the Voronoi cell of its site),
 * or null when the place is drawn as one cell. At rest a place is laid out afresh inside its own
 * shape, so every child is there, sized fairly, whatever the shape (see `restingSites`).
 */
export interface Placed { readonly sites: readonly Point[]; readonly weights?: readonly number[] }
export type Sites = (node: KnowledgeNode, real: Polygon) => Placed | null;

export const restingSites = (engine: SpatialLayoutEngine): Sites => (node, real) => {
  const kids = catalog.getChildren(node);
  if (!kids.length || real.length < 3 || polygonArea(real) < SMALLEST) return null;
  const cells = engine.layout(node, kids, real);
  return { sites: cells.map(child => child.site), weights: blendWeights(cells, cells, 0) };
};

/**
 * A flight's sites: each place laid out as at rest where the flight starts and where it lands, kept
 * as positions within its box, and slid between the two with the flight's reshape. A child moves
 * from its place in the departing view to its place in the arriving view the way the navigation moves
 * the territories themselves: the first frame is the departing land and the last the arriving, both
 * exactly, and no place appears or vanishes on the way.
 */
export function flightSites(engine: SpatialLayoutEngine, start: readonly RegionLayout[], end: readonly RegionLayout[]): (reshape: number) => Sites {
  const rest = restingSites(engine);
  const record = (regions: readonly RegionLayout[]) => {
    const into = new Map<string, Placed>();
    const walk = (node: KnowledgeNode, real: Polygon) => {
      const placed = rest(node, real);
      if (!placed) return;
      const box = bounds(real);
      into.set(node.id, { sites: placed.sites.map(([x, y]) => [(x - box.x) / box.width, (y - box.y) / box.height] as Point), weights: placed.weights });
      engine.layoutFromSites(node, catalog.getChildren(node), real, placed.sites, placed.weights).forEach(cell => walk(cell.node, cell.polygon));
    };
    for (const region of regions) if (region.polygon.length >= 3) walk(region.node, region.polygon);
    return into;
  };
  const from = record(start), to = record(end);
  return reshape => (node, real) => {
    const a = from.get(node.id), b = to.get(node.id);
    if (!a && !b) return null;
    const relative = a && b ? a.sites.map(([u, v], i) => [u + (b.sites[i][0] - u) * reshape, v + (b.sites[i][1] - v) * reshape] as Point) : (a ?? b)!.sites;
    const weights = a?.weights && b?.weights ? a.weights.map((w, i) => w + (b.weights![i] - w) * reshape) : (a ?? b)!.weights;
    const box = bounds(real), centre = polygonCentroid(real);
    const sites = relative.map(([u, v]) => {
      let site: Point = [box.x + u * box.width, box.y + v * box.height];
      // A site the shape does not hold this frame is drawn in toward its middle, so no child vanishes.
      for (let step = 0; step < 12 && !inside(site, real); step++) site = [centre[0] + (site[0] - centre[0]) * .8, centre[1] + (site[1] - centre[1]) * .8];
      return site;
    });
    return { sites, weights };
  };
}

const inside = ([x, y]: Point, polygon: Polygon): boolean => {
  let result = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index], [xj, yj] = polygon[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
};

export interface LandTop {
  readonly node: KnowledgeNode;
  /** The territory's polygon as the navigation lays it out: its children are fitted inside this. */
  readonly real: Polygon;
  /** The outline its border is drawn on (curved), as points and as a path: the land is cut to it. */
  readonly draw: Polygon;
  readonly path: string;
}

/**
 * The land of the territories in view, all the way down. Every territory is divided into exactly its
 * own children (fitted inside its real polygon, cut to its drawn outline), each of them into theirs,
 * until a place is too small to show more; a place too small to divide is one cell at its learned
 * share. So a territory always shows its true contents, and a learned place lights every cell of it
 * at every level above. Fills and seams are batched by shade and depth.
 */
export function drawLand(context: CanvasRenderingContext2D, tops: readonly LandTop[], { engine, learned, sites }: { engine: SpatialLayoutEngine; learned: Paint; sites: Sites }): void {
  const test = typeof learned === 'function' ? learned : null;
  context.lineJoin = 'round';
  for (const top of tops) {
    if (top.real.length < 3 || top.draw.length < 3) continue;
    const fills = new Map<string, Path2D>();
    const seams = new Map<string, { depth: number; colour: string; path: Path2D }>();
    const fill = (polygon: Polygon, colour: string) => {
      let path = fills.get(colour);
      if (!path) fills.set(colour, path = new Path2D());
      polygon.forEach(([x, y], index) => index ? path!.lineTo(x, y) : path!.moveTo(x, y));
      path.closePath();
    };
    const seam = (polygon: Polygon, depth: number, colour: string) => {
      const key = `${depth}|${colour}`;
      let batch = seams.get(key);
      if (!batch) seams.set(key, batch = { depth, colour, path: new Path2D() });
      polygon.forEach(([x, y], index) => index ? batch!.path.lineTo(x, y) : batch!.path.moveTo(x, y));
      batch.path.closePath();
    };
    const walk = (node: KnowledgeNode, real: Polygon, draw: Polygon, depth: number, lit: boolean) => {
      // Under the fill no place inherits "lit": its fill already says how much of it is finished.
      const on = test !== null && (lit || test(node.id));
      const placed = sites(node, real);
      if (!placed) { fill(draw, shadeOf(node, learned, on)); return; }
      const kids = catalog.getChildren(node);
      const reals = engine.layoutFromSites(node, kids, real, placed.sites, placed.weights);
      const draws = engine.layoutFromSites(node, kids, draw, placed.sites, blendWeights(reals, reals, 0));
      draws.forEach((cell, index) => {
        if (cell.polygon.length < 3) return;
        seam(cell.polygon, depth + 1, isFog(cell.node.id, learned) ? FOG_SEAM : territoryColor(cell.node.id));
        walk(cell.node, reals[index].polygon.length >= 3 ? reals[index].polygon : cell.polygon, cell.polygon, depth + 1, on);
      });
    };
    walk(top.node, top.real, top.draw, 0, false);
    context.save();
    context.clip(new Path2D(top.path));
    for (const [colour, path] of fills) { context.fillStyle = colour; context.fill(path); }
    for (const batch of [...seams.values()].sort((p, q) => q.depth - p.depth)) {
      context.globalAlpha = Math.max(.07, .34 - batch.depth * .07);
      context.strokeStyle = batch.colour;
      context.lineWidth = Math.max(.35, 1.1 - batch.depth * .2);
      context.stroke(batch.path);
    }
    context.globalAlpha = 1;
    context.restore();
  }
}
