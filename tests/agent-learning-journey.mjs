import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const BASE = process.env.MOK_URL || 'http://127.0.0.1:5178';
const OUTPUT = 'output/playwright/agent-learning';
const KEY = 'mok-learner-v1';
const NOTEBOOK_KEY = 'mok-notebook-v1';
const OLD_KEY = 'mok-next.save.v1';
await mkdir(OUTPUT, { recursive: true });
const report = { startedAt: new Date().toISOString(), url: BASE, hookChecks: [], journeys: [] };
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const persisted = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
async function settled(page, locationId) {
  await page.waitForFunction(expected => { if (!window.render_game_to_text) return false; const current = JSON.parse(window.render_game_to_text()); return !current.navigating && (!expected || current.location.id === expected); }, locationId, { timeout: 35000 });
}
async function shot(page, name) {
  await page.screenshot({ path: `${OUTPUT}/${name}.png`, fullPage: true, animations: 'disabled' });
}
async function closeDialog(page) {
  const close = page.getByRole('button', { name: 'Close dialog', exact: true });
  if (await close.isVisible()) await close.click();
}
async function settings(page) {
  await closeDialog(page);
  await page.locator('[data-action="open-menu"]').click();
  await page.locator('[data-action="open-backup"]').click();
  await page.getByRole('dialog', { name: 'Your map and settings', exact: true }).waitFor();
}
async function library(page) {
  await closeDialog(page);
  // The list of discoveries and expeditions lives in Explore, behind its Lessons switch.
  const sidebar = page.locator('[data-action="open-explore"]');
  if (await sidebar.isVisible()) await sidebar.click();
  else await page.locator('[data-action="open-explore-mobile"]').click();
  await page.locator('.explore-workspace:not(.is-hidden) [data-action="explore-list"]').click();
  await page.locator('.explore-workspace:not(.is-hidden) [data-workspace="discoveries"]').waitFor();
}
async function openDiscovery(page, discovery) {
  await library(page);
  await page.locator(`.learnable[data-learnable-id="${discovery.id}"] [data-action="discoveries-open"]`).click();
  await page.locator(`.learning-expedition[data-discovery-id="${discovery.id}"][data-stage="intro"]`).waitFor();
}
async function stage(page, expected) { await page.locator(`.learning-expedition[data-stage="${expected}"]`).waitFor(); }
async function answer(page, challenge, correct = true) {
  await page.locator(`.learning-expedition[data-challenge-id="${challenge.id}"]`).waitFor();
  const answerId = correct ? challenge.correctId : challenge.choices.find(choice => choice.id !== challenge.correctId).id;
  const radio = page.locator(`[data-action="answer-choice"][data-choice-id="${answerId}"]`);
  await radio.check();
  await page.locator('[data-action="submit-answer"]').click();
  await page.locator(`.exp-feedback.${correct ? 'correct' : 'incorrect'}`).waitFor();
}
async function next(page) { await page.locator('[data-action="next-challenge"]').click(); }
async function beginAndPassProbe(page, discovery) {
  await page.locator('[data-action="start-expedition"]').click();
  await stage(page, 'probe');
  await answer(page, discovery.challenges[0]);
  await next(page);
  await stage(page, 'transfer');
}
async function completeAndMap(page, discovery, earned) {
  await next(page);
  await stage(page, 'complete');
  assert.equal((await state(page)).learning.earnedIds.includes(discovery.footprintId), earned);
  await page.locator('[data-action="complete-expedition"]').click();
  await settled(page, discovery.topicId);
  await page.getByRole('button', { name: 'Map of Knowledge home', exact: true }).click();
  await settled(page, 'knowledge');
  assert.equal((await state(page)).location.id, 'knowledge');
}

/** A real React hook fixture, served only by the development server. It tests
 * the same persistence hook as the app without adding production debug APIs. */
