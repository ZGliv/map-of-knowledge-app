// validatePlace: every content rule, run the same way on every place, old or new.
//
// It folds together the rules that lived in per-pack tests (evolution-*.test.ts), the reel
// validator (explore/validate.ts), the bank rules (checks/banks.test.ts) and the sim models
// (sims/archetypes.ts), plus the generator's own rules: sources, clean-room text and licence
// snapshots. Each failure names its rule (places/contract.ts PLACE_RULES).

import { mentions, itemText, prepare } from '../checks/banks';
import { drawCheck } from '../checks/draw';
import { checkVariant, numbersIn, variantCount } from '../checks/generators';
import { grade, isOpenResponse } from '../checks/grade';
import { canPass } from '../checks/rule';
import { rightAnswer, wrongAnswer } from '../checks/test-helpers';
import type { CheckItem } from '../checks/types';
import type { Beat, Choice, Pack, SimBeat } from '../expeditions/content/types';
import { gradesOf } from '../expeditions/engine/evidence';
import { makeVariant } from '../expeditions/engine/variants';
import { archetypeOf, checkSimBeat, simAsks } from '../expeditions/sims/archetypes';
import { CASE_ENGINES, CASE_POLICY, caseProblems, caseText } from '../cases/engines';
import type { PlaceCase } from '../cases/types';
import { reflexWins } from '../cases/reflexes';
import type { NarrationManifest } from '../explore/deck';
import { sharesRun, validateReel, type ReelContext } from '../explore/validate';
import { PLACE_SCHEMA, type PlaceBundle, type PlaceRule } from './contract';

export interface PlaceProblem { rule: PlaceRule; message: string }

export interface PlaceContext {
  /** True when the node exists and has no children. */
  isLeaf: (nodeId: string) => boolean;
  nodeName: (nodeId: string) => string | undefined;
  nodeExists: (nodeId: string) => boolean;
  /** The placed expedition for a pack ID (for reels and payoff links). */
  expedition: ReelContext['expedition'];
  /** Every graded check across the edition, so a reel's prequestion can never reuse one. */
  checks: ReelContext['checks'];
  narration: NarrationManifest;
  /** Cached plain-text extracts of Wikipedia sources, by source ID, for the clean-room check. */
  sourceTexts?: Readonly<Record<string, string>>;
  /** Every place in the atlas, so a case is new to the whole atlas, not only to its own place. */
  places?: readonly PlaceBundle[];
}

/** What a learner reads in one place, unit by unit: each beat, reel, check item and case. */
export function placeUnits(p: PlaceBundle): { id: string; text: string; caseId?: string }[] {
  return [
    ...p.pack.beats.map((beat, i) => ({ id: `beat ${i + 1}`, text: [i ? '' : `${p.pack.title}\n${p.pack.question}`, JSON.stringify(beat)].join('\n') })),
    ...p.reels.map(r => ({ id: `reel ${r.id}`, text: [r.title, r.takeaway, r.prediction.prompt, ...r.prediction.choices.map(c => c.label), ...r.frames.map(f => f.text)].join('\n') })),
    ...(p.bank?.items ?? []).map(i => ({ id: `item ${i.id}`, text: [itemText(i), i.explain, i.claim].join('\n') })),
    ...(p.cases ?? []).map(c => ({ id: `case ${c.id}`, text: [caseText(c), c.claim].join('\n'), caseId: c.id })),
  ];
}

const ITEM_RE = /^i_[0-9a-hjkmnp-tv-z]{10}$/;
const CASE_RE = /^c_[0-9a-hjkmnp-tv-z]{10}$/;
const QUIZ = /\b(quiz|quizzes|test|tests|tested|check|checks|question|questions|score|scores|points)\b/i;
const FAMILY_RE = /^f_[0-9a-hjkmnp-tv-z]{10}$/;
const PACK_LICENCE = /^(Public domain|CC0|CC BY( \d\.\d)?|CC BY-SA \d\.\d)$/;
const COMMONS_SRC = /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//;
const COMMONS_PAGE = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/;
const PASSIVE = new Set<Beat['kind']>(['cover', 'documentary', 'footage']);
const INTERACTIVE = new Set<Beat['kind']>(['predict', 'sim', 'order', 'match', 'spot', 'flaw', 'number', 'source', 'dialogue']);
const FAMILY: Partial<Record<Beat['kind'], string>> = {
  predict: 'commit', sim: 'explore', source: 'source', order: 'arrange', match: 'arrange',
  flaw: 'diagnose', spot: 'diagnose', number: 'quantify', documentary: 'story', footage: 'story', dialogue: 'story',
};
const BANNED = /Did you know|\bdelve\b|tapestry|game-chang|\p{Extended_Pictographic}|\b(higher|lower) (animal|form|organism|species)\b/iu;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Every multiple-choice moment in a pack, wherever it lives, with its key. */
export function choiceMoments(pack: Pack): { where: string; choices: Choice[]; answer: string }[] {
  const out: { where: string; choices: Choice[]; answer: string }[] = [];
  pack.beats.forEach((beat, i) => {
    if (beat.kind === 'predict') beat.parts.forEach(part => out.push({ where: `beat ${i + 1} ${beat.gradeId}/${part.id}`, choices: part.choices, answer: part.answer }));
    if (beat.kind === 'source') out.push({ where: `beat ${i + 1} ${beat.gradeId}`, choices: beat.question.choices, answer: beat.question.answer });
    if (beat.kind === 'dialogue') for (const line of beat.script) if ('gradeId' in line) out.push({ where: `beat ${i + 1} ${line.gradeId}`, choices: line.choices, answer: line.answer });
    if (beat.kind === 'sim') for (const ask of simAsks(beat)) if (ask.choices && ask.answer !== undefined) out.push({ where: `beat ${i + 1} ${ask.gradeId}`, choices: ask.choices, answer: ask.answer });
  });
  return out;
}

