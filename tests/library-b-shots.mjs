// Prototype B, "The Index" (#/lab/library-b), photographed at 375×812 (an iPhone's insets stood in, as
// tests/chrome-clearance.mjs does) and at 1440×900: an empty library, then a learner a few months in,
// seeded into the real stores by tests/library-b-seed.mjs. The seeded storage is kept in
// output/library-b/seed-storage.json and reused (MOK_RESEED=1 seeds again). Network: openlibrary.org,
// wikidata.org, i.ytimg.com, Wikimedia, and /api/unfurl (started on 5191 if it is not running).
//
//   MOK_URL=http://127.0.0.1:5238 node tests/library-b-shots.mjs
//
// Writes output/library-b/*.png and output/library-b/contact-sheet.png; fails on page errors.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { seedLearner } from './library-b-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5238';
const OUT = path.resolve('output/library-b');
const SNAPSHOT = path.join(OUT, 'seed-storage.json');
const LAB = '#/lab/library-b';
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

// Covers and stills, kept on disk between runs: Open Library's cover server limits how often one
// address may ask, and a run asks for every cover several times.
const CACHE = path.join(OUT, '_images');
await mkdir(CACHE, { recursive: true });
async function cachedImage(route) {
  const url = route.request().url();
  const file = path.join(CACHE, createHash('sha1').update(url).digest('hex'));
  if (existsSync(file)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: await readFile(file) });
  try {
    const response = await route.fetch({ timeout: 20000 });
    const body = await response.body();
    if (response.ok() && body.length > 200) await writeFile(file, body);
    return route.fulfill({ response, body });
  } catch { return route.abort(); }
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const VARIANTS = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true, insets: { top: 59, bottom: 34 } },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
];
const shots = [];
const insetCss = ({ top = 0, bottom = 0 }) => `:root{--safe-top:${top}px!important;--safe-bottom:${bottom}px!important}`;

async function open(variant, storage) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 2, isMobile: variant.mobile, hasTouch: variant.mobile });
  if (variant.insets) await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss(variant.insets));
  if (storage) await context.addInitScript(data => { if (sessionStorage.getItem('lbx-seeded')) return; for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value); sessionStorage.setItem('lbx-seeded', '1'); }, storage);
  for (const host of ['https://covers.openlibrary.org/**', 'https://upload.wikimedia.org/**', 'https://i.ytimg.com/**']) await context.route(host, cachedImage);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|502|ERR_|status of 4/.test(message.text())) errors.push(`${variant.name}: ${message.text()}`); });
  await page.goto(`${URL}/${LAB}`);
  await page.waitForSelector('[data-lab="library-b"]', { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
const settle = page => page.waitForFunction(() => [...document.querySelectorAll('.lbx img, .lib-sheet img')].filter(img => img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0).every(img => img.complete), null, { timeout: 15000 }).catch(() => {});
async function shot(page, variant, name, title) {
  await settle(page);
  await page.waitForTimeout(500);
  const file = path.join(OUT, `${variant.name}-${name}.png`);
  await page.screenshot({ path: file });
  shots.push({ file, title, variant: variant.name });
  console.log(`shot ${variant.name}-${name}`);
}
const scroller = page => page.locator('.studio-main>.notebook-workspace');
const scrollTo = (page, selector, offset = 0) => page.evaluate(([sel, off]) => {
  const box = document.querySelector('.studio-main>.notebook-workspace');
  const target = document.querySelector(sel);
  if (!box || !target) return false;
  box.scrollTop = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - off;
  return true;
}, [selector, offset]);

// 1. Seed once, through the app's own code, and keep the storage.
let storage = null;
if (existsSync(SNAPSHOT) && !process.env.MOK_RESEED) storage = JSON.parse(await readFile(SNAPSHOT, 'utf8'));
else {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`seed: ${error.message}`));
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  const report = await page.evaluate(seedLearner);
  console.log('seeded', JSON.stringify(report));
  storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('mok')).map(key => [key, localStorage.getItem(key)])));
  await writeFile(SNAPSHOT, JSON.stringify(storage));
  await context.close();
}


