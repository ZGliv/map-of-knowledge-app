import { describe, expect, it, vi } from 'vitest';
import { applyLookups, createEnricher, nextBatch, waitingEntries, type EnrichProgress } from './enrich';
import { applyImport, parseLibraryCsv } from './importCsv';
import { createLibraryStore, entryAt, liveItems, type LibraryStore } from './libraryStore';
import { CatalogError, type BookResult, type Lookup } from './openLibrary';
import GOODREADS from './fixtures/goodreads_library_export.csv?raw';

const NOW = '2026-10-23T15:00:00.000Z';
const imported = () => applyImport(createLibraryStore(), parseLibraryCsv(GOODREADS), NOW).library;
const work = (book: Lookup, n: number): BookResult => ({ source: 'ol', workId: `OL${n}W`, title: book.title, creator: book.creator, year: 2000, cover: 1000 + n, subjects: ['Physics'], editions: 3, isbns: book.isbn ? [book.isbn] : [] });
const memoryStorage = () => { const data = new Map<string, string>(); return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) }; };

/** A library held the way App holds it: read the latest, apply a change to it. */
function holder(initial: LibraryStore) {
  let library = initial;
  return { read: () => library, apply: (change: (l: LibraryStore) => LibraryStore) => { library = change(library); }, get library() { return library; } };
}
const clock = () => { let t = Date.parse(NOW); const slept: number[] = []; return { slept, clock: { now: () => t, sleep: async (ms: number) => { slept.push(ms); t += ms; } } }; };

describe('choosing what to look up', () => {
  it('starts with books by ISBN, twenty at a time, read books before wished-for ones', () => {
    const library = imported();
    const first = nextBatch(library)!;
    expect(first.by).toBe('isbn');
    expect(first.books).toHaveLength(20);
    const statuses = first.books.map(book => entryAt(library, `entry:${book.id}`)?.status ?? 'shelf');
    expect(statuses.indexOf('want')).toBe(-1);
  });

  it('asks by title, eight at a time, only once the ISBNs are done', () => {
    let library = imported();
    for (let batch = nextBatch(library); batch?.by === 'isbn'; batch = nextBatch(library)) library = applyLookups(library, new Map(), batch.books, NOW);
    const titles = nextBatch(library)!;
    expect(titles.by).toBe('title');
    expect(titles.books.length).toBeLessThanOrEqual(8);
  });
});

