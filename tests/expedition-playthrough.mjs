// Plays expeditions start to finish in a real browser, answering every graded beat
// correctly from the pack's own data, and checks what a learner would see:
// every beat renders, every image loads, nothing scrolls sideways, there are no
// console errors, and finishing lights the pack's own piece of the atlas. Where the place has new
// cases, the payoff opens with one: the driver makes the call the engine says wins, runs it, and
// the piece lights there, in the player.
//
//   node tests/expedition-playthrough.mjs <packId> [<packId> …]
//   MOK_URL=http://127.0.0.1:5215 OUT=output/evo-c VIEWPORTS=phone,desktop
//
// Screenshots go to $OUT/<packId>/<viewport>/, plus a phone contact sheet per pack.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5215';
const OUT = process.env.OUT || 'output/evo-c';
const VIEWPORTS = { phone: { width: 375, height: 812 }, desktop: { width: 1440, height: 900 } };
const wanted = (process.env.VIEWPORTS || 'phone,desktop').split(',');
const packIds = process.argv.slice(2);
assert(packIds.length, 'Name at least one pack id');

// The registry and the number generators are plain data and pure functions: bundle them for Node.
await mkdir(`${OUT}/.bundle`, { recursive: true });
await writeFile(`${OUT}/.bundle/input.mjs`, [
  `export { EXPEDITIONS } from '${resolve('src/expeditions/registry.ts')}';`,
  `export { makeVariant } from '${resolve('src/expeditions/engine/variants.ts')}';`,
  `export { best } from '${resolve('src/expeditions/sims/tradeoffModel.ts')}';`,
  `export { parseNewick, closer, closestRelatives, mrca, tipsOf } from '${resolve('src/expeditions/sims/tree.ts')}';`,
  `export { clockSeconds, dialAngle } from '${resolve('src/expeditions/sims/deepTimeMath.ts')}';`,
  `export { caseById, casesFor } from '${resolve('src/cases/index.ts')}';`,
  `export { runCase, wins } from '${resolve('src/cases/engines.ts')}';`,
].join('\n'));
const bundle = await rolldown({ input: resolve(`${OUT}/.bundle/input.mjs`), platform: 'node', external: [/\.css$/], moduleTypes: { '.css': 'empty' } });
await bundle.write({ file: resolve(`${OUT}/.bundle/registry.mjs`), format: 'es' });
await bundle.close();
const { EXPEDITIONS, makeVariant, best, parseNewick, closer, closestRelatives, mrca, tipsOf, clockSeconds, dialAngle, caseById, casesFor, runCase, wins } = await import(pathToFileURL(resolve(`${OUT}/.bundle/registry.mjs`)));

const sure = async page => { await page.getByRole('button', { name: 'Fairly sure', exact: true }).last().click(); };
const clickText = async (scope, text) => { await scope.getByRole('button', { name: text, exact: true }).first().click(); };

async function settle(page) {
  await page.waitForTimeout(450);
  // Wait for images in the player to finish (or fail) loading, up to 15 s.
  await page.waitForFunction(() => [...document.querySelectorAll('.expedition-shell img')].every(img => img.complete), null, { timeout: 15000 }).catch(() => {});
}

async function audit(page, label, problems) {
  const result = await page.evaluate(() => {
    const shell = document.querySelector('.expedition-shell');
    const broken = [...document.querySelectorAll('.expedition-shell img')].filter(img => img.complete && img.naturalWidth === 0).map(img => img.currentSrc || img.src);
    const pending = [...document.querySelectorAll('.expedition-shell img')].filter(img => !img.complete).map(img => img.currentSrc || img.src);
    const wide = [...document.querySelectorAll('.expedition-shell *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed' && !el.closest('.cover, .doc, svg'); }).slice(0, 5).map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    return { overflow: Math.max(document.documentElement.scrollWidth - innerWidth, shell ? shell.scrollWidth - shell.clientWidth : 0), broken, pending, wide };
  });
  if (result.overflow > 0) problems.push(`${label}: horizontal overflow ${result.overflow}px (${result.wide.join(', ')})`);
  if (result.broken.length) problems.push(`${label}: broken images ${result.broken.join(' ')}`);
  if (result.pending.length) problems.push(`${label}: images still loading ${result.pending.join(' ')}`);
}