/** Every media key a beat shows, wherever it is referenced. */
function mediaUses(beat: Beat): { key: string; transformed: boolean }[] {
  const out: { key: string; transformed: boolean }[] = [];
  const add = (key: string | undefined, transformed = false) => { if (key) out.push({ key, transformed }); };
  switch (beat.kind) {
    case 'cover': add(beat.media, true); break;
    case 'documentary': beat.frames.forEach(f => add(f.media, true)); add(beat.score); break;
    case 'footage': add(beat.media); add(beat.poster); break;
    case 'spot': beat.options.forEach(o => add(o.media, true)); break; // spot cards crop to 3:4 (object-fit: cover)
    case 'predict': case 'match': case 'order': add(beat.media); beat.kind === 'predict' && beat.parts.forEach(p => p.choices.forEach(c => add(c.media))); break;
    case 'sim': {
      const p = beat.params as { media?: unknown; figure?: unknown };
      if (typeof p.media === 'string') add(p.media);
      if (p.figure && typeof p.figure === 'object' && 'media' in p.figure) add((p.figure as { media: string }).media);
      break;
    }
    default: break;
  }
  return out;
}

function openResponseBeat(beat: Beat): boolean {
  if (beat.kind === 'order') return beat.items.length >= 5;
  if (beat.kind === 'match') return beat.left.length >= (beat.buckets ? 6 : 5);
  return beat.kind === 'number';
}

