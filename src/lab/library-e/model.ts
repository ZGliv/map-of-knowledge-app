import { catalog } from '../../core/catalog';
import type { CheckStatus } from '../../checks/progress';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import { packPlace } from '../../expeditions/manifest';
import { within, type PlaceStatus } from '../../notebook/journal';
import { commonPlace, type Piece } from '../library-c/mosaic';

/*
 * "Your Library": the learner's things as a music app keeps its library. Kind chips, a shelf of
 * places and collections, one list sorted Recent or A–Z, and an index of places by subject and
 * field. Pure: the pieces (library-c/mosaic.ts piecesOf, from the real records), the places' proof
 * (notebook/journal.ts) and what was begun (the ledgers) go in; chips, places with whole counts,
 * orders, search hits and the one thing a place offers to do come out.
 *
 * A count is always everything kept at a place and anywhere inside it, so a place never reads as
 * holding less than the places it contains.
 */

// --- kinds -------------------------------------------------------------------------------------

export type Chip = 'video' | 'reel' | 'book' | 'film' | 'podcast' | 'course' | 'link' | 'note' | 'proved';
const CHIP_ORDER: readonly Chip[] = ['video', 'reel', 'book', 'film', 'podcast', 'course', 'link', 'note', 'proved'];
export const CHIP_WORD: Record<Chip, string> = {
  video: 'Videos', reel: 'Reels', book: 'Books', film: 'Films', podcast: 'Podcasts', course: 'Courses', link: 'Links', note: 'Notes', proved: 'Proved',
};

/** The chip a piece files under: notes and questions are both Notes; films, series and documentaries are Films. */
export function chipOf(piece: Piece): Exclude<Chip, 'proved'> {
  if (piece.kind === 'idea' || piece.kind === 'question') return 'note';
  if (piece.item.kind === 'work' && piece.kind === 'film') {
    const kind = piece.item.work.kind;
    return kind === 'podcast' ? 'podcast' : kind === 'course' ? 'course' : 'film';
  }
  return piece.kind === 'film' ? 'film' : piece.kind;
}

/** The chips worth showing: only kinds the learner has, and Proved once a place is proved. */
export function chipsFor(pieces: readonly Piece[], proved: number): Chip[] {
  const have = new Set<Chip>(pieces.map(chipOf));
  if (proved > 0) have.add('proved');
  return CHIP_ORDER.filter(chip => have.has(chip));
}

/** What a piece is, in a word: the work's own format for a film, series or podcast. */
export function kindWord(piece: Piece): string {
  if (piece.item.kind === 'work' && piece.kind === 'film') return piece.item.work.format;
  return { book: 'Book', film: 'Film', video: 'Video', reel: 'Reel', link: 'Link', idea: 'Note', question: 'Question' }[piece.kind];
}

/** Who made it: an author, a director, a channel, a site. Nothing for a reel or a note. */
export function bylineOf(piece: Piece): string {
  if (piece.item.kind === 'work') return piece.item.work.creator;
  if (piece.kind === 'video' || piece.kind === 'link') return piece.byline;
  return '';
}

/** How far it got, in a word, or nothing while it is only saved (and a link or a note has no steps).
 * A book or film the learner set down reads Stopped, however far it got: the stage has no stop. */
export function stepWord(piece: Piece): string {
  if (piece.item.kind === 'work' && piece.item.work.status === 'stopped') return 'Stopped';
  const stage = piece.stage === 'proved' ? 'finished' : piece.stage;
  if (stage === 'saved') return '';
  const listen = piece.item.kind === 'work' && piece.item.work.kind === 'podcast';
  switch (piece.kind) {
    case 'book': return stage === 'started' ? 'Reading' : 'Read';
    case 'film': return listen ? (stage === 'started' ? 'Listening' : 'Listened') : stage === 'started' ? 'Watching' : 'Watched';
    case 'video': case 'reel': return 'Watched';
    default: return '';
  }
}

// --- orders ------------------------------------------------------------------------------------

/** Recent: the last thing done with it, newest first. */
export const byRecent = (a: Piece, b: Piece) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0) || byTitle(a, b);

const plain = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
/** A title as a shelf files it: no leading article or punctuation ("The Selfish Gene" under S). */
export const sortKey = (title: string) => plain(title).replace(/^[^\p{L}\p{N}]+/u, '').replace(/^(the|a|an)\s+/u, '').replace(/^[^\p{L}\p{N}]+/u, '');
// An A–Z of a few hundred titles compares each one many times: its key is worked out once, and one
// collator does every comparison (a comparison that names its options builds a new one each time).
const keys = new Map<string, string>();
const keyOf = (title: string) => {
  let key = keys.get(title);
  if (key === undefined) { if (keys.size > 4000) keys.clear(); key = sortKey(title); keys.set(title, key); }
  return key;
};
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const byTitle = <T extends { title: string }>(a: T, b: T) => collator.compare(keyOf(a.title), keyOf(b.title)) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);
/** The letter a title is filed under; a number or a sign files under #. */
export const letterOf = (title: string) => { const first = keyOf(title).charAt(0).toLocaleUpperCase(); return /\p{L}/u.test(first) ? first : '#'; };

