// Proving by doing, in a real browser at phone size: a new case at the end of an expedition (set up,
// running, the map lighting), a miss, a field mission that lights a skipped place, and the Lasting
// mission a week later.
//
//   MOK_URL=http://127.0.0.1:5226 node tests/prove-journey.mjs     (needs the dev server: it imports /src modules)
// Writes output/prove/<nn>-<step>.png and output/prove/contact-sheet.png.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5226';
const OUT = path.resolve(process.env.OUT || 'output/prove');
const EVOLUTION = 'knowledge.science.biology.evolution';
const E04 = `${EVOLUTION}.chance-drift`;
const E10 = `${EVOLUTION}.evolution-now`;
const E11 = `${EVOLUTION}.sexual-selection`;
const DAY = 864e5;
const T0 = Date.parse('2026-10-17T15:00:00Z');
await mkdir(OUT, { recursive: true });

const log = (...args) => console.log(...args);
const shots = [];
const expectThat = (ok, message) => { if (!ok) throw new Error(`Expectation failed: ${message}`); log(`  ok: ${message}`); };
async function visit(page, hash = '') { await page.goto('about:blank'); await page.goto(`${URL}/${hash}`, { waitUntil: 'domcontentloaded' }); }
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}'));

async function shot(page, name, { full = false, wait = 450 } = {}) {
  const file = path.join(OUT, `${String(shots.length + 1).padStart(2, '0')}-${name}.png`);
  let style = null;
  if (full) style = await page.addStyleTag({ content: 'html,body,#root{overflow:visible!important;height:auto!important}.expedition-shell{position:absolute!important;inset:0 0 auto 0!important;min-height:100vh;overflow:visible!important}.player__foot{position:absolute!important}' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: file, fullPage: full });
  if (style) await style.evaluate(node => node.remove());
  shots.push({ name, file });
  log(`  ${path.basename(file)}`);
}

/** Make the call on screen: the one the engine says wins (or one it says loses), worked out in the page. */
async function call(page, right) {
  const plan = await page.evaluate(async right => {
    const id = document.querySelector('[data-case]').getAttribute('data-case');
    const { caseById } = await import('/src/cases/index.ts');
    const { runCase, wins } = await import('/src/cases/engines.ts');
    const c = caseById(id).case;
    const truth = runCase(c).truth;
    if (c.call.kind === 'pick' && c.call.multi) return { picks: right ? truth.win : [c.call.options.find(o => !truth.win.includes(o.id)).id] };
    if (c.call.kind === 'pick') return { pick: c.call.options.find(o => wins(c.call, truth, { pick: o.id }) === right).id };
    const { min, max, step, tolerance } = c.call;
    const values = [];
    for (let v = min; v <= max + 1e-9; v += step) values.push(Number(v.toFixed(6)));
    const ok = values.filter(v => wins(c.call, truth, { value: v }) === right && (right || Math.abs(v - truth.value) > tolerance * 2));
    return { value: right ? ok.sort((a, b) => Math.abs(a - truth.value) - Math.abs(b - truth.value))[0] : ok[Math.floor(ok.length / 2)] };
  }, right);
  if (plan.picks) for (const id of plan.picks) await page.locator(`[data-case-option="${id}"]`).click();
  else if (plan.pick) await page.locator(`[data-case-option="${plan.pick}"]`).click();
  else await page.locator('[data-case-set]').evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, plan.value);
}

async function run(page, { running } = {}) {
  await page.locator('[data-action="case-run"]').click();
  if (running) { await page.waitForTimeout(1300); await shot(page, running, { wait: 0 }); }
  await page.locator('[data-case-phase="done"]').waitFor();
  await page.waitForTimeout(2200); // the patch fills over 1.6 s
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });
await page.clock.setFixedTime(new Date(T0));

// 1. The new case that ends Chance and drift's expedition: set up, running, and the map lighting.
log('\nphone 375×812');
const e04 = 'evolution-e04';
await visit(page, `#/hub/${E04}`);
await page.locator('[data-action="hub-begin-expedition"]').waitFor();
const payoffIndex = await page.evaluate(async () => (await import('/src/expeditions/registry.ts')).getExpedition('evolution-e04').pack.beats.length - 1);
await visit(page, `#/expedition/${e04}/${payoffIndex}?from=${E04}`);
await page.locator('.player__scene [data-case]').waitFor();
await shot(page, 'new-case-opens');
await call(page, true);
await page.locator('[data-action="case-run"]').scrollIntoViewIfNeeded();
await shot(page, 'new-case-call-made');
await run(page, { running: 'new-case-running' });
await shot(page, 'new-case-outcome', { full: true });
await page.locator('.payoff__end').evaluate(el => el.scrollIntoView({ block: 'start' }));
await shot(page, 'new-case-map-lights');
let s = await state(page);
expectThat(s.expeditions.earnedIds.includes(E04), 'a right call lights Chance and drift');

