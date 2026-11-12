import { catalog } from '../core/catalog';
import { EVOLUTION_CORE, type LibraryWork } from '../core/evolutionLibrary';
import type { NotebookEntry } from '../core/notebook';
import { EVOLUTION_ID, evolutionTerritoryId, EVOLUTION_TERRITORIES } from '../core/evolution';
import { freshnessFrom } from '../checks/freshness';
import type { CheckLedger } from '../checks/ledger';
import type { CheckSession } from '../checks/progress';
import type { CheckAnswer, CheckItem } from '../checks/types';
import type { CaseAnswer } from '../cases/types';
import type { ExpeditionLedger, ExpeditionRun } from '../expeditions/ledger';
import { PACK_PLACES, packPlace } from '../expeditions/manifest';
import { pinPlaces, type ReelShelf } from '../explore/pins';
import {
  domainOf, entryKey, kindOfFormat, kindVerbs, linkPlaces, liveItems, liveLinks, liveNotes, shelfEntryOf, shelfPlaces,
  type ItemKind as WorkKind, type ItemNote, type ItemStatus, type LibraryEntry, type LibraryStore, type SavedLink,
} from './libraryStore';

/*
 * The library: everything the learner has met, collected from the real records and nothing
 * else. Pure: the ledgers, the notebook, the reel shelf and the saved links go in; a model of
 * places, items and dated rows comes out. Packs, banks and reels arrive later (the content
 * chunk); until then their titles fall back to place names and checks contribute nothing.
 */

const LASTING_DAYS = 7; // checks/rule.ts CHECK_POLICY.lastingDays
const DAY = 24 * 60 * 60 * 1000;

export interface ReelLite { readonly id: string; readonly title: string; readonly nodeId: string; readonly image?: string; readonly position?: string; readonly contain?: boolean; readonly ink?: boolean; readonly about?: string }

/** What the content chunk adds, once loaded. */
export interface JournalContent {
  checkSessions(ledger: CheckLedger): CheckSession[];
  describe(item: CheckItem, answer: CheckAnswer | null, variant?: number): { given: string; key: string };
  packTitle(packId: string): string | undefined;
  /** The right answer to an expedition grade, in words, when it is short enough to show. */
  answerKey(packId: string, gradeId: string): string | undefined;
  /** A played new case in words: what it asked, the learner's call and the call that held. */
  caseWords(caseId: string, answer: CaseAnswer): { prompt: string; given: string; right: string } | undefined;
  /** The place, among these (or a charted place up to two levels inside one), whose next new case this
   * learner hasn't played: what finishing a book can offer. Undefined when there is none. */
  caseOffer(nodeIds: readonly string[], checks: CheckLedger): string | undefined;
  reels: readonly ReelLite[];
  /** Whether a proved place is ready to refresh now: its refresh is due and a case or question is
   * left to do it with (checks/progress.ts checkStatus). Without it nothing is called ready. */
  refreshReady?(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions: CheckSession[]): boolean;
}

export interface JournalInput {
  exp: ExpeditionLedger;
  checks: CheckLedger;
  entries: readonly NotebookEntry[];
  shelf: ReelShelf;
  library: LibraryStore;
  content?: JournalContent | null;
  /** The clock freshness is judged by (defaults to now). */
  now?: number;
  /** Places proved on their generated pages (auto/proof.ts): a passed quick check or lesson. */
  autoProofs?: readonly { nodeId: string; at: string; how: 'check' | 'lesson' }[];
}

/** Proof states, strongest first, then "read": a book, film or course about it is under way or done.
 * Read is never proof: it colors nothing on the atlas and is drawn apart from lit and underway land. */
export type PlaceState = 'lasting' | 'lit' | 'underway' | 'read' | null;
export type ItemKind = 'place' | 'reel' | 'work' | 'link' | 'idea' | 'question' | 'changed';

interface ItemBase { readonly key: string; readonly title: string; readonly detail: string; readonly nodeIds: readonly string[]; readonly at: string | null; readonly text: string }
export type LibraryItem =
  | ItemBase & { kind: 'place'; nodeId: string; state: PlaceState; packId?: string }
  | ItemBase & { kind: 'reel'; reel: ReelLite; pinnedAt: string | null }
  | ItemBase & { kind: 'work'; work: WorkItem }
  | ItemBase & { kind: 'link'; link: SavedLink; domain: string }
  | ItemBase & { kind: 'idea' | 'question'; entry: NotebookEntry }
  | ItemBase & { kind: 'changed'; change: Change };

