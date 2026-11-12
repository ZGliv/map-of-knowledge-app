import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const BASE = process.env.MOK_URL || 'http://127.0.0.1:5178'; // the dev server: cases import /src modules
const OUTPUT = 'output/playwright/agent-learning-regressions';
const KEY = 'mok-learner-v1';
const REPORT_FILE = `${OUTPUT}/${process.env.MOK_CASE ? `report-${process.env.MOK_CASE.replace(/[^a-z0-9-]/gi, '')}` : 'report'}.json`;
await mkdir(OUTPUT, { recursive: true });
const report = { startedAt: new Date().toISOString(), cases: [] };
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function ready(page) {
  await page.waitForFunction(() => window.render_game_to_text && !JSON.parse(window.render_game_to_text()).navigating);
}
// Settings and the guide live in the one menu; a discovery opens from its place's hub.
async function menu(page, action) {
  await page.locator('[data-action="open-menu"]').click();
  await page.locator(`[data-action="${action}"]`).click();
}
async function settings(page) {
  await menu(page, 'open-backup');
  await page.getByRole('dialog', { name: 'Your map and settings', exact: true }).waitFor();
}
async function begin(page) {
  const discovery = await page.evaluate(async () => (await import('/src/core/discoveries.ts')).DISCOVERIES[0]);
  await page.evaluate(id => { location.hash = `#/hub/${encodeURIComponent(id)}`; }, discovery.topicId);
  await page.locator('[data-action="hub-begin-discovery"]').first().click();
  await page.locator('[data-action="start-expedition"]').click();
  await page.locator('.learning-expedition[data-stage="probe"]').waitFor();
  return discovery;
}
async function answer(page, challenge) {
  await page.locator(`[data-action="answer-choice"][data-choice-id="${challenge.correctId}"]`).check();
  await page.locator('[data-action="submit-answer"]').click();
  await page.locator('.exp-feedback.correct').waitFor();
}
async function offlineRoute(page) {
  const requests = { get: 0, post: 0 };
  await page.route('**/api/guide', async route => {
    if (route.request().method() === 'GET') {
      requests.get++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: false, mode: 'offline', model: '', spentUsd: 0, limitUsd: 15, requests: 0, reason: 'This hosted demo has no AI provider connected. The authored discoveries and hints still work.' }) });
    } else {
      requests.post++;
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Unexpected POST in offline regression', code: 'offline' }) });
    }
  });
  return requests;
}
async function runCase(browser, engine, name, viewport, execute) {
  if (process.env.MOK_CASE && process.env.MOK_CASE !== name) return;
  const context = await browser.newContext({ viewport, hasTouch: engine === 'webkit', isMobile: engine === 'webkit' });
  const page = await context.newPage();
  const result = { engine, name, checks: [], errors: [], passed: false };
  report.cases.push(result);
  page.on('pageerror', error => result.errors.push(error.message));
  try {
    await execute(page, result);
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(`${engine}: ${name} passed`);
  } catch (error) {
    result.failure = error.stack || String(error);
    await page.screenshot({ path: `${OUTPUT}/${engine}-${name}-failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
  }
}

async function run(engine, browserType, viewport) {
  const browser = await browserType.launch({ headless: true });
  try {
    await runCase(browser, engine, 'promise-scroll-cleanup', viewport, async (page, result) => {
      await offlineRoute(page);
      await page.addInitScript(() => {
        const original = Element.prototype.scrollIntoView;
        window.__promiseScrollCount = 0;
        Element.prototype.scrollIntoView = function(...args) {
          original.apply(this, args);
          window.__promiseScrollCount++;
          return Promise.resolve();
        };
      });
      await page.goto(BASE);
      await ready(page);
      const initial = await state(page);
      const consoleErrors = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      for (let attempt = 0; attempt < 2; attempt++) {
        const before = await page.evaluate(() => window.__promiseScrollCount);
        await menu(page, 'open-guide');
        await page.getByRole('dialog', { name: 'Your learning guide', exact: true }).waitFor();
        await page.waitForFunction(count => window.__promiseScrollCount > count, before);
        assert.equal(await page.locator('.guide-message').count(), 0);
        await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
        await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).dialog === null);
        await ready(page);
        const after = await state(page);
        assert.equal(after.mode, 'map-prototype');
        assert.deepEqual(after.location, initial.location);
        assert.deepEqual(after.demo.completedIds, initial.demo.completedIds);
        assert.equal(await page.getByRole('button', { name: 'Map of Knowledge home', exact: true }).isVisible(), true);
        assert.equal(await page.getByRole('dialog').count(), 0);
      }
      assert.ok(await page.evaluate(() => window.__promiseScrollCount) >= 2);
      assert.deepEqual(consoleErrors, []);
      await page.screenshot({ path: `${OUTPUT}/${engine}-promise-scroll-closed.png`, fullPage: true, animations: 'disabled' });
      result.checks.push('Native scrollIntoView was overridden to return a Promise while still performing its scroll.', 'Opening and closing the empty guide twice leaves the atlas and original completion data intact.', 'React reports no effect cleanup error, warning, or page crash.');
    });
    await runCase(browser, engine, 'canonical-assistance', viewport, async (page, result) => {
      await offlineRoute(page);
      await page.goto(BASE);
      await ready(page);
      const discovery = await begin(page);
      await answer(page, discovery.challenges[0]);
      await page.locator('[data-action="next-challenge"]').click();
      await page.locator(`.learning-expedition[data-challenge-id="${discovery.challenges[1].id}"]`).waitFor();
      const visibleAttemptCount = (await state(page)).learning.attempts.length;
      const storedAttemptCount = await page.evaluate(async ({ key, discoveryId, challengeId }) => {
        const { parseLearner, recordAttempt, exportLearner } = await import('/src/core/learner.ts');
        const saved = parseLearner(localStorage.getItem(key));
        const updated = recordAttempt(saved, { discoveryId, challengeId, answerId: '', assisted: true, phase: 'transfer' });
        // Same-document storage writes intentionally do not dispatch a storage
        // event. This reproduces disk evidence that stale UI has not observed.
        localStorage.setItem(key, exportLearner(updated));
        return updated.attempts.length;
      }, { key: KEY, discoveryId: discovery.id, challengeId: discovery.challenges[1].id });
      assert.equal(storedAttemptCount, visibleAttemptCount + 1);
      assert.equal((await state(page)).learning.attempts.length, visibleAttemptCount);
      await answer(page, discovery.challenges[1]);
      const canonical = (await state(page)).learning;
      assert.deepEqual(canonical.earnedIds, []);
      assert.equal(canonical.attempts.at(-1).passed, true);
      assert.equal(canonical.attempts.at(-1).assisted, true);
      assert.match(await page.locator('.exp-support-label').innerText(), /worked through with support/i);
      await page.locator('[data-action="next-challenge"]').click();
      await page.locator('.learning-expedition[data-stage="complete"]').waitFor();
      assert.equal(await page.locator('.exp-complete h2').innerText(), 'Explored with support.');
      assert.equal(await page.locator('.exp-complete.is-earned').count(), 0);
      assert.equal(await page.locator('.exp-evidence-note strong').innerText(), 'Exploration saved');
      assert.deepEqual((await state(page)).learning.earnedIds, []);
      await page.screenshot({ path: `${OUTPUT}/${engine}-canonical-support.png`, fullPage: true, animations: 'disabled' });
      result.checks.push('Disk-only support was invisible to stale UI before submit.', 'The canonical saved event, feedback, completion wording, and map all agree that the attempt was supported.');
    });
    await runCase(browser, engine, 'late-evidence-reconciliation', viewport, async (page, result) => {
      await offlineRoute(page);
      await page.goto(BASE);
      await ready(page);
      const discovery = await begin(page);
      await answer(page, discovery.challenges[0]);
      await page.locator('[data-action="next-challenge"]').click();
      await page.locator(`.learning-expedition[data-challenge-id="${discovery.challenges[1].id}"]`).waitFor();
      await answer(page, discovery.challenges[1]);
      await page.locator('[data-action="next-challenge"]').click();
      await page.locator('.learning-expedition[data-stage="complete"]').waitFor();
      assert.deepEqual((await state(page)).learning.earnedIds, [discovery.footprintId]);
      assert.equal(await page.locator('.exp-complete h2').innerText(), 'A new piece of understanding.');
      const other = await page.context().newPage();
      try {
        await offlineRoute(other);
        await other.goto(BASE);
        await ready(other);
        await other.evaluate(async ({ key, discoveryId, challengeId }) => {
          const { parseLearner, recordAttempt, exportLearner } = await import('/src/core/learner.ts');
          const saved = parseLearner(localStorage.getItem(key));
          const completed = saved.attempts.find(event => event.discoveryId === discoveryId && event.challengeId === challengeId && event.passed);
          const updated = recordAttempt(saved, { discoveryId, challengeId, answerId: '', assisted: true, phase: 'transfer' });
          // An earlier support event reaches this tab late, after its completion
          // screen is already open. The actual storage event must reconcile it.
          updated.attempts.at(-1).at = new Date(Date.parse(completed.at) - 1).toISOString();
          localStorage.setItem(key, exportLearner(updated));
        }, { key: KEY, discoveryId: discovery.id, challengeId: discovery.challenges[1].id });
        await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).learning.earnedIds.length === 0);
        assert.equal(await page.locator('.exp-complete h2').innerText(), 'Explored with support.');
        assert.equal(await page.locator('.exp-complete.is-earned').count(), 0);
        assert.equal(await page.locator('.exp-evidence-note strong').innerText(), 'Exploration saved');
        await page.screenshot({ path: `${OUTPUT}/${engine}-late-reconciliation.png`, fullPage: true, animations: 'disabled' });
        result.checks.push('A completed screen initially showed a valid independent result.', 'A real storage event carrying earlier support reconciles both the earned footprint and the open success screen immediately.');
      } finally { await other.close(); }
    });
    await runCase(browser, engine, 'offline-coach', viewport, async (page, result) => {
      const requests = await offlineRoute(page);
      await page.goto(BASE);
      await ready(page);
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).learning.guide.available === false && JSON.parse(window.render_game_to_text()).learning.guide.mode === 'offline');
      await begin(page);
      const before = (await state(page)).learning.attempts.length;
      await page.locator('.exp-coach-toggle').click();
      await page.locator('.exp-coach-offline').waitFor();
      assert.equal(await page.locator('[data-action="guide-message"]').isDisabled(), true);
      assert.equal(await page.locator('[data-action="ask-guide"]').isDisabled(), true);
      assert.match(await page.locator('.exp-coach-offline').innerText(), /not connected/i);
      // The handler also protects programmatic submission; a disabled button
      // alone must not be the only barrier to recording fake help exposure.
      await page.locator('.exp-coach-body form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      assert.equal((await state(page)).learning.attempts.length, before);
      assert.ok(requests.get > 0);
      assert.equal(requests.post, 0);
      assert.equal(await page.locator('[data-action="request-hint"]').isEnabled(), true);
      await page.screenshot({ path: `${OUTPUT}/${engine}-offline-coach.png`, fullPage: true, animations: 'disabled' });
      result.checks.push('Offline status was supplied before app load.', 'Coach clearly reports disconnection and disables entry/submission.', 'Opening or submitting the disabled coach records no assistance and sends no POST; authored hints remain available.');
    });
    await runCase(browser, engine, 'cost-calculator', viewport, async (page, result) => {
      const requests = await offlineRoute(page);
      await page.goto(BASE);
      await ready(page);
      await settings(page);
      await page.locator('[data-action="open-economics"]').click();
      await page.getByRole('dialog', { name: 'Usage and cost', exact: true }).waitFor();
      const price = page.getByLabel('Monthly price ($)', { exact: true });
      const turns = page.getByLabel('AI turns per day', { exact: true });
      const inputRate = page.getByLabel('Input $ / million tokens', { exact: true });
      const outputRate = page.getByLabel('Output $ / million tokens', { exact: true });
      const values = () => page.locator('.economics-results strong').allTextContents();
      assert.equal(await price.inputValue(), '8');
      assert.equal(await turns.inputValue(), '10');
      assert.equal(await inputRate.inputValue(), '0.2');
      assert.equal(await outputRate.inputValue(), '1.2');
      assert.deepEqual(await values(), ['$0.54', '$7.46']);
      await page.screenshot({ path: `${OUTPUT}/${engine}-cost-average.png`, fullPage: true, animations: 'disabled' });
      await turns.fill('1000');
      assert.deepEqual(await values(), ['$54.00', '$-46.00']);
      assert.equal(await page.locator('.economics-results .cost-negative').count(), 1);
      await page.screenshot({ path: `${OUTPUT}/${engine}-cost-heavy.png`, fullPage: true, animations: 'disabled' });
      await inputRate.fill('0.5');
      await outputRate.fill('2');
      assert.deepEqual(await values(), ['$120.00', '$-112.00']);
      await turns.fill('5');
      await price.fill('10');
      assert.deepEqual(await values(), ['$0.60', '$9.40']);
      assert.equal(await page.locator('.economics-results .cost-negative').count(), 0);
      assert.match(await page.locator('.guide-economics').innerText(), /excludes hosting, storage, search, payment fees/i);
      assert.equal(requests.post, 0);
      result.checks.push('At $8/month and 10 turns/day: $0.54 AI estimate, $7.46 remaining after AI.', 'At 1,000 turns/day: $54 AI estimate, −$46 remaining after AI.', 'Editing both token rates, usage, and subscription price recomputes the actual formula; other costs remain disclosed.');
    });
  } finally { await browser.close(); }
}

try {
  if (process.env.MOK_ENGINE !== 'webkit') await run('chromium', chromium, { width: 1440, height: 1000 });
  if (process.env.MOK_ENGINE !== 'chromium') await run('webkit', webkit, { width: 390, height: 844 });
  report.finishedAt = new Date().toISOString();
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, cases: report.cases.length }, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; }
