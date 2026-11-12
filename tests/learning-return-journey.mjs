import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.env.MOK_URL || 'http://127.0.0.1:5178'; // the dev server
const RHYTHM_HUB = 'knowledge.arts.music.rhythm.pulse-and-meter.simple-meter.four-beats.dividing-a-beat';
// A discovery opens from its place's hub; settings live in the one menu; the notebook is a tab.
const openDiscovery = async page => { await page.evaluate(id => { location.hash = `#/hub/${encodeURIComponent(id)}`; }, RHYTHM_HUB); await page.locator('[data-action="hub-begin-discovery"]').first().click(); };
const openSettings = async page => { await page.locator('[data-action="open-menu"]').click(); await page.locator('[data-action="open-backup"]').click(); await page.getByRole('dialog', { name: 'Your map and settings', exact: true }).waitFor(); };
const openNotebook = page => page.locator('[data-action="open-notebook"]:visible, .studio-mobile-nav button:has-text("Notebook"):visible').first().click();
const output = 'output/playwright/learning-return';
await mkdir(output, { recursive: true });
const report = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const ready = page => page.waitForFunction(() => window.render_game_to_text && !JSON.parse(window.render_game_to_text()).navigating);
async function answer(page, label) {
  await page.getByRole('radio', { name: label, exact: true }).check();
  await page.getByRole('button', { name: 'See if it holds', exact: true }).click();
  await page.locator('.exp-feedback.correct').waitFor();
}
for (const [name, engine, viewport] of [['chromium', chromium, {width:1440,height:1000}], ['webkit', webkit, {width:375,height:812}]]) {
  const browser = await engine.launch();
  const context = await browser.newContext({viewport, isMobile:name==='webkit',hasTouch:name==='webkit',acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await ready(page);
    await openDiscovery(page);
    await page.getByRole('button',{name:'Let’s explore',exact:true}).click();
    await answer(page,'8 sounds');
    await page.reload();
    await ready(page);
    assert.equal((await state(page)).learning.attempts.length,1);
    await openDiscovery(page);
    await page.getByRole('button',{name:'Continue where I left off',exact:true}).click();
    await page.locator('[data-challenge-id="rhythm-transfer"]').waitFor();
    await answer(page,'One and a half beats');
    await page.getByRole('button',{name:'See what changed',exact:true}).click();
    assert.equal((await state(page)).learning.earnedIds.length,1);
    await page.screenshot({path:`${output}/${name}-complete.png`,fullPage:true});
    await page.getByRole('button',{name:'Add to my notebook',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'Give this idea a title Required'}).inputValue(),'The space between beats');
    await page.getByRole('textbox',{name:'What did you take away? Optional'}).fill('More subdivisions can fit inside the same beat.');
    await page.getByRole('button',{name:'Save idea',exact:true}).click();
    await page.reload();
    await ready(page);
    const saved = await state(page);
    assert.equal(saved.notebook.entries.length,1);
    assert.equal(saved.learning.earnedIds.length,1);
    await openSettings(page);
    const files = {};
    for (const [kind, action] of [['memory','backup-memory'],['notebook','backup-notebook']]) {
      const pending = page.waitForEvent('download');
      await page.locator(`[data-action="${action}"]`).click();
      const download = await pending;
      files[kind] = await readFile(await download.path(),'utf8');
    }
    assert.equal(JSON.parse(files.memory).attempts.length,2);
    assert.equal(JSON.parse(files.notebook).entries[0].body,'More subdivisions can fit inside the same beat.');
    await page.screenshot({path:`${output}/${name}-backup.png`,fullPage:true});
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    await page.locator('.studio-mobile-nav button:has-text("Explore"):visible, [data-action="open-explore"]:visible').first().click();
    await page.locator('[data-action="explore-list"]').click();
    const row = page.locator('[data-learnable-id="rhythm-between-beats"]');
    assert.match(await row.innerText(),/Understood/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/${name}-trail.png`,fullPage:true});
    await openNotebook(page);
    await page.locator('[data-action="reflect-entry"]').click();
    await page.getByRole('textbox',{name:'Your reflection',exact:true}).fill('The same fixed unit helps me understand fractions.');
    await page.getByRole('button',{name:'Compare with your note'}).click();
    await page.getByRole('button',{name:/Save reflection/}).click();
    await page.reload();
    await ready(page);
    const note = await page.evaluate(()=>JSON.parse(localStorage.getItem('mok-notebook-v1')).entries[0]);
    assert.match(note.body,/More subdivisions/);
    assert.match(note.body,/same fixed unit/);
    assert.equal((await state(page)).learning.earnedIds.length,1);
    assert.deepEqual(errors,[]);
    report.push({name,viewport,passed:true,checks:['probe reload resumes transfer','independent evidence retained','completion captures a linked note','both downloaded backups contain persisted content','the discoveries list shows it understood','note revisit appends reflection without changing earned progress','no horizontal overflow or runtime errors']});
    console.log(`${name}: full return, reflection and backup journey passed`);
  } catch(error) {
    await page.screenshot({path:`${output}/${name}-failure.png`,fullPage:true}).catch(()=>{});
    report.push({name,passed:false,error:String(error),errors});
    throw error;
  } finally {
    await context.close();
    await browser.close();
    await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  }
}
