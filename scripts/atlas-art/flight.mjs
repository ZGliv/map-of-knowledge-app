// Frames during one flight into Science, to check the art layer mid-camera-move.
import { chromium } from 'playwright';
const URL = process.env.MOK_URL || 'http://127.0.0.1:5250';
const mode = process.env.MODE || 'atlas';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(error.message));
await page.goto(`${URL}/?art=${mode}`); await page.waitForSelector('.map-cell[role=button]'); await page.waitForTimeout(1500);
await page.click('[aria-label="Explore Science"]');
for (const at of [350, 800, 1300]) { await page.waitForTimeout(at === 350 ? 350 : 450); await page.screenshot({ path: `output/atlas-art/flight-${mode}-${at}.png` }); }
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
