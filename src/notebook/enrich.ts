import { entryFrom, liveItems, type LibraryEntry, type LibraryStore } from './libraryStore';
import { CatalogError, enrichedEntry, lookupIsbns, lookupTitles, type BookResult, type Clock, type Lookup } from './openLibrary';

/*
 * Covers and subjects for imported books, looked up in Open Library in the background.
 *
 * Batched (20 ISBNs or 8 titles a request), one request at a time at Open Library's pace (the shared
 * limiter in openLibrary.ts), most telling books first (what the learner has read before what they
 * want to), and resumable: each entry carries its own state ("pending", "done", "miss") and its number
 * of tries in the library record, so a closed tab, a reload or going offline only pauses the work.
 * Lookups already made are never repeated: an entry is asked about by ISBN once, then by title once.
 * One tab at a time does the work (a short lease in localStorage); the others see its results arrive.
 */

export type EnrichState = 'idle' | 'running' | 'paused' | 'done';
export interface EnrichProgress {
  readonly state: EnrichState;
  /** Why it paused: offline, the catalog asked to slow down, or another tab is doing it. */
  readonly reason: 'offline' | 'rate-limited' | 'elsewhere' | 'failing' | null;
  /** Entries still waiting; this run's share of them, how many it has finished (found or not), how many lookups it made and how many found. */
  readonly waiting: number;
  readonly total: number;
  readonly finished: number;
  readonly looked: number;
  readonly found: number;
}

export interface EnrichDeps {
  read(): LibraryStore;
  apply(change: (library: LibraryStore) => LibraryStore): void;
  lookupIsbns?: (books: readonly Lookup[]) => Promise<Map<string, BookResult | null>>;
  lookupTitles?: (books: readonly Lookup[]) => Promise<Map<string, BookResult | null>>;
  clock?: Clock;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  online?: () => boolean;
}

const ISBN_BATCH = 20;
const TITLE_BATCH = 8;
const LEASE_KEY = 'mok-library-lookup-lease';
const LEASE_MS = 30_000;
const READ_FIRST: Record<LibraryEntry['status'], number> = { finished: 0, started: 0, stopped: 1, want: 2 };

export const waitingEntries = (library: LibraryStore) => liveItems(library).filter(item => item.enrich === 'pending');

/** The next batch: books with an ISBN not yet asked about by it, else books to ask about by title. */
export function nextBatch(library: LibraryStore): { by: 'isbn' | 'title'; books: Lookup[] } | null {
  const waiting = waitingEntries(library).sort((a, b) => READ_FIRST[a.status] - READ_FIRST[b.status] || b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));
  const lookup = (item: LibraryEntry): Lookup => ({ id: item.id, isbn: item.ids.isbn ?? null, title: item.title, creator: item.creator });
  const byIsbn = waiting.filter(item => item.ids.isbn && !(item.enrichTries ?? 0));
  if (byIsbn.length) return { by: 'isbn', books: byIsbn.slice(0, ISBN_BATCH).map(lookup) };
  const byTitle = waiting.filter(item => !item.ids.isbn || (item.enrichTries ?? 0) >= 1);
  return byTitle.length ? { by: 'title', books: byTitle.slice(0, TITLE_BATCH).map(lookup) } : null;
}

/** What one batch found, written onto its entries (the learner's own changes are left as they are). */
export function applyLookups(library: LibraryStore, results: ReadonlyMap<string, BookResult | null>, asked: readonly Lookup[], now: string): LibraryStore {
  const ids = new Set(asked.map(book => book.id));
  return {
    ...library,
    items: library.items.map(item => ids.has(item.id) && !item.removedAt && item.enrich === 'pending' ? entryFrom(enrichedEntry(item, results.get(item.id) ?? null, now)) : item),
  };
}

