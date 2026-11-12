// The Library tab (it holds the notebook), end to end, in Chromium (desktop) and WebKit (phone):
// twelve workflow groups — focus and Escape, idea capture and validation, questions/filters/search,
// export/reload/edit, delete and import, revisit, topic links back to the atlas, the eight-layer
// pullback, resize, two tabs at once, storage failure, and saved links (the + sheet). Every journey uses its own disposable browser context.
//
//   MOK_URL=http://127.0.0.1:5221 node tests/notebook-journey.mjs
//   MOK_ENGINE=chromium|webkit   (one browser only)
//   MOK_EDGES_ONLY=1             (the three cross-tab and capacity edge cases instead)
//
// Writes reports and screenshots to output/learning-studio/. Exits non-zero on the first failure.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5221';
const OUTPUT = path.resolve('output/learning-studio');
const NOTEBOOK_KEY = 'mok-notebook-v1';
const DEMO_KEY = 'mok-next.demo-progress.v1';
const LEARNING_KEY = 'mok-next.save.v1';
const SENTINEL = '{"verification":"Original learning history remains byte-for-byte unchanged"}';
const LEAF = 'knowledge.technology.computing.programming.algorithms.sorting.comparison-sorting.merge-sort.combining-two-sorted-runs';
const TITLE = 'How rhythm makes an idea easier to remember';
const QUESTION = 'Why does music change how a memory feels?';
const BODY = 'A repeated pattern creates a structure I can come back to. I want to connect this with how I take notes.';
const UPDATED_BODY = `${BODY} I tried a short rhythmic mnemonic during a practice session.`;
const TOPICS = ['knowledge.arts.music', 'knowledge.technology'];
const VARIANTS = [
  { name: 'chromium-wide', type: chromium, viewport: { width: 1440, height: 1000 }, mobile: false },
  { name: 'webkit-phone', type: webkit, viewport: { width: 390, height: 844 }, mobile: true },
];

// The local AI guide is not part of this check; its 502s are the dev proxy, not the app.
const guideOffline = text => /502 \(Bad Gateway\)/.test(text);
await mkdir(OUTPUT, { recursive: true });
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const action = (page, name) => page.locator(`[data-action="${name}"]:visible`).first();
const row = (page, title) => page.locator('[data-entry-id]').filter({ has: page.locator('[data-action="open-entry"]', { hasText: title }) });

async function at(page, id) {
  await page.waitForFunction(expected => {
    if (!window.render_game_to_text) return false;
    const value = JSON.parse(window.render_game_to_text());
    return !value.navigating && value.location.id === expected;
  }, id, { timeout: 35000 });
}

/** Home: the brand in the top bar flies back to the whole atlas. */
const home = page => page.locator('[data-action="brand-home"]').click();

/** Fly to a place through search, the way a reader reaches a deep idea. */
async function searchTo(page, id) {
  const { name, parent } = await page.evaluate(async target => {
    const { catalog } = await import('/src/core/catalog.ts');
    const node = catalog.get(target);
    return { name: node.name, parent: catalog.get(node.parentId).name };
  }, id);
  await page.locator('[data-action="open-search"]').click();
  await page.getByLabel('Search an idea or territory').fill(name);
  await page.locator('.search-results button').filter({ hasText: name }).filter({ hasText: parent }).first().click();
  await at(page, id);
}

async function notebook(page) {
  if (await page.locator('[data-workspace="notebook"]').isVisible()) return;
  const standard = page.locator('[data-action="open-notebook"]:visible');
  if (await standard.count()) await standard.first().click();
  else await page.getByRole('button', { name: 'Open library', exact: true }).filter({ visible: true }).first().click();
  await page.locator('[data-workspace="notebook"]').waitFor({ state: 'visible' });
}

async function saved(page, count) {
  await page.waitForFunction(({ key, expected }) => {
    const raw = localStorage.getItem(key);
    return raw && JSON.parse(raw).entries.length === expected;
  }, { key: NOTEBOOK_KEY, expected: count });
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), NOTEBOOK_KEY);
}

