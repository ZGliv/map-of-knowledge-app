import { describe, expect, it } from 'vitest';
import { catalog } from '../../core/catalog';
import { BLACK_DEATH } from '../../core/history';
import { evolutionTerritoryId } from '../../core/evolution';
import { createNotebook, upsertNotebookEntry, type NotebookEntry } from '../../core/notebook';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { createReelShelf, markWatched, savePin } from '../../explore/pins';
import { buildJournal, within, type JournalContent, type JournalInput } from '../../notebook/journal';
import { createLibraryStore, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import {
  areaOf, areasOf, begunPlaces, commonPlace, fieldOf, fieldPieces, fitMosaic, indexOf, layoutMosaic, matches, MOSAIC_MAX, piecesOf, placesOf, proofFor, recent,
  splitRegions, splitTiles, stageCap, tileMatch, tileName, titleFromUrl, UNPLACED, walks, type PieceContext,
} from './mosaic';

const SELECTION = evolutionTerritoryId('natural-selection');
const DEEP_TIME = evolutionTerritoryId('deep-time');
const EVOLUTION = 'knowledge.science.biology.evolution';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const DNA = `${GENETICS}.dna`;
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const MECHANICS = 'knowledge.science.physics.mechanics';
const PHYSICS = 'knowledge.science.physics';
const HARMONY = 'knowledge.arts.music.harmony';
const ASTRONOMY = 'knowledge.science.astronomy';
const PHILOSOPHY = 'knowledge.humanities.philosophy';
const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 15)).toISOString();
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

function learner(): JournalInput {
  let library: LibraryStore = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Beak of the Finch', [SELECTION], day(1)), day(1));
  library = setStatus(library, 'entry:ol-OL1W', 'started', day(3));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', day(9));
  library = upsertEntry(library, book('OL2W', 'The Gene', [DNA], day(4)), day(4));
  library = upsertEntry(library, book('OL3W', 'Six Easy Pieces', [PHYSICS], day(5)), day(5));
  library = saveLink(library, { url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Why the moths turned dark', nodeId: SELECTION, preview: { title: 'Why the moths turned dark', description: '', siteName: 'PBS Eons', image: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', at: day(6) } });
  library = saveLink(library, { url: 'https://example.org/notes', note: 'Lecture notes', nodeId: null });
  let shelf = createReelShelf();
  shelf = savePin(shelf, 'reel-moth', [SELECTION], day(7));
  return {
    exp: ledger(run('r1', 'evolution-e03', 'Understood', day(10)), run('r2', 'music', 'Familiar', day(12)), run('r3', 'physics', 'Understood', day(2))),
    checks: createCheckLedger(), entries: [note('n1', 'Why did the plague move so fast?', [BLACK_DEATH.id], day(11))], shelf, library, content: content([ACCELERATION]), now: NOW,
  };
}

const BEGUN = () => { const input = learner(); return begunPlaces(input.exp, input.checks); };

