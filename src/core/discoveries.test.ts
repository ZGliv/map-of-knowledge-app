import { describe, expect, it } from 'vitest';
import { catalog, objectiveNodeId } from './catalog';
import { sampleLeaf, SAMPLE_TERRITORIES } from './sampleTerritories';
import { DISCOVERIES, getDiscovery, LEARNING_SOURCES, retrieveSources } from './discoveries';

describe('authored discoveries', () => {
  it('covers the eight existing sample leaves and a precise fractions bridge', () => {
    expect(DISCOVERIES).toHaveLength(9);
    expect(new Set(DISCOVERIES.map((discovery) => discovery.id)).size).toBe(9);
    expect(new Set(DISCOVERIES.map((discovery) => discovery.footprintId))).toEqual(new Set([
      ...SAMPLE_TERRITORIES.map((territory) => sampleLeaf(territory.subject)), objectiveNodeId('quarter-unit-path'),
    ]));
    for (const discovery of DISCOVERIES) {
      const leaf = catalog.get(discovery.footprintId)!;
      expect(leaf, discovery.id).toBeDefined();
      expect(catalog.childCount(leaf)).toBe(0);
      expect(catalog.getPath(leaf).some((node) => node.id === discovery.topicId)).toBe(true);
      expect(discovery.minutes).toBeGreaterThanOrEqual(3);
      expect(discovery.minutes).toBeLessThanOrEqual(5);
    }
  });
  it.each(DISCOVERIES)('$id has a probe, two fresh transfer checks, and real source references', (discovery) => {
    expect(discovery.challenges.length).toBeGreaterThanOrEqual(3);
    expect(new Set(discovery.challenges.map((challenge) => challenge.id)).size).toBe(discovery.challenges.length);
    expect(new Set(discovery.challenges.map((challenge) => challenge.prompt)).size).toBe(discovery.challenges.length);
    for (const challenge of discovery.challenges) {
      expect(challenge.choices).toHaveLength(4);
      expect(new Set(challenge.choices.map((choice) => choice.id)).size).toBe(4);
      expect(challenge.choices.filter((choice) => choice.id === challenge.correctId)).toHaveLength(1);
      expect(challenge.hints.length).toBeGreaterThanOrEqual(2);
      expect(challenge.visual.values.every(Number.isFinite)).toBe(true);
    }
    expect(discovery.sourceIds.length).toBeGreaterThanOrEqual(1);
    for (const id of discovery.sourceIds) expect(LEARNING_SOURCES.some((source) => source.id === id)).toBe(true);
    for (const id of [...discovery.connections, ...discovery.prerequisites]) expect(getDiscovery(id)).toBeDefined();
  });
  it('uses HTTPS references and does not make up a source for an unknown question', () => {
    expect(new Set(LEARNING_SOURCES.map((source) => source.id)).size).toBe(LEARNING_SOURCES.length);
    for (const source of LEARNING_SOURCES) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(source.excerpt.length).toBeGreaterThan(60);
    }
    expect(getDiscovery('not-in-this-collection')).toBeUndefined();
    expect(retrieveSources('quuxxyz')).toEqual([]);
    expect(retrieveSources('', 'knowledge')).toEqual([]);
    expect(retrieveSources('')).toEqual([]);
  });
  it('retrieves relevant excerpts using text and exact territory context', () => {
    expect(retrieveSources('slope velocity position')[0].id).toBe('motion-graphs');
    expect(retrieveSources('merge sorted queue')[0].id).toBe('merge-sorted-runs');
    expect(retrieveSources('', sampleLeaf('arts')).map((source) => source.id)).toContain('music-meter');
    expect(retrieveSources('', 'knowledge.fake')).toEqual([]);
    expect(retrieveSources('energy')[0].id).toBe('food-webs');
    expect(retrieveSources('rhythm')).toEqual(retrieveSources('rhythm'));
    expect(retrieveSources('beat food memory sorted fractions').length).toBeLessThanOrEqual(3);
  });
  it('does not allow callers to edit the shared library through retrieval results', () => {
    const original = LEARNING_SOURCES.find((source) => source.id === 'motion-graphs')!.excerpt;
    const result = retrieveSources('velocity');
    result[0].excerpt = 'changed';
    expect(LEARNING_SOURCES.find((source) => source.id === 'motion-graphs')!.excerpt).toBe(original);
  });
});
