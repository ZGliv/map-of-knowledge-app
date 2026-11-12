import { describe, expect, it, vi } from 'vitest';
import { BLACK_DEATH } from '../../core/history';
import { evolutionTerritoryId } from '../../core/evolution';
import type { NotebookEntry } from '../../core/notebook';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { createReelShelf, savePin } from '../../explore/pins';
import { buildJournal, within, type JournalContent, type JournalInput } from '../../notebook/journal';
import { createLibraryStore, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import type { Collection } from '../library-c/collections';
import { begunPlaces, piecesOf, splitRegions, touchedBy, UNPLACED } from '../library-c/mosaic';
import {
  atlasRank, collectionOrder, excerptOf, fieldsOf, groupsOf, hitOf, indexOf, issueOf, leadOf, markParts, pageOf, PHONE_CAPS, searchEdition, sectionOf, SECTIONS_MAX, standingIn, stepFor, whyOf, wordsOf,
  type EditionInput,
} from './edition';

const SELECTION = evolutionTerritoryId('natural-selection');
const DEEP_TIME = evolutionTerritoryId('deep-time');
const EVOLUTION = 'knowledge.science.biology.evolution';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const DNA = `${GENETICS}.dna`;
const DOMINANCE = `${GENETICS}.dominance`;
const PHYSICS = 'knowledge.science.physics';
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const MUSIC = 'knowledge.arts.music';
const HARMONY = `${MUSIC}.harmony`;
const HISTORY = 'knowledge.humanities.history';
const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 15)).toISOString();
const NOW = Date.parse(day(60));

/** Store code stamps its own time: run it at this moment. */
const at = <T,>(iso: string, fn: () => T): T => { vi.useFakeTimers(); vi.setSystemTime(new Date(iso)); try { return fn(); } finally { vi.useRealTimers(); } };
const run = (id: string, packId: string, level: ExpeditionRun['level'], at: string): ExpeditionRun =>
  ({ id, packId, level, firstTry: { right: 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, at });
const ledger = (...runs: ExpeditionRun[]): ExpeditionLedger => ({ ...createExpeditionLedger(), runs });
const content = (ready: string[] = []): JournalContent => ({
  checkSessions: () => [], describe: () => ({ given: '', key: '' }), packTitle: () => undefined, answerKey: () => undefined, caseWords: () => undefined,
  caseOffer: () => undefined, refreshReady: nodeId => ready.includes(nodeId),
  reels: [
    { id: 'reel-moth', title: 'Ninety-eight in a hundred', nodeId: SELECTION, image: 'https://example.org/moth.jpg' },
    { id: 'reel-ships', title: 'Ships beat roads', nodeId: BLACK_DEATH.id, image: 'https://example.org/ships.jpg' },
  ],
});
const entry = (id: string, kind: 'idea' | 'question', title: string, nodeIds: string[], at: string): NotebookEntry =>
  ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind, evidence: 'encountered', nodeIds, createdAt: at, updatedAt: at });
const book = (id: string, title: string, places: string[], at: string): LibraryEntry => ({
  id: `ol-${id}`, kind: 'book', format: 'Book', title, creator: 'A. Writer', year: 1994, cover: 12345, ids: { ol: id }, subjects: [], tags: [],
  places: places.map(nodeId => ({ nodeId, score: 1 })), placesBy: 'you', status: 'want', addedAt: at, source: 'search', createdAt: at, updatedAt: at,
});

