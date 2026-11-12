// Explore full screen: Watch and Reels laid out like a short-video app. The video fills a phone edge
// to edge under the floating chrome, with the caption at the bottom left and a rail of controls at the
// right, the same on both tabs; a desktop keeps a 9:16 column over the starfield.
//
//   MOK_URL=http://127.0.0.1:5234 node tests/fullscreen-shots.mjs
//
// Checks, at phone sizes with and without an iPhone's insets (59 px status bar, 34 px home indicator,
// stood in through the --safe-* variables as tests/chrome-clearance.mjs does): nothing of ours sits
// under a capsule, the switch, the status bar or the home indicator, or off the screen; no sideways
// scroll at 375, 393 and 430; Watch's rail and caption sit exactly where Reels' do; a tap on the video
// pauses and plays it; a swipe that starts on the video moves the feed and snaps; YouTube's own chrome
// (its title, Shorts logo, captions, channel, buttons, progress bar) stays off the screen, read from
// inside YouTube's frame; a square Short is shown whole like a wide video, never letterboxed; a card
// left (the feed learns from it and plans the cards after again) moves on with the feed still in step;
// a reel plays at once with its guess floating clear of the chrome. The top row is a short-video
// app's: no brand, no place and no menu on Explore (they stay on Atlas and the Library), search alone
// at the right and Watch · Reels · Lessons centred on the same row; a landscape video sits at the
// middle of the screen. In WebKit (the iOS app's engine, with an iPhone's user agent and insets),
// nothing is painted at the screen's top-left corner on Watch or Reels: WebKit has twice drawn a
// filtered layer over the video (a blurred backdrop, a glowing icon) as a square there, under the
// clock, where Chromium shows nothing.
// Writes output/fullscreen/*.png (375 × 812, insets in) and output/fullscreen/contact-sheet.png.
// Exits 1 if any check fails.
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5234';
const OUT = path.resolve('output/fullscreen');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const IPHONE = { top: 59, bottom: 34 };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const SIZES = [
  { name: 'phone', viewport: { width: 375, height: 812 }, insets: IPHONE },
  { name: 'phone-web', viewport: { width: 375, height: 812 } },
  { name: 'iphone', viewport: { width: 393, height: 852 }, insets: IPHONE },
  { name: 'iphone-max', viewport: { width: 430, height: 932 }, insets: IPHONE },
];
await mkdir(OUT, { recursive: true });

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(viewport, insets, phone = true) {
  const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: 2 });
  if (insets) await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, `:root{--safe-top:${insets.top}px!important;--safe-bottom:${insets.bottom}px!important}`);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  await page.click(phone ? '[data-action="open-explore-mobile"]' : '[data-action="open-explore"]');
  await page.waitForSelector('.explore-workspace:not(.is-hidden) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card');
  return { context, page, errors };
}
const visible = page => page.evaluate(() => Number(document.querySelector('.feed').dataset.visible));
/** The card on screen once its video is really playing (a video YouTube refuses is skipped by the feed). */
const playing = page => page.waitForFunction(() => { const v = document.querySelector('.feed').dataset.visible; return !!document.querySelector(`.feed-player-layer[data-for="${v}"] .feed-player.is-shown`); }, null, { timeout: 30000 }).then(() => visible(page));
const feedTo = async (page, index) => {
  await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTop = i * pager.clientHeight; }, index);
  await page.waitForFunction(i => Number(document.querySelector('.feed').dataset.visible) === i, index);
  await page.waitForTimeout(700);
};
/** A landscape video: a fresh feed opens on Shorts (the plan favours them), so open one from a hub's
 * Watch row, which starts the feed at that video. */
async function wideVideo(page, hub = 'knowledge.science.biology.evolution.natural-selection') {
  for (let n = 0; n < 4; n++) {
    await page.goto(`${URL}/#/hub/${hub}`);
    await page.waitForSelector('[data-hub-section="watch"] .watch-card.is-wide', { timeout: 15000 });
    const id = (await page.$$eval('[data-hub-section="watch"] .watch-card.is-wide', els => els.map(el => el.dataset.videoId)))[n];
    await page.evaluate(id => document.querySelector(`[data-hub-section="watch"] [data-video-id="${id}"]`).scrollIntoView({ block: 'center' }), id);
    await page.click(`[data-hub-section="watch"] [data-video-id="${id}"]`);
    const opened = await page.waitForSelector(`.explore-workspace:not(.is-hidden) .feed-page[data-page="0"] .feed-card[data-video-id="${id}"]`, { timeout: 20000 }).then(() => true, () => false);
    if (!opened) { console.log(`  (the hub's ${id} did not open the feed: ${await page.evaluate(() => [location.hash, document.querySelector('.explore-workspace')?.className, document.querySelector('.feed-page[data-page="0"] .feed-card')?.dataset.videoId].join(' · '))}; trying another)`); continue; }
    // The asked video is card 0 and the feed is there: no nudging the pager, so a regression in how
    // the feed takes a request (it once kept its old place) fails here.
    const atTop = await page.waitForFunction(() => document.querySelector('.feed-pager').scrollTop === 0 && document.querySelector('.feed').dataset.visible === '0', null, { timeout: 5000 }).then(() => true, () => false);
    if (!atTop) throw new Error(`the hub's ${id} opened the feed away from card 0 (scrollTop ${await page.evaluate(() => document.querySelector('.feed-pager').scrollTop)}, card ${await page.getAttribute('.feed', 'data-visible')})`);
    if (await playing(page).catch(() => -1) === 0) return 0;
  }
  throw new Error('no landscape video would play');
}
/** Move along the feed to the next video of a shape ('is-tall' or 'is-wide') and wait for it to play. */
async function videoOf(page, shape) {
  if (shape === 'is-wide') return wideVideo(page);
  for (let tries = 0; tries < 30; tries++) {
    const at = await visible(page);
    const next = await page.evaluate(([from, shape]) => [...document.querySelectorAll('.feed-page')].map(p => ({ i: Number(p.dataset.page), shape: p.querySelector('.feed-video')?.classList.contains(shape) })).find(p => p.i >= from && p.shape)?.i ?? -1, [at, shape]);
    const target = next >= 0 ? next : at + 3;
    if (target !== at) await feedTo(page, target);
    // A Short's poster can say it is square once it loads, which turns the card wide: look again.
    if (next >= 0) { const now = await playing(page).catch(() => -1); if (now === target && await page.evaluate(([i, shape]) => document.querySelector(`.feed-page[data-page="${i}"] .feed-video`)?.classList.contains(shape), [target, shape])) return target; if (now === target) await feedTo(page, target + 1); }
  }
  throw new Error(`no ${shape} video found`);
}
/** YouTube's frame, its video's box on the page, and every piece of YouTube's own drawing (text,
 * icons, captions, bars) that lands inside the part of the iframe on screen (the iframe clipped by the
 * page, the player layer and its clip-path), less its centre play/pause (counted apart). */
