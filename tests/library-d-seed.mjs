// The learners the Logbook's journey and screenshots use (tests/library-d-journey.mjs, tests/library-d-shots.mjs),
// written through the app's own store modules inside the page (page.evaluate(...)), never the app's code paths.
//
//   firstThree   a learner two days in: a book saved (found through Open Library), a reel kept from the
//                Reels tab and a Watch video watched through. Three dated rows.
//   oneLesson    the first Evolution lesson played through an hour ago (added to whatever is there).
//   seed         the heavy learner: the Mosaic's learner a few months in (as tests/library-c-seed.mjs: books and
//                films, Watch videos, reels, links, notes, six places proved, two ready to refresh, two
//                collections), plus the year before it, written by addYear: some two hundred Watch videos
//                from the real pool saved across twelve earlier months (two in three watched through), a few
//                dozen notes and questions, and links read from Wikipedia's own pages.
//
// Each store is saved with its own save function. Each returns a count of what it wrote.
export async function firstThree() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, pins, deck, poolMod, memoryMod, ol, youtube, engagement] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/explore/pins.ts'), imp('/src/explore/deck.ts'), imp('/src/feed/pool.ts'),
    imp('/src/feed/memory.ts'), imp('/src/notebook/openLibrary.ts'), imp('/src/feed/youtube.ts'), imp('/src/feed/engagement.ts'),
  ]);
  const NOW = Date.now();
  const ago = (days, hour = 0) => new Date(NOW - days * 864e5 + hour * 36e5).toISOString();
  const RealDate = Date;
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
  let library = libraryMod.createLibraryStore();
  // A book saved this morning, found as the + sheet finds it.
  let found = null;
  try { found = (await ol.searchBooks('Six Easy Pieces')).find(b => b.cover && b.creator.toLowerCase().includes('feynman')) ?? null; } catch { found = null; }
  const entry = found
    ? at(ago(0, -1), () => ol.entryFromBook(found, 'want', new Date().toISOString()))
    : { id: 'ol-OL1956301W', kind: 'book', format: 'Book', title: 'Six Easy Pieces', creator: 'Richard P. Feynman', year: 1994, cover: null, ids: { ol: 'OL1956301W' }, subjects: [], tags: [], places: [], placesBy: 'auto', status: 'want', addedAt: ago(0, -1), source: 'search', createdAt: ago(0, -1), updatedAt: ago(0, -1) };
  library = at(ago(0, -1), () => libraryMod.upsertEntry(library, entry));
  library = at(ago(0, -1), () => libraryMod.setPlaces(library, entry.id, [ACCELERATION]));
  // A reel kept yesterday.
  let shelf = pins.createReelShelf();
  const reel = deck.getReel('physics-hammer-and-feather');
  if (reel) shelf = pins.savePin(shelf, reel.id, [reel.nodeId], ago(1, -3));
  // A Watch video saved and watched through the day before.
  const pool = await poolMod.loadPool();
  const video = pool.videos.find(v => !v.short && v.places[0].startsWith('knowledge.science.biology.evolution.')) ?? pool.videos.find(v => !v.short);
  let memory = memoryMod.createFeedMemory();
  const when = ago(2, -4);
  library = at(when, () => libraryMod.saveLink(library, {
    url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
    preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: new Date().toISOString() },
  }));
  memory = memoryMod.recordImpression(memory, video, { ...engagement.emptyImpression(false), dwellMs: 420000, playedS: 600, durationS: 610, ended: true, saved: true }, new RealDate(RealDate.parse(when) + 1800e3).toISOString());
  const problems = [libraryMod.saveLibrary(library), pins.saveReelShelf(shelf), memoryMod.saveFeedMemory(memory) ? null : 'feed memory not kept'].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { items: library.items.length, links: library.links.length, reels: shelf.pinned.length, book: entry.title, video: video.id };
}

/** One lesson played through an hour ago (the first Evolution lesson, Understood): the learner's first proof. */
export async function oneLesson() {
  const ledgerMod = await import(/* @vite-ignore */ '/src/expeditions/ledger.ts');
  const summary = { level: 'Understood', firstTry: { right: 7, total: 7 }, transfer: { right: 2, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] };
  const exp = ledgerMod.recordRun(ledgerMod.loadExpeditionLedger().data, { id: 'seed-one-lesson', packId: 'evolution-e01', summary, at: new Date(Date.now() - 36e5).toISOString() });
  const problem = ledgerMod.saveExpeditionLedger(exp);
  if (problem) throw new Error(problem);
  return exp.runs.length;
}