async function originalLearningKept(page) {
  const values = await page.evaluate(({ demoKey, learningKey }) => ({
    demo: JSON.parse(localStorage.getItem(demoKey)),
    learning: localStorage.getItem(learningKey),
  }), { demoKey: DEMO_KEY, learningKey: LEARNING_KEY });
  assert.deepEqual(values.demo.completedIds, [LEAF], 'Notebook never changes demo coloring');
  assert.equal(values.learning, SENTINEL, 'Notebook never rewrites the earlier learning save');
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(OUTPUT, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function noOverflow(page, scope = 'body') {
  const size = await page.locator(scope).evaluate(el => ({
    client: el.clientWidth, scroll: el.scrollWidth,
    document: document.documentElement.scrollWidth, viewport: innerWidth,
  }));
  assert(size.scroll <= size.client + 1, `${scope} has no horizontal overflow: ${JSON.stringify(size)}`);
  assert(size.document <= size.viewport + 1, `Document has no horizontal overflow: ${JSON.stringify(size)}`);
  return size;
}

async function chooseTopic(page, id, query) {
  if (!await action(page, 'entry-topic-search').isVisible()) await action(page, 'add-entry-topic').click();
  await action(page, 'entry-topic-search').fill(query);
  await page.locator(`[data-action="select-entry-topic"][data-node-id="${id}"]`).click();
}

async function beginEntry(page, kind = 'idea') {
  await action(page, kind === 'question' ? 'create-question' : 'create-entry').click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await action(page, 'entry-title').waitFor({ state: 'visible' });
}

async function saveEntry(page) {
  await action(page, 'save-entry').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function importRaw(page, text) {
  await page.getByLabel('Import a notebook backup', { exact: true }).setInputFiles({
    name: 'notebook-verification.json', mimeType: 'application/json', buffer: Buffer.from(text),
  });
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-action="notebook-import"]');
    return button && !button.disabled && !!document.querySelector('.notebook-notice');
  });
}

async function focusTrap(page) {
  const dialog = page.getByRole('dialog');
  await action(page, 'entry-title').focus();
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Tab');
    assert(await dialog.evaluate(el => el.contains(document.activeElement)), `Tab focus stays inside the capture dialog (step ${i}; active ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 250))})`);
  }
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Shift+Tab');
    assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Reverse Tab focus stays inside the capture dialog');
  }
}

async function geometry(page) {
  return page.locator('.map-scene--idle [data-region-id]').evaluateAll(elements => elements.map(el => ({
    id: el.getAttribute('data-region-id'), path: el.getAttribute('d'),
  })));
}

