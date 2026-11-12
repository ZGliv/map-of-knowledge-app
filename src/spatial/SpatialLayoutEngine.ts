import { createRandom } from './deterministic';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from './types';

const EPSILON = 0.00001;

export const polygonArea = (polygon: Polygon): number => {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[(index + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
};

export const polygonCentroid = (polygon: Polygon): Point => {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[(index + 1) % polygon.length];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  if (Math.abs(twiceArea) < EPSILON) {
    const fallback = polygon.reduce(([sumX, sumY], [pointX, pointY]) => [sumX + pointX, sumY + pointY], [0, 0]);
    return [fallback[0] / polygon.length, fallback[1] / polygon.length];
  }
  return [x / (3 * twiceArea), y / (3 * twiceArea)];
};

const boundsFor = (polygon: Polygon): RegionLayout['bounds'] => {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

const inside = ([x, y]: Point, polygon: Polygon): boolean => {
  let result = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
};

const clipHalfPlane = (polygon: Polygon, a: number, b: number, c: number): Polygon => {
  const output: Point[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentValue = a * current[0] + b * current[1] - c;
    const previousValue = a * previous[0] + b * previous[1] - c;
    const currentInside = currentValue <= EPSILON;
    const previousInside = previousValue <= EPSILON;
    if (currentInside !== previousInside) {
      const denominator = a * (current[0] - previous[0]) + b * (current[1] - previous[1]);
      const t = Math.abs(denominator) < EPSILON ? 0 : (c - a * previous[0] - b * previous[1]) / denominator;
      output.push([
        previous[0] + t * (current[0] - previous[0]),
        previous[1] + t * (current[1] - previous[1]),
      ]);
    }
    if (currentInside) output.push(current);
  }
  return output;
};

/** Each site's cell. With weights, a heavier site pushes its borders out (a power diagram). */
const computeCells = (sites: readonly Point[], clip: Polygon, weights?: readonly number[]): readonly Polygon[] => sites.map((site, siteIndex) => {
  let cell = clip;
  for (let otherIndex = 0; otherIndex < sites.length && cell.length > 2; otherIndex += 1) {
    if (otherIndex === siteIndex) continue;
    const other = sites[otherIndex];
    const a = 2 * (other[0] - site[0]);
    const b = 2 * (other[1] - site[1]);
    const c = other[0] ** 2 + other[1] ** 2 - site[0] ** 2 - site[1] ** 2 + (weights ? weights[siteIndex] - weights[otherIndex] : 0);
    cell = clipHalfPlane(cell, a, b, c);
  }
  return cell;
});

const initialSites = (seed: string, count: number, clip: Polygon): readonly Point[] => {
  const random = createRandom(seed);
  const bounds = boundsFor(clip);
  const center = polygonCentroid(clip);
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    let candidate: Point = center;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const x = bounds.x + bounds.width * (0.06 + random() * 0.88);
      const y = bounds.y + bounds.height * (0.06 + random() * 0.88);
      if (inside([x, y], clip)) {
        candidate = [x, y];
        break;
      }
    }
    points.push(candidate);
  }
  return points;
};

/**
 * Starting sites that keep their order whatever the shape: each child's start is the same position
 * within the shape's box every time (drawn from the seed alone), drawn in toward the middle if the
 * shape does not hold it there. A territory that changes shape (as a level re-fits the screen) is
 * laid out with its children in the same arrangement, stretched, never reshuffled. (Rejection
 * sampling, above, spends a different number of draws in each shape, so its children can trade
 * places from one shape to the next.)
 */
const SQUARE: Polygon = [[0, 0], [0, 1], [1, 1], [1, 0]];
const STEP = .3;
const REFINE_PASSES = 8;

/**
 * Prototype: how much room each place deserves (null: every child an equal share). Set once at load,
 * before any layout. Each child's share of its parent is its size over the family's total.
 */
let sizeOf: ((node: KnowledgeNode) => number) | null = null;
export const sizeAreasBy = (size: (node: KnowledgeNode) => number) => { sizeOf = size; };

/**
 * Weights that give each site its share, found by nudging the weights (and sites) in a box until the
 * cells' areas match. Heavier pairs are scaled back so no site is pushed out of its own cell.
 */
const solveShares = (start: readonly Point[], shares: readonly number[], box: Polygon, moveSites: boolean) => {
  let sites = start;
  let weights = sites.map(() => 0);
  const total = polygonArea(box);
  for (let pass = 0; pass < 48; pass += 1) {
    const cells = computeCells(sites, box, weights);
    const areas = cells.map(cell => cell.length > 2 ? polygonArea(cell) / total : 0);
    const reach = spread(sites);
    weights = weights.map((weight, index) => weight + (shares[index] - areas[index]) / Math.max(shares[index], areas[index], 1e-6) * reach * STEP);
    if (moveSites && pass < 24) sites = cells.map((cell, index) => cell.length > 2 ? polygonCentroid(cell) : sites[index]);
    const mean = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
    weights = weights.map(weight => weight - mean);
    let scale = 1;
    for (let i = 0; i < sites.length; i += 1) for (let j = i + 1; j < sites.length; j += 1) {
      const gap = Math.abs(weights[i] - weights[j]);
      const room = .4 * ((sites[i][0] - sites[j][0]) ** 2 + (sites[i][1] - sites[j][1]) ** 2);
      if (gap > room) scale = Math.min(scale, room / gap);
    }
    weights = weights.map(weight => weight * scale);
  }
  return { sites, weights };
};
/**
 * Weights eased back where they crowd a pair, so every site stays inside its own cell (none can
 * vanish). The easing is smooth, so a family in flight never jumps as a pair passes the limit: with
 * r the pair's weight gap over its squared distance, the scale is 1 / (1 + sum of (r - .5)² past .5),
 * which keeps every pair under .82 of its distance, where a site would be pushed out.
 */
const fitWeights = (sites: readonly Point[], weights: readonly number[] | undefined): readonly number[] | undefined => {
  if (!weights) return undefined;
  let crowding = 0;
  for (let i = 0; i < sites.length; i += 1) for (let j = i + 1; j < sites.length; j += 1) {
    const r = Math.abs(weights[i] - weights[j]) / Math.max(1e-12, (sites[i][0] - sites[j][0]) ** 2 + (sites[i][1] - sites[j][1]) ** 2);
    if (r > .7) crowding += (r - .7) ** 2;
  }
  return crowding > 0 ? weights.map(weight => weight / (1 + crowding)) : weights;
};
/** How spread out a set of sites is: their mean squared distance from their middle. */
const spread = (sites: readonly Point[]): number => {
  const mx = sites.reduce((sum, [x]) => sum + x, 0) / sites.length, my = sites.reduce((sum, [, y]) => sum + y, 0) / sites.length;
  return Math.max(1e-9, sites.reduce((sum, [x, y]) => sum + (x - mx) ** 2 + (y - my) ** 2, 0) / sites.length);
};
const relative = ({ sites, weights }: { sites: readonly Point[]; weights: readonly number[] }) => ({ sites, weights: weights.map(weight => weight / spread(sites)) });
const sharesOf = (children: readonly KnowledgeNode[]): readonly number[] | null => {
  if (!sizeOf || children.length < 2) return null;
  const sizes = children.map(child => Math.max(1e-6, sizeOf!(child)));
  if (Math.max(...sizes) <= Math.min(...sizes) * 1.02) return null;
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return sizes.map(size => size / total);
};

const evenSquares = new Map<string, { readonly sites: readonly Point[]; readonly weights: readonly number[] | null }>();
/** The seed's starting sites, evened out once in a unit square (the same for every shape), and
 * the weights (per unit of box area) that size each child to its share. */
const evenSquare = (seed: string, children: readonly KnowledgeNode[]) => {
  const key = `${seed}|${children.length}`;
  let known = evenSquares.get(key);
  if (known) return known;
  const random = createRandom(seed);
  let sites: readonly Point[] = Array.from({ length: children.length }, (): Point => [0.06 + random() * 0.88, 0.06 + random() * 0.88]);
  for (let pass = 0; pass < 3; pass += 1) sites = computeCells(sites, SQUARE).map((cell, index) => cell.length > 2 ? polygonCentroid(cell) : sites[index]);
  const shares = sharesOf(children);
  known = shares ? relative(solveShares(sites, shares, SQUARE, true)) : { sites, weights: null };
  evenSquares.set(key, known);
  return known;
};
const orderedSites = (seed: string, children: readonly KnowledgeNode[], clip: Polygon): readonly Point[] => {
  const bounds = boundsFor(clip);
  const center = polygonCentroid(clip);
  return evenSquare(seed, children).sites.map(([u, v]): Point => {
    let point: Point = [bounds.x + bounds.width * u, bounds.y + bounds.height * v];
    for (let step = 0; step < 16 && !inside(point, clip); step += 1) point = [center[0] + (point[0] - center[0]) * .8, center[1] + (point[1] - center[1]) * .8];
    return point;
  });
};

const signature = (polygon: Polygon): string => polygon
  .map(([x, y]) => `${Math.round(x * 10)},${Math.round(y * 10)}`)
  .join(';');

/**
 * Prototype: where each of the world's subjects starts, as a spot in the map's box (0 to 1 on each
 * axis), and how many balancing passes follow; null keeps the long-standing scattered places. Set
 * once at load, before any layout.
 */
let worldRing: { readonly at: (child: KnowledgeNode) => Point; readonly passes: number } | null = null;
export const placeWorldOnRing = (at: (child: KnowledgeNode) => Point, passes: number) => { worldRing = { at, passes }; };
const ringSites = (children: readonly KnowledgeNode[], clip: Polygon, at: (child: KnowledgeNode) => Point): readonly Point[] => {
  const bounds = boundsFor(clip);
  return children.map((child): Point => {
    const [u, v] = at(child);
    return [bounds.x + bounds.width * u, bounds.y + bounds.height * v];
  });
};

const worldSolved = new Map<string, readonly number[]>();
/** The world's weights, solved in a unit square from its starting spots. */
const worldWeights = (parent: KnowledgeNode, children: readonly KnowledgeNode[]): readonly number[] | null => {
  const shares = sharesOf(children);
  if (!shares) return null;
  let known = worldSolved.get(parent.id);
  if (!known) {
    const start = worldRing ? children.map(child => worldRing!.at(child)) : initialSites(`${parent.id}:layout`, children.length, SQUARE);
    worldSolved.set(parent.id, known = relative(solveShares(start, shares, SQUARE, false)).weights);
  }
  return known;
};

export class SpatialLayoutEngine {
  private readonly cache = new Map<string, readonly RegionLayout[]>();

  /** Room for every territory in the atlas (thousands of places), so no level is laid out twice. */
  constructor(private readonly cacheLimit = 12000) {}

  layoutFromSites(
    parent: KnowledgeNode,
    children: readonly KnowledgeNode[],
    clip: Polygon,
    sites: readonly Point[],
    /** Relative weights to use as they are (a flight passes its endpoints' weights, blended); without
     * them a sized family's weights are fitted to this shape. */
    weights?: readonly number[],
  ): readonly RegionLayout[] {
    if (children.length !== sites.length) {
      throw new Error(`Expected ${children.length} sites for ${parent.id}; received ${sites.length}`);
    }
    const reach = spread(sites);
    const absolute = weights && sizeOf ? weights.map(weight => weight * reach) : this.weightsFor(parent, children, sites, clip);
    const cells = computeCells(sites, clip, fitWeights(sites, absolute));
    return children.map((node, index): RegionLayout => {
      const polygon = cells[index];
      return {
        node,
        site: sites[index],
        ...(absolute ? { weight: absolute[index] / reach } : {}),
        polygon,
        centroid: polygonCentroid(polygon),
        area: polygonArea(polygon),
        bounds: boundsFor(polygon),
      };
    });
  }

  /** The weights that size a family in this shape: solved once per family, scaled to the shape's box. */
  weightsFor(parent: KnowledgeNode, children: readonly KnowledgeNode[], sites: readonly Point[], clip: Polygon): readonly number[] | undefined {
    if (!sizeOf || children.length < 2) return undefined;
    const unit = parent.depth > 0 ? evenSquare(`${parent.id}:layout`, children).weights : worldWeights(parent, children);
    if (!unit) return undefined;
    // Weights are kept relative to how far apart the sites are, so the same family keeps the same
    // proportions in any shape and changes smoothly as its sites move in a flight.
    // A few nudges in the shape itself: the stretched shape skews the square's proportions.
    const shares = sharesOf(children)!;
    let weights: readonly number[] = unit.map(weight => weight * spread(sites));
    const total = polygonArea(clip);
    for (let pass = 0; pass < REFINE_PASSES; pass += 1) {
      const cells = computeCells(sites, clip, fitWeights(sites, weights));
      const reach = spread(sites);
      weights = weights.map((weight, index) => {
        const area = (cells[index].length > 2 ? polygonArea(cells[index]) : 0) / total;
        return weight + (shares[index] - area) / Math.max(shares[index], area, 1e-6) * reach * STEP;
      });
    }
    return weights;
  }

  layout(parent: KnowledgeNode, children: readonly KnowledgeNode[], clip: Polygon): readonly RegionLayout[] {
    const key = `${parent.id}|${children.map(({ id }) => id).join(',')}|${signature(clip)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const regions = this.layoutUncached(parent, children, clip);
    if (this.cache.size >= this.cacheLimit) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, regions);
    return regions;
  }

  layoutUncached(
    parent: KnowledgeNode,
    children: readonly KnowledgeNode[],
    clip: Polygon,
  ): readonly RegionLayout[] {
    // Inside the world, a territory's children are evened out in a square and stretched to its shape,
    // then given one pass in the shape itself: more passes slide them around as a shape morphs mid-zoom.
    if (parent.depth > 0) {
      let placed = orderedSites(`${parent.id}:layout`, children, clip);
      const cells = computeCells(placed, clip, fitWeights(placed, this.weightsFor(parent, children, placed, clip)));
      placed = cells.map((cell, index) => cell.length > 2 ? polygonCentroid(cell) : placed[index]);
      return this.layoutFromSites(parent, children, clip, placed);
    }
    // The world's own subjects keep their long-standing places. A few Lloyd passes keep cells balanced
    // without ironing the map into a rectangular grid on tall viewports. Three preserves useful irregularity.
    let sites = worldRing ? ringSites(children, clip, worldRing.at) : initialSites(`${parent.id}:layout`, children.length, clip);
    for (let iteration = 0; iteration < (worldRing?.passes ?? 3); iteration += 1) {
      const cells = computeCells(sites, clip, fitWeights(sites, this.weightsFor(parent, children, sites, clip)));
      sites = cells.map((cell, index) => cell.length > 2 ? polygonCentroid(cell) : sites[index]);
    }
    return this.layoutFromSites(parent, children, clip, sites);
  }
}

/** Two layouts' weights blended (undefined when neither family is sized). */
export const blendWeights = (from: readonly RegionLayout[], to: readonly RegionLayout[], progress: number): readonly number[] | undefined => (
  from.some(region => region.weight !== undefined) || to.some(region => region.weight !== undefined)
    ? from.map((region, index) => (region.weight ?? 0) + ((to[index]?.weight ?? 0) - (region.weight ?? 0)) * progress)
    : undefined
);

export const polygonPath = (polygon: Polygon): string => polygon.length === 0
  ? ''
  : `M${polygon.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`;
