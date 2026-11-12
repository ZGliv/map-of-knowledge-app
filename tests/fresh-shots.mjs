// Keep what you learn (checks/freshness.ts), at 375×812, through the real UI and the real stores.
// A learner whose places were last proved 3, 10, 30 and 70 days ago (two glowing, two ready to
// refresh), written with the app's own ledger code and the cases' own engines, then the same
// learner back after a three-week break. Every record shown is one the app would write itself.
//
//   MOK_URL=http://127.0.0.1:5246 node tests/fresh-shots.mjs        (OUT=output/int-fresh)
//
// Writes $OUT/*.png and $OUT/contact-sheet.png (output/deep-fresh by default).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5246';
const OUT = path.resolve(process.env.OUT || 'output/deep-fresh');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const EVOLUTION = 'knowledge.science.biology.evolution';
const DEEP_TIME = `${EVOLUTION}.deep-time`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const shots = [];

/** Seed the record through the app's own stores. `shift` moves every proof that many days further back. */
async function seed(shift) {
  const imp = p => import(/* @vite-ignore */ p);
  const [ledgerMod, checkLedger, cases, engines, evolution] = await Promise.all([
    imp('/src/expeditions/ledger.ts'), imp('/src/checks/ledger.ts'), imp('/src/cases/index.ts'), imp('/src/cases/engines.ts'), imp('/src/core/evolution.ts'),
  ]);
  const DAY = 864e5, HOUR = 36e5, now = Date.now();
  const ago = (days, hours = 0) => new Date(now - (days + shift) * DAY + hours * HOUR).toISOString();
  const summary = level => ({ level, firstTry: { right: 5, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] });
  // The winning call for a case, worked out by its engine (never typed).
  const callFor = c => {
    const truth = engines.runCase(c).truth;
    if (c.call.kind === 'pick' && c.call.multi) return { picks: truth.win };
    if (c.call.kind === 'pick') return { pick: c.call.options.find(o => engines.wins(c.call, truth, { pick: o.id })).id };
    const values = [];
    for (let v = c.call.min; v <= c.call.max + 1e-9; v += c.call.step) values.push(Number(v.toFixed(6)));
    return { value: values.filter(v => engines.wins(c.call, truth, { value: v })).sort((a, b) => Math.abs(a - truth.value) - Math.abs(b - truth.value))[0] };
  };
  // Each place: lit by its expedition and the new case that ends it, then refreshed by field missions.
  const plan = [
    { key: 'evolution-now', pack: 'evolution-e10', proofs: [3] },
    { key: 'variation-heredity', pack: 'evolution-e02', proofs: [10] },
    { key: 'chance-drift', pack: 'evolution-e04', proofs: [60, 52, 30] },
    { key: 'deep-time', pack: 'evolution-e06', proofs: [100, 92, 70] },
  ];
  let exp = ledgerMod.createExpeditionLedger();
  const events = [];
  for (const p of plan) {
    const node = evolution.evolutionTerritoryId(p.key);
    const list = cases.casesFor(node);
    p.proofs.forEach((days, i) => {
      if (i === 0) exp = ledgerMod.recordRun(exp, { id: `run-${p.pack}`, packId: p.pack, summary: summary('Understood'), at: ago(days) });
      const c = list[i];
      const id = `seed-${c.id}`;
      events.push({ t: 'case', id, session: id, node, case: c.id, answer: callFor(c), success: true, via: i === 0 ? 'expedition' : 'mission', ms: 42000, at: ago(days, i === 0 ? 0.1 : 0) });
    });
  }
  localStorage.setItem(ledgerMod.EXPEDITION_LEDGER_KEY, JSON.stringify(exp));
  const error = checkLedger.saveCheckLedger(checkLedger.appendCheckEvents(checkLedger.createCheckLedger(), events));
  if (error) throw new Error(error);
}

