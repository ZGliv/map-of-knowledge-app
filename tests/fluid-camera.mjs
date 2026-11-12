// One continuous camera: measures multi-level navigation in a real browser.
//
// For every rendered frame the recorder reconstructs the WORLD camera from the DOM
// (the moving parent layer's screen matrix composed with that level's resting pose),
// so motion is comparable across level handoffs and between old/new implementations.
// It reports stationary frames mid-journey, zoom monotonicity and frame times, then
// replays each journey in slow motion to capture an 8-frame filmstrip.
//
//   MOK_URL=http://127.0.0.1:5221 node tests/fluid-camera.mjs
//   MOK_CAMERA_LABEL=before|after   (prefixes the output files)
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5221';
const LABEL = process.env.MOK_CAMERA_LABEL || 'run';
const OUTPUT = path.resolve('output/camera');
const STILL_PX = 0.05;
const SCIENCE_5 = 'knowledge.science.physics.mechanics.motion.velocity';
const ARTS_5 = 'knowledge.arts.music.rhythm.pulse-and-meter.simple-meter';
const TECH_LEAF = 'knowledge.technology.computing.programming.algorithms.sorting.comparison-sorting.merge-sort.combining-two-sorted-runs';
const VARIANTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true },
].filter(variant => !process.env.MOK_VARIANT || variant.name === process.env.MOK_VARIANT);
await mkdir(OUTPUT, { recursive: true });

const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function settledAt(page, id) {
  await page.waitForFunction(expected => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return !s.navigating && s.location.id === expected && !document.querySelector('.map-system.is-navigating');
  }, id, { timeout: 60000 });
}

