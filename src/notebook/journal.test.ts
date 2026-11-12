import { describe, expect, it } from 'vitest';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import type { NotebookEntry } from '../core/notebook';
import { createCheckLedger } from '../checks/ledger';
import type { CheckSession } from '../checks/progress';
import type { CheckItem } from '../checks/types';
import { createExpeditionLedger, type ExpeditionLedger, type ExpeditionRun } from '../expeditions/ledger';
import { createReelShelf } from '../explore/pins';
import { buildJournal, byPlace, placeRows, scopeTerritories, searchLibrary, stuckEntryId, territoryState, WORLD_ID, type JournalContent, type JournalInput } from './journal';
import { addNote, createLibraryStore, cycleReading, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from './libraryStore';

const NOW_E10 = evolutionTerritoryId('evolution-now');
const SELECTION = evolutionTerritoryId('natural-selection');
const DRIFT = evolutionTerritoryId('chance-drift');
const day = (n: number) => new Date(Date.UTC(2026, 9, 1 + n, 15)).toISOString();

const run = (id: string, packId: string, level: ExpeditionRun['level'], at: string, misses?: ExpeditionRun['misses']): ExpeditionRun =>
  ({ id, packId, level, firstTry: { right: 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, at, ...(misses ? { misses } : {}) });
const ledger = (...runs: ExpeditionRun[]): ExpeditionLedger => ({ ...createExpeditionLedger(), runs });

const choice: CheckItem = {
  kind: 'choice', id: 'i_1', family: 'f_1', claim: 'Resistance was already there.', entities: [], explain: '', sources: [],
  prompt: 'What does the velvet experiment show?',
  options: [{ id: 'a', label: 'The antibiotic made the cells resistant' }, { id: 'b', label: 'The resistance was already there, by chance' }, { id: 'c', label: 'x' }, { id: 'd', label: 'y' }],
  answer: 'b',
};
const session = (id: string, node: string, at: string, passed: boolean, correct: boolean): CheckSession => ({
  session: id, node, at, verdict: { passed, reasons: passed ? [] : ['too-many-missed'] },
  attempts: [{ correct, counted: true, entry: { item: choice } as never, event: { t: 'attempt', id: `${id}-a`, session: id, node, item: 'i_1', family: 'f_1', variant: 0, answer: { pick: correct ? 'b' : 'a' }, correct, confidence: 'certain', ms: 1, at } }],
});

const content = (sessions: CheckSession[] = []): JournalContent => ({
  checkSessions: () => sessions,
  describe: (item, answer) => item.kind === 'choice' ? { given: item.options.find(o => answer && 'pick' in answer && o.id === answer.pick)?.label ?? '', key: item.options.find(o => o.id === item.answer)!.label } : { given: '', key: '' },
  packTitle: packId => ({ 'evolution-e10': 'The bacteria that walked through poison', 'evolution-e03': 'Be the bird' } as Record<string, string>)[packId],
  answerKey: (_, gradeId) => gradeId === 'g1' ? 'Already resistant before the drug' : undefined,
  caseWords: (caseId, answer) => caseId === 'c_1' ? { prompt: 'Where is the stripe more likely gone, or on every lizard?', given: 'pick' in answer && answer.pick === 'big' ? 'The big island' : 'The small island', right: 'The small island' } : undefined,
  caseOffer: nodeIds => nodeIds.find(id => id === SELECTION),
  reels: [{ id: 'reel-seals', title: 'Twenty to forty seals', nodeId: DRIFT }, { id: 'reel-moth', title: 'Ninety-eight in a hundred', nodeId: SELECTION }],
});

const note = (id: string, title: string, nodeIds: string[], at: string, kind: NotebookEntry['kind'] = 'idea'): NotebookEntry =>
  ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind, evidence: 'encountered', nodeIds, createdAt: at, updatedAt: at });

const input = (over: Partial<JournalInput> = {}): JournalInput => ({
  exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore(), content: content(), ...over,
});

describe('the library for a new learner', () => {
  it('is an honest, empty Evolution: every territory dark, nothing of theirs, no rows', () => {
    const journal = buildJournal(input());
    expect(journal.field.nodeId).toBe(EVOLUTION_ID);
    expect(journal.field.territories).toHaveLength(12);
    expect(journal.field.territories.every(t => t.state === null)).toBe(true);
    expect(journal.rows).toEqual([]);
    expect(journal.changes).toEqual([]);
    expect(byPlace(journal)).toEqual([]);
  });

  it('still lists the catalog: places, reels and books can be searched before anything is done', () => {
    const journal = buildJournal(input());
    expect(searchLibrary(journal, { query: 'finch', filter: 'work' }).map(i => i.title)).toEqual(['The Beak of the Finch']);
    expect(searchLibrary(journal, { query: 'seals' }).map(i => i.kind)).toEqual(['reel']);
    expect(searchLibrary(journal, { query: 'natural selection', filter: 'place' })[0].title).toBe('Natural selection');
  });
});