async function deepPullback(page) {
  await searchTo(page, LEAF);
  await page.evaluate(() => {
    window.studioPullback = { frames: [], done: false };
    let started = false;
    let idle = 0;
    const tick = () => {
      const map = document.querySelector('.map-system');
      const raw = map?.getAttribute('data-journey-progress');
      const value = JSON.parse(window.render_game_to_text());
      if (raw !== null && raw !== undefined) {
        started = true;
        window.studioPullback.frames.push({
          progress: Number(raw), scale: Number(map.getAttribute('data-journey-scale')),
          leg: Number(map.getAttribute('data-journey-leg')), length: Number(map.getAttribute('data-journey-length')),
          time: performance.now(), navigating: value.navigating,
        });
      } else if (started && !value.navigating) idle += 1;
      if (idle > 3) { window.studioPullback.done = true; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await home(page);
  await at(page, 'knowledge');
  await page.waitForFunction(() => window.studioPullback.done);
  const recording = await page.evaluate(() => window.studioPullback);
  const frames = recording.frames;
  assert(frames.length > 15, 'Deep pullback has actual rendered frames');
  assert.equal(frames[0].progress, 0);
  assert.equal(frames.at(-1).progress, 1);
  assert(frames.every(frame => frame.length === 8), 'One continuous route includes all eight layers');
  assert.deepEqual([...new Set(frames.map(frame => frame.leg))], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert(frames.slice(1).every((frame, i) => frame.progress >= frames[i].progress && frame.scale <= frames[i].scale + 1e-12), 'Pullback never reverses or restarts at a layer handoff');
  assert(frames.filter(frame => frame.progress > 0.01 && frame.progress < 0.99).every(frame => frame.navigating), 'Navigation stays active through every internal layer');
  return { frames: frames.length, durationMs: frames.at(-1).time - frames[0].time, layers: 8 };
}

async function crossTab(context, page, report) {
  const other = await context.newPage();
  other.on('pageerror', error => report.errors.push(error.message));
  other.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  try {
    await other.goto(URL);
    await at(other, 'knowledge');
    await notebook(other);
    assert.equal(await other.locator('[data-entry-id]').count(), 2);
    // Keep one form open while a second tab writes a different entry. Saving
    // the older form must merge against current storage, not replace that write.
    await row(page, TITLE).locator('[data-action="edit-entry"]').click();
    const original = await action(page, 'entry-body').inputValue();
    await beginEntry(other);
    await action(other, 'entry-title').fill('A thought captured in another tab');
    await action(other, 'entry-body').fill('The other browser tab should not lose this entry when its neighbor saves.');
    await saveEntry(other);
    await saved(other, 3);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).notebook.entries.length === 3);
    await action(page, 'entry-body').fill(`${original}\n\nA clarification from the first tab.`);
    await saveEntry(page);
    const merged = await saved(page, 3);
    assert(merged.entries.some(entry => entry.title === 'A thought captured in another tab'));
    assert(merged.entries.find(entry => entry.title === TITLE).body.endsWith('A clarification from the first tab.'));
    await other.waitForFunction(() => JSON.parse(window.render_game_to_text()).notebook.entries.length === 3);
    await row(page, QUESTION).locator('[data-action="edit-entry"]').click();
    await action(page, 'confirm-delete-entry').click();
    await action(page, 'delete-entry').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await saved(page, 2);
    await other.waitForFunction(() => JSON.parse(window.render_game_to_text()).notebook.entries.length === 2);
    assert.equal(await row(other, QUESTION).count(), 0, 'Deletion appears in the other tab without reload');
    await originalLearningKept(page);
    await originalLearningKept(other);
    return { staleFormPreservedOtherEntry: true, secondTabUpdatedWithoutReload: true, deletionSynced: true };
  } finally { await other.close(); }
}

async function storageFailure(browser, variant, report) {
  const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true, acceptDownloads: true });
  const timestamp = new Date().toISOString();
  const baseline = { version: 1, entries: [{
    id: 'verification-existing-entry', title: 'The entry already saved on this device', body: 'This original must remain intact.',
    kind: 'idea', evidence: 'encountered', nodeIds: ['knowledge'], sourceUrl: '', sourceLabel: '',
    createdAt: timestamp, updatedAt: timestamp,
  }] };
  await context.addInitScript(({ noteKey, demoKey, learningKey, leaf, sentinel, initial }) => {
    if (!localStorage.getItem(noteKey)) localStorage.setItem(noteKey, JSON.stringify(initial));
    if (!localStorage.getItem(demoKey)) localStorage.setItem(demoKey, JSON.stringify({ version: 1, completedIds: [leaf], locationId: 'knowledge' }));
    if (!localStorage.getItem(learningKey)) localStorage.setItem(learningKey, sentinel);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === noteKey) throw new DOMException('Verification: browser storage quota exceeded.', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, { noteKey: NOTEBOOK_KEY, demoKey: DEMO_KEY, learningKey: LEARNING_KEY, leaf: LEAF, sentinel: SENTINEL, initial: baseline });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await notebook(page);
    const titles = ['First idea kept during storage failure', 'Second idea kept during storage failure'];
    for (let i = 0; i < titles.length; i++) {
      await beginEntry(page);
      await action(page, 'entry-title').fill(titles[i]);
      await saveEntry(page);
      await page.waitForFunction(expected => JSON.parse(window.render_game_to_text()).notebook.entries.length === expected, i + 2);
      assert.equal(await page.locator('[data-entry-id]').count(), i + 2, 'Every unsaved session entry remains visible after another save fails');
    }
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), NOTEBOOK_KEY), baseline, 'Failed writes keep the valid original bytes');
    assert((await state(page)).saveWarning, 'The interface reports that browser persistence failed');
    const downloadPromise = page.waitForEvent('download');
    await action(page, 'notebook-export').click();
    const download = await downloadPromise;
    const file = path.join(OUTPUT, `${variant.name}-quota-recovery.json`);
    await download.saveAs(file);
    const backup = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(backup.entries.length, 3, 'Export can recover every session-only entry');
    for (const title of titles) assert(backup.entries.some(entry => entry.title === title));
    await originalLearningKept(page);
    await capture(page, `${variant.name}-08-storage-warning`);
    await page.reload();
    await at(page, 'knowledge');
    await notebook(page);
    assert.equal(await page.locator('[data-entry-id]').count(), 1, 'Reload returns to the last successfully persisted notebook');
    assert.equal(await row(page, baseline.entries[0].title).count(), 1);
    return { originalRetained: true, sessionEntriesRetained: 2, recoveryExportEntries: 3, reloadUsesLastPersisted: true };
  } finally { await context.close(); }
}

async function savedLinks(browser, variant, report) {
  const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  const links = p => p.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1') || '{"links":[]}').links);
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await notebook(page);
    await action(page, 'add-link').click();
    await page.locator('[data-link-sheet]').waitFor();
    assert(await action(page, 'link-url').evaluate(el => el === document.activeElement), 'The + sheet focuses the link field');
    await action(page, 'save-link').click();
    await page.getByRole('alert').waitFor();
    assert.equal((await links(page)).length, 0, 'An empty link is never saved');
    await action(page, 'link-url').fill('en.wikipedia.org/wiki/Peppered_moth_evolution');
    await action(page, 'link-note').fill('The peppered moth and natural selection');
    const suggested = 'knowledge.science.biology.evolution.natural-selection';
    await page.locator(`[data-action="link-place"][data-node-id="${suggested}"]`).waitFor();
    await action(page, 'save-link').click();
    await page.locator('[data-link-sheet]').waitFor({ state: 'detached' });
    const [saved] = await links(page);
    assert.equal(saved.url, 'https://en.wikipedia.org/wiki/Peppered_moth_evolution', 'A bare address is saved as https');
    assert.equal(saved.nodeId, suggested, 'The place is suggested from the line');
    await action(page, 'notebook-search').fill('peppered');
    await page.locator(`[data-link-id="${saved.id}"]`).waitFor();
    await action(page, 'notebook-search').fill('');

    const other = await context.newPage();
    await other.goto(URL);
    await at(other, 'knowledge');
    await notebook(other);
    await other.locator(`[data-link-id="${saved.id}"]`).waitFor();

    const downloadPromise = page.waitForEvent('download');
    await action(page, 'notebook-export').click();
    const file = path.join(OUTPUT, `${variant.name}-library-backup.json`);
    await (await downloadPromise).saveAs(file);
    const backup = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(backup.links?.length, 1, 'Export carries saved links');

    await page.locator(`[data-link-id="${saved.id}"] [data-action="edit-link"]`).click();
    await action(page, 'confirm-remove-link').click();
    await action(page, 'remove-link').click();
    await page.locator(`[data-link-id="${saved.id}"]`).waitFor({ state: 'detached' });
    await other.locator(`[data-link-id="${saved.id}"]`).waitFor({ state: 'detached' });
    await importRaw(page, JSON.stringify(backup));
    assert.equal(await page.locator(`[data-link-id="${saved.id}"]`).count(), 0, 'Importing an older backup never brings back a removed link');
    await other.close();
    return { saved: true, suggestedPlace: true, otherTabSynced: true, exported: true, removalSurvivesImport: true };
  } finally { await context.close(); }
}

