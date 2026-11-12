import { describe, expect, it, vi } from 'vitest';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import {
  addNote, createLibraryStore, cycleReading, domainOf, entryAt, LIBRARY_BACKUP_KEY, LIBRARY_STORAGE_KEY, libraryFrom, libraryInFile, linkPlaces, liveItems, liveLinks, liveNotes,
  loadLibrary, mergeLibraries, nextStatus, normalizeUrl, notesFor, parseLibrary, readLibrary, removeEntry, removeLink, removeNote, saveLibrary, saveLink,
  setPlaces, setStatus, shelfReading, upsertEntry, withLibrary, type LibraryEntry, type LibraryStore,
} from './libraryStore';

const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const SELECTION = evolutionTerritoryId('natural-selection');
const day = (n: number) => new Date(Date.UTC(2026, 9, 1 + n, 12)).toISOString();

/** A record exactly as the version 1 build wrote it: two links (one removed) and two reading marks. */
const V1_RECORD = JSON.stringify({
  version: 1,
  links: [
    { id: 'a1b2c3d4-0000-4000-8000-000000000001', url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: 'The peppered moth', nodeId: SELECTION, createdAt: day(1), updatedAt: day(1) },
    { id: 'a1b2c3d4-0000-4000-8000-000000000002', url: 'https://www.pbs.org/wgbh/evolution/', note: '', nodeId: null, createdAt: day(2), updatedAt: day(3), removedAt: day(3) },
  ],
  reading: {
    finch: { state: 'finished', startedAt: day(2), finishedAt: day(6), updatedAt: day(6) },
    origin: { state: 'started', startedAt: day(4), updatedAt: day(4) },
  },
});

const book = (over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id: 'ol-OL1892617W', kind: 'book', format: 'Book', title: 'A Brief History of Time', creator: 'Stephen Hawking', year: 1988, cover: 9259256,
  ids: { ol: 'OL1892617W' }, subjects: ['Cosmology', 'Physics'], tags: [], places: [{ nodeId: 'knowledge.science.astronomy', score: 1 }], placesBy: 'auto',
  status: 'want', addedAt: day(1), source: 'search', createdAt: day(1), updatedAt: day(1), ...over,
});

