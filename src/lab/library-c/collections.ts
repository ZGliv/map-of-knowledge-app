/*
 * The learner's own collections: a name and a list of things kept in the library, by their journal
 * keys (work:…, entry:…, link:…, reel:… or note:…). Nothing is copied: a collection only points, so
 * a book finished or a place proved shows up in every collection holding it.
 *
 * Its own key and its own version, beside the library (mok-library-v1). The same safety rules as the
 * library and the notebook: loading never writes; a record that can't be read (including one from a
 * newer build) is never overwritten; every save is read back. Removed collections stay as tombstones,
 * so a removal in one tab wins over a stale copy in another.
 */

export const COLLECTIONS_KEY = 'mok-collections-v1';
export const COLLECTIONS_VERSION = 1;
export const COLLECTION_LIMITS = { collections: 200, items: 300, name: 80, raw: 1_000_000 } as const;

export interface Collection {
  readonly id: string;
  readonly name: string;
  /** Journal keys, in the learner's order. */
  readonly items: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly removedAt?: string;
}

export interface CollectionStore {
  readonly version: 1;
  readonly collections: readonly Collection[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/;
/** A journal key: what the library calls each thing it keeps. */
export const ITEM_KEY = /^(work|entry|link|reel|note):[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/;
const isTime = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const fail = (message: string): never => { throw new Error(message); };

export const createCollections = (): CollectionStore => ({ version: 1, collections: [] });

/** A name as it is kept: trimmed, single-spaced. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

function collection(value: unknown): Collection {
  if (!isObject(value)) return fail('A collection is not an object.');
  const r = value;
  if (typeof r.id !== 'string' || !ID.test(r.id)) fail('A collection has no usable ID.');
  if (typeof r.name !== 'string' || !cleanName(r.name) || r.name.length > COLLECTION_LIMITS.name) fail(`A collection needs a name of at most ${COLLECTION_LIMITS.name} characters.`);
  if (!Array.isArray(r.items) || r.items.length > COLLECTION_LIMITS.items || r.items.some(key => typeof key !== 'string' || !ITEM_KEY.test(key))) fail('A collection holds an unreadable list of things.');
  if (!isTime(r.createdAt) || !isTime(r.updatedAt)) fail('A collection has no valid date.');
  if (r.removedAt !== undefined && !isTime(r.removedAt)) fail('A removed collection has no valid date.');
  return {
    id: r.id as string, name: cleanName(r.name as string), items: [...new Set(r.items as string[])], createdAt: r.createdAt as string, updatedAt: r.updatedAt as string,
    ...(r.removedAt ? { removedAt: r.removedAt as string } : {}),
  };
}

const newer = (a: Collection | undefined, b: Collection) => (!a || b.updatedAt >= a.updatedAt ? b : a);

/** Validates a whole record at once: one bad collection rejects the record, never half of it. */
export function collectionsFrom(value: unknown): CollectionStore {
  if (!isObject(value)) return fail('The collections record is not an object.');
  if (value.version !== COLLECTIONS_VERSION) fail(`Unsupported collections version "${String(value.version)}". The original is kept.`);
  if (!Array.isArray(value.collections) || value.collections.length > COLLECTION_LIMITS.collections) fail('The collections record holds an unreadable or oversized list.');
  const byId = new Map<string, Collection>();
  for (const raw of value.collections as unknown[]) { const c = collection(raw); byId.set(c.id, newer(byId.get(c.id), c)); }
  return { version: 1, collections: [...byId.values()] };
}

export function parseCollections(raw: string): CollectionStore {
  if (typeof raw !== 'string' || raw.length > COLLECTION_LIMITS.raw) fail('The collections record is too large to read.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('The collections record is not valid JSON.'); }
  return collectionsFrom(value);
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Loading never writes, repairs or removes the saved original. A record that can't be read blocks saving. */
export function loadCollections(target?: StorageLike): { data: CollectionStore; warning: string | null; blocked: boolean } {
  const store = storage(target);
  if (!store) return { data: createCollections(), warning: 'Browser storage is unavailable. Collections last only for this session.', blocked: false };
  let raw: string | null;
  try { raw = store.getItem(COLLECTIONS_KEY); } catch { return { data: createCollections(), warning: 'Your collections could not be read from this browser.', blocked: true }; }
  if (raw === null) return { data: createCollections(), warning: null, blocked: false };
  try { return { data: parseCollections(raw), warning: null, blocked: false }; } catch (error) {
    return { data: createCollections(), warning: `Your collections could not be loaded. ${error instanceof Error ? error.message : ''} The original is untouched and saving is blocked to protect it.`, blocked: true };
  }
}

/** The saved copy, or null when absent or unreadable. No side effects. */
export function readCollections(target?: StorageLike): CollectionStore | null {
  try { const raw = storage(target)?.getItem(COLLECTIONS_KEY); return raw ? parseCollections(raw) : null; } catch { return null; }
}

/** Returns an error message, or null once the browser has kept it. An unreadable record already there is never replaced. */
export function saveCollections(record: CollectionStore, target?: StorageLike): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Collections last only for this session.';
  try {
    const output = JSON.stringify(collectionsFrom(record));
    if (output.length > COLLECTION_LIMITS.raw) return 'Your collections have grown past what this browser can keep.';
    const previous = store.getItem(COLLECTIONS_KEY);
    if (previous !== null) { try { parseCollections(previous); } catch { return 'Saving collections is blocked because the existing record could not be read. The original is untouched.'; } }
    store.setItem(COLLECTIONS_KEY, output);
    return store.getItem(COLLECTIONS_KEY) === output ? null : 'The browser did not keep your collections.';
  } catch (error) {
    return `Your collections could not be saved: ${error instanceof Error ? error.message.replace(/\.$/, '') : 'storage failed'}.`;
  }
}

/** Combine two copies (another tab) without losing a collection, an edit or a removal: the newer edit of each wins. */
export function mergeCollections(a: CollectionStore, b: CollectionStore): CollectionStore {
  const byId = new Map(a.collections.map(c => [c.id, c]));
  for (const c of b.collections) byId.set(c.id, newer(byId.get(c.id), c));
  return { version: 1, collections: [...byId.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id)) };
}

// --- changes -------------------------------------------------------------------------------

const newId = () => typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
/** Now, but always after `after`, so an edit in the same millisecond still counts as newer. */
const stamp = (after: string | undefined, now: number) => new Date(Math.max(now, after ? Date.parse(after) + 1 : 0)).toISOString();

/** The collections still standing, newest edit first. */
export const liveCollections = (record: CollectionStore): Collection[] => record.collections.filter(c => !c.removedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));

function checkedItems(items: readonly string[]): string[] {
  const unique = [...new Set(items)];
  if (unique.some(key => !ITEM_KEY.test(key))) fail('Only things in your library can go in a collection.');
  if (unique.length > COLLECTION_LIMITS.items) fail(`A collection holds at most ${COLLECTION_LIMITS.items} things.`);
  return unique;
}

export function createCollection(record: CollectionStore, input: { name: string; items?: readonly string[]; id?: string }, now = Date.now()): { record: CollectionStore; id: string } {
  const name = cleanName(input.name);
  if (!name) fail('Give the collection a name.');
  if (name.length > COLLECTION_LIMITS.name) fail(`Keep the name under ${COLLECTION_LIMITS.name} characters.`);
  if (record.collections.length >= COLLECTION_LIMITS.collections) fail('You have as many collections as this browser can keep.');
  const id = input.id ?? newId();
  if (record.collections.some(c => c.id === id)) fail('That collection already exists.');
  const at = new Date(now).toISOString();
  const made = collection({ id, name, items: checkedItems(input.items ?? []), createdAt: at, updatedAt: at });
  return { record: { version: 1, collections: [...record.collections, made] }, id };
}

function change(record: CollectionStore, id: string, edit: (c: Collection) => Partial<Pick<Collection, 'name' | 'items'>>, now: number): CollectionStore {
  const current = record.collections.find(c => c.id === id && !c.removedAt);
  if (!current) return fail('That collection is no longer here.');
  const next = collection({ ...current, ...edit(current), updatedAt: stamp(current.updatedAt, now) });
  return { version: 1, collections: record.collections.map(c => c.id === id ? next : c) };
}

export const renameCollection = (record: CollectionStore, id: string, name: string, now = Date.now()) => {
  const clean = cleanName(name);
  if (!clean) fail('Give the collection a name.');
  if (clean.length > COLLECTION_LIMITS.name) fail(`Keep the name under ${COLLECTION_LIMITS.name} characters.`);
  return change(record, id, () => ({ name: clean }), now);
};
/** Replace what a collection holds (the picker's answer), keeping the order of what stays. */
export const setCollectionItems = (record: CollectionStore, id: string, items: readonly string[], now = Date.now()) => change(record, id, () => ({ items: checkedItems(items) }), now);
/** Put one thing in, or take it out. */
export const toggleCollectionItem = (record: CollectionStore, id: string, key: string, now = Date.now()) =>
  change(record, id, c => ({ items: checkedItems(c.items.includes(key) ? c.items.filter(k => k !== key) : [...c.items, key]) }), now);
export function removeCollection(record: CollectionStore, id: string, now = Date.now()): CollectionStore {
  const current = record.collections.find(c => c.id === id);
  if (!current || current.removedAt) return record;
  const at = stamp(current.updatedAt, now);
  return { version: 1, collections: record.collections.map(c => c.id === id ? { ...c, removedAt: at, updatedAt: at } : c) };
}
