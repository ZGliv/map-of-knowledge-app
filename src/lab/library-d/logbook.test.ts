import { describe, expect, it, vi } from 'vitest';
import { catalog } from '../../core/catalog';
import { BLACK_DEATH } from '../../core/history';
import { evolutionTerritoryId } from '../../core/evolution';
import type { NotebookEntry } from '../../core/notebook';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { createReelShelf, savePin } from '../../explore/pins';
import { buildJournal, type Journal, type JournalContent, type JournalInput } from '../../notebook/journal';
import { createLibraryStore, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import { begunPlaces, piecesOf, UNPLACED, type PieceContext } from '../library-c/mosaic';
import {
  allPlaces, dayKey, heldFor, logRows, matchRank, monthKey, monthsOf, newestFirst, openMonths, ownStep, placeIndex, placeSteps, rowsWithin, searchLibrary, stepFor, stepWithin, thingVerb, todayLine, withToday, wordsOf, type LogRow,
} from './logbook';

const SELECTION = evolutionTerritoryId('natural-selection');
const DEEP_TIME = evolutionTerritoryId('deep-time');
const EVOLUTION = 'knowledge.science.biology.evolution';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const DNA = `${GENETICS}.dna`;
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const PHYSICS = 'knowledge.science.physics';
const HARMONY = 'knowledge.arts.music.harmony';
const day = (n: number, hour = 15) => new Date(Date.UTC(2026, 8, 1 + n, hour)).toISOString();
const NOW = Date.parse(day(55));

const run = (id: string, packId: string, level: ExpeditionRun['level'], at: string): ExpeditionRun =>
  ({ id, packId, level, firstTry: { right: 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, at });
const ledger = (...runs: ExpeditionRun[]): ExpeditionLedger => ({ ...createExpeditionLedger(), runs });
const content = (ready: string[] = []): JournalContent => ({
  checkSessions: () => [], describe: () => ({ given: '', key: '' }), packTitle: () => undefined, answerKey: () => undefined, caseWords: () => undefined,
  caseOffer: () => undefined, reels: [{ id: 'reel-moth', title: 'Ninety-eight in a hundred', nodeId: SELECTION, image: 'https://example.org/moth.jpg' }],
  refreshReady: nodeId => ready.includes(nodeId),
});
const note = (id: string, title: string, nodeIds: string[], at: string): NotebookEntry =>
  ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds, createdAt: at, updatedAt: at });
const book = (id: string, title: string, places: string[], at: string): LibraryEntry => ({
  id: `ol-${id}`, kind: 'book', format: 'Book', title, creator: 'A. Writer', year: 1994, cover: 12345, ids: { ol: id }, subjects: [], tags: [],
  places: places.map(nodeId => ({ nodeId, score: 1 })), placesBy: 'you', status: 'want', addedAt: at, source: 'search', createdAt: at, updatedAt: at,
});
const NO_CONTEXT: PieceContext = { watchIds: null, watched: {}, reelsWatched: [] };
/** Run store code at this moment: saveLink stamps the clock. */
const at = <T,>(iso: string, fn: () => T): T => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); try { return fn(); } finally { vi.useRealTimers(); } };

function learner(): JournalInput {
  let library: LibraryStore = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Beak of the Finch', [SELECTION], day(1)), day(1));
  library = setStatus(library, 'entry:ol-OL1W', 'started', day(3));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', day(9));
  library = upsertEntry(library, book('OL2W', 'The Gene', [DNA], day(4)), day(4));
  library = setStatus(library, 'entry:ol-OL2W', 'started', day(40));
  library = upsertEntry(library, book('OL3W', 'Six Easy Pieces', [PHYSICS], day(5)), day(5));
  library = at(day(6), () => saveLink(library, { url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Why the moths turned dark', nodeId: SELECTION, preview: { title: 'Why the moths turned dark', description: '', siteName: 'PBS Eons', image: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', at: day(6) } }));
  let shelf = createReelShelf();
  shelf = savePin(shelf, 'reel-moth', [SELECTION], day(7));
  return {
    exp: ledger(run('r1', 'evolution-e03', 'Understood', day(10)), run('r2', 'music', 'Familiar', day(12)), run('r3', 'physics', 'Understood', day(2)), run('r4', 'evolution-e06', 'Familiar', day(30))),
    checks: createCheckLedger(),
    entries: [note('n1', 'Why did the plague move so fast?', [BLACK_DEATH.id], day(11)), note('n2', 'If every cell has the same genome, what decides which genes switch on?', [DNA], day(45))],
    shelf, library, content: content([ACCELERATION]), now: NOW,
  };
}

