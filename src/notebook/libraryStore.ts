import { catalog } from '../core/catalog';
import { EVOLUTION_ID, EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import { EVOLUTION_CORE, type LibraryWork, type WorkFormat } from '../core/evolutionLibrary';
import { HELD, sameList } from '../core/heldPlaces';

/**
 * The learner's own library, beside the notebook (mok-notebook-v1) under its own key: links they
 * saved, the books, films, series, podcasts and courses they keep (from a search, an import or the
 * Evolution shelf), and the quotes and thoughts they kept on any of them.
 *
 * The key keeps its first name; the record inside carries its own version. Version 1 (links and
 * reading marks on shelf works) is read and migrated in memory; the first save of a version 2
 * record keeps a copy of the version 1 original under LIBRARY_BACKUP_KEY before replacing it.
 *
 * Same safety rules as the notebook: loading never writes; a record that can't be read (including
 * one from a newer build) is never overwritten (saving is blocked until an explicit import replaces
 * it, after a backup); every save is read back to confirm the browser kept it. Removed links, items
 * and notes stay as tombstones, so a removal made in one tab wins over a stale copy in another.
 *
 * A place the atlas no longer has (held, renamed or removed) never fails the record: the link or item
 * shows only the places that exist, and its stored places are written back exactly as they were
 * (core/heldPlaces.ts), so it is under that place again if the place returns.
 */
export const LIBRARY_STORAGE_KEY = 'mok-library-v1';
export const LIBRARY_VERSION = 2;
/** Where the version 1 original is kept the first time a version 2 record replaces it. */
export const LIBRARY_BACKUP_KEY = `${LIBRARY_STORAGE_KEY}.before-v2`;
export const LIBRARY_LIMITS = {
  links: 2_000, url: 2_048, note: 200, raw: 4_500_000,
  items: 4_000, notes: 8_000, noteText: 4_000, where: 40,
  title: 300, creator: 200, format: 40, subjects: 8, subject: 80, tags: 8, tag: 60,
  /** A curated shelf work may cover many territories; the mapper and the learner choose up to three. */
  places: 12, chosenPlaces: 3,
  /** A saved link (a video kept from Watch) may sit under its place and up to four more. */
  linkPlaces: 4,
  previewTitle: 300, previewText: 500, siteName: 100,
} as const;

// --- types ---------------------------------------------------------------------------------

/** What a page said about itself when it was saved (api/unfurl.mjs). */
export interface LinkPreview {
  readonly title: string;
  readonly description: string;
  readonly siteName: string;
  /** An https image the page names for itself, or null. */
  readonly image: string | null;
  readonly at: string;
}

export interface SavedLink {
  readonly id: string;
  readonly url: string;
  /** One line: what this is, in the learner's words. */
  readonly note: string;
  /** The map place it belongs to, or null. */
  readonly nodeId: string | null;
  /** More places it belongs to, beyond nodeId (a video saved from Watch under several). */
  readonly places?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Set when removed. Kept so other tabs and imports don't bring it back. */
  readonly removedAt?: string;
  readonly preview?: LinkPreview;
  /** Its stored places, while they name a place the atlas no longer has. */
  readonly [HELD]?: HeldLinkPlaces;
}

/** A link's place fields exactly as stored. */
export interface HeldLinkPlaces { readonly nodeId: string | null; readonly places?: readonly string[] }

export type ItemKind = 'book' | 'film' | 'documentary' | 'series' | 'podcast' | 'course';
/** want → started (reading, watching, listening) → finished. Stopped: begun and set down. */
export type ItemStatus = 'want' | 'started' | 'finished' | 'stopped';
export type ItemSource = 'search' | 'goodreads' | 'storygraph' | 'shelf';
export const ITEM_KINDS: readonly ItemKind[] = ['book', 'film', 'documentary', 'series', 'podcast', 'course'];
export const ITEM_STATUSES: readonly ItemStatus[] = ['want', 'started', 'finished', 'stopped'];
const SOURCES: readonly ItemSource[] = ['search', 'goodreads', 'storygraph', 'shelf'];

/** A map place an item is about, with how strongly (0–1). */
export interface PlacePick { readonly nodeId: string; readonly score: number }

export interface ItemIds {
  /** Open Library work, e.g. OL1974714W. */
  readonly ol?: string;
  /** Wikidata item, e.g. Q5174583. */
  readonly wd?: string;
  readonly isbn?: string;
  /** Goodreads book ID, from its export. */
  readonly gr?: string;
  /** The StoryGraph export's ISBN/UID column. */
  readonly sg?: string;
  /** An Evolution shelf work (core/evolutionLibrary.ts). */
  readonly shelf?: string;
}

/** One book, film, series, podcast or course the learner keeps. */
export interface LibraryEntry {
  /** Stable and source-derived ("ol-OL1974714W", "wd-Q5174583", "gr-3869", "shelf-finch"), so the same
   * book added twice, from two tabs or two imports, is one entry. */
  readonly id: string;
  readonly kind: ItemKind;
  /** How it is named on its page: "Book", "Documentary series", "Podcast". */
  readonly format: string;
  readonly title: string;
  readonly creator: string;
  readonly year: number | null;
  /** An Open Library cover ID (covers.openlibrary.org/b/id/…), or null for the typographic cover. */
  readonly cover: number | null;
  readonly ids: ItemIds;
  /** Catalog subjects (Open Library) or main subjects and genres (Wikidata), as they were given. */
  readonly subjects: readonly string[];
  /** The learner's own shelves or tags from an import. */
  readonly tags: readonly string[];
  readonly places: readonly PlacePick[];
  /** "you" once the learner changed or cleared the places; "auto" places follow new evidence. */
  readonly placesBy: 'auto' | 'you';
  readonly status: ItemStatus;
  readonly addedAt: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  /** 0.5–5, from an import. */
  readonly rating?: number;
  readonly source: ItemSource;
  /** Open Library enrichment (covers and subjects for imports): waiting, done, or not found. */
  readonly enrich?: 'pending' | 'done' | 'miss';
  readonly enrichTries?: number;
  readonly enrichedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly removedAt?: string;
  /** Its stored places, while they name a place the atlas no longer has. */
  readonly [HELD]?: readonly PlacePick[];
}

/** A passage kept from an item, or a thought about it. `target` is the item's library key:
 * work:<shelf id>, entry:<entry id> or link:<link id>. */
export interface ItemNote {
  readonly id: string;
  readonly target: string;
  readonly kind: 'quote' | 'note';
  readonly text: string;
  /** Page, chapter or time, in the learner's words. */
  readonly where?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly removedAt?: string;
}

export interface LibraryStore {
  readonly version: 2;
  readonly links: readonly SavedLink[];
  readonly items: readonly LibraryEntry[];
  readonly notes: readonly ItemNote[];
}

/** A reading mark on a shelf work, as the hub shows it (and as version 1 stored it). */
export type ReadingState = 'started' | 'finished';
export interface ReadingMark { readonly state: ReadingState; readonly startedAt: string; readonly finishedAt?: string; readonly updatedAt: string }

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const fail = (message: string): never => { throw new Error(message); };
const isTime = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;
const ENTRY_ID = /^[a-z]{1,8}-[A-Za-z0-9._:-]{1,150}$/;
const TARGET = /^(work|entry|link):[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;

export const createLibraryStore = (): LibraryStore => ({ version: 2, links: [], items: [], notes: [] });

// --- links ---------------------------------------------------------------------------------

/** A typed or pasted address as a full http(s) URL, or null. "example.org/x" gains https://. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > LIBRARY_LIMITS.url || /[\s\u0000-\u001f\u007f]/.test(raw)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : /^[^/]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw) ? `https://${raw}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.') ? url.href : null;
  } catch { return null; }
}

export const domainOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

const httpsImage = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value || value.length > LIBRARY_LIMITS.url) return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
};

function preview(value: unknown): LinkPreview | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) return fail('A link preview is not an object.');
  const field = (key: string, max: number) => {
    const text = value[key];
    if (typeof text !== 'string' || text.length > max) fail('A link preview is unreadable.');
    return text as string;
  };
  if (!isTime(value.at)) fail('A link preview has no valid date.');
  if (value.image !== null && value.image !== undefined && !httpsImage(value.image)) fail('A link preview image must be an https address.');
  return {
    title: field('title', LIBRARY_LIMITS.previewTitle), description: field('description', LIBRARY_LIMITS.previewText),
    siteName: field('siteName', LIBRARY_LIMITS.siteName), image: httpsImage(value.image), at: value.at as string,
  };
}

/** The longest place ID a link keeps, as the notebook keeps its map areas (generated places run deep). */
const PLACE_ID_MAX = 500;

/** A link's further places as given: a list of place names, or undefined. */
function linkPlaceList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > LIBRARY_LIMITS.linkPlaces || value.some(id => typeof id !== 'string' || id.length > PLACE_ID_MAX)) return fail('A saved link has an unreadable list of places.');
  return value as string[];
}

