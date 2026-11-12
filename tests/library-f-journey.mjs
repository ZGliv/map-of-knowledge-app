// Prototype F, the Edition (#/lab/library-f), end to end on a phone (WebKit, 375×812, an iPhone's user
// agent, touch, and its 59/34 px insets), with a desktop check at 1440×900 in Chromium.
//   An empty learner: the masthead and the atlas's subjects, each flying the Atlas there.
//   Three things kept: a cover story (their question), the rest in its field's section.
//   The learner a few months in (tests/library-c-seed.mjs): every small line sits under its title; no
//   hue bar over a section's name; sections stand in atlas order and stay there when something new is
//   kept; search "gene" finds the Genetics things, whole words first; a video plays in Watch, a reel in
//   Reels, a book, a film and a page open their sheets, a note and a question their editor, a due
//   refresh and a begun place their case or lesson, a proved place and "On the map" the Atlas, a
//   collection its long read, the index every field and place; Back returns to where you were.
//   The same learner ten months on (a few hundred things), then ten days of daily Watch saves across ten
//   fields: the issue holds at most six sections, the index and search still hold, and a one-letter search
//   lists forty things and offers the rest.
// No sideways scroll at 375 on any screen, and no console errors. Asserts; prints one line per step.
//
//   MOK_URL=http://127.0.0.1:5283 node tests/library-f-journey.mjs
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { seed, seedHeavy, seedRecent, seedThree } from './library-f-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5283';
const LAB = `${URL}/#/lab/library-f`;
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const INSETS = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const EVOLUTION = 'knowledge.science.biology.evolution';
const MUSIC = 'knowledge.arts.music';
const errors = [];
const step = message => console.log(`ok  ${message}`);
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
// Third parties' noise. And one of Explore's own (not the Edition's): when a dated deck's fetch fails with an
// access-control error, WebKit itself logs "Fetch API cannot load …/explore/decks/<day>.json due to access
// control checks" as a JavaScript error, and Playwright's WebKit reports every such log as a page error. The
// rejection is handled (explore/today.ts getJson catches it and the loader falls back); a rejection really
// left unhandled arrives as "TypeError: Load failed" instead and still fails this journey. Chromium logs
// nothing. Reported, not hidden: it is printed, and only it is let through.
const NOISE = /Failed to load resource|404|502|ERR_|CORS|youtube|ytimg|googlevideo|doubleclick|Blocked a frame|postMessage|wikidata/i;
const EXPLORE_DECKS = /explore\/decks\/[\d-]+\.json due to access control checks/;
const explore = new Set();

const wk = await webkit.launch({ headless: true });
const cr = await chromium.launch({ headless: true });

async function phone() {
  const context = await wk.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA });
  await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, INSETS);
  const page = await context.newPage();
  page.on('pageerror', error => { if (EXPLORE_DECKS.test(error.message)) explore.add(error.message); else errors.push(`phone: ${error.message}`); });
  page.on('console', message => { if (message.type() === 'error' && !NOISE.test(message.text())) errors.push(`phone: ${message.text()}`); });
  return { context, page };
}
// A hash-only change never reloads, so the page is reloaded to read what was just seeded.
// The first load settles before the reload, so no module import is cut off half way.
const lab = async page => {
  await page.goto(LAB);
  await page.waitForSelector('[data-lab="library-f"] [data-screen]', { timeout: 30000 });
  await page.reload();
  await page.waitForSelector('[data-lab="library-f"] [data-screen]', { timeout: 30000 });
};
const home = page => page.waitForSelector('[data-lab="library-f"] [data-screen="home"]');
const back = async page => { await page.click('[data-action="ed-back"]'); };
const libraryTab = page => page.click('[data-action="open-notebook-mobile"]');
const scrollTop = page => page.$eval('.ed-scroll', el => Math.round(el.scrollTop));
const scrollToEl = (page, selector, offset = 140) => page.evaluate(([s, o]) => { const scroller = document.querySelector('.ed-scroll'); const el = document.querySelector(s); scroller.scrollTo(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - o); }, [selector, offset]);