// A link under several places (a video saved from Watch): the Library's sheet shows every one, takes
// one off on its own, and None leaves it under no place at all.
async function multiPlaceLink(browser, variant, report) {
  const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true });
  const at0 = '2026-10-20T12:00:00.000Z';
  const places = ['knowledge.science.biology.evolution.natural-selection', 'knowledge.science.biology.evolution', 'knowledge.arts.music'];
  await context.addInitScript(record => { if (!localStorage.getItem('mok-library-v1')) localStorage.setItem('mok-library-v1', JSON.stringify(record)); }, { version: 2, items: [], notes: [], links: [{ id: 'multi-place-link', url: 'https://example.org/finches', note: 'Finch beaks', nodeId: places[0], places: places.slice(1), createdAt: at0, updatedAt: at0 }] });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('mok-library-v1')).links[0]);
  const editSheet = async () => {
    await page.locator('[data-link-id="multi-place-link"] [data-action="open-link-item"]').click();
    await action(page, 'item-edit-link').click();
    await page.locator('[data-link-sheet]').waitFor();
  };
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await notebook(page);
    await editSheet();
    const shown = await page.$$eval('[data-link-sheet] .lib-place-pick [data-node-id]', els => els.map(el => el.dataset.nodeId));
    assert.deepEqual(shown, places, 'The link sheet shows every place the link is under');
    await page.locator(`[data-link-sheet] [data-node-id="${places[2]}"] [data-action="link-place-remove"]`).click();
    await action(page, 'save-link').click();
    await page.locator('[data-link-sheet]').waitFor({ state: 'detached' });
    const one = await stored();
    assert.deepEqual([one.nodeId, ...(one.places ?? [])], places.slice(0, 2), 'Taking one place off keeps the others');
    await editSheet();
    await page.locator('[data-link-sheet] [aria-label="No place"]').click();
    await action(page, 'save-link').click();
    await page.locator('[data-link-sheet]').waitFor({ state: 'detached' });
    const none = await stored();
    assert.equal(none.nodeId, null, 'None clears its own place');
    assert.equal(none.places, undefined, 'None clears its further places too');
    return { everyPlaceShown: true, oneTakenOff: true, noneClearsAll: true };
  } finally { await context.close(); }
}

async function edgeFixture(browser, variant) {
  const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true, acceptDownloads: true });
  const timestamp = new Date().toISOString();
  const baseline = { version: 1, entries: [{
    id: 'verification-shared-entry', title: 'The shared original idea', body: 'The original explanation.',
    kind: 'idea', evidence: 'encountered', nodeIds: ['knowledge'], sourceUrl: '', sourceLabel: '',
    createdAt: timestamp, updatedAt: timestamp,
  }] };
  await context.addInitScript(({ noteKey, demoKey, learningKey, leaf, sentinel, initial }) => {
    if (localStorage.getItem(noteKey) === null) localStorage.setItem(noteKey, JSON.stringify(initial));
    if (localStorage.getItem(demoKey) === null) localStorage.setItem(demoKey, JSON.stringify({ version: 1, completedIds: [leaf], locationId: 'knowledge' }));
    if (localStorage.getItem(learningKey) === null) localStorage.setItem(learningKey, sentinel);
  }, { noteKey: NOTEBOOK_KEY, demoKey: DEMO_KEY, learningKey: LEARNING_KEY, leaf: LEAF, sentinel: SENTINEL, initial: baseline });
  return { context, baseline };
}