async function installRecorder(page) {
  await page.evaluate(async () => {
    const [{ catalog }, { NavigationLayoutResolver }, { SpatialLayoutEngine }, { createCameraJourney }] = await Promise.all([
      import('/src/core/catalog.ts'), import('/src/spatial/NavigationMotion.ts'),
      import('/src/spatial/SpatialLayoutEngine.ts'), import('/src/spatial/CameraNavigation.ts'),
    ]);
    const resolver = new NavigationLayoutResolver(catalog, new SpatialLayoutEngine());
    const poses = new Map();
    const svg = document.querySelector('.map-viewport');
    const clipKey = () => `${svg.viewBox.baseVal.width}x${svg.viewBox.baseVal.height}`;
    // World pose of a level at rest: maps world coordinates to that level's resting screen.
    const pose = id => {
      const key = `${clipKey()}|${id}`;
      if (poses.has(key)) return poses.get(key);
      const node = catalog.get(id);
      let value = { s: 1, x: 0, y: 0 };
      if (node.parentId) {
        const { width, height } = svg.viewBox.baseVal;
        const clip = [[0, 0], [0, height], [width, height], [width, 0]];
        const parent = pose(node.parentId);
        const region = resolver.layoutForViewport(catalog.get(node.parentId), clip).find(r => r.node.id === id);
        const e = createCameraJourney(region.polygon, clip).cameraAt(1);
        value = { s: e.scale * parent.s, x: e.x + e.scale * parent.x, y: e.y + e.scale * parent.y };
      }
      poses.set(key, value);
      return value;
    };
    window.__warmPoses = ids => ids.forEach(id => catalog.getPath(catalog.get(id)).forEach(n => pose(n.id)));
    const parentOf = id => id.slice(0, id.lastIndexOf('.'));
    const read = t => {
      const map = document.querySelector('.map-system');
      const context = document.querySelector('.map-camera-context');
      const base = svg.getScreenCTM().inverse();
      let level, local = { s: 1, x: 0, y: 0 };
      if (context) {
        const m = base.multiply(context.getScreenCTM());
        local = { s: Math.hypot(m.a, m.b), x: m.e, y: m.f };
        level = parentOf(document.querySelector('.map-scene--parent [data-region-id]').getAttribute('data-region-id'));
      } else {
        const cell = document.querySelector('.map-scene--idle [data-region-id]');
        // A leaf has no cells; it is where the previous frame's flight arrived.
        const previous = window.cameraRecording?.frames.at(-1);
        if (!cell && previous) return { ...previous, t, navigating: false };
        level = cell ? parentOf(cell.getAttribute('data-region-id')) : JSON.parse(window.render_game_to_text()).location.id;
      }
      const p = pose(level);
      return {
        t, level, navigating: map.classList.contains('is-navigating'),
        camera: { s: local.s * p.s, x: local.x + local.s * p.x, y: local.y + local.s * p.y },
        hue: Number(document.querySelector('.shell-bar')?.style.getPropertyValue('--atlas-hue') || NaN),
      };
    };
    window.startCameraRecording = () => {
      window.cameraRecording = { frames: [], done: false };
      let started = false, idle = 0;
      const tick = t => {
        const frame = read(t);
        window.cameraRecording.frames.push(frame);
        if (frame.navigating) { started = true; idle = 0; } else if (started && ++idle >= 6) { window.cameraRecording.done = true; return; }
        if (window.cameraRecording.frames.length > 4000) { window.cameraRecording.done = true; return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  });
}

/** Largest on-screen displacement (CSS px) of the viewport corners and centre between two world cameras. */
function pixelMotion(a, b, width, height) {
  let max = 0;
  for (const [qx, qy] of [[0, 0], [width, 0], [0, height], [width, height], [width / 2, height / 2]]) {
    const wx = (qx - a.x) / a.s, wy = (qy - a.y) / a.s;
    max = Math.max(max, Math.hypot(b.s * wx + b.x - qx, b.s * wy + b.y - qy));
  }
  return max;
}

function analyse(frames, size, direction) {
  const steps = frames.slice(1).map((frame, i) => ({
    t: frame.t, dt: frame.t - frames[i].t,
    px: pixelMotion(frames[i].camera, frame.camera, size.width, size.height),
    dlog: Math.log(frame.camera.s / frames[i].camera.s),
    from: frames[i], to: frame,
  }));
  const moving = steps.map((step, i) => step.px > 0.01 ? i : -1).filter(i => i >= 0);
  if (!moving.length) return { error: 'camera never moved' };
  const first = moving[0], last = moving.at(-1);
  const window = steps.slice(first, last + 1);
  const start = window[0].t - window[0].dt, end = window.at(-1).t;
  const duration = end - start;
  // Stationary runs strictly inside the journey: consecutive displayed frames with no camera motion.
  let longestStillMs = 0, run = 0, stillFrames = 0;
  for (const step of window) {
    if (step.px < STILL_PX) { stillFrames++; run += step.dt; longestStillMs = Math.max(longestStillMs, run); } else run = 0;
  }
  const middle = window.filter(step => step.t - start > duration * .15 && step.t - start < duration * .85);
  const intervals = window.map(step => step.dt).sort((a, b) => a - b);
  const levelsVisited = [...new Set(frames.filter(f => f.navigating).map(f => f.level))];
  const idleMidway = window.filter(step => !step.to.navigating).length;
  const logScale = frames.map(f => Math.log(f.camera.s));
  const signs = window.map(step => Math.sign(step.dlog)).filter(Boolean);
  const reversals = signs.slice(1).filter((s, i) => s !== signs[i]).length;
  return {
    durationMs: Math.round(duration), frames: window.length,
    zoomFrom: Math.exp(logScale[0]), zoomTo: Math.exp(logScale.at(-1)),
    stationaryFramesMidJourney: stillFrames, longestStationaryMs: Math.round(longestStillMs),
    idleFramesMidJourney: idleMidway,
    minPxPerFrameMiddle70: Number(Math.min(...middle.map(s => s.px)).toFixed(3)),
    zoomDirectionReversals: reversals, expectedDirection: direction,
    frameMs: { mean: Number((duration / window.length).toFixed(2)), p95: Number(intervals[Math.floor(intervals.length * .95)].toFixed(2)), max: Number(intervals.at(-1).toFixed(2)), over20: intervals.filter(v => v > 20).length },
    levelsVisited,
  };
}

async function openSearchAndPick(page, id) {
  const { name, parentName } = await page.evaluate(async target => {
    const { catalog } = await import('/src/core/catalog.ts');
    const node = catalog.get(target);
    return { name: node.name, parentName: catalog.get(node.parentId).name };
  }, id);
  await page.getByRole('button', { name: 'Search the atlas', exact: true }).click();
  await page.getByLabel('Search an idea or territory').fill(name);
  const button = page.locator('.search-results button').filter({ hasText: name }).filter({ hasText: parentName }).first();
  await button.waitFor();
  return () => button.click();
}

async function measure(page, variant, name, prepare, destination, direction) {
  const trigger = await prepare();
  const size = await page.evaluate(() => ({ width: document.querySelector('.map-viewport').viewBox.baseVal.width, height: document.querySelector('.map-viewport').viewBox.baseVal.height }));
  const from = (await state(page)).location.id;
  await page.evaluate(ids => window.__warmPoses(ids), [from, destination]);
  await page.evaluate(() => window.startCameraRecording());
  await trigger();
  await settledAt(page, destination);
  await page.waitForFunction(() => window.cameraRecording.done, null, { timeout: 30000 });
  const frames = await page.evaluate(() => window.cameraRecording.frames);
  const summary = { name, from, to: destination, ...analyse(frames, size, direction) };
  await writeFile(path.join(OUTPUT, `${LABEL}-${variant.name}-${name}-frames.json`), JSON.stringify({ summary, frames }, null, 1));
  return summary;
}

const SLOW = 10;
async function filmstrip(browser, variant, journey, durationMs) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1, hasTouch: variant.mobile, isMobile: variant.mobile });
  await context.addInitScript(({ locationId, slow }) => {
    localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: [], locationId }));
    const raf = window.requestAnimationFrame.bind(window);
    let last = null, virtual = 0;
    window.__vnow = () => virtual;
    window.requestAnimationFrame = callback => raf(t => {
      if (last === null) { last = t; virtual = t; }
      virtual += (t - last) / slow; last = t;
      callback(virtual);
    });
  }, { locationId: journey.start, slow: SLOW });
  const page = await context.newPage();
  await page.goto(URL);
  await settledAt(page, journey.start);
  await page.waitForTimeout(600);
  const trigger = await journey.prepare(page);
  const box = await page.locator('.map-viewport').boundingBox();
  await trigger();
  await page.waitForSelector('.map-system.is-navigating');
  const v0 = await page.evaluate(() => window.__vnow());
  const files = [];
  for (let k = 0; k < 8; k++) {
    const target = v0 + durationMs * k / 7;
    if (k < 7) await page.waitForFunction(at => window.__vnow() >= at, target, { timeout: 120000, polling: 'raf' });
    else await settledAt(page, journey.to);
    const file = `${LABEL}-${variant.name}-${journey.name}-${k}.png`;
    await page.screenshot({ path: path.join(OUTPUT, file), clip: box });
    files.push({ file, ms: Math.round(durationMs * k / 7) });
  }
  await context.close();
  const strip = await browser.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 });
  const sheet = await strip.newPage();
  const html = `<!doctype html><html><head><style>body{margin:0;padding:12px;background:#0b0e18;color:#cdd3ea;font:12px system-ui}h1{font-size:14px;margin:0 0 8px}.f{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}img{width:100%;display:block;border:1px solid #333a55}</style></head><body><h1>${LABEL} · ${variant.name} · ${journey.name} (${Math.round(durationMs)} ms)</h1><div class="f">${files.map(f => `<figure style="margin:0"><img src="file://${path.join(OUTPUT, f.file)}"/><figcaption>${f.ms} ms</figcaption></figure>`).join('')}</div></body></html>`;
  const sheetPath = path.join(OUTPUT, `${LABEL}-${variant.name}-${journey.name}-filmstrip.html`);
  await writeFile(sheetPath, html);
  await sheet.goto(`file://${sheetPath}`);
  await sheet.setViewportSize({ width: 1600, height: Math.ceil(await sheet.locator('body').evaluate(el => el.scrollHeight)) });
  await sheet.screenshot({ path: sheetPath.replace('.html', '.png'), fullPage: true });
  await strip.close();
  return sheetPath.replace('.html', '.png');
}

