import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../../core/evolution';
import type { NotebookEntry } from '../../core/notebook';
import { createCheckLedger, type CheckLedger } from '../../checks/ledger';
import type { CheckStatus } from '../../checks/progress';
import { createExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { createReelShelf, savePin } from '../../explore/pins';
import { buildJournal, type JournalContent, type JournalInput, type PlaceStatus } from '../../notebook/journal';
import { createLibraryStore, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import { piecesOf, type Piece } from '../library-c/mosaic';
import {
  activityOf, byAtlas, byTitle, chipOf, chipsFor, highlight, hayOf, letterOf, lettered, matchScore, placeAction, placeBook, proofLine, provedOrder, sortKey, stepWord, termsOf, things, wordsOf,
} from './model';

const SELECTION = evolutionTerritoryId('natural-selection');
const EVOLUTION = 'knowledge.science.biology.evolution';
const BIOLOGY = 'knowledge.science.biology';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const DNA = `${GENETICS}.dna`;
const DOMINANCE = `${GENETICS}.dominance`;
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const SCIENCE = 'knowledge.science';
const HARMONY = 'knowledge.arts.music.harmony';
const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 15)).toISOString();
const NOW = Date.parse(day(55));

const run = (id: string, packId: string, level: ExpeditionRun['level'], at: string): ExpeditionRun =>
  ({ id, packId, level, firstTry: { right: 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, at });
const content = (ready: string[] = []): JournalContent => ({
  checkSessions: () => [], describe: () => ({ given: '', key: '' }), packTitle: () => undefined, answerKey: () => undefined, caseWords: () => undefined,
  caseOffer: () => undefined, reels: [{ id: 'reel-moth', title: 'Ninety-eight in a hundred', nodeId: SELECTION, image: 'https://example.org/moth.jpg' }],
  refreshReady: nodeId => ready.includes(nodeId),
});
const question = (id: string, title: string, nodeIds: string[], at: string): NotebookEntry =>
  ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds, createdAt: at, updatedAt: at });
const book = (id: string, title: string, places: string[], at: string, kind: LibraryEntry['kind'] = 'book', format = 'Book'): LibraryEntry => ({
  id: kind === 'book' ? `ol-${id}` : `wd-${id}`, kind, format, title, creator: 'A. Writer', year: 1994, cover: kind === 'book' ? 12345 : null, ids: kind === 'book' ? { ol: id } : { wd: id }, subjects: [], tags: [],
  places: places.map(nodeId => ({ nodeId, score: 1 })), placesBy: 'you', status: 'want', addedAt: at, source: 'search', createdAt: at, updatedAt: at,
});

/** A learner with things in Genetics (DNA, Dominance and Genetics itself), Evolution, Physics and nowhere. */
function learner(): JournalInput {
  let library: LibraryStore = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Beak of the Finch', [SELECTION], day(1)), day(1));
  library = setStatus(library, 'entry:ol-OL1W', 'started', day(3));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', day(9));
  library = upsertEntry(library, book('OL2W', 'The Gene: An Intimate History', [DNA], day(4)), day(4));
  library = upsertEntry(library, book('OL4W', 'The Double Helix', [DNA], day(13)), day(13));
  library = upsertEntry(library, book('OL5W', 'Genome', [GENETICS], day(14)), day(14));
  library = upsertEntry(library, book('OL6W', "She Has Her Mother's Laugh", [DOMINANCE], day(15)), day(15));
  library = upsertEntry(library, book('OL3W', 'Six Easy Pieces', [ACCELERATION], day(5)), day(5));
  library = upsertEntry(library, book('Q190', 'Amadeus', [HARMONY], day(16), 'film', 'Film'), day(16));
  library = saveLink(library, { url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Why the moths turned dark', nodeId: SELECTION, preview: { title: 'Why the moths turned dark', description: '', siteName: 'PBS Eons', image: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', at: day(6) } });
  library = saveLink(library, { url: 'https://example.org/notes', note: 'Lecture notes', nodeId: null });
  let shelf = createReelShelf();
  shelf = savePin(shelf, 'reel-moth', [SELECTION], day(7));
  return {
    exp: { ...createExpeditionLedger(), runs: [run('r1', 'evolution-e03', 'Understood', day(10)), run('r2', 'music', 'Familiar', day(12)), run('r3', 'physics', 'Understood', day(2))] },
    checks: createCheckLedger(), entries: [question('n1', 'If every cell has the same genome, what decides which genes switch on?', [`${GENETICS}.gene-regulation`], day(11))],
    shelf, library, content: content([ACCELERATION]), now: NOW,
  };
}

