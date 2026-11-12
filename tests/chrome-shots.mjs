// App chrome stills: the top bar, tab bar, menu, search and pages around the map, at phone and desktop size.
//
//   MOK_URL=http://127.0.0.1:5212 MOK_OUT=output/chrome/after node tests/chrome-shots.mjs
//   MOK_SIZES=phone  MOK_SHOTS=world,menu                       (subsets)
//   MOK_QUERY=?learning=1                                        (appended to the URL)
//   MOK_INSETS=59,34                                             (an iPhone's status bar and home indicator, top,bottom)
//   MOK_SHEET="before:output/chrome/before,after:output/chrome/after" node tests/chrome-shots.mjs
//     (no capture: one contact sheet of phone stills, a row per labelled folder)
//
// Every shot starts from a fresh context with the same saved progress and notebook.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5212';
const OUTPUT = path.resolve(process.env.MOK_OUT || 'output/chrome/after');
const QUERY = process.env.MOK_QUERY || '';
const EVOLUTION = 'knowledge.science.biology.evolution';
const SIZES = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true },
  { name: 'iphone', viewport: { width: 393, height: 852 }, mobile: true },
  { name: 'iphone-max', viewport: { width: 430, height: 932 }, mobile: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
].filter(size => process.env.MOK_SIZES ? process.env.MOK_SIZES.split(',').includes(size.name) : ['phone', 'desktop'].includes(size.name));
// Chromium reports env(safe-area-inset-*) as 0; this stands in an iPhone's insets through the --safe-* variables.
const [INSET_TOP = 0, INSET_BOTTOM = 0] = (process.env.MOK_INSETS || '').split(',').filter(Boolean).map(Number);
const INSET_CSS = INSET_TOP || INSET_BOTTOM ? `:root{--safe-top:${INSET_TOP}px!important;--safe-bottom:${INSET_BOTTOM}px!important}` : '';
const PROGRESS = [
  'knowledge.science.chemistry',
  'knowledge.arts.architecture',
  'knowledge.economics.money',
  'knowledge.earth.oceans',
  'knowledge.humanities.philosophy',
  'knowledge.science.biology.evolution.natural-selection',
  'knowledge.mathematics.foundations.unit-path.real-numbers',
];
const day = '2026-10-14T18:20:00.000Z';
const NOTEBOOK = { version: 1, entries: [
  { id: 'n1', title: 'Selection needs variation first', body: 'Natural selection only sorts what is already there. Without heritable variation there is nothing to choose between.', sourceUrl: '', sourceLabel: 'Evolution lecture, week 3', kind: 'idea', evidence: 'explained', nodeIds: [`${EVOLUTION}.natural-selection`], createdAt: day, updatedAt: day },
  { id: 'n2', title: 'Why is money trusted at all?', body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: ['knowledge.economics.money'], createdAt: day, updatedAt: day },
  { id: 'n3', title: 'Oceans store most of the heat', body: 'Water holds far more heat than air, so the oceans carry most of the warming.', sourceUrl: '', sourceLabel: '', kind: 'idea', evidence: 'encountered', nodeIds: ['knowledge.earth.oceans'], createdAt: day, updatedAt: day },
] };
const ALL_SHOTS = [
  { name: 'world', location: 'knowledge' },
  { name: 'evolution', location: EVOLUTION },
  { name: 'deep', location: 'knowledge.science.physics.mechanics.motion' },
  { name: 'flight', location: 'knowledge', flight: { to: EVOLUTION, at: .32 } },
  { name: 'hub', location: EVOLUTION, hash: `#/hub/${EVOLUTION}` },
  { name: 'discoveries', location: 'knowledge', tab: 'Explore', open: 'explore-list' },
  { name: 'notebook', location: 'knowledge', tab: 'Open library' },
  { name: 'reel', location: 'knowledge', tab: 'Explore', select: 'explore-reels', wait: '.explore-workspace:not(.is-hidden) .reel-feed' },
  { name: 'expedition', location: EVOLUTION, hash: `#/expedition/evolution-e01?from=${EVOLUTION}`, wait: '.player' },
  { name: 'check', location: EVOLUTION, hash: `#/check/${EVOLUTION}.natural-selection?from=${EVOLUTION}`, wait: '.check-shell' },
  { name: 'mission', location: EVOLUTION, hash: `#/mission/${EVOLUTION}.natural-selection?from=${EVOLUTION}`, wait: '.expedition-shell' },
  { name: 'leaf', location: 'knowledge.mathematics.foundations.unit-path.real-numbers', wait: '.mock-leaf' },
  { name: 'menu', location: EVOLUTION, open: 'open-menu' },
  { name: 'search', location: 'knowledge', open: 'open-search' },
];
const SHOTS = ALL_SHOTS.filter(shot => !process.env.MOK_SHOTS || process.env.MOK_SHOTS.split(',').includes(shot.name));