try {
  for (const variant of VARIANTS) {
    const top = variant.mobile ? 128 : 76;
    // An empty library: the whole book, its chapters unwritten.
    {
      const { context, page } = await open(variant, null);
      assert.equal(await page.locator('[data-lbx-chapter]').count(), 0, 'An empty library has no chapters');
      assert.equal(await page.locator('.lbx-contents li.is-blank').count(), 8, 'An empty library lists all eight territories, unwritten');
      assert.equal(await page.getByText('Evolution').count(), 0, 'An empty library never defaults to Evolution');
      await shot(page, variant, '01-empty', 'Empty: the whole book, unwritten');
      await context.close();
    }
    // A few things, far from any lesson: each section still ends, saying plainly there is none yet.
    {
      const { context, page } = await open(variant, null);
      await page.evaluate(async () => {
        const store = await import('/src/notebook/libraryStore.ts');
        let library = store.loadLibrary().data;
        library = store.saveLink(library, { url: 'https://en.wikipedia.org/wiki/Inflation', note: 'Why prices creep up', nodeId: 'knowledge.economics.money' });
        library = store.saveLink(library, { url: 'https://en.wikipedia.org/wiki/Plate_tectonics', note: 'The ground under us moves', nodeId: 'knowledge.earth.geology' });
        const problem = store.saveLibrary(library);
        if (problem) throw new Error(problem);
      });
      await page.reload();
      await page.waitForSelector('[data-lbx-chapter]');
      await page.waitForSelector('[data-lbx-proof="none"]');
      assert.deepEqual(await page.locator('[data-lbx-chapter]').evaluateAll(list => list.map(el => el.dataset.lbxChapter)), ['knowledge.earth', 'knowledge.economics']);
      assert.equal(await page.getByText('Evolution').count(), 0, 'A few things elsewhere never bring in Evolution');
      if (variant.mobile) await scrollTo(page, '[data-lbx-chapter="knowledge.earth"]', top);
      await shot(page, variant, '01b-few', 'A few things, far from any lesson: each section ends saying so');
      await context.close();
    }
    const { context, page } = await open(variant, storage);
    await page.waitForSelector('[data-lbx-chapter]');
    await shot(page, variant, '02-index', 'The index: Recent, then the contents');
    if (variant.mobile) {
      await scrollTo(page, '[data-lbx-chapter="knowledge.science"]', top);
      await shot(page, variant, '03-chapter', 'Chapter 1, Science: sections, entries, marks');
      await scrollTo(page, '[data-lbx-entry="knowledge.science.biology.evolution.deep-time"]', top);
      await shot(page, variant, '04-browse', 'Browsing: each entry ends in its proof');
      await scrollTo(page, '[data-lbx-chapter="knowledge.arts"]', top);
      await shot(page, variant, '05-browse-arts', 'Further on: Humanities and Arts');
    } else {
      await scrollTo(page, '[data-lbx-chapter="knowledge.science"]', top);
      await shot(page, variant, '03-chapter', 'Desktop: the index beside its contents');
    }
    // Search filters the index as you type.
    await scroller(page).evaluate(box => { box.scrollTop = 0; });
    await page.fill('[data-action="lbx-search"]', 'finch');
    await page.waitForSelector('.lbx-found');
    if (variant.mobile) await shot(page, variant, '06-search', 'Search "finch": the index, filtered live');
    await page.fill('[data-action="lbx-search"]', '');
    // A place's page.
    await scrollTo(page, '[data-lbx-entry="knowledge.science.biology.evolution.natural-selection"]', top);
    await page.click('[data-lbx-entry="knowledge.science.biology.evolution.natural-selection"]');
    await page.waitForSelector('[data-lbx-place="knowledge.science.biology.evolution.natural-selection"]');
    await page.waitForTimeout(400);
    await shot(page, variant, '07-place', 'A place: Natural selection');
    if (variant.mobile) {
      await scrollTo(page, '.lbx-place-body', top);
      await shot(page, variant, '08-place-kept', 'Kept here, each with its path');
      await scrollTo(page, '.lbx-notes', top);
      await shot(page, variant, '09-place-notes', 'Notes, then Watch and Reels');
    }
    // A field's page: its part of the index inside.
    await page.click('.lbx-crumbs button:nth-child(3)');
    await page.waitForSelector('[data-lbx-place="knowledge.science.biology"]');
    if (variant.mobile) { await scrollTo(page, '.lbx-part.is-inside', top); await shot(page, variant, '10-field', 'A field, Biology: its part of the index'); }
    else await shot(page, variant, '10-field', 'Desktop: a field, Biology');
    // A territory: the whole map, its own land lit. And one with nothing kept and no lesson yet.
    await page.click('.lbx-crumbs button:nth-child(2)');
    await page.waitForSelector('[data-lbx-place="knowledge.science"]');
    await scroller(page).evaluate(box => { box.scrollTop = 0; });
    await shot(page, variant, '10b-territory', 'A territory, Science, on the whole map');
    await page.evaluate(() => { location.hash = '#/lab/library-b/place/knowledge.technology'; });
    await page.waitForSelector('[data-lbx-place="knowledge.technology"] [data-lbx-proof="none"]');
    if (variant.mobile) await shot(page, variant, '10c-blank', 'Technology: nothing kept, no lesson yet');
    await page.goBack();
    await page.waitForSelector('[data-lbx-place="knowledge.science"]');
    // An item: the Library's own item sheet.
    await page.click('[data-action="lbx-back"]');
    await page.waitForSelector('[data-lbx-page="index"]');
    await scrollTo(page, '[data-lbx-entry="knowledge.science.biology.evolution.natural-selection"]', top + 40);
    const finch = page.locator('[data-lbx-item][aria-label*="beak of the finch" i]').first();
    await finch.waitFor();
    await finch.click();
    await page.waitForSelector('[data-item-sheet]');
    await shot(page, variant, '11-item', 'An item: the Library\'s own sheet');
    await page.keyboard.press('Escape');
    // Adding: the Library's own + sheet, starting from the Recent row.
    await scroller(page).evaluate(box => { box.scrollTop = 0; });
    await page.click('[data-action="lbx-add"]');
    await page.waitForSelector('[data-add-sheet]');
    await page.keyboard.type('Gödel, Escher, Bach');
    await page.waitForSelector('[data-found]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await shot(page, variant, '12-add', 'Adding through the + at the head of Recent');
    await page.keyboard.press('Escape');
    // Scale: 520 more links, saved through the library's own code, on top of the learner's 140 things.
    if (variant.mobile) {
      await page.evaluate(async () => {
        const store = await import('/src/notebook/libraryStore.ts');
        const { catalog } = await import('/src/core/catalog.ts');
        const places = catalog.all().filter(node => node.depth >= 2 && node.depth <= 4 && !node.sample).map(node => node.id).slice(0, 90);
        let library = store.loadLibrary().data;
        for (let i = 0; i < 520; i++) library = store.saveLink(library, { url: `https://example.org/reading/${i}`, note: `Reading note ${i}`, nodeId: places[i % places.length] });
        const problem = store.saveLibrary(library);
        if (problem) throw new Error(problem);
      });
      await page.reload();
      await page.waitForSelector('[data-lbx-chapter]');
      await page.click('[data-action="open-explore-mobile"]').catch(() => {});
      await page.click('.studio-mobile-nav button:first-child');
      await page.waitForTimeout(600);
      const opened = await page.evaluate(async () => {
        const started = performance.now();
        document.querySelector('[data-action="open-notebook-mobile"]').click();
        while (!document.querySelector('[data-lbx-chapter]')) await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
        return performance.now() - started;
      });
      const things = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1')).links.length);
      const drawn = await page.locator('[data-lbx-row="drawn"]').count();
      const waiting = await page.locator('[data-lbx-row="waiting"]').count();
      const typed = await page.evaluate(async () => {
        const input = document.querySelector('[data-action="lbx-search"]');
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        const started = performance.now();
        set.call(input, 'reading 42'); input.dispatchEvent(new Event('input', { bubbles: true }));
        while (!document.querySelector('.lbx-found')) await new Promise(r => requestAnimationFrame(r));
        return [performance.now() - started, document.querySelector('.lbx-found').textContent];
      });
      console.log(`scale: ${things} links + the rest; Library opened in ${Math.round(opened)} ms, ${drawn} rows drawn and ${waiting} waiting; search in ${Math.round(typed[0])} ms (${typed[1]})`);
      assert.ok(opened < 2500, `The index opens in under 2.5 s at this size (took ${Math.round(opened)} ms)`);
      assert.ok(waiting > drawn, 'Rows far from the screen wait to be drawn');
      await page.fill('[data-action="lbx-search"]', '');
      await scrollTo(page, '[data-lbx-chapter="knowledge.humanities"]', top);
      await shot(page, variant, '13-scale', null);
    }
    await context.close();
  }

  // The contact sheet.
  const phone = shots.filter(s => s.variant === 'phone' && s.title), desktop = shots.filter(s => s.variant === 'desktop' && s.title);
  const img = async s => `data:image/png;base64,${(await readFile(s.file)).toString('base64')}`;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#05060c;color:#ece5d6;font:14px Georgia,serif;padding:48px}h1{font-weight:400;font-size:40px;margin:0 0 6px}p.s{color:#8e887b;margin:0 0 36px;font-style:italic}
  .g{display:grid;grid-template-columns:repeat(6,1fr);gap:28px 22px}.d{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:44px}figure{margin:0}img{width:100%;display:block;border-radius:14px;box-shadow:0 0 0 1px #ffffff14}
  .d img{border-radius:8px}figcaption{margin-top:10px;font-size:13px;color:#bdb6a6;line-height:1.35}</style>
  <h1>Library · The Index</h1><p class="s">Prototype B · #/lab/library-b · 375×812 and 1440×900</p>
  <div class="g">${(await Promise.all(phone.map(async s => `<figure><img src="${await img(s)}"><figcaption>${s.title}</figcaption></figure>`))).join('')}</div>
  <div class="d">${(await Promise.all(desktop.map(async s => `<figure><img src="${await img(s)}"><figcaption>${s.title}</figcaption></figure>`))).join('')}</div>`;
  const context = await browser.newContext({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'contact-sheet.png'), fullPage: true });
  await context.close();
  console.log(`contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
  assert.deepEqual(errors, [], `Page errors:\n${errors.join('\n')}`);
} finally {
  await browser.close();
  reader?.kill();
}