async function youtubeOnScreen(page) {
  const win = await page.evaluate(() => {
    const f = document.querySelector('.feed-player-layer iframe.feed-player'), r = f.getBoundingClientRect(), L = f.closest('.feed-player-layer').getBoundingClientRect();
    const band = parseFloat(getComputedStyle(f).clipPath.match(/inset\(([\d.]+)px/)?.[1] ?? '0');
    return { left: r.left, top: r.top, x0: Math.max(L.left, 0, r.left) - r.left, x1: Math.min(L.right, innerWidth, r.right) - r.left, y0: Math.max(L.top, 0, r.top + band) - r.top, y1: Math.min(L.bottom, innerHeight, r.bottom - band) - r.top };
  });
  const frame = page.frames().find(f => /youtube(-nocookie)?\.com\/embed/.test(f.url()));
  if (!frame) return { video: null, drawn: ['no YouTube frame'] };
  const inside = await frame.evaluate(win => {
    const shown = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
    const v = document.querySelector('video')?.getBoundingClientRect();
    const drawn = [];
    let centre = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.right <= win.x0 + 1 || r.left >= win.x1 - 1 || r.bottom <= win.y0 + 1 || r.top >= win.y1 - 1) continue;
      const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (!(text || el.tagName === 'svg' || el.tagName === 'IMG') || !shown(el)) continue;
      // YouTube's centre play/pause, which no crop can reach: it shows as a video starts and fades on its own.
      if (v && r.width <= 80 && r.height <= 80 && Math.abs(r.left + r.width / 2 - (v.left + v.width / 2)) < 48 && Math.abs(r.top + r.height / 2 - (v.top + v.height / 2)) < 48) { centre++; continue; }
      drawn.push(`${el.tagName.toLowerCase()} "${text.slice(0, 30)}" at ${Math.round(r.left)},${Math.round(r.top)}`);
    }
    return { video: v ? [v.left, v.top, v.width, v.height] : null, drawn, centre };
  }, win);
  return { video: inside.video && [win.left + inside.video[0], win.top + inside.video[1], inside.video[2], inside.video[3]].map(Math.round), drawn: inside.drawn, centre: inside.centre };
}
/** Past its first seconds (a title and a play flash), nothing YouTube draws is on screen: polled. */
async function youtubeClear(page, timeout = 15000) {
  const until = Date.now() + timeout;
  let seen = await youtubeOnScreen(page);
  while (seen.drawn.length && Date.now() < until) { await page.waitForTimeout(1000); seen = await youtubeOnScreen(page); }
  return seen;
}
/** Open a given video from its hub's Watch row: the feed starts at it. */
async function openVideo(page, hub, id) {
  await page.goto(`${URL}/#/hub/${hub}`);
  await page.waitForSelector(`[data-hub-section="watch"] [data-video-id="${id}"]`, { timeout: 20000 });
  await page.evaluate(id => document.querySelector(`[data-hub-section="watch"] [data-video-id="${id}"]`).scrollIntoView({ block: 'center' }), id);
  await page.click(`[data-hub-section="watch"] [data-video-id="${id}"]`);
  await page.waitForSelector(`.explore-workspace:not(.is-hidden) .feed-page[data-page="0"] .feed-card[data-video-id="${id}"]`, { timeout: 20000 });
  await page.waitForTimeout(600);
  if (await page.evaluate(() => document.querySelector('.feed-pager').scrollTop !== 0)) await page.evaluate(() => { document.querySelector('.feed-pager').scrollTop = 0; });
  return playing(page);
}
/** Explore's top row: what the bar holds, where search and the switch sit. */
const topRow = () => {
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(n => Math.round(n * 10) / 10); };
  return {
    brand: !!document.querySelector('[data-action="brand-home"]'), menu: !!document.querySelector('[data-action="open-menu"]'), lead: !!document.querySelector('.shell-lead'),
    tools: [...document.querySelector('.shell-bar-tools').children].map(el => el.dataset.action),
    search: box(document.querySelector('[data-action="open-search"]')), switch: box(document.querySelector('.explore-switch')),
    safeTop: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0, W: document.documentElement.clientWidth,
  };
};
const rowOk = t => !t.brand && !t.menu && !t.lead && t.tools.join(' ') === 'open-search'
  && Math.abs((t.search[1] + t.search[3]) / 2 - (t.switch[1] + t.switch[3]) / 2) < 1.5 // one row
  && t.search[2] >= t.W - 16 && t.switch[2] <= t.search[0] // search at the right, clear of the switch
  && Math.abs((t.switch[0] + t.switch[2]) / 2 - t.W / 2) < 1.5 && t.switch[1] >= t.safeTop; // the switch centred, under the status bar
