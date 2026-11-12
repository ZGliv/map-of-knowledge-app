import { catalog } from '../../core/catalog';
import { within, type Journal, type JournalRow, type PlaceStatus } from '../../notebook/journal';
import { kindVerbs } from '../../notebook/libraryStore';
import type { Collection } from '../library-c/collections';
import { areasOf, placesOf, proofFor, UNPLACED, type Area, type Piece } from '../library-c/mosaic';

/*
 * The Logbook: the Library as a dated record. One row per thing, on the day the learner last touched
 * it (saved, began, finished, watched, wrote), and one row per proof (proved, Lasting, each refresh
 * after it), lesson explored, mind changed, words that stuck and collection started. Rows fall into
 * months and days; a day takes a place's colour only when a place was proved on it, the Atlas's own
 * rule carried into time. A second way in, by place, is an index of the fields and places the learner
 * has touched, each with its state and one quiet next step. Pure: the journal (notebook/journal.ts),
 * the pieces (lab/library-c/mosaic.ts) and the freshness ladder go in; rows, months, the place index,
 * search results and next steps come out.
 */

const DAY = 24 * 60 * 60 * 1000;

export type RowKind = 'thing' | 'proved' | 'lasting' | 'refreshed' | 'explored' | 'stuck' | 'changed' | 'collection';
/** The kinds of thing a learner keeps, as the Library's tabs name them. */
export type Shelf = 'book' | 'film' | 'video' | 'reel' | 'link' | 'note';
export const SHELVES: readonly { readonly id: Shelf; readonly label: string }[] = [
  { id: 'book', label: 'Books' }, { id: 'film', label: 'Films' }, { id: 'video', label: 'Videos' },
  { id: 'reel', label: 'Reels' }, { id: 'link', label: 'Links' }, { id: 'note', label: 'Notes' },
];

/** One line of the logbook. */
export interface LogRow {
  readonly key: string;
  readonly at: string;
  readonly kind: RowKind;
  /** What happened, in a word or two: "Finished reading", "Kept a reel", "Proved". */
  readonly verb: string;
  readonly title: string;
  /** Who made it or where it is from. */
  readonly byline: string;
  /** A short second half to the verb: "solved a new case", "still yours a month on". */
  readonly detail: string;
  /** The place it sits in (where a thing was kept, or the place proved). */
  readonly nodeId: string | null;
  /** A place proved on this row: the spine takes its colour that day. */
  readonly lit: string | null;
  readonly shelf: Shelf | null;
  readonly piece?: Piece;
  readonly packId?: string;
  readonly collectionId?: string;
  /** Things in a collection. */
  readonly count?: number;
  /** For search: the title's words, and every word (title, maker, place and its path, notes). */
  readonly titleWords: readonly string[];
  readonly words: readonly string[];
}

// --- words --------------------------------------------------------------------------------

/** Lowercase, accents off: "Gödel" is found by "godel". */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase();
export const wordsOf = (text: string): string[] => fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const nameOf = (id: string) => catalog.get(id)?.name ?? id;
/** A place the atlas still has. A proof at one it no longer knows (renamed or removed) is left out, never printed as its raw id. */
const known = (id: string) => !!catalog.get(id);
/** A place and the places above it, down from its region (Biology), for search: a thing kept at DNA is found by "genetics". */
function pathNames(nodeId: string | null | undefined): string[] {
  const node = nodeId ? catalog.get(nodeId) : undefined;
  return node ? catalog.getPath(node).filter(n => n.depth >= 2).map(n => n.name) : [];
}

// --- rows ---------------------------------------------------------------------------------

/** A finished book or film with its finished date: filed on that day under its finished word, even
 * when it was logged later (an import, a book read years ago), never as Saved on the day it was logged. */
const filedFinished = (piece: Piece) => (piece.kind === 'book' || piece.kind === 'film') && (piece.stage === 'finished' || piece.stage === 'proved') && !!piece.dates.finished;

/** The verb for a thing's last step: what the learner last did with it. */
export function thingVerb(piece: Piece): string {
  const { dates, lastAt } = piece;
  const finished = piece.stage === 'finished' || piece.stage === 'proved';
  const doneLast = finished && (!dates.finished || lastAt === dates.finished || filedFinished(piece));
  const startedLast = !doneLast && !!dates.started && lastAt === dates.started;
  switch (piece.kind) {
    case 'book': return doneLast ? 'Finished reading' : startedLast ? 'Started reading' : 'Saved';
    case 'film': {
      const verbs = kindVerbs(piece.item.kind === 'work' ? piece.item.work.kind : 'film');
      return doneLast ? verbs.done : startedLast ? verbs.started : 'Saved';
    }
    case 'video': return doneLast ? 'Watched' : 'Saved';
    case 'reel': return 'Kept a reel';
    case 'link': return 'Saved a link';
    case 'idea': return 'Wrote';
    case 'question': return 'Asked';
  }
}