describe('lit, underway and Lasting land', () => {
  it('lights a place from an Understood run and marks a lower run underway', () => {
    const journal = buildJournal(input({ exp: ledger(run('r1', 'evolution-e10', 'Understood', day(8)), run('r2', 'evolution-e04', 'Familiar', day(9))) }));
    const state = Object.fromEntries(journal.field.territories.map(t => [t.nodeId, t.state]));
    expect(state[NOW_E10]).toBe('lit');
    expect(state[DRIFT]).toBe('underway');
    expect(state[SELECTION]).toBeNull();
    const lit = journal.rows.find(r => r.key === `lit:${NOW_E10}`)!;
    expect(lit).toMatchObject({ what: 'Lit Evolution now', title: 'The bacteria that walked through poison', at: day(8), lit: true });
    expect(journal.rows.find(r => r.key === 'explored:evolution-e04')).toMatchObject({ what: 'Explored Chance and drift', detail: 'Familiar' });
  });

  it('makes a place Lasting only from a passed check a week or more after it was lit', () => {
    const early = buildJournal(input({ exp: ledger(run('r1', 'evolution-e10', 'Understood', day(1))), content: content([session('s1', NOW_E10, day(5), true, true)]) }));
    expect(early.status.get(NOW_E10)?.state).toBe('lit');
    const later = buildJournal(input({ exp: ledger(run('r1', 'evolution-e10', 'Understood', day(1))), content: content([session('s2', NOW_E10, day(9), true, true)]) }));
    expect(later.status.get(NOW_E10)).toMatchObject({ state: 'lasting', litAt: day(1), lastingAt: day(9) });
    expect(later.rows[0]).toMatchObject({ what: 'Lasting Evolution now', at: day(9) });
  });

  it('a passed check alone lights a place, with no expedition at all', () => {
    const journal = buildJournal(input({ content: content([session('s1', SELECTION, day(3), true, true)]) }));
    expect(journal.status.get(SELECTION)?.state).toBe('lit');
    expect(journal.rows[0]).toMatchObject({ what: 'Lit Natural selection', title: 'Proved in words' });
  });
});

describe('what stuck', () => {
  it('sits on the row of the run that lit the place, not as a separate idea', () => {
    const stuck = note(stuckEntryId('run', 'r1'), 'The drug only showed us which ones were already resistant.', [NOW_E10], day(8));
    const journal = buildJournal(input({ exp: ledger(run('r1', 'evolution-e10', 'Understood', day(8))), entries: [stuck] }));
    expect(journal.rows.find(r => r.lit)?.quote).toBe(stuck.title);
    expect(journal.items.some(i => i.kind === 'idea')).toBe(false);
    expect(journal.rows).toHaveLength(1);
  });

  it('after a passed check, sits on the check row', () => {
    const stuck = note(stuckEntryId('check', 's1'), 'Populations change, individuals do not.', [SELECTION], day(3));
    const journal = buildJournal(input({ entries: [stuck], content: content([session('s1', SELECTION, day(3), true, true)]) }));
    expect(journal.rows[0].quote).toBe(stuck.title);
  });
});