export interface Change {
  readonly key: string;
  readonly nodeId: string;
  readonly missedAt: string;
  readonly rightAt: string;
  readonly prompt: string;
  /** The learner's wrong answer, in their words. */
  readonly was: string;
  /** The right answer, when it can be said in a line. */
  readonly now?: string;
  /** A reel they kept from this place in between. */
  readonly between?: ReelLite;
}

/** One dated line in a history: what happened, and what to show beside it. */
export interface JournalRow {
  readonly key: string;
  readonly at: string;
  readonly nodeId: string | null;
  readonly what: string;
  readonly title: string;
  readonly detail?: string;
  readonly quote?: string;
  readonly change?: Change;
  readonly lit?: boolean;
  readonly item?: LibraryItem;
}

/** A book, film, series, podcast or course: a shelf work (with the learner's entry, once they have one)
 * or one of the learner's own entries. */
export interface WorkItem {
  /** Its library key: work:<shelf id> or entry:<entry id>. Notes hang on this. */
  readonly key: string;
  readonly shelf: LibraryWork | null;
  readonly entry: LibraryEntry | null;
  readonly title: string;
  readonly creator: string;
  readonly year: number | null;
  readonly kind: WorkKind;
  readonly format: string;
  readonly cover: number | null;
  readonly status: ItemStatus | null;
  readonly nodeIds: readonly string[];
  /** Where it lives: the shelf's own link, else its Open Library or Wikidata page. */
  readonly url: string | null;
}

export interface Territory {
  readonly nodeId: string;
  readonly name: string;
  readonly state: PlaceState;
  /** How many things the learner reads or has read in it (and inside it): how dense its stipple is. */
  readonly reads?: number;
  /** Its own freshness glow, 0 to 1, when it is proved. */
  readonly glow?: number;
}
export interface Journal {
  /** The map shown: the field the learner is most active in (Evolution when there is nothing yet). */
  readonly field: { readonly nodeId: string; readonly name: string; readonly territories: readonly Territory[] };
  readonly status: ReadonlyMap<string, PlaceStatus>;
  readonly items: readonly LibraryItem[];
  readonly rows: readonly JournalRow[];
  readonly changes: readonly Change[];
}

export interface PlaceStatus {
  readonly nodeId: string;
  readonly state: PlaceState;
  readonly litAt: string | null;
  readonly lastingAt: string | null;
  /** The freshness glow of a proved place, 0 to 1 (checks/freshness.ts), and whether it is ready to
   * refresh: due, with a case or question left to refresh it with. */
  readonly glow: number | null;
  readonly ready: boolean;
  /** Items the learner is reading or has read here (started, finished or stopped). */
  readonly readCount: number;
}

/** Everything the map can show: all knowledge (its fields, in their subjects) or one place's children. */
export const WORLD_ID = 'knowledge';

// --- helpers ------------------------------------------------------------------------------

export const STUCK_PREFIX = 'stuck.';
export const stuckEntryId = (source: 'run' | 'check', id: string) => `${STUCK_PREFIX}${source}.${id.replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 140)}`;
export const isStuck = (entry: Pick<NotebookEntry, 'id'>) => entry.id.startsWith(STUCK_PREFIX);

const nameOf = (nodeId: string) => catalog.get(nodeId)?.name ?? nodeId;
export const within = (nodeId: string, scope: string) => nodeId === scope || nodeId.startsWith(`${scope}.`);
const earliest = (...times: (string | null | undefined)[]) => times.filter((t): t is string => !!t).sort()[0] ?? null;
const packNode = (packId: string) => packPlace(packId)?.nodeId;
const territoryCodeNode = (code: string) => { const t = EVOLUTION_TERRITORIES.find(x => x.code === code); return t ? evolutionTerritoryId(t.key) : null; };
export const workNodes = (work: LibraryWork): string[] => work.covers?.length ? work.covers.map(territoryCodeNode).filter((id): id is string => !!id) : [EVOLUTION_ID];
const READ_STATUSES: readonly ItemStatus[] = ['started', 'finished', 'stopped'];
export const isReading = (status: ItemStatus | null | undefined) => !!status && READ_STATUSES.includes(status);
const openLibraryWork = (id: string) => `https://openlibrary.org/works/${id}`;
const wikidataItem = (id: string) => `https://www.wikidata.org/wiki/${id}`;

