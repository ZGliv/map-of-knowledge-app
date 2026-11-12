// A learner a few months in, across Genetics, Evolution, Physics, Music and History, written into the
// app's real stores with the app's own code (run inside the page by tests/library-b-shots.mjs): books
// and films found through Open Library and Wikidata and added as the + sheet adds them, links read by
// /api/unfurl and saved as the link sheet saves them, videos saved from the Watch pool as Watch saves
// them, reels kept as Reels keeps them, notes written as the notebook writes them, lessons run and
// checks passed through the ledgers. Dates are spread over the last four months.
//
// Self-contained: Playwright sends this function's source into the page.

export async function seedLearner() {
  const imp = p => import(/* @vite-ignore */ p);
  const [store, notebookMod, ledgerMod, checkLedger, progress, session, generators, openLibrary, wikidata, linkSheet, pins, memory, poolMod, content] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/expeditions/ledger.ts'), imp('/src/checks/ledger.ts'), imp('/src/checks/progress.ts'),
    imp('/src/checks/session.ts'), imp('/src/checks/generators.ts'), imp('/src/notebook/openLibrary.ts'), imp('/src/notebook/wikidata.ts'), imp('/src/notebook/LinkSheet.tsx'),
    imp('/src/explore/pins.ts'), imp('/src/feed/memory.ts'), imp('/src/feed/pool.ts'), imp('/src/content.ts'),
  ]);
  const DAY = 864e5;
  const NOW = Date.now();
  // A day this many days ago, at a learner's hour.
  const ago = (days, hour = 20) => { const d = new Date(NOW - days * DAY); d.setHours(hour, (days * 7) % 60, 0, 0); return d.toISOString(); };
  // Code that stamps with the clock (link saves, note edits) runs as if on that day.
  const realNow = Date.now;
  const on = (iso, fn) => { Date.now = () => Date.parse(iso); try { return fn(); } finally { Date.now = realNow; } };

  const E = key => `knowledge.science.biology.evolution.${key}`;
  const G = key => `knowledge.science.biology.genetics-genomes.${key}`;
  const PHYS = 'knowledge.science.physics', MUSIC = 'knowledge.arts.music', HIST = 'knowledge.humanities.history';
  const ACCEL = `${PHYS}.mechanics.motion.acceleration`, HARMONY = `${MUSIC}.harmony`, MEDIEVAL = `${HIST}.medieval-world`, PLAGUE = `${MEDIEVAL}.black-death`;
  const report = { works: 0, worksMissed: [], films: 0, links: 0, linksRead: 0, videos: 0, reels: 0, notes: 0, quotes: 0 };

  // --- Books and films: searched and added as the + sheet does, then placed by hand. ---
  let library = store.createLibraryStore();
  const BOOKS = [
    ['The Beak of the Finch', 'Weiner', [E('natural-selection')], 'finished', 70, 52],
    ['The Selfish Gene', 'Dawkins', [E('natural-selection')], 'finished', 84, 63],
    ['Your Inner Fish', 'Shubin', [E('tree-thinking')], 'finished', 44, 31],
    ['On the Origin of Species', 'Darwin', ['knowledge.science.biology.evolution'], 'started', 12],
    ['The Sixth Extinction', 'Kolbert', [E('transitions-extinctions')], 'finished', 28, 17],
    ['Wonderful Life', 'Gould', [E('evidence')], 'want', 40],
    ['Why Evolution Is True', 'Coyne', [E('evidence')], 'started', 9],
    ['Basin and Range', 'McPhee', [E('deep-time')], 'finished', 16, 6],
    ["The Ancestor's Tale", 'Dawkins', [E('tree-thinking')], 'want', 22],
    ['The Gene: An Intimate History', 'Mukherjee', ['knowledge.science.biology.genetics-genomes'], 'finished', 104, 76],
    ['The Double Helix', 'Watson', [G('dna')], 'finished', 39, 34],
    ['The Code Breaker', 'Isaacson', [G('gene-regulation')], 'started', 5],
    ["She Has Her Mother's Laugh", 'Zimmer', [G('dominance')], 'want', 18],
    ['Genome: The Autobiography of a Species', 'Ridley', [G('dna')], 'finished', 92, 83],
    ['Rosalind Franklin: The Dark Lady of DNA', 'Maddox', [G('dna')], 'want', 33],
    ['Six Easy Pieces', 'Feynman', [PHYS], 'finished', 58, 49],
    ['The Elegant Universe', 'Greene', [PHYS], 'finished', 48, 41],
    ['The Fabric of the Cosmos', 'Greene', [`${PHYS}.relativity`], 'started', 3],
    ["Galileo's Daughter", 'Sobel', [ACCEL], 'want', 15],
    ["Surely You're Joking, Mr. Feynman!", 'Feynman', [PHYS], 'finished', 97, 86],
    ['This Is Your Brain on Music', 'Levitin', [MUSIC], 'finished', 66, 55],
    ['How Music Works', 'Byrne', [MUSIC], 'started', 14],
    ['The Rest Is Noise', 'Ross', [MUSIC], 'want', 26],
    ['Musicophilia', 'Sacks', [MUSIC], 'finished', 30, 21],
    ['A Distant Mirror', 'Tuchman', [MEDIEVAL], 'finished', 112, 89],
    ['The Great Mortality', 'Kelly', [PLAGUE], 'finished', 27, 15],
    ['The Black Death', 'Ziegler', [PLAGUE], 'want', 11],
    ['SPQR', 'Beard', [HIST], 'started', 20],
  ];
  const keys = {};
  for (const [title, author, places, status, from, to] of BOOKS) {
    let found = null;
    try {
      const results = (await openLibrary.searchBooks(`${title} ${author}`)).filter(book => book.cover);
      found = results.map(book => ({ book, score: openLibrary.titleMatch({ title, creator: author }, book) })).sort((x, y) => y.score - x.score)[0]?.book ?? null;
    } catch { found = null; }
    if (!found) { report.worksMissed.push(title); continue; }
    const added = ago(from, 21);
    let entry = openLibrary.entryFromBook(found, 'want', added);
    library = store.upsertEntry(library, entry, added);
    const key = store.entryKey(entry);
    if (status !== 'want') library = store.setStatus(library, key, 'started', ago(from - 1, 22));
    if (status === 'finished') library = store.setStatus(library, key, 'finished', ago(to, 22));
    const live = store.entryAt(library, key);
    if (live && !live.ids.shelf) library = store.setPlaces(library, live.id, places, ago(from, 21));
    keys[title] = key;
    report.works += 1;
  }
  const SCREEN = [
    ['Cosmos: A Spacetime Odyssey', [PHYS], 'finished', 75, 60],
    ['Particle Fever', [PHYS], 'finished', 37, 37],
    ['Amadeus', [MUSIC], 'finished', 52, 52],
    ['The Seventh Seal', [PLAGUE], 'finished', 19, 19],
    ['Your Inner Fish', [E('tree-thinking')], 'want', 29],
  ];
  for (const [title, places, status, from, to] of SCREEN) {
    let found = null;
    try { found = (await wikidata.searchScreen(title)).find(item => item.title.toLowerCase().startsWith(title.toLowerCase().slice(0, 12))) ?? null; } catch { found = null; }
    if (!found) { report.worksMissed.push(title); continue; }
    const added = ago(from, 21);
    const entry = wikidata.entryFromScreen(found, 'want', added);
    library = store.upsertEntry(library, entry, added);
    const key = store.entryKey(entry);
    if (status === 'finished') { library = store.setStatus(library, key, 'started', ago(from, 22)); library = store.setStatus(library, key, 'finished', ago(to, 23)); }
    library = store.setPlaces(library, store.entryAt(library, key).id, places, added);
    report.films += 1;
  }
  // Passages and thoughts kept on a few of them.
  const QUOTES = [
    ['The Beak of the Finch', 'quote', 'Darwin did not know how much power he had uncovered. He did not know that natural selection is often swift.', 'p. 9', 55],
    ['The Beak of the Finch', 'note', 'After the 1977 drought the surviving medium ground finches had beaks about 4% deeper. The next generation inherited it.', 'Ch. 5', 54],
    ['The Great Mortality', 'quote', 'Wherever the plague arrived, it seemed to arrive by water first.', '', 16],
    ['Six Easy Pieces', 'note', 'Everything is made of atoms: the one sentence to pass on if all knowledge were lost.', 'Lecture 1', 50],
    ['The Double Helix', 'note', 'Photo 51 is what made the helix undeniable. Franklin\'s data, read without her permission.', '', 34],
  ];
  for (const [title, kind, text, where, days] of QUOTES) {
    if (!keys[title]) continue;
    library = store.addNote(library, { target: keys[title], kind, text, where }, ago(days, 22));
    report.quotes += 1;
  }

  // --- Links: read by /api/unfurl, saved as the link sheet saves them. ---
  const W = slug => `https://en.wikipedia.org/wiki/${slug}`;
  const LINKS = [
    [W('Peppered_moth_evolution'), E('natural-selection'), 61],
    [W("Darwin's_finches"), E('natural-selection'), 57],
    [W('Tiktaalik'), E('tree-thinking'), 36],
    [W('Chicxulub_crater'), E('transitions-extinctions'), 24],
    [W('Geologic_time_scale'), E('deep-time'), 8],
    [W('E._coli_long-term_evolution_experiment'), E('evolution-now'), 13],
    [W('Meselson–Stahl_experiment'), G('dna'), 42],
    [W('Photo_51'), G('dna'), 35],
    [W('Lac_operon'), G('gene-regulation'), 6],
    [W('Dolly_(sheep)'), G('gene-regulation'), 4],
    [W('Dominance_(genetics)'), G('dominance'), 17],
    [W("Galileo's_Leaning_Tower_of_Pisa_experiment"), ACCEL, 19],
    [W('Equivalence_principle'), `${PHYS}.relativity`, 2],
    [W('Harmonic_series_(music)'), HARMONY, 9],
    [W('Pythagorean_tuning'), HARMONY, 10],
    [W('Timbre'), `${MUSIC}.timbre`, 31],
    [W('Black_Death_in_England'), PLAGUE, 23],
    [W('Flagellant'), PLAGUE, 21],
    [W("Hundred_Years'_War"), MEDIEVAL, 94],
    [W('Rosalind_Franklin'), G('dna'), 33],
    [W('Zettelkasten'), null, 45],
    ['https://www.gutenberg.org/ebooks/1228', null, 12],
  ];
  for (const [url, nodeId, days] of LINKS) {
    let preview = null;
    try { preview = await linkSheet.unfurlLink(url); } catch { preview = null; }
    if (preview) report.linksRead += 1;
    library = on(ago(days, 13), () => store.saveLink(library, { url, note: '', nodeId, preview }));
    report.links += 1;
  }

  // --- Videos saved from Watch: the pool's own videos, under their own places. ---
  const pool = await poolMod.loadPool();
  const channels = pool.channels;
  const FIELDS = ['knowledge.science.biology.evolution', 'knowledge.science.biology.genetics-genomes', PHYS, MUSIC, HIST];
  const within = (id, scope) => id === scope || id.startsWith(`${scope}.`);
  const watchedAt = {};
  let v = 0;
  for (const field of FIELDS) {
    const picks = pool.videos.filter(video => !video.short && video.places.some(place => within(place, field))).slice(0, field === HIST ? 5 : 6);
    for (const video of picks) {
      const places = video.places.filter(place => FIELDS.some(f => within(place, f)));
      const days = 3 + ((v * 11) % 100);
      const saved = ago(days, 12);
      library = on(saved, () => store.saveLink(library, {
        url: `https://www.youtube.com/watch?v=${video.id}`, note: video.title.slice(0, 200), nodeId: places[0], places: places.slice(1),
        preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (channels[video.channel]?.name || 'YouTube').slice(0, 100), image: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`, at: saved },
      }));
      if (v % 3 !== 2) watchedAt[video.id] = ago(Math.max(1, days - 1), 13);
      v += 1;
      report.videos += 1;
    }
  }
  const feed = memory.loadFeedMemory();
  memory.saveFeedMemory({ ...feed, watched: { ...feed.watched, ...watchedAt } });
  const libraryProblem = store.saveLibrary(library);
  if (libraryProblem) throw new Error(libraryProblem);

  // --- Reels kept from the Reels tab. ---
  let shelf = pins.createReelShelf();
  const reels = content.REELS.filter(reel => FIELDS.some(f => within(reel.nodeId, f)));
  reels.slice(0, 26).forEach((reel, i) => {
    shelf = pins.savePin(shelf, reel.id, [reel.nodeId], ago(2 + ((i * 13) % 90), 22));
    if (i % 2 === 0) shelf = pins.markWatched(shelf, reel.id);
    report.reels += 1;
  });
  pins.saveReelShelf(shelf);

  // --- Notes: ideas and questions, written over the months. ---
  const NOTES = [
    ['idea', 'Selection only sorts what variation already offers. It never orders a new trait.', [E('natural-selection')], 58],
    ['question', 'Why did the deep-beaked finches not simply take over for good?', [E('natural-selection')], 53],
    ['idea', 'Every fish-to-tetrapod "missing link" turned out to be a cousin, not a grandparent.', [E('tree-thinking')], 33],
    ['idea', 'If Earth were a day old, people arrive in the last few seconds before midnight.', [E('deep-time')], 7],
    ['question', 'How fast can the fossil record actually resolve a mass extinction?', [E('transitions-extinctions')], 18],
    ['idea', 'Lenski\'s citrate mutation needed earlier, invisible changes first. History matters.', [E('evolution-now')], 12],
    ['idea', 'Drift is strongest exactly where populations are smallest: islands and bottlenecks.', [E('chance-drift')], 25],
    ['question', 'Is a species a thing in nature, or a line we draw?', [E('new-species')], 29],
    ['idea', 'Peacock tails are honest because they are expensive.', [E('sexual-selection')], 41],
    ['idea', 'Each daughter helix keeps one old strand and builds one new one.', [G('dna')], 40],
    ['question', 'If every cell has the same genome, what decides which genes a liver cell uses?', [G('gene-regulation')], 5],
    ['idea', 'Dominant does not mean common. A rare allele can still be dominant.', [G('dominance')], 16],
    ['idea', 'Four Yamanaka factors can turn a skin cell back into a stem cell.', [G('gene-regulation')], 4],
    ['question', 'Why is a gene for a disease sometimes kept at high frequency?', ['knowledge.science.biology.genetics-genomes'], 70],
    ['idea', 'Without air, a hammer and a feather fall together. Mass does not set the pace of a fall.', [ACCEL], 14],
    ['question', 'Why does acceleration, not speed, tell you about the force?', [ACCEL], 13],
    ['idea', 'Feynman: if you cannot explain it simply, you do not understand it yet.', [PHYS], 51],
    ['question', 'Does time pass, or is that just how memory feels?', [`${PHYS}.relativity`], 2],
    ['idea', 'An octave is a 2:1 ratio. A fifth is 3:2. Consonance is simple arithmetic.', [HARMONY], 9],
    ['question', 'Why does a minor chord sound sad to most listeners?', [HARMONY], 8],
    ['idea', 'Timbre is the overtone recipe: the same note on a violin and a flute.', [`${MUSIC}.timbre`], 30],
    ['idea', 'Music lights up reward circuits before the chord resolves. The waiting is the pleasure.', [MUSIC], 57],
    ['idea', 'The plague moved fastest along sea routes. Ships beat roads.', [PLAGUE], 22],
    ['question', 'Did the Black Death raise wages for those who survived?', [PLAGUE], 20],
    ['idea', 'Plague doctors arrived after the deaths had peaked.', [PLAGUE], 15],
    ['idea', 'The fourteenth century: plague, schism and a hundred years of war at once.', [MEDIEVAL], 90],
    ['question', 'How do historians count the dead without parish records?', [HIST], 19],
    ['idea', 'A history is an argument about evidence, not a list of dates.', [HIST], 44],
    ['idea', 'Keep one card per idea, linked to others, not filed by subject.', [], 46],
    ['question', 'What would I want to still know in ten years?', [], 3],
  ];
  let book = notebookMod.createNotebook();
  for (const [kind, title, nodeIds, days] of NOTES) {
    const at = ago(days, 22);
    book = on(at, () => notebookMod.upsertNotebookEntry(book, { title, body: '', sourceUrl: '', sourceLabel: '', kind, evidence: 'encountered', nodeIds, createdAt: at }));
    report.notes += 1;
  }
  const notebookProblem = notebookMod.saveNotebook(book);
  if (notebookProblem) throw new Error(notebookProblem);

  // --- Proof: lessons run, checks passed. Six places proved (two of them Lasting), two ready to refresh. ---
  const summary = (level, misses = []) => ({ level, firstTry: { right: level === 'Understood' ? 5 : 3, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses });
  const packAt = node => content.expeditionAt(node).pack.id;
  // One answer missed the first time, from the lesson itself, so "changed your mind" is real.
  const missOf = packId => {
    for (const beat of content.getExpedition(packId).pack.beats) {
      if (!beat.gradeId) continue;
      const one = beat.kind === 'predict' && beat.parts.length === 1 ? beat.parts[0] : null;
      const choices = beat.kind === 'spot' ? beat.options : beat.kind === 'source' ? beat.question.choices : one ? one.choices : null;
      const answer = beat.kind === 'spot' ? beat.answer : beat.kind === 'source' ? beat.question.answer : one ? one.answer : null;
      const prompt = beat.kind === 'source' ? beat.question.prompt : beat.prompt;
      const wrong = choices?.find(choice => choice.id !== answer);
      if (wrong && prompt) return [{ gradeId: beat.gradeId, prompt: String(prompt).slice(0, 300), chosen: wrong.label }];
    }
    return [];
  };
  let exp = ledgerMod.createExpeditionLedger();
  let n = 0;
  const run = (node, level, days, misses) => { exp = ledgerMod.recordRun(exp, { id: `seed-run-${n++}`, packId: packAt(node), summary: summary(level, misses), at: ago(days, 21) }); };
  let checks = checkLedger.createCheckLedger();
  const answerOf = (item, variant) => item.kind === 'choice' || item.kind === 'flaw' ? { pick: item.answer } : item.kind === 'order' ? { seq: [...item.answer] }
    : item.kind === 'match' ? { pairs: { ...item.pairs } } : { value: generators.checkVariant(item, variant).answer };
  const pass = (node, days) => {
    const at = ago(days, 21);
    const id = `seed-check-${n++}`;
    const started = progress.startCheck(node, exp, checks, Date.parse(at), id);
    if (!started.items) throw new Error(`No check ready at ${node} on ${at}: ${JSON.stringify(started.status)}`);
    const events = started.items.map((drawn, i) => session.attemptEvent({ session: id, node, drawn, answer: answerOf(drawn.entry.item, drawn.variant), confidence: 'certain', ms: 18000, at: new Date(Date.parse(at) + i * 20000).toISOString() }));
    events.push(session.finishEvent({ session: id, node, items: started.items, at: new Date(Date.parse(at) + started.items.length * 20000 + 5000).toISOString() }));
    checks = checkLedger.appendCheckEvents(checks, events);
  };
  run(E('natural-selection'), 'Familiar', 33, missOf(packAt(E('natural-selection'))));
  run(E('natural-selection'), 'Understood', 30); pass(E('natural-selection'), 15);   // Lasting
  run(G('dna'), 'Understood', 40); pass(G('dna'), 31); pass(G('dna'), 8);           // Lasting, refreshed
  run(E('tree-thinking'), 'Understood', 20); pass(E('tree-thinking'), 12);           // Lasting
  run(E('deep-time'), 'Understood', 4);                                              // Proved
  run(PLAGUE, 'Understood', 6);                                                      // Proved
  run(HARMONY, 'Understood', 2);                                                     // Proved
  run(ACCEL, 'Understood', 14);                                                      // Ready to refresh
  run(E('variation-heredity'), 'Understood', 25);                                    // Ready to refresh
  run(G('gene-regulation'), 'Familiar', 3);                                          // Underway
  run(E('evidence'), 'Glimpsed', 9);                                                 // Underway
  const expProblem = ledgerMod.saveExpeditionLedger(exp);
  if (expProblem) throw new Error(expProblem);
  const checkProblem = checkLedger.saveCheckLedger(checks);
  if (checkProblem) throw new Error(checkProblem);
  return report;
}
