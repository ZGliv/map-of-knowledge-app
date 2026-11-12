// The learners Your Library's journey and screenshots use (tests/library-e-journey.mjs, tests/library-e-shots.mjs).
// Each runs inside the page (page.evaluate) and writes through the app's own store modules, never its UI.
//
//   seed            the learner a few months in (tests/library-c-seed.mjs): books and films from Open Library
//                   and Wikidata, Watch videos from the real pool, reels pinned on the real shelf, links read by
//                   /api/unfurl, notes and questions, lessons and checks written with the ledgers' own functions
//                   (six places proved, two ready to refresh) and two collections.
//   seedHeavy       that learner and then some: about 350 more videos saved from the real Watch pool, the way
//                   Watch's Save sheet saves them, spread across the whole atlas and the last eight months,
//                   every third one watched through. Roughly 400 things; every title, channel and place is real.
//   seedFew         three things: a saved Wikipedia link, a question and a reel, in two places.
export { seed } from './library-c-seed.mjs';

/** Runs a seed in the page, trying again when a catalog (Open Library, Wikidata) could not be reached:
 * the seeds search the catalogs before they save anything, so a failed try leaves nothing behind. */
export async function seedWithRetry(page, fn, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await page.evaluate(fn); } catch (error) {
      if (i >= tries || !/catalog could not be reached/i.test(String(error?.message))) throw error;
      console.log(`  (a catalog could not be reached; trying the seed again, ${i + 1} of ${tries})`);
      await page.waitForTimeout(4000 * i);
    }
  }
}

export async function seedHeavy(extra = 350) {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, poolMod, memoryMod, youtube, engagement] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/feed/pool.ts'), imp('/src/feed/memory.ts'), imp('/src/feed/youtube.ts'), imp('/src/feed/engagement.ts'),
  ]);
  const NOW = Date.now();
  const RealDate = Date;
  const at = (iso, fn) => {
    const t = RealDate.parse(iso);
    class SeedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(t); } static now() { return t; } }
    globalThis.Date = SeedDate;
    try { return fn(); } finally { globalThis.Date = RealDate; }
  };
  const loaded = libraryMod.loadLibrary();
  if (loaded.blocked) throw new Error(loaded.warning ?? 'library blocked');
  let library = loaded.data;
  let memory = memoryMod.loadFeedMemory();
  const pool = await poolMod.loadPool();
  const saved = new Set(library.links.map(link => youtube.videoIdFromUrl(link.url)).filter(Boolean));
  // Spread over the atlas: walk the pool in strides so every subject gets some.
  const candidates = pool.videos.filter(v => !v.short && v.places[0] && !saved.has(v.id));
  const stride = Math.max(1, Math.floor(candidates.length / extra));
  const chosen = candidates.filter((_, i) => i % stride === 0).slice(0, extra);
  chosen.forEach((video, i) => {
    const when = new RealDate(NOW - (240 - (i * 238) / chosen.length) * 864e5).toISOString();
    library = at(when, () => libraryMod.saveLink(library, {
      url: youtube.libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: video.places[0], places: video.places.slice(1),
      preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (pool.channels[video.channel]?.name || 'YouTube').slice(0, 100), image: youtube.posterUrls(video, 'card')[0], at: new Date().toISOString() },
    }));
    if (i % 3 === 0) memory = memoryMod.recordImpression(memory, video, { ...engagement.emptyImpression(false), dwellMs: 300000, playedS: 480, durationS: 490, ended: true, saved: true }, new RealDate(RealDate.parse(when) + 3600e3).toISOString());
  });
  const problems = [libraryMod.saveLibrary(library), memoryMod.saveFeedMemory(memory) ? null : 'feed memory not kept'].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { added: chosen.length, links: library.links.length, items: library.items.length };
}

export async function seedFew() {
  const imp = p => import(/* @vite-ignore */ p);
  const [libraryMod, notebookMod, pins, deck] = await Promise.all([imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/explore/pins.ts'), imp('/src/explore/deck.ts')]);
  const day = 864e5;
  const library = libraryMod.saveLink(libraryMod.createLibraryStore(), {
    url: 'https://en.wikipedia.org/wiki/Natural_selection', note: 'Natural selection, the whole article', nodeId: 'knowledge.science.biology.evolution.natural-selection',
    preview: { title: 'Natural selection', description: '', siteName: 'Wikipedia', image: null, at: new Date(Date.now() - 3 * day).toISOString() },
  });
  const notebook = notebookMod.upsertNotebookEntry(notebookMod.createNotebook(), { title: 'Why do moths on soot-dark trees turn dark within a few generations?', body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: ['knowledge.science.biology.evolution.natural-selection'] });
  const reel = deck.getReel('physics-hammer-and-feather');
  let shelf = pins.createReelShelf();
  if (reel) shelf = pins.savePin(shelf, reel.id, [reel.nodeId], new Date(Date.now() - day).toISOString());
  const problems = [libraryMod.saveLibrary(library), notebookMod.saveNotebook(notebook), pins.saveReelShelf(shelf)].filter(Boolean);
  if (problems.length) throw new Error(problems.join(' | '));
  return { links: library.links.length, notes: notebook.entries.length, reels: shelf.pinned.length };
}