/** The shelf works and the learner's own entries, as one list of works. */
export function workItems(library: LibraryStore): WorkItem[] {
  const out: WorkItem[] = [];
  for (const shelf of EVOLUTION_CORE) {
    const entry = shelfEntryOf(library, shelf.id) ?? null;
    out.push({
      key: `work:${shelf.id}`, shelf, entry, title: shelf.title, creator: shelf.creator, year: shelf.year, kind: kindOfFormat(shelf.format), format: shelf.format,
      cover: entry?.cover ?? null, status: entry?.status ?? null, nodeIds: entry?.places.length ? entry.places.map(p => p.nodeId) : shelfPlaces(shelf), url: shelf.links[0]?.url ?? null,
    });
  }
  for (const entry of liveItems(library)) {
    if (entry.ids.shelf) continue;
    out.push({
      key: entryKey(entry), shelf: null, entry, title: entry.title, creator: entry.creator, year: entry.year, kind: entry.kind, format: entry.format,
      cover: entry.cover, status: entry.status, nodeIds: entry.places.map(p => p.nodeId),
      url: entry.ids.ol ? openLibraryWork(entry.ids.ol) : entry.ids.wd ? wikidataItem(entry.ids.wd) : null,
    });
  }
  return out;
}

export function workVerbs(work: LibraryWork): { doing: string; done: string; started: string } {
  if (work.format === 'Documentary series' || work.format === 'Lecture course') return { doing: 'Watching', done: 'Watched', started: 'Started watching' };
  if (work.format === 'Radio series') return { doing: 'Listening', done: 'Listened', started: 'Started listening' };
  return { doing: 'Reading', done: 'Finished reading', started: 'Started reading' };
}

const shortDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// --- status --------------------------------------------------------------------------------

function placeStatuses(input: JournalInput, sessions: CheckSession[], notes: readonly NotebookEntry[], links: readonly SavedLink[], works: readonly WorkItem[]): Map<string, PlaceStatus> {
  const out = new Map<string, PlaceStatus>();
  const touched = new Set<string>();
  const nodes = new Set<string>();
  for (const run of input.exp.runs) { const node = packNode(run.packId); if (node) { nodes.add(node); touched.add(node); } }
  for (const session of sessions) { nodes.add(session.node); touched.add(session.node); }
  for (const proof of input.autoProofs ?? []) { nodes.add(proof.nodeId); touched.add(proof.nodeId); }
  const reels = input.content?.reels ?? [];
  for (const pin of input.shelf.pinned) { const reel = reels.find(r => r.id === pin.id); if (reel) for (const place of pinPlaces(pin, reel.nodeId)) touched.add(place); }
  for (const entry of notes) for (const id of entry.nodeIds) touched.add(id);
  for (const link of links) for (const place of linkPlaces(link)) touched.add(place);
  // Reading about a place is its own state: it never makes land underway, let alone lit.
  const read = new Map<string, number>();
  for (const work of works) if (isReading(work.status)) for (const id of work.nodeIds) read.set(id, (read.get(id) ?? 0) + 1);
  for (const nodeId of new Set([...nodes, ...touched, ...read.keys()])) {
    const understoodRun = input.exp.runs.filter(run => run.level === 'Understood' && packNode(run.packId) === nodeId).map(run => run.at).sort()[0];
    const mine = sessions.filter(s => s.node === nodeId);
    const firstPass = mine.find(s => s.verdict.passed)?.at;
    const autoAt = (input.autoProofs ?? []).filter(proof => proof.nodeId === nodeId).map(proof => proof.at).sort()[0];
    const litAt = earliest(understoodRun, firstPass, autoAt);
    const now = input.now ?? Date.now();
    const lastingAt = litAt ? mine.find(s => s.verdict.passed && Date.parse(s.at) - Date.parse(litAt) >= LASTING_DAYS * DAY)?.at ?? null : null;
    const state: PlaceState = lastingAt ? 'lasting' : litAt ? 'lit' : touched.has(nodeId) ? 'underway' : 'read';
    // The refresh ladder, as checks/progress.ts walks it: every pass, and the first Understood run
    // only when it is what lit the place.
    const fresh = freshnessFrom([...(understoodRun && (!firstPass || understoodRun <= firstPass) ? [understoodRun] : []), ...mine.filter(s => s.verdict.passed).map(s => s.at)], now);
    const ready = !!fresh?.ready && !!input.content?.refreshReady?.(nodeId, input.exp, input.checks, now, sessions);
    out.set(nodeId, { nodeId, litAt, lastingAt, glow: fresh?.glow ?? null, ready, state, readCount: read.get(nodeId) ?? 0 });
  }
  return out;
}