/** A link's further places as shown: none repeated, never its own nodeId again, none the atlas lacks. */
const linkMorePlaces = (list: readonly string[] | undefined, nodeId: string | null): string[] => [...new Set(list ?? [])].filter(id => id !== nodeId && !!catalog.get(id));
/** A link's place fields as shown: a place the atlas lacks is absent. */
function linkView(nodeId: string | null, list: readonly string[] | undefined): { nodeId: string | null; places: string[] } {
  return { nodeId: nodeId !== null && catalog.get(nodeId) ? nodeId : null, places: linkMorePlaces(list, nodeId) };
}

/** Every field in its place, so a record written back reads exactly as it was stored. */
function linkRecord(r: Omit<SavedLink, 'nodeId' | 'places' | typeof HELD>, nodeId: string | null, places: readonly string[] | undefined): SavedLink {
  return {
    id: r.id, url: r.url, note: r.note, nodeId, createdAt: r.createdAt, updatedAt: r.updatedAt,
    ...(places?.length ? { places } : {}), ...(r.removedAt ? { removedAt: r.removedAt } : {}), ...(r.preview ? { preview: r.preview } : {}),
  };
}

/** A link as storage keeps it: held places go back as they were. */
export function storedLink(link: SavedLink): SavedLink {
  const held = link[HELD];
  return held ? linkRecord(link, held.nodeId, held.places) : link;
}

/** Every place a link sits under: its own, then the rest. */
export const linkPlaces = (link: Pick<SavedLink, 'nodeId' | 'places'>): string[] => [...(link.nodeId ? [link.nodeId] : []), ...(link.places ?? [])];