const settledAt = (page, id) => page.waitForFunction(expected => {
  if (!window.render_game_to_text) return false;
  const s = JSON.parse(window.render_game_to_text());
  return !s.navigating && s.location.id === expected && !document.querySelector('.map-system.is-navigating');
}, id, { timeout: 60000 });

async function still(browser, size, shot) {
  const slow = shot.flight ? 12 : 1;
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2, hasTouch: size.mobile, isMobile: size.mobile });
  await context.addInitScript(({ location, completed, notebook, slow }) => {
    localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: completed, locationId: location }));
    localStorage.setItem('mok-notebook-v1', JSON.stringify(notebook));
    if (slow === 1) return;
    // Virtual clock: every rAF timestamp runs `slow` times slower, so a frame can be caught mid-flight.
    const raf = window.requestAnimationFrame.bind(window);
    let last = null, virtual = 0;
    window.requestAnimationFrame = callback => raf(t => {
      if (last === null) { last = t; virtual = t; }
      virtual += (t - last) / slow; last = t;
      callback(virtual);
    });
  }, { location: shot.location, completed: PROGRESS, notebook: NOTEBOOK, slow });
  if (INSET_CSS) await context.addInitScript(css => addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }), INSET_CSS);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.goto(URL + QUERY + (shot.hash ?? ''));
  await settledAt(page, shot.location);
  await page.waitForTimeout(900); // starfield bitmaps and cover images arrive asynchronously
  if (shot.tab) {
    await page.getByRole('button', { name: shot.tab, exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(500);
  }
  // A side of the tab's own switch (Explore opens on Watch; the reel still is on Reels).
  if (shot.select) await page.locator(`[data-action="${shot.select}"]`).click();
  if (shot.wait) {
    await page.waitForSelector(shot.wait, { timeout: 30000 });
    await page.waitForTimeout(1500); // reel and player media
  }
  if (shot.open) {
    await page.locator(`[data-action="${shot.open}"]`).click();
    await page.waitForTimeout(400);
  }
  if (shot.flight) {
    await page.locator('[data-action="open-search"]').click();
    await page.getByLabel('Search an idea or territory').fill('Evolution');
    const button = page.locator('.search-results button').filter({ hasText: 'Evolution' }).filter({ hasText: 'Biology' }).first();
    await button.click();
    await page.waitForSelector('.map-system.is-navigating');
    await page.waitForFunction(at => Number(document.querySelector('.map-system')?.dataset.journeyProgress ?? 0) >= at, shot.flight.at, { timeout: 120000, polling: 'raf' });
  }
  const file = `${size.name}-${shot.name}.png`;
  await page.screenshot({ path: path.join(OUTPUT, file) });
  await context.close();
  if (errors.length) console.warn(`  ${file}: page errors`, errors);
  return file;
}

/** One contact sheet: a column per shot, a row per labelled folder of phone stills. */
async function sheet(browser, spec) {
  const rows = spec.split(',').map(part => { const [label, dir] = part.split(':'); return { label, dir: path.resolve(dir) }; });
  const shots = SHOTS.map(shot => shot.name);
  const html = `<!doctype html><html><head><style>
    body{margin:0;padding:20px;background:#04060c;color:#c9d2f2;font:600 14px/1.3 system-ui}
    .g{display:grid;grid-template-columns:90px repeat(${shots.length},250px);gap:10px;align-items:start}
    .h{text-align:center;color:#8d97bb;font-weight:500}
    .r{padding-top:8px}
    img{width:250px;display:block;border-radius:10px;border:1px solid #1b2238}
  </style></head><body><div class="g">
    <div></div>${shots.map(name => `<div class="h">${name}</div>`).join('')}
    ${rows.map(row => `<div class="r">${row.label}</div>${shots.map(name => `<img src="file://${path.join(row.dir, `phone-${name}.png`)}">`).join('')}`).join('')}
  </div></body></html>`;
  const target = path.resolve(process.env.MOK_SHEET_OUT || 'output/chrome/contact-sheet-phone.png');
  const htmlPath = target.replace(/\.png$/, '.html');
  await writeFile(htmlPath, html);
  const context = await browser.newContext({ viewport: { width: 140 + shots.length * 260, height: 600 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: target, fullPage: true });
  await context.close();
  return target;
}

const browser = await chromium.launch({ headless: true });
try {
  if (process.env.MOK_SHEET) console.log('sheet', await sheet(browser, process.env.MOK_SHEET));
  else {
    await mkdir(OUTPUT, { recursive: true });
    for (const size of SIZES) for (const shot of SHOTS) console.log(await still(browser, size, shot));
  }
} finally {
  await browser.close();
}