describe('looking up an import', () => {
  it('finishes every book: found ones get a cover and places, unfound ones are tried by title once, then left alone', async () => {
    const store = holder(imported());
    const isbnCalls: number[] = [];
    const titleCalls: number[] = [];
    let n = 0;
    const enricher = createEnricher({
      ...store, storage: memoryStorage(), clock: clock().clock, online: () => true,
      // Every other book is in the catalog by ISBN; the rest only by title, or not at all.
      lookupIsbns: async books => { isbnCalls.push(books.length); return new Map(books.map((book, i) => [book.id, i % 2 ? null : work(book, n++)])); },
      lookupTitles: async books => { titleCalls.push(books.length); return new Map(books.map((book, i) => [book.id, i % 3 ? work(book, n++) : null])); },
    });
    const seen: EnrichProgress[] = [];
    enricher.subscribe(progress => seen.push(progress));
    await enricher.start();
    expect(waitingEntries(store.library)).toEqual([]);
    expect(isbnCalls.every(size => size <= 20)).toBe(true);
    expect(titleCalls.every(size => size <= 8)).toBe(true);
    expect(isbnCalls.reduce((a, b) => a + b, 0)).toBe(43); // Foundation has no ISBN
    const states = liveItems(store.library).map(item => item.enrich);
    expect(new Set(states)).toEqual(new Set(['done', 'miss']));
    const found = liveItems(store.library).find(item => item.enrich === 'done' && !item.ids.shelf)!;
    expect(found.cover).toBeGreaterThan(1000);
    expect(found.places.map(p => p.nodeId)).toContain('knowledge.science.physics');
    expect(seen.at(-1)).toMatchObject({ state: 'done', waiting: 0, looked: expect.any(Number) });
    expect(seen.some(p => p.state === 'running' && p.looked > 0 && p.waiting > 0)).toBe(true);
  });

  it('never asks about the same book twice', async () => {
    const store = holder(imported());
    const asked = new Map<string, number>();
    const count = (books: readonly Lookup[], by: string) => books.forEach(book => asked.set(`${by}:${book.id}`, (asked.get(`${by}:${book.id}`) ?? 0) + 1));
    const enricher = createEnricher({ ...store, storage: memoryStorage(), clock: clock().clock, online: () => true,
      lookupIsbns: async books => { count(books, 'isbn'); return new Map(); }, lookupTitles: async books => { count(books, 'title'); return new Map(); } });
    await enricher.start();
    expect([...asked.values()].every(times => times === 1)).toBe(true);
    await enricher.start();
    expect([...asked.values()].every(times => times === 1)).toBe(true);
  });

  it('pauses offline and resumes where it stopped, from the saved state alone', async () => {
    const store = holder(imported());
    let calls = 0;
    const flaky = createEnricher({ ...store, storage: memoryStorage(), clock: clock().clock, online: () => true,
      lookupIsbns: async books => { calls += 1; if (calls > 1) throw new CatalogError('offline', 'offline'); return new Map(books.map((book, i) => [book.id, i % 2 ? null : work(book, i)])); },
      lookupTitles: async () => { throw new CatalogError('offline', 'offline'); } });
    await flaky.start();
    expect(flaky.progress).toMatchObject({ state: 'paused', reason: 'offline' });
    const left = waitingEntries(store.library).length;
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(44);
    // A new tab, a reload: only the library record carries over.
    const later = holder(JSON.parse(JSON.stringify(store.library)));
    const isbn = vi.fn(async (books: readonly Lookup[]) => new Map(books.map(book => [book.id, null] as const)));
    const resumed = createEnricher({ ...later, storage: memoryStorage(), clock: clock().clock, online: () => true, lookupIsbns: isbn, lookupTitles: async books => new Map(books.map(book => [book.id, null])) });
    await resumed.start();
    expect(waitingEntries(later.library)).toEqual([]);
    expect(isbn.mock.calls.flatMap(([books]) => books.map(book => book.id))).not.toContain(store.library.items.find(item => item.enrichTries === 1)?.id);
  });

  it('backs off when the catalog asks it to slow down, then carries on', async () => {
    const store = holder(imported());
    const { clock: fake, slept } = clock();
    let refusals = 2;
    const enricher = createEnricher({ ...store, storage: memoryStorage(), clock: fake, online: () => true,
      lookupIsbns: async books => { if (refusals-- > 0) throw new CatalogError('slow down', 'rate-limited'); return new Map(books.map(book => [book.id, null])); },
      lookupTitles: async books => new Map(books.map(book => [book.id, null])) });
    await enricher.start();
    expect(slept).toEqual([5000, 10000]);
    expect(waitingEntries(store.library)).toEqual([]);
  });

  it('stops after repeated failures instead of hammering', async () => {
    const store = holder(imported());
    const lookup = vi.fn(async () => { throw new CatalogError('down', 'failed'); });
    const enricher = createEnricher({ ...store, storage: memoryStorage(), clock: clock().clock, online: () => true, lookupIsbns: lookup, lookupTitles: lookup });
    await enricher.start();
    expect(lookup).toHaveBeenCalledTimes(4);
    expect(enricher.progress).toMatchObject({ state: 'paused', reason: 'failing' });
  });

  it('leaves the work to the tab that holds the lease', async () => {
    const storage = memoryStorage();
    const store = holder(imported());
    const slow = { release: () => {} };
    const first = createEnricher({ ...store, storage, clock: clock().clock, online: () => true,
      lookupIsbns: books => new Promise(resolve => { slow.release = () => resolve(new Map(books.map(book => [book.id, null]))); }), lookupTitles: async () => new Map() });
    const running = first.start();
    await Promise.resolve();
    const second = createEnricher({ ...store, storage, clock: clock().clock, online: () => true, lookupIsbns: vi.fn(), lookupTitles: vi.fn() });
    await second.start();
    expect(second.progress).toMatchObject({ state: 'paused', reason: 'elsewhere' });
    first.stop();
    slow.release();
    await running;
  });

  it('does not run offline at all', async () => {
    const lookup = vi.fn();
    const enricher = createEnricher({ ...holder(imported()), storage: memoryStorage(), clock: clock().clock, online: () => false, lookupIsbns: lookup, lookupTitles: lookup });
    await enricher.start();
    expect(lookup).not.toHaveBeenCalled();
    expect(enricher.progress).toMatchObject({ state: 'paused', reason: 'offline' });
  });
});
