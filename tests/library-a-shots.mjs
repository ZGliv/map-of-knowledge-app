// Library prototype A (exhibitions, #/lab/library-a), at 375×812 with an iPhone's insets and at 1440×900.
// A learner's few months across Genetics, Evolution, Physics, Music and History are seeded through the
// app's own stores and their own APIs (saveLink, upsertEntry, setStatus, addNote, upsertNotebookEntry,
// recordRun, the check session code, savePin, recordImpression, createExhibition), with the clock set to
// each moment as it happens. Books come from Open Library and films from Wikidata through the app's own
// search; link previews from the app's link reader (/api/unfurl, started here on 5191 if it is not running).
//
//   MOK_URL=http://127.0.0.1:5237 node tests/library-a-shots.mjs
//
// Writes output/library-a/*.png and output/library-a/contact-sheet.png, and checks what it shows.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5237';
const LAB = `${URL}/#/lab/library-a`;
const OUT = path.resolve('output/library-a');
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const PHONE = { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true, insets: { top: 59, bottom: 34 } };
const DESKTOP = { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false };
const insetCss = ({ top = 0, bottom = 0 }) => `:root{--safe-top:${top}px!important;--safe-bottom:${bottom}px!important}`;
const browser = await chromium.launch({ headless: true });
const errors = [];
const shots = [];

// --- the learner, written through the app's own code ---------------------------------------------