const SHELF_OF: Record<Piece['kind'], Shelf> = { book: 'book', film: 'film', video: 'video', reel: 'reel', link: 'link', idea: 'note', question: 'note' };

/** A finished date after `now` (a clock that ran ahead) is filed today, as monthsOf files any row. */
const notAfter = (iso: string, now: number) => (Date.parse(iso) > now ? new Date(now).toISOString() : iso);

function thingRow(piece: Piece, now: number): LogRow {
  const nodeId = piece.nodeIds[0] ?? null;
  return {
    key: piece.key, at: filedFinished(piece) ? notAfter(piece.dates.finished!, now) : piece.lastAt || piece.at, kind: 'thing', verb: thingVerb(piece), title: piece.title, byline: piece.kind === 'idea' || piece.kind === 'question' ? '' : piece.byline,
    detail: '', nodeId, lit: null, shelf: SHELF_OF[piece.kind], piece,
    titleWords: wordsOf(piece.title), words: wordsOf([piece.title, piece.byline, piece.text, ...piece.nodeIds.flatMap(pathNames)].join(' ')),
  };
}

const NUMBER = ['', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
/** How long a proof has held, in words: "a week", "a month", "three months", "a year". */
export function heldFor(from: string, to: string): string {
  const days = (Date.parse(to) - Date.parse(from)) / DAY;
  if (days < 10) return 'a week';
  if (days < 45) return 'a month';
  if (days < 330) { const months = Math.max(2, Math.round(days / 30.4)); return `${NUMBER[months] ?? months} months`; }
  const years = Math.round(days / 365);
  return years <= 1 ? 'a year' : `${NUMBER[years] ?? years} years`;
}

function eventRow(row: JournalRow, kind: RowKind, verb: string, title: string, detail: string, lit: boolean, extra: Partial<LogRow> = {}): LogRow {
  return {
    key: row.key, at: row.at, kind, verb, title, byline: '', detail, nodeId: row.nodeId, lit: lit ? row.nodeId : null, shelf: null,
    titleWords: wordsOf(title), words: wordsOf([title, detail, ...pathNames(row.nodeId)].join(' ')), ...extra,
  };
}

export interface LogInput {
  readonly journal: Journal;
  readonly pieces: readonly Piece[];
  /** Each proved place's refreshes, oldest first (checks/freshness.ts refreshTimes); its Lasting check is one of them. */
  readonly refreshes?: ReadonlyMap<string, readonly string[]>;
  readonly collections?: readonly Collection[];
  /** Now, in ms: a finished date after it is filed today. */
  readonly now?: number;
}

/** Every row of the logbook, newest first. */
export function logRows({ journal, pieces, refreshes, collections = [], now = Infinity }: LogInput): LogRow[] {
  const out: LogRow[] = pieces.map(piece => thingRow(piece, now));
  for (const row of journal.rows) {
    const place = row.nodeId ? nameOf(row.nodeId) : '';
    if (!row.nodeId) continue;
    // These rows are titled by their place: with no place to name, there is nothing to show.
    if (!known(row.nodeId) && /^(lit|lasting|explored):/.test(row.key)) continue;
    if (row.key.startsWith('lit:')) {
      const how = row.title === 'Proved in a new case' ? 'solved a new case' : row.title === 'Proved in words' ? 'answered its questions' : 'understood in the lesson';
      out.push(eventRow(row, 'proved', 'Proved', place, how, true, row.quote ? { byline: row.quote } : {}));
    } else if (row.key.startsWith('lasting:')) {
      // Lasting is the first pass a week or more after the proof, so say how long it really was.
      const litAt = journal.status.get(row.nodeId)?.litAt;
      out.push(eventRow(row, 'lasting', 'Lasting', place, `still yours ${litAt ? heldFor(litAt, row.at) : 'a week'} later`, true, row.quote ? { byline: row.quote } : {}));
    } else if (row.key.startsWith('explored:')) {
      const packId = row.key.slice('explored:'.length);
      out.push(eventRow(row, 'explored', 'Explored', place, row.title && row.title !== place ? row.title : 'played the lesson', false, { packId }));
    } else if (row.key.startsWith('stuck:') && row.quote) {
      out.push(eventRow(row, 'stuck', 'What stuck', row.quote, '', false));
    } else if (row.change) {
      out.push(eventRow(row, 'changed', 'Changed your mind', row.change.prompt, row.change.now ?? '', false));
    }
  }
  for (const [nodeId, times] of refreshes ?? []) {
    const status = journal.status.get(nodeId);
    if (!status?.litAt || !known(nodeId)) continue;
    for (const at of times) {
      if (at === status.lastingAt || at <= status.litAt) continue;
      const title = nameOf(nodeId);
      out.push({
        key: `refreshed:${nodeId}:${at}`, at, kind: 'refreshed', verb: 'Refreshed', title, byline: '', detail: `still yours ${heldFor(status.litAt, at)} on`,
        nodeId, lit: nodeId, shelf: null, titleWords: wordsOf(title), words: wordsOf([title, ...pathNames(nodeId)].join(' ')),
      });
    }
  }
  const kept = new Set(pieces.map(p => p.key));
  for (const collection of collections) {
    const count = collection.items.filter(key => kept.has(key)).length;
    out.push({
      key: `collection:${collection.id}`, at: collection.createdAt, kind: 'collection', verb: 'Started a collection', title: collection.name, byline: '', detail: '',
      nodeId: null, lit: null, shelf: null, collectionId: collection.id, count, titleWords: wordsOf(collection.name), words: wordsOf(collection.name),
    });
  }
  return out.sort(newestFirst);
}

export const newestFirst = (a: LogRow, b: LogRow) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key);

