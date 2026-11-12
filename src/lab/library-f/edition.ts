import { catalog, type AtlasNode } from '../../core/catalog';
import { PACK_PLACES } from '../../expeditions/manifest';
import { within, type PlaceStatus } from '../../notebook/journal';
import type { Collection } from '../library-c/collections';
import { areaOf, UNPLACED, type Piece } from '../library-c/mosaic';

/*
 * The Edition: the Library set as an issue of a magazine. Pure: the learner's pieces (library-c's
 * piecesOf), their places' proof and what they have begun go in; the issue comes out.
 *
 * Nothing on the page moves by itself. Sections always stand in the atlas's own order. One rule says
 * which fields have a section in this issue: the six touched most recently, among those touched within
 * two weeks of the learner's latest step anywhere (so coming back after a month opens the same issue
 * that was left). A field only joins or leaves the issue; the rest wait at the back. Every section is
 * cut from one template. The cover story is the learner's newest question, while it is fresh. The index
 * follows the atlas itself (subject, field, place), so nothing the learner adds ever reshapes it, and a
 * page for any field or place holds everything inside it.
 */

export const LATELY_DAYS = 14;
/** The most sections one issue holds. */
export const SECTIONS_MAX = 6;
const DAY = 864e5;
const daysBefore = (iso: string, days: number) => (iso ? new Date(Date.parse(iso) - days * DAY).toISOString() : '');
/** A step dated after `now` (a clock that ran ahead, a mistyped date read) counts as taken now: it never
 * moves the issue's two weeks into the future, so it never empties the issue. */
const notAfter = (iso: string, now: number) => (iso && Date.parse(iso) > now ? new Date(now).toISOString() : iso);

// --- order -----------------------------------------------------------------------------------

let ORDER: Map<string, number> | null = null;
/** A node's place in the atlas's own order: depth first, each level as the atlas lists it. */
export function atlasRank(id: string): number {
  if (!ORDER) {
    const order = new Map<string, number>();
    const walk = (node: AtlasNode) => { order.set(node.id, order.size); for (const child of catalog.getChildren(node)) walk(child); };
    walk(catalog.root);
    ORDER = order;
  }
  return ORDER.get(id) ?? Number.MAX_SAFE_INTEGER;
}
const byAtlas = (a: string, b: string) => atlasRank(a) - atlasRank(b) || a.localeCompare(b);

export const nameOf = (id: string) => id === UNPLACED ? 'Not placed yet' : catalog.get(id)?.name ?? id;
/** What a field or place sits in, from its subject down: "Science · Biology". */
export function pathOf(id: string, from = 1): string {
  const node = catalog.get(id);
  if (!node) return '';
  return catalog.getPath(node).slice(from, -1).map(n => n.name).join(' · ');
}

// --- pieces ----------------------------------------------------------------------------------

export const newest = (a: Piece, b: Piece) => b.lastAt.localeCompare(a.lastAt) || b.at.localeCompare(a.at) || a.title.localeCompare(b.title);
/** A picture fit to lead a block: a reel's still, a video's frame or a page's own image. */
export const pictured = (p: Piece) => (p.kind === 'reel' || p.kind === 'video' || p.kind === 'link') && !!p.image;
export const isWork = (p: Piece) => p.kind === 'book' || p.kind === 'film';
export const isNote = (p: Piece) => p.kind === 'idea' || p.kind === 'question';
/** Where a piece was kept: its first place (never the atlas's root). */
export const placeOf = (p: Piece): string | null => { const id = p.nodeIds[0]; const node = id ? catalog.get(id) : undefined; return node && node.depth > 0 ? node.id : null; };
/** Whether a piece is kept at a place or anywhere inside it; for UNPLACED, whether it is kept nowhere. */
export const keptIn = (p: Piece, id: string) => { const at = placeOf(p); return id === UNPLACED ? !at : !!at && within(at, id); };

