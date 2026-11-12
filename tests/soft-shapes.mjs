// Curved map borders: stills, a mid-flight frame and dive frame times.
//
//   MOK_URL=http://127.0.0.1:5207 node tests/soft-shapes.mjs            (stills + compare sheets)
//   MOK_SHAPES_PERF_ONLY=1 node tests/soft-shapes.mjs                    (4-level dive frame times only)
//     against MOK_PERF_URL, default http://127.0.0.1:5217: `vite preview` of this worktree's production build
//   MOK_SIZES=desktop,phone                                              (subsets)
//
// Writes output/shapes/<size>-<variant>-<shot>.png, compare-desktop.png, compare-phone.png
// and perf.json. Every shot starts from a fresh context with the same saved demo progress.
// Curves are the only map look (the ?shape= switch is gone), so there is one variant.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5207';
// Perf runs default to the production preview of this worktree (MOK_PERF_URL), stills to the dev server.
const PERF_URL = process.env.MOK_PERF_URL || 'http://127.0.0.1:5217';
const OUTPUT = path.resolve('output/shapes');
const EVOLUTION = 'knowledge.science.biology.evolution';
const ALL_VARIANTS = [
  { name: 'curves', query: '' },
];
const VARIANTS = ALL_VARIANTS.filter(v => !process.env.MOK_SHAPES || process.env.MOK_SHAPES.split(',').includes(v.name));
const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true },
].filter(size => !process.env.MOK_SIZES || process.env.MOK_SIZES.split(',').includes(size.name));
// Terminal pieces only (demo marks must be leaves): shallow ones read as patches at the world view, deep ones as beacons.
const PROGRESS = [
  'knowledge.science.chemistry',
  'knowledge.arts.architecture',
  'knowledge.economics.money',
  'knowledge.earth.oceans',
  'knowledge.humanities.philosophy',
  'knowledge.science.biology.evolution.natural-selection',
  'knowledge.mathematics.foundations.unit-path.real-numbers',
  'knowledge.technology.computing.programming.algorithms.sorting.comparison-sorting.merge-sort.combining-two-sorted-runs',
];
const SHOTS = [
  { name: 'world', location: 'knowledge' },
  { name: 'science', location: 'knowledge.science' },
  { name: 'evolution', location: EVOLUTION, completed: PROGRESS },
  { name: 'world-progress', location: 'knowledge', completed: PROGRESS, hover: 'knowledge.science' },
  { name: 'flight', location: 'knowledge', flight: { to: EVOLUTION, at: .1 } },
  // The temporary color preview (menu, Preview color, Whole map): every territory in its own spectrum.
  { name: 'world-color', location: 'knowledge', preview: 'all' },
];
await mkdir(OUTPUT, { recursive: true });

const settledAt = (page, id) => page.waitForFunction(expected => {
  if (!window.render_game_to_text) return false;
  const s = JSON.parse(window.render_game_to_text());
  return !s.navigating && s.location.id === expected && !document.querySelector('.map-system.is-navigating');
}, id, { timeout: 60000 });

// Names by id, so the search can be driven against a production build (no /src imports there).
const NAMES = {
  [EVOLUTION]: { name: 'Evolution', parentName: 'Biology' },
  [`${EVOLUTION}.natural-selection`]: { name: 'Natural selection', parentName: 'Evolution' },
};
async function openSearchAndPick(page, id) {
  const { name, parentName } = NAMES[id];
  await page.getByRole('button', { name: 'Search the atlas', exact: true }).click();
  await page.getByLabel('Search an idea or territory').fill(name);
  const button = page.locator('.search-results button').filter({ hasText: name }).filter({ hasText: parentName }).first();
  await button.waitFor();
  return () => button.click();
}

async function newPage(browser, size, { location, completed = [], slow = 1 }) {
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2, hasTouch: size.mobile, isMobile: size.mobile });
  await context.addInitScript(({ location, completed, slow }) => {
    localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: completed, locationId: location }));
    if (slow === 1) return;
    // Virtual clock: every rAF timestamp runs `slow` times slower, so a frame can be caught mid-flight.
    const raf = window.requestAnimationFrame.bind(window);
    let last = null, virtual = 0;
    window.__vnow = () => virtual;
    window.requestAnimationFrame = callback => raf(t => {
      if (last === null) { last = t; virtual = t; }
      virtual += (t - last) / slow; last = t;
      callback(virtual);
    });
  }, { location, completed, slow });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('502')) errors.push(message.text()); });
  return { context, page, errors };
}

async function still(browser, size, variant, shot) {
  const { context, page, errors } = await newPage(browser, size, { location: shot.location, completed: shot.completed, slow: shot.flight ? 12 : 1 });
  await page.goto(URL + variant.query);
  await settledAt(page, shot.location);
  await page.waitForTimeout(900); // starfield bitmaps arrive asynchronously
  const box = await page.locator('.map-viewport').boundingBox();
  if (shot.hover && !size.mobile) {
    const target = page.locator(`.map-scene--idle [data-region-id="${shot.hover}"]`);
    await target.hover({ force: true });
    await page.waitForTimeout(350);
  }
  if (shot.preview) {
    await page.locator('[data-action="open-menu"]').click();
    await page.locator('[role=menu] [data-action="color-preview"]').click();
    await page.keyboard.press('Escape');
    if (shot.preview === 'all') await page.locator('.spectrum-control [data-action="preview-all"]').click();
    await page.waitForTimeout(400);
  }
  if (shot.flight) {
    const trigger = await openSearchAndPick(page, shot.flight.to);
    await trigger();
    await page.waitForSelector('.map-system.is-navigating');
    // The camera flies once its departure pose is on screen; wait for a target share of the journey.
    await page.waitForFunction(at => Number(document.querySelector('.map-system')?.dataset.journeyProgress ?? 0) >= at, shot.flight.at, { timeout: 120000, polling: 'raf' });
  }
  const file = `${size.name}-${variant.name}-${shot.name}.png`;
  await page.screenshot({ path: path.join(OUTPUT, file), clip: box });
  await context.close();
  if (errors.length) console.warn(`  ${file}: page errors`, errors);
  return file;
}

