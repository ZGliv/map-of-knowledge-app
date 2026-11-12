import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { sampleLeaf, SAMPLE_TERRITORIES } from './sampleTerritories';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import {
  NEUTRAL_TERRITORY_COLOR,
  SUBJECT_THEMES,
  subjectTheme,
  territoryColor,
  territoryHueRange,
  territoryPalette,
} from './territoryTheme';

describe('hierarchical territory spectrum', () => {
  it('gives Science a mint-to-blue range and retains eight distinct subject identities', () => {
    expect(territoryHueRange('knowledge.science')).toEqual([148, 216]);
    expect(territoryPalette('knowledge.science')).toEqual({
      start: '#76d5a3', middle: '#76d2d5', end: '#769cd5',
    });
    expect(SUBJECT_THEMES).toHaveLength(8);
    expect(new Set(SUBJECT_THEMES.map(subject => subject.color)).size).toBe(8);
    for (const subject of SUBJECT_THEMES) {
      expect(territoryColor(subject.nodeId)).toBe(subject.color);
      expect(new Set(Object.values(territoryPalette(subject.nodeId))).size).toBe(3);
    }
  });

  it('contains every child range inside its parent while retaining distinct major fields', () => {
    for (const node of catalog.all().filter(node => node.depth >= 2)) {
      const [start, end] = territoryHueRange(node.id);
      const [parentStart, parentEnd] = territoryHueRange(node.parentId!);
      expect(start, node.id).toBeGreaterThanOrEqual(parentStart);
      expect(end, node.id).toBeLessThanOrEqual(parentEnd);
      // An only child keeps its parent's whole range (territoryHueRange's own rule); siblings narrow it.
      if (catalog.getChildren(catalog.get(node.parentId!)!).length > 1) expect(end - start, node.id).toBeLessThan(parentEnd - parentStart);
      else expect([start, end], node.id).toEqual([parentStart, parentEnd]);
      for (const color of Object.values(territoryPalette(node.id))) expect(color).toMatch(/^#[\da-f]{6}$/);
    }
    for (const subject of SUBJECT_THEMES) {
      const children = catalog.getChildren(catalog.get(subject.nodeId)!);
      expect(new Set(children.map(child => territoryColor(child.id))).size).toBe(children.length);
    }
  });

  it('orders sibling shades by fixed canonical space without consuming live layout state', () => {
    const engine = new SpatialLayoutEngine();
    for (const subject of SUBJECT_THEMES) {
      const node = catalog.get(subject.nodeId)!;
      const siblings = [...engine.layout(node, catalog.getChildren(node), [[0, 0], [0, 1000], [1000, 1000], [1000, 0]])]
        .sort((first, second) => first.centroid[0] - second.centroid[0]);
      const lowerHues = siblings.map(region => territoryHueRange(region.node.id)[0]);
      expect(lowerHues).toEqual([...lowerHues].sort((first, second) => first - second));
      expect(territoryHueRange(siblings[0].node.id)[0]).toBe(territoryHueRange(node.id)[0]);
      expect(territoryHueRange(siblings.at(-1)!.node.id)[1]).toBe(territoryHueRange(node.id)[1]);
      const before = siblings.map(region => territoryPalette(region.node.id));
      // Live layout sizes and querying colors in another order cannot alter hue.
      engine.layout(node, catalog.getChildren(node), [[0, 0], [0, 844], [390, 844], [390, 0]]);
      [...siblings].reverse().forEach(region => territoryPalette(region.node.id));
      expect(siblings.map(region => territoryPalette(region.node.id))).toEqual(before);
    }
  });

  it('narrows deep sample routes gently while keeping the original subject family', () => {
    for (const sample of SAMPLE_TERRITORIES) {
      const leafId = sampleLeaf(sample.subject);
      const path = catalog.getPath(catalog.get(leafId)!);
      const widths = path.slice(1).map(node => {
        const [start, end] = territoryHueRange(node.id);
        return end - start;
      });
      expect(widths).toHaveLength(path.length - 1);
      for (let index = 1; index < widths.length; index++) {
        expect(widths[index]).toBeCloseTo(widths[index - 1] / 2);
      }
      expect(widths.at(-1)).toBeGreaterThan(0.2);
      expect(subjectTheme(leafId)?.key).toBe(sample.subject);
      expect(territoryColor(leafId)).toBe(territoryPalette(leafId).middle);
    }
  });

  it('uses safe stable fallbacks for the atlas, foreign IDs and not-yet-authored descendants', () => {
    expect(territoryPalette('knowledge')).toEqual({
      start: NEUTRAL_TERRITORY_COLOR, middle: NEUTRAL_TERRITORY_COLOR, end: NEUTRAL_TERRITORY_COLOR,
    });
    expect(territoryColor('knowledge.scientology')).toBe(NEUTRAL_TERRITORY_COLOR);
    expect(territoryPalette('knowledge.science.physics.future-topic'))
      .toEqual(territoryPalette('knowledge.science.physics'));
    expect(territoryPalette('knowledge.science')).toBe(territoryPalette('knowledge.science'));
  });
});
