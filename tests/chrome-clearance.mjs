// The map is the whole screen. On a phone, capsules float over it (the lead and the tools at the
// top, the tabs at the bottom) with the map open between them; on a desktop a top bar crosses it.
// Check that no territory name, motif or caption sits under a capsule, a bar, the status bar or the
// home indicator, and that every territory can still be tapped, on every level.
//
//   MOK_URL=http://127.0.0.1:5212 node tests/chrome-clearance.mjs        (MOK_SIZES=phone,phone-web,iphone,iphone-max,desktop)
//
// Chromium always reports env(safe-area-inset-*) as 0, so the phone sizes stand in an iPhone's real
// insets (59 px status bar, 34 px home indicator) through the --safe-* variables the app reads them
// into; phone-web is the same screen in a browser, with none. One check also applies the insets only
// after the map has drawn, as iOS can.
//
// Prints one line per problem and a summary; exits 1 if anything is covered.
import { chromium } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5212';
const SIZES = [
  { name: 'phone', viewport: { width: 375, height: 812 }, mobile: true, insets: { top: 59, bottom: 34 } },
  { name: 'phone-web', viewport: { width: 375, height: 812 }, mobile: true },
  { name: 'iphone', viewport: { width: 393, height: 852 }, mobile: true, insets: { top: 59, bottom: 34 } },
  { name: 'iphone-max', viewport: { width: 430, height: 932 }, mobile: true, insets: { top: 59, bottom: 34 } },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
].filter(size => !process.env.MOK_SIZES || process.env.MOK_SIZES.split(',').includes(size.name));

const insetCss = ({ top = 0, bottom = 0, left = 0, right = 0 }) => `:root{--safe-top:${top}px!important;--safe-bottom:${bottom}px!important;--safe-left:${left}px!important;--safe-right:${right}px!important}`;

// Names, captions and motifs must sit inside the screen and clear of the chrome: on a phone each
// capsule as the rectangle it covers (the map is open between them) plus the status bar and the
// home indicator, on a desktop the top bar across the width.
const coveredParts = () => {
  const width = document.documentElement.clientWidth, height = document.documentElement.clientHeight;
  const inset = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  const chrome = [];
  if (width <= 800) {
    for (const element of document.querySelectorAll('.shell-lead,.shell-bar-tools,.studio-mobile-nav')) {
      const box = element.getBoundingClientRect();
      if (box.width && box.height && getComputedStyle(element).visibility !== 'hidden') chrome.push({ name: element.classList[0], box });
    }
    chrome.push({ name: 'status bar', box: { left: -Infinity, right: Infinity, top: -Infinity, bottom: inset('--safe-top') } });
    chrome.push({ name: 'home indicator', box: { left: -Infinity, right: Infinity, top: height - inset('--safe-bottom'), bottom: Infinity } });
  } else {
    chrome.push({ name: 'top bar', box: { left: -Infinity, right: Infinity, top: -Infinity, bottom: document.querySelector('.shell-bar').getBoundingClientRect().bottom } });
  }
  const at = box => `${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)}`;
  const issues = [];
  for (const group of document.querySelectorAll('.map-scene--idle ~ .map-details > g')) {
    const name = group.querySelector('.region-title')?.textContent;
    for (const part of group.querySelectorAll('.region-title,.region-caption,.map-motif')) {
      const box = part.getBoundingClientRect(), label = `${part.getAttribute('class').split(' ')[0]} of "${name}" at ${at(box)}`;
      if (box.left < -.5 || box.right > width + .5) issues.push(`${label} runs off the screen`);
      for (const { name: under, box: over } of chrome) {
        if (box.left < over.right - .5 && box.right > over.left + .5 && box.top < over.bottom - .5 && box.bottom > over.top + .5) issues.push(`${label} is under the ${under} (${at(over)})`);
      }
    }
  }
  return issues;
};