function link(value: unknown): SavedLink {
  if (!isObject(value)) return fail('A saved link is not an object.');
  const r = value;
  if (typeof r.id !== 'string' || !ID.test(r.id)) fail('A saved link has no usable ID.');
  const url = typeof r.url === 'string' ? normalizeUrl(r.url) : null;
  if (!url) fail('A saved link must be a complete http:// or https:// address.');
  if (typeof r.note !== 'string' || r.note.length > LIBRARY_LIMITS.note) fail(`A link's note must be text of at most ${LIBRARY_LIMITS.note} characters.`);
  if (r.nodeId !== null && (typeof r.nodeId !== 'string' || !r.nodeId || r.nodeId.length > PLACE_ID_MAX)) fail('A saved link has an unreadable map place.');
  if (!isTime(r.createdAt) || !isTime(r.updatedAt)) fail('A saved link has no valid date.');
  if (r.removedAt !== undefined && !isTime(r.removedAt)) fail('A removed link has no valid date.');
  const nodeId = r.nodeId as string | null;
  const list = linkPlaceList(r.places);
  const view = linkView(nodeId, list);
  const base = { id: r.id as string, url: url!, note: (r.note as string).trim(), createdAt: r.createdAt as string, updatedAt: r.updatedAt as string, ...(r.removedAt ? { removedAt: r.removedAt as string } : {}), ...(r.preview !== undefined ? { preview: preview(r.preview) } : {}) };
  const out = linkRecord(base, view.nodeId, view.places);
  // Held places stay while what shows is still what they show (however it is split between the main
  // place and the rest); places just read that name somewhere the atlas lacks become held.
  const prior = (r as { [HELD]?: HeldLinkPlaces })[HELD];
  const priorView = prior && linkView(prior.nodeId, prior.places);
  const held = priorView && sameList(linkPlaces(priorView), linkPlaces(view)) ? prior
    : view.nodeId !== nodeId || !sameList(view.places, list ?? []) ? { nodeId, ...(list ? { places: list } : {}) } : undefined;
  return held ? { ...out, [HELD]: held } : out;
}

// --- items ---------------------------------------------------------------------------------

const textList = (value: unknown, max: number, each: number, what: string): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || !v.trim() || v.length > each)) return fail(`An item's ${what} are unreadable.`);
  return value as string[];
};

function ids(value: unknown): ItemIds {
  if (!isObject(value)) return fail('An item has no identifiers.');
  const out: Record<string, string> = {};
  const rules: Record<keyof ItemIds, RegExp> = {
    ol: /^OL\d{1,12}W$/, wd: /^Q\d{1,12}$/, isbn: /^(\d{9}[\dX]|\d{13})$/, gr: /^\d{1,14}$/, sg: /^[A-Za-z0-9._:-]{1,80}$/, shelf: /^[a-z0-9-]{1,60}$/,
  };
  for (const [key, rule] of Object.entries(rules)) {
    const id = value[key];
    if (id === undefined) continue;
    if (typeof id !== 'string' || !rule.test(id)) fail(`An item has an unreadable ${key} identifier.`);
    out[key] = id as string;
  }
  return out;
}

/** An item's places as given. Any text names a place: one the atlas lacks (removed, renamed, empty or
 * longer than any it has) is held, never fatal, as the Library always let such a pick go quietly. */
function places(value: unknown): PlacePick[] {
  if (!Array.isArray(value) || value.length > LIBRARY_LIMITS.places) return fail('An item has an unreadable list of places.');
  return value.map(pick => {
    if (!isObject(pick) || typeof pick.nodeId !== 'string' || typeof pick.score !== 'number' || !(pick.score >= 0 && pick.score <= 1)) fail('An item has an unreadable place.');
    return { nodeId: pick.nodeId as string, score: pick.score as number };
  });
}

/** An item's places as shown: none repeated, none the atlas lacks. */
const shownPlaces = (list: readonly PlacePick[]): PlacePick[] => list.filter((pick, i) => !!catalog.get(pick.nodeId) && list.findIndex(p => p.nodeId === pick.nodeId) === i);
const samePick = (a: PlacePick, b: PlacePick) => a.nodeId === b.nodeId && a.score === b.score;

/** An item as storage keeps it: held places go back as they were. */
export function storedEntry(item: LibraryEntry): LibraryEntry {
  const held = item[HELD];
  if (!held) return item;
  const { [HELD]: _held, ...rest } = item;
  return { ...rest, places: held };
}

