import { describe, expect, it } from 'vitest';
import type { NotebookEntry } from '../../core/notebook';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionRun } from '../../expeditions/ledger';
import { createReelShelf, savePin } from '../../explore/pins';
import { buildJournal, type JournalContent } from '../../notebook/journal';
import { addNote, createLibraryStore, saveLink, setStatus, upsertEntry, type LibraryEntry, type LibraryStore } from '../../notebook/libraryStore';
import { createExhibition, createExhibitionStore, takeDown } from './exhibitionStore';
import { aroundGroups, buildGallery, coverImages, fieldGroups, piecesOf, plateKey, proofStops, searchGallery, sectionsOf, type GalleryInput, type Piece } from './gallery';

const DNA = 'knowledge.science.biology.genetics-genomes.dna';
const DOMINANCE = 'knowledge.science.biology.genetics-genomes.dominance';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const HUMAN = 'knowledge.science.biology.evolution.human-evolution';
const EVOLUTION = 'knowledge.science.biology.evolution';
const MICROBES = 'knowledge.science.biology.microbes';
const BIOLOGY = 'knowledge.science.biology';
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const PHYSICS = 'knowledge.science.physics';
const HARMONY = 'knowledge.arts.music.harmony';
const BLACK_DEATH = 'knowledge.humanities.history.medieval-world.black-death';
const MEDIEVAL = 'knowledge.humanities.history.medieval-world';
const HISTORY = 'knowledge.humanities.history';
const CHEMISTRY = 'knowledge.science.chemistry';
const MARKETS = 'knowledge.economics.markets';
const at = (n: number) => new Date(Date.UTC(2026, 7, 1 + n, 15)).toISOString();

const pieces = (spec: [string, number][]) => spec.flatMap(([nodeId, n], g) => Array.from({ length: n }, (_, i) => ({ key: `link:${g}-${i}`, nodeIds: [nodeId], latest: at(g * 10 + i) })));
const ids = (groups: { nodeId: string }[]) => groups.map(g => g.nodeId).sort();

describe('suggested exhibitions', () => {
  it('give each busy field its own exhibition, splitting a field whose two branches are both busy', () => {
    const groups = fieldGroups(pieces([[DNA, 3], [DOMINANCE, 2], [SELECTION, 5], [ACCELERATION, 3], ['knowledge.science.physics.optics', 1], [HARMONY, 2]]));
    expect(ids(groups)).toEqual([EVOLUTION, GENETICS, PHYSICS].sort());
  });

  it('keep what is left of a split field when there is enough of it', () => {
    expect(ids(fieldGroups(pieces([[DNA, 4], [SELECTION, 4], [MICROBES, 2], [BIOLOGY, 2]])))).toEqual([BIOLOGY, EVOLUTION, GENETICS].sort());
    expect(ids(fieldGroups(pieces([[DNA, 4], [SELECTION, 4], [MICROBES, 2]])))).toEqual([EVOLUTION, GENETICS].sort());
    expect(ids(fieldGroups(pieces([[DNA, 4], [SELECTION, 4], [MICROBES, 4]])))).toEqual([EVOLUTION, GENETICS, MICROBES].sort());
  });

  it('name a field by its one branch when that branch holds nearly all of it, and by the field when it does not', () => {
    expect(ids(fieldGroups(pieces([[DNA, 5], [SELECTION, 1]])))).toEqual([GENETICS]);
    expect(ids(fieldGroups(pieces([[ACCELERATION, 4], ['knowledge.science.physics.relativity', 1], ['knowledge.science.physics.optics', 1]])))).toEqual([PHYSICS]);
  });

  it('gather a cluster of saves around the most particular place, never a copy of its field', () => {
    const spread = pieces([[BLACK_DEATH, 4], [MEDIEVAL, 1], [HISTORY, 2]]);
    const fields = fieldGroups(spread);
    expect(ids(fields)).toEqual([HISTORY]);
    expect(ids(aroundGroups(spread, fields))).toEqual([BLACK_DEATH]);
    // A field's branch is never a cluster: those are fields.
    const branch = pieces([['knowledge.science.physics.mechanics', 4], ['knowledge.science.physics.optics', 3]]);
    expect(aroundGroups(branch, fieldGroups(branch))).toEqual([]);
    // All of a field's things in one place: the field says it already.
    const tight = pieces([[BLACK_DEATH, 4]]);
    expect(aroundGroups(tight, fieldGroups(tight))).toEqual([]);
  });

  it('are nothing at all for a learner with nothing', () => {
    expect(fieldGroups([])).toEqual([]);
    expect(aroundGroups([], [])).toEqual([]);
  });
});

