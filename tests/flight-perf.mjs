// Frame times during camera flights on a phone, the way a phone feels them.
//
// Serve a production build (`vite build` + `vite preview`) and point MOK_URL at it:
//   MOK_URL=http://127.0.0.1:5223 node tests/flight-perf.mjs           (MOK_ENGINES=webkit,chromium)
//
// Each flight is timed from the tap to the settled map with requestAnimationFrame; a frame over
// 20 ms is a dropped frame at 60 Hz. WebKit is Safari's engine (no CPU throttling there);
// Chromium runs with the CPU slowed 4x to stand in for a phone.
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5223';
const ENGINES = [
  { name: 'webkit', type: webkit, throttle: 1 },
  { name: 'chromium-4x', type: chromium, throttle: 4 },
].filter(engine => !process.env.MOK_ENGINES || process.env.MOK_ENGINES.split(',').some(name => engine.name.startsWith(name)));
const ROUNDS = Number(process.env.MOK_ROUNDS || 2);

const SCIENCE = 'knowledge.science';
const SCIENCE_5 = 'knowledge.science.physics.mechanics.motion.velocity';
const ARTS_5 = 'knowledge.arts.music.rhythm.pulse-and-meter.simple-meter';
// Search finds them by name (a production build has no source modules to look names up in).
const NAMES = {
  [SCIENCE_5]: { name: 'Velocity', parentName: 'Motion' },
  [ARTS_5]: { name: 'Simple meter', parentName: 'Pulse and meter' },
};

async function settledAt(page, id) {
  await page.waitForFunction(expected => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return !s.navigating && s.location.id === expected && !document.querySelector('.map-system.is-navigating');
  }, id, { timeout: 60000 });
}

async function viaSearch(page, id) {
  const { name, parentName } = NAMES[id];
  await page.getByRole('button', { name: 'Search the atlas', exact: true }).click();
  await page.getByLabel('Search an idea or territory').fill(name);
  const button = page.locator('.search-results button').filter({ hasText: name }).filter({ hasText: parentName }).first();
  await button.waitFor();
  return () => button.click();
}

const viaTap = (page, id) => async () => () => page.locator(`.map-scene--idle .map-cell[data-region-id="${id}"]`).click();

async function fly(page, name, prepare, destination) {
  const trigger = await prepare();
  await page.evaluate(() => {
    window.__frames = []; let last = performance.now();
    const tick = now => { window.__frames.push(now - last); last = now; if (!window.__stopFrames) requestAnimationFrame(tick); };
    window.__stopFrames = false; requestAnimationFrame(tick);
  });
  const started = Date.now();
  await trigger();
  await settledAt(page, destination);
  const frames = await page.evaluate(() => { window.__stopFrames = true; return window.__frames.slice(1); });
  const sorted = [...frames].sort((a, b) => a - b);
  return {
    name, ms: Date.now() - started, frames: frames.length,
    mean: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(1),
    p95: +sorted[Math.floor(sorted.length * .95)].toFixed(1), max: +sorted.at(-1).toFixed(1),
    over20: frames.filter(v => v > 20).length, over33: frames.filter(v => v > 33.4).length,
  };
}

for (const engine of ENGINES) {
  const browser = await engine.type.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: engine.name !== 'webkit' ? true : undefined });
  const results = [];
  for (let round = 0; round < ROUNDS; round += 1) {
    // A fresh page each round: the app saves where you are as it unloads.
    await context.clearCookies();
    const page = await context.newPage();
    if (engine.throttle > 1) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: engine.throttle }); }
    if (process.env.MOK_INJECT_CSS) await page.addInitScript(css => addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }), process.env.MOK_INJECT_CSS);
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await settledAt(page, 'knowledge');
    await page.waitForTimeout(800);
    results.push(await fly(page, 'world → Science (tap)', viaTap(page, SCIENCE), SCIENCE));
    await page.waitForTimeout(400);
    results.push(await fly(page, 'Science → velocity (4 levels)', () => viaSearch(page, SCIENCE_5), SCIENCE_5));
    await page.waitForTimeout(400);
    results.push(await fly(page, 'velocity → simple meter (across)', () => viaSearch(page, ARTS_5), ARTS_5));
    await page.evaluate(() => { localStorage.clear(); Storage.prototype.setItem = () => {}; });
    await page.close();
  }
  const byName = new Map();
  for (const r of results) { const list = byName.get(r.name) ?? []; list.push(r); byName.set(r.name, list); }
  console.log(`\n${engine.name} (393x852 @3x${engine.throttle > 1 ? `, CPU ${engine.throttle}x slower` : ''}), best of ${ROUNDS}:`);
  for (const [name, list] of byName) {
    const r = list.sort((a, b) => a.p95 - b.p95)[0];
    console.log(`  ${name.padEnd(36)} ${String(r.frames).padStart(4)} frames  mean ${String(r.mean).padStart(5)} ms  p95 ${String(r.p95).padStart(5)}  max ${String(r.max).padStart(6)}  >20ms ${String(r.over20).padStart(3)}  >33ms ${String(r.over33).padStart(3)}`);
  }
  await browser.close();
}
