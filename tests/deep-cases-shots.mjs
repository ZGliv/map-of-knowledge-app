// Plays every new case of the physics, music and history places as a field mission, in a real
// browser at phone size, and keeps a still of each step: the case as it opens, the call made, the
// run, and the outcome. Earlier cases are marked played (missed, long ago) so each mission opens
// the next one. The winning call is worked out in the page from the engine, never typed. Fails on
// console errors, sideways scroll, or a case that does not judge the engine's own winning call right.
//
//   node tests/deep-cases-shots.mjs            (MOK_URL=http://127.0.0.1:5247 OUT=output/deep-cases)
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5247';
const OUT = process.env.OUT || 'output/deep-cases';
const PLACES = {
  physics: 'knowledge.science.physics.mechanics.motion.acceleration',
  music: 'knowledge.arts.music.harmony',
  history: 'knowledge.humanities.history.medieval-world.black-death',
};
const LONG_AGO = '2026-08-01T12:00:00.000Z';
const problems = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });

async function shot(name, full = false) {
  let style;
  if (full) style = await page.addStyleTag({ content: 'html,body,#root{overflow:visible!important;height:auto!important}.expedition-shell{position:absolute!important;inset:0 0 auto 0!important;min-height:100vh;overflow:visible!important}' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  if (style) await style.evaluate(el => el.remove());
}

async function overflow(label) {
  const wide = await page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('.mission-shell')].map(s => s.scrollWidth - s.clientWidth)));
  if (wide > 0) problems.push(`${label}: sideways scroll ${wide}px`);
}

await mkdir(OUT, { recursive: true });
await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
for (const [place, nodeId] of Object.entries(PLACES)) {
  const ids = await page.evaluate(async nodeId => (await import('/src/cases/index.ts')).casesFor(nodeId).map(c => c.id), nodeId);
  if (ids.length < 3) problems.push(`${place}: ${ids.length} cases`);
  for (const [k, id] of ids.entries()) {
    const played = ids.slice(0, k).map((c, i) => ({ t: 'case', id: `seed-${place}-${i}`, session: `seed-${place}-${i}`, node: nodeId, case: c, answer: { pick: 'x' }, success: false, via: 'mission', ms: 1000, at: LONG_AGO }));
    await page.evaluate(ledger => localStorage.setItem('mok-checks-v1', JSON.stringify(ledger)), { version: 1, events: played, other: [] });
    await page.goto('about:blank');
    await page.goto(`${URL}/#/mission/${nodeId}`, { waitUntil: 'domcontentloaded' });
    const shown = await page.locator('.mission-shell [data-case]').getAttribute('data-case', { timeout: 15000 }).catch(() => null);
    if (shown !== id) { problems.push(`${place} case ${k + 1}: the mission opened ${shown}, not ${id}`); continue; }
    const name = `${place}-${k + 1}`;
    await shot(`${name}-a-opens`);
    await overflow(`${name} opens`);
    const plan = await page.evaluate(async id => {
      const { caseById } = await import('/src/cases/index.ts');
      const { runCase, wins } = await import('/src/cases/engines.ts');
      const c = caseById(id).case, truth = runCase(c).truth;
      if (c.call.kind === 'pick') return { pick: c.call.options.find(o => wins(c.call, truth, { pick: o.id })).id };
      const { min, step } = c.call;
      return { value: Number((min + Math.round((truth.value - min) / step) * step).toFixed(6)) };
    }, id);
    if (plan.pick) await page.locator(`[data-case-option="${plan.pick}"]`).click();
    else await page.locator('[data-case-set]').evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, plan.value);
    await page.locator('[data-action="case-run"]').scrollIntoViewIfNeeded();
    await shot(`${name}-b-call`);
    await page.locator('[data-action="case-run"]').click();
    await page.waitForTimeout(1300);
    await page.locator('.case__picture').scrollIntoViewIfNeeded();
    await shot(`${name}-c-running`);
    await page.locator('[data-case-phase="done"]').waitFor();
    await page.waitForTimeout(1800);
    const verdict = await page.locator('[data-case-result]').getAttribute('data-case-result');
    if (verdict !== 'right') problems.push(`${name}: the engine's own winning call was judged ${verdict}`);
    await page.locator('.case__picture').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await shot(`${name}-d-outcome`);
    await shot(`${name}-e-whole`, true);
    await overflow(`${name} outcome`);
    console.log(`ok  ${name} ${id}`);
  }
}
await browser.close();
for (const e of errors) problems.push(`console: ${e}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Every case played right; stills in ${OUT}/`);