// --- the whole gallery, from the real stores ------------------------------------------------

const run = (id: string, packId: string, at: string): ExpeditionRun => ({ id, packId, level: 'Understood', firstTry: { right: 5, total: 6 }, transfer: { right: 2, total: 2 }, at });
const content: JournalContent = {
  checkSessions: () => [], describe: () => ({ given: '', key: '' }), packTitle: () => undefined, answerKey: () => undefined, caseWords: () => undefined,
  caseOffer: () => undefined, reels: [{ id: 'e09-why-still-chimpanzees', title: 'Why still chimpanzees', nodeId: HUMAN, image: 'https://upload.wikimedia.org/x.jpg' }],
  refreshReady: () => true,
};
const book = (id: string, title: string, nodeId: string, added: string): LibraryEntry => ({
  id: `ol-${id}`, kind: 'book', format: 'Book', title, creator: 'A. Writer', year: 2001, cover: 12345, ids: { ol: id }, subjects: [], tags: [],
  places: [{ nodeId, score: 1 }], placesBy: 'auto', status: 'want', addedAt: added, source: 'search', createdAt: added, updatedAt: added,
});
const idea = (id: string, title: string, nodeIds: string[], when: string): NotebookEntry => ({ id, title, body: '', sourceUrl: '', sourceLabel: '', kind: 'idea', evidence: 'encountered', nodeIds, createdAt: when, updatedAt: when });

function learner(): { input: Omit<GalleryInput, 'journal' | 'exhibitions'>; library: LibraryStore; journalOf: (over?: Partial<Parameters<typeof buildJournal>[0]>) => ReturnType<typeof buildJournal> } {
  let library = createLibraryStore();
  library = upsertEntry(library, book('OL1W', 'The Gene', DNA, at(1)), at(1));
  library = setStatus(library, 'entry:ol-OL1W', 'started', at(2));
  library = setStatus(library, 'entry:ol-OL1W', 'finished', at(5));
  library = addNote(library, { target: 'entry:ol-OL1W', kind: 'quote', text: 'The gene is the unit of heredity, and of argument.', where: 'p. 12' }, at(6));
  library = upsertEntry(library, book('OL2W', 'Mendel in the Garden', DOMINANCE, at(3)), at(3));
  library = saveLink(library, { url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', note: 'How DNA copies itself', nodeId: DNA, preview: { title: 'How DNA copies itself', description: '', siteName: 'TED-Ed', image: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg', at: at(4) } });
  library = saveLink(library, { url: 'https://example.org/dominance', note: 'Dominance is not strength', nodeId: DOMINANCE });
  const entries = [idea('n1', 'Same genome, different cells', [GENETICS], at(7))];
  let shelf = createReelShelf();
  shelf = savePin(shelf, 'e09-why-still-chimpanzees', [HUMAN], at(8));
  const exp = { ...createExpeditionLedger(), runs: [run('r1', 'genetics-dna', at(9))] };
  const journalOf = (over = {}) => buildJournal({ exp, checks: createCheckLedger(), entries, shelf, library, content, now: Date.parse(at(30)), ...over });
  return { input: { library, watchedVideos: { aaaaaaaaaaa: at(4) }, seenVideos: ['aaaaaaaaaaa'], watchedReels: [] }, library, journalOf };
}

