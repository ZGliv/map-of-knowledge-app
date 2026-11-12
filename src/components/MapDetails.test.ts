import { describe, expect, it } from 'vitest';
import { bandSpans, blockParts, labelLayout } from './MapDetails';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { KnowledgeNode, Polygon, RegionLayout } from '../spatial/types';

const W = 375, H = 812;
const frame: Polygon = [[0, 0], [0, H], [W, H], [W, 0]];
const node = (id: string, index = 0, depth = 1): KnowledgeNode => ({ id, name: `Territory ${index}`, parentId: null, depth, index, weight: 1 });
const regions = new SpatialLayoutEngine().layout(node('w', 0, 0), Array.from({ length: 12 }, (_, i) => node(`w.c${i}`, i)), frame);
const viewport = { width: W, height: H };
// The phone's bars: 48px on top, 58px of tabs below, each with half its 16px fade.
const safe = { x0: 0, y0: 56, x1: W, y1: H - 66 };

const partsOf = (layout: ReturnType<typeof labelLayout>) => blockParts(layout.lines, layout.labelSize, layout.small, layout.compact, layout.motif, layout.caption);

describe('label placement under the bars', () => {
  it('puts a name at its territory centroid when it fits there and nothing covers the map', () => {
    let atCentroid = 0;
    for (const region of regions) {
      const layout = labelLayout(region, viewport);
      const fits = partsOf(layout).every(([top, bottom, half]) => { return bandSpans(region.polygon, region.centroid[1] + top, region.centroid[1] + bottom).some(([l, r]) => l + half < region.centroid[0] && region.centroid[0] < r - half); });
      if (fits && layout.y === region.centroid[1]) atCentroid += 1;
    }
    expect(atCentroid).toBeGreaterThan(regions.length / 2);
  });

  it('keeps every motif, name and caption clear of the bars and inside its territory', () => {
    for (const region of regions) {
      const layout = labelLayout(region, viewport, safe);
      for (const [top, bottom, half] of partsOf(layout)) {
        expect(layout.y + top).toBeGreaterThanOrEqual(safe.y0);
        expect(layout.y + bottom).toBeLessThanOrEqual(safe.y1);
        expect(bandSpans(region.polygon, layout.y + top, layout.y + bottom).some(([l, r]) => l <= layout.x - half && layout.x + half <= r)).toBe(true);
      }
    }
  });

  it('leaves territories well inside the uncovered map where they were without the bars', () => {
    const inside = regions.filter(region => region.bounds.y > safe.y0 + 90 && region.bounds.y + region.bounds.height < safe.y1 - 90);
    expect(inside.length).toBeGreaterThan(0);
    for (const region of inside) expect(labelLayout(region, viewport, safe)).toEqual(labelLayout(region, viewport));
  });
});

describe('label placement around floating controls', () => {
  // A phone in the app: the screen inside a 59px status bar and a 34px home indicator, with the
  // lead and tool capsules at the top and the tab capsule at the bottom, the map open between them.
  const lead = { x0: 10, y0: 65, x1: 269, y1: 109 }, tools = { x0: 277, y0: 65, x1: 365, y1: 109 }, tabs = { x0: 73, y0: 730, x1: 303, y1: 786 };
  const phone = { x0: 0, y0: 59, x1: W, y1: H - 34, obstacles: [lead, tools, tabs] };
  const overlaps = (x: number, y: number, [top, bottom, half]: [number, number, number], o: typeof lead) => x - half < o.x1 && x + half > o.x0 && y + top < o.y1 && y + bottom > o.y0;

  it('keeps every motif, name and caption off every capsule, inside the frame and its territory', () => {
    for (const region of regions) {
      const layout = labelLayout(region, viewport, phone);
      for (const part of partsOf(layout)) {
        for (const o of phone.obstacles) expect(overlaps(layout.x, layout.y, part, o)).toBe(false);
        expect(layout.y + part[0]).toBeGreaterThanOrEqual(phone.y0);
        expect(layout.y + part[1]).toBeLessThanOrEqual(phone.y1);
      }
    }
  });

  it('uses the open map beside a capsule, where a bar used to run across the screen', () => {
    // A 430 x 932 phone. A small territory in the bottom-left corner, beside the tab capsule: under a
    // band it would have no room at all; beside the capsule its name sits level with the tabs.
    const big = { width: 430, height: 932 }, capsule = { x0: 100, y0: 850, x1: 330, y1: 906 };
    const corner = { node: node('corner', 0), site: [60, 881], polygon: [[0, 830], [0, 932], [120, 932], [120, 830]], centroid: [60, 881], area: 120 * 102, bounds: { x: 0, y: 830, width: 120, height: 102 } } as RegionLayout;
    const layout = labelLayout(corner, big, { x0: 0, y0: 59, x1: 430, y1: 932 - 34, obstacles: [capsule] });
    for (const part of partsOf(layout)) expect(overlaps(layout.x, layout.y, part, capsule)).toBe(false);
    expect(layout.y).toBeGreaterThan(capsule.y0);
    expect(layout.y).toBeLessThan(capsule.y1);
  });
});
