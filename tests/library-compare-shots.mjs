// The Library prototypes side by side, for choosing between them: The Logbook, Your Library, The Edition,
// Exhibitions and The Mosaic, each at its home and one level deeper (the Evolution field, where each one
// opens a field), on a phone: WebKit at 375×812 with an iPhone's user agent, touch and insets (59 px top,
// 34 px bottom). Every prototype reads the same heavy learner: tests/library-f-seed.mjs's `seed` then
// `seedHeavy` (about ten months: books and films, every reel in the deck kept, a few hundred Watch videos
// across eighteen fields, notes and questions, six places proved, four collections), written once through
// the app's own stores and copied whole into each prototype's fresh page.
//
//   MOK_URL=http://127.0.0.1:5287 node tests/library-compare-shots.mjs
//
// Writes output/library-compare/<id>-home.png, <id>-deeper.png and round2.png (the sheet).
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { seed, seedHeavy } from './library-f-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5287';
const OUT = path.resolve('output/library-compare');
const SHEET = path.join(OUT, process.env.MOK_SHEET || 'round2.png');
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const INSETS = ':root{--safe-top:59px!important;--safe-bottom:34px!important}';
const EVOLUTION = 'knowledge.science.biology.evolution';
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

/** Clicks the first selector that is on the page; returns which one, or throws. */
async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    const target = page.locator(selector).first();
    if (await target.count()) { await target.scrollIntoViewIfNeeded().catch(() => {}); await target.click(); return selector; }
  }
  throw new Error(`none of ${selectors.join(' | ')} is on the page`);
}

// Each prototype: its address, what its home waits for, and how it opens one level deeper.
const PROTOTYPES = [
  {
    id: 'd', name: 'The Logbook', lab: 'library-d',
    home: page => page.waitForFunction(() => document.querySelectorAll('.ld-e.is-thing').length >= 8, null, { timeout: 30000 }),
    deeper: async page => {
      await page.click('[data-tab="places"]');
      await page.waitForSelector('[data-index]');
      const opened = await clickFirst(page, [`[data-place-row="${EVOLUTION}"]`, '[data-place-row]']);
      await page.waitForSelector('[data-screen="place"]');
      await page.evaluate(() => document.querySelector('.ld-scroll')?.scrollTo(0, 0));
      return opened;
    },
  },
  {
    id: 'e', name: 'Your Library', note: '(Spotify / Apple Music pattern)', lab: 'library-e',
    home: page => page.waitForFunction(() => document.querySelectorAll('.le-row').length >= 8, null, { timeout: 30000 }),
    deeper: async page => {
      await page.click('[data-action="le-index"]');
      await page.waitForSelector('[data-screen="index"]');
      const opened = await clickFirst(page, [`.le-inside [data-place="${EVOLUTION}"]`, `[data-place="${EVOLUTION}"]`, '.le-inside [data-place]']);
      await page.waitForSelector('[data-screen="place"]');
      await page.evaluate(() => document.querySelector('.le-scroll')?.scrollTo(0, 0));
      return opened;
    },
  },
  {
    id: 'f', name: 'The Edition', lab: 'library-f',
    home: page => page.waitForSelector('[data-section]', { timeout: 30000 }),
    deeper: async page => {
      await page.click('[data-action="ed-index"]');
      await page.waitForSelector('[data-screen="index"]');
      const opened = await clickFirst(page, [`[data-index="${EVOLUTION}"]`, '[data-index="knowledge.science.biology.genetics-genomes"]', '[data-index]']);
      await page.waitForSelector('[data-screen="shelf"]');
      await page.evaluate(() => document.querySelector('.ed-scroll')?.scrollTo(0, 0));
      return opened;
    },
  },
  {
    id: 'a', name: 'Exhibitions', lab: 'library-a',
    home: page => page.waitForSelector('.lxa-card', { timeout: 30000 }),
    deeper: async page => {
      const opened = await clickFirst(page, [`[data-exhibition="field:${EVOLUTION}"]`, `[data-exhibition="around:${EVOLUTION}"]`, '.lxa-card.is-lead', '[data-action="open-exhibition"]']);
      await page.waitForSelector('[data-page="exhibition"]');
      await page.evaluate(() => { scrollTo(0, 0); document.querySelector('[data-lab="library-a"]')?.scrollTo?.(0, 0); });
      return opened;
    },
  },
  {
    id: 'c', name: 'The Mosaic', lab: 'library-c',
    home: page => page.waitForSelector('[data-lab="library-c"] [data-tile]', { timeout: 30000 }),
    deeper: async page => {
      const opened = await clickFirst(page, [`[data-tile="${EVOLUTION}"]`, '.lc-tile']);
      await page.waitForSelector('[data-screen="area"] [data-tile]');
      await page.waitForTimeout(700);
      return opened;
    },
  },
].filter(p => !process.env.MOK_ONLY || process.env.MOK_ONLY.split(',').includes(p.id));

