// Stage 6: look at it. Every new reel in a day's deck, played in a real browser at phone size
// (375 × 812): the prediction, each frame, the end card, saved as one strip per reel, plus a contact
// sheet of the day. Needs the dev server (MOK_URL, or --url).
//   → output/reelengine/<date>/<reel>.png and output/reelengine/<date>/contact-sheet.png
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';
import { APP_EXPORTS, deckFile, ensure, loadTs, logStage, outDir, readJson } from '../lib.mjs';

const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const pageSel = i => `.reel-page[data-page="${i}"]`;

async function shootReel(browser, url, date, index, reel, dir) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${url}/?day=${date}`);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.click('[data-action="open-explore-mobile"]');
    // Explore opens on Watch (the video feed); the day's reels are on the Reels tab.
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    await page.evaluate(i => { const pager = document.querySelector('.reel-pager'); pager.scrollTop = i * pager.clientHeight; }, index);
    await page.waitForSelector(`${pageSel(index)} [data-reel-id="${reel.id}"] [data-action="reel-predict"]`, { timeout: 20000 });
    await page.waitForFunction(i => Number(document.querySelector('.reel-feed')?.dataset.reelIndex) === i, index, { timeout: 15000 });
    await page.waitForFunction(sel => [...document.querySelectorAll(`${sel} img`)].slice(0, 1).every(img => img.complete && img.naturalWidth > 0), pageSel(index), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const shots = [];
    const shot = async name => {
      const file = path.join(dir, `${reel.id}.${name}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
      // A picture that failed to load (Commons throttles bursts) would pass as a dark screen: say so.
      const broken = await page.evaluate(sel => [...document.querySelectorAll(`${sel} .reel-layer.is-active img`)].filter(img => img.complete && !img.naturalWidth).map(img => img.currentSrc || img.src), pageSel(index));
      if (broken.length) errors.push(`${name}: image did not load (${broken.map(src => decodeURIComponent(src.split('/').pop())).join(', ')}); render again`);
    };
    await shot('0-predict');
    await page.click(`${pageSel(index)} [data-action="reel-predict"][data-choice="${reel.prediction.answer}"]`);
    for (let k = 0; k < reel.frames.length; k++) {
      await page.waitForFunction(([sel, k]) => Number(document.querySelector(`${sel} .reel`)?.dataset.frame) >= k, [pageSel(index), k], { timeout: 70000 });
      await page.waitForTimeout(k ? 1600 : 1300);
      await shot(`${k + 1}-frame`);
    }
    await page.waitForSelector(`${pageSel(index)} .reel[data-phase="end"]`, { timeout: 70000 });
    await page.waitForTimeout(1000);
    await shot(`${reel.frames.length + 1}-end`);
    const strip = path.join(dir, `${reel.id}.png`);
    execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...shots.flatMap(f => ['-i', f]), '-filter_complex', `${shots.map((_, i) => `[${i}]scale=375:812[s${i}]`).join(';')};${shots.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${shots.length}[out]`, '-map', '[out]', strip]);
    const end = await page.evaluate(sel => ({ prove: document.querySelector(`${sel} .reel-end-actions .reel-prove`)?.textContent?.trim(), action: document.querySelector(`${sel} .reel-end-actions .reel-prove`)?.getAttribute('data-action') }), pageSel(index));
    return { id: reel.id, strip, shots: shots.length, end, errors };
  } finally {
    await context.close();
  }
}

export async function render(date, { url = process.env.MOK_URL || 'http://127.0.0.1:5229', concurrency = 6 } = {}) {
  const started = Date.now();
  const deck = readJson(deckFile(date));
  if (!deck) throw new Error(`No published deck for ${date}`);
  const app = await loadTs(APP_EXPORTS, 'reels-render');
  const feed = app.todaysSet(app.parseDeck(deck), date, app.REELS, []);
  const dir = ensure(outDir(date));
  const browser = await chromium.launch();
  const jobs = deck.reels.map(reel => ({ reel, index: feed.findIndex(r => r.id === reel.id) }));
  const results = [];
  try {
    for (let i = 0; i < jobs.length; i += concurrency) {
      results.push(...await Promise.all(jobs.slice(i, i + concurrency).map(({ reel, index }) => shootReel(browser, url, date, index, reel, dir).catch(error => ({ id: reel.id, error: error.message.split('\n')[0] })))));
    }
  } finally {
    await browser.close();
  }
  const strips = results.filter(r => r.strip).map(r => r.strip);
  if (strips.length) {
    const sheet = path.join(dir, 'contact-sheet.png');
    const widths = results.filter(r => r.strip).map(r => r.shots * 188);
    const width = Math.max(...widths);
    execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...strips.flatMap(f => ['-i', f]), '-filter_complex', `${strips.map((_, i) => `[${i}]scale=-1:406,pad=${width}:418:0:6:color=0x0b0d16[s${i}]`).join(';')};${strips.map((_, i) => `[s${i}]`).join('')}vstack=inputs=${strips.length}[out]`, '-map', '[out]', sheet]);
    console.log(`Contact sheet: ${sheet}`);
  }
  for (const r of results) console.log(r.error ? `  FAIL ${r.id}: ${r.error}` : `  ${r.id}: ${r.shots} screens, end card "${r.end.prove}" (${r.end.action})${r.errors.length ? `, problems: ${r.errors.join(' | ')}` : ''}`);
  logStage(date, 'render', 'script', started, { reels: results.length, failed: results.filter(r => r.error).length });
  return results;
}