/** Frame intervals for one dive from the world to depth 4, measured with real rAF timing. */
async function dive(browser, size, variant, throttle) {
  const target = `${EVOLUTION}.natural-selection`;
  const { context, page, errors } = await newPage(browser, size, { location: 'knowledge' });
  if (throttle > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(PERF_URL + variant.query);
  await settledAt(page, 'knowledge');
  await page.waitForTimeout(900);
  const destination = target;
  const trigger = await openSearchAndPick(page, destination);
  await page.evaluate(() => {
    window.__frames = [];
    const tick = t => { window.__frames.push({ t, nav: !!document.querySelector('.map-system.is-navigating') }); if (window.__frames.length < 3000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await trigger();
  await settledAt(page, destination);
  await page.waitForTimeout(200);
  const frames = await page.evaluate(() => window.__frames);
  await context.close();
  const first = frames.findIndex(f => f.nav), last = frames.findLastIndex(f => f.nav);
  const intervals = frames.slice(first + 1, last + 1).map((f, i) => f.t - frames[first + i].t).sort((a, b) => a - b);
  const total = frames[last].t - frames[first].t;
  return {
    variant: variant.name, size: size.name, throttle, destination, errors,
    durationMs: Math.round(total), frames: intervals.length,
    meanMs: Number((total / intervals.length).toFixed(2)),
    p50Ms: Number(intervals[Math.floor(intervals.length * .5)].toFixed(2)),
    p95Ms: Number(intervals[Math.floor(intervals.length * .95)].toFixed(2)),
    maxMs: Number(intervals.at(-1).toFixed(2)),
    over20: intervals.filter(v => v > 20).length,
    over34: intervals.filter(v => v > 34).length,
  };
}

async function compareSheet(browser, size, files) {
  const columns = VARIANTS.length;
  const width = size.name === 'desktop' ? 520 * columns : 260 * columns;
  const html = `<!doctype html><html><head><style>
    body{margin:0;padding:16px;background:#05070e;color:#c9d2f2;font:13px/1.4 system-ui}
    h1{font-size:15px;margin:0 0 12px;font-weight:600}
    .g{display:grid;grid-template-columns:110px repeat(${columns},1fr);gap:8px;align-items:start}
    .h{font-weight:600;text-align:center;padding-bottom:4px}
    .r{writing-mode:horizontal-tb;padding-top:6px;color:#8d97bb}
    img{width:100%;display:block;border:1px solid #1f2742;border-radius:4px}
  </style></head><body><h1>Map shapes · ${size.name} ${size.viewport.width}×${size.viewport.height}</h1><div class="g">
    <div></div>${VARIANTS.map(v => `<div class="h">${v.name}${v.query ? ` <span style="color:#6f7aa3;font-weight:400">${v.query}</span>` : ''}</div>`).join('')}
    ${SHOTS.map(shot => `<div class="r">${shot.name}</div>${VARIANTS.map(v => `<img src="file://${path.join(OUTPUT, files[`${v.name}-${shot.name}`])}">`).join('')}`).join('')}
  </div></body></html>`;
  const sheetPath = path.join(OUTPUT, `compare-${size.name}.html`);
  await writeFile(sheetPath, html);
  const context = await browser.newContext({ viewport: { width: width + 150, height: 600 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`file://${sheetPath}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: sheetPath.replace('.html', '.png'), fullPage: true });
  await context.close();
  return sheetPath.replace('.html', '.png');
}

const browser = await chromium.launch({ headless: true });
try {
  if (!process.env.MOK_SHAPES_PERF_ONLY) {
    for (const size of SIZES) {
      const files = {};
      for (const variant of VARIANTS) for (const shot of SHOTS) {
        files[`${variant.name}-${shot.name}`] = await still(browser, size, variant, shot);
        console.log(`${size.name} ${variant.name} ${shot.name}`);
      }
      if (!process.env.MOK_SHAPES_NO_SHEET) console.log('sheet', await compareSheet(browser, size, files));
    }
  }
  if (process.env.MOK_SHAPES_PERF || process.env.MOK_SHAPES_PERF_ONLY) {
    const runs = Number(process.env.MOK_SHAPES_RUNS || 3);
    const throttles = (process.env.MOK_SHAPES_THROTTLE || '1,4').split(',').map(Number);
    const results = [];
    for (const size of SIZES) for (const throttle of throttles) for (let run = 0; run < runs; run++) for (const variant of VARIANTS) {
      const result = await dive(browser, size, variant, throttle);
      results.push({ ...result, run });
      console.log(`${size.name} x${throttle} ${variant.name} #${run}: ${result.durationMs}ms ${result.frames}f mean=${result.meanMs} p95=${result.p95Ms} max=${result.maxMs} >20=${result.over20} >34=${result.over34}${result.errors.length ? ' ERR ' + result.errors.join('; ') : ''}`);
    }
    await writeFile(path.join(OUTPUT, 'perf.json'), JSON.stringify(results, null, 1));
  }
} finally {
  await browser.close();
}