function entry(value: unknown): LibraryEntry {
  if (!isObject(value)) return fail('A library item is not an object.');
  const r = value;
  if (typeof r.id !== 'string' || !ENTRY_ID.test(r.id)) fail('A library item has no usable ID.');
  if (!ITEM_KINDS.includes(r.kind as ItemKind)) fail('A library item has an unknown kind.');
  if (typeof r.format !== 'string' || r.format.length > LIBRARY_LIMITS.format) fail('A library item has an unreadable format.');
  if (typeof r.title !== 'string' || !r.title.trim() || r.title.length > LIBRARY_LIMITS.title) fail('A library item needs a title.');
  if (typeof r.creator !== 'string' || r.creator.length > LIBRARY_LIMITS.creator) fail('A library item has an unreadable creator.');
  if (r.year !== null && (typeof r.year !== 'number' || !Number.isInteger(r.year) || r.year < -4000 || r.year > 2200)) fail('A library item has an impossible year.');
  if (r.cover !== null && (typeof r.cover !== 'number' || !Number.isInteger(r.cover) || r.cover <= 0 || r.cover > 1e11)) fail('A library item has an unreadable cover.');
  if (r.placesBy !== 'auto' && r.placesBy !== 'you') fail('A library item has unreadable places.');
  if (!ITEM_STATUSES.includes(r.status as ItemStatus)) fail('A library item has an unknown status.');
  if (!SOURCES.includes(r.source as ItemSource)) fail('A library item has an unknown source.');
  for (const key of ['addedAt', 'createdAt', 'updatedAt'] as const) if (!isTime(r[key])) fail('A library item has no valid date.');
  for (const key of ['startedAt', 'finishedAt', 'removedAt', 'enrichedAt'] as const) if (r[key] !== undefined && !isTime(r[key])) fail('A library item has an invalid date.');
  if (r.rating !== undefined && (typeof r.rating !== 'number' || !(r.rating > 0 && r.rating <= 5))) fail('A library item has an impossible rating.');
  if (r.enrich !== undefined && r.enrich !== 'pending' && r.enrich !== 'done' && r.enrich !== 'miss') fail('A library item has an unknown lookup state.');
  if (r.enrichTries !== undefined && (typeof r.enrichTries !== 'number' || !Number.isInteger(r.enrichTries) || r.enrichTries < 0 || r.enrichTries > 9)) fail('A library item has an unreadable lookup count.');
  const given = places(r.places);
  const shown = shownPlaces(given);
  const prior = (r as { [HELD]?: readonly PlacePick[] })[HELD];
  const held = prior && sameList(shownPlaces(prior), shown, samePick) ? prior : !sameList(shown, given, samePick) ? given : undefined;
  const out: LibraryEntry = {
    id: r.id as string, kind: r.kind as ItemKind, format: r.format as string, title: (r.title as string).trim(), creator: (r.creator as string).trim(),
    year: r.year as number | null, cover: r.cover as number | null, ids: ids(r.ids),
    subjects: textList(r.subjects, LIBRARY_LIMITS.subjects, LIBRARY_LIMITS.subject, 'subjects'),
    tags: textList(r.tags, LIBRARY_LIMITS.tags, LIBRARY_LIMITS.tag, 'tags'),
    places: shown, placesBy: r.placesBy as 'auto' | 'you', status: r.status as ItemStatus,
    addedAt: r.addedAt as string, source: r.source as ItemSource, createdAt: r.createdAt as string, updatedAt: r.updatedAt as string,
  };
  return {
    ...out,
    ...(r.startedAt ? { startedAt: r.startedAt as string } : {}),
    ...(r.finishedAt ? { finishedAt: r.finishedAt as string } : {}),
    ...(r.rating !== undefined ? { rating: r.rating as number } : {}),
    ...(r.enrich ? { enrich: r.enrich as LibraryEntry['enrich'] } : {}),
    ...(r.enrichTries !== undefined ? { enrichTries: r.enrichTries as number } : {}),
    ...(r.enrichedAt ? { enrichedAt: r.enrichedAt as string } : {}),
    ...(r.removedAt ? { removedAt: r.removedAt as string } : {}),
    ...(held ? { [HELD]: held } : {}),
  };
}

function note(value: unknown): ItemNote {
  if (!isObject(value)) return fail('A kept passage is not an object.');
  const r = value;
  if (typeof r.id !== 'string' || !ID.test(r.id)) fail('A kept passage has no usable ID.');
  if (typeof r.target !== 'string' || !TARGET.test(r.target)) fail('A kept passage belongs to nothing.');
  if (r.kind !== 'quote' && r.kind !== 'note') fail('A kept passage has an unknown kind.');
  if (typeof r.text !== 'string' || !r.text.trim() || r.text.length > LIBRARY_LIMITS.noteText) fail(`A kept passage must be text of at most ${LIBRARY_LIMITS.noteText} characters.`);
  if (r.where !== undefined && (typeof r.where !== 'string' || r.where.length > LIBRARY_LIMITS.where)) fail('A kept passage has an unreadable page.');
  if (!isTime(r.createdAt) || !isTime(r.updatedAt)) fail('A kept passage has no valid date.');
  if (r.removedAt !== undefined && !isTime(r.removedAt)) fail('A removed passage has no valid date.');
  return {
    id: r.id as string, target: r.target as string, kind: r.kind as ItemNote['kind'], text: r.text as string, createdAt: r.createdAt as string, updatedAt: r.updatedAt as string,
    ...(r.where ? { where: (r.where as string).trim() } : {}),
    ...(r.removedAt ? { removedAt: r.removedAt as string } : {}),
  };
}

/** Validate one entry or one note on its own (imports build many at once). Throws on anything malformed. */
export const entryFrom = (value: unknown): LibraryEntry => entry(value);
export const noteFrom = (value: unknown): ItemNote => note(value);

// --- shelf works ---------------------------------------------------------------------------

export const shelfEntryId = (workId: string) => `shelf-${workId}`;
const shelfWork = (workId: string) => EVOLUTION_CORE.find(work => work.id === workId);
/** The Open Library work behind a shelf row, from its own link. */
export const shelfOlKey = (work: LibraryWork): string | undefined => work.links.map(l => l.url.match(/openlibrary\.org\/works\/(OL\d+W)/)?.[1]).find(Boolean);
const territoryNode = (code: string) => { const t = EVOLUTION_TERRITORIES.find(x => x.code === code); return t ? evolutionTerritoryId(t.key) : null; };
/** A shelf work's curated places: the territories it covers, or the whole field. */
export const shelfPlaces = (work: LibraryWork): string[] => work.covers?.length ? work.covers.map(territoryNode).filter((id): id is string => !!id) : [EVOLUTION_ID];

export function kindOfFormat(format: WorkFormat | string): ItemKind {
  if (format === 'Lecture course') return 'course';
  if (format === 'Documentary series') return 'series';
  if (format === 'Radio series') return 'podcast';
  return 'book';
}

