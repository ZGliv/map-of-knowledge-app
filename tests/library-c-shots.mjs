// Prototype C of the Library, the Mosaic (#/lab/library-c), at 375×812 with an iPhone's insets and at
// 1440×900: empty, a first thing kept, 500 things across the atlas, and a learner a few months in.
// Seeds the learner a few months in, across Genetics, Evolution, Physics, Music and History,
// through the app's own store modules (never the app's code paths): books and films found through
// Open Library and Wikidata, Watch videos from the real pool saved the way Watch saves them, reels
// pinned on the real shelf, links read by /api/unfurl, notes, six proved places (two ready to refresh)
// written with the ledgers' own functions, and two collections. Then walks the Mosaic and shoots it.
//
//   MOK_URL=http://127.0.0.1:5239 node tests/library-c-shots.mjs
//
// Writes output/library-c/*.png and output/library-c/contact-sheet.png. Network: openlibrary.org,
// wikidata.org, i.ytimg.com, upload.wikimedia.org, and the pages unfurled. The link reader runs on
// 5191 (started here if it is not already running).
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { seed } from './library-c-seed.mjs';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5239';
const LAB = `${URL}/#/lab/library-c`;
const OUT = path.resolve('output/library-c');
await mkdir(OUT, { recursive: true });

let reader = null;
const readerUp = async () => { try { const r = await fetch('http://127.0.0.1:5191/api/unfurl?url=https%3A%2F%2Fexample.org%2F'); return r.status < 500; } catch { return false; } };
if (!await readerUp()) {
  reader = spawn(process.execPath, ['scripts/unfurl-server.mjs'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !await readerUp(); i++) await new Promise(r => setTimeout(r, 100));
}

const VARIANTS = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true, insets: { top: 59, bottom: 34 } },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
].filter(v => !process.env.MOK_VARIANTS || process.env.MOK_VARIANTS.split(',').includes(v.name));
const insetCss = ({ top = 0, bottom = 0 }) => `:root{--safe-top:${top}px!important;--safe-bottom:${bottom}px!important}`;
const browser = await chromium.launch({ headless: true });
const errors = [];
const shots = [];