async function open(shift, desktop = false) {
  const context = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // Open on the Evolution field (the app keeps its own place on unload, so this is set before each load).
  await context.addInitScript(id => localStorage.setItem('mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: [], locationId: id })), EVOLUTION);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  await page.evaluate(seed, shift);
  await page.reload();
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return !s.navigating && Object.keys(s.glow ?? {}).length > 0; }, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function shot(page, name, wait = 500) {
  await page.waitForTimeout(wait);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push({ file, desktop: page.viewportSize().width > 800 });
  console.log(`shot ${name}`);
}
async function hub(page, nodeId, section) {
  await page.evaluate(id => { location.hash = `#/hub/${encodeURIComponent(id)}`; }, nodeId);
  await page.waitForSelector(`[data-hub-node="${nodeId}"]`);
  await page.evaluate(() => document.querySelectorAll('.hub-next img').forEach(img => img.loading = 'eager'));
  await page.waitForFunction(() => [...document.querySelectorAll('.hub-workspace img')].slice(0, 6).every(img => img.complete), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(selector => { if (selector) document.querySelector(selector)?.scrollIntoView({ block: 'start' }); else document.querySelector('.hub-workspace')?.scrollTo(0, 0); }, section ?? null);
}
/** Make the winning call on screen, worked out in the page from the case's own engine. */
async function call(page) {
  const plan = await page.evaluate(async () => {
    const id = document.querySelector('[data-case]').getAttribute('data-case');
    const { caseById } = await import('/src/cases/index.ts');
    const { runCase, wins } = await import('/src/cases/engines.ts');
    const c = caseById(id).case;
    const truth = runCase(c).truth;
    if (c.call.kind === 'pick' && c.call.multi) return { picks: truth.win };
    if (c.call.kind === 'pick') return { pick: c.call.options.find(o => wins(c.call, truth, { pick: o.id })).id };
    const values = [];
    for (let v = c.call.min; v <= c.call.max + 1e-9; v += c.call.step) values.push(Number(v.toFixed(6)));
    return { value: values.filter(v => wins(c.call, truth, { value: v })).sort((a, b) => Math.abs(a - truth.value) - Math.abs(b - truth.value))[0] };
  });
  if (plan.picks) for (const id of plan.picks) await page.locator(`[data-case-option="${id}"]`).click();
  else if (plan.pick) await page.locator(`[data-case-option="${plan.pick}"]`).click();
  else await page.locator('[data-case-set]').evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, plan.value);
}

try {
  // 1. The learner as they are today: places last proved 3, 10, 30 and 70 days ago.
  {
    const { context, page } = await open(0);
    const s = await state(page);
    const glow = s.glow;
    assert.ok(glow[`${EVOLUTION}.evolution-now`] > 0.7, 'Three days on, a place glows brightly');
    assert.ok(glow[`${EVOLUTION}.chance-drift`] > 0.5 && glow[`${EVOLUTION}.chance-drift`] < 0.8, 'Halfway to its next refresh, the glow is softer');
    assert.equal(glow[DEEP_TIME], 0, 'A place ready to refresh has no glow, and keeps its color');
    assert.ok(s.expeditions.earnedIds.includes(DEEP_TIME), 'Ready to refresh never removes color');
    assert.equal(s.location.id, EVOLUTION);
    await page.waitForSelector('.fresh-glow [data-fresh-id]');
    await shot(page, '01-atlas-mixed-freshness');

    // 2. A ready place's hub: Lasting, ready to refresh, and the case that will do it.
    await hub(page, DEEP_TIME);
    assert.match(await page.locator('[data-hub-next="check"]').innerText(), /Ready to refresh/, 'The hub leads with the refresh');
    assert.equal(await page.locator('[data-hub-stat="lasting"]').count(), 1, 'Lasting stays on the hub while its refresh is due');
    await shot(page, '02-hub-ready-to-refresh');
    await hub(page, DEEP_TIME, '[data-hub-section="next"]');
    await shot(page, '03-hub-ready-next-step', 300);

    // 3. The refresh: one new case, played for real, re-lights the glow.
    await page.locator('[data-action="hub-begin-check"]').click();
    await page.waitForSelector('[data-mission-phase="playing"]');
    await shot(page, '04-refresh-case');
    await call(page);
    await page.locator('[data-action="case-run"]').click();
    await page.locator('[data-case-phase="done"]').waitFor({ timeout: 30000 });
    await page.waitForSelector('[data-mission-result="refreshed"]');
    await page.waitForTimeout(2400); // the rim re-lights over 1.8 s
    await page.evaluate(() => document.querySelector('[data-mission-result]')?.scrollIntoView({ block: 'start' }));
    assert.equal(await page.locator('[data-patch-glow="1"]').count(), 1, 'The glow re-lights to full');
    await shot(page, '05-refresh-relit');
    await page.locator('[data-action="mission-done"]').click();
    await page.waitForFunction(id => { const s = JSON.parse(window.render_game_to_text()); return s.glow[id] === 1; }, DEEP_TIME);

    // 4. The Library's map of you, with the refreshed place lit up again.
    await page.click('[data-action="open-notebook-mobile"]').catch(() => page.click('[data-action="open-notebook"]'));
    await page.waitForSelector('[data-workspace="notebook"] .lib-map');
    await shot(page, '06-library-map', 800);
    await context.close();
  }

  // 5. The same learner back after three weeks away: a welcome-back set of at most three.
  {
    const { context, page } = await open(20);
    const s = await state(page);
    assert.match(s.next ?? '', /^welcome:/, 'After a break the next step is the welcome-back set');
    assert.ok(s.next.split(':')[1].split(',').length <= 3, 'At most three places');
    await hub(page, EVOLUTION, '[data-hub-section="next"]');
    await page.waitForSelector('[data-hub-next="welcome"]');
    await shot(page, '07-welcome-back-hub');
    await hub(page, EVOLUTION);
    assert.equal(await page.locator('[data-hub-stat="glowing"], [data-hub-stat="fresh"]').count(), 0, 'The field hub keeps no count of what glows: the strip and the map show it');
    await shot(page, '08-field-hub-stats');
    await hub(page, EVOLUTION, '[data-hub-section="territories"]');
    await page.evaluate(() => document.querySelector('[data-hub-section="territories"]')?.closest('.hub-workspace')?.scrollBy(0, -60));
    await shot(page, '08b-field-hub-places');
    await context.close();
  }

  // 6. On a phone the next step lives in the hub; on a wider screen it floats over the Atlas as a pill.
  {
    const { context, page } = await open(20, true);
    await page.waitForSelector('[data-action="next-step"]');
    assert.match(await page.locator('[data-action="next-step"]').innerText(), /Welcome back/, 'The pill says welcome back');
    await shot(page, '09-welcome-back-atlas-pill-desktop');
    await context.close();
  }
  assert.deepEqual(errors, [], 'No runtime or console errors');

  // The contact sheet: phone shots at 375×812 in rows of four, then the desktop shot at 1152×720.
  const phone = shots.filter(s => !s.desktop), wide = shots.filter(s => s.desktop);
  const cells = [
    ...phone.map((s, i) => ({ file: s.file, w: 375, h: 812, x: (i % 4) * 387, y: Math.floor(i / 4) * 824 })),
    ...wide.map((s, i) => ({ file: s.file, w: 1536, h: 960, x: 0, y: Math.ceil(phone.length / 4) * 824 + i * 972 })),
  ];
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...cells.flatMap(c => ['-i', c.file]), '-filter_complex',
    `${cells.map((c, i) => `[${i}]scale=${c.w}:${c.h}:force_original_aspect_ratio=decrease,pad=${c.w}:${c.h}:(ow-iw)/2:(oh-ih)/2:color=0x05060c[s${i}]`).join(';')};${cells.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${cells.length}:layout=${cells.map(c => `${c.x}_${c.y}`).join('|')}:fill=0x05060c[out]`,
    '-map', '[out]', path.join(OUT, 'contact-sheet.png')]);
  console.log(`Freshness screenshots in ${OUT}`);
} finally {
  await browser.close();
}