function checkPack(b: PlaceBundle, ctx: PlaceContext, fail: (rule: PlaceRule, message: string) => void) {
  const { pack } = b;
  const beats = pack.beats;

  // place.leaf
  if (!ctx.isLeaf(b.nodeId)) fail('place.leaf', `${b.nodeId} is not a terminal atlas leaf`);
  const placed = ctx.expedition(pack.id);
  if (!placed) fail('place.leaf', `pack ${pack.id} is not registered`);
  else if (placed.nodeId !== b.nodeId) fail('place.leaf', `pack ${pack.id} is registered at ${placed.nodeId}, not ${b.nodeId}`);
  if (b.bank.node !== b.nodeId) fail('place.leaf', `bank colors ${b.bank.node}, not ${b.nodeId}`);
  if (b.bank.pack !== pack.id) fail('place.leaf', `bank suggests pack ${b.bank.pack}, not ${pack.id}`);
  if (ctx.nodeName(b.nodeId) !== b.bank.title) fail('place.leaf', `bank title "${b.bank.title}" is not the node’s name "${ctx.nodeName(b.nodeId)}"`);
  for (const reel of b.reels) if (reel.packId !== pack.id || reel.nodeId !== b.nodeId) fail('place.leaf', `reel ${reel.id} points at ${reel.packId} / ${reel.nodeId}`);

  // pack.budget
  if (beats.length < 7 || beats.length > 11) fail('pack.budget', `${beats.length} beats; a pack has 7–11`);
  if (beats[0]?.kind !== 'cover') fail('pack.budget', 'the first beat must be the cover');
  if (beats.at(-1)?.kind !== 'payoff') fail('pack.budget', 'the last beat must be the payoff');
  const grades = gradesOf(pack);
  if (grades.length < 5 || grades.length > 8) fail('pack.budget', `${grades.length} graded moments; a pack has 5–8`);
  if (new Set(grades.map(g => g.gradeId)).size !== grades.length) fail('pack.budget', 'grade IDs repeat');

  // pack.transfer
  const transferBeats = beats.filter(beat => ('transfer' in beat && beat.transfer) || (beat.kind === 'sim' && beat.grades?.some(g => g.transfer)));
  if (grades.filter(g => g.transfer).length < 2) fail('pack.transfer', 'fewer than two transfer checks');
  if (!transferBeats.some(openResponseBeat)) fail('pack.transfer', 'no open-response transfer (an order of 5+, a match of 5+ or a sort of 6+, or a number)');

  // pack.rhythm
  if (beats[1] && !INTERACTIVE.has(beats[1].kind)) fail('pack.rhythm', `beat 2 is a ${beats[1].kind}; the first interaction comes by beat 2`);
  let run = 0;
  beats.forEach((beat, i) => { run = PASSIVE.has(beat.kind) ? run + 1 : 0; if (run > 2) fail('pack.rhythm', `beats ${i - 1}–${i + 1} are three passive beats in a row`); });

  // pack.formats
  if (!beats.some(beat => beat.kind === 'sim')) fail('pack.formats', 'no hands-on sim');
  if (beats.filter(beat => beat.kind === 'documentary').length > 1) fail('pack.formats', 'more than one documentary');
  const families = beats.map(beat => FAMILY[beat.kind]).filter((f): f is string => !!f);
  families.forEach((f, i) => { if (i && f === families[i - 1]) fail('pack.formats', `the ${f} family twice in a row`); });
  for (const f of new Set(families)) if (families.filter(x => x === f).length > 2) fail('pack.formats', `the ${f} family ${families.filter(x => x === f).length} times; at most twice`);

  // pack.prompts
  for (const beat of beats) if ('prompt' in beat && typeof beat.prompt === 'string' && words(beat.prompt) > 60) fail('pack.prompts', `prompt over 60 words: "${beat.prompt.slice(0, 50)}…"`);

  // pack.feedback and pack.keys
  const moments = choiceMoments(pack);
  for (const m of moments) for (const c of m.choices) if (c.id !== m.answer && !c.feedback?.trim()) fail('pack.feedback', `${m.where}: wrong option "${c.id}" has no feedback`);
  if (moments.length >= 3) {
    const positions = moments.map(m => m.choices.findIndex(c => c.id === m.answer));
    if (new Set(positions).size < 2) fail('pack.keys', 'every key sits in the same position');
    if (positions.filter(p => p === 0).length > Math.ceil(moments.length / 3)) fail('pack.keys', 'keys come first too often');
    const longest = moments.filter(m => {
      const key = m.choices.find(c => c.id === m.answer)?.label.length ?? 0;
      return m.choices.every(c => c.id === m.answer || c.label.length < key);
    });
    if (longest.length > Math.max(1, Math.floor(moments.length / 4))) fail('pack.keys', `the key is the longest option in ${longest.map(m => m.where).join(', ')}`);
  }

  // pack.wellFormed and pack.orderLabels
  for (const beat of beats) {
    if (beat.kind === 'order') {
      if ([...beat.answer].sort().join() !== beat.items.map(i => i.id).sort().join()) fail('pack.wellFormed', `${beat.gradeId}: the order key is not exactly its items`);
      for (const item of beat.items) if (/\b1[0-9]{3}\b|\b20[0-9]{2}\b/.test(item.label)) fail('pack.orderLabels', `${beat.gradeId}: "${item.label}" prints a year`);
    }
    if (beat.kind === 'match') {
      if (Object.keys(beat.pairs).sort().join() !== beat.left.map(l => l.id).sort().join()) fail('pack.wellFormed', `${beat.gradeId}: pairs do not cover the left items`);
      for (const r of Object.values(beat.pairs)) if (!beat.right.some(x => x.id === r)) fail('pack.wellFormed', `${beat.gradeId}: pair target "${r}" does not exist`);
    }
    if (beat.kind === 'flaw' && !beat.steps.some(s => s.id === beat.answer)) fail('pack.wellFormed', `${beat.gradeId}: key is not a step`);
    if (beat.kind === 'predict') for (const part of beat.parts) if (!part.choices.some(c => c.id === part.answer)) fail('pack.wellFormed', `${beat.gradeId}/${part.id}: key is not a choice`);
    if (beat.kind === 'spot' && !beat.options.some(o => o.id === beat.answer)) fail('pack.wellFormed', `${beat.gradeId}: key is not an option`);
  }

  // pack.style
  const text = JSON.stringify(beats) + pack.title + pack.question;
  const banned = text.match(BANNED);
  if (banned) fail('pack.style', `uses "${banned[0]}"`);

  // pack.numbers
  for (const beat of beats) if (beat.kind === 'number') {
    try {
      const cases = Array.isArray(beat.params.cases) ? beat.params.cases.length : 1;
      for (let n = 0; n < cases; n++) if (!Number.isFinite(makeVariant(beat.generator, beat.params, n).answer)) fail('pack.numbers', `${beat.gradeId}: case ${n} does not compute`);
      const v = makeVariant(beat.generator, beat.params, 0);
      const shown = v.answer.toLocaleString('en-US');
      const elsewhere = beats.filter(x => x !== beat).map(x => JSON.stringify(x)).join(' ');
      if (elsewhere.includes(` ${shown} `) || elsewhere.includes(`${shown} ${v.unit}`)) fail('pack.numbers', `${beat.gradeId}: its answer ${shown} is printed elsewhere in the pack`);
    } catch (e) { fail('pack.numbers', `${beat.gradeId}: ${(e as Error).message}`); }
  }

  // pack.sims
  for (const beat of beats) if (beat.kind === 'sim') for (const problem of checkSimBeat(beat as SimBeat)) fail('pack.sims', problem);

  // pack.media
  const used = new Map<string, boolean>();
  for (const beat of beats) for (const u of mediaUses(beat)) used.set(u.key, (used.get(u.key) ?? false) || u.transformed);
  for (const key of used.keys()) if (!pack.media[key]) fail('pack.media', `"${key}" is shown but not declared`);
  for (const [key, m] of Object.entries(pack.media)) {
    if (!used.has(key) && !JSON.stringify(beats).includes(`"${key}"`)) fail('pack.media', `"${key}" is declared but never shown`);
    if (!m.license || !PACK_LICENCE.test(m.license)) { fail('pack.media', `"${key}" has licence "${m.license}", not on the allowlist`); continue; }
    if (!COMMONS_SRC.test(m.src)) fail('pack.media', `"${key}" is not served from Wikimedia Commons`);
    if (!COMMONS_PAGE.test(m.page)) fail('pack.media', `"${key}" does not link its Commons file page`);
    if (!m.credit.includes(m.license)) fail('pack.media', `"${key}" credit does not name its licence`);
    if (m.alt.length <= 12) fail('pack.media', `"${key}" has no real alt text`);
    for (const s of m.sources ?? []) if (!/^https:\/\/upload\.wikimedia\.org\//.test(s.src)) fail('pack.media', `"${key}" has an alternate source off Commons`);
    if (m.license.startsWith('CC BY-SA')) {
      if (used.get(key)) fail('pack.media', `"${key}" is ShareAlike but is cropped or zoomed (cover or documentary)`);
      if (m.tone) fail('pack.media', `"${key}" is ShareAlike but ink-filtered`);
    } else if (/^CC BY \d/.test(m.license) && used.get(key) && !/cropped|modified|zoomed/.test(m.credit)) fail('pack.media', `"${key}" is CC BY and cropped or zoomed, so its credit must say so`);
  }

  // pack.provenance
  if (pack.provenance.length < 8) fail('pack.provenance', `${pack.provenance.length} provenance entries; at least 8`);
  for (const p of pack.provenance) if (p.claim.length <= 8 || p.source.length <= 8) fail('pack.provenance', `thin provenance entry "${p.claim.slice(0, 30)}"`);
}

function checkReels(b: PlaceBundle, ctx: PlaceContext, fail: (rule: PlaceRule, message: string) => void) {
  if (b.reels.length < 2 || b.reels.length > 3) fail('reels.count', `${b.reels.length} reels; a place has 2–3`);
  const reelCtx: ReelContext = { nodeExists: ctx.nodeExists, expedition: ctx.expedition, checks: ctx.checks, narration: ctx.narration };
  for (const reel of b.reels) for (const message of validateReel(reel, reelCtx)) fail('reels.valid', message);

  // A reel plays before the check: it must not hand the learner a transfer item's situation.
  const prepared = prepare(b.bank).prepared;
  const transferItems = prepared.filter(e => e.transfer);
  for (const reel of b.reels) {
    const reelText = [reel.title, reel.takeaway, reel.prediction.prompt, ...reel.prediction.choices.map(c => c.label), ...reel.frames.map(f => f.text)].join('\n');
    for (const entry of transferItems) {
      const hit = entry.item.entities.find(entity => mentions(reelText, entity));
      if (hit) fail('reels.noPreteach', `${reel.id} names "${hit}", which transfer item ${entry.item.id} relies on`);
    }
    for (const entry of transferItems) if (sharesRun(reelText, itemText(entry.item))) fail('reels.noPreteach', `${reel.id} shares 8 words in a row with transfer item ${entry.item.id}`);
  }
}

function checkBank(b: PlaceBundle, fail: (rule: PlaceRule, message: string) => void) {
  const { bank, pack } = b;
  // bank.identity
  for (const item of bank.items) {
    if (!ITEM_RE.test(item.id)) fail('bank.identity', `${item.id}: not an opaque item ID`);
    if (!FAMILY_RE.test(item.family)) fail('bank.identity', `${item.id}: family ${item.family} is not an opaque family ID`);
  }
  if (new Set(bank.items.map(i => i.id)).size !== bank.items.length) fail('bank.identity', 'item IDs repeat');
  const graded = gradesOf(pack).map(g => g.gradeId).sort().join();
  if (Object.keys(bank.expeditionFamilies).sort().join() !== graded) fail('bank.identity', 'expeditionFamilies must map exactly the pack’s graded moments');
  const expFamilies = Object.values(bank.expeditionFamilies);
  if (new Set(expFamilies).size !== expFamilies.length) fail('bank.identity', 'two graded moments share a family');
  for (const f of expFamilies) if (!FAMILY_RE.test(f)) fail('bank.identity', `expedition family ${f} is not an opaque ID`);
  const counts = new Map<string, number>();
  for (const item of bank.items) counts.set(item.family, (counts.get(item.family) ?? 0) + 1);
  for (const [family, n] of counts) if (n > 1 && !expFamilies.includes(family)) fail('bank.identity', `fresh family ${family} holds ${n} items`);
  if (bank.claim.length <= 20) fail('bank.identity', 'the bank’s claim is too thin');

  // bank.answers and bank.entities and bank.numbers
  for (const item of bank.items) {
    const where = item.id;
    if (item.claim.length <= 15) fail('bank.answers', `${where}: claim too thin`);
    if (item.explain.length <= 30) fail('bank.answers', `${where}: explanation too thin`);
    if (!item.sources.length) fail('bank.answers', `${where}: no source`);
    for (const s of item.sources) if (s.label.length <= 5 || (s.url && !s.url.startsWith('https://'))) fail('bank.answers', `${where}: source "${s.label}" is thin or not https`);
    oneAnswer(item, fail);
    for (const entity of item.entities) if (!mentions(itemText(item), entity)) fail('bank.entities', `${where}: entity "${entity}" is not in the item’s text`);
    if (item.kind === 'number') {
      if (/"answer"/.test(JSON.stringify(item.params))) fail('bank.numbers', `${where}: a typed answer in the params`);
      try {
        for (let n = 0; n < variantCount(item); n++) {
          const v = checkVariant(item, n);
          if (!(Number.isFinite(v.answer) && v.answer > 0)) fail('bank.numbers', `${where}: variant ${n} does not compute`);
          if (/\{\w+\}/.test(v.prompt)) fail('bank.numbers', `${where}: variant ${n} has an unfilled blank`);
          if (numbersIn(v.prompt).includes(Number(v.answer.toFixed(v.digits)))) fail('bank.numbers', `${where}: variant ${n} prints its own answer`);
        }
      } catch (e) { fail('bank.numbers', `${where}: ${(e as Error).message}`); }
    }
  }

  // bank.supply
  const prepared = prepare(bank);
  const entries = prepared.prepared;
  if (bank.items.length < 12) fail('bank.supply', `${bank.items.length} items; at least 12`);
  if (new Set(bank.items.map(i => i.kind)).size < 3) fail('bank.supply', 'fewer than 3 item kinds');
  if (entries.filter(e => e.transfer && e.openResponse).length < 3) fail('bank.supply', 'fewer than 3 open-response transfer items');
  if (entries.filter(e => e.transfer && !e.openResponse).length < 4) fail('bank.supply', 'fewer than 4 multiple-choice transfer items');
  if (entries.filter(e => !e.transfer).length < 4) fail('bank.supply', 'fewer than 4 items on the pack’s own scenarios');
  for (const start of [new Set(expFamilies), new Set<string>()]) {
    const seen = new Set(start);
    for (let round = 0; round < 3; round++) {
      const drawn = drawCheck(prepared, seen, `supply-${round}`);
      if (!drawn || drawn.length < 3 || !canPass(drawn.map(d => d.entry))) { fail('bank.supply', `cannot draw check ${round + 1} in a row${start.size ? ' after the expedition' : ' for a learner who skipped it'}`); break; }
      for (const d of drawn) seen.add(d.entry.item.family);
    }
  }
}

function oneAnswer(item: CheckItem, fail: (rule: PlaceRule, message: string) => void) {
  const where = item.id;
  const bad = (message: string) => fail('bank.answers', `${where}: ${message}`);
  switch (item.kind) {
    case 'choice':
      if (item.options.length < 4) bad('fewer than 4 options');
      if (new Set(item.options.map(o => o.label.toLowerCase())).size !== item.options.length) bad('two options read the same');
      if (item.options.filter(o => o.id === item.answer).length !== 1) bad('the key is not exactly one option');
      if (item.options.find(o => o.id === item.answer)?.misconception) bad('the key is tagged as a misconception');
      break;
    case 'flaw':
      if (item.steps.length < 4) bad('fewer than 4 steps');
      if (item.steps[0]?.id === item.answer) bad('the broken step is the first');
      if (!item.steps.some(s => s.id === item.answer)) bad('the key is not a step');
      break;
    case 'order':
      if (item.items.length < 4) bad('fewer than 4 items');
      if ([...item.answer].sort().join() !== item.items.map(i => i.id).sort().join()) bad('the order key is not exactly its items');
      break;
    case 'match': {
      const right = item.right.map(r => r.id);
      if (Object.keys(item.pairs).sort().join() !== item.left.map(l => l.id).sort().join()) bad('pairs do not cover the left items');
      if (Object.values(item.pairs).some(r => !right.includes(r))) bad('a pair names a missing target');
      if (item.buckets) { for (const r of right) if (!Object.values(item.pairs).includes(r)) bad(`bucket ${r} is never used`); }
      else if (new Set(Object.values(item.pairs)).size !== item.left.length || right.length !== item.left.length) bad('a one-to-one match must use every target once');
      break;
    }
    case 'number': break;
  }
  try {
    if (!grade(item, rightAnswer(item))) bad('the key does not grade as right');
    if (grade(item, wrongAnswer(item))) bad('a wrong answer grades as right');
  } catch (e) { bad((e as Error).message); }
}

function checkCases(b: PlaceBundle, ctx: PlaceContext, fail: (rule: PlaceRule, message: string) => void) {
  const cases = b.cases ?? [];
  // cases.supply
  if (cases.length < CASE_POLICY.minCases) fail('cases.supply', `${cases.length} new cases; a place needs at least ${CASE_POLICY.minCases} (the expedition’s last beat, a retry, the Lasting mission)`);
  if (new Set(cases.map(c => c.id)).size !== cases.length) fail('cases.supply', 'case IDs repeat');
  // Everything the learner reads before a case: the expedition and the reels.
  const before = [b.pack.title, b.pack.question, JSON.stringify(b.pack.beats), ...b.reels.map(r => [r.title, r.takeaway, r.prediction.prompt, ...r.prediction.choices.map(c => c.label), ...r.frames.map(f => f.text)].join('\n'))].join('\n');
  const archetypes = new Set(b.pack.beats.flatMap(beat => beat.kind === 'sim' ? [archetypeOf(beat.sim).id] : []));
  for (const c of cases) {
    const where = c.id;
    if (!CASE_RE.test(c.id)) fail('cases.supply', `${where}: not an opaque case ID (c_ + 10 Crockford characters)`);
    // cases.transfer
    const text = caseText(c);
    if (!c.entities.length) fail('cases.transfer', `${where}: names no entity, so transfer cannot be computed`);
    for (const entity of c.entities) {
      if (!mentions(text, entity)) fail('cases.transfer', `${where}: entity "${entity}" is not in the case’s own text`);
      if (mentions(before, entity)) fail('cases.transfer', `${where}: "${entity}" already appears in the expedition or a reel, so this is not a new situation`);
    }
    // cases.engine and cases.seeded
    if (/"(answer|correct|win|key)"\s*:/.test(JSON.stringify(c))) fail('cases.engine', `${where}: a typed answer; the engine computes who wins`);
    const engine = CASE_ENGINES[c.model.engine];
    if (!engine) { fail('cases.engine', `${where}: unknown engine "${c.model.engine}"`); continue; }
    if (engine.archetype !== c.archetype) fail('cases.engine', `${where}: engine ${c.model.engine} belongs to ${engine.archetype}, not ${c.archetype}`);
    if (!c.seed) fail('cases.seeded', `${where}: no seed`);
    const problems = caseProblems(c);
    for (const problem of problems) fail(/seed/.test(problem) ? 'cases.seeded' : 'cases.engine', `${where}: ${problem}`);
    // A two-gene cross is won by working it out: no reflex (cases/reflexes.ts) lands in its band.
    if (!problems.length) for (const how of reflexWins(c, b)) fail('cases.engine', `${where}: a reflex wins it (${how})`);
    // cases.archetype
    if (!archetypes.has(c.archetype) && !(c.fit && c.fit.length > 20)) fail('cases.archetype', `${where}: plays in ${c.archetype}, which the expedition doesn’t use; say why it fits better (fit)`);
    // cases.style
    const read = [c.title, c.setting ?? '', c.scenario, c.ask, c.reveal, c.run, ...(c.call.kind === 'pick' ? c.call.options.map(o => o.label) : [c.call.label])].join('\n');
    if (QUIZ.test(read)) fail('cases.style', `${where}: quiz language ("${read.match(QUIZ)![0]}")`);
    if (BANNED.test(read)) fail('cases.style', `${where}: banned style ("${read.match(BANNED)![0]}")`);
    if (words(`${c.scenario} ${c.ask}`) > 70) fail('cases.style', `${where}: scenario and ask run to ${words(`${c.scenario} ${c.ask}`)} words; at most 70`);
    // cases.sources
    if (c.claim.length <= 15) fail('cases.sources', `${where}: claim too thin`);
    if (c.reveal.length <= 30) fail('cases.sources', `${where}: reveal too thin`);
    if (!c.sources.length) fail('cases.sources', `${where}: no source`);
    for (const s of c.sources) if (s.label.length <= 5 || !s.url?.startsWith('https://')) fail('cases.sources', `${where}: source "${s.label}" is thin or has no https URL`);
  }
  checkCasesAcrossAtlas(b, ctx, fail);
}

/** cases.transfer across the atlas. A case is answerable from memory when some other part of the
 * atlas already sets its organisms side by side, so: no beat, reel, check item or case elsewhere
 * (or in this place's own check bank) may name two or more of a case's entities, no other case or
 * reel may carry its title, and, the other way round, nothing in this place may name two or more
 * of another place's case entities. One shared name alone (a cat in a coat-colour cross, a koala
 * eating leaves) teaches no kinship, so it passes. Each clash is reported once. */
function checkCasesAcrossAtlas(b: PlaceBundle, ctx: PlaceContext, fail: (rule: PlaceRule, message: string) => void) {
  const others = (ctx.places ?? []).filter(q => q.id !== b.id);
  if (!others.length) return;
  const said = new Set<string>();
  const once = (key: string, message: string) => { if (!said.has(key)) { said.add(key); fail('cases.transfer', message); } };
  const named = (c: PlaceCase, text: string) => c.entities.filter(e => mentions(text, e));
  const sameTitle = (a: string, z: string) => a.trim().toLowerCase() === z.trim().toLowerCase();
  const ownUnits = placeUnits(b);
  for (const c of b.cases ?? []) {
    for (const u of ownUnits) if (u.id.startsWith('item ')) {
      const both = named(c, u.text);
      if (both.length >= 2) once(`${c.id}|${b.id}|${u.id}`, `${c.id}: this place’s ${u.id} already names ${both.join(', ')}`);
    }
    for (const q of others) {
      for (const u of placeUnits(q)) {
        const both = named(c, u.text);
        if (both.length >= 2) once(`${[c.id, u.caseId ?? `${q.id} ${u.id}`].sort().join('|')}`, `${c.id}: ${q.id} ${u.id} already names ${both.join(', ')}`);
      }
      const twin = [...(q.cases ?? []).map(d => d.title), ...q.reels.map(r => r.title)].find(t => sameTitle(t, c.title));
      if (twin) once(`${c.id}|title|${q.id}`, `${c.id}: the title “${c.title}” is already used in ${q.id}`);
    }
  }
  // The other way round: this place must not spoil another place's case.
  for (const q of others) for (const d of q.cases ?? []) for (const u of ownUnits) {
    const both = named(d, u.text);
    if (both.length >= 2) once(`${[d.id, u.caseId ?? `${b.id} ${u.id}`].sort().join('|')}`, `${b.id} ${u.id} names ${both.join(', ')}, which ${q.id}’s case ${d.id} needs to be new`);
  }
}

function checkSources(b: PlaceBundle, ctx: PlaceContext, fail: (rule: PlaceRule, message: string) => void) {
  const listed = new Map(b.sources.map(s => [s.id, s]));
  const cited = new Set<string>([
    ...b.pack.provenance.map(p => p.source),
    ...b.reels.flatMap(r => r.sources.map(s => s.cite)).filter(cite => !cite.startsWith('https://commons.wikimedia.org/')),
    ...b.bank.items.flatMap(i => i.sources.map(s => s.label)),
    ...(b.cases ?? []).flatMap(c => c.sources.map(s => s.label)),
  ]);
  for (const id of cited) {
    const s = listed.get(id);
    if (!s) { fail('sources.complete', `"${id}" is cited but not listed in sources`); continue; }
    if (!/^https:\/\//.test(s.url)) fail('sources.complete', `"${id}" has no https URL`);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s.retrieved)) fail('sources.complete', `"${id}" has no retrieval date`);
    if (!s.usage.length) fail('sources.complete', `"${id}" has no usage`);
  }
  for (const s of b.sources) {
    if (s.kind === 'wikipedia' && !s.revision) fail('sources.allowed', `"${s.id}" is Wikipedia without a pinned revision`);
    if (s.usage.includes('link_only') && s.usage.includes('ai_input')) fail('sources.allowed', `"${s.id}" is link-only and cannot be model input`);
    if (s.kind === 'wikipedia' && s.licence !== 'CC BY-SA 4.0') fail('sources.allowed', `"${s.id}" is Wikipedia but not marked CC BY-SA 4.0`);
  }
  for (const t of b.transferOnlySources) if (!b.pack.provenance.some(p => p.source === t)) fail('sources.complete', `transfer-only source "${t}" is not in the provenance`);

  // Quotes: every quoted passage matches its pinned edition word for word. Only whitespace, the
  // shape of quote marks and Gutenberg's _italic_ markers are normalised; "…" separates elided runs,
  // each checked on its own.
  const norm = (t: string) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/_(\S[^_]*?\S|\S)_/g, '$1').replace(/\s+/g, ' ').trim();
  for (const beat of b.pack.beats) if (beat.kind === 'source') {
    const pinned = b.sources.find(s => s.url === beat.source.page && ctx.sourceTexts?.[s.id] !== undefined);
    if (!pinned) { fail('sources.quotes', `${beat.gradeId}: no pinned text for ${beat.source.page} (run facts.mjs --pd "Label|page|plain-text URL")`); continue; }
    const edition = norm(ctx.sourceTexts![pinned.id]);
    for (const para of beat.passage) for (const run of para.replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1').split('…').map(norm).filter(r => r.length > 3)) {
      if (!edition.includes(run)) fail('sources.quotes', `${beat.gradeId}: "${run.slice(0, 60)}…" is not in ${pinned.id}`);
    }
  }

  // Clean room: the writer works from atomic facts, never Wikipedia's prose.
  const ours = [JSON.stringify(b.pack.beats), ...b.reels.map(r => JSON.stringify(r.frames)), ...b.bank.items.map(i => `${itemText(i)} ${i.explain}`)].join('\n')
    .replace(/\\n/g, ' ').replace(/[{}[\]":,]/g, ' ');
  for (const s of b.sources) if (s.kind === 'wikipedia') {
    const extract = ctx.sourceTexts?.[s.id];
    if (extract === undefined) { fail('sources.cleanRoom', `no cached extract for "${s.id}" (run scripts/generate/facts.mjs)`); continue; }
    if (sharesRun(ours, extract)) fail('sources.cleanRoom', `text shares 8 words in a row with "${s.id}"`);
  }
}

function checkMedia(b: PlaceBundle, fail: (rule: PlaceRule, message: string) => void) {
  const snapshots = new Map(b.mediaChecks.map(m => [m.page, m]));
  const all = [...Object.values(b.pack.media), ...b.reels.flatMap(r => Object.values(r.media))];
  for (const m of all) {
    const snap = snapshots.get(m.page);
    if (!snap) { fail('media.checked', `${m.page} has no Commons licence snapshot`); continue; }
    if (snap.license !== m.license) fail('media.checked', `${m.page} prints "${m.license}" but Commons says "${snap.license}"`);
    if (snap.restrictions.length) fail('media.checked', `${m.page} carries restrictions: ${snap.restrictions.join(', ')}`);
  }
}

/** Every problem with one place. `waived` rules (legacy debt, listed in places/index.ts) are skipped. */
export function validatePlace(b: PlaceBundle, ctx: PlaceContext, waived: readonly PlaceRule[] = []): PlaceProblem[] {
  const problems: PlaceProblem[] = [];
  const skip = new Set(waived);
  const fail = (rule: PlaceRule, message: string) => { if (!skip.has(rule)) problems.push({ rule, message }); };
  if (b.schema !== PLACE_SCHEMA) fail('place.leaf', `schema ${b.schema}; this validator reads ${PLACE_SCHEMA}`);
  const guard = (rule: PlaceRule, run: () => void) => { try { run(); } catch (e) { fail(rule, `validator crashed: ${(e as Error).message}`); } };
  guard('place.leaf', () => checkPack(b, ctx, fail));
  guard('reels.valid', () => checkReels(b, ctx, fail));
  guard('bank.identity', () => checkBank(b, fail));
  guard('cases.engine', () => checkCases(b, ctx, fail));
  guard('sources.complete', () => checkSources(b, ctx, fail));
  guard('media.checked', () => checkMedia(b, fail));
  return problems;
}

/** Problems as readable lines, one per failure. */
export const formatProblems = (id: string, problems: readonly PlaceProblem[]) => problems.map(p => `${id} [${p.rule}] ${p.message}`);
