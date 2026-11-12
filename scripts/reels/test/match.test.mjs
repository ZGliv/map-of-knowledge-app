import { describe, expect, it } from 'vitest';
import { catalog } from '../../../src/core/catalog';
import { descriptionPlace, expeditionPlace, matchPlace, steps } from '../match.mjs';
import { DESCRIPTION_RULES, EXCLUDED_CLASSES, EXCLUDED_OCCUPATIONS, EXPEDITION_RULES, PLACES } from '../placeTable.mjs';

// The place matcher on a small Wikidata graph shaped like the real one (no network).
const e = (id, label, claims = {}, extra = {}) => [id, { id, label, description: extra.description ?? '', claims: { P31: [], P279: [], P106: [], P101: [], P361: [], P171: [], P921: [], P2579: [], P136: [], P1269: [], ...claims }, died: extra.died ?? null }];
const graph = new Map([
  e('Q21175521', 'Hurricane Patricia', { P31: ['Q1'], P361: ['Q9'] }),
  e('Q1', 'Category 5 Pacific hurricane', { P279: ['Q2'] }),
  e('Q2', 'hurricane', { P279: ['Q8092'] }),
  e('Q9', '2015 Pacific hurricane season', { P31: ['Q13406463'] }),
  e('Q1035', 'Charles Darwin', { P31: ['Q5'], P106: ['Q18805'] }, { died: 1882 }),
  e('Q35149', 'Wilhelm Röntgen', { P31: ['Q5'], P106: ['Q169470', 'Q593644'] }, { died: 1923 }),
  e('Q100', 'A living physicist', { P31: ['Q5'], P106: ['Q169470'] }),
  e('Q101', 'A late actor', { P31: ['Q5'], P106: ['Q33999', 'Q82955'] }, { died: 2026 }),
  e('Q102', 'An actor-astronaut', { P31: ['Q5'], P106: ['Q33999', 'Q11631'] }, { died: 2000 }),
  e('Q103', 'A film', { P31: ['Q11424'] }),
  e('Q104', 'A song', { P31: ['Q105543609'] }, { description: '2024 song by a singer' }),
  e('Q105543609', 'musical work/composition', { P279: ['Q2188189'] }),
  e('Q865651', 'Biston betularia', { P31: ['Q16521'], P171: ['Q200'] }),
  e('Q200', 'Biston', { P171: ['Q201'] }),
  e('Q201', 'Geometridae', { P171: ['Q1390'] }),
  e('Q300', 'An odd thing', { P31: ['Q301'] }, { description: 'Volcanic plug in Scotland' }),
  e('Q301', 'landform'),
]);
const lookup = id => graph.get(id);

describe('the curated place table', () => {
  it('only names places that exist in the atlas', () => {
    const places = [...new Set([...Object.values(PLACES).map(p => p.node), ...DESCRIPTION_RULES.map(([, node]) => node), ...EXPEDITION_RULES.map(([, node]) => node)])];
    for (const node of places) expect(catalog.get(node), node).toBeTruthy();
    expect(Object.keys(PLACES).length).toBeGreaterThan(200);
  });

  it('never both places and excludes the same item', () => {
    for (const qid of [...Object.keys(EXCLUDED_CLASSES), ...Object.keys(EXCLUDED_OCCUPATIONS)]) expect(PLACES[qid], qid).toBeUndefined();
    for (const qid of Object.keys(PLACES)) expect(qid).toMatch(/^Q\d+$/);
  });

  it('sends every expedition’s idea to its place', () => {
    expect(expeditionPlace('James Ussher calculated the first day of the world')?.node).toBe('knowledge.science.biology.evolution.deep-time');
    expect(expeditionPlace('An outbreak of bubonic plague in Marseille')?.node).toBe('knowledge.humanities.history.medieval-world.black-death');
    expect(expeditionPlace('A new kind of coffee machine')).toBeNull();
  });
});

describe('the place matcher', () => {
  it('follows instance-of and subclass-of to the closest curated class', () => {
    expect(matchPlace('Q21175521', lookup)).toMatchObject({ node: 'knowledge.earth.climate', depth: 3 });
  });

  it('is not ruled out by what an item is part of (a list), only by what it is', () => {
    expect(matchPlace('Q21175521', lookup).skip).toBeUndefined();
    expect(matchPlace('Q103', lookup)).toEqual({ skip: 'a film' });
  });

  it('names a curated item directly', () => {
    expect(matchPlace('Q1035', lookup)).toMatchObject({ node: 'knowledge.science.biology.evolution', depth: 0 });
  });

  it('places dead people by the occupation Wikidata lists first, and skips the living', () => {
    expect(matchPlace('Q35149', lookup).node).toBe('knowledge.science.physics');
    expect(matchPlace('Q100', lookup)).toEqual({ skip: 'a living person' });
  });

  it('skips people known for entertainment, unless they also had a real field', () => {
    expect(matchPlace('Q101', lookup)).toEqual({ skip: 'known as a actor' });
    expect(matchPlace('Q102', lookup).node).toBe('knowledge.science.astronomy');
  });

  it('skips what the short description calls entertainment, even when Wikidata says little', () => {
    expect(matchPlace('Q104', lookup, { description: '2024 song by Thundercat' }).skip).toMatch(/song/);
  });

  it('climbs a living thing’s parent taxa', () => {
    expect(matchPlace('Q865651', lookup)).toMatchObject({ node: 'knowledge.science.biology.animals' });
  });

  it('falls back to the short description, then gives up', () => {
    expect(matchPlace('Q300', lookup, { description: 'Volcanic plug in Scotland' }).node).toBe('knowledge.earth.geology');
    expect(matchPlace('Q301', lookup)).toEqual({ skip: 'no atlas place fits' });
    expect(matchPlace('Q999', lookup)).toEqual({ skip: 'no Wikidata item' });
    expect(descriptionPlace('A tower under construction in Skopje').node).toBe('knowledge.arts.architecture');
  });

  it('takes only the steps its role allows', () => {
    const [, item] = e('Q1', 'x', { P31: ['Q2'], P279: ['Q3'], P361: ['Q4'], P106: ['Q5'] });
    expect(steps(item, 'class')).toEqual([['Q3', 'class']]);
    expect(steps(item, 'item').map(([id]) => id)).toEqual(['Q2', 'Q3', 'Q4']);
  });
});