async function open(variant) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 2, isMobile: variant.mobile, hasTouch: variant.mobile });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${variant.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|404|502|ERR_|wikidata\.org.*CORS policy/.test(message.text())) errors.push(`${variant.name}: ${message.text()}`); });
  if (variant.insets) await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss(variant.insets));
  return { context, page };
}
const settle = async page => {
  await page.waitForFunction(() => [...document.querySelectorAll('.lc img')].every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
};
async function shot(page, variant, name) {
  await settle(page);
  const file = path.join(OUT, `${variant.name}-${name}.png`);
  await page.screenshot({ path: file });
  shots.push({ variant: variant.name, file });
  console.log(`shot ${variant.name}-${name}`);
}
const scrollTo = (page, selector, offset = 0) => page.evaluate(([s, o]) => { const scroller = document.querySelector('.lc-scroll'); const el = document.querySelector(s); if (scroller && el) scroller.scrollTo(0, el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - o); }, [selector, offset]);
// A hash-only change never reloads, so the page is reloaded to read what was just seeded.
const lab = async page => { await page.goto(LAB); await page.reload(); await page.waitForSelector('[data-lab="library-c"] [data-tile]', { timeout: 30000 }); };

try {
  for (const variant of VARIANTS) {
    const phone = variant.name === 'phone';
    // 1. An empty library: the whole atlas, waiting.
    {
      const { context, page } = await open(variant);
      await lab(page);
      assert.equal(await page.locator('.lc-tile.is-ghost').count(), 8, 'An empty library shows every territory, never a default field');
      await shot(page, variant, '01-empty');
      await context.close();
    }
    // 2. A learner a few months in.
    const { context, page } = await open(variant);
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    const seeded = await page.evaluate(seed);
    console.log(`seeded ${variant.name}`, JSON.stringify(seeded));
    await lab(page);
    await page.waitForSelector('[data-tile="knowledge.science.biology.evolution"]');
    await page.waitForFunction(() => document.querySelectorAll('.lc-recent .lc-row').length >= 5, null, { timeout: 30000 });
    const tiles = await page.$$eval('[data-tile]', els => els.map(el => el.getAttribute('data-tile')));
    assert.ok(['knowledge.science.biology.genetics-genomes', 'knowledge.arts.music', 'knowledge.humanities.history'].every(id => tiles.includes(id)) && tiles.some(id => id.startsWith('knowledge.science.physics')), `Every field the learner touched is a tile: ${tiles.join(', ')}`);
    await shot(page, variant, '02-mosaic');
    if (phone) { await scrollTo(page, '.lc-collections', 120); await shot(page, variant, '03-collections'); await scrollTo(page, '.lc-head', 200); }

    // Search: on a phone it opens from the shell's magnifier and lists results right under the field;
    // on a desktop the field sits in the head and lights the tiles that hold a match.
    if (phone) {
      await page.click('[data-action="open-search"]');
      await page.keyboard.type('plague');
      await page.waitForSelector('[data-lit]');
    } else {
      await page.fill('[data-action="lc-search"]', 'plague');
      await page.waitForSelector('.lc-tile.is-hit');
    }
    await shot(page, variant, '04-search');
    if (phone) await page.click('[data-action="lc-search-cancel"]'); else await page.fill('[data-action="lc-search"]', '');
    await page.waitForSelector('.lc-stage');

    // Browse: Evolution zooms open into its places.
    await page.click('[data-tile="knowledge.science.biology.evolution"]');
    await page.waitForSelector('[data-screen="area"] [data-tile]');
    await page.waitForTimeout(700);
    await shot(page, variant, '05-browse-evolution');
    if (phone) { await scrollTo(page, '.lc-side', 110); await shot(page, variant, '06-browse-list'); }

    // A place: its collection, ending in proof.
    await scrollTo(page, '.lc-head', 200);
    await page.click(`[data-tile="${'knowledge.science.biology.evolution.natural-selection'}"]`);
    await page.waitForSelector('[data-screen="place"]');
    await shot(page, variant, '07-place');
    if (phone) { await scrollTo(page, '.lc-proof', 380); await shot(page, variant, '08-place-proof'); }
    assert.equal(await page.locator('[data-screen="place"] .lc-proof').count(), 1, 'A place ends in proof');

    // An item: the existing item page.
    await page.locator('[data-screen="place"] .lc-row button:has(img)').filter({ has: page.locator('.lc-pic.is-book') }).first().click();
    await page.waitForSelector('.lib-sheet');
    await shot(page, variant, '09-item');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.lib-sheet', { state: 'detached' });

    // A collection of the learner's own.
    await page.click('[data-action="lc-back"]');
    await page.click('[data-action="lc-back"]');
    await page.waitForSelector('[data-screen="home"]');
    const first = await page.$eval('[data-collection]', el => el.getAttribute('data-collection'));
    await page.click(`[data-collection="${first}"]`);
    await page.waitForSelector('[data-screen="collection"]');
    await shot(page, variant, '10-collection');
    if (phone) { await scrollTo(page, '.lc-proof', 420); await shot(page, variant, '11-collection-proof'); }

    // Add: the + in the head opens the existing add sheet.
    await page.click('[data-action="lc-back"]');
    await page.click('[data-action="lc-add"]');
    await page.waitForSelector('[data-add-sheet]');
    await page.fill('[data-action="link-url"]', 'mendel');
    await page.waitForSelector('[data-found-group="books"] [data-found]', { timeout: 30000 }).catch(() => {});
    await shot(page, variant, '12-add');
    await page.keyboard.press('Escape');

    // A new collection.
    await page.click('[data-action="collection-new"]');
    await page.waitForSelector('[data-picker="new"]');
    await page.fill('[data-action="collection-name"]', 'The plague years');
    for (const key of await page.$$eval('[data-pick]', els => els.slice(0, 5).map(el => el.getAttribute('data-pick')))) await page.click(`[data-pick="${key}"]`);
    await page.evaluate(() => document.querySelector('[data-picker]')?.scrollTo(0, 0));
    await shot(page, variant, '13-new-collection');
    await page.keyboard.press('Escape');
    await context.close();

    // A first thing kept: one short tile, and the thing itself under it.
    {
      const { context, page } = await open(variant);
      await page.goto(URL);
      await page.waitForFunction(() => !!window.render_game_to_text);
      await page.evaluate(async () => {
        const store = await import('/src/notebook/libraryStore.ts');
        const preview = await import('/src/notebook/LinkSheet.tsx').then(m => m.unfurlLink('https://en.wikipedia.org/wiki/Black_hole')).catch(() => null);
        const problem = store.saveLibrary(store.saveLink(store.createLibraryStore(), { url: 'https://en.wikipedia.org/wiki/Black_hole', note: '', nodeId: 'knowledge.science.astronomy', preview }));
        if (problem) throw new Error(problem);
      });
      await lab(page);
      await shot(page, variant, '14-first-thing');
      await context.close();
    }
    // 500 things spread over the whole atlas: the biggest fields as tiles, the rest an index.
    {
      const { context, page } = await open(variant);
      await page.goto(URL);
      await page.waitForFunction(() => !!window.render_game_to_text);
      await page.evaluate(async () => {
        const [store, notebookStore, { catalog }, poolMod, youtube] = await Promise.all([import('/src/notebook/libraryStore.ts'), import('/src/core/notebook.ts'), import('/src/core/catalog.ts'), import('/src/feed/pool.ts'), import('/src/feed/youtube.ts')]);
        const nodes = catalog.all().filter(n => n.depth >= 3);
        const videos = (await poolMod.loadPool()).videos.filter(v => !v.short);
        let seed = 7;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        let library = store.createLibraryStore(), notebook = notebookStore.createNotebook();
        for (let i = 0; i < 500; i++) {
          const r = random();
          if (r < 0.45) {
            const v = videos[Math.floor(random() * videos.length)];
            library = store.saveLink(library, { url: youtube.libraryUrl(v.id), note: v.title.slice(0, 200), nodeId: v.places[0], places: v.places.slice(1), preview: { title: v.title.slice(0, 300), description: '', siteName: 'YouTube', image: youtube.posterUrls(v, 'card')[0], at: new Date().toISOString() } });
          } else {
            const node = nodes[Math.floor(random() * nodes.length)];
            if (r < 0.85) library = store.saveLink(library, { url: `https://example.org/${i}`, note: `Notes on ${node.name}`, nodeId: node.id });
            else notebook = notebookStore.upsertNotebookEntry(notebook, { title: `Why does ${node.name.toLowerCase()} work?`, body: '', sourceUrl: '', sourceLabel: '', kind: 'question', evidence: 'encountered', nodeIds: [node.id] });
          }
        }
        const problems = [store.saveLibrary(library), notebookStore.saveNotebook(notebook)].filter(Boolean);
        if (problems.length) throw new Error(problems.join(' | '));
      });
      await lab(page);
      await page.waitForSelector('.lc-index [data-index]');
      await shot(page, variant, '15-500');
      if (phone) { await scrollTo(page, '.lc-index', 70); await shot(page, variant, '16-500-index'); await scrollTo(page, '.lc-head', 200); }
      await page.click(`[data-tile="${await page.$eval('.lc-tile', el => el.dataset.tile)}"]`);
      await page.waitForSelector('[data-screen="area"], [data-screen="place"]');
      await page.waitForTimeout(700);
      await shot(page, variant, '17-500-field');
      await context.close();
    }
  }
} finally {
  await browser.close();
  reader?.kill();
}

// The contact sheet: every phone screen in a row or two, then the desktop screens.
const py = `
import sys
from PIL import Image
files=sys.argv[2:]
phones=[Image.open(f) for f in files if '/phone-' in f]
desks=[Image.open(f) for f in files if '/desktop-' in f]
pad=40
pw=375*2//2; ph=812*2//2
cols=min(9,len(phones)) or 1
rows=(len(phones)+cols-1)//cols
dw=(pw*cols+pad*(cols-1)-2*pad)//3 if desks else 0
dh=int(dw*900/1440) if desks else 0
W=pw*cols+pad*(cols+1)
H=pad+rows*(ph+pad)+((len(desks)+2)//3)*(dh+pad)
sheet=Image.new('RGB',(W,H),(8,8,9))
for i,im in enumerate(phones):
    r,c=divmod(i,cols); sheet.paste(im.resize((pw,ph)),(pad+c*(pw+pad),pad+r*(ph+pad)))
y0=pad+rows*(ph+pad)
for i,im in enumerate(desks):
    r,c=divmod(i,3); sheet.paste(im.resize((dw,dh)),(pad+c*(dw+pad),y0+r*(dh+pad)))
sheet.save(sys.argv[1])
`;
if (shots.length) execFileSync('python3', ['-c', py, path.join(OUT, 'contact-sheet.png'), ...shots.map(s => s.file)]);
console.log(`contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
if (errors.length) { console.log('page errors:\n' + errors.join('\n')); process.exitCode = 1; }
