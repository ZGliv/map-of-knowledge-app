import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { catalog } from '../../core/catalog';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import { PACK_PLACES as PACK_PLACES_LIST, packPlace } from '../../expeditions/manifest';
import { isMine, within, type Journal, type LibraryItem, type PlaceStatus } from '../../notebook/journal';
import { coverUrl } from '../../notebook/openLibrary';
import { videoIdFromUrl } from '../../feed/youtube';

/*
 * The Mosaic: the learner's library as a grid of tiles, one per field they have touched, each the
 * size of what they have there. The biggest fields are tiles; the rest are an index under them.
 * A tile opens into its places; a place opens into its pieces, and every piece walks the steps the
 * learner actually took with it: saved, started, finished, proved. Pure: the journal
 * (notebook/journal.ts) and what Watch and the reel shelf remember go in; pieces, areas, places,
 * proof targets and tile boxes come out.
 */

export type PieceKind = 'book' | 'film' | 'video' | 'reel' | 'link' | 'idea' | 'question';
export type Stage = 'saved' | 'started' | 'finished' | 'proved';
export const STAGES: readonly Stage[] = ['saved', 'started', 'finished', 'proved'];

/** One thing the learner keeps, whatever it is. */
export interface Piece {
  /** Its journal key: work:…, entry:…, link:…, reel:… or note:…. Collections refer to it by this. */
  readonly key: string;
  readonly kind: PieceKind;
  readonly title: string;
  /** Who made it, where it is from, or what kind of note it is. */
  readonly byline: string;
  /** A cover, a video frame, a reel still or a page's own image; null for the typographic cover. */
  readonly image: string | null;
  /** The same picture at its largest (a book's large cover), for a page that leads with it. */
  readonly large: string | null;
  /** Its places; the first is where it was kept, and the only one it is filed under. */
  readonly nodeIds: readonly string[];
  /** When it came into the library. */
  readonly at: string;
  /** The last thing the learner did with it: what Recent sorts by. */
  readonly lastAt: string;
  /** The furthest step it reached, and when each step was reached (a step can be reached without a date). */
  readonly stage: Stage;
  readonly dates: Partial<Record<Stage, string>>;
  readonly videoId: string | null;
  readonly item: LibraryItem;
  /** Lowercase words to search. */
  readonly text: string;
}

export interface PieceContext {
  /** Videos Watch can play; null until the pool loads (any YouTube link then counts). */
  readonly watchIds: ReadonlySet<string> | null;
  /** Watch's memory: video → when it was watched through. */
  readonly watched: Readonly<Record<string, string>>;
  /** Reels played to the end. */
  readonly reelsWatched: readonly string[];
}

/** Whether any of these places is proved (reading never proves: only the place's own light counts), and
 * the latest proof the record knows of there. A proof older than `since` still counts, but its date is
 * left off, so a path never reads "Proved" dated before the step it follows. */
export function provedAt(status: ReadonlyMap<string, PlaceStatus>, nodeIds: readonly string[], since: string): { proved: boolean; at?: string } {
  const times = nodeIds.flatMap(id => { const s = status.get(id); return s?.litAt ? [s.lastingAt ?? s.litAt] : []; }).sort();
  if (!times.length) return { proved: false };
  const last = times[times.length - 1];
  return last >= since ? { proved: true, at: last } : { proved: true };
}

function pathOf(dates: Partial<Record<Stage, string>>, reached: readonly Stage[]): { stage: Stage; dates: Partial<Record<Stage, string>> } {
  const stage = [...STAGES].reverse().find(s => reached.includes(s)) ?? 'saved';
  return { stage, dates };
}

/** Whether a piece walks the four steps at all: nothing records a link being read, and a note has no steps. */
export const walks = (piece: Pick<Piece, 'kind'>) => piece.kind !== 'link' && piece.kind !== 'idea' && piece.kind !== 'question';

/**
 * Everything the learner keeps, as pieces. Places, catalog shelf works they never took, and reels they
 * never kept are left out. A piece reaches only the steps the learner took with it: it is proved only
 * once it was finished and the place it was kept under (its first) is proved. A link and a note stay
 * on the day they were kept.
 */