async function seedLearner() {
  const imp = p => import(/* @vite-ignore */ p);
  const [lib, nb, ledger, checkLedger, progress, session, generators, pins, memory, pool, openLibrary, wikidata, linkSheet, ex] = await Promise.all([
    imp('/src/notebook/libraryStore.ts'), imp('/src/core/notebook.ts'), imp('/src/expeditions/ledger.ts'), imp('/src/checks/ledger.ts'), imp('/src/checks/progress.ts'),
    imp('/src/checks/session.ts'), imp('/src/checks/generators.ts'), imp('/src/explore/pins.ts'), imp('/src/feed/memory.ts'), imp('/src/feed/pool.ts'),
    imp('/src/notebook/openLibrary.ts'), imp('/src/notebook/wikidata.ts'), imp('/src/notebook/LinkSheet.tsx'), imp('/src/lab/library-a/exhibitionStore.ts'),
  ]);
  const DAY = 86_400_000;
  const REAL = Date;
  const start = REAL.now();
  const ago = (days, hour = 19) => { const d = new REAL(start - days * DAY); d.setHours(hour, 12, 0, 0); return d.getTime(); };
  // The clock, set to each moment as it happens: every store stamps its own dates.
  let clock = start;
  class Clock extends REAL { constructor(...args) { if (args.length) super(...args); else super(clock); } static now() { return clock; } }
  const at = (days, hour) => { clock = ago(days, hour); return new REAL(clock).toISOString(); };
  const N = {
    dna: 'knowledge.science.biology.genetics-genomes.dna', dominance: 'knowledge.science.biology.genetics-genomes.dominance', switches: 'knowledge.science.biology.genetics-genomes.gene-regulation', genetics: 'knowledge.science.biology.genetics-genomes',
    selection: 'knowledge.science.biology.evolution.natural-selection', human: 'knowledge.science.biology.evolution.human-evolution', deep: 'knowledge.science.biology.evolution.deep-time', heredity: 'knowledge.science.biology.evolution.variation-heredity', evidence: 'knowledge.science.biology.evolution.evidence',
    acceleration: 'knowledge.science.physics.mechanics.motion.acceleration', oscillation: 'knowledge.science.physics.mechanics.oscillation', energy: 'knowledge.science.physics.mechanics.energy', quantum: 'knowledge.science.physics.quantum-physics', relativity: 'knowledge.science.physics.relativity',
    harmony: 'knowledge.arts.music.harmony', timbre: 'knowledge.arts.music.timbre', plague: 'knowledge.humanities.history.medieval-world.black-death', medieval: 'knowledge.humanities.history.medieval-world',
  };
  const videos = new Map((await pool.loadPool()).videos.map(v => [v.id, v]));
  const channels = (await pool.loadPool()).channels;

  // Everything from the network first, on the real clock (the catalogs' request spacing reads it).
  const BOOKS = ['The Gene An Intimate History Mukherjee', 'The Beak of the Finch Weiner', 'On the Origin of Species Darwin', 'The Double Helix Watson', 'The Great Mortality John Kelly',
    'Seven Brief Lessons on Physics Rovelli', 'Six Easy Pieces Feynman', 'This Is Your Brain on Music Levitin', 'How Music Works David Byrne', 'Your Inner Fish Shubin', 'The Black Death Philip Ziegler'];
  const FILMS = ['Particle Fever', 'Cosmos: A Spacetime Odyssey'];
  const LINKS = ['https://en.wikipedia.org/wiki/Peppered_moth_evolution', 'https://en.wikipedia.org/wiki/Black_Death', 'https://en.wikipedia.org/wiki/Pythagorean_tuning',
    'https://en.wikipedia.org/wiki/Galileo%27s_Leaning_Tower_of_Pisa_experiment', 'https://en.wikipedia.org/wiki/Gregor_Mendel'];
  const books = new Map(), films = new Map(), previews = new Map();
  for (const query of BOOKS) books.set(query, (await openLibrary.searchBooks(query))[0]);
  console.log('seed: books found');
  for (const query of FILMS) films.set(query, await wikidata.searchScreen(query).then(list => list.find(r => r.kind !== 'book'), () => undefined));
  console.log('seed: films found');
  await Promise.all(LINKS.map(async url => previews.set(url, await linkSheet.unfurlLink(url))));
  console.log('seed: links read');

  globalThis.Date = Clock;
  try {
    let library = lib.createLibraryStore();
    let notebook = nb.createNotebook();
    let shelf = pins.createReelShelf();
    let feed = memory.createFeedMemory();
    let exp = ledger.createExpeditionLedger();

    // Videos saved from Watch, as its Save sheet keeps them; some watched through, some only begun.
    const saveVideo = (id, places, days, watched) => {
      const video = videos.get(id);
      if (!video) throw new Error(`Not in the pool: ${id}`);
      at(days, 20);
      const seenAt = new Clock().toISOString();
      const full = { dwellMs: watched ? 400_000 : 40_000, playedS: watched ? 600 : 70, durationS: 600, ended: watched, replays: 0, short: video.short, saved: true, openedPlace: false, muted: false, heard: true };
      feed = memory.recordImpression(feed, video, full, seenAt);
      library = lib.saveLink(library, {
        url: `https://www.youtube.com/watch?v=${id}`, note: video.title.slice(0, 200), nodeId: places[0], places: places.slice(1),
        preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: channels[video.channel]?.name ?? 'YouTube', image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, at: seenAt },
      });
    };
    saveVideo('L8xTU0oC4Nk', [N.human], 74, true);
    saveVideo('iLX_r_WPrIw', [N.selection], 70, true);
    saveVideo('pqgm27UzWn8', [N.dna, N.heredity], 66, true);
    saveVideo('0AfM2Jitsps', [N.plague], 61, true);
    saveVideo('AvO1_lnxq78', [N.deep], 55, false);
    saveVideo('n8vVVbquQvA', [N.harmony], 47, true);
    saveVideo('tjJvyo8DuNk', [N.genetics, N.human], 41, true);
    saveVideo('sYdXa_yp0fc', [N.oscillation, N.timbre], 34, true);
    saveVideo('1LUxfgWTv4M', [N.medieval], 29, false);
    saveVideo('k3sIHbj-TUI', [N.energy, N.relativity], 22, false);
    saveVideo('1_JbJTeLZJs', [N.selection], 16, false);
    saveVideo('e5o2929FwWQ', [N.harmony], 9, false);
    saveVideo('YSwRqNCeP9k', [N.quantum], 4, false);
    saveVideo('psVjK5Gg-ho', [N.dna], 2, false);

    // Books and films: found through the app's own search, kept, begun and finished on their days.
    const book = async (query, places, added, started, finished) => {
      const found = books.get(query);
      if (!found) throw new Error(`Open Library found nothing for ${query}`);
      const now = at(added, 21);
      const entry = openLibrary.entryFromBook(found, 'want', now);
      const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
      library = lib.upsertEntry(library, entry, now);
      if (places && !entry.ids.shelf) library = lib.setPlaces(library, entry.id, places, now);
      if (started !== null) library = lib.setStatus(library, key, 'started', at(started, 22));
      if (finished !== null) library = lib.setStatus(library, key, 'finished', at(finished, 22));
      return key;
    };
    const gene = await book('The Gene An Intimate History Mukherjee', [N.genetics, N.dna], 80, 78, 52);
    const finch = await book('The Beak of the Finch Weiner', null, 72, 70, 58);
    const origin = await book('On the Origin of Species Darwin', null, 64, 63, null);
    const helix = await book('The Double Helix Watson', [N.dna], 50, 45, 31);
    const mortality = await book('The Great Mortality John Kelly', [N.plague], 60, 60, 38);
    const rovelli = await book('Seven Brief Lessons on Physics Rovelli', [N.relativity, N.quantum], 26, 25, 19);
    const feynman = await book('Six Easy Pieces Feynman', [N.acceleration, N.energy], 18, 12, null);
    const levitin = await book('This Is Your Brain on Music Levitin', [N.harmony, N.timbre], 21, 14, null);
    await book('How Music Works David Byrne', [N.timbre], 6, null, null);
    await book('Your Inner Fish Shubin', null, 12, null, null);
    await book('The Black Death Philip Ziegler', [N.medieval], 3, null, null);
    const film = async (query, places, added, finished) => {
      const found = films.get(query);
      if (!found) return null;
      const now = at(added, 21);
      const entry = wikidata.entryFromScreen(found, 'want', now);
      library = lib.upsertEntry(library, entry, now);
      if (places) library = lib.setPlaces(library, entry.id, places, now);
      if (finished !== null) library = lib.setStatus(library, `entry:${entry.id}`, 'finished', at(finished, 22));
      return `entry:${entry.id}`;
    };
    await film('Particle Fever', [N.quantum], 30, 27);
    await film('Cosmos: A Spacetime Odyssey', [N.relativity, N.acceleration], 15, null);

    // Passages and thoughts kept from what they read.
    library = lib.addNote(library, { target: origin, kind: 'quote', text: 'There is grandeur in this view of life, with its several powers, having been originally breathed into a few forms or into one.', where: 'last page' }, at(62, 22));
    library = lib.addNote(library, { target: finch, kind: 'note', text: 'The 1977 drought did the choosing: only the deep beaks could crack what seeds were left.' }, at(59, 22));
    library = lib.addNote(library, { target: helix, kind: 'note', text: 'The pairing rule was the whole secret: A with T, C with G, and the copy writes itself.' }, at(32, 22));
    library = lib.addNote(library, { target: mortality, kind: 'note', text: 'It moved along trade routes by sea first; the roads came later.' }, at(39, 22));

    // Links, read by the app's link reader.
    const link = async (url, note, places, days) => {
      const preview = previews.get(url) ?? null;
      at(days, 13);
      library = lib.saveLink(library, { url, note, nodeId: places[0], places: places.slice(1), preview });
    };
    await link('https://en.wikipedia.org/wiki/Peppered_moth_evolution', 'The peppered moth, before and after soot', [N.selection], 68);
    await link('https://en.wikipedia.org/wiki/Black_Death', 'Black Death: the routes and the dates', [N.plague], 63);
    await link('https://en.wikipedia.org/wiki/Pythagorean_tuning', 'Pythagorean tuning: why 3:2 sounds settled', [N.harmony], 44);
    await link('https://en.wikipedia.org/wiki/Galileo%27s_Leaning_Tower_of_Pisa_experiment', 'Did Galileo really drop them from the tower?', [N.acceleration], 17);
    await link('https://en.wikipedia.org/wiki/Gregor_Mendel', 'Mendel’s peas, and why nobody read him', [N.dominance], 11);

    // Ideas and questions in the notebook.
    const note = (kind, title, body, nodeIds, days) => { const createdAt = at(days, 23); notebook = nb.upsertNotebookEntry(notebook, { title, body, sourceUrl: '', sourceLabel: '', kind, evidence: kind === 'question' ? 'encountered' : 'explained', nodeIds, createdAt }); };
    note('question', 'If we share an ancestor with chimps, why did only one line leave the trees?', '', [N.human], 73);
    note('idea', 'Selection doesn’t need anyone to try: the moths that rest unseen simply leave more moths.', '', [N.selection], 67);
    note('idea', 'The same genome is in every cell; what differs is which genes are switched on.', 'A neuron and a skin cell carry one book and read different chapters.', [N.switches], 35);
    note('question', 'Why does a fifth sound calm and a tritone sound tense?', '', [N.harmony, N.oscillation], 33);
    note('idea', 'Dominant does not mean common. A rare allele can still be dominant.', '', [N.dominance], 8);
    note('idea', 'A hammer and a feather land together on the Moon: air was the only difference all along.', '', [N.acceleration], 3);

    // Reels kept from the Reels tab, some watched through.
    const pin = (id, places, days, watched) => { shelf = pins.savePin(shelf, id, places, at(days, 21)); if (watched) shelf = pins.markWatched(shelf, id); };
    pin('e09-why-still-chimpanzees', [N.human], 75, true);
    pin('e03-ninety-eight-in-a-hundred', [N.selection], 69, true);
    pin('plague-ships-beat-roads', [N.plague], 62, true);
    pin('dna-four-letters', [N.dna], 48, true);
    pin('music-legend-of-the-hammers', [N.harmony], 40, false);
    pin('dominance-blue-wont-breed-true', [N.dominance], 10, true);
    pin('e06-the-abyss-of-time', [N.deep], 7, false);
    pin('physics-hammer-and-feather', [N.acceleration], 5, true);
    pin('gene-regulation-dolly', [N.switches], 1, false);

    // Lessons: six places proved, two of them due a refresh, one Lasting; two more begun.
    const summary = level => ({ level, firstTry: { right: 5, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 1, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] });
    const run = (packId, level, days) => { exp = ledger.recordRun(exp, { id: `seed-${packId}-${days}`, packId, summary: summary(level), at: at(days, 20) }); };
    run('evolution-e03', 'Understood', 30);
    run('history', 'Understood', 33);
    run('genetics-dna', 'Understood', 26);
    run('evolution-e06', 'Familiar', 20);
    run('evolution-e09', 'Familiar', 14);
    run('genetics-dominance', 'Understood', 6);
    run('music', 'Understood', 5);
    run('physics', 'Understood', 3);
    // Natural selection still held a week and more later: its Lasting check, through the check code.
    let checks = checkLedger.createCheckLedger();
    {
      const node = N.selection, sessionId = 'seed-lasting-selection';
      const when = ago(12, 20);
      const started = progress.startCheck(node, exp, checks, when, sessionId);
      if (!started.items) throw new Error(`No Lasting check could start for natural selection: ${JSON.stringify(started.status)}`);
      const answerOf = (item, variant) => item.kind === 'choice' || item.kind === 'flaw' ? { pick: item.answer } : item.kind === 'order' ? { seq: [...item.answer] } : item.kind === 'match' ? { pairs: { ...item.pairs } } : { value: generators.checkVariant(item, variant).answer };
      const stamp = i => new REAL(when + i * 20_000).toISOString();
      const events = started.items.map((drawn, i) => session.attemptEvent({ session: sessionId, node, drawn, answer: answerOf(drawn.entry.item, drawn.variant), confidence: 'certain', ms: 18_000, at: stamp(i) }));
      events.push(session.finishEvent({ session: sessionId, node, items: started.items, at: stamp(started.items.length) }));
      checks = checkLedger.appendCheckEvents(checks, events);
    }

    // Two exhibitions of their own: a question across fields, and one about sound.
    let exhibitions = ex.createExhibitionStore();
    const video = id => library.links.find(l => l.url.endsWith(id));
    const reelKey = id => `reel:${id}`;
    ({ store: exhibitions } = ex.createExhibition(exhibitions, {
      title: 'Why are there still chimpanzees?', places: [N.human],
      items: [`link:${video('tjJvyo8DuNk').id}`, reelKey('e09-why-still-chimpanzees'), `note:${notebook.entries.find(e => e.title.startsWith('If we share')).id}`, origin, `link:${video('pqgm27UzWn8').id}`],
    }, at(20, 21), 'ex-chimpanzees'));
    ({ store: exhibitions } = ex.createExhibition(exhibitions, {
      title: 'Can you hear the physics in a chord?', intro: 'Strings, ratios and the ear: why some notes settle and others pull.', places: [N.harmony, N.oscillation],
      items: [levitin, `link:${video('sYdXa_yp0fc').id}`],
    }, at(8, 21), 'ex-chord'));

    clock = start;
    const problems = [
      lib.saveLibrary(library), nb.saveNotebook(notebook), ledger.saveExpeditionLedger(exp), checkLedger.saveCheckLedger(checks),
      pins.saveReelShelf(shelf), memory.saveFeedMemory(feed) ? null : 'feed memory', ex.saveExhibitions(exhibitions),
    ].filter(Boolean);
    if (problems.length) throw new Error(problems.join('; '));
    return { links: library.links.length, items: library.items.length, notes: notebook.entries.length, reels: shelf.pinned.length, runs: exp.runs.length, checks: checks.events.length };
  } finally { globalThis.Date = REAL; }
}

