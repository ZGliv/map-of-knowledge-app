// Prototype E, "Your Library" (#/lab/library-e), end to end on a phone: WebKit at 375×812 with an
// iPhone's user agent, touch and insets (59 px top, 34 px bottom).
//
// An empty learner gets the title and nothing preachy; three things fit on the first screen with
// their two places; the seeded heavy learner (tests/library-e-seed.mjs, about 400 real things) is
// searched from the shell's magnifier ("gene" finds the Genetics things, the place with its whole
// count), browsed by subject, field and place with the same counts everywhere, and every kind of
// thing opens the real thing: a video in Watch, a reel in Reels, a book, a film and a link in their
// sheet, a note and a question in the editor, a place, a collection, a lesson, a refresh, the place
// on the Atlas. Back (the page's own, the browser's, the Library tab) returns to where it was. A
// place proved and not due offers no Refresh. Nothing scrolls sideways; no console errors.
// Asserts; prints one line per step.
//
//   MOK_URL=http://127.0.0.1:5282 node tests/library-e-journey.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { webkit } from 'playwright';
import { seed, seedFew, seedHeavy, seedWithRetry } from './library-e-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5282';
const LAB = `${URL}/#/lab/library-e`;
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const TREE = 'knowledge.science.biology.evolution.tree-thinking';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INSETS = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const browser = await webkit.launch({ headless: true });
const errors = [];
// The seed searches Wikidata for films and lets a failed search go (the film is left out). WebKit still logs
// that failed request (often a 429 or 503 while Wikidata rate-limits this machine) as a JavaScript error, which
// Playwright reports as a page error: "/www.wikidata.org/w/api.php?… due to access control checks." (WebKit's
// "Fetch API cannot load https://…" with its head cut off). Only a failed request whose host is Wikidata's is
// let through, and it is printed, not hidden.
const WIKIDATA = /^(?:Fetch API cannot load )?(?:https?:)?\/\/?(?:www|query)\.wikidata\.org\/\S* due to access control checks\.?$/;
const wikidata = new Set();
/** Pictures asked for at a width Commons refuses (it serves only its standard thumbnail widths). */
const refusedWidths = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = message => console.log(`ok  ${message}`);
// A hash-only change never reloads, so the page is reloaded to read what was just seeded, once what the
// first load fetches (and the lazy parts it warms after the map paints) has arrived.
const lab = async page => { await page.goto(LAB); await page.waitForSelector('[data-lab="library-e"] [data-screen]'); await page.waitForTimeout(900); await page.reload(); await page.waitForSelector('[data-lab="library-e"] [data-screen]'); };
/** Nothing on the page reaches past the screen's right edge, and nothing scrolls sideways. */
const noSideways = async (page, where) => {
  const found = await page.evaluate(() => {
    const scroller = document.querySelector('.le-scroll');
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('.le-page *')].filter(el => {
      if (el.closest('.le-chips,.le-shelf')) return false; // these scroll inside themselves
      const box = el.getBoundingClientRect();
      return box.width && box.right > width + 0.5;
    }).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    return { doc: document.documentElement.scrollWidth - width, scroller: scroller ? scroller.scrollWidth - scroller.clientWidth : 0, wide: wide.slice(0, 5) };
  });
  assert.ok(found.doc <= 0 && found.scroller <= 0 && !found.wide.length, `${where} scrolls sideways: ${JSON.stringify(found)}`);
};
const toLibrary = async page => { await page.click('[data-action="open-notebook-mobile"]'); await page.waitForSelector('[data-lab="library-e"] [data-screen]'); };

async function phone() {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE });
  const page = await context.newPage();
  page.on('pageerror', error => { if (WIKIDATA.test(error.message)) wikidata.add(error.message.slice(0, 160)); else errors.push(error.message); });
  page.on('request', request => { if (/upload\.wikimedia\.org\/.*\/640px-/.test(request.url())) refusedWidths.push(request.url()); });
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|404|502|ERR_|CORS|Access-Control|access control/.test(message.text())) errors.push(message.text()); });
  await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, INSETS);
  return { context, page };
}