describe('saved links', () => {
  it('accepts pasted and bare addresses, refuses anything that is not a web page', () => {
    expect(normalizeUrl('  https://www.pbs.org/wgbh/evolution/ ')).toBe('https://www.pbs.org/wgbh/evolution/');
    expect(normalizeUrl('en.wikipedia.org/wiki/Finch')).toBe('https://en.wikipedia.org/wiki/Finch');
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('just some words')).toBeNull();
    expect(normalizeUrl('ftp://example.org/x')).toBeNull();
    expect(domainOf('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
  });

  it('saves, edits and removes a link, keeping a tombstone', () => {
    let library = saveLink(createLibraryStore(), { url: 'pbs.org/x', note: '  A film  about   finches ', nodeId: SELECTION });
    const [link] = library.links;
    expect(link).toMatchObject({ url: 'https://pbs.org/x', note: 'A film about finches', nodeId: SELECTION });
    library = saveLink(library, { id: link.id, url: link.url, note: 'Finches', nodeId: null });
    expect(library.links).toHaveLength(1);
    expect(library.links[0]).toMatchObject({ note: 'Finches', nodeId: null, createdAt: link.createdAt });
    library = removeLink(library, link.id);
    expect(liveLinks(library)).toEqual([]);
    expect(library.links[0].removedAt).toBeTruthy();
    expect(() => saveLink(library, { url: 'not a link', note: '', nodeId: null })).toThrow(/web address/);
  });

  it('keeps what the page said about itself, only while the address stays the same', () => {
    const seen = { title: 'Peppered moth evolution', description: 'An example of natural selection.', siteName: 'Wikipedia', image: 'https://upload.wikimedia.org/moth.jpg', at: day(1) };
    let library = saveLink(createLibraryStore(), { url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: '', nodeId: null, preview: seen });
    const id = library.links[0].id;
    library = saveLink(library, { id, url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: 'Moths', nodeId: null });
    expect(library.links[0].preview).toEqual(seen);
    library = saveLink(library, { id, url: 'https://en.wikipedia.org/wiki/Biston_betularia', note: 'Moths', nodeId: null });
    expect(library.links[0].preview).toBeUndefined();
    expect(() => saveLink(library, { url: 'a.org', note: '', nodeId: null, preview: { ...seen, image: 'javascript:alert(1)' } })).toThrow(/https/);
  });

  it('merges two tabs without losing a link or bringing a removed one back', () => {
    const base = saveLink(createLibraryStore(), { url: 'a.org', note: 'A', nodeId: null });
    const removed = removeLink(base, base.links[0].id);
    const other = saveLink(base, { url: 'b.org', note: 'B', nodeId: null });
    const merged = mergeLibraries(other, removed);
    expect(liveLinks(merged).map(l => l.note)).toEqual(['B']);
    expect(merged.links).toHaveLength(2);
  });
});

describe('a video saved under several places', () => {
  it('keeps its own place and the rest, survives an edit of its line, and lets go of a place the map lost', () => {
    const url = 'https://www.youtube.com/watch?v=abcdefghijk';
    let library = saveLink(createLibraryStore(), { url, note: 'Finch beaks', nodeId: SELECTION, places: [EVOLUTION_ID, SELECTION, EVOLUTION_ID] });
    const [link] = liveLinks(library);
    expect(link.places).toEqual([EVOLUTION_ID]);
    expect(linkPlaces(link)).toEqual([SELECTION, EVOLUTION_ID]);
    // Edited from the Library's own sheet (one place there): the further places stay.
    library = saveLink(library, { id: link.id, url, note: 'Finch beaks, again', nodeId: SELECTION });
    expect(linkPlaces(liveLinks(library)[0])).toEqual([SELECTION, EVOLUTION_ID]);
    // Saved again from Watch with other places: those replace them.
    library = saveLink(library, { id: link.id, url, note: 'Finch beaks', nodeId: EVOLUTION_ID, places: [] });
    expect(linkPlaces(liveLinks(library)[0])).toEqual([EVOLUTION_ID]);
    expect(liveLinks(library)[0]).not.toHaveProperty('places');
    // None on the Library's sheet (no place, no further places): it is under no place at all.
    library = saveLink(library, { id: link.id, url, note: 'Finch beaks', nodeId: SELECTION, places: [EVOLUTION_ID] });
    library = saveLink(library, { id: link.id, url, note: 'Finch beaks', nodeId: null, places: [] });
    expect(linkPlaces(liveLinks(library)[0])).toEqual([]);
    // Read back from storage, a place the map no longer has is let go; the record still loads.
    const raw = { version: 2, links: [{ ...link, places: ['knowledge.gone.place', EVOLUTION_ID] }], items: [], notes: [] };
    expect(libraryFrom(raw).links[0].places).toEqual([EVOLUTION_ID]);
    expect(() => libraryFrom({ ...raw, links: [{ ...link, places: 'nope' }] })).toThrow(/places/);
    expect(linkPlaces({ nodeId: null })).toEqual([]);
  });
});

describe('items and their statuses', () => {
  it('moves want → reading → finished, with the dates each step implies', () => {
    let library = upsertEntry(createLibraryStore(), book(), day(1));
    const key = 'entry:ol-OL1892617W';
    expect(nextStatus('want')).toBe('started');
    library = setStatus(library, key, 'started', day(3));
    expect(entryAt(library, key)).toMatchObject({ status: 'started', startedAt: day(3) });
    library = setStatus(library, key, 'finished', day(9));
    expect(entryAt(library, key)).toMatchObject({ status: 'finished', startedAt: day(3), finishedAt: day(9) });
    expect(nextStatus('finished')).toBeNull();
    // Back to the list: the reading dates no longer apply.
    library = setStatus(library, key, 'want', day(10));
    expect(entryAt(library, key)?.startedAt).toBeUndefined();
    expect(entryAt(library, key)?.finishedAt).toBeUndefined();
  });

  it('adding the same work twice is one entry, and a removed one comes back', () => {
    let library = upsertEntry(createLibraryStore(), book(), day(1));
    library = upsertEntry(library, book({ status: 'started' }), day(2));
    expect(library.items).toHaveLength(1);
    library = removeEntry(library, 'ol-OL1892617W', day(3));
    expect(liveItems(library)).toEqual([]);
    library = upsertEntry(library, book(), day(4));
    expect(liveItems(library)).toHaveLength(1);
    expect(library.items[0].createdAt).toBe(day(1));
  });

  it('cycles a shelf work for the hub: on the list → finished → off the list', () => {
    let library = cycleReading(createLibraryStore(), 'finch', day(2));
    expect(shelfReading(library).finch).toMatchObject({ state: 'started', startedAt: day(2) });
    library = cycleReading(library, 'finch', day(9));
    expect(shelfReading(library).finch).toMatchObject({ state: 'finished', finishedAt: day(9) });
    expect(entryAt(library, 'work:finch')).toMatchObject({ title: 'The Beak of the Finch', ids: { shelf: 'finch', ol: 'OL1974714W' }, places: [{ nodeId: EVOLUTION_ID, score: 1 }] });
    library = cycleReading(library, 'finch', day(10));
    expect(shelfReading(library).finch).toBeUndefined();
    expect(library.items[0].removedAt).toBeTruthy();
  });

  it('gives a shelf work the territories it covers', () => {
    const library = setStatus(createLibraryStore(), 'work:inner-fish', 'finished', day(1));
    expect(entryAt(library, 'work:inner-fish')?.places.map(p => p.nodeId)).toEqual(['deep-time', 'evidence', 'tree-thinking'].map(evolutionTerritoryId));
  });

  it('keeps places chosen by hand, and clears them', () => {
    let library = upsertEntry(createLibraryStore(), book(), day(1));
    library = setPlaces(library, 'ol-OL1892617W', ['knowledge.science.physics', 'knowledge.science.physics']);
    expect(entryAt(library, 'entry:ol-OL1892617W')).toMatchObject({ placesBy: 'you', places: [{ nodeId: 'knowledge.science.physics', score: 1 }] });
    library = setPlaces(library, 'ol-OL1892617W', []);
    expect(entryAt(library, 'entry:ol-OL1892617W')).toMatchObject({ placesBy: 'you', places: [] });
    expect(() => setPlaces(library, 'ol-OL1892617W', ['knowledge.nowhere'])).toThrow(/place/);
  });
});

describe('quotes and notes', () => {
  it('keeps passages and thoughts on any item, edits and removes them', () => {
    let library = addNote(createLibraryStore(), { target: 'work:finch', kind: 'quote', text: '  Darwin’s finches are evolving now.  ', where: 'p. 9' }, day(1));
    const [quote] = library.notes;
    expect(quote).toMatchObject({ target: 'work:finch', kind: 'quote', text: 'Darwin’s finches are evolving now.', where: 'p. 9' });
    library = addNote(library, { id: quote.id, target: 'work:finch', kind: 'quote', text: 'Edited.' }, day(2));
    expect(notesFor(library, 'work:finch').map(n => n.text)).toEqual(['Edited.']);
    library = addNote(library, { target: 'link:abc', kind: 'note', text: 'A thought' }, day(3));
    library = removeNote(library, quote.id);
    expect(liveNotes(library).map(n => n.text)).toEqual(['A thought']);
    expect(() => addNote(library, { target: 'work:finch', kind: 'note', text: '   ' })).toThrow();
    expect(() => addNote(library, { target: 'nowhere', kind: 'note', text: 'x' })).toThrow();
  });

  it('an entry’s own notes go with it; a shelf work’s notes stay with the shelf', () => {
    let library = upsertEntry(createLibraryStore(), book(), day(1));
    library = addNote(library, { target: 'entry:ol-OL1892617W', kind: 'note', text: 'Black holes are not so black' }, day(2));
    library = cycleReading(library, 'finch', day(2));
    library = addNote(library, { target: 'work:finch', kind: 'quote', text: 'Finches' }, day(3));
    library = removeEntry(library, 'ol-OL1892617W');
    library = cycleReading(cycleReading(library, 'finch', day(4)), 'finch', day(5));
    expect(liveNotes(library).map(n => n.text)).toEqual(['Finches']);
  });
});

describe('the version 1 record', () => {
  it('migrates in memory: links kept, each reading mark becomes its shelf work’s entry', () => {
    const library = parseLibrary(V1_RECORD);
    expect(library.version).toBe(2);
    expect(library.links).toHaveLength(2);
    expect(library.links[1].removedAt).toBe(day(3));
    expect(entryAt(library, 'work:finch')).toMatchObject({ status: 'finished', startedAt: day(2), finishedAt: day(6), updatedAt: day(6), source: 'shelf' });
    expect(entryAt(library, 'work:origin')).toMatchObject({ status: 'started', startedAt: day(4), places: expect.arrayContaining([{ nodeId: SELECTION, score: 1 }]) });
    expect(shelfReading(library)).toEqual(JSON.parse(V1_RECORD).reading);
  });

  it('loading never writes; the first save keeps the version 1 original, read back, before replacing it', () => {
    const store = memory({ [LIBRARY_STORAGE_KEY]: V1_RECORD });
    const { data, blocked } = loadLibrary(store);
    expect(blocked).toBe(false);
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(V1_RECORD);
    expect(saveLibrary(cycleReading(data, 'triumph', day(9)), store)).toBeNull();
    expect(store.data.get(LIBRARY_BACKUP_KEY)).toBe(V1_RECORD);
    const saved = JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!);
    expect(saved.version).toBe(2);
    expect(readLibrary(store)?.items.map(i => i.ids.shelf).sort()).toEqual(['finch', 'origin', 'triumph']);
    // A second save leaves the backup as it was.
    expect(saveLibrary(createLibraryStore(), store)).toBeNull();
    expect(store.data.get(LIBRARY_BACKUP_KEY)).toBe(V1_RECORD);
  });

  it('refuses to replace the original when the backup copy cannot be kept', () => {
    const data = new Map([[LIBRARY_STORAGE_KEY, V1_RECORD]]);
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { if (k !== LIBRARY_BACKUP_KEY) data.set(k, v); } };
    expect(saveLibrary(createLibraryStore(), store)).toMatch(/copy/);
    expect(data.get(LIBRARY_STORAGE_KEY)).toBe(V1_RECORD);
  });

  it('a mark on a work no longer on the shelf is left to the backup, never fatal', () => {
    const raw = JSON.stringify({ version: 1, links: [], reading: { 'retired-book': { state: 'started', startedAt: day(1), updatedAt: day(1) } } });
    expect(parseLibrary(raw).items).toEqual([]);
  });
});