// --- the field ----------------------------------------------------------------------------

/** The field to draw: the parent place holding the most of the learner's activity. */
export function chooseField(status: ReadonlyMap<string, PlaceStatus>, weights: readonly { nodeId: string; weight: number; at: string }[]): string {
  const score = new Map<string, { weight: number; at: string }>();
  const add = (nodeId: string, weight: number, at: string) => {
    const node = catalog.get(nodeId);
    const parent = node?.parentId ? catalog.get(node.parentId) : undefined;
    if (!parent || catalog.getChildren(parent).length < 2) return;
    const current = score.get(parent.id) ?? { weight: 0, at: '' };
    score.set(parent.id, { weight: current.weight + weight, at: at > current.at ? at : current.at });
  };
  for (const s of status.values()) if (s.litAt) add(s.nodeId, 3, s.litAt);
  for (const w of weights) add(w.nodeId, w.weight, w.at);
  const best = [...score].sort((a, b) => b[1].weight - a[1].weight || b[1].at.localeCompare(a[1].at))[0];
  return best?.[0] ?? EVOLUTION_ID;
}

// --- changed your mind ---------------------------------------------------------------------

export function changesOf(input: JournalInput, sessions: CheckSession[]): Change[] {
  const content = input.content;
  const reels = content?.reels ?? [];
  const passes = (nodeId: string) => [
    ...input.exp.runs.filter(run => run.level === 'Understood' && packNode(run.packId) === nodeId).map(run => run.at),
    ...sessions.filter(s => s.node === nodeId && s.verdict.passed).map(s => s.at),
  ].sort();
  const between = (nodeId: string, from: string, to: string) => {
    const pin = input.shelf.pinned.filter(p => p.at > from && p.at <= to).map(p => reels.find(r => r.id === p.id)).find(r => r && within(r.nodeId, nodeId));
    return pin ?? undefined;
  };
  const out = new Map<string, Change>();
  // Expedition answers missed on a run, put right when the idea was later proved.
  for (const run of [...input.exp.runs].sort((a, b) => a.at.localeCompare(b.at))) {
    const nodeId = packNode(run.packId);
    if (!nodeId) continue;
    for (const miss of run.misses ?? []) {
      const key = `run:${run.packId}:${miss.gradeId}`;
      if (out.has(key)) continue;
      const rightAt = passes(nodeId).find(at => at > run.at);
      if (!rightAt) continue;
      out.set(key, { key, nodeId, missedAt: run.at, rightAt, prompt: miss.prompt, was: miss.chosen, now: content?.answerKey(run.packId, miss.gradeId), between: between(nodeId, run.at, rightAt) });
    }
  }
  // A new case called wrong, put right when the place was later proved (by another case or otherwise).
  for (const session of sessions) {
    const played = session.played;
    if (!played || played.success || !played.counted || !content) continue;
    const key = `case:${played.caseId}`;
    const rightAt = passes(session.node).find(at => at > session.at);
    const words = content.caseWords(played.caseId, played.answer);
    if (out.has(key) || !rightAt || !words) continue;
    out.set(key, { key, nodeId: session.node, missedAt: session.at, rightAt, prompt: words.prompt, was: words.given, now: words.right, between: between(session.node, session.at, rightAt) });
  }
  // Check answers missed, put right by a later pass, an Understood run, or the same family answered right.
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      if (attempt.correct || !attempt.entry) continue;
      const { item } = attempt.entry;
      const key = `check:${item.family}`;
      if (out.has(key)) continue;
      const laterRight = sessions.flatMap(s => s.attempts).filter(a => a.correct && a.event.family === item.family && a.event.at > attempt.event.at).map(a => a.event.at).sort()[0];
      const rightAt = earliest(passes(session.node).find(at => at > attempt.event.at), laterRight);
      if (!rightAt || !content) continue;
      const words = content.describe(item, attempt.event.answer, attempt.event.variant);
      if (!words.given || words.given.length > 240) continue;
      out.set(key, {
        key, nodeId: session.node, missedAt: attempt.event.at, rightAt,
        prompt: 'prompt' in item ? item.prompt : item.claim, was: words.given,
        now: words.key && words.key.length <= 240 ? words.key : undefined,
        between: between(session.node, attempt.event.at, rightAt),
      });
    }
  }
  return [...out.values()].sort((a, b) => b.rightAt.localeCompare(a.rightAt));
}