/** Answer the current beat correctly. Each kind is driven only through what a learner can tap. */
async function answer(page, beat, pack) {
  const scene = page.locator('.player__scene');
  switch (beat.kind) {
    case 'cover': return;
    case 'payoff': {
      // The new case, when the place has one: the winning call comes from the engine, never typed.
      const node = page.locator('.player__scene [data-case]');
      if (!await node.count()) return;
      const c = caseById(await node.getAttribute('data-case')).case;
      const truth = runCase(c).truth;
      if (c.call.kind === 'pick' && c.call.multi) {
        for (const id of truth.win) await scene.locator(`[data-case-option="${id}"]`).click();
      } else if (c.call.kind === 'pick') {
        await scene.locator(`[data-case-option="${c.call.options.find(o => wins(c.call, truth, { pick: o.id })).id}"]`).click();
      } else {
        const steps = Math.round((truth.value - c.call.min) / c.call.step);
        await scene.locator('[data-case-set]').evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, c.call.min + steps * c.call.step);
      }
      await scene.locator('[data-action="case-run"]').click();
      await scene.locator('[data-case-phase="done"]').waitFor();
      await scene.locator('.payoff__end').waitFor();
      return;
    }
    case 'predict':
      for (const part of beat.parts) {
        const label = part.choices.find(c => c.id === part.answer).label;
        const group = part.label ? scene.locator('.part', { has: page.getByRole('heading', { name: part.label, exact: true }) }) : scene.locator('.part').nth(beat.parts.indexOf(part));
        await group.getByRole('radio', { name: label, exact: true }).click();
      }
      await sure(page);
      return;
    case 'footage': {
      // The clip must actually load in this browser (Safari takes the MP4/QuickTime source, others WebM).
      const video = scene.locator('video');
      if (await video.count()) {
        const state = await video.evaluate(v => new Promise(done => { if (v.readyState >= 2) return done({ ok: true, src: v.currentSrc }); const t = setTimeout(() => done({ ok: false, src: v.currentSrc, error: v.error?.code }), 15000); v.addEventListener('loadeddata', () => { clearTimeout(t); done({ ok: true, src: v.currentSrc }); }, { once: true }); v.load(); }));
        if (!state.ok) throw new Error(`footage did not load (${state.src || 'no source'} error ${state.error})`);
        console.log(`  footage plays from ${state.src.split('/').pop()}`);
      }
      await clickText(scene, 'I’ve seen it');
      return;
    }
    case 'documentary': await clickText(scene, 'Skip'); return;
    case 'dialogue':
      for (const item of beat.script) {
        if (!('gradeId' in item)) continue;
        await scene.locator('.reply').waitFor({ timeout: 60000 });
        await scene.locator('.reply__options').getByRole('button', { name: item.choices.find(c => c.id === item.answer).label, exact: true }).click();
        await sure(page);
        await page.waitForTimeout(300);
      }
      await page.locator('[data-action="expedition-continue"]:not([disabled])').waitFor({ timeout: 60000 });
      return;
    case 'source':
      for (const mark of await scene.locator('.mark').all()) await mark.click();
      await scene.getByRole('radio', { name: beat.question.choices.find(c => c.id === beat.question.answer).label, exact: true }).click();
      await sure(page);
      return;
    case 'order':
      for (const id of beat.answer) await scene.locator('.order__pool').getByRole('button', { name: beat.items.find(i => i.id === id).label, exact: true }).click();
      await sure(page);
      return;
    case 'match':
      for (const left of beat.left) {
        const row = scene.locator('.match li', { has: page.getByText(left.label, { exact: true }) });
        await row.getByRole('radio', { name: beat.right.find(r => r.id === beat.pairs[left.id]).label, exact: true }).click();
      }
      await sure(page);
      return;
    case 'spot': await scene.locator('.spot__card', { hasText: beat.options.find(o => o.id === beat.answer).label }).click(); await sure(page); return;
    case 'flaw': await scene.locator('.flaw__step', { hasText: beat.steps.find(s => s.id === beat.answer).text }).click(); await sure(page); return;
    case 'number': {
      const v = makeVariant(beat.generator, beat.params, 0);
      await scene.getByLabel('Your answer').fill(String(Number(v.answer.toFixed(v.digits))));
      await clickText(scene, 'Check');
      await sure(page);
      return;
    }
    case 'sim': return answerSim(page, beat, pack);
  }
}

