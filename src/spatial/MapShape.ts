import type { Point, Polygon } from './types';

/*
 * Curved borders: how a territory's polygon is DRAWN. Geometry, ownership and the
 * camera are untouched; every path here is derived from the same polygons.
 *
 * Each edge of a cell is one of three kinds:
 *  - frame: it lies on the viewport rectangle (the edge of the visible map) and stays straight;
 *  - inherited: it lies on the boundary of the cell that contains this one
 *    (a child region inside its parent, an earned footprint inside its place),
 *    so it follows that boundary's curve exactly;
 *  - sibling: an edge shared with a neighbour at this level, which bends gently.
 * A bend depends only on the edge's direction and on-screen length, so both
 * neighbours compute the same curve with no lookup, the mesh stays gap-free, and
 * the curve stays stable while cells morph during camera flights.
 */

// Curves: the bend's control offsets are a fraction of the edge length.
const CURVE_AMOUNT = 0.085;
const CURVE_LIMIT = 0.095; // keeps each end's tangent within ~16 degrees of the straight edge
const CURVE_MIN_PX = 18; // edges shorter than this on screen stay straight
const CURVE_FULL_PX = 140; // and reach their full bend by this length

/**
 * A curved edge. Points on it are parametrised by u along the RAW segment ra→rb
 * (where descendants' straight edges lie); the drawn curve runs from a to b:
 * point(u) = a + u(b-a) + φ(u)·n, n = left normal of (b-a), φ(u) = 3u(1-u)((1-u)h1 + u·h2).
 * That is exactly the cubic Bézier a, a+(b-a)/3+h1·n, a+2(b-a)/3+h2·n, b.
 */
interface Bend {
  readonly ra: Point;
  readonly rb: Point;
  readonly a: Point;
  readonly b: Point;
  readonly h1: number;
  readonly h2: number;
}

export interface ShapedEdge {
  /** The raw supporting segment, for classifying descendants' edges. */
  readonly ra: Point;
  readonly rb: Point;
  readonly bend: Bend | null;
}

type Segment =
  | { readonly kind: 'M' | 'L'; readonly to: Point }
  | { readonly kind: 'C'; readonly c1: Point; readonly c2: Point; readonly to: Point };

export interface ShapedCell {
  readonly id: string;
  readonly path: string;
  readonly edges: readonly ShapedEdge[];
  readonly segments: readonly Segment[];
}

export interface ShapeOptions {
  /** Screen pixels per coordinate unit as displayed now (the camera scale for a transformed level). */
  readonly pxPerUnit: number;
  /** The viewport rectangle in these coordinates; edges on it are frame edges. */
  readonly frame: Polygon;
  /** 0..1 weight of the bend on edges between these cells. */
  readonly sibling: number;
  /** The entered territory during a flight: its edges relax toward straight frame edges. */
  readonly focus?: { readonly polygon: Polygon; readonly weight: number } | null;
  /** The cell these cells sit inside: edges on its boundary follow its curves. */
  readonly container?: ShapedCell | null;
  /** Cells the camera cannot see this frame keep their last shape instead of being rebuilt. */
  readonly hidden?: ReadonlySet<Polygon>;
}

type Kind = 'frame' | 'sibling';
interface Treatment { readonly bend: Bend | null; readonly inherited: boolean; readonly kind: Kind; readonly weight: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const length = (v: Point) => Math.hypot(v[0], v[1]);

const signedArea = (polygon: Polygon): number => {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
};

const extent = (polygon: Polygon): number => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return Math.max(maxX - minX, maxY - minY, 1);
};

/** Both points lie on the infinite line through a and b (convex cells: the line is a supporting line). */
const onLine = (p: Point, q: Point, a: Point, b: Point, tolerance: number): boolean => {
  const d = sub(b, a);
  const len = length(d);
  if (len < tolerance) return false;
  const distance = (point: Point) => Math.abs(d[0] * (point[1] - a[1]) - d[1] * (point[0] - a[0])) / len;
  return distance(p) <= tolerance && distance(q) <= tolerance;
};

const onPolygonEdge = (p: Point, q: Point, polygon: Polygon, tolerance: number): boolean => {
  for (let i = 0; i < polygon.length; i++) if (onLine(p, q, polygon[i], polygon[(i + 1) % polygon.length], tolerance)) return true;
  return false;
};

// --- curves -----------------------------------------------------------------

const bendNormal = (bend: Bend): Point => [-(bend.b[1] - bend.a[1]), bend.b[0] - bend.a[0]];