/** The year before the Mosaic's learner: twelve earlier months of Watch, notes and pages. */
export async function addYear() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, notebookMod, poolMod, memoryMod, youtube, engagement, linkSheet] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/feed/pool.ts'), imp('/src/feed/memory.ts'), imp('/src/feed/youtube.ts'),
    imp('/src/feed/engagement.ts'), imp('/src/notebook/LinkSheet.tsx'),
  ]);
  const NOW = Date.now();
  const ago = (days, hour = 0) => new Date(NOW - days * 864e5 + hour * 36e5).toISOString();
  const RealDate = Date;
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let library = libraryMod.loadLibrary().data;
  let notebook = notebookMod.loadNotebook().data;
  let memory = memoryMod.loadFeedMemory();
  const pool = await poolMod.loadPool();
  const saved = new Set(libraryMod.liveLinks(library).map(link => youtube.videoIdFromUrl(link.url)).filter(Boolean));
  const videos = pool.videos.filter(v => !v.short && !saved.has(v.id));
  // Spread across the subjects the pool covers, as a curious year would be.
  const chosen = [];
  const bySubject = new Map();
  for (const v of videos) { const subject = v.places[0].split('.').slice(0, 2).join('.'); bySubject.set(subject, [...(bySubject.get(subject) ?? []), v]); }
  const lists = [...bySubject.values()];
  for (let i = 0; chosen.length < 210 && i < 400; i++) { const list = lists[i % lists.length]; const v = list[Math.floor(i / lists.length)]; if (v) chosen.push(v); }
  chosen.forEach((video, i) => {
    const when = ago(95 + Math.floor((i / chosen.length) * 330 + random() * 6), 18 + Math.floor(random() * 5));
    library = at(when, () => libraryMod.saveLink(library, {
      url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
      preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: new Date().toISOString() },
    }));
    if (random() < 0.67) memory = memoryMod.recordImpression(memory, video, { ...engagement.emptyImpression(false), dwellMs: 400000, playedS: 580, durationS: 600, ended: true, saved: true }, new RealDate(RealDate.parse(when) + 2400e3).toISOString());
  });
  // Notes and questions, each on the place of a video watched that month.
  const asks = [
    'Why does a falling cat always land on its feet?', 'What makes a chord sound sad?', 'How did the first cities feed themselves?', 'Is money only a shared story?',
    'Why do some proofs need infinity?', 'What would a Roman soldier have eaten on the march?', 'How do bees agree on a new home?', 'Why is the sky dark at night if the universe is endless?',
    'Do words shape what we can think?', 'How does a vaccine teach the body?', 'Why did the printing press spread so fast?', 'What makes a good question in science?',
  ];
  const ideas = [
    'Interest compounds on itself: the curve hides its steepest part at the end.', 'A melody is a question; the cadence answers it.', 'Rivers decided where empires could grow.',
    'Most of a cell is water, and most of the rest is machinery.', 'Supply and demand is a picture of many small choices.', 'Every map leaves things out on purpose.',
  ];
  [...asks.map(t => ['question', t]), ...ideas.map(t => ['idea', t])].forEach(([kind, title], i) => {
    const video = chosen[(i * 7) % chosen.length];
    notebook = at(ago(100 + i * 11, 22), () => notebookMod.upsertNotebookEntry(notebook, { title, body: '', sourceUrl: '', sourceLabel: '', kind, evidence: 'encountered', nodeIds: [video.places[0]] }));
  });
  // Pages read along the way.
  const pages = [
    ['https://en.wikipedia.org/wiki/Bach%27s_cantatas', 'knowledge.arts.music', 240], ['https://en.wikipedia.org/wiki/Supply_and_demand', 'knowledge.economics.markets', 300],
    ['https://en.wikipedia.org/wiki/Euclid%27s_Elements', 'knowledge.mathematics.geometry', 350], ['https://en.wikipedia.org/wiki/Honey_bee', 'knowledge.science.biology', 180],
  ];
  for (const [url, nodeId, days] of pages) {
    let preview = null;
    try { preview = await linkSheet.unfurlLink(url); } catch { preview = null; }
    library = at(ago(days, 20), () => libraryMod.saveLink(library, { url, note: '', nodeId, preview }));
  }
  const problems = [libraryMod.saveLibrary(library), notebookMod.saveNotebook(notebook), memoryMod.saveFeedMemory(memory) ? null : 'feed memory not kept'].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { links: library.links.length, notes: notebook.entries.length, videos: chosen.length };
}

// The Mosaic's learner a few months in, as tests/library-c-seed.mjs writes it, with Open Library allowed to fail
// a lookup (the book is then left out). Kept here whole so this page's tests stand on their own.
async function seedMonths() {
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
  // Open Library can be slow or briefly refuse: one more try, then the book is left out rather than the learner.
  const search = async query => { for (let i = 0; i < 2; i++) { try { return await ol.searchBooks(query); } catch { await new Promise(r => setTimeout(r, 1500)); } } return []; };
  const firstBook = async (query, creator) => { const found = await search(query); return found.find(b => b.cover && (!creator || b.creator.toLowerCase().includes(creator))) ?? found.find(b => b.cover) ?? found[0]; };
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
  const screens = [
    { q: 'Life on Earth', kind: 'series', place: P.tree, saved: 44, started: 44, finished: 37 },
    { q: 'The Seventh Seal', kind: 'film', place: P.plague, saved: 6, started: 4, finished: 4 },
    { q: 'Amadeus', kind: 'film', place: P.harmony, saved: 28 },
  ];
  for (const s of screens) {
    let found = null;
    try { const results = await wd.searchScreen(s.q); found = results.find(r => r.kind === s.kind && r.title.toLowerCase() === s.q.toLowerCase()) ?? results.find(r => r.title.toLowerCase() === s.q.toLowerCase()) ?? results[0]; } catch { found = null; }
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


export { seedMonths as seed };
