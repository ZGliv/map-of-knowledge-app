// Stage 4: drafts → engine reels, then every rule in explore/validate.ts (validateEngineReel).
//   content/reels/<date>/drafts.json  →  content/reels/<date>/reels.json (+ validation.json)
// The drafter writes words and picks media by key; this stage fills in everything mechanical (ids,
// dates, licence fields, credits, the voice's spelling of years) so no drafter can get those wrong.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { addDays, APP_EXPORTS, dayDir, loadTs, logStage, readJson, writeJson } from '../lib.mjs';
import { onDark } from '../commons.mjs';
import { slug } from '../sources/common.mjs';
import { provider } from '../providers/index.mjs';

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const twoDigits = n => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`);

/** A year as it is said aloud: 1707 → "seventeen oh-seven", 1900 → "nineteen hundred", 2005 → "two thousand and five". */
export function sayYear(year) {
  const hi = Math.floor(year / 100), lo = year % 100;
  if (year >= 1000 && year < 1010) return `one thousand and ${ONES[lo]}`;
  if (year >= 2000 && year < 2010) return lo ? `two thousand and ${ONES[lo]}` : 'two thousand';
  if (lo === 0) return `${twoDigits(hi)} hundred`;
  return `${twoDigits(hi)} ${lo < 10 ? `oh-${ONES[lo]}` : twoDigits(lo)}`;
}

/** The caption as the voice should read it: years spelled out ("1707s" too), a few symbols as words.
 * A sentence that began with a year still begins with a capital, so it splits the same way. */
export function speakable(text) {
  // A spoken year that starts a sentence keeps its capital, so the sentence still splits there.
  const atStart = (offset, whole) => offset === 0 || /[.!?…]["”’]?\s+$/.test(whole.slice(0, offset));
  const cap = (words, offset, whole) => (atStart(offset, whole) ? words.charAt(0).toUpperCase() + words.slice(1) : words);
  return text
    .replace(/(?<![\d,.])(1[0-9]{3}|20[0-9]{2})s\b/g, (_, y, offset, whole) => cap(`${sayYear(Number(y)).replace(/y$/, 'ie')}s`, offset, whole))
    .replace(/(?<![\d,.£$€])(1[0-9][0-9][1-9]|1[0-9][1-9]0|1[1-9]00|20[0-9]{2})(?!\d)(?!\s*(km|kilometres|metres|m\b|kg|people|men|women|ships|years|feet|miles|tonnes))/g, (_, y, _unit, offset, whole) => cap(sayYear(Number(y)), offset, whole))
    .replace(/\s?°C\b/g, ' degrees Celsius').replace(/\s?°F\b/g, ' degrees Fahrenheit').replace(/(\d)\s?%/g, '$1 percent');
}

/** True when a frame's spoken version has drifted from its caption: a third of the caption's
 * longer words (numbers and names aside, which `say` respells) are missing from it. */
export function staleSay(text, say) {
  const ws = s => (s.toLowerCase().match(/[a-z]{5,}/g) ?? []);
  const spoken = new Set(ws(say));
  const plain = ws(text.replace(/\b[A-Z][a-zà-ÿ'’-]+/g, ' '));
  if (plain.length < 3) return false;
  return plain.filter(w => !spoken.has(w)).length / plain.length > 0.34;
}

/** One draft → one engine reel, or the reasons it can't be one. Pure.
 * Two corrections a fact-check may need are allowed in a draft: `credit` (per media key, when the
 * Commons fields make a poor attribution) and `place` (when the matcher's place does not fit);
 * `packAt` names the expedition at a corrected place. */
export function assembleReel(draft, story, date, { packAt = () => undefined, vanishes = () => false } = {}) {
  const problems = [];
  if (!story) return { problems: [`draft "${draft.slug ?? draft.title}" names unknown story "${draft.story}"`] };
  const id = `${date}-${slug(draft.slug || draft.title)}`;
  const byKey = new Map(story.media.map(m => [m.key, m]));
  const sourceByKey = new Map(story.sources.map(s => [s.key, s]));
  const used = [...new Set([draft.hero, ...(draft.frames ?? []).map(f => f.media).filter(Boolean)])];
  const media = {};
  for (const key of used) {
    const m = byKey.get(key);
    if (!m) { problems.push(`${id}: uses media "${key}", which is not in the story's list`); continue; }
    const contain = m.mustContain || draft.fit?.[key] === 'contain';
    const alt = String(draft.alt?.[key] ?? '').trim();
    if (!alt) problems.push(`${id}: no alt text for ${key}`);
    media[key] = {
      src: m.src, alt, license: m.license, page: m.page,
      credit: (base => /^CC BY \d/.test(m.license) && !contain && !/\b(cropped|modified)\b/.test(base) ? `${base}, cropped` : base)(String(draft.credit?.[key] ?? m.credit).trim()),
      ...(contain ? { fit: 'contain' } : {}),
      // Dark line art on a transparent background is inked (inverted to light on the reel's colour),
      // which alters it: only for public-domain and CC0 files (the validator refuses the rest).
      ...((draft.tone?.[key] === 'ink' || vanishes(m.page)) && (m.license === 'Public domain' || m.license === 'CC0') ? { tone: 'ink' } : {}),
    };
  }
  const frames = (draft.frames ?? []).map((f, i) => {
    if (f.diagram || !f.media) problems.push(`${id}: frame ${i + 1} has no image (engine reels show their media)`);
    const contain = media[f.media]?.fit === 'contain';
    const say = f.say ?? (speakable(f.text) !== f.text ? speakable(f.text) : undefined);
    // A caption edited after its "say" was written leaves the voice reading the old words.
    if (f.say && staleSay(f.text, f.say)) problems.push(`${id}: frame ${i + 1}'s "say" no longer matches its caption (rewrite or remove it)`);
    return { media: f.media, x: Number(f.x ?? 50), y: Number(f.y ?? 50), zoom: contain ? 1 : Number(f.zoom ?? 1), text: f.text, ...(say && say !== f.text ? { say } : {}), claims: f.claims ?? [] };
  });
  const sources = (draft.claims ?? []).map(c => {
    const src = sourceByKey.get(c.source);
    const cite = src ? src.cite : /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(c.source ?? '') ? c.source : null;
    if (!cite) problems.push(`${id}: claim "${c.id}" cites "${c.source}", which is not one of the story's sources or files`);
    return { id: c.id, claim: c.claim, cite: cite ?? String(c.source), quote: c.quote };
  });
  const dated = story.dateBound || draft.template === 'this-day';
  const reel = {
    id, title: draft.title,
    nodeId: draft.place ?? story.place.node, packId: draft.place ? packAt(draft.place) ?? '' : story.place.pack ?? '',
    hero: draft.hero,
    prediction: { id: `pre:${id}`, prompt: draft.prediction?.prompt ?? '', choices: draft.prediction?.choices ?? [], answer: draft.prediction?.answer, reveal: draft.prediction?.reveal, claims: draft.prediction?.claims ?? [] },
    frames, takeaway: draft.takeaway, media, sources,
    template: draft.template, story: story.id, subject: story.subject ?? story.id, from: date,
    ...(dated ? { expires: story.expires ?? addDays(date, 1) } : {}),
    narration: { src: `explore/decks/${date}/${id}.mp3`, bytes: 0, duration: 0, frames: [] },
  };
  return { reel, problems };
}

