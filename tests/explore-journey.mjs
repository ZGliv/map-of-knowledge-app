// Explore tab, end to end, in a real browser: the reel feed (a reel plays the moment it is on screen,
// its guess floating over the opening seconds without holding it back), story → end card, Prove it,
// the subject tag, Save (to the places it fits) across a reload, the Lessons list, hub reel rows
// (a reel opened there plays at once), the end of the deck, and every reel in the deck played start
// to finish. Phone (375 × 812) and desktop (1440 × 900). Exits non-zero if any check fails.
// Explore's three tabs are separate: Watch is YouTube only, Reels is every premade reel (today's
// set, then the evergreen deck, then earlier decks' reels still live), Lessons is the list.
// The classic sections run with no dated deck (the evergreen deck alone, exactly the fallback);
// "Dated decks" plays each day's set from public/explore/decks/ (?day=YYYY-MM-DD), expiry, the
// hub fallback on the end card, the Reels tab past today's set, and every engine reel start to finish.
// Watch (the video feed, Explore's first tab) has its own sections: player, checkpoint, chip,
// hub row (the chosen video plays at once), the rail (Save and Sound only: no feedback buttons),
// implicit signals (a card left teaches the feed, kept in mok-feed-v2), Save to places (a saved video
// leads its places' hubs), and smoothness. "Sound" checks that sound is on by default and stays on
// through every transition (YouTube's own isMuted() and the narration element, read from the page).
// "Recovery" blocks YouTube as Watch first opens and expects it to play once YouTube is back, and
// checks that a learner's pause right after a video starts stays a pause. "Network and endings" drops
// the network on a swipe (Watch heard again with no touch, never "Tap for sound"), lets a long video
// end on screen (YouTube's end screen unseen, one tap replays it), comes back to a long video that
// ended and to a Short that ended as the learner left, has a Short loop back to its start instead of
// ending (as YouTube does in some sessions: the feed moves on), and leaves Watch before a slow YouTube API has
// its player (which must not play on aloud out of sight). "Tap layer" pauses and plays from the video
// and from its caption; "Early tap" taps before the video has started (not a pause).
//
//   MOK_URL=http://127.0.0.1:5210 node tests/explore-journey.mjs          (everything, in Chromium)
//   MOK_BROWSER=webkit node tests/explore-journey.mjs                     (WebKit: iOS Safari's engine)
//   MOK_EXPLORE_SKIP_ALL=1 node tests/explore-journey.mjs                 (skip the every-reel playthrough)
//
// WebKit has no CPU throttling (a Chromium DevTools feature), so the 4× smoothness sections run in
// Chromium only. Writes output/explore/*.png, output/feed/*.png, output/soundtabs/*.png and a
// contact sheet of key phone screens in the first two.
import { mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const URL = process.env.MOK_URL || 'http://127.0.0.1:5210';
const OUT = path.resolve('output/explore');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
// The guide's local API server is not part of this check; its 502s are the dev proxy, not the app.
const IGNORED = [/502 \(Bad Gateway\)/];
const narration = JSON.parse(await readFile('src/explore/narration.json', 'utf8'));
// The deck order, read from deck.ts so this check follows the feed as reels are added.
const DECK = [...(await readFile('src/explore/deck.ts', 'utf8')).match(/export const REELS[^=]*=\s*\[([\s\S]*?)\]\.map\(by\)/)[1].matchAll(/'([a-z0-9-]+)'/g)].map(match => match[1]);
const EVOLUTION_REELS = DECK.filter(id => /^e\d{2}-/.test(id)).length;
const NODES = { 'physics-hammer-and-feather': 'knowledge.science.physics.mechanics.motion.acceleration', 'e05-where-to-draw-the-line': 'knowledge.science.biology.evolution.new-species' };
// The dated decks, and the feed each day should play: its live reels with one evergreen pick after
// every two (explore/today.ts todaysSet), for a viewer who has watched nothing.
const DECK_DIR = 'public/explore/decks';
const DATED = JSON.parse(await readFile(`${DECK_DIR}/index.json`, 'utf8')).dates;
const decks = Object.fromEntries(await Promise.all(DATED.map(async date => [date, JSON.parse(await readFile(`${DECK_DIR}/${date}.json`, 'utf8'))])));
const live = (reel, day) => reel.from <= day && (!reel.expires || day < reel.expires);
function feedFor(deck, day) {
  const fresh = deck.reels.filter(reel => live(reel, day)).map(reel => reel.id);
  if (!fresh.length) return DECK;
  const picks = deck.evergreen.filter(id => DECK.includes(id));
  const out = [];
  fresh.forEach((id, i) => { out.push(id); if ((i + 1) % 2 === 0 && picks.length) out.push(picks.shift()); });
  return [...out, ...picks];
}
await mkdir(OUT, { recursive: true });

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const ENGINE = process.env.MOK_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const launch = () => ENGINE === 'webkit' ? webkit.launch() : chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let browser = await launch();
console.log(`Engine: ${ENGINE}`);
/** A clean browser for each batch of playthroughs: WebKit's network process outlives every context,
 * and after some fifty sessions streaming narration it stopped answering page loads at all. */
const freshBrowser = async () => { await browser.close(); browser = await launch(); };

// iOS's rule for media, in any engine (headless engines let anything play): an element may play
// with sound only once it has been played during a tap; unmuting a playing one outside a tap
// pauses it. A tap in the page reaches the YouTube frame by message, as WebKit forwards one
// through postMessage. Sessions that check sound run under it, so a new, never-tapped audio element
// (one per reel, or per visit to a tab) fails here as it does on an iPhone.
function iosMediaRule() {
  const inPlayer = /youtube/.test(location.hostname);
  let forwarded = 0;
  const tapping = () => !!navigator.userActivation?.isActive || Date.now() - forwarded < 1000;
  if (inPlayer) window.addEventListener('message', event => { try { const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; if (data?.__mokTap) forwarded = Date.now(); } catch { /* not ours */ } }, true);
  else for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, () => { for (const frame of document.querySelectorAll('iframe')) try { frame.contentWindow.postMessage(JSON.stringify({ __mokTap: 1 }), '*'); } catch { /* gone */ } }, true);
  const unlocked = new WeakSet();
  const proto = HTMLMediaElement.prototype;
  const play = proto.play;
  proto.play = function (...args) {
    if (tapping()) unlocked.add(this);
    if (!this.muted && this.volume > 0 && !unlocked.has(this)) return Promise.reject(new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError'));
    return play.apply(this, args);
  };
  const muted = Object.getOwnPropertyDescriptor(proto, 'muted');
  Object.defineProperty(proto, 'muted', { configurable: true, get() { return muted.get.call(this); }, set(value) { if (tapping()) unlocked.add(this); muted.set.call(this, value); if (!value && !this.paused && this.volume > 0 && !unlocked.has(this)) this.pause(); } });
}

async function open(size, seed, { decks: withDecks = false, day, youtube = true, ios = false } = {}) {
  const phone = size === 'phone';
  const context = await browser.newContext({ viewport: phone ? { width: 375, height: 812 } : { width: 1440, height: 900 }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 2 });
  if (ios) await context.addInitScript(iosMediaRule);
  // Keep a handle on every media element that plays, so the check can see narration really running.
  await context.addInitScript(() => { const play = HTMLMediaElement.prototype.play; window.__mokMedia = []; HTMLMediaElement.prototype.play = function (...args) { if (!window.__mokMedia.includes(this)) window.__mokMedia.push(this); return play.apply(this, args); }; });
  if (seed) await context.addInitScript(value => { if (!sessionStorage.getItem('mok-seeded')) { localStorage.setItem('mok-reels-v1', JSON.stringify(value)); sessionStorage.setItem('mok-seeded', '1'); } }, seed);
  const page = await context.newPage();
  const errors = [];
  const audio = [];
  // A day with no deck is a 404 the app expects (it falls back); any other failed load is an error.
  // YouTube's own player logs into the same console from inside its iframe: not this app's errors.
  page.on('console', message => { if (message.type() === 'error' && !IGNORED.some(pattern => pattern.test(message.text())) && !(/status of 404/.test(message.text()) && /\/explore\/decks\/[^/]+\.json$/.test(message.location()?.url ?? '')) && !/youtube(-nocookie)?\.com|ytimg\.com|googlevideo|doubleclick|google\.com/.test(message.location()?.url ?? '')) errors.push(message.text()); });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('response', response => { if (/\/explore\/(narration|decks)\/.+\.mp3/.test(response.url())) audio.push(`${response.status()} ${response.url().split('/').pop()}`); });
  // Without dated decks the feed is the evergreen deck alone: the fallback, and what these checks were written for.
  if (!withDecks) await page.route('**/explore/decks/**', route => route.fulfill({ status: 404, body: 'not found' }));
  // Sessions that only pass through Watch on the way to Reels keep YouTube out entirely.
  // (Answered empty rather than refused: a refused frame becomes an error page the seeding script can't read.)
  if (!youtube) await context.route(/youtube(-nocookie)?\.com|ytimg\.com/, route => route.fulfill({ status: 200, contentType: /iframe_api|\.js/.test(route.request().url()) ? 'application/javascript' : 'text/html', body: '' }));
  await page.goto(day ? `${URL}/?day=${day}` : URL);
  await page.waitForFunction(() => !!window.render_game_to_text);
  return { context, page, errors, audio, phone };
}
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.documentElement.clientWidth);
const reel = page => `.reel-page[data-page="${page}"]`;
const visibleIndex = page => page.evaluate(() => Number(document.querySelector('.reel-feed')?.dataset.reelIndex));
// Explore opens on Watch (the video feed); the reel checks below switch to the Reels tab first.
const openExplore = async (session, tab = 'reels') => {
  await session.page.click(session.phone ? '[data-action="open-explore-mobile"]' : '[data-action="open-explore"]');
  await session.page.waitForSelector('.explore-workspace:not(.is-hidden) .explore-switch');
  if (tab === 'reels') { await session.page.click('[data-action="explore-reels"]'); await session.page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed'); }
  else await session.page.waitForSelector('.explore-workspace:not(.is-hidden) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card');
};
const waitFrame = (page, index, frame) => page.waitForFunction(([selector, wanted]) => Number(document.querySelector(selector)?.dataset.frame) >= wanted, [`${reel(index)} .reel`, frame], { timeout: 60000 });
const waitEnd = (page, index) => page.waitForSelector(`${reel(index)} .reel[data-phase="end"]`, { timeout: 70000 });
// A reel plays the moment it is on screen: its story phase, unpaused, with its clock moving.
const reelPlaying = async (page, index) => {
  const ok = await page.waitForFunction(i => { const r = document.querySelector(`.reel-page[data-page="${i}"] .reel`); return r?.dataset.phase === 'story' && !r.classList.contains('is-paused'); }, index, { timeout: 15000 }).then(() => true, () => false);
  if (!ok) return false;
  const clock = () => page.evaluate(i => [...document.querySelectorAll(`.reel-page[data-page="${i}"] .reel-progress b`)].map(b => b.style.transform).join(' '), index);
  const before = await clock();
  await page.waitForTimeout(900);
  return (await clock()) !== before;
};
// Its guess floats over the opening seconds: pick a choice while it is up (true when one was picked).
const guess = async (page, index, choice = 0) => {
  const any = `${reel(index)} [data-reel-part="prediction"] [data-action="reel-predict"]`;
  if (!await page.waitForSelector(any, { timeout: 4000 }).then(() => true, () => false)) return false;
  return page.click(typeof choice === 'number' ? `${any} >> nth=${choice}` : `${reel(index)} [data-action="reel-predict"][data-choice="${choice}"]`, { timeout: 3000 }).then(() => true, () => false);
};
// Save from the rail: the sheet of places it fits, the best already chosen; `more` adds the next suggestion.
const saveFromRail = async (page, button, more = false) => {
  await page.click(button);
  await page.waitForSelector('[data-save-sheet]');
  if (more) await page.click('[data-save-sheet] [data-action="save-place"][aria-pressed="false"] >> nth=0');
  await page.click('[data-save-sheet] [data-action="save-confirm"]');
  await page.waitForSelector('[data-save-sheet]', { state: 'detached' });
};
const unsaveFromRail = async (page, button) => {
  await page.click(button);
  await page.waitForSelector('[data-save-sheet="saved"]');
  await page.click('[data-save-sheet] [data-action="save-remove"]');
  await page.waitForSelector('[data-save-sheet]', { state: 'detached' });
};
const setVisibility = (page, value) => page.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, value);
const settledAt = (page, id) => page.waitForFunction(expected => { const s = JSON.parse(window.render_game_to_text()); return s.workspace === 'atlas' && !s.navigating && s.location.id === expected; }, id, { timeout: 30000 });