try {
  {
    const { context, page } = await phone();
    // An empty learner: the title, the add button and a plain line. No chips, no shelf, no lecture.
    await lab(page);
    await page.waitForSelector('[data-screen="home"] .le-none.is-empty');
    assert.equal(await page.locator('.le-row, .le-chip, .le-shelf').count(), 0);
    assert.equal(await page.getAttribute('[data-action="open-notebook-mobile"]', 'aria-current'), 'page', 'The Library tab is the one lit');
    await noSideways(page, 'empty');
    step('empty learner: title, add, one plain line; Library tab lit');

    // Three things: both places on the shelf and all three rows on the first screen, each naming its place.
    await page.evaluate(seedFew);
    await lab(page);
    await page.waitForSelector('.le-row');
    assert.equal(await page.locator('.le-list .le-row').count(), 3);
    assert.deepEqual((await page.$$eval('[data-shelf="place"]', els => els.map(el => el.dataset.place))).sort(), ['knowledge.science.biology.evolution.natural-selection', 'knowledge.science.physics.mechanics.motion.acceleration']);
    const tabTop = await page.$eval('.studio-mobile-nav', el => el.getBoundingClientRect().top);
    const lastRow = await page.$$eval('.le-list .le-row', els => Math.max(...els.map(el => el.getBoundingClientRect().bottom)));
    assert.ok(lastRow <= tabTop, `All three rows sit above the tab bar (${Math.round(lastRow)} vs ${Math.round(tabTop)})`);
    assert.equal(await page.locator('.le-list .le-row .le-where').count(), 3, 'Every row names its place');
    assert.equal(await page.locator('.le-row.is-question .le-art').count(), 0, 'A question has no picture: its words are the row');
    await noSideways(page, 'three things');
    step('three things: two places on the shelf, three rows above the tab bar, each with its place');
    await context.close();
  }

  const { context, page } = await phone();
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  await seedWithRetry(page, seed);
  const heavy = await page.evaluate(seedHeavy);
  await lab(page);
  await page.waitForFunction(() => document.querySelectorAll('.le-list .le-row').length >= 20);
  const total = await page.evaluate(async () => {
    const [store, notebook, pins] = await Promise.all([import('/src/notebook/libraryStore.ts'), import('/src/core/notebook.ts'), import('/src/explore/pins.ts')]);
    const library = store.loadLibrary().data;
    return store.liveLinks(library).length + library.items.length + notebook.loadNotebook().data.entries.length + pins.loadReelShelf().pinned.length;
  });
  assert.ok(total >= 380, `The heavy learner keeps hundreds of things (${total})`);
  await noSideways(page, 'heavy home');
  // Place covers are stills and covers, never a video's frame with its printed words.
  const frames = await page.$$eval('.le-shelf .le-disc img', imgs => imgs.map(img => img.getAttribute('src')).filter(src => /ytimg|img\.youtube/.test(src)));
  assert.deepEqual(frames, [], 'No place on the shelf wears a video frame');
  const shelfKinds = await page.$$eval('.le-shelf [data-shelf]', els => els.map(el => el.dataset.shelf));
  assert.ok(shelfKinds.indexOf('collection') > -1 && shelfKinds.indexOf('collection') < 6, `A collection is on the shelf's first covers (${shelfKinds.join(' ')})`);
  // The whole list draws as it is scrolled: every thing, down to the last, with nothing left waiting.
  for (let i = 0; i < 40 && await page.locator('.le-more').count(); i++) {
    await page.evaluate(() => { const scroller = document.querySelector('.le-scroll'); scroller.scrollTo(0, scroller.scrollHeight); });
    await page.waitForTimeout(120);
  }
  const drawn = await page.locator('.le-list .le-row').count();
  assert.equal(await page.locator('.le-more').count(), 0, 'Nothing is left waiting at the end of the list');
  assert.ok(drawn >= total - 5, `Every thing is in the list (${drawn} of ${total})`);
  await noSideways(page, 'heavy list, scrolled to the end');
  await page.evaluate(() => document.querySelector('.le-scroll').scrollTo(0, 0));
  step(`heavy learner: ${total} things, all ${drawn} rows drawn as the list scrolls, nothing sideways`);

  // Search from the shell's own magnifier: "gene" finds Genetics & Genomes (as a place, with its whole count) and the things in it.
  await page.click('[data-action="open-search"]');
  await page.waitForSelector('[data-action="le-search"]:focus');
  await page.keyboard.type('gene');
  await page.waitForSelector('.le-list.is-results');
  const genetics = await page.$eval(`.is-results [data-place="${GENETICS}"]`, el => el.textContent);
  const searchCount = Number(genetics.match(/(\d+) things?/)?.[1]);
  assert.ok(searchCount >= 5, `Genetics & Genomes shows its whole count in search (${genetics})`);
  const geneticsThings = await page.$$eval('.is-results [data-piece] .le-where-name', els => els.map(el => el.textContent).filter(name => /^(DNA|Dominance|Gene switches|Genetics & Genomes|Reading genomes)$/.test(name)).length);
  assert.ok(geneticsThings >= 3, `Things kept in Genetics are found (${geneticsThings})`);
  assert.ok(await page.locator('.is-results .le-title b').count() > 0, 'The matched start of each word is bold');
  const top = await page.$eval('.is-results > li', el => el.getBoundingClientRect().top);
  assert.ok(top < 260, `The first result sits right under the field (${Math.round(top)}px)`);
  // Ranked by where the hit shows: every result before Genetics & Genomes has "gene" starting a word in its own title.
  const ahead = await page.$$eval('.is-results > li', (els, id) => {
    const at = els.findIndex(el => el.querySelector(`[data-place="${id}"]`));
    return els.slice(0, at).map(el => el.querySelector('.le-title, .le-words')?.textContent ?? '');
  }, GENETICS);
  assert.ok(ahead.every(title => /(^|[^\p{L}\p{N}])gene/iu.test(title)), `Only titles that show "gene" come before the place: ${JSON.stringify(ahead)}`);
  await noSideways(page, 'search');
  step(`search "gene": Genetics & Genomes with ${searchCount} things after ${ahead.length} titles that show the word, ${geneticsThings} Genetics things, matches bold`);

  // Back from a result comes back to the same search.
  await page.fill('[data-action="le-search"]', 'tree thin');
  await page.waitForSelector(`.is-results [data-place="${TREE}"]`);
  await page.evaluate(() => document.querySelector('[data-action="le-search"]').blur());
  await page.click(`.is-results [data-place="${TREE}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${TREE}"]`);
  assert.equal(await page.locator('[data-screen="place"] .le-title b').count(), 0, 'A place page marks no search matches');
  await page.click('[data-action="le-back"]');
  await page.waitForSelector('.le-list.is-results');
  assert.equal(await page.inputValue('[data-action="le-search"]'), 'tree thin', 'The search is still there');
  assert.equal(await page.locator(`.is-results [data-place="${TREE}"]`).count(), 1, 'Its results are still there');
  await page.click('[data-action="le-search-cancel"]');
  await page.waitForSelector('[data-action="le-index"]');
  step('a place opened from a search, and Back: the same search and its results');

  // Browse by subject, field and place: the same whole count everywhere.
  await page.click('[data-action="le-index"]');
  await page.waitForSelector('[data-screen="index"]');
  const indexed = await page.$eval(`[data-screen="index"] [data-place="${GENETICS}"]`, el => el.closest('li').textContent);
  await page.click(`[data-subject="knowledge.science"] [data-place="knowledge.science.biology"]`);
  await page.waitForSelector('[data-screen="place"][data-place="knowledge.science.biology"]');
  await page.click(`.le-shelf [data-place="${GENETICS}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${GENETICS}"]`);
  const pageCount = Number((await page.$eval('.le-hero .le-path', el => el.textContent)).match(/(\d+) things?/)?.[1]);
  assert.equal(pageCount, searchCount, 'The place page counts what search counts');
  assert.ok(indexed.includes(String(searchCount)), `The index counts it the same (${indexed})`);
  await noSideways(page, 'place');
  await page.click('[data-action="le-back"]');
  await page.click('[data-action="le-back"]');
  await page.waitForSelector('[data-screen="index"]');
  await noSideways(page, 'index');
  await page.click('[data-action="le-back"]');
  await page.waitForSelector('[data-screen="home"]');
  step(`subject → field → place: Science → Biology → Genetics & Genomes, ${pageCount} things in search, index and page alike; back to home`);

  // Every kind of thing opens the real thing.
  const openKind = async kind => {
    await page.click('[data-action="le-chip-clear"]').catch(() => {});
    const chip = { video: 'video', reel: 'reel', book: 'book', film: 'film', link: 'link', idea: 'note', question: 'note' }[kind];
    await page.click(`[data-chip="${chip}"]`);
    await page.waitForSelector(`.le-list [data-kind="${kind}"]`);
    const key = await page.getAttribute(`.le-list [data-kind="${kind}"]`, 'data-piece');
    await page.click(`.le-list [data-piece="${key}"]`);
    return key;
  };
  await openKind('video');
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
  assert.equal(await page.evaluate(() => location.hash), '', 'The lab address leaves with the Library');
  await toLibrary(page);
  assert.equal(await page.evaluate(() => location.hash), '#/lab/library-e');
  assert.equal(await page.getAttribute('[data-chip].is-on', 'data-chip'), 'video', 'The Library tab comes back to the same list');
  step('a video plays in Watch; the Library tab returns to the same list');
  const reel = await openKind('reel');
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && `reel:${s.explore.reelId}` === id; }, reel);
  await toLibrary(page);
  step(`a reel plays in Reels (${reel})`);
  // A film needs Wikidata, which the seed may not have reached: then the film's step is skipped, and said so.
  const films = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1') ?? '{"items":[]}').items.filter(i => i.kind !== 'book' && !i.removedAt).length);
  for (const kind of ['book', 'film', 'link']) {
    if (kind === 'film' && !films) { console.log('note  the seed got no film (Wikidata could not be reached): a film opening its sheet is not checked'); continue; }
    await openKind(kind);
    await page.waitForSelector('.lib-sheet[data-item-sheet]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.lib-sheet', { state: 'detached' });
    step(`a ${kind} opens its sheet`);
  }
  for (const kind of ['idea', 'question']) {
    await openKind(kind);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).dialog === 'capture');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).dialog);
    await page.waitForSelector('[data-screen="home"]');
    step(`a ${kind === 'idea' ? 'note' : 'question'} opens in the editor`);
  }
  await page.click('[data-action="le-chip-clear"]');

  // A collection, and a place from the shelf.
  await page.click('[data-shelf="collection"]');
  await page.waitForSelector('[data-screen="collection"] .le-four.is-hero');
  await noSideways(page, 'collection');
  await page.click('[data-action="le-back"]');
  await page.waitForSelector('[data-screen="home"]');
  step('a collection opens with its four-up cover; back');

  // Proved: refresh first; a refresh opens its case or check, and the browser's Back returns here.
  await page.click('[data-chip="proved"]');
  await page.waitForSelector('.le-list.is-proved');
  const firstDue = await page.$eval('.le-list.is-proved > li', el => !!el.querySelector('[data-action="le-refresh"]'));
  assert.ok(firstDue, 'A place ready to refresh comes first');
  const refreshes = await page.locator('.is-proved [data-action="le-refresh"]').count();
  const due = await page.locator('.is-proved .le-disc.is-ready').count();
  assert.equal(refreshes, due, 'Refresh shows only beside a place that is ready');
  await page.click('.is-proved [data-action="le-refresh"]');
  await page.waitForFunction(() => ['mission', 'check'].includes(JSON.parse(window.render_game_to_text()).route.kind));
  const opened = (await state(page)).route.kind;
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/lab/library-e' && JSON.parse(window.render_game_to_text()).route.kind === 'map');
  await page.waitForSelector('.le-list.is-proved');
  step(`Proved: ${due} ready first, Refresh only on those; it opens its ${opened}, and Back returns to the list`);

  // A place proved and not due: no Refresh, its record of proof, and it flies the Atlas.
  await page.click(`.is-proved [data-place="${SELECTION}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  await page.waitForSelector('.le-proof [data-record]');
  assert.equal(await page.locator('.le-hero [data-action="le-refresh"]').count(), 0, 'Natural selection is not due: no Refresh');
  assert.match(await page.$eval('.le-proofline', el => el.textContent), /Lasting/);
  await page.click('[data-action="le-fly"]');
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, SELECTION, { timeout: 15000 });
  await toLibrary(page);
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  step('a lasting place offers no Refresh, keeps its proof record, flies the Atlas, and the tab returns to it');

  // A place not proved offers its lesson, which opens; Back returns to the place.
  await page.click('[data-action="le-back"]');
  await page.click('[data-action="le-chip-clear"]');
  await page.click('[data-action="le-index"]');
  await page.click('.le-inside [data-place="knowledge.science.biology.evolution"]');
  await page.click(`.le-shelf [data-place="${TREE}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${TREE}"] [data-action="le-lesson"]`);
  await page.click('[data-action="le-lesson"]');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).route.kind === 'expedition');
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/lab/library-e' && JSON.parse(window.render_game_to_text()).route.kind === 'map');
  await page.waitForSelector(`[data-screen="place"][data-place="${TREE}"]`);
  step('a place not proved offers its lesson; it opens, and Back returns to the place');

  // A new collection of the learner's own, kept by reference across a reload.
  await page.click('[data-action="le-back"]');
  await page.click('[data-action="le-back"]');
  await page.waitForSelector('[data-screen="index"]');
  await page.click('[data-action="collection-new"]');
  await page.fill('[data-action="collection-name"]', 'Deep time');
  const picks = await page.$$eval('[data-pick]', els => els.map(el => el.dataset.pick).filter(key => key.startsWith('reel:e0')).slice(0, 2));
  assert.equal(picks.length, 2);
  for (const key of picks) await page.click(`[data-pick="${key}"]`);
  await page.click('[data-action="collection-save"]');
  await page.waitForSelector('[data-screen="collection"] .le-four.is-hero');
  await page.reload();
  await page.waitForSelector('[data-screen="home"] [data-shelf="collection"]');
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-collections-v1')).collections.find(c => c.name === 'Deep time'));
  assert.deepEqual(kept.items, picks);
  await page.click(`[data-shelf="collection"][data-collection="${kept.id}"]`);
  await page.waitForSelector(`[data-screen="collection"][data-collection="${kept.id}"]`);
  assert.equal(await page.locator('[data-screen="collection"] .le-list .le-row').count(), 2);
  step('a new collection is made from the index, kept by reference across a reload');
  await context.close();

  assert.deepEqual(refusedWidths, [], 'No picture is asked for at a width Commons refuses');
  if (wikidata.size) console.log(`note  ${wikidata.size} failed Wikidata request(s) the seed let go (films left out):\n${[...wikidata].map(m => `      ${m}`).join('\n')}`);
  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  console.log('library-e journey: all good');
} finally {
  await browser.close();
  reader?.kill();
}
