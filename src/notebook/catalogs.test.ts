import { describe, expect, it, vi } from 'vitest';
import olFixture from './fixtures/openlibrary-search.json';
import cosmos from './fixtures/wikidata-cosmos.json';
import inOurTime from './fixtures/wikidata-in-our-time.json';
import { booksFrom, createLimiter, entryFromBook, enrichedEntry, getJson, keptSubjects, lookupIsbns, lookupTitles, searchBooks, titleMatch, CatalogError } from './openLibrary';
import { detailsQuery, entryFromScreen, screenResultsFrom, searchScreen, searchText, API_USER_AGENT } from './wikidata';
import type { LibraryEntry } from './libraryStore';

// Real responses, captured from search.json, the Wikidata API and the Wikidata query service.
const NOW = '2026-10-23T15:00:00.000Z';
const fakeClock = () => {
  let t = 0;
  const starts: number[] = [];
  return { starts, clock: { now: () => t, sleep: async (ms: number) => { t += ms; } } };
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const immediate = createLimiter(0);

describe('one request at a time', () => {
  it('spaces requests at least the given time apart', async () => {
    const { clock } = fakeClock();
    const limiter = createLimiter(1100, clock);
    const started: number[] = [];
    await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => { started.push(clock.now()); })));
    expect(started).toEqual([0, 1100, 2200]);
  });

  it('lets the learner’s own search go ahead of queued lookups, and drops a search that was replaced', async () => {
    const { clock } = fakeClock();
    const limiter = createLimiter(1000, clock);
    const order: string[] = [];
    const replaced = new AbortController();
    const jobs = [
      limiter.schedule(async () => { order.push('lookup 1'); }),
      limiter.schedule(async () => { order.push('lookup 2'); }),
      limiter.schedule(async () => { order.push('old search'); }, { first: true, signal: replaced.signal }).catch(error => order.push(`dropped: ${(error as CatalogError).kind}`)),
    ];
    replaced.abort();
    jobs.push(limiter.schedule(async () => { order.push('search'); }, { first: true }));
    await Promise.all(jobs);
    expect(order).toEqual(['lookup 1', 'search', 'dropped: aborted', 'lookup 2']);
  });

  it('names a refusal to keep up, a missing connection and a failure apart', async () => {
    await expect(getJson('https://x.example/', { fetchImpl: async () => json({}, 429) })).rejects.toMatchObject({ kind: 'rate-limited' });
    await expect(getJson('https://x.example/', { fetchImpl: async () => json({}, 500) })).rejects.toMatchObject({ kind: 'failed' });
    await expect(getJson('https://x.example/', { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } })).rejects.toBeInstanceOf(CatalogError);
  });

  it('never sends cookies', async () => {
    const fetchImpl = vi.fn(async () => json({ docs: [] }));
    await getJson('https://openlibrary.org/search.json?q=x', { fetchImpl });
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({ credentials: 'omit' });
  });
});

