// Library v2, end to end, at 375×812 (phone) and 1440×900 (desktop), through the real UI and the real
// stores: a search over Open Library and Wikidata, a Goodreads export imported through the + sheet (then
// again, to prove it adds nothing), covers and places arriving from Open Library, an item page with a
// kept passage, a book finished from its row with the one new-case offer it makes, and a link read by
// /api/unfurl. Every record shown is one the app wrote itself. Network: openlibrary.org, wikidata.org,
// the pages being unfurled. The link reader runs on 5191 (started here if it is not already running).
//
//   MOK_URL=http://127.0.0.1:5228 node tests/library2-shots.mjs
//
// Writes output/library2/*.png and output/library2/contact-sheet.png. Also proposes "read about" on the
// main Atlas in two screenshots (atlas-proposal-*): an overlay drawn by this script only, never shipped.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5228';
const OUT = path.resolve('output/library2');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const GOODREADS = path.resolve('src/notebook/fixtures/goodreads_library_export.csv');
const LINK = 'https://en.wikipedia.org/wiki/Peppered_moth_evolution';
await mkdir(OUT, { recursive: true });

// The link reader, for /api/unfurl behind the dev server's proxy.
let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F', { headers: { host: '127.0.0.1:5191' } }); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const VARIANTS = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
];
const shots = { phone: [], desktop: [] };

async function open(variant, seed) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 2, isMobile: variant.mobile, hasTouch: variant.mobile, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/502|Failed to load resource/.test(message.text())) errors.push(`${variant.name}: ${message.text()}`); });
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  if (seed) { await page.evaluate(seed); await page.reload(); await page.waitForFunction(() => !!window.render_game_to_text); }
  await library(page, variant);
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
async function library(page, variant) {
  if (await page.locator('[data-workspace="notebook"]').isVisible()) return;
  await page.click(variant.mobile ? '[data-action="open-notebook-mobile"]' : '[data-action="open-notebook"]');
  await page.waitForSelector('[data-workspace="notebook"]');
}
const settle = page => page.waitForFunction(() => [...document.querySelectorAll('.lib img')].every(img => img.complete), null, { timeout: 15000 }).catch(() => {});
async function shot(page, variant, name) {
  await settle(page);
  await page.waitForTimeout(450);
  const file = path.join(OUT, `${variant.name}-${name}.png`);
  await page.screenshot({ path: file });
  shots[variant.name].push(file);
  console.log(`shot ${variant.name}-${name}`);
}
const scrollWorkspace = (page, top) => page.evaluate(y => document.querySelector('.studio-main>.notebook-workspace')?.scrollTo(0, y), top);
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1') || '{"items":[],"notes":[],"links":[]}'));

/** A learner partway through Evolution, written with the app's own ledger code (as tests/library-shots.mjs does). */
async function seedPartway() {
  const imp = p => import(/* @vite-ignore */ p);
  const [ledgerMod, checks, session, generators, draw, evolution] = await Promise.all([
    imp('/src/expeditions/ledger.ts'), imp('/src/checks/progress.ts'), imp('/src/checks/session.ts'), imp('/src/checks/generators.ts'), imp('/src/checks/ledger.ts'), imp('/src/core/evolution.ts'),
  ]);
  const at = (d, h = 19) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
  const node = key => evolution.evolutionTerritoryId(key);
  const summary = level => ({ level, firstTry: { right: 4, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] });
  let exp = ledgerMod.createExpeditionLedger();
  exp = ledgerMod.recordRun(exp, { id: 'run-e10', packId: 'evolution-e10', summary: summary('Understood'), at: at(9, 20) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e02', packId: 'evolution-e02', summary: summary('Understood'), at: at(11, 18) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e03', packId: 'evolution-e03', summary: summary('Understood'), at: at(14, 21) });
  exp = ledgerMod.recordRun(exp, { id: 'run-e04', packId: 'evolution-e04', summary: summary('Familiar'), at: at(15, 20) });
  localStorage.setItem(ledgerMod.EXPEDITION_LEDGER_KEY, JSON.stringify(exp));
  const sessionId = 'seed-check-e10';
  const started = checks.startCheck(node('evolution-now'), exp, draw.createCheckLedger(), Date.parse(at(16, 20)), sessionId);
  if (started.items) {
    const answerOf = (item, variant) => item.kind === 'choice' || item.kind === 'flaw' ? { pick: item.answer } : item.kind === 'order' ? { seq: [...item.answer] } : item.kind === 'match' ? { pairs: { ...item.pairs } } : { value: generators.checkVariant(item, variant).answer };
    const events = started.items.map((drawn, i) => session.attemptEvent({ session: sessionId, node: node('evolution-now'), drawn, answer: answerOf(drawn.entry.item, drawn.variant), confidence: 'certain', ms: 20000, at: at(16, 20).replace(':00.000Z', `:0${i}.000Z`) }));
    events.push(session.finishEvent({ session: sessionId, node: node('evolution-now'), items: started.items, at: at(16, 20).replace(':00.000Z', ':09.000Z') }));
    localStorage.setItem(draw.CHECK_LEDGER_KEY, JSON.stringify(draw.appendCheckEvents(draw.createCheckLedger(), events)));
  }
}