const input = learner();
const journal = buildJournal(input);
const pieces = piecesOf(journal, { watchIds: null, watched: { abcdefghijk: day(8) }, reelsWatched: [] });
const activity = activityOf(input.exp, input.checks);
const shelfBook = placeBook(pieces, journal.status, activity);
const named = (title: string) => pieces.find(p => p.title === title)!;

describe('kinds', () => {
  it('files notes and questions under Notes, films under Films, and shows only the chips the learner has', () => {
    expect(chipOf(named('If every cell has the same genome, what decides which genes switch on?'))).toBe('note');
    expect(chipOf(named('Amadeus'))).toBe('film');
    expect(chipsFor(pieces, 2)).toEqual(['video', 'reel', 'book', 'film', 'link', 'note', 'proved']);
    expect(chipsFor(pieces.filter(p => p.kind === 'book'), 0)).toEqual(['book']);
  });

  it('says how far a thing got only once it moved past saved', () => {
    expect(stepWord(named('The Beak of the Finch'))).toBe('Read');
    expect(stepWord(named('The Double Helix'))).toBe('');
    expect(stepWord(named('Why the moths turned dark'))).toBe('Watched');
  });

  it('says Stopped for a book or film set down, begun or not (a did-not-finish row has no start date)', () => {
    let library = input.library;
    library = setStatus(library, 'entry:ol-OL2W', 'started', day(20));
    library = setStatus(library, 'entry:ol-OL2W', 'stopped', day(21));
    library = setStatus(library, 'entry:ol-OL4W', 'stopped', day(22));
    library = setStatus(library, 'entry:wd-Q190', 'started', day(23));
    library = setStatus(library, 'entry:wd-Q190', 'stopped', day(24));
    const now = piecesOf(buildJournal({ ...input, library }), { watchIds: null, watched: {}, reelsWatched: [] });
    const at = (title: string) => now.find(p => p.title === title)!;
    // Begun, so its stage reads started: the word must still be Stopped.
    expect(at('The Gene: An Intimate History').stage).toBe('started');
    expect(stepWord(at('The Gene: An Intimate History'))).toBe('Stopped');
    expect(stepWord(at('The Double Helix'))).toBe('Stopped');
    expect(stepWord(at('Amadeus'))).toBe('Stopped');
  });
});

describe('places', () => {
  it('count everything kept at a place and anywhere inside it, so a field never reads as less than its places', () => {
    expect(shelfBook.info(DNA).count).toBe(2);
    expect(shelfBook.info(DOMINANCE).count).toBe(1);
    // Genome on Genetics itself, two on DNA, one on Dominance, the question on Gene switches.
    expect(shelfBook.info(GENETICS).count).toBe(5);
    expect(shelfBook.info(BIOLOGY).count).toBe(shelfBook.info(GENETICS).count + shelfBook.info(EVOLUTION).count);
    expect(shelfBook.info(SCIENCE).count).toBe(pieces.filter(p => p.nodeIds[0]?.startsWith(`${SCIENCE}.`)).length);
  });

  it('lists a subject by its branches, each at the deepest place that still holds everything in it, in atlas order', () => {
    const fields = shelfBook.children(SCIENCE).map(p => p.id);
    // Biology holds two fields, so it stays Biology; Physics holds only Acceleration, and Evolution only
    // Natural selection, so each is drawn there. Genetics holds several places and things of its own.
    expect(fields).toEqual([ACCELERATION, BIOLOGY]);
    expect(shelfBook.children(BIOLOGY).map(p => p.id)).toEqual([GENETICS, SELECTION]);
    expect(shelfBook.children(GENETICS).map(p => p.id)).toEqual([DNA, DOMINANCE, `${GENETICS}.gene-regulation`].sort((a, b) => byAtlas(a, b)));
    expect(shelfBook.subjects().map(p => p.id)).toEqual([SCIENCE, 'knowledge.arts']);
  });

  it('keeps things with no place apart, and proof, lessons and checks make a place the learner’s', () => {
    expect(shelfBook.unplaced.map(p => p.title)).toEqual(['Lecture notes']);
    expect(shelfBook.info(SELECTION).proof).not.toBeNull();
    expect(shelfBook.info(HARMONY).begun).toBe(true);
    expect(shelfBook.info(EVOLUTION).provedInside).toBe(1);
  });

  it('puts narrow places on the shelf before a field or a subject, whose cover stands for nearly everything', () => {
    // The newest things of all kept on Biology itself and on Science itself.
    const wide = [...pieces, { ...named('Genome'), key: 'wide-1', nodeIds: [BIOLOGY], lastAt: day(50) }, { ...named('Genome'), key: 'wide-2', nodeIds: [SCIENCE], lastAt: day(51) }];
    const shelf = placeBook(wide, journal.status, activity).shelf(14).map(p => p.id);
    expect(shelf.slice(-2).sort()).toEqual([SCIENCE, BIOLOGY]);
    expect(shelf.indexOf(DOMINANCE)).toBeLessThan(shelf.indexOf(BIOLOGY));
  });

  it('puts a place ready to refresh first on the shelf and in the Proved list', () => {
    const shelf = shelfBook.shelf(14);
    expect(shelf[0].id).toBe(ACCELERATION);
    expect(shelf[0].proof?.ready).toBe(true);
    expect(provedOrder(shelfBook.proved(), 'refresh')[0].id).toBe(ACCELERATION);
    expect(provedOrder(shelfBook.proved(), 'az').map(p => p.name)).toEqual(['Acceleration', 'Natural selection']);
  });

  it('remembers when a lesson or check last ran at each place', () => {
    expect(activity.get(HARMONY)).toBe(day(12));
    const checks: CheckLedger = { ...createCheckLedger(), events: [{ t: 'finish', id: 'f1', session: 's1', node: DNA, items: [], at: day(20) }] };
    expect(activityOf(input.exp, checks).get(DNA)).toBe(day(20));
  });
});