const bendControls = (bend: Bend): readonly [Point, Point, Point, Point] => {
  const n = bendNormal(bend);
  const p1 = lerp(bend.a, bend.b, 1 / 3), p2 = lerp(bend.a, bend.b, 2 / 3);
  return [bend.a, [p1[0] + n[0] * bend.h1, p1[1] + n[1] * bend.h1], [p2[0] + n[0] * bend.h2, p2[1] + n[1] * bend.h2], bend.b];
};

/** de Casteljau with three parameters: the blossom of the cubic. */
const blossom = (controls: readonly [Point, Point, Point, Point], x: number, y: number, z: number): Point => {
  const q = [lerp(controls[0], controls[1], x), lerp(controls[1], controls[2], x), lerp(controls[2], controls[3], x)];
  const r = [lerp(q[0], q[1], y), lerp(q[1], q[2], y)];
  return lerp(r[0], r[1], z);
};

const bendParameter = (bend: Bend, point: Point): number => {
  const d = sub(bend.rb, bend.ra);
  const len2 = d[0] * d[0] + d[1] * d[1];
  return len2 > 0 ? ((point[0] - bend.ra[0]) * d[0] + (point[1] - bend.ra[1]) * d[1]) / len2 : 0;
};

/** Beyond its ends a bend continues straight along its chord. */
const bendPoint = (bend: Bend, u: number): Point => {
  if (u <= 0 || u >= 1) return lerp(bend.a, bend.b, u);
  return blossom(bendControls(bend), u, u, u);
};

/** Drawing commands that follow a bend from parameter u0 to u1 (either direction). */
const bendSegments = (bend: Bend, u0: number, u1: number): Segment[] => {
  const breaks = [u0, ...[0, 1].filter(x => (x - u0) * (x - u1) < 0).sort((a, b) => u1 > u0 ? a - b : b - a), u1];
  const controls = bendControls(bend);
  const segments: Segment[] = [];
  for (let i = 1; i < breaks.length; i++) {
    const s = breaks[i - 1], e = breaks[i], mid = (s + e) / 2;
    if (mid > 0 && mid < 1) segments.push({ kind: 'C', c1: blossom(controls, s, s, e), c2: blossom(controls, s, e, e), to: blossom(controls, e, e, e) });
    else segments.push({ kind: 'L', to: bendPoint(bend, e) });
  }
  return segments;
};

/**
 * The bend of a shared edge from a to b. It depends only on the edge's direction
 * and on-screen length, and reversing the edge yields the same curve:
 * F has odd harmonics (F(θ+π) = -F(θ)), G even ones (G(θ+π) = G(θ)), so the
 * reversed edge's (h1, h2) is exactly (-h2, -h1) of the forward one.
 */
const siblingBend = (ra: Point, rb: Point, a: Point, b: Point, pxPerUnit: number, weight: number): Bend | null => {
  const d = sub(b, a);
  const amount = weight * CURVE_AMOUNT * smoothstep(CURVE_MIN_PX, CURVE_FULL_PX, length(d) * pxPerUnit);
  if (amount <= 1e-5) return null;
  const theta = Math.atan2(d[1], d[0]);
  const F = .7 * Math.sin(theta + .7) + .45 * Math.sin(3 * theta + 2.1);
  const G = .38 * Math.sin(2 * theta + .4);
  return {
    ra, rb, a, b,
    h1: clamp(amount * (F + G), -CURVE_LIMIT, CURVE_LIMIT),
    h2: clamp(amount * (F - G), -CURVE_LIMIT, CURVE_LIMIT),
  };
};

// --- shaping ----------------------------------------------------------------

const EMPTY: Omit<ShapedCell, 'id'> = { path: '', edges: [], segments: [] };

/** One territory's drawn outline. */
export function shapeCell(id: string, polygon: Polygon, options: ShapeOptions): ShapedCell {
  return memoShapeCell(id, polygon, options);
}

// Shapes are reused across camera frames while nothing that changes them has changed: a level's
// polygons are the same objects for a whole flight, so only cells whose inputs move are rebuilt.
const MEMO = new WeakMap<Polygon, { key: string; cell: ShapedCell }>();
const IDS = new WeakMap<object, number>();
let nextId = 1;
const idOf = (value: object | null | undefined) => {
  if (!value) return 0;
  let id = IDS.get(value);
  if (!id) IDS.set(value, id = nextId++);
  return id;
};

/**
 * How the camera scale shapes this cell: the scale itself while an edge is in the fade band,
 * otherwise only which edges are too short to bend and which bend fully (neither changes with scale).
 */
function scaleKey(polygon: Polygon, pxPerUnit: number): string {
  let flags = '';
  for (let i = 0; i < polygon.length; i++) {
    const px = length(sub(polygon[(i + 1) % polygon.length], polygon[i])) * pxPerUnit;
    if (px > CURVE_MIN_PX && px < CURVE_FULL_PX) return String(pxPerUnit);
    flags += px >= CURVE_FULL_PX ? 'f' : 's';
  }
  return flags;
}