/** A book or film's own status, as the library keeps it. */
export const workStatus = (p: Piece) => (p.item.kind === 'work' ? p.item.work.status ?? 'want' : null);
const READING_ORDER = { started: 0, want: 1, finished: 2, stopped: 3 } as const;

// --- standing: what is proved, due and begun ----------------------------------------------------

export interface Standing {
  /** Proved places whose refresh is due, in atlas order. */
  readonly ready: readonly string[];
  /** Proved places not due. */
  readonly proved: readonly string[];
  /** Places begun (a lesson run, a check taken) and not proved yet. */
  readonly begun: readonly string[];
}

/** What is proved, due and begun inside a scope: a place and everything in it, or (with `member`) the places a field holds. */
export function standingIn(scope: string, status: ReadonlyMap<string, PlaceStatus>, begun: ReadonlySet<string>, member: (nodeId: string) => boolean = nodeId => within(nodeId, scope)): Standing {
  if (scope === UNPLACED) return { ready: [], proved: [], begun: [] };
  const lit = [...status.values()].filter(s => !!s.litAt && member(s.nodeId) && catalog.get(s.nodeId));
  return {
    ready: lit.filter(s => s.ready).map(s => s.nodeId).sort(byAtlas),
    proved: lit.filter(s => !s.ready).map(s => s.nodeId).sort(byAtlas),
    begun: [...begun].filter(id => member(id) && !status.get(id)?.litAt && catalog.get(id)).sort(byAtlas),
  };
}
export const hasStanding = (s: Standing) => s.ready.length + s.proved.length + s.begun.length > 0;

// --- fields and pages ------------------------------------------------------------------------

/** A field or a place, and everything kept in it (and inside it), newest first. */
export interface Shelf {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly pieces: readonly Piece[];
  readonly standing: Standing;
  /** The learner's latest step here: a thing kept, begun or finished, a lesson run, a check taken. */
  readonly lastAt: string;
}
/** A field as the issue cuts its sections: library-c's split, so a busy region gives a section to each of its fields. */
export type Field = Shelf;

export interface EditionInput {
  readonly pieces: readonly Piece[];
  readonly status: ReadonlyMap<string, PlaceStatus>;
  readonly begun: ReadonlySet<string>;
  /** Regions split into their fields (library-c's splitRegions over what the learner touched). Sections only. */
  readonly split: ReadonlySet<string>;
  /** When the learner last did something at a place: lessons run and checks taken. */
  readonly activity?: ReadonlyMap<string, string>;
}

/** The field a place belongs to: its region, or the region's field once the learner has touched two fields there. */
export const fieldIdOf = (nodeId: string | null, split: ReadonlySet<string>): string => (nodeId ? areaOf(nodeId, split) ?? UNPLACED : UNPLACED);

const latest = (...times: (string | null | undefined)[]) => times.filter((t): t is string => !!t).sort().at(-1) ?? '';

/** A shelf's things. As a field it holds what its places hold, and no more: a region kept as a field of its own
 * (something kept on Physics itself) never also holds what its split fields (Mechanics) hold. */
function shelfAt(id: string, pieces: readonly Piece[], input: EditionInput, asField = false): Shelf {
  const inside = (nodeId: string) => id !== UNPLACED && (asField ? fieldIdOf(nodeId, input.split) === id : within(nodeId, id));
  const held = id === UNPLACED ? pieces.filter(p => !placeOf(p)) : pieces.filter(p => { const at = placeOf(p); return !!at && inside(at); });
  const proof = [...input.status.values()].filter(s => inside(s.nodeId)).flatMap(s => [s.litAt, s.lastingAt]);
  const ran = [...(input.activity ?? new Map<string, string>())].filter(([nodeId]) => inside(nodeId)).map(([, at]) => at);
  return {
    id, name: nameOf(id), path: id === UNPLACED ? '' : pathOf(id), pieces: [...held].sort(newest),
    standing: standingIn(id, input.status, input.begun, inside),
    lastAt: latest(...held.map(p => p.lastAt), ...held.map(p => p.at), ...proof, ...ran),
  };
}