const sideScroll = page => page.evaluate(() => {
  const root = document.documentElement, pager = document.querySelector('.explore-workspace:not(.is-hidden) :is(.feed-pager,.reel-pager)');
  return { page: Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth, pager: pager ? pager.scrollWidth - pager.clientWidth : 0 };
});

/** The screen's top-left corner: how opaque it is (drawn again with no page background behind it, so a
 * see-through patch shows as one) and whether a square's edges stand there (the steps in brightness
 * across x = 34 and y = 34, where WebKit's squares have ended, against the same steps at 60). */
async function corner(page) {
  const clip = { x: 0, y: 0, width: 80, height: 80 };
  const shot = await page.screenshot({ clip }), bare = await page.screenshot({ clip, omitBackground: true });
  return page.evaluate(async ([a, b]) => {
    const load = async b64 => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b), s = A.width / 80;
    const at = (d, x, y) => (Math.round(y * s) * d.width + Math.round(x * s)) * 4;
    const L = (x, y) => { const i = at(A, x, y); return 0.2126 * A.data[i] + 0.7152 * A.data[i + 1] + 0.0722 * A.data[i + 2]; };
    let alpha = 255;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++) alpha = Math.min(alpha, B.data[at(B, x, y) + 3]);
    const across = x => { let t = 0; for (let y = 2; y < 28; y++) t += Math.abs(L(x - 2, y) - L(x + 2, y)); return t / 26; };
    const down = y => { let t = 0; for (let x = 2; x < 28; x++) t += Math.abs(L(x, y - 2) - L(x, y + 2)); return t / 26; };
    return { alpha, edge: [across(34), down(34)].map(Math.round), control: [across(60), down(60)].map(Math.round) };
  }, [shot.toString('base64'), bare.toString('base64')]);
}
const cornerClear = c => c.alpha >= 250 && !(c.edge[0] > 12 && c.edge[1] > 12 && c.edge[0] > 2 * c.control[0] && c.edge[1] > 2 * c.control[1]);

