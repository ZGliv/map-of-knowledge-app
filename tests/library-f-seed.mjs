// The learners the Edition's journey and screenshots use (tests/library-f-journey.mjs, tests/library-f-shots.mjs),
// written through the app's own store modules inside the page (page.evaluate(fn)):
//   seed       the Mosaic's learner a few months in (tests/library-c-seed.mjs): about fifty things across
//              Genetics, Evolution, Physics, Music and History, six places proved, two collections. Its books
//              and films carry the catalogs' own records (looked up once) instead of searching Open Library
//              and Wikidata on every run, so a slow catalog never stops the journey; their covers still load.
//   seedThree  a learner a week in, with three things: a reel kept and watched, a Watch video saved, a question.
//   seedHeavy  the learner a few months in, ten months on: every reel in the deck kept across the months, a few
//              hundred Watch videos saved across eighteen fields, more notes and questions, two more collections.
//   seedRecent the heavy learner's last ten days as a daily Watch user: sixty more videos across ten fields.
// Seeds live only here, in the tests: the app never ships any.
export async function seed() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, notebookMod, ledgerMod, checkLedgerMod, progress, session, generators, pins, deck, poolMod, memoryMod, ol, wd, linkSheet, collectionsMod, youtube, engagement, manifest, evolution] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/expeditions/ledger.ts'), imp('/src/checks/ledger.ts'), imp('/src/checks/progress.ts'),
    imp('/src/checks/session.ts'), imp('/src/checks/generators.ts'), imp('/src/explore/pins.ts'), imp('/src/explore/deck.ts'), imp('/src/feed/pool.ts'), imp('/src/feed/memory.ts'),
    imp('/src/notebook/openLibrary.ts'), imp('/src/notebook/wikidata.ts'), imp('/src/notebook/LinkSheet.tsx'), imp('/src/lab/library-c/collections.ts'), imp('/src/feed/youtube.ts'),
    imp('/src/feed/engagement.ts'), imp('/src/expeditions/manifest.ts'), imp('/src/core/evolution.ts'),
  ]);
  const NOW = Date.now();
  const DAY = 864e5;
  const ago = (days, hour = 0) => new Date(NOW - days * DAY + hour * 36e5).toISOString();
  const RealDate = Date;
  /** Run store code as if it were this moment: their own stamps (Date.now, new Date()) read this clock. */
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  const T = key => evolution.evolutionTerritoryId(key);
  const P = {
    selection: T('natural-selection'), heredity: T('variation-heredity'), tree: T('tree-thinking'), deep: T('deep-time'), species: T('new-species'),
    extinction: evolution.evolutionTerritoryId(evolution.EVOLUTION_TERRITORIES.find(t => t.code === 'E08').key),
    dna: 'knowledge.science.biology.genetics-genomes.dna', dominance: 'knowledge.science.biology.genetics-genomes.dominance', switches: 'knowledge.science.biology.genetics-genomes.gene-regulation',
    acceleration: 'knowledge.science.physics.mechanics.motion.acceleration', harmony: 'knowledge.arts.music.harmony', plague: manifest.PACK_PLACES.find(p => p.packId === 'history').nodeId,
  };
  const packOf = nodeId => manifest.PACK_PLACES.find(p => p.nodeId === nodeId).packId;

  // --- proof: lessons run, checks passed ---
  const summary = level => ({ level, firstTry: { right: level === 'Understood' ? 5 : 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] });
  let exp = ledgerMod.createExpeditionLedger();
  let checks = checkLedgerMod.createCheckLedger();
  const runAt = (nodeId, level, when) => { exp = ledgerMod.recordRun(exp, { id: `seed-${packOf(nodeId)}-${when}`, packId: packOf(nodeId), summary: summary(level), at: when }); };
  const answerOf = (item, variant) => item.kind === 'choice' || item.kind === 'flaw' ? { pick: item.answer } : item.kind === 'order' ? { seq: [...item.answer] } : item.kind === 'match' ? { pairs: { ...item.pairs } } : { value: generators.checkVariant(item, variant).answer };
  const passAt = (nodeId, when) => {
    const id = `seed-check-${nodeId.split('.').at(-1)}-${when.slice(0, 10)}`;
    const started = progress.startCheck(nodeId, exp, checks, RealDate.parse(when), id);
    if (!started.items) return false;
    const base = RealDate.parse(when);
    const events = started.items.map((drawn, i) => session.attemptEvent({ session: id, node: nodeId, drawn, answer: answerOf(drawn.entry.item, drawn.variant), confidence: 'certain', ms: 18000, at: new RealDate(base + i * 20000).toISOString() }));
    events.push(session.finishEvent({ session: id, node: nodeId, items: started.items, at: new RealDate(base + started.items.length * 20000 + 5000).toISOString() }));
    checks = checkLedgerMod.appendCheckEvents(checks, events);
    return true;
  };
  runAt(P.acceleration, 'Understood', ago(78, 19)); passAt(P.acceleration, ago(70, 20));          // proved in August, Lasting, refresh now due
  runAt(P.selection, 'Familiar', ago(66, 18)); runAt(P.selection, 'Understood', ago(64, 19)); passAt(P.selection, ago(56, 21)); passAt(P.selection, ago(31, 20));
  runAt(P.harmony, 'Familiar', ago(36, 21));                                                      // begun, not proved
  runAt(P.dna, 'Understood', ago(21, 20)); passAt(P.dna, ago(13, 19));
  runAt(P.dominance, 'Understood', ago(11, 18));                                                   // its Lasting check is due
  runAt(P.deep, 'Familiar', ago(8, 20));
  runAt(P.heredity, 'Understood', ago(4, 19));
  runAt(P.plague, 'Understood', ago(2, 21));

  // --- the library: books and films, found in the catalogs the + sheet searches ---
  let library = libraryMod.createLibraryStore();
  // The catalog's own records for these books (Open Library works, looked up once), so the seed never waits on a search.
  const OL = {
    'The Beak of the Finch': ['OL1974714W', 'The Beak of the Finch', 'Jonathan Weiner', 1994, 420144, ['Evolution', 'Finches']],
    'The Selfish Gene': ['OL1966488W', 'The Selfish Gene', 'Richard Dawkins', 1976, 133936, ['Evolution (Biology)', 'Genetics', 'Sociobiology']],
    'Your Inner Fish': ['OL8036314W', 'Your Inner Fish', 'Neil Shubin', 2008, 4609000, ['Human anatomy', 'Human evolution']],
    'The Gene: An Intimate History': ['OL17762235W', 'The Gene', 'Siddhartha Mukherjee', 2016, 11320163, ['Genetics', 'Heredity']],
    'The Double Helix': ['OL2125469W', 'The Double Helix', 'James D. Watson', 1968, 4613920, ['DNA', 'Molecular biology']],
    "She Has Her Mother's Laugh": ['OL18999259W', 'She Has Her Mother’s Laugh', 'Carl Zimmer', 2018, 13311910, ['Heredity', 'Genetics']],
    'Six Easy Pieces': ['OL514626W', 'Six Easy Pieces', 'Richard P. Feynman', 1994, 134755, ['Physics']],
    'This Is Your Brain on Music': ['OL7952954W', 'This Is Your Brain on Music', 'Daniel J. Levitin', 2006, 362325, ['Music', 'Psychological aspects']],
    'A Distant Mirror': ['OL3378547W', 'A Distant Mirror', 'Barbara W. Tuchman', 1978, 5071195, ['History', 'France']],
    'The Great Mortality': ['OL4170661W', 'The Great Mortality', 'John Kelly', 2005, 20480, ['Black Death', 'Plague', 'History']],
    'The Sixth Extinction': ['OL16820830W', 'The Sixth Extinction', 'Elizabeth Kolbert', 2014, 7910870, ['Extinction (Biology)', 'Mass extinctions']],
  };
  const firstBook = async query => { const [workId, title, creator, year, cover, subjects] = OL[query]; return { source: 'ol', workId, title, creator, year, cover, subjects, editions: 1, isbns: [] }; };
  const books = [
    { q: 'The Beak of the Finch', by: 'weiner', place: P.selection, saved: 72, started: 70, finished: 58 },
    { q: 'The Selfish Gene', by: 'dawkins', place: P.selection, saved: 50, started: 47, finished: 33 },
    { q: 'Your Inner Fish', by: 'shubin', place: P.tree, saved: 9, started: 6 },
    { q: 'The Gene: An Intimate History', by: 'mukherjee', place: P.dna, saved: 30, started: 27, finished: 15 },
    { q: 'The Double Helix', by: 'watson', place: P.dna, saved: 18 },
    { q: "She Has Her Mother's Laugh", by: 'zimmer', place: P.dominance, saved: 12, started: 9 },
    { q: 'Six Easy Pieces', by: 'feynman', place: P.acceleration, saved: 84, started: 83, finished: 76 },
    { q: 'This Is Your Brain on Music', by: 'levitin', place: P.harmony, saved: 40, started: 31 },
    { q: 'A Distant Mirror', by: 'tuchman', place: P.plague, saved: 16, started: 12, finished: 5 },
    { q: 'The Great Mortality', by: 'kelly', place: P.plague, saved: 3 },
    { q: 'The Sixth Extinction', by: 'kolbert', place: P.extinction, saved: 24 },
  ];
  const keys = {};
  for (const b of books) {
    const found = await firstBook(b.q, b.by);
    if (!found) continue;
    const entry = at(ago(b.saved, 20), () => ol.entryFromBook(found, 'want', new Date().toISOString()));
    const key = libraryMod.entryKey(entry);
    library = at(ago(b.saved, 20), () => libraryMod.upsertEntry(library, entry));
    library = at(ago(b.saved, 20), () => libraryMod.setPlaces(library, entry.id, [b.place]));
    if (b.started) library = at(ago(b.started, 21), () => libraryMod.setStatus(library, key, 'started', new Date().toISOString()));
    if (b.finished) library = at(ago(b.finished, 22), () => libraryMod.setStatus(library, key, 'finished', new Date().toISOString()));
    keys[b.q] = key;
  }
  // The Evolution shelf's own copy of Darwin.
  library = at(ago(45, 21), () => libraryMod.setStatus(library, 'work:origin', 'started', new Date().toISOString()));
  keys.origin = 'work:origin';
  // Wikidata's own records for these (looked up once).
  const WD = {
    'Life on Earth': { source: 'wd', qid: 'Q6545267', title: 'Life on Earth', description: 'television series', creator: 'David Attenborough', year: 1979, kind: 'series', format: 'TV series', mainSubjects: ['evolution', 'natural history'], genres: ['nature documentary'] },
    'The Seventh Seal': { source: 'wd', qid: 'Q217189', title: 'The Seventh Seal', description: '1957 film by Ingmar Bergman', creator: 'Ingmar Bergman', year: 1957, kind: 'film', format: 'Film', mainSubjects: ['Black Death', 'death'], genres: ['drama film'] },
    'Amadeus': { source: 'wd', qid: 'Q190956', title: 'Amadeus', description: '1984 film directed by Miloš Forman', creator: 'Miloš Forman', year: 1984, kind: 'film', format: 'Film', mainSubjects: ['Wolfgang Amadeus Mozart'], genres: ['biographical film', 'drama film'] },
  };
  const screens = [
    { q: 'Life on Earth', kind: 'series', place: P.tree, saved: 44, started: 44, finished: 37 },
    { q: 'The Seventh Seal', kind: 'film', place: P.plague, saved: 6, started: 4, finished: 4 },
    { q: 'Amadeus', kind: 'film', place: P.harmony, saved: 28 },
  ];
  for (const s of screens) {
    let found = null;
    found = WD[s.q] ?? null;
    if (!found) continue;
    const entry = at(ago(s.saved, 20), () => wd.entryFromScreen(found, 'want', new Date().toISOString()));
    const key = libraryMod.entryKey(entry);
    library = at(ago(s.saved, 20), () => libraryMod.upsertEntry(library, entry));
    library = at(ago(s.saved, 20), () => libraryMod.setPlaces(library, entry.id, [s.place]));
    if (s.started) library = at(ago(s.started, 21), () => libraryMod.setStatus(library, key, 'started', new Date().toISOString()));
    if (s.finished) library = at(ago(s.finished, 22, 2), () => libraryMod.setStatus(library, key, 'finished', new Date().toISOString()));
    keys[s.q] = key;
  }

  // --- Watch: videos saved the way the Save sheet saves them, some watched through ---
  const pool = await poolMod.loadPool();
  const channels = pool.channels;
  const pick = (test, n, skip = 0) => pool.videos.filter(v => !v.short && test(v.places[0])).slice(skip, skip + n);
  const videos = [
    ...pick(id => id.startsWith(P.selection), 2), ...pick(id => id.startsWith('knowledge.science.biology.evolution.') && !id.startsWith(P.selection), 2),
    ...pick(id => id.startsWith('knowledge.science.biology.genetics-genomes'), 2), ...pick(id => id.startsWith('knowledge.science.physics.mechanics'), 2),
    ...pick(id => id.startsWith('knowledge.arts.music'), 2), ...pick(id => id === P.plague || id === 'knowledge.humanities.history.medieval-world', 2),
    ...pick(id => id.startsWith('knowledge.humanities.philosophy'), 1),
  ];
  let memory = memoryMod.createFeedMemory();
  const linkKeys = {};
  videos.forEach((video, i) => {
    const when = ago(60 - i * 4.5, 22);
    const places = video.places;
    library = at(when, () => libraryMod.saveLink(library, {
      url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: places[0], places: places.slice(1),
      preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: new Date().toISOString() },
    }));
    linkKeys[video.places[0]] = linkKeys[video.places[0]] ?? `link:${library.links.at(-1).id}`;
    if (i % 3 !== 2) memory = memoryMod.recordImpression(memory, video, { ...engagement.emptyImpression(false), dwellMs: 420000, playedS: 600, durationS: 610, ended: true, saved: true }, new RealDate(RealDate.parse(when) + 3600e3).toISOString());
  });

  // --- links read by the link reader ---
  const pages = [
    { url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: 'The peppered moth, in full', place: P.selection, saved: 53 },
    { url: 'https://en.wikipedia.org/wiki/Galileo%27s_Leaning_Tower_of_Pisa_experiment', note: '', place: P.acceleration, saved: 74 },
    { url: 'https://en.wikipedia.org/wiki/Harmonic_series_(music)', note: '', place: P.harmony, saved: 33 },
    { url: 'https://en.wikipedia.org/wiki/Spaced_repetition', note: '', place: null, saved: 26 },
    { url: 'https://en.wikipedia.org/wiki/Dolly_(sheep)', note: 'Dolly, and what one udder cell knew', place: P.switches, saved: 7 },
  ];
  for (const p of pages) {
    let preview = null;
    try { preview = await linkSheet.unfurlLink(p.url); } catch { preview = null; }
    library = at(ago(p.saved, 19), () => libraryMod.saveLink(library, { url: p.url, note: p.note, nodeId: p.place, preview }));
  }
  const dollyKey = `link:${library.links.at(-1).id}`;

  // --- notes and questions ---
  let notebook = notebookMod.createNotebook();
  const notes = [
    { kind: 'idea', title: 'Selection doesn’t make the variation. It only sorts what is already there.', place: P.selection, days: 57 },
    { kind: 'idea', title: 'A hammer and a feather land together: mass isn’t in the equation.', place: P.acceleration, days: 75 },
    { kind: 'idea', title: 'Consonance is simple ratios: 2:1, 3:2, 4:3.', place: P.harmony, days: 30 },
    { kind: 'question', title: 'If every cell has the same genome, what decides which genes switch on?', place: P.switches, days: 7 },
    { kind: 'question', title: 'How many generations does it take to make a new species?', place: P.species, days: 19 },
    { kind: 'question', title: 'Why did the plague travel faster by sea than by road?', place: P.plague, days: 1 },
  ];
  const noteKeys = [];
  for (const n of notes) {
    notebook = at(ago(n.days, 22), () => notebookMod.upsertNotebookEntry(notebook, { title: n.title, body: '', sourceUrl: '', sourceLabel: '', kind: n.kind, evidence: 'encountered', nodeIds: [n.place] }));
    noteKeys.push(`note:${notebook.entries[0].id}`);
  }

  // --- reels kept from the Reels tab ---
  let shelf = pins.createReelShelf();
  const reels = [
    ['e03-ninety-eight-in-a-hundred', 55], ['e01-the-fish-with-lungs', 39], ['e06-the-abyss-of-time', 9], ['e08-the-great-dying', 23],
    ['dna-four-letters', 20], ['dominance-blue-wont-breed-true', 10], ['gene-regulation-dolly', 6], ['physics-hammer-and-feather', 77],
    ['music-legend-of-the-hammers', 35], ['plague-ships-beat-roads', 2],
  ];
  for (const [id, days] of reels) {
    const reel = deck.getReel(id);
    if (!reel) continue;
    shelf = pins.savePin(shelf, id, [reel.nodeId], ago(days, 21));
    if (days > 8) shelf = pins.markWatched(shelf, id);
  }

  // --- two collections of the learner's own ---
  let collections = collectionsMod.createCollections();
  collections = at(ago(14, 20), () => collectionsMod.createCollection(collections, { name: 'What survives a catastrophe?', items: [keys['The Sixth Extinction'], 'reel:e08-the-great-dying', keys['A Distant Mirror'], keys['The Seventh Seal'], 'reel:plague-ships-beat-roads', noteKeys[5], keys['The Great Mortality']].filter(Boolean) }).record);
  collections = at(ago(5, 20), () => collectionsMod.createCollection(collections, { name: 'How traits pass on', items: [keys['The Gene: An Intimate History'], 'reel:dominance-blue-wont-breed-true', keys["She Has Her Mother's Laugh"], dollyKey, keys['The Beak of the Finch'], noteKeys[3], 'reel:gene-regulation-dolly', linkKeys['knowledge.science.biology.genetics-genomes.dna']].filter(Boolean) }).record);

  const problems = [
    libraryMod.saveLibrary(library), notebookMod.saveNotebook(notebook), ledgerMod.saveExpeditionLedger(exp), checkLedgerMod.saveCheckLedger(checks),
    pins.saveReelShelf(shelf), memoryMod.saveFeedMemory(memory) ? null : 'feed memory not kept', collectionsMod.saveCollections(collections),
  ].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { items: library.items.length, links: library.links.length, notes: notebook.entries.length, reels: shelf.pinned.length, runs: exp.runs.length, checks: checks.events.length, collections: collections.collections.length, books: Object.keys(keys).length };
}