// Phone: the whole loop.
{
  const session = await open('phone');
  const { page } = session;
  await openExplore(session);
  await page.waitForSelector(`${reel(0)} [data-reel-part="prediction"]`);
  const playsAtOnce = await reelPlaying(page, 0);
  await page.waitForTimeout(600);
  check('phone: the Reels tab plays the first reel at once, no tap to begin', playsAtOnce && (await page.getAttribute(`${reel(0)} .reel`, 'data-phase')) === 'story');
  check('phone: its guess floats over the opening seconds', await page.isVisible(`${reel(0)} [data-action="reel-predict"]`));
  check('phone: no "tap to begin" anywhere on the reel', !(await page.$(`${reel(0)} .reel.is-predict`)) && !/tap to (begin|start)/i.test(await page.textContent(reel(0))));
  const nav = await page.evaluate(() => { const el = document.querySelector('.studio-mobile-nav'); const cs = getComputedStyle(el); return { over: el.classList.contains('is-over-reel'), position: cs.position, opaque: cs.backgroundColor !== 'rgba(0, 0, 0, 0)', tabs: [...el.querySelectorAll('button')].map(b => b.textContent.trim()) }; });
  check('phone: tab bar reads Atlas · Explore · Library', nav.tabs.join(' · ') === 'Atlas · Explore · Library', nav.tabs.join(' · '));
  check('phone: tab bar stays visible and floats transparently over the reel', nav.over && nav.position === 'absolute' && !nav.opaque);
  check('phone: no sideways scroll on the feed', await noSideScroll(page));
  await shot(page, 'phone-1-feed-prediction');

  const frameAtGuess = Number(await page.getAttribute(`${reel(0)} .reel`, 'data-frame'));
  await page.click(`${reel(0)} [data-action="reel-predict"][data-choice="sixth"]`);
  await page.waitForSelector(`${reel(0)} [data-reel-part="prediction"]`, { state: 'detached', timeout: 5000 }).catch(() => {});
  check('phone: a guess is kept and the question goes, the story never restarted', !(await page.isVisible(`${reel(0)} [data-reel-part="prediction"]`)) && Number(await page.getAttribute(`${reel(0)} .reel`, 'data-frame')) >= frameAtGuess);
  await waitFrame(page, 0, 1);
  await page.waitForTimeout(1200);
  await shot(page, 'phone-2-story');
  check('phone: the story plays with real-text captions', (await page.textContent(`${reel(0)} .reel-caption`))?.includes('Commander David Scott'));
  check('phone: the subject tag names the place', (await page.textContent(`${reel(0)} [data-action="reel-tag-story"]`))?.trim() === 'Acceleration');

  // Tap to pause: the clock stops.
  await page.click(`${reel(0)} [data-action="reel-pause"]`);
  const frozen = await page.evaluate(selector => document.querySelector(selector).getAttribute('style'), `${reel(0)} .reel-progress i:nth-child(2) b`);
  await page.waitForTimeout(1500);
  const still = await page.evaluate(selector => document.querySelector(selector).getAttribute('style'), `${reel(0)} .reel-progress i:nth-child(2) b`);
  check('phone: tap pauses the reel', (await page.isVisible(`${reel(0)} .reel.is-paused`)) && frozen === still);
  await page.click(`${reel(0)} [data-action="reel-pause"]`);

  // Sound: on by default, so the reel speaks as it starts; one tap off, one tap on.
  const narrating = () => page.evaluate(() => window.__mokMedia.some(el => el.src.includes('physics-hammer-and-feather.mp3') && !el.paused && !el.muted && el.volume > 0 && el.currentTime > 0.3));
  await page.waitForTimeout(800);
  check('phone: sound is on by default: the reel’s narration plays as it starts, no tap needed', (await state(page)).explore.sound.on === true && (await page.getAttribute(`${reel(0)} [data-action="reel-sound"]`, 'aria-pressed')) === 'true' && session.audio.some(line => /^(200|206) physics-hammer-and-feather\.mp3/.test(line)) && await narrating(), session.audio.join(', '));
  check('phone: the reel’s rail is just Save and Sound', (await page.$$eval(`${reel(0)} .reel-rail button`, els => els.map(el => el.dataset.action).sort().join(' '))) === 'reel-save reel-sound');
  await page.click(`${reel(0)} [data-action="reel-sound"]`);
  await page.waitForTimeout(700);
  check('phone: one tap turns the narration off', (await state(page)).explore.sound.on === false && !(await narrating()) && (await page.getAttribute(`${reel(0)} [data-action="reel-sound"]`, 'aria-pressed')) === 'false');
  await page.click(`${reel(0)} [data-action="reel-sound"]`);
  await page.waitForTimeout(1200);
  check('phone: and one more turns it back on, where the story is', (await state(page)).explore.sound.on === true && await narrating());

  await waitFrame(page, 0, 4);
  await page.waitForTimeout(1500);
  check('phone: the prediction is recalled where the story settles it', (await page.textContent(`${reel(0)} [data-reel-part="guess"]`))?.includes('About a sixth as hard'));
  await shot(page, 'phone-3-reveal');
  await waitEnd(page, 0);
  await page.waitForTimeout(900);
  await shot(page, 'phone-4-end-card');
  check('phone: the end card offers Prove it and the subject tag', await page.isVisible(`${reel(0)} [data-action="prove-it"]`) && await page.isVisible(`${reel(0)} [data-action="reel-tag"]`));
  const afterWatch = await state(page);
  check('phone: watching colors nothing on the map', afterWatch.expeditions.earnedIds.length === 0 && afterWatch.demo.completedIds.length === 0 && afterWatch.expeditions.runs.length === 0 && Object.keys(afterWatch.expeditions.seen).length === 0);

  // Save (to its own place, the sheet's first choice), then the subject tag flies the atlas to the reel's place.
  await saveFromRail(page, `${reel(0)} [data-action="reel-save"]`);
  check('phone: saving marks the reel', (await page.getAttribute(`${reel(0)} [data-action="reel-save"]`, 'aria-pressed')) === 'true');
  await page.click(`${reel(0)} [data-action="reel-tag"]`);
  await settledAt(page, NODES['physics-hammer-and-feather']);
  await page.waitForTimeout(600);
  check('phone: the subject tag flies the atlas to its place', (await state(page)).location.id === NODES['physics-hammer-and-feather']);
  await shot(page, 'phone-5-tag-on-the-map');
  await openExplore(session);
  check('phone: coming back to Explore resumes the same reel', (await visibleIndex(page)) === 0 && await page.isVisible(`${reel(0)} [data-reel-part="end"]`));

  // Try a new case opens the place's field mission, with the question bank as the fallback in
  // words; leaving it returns to the same reel.
  check('phone: the end card says Try a new case', (await page.textContent(`${reel(0)} [data-action="prove-it"]`))?.trim() === 'Try a new case');
  await page.click(`${reel(0)} [data-action="prove-it"]`);
  await page.waitForSelector('.mission-shell [data-case]');
  check('phone: Try a new case opens a new case for that place', (await page.evaluate(() => location.hash)).startsWith('#/mission/knowledge.science.physics'));
  check('phone: the mission keeps Try it in words as the fallback', await page.isVisible('[data-action="mission-words"]'));
  await page.waitForTimeout(700);
  await shot(page, 'phone-6-prove-it');
  check('phone: the mission offers its way back to Explore', (await page.getAttribute('[data-action="mission-close"]', 'aria-label')) === 'Back to Explore');
  await page.click('[data-action="mission-close"]');
  await page.waitForSelector('.mission-shell', { state: 'detached' });
  await page.waitForTimeout(500);
  check('phone: leaving the mission returns to the same reel', (await page.evaluate(() => location.hash)) === '' && (await visibleIndex(page)) === 0 && (await state(page)).workspace === 'explore');

  // The Lessons list inside Explore (the learner never reads "expedition"); a lesson opened there returns to it.
  check('phone: Explore\'s third tab reads Lessons', (await page.textContent('[data-action="explore-list"]'))?.trim() === 'Lessons' && (await page.getAttribute('.explore-switch', 'aria-label')) === 'Explore');
  await page.click('[data-action="explore-list"]');
  await page.waitForSelector('.explore-list [data-workspace="discoveries"]');
  await page.waitForTimeout(600);
  check('phone: the Lessons list lives inside Explore', await page.isVisible('[data-learnable-kind="expedition"]'));
  check('phone: the list never says expedition', !/expedition/i.test(await page.evaluate(() => { const list = document.querySelector('.explore-list'); return `${list.innerText} ${[...list.querySelectorAll('[aria-label],[title]')].map(el => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''}`).join(' ')} ${list.getAttribute('aria-label')}`; })));
  check('phone: the tab bar is solid again over the list', !(await page.evaluate(() => document.querySelector('.studio-mobile-nav').classList.contains('is-over-reel'))));
  check('phone: no sideways scroll on the list', await noSideScroll(page));
  await shot(page, 'phone-7-expeditions');
  const packOpened = await page.getAttribute('[data-learnable-kind="expedition"]', 'data-learnable-id');
  await page.click('[data-learnable-kind="expedition"] [data-action="discoveries-open"]');
  await page.waitForSelector(`.expedition-shell[data-expedition="${packOpened}"]`);
  await page.click('[data-action="expedition-exit"]');
  await page.waitForSelector('.expedition-shell', { state: 'detached' });
  await page.waitForTimeout(400);
  check('phone: leaving an expedition opened from the list returns to the list', (await page.getAttribute('.explore-workspace', 'data-explore-tab')) === 'list' && await page.isVisible('.explore-list [data-workspace="discoveries"]'));

  // Pins survive a reload and show on the place's hub and in the notebook.
  await page.reload();
  await page.waitForFunction(() => !!window.render_game_to_text);
  check('phone: a pin survives a reload', (await state(page)).explore.pinned.includes('physics-hammer-and-feather'));
  await page.click('.studio-mobile-nav [aria-label="Open library"]');
  await page.waitForSelector('[data-notebook-section="pinned-reels"] [data-reel-id="physics-hammer-and-feather"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-notebook-section="pinned-reels"] img')].every(img => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
  await shot(page, 'phone-8-notebook-pins');
  check('phone: pinned reels appear in the notebook', true);
  await page.goto(`${URL}/#/hub/knowledge.science.physics.mechanics.motion.acceleration`);
  await page.waitForSelector('[data-hub-section="reels"]');
  check('phone: the pinned reel leads its place’s reel row, marked', (await page.getAttribute('[data-reel-cards="hub"] li:first-child .reel-card', 'data-reel-id')) === 'physics-hammer-and-feather' && await page.isVisible('[data-reel-cards="hub"] li:first-child .reel-card-pin'));
  await openExplore(session);
  check('phone: after a reload the feed opens at the first reel not yet watched', (await visibleIndex(page)) === 1);
  await page.evaluate(() => { const pager = document.querySelector('.reel-pager'); pager.scrollTop = 0; });
  await page.waitForTimeout(700);
  check('phone: the reel still shows as saved after a reload', (await page.getAttribute(`${reel(0)} [data-action="reel-save"]`, 'aria-pressed')) === 'true');
  await unsaveFromRail(page, `${reel(0)} [data-action="reel-save"]`);
  await page.reload();
  await page.waitForFunction(() => !!window.render_game_to_text);
  check('phone: removing it also survives a reload', !(await state(page)).explore.pinned.includes('physics-hammer-and-feather'));

  // A hub's reel row opens Explore at that reel.
  await page.goto(`${URL}/#/hub/knowledge.science.biology.evolution.new-species`);
  await page.waitForSelector('[data-hub-section="reels"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-reel-cards="hub"] .reel-card').length >= 3, null, { timeout: 10000 }).catch(() => {});
  check('phone: a subject hub shows its reels', (await page.$$('[data-reel-cards="hub"] .reel-card')).length === 3);
  await page.evaluate(() => document.querySelector('[data-hub-section="reels"]').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-reel-cards="hub"] img')].slice(0, 2).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
  await page.waitForTimeout(1200); // the hub's arrival fade
  await shot(page, 'phone-9-hub-reels');
  check('phone: no sideways scroll on the hub', await noSideScroll(page));
  await page.click('[data-reel-cards="hub"] [data-reel-id="e05-where-to-draw-the-line"]');
  await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
  await page.waitForTimeout(900);
  const target = DECK.indexOf('e05-where-to-draw-the-line');
  check('phone: the hub’s reel row opens that reel, playing at once', (await visibleIndex(page)) === target && (await state(page)).explore.reelId === 'e05-where-to-draw-the-line' && await reelPlaying(page, target));

  // The end of the deck: quiet, finite, two ways on.
  await page.evaluate(() => { const pager = document.querySelector('.reel-pager'); pager.scrollTop = pager.scrollHeight; });
  await page.waitForTimeout(1000);
  check('phone: the deck ends with a quiet end page', await page.isVisible('[data-action="reels-end-atlas"]') && await page.isVisible('[data-action="reels-end-list"]'));
  check('phone: the end page offers Browse lessons', (await page.textContent('[data-action="reels-end-list"]'))?.trim() === 'Browse lessons');
  check('phone: the end page says "That’s every reel for now." and counts nothing', (await page.textContent('.reel-page--end h2'))?.trim() === 'That’s every reel for now.');
  await shot(page, 'phone-10-end-of-deck');
  await page.screenshot({ path: path.resolve('output/soundtabs/reels-end.png') });
  await page.click('[data-action="reels-end-list"]');
  check('phone: the end page opens the Lessons list', (await page.getAttribute('.explore-workspace', 'data-explore-tab')) === 'list');
  check('phone: no console errors', session.errors.length === 0, session.errors.join(' | '));
  await session.context.close();
}

// Phone: Watch, the video feed. YouTube's player alone in its frame, YouTube only (MoK's reels
// have their own tab), a checkpoint every eighth card, a rail of just Save and Sound, a card left
// teaching the feed (no feedback buttons), Save to the places a video fits, the place chip, a hub's
// Watch row (saved videos first; the chosen video plays at once), and watching never coloring land.
const FEED_OUT = path.resolve('output/feed');
await mkdir(FEED_OUT, { recursive: true });
const feedShot = (page, name) => page.screenshot({ path: path.join(FEED_OUT, `${name}.png`) });
const card = index => `.feed-page[data-page="${index}"]`;
const feedIndex = page => page.evaluate(() => Number(document.querySelector('.feed')?.dataset.visible));
const feedTo = async (page, index) => { await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTop = i * pager.clientHeight; }, index); await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) === i, index); await page.waitForTimeout(1600); };
// The card whose player is playing (a video YouTube refuses to play here is skipped by the feed).
const playing = async page => { await page.waitForFunction(() => { const v = document.querySelector('.feed')?.dataset.visible; return !!document.querySelector(`.feed-player-layer[data-for="${v}"] .feed-player.is-shown`); }, null, { timeout: 30000 }); return feedIndex(page); };
const feedMemory = page => page.evaluate(() => JSON.parse(localStorage.getItem('mok-feed-v2') || 'null'));
const soundSaved = page => page.evaluate(() => JSON.parse(localStorage.getItem('mok-sound-v1') || 'null')?.on ?? null);
await mkdir(path.resolve('output/soundtabs'), { recursive: true });
{
  const session = await open('phone');
  const { page } = session;
  await openExplore(session, 'feed');
  check('phone: Explore opens on Watch', (await page.getAttribute('.explore-workspace', 'data-explore-tab')) === 'feed' && (await page.getAttribute('[data-action="explore-feed"]', 'aria-selected')) === 'true');
  const first = await page.getAttribute(`${card(0)} .feed-card`, 'data-video-id');
  check('phone: the first card is a video with its poster', !!first && await page.isVisible(`${card(0)} .feed-poster`));
  const at = await playing(page);
  const src = await page.getAttribute('.feed-player-layer iframe.feed-player', 'src');
  check('phone: the official player on youtube-nocookie.com, inline', src.startsWith('https://www.youtube-nocookie.com/embed/') && src.includes('playsinline=1') && src.includes('enablejsapi=1'), src.split('?')[0]);
  check('phone: it sends a Referer (strict-origin-when-cross-origin)', (await page.getAttribute('.feed-player-layer iframe.feed-player', 'referrerpolicy')) === 'strict-origin-when-cross-origin');
  const fit = await page.evaluate(selector => { const a = document.querySelector(selector).getBoundingClientRect(), b = document.querySelector('.feed-player-layer').getBoundingClientRect(); return { covers: b.left <= a.left + 0.01 && b.top <= a.top + 0.01 && b.right >= a.right - 0.01 && b.bottom >= a.bottom - 0.01, over: Math.max(a.left - b.left, a.top - b.top, b.right - a.right, b.bottom - a.bottom) }; }, `${card(at)} .feed-frame`);
  check('phone: the player sits exactly in the card’s frame', fit.covers && fit.over < 2, `${fit.over.toFixed(1)} px over at most`);
  // With Watch's overlay on (youtube.ts WATCH_OVERLAY) the player fills the screen under a clear tap
  // layer, and only the caption and the rail sit over it; with it off, nothing of ours does. The
  // player takes no pointer events under the overlay, so it is hit-tested with them for this look.
  const overlay = await page.evaluate(() => document.querySelector('.feed').classList.contains('is-overlay'));
  const covered = await page.evaluate(([selector, overlay]) => {
    const card = document.querySelector(selector).getBoundingClientRect(), player = document.querySelector('iframe.feed-player');
    // The picture on screen: the player inside the card's frame, less the bands a wide video's clip-path cuts away.
    const p = player.getBoundingClientRect(), band = parseFloat(getComputedStyle(player).clipPath.match(/inset\(([\d.]+)px/)?.[1] ?? '0');
    const frame = { left: Math.max(card.left, p.left), top: Math.max(card.top, p.top + band) };
    frame.width = Math.min(card.right, p.right) - frame.left;
    frame.height = Math.min(card.bottom, p.bottom - band) - frame.top;
    const ours = el => !(overlay && (el.matches('.feed-tap') || el.closest('.feed-meta,.feed-actions')));
    player.style.pointerEvents = 'auto';
    const points = [[.5, .5], [.15, .15], [.85, .85], [.15, .85], [.85, .15]];
    const hits = points.filter(([x, y]) => { const stack = document.elementsFromPoint(frame.left + frame.width * x, frame.top + frame.height * y); const at = stack.findIndex(el => el.matches('iframe.feed-player')); return at < 0 || stack.slice(0, at).some(ours); }).length;
    player.style.pointerEvents = '';
    return hits;
  }, [`${card(at)} .feed-frame`, overlay]);
  check(overlay ? 'phone: over the player only the clear tap layer, the caption and the rail' : 'phone: nothing of ours sits on top of the player', covered === 0, `${covered} of 5 points covered`);
  if (overlay) check('phone: the tap layer over the player paints nothing', await page.evaluate(() => { const tap = document.querySelector('.feed-player-layer .feed-tap'), cs = getComputedStyle(tap); return cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none' && cs.boxShadow === 'none' && tap.childElementCount === 0; }));
  check('phone: one player, on the card on screen', (await page.$$('iframe')).filter(Boolean).length === (await page.$$('iframe.feed-player')).length && (await page.$$('iframe.feed-player')).length === 1 && Number(await page.getAttribute('.feed-player-layer', 'data-for')) === at);
  check('phone: the next card has its poster ready', await page.evaluate(selector => { const img = document.querySelector(selector); return !!img && img.loading === 'eager'; }, `${card(1)} .feed-poster`));
  check('phone: the tab bar floats over the feed', await page.evaluate(() => document.querySelector('.studio-mobile-nav').classList.contains('is-over-reel')));
  check('phone: no sideways scroll on the feed', await noSideScroll(page));
  const soundLabel = await page.getAttribute(`${card(at)} [data-action="feed-sound"]`, 'aria-label');
  check('phone: sound starts on (heard, or "Tap for sound" where the browser wants a tap first)', (await state(page)).explore.sound.on === true && (soundLabel === 'Turn sound off' || soundLabel === 'Tap for sound'), soundLabel);
  await page.waitForTimeout(2500);
  await feedShot(page, 'feed-1-video-playing');

  // Sound: one tap off, remembered; one tap on again.
  if (soundLabel === 'Tap for sound') { await page.click(`${card(at)} [data-action="feed-sound"]`); await page.waitForTimeout(600); }
  await page.click(`${card(at)} [data-action="feed-sound"]`);
  await page.waitForTimeout(600);
  check('phone: turning sound off is remembered', (await soundSaved(page)) === false && (await page.getAttribute(`${card(at)} [data-action="feed-sound"]`, 'aria-label')) === 'Turn sound on');
  await page.click(`${card(at)} [data-action="feed-sound"]`);
  await page.waitForTimeout(600);
  check('phone: and so is turning it back on', (await soundSaved(page)) === true);

  // The rail: Save and Sound, nothing else (no "More like this", no "Not for me").
  const rail = await page.$$eval(`${card(at)} .feed-actions button`, els => els.map(el => el.dataset.action).sort().join(' '));
  check('phone: the rail is just Save and Sound', rail === 'feed-save feed-sound', rail);
  check('phone: no "More like this" or "Not for me" anywhere', !(await page.$('[data-action="feed-more"],[data-action="feed-less"]')) && !/more like this|not for me/i.test(await page.textContent('.feed')));
  // The caption, as on a short-video app: the place chip and the channel on one line, then the title on
  // up to two lines, and nothing under it (no learn line).
  const caption = await page.evaluate(selector => {
    const meta = document.querySelector(`${selector} .feed-meta`), title = meta.querySelector('.feed-title');
    const lines = Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight));
    const parts = [...meta.children].filter(el => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0).map(el => el.className);
    const line = meta.querySelector('.feed-line'), chip = line.querySelector('.feed-chip').getBoundingClientRect(), channel = line.querySelector('.feed-channel')?.getBoundingClientRect();
    return { lines, parts, oneLine: !channel || Math.abs((chip.top + chip.bottom) / 2 - (channel.top + channel.bottom) / 2) < 2 };
  }, card(at));
  check('phone: the caption is the place and channel on one line, then the title on at most two lines, nothing under it', caption.lines >= 1 && caption.lines <= 2 && caption.parts.join(' ') === 'feed-line feed-title' && caption.oneLine, JSON.stringify(caption));

  // A card left teaches the feed: it is judged and kept (mok-feed-v2), the model learns, and the
  // cards after the one on screen are planned again.
  const firstVideo = await page.getAttribute(`${card(at)} .feed-card`, 'data-video-id');
  const plannedBefore = await page.$$eval('.feed-page', pages => pages.map(p => p.querySelector('.feed-card')?.dataset.videoId ?? p.dataset.kind).join(' '));
  await page.waitForTimeout(1500);
  await feedTo(page, at + 1);
  await page.waitForFunction(id => (JSON.parse(localStorage.getItem('mok-feed-v2') || 'null')?.seen ?? []).includes(id), firstVideo, { timeout: 8000 }).catch(() => {});
  const learned = await feedMemory(page);
  const plannedAfter = await page.$$eval('.feed-page', pages => pages.map(p => p.querySelector('.feed-card')?.dataset.videoId ?? p.dataset.kind).join(' '));
  check('phone: a card left is learned from (kept in mok-feed-v2: judged, the model one impression on)', learned?.version === 2 && learned.seen.includes(firstVideo) && learned.model.clock >= 1 && Object.keys(learned.model.stats).length > 3, JSON.stringify({ seen: learned?.seen, clock: learned?.model.clock }));
  const lanes = await page.$$eval('.feed-page[data-kind="video"]', pages => pages.map(p => p.dataset.lane));
  check('phone: and the cards after the one on screen are planned again, by fit or to explore', plannedAfter.split(' ').slice(0, at + 2).join(' ') === plannedBefore.split(' ').slice(0, at + 2).join(' ') && lanes.every(lane => ['fit', 'explore', 'asked'].includes(lane)), `${plannedBefore.split(' ').length} → ${plannedAfter.split(' ').length} cards · ${lanes.join(' ')}`);

  // YouTube only: every card a video, a checkpoint every eighth, and no MoK reel (they have the Reels tab).
  await feedTo(page, at + 2);
  await feedTo(page, at + 3);
  await feedTo(page, at + 4);
  const kinds = await page.$$eval('.feed-page', pages => pages.map(p => p.dataset.kind));
  check('phone: Watch is YouTube only: videos and checkpoints, no MoK reel', kinds.length >= 8 && kinds.every((kind, i) => kind === ((i + 1) % 8 === 0 ? 'checkpoint' : 'video')) && !(await page.$('.feed .reel')), kinds.join(' '));
  await page.waitForTimeout(900);
  await feedShot(page, 'feed-2-youtube-only');

  // Save: the sheet suggests the two or three places it fits, its own first and already chosen;
  // a second is one tap, a search finds any other, and Save keeps it in the Library under them.
  const next = kinds.findIndex((kind, i) => i > at + 4 && kind === 'video');
  await feedTo(page, next);
  const savedId = await page.getAttribute(`${card(next)} .feed-card`, 'data-video-id');
  const ownPlace = await page.getAttribute(`${card(next)} [data-action="feed-place"]`, 'data-node-id');
  await page.click(`${card(next)} [data-action="feed-save"]`);
  await page.waitForSelector('[data-save-sheet="new"]');
  await page.waitForTimeout(400);
  await feedShot(page, 'feed-6-save-sheet');
  const offered = await page.$$eval('[data-save-sheet] [data-action="save-place"]', els => els.map(el => ({ id: el.dataset.nodeId, on: el.getAttribute('aria-pressed') === 'true' })));
  check('phone: Save suggests 2–3 places it fits, its own first and already chosen', offered.length >= 2 && offered.length <= 3 && offered[0].id === ownPlace && offered[0].on && offered.slice(1).every(item => !item.on), JSON.stringify(offered));
  check('phone: the Save sheet has no explainer text', (await page.textContent('[data-save-sheet]')).replace(/\s+/g, ' ').length < 400 && !(await page.$('[data-save-sheet] p')));
  await page.fill('[data-save-sheet] [data-action="save-search"]', 'evol');
  const searched = await page.waitForSelector('[data-save-sheet] [data-action="save-found"]', { timeout: 3000 }).then(() => true, () => false);
  check('phone: the Save sheet finds any other place by name', searched && (await page.getAttribute('[data-save-sheet] [data-action="save-found"] >> nth=0', 'data-node-id')) === 'knowledge.science.biology.evolution');
  await page.fill('[data-save-sheet] [data-action="save-search"]', '');
  await page.click(`[data-save-sheet] [data-action="save-place"][data-node-id="${offered[1].id}"]`);
  await page.click('[data-save-sheet] [data-action="save-confirm"]');
  await page.waitForSelector('[data-save-sheet]', { state: 'detached' });
  const savedLink = await page.evaluate(id => (JSON.parse(localStorage.getItem('mok-library-v1') || 'null')?.links ?? []).find(link => link.url.includes(`watch?v=${id}`) && !link.removedAt), savedId);
  check('phone: Save keeps it in the Library under the chosen places', !!savedLink && savedLink.nodeId === ownPlace && JSON.stringify(savedLink.places) === JSON.stringify([offered[1].id]) && (await page.getAttribute(`${card(next)} [data-action="feed-save"]`, 'aria-pressed')) === 'true', JSON.stringify(savedLink));
  const secondPlace = offered[1].id;

  // The checkpoint: the session on the map and one offer.
  await feedTo(page, 7);
  await page.waitForSelector('.toast', { state: 'detached', timeout: 8000 }).catch(() => {});
  check('phone: the eighth card is a checkpoint', (await page.getAttribute(card(7), 'data-kind')) === 'checkpoint');
  await page.waitForTimeout(900);
  const places = (await page.getAttribute(`${card(7)} .feed-map`, 'data-session-places')).split(' ').filter(Boolean);
  const offer = await page.getAttribute(`${card(7)} .feed-checkpoint`, 'data-checkpoint');
  check('phone: the checkpoint maps the places this session touched', places.length >= 3, places.join(', '));
  check('phone: the checkpoint makes one offer: a new case or what stuck', (offer === 'case' && await page.isVisible(`${card(7)} [data-action="checkpoint-case"]`)) || (offer === 'stuck' && await page.isVisible(`${card(7)} [data-action="checkpoint-stuck"]`)), offer);
  check('phone: no counts, likes or streaks on the checkpoint', !/\d/.test((await page.textContent(`${card(7)} .feed-offer`)) ?? ''));
  await feedShot(page, 'feed-3-checkpoint');

  // The place chip flies the atlas there.
  await feedTo(page, 8);
  const chipCard = (await page.getAttribute(card(8), 'data-kind')) === 'video' ? 8 : 9;
  if (chipCard === 9) await feedTo(page, 9);
  const place = await page.getAttribute(`${card(chipCard)} [data-action="feed-place"]`, 'data-node-id');
  await page.click(`${card(chipCard)} [data-action="feed-place"]`);
  await page.waitForTimeout(450);
  await feedShot(page, 'feed-4a-place-chip-flying');
  await settledAt(page, place);
  await page.waitForTimeout(700);
  check('phone: the place chip flies the atlas to the video’s place', (await state(page)).location.id === place, place);
  check('phone: the player is out of sight (and paused) once Explore is', await page.evaluate(() => { const layer = document.querySelector('.feed-player-layer'); return !layer || getComputedStyle(layer).visibility === 'hidden'; }));
  await feedShot(page, 'feed-4-place-chip-on-the-map');

  // Watching never colors land.
  const after = await state(page);
  check('phone: watching colors nothing on the map', after.expeditions.earnedIds.length === 0 && after.demo.completedIds.length === 0 && after.expeditions.runs.length === 0 && after.checks.events === 0);

  // Explored by watching, on the Atlas: a screenshot-only concept (never shipped).
  await page.click('[data-action="brand-home"]');
  await settledAt(page, 'knowledge');
  await page.waitForTimeout(1200);
  const seen = places.length ? places : [place];
  await page.evaluate(async list => { const m = await import('/src/feed/dev/exploredPreview.ts'); window.__hideExplored = m.showExploredByWatching(list); }, seen);
  await page.waitForTimeout(300);
  await feedShot(page, 'feed-8-explored-by-watching-concept');
  await page.evaluate(() => window.__hideExplored());

  // The saved video leads the Watch row of each place it was saved under, marked.
  await page.goto(`${URL}/#/hub/${secondPlace}`);
  await page.waitForSelector('[data-hub-section="watch"] [data-action="hub-watch"]', { timeout: 15000 });
  const lead = await page.$eval('[data-hub-section="watch"] [data-action="hub-watch"]', el => ({ id: el.dataset.videoId, saved: el.dataset.saved === 'true', mark: !!el.querySelector('.watch-card-saved') }));
  check('phone: a saved video leads the Watch row of a place it was saved under, marked', lead.id === savedId && lead.saved && lead.mark, JSON.stringify(lead));
  await page.evaluate(() => document.querySelector('[data-hub-section="watch"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  await feedShot(page, 'feed-7-saved-on-hub');
  // A hub's Watch row opens the feed at that video, playing at once.
  const hubPlace = place.split('.').slice(0, 3).join('.');
  await page.goto(`${URL}/#/hub/${hubPlace}`);
  await page.waitForSelector('[data-hub-section="watch"] [data-action="hub-watch"]', { timeout: 15000 });
  await page.evaluate(() => document.querySelector('[data-hub-section="watch"]').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-hub-section="watch"] img')].slice(0, 2).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await feedShot(page, 'feed-5-hub-watch-row');
  check('phone: no sideways scroll on the hub with its Watch row', await noSideScroll(page));
  const wanted = await page.getAttribute('[data-hub-section="watch"] [data-action="hub-watch"] >> nth=1', 'data-video-id');
  await page.click('[data-hub-section="watch"] [data-action="hub-watch"] >> nth=1');
  await page.waitForSelector(`.explore-workspace:not(.is-hidden) ${card(0)} .feed-card[data-video-id="${wanted}"]`, { timeout: 15000 });
  check('phone: a hub’s Watch row opens the feed at that video', (await feedIndex(page)) === 0 && (await page.getAttribute(card(0), 'data-lane')) === 'asked');
  const startedAt = Date.now();
  const startedNow = await page.waitForFunction(() => document.querySelector('.feed')?.dataset.visible === '0' && document.querySelector('.feed-pager').scrollTop === 0 && !!document.querySelector('.feed-player-layer[data-for="0"] .feed-player.is-shown'), null, { timeout: 15000 }).then(() => true, () => false);
  check('phone: and that video starts playing at once, on screen', startedNow, `${Date.now() - startedAt} ms`);
  check('phone: Watch without console errors', session.errors.length === 0, session.errors.join(' | '));
  await session.context.close();
}

// Sound: on by default, one preference for Watch and Reels, and it stays on through everything a
// learner does. After each transition, read from the page: the YouTube player's own isMuted() (the
// IFrame API, YT.get) is false, at volume, playing the card on screen; the narration element is
// playing, unmuted, at volume. Runs under iOS's media rule (iosMediaRule). Where the browser wants a
// first tap for the player (WebKit does, as iOS Safari), it gets exactly one, on "Tap for sound";
// after that no transition may ask again. A reload is a new page: it may ask once more, and keeps
// the learner's choice.
{
  const session = await open('phone', null, { ios: true });
  const { page } = session;
  const soundShot = name => page.screenshot({ path: path.resolve('output/soundtabs', `${name}.png`) });
  const playerSound = () => page.evaluate(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); const player = frame && window.YT?.get?.(frame.id); return player?.isMuted ? { muted: player.isMuted(), volume: player.getVolume(), state: player.getPlayerState(), video: frame.dataset.player } : null; });
  const heard = () => page.waitForFunction(() => {
    const frame = document.querySelector('.feed-player-layer iframe.feed-player'), player = frame && window.YT?.get?.(frame.id);
    return !!player?.isMuted && player.isMuted() === false && player.getVolume() > 0 && player.getPlayerState() === 1 && document.querySelector('.feed-player-layer')?.dataset.for === document.querySelector('.feed')?.dataset.visible;
  }, null, { timeout: 25000 }).then(() => true, () => false);
  const narrated = () => page.waitForFunction(() => window.__mokMedia.some(el => /\/(narration|decks)\/.+\.mp3/.test(el.src) && !el.paused && !el.muted && el.volume > 0 && el.currentTime > 0.2), null, { timeout: 25000 }).then(() => true, () => false);
  const onWatch = async name => check(`sound: ${name}: YouTube unmuted and playing (isMuted() false)`, await heard(), JSON.stringify(await playerSound()));
  const onReels = async name => check(`sound: ${name}: the narration plays, unmuted`, await narrated());
  const settled = () => page.waitForFunction(() => { const v = document.querySelector('.feed')?.dataset.visible; return !!document.querySelector(`.feed-player-layer[data-for="${v}"] .feed-player.is-shown`); }, null, { timeout: 30000 }).catch(() => {});
  // A reel plays the moment it is on screen: nothing to tap.
  const startReel = async () => { const i = await visibleIndex(page); await reelPlaying(page, i); };
  try {
    await openExplore(session, 'feed');
    check('sound: on by default, with nothing saved', (await state(page)).explore.sound.on === true && (await page.evaluate(() => localStorage.getItem('mok-sound-v1'))) === null);
    await settled();
    // The first video: heard at once, or asked for with one clear tap. YouTube may start unmuted and
    // fall back to muted a moment later, and the player's own honesty check takes two seconds: let
    // both settle before deciding which.
    await page.waitForTimeout(4000);
    let asked = false;
    if ((await page.getAttribute('.feed', 'data-sound')) === 'asking' || !(await heard())) {
      const at = await feedIndex(page);
      asked = (await page.getAttribute(`${card(at)} [data-action="feed-sound"]`, 'aria-label')) === 'Tap for sound' && (await page.getAttribute('.feed', 'data-sound')) === 'asking';
      await soundShot('watch-tap-for-sound');
      check('sound: where the browser wants a first tap, the button says "Tap for sound"', asked);
      await page.click(`${card(at)} [data-action="feed-sound"]`);
    }
    await onWatch(asked ? 'one tap on "Tap for sound"' : 'Watch opens');
    await page.waitForTimeout(1200);
    await soundShot('watch-sound-on');
    // From here on nothing may ask again.
    await page.evaluate(() => { window.__asked = 0; const feed = document.querySelector('.feed'); new MutationObserver(() => { if (feed.dataset.sound === 'asking') window.__asked++; }).observe(feed, { attributes: true, attributeFilter: ['data-sound'] }); });

    for (let i = 1; i <= 11; i++) { await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTo({ top: i * pager.clientHeight, behavior: 'smooth' }); }, i); await page.waitForTimeout(260); }
    await settled();
    await onWatch('eleven fast swipes');

    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    await startReel();
    await onReels('Reels, playing at once (no tap on the reel)');
    await page.waitForTimeout(1500);
    await soundShot('reels-sound-on');
    await page.click('[data-action="explore-feed"]');
    await settled();
    await onWatch('Watch → Reels → Watch');

    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    await page.evaluate(() => { const pager = document.querySelector('.reel-pager'); pager.scrollTop += pager.clientHeight; });
    await page.waitForTimeout(900);
    await startReel();
    await onReels('the next reel, on another visit to Reels');

    await page.click('[data-action="explore-list"]');
    await page.waitForSelector('[data-learnable-kind="expedition"] [data-action="discoveries-open"]');
    await page.waitForTimeout(1200);
    await soundShot('expeditions');
    await page.click('[data-learnable-kind="expedition"] [data-action="discoveries-open"]');
    await page.waitForSelector('.expedition-shell');
    await page.waitForTimeout(2000);
    await page.click('[data-action="expedition-exit"]');
    await page.waitForSelector('.expedition-shell', { state: 'detached' });
    await page.click('[data-action="explore-feed"]');
    await settled();
    await onWatch('an expedition, and back');

    await page.click('.studio-mobile-nav [aria-label="Open library"]');
    await page.waitForTimeout(2500);
    await page.click('[data-action="open-explore-mobile"]');
    await settled();
    await onWatch('the Library, and back');

    await setVisibility(page, 'hidden');
    await page.waitForTimeout(3000);
    await setVisibility(page, 'visible');
    await settled();
    await onWatch('the page hidden, then shown');

    // A Short plays to its end, and the feed moves on by itself (to a Short with a video after it, not
    // a checkpoint: the next check listens for the next video). Cards more than three ahead are not
    // drawn yet, so when none of the drawn ones is such a Short, walk on a card at a time until one is.
    const nextShort = () => page.evaluate(() => { const v = Number(document.querySelector('.feed').dataset.visible); const pages = [...document.querySelectorAll('.feed-page')]; const next = pages.find(p => Number(p.dataset.page) > v && p.querySelector('.feed-video.is-tall') && pages.find(q => Number(q.dataset.page) === Number(p.dataset.page) + 1)?.dataset.kind === 'video'); return next ? Number(next.dataset.page) : -1; });
    let short = await nextShort();
    for (let step = 0; short < 0 && step < 8; step++) { await feedTo(page, (await feedIndex(page)) + 1); short = await nextShort(); }
    if (short > 0) { await feedTo(page, short); await settled(); await heard(); }
    const from = await feedIndex(page);
    // Once the player knows the new video's length (it reports it a moment after it starts), jump to
    // its last second and a half; YouTube sometimes ignores a seek far ahead, so ask again until it lands.
    await page.waitForFunction(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); const player = window.YT.get(frame.id); return player.getDuration() > 3 && player.getCurrentTime() > 0.5; }, null, { timeout: 15000 }).catch(() => {});
    let moved = false;
    for (let attempt = 0; attempt < 4 && !moved; attempt++) {
      await page.evaluate(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); const player = window.YT.get(frame.id); const duration = player.getDuration(); if (player.getCurrentTime() < duration - 4) player.seekTo(Math.max(1, duration - 1.5), true); });
      moved = await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) > i, from, { timeout: 7000 }).then(() => true, () => false);
    }
    await settled();
    check('sound: a Short that ends moves the feed on by itself', short > 0 && moved, `${short > 0 ? 'Short at ' + short : 'no Short drawn'}: ${from} → ${await feedIndex(page)}`);
    await onWatch('a Short ended and the next video started');
    const asks = await page.evaluate(() => window.__asked);
    check('sound: no transition asked for another tap', asks === 0, `${asks} times`);
    check('sound: every reel spoke through one narration element', (await page.evaluate(() => window.__mokMedia.filter(el => el instanceof HTMLAudioElement && !el.loop).length)) === 1);

    // The sound button: off, kept across a reload; on again with one tap.
    await page.click(`${card(await feedIndex(page))} [data-action="feed-sound"]`);
    await page.waitForTimeout(1000);
    const off = await playerSound();
    check('sound: the sound button turns it off (the player muted)', off?.muted === true && (await state(page)).explore.sound.on === false, JSON.stringify(off));
    await soundShot('watch-sound-off');
    await page.reload();
    await page.waitForFunction(() => !!window.render_game_to_text);
    await openExplore(session, 'feed');
    await settled();
    await page.waitForTimeout(1500);
    const kept = await playerSound();
    check('sound: off stays off after a reload', (await state(page)).explore.sound.on === false && kept?.muted === true && (await page.getAttribute(`${card(await feedIndex(page))} [data-action="feed-sound"]`, 'aria-label')) === 'Turn sound on', JSON.stringify(kept));
    await page.click(`${card(await feedIndex(page))} [data-action="feed-sound"]`);
    await onWatch('turned back on with one tap');
    check('sound: on is remembered', (await soundSaved(page)) === true);

    // A reload with sound on: heard at once, or after exactly one tap anywhere.
    await page.reload();
    await page.waitForFunction(() => !!window.render_game_to_text);
    await openExplore(session, 'feed');
    await settled();
    await page.waitForTimeout(4000);
    let again = (await page.getAttribute('.feed', 'data-sound')) !== 'asking' && await heard();
    if (!again) {
      const at = await feedIndex(page);
      check('sound: after a reload the button asks: "Tap for sound"', (await page.getAttribute(`${card(at)} [data-action="feed-sound"]`, 'aria-label')) === 'Tap for sound');
      // A tap where the title is (the caption lets it through to the tap layer under it).
      const title = await page.locator(`${card(at)} .feed-title`).boundingBox();
      await page.mouse.click(title.x + Math.min(40, title.width / 2), title.y + title.height / 2);
      again = await heard();
    }
    check('sound: after a reload, heard at once or after one tap anywhere', again, JSON.stringify(await playerSound()));
    check('sound: no console errors', session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check('sound', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// Recovery: YouTube unreachable as Watch first opens (its API script, or its player page), then
// reachable again. Without a reload, leaving Watch and coming back must find a video playing: the
// player that never got going is replaced by one fresh player, and no video is marked broken for a
// network failure. Then a learner's own pause, moments after a new video starts, stays a pause and
// never reads as the browser refusing sound ("Tap for sound").
for (const mode of ['api', 'embed']) {
  const session = await open('phone');
  const { page, context } = session;
  let blocked = true;
  await context.route(mode === 'api' ? /youtube\.com\/(iframe_api|s\/player)/ : /youtube-nocookie\.com\/embed/, route => blocked ? route.abort('internetdisconnected') : route.continue());
  // The card on screen: YouTube's own player playing it, shown.
  const playingNow = (timeout = 45000) => page.waitForFunction(() => {
    const layer = document.querySelector('.feed-player-layer'), frame = layer?.querySelector('iframe.feed-player.is-shown'), player = frame && window.YT?.get?.(frame.id);
    try { return layer.dataset.for === document.querySelector('.feed')?.dataset.visible && player.getVideoData().video_id === layer.dataset.videoId && player.getPlayerState() === 1 && player.getCurrentTime() > 0.05; } catch { return false; }
  }, null, { timeout, polling: 50 }).then(() => true, () => false);
  const ytState = () => page.evaluate(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); const player = frame && window.YT?.get?.(frame.id); try { return { state: player.getPlayerState(), muted: player.isMuted(), sound: document.querySelector('.feed')?.dataset.sound }; } catch { return { state: null, sound: document.querySelector('.feed')?.dataset.sound }; } });
  try {
    await page.click('[data-action="open-explore-mobile"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card', { timeout: 30000 });
    await page.waitForTimeout(6000);
    const brokenWhileDown = (await feedMemory(page))?.broken ?? [];
    blocked = false;
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    await page.waitForTimeout(2000);
    await page.click('[data-action="explore-feed"]');
    const back = await playingNow();
    check(`recovery (${mode} blocked): Watch plays again once YouTube is reachable, without a reload`, back, JSON.stringify(await ytState()));
    check(`recovery (${mode} blocked): a network failure marks no video broken`, brokenWhileDown.length === 0 && ((await feedMemory(page))?.broken ?? []).length === 0, brokenWhileDown.join(', '));
    check(`recovery (${mode} blocked): still exactly one player`, (await page.$$('iframe')).length === 1 && (await page.$$('iframe.feed-player')).length === 1);
    // Under Watch's full-screen overlay the player built in place of the stuck one is laid out like
    // the first: it covers the screen's width (and a Short its height too), shows no YouTube controls,
    // takes no touches, and sits under the clear tap layer.
    if (back && await page.evaluate(() => document.querySelector('.feed').classList.contains('is-overlay'))) {
      const fit = await page.evaluate(() => {
        const frame = document.querySelector('.feed-player-layer iframe.feed-player'), layer = frame.closest('.feed-player-layer');
        const r = frame.getBoundingClientRect(), l = layer.getBoundingClientRect(), src = new URL(frame.src).searchParams, tall = layer.classList.contains('is-tall');
        const tap = document.elementsFromPoint(l.left + l.width / 2, l.top + l.height / 2)[0];
        return { rebuilt: src.get('autoplay') === '0', controls: src.get('controls'), touches: getComputedStyle(frame).pointerEvents, tall, tap: tap?.className ?? null,
          covers: r.left <= l.left + 0.5 && r.right >= l.right - 0.5 && (!tall || (r.top <= l.top + 0.5 && r.bottom >= l.bottom - 0.5)) && l.width >= innerWidth - 0.5, box: [r.left, r.top, r.width, r.height].map(Math.round) };
      });
      check(`recovery (${mode} blocked): the rebuilt player is full screen like the first, no YouTube controls, under the tap layer`, fit.rebuilt && fit.covers && fit.controls === '0' && fit.touches === 'none' && fit.tap === 'feed-tap', JSON.stringify(fit));
    }
    // A new player may want its own first tap where the browser asks for one (WebKit, as iOS Safari).
    if (mode === 'api' && back && (await page.getAttribute('.feed', 'data-sound')) === 'asking') { await page.click(`${card(await feedIndex(page))} [data-action="feed-sound"]`); await page.waitForTimeout(800); }
    for (const delay of mode === 'api' && back ? [500, 1000] : []) {
      const next = await page.evaluate(() => { const v = Number(document.querySelector('.feed').dataset.visible); const page = [...document.querySelectorAll('.feed-page[data-kind="video"]')].find(p => Number(p.dataset.page) > v); return page ? Number(page.dataset.page) : -1; });
      await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTo({ top: i * pager.clientHeight, behavior: 'smooth' }); }, next);
      await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) === i, next);
      const started = await playingNow(30000);
      await page.waitForTimeout(delay);
      // The same pause YouTube's own pause button makes.
      await page.evaluate(() => { const frame = document.querySelector('.feed-player-layer iframe.feed-player'); window.YT.get(frame.id).pauseVideo(); });
      await page.waitForTimeout(4000);
      const after = await ytState();
      check(`pause: paused ${delay} ms after a new video starts, it stays paused and sound stays on`, started && after.state === 2 && after.sound === 'on', JSON.stringify(after));
    }
    check(`recovery (${mode} blocked): no console errors`, session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check(`recovery (${mode} blocked)`, false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// The network, and the end of a video. Watch never sits silent behind "Sound on", never asks "Tap for
// sound" where nothing is refusing it, and is heard again with no touch:
//   - the network drops on a swipe and comes back, with Watch on screen and while away on Reels;
//   - a long video that ends on screen waits behind its poster and Reels' play mark, and one tap replays it;
//   - a long video that has ended, left for Reels and come back to, starts again;
//   - a Short that ends as the learner leaves: back on Watch, the feed moves on;
//   - a Short that YouTube loops back to its start instead of ending: the feed moves on.
// Runs under iOS's media rule; where the browser wants a first tap it gets it before anything counts.
{
  const session = await open('phone', null, { ios: true });
  const { page, context } = session;
  const heardNow = (timeout = 25000) => page.waitForFunction(() => {
    const layer = document.querySelector('.feed-player-layer'), player = window.YT?.get?.(layer?.querySelector('iframe.feed-player')?.id);
    try { return player.isMuted() === false && player.getVolume() > 0 && player.getPlayerState() === 1 && layer.dataset.for === document.querySelector('.feed')?.dataset.visible && player.getVideoData().video_id === layer.dataset.videoId; } catch { return false; }
  }, null, { timeout, polling: 100 }).then(() => true, () => false);
  const ytNow = () => page.evaluate(() => { const feed = document.querySelector('.feed'), player = window.YT?.get?.(document.querySelector('.feed-player-layer iframe.feed-player')?.id); try { return { visible: feed.dataset.visible, sound: feed.dataset.sound, state: player.getPlayerState(), muted: player.isMuted(), time: +player.getCurrentTime().toFixed(1), duration: +player.getDuration().toFixed(1) }; } catch { return { visible: feed?.dataset.visible, sound: feed?.dataset.sound }; } });
  const asks = () => page.evaluate(() => window.__asked);
  const nextCard = selector => page.evaluate(selector => { const v = Number(document.querySelector('.feed').dataset.visible); const next = [...document.querySelectorAll('.feed-page')].find(p => Number(p.dataset.page) > v && p.querySelector(selector)); return next ? Number(next.dataset.page) : -1; }, selector);
  const toCard = async index => { await page.evaluate(i => { const pager = document.querySelector('.feed-pager'); pager.scrollTop = i * pager.clientHeight; }, index); await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) === i, index); };
  // The next card of a kind: cards far ahead are not drawn yet, so walk on a video at a time until one is.
  const findCard = async selector => {
    for (let step = 0; step < 12; step++) {
      const found = await nextCard(selector);
      if (found > 0) return found;
      const ahead = await nextCard('.feed-video');
      if (ahead < 0) return -1;
      await toCard(ahead);
      await page.waitForTimeout(600);
    }
    return -1;
  };
  const toReels = async () => { await page.click('[data-action="explore-reels"]'); await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed'); };
  // The playing video to its last moment, and on to its end (YouTube sometimes ignores a seek far ahead:
  // ask again). Its end is ENDED, or, in the sessions where YouTube loops Shorts and never says ENDED,
  // the player back at the start from its last seconds (the feed holds a looped Short there).
  const toTheEnd = async () => {
    await page.waitForFunction(() => { const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); return player.getDuration() > 3 && player.getCurrentTime() > 0.3; }, null, { timeout: 20000 }).catch(() => {});
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.evaluate(() => { window.__tail = false; const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); const duration = player.getDuration(); if (player.getCurrentTime() < duration - 4) player.seekTo(Math.max(1, duration - 1.2), true); });
      if (await page.waitForFunction(() => {
        const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id), time = player.getCurrentTime(), duration = player.getDuration();
        if (duration > 0 && time >= duration - 3) window.__tail = true;
        return player.getPlayerState() === 0 || (window.__tail && time < 3);
      }, null, { timeout: 8000, polling: 50 }).then(() => true, () => false)) return true;
    }
    return false;
  };
  try {
    await openExplore(session, 'feed');
    // Heard, or asking for the first tap: then one tap on "Tap for sound".
    await page.waitForFunction(() => document.querySelector('.feed')?.dataset.sound === 'asking' || window.YT?.get?.(document.querySelector('.feed-player-layer iframe.feed-player.is-shown')?.id)?.isMuted?.() === false, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    if ((await page.getAttribute('.feed', 'data-sound')) === 'asking') await page.click(`${card(await feedIndex(page))} [data-action="feed-sound"]`);
    check('network: Watch heard to begin with', await heardNow());
    await page.evaluate(() => { window.__asked = 0; const feed = document.querySelector('.feed'); new MutationObserver(() => { if (feed.dataset.sound === 'asking') window.__asked++; }).observe(feed, { attributes: true, attributeFilter: ['data-sound'] }); });

    await context.setOffline(true);
    await toCard(await nextCard('.feed-video'));
    await page.waitForTimeout(8000);
    await context.setOffline(false);
    check('network: dropped on a swipe and back, the card plays with sound by itself', await heardNow(15000), JSON.stringify(await ytNow()));
    await context.setOffline(true);
    await toCard(await nextCard('.feed-video'));
    await page.waitForTimeout(6000);
    await toReels();
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    await page.click('[data-action="explore-feed"]');
    check('network: dropped on a swipe, back while on Reels: Watch plays with sound on return', await heardNow(15000), JSON.stringify(await ytNow()));
    await page.waitForTimeout(3000);
    check('network: no drop asked "Tap for sound" or marked a video broken', (await asks()) === 0 && ((await feedMemory(page))?.broken ?? []).length === 0, `${await asks()} asks`);

    // A long video, from a hub's Watch row (the feed itself is mostly Shorts).
    let wide = -1;
    for (const hub of ['knowledge.science.biology.evolution', 'knowledge.science.biology', 'knowledge.science.physics']) {
      await page.evaluate(place => { location.hash = `#/hub/${place}`; }, hub);
      if (!(await page.waitForSelector('[data-hub-section="watch"] [data-action="hub-watch"]', { timeout: 15000 }).then(() => true, () => false))) continue;
      const button = await page.$('[data-hub-section="watch"] [data-action="hub-watch"].is-wide');
      if (!button) continue;
      const id = await button.getAttribute('data-video-id');
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.waitForSelector(`.explore-workspace:not(.is-hidden) ${card(0)} .feed-card[data-video-id="${id}"]`, { timeout: 20000 });
      wide = 0;
      break;
    }
    await heardNow();
    // Ended on screen: YouTube's end screen (its replay button, related videos) is never seen, its
    // frame transparent over the poster and Reels' play mark; one tap plays it from the top, heard.
    const endedOnScreen = await toTheEnd();
    await page.waitForTimeout(1000);
    const atEnd = await page.evaluate(() => ({ opacity: getComputedStyle(document.querySelector('.feed-player-layer iframe.feed-player')).opacity, label: document.querySelector('.feed-tap')?.getAttribute('aria-label'), mark: !!document.querySelector('.feed-player-layer .reel-paused') }));
    check('ending: a long video that ends on screen: YouTube\'s end screen unseen, Reels\' play mark, "Replay"', wide === 0 && endedOnScreen && atEnd.opacity === '0' && atEnd.mark && atEnd.label === 'Replay', JSON.stringify(atEnd));
    await page.click('.feed-tap');
    check('ending: …one tap plays it from the top, heard', await heardNow(8000) && (await ytNow()).time < 8, JSON.stringify(await ytNow()));
    const endedWide = await toTheEnd();
    await page.waitForTimeout(1000);
    await toReels();
    await page.waitForTimeout(1500);
    await page.click('[data-action="explore-feed"]');
    check('ending: a long video that ended, left and come back to, starts again with sound', wide === 0 && endedWide && await heardNow(4500) && (await feedIndex(page)) === wide, JSON.stringify(await ytNow()));
    await page.waitForTimeout(3000);

    const short = await findCard('.feed-video.is-tall');
    await toCard(short);
    await heardNow();
    const endedShort = await toTheEnd();
    await toReels(); // within the moment the feed waits before moving on from a Short
    await page.waitForTimeout(1500);
    await page.click('[data-action="explore-feed"]');
    const movedOn = await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) > i, short, { timeout: 5000 }).then(() => true, () => false);
    check('ending: a Short that ends as the learner leaves: back on Watch, the feed moves on', short > 0 && endedShort && movedOn, `${short} → ${await feedIndex(page)}`);
    check('ending: …and the next video is heard', await heardNow(), JSON.stringify(await ytNow()));

    // In some sessions YouTube loops a Short instead of ending it: from its last seconds it jumps back to
    // the start and plays on, and never says ENDED. The feed takes that for the end and moves on all the
    // same. Done here as YouTube does it, so every run checks it: into the last seconds, then the start.
    const looping = await findCard('.feed-video.is-tall');
    await toCard(looping);
    await heardNow();
    const nearEnd = () => page.evaluate(() => { const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); player.seekTo(player.getDuration() - 2.5, true); });
    await page.waitForFunction(() => { const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); return player.getDuration() > 9 && player.getCurrentTime() > 0.3; }, null, { timeout: 20000 }).catch(() => {});
    let inTail = false;
    for (let attempt = 0; attempt < 4 && !inTail; attempt++) {
      await nearEnd();
      inTail = await page.waitForFunction(() => { const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); return player.getPlayerState() === 1 && player.getCurrentTime() >= player.getDuration() - 2.8; }, null, { timeout: 6000, polling: 50 }).then(() => true, () => false);
    }
    await page.waitForTimeout(250);
    await page.evaluate(() => window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id).seekTo(0, true));
    const movedOnLoop = await page.waitForFunction(i => Number(document.querySelector('.feed')?.dataset.visible) > i, looping, { timeout: 8000 }).then(() => true, () => false);
    check('ending: a Short YouTube loops instead of ending (back to its start from its last seconds): the feed moves on', looping > 0 && inTail && movedOnLoop, `${looping} → ${await feedIndex(page)}`);
    check('network and endings: never asked "Tap for sound"', (await asks()) === 0, `${await asks()} times`);
    // Loads that fail while the network is deliberately down are not the app's errors (each engine words it its own way).
    const errors = session.errors.filter(error => !/ERR_INTERNET_DISCONNECTED|WebKit encountered an internal error/.test(error));
    check('network and endings: no console errors', errors.length === 0, errors.join(' | '));
  } catch (error) {
    check('network and endings', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// YouTube's API script slow (8 s), and Watch left before its player was ready: the player starts by
// itself before the API can steer it, and must not play on aloud behind Reels. Back on Watch, it plays.
{
  const session = await open('phone');
  const { page, context } = session;
  await context.route(/youtube\.com\/(iframe_api|s\/player\/.*www-widgetapi)/, async route => { await new Promise(resolve => setTimeout(resolve, 8000)); await route.continue().catch(() => {}); });
  try {
    await page.click('[data-action="open-explore-mobile"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card', { timeout: 30000 });
    await page.waitForSelector('.feed-player-layer iframe', { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.click('[data-action="explore-reels"]');
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    let aloud = 0;
    for (let k = 0; k < 24; k++) {
      const frame = page.frames().find(f => /youtube(-nocookie)?\.com\/embed/.test(f.url()));
      const video = frame && await frame.evaluate(() => { const v = document.querySelector('video'); return v && { paused: v.paused, muted: v.muted }; }).catch(() => null);
      if (video && !video.paused && !video.muted) aloud++;
      await page.waitForTimeout(500);
    }
    check('slow API: Watch left before its player was ready, the player never plays aloud out of sight', aloud <= 1, `${aloud} half-seconds aloud`);
    await page.click('[data-action="explore-feed"]');
    const plays = await page.waitForFunction(() => { const layer = document.querySelector('.feed-player-layer'), player = window.YT?.get?.(layer?.querySelector('iframe.feed-player.is-shown')?.id); try { return layer.dataset.for === document.querySelector('.feed')?.dataset.visible && player.getPlayerState() === 1; } catch { return false; } }, null, { timeout: 30000 }).then(() => true, () => false);
    check('slow API: back on Watch, it plays', plays);
    // Including inside YouTube's own page: a command sent before its player is up throws there.
    check('slow API: no console or page errors', session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check('slow API', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// The full-screen tap layer and the sound (WATCH_OVERLAY), under iOS's media rule. Where the browser
// asks for a first tap, a tap on the video is that tap: sound back, remembered, and the video keeps
// playing (never paused by the same tap). After that a tap pauses, and the pause stays a pause with
// sound still on (never taken for a refusal); the next tap plays it again, heard.
{
  const session = await open('phone', null, { ios: true });
  const { page } = session;
  const yt = () => page.evaluate(() => { const feed = document.querySelector('.feed'), player = window.YT?.get?.(document.querySelector('.feed-player-layer iframe.feed-player')?.id); try { return { sound: feed.dataset.sound, state: player.getPlayerState(), muted: player.isMuted(), label: document.querySelector('.feed-tap')?.getAttribute('aria-label'), held: !!document.querySelector('.feed-player-layer .reel-paused') }; } catch { return { sound: feed?.dataset.sound }; } });
  const heardNow = (timeout = 15000) => page.waitForFunction(() => {
    const layer = document.querySelector('.feed-player-layer'), player = window.YT?.get?.(layer?.querySelector('iframe.feed-player')?.id);
    try { return player.isMuted() === false && player.getVolume() > 0 && player.getPlayerState() === 1 && layer.dataset.for === document.querySelector('.feed')?.dataset.visible; } catch { return false; }
  }, null, { timeout, polling: 100 }).then(() => true, () => false);
  try {
    await openExplore(session, 'feed');
    if (!(await page.evaluate(() => document.querySelector('.feed').classList.contains('is-overlay')))) console.log('  (Watch\'s overlay is off: no tap layer to check)');
    else {
      await page.waitForSelector('.feed-player-layer iframe.feed-player.is-shown', { timeout: 30000 }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('.feed')?.dataset.sound === 'asking', null, { timeout: 12000 }).catch(() => {});
      const before = await yt();
      if (before.sound === 'asking') {
        check('tap layer: while sound is refused it says "Tap for sound"', before.label === 'Tap for sound', JSON.stringify(before));
        await page.click('.feed-tap');
        const heard = await heardNow();
        await page.waitForTimeout(1500);
        const after = await yt();
        check('tap layer: a tap on the video while refused brings sound back and it keeps playing (not paused)', heard && after.state === 1 && !after.held && after.label === 'Pause', JSON.stringify(after));
        check('tap layer: …and the sound is remembered', (await soundSaved(page)) === true);
      } else check('tap layer: under iOS\'s media rule the browser asks for a first tap', false, JSON.stringify(before));
      await page.evaluate(() => { window.__asked = 0; const feed = document.querySelector('.feed'); new MutationObserver(() => { if (feed.dataset.sound === 'asking') window.__asked++; }).observe(feed, { attributes: true, attributeFilter: ['data-sound'] }); });
      await page.click('.feed-tap');
      const paused = await page.waitForFunction(() => window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id).getPlayerState() === 2, null, { timeout: 8000 }).then(() => true, () => false);
      await page.waitForTimeout(4000);
      const still = await yt();
      check('tap layer: a tap pauses, and the pause stays a pause with sound on', paused && still.state === 2 && still.held && still.label === 'Play' && still.sound === 'on', JSON.stringify(still));
      await page.click('.feed-tap');
      check('tap layer: the next tap plays it again, heard', await heardNow(), JSON.stringify(await yt()));
      // The caption lets taps through to the tap layer under it, as Reels' does (only its chip is a button).
      const title = await page.evaluate(() => { const r = document.querySelector(`.feed-page[data-page="${document.querySelector('.feed').dataset.visible}"] .feed-title`).getBoundingClientRect(); const x = r.left + Math.min(40, r.width / 2), y = r.top + r.height / 2; return { x, y, hit: document.elementFromPoint(x, y)?.className }; });
      await page.mouse.click(title.x, title.y);
      const captionPaused = await page.waitForFunction(() => window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id).getPlayerState() === 2, null, { timeout: 8000 }).then(() => true, () => false);
      check('tap layer: a tap on the caption pauses too, as on Reels', title.hit === 'feed-tap' && captionPaused && (await yt()).held, JSON.stringify({ title, ...(await yt()) }));
      await page.mouse.click(title.x, title.y);
      check('tap layer: …and the next one on it plays, heard', await heardNow(), JSON.stringify(await yt()));
      check('tap layer: no tap asked for sound again', (await page.evaluate(() => window.__asked)) === 0);
    }
    check('tap layer: no console errors', session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check('tap layer', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// A tap on Watch's video before it has started (its poster still up) is not a pause: the video starts,
// with no paused mark, heard (after "Tap for sound" where the browser wants that tap), under iOS's media rule.
{
  const session = await open('phone', null, { ios: true });
  const { page } = session;
  const yt = () => page.evaluate(() => { const feed = document.querySelector('.feed'), player = window.YT?.get?.(document.querySelector('.feed-player-layer iframe.feed-player')?.id); try { return { sound: feed.dataset.sound, state: player.getPlayerState(), muted: player.isMuted(), label: document.querySelector('.feed-tap')?.getAttribute('aria-label'), held: !!document.querySelector('.feed-player-layer .reel-paused') }; } catch { return { sound: feed?.dataset.sound, held: !!document.querySelector('.feed-player-layer .reel-paused') }; } });
  try {
    await page.click('[data-action="open-explore-mobile"]');
    const early = await page.waitForFunction(() => { const layer = document.querySelector('.feed-player-layer'); return !!layer?.querySelector('.feed-tap') && !layer.querySelector('iframe.feed-player.is-shown') && getComputedStyle(layer).visibility !== 'hidden'; }, null, { timeout: 30000, polling: 20 }).then(() => true, () => false);
    if (!early) console.log('  (Watch\'s overlay is off, or its video started before a tap could land: nothing to check)');
    else {
      await page.click('.feed-tap');
      const starts = await page.waitForFunction(() => { try { return window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id).getPlayerState() === 1; } catch { return false; } }, null, { timeout: 20000, polling: 100 }).then(() => true, () => false);
      await page.waitForTimeout(1500);
      const after = await yt();
      check('early tap: a tap on the video before it starts is not a pause: it starts, no paused mark', starts && after.state === 1 && !after.held && after.label !== 'Play', JSON.stringify(after));
      if (after.sound === 'asking') await page.click('.feed-tap');
      const heard = await page.waitForFunction(() => { try { const player = window.YT.get(document.querySelector('.feed-player-layer iframe.feed-player').id); return player.isMuted() === false && player.getVolume() > 0 && player.getPlayerState() === 1; } catch { return false; } }, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
      check('early tap: …and it is heard', heard, JSON.stringify(await yt()));
    }
    check('early tap: no console errors', session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check('early tap', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// Desktop: a 9:16 column over the starfield, with its own way between reels.
{
  const session = await open('desktop');
  const { page } = session;
  await openExplore(session);
  await page.waitForSelector(`${reel(0)} [data-reel-part="prediction"]`);
  check('desktop: the first reel plays at once', await reelPlaying(page, 0));
  await page.waitForTimeout(800);
  const box = await page.evaluate(() => { const r = document.querySelector('.reel-feed').getBoundingClientRect(); return { w: r.width, h: r.height, stars: !!document.querySelector('.explore-workspace .deep-space-backdrop') }; });
  check('desktop: the feed is a centered 9:16 column over the starfield', Math.abs(box.w / box.h - 9 / 16) < 0.01 && box.stars, `${Math.round(box.w)}×${Math.round(box.h)}`);
  await shot(page, 'desktop-1-feed');
  await guess(page, 0, 'half');
  await waitFrame(page, 0, 3);
  await page.waitForTimeout(1500);
  await shot(page, 'desktop-2-story');
  await page.click('[data-action="reel-next"]');
  await page.waitForTimeout(1200);
  check('desktop: the next button moves to the next reel', (await visibleIndex(page)) === 1);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1200);
  check('desktop: the arrow keys move between reels', (await visibleIndex(page)) === 2);
  await shot(page, 'desktop-3-next-reel');
  check('desktop: no sideways scroll', await noSideScroll(page));
  await page.click('[data-action="explore-feed"]');
  await page.waitForSelector('.explore-feed:not([hidden]) .feed[data-feed="ready"] .feed-page[data-page="0"] .feed-card');
  await page.waitForTimeout(1500);
  const column = await page.evaluate(() => { const r = document.querySelector('.feed').getBoundingClientRect(); return { w: r.width, h: r.height }; });
  check('desktop: Watch is the same 9:16 column', Math.abs(column.w / column.h - 9 / 16) < 0.01, `${Math.round(column.w)}×${Math.round(column.h)}`);
  await page.click('[data-action="feed-next"]');
  await page.waitForTimeout(1200);
  check('desktop: the next button moves Watch along', Number(await page.getAttribute('.feed', 'data-visible')) === 1);
  await page.screenshot({ path: path.resolve('output/feed/desktop-watch.png') });
  await page.click('[data-action="explore-list"]');
  await page.waitForTimeout(900);
  await shot(page, 'desktop-4-expeditions');
  await page.goto(`${URL}/#/hub/knowledge.science.biology.evolution`);
  await page.waitForSelector('[data-hub-section="reels"]');
  await page.evaluate(() => document.querySelector('[data-hub-section="reels"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(800);
  check(`desktop: the Evolution hub shows all ${EVOLUTION_REELS} of its reels`, (await page.$$('[data-reel-cards="hub"] .reel-card')).length === EVOLUTION_REELS);
  await shot(page, 'desktop-5-hub-reels');
  check('desktop: no sideways scroll on the hub', await noSideScroll(page));
  check('desktop: no console errors', session.errors.length === 0, session.errors.join(' | '));
  await session.context.close();
}

// Frame timings swing on a loaded machine: a failing measurement is taken once more before it counts.
async function measuredTwice(run) {
  const first = await run();
  if (first.every(result => result.pass)) return first;
  console.log('  (frame timings missed once; measuring again)');
  return run();
}

// Smoothness on a slow phone: frame times at 4× CPU slowdown while a reel plays and while swiping.
// (CPU throttling is a Chromium DevTools feature: WebKit runs skip these two sections.)
if (ENGINE !== 'chromium') console.log('SKIP  smoothness at 4× CPU slowdown: Chromium only (no CPU throttling in WebKit)');
else for (const result of await measuredTwice(async () => {
  const session = await open('phone');
  const { page, context } = session;
  await openExplore(session);
  await page.waitForTimeout(3500); // the first two reels load
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = async (action, ms) => {
    await page.evaluate(() => { window.__frames = []; window.__stop = false; let last = performance.now(); const tick = now => { window.__frames.push(now - last); last = now; if (!window.__stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await action();
    await page.waitForTimeout(ms);
    const list = await page.evaluate(() => { window.__stop = true; return window.__frames.slice(2); });
    list.sort((a, b) => a - b);
    return { p95: list[Math.floor(0.95 * (list.length - 1))], long: list.filter(t => t > 50).length };
  };
  // The reel is already playing; a guess tapped on its way (a re-render) is part of what is measured.
  const playing = await frames(() => page.click(`${reel(0)} [data-action="reel-predict"] >> nth=0`, { timeout: 2000 }).catch(() => {}), 8000);
  const swipe = (to) => () => page.evaluate(page => { const pager = document.querySelector('.reel-pager'); pager.scrollTo({ top: page * pager.clientHeight, behavior: 'smooth' }); }, to);
  const first = await frames(swipe(1), 2500);
  const second = await frames(swipe(2), 2500);
  const worst = Math.max(playing.p95, first.p95, second.p95);
  const long = playing.long + first.long + second.long;
  await session.context.close();
  return [{ name: 'phone: smooth at 4× CPU slowdown while playing and swiping (p95 frame under 20 ms, no frame over 50 ms)', pass: worst < 20 && long === 0, detail: `p95 ${worst.toFixed(1)} ms, ${long} long frames` }];
})) check(result.name, result.pass, result.detail);

// The same on Watch, at 4× CPU slowdown: frames while a YouTube video plays, and frames during each
// swipe until it settles. After a swipe settles, the one player is handed the next video; YouTube's
// own script then works for a moment on a still card (its poster showing), which is reported apart.
if (ENGINE !== 'chromium') console.log('SKIP  Watch smoothness at 4× CPU slowdown: Chromium only (no CPU throttling in WebKit)');
else for (const result of await measuredTwice(async () => {
  const session = await open('phone');
  const { page, context } = session;
  await openExplore(session, 'feed');
  const from = await playing(page);
  await page.waitForTimeout(2500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const stats = list => { const sorted = [...list].sort((a, b) => a - b); return { p95: sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0, long: list.filter(t => t > 50).length, worst: sorted.at(-1) ?? 0 }; };
  const watching = stats(await page.evaluate(() => new Promise(resolve => { const out = []; let last = performance.now(); const start = last; const tick = now => { out.push(now - last); last = now; if (now - start < 5000) requestAnimationFrame(tick); else resolve(out.slice(2)); }; requestAnimationFrame(tick); })));
  // One swipe: frames until the pager rests on the next card, then the 2 s after.
  const swipe = to => page.evaluate(to => new Promise(resolve => {
    const pager = document.querySelector('.feed-pager');
    const target = to * pager.clientHeight;
    const during = [], after = [];
    let last = performance.now(), settledAt = 0, still = 0;
    const start = last;
    const tick = now => {
      (settledAt ? after : during).push(now - last);
      last = now;
      if (!settledAt) { still = Math.abs(pager.scrollTop - target) < 1 ? still + 1 : 0; if (still >= 2) settledAt = now; }
      if (settledAt ? now - settledAt < 2000 : now - start < 4000) requestAnimationFrame(tick); else resolve({ during: during.slice(1), after });
    };
    pager.scrollTo({ top: target, behavior: 'smooth' });
    requestAnimationFrame(tick);
  }), to);
  const first = await swipe(from + 1);
  const second = await swipe(from + 2);
  const moving = stats([...first.during, ...second.during]);
  const settling = stats([...first.after, ...second.after]);
  await session.context.close();
  return [
    { name: 'phone: Watch is smooth at 4× CPU slowdown while a video plays (p95 frame under 20 ms, no frame over 50 ms)', pass: watching.p95 < 20 && watching.long === 0, detail: `p95 ${watching.p95.toFixed(1)} ms, ${watching.long} long frames` },
    { name: 'phone: Watch is smooth at 4× CPU slowdown through every swipe (p95 frame under 20 ms, no frame over 50 ms)', pass: moving.p95 < 20 && moving.long === 0, detail: `p95 ${moving.p95.toFixed(1)} ms, ${moving.long} long frames` },
    { name: 'phone: after a swipe settles, the next video starts without a visible stall (p95 under 20 ms, no frame over 200 ms)', pass: settling.p95 < 20 && settling.worst < 200, detail: `p95 ${settling.p95.toFixed(1)} ms, ${settling.long} frames over 50 ms, worst ${settling.worst.toFixed(0)} ms` },
  ];
})) check(result.name, result.pass, result.detail);

// Dated decks: each day's set, then the rest of the Reels tab, expiry, the end card's hub fallback,
// and a hub reel outside the set.
const scrollTo = (page, index) => page.evaluate(i => { const pager = document.querySelector('.reel-pager'); pager.scrollTop = i * pager.clientHeight; }, index);
// To the very end of the Reels tab: earlier decks' reels join as it nears its end, so keep going until it stops growing.
const reelsToEnd = async page => {
  let length = -1;
  for (let i = 0; i < 8; i++) {
    const now = (await state(page)).explore.feed.length;
    if (now === length && await page.isVisible('.reel-page--end .reel-finale')) break;
    length = now;
    await page.evaluate(() => { const pager = document.querySelector('.reel-pager'); pager.scrollTop = pager.scrollHeight; });
    await page.waitForTimeout(1500);
  }
  return length;
};
for (const date of DATED) {
  const session = await open('phone', null, { decks: true, day: date, youtube: false });
  const { page } = session;
  try {
    await openExplore(session);
    await page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
    const s = await state(page);
    const want = feedFor(decks[date], date);
    const rest = DECK.filter(id => !want.includes(id));
    check(`dated ${date}: Reels starts with that day's set (${decks[date].reels.length} new reels, ${decks[date].evergreen.length} evergreen, one after every two)`, s.explore.deck === date && JSON.stringify(s.explore.today) === JSON.stringify(want) && JSON.stringify(s.explore.feed.slice(0, want.length)) === JSON.stringify(want), `${s.explore.deck} · ${s.explore.feed?.length} reels`);
    check(`dated ${date}: then goes on with the ${rest.length} evergreen reels not in it`, JSON.stringify(s.explore.feed.slice(want.length, want.length + rest.length)) === JSON.stringify(rest));
    check(`dated ${date}: it opens on the day's strongest new reel`, s.explore.reelId === decks[date].reels[0].id);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `phone-dated-${date}-1-prediction.png`) });
    check(`dated ${date}: no sideways scroll`, await noSideScroll(page));
    // Past today's set: no end page there, the evergreen deck carries on; the end comes after everything.
    await scrollTo(page, want.length);
    await page.waitForFunction(i => Number(document.querySelector('.reel-feed')?.dataset.reelIndex) === i, want.length, { timeout: 15000 });
    await page.waitForTimeout(600);
    check(`dated ${date}: after today's set the next reel is an evergreen one, not an end page`, (await state(page)).explore.reelId === rest[0] && await page.isVisible(`${reel(want.length)} .reel`));
    const total = await reelsToEnd(page);
    const earlierLive = DATED.filter(d => d < date).flatMap(d => decks[d].reels.filter(r => live(r, date)).map(r => r.id));
    check(`dated ${date}: Reels ends only after every reel (${total}: the day's set, the evergreen deck, ${earlierLive.length} from earlier decks), quietly`, total === want.length + rest.length + earlierLive.length && (await page.textContent('.reel-page--end h2'))?.trim() === 'That’s every reel for now.' && await page.isVisible('[data-action="reels-end-atlas"]'), `${total} reels`);
    // A reel on a place with nothing to prove yet offers that place's hub instead of a case.
    const hubReel = decks[date].reels.find(r => !r.packId);
    if (hubReel) {
      const index = want.indexOf(hubReel.id);
      await scrollTo(page, index);
      await page.waitForFunction(i => Number(document.querySelector('.reel-feed')?.dataset.reelIndex) === i, index, { timeout: 15000 });
      await reelPlaying(page, index);
      await guess(page, index, 0);
      await waitEnd(page, index);
      await page.waitForTimeout(800);
      const label = (await page.textContent(`${reel(index)} [data-action="reel-hub"]`))?.trim();
      check(`dated ${date}: a reel on ${hubReel.nodeId.split('.').pop()} ends on "${label}", not "Try a new case"`, /^Open /.test(label ?? '') && !(await page.isVisible(`${reel(index)} [data-action="prove-it"]`)));
      if (date === DATED[0]) await page.screenshot({ path: path.join(OUT, 'phone-dated-hub-end-card.png') });
      await page.click(`${reel(index)} [data-action="reel-hub"]`);
      await page.waitForFunction(node => location.hash === `#/hub/${encodeURIComponent(node)}`, hubReel.nodeId, { timeout: 15000 });
      check(`dated ${date}: that button opens the place's hub`, await page.waitForSelector('.hub-page', { state: 'visible', timeout: 10000 }).then(() => true, () => false));
    }
    // A reel with a case at its place still offers the case.
    const caseReel = decks[date].reels.find(r => r.packId);
    if (caseReel) {
      await page.goto(`${URL}/?day=${date}`);
      await page.waitForFunction(() => !!window.render_game_to_text);
      await openExplore(session);
      const index = want.indexOf(caseReel.id);
      await scrollTo(page, index);
      await page.waitForFunction(i => Number(document.querySelector('.reel-feed')?.dataset.reelIndex) === i, index, { timeout: 15000 });
      await reelPlaying(page, index);
      await waitEnd(page, index);
      check(`dated ${date}: a reel on ${caseReel.nodeId.split('.').pop()} still ends on "Try a new case"`, (await page.textContent(`${reel(index)} [data-action="prove-it"]`))?.trim() === 'Try a new case');
    }
    // A hub's evergreen reel that is not in today's set opens where it sits in the Reels tab.
    await page.goto(`${URL}/?day=${date}#/hub/knowledge.science.biology.evolution.new-species`);
    await page.waitForSelector('[data-hub-section="reels"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-reel-cards="hub"] [data-reel-id]').length >= 3, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => document.querySelector('[data-hub-section="reels"]').scrollIntoView({ block: 'center' }));
    const outside = await page.evaluate(feed => [...document.querySelectorAll('[data-reel-cards="hub"] [data-reel-id]')].map(el => el.dataset.reelId).find(id => !feed.includes(id)), want);
    if (outside) {
      await page.click(`[data-reel-cards="hub"] [data-reel-id="${outside}"]`);
      await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
      await page.waitForTimeout(900);
      const after = await state(page);
      check(`dated ${date}: a hub reel outside today's set opens where it sits in the Reels tab`, after.explore.reelId === outside && after.explore.feed.indexOf(outside) === after.explore.reelIndex && after.explore.feed.indexOf(outside) >= want.length && (await visibleIndex(page)) === after.explore.reelIndex);
    }
    check(`dated ${date}: no console errors`, session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check(`dated ${date}`, false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// Expiry: a day with no deck borrows the latest earlier one, without its date-bound reels.
{
  const last = DATED.at(-1);
  const next = new Date(`${last}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const day = next.toISOString().slice(0, 10);
  const session = await open('phone', null, { decks: true, day, youtube: false });
  const { page } = session;
  await openExplore(session);
  await page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
  const s = await state(page);
  const expired = decks[last].reels.filter(r => !live(r, day)).map(r => r.id);
  const kept = decks[last].reels.filter(r => live(r, day)).map(r => r.id);
  check(`expiry: on ${day} (no deck) the feed borrows ${last}'s deck and drops its ${expired.length} date-bound reels`, s.explore.deck === last && expired.length > 0 && expired.every(id => !s.explore.feed.includes(id)) && kept.every(id => s.explore.feed.includes(id)), `${s.explore.feed.length} reels`);
  await session.context.close();
  // With no deck in reach at all, the evergreen deck alone.
  const far = await open('phone', null, { decks: true, day: '2027-03-01', youtube: false });
  await openExplore(far);
  await far.page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
  const f = await state(far.page);
  check('expiry: a day with no deck in the past week falls back to the evergreen deck', f.explore.deck === null && JSON.stringify(f.explore.feed) === JSON.stringify(DECK));
  check('expiry: no console errors', session.errors.length === 0 && far.errors.length === 0, [...session.errors, ...far.errors].join(' | '));
  await far.context.close();
}

// A reel from a dated deck, saved: it keeps its own copy, so once the deck has moved on it is still on
// the place it was saved to and in the Library, and it still plays.
{
  const date = DATED[0];
  const session = await open('phone', null, { decks: true, day: date, youtube: false });
  const { page } = session;
  try {
    await openExplore(session);
    await page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
    const first = (await state(page)).explore.reelId;
    await page.click(`${reel(0)} [data-action="reel-save"]`);
    await page.waitForSelector('[data-save-sheet]');
    const place = await page.getAttribute('[data-save-sheet] [data-action="save-place"][aria-pressed="true"]', 'data-node-id');
    await page.click('[data-save-sheet] [data-action="save-confirm"]');
    await page.waitForSelector('[data-save-sheet]', { state: 'detached' });
    check('saved dated reel: it is a reel from that day\'s deck', decks[date].reels.some(r => r.id === first), first);
    await page.goto(`${URL}/?day=2027-03-01#/hub/${encodeURIComponent(place)}`);
    await page.waitForFunction(() => !!window.render_game_to_text);
    await page.waitForSelector('[data-reel-cards="hub"]', { timeout: 15000 }).catch(() => {});
    const later = await state(page);
    check('saved dated reel: months later (no deck in reach) it leads the reel row of the place it was saved to', !later.explore.feed?.includes(first) && (await page.getAttribute('[data-reel-cards="hub"] li:first-child .reel-card', 'data-reel-id').catch(() => null)) === first);
    await page.click(`[data-reel-cards="hub"] [data-reel-id="${first}"]`);
    await page.waitForSelector('.explore-workspace:not(.is-hidden) .reel-feed');
    check('saved dated reel: and opens in Reels, playing', (await state(page)).explore.reelId === first && await reelPlaying(page, await visibleIndex(page)));
    await page.click('[data-action="open-notebook-mobile"]');
    await page.waitForSelector('[data-workspace="notebook"]');
    check('saved dated reel: the Library keeps it', await page.waitForSelector(`[data-workspace="notebook"] [data-reel-id="${first}"]`, { timeout: 10000 }).then(() => true, () => false));
    check('saved dated reel: no console errors', session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check('saved dated reel', false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// Watch on a dated day is still YouTube only: the day's reels are on the Reels tab.
{
  const date = DATED[0];
  const session = await open('phone', { version: 1, pinned: [], watched: DECK }, { decks: true, day: date });
  const { page } = session;
  try {
    await openExplore(session, 'feed');
    const s = await state(page);
    await feedTo(page, 1);
    await feedTo(page, 2);
    const kinds = await page.$$eval('.feed-page', pages => pages.map(p => p.dataset.kind));
    check(`dated ${date}: Watch opens with the day's set loaded, and stays YouTube only`, s.explore.tab === 'feed' && s.explore.deck === date && kinds.length >= 8 && !kinds.includes('reel') && !(await page.$('.feed .reel')), kinds.join(' '));
    check(`dated ${date}: Watch without console errors`, session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check(`dated ${date}: Watch`, false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// The Reels tab past today's set: with every evergreen reel and the whole of the day's set already
// watched, it opens on earlier decks' reels still live, then ends.
{
  const last = [...DATED].sort().at(-1);
  const earlier = DATED.filter(date => date < last).sort().reverse().flatMap(date => decks[date].reels.filter(r => live(r, last)).map(r => r.id));
  const today = feedFor(decks[last], last);
  const session = await open('phone', { version: 1, pinned: [], watched: [...DECK, ...today] }, { decks: true, day: last, youtube: false });
  const { page } = session;
  try {
    await openExplore(session);
    await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()).explore; return s.reelId && !s.watched.includes(s.reelId); }, null, { timeout: 15000 }).catch(() => {});
    const s = await state(page);
    check(`Reels past today's set (${last}): it opens on an earlier deck's reel, not one already watched`, earlier.length > 0 && s.explore.reelId === earlier[0] && JSON.stringify(s.explore.feed.slice(-earlier.length)) === JSON.stringify(earlier), `${s.explore.reelId} · ${s.explore.feed.length} reels`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.resolve('output/soundtabs/reels-earlier-deck.png') });
    check(`Reels past today's set (${last}): no console errors`, session.errors.length === 0, session.errors.join(' | '));
  } catch (error) {
    check(`Reels past today's set (${last})`, false, error.message.split('\n')[0]);
  } finally {
    await session.context.close();
  }
}

// Every reel, start to finish, at phone size (in parallel batches; each runs on its narration's clock).
// Ten at a time: every session now also passes through Watch, and a dev server under load cannot
// answer 37 first page loads at once.
if (!process.env.MOK_EXPLORE_SKIP_ALL) {
  const playReel = async (id, index) => {
    let session;
    try {
      session = await open('phone', { version: 1, pinned: [], watched: DECK.slice(0, index) }, { youtube: false });
      const { page } = session;
      await openExplore(session);
      // It plays the moment Reels opens on it; a guess is picked while its question floats there.
      const started = Date.now();
      check(`all reels: ${id} opens where the feed should`, (await visibleIndex(page)) === index);
      const picked = await guess(page, index, -1);
      const frames = narration.reels[id].frames.length;
      await waitFrame(page, index, frames - 1);
      const sawGuess = !picked || await page.isVisible(`${reel(index)} [data-reel-part="guess"]`);
      await waitEnd(page, index);
      const seconds = (Date.now() - started) / 1000;
      const expected = narration.reels[id].duration;
      check(`all reels: ${id} plays at once → ${frames} frames → end card${picked ? ', the guess recalled' : ''}`, sawGuess && Math.abs(seconds - expected) < 4, `${seconds.toFixed(1)} s of ${expected.toFixed(1)} s`);
      check(`all reels: ${id} without console errors`, session.errors.length === 0, session.errors.join(' | '));
    } catch (error) {
      check(`all reels: ${id}`, false, error.message.split('\n')[0]);
    } finally {
      await session?.context.close();
    }
  };
  for (let i = 0; i < DECK.length; i += 10) { await freshBrowser(); await Promise.all(DECK.slice(i, i + 10).map((id, k) => playReel(id, i + k))); }
}

// Every engine reel in every dated deck, start to finish (opened by scrolling to it in its day's set).
if (!process.env.MOK_EXPLORE_SKIP_ALL) {
  const jobs = DATED.flatMap(date => decks[date].reels.map(r => ({ date, r, index: feedFor(decks[date], date).indexOf(r.id) })));
  for (let i = 0; i < jobs.length; i += 8) {
    await freshBrowser();
    await Promise.all(jobs.slice(i, i + 8).map(async ({ date, r, index }) => {
      let session;
      try {
        session = await open('phone', null, { decks: true, day: date, youtube: false });
        const { page } = session;
        await openExplore(session);
        await page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
        await scrollTo(page, index);
        await page.waitForFunction(i => Number(document.querySelector('.reel-feed')?.dataset.reelIndex) === i, index, { timeout: 15000 });
        await page.waitForSelector(`${reel(index)} .reel[data-reel-id="${r.id}"][data-phase="story"]`);
        const started = Date.now();
        const picked = await guess(page, index, -1);
        await waitFrame(page, index, r.frames.length - 1);
        const sawGuess = !picked || await page.isVisible(`${reel(index)} [data-reel-part="guess"]`);
        await waitEnd(page, index);
        const seconds = (Date.now() - started) / 1000;
        check(`dated reels: ${r.id} plays at once → ${r.frames.length} frames → end card${picked ? ', the guess recalled' : ''}`, sawGuess && Math.abs(seconds - r.narration.duration) < 4, `${seconds.toFixed(1)} s of ${r.narration.duration.toFixed(1)} s`);
        check(`dated reels: ${r.id} without console errors`, session.errors.length === 0, session.errors.join(' | '));
      } catch (error) {
        check(`dated reels: ${r.id}`, false, error.message.split('\n')[0]);
      } finally {
        await session?.context.close();
      }
    }));
  }
  // The narration of a dated reel is its own file under its deck.
  await freshBrowser();
  const session = await open('phone', null, { decks: true, day: DATED[0], youtube: false });
  await openExplore(session);
  await session.page.waitForSelector(`${reel(0)} .reel[data-phase="story"]`);
  await session.page.waitForTimeout(1800);
  const first = decks[DATED[0]].reels[0];
  const playing = await session.page.evaluate(src => window.__mokMedia.some(el => el.src.endsWith(src) && !el.paused && !el.muted && el.currentTime > 0.3), first.narration.src);
  check('dated reels: a reel plays its own narration from its deck as it starts, with sound', playing && session.audio.some(line => line.includes(`${first.id}.mp3`)), session.audio.join(', '));
  await session.context.close();
}

await browser.close();

// One contact sheet of the key phone screens.
const sheet = ['phone-1-feed-prediction', 'phone-2-story', 'phone-3-reveal', 'phone-4-end-card', 'phone-7-expeditions', 'phone-9-hub-reels', 'phone-8-notebook-pins', 'phone-10-end-of-deck'];
try {
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...sheet.flatMap(name => ['-i', path.join(OUT, `${name}.png`)]), '-filter_complex', `${sheet.map((_, i) => `[${i}]scale=375:-1[s${i}]`).join(';')};${sheet.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${sheet.length}:layout=${sheet.map((_, i) => `${(i % 4) * 387}_${Math.floor(i / 4) * 824}`).join('|')}:fill=0x0b0d16[out]`, '-map', '[out]', path.join(OUT, 'contact-sheet.png')]);
  console.log(`Contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
} catch (error) { check('contact sheet', false, error.message.split('\n')[0]); }

// And one for Watch.
const feedSheet = ['feed-1-video-playing', 'feed-2-youtube-only', 'feed-3-checkpoint', 'feed-4a-place-chip-flying', 'feed-4-place-chip-on-the-map', 'feed-5-hub-watch-row', 'feed-6-save-sheet', 'feed-7-saved-on-hub'];
try {
  const FEED_DIR = path.resolve('output/feed');
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...feedSheet.flatMap(name => ['-i', path.join(FEED_DIR, `${name}.png`)]), '-filter_complex', `${feedSheet.map((_, i) => `[${i}]scale=375:-1[s${i}]`).join(';')};${feedSheet.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${feedSheet.length}:layout=${feedSheet.map((_, i) => `${(i % 4) * 387}_${Math.floor(i / 4) * 824}`).join('|')}:fill=0x0b0d16[out]`, '-map', '[out]', path.join(FEED_DIR, 'contact-sheet.png')]);
  console.log(`Watch contact sheet: ${path.join(FEED_DIR, 'contact-sheet.png')}`);
} catch (error) { check('Watch contact sheet', false, error.message.split('\n')[0]); }

const failed = results.filter(result => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