export function piecesOf(journal: Journal, context: PieceContext): Piece[] {
  const out: Piece[] = [];
  for (const item of journal.items) {
    if (item.kind === 'place' || item.kind === 'changed' || !isMine(item)) continue;
    const nodeIds = livePlaces(item);
    const base = { key: item.key, title: item.title, nodeIds, item };
    /** Step four follows step three, and only the piece's own place can give it. */
    const prove = (dates: Partial<Record<Stage, string>>, reached: Stage[]) => {
      if (!reached.includes('finished') || !nodeIds[0]) return;
      const proof = provedAt(journal.status, nodeIds.slice(0, 1), dates.finished ?? dates.saved ?? '');
      if (!proof.proved) return;
      reached.push('proved');
      if (proof.at) dates.proved = proof.at;
    };
    const words = (...parts: (string | null | undefined)[]) => [...parts, ...nodeIds.map(id => catalog.get(id)?.name)].filter(Boolean).join(' ').toLocaleLowerCase();
    if (item.kind === 'work') {
      const { work } = item;
      const entry = work.entry!;
      const dates: Partial<Record<Stage, string>> = { saved: entry.addedAt };
      const reached: Stage[] = ['saved'];
      if (entry.startedAt && entry.status !== 'want') { dates.started = entry.startedAt; reached.push('started'); }
      if (entry.status === 'finished') { reached.push('started', 'finished'); if (entry.finishedAt) dates.finished = entry.finishedAt; }
      prove(dates, reached);
      out.push({
        ...base, kind: work.kind === 'book' ? 'book' : 'film', byline: [work.creator, work.year].filter(Boolean).join(', '),
        image: work.cover ? coverUrl(work.cover, 'M') : null, large: work.cover ? coverUrl(work.cover, 'L') : null,
        at: entry.addedAt, lastAt: latest(dates), videoId: null, ...pathOf(dates, reached), text: words(item.text, work.format),
      });
    } else if (item.kind === 'link') {
      const { link } = item;
      const id = videoIdFromUrl(link.url);
      const video = !!id && (!context.watchIds || context.watchIds.has(id));
      const dates: Partial<Record<Stage, string>> = { saved: link.createdAt };
      const reached: Stage[] = ['saved'];
      const seen = video ? context.watched[id!] : undefined;
      if (seen) { dates.finished = seen; reached.push('started', 'finished'); }
      prove(dates, reached);
      const image = link.preview?.image ?? (video ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);
      // A page kept with no words of its own and no preview is titled from its address when that reads as
      // words, and its site is printed once, never as its title and again as its byline.
      const title = link.preview?.title || (item.title !== item.domain ? item.title : '') || titleFromUrl(link.url) || item.domain;
      const site = link.preview?.siteName || item.domain;
      out.push({
        ...base, kind: video ? 'video' : 'link', title, byline: site === title ? '' : site, image, large: image,
        at: link.createdAt, lastAt: latest(dates), videoId: video ? id : null, ...pathOf(dates, reached), text: words(item.text),
      });
    } else if (item.kind === 'reel') {
      const at = item.pinnedAt!;
      const dates: Partial<Record<Stage, string>> = { saved: at };
      const reached: Stage[] = ['saved'];
      if (context.reelsWatched.includes(item.reel.id)) reached.push('started', 'finished');
      prove(dates, reached);
      const image = item.reel.image ?? null;
      out.push({ ...base, kind: 'reel', byline: '', image, large: image, at, lastAt: latest(dates), videoId: null, ...pathOf(dates, reached), text: words(item.text) });
    } else if (item.kind === 'idea' || item.kind === 'question') {
      const { entry } = item;
      out.push({
        ...base, kind: item.kind, byline: entry.sourceLabel, image: null, large: null,
        at: entry.createdAt, lastAt: latest({ saved: entry.updatedAt }), videoId: null, stage: 'saved', dates: { saved: entry.createdAt }, text: words(item.text),
      });
    }
  }
  return out;
}