describe('pieces', () => {
  const journal = buildJournal(learner());
  const pieces = piecesOf(journal, { ...NO_CONTEXT, watched: { abcdefghijk: day(8) } });
  const byTitle = (title: string) => pieces.find(p => p.title === title)!;

  it('are only what the learner keeps: no catalog shelf works, no reels never kept, no places', () => {
    expect(pieces.map(p => p.kind).sort()).toEqual(['book', 'book', 'book', 'link', 'question', 'reel', 'video']);
  });

  it('walk saved → started → finished → proved, proved only once finished, by the place they were kept', () => {
    const finch = byTitle('The Beak of the Finch');
    expect(finch.stage).toBe('proved');
    expect(finch.dates).toEqual({ saved: day(1), started: day(3), finished: day(9), proved: day(10) });
    expect(byTitle('The Gene').stage).toBe('saved');
    // Kept on Physics, proved at Acceleration deep inside it: the book itself is not proved by that.
    expect(byTitle('Six Easy Pieces').stage).toBe('saved');
  });

  it('never light a step the learner did not take: kept in a proved place is still only saved', () => {
    // Saved after its place was proved, never opened.
    const input = learner();
    const late = buildJournal({ ...input, library: upsertEntry(input.library, book('OL9W', 'Late book', [SELECTION], day(30)), day(30)) });
    expect(piecesOf(late, NO_CONTEXT).find(p => p.title === 'Late book')!.stage).toBe('saved');
    // Started only: still reading, not proved.
    const started = buildJournal({ ...input, library: setStatus(upsertEntry(input.library, book('OL8W', 'Half read', [SELECTION], day(20)), day(20)), 'entry:ol-OL8W', 'started', day(21)) });
    expect(piecesOf(started, NO_CONTEXT).find(p => p.title === 'Half read')!.stage).toBe('started');
    // Finished after the proof: proved, but the proof is not dated before the finish.
    const finished = buildJournal({ ...input, library: setStatus(upsertEntry(input.library, book('OL7W', 'Read later', [SELECTION], day(20)), day(20)), 'entry:ol-OL7W', 'finished', day(31)) });
    const read = piecesOf(finished, NO_CONTEXT).find(p => p.title === 'Read later')!;
    expect(read.stage).toBe('proved');
    expect(read.dates.proved).toBeUndefined();
    // A reel kept in a proved place and never played: saved. Played through: proved.
    expect(byTitle('Ninety-eight in a hundred').stage).toBe('saved');
    const shelf = markWatched(input.shelf, 'reel-moth');
    const played = piecesOf(buildJournal({ ...input, shelf }), { ...NO_CONTEXT, reelsWatched: shelf.watched }).find(p => p.kind === 'reel')!;
    expect(played.stage).toBe('proved');
  });

  it('a link and a note keep only their day: no steps, never "proved"', () => {
    const input = learner();
    const library = saveLink(input.library, { url: 'https://en.wikipedia.org/wiki/Peppered_moth', note: 'The peppered moth', nodeId: SELECTION });
    const journal = buildJournal({ ...input, library, entries: [...input.entries, note('n2', 'Is selection a force?', [SELECTION], day(20))] });
    const all = piecesOf(journal, NO_CONTEXT);
    for (const title of ['The peppered moth', 'Is selection a force?']) {
      const piece = all.find(p => p.title === title)!;
      expect(piece.stage).toBe('saved');
      expect(walks(piece)).toBe(false);
    }
    expect(walks(byTitle('The Beak of the Finch'))).toBe(true);
  });

  it('knows a Watch video from a link, and when it was watched through', () => {
    const video = byTitle('Why the moths turned dark');
    expect(video.kind).toBe('video');
    expect(video.videoId).toBe('abcdefghijk');
    expect(video.dates.finished).toBe(day(8));
    expect(video.stage).toBe('proved');
    expect(byTitle('Lecture notes').kind).toBe('link');
    // Once the pool has loaded, a YouTube ID it does not hold is an ordinary link.
    expect(piecesOf(journal, { ...NO_CONTEXT, watchIds: new Set(['zzzzzzzzzzz']) }).find(p => p.videoId === null && p.title === 'Why the moths turned dark')?.kind).toBe('link');
  });

  it('drop a place the atlas no longer has: a reel kept there goes to its other place, or back to its own', () => {
    const gone = 'knowledge.a.place.the.atlas.dropped';
    expect(catalog.get(gone)).toBeUndefined();
    const reelUnder = (places: string[]) => piecesOf(buildJournal({ ...learner(), shelf: savePin(createReelShelf(), 'reel-moth', places, day(7)) }), NO_CONTEXT).find(p => p.kind === 'reel')!.nodeIds;
    expect(reelUnder([gone, DNA])).toEqual([DNA]);
    expect(reelUnder([gone])).toEqual([SELECTION]);
  });

  it('title a bare page from its address when that reads as words, and never print its site twice', () => {
    expect(titleFromUrl('https://en.wikipedia.org/wiki/Peppered_moth_evolution')).toBe('Peppered moth evolution');
    expect(titleFromUrl('https://example.org/2024/05/why-moths-turned-dark.html')).toBe('Why moths turned dark');
    for (const url of ['https://www.youtube.com/watch?v=abcdefghijk', 'https://youtu.be/abcdefghijk', 'https://example.org/', 'https://example.org/p/a1b2-c3d4', 'https://en.wikipedia.org/wiki/Evolution', 'not a url']) {
      expect(titleFromUrl(url), url).toBeNull();
    }
    let library = createLibraryStore();
    library = saveLink(library, { url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: '', nodeId: null });
    library = saveLink(library, { url: 'https://en.wikipedia.org/', note: '', nodeId: null });
    library = saveLink(library, { url: 'https://example.org/notes', note: 'Lecture notes', nodeId: null });
    const links = piecesOf(buildJournal({ ...learner(), library }), NO_CONTEXT).filter(p => p.kind === 'link');
    expect(links.map(p => `${p.title} | ${p.byline}`).sort()).toEqual(['Lecture notes | example.org', 'Peppered moth evolution | en.wikipedia.org', 'en.wikipedia.org | ']);
  });

  it('search needs every word, in titles, makers or place names', () => {
    expect(matches(byTitle('The Beak of the Finch'), 'finch natural')).toBe(true);
    expect(matches(byTitle('The Beak of the Finch'), 'finch plague')).toBe(false);
    expect(matches(byTitle('The Beak of the Finch'), '  ')).toBe(false);
  });

  it('Recent leads with the latest step anywhere', () => {
    const latest = recent(pieces);
    expect(latest.map(p => p.lastAt)).toEqual([...latest.map(p => p.lastAt)].sort().reverse());
    // The links were saved just now (saveLink stamps the clock); the plague question on day 11 is the newest of the rest.
    expect(latest.filter(p => p.kind !== 'link' && p.kind !== 'video')[0].title).toBe('Why did the plague move so fast?');
    expect(recent(pieces, 2)).toHaveLength(2);
  });
});