// --- the model ------------------------------------------------------------------------------

export function buildJournal(input: JournalInput): Journal {
  const content = input.content ?? null;
  const sessions = content ? content.checkSessions(input.checks) : [];
  const notes = input.entries.filter(entry => !isStuck(entry));
  const stuck = new Map(input.entries.filter(isStuck).map(entry => [entry.id, entry]));
  const links = liveLinks(input.library);
  const works = workItems(input.library);
  const status = placeStatuses(input, sessions, notes, links, works);
  const kept = new Map<string, ItemNote[]>();
  for (const note of liveNotes(input.library)) kept.set(note.target, [...(kept.get(note.target) ?? []), note]);
  const keptText = (key: string) => (kept.get(key) ?? []).map(note => `${note.text} ${note.where ?? ''}`).join(' ');
  const reels = content?.reels ?? [];
  const reelById = new Map(reels.map(reel => [reel.id, reel]));
  const changes = changesOf(input, sessions);

  // Field and its territories.
  const weights = [
    ...input.exp.runs.map(run => ({ nodeId: packNode(run.packId) ?? '', weight: 3, at: run.at })),
    ...sessions.map(s => ({ nodeId: s.node, weight: 3, at: s.at })),
    ...input.shelf.pinned.flatMap(p => pinPlaces(p, reelById.get(p.id)?.nodeId).map(nodeId => ({ nodeId, weight: 2, at: p.at }))),
    ...notes.flatMap(entry => entry.nodeIds.map(nodeId => ({ nodeId, weight: 1, at: entry.updatedAt }))),
    ...links.flatMap(l => linkPlaces(l).map(nodeId => ({ nodeId, weight: 1, at: l.updatedAt }))),
    ...works.filter(w => isReading(w.status)).flatMap(w => w.nodeIds.map(nodeId => ({ nodeId, weight: 0.5, at: w.entry!.updatedAt }))),
  ].filter(w => w.nodeId);
  const fieldId = chooseScope(status, weights);
  const fieldNode = catalog.get(fieldId) ?? catalog.get(EVOLUTION_ID)!;
  const territories = scopeTerritories(status, fieldNode.id);

  // Items.
  const items: LibraryItem[] = [];
  const placeIds = new Set<string>([...PACK_PLACES.map(p => p.nodeId), ...EVOLUTION_TERRITORIES.map(t => evolutionTerritoryId(t.key)), ...status.keys(), ...territories.map(t => t.nodeId)]);
  for (const nodeId of placeIds) {
    const node = catalog.get(nodeId);
    if (!node) continue;
    const pack = PACK_PLACES.find(p => p.nodeId === nodeId);
    const s = status.get(nodeId);
    const state = s?.state ?? territoryState(status, nodeId);
    const packTitle = pack ? content?.packTitle(pack.packId) : undefined;
    const parent = node.parentId ? nameOf(node.parentId) : '';
    items.push({ kind: 'place', key: `place:${nodeId}`, nodeId, state, packId: pack?.packId, title: node.name, detail: packTitle ? `${packTitle} · ${parent}` : parent, nodeIds: [nodeId], at: s?.lastingAt ?? s?.litAt ?? null, text: [node.name, packTitle, parent, (node as { description?: string }).description].join(' ') });
  }
  const pins = new Map(input.shelf.pinned.map(p => [p.id, p]));
  for (const reel of reels) {
    const pin = pins.get(reel.id);
    // A saved reel sits where the learner saved it (its own place unless they chose others). A place the
    // atlas no longer has is left out here (the pin keeps it), so no raw place ID is ever printed; with
    // none left, the reel's own place.
    const live = (pin ? pinPlaces(pin, reel.nodeId) : [reel.nodeId]).filter(id => !!catalog.get(id));
    const places = live.length ? live : catalog.get(reel.nodeId) ? [reel.nodeId] : [];
    items.push({ kind: 'reel', key: `reel:${reel.id}`, reel, pinnedAt: pin?.at ?? null, title: reel.title, detail: places.map(nameOf).join(' · '), nodeIds: places, at: pin?.at ?? null, text: `${reel.title} ${places.map(nameOf).join(' ')} ${reel.about ?? ''}` });
  }
  for (const work of works) {
    const entry = work.entry;
    const extra = work.shelf ? `${work.shelf.format} ${work.shelf.why}` : entry ? `${entry.format} ${entry.subjects.join(' ')} ${entry.tags.join(' ')}` : '';
    items.push({
      kind: 'work', key: work.key, work, title: work.title, detail: [work.creator, work.year ?? ''].filter(Boolean).join(' · '), nodeIds: work.nodeIds,
      at: entry ? entry.finishedAt ?? entry.startedAt ?? entry.addedAt : null,
      text: `${work.title} ${work.creator} ${work.year ?? ''} ${extra} ${work.nodeIds.map(nameOf).join(' ')} ${keptText(work.key)}`,
    });
  }
  for (const link of links) {
    const domain = domainOf(link.url);
    const seen = link.preview;
    items.push({ kind: 'link', key: `link:${link.id}`, link, domain, title: link.note || seen?.title || domain, detail: link.note || seen?.title ? seen?.siteName || domain : link.url, nodeIds: linkPlaces(link), at: link.createdAt, text: `${link.note} ${link.url} ${seen ? `${seen.title} ${seen.description} ${seen.siteName}` : ''} ${linkPlaces(link).map(nameOf).join(' ')} ${keptText(`link:${link.id}`)}` });
  }
  for (const entry of notes) {
    items.push({ kind: entry.kind, key: `note:${entry.id}`, entry, title: entry.title, detail: entry.body.replace(/\s+/g, ' ').slice(0, 160), nodeIds: entry.nodeIds, at: entry.updatedAt, text: [entry.title, entry.body, entry.sourceLabel, entry.sourceUrl, ...entry.nodeIds.map(nameOf)].join(' ') });
  }
  for (const change of changes) items.push({ kind: 'changed', key: `changed:${change.key}`, change, title: change.now ?? nameOf(change.nodeId), detail: change.was, nodeIds: [change.nodeId], at: change.rightAt, text: `${change.prompt} ${change.was} ${change.now ?? ''} ${nameOf(change.nodeId)}` });

  // Dated rows.
  const rows: JournalRow[] = [];
  const usedStuck = new Set<string>();
  const quote = (id: string) => { const entry = stuck.get(id); if (entry) usedStuck.add(id); return entry?.title; };
  const placeItem = (nodeId: string) => items.find(item => item.kind === 'place' && item.nodeId === nodeId);
  const runsByPack = new Map<string, ExpeditionRun[]>();
  for (const run of [...input.exp.runs].sort((a, b) => a.at.localeCompare(b.at))) runsByPack.set(run.packId, [...(runsByPack.get(run.packId) ?? []), run]);
  for (const [packId, runs] of runsByPack) {
    const nodeId = packNode(packId);
    if (!nodeId) continue;
    const s = status.get(nodeId);
    const title = content?.packTitle(packId) ?? nameOf(nodeId);
    const lighting = runs.find(run => run.level === 'Understood');
    if (lighting && s?.litAt === lighting.at) rows.push({ key: `lit:${nodeId}`, at: lighting.at, nodeId, what: `Lit ${nameOf(nodeId)}`, title, quote: quote(stuckEntryId('run', lighting.id)), lit: true, item: placeItem(nodeId) });
    const first = runs[0];
    if (first.level !== 'Understood' && (!s?.litAt || first.at < s.litAt)) rows.push({ key: `explored:${packId}`, at: first.at, nodeId, what: `Explored ${nameOf(nodeId)}`, title, detail: first.level, quote: quote(stuckEntryId('run', first.id)), item: placeItem(nodeId) });
    for (const run of runs) {
      const id = stuckEntryId('run', run.id);
      if (stuck.has(id) && !usedStuck.has(id)) rows.push({ key: `stuck:${id}`, at: run.at, nodeId, what: `What stuck · ${nameOf(nodeId)}`, title, quote: quote(id), item: placeItem(nodeId) });
    }
  }
  for (const proof of input.autoProofs ?? []) {
    if (status.get(proof.nodeId)?.litAt === proof.at) rows.push({ key: `lit:${proof.nodeId}`, at: proof.at, nodeId: proof.nodeId, what: `Lit ${nameOf(proof.nodeId)}`, title: proof.how === 'lesson' ? 'Proved in a lesson' : 'Proved in a quick check', lit: true, item: placeItem(proof.nodeId) });
  }
  for (const session of sessions) {
    const s = status.get(session.node);
    const id = stuckEntryId('check', session.session);
    if (session.verdict.passed && s?.lastingAt === session.at) rows.push({ key: `lasting:${session.node}`, at: session.at, nodeId: session.node, what: `Lasting ${nameOf(session.node)}`, title: 'Still yours a week later', quote: quote(id), lit: true, item: placeItem(session.node) });
    else if (session.verdict.passed && s?.litAt === session.at) rows.push({ key: `lit:${session.node}`, at: session.at, nodeId: session.node, what: `Lit ${nameOf(session.node)}`, title: session.played ? 'Proved in a new case' : 'Proved in words', quote: quote(id), lit: true, item: placeItem(session.node) });
    else if (stuck.has(id)) rows.push({ key: `stuck:${id}`, at: session.at, nodeId: session.node, what: `What stuck · ${nameOf(session.node)}`, title: session.played ? 'A new case' : 'In words', quote: quote(id), item: placeItem(session.node) });
  }
  for (const item of items) {
    if (item.kind === 'reel' && item.pinnedAt) rows.push({ key: item.key, at: item.pinnedAt, nodeId: item.nodeIds[0] ?? item.reel.nodeId, what: 'Kept a reel', title: item.title, detail: item.detail, item });
    if (item.kind === 'work' && item.work.entry && isReading(item.work.status)) {
      const verbs = kindVerbs(item.work.kind);
      const entry = item.work.entry;
      if (entry.startedAt) rows.push({ key: `${item.key}:start`, at: entry.startedAt, nodeId: item.nodeIds[0] ?? null, what: verbs.started, title: item.title, detail: item.detail, item });
      if (entry.finishedAt && entry.status === 'finished') rows.push({ key: `${item.key}:done`, at: entry.finishedAt, nodeId: item.nodeIds[0] ?? null, what: verbs.done, title: item.title, detail: item.detail, item });
    }
    if (item.kind === 'link') rows.push({ key: item.key, at: item.link.createdAt, nodeId: item.link.nodeId, what: `Saved a link · ${item.domain}`, title: item.title, item });
    if (item.kind === 'idea' || item.kind === 'question') rows.push({ key: item.key, at: item.entry.createdAt, nodeId: item.entry.nodeIds[0] ?? null, what: item.kind === 'idea' ? 'An idea' : 'A question', title: item.title, detail: item.detail || undefined, item });
    if (item.kind === 'changed') rows.push({ key: item.key, at: item.change.rightAt, nodeId: item.change.nodeId, what: `Changed your mind · ${shortDay(item.change.missedAt)} → ${shortDay(item.change.rightAt)}`, title: item.change.prompt, change: item.change, item });
  }
  rows.sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
  return { field: { nodeId: fieldNode.id, name: fieldNode.name, territories }, status, items, rows, changes };
}

