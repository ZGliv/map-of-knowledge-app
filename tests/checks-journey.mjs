// The question bank ("Try it in words"), the fallback to new cases, in a real browser at phone and
// desktop sizes. New cases are the default way to prove a place (tests/prove-journey.mjs); this
// journey proves the same places in words, reached the way a learner would:
//   1. play E07 to its payoff (one transfer missed), leave its new case unplayed, prove it in words;
//   2. open E10's field mission from its hub, choose "Try it in words", pass: both pieces light;
//   3. move the clock 8 days on: the Lasting cases surface (map pill on desktop, hub on phone);
//   4. pass E10's Lasting round in words, miss E07's: E07 keeps its land.
//
//   MOK_URL=http://127.0.0.1:5211 node tests/checks-journey.mjs     (needs the dev server: it imports /src modules)
//   MOK_SIZES=phone                                                  (one size only)
// Writes output/checks/<size>-<nn>-<step>.png and output/checks/contact-phone.png.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5211';
const OUT = path.resolve('output/checks');
const EVOLUTION = 'knowledge.science.biology.evolution';
const E07 = `${EVOLUTION}.evidence`;
const E10 = `${EVOLUTION}.evolution-now`;
const DAY = 864e5;
const T0 = Date.parse('2026-10-17T15:00:00Z');
const SIZES = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
].filter(size => !process.env.MOK_SIZES || process.env.MOK_SIZES.split(',').includes(size.name));
await mkdir(OUT, { recursive: true });

const exact = text => new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
const log = (...args) => console.log(...args);
/** A full page load (a hash-only change would keep the app, and its clock, as they were). */
async function visit(page, hash = '') {
  await page.goto('about:blank');
  await page.goto(`${URL}/${hash}`, { waitUntil: 'domcontentloaded' });
}
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}'));
const shots = [];

async function shot(page, size, name, { full = false } = {}) {
  const file = path.join(OUT, `${size.name}-${String(shots.filter(s => s.size === size.name).length + 1).padStart(2, '0')}-${name}.png`);
  let style = null;
  // Screens scroll inside fixed layers; unpin them so a full-page shot holds the whole screen.
  if (full) style = await page.addStyleTag({ content: 'html,body,#root{overflow:visible!important;height:auto!important}.check-shell,.expedition-shell{position:absolute!important;inset:0 0 auto 0!important;min-height:100vh;overflow:visible!important}.check-bar{position:relative!important}' });
  // Results light their patch over 1.6 s; let it finish.
  await page.waitForTimeout(name.startsWith('result') ? 2600 : 450);
  await page.screenshot({ path: file, fullPage: full });
  if (style) await style.evaluate(node => node.remove());
  shots.push({ size: size.name, name, file });
  log(`  ${path.basename(file)}`);
}

/** The keyed (or a wrong) answer for the question on screen, worked out in the page from the bank itself. */
async function plan(page, right) {
  return page.evaluate(async right => {
    const el = document.querySelector('[data-check-item]');
    const banks = await import('/src/checks/banks/index.ts');
    const gen = await import('/src/checks/generators.ts');
    const { item } = banks.bankItem(el.getAttribute('data-check-item'));
    const variant = Number(el.getAttribute('data-check-variant') || 0);
    switch (item.kind) {
      case 'choice': return { kind: 'pick', label: item.options.find(o => right ? o.id === item.answer : o.id !== item.answer).label };
      case 'flaw': return { kind: 'pick', label: item.steps.find(s => right ? s.id === item.answer : s.id !== item.answer).text };
      case 'order': {
        const seq = right ? item.answer : [...item.answer].reverse();
        return { kind: 'order', labels: seq.map(id => item.items.find(i => i.id === id).label) };
      }
      case 'match': {
        const pairs = { ...item.pairs };
        if (!right) pairs[item.left[0].id] = item.right.find(r => r.id !== item.pairs[item.left[0].id]).id;
        return { kind: 'match', pairs: item.left.map(l => [l.label, item.right.find(r => r.id === pairs[l.id]).label]) };
      }
      case 'number': {
        const v = gen.checkVariant(item, variant);
        return { kind: 'number', value: right ? Number(v.answer.toFixed(v.digits)) : Math.round(v.answer * 3 + 7) };
      }
    }
  }, right);
}