describe('storage safety', () => {
  it('round-trips, and reading back confirms the save', () => {
    const store = memory();
    let library: LibraryStore = cycleReading(saveLink(createLibraryStore(), { url: 'a.org', note: 'A', nodeId: SELECTION }), 'finch');
    library = addNote(upsertEntry(library, book()), { target: 'entry:ol-OL1892617W', kind: 'quote', text: 'The universe has no edge.' });
    expect(saveLibrary(library, store)).toBeNull();
    expect(loadLibrary(store)).toMatchObject({ data: library, warning: null, blocked: false });
  });

  it('never overwrites a record from a newer build unless an import asks, and then keeps a copy first', () => {
    const newer = '{"version":3,"links":[],"items":[],"shelves":[]}';
    const store = memory({ [LIBRARY_STORAGE_KEY]: newer });
    expect(loadLibrary(store)).toMatchObject({ blocked: true });
    expect(saveLibrary(createLibraryStore(), store)).toMatch(/blocked/);
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(newer);
    expect(saveLibrary(createLibraryStore(), store, { replaceInvalid: true })).toBeNull();
    expect([...store.data.values()]).toContain(newer);
  });

  it('reports a quota failure instead of throwing', () => {
    const store = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(saveLibrary(createLibraryStore(), store)).toMatch(/could not be saved/);
  });

  it('reports a write the browser silently dropped', () => {
    const store = { getItem: () => null, setItem: () => undefined };
    expect(saveLibrary(createLibraryStore(), store)).toMatch(/did not keep/);
  });

  it('rejects a record with one bad link, item or note whole, never half', () => {
    const good = { version: 2, links: [], items: [book()], notes: [] };
    expect(parseLibrary(JSON.stringify(good)).items).toHaveLength(1);
    expect(() => parseLibrary(JSON.stringify({ ...good, links: [{ id: 'x', url: 'javascript:1', note: '', nodeId: null, createdAt: 'x', updatedAt: 'x' }] }))).toThrow();
    expect(() => parseLibrary(JSON.stringify({ ...good, items: [book(), book({ id: 'ol-OL2W', status: 'devoured' as never })] }))).toThrow(/status/);
    expect(() => parseLibrary(JSON.stringify({ ...good, items: [book({ ids: { ol: 'not-an-id' } })] }))).toThrow(/identifier/);
    expect(() => parseLibrary(JSON.stringify({ ...good, notes: [{ id: 'n1', target: 'entry:x', kind: 'quote', text: '', createdAt: day(1), updatedAt: day(1) }] }))).toThrow();
  });

  it('drops a place the atlas no longer has instead of refusing the record', () => {
    const raw = JSON.stringify({ version: 2, links: [], items: [book({ places: [{ nodeId: 'knowledge.science.gone', score: 1 }, { nodeId: 'knowledge.science.physics', score: 0.4 }] })], notes: [] });
    expect(parseLibrary(raw).items[0].places).toEqual([{ nodeId: 'knowledge.science.physics', score: 0.4 }]);
  });
});