// Everything of ours over the picture, and every piece of chrome it must stay clear of.
const clearance = () => {
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  const inset = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  const rect = el => el.getBoundingClientRect();
  const shown = el => { const r = rect(el); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const chrome = [...document.querySelectorAll('.shell-lead,.shell-bar-tools,.studio-mobile-nav,.explore-switch button')].filter(shown).map(el => ({ name: el.classList[0] || `switch "${el.textContent.trim()}"`, box: rect(el) }));
  chrome.push({ name: 'status bar', box: { left: -1e9, right: 1e9, top: -1e9, bottom: inset('--safe-top') } });
  chrome.push({ name: 'home indicator', box: { left: -1e9, right: 1e9, top: H - inset('--safe-bottom'), bottom: 1e9 } });
  const tab = document.querySelector('.explore-workspace').dataset.exploreTab;
  const v = tab === 'feed' ? document.querySelector('.feed').dataset.visible : document.querySelector('.reel-feed').dataset.reelIndex;
  const page = document.querySelector(tab === 'feed' ? `.feed-page[data-page="${v}"]` : `.reel-page[data-page="${v}"]`);
  const top = page.getBoundingClientRect().top;
  if (Math.abs(top) > 1) return { issues: [`the card the feed calls visible (${v}) is not on screen: it is ${Math.round(top)} px away`], checked: 0 };
  const ours = [...page.querySelectorAll('.feed-meta>*,.feed-line>*,.feed-action,.feed-checkpoint-map,.feed-checkpoint-places li,.feed-offer>*,.reel-story>*,.reel-rail-button,.reel-choices>*,.reel-predict-prompt,.reel-progress')].filter(shown);
  const at = b => `${Math.round(b.left)},${Math.round(b.top)}–${Math.round(b.right)},${Math.round(b.bottom)}`;
  const issues = [];
  for (const el of ours) {
    const b = rect(el), label = `${el.dataset.action || el.className || el.tagName.toLowerCase()} at ${at(b)}`;
    if (b.left < -.5 || b.right > W + .5) issues.push(`${label} runs off the screen`);
    for (const { name, box } of chrome) if (b.left < box.right - .5 && b.right > box.left + .5 && b.top < box.bottom - .5 && b.bottom > box.top + .5) issues.push(`${label} is under the ${name} (${at(box)})`);
  }
  // The caption and the rail never overlap each other.
  const rail = page.querySelector('.feed-actions,.reel-rail'), words = page.querySelector('.feed-meta,.reel-story');
  if (rail && words && shown(rail) && shown(words)) { const a = rect(rail), b = rect(words); if (a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5) issues.push(`the caption (${at(b)}) runs under the rail (${at(a)})`); }
  return { issues, checked: ours.length };
};

// Where the rail and the caption sit, to compare Watch with Reels.
const anatomy = () => {
  const tab = document.querySelector('.explore-workspace').dataset.exploreTab;
  const v = tab === 'feed' ? document.querySelector('.feed').dataset.visible : document.querySelector('.reel-feed').dataset.reelIndex;
  const page = document.querySelector(tab === 'feed' ? `.feed-page[data-page="${v}"]` : `.reel-page[data-page="${v}"]`);
  const box = sel => { const el = page.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const font = sel => { const el = page.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); return `${cs.fontFamily.split(',')[0]} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.color}`; };
  const sound = tab === 'feed' ? '[data-action="feed-sound"]' : '[data-action="reel-sound"]';
  const save = tab === 'feed' ? '[data-action="feed-save"]' : '[data-action="reel-save"]';
  // The shade under the caption: its colours, how dark at the foot, and where it has faded out (px from
  // the top: its last, clear stop, measured by a probe that tall from the shade's foot).
  const shadeEl = page.querySelector('.feed-shade,.reel-shade'), image = getComputedStyle(shadeEl).backgroundImage;
  const colours = image.match(/rgba?\([^)]*\)/g) ?? [], clearAt = image.match(/rgba\(0, 0, 0, 0\)\s+([^,]+)\)$/)?.[1];
  const probe = document.createElement('i');
  probe.style.cssText = `position:absolute;left:0;bottom:0;width:1px;height:${clearAt}`;
  shadeEl.append(probe);
  const shade = { night: colours.slice(0, -1).every(c => /^rgba\(2, 3, 8, [\d.]+\)$/.test(c)), foot: parseFloat(colours[0]?.match(/([\d.]+)\)$/)?.[1] ?? '0'), clearFrom: clearAt ? Math.round(probe.getBoundingClientRect().top) : null };
  probe.remove();
  return {
    sound: box(`${sound} svg`), save: box(`${save} svg`), label: font(`${sound} span`),
    chip: box('.feed-chip,.reel-tag'), chipFont: font('.feed-chip,.reel-tag'), words: font('.feed-title,.reel-caption'),
    captionLeft: box('.feed-meta,.reel-story')?.x, captionBottom: (() => { const el = page.querySelector('.feed-meta,.reel-story'); return Math.round(document.documentElement.clientHeight - el.getBoundingClientRect().bottom); })(),
    shade, captionTop: Math.round(page.querySelector('.feed-meta,.reel-story').getBoundingClientRect().top),
  };
};

const shots = [];
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); shots.push(name); };