/** Every field the learner has: by a thing kept there, or a place proved or begun there. Atlas order, unplaced last. */
export function fieldsOf(input: EditionInput): Field[] {
  const ids = new Set<string>();
  for (const p of input.pieces) ids.add(fieldIdOf(placeOf(p), input.split));
  for (const s of input.status.values()) if (s.litAt && catalog.get(s.nodeId)) ids.add(fieldIdOf(s.nodeId, input.split));
  for (const id of input.begun) if (catalog.get(id)) ids.add(fieldIdOf(id, input.split));
  return [...ids].sort(byAtlas).map(id => shelfAt(id, input.pieces, input, true));
}

/** The page of any subject, field or place: everything kept in it or inside it, and what is proved and begun
 * there. Null when the learner has nothing there. */
export function pageOf(id: string, input: EditionInput): Shelf | null {
  if (id !== UNPLACED && !catalog.get(id)) return null;
  const shelf = shelfAt(id, input.pieces, input);
  return shelf.pieces.length || hasStanding(shelf.standing) ? shelf : null;
}

/** How a page sets out its things: a subject's or a region's under each field in it, a field's or a place's
 * under each place in it; what is kept on the page's own place first, the rest in atlas order. */
export function groupsOf(shelf: Shelf): { id: string; pieces: Piece[] }[] {
  const node = shelf.id === UNPLACED ? undefined : catalog.get(shelf.id);
  const keyOf = (p: Piece): string => {
    const at = placeOf(p);
    if (!at || !node) return shelf.id;
    if (node.depth >= 3) return at;
    const path = catalog.getPath(catalog.get(at)!);
    return path[Math.min(3, path.length - 1)].id;
  };
  const groups = new Map<string, Piece[]>();
  for (const p of shelf.pieces) { const key = keyOf(p); const list = groups.get(key); if (list) list.push(p); else groups.set(key, [p]); }
  return [...groups].sort(([a], [b]) => byAtlas(a, b)).map(([id, pieces]) => ({ id, pieces }));
}

// --- the issue -------------------------------------------------------------------------------

/** The cover story: the learner's newest question (or, with none fresh, the newest thing kept), a picture from its place, and a few things beside it. */
export interface Lead {
  readonly head: Piece;
  readonly picture: Piece | null;
  readonly story: readonly Piece[];
  /** The place it is about, or null for something not placed. */
  readonly placeId: string | null;
  readonly fieldId: string;
}

/** Which picture leads: a reel's still, a page's own image, a cover, and a video's frame only when nothing else has a picture
 * (a frame is cut for a feed, often with its own words burned in). */
const PICTURE_RANK: Record<Piece['kind'], number> = { reel: 0, link: 1, book: 2, film: 2, video: 3, idea: 9, question: 9 };
const canPicture = (p: Piece) => !!p.image && PICTURE_RANK[p.kind] < 9;
const bestPicture = (list: readonly Piece[]) => [...list].filter(canPicture).sort((a, b) => PICTURE_RANK[a.kind] - PICTURE_RANK[b.kind] || newest(a, b))[0];