describe('two tabs', () => {
  it('merge items and notes by their newest edit, and removals stick', () => {
    const base = upsertEntry(createLibraryStore(), book(), day(1));
    const removed = removeEntry(base, 'ol-OL1892617W', day(3));
    const started = setStatus(base, 'entry:ol-OL1892617W', 'started', day(2));
    expect(liveItems(mergeLibraries(started, removed))).toEqual([]);
    const noted = addNote(base, { target: 'entry:ol-OL1892617W', kind: 'note', text: 'One' }, day(2));
    expect(mergeLibraries(started, noted).notes).toHaveLength(1);
  });

  it('keep a cover found in one tab while the other changed the status', () => {
    const base = upsertEntry(createLibraryStore(), book({ cover: null, subjects: [], enrich: 'pending' }), day(1));
    const enriched: LibraryStore = { ...base, items: base.items.map(item => ({ ...item, cover: 123, subjects: ['Cosmology'], enrich: 'done' as const, enrichedAt: day(2) })) };
    const started = setStatus(base, 'entry:ol-OL1892617W', 'started', day(3));
    const merged = entryAt(mergeLibraries(started, enriched), 'entry:ol-OL1892617W')!;
    expect(merged).toMatchObject({ status: 'started', cover: 123, subjects: ['Cosmology'], enrich: 'done' });
    expect(entryAt(mergeLibraries(enriched, started), 'entry:ol-OL1892617W')).toMatchObject({ status: 'started', cover: 123 });
  });
});

