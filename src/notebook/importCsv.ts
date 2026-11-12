import { EVOLUTION_CORE } from '../core/evolutionLibrary';
import {
  entryFrom, entryKey, kindOfFormat, LIBRARY_LIMITS, noteFrom, shelfOlKey, shelfPlaces, stamp,
  type ItemNote, type ItemStatus, type LibraryEntry, type LibraryStore,
} from './libraryStore';
import { mapPlaces } from './placeMap';

/*
 * Reading history from elsewhere: Goodreads' "Export library" CSV and The StoryGraph's CSV export.
 * Parsing is forgiving about the file (a byte-order mark, Windows line endings, a spreadsheet's
 * semicolons, Goodreads' ="…" ISBNs, old and new column sets) and strict about what it keeps.
 * Importing the same file twice changes nothing the second time: every row has a stable ID, and a
 * row only ever moves an entry forward (want → reading → finished) or fills what is missing.
 */

export type ImportSource = 'goodreads' | 'storygraph';
export const IMPORT_LIMITS = { bytes: 10 * 1024 * 1024 } as const;

export interface ImportRow {
  readonly source: ImportSource;
  /** The line in the file (1 is the header), for messages. */
  readonly line: number;
  /** Goodreads Book Id, or StoryGraph's ISBN/UID when it is not an ISBN. */
  readonly sourceId: string | null;
  readonly title: string;
  readonly series: string | null;
  readonly creator: string;
  readonly isbn: string | null;
  readonly year: number | null;
  readonly status: ItemStatus;
  readonly addedAt: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly rating: number | null;
  /** The learner's own shelves or tags, without the reading-status ones. */
  readonly shelves: readonly string[];
  readonly review: string;
  readonly privateNotes: string;
  readonly format: string;
}

export interface ParsedImport { readonly source: ImportSource; readonly rows: readonly ImportRow[]; readonly skipped: number }

// --- CSV -------------------------------------------------------------------------------------

