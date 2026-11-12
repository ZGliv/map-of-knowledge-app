// Time to the first painted map on a slow phone: Chromium with the CPU slowed 4× and a
// fast-3G-ish network (150 ms latency, 1.6 Mbps down). Each run is a fresh, cold context.
// Then, on a warm page, how long opening a hub and coming back to the map take.
//
//   MOK_URL=http://127.0.0.1:5220 RUNS=5 node tests/perf-first-paint.mjs
//
// Point it at a production build (vite preview); the dev server's numbers mean nothing.
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5220';
const RUNS = Number(process.env.RUNS || 5);
const HUB = 'knowledge.science.biology.evolution';

const browser = await chromium.launch({ headless: true });
const median = values => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

async function slowPage() {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // The first frame painted after the resting map's cells exist.
  await page.addInitScript(() => {
    const seen = () => document.querySelector('.map-scene--idle .map-cell');
    const watch = new MutationObserver(() => { if (seen()) { watch.disconnect(); requestAnimationFrame(() => { window.__mapPaint = performance.now(); }); } });
    watch.observe(document, { childList: true, subtree: true });
  });
  return { context, page, cdp };
}

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const { context, page } = await slowPage();
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__mapPaint, null, { timeout: 120000, polling: 50 });
  await page.waitForLoadState('load');
  const r = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const js = resources.filter(e => e.name.endsWith('.js'));
    return { mapPaint: window.__mapPaint, jsKB: js.reduce((s, e) => s + e.transferSize, 0) / 1024, jsFiles: js.length };
  });
  runs.push(r);
  console.log(`run ${i + 1}: map ${Math.round(r.mapPaint)} ms · JS on boot ${r.jsKB.toFixed(0)} kB in ${r.jsFiles} files`);
  await context.close();
}

// Warm navigation on one throttled page: into a hub and back to the map, three times.
const { context, page } = await slowPage();
await page.goto(URL, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__mapPaint, null, { timeout: 120000, polling: 50 });
await page.waitForTimeout(4000);
console.log('chunks fetched before the first hub open:', await page.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js')).map(e => `${e.name.split('/').pop()}@${Math.round(e.responseEnd)}`).join(' ')));
const hubTimes = [], backTimes = [];
for (let i = 0; i < 3; i++) {
  const t0 = await page.evaluate(hub => { const t = performance.now(); location.hash = `#/hub/${encodeURIComponent(hub)}`; return t; }, HUB);
  await page.locator('.hub-page').first().waitFor({ timeout: 60000 });
  hubTimes.push(await page.evaluate(t => new Promise(done => requestAnimationFrame(() => done(performance.now() - t))), t0));
  const t1 = await page.evaluate(() => { const t = performance.now(); history.back(); return t; });
  await page.locator('.hub-page').first().waitFor({ state: 'detached', timeout: 60000 });
  await page.locator('.map-scene--idle .map-cell').first().waitFor();
  backTimes.push(await page.evaluate(t => new Promise(done => requestAnimationFrame(() => done(performance.now() - t))), t1));
}
await context.close();
await browser.close();

console.log(`\nmedian of ${RUNS}: first map paint ${Math.round(median(runs.map(r => r.mapPaint)))} ms · JS ${median(runs.map(r => r.jsKB)).toFixed(0)} kB`);
console.log(`open hub: ${hubTimes.map(Math.round).join(', ')} ms · back to map: ${backTimes.map(Math.round).join(', ')} ms`);