function learner(extra: (library: LibraryStore) => LibraryStore = l => l): JournalInput {
  let library: LibraryStore = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Beak of the Finch', [SELECTION], day(40)), day(40));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', day(45));
  library = upsertEntry(library, book('OL2W', 'The Gene', [DNA], day(50)), day(50));
  library = upsertEntry(library, book('OL4W', 'The Selfish Gene', [SELECTION], day(52)), day(52));
  library = setStatus(library, 'entry:ol-OL4W', 'started', day(53));
  library = upsertEntry(library, book('OL3W', 'Six Easy Pieces', [ACCELERATION], day(5)), day(5));
  library = at(day(54), () => saveLink(library, { url: 'https://www.youtube.com/watch?v=abcdefghijk', note: 'Why the moths turned dark', nodeId: SELECTION, preview: { title: 'Why the moths turned dark', description: '', siteName: 'PBS Eons', image: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', at: day(54) } }));
  library = at(day(20), () => saveLink(library, { url: 'https://example.org/notes', note: 'Lecture notes on general relativity', nodeId: null }));
  library = at(day(30), () => saveLink(library, { url: 'https://example.org/harmony', note: 'Harmonic series', nodeId: HARMONY }));
  library = extra(library);
  let shelf = createReelShelf();
  shelf = savePin(shelf, 'reel-moth', [SELECTION], day(55));
  shelf = savePin(shelf, 'reel-ships', [BLACK_DEATH.id], day(57));
  return {
    exp: ledger(run('r1', 'evolution-e03', 'Understood', day(44)), run('r2', 'evolution-e06', 'Familiar', day(56)), run('r3', 'physics', 'Understood', day(2)), run('r4', 'genetics-dominance', 'Understood', day(51))),
    checks: createCheckLedger(),
    entries: [
      entry('n1', 'question', 'Why did the plague travel faster by sea than by road?', [BLACK_DEATH.id], day(58)),
      entry('n2', 'idea', 'Selection only sorts what is already there.', [SELECTION], day(46)),
      entry('n3', 'question', 'How many generations make a new species?', [SELECTION], day(48)),
    ],
    shelf, library, content: content([DOMINANCE]), now: NOW,
  };
}

function edition(input = learner()) {
  const journal = buildJournal(input);
  const pieces = piecesOf(journal, { watchIds: null, watched: {}, reelsWatched: [] });
  const begun = begunPlaces(input.exp, input.checks);
  const activity = new Map(input.exp.runs.map(r => [r.packId === 'physics' ? ACCELERATION : r.packId === 'evolution-e03' ? SELECTION : r.packId === 'evolution-e06' ? DEEP_TIME : DOMINANCE, r.at]));
  const edition: EditionInput = { pieces, status: journal.status, begun, split: splitRegions(touchedBy(journal, pieces, begun)), activity };
  return { journal, pieces, begun, input: edition, fields: fieldsOf(edition) };
}

describe('fields', () => {
  it('stand in the atlas’s own order, things not placed last, whatever was touched last', () => {
    const { fields } = edition();
    expect(fields.map(f => f.id)).toEqual([PHYSICS, GENETICS, EVOLUTION, HISTORY, MUSIC, UNPLACED]);
    // Something new in Music moves nothing.
    const later = edition(learner(l => at(day(59), () => saveLink(l, { url: 'https://example.org/fifths', note: 'Circle of fifths', nodeId: HARMONY }))));
    expect(later.fields.map(f => f.id)).toEqual(fields.map(f => f.id));
  });

  it('know what is proved and begun in them', () => {
    const { fields } = edition();
    const evolution = fields.find(f => f.id === EVOLUTION)!;
    expect(evolution.standing.begun).toEqual([DEEP_TIME]);
    expect(evolution.standing.proved).toEqual([SELECTION]);
  });

  it('keep a due refresh apart from proved: never both lines for one place', () => {
    const { journal, begun } = edition();
    const genetics = standingIn(GENETICS, journal.status, begun);
    expect(genetics.ready).toEqual([DOMINANCE]);
    expect(genetics.proved).toEqual([]);
  });

  it('never hold a thing twice: a region kept as a field of its own holds only what its split fields do not', () => {
    const MECHANICS = 'knowledge.science.physics.mechanics';
    const THERMO = 'knowledge.science.physics.thermodynamics';
    const { fields } = edition(learner(l => at(day(59), () => saveLink(saveLink(saveLink(l, { url: 'https://example.org/heat', note: 'Heat engines', nodeId: THERMO }), { url: 'https://example.org/physics', note: 'What physics is', nodeId: PHYSICS }), { url: 'https://example.org/motion', note: 'Motion', nodeId: MECHANICS }))));
    const ids = fields.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining([PHYSICS, MECHANICS, THERMO]));
    const keys = fields.flatMap(f => f.pieces.map(p => p.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(fields.find(f => f.id === PHYSICS)!.pieces.map(p => p.title)).toEqual(['What physics is']);
    expect(fields.flatMap(f => [...f.standing.ready, ...f.standing.proved, ...f.standing.begun]).filter(id => id === ACCELERATION)).toHaveLength(1);
  });

  it('open any subject, field or place the learner has as a page of everything inside it, and nothing they do not', () => {
    const { input } = edition();
    expect(pageOf(SELECTION, input)!.pieces.map(p => p.title)).toContain('The Beak of the Finch');
    expect(pageOf(UNPLACED, input)!.pieces.map(p => p.title)).toEqual(['Lecture notes on general relativity']);
    expect(pageOf('knowledge.earth.oceans', input)).toBeNull();
    // Biology holds both of its fields' things; a place proved but holding nothing still has its page.
    const biology = pageOf('knowledge.science.biology', input)!;
    expect(biology.pieces.map(p => p.title)).toEqual(expect.arrayContaining(['The Gene', 'The Beak of the Finch']));
    expect(pageOf(DEEP_TIME, input)!.standing.begun).toEqual([DEEP_TIME]);
  });

  it('set a region’s page out under its fields and a field’s under its places, in atlas order', () => {
    const { input } = edition();
    expect(groupsOf(pageOf('knowledge.science.biology', input)!).map(g => g.id)).toEqual([GENETICS, EVOLUTION]);
    expect(groupsOf(pageOf(GENETICS, input)!).map(g => g.id)).toEqual([DNA]);
    expect(groupsOf(pageOf(PHYSICS, input)!).map(g => g.id)).toEqual(['knowledge.science.physics.mechanics']);
  });

  it('a split region’s page still holds everything in it, however the issue splits it', () => {
    const MECHANICS = 'knowledge.science.physics.mechanics';
    const THERMO = 'knowledge.science.physics.thermodynamics';
    const { input } = edition(learner(l => at(day(59), () => saveLink(saveLink(l, { url: 'https://example.org/heat', note: 'Heat engines', nodeId: THERMO }), { url: 'https://example.org/physics', note: 'What physics is', nodeId: PHYSICS }))));
    expect(input.split.has(PHYSICS)).toBe(true);
    expect(pageOf(PHYSICS, input)!.pieces.map(p => p.title).sort()).toEqual(['Heat engines', 'Six Easy Pieces', 'What physics is']);
    expect(groupsOf(pageOf(PHYSICS, input)!).map(g => g.id)).toEqual([PHYSICS, MECHANICS, THERMO]);
  });
});

describe('the issue', () => {
  it('leads with the newest question, a picture from its own place, and keeps those off the sections', () => {
    const { fields, pieces, input } = edition();
    const issue = issueOf(fields, pieces, input.split, PHONE_CAPS);
    expect(issue.lead!.head.title).toBe('Why did the plague travel faster by sea than by road?');
    expect(issue.lead!.picture!.title).toBe('Ships beat roads');
    const onPage = issue.sections.flatMap(s => [s.feature, s.quote, s.question, ...s.briefs, ...s.reading]).filter(Boolean).map(p => p!.key);
    expect(onPage).not.toContain(issue.lead!.head.key);
    expect(new Set(onPage).size).toBe(onPage.length);
  });

  it('with no question, leads with the newest thing kept', () => {
    const input = learner();
    const { pieces, input: e } = edition({ ...input, entries: input.entries.filter(n => n.kind !== 'question') });
    expect(leadOf(pieces, e.split)!.head.title).toBe('Ships beat roads');
  });

  it('lets a question lead only while it is fresh: asked within two weeks of the latest thing kept', () => {
    const input = learner();
    const old = { ...input, entries: input.entries.filter(n => n.kind !== 'question').concat(entry('n9', 'question', 'An old question', [SELECTION], day(20))) };
    const { pieces, input: e } = edition(old);
    expect(leadOf(pieces, e.split)!.head.title).toBe('Ships beat roads');
  });

  it('a step dated after now (a clock ahead, a mistyped date read) counts as now: the issue keeps its sections', () => {
    const { fields, pieces, input } = edition();
    const before = issueOf(fields, pieces, input.split, PHONE_CAPS, NOW);
    const ahead = learner(l => setStatus(upsertEntry(l, book('OL9W', 'A book from the future', [HARMONY], day(59)), day(59)), 'entry:ol-OL9W', 'finished', '2030-01-01T00:00:00.000Z'));
    const later = edition(ahead);
    expect(later.pieces.find(p => p.title === 'A book from the future')!.lastAt).toBe('2030-01-01T00:00:00.000Z');
    const issue = issueOf(later.fields, later.pieces, later.input.split, PHONE_CAPS, NOW);
    // Every field that had a section still has one; Music, where it was kept, joins them.
    expect(issue.sections.map(s => s.field.id)).toEqual([...before.sections.map(s => s.field.id), MUSIC].sort((a, b) => atlasRank(a) - atlasRank(b)));
    // The fresh question still leads: two weeks are counted back from now, not from 2030.
    expect(issue.lead!.head.title).toBe(before.lead!.head.title);
    // Unclamped (no now given), the 2030 date would have emptied the issue but for its own field.
    expect(issueOf(later.fields, later.pieces, later.input.split, PHONE_CAPS).sections.map(s => s.field.id)).toEqual([MUSIC]);
  });

  it('gives a section to each field touched within two weeks of the latest step, in atlas order; the rest wait at the back', () => {
    const { fields, pieces, input } = edition();
    const issue = issueOf(fields, pieces, input.split, PHONE_CAPS);
    expect(issue.sections.map(s => s.field.id)).toEqual([GENETICS, EVOLUTION]);
    expect(issue.back.map(f => f.id)).toEqual([PHYSICS, MUSIC, UNPLACED]);
    expect(issue.ready).toEqual([DOMINANCE]);
  });

  it('holds at most six sections, the fields touched most recently, still in atlas order; a field only joins or leaves', () => {
    const places = ['knowledge.science.chemistry', 'knowledge.earth.geology', 'knowledge.mathematics', 'knowledge.economics', 'knowledge.science.astronomy', 'knowledge.arts.architecture', 'knowledge.technology.engineering', 'knowledge.society.psychology'];
    const busy = (upTo: number) => learner(l => places.slice(0, upTo).reduce((lib, nodeId, i) => at(day(52 + i), () => saveLink(lib, { url: `https://example.org/${i}`, note: `Saved in ${nodeId}`, nodeId })), l));
    const { fields, pieces, input } = edition(busy(places.length));
    const issue = issueOf(fields, pieces, input.split, PHONE_CAPS);
    expect(issue.sections).toHaveLength(SECTIONS_MAX);
    const ids = issue.sections.map(s => s.field.id);
    expect([...ids].sort((a, b) => atlasRank(a) - atlasRank(b))).toEqual(ids);
    // Genetics, last touched on day 51, is not among the six touched last: it waits at the back.
    expect(ids).not.toContain(GENETICS);
    expect(issue.back.map(f => f.id)).toContain(GENETICS);
    // Every field is in a section or at the back, but for History: everything in it is the cover story.
    expect(fields.map(f => f.id).filter(id => !ids.includes(id) && !issue.back.some(f => f.id === id))).toEqual([HISTORY]);
  });

  it('features a reel, a page or a cover before a video’s frame, and a video only when nothing else has a picture', () => {
    const video = (id: string, nodeId: string, when: number) => (l: LibraryStore) => at(day(when), () => saveLink(l, { url: `https://www.youtube.com/watch?v=${id}`, note: `Video ${id}`, nodeId, preview: { title: `Video ${id}`, description: '', siteName: 'A channel', image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, at: day(when) } }));
    const { fields } = edition(learner(l => video('zzzzzzzzzz1', SELECTION, 59)(l)));
    // Evolution has a newer video, but its reel leads.
    expect(sectionOf(fields.find(f => f.id === EVOLUTION)!, new Set(), PHONE_CAPS).feature!.kind).toBe('reel');
    // Genetics has a book with a cover and nothing else pictured: the cover leads.
    expect(sectionOf(fields.find(f => f.id === GENETICS)!, new Set(), PHONE_CAPS).feature!.title).toBe('The Gene');
    // Archaeology has only a video: it leads.
    const { fields: only } = edition(learner(l => video('yyyyyyyyyy1', 'knowledge.humanities.archaeology', 59)(l)));
    expect(sectionOf(only.find(f => f.id === 'knowledge.humanities.archaeology')!, new Set(), PHONE_CAPS).feature!.kind).toBe('video');
  });

  it('cuts every section from one template: a pictured feature, the note as a quote, briefs, books reading first, a question', () => {
    const { fields } = edition();
    const section = sectionOf(fields.find(f => f.id === EVOLUTION)!, new Set(), PHONE_CAPS);
    expect(section.feature!.kind).toBe('reel');
    expect(section.quote!.title).toBe('Selection only sorts what is already there.');
    expect(section.briefs.map(p => p.title)).toEqual(['Why the moths turned dark']);
    expect(section.reading.map(p => p.title)).toEqual(['The Selfish Gene', 'The Beak of the Finch']);
    expect(section.question!.title).toBe('How many generations make a new species?');
    expect(section.more).toBe(0);
  });

  it('indexes as the atlas nests: subject, its fields, the fields inside them, then the places inside those', () => {
    const { input } = edition();
    const index = indexOf(input);
    expect(index.map(g => g.name)).toEqual(['Science', 'Humanities', 'Arts', 'Not placed yet']);
    const science = index[0];
    expect(science.rows.map(r => [r.name, r.level])).toEqual([
      ['Physics', 0], ['Mechanics', 1], ['Acceleration', 2],
      ['Biology', 0], ['Genetics & Genomes', 1], ['DNA', 2], ['Dominance', 2], ['Evolution', 1], ...science.rows.filter(r => r.level === 2 && within(r.id, EVOLUTION)).map(r => [r.name, 2]),
    ]);
    expect(science.rows.find(r => r.id === 'knowledge.science.biology')!.count).toBe(science.rows.filter(r => r.level === 1 && within(r.id, 'knowledge.science.biology')).reduce((n, r) => n + r.count, 0));
    expect(science.rows.find(r => r.id === DOMINANCE)!.standing).toBe('ready');
    expect(science.rows.find(r => r.id === DEEP_TIME)!.standing).toBe('begun');
    expect(index.at(-1)!.count).toBe(1);
  });

  it('never reshapes the index when the issue splits a region: a new field joins as a sibling, nothing moves', () => {
    const THERMO = 'knowledge.science.physics.thermodynamics';
    const before = indexOf(edition().input)[0].rows.map(r => r.id);
    const after = indexOf(edition(learner(l => at(day(59), () => saveLink(l, { url: 'https://example.org/heat', note: 'Heat engines', nodeId: THERMO })))).input)[0].rows.map(r => r.id);
    expect(after.filter(id => id !== THERMO)).toEqual(before);
    const rows = indexOf(edition(learner(l => at(day(59), () => saveLink(l, { url: 'https://example.org/heat', note: 'Heat engines', nodeId: THERMO })))).input)[0].rows;
    expect(rows.find(r => r.id === THERMO)!.level).toBe(1);
    expect(within(rows[rows.findIndex(r => r.id === THERMO) - 1].id, PHYSICS)).toBe(true);
  });

  it('lists the back of the issue under its subjects, a split field under its region', () => {
    const MECHANICS = 'knowledge.science.physics.mechanics';
    const { input } = edition();
    expect(indexOf(input, new Set([MECHANICS, MUSIC, UNPLACED])).map(g => [g.name, g.rows.map(r => [r.name, r.level])])).toEqual([
      ['Science', [['Physics', 0], ['Mechanics', 1]]], ['Arts', [['Music', 0]]], ['Not placed yet', []],
    ]);
  });
});

describe('a place’s name opens', () => {
  it('a due refresh, a begun place’s case (or its lesson when no case is left), a proved place on the atlas', () => {
    expect(stepFor(DOMINANCE, 'ready', () => false)).toEqual({ kind: 'refresh', nodeId: DOMINANCE });
    expect(stepFor(DEEP_TIME, 'begun', () => true)).toEqual({ kind: 'case', nodeId: DEEP_TIME });
    expect(stepFor(DEEP_TIME, 'begun', () => false)).toEqual({ kind: 'lesson', nodeId: DEEP_TIME, packId: 'evolution-e06' });
    expect(stepFor(SELECTION, 'proved', () => true)).toEqual({ kind: 'atlas', nodeId: SELECTION });
  });
});

describe('search', () => {
  it('matches the starts of words, never their middles', () => {
    expect(hitOf(['gene'], wordsOf('Genetics & Genomes'))).toBe(1);
    expect(hitOf(['gene'], wordsOf('The Gene'))).toBe(2);
    expect(hitOf(['ene'], wordsOf('The Gene'))).toBe(0);
    expect(hitOf(['beak', 'fin'], wordsOf('The Beak of the Finch'))).toBe(1);
    expect(wordsOf('Éclair – café')).toEqual(['eclair', 'cafe']);
  });

  it('finds “gene” in Genetics things: titles first (whole words, then beginnings), then matches elsewhere', () => {
    const { input, pieces } = edition();
    const found = searchEdition('gene', pieces, indexOf(input), []);
    expect(found.places[0].id).toBe(GENETICS);
    const titles = found.pieces.map(h => h.piece.title);
    expect(titles.slice(0, 2).sort()).toEqual(['The Gene', 'The Selfish Gene']);
    expect(found.pieces.slice(0, 2).every(h => h.hit === 2 && h.inTitle === 2)).toBe(true);
    // Every title match (whole, then begun) comes before a match found only elsewhere.
    const inTitle = found.pieces.map(h => h.inTitle);
    expect([...inTitle].sort((a, b) => b - a)).toEqual(inTitle);
    expect(titles.indexOf('Lecture notes on general relativity')).toBeLessThan(inTitle.indexOf(0) === -1 ? Infinity : inTitle.indexOf(0));
    expect(searchEdition('   ', pieces, indexOf(input), []).total).toBe(0);
  });

  it('says why a thing was found when its title, maker and place do not', () => {
    const { pieces } = edition();
    const reel = pieces.find(p => p.title === 'Ninety-eight in a hundred')!;
    expect(whyOf(reel, 'nine', ['', 'Natural selection'])).toBeNull();
    expect(whyOf(pieces.find(p => p.title === 'The Gene')!, 'gene', [])).toBeNull();
    expect(excerptOf('A long way in, the words that matter about genes and how they switch on and off, then much more after that', ['gene'])).toBe('…the words that matter about genes and how they switch on and off, then much more after that');
    expect(excerptOf('Nothing here', ['gene'])).toBeNull();
  });

  it('marks where the query begins a word', () => {
    expect(markParts('The Selfish Gene', 'gene')).toEqual([{ text: 'The Selfish ', mark: false }, { text: 'Gene', mark: true }]);
    expect(markParts('Genetics & Genomes', 'gene')).toEqual([{ text: 'Gene', mark: true }, { text: 'tics & Genomes', mark: false }]);
  });
});

describe('collections', () => {
  it('keep the order they were made in: an edit never moves one', () => {
    const c = (id: string, createdAt: string, updatedAt: string): Collection => ({ id, name: id, items: [], createdAt, updatedAt });
    expect(collectionOrder([c('old', day(1), day(59)), c('new', day(9), day(9))]).map(x => x.id)).toEqual(['new', 'old']);
  });
});