/** A–Z with a letter over each run of titles. */
export function lettered<T extends { title: string }>(list: readonly T[]): { letter: string; items: T[] }[] {
  const out: { letter: string; items: T[] }[] = [];
  for (const item of [...list].sort(byTitle)) {
    const letter = letterOf(item.title);
    const last = out[out.length - 1];
    if (last && last.letter === letter) last.items.push(item);
    else out.push({ letter, items: [item] });
  }
  return out;
}

// --- places ------------------------------------------------------------------------------------

export interface PlaceInfo {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
  /** Things kept here and anywhere inside it. */
  readonly count: number;
  /** Its own proof, when it is proved. `at` is its latest proof the record keeps (Lasting, else lit). */
  readonly proof: { readonly at: string; readonly lasting: boolean; readonly ready: boolean } | null;
  /** Places inside it (not itself) that are proved, and of those, ready to refresh. */
  readonly provedInside: number;
  readonly readyInside: number;
  /** A lesson run or a check answered here, and not proved. */
  readonly begun: boolean;
  /** The newest thing done here or inside it: a thing kept or moved on, a lesson, a check, a proof. */
  readonly lastAt: string;
}

export interface PlaceBook {
  /** Every place the learner has something of their own in: a thing kept there, a lesson or check, a proof. */
  readonly touched: ReadonlySet<string>;
  /** Pieces with no place. */
  readonly unplaced: readonly Piece[];
  info(nodeId: string): PlaceInfo;
  /** The places one step in, each drawn at the deepest place still holding everything in its branch, in atlas order. */
  children(nodeId: string): PlaceInfo[];
  /** The subjects that hold anything, in atlas order. */
  subjects(): PlaceInfo[];
  /** Everything kept here and inside, newest first. */
  piecesIn(nodeId: string): Piece[];
  /** Places worth a cover: ready to refresh first, then the newest of the narrow places, and only after
   * them the broad ones (a field, a subject), whose cover stands for nearly everything. */
  shelf(max: number): PlaceInfo[];
  /** Proved places. */
  proved(): PlaceInfo[];
  /** Every place that holds anything, for search: the touched places and every place above them. */
  all(): PlaceInfo[];
}

/** When the learner last ran a lesson or answered a check or case at each place. */
export function activityOf(exp: ExpeditionLedger, checks: CheckLedger): Map<string, string> {
  const out = new Map<string, string>();
  const note = (nodeId: string | undefined, at: string) => { if (nodeId && (!out.has(nodeId) || out.get(nodeId)! < at)) out.set(nodeId, at); };
  for (const run of exp.runs) note(packPlace(run.packId)?.nodeId, run.at);
  for (const event of checks.events) if (event.t !== 'attempt') note(event.node, event.at);
  return out;
}