describe('backup files', () => {
  it('add the library to the notebook file only when there is one, and read it all back', () => {
    const notebook = { version: 1, entries: [] };
    expect(withLibrary(notebook, createLibraryStore())).toEqual(notebook);
    let library = saveLink(createLibraryStore(), { url: 'a.org', note: 'A', nodeId: null, preview: { title: 'A', description: '', siteName: 'a.org', image: null, at: day(1) } });
    library = cycleReading(upsertEntry(library, book({ status: 'finished', finishedAt: day(4), rating: 4.5 })), 'finch', day(2));
    library = addNote(library, { target: 'entry:ol-OL1892617W', kind: 'quote', text: 'Time has a shape.', where: 'ch. 2' }, day(5));
    const file = withLibrary(notebook, library);
    const back = libraryInFile(JSON.stringify(file));
    expect(back).toEqual(library);
    // Older builds read `links` and `reading`: both are there for them.
    expect(file.reading).toMatchObject({ finch: { state: 'started' } });
    expect(libraryInFile(JSON.stringify(notebook))).toBeNull();
  });

  it('imports an older build’s backup through the migration', () => {
    const old = { version: 1, entries: [], ...JSON.parse(V1_RECORD) };
    delete old.version;
    const back = libraryInFile(JSON.stringify({ version: 1, entries: [], links: old.links, reading: old.reading }));
    expect(back?.items.map(i => i.ids.shelf).sort()).toEqual(['finch', 'origin']);
  });

  it('throws on a malformed library inside an otherwise good file', () => {
    expect(() => libraryInFile(JSON.stringify({ version: 1, entries: [], items: [{ id: 'nope' }] }))).toThrow();
  });
});