/** The words for being on it, done with it, and beginning it, by kind. */
export function kindVerbs(kind: ItemKind): { want: string; doing: string; done: string; started: string } {
  if (kind === 'book') return { want: 'Want to read', doing: 'Reading', done: 'Finished reading', started: 'Started reading' };
  if (kind === 'podcast') return { want: 'Want to listen', doing: 'Listening', done: 'Listened', started: 'Started listening' };
  return { want: 'Want to watch', doing: 'Watching', done: 'Watched', started: 'Started watching' };
}

/** A shelf work as one of the learner's entries. */
export function shelfEntry(work: LibraryWork, status: ItemStatus, now: string, dates: { startedAt?: string; finishedAt?: string } = {}): LibraryEntry {
  const ol = shelfOlKey(work);
  return {
    id: shelfEntryId(work.id), kind: kindOfFormat(work.format), format: work.format, title: work.title, creator: work.creator, year: work.year,
    cover: null, ids: { shelf: work.id, ...(ol ? { ol } : {}) }, subjects: [], tags: [],
    places: shelfPlaces(work).map(nodeId => ({ nodeId, score: 1 })), placesBy: 'auto', status, addedAt: dates.startedAt ?? now, source: 'shelf',
    ...(dates.startedAt ? { startedAt: dates.startedAt } : {}), ...(dates.finishedAt ? { finishedAt: dates.finishedAt } : {}),
    ...(ol ? { enrich: 'pending' as const } : {}),
    createdAt: dates.startedAt ?? now, updatedAt: now,
  };
}

// --- the record ----------------------------------------------------------------------------

function readingMark(value: unknown): ReadingMark {
  const r = value as Record<string, unknown> | null;
  if (!r || (r.state !== 'started' && r.state !== 'finished') || !isTime(r.startedAt) || !isTime(r.updatedAt)) return fail('A reading mark is incomplete.');
  if (r.finishedAt !== undefined && !isTime(r.finishedAt)) fail('A reading mark has an invalid finish date.');
  return { state: r.state, startedAt: r.startedAt, updatedAt: r.updatedAt, ...(r.finishedAt ? { finishedAt: r.finishedAt as string } : {}) };
}

/** Version 1: links, and reading marks keyed by shelf work. Each mark becomes the shelf work's entry. */
function fromVersion1(data: Record<string, unknown>): LibraryStore {
  if (!Array.isArray(data.links) || data.links.length > LIBRARY_LIMITS.links) fail('The library holds an unreadable or oversized list of links.');
  const marks = data.reading;
  if (marks !== undefined && !isObject(marks)) fail('Reading marks must be an object.');
  const items: LibraryEntry[] = [];
  for (const [workId, value] of Object.entries((marks ?? {}) as Record<string, unknown>)) {
    const mark = readingMark(value);
    const work = shelfWork(workId);
    if (!work) continue; // Not on the shelf any more: the pre-migration copy keeps it.
    const made = shelfEntry(work, mark.state, mark.updatedAt, { startedAt: mark.startedAt, finishedAt: mark.state === 'finished' ? mark.finishedAt : undefined });
    items.push({ ...made, createdAt: mark.startedAt, updatedAt: mark.updatedAt });
  }
  return { version: 2, links: dedupe((data.links as unknown[]).map(link)), items, notes: [] };
}

const newer = <T extends { updatedAt: string }>(a: T | undefined, b: T): T => (!a || b.updatedAt >= a.updatedAt ? b : a);
function dedupe<T extends { id: string; updatedAt: string }>(list: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of list) byId.set(item.id, newer(byId.get(item.id), item));
  return [...byId.values()];
}

/** Validates a whole record at once: one bad item rejects the record, never half of it. */
export function libraryFrom(value: unknown): LibraryStore {
  if (!isObject(value)) return fail('The library record is not an object.');
  if (value.version === 1) return fromVersion1(value);
  if (value.version !== LIBRARY_VERSION) fail(`Unsupported library version "${String(value.version)}". The original is kept for migration.`);
  const list = (key: 'links' | 'items' | 'notes', max: number) => {
    const raw = value[key] ?? [];
    if (!Array.isArray(raw) || raw.length > max) fail(`The library holds an unreadable or oversized list of ${key}.`);
    return raw as unknown[];
  };
  return {
    version: 2,
    links: dedupe(list('links', LIBRARY_LIMITS.links).map(link)),
    items: dedupe(list('items', LIBRARY_LIMITS.items).map(entry)),
    notes: dedupe(list('notes', LIBRARY_LIMITS.notes).map(note)),
  };
}