const browser = await chromium.launch({ headless: true });
let problems = 0, checked = 0;
try {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: size.viewport, hasTouch: size.mobile, isMobile: size.mobile });
    const page = await context.newPage();
    if (size.insets) {
      // Insets that arrive after the first paint (iOS settles them late) must still move the names.
      await page.goto(URL);
      await page.waitForFunction(() => window.render_game_to_text && !document.querySelector('.map-system.is-navigating') && document.querySelector('.map-scene--idle ~ .map-details > g'));
      await page.addStyleTag({ content: insetCss(size.insets) });
      await page.waitForTimeout(250);
      for (const issue of await page.evaluate(coveredParts)) { problems += 1; console.log(`${size.name} late insets: ${issue}`); }
      await page.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, insetCss(size.insets));
    }
    await page.goto(URL);
    const levels = await page.evaluate(() => import('/src/core/catalog.ts').then(({ catalog }) => catalog.all().filter(node => catalog.getChildren(node).length).map(node => node.id)));
    for (const id of levels) {
      // The app saves where you are as it unloads; keep that save from overwriting the next level.
      await page.evaluate(location => {
        const set = Storage.prototype.setItem;
        set.call(localStorage, 'mok-next.demo-progress.v1', JSON.stringify({ version: 1, completedIds: [], locationId: location }));
        Storage.prototype.setItem = function (key, value) { if (key !== 'mok-next.demo-progress.v1') set.call(this, key, value); };
      }, id);
      await page.reload();
      await page.waitForFunction(expected => window.render_game_to_text && JSON.parse(window.render_game_to_text()).location.id === expected && !document.querySelector('.map-system.is-navigating'), id);
      await page.waitForTimeout(120);
      // A level can be measured while the next-step pill is still sliding in or changing its title;
      // a problem that is gone 600 ms later was motion, not layout, so a level with problems is
      // measured once more and only that second measurement counts.
      let covered, found;
      for (let attempt = 0; ; attempt++) {
        covered = await page.evaluate(coveredParts);
        found = await page.evaluate(() => {
          const issues = [];
          // Nothing is cut by its own territory's outline (each group is clipped to it): both ends of
          // every line of text and the rim of the motif lie over the territory itself.
          for (const group of document.querySelectorAll('.map-scene--idle ~ .map-details > g')) {
            const regionId = group.querySelector('clipPath')?.id.replace(/^clip-/, '');
            const name = group.querySelector('.region-title')?.textContent;
            const probes = [];
            for (const text of group.querySelectorAll('.region-title,.region-caption')) {
              const box = text.getBoundingClientRect();
              probes.push([text.getAttribute('class').split(' ')[0], box.left + 1, box.top + box.height * .6], [text.getAttribute('class').split(' ')[0], box.right - 1, box.top + box.height * .6]);
            }
            for (const motif of group.querySelectorAll('.map-motif')) {
              const box = motif.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2, r = box.width * .36;
              probes.push(['map-motif', cx - r, cy], ['map-motif', cx + r, cy], ['map-motif', cx, cy - r], ['map-motif', cx, cy + r]);
            }
            for (const [part, x, y] of probes) {
              const hit = document.elementFromPoint(x, y);
              if (hit?.getAttribute('data-region-id') !== regionId) { issues.push(`${part} of "${name}" is cut by its outline at ${Math.round(x)},${Math.round(y)}`); break; }
            }
          }
          // Every territory is reachable: the point under its name hits the territory itself.
          for (const cell of document.querySelectorAll('.map-scene--idle .map-cell[role=button]')) {
            const regionId = cell.dataset.regionId;
            const title = [...document.querySelectorAll('.map-scene--idle ~ .map-details > g')].find(g => g.querySelector('clipPath')?.id === `clip-${regionId}`)?.querySelector('.region-title');
            if (!title) { issues.push(`no name for ${regionId}`); continue; }
            const box = title.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            if (hit?.getAttribute('data-region-id') !== regionId) issues.push(`"${title.textContent}" cannot be tapped at its name (hit ${hit?.className?.baseVal ?? hit?.className})`);
          }
          return { issues, cells: document.querySelectorAll('.map-scene--idle .map-cell[role=button]').length };
        });
        if (!(covered.length || found.issues.length)) { if (attempt) console.log(`${size.name} ${id}: note: cleared on the second look`); break; }
        if (attempt === 1) break;
        await page.waitForTimeout(600);
      }
      checked += found.cells;
      for (const issue of [...covered, ...found.issues]) { problems += 1; console.log(`${size.name} ${id}: ${issue}`); }
    }
    console.log(`${size.name}: ${levels.length} levels checked`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`${checked} territories, ${problems} problems`);
process.exit(problems ? 1 : 0);