async function edgeCases(variant) {
  const browser = await variant.type.launch({ headless: true });
  const report = { variant: variant.name, checks: [], errors: [], passed: false };
  const attach = page => {
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  };
  const start = async page => { attach(page); await page.goto(URL); await at(page, 'knowledge'); await notebook(page); };
  const check = text => { report.checks.push(text); console.log(`${variant.name}: ${text}`); };
  try {
    {
      const { context, baseline } = await edgeFixture(browser, variant);
      try {
        const local = await context.newPage();
        await local.addInitScript(key => {
          window.verificationQuotaBlocked = true;
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function(name, value) {
            if (name === key && window.verificationQuotaBlocked) throw new DOMException('Verification quota exceeded.', 'QuotaExceededError');
            return original.call(this, name, value);
          };
        }, NOTEBOOK_KEY);
        await start(local);
        await beginEntry(local);
        await action(local, 'entry-title').fill('Pending idea in the first tab');
        await saveEntry(local);
        await local.waitForFunction(() => JSON.parse(window.render_game_to_text()).notebook.entries.length === 2);

        const remote = await context.newPage();
        await start(remote);
        await beginEntry(remote);
        await action(remote, 'entry-title').fill('New idea saved in the second tab');
        await saveEntry(remote);
        const remoteBook = await saved(remote, 2);
        const remoteRaw = await remote.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
        await local.evaluate(() => { window.verificationQuotaBlocked = false; });
        await beginEntry(local);
        await action(local, 'entry-title').fill('A draft after the conflict');
        await saveEntry(local);
        assert((await state(local)).saveWarning, 'A blocked overwrite is explained with recovery guidance');
        assert.equal(await local.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), remoteRaw, 'Quota recovery never overwrites the other tab’s successful write');
        const downloadPromise = local.waitForEvent('download');
        await action(local, 'notebook-export').click();
        const backupFile = path.join(OUTPUT, `${variant.name}-conflict-recovery.json`);
        await (await downloadPromise).saveAs(backupFile);
        const pendingBackup = JSON.parse(await readFile(backupFile, 'utf8'));
        assert(pendingBackup.entries.some(entry => entry.title === 'Pending idea in the first tab'), 'The pending session remains recoverable by export');
        assert(pendingBackup.entries.some(entry => entry.id === baseline.entries[0].id));
        assert(pendingBackup.entries.some(entry => entry.title === 'A draft after the conflict'), 'New session work remains recoverable when disk writes are blocked');
        await importRaw(local, JSON.stringify(remoteBook));
        const merged = await saved(local, 4);
        assert(merged.entries.some(entry => entry.title === 'Pending idea in the first tab'));
        assert(merged.entries.some(entry => entry.title === 'New idea saved in the second tab'));
        await originalLearningKept(local);
        check('Quota recovery blocks conflicting writes, retains the pending draft/export, and explicit import merges both tabs.');
      } finally { await context.close(); }
    }
    {
      const { context, baseline } = await edgeFixture(browser, variant);
      try {
        const local = await context.newPage();
        const remote = await context.newPage();
        await start(local);
        await start(remote);
        const title = baseline.entries[0].title;
        await row(local, title).locator('[data-action="edit-entry"]').click();
        await row(remote, title).locator('[data-action="edit-entry"]').click();
        await action(remote, 'entry-body').fill('A newer explanation from the second tab.');
        await saveEntry(remote);
        const remoteBook = await saved(remote, 1);
        await action(local, 'entry-body').fill('A stale edit from the first tab.');
        await action(local, 'save-entry').click();
        await local.getByRole('dialog').getByRole('alert').waitFor({ state: 'visible' });
        assert.deepEqual(await saved(local, 1), remoteBook, 'An old editor cannot overwrite a newer note');
        assert.equal(await action(local, 'entry-body').inputValue(), 'A stale edit from the first tab.');
        await local.keyboard.press('Escape');
        await local.getByRole('dialog').waitFor({ state: 'hidden' });
        await row(local, title).locator('[data-action="edit-entry"]').click();
        await row(remote, title).locator('[data-action="edit-entry"]').click();
        await action(remote, 'confirm-delete-entry').click();
        await action(remote, 'delete-entry').click();
        await remote.getByRole('dialog').waitFor({ state: 'hidden' });
        await saved(remote, 0);
        await action(local, 'entry-body').fill('A draft whose original was deleted elsewhere.');
        await action(local, 'save-entry').click();
        await local.getByRole('dialog').getByRole('alert').waitFor({ state: 'visible' });
        assert.equal((await saved(local, 0)).entries.length, 0, 'A stale editor cannot resurrect a remote deletion');
        assert.equal(await action(local, 'entry-body').inputValue(), 'A draft whose original was deleted elsewhere.');
        await originalLearningKept(local);
        check('Stale editors cannot overwrite a remote edit or resurrect a deleted note, and their drafts remain available.');
      } finally { await context.close(); }
    }
    {
      const { context, baseline } = await edgeFixture(browser, variant);
      try {
        const page = await context.newPage();
        await start(page);
        const before = await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
        const incoming = { version: 1, entries: Array.from({ length: 2000 }, (_, i) => ({ ...baseline.entries[0], id: `incoming-cap-${i}`, title: `Incoming idea ${i}` })) };
        await importRaw(page, JSON.stringify(incoming));
        assert.equal((await state(page)).notebook.entries.length, 1, 'An oversized union does not replace valid in-memory notebook state');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), before, 'An oversized union does not replace persisted state');
        const downloadPromise = page.waitForEvent('download');
        await action(page, 'notebook-export').click();
        const backupFile = path.join(OUTPUT, `${variant.name}-capacity-retained.json`);
        await (await downloadPromise).saveAs(backupFile);
        assert.deepEqual(JSON.parse(await readFile(backupFile, 'utf8')), baseline, 'The original notebook remains exportable after a capacity error');
        await originalLearningKept(page);
        check('A valid import whose merged notebook exceeds capacity leaves original memory, storage and export intact.');
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) { report.failure = error.stack || String(error); throw error; }
  finally {
    await writeFile(path.join(OUTPUT, `${variant.name}-edges.json`), JSON.stringify(report, null, 2));
    await browser.close();
  }
  return report;
}

