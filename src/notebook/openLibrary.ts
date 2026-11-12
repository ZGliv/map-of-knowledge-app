import { cleanTitle, findShelfWork, titleKey } from './importCsv';
import { EVOLUTION_CORE } from '../core/evolutionLibrary';
import { shelfEntry, shelfOlKey, shelfPlaces, type ItemStatus, type LibraryEntry, type PlacePick } from './libraryStore';
import { mapPlaces } from './placeMap';

/*
 * Open Library: book search for the + sheet, and covers and subjects for imported books.
 *
 * Terms (openlibrary.org/developers/api, /dev/docs/api/covers, checked 2026-10-23): requests without an
 * identifying User-Agent and contact email get 1 request a second, and a browser can't set one, so every
 * request here waits its turn at least 1.1 s after the last; imports are batched (up to 20 ISBNs or 8
 * titles a request) and never retried in a burst. Covers are shown by cover ID straight from
 * covers.openlibrary.org (ID access is not rate-limited), and an item's page links back to Open Library.
 * Nothing is bulk-downloaded: the catalog is only asked about books the learner names or imports.
 */

export const OPEN_LIBRARY = 'https://openlibrary.org';
/** A cover by its ID; `default=false` makes a missing one a 404 rather than a blank image. */
export const coverUrl = (id: number, size: 'S' | 'M' | 'L' = 'M') => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false`;
export const workUrl = (id: string) => `${OPEN_LIBRARY}/works/${id}`;

export interface BookResult {
  readonly source: 'ol';
  readonly workId: string;
  readonly title: string;
  readonly creator: string;
  readonly year: number | null;
  readonly cover: number | null;
  readonly subjects: readonly string[];
  readonly editions: number;
  readonly isbns: readonly string[];
}

export class CatalogError extends Error {
  constructor(message: string, readonly kind: 'rate-limited' | 'offline' | 'failed' | 'aborted') { super(message); this.name = 'CatalogError'; }
}

// --- one request at a time -----------------------------------------------------------------

export interface Clock { now(): number; sleep(ms: number): Promise<void> }
const realClock: Clock = { now: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)) };
const aborted = () => new CatalogError('Stopped.', 'aborted');

/** Runs requests one after another, each starting at least `spacingMs` after the one before.
 * A request marked `first` (the learner typing) goes ahead of queued background lookups. */
export function createLimiter(spacingMs: number, clock: Clock = realClock) {
  interface Job { run: () => Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void; signal?: AbortSignal }
  const queue: Job[] = [];
  let busy = false;
  let last = -Infinity;
  async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const job = queue.shift()!;
      if (job.signal?.aborted) { job.reject(aborted()); continue; }
      const wait = last + spacingMs - clock.now();
      if (wait > 0) await clock.sleep(wait);
      if (job.signal?.aborted) { job.reject(aborted()); continue; }
      last = clock.now();
      try { job.resolve(await job.run()); } catch (error) { job.reject(error); }
    }
    busy = false;
  }
  return {
    schedule<T>(run: () => Promise<T>, options: { first?: boolean; signal?: AbortSignal } = {}): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const job: Job = { run, resolve: resolve as (value: unknown) => void, reject, signal: options.signal };
        if (options.first) queue.unshift(job); else queue.push(job);
        void pump();
      });
    },
    get pending() { return queue.length; },
  };
}
export type Limiter = ReturnType<typeof createLimiter>;
export const OPEN_LIBRARY_LIMITER = createLimiter(1100);

/** GET JSON, failing as rate-limited, offline or failed (and never hanging past `timeoutMs`). */
export async function getJson(url: string, { signal, fetchImpl = fetch, headers, timeoutMs = 12_000 }: { signal?: AbortSignal; fetchImpl?: typeof fetch; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<unknown> {
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
    if (response.status === 429 || response.status === 503) throw new CatalogError('The catalog asked us to slow down.', 'rate-limited');
    if (!response.ok) throw new CatalogError(`The catalog answered ${response.status}.`, 'failed');
    return await response.json();
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    if (signal?.aborted) throw aborted();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new CatalogError('You are offline.', 'offline');
    throw new CatalogError('The catalog could not be reached.', controller.signal.aborted ? 'offline' : 'failed');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}

// --- results -------------------------------------------------------------------------------

const SEARCH_FIELDS = 'key,title,author_name,first_publish_year,cover_i,subject,edition_count';

/** Open Library search docs as books; a doc without a work key or a title is dropped. */
export function booksFrom(json: unknown): BookResult[] {
  const docs = (json as { docs?: unknown } | null)?.docs;
  if (!Array.isArray(docs)) return [];
  const out: BookResult[] = [];
  for (const raw of docs) {
    const doc = raw as Record<string, unknown>;
    const workId = typeof doc.key === 'string' ? doc.key.match(/^\/works\/(OL\d+W)$/)?.[1] : undefined;
    const title = typeof doc.title === 'string' ? doc.title.trim() : '';
    if (!workId || !title) continue;
    const strings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [];
    out.push({
      source: 'ol', workId, title: title.slice(0, 300), creator: strings(doc.author_name)[0]?.slice(0, 200) ?? '',
      year: typeof doc.first_publish_year === 'number' && Number.isInteger(doc.first_publish_year) ? doc.first_publish_year : null,
      cover: typeof doc.cover_i === 'number' && Number.isInteger(doc.cover_i) && doc.cover_i > 0 ? doc.cover_i : null,
      subjects: [...new Set(strings(doc.subject).map(s => s.trim()).filter(s => s.length <= 80))].slice(0, 40),
      editions: typeof doc.edition_count === 'number' ? doc.edition_count : 0,
      isbns: strings(doc.isbn),
    });
  }
  return out;
}

/** The few subjects worth keeping on an entry: the first ones, in English where the catalog gives both. */
export const keptSubjects = (subjects: readonly string[]) => subjects.filter(s => !/[^\x20-\x7e]/.test(s) && !/^(nyt:|prize:|open library|long now|new york times|reading level|accessible book|protected daisy|in library|lending library)/i.test(s)).slice(0, 8);

/** Search books by words, or by ISBN when an ISBN is typed. */
export async function searchBooks(query: string, { signal, fetchImpl, limiter = OPEN_LIBRARY_LIMITER }: { signal?: AbortSignal; fetchImpl?: typeof fetch; limiter?: Limiter } = {}): Promise<BookResult[]> {
  const words = query.trim().replace(/\s+/g, ' ');
  if (words.length < 2) return [];
  const isbn = /^[\d-]{9,17}[\dXx]?$/.test(words) ? words.replace(/-/g, '') : null;
  const params = new URLSearchParams({ q: isbn ? `isbn:${isbn}` : words, limit: '8', fields: SEARCH_FIELDS });
  const json = await limiter.schedule(() => getJson(`${OPEN_LIBRARY}/search.json?${params}`, { signal, fetchImpl }), { first: true, signal });
  return booksFrom(json);
}

// --- matching imported books ---------------------------------------------------------------

export interface Lookup { readonly id: string; readonly isbn: string | null; readonly title: string; readonly creator: string }

const plain = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const mainTitle = (title: string) => plain(cleanTitle(title).title.split(/[:;]|\s[-–—]\s/)[0]).replace(/^(the|a|an) /, '');
const surname = (name: string) => plain(name.split(/,| and | & /)[0] ?? '').split(' ').filter(Boolean).pop() ?? '';
const isbn10Of = (isbn13: string) => {
  if (!isbn13.startsWith('978')) return null;
  const core = isbn13.slice(3, 12);
  const sum = [...core].reduce((total, d, i) => total + Number(d) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? 'X' : String(check));
};

/** How well a catalog work matches a book: 1 for the same main title, less for a near one, 0 for none. */
export function titleMatch(book: { title: string; creator: string }, work: BookResult): number {
  const a = mainTitle(book.title), b = mainTitle(work.title);
  if (!a || !b) return 0;
  if (book.creator && work.creator && surname(book.creator) !== surname(work.creator)) return 0;
  if (a === b) return 1;
  if (a.startsWith(`${b} `) || b.startsWith(`${a} `)) return 0.7;
  const wordsA = new Set(a.split(' ')), wordsB = new Set(b.split(' '));
  const shared = [...wordsA].filter(w => wordsB.has(w)).length;
  const jaccard = shared / new Set([...wordsA, ...wordsB]).size;
  return jaccard >= 0.6 ? 0.5 : 0;
}

const best = (book: Lookup, works: readonly BookResult[], minimum: number) => works
  .map(work => ({ work, score: titleMatch(book, work) }))
  .filter(({ score }) => score >= minimum)
  .sort((x, y) => y.score - x.score || y.work.editions - x.work.editions || x.work.workId.localeCompare(y.work.workId))[0]?.work ?? null;

const phrase = (text: string) => text.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

/** Up to 20 books by ISBN in one request. A book whose ISBN names several works takes the one titled like it. */
export async function lookupIsbns(books: readonly Lookup[], { signal, fetchImpl, limiter = OPEN_LIBRARY_LIMITER }: { signal?: AbortSignal; fetchImpl?: typeof fetch; limiter?: Limiter } = {}): Promise<Map<string, BookResult | null>> {
  const asked = books.filter(book => book.isbn).slice(0, 20);
  const out = new Map<string, BookResult | null>();
  if (!asked.length) return out;
  const params = new URLSearchParams({ q: `isbn:(${asked.map(book => book.isbn).join(' OR ')})`, limit: '100', fields: `${SEARCH_FIELDS},isbn` });
  const works = booksFrom(await limiter.schedule(() => getJson(`${OPEN_LIBRARY}/search.json?${params}`, { signal, fetchImpl }), { signal }));
  for (const book of asked) {
    const codes = new Set([book.isbn!, isbn10Of(book.isbn!)].filter(Boolean));
    const holding = works.filter(work => work.isbns.some(code => codes.has(code)));
    out.set(book.id, best(book, holding, 0.5) ?? (holding.length === 1 && !book.title ? holding[0] : null));
  }
  return out;
}

/** Up to 8 books by title and author in one request. */
export async function lookupTitles(books: readonly Lookup[], { signal, fetchImpl, limiter = OPEN_LIBRARY_LIMITER }: { signal?: AbortSignal; fetchImpl?: typeof fetch; limiter?: Limiter } = {}): Promise<Map<string, BookResult | null>> {
  const asked = books.filter(book => phrase(cleanTitle(book.title).title.split(':')[0])).slice(0, 8);
  const out = new Map<string, BookResult | null>();
  if (!asked.length) return out;
  const clause = (book: Lookup) => {
    const title = `title:"${phrase(cleanTitle(book.title).title.split(':')[0])}"`;
    const author = surname(book.creator);
    return author ? `(${title} AND author:"${phrase(author)}")` : `(${title})`;
  };
  const params = new URLSearchParams({ q: asked.map(clause).join(' OR '), limit: String(Math.min(100, asked.length * 8)), fields: SEARCH_FIELDS });
  const works = booksFrom(await limiter.schedule(() => getJson(`${OPEN_LIBRARY}/search.json?${params}`, { signal, fetchImpl }), { signal }));
  for (const book of asked) out.set(book.id, best(book, works, 0.7));
  return out;
}

// --- into the library ----------------------------------------------------------------------

/** A search result as an entry: a shelf work when it is one, else the learner's own book. */
export function entryFromBook(book: BookResult, status: ItemStatus, now: string): LibraryEntry {
  const shelf = findShelfWork(book.title, book.creator, book.workId);
  const subjects = keptSubjects(book.subjects);
  if (shelf) {
    const made = shelfEntry(shelf, status, now, status === 'finished' ? { finishedAt: now } : status === 'started' ? { startedAt: now } : {});
    return { ...made, cover: book.cover, subjects, ids: { shelf: shelf.id, ol: shelfOlKey(shelf) ?? book.workId }, places: shelfPlacesRefined(made, mapPlaces({ title: book.title, subjects: book.subjects })), enrich: 'done', enrichedAt: now };
  }
  return {
    id: `ol-${book.workId}`, kind: 'book', format: 'Book', title: book.title, creator: book.creator, year: book.year, cover: book.cover,
    ids: { ol: book.workId }, subjects, tags: [], places: mapPlaces({ title: book.title, subjects: book.subjects }), placesBy: 'auto',
    status, addedAt: now, ...(status === 'started' ? { startedAt: now } : {}), ...(status === 'finished' ? { finishedAt: now } : {}),
    source: 'search', enrich: 'done', enrichedAt: now, createdAt: now, updatedAt: now,
  };
}

/** The same book, matched by the catalog: its cover, its work, its subjects and (for "auto" places) where it belongs. */
export function enrichedEntry(entry: LibraryEntry, work: BookResult | null, now: string): LibraryEntry {
  if (!work) return { ...entry, enrich: (entry.enrichTries ?? 0) + 1 >= 2 || !entry.ids.isbn ? 'miss' : 'pending', enrichTries: (entry.enrichTries ?? 0) + 1, enrichedAt: now };
  const subjects = keptSubjects(work.subjects);
  const found = mapPlaces({ title: entry.title, subjects: work.subjects, shelves: entry.tags });
  const places = entry.placesBy === 'you' ? entry.places : entry.ids.shelf ? shelfPlacesRefined(entry, found) : found;
  return {
    ...entry, cover: entry.cover ?? work.cover, subjects: subjects.length ? subjects : entry.subjects, year: entry.year ?? work.year,
    creator: entry.creator || work.creator, ids: { ...entry.ids, ol: entry.ids.ol ?? work.workId },
    places: places.length || entry.placesBy === 'you' ? places : entry.places,
    enrich: 'done', enrichTries: (entry.enrichTries ?? 0) + 1, enrichedAt: now,
  };
}

/** A shelf work's places are curated: the territories it covers. One the curators placed only in the
 * whole field may be narrowed by its catalog subjects, to territories inside that field and nowhere else. */
export function shelfPlacesRefined(entry: LibraryEntry, found: readonly PlacePick[]): PlacePick[] {
  const shelf = EVOLUTION_CORE.find(work => work.id === entry.ids.shelf);
  if (!shelf || shelf.covers?.length) return [...entry.places];
  const field = shelfPlaces(shelf)[0];
  const inside = found.filter(pick => pick.nodeId.startsWith(`${field}.`));
  return inside.length ? inside : [...entry.places];
}

/** Does this result name a book already in the library? By work, by shelf, or by title and author. */
export function sameBook(entry: Pick<LibraryEntry, 'ids' | 'title' | 'creator'>, book: BookResult): boolean {
  return entry.ids.ol === book.workId || titleKey(entry.title, entry.creator) === titleKey(book.title, book.creator);
}
