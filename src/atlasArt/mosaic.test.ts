import { describe, expect, it } from 'vitest';
import './mosaic';
import { catalog } from '../core/catalog';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import { NavigationLayoutResolver, createPolygonMorph, interpolateVoronoiTransition } from '../spatial/NavigationMotion';
import type { KnowledgeNode, Polygon, RegionLayout } from '../spatial/types';

const PHONE: Polygon = [[0, 0], [0, 812], [375, 812], [375, 0]];
const leaves = (node: KnowledgeNode): number => {
  const kids = catalog.getChildren(node);
  return kids.length ? kids.reduce((sum, kid) => sum + leaves(kid), 0) : 1;
};
const shareError = (regions: readonly RegionLayout[], size: (node: KnowledgeNode) => number) => {
  const sizes = regions.map(region => size(region.node));
  const total = sizes.reduce((sum, value) => sum + value, 0);
  const area = regions.reduce((sum, region) => sum + region.area, 0);
  return Math.max(...regions.map((region, index) => Math.abs(region.area / area - sizes[index] / total) / (sizes[index] / total)));
};

describe('the map sized by what each place holds', () => {
  const engine = new SpatialLayoutEngine();
  const resolver = new NavigationLayoutResolver(catalog, engine);
  const world = resolver.layoutForViewport(catalog.root, PHONE);

  it('lays the subjects out lopsided, the biggest above the smallest, none squeezed out', () => {
    // The world keeps the hand-picked lopsided look (Bold): its sizes lean on what each subject holds
    // without being fitted to it exactly.
    expect(world.every(region => region.polygon.length >= 3 && region.area > 375 * 812 * .02)).toBe(true);
    const area = (id: string) => world.find(region => region.node.id === `knowledge.${id}`)!.area;
    expect(area('science')).toBeGreaterThan(area('humanities') * 2);
    expect(Math.max(...world.map(region => region.area))).toBeGreaterThan(Math.min(...world.map(region => region.area)) * 3);
  });

  it('sizes every family inside a subject, at rest, with no place squeezed out', () => {
    for (const subject of world) {
      const level = resolver.layoutForViewport(subject.node, PHONE);
      expect(level.every(region => region.polygon.length >= 3)).toBe(true);
      expect(shareError(level, node => leaves(node) ** .75)).toBeLessThan(.12);
    }
  });

  it('zooms into every subject without a sub-area growing and shrinking back', () => {
    for (const subject of world) {
      const kids = catalog.getChildren(subject.node);
      const source = engine.layout(subject.node, kids, subject.polygon);
      const target = resolver.layoutForViewport(subject.node, PHONE);
      const morph = createPolygonMorph(subject.polygon, PHONE);
      const weights = (regions: readonly RegionLayout[]) => regions[0].weight === undefined ? undefined : regions.map(region => region.weight!);
      const frames = Array.from({ length: 33 }, (_, step) => interpolateVoronoiTransition(
        engine, subject.node, kids, morph, source.map(r => r.site), target.map(r => r.site), step / 32, weights(source), weights(target),
      ));
      kids.forEach((kid, index) => {
        const areas = frames.map(frame => frame[index].area);
        const direction = Math.sign(areas.at(-1)! - areas[0]);
        let back = 0;
        for (let step = 1; step < areas.length; step += 1) back += Math.max(0, -(areas[step] - areas[step - 1]) * direction);
        expect(back, `${kid.id} area backtrack`).toBeLessThanOrEqual(Math.max(Math.abs(areas.at(-1)! - areas[0]) * .1, 375 * 812 * .005));
      });
    }
  });
});

import { colourFor, drawLand, fillShade, fogFor, greyFor, isFog, paintKey, restingSites, shadeOf, type LandTop } from './mosaic';
import { createShapeScope, outlinePoints } from '../spatial/MapShape';
import { polygonPath } from '../spatial/SpatialLayoutEngine';

const channels = (colour: string) => colour.match(/\d+/g)!.map(Number);
const luma = (colour: string) => { const [r, g, b] = channels(colour); return .2126 * r + .7152 * g + .0722 * b; };

