// Prototype C, the Mosaic (#/lab/library-c), end to end on a phone: every way out of it and back in.
// An empty library is the whole atlas as even tiles (never a default field); one thing kept is one
// short tile and the thing itself under it, with no lesson from another field; a seeded learner's
// tiles open into places; search opens from the shell's magnifier and lays results right under the
// field; a video plays in Watch, a reel in Reels, a place flies the Atlas, a proof opens its case and
// Back returns to the Mosaic where it was; a new collection survives a reload; and 500 things spread
// over the atlas make at most eight tiles, every name whole, the rest an index. Asserts; prints one
// line per step.
//
//   MOK_URL=http://127.0.0.1:5239 node tests/library-c-journey.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { seed } from './library-c-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5239';
const LAB = `${URL}/#/lab/library-c`;
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const EVOLUTION = 'knowledge.science.biology.evolution';
const browser = await chromium.launch({ headless: true });
const errors = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = message => console.log(`ok  ${message}`);
const lab = async page => { await page.goto(LAB); await page.reload(); await page.waitForSelector('[data-lab="library-c"] [data-screen]'); };
/** Names cut short: a tile's name taller or wider than its box. */
const clipped = page => page.$$eval('.lc-tile-name', els => els.filter(n => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1).map(n => n.textContent));

async function phone() {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|404|502|ERR_|CORS/.test(message.text())) errors.push(message.text()); });
  return { context, page };
}