// --- shots ---------------------------------------------------------------------------------------

async function open(variant, { seeded }) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 2, isMobile: variant.mobile, hasTouch: variant.mobile, acceptDownloads: true });
  if (variant.insets) await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss(variant.insets));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name}: ${error.message}`));
  page.on('console', message => { if (message.text().startsWith('seed:')) console.log(message.text()); if (message.type() === 'error' && !/Failed to load resource|502|ERR_|Permissions policy/.test(message.text())) errors.push(`${variant.name}: ${message.text()}`); });
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  if (seeded) {
    if (!seeded.data) seeded.data = await page.evaluate(seedLearner);
    else await page.evaluate(stores => { for (const [key, value] of Object.entries(stores)) localStorage.setItem(key, value); }, seeded.stores);
    seeded.stores ??= await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('mok-')).map(k => [k, localStorage.getItem(k)])));
  }
  await page.goto(LAB);
  await page.reload();
  await page.waitForSelector('[data-lab="library-a"]');
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
const settle = page => page.waitForFunction(() => [...document.querySelectorAll('[data-lab] img')].filter(img => img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0).every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
const scrollTo = (page, selector, offset = 0) => page.evaluate(([sel, off]) => {
  const scroller = document.querySelector('.lxa-workspace');
  const target = sel ? document.querySelector(sel) : null;
  const top = target ? target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - off : off;
  scroller.scrollTo(0, Math.max(0, top));
}, [selector, offset]);
async function shot(page, variant, name) {
  await settle(page);
  await page.waitForTimeout(500);
  const file = path.join(OUT, `${variant.name}-${name}.png`);
  await page.screenshot({ path: file });
  shots.push({ file, variant: variant.name });
  console.log(`shot ${variant.name}-${name}`);
}

try {
  // 1. Empty: an invitation, never a field chosen for the learner.
  for (const variant of [PHONE, DESKTOP]) {
    const { context, page } = await open(variant, {});
    assert.equal(await page.locator('[data-empty]').count(), 1, 'An empty Library shows its invitation');
    assert.equal(await page.locator('.lxa-card').count(), 0, 'An empty Library suggests no exhibition');
    assert.equal(await page.locator('[data-action="wing"]').count(), 8, 'Every wing of the atlas is a way in');
    assert.equal(await page.locator('.studio-mobile-nav [aria-current="page"], .studio-nav [aria-current="page"]').first().textContent().then(t => /Library/.test(t)), true, 'Library is the highlighted tab');
    await shot(page, variant, '01-empty');
    if (variant === PHONE) {
      // A question typed into the empty Library begins its exhibition at once, ending in proof at its place.
      await page.fill('[data-action="empty-question"]', 'Why do prices rise?');
      await page.click('[data-action="empty-begin"]');
      await page.waitForSelector('[data-page="exhibition"]');
      assert.equal(await page.locator('[role="dialog"]').count(), 0, 'Begun without a second sheet');
      assert.equal(await page.locator('[data-prove] .lxa-prove-stop').first().getAttribute('data-node-id'), 'knowledge.economics.markets', 'It ends in proof at its own place');
      await page.waitForTimeout(4500);
      await shot(page, variant, '01b-empty-begun');
    }
    await context.close();
  }

  const seeded = {};
  // 2. The learner's Library, on a phone.
  {
    const variant = PHONE;
    const { context, page } = await open(variant, { seeded });
    console.log('seeded', JSON.stringify(seeded.data));
    await page.waitForSelector('.lxa-card.is-lead');
    assert.equal(await page.locator('.lxa-card .lxa-num').count(), 0, 'Index cards carry no numbers');
    const covers = await page.evaluate(() => [...document.querySelectorAll('.lxa-card .lxa-collage img')].map(img => img.getAttribute('src')));
    assert.equal(covers.some(src => /ytimg/.test(src) && !document.querySelector(`.lxa-frame img[src="${src}"]`)), false, 'No video frame is cropped into a cover');
    const titles = await page.locator('.lxa-card .lxa-card-title').allTextContents();
    assert(titles.includes('Why are there still chimpanzees?'), 'Their own exhibitions are on the index');
    assert(titles.some(t => /Genetics/.test(t)), 'Genetics is suggested from what they have');
    assert(!titles.includes('Evolution') || titles.length > 3, 'Evolution is never the default');
    assert(await page.locator('.lxa-map-stop.is-ready').count() === 2, 'Two places are ready to refresh on the map strip');
    assert.equal(await page.locator('.lxa-map-stop').count() >= 6, true, 'The six proved places are on the map strip');
    await shot(page, variant, '02-first');

    await scrollTo(page, '.lxa-shelf', 70);
    await shot(page, variant, '03-browse');

    await scrollTo(page, '.lxa-catalogue-index', 180);
    await shot(page, variant, '04-browse-catalogue');

    // An exhibition of their own: its sequence, then proof.
    await scrollTo(page, null, 0);
    await page.click('[data-exhibition="mine:ex-chimpanzees"]');
    await page.waitForSelector('[data-page="exhibition"]');
    await shot(page, variant, '05-exhibition');
    await scrollTo(page, '.lxa-ex-seq', 80);
    await shot(page, variant, '06-exhibition-sequence');
    await scrollTo(page, '[data-prove]', 90);
    assert(await page.locator('[data-prove] [data-action="prove"]').count() >= 1, 'The exhibition ends in proof');
    assert.equal(await page.locator('[data-prove] .lxa-prove-stop').first().getAttribute('data-node-id'), 'knowledge.science.biology.evolution.human-evolution', 'Its own place leads its proof');
    await shot(page, variant, '07-exhibition-proof');

    // Adding to it: everything you have, and something new.
    await page.click('[data-action="hang"]');
    await page.waitForSelector('[data-action="hang-piece"]');
    await shot(page, variant, '08-exhibition-add');
    await page.locator('[data-action="hang-piece"]:not([aria-pressed="true"])').first().click();
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('mok-exhibitions-v1')))).exhibitions.find(e => e.id === 'ex-chimpanzees').items.length, 6, 'Hanging a thing keeps it in the exhibition');
    await page.keyboard.press('Escape');

    // Wiring: a row opens its page; a video's thumbnail plays it in Watch, a reel's in Reels; a case opens;
    // and the Library is where it was on return.
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.locator('[data-section="video"] [data-action="open-piece"]').first().click();
    await page.waitForSelector('[data-page="item"].is-video');
    assert.equal(await page.locator('.lxa-track button').count(), (await page.locator('.lxa-track li.is-proved:not(.is-done)').count()) ? 1 : 0, 'A path is a record: only an unproved step offers a case');
    await page.click('[data-action="lxa-back"]');
    await page.waitForSelector('[data-page="exhibition"][data-exhibition="mine:ex-chimpanzees"]');
    await page.locator('[data-section="video"] [data-action="play-piece"]').first().click();
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
    await page.click('[data-action="open-notebook-mobile"]');
    await page.waitForSelector('[data-page="exhibition"][data-exhibition="mine:ex-chimpanzees"]');
    await page.locator('[data-section="reel"] [data-action="play-piece"]').first().click();
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels'; });
    assert.equal((await state()).explore.reelId, 'e09-why-still-chimpanzees', 'The reel plays in Reels');
    await page.click('[data-action="open-notebook-mobile"]');
    await page.waitForSelector('[data-page="exhibition"][data-exhibition="mine:ex-chimpanzees"]');
    await page.locator('[data-prove] [data-action="prove"]').first().click();
    await page.waitForFunction(() => ['mission', 'check'].includes(JSON.parse(window.render_game_to_text()).route.kind));
    await page.goBack();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).route.kind === 'map');
    assert.equal(await page.locator('[data-page="exhibition"][data-exhibition="mine:ex-chimpanzees"]').count(), 1, 'Back from a case, the exhibition is still open');
    await page.click('[data-action="lxa-back"]');

    // A suggested one: Genetics, with DNA ready to refresh.
    const genetics = page.locator('[data-exhibition="field:knowledge.science.biology.genetics-genomes"]').first();
    await genetics.scrollIntoViewIfNeeded();
    await genetics.click();
    await page.waitForSelector('[data-page="exhibition"]');
    await scrollTo(page, '[data-prove]', 90);
    await shot(page, variant, '09-suggested-proof');
    await page.click('[data-action="lxa-back"]');

    // An item: a book, its path, its places and where it hangs.
    await page.click('[data-action="open-catalogue"][data-kind="work"]');
    await page.waitForSelector('[data-page="catalogue"]');
    await shot(page, variant, '10-catalogue');
    await page.locator('[data-page="catalogue"] [data-action="open-piece"]').filter({ hasText: 'The Double Helix' }).first().click();
    await page.waitForSelector('[data-page="item"]');
    assert.equal(await page.locator('.lxa-track li.is-done').count(), 4, 'A finished book in a proved place walked the whole path');
    await shot(page, variant, '11-item');
    await scrollTo(page, '.lxa-item-cols', 80);
    await shot(page, variant, '12-item-places');
    await page.click('[data-action="item-details"]');
    await page.waitForSelector('[data-item-sheet]');
    await shot(page, variant, '13-item-details');
    await page.keyboard.press('Escape');
    // Tapping the path changes nothing: it is a record.
    const path = () => page.locator('.lxa-track li').evaluateAll(els => els.map(e => e.className));
    const before = await path();
    await page.locator('.lxa-track li.is-saved').click();
    assert.deepEqual(await path(), before, 'The path is read only');
    await page.click('[data-action="lxa-back"]');
    // A note has a page of its own, in the Library's look.
    await page.click('[data-action="catalogue-tab"][data-kind="note"]');
    await page.locator('[data-page="catalogue"] [data-action="open-note"]').first().click();
    await page.waitForSelector('[data-page="item"] [data-action="item-edit-note"]');
    await shot(page, variant, '13b-note');
    await page.click('[data-action="lxa-back"]');
    await page.click('[data-action="catalogue-tab"][data-kind="work"]');
    await page.click('[data-action="lxa-back"]');

    // A video saved in Watch, landed in the Library: its page, with Watch a tap away.
    await page.locator('.lxa-lately-item.is-video').first().click();
    await page.waitForSelector('[data-page="item"].is-video');
    await shot(page, variant, '14-video-item');
    await page.click('[data-action="lxa-back"]');

    // Search across everything; + adds a thing (a book, film, link, idea or question); an exhibition begins from its own row.
    await page.fill('[data-action="lxa-search"]', 'plague');
    await page.waitForSelector('[data-results]');
    await shot(page, variant, '15-search');
    await page.fill('[data-action="lxa-search"]', '');
    await page.click('[data-action="lxa-add"]');
    await page.waitForSelector('[data-add-sheet] [data-action="add-question"]');
    await shot(page, variant, '15b-plus');
    await page.keyboard.press('Escape');
    await page.locator('[data-action="new-exhibition"]').scrollIntoViewIfNeeded();
    await page.click('[data-action="new-exhibition"]');
    await page.waitForSelector('[data-new-exhibition]');
    await page.fill('[data-action="exhibition-title"]', 'How do genes switch on?');
    await page.waitForTimeout(400);
    await shot(page, variant, '16-add');
    await page.click('[data-action="create-exhibition"]');
    await page.waitForSelector('[data-page="exhibition"]');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-exhibitions-v1')));
    assert(stored.exhibitions.some(e => e.title === 'How do genes switch on?'), 'A new exhibition is kept in its own store');
    await shot(page, variant, '17-new-exhibition');

    // A place flies the Atlas there.
    await page.click('[data-action="exhibition-place"]');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).workspace === 'atlas');
    await page.waitForTimeout(1600);
    await shot(page, variant, '18-flown-to-atlas');
    await context.close();
  }

  // 3. Desktop: the portfolio view.
  {
    const variant = DESKTOP;
    const { context, page } = await open(variant, { seeded });
    await page.waitForSelector('.lxa-card.is-lead');
    await shot(page, variant, '01-index');
    await scrollTo(page, '.lxa-shelf', 40);
    await shot(page, variant, '02-browse');
    await scrollTo(page, null, 0);
    await page.click('[data-exhibition="mine:ex-chimpanzees"]');
    await page.waitForSelector('[data-page="exhibition"]');
    await shot(page, variant, '03-exhibition');
    await scrollTo(page, '.lxa-ex-seq', 30);
    await shot(page, variant, '04-exhibition-sequence');
    await page.click('[data-action="lxa-back"]');
    await page.click('[data-action="open-catalogue"][data-kind="work"]');
    await page.locator('[data-page="catalogue"] [data-action="open-piece"]').filter({ hasText: 'The Beak of the Finch' }).first().click();
    await page.waitForSelector('[data-page="item"]');
    await shot(page, variant, '05-item');

    // The backup carries the exhibitions beside the notebook and the library.
    await page.click('[data-action="lxa-back"]');
    await page.click('[data-action="lxa-back"]');
    const download = page.waitForEvent('download');
    await page.locator('[data-action="lxa-backup"]').scrollIntoViewIfNeeded();
    await page.click('[data-action="lxa-backup"]');
    const file = path.join(OUT, 'backup.json');
    await (await download).saveAs(file);
    const backup = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(backup.exhibitionsVersion, 1, 'The backup names its exhibitions version');
    assert(backup.exhibitions.length >= 2 && backup.items.length > 0 && backup.entries.length > 0, 'The backup holds exhibitions, library and notebook together');
    await context.close();
  }

  // 4. The contact sheet: every shot, in order.
  {
    const context = await browser.newContext({ viewport: { width: 2400, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const phone = shots.filter(s => s.variant === 'phone');
    const desk = shots.filter(s => s.variant === 'desktop');
    const img = s => `<figure><img src="data:image/png;base64,${s.data}"><figcaption>${path.basename(s.file, '.png')}</figcaption></figure>`;
    for (const s of shots) s.data = (await readFile(s.file)).toString('base64');
    await page.setContent(`<style>body{margin:0;padding:40px;background:#0b0a09;font:14px -apple-system,sans-serif;color:#9b9387}h2{font:400 26px Georgia,serif;color:#eee8dc;margin:0 0 18px}.row{display:flex;flex-wrap:wrap;gap:22px;margin-bottom:40px}figure{margin:0}figcaption{margin-top:8px}.p img{width:250px;border-radius:14px}.d img{width:760px;border-radius:6px}</style>
      <h2>Library A · Exhibitions · phone</h2><div class="row p">${phone.map(img).join('')}</div><h2>Desktop</h2><div class="row d">${desk.map(img).join('')}</div>`);
    await page.screenshot({ path: path.join(OUT, 'contact-sheet.png'), fullPage: true });
    await context.close();
    console.log('contact sheet written');
  }
} finally {
  await browser.close();
  reader?.kill();
}
if (errors.length) { console.log(`\n${errors.length} page errors:\n${[...new Set(errors)].join('\n')}`); process.exitCode = 1; }
