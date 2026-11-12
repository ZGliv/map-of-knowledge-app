import { describe, expect, it } from 'vitest';
import {
  COLLECTIONS_KEY, COLLECTION_LIMITS, createCollection, createCollections, liveCollections, loadCollections, mergeCollections, parseCollections, readCollections,
  removeCollection, renameCollection, saveCollections, setCollectionItems, toggleCollectionItem,
} from './collections';

const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
};
const T0 = Date.UTC(2026, 9, 1, 12);

describe('collections', () => {
  it('start empty, and an absent record loads as empty without writing', () => {
    const store = memory();
    expect(loadCollections(store)).toEqual({ data: createCollections(), warning: null, blocked: false });
    expect(store.data.size).toBe(0);
  });

  it('are made with a name and things from the library, by their keys', () => {
    const { record, id } = createCollection(createCollections(), { name: '  What survives  a catastrophe? ', items: ['work:origin', 'link:abc', 'link:abc', 'reel:e08-the-great-dying'], id: 'c1' }, T0);
    const made = record.collections.find(c => c.id === id)!;
    expect(made.name).toBe('What survives a catastrophe?');
    expect(made.items).toEqual(['work:origin', 'link:abc', 'reel:e08-the-great-dying']);
    expect(() => createCollection(record, { name: '   ' })).toThrow(/name/);
    expect(() => createCollection(record, { name: 'x'.repeat(COLLECTION_LIMITS.name + 1) })).toThrow(/under/);
    expect(() => createCollection(record, { name: 'Bad', items: ['https://example.org'] })).toThrow(/library/);
    expect(() => createCollection(record, { name: 'Again', id: 'c1' })).toThrow(/exists/);
  });

  it('are renamed, filled and emptied, each edit newer than the last', () => {
    let { record } = createCollection(createCollections(), { name: 'Deep time', id: 'c1' }, T0);
    record = toggleCollectionItem(record, 'c1', 'note:n1', T0);
    record = toggleCollectionItem(record, 'c1', 'work:origin', T0);
    expect(record.collections[0].items).toEqual(['note:n1', 'work:origin']);
    record = toggleCollectionItem(record, 'c1', 'note:n1', T0);
    expect(record.collections[0].items).toEqual(['work:origin']);
    record = setCollectionItems(record, 'c1', ['reel:r1', 'work:origin'], T0);
    record = renameCollection(record, 'c1', 'Deep time, briefly', T0);
    const c = record.collections[0];
    expect(c.items).toEqual(['reel:r1', 'work:origin']);
    expect(c.name).toBe('Deep time, briefly');
    expect(Date.parse(c.updatedAt)).toBeGreaterThan(Date.parse(c.createdAt));
  });

  it('are removed as tombstones, which win over a stale copy from another tab', () => {
    const { record } = createCollection(createCollections(), { name: 'Deep time', id: 'c1' }, T0);
    const stale = renameCollection(record, 'c1', 'Deep time!', T0);
    const removed = removeCollection(record, 'c1', T0 + 5000);
    expect(liveCollections(removed)).toEqual([]);
    expect(liveCollections(mergeCollections(stale, removed))).toEqual([]);
    expect(liveCollections(mergeCollections(removed, stale))).toEqual([]);
    expect(() => renameCollection(removed, 'c1', 'Back')).toThrow(/no longer/);
  });

  it('merge two tabs without losing a collection', () => {
    const a = createCollection(createCollections(), { name: 'One', id: 'a' }, T0).record;
    const b = createCollection(createCollections(), { name: 'Two', id: 'b' }, T0 + 1).record;
    expect(liveCollections(mergeCollections(a, b)).map(c => c.name).sort()).toEqual(['One', 'Two']);
  });

  it('save, read back and load again', () => {
    const store = memory();
    const { record } = createCollection(createCollections(), { name: 'Deep time', items: ['work:origin'], id: 'c1' }, T0);
    expect(saveCollections(record, store)).toBeNull();
    expect(readCollections(store)).toEqual(record);
    expect(loadCollections(store).data).toEqual(record);
    expect(parseCollections(store.data.get(COLLECTIONS_KEY)!)).toEqual(record);
  });

  it('never overwrite a record they cannot read, and block saving until it is dealt with', () => {
    const store = memory({ [COLLECTIONS_KEY]: '{"version":9,"collections":[]}' });
    const loaded = loadCollections(store);
    expect(loaded.blocked).toBe(true);
    expect(loaded.warning).toMatch(/Unsupported collections version/);
    expect(saveCollections(createCollections(), store)).toMatch(/blocked/);
    expect(store.data.get(COLLECTIONS_KEY)).toBe('{"version":9,"collections":[]}');
    expect(readCollections(store)).toBeNull();
  });

  it('reject a record with one bad collection as a whole', () => {
    expect(() => parseCollections(JSON.stringify({ version: 1, collections: [{ id: 'c1', name: 'Fine', items: [], createdAt: new Date(T0).toISOString(), updatedAt: new Date(T0).toISOString() }, { id: 'c2', name: '', items: [], createdAt: 'x', updatedAt: 'x' }] }))).toThrow();
    expect(() => parseCollections('not json')).toThrow(/JSON/);
  });

  it('report a browser that did not keep the save', () => {
    const forgetful = { getItem: () => null, setItem: () => {} };
    expect(saveCollections(createCollections(), forgetful)).toMatch(/did not keep/);
  });
});
