import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import { BLACK_DEATH } from '../core/history';
import fixture from './fixtures/openlibrary-subjects.json';
import { mapPlaces, normalizeTerm, placeAliases, scorePlaces, suggestPlaces } from './placeMap';

// Real Open Library work subjects, captured from search.json (see the fixture's `retrieved` date).
const work = (title: string) => {
  const found = fixture.works.find(w => w.title.toLowerCase().startsWith(title.toLowerCase()));
  if (!found) throw new Error(`No fixture for ${title}`);
  return { title: found.title, subjects: found.subjects };
};
const ids = (picks: { nodeId: string }[]) => picks.map(p => p.nodeId);
const SELECTION = evolutionTerritoryId('natural-selection');

describe('the alias table', () => {
  it('points only at real, non-sample atlas places, under terms already in normal form', () => {
    for (const [term, aliases] of placeAliases()) {
      expect(normalizeTerm(term)).toBe(term);
      for (const alias of aliases) {
        const node = catalog.get(alias.nodeId);
        expect(node, `${term} → ${alias.nodeId}`).toBeTruthy();
        expect((node as { sample?: boolean }).sample).toBeFalsy();
        expect(alias.weight).toBeGreaterThan(0);
        expect(alias.weight).toBeLessThanOrEqual(1);
      }
    }
  });
  it('normalizes accents, ampersands and catalog punctuation', () => {
    expect(normalizeTerm('Évolution (Biologie)')).toBe('evolution biologie');
    expect(normalizeTerm('Molecules & Cells')).toBe('molecules and cells');
    expect(normalizeTerm('Darwin, Charles, 1809-1882')).toBe('darwin charles 1809 1882');
  });
});

describe('placing real books from their Open Library subjects', () => {
  it.each([
    ['The beak of the finch', [EVOLUTION_ID, 'knowledge.science.biology.animals']],
    ['A Brief History of Time', ['knowledge.science.astronomy']],
    ['Thinking, fast and slow', ['knowledge.society.psychology']],
    ['The Myth of Sisyphus', ['knowledge.humanities.philosophy', 'knowledge.humanities.literature']],
    ['The Selfish Gene', ['knowledge.science.biology.genetics-genomes', EVOLUTION_ID]],
    ['Cosmos', ['knowledge.science.astronomy']],
    ['Silent Spring', ['knowledge.earth.ecology']],
    ['The Sixth Extinction', [evolutionTerritoryId('transitions-extinctions')]],
    ['The Road', ['knowledge.humanities.literature']],
    ['Freakonomics', ['knowledge.economics']],
  ] as const)('%s', (title, expected) => {
    expect(ids(mapPlaces(work(title)))).toEqual(expected);
  });

  it('finds the charted place inside a broad one: The Great Mortality reaches the Black Death', () => {
    expect(ids(mapPlaces(work('The Great Mortality')))).toContain(BLACK_DEATH.id);
  });

  it('lets a narrower place stand in for the broader one when it carries the evidence', () => {
    const picks = ids(mapPlaces(work('Gödel, Escher, Bach')));
    expect(picks[0]).toBe('knowledge.mathematics.logic');
    expect(picks).not.toContain('knowledge.mathematics');
  });

  it('ignores catalog noise: reading lists, bestseller tags, and "non-fiction" is not fiction', () => {
    expect(scorePlaces({ subjects: ['Long Now Manual for Civilization', 'New York Times bestseller', 'Open Library Staff Picks'] }).size).toBe(0);
    expect(scorePlaces({ shelves: ['non-fiction', 'to-read', 'favorites'] }).size).toBe(0);
    expect(ids(mapPlaces({ subjects: ['Dinosaurs', 'Juvenile literature'] }))).toEqual([evolutionTerritoryId('deep-time')]);
  });
});

describe('the rules', () => {
  it('is deterministic: the same evidence gives the same places, in the same order, every time', () => {
    const evidence = work('Guns, Germs, and Steel');
    const first = mapPlaces(evidence);
    for (let i = 0; i < 5; i += 1) expect(mapPlaces(evidence)).toEqual(first);
  });

  it('returns at most three places, scored from 0 to 1, best first', () => {
    for (const w of fixture.works) {
      const picks = mapPlaces(w);
      expect(picks.length).toBeLessThanOrEqual(3);
      for (const pick of picks) { expect(pick.score).toBeGreaterThan(0); expect(pick.score).toBeLessThanOrEqual(1); }
      expect(picks.map(p => p.score)).toEqual([...picks.map(p => p.score)].sort((a, b) => b - a));
    }
  });

  it('claims nothing on thin evidence', () => {
    expect(mapPlaces({})).toEqual([]);
    expect(mapPlaces({ title: 'Meditations' })).toEqual([]);
    expect(mapPlaces({ subjects: ['Life'] })).toEqual([]);
    // A broad word in a title is never enough: "A Brief History of Time" is not History.
    expect(mapPlaces({ title: 'A Brief History of Time' })).toEqual([]);
  });

  it('weighs Wikidata main subjects and genres', () => {
    expect(ids(mapPlaces({ mainSubjects: ['astronomy', 'cosmology'], genres: ['documentary television series'] }))).toEqual(['knowledge.science.astronomy']);
    expect(ids(mapPlaces({ mainSubjects: ['natural selection'], genres: ['documentary film'] }))).toEqual([SELECTION]);
  });

  it('uses the learner’s own shelves, and the title only for specific names', () => {
    expect(ids(mapPlaces({ shelves: ['history', 'favorites'] }))).toEqual(['knowledge.humanities.history']);
    expect(ids(mapPlaces({ title: 'The Black Death: A History' }))).toEqual([BLACK_DEATH.id]);
  });

  it('never returns an illustrative sample place', () => {
    for (const w of fixture.works) for (const pick of mapPlaces(w)) expect((catalog.get(pick.nodeId) as { sample?: boolean }).sample).toBeFalsy();
    expect(scorePlaces({ text: 'harmony acceleration mechanics' }).has('knowledge.arts.music.harmony')).toBe(false);
  });
});

describe('suggesting a place for a link', () => {
  it('reads the learner’s line first, the page’s own words second', () => {
    expect(suggestPlaces('The peppered moth and natural selection')[0]).toBe(SELECTION);
    expect(suggestPlaces('Lenski’s long-term experiment with E. coli and natural selection')[0]).toBe(SELECTION);
    expect(suggestPlaces('', 'Peppered moth evolution - Wikipedia. The evolution of the peppered moth is an example of natural selection.')[0]).toBe(SELECTION);
    expect(suggestPlaces('A great talk on natural selection in finches')[0]).toBe(SELECTION);
    expect(suggestPlaces('xy')).toEqual([]);
  });
});
