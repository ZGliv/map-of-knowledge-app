// Prototype D, the Logbook (#/lab/library-d), end to end on a phone: WebKit at 375×812 with an iPhone's
// user agent, touch, and its insets (59 px status bar, 34 px home indicator) stood in through the --safe-*
// variables the app reads them into. Four learners:
//   empty        today on the spine and a quiet way to add the first thing; no search, no tabs.
//   three things three dated rows and where it began; the video plays in Watch, the reel in Reels, the
//                book opens its sheet, and the Library tab comes back to the Logbook where it was.
//   one lesson   the three things and the first Evolution lesson: on the phone's Places and in the desktop
//                rail (Chromium, 1440), a place's name and state stay whole and a step too wide for its row
//                moves under the name, lined up with it.
//   heavy        a year and more (tests/library-d-seed.mjs): the newest month open, older months folded to
//                a line; the floating month opens the months and jumps to one; Places is one tap away and
//                a place carries its state, On the map and one next step; "gene" finds Genetics things and
//                places, ranked, off the spine; every kind of row opens the real thing (video, reel, book,
//                link, note, lesson, case or refresh, the Atlas) and Back returns to the Logbook.
// Every screen is checked for sideways scroll at 375, and the console for errors. Asserts; prints one line
// per step.
//
//   MOK_URL=http://127.0.0.1:5281 node tests/library-d-journey.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, devices, webkit } from 'playwright';
import { addYear, firstThree, oneLesson, seed } from './library-d-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5281';
const LAB = `${URL}/#/lab/library-d`;
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const GENETICS = 'knowledge.science.biology.genetics-genomes';
const EVOLUTION = 'knowledge.science.biology.evolution';
const insetCss = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';
const errors = [];
// The seed searches Wikidata for films and lets a failed search go (the film is left out). WebKit still logs
// that failed request (often a 429 or 503 while Wikidata rate-limits this machine) as a JavaScript error, which
// Playwright reports as a page error: "/www.wikidata.org/w/api.php?… due to access control checks." (WebKit's
// "Fetch API cannot load https://…" with its head cut off). Only a failed request whose host is Wikidata's is
// let through, and it is printed, not hidden.
const WIKIDATA = /^(?:Fetch API cannot load )?(?:https?:)?\/\/?(?:www|query)\.wikidata\.org\/\S* due to access control checks\.?$/;
const wikidata = new Set();
let last = 'start';
const step = message => { last = message; console.log(`ok  ${message}`); };

// The link reader, for the pages the heavy learner saved (scripts/unfurl-server.mjs on 5191).
let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const browser = await webkit.launch({ headless: true });
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
// A hash-only change never reloads, so the page is reloaded to read what was just seeded; the first load
// settles before the reload, so no module import is cut off mid-flight.
const lab = async page => {
  await page.goto(LAB);
  await page.waitForSelector('[data-lab="library-d"] [data-screen]', { timeout: 30000 });
  await page.reload();
  await page.waitForSelector('[data-lab="library-d"] [data-screen]', { timeout: 30000 });
};
async function phone() {
  const context = await browser.newContext({ ...devices['iPhone X'], deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('pageerror', error => { if (WIKIDATA.test(error.message)) wikidata.add(error.message.slice(0, 160)); else errors.push(`after "${last}": ${error.message}`); });
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|404|502|503|ERR_|CORS|access control|due to access control/i.test(message.text())) errors.push(`after "${last}": ${message.text()}`); });
  await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss);
  return { context, page };
}
/** Chromium at 1440 x 900, where the Logbook's places sit in a rail beside the record. */
let chromiumBrowser = null;
async function desktop() {
  chromiumBrowser ??= await chromium.launch({ headless: true });
  const context = await chromiumBrowser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => { if (WIKIDATA.test(error.message)) wikidata.add(error.message.slice(0, 160)); else errors.push(`after "${last}": ${error.message}`); });
  return { context, page };
}
/** Nothing runs past the right edge: the page, the Logbook's scroller, and every row. */
async function noSideways(page, where) {
  const wide = await page.evaluate(() => {
    const out = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width + 1) out.push(`document ${document.documentElement.scrollWidth}`);
    const scroller = document.querySelector('.ld-scroll');
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) out.push(`scroller ${scroller.scrollWidth}`);
    for (const el of document.querySelectorAll('.ld-page *')) {
      if (el.closest('.ld-tabs,.ld-strip,.ld-e-m,.ld-coll-strip')) continue;
      const box = el.getBoundingClientRect();
      if (box.width && box.right > width + 1) out.push(`${el.className || el.tagName} ends at ${Math.round(box.right)}`);
    }
    return out.slice(0, 5);
  });
  assert.deepEqual(wide, [], `No sideways scroll on ${where}`);
}
/** A place's name is never cut while it has a line of its own to move to. */
const placesWhole = page => page.$$eval('.ld-e-m .ld-pl', chips => chips.filter(chip => {
  const name = chip.querySelector('em');
  return name && name.scrollWidth > name.clientWidth + 1 && chip.getBoundingClientRect().width < chip.parentElement.getBoundingClientRect().width - 2;
}).map(chip => chip.textContent));
/** A place row's name and state are never cut: its step sits beside them while it fits, else under them. */
const placeRowsWhole = page => page.$$eval('.ld-prow', rows => rows.filter(row => row.offsetParent).flatMap(row => {
  const text = row.querySelector('.ld-prow-text');
  const step = row.querySelector('.ld-step');
  const cut = [...text.children].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => `"${el.textContent}" cut`);
  if (step) {
    const t = text.getBoundingClientRect(), s = step.getBoundingClientRect();
    if (s.left < t.right - 1 && s.top < t.bottom - 1) cut.push(`"${step.textContent}" overlaps "${text.textContent}"`);
  }
  return cut;
}));
const back = async page => { await page.click('[data-action="open-notebook-mobile"]'); await page.waitForSelector('[data-lab="library-d"] [data-screen]'); };
const scrollTo = (page, selector, offset = 140) => page.evaluate(([s, o]) => { const scroller = document.querySelector('.ld-scroll'); const el = document.querySelector(s); if (scroller && el) scroller.scrollTo(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - o); }, [selector, offset]);
const tap = async (page, selector) => { await scrollTo(page, selector); await page.click(selector); };

