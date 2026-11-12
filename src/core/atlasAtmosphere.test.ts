import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { atmosphereAccent, atmosphereFrameHue, atmosphereHue, interpolateAtmosphereHue } from './atlasAtmosphere';
import { territoryHueRange } from './territoryTheme';

describe('territory atmosphere', () => {
  it('uses the actual inherited spectrum for every location, including deep pieces', () => {
    for (const node of catalog.all()) {
      const [start, end] = territoryHueRange(node.id);
      expect(atmosphereHue(node.id)).toBe((start + end) / 2);
    }
    expect(new Set(catalog.getChildren(catalog.root).map(node => atmosphereHue(node.id))).size).toBe(8);
  });
  it('takes the shorter arc across zero without a long rainbow sweep', () => {
    expect(interpolateAtmosphereHue(350, 10, .5)).toBe(0);
    expect(interpolateAtmosphereHue(10, 350, .5)).toBe(0);
    expect(interpolateAtmosphereHue(350, 10, 0)).toBe(350);
    expect(interpolateAtmosphereHue(350, 10, 1)).toBe(10);
  });
  it('reverses exactly on the same camera coordinate and meets every route handoff', () => {
    for (const node of catalog.all().filter(item => item.parentId)) {
      const parentId = node.parentId!;
      const frame = (zoom: number) => atmosphereFrameHue({ parentId, childId: node.id, zoom });
      expect(frame(0)).toBe(atmosphereHue(parentId));
      expect(frame(1)).toBe(atmosphereHue(node.id));
      for (const t of [.1, .35, .7]) {
        expect(frame(t)).toBeCloseTo(interpolateAtmosphereHue(atmosphereHue(node.id), atmosphereHue(parentId), 1 - t), 8);
      }
    }
  });
  it('keeps unknown locations neutral and clamps malformed frame progress', () => {
    expect(atmosphereHue('missing')).toBe(atmosphereHue('knowledge'));
    expect(interpolateAtmosphereHue(150, 220, -1)).toBe(150);
    expect(interpolateAtmosphereHue(150, 220, 4)).toBe(220);
    expect(interpolateAtmosphereHue(150, 220, NaN)).toBe(150);
  });
  it('keeps the world view neutral and lends territory hue only to accents', () => {
    const root = catalog.root.id;
    expect(atmosphereAccent({ parentId: root, childId: root, zoom: 0 }, root).tint).toBe(0);
    for (const node of catalog.getChildren(catalog.root)) {
      const frame = (zoom: number) => atmosphereAccent({ parentId: root, childId: node.id, zoom }, root);
      // Leaving the world fades starlight into the territory's own hue; it never sweeps through other hues.
      for (const t of [0, .25, .5, 1]) {
        expect(frame(t).hue).toBe(atmosphereHue(node.id));
        expect(frame(t).tint).toBe(t);
      }
      expect(atmosphereAccent({ parentId: node.id, childId: node.id, zoom: 0 }, root)).toEqual({ hue: atmosphereHue(node.id), tint: 1 });
    }
    const deep = catalog.all().find(node => node.depth === 3)!;
    const accent = atmosphereAccent({ parentId: deep.parentId!, childId: deep.id, zoom: .4 }, root);
    expect(accent.tint).toBe(1);
    expect(accent.hue).toBeCloseTo(atmosphereFrameHue({ parentId: deep.parentId!, childId: deep.id, zoom: .4 }), 10);
    expect(atmosphereAccent({ parentId: root, childId: catalog.getChildren(catalog.root)[0].id, zoom: NaN }, root).tint).toBe(0);
  });
});