export function parseLibrary(raw: string): LibraryStore {
  if (typeof raw !== 'string' || raw.length > LIBRARY_LIMITS.raw) fail('The library record is too large to read.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('The library record is not valid JSON.'); }
  return libraryFrom(value);
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Loading never writes, repairs or removes the saved original. */
export function loadLibrary(target?: StorageLike): { data: LibraryStore; warning: string | null; blocked: boolean } {
  const store = storage(target);
  if (!store) return { data: createLibraryStore(), warning: 'Browser storage is unavailable. Your library lasts only for this session; export a backup before closing.', blocked: false };
  let raw: string | null;
  try { raw = store.getItem(LIBRARY_STORAGE_KEY); } catch { return { data: createLibraryStore(), warning: 'Your library could not be read from this browser.', blocked: false }; }
  if (raw === null) return { data: createLibraryStore(), warning: null, blocked: false };
  try { return { data: parseLibrary(raw), warning: null, blocked: false }; } catch (error) {
    return { data: createLibraryStore(), warning: `Your library could not be loaded. ${error instanceof Error ? error.message : ''} The original is untouched and saving is blocked to protect it.`, blocked: true };
  }
}

/** The saved copy, or null when absent or unreadable. No side effects. */
export function readLibrary(target?: StorageLike): LibraryStore | null {
  try { const raw = storage(target)?.getItem(LIBRARY_STORAGE_KEY); return raw ? parseLibrary(raw) : null; } catch { return null; }
}

/** The record as storage keeps it: every held place written back as it was. */
const storedLibrary = (library: LibraryStore): LibraryStore => ({ ...library, links: library.links.map(storedLink), items: library.items.map(storedEntry) });

const versionOf = (raw: string): unknown => { try { return (JSON.parse(raw) as { version?: unknown } | null)?.version; } catch { return undefined; } };

/** Returns an error message, or null once the browser has kept it. Held places ride on a symbol key
 * (core/heldPlaces.ts) that only object spreads carry: an in-memory record copied through JSON or
 * structuredClone loses them, and saving that copy would drop every held place for good. */
export function saveLibrary(library: LibraryStore, target?: StorageLike, options: { replaceInvalid?: boolean } = {}): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Your library lasts only for this session; export a backup before closing.';
  try {
    const output = JSON.stringify(storedLibrary(libraryFrom(library)));
    if (output.length > LIBRARY_LIMITS.raw) return 'Your library has grown past what this browser can keep. Export a backup before closing.';
    const previous = store.getItem(LIBRARY_STORAGE_KEY);
    if (previous !== null) {
      let readable = true;
      try { parseLibrary(previous); } catch { readable = false; }
      if (!readable) {
        if (!options.replaceInvalid) return 'Saving your library is blocked because the existing record could not be read. The original is untouched. Export your session before closing.';
        const key = `${LIBRARY_STORAGE_KEY}.recovery.${Date.now()}`;
        store.setItem(key, previous);
        if (store.getItem(key) !== previous) return 'Could not keep a copy of the unreadable record, so nothing was replaced.';
      } else if (versionOf(previous) === 1 && store.getItem(LIBRARY_BACKUP_KEY) === null) {
        // The first version 2 save keeps the version 1 original, read back, before replacing it.
        store.setItem(LIBRARY_BACKUP_KEY, previous);
        if (store.getItem(LIBRARY_BACKUP_KEY) !== previous) return 'Could not keep a copy of your library before upgrading it, so nothing was replaced.';
      }
    }
    store.setItem(LIBRARY_STORAGE_KEY, output);
    return store.getItem(LIBRARY_STORAGE_KEY) === output ? null : 'The browser did not keep your library. Export a backup before closing.';
  } catch (error) {
    return `Your library could not be saved: ${error instanceof Error ? error.message.replace(/\.$/, '') : 'storage failed'}. Export a backup before closing.`;
  }
}

/** Two copies of one entry: the newer edit wins, and the newer lookup (cover, subjects) is kept too. */
function mergeEntry(a: LibraryEntry | undefined, b: LibraryEntry): LibraryEntry {
  if (!a) return b;
  const base = newer(a, b);
  const other = base === b ? a : b;
  if (!other.enrichedAt || (base.enrichedAt && base.enrichedAt >= other.enrichedAt)) return base;
  return {
    ...base,
    cover: other.cover ?? base.cover, subjects: other.subjects, year: base.year ?? other.year, creator: base.creator || other.creator,
    ids: { ...base.ids, ...(other.ids.ol ? { ol: other.ids.ol } : {}) },
    ...(base.placesBy === 'auto' ? { places: other.places, [HELD]: other[HELD] } : {}),
    ...(other.enrich ? { enrich: other.enrich } : {}), ...(other.enrichTries !== undefined ? { enrichTries: other.enrichTries } : {}),
    enrichedAt: other.enrichedAt,
  };
}

/** Combine two copies (another tab, an import) without losing a link, an item, a note or a removal. */
export function mergeLibraries(a: LibraryStore, b: LibraryStore): LibraryStore {
  const links = new Map(a.links.map(item => [item.id, item]));
  for (const item of b.links) links.set(item.id, newer(links.get(item.id), item));
  const items = new Map(a.items.map(item => [item.id, item]));
  for (const item of b.items) items.set(item.id, mergeEntry(items.get(item.id), item));
  const notes = new Map(a.notes.map(item => [item.id, item]));
  for (const item of b.notes) notes.set(item.id, newer(notes.get(item.id), item));
  const byTime = <T extends { createdAt: string; id: string }>(x: T, y: T) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id);
  return { version: 2, links: [...links.values()].sort(byTime), items: [...items.values()].sort(byTime), notes: [...notes.values()].sort(byTime) };
}

// --- changes -------------------------------------------------------------------------------

const newId = () => typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
/** Now, but always after `after`, so an edit in the same millisecond still counts as newer. */
export const stamp = (after?: string, now = Date.now()) => new Date(Math.max(now, after ? Date.parse(after) + 1 : 0)).toISOString();

