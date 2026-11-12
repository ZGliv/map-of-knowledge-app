// Prototype F of the Library, the Edition (#/lab/library-f): screenshots on a phone (WebKit, 375×812,
// an iPhone's user agent, touch and its 59/34 px insets) and a desktop (Chromium, 1440×900), for an
// empty learner, three things kept, the learner a few months in and the same learner ten months on, after ten
// busy days of Watch saves (tests/library-f-seed.mjs). Full-length captures are taken at 1× in a viewport as tall as the page.
//
//   MOK_URL=http://127.0.0.1:5283 node tests/library-f-shots.mjs
//
// Writes output/library-f/*.png and prints each page's height. Network: what the seed and the app
// fetch (Open Library, Wikidata, Wikipedia through the link reader, YouTube thumbnails, Wikimedia).
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { seed, seedHeavy, seedRecent, seedThree } from './library-f-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5283';
const LAB = `${URL}/#/lab/library-f`;
const OUT = path.resolve('output/library-f');
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const INSETS = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const wk = await webkit.launch({ headless: true });
const cr = await chromium.launch({ headless: true });
const VARIANTS = [
  { name: 'phone', browser: wk, viewport: { width: 375, height: 812 }, mobile: true },
  { name: 'desktop', browser: cr, viewport: { width: 1440, height: 900 }, mobile: false },
].filter(v => !process.env.MOK_VARIANTS || process.env.MOK_VARIANTS.split(',').includes(v.name));
const report = [];

async function open(variant, scale = 2) {
  const context = await variant.browser.newContext({ viewport: variant.viewport, deviceScaleFactor: scale, isMobile: variant.mobile, hasTouch: variant.mobile, ...(variant.mobile ? { userAgent: IPHONE_UA } : {}) });
  if (variant.mobile) await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, INSETS);
  const page = await context.newPage();
  page.on('pageerror', error => console.log(`  page error: ${error.message}`));
  return { context, page };
}
const settle = async page => {
  await page.evaluate(async () => {
    const scroller = document.querySelector('.ed-scroll');
    // Lazy images below the fold load as the page passes them.
    if (scroller) { for (let y = 0; y < scroller.scrollHeight; y += 600) { scroller.scrollTop = y; await new Promise(r => setTimeout(r, 40)); } scroller.scrollTop = 0; }
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.ed img')].every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
};
// The first load settles before the reload, so no module import is cut off half way.
const lab = async page => {
  await page.goto(LAB);
  await page.waitForSelector('[data-lab="library-f"] [data-screen]', { timeout: 30000 });
  await page.reload();
  await page.waitForSelector('[data-lab="library-f"] [data-screen]', { timeout: 30000 });
};
/** `full` reaches the same screen again in a page as tall as it, at 1×, holding the same records. */
async function shot(page, variant, name, { full = null } = {}) {
  await settle(page);
  await page.screenshot({ path: path.join(OUT, `${variant.name}-${name}.png`) });
  const height = await page.$eval('.ed-page', el => Math.round(el.getBoundingClientRect().height)).catch(() => 0);
  report.push({ shot: `${variant.name}-${name}`, height });
  console.log(`shot ${variant.name}-${name} (${height}px)`);
  if (!full) return;
  const records = await page.evaluate(() => Object.entries(localStorage));
  const { context, page: tall } = await open(variant, 1);
  await context.addInitScript(entries => { if (!sessionStorage.getItem('shots-seeded')) { for (const [key, value] of entries) localStorage.setItem(key, value); sessionStorage.setItem('shots-seeded', '1'); } }, records);
  await tall.goto(LAB);
  await tall.waitForSelector('[data-lab="library-f"] [data-screen]');
  await full(tall);
  const total = await tall.evaluate(() => document.querySelector('.ed-scroll').scrollHeight);
  await tall.setViewportSize({ width: variant.viewport.width, height: Math.min(16000, total + 20) });
  await settle(tall);
  await tall.addStyleTag({ content: '.studio-mobile-nav{display:none!important}' });
  await tall.screenshot({ path: path.join(OUT, `${variant.name}-${name}-full.png`) });
  await context.close();
}
const atHome = async page => { await page.waitForSelector('[data-screen="home"]'); };
const atIndex = async page => { await page.click('[data-action="ed-index"]'); await page.waitForSelector('[data-screen="index"]'); };
const atField = async page => { await atIndex(page); await page.click('[data-index="knowledge.science.biology.genetics-genomes"]'); await page.waitForSelector('[data-screen="shelf"]'); };
const atCollection = async page => { await page.locator('[data-collection]').first().click(); await page.waitForSelector('[data-screen="collection"]'); };

try {
  for (const variant of VARIANTS) {
    const phone = variant.mobile;
    {
      const { context, page } = await open(variant);
      await lab(page);
      await shot(page, variant, '01-empty');
      await page.evaluate(seedThree);
      await lab(page);
      await page.waitForSelector('[data-lead]');
      await shot(page, variant, '02-three', { full: phone ? atHome : null });
      await context.close();
    }
    const { context, page } = await open(variant);
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    console.log('seeded', JSON.stringify(await page.evaluate(seed)));
    await lab(page);
    await page.waitForSelector('[data-section]');
    await page.waitForFunction(() => document.querySelectorAll('[data-refresh]').length >= 1, null, { timeout: 20000 }).catch(() => {});
    await shot(page, variant, '03-home', { full: atHome });
    if (phone) {
      await page.evaluate(() => { const s = document.querySelector('.ed-scroll'); const el = document.querySelector('.ed-pair'); s.scrollTo(0, el.getBoundingClientRect().top + s.scrollTop - 110); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${variant.name}-04-contents.png`) });
      await page.evaluate(() => { const s = document.querySelector('.ed-scroll'); const el = document.querySelector('[data-section]'); s.scrollTo(0, el.getBoundingClientRect().top + s.scrollTop - 110); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${variant.name}-05-section.png`) });
      await page.evaluate(() => document.querySelector('.ed-scroll').scrollTo(0, 0));
    }
    await page.fill('[data-action="ed-search"]', 'gene');
    await page.waitForSelector('[data-results]');
    await shot(page, variant, '06-search-gene');
    await page.fill('[data-action="ed-search"]', '');
    await page.click('[data-action="ed-index"]');
    await page.waitForSelector('[data-screen="index"]');
    await shot(page, variant, '07-index', { full: phone ? atIndex : null });
    await page.click('[data-index="knowledge.science.biology.genetics-genomes"]');
    await page.waitForSelector('[data-screen="shelf"]');
    await shot(page, variant, '08-field', { full: phone ? atField : null });
    await page.click('[data-action="ed-back"]');
    await page.click('[data-action="ed-back"]');
    await page.waitForSelector('[data-screen="home"]');
    await page.locator('[data-collection]').first().click();
    await page.waitForSelector('[data-screen="collection"]');
    await shot(page, variant, '09-collection', { full: phone ? atCollection : null });
    await page.click('[data-action="ed-back"]');
    console.log('heavy', JSON.stringify(await page.evaluate(seedHeavy)), JSON.stringify(await page.evaluate(seedRecent)));
    await lab(page);
    await page.waitForSelector('[data-section]');
    await shot(page, variant, '10-heavy', { full: atHome });
    await context.close();
  }
  console.log(JSON.stringify(report));
} finally {
  await wk.close();
  await cr.close();
  reader?.kill();
}