async function hookChecks(browser) {
  await writeFile(`${OUTPUT}/hook-fixture.html`, '<!doctype html><html><body><div id="fixture"></div><script type="module" src="./hook-fixture.tsx"></script></body></html>');
  await writeFile(`${OUTPUT}/hook-fixture.tsx`, `import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {useLearner} from '/src/core/useLearner';
import {DISCOVERIES} from '/src/core/discoveries';
function Fixture(){const memory=useLearner();window.__memory=memory;window.__discoveries=DISCOVERIES;return createElement('pre',{'data-hook-state':true},JSON.stringify({state:memory.learner,warning:memory.learnerWarning}));}
createRoot(document.getElementById('fixture')).render(createElement(Fixture));`);
  const context = await browser.newContext();
  const page = await context.newPage();
  const fixture = `${BASE}/${OUTPUT}/hook-fixture.html`;
  await page.goto(fixture);
  await page.waitForFunction(() => !!window.__memory);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    window.__restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(k, value) { if (k === key) throw new Error('Simulated storage quota'); return original.call(this, k, value); };
    window.__memory.update({ name: 'Unsaved learner', goal: 'Connect ideas across subjects.' });
  }, KEY);
  await page.waitForFunction(() => window.__memory.learner.profile.name === 'Unsaved learner');
  await page.evaluate(() => {
    const d = window.__discoveries[0], c = d.challenges[0];
    window.__memory.record({ discoveryId: d.id, challengeId: c.id, answerId: c.correctId, phase: 'probe', assisted: false });
    window.__memory.visit(window.__discoveries[1].id);
  });
  await page.waitForFunction(() => window.__memory.learner.visitedIds.length === 2);
  const unsaved = await page.evaluate(() => ({ data: JSON.parse(window.__memory.exportMemory()), warning: window.__memory.learnerWarning }));
  assert.equal(unsaved.data.profile.name, 'Unsaved learner');
  assert.equal(unsaved.data.attempts.length, 1);
  assert.match(unsaved.warning, /quota/i);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
  report.hookChecks.push('Failed first save retains profile, multiple in-memory actions, and exportable evidence.');
  await page.evaluate(() => {
    window.__restoreStorage();
    const d = window.__discoveries[0], c = d.challenges[1];
    window.__memory.record({ discoveryId: d.id, challengeId: c.id, answerId: c.correctId, phase: 'transfer', assisted: false });
  });
  await page.waitForFunction(() => !window.__memory.learnerWarning);
  assert.equal((await persisted(page)).profile.name, 'Unsaved learner');
  assert.equal((await persisted(page)).attempts.length, 2);
  report.hookChecks.push('A later successful write persists the entire unsaved session.');
  const second = await context.newPage();
  await second.goto(fixture);
  await second.waitForFunction(() => !!window.__memory);
  await page.evaluate(() => window.__memory.update({ name: 'Updated in another tab' }));
  await second.waitForFunction(() => window.__memory.learner.profile.name === 'Updated in another tab');
  await second.evaluate(() => {
    const d = window.__discoveries[1], c = d.challenges[0];
    window.__memory.record({ discoveryId: d.id, challengeId: c.id, answerId: c.correctId, phase: 'probe', assisted: false });
  });
  await page.waitForFunction(() => window.__memory.learner.attempts.length === 3);
  assert.equal((await persisted(page)).profile.name, 'Updated in another tab');
  report.hookChecks.push('Real browser storage events merge evidence across tabs without overwriting newer profile edits.');
  const before = await page.evaluate(() => window.__memory.exportMemory());
  const importError = await page.evaluate(() => { try { window.__memory.importMemory('{bad json'); return ''; } catch (error) { return error.message; } });
  assert.match(importError, /valid JSON/);
  assert.equal(await page.evaluate(() => window.__memory.exportMemory()), before);
  await page.evaluate(key => localStorage.setItem(key, 'preserve this unreadable history'), KEY);
  await second.waitForFunction(() => !!window.__memory.learnerWarning);
  await page.evaluate(() => {
    const d = window.__discoveries[1], c = d.challenges[1];
    window.__memory.record({ discoveryId: d.id, challengeId: c.id, answerId: c.correctId, phase: 'transfer', assisted: false });
  });
  await page.waitForFunction(() => window.__memory.learner.attempts.length === 4);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), 'preserve this unreadable history');
  await page.evaluate(raw => window.__memory.importMemory(raw), before);
  await page.waitForFunction(() => !window.__memory.learnerWarning);
  assert.equal((await persisted(page)).attempts.length, 4);
  const recoveries = await page.evaluate(key => Object.keys(localStorage).filter(k => k.startsWith(`${key}.recovery.`)).map(k => localStorage.getItem(k)), KEY);
  assert.deepEqual(recoveries, ['preserve this unreadable history']);
  report.hookChecks.push('Invalid imports are atomic; corrupt saved bytes are protected and copied before explicit recovery import.');
  await context.close();
}