const JOURNEYS = [
  { name: 'world-to-science-5', start: 'knowledge', to: SCIENCE_5, direction: 'in', prepare: page => openSearchAndPick(page, SCIENCE_5) },
  { name: 'science-5-to-world', start: SCIENCE_5, to: 'knowledge', direction: 'out', prepare: async page => () => page.locator('[data-action="brand-home"]').click() },
  { name: 'science-5-to-arts-5', start: SCIENCE_5, to: ARTS_5, direction: 'out-in', prepare: page => openSearchAndPick(page, ARTS_5) },
  { name: 'world-to-tech-leaf-8', start: 'knowledge', to: TECH_LEAF, direction: 'in', prepare: page => openSearchAndPick(page, TECH_LEAF) },
  { name: 'tech-leaf-8-to-world', start: TECH_LEAF, to: 'knowledge', direction: 'out', prepare: async page => async () => {
    // The breadcrumb's world link where the shell shows one at a leaf, else the leaf's own return, else home.
    for (const selector of ['[data-action="breadcrumb-navigate"][data-node-id="knowledge"]', '[data-action="leaf-world-return"]', '[data-action="brand-home"]']) {
      const control = page.locator(selector).first();
      if (await control.isVisible()) return control.click();
    }
  } },
  { name: 'enter-one-level', start: 'knowledge', to: 'knowledge.arts', direction: 'in', prepare: async page => () => page.evaluate(() => {
    const el = document.querySelector('.map-scene--idle [data-region-id="knowledge.arts"]');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }) },
  { name: 'return-one-level', start: 'knowledge.arts', to: 'knowledge', direction: 'out', prepare: async page => () => page.locator('[data-action="parent-return"]').click() },
];

