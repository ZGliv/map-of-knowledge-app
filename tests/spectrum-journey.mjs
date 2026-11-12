// The continuous eight-layer pullback and the color preview, in Chromium (desktop) and WebKit
// (phone): every layer stays on screen with no exposed edge and no stop at a handoff (from a deep
// sample leaf, by the top bar's home and (wide screens) the trail's "All knowledge", and from off-centre
// Economics), a resize mid-route, reduced motion, and a preview that never touches saved progress.
//
//   MOK_URL=http://127.0.0.1:5221 node tests/spectrum-journey.mjs
//   MOK_SPECTRUM_ENGINE=chromium|webkit · MOK_MOTION_ONLY=1 · MOK_COLORS_ONLY=1
//
// Writes reports, frame logs and storyboards to output/playwright/spectrum/.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5221';
const HOME = '[data-action="brand-home"]';
const WORLD_TRAIL = '[data-action="breadcrumb-navigate"][data-node-id="knowledge"]';
// The local AI guide is not part of this check; its 502s are the dev proxy, not the app.
const guideOffline = text => /502 \(Bad Gateway\)/.test(text);
const OUTPUT = path.resolve('output/playwright/spectrum');
const DEMO_KEY = 'mok-next.demo-progress.v1';
const LEARNING_KEY = 'mok-next.save.v1';
const LEARNING_SENTINEL = 'Spectrum verification: earlier learning remains byte-for-byte unchanged';
const LEAF = 'knowledge.technology.computing.programming.algorithms.sorting.comparison-sorting.merge-sort.combining-two-sorted-runs';
const ECONOMICS_LEAF = 'knowledge.economics.decision-theory.choices-under-constraints.opportunity-cost.the-next-best-alternative.a-choice-about-time.one-hour-two-uses.what-the-other-hour-could-do';
const TARGETS = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];
const VARIANTS = [
  { name: 'chromium-wide', engine: 'chromium', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'webkit-phone', engine: 'webkit', viewport: { width: 390, height: 844 }, mobile: true },
];
await mkdir(OUTPUT, { recursive: true });
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function at(page, id) {
  await page.waitForFunction(expected => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return !s.navigating && s.location.id === expected;
  }, id, { timeout: 35000 });
}
async function storage(page) {
  await page.waitForTimeout(160);
  return page.evaluate(({ demo, learning }) => ({ demo: localStorage.getItem(demo), learning: localStorage.getItem(learning) }), { demo: DEMO_KEY, learning: LEARNING_KEY });
}
async function geometry(page) {
  return page.evaluate(() => ({
    regions: [...document.querySelectorAll('.map-scene--idle [data-region-id]')].map(el => ({ id: el.getAttribute('data-region-id'), d: el.getAttribute('d') })),
    marks: [...document.querySelectorAll('.completion-marker')].map(el => ({ id: el.getAttribute('data-completion-id'), area: el.getAttribute('data-estimated-area'), parts: [...el.children].map(part => ({ tag: part.tagName, d: part.getAttribute('d'), cx: part.getAttribute('cx'), cy: part.getAttribute('cy'), r: part.getAttribute('r') })) })),
  }));
}
/** Fly to a place through search, the way a reader reaches a deep idea. */
async function searchTo(page, id) {
  const { name, parent } = await page.evaluate(async target => {
    const { catalog } = await import('/src/core/catalog.ts');
    const node = catalog.get(target);
    return { name: node.name, parent: catalog.get(node.parentId).name };
  }, id);
  await page.locator('[data-action="open-search"]').tap();
  await page.getByLabel('Search an idea or territory').fill(name);
  await page.locator('.search-results button').filter({ hasText: name }).filter({ hasText: parent }).first().tap();
  await at(page, id);
}
/** The color preview is switched on from the menu; the map carries its switch only while it shows. */
async function previewOn(page) {
  await page.locator('[data-action="open-menu"]').tap();
  await page.locator('[role="menuitemcheckbox"][data-action="color-preview"]').tap();
  await page.locator('.spectrum-toggle').waitFor();
}
async function tapRegion(page, id) {
  const point = await page.locator(`.map-scene--idle [data-region-id="${id}"]`).evaluate(el => {
    const values = el.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    let x = 0; let y = 0;
    for (let i = 0; i < values.length; i += 2) { x += values[i]; y += values[i + 1]; }
    const p = new DOMPoint(x / (values.length / 2), y / (values.length / 2)).matrixTransform(el.getScreenCTM());
    return { x: p.x, y: p.y };
  });
  await page.touchscreen.tap(point.x, point.y);
  await at(page, id);
}
async function installRecorder(page) {
  await page.evaluate(targets => {
    const read = () => {
      const map = document.querySelector('.map-system');
      const number = key => map.hasAttribute(key) ? Number(map.getAttribute(key)) : null;
      const s = JSON.parse(window.render_game_to_text());
      const parent = document.querySelector('.map-camera-context');
      const matrix = parent?.getScreenCTM();
      const svg = document.querySelector('.map-viewport');
      const bounds = transform => {
        const { width, height } = svg.viewBox.baseVal;
        const points = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
        return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
      };
      const parentBounds = matrix ? bounds(matrix) : null;
      const viewportBounds = bounds(svg.getScreenCTM());
      const uncoveredEdgePx = parentBounds ? Math.max(0, parentBounds.left - viewportBounds.left, viewportBounds.right - parentBounds.right, parentBounds.top - viewportBounds.top, viewportBounds.bottom - parentBounds.bottom) : null;
      return { time: performance.now(), progress: number('data-journey-progress'), scale: number('data-journey-scale'), leg: number('data-journey-leg'), length: number('data-journey-length'), localProgress: number('data-transition-progress'), localScale: number('data-camera-scale'), cameraScale: matrix ? Math.hypot(matrix.a, matrix.b) : null, parentBounds, viewportBounds, uncoveredEdgePx, navigating: s.navigating, location: s.location.id, depth: s.location.depth, childOpacity: document.querySelector('.transition-scene') ? Number(getComputedStyle(document.querySelector('.transition-scene')).opacity) : null };
    };
    window.startSpectrumRecording = () => {
      const start = performance.now();
      let started = false; let idle = 0;
      window.spectrumRecording = { frames: [], targets: {}, done: false, startedAt: start };
      const tick = () => {
        const frame = read();
        if (frame.progress !== null || frame.localProgress !== null || frame.navigating) { started = true; idle = 0; }
        if (started) {
          window.spectrumRecording.frames.push(frame);
          for (const target of targets) {
            if (frame.progress !== null && frame.progress >= target && !window.spectrumRecording.targets[target]) {
              window.spectrumRecording.targets[target] = { ...frame, html: document.querySelector('.app-shell').outerHTML };
            }
          }
          if (!frame.navigating && frame.progress === null && frame.localProgress === null) idle += 1;
          if (idle >= 4) { window.spectrumRecording.done = true; return; }
        }
        if (performance.now() - start > 20000) { window.spectrumRecording.done = true; return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    window.spectrumStyles = [...document.styleSheets].map(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).join('\n'); } catch { return ''; } }).join('\n');
  }, TARGETS);
}
function assertPullback(recording, name, expectedLegs = 8) {
  const frames = recording.frames.filter(frame => frame.progress !== null);
  assert(frames.length >= 30, `${name}: camera has enough actual rendered samples`);
  assert.equal(frames[0].progress, 0, `${name}: journey starts at its exact source`);
  assert.equal(frames.at(-1).progress, 1, `${name}: journey reaches its exact destination`);
  assert(frames.every(frame => frame.length === expectedLegs), `${name}: one route includes all requested layers`);
  assert.equal(frames[0].leg, 0);
  assert.equal(frames.at(-1).leg, expectedLegs - 1);
  const visitedLegs = [...new Set(frames.map(frame => frame.leg))];
  assert.deepEqual(visitedLegs, Array.from({ length: expectedLegs }, (_, i) => i), `${name}: every intervening map layer remains present during travel`);
  const first = recording.frames.indexOf(frames[0]);
  const last = recording.frames.indexOf(frames.at(-1));
  assert(recording.frames.slice(first, last + 1).every(frame => frame.progress !== null && frame.localProgress !== null), `${name}: no idle or missing-map frame between layers`);
  const interior = frames.filter(frame => frame.progress > 0.005 && frame.progress < 0.995);
  assert(interior.every(frame => frame.navigating), `${name}: controls stay in one uninterrupted journey`);
  assert(interior.every(frame => frame.childOpacity === 1), `${name}: the map remains opaque during the whole route`);
  assert(frames.every(frame => frame.uncoveredEdgePx !== null && frame.uncoveredEdgePx <= 0.1), `${name}: actual transformed parent geography covers the viewport without exposed background edges`);
  const steps = frames.slice(1).map((frame, i) => ({ from: frames[i], to: frame, dt: frame.time - frames[i].time, distance: Math.log(frames[i].scale / frame.scale) }));
  assert(steps.every(({ from, to }) => to.progress >= from.progress && to.scale <= from.scale + 1e-12), `${name}: worldward camera never reverses or restarts`);
  const midsteps = steps.filter(({ from, to }) => from.progress > 0.02 && to.progress < 0.98);
  // WebKit can deliver a catch-up recorder callback a few ms after a long paint,
  // before React commits another frame. Shorter than half a 60 Hz frame, it cannot be
  // a stationary displayed frame. Retain those raw observations but reject any
  // repeated ordinary frame.
  const catchUp = step => step.dt < 8;
  const catchUpObservations = midsteps.filter(step => step.distance === 0 && catchUp(step));
  assert(midsteps.every(step => step.distance > 0 || catchUp(step)), `${name}: no stationary display interval or stop at a layer boundary`);
  const boundaries = steps.filter(({ from, to }) => from.leg !== to.leg);
  const boundaryMetrics = boundaries.map(step => ({ from: step.from.leg, to: step.to.leg, progress: step.to.progress, intervalMs: step.dt, logVelocity: step.distance / step.dt }));
  assert.equal(boundaries.length, expectedLegs - 1);
  assert(boundaryMetrics.every(step => step.logVelocity > 0), `${name}: every layer handoff maintains forward camera motion`);
  // The global scale also has to agree with what the actual SVG camera rendered
  // inside each leg, rather than just exposing a smoothly increasing debug value.
  const cameraRatios = frames.filter(frame => frame.cameraScale !== null && frame.localScale !== null).map(frame => Math.abs(frame.cameraScale / frame.localScale - 1));
  assert(Math.max(...cameraRatios) < 0.0001, `${name}: declared local camera matches the real SVG transform`);
  const actualMotionErrors = steps.filter(({ from, to }) => from.leg === to.leg && from.localScale !== null && to.localScale !== null).map(step => Math.abs(step.distance - Math.log(step.from.localScale / step.to.localScale)));
  assert(Math.max(...actualMotionErrors) < 0.001, `${name}: global distance matches actual rendered camera travel`);
  const durationMs = frames.at(-1).time - frames[0].time;
  assert(durationMs < 6500 && durationMs > 1500, `${name}: one paced travel sequence, not eight independent animations`);
  return { renderedFrames: frames.length, durationMs, firstScale: frames[0].scale, lastScale: frames.at(-1).scale, visitedLegs, boundaries: boundaryMetrics, maximumFrameIntervalMs: Math.max(...steps.map(step => step.dt)), maximumActualMotionError: Math.max(...actualMotionErrors), maximumUncoveredEdgeCssPx: Math.max(...frames.map(frame => frame.uncoveredEdgePx)), catchUpObservations: catchUpObservations.map(step => ({ time: step.to.time, intervalMs: step.dt, progress: step.to.progress })), noIdleFrames: true, noMidrouteStops: true };
}
async function capturePullback(page, trigger, name, expectedLegs = 8) {
  const before = (await state(page)).demo.completedIds;
  await page.evaluate(() => window.startSpectrumRecording());
  await page.locator(trigger).tap();
  await at(page, 'knowledge');
  await page.waitForFunction(() => window.spectrumRecording.done, null, { timeout: 20000 });
  const recording = await page.evaluate(() => window.spectrumRecording);
  await writeFile(path.join(OUTPUT, `${name}-frames.json`), JSON.stringify({ frames: recording.frames }, null, 2));
  const summary = assertPullback(recording, name, expectedLegs);
  assert.deepEqual((await state(page)).demo.completedIds, before, `${name}: travel keeps saved marks`);
  await writeFile(path.join(OUTPUT, `${name}-frames.json`), JSON.stringify({ summary, frames: recording.frames }, null, 2));
  return { name, summary, selected: TARGETS.map(target => recording.targets[target]) };
}
async function renderStoryboard(browser, variant, capture, styles) {
  assert(capture.selected.every(Boolean), 'Every requested global journey sample was captured');
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const figures = [];
  for (let i = 0; i < capture.selected.length; i += 1) {
    const frame = capture.selected[i];
    const file = `${capture.name}-${i}.png`;
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${URL}/"><style>${styles}\n*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body><div id="root">${frame.html}</div></body></html>`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUTPUT, file) });
    figures.push(`<figure><figcaption>${Math.round(TARGETS[i] * 100)}% · layer ${frame.leg + 1}/${frame.length}</figcaption><img src="${file}"/></figure>`);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#e9ede7;color:#16211c;font:14px system-ui}h1{font-size:22px}.frames{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}figure{margin:0}figcaption{margin-bottom:8px}img{width:100%;border:1px solid #aab8ad}</style></head><body><h1>${capture.name}</h1><p>Actual requestAnimationFrame samples from a continuous eight-layer return to the world.</p><div class="frames">${figures.join('')}</div></body></html>`;
  const file = path.join(OUTPUT, `${capture.name}-storyboard.html`);
  await writeFile(file, html);
  await page.setViewportSize({ width: variant.mobile ? 1900 : 2700, height: 1000 });
  await page.goto(`file://${file}`);
  await page.setViewportSize({ width: variant.mobile ? 1900 : 2700, height: Math.ceil(await page.locator('body').evaluate(el => el.getBoundingClientRect().height)) });
  await page.screenshot({ path: path.join(OUTPUT, `${capture.name}-storyboard.png`), fullPage: true });
  await context.close();
}

async function journey(variant) {
  const browser = await ({ chromium, webkit }[variant.engine]).launch({ headless: true });
  const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true, deviceScaleFactor: 1 });
  await context.addInitScript(({ leaf, demo, learning, sentinel }) => {
    if (!localStorage.getItem(demo)) localStorage.setItem(demo, JSON.stringify({ version: 1, completedIds: [leaf], locationId: leaf }));
    if (!localStorage.getItem(learning)) localStorage.setItem(learning, sentinel);
  }, { leaf: LEAF, demo: DEMO_KEY, learning: LEARNING_KEY, sentinel: LEARNING_SENTINEL });
  const page = await context.newPage();
  const report = { variant: variant.name, engine: variant.engine, browserVersion: browser.version(), viewport: variant.viewport, colorsOnly: !!process.env.MOK_COLORS_ONLY, motion: [], resize: null, colors: null, reducedMotion: null, errors: [], passed: false };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  try {
    await page.goto(URL);
    await at(page, LEAF);
    if (process.env.MOK_COLORS_ONLY) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator(HOME).tap();
      await at(page, 'knowledge');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    } else {
    await installRecorder(page);
    const capture = await capturePullback(page, HOME, `${variant.name}-brand-return`);
    report.motion.push(capture.summary);
    await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-world.png`) });
    const styles = await page.evaluate(() => window.spectrumStyles);
    await renderStoryboard(browser, variant, capture, styles);

    // The other public way back where the trail shows its ancestors (wide screens): "All knowledge".
    await searchTo(page, LEAF);
    if (await page.locator(WORLD_TRAIL).isVisible()) {
      const trail = await capturePullback(page, WORLD_TRAIL, `${variant.name}-trail-return`);
      report.motion.push({ name: 'trail-return', ...trail.summary });
    } else {
      await page.locator(HOME).tap();
      await at(page, 'knowledge');
    }

    // Economics has off-center nested regions that previously exposed a narrow
    // background strip when a smooth camera curve overshot its legal bounds.
    await page.locator('[data-action="open-menu"]').tap();
    await page.locator('[data-action="open-backup"]').tap();
    await page.locator('.subject-ledger button').filter({ hasText: 'Economics' }).tap();
    await at(page, ECONOMICS_LEAF);
    const economics = await capturePullback(page, HOME, `${variant.name}-economics-return`);
    report.motion.push({ name: 'economics-return', ...economics.summary });
    await renderStoryboard(browser, variant, economics, styles);

    await searchTo(page, LEAF);
    await page.locator(HOME).tap();
    await page.waitForFunction(() => Number(document.querySelector('.map-system').getAttribute('data-journey-leg')) >= 2);
    const beforeResize = await page.locator('.map-system').getAttribute('data-journey-progress');
    const resizedViewport = variant.mobile ? { width: 844, height: 390 } : { width: 390, height: 844 };
    await page.setViewportSize(resizedViewport);
    assert((await state(page)).navigating, 'A real viewport resize must keep the active route moving');
    const afterResize = await page.locator('.map-system').getAttribute('data-journey-progress');
    assert(afterResize !== null && Number(afterResize) >= Number(beforeResize), 'A viewport resize must not restart or complete the journey');
    await at(page, 'knowledge');
    const mapBounds = await page.locator('.map-viewport').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, stage: el.closest('.atlas-stage').getBoundingClientRect().width, viewBox: el.getAttribute('viewBox'), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    assert.equal(mapBounds.overflow, false);
    // Wide screens give the workspace a sidebar; the map fills whatever stage the new size leaves it.
    assert(mapBounds.width <= resizedViewport.width && Math.abs(mapBounds.width - mapBounds.stage) < 1 && Number(mapBounds.viewBox.split(' ')[2]) === Math.round(mapBounds.width), `Resized map uses the current viewport: ${JSON.stringify(mapBounds)}`);
    assert.deepEqual((await state(page)).demo.completedIds, [LEAF]);
    await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-midroute-resize.png`) });
    report.resize = { from: variant.viewport, to: resizedViewport, beforeProgress: Number(beforeResize), afterProgress: Number(afterResize), mapBounds, destination: 'knowledge' };
    await page.setViewportSize(variant.viewport);
    await page.waitForTimeout(100);

    // A changed motion preference should skip the complete journey, not run eight
    // short hops with intermediate location commits and a flashing leaf panel.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let started = Date.now();
    await searchTo(page, LEAF);
    const inwardMs = Date.now() - started;
    started = Date.now();
    await page.locator(HOME).tap();
    await at(page, 'knowledge');
    const outwardMs = Date.now() - started;
    assert(inwardMs < 1000 && outwardMs < 1000, 'Reduced motion must immediately resolve the requested final destination');
    assert.equal(await page.locator('.transition-scene').count(), 0);
    report.reducedMotion = { inwardMs, outwardMs, completedIds: (await state(page)).demo.completedIds };
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    }

    // Color-preview assertions are added after root confirms the public controls.
    if (!process.env.MOK_MOTION_ONLY) report.colors = await verifyPreview(page, variant);

    const saved = await storage(page);
    assert.deepEqual(JSON.parse(saved.demo).completedIds, [LEAF]);
    assert.equal(saved.learning, LEARNING_SENTINEL);
    assert.deepEqual(report.errors, []);
    report.passed = true;
    console.log(`${variant.name}: ${process.env.MOK_COLORS_ONLY ? 'color preview' : 'spectrum and uninterrupted return'} checks passed`);
  } catch (error) {
    report.failure = error.stack || String(error);
    report.finalState = await state(page).catch(() => null);
    await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-failure.png`) }).catch(() => {});
    throw error;
  } finally {
    await writeFile(path.join(OUTPUT, `report-${variant.name}${process.env.MOK_COLORS_ONLY ? '-colors' : ''}.json`), JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
}

async function verifyPreview(page, variant) {
  const before = await storage(page);
  const beforeGeometry = await geometry(page);
  const beforeState = await state(page);
  assert.deepEqual(beforeState.preview, { enabled: false, mode: 'off', sampleIds: beforeState.preview.sampleIds });
  const control = page.locator('.spectrum-toggle');
  assert.equal(await control.count(), 0, 'The map carries no preview switch while the preview is off');
  const gradients = await page.locator('.map-viewport linearGradient').evaluateAll(elements => elements.map(el => ({ id: el.id, stops: [...el.querySelectorAll('stop')].map(stop => getComputedStyle(stop).stopColor) })));
  assert(gradients.some(gradient => new Set(gradient.stops).size > 1), 'Normal territory outlines use a real multi-color spectrum');
  const borders = await page.locator('[data-border-namespace="idle"] .territory-color-edges [data-border-owner]').evaluateAll(elements => elements.map(el => {
    const id = el.getAttribute('stroke')?.match(/^url\(#(.+)\)$/)?.[1];
    const gradient = id ? document.getElementById(id) : null;
    return { owner: el.getAttribute('data-border-owner'), stops: gradient ? [...gradient.querySelectorAll('stop')].map(stop => getComputedStyle(stop).stopColor) : [] };
  }));
  assert.equal(borders.length, 8, 'All world territories expose their own gradient outline');
  assert(borders.every(border => new Set(border.stops).size >= 2), 'Every displayed territory border references a valid multi-stop color gradient');
  await previewOn(page);
  await page.waitForTimeout(200);
  assert.equal(await control.getAttribute('role'), 'switch');
  assert.equal(await control.getAttribute('aria-checked'), 'true');
  assert.equal((await state(page)).preview.mode, 'sample');
  const sampleIds = (await state(page)).preview.sampleIds;
  assert(new Set(sampleIds).size >= 3, 'Preview contains several example colored territories');
  const previewIds = await page.locator('[data-preview-id]').evaluateAll(elements => elements.map(el => el.getAttribute('data-preview-id')));
  assert(previewIds.length >= 3, 'Sample preview visibly paints several pieces');
  assert.equal(await page.locator('[data-preview-id].is-complete, [data-preview-id].completion-marker').count(), 0, 'Preview pieces do not pretend to be earned completion marks');
  await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-preview-world.png`) });
  assert.deepEqual(await storage(page), before, 'Preview must never change completion or earlier-learning save bytes');
  assert.deepEqual(await geometry(page), beforeGeometry, 'Preview must preserve map geometry and real completion footprints');

  await page.locator('[data-action="preview-all"]').tap();
  assert.equal((await state(page)).preview.mode, 'all');
  assert.equal(await page.locator('[data-action="preview-all"]').getAttribute('aria-pressed'), 'true');
  const allCount = await page.locator('[data-preview-id]').count();
  assert(allCount >= previewIds.length, 'Whole-map color preview covers at least the sample area');
  await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-preview-all-world.png`) });
  assert.deepEqual(await storage(page), before);
  assert.deepEqual(await geometry(page), beforeGeometry);

  // Palette identity survives navigation and uses distinct subfield colors.
  await tapRegion(page, 'knowledge.science');
  const scienceState = await state(page);
  assert.equal(scienceState.preview.mode, 'all');
  assert(new Set(scienceState.regions.map(region => region.color)).size >= 3, 'Science children have distinct related colors rather than one inherited green');
  await page.screenshot({ path: path.join(OUTPUT, `${variant.name}-preview-all-science.png`) });
  await control.tap();
  assert.equal((await state(page)).preview.enabled, false);
  assert.equal(await page.locator('[data-preview-id]').count(), 0);
  assert.deepEqual((await state(page)).demo.completedIds, beforeState.demo.completedIds);
  await page.locator('[data-action="parent-return"]').tap();
  await at(page, 'knowledge');

  await previewOn(page);
  await page.locator('[data-action="preview-all"]').tap();
  await page.locator('[data-action="preview-sample"]').tap();
  assert.equal((await state(page)).preview.mode, 'sample');
  await control.tap();
  await page.waitForTimeout(200);
  assert.deepEqual(await storage(page), before);
  assert.deepEqual(await geometry(page), beforeGeometry);
  assert.equal(await control.count(), 0, 'Switching the preview off takes its switch off the map');
  await previewOn(page);
  await page.reload();
  await at(page, 'knowledge');
  assert.equal((await state(page)).preview.mode, 'off', 'Temporary color preview resets on reload');
  assert.equal(await page.locator('[data-preview-id]').count(), 0);
  assert.deepEqual(await storage(page), before);
  return { saveBytesPreserved: true, geometryPreserved: true, previewIds, allPreviewPathCount: allCount, gradientCount: gradients.length, borders, scienceColors: scienceState.regions.map(region => ({ name: region.name, color: region.color })), resetsOnReload: true };
}

const results = await Promise.allSettled(VARIANTS.filter(variant => !process.env.MOK_SPECTRUM_ENGINE || variant.engine === process.env.MOK_SPECTRUM_ENGINE).map(journey));
for (const result of results) if (result.status === 'rejected') console.error(result.reason);
if (results.some(result => result.status === 'rejected')) process.exitCode = 1;