async function journey(name, browserType, viewport) {
  const browser = await browserType.launch({ headless: true });
  const result = { name, browserVersion: browser.version(), viewport, simulation: name.includes('webkit') ? 'WebKit with phone viewport and touch emulation; not a physical iPhone' : 'Chromium desktop', checks: [], errors: [], passed: false };
  report.journeys.push(result);
  const context = await browser.newContext({ viewport, hasTouch: name.includes('webkit'), isMobile: name.includes('webkit'), acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  try {
    if (name === 'chromium-desktop') await hookChecks(browser);
    await page.goto(BASE);
    await settled(page);
    const discoveries = await page.evaluate(async () => (await import('/src/core/discoveries.ts')).DISCOVERIES);
    const notebookSentinel = JSON.stringify({ version: 1, entries: [] });
    const olderSentinel = 'Earlier learning history must not be rewritten by the new agent.';
    await page.evaluate(({ notebook, old }) => { localStorage.setItem('mok-notebook-v1', notebook); localStorage.setItem('mok-next.save.v1', old); }, { notebook: notebookSentinel, old: olderSentinel });
    assert.equal(discoveries.length, 9);
    assert.deepEqual((await state(page)).learning.earnedIds, []);
    await shot(page, `${name}-01-frontier`);

    for (const [index, discovery] of discoveries.entries()) {
      await openDiscovery(page, discovery);
      if (index === 0) {
        await page.locator('[data-action="start-expedition"]').click();
        await stage(page, 'probe');
        await shot(page, `${name}-02-probe`);
        await answer(page, discovery.challenges[0]);
        await next(page);
        await stage(page, 'transfer');
        await page.locator('[data-action="request-hint"]').click();
        assert.equal((await persisted(page)).attempts.at(-1).answerId, '');
        await answer(page, discovery.challenges[1]);
        assert.equal((await persisted(page)).attempts.at(-1).assisted, true);
        await next(page);
        await stage(page, 'complete');
        assert.equal((await state(page)).learning.earnedIds.includes(discovery.footprintId), false);
        await shot(page, `${name}-03-supported`);
        await closeDialog(page);
        await page.reload();
        await settled(page);
        await openDiscovery(page, discovery);
        await page.getByRole('button', { name: 'Continue where I left off', exact: true }).click();
        await stage(page, 'transfer');
        await page.locator(`.learning-expedition[data-challenge-id="${discovery.challenges[2].id}"]`).waitFor();
        await answer(page, discovery.challenges[2]);
        await next(page);
        await stage(page, 'complete');
        assert.equal((await state(page)).learning.earnedIds.includes(discovery.footprintId), true);
        await shot(page, `${name}-04-independent`);
        await page.locator('[data-action="complete-expedition"]').click();
        await settled(page, discovery.topicId);
        result.checks.push('Hint exposure persists after reload; supported work adds no color, and a genuinely fresh variant can earn the exact leaf.');
      } else {
        await beginAndPassProbe(page, discovery);
        if (discovery.subject === 'technology') {
          await answer(page, discovery.challenges[1], false);
          await answer(page, discovery.challenges[1]);
          assert.equal((await persisted(page)).attempts.at(-1).assisted, true);
          await next(page);
          await stage(page, 'complete');
          assert.equal((await state(page)).learning.earnedIds.includes(discovery.footprintId), false);
          await next(page);
          await answer(page, discovery.challenges[2]);
          result.checks.push('Wrong-answer feedback makes the revealed variant supported; its next distinct variant remains available.');
        } else await answer(page, discovery.challenges[1]);
        await completeAndMap(page, discovery, true);
      }
      assert.equal((await state(page)).learning.earnedIds.length, index + 1);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), notebookSentinel);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), OLD_KEY), olderSentinel);
      result.checks.push(`${discovery.title}: independent transfer earned ${discovery.footprintId}.`);
    }
    await page.getByRole('button', { name: 'Map of Knowledge home', exact: true }).click();
    await settled(page, 'knowledge');
    const beforeReload = (await state(page)).learning;
    assert.deepEqual(new Set(beforeReload.earnedIds), new Set(discoveries.map(discovery => discovery.footprintId)));
    const markers = await page.locator('.completion-marker').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-completion-id'), area: Number(element.getAttribute('data-estimated-area')) })));
    for (const discovery of discoveries) assert.ok(markers.some(marker => marker.id === discovery.footprintId), `Missing world footprint: ${discovery.id}`);
    assert.ok(markers.every(marker => Number.isFinite(marker.area) && marker.area > 0));
    result.markers = markers;
    await shot(page, `${name}-05-earned-world`);
    await page.reload();
    await settled(page);
    assert.deepEqual((await state(page)).learning.earnedIds, beforeReload.earnedIds);
    result.checks.push('All nine exact footprints remain after reload and are rendered together at world scale.');

    await settings(page);
    await page.locator('[data-action="open-memory"]').click();
    await page.locator('[data-action="profile-name"]').fill('Curious learner');
    await page.locator('[data-action="profile-goal"]').fill('Find connections between music, mathematics, and everyday decisions.');
    await page.locator('[data-action="save-profile"]').click();
    assert.equal((await state(page)).learning.profile.name, 'Curious learner');
    await shot(page, `${name}-06-memory`);
    await page.locator('summary').filter({ hasText: 'Export or restore your learning memory' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export learning memory', exact: true }).click();
    const download = await downloadPromise;
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(exported.profile.name, 'Curious learner');
    assert.equal(exported.attempts.length, (await persisted(page)).attempts.length);
    await page.getByRole('textbox', { name: 'Learning memory JSON', exact: true }).fill('{invalid');
    await page.getByRole('button', { name: 'Merge learning memory', exact: true }).click();
    await page.locator('.learner-memory [role="alert"]').waitFor();
    const count = (await persisted(page)).attempts.length;
    await page.getByRole('textbox', { name: 'Learning memory JSON', exact: true }).fill(JSON.stringify(exported));
    await page.getByRole('button', { name: 'Merge learning memory', exact: true }).click();
    assert.equal((await persisted(page)).attempts.length, count);
    result.checks.push('Editable memory, real downloadable backup, invalid-import feedback, and idempotent merge work in the interface.');
    await closeDialog(page);
    await library(page);
    assert.equal(await page.locator('.learnable[data-learnable-kind="discovery"]').count(), 9);
    assert.equal(await page.locator('.learnable[data-learnable-kind="discovery"] .learnable-status.is-understood').count(), 9);
    await shot(page, `${name}-07-library`);
    assert.deepEqual(result.errors, []);
    result.passed = true;
  } catch (error) {
    result.failure = error.stack || String(error);
    await shot(page, `${name}-failure`).catch(() => {});
    throw error;
  } finally {
    await context.close();
    await browser.close();
    await writeFile(`${OUTPUT}/report.json`, JSON.stringify(report, null, 2));
  }
}

try {
  if (process.env.MOK_ENGINE !== 'webkit') await journey('chromium-desktop', chromium, { width: 1440, height: 1000 });
  if (process.env.MOK_ENGINE !== 'chromium') await journey('webkit-phone', webkit, { width: 375, height: 812 });
  report.finishedAt = new Date().toISOString();
  await writeFile(`${OUTPUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, hookChecks: report.hookChecks.length, journeys: report.journeys.map(journey => ({ engine: journey.name, checks: journey.checks.length, passed: journey.passed })) }, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; }
