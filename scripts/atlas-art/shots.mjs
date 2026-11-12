// Phone (and optional desktop) screenshots of each ?art= variant at a few map levels, plus a
// side-by-side sheet per level. Run with the dev server up: node scripts/atlas-art/shots.mjs
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5250';
const OUT = 'output/atlas-art';
const MODES = (process.env.MODES || 'off,glyphs,terrain,wallpaper,plates,atlas').split(',');
const DESKTOP = process.argv.includes('--desktop');
// Each level is the trail of territories to tap from the world.
const LEVELS = [
  { name: 'world', trail: [] },
  { name: 'science', trail: ['Science'] },
  { name: 'biology', trail: ['Science', 'Biology'] },
  { name: 'evolution', trail: ['Science', 'Biology', 'Evolution'] },
];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const sizes = DESKTOP ? [['desktop', { width: 1280, height: 800 }, false]] : [['phone', { width: 375, height: 812 }, true]];
for (const [device, viewport, mobile] of sizes) {
  for (const mode of MODES) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    await page.goto(`${URL}/?art=${mode}`);
    await page.waitForSelector('.map-cell[role=button]');
    await page.waitForTimeout(1800);
    let at = [];
    for (const level of LEVELS) {
      // Back to the world when the trail does not continue the current one.
      if (level.trail.slice(0, at.length).join('/') !== at.join('/')) {
        await page.goto(`${URL}/?art=${mode}`); await page.waitForSelector('.map-cell[role=button]'); await page.waitForTimeout(1500); at = [];
      }
      for (const label of level.trail.slice(at.length)) {
        await page.click(`[aria-label="Explore ${label}"]`, { timeout: 8000 });
        await page.waitForTimeout(2600);
      }
      at = level.trail;
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `${device}-${level.name}-${mode}.png`) });
    }
    await page.close();
  }
  // One sheet per level: the variants side by side.
  for (const level of LEVELS) {
    const files = MODES.map(mode => path.join(OUT, `${device}-${level.name}-${mode}.png`));
    const w = device === 'phone' ? 375 : 640;
    execFileSync('/opt/homebrew/bin/ffmpeg', ['-loglevel', 'error', '-y', ...files.flatMap(f => ['-i', f]), '-filter_complex',
      `${files.map((_, i) => `[${i}]scale=${w}:-1[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${files.length}[out]`,
      '-map', '[out]', path.join(OUT, `sheet-${device}-${level.name}.png`)]);
  }
}
await browser.close();
console.log(`shots in ${OUT}`);