async function answer(page, right, confidence = 'certain', onFilled) {
  const p = await plan(page, right);
  if (p.kind === 'pick') await page.locator('.check-options button').filter({ has: page.locator('span', { hasText: exact(p.label) }) }).click();
  if (p.kind === 'order') for (const label of p.labels) await page.locator('.check-order__pool button', { hasText: exact(label) }).click();
  if (p.kind === 'match') for (const [left, rightLabel] of p.pairs) await page.locator('.check-match li').filter({ has: page.locator('p', { hasText: exact(left) }) }).locator('button', { hasText: exact(rightLabel) }).click();
  if (p.kind === 'number') await page.locator('.check-number input').fill(String(p.value));
  if (onFilled) await onFilled(p.kind);
  await page.locator(`.check-sure button[data-confidence="${confidence}"]`).click();
}

/** Begin a check already on screen and answer every question. `rights` says which to get right. */
async function takeCheck(page, size, rights, label) {
  await page.locator('[data-action="check-begin"]').click();
  const total = await page.locator('.check-ticks li').count();
  const kinds = new Set();
  for (let i = 0; i < total; i++) {
    await page.locator('[data-check-item]').waitFor();
    const kind = await page.locator('[data-check-item]').getAttribute('data-check-kind');
    await answer(page, rights(i), 'certain', async () => {
      // One screenshot per kind of question, answered and waiting for the confidence tap.
      if (!kinds.has(kind) && label) { kinds.add(kind); await shot(page, size, `${label}-question-${kind}`, { full: true }); }
    });
    await page.waitForTimeout(120);
  }
  await page.locator('[data-check-result]').waitFor();
}

async function playE07(page) {
  // E07 "Four witnesses, one story": every beat right except the chromosome-2 transfer, so the run lands at Familiar.
  const cont = () => page.locator('[data-action="expedition-continue"]').click();
  const sure = () => page.locator('.expedition-shell .confidence button', { hasText: 'Certain' }).click();
  const choose = text => page.locator('.expedition-shell .choice', { hasText: exact(text) }).click();
  await page.locator('[data-expedition="evolution-e07"]').waitFor();
  await cont(); // cover
  await choose('The same set of bones, in the same order, reshaped'); await sure(); await cont();
  for (const [left, right] of [['Human', 'Long and free'], ['Dog', 'Walked on'], ['Bird', 'Fused'], ['Whale', 'Extra bones']]) {
    await page.locator('.expedition-shell .match li').filter({ has: page.locator('.match__left', { hasText: exact(left) }) }).locator('.chip', { hasText: exact(right) }).click();
  }
  await sure(); await cont();
  await choose('Two similar island groups, with life matching two different continents'); await sure(); await cont();
  await page.locator('.expedition-shell .spot__card', { hasText: 'Tiktaalik' }).click(); await sure(); await cont();
  await choose('Nothing in particular. Chromosome numbers just differ'); await sure(); await cont();
  await page.locator('.expedition-shell .flaw__step', { hasText: 'Nearly every one of those forms' }).click(); await sure(); await cont();
  for (const text of ['Notice pouched mammals', 'Combine clues', 'Predict marsupial fossils', '1982: a marsupial fossil', 'Conclude that Australia']) {
    await page.locator('.expedition-shell .order__pool .order__label', { hasText: text }).click();
  }
  await sure(); await cont();
  await page.locator('.expedition-shell .payoff').waitFor();
}