function memoShapeCell(id: string, polygon: Polygon, options: ShapeOptions): ShapedCell {
  const { focus } = options;
  const key = [
    id, idOf(options.frame), idOf(options.container),
    options.sibling, focus ? `${idOf(focus.polygon)}:${focus.weight}` : '',
    scaleKey(polygon, options.pxPerUnit),
  ].join('|');
  const hit = MEMO.get(polygon);
  if (hit && (hit.key === key || options.hidden?.has(polygon))) return hit.cell;
  const cell = shapeCellInner(id, polygon, options);
  MEMO.set(polygon, { key, cell });
  return cell;
}

function shapeCellInner(id: string, polygon: Polygon, options: ShapeOptions): ShapedCell {
  const n = polygon.length;
  if (n < 3) return { id, ...EMPTY };
  const { pxPerUnit } = options;
  const tolerance = 2e-6 * extent(options.frame);
  const area = signedArea(polygon);
  if (Math.abs(area) <= tolerance * tolerance) return { id, ...EMPTY };

  // 1. Classify each raw edge and choose its treatment.
  const treatments: Treatment[] = [];
  for (let i = 0; i < n; i++) {
    const a = polygon[i], b = polygon[(i + 1) % n];
    const inherited = options.container?.edges.find(edge => onLine(a, b, edge.ra, edge.rb, tolerance));
    if (inherited) { treatments.push({ bend: inherited.bend, inherited: true, kind: 'sibling', weight: 1 }); continue; }
    if (onPolygonEdge(a, b, options.frame, tolerance)) { treatments.push({ bend: null, inherited: false, kind: 'frame', weight: 0 }); continue; }
    const weight = options.focus && onPolygonEdge(a, b, options.focus.polygon, tolerance) ? options.focus.weight : options.sibling;
    treatments.push({ bend: null, inherited: false, kind: 'sibling', weight });
  }

  // 2. Vertices on an inherited curved edge move onto that curve.
  const points: Point[] = polygon.map((vertex, k) => {
    const bend = treatments[k].bend ?? treatments[(k - 1 + n) % n].bend;
    return bend ? bendPoint(bend, bendParameter(bend, vertex)) : vertex;
  });

  // 3. Own sibling edges bend, between their possibly-moved endpoints.
  const bends: (Bend | null)[] = polygon.map((vertex, k) => {
    const treatment = treatments[k];
    if (treatment.bend) return treatment.bend;
    if (treatment.kind !== 'sibling' || treatment.inherited) return null;
    return siblingBend(vertex, polygon[(k + 1) % n], points[k], points[(k + 1) % n], pxPerUnit, treatment.weight);
  });

  // 4. Emit the outline: an inherited curve is followed only between this cell's own corners.
  const segments: Segment[] = [{ kind: 'M', to: points[0] }];
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    const bend = bends[k];
    if (bend) {
      const own = !treatments[k].bend;
      segments.push(...(own ? bendSegments(bend, 0, 1) : bendSegments(bend, bendParameter(bend, polygon[k]), bendParameter(bend, polygon[next]))));
    } else segments.push({ kind: 'L', to: points[next] });
  }
  const ownBends = new Map<number, Bend>();
  bends.forEach((bend, k) => { if (bend && !treatments[k].bend) ownBends.set(k, bend); });
  return { id, segments, path: emit(segments), edges: rawEdges(polygon, treatments, ownBends) };
}

/** Points along an outline, curves in pieces of about 5 screen pixels. */
function flatten(segments: readonly Segment[], pxPerUnit = 1): Point[] {
  const points: Point[] = [];
  let last: Point | null = null;
  for (const segment of segments) {
    if (segment.kind === 'C' && last) {
      const controls = [last, segment.c1, segment.c2, segment.to] as const;
      const reach = (length(sub(segment.c1, last)) + length(sub(segment.c2, segment.c1)) + length(sub(segment.to, segment.c2))) * pxPerUnit;
      const pieces = Math.max(4, Math.min(96, Math.ceil(reach / 5)));
      for (let i = 1; i <= pieces; i++) { const t = i / pieces; points.push(blossom(controls, t, t, t)); }
    } else points.push(segment.to);
    last = segment.to;
  }
  return points;
}

/** Edge records descendants inherit: every raw edge with its curve, if bent. */
function rawEdges(polygon: Polygon, treatments: readonly Treatment[], bends: ReadonlyMap<number, Bend>): ShapedEdge[] {
  return polygon.map((ra, i) => ({
    ra, rb: polygon[(i + 1) % polygon.length],
    bend: treatments[i].bend ?? bends.get(i) ?? null,
  }));
}