describe('the gallery', () => {
  it('is empty for an empty library: no field is chosen for the learner, and no shelf book is theirs', () => {
    const journal = buildJournal({ exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore(), content });
    const gallery = buildGallery({ journal, library: createLibraryStore(), exhibitions: createExhibitionStore() });
    expect(gallery.pieces).toEqual([]);
    expect(gallery.mine).toEqual([]);
    expect(gallery.suggested).toEqual([]);
    expect(gallery.lead).toBeNull();
    expect(gallery.map).toEqual([]);
  });

  it('opens a small library on its own few things, never on an empty wall', () => {
    let library = createLibraryStore();
    library = upsertEntry(library, book('OL9W', 'The Gene', DNA, at(1)), at(1));
    const journal = buildJournal({ exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library, content });
    const gallery = buildGallery({ journal, library, exhibitions: createExhibitionStore() });
    expect(gallery.suggested.map(ex => ex.id)).toEqual([`field:${GENETICS}`]);
    expect(gallery.lead?.id).toBe(`field:${GENETICS}`);
  });

  it('suggests Genetics from what the learner has, in its designed order, ending in proof', () => {
    const { input, journalOf } = learner();
    const gallery = buildGallery({ ...input, journal: journalOf(), exhibitions: createExhibitionStore() });
    const genetics = gallery.suggested.find(ex => ex.id === `field:${GENETICS}`)!;
    expect(genetics.title).toBe('Genetics & Genomes');
    expect(genetics.sections.map(s => s.id)).toEqual(['video', 'work', 'link', 'note']);
    expect(genetics.sections.find(s => s.id === 'work')!.pieces.map(p => p.title)).toEqual(['The Gene', 'Mendel in the Garden']);
    expect(genetics.images[0].kind).not.toBe('frame');
    expect(genetics.images.some(plate => plate.kind === 'cover')).toBe(true);
    // DNA is due a refresh, so it leads the proof; then Dominance, which holds things but no proof yet.
    expect(genetics.proof.map(stop => stop.nodeId)).toEqual([DNA, DOMINANCE, 'knowledge.science.biology.genetics-genomes.gene-regulation']);
    expect(genetics.proof[0].ready).toBe(true);
    expect(genetics.lessons.map(l => l.nodeId)).toContain(DNA);
    expect(gallery.lead?.id).toBeDefined();
  });

  it('walks each piece along its path: saved, started, finished, proved', () => {
    const { input, journalOf } = learner();
    const gallery = buildGallery({ ...input, journal: journalOf(), exhibitions: createExhibitionStore() });
    const steps = (key: string) => gallery.byKey.get(key)!.path.map(m => m.done);
    expect(steps('entry:ol-OL1W')).toEqual([true, true, true, true]);
    expect(steps('entry:ol-OL2W')).toEqual([true, false, false, false]);
    // Dominance is not proved here, but even a proved place does not prove a book never opened.
    const { input: again, journalOf: later } = learner();
    const proved = buildGallery({ ...again, journal: later({ exp: { ...createExpeditionLedger(), runs: [run('r1', 'genetics-dna', at(9)), run('r2', 'genetics-dominance', at(9))] } }), exhibitions: createExhibitionStore() });
    expect(proved.byKey.get('entry:ol-OL2W')!.path.map(m => m.done)).toEqual([true, false, false, false]);
    expect(proved.byKey.get('entry:ol-OL2W')!.provedIn).toBeNull();
    // The video was saved after DNA was proved: that proof says nothing about it.
    const video = gallery.pieces.find(p => p.kind === 'video')!;
    expect(video.path.map(m => m.done)).toEqual([true, true, true, false]);
    expect(video.provedIn).toBeNull();
    expect(gallery.byKey.get('entry:ol-OL1W')!.kept).toHaveLength(1);
  });

  it('counts a proof for a piece only from when it was saved or begun, a refresh included', () => {
    const { input, journalOf } = learner();
    const journal = journalOf();
    const video = () => buildGallery({ ...input, journal, exhibitions: createExhibitionStore(), provedTimes: id => id === DNA ? times : [] }).pieces.find(p => p.kind === 'video')!;
    let times: string[] = [at(9)];
    expect(video().path.at(-1)).toMatchObject({ step: 'proved', done: false });
    // A refresh case after it was saved makes it count, on the refresh's day.
    const refreshed = new Date(Date.now() + 86_400_000).toISOString();
    times = [at(9), refreshed];
    expect(video().path.at(-1)).toMatchObject({ step: 'proved', done: true, at: refreshed });
    expect(video().provedIn).toBe(DNA);
    // The Gene was begun before DNA was proved: it counts from its first proof.
    const gene = buildGallery({ ...input, journal, exhibitions: createExhibitionStore(), provedTimes: id => id === DNA ? [at(9)] : [] }).byKey.get('entry:ol-OL1W')!;
    expect(gene.path.at(-1)).toMatchObject({ done: true, at: at(9) });
  });

  it('holds the learner’s own exhibition: things hung by hand, then what sits under its places, less what was taken down', () => {
    const { input, journalOf } = learner();
    const journal = journalOf();
    let { store, id } = createExhibition(createExhibitionStore(), { title: 'Why are there still chimpanzees?', places: [HUMAN], items: ['entry:ol-OL1W'] }, at(10), 'ex-chimps');
    let gallery = buildGallery({ ...input, journal, exhibitions: store });
    const mine = gallery.mine[0];
    expect(mine.id).toBe('mine:ex-chimps');
    expect(mine.pieces.map(p => p.key)).toEqual(['entry:ol-OL1W', 'reel:e09-why-still-chimpanzees']);
    // Its own place leads its proof, ahead of a place its pieces sit in that is due a refresh.
    expect(mine.proof[0].nodeId).toBe(HUMAN);
    expect(mine.proof.map(stop => stop.nodeId)).toContain(DNA);
    store = takeDown(store, id, 'reel:e09-why-still-chimpanzees', at(11));
    gallery = buildGallery({ ...input, journal, exhibitions: store });
    expect(piecesOf(store.exhibitions[0], gallery.pieces, gallery.byKey).map(p => p.key)).toEqual(['entry:ol-OL1W']);
  });

  it('lets a kept suggestion step aside for the learner’s own copy', () => {
    const { input, journalOf } = learner();
    const journal = journalOf();
    const { store } = createExhibition(createExhibitionStore(), { title: 'Genes', places: [GENETICS], from: `field:${GENETICS}` }, at(10), 'ex-genes');
    const gallery = buildGallery({ ...input, journal, exhibitions: store });
    expect(gallery.suggested.some(ex => ex.id === `field:${GENETICS}`)).toBe(false);
    expect(gallery.mine[0].pieces.length).toBeGreaterThanOrEqual(5);
  });

  it('lists the map strip with ready-to-refresh places first, and only what a lesson or a check began', () => {
    const { input, journalOf } = learner();
    const journal = journalOf();
    const gallery = buildGallery({ ...input, journal, exhibitions: createExhibitionStore() });
    expect(gallery.map[0]).toMatchObject({ nodeId: DNA, ready: true });
    // Dominance holds a save and a link, but no lesson ran there: it is not a step on the map.
    expect(journal.status.get(DOMINANCE)?.state).toBe('underway');
    expect(gallery.map.map(stop => stop.nodeId)).toEqual([DNA]);
    const tried = buildGallery({ ...input, journal, exhibitions: createExhibitionStore(), tried: new Set([DOMINANCE]) });
    expect(tried.map.map(stop => stop.nodeId)).toEqual([DNA, DOMINANCE]);
  });

  it('never ends an exhibition in a lesson from a field nobody named: a chemistry library ends in chemistry', () => {
    let library = createLibraryStore();
    library = saveLink(library, { url: 'https://en.wikipedia.org/wiki/Covalent_bond', note: 'Covalent bonds: sharing electrons', nodeId: CHEMISTRY });
    const journal = buildJournal({ exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library, content });
    const gallery = buildGallery({ journal, library, exhibitions: createExhibitionStore() });
    const all = [...gallery.mine, ...gallery.suggested];
    expect(all.map(ex => ex.id)).toEqual([`field:${CHEMISTRY}`]);
    for (const ex of all) {
      expect(ex.proof.map(stop => stop.nodeId)).toEqual([CHEMISTRY]);
      expect(ex.proof.some(stop => stop.packId?.startsWith('evolution'))).toBe(false);
    }
    // Nor does a piece placed at a whole field pull in a branch's lessons first.
    const piece = { ...gallery.pieces[0], nodeIds: [BIOLOGY] } as Piece;
    expect(proofStops(journal, [CHEMISTRY], [piece]).map(stop => stop.nodeId)).toEqual([CHEMISTRY]);
  });

  it('ends an exhibition with no lesson near it in proof at its own place', () => {
    const journal = buildJournal({ exp: createExpeditionLedger(), checks: createCheckLedger(), entries: [], shelf: createReelShelf(), library: createLibraryStore(), content });
    const { store } = createExhibition(createExhibitionStore(), { title: 'Why do prices rise?', places: [MARKETS] }, at(10), 'ex-prices');
    const gallery = buildGallery({ journal, library: createLibraryStore(), exhibitions: store });
    expect(gallery.mine[0].proof).toEqual([expect.objectContaining({ nodeId: MARKETS, packId: null })]);
  });

  it('links a field exhibition to the places inside it, never only to its own title again', () => {
    const { input, journalOf } = learner();
    const gallery = buildGallery({ ...input, journal: journalOf(), exhibitions: createExhibitionStore() });
    const genetics = gallery.suggested.find(ex => ex.id === `field:${GENETICS}`)!;
    expect(genetics.links).not.toContain(GENETICS);
    expect(genetics.links).toEqual(expect.arrayContaining([DNA, DOMINANCE]));
    // Its line says when it began, so the page says it only there.
    expect(genetics.introDated).toBe(genetics.intro.startsWith('Gathered since'));
  });

  it('searches exhibitions, pieces (passages kept included) and places', () => {
    const { input, journalOf } = learner();
    const gallery = buildGallery({ ...input, journal: journalOf(), exhibitions: createExhibitionStore() });
    expect(searchGallery(gallery, 'heredity argument').pieces.map(p => p.title)).toEqual(['The Gene']);
    expect(searchGallery(gallery, 'genetics').exhibitions.map(ex => ex.title)).toContain('Genetics & Genomes');
    expect(searchGallery(gallery, 'black death').places).toContain(BLACK_DEATH);
    expect(searchGallery(gallery, '  ')).toEqual({ exhibitions: [], pieces: [], places: [] });
  });

  it('covers lead with a picture or a book, keep video frames for when there is nothing else, and never repeat another cover', () => {
    const { input, journalOf } = learner();
    const gallery = buildGallery({ ...input, journal: journalOf(), exhibitions: createExhibitionStore() });
    const pieces = gallery.pieces as Piece[];
    const plates = coverImages(pieces);
    expect(plates[0].kind).not.toBe('frame');
    expect(plates.some(plate => plate.kind === 'frame')).toBe(false);
    // Only videos: their frames, shown whole.
    expect(coverImages(pieces.filter(p => p.kind === 'video')).map(plate => plate.kind)).toEqual(['frame']);
    // Nothing another cover shows is shown again.
    const used = new Set(plates.map(plateKey));
    expect(coverImages(pieces, 4, used).some(plate => used.has(plateKey(plate)))).toBe(false);
    // Across the index, no two covers share a picture or a book.
    const shown = [...gallery.mine, ...gallery.suggested].flatMap(ex => ex.images.map(plateKey));
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('orders sections the same way everywhere', () => {
    expect(sectionsOf([])).toEqual([]);
  });
});

describe('pictures', () => {
  it('are one picture at any size', async () => {
    const { pictureKey } = await import('./gallery');
    expect(pictureKey('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Moon_landing.jpg/330px-Moon_landing.jpg'))
      .toBe(pictureKey('https://upload.wikimedia.org/wikipedia/commons/a/ab/Moon_landing.jpg'));
    expect(pictureKey('https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg')).toBe(pictureKey('https://i.ytimg.com/vi/aaaaaaaaaaa/maxresdefault.jpg'));
    expect(pictureKey('https://covers.openlibrary.org/b/id/12345-M.jpg?default=false')).toBe('ol:12345');
  });
});