/** `now`: a step dated later counts as taken now. */
export function leadOf(pieces: readonly Piece[], split: ReadonlySet<string>, now = Infinity): Lead | null {
  if (!pieces.length) return null;
  const last = (p: Piece) => notAfter(p.lastAt, now);
  // A question leads while it is fresh: asked within two weeks of the learner's latest step.
  const since = daysBefore(pieces.reduce((m, p) => (last(p) > m ? last(p) : m), ''), LATELY_DAYS);
  const questions = pieces.filter(p => p.kind === 'question' && p.at >= since).sort((a, b) => b.at.localeCompare(a.at) || a.title.localeCompare(b.title));
  const head = questions[0] ?? [...pieces].sort((a, b) => last(b).localeCompare(last(a)) || newest(a, b))[0];
  const placeId = placeOf(head);
  const fieldId = fieldIdOf(placeId, split);
  const near = (p: Piece) => p !== head && (placeId ? placeOf(p) === placeId : !placeOf(p));
  const sameField = (p: Piece) => p !== head && fieldIdOf(placeOf(p), split) === fieldId;
  const picture = canPicture(head) ? head : bestPicture(pieces.filter(near)) ?? (fieldId !== UNPLACED ? bestPicture(pieces.filter(sameField)) : undefined) ?? null;
  // Beside it, the place's books, films and reels: things that stand as covers (a video's frame cut to a cover loses its words).
  const story = pieces.filter(p => near(p) && p !== picture && (isWork(p) || p.kind === 'reel')).sort((a, b) => Number(isWork(b)) - Number(isWork(a)) || newest(a, b)).slice(0, 3);
  return { head, picture, story, placeId, fieldId };
}

/** One section of the issue: the same template for every field. */
export interface Section {
  readonly field: Field;
  readonly feature: Piece | null;
  readonly quote: Piece | null;
  readonly briefs: readonly Piece[];
  readonly reading: readonly Piece[];
  readonly question: Piece | null;
  /** Pieces of the field not on the page. */
  readonly more: number;
}

export interface Caps { readonly briefs: number; readonly reading: number }
export const PHONE_CAPS: Caps = { briefs: 2, reading: 3 };
export const DESK_CAPS: Caps = { briefs: 3, reading: 5 };

export function sectionOf(field: Field, used: Set<string>, caps: Caps): Section {
  const free = field.pieces.filter(p => !used.has(p.key));
  const take = <T extends Piece | undefined>(p: T): T => { if (p) used.add(p.key); return p; };
  const feature = take(bestPicture(free)) ?? null;
  const quote = take(free.find(p => p.kind === 'idea')) ?? null;
  const briefs = free.filter(p => !used.has(p.key) && (p.kind === 'reel' || p.kind === 'video' || p.kind === 'link')).slice(0, caps.briefs).map(take);
  const reading = free.filter(p => !used.has(p.key) && isWork(p))
    .sort((a, b) => READING_ORDER[workStatus(a) ?? 'want'] - READING_ORDER[workStatus(b) ?? 'want'] || newest(a, b)).slice(0, caps.reading).map(take);
  const question = take(free.find(p => p.kind === 'question' && !used.has(p.key))) ?? null;
  return { field, feature, quote, briefs, reading, question, more: free.length - shownIn({ feature, quote, question, briefs, reading }) };
}
/** How many pieces a section prints. */
export const shownIn = (s: Pick<Section, 'feature' | 'quote' | 'question' | 'briefs' | 'reading'>) => [s.feature, s.quote, s.question].filter(Boolean).length + s.briefs.length + s.reading.length;
export const sectionIsEmpty = (s: Section) => !s.feature && !s.quote && !s.briefs.length && !s.reading.length && !s.question && !hasStanding(s.field.standing);

export interface Issue {
  readonly lead: Lead | null;
  /** At most SECTIONS_MAX fields, the ones touched most recently lately, in atlas order. */
  readonly sections: readonly Section[];
  /** The other fields, at the back, in atlas order. */
  readonly back: readonly Field[];
  /** Every proved place whose refresh is due, in atlas order. */
  readonly ready: readonly string[];
}