async function journey(variant) {
  const browser = await variant.type.launch({ headless: true });
  const context = await browser.newContext({
    viewport: variant.viewport, isMobile: variant.mobile, hasTouch: true,
    deviceScaleFactor: 1, acceptDownloads: true,
  });
  await context.addInitScript(({ demoKey, learningKey, leaf, sentinel }) => {
    if (!localStorage.getItem(demoKey)) localStorage.setItem(demoKey, JSON.stringify({ version: 1, completedIds: [leaf], locationId: 'knowledge' }));
    if (!localStorage.getItem(learningKey)) localStorage.setItem(learningKey, sentinel);
  }, { demoKey: DEMO_KEY, learningKey: LEARNING_KEY, leaf: LEAF, sentinel: SENTINEL });
  const page = await context.newPage();
  const report = {
    variant: variant.name, browser: browser.version(), viewport: variant.viewport,
    checks: [], errors: [], screenshots: [], passed: false,
    limitation: variant.mobile ? 'WebKit with an iPhone-sized touch viewport, not a physical iPhone.' : null,
  };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !guideOffline(message.text())) report.errors.push(message.text()); });
  const shot = async label => { const name = `${variant.name}-${label}`; await capture(page, name); report.screenshots.push(`${name}.png`); };
  const checked = label => { report.checks.push(label); console.log(`${variant.name}: ${label}`); };
  try {
    await page.goto(URL);
    await at(page, 'knowledge');
    await page.evaluate(() => document.fonts.ready);
    await originalLearningKept(page);
    const worldGeometry = await geometry(page);
    await noOverflow(page);
    await shot('01-atlas');

    await notebook(page);
    assert.equal(await page.locator('[data-entry-id]').count(), 0);
    await noOverflow(page, '[data-workspace="notebook"]');
    await shot('02-empty-notebook');
    // Start this particular dialog with the keyboard, so returning focus has a
    // defined opener even on Safari, where pointer-clicked buttons need not focus.
    await action(page, 'create-entry').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    const beforeInvalidCapture = await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
    await focusTrap(page);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await state(page)).location.id, 'knowledge');
    assert(await action(page, 'create-entry').evaluate(el => el === document.activeElement), 'Closing capture restores its opener focus');
    checked('Notebook starts empty; capture traps keyboard focus and Escape restores its opener.');

    await beginEntry(page);
    await action(page, 'save-entry').click();
    await page.getByRole('alert').filter({ hasText: 'title' }).waitFor();
    await action(page, 'entry-title').fill(TITLE);
    await action(page, 'entry-body').fill(BODY);
    await chooseTopic(page, TOPICS[0], 'music');
    await chooseTopic(page, TOPICS[1], 'technology');
    const chips = page.locator('.capture-topic-chip');
    // The global atlas label may be "Knowledge" or "All knowledge"; identify
    // the selected root by exclusion of the two deliberately selected topics.
    const rootChip = chips.filter({ hasNotText: /Music|Technology/ });
    if (await rootChip.count()) await rootChip.first().click();
    assert.equal(await chips.count(), 2, 'An idea can be placed in two distinct territories');
    await action(page, 'add-entry-topic').click();
    await page.locator('.capture-source summary').click();
    await action(page, 'entry-source-label').fill('Personal study notes');
    await action(page, 'entry-source-url').fill('javascript:alert(1)');
    await action(page, 'save-entry').click();
    await page.getByRole('alert').filter({ hasText: 'http' }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), beforeInvalidCapture, 'Invalid source does not create a notebook record');
    await action(page, 'entry-source-url').fill('https://example.org/study-notes');
    await page.locator('[data-action="entry-evidence"][value="explained"]').check();
    await noOverflow(page, '[role="dialog"]');
    await shot('03-capture-idea');
    await saveEntry(page);
    const firstSave = await saved(page, 1);
    const idea = firstSave.entries[0];
    assert.equal(idea.title, TITLE);
    assert.equal(idea.body, BODY);
    assert.equal(idea.evidence, 'explained');
    assert.deepEqual(idea.nodeIds.sort(), [...TOPICS].sort());
    await originalLearningKept(page);
    checked('Idea capture validates titles and source links, saves personal reflection, and links across topics.');

    await beginEntry(page, 'question');
    await action(page, 'entry-title').fill(QUESTION);
    await action(page, 'entry-body').fill('A question to revisit after my next listening session.');
    assert.equal(await page.locator('[data-action="entry-evidence"]').count(), 0, 'Questions do not masquerade as an assessment');
    await saveEntry(page);
    const secondSave = await saved(page, 2);
    assert.equal(secondSave.entries.find(entry => entry.kind === 'question').evidence, 'encountered');
    await shot('04-notebook');
    await action(page, 'notebook-search').fill('rhythm');
    assert.equal(await page.locator('[data-entry-id]').count(), 1);
    assert.equal(await row(page, TITLE).count(), 1);
    await action(page, 'notebook-search').fill('Personal study notes');
    assert.equal(await page.locator('[data-entry-id]').count(), 1);
    await action(page, 'notebook-search').fill('Technology');
    assert.equal(await page.locator('[data-entry-id]').count(), 1);
    await action(page, 'notebook-search').fill('a phrase that will not match');
    assert.equal(await page.locator('[data-entry-id]').count(), 0);
    await action(page, 'notebook-search').fill('');
    await page.locator('[data-action="notebook-filter"][data-filter="question"]').click();
    assert.equal(await page.locator('[data-entry-id]').count(), 1);
    assert.equal(await row(page, QUESTION).count(), 1);
    await page.locator('[data-action="notebook-filter"][data-filter="all"]').click();
    checked('Questions, kind filters, and search by title, source and linked topic work.');

    const downloadPromise = page.waitForEvent('download');
    await action(page, 'notebook-export').click();
    const download = await downloadPromise;
    const exportedPath = path.join(OUTPUT, `${variant.name}-notebook-backup.json`);
    await download.saveAs(exportedPath);
    const exportedRaw = await readFile(exportedPath, 'utf8');
    assert.deepEqual(JSON.parse(exportedRaw), secondSave, 'The exported backup exactly represents the saved notebook');
    await page.reload();
    await at(page, 'knowledge');
    await notebook(page);
    assert.equal(await page.locator('[data-entry-id]').count(), 2);
    await row(page, TITLE).locator('[data-action="edit-entry"]').click();
    await action(page, 'entry-body').fill(UPDATED_BODY);
    await page.locator('[data-action="entry-evidence"][value="applied"]').check();
    await saveEntry(page);
    const updatedSave = await saved(page, 2);
    const edited = updatedSave.entries.find(entry => entry.id === idea.id);
    assert.equal(edited.createdAt, idea.createdAt, 'Editing preserves original creation date');
    assert.equal(edited.body, UPDATED_BODY);
    assert.equal(edited.evidence, 'applied');
    assert.equal(updatedSave.entries.length, 2, 'Editing does not create a duplicate entry');
    checked('Export is a faithful backup; reload preserves entries and editing retains identity.');

    await row(page, QUESTION).locator('[data-action="edit-entry"]').click();
    await action(page, 'confirm-delete-entry').click();
    await page.getByRole('button', { name: 'Keep it', exact: true }).click();
    assert.equal(await action(page, 'delete-entry').count(), 0, 'Delete can be canceled');
    await action(page, 'confirm-delete-entry').click();
    await action(page, 'delete-entry').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await saved(page, 1);
    await importRaw(page, exportedRaw);
    const restored = await saved(page, 2);
    assert.equal(restored.entries.find(entry => entry.id === idea.id).body, UPDATED_BODY, 'Older import never overwrites a newer local edit');
    assert.equal(restored.entries.find(entry => entry.kind === 'question').title, QUESTION, 'Import restores the deleted entry');
    await importRaw(page, exportedRaw);
    assert.equal((await saved(page, 2)).entries.length, 2, 'Import is idempotent and does not duplicate entries');
    const beforeBadImport = await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
    await importRaw(page, '{broken json');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), beforeBadImport);
    const badSource = JSON.parse(exportedRaw);
    badSource.entries[0].sourceUrl = 'javascript:alert(1)';
    await importRaw(page, JSON.stringify(badSource));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), beforeBadImport);
    const badTopic = JSON.parse(exportedRaw);
    badTopic.entries[0].nodeIds = ['knowledge.unknown-area'];
    await importRaw(page, JSON.stringify(badTopic));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY), beforeBadImport);
    await originalLearningKept(page);
    checked('Delete is confirmable; imports merge safely, retain newer edits, reject malformed data and stay duplicate-free.');

    await row(page, TITLE).locator('[data-action="reflect-entry"]').click();
    const reflectionDialog = page.getByRole('dialog');
    await action(page, 'reflection-body').waitFor({ state: 'visible' });
    assert(!await reflectionDialog.getByText(UPDATED_BODY, { exact: true }).count(), 'Revisit hides the previous explanation until comparison');
    assert(await action(page, 'save-reflection').isDisabled(), 'An empty reflection cannot be saved');
    const reflection = 'I remember that a repeating pattern gives an idea a predictable structure. I still want to test whether that helps recall after a week.';
    await action(page, 'reflection-body').fill(reflection);
    assert(await action(page, 'save-reflection').isDisabled(), 'A reflection is compared with the original before saving');
    await action(page, 'reveal-note').click();
    await reflectionDialog.getByText(UPDATED_BODY, { exact: true }).waitFor({ state: 'visible' });
    assert(await action(page, 'save-reflection').isEnabled());
    await noOverflow(page, '[role="dialog"]');
    await shot('05-reflection');
    await action(page, 'save-reflection').click();
    await reflectionDialog.waitFor({ state: 'hidden' });
    const reflected = (await saved(page, 2)).entries.find(entry => entry.id === idea.id);
    assert(reflected.body.startsWith(UPDATED_BODY), 'Reflection keeps the original explanation');
    assert(reflected.body.includes(reflection), 'Reflection is retained on its original entry');
    assert.equal(reflected.id, idea.id);
    assert.equal(reflected.createdAt, idea.createdAt);
    assert.equal(reflected.evidence, 'applied', 'A reflection does not downgrade an applied idea');
    await originalLearningKept(page);
    checked('Revisit begins from memory, reveals the original for comparison, and appends the reflection without losing the note.');

    await row(page, TITLE).locator(`[data-action="notebook-navigate"][data-node-id="${TOPICS[0]}"]`).click();
    await at(page, TOPICS[0]);
    assert.equal((await state(page)).workspace, 'atlas');
    await originalLearningKept(page);
    await shot('05-linked-topic');
    await home(page);
    await at(page, 'knowledge');
    assert.deepEqual(await geometry(page), worldGeometry, 'Notebook roundtrip and topic navigation retain exact world geography');
    assert.equal(await page.locator('.map-cell.is-complete').count(), 0, 'No broad region is colored from personal note capture');
    checked('Notebook topic links navigate the existing atlas without recoloring territories or changing geometry.');

    report.pullback = await deepPullback(page);
    await originalLearningKept(page);
    assert.deepEqual(await geometry(page), worldGeometry);
    checked('The eight-layer sample and continuous world pullback still work in the new shell.');

    await notebook(page);
    await page.setViewportSize(variant.mobile ? { width: 844, height: 390 } : { width: 390, height: 844 });
    await page.waitForTimeout(150);
    await noOverflow(page, '[data-workspace="notebook"]');
    await row(page, TITLE).locator('[data-action="edit-entry"]').click();
    await noOverflow(page, '[role="dialog"]');
    await shot('06-resized-editor');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.setViewportSize(variant.viewport);
    await noOverflow(page, '[data-workspace="notebook"]');
    await shot('07-final-notebook');
    checked('Notebook and editor remain usable after phone/landscape resize.');
    report.crossTab = await crossTab(context, page, report);
    checked('Concurrent tabs preserve each other’s entries and synchronize edits and deletion without reload.');
    report.storageFailure = await storageFailure(browser, variant, report);
    checked('When browser storage fails, multiple session-only notes remain visible and exportable while the original save stays intact.');
    report.savedLinks = await savedLinks(browser, variant, report);
    checked('The + sheet saves a link with a suggested place; it is searchable, syncs to another tab, exports, and a removal survives an older import.');
    report.multiPlaceLink = await multiPlaceLink(browser, variant, report);
    checked('A link under several places shows them all on its sheet; one comes off on its own, and None clears them all.');
    await originalLearningKept(page);
    assert.deepEqual(report.errors, [], 'No browser runtime or console errors');
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error);
    await capture(page, `${variant.name}-failure`).catch(() => {});
    throw error;
  } finally {
    await writeFile(path.join(OUTPUT, `${variant.name}-report.json`), JSON.stringify(report, null, 2));
    await browser.close();
  }
  return report;
}

const reports = [];
for (const variant of VARIANTS) {
  if (process.env.MOK_ENGINE && !variant.name.startsWith(process.env.MOK_ENGINE)) continue;
  reports.push(await (process.env.MOK_EDGES_ONLY ? edgeCases(variant) : journey(variant)));
}
await writeFile(path.join(OUTPUT, process.env.MOK_EDGES_ONLY ? 'summary-edges.json' : 'summary.json'), JSON.stringify(reports, null, 2));
console.log(`Learning studio verification passed in ${reports.length} browser variants.`);
