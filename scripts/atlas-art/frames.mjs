// Every ~80ms of one flight into a territory, as a contact strip, to see where it jumps.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const URL = process.env.MOK_URL || 'http://127.0.0.1:5250';
const mode = process.env.MODE || 'plates', target = process.env.TARGET || 'Technology';
const OUT = 'output/atlas-art/frames'; await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(`${URL}/?art=${mode}`); await page.waitForSelector('.map-cell[role=button]'); await page.waitForTimeout(3000);
await page.click(`[aria-label="Explore ${target}"]`);
const files = [];
for (let i = 0; i < 14; i++) { const f = `${OUT}/${mode}-${String(i).padStart(2, '0')}.png`; await page.screenshot({ path: f }); files.push(f); await page.waitForTimeout(Number(process.env.GAP || 60)); }
await page.waitForTimeout(1500); const last = `${OUT}/${mode}-zz.png`; await page.screenshot({ path: last }); files.push(last);
await browser.close();
execFileSync('/opt/homebrew/bin/ffmpeg', ['-loglevel', 'error', '-y', ...files.flatMap(f => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}]scale=150:-1[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % 8) * 152}_${Math.floor(i / 8) * 328}`).join('|')}[o]`, '-map', '[o]', `${OUT}/${mode}-strip.png`]);
console.log(`${OUT}/${mode}-strip.png`);