describe('order', () => {
  it('files titles without their article, and numbers under #', () => {
    expect(sortKey('The Selfish Gene')).toBe('selfish gene');
    expect(sortKey('A Distant Mirror')).toBe('distant mirror');
    expect(letterOf('The Beak of the Finch')).toBe('B');
    expect(letterOf('1491')).toBe('#');
    const list = ['The Gene', 'Evolution', 'A Distant Mirror', 'The Double Helix', 'The Beak of the Finch'].map(title => ({ title }));
    expect([...list].sort(byTitle).map(t => t.title)).toEqual(['The Beak of the Finch', 'A Distant Mirror', 'The Double Helix', 'Evolution', 'The Gene']);
    expect(lettered(list).map(g => `${g.letter}${g.items.length}`)).toEqual(['B1', 'D2', 'E1', 'G1']);
  });
});

describe('search', () => {
  const terms = termsOf('gene');
  const score = (p: Piece) => matchScore(hayOf(p.title, [], [p.text, ...(p.nodeIds[0] ? ['Genetics & Genomes'] : [])]), terms);

  it('matches the start of any word, so "gene" finds genetics, genome and generations', () => {
    expect(matchScore(hayOf('Genetics & Genomes'), terms)).toBeGreaterThan(0);
    expect(matchScore(hayOf('How many generations does it take?'), terms)).toBeGreaterThan(0);
    expect(matchScore(hayOf('Engineering'), terms)).toBe(0);
    expect(matchScore(hayOf('Six Easy Pieces', ['A. Writer', 'Book', 'Acceleration'], ['Physics']), terms)).toBe(0);
  });

  it('ranks by where the hit can be seen: the title, then what the row prints, then words it never shows; whole words first within each', () => {
    const titleWhole = matchScore(hayOf('The Selfish Gene'), terms);
    const titleStart = matchScore(hayOf('Genetics & Genomes'), terms);
    const shownWhole = matchScore(hayOf('Book of the year', ['Gene']), terms);
    const shownStart = matchScore(hayOf('The Double Helix', ['Book', 'Genetics & Genomes']), terms);
    const hiddenWhole = matchScore(hayOf('A sheep from an udder cell', ['Reel', 'Cloning'], ['every gene in the udder cell was switched back on']), terms);
    const hiddenStart = matchScore(hayOf('Four letters were enough', ['Reel', 'DNA'], ['Genetics & Genomes']), terms);
    expect([titleWhole, titleStart, shownWhole, shownStart, hiddenWhole, hiddenStart]).toEqual([...[titleWhole, titleStart, shownWhole, shownStart, hiddenWhole, hiddenStart]].sort((a, b) => b - a));
    expect(new Set([titleWhole, titleStart, shownWhole, shownStart, hiddenWhole, hiddenStart]).size).toBe(6);
    // The review's case: a place whose name starts with the term comes before a thing whose only whole-word hit is out of sight.
    expect(titleStart).toBeGreaterThan(hiddenWhole);
    expect(score(named('The Gene: An Intimate History'))).toBeGreaterThan(score(named('The Double Helix')));
  });

  it('adds up every term, each at its best hit', () => {
    const both = matchScore(hayOf('Gene regulation'), termsOf('gene regulation'));
    const one = matchScore(hayOf('Gene switches', ['Gene regulation']), termsOf('gene regulation'));
    expect(both).toBeGreaterThan(one);
    expect(matchScore(hayOf('Gene switches', [], ['regulation']), termsOf('gene regulation'))).toBeGreaterThan(0);
  });

  it('needs every word, folds accents and case', () => {
    expect(wordsOf('Gödel, Escher')).toEqual(['godel', 'escher']);
    expect(matchScore(hayOf('Gödel, Escher, Bach'), termsOf('GODEL bach'))).toBeGreaterThan(0);
    expect(matchScore(hayOf('Gödel, Escher, Bach'), termsOf('godel mozart'))).toBe(0);
  });

  it('marks the matched start of each word', () => {
    const parts = highlight('The Selfish Gene', terms);
    expect(parts.filter(p => p.hit).map(p => p.text)).toEqual(['Gene']);
    expect(highlight('Genetics & Genomes', terms).filter(p => p.hit).map(p => p.text)).toEqual(['Gene']);
    expect(highlight('Genetics & Genomes', termsOf('gen')).filter(p => p.hit).map(p => p.text)).toEqual(['Gen', 'Gen']);
    expect(highlight('Genetics & Genomes', terms).map(p => p.text).join('')).toBe('Genetics & Genomes');
  });
});