describe('changed your mind', () => {
  it('comes from an expedition answer missed, then the idea proved later', () => {
    const exp = ledger(
      run('r1', 'evolution-e10', 'Familiar', day(8), [{ gradeId: 'g1', prompt: 'Where did the resistance come from?', chosen: 'The antibiotic created it' }]),
      run('r2', 'evolution-e10', 'Understood', day(11)),
    );
    const shelf = { ...createReelShelf(), pinned: [{ id: 'reel-seals', at: day(9) }] };
    const [change] = buildJournal(input({ exp, shelf })).changes;
    expect(change).toMatchObject({ nodeId: NOW_E10, missedAt: day(8), rightAt: day(11), was: 'The antibiotic created it', now: 'Already resistant before the drug' });
    expect(change.between).toBeUndefined(); // the seals reel is from another place
  });

  it('is not claimed while the idea is still unproved', () => {
    const exp = ledger(run('r1', 'evolution-e10', 'Glimpsed', day(8), [{ gradeId: 'g1', prompt: 'Where?', chosen: 'Wrong' }]));
    expect(buildJournal(input({ exp })).changes).toEqual([]);
  });

  it('comes from a check answer missed and later answered right, in the learner’s and the key’s words', () => {
    const journal = buildJournal(input({ content: content([session('s1', NOW_E10, day(2), false, false), session('s2', NOW_E10, day(6), true, true)]) }));
    expect(journal.changes).toHaveLength(1);
    expect(journal.changes[0]).toMatchObject({ was: 'The antibiotic made the cells resistant', now: 'The resistance was already there, by chance', missedAt: day(2), rightAt: day(6) });
    expect(searchLibrary(journal, { filter: 'changed' })).toHaveLength(1);
  });

  it('comes from a new case called wrong, once the place is proved by another case', () => {
    const played = (id: string, caseId: string, at: string, success: boolean, pick: string): CheckSession => ({
      session: id, node: NOW_E10, at, attempts: [], verdict: { passed: success, reasons: success ? [] : ['transfer-missed'] },
      played: { caseId, answer: { pick }, success, counted: true, via: 'mission' },
    });
    const journal = buildJournal(input({ content: content([played('m1', 'c_1', day(2), false, 'big'), played('m2', 'c_2', day(5), true, 'x')]) }));
    expect(journal.changes).toHaveLength(1);
    expect(journal.changes[0]).toMatchObject({ key: 'case:c_1', was: 'The big island', now: 'The small island', missedAt: day(2), rightAt: day(5) });
    // Not yet proved: nothing is claimed.
    expect(buildJournal(input({ content: content([played('m1', 'c_1', day(2), false, 'big')]) })).changes).toEqual([]);
  });

  it('names a reel kept from the same place in between', () => {
    const shelf = { ...createReelShelf(), pinned: [{ id: 'reel-moth', at: day(4) }] };
    const journal = buildJournal(input({ shelf, content: content([session('s1', SELECTION, day(2), false, false), session('s2', SELECTION, day(6), true, true)]) }));
    expect(journal.changes[0].between?.id).toBe('reel-moth');
  });
});

describe('collected things', () => {
  it('keeps reels, books, links and notes, each dated and in its place', () => {
    let library = cycleReading(createLibraryStore(), 'finch', day(2));
    library = cycleReading(library, 'finch', day(5));
    library = saveLink(library, { url: 'en.wikipedia.org/wiki/Peppered_moth', note: 'The peppered moth story', nodeId: SELECTION });
    const shelf = { ...createReelShelf(), pinned: [{ id: 'reel-moth', at: day(3) }] };
    const entries = [note('n1', 'Why do moths not just change back?', [SELECTION], day(4), 'question')];
    const journal = buildJournal(input({ library, shelf, entries }));
    const rows = placeRows(journal, SELECTION).map(r => r.what);
    expect(rows).toEqual(expect.arrayContaining(['Kept a reel', 'A question', 'Saved a link · en.wikipedia.org']));
    expect(journal.rows.filter(r => r.item?.kind === 'work').map(r => r.what)).toEqual(['Finished reading', 'Started reading']);
    expect(journal.field.territories.find(t => t.nodeId === SELECTION)?.state).toBe('underway');
    expect(searchLibrary(journal, { query: 'moth', filter: 'link' })[0].title).toBe('The peppered moth story');
    expect(searchLibrary(journal, { place: SELECTION }).filter(i => i.kind === 'link')).toHaveLength(1);
    expect(byPlace(journal)[0]).toMatchObject({ nodeId: SELECTION, state: 'underway' });
  });

  it('never prints a place the atlas no longer has: a reel saved there shows its other places, else its own', () => {
    const LOST = 'knowledge.science.biology.genetics-genomes.made-up';
    const shelf = { ...createReelShelf(), pinned: [{ id: 'reel-moth', at: day(3), places: [LOST, DRIFT] }, { id: 'reel-seals', at: day(4), places: [LOST] }] };
    const journal = buildJournal(input({ shelf }));
    const reel = (id: string) => journal.items.find(i => i.key === `reel:${id}`)!;
    expect(reel('reel-moth')).toMatchObject({ nodeIds: [DRIFT], detail: 'Chance and drift' });
    expect(reel('reel-seals')).toMatchObject({ nodeIds: [DRIFT] });
    const printed = JSON.stringify([...journal.items.filter(i => i.kind === 'reel'), ...journal.rows.filter(r => r.item?.kind === 'reel')].map(r => [r.title, r.detail, 'what' in r ? r.what : '']));
    expect(printed).not.toContain(LOST);
  });

  it('draws the field the learner is busiest in', () => {
    const entries = [note('n1', 'Rhythm', ['knowledge.arts.music'], day(1)), note('n2', 'Chords', ['knowledge.arts.music'], day(2))];
    expect(buildJournal(input({ entries })).field.nodeId).toBe('knowledge.arts');
    const exp = ledger(run('r1', 'evolution-e10', 'Understood', day(3)));
    expect(buildJournal(input({ entries, exp })).field.nodeId).toBe(EVOLUTION_ID);
  });

  it('works before the content chunk has loaded', () => {
    const journal = buildJournal(input({ exp: ledger(run('r1', 'evolution-e10', 'Understood', day(8))), content: null }));
    expect(journal.rows[0]).toMatchObject({ title: 'Evolution now' });
  });
});