// 2. A miss: Sexual selection's new case, called wrong. Nothing is removed; another case comes later.
const e11Index = await page.evaluate(async () => (await import('/src/expeditions/registry.ts')).getExpedition('evolution-e11').pack.beats.length - 1);
await visit(page, `#/expedition/evolution-e11/${e11Index}?from=${E11}`);
await page.locator('.player__scene [data-case]').waitFor();
await call(page, false);
await run(page);
await page.locator('.case__after').evaluate(el => el.scrollIntoView({ block: 'start' }));
await shot(page, 'miss-what-really-happened');
await page.locator('.payoff__end').evaluate(el => el.scrollIntoView({ block: 'start' }));
await shot(page, 'miss-nothing-removed');
s = await state(page);
expectThat(!s.expeditions.earnedIds.includes(E11) && s.expeditions.earnedIds.includes(E04), 'a miss lights nothing and removes nothing');

// 3. A field mission from the hub lights a place the learner skipped (Evolution now).
await visit(page, `#/hub/${E10}`);
await page.locator('[data-action="hub-go-further"]').waitFor();
await page.locator('[data-hub-section="next"]').evaluate(el => el.scrollIntoView({ block: 'center' }));
await shot(page, 'hub-go-further');
await page.locator('[data-action="hub-go-further"]').click();
await page.locator('[data-mission-phase="playing"]').waitFor();
await shot(page, 'field-mission');
await call(page, true);
await run(page, { running: 'field-mission-running' });
await page.locator('[data-mission-result]').evaluate(el => el.scrollIntoView({ block: 'start' }));
await shot(page, 'field-mission-lit');
s = await state(page);
expectThat(s.expeditions.earnedIds.includes(E10), 'the field mission lights Evolution now without its expedition');
await page.locator('[data-action="mission-done"]').click();
await page.locator('.mission-shell').waitFor({ state: 'detached' });

// 4. Eight days on, the Lasting missions are due for the places lit a week ago.
await page.clock.setFixedTime(new Date(T0 + 8 * DAY));
await visit(page, `#/hub/${EVOLUTION}`);
await page.locator('[data-hub-next="check"]').waitFor();
await page.locator('[data-hub-section="next"]').evaluate(el => el.scrollIntoView({ block: 'center' }));
await shot(page, 'lasting-due-on-hub');
await page.locator('[data-action="hub-begin-check"]').click();
await page.locator('[data-mission-phase="playing"]').waitFor();
const due = await page.locator('[data-mission-node]').getAttribute('data-mission-node');
expectThat([E04, E10].includes(due), 'the Lasting mission due is a place lit a week ago');
await shot(page, 'lasting-mission');
await call(page, true);
await run(page);
await page.locator('[data-mission-result]').evaluate(el => el.scrollIntoView({ block: 'start' }));
expectThat(await page.locator('[data-mission-result="lasting"]').count() === 1, 'it becomes Lasting');
await shot(page, 'lasting-mission-lit');
await page.locator('[data-action="mission-done"]').click();
await visit(page, `#/hub/${EVOLUTION}`);
await page.locator('[data-hub-section="territories"]').waitFor();
await page.locator(`.hub-territory[data-node-id="${due}"]`).evaluate(el => el.scrollIntoView({ block: 'center' }));
await shot(page, 'evolution-after');

if (errors.length) { console.error(errors.join('\n')); throw new Error(`${errors.length} page errors`); }
await context.close();

const images = await Promise.all(shots.map(async s => `<figure><img src="data:image/png;base64,${(await readFile(s.file)).toString('base64')}"><figcaption>${s.name}</figcaption></figure>`));
const sheet = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
await sheet.setContent(`<style>body{margin:0;padding:24px;background:#05060d;font:13px -apple-system,sans-serif;color:#b9c3dd;display:grid;grid-template-columns:repeat(6,1fr);gap:18px;align-items:start}figure{margin:0}img{width:100%;border-radius:10px;border:1px solid #232842;display:block}figcaption{margin-top:6px}</style>${images.join('')}`);
await sheet.screenshot({ path: path.join(OUT, 'contact-sheet.png'), fullPage: true });
log(`\n  contact-sheet.png (${shots.length} screens)`);
await writeFile(path.join(OUT, 'shots.json'), JSON.stringify(shots, null, 2));
await browser.close();
