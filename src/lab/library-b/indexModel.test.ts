import { describe, expect, it } from 'vitest';
import type { NotebookEntry } from '../../core/notebook';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { expeditionAt } from '../../expeditions/registry';
import { createReelShelf, savePin, markWatched, type ReelShelf } from '../../explore/pins';
import { journalContent } from '../../notebook/journalContent';
import { createLibraryStore, saveLink, setPlaces, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import { atlasOrder, buildIndex, chapterRows, coverPlaces, filterIndex, itemsWithin, markOf, matchCount, sliceAt, type IndexInput } from './indexModel';

const DAY = 864e5;
const NOW = Date.parse('2026-10-26T12:00:00.000Z');
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const DEEP_TIME = 'knowledge.science.biology.evolution.deep-time';
const DNA = 'knowledge.science.biology.genetics-genomes.dna';
const ACCEL = 'knowledge.science.physics.mechanics.motion.acceleration';
const HARMONY = 'knowledge.arts.music.harmony';
const MUSIC = 'knowledge.arts.music';
const PHYSICS = 'knowledge.science.physics';

const book = (id: string, title: string, at: string, extra: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id: `ol-${id}`, kind: 'book', format: 'Book', title, creator: 'A. Writer', year: 2001, cover: null, ids: { ol: id }, subjects: [], tags: [],
  places: [], placesBy: 'auto', status: 'want', addedAt: at, source: 'search', createdAt: at, updatedAt: at, ...extra,
});
const note_ = (id: string, title: string, nodeIds: string[], at: string, kind: NotebookEntry['kind'] = 'idea'): NotebookEntry =>
  ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind, evidence: 'encountered', nodeIds, createdAt: at, updatedAt: at });
const run = (id: string, nodeId: string, level: ExpeditionRun['level'], at: string): ExpeditionRun =>
  ({ id, packId: expeditionAt(nodeId)!.pack.id, level, firstTry: { right: 4, total: 6 }, transfer: { right: 2, total: 2 }, at });
const ledger = (...runs: ExpeditionRun[]): ExpeditionLedger => ({ ...createExpeditionLedger(), runs });
const input = (over: Partial<IndexInput> = {}): IndexInput => ({
  exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore(), content: journalContent, now: NOW, ...over,
});