/** The validator's context for a day: its pinned texts and its licence snapshots. */
export function dayContext(app, date) {
  const dir = dayDir(date);
  const texts = {};
  for (const name of readdirSync(path.join(dir, 'sources')).filter(n => n.endsWith('.json'))) {
    const record = readJson(path.join(dir, 'sources', name));
    texts[record.id] = record.text;
  }
  return app.engineContext(texts, readJson(path.join(dir, 'media.json'), {}));
}

const NARRATION_ONLY = /narration|story runs/;

export async function assemble(date, { provider: name = 'agent' } = {}) {
  const started = Date.now();
  const dir = dayDir(date);
  const list = readJson(path.join(dir, 'shortlist.json'));
  const brief = readJson(path.join(dir, 'brief.json'));
  if (!list || !brief) throw new Error(`No shortlist or brief for ${date}`);
  const result = await provider(name).draft(brief, { date, dir });
  if (result.status === 'pending') { console.log(result.message); return null; }
  if (result.usage) writeJson(path.join(dir, 'drafts.json'), { ...result.drafts, usage: result.usage });
  const app = await loadTs(APP_EXPORTS, 'reels-assemble');
  const stories = new Map(list.stories.map(s => [s.id, s]));
  // Measure each picture a draft uses once, and pin the result beside its licence snapshot.
  const mediaFile = path.join(dir, 'media.json');
  const snapshots = readJson(mediaFile, {});
  let measured = false;
  for (const draft of result.drafts.reels) {
    const keys = new Set([draft.hero, ...(draft.frames ?? []).map(f => f.media)]);
    for (const m of stories.get(draft.story)?.media ?? []) {
      if (!keys.has(m.key) || !snapshots[m.page] || 'vanishes' in snapshots[m.page]) continue;
      snapshots[m.page].vanishes = (await onDark(m.src)).vanishes;
      measured = true;
    }
  }
  if (measured) writeJson(mediaFile, snapshots);
  const ctx = dayContext(app, date);
  const previous = new Map((readJson(path.join(dir, 'reels.json'), { reels: [] }).reels).map(r => [r.id, r]));
  const reels = [], problems = [];
  for (const draft of result.drafts.reels) {
    const built = assembleReel(draft, stories.get(draft.story), date, { packAt: node => app.EXPEDITIONS.find(e => e.nodeId === node)?.pack.id, vanishes: page => !!snapshots[page]?.vanishes });
    problems.push(...built.problems);
    if (!built.reel) continue;
    // Keep narration already made for unchanged captions (narrate re-checks the hashes).
    const before = previous.get(built.reel.id);
    if (before?.narration?.frames?.length) built.reel.narration = before.narration;
    reels.push(built.reel);
  }
  const errors = [...problems, ...reels.flatMap(reel => app.validateEngineReel(reel, ctx))].filter(e => !NARRATION_ONLY.test(e));
  writeJson(path.join(dir, 'reels.json'), { date, drafter: result.drafts.drafter, assembledAt: new Date().toISOString(), reels });
  writeJson(path.join(dir, 'validation.json'), { date, checkedAt: new Date().toISOString(), errors });
  const minutes = logStage(date, 'assemble', 'script', started, { reels: reels.length, errors: errors.length });
  if (errors.length) { console.log(`${reels.length} reels assembled, ${errors.length} problems (${minutes} min):`); for (const e of errors) console.log(`  ${e}`); }
  else console.log(`${reels.length} reels assembled and valid (narration comes next) (${minutes} min)`);
  return { reels, errors };
}