const wk = await webkit.launch({ headless: true });
const errors = [];
async function phone(records = null) {
  const context = await wk.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA });
  await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, INSETS);
  // The seeded records, put in place once, before the app's first read; later writes by the page stand.
  if (records) await context.addInitScript(entries => { if (!sessionStorage.getItem('compare-seeded')) { localStorage.clear(); for (const [key, value] of entries) localStorage.setItem(key, value); sessionStorage.setItem('compare-seeded', '1'); } }, records);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}
const settle = async page => {
  await page.waitForFunction(() => [...document.querySelectorAll('[data-lab] img')].filter(img => { const r = img.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 0; }).every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
};

const shots = [];
try {
  // The learner, written once.
  let records;
  {
    const { context, page } = await phone();
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text, null, { timeout: 30000 });
    console.log('seeded', JSON.stringify(await page.evaluate(seed)));
    console.log('heavy', JSON.stringify(await page.evaluate(seedHeavy)));
    records = await page.evaluate(() => Object.entries(localStorage));
    await context.close();
  }
  for (const prototype of PROTOTYPES) {
    const { context, page } = await phone(records);
    const lab = `${URL}/#/lab/${prototype.lab}`;
    // A hash-only change never reloads, so the first load settles and the page is loaded again.
    await page.goto(lab);
    await page.waitForSelector(`[data-lab="${prototype.lab}"]`, { timeout: 30000 });
    await page.waitForTimeout(900);
    await page.reload();
    await page.waitForSelector(`[data-lab="${prototype.lab}"]`, { timeout: 30000 });
    await prototype.home(page);
    await settle(page);
    const home = path.join(OUT, `${prototype.id}-home.png`);
    await page.screenshot({ path: home });
    const opened = await prototype.deeper(page);
    await settle(page);
    const deeper = path.join(OUT, `${prototype.id}-deeper.png`);
    await page.screenshot({ path: deeper });
    console.log(`${prototype.name}: home, then ${opened}`);
    shots.push({ ...prototype, home, deeper });
    await context.close();
  }
} finally {
  await wk.close();
  reader?.kill();
}

// The sheet: the three new ones on top, Exhibitions and the Mosaic below, each name in large type.
const uri = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
const blocks = await Promise.all(shots.map(async s => `<section><h2>${s.name}${s.note ? ` <small>${s.note}</small>` : ''}</h2><div class="pair"><img src="${await uri(s.home)}"><img src="${await uri(s.deeper)}"></div></section>`));
const rows = [blocks.slice(0, 3), blocks.slice(3)].filter(r => r.length).map(r => `<div class="row">${r.join('')}</div>`).join('');
const cr = await chromium.launch({ headless: true });
try {
  const page = await cr.newPage({ viewport: { width: 2430, height: 1000 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#0c0c0d;color:#efece6}
    body{padding:28px 24px 36px;font-family:"Iowan Old Style","Palatino Linotype",Georgia,serif}
    .row{display:flex;gap:48px;margin-bottom:40px}
    h2{font-weight:400;font-size:46px;letter-spacing:-0.01em;margin:0 0 18px;white-space:nowrap}
    h2 small{font-size:24px;color:#a9a49b}
    .pair{display:flex;gap:12px}
    img{width:375px;height:812px;display:block;border-radius:6px;background:#000}
  </style>${rows}`);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: SHEET, fullPage: true });
  console.log(`sheet ${SHEET}`);
} finally {
  await cr.close();
}
if (errors.length) { console.log(`page errors:\n${errors.join('\n')}`); process.exitCode = 1; }