const entry = (id: string, title: string, nodeIds: string[], status: LibraryEntry['status'], over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id, kind: 'book', format: 'Book', title, creator: 'An Author', year: 2001, cover: null, ids: {}, subjects: [], tags: [],
  places: nodeIds.map(nodeId => ({ nodeId, score: 0.8 })), placesBy: 'auto', status, addedAt: day(1), source: 'goodreads',
  ...(status === 'finished' ? { finishedAt: day(4) } : {}), createdAt: day(1), updatedAt: day(1), ...over,
});
const withEntries = (...list: LibraryEntry[]): LibraryStore => list.reduce((library, item) => upsertEntry(library, item, day(1)), createLibraryStore());

describe('read about', () => {
  it('marks the places of what the learner reads or has read, and never lights them', () => {
    const library = withEntries(entry('gr-1', 'The Beak of the Finch', [SELECTION], 'finished'), entry('gr-2', 'Wishlist', [DRIFT], 'want'));
    const journal = buildJournal(input({ library }));
    expect(journal.status.get(SELECTION)).toMatchObject({ state: 'read', litAt: null, readCount: 1 });
    expect(journal.status.has(DRIFT)).toBe(false); // wanting to read is not reading
    expect(journal.field.territories.find(t => t.nodeId === SELECTION)?.state).toBe('read');
    expect(journal.field.territories.filter(t => t.state === 'lit' || t.state === 'lasting')).toEqual([]);
  });

  it('proof outranks reading on the same land, and a read count is kept beside it', () => {
    const library = withEntries(entry('gr-1', 'Book', [NOW_E10], 'started'));
    const journal = buildJournal(input({ library, exp: ledger(run('r1', 'evolution-e10', 'Understood', day(8))) }));
    expect(journal.status.get(NOW_E10)).toMatchObject({ state: 'lit', readCount: 1 });
  });

  it('reading inside a larger place makes it read; anything underway inside makes it underway', () => {
    const library = withEntries(entry('gr-1', 'Book', [SELECTION], 'finished'));
    const journal = buildJournal(input({ library }));
    expect(territoryState(journal.status, EVOLUTION_ID)).toBe('read');
    expect(territoryState(journal.status, 'knowledge.science.biology')).toBe('read');
    const busier = buildJournal(input({ library, exp: ledger(run('r1', 'evolution-e04', 'Familiar', day(2))) }));
    expect(territoryState(busier.status, EVOLUTION_ID)).toBe('underway');
  });

  it('a stopped book still counts as read about; taking it off the list clears it', () => {
    let library = withEntries(entry('gr-1', 'Book', [SELECTION], 'stopped'));
    expect(buildJournal(input({ library })).status.get(SELECTION)?.state).toBe('read');
    library = setStatus(library, 'entry:gr-1', null, day(6));
    expect(buildJournal(input({ library })).status.has(SELECTION)).toBe(false);
  });
});

