// Demo coloring, end to end, on a phone in Chromium and WebKit: each subject's deep sample (from
// Backup & settings) colors exactly its depth-eight leaf, which shrinks to a beacon under 2 CSS px²
// at the world in its own leaf color; eight subjects keep eight colors; reload, same-leaf import,
// landscape, export, undo, reset and re-import keep exactly those leaves; the earlier learning save
// is never touched. Plus a desktop-to-phone resize on the way to a deep leaf.
//
//   MOK_URL=http://127.0.0.1:5221 node tests/prototype-journey.mjs     (MOK_ENGINE=chromium|webkit)
//
// Reports and screenshots go to output/playwright/prototype/.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5221';
const HOME = '[data-action="brand-home"]';
// The local AI guide is not part of this check; its 502s are the dev proxy, not the app.
const guideOffline = text => /502 \(Bad Gateway\)/.test(text);
const OUTPUT = 'output/playwright/prototype';
const DEMO_KEY = 'mok-next.demo-progress.v1';
const LEARNING_KEY = 'mok-next.save.v1';
const LEARNING_SENTINEL = '{"test":"Earlier learning data must remain byte-for-byte unchanged"}';
const viewport = { width: 390, height: 844 };
await mkdir(OUTPUT, { recursive: true });

const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function at(page, id) {
  await page.waitForFunction(expected => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return !s.navigating && (!expected || s.location.id === expected);
  }, id, { timeout: 35000 });
}
const tap = locator => locator.tap({ timeout: 15000 });
async function screenshot(page, engine, name) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUTPUT}/${engine}-${name}.png`, fullPage: true, animations: 'disabled' });
}
async function settings(page) {
  await tap(page.locator('[data-action="open-menu"]'));
  await tap(page.locator('[data-action="open-backup"]'));
  await page.getByRole('dialog', { name: 'Your map and settings', exact: true }).waitFor();
}
async function closeSettings(page) { await tap(page.getByRole('button', { name: 'Close dialog', exact: true })); }
async function persisted(page, count) {
  await page.waitForFunction(({ key, expected }) => {
    const raw = localStorage.getItem(key);
    return raw && JSON.parse(raw).completedIds.length === expected;
  }, { key: DEMO_KEY, expected: count });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), LEARNING_KEY), LEARNING_SENTINEL);
}
async function markers(page) {
  return page.locator('.completion-marker').evaluateAll(elements => elements.map(el => {
    const shape = el.querySelector('.completion-fragment, .completion-core');
    const paint = shape ? getComputedStyle(shape).fill : '';
    const gradientId = paint.match(/#([^\s)"']+)/)?.[1];
    const gradient = gradientId ? document.getElementById(gradientId) : null;
    const stops = gradient ? [...gradient.querySelectorAll('stop')].map(stop => ({
      offset: stop.getAttribute('offset'), color: getComputedStyle(stop).stopColor,
    })) : [];
    return {
      id: el.getAttribute('data-completion-id'),
      estimatedArea: Number(el.getAttribute('data-estimated-area')),
      coreRadius: Number(el.getAttribute('data-core-radius')),
      color: stops.find(stop => Number(stop.offset) === .5)?.color ?? paint,
      fragment: !!el.querySelector('.completion-fragment'),
      ...(gradientId ? { paint, stops } : {}),
    };
  }));
}
async function hitArea(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, x: r.x, y: r.y };
  });
}
async function importText(page, text) {
  await settings(page);
  await tap(page.locator('summary').filter({ hasText: 'Import a demo map' }));
  await page.getByLabel('Demo map JSON', { exact: true }).fill(text);
  await tap(page.getByRole('button', { name: 'Import demo map', exact: true }));
}

async function journey(engine, browserType) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  const report = { engine, version: browser.version(), simulation: engine === 'webkit' ? 'Safari engine with an iPhone-sized touch viewport; not a physical iPhone' : 'Chromium with a phone-sized touch viewport', viewport, errors: [], checks: [], hitAreas: {}, passed: false };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: LEARNING_KEY, value: LEARNING_SENTINEL });
    assert.equal((await state(page)).mode, 'map-prototype');
    assert.equal((await state(page)).demo.mockOnly, true);
    assert.deepEqual((await state(page)).demo.completedIds, []);
    const samples = await page.evaluate(async () => {
      const { SAMPLE_TERRITORIES, sampleLeaf, samplePath } = await import('/src/core/sampleTerritories.ts');
      const { SUBJECT_THEMES, territoryColor } = await import('/src/core/territoryTheme.ts');
      return SAMPLE_TERRITORIES.map(s => {
        const id = sampleLeaf(s.subject);
        const color = document.createElement('span').style;
        color.color = territoryColor(id);
        return { subject: s.subject, id, path: samplePath(s.subject), ...SUBJECT_THEMES.find(theme => theme.key === s.subject), leafColor: color.color };
      });
    });
    assert.equal(new Set((await state(page)).regions.map(region => region.color)).size, 8);
    await screenshot(page, engine, '01-world');

    const technology = samples.find(sample => sample.subject === 'technology');
    await settings(page);
    const deepSample = page.locator('.subject-ledger button').filter({ hasText: technology.name });
    report.hitAreas.deepSample = await hitArea(deepSample);
    const start = Date.now();
    await tap(deepSample);
    await at(page, technology.id);
    report.initialJourneyMs = Date.now() - start;
    assert.equal((await state(page)).location.depth, 8);
    assert.equal((await state(page)).leaf, true);
    report.hitAreas.parentReturn = await hitArea(page.locator('[data-action="parent-return"]'));
    report.hitAreas.complete = await hitArea(page.locator('[data-action="complete-demo"]'));
    report.hitAreas.home = await hitArea(page.locator(HOME));
    await screenshot(page, engine, '02-deep-leaf');
    await tap(page.locator('[data-action="complete-demo"]'));
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).demo.completedHere);
    assert.deepEqual((await state(page)).demo.completedIds, [technology.id]);
    await persisted(page, 1);
    await screenshot(page, engine, '03-leaf-colored');
    await tap(page.locator('[data-action="see-piece"]'));
    await at(page, technology.path.at(-2));
    assert.equal(await page.locator('.map-cell.is-complete').count(), 1);
    assert.equal(await page.locator('.map-cell.is-complete').getAttribute('data-region-id'), technology.id);
    report.parentMarkers = await markers(page);
    report.parentFilledCell = await page.locator('.map-cell.is-complete').evaluate(el => ({ id: el.getAttribute('data-region-id'), fill: el.getAttribute('fill'), geometry: el.getAttribute('d') }));
    await screenshot(page, engine, '04-parent-exact-piece');
    await tap(page.locator(HOME));
    await at(page, 'knowledge');
    report.worldSingleMarker = (await markers(page))[0];
    assert.equal(report.worldSingleMarker.id, technology.id);
    assert.equal(report.worldSingleMarker.color, technology.leafColor, 'World beacon retains its leaf palette, not just a distinct SVG paint ID');
    assert(report.worldSingleMarker.estimatedArea > 0 && report.worldSingleMarker.estimatedArea < 2, 'A depth-eight piece has a tiny true world footprint');
    assert.equal(await page.locator('.map-cell.is-complete').count(), 0, 'The world territory must remain unfilled');
    await screenshot(page, engine, '05-world-one-piece');
    await page.reload();
    await at(page, 'knowledge');
    assert.deepEqual((await state(page)).demo.completedIds, [technology.id]);
    report.checks.push('The deep sample reaches depth 8; only its exact leaf fills; world projection remains below 2 CSS pixels squared; reload retains the mark');
    console.log(`${engine}: depth-eight exact coloring and reload passed`);

    for (const sample of samples.filter(sample => sample.subject !== 'technology')) {
      await settings(page);
      await tap(page.locator('.subject-ledger button').filter({ hasText: sample.name }));
      await at(page, sample.id);
      assert.equal((await state(page)).location.depth, 8);
      await tap(page.locator('[data-action="complete-demo"]'));
      await page.waitForFunction(id => JSON.parse(window.render_game_to_text()).demo.completedIds.includes(id), sample.id);
      console.log(`${engine}: ${sample.name} sample completed`);
    }
    const ids = samples.map(sample => sample.id);
    assert.deepEqual([...(await state(page)).demo.completedIds].sort(), [...ids].sort());
    await persisted(page, 8);
    await page.reload();
    await at(page, samples.at(-1).id);
    assert((await state(page)).demo.completedHere);

    // Same-leaf imports must keep the saved location and reopen the completed sample.
    const sameLeafExport = await page.evaluate(key => localStorage.getItem(key), DEMO_KEY);
    await importText(page, sameLeafExport);
    await at(page, samples.at(-1).id);
    assert((await state(page)).demo.completedHere);
    await page.setViewportSize({ width: 844, height: 390 });
    await screenshot(page, engine, '06-landscape-leaf');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, 'Landscape viewport must not overflow horizontally');
    await tap(page.locator('[data-action="see-piece"]'));
    await at(page, samples.at(-1).path.at(-2));
    await tap(page.locator('[data-action="parent-return"]'));
    await at(page, samples.at(-1).path.at(-3));
    await page.setViewportSize(viewport);
    await tap(page.locator(HOME));
    await at(page, 'knowledge');
    report.worldMarkers = await markers(page);
    assert.equal(report.worldMarkers.length, 8);
    assert.equal(new Set(report.worldMarkers.map(marker => marker.color)).size, 8);
    for (const marker of report.worldMarkers) {
      assert.equal(marker.color, samples.find(sample => sample.id === marker.id).leafColor);
    }
    assert(report.worldMarkers.every(marker => marker.estimatedArea > 0 && marker.estimatedArea < 2));
    assert.equal(await page.locator('.map-cell.is-complete').count(), 0);
    await screenshot(page, engine, '07-world-eight-colors');
    report.checks.push('All eight subject routes reach distinct depth-eight leaves and retain eight distinct colors; no ancestors become completed');
    report.checks.push('Same-leaf import, leaf-location reload, landscape resize, and touch parent/home return work');

    await settings(page);
    const downloadPromise = page.waitForEvent('download');
    await tap(page.getByRole('button', { name: 'Export demo map', exact: true }));
    const download = await downloadPromise;
    const downloadPath = `${OUTPUT}/${engine}-export.json`;
    await download.saveAs(downloadPath);
    const exported = await readFile(downloadPath, 'utf8');
    assert.deepEqual([...JSON.parse(exported).completedIds].sort(), [...ids].sort());
    assert.equal('evidence' in JSON.parse(exported), false);
    await tap(page.locator('.subject-ledger button').filter({ hasText: 'Technology' }));
    await at(page, technology.id);
    await tap(page.locator('[data-action="undo-demo"]'));
    await persisted(page, 7);
    assert(!(await state(page)).demo.completedHere);
    await settings(page);
    await tap(page.locator('summary').filter({ hasText: 'Reset demo coloring' }));
    await tap(page.getByRole('button', { name: 'Clear demo marks…', exact: true }));
    await tap(page.getByRole('button', { name: 'Clear 7 demo marks', exact: true }));
    await persisted(page, 0);
    await closeSettings(page);
    await importText(page, exported);
    await at(page, 'knowledge');
    await persisted(page, 8);
    await page.reload();
    await at(page, 'knowledge');
    assert.deepEqual([...(await state(page)).demo.completedIds].sort(), [...ids].sort());
    await screenshot(page, engine, '08-restored-export');
    report.checks.push('JSON download, undo, reset, re-import, and reload preserve exact demo leaves and never alter separate learning storage');
    assert.deepEqual(report.errors, []);
    // The top bar's back button is a deliberate 36 px circle (components/shell.css); it is
    // recorded in the report, not held to the 44 px rule the primary controls meet.
    for (const [name, area] of Object.entries(report.hitAreas).filter(([name]) => name !== 'parentReturn')) {
      assert(area.width >= 44 && area.height >= 44, `${name} touch target is at least 44 by 44 CSS pixels`);
    }
    report.checks.push('Primary and home touch targets measure at least 44 by 44 CSS pixels; no browser console or page errors');
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error);
    report.finalState = await state(page).catch(() => null);
    await screenshot(page, engine, 'failure').catch(() => {});
    throw error;
  } finally {
    await writeFile(`${OUTPUT}/report-${engine}.json`, JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
  console.log(`${engine}: all prototype journey checks passed`);
  return report;
}

async function resizeRegression(engine, browserType) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  const report = { engine, from: { width: 1440, height: 900 }, to: viewport, passed: false, errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await page.setViewportSize(viewport);
    await settings(page);
    await tap(page.locator('.subject-ledger button').filter({ hasText: 'Technology' }));
    await page.waitForFunction(() => {
      const s = JSON.parse(window.render_game_to_text());
      return s.leaf && s.location.depth === 8 && !s.navigating;
    }, null, { timeout: 35000 });
    report.finalState = await state(page);
    assert.deepEqual(report.errors, []);
    await screenshot(page, engine, '09-desktop-to-phone-regression');
    report.passed = true;
    console.log(`${engine}: desktop-to-phone resize regression passed`);
  } catch (error) {
    report.failure = error.stack || String(error);
    report.finalState = await state(page).catch(() => null);
    throw error;
  } finally {
    await writeFile(`${OUTPUT}/report-${engine}-resize.json`, JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
}

const results = await Promise.allSettled(Object.entries({ chromium, webkit })
  .filter(([engine]) => !process.env.MOK_ENGINE || engine === process.env.MOK_ENGINE)
  .map(async ([engine, type]) => {
    if (!process.env.MOK_RESIZE_ONLY) await journey(engine, type);
    await resizeRegression(engine, type);
  }));
for (const result of results) if (result.status === 'rejected') console.error(result.reason);
if (results.some(result => result.status === 'rejected')) process.exitCode = 1;