export function saveLink(library: LibraryStore, input: { id?: string; url: string; note: string; nodeId: string | null; places?: readonly string[]; preview?: LinkPreview | null }): LibraryStore {
  const url = normalizeUrl(input.url);
  if (!url) fail('Paste a complete web address, such as https://example.org/page.');
  const note = input.note.trim().replace(/\s+/g, ' ');
  if (note.length > LIBRARY_LIMITS.note) fail(`Keep the line under ${LIBRARY_LIMITS.note} characters.`);
  if (input.nodeId && !catalog.get(input.nodeId)) fail('That map place no longer exists.');
  const existing = input.id ? library.links.find(item => item.id === input.id) : undefined;
  if (!existing && library.links.length >= LIBRARY_LIMITS.links) fail('Your library is full. Export it before saving more links.');
  const at = stamp(existing?.updatedAt);
  // A preview belongs to its address: a changed address drops the old one unless a new one came with it.
  const seen = input.preview === null ? undefined : input.preview ?? (existing?.url === url ? existing.preview : undefined);
  // Further places: the ones given, else the ones it had (an edit of its line or address keeps them).
  const given = linkMorePlaces(linkPlaceList(input.places ?? existing?.places ?? []), input.nodeId || null);
  // Held places (somewhere the atlas lacks) stay unless the learner filed it somewhere else. The same
  // places sent back as they show (a sheet that puts the first one first) are no refiling: the link
  // keeps them as it had them.
  const held = existing?.[HELD] && sameList(linkPlaces(existing), [...(input.nodeId ? [input.nodeId] : []), ...given]) ? existing[HELD] : undefined;
  const nodeId = held ? existing!.nodeId : input.nodeId || null;
  const more = held ? [...(existing!.places ?? [])] : given;
  const next: SavedLink = { id: existing?.id ?? newId(), url: url!, note, nodeId, ...(more.length ? { places: more } : {}), createdAt: existing?.createdAt ?? at, updatedAt: at, ...(seen ? { preview: preview(seen)! } : {}), ...(held ? { [HELD]: held } : {}) };
  return { ...library, links: existing ? library.links.map(item => item.id === next.id ? next : item) : [...library.links, next] };
}

export function removeLink(library: LibraryStore, id: string): LibraryStore {
  const at = (item: SavedLink) => stamp(item.updatedAt);
  return {
    ...library,
    links: library.links.map(item => item.id === id ? { ...item, removedAt: at(item), updatedAt: at(item) } : item),
    notes: library.notes.map(item => item.target === `link:${id}` && !item.removedAt ? { ...item, removedAt: stamp(item.updatedAt), updatedAt: stamp(item.updatedAt) } : item),
  };
}

export const liveLinks = (library: LibraryStore): SavedLink[] => library.links.filter(item => !item.removedAt);
export const liveItems = (library: LibraryStore): LibraryEntry[] => library.items.filter(item => !item.removedAt);
export const liveNotes = (library: LibraryStore): ItemNote[] => library.notes.filter(item => !item.removedAt);
/** Everything the learner has kept, for the export button. */
export const hasLibraryData = (library: LibraryStore) => library.links.length + library.items.length + library.notes.length > 0;

/** The library key of an entry: a shelf work keeps its shelf key, so its notes follow it. */
export const entryKey = (item: Pick<LibraryEntry, 'id' | 'ids'>): string => item.ids.shelf ? `work:${item.ids.shelf}` : `entry:${item.id}`;
export const shelfEntryOf = (library: LibraryStore, workId: string): LibraryEntry | undefined => library.items.find(item => item.ids.shelf === workId && !item.removedAt);
/** The live entry behind a library key (work:… or entry:…), if any. */
export function entryAt(library: LibraryStore, key: string): LibraryEntry | undefined {
  if (key.startsWith('work:')) return shelfEntryOf(library, key.slice(5));
  if (key.startsWith('entry:')) return library.items.find(item => item.id === key.slice(6) && !item.removedAt);
  return undefined;
}

/** Add or replace an entry by its ID. A removed entry comes back; an existing one keeps its dates and history. */
export function upsertEntry(library: LibraryStore, next: LibraryEntry, now?: string): LibraryStore {
  const existing = library.items.find(item => item.id === next.id);
  if (!existing && library.items.length >= LIBRARY_LIMITS.items) fail('Your library is full. Export it before adding more.');
  const at = stamp(existing?.updatedAt, now ? Date.parse(now) : Date.now());
  const { removedAt: _gone, ...rest } = next;
  const kept: LibraryEntry = entry({ ...rest, createdAt: existing?.createdAt ?? next.createdAt, updatedAt: at });
  return { ...library, items: existing ? library.items.map(item => item.id === next.id ? kept : item) : [...library.items, kept] };
}

/** The dates a status implies, keeping what is still true. */
function withStatus(item: LibraryEntry, status: ItemStatus, now: string): LibraryEntry {
  const { startedAt, finishedAt, ...rest } = item;
  const begun = item.status === 'started' || item.status === 'finished' || item.status === 'stopped' ? startedAt : undefined;
  switch (status) {
    case 'want': return { ...rest, status };
    case 'started': return { ...rest, status, startedAt: begun ?? now };
    case 'finished': return { ...rest, status, ...(startedAt ? { startedAt } : {}), finishedAt: item.status === 'finished' && finishedAt ? finishedAt : now };
    case 'stopped': return { ...rest, status, ...(startedAt ? { startedAt } : {}) };
  }
}

/** Set an entry's status (and the dates that go with it). For a shelf work's key, null takes it off the list. */
export function setStatus(library: LibraryStore, key: string, status: ItemStatus | null, now = new Date().toISOString()): LibraryStore {
  const current = entryAt(library, key);
  if (key.startsWith('work:') && !current) {
    const work = shelfWork(key.slice(5));
    if (!work) return fail('That book is no longer on the shelf.');
    if (!status) return library;
    return upsertEntry(library, withStatus({ ...shelfEntry(work, 'want', now), addedAt: now, createdAt: now }, status, now), now);
  }
  if (!current) return fail('That item is no longer in your library.');
  if (!status) return removeEntry(library, current.id, now);
  return upsertEntry(library, withStatus(current, status, now), now);
}

/** The row's one-tap step: want → started → finished. A finished or stopped item stays as it is. */
export const nextStatus = (status: ItemStatus | null): ItemStatus | null => status === null ? 'started' : status === 'want' ? 'started' : status === 'started' ? 'finished' : null;

