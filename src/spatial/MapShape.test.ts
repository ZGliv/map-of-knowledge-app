import { describe, expect, it } from 'vitest';
import { createShapeScope, outlinePoints, shapeCell, shapeCells, type ShapeOptions } from './MapShape';
import { SpatialLayoutEngine, polygonArea } from './SpatialLayoutEngine';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from './types';

const W = 1440, H = 900;
const frame: Polygon = [[0, 0], [0, H], [W, H], [W, 0]];
const node = (id: string, index = 0, depth = 1): KnowledgeNode => ({ id, name: id, parentId: null, depth, index, weight: 1 });
const engine = new SpatialLayoutEngine();
const layout = (parent: string, count: number, clip: Polygon): readonly RegionLayout[] =>
  engine.layout(node(parent, 0, 0), Array.from({ length: count }, (_, i) => node(`${parent}.c${i}`, i)), clip);
const options = (extra: Partial<ShapeOptions> = {}): ShapeOptions => ({ pxPerUnit: 1, frame, sibling: 1, ...extra });

const area = (points: readonly Point[]) => polygonArea(points);
const inside = ([x, y]: Point, polygon: readonly Point[], tolerance: number): boolean => {
  // Convex or not: winding test, with points within `tolerance` of the outline counted as inside.
  let wind = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    const dx = xj - xi, dy = yj - yi, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / len2)) : 0;
    if (Math.hypot(x - (xi + t * dx), y - (yi + t * dy)) <= tolerance) return true;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) wind = !wind;
  }
  return wind;
};

describe('curves', () => {
  const regions = layout('world', 8, frame);
  const shaped = shapeCells(regions, options());

  it('draws every shared edge identically from both sides, so the mesh stays gap-free', () => {
    let shared = 0;
    for (const a of regions) for (const b of regions) {
      if (a.node.id >= b.node.id) continue;
      for (const ea of shaped.get(a.node.id)!.edges) for (const eb of shaped.get(b.node.id)!.edges) {
        const same = Math.hypot(ea.ra[0] - eb.rb[0], ea.ra[1] - eb.rb[1]) < 1e-6 && Math.hypot(ea.rb[0] - eb.ra[0], ea.rb[1] - eb.ra[1]) < 1e-6;
        if (!same) continue;
        shared += 1;
        expect(ea.bend && eb.bend).toBeTruthy();
        for (const u of [.1, .3, .5, .7, .9]) {
          const pa = curve(ea.bend!, u), pb = curve(eb.bend!, 1 - u);
          expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1])).toBeLessThan(1e-6);
        }
      }
    }
    expect(shared).toBeGreaterThan(8);
  });

  it('keeps the total area: bends only move land between neighbours', () => {
    const total = regions.reduce((sum, region) => sum + area(outlinePoints(shaped.get(region.node.id)!)), 0);
    expect(total / (W * H)).toBeCloseTo(1, 3);
  });

  it('keeps children and footprints inside their curved parent, exactly filling it', () => {
    for (const parent of regions) {
      const kids = layout(parent.node.id, 6, parent.polygon);
      const scope = createShapeScope(regions, options());
      const container = outlinePoints(scope.cells.get(parent.node.id)!);
      const children = scope.inside(parent.node.id, kids);
      const sum = kids.reduce((total, kid) => total + area(outlinePoints(children.get(kid.node.id)!)), 0);
      expect(sum / area(container)).toBeCloseTo(1, 3);
      for (const kid of kids) for (const point of outlinePoints(children.get(kid.node.id)!)) expect(inside(point, container, .05)).toBe(true);
      // A footprint two levels down sits inside the child that contains it.
      const grandchildren = layout(kids[0].node.id, 5, kids[0].polygon);
      const footprint = scope.footprint(grandchildren[0].node.id, grandchildren[0].polygon, () => kids)!;
      const holder = outlinePoints(children.get(kids[0].node.id)!);
      for (const point of outlinePoints(footprint)) expect(inside(point, holder, .05)).toBe(true);
    }
  });

  it('leaves the frame straight', () => {
    for (const region of regions) for (const point of outlinePoints(shaped.get(region.node.id)!)) {
      expect(point[0]).toBeGreaterThanOrEqual(-1e-6); expect(point[0]).toBeLessThanOrEqual(W + 1e-6);
      expect(point[1]).toBeGreaterThanOrEqual(-1e-6); expect(point[1]).toBeLessThanOrEqual(H + 1e-6);
    }
  });

  it('straightens the entered territory as a flight arrives, and only its own edges', () => {
    const entered = regions[3];
    const flight = (weight: number) => shapeCells(regions, options({ pxPerUnit: 4, focus: { polygon: entered.polygon, weight } }));
    const arrived = flight(0).get(entered.node.id)!;
    expect(arrived.path).not.toContain('C');
    expect(arrived.edges.every(edge => edge.bend === null)).toBe(true);
    expect(flight(1).get(entered.node.id)!.path).toContain('C');
    // A neighbour keeps the bends of edges it does not share with the entered territory.
    const neighbour = regions.find(region => region !== entered && flight(0).get(region.node.id)!.edges.some(edge => edge.bend))!;
    expect(neighbour).toBeTruthy();
  });

  it('bends short on-screen edges less, so a dive never pops', () => {
    const near = shapeCells(regions, options({ pxPerUnit: 1 }));
    const far = shapeCells(regions, options({ pxPerUnit: .01 }));
    for (const region of regions) expect(far.get(region.node.id)!.path).not.toContain('C');
    expect([...near.values()].some(cell => cell.path.includes('C'))).toBe(true);
  });
});

// Evaluate a bend's drawn curve at chord parameter u (mirrors the module's private evaluator).
function curve(bend: { a: Point; b: Point; h1: number; h2: number }, u: number): Point {
  const n: Point = [-(bend.b[1] - bend.a[1]), bend.b[0] - bend.a[0]];
  const phi = 3 * u * (1 - u) * ((1 - u) * bend.h1 + u * bend.h2);
  return [bend.a[0] + u * (bend.b[0] - bend.a[0]) + phi * n[0], bend.a[1] + u * (bend.b[1] - bend.a[1]) + phi * n[1]];
}