describe('Open Library', () => {
  it('reads search results as books, dropping records that are not works', () => {
    const books = booksFrom(olFixture.search);
    expect(books[0]).toMatchObject({ source: 'ol', workId: 'OL1974714W', title: 'The beak of the finch', creator: 'Jonathan Weiner', year: 1994, cover: 420144, editions: 6 });
    expect(books.some(book => book.workId.endsWith('M'))).toBe(false); // "/works/OL8151326M" is an edition key
    expect(booksFrom({})).toEqual([]);
  });

  it('keeps the plain-English subjects worth keeping', () => {
    expect(keptSubjects(['Evolution', 'Long Now Manual for Civilization', 'nyt:combined=2014', 'Volkserzählung', 'Natural selection'])).toEqual(['Evolution', 'Natural selection']);
  });

  it('searches by words, or by ISBN, through the limiter', async () => {
    const fetchImpl = vi.fn(async () => json(olFixture.search));
    const books = await searchBooks('the beak of the finch', { fetchImpl, limiter: immediate });
    expect(books[0].workId).toBe('OL1974714W');
    const url = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
    expect(url.origin + url.pathname).toBe('https://openlibrary.org/search.json');
    expect(url.searchParams.get('q')).toBe('the beak of the finch');
    await searchBooks('978-0-679-73337-9', { fetchImpl, limiter: immediate });
    expect(new URL(String((fetchImpl.mock.calls[1] as unknown[])[0])).searchParams.get('q')).toBe('isbn:9780679733379');
    expect(await searchBooks(' ', { fetchImpl, limiter: immediate })).toEqual([]);
  });

  it('matches imported books by ISBN in one batch, taking the right work when an ISBN names several', async () => {
    const fetchImpl = vi.fn(async () => json(olFixture.isbn));
    const found = await lookupIsbns([
      { id: 'gr-3869', isbn: '9780553380163', title: 'A Brief History of Time', creator: 'Stephen Hawking' },
      { id: 'gr-172367', isbn: '9780679733379', title: 'The Beak of the Finch: A Story of Evolution in Our Time', creator: 'Jonathan Weiner' },
      { id: 'gr-25698', isbn: '9780553585971', title: 'The Wealth of Nations', creator: 'Adam Smith' },
      { id: 'gr-0', isbn: '9780000000002', title: 'Not This Book', creator: 'Nobody' },
    ], { fetchImpl, limiter: immediate });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(new URL(String((fetchImpl.mock.calls[0] as unknown[])[0])).searchParams.get('q')).toBe('isbn:(9780553380163 OR 9780679733379 OR 9780553585971 OR 9780000000002)');
    expect(found.get('gr-3869')?.workId).toBe('OL1892617W');
    expect(found.get('gr-172367')?.workId).toBe('OL1974714W');
    expect(found.get('gr-25698')?.workId).toBe('OL34524022W'); // "Wealth of nations", not the "Inquiry into…" record
    expect(found.get('gr-0')).toBeNull(); // a catalog record under that ISBN, but not this book
  });

  it('matches books without an ISBN by title and author, the exact title first', async () => {
    const fetchImpl = vi.fn(async () => json(olFixture.title));
    const found = await lookupTitles([
      { id: 'gr-29579', isbn: null, title: 'Foundation (Foundation, #1)', creator: 'Isaac Asimov' },
      { id: 'gr-30659', isbn: null, title: 'Meditations', creator: 'Marcus Aurelius' },
      { id: 'gr-27276428', isbn: null, title: 'The Gene: An Intimate History', creator: 'Siddhartha Mukherjee' },
    ], { fetchImpl, limiter: immediate });
    expect(new URL(String((fetchImpl.mock.calls[0] as unknown[])[0])).searchParams.get('q')).toBe('(title:"Foundation" AND author:"asimov") OR (title:"Meditations" AND author:"aurelius") OR (title:"The Gene" AND author:"mukherjee")');
    expect(found.get('gr-29579')?.workId).toBe('OL46125W'); // not "Foundation and Empire"
    expect(found.get('gr-30659')?.workId).toBe('OL1317211W'); // the record with the most editions
    expect(found.get('gr-27276428')?.workId).toBe('OL17762235W');
  });

  it('never matches across authors', () => {
    const work = booksFrom(olFixture.search)[0];
    expect(titleMatch({ title: 'The Beak of the Finch', creator: 'Someone Else' }, work)).toBe(0);
    expect(titleMatch({ title: 'The Beak of the Finch', creator: 'Jonathan Weiner' }, work)).toBe(1);
  });

  it('turns a result into an entry placed from its subjects, or into the shelf work it is', () => {
    const [finch] = booksFrom(olFixture.search);
    const shelf = entryFromBook(finch, 'want', NOW);
    expect(shelf).toMatchObject({ id: 'shelf-finch', ids: { shelf: 'finch', ol: 'OL1974714W' }, cover: 420144, status: 'want' });
    const brief = booksFrom(olFixture.isbn).find(b => b.workId === 'OL1892617W')!;
    expect(entryFromBook(brief, 'finished', NOW)).toMatchObject({ id: 'ol-OL1892617W', status: 'finished', finishedAt: NOW, source: 'search', enrich: 'done' });
  });

  it('fills an imported entry from its match, and keeps the learner’s places', () => {
    const imported: LibraryEntry = {
      id: 'gr-3869', kind: 'book', format: 'Book', title: 'A Brief History of Time', creator: 'Stephen Hawking', year: 1988, cover: null,
      ids: { gr: '3869', isbn: '9780553380163' }, subjects: [], tags: ['science'], places: [], placesBy: 'auto', status: 'finished',
      addedAt: NOW, source: 'goodreads', enrich: 'pending', enrichTries: 0, createdAt: NOW, updatedAt: NOW,
    };
    const work = booksFrom(olFixture.isbn).find(b => b.workId === 'OL1892617W')!;
    const done = enrichedEntry(imported, work, NOW);
    expect(done).toMatchObject({ cover: work.cover, ids: { gr: '3869', ol: 'OL1892617W' }, enrich: 'done', enrichTries: 1, enrichedAt: NOW, updatedAt: NOW });
    expect(done.places[0].nodeId).toBe('knowledge.science.astronomy');
    expect(enrichedEntry({ ...imported, placesBy: 'you', places: [] }, work, NOW).places).toEqual([]);
    // Not found by ISBN: one more try, by title. Not found by title either: done asking.
    expect(enrichedEntry(imported, null, NOW)).toMatchObject({ enrich: 'pending', enrichTries: 1 });
    expect(enrichedEntry({ ...imported, enrichTries: 1 }, null, NOW)).toMatchObject({ enrich: 'miss', enrichTries: 2 });
  });
});