/** A territory's state: its own record, or the best of what is inside it, where a lit piece
 * inside a larger territory only makes the territory underway, and reading inside it makes it read. */
export function territoryState(status: ReadonlyMap<string, PlaceStatus>, nodeId: string): PlaceState {
  const own = status.get(nodeId)?.state ?? null;
  if (own && own !== 'read') return own;
  let read = own === 'read';
  for (const [id, s] of status) {
    if (id === nodeId || !within(id, nodeId)) continue;
    if (s.state !== 'read') return 'underway';
    read = true;
  }
  return read ? 'read' : null;
}

/** The places a scope's map is made of: all knowledge draws every field inside its subject; a place draws its children. */
export function scopeTerritories(status: ReadonlyMap<string, PlaceStatus>, scopeId: string): Territory[] {
  const node = catalog.get(scopeId);
  if (!node) return [];
  const cells = scopeId === WORLD_ID ? catalog.getChildren(node).flatMap(subject => catalog.getChildren(subject)) : catalog.getChildren(node);
  return cells.map(cell => ({ nodeId: cell.id, name: cell.name, state: territoryState(status, cell.id), reads: readsIn(status, cell.id), glow: status.get(cell.id)?.glow ?? undefined }));
}

/** Things read in a place and inside it. */
export function readsIn(status: ReadonlyMap<string, PlaceStatus>, nodeId: string): number {
  let count = 0;
  for (const [id, s] of status) if (within(id, nodeId)) count += s.readCount;
  return count;
}