/** The hub's shelf button: not on the list → started → finished → off the list. */
export function cycleReading(library: LibraryStore, workId: string, now = new Date().toISOString()): LibraryStore {
  const current = shelfEntryOf(library, workId);
  const key = `work:${workId}`;
  if (!current) return setStatus(library, key, 'started', now);
  if (current.status === 'want' || current.status === 'stopped') return setStatus(library, key, 'started', now);
  if (current.status === 'started') return setStatus(library, key, 'finished', now);
  return setStatus(library, key, null, now);
}

/** Take an entry off the list. Its own notes go with it; notes on a shelf work stay with the shelf work. */
export function removeEntry(library: LibraryStore, id: string, now?: string): LibraryStore {
  const target = library.items.find(item => item.id === id);
  if (!target) return library;
  const key = target.ids.shelf ? null : entryKey(target);
  const gone = <T extends { updatedAt: string }>(item: T): T => { const at = stamp(item.updatedAt, now ? Date.parse(now) : Date.now()); return { ...item, removedAt: at, updatedAt: at }; };
  return {
    ...library,
    items: library.items.map(item => item.id === id ? gone(item) : item),
    notes: key ? library.notes.map(item => item.target === key && !item.removedAt ? gone(item) : item) : library.notes,
  };
}

/** The learner's own places for an entry: chosen by hand, so new evidence never moves them. Empty clears them. */
export function setPlaces(library: LibraryStore, id: string, nodeIds: readonly string[], now?: string): LibraryStore {
  const current = library.items.find(item => item.id === id && !item.removedAt);
  if (!current) return fail('That item is no longer in your library.');
  const unique = [...new Set(nodeIds)].slice(0, LIBRARY_LIMITS.chosenPlaces);
  if (unique.some(nodeId => !catalog.get(nodeId))) fail('That map place no longer exists.');
  return upsertEntry(library, { ...current, places: unique.map(nodeId => ({ nodeId, score: 1 })), placesBy: 'you' }, now);
}

export function addNote(library: LibraryStore, input: { target: string; kind: 'quote' | 'note'; text: string; where?: string; id?: string }, now = new Date().toISOString()): LibraryStore {
  const text = input.text.trim();
  if (!text) fail('Write the passage or the thought first.');
  if (text.length > LIBRARY_LIMITS.noteText) fail(`Keep it under ${LIBRARY_LIMITS.noteText} characters.`);
  const existing = input.id ? library.notes.find(item => item.id === input.id) : undefined;
  if (!existing && library.notes.length >= LIBRARY_LIMITS.notes) fail('Your library is full. Export it before keeping more.');
  const where = input.where?.trim().slice(0, LIBRARY_LIMITS.where);
  const at = existing ? stamp(existing.updatedAt) : now;
  const next = note({ id: existing?.id ?? input.id ?? newId(), target: input.target, kind: input.kind, text, ...(where ? { where } : {}), createdAt: existing?.createdAt ?? now, updatedAt: at });
  return { ...library, notes: existing ? library.notes.map(item => item.id === next.id ? next : item) : [...library.notes, next] };
}

export function removeNote(library: LibraryStore, id: string): LibraryStore {
  return { ...library, notes: library.notes.map(item => item.id === id ? { ...item, removedAt: stamp(item.updatedAt), updatedAt: stamp(item.updatedAt) } : item) };
}

export const notesFor = (library: LibraryStore, target: string): ItemNote[] => library.notes.filter(item => item.target === target && !item.removedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

/** The shelf works on the learner's list as the hub reads them (version 1's shape). */
export function shelfReading(library: LibraryStore): Record<string, ReadingMark> {
  const out: Record<string, ReadingMark> = {};
  for (const item of liveItems(library)) {
    if (!item.ids.shelf || (item.status !== 'started' && item.status !== 'finished')) continue;
    out[item.ids.shelf] = { state: item.status, startedAt: item.startedAt ?? item.addedAt, updatedAt: item.updatedAt, ...(item.status === 'finished' && item.finishedAt ? { finishedAt: item.finishedAt } : {}) };
  }
  return out;
}

// --- backup files --------------------------------------------------------------------------

/** A backup file: the notebook, plus the library when there is one. Older builds read only `version`
 * and `entries` (and `links` and `reading`, which are written for them too), so the file still imports there. */
export function withLibrary<T extends object>(notebookFile: T, library: LibraryStore): T & { libraryVersion?: 2; links?: readonly SavedLink[]; items?: readonly LibraryEntry[]; notes?: readonly ItemNote[]; reading?: Record<string, ReadingMark> } {
  if (!hasLibraryData(library)) return { ...notebookFile };
  const reading = shelfReading(library);
  const stored = storedLibrary(library);
  return { ...notebookFile, libraryVersion: 2, links: stored.links, items: stored.items, notes: stored.notes, ...(Object.keys(reading).length ? { reading } : {}) };
}

/** The library part of a backup file, or null when it has none. Throws on a malformed one. */
export function libraryInFile(raw: string): LibraryStore | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isObject(value)) return null;
  // A version 2 file carries its items and notes; its `reading` is only a copy for older builds.
  if (value.items !== undefined || value.notes !== undefined || value.libraryVersion === 2) {
    return libraryFrom({ version: 2, links: value.links ?? [], items: value.items ?? [], notes: value.notes ?? [] });
  }
  if (value.links === undefined && value.reading === undefined) return null;
  return libraryFrom({ version: 1, links: value.links ?? [], reading: value.reading ?? {} });
}
