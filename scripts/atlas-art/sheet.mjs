// One labelled comparison sheet of the phone shots: a column per variant, a row per map level.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const OUT = 'output/atlas-art';
const COLUMNS = [['off', 'Today'], ['glyphs', 'A · Emblems'], ['terrain', 'B · Terrain'], ['wallpaper', 'C · Wallpaper'], ['plates', 'D · Pictures'], ['atlas', 'A + B'], ['stickers', 'A + C']];
const ROWS = [['world', 'World'], ['biology', 'Inside Biology']];
const img = file => `data:image/png;base64,${readFileSync(`${OUT}/${file}`).toString('base64')}`;
const html = `<body style="margin:0;background:#070a14;font:600 22px -apple-system,Helvetica;color:#e4e9ff;padding:24px">
<div style="display:grid;grid-template-columns:120px repeat(${COLUMNS.length},375px);gap:14px;align-items:center">
<div></div>${COLUMNS.map(([, label]) => `<div style="text-align:center;padding-bottom:6px">${label}</div>`).join('')}
${ROWS.map(([row, label]) => `<div style="font-size:18px;color:#9aa6c8">${label}</div>${COLUMNS.map(([mode]) => `<img src="${img(`phone-${row}-${mode}.png`)}" style="width:375px;border-radius:14px;display:block">`).join('')}`).join('')}
</div></body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 120 + COLUMNS.length * 389 + 48, height: 400 }, deviceScaleFactor: 1 });
await page.setContent(html); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/compare-phone.png`, fullPage: true });
await browser.close();
console.log(`${OUT}/compare-phone.png`);
