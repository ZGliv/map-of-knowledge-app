import { catalog, type AtlasNode } from '../../core/catalog';
import type { NotebookEntry } from '../../core/notebook';
import type { CheckSession } from '../../checks/progress';
import { packPlace } from '../../expeditions/manifest';
import { videoIdFromUrl } from '../../feed/youtube';
import { buildJournal, isMine, type Journal, type JournalInput, type PlaceStatus, type ReelLite, type WorkItem } from '../../notebook/journal';
import type { SavedLink } from '../../notebook/libraryStore';

/*
 * The Index: the learner's library as a book. Territories are chapters, fields are sections and
 * places are entries, in the atlas's own order, and only where the learner has something: a thing
 * they kept there, or proof. An entry deeper than a field hangs under its head (the place one level
 * inside the field), as a sub-entry, the way a book's index nests them.
 *
 * Pure: the same records the Library reads go in (through notebook/journal.ts), the book comes out.
 * Nothing here ever defaults to a field: an empty library is an empty book.
 */

export type Step = 'saved' | 'started' | 'finished' | 'proved';
export interface PathStep { readonly step: Step; readonly at: string | null; readonly reached: boolean }

interface Base {
  /** The journal's key: work:…, entry:…, link:…, reel:…, note:…. */
  readonly key: string;
  readonly title: string;
  readonly detail: string;
  /** When it arrived (saved, added, written). */
  readonly at: string;
  /** When it last moved (started, finished, watched, edited). */
  readonly last: string;
  /** Its atlas places (never the root), in its own order. Empty when it has none yet. */
  readonly nodeIds: readonly string[];
  /** Saved → Started → Finished → Proved, the steps that apply to it. */
  readonly path: readonly PathStep[];
  /** Lower-cased words to search. */
  readonly hay: string;
}
export type IndexItem =
  | Base & { readonly kind: 'work'; readonly work: WorkItem }
  | Base & { readonly kind: 'video'; readonly link: SavedLink; readonly videoId: string }
  | Base & { readonly kind: 'link'; readonly link: SavedLink }
  | Base & { readonly kind: 'reel'; readonly reel: ReelLite; readonly watched: boolean }
  | Base & { readonly kind: 'idea' | 'question'; readonly entry: NotebookEntry };

/** Where a place stands, in one word: the quiet mark beside its name. */
export type Mark = 'refresh' | 'lasting' | 'proved' | 'underway' | null;

export interface IndexEntry {
  readonly nodeId: string;
  readonly name: string;
  readonly depth: number;
  /** Places between its head and it, by name (Acceleration sits in Mechanics › Motion). */
  readonly trail: readonly string[];
  /** Things kept right here, newest first. */
  readonly items: readonly IndexItem[];
  readonly mark: Mark;
  readonly status: PlaceStatus | null;
  /** Deeper places of yours (for a head). */
  readonly sub: readonly IndexEntry[];
}
export interface IndexSection {
  readonly nodeId: string;
  readonly name: string;
  /** Things kept at the field itself. */
  readonly items: readonly IndexItem[];
  readonly mark: Mark;
  readonly entries: readonly IndexEntry[];
}
export interface IndexChapter {
  readonly nodeId: string;
  readonly name: string;
  /** Its place in the atlas (1–8): numbers never shift as chapters are added. */
  readonly number: number;
  /** Things kept at the territory itself. */
  readonly items: readonly IndexItem[];
  readonly sections: readonly IndexSection[];
  /** Distinct things kept anywhere in it. */
  readonly size: number;
}
export interface LibraryIndex {
  readonly chapters: readonly IndexChapter[];
  /** Everything, most recently moved first. */
  readonly recent: readonly IndexItem[];
  /** Things with no place yet. */
  readonly unplaced: readonly IndexItem[];
  readonly items: ReadonlyMap<string, IndexItem>;
  readonly status: ReadonlyMap<string, PlaceStatus>;
  readonly journal: Journal;
}

export interface IndexInput extends JournalInput {
  /** Watch's record of videos watched through (feed/memory.ts): video ID → when. */
  readonly watched?: Readonly<Record<string, string>>;
}