try {
  // --- an empty learner ---
  {
    const { context, page } = await phone();
    await lab(page);
    assert.equal(await page.getAttribute('[data-action="open-notebook-mobile"]', 'aria-current'), 'page', 'The Library tab is the one lit');
    assert.equal(await page.locator('[data-action="ld-search"]').count(), 0, 'Nothing to search yet');
    assert.equal(await page.locator('.ld-tabs').count(), 0, 'No tabs yet');
    assert.equal(await page.locator('.ld-day.is-today').count(), 1, 'Today sits on the spine');
    assert.equal(await page.locator('.ld-e.is-thing').count(), 0);
    await noSideways(page, 'the empty Logbook');
    await page.click('[data-action="ld-add-first"]');
    await page.waitForSelector('.lib-sheet');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.lib-sheet', { state: 'detached' });
    step('empty: today on the spine, a quiet way to add, no search or tabs');
    await context.close();
  }

  // --- three things ---
  {
    const { context, page } = await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    const wrote = await page.evaluate(firstThree);
    await lab(page);
    await page.waitForFunction(() => document.querySelectorAll('.ld-e.is-thing').length === 3);
    const kinds = await page.$$eval('.ld-e.is-thing [data-row]', els => els.map(el => el.dataset.kind));
    assert.deepEqual(kinds, ['book', 'reel', 'video'], `Three rows, newest first: ${kinds}`);
    assert.equal(await page.locator('.ld-month.is-folded').count(), 0, 'Nothing folds for a new learner');
    assert.match(await page.textContent('.ld-began'), /^Began /);
    await noSideways(page, 'three things');
    step(`three things: ${kinds.join(', ')}, then where it began (${wrote.book})`);
    // The video plays in Watch, and the Library tab comes back to the Logbook.
    await page.click('[data-kind="video"]');
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
    assert.equal(await page.evaluate(() => location.hash), '', 'The lab address leaves with the Library');
    await back(page);
    assert.equal(await page.evaluate(() => location.hash), '#/lab/library-d');
    step('the video plays in Watch; the Library tab returns to the Logbook');
    await page.click('[data-kind="reel"]');
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && s.explore.reelId === 'physics-hammer-and-feather'; });
    await back(page);
    step('the reel plays in Reels');
    await page.click('[data-kind="book"]');
    await page.waitForSelector('.lib-sheet');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.lib-sheet', { state: 'detached' });
    step('the book opens its sheet');
    await context.close();
  }

  // --- three things and one lesson: a place row's step moves under its name rather than cutting it ---
  for (const desk of [false, true]) {
    const { context, page } = desk ? await desktop() : await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(firstThree);
    await page.evaluate(oneLesson);
    await lab(page);
    if (!desk) await page.click('[data-tab="places"]');
    await page.waitForSelector('[data-index] [data-place-row] ~ [data-step]');
    assert.deepEqual(await placeRowsWhole(page), [], 'Place names and states are kept whole');
    const rows = await page.$$eval('[data-index] .ld-prow', rows => rows.filter(row => row.querySelector('.ld-step')).map(row => {
      const text = row.querySelector('.ld-prow-text').getBoundingClientRect(), step = row.querySelector('.ld-step').getBoundingClientRect();
      return { row: row.innerText.replace(/\s+/g, ' '), under: step.top >= text.bottom - 1, lined: Math.abs(step.left - text.left) < 1.5 };
    }));
    assert.ok(rows.every(r => !r.under || r.lined), `A step moved under lines up with its place's name: ${JSON.stringify(rows)}`);
    if (!desk) await noSideways(page, 'Places with one lesson');
    step(`one lesson, ${desk ? 'desktop rail' : 'phone Places'}: ${rows.map(r => `${r.row}${r.under ? ' (step under)' : ''}`).join('; ')}`);
    await context.close();
  }

  // --- the heavy learner ---
  const { context, page } = await phone();
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  await page.evaluate(seed);
  const year = await page.evaluate(addYear);
  await lab(page);
  await page.waitForFunction(() => document.querySelectorAll('.ld-e.is-thing').length >= 8);
  const months = await page.$$eval('[data-month]', els => els.map(el => ({ key: el.dataset.month, folded: el.hasAttribute('data-folded') })));
  assert.ok(months.length >= 12, `A year and more of months (${months.length})`);
  assert.equal(months[0].folded, false, 'The newest month is open');
  assert.ok(months.filter(m => m.folded).length >= months.length - 3, 'Older months fold to a line');
  const height = await page.$eval('.ld-page', el => el.scrollHeight);
  assert.ok(height < 14000, `The record stays bounded (${height}px for ${year.videos + 60} things)`);
  assert.ok(await page.locator('.ld-day.is-lit').count() >= 1, 'A day a place was proved takes its colour');
  assert.ok(await page.locator('.ld-e.is-today [data-step]').count() >= 1, 'Today leads with what is ready to refresh');
  await noSideways(page, 'the heavy Logbook');
  assert.deepEqual(await placesWhole(page), [], 'Place names are kept whole');
  step(`heavy: ${months.length} months, ${months.filter(m => m.folded).length} folded, ${height}px tall`);

  // Today: a place's name opens its page, as everywhere else; the step beside it starts the case.
  const todayPlace = await page.getAttribute('.ld-e.is-today [data-today-place]', 'data-today-place');
  await page.click('.ld-e.is-today [data-today-place]');
  await page.waitForSelector(`[data-screen="place"][data-place="${todayPlace}"]`);
  // The Library tab, tapped while the Logbook shows, goes back to its front page.
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-lab="library-d"] [data-screen="home"]');
  step(`today's ${todayPlace.split('.').pop()} opens its place; the Library tab returns to the front page`);

  // The month floats in the top row once its chapter has scrolled away, and jumps to any month.
  await page.evaluate(() => { const s = document.querySelector('.ld-scroll'); s.scrollTo(0, 1600); });
  await page.waitForSelector('[data-action="ld-month-pill"]');
  const pill = await page.$eval('[data-action="ld-month-pill"]', el => { const r = el.getBoundingClientRect(); return { text: el.textContent, top: r.top, left: r.left, right: r.right }; });
  const capsules = await page.$$eval('.shell-lead,.shell-bar-tools', els => els.map(el => el.getBoundingClientRect()).map(r => ({ left: r.left, right: r.right })));
  assert.ok(capsules.every(c => pill.right <= c.left || pill.left >= c.right), `The month sits between the capsules: ${JSON.stringify({ pill, capsules })}`);
  await page.click('[data-action="ld-month-pill"]');
  await page.waitForSelector('[data-sheet="months"]');
  const target = months.find(m => m.folded).key;
  await page.click(`[data-sheet="months"] [data-jump="${target}"]`);
  await page.waitForSelector(`[data-month="${target}"]:not([data-folded])`);
  const landed = await page.$eval(`[data-month="${target}"]`, el => el.getBoundingClientRect().top);
  assert.ok(landed > 60 && landed < 200, `The month lands at the top (${Math.round(landed)}px)`);
  step(`the floating month (${pill.text}) opens the months; ${target} unfolds at the top`);
  await page.evaluate(() => document.querySelector('.ld-scroll').scrollTo(0, 0));

  // Places, one tap away: fields by subject, their places, states and next steps.
  await page.click('[data-tab="places"]');
  await page.waitForSelector('[data-index] [data-place-row]');
  const fields = await page.locator('.ld-prow.is-field').count();
  assert.ok(fields >= 6, `Fields by subject (${fields})`);
  assert.ok(await page.locator('[data-index] [data-step]').count() >= 1, 'Places carry their next step');
  const perField = await page.$$eval('[data-index] .ld-field', fields => fields.map(f => f.querySelectorAll('[data-step]:not([data-step="refresh"])').length));
  assert.ok(perField.every(n => n <= 1), `One step per field besides its refreshes: ${perField}`);
  await noSideways(page, 'Places');
  assert.deepEqual(await placeRowsWhole(page), [], 'Place names and states are kept whole; a step that does not fit moves under them');
  const under = await page.$$eval('[data-index] .ld-prow', rows => rows.filter(row => { const s = row.querySelector('.ld-step'); return s && s.getBoundingClientRect().top >= row.querySelector('.ld-prow-text').getBoundingClientRect().bottom - 1; }).length);
  await tap(page, `[data-place-row="${SELECTION}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  assert.match(await page.textContent('.ld-state'), /proved/i);
  assert.ok(await page.locator('[data-screen="place"] .ld-e.is-thing').count() >= 3, 'The place holds its things on its own spine');
  await noSideways(page, 'a place');
  step(`Places: ${fields} fields and regions, ${under} steps moved under their place; Natural selection: ${(await page.textContent('.ld-state')).trim()}`);
  // On the map flies the Atlas there; the Library tab comes back to the place.
  await page.click('[data-screen="place"] [data-action="ld-on-map"]');
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, SELECTION, { timeout: 15000 });
  await back(page);
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  step('On the map flies the Atlas; the Library tab returns to the place');
  await page.click('[data-action="ld-back"]');
  await page.waitForSelector('[data-screen="home"] [data-index]');
  step('Back returns to Places');

  // Search: "gene" finds Genetics things and places, whole words first, and leaves the spine.
  await page.click('[data-tab="all"]');
  await page.click('[data-action="open-search"]');
  await page.waitForSelector('[data-action="ld-search"]:focus');
  await page.keyboard.type('gene');
  await page.waitForSelector('[data-results] [data-row]');
  assert.equal(await page.locator('[data-results] .ld-day').count(), 0, 'Results are not drawn on the spine');
  assert.ok(await page.locator(`[data-results] [data-place-row="${GENETICS}"]`).count() === 1, 'The Genetics field is found');
  const hits = await page.$$eval('[data-results] .ld-list .ld-e-t', els => els.map(el => el.textContent));
  assert.ok(hits.length >= 3, `Genetics things found (${hits.length})`);
  assert.match(hits[0], /\bgene\b/i, `A whole-word hit leads: ${hits[0]}`);
  const top = await page.$eval('[data-results] .ld-found', el => el.getBoundingClientRect().top);
  assert.ok(top < 330, `Results sit right under the field (${Math.round(top)}px)`);
  await noSideways(page, 'search');
  step(`search "gene": ${await page.textContent('.ld-found')}; first "${hits[0]}"`);
  // A field found by search offers where the learner left off inside it: the step its own page offers.
  await page.fill('[data-action="ld-search"]', 'evol');
  await page.waitForSelector(`[data-results] [data-place-row="${EVOLUTION}"]`);
  const listed = await page.$$eval(`[data-results] .ld-prow`, (rows, id) => { const row = rows.find(r => r.querySelector(`[data-place-row="${id}"]`)); const s = row?.querySelector('[data-step]'); return s ? `${s.dataset.step} ${s.dataset.nodeId}` : null; }, EVOLUTION);
  assert.deepEqual(await placesWhole(page), [], 'Place names are kept whole in results');
  assert.deepEqual(await placeRowsWhole(page), [], 'Place rows are kept whole in results');
  await page.click(`[data-results] [data-place-row="${EVOLUTION}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${EVOLUTION}"]`);
  const headed = await page.$eval('.ld-place-actions', el => { const s = el.querySelector('[data-step]'); return s ? `${s.dataset.step} ${s.dataset.nodeId}` : null; });
  assert.equal(listed, headed, 'The search row and the place page offer the same step');
  assert.equal(await page.locator('[data-screen="place"] .ld-log [data-step]').count(), 0, 'The rows under a place carry no steps; its head carries the one');
  await page.click('[data-action="ld-back"]');
  await page.waitForSelector('[data-screen="home"]');
  step(`search "evol": Evolution offers ${listed}, as its page does`);

  // Every kind of row opens the real thing; Back comes back to the Logbook.
  const open = async (selector, until, label) => {
    await tap(page, selector);
    await page.waitForFunction(until, null, { timeout: 15000 });
    step(label);
  };
  const expand = async () => { for (const key of await page.$$eval('[data-folded]', els => els.map(el => el.dataset.month).slice(0, 3))) await tap(page, `[data-month="${key}"] .ld-fold`); };
  await expand();
  await open('[data-kind="video"]', () => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; }, 'a video plays in Watch');
  await back(page);
  await open('[data-kind="reel"]', () => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels'; }, 'a reel plays in Reels');
  await back(page);
  await tap(page, '[data-kind="book"]');
  await page.waitForSelector('.lib-sheet');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lib-sheet', { state: 'detached' });
  step('a book opens its sheet');
  await tap(page, '[data-kind="link"]');
  await page.waitForSelector('.lib-sheet');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lib-sheet', { state: 'detached' });
  step('a link opens its sheet');
  await tap(page, '[data-kind="question"], [data-kind="idea"]');
  await page.waitForSelector('.capture-dialog');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.capture-dialog', { state: 'detached' });
  step('a note opens in its editor');
  await tap(page, '[data-kind="proved"]');
  await page.waitForSelector('[data-screen="place"]');
  await page.click('[data-action="ld-back"]');
  await page.waitForSelector('[data-screen="home"]');
  step('a proof opens its place');
  // A lesson (Play the lesson) and a case or a refresh, each with the browser's Back to return.
  await page.click('[data-tab="places"]');
  await page.waitForSelector('[data-index]');
  const ran = [];
  for (const kind of ['lesson', 'case', 'refresh']) {
    let selector = `[data-index] [data-step="${kind}"], .ld-e.is-today [data-step="${kind}"]`;
    let searched = false;
    if (!await page.locator(selector).count() && kind === 'lesson') {
      // Places shows a field's one step (where the learner left off); a place found by search offers its own lesson.
      await page.click('[data-tab="all"]');
      await page.fill('[data-action="ld-search"]', 'gene');
      await page.waitForSelector('[data-results]');
      selector = '[data-results] [data-step="lesson"]';
      searched = true;
    }
    if (!await page.locator(selector).count()) { if (kind === 'refresh') { await page.click('[data-tab="all"]'); } }
    if (!await page.locator(selector).count()) continue;
    await tap(page, selector);
    await page.waitForFunction(() => ['mission', 'check', 'expedition'].includes(JSON.parse(window.render_game_to_text()).route.kind), null, { timeout: 15000 });
    const opened = (await state(page)).route.kind;
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#/lab/library-d' && JSON.parse(window.render_game_to_text()).route.kind === 'map', null, { timeout: 15000 });
    await page.waitForSelector('[data-lab="library-d"] [data-screen="home"]');
    step(`${kind} opens its ${opened}; Back returns to the Logbook`);
    ran.push(kind);
    if (searched) {
      await page.fill('[data-action="ld-search"]', '');
      await page.waitForSelector('[data-results]', { state: 'detached' });
      await page.click('[data-tab="places"]');
      await page.waitForSelector('[data-index]');
    }
  }
  assert.deepEqual(ran, ['lesson', 'case', 'refresh'], 'A lesson, a case and a refresh each open from the Library');

  // A new collection is kept across a reload.
  await page.click('[data-tab="collections"]');
  await page.click('[data-action="ld-collection-new"]');
  await page.fill('[data-action="ld-collection-name"]', 'Deep time');
  const picks = await page.$$eval('[data-pick]', els => els.map(el => el.dataset.pick).filter(key => key.startsWith('reel:')).slice(0, 2));
  for (const key of picks) await page.click(`[data-pick="${key}"]`);
  await page.click('[data-action="ld-collection-save"]');
  await page.waitForSelector('[data-screen="collection"]');
  await page.reload();
  await page.waitForSelector('[data-lab="library-d"] [data-screen]');
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-collections-v1')).collections.find(c => c.name === 'Deep time'));
  assert.deepEqual(kept.items, picks);
  step('a new collection is kept, by reference, across a reload');
  await context.close();

  if (wikidata.size) console.log(`note  ${wikidata.size} failed Wikidata request(s) the seed let go (films left out):\n${[...wikidata].map(m => `      ${m}`).join('\n')}`);
  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  console.log('library-d journey: all good');
} finally {
  await browser.close();
  await chromiumBrowser?.close();
  reader?.kill();
}