/** The map to open on: all knowledge once the learner's places span three subjects or more, else the
 * field holding the most of their activity. */
export function chooseScope(status: ReadonlyMap<string, PlaceStatus>, weights: readonly { nodeId: string; weight: number; at: string }[]): string {
  const subjects = new Set<string>();
  for (const id of status.keys()) { const node = catalog.get(id); const subject = node ? catalog.getPath(node)[1] : undefined; if (subject) subjects.add(subject.id); }
  return subjects.size >= 3 ? WORLD_ID : chooseField(status, weights);
}

// --- search --------------------------------------------------------------------------------

export type LibraryFilter = 'all' | 'place' | 'reel' | 'work' | 'link' | 'idea' | 'question' | 'changed';
const KIND_ORDER: readonly LibraryItem['kind'][] = ['place', 'changed', 'idea', 'question', 'link', 'reel', 'work'];
const STATE_RANK = { lasting: 4, lit: 3, underway: 2, read: 1 } as const;

/** Is this item yours (marked, kept, written or reached), rather than only in the catalog? */
export function isMine(item: LibraryItem): boolean {
  switch (item.kind) {
    case 'place': return !!item.state;
    case 'reel': return !!item.pinnedAt;
    case 'work': return !!item.work.entry;
    default: return true;
  }
}