async function answerSim(page, beat) {
  const scene = page.locator('.player__scene');
  const p = beat.params;
  const pickChoice = async (choices, answerId) => { await scene.locator('.choices').last().getByRole('button', { name: new RegExp(`^${choices.find(c => c.id === answerId).label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click(); };
  if (beat.sim === 'spreadMap') {
    if (p.mode === 'predict') { await pickChoice(p.choices, p.answer); await sure(page); return; }
    // Play to the end by moving the time slider, as a learner can.
    const range = scene.locator('.timebar input[type="range"]');
    await range.evaluate(el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, el.max); el.dispatchEvent(new Event('input', { bubbles: true })); });
    if (p.question) {
      await page.waitForTimeout(300);
      if (p.question.pickPlace) await pickChoice(p.question.choices, p.question.answer);
      else await scene.locator('.question').getByRole('radio', { name: p.question.choices.find(c => c.id === p.question.answer).label, exact: true }).click();
      await sure(page);
    }
    return;
  }
  const question = async (q, timeout = 30000) => {
    const box = scene.locator('.question', { hasText: q.prompt });
    await box.waitFor({ timeout });
    await box.getByRole('radio', { name: q.choices.find(c => c.id === q.answer).label, exact: true }).click();
    await sure(page);
  };
  const setRange = async (locator, value) => locator.evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  if (beat.sim === 'tradeOff') {
    // Slide a little each way first, as a learner hunting for the peak would, then settle on it.
    const range = scene.locator('.tradeoff__slider input');
    const start = p.settings.find(s => s.id === p.start);
    await setRange(range, 0.95); await page.waitForTimeout(150);
    await setRange(range, Math.round(best(start, p.mating) * 100) / 100);
    await question(p.questions[0]);
    return;
  }
  if (beat.sim === 'nestTest') {
    const off = scene.locator('.nest__trait[aria-pressed="false"]');
    while (await off.count()) { await off.first().click(); await page.waitForTimeout(120); }
    await question(p.questions[0]);
    return;
  }
  if (beat.sim === 'lineageRewind') {
    await question(p.questions[0]);
    await scene.locator('.rewind__play').click();
    await question(p.questions[1], 20000);
    return;
  }
  // A question found by its prompt, answered with the choice whose label is given.
  const ask = async (prompt, label, timeout = 30000) => {
    const box = scene.locator('.question', { hasText: prompt }).last();
    await box.waitFor({ timeout });
    await box.getByRole('radio', { name: label, exact: true }).click();
    await sure(page);
  };
  const labelOf = (choices, id) => choices.find(c => c.id === id).label;
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (beat.sim === 'treeSpin') {
    const tree = parseNewick(p.newick);
    const name = id => p.tips[id] ?? id.replace(/_/g, ' ');
    for (const t of p.tasks) {
      if (t.kind === 'closer') {
        const key = closer(tree, t.of, t.options[0], t.options[1]);
        await ask(t.ask, key === 'tie' ? t.tie : name(key));
      } else if (t.kind === 'spin') {
        await scene.locator('.question__prompt', { hasText: t.prompt }).waitFor();
        // Turn branch points the way a finger does: a tap on the dot.
        for (let k = 0; k < t.minSpins; k++) await tapCenter(page, scene.locator('.treespin__node circle').nth(k % 3));
        await ask(t.ask, labelOf(t.choices, t.answer));
      } else if (t.kind === 'tapTip') {
        await scene.locator('.question__prompt', { hasText: t.ask }).waitFor();
        const want = name(closestRelatives(tree, t.of)[0]);
        const tips = scene.locator('.treespin__tip');
        const texts = await tips.locator('text').allTextContents();
        await tapCenter(page, tips.nth(texts.indexOf(want)).locator('rect'));
        await sure(page);
      } else if (t.kind === 'tapNode') {
        await scene.locator('.question__prompt', { hasText: t.ask }).waitFor();
        const want = tipsOf(mrca(tree, t.pair[0], t.pair[1])).map(name).sort().join('|');
        const nodes = scene.locator('.treespin__node');
        const labels = await nodes.evaluateAll(els => els.map(el => el.getAttribute('aria-label').replace(/^\w+ the branch point joining /, '').split(', ').sort().join('|')));
        assert(labels.includes(want), `treeSpin: no branch point joins ${want}`);
        await tapCenter(page, nodes.nth(labels.indexOf(want)).locator('circle'));
        await sure(page);
      }
    }
    return;
  }
  if (beat.sim === 'peaCross') {
    for (const [i, step] of p.steps.entries()) {
      const panel = scene.locator('.peacross__step').nth(i);
      await panel.waitFor();
      await panel.getByRole('radio', { name: labelOf(step.ask.choices, step.ask.answer), exact: true }).click();
      await sure(page);
      await panel.locator('[data-action="pea-cross"]').click();
      await panel.locator('.peacross__result .readout').waitFor();
      if (step.scaleUp) { await panel.locator('[data-action="pea-scale"]').click(); await panel.locator('.peacross__compare').waitFor(); }
    }
    return;
  }
  if (beat.sim === 'mothHunt') {
    const panel = scene.locator('.mothhunt__panel');
    for (const [k, s] of p.script.entries()) {
      if (s.do === 'hunt') {
        await panel.locator('.mothhunt__text', { hasText: s.text }).waitFor();
        const bird = panel.locator('[data-action="moth-bird"]');
        await bird.click();
        await bird.waitFor({ state: 'detached' });
        await panel.locator('.mothhunt__text', { hasText: s.text }).waitFor({ state: 'detached' });
      } else if (s.do === 'ask') {
        const box = panel.locator('.question', { hasText: s.prompt });
        await box.getByRole('radio', { name: labelOf(s.choices, s.answer), exact: true }).click();
        await sure(page);
        if (s.reveal === 'now') await box.getByRole('button', { name: 'Go on', exact: true }).click();
        await box.waitFor({ state: 'detached' });
      } else if (s.do === 'say') {
        await panel.getByRole('button', { name: s.button, exact: true }).click();
      } else if (s.do === 'forward') {
        await panel.locator('[data-action="moth-forward"]').click();
        await panel.locator('[data-action="moth-forward"]').waitFor({ state: 'detached', timeout: 30000 });
        if (k < p.script.length - 1) await panel.getByRole('button', { name: 'Go on', exact: true }).click();
      }
    }
    return;
  }
  if (beat.sim === 'driftLab') {
    await scene.getByRole('button', { name: 'Run until one version is left', exact: true }).click();
    await scene.locator('.drift__next').click({ timeout: 30000 });
    // Both ends of the size range, as the beat asks before its question.
    for (const n of [Math.min(...p.chart.sizes), Math.max(...p.chart.sizes)]) {
      await scene.locator('.segmented').getByRole('radio', { name: new RegExp(`^${escape(n.toLocaleString('en-US'))}\\D`) }).click();
      await scene.locator('.drift__run').click();
      await scene.locator('.readout', { hasText: 'In every copy' }).waitFor({ timeout: 30000 });
    }
    await ask(p.question.ask, labelOf(p.question.choices, p.question.answer));
    return;
  }
  if (beat.sim === 'fluctuation') {
    const modes = scene.locator('.fluct__modes');
    for (const h of p.hypotheses) {
      await modes.getByRole('radio', { name: h.label, exact: true }).click();
      await scene.locator('.drift__run').click();
      await scene.locator('.dishes').first().waitFor();
    }
    await modes.getByRole('radio', { name: p.real.label, exact: true }).click();
    await ask(p.question.ask, labelOf(p.question.choices, p.question.answer));
    return;
  }
  if (beat.sim === 'deepTime') {
    // Tap the dial inside the right span of the day, the way a learner places a guess.
    const [a, b] = p.locate.range.map(ma => clockSeconds(ma, p.earthMa));
    const angle = dialAngle((a + b) / 2), r = 150 - 34;
    await tapSvg(page, scene.locator('.deeptime__dial svg'), 200 + Math.sin(angle) * r, 200 - Math.cos(angle) * r);
    await sure(page);
    await ask(p.question.ask, labelOf(p.question.choices, p.question.answer));
    for (const z of p.zooms) await scene.locator('.deeptime__zoom').getByRole('radio', { name: z.label, exact: true }).click();
    return;
  }
  if (beat.sim === 'lifeChart') {
    const worst = p.events.find(e => e.id === p.pick.answer);
    await tapCenter(page, scene.locator('.lifechart__marker', { has: page.locator(`text=${worst.short}`) }).locator('rect'));
    await sure(page);
    for (const tab of await scene.locator('.lifechart__tabs [role="tab"]').all()) await tab.click();
    return;
  }
  if (beat.sim === 'dropTower') {
    // Drop once with air, see the feather lag, then take the air away.
    const drop = scene.getByRole('button', { name: /^Drop/ });
    await drop.click();
    await scene.locator('.readout').waitFor({ timeout: 30000 });
    await scene.getByRole('radio', { name: p.worlds.find(w => !w.air).label, exact: true }).click();
    await drop.click();
    await ask(p.strobe.ask, labelOf(p.strobe.choices, p.strobe.answer));
    return;
  }
  if (beat.sim === 'monochord') {
    // The first calm spot by tapping the string, the rest with the slider.
    const [first, ...rest] = p.targets;
    await tapSvg(page, scene.locator('.mono__svg'), 70 + (first.n / first.d) * 860, 198);
    for (const t of [first, ...rest]) {
      if (t !== first) await setRange(scene.locator('.mono__slider input'), (t.n / t.d).toFixed(3));
      await scene.getByRole('button', { name: 'Pluck both', exact: true }).click();
      await scene.locator('.mono__tally .is-found', { hasText: t.name }).waitFor();
    }
    return;
  }
  if (beat.sim === 'waveMixer') {
    for (const pr of p.presets.slice(1, 3)) await scene.locator('.segmented').getByRole('radio', { name: new RegExp(`^${escape(pr.label)}`) }).first().click();
    await ask(p.question.ask, labelOf(p.question.choices, p.question.answer));
    return;
  }
  if (beat.sim === 'sequenceLab') {
    for (const step of p.steps) {
      const panel = scene.locator(`[data-seq-step="${step.id}"]`);
      await panel.waitFor();
      // Open the codon table on reading steps, as a learner looking codons up would.
      if (step.op.do === 'translate' || step.op.do === 'change') await panel.locator('[data-action="seq-table"]').click();
      await panel.locator('.question').getByRole('radio', { name: labelOf(step.ask.choices, step.ask.answer), exact: true }).click();
      await sure(page);
      await panel.locator('[data-action="seq-run"]').click();
      await panel.locator('.verdict').waitFor({ timeout: 15000 });
      if (step.play) {
        // Change one letter, see the chain re-read, then put it back.
        await panel.locator('[data-seq-letter]').nth(4).click();
        await panel.locator('.seqlab__picker button').first().click();
        await panel.locator('.seqlab__reset').click();
      }
    }
    return;
  }
  throw new Error(`No driver for sim ${beat.sim}`);
}

/** Bring a point on screen and tap it: pointer and mouse events at real coordinates. */
async function tapAt(page, point) {
  const fit = await page.evaluate(({ x, y }) => {
    const shell = document.querySelector('.expedition-shell');
    if (y < 80 || y > innerHeight - 80) { const dy = y - innerHeight / 2; (shell ?? document.scrollingElement).scrollBy(0, dy); return dy; }
    return 0;
  }, point);
  if (fit) await page.waitForTimeout(150);
  await page.mouse.click(point.x, point.y - fit);
}
async function tapCenter(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box, 'nothing to tap');
  await tapAt(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
}
/** Tap a point given in an SVG's own viewBox units. */
async function tapSvg(page, svg, x, y) {
  await svg.scrollIntoViewIfNeeded();
  const point = await svg.evaluate((el, [x, y]) => { const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()); return { x: p.x, y: p.y }; }, [x, y]);
  await tapAt(page, point);
}

async function play(browser, viewportName, expedition) {
  const { pack, nodeId } = expedition;
  const viewport = VIEWPORTS[viewportName];
  const dir = `${OUT}/${pack.id}/${viewportName}`;
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewportName === 'phone' ? 2 : 1, isMobile: viewportName === 'phone', hasTouch: viewportName === 'phone', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  // The local guide API (/api/guide) is a separate server that is usually not running in
  // development; its 502 is the atlas's, not the expedition's.
  const ignored = new Set();
  page.on('response', response => { if (response.status() >= 400) { if (/\/api\/guide/.test(response.url())) ignored.add(response.url()); else problems.push(`HTTP ${response.status()}: ${response.url()}`); } });
  page.on('console', msg => { if (msg.type() === 'error' && !(ignored.size && /502 \(Bad Gateway\)/.test(msg.text()))) problems.push(`console: ${msg.text()}`); });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  // A clip or image still loading when the learner moves on is cancelled by the browser; that is not a failure.
  page.on('requestfailed', request => { const why = request.failure()?.errorText ?? ''; if (/upload\.wikimedia|thumb\.wikimedia/.test(request.url()) && !/cancel|ABORTED/i.test(why)) problems.push(`request failed: ${request.url()} ${why}`); });
  const shots = [];
  try {
    await page.goto(`${URL}/#/hub/${encodeURIComponent(nodeId)}`, { waitUntil: 'domcontentloaded' });
    await page.locator(`[data-action="hub-begin-expedition"][data-pack-id="${pack.id}"]`).click({ timeout: 30000 });
    await page.locator(`.player[data-pack="${pack.id}"]`).waitFor();
    for (let i = 0; i < pack.beats.length; i++) {
      const beat = pack.beats[i];
      await page.locator(`.player[data-beat="${i}"]`).waitFor();
      await settle(page);
      const name = `${String(i + 1).padStart(2, '0')}-${beat.kind}${beat.kind === 'sim' ? `-${beat.sim}` : ''}`;
      await audit(page, `${pack.id}/${viewportName} beat ${i + 1} (${beat.kind})`, problems);
      await page.screenshot({ path: `${dir}/${name}-a.png` });
      shots.push(`${name}-a.png`);
      await answer(page, beat, pack);
      if (beat.kind !== 'cover' && (beat.kind !== 'payoff' || await page.locator('.player__scene [data-case]').count())) {
        await settle(page);
        await audit(page, `${pack.id}/${viewportName} beat ${i + 1} answered`, problems);
        await page.screenshot({ path: `${dir}/${name}-b.png`, fullPage: false });
        shots.push(`${name}-b.png`);
        // A tall answered beat gets a full-height view too.
        const tall = await page.evaluate(() => { const s = document.querySelector('.expedition-shell'); return s ? s.scrollHeight > s.clientHeight * 1.15 : false; });
        if (tall) {
          await page.evaluate(() => { const s = document.querySelector('.expedition-shell'); s.scrollTo({ top: s.scrollHeight }); });
          await page.waitForTimeout(250);
          await page.screenshot({ path: `${dir}/${name}-c.png` });
          shots.push(`${name}-c.png`);
        }
      }
      const next = page.locator('[data-action="expedition-continue"]');
      if (i < pack.beats.length - 1) { assert(await next.isEnabled(), `${pack.id}: beat ${i + 1} (${beat.kind}) never unlocked Continue`); await next.click(); }
    }
    await page.waitForTimeout(600);
    if (casesFor(nodeId).length) assert(await page.locator('.payoff__end[data-payoff-level="Understood"] .patch.is-lit').count(), `${pack.id}: the case should light the patch in the player`);
    const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    const run = state.expeditions.runs.filter(r => r.packId === pack.id).at(-1);
    assert.equal(run?.level, 'Understood', `${pack.id}: the run should reach Understood`);
    assert(state.expeditions.earnedIds.includes(nodeId), `${pack.id}: ${nodeId} should be earned`);
    await page.locator('[data-action="expedition-continue"]').click();
    await page.locator('.expedition-shell').waitFor({ state: 'detached' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/zz-hub-after.png` });
    shots.push('zz-hub-after.png');
    // The parent place on the map, with this piece lit.
    const parent = nodeId.slice(0, nodeId.lastIndexOf('.'));
    await page.goto(`${URL}/#/hub/${encodeURIComponent(parent)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/zz-parent-hub.png` });
    shots.push('zz-parent-hub.png');
    await audit(page, `${pack.id}/${viewportName} parent hub`, []);
  } catch (error) {
    problems.push(`FAILED: ${error.message.split('\n')[0]}`);
    await page.screenshot({ path: `${dir}/failure.png` }).catch(() => {});
  } finally {
    await context.close();
  }
  return { pack: pack.id, viewport: viewportName, shots, problems };
}

async function contactSheet(browser, packId, viewportName, shots) {
  const dir = resolve(`${OUT}/${packId}/${viewportName}`);
  const cols = 6;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;font:12px system-ui;color:#ccc}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:12px}figure{margin:0}img{width:100%;display:block;border:1px solid #333}figcaption{padding:3px 0}</style><main>${shots.map(s => `<figure><img src="${pathToFileURL(`${dir}/${s}`).href}"><figcaption>${s.replace('.png', '')}</figcaption></figure>`).join('')}</main>`;
  const file = `${dir}/contact.html`;
  await writeFile(file, html);
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.screenshot({ path: `${OUT}/${packId}-contact-${viewportName}.png`, fullPage: true });
  await page.close();
}

const results = [];
for (const viewportName of wanted) {
  const browser = await (viewportName === 'phone' ? webkit : chromium).launch({ headless: true });
  try {
    for (const id of packIds) {
      const expedition = EXPEDITIONS.find(e => e.pack.id === id);
      assert(expedition, `No registered expedition ${id}`);
      const result = await play(browser, viewportName, expedition);
      results.push(result);
      if (viewportName === 'phone') await contactSheet(browser, id, viewportName, result.shots);
      console.log(`${id} @ ${viewportName}: ${result.problems.length ? `${result.problems.length} problem(s)\n  ${result.problems.join('\n  ')}` : 'clean'}`);
    }
  } finally { await browser.close(); }
}
await writeFile(`${OUT}/playthrough-report.json`, JSON.stringify(results, null, 2));
process.exit(results.some(r => r.problems.length) ? 1 : 0);
