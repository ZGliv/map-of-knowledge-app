import { catalog } from '../../core/catalog';

/**
 * Exhibitions the learner makes: a question or a theme, the atlas places it is about, and the things
 * they hung in it by hand. Everything else in an exhibition (what sits under its places) is computed
 * from the real records each time, so this store only ever holds the learner's own choices.
 *
 * Kept under its own key, beside the library (mok-library-v1) and the notebook. The record carries its
 * own version. The same safety rules as the library: loading never writes; a record that can't be
 * read (including one from a newer build) is never overwritten, and saving stays blocked until an
 * explicit import replaces it after a recovery copy; every save is read back to confirm the browser
 * kept it; removals stay as tombstones, so a removal in one tab wins over a stale copy in another.
 */
export const EXHIBITIONS_KEY = 'mok-exhibitions-v1';
export const EXHIBITIONS_VERSION = 1;
export const EXHIBITION_LIMITS = {
  exhibitions: 400, title: 160, intro: 280, places: 6, items: 400, hidden: 400, key: 220, raw: 2_000_000,
} as const;

/** A thing hung in an exhibition, by its library key: a book or film (work:/entry:), a link or saved
 * video (link:), a kept reel (reel:), a notebook idea or question (note:). */
const KEY = /^(work|entry|link|reel|note):[a-zA-Z0-9][a-zA-Z0-9._:-]{0,200}$/;
const ID = /^ex-[a-zA-Z0-9._:-]{1,80}$/;
/** The suggestion an exhibition was kept from (field:<node> or around:<node>), so that one steps aside. */
const FROM = /^(field|around):[a-z0-9.-]{1,200}$/;

export interface StoredExhibition {
  readonly id: string;
  /** The question or theme, in the learner's words. */
  readonly title: string;
  /** One line under the title, optional. */
  readonly intro: string;
  /** Atlas places it is about: whatever sits under them hangs here by itself. */
  readonly places: readonly string[];
  /** Hung by hand, in the order they were hung. */
  readonly items: readonly string[];
  /** Taken down by hand: never hung again by its places. */
  readonly hidden: readonly string[];
  readonly from?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly removedAt?: string;
}