/** Nothing on the page reaches past the screen's sides, and nothing scrolls sideways. */
async function noSideways(page, where) {
  const found = await page.evaluate(() => {
    const scroller = document.querySelector('.ed-scroll');
    const wide = [...document.querySelectorAll('.ed-page *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); });
    return { doc: document.documentElement.scrollWidth - innerWidth, scroller: scroller ? scroller.scrollWidth - scroller.clientWidth : 0, wide: wide.slice(0, 4).map(el => `${el.tagName.toLowerCase()}.${el.className}`) };
  });
  assert.ok(found.doc <= 0 && found.scroller <= 0 && !found.wide.length, `No sideways scroll on ${where}: ${JSON.stringify(found)}`);
}

/** Every small line (what it is, who made it, when) sits under its title, never over it. */
const linesAbove = page => page.evaluate(() => {
  const out = [];
  for (const button of document.querySelectorAll('.ed-page [data-piece]')) {
    const meta = button.querySelector('.ed-meta');
    const title = button.querySelector('.ed-h3,.ed-h4,.ed-open-q,.ed-bq');
    if (meta && title && meta.getBoundingClientRect().top < title.getBoundingClientRect().bottom - 1) out.push(button.dataset.piece);
  }
  const lead = document.querySelector('.ed-lead-text');
  if (lead && lead.querySelector(':scope>.ed-meta').getBoundingClientRect().top < lead.querySelector('h2').getBoundingClientRect().bottom - 1) out.push('lead');
  for (const head of document.querySelectorAll('.ed-sec-head')) if (head.querySelector('.ed-meta').getBoundingClientRect().top < head.querySelector('h2').getBoundingClientRect().bottom - 1) out.push(head.parentElement.dataset.section);
  return out;
});
const sectionOrder = page => page.$$eval('[data-section]', els => els.map(el => el.dataset.section));
const inAtlasOrder = page => page.evaluate(async () => {
  const { atlasRank } = await import('/src/lab/library-f/edition.ts');
  const ids = [...document.querySelectorAll('[data-section]')].map(el => el.dataset.section);
  return ids.every((id, i) => i === 0 || atlasRank(ids[i - 1]) <= atlasRank(id));
});
const pageHeight = page => page.$eval('.ed-page', el => Math.round(el.getBoundingClientRect().height));
/** "All N in X" links the front page prints more than once (a lead at a field that also has its section). */
const allLinksTwice = page => page.$$eval('[data-screen="home"] [data-shelf-link]', els => els.map(el => el.textContent).filter((text, i, all) => /^All \d+ in /.test(text) && all.indexOf(text) !== i));

/** Opens a piece and waits for what it opens, then comes back to the Library tab. */
async function opensSheet(page, selector, what) {
  await page.locator(selector).first().click();
  await page.waitForSelector('.lib-sheet', { timeout: 10000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lib-sheet', { state: 'detached' });
  step(`${what} opens its sheet`);
}
async function opensEditor(page, selector, what) {
  await page.locator(selector).first().click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).dialog === 'capture');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).dialog === null);
  await home(page);
  step(`${what} opens in the editor, and closing it returns to the Edition`);
}
async function opensRoute(page, selector, kinds, what) {
  const before = await page.evaluate(() => location.hash);
  await page.locator(selector).first().click();
  await page.waitForFunction(k => k.includes(JSON.parse(window.render_game_to_text()).route.kind), kinds, { timeout: 15000 });
  const opened = (await state(page)).route.kind;
  await page.goBack();
  await page.waitForFunction(h => location.hash === h && JSON.parse(window.render_game_to_text()).route.kind === 'map', before, { timeout: 15000 });
  await page.waitForSelector('[data-lab="library-f"] [data-screen]');
  step(`${what} opens its ${opened}, and Back returns to the Edition`);
}