/** The rows inside a place: things kept there (and inside it) and what happened there. */
export const rowsWithin = (rows: readonly LogRow[], nodeId: string) => rows.filter(row => row.nodeId && within(row.nodeId, nodeId));

// --- months and days ----------------------------------------------------------------------

export interface DayGroup {
  /** Local date, yyyy-mm-dd. */
  readonly key: string;
  readonly date: Date;
  readonly rows: readonly LogRow[];
  /** The place proved this day, if any (the latest): the spine's colour. */
  readonly lit: string | null;
}
export interface MonthGroup {
  /** Local yyyy-mm. */
  readonly key: string;
  readonly year: number;
  /** 0 to 11. */
  readonly month: number;
  readonly rows: readonly LogRow[];
  readonly days: readonly DayGroup[];
  /** Places proved this month, each once, newest first. */
  readonly proved: readonly string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/**
 * Rows (newest first) as months of days, in local time, newest first, each month and day once. A row
 * dated after `now` (a clock that ran ahead, a note imported from another time zone) counts as today:
 * the record never runs into days that have not come yet, so today, when it has rows, is its first day.
 */
export function monthsOf(rows: readonly LogRow[], now = Infinity): MonthGroup[] {
  type Day = { key: string; date: Date; rows: LogRow[] };
  const months = new Map<string, { key: string; year: number; month: number; rows: LogRow[]; days: Map<string, Day> }>();
  for (const row of rows) {
    const at = Date.parse(row.at);
    if (Number.isNaN(at)) continue;
    const date = new Date(Math.min(at, now));
    const mKey = monthKey(date), dKey = dayKey(date);
    let month = months.get(mKey);
    if (!month) { month = { key: mKey, year: date.getFullYear(), month: date.getMonth(), rows: [], days: new Map() }; months.set(mKey, month); }
    month.rows.push(row);
    let day = month.days.get(dKey);
    if (!day) { day = { key: dKey, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), rows: [] }; month.days.set(dKey, day); }
    day.rows.push(row);
  }
  const newest = (a: { key: string }, b: { key: string }) => b.key.localeCompare(a.key);
  return [...months.values()].sort(newest).map(month => ({
    ...month,
    days: [...month.days.values()].sort(newest).map(day => ({ ...day, lit: day.rows.find(row => row.lit)?.lit ?? null })),
    proved: [...new Set(month.rows.filter(row => row.kind === 'proved').map(row => row.nodeId!))],
  }));
}

/**
 * The months with today at their head, for a logbook that hangs today's line there: today's own day
 * when something happened today, else an empty one (in an empty month when the newest is older). So
 * there is exactly one Today row. `months` are monthsOf's with the same `now`, so none runs past today.
 */
