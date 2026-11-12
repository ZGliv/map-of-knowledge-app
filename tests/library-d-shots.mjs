// Prototype D of the Library, the Logbook (#/lab/library-d): screenshots on a phone (WebKit at 375×812, an
// iPhone's user agent, touch and insets) and a desktop (Chromium at 1440×900), for an empty learner, a learner
// three things in, and the heavy learner of tests/library-d-seed.mjs.
//
//   MOK_URL=http://127.0.0.1:5281 node tests/library-d-shots.mjs
//
// Writes output/library-d/*.png. Network: openlibrary.org, wikidata.org, i.ytimg.com, upload.wikimedia.org and
// the Wikipedia pages read by the link reader (scripts/unfurl-server.mjs on 5191, started here if it is not up).
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices, webkit } from 'playwright';
import { addYear, firstThree, seed } from './library-d-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5281';
const LAB = `${URL}/#/lab/library-d`;
const OUT = path.resolve('output/library-d');
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const VARIANTS = [
  { name: 'phone', engine: webkit, options: { ...devices['iPhone X'], deviceScaleFactor: 2 }, insets: true },
  { name: 'desktop', engine: chromium, options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
].filter(v => !process.env.MOK_VARIANTS || process.env.MOK_VARIANTS.split(',').includes(v.name));
const insetCss = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';
const errors = [];
const browsers = new Map();
let last = 'start';

async function open(variant) {
  if (!browsers.has(variant.engine)) browsers.set(variant.engine, await variant.engine.launch({ headless: true }));
  const context = await browsers.get(variant.engine).newContext(variant.options);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name} after ${last}: ${error.message}`));
  if (variant.insets) await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss);
  return { context, page };
}
const settle = async page => {
  await page.waitForFunction(() => [...document.querySelectorAll('.ld img')].filter(img => img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0).every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
};
async function shot(page, variant, name) {
  await settle(page);
  await page.screenshot({ path: path.join(OUT, `${variant.name}-${name}.png`) });
  console.log(`shot ${variant.name}-${name}`);
  last = `${variant.name}-${name}`;
}
// A hash-only change never reloads, so the page is reloaded to read what was just seeded; the first load
// settles before the reload, so no module import is cut off mid-flight.
const lab = async page => {
  await page.goto(LAB);
  await page.waitForSelector('[data-lab="library-d"] [data-screen]', { timeout: 30000 });
  await page.reload();
  await page.waitForSelector('[data-lab="library-d"] [data-screen]', { timeout: 30000 });
};
const scrollTo = (page, selector, offset = 120) => page.evaluate(([s, o]) => { const scroller = document.querySelector('.ld-scroll'); const el = document.querySelector(s); if (scroller && el) scroller.scrollTo(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - o); }, [selector, offset]);
const top = page => page.evaluate(() => document.querySelector('.ld-scroll')?.scrollTo(0, 0));

try {
  for (const variant of VARIANTS) {
    const phone = variant.name === 'phone';
    {
      const { context, page } = await open(variant);
      await lab(page);
      await shot(page, variant, '01-empty');
      await page.evaluate(firstThree);
      await lab(page);
      await page.waitForFunction(() => document.querySelectorAll('.ld-e.is-thing').length === 3);
      await shot(page, variant, '02-three');
      await context.close();
    }
    const { context, page } = await open(variant);
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(seed);
    await page.evaluate(addYear);
    await lab(page);
    await page.waitForFunction(() => document.querySelectorAll('.ld-e.is-thing').length >= 8);
    await shot(page, variant, '03-home');
    if (phone) {
      await page.evaluate(() => document.querySelector('.ld-scroll').scrollTo(0, 1500));
      await shot(page, variant, '04-scrolled');
      await page.click('[data-action="ld-month-pill"]');
      await page.waitForSelector('[data-sheet="months"]');
      await shot(page, variant, '05-months');
      await page.keyboard.press('Escape');
      await scrollTo(page, '[data-folded]', 260);
      await shot(page, variant, '06-folded');
      await top(page);
      await page.click('[data-tab="places"]');
      await page.waitForSelector('[data-index]');
      await shot(page, variant, '07-places');
      await scrollTo(page, '[data-place-row="knowledge.science.biology.evolution"]', 130);
      await shot(page, variant, '08-places-evolution');
      await page.click('[data-place-row="knowledge.science.biology.evolution.natural-selection"]');
    } else {
      await scrollTo(page, '[data-folded]', 200);
      await shot(page, variant, '04-folded');
      await top(page);
      await page.click('.ld-side [data-place-row="knowledge.science.biology.evolution.natural-selection"]');
    }
    await page.waitForSelector('[data-screen="place"]');
    await shot(page, variant, phone ? '09-place' : '05-place');
    await page.click('[data-action="ld-back"]');
    // A field, with its places and its own record; a collection.
    if (phone) await page.click('[data-place-row="knowledge.science.biology.evolution"]');
    else await page.click('.ld-side [data-place-row="knowledge.science.biology.evolution"]');
    await page.waitForSelector('[data-screen="place"][data-place="knowledge.science.biology.evolution"]');
    await shot(page, variant, phone ? '11-field' : '07-field');
    await page.click('[data-action="ld-back"]');
    if (phone) { await page.click('[data-tab="collections"]'); await shot(page, variant, '12-collections'); }
    await page.click('[data-collection]');
    await page.waitForSelector('[data-screen="collection"]');
    await shot(page, variant, phone ? '13-collection' : '08-collection');
    await page.click('[data-action="ld-back"]');
    if (phone) { await page.click('[data-tab="all"]'); await page.click('[data-action="open-search"]'); } else await page.click('[data-action="ld-search"]');
    await page.keyboard.type('gene');
    await page.waitForSelector('[data-results] [data-row]');
    await page.evaluate(() => document.activeElement?.blur());
    await shot(page, variant, phone ? '10-search' : '06-search');
    if (!phone) {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.click('.ld-clear');
      await top(page);
      await shot(page, variant, '09-narrow');
    }
    await context.close();
  }
  if (errors.length) console.log(`page errors:\n${errors.join('\n')}`);
} finally {
  for (const browser of browsers.values()) await browser.close();
  reader?.kill();
}