describe('Wikidata', () => {
  it('searches only films, documentaries, series, podcasts, radio and courses', () => {
    expect(searchText('cosmos')).toMatch(/^cosmos haswbstatement:P31=Q93204\|.*P31=Q11424/);
    expect(searchText('a "quoted" | b')).not.toMatch(/"/);
    expect(detailsQuery(['Q1', 'Q2'])).toContain('VALUES ?item { wd:Q1 wd:Q2 }');
  });

  it('reads the results in the search’s order, with kind, presenter or director, year and subjects', () => {
    const results = screenResultsFrom(cosmos.search, cosmos.details);
    expect(results[0]).toMatchObject({ qid: 'Q5174583', title: 'Cosmos: A Spacetime Odyssey', kind: 'series', format: 'Documentary series', creator: 'Neil deGrasse Tyson', year: 2014, mainSubjects: expect.arrayContaining(['astronomy']) });
    expect(results[1]).toMatchObject({ qid: 'Q866368', title: 'Cosmos: A Personal Voyage', creator: 'Carl Sagan', year: 1980 });
    expect(results.find(r => r.qid === 'Q3912102')).toMatchObject({ kind: 'film', format: 'Film', creator: 'Reha Erdem' });
    const radio = screenResultsFrom(inOurTime.search, inOurTime.details);
    expect(radio[0]).toMatchObject({ qid: 'Q3149655', kind: 'podcast', format: 'Radio series', creator: 'Melvyn Bragg', year: 1998 });
    expect(radio.find(r => r.qid === 'Q130355351')).toMatchObject({ format: 'Podcast' });
  });

  it('sends the app’s own Api-User-Agent, never a person’s address', async () => {
    const fetchImpl = vi.fn(async (url: string) => json(url.includes('sparql') ? cosmos.details : cosmos.search));
    const results = await searchScreen('cosmos', { fetchImpl: fetchImpl as unknown as typeof fetch, limiter: immediate });
    expect(results).toHaveLength(8);
    for (const call of fetchImpl.mock.calls as unknown as [string, RequestInit][]) {
      expect((call[1].headers as Record<string, string>)['Api-User-Agent']).toBe(API_USER_AGENT);
      expect(JSON.stringify(call[1].headers)).not.toMatch(/@/);
    }
    expect(fetchImpl.mock.calls[1][0]).toMatch(/^https:\/\/query\.wikidata\.org\/sparql\?/);
  });

  it('places a series from its main subjects and genres', () => {
    const [odyssey] = screenResultsFrom(cosmos.search, cosmos.details);
    const entry = entryFromScreen(odyssey, 'finished', NOW);
    expect(entry).toMatchObject({ id: 'wd-Q5174583', kind: 'series', ids: { wd: 'Q5174583' }, cover: null, status: 'finished' });
    expect(entry.places[0].nodeId).toBe('knowledge.science.astronomy');
  });
});

describe('shelf works', () => {
  it('keep their curated territories, and one placed only in the whole field is narrowed inside it', () => {
    const extinction = booksFrom({ docs: [{ key: '/works/OL16820830W', title: 'The Sixth Extinction', author_name: ['Elizabeth Kolbert'], subject: ['Extinction (Biology)', 'Mass extinctions', 'Evolution', 'Human ecology'], edition_count: 40 }] })[0];
    expect(entryFromBook(extinction, 'finished', NOW).places.map(p => p.nodeId)).toEqual(['knowledge.science.biology.evolution.transitions-extinctions']);
    const fish = booksFrom({ docs: [{ key: '/works/OL8036314W', title: 'Your Inner Fish', author_name: ['Neil Shubin'], subject: ['Physics', 'Cosmology'], edition_count: 9 }] })[0];
    // Curated covers win, whatever the catalog says.
    expect(entryFromBook(fish, 'finished', NOW).places.map(p => p.nodeId)).toEqual(['deep-time', 'evidence', 'tree-thinking'].map(k => `knowledge.science.biology.evolution.${k}`));
    const elsewhere = booksFrom({ docs: [{ key: '/works/OL1974714W', title: 'The beak of the finch', author_name: ['Jonathan Weiner'], subject: ['Physics', 'Astronomy'], edition_count: 6 }] })[0];
    // Never moved outside the field it is shelved in.
    expect(entryFromBook(elsewhere, 'want', NOW).places.map(p => p.nodeId)).toEqual(['knowledge.science.biology.evolution']);
  });
});