describe('what a place offers', () => {
  const ready = (purpose: 'prove' | 'lasting' | 'refresh'): CheckStatus => ({ kind: 'ready', purpose, via: 'case' });
  it('offers a refresh only when one is ready, never on a proved place that is not due', () => {
    expect(placeAction(ready('refresh'), 'pack', true, true)).toEqual({ kind: 'refresh' });
    expect(placeAction(ready('lasting'), 'pack', true, true)).toEqual({ kind: 'refresh' });
    expect(placeAction({ kind: 'lasting', at: day(30), refreshAt: day(61) }, 'pack', true, true)).toBeNull();
    expect(placeAction({ kind: 'waiting', dueAt: day(60) }, 'pack', true, true)).toBeNull();
    expect(placeAction({ kind: 'exhausted' }, 'pack', true, true)).toBeNull();
  });

  it('offers the lesson, or a new case once the lesson was tried, while a place is not proved', () => {
    expect(placeAction(ready('prove'), 'pack', false, false)).toEqual({ kind: 'lesson', packId: 'pack' });
    expect(placeAction(ready('prove'), 'pack', true, false)).toEqual({ kind: 'case' });
    expect(placeAction(ready('prove'), null, false, false)).toEqual({ kind: 'case' });
    expect(placeAction({ kind: 'cooling', readyAt: day(58), purpose: 'prove' }, 'pack', true, false)).toEqual({ kind: 'lesson', packId: 'pack' });
    expect(placeAction({ kind: 'none' }, null, false, false)).toBeNull();
  });

  it('says where a proof stands', () => {
    const own: PlaceStatus = { nodeId: SELECTION, state: 'lasting', litAt: day(10), lastingAt: day(20), glow: 1, ready: false, readCount: 0 };
    const short = (iso: string) => iso.slice(5, 10);
    expect(proofLine({ kind: 'lasting', at: day(20), refreshAt: day(61) }, own, false, short, day(40))).toBe(`Lasting · proved ${short(day(40))} · refresh ${short(day(61))}`);
    expect(proofLine(ready('refresh'), own, false, short)).toBe(`Ready to refresh · proved ${short(day(20))}`);
    expect(proofLine({ kind: 'cooling', readyAt: day(58), purpose: 'prove' }, undefined, true, short)).toBe(`Begun · next try ${short(day(58))}`);
    expect(proofLine(null, undefined, false, short)).toBe('');
    expect(things(1)).toBe('1 thing');
    expect(things(9)).toBe('9 things');
  });
});