describe('a place the atlas no longer has (held, renamed or removed)', () => {
  const GONE = 'knowledge.science.biology.genetics-genomes.gone-place';
  // Exactly as this build writes them (each field in its place), so a round trip can be compared byte for byte.
  const heldLink = { id: 'held-link-1', url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Saved from Watch', nodeId: GONE, createdAt: day(1), updatedAt: day(1), places: [EVOLUTION_ID, 'knowledge.science.gone-too'] };
  const plainLink = { id: 'plain-link-1', url: 'https://en.wikipedia.org/wiki/Finch', note: 'Finches', nodeId: SELECTION, createdAt: day(2), updatedAt: day(2) };
  const heldBook = book({ id: 'ol-OL45804W', ids: { ol: 'OL45804W' }, title: 'The Selfish Gene', places: [{ nodeId: GONE, score: 1 }, { nodeId: SELECTION, score: 0.6 }], placesBy: 'you' });
  const record = { version: 2, links: [heldLink, plainLink], items: [heldBook], notes: [] };
  const RAW = JSON.stringify(record);

  it('the library still loads; the missing place is simply absent', () => {
    const store = memory({ [LIBRARY_STORAGE_KEY]: RAW });
    const loaded = loadLibrary(store);
    expect(loaded).toMatchObject({ warning: null, blocked: false });
    const [link, plain] = loaded.data.links;
    expect(link).toMatchObject({ id: 'held-link-1', nodeId: null, places: [EVOLUTION_ID] });
    expect(linkPlaces(link)).toEqual([EVOLUTION_ID]);
    expect(plain).toMatchObject({ nodeId: SELECTION });
    expect(loaded.data.items[0].places).toEqual([{ nodeId: SELECTION, score: 0.6 }]);
    expect(readLibrary(store)?.links).toHaveLength(2);
    // Loading never writes.
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(RAW);
  });

  it('a save writes every held entry back exactly as it was, byte for byte', () => {
    const store = memory({ [LIBRARY_STORAGE_KEY]: RAW });
    const { data } = loadLibrary(store);
    expect(saveLibrary(data, store)).toBeNull();
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(RAW);
    // Other changes around it leave it as it was too.
    const more = addNote(saveLink(data, { url: 'b.org', note: 'B', nodeId: null }), { target: 'entry:ol-OL45804W', kind: 'note', text: 'Genes as the unit.' }, day(5));
    expect(saveLibrary(setStatus(more, 'entry:ol-OL45804W', 'started', day(6)), store)).toBeNull();
    const saved = JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!);
    expect(JSON.stringify(saved.links[0])).toBe(JSON.stringify(heldLink));
    expect(saved.items[0].places).toEqual(heldBook.places);
  });

  it('an edit of its line keeps the place it had; filing it somewhere else replaces it', () => {
    const { data } = loadLibrary(memory({ [LIBRARY_STORAGE_KEY]: RAW }));
    const store = memory();
    const edited = saveLink(data, { id: 'held-link-1', url: heldLink.url, note: 'Saved from Watch, watched twice', nodeId: null, places: [EVOLUTION_ID] });
    expect(saveLibrary(edited, store)).toBeNull();
    expect(JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!).links[0]).toMatchObject({ note: 'Saved from Watch, watched twice', nodeId: GONE, places: heldLink.places });
    const refiled = saveLink(edited, { id: 'held-link-1', url: heldLink.url, note: 'Refiled', nodeId: SELECTION, places: [] });
    expect(saveLibrary(refiled, store)).toBeNull();
    const back = JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!).links[0];
    expect(back.nodeId).toBe(SELECTION);
    expect(back).not.toHaveProperty('places');
    // Chosen places on an item replace the held ones the same way.
    expect(saveLibrary(setPlaces(data, 'ol-OL45804W', [EVOLUTION_ID]), store)).toBeNull();
    expect(JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!).items[0].places).toEqual([{ nodeId: EVOLUTION_ID, score: 1 }]);
  });

  it('a removal keeps the place in the tombstone, and two tabs keep it too', () => {
    const { data } = loadLibrary(memory({ [LIBRARY_STORAGE_KEY]: RAW }));
    const store = memory();
    const merged = mergeLibraries(removeLink(data, 'plain-link-1'), removeLink(data, 'held-link-1'));
    expect(saveLibrary(merged, store)).toBeNull();
    const back = JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!);
    expect(back.links.find((l: { id: string }) => l.id === 'held-link-1')).toMatchObject({ nodeId: GONE, places: heldLink.places, removedAt: expect.any(String) });
  });

  it('when the place comes back, the entry is under it again', async () => {
    const { catalog } = await import('../core/catalog');
    const real = catalog.get.bind(catalog);
    const node = real(SELECTION)!;
    const spy = vi.spyOn(catalog, 'get').mockImplementation(id => (id === GONE ? { ...node, id: GONE } : real(id)));
    try {
      const library = parseLibrary(RAW);
      expect(library.links[0].nodeId).toBe(GONE);
      expect(library.items[0].places).toEqual(heldBook.places);
    } finally { spy.mockRestore(); }
  });

  it('a backup file carries it as it was, and the version 1 upgrade keeps it', () => {
    const { data } = loadLibrary(memory({ [LIBRARY_STORAGE_KEY]: RAW }));
    const file = withLibrary({ version: 1, entries: [] }, data);
    expect(JSON.stringify(file.links?.[0])).toBe(JSON.stringify(heldLink));
    expect(file.items?.[0].places).toEqual(heldBook.places);
    const store = memory();
    expect(saveLibrary(libraryInFile(JSON.stringify(file))!, store)).toBeNull();
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(RAW);
    // A version 1 record with a link under a place the atlas lost: it loads, the first save keeps the
    // original as the backup and writes the link back with its place.
    const v1 = JSON.stringify({ version: 1, links: [{ id: 'v1-link', url: 'https://pbs.org/x', note: 'Old', nodeId: GONE, createdAt: day(1), updatedAt: day(1) }], reading: {} });
    const old = memory({ [LIBRARY_STORAGE_KEY]: v1 });
    const loaded = loadLibrary(old);
    expect(loaded).toMatchObject({ blocked: false, warning: null });
    expect(loaded.data.links[0].nodeId).toBeNull();
    expect(saveLibrary(loaded.data, old)).toBeNull();
    expect(old.data.get(LIBRARY_BACKUP_KEY)).toBe(v1);
    expect(JSON.parse(old.data.get(LIBRARY_STORAGE_KEY)!).links[0].nodeId).toBe(GONE);
  });

  it('still refuses a link place that is not a place name at all', () => {
    expect(() => libraryFrom({ ...record, links: [{ ...heldLink, nodeId: 42 }] })).toThrow(/place/);
    expect(() => libraryFrom({ ...record, links: [{ ...heldLink, nodeId: 'x'.repeat(501) }] })).toThrow(/place/);
    // As deep as a map area may be (generated places keep getting deeper): kept, held.
    const deep = `${GONE}.${'x'.repeat(400)}`;
    expect(libraryFrom({ ...record, links: [{ ...heldLink, nodeId: deep }] }).links[0]).toMatchObject({ nodeId: null, places: [EVOLUTION_ID] });
  });

  it('an item place with an empty or overlong name is held, never fatal, and written back as it was', () => {
    const odd = book({ id: 'ol-OL1W', ids: { ol: 'OL1W' }, title: 'Odd places', places: [{ nodeId: '', score: 0.5 }, { nodeId: 'y'.repeat(900), score: 0.4 }, { nodeId: SELECTION, score: 0.6 }], placesBy: 'auto' });
    const raw = JSON.stringify({ ...record, items: [heldBook, odd] });
    const store = memory({ [LIBRARY_STORAGE_KEY]: raw });
    const loaded = loadLibrary(store);
    expect(loaded).toMatchObject({ warning: null, blocked: false });
    expect(loaded.data.items[1].places).toEqual([{ nodeId: SELECTION, score: 0.6 }]);
    expect(saveLibrary(loaded.data, store)).toBeNull();
    expect(store.data.get(LIBRARY_STORAGE_KEY)).toBe(raw);
  });

  it('the same places sent back as they show (Watch puts the first one first) keep the held ones', () => {
    const { data } = loadLibrary(memory({ [LIBRARY_STORAGE_KEY]: RAW }));
    expect(linkPlaces(data.links[0])).toEqual([EVOLUTION_ID]);
    const resaved = saveLink(data, { id: 'held-link-1', url: heldLink.url, note: heldLink.note, nodeId: EVOLUTION_ID, places: [] });
    // Shown as before, split as before.
    expect(resaved.links[0]).toMatchObject({ nodeId: null, places: [EVOLUTION_ID] });
    const store = memory();
    expect(saveLibrary(resaved, store)).toBeNull();
    expect(JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!).links[0]).toMatchObject({ nodeId: GONE, places: heldLink.places });
    // And a load of what was written shows the same again.
    expect(loadLibrary(store).data.links[0]).toMatchObject({ nodeId: null, places: [EVOLUTION_ID] });
  });

  it('documents the trap: held places ride on a symbol, so a JSON copy of the record in memory loses them', () => {
    const { data } = loadLibrary(memory({ [LIBRARY_STORAGE_KEY]: RAW }));
    const store = memory();
    // Never do this in the app: copy records with spreads, never through JSON or structuredClone.
    expect(saveLibrary(JSON.parse(JSON.stringify(data)), store)).toBeNull();
    expect(JSON.parse(store.data.get(LIBRARY_STORAGE_KEY)!).links[0].nodeId).toBeNull();
  });
});
