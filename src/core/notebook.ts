import { catalog } from './catalog';
import { HELD, sameList } from './heldPlaces';

export type NotebookEntryKind = 'idea' | 'question';
export type NotebookEvidence = 'encountered' | 'explained' | 'applied';

export interface NotebookEntry {
  id: string;
  title: string;
  body: string;
  sourceUrl: string;
  sourceLabel: string;
  kind: NotebookEntryKind;
  evidence: NotebookEvidence;
  nodeIds: string[];
  createdAt: string;
  updatedAt: string;
  /** Its stored map areas, while one is an area the atlas no longer has (core/heldPlaces.ts). */
  readonly [HELD]?: readonly string[];
}

export interface Notebook {
  version: 1;
  entries: NotebookEntry[];
}

export type NotebookEntryInput = Omit<NotebookEntry, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
};

export interface NotebookSaveOptions {
  /** Only set for an explicit user import; the unreadable original is backed up first. */
  replaceInvalid?: boolean;
}

export const NOTEBOOK_STORAGE_KEY = 'mok-notebook-v1';
export const NOTEBOOK_LIMITS = {
  entries: 2_000,
  title: 160,
  body: 20_000,
  sourceLabel: 160,
  sourceUrl: 2_048,
  nodeIds: 12,
  importLength: 5_000_000,
} as const;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type JsonRecord = Record<string, unknown>;

function invalid(message: string): never {
  throw new Error(message);
}

