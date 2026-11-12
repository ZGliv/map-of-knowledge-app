import { describe, expect, it } from 'vitest';
import {
  createExhibition, createExhibitionStore, EXHIBITIONS_KEY, exhibitionsInFile, hang, liveExhibitions, loadExhibitions, mergeExhibitions,
  parseExhibitions, readExhibitions, removeExhibition, saveExhibitions, takeDown, updateExhibition, withExhibitions,
} from './exhibitionStore';

const memory = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
};
const T0 = '2026-10-01T10:00:00.000Z';
const T1 = '2026-10-02T10:00:00.000Z';
const HUMAN = 'knowledge.science.biology.evolution.human-evolution';

describe('the exhibitions store', () => {
  it('makes an exhibition from a question, with its places and things', () => {
    const { store, id } = createExhibition(createExhibitionStore(), { title: '  Why are there   still chimpanzees? ', places: [HUMAN, 'knowledge.not-a-place'], items: ['reel:e09-why-still-chimpanzees', 'reel:e09-why-still-chimpanzees', 'bogus'] }, T0, 'ex-1');
    expect(id).toBe('ex-1');
    const made = liveExhibitions(store)[0];
    expect(made.title).toBe('Why are there still chimpanzees?');
    expect(made.places).toEqual([HUMAN]);
    expect(made.items).toEqual(['reel:e09-why-still-chimpanzees']);
    expect(() => createExhibition(store, { title: '   ' }, T0)).toThrow();
  });

  it('hangs, takes down and brings back a thing', () => {
    let { store } = createExhibition(createExhibitionStore(), { title: 'Sound' }, T0, 'ex-s');
    store = hang(store, 'ex-s', 'link:abc', T1);
    expect(store.exhibitions[0].items).toEqual(['link:abc']);
    store = takeDown(store, 'ex-s', 'link:abc', T1);
    expect(store.exhibitions[0].items).toEqual([]);
    expect(store.exhibitions[0].hidden).toEqual(['link:abc']);
    store = hang(store, 'ex-s', 'link:abc', T1);
    expect(store.exhibitions[0].hidden).toEqual([]);
    // Every change is newer than the last, even within one millisecond.
    expect(store.exhibitions[0].updatedAt > T1).toBe(true);
  });

  it('keeps a removal as a tombstone that wins over a stale copy', () => {
    const { store: a } = createExhibition(createExhibitionStore(), { title: 'Light' }, T0, 'ex-l');
    const renamed = updateExhibition(a, 'ex-l', { title: 'What is light?' }, T1);
    const removed = removeExhibition(a, 'ex-l', T1);
    expect(liveExhibitions(removed)).toEqual([]);
    expect(liveExhibitions(mergeExhibitions(removed, a))).toEqual([]);
    expect(liveExhibitions(mergeExhibitions(a, renamed))[0].title).toBe('What is light?');
    expect(() => hang(removed, 'ex-l', 'link:x')).toThrow();
  });

  it('saves, reads back and loads without writing', () => {
    const storage = memory();
    const { store } = createExhibition(createExhibitionStore(), { title: 'Gravity' }, T0, 'ex-g');
    expect(saveExhibitions(store, storage)).toBeNull();
    expect(readExhibitions(storage)?.exhibitions[0].title).toBe('Gravity');
    const before = storage.data.get(EXHIBITIONS_KEY);
    expect(loadExhibitions(storage).data.exhibitions).toHaveLength(1);
    expect(storage.data.get(EXHIBITIONS_KEY)).toBe(before);
  });

  it('never overwrites a record it cannot read, until an explicit import keeps a copy first', () => {
    const newer = JSON.stringify({ version: 9, exhibitions: [] });
    const storage = memory({ [EXHIBITIONS_KEY]: newer });
    const loaded = loadExhibitions(storage);
    expect(loaded.blocked).toBe(true);
    expect(loaded.warning).toMatch(/blocked/);
    const { store } = createExhibition(createExhibitionStore(), { title: 'Gravity' }, T0, 'ex-g');
    expect(saveExhibitions(store, storage)).toMatch(/blocked/);
    expect(storage.data.get(EXHIBITIONS_KEY)).toBe(newer);
    expect(saveExhibitions(store, storage, { replaceInvalid: true })).toBeNull();
    expect([...storage.data.entries()].some(([key, value]) => key.startsWith(`${EXHIBITIONS_KEY}.recovery.`) && value === newer)).toBe(true);
  });

  it('rejects a malformed record whole, and lets go of unknown places', () => {
    expect(() => parseExhibitions('{')).toThrow();
    expect(() => parseExhibitions(JSON.stringify({ version: 1, exhibitions: [{ id: 'nope', title: 'x', createdAt: T0, updatedAt: T0 }] }))).toThrow();
    const kept = parseExhibitions(JSON.stringify({ version: 1, exhibitions: [{ id: 'ex-a', title: 'A', places: ['knowledge.gone', HUMAN], createdAt: T0, updatedAt: T0 }] }));
    expect(kept.exhibitions[0].places).toEqual([HUMAN]);
  });

  it('travels in the Library backup file and comes back out of it', () => {
    const { store } = createExhibition(createExhibitionStore(), { title: 'Gravity', items: ['work:finch'] }, T0, 'ex-g');
    const file = withExhibitions({ version: 1, entries: [] }, store);
    expect(file.exhibitionsVersion).toBe(1);
    const back = exhibitionsInFile(JSON.stringify(file));
    expect(back?.exhibitions[0].items).toEqual(['work:finch']);
    expect(withExhibitions({ version: 1 }, createExhibitionStore())).toEqual({ version: 1 });
    expect(exhibitionsInFile(JSON.stringify({ version: 1, entries: [] }))).toBeNull();
    expect(exhibitionsInFile('not json')).toBeNull();
  });
});
