import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { names, savable, searchPlaces, suggestPlaces, type SaveLookup } from './saveTo';

const lookup: SaveLookup = { get: id => catalog.get(id), all: () => catalog.all(), children: id => { const node = catalog.get(id); return node ? catalog.getChildren(node) : []; } };
const EVOLUTION = 'knowledge.science.biology.evolution';

describe('where it fits', () => {
  it('puts its own places first, primary first, then close relatives', () => {
    const places = suggestPlaces({ tagged: [`${EVOLUTION}.natural-selection`, 'knowledge.humanities.philosophy'], text: 'At what level does natural selection work?', mine: [] }, lookup);
    expect(places).toHaveLength(3);
    expect(places[0]).toBe(`${EVOLUTION}.natural-selection`);
    expect(places[1]).toBe('knowledge.humanities.philosophy');
    expect(places[2]).toBe(EVOLUTION);
  });

  it('brings in the learner’s own places near it', () => {
    const mine = [`${EVOLUTION}.deep-time`];
    const places = suggestPlaces({ tagged: [`${EVOLUTION}.natural-selection`], text: 'Why would these animals kill their siblings?', mine }, lookup);
    expect(places).toContain(`${EVOLUTION}.deep-time`);
    // Far from it, a place of theirs stays out.
    expect(suggestPlaces({ tagged: [`${EVOLUTION}.natural-selection`], text: 'Siblings', mine: ['knowledge.arts.music'] }, lookup)).not.toContain('knowledge.arts.music');
  });

  it('prefers places beneath or beside it that its words name', () => {
    const children = lookup.children(EVOLUTION);
    const named = children.find(child => /deep time/i.test(child.name));
    expect(named).toBeDefined();
    const places = suggestPlaces({ tagged: [EVOLUTION], text: 'Deep time: how old is the Earth?', mine: [] }, lookup);
    expect(places.slice(0, 2)).toEqual([EVOLUTION, named!.id]);
  });

  it('never suggests a place beside or beneath it that its words do not name', () => {
    // History has a child (The Medieval World): a video about Pontiac's Rebellion is not offered it.
    const history = 'knowledge.humanities.history';
    expect(lookup.children(history).length).toBeGreaterThan(0);
    const places = suggestPlaces({ tagged: [history], text: 'The British Insult That Sparked Pontiac’s Rebellion How one snub started a war on the frontier.', mine: [] }, lookup);
    expect(places[0]).toBe(history);
    for (const id of places.slice(1)) expect(id === 'knowledge.humanities' || !id.startsWith(`${history}.`)).toBe(true);
    // Across every place's children and siblings: only named ones come in.
    for (const tagged of ['knowledge.science.biology', 'knowledge.science.physics', EVOLUTION, 'knowledge.arts.music']) {
      const node = catalog.get(tagged)!;
      const near = new Set([...lookup.children(tagged), ...(node.parentId ? lookup.children(node.parentId) : [])].map(child => child.id));
      near.delete(tagged);
      expect(suggestPlaces({ tagged: [tagged], text: 'Zzz qqq.', mine: [] }, lookup, 5).filter(id => near.has(id))).toEqual([]);
    }
    // Both words of a two-word name: "death" alone does not name The Black Death.
    expect(names('The Black Death', new Set(['death', 'viking']))).toBe(false);
    expect(names('The Black Death', new Set(['black', 'death']))).toBe(true);
  });

  it('never suggests the root, an encounter or an unknown place, and never twice', () => {
    const places = suggestPlaces({ tagged: ['knowledge', 'knowledge.nowhere', 'knowledge.science.physics', 'knowledge.science.physics'], text: '', mine: ['knowledge'] }, lookup, 5);
    expect(places).not.toContain('knowledge');
    expect(places).not.toContain('knowledge.nowhere');
    expect(new Set(places).size).toBe(places.length);
    expect(places.every(id => savable(catalog.get(id)) && !id.endsWith('.demonstration'))).toBe(true);
  });
});

describe('any other place', () => {
  it('finds places by name: names that start with it first, then any word that does', () => {
    const found = searchPlaces('evol', lookup);
    expect(found[0].id).toBe(EVOLUTION);
    expect(searchPlaces('selection', lookup).some(node => node.id === `${EVOLUTION}.natural-selection`)).toBe(true);
    expect(searchPlaces('x', lookup)).toEqual([]);
    expect(searchPlaces('zzzzqq', lookup)).toEqual([]);
    expect(searchPlaces('e', lookup, 4).length).toBe(0);
    expect(searchPlaces('mat', lookup, 4)).toHaveLength(4);
  });
});