export function withToday(months: readonly MonthGroup[], now: number): MonthGroup[] {
  const date = new Date(now);
  const today: DayGroup = { key: dayKey(date), date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), rows: [], lit: null };
  const first = months[0];
  if (first?.key !== monthKey(date)) return [{ key: monthKey(date), year: date.getFullYear(), month: date.getMonth(), rows: [], days: [today], proved: [] }, ...months];
  if (first.days.some(day => day.key === today.key)) return [...months];
  return [{ ...first, days: [today, ...first.days] }, ...months.slice(1)];
}

/** Months shown open: the newest always, and the next ones while fewer than `least` rows are open. The rest fold to a line. */
export function openMonths(months: readonly MonthGroup[], least = 12): Set<string> {
  const open = new Set<string>();
  let rows = 0;
  for (const month of months) {
    if (open.size && rows >= least) break;
    open.add(month.key);
    rows += month.rows.length;
  }
  return open;
}

// --- places --------------------------------------------------------------------------------

export type PlaceState = 'ready' | 'lasting' | 'proved' | 'begun' | 'kept';
export interface PlaceEntry {
  readonly id: string;
  readonly name: string;
  /** Things kept there (and inside it), each counted once, where it was kept. */
  readonly count: number;
  readonly state: PlaceState;
  /** Its state in words: "Lasting", "Proved Oct 14", "DNA and Dominance proved", "3 things". */
  readonly status: string;
  /** The latest row there. */
  readonly lastAt: string;
  /** The places inside it: a region's fields, a field's places. */
  readonly places: readonly PlaceEntry[];
}
/** A region of a subject (Biology). `split` when the learner is in two or more of its fields: then its
 * places are those fields; otherwise it stands as one field, with its own places. */
export interface RegionEntry { readonly entry: PlaceEntry; readonly split: boolean }
export interface SubjectEntry { readonly id: string; readonly name: string; readonly regions: readonly RegionEntry[] }