try {
  {
    const { context, page } = await phone();
    // An empty library: the whole atlas, waiting, as even tiles, each with its mark.
    await page.goto(LAB);
    await page.waitForSelector('[data-lab="library-c"] .lc-tile.is-ghost');
    const ghosts = await page.$$eval('.lc-tile.is-ghost', els => els.map(el => ({ id: el.dataset.tile, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), mark: !!el.querySelector('.lc-mark') })));
    assert.equal(ghosts.length, 8);
    assert.ok(!ghosts.some(g => g.id.includes('evolution')), 'No field is a default');
    assert.equal(new Set(ghosts.map(g => `${g.w}x${g.h}`)).size, 1, `Every subject is the same size: ${JSON.stringify(ghosts)}`);
    assert.ok(ghosts.every(g => g.mark), 'Every subject carries its map mark');
    assert.equal(await page.getAttribute('[data-action="open-notebook-mobile"]', 'aria-current'), 'page', 'The Library tab is the one lit');
    step('empty library is the whole atlas as even tiles, Library tab lit');
    await page.click('[data-tile="knowledge.arts"]');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).workspace === 'atlas');
    step('an empty tile flies the Atlas there');

    // One thing kept, in Astronomy: a short tile, the thing itself in Recent, and no lesson from somewhere else.
    await page.evaluate(async () => {
      const store = await import('/src/notebook/libraryStore.ts');
      const library = store.saveLink(store.createLibraryStore(), { url: 'https://en.wikipedia.org/wiki/Black_hole', note: 'Black holes', nodeId: 'knowledge.science.astronomy' });
      const problem = store.saveLibrary(library);
      if (problem) throw new Error(problem);
    });
    await lab(page);
    const tile = await page.$eval('[data-tile="knowledge.science.astronomy"]', el => el.getBoundingClientRect().height);
    assert.ok(tile < 200, `One tile stands short, not a wall of colour (${tile}px)`);
    assert.equal(await page.locator('.lc-recent .lc-row').count(), 1, 'The one thing kept shows under it');
    await page.click('[data-tile="knowledge.science.astronomy"]');
    await page.waitForSelector('[data-screen="area"][data-area="knowledge.science.astronomy"]');
    assert.equal(await page.locator('[data-proof]').count(), 0, 'Astronomy has no lesson of its own, so it ends on none, never on Evolution');
    step('one thing kept: a short tile, the thing inline, no lesson from another field');
    await page.click('[data-action="lc-back"]');
    await context.close();
  }

  const { context, page } = await phone();
  // A learner a few months in.
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  await page.evaluate(seed);
  await lab(page);
  await page.waitForSelector(`[data-tile="${EVOLUTION}"]`);
  await page.waitForFunction(() => document.querySelectorAll('.lc-recent .lc-row').length >= 5);
  assert.deepEqual(await clipped(page), [], 'Every tile shows its whole name');
  assert.equal(await page.$$eval('.lc-tile', els => els.filter(t => !t.querySelector('.lc-thumb,.lc-tile-quote,.lc-tile-titles')).length), 0, 'Every tile shows a cover or a title');
  step('seeded learner: tiles with covers or titles, every name whole, Recent under them');

  // Search opens from the shell's own magnifier, and its results sit right under the field.
  await page.click('[data-action="open-search"]');
  await page.waitForSelector('[data-action="lc-search"]:focus');
  await page.keyboard.type('plague');
  await page.waitForSelector('[data-lit="knowledge.humanities.history"]');
  assert.equal(await page.locator('.lc-stage').count(), 0, 'The mosaic steps aside while searching on a phone');
  const top = await page.$eval('.lc-results .lc-row', el => el.getBoundingClientRect().top);
  assert.ok(top < 320, `The first result is right under the field (${Math.round(top)}px)`);
  await page.click('[data-action="lc-search-cancel"]');
  await page.waitForSelector('.lc-stage');
  step('search opens from the magnifier, results right under the field');

  await page.click(`[data-tile="${EVOLUTION}"]`);
  await page.click(`[data-tile="${SELECTION}"]`);
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  assert.equal(await page.locator('[data-screen="place"] .lc-proof').count(), 1, 'The place ends in proof');
  // The path is only the steps taken: a link and a note have no steps; a thing never finished is never proved.
  const paths = await page.$$eval('[data-screen="place"] .lc-row', rows => rows.map(r => ({ kind: [...r.querySelector('.lc-pic').classList].find(c => /^is-(book|film|video|reel|link|idea|question)$/.test(c)), stage: r.querySelector('.lc-path').dataset.stage, steps: r.querySelectorAll('.lc-path-steps i').length })));
  assert.ok(paths.filter(p => p.kind === 'is-link' || p.kind === 'is-idea').every(p => p.stage === 'kept' && p.steps === 0), JSON.stringify(paths));
  step('a tile opens into places, a place into its collection, ending in proof; links and notes keep only their day');

  // A video plays in Watch, and the Library tab comes back to the same place.
  await page.locator('[data-screen="place"] .lc-row button').filter({ has: page.locator('.lc-pic.is-video') }).first().click();
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
  assert.equal(await page.evaluate(() => location.hash), '', 'The lab address leaves with the Library');
  step('a video plays in Watch');
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector(`[data-screen="place"][data-place="${SELECTION}"]`);
  assert.equal(await page.evaluate(() => location.hash), '#/lab/library-c');
  step('the Library tab returns to the Mosaic, at the same place');

  // A reel plays in Reels.
  const reelId = await page.locator('[data-screen="place"] .lc-row button').filter({ has: page.locator('.lc-pic.is-reel') }).first().getAttribute('data-piece');
  await page.locator(`[data-piece="${reelId}"]`).click();
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && `reel:${s.explore.reelId}` === id; }, reelId);
  step(`a reel plays in Reels (${reelId})`);
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-screen="place"]');

  // A place flies the Atlas.
  await page.click('[data-action="lc-fly"]');
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, SELECTION, { timeout: 15000 });
  step('a place flies the Atlas');
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-screen="place"]');

  // Proof opens its case; Back returns to the Mosaic.
  await page.click('[data-screen="place"] [data-proof]');
  await page.waitForFunction(() => ['mission', 'check', 'expedition'].includes(JSON.parse(window.render_game_to_text()).route.kind));
  const opened = (await state(page)).route.kind;
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/lab/library-c' && JSON.parse(window.render_game_to_text()).route.kind === 'map');
  await page.waitForSelector('[data-screen="place"]');
  step(`proof opens its ${opened}, and Back returns to the place`);

  // An item opens the existing item page.
  await page.locator('[data-screen="place"] .lc-row button').filter({ has: page.locator('.lc-pic.is-book') }).first().click();
  await page.waitForSelector('.lib-sheet');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lib-sheet', { state: 'detached' });
  step('a book opens the item page');

  // A new collection, kept across a reload; its covers are never cropped.
  await page.click('[data-action="lc-back"]');
  await page.click('[data-action="lc-back"]');
  await page.click('[data-action="collection-new"]');
  await page.fill('[data-action="collection-name"]', 'Deep time');
  const picks = await page.$$eval('[data-pick]', els => els.map(el => el.dataset.pick).filter(key => key.startsWith('reel:e0')).slice(0, 2));
  for (const key of picks) await page.click(`[data-pick="${key}"]`);
  await page.click('[data-action="collection-save"]');
  await page.waitForSelector('[data-screen="collection"]');
  await page.reload();
  await page.waitForSelector('[data-screen="collection"], [data-screen="home"]');
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-collections-v1')).collections.find(c => c.name === 'Deep time'));
  assert.deepEqual(kept.items, picks);
  step('a new collection is kept, by reference, across a reload');
  await context.close();

  // 500 things spread over the whole atlas, as an import would bring.
  {
    const { context, page } = await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(async () => {
      const [store, notebookStore, { catalog }] = await Promise.all([import('/src/notebook/libraryStore.ts'), import('/src/core/notebook.ts'), import('/src/core/catalog.ts')]);
      const nodes = catalog.all().filter(n => n.depth >= 3);
      let seed = 7;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      let library = store.createLibraryStore(), notebook = notebookStore.createNotebook();
      for (let i = 0; i < 500; i++) {
        const node = nodes[Math.floor(random() * nodes.length)];
        if (random() < 0.8) library = store.saveLink(library, { url: `https://example.org/${i}`, note: `Notes on ${node.name} ${i}`, nodeId: node.id });
        else notebook = notebookStore.upsertNotebookEntry(notebook, { title: `Why does ${node.name.toLowerCase()} work, case ${i}?`, body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: [node.id] });
      }
      const problems = [store.saveLibrary(library), notebookStore.saveNotebook(notebook)].filter(Boolean);
      if (problems.length) throw new Error(problems.join(' | '));
    });
    await lab(page);
    await page.waitForSelector('.lc-index [data-index]');
    await page.waitForTimeout(300);
    const tiles = await page.locator('.lc-tile').count();
    assert.ok(tiles >= 4 && tiles <= 8, `At most eight tiles on a phone (${tiles})`);
    assert.deepEqual(await clipped(page), [], 'Every tile name whole at 500');
    const biggest = await page.$$eval('.lc-tile', els => Math.max(...els.map(t => t.getBoundingClientRect().width * t.getBoundingClientRect().height)));
    const frame = await page.$eval('.lc-frame', el => el.clientWidth * el.clientHeight);
    assert.ok(biggest < frame / 3, 'No tile takes more than a third of the mosaic');
    step(`500 things: ${tiles} tiles, every name whole, the other fields an index`);
    const first = await page.$eval('.lc-tile', el => el.dataset.tile);
    await page.click(`[data-tile="${first}"]`);
    await page.waitForSelector('[data-screen="area"], [data-screen="place"]');
    await page.waitForTimeout(700);
    assert.deepEqual(await clipped(page), [], 'Every place name whole inside the biggest field');
    step('the biggest field opens with every place name whole');
    await context.close();
  }

  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  console.log('library-c journey: all good');
} finally {
  await browser.close();
}