/**
 * The places a piece is kept under that the atlas still has: a place it has since dropped is never
 * printed as its raw id or filed as nowhere. A reel whose chosen places have all gone goes back to its own.
 */
function livePlaces(item: LibraryItem): string[] {
  const kept = item.nodeIds.filter(id => !!catalog.get(id));
  if (!kept.length && item.kind === 'reel' && catalog.get(item.reel.nodeId)) return [item.reel.nodeId];
  return kept;
}

/**
 * A title read from a page's address, when its last part is words ("…/wiki/Peppered_moth_evolution" is
 * "Peppered moth evolution"); null for an id, a single word or no path ("…/watch?v=…", "youtu.be/…").
 */
export function titleFromUrl(url: string): string | null {
  let last: string | undefined;
  try { last = new URL(url).pathname.split('/').filter(Boolean).at(-1); } catch { return null; }
  if (!last) return null;
  let words = last;
  try { words = decodeURIComponent(last); } catch { /* kept as written */ }
  words = words.replace(/\.(html?|php|aspx?)$/i, '').replace(/[_+-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = words.split(' ');
  const digits = words.replace(/\D/g, '').length;
  if (parts.length < 2 || !parts.some(part => /^\p{L}{3,}$/u.test(part)) || digits * 3 > words.length) return null;
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

/** The last thing the learner did with a piece (saved, began, finished). A place proved later moves its path on, but not its place in Recent. */
const latest = (dates: Partial<Record<Stage, string>>) => [dates.saved, dates.started, dates.finished].filter((d): d is string => !!d).sort().at(-1) ?? '';

// --- areas: the fields ------------------------------------------------------------------------

/** A proved place inside a tile: what its marks show. */
export interface Mark {
  readonly nodeId: string;
  readonly litAt: string;
  readonly lasting: boolean;
  /** 0 to 1: how fresh the proof still is. */
  readonly glow: number;
  readonly ready: boolean;
}

export interface Area {
  /** The field's atlas node; UNPLACED for things with no place. */
  readonly id: string;
  readonly name: string;
  /** The subject it sits in. */
  readonly subjectId: string;
  readonly pieces: readonly Piece[];
  readonly marks: readonly Mark[];
  /** Places underway (begun, not proved) inside it. */
  readonly underway: number;
  /** How much the learner has here: the tile's size. */
  readonly weight: number;
}
export const UNPLACED = 'unplaced';

const PROVED = (s: PlaceStatus) => !!s.litAt;

/** Places the learner has begun to prove: a lesson played or a check or case answered there. (The
 * journal also calls a place "underway" when a link or a note merely sits on it; the Mosaic does not.) */
export function begunPlaces(exp: ExpeditionLedger, checks: CheckLedger): Set<string> {
  return new Set([...exp.runs.flatMap(run => { const place = packPlace(run.packId); return place ? [place.nodeId] : []; }), ...checks.events.map(event => event.node)]);
}

/** Regions (depth 2, such as Biology) whose touched places fall in two or more of their fields: those split into one tile per field. */
export function splitRegions(nodeIds: Iterable<string>): Set<string> {
  const branches = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    const node = catalog.get(id);
    if (!node || node.depth < 3) continue;
    const path = catalog.getPath(node);
    const set = branches.get(path[2].id) ?? new Set<string>();
    set.add(path[3].id);
    branches.set(path[2].id, set);
  }
  return new Set([...branches].filter(([, set]) => set.size >= 2).map(([id]) => id));
}

/** The field a place belongs to: its region (Physics), or the region's field (Evolution) when that region is split. */
export function areaOf(nodeId: string, split: ReadonlySet<string>): string | null {
  const node = catalog.get(nodeId);
  if (!node || node.depth === 0) return null;
  if (node.depth <= 2) return node.id;
  const path = catalog.getPath(node);
  return split.has(path[2].id) ? path[3].id : path[2].id;
}

const subjectOf = (nodeId: string) => { const node = catalog.get(nodeId); return node && node.depth > 0 ? catalog.getPath(node)[1].id : UNPLACED; };
const marksWithin = (status: ReadonlyMap<string, PlaceStatus>, scope: string): Mark[] => [...status.values()]
  .filter(s => PROVED(s) && within(s.nodeId, scope))
  .map(s => ({ nodeId: s.nodeId, litAt: s.litAt!, lasting: !!s.lastingAt, glow: s.glow ?? 0, ready: s.ready }))
  .sort((a, b) => a.litAt.localeCompare(b.litAt));
const underwayWithin = (status: ReadonlyMap<string, PlaceStatus>, begun: ReadonlySet<string>, scope: string) => [...begun].filter(id => within(id, scope) && !status.get(id)?.litAt).length;
/** The places that make a field the learner's: proved, or begun. */
const provedOrBegun = (journal: Journal, begun: ReadonlySet<string>) => [...new Set([...[...journal.status.values()].filter(PROVED).map(s => s.nodeId), ...begun])].filter(id => catalog.get(id));

/** How big a tile is: what is kept there, and proof counts double. Softened, so one busy field never crowds the rest out. */
export const weightOf = (pieces: number, proved: number, underway: number) => Math.pow(Math.max(1, pieces + 2 * proved + underway), 0.8);

/** The places the learner has touched: where each piece was kept (its first place: a video also tagged
 * Philosophy was still kept under Evolution), and every place proved or begun. */
export const touchedBy = (journal: Journal, pieces: readonly Piece[], begun: ReadonlySet<string>) =>
  new Set<string>([...pieces.flatMap(p => p.nodeIds.slice(0, 1)), ...provedOrBegun(journal, begun)]);

/** The fields: one per field the learner has touched (by keeping something there or by proving or beginning a place), biggest first. */
export function areasOf(journal: Journal, pieces: readonly Piece[], begun: ReadonlySet<string> = new Set()): Area[] {
  const touched = touchedBy(journal, pieces, begun);
  const split = splitRegions(touched);
  const byArea = new Map<string, Piece[]>();
  const unplaced: Piece[] = [];
  for (const piece of pieces) {
    const id = piece.nodeIds[0] ? areaOf(piece.nodeIds[0], split) : null;
    if (!id) unplaced.push(piece);
    else byArea.set(id, [...(byArea.get(id) ?? []), piece]);
  }
  for (const id of touched) { const area = areaOf(id, split); if (area && !byArea.has(area)) byArea.set(area, []); }
  const areas: Area[] = [...byArea].map(([id, list]) => {
    const marks = marksWithin(journal.status, id);
    const underway = underwayWithin(journal.status, begun, id);
    return { id, name: catalog.get(id)?.name ?? id, subjectId: subjectOf(id), pieces: newestFirst(list), marks, underway, weight: weightOf(list.length, marks.length, underway) };
  });
  if (unplaced.length) areas.push({ id: UNPLACED, name: 'Not placed yet', subjectId: UNPLACED, pieces: newestFirst(unplaced), marks: [], underway: 0, weight: weightOf(unplaced.length, 0, 0) });
  return areas.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

const newestFirst = (list: readonly Piece[]) => [...list].sort((a, b) => b.lastAt.localeCompare(a.lastAt) || a.title.localeCompare(b.title));

/** The most a mosaic holds: past this a tile has no room for its name and a cover, so the rest go to the index. */
export const MOSAIC_MAX = { phone: 8, desktop: 12 } as const;

/**
 * The biggest fields (or places) as tiles, at most `max`; the rest stay out of the mosaic and are
 * listed under it, grouped as the atlas groups them. Nothing is folded into a catch-all tile.
 */
export function splitTiles<T extends { weight: number }>(list: readonly T[], max: number): { tiles: T[]; rest: T[] } {
  return { tiles: list.slice(0, max), rest: list.slice(max) };
}

/** The index under a mosaic: what did not make a tile, grouped by subject in the atlas's order, then by name. */
export function indexOf<T extends { id: string; name: string }>(rest: readonly T[]): { subjectId: string; name: string; entries: T[] }[] {
  const order = catalog.getChildren(catalog.root).map(n => n.id);
  const groups = new Map<string, T[]>();
  for (const entry of rest) {
    const subject = entry.id === UNPLACED ? UNPLACED : subjectOf(entry.id);
    groups.set(subject, [...(groups.get(subject) ?? []), entry]);
  }
  const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  return [...groups].sort(([a], [b]) => rank(a) - rank(b)).map(([subjectId, entries]) => ({
    subjectId, name: subjectId === UNPLACED ? 'Not placed yet' : catalog.get(subjectId)?.name ?? subjectId,
    entries: [...entries].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

// --- places: the tiles inside a field ---------------------------------------------------------

export interface Place {
  /** The place's atlas node. */
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly Piece[];
  readonly marks: readonly Mark[];
  readonly underway: number;
  readonly weight: number;
}

/** The deepest place holding all of these (they all sit under one branch). */
export function commonPlace(nodeIds: readonly string[]): string {
  const paths = nodeIds.map(id => catalog.getPath(catalog.get(id)!).map(n => n.id));
  let i = 0;
  while (paths.every(p => i < p.length && p[i] === paths[0][i])) i++;
  return paths[0][i - 1];
}

/**
 * A field's places: one per branch the learner has touched, drawn at the deepest place that still holds
 * everything there. A piece is filed once, under the place it was kept (its first); its other places
 * show on its own page. Pieces kept on the field itself belong to no place: the field's list holds them.
 */
export function placesOf(area: Area, journal: Journal, begun: ReadonlySet<string> = new Set()): Place[] {
  if (area.id === UNPLACED) return [];
  const scope = catalog.get(area.id);
  if (!scope) return [];
  const branchOf = (id: string) => catalog.getPath(catalog.get(id)!)[scope.depth + 1].id;
  const kept = area.pieces.map(p => p.nodeIds[0]).filter((id): id is string => !!id && id !== area.id && within(id, area.id) && !!catalog.get(id));
  const touched = new Set<string>([...kept, ...provedOrBegun(journal, begun).filter(id => id !== area.id && within(id, area.id))]);
  const branches = new Map<string, string[]>();
  for (const id of touched) branches.set(branchOf(id), [...(branches.get(branchOf(id)) ?? []), id]);
  const placeOfBranch = new Map([...branches].map(([branch, ids]) => [branch, commonPlace(ids)]));
  const groups = new Map<string, Piece[]>([...placeOfBranch.values()].map(id => [id, []]));
  for (const piece of area.pieces) {
    const id = piece.nodeIds[0];
    if (!id || id === area.id || !within(id, area.id) || !catalog.get(id)) continue;
    groups.get(placeOfBranch.get(branchOf(id))!)!.push(piece);
  }
  return [...groups].map(([id, pieces]) => {
    const marks = marksWithin(journal.status, id);
    const underway = underwayWithin(journal.status, begun, id);
    return { id, name: catalog.get(id)?.name ?? id, pieces, marks, underway, weight: weightOf(pieces.length, marks.length, underway) };
  }).sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

/** Pieces kept on the field itself, not in any one place inside it. */
export const fieldPieces = (area: Area) => area.pieces.filter(p => p.nodeIds[0] === area.id);

// --- proof: where every collection ends --------------------------------------------------------

export type ProofKind = 'refresh' | 'lesson' | 'case' | 'again';
export interface Proof {
  readonly kind: ProofKind;
  /** The place it proves. */
  readonly nodeId: string;
  /** The lesson's pack, for a lesson or a lesson played again. */
  readonly packId?: string;
}

/** The field a place sits in (its ancestor at depth 3), or the place itself when it is a field or a region. */
export const fieldOf = (nodeId: string): string => { const node = catalog.get(nodeId); return node && node.depth > 3 ? catalog.getPath(node)[3].id : nodeId; };

/** Where proof may come from for one place: the place, then each place above it, out to its field and no
 * further. A subject (Science) or the world is too wide to stand for anything, so it has none. */
function ringsOf(nodeId: string): string[] {
  const node = catalog.get(nodeId);
  if (!node || node.depth < 2) return [];
  return catalog.getPath(node).filter(n => n.depth >= Math.min(3, node.depth)).map(n => n.id).reverse();
}

/**
 * The one proof to end a collection on, for these places: a proved place whose refresh is due first,
 * then a place not proved yet (its lesson, or a case once the lesson is under way), then a new case
 * for a proved place, then a lesson to play again. Looks inside the places, then out step by step to
 * their field, and never beyond it: a field with no lesson of its own ends on none, rather than on a
 * lesson from somewhere else.
 */
export function proofFor(nodeIds: readonly string[], status: ReadonlyMap<string, PlaceStatus>, hasCase: (nodeId: string) => boolean, begun: ReadonlySet<string> = new Set()): Proof | null {
  const chains = [...new Set(nodeIds)].map(ringsOf).filter(chain => chain.length);
  const deepest = Math.max(0, ...chains.map(chain => chain.length));
  for (let step = 0; step < deepest; step++) {
    const ring = [...new Set(chains.map(chain => chain[Math.min(step, chain.length - 1)]))];
    const packs = PACK_PLACES_LIST.filter(p => ring.some(scope => within(p.nodeId, scope)));
    if (!packs.length) continue;
    const ready = packs.find(p => status.get(p.nodeId)?.ready);
    if (ready) return { kind: 'refresh', nodeId: ready.nodeId };
    const open = packs.find(p => !status.get(p.nodeId)?.litAt);
    if (open) return begun.has(open.nodeId) && hasCase(open.nodeId) ? { kind: 'case', nodeId: open.nodeId } : { kind: 'lesson', nodeId: open.nodeId, packId: open.packId };
    const caseLeft = packs.find(p => hasCase(p.nodeId));
    if (caseLeft) return { kind: 'case', nodeId: caseLeft.nodeId };
    return { kind: 'again', nodeId: packs[0].nodeId, packId: packs[0].packId };
  }
  return null;
}

// --- search ----------------------------------------------------------------------------------

const terms = (query: string) => query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
/** Every word must be found in the piece. */
export function matches(piece: Piece, query: string): boolean {
  const words = terms(query);
  return words.length > 0 && words.every(word => piece.text.includes(word) || piece.title.toLocaleLowerCase().includes(word));
}
/** The pieces in a tile (or place) that match, and whether its own name does. */
export function tileMatch(tile: { name: string; pieces: readonly Piece[] }, query: string): { hit: boolean; pieces: Piece[] } {
  const words = terms(query);
  if (!words.length) return { hit: false, pieces: [] };
  const pieces = tile.pieces.filter(piece => matches(piece, query));
  const named = words.every(word => tile.name.toLocaleLowerCase().includes(word));
  return { hit: named || pieces.length > 0, pieces };
}

/** Recent: the latest step anywhere, newest first. */
export const recent = (pieces: readonly Piece[], max = 24) => [...pieces].sort((a, b) => b.lastAt.localeCompare(a.lastAt) || a.title.localeCompare(b.title)).slice(0, max);

// --- layout ----------------------------------------------------------------------------------

export interface Box { readonly id: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/**
 * The mosaic's boxes: one per tile, the size of its weight, squarified so tiles stay near square,
 * biggest first from the top left. No tile falls below `minShare` of the whole (by default a little
 * over half an even share), so the smallest still has room for its name and a cover.
 */
export function layoutMosaic(tiles: readonly { id: string; weight: number }[], width: number, height: number, gap = 3, minShare = 0.55 / Math.max(1, tiles.length)): Box[] {
  if (!tiles.length || width <= 0 || height <= 0) return [];
  const total = tiles.reduce((sum, t) => sum + Math.max(0, t.weight), 0) || 1;
  type Datum = { id: string; weight?: number; children?: Datum[] };
  const data: Datum = { id: '', children: tiles.map(t => ({ id: t.id, weight: Math.max(t.weight, total * minShare, 0.01) })) };
  const root = hierarchy<Datum>(data).sum(d => d.weight ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.data.id.localeCompare(b.data.id));
  const laid = treemap<Datum>().tile(treemapSquarify.ratio(1.2)).size([width, height]).paddingInner(gap).round(true)(root);
  return laid.leaves().map(leaf => ({ id: leaf.data.id, x: leaf.x0, y: leaf.y0, w: leaf.x1 - leaf.x0, h: leaf.y1 - leaf.y0 }));
}

/** A name as set: a short joining word ("&", "and", "of") never ends a line alone, it travels with the next word. */
export const bindName = (name: string) => name.replace(/ (&|and|of|the|in|on|to|a) /gi, ' $1\u00a0');

/** Lines a name takes at this size in this width, breaking only between words (a serif's letters average about half an em). */
export function linesFor(name: string, room: number, size: number): number {
  const perLine = Math.max(1, Math.floor(room / (size * 0.56)));
  let lines = 1, used = 0;
  for (const word of bindName(name).split(/ +/).filter(Boolean)) {
    if (word.length > perLine) return Infinity;
    if (used && used + 1 + word.length > perLine) { lines++; used = word.length; } else used += (used ? 1 : 0) + word.length;
  }
  return lines;
}

/** A tile's name as large as `base` allows, never so large that a word breaks or it needs more than `most` lines; `fits` is false only below the smallest size. */
export function fitName(name: string, room: number, base: number, most = 3): { size: number; lines: number; fits: boolean } {
  let size = base;
  while (size > 11 && linesFor(name, room, size) > most) size -= 0.5;
  const lines = linesFor(name, room, size);
  return { size, lines: Math.min(most, lines), fits: lines <= most };
}

export type TileSize = 'xl' | 'l' | 'm' | 's';

/**
 * How a tile of this size sets its name: its padding, its map mark beside the name (dropped first when
 * the name needs the room), and the name as large as fits. `fits` is false when even the smallest size
 * would break a word or need too many lines, or leave no line under the name for a cover or a title.
 */
export function tileName(box: { w: number; h: number }, name: string, hasMark: boolean) {
  const size: TileSize = box.w >= 180 && box.h >= 176 ? 'xl' : box.w >= 132 && box.h >= 120 ? 'l' : box.w >= 92 && box.h >= 74 ? 'm' : 's';
  const pad = size === 'xl' ? 16 : size === 'l' ? 13 : 10;
  const markSize = size === 'xl' ? 40 : size === 'l' ? 34 : 28;
  const base = size === 'xl' ? 27 : size === 'l' ? 21 : size === 'm' ? 16.5 : 14;
  const most = size === 's' ? 2 : 3;
  const set = (mark: boolean) => ({ mark, ...fitName(name, box.w - pad * 2 - (mark ? markSize + 10 : 0), base, most) });
  const bare = set(false);
  // The mark sits beside the name only where it costs the name nothing: no extra line, no smaller type.
  const marked = hasMark && size !== 's' ? set(true) : null;
  const chosen = marked && marked.fits && marked.lines <= bare.lines && marked.size >= bare.size ? marked : bare;
  const head = Math.max(chosen.lines * chosen.size * 1.08, chosen.mark ? markSize : 0);
  const fits = chosen.fits && box.h - pad * 2 - head >= 18;
  return { tile: size, pad, markSize, showMark: chosen.mark, nameSize: chosen.size, lines: chosen.lines, head, fits };
}

/**
 * The mosaic, laid out so every tile shows its whole name: when one cannot, the smallest tile leaves
 * the mosaic for the index and the rest are laid out again, larger.
 */
export function fitMosaic<T extends { id: string; weight: number; name: string; nodeId?: string | null }>(tiles: readonly T[], width: number, height: number, gap = 3): { boxes: Box[]; dropped: T[] } {
  let shown = tiles.length;
  for (;;) {
    const boxes = layoutMosaic(tiles.slice(0, shown), width, height, gap);
    const whole = boxes.every(box => { const tile = tiles.find(t => t.id === box.id)!; return tileName(box, tile.name, tile.nodeId !== null).fits; });
    if (whole || shown <= 1) return { boxes, dropped: tiles.slice(shown) };
    shown--;
  }
}

/** The most a mosaic stands for this many tiles, or null for the full height: a few tiles never become a wall of empty colour. */
export function stageCap(count: number, phone: boolean): number | null {
  const caps = phone ? [176, 176, 212, 268, 316, 364] : [260, 260, 300, 360, 420, 480];
  return count < caps.length ? caps[count] : null;
}