const shortDay = (iso: string, now: number) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
};
export const things = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`;

/** A place's state: its own proof, else the proofs inside it, else begun, else what is kept there. */
export function placeState(nodeId: string, status: ReadonlyMap<string, PlaceStatus>, begun: ReadonlySet<string>, count: number, now: number): { state: PlaceState; status: string } {
  const own = status.get(nodeId);
  if (own?.litAt) {
    if (own.ready) return { state: 'ready', status: 'Ready to refresh' };
    if (own.lastingAt) return { state: 'lasting', status: 'Lasting' };
    return { state: 'proved', status: `Proved ${shortDay(own.litAt, now)}` };
  }
  const inside = [...status.values()].filter(s => s.litAt && s.nodeId !== nodeId && known(s.nodeId) && within(s.nodeId, nodeId)).sort((a, b) => b.litAt!.localeCompare(a.litAt!));
  if (inside.length) {
    const names = inside.map(s => nameOf(s.nodeId));
    const words = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : '';
    return {
      state: inside.some(s => s.ready) ? 'ready' : inside.some(s => s.lastingAt) ? 'lasting' : 'proved',
      status: words && words.length <= 34 ? `${words} proved` : `${inside.length} places proved`,
    };
  }
  if ([...begun].some(id => within(id, nodeId))) return { state: 'begun', status: 'Begun, not proved yet' };
  return { state: 'kept', status: things(count) };
}

/**
 * The learner's places as the atlas files them: subjects in the atlas's order; in each, its regions
 * (Biology, Physics) by name; a region the learner is in two or more fields of opens into those fields
 * (Evolution, Genetics & Genomes), and each field into its places. Only what the learner has touched:
 * kept something in, proved or begun. A thing is counted once, where it was kept.
 */
export function placeIndex(journal: Journal, pieces: readonly Piece[], begun: ReadonlySet<string>, rows: readonly LogRow[], now: number): SubjectEntry[] {
  const latest = (id: string) => rows.find(row => row.nodeId && within(row.nodeId, id))?.at ?? '';
  const entry = (id: string, name: string, count: number, places: PlaceEntry[] = []): PlaceEntry => ({ id, name, count, ...placeState(id, journal.status, begun, count, now), lastAt: latest(id), places });
  const byName = (a: PlaceEntry, b: PlaceEntry) => a.name.localeCompare(b.name);
  const fieldEntry = (area: Area) => entry(area.id, area.name, area.pieces.length, placesOf(area, journal, begun).map(place => entry(place.id, place.name, place.pieces.length)).sort(byName));
  const subjects = new Map<string, Map<string, { own: Area | null; fields: Area[] }>>();
  let unplaced: Area | null = null;
  for (const area of areasOf(journal, pieces, begun)) {
    if (area.id === UNPLACED) { unplaced = area; continue; }
    const node = catalog.get(area.id);
    if (!node || node.depth < 1) continue;
    const path = catalog.getPath(node);
    const region = node.depth >= 2 ? path[2].id : area.id;
    const regions = subjects.get(path[1].id) ?? new Map<string, { own: Area | null; fields: Area[] }>();
    subjects.set(path[1].id, regions);
    const group = regions.get(region) ?? { own: null, fields: [] };
    regions.set(region, group);
    if (area.id === region) group.own = area; else group.fields.push(area);
  }
  const order = catalog.getChildren(catalog.root).map(n => n.id);
  const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  const out: SubjectEntry[] = [...subjects].sort(([a], [b]) => rank(a) - rank(b)).map(([id, regions]) => ({
    id, name: nameOf(id),
    regions: [...regions].map(([regionId, group]): RegionEntry => {
      if (!group.fields.length) return { entry: fieldEntry(group.own!), split: false };
      const fields = group.fields.map(fieldEntry).sort(byName);
      return { entry: entry(regionId, nameOf(regionId), fields.reduce((n, f) => n + f.count, group.own?.pieces.length ?? 0), fields), split: true };
    }).sort((a, b) => byName(a.entry, b.entry)),
  }));
  if (unplaced) {
    const count = unplaced.pieces.length;
    out.push({ id: UNPLACED, name: 'Not placed yet', regions: [{ entry: { id: UNPLACED, name: 'Not placed yet', count, state: 'kept', status: things(count), lastAt: unplaced.pieces[0]?.lastAt ?? '', places: [] }, split: false }] });
  }
  return out;
}

/** Every entry of the index, regions, fields and their places, once each. */
export function allPlaces(index: readonly SubjectEntry[]): PlaceEntry[] {
  const out = new Map<string, PlaceEntry>();
  const add = (entry: PlaceEntry) => { if (!out.has(entry.id)) out.set(entry.id, entry); entry.places.forEach(add); };
  for (const subject of index) for (const region of subject.regions) add(region.entry);
  return [...out.values()];
}

// --- the next step -------------------------------------------------------------------------

export type StepKind = 'refresh' | 'case' | 'lesson';
export interface Step { readonly kind: StepKind; readonly nodeId: string; readonly packId?: string }
export const STEP_WORDS: Record<StepKind, string> = { refresh: 'Refresh', case: 'Try a new case', lesson: 'Play the lesson' };

/**
 * One quiet next step for a place (mosaic.ts proofFor, which reads checks/progress.ts's readiness
 * through the journal): Refresh only when a proof there is ready to refresh; a new case or the
 * lesson for a place not proved yet. A proved place that is not due has none.
 */
export function stepFor(nodeId: string, status: ReadonlyMap<string, PlaceStatus>, hasCase: (nodeId: string) => boolean, begun: ReadonlySet<string>): Step | null {
  const proof = proofFor([nodeId], status, hasCase, begun);
  if (!proof || proof.kind === 'again') return null;
  if (proof.kind === 'case' && status.get(proof.nodeId)?.litAt) return null;
  return proof.packId ? { kind: proof.kind, nodeId: proof.nodeId, packId: proof.packId } : { kind: proof.kind, nodeId: proof.nodeId };
}

/**
 * The one next step for a place with places inside it (a region, a field): where the learner left off,
 * never an arbitrary lesson from somewhere inside it. A refresh that is due first, then a place begun and
 * not proved yet, then a place where something is kept; the most recent first.
 */
export function stepWithin(entry: PlaceEntry, stepOf: (nodeId: string) => Step | null): Step | null {
  const found: { step: Step; rank: number; at: string }[] = [];
  const visit = (outer: PlaceEntry) => {
    for (const place of outer.places) {
      const step = stepOf(place.id);
      if (step && within(step.nodeId, place.id)) found.push({ step, rank: step.kind === 'refresh' ? 0 : place.state === 'begun' ? 1 : 2, at: place.lastAt });
      visit(place);
    }
  };
  visit(entry);
  found.sort((a, b) => a.rank - b.rank || b.at.localeCompare(a.at));
  return found[0]?.step ?? null;
}

/** A place's own next step: where the learner left off inside it when it has places, else its own; never one from elsewhere. */
export function ownStep(entry: PlaceEntry, stepOf: (nodeId: string) => Step | null): Step | null {
  if (entry.id === UNPLACED) return null;
  if (entry.places.length) return stepWithin(entry, stepOf);
  const step = stepOf(entry.id);
  return step && within(step.nodeId, entry.id) ? step : null;
}

/**
 * The steps a field's places carry in a list of them: every refresh that is due, and the one place where
 * the learner left off (stepWithin). The other places keep their state and no step, so a field reads as
 * where things stand rather than a list of things to do.
 */
export function placeSteps(field: PlaceEntry, stepOf: (nodeId: string) => Step | null): Map<string, Step> {
  const lead = stepWithin(field, stepOf);
  const out = new Map<string, Step>();
  for (const place of field.places) {
    const step = ownStep(place, stepOf);
    if (step && (step.kind === 'refresh' || (lead && step.kind === lead.kind && step.nodeId === lead.nodeId))) out.set(place.id, step);
  }
  return out;
}

/**
 * What heads today: every place ready to refresh; with none, the next step at the place begun most
 * recently that is not proved yet. Null when there is nothing to do.
 */
export function todayLine(rows: readonly LogRow[], status: ReadonlyMap<string, PlaceStatus>, begun: ReadonlySet<string>, hasCase: (nodeId: string) => boolean):
  { kind: 'ready'; nodeIds: string[] } | { kind: 'step'; step: Step } | null {
  const ready = [...status.values()].filter(s => s.ready && known(s.nodeId)).sort((a, b) => (a.litAt ?? '').localeCompare(b.litAt ?? '')).map(s => s.nodeId);
  if (ready.length) return { kind: 'ready', nodeIds: ready };
  const open = [...begun].filter(id => !status.get(id)?.litAt);
  const latest = (id: string) => rows.find(row => row.nodeId && within(row.nodeId, id))?.at ?? '';
  for (const id of open.sort((a, b) => latest(b).localeCompare(latest(a)))) {
    const step = stepFor(id, status, hasCase, begun);
    if (step && within(step.nodeId, id)) return { kind: 'step', step };
  }
  return null;
}

// --- search --------------------------------------------------------------------------------

/**
 * How well these words match, or null when one of them starts no word at all. Every query word must
 * begin a word somewhere ("gene" finds "genetics"). Lower is better, and what the learner can see wins:
 * whole words in the title, beginnings in the title, then whole words anywhere (a place, a maker, a
 * description), then beginnings anywhere.
 */
export function matchRank(terms: readonly string[], titleWords: readonly string[], words: readonly string[]): number | null {
  if (!terms.length) return null;
  let wholeTitle = true, title = true, whole = true;
  for (const term of terms) {
    const begins = (list: readonly string[]) => list.some(word => word.startsWith(term));
    const inTitle = begins(titleWords);
    if (!inTitle && !begins(words)) return null;
    if (!titleWords.includes(term)) wholeTitle = false;
    if (!inTitle) title = false;
    if (!titleWords.includes(term) && !words.includes(term)) whole = false;
  }
  return wholeTitle ? 0 : title ? 1 : whole ? 2 : 3;
}

export interface SearchResults { readonly places: readonly PlaceEntry[]; readonly rows: readonly LogRow[] }
const SEARCHED: ReadonlySet<RowKind> = new Set(['thing', 'stuck', 'changed', 'collection']);

/** Search the library: its places by name, and its things (and the learner's own words), best match first, then newest. */
export function searchLibrary(query: string, rows: readonly LogRow[], index: readonly SubjectEntry[]): SearchResults {
  const terms = wordsOf(query);
  if (!terms.length) return { places: [], rows: [] };
  const ranked = <T>(list: readonly T[], rank: (item: T) => number | null, tie: (a: T, b: T) => number) => list
    .map(item => ({ item, rank: rank(item) })).filter((hit): hit is { item: T; rank: number } => hit.rank !== null)
    .sort((a, b) => a.rank - b.rank || tie(a.item, b.item)).map(hit => hit.item);
  const places = ranked(allPlaces(index).filter(p => p.id !== UNPLACED), place => { const words = wordsOf(place.name); return matchRank(terms, words, words); }, (a, b) => b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name));
  const found = ranked(rows.filter(row => SEARCHED.has(row.kind)), row => matchRank(terms, row.titleWords, row.words), newestFirst);
  return { places, rows: found };
}