describe('areas: the fields', () => {
  const journal = buildJournal(learner());
  const pieces = piecesOf(journal, NO_CONTEXT);
  const areas = areasOf(journal, pieces, BEGUN());
  const area = (id: string) => areas.find(a => a.id === id)!;

  it('split a region only when the learner is in two of its fields', () => {
    expect(splitRegions([SELECTION, DNA])).toEqual(new Set(['knowledge.science.biology']));
    expect(splitRegions([SELECTION, DEEP_TIME])).toEqual(new Set());
    expect(areaOf(SELECTION, new Set(['knowledge.science.biology']))).toBe(EVOLUTION);
    expect(areaOf(SELECTION, new Set())).toBe('knowledge.science.biology');
    expect(areaOf(ACCELERATION, new Set())).toBe(PHYSICS);
    expect(areaOf('knowledge.science', new Set())).toBe('knowledge.science');
    expect(areaOf('knowledge', new Set())).toBeNull();
  });

  it('are one per field touched, by keeping, proving or beginning, never a default field', () => {
    expect(areas.map(a => a.id).sort()).toEqual([UNPLACED, 'knowledge.arts.music', GENETICS, EVOLUTION, 'knowledge.humanities.history', PHYSICS].sort());
    expect(area(EVOLUTION).pieces.map(p => p.title).sort()).toEqual(['Ninety-eight in a hundred', 'The Beak of the Finch', 'Why the moths turned dark']);
    expect(area(UNPLACED).pieces.map(p => p.title)).toEqual(['Lecture notes']);
    // Music holds nothing kept, only a lesson begun: still a field.
    expect(area('knowledge.arts.music').pieces).toEqual([]);
    expect(area('knowledge.arts.music').underway).toBe(1);
  });

  it('carry proof and freshness as marks', () => {
    expect(area(EVOLUTION).marks).toEqual([expect.objectContaining({ nodeId: SELECTION, litAt: day(10), ready: false })]);
    // Lit 53 days ago with no refresh since: its refresh is due, and content says there is one to do.
    expect(area(PHYSICS).marks).toEqual([expect.objectContaining({ nodeId: ACCELERATION, ready: true })]);
  });

  it('come only from where things were kept and what was begun: a video also tagged elsewhere makes no field there', () => {
    const input = learner();
    const library = saveLink(input.library, { url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', note: 'Moths and minds', nodeId: SELECTION, places: [PHILOSOPHY] });
    const journal = buildJournal({ ...input, library });
    expect(journal.status.get(PHILOSOPHY)?.state).toBe('underway');
    const ids = areasOf(journal, piecesOf(journal, NO_CONTEXT), BEGUN()).map(a => a.id);
    expect(ids).not.toContain(PHILOSOPHY);
    expect(ids).toContain(EVOLUTION);
  });

  it('are sized by what is there: the busiest field is the biggest, and empty learners have none', () => {
    expect(areas[0].id).toBe(EVOLUTION);
    expect(areasOf(buildJournal({ ...learner(), exp: createExpeditionLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore() }), [])).toEqual([]);
  });

  it('make at most so many tiles; the rest are an index grouped by subject, nothing folded into a catch-all', () => {
    const { tiles, rest } = splitTiles(areas, 4);
    expect(tiles.map(a => a.id)).toEqual(areas.slice(0, 4).map(a => a.id));
    expect(rest.map(a => a.id)).toEqual(areas.slice(4).map(a => a.id));
    expect(splitTiles(areas, 10).rest).toEqual([]);
    const index = indexOf(areas);
    const subjects = catalog.getChildren(catalog.root).map(n => n.id);
    // Subjects in the atlas's own order, unplaced last, every field once.
    expect(index.map(g => g.subjectId)).toEqual([...subjects.filter(id => index.some(g => g.subjectId === id)), UNPLACED]);
    expect(index.flatMap(g => g.entries.map(e => e.id)).sort()).toEqual(areas.map(a => a.id).sort());
  });
});

describe('places: inside a field', () => {
  it('are the deepest place holding everything in each branch', () => {
    expect(commonPlace([ACCELERATION, 'knowledge.science.physics.mechanics.motion'])).toBe('knowledge.science.physics.mechanics.motion');
    expect(commonPlace([ACCELERATION, MECHANICS])).toBe(MECHANICS);
    expect(commonPlace([ACCELERATION])).toBe(ACCELERATION);
  });

  it('hold what was kept in them; what was kept on the field itself is the field’s own, not a place', () => {
    const input = learner();
    const library = saveLink(input.library, { url: 'https://example.org/darwin', note: 'Darwin Online', nodeId: EVOLUTION });
    const journal = buildJournal({ ...input, library });
    const evolution = areasOf(journal, piecesOf(journal, NO_CONTEXT), BEGUN()).find(a => a.id === EVOLUTION)!;
    const places = placesOf(evolution, journal, BEGUN());
    expect(places.map(p => p.id)).toEqual([SELECTION]);
    expect(places[0].pieces).toHaveLength(3);
    expect(places[0].marks).toHaveLength(1);
    expect(fieldPieces(evolution).map(p => p.title)).toEqual(['Darwin Online']);
  });

  it('file a piece once, under the place it was kept, however many places it is tagged with', () => {
    const input = learner();
    let library = upsertEntry(input.library, book('OL5W', 'On the Origin of Species', [SELECTION, DEEP_TIME, evolutionTerritoryId('new-species'), evolutionTerritoryId('tree-thinking')], day(14)), day(14));
    library = setStatus(library, 'entry:ol-OL5W', 'started', day(15));
    const journal = buildJournal({ ...input, library });
    const evolution = areasOf(journal, piecesOf(journal, NO_CONTEXT), BEGUN()).find(a => a.id === EVOLUTION)!;
    const places = placesOf(evolution, journal, BEGUN());
    // Deep time, New species and Tree thinking are only tags: no tiles for them, and no second copy.
    expect(places.map(p => p.id)).toEqual([SELECTION]);
    expect(places.flatMap(p => p.pieces).filter(p => p.title === 'On the Origin of Species')).toHaveLength(1);
  });

  it('draw a deep lesson at its own place, and leave the field’s own book on the field', () => {
    const journal = buildJournal(learner());
    const physics = areasOf(journal, piecesOf(journal, NO_CONTEXT), BEGUN()).find(a => a.id === PHYSICS)!;
    const places = placesOf(physics, journal, BEGUN());
    expect(places.map(p => p.id)).toEqual([ACCELERATION]);
    expect(places[0].marks[0].ready).toBe(true);
    expect(fieldPieces(physics).map(p => p.title)).toEqual(['Six Easy Pieces']);
  });
});

describe('proof: every collection ends in one, from inside its own field', () => {
  const journal = buildJournal(learner());
  it('offers a due refresh first', () => {
    expect(proofFor([PHYSICS], journal.status, () => true)).toEqual({ kind: 'refresh', nodeId: ACCELERATION });
  });
  it('offers the lesson of a place not proved yet, or a case once it is begun', () => {
    expect(proofFor([GENETICS], journal.status, () => true)).toEqual({ kind: 'lesson', nodeId: DNA, packId: 'genetics-dna' });
    expect(proofFor([HARMONY], journal.status, () => true, BEGUN())).toEqual({ kind: 'case', nodeId: HARMONY });
    expect(proofFor([HARMONY], journal.status, () => false, BEGUN())).toEqual({ kind: 'lesson', nodeId: HARMONY, packId: 'music' });
    // A link merely kept on a place is not a lesson begun: it still opens on the lesson.
    expect(proofFor([HARMONY], journal.status, () => true)).toEqual({ kind: 'lesson', nodeId: HARMONY, packId: 'music' });
  });
  it('reaches out from a place to its field, and no further', () => {
    expect(proofFor([DEEP_TIME], journal.status, () => true)?.nodeId).toBe(DEEP_TIME);
    // Deep inside Mechanics, a place with no lesson of its own ends on the field's.
    expect(proofFor(['knowledge.science.physics.mechanics.motion'], journal.status, () => true)?.nodeId).toBe(ACCELERATION);
    // Animals has no lesson: Biology's Evolution lessons are another field's, so it ends on none.
    expect(proofFor(['knowledge.science.biology.animals'], journal.status, () => true)).toBeNull();
    expect(proofFor(['knowledge.economics.markets'], journal.status, () => true)).toBeNull();
  });
  it('never hands a field without a lesson someone else’s: Astronomy is not Evolution, Philosophy is not the Black Death', () => {
    const astronomy = proofFor([ASTRONOMY], journal.status, () => true);
    expect(astronomy === null || !within(astronomy.nodeId, EVOLUTION)).toBe(true);
    expect(astronomy).toBeNull();
    const philosophy = proofFor([PHILOSOPHY], journal.status, () => true);
    expect(philosophy?.nodeId).not.toBe(BLACK_DEATH.id);
    expect(philosophy).toBeNull();
    // A subject is too wide to stand for any one lesson.
    expect(proofFor(['knowledge.science'], journal.status, () => true)).toBeNull();
    expect(proofFor(['knowledge.humanities'], journal.status, () => true)).toBeNull();
  });
  it('for every place in the atlas, comes from inside that place’s own field or not at all', () => {
    for (const node of catalog.all()) {
      const proof = proofFor([node.id], journal.status, () => true);
      if (node.depth < 2) expect(proof).toBeNull();
      else if (proof) expect(within(proof.nodeId, fieldOf(node.id)), `${node.id} → ${proof.nodeId}`).toBe(true);
    }
  });
  it('offers a new case on a proved place, then the lesson again', () => {
    expect(proofFor([SELECTION], journal.status, () => true)).toEqual({ kind: 'case', nodeId: SELECTION });
    expect(proofFor([SELECTION], journal.status, () => false)).toEqual({ kind: 'again', nodeId: SELECTION, packId: 'evolution-e03' });
  });
});

describe('search over tiles', () => {
  const journal = buildJournal(learner());
  const areas = areasOf(journal, piecesOf(journal, NO_CONTEXT), BEGUN());
  it('lights a tile by its things or its own name', () => {
    const evolution = areas.find(a => a.id === EVOLUTION)!;
    expect(tileMatch(evolution, 'finch').pieces.map(p => p.title)).toEqual(['The Beak of the Finch']);
    expect(tileMatch(evolution, 'evolution').hit).toBe(true);
    expect(tileMatch(areas.find(a => a.id === PHYSICS)!, 'finch').hit).toBe(false);
  });
});

describe('the mosaic layout', () => {
  const tiles = [{ id: 'a', weight: 8 }, { id: 'b', weight: 4 }, { id: 'c', weight: 2 }, { id: 'd', weight: 1 }];
  const boxes = layoutMosaic(tiles, 343, 420, 6);
  const area = (id: string) => { const b = boxes.find(x => x.id === id)!; return b.w * b.h; };
  it('fills the frame with one box per tile, sized by weight, none overlapping', () => {
    expect(boxes.map(b => b.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(area('a')).toBeGreaterThan(area('b'));
    expect(area('b')).toBeGreaterThan(area('c'));
    expect(area('c')).toBeGreaterThanOrEqual(area('d'));
    for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(343); expect(b.y + b.h).toBeLessThanOrEqual(420); }
    for (const p of boxes) for (const q of boxes) if (p !== q) expect(p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y).toBe(true);
  });
  it('leads with the biggest tile at the top left', () => {
    expect(boxes.find(b => b.x === 0 && b.y === 0)?.id).toBe('a');
  });
  it('stands only as tall as a few tiles need', () => {
    expect(stageCap(1, true)).toBeLessThan(200);
    expect(stageCap(2, true)!).toBeGreaterThan(stageCap(1, true)!);
    expect(stageCap(MOSAIC_MAX.phone, true)).toBeNull();
    expect(stageCap(MOSAIC_MAX.desktop, false)).toBeNull();
  });
  it('is empty without tiles or room', () => {
    expect(layoutMosaic([], 300, 300)).toEqual([]);
    expect(layoutMosaic(tiles, 0, 300)).toEqual([]);
  });
});

/** A learner with 500 things spread across the whole atlas, as an import would bring: links and notes through the stores' own functions. */
function fiveHundred(): JournalInput {
  const nodes = catalog.all().filter(n => n.depth >= 3);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let library = createLibraryStore();
  let notebook = createNotebook();
  for (let i = 0; i < 500; i++) {
    const node = nodes[Math.floor(random() * nodes.length)];
    if (random() < 0.8) library = saveLink(library, { url: `https://example.org/${i}`, note: `Notes on ${node.name} ${i}`, nodeId: node.id });
    else notebook = upsertNotebookEntry(notebook, { title: `Why does ${node.name.toLowerCase()} work, case ${i}?`, body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: [node.id] });
  }
  return { exp: createExpeditionLedger(), checks: createCheckLedger(), entries: notebook.entries, shelf: createReelShelf(), library, content: content(), now: NOW };
}

describe('500 things, everywhere', () => {
  const journal = buildJournal(fiveHundred());
  const pieces = piecesOf(journal, NO_CONTEXT);
  const areas = areasOf(journal, pieces);
  const named = (box: { w: number; h: number }, name: string) => tileName(box, name, true).fits;

  it('spread over many fields', () => {
    expect(pieces).toHaveLength(500);
    expect(areas.length).toBeGreaterThan(40);
  });
  for (const [name, max, w, h] of [['phone', MOSAIC_MAX.phone, 343, 440], ['desktop', MOSAIC_MAX.desktop, 960, 650]] as const) {
    it(`on a ${name}: at most ${max} tiles, each with its whole name and room under it; every other field is in the index`, () => {
      const { tiles, rest } = splitTiles(areas, max);
      expect(tiles).toHaveLength(max);
      const { boxes, dropped } = fitMosaic(tiles.map(a => ({ ...a, nodeId: a.id })), w, h, 6);
      expect(boxes.length).toBeGreaterThanOrEqual(max - 2);
      for (const box of boxes) expect(named(box, tiles.find(t => t.id === box.id)!.name), `${box.id} in ${box.w}×${box.h}`).toBe(true);
      // No tile is a catch-all: each is one field, and none is more than a third of the frame.
      expect(boxes.every(b => areas.some(a => a.id === b.id))).toBe(true);
      expect(Math.max(...boxes.map(b => b.w * b.h))).toBeLessThan(w * h / 3);
      expect(indexOf([...rest, ...dropped]).flatMap(g => g.entries)).toHaveLength(areas.length - boxes.length);
    });
  }
  it('a field that big opens on its places the same way: tiles that name themselves, then an index', () => {
    const biggest = areas[0];
    const places = placesOf(biggest, journal);
    const { tiles } = splitTiles(places, 6);
    const { boxes } = fitMosaic(tiles.map(p => ({ ...p, nodeId: p.id })), 343, 400, 6);
    expect(boxes.length).toBeGreaterThanOrEqual(3);
    for (const box of boxes) expect(named(box, tiles.find(t => t.id === box.id)!.name), `${box.id} in ${box.w}×${box.h}`).toBe(true);
    expect(new Set(places.flatMap(p => p.pieces.map(x => x.key))).size).toBe(places.flatMap(p => p.pieces).length);
  });
  it('a name too long for any tile still leaves the mosaic rather than breaking a word', () => {
    const { boxes, dropped } = fitMosaic([{ id: 'a', weight: 9, name: 'Short', nodeId: null }, { id: 'b', weight: 1, name: 'Electroencephalographically', nodeId: null }], 160, 120, 6);
    expect(boxes.map(b => b.id)).toEqual(['a']);
    expect(dropped.map(t => t.id)).toEqual(['b']);
  });
});