/** Atlas order: sibling by sibling from the root. */
function atlasRank(nodeId: string): number[] {
  const node = catalog.get(nodeId);
  return node ? catalog.getPath(node).slice(1).map(n => n.index) : [Infinity];
}
export function byAtlas(a: string, b: string): number {
  const x = atlasRank(a), y = atlasRank(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** A subject or a field: a place so wide that what it holds is most of the learner's library. */
const broad = (place: PlaceInfo) => place.depth <= 2;
const placeable = (nodeId: string | undefined): nodeId is string => !!nodeId && !!catalog.get(nodeId) && catalog.get(nodeId)!.depth > 0;
const ancestors = (nodeId: string) => catalog.getPath(catalog.get(nodeId)!).filter(n => n.depth > 0).map(n => n.id);

/** `activity`: when a lesson or check last ran at each place. `latest`: each place's newest proof (an
 * Understood lesson, a passed check or case), when known; without it a proof is dated by the record's
 * Lasting check, else the day it lit. */
export function placeBook(pieces: readonly Piece[], status: ReadonlyMap<string, PlaceStatus>, activity: ReadonlyMap<string, string> = new Map(), latest: ReadonlyMap<string, string> = new Map()): PlaceBook {
  const count = new Map<string, number>();
  const last = new Map<string, string>();
  const provedInside = new Map<string, number>();
  const readyInside = new Map<string, number>();
  const kept = new Map<string, Piece[]>();
  const unplaced: Piece[] = [];
  const touched = new Set<string>();
  const later = (id: string, at: string | null | undefined) => { if (at && (!last.has(id) || last.get(id)! < at)) last.set(id, at); };

  for (const piece of pieces) {
    const at = piece.nodeIds[0];
    if (!placeable(at)) { unplaced.push(piece); continue; }
    touched.add(at);
    for (const id of ancestors(at)) {
      count.set(id, (count.get(id) ?? 0) + 1);
      later(id, piece.lastAt);
      const list = kept.get(id);
      if (list) list.push(piece); else kept.set(id, [piece]);
    }
  }
  const proofOf = new Map<string, NonNullable<PlaceInfo['proof']>>();
  for (const s of status.values()) {
    if (!s.litAt || !placeable(s.nodeId)) continue;
    touched.add(s.nodeId);
    const known = s.lastingAt ?? s.litAt;
    const at = (latest.get(s.nodeId) ?? '') > known ? latest.get(s.nodeId)! : known;
    proofOf.set(s.nodeId, { at, lasting: !!s.lastingAt, ready: s.ready });
    for (const id of ancestors(s.nodeId)) {
      later(id, at);
      if (id === s.nodeId) continue;
      provedInside.set(id, (provedInside.get(id) ?? 0) + 1);
      if (s.ready) readyInside.set(id, (readyInside.get(id) ?? 0) + 1);
    }
  }
  const begun = new Set<string>();
  for (const [nodeId, at] of activity) {
    if (!placeable(nodeId)) continue;
    touched.add(nodeId);
    if (!proofOf.has(nodeId)) begun.add(nodeId);
    for (const id of ancestors(nodeId)) later(id, at);
  }

  const infos = new Map<string, PlaceInfo>();
  const info = (nodeId: string): PlaceInfo => {
    let found = infos.get(nodeId);
    if (!found) {
      const node = catalog.get(nodeId);
      found = {
        id: nodeId, name: node?.name ?? nodeId, depth: node?.depth ?? 0, count: count.get(nodeId) ?? 0, proof: proofOf.get(nodeId) ?? null,
        provedInside: provedInside.get(nodeId) ?? 0, readyInside: readyInside.get(nodeId) ?? 0, begun: begun.has(nodeId), lastAt: last.get(nodeId) ?? '',
      };
      infos.set(nodeId, found);
    }
    return found;
  };
  const children = (nodeId: string): PlaceInfo[] => {
    const node = catalog.get(nodeId);
    if (!node) return [];
    const branches = new Map<string, string[]>();
    for (const id of touched) {
      if (id === nodeId || !within(id, nodeId)) continue;
      const branch = catalog.getPath(catalog.get(id)!)[node.depth + 1].id;
      const list = branches.get(branch);
      if (list) list.push(id); else branches.set(branch, [id]);
    }
    return [...new Set([...branches.values()].map(ids => commonPlace(ids)))].sort(byAtlas).map(info);
  };
  const everything = () => {
    const ids = new Set<string>();
    for (const id of touched) for (const above of ancestors(id)) ids.add(above);
    return [...ids].sort(byAtlas).map(info);
  };
  return {
    touched, unplaced, info, children,
    subjects: () => catalog.getChildren(catalog.root).filter(subject => [...touched].some(id => within(id, subject.id))).map(subject => info(subject.id)),
    piecesIn: nodeId => [...(kept.get(nodeId) ?? [])].sort(byRecent),
    shelf: max => [...touched].map(info).sort((a, b) => Number(!!b.proof?.ready) - Number(!!a.proof?.ready) || Number(broad(a)) - Number(broad(b)) || b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name)).slice(0, max),
    proved: () => [...proofOf.keys()].map(info),
    all: everything,
  };
}

/** Proved places, ready to refresh first and then the newest proof; or by name. */
export function provedOrder(list: readonly PlaceInfo[], order: 'refresh' | 'az'): PlaceInfo[] {
  if (order === 'az') return [...list].sort((a, b) => byTitle({ title: a.name }, { title: b.name }));
  return [...list].sort((a, b) => Number(!!b.proof?.ready) - Number(!!a.proof?.ready) || (b.proof?.at ?? '').localeCompare(a.proof?.at ?? '') || a.name.localeCompare(b.name));
}

/** "1 thing", "9 things". */
export const things = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`;

// --- search ------------------------------------------------------------------------------------

/** Lowercase words, accents folded: what a search compares. */
export const wordsOf = (text: string): string[] => plain(text).match(/[\p{L}\p{N}]+/gu) ?? [];
export const termsOf = (query: string): string[] => [...new Set(wordsOf(query))];

/**
 * The words a search reads, by where a result shows them: its title; what its row prints beside the
 * title (who made it, what it is, the place it lives in); and words the row never shows (a reel's
 * narration, a page's description, the places further up).
 */
export interface Hay { readonly title: readonly string[]; readonly shown: readonly string[]; readonly hidden: readonly string[] }
type Words = readonly (string | null | undefined)[];
export const hayOf = (title: string, shown: Words = [], hidden: Words = []): Hay =>
  ({ title: wordsOf(title), shown: wordsOf(shown.filter(Boolean).join(' ')), hidden: wordsOf(hidden.filter(Boolean).join(' ')) });

/** 2 when a term is one of the words, 1 when it only starts one, else 0. */
const hitIn = (words: readonly string[], term: string) => words.includes(term) ? 2 : words.some(word => word.startsWith(term)) ? 1 : 0;

/**
 * How well a thing matches, or 0 when it does not. Every term must start a word somewhere (so "gene"
 * finds "genetics"). A hit ranks by where its result lets it be seen: the title, then what the row prints
 * beside it, then words the row never shows; within each, a whole word before one it only starts. So a
 * title that starts with the term always comes before a thing whose only hit is out of sight. Each term
 * counts its best hit, and the terms add up.
 */
export function matchScore(hay: Hay, terms: readonly string[]): number {
  if (!terms.length) return 0;
  let score = 0;
  for (const term of terms) {
    const tiers = [hay.title, hay.shown, hay.hidden];
    const tier = tiers.findIndex(words => hitIn(words, term) > 0);
    if (tier < 0) return 0;
    // Title whole 32, title start 16, shown whole 8, shown start 4, hidden whole 2, hidden start 1.
    score += 2 ** (2 * (2 - tier) + hitIn(tiers[tier], term) - 1);
  }
  return score;
}

/** A title cut where the search matched: the start of each word a term begins, marked. */
export function highlight(title: string, terms: readonly string[]): { text: string; hit: boolean }[] {
  if (!terms.length) return [{ text: title, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const match of title.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = match[0], start = match.index!;
    const folded = plain(word);
    const term = terms.filter(t => folded.startsWith(t)).sort((a, b) => b.length - a.length)[0];
    if (!term) continue;
    // Folding can change a word's length (a ligature); then the whole word is marked.
    const length = folded.length === word.length ? term.length : word.length;
    if (start > at) out.push({ text: title.slice(at, start), hit: false });
    out.push({ text: title.slice(start, start + length), hit: true });
    at = start + length;
  }
  if (at < title.length) out.push({ text: title.slice(at), hit: false });
  return out;
}

// --- what a place offers ------------------------------------------------------------------------

export type PlaceAction = { readonly kind: 'refresh' } | { readonly kind: 'lesson'; readonly packId: string } | { readonly kind: 'case' };

/**
 * The one thing a place offers now, read from its check status (checks/progress.ts checkStatus), never
 * decided here: a refresh only when one is ready (a refresh that is not due has nothing to start), the
 * lesson or a new case while the place is not proved, and nothing for a proved place that is not due.
 */
export function placeAction(status: CheckStatus | null, lessonPack: string | null, tried: boolean, lit: boolean): PlaceAction | null {
  if (status?.kind === 'ready') {
    if (status.purpose !== 'prove') return { kind: 'refresh' };
    return lessonPack && !tried ? { kind: 'lesson', packId: lessonPack } : { kind: 'case' };
  }
  if (lit) return null;
  // Not proved, and no case ready right now (a miss is cooling, or the place has no cases): its lesson is still there.
  return lessonPack ? { kind: 'lesson', packId: lessonPack } : null;
}

/** Where a place's proof stands, in a line. `latest` is its newest passed check or case, when known. */
export function proofLine(status: CheckStatus | null, own: PlaceStatus | undefined, begun: boolean, day: (iso: string) => string, latest?: string): string {
  if (own?.litAt) {
    const proved = latest ?? own.lastingAt ?? own.litAt;
    if (status?.kind === 'ready' && status.purpose !== 'prove') return `Ready to refresh · proved ${day(proved)}`;
    if (status?.kind === 'lasting') return ['Lasting', `proved ${day(proved)}`, status.refreshAt ? `refresh ${day(status.refreshAt)}` : ''].filter(Boolean).join(' · ');
    if (status?.kind === 'waiting') return `Proved ${day(proved)} · next case ${day(status.dueAt)}`;
    if (status?.kind === 'cooling') return `Proved ${day(proved)} · next try ${day(status.readyAt)}`;
    return own.lastingAt ? `Lasting · proved ${day(proved)}` : `Proved ${day(proved)}`;
  }
  if (status?.kind === 'cooling') return `Begun · next try ${day(status.readyAt)}`;
  return begun ? 'Begun' : '';
}