const ROOT = catalog.root.id;
const latest = (...times: (string | null | undefined)[]) => times.filter((t): t is string => !!t).sort().at(-1) ?? '';
const valid = (ids: readonly string[]) => [...new Set(ids)].filter(id => id !== ROOT && !!catalog.get(id));
const pathOf = (nodeId: string): readonly AtlasNode[] => { const node = catalog.get(nodeId); return node ? catalog.getPath(node) : []; };
/** The atlas's own order: compare two places by the positions along their paths. */
export function atlasOrder(a: string, b: string): number {
  const pa = pathOf(a), pb = pathOf(b);
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) if (pa[i].index !== pb[i].index) return pa[i].index - pb[i].index;
  return pa.length - pb.length;
}
const byNewest = (a: IndexItem, b: IndexItem) => b.last.localeCompare(a.last) || a.title.localeCompare(b.title);

export function markOf(status: PlaceStatus | null | undefined, attempted: boolean): Mark {
  if (!status) return attempted ? 'underway' : null;
  if (status.ready) return 'refresh';
  if (status.state === 'lasting') return 'lasting';
  if (status.state === 'lit') return 'proved';
  return attempted ? 'underway' : null;
}

/** The nodes where a lesson or a check has been tried. */
function attemptedNodes(input: JournalInput, sessions: readonly CheckSession[]): Set<string> {
  const out = new Set<string>();
  for (const run of input.exp.runs) { const node = packPlace(run.packId)?.nodeId; if (node) out.add(node); }
  for (const session of sessions) out.add(session.node);
  return out;
}