describe('the map’s scope', () => {
  it('opens on all knowledge once the learner’s places span three subjects', () => {
    const library = withEntries(
      entry('gr-1', 'A Brief History of Time', ['knowledge.science.astronomy'], 'finished'),
      entry('gr-2', 'Sapiens', ['knowledge.humanities.history'], 'finished'),
      entry('gr-3', 'Thinking, Fast and Slow', ['knowledge.society.psychology'], 'started'),
    );
    const journal = buildJournal(input({ library }));
    expect(journal.field.nodeId).toBe(WORLD_ID);
    expect(journal.field.territories.map(t => t.nodeId)).toContain('knowledge.humanities.history');
    expect(journal.field.territories.find(t => t.nodeId === 'knowledge.society.psychology')?.state).toBe('read');
    expect(journal.field.territories.every(t => (catalog_depth(t.nodeId)) === 2)).toBe(true);
    expect(byPlace(journal).map(p => p.nodeId).sort()).toEqual(['knowledge.humanities.history', 'knowledge.science.astronomy', 'knowledge.society.psychology']);
  });

  it('keeps a learner busy in one field on that field', () => {
    const library = withEntries(entry('gr-1', 'Book', [SELECTION], 'finished'), entry('gr-2', 'Other', ['knowledge.humanities.history'], 'finished'));
    expect(buildJournal(input({ library, exp: ledger(run('r1', 'evolution-e10', 'Understood', day(3))) })).field.nodeId).toBe(EVOLUTION_ID);
  });

  it('draws any place’s children on request, each with its state', () => {
    const library = withEntries(entry('gr-1', 'Book', [SELECTION], 'finished'));
    const journal = buildJournal(input({ library }));
    const biology = scopeTerritories(journal.status, 'knowledge.science.biology');
    expect(biology.find(t => t.nodeId === EVOLUTION_ID)?.state).toBe('read');
    expect(scopeTerritories(journal.status, WORLD_ID).length).toBeGreaterThan(30);
  });
});

describe('the learner’s own books, films and notes', () => {
  it('are works in the library, searchable by their quotes and notes', () => {
    let library = withEntries(entry('ol-OL1892617W', 'A Brief History of Time', ['knowledge.science.astronomy'], 'finished', { creator: 'Stephen Hawking', ids: { ol: 'OL1892617W' } }));
    library = addNote(library, { target: 'entry:ol-OL1892617W', kind: 'quote', text: 'Even if there is only one possible unified theory, it is just a set of rules.' }, day(5));
    library = addNote(library, { target: 'work:finch', kind: 'note', text: 'Rosemary Grant measured beaks' }, day(6));
    const journal = buildJournal(input({ library }));
    const [found] = searchLibrary(journal, { query: 'unified theory' });
    expect(found).toMatchObject({ kind: 'work', key: 'entry:ol-OL1892617W' });
    if (found.kind === 'work') expect(found.work).toMatchObject({ status: 'finished', url: 'https://openlibrary.org/works/OL1892617W', creator: 'Stephen Hawking' });
    expect(searchLibrary(journal, { query: 'rosemary' })[0]?.key).toBe('work:finch');
    expect(journal.rows.find(r => r.key === 'entry:ol-OL1892617W:done')).toMatchObject({ what: 'Finished reading', at: day(4) });
  });

  it('a shelf work and the learner’s entry for it are one item', () => {
    const library = cycleReading(createLibraryStore(), 'origin', day(2));
    const works = buildJournal(input({ library })).items.filter(i => i.kind === 'work' && i.title === 'On the Origin of Species');
    expect(works).toHaveLength(1);
    if (works[0].kind === 'work') expect(works[0].work).toMatchObject({ key: 'work:origin', status: 'started' });
  });

  it('a film reads as watched', () => {
    const library = withEntries(entry('wd-Q5174583', 'Cosmos: A Spacetime Odyssey', ['knowledge.science.astronomy'], 'finished', { kind: 'series', format: 'Documentary series', ids: { wd: 'Q5174583' } }));
    const journal = buildJournal(input({ library }));
    expect(journal.rows.find(r => r.key.endsWith(':done'))?.what).toBe('Watched');
    const work = journal.items.find(i => i.key === 'entry:wd-Q5174583');
    expect(work?.kind === 'work' && work.work.url).toBe('https://www.wikidata.org/wiki/Q5174583');
  });
});

function catalog_depth(id: string) { return id.split('.').length - 1; }

describe('places proved on their generated pages', () => {
  const MOTION = 'knowledge.science.physics.mechanics.motion';
  const input = (autoProofs: JournalInput['autoProofs']): JournalInput => ({
    exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore(), content: content(), now: Date.parse(day(9)), autoProofs,
  });

  it('light the place in the Library, dated, with a row saying how', () => {
    const journal = buildJournal(input([{ nodeId: MOTION, at: day(3), how: 'check' }]));
    expect(journal.status.get(MOTION)).toMatchObject({ litAt: day(3), state: 'lit' });
    expect(journal.rows.find(row => row.key === `lit:${MOTION}`)).toMatchObject({ at: day(3), lit: true, title: 'Proved in a quick check' });
  });

  it('leave a place unlit without one', () => {
    expect(buildJournal(input([])).status.get(MOTION)).toBeUndefined();
  });
});