function object(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object.`);
  return value as JsonRecord;
}

function text(value: unknown, label: string, maximum: number, required = false): string {
  if (typeof value !== 'string' || value.length > maximum) invalid(`${label} must be text of at most ${maximum.toLocaleString('en-US')} characters.`);
  if (required && !value.trim()) invalid(`${label} cannot be empty.`);
  return value;
}

function timestamp(value: unknown, label: string): string {
  const result = text(value, label, 24, true);
  const time = Date.parse(result);
  if (!Number.isFinite(time) || time < 0 || new Date(time).toISOString() !== result) {
    invalid(`${label} must be a valid UTC timestamp, such as 2026-09-07T12:00:00.000Z.`);
  }
  return result;
}

function identifier(value: unknown): string {
  const id = text(value, 'Entry ID', 160, true);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) invalid('Entry ID contains unsupported characters.');
  return id;
}

function sourceUrl(value: unknown): string {
  const url = text(value, 'Source URL', NOTEBOOK_LIMITS.sourceUrl).trim();
  if (!url) return '';
  if (/[\s\u0000-\u001f\u007f]/.test(url)) invalid('Source URL cannot contain spaces or control characters.');
  let parsed: URL;
  try { parsed = new URL(url); } catch { return invalid('Source URL must be a complete http:// or https:// link.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || !/^https?:\/\//i.test(url)) {
    invalid('Source URL must be a complete http:// or https:// link.');
  }
  return url;
}

/** An entry's map areas as given. */
function nodeIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > NOTEBOOK_LIMITS.nodeIds) invalid(`An entry can be placed in at most ${NOTEBOOK_LIMITS.nodeIds} map areas.`);
  return value.map((value) => text(value, 'Map area ID', 500, true));
}

/** An entry's map areas as shown: none repeated, and an area the atlas no longer has (held, renamed,
 * removed) absent rather than failing the whole notebook. The stored ones are kept to write back. */
const shownAreas = (ids: readonly string[]): string[] => [...new Set(ids)].filter((id) => !!catalog.get(id));

/** An entry as storage keeps it: held map areas go back as they were. */
function storedEntry(entry: NotebookEntry): NotebookEntry {
  const held = entry[HELD];
  if (!held) return entry;
  const { [HELD]: _held, ...rest } = entry;
  return { ...rest, nodeIds: [...held] };
}

function entry(value: unknown): NotebookEntry {
  const raw = object(value, 'Notebook entry');
  if (raw.kind !== 'idea' && raw.kind !== 'question') invalid('Entry kind must be idea or question.');
  if (raw.evidence !== 'encountered' && raw.evidence !== 'explained' && raw.evidence !== 'applied') {
    invalid('An entry reflection must be encountered, explained, or applied.');
  }
  const createdAt = timestamp(raw.createdAt, 'Entry createdAt');
  const updatedAt = timestamp(raw.updatedAt, 'Entry updatedAt');
  if (Date.parse(updatedAt) < Date.parse(createdAt)) invalid('Entry updatedAt cannot be earlier than createdAt.');
  const given = nodeIds(raw.nodeIds);
  const shown = shownAreas(given);
  // Held areas stay while what shows is still what they show; areas just read that name somewhere the
  // atlas lacks become held.
  const prior = (value as { [HELD]?: readonly string[] })[HELD];
  const held = prior && sameList(shownAreas(prior), shown) ? prior : !sameList(shown, given) ? given : undefined;
  return {
    id: identifier(raw.id),
    title: text(raw.title, 'Entry title', NOTEBOOK_LIMITS.title, true).trim(),
    body: text(raw.body, 'Entry body', NOTEBOOK_LIMITS.body),
    sourceUrl: sourceUrl(raw.sourceUrl),
    sourceLabel: text(raw.sourceLabel, 'Source label', NOTEBOOK_LIMITS.sourceLabel).trim(),
    kind: raw.kind,
    evidence: raw.evidence,
    nodeIds: shown,
    createdAt,
    updatedAt,
    ...(held ? { [HELD]: held } : {}),
  };
}

function notebook(value: unknown): Notebook {
  const raw = object(value, 'Notebook');
  if (raw.version !== 1) invalid(`Unsupported notebook version "${String(raw.version)}". Expected version 1; keep the original file for migration.`);
  if (!Array.isArray(raw.entries)) invalid('Notebook entries must be an array.');
  if (raw.entries.length > NOTEBOOK_LIMITS.entries) invalid(`A notebook can contain at most ${NOTEBOOK_LIMITS.entries.toLocaleString('en-US')} entries. Nothing has been removed.`);
  const unique = new Map<string, NotebookEntry>();
  for (const value of raw.entries) {
    const normalized = entry(value);
    const existing = unique.get(normalized.id);
    // Compared as stored, held map areas and all (JSON alone never sees them).
    if (existing && JSON.stringify(storedEntry(existing)) !== JSON.stringify(storedEntry(normalized))) invalid(`Conflicting entries share ID "${normalized.id}". Neither version was discarded.`);
    if (!existing) unique.set(normalized.id, normalized);
  }
  return { version: 1, entries: [...unique.values()] };
}

export function createNotebook(): Notebook {
  return { version: 1, entries: [] };
}

/** Imports are validated atomically; an invalid entry never produces a partial notebook. */
export function parseNotebook(raw: string): Notebook {
  if (typeof raw !== 'string' || raw.length > NOTEBOOK_LIMITS.importLength) invalid('Notebook import is too large. The maximum is 5 million characters.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid('This is not valid JSON. Choose an exported Map of Knowledge notebook.'); }
  return notebook(value);
}

export function exportNotebook(book: Notebook): string {
  // Apply the same bounds to exports as imports, so every export can be restored.
  const checked = notebook(book);
  const output = JSON.stringify({ ...checked, entries: checked.entries.map(storedEntry) }, null, 2);
  parseNotebook(output);
  return output;
}

function browserStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  try {
    if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  } catch { /* Privacy settings can deny access to the localStorage getter itself. */ }
  return invalid('Browser storage is unavailable.');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Storage could not be accessed.';
}

/** Loading never writes, repairs, or removes the user's original storage. */
export function loadNotebook(storage?: StorageLike): { data: Notebook; warning: string | null } {
  let raw: string | null;
  try { raw = browserStorage(storage).getItem(NOTEBOOK_STORAGE_KEY); } catch (error) {
    return { data: createNotebook(), warning: `${errorMessage(error)} Notebook changes last only in this session; export a backup before closing.` };
  }
  if (raw === null) return { data: createNotebook(), warning: null };
  try { return { data: parseNotebook(raw), warning: null }; } catch (error) {
    return {
      data: createNotebook(),
      warning: `Your saved notebook could not be loaded. ${errorMessage(error)} The original is untouched and saving is blocked to protect it. Export any new session notes before closing.`,
    };
  }
}

/** Also checks the existing record, protecting it even if a caller ignores load warnings. Held map
 * areas ride on a symbol key (core/heldPlaces.ts) that only object spreads carry: an in-memory notebook
 * copied through JSON or structuredClone loses them, and saving that copy would drop them for good. */
export function saveNotebook(book: Notebook, storage?: StorageLike, options: NotebookSaveOptions = {}): string | null {
  try {
    const target = browserStorage(storage);
    const serialized = exportNotebook(book);
    const previous = target.getItem(NOTEBOOK_STORAGE_KEY);
    if (previous !== null) {
      try { parseNotebook(previous); } catch {
        if (!options.replaceInvalid) return 'Notebook saving is blocked because the existing record is invalid or from another version. The original is untouched. Export your session notes before closing.';
        // Explicit recovery imports preserve the original before replacing it.
        const base = `${NOTEBOOK_STORAGE_KEY}.recovery.${Date.now()}`;
        let key = base;
        for (let suffix = 1; target.getItem(key) !== null; suffix += 1) {
          if (suffix > 100) invalid('Too many recovery copies. The original notebook is untouched.');
          key = `${base}.${suffix}`;
        }
        target.setItem(key, previous);
        if (target.getItem(key) !== previous) invalid('Could not verify a recovery copy. The original notebook is untouched.');
      }
    }
    target.setItem(NOTEBOOK_STORAGE_KEY, serialized);
    if (target.getItem(NOTEBOOK_STORAGE_KEY) !== serialized) return 'The browser did not retain this notebook. Export a backup before closing.';
    return null;
  } catch (error) {
    return `Notebook could not be saved: ${errorMessage(error)} Export a backup before closing.`;
  }
}

function newId(book: Notebook): string {
  let id: string;
  do {
    id = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  } while (book.entries.some((candidate) => candidate.id === id));
  return id;
}

export function upsertNotebookEntry(book: Notebook, input: NotebookEntryInput): Notebook {
  const current = notebook(book);
  const id = input.id === undefined ? newId(current) : identifier(input.id);
  const existing = current.entries.find((candidate) => candidate.id === id);
  if (!existing && current.entries.length >= NOTEBOOK_LIMITS.entries) invalid('This notebook is full. Export your notes before creating another notebook; no entries have been discarded.');
  const createdAt = existing?.createdAt ?? (input.createdAt === undefined ? new Date().toISOString() : timestamp(input.createdAt, 'Entry createdAt'));
  // A clock adjustment must not move an edited entry before its recorded creation or last edit.
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(createdAt), Date.parse(existing?.updatedAt ?? createdAt))).toISOString();
  // An edit names areas the atlas has; one it lacks is refused here, never held.
  const unknown = Array.isArray(input.nodeIds) ? input.nodeIds.find((id) => typeof id === 'string' && !catalog.get(id)) : undefined;
  if (unknown !== undefined) invalid(`Unknown map area "${unknown}".`);
  // An edit that leaves its map areas as they show keeps any held ones (entry() decides).
  const updated = entry({ ...(existing?.[HELD] ? { [HELD]: existing[HELD] } : {}), ...input, id, createdAt, updatedAt });
  const result: Notebook = {
    version: 1,
    entries: existing ? current.entries.map((candidate) => candidate.id === id ? updated : candidate) : [updated, ...current.entries],
  };
  // A successful edit must remain exportable, including JSON escaping and formatting overhead.
  exportNotebook(result);
  return result;
}

export function deleteNotebookEntry(book: Notebook, id: string): Notebook {
  const current = notebook(book);
  return { version: 1, entries: current.entries.filter((candidate) => candidate.id !== id) };
}

export function getNotebookEntriesForNode(book: Notebook, nodeId: string, includeDescendants = true): NotebookEntry[] {
  if (!catalog.get(nodeId)) return [];
  return book.entries.filter((candidate) => candidate.nodeIds.some((id) => id === nodeId || (
    includeDescendants && !!catalog.get(id) && catalog.getPath(catalog.get(id)!).some((ancestor) => ancestor.id === nodeId)
  ))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