const realClock: Clock = { now: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)) };
const signature = (library: LibraryStore, books: readonly Lookup[]) => {
  const ids = new Set(books.map(book => book.id));
  return library.items.filter(item => ids.has(item.id)).map(item => `${item.id}:${item.enrich}:${item.enrichTries ?? 0}`).sort().join('|');
};
const defaultStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function createEnricher(deps: EnrichDeps) {
  const clock = deps.clock ?? realClock;
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const online = deps.online ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const me = `tab-${Math.random().toString(36).slice(2)}`;
  const listeners = new Set<(progress: EnrichProgress) => void>();
  let progress: EnrichProgress = { state: 'idle', reason: null, waiting: 0, total: 0, finished: 0, looked: 0, found: 0 };
  let running: Promise<void> | null = null;
  let stopped = false;

  const set = (next: Partial<EnrichProgress>) => { progress = { ...progress, ...next }; for (const listener of listeners) listener(progress); };

  /** A short lease in storage: true when this tab may work. Without storage, every tab may. */
  const lease = (): boolean => {
    if (!storage) return true;
    try {
      const held = JSON.parse(storage.getItem(LEASE_KEY) ?? 'null') as { id?: string; until?: number } | null;
      if (held?.id && held.id !== me && (held.until ?? 0) > clock.now()) return false;
      const mine = JSON.stringify({ id: me, until: clock.now() + LEASE_MS });
      storage.setItem(LEASE_KEY, mine);
      return storage.getItem(LEASE_KEY) === mine;
    } catch { return true; }
  };
  const release = () => { try { if (storage && JSON.parse(storage.getItem(LEASE_KEY) ?? 'null')?.id === me) storage.removeItem(LEASE_KEY); } catch { /* nothing held */ } };

  async function work() {
    let pause = 0;
    let failures = 0;
    const waiting = waitingEntries(deps.read()).length;
    set({ state: 'running', reason: null, waiting, total: waiting, finished: 0, looked: 0, found: 0 });
    while (!stopped) {
      const batch = nextBatch(deps.read());
      if (!batch) { set({ state: 'done', reason: null, waiting: 0 }); break; }
      if (!online()) { set({ state: 'paused', reason: 'offline' }); break; }
      if (!lease()) { set({ state: 'paused', reason: 'elsewhere' }); break; }
      try {
        const results = batch.by === 'isbn'
          ? await (deps.lookupIsbns ?? (books => lookupIsbns(books)))(batch.books)
          : await (deps.lookupTitles ?? (books => lookupTitles(books)))(batch.books);
        if (stopped) break;
        const before = signature(deps.read(), batch.books);
        deps.apply(library => applyLookups(library, results, batch.books, new Date(clock.now()).toISOString()));
        // A change that could not be applied would ask the same question forever: stop instead.
        if (signature(deps.read(), batch.books) === before) { set({ state: 'paused', reason: 'failing' }); break; }
        const found = batch.books.filter(book => results.get(book.id)).length;
        const ids = new Set(batch.books.map(book => book.id));
        const settled = deps.read().items.filter(item => ids.has(item.id) && item.enrich !== 'pending').length;
        const left = waitingEntries(deps.read()).length;
        pause = 0; failures = 0;
        set({ state: 'running', reason: null, looked: progress.looked + batch.books.length, found: progress.found + found, finished: progress.finished + settled, waiting: left, total: Math.max(progress.total, left + progress.finished + settled) });
      } catch (error) {
        if (stopped) break;
        const kind = error instanceof CatalogError ? error.kind : 'failed';
        if (kind === 'offline') { set({ state: 'paused', reason: 'offline' }); break; }
        failures += 1;
        if (failures >= 4) { set({ state: 'paused', reason: kind === 'rate-limited' ? 'rate-limited' : 'failing' }); break; }
        pause = Math.min(60_000, pause ? pause * 2 : 5_000);
        set({ state: 'paused', reason: kind === 'rate-limited' ? 'rate-limited' : 'failing' });
        await clock.sleep(pause);
        if (!stopped) set({ state: 'running', reason: null });
      }
    }
    release();
  }

  return {
    /** Start (or resume) looking up whatever is waiting. Safe to call often: one run at a time. */
    start(): Promise<void> {
      stopped = false;
      if (!running) running = work().finally(() => { running = null; });
      return running;
    },
    stop() { stopped = true; release(); },
    subscribe(listener: (progress: EnrichProgress) => void) { listeners.add(listener); listener(progress); return () => { listeners.delete(listener); }; },
    get progress() { return progress; },
  };
}
export type Enricher = ReturnType<typeof createEnricher>;

// One runner for the whole app. The Library connects it to App's library on every render, through
// functions that read App's own refs, so it keeps working while the learner is on another tab.
const live: Pick<EnrichDeps, 'read' | 'apply'> = { read: () => ({ version: 2, links: [], items: [], notes: [] }), apply: () => undefined };
let shared: Enricher | null = null;
export function libraryEnricher(): Enricher {
  return shared ??= createEnricher({ read: () => live.read(), apply: change => live.apply(change) });
}
export function connectEnricher(read: EnrichDeps['read'], apply: EnrichDeps['apply']) { live.read = read; live.apply = apply; }