async function importGoodreads(page, variant, { capture }) {
  // A slower link to Open Library (each answer held back 1.5 s), so the import can be seen mid-flight.
  if (capture) await page.route('https://openlibrary.org/search.json**', route => setTimeout(() => route.continue(), 1500));
  await page.click('[data-action="add-link"]');
  await page.waitForSelector('[data-add-sheet="start"]');
  await page.setInputFiles('input[aria-label="Import a Goodreads or StoryGraph export"]', GOODREADS);
  await page.waitForSelector('[data-import-plan]');
  if (capture) await shot(page, variant, '04-import-plan');
  await page.click('[data-action="confirm-import"]');
  await page.waitForSelector('[data-add-sheet]', { state: 'detached' });
  await page.waitForSelector('[data-enrich]');
  if (capture) {
    await page.waitForFunction(() => { const bar = document.querySelector('.lib-enrich-bar i'); return bar && parseFloat(bar.style.width) >= 40; }, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    const file = path.join(OUT, `${variant.name}-05-import-in-progress.png`);
    await page.screenshot({ path: file });
    shots[variant.name].push(file);
    assert.equal(await page.locator('[data-enrich="running"]').count(), 1, 'The import shows its progress while covers and places arrive');
  }
  await page.waitForSelector('[data-enrich="done"]', { timeout: 180000 });
  if (capture) await page.unroute('https://openlibrary.org/search.json**');
}

try {
  for (const variant of VARIANTS) {
    // 1. An empty library.
    {
      const { context, page } = await open(variant);
      await shot(page, variant, '01-empty');

      // 2. Add anything: books from Open Library, films and series from Wikidata.
      await page.click('[data-action="add-link"]');
      await page.waitForSelector('[data-add-sheet="start"]');
      await page.fill('[data-action="link-url"]', 'cosmos');
      await page.waitForSelector('[data-found-group="books"] [data-found]', { timeout: 30000 });
      await page.waitForSelector('[data-found-group="screen"] [data-found]', { timeout: 30000 });
      await page.click('[data-found="wd:Q866368"] [data-action="add-found"]').catch(() => page.locator('[data-found-group="screen"] [data-action="add-found"]').first().click());
      await page.waitForSelector('[data-found-group="screen"] [data-action="found-status"]');
      await shot(page, variant, '02-add-anything-search');
      const added = await stored(page);
      assert.equal(added.items.filter(i => !i.removedAt).length, 1, 'Adding from search keeps one entry');
      assert.match(added.items[0].id, /^(wd-Q\d+|shelf-)/, 'A Wikidata result keeps its QID');
      await page.keyboard.press('Escape');
      await context.close();
    }

    // 3–9. A learner partway through Evolution brings in their Goodreads history.
    {
      const { context, page } = await open(variant, seedPartway);
      const before = await page.locator('.map-cell.is-complete').count();
      await importGoodreads(page, variant, { capture: true });
      await scrollWorkspace(page, 0);
      await shot(page, variant, '06-import-done');
      const after = await stored(page);
      const live = after.items.filter(i => !i.removedAt);
      assert.equal(live.length, 44, 'All 44 books are in the library');
      assert(live.filter(i => i.cover).length >= 30, 'Covers arrived from Open Library');
      assert(live.filter(i => i.places.length).length >= 38, 'Most books found places on the map');

      // The map of you: read-about land, never lit by reading.
      assert.equal(await page.locator('.lib-map.is-world').count(), 1, 'After an import across subjects, the map shows all knowledge');
      const states = await page.locator('.lib-map .lib-cell').evaluateAll(cells => cells.map(c => c.dataset.state));
      assert(states.filter(s => s === 'read').length >= 15, 'Reading marks many fields as read about');
      assert(states.includes('underway'), 'Biology is underway (proof inside it), not read about');
      assert(!states.includes('lit') && !states.includes('lasting'), 'No field is lit by reading');
      await page.locator('.lib-mine').screenshot({ path: path.join(OUT, `${variant.name}-07-map-of-you.png`) });
      shots[variant.name].push(path.join(OUT, `${variant.name}-07-map-of-you.png`));

      // Into Evolution: lit, Lasting, underway and read-about land side by side.
      await page.click('.lib-cell[data-place-id="knowledge.science.biology"]');
      await page.waitForSelector('[data-place-sheet="knowledge.science.biology"]');
      await page.click('[data-action="sheet-show-map"]');
      await page.click('.lib-cell[data-place-id="knowledge.science.biology.evolution"]');
      await page.click('[data-action="sheet-show-map"]');
      await page.waitForSelector('.lib-cell[data-place-id="knowledge.science.biology.evolution.natural-selection"]');
      const evo = await page.locator('.lib-map .lib-cell').evaluateAll(cells => cells.map(c => c.dataset.state));
      assert(evo.includes('lasting') && evo.includes('lit') && evo.includes('read'), 'Evolution shows Lasting, lit and read-about land together');
      await page.locator('.lib-mine').screenshot({ path: path.join(OUT, `${variant.name}-07b-evolution-states.png`) });
      shots[variant.name].push(path.join(OUT, `${variant.name}-07b-evolution-states.png`));
      await page.click('[data-action="map-up"][data-node-id="knowledge"]');

      // Reading never colors the Atlas.
      assert.equal(await page.locator('.map-cell.is-complete').count(), before, 'The Atlas coloring is unchanged by the import');

      // Another tab sees the import arrive, without a reload.
      const other = await context.newPage();
      await other.goto(URL);
      await other.waitForFunction(() => !!window.render_game_to_text);
      await library(other, variant);
      assert.equal(await other.locator('.lib-map.is-world .lib-cell[data-state="read"]').count(), states.filter(s => s === 'read').length, 'A second tab draws the same map');
      await other.close();

      // A backup carries the new data, and brings it back into an empty browser.
      const download = page.waitForEvent('download');
      await page.locator('[data-action="notebook-export"]').scrollIntoViewIfNeeded();
      await page.click('[data-action="notebook-export"]');
      const backupFile = path.join(OUT, `${variant.name}-backup.json`);
      await (await download).saveAs(backupFile);
      const backup = JSON.parse(await readFile(backupFile, 'utf8'));
      assert.equal(backup.libraryVersion, 2, 'The backup names its library version');
      assert.equal(backup.items.length, after.items.length, 'The backup carries every item');
      assert(backup.notes.length >= 7, 'The backup carries the kept notes');
      {
        const fresh = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: variant.mobile });
        const blank = await fresh.newPage();
        await blank.goto(URL);
        await blank.waitForFunction(() => !!window.render_game_to_text);
        await library(blank, variant);
        await blank.getByLabel('Import a notebook backup', { exact: true }).setInputFiles(backupFile);
        await blank.waitForSelector('.notebook-notice');
        const restored = await stored(blank);
        assert.equal(restored.items.length, after.items.length, 'Importing the backup restores every item');
        assert.deepEqual(restored.items.map(i => i.id).sort(), after.items.map(i => i.id).sort());
        await fresh.close();
      }
      await scrollWorkspace(page, 0);

      // The same file again: nothing new, no duplicates.
      await page.click('[data-action="add-link"]');
      await page.setInputFiles('input[aria-label="Import a Goodreads or StoryGraph export"]', GOODREADS);
      await page.waitForSelector('[data-import-plan]');
      assert(await page.locator('[data-action="confirm-import"]').isDisabled(), 'A second import of the same file has nothing to add');
      await page.keyboard.press('Escape');
      assert.equal((await stored(page)).items.length, after.items.length, 'Importing twice creates no duplicates');

      // 8. An item page: The Beak of the Finch (a shelf work), finished, with the review and private note kept.
      await page.click('[data-filter="work"]');
      await page.fill('[data-action="notebook-search"]', 'beak finch');
      await page.click('[data-work-key="work:finch"] [data-action="open-item"]');
      await page.waitForSelector('[data-item-sheet="work:finch"]');
      await shot(page, variant, '08-item-page');

      // 9. Keep a passage on it.
      await page.click('[data-item-sheet] [data-action="add-quote"]');
      await page.fill('[data-action="note-text"]', 'The finches of Daphne Major were evolving, and the Grants could watch it happen.');
      await page.fill('[data-action="note-where"]', 'ch. 1');
      await page.click('[data-action="save-note"]');
      await page.waitForSelector('[data-item-notes] .lib-kept.is-quote');
      await page.locator('[data-item-notes]').scrollIntoViewIfNeeded();
      await shot(page, variant, '09-quotes');
      await page.keyboard.press('Escape');
      await page.fill('[data-action="notebook-search"]', 'Daphne');
      await page.waitForSelector('[data-work-key="work:finch"] .lib-row-kept');
      await page.fill('[data-action="notebook-search"]', '');
      await page.click('[data-filter="all"]');

      // 10. Finished from its row: one quiet offer of a new case at its place.
      await page.click('[data-filter="work"]');
      await page.click('[data-action="work-status-filter"][data-status="started"]');
      await page.click('[data-work-key="entry:gr-27276428"] [data-action="cycle-reading"]');
      await page.waitForSelector('[data-work-key="entry:gr-27276428"] [data-action="try-case"]');
      assert.equal(await page.locator('[data-action="try-case"]').count(), 1, 'One offer, no more');
      await shot(page, variant, '10-finished-new-case');
      const offered = await page.locator('[data-action="try-case"]').getAttribute('data-node-id');
      await page.click('[data-action="try-case"]');
      await page.waitForFunction(id => JSON.parse(window.render_game_to_text()).route?.kind === 'mission' && JSON.parse(window.render_game_to_text()).route?.nodeId === id, offered, { timeout: 20000 });
      await page.waitForTimeout(800);
      await shot(page, variant, '11-the-case');
      assert.equal(await page.locator('[data-action="mission-close"]').getAttribute('aria-label'), 'Back to Library', 'The case returns to the Library');
      await page.click('[data-action="mission-close"]');
      await page.waitForSelector('[data-workspace="notebook"]');
      await page.click('[data-filter="all"]').catch(() => {});

      // 12–13. A rich link, read by /api/unfurl.
      await page.click('[data-action="add-link"]');
      await page.fill('[data-action="link-url"]', LINK);
      await page.waitForSelector('[data-link-preview="seen"]', { timeout: 20000 });
      // With no line of the learner's own, the page's own words suggest the place.
      await page.waitForSelector('[data-action="link-place"][data-node-id^="knowledge.science.biology.evolution"]');
      await page.fill('[data-action="link-note"]', 'The moths that turned dark with the soot, and back');
      await shot(page, variant, '12-rich-link-sheet');
      await page.click('[data-action="save-link"]');
      await page.waitForSelector('[data-add-sheet]', { state: 'detached' });
      const link = (await stored(page)).links.find(l => l.url === LINK && !l.removedAt);
      assert(link?.preview?.title, 'The link keeps what the page said about itself');
      await page.click(`[data-link-id="${link.id}"] [data-action="open-link-item"]`);
      await page.waitForSelector(`[data-item-sheet="link:${link.id}"]`);
      await shot(page, variant, '13-rich-link');
      await page.keyboard.press('Escape');

      // A proposal, not shipped: "read about" drawn on the main Atlas.
      await page.waitForSelector('.toast', { state: 'detached', timeout: 10000 }).catch(() => {});
      await proposeAtlas(page, variant);
      await context.close();
    }
  }
  assert.deepEqual(errors, [], 'No runtime or console errors');

  // The contact sheet: phone shots at 375×812 in rows of six, desktop shots at 720×450 in rows of three.
  const cells = [];
  shots.phone.forEach((file, i) => cells.push({ file, w: 375, h: 812, x: (i % 6) * 387, y: Math.floor(i / 6) * 824 }));
  const phoneRows = Math.ceil(shots.phone.length / 6) * 824;
  shots.desktop.forEach((file, i) => cells.push({ file, w: 760, h: 475, x: (i % 3) * 772, y: phoneRows + Math.floor(i / 3) * 487 }));
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...cells.flatMap(c => ['-i', c.file]), '-filter_complex',
    `${cells.map((c, i) => `[${i}]scale=${c.w}:${c.h}:force_original_aspect_ratio=decrease,pad=${c.w}:${c.h}:(ow-iw)/2:(oh-ih)/2:color=0x05060c[s${i}]`).join(';')};${cells.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${cells.length}:layout=${cells.map(c => `${c.x}_${c.y}`).join('|')}:fill=0x05060c[out]`,
    '-map', '[out]', path.join(OUT, 'contact-sheet.png')]);
  console.log(`Library v2 screenshots in ${OUT}`);
} finally {
  await browser.close();
  reader?.kill();
}