const fmt = (value: number) => (Math.round(value * 100) / 100).toString();
const pt = ([x, y]: Point) => `${fmt(x)},${fmt(y)}`;

function emit(segments: readonly Segment[], camera?: { scale: number; x: number; y: number }): string {
  const map = camera ? ([x, y]: Point): Point => [x * camera.scale + camera.x, y * camera.scale + camera.y] : (p: Point) => p;
  let out = '';
  for (const segment of segments) {
    if (segment.kind === 'C') out += `C${pt(map(segment.c1))} ${pt(map(segment.c2))} ${pt(map(segment.to))}`;
    else out += `${segment.kind}${pt(map(segment.to))}`;
  }
  return segments.length ? `${out}Z` : '';
}

const mapBend = (bend: Bend, map: (p: Point) => Point): Bend => ({ ...bend, ra: map(bend.ra), rb: map(bend.rb), a: map(bend.a), b: map(bend.b) });

/** The same shaped cell seen through a camera (scale and offset): for using a parent-level cell in screen space. */
export function cameraShapedCell(cell: ShapedCell, camera: { scale: number; x: number; y: number }): ShapedCell {
  if (camera.scale === 1 && camera.x === 0 && camera.y === 0) return cell;
  const map = ([x, y]: Point): Point => [x * camera.scale + camera.x, y * camera.scale + camera.y];
  return {
    id: cell.id,
    path: emit(cell.segments, camera),
    segments: cell.segments.map(segment => segment.kind === 'C'
      ? { ...segment, c1: map(segment.c1), c2: map(segment.c2), to: map(segment.to) }
      : { ...segment, to: map(segment.to) }),
    edges: cell.edges.map(edge => ({ ...edge, ra: map(edge.ra), rb: map(edge.rb), bend: edge.bend && mapBend(edge.bend, map) })),
  };
}

/** Shape a set of sibling cells; returns a lookup by id. */
export function shapeCells(cells: readonly { readonly node: { readonly id: string }; readonly polygon: Polygon }[], options: ShapeOptions): ReadonlyMap<string, ShapedCell> {
  return new Map(cells.map(cell => [cell.node.id, shapeCell(cell.node.id, cell.polygon, options)]));
}

interface CellLike { readonly node: { readonly id: string }; readonly polygon: Polygon }

/** One level's shaped cells, plus everything drawn inside them. */
export interface ShapeScope {
  readonly cells: ReadonlyMap<string, ShapedCell>;
  /** A cell's children (contours) shaped inside it, following its curved edges. */
  inside(ownerId: string, children: readonly CellLike[]): ReadonlyMap<string, ShapedCell>;
  /**
   * An earned footprint inside the visible cell that owns it. Through the owner's
   * child that contains it, so a footprint never strays from the contours drawn there.
   */
  footprint(nodeId: string, polygon: Polygon, children: (ownerId: string) => readonly CellLike[] | undefined): ShapedCell | null;
}

const owns = (ownerId: string, nodeId: string) => nodeId === ownerId || nodeId.startsWith(`${ownerId}.`);

export function createShapeScope(cells: readonly CellLike[], options: ShapeOptions): ShapeScope {
  const shaped = shapeCells(cells, options);
  // Edges between children inside a cell (contours, footprints) take their full bend, whatever this level's weight.
  const within = (container: ShapedCell | null): ShapeOptions => ({ ...options, sibling: 1, focus: null, container });
  const inner = new Map<string, { children: readonly CellLike[]; shaped: ReadonlyMap<string, ShapedCell> }>();
  const inside = (ownerId: string, children: readonly CellLike[]) => {
    const cached = inner.get(ownerId);
    if (cached?.children === children) return cached.shaped;
    const result = shapeCells(children, within(shaped.get(ownerId) ?? null));
    inner.set(ownerId, { children, shaped: result });
    return result;
  };
  return {
    cells: shaped,
    inside,
    footprint(nodeId, polygon, childrenOf) {
      const owner = cells.find(cell => owns(cell.node.id, nodeId));
      if (!owner) return null;
      if (owner.node.id === nodeId) return shaped.get(nodeId) ?? null;
      const children = childrenOf(owner.node.id);
      const child = children?.find(cell => owns(cell.node.id, nodeId));
      if (!children || !child) return shapeCell(nodeId, polygon, within(shaped.get(owner.node.id) ?? null));
      const container = inside(owner.node.id, children).get(child.node.id) ?? null;
      if (child.node.id === nodeId && container) return container;
      return shapeCell(nodeId, polygon, within(container));
    },
  };
}

/** The drawn outline as points (curves sampled): for checks, not drawing. */
export const outlinePoints = (cell: ShapedCell): Point[] => flatten(cell.segments);