/** The delimiter of the header line: commas, or the semicolons or tabs a spreadsheet may save. */
function delimiterOf(text: string): string {
  const firstLine = text.slice(0, text.search(/\r|\n/) === -1 ? undefined : text.search(/\r|\n/));
  const count = (c: string) => firstLine.split(c).length - 1;
  return [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
}

/** RFC 4180 rows, read leniently: quoted fields may hold delimiters, quotes ("") and line breaks;
 * a stray quote inside an unquoted field is kept as text; blank lines are dropped. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const delimiter = delimiterOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let started = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && !started) { quoted = true; started = true; continue; }
    if (c === delimiter) { row.push(field); field = ''; started = false; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; started = false;
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      continue;
    }
    field += c;
    started = true;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(cells => cells.some(cell => cell.trim() !== ''));
}

// --- fields --------------------------------------------------------------------------------

const isbn13Valid = (digits: string) => /^\d{13}$/.test(digits) && [...digits].reduce((sum, d, i) => sum + Number(d) * (i % 2 ? 3 : 1), 0) % 10 === 0;
const isbn10Valid = (code: string) => /^\d{9}[\dX]$/.test(code) && [...code].reduce((sum, d, i) => sum + (d === 'X' ? 10 : Number(d)) * (10 - i), 0) % 11 === 0;

/** An ISBN as ISBN-13, from "9780679733379", "067973337X", Goodreads' ="…" or a hyphenated form; null if not a valid ISBN. */
export function isbn13(raw: string | undefined): string | null {
  const code = (raw ?? '').replace(/^=/, '').replace(/["'\s-]/g, '').toUpperCase();
  if (isbn13Valid(code)) return code;
  if (!isbn10Valid(code)) return null;
  const core = `978${code.slice(0, 9)}`;
  const check = (10 - ([...core].reduce((sum, d, i) => sum + Number(d) * (i % 2 ? 3 : 1), 0) % 10)) % 10;
  return `${core}${check}`;
}

/** A calendar date as an ISO time at noon UTC, so it shows as the same day everywhere. */
export function importDate(raw: string | undefined): string | null {
  const match = (raw ?? '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && year > 1000 ? date.toISOString() : null;
}
const datesIn = (raw: string | undefined) => [...(raw ?? '').matchAll(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/g)].map(m => importDate(m[0])).filter((d): d is string => !!d);

/** "The Fellowship of the Ring (The Lord of the Rings, #1)" → the title, and the series apart. */
export function cleanTitle(raw: string): { title: string; series: string | null } {
  const text = raw.replace(/\s+/g, ' ').trim();
  const match = text.match(/^(.*\S)\s*\(([^()]*#\s*\d+(?:\.\d+)?(?:-\d+)?)\)$/);
  return match ? { title: match[1], series: match[2].trim() } : { title: text, series: null };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
/** Goodreads reviews are HTML: line breaks kept, tags dropped. */
export function htmlToText(raw: string): string {
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+|#39);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? (name[0] === '#' ? String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : whole))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const year = (...raw: (string | undefined)[]) => {
  for (const value of raw) { const n = Number((value ?? '').trim()); if (value?.trim() && Number.isInteger(n) && n !== 0 && n >= -4000 && n <= 2200) return n; }
  return null;
};
const rating = (raw: string | undefined) => { const n = Number((raw ?? '').trim()); return Number.isFinite(n) && n > 0 && n <= 5 ? Math.round(n * 100) / 100 : null; };
const list = (raw: string | undefined) => (raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
const STATUS_SHELVES = new Set(['read', 'to-read', 'currently-reading', 'did-not-finish', 'dnf']);
const STOPPED = /^(did-?not-?finish|dnf|abandoned|not-?finishing|gave-?up|unfinished|stopped)$/i;

function goodreadsStatus(shelf: string): ItemStatus {
  const name = shelf.trim().toLowerCase();
  if (name === 'read') return 'finished';
  if (name === 'currently-reading') return 'started';
  if (STOPPED.test(name)) return 'stopped';
  return 'want';
}

function storygraphStatus(status: string): ItemStatus | null {
  switch (status.trim().toLowerCase()) {
    case 'read': return 'finished';
    case 'currently-reading': case 'paused': return 'started';
    case 'did-not-finish': return 'stopped';
    case 'to-read': return 'want';
    default: return null;
  }
}

// --- the two exports -----------------------------------------------------------------------

const headerKey = (name: string) => name.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** A Goodreads or StoryGraph export as rows. Throws a plain-language Error for any other file. */
export function parseLibraryCsv(text: string): ParsedImport {
  if (typeof text !== 'string' || !text.trim()) throw new Error('This file is empty.');
  if (text.length > IMPORT_LIMITS.bytes) throw new Error('This file is larger than 10 MB. Export it again, or split it.');
  const [header, ...body] = parseCsv(text);
  const column = new Map((header ?? []).map((name, index) => [headerKey(name), index]));
  const has = (...names: string[]) => names.every(name => column.has(name));
  const source: ImportSource | null = has('book id', 'title', 'author', 'exclusive shelf') ? 'goodreads' : has('title', 'authors', 'read status', 'isbn/uid') ? 'storygraph' : null;
  if (!source) throw new Error('This is not a Goodreads or StoryGraph export. On Goodreads, use My Books › Import and export › Export library; on The StoryGraph, Manage account › Export StoryGraph library.');
  const rows: ImportRow[] = [];
  let skipped = 0;
  body.forEach((cells, index) => {
    const get = (name: string) => { const i = column.get(name); return i === undefined ? '' : (cells[i] ?? '').trim(); };
    const parsed = source === 'goodreads' ? goodreadsRow(get, index + 2) : storygraphRow(get, index + 2);
    if (parsed) rows.push(parsed); else skipped += 1;
  });
  if (!rows.length) throw new Error(skipped ? 'No books in this file could be read.' : 'This export has no books in it yet.');
  return { source, rows, skipped };
}

function goodreadsRow(get: (name: string) => string, line: number): ImportRow | null {
  const { title, series } = cleanTitle(get('title'));
  if (!title) return null;
  const status = goodreadsStatus(get('exclusive shelf') || 'to-read');
  const exclusive = get('exclusive shelf').toLowerCase();
  const id = get('book id');
  return {
    source: 'goodreads', line, sourceId: /^\d{1,14}$/.test(id) ? id : null, title, series,
    creator: get('author') || list(get('additional authors'))[0] || '',
    isbn: isbn13(get('isbn13')) ?? isbn13(get('isbn')),
    year: year(get('original publication year'), get('year published')),
    status, addedAt: importDate(get('date added')), startedAt: null,
    finishedAt: status === 'finished' ? importDate(get('date read')) : null,
    rating: rating(get('my rating')),
    shelves: list(get('bookshelves')).filter(shelf => !STATUS_SHELVES.has(shelf.toLowerCase()) && shelf.toLowerCase() !== exclusive),
    review: htmlToText(get('my review')), privateNotes: htmlToText(get('private notes')), format: get('binding'),
  };
}

function storygraphRow(get: (name: string) => string, line: number): ImportRow | null {
  const { title, series } = cleanTitle(get('title'));
  const status = storygraphStatus(get('read status') || 'to-read');
  if (!title || !status) return null;
  const uid = get('isbn/uid');
  const isbn = isbn13(uid);
  const read = datesIn(get('dates read'));
  const open = /-\s*$/.test(get('dates read'));
  const last = importDate(get('last date read')) ?? (!open && read.length ? read[read.length - 1] : null);
  const started = open ? read[read.length - 1] ?? null : read.length >= 2 ? read[read.length - 2] : null;
  return {
    source: 'storygraph', line, sourceId: !isbn && /^[A-Za-z0-9._:-]{1,80}$/.test(uid) ? uid : null, title, series,
    creator: list(get('authors'))[0] ?? '', isbn, year: null, status,
    addedAt: importDate(get('date added')),
    startedAt: status === 'want' ? null : started,
    finishedAt: status === 'finished' ? last : null,
    rating: rating(get('star rating')), shelves: list(get('tags')),
    review: htmlToText(get('review')), privateNotes: '', format: get('format'),
  };
}

// --- into the library ----------------------------------------------------------------------

/** Main title and first creator's surname, without punctuation, articles or a subtitle: how one book is recognised across catalogs. */
export function titleKey(title: string, creator: string): string {
  const plain = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const main = plain(cleanTitle(title).title.split(/[:;]|\s[-–—]\s/)[0]).replace(/^(the|a|an) /, '');
  const surname = plain(creator.split(/,| and | & /)[0] ?? '').split(' ').filter(Boolean).pop() ?? '';
  return `${main}|${surname}`;
}

const SHELF_KEYS = new Map(EVOLUTION_CORE.map(work => [titleKey(work.title, work.creator), work]));
/** The Evolution shelf work this book is, if it is one: by its Open Library work, or its title and author. */
export const findShelfWork = (title: string, creator: string, ol?: string) =>
  (ol ? EVOLUTION_CORE.find(work => shelfOlKey(work) === ol) : undefined) ?? SHELF_KEYS.get(titleKey(title, creator));
const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const RANK: Record<ItemStatus, number> = { want: 0, stopped: 1, started: 1, finished: 2 };
/** JSON with sorted keys: two copies of an entry are equal whatever order their fields were written in. */
const canonical = (value: unknown): string => JSON.stringify(value, (_key, v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : v);
const formatOf = (row: ImportRow) => /audio/i.test(row.format) ? 'Audiobook' : 'Book';

/** The entry ID a row gets when it is new: its own export's ID, else its ISBN, else its title and author. */
function rowId(row: ImportRow): string {
  if (row.source === 'goodreads' && row.sourceId) return `gr-${row.sourceId}`;
  if (row.isbn) return `isbn-${row.isbn}`;
  if (row.sourceId) return `sg-${row.sourceId}`;
  return `t-${hash(titleKey(row.title, row.creator))}`;
}

export interface ImportPlan {
  readonly rows: number;
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
  /** Rows left out because the library is full, or because the learner removed that book. */
  readonly skipped: number;
  readonly byStatus: Readonly<Record<ItemStatus, number>>;
}

/** Put the rows into the library: new books added, books already there moved forward or filled in.
 * Returns the new library, what happened, and the entries to look up (covers and subjects). */
export function applyImport(library: LibraryStore, parsed: ParsedImport, now = new Date().toISOString()): { library: LibraryStore; plan: ImportPlan; lookup: string[] } {
  const items = new Map(library.items.map(item => [item.id, item]));
  const notes = new Map(library.notes.map(item => [item.id, item]));
  // How an existing entry is recognised: its ID, an export ID, an ISBN, or its title and author.
  const byKey = new Map<string, string>();
  const remember = (item: LibraryEntry) => {
    const keys = [item.ids.gr && `gr:${item.ids.gr}`, item.ids.sg && `sg:${item.ids.sg}`, item.ids.isbn && `isbn:${item.ids.isbn}`, `title:${titleKey(item.title, item.creator)}`];
    for (const key of keys) if (key && !byKey.has(key)) byKey.set(key, item.id);
  };
  for (const item of library.items) remember(item);
  const byStatus: Record<ItemStatus, number> = { want: 0, started: 0, finished: 0, stopped: 0 };
  let added = 0, updated = 0, unchanged = 0, skipped = 0;
  const lookup = new Set<string>();
  let clock = now;
  const tick = () => (clock = stamp(clock, Date.parse(now)));

  for (const row of parsed.rows) {
    byStatus[row.status] += 1;
    const known = [row.source === 'goodreads' && row.sourceId ? `gr:${row.sourceId}` : '', row.source === 'storygraph' && row.sourceId ? `sg:${row.sourceId}` : '', row.isbn ? `isbn:${row.isbn}` : '', `title:${titleKey(row.title, row.creator)}`]
      .filter(Boolean).map(key => byKey.get(key)).find(Boolean);
    const shelf = findShelfWork(row.title, row.creator);
    const id = known ?? (shelf ? `shelf-${shelf.id}` : rowId(row));
    const existing = items.get(id);
    if (existing?.removedAt) { skipped += 1; continue; } // removed by the learner: an import never brings it back
    const sourceIds = { ...(row.source === 'goodreads' && row.sourceId ? { gr: row.sourceId } : {}), ...(row.source === 'storygraph' && row.sourceId ? { sg: row.sourceId } : {}), ...(row.isbn ? { isbn: row.isbn } : {}) };
    let next: LibraryEntry;
    if (!existing) {
      if (items.size >= LIBRARY_LIMITS.items) { skipped += 1; continue; }
      const tags = row.shelves.map(tag => tag.slice(0, LIBRARY_LIMITS.tag)).slice(0, LIBRARY_LIMITS.tags);
      const ol = shelf ? shelfOlKey(shelf) : undefined;
      next = entryFrom({
        id, kind: shelf ? kindOfFormat(shelf.format) : 'book', format: shelf ? shelf.format : formatOf(row),
        title: (shelf?.title ?? row.title).slice(0, LIBRARY_LIMITS.title), creator: (shelf?.creator ?? row.creator).slice(0, LIBRARY_LIMITS.creator),
        year: shelf?.year ?? row.year, cover: null, ids: { ...sourceIds, ...(shelf ? { shelf: shelf.id } : {}), ...(ol ? { ol } : {}) },
        subjects: [], tags,
        places: shelf ? shelfPlaces(shelf).map(nodeId => ({ nodeId, score: 1 })) : mapPlaces({ title: row.title, shelves: tags }),
        placesBy: 'auto', status: row.status, addedAt: row.addedAt ?? now,
        ...(row.startedAt ? { startedAt: row.startedAt } : {}), ...(row.finishedAt ? { finishedAt: row.finishedAt } : {}),
        ...(row.rating ? { rating: row.rating } : {}),
        source: shelf ? 'shelf' : row.source, enrich: 'pending', enrichTries: 0, createdAt: now, updatedAt: tick(),
      });
      added += 1;
    } else {
      // Only forward, only filling in: an older export never undoes what was done here.
      const forward = RANK[row.status] > RANK[existing.status];
      const status = forward ? row.status : existing.status;
      const startedAt = existing.startedAt ?? (status !== 'want' ? row.startedAt ?? undefined : undefined);
      const finishedAt = status === 'finished' ? (forward ? row.finishedAt ?? undefined : existing.finishedAt ?? row.finishedAt ?? undefined) : undefined;
      const tags = [...new Set([...existing.tags, ...row.shelves.map(tag => tag.slice(0, LIBRARY_LIMITS.tag))])].slice(0, LIBRARY_LIMITS.tags);
      const candidate: LibraryEntry = {
        ...existing, status, ids: { ...sourceIds, ...existing.ids }, tags,
        ...(startedAt ? { startedAt } : {}), ...(finishedAt ? { finishedAt } : {}),
        ...(existing.rating === undefined && row.rating ? { rating: row.rating } : {}),
      };
      if (!candidate.startedAt) delete (candidate as { startedAt?: string }).startedAt;
      if (!candidate.finishedAt || status !== 'finished') delete (candidate as { finishedAt?: string }).finishedAt;
      const changed = canonical(candidate) !== canonical(existing);
      if (!changed) { unchanged += 1; next = existing; }
      else {
        const places = candidate.placesBy === 'auto' && !candidate.ids.shelf && candidate.tags.length !== existing.tags.length
          ? mapPlaces({ title: candidate.title, subjects: candidate.subjects, shelves: candidate.tags }) : candidate.places;
        next = entryFrom({ ...candidate, places, updatedAt: stamp(existing.updatedAt, Date.parse(now)) });
        updated += 1;
      }
    }
    items.set(next.id, next);
    remember(next);
    if (next.enrich === 'pending') lookup.add(next.id);
    // The learner's review and private notes become thoughts on the book, once each.
    const target = entryKey(next);
    for (const [prefix, text] of [['rv', row.review], ['pn', row.privateNotes]] as const) {
      if (!text) continue;
      const noteId = `${prefix}-${next.id}`;
      const kept = notes.get(noteId);
      const body = text.slice(0, LIBRARY_LIMITS.noteText);
      if (kept && (kept.removedAt || kept.text === body)) continue;
      if (!kept && notes.size >= LIBRARY_LIMITS.notes) continue;
      const note: ItemNote = noteFrom({ id: noteId, target, kind: 'note', text: body, createdAt: kept?.createdAt ?? row.finishedAt ?? row.addedAt ?? now, updatedAt: kept ? stamp(kept.updatedAt, Date.parse(now)) : now });
      notes.set(noteId, note);
    }
  }
  return {
    library: { ...library, items: [...items.values()], notes: [...notes.values()] },
    plan: { rows: parsed.rows.length, added, updated, unchanged, skipped, byStatus },
    lookup: [...lookup],
  };
}