export function buildIndex(input: IndexInput, journal: Journal = buildJournal(input)): LibraryIndex {
  const sessions = input.content?.checkSessions(input.checks) ?? [];
  const attempted = attemptedNodes(input, sessions);
  const watched = input.watched ?? {};
  const shelfWatched = new Set(input.shelf.watched);
  const status = journal.status;
  const step = (name: Step, at: string | null, reached = !!at): PathStep => ({ step: name, at, reached });
  // Proof is its place's, so it ends a thing's path only when the place was proved (or proved again)
  // after the thing arrived, and only once every step before it was reached: a place proved before
  // the thing came, or a book left unfinished, leaves Proved faint. The path never skips a step.
  const proofAfter = (ids: readonly string[], arrived: string) => ids.flatMap(id => { const s = status.get(id); return [s?.litAt, s?.lastingAt]; })
    .filter((t): t is string => !!t && t >= arrived).sort()[0] ?? null;
  const path = (ids: readonly string[], arrived: string, ...before: PathStep[]): PathStep[] => {
    const at = before.every(s => s.reached) ? proofAfter(ids, arrived) : null;
    return [...before, { step: 'proved', at, reached: !!at }];
  };

  // The learner's things, one each.
  const items: IndexItem[] = [];
  for (const item of journal.items) {
    if (!isMine(item)) continue;
    const nodeIds = valid(item.nodeIds);
    const hay = `${item.title} ${item.detail} ${item.text}`.toLocaleLowerCase();
    switch (item.kind) {
      case 'work': {
        const entry = item.work.entry!;
        const started = entry.status !== 'want' ? entry.startedAt ?? null : null;
        const finished = entry.status === 'finished' ? entry.finishedAt ?? entry.startedAt ?? entry.addedAt : null;
        items.push({ kind: 'work', key: item.key, work: item.work, title: item.title, detail: item.detail, at: entry.addedAt, last: latest(entry.addedAt, started, finished), nodeIds, hay,
          path: path(nodeIds, entry.addedAt, step('saved', entry.addedAt), step('started', started, entry.status !== 'want'), step('finished', finished)) });
        break;
      }
      case 'link': {
        const videoId = videoIdFromUrl(item.link.url);
        if (videoId) {
          const seen = watched[videoId] ?? null;
          items.push({ kind: 'video', key: item.key, link: item.link, videoId, title: item.title, detail: item.link.preview?.siteName || 'YouTube', at: item.link.createdAt, last: latest(item.link.createdAt, seen), nodeIds, hay,
            path: path(nodeIds, item.link.createdAt, step('saved', item.link.createdAt), step('finished', seen)) });
        } else {
          items.push({ kind: 'link', key: item.key, link: item.link, title: item.title, detail: item.detail, at: item.link.createdAt, last: item.link.updatedAt, nodeIds, hay,
            path: path(nodeIds, item.link.createdAt, step('saved', item.link.createdAt)) });
        }
        break;
      }
      case 'reel': {
        const at = item.pinnedAt!;
        const seen = shelfWatched.has(item.reel.id);
        items.push({ kind: 'reel', key: item.key, reel: item.reel, watched: seen, title: item.title, detail: item.detail, at, last: at, nodeIds, hay,
          path: path(nodeIds, at, step('saved', at), step('finished', null, seen)) });
        break;
      }
      case 'idea': case 'question':
        items.push({ kind: item.kind, key: item.key, entry: item.entry, title: item.title, detail: item.detail, at: item.entry.createdAt, last: latest(item.entry.createdAt, item.entry.updatedAt), nodeIds, hay,
          path: path(nodeIds, item.entry.createdAt, step('saved', item.entry.createdAt)) });
        break;
      default: break;
    }
  }
  items.sort(byNewest);

  // Each thing under every place it belongs to; proof alone also makes a place an entry.
  const at = new Map<string, IndexItem[]>();
  for (const item of items) for (const id of item.nodeIds) at.set(id, [...(at.get(id) ?? []), item]);
  const places = new Set<string>(at.keys());
  for (const [id, s] of status) if (catalog.get(id) && id !== ROOT && (s.litAt || attempted.has(id))) places.add(id);
  for (const id of attempted) if (catalog.get(id)) places.add(id);

  interface HeadDraft { node: AtlasNode; items: IndexItem[]; sub: string[] }
  interface SectionDraft { node: AtlasNode; items: IndexItem[]; heads: Map<string, HeadDraft> }
  interface ChapterDraft { node: AtlasNode; items: IndexItem[]; sections: Map<string, SectionDraft> }
  const chapters = new Map<string, ChapterDraft>();
  for (const id of [...places].sort(atlasOrder)) {
    const path = pathOf(id);
    const territory = path[1];
    if (!territory) continue;
    const chapter: ChapterDraft = chapters.get(territory.id) ?? { node: territory, items: [], sections: new Map() };
    chapters.set(territory.id, chapter);
    const here = at.get(id) ?? [];
    if (path.length === 2) { chapter.items.push(...here); continue; }
    const field = path[2];
    const section: SectionDraft = chapter.sections.get(field.id) ?? { node: field, items: [], heads: new Map() };
    chapter.sections.set(field.id, section);
    if (path.length === 3) { section.items.push(...here); continue; }
    const head = path[3];
    const entry: HeadDraft = section.heads.get(head.id) ?? { node: head, items: [], sub: [] };
    section.heads.set(head.id, entry);
    if (path.length === 4) entry.items.push(...here);
    else entry.sub.push(id);
  }

  const entryFor = (node: AtlasNode, here: readonly IndexItem[], trail: readonly string[], sub: readonly IndexEntry[]): IndexEntry =>
    ({ nodeId: node.id, name: node.name, depth: node.depth, trail, items: [...here].sort(byNewest), mark: markOf(status.get(node.id), attempted.has(node.id)), status: status.get(node.id) ?? null, sub });

  const built: IndexChapter[] = [...chapters.values()].sort((a, b) => a.node.index - b.node.index).map(chapter => {
    const sections: IndexSection[] = [...chapter.sections.values()].sort((a, b) => a.node.index - b.node.index).map(section => ({
      nodeId: section.node.id, name: section.node.name, items: [...section.items].sort(byNewest), mark: markOf(status.get(section.node.id), attempted.has(section.node.id)),
      entries: [...section.heads.values()].sort((a, b) => a.node.index - b.node.index).map(head => entryFor(head.node, head.items, [],
        head.sub.sort(atlasOrder).map(id => { const path = pathOf(id); return entryFor(path.at(-1)!, at.get(id) ?? [], path.slice(4, -1).map(n => n.name), []); }))),
    }));
    const inside = new Set<string>();
    for (const item of items) if (item.nodeIds.some(id => id === chapter.node.id || id.startsWith(`${chapter.node.id}.`))) inside.add(item.key);
    return { nodeId: chapter.node.id, name: chapter.node.name, number: chapter.node.index + 1, items: [...chapter.items].sort(byNewest), sections, size: inside.size };
  });

  return {
    chapters: built,
    recent: items,
    unplaced: items.filter(item => !item.nodeIds.length),
    items: new Map(items.map(item => [item.key, item])),
    status,
    journal,
  };
}