/** A learner with a little of everything, across three territories. */
function learner(): IndexInput {
  let library: LibraryStore = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Beak of a Bird', ago(40)), ago(40));
  library = setPlaces(library, 'ol-OL1W', [SELECTION], ago(40));
  library = setStatus(library, 'entry:ol-OL1W', 'started', ago(38));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', ago(20));
  library = upsertEntry(library, book('OL2W', 'Six Easy Lessons', ago(30)), ago(30));
  library = setPlaces(library, 'ol-OL2W', [PHYSICS], ago(30));
  library = upsertEntry(library, book('OL3W', 'An Unplaced Book', ago(2)), ago(2));
  const at = (iso: string, fn: () => LibraryStore) => { const real = Date.now; Date.now = () => Date.parse(iso); try { return fn(); } finally { Date.now = real; } };
  library = at(ago(12), () => saveLink(library, { url: 'https://en.wikipedia.org/wiki/Galileo', note: 'The tower that never was', nodeId: ACCEL }));
  library = at(ago(5), () => saveLink(library, { url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Why octaves feel the same', nodeId: HARMONY }));
  library = at(ago(1), () => saveLink(library, { url: 'https://example.org/zettel', note: 'Cards, not folders', nodeId: null }));
  let shelf: ReelShelf = createReelShelf();
  shelf = savePin(shelf, 'e03-ninety-eight-in-a-hundred', [SELECTION], ago(9));
  shelf = markWatched(shelf, 'e03-ninety-eight-in-a-hundred');
  return input({
    library, shelf,
    entries: [note_('n1', 'Selection sorts what variation offers', [SELECTION], ago(25)), note_('n2', 'Why does a minor chord sound sad?', [HARMONY], ago(3), 'question')],
    exp: ledger(run('r1', SELECTION, 'Understood', ago(4)), run('r2', DNA, 'Familiar', ago(6)), run('r3', DEEP_TIME, 'Understood', ago(15))),
    watched: { abcdefghijk: ago(4) },
  });
}

describe('an empty library', () => {
  it('is an empty book: no chapters, nothing recent, and never Evolution', () => {
    const index = buildIndex(input());
    expect(index.chapters).toEqual([]);
    expect(index.recent).toEqual([]);
    expect(index.unplaced).toEqual([]);
  });
  it('leaves shelf works the learner never added out of it', () => {
    expect(buildIndex(input()).items.size).toBe(0);
  });
});

describe('the book', () => {
  const index = buildIndex(learner());
  it('opens on the territories you have something in, numbered as the atlas numbers them', () => {
    expect(index.chapters.map(c => [c.name, c.number])).toEqual([['Science', 1], ['Arts', 6]]);
  });
  it('puts fields as sections, places as entries, and deeper places under their head with the way between', () => {
    const science = index.chapters[0];
    expect(science.sections.map(s => s.name)).toEqual(['Physics', 'Biology']);
    const physics = science.sections[0];
    expect(physics.items.map(i => i.title)).toEqual(['Six Easy Lessons']);
    expect(physics.entries.map(e => e.name)).toEqual(['Mechanics']);
    expect(physics.entries[0].sub.map(s => [s.name, s.trail])).toEqual([['Acceleration', ['Motion']]]);
    const biology = science.sections[1];
    expect(biology.entries.map(e => e.name)).toEqual(['Genetics & Genomes', 'Evolution']);
    expect(biology.entries[1].sub.map(s => s.name)).toEqual(['Natural selection', 'Deep time']);
  });
  it('lists a place proved with nothing kept there as an entry too', () => {
    const deep = sliceAt(index, DEEP_TIME)!.sub!;
    expect(deep.items).toEqual([]);
    expect(deep.mark).toBe('refresh');
  });
  it('marks each place by its proof: proved, ready to refresh, underway, or nothing', () => {
    expect(sliceAt(index, SELECTION)!.sub!.mark).toBe('proved');
    expect(sliceAt(index, DNA)!.sub!.mark).toBe('underway');
    expect(sliceAt(index, ACCEL)!.sub!.mark).toBeNull();
    expect(markOf(null, false)).toBeNull();
  });
  it('keeps things with no place in their own part, never under a default field', () => {
    expect(index.unplaced.map(i => i.title).sort()).toEqual(['An Unplaced Book', 'Cards, not folders']);
  });
  it('holds every kind of thing: works, videos, links, reels and notes', () => {
    const at = itemsWithin(index, SELECTION).map(i => i.kind).sort();
    expect(at).toEqual(['idea', 'reel', 'work']);
    expect(itemsWithin(index, HARMONY).map(i => i.kind).sort()).toEqual(['question', 'video']);
    expect(itemsWithin(index, ACCEL).map(i => i.kind)).toEqual(['link']);
  });
  it('lists the most recently moved first, a finished book by when it was finished', () => {
    expect(index.recent.slice(0, 4).map(i => i.title)).toEqual(['Cards, not folders', 'An Unplaced Book', 'Why does a minor chord sound sad?', 'Why octaves feel the same']);
  });
  it('gives each thing its path, with proof dated only when it came after the thing arrived', () => {
    const finch = [...index.items.values()].find(i => i.title === 'The Beak of a Bird')!;
    expect(finch.path.map(s => [s.step, s.reached])).toEqual([['saved', true], ['started', true], ['finished', true], ['proved', true]]);
    expect(finch.path[3].at).toBe(ago(4));
    const video = [...index.items.values()].find(i => i.kind === 'video')!;
    expect(video.path.map(s => [s.step, s.reached])).toEqual([['saved', true], ['finished', true], ['proved', false]]);
    const reel = [...index.items.values()].find(i => i.kind === 'reel')!;
    expect(reel.path.find(s => s.step === 'finished')).toMatchObject({ reached: true, at: null });
    expect(reel.path.find(s => s.step === 'proved')).toMatchObject({ reached: true, at: ago(4) });
  });
  it('never lights Proved past a step not taken, nor for a place proved before the thing arrived', () => {
    let library: LibraryStore = createLibraryStore();
    // Saved and started after the place was proved (4 days ago), never finished.
    library = upsertEntry(library, book('OL9W', 'Late to the Party', ago(3)), ago(3));
    library = setPlaces(library, 'ol-OL9W', [SELECTION], ago(3));
    library = setStatus(library, 'entry:ol-OL9W', 'started', ago(2));
    // Saved before the proof, started, never finished.
    library = upsertEntry(library, book('OL8W', 'Half Read', ago(30)), ago(30));
    library = setPlaces(library, 'ol-OL8W', [SELECTION], ago(30));
    library = setStatus(library, 'entry:ol-OL8W', 'started', ago(29));
    let shelf: ReelShelf = createReelShelf();
    shelf = savePin(shelf, 'e03-ninety-eight-in-a-hundred', [SELECTION], ago(9));
    const late = buildIndex(input({ library, shelf, exp: ledger(run('r1', SELECTION, 'Understood', ago(4))) }));
    const steps = (title: string) => [...late.items.values()].find(i => i.title === title)!.path.map(s => [s.step, s.reached]);
    expect(steps('Late to the Party')).toEqual([['saved', true], ['started', true], ['finished', false], ['proved', false]]);
    expect(steps('Half Read')).toEqual([['saved', true], ['started', true], ['finished', false], ['proved', false]]);
    const reel = [...late.items.values()].find(i => i.kind === 'reel')!;
    expect(reel.path.map(s => [s.step, s.reached])).toEqual([['saved', true], ['finished', false], ['proved', false]]);
    const note = buildIndex(input({ entries: [note_('n9', 'Written after', [SELECTION], ago(1))], exp: ledger(run('r1', SELECTION, 'Understood', ago(4))) }));
    expect([...note.items.values()][0].path.map(s => s.reached)).toEqual([true, false]);
  });
  it('shows a thing kept at several places by its cover once, at its own first place, and "see" elsewhere', () => {
    let library: LibraryStore = createLibraryStore();
    library = upsertEntry(library, book('OL7W', 'Origin', ago(10), { places: [{ nodeId: SELECTION, score: 1 }, { nodeId: DEEP_TIME, score: 1 }, { nodeId: DNA, score: 1 }], placesBy: 'you' }), ago(10));
    const many = buildIndex(input({ library }));
    const covers = coverPlaces(chapterRows(many.chapters));
    const key = [...many.items.keys()][0];
    expect(many.items.get(key)!.nodeIds[0]).toBe(SELECTION);
    expect(covers.get(key)).toBe(SELECTION);
    expect(chapterRows(many.chapters).filter(row => row.items.some(i => i.key === key)).map(row => row.nodeId)).toEqual([DNA, SELECTION, DEEP_TIME]);
    // On a page without its own place, the cover sits where it first appears.
    const item = many.items.get(key)!;
    expect(coverPlaces([{ nodeId: DEEP_TIME, items: [item] }, { nodeId: DNA, items: [item] }]).get(key)).toBe(DEEP_TIME);
  });
  it('orders places as the atlas does', () => {
    expect([HARMONY, SELECTION, PHYSICS, MUSIC].sort(atlasOrder)).toEqual([PHYSICS, SELECTION, MUSIC, HARMONY]);
  });
});

describe('searching the index', () => {
  const index = buildIndex(learner());
  it('keeps a whole place when its name matches', () => {
    const found = filterIndex(index, 'harmony');
    expect(found.chapters.map(c => c.name)).toEqual(['Arts']);
    expect(itemsWithin({ ...found, recent: found.recent }, HARMONY).length).toBe(2);
    expect(matchCount(found)).toBe(2);
  });
  it('otherwise keeps only the things that match, under their places', () => {
    const found = filterIndex(index, 'tower');
    expect(found.chapters.map(c => c.name)).toEqual(['Science']);
    expect(sliceAt(found, ACCEL)!.sub!.items.map(i => i.title)).toEqual(['The tower that never was']);
    expect(found.chapters[0].sections.map(s => s.name)).toEqual(['Physics']);
  });
  it('matches every word, place names included', () => {
    expect(matchCount(filterIndex(index, 'evolution beak'))).toBe(1);
    expect(filterIndex(index, 'nothing like this').chapters).toEqual([]);
  });
  it('returns the index itself for an empty query', () => {
    expect(filterIndex(index, '  ')).toBe(index);
  });
  it('matches where a word begins, never inside one, and a word the book holds whole only whole', () => {
    let library: LibraryStore = createLibraryStore();
    for (const [id, title, days, place] of [['OL7W', 'She Has Her Mother\u2019s Laugh', 3, DNA], ['OL8W', 'The Peppered Moth', 2, SELECTION], ['OL9W', 'Behemoth', 1, SELECTION]] as const) {
      library = upsertEntry(library, book(id, title, ago(days)), ago(days));
      library = setPlaces(library, `ol-${id}`, [place], ago(days));
    }
    const words = buildIndex(input({ library }));
    const titles = (query: string) => filterIndex(words, query).recent.map(item => item.title);
    expect(titles('moth')).toEqual(['The Peppered Moth']);
    expect(titles('moths')).toEqual(['The Peppered Moth']);
    expect(titles('mothe')).toEqual(['She Has Her Mother\u2019s Laugh']);
    expect(titles("mother's")).toEqual(['She Has Her Mother\u2019s Laugh']);
    expect(titles('pepp')).toEqual(['The Peppered Moth']);
    expect(titles('emoth')).toEqual([]);
    expect(titles('evol')).toEqual(['Behemoth', 'The Peppered Moth']);
  });
  it('never narrows a start because a longer form of it is a word ("gen" holds all "genet" finds)', () => {
    let library: LibraryStore = createLibraryStore();
    for (const [id, title, days, place] of [['OL7W', 'She Has Her Mother’s Laugh', 3, DNA], ['OL8W', 'Selfish Genes', 2, SELECTION], ['OL9W', 'Hoes and Homes', 1, SELECTION]] as const) {
      library = upsertEntry(library, book(id, title, ago(days)), ago(days));
      library = setPlaces(library, `ol-${id}`, [place], ago(days));
    }
    const words = buildIndex(input({ library }));
    const titles = (query: string) => filterIndex(words, query).recent.map(item => item.title).sort();
    expect(titles('genet')).toEqual(['She Has Her Mother’s Laugh']);
    expect(titles('gen')).toEqual(['Selfish Genes', 'She Has Her Mother’s Laugh']);
    expect(titles('gene')).toEqual(['Selfish Genes', 'She Has Her Mother’s Laugh']);
    expect(titles('genes')).toEqual(['Selfish Genes']);
    expect(titles('ho')).toEqual(['Hoes and Homes']);
    expect(titles('hom')).toEqual(['Hoes and Homes']);
    for (const word of ['genetics', 'mothers', 'homes']) for (let i = 1; i < word.length; i++) {
      const start = word.slice(0, i), longer = titles(word.slice(0, i + 1));
      if (start.length < 4) expect(titles(start), `${start} ⊇ ${word.slice(0, i + 1)}`).toEqual(expect.arrayContaining(longer));
    }
  });
});

describe('at scale', () => {
  it('builds and searches 600 things quickly', () => {
    let library: LibraryStore = createLibraryStore();
    const places = [SELECTION, DEEP_TIME, DNA, ACCEL, HARMONY, MUSIC, PHYSICS, 'knowledge.humanities.history.medieval-world.black-death'];
    for (let i = 0; i < 600; i++) {
      const at = ago(i % 120);
      library = upsertEntry(library, book(`OL${1000 + i}W`, `Volume ${i}`, at, { places: [{ nodeId: places[i % places.length], score: 1 }], placesBy: 'you' }), at);
    }
    const started = performance.now();
    const index = buildIndex(input({ library }));
    const found = filterIndex(index, 'volume 59');
    const took = performance.now() - started;
    expect(index.items.size).toBe(600);
    expect(index.chapters.map(c => c.name)).toEqual(['Science', 'Humanities', 'Arts']);
    expect(matchCount(found)).toBe(1);
    expect(took).toBeLessThan(1500);
  });
});