/** `now`: a step dated later counts as taken now. */
export function issueOf(fields: readonly Field[], pieces: readonly Piece[], split: ReadonlySet<string>, caps: Caps, now = Infinity): Issue {
  const lead = leadOf(pieces, split, now);
  const used = new Set<string>(lead ? [lead.head, lead.picture, ...lead.story].filter((p): p is Piece => !!p).map(p => p.key) : []);
  const last = (f: Field) => notAfter(f.lastAt, now);
  const since = daysBefore(fields.reduce((m, f) => (last(f) > m ? last(f) : m), ''), LATELY_DAYS);
  // Chosen by how recently each was touched (fields share no pieces, so the order they are cut in changes nothing); shown in atlas order.
  const built = fields.filter(f => f.lastAt && last(f) >= since)
    .sort((a, b) => last(b).localeCompare(last(a)) || byAtlas(a.id, b.id))
    .map(f => sectionOf(f, used, caps));
  // A field whose every piece is in the cover story is covered by it, so it waits nowhere.
  const covered = new Set(built.filter(sectionIsEmpty).map(s => s.field.id));
  const sections = built.filter(s => !sectionIsEmpty(s)).slice(0, SECTIONS_MAX).sort((a, b) => byAtlas(a.field.id, b.field.id));
  const inIssue = new Set(sections.map(s => s.field.id));
  return {
    lead, sections, back: fields.filter(f => !inIssue.has(f.id) && !covered.has(f.id)),
    ready: [...new Set(fields.flatMap(f => f.standing.ready))].sort(byAtlas),
  };
}

// --- the index: the atlas's own hierarchy ------------------------------------------------------

export type StandingWord = 'ready' | 'proved' | 'begun';
export interface IndexRow {
  readonly id: string;
  readonly name: string;
  /** 0 a subject's field (Physics, Biology), 1 a field inside it (Mechanics), 2 and on the places inside that. */
  readonly level: number;
  /** Things kept there and inside it. */
  readonly count: number;
  /** The place's own proof, for one that holds nothing. */
  readonly standing: StandingWord | null;
}
export interface IndexGroup { readonly id: string; readonly name: string; readonly count: number; readonly rows: readonly IndexRow[] }