const setup = (input = learner()) => {
  const journal = buildJournal(input);
  const pieces = piecesOf(journal, { ...NO_CONTEXT, watched: { abcdefghijk: day(8) } });
  const begun = begunPlaces(input.exp, input.checks);
  const rows = logRows({ journal, pieces, refreshes: new Map([[ACCELERATION, [day(9), day(30)]]]) });
  return { input, journal, pieces, begun, rows, index: placeIndex(journal, pieces, begun, rows, NOW) };
};
const byTitle = (rows: readonly LogRow[], title: string) => rows.filter(row => row.title === title);

describe('rows', () => {
  const { rows } = setup();

  it('are one per thing, on the day it was last touched, with the verb for what was done', () => {
    const finch = byTitle(rows, 'The Beak of the Finch');
    expect(finch).toHaveLength(1);
    expect(finch[0]).toMatchObject({ kind: 'thing', at: day(9), verb: 'Finished reading', nodeId: SELECTION, shelf: 'book' });
    expect(byTitle(rows, 'The Gene')[0]).toMatchObject({ at: day(40), verb: 'Started reading' });
    expect(byTitle(rows, 'Six Easy Pieces')[0]).toMatchObject({ at: day(5), verb: 'Saved' });
    expect(byTitle(rows, 'Why the moths turned dark')[0]).toMatchObject({ verb: 'Watched', at: day(8), shelf: 'video' });
    expect(byTitle(rows, 'Ninety-eight in a hundred')[0]).toMatchObject({ verb: 'Kept a reel', at: day(7), shelf: 'reel' });
    expect(byTitle(rows, 'Why did the plague move so fast?')[0]).toMatchObject({ verb: 'Asked', shelf: 'note', byline: '' });
  });

  it('carry every proof as its own dated row, lighting the spine only on the day of a proof', () => {
    const lit = rows.filter(row => row.lit);
    expect(lit.map(row => [row.kind, row.lit]).sort()).toEqual([['proved', ACCELERATION], ['proved', SELECTION], ['refreshed', ACCELERATION], ['refreshed', ACCELERATION]].sort());
    expect(rows.find(row => row.kind === 'proved' && row.nodeId === SELECTION)).toMatchObject({ at: day(10), verb: 'Proved', title: 'Natural selection', detail: 'understood in the lesson' });
    expect(rows.filter(row => row.kind === 'refreshed').map(row => row.detail)).toEqual(['still yours a month on', 'still yours a week on']);
    // A lesson played and not understood: explored, never lit.
    expect(rows.find(row => row.kind === 'explored' && row.nodeId === DEEP_TIME)).toMatchObject({ lit: null, packId: 'evolution-e06' });
    expect(rows.find(row => row.kind === 'explored' && row.nodeId === HARMONY)).toBeTruthy();
  });

  it('run newest first, and fall into months and days in local time', () => {
    expect(rows.map(row => row.at)).toEqual([...rows.map(row => row.at)].sort().reverse());
    const months = monthsOf(rows);
    expect(months.map(m => m.key)).toEqual(['2026-10', '2026-09']);
    const september = months[1];
    expect(september.days.map(d => d.key)).toEqual([...new Set(september.rows.map(row => { const d = new Date(row.at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }))]);
    // The day a place was proved takes its colour; a day with none stays bare.
    expect(september.days.find(d => d.rows.some(row => row.kind === 'proved' && row.nodeId === SELECTION))?.lit).toBe(SELECTION);
    expect(september.days.find(d => d.rows.every(row => !row.lit))?.lit).toBeNull();
    expect(september.proved).toEqual([SELECTION, ACCELERATION]);
  });

  it('never run past today: a row dated later counts as today, so today is one row at the top', () => {
    // A clock that ran ahead, or notes imported from another time zone: tomorrow, and a day next month.
    const todayKey = dayKey(new Date(NOW));
    const thing = (key: string, iso: string): LogRow => ({ ...rows.find(row => row.kind === 'thing')!, key, at: iso });
    for (const ahead of [day(56), day(70)]) {
      const mixed = [thing('ahead', ahead), thing('today', new Date(NOW).toISOString()), ...rows].sort(newestFirst);
      const months = monthsOf(mixed, NOW);
      const days = months.flatMap(month => month.days);
      expect(days[0].key).toBe(todayKey);
      expect(days[0].rows.map(row => row.key)).toEqual(['ahead', 'today']);
      expect(days.every(d => d.key <= todayKey)).toBe(true);
      const shown = withToday(months, NOW);
      expect(shown.flatMap(month => month.days).filter(d => d.key === todayKey)).toHaveLength(1);
      expect(new Set(shown.map(month => month.key)).size).toBe(shown.length);
    }
  });

  it('head the record with today once, an empty day when nothing happened today', () => {
    const todayKey = dayKey(new Date(NOW));
    const shown = withToday(monthsOf(rows, NOW), NOW);
    expect(shown[0].key).toBe(monthKey(new Date(NOW)));
    expect(shown[0].days[0]).toMatchObject({ key: todayKey, rows: [] });
    expect(shown.flatMap(month => month.days).filter(d => d.key === todayKey)).toHaveLength(1);
    // A record whose newest month is older gets this month, holding only today.
    const old = withToday(monthsOf(rows.filter(row => row.at < day(30)), NOW), NOW);
    expect(old[0]).toMatchObject({ key: monthKey(new Date(NOW)), rows: [] });
    expect(old[0].days.map(d => d.key)).toEqual([todayKey]);
    expect(old.slice(1).map(month => month.key)).toEqual(['2026-09']);
  });

  it('fold older months once enough is open', () => {
    const months = monthsOf(rows);
    expect([...openMonths(months, 1)]).toEqual(['2026-10']);
    expect([...openMonths(months, months[0].rows.length)]).toEqual(['2026-10']);
    expect([...openMonths(months, months[0].rows.length + 1)]).toEqual(['2026-10', '2026-09']);
    expect(openMonths([], 12).size).toBe(0);
  });

  it('a place holds what was kept in it and what happened there', () => {
    expect(rowsWithin(rows, SELECTION).map(row => row.title).sort()).toEqual(['Natural selection', 'Ninety-eight in a hundred', 'The Beak of the Finch', 'Why the moths turned dark']);
    expect(rowsWithin(rows, EVOLUTION).some(row => row.nodeId === DEEP_TIME)).toBe(true);
  });

  it('say how long a proof had held when it was found Lasting', () => {
    const lasting = (at: string) => ({ key: `lasting:${SELECTION}`, at, nodeId: SELECTION, title: 'Lasting' });
    const journal = (at: string) => ({ rows: [lasting(at)], status: new Map([[SELECTION, { nodeId: SELECTION, litAt: day(0), lastingAt: at }]]) }) as unknown as Journal;
    expect(logRows({ journal: journal(day(8)), pieces: [] })[0]).toMatchObject({ kind: 'lasting', detail: 'still yours a week later' });
    expect(logRows({ journal: journal(day(33)), pieces: [] })[0]).toMatchObject({ kind: 'lasting', detail: 'still yours a month later' });
  });

  it('leave out a proof at a place the atlas no longer has, never printing its raw id', () => {
    const GONE = `${EVOLUTION}.a-place-renamed`;
    const journal = {
      rows: [
        { key: `lit:${GONE}`, at: day(4), nodeId: GONE, title: 'Proved in a new case' },
        { key: `lasting:${GONE}`, at: day(12), nodeId: GONE, title: 'Lasting' },
        { key: `explored:${GONE}`, at: day(3), nodeId: GONE, title: '' },
        { key: `lit:${SELECTION}`, at: day(5), nodeId: SELECTION, title: 'Proved in a new case' },
      ],
      status: new Map([
        [GONE, { nodeId: GONE, litAt: day(4), lastingAt: day(12), ready: true }],
        [SELECTION, { nodeId: SELECTION, litAt: day(5) }],
      ]),
    } as unknown as Journal;
    const found = logRows({ journal, pieces: [], refreshes: new Map([[GONE, [day(12), day(20)]]]) });
    expect(found.map(row => row.title)).toEqual(['Natural selection']);
    expect(monthsOf(found)[0].proved).toEqual([SELECTION]);
    expect(todayLine(found, journal.status, new Set(), () => true)).toBeNull();
  });

  it('say how long a proof has held', () => {
    expect(heldFor(day(0), day(8))).toBe('a week');
    expect(heldFor(day(0), day(30))).toBe('a month');
    expect(heldFor(day(0), day(95))).toBe('three months');
    expect(heldFor(day(0), day(400))).toBe('a year');
  });

  it('name a film by its own verbs', () => {
    const input = learner();
    const film: LibraryEntry = { ...book('Q1', 'The Seventh Seal', [BLACK_DEATH.id], day(20)), id: 'wd-Q1', kind: 'film', format: 'Film', ids: { wd: 'Q1' } };
    let library = upsertEntry(input.library, film, day(20));
    library = setStatus(library, 'entry:wd-Q1', 'finished', day(22));
    const piece = piecesOf(buildJournal({ ...input, library }), NO_CONTEXT).find(p => p.title === 'The Seventh Seal')!;
    expect(thingVerb(piece)).toBe('Watched');
  });
});

describe('a book or film logged after it was finished', () => {
  // Kept on day 20 (an import, or added from memory), finished on day 2.
  const logged = (over: Partial<LibraryEntry>, now = NOW) => {
    const input = learner();
    const library = upsertEntry(input.library, { ...book('OL9W', 'The Selfish Gene', [DNA], day(20)), status: 'finished', startedAt: day(1), finishedAt: day(2), ...over }, day(20));
    const journal = buildJournal({ ...input, library });
    return logRows({ journal, pieces: piecesOf(journal, NO_CONTEXT), now }).filter(row => row.title === (over.title ?? 'The Selfish Gene'));
  };

  it('is filed on the day it was finished, under its finished word, never as Saved on the day it was logged', () => {
    expect(logged({})).toEqual([expect.objectContaining({ at: day(2), verb: 'Finished reading', shelf: 'book' })]);
    const film = logged({ id: 'wd-Q9', kind: 'film', format: 'Film', ids: { wd: 'Q9' }, title: 'The Seventh Seal' });
    expect(film).toEqual([expect.objectContaining({ at: day(2), verb: 'Watched', shelf: 'film' })]);
    const podcast = logged({ id: 'wd-Q8', kind: 'podcast', format: 'Podcast', ids: { wd: 'Q8' }, title: 'In Our Time' });
    expect(podcast).toEqual([expect.objectContaining({ at: day(2), verb: 'Listened' })]);
  });

  it('with no finished date, it stays where it was logged', () => {
    expect(logged({ finishedAt: undefined })).toEqual([expect.objectContaining({ at: day(20), verb: 'Finished reading' })]);
    expect(logged({ status: 'want', startedAt: undefined, finishedAt: undefined })).toEqual([expect.objectContaining({ at: day(20), verb: 'Saved' })]);
  });

  it('a finished date after now is filed today, as monthsOf files any future date', () => {
    const now = Date.parse(day(25));
    const rows = logged({ addedAt: day(30), createdAt: day(30), finishedAt: day(28) }, now);
    expect(rows).toEqual([expect.objectContaining({ at: new Date(now).toISOString(), verb: 'Finished reading' })]);
    expect(monthsOf(rows, now)[0].days[0].key).toBe(dayKey(new Date(now)));
  });
});

describe('places', () => {
  const { index, journal, begun, rows } = setup();
  const entry = (id: string) => allPlaces(index).find(e => e.id === id)!;

  it('are filed as the atlas files them: subjects, regions, a split region\u2019s fields, a field\u2019s places', () => {
    const order = catalog.getChildren(catalog.root).map(n => n.id);
    expect(index.map(s => s.id)).toEqual(order.filter(id => ['knowledge.science', 'knowledge.humanities', 'knowledge.arts'].includes(id)));
    expect(index.some(s => s.id === UNPLACED)).toBe(false);
    const science = index.find(s => s.id === 'knowledge.science')!;
    // In two of Biology's fields: Biology opens into them. Only in Mechanics in Physics: Physics stands as one.
    expect(science.regions.map(r => [r.entry.id, r.split])).toEqual([['knowledge.science.biology', true], [PHYSICS, false]]);
    expect(science.regions[0].entry.places.map(f => f.id)).toEqual([EVOLUTION, GENETICS]);
    expect(entry(EVOLUTION).places.map(p => p.id).sort()).toEqual([DEEP_TIME, SELECTION].sort());
    expect(entry('knowledge.science.biology').count).toBe(entry(EVOLUTION).count + entry(GENETICS).count);
    // Each place once.
    const ids = allPlaces(index).map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('say where each stands: proved, ready, begun, or what is kept', () => {
    expect(entry(SELECTION)).toMatchObject({ state: 'proved', status: expect.stringMatching(/^Proved /) });
    expect(entry(ACCELERATION)).toMatchObject({ state: 'ready', status: 'Ready to refresh' });
    expect(entry(DEEP_TIME)).toMatchObject({ state: 'begun' });
    expect(entry(EVOLUTION)).toMatchObject({ status: 'Natural selection proved', count: 3 });
    expect(entry(DNA)).toMatchObject({ state: 'kept', status: '2 things' });
  });

  it('carry one quiet next step: refresh only when ready, a case or the lesson where nothing is proved, none for a proved place not due', () => {
    expect(stepFor(ACCELERATION, journal.status, () => true, begun)).toEqual({ kind: 'refresh', nodeId: ACCELERATION });
    expect(stepFor(SELECTION, journal.status, () => true, begun)).toBeNull();
    expect(stepFor(DEEP_TIME, journal.status, () => true, begun)).toEqual({ kind: 'case', nodeId: DEEP_TIME });
    expect(stepFor(DEEP_TIME, journal.status, () => false, begun)).toMatchObject({ kind: 'lesson', nodeId: DEEP_TIME, packId: 'evolution-e06' });
    expect(stepFor(DNA, journal.status, () => true, begun)).toMatchObject({ kind: 'lesson', nodeId: DNA });
  });

  it('give a field the step where the learner left off inside it, never an arbitrary lesson', () => {
    const stepOf = (id: string) => stepFor(id, journal.status, () => true, begun);
    expect(stepWithin(entry(EVOLUTION), stepOf)).toEqual({ kind: 'case', nodeId: DEEP_TIME });
    expect(stepWithin(entry(GENETICS), stepOf)).toMatchObject({ kind: 'lesson', nodeId: DNA });
    expect(stepWithin(entry('knowledge.science.biology'), stepOf)).toEqual({ kind: 'case', nodeId: DEEP_TIME });
    expect(stepWithin(entry(SELECTION), stepOf)).toBeNull();
  });

  it('in a list, give each place its own step, and a field only its refreshes and where the learner left off', () => {
    const stepOf = (id: string) => stepFor(id, journal.status, () => true, begun);
    // A field found by search: where the learner left off inside it, never the first open lesson in bank order.
    expect(ownStep(entry(EVOLUTION), stepOf)).toEqual({ kind: 'case', nodeId: DEEP_TIME });
    expect(ownStep(entry(DNA), stepOf)).toMatchObject({ kind: 'lesson', nodeId: DNA });
    expect(ownStep(entry(SELECTION), stepOf)).toBeNull();
    expect([...placeSteps(entry(EVOLUTION), stepOf)]).toEqual([[DEEP_TIME, { kind: 'case', nodeId: DEEP_TIME }]]);
    const mechanics = allPlaces(index).find(e => e.places.some(p => p.id === ACCELERATION))!;
    expect(placeSteps(mechanics, stepOf).get(ACCELERATION)).toEqual({ kind: 'refresh', nodeId: ACCELERATION });
  });

  it('put what is ready to refresh at the head of today, else where the learner left off', () => {
    expect(todayLine(rows, journal.status, begun, () => true)).toEqual({ kind: 'ready', nodeIds: [ACCELERATION] });
    const quiet = setup({ ...learner(), content: content([]) });
    expect(todayLine(quiet.rows, quiet.journal.status, quiet.begun, () => true)).toEqual({ kind: 'step', step: { kind: 'case', nodeId: DEEP_TIME } });
    const empty = buildJournal({ ...learner(), exp: createExpeditionLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore() });
    expect(todayLine([], empty.status, new Set(), () => true)).toBeNull();
  });
});

describe('search', () => {
  const { rows, index } = setup();

  it('finds words by their beginnings, every word needed', () => {
    expect(wordsOf('Gödel, Escher & Bach')).toEqual(['godel', 'escher', 'bach']);
    expect(matchRank(['gene'], wordsOf('The Gene'), wordsOf('The Gene'))).toBe(0);
    expect(matchRank(['gene'], wordsOf('Genetics'), wordsOf('Genetics'))).toBe(1);
    // What the learner can see wins: a beginning in the title beats a whole word only in its place or notes.
    expect(matchRank(['gene'], wordsOf('Which genes switch on?'), wordsOf('Which genes switch on? Gene switches'))).toBe(1);
    expect(matchRank(['gene'], wordsOf('A sheep from an udder cell'), wordsOf('A sheep from an udder cell Gene switches'))).toBe(2);
    expect(matchRank(['moth'], wordsOf('She Has Her Mother\u2019s Laugh'), wordsOf('She Has Her Mother\u2019s Laugh'))).toBeLessThan(matchRank(['moth'], wordsOf('Ninety-eight in a hundred'), wordsOf('Ninety-eight in a hundred moth'))!);
    expect(matchRank(['gene'], wordsOf('Dolly the sheep'), wordsOf('Dolly the sheep Genetics'))).toBe(3);
    expect(matchRank(['gene', 'plague'], wordsOf('The Gene'), wordsOf('The Gene'))).toBeNull();
    expect(matchRank([], [], [])).toBeNull();
  });

  it('"gene" finds Genetics things and places, whole words first, and never the spine order', () => {
    const found = searchLibrary('gene', rows, index);
    expect(found.places.map(p => p.id)).toContain(GENETICS);
    const titles = found.rows.map(row => row.title);
    expect(titles[0]).toBe('The Gene');
    expect(titles).toContain('If every cell has the same genome, what decides which genes switch on?');
    // Proofs are not things: the place stands for them.
    expect(found.rows.every(row => ['thing', 'stuck', 'changed', 'collection'].includes(row.kind))).toBe(true);
    expect(searchLibrary('   ', rows, index)).toEqual({ places: [], rows: [] });
    expect(searchLibrary('zzzz', rows, index).rows).toEqual([]);
  });
});