export interface ExhibitionStore {
  readonly version: 1;
  readonly exhibitions: readonly StoredExhibition[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const fail = (message: string): never => { throw new Error(message); };
const isTime = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export const createExhibitionStore = (): ExhibitionStore => ({ version: 1, exhibitions: [] });
export const liveExhibitions = (store: ExhibitionStore): StoredExhibition[] => store.exhibitions.filter(item => !item.removedAt);

function keys(value: unknown, max: number, what: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return fail(`An exhibition has an unreadable list of ${what}.`);
  // A key in an unknown shape is let go, not fatal: what it pointed at is the library's to keep.
  return [...new Set(value.filter((key): key is string => typeof key === 'string' && key.length <= EXHIBITION_LIMITS.key && KEY.test(key)))];
}

function exhibition(value: unknown): StoredExhibition {
  if (!isObject(value)) return fail('An exhibition is not an object.');
  const r = value;
  if (typeof r.id !== 'string' || !ID.test(r.id)) fail('An exhibition has no usable ID.');
  if (typeof r.title !== 'string' || !clean(r.title) || r.title.length > EXHIBITION_LIMITS.title) fail('An exhibition needs a title.');
  if (r.intro !== undefined && (typeof r.intro !== 'string' || r.intro.length > EXHIBITION_LIMITS.intro)) fail('An exhibition has an unreadable line.');
  if (r.places !== undefined && (!Array.isArray(r.places) || r.places.length > EXHIBITION_LIMITS.places * 2 || r.places.some(id => typeof id !== 'string' || id.length > 200))) fail('An exhibition has an unreadable list of places.');
  if (r.from !== undefined && (typeof r.from !== 'string' || !FROM.test(r.from))) fail('An exhibition names an unreadable suggestion.');
  if (!isTime(r.createdAt) || !isTime(r.updatedAt)) fail('An exhibition has no valid date.');
  if (r.removedAt !== undefined && !isTime(r.removedAt)) fail('A removed exhibition has no valid date.');
  // A place the atlas no longer has is dropped, as the library drops one.
  const places = [...new Set((r.places as string[] | undefined) ?? [])].filter(id => !!catalog.get(id)).slice(0, EXHIBITION_LIMITS.places);
  const items = keys(r.items, EXHIBITION_LIMITS.items, 'things');
  const hidden = keys(r.hidden, EXHIBITION_LIMITS.hidden, 'things taken down').filter(key => !items.includes(key));
  return {
    id: r.id as string, title: clean(r.title as string), intro: clean((r.intro as string | undefined) ?? ''), places, items, hidden,
    ...(r.from ? { from: r.from as string } : {}),
    createdAt: r.createdAt as string, updatedAt: r.updatedAt as string,
    ...(r.removedAt ? { removedAt: r.removedAt as string } : {}),
  };
}

const newer = <T extends { updatedAt: string }>(a: T | undefined, b: T): T => (!a || b.updatedAt >= a.updatedAt ? b : a);

/**
 * Validates a whole record at once: one bad exhibition rejects the record, never half of it. Version 1
 * is the only one so far; a later build adds its migration here, reading the older shape in memory.
 */
export function exhibitionsFrom(value: unknown): ExhibitionStore {
  if (!isObject(value)) return fail('The exhibitions record is not an object.');
  if (value.version !== EXHIBITIONS_VERSION) return fail(`Unsupported exhibitions version "${String(value.version)}". The original is kept for migration.`);
  const raw = value.exhibitions ?? [];
  if (!Array.isArray(raw) || raw.length > EXHIBITION_LIMITS.exhibitions) fail('The exhibitions record holds an unreadable or oversized list.');
  const byId = new Map<string, StoredExhibition>();
  for (const item of (raw as unknown[]).map(exhibition)) byId.set(item.id, newer(byId.get(item.id), item));
  return { version: 1, exhibitions: [...byId.values()] };
}

export function parseExhibitions(raw: string): ExhibitionStore {
  if (typeof raw !== 'string' || raw.length > EXHIBITION_LIMITS.raw) fail('The exhibitions record is too large to read.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('The exhibitions record is not valid JSON.'); }
  return exhibitionsFrom(value);
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Loading never writes, repairs or removes the saved original. */
export function loadExhibitions(target?: StorageLike): { data: ExhibitionStore; warning: string | null; blocked: boolean } {
  const store = storage(target);
  if (!store) return { data: createExhibitionStore(), warning: 'Browser storage is unavailable. Your exhibitions last only for this session.', blocked: false };
  let raw: string | null;
  try { raw = store.getItem(EXHIBITIONS_KEY); } catch { return { data: createExhibitionStore(), warning: 'Your exhibitions could not be read from this browser.', blocked: false }; }
  if (raw === null) return { data: createExhibitionStore(), warning: null, blocked: false };
  try { return { data: parseExhibitions(raw), warning: null, blocked: false }; } catch (error) {
    return { data: createExhibitionStore(), warning: `Your exhibitions could not be loaded. ${error instanceof Error ? error.message : ''} The original is untouched and saving is blocked to protect it.`, blocked: true };
  }
}

/** The saved copy, or null when absent or unreadable. No side effects. */
export function readExhibitions(target?: StorageLike): ExhibitionStore | null {
  try { const raw = storage(target)?.getItem(EXHIBITIONS_KEY); return raw ? parseExhibitions(raw) : null; } catch { return null; }
}

/** Returns an error message, or null once the browser has kept it. */
export function saveExhibitions(next: ExhibitionStore, target?: StorageLike, options: { replaceInvalid?: boolean } = {}): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Your exhibitions last only for this session.';
  try {
    const output = JSON.stringify(exhibitionsFrom(next));
    if (output.length > EXHIBITION_LIMITS.raw) return 'Your exhibitions have grown past what this browser can keep. Export a backup.';
    const previous = store.getItem(EXHIBITIONS_KEY);
    if (previous !== null) {
      let readable = true;
      try { parseExhibitions(previous); } catch { readable = false; }
      if (!readable) {
        if (!options.replaceInvalid) return 'Saving your exhibitions is blocked because the existing record could not be read. The original is untouched.';
        const key = `${EXHIBITIONS_KEY}.recovery.${Date.now()}`;
        store.setItem(key, previous);
        if (store.getItem(key) !== previous) return 'Could not keep a copy of the unreadable record, so nothing was replaced.';
      }
    }
    store.setItem(EXHIBITIONS_KEY, output);
    return store.getItem(EXHIBITIONS_KEY) === output ? null : 'The browser did not keep your exhibitions. Export a backup.';
  } catch (error) {
    return `Your exhibitions could not be saved: ${error instanceof Error ? error.message.replace(/\.$/, '') : 'storage failed'}.`;
  }
}

/** Combine two copies (another tab, an import) without losing an exhibition or a removal. */
export function mergeExhibitions(a: ExhibitionStore, b: ExhibitionStore): ExhibitionStore {
  const byId = new Map(a.exhibitions.map(item => [item.id, item]));
  for (const item of b.exhibitions) byId.set(item.id, newer(byId.get(item.id), item));
  return { version: 1, exhibitions: [...byId.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id)) };
}

// --- changes -------------------------------------------------------------------------------

const newId = () => `ex-${typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
/** Now, but always after `after`, so an edit in the same millisecond still counts as newer. */
const stamp = (after: string | undefined, now: string) => new Date(Math.max(Date.parse(now), after ? Date.parse(after) + 1 : 0)).toISOString();

export interface ExhibitionInput { title: string; intro?: string; places?: readonly string[]; items?: readonly string[]; from?: string }

export function createExhibition(store: ExhibitionStore, input: ExhibitionInput, now = new Date().toISOString(), id = newId()): { store: ExhibitionStore; id: string } {
  if (liveExhibitions(store).length >= EXHIBITION_LIMITS.exhibitions) fail('You have as many exhibitions as this browser can keep.');
  const made = exhibition({ id, title: input.title, intro: input.intro ?? '', places: input.places ?? [], items: input.items ?? [], hidden: [], ...(input.from ? { from: input.from } : {}), createdAt: now, updatedAt: now });
  if (!made.title) fail('Name it with a question or a theme.');
  return { store: { ...store, exhibitions: [...store.exhibitions, made] }, id };
}

function change(store: ExhibitionStore, id: string, edit: (current: StoredExhibition) => Partial<StoredExhibition>, now: string): ExhibitionStore {
  const current = store.exhibitions.find(item => item.id === id && !item.removedAt);
  if (!current) return fail('That exhibition is no longer here.');
  const next = exhibition({ ...current, ...edit(current), updatedAt: stamp(current.updatedAt, now) });
  return { ...store, exhibitions: store.exhibitions.map(item => item.id === id ? next : item) };
}

export const updateExhibition = (store: ExhibitionStore, id: string, patch: Pick<Partial<StoredExhibition>, 'title' | 'intro' | 'places'>, now = new Date().toISOString()) =>
  change(store, id, () => patch, now);

export const removeExhibition = (store: ExhibitionStore, id: string, now = new Date().toISOString()) =>
  change(store, id, () => ({ removedAt: stamp(store.exhibitions.find(item => item.id === id)?.updatedAt, now) }), now);

/** Hang a thing in an exhibition (last), or bring back one taken down. */
export const hang = (store: ExhibitionStore, id: string, key: string, now = new Date().toISOString()) =>
  change(store, id, current => ({ items: current.items.includes(key) ? current.items : [...current.items, key], hidden: current.hidden.filter(k => k !== key) }), now);

/** Take a thing down: off the hand-hung list, and kept from hanging itself again by its places. */
export const takeDown = (store: ExhibitionStore, id: string, key: string, now = new Date().toISOString()) =>
  change(store, id, current => ({ items: current.items.filter(k => k !== key), hidden: current.hidden.includes(key) ? current.hidden : [...current.hidden, key] }), now);

// --- backup files --------------------------------------------------------------------------

/** A Library backup file with the exhibitions beside the notebook and the library. Older builds ignore
 * the extra fields, so the file still imports there. */
export function withExhibitions<T extends object>(file: T, store: ExhibitionStore): T & { exhibitionsVersion?: 1; exhibitions?: readonly StoredExhibition[] } {
  if (!store.exhibitions.length) return { ...file };
  return { ...file, exhibitionsVersion: 1, exhibitions: store.exhibitions };
}

/** The exhibitions in a backup file, or null when it has none. Throws on a malformed one. */
export function exhibitionsInFile(raw: string): ExhibitionStore | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isObject(value) || value.exhibitions === undefined) return null;
  return exhibitionsFrom({ version: value.exhibitionsVersion ?? EXHIBITIONS_VERSION, exhibitions: value.exhibitions });
}