// --- search ------------------------------------------------------------------------------------

/** A text's words, lower-cased, an apostrophe kept inside a word (mother's) and dropped at its edges. */
const wordsOf = (text: string): string[] =>
  (text.toLocaleLowerCase().replace(/\u2019/g, "'").match(/[\p{L}\p{N}']+/gu) ?? []).map(word => word.replace(/^'+|'+$/g, '')).filter(Boolean);
const namesOf = (nodeId: string) => pathOf(nodeId).slice(1).map(n => n.name).join(' ');
/** A plural's singular (moths → moth), or null. */
const singularOf = (term: string) => term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : null;
/** A word itself, its plural and its possessive (moth, moths, moth's), and a plural's singular. */
const wholeForms = (term: string) => { const one = singularOf(term); return [term, `${term}s`, `${term}es`, `${term}'s`, ...one ? [one] : []]; };

/** Every word in the book, its places' names included, found once per book. */
const vocabularies = new WeakMap<LibraryIndex, ReadonlySet<string>>();
function vocabularyOf(index: LibraryIndex): ReadonlySet<string> {
  const known = vocabularies.get(index);
  if (known) return known;
  const words = new Set<string>(), places = new Set<string>();
  for (const item of index.recent) { for (const word of wordsOf(item.hay)) words.add(word); for (const id of item.nodeIds) places.add(id); }
  const walk = (entry: IndexEntry) => { places.add(entry.nodeId); entry.sub.forEach(walk); };
  for (const chapter of index.chapters) { places.add(chapter.nodeId); for (const section of chapter.sections) { places.add(section.nodeId); section.entries.forEach(walk); } }
  for (const id of places) for (const word of wordsOf(namesOf(id))) words.add(word);
  vocabularies.set(index, words);
  return words;
}

/** The index, cut down to what matches every word: a place whose path matches keeps all it holds;
 * otherwise only the things that match (their place's names count as their words). A word typed
 * matches where a word begins ("evol" finds Evolution), never inside one; and a word of four or more
 * letters (or a number) that the book holds as typed, or as its singular, matches only whole, plural
 * and possessive included ("moth" finds moths, not Mother's). Its other forms never decide that, so a
 * short start stays a start as it is typed ("gen" finds all "genet" does, though the book says "genes"). */
export function filterIndex(index: LibraryIndex, query: string): LibraryIndex {
  const terms = wordsOf(query);
  if (!terms.length) return index;
  const vocabulary = vocabularyOf(index);
  const tests = terms.map(term => {
    const one = singularOf(term);
    const whole = (term.length >= 4 || /^\p{N}+$/u.test(term)) && (vocabulary.has(term) || (!!one && vocabulary.has(one)));
    const forms = wholeForms(term);
    return whole ? (word: string) => forms.includes(word) : (word: string) => word.startsWith(term);
  });
  const split = new Map<string, readonly string[]>();
  const wordsIn = (text: string) => { let words = split.get(text); if (!words) { words = wordsOf(text); split.set(text, words); } return words; };
  const all = (...texts: string[]) => { const words = texts.flatMap(wordsIn); return tests.every(test => words.some(test)); };
  const keep = (nodeId: string, here: readonly IndexItem[]) => { const names = namesOf(nodeId); return all(names) ? [...here] : here.filter(item => all(names, item.hay)); };
  const entry = (e: IndexEntry): IndexEntry | null => {
    const sub = e.sub.map(entry).filter((s): s is IndexEntry => !!s);
    const items = keep(e.nodeId, e.items);
    return items.length || sub.length || all(namesOf(e.nodeId)) ? { ...e, items, sub } : null;
  };
  const chapters = index.chapters.flatMap(chapter => {
    const sections = chapter.sections.flatMap(section => {
      const entries = section.entries.map(entry).filter((e): e is IndexEntry => !!e);
      const items = keep(section.nodeId, section.items);
      return items.length || entries.length || all(namesOf(section.nodeId)) ? [{ ...section, items, entries }] : [];
    });
    const items = keep(chapter.nodeId, chapter.items);
    return items.length || sections.length || all(namesOf(chapter.nodeId)) ? [{ ...chapter, items, sections }] : [];
  });
  return { ...index, chapters, recent: index.recent.filter(item => all(...item.nodeIds.map(namesOf), item.hay)), unplaced: index.unplaced.filter(item => all(item.hay)) };
}

/** How many things a search left, counted once each. */
export function matchCount(index: LibraryIndex): number {
  const keys = new Set<string>(index.unplaced.map(item => item.key));
  const add = (list: readonly IndexItem[]) => { for (const item of list) keys.add(item.key); };
  const walk = (e: IndexEntry) => { add(e.items); e.sub.forEach(walk); };
  for (const chapter of index.chapters) { add(chapter.items); for (const section of chapter.sections) { add(section.items); section.entries.forEach(walk); } }
  return keys.size;
}

// --- covers and cross-references ----------------------------------------------------------------

/** A row of the book: the things kept at one place, in reading order. */
export interface BookRow { readonly nodeId: string; readonly items: readonly IndexItem[] }
export const entryRows = (entries: readonly IndexEntry[]): BookRow[] =>
  entries.flatMap(entry => [{ nodeId: entry.nodeId, items: entry.items }, ...entryRows(entry.sub)]);
export const sectionRows = (sections: readonly IndexSection[]): BookRow[] =>
  sections.flatMap(section => [{ nodeId: section.nodeId, items: section.items }, ...entryRows(section.entries)]);
export const chapterRows = (chapters: readonly IndexChapter[]): BookRow[] =>
  chapters.flatMap(chapter => [{ nodeId: chapter.nodeId, items: chapter.items }, ...sectionRows(chapter.sections)]);

/** Where each thing shows its cover: at its own first place when that row is on the page, else
 * where it first appears. Everywhere else it is a cross-reference, the way a printed index says
 * "see". */
export function coverPlaces(rows: readonly BookRow[]): Map<string, string> {
  const first = new Map<string, string>();
  const own = new Map<string, string>();
  for (const row of rows) for (const item of row.items) {
    if (!first.has(item.key)) first.set(item.key, row.nodeId);
    if (item.nodeIds[0] === row.nodeId) own.set(item.key, row.nodeId);
  }
  return new Map([...first].map(([key, nodeId]) => [key, own.get(key) ?? nodeId]));
}

// --- one place ---------------------------------------------------------------------------------

/** Everything of yours at a place and inside it, newest first, once each. */
export function itemsWithin(index: LibraryIndex, nodeId: string): IndexItem[] {
  return index.recent.filter(item => item.nodeIds.some(id => id === nodeId || id.startsWith(`${nodeId}.`)));
}

/** The part of the book a place opens: its chapter, section or entry, or null when it holds nothing of yours. */
export function sliceAt(index: LibraryIndex, nodeId: string): { chapter: IndexChapter; section?: IndexSection; entry?: IndexEntry; sub?: IndexEntry } | null {
  const path = pathOf(nodeId);
  const chapter = index.chapters.find(c => c.nodeId === path[1]?.id);
  if (!chapter) return null;
  if (path.length === 2) return { chapter };
  const section = chapter.sections.find(s => s.nodeId === path[2]?.id);
  if (!section) return path.length === 3 ? { chapter } : null;
  if (path.length === 3) return { chapter, section };
  const entry = section.entries.find(e => e.nodeId === path[3]?.id);
  if (!entry) return { chapter, section };
  if (path.length === 4) return { chapter, section, entry };
  return { chapter, section, entry, sub: entry.sub.find(s => s.nodeId === nodeId) };
}
