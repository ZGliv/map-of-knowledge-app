// Phone screenshots of the Library tab (375×812, WebKit-free Chromium), from real ledgers only.
// The partway learner is seeded through the app's own modules (served by Vite), so every run,
// check, pin, link and mark is a record the app itself would have written.
//
//   MOK_URL=http://127.0.0.1:5226 node tests/library-shots.mjs
//
// Writes output/notebook/*.png and output/notebook/contact-sheet.png.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5226';
const OUT = path.resolve('output/notebook');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function phone(seed) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.goto(URL);
  if (seed) {
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.evaluate(seed);
    await page.reload();
  }
  await page.waitForFunction(() => !!window.render_game_to_text);
  await page.click('[data-action="open-notebook-mobile"]');
  await page.waitForSelector('[data-workspace="notebook"]');
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
const shot = async (page, name) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log(`shot ${name}`); };
const imagesLoaded = page => page.waitForFunction(() => [...document.querySelectorAll('.lib img')].every(img => img.complete), null, { timeout: 15000 }).catch(() => {});

/** A learner partway through Evolution, written with the app's own ledger code. */
async function seedPartway() {
  const imp = p => import(/* @vite-ignore */ p);
  const [{ getExpedition }, ledgerMod, checks, session, generators, draw, deck, lib, journal, notebookMod, evolution] = await Promise.all([
    imp('/src/expeditions/registry.ts'), imp('/src/expeditions/ledger.ts'), imp('/src/checks/progress.ts'), imp('/src/checks/session.ts'),
    imp('/src/checks/generators.ts'), imp('/src/checks/ledger.ts'), imp('/src/explore/deck.ts'), imp('/src/notebook/libraryStore.ts'),
    imp('/src/notebook/journal.ts'), imp('/src/core/notebook.ts'), imp('/src/core/evolution.ts'),
  ]);
  const at = (d, h = 19) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
  const node = key => evolution.evolutionTerritoryId(key);
  const summary = (level, misses = []) => ({ level, firstTry: { right: 4, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses });

  // Two real first answers the learner got wrong in the E10 expedition, in the pack's own words.
  const pack = getExpedition('evolution-e10').pack;
  const misses = [];
  for (const beat of pack.beats) {
    const choices = beat.kind === 'source' ? { prompt: beat.question.prompt, list: beat.question.choices, answer: beat.question.answer, gradeId: beat.gradeId }
      : beat.kind === 'dialogue' ? (() => { const line = beat.script.find(l => 'gradeId' in l); return line && { prompt: line.ask, list: line.choices, answer: line.answer, gradeId: line.gradeId }; })()
        : beat.kind === 'predict' && beat.parts.length === 1 ? { prompt: beat.prompt, list: beat.parts[0].choices, answer: beat.parts[0].answer, gradeId: beat.gradeId } : null;
    if (!choices) continue;
    const wrong = choices.list.find(c => c.id !== choices.answer);
    misses.push({ gradeId: choices.gradeId, prompt: choices.prompt, chosen: wrong.label });
    if (misses.length === 1) break;
  }

  let exp = ledgerMod.createExpeditionLedger();
  exp = ledgerMod.recordRun(exp, { id: 'run-e10-a', packId: 'evolution-e10', summary: summary('Familiar', misses), at: at(8) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e10-b', packId: 'evolution-e10', summary: summary('Understood'), at: at(9, 20) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e02', packId: 'evolution-e02', summary: summary('Understood'), at: at(11, 18) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e03', packId: 'evolution-e03', summary: summary('Understood'), at: at(14, 21) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e04', packId: 'evolution-e04', summary: summary('Familiar'), at: at(15, 20) });
  localStorage.setItem(ledgerMod.EXPEDITION_LEDGER_KEY, JSON.stringify(exp));

  // A week after it was lit, a passed "Prove it" check makes Evolution now Lasting: real items, answered right.
  const sessionId = 'seed-check-e10';
  const started = checks.startCheck(node('evolution-now'), exp, draw.createCheckLedger(), Date.parse(at(16, 20)), sessionId);
  if (started.items) {
    const answerOf = (item, variant) => item.kind === 'choice' || item.kind === 'flaw' ? { pick: item.answer } : item.kind === 'order' ? { seq: [...item.answer] }
      : item.kind === 'match' ? { pairs: { ...item.pairs } } : { value: generators.checkVariant(item, variant).answer };
    const events = started.items.map((drawn, i) => session.attemptEvent({ session: sessionId, node: node('evolution-now'), drawn, answer: answerOf(drawn.entry.item, drawn.variant), confidence: 'certain', ms: 20000, at: at(16, 20 + 0) .replace(':00.000Z', `:0${i}.000Z`) }));
    events.push(session.finishEvent({ session: sessionId, node: node('evolution-now'), items: started.items, at: at(16, 20).replace(':00.000Z', ':09.000Z') }));
    localStorage.setItem(draw.CHECK_LEDGER_KEY, JSON.stringify(draw.appendCheckEvents(draw.createCheckLedger(), events)));
  }

  // Reels kept along the way.
  const reelIn = key => deck.REELS.filter(r => r.nodeId === node(key));
  const pins = [[reelIn('evolution-now')[0], at(10, 21)], [reelIn('natural-selection')[0], at(13, 20)], [reelIn('chance-drift')[0], at(16, 21)]].filter(([r]) => r);
  localStorage.setItem('mok-reels-v1', JSON.stringify({ version: 1, pinned: pins.map(([r, a]) => ({ id: r.id, at: a })).reverse(), watched: pins.map(([r]) => r.id) }));

  // Books and films, and two saved links.
  let library = lib.createLibraryStore();
  library = lib.cycleReading(library, 'finch', at(6, 21));
  library = lib.cycleReading(library, 'finch', at(11, 22));
  library = lib.cycleReading(library, 'pbs-evolution', at(12, 20));
  library = lib.saveLink(library, { url: 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', note: 'The peppered moth, both forms side by side', nodeId: node('natural-selection') });
  library = { ...library, links: library.links.map(l => ({ ...l, createdAt: at(13, 21), updatedAt: at(13, 21) })) };
  library = lib.saveLink(library, { url: 'https://www.hhmi.org/biointeractive/making-fittest-got-lactase-coevolution-genes-and-culture', note: 'HHMI film on lactase persistence', nodeId: node('variation-heredity') });
  localStorage.setItem(lib.LIBRARY_STORAGE_KEY, JSON.stringify(library));

  // What stuck, and one open question.
  let book = notebookMod.createNotebook();
  const stuck = (source, id, nodeId, title, when) => { book = notebookMod.upsertNotebookEntry(book, { id: journal.stuckEntryId(source, id), title, body: '', sourceUrl: '', sourceLabel: '', kind: 'idea', evidence: 'explained', nodeIds: [nodeId], createdAt: when }); };
  stuck('run', 'run-e10-b', node('evolution-now'), 'The resistant ones were already in the dish. The drug only showed us which.', at(9, 20));
  stuck('run', 'run-e03', node('natural-selection'), 'No moth changed colour. The birds just kept eating the wrong ones.', at(14, 21));
  book = notebookMod.upsertNotebookEntry(book, { title: 'If drift is random, why does it always lose variation?', body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: [node('chance-drift')], createdAt: at(15, 22) });
  book = { ...book, entries: book.entries.map(e => ({ ...e, updatedAt: e.createdAt })) };
  localStorage.setItem(notebookMod.NOTEBOOK_STORAGE_KEY, JSON.stringify(book));
}

const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const NOW = 'knowledge.science.biology.evolution.evolution-now';

try {
  // 1. A new learner.
  {
    const { context, page } = await phone();
    await shot(page, '01-empty-library');
    await context.close();
  }
  // 2–8. Partway through Evolution.
  {
    const { context, page } = await phone(seedPartway);
    await page.waitForSelector('[data-notebook-section="pinned-reels"] img');
    await imagesLoaded(page);
    assert.equal(await page.locator('.lib-cell[data-state="lasting"]').count(), 1, 'Evolution now is Lasting');
    assert(await page.locator('.lib-cell[data-state="lit"]').count() >= 2);
    await shot(page, '02-partway-library');
    await page.evaluate(() => document.querySelector('.studio-main>.notebook-workspace').scrollTo(0, 560));
    await imagesLoaded(page);
    await shot(page, '03-partway-shelves');
    await page.evaluate(() => document.querySelector('.studio-main>.notebook-workspace').scrollTo(0, 0));

    await page.fill('[data-action="notebook-search"]', 'moth');
    await imagesLoaded(page);
    await shot(page, '04-search-results');
    await page.fill('[data-action="notebook-search"]', '');

    await page.click(`.lib-cell[data-place-id="${NOW}"]`);
    await page.waitForSelector(`[data-place-sheet="${NOW}"]`);
    await imagesLoaded(page);
    await shot(page, '05-place-sheet');
    await page.keyboard.press('Escape');

    await page.click('[data-action="view-places"]');
    await shot(page, '06-by-place');
    await page.click(`.lib-places [data-place-id="${SELECTION}"]`);
    await page.waitForSelector(`[data-place-sheet="${SELECTION}"] [data-row^="link:"]`);
    await imagesLoaded(page);
    await shot(page, '07-link-in-place');
    await page.keyboard.press('Escape');
    await page.click('[data-action="view-map"]');

    await page.click('[data-filter="changed"]');
    await shot(page, '08-changed-your-mind');
    await page.click('[data-filter="work"]');
    await shot(page, '09-read-and-watched');
    await page.click('[data-filter="all"]');

    await page.click('[data-action="add-link"]');
    await page.waitForSelector('[data-link-sheet]');
    assert(await page.locator('[data-action="link-url"]').evaluate(el => el === document.activeElement), 'The link field is focused');
    await page.fill('[data-action="link-url"]', 'https://www.youtube.com/watch?v=mcM23M-CCog');
    await page.fill('[data-action="link-note"]', 'Lenski’s long-term experiment with E. coli and natural selection');
    await page.waitForSelector(`[data-action="link-place"][data-node-id="${SELECTION}"]`);
    await shot(page, '10-add-link-sheet');
    await page.click('[data-action="save-link"]');
    await page.waitForSelector('[data-link-sheet]', { state: 'detached' });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1')).links.filter(l => !l.removedAt).length);
    assert.equal(saved, 3, 'The new link is saved');
    await context.close();
  }
  assert.deepEqual(errors, [], 'No runtime or console errors');

  const sheet = ['01-empty-library', '02-partway-library', '03-partway-shelves', '04-search-results', '05-place-sheet', '06-by-place', '07-link-in-place', '08-changed-your-mind', '09-read-and-watched', '10-add-link-sheet'];
  const extra = process.env.PAYOFF_SHOT ? [process.env.PAYOFF_SHOT] : [];
  const inputs = [...sheet.map(name => path.join(OUT, `${name}.png`)), ...extra];
  const cols = 4;
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...inputs.flatMap(file => ['-i', file]), '-filter_complex',
    `${inputs.map((_, i) => `[${i}]scale=375:812[s${i}]`).join(';')};${inputs.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${inputs.length}:layout=${inputs.map((_, i) => `${(i % cols) * 387}_${Math.floor(i / cols) * 824}`).join('|')}:fill=0x05060c[out]`,
    '-map', '[out]', path.join(OUT, 'contact-sheet.png')]);
  console.log(`Library screenshots in ${OUT}`);
} finally {
  await browser.close();
}