/** How many things are kept at each place and everything above it. */
export function countsOf(pieces: readonly Piece[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of pieces) {
    const at = placeOf(p);
    const ids = at ? catalog.getPath(catalog.get(at)!).slice(1).map(n => n.id) : [UNPLACED];
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * The index: every subject the learner has, in atlas order; under each its fields (Physics), the fields inside
 * those (Mechanics) and every place inside them that holds something or is proved or begun, nested as the atlas
 * nests them. With `only` (the fields at the back of the issue), just those fields under their subjects.
 */
export function indexOf(input: EditionInput, only?: ReadonlySet<string>): IndexGroup[] {
  const counts = countsOf(input.pieces);
  const held = new Set<string>(only ?? []);
  if (!only) {
    for (const p of input.pieces) held.add(placeOf(p) ?? UNPLACED);
    for (const s of input.status.values()) if (s.litAt) held.add(s.nodeId);
    for (const id of input.begun) held.add(id);
  }
  const groups = new Set<string>();
  const rows = new Set<string>();
  for (const id of held) {
    if (id === UNPLACED) { groups.add(UNPLACED); continue; }
    const node = catalog.get(id);
    if (!node || node.depth === 0) continue;
    const path = catalog.getPath(node);
    groups.add(path[1].id);
    if (path[2]) rows.add(path[2].id);
    if (path[3]) rows.add(path[3].id);
    if (!only && node.depth >= 4) rows.add(node.id);
  }
  const levelOf = (id: string) => {
    const node = catalog.get(id)!;
    return node.depth <= 3 ? node.depth - 2 : 2 + catalog.getPath(node).slice(4, -1).filter(n => rows.has(n.id)).length;
  };
  const standingOf = (id: string): StandingWord | null => { const s = input.status.get(id); return s?.litAt ? (s.ready ? 'ready' : 'proved') : input.begun.has(id) ? 'begun' : null; };
  const sortedRows = [...rows].sort(byAtlas);
  return [...groups].sort(byAtlas).map(id => ({
    id, name: nameOf(id), count: counts.get(id) ?? 0,
    rows: id === UNPLACED ? [] : sortedRows.filter(row => within(row, id)).map(row => ({ id: row, name: nameOf(row), level: levelOf(row), count: counts.get(row) ?? 0, standing: standingOf(row) })),
  }));
}

// --- proof: what a place's name opens ---------------------------------------------------------

export type Step = { kind: 'refresh' | 'case'; nodeId: string } | { kind: 'lesson'; nodeId: string; packId: string } | { kind: 'atlas'; nodeId: string };
const packAt = (nodeId: string) => PACK_PLACES.find(p => p.nodeId === nodeId)?.packId;

/** What tapping a place in a standing line does: a due refresh, a begun place's next case (or its lesson
 * again when no case is left), a proved place shown on the atlas. */
export function stepFor(nodeId: string, standing: 'ready' | 'begun' | 'proved', hasCase: (nodeId: string) => boolean): Step {
  if (standing === 'ready') return { kind: 'refresh', nodeId };
  if (standing === 'proved') return { kind: 'atlas', nodeId };
  if (hasCase(nodeId)) return { kind: 'case', nodeId };
  const packId = packAt(nodeId);
  return packId ? { kind: 'lesson', nodeId, packId } : { kind: 'case', nodeId };
}

// --- search: word prefix, titles first, whole words first ----------------------------------------

/** Lowercase words: runs of letters and digits. */
export const wordsOf = (text: string): string[] => text.toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** How a query meets some words: 0 not at all, 1 every query word starts a word, 2 every query word is a whole word. */
export function hitOf(query: readonly string[], words: readonly string[]): 0 | 1 | 2 {
  if (!query.length) return 0;
  let whole = true;
  for (const q of query) {
    if (words.includes(q)) continue;
    if (!words.some(w => w.startsWith(q))) return 0;
    whole = false;
  }
  return whole ? 2 : 1;
}
/** Whether any of the query's words begins a word of the text. */
const touches = (text: string, query: readonly string[]) => !!text && wordsOf(text).some(w => query.some(q => w.startsWith(q)));

export interface PieceHit { readonly piece: Piece; readonly hit: 1 | 2; readonly inTitle: 0 | 1 | 2 }
export interface PlaceHit { readonly id: string; readonly name: string; readonly path: string; readonly count: number; readonly hit: 1 | 2 }
export interface CollectionHit { readonly collection: Collection; readonly hit: 1 | 2 }
export interface Found { readonly places: readonly PlaceHit[]; readonly collections: readonly CollectionHit[]; readonly pieces: readonly PieceHit[]; readonly total: number }

const wordCache = new WeakMap<Piece, { title: string[]; all: string[] }>();
const pieceWords = (p: Piece) => {
  let words = wordCache.get(p);
  if (!words) { const title = wordsOf(p.title); words = { title, all: [...title, ...wordsOf(`${p.byline} ${p.text}`)] }; wordCache.set(p, words); }
  return words;
};

export function searchEdition(query: string, pieces: readonly Piece[], index: readonly IndexGroup[], collections: readonly Collection[]): Found {
  const q = wordsOf(query);
  if (!q.length) return { places: [], collections: [], pieces: [], total: 0 };
  const places: PlaceHit[] = [];
  const seen = new Set<string>();
  for (const entry of index.flatMap(group => [group, ...group.rows])) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const hit = hitOf(q, wordsOf(entry.name));
    if (hit) places.push({ id: entry.id, name: entry.name, path: entry.id === UNPLACED ? '' : pathOf(entry.id), count: entry.count, hit });
  }
  places.sort((a, b) => b.hit - a.hit || b.count - a.count || byAtlas(a.id, b.id));
  const kept = collections.map(collection => ({ collection, hit: hitOf(q, wordsOf(collection.name)) })).filter((c): c is CollectionHit => c.hit > 0).sort((a, b) => b.hit - a.hit || a.collection.name.localeCompare(b.collection.name));
  const found: PieceHit[] = [];
  for (const piece of pieces) {
    const words = pieceWords(piece);
    const hit = hitOf(q, words.all);
    if (hit) found.push({ piece, hit, inTitle: hitOf(q, words.title) });
  }
  // The title's own words first (whole, then begun); then a match only in its maker, place or text (whole, then begun); then newest.
  found.sort((a, b) => b.inTitle - a.inTitle || b.hit - a.hit || newest(a.piece, b.piece));
  return { places, collections: kept, pieces: found, total: places.length + kept.length + found.length };
}

/** What else was searched in a piece, past its title, maker and place: other places, a page's description, a reel's
 * subject, a note's own words and source, and the rest of what was kept with it. */
function detailsOf(p: Piece): string[] {
  const item = p.item;
  const list = [p.nodeIds.slice(1).map(id => catalog.get(id)?.name ?? '').filter(Boolean).join(', ')];
  if (item.kind === 'link') list.push(item.link.preview?.description ?? '', item.link.preview?.siteName ?? '');
  else if (item.kind === 'reel') list.push(item.reel.about ?? '');
  else if (item.kind === 'idea' || item.kind === 'question') list.push(item.entry.body, item.entry.sourceLabel);
  else if (item.kind === 'work') list.push((item.work.entry?.subjects ?? []).join(', '), item.work.format);
  list.push(item.text);
  return list;
}

/** A few words of a text around the first word a query's word begins, cut at word breaks. */
export function excerptOf(text: string, query: readonly string[], room = 96): string | null {
  const flat = text.replace(/\s+/g, ' ').trim();
  const re = /[\p{L}\p{N}]+/gu;
  for (let m = re.exec(flat); m; m = re.exec(flat)) {
    const word = wordsOf(m[0])[0] ?? '';
    if (!query.some(q => word.startsWith(q))) continue;
    let from = Math.max(0, m.index - 32);
    if (from > 0) { const space = flat.indexOf(' ', from); from = space >= 0 && space < m.index ? space + 1 : m.index; }
    let to = Math.min(flat.length, from + room);
    if (to < flat.length) { const space = flat.lastIndexOf(' ', to); if (space > m.index + m[0].length) to = space; }
    return `${from > 0 ? '…' : ''}${flat.slice(from, to)}${to < flat.length ? '…' : ''}`;
  }
  return null;
}

/** Why a found piece was found, when its title, maker and place (`shown`, as its row prints them) do not say: a few
 * words of the text that matched. Null when the row already shows it. */
export function whyOf(piece: Piece, query: string, shown: readonly string[]): string | null {
  const q = wordsOf(query);
  if (!q.length || [piece.title, ...shown].some(text => touches(text, q))) return null;
  for (const text of detailsOf(piece)) { const excerpt = excerptOf(text, q); if (excerpt) return excerpt; }
  return null;
}

/** A text cut where the query's words begin words in it, for marking. */
export function markParts(text: string, query: string): { text: string; mark: boolean }[] {
  const q = wordsOf(query);
  if (!q.length) return [{ text, mark: false }];
  const out: { text: string; mark: boolean }[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const word = wordsOf(m[0])[0] ?? '';
    const best = q.filter(w => word.startsWith(w)).sort((a, b) => b.length - a.length)[0];
    if (!best) continue;
    // The marked span covers as many letters of the original as the query word has once folded.
    let length = 0;
    while (length < m[0].length && (wordsOf(m[0].slice(0, length))[0] ?? '').length < best.length) length++;
    if (m.index > at) out.push({ text: text.slice(at, m.index), mark: false });
    out.push({ text: text.slice(m.index, m.index + length), mark: true });
    at = m.index + length;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false });
  return out;
}

// --- collections -----------------------------------------------------------------------------

/** Collections in the order they were made, newest first: editing one never moves it. */
export const collectionOrder = (list: readonly Collection[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name));