describe('painting the land by its fill', () => {
  const stars = catalog.get('knowledge.science.astronomy')!;
  const leaf = (function deepest(node: KnowledgeNode): KnowledgeNode { const kids = catalog.getChildren(node); return kids.length ? deepest(kids[0]) : node; })(stars);
  const charted = new Set([stars.id, leaf.id]);

  it('paints fill 0 grey, fill 1 its own colour and fill 0.5 halfway, at every level, leaves included', () => {
    for (const node of [stars, leaf]) {
      expect(fillShade(node.id, { fill: new Map(), charted })).toBe(greyFor(node.id));
      expect(fillShade(node.id, { fill: new Map([[node.id, 1]]), charted })).toBe(colourFor(node.id));
      const half = channels(fillShade(node.id, { fill: new Map([[node.id, .5]]), charted }));
      const [grey, colour] = [channels(greyFor(node.id)), channels(colourFor(node.id))];
      half.forEach((value, i) => expect(Math.abs(value - (grey[i] + colour[i]) / 2)).toBeLessThanOrEqual(1));
    }
  });

  it('shows the smallest fill as a step off grey, never as nothing', () => {
    expect(fillShade(stars.id, { fill: new Map([[stars.id, .001]]), charted })).not.toBe(greyFor(stars.id));
  });

  it('paints uncharted places as fog: dimmer, flatter and cooler than grey', () => {
    const paint = { fill: new Map<string, number>(), charted };
    const fogged = catalog.all().filter(node => node.depth > 0 && !charted.has(node.id));
    expect(fogged.length).toBeGreaterThan(1000);
    for (const node of fogged) {
      expect(isFog(node.id, paint)).toBe(true);
      expect(shadeOf(node, paint)).toBe(fogFor(node.id));
      expect(luma(fogFor(node.id))).toBeLessThan(luma(greyFor(node.id)));
      const [r, , b] = channels(fogFor(node.id));
      expect(b - r).toBeGreaterThanOrEqual(10);
    }
    const spread = (tones: number[]) => Math.max(...tones) - Math.min(...tones);
    expect(spread(fogged.map(node => luma(fogFor(node.id))))).toBeLessThan(spread(fogged.map(node => luma(greyFor(node.id)))) / 2.5);
    // Still above the night sky behind the map (#05070f), so the cells read as land.
    for (const node of fogged) expect(luma(fogFor(node.id))).toBeGreaterThan(luma('rgb(5,7,15)') + 4);
    // Charted places, and anything with fill, are never fog; without a charted set nothing is.
    expect(isFog(stars.id, paint)).toBe(false);
    expect(isFog(fogged[0].id, { fill: new Map([[fogged[0].id, .2]]), charted })).toBe(false);
    expect(isFog(fogged[0].id, { fill: new Map() })).toBe(false);
    expect(shadeOf(fogged[0], { fill: new Map() })).toBe(greyFor(fogged[0].id));
  });

  it('keeps the legacy look exactly when no fill is given', () => {
    const done = new Set([leaf.id]);
    const learned = (id: string) => done.has(id);
    expect(shadeOf(leaf, learned)).toBe(colourFor(leaf.id));
    expect(shadeOf(stars, learned, true)).toBe(colourFor(stars.id));
    const sibling = catalog.getChildren(catalog.get(leaf.parentId!)!).find(node => node.id !== leaf.id)!;
    expect(shadeOf(sibling, learned)).toBe(greyFor(sibling.id));
    // A place drawn as one cell: between grey and colour by its learned share (the mean of its children).
    const parent = catalog.get(leaf.parentId!)!;
    const share = 1 / catalog.getChildren(parent).length;
    const [grey, colour, got] = [channels(greyFor(parent.id)), channels(colourFor(parent.id)), channels(shadeOf(parent, learned))];
    got.forEach((value, i) => expect(Math.abs(value - (grey[i] + (colour[i] - grey[i]) * share))).toBeLessThanOrEqual(1));
  });

  it('ignores "inside a learned place" under the fill: the fill alone decides', () => {
    expect(shadeOf(leaf, { fill: new Map(), charted }, true)).toBe(greyFor(leaf.id));
  });

  it('keys the paint on what it paints', () => {
    const a = new Map([[stars.id, .25], [leaf.id, 1]]);
    expect(paintKey(undefined, charted)).toBe('');
    expect(paintKey(a, charted)).toBe(paintKey(new Map(a), new Set(charted)));
    expect(paintKey(a, charted)).not.toBe(paintKey(new Map([[stars.id, .5], [leaf.id, 1]]), charted));
    expect(paintKey(a, charted)).not.toBe(paintKey(a, new Set([stars.id])));
    expect(paintKey(a, charted)).not.toBe(paintKey(a));
  });

  it('repaints a whole level quickly after one item is finished', () => {
    // A stand-in canvas: the shading and the walk down every level are measured, not the rasteriser.
    const g = globalThis as { Path2D?: unknown };
    const had = g.Path2D;
    g.Path2D = class { moveTo() {} lineTo() {} closePath() {} };
    const fills: string[] = [];
    const context = { save() {}, restore() {}, clip() {}, stroke() {}, fill(this: { fillStyle: string }) { fills.push(this.fillStyle); }, fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, lineJoin: 'round' } as unknown as CanvasRenderingContext2D;
    try {
      const engine = new SpatialLayoutEngine();
      const resolver = new NavigationLayoutResolver(catalog, engine);
      const regions = resolver.layoutForViewport(catalog.root, PHONE);
      const shapes = createShapeScope(regions, { frame: PHONE, pxPerUnit: 1, sibling: 1 });
      const tops = regions.map((region): LandTop => {
        const cell = shapes.cells.get(region.node.id);
        return { node: region.node, real: region.polygon, draw: cell ? outlinePoints(cell) : region.polygon, path: cell?.path ?? polygonPath(region.polygon) };
      });
      const all = catalog.all();
      const chartedAll = new Set(all.filter((_, i) => i % 3 === 0).map(node => node.id));
      const before = new Map<string, number>(all.filter((_, i) => i % 7 === 0).map(node => [node.id, .3]));
      const sites = restingSites(engine);
      drawLand(context, tops, { engine, learned: { fill: before, charted: chartedAll }, sites });
      const after = new Map(before).set(leaf.id, 1);
      fills.length = 0;
      const start = performance.now();
      drawLand(context, tops, { engine, learned: { fill: after, charted: chartedAll }, sites });
      const ms = performance.now() - start;
      console.info(`[mosaic] root level repaint after one finished item: ${ms.toFixed(1)} ms, ${fills.length} batched fills`);
      expect(fills.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(1500);
    } finally { g.Path2D = had; }
  });
});