async function settledMap(page, location) {
  // The app saves its own location on page hide, so the wanted one is applied as the next page starts.
  await page.evaluate(id => sessionStorage.setItem('mok-test-location', id), location);
  await visit(page);
  await page.waitForFunction(id => {
    if (!window.render_game_to_text) return false;
    const s = JSON.parse(window.render_game_to_text());
    return !s.navigating && s.location.id === id && !document.querySelector('.map-system.is-navigating');
  }, location, { timeout: 60000 });
  await page.waitForTimeout(900);
}

const expectThat = (ok, message) => { if (!ok) throw new Error(`Expectation failed: ${message}`); log(`  ok: ${message}`); };

const browser = await chromium.launch();
for (const size of SIZES) {
  log(`\n${size.name} ${size.viewport.width}×${size.viewport.height}`);
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2, isMobile: size.mobile, hasTouch: size.mobile });
  await context.addInitScript(() => {
    if (location.protocol === 'about:') return;
    const id = sessionStorage.getItem('mok-test-location');
    if (!id) return;
    sessionStorage.removeItem('mok-test-location');
    let saved = { version: 1, completedIds: [] };
    try { saved = JSON.parse(localStorage.getItem('mok-next.demo-progress.v1')) || saved; } catch { /* start fresh */ }
    localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ ...saved, locationId: id }));
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.clock.setFixedTime(new Date(T0));

  // 1. Finish an expedition, leave its new case unplayed, then prove it in words.
  await visit(page, `#/hub/${E07}`);
  await page.locator('[data-hub-section="next"]').waitFor();
  await page.locator('[data-hub-section="next"]').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await shot(page, size, 'hub-offers-check');
  await page.locator('[data-action="hub-begin-expedition"]').click();
  await playE07(page);
  await page.locator('.expedition-shell .payoff [data-case]').waitFor();
  await shot(page, size, 'payoff-new-case');
  expectThat(await page.locator('[data-action="payoff-check"]').count() === 0, 'the payoff leads with a new case, not questions');
  await page.locator('[data-action="expedition-exit"]').click();
  await page.locator('.expedition-shell').waitFor({ state: 'detached' });
  let s = await state(page);
  expectThat(s.expeditions.runs.at(-1)?.level === 'Familiar' && !s.expeditions.earnedIds.includes(E07), 'leaving the case unplayed records the run, short of Understood');
  await visit(page, `#/check/${E07}?from=${E07}`);
  await page.locator('[data-check-phase="intro"]').waitFor();
  await shot(page, size, 'check-intro');
  await takeCheck(page, size, () => true, 'e07');
  expectThat(await page.locator('[data-check-result="passed"]').count() === 1, 'E07 is proved in words');
  await shot(page, size, 'result-understood', { full: true });
  await page.locator('[data-action="check-done"]').click();
  await page.locator(`[data-hub-node="${E07}"]`).waitFor();
  await shot(page, size, 'hub-after-pass');
  s = await state(page);
  expectThat(s.expeditions.earnedIds.includes(E07), 'E07 is earned land');
  // Opened again too soon (as a link from the Explore feed could), the screen says when the next check opens.
  await visit(page, `#/check/${E07}?from=${E07}`);
  await page.locator('[data-check-phase="waiting"]').waitFor();
  await shot(page, size, 'check-not-yet-due');
  await page.locator('[data-action="check-exit"]').click();
  await page.locator(`[data-hub-node="${E07}"]`).waitFor();

  // 2. From a hub: E10's field mission, done in words, without playing its expedition.
  await visit(page, `#/hub/${E10}`);
  await page.locator('[data-action="hub-go-further"]').click();
  await page.locator('[data-mission-phase="playing"]').waitFor();
  await page.locator('[data-action="mission-words"]').click();
  await page.locator('[data-check-phase="intro"]').waitFor();
  await takeCheck(page, size, () => true, size.name === 'phone' ? 'e10' : null);
  expectThat(await page.locator('[data-check-result="passed"]').count() === 1, 'E10 is proved in words from its hub');
  await page.locator('[data-action="check-done"]').click();
  await settledMap(page, EVOLUTION);
  s = await state(page);
  expectThat([E07, E10].every(id => s.expeditions.earnedIds.includes(id)), 'E07 and E10 both color the map');
  await shot(page, size, 'map-colored');

  // 3. Eight days later the Lasting re-checks are due.
  await page.clock.setFixedTime(new Date(T0 + 8 * DAY));
  if (size.mobile) {
    await visit(page, `#/hub/${EVOLUTION}`);
    await page.locator('[data-hub-next="check"]').waitFor();
    await page.locator('[data-hub-section="next"]').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await shot(page, size, 'hub-recheck-due');
    await page.locator('[data-action="hub-begin-check"]').click();
    await page.locator('[data-action="mission-words"]').click();
  } else {
    await settledMap(page, 'knowledge');
    await page.locator('[data-action="next-step"]').waitFor();
    // Every due place reads "Ready to refresh" (hub rows, next card, the Atlas pill) since 32e6734.
    expectThat((await page.locator('[data-action="next-step"]').textContent()).includes('Ready to refresh'), 'the map pill offers the due refresh');
    await shot(page, size, 'map-pill-recheck-due');
    await page.locator('[data-action="next-step"]').click();
    await page.locator('[data-action="mission-words"]').click();
  }
  await page.locator('[data-check-phase="intro"]').waitFor();
  const dueNode = await page.locator('[data-check-node]').getAttribute('data-check-node');
  expectThat(dueNode === E10, 'the first due re-check is E10');
  await takeCheck(page, size, () => true, null);
  expectThat(await page.locator('[data-check-result="lasting"]').count() === 1, 'E10 becomes Lasting');
  await shot(page, size, 'result-lasting', { full: true });
  await page.locator('[data-action="check-done"]').click();

  // 4. Miss E07's re-check: its land stays.
  await visit(page, `#/hub/${E07}`);
  await page.locator('[data-action="hub-begin-check"]').click();
  await page.locator('[data-action="mission-words"]').click();
  await page.locator('[data-check-phase="intro"]').waitFor();
  await takeCheck(page, size, () => false, null);
  expectThat(await page.locator('[data-check-result="missed"]').count() === 1, 'E07 re-check is missed');
  await shot(page, size, 'result-missed', { full: true });
  await page.locator('[data-action="check-done"]').click();
  await visit(page, `#/hub/${EVOLUTION}`);
  await page.locator('[data-hub-section="territories"]').waitFor();
  s = await state(page);
  expectThat([E07, E10].every(id => s.expeditions.earnedIds.includes(id)), 'nothing is lost: E07 and E10 still earned');
  await page.locator(`.hub-territory[data-node-id="${E07}"]`).evaluate(el => el.scrollIntoView({ block: 'center' }));
  await shot(page, size, 'evolution-after-miss');
  await settledMap(page, EVOLUTION);
  await shot(page, size, 'map-after-miss');

  if (errors.length) { console.error(errors.join('\n')); throw new Error(`${errors.length} page errors`); }
  await context.close();
}

// A phone contact sheet of every phone screenshot, in order.
const phone = shots.filter(s => s.size === 'phone');
if (phone.length) {
  const images = await Promise.all(phone.map(async s => `<figure><img src="data:image/png;base64,${(await readFile(s.file)).toString('base64')}"><figcaption>${s.name}</figcaption></figure>`));
  const sheet = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await sheet.setContent(`<style>body{margin:0;padding:24px;background:#05060d;font:13px -apple-system,sans-serif;color:#b9c3dd;display:grid;grid-template-columns:repeat(6,1fr);gap:18px;align-items:start}figure{margin:0}img{width:100%;border-radius:10px;border:1px solid #232842;display:block}figcaption{margin-top:6px}</style>${images.join('')}`);
  await sheet.screenshot({ path: path.join(OUT, 'contact-phone.png'), fullPage: true });
  log(`\n  contact-phone.png (${phone.length} screens)`);
}
await writeFile(path.join(OUT, 'shots.json'), JSON.stringify(shots, null, 2));
await browser.close();