export async function seedThree() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, notebookMod, pins, deck, poolMod, youtube] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/explore/pins.ts'), imp('/src/explore/deck.ts'), imp('/src/feed/pool.ts'), imp('/src/feed/youtube.ts'),
  ]);
  const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
  const ago = days => new Date(Date.now() - days * 864e5).toISOString();
  let shelf = pins.createReelShelf();
  const reel = deck.getReel('physics-hammer-and-feather');
  shelf = pins.savePin(shelf, reel.id, [reel.nodeId], ago(3));
  shelf = pins.markWatched(shelf, reel.id);
  const pool = await poolMod.loadPool();
  const video = pool.videos.find(v => !v.short && v.places[0].startsWith('knowledge.science.physics.mechanics'));
  let library = libraryMod.createLibraryStore();
  library = libraryMod.saveLink(library, {
    url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
    preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: ago(2) },
  });
  let notebook = notebookMod.createNotebook();
  notebook = notebookMod.upsertNotebookEntry(notebook, { title: 'Why does a heavier ball not fall faster?', body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: [ACCELERATION] });
  const problems = [libraryMod.saveLibrary(library), notebookMod.saveNotebook(notebook), pins.saveReelShelf(shelf)].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { reel: reel.id, video: video.id };
}

/** Run after `seed`: reads what it wrote back through each store's own loader, and adds ten months more. */
export async function seedHeavy() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, notebookMod, pins, deck, poolMod, memoryMod, youtube, engagement, collectionsMod] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/explore/pins.ts'), imp('/src/explore/deck.ts'), imp('/src/feed/pool.ts'),
    imp('/src/feed/memory.ts'), imp('/src/feed/youtube.ts'), imp('/src/feed/engagement.ts'), imp('/src/lab/library-c/collections.ts'),
  ]);
  const NOW = Date.now();
  // Never later than a minute ago: half a day back at 22:00 would otherwise land tomorrow.
  const ago = (days, hour = 0) => new Date(Math.min(NOW - 6e4, NOW - days * 864e5 + hour * 36e5)).toISOString();
  const RealDate = Date;
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  let library = libraryMod.loadLibrary().data;
  let notebook = notebookMod.loadNotebook().data;
  let shelf = pins.loadReelShelf();
  let memory = memoryMod.loadFeedMemory();
  let collections = collectionsMod.loadCollections().data;

  // Every reel in the deck, kept across the months; most of them watched.
  deck.REELS.forEach((reel, i) => {
    if (shelf.pinned.some(p => p.id === reel.id)) return;
    shelf = pins.savePin(shelf, reel.id, [reel.nodeId], ago(12 + ((i * 37) % 270), 21));
    if (i % 4 !== 0) shelf = pins.markWatched(shelf, reel.id);
  });

  // Watch: real pool videos across the fields this learner reads, the newest interests most recent.
  const pool = await poolMod.loadPool();
  const have = new Set(library.links.map(l => youtube.videoIdFromUrl(l.url)).filter(Boolean));
  const quotas = [
    ['knowledge.science.biology.evolution', 28, 2], ['knowledge.humanities.history', 24, 20], ['knowledge.arts.architecture', 20, 9], ['knowledge.humanities.archaeology', 14, 14],
    ['knowledge.science.astronomy', 16, 40], ['knowledge.arts.visual-arts', 18, 30], ['knowledge.humanities.philosophy', 16, 50], ['knowledge.technology.engineering', 18, 60],
    ['knowledge.science.biology.animals', 16, 70], ['knowledge.science.physics', 16, 90], ['knowledge.science.chemistry', 12, 110], ['knowledge.earth.geology', 12, 25],
    ['knowledge.arts.music', 14, 120], ['knowledge.mathematics', 12, 150], ['knowledge.economics', 12, 180], ['knowledge.society.politics', 6, 200],
    ['knowledge.society.psychology', 6, 210], ['knowledge.humanities.languages', 4, 230],
  ];
  let n = 0;
  for (const [root, count, start] of quotas) {
    const videos = pool.videos.filter(v => !v.short && (v.places[0] === root || v.places[0].startsWith(`${root}.`)) && !have.has(v.id)).slice(0, count);
    videos.forEach((video, i) => {
      have.add(video.id);
      const when = ago(start + i * 3.1 + (n++ % 3) * 0.4, 22);
      library = at(when, () => libraryMod.saveLink(library, {
        url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
        preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: new Date().toISOString() },
      }));
      if (i % 3 !== 1) memory = memoryMod.recordImpression(memory, video, { ...engagement.emptyImpression(false), dwellMs: 420000, playedS: 600, durationS: 610, ended: true, saved: true }, new RealDate(RealDate.parse(when) + 3600e3).toISOString());
    });
  }

  // More of their own words.
  const HUMAN = 'knowledge.science.biology.evolution.human-evolution';
  const notes = [
    { kind: 'question', title: 'If we share an ancestor with chimps, why did only one line leave the trees?', place: HUMAN, days: 0.5 },
    { kind: 'idea', title: 'We didn’t come from chimpanzees. We’re cousins who kept changing on separate branches.', place: HUMAN, days: 2 },
    { kind: 'idea', title: 'A flying buttress moves the roof’s push outward and down, so the wall can be mostly glass.', place: 'knowledge.arts.architecture', days: 9 },
    { kind: 'question', title: 'Why did Romans stop building in concrete after the empire fell?', place: 'knowledge.arts.architecture', days: 11 },
    { kind: 'idea', title: 'Göbekli Tepe is older than farming: the temple may have come before the village.', place: 'knowledge.humanities.archaeology', days: 14 },
    { kind: 'idea', title: 'Perspective was invented, not discovered.', place: 'knowledge.arts.visual-arts', days: 31 },
    { kind: 'idea', title: 'Light from the Andromeda galaxy left it before there were humans.', place: 'knowledge.science.astronomy', days: 39 },
    { kind: 'question', title: 'Is free will compatible with physics, or only with not knowing the physics?', place: 'knowledge.humanities.philosophy', days: 48 },
    { kind: 'idea', title: 'Octopuses think with their arms: two thirds of the neurons are out there.', place: 'knowledge.science.biology.animals', days: 64 },
    { kind: 'question', title: 'Why does a suspension bridge need the deck to be stiff at all?', place: 'knowledge.technology.engineering', days: 61 },
    { kind: 'idea', title: 'Entropy is counting: more ways to be mixed than to be sorted.', place: 'knowledge.science.physics', days: 86 },
    { kind: 'idea', title: 'Money is a ledger of who owes whom; coins came late.', place: 'knowledge.economics', days: 184 },
    { kind: 'question', title: 'Why is the proof of Fermat’s Last Theorem about elliptic curves?', place: 'knowledge.mathematics', days: 154 },
    { kind: 'question', title: 'Did the Silk Road carry the plague, or only the fleas?', place: 'knowledge.humanities.history.medieval-world.black-death', days: 17 },
  ];
  for (const note of notes) notebook = at(ago(note.days, 22), () => notebookMod.upsertNotebookEntry(notebook, { title: note.title, body: '', sourceUrl: '', sourceLabel: '', kind: note.kind, evidence: 'encountered', nodeIds: [note.place] }));

  const reelKeys = id => `reel:${id}`;
  const deckIds = new Set(deck.REELS.map(r => r.id));
  const pick = (...ids) => ids.filter(id => deckIds.has(id)).map(reelKeys);
  collections = at(ago(2, 20), () => collectionsMod.createCollection(collections, { name: 'Cousins, not ancestors', items: pick('e09-why-still-chimpanzees', 'e09-lucy-stood-up-first', 'e09-out-of-africa', 'e01-the-fish-with-lungs') }).record);
  collections = at(ago(24, 20), () => collectionsMod.createCollection(collections, { name: 'How we learned the Earth is old', items: pick('e06-the-abyss-of-time', 'e06-six-seconds-to-midnight', 'e08-the-great-dying') }).record);

  const problems = [libraryMod.saveLibrary(library), notebookMod.saveNotebook(notebook), pins.saveReelShelf(shelf), memoryMod.saveFeedMemory(memory) ? null : 'feed memory not kept', collectionsMod.saveCollections(collections)].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { links: library.links.length, items: library.items.length, notes: notebook.entries.length, reels: shelf.pinned.length };
}