try {
  // --- an empty learner ---
  {
    const { context, page } = await phone();
    await lab(page);
    await page.waitForSelector('[data-empty] [data-subject]');
    assert.equal(await page.locator('[data-subject]').count(), 8, 'Every subject of the atlas, none chosen for them');
    assert.equal(await page.locator('[data-action="ed-index"]').count(), 0, 'Nothing to index');
    assert.equal(await page.locator('.ed-search').count(), 0, 'Nothing to search');
    assert.equal(await page.getAttribute('[data-action="open-notebook-mobile"]', 'aria-current'), 'page', 'The Library tab is the one lit');
    await noSideways(page, 'the empty library');
    step('an empty library: the masthead and the atlas’s subjects, no counts, no explainers');
    // Nothing to search here: the shell's magnifier opens the shell's own search.
    await page.click('[data-action="open-search"]');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).dialog === 'search', null, { timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).dialog === null);
    step('an empty library leaves the magnifier to the shell’s own search');
    await page.click('[data-subject="knowledge.arts"]');
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === 'knowledge.arts'; }, null, { timeout: 15000 });
    step('a subject flies the Atlas there');
    await context.close();
  }

  // --- three things kept ---
  {
    const { context, page } = await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(seedThree);
    await lab(page);
    await home(page);
    await page.waitForSelector('[data-lead]');
    assert.equal(await page.textContent('.ed-lead-text h2'), 'Why does a heavier ball not fall faster?', 'Their own question is the cover story');
    assert.ok(await page.locator('.ed-lead [data-kind="reel"]').count() >= 1, 'The reel from the same place stands with it');
    assert.deepEqual(await linesAbove(page), [], 'Every small line under its title');
    assert.equal(await page.locator('.ed-page :text-is("?")').count(), 0, 'No empty “?” boxes');
    assert.ok((await sectionOrder(page)).length <= 1, 'At most the one field’s section');
    assert.equal(await page.locator('.ed-collections').count(), 0, 'No empty Collections heading before there is a collection');
    const all = await page.locator('[data-section] [data-action="ed-all"]').textContent();
    assert.match(all, /^All 3 in /, `The section offers everything in its field: “${all}”`);
    await noSideways(page, 'three things');
    const height = await pageHeight(page);
    step(`three things: their question leads, ${await page.locator('[data-section]').count()} section, ${height}px tall`);
    await page.click('[data-action="ed-index"]');
    await page.waitForSelector('[data-screen="index"] [data-index]');
    await noSideways(page, 'the index of three things');
    await back(page);
    await home(page);
    await context.close();
  }

  // --- the learner a few months in ---
  const { context, page } = await phone();
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  const seeded = await page.evaluate(seed);
  console.log(`    seeded ${JSON.stringify(seeded)}`);
  await lab(page);
  await home(page);
  await page.waitForSelector('[data-section]');
  await page.waitForFunction(() => document.querySelectorAll('[data-refresh]').length >= 1, null, { timeout: 20000 });
  assert.equal(await page.textContent('.ed-lead-text h2'), 'Why did the plague travel faster by sea than by road?', 'Their newest question leads');
  assert.deepEqual(await linesAbove(page), [], 'Every small line sits under its title');
  assert.ok(await page.$$eval('.ed-sec,.ed-sec-head,.ed-sec-head h2', els => els.every(el => getComputedStyle(el, '::before').content === 'none' && getComputedStyle(el, '::after').content === 'none')), 'No bar over a section’s name');
  assert.equal(await page.locator('.ed-page :text-is("?")').count(), 0, 'No empty “?” boxes in a collection');
  assert.ok(await inAtlasOrder(page), `Sections in atlas order: ${(await sectionOrder(page)).join(', ')}`);
  await noSideways(page, 'the issue');
  assert.deepEqual(await allLinksTwice(page), [], 'Each "All N in" link is printed once');
  const seededHeight = await pageHeight(page);
  const seededSections = await sectionOrder(page);
  step(`the issue: their question leads, ${seededSections.length} sections in atlas order, every line under its title, ${seededHeight}px tall`);

  // The cover picture is one button: tapped anywhere (not only its label), it opens what it shows.
  const pictured = await page.getAttribute('.ed-lead-pic', 'data-piece');
  await page.locator('.ed-lead-pic').click({ position: { x: 30, y: 30 } });
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && `reel:${s.explore.reelId}` === id; }, pictured);
  step(`the cover picture opens its reel from anywhere on it (${pictured})`);
  await libraryTab(page);
  await home(page);

  // Search, from the shell's own magnifier.
  await page.click('[data-action="open-search"]');
  await page.waitForSelector('[data-action="ed-search"]:focus');
  await page.keyboard.type('gene');
  await page.waitForSelector('[data-results]');
  assert.equal(await page.locator(`[data-result-shelf="${GENETICS}"]`).count(), 1, 'Genetics & Genomes is found by “gene”');
  const titles = await page.$$eval('.ed-rgroup[aria-label="In the library"] [data-piece] .ed-h4', els => els.map(el => el.textContent));
  assert.ok(titles.some(t => /\bgene\b/i.test(t)), `A title with the whole word: ${titles.join(' | ')}`);
  const whole = titles.map(t => /\bgene\b/i.test(t));
  assert.ok(whole[0] && (whole.indexOf(false) === -1 || whole.lastIndexOf(true) < whole.indexOf(false)), `Titles with the whole word first: ${titles.join(' | ')}`);
  assert.ok(await page.locator('.ed-results mark').count() > 0, 'The matched beginnings are marked');
  const unmarked = await page.$$eval('.ed-rgroup[aria-label="In the library"] [data-piece]', els => els.filter(el => !el.querySelector('mark')).map(el => el.querySelector('.ed-h4').textContent));
  assert.deepEqual(unmarked, [], 'Every thing found shows why: its title, maker, place or a few words of what matched');
  await noSideways(page, 'search');
  step(`search “gene”: Genetics & Genomes and ${titles.length} things, whole words first`);
  await page.click('[data-action="ed-search-clear"]');
  await page.waitForSelector('[data-lead]');

  // A video plays in Watch; the Library tab comes back to the same place, read as far as it was.
  const video = page.locator(`[data-section="${EVOLUTION}"] [data-kind="video"], [data-section] [data-kind="video"]`).first();
  await video.scrollIntoViewIfNeeded();
  const readTo = await scrollTop(page);
  assert.ok(readTo > 400, 'Read some way down the issue');
  await video.click();
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
  step('a video plays in Watch');
  await libraryTab(page);
  await home(page);
  assert.ok(Math.abs(await scrollTop(page) - readTo) < 6, `The Library tab returns to where it was read (${readTo})`);
  assert.equal(await page.evaluate(() => location.hash), '#/lab/library-f');
  step('the Library tab returns to the Edition, read as far as it was');

  // A reel plays in Reels.
  const reelKey = await page.locator('[data-section] [data-kind="reel"]').first().getAttribute('data-piece');
  await page.locator(`[data-section] [data-piece="${reelKey}"]`).first().click();
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && `reel:${s.explore.reelId}` === id; }, reelKey);
  step(`a reel plays in Reels (${reelKey})`);
  await libraryTab(page);
  await home(page);

  // Books, films and pages open the Library's own sheets; notes and questions open in the editor.
  await opensSheet(page, '[data-kind="book"]', 'a book');
  if (await page.locator('[data-kind="film"]').count()) await opensSheet(page, '[data-kind="film"]', 'a film');
  else step('a film: none came back from Wikidata to open');
  await opensSheet(page, '[data-kind="link"]', 'a page');
  await opensEditor(page, '[data-kind="idea"]', 'a note');
  await opensEditor(page, '[data-kind="question"]', 'a question');

  // A due refresh, a begun place and a proved place.
  await opensRoute(page, '[data-refresh]', ['check', 'mission'], 'a due refresh in the dateline');
  await home(page);
  await page.waitForSelector('[data-standing="begun"]');
  await opensRoute(page, '[data-standing="begun"]', ['mission', 'check', 'expedition'], 'a begun place');
  await home(page);
  const proved = await page.locator('[data-standing="proved"]').first().getAttribute('data-node-id');
  await page.locator('[data-standing="proved"]').first().click();
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, proved, { timeout: 15000 });
  step(`a proved place flies the Atlas (${proved.split('.').at(-1)})`);
  await libraryTab(page);
  await home(page);
  const mapped = await page.locator('[data-section] [data-action="ed-on-map"]').first().getAttribute('data-node-id');
  await page.locator('[data-section] [data-action="ed-on-map"]').first().click();
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, mapped, { timeout: 15000 });
  step('“On the map” flies the Atlas to the field');
  await libraryTab(page);
  await home(page);

  // A collection as a long read; Back returns home where it was.
  const collection = page.locator('[data-collection]').first();
  await collection.scrollIntoViewIfNeeded();
  const atCollections = await scrollTop(page);
  await collection.click();
  await page.waitForSelector('[data-screen="collection"] .ed-art');
  assert.equal(await page.locator('.ed-page :text-is("?")').count(), 0, 'No “?” boxes in a collection');
  await noSideways(page, 'a collection');
  await page.locator('[data-screen="collection"] [data-kind="book"]').first().click();
  await page.waitForSelector('.lib-sheet');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lib-sheet', { state: 'detached' });
  await back(page);
  await home(page);
  assert.ok(Math.abs(await scrollTop(page) - atCollections) < 6, 'Back from a collection returns to where the issue was read');
  step('a collection opens as a long read, its things open, and Back returns to the same spot');

  // The index: every field and place, one tap from the masthead; each opens everything in it.
  await scrollToEl(page, '.ed-mast', 200);
  await page.click('[data-action="ed-index"]');
  await page.waitForSelector('[data-screen="index"]');
  const indexed = await page.$$eval('[data-index]', els => els.map(el => el.dataset.index));
  for (const id of [GENETICS, EVOLUTION, MUSIC, 'knowledge.science.physics', 'knowledge.humanities.history', 'unplaced']) assert.ok(indexed.includes(id), `The index lists ${id}`);
  assert.ok(indexed.includes('knowledge.science.biology.evolution.natural-selection'), 'The index lists places inside fields');
  await noSideways(page, 'the index');
  await page.click(`[data-index="${GENETICS}"]`);
  await page.waitForSelector(`[data-screen="shelf"][data-shelf="${GENETICS}"]`);
  const all = await page.locator('[data-screen="shelf"] [data-piece]').count();
  const label = await page.textContent('[data-screen="shelf"] .ed-page-head .ed-meta');
  assert.ok(label.includes(`${all} piece`), `The field’s page lists everything in it (${all}, “${label}”)`);
  await noSideways(page, 'a field');
  await page.locator('[data-screen="shelf"] [data-shelf-link]').first().click();
  await page.waitForSelector('[data-screen="shelf"]');
  await back(page);
  await page.waitForSelector(`[data-screen="shelf"][data-shelf="${GENETICS}"]`);
  await back(page);
  await page.waitForSelector('[data-screen="index"]');
  step(`the index lists ${indexed.length} fields and places; a field lists all ${all} of its things; Back walks back`);
  assert.equal(await page.getAttribute(`[data-index="knowledge.science.physics.mechanics"]`, 'data-index'), 'knowledge.science.physics.mechanics');
  assert.ok(await page.$eval('[data-index="knowledge.science.physics.mechanics"]', el => el.closest('li').classList.contains('is-level-1')), 'A field sits under its region in the index');
  // The Library tab, tapped on the index, returns to the issue.
  await libraryTab(page);
  await home(page);
  step('the Library tab, tapped on the index, returns to the issue');
  await page.click('[data-action="ed-index"]');
  await page.waitForSelector('[data-screen="index"]');

  // A field's next lesson opens the lesson; Back returns to that field's page.
  await page.click(`[data-index="${EVOLUTION}"]`);
  await page.waitForSelector(`[data-screen="shelf"][data-shelf="${EVOLUTION}"] [data-proof="lesson"]`);
  await page.click('[data-proof="lesson"]');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).route.kind === 'expedition', null, { timeout: 15000 });
  await page.goBack();
  await page.waitForSelector(`[data-screen="shelf"][data-shelf="${EVOLUTION}"]`, { timeout: 15000 });
  step('a field’s next lesson opens the lesson, and Back returns to the field');
  await back(page);
  await page.waitForSelector('[data-screen="index"]');
  await back(page);
  await home(page);

  // The order holds when something new is kept: Music gets a link today and keeps its place in line.
  await page.evaluate(async () => {
    const store = await import('/src/notebook/libraryStore.ts');
    const { data } = store.loadLibrary();
    const problem = store.saveLibrary(store.saveLink(data, { url: 'https://en.wikipedia.org/wiki/Circle_of_fifths', note: 'Circle of fifths', nodeId: 'knowledge.arts.music.harmony' }));
    if (problem) throw new Error(problem);
  });
  await lab(page);
  await home(page);
  await page.waitForSelector('[data-section]');
  const after = await sectionOrder(page);
  assert.ok(await inAtlasOrder(page), 'Still in atlas order');
  // A field may join the issue (or, past six, another leave it); those that stay keep their order.
  assert.deepEqual(after.filter(id => seededSections.includes(id)), seededSections.filter(id => after.includes(id)), `Every section keeps its place: ${seededSections.join(', ')} → ${after.join(', ')}`);
  assert.deepEqual(await allLinksTwice(page), [], 'Each "All N in" link is printed once');
  step(`something new in Music: the sections keep their order (${after.map(id => id.split('.').at(-1)).join(', ')})`);
  await context.close();

  // --- ten months on: a few hundred things ---
  {
    const { context, page } = await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(seed);
    const heavy = await page.evaluate(seedHeavy);
    const recent = await page.evaluate(seedRecent);
    const started = Date.now();
    await lab(page);
    await home(page);
    await page.waitForSelector('[data-section]');
    const shown = Date.now() - started;
    assert.ok(await inAtlasOrder(page), 'Sections in atlas order');
    assert.deepEqual(await linesAbove(page), [], 'Every small line under its title');
    await noSideways(page, 'the heavy issue');
    const height = await pageHeight(page);
    const sections = await page.locator('[data-section]').count();
    assert.ok(sections <= 6, `At most six sections (${sections})`);
    const backList = await page.locator('[data-back]').count();
    await page.click('[data-action="ed-index"]');
    await page.waitForSelector('[data-screen="index"]');
    const fields = await page.locator('[data-index]').count();
    await noSideways(page, 'the heavy index');
    await back(page);
    await home(page);
    await page.fill('[data-action="ed-search"]', 'gene');
    await page.waitForSelector(`[data-result-shelf="${GENETICS}"]`);
    await page.fill('[data-action="ed-search"]', 'e');
    await page.waitForSelector('[data-action="ed-all-found"]');
    const rows = await page.locator('.ed-rgroup[aria-label="In the library"] [data-piece]').count();
    assert.ok(rows <= 40, `A one-letter search lists forty things at first (${rows})`);
    await page.click('[data-action="ed-all-found"]');
    const everything = await page.locator('.ed-rgroup[aria-label="In the library"] [data-piece]').count();
    assert.ok(everything > rows, `“All” lists the rest (${everything})`);
    await page.fill('[data-action="ed-search"]', '');
    step(`ten months on and ten busy days (${heavy.links + recent.added} links, ${heavy.reels} reels): ${sections} sections, ${backList} entries at the back, ${fields} in the index, ${height}px, shown in ${shown} ms; “e” lists ${rows} of ${everything}`);
    await context.close();
  }

  // --- a desktop: the same issue on a broadsheet grid ---
  {
    const context = await cr.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`desktop: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error' && !NOISE.test(message.text())) errors.push(`desktop: ${message.text()}`); });
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(seed);
    await lab(page);
    await home(page);
    await page.waitForSelector('[data-section] .ed-col');
    const columns = await page.$eval('[data-section] .ed-sec-body', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, 3, 'A section sets in three columns');
    assert.deepEqual(await linesAbove(page), [], 'Every small line under its title');
    assert.ok(await page.evaluate(() => { const s = document.querySelector('.ed-scroll'); return s.scrollWidth <= s.clientWidth; }), 'No sideways scroll');
    step('desktop: sections in three columns, lines under titles, nothing sideways');
    await context.close();
  }

  if (explore.size) console.log(`    Explore (not the Edition), WebKit only: ${explore.size} failed deck fetch${explore.size === 1 ? '' : 'es'} logged by WebKit (handled), e.g. “${[...explore][0]}”`);
  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  console.log('library-f journey: all good');
} finally {
  await wk.close();
  await cr.close();
}
