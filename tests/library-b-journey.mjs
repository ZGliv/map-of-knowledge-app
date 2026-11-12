// Prototype B, "The Index", end to end at 375×812 on the seeded learner (tests/library-b-shots.mjs seeds
// output/library-b/seed-storage.json; run it first): the hidden route opens inside the shell with
// Library lit, a place page opens and comes back, "See on the map" flies the Atlas there, a case
// opened from the index returns to it, videos play in Watch and reels in Reels, search filters live,
// a folded chapter stays folded, and the Library tab itself is untouched. Then again in WebKit, the
// iPhone's engine (TestFlight runs the site in it), as an iPhone with its insets: Contents lands each
// chapter under the chrome, and coming back from a reel or a place's page lands on the same lines.
//
//   MOK_URL=http://127.0.0.1:5238 node tests/library-b-journey.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5238';
const storage = JSON.parse(await readFile('output/library-b/seed-storage.json', 'utf8'));
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const ACCEL = 'knowledge.science.physics.mechanics.motion.acceleration';
const browser = await chromium.launch({ headless: true });
const errors = [];
const passed = [];
const ok = line => { passed.push(line); console.log(`ok  ${line}`); };

async function open(hash = '#/lab/library-b') {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await context.addInitScript(data => { if (sessionStorage.getItem('lbx-seeded')) return; for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value); sessionStorage.setItem('lbx-seeded', '1'); }, storage);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${URL}/${hash}`);
  await page.waitForFunction(() => !!window.render_game_to_text);
  return { context, page };
}
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const toEntry = (page, nodeId) => page.evaluate(id => {
  const box = document.querySelector('.studio-main>.notebook-workspace');
  const target = document.querySelector(`[data-lbx-entry="${id}"]`);
  box.scrollTop = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 160;
}, nodeId);

try {
  const { context, page } = await open();
  await page.waitForSelector('[data-lbx-chapter]');
  assert.equal((await state(page)).workspace, 'notebook');
  assert.equal(await page.locator('[data-action="open-notebook-mobile"]').getAttribute('aria-current'), 'page');
  assert.ok(await page.locator('.studio-mobile-nav').isVisible());
  ok('The hidden route opens the index full-screen in the shell, the tab bar there with Library lit');

  assert.deepEqual(await page.locator('[data-lbx-chapter]').evaluateAll(list => list.map(el => el.dataset.lbxChapter)), ['knowledge.science', 'knowledge.humanities', 'knowledge.arts', 'unplaced']);
  assert.equal(await page.locator('.lbx-contents li.is-blank').count(), 5);
  ok('Chapters are the territories with something in them, in the atlas order; the rest stay blank in the contents');

  await toEntry(page, SELECTION);
  await page.click(`[data-lbx-entry="${SELECTION}"]`);
  await page.waitForSelector(`[data-lbx-place="${SELECTION}"]`);
  assert.match(await page.evaluate(() => location.hash), /#\/lab\/library-b\/place\//);
  await page.goBack();
  await page.waitForSelector('[data-lbx-page="index"]');
  ok('An entry opens its place page, and Back returns to the index');

  await page.click(`[data-lbx-entry="${SELECTION}"]`);
  await page.waitForSelector(`[data-lbx-place="${SELECTION}"]`);
  await page.click('[data-action="lbx-see-on-map"]');
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && s.location.id === id && !s.navigating; }, SELECTION, { timeout: 20000 });
  ok('"See on the map" flies the Atlas to the place');

  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector(`[data-lbx-place="${SELECTION}"]`);
  ok('The Library tab comes back to the same page of the index');

  // A case from the index, and back.
  await page.click('[data-action="lbx-back"]');
  await page.waitForSelector('[data-lbx-page="index"]');
  await toEntry(page, ACCEL);
  const refresh = page.locator(`[data-lbx-proof="refresh"][data-node-id="${ACCEL}"]`);
  await refresh.waitFor();
  await refresh.click();
  await page.waitForFunction(() => ['mission', 'check'].includes(JSON.parse(window.render_game_to_text()).route.kind));
  const exit = page.locator('[data-action="mission-close"],[data-action="check-close"],[data-action="check-exit"]').first();
  await exit.click();
  await page.waitForSelector('[data-lbx-page="index"]');
  assert.equal(await page.evaluate(() => location.hash), '#/lab/library-b');
  ok('A refresh due at a place opens its case, and leaving the case returns to the index');

  // Watch and Reels.
  const video = page.locator('.lbx-recent [data-lbx-item^="link:"]').first();
  await video.click();
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'feed'; });
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-lbx-page="index"]');
  const reel = page.locator('.lbx-recent [data-lbx-item^="reel:"]').first();
  const reelId = (await reel.getAttribute('data-lbx-item')).slice(5);
  await reel.click();
  await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.tab === 'reels' && s.explore.reelId === id; }, reelId);
  ok('A saved video plays in Watch and a kept reel in Reels');

  // Search, and folding.
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-lbx-page="index"]');
  await page.fill('[data-action="lbx-search"]', 'plague');
  await page.waitForSelector('.lbx-found');
  assert.deepEqual(await page.locator('[data-lbx-chapter]').evaluateAll(list => list.map(el => el.dataset.lbxChapter)), ['knowledge.humanities']);
  await page.fill('[data-action="lbx-search"]', '');
  ok('Search filters the index as you type');
  await page.locator('[data-lbx-chapter="knowledge.arts"] [data-action="lbx-fold"]').click();
  await page.reload();
  await page.waitForSelector('[data-lbx-chapter]');
  assert.equal(await page.locator('[data-lbx-chapter="knowledge.arts"].is-folded').count(), 1);
  await page.locator('[data-lbx-chapter="knowledge.arts"] [data-action="lbx-fold"]').click();
  ok('A folded chapter stays folded after a reload');
  await context.close();

  // The Library tab itself is as it was.
  const plain = await open('');
  await plain.page.click('[data-action="open-notebook-mobile"]');
  await plain.page.waitForSelector('[data-workspace="notebook"].lib');
  assert.equal(await plain.page.locator('[data-lab="library-b"]').count(), 0);
  await plain.context.close();
  ok('The Library tab without the route is the existing Library');

  // WebKit, as an iPhone.
  const wk = await webkit.launch({ headless: true });
  try {
    const context = await wk.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await context.addInitScript(() => addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = ':root{--safe-top:47px!important;--safe-bottom:34px!important}'; document.head.append(style); }));
    await context.addInitScript(data => { if (sessionStorage.getItem('lbx-seeded')) return; for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value); sessionStorage.setItem('lbx-seeded', '1'); }, storage);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`webkit: ${error.message}`));
    await page.goto(`${URL}/#/lab/library-b`);
    await page.waitForSelector('[data-lbx-chapter]', { timeout: 30000 });
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.waitForTimeout(2000);
    // Where a part sits against the line under the chrome, once the page has come to rest.
    const rest = () => page.evaluate(async () => {
      const box = document.querySelector('.studio-main>.notebook-workspace');
      let last = -1, still = 0;
      for (let i = 0; i < 300 && still < 20; i++) { await new Promise(r => requestAnimationFrame(r)); if (box.scrollTop === last) still++; else { still = 0; last = box.scrollTop; } }
    });
    const offset = selector => page.evaluate(sel => {
      const box = document.querySelector('.studio-main>.notebook-workspace');
      const line = box.getBoundingClientRect().top + (parseFloat(getComputedStyle(box).scrollPaddingTop) || 0);
      return Math.round(document.querySelector(sel).getBoundingClientRect().top - line);
    }, selector);
    const toTop = () => page.evaluate(() => { document.querySelector('.studio-main>.notebook-workspace').scrollTop = 0; });

    for (const id of ['knowledge.science', 'knowledge.humanities', 'knowledge.arts']) {
      await toTop();
      await rest();
      await page.locator(`[data-lbx-contents="${id}"]`).tap();
      await page.waitForTimeout(200);
      await rest();
      const off = await offset(`[data-lbx-chapter="${id}"]`);
      assert.ok(Math.abs(off) <= 4, `Contents lands ${id} under the chrome in WebKit (it sat ${off}px off)`);
    }
    ok('WebKit: a Contents tap lands each chapter right under the chrome');

    // Scroll by hand to Deep time, open a reel in view, come back by the Library tab.
    const DEEP = 'knowledge.science.biology.evolution.deep-time';
    await toTop();
    for (let i = 0; i < 80; i++) {
      const top = await page.evaluate(id => document.querySelector(`[data-lbx-entry="${id}"]`).getBoundingClientRect().top, DEEP);
      if (top < 320) break;
      await page.evaluate(() => document.querySelector('.studio-main>.notebook-workspace').scrollBy(0, 280));
      await page.waitForTimeout(60);
    }
    await rest();
    const before = await offset(`[data-lbx-entry="${DEEP}"]`);
    const reelInView = await page.evaluateHandle(() => [...document.querySelectorAll('.lbx-chapters [data-lbx-item^="reel:"]')]
      .find(el => { const r = el.getBoundingClientRect(); return r.top > 200 && r.bottom < 700 && r.left >= 0 && r.right <= 375; }));
    const reelKey = await reelInView.evaluate(el => el?.dataset.lbxItem ?? null);
    assert.ok(reelKey, 'A reel is in view near Deep time');
    await reelInView.asElement().tap();
    await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'explore' && s.explore.reelId === id; }, reelKey.slice(5));
    await page.locator('[data-action="open-notebook-mobile"]').tap();
    await page.waitForSelector('[data-lbx-page="index"]');
    await rest();
    const back = await offset(`[data-lbx-entry="${DEEP}"]`);
    assert.ok(Math.abs(back - before) <= 4, `Back from a reel, Deep time is where it was in WebKit (${before} then ${back})`);
    // And from its place's page, by the page's own way back.
    await page.locator(`[data-lbx-entry="${DEEP}"]`).tap();
    await page.waitForSelector(`[data-lbx-place="${DEEP}"]`);
    await page.locator('[data-action="lbx-back"]').tap();
    await page.waitForSelector('[data-lbx-page="index"]');
    await rest();
    const again = await offset(`[data-lbx-entry="${DEEP}"]`);
    assert.ok(Math.abs(again - before) <= 4, `Back from a place's page, Deep time is where it was in WebKit (${before} then ${again})`);
    ok('WebKit: coming back from a reel or a place\'s page lands on the same lines');
    await context.close();
  } finally {
    await wk.close();
  }

  assert.deepEqual(errors, []);
  console.log(`\n${passed.length} checks passed`);
} finally {
  await browser.close();
}
