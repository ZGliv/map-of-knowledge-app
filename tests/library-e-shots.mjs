// Prototype E of the Library, "Your Library" (#/lab/library-e), on a phone (WebKit at 375×812 with an
// iPhone's user agent, touch and insets) and on a desktop (Chromium at 1440×900): empty, three things,
// the learner a few months in (tests/library-e-seed.mjs) on every screen, and the heavy learner.
//
//   MOK_URL=http://127.0.0.1:5282 node tests/library-e-shots.mjs        (MOK_VARIANTS=phone,desktop)
//
// Writes output/library-e/*.png. Network: openlibrary.org, wikidata.org, i.ytimg.com, upload.wikimedia.org,
// and the pages the link reader unfurls (it runs on 5191, started here if it is not already running).
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { seed, seedFew, seedHeavy, seedWithRetry } from './library-e-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5282';
const LAB = `${URL}/#/lab/library-e`;
const OUT = path.resolve('output/library-e');
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const VARIANTS = [
  { name: 'phone', engine: webkit, context: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE }, insets: { top: 59, bottom: 34 } },
  { name: 'desktop', engine: chromium, context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
].filter(v => !process.env.MOK_VARIANTS || process.env.MOK_VARIANTS.split(',').includes(v.name));
const insetCss = ({ top = 0, bottom = 0 }) => `:root{--safe-top:${top}px!important;--safe-bottom:${bottom}px!important}`;
const ONLY = process.env.MOK_SHOTS ? process.env.MOK_SHOTS.split(',') : null;
const errors = [];
const browsers = new Map();

async function open(variant) {
  if (!browsers.has(variant.engine)) browsers.set(variant.engine, await variant.engine.launch({ headless: true }));
  const context = await browsers.get(variant.engine).newContext(variant.context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|404|502|ERR_|CORS|Access-Control/.test(message.text())) errors.push(`${variant.name}: ${message.text()}`); });
  if (variant.insets) await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss(variant.insets));
  return { context, page };
}
const settle = async page => {
  await page.waitForFunction(() => [...document.querySelectorAll('.le img')].filter(img => img.getBoundingClientRect().top < innerHeight).every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
};
async function shot(page, variant, name) {
  if (ONLY && !ONLY.some(o => name.includes(o))) return;
  await settle(page);
  await page.screenshot({ path: path.join(OUT, `${variant.name}-${name}.png`) });
  console.log(`shot ${variant.name}-${name}`);
}
// A hash-only change never reloads, so the page is reloaded to read what was just seeded, once what the
// first load fetches (and the lazy parts it warms after the map paints) has arrived.
const lab = async page => { await page.goto(LAB); await page.waitForSelector('[data-lab="library-e"] [data-screen]'); await page.waitForTimeout(900); await page.reload(); await page.waitForSelector('[data-lab="library-e"] [data-screen]', { timeout: 30000 }); };
const home = async page => { while (await page.locator('[data-action="le-back"]').count()) await page.click('[data-action="le-back"]'); await page.waitForSelector('[data-screen="home"]'); };
const scrollTo = (page, selector, offset = 0) => page.evaluate(([s, o]) => { const scroller = document.querySelector('.le-scroll'); const el = document.querySelector(s); if (scroller && el) scroller.scrollTo(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - o); }, [selector, offset]);

try {
  for (const variant of VARIANTS) {
    const phone = variant.name === 'phone';
    {
      const { context, page } = await open(variant);
      await lab(page);
      await shot(page, variant, '01-empty');
      await page.evaluate(seedFew);
      await lab(page);
      await page.waitForSelector('.le-row');
      await shot(page, variant, '02-three-things');
      await context.close();
    }
    const { context, page } = await open(variant);
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    console.log('seeded', JSON.stringify(await seedWithRetry(page, seed)));
    await lab(page);
    await page.waitForFunction(() => document.querySelectorAll('.le-row').length >= 8);
    await shot(page, variant, '03-home');
    await page.click('[data-chip="proved"]');
    await page.waitForSelector('.le-list.is-proved');
    await shot(page, variant, '04-proved');
    await page.click('[data-action="le-chip-clear"]');
    await page.click('[data-chip="book"]');
    if (await page.getAttribute('[data-action="le-sort"]', 'data-sort') !== 'az') await page.click('[data-action="le-sort"]');
    await page.waitForSelector('.le-letter');
    await shot(page, variant, '05-books-az');
    await page.click('[data-action="le-sort"]');
    await page.click('[data-action="le-chip-clear"]');
    if (phone) await page.click('[data-action="open-search"]');
    await page.fill('[data-action="le-search"]', 'gene');
    await page.waitForSelector('.le-list.is-results');
    await shot(page, variant, '06-search-gene');
    if (phone) await page.click('[data-action="le-search-cancel"]'); else await page.fill('[data-action="le-search"]', '');
    await page.click('[data-action="le-index"]');
    await page.waitForSelector('[data-screen="index"]');
    await shot(page, variant, '07-index');
    await scrollTo(page, '[data-subject="knowledge.humanities"]', 120);
    await shot(page, variant, '08-index-more');
    await home(page);
    await page.click('[data-chip="proved"]');
    await page.click('.is-proved [data-place="knowledge.science.biology.evolution.natural-selection"]');
    await page.waitForSelector('[data-screen="place"] .le-proof');
    await shot(page, variant, '09-place');
    await scrollTo(page, '.le-proof', phone ? 160 : 240);
    await shot(page, variant, '10-place-proof');
    await home(page);
    await page.click('[data-action="le-chip-clear"]');
    await page.click('[data-action="le-index"]');
    await page.click('.le-inside [data-place="knowledge.science.biology.evolution"]');
    await page.click('.le-shelf [data-place="knowledge.science.biology.evolution.tree-thinking"]');
    await page.waitForSelector('[data-screen="place"][data-place="knowledge.science.biology.evolution.tree-thinking"] [data-action="le-lesson"]');
    await shot(page, variant, '11-place-lesson');
    await page.click('[data-action="le-back"]');
    await page.click('[data-action="le-back"]');
    await page.click('[data-subject="knowledge.science"] [data-place="knowledge.science.biology"]');
    await page.waitForSelector('[data-screen="place"][data-place="knowledge.science.biology"]');
    await shot(page, variant, '12-field');
    await home(page);
    await page.click('[data-shelf="collection"]');
    await page.waitForSelector('[data-screen="collection"]');
    await shot(page, variant, '13-collection');
    await context.close();

    // The heavy learner: the same records and about 350 more videos from the pool.
    {
      const { context, page } = await open(variant);
      await page.goto(URL);
      await page.waitForFunction(() => !!window.render_game_to_text);
      await seedWithRetry(page, seed);
      console.log('heavy', JSON.stringify(await page.evaluate(seedHeavy)));
      await lab(page);
      await page.waitForFunction(() => document.querySelectorAll('.le-row').length >= 8);
      await shot(page, variant, '14-heavy-home');
      await page.click('[data-action="le-index"]');
      await page.waitForSelector('[data-screen="index"]');
      await shot(page, variant, '15-heavy-index');
      await page.click('[data-action="le-back"]');
      await page.click('[data-chip="book"]');
      if (await page.getAttribute('[data-action="le-sort"]', 'data-sort') !== 'az') await page.click('[data-action="le-sort"]');
      await shot(page, variant, '16-heavy-books-az');
      await context.close();
    }
  }
  if (errors.length) console.log(`page errors:\n${errors.join('\n')}`);
} finally {
  for (const browser of browsers.values()) await browser.close();
  reader?.kill();
}