const browser = await chromium.launch({ headless: true });
const report = { label: LABEL, url: URL, variants: [] };
try {
  for (const variant of VARIANTS) {
    const result = { variant: variant.name, viewport: variant.viewport, journeys: [], interruption: null, filmstrips: [] };
    for (const journey of JOURNEYS.filter(j => !process.env.MOK_ONLY || process.env.MOK_ONLY.split(',').includes(j.name))) {
      const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1, hasTouch: variant.mobile, isMobile: variant.mobile });
      await context.addInitScript(locationId => localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: [], locationId })), journey.start);
      const page = await context.newPage();
      // MOK_CPU_THROTTLE=4 approximates a mid-range phone's CPU.
      if (process.env.MOK_CPU_THROTTLE) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.MOK_CPU_THROTTLE) });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(URL);
      await settledAt(page, journey.start);
      await page.waitForTimeout(600);
      await installRecorder(page);
      const summary = await measure(page, variant, journey.name, () => journey.prepare(page), journey.to, journey.direction);
      summary.errors = errors;
      result.journeys.push(summary);
      console.log(`${variant.name} ${journey.name}: ${summary.durationMs}ms, ${summary.frames} frames, still=${summary.stationaryFramesMidJourney} (longest ${summary.longestStationaryMs}ms), idle=${summary.idleFramesMidJourney}, minPx(mid)=${summary.minPxPerFrameMiddle70}, reversals=${summary.zoomDirectionReversals}, frame p95=${summary.frameMs.p95} max=${summary.frameMs.max} >20ms=${summary.frameMs.over20}`);
      await context.close();
      if (!process.env.MOK_NO_FILMSTRIP && ['world-to-science-5', 'science-5-to-world', 'science-5-to-arts-5', 'world-to-tech-leaf-8'].includes(journey.name)) {
        result.filmstrips.push(await filmstrip(browser, variant, journey, summary.durationMs));
      }
    }
    if (!process.env.MOK_ONLY) {
      // Interruption: a new destination chosen while the camera is diving.
      const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1, hasTouch: variant.mobile, isMobile: variant.mobile });
      await context.addInitScript(() => localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: [], locationId: 'knowledge' })));
      const page = await context.newPage();
      await page.goto(URL);
      await settledAt(page, 'knowledge');
      await page.waitForTimeout(600);
      await installRecorder(page);
      const size = await page.evaluate(() => ({ width: document.querySelector('.map-viewport').viewBox.baseVal.width, height: document.querySelector('.map-viewport').viewBox.baseVal.height }));
      await page.evaluate(ids => window.__warmPoses(ids), [TECH_LEAF, ARTS_5]);
      const trigger = await openSearchAndPick(page, TECH_LEAF);
      await page.evaluate(() => window.startCameraRecording());
      await trigger();
      await page.waitForTimeout(700);
      await (await openSearchAndPick(page, ARTS_5))();
      await settledAt(page, ARTS_5);
      await page.waitForFunction(() => window.cameraRecording.done, null, { timeout: 30000 });
      const frames = await page.evaluate(() => window.cameraRecording.frames);
      result.interruption = { name: 'dive-to-tech-leaf-then-arts-5', ...analyse(frames, size, 'redirect') };
      await writeFile(path.join(OUTPUT, `${LABEL}-${variant.name}-interruption-frames.json`), JSON.stringify({ summary: result.interruption, frames }, null, 1));
      console.log(`${variant.name} interruption: ${result.interruption.durationMs}ms, still=${result.interruption.stationaryFramesMidJourney} (longest ${result.interruption.longestStationaryMs}ms), idle=${result.interruption.idleFramesMidJourney}`);
      await context.close();
    }
    report.variants.push(result);
  }
} finally {
  await writeFile(path.join(OUTPUT, `${LABEL}-report.json`), JSON.stringify(report, null, 2));
  await browser.close();
}