// --- Phone, iPhone insets: the screens, the taps, and Watch against Reels -------------------------
{
  const { context, page, errors } = await open(SIZES[0].viewport, IPHONE);
  try {
    const short = await videoOf(page, 'is-tall');
    // YouTube shows its title and a play flash for the first few seconds of each video: past them.
    await page.waitForTimeout(7000);
    await shot(page, 'phone-1-watch-short');
    const cover = await page.evaluate(() => { const layer = document.querySelector('.feed-player-layer').getBoundingClientRect(), frame = document.querySelector('.feed-player-layer iframe').getBoundingClientRect(); return { layer: [layer.left, layer.top, layer.width, layer.height].map(Math.round), frame: [frame.left, frame.top, frame.width, frame.height].map(Math.round) }; });
    check('Watch: a Short fills the screen, sized to its height and cropped at the sides (no letterbox)', cover.layer[0] <= 0 && cover.layer[1] <= 0 && cover.layer[2] >= 375 && cover.layer[3] >= 812 && cover.frame[3] >= 812 && cover.frame[2] > 375 && Math.abs(cover.frame[0] + cover.frame[2] / 2 - 187.5) < 1.5, `layer ${cover.layer.join(',')} · iframe ${cover.frame.join(',')}`);
    const yt = await youtubeClear(page);
    const [vx, vy, vw, vh] = yt.video ?? [0, 0, 0, 0];
    check('Watch: YouTube\'s own video covers the whole screen (read inside its frame)', vx <= 0 && vy <= 0 && vx + vw >= 375 && vy + vh >= 812, `video ${yt.video?.join(',')}`);
    check('Watch: YouTube\'s bands lie past the screen (at least 130 px of iframe above and below the video)', vy - cover.frame[1] >= 130 && cover.frame[1] + cover.frame[3] - (vy + vh) >= 130, `iframe ${cover.frame.join(',')} · video ${yt.video?.join(',')}`);
    check('Watch: nothing YouTube draws (title, logo, captions, channel, buttons, bar) is on screen', yt.drawn.length === 0, yt.drawn.slice(0, 6).join(' | '));
    const row = await page.evaluate(topRow);
    check('Explore: no brand, place or menu at the top; search alone at the right, on one row with the switch, which is centred', rowOk(row), JSON.stringify(row));
    // (The player takes no pointer events, so hit-testing skips it: let it for one look.)
    const stack = await page.evaluate(() => { const frame = document.querySelector('.feed-player'); frame.style.pointerEvents = 'auto'; const hits = document.elementsFromPoint(187, 380).slice(0, 2).map(el => el.className || el.tagName); frame.style.pointerEvents = ''; return hits; });
    check('Watch: over the middle of the picture only the clear tap layer, then the player', stack[0] === 'feed-tap' && stack[1] === 'feed-player is-shown', stack.join(' > '));
    check('Watch: the tap layer paints nothing', await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.feed-tap')); return cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none' && cs.boxShadow === 'none' && !document.querySelector('.feed-tap').childElementCount; }));
    check('Watch: the player itself takes no touches (they go to the pager and the tap layer)', await page.evaluate(() => getComputedStyle(document.querySelector('.feed-player')).pointerEvents === 'none'));
    const c = await page.evaluate(clearance);
    check(`phone: Watch's caption and rail are clear of the chrome, the status bar and the home indicator (${c.checked} parts)`, c.issues.length === 0, c.issues.join(' | '));
    check('phone: no sideways scroll on Watch', Object.values(await sideScroll(page)).every(v => v <= 0), JSON.stringify(await sideScroll(page)));

    // A tap pauses, a second plays (read from the YouTube player itself).
    const state = () => page.evaluate(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); return window.YT?.get?.(frame.id)?.getPlayerState?.() ?? null; });
    await page.click('.feed-tap');
    const paused = await page.waitForFunction(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); return window.YT?.get?.(frame.id)?.getPlayerState?.() === 2; }, null, { timeout: 8000 }).then(() => true, () => false);
    await page.waitForTimeout(1500);
    await shot(page, 'phone-2-watch-paused');
    check('Watch: a tap on the video pauses it, and says so', paused && await page.isVisible('.feed-player-layer .reel-paused') && (await page.getAttribute('.feed-tap', 'aria-label')) === 'Play', `state ${await state()}`);
    await page.click('.feed-tap');
    const resumed = await page.waitForFunction(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); return window.YT?.get?.(frame.id)?.getPlayerState?.() === 1; }, null, { timeout: 8000 }).then(() => true, () => false);
    check('Watch: a second tap plays it again', resumed && !(await page.isVisible('.feed-player-layer .reel-paused')), `state ${await state()}`);

    // A swipe that starts on the video: the pager moves one card and snaps.
    const cdp = await context.newCDPSession(page);
    const before = await visible(page);
    await cdp.send('Input.synthesizeScrollGesture', { x: 187, y: 520, yDistance: -420, speed: 1800, gestureSourceType: 'touch' });
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => { const pager = document.querySelector('.feed-pager'); return { visible: Number(document.querySelector('.feed').dataset.visible), offset: pager.scrollTop % pager.clientHeight }; });
    check('Watch: a swipe that starts on the video moves to the next card and snaps', after.visible === before + 1 && (after.offset < 1 || after.offset > (await page.evaluate(() => document.querySelector('.feed-pager').clientHeight)) - 1), `${before} → ${after.visible}, ${after.offset.toFixed(1)} px off`);

    // A card left: the feed learns from it and plans the cards after the one on screen again, and
    // still knows which card is on screen (a replan that swaps the cards after this one for as many
    // new ones must never leave it behind).
    const from = await videoOf(page, 'is-tall');
    await page.waitForTimeout(3000);
    await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTo({ top: (i + 1) * pager.clientHeight, behavior: 'smooth' }); }, from);
    await page.waitForFunction(i => Number(document.querySelector('.feed').dataset.visible) === i + 1, from, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1600);
    const step = await page.evaluate(() => { const pager = document.querySelector('.feed-pager'); return { screen: Math.round(pager.scrollTop / pager.clientHeight), visible: Number(document.querySelector('.feed').dataset.visible) }; });
    const moved = step.screen === from + 1 && step.visible === from + 1;
    const nextKind = await page.evaluate(i => document.querySelector(`.feed-page[data-page="${i}"]`)?.dataset.kind, step.visible);
    const plays = nextKind !== 'video' || await page.waitForFunction(i => !!document.querySelector(`.feed-player-layer[data-for="${i}"] .feed-player.is-shown`), step.visible, { timeout: 30000 }).then(() => true, () => false);
    const learned = await page.evaluate(() => JSON.parse(localStorage.getItem('mok-feed-v2') || 'null')?.model.clock ?? 0);
    check('Watch: a card left is learned from and the feed moves on in step (the next video plays)', moved && plays && learned >= 1, `card ${from} → screen ${step.screen}, feed ${step.visible}, model clock ${learned}`);

    // Watch against Reels: the rail and the caption in the same place, the same size and type.
    await videoOf(page, 'is-tall');
    const watch = await page.evaluate(anatomy);
    // The eighth card: the checkpoint (the plan grows as the feed moves, so step there).
    for (const index of [3, 6, 7]) if (await visible(page) < index) await feedTo(page, index);
    await page.waitForTimeout(900);
    await shot(page, 'phone-5-watch-checkpoint');
    const cc = await page.evaluate(clearance);
    check('phone: the checkpoint is a full-screen card clear of the chrome', (await page.getAttribute('.feed-page[data-page="7"]', 'data-kind')) === 'checkpoint' && cc.issues.length === 0, cc.issues.join(' | '));
    await videoOf(page, 'is-wide');
    await page.waitForTimeout(10000);
    await shot(page, 'phone-3-watch-landscape');
    // The part of the iframe on screen: the iframe less YouTube's bands, which its clip-path cuts away.
    const wide = await page.evaluate(() => { const f = document.querySelector('.feed-player-layer iframe'), r = f.getBoundingClientRect(), band = parseFloat(getComputedStyle(f).clipPath.match(/inset\(([\d.]+)px/)?.[1] ?? '0'), v = document.querySelector('.feed').dataset.visible; return { box: [r.left, r.top + band, r.width, r.height - 2 * band].map(Math.round), band, switchBottom: Math.round(document.querySelector('.explore-switch button').getBoundingClientRect().bottom), captionTop: Math.round(document.querySelector(`.feed-page[data-page="${v}"] .feed-meta`).getBoundingClientRect().top) }; });
    const [wx, wy, ww, wh] = wide.box;
    check('Watch: a landscape video runs the full width, whole, between the switch and the caption', wx === 0 && ww === 375 && Math.abs(wh - 375 / 1.77) < 3 && wy >= wide.switchBottom && wy + wh <= wide.captionTop, `${wide.box.join(',')} · switch ends ${wide.switchBottom}, caption starts ${wide.captionTop}`);
    check('Watch: a landscape video sits at the middle of the screen', Math.abs(wy + wh / 2 - 812 / 2) < 2, `centre ${wy + wh / 2}`);
    const ytw = await youtubeClear(page);
    const fits = ytw.video && wide.box.every((n, i) => Math.abs(n - ytw.video[i]) <= 2);
    check('Watch: on a landscape video YouTube\'s bands are clipped away: what shows is its video, edge to edge, and nothing it draws', wide.band >= 130 && fits && ytw.drawn.length === 0, `shown ${wide.box.join(',')} · video ${ytw.video?.join(',')} · ${ytw.drawn.slice(0, 4).join(' | ')}`);
    const cw = await page.evaluate(clearance);
    check('phone: a landscape card is clear of the chrome too', cw.issues.length === 0, cw.issues.join(' | '));
    // The other way to show it, for comparison only (not shipped): cover-cropped to the screen's height.
    const crop = await page.addStyleTag({ content: '.feed.is-overlay .feed-player-layer.is-wide .feed-player{top:50%;width:max(100cqw,100cqh * var(--player-aspect));height:calc(max(100cqh,100cqw / var(--player-aspect)) + 2 * var(--yt-band));clip-path:none}.feed.is-overlay .feed-video.is-wide .feed-poster{top:0;height:100%;aspect-ratio:auto;transform:none}' });
    await page.waitForTimeout(2500); // YouTube redraws at the new size a moment later
    await shot(page, 'phone-4-watch-landscape-cover-crop-not-shipped');
    await crop.evaluate(el => el.remove());

    // A square Short (the pool lists every Short as 9:16): its poster says it is square, so it is
    // shown whole at the full width like a landscape video, never letterboxed inside a 9:16 frame.
    if (await openVideo(page, 'knowledge.society.education', 'mbmme8u0boI').catch(() => -1) === 0) {
      const sq = await page.evaluate(() => { const f = document.querySelector('.feed-player-layer iframe'), r = f.getBoundingClientRect(), band = parseFloat(getComputedStyle(f).clipPath.match(/inset\(([\d.]+)px/)?.[1] ?? '0'); return { card: document.querySelector('.feed-page[data-page="0"] .feed-card').classList.contains('is-wide'), layer: document.querySelector('.feed-player-layer').classList.contains('is-wide'), box: [r.left, r.top + band, r.width, r.height - 2 * band].map(Math.round) }; });
      const yts = await youtubeClear(page);
      await shot(page, 'phone-9-watch-square-short');
      const whole = yts.video && sq.box.every((n, i) => Math.abs(n - yts.video[i]) <= 2) && Math.abs(sq.box[2] - sq.box[3]) <= 2;
      check('Watch: a square Short is shown whole at the full width (no black bars), YouTube\'s chrome clipped away', sq.card && sq.layer && whole && yts.drawn.length === 0, `shown ${sq.box.join(',')} · video ${yts.video?.join(',')} · ${yts.drawn.slice(0, 4).join(' | ')}`);
    } else check('Watch: a square Short is shown whole', false, 'the square Short did not open or play from its hub');
    await page.click('[data-action="open-explore-mobile"]').catch(() => {});

    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-page[data-page="0"] .reel[data-phase="story"]');
    const guessing = await page.waitForSelector('.reel-page[data-page="0"] [data-reel-part="prediction"]', { timeout: 4000 }).then(() => true, () => false);
    await page.waitForTimeout(1800);
    await shot(page, 'phone-6-reel-playing-with-guess');
    const cp = await page.evaluate(clearance);
    check('phone: a reel plays at once, its guess floating clear of the chrome', guessing && cp.issues.length === 0, cp.issues.join(' | '));
    await page.click('.reel-page[data-page="0"] [data-action="reel-predict"] >> nth=0', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => Number(document.querySelector('.reel-page[data-page="0"] .reel')?.dataset.frame) >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await shot(page, 'phone-7-reel-story-rail');
    const reels = await page.evaluate(anatomy);
    const cr = await page.evaluate(clearance);
    check('phone: a reel\'s caption and rail are clear of the chrome', cr.issues.length === 0, cr.issues.join(' | '));
    const same = key => JSON.stringify(watch[key]) === JSON.stringify(reels[key]);
    check('Watch and Reels: the sound button in exactly the same place and size', same('sound'), `${JSON.stringify(watch.sound)} vs ${JSON.stringify(reels.sound)}`);
    check('Watch and Reels: the save button in exactly the same place and size', same('save'), `${JSON.stringify(watch.save)} vs ${JSON.stringify(reels.save)}`);
    check('Watch and Reels: the same rail labels', same('label'), `${watch.label} vs ${reels.label}`);
    check('Watch and Reels: the same place chip (height, type)', watch.chip.h === reels.chip.h && watch.chip.x === reels.chip.x && same('chipFont'), `${JSON.stringify(watch.chip)} ${watch.chipFont} vs ${JSON.stringify(reels.chip)} ${reels.chipFont}`);
    check('Watch and Reels: the same caption type, edge and baseline', same('words') && same('captionLeft') && same('captionBottom'), `${watch.words} @${watch.captionLeft},${watch.captionBottom} vs ${reels.words} @${reels.captionLeft},${reels.captionBottom}`);
    // One night under both captions, each as tall as its own words: Watch's caption is a chip line and up
    // to two title lines, a reel's is three to five spoken lines, so one shade for both either washed a
    // bright Short grey to halfway up or left a reel's upper lines bare.
    const shaded = t => t.shade.night && t.shade.foot >= .75 && t.shade.clearFrom !== null && t.shade.clearFrom < t.captionTop;
    check('Watch and Reels: the same night under each caption, dense at the foot and faded out above its words', shaded(watch) && shaded(reels), `${JSON.stringify(watch.shade)} caption ${watch.captionTop} vs ${JSON.stringify(reels.shade)} caption ${reels.captionTop}`);
    check('Watch: the shade leaves the top 60% of a Short clear', watch.shade.clearFrom >= .6 * 812, JSON.stringify(watch.shade));
    // The menu and the brand stay where they were: the Atlas and the Library.
    const kept = [];
    for (const [tab, view] of [['.studio-mobile-nav button:nth-child(1)', 'atlas'], ['[data-action="open-notebook-mobile"]', 'notebook']]) {
      await page.click(tab);
      await page.waitForFunction(v => JSON.parse(window.render_game_to_text()).workspace === v, view);
      kept.push(`${view}: ${await page.evaluate(() => ['brand-home', 'open-search', 'open-menu'].filter(a => !!document.querySelector(`[data-action="${a}"]`)).join(' '))}`);
    }
    check('phone: the Atlas and the Library keep the brand, search and the menu', kept.every(line => / brand-home open-search open-menu$/.test(line)), kept.join(' · '));
    check('phone: no page errors', errors.length === 0, errors.join(' | '));
  } catch (error) {
    check('phone screens', false, error.message.split('\n')[0]);
  } finally {
    await context.close();
  }
}

// --- Every phone size: clearance on Watch and Reels, and no sideways scroll ------------------------
for (const size of SIZES) {
  const { context, page, errors } = await open(size.viewport, size.insets);
  try {
    await videoOf(page, 'is-tall');
    const c = await page.evaluate(clearance);
    const s = await sideScroll(page);
    check(`${size.name}: Watch clear of the chrome${size.insets ? ', insets in' : ''} (${c.checked} parts)`, c.issues.length === 0, c.issues.join(' | '));
    const row = await page.evaluate(topRow);
    check(`${size.name}: search alone at the right, on one row with the centred switch`, rowOk(row), JSON.stringify(row));
    check(`${size.name} (${size.viewport.width}): no sideways scroll on Watch`, s.page <= 0 && s.pager <= 0, JSON.stringify(s));
    if (size.name === 'phone-web') await shot(page, 'phone-8-watch-short-browser');
    await videoOf(page, 'is-wide');
    const w = await page.evaluate(clearance);
    check(`${size.name}: a landscape card clear of the chrome`, w.issues.length === 0, w.issues.join(' | '));
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-page[data-page="0"] .reel[data-phase="story"]');
    await page.click('.reel-page[data-page="0"] [data-action="reel-predict"] >> nth=0', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => Number(document.querySelector('.reel-page[data-page="0"] .reel')?.dataset.frame) >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(clearance);
    const rs = await sideScroll(page);
    check(`${size.name}: Reels clear of the chrome`, r.issues.length === 0, r.issues.join(' | '));
    check(`${size.name} (${size.viewport.width}): no sideways scroll on Reels`, rs.page <= 0 && rs.pager <= 0, JSON.stringify(rs));
    check(`${size.name}: no page errors`, errors.length === 0, errors.join(' | '));
  } catch (error) {
    check(size.name, false, error.message.split('\n')[0]);
  } finally {
    await context.close();
  }
}

// --- Desktop: the 9:16 column over the starfield, the rail over its edge --------------------------
{
  const { context, page, errors } = await open({ width: 1440, height: 900 }, null, false);
  try {
    await videoOf(page, 'is-tall');
    await page.waitForTimeout(7000);
    const column = await page.evaluate(() => { const r = document.querySelector('.feed').getBoundingClientRect(), rail = document.querySelector(`.feed-page[data-page="${document.querySelector('.feed').dataset.visible}"] .feed-actions`).getBoundingClientRect(); return { w: r.width, h: r.height, railInside: rail.right <= r.right && rail.left >= r.left, stars: !!document.querySelector('.explore-workspace .deep-space-backdrop') }; });
    check('desktop: Watch is a 9:16 column over the starfield, its rail over the column', Math.abs(column.w / column.h - 9 / 16) < 0.01 && column.stars && column.railInside, `${Math.round(column.w)}×${Math.round(column.h)}`);
    const ytd = await youtubeClear(page);
    check('desktop: nothing YouTube draws (title, captions, buttons) is on the column', ytd.drawn.length === 0, ytd.drawn.slice(0, 6).join(' | '));
    await shot(page, 'desktop-1-watch');
    await videoOf(page, 'is-wide');
    await page.waitForTimeout(10000);
    await shot(page, 'desktop-2-watch-landscape');
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-page[data-page="0"] .reel[data-phase="story"]');
    await page.click('.reel-page[data-page="0"] [data-action="reel-predict"] >> nth=0', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => Number(document.querySelector('.reel-page[data-page="0"] .reel')?.dataset.frame) >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await shot(page, 'desktop-3-reels');
    check('desktop: no sideways scroll', (await sideScroll(page)).page <= 0);
    check('desktop: no page errors', errors.length === 0, errors.join(' | '));
  } catch (error) {
    check('desktop', false, error.message.split('\n')[0]);
  } finally {
    await context.close();
  }
}

// --- Phone WebKit, the iOS app's engine: nothing painted at the screen's top-left corner -----------
// The evergreen deck (dated decks answered 404, as explore-journey does by default), which has whole
// pictures shown over their soft backdrop.
{
  const engine = await webkit.launch();
  const context = await engine.newContext({ viewport: { width: 375, height: 812 }, userAgent: IPHONE_UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await context.addInitScript(css => { addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = css; document.head.append(style); }); }, `:root{--safe-top:${IPHONE.top}px!important;--safe-bottom:${IPHONE.bottom}px!important}`);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/explore/decks/**', route => route.fulfill({ status: 404, body: 'not found' }));
  const seen = [];
  const look = async name => { await page.waitForTimeout(1500); seen.push({ name, ...await corner(page) }); };
  try {
    await page.goto(URL);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.click('[data-action="open-explore-mobile"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card');
    await videoOf(page, 'is-tall');
    await look('Watch, a Short');
    for (const index of [3, 6, 7]) if (await visible(page) < index) await feedTo(page, index);
    if (await page.getAttribute('.feed-page[data-page="7"]', 'data-kind') === 'checkpoint') await look('Watch, the checkpoint');
    await videoOf(page, 'is-wide');
    await look('Watch, a landscape video');
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-page[data-page="0"] .reel[data-phase="story"]');
    const backdrop = await page.waitForSelector('.reel-layer.has-backdrop', { state: 'attached', timeout: 20000 }).then(() => true, () => false);
    for (let i = 0; i < 4; i++) {
      await look(`Reels, reel ${i + 1}`);
      await page.evaluate(() => { const pager = document.querySelector('.reel-pager'); pager.scrollTop += pager.clientHeight; });
    }
    await shot(page, 'webkit-phone-reels');
    check('WebKit phone: a reel\'s whole picture gets its soft backdrop', backdrop);
    const marked = seen.filter(c => !cornerClear(c));
    check(`WebKit phone: nothing painted at the screen's top-left corner on Watch or Reels (${seen.length} screens)`, seen.length >= 6 && marked.length === 0, (marked.length ? marked : seen).map(c => `${c.name}: alpha ${c.alpha}, edges ${c.edge} vs ${c.control}`).join(' | '));
    check('WebKit phone: no page errors', errors.length === 0, errors.join(' | '));
  } catch (error) {
    check('WebKit phone', false, error.message.split('\n')[0]);
  } finally {
    await context.close();
    await engine.close();
  }
}

await browser.close();

// One contact sheet: the phone screens in a row of four, then the desktop ones scaled to the same height.
const phone = shots.filter(name => name.startsWith('phone-'));
const desk = shots.filter(name => name.startsWith('desktop-'));
try {
  const inputs = [...phone, ...desk].flatMap(name => ['-i', path.join(OUT, `${name}.png`)]);
  const scaled = [...phone.map((_, i) => `[${i}]scale=375:812[p${i}]`), ...desk.map((_, i) => `[${phone.length + i}]scale=-1:520[d${i}]`)].join(';');
  const cols = 4;
  const layout = [...phone.map((_, i) => `${(i % cols) * 387}_${Math.floor(i / cols) * 824}`), ...desk.map((_, i) => `${i * 844}_${Math.ceil(phone.length / cols) * 824}`)].join('|');
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${scaled};${[...phone.map((_, i) => `[p${i}]`), ...desk.map((_, i) => `[d${i}]`)].join('')}xstack=inputs=${phone.length + desk.length}:layout=${layout}:fill=0x0b0d16[out]`, '-map', '[out]', path.join(OUT, 'contact-sheet.png')]);
  console.log(`Contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
} catch (error) { check('contact sheet', false, error.message.split('\n')[0]); }

const failed = results.filter(result => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