/** Draw the stipple on the Atlas itself, from the learner's real read-about places, at the world and inside Science. */
async function proposeAtlas(page, variant) {
  await page.click(variant.mobile ? '.studio-mobile-nav button:first-child' : '[aria-label="Atlas"]');
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && !s.navigating; });
  await page.waitForTimeout(900);
  const overlay = () => page.evaluate(async () => {
    const lib = JSON.parse(localStorage.getItem('mok-library-v1'));
    const reading = lib.items.filter(i => !i.removedAt && ['started', 'finished', 'stopped'].includes(i.status));
    const places = new Map();
    for (const item of reading) for (const p of item.places) places.set(p.nodeId, (places.get(p.nodeId) ?? 0) + 1);
    const { catalog } = await import('/src/core/catalog.ts');
    const { territoryColor } = await import('/src/core/territoryTheme.ts');
    const svg = document.querySelector('.map-scene--idle')?.ownerSVGElement;
    if (!svg) return 0;
    const ns = 'http://www.w3.org/2000/svg';
    svg.querySelector('#read-proposal')?.remove();
    const layer = document.createElementNS(ns, 'g'); layer.id = 'read-proposal'; layer.setAttribute('pointer-events', 'none');
    const defs = document.createElementNS(ns, 'defs'); layer.appendChild(defs);
    const within = (id, scope) => id === scope || id.startsWith(`${scope}.`);
    const count = scope => [...places].filter(([id]) => within(id, scope)).reduce((sum, [, n]) => sum + n, 0);
    let drawn = 0;
    const paint = (pathEl, nodeId, n) => {
      const id = `rp-${drawn}`;
      const strength = Math.min(1, n / 5);
      const pattern = document.createElementNS(ns, 'pattern');
      pattern.setAttribute('id', id); pattern.setAttribute('width', '9'); pattern.setAttribute('height', '9'); pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      for (const [cx, cy] of [[2.25, 2.25], [6.75, 6.75]]) { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', String(1 + .5 * strength)); c.setAttribute('fill', territoryColor(nodeId)); c.setAttribute('fill-opacity', String(.4 + .4 * strength)); pattern.appendChild(c); }
      defs.appendChild(pattern);
      const copy = document.createElementNS(ns, 'path'); copy.setAttribute('d', pathEl.getAttribute('d')); copy.setAttribute('fill', `url(#${id})`);
      layer.appendChild(copy); drawn += 1;
    };
    // At the world, the fields drawn inside each subject; inside a subject, its own cells.
    const regions = [...document.querySelectorAll('.map-scene--idle [data-region-id]')];
    const atWorld = regions.some(r => r.dataset.regionId === 'knowledge.science');
    if (atWorld) {
      document.querySelectorAll('.map-details > g').forEach((group, i) => {
        const subject = catalog.getChildren(catalog.root)[i];
        const fields = catalog.getChildren(subject);
        group.querySelectorAll('.map-contours path').forEach((p, j) => { const field = fields[j]; const n = field ? count(field.id) : 0; if (n) paint(p, field.id, n); });
      });
    } else regions.forEach(r => { const n = count(r.dataset.regionId); if (n) paint(r, r.dataset.regionId, n); });
    const borders = svg.querySelector('.territory-borders');
    (borders?.parentNode ?? svg).insertBefore(layer, borders ?? null);
    return drawn;
  });
  assert((await overlay()) > 5, 'The proposal draws read-about land on the Atlas');
  await shot(page, variant, 'atlas-proposal-world');
  await page.evaluate(() => document.querySelector('#read-proposal')?.remove());
  await page.click('.map-scene--idle [data-region-id="knowledge.science"]');
  await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.location.id === 'knowledge.science' && !s.navigating; }, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  assert((await overlay()) > 2, 'The proposal draws read-about fields inside Science');
  await shot(page, variant, 'atlas-proposal-science');
}