/** Every word must match somewhere in the item. Yours first, then newest, then by name. */
export function searchLibrary(journal: Journal, options: { query?: string; filter?: LibraryFilter; place?: string | null }): LibraryItem[] {
  const terms = (options.query ?? '').toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filter = options.filter ?? 'all';
  return journal.items
    .filter(item => filter === 'all' || item.kind === filter)
    .filter(item => !options.place || item.nodeIds.some(id => within(id, options.place!)))
    .filter(item => { const hay = `${item.title} ${item.detail} ${item.text}`.toLocaleLowerCase(); return terms.every(term => hay.includes(term)); })
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
      || Number(isMine(b)) - Number(isMine(a))
      || (a.kind === 'place' && b.kind === 'place' ? (STATE_RANK[b.state ?? 'underway'] ?? 0) * Number(!!b.state) - (STATE_RANK[a.state ?? 'underway'] ?? 0) * Number(!!a.state) : 0)
      || (b.at ?? '').localeCompare(a.at ?? '')
      || a.title.localeCompare(b.title));
}

/** Everything collected in one place (and inside it), for its sheet. */
export function placeRows(journal: Journal, nodeId: string): JournalRow[] {
  return journal.rows.filter(row => (row.nodeId && within(row.nodeId, nodeId)) || (row.item && row.item.nodeIds.some(id => within(id, nodeId))));
}

/** The places that hold anything of yours, grouped to the map's territories where they fall inside them. */
export function byPlace(journal: Journal, territories: readonly Territory[] = journal.field.territories): { nodeId: string; name: string; state: PlaceState; count: number }[] {
  const groups = new Map<string, number>();
  const groupOf = (nodeId: string) => territories.find(t => within(nodeId, t.nodeId))?.nodeId ?? nodeId;
  for (const item of journal.items) {
    if (!isMine(item) || item.kind === 'place') continue;
    for (const id of new Set(item.nodeIds.map(groupOf))) groups.set(id, (groups.get(id) ?? 0) + 1);
  }
  for (const [id, s] of journal.status) if (s.state) { const g = groupOf(id); if (!groups.has(g)) groups.set(g, 0); }
  const inField = (id: string) => territories.some(t => t.nodeId === id);
  return [...groups].map(([nodeId, count]) => ({ nodeId, name: nameOf(nodeId), state: inField(nodeId) ? territories.find(t => t.nodeId === nodeId)!.state : territoryState(journal.status, nodeId), count }))
    .sort((a, b) => Number(inField(b.nodeId)) - Number(inField(a.nodeId)) || (b.state ? STATE_RANK[b.state] : 0) - (a.state ? STATE_RANK[a.state] : 0) || b.count - a.count || a.name.localeCompare(b.name));
}