/** Run after `seedHeavy`: the last ten days as a daily Watch user lives them, sixty more videos saved across ten
 * fields (the case that once grew the issue to two dozen sections). */
export async function seedRecent() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, poolMod, youtube] = await Promise.all([imp('/src/notebook/libraryStore.ts'), imp('/src/feed/pool.ts'), imp('/src/feed/youtube.ts')]);
  const RealDate = Date;
  const NOW = Date.now();
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  let library = libraryMod.loadLibrary().data;
  const pool = await poolMod.loadPool();
  const have = new Set(library.links.map(l => youtube.videoIdFromUrl(l.url)).filter(Boolean));
  const roots = ['knowledge.science.chemistry', 'knowledge.earth.geology', 'knowledge.mathematics', 'knowledge.economics', 'knowledge.science.astronomy', 'knowledge.arts.architecture', 'knowledge.technology.engineering', 'knowledge.science.biology.animals', 'knowledge.society.psychology', 'knowledge.arts.visual-arts'];
  let n = 0;
  for (const root of roots) {
    for (const video of pool.videos.filter(v => !v.short && (v.places[0] === root || v.places[0].startsWith(`${root}.`)) && !have.has(v.id)).slice(0, 6)) {
      have.add(video.id);
      const when = new RealDate(NOW - (n++ % 10) * 864e5 - 3600e3).toISOString();
      library = at(when, () => libraryMod.saveLink(library, {
        url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
        preview: { title: video.title.slice(0, 300), description: (video.learn || '').slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: when },
      }));
    }
  }
  const problem = libraryMod.saveLibrary(library);
  if (problem) throw new Error(problem);
  return { added: n, links: library.links.length };
}
