// Tagging providers. A provider turns candidate videos into verdicts:
//
//   { id, educational: true,  places: [atlas IDs, primary first, 1–3], learn: "one plain line" }
//   { id, educational: false, reason: "why not" }
//
// Every provider gets the same instructions (PROMPT) and its answers pass the same checks
// (validateVerdicts) before anything is kept, so swapping who tags never loosens the rules.
//
// `batch` hands work to agents through files (no API cost): export writes a batch with its
// instructions; the agent writes <batch>.answer.json; import reads it back. A nightly API model
// would be a second provider: send PROMPT plus the batch's places and candidates, parse the
// returned verdicts, and hand them to the same import path.
import path from 'node:path';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { readJson } from './lib.mjs';

export const PROMPT_VERSION = 1;

export const PROMPT = `You classify YouTube videos for a personal learning atlas. The learner wants a feed that teaches, never one that merely entertains.

For EVERY candidate video, decide:

1. educational: true only when the video itself teaches something concrete: a concept, a mechanism, an explained fact, a method or skill, a piece of history or a close reading of a work. Judge the video, not the channel.
   Reject (educational: false, with a short reason) vlogs and behind-the-scenes, adverts and sponsor reads, merch, giveaways, sales and ticket or booking promotions, trailers and teasers, reaction videos, channel announcements or updates, livestream and event notices, podcast or episode promos with no content, clickbait with no substance, pure comedy or sketches, compilations or footage with no explanation, and anything mainly opinion or news commentary with no lasting lesson.
   When the title and description are too thin to tell, reject with reason "unclear".

2. places: 1 to 3 atlas place IDs, copied exactly from the PLACES list, primary first. Choose the deepest place that genuinely fits (a field such as knowledge.science.chemistry is right when nothing deeper fits; never force a deeper match). Use a second or third place only when the video truly spans them.

3. learn: one plain sentence (at most 110 characters) saying what the viewer will learn. Concrete, calm and specific. Write it from the title and description only: never state an answer, number or claim they do not support. No "In this video", no hype, no exclamation marks, no emoji, no questions, no quotation marks around the whole line.

Answer with JSON only, in exactly this shape, one verdict per candidate, same IDs:
{"verdicts":[{"id":"…","educational":true,"places":["knowledge.…"],"learn":"…"},{"id":"…","educational":false,"reason":"…"}]}`;

/** The places a tagger may choose from, with a readable path for each. */
export function placeList(m) {
  return m.taggablePlaces(m.catalog).map(node => ({ id: node.id, path: m.catalog.getPath(node).slice(1).map(step => step.name).join(' › ') }));
}

const EMOJI = /\p{Extended_Pictographic}/u;

/** Check one batch's verdicts. Returns the verdicts to keep (normalised) and every problem found. */
export function validateVerdicts(verdicts, expected, catalog, checkPlaces) {
  const issues = [];
  const kept = [];
  const seen = new Set();
  const taggable = id => { const node = catalog.get(id); return !!node && node.depth > 0 && !id.endsWith('.demonstration') && (!node.sample || node.depth <= 7); };
  const lookup = { get: id => taggable(id) ? catalog.get(id) : undefined };
  if (!Array.isArray(verdicts)) return { verdicts: [], issues: ['the answer has no verdicts array'] };
  for (const raw of verdicts) {
    const id = raw?.id;
    if (typeof id !== 'string' || !expected.has(id)) { issues.push(`unexpected id ${JSON.stringify(id)}`); continue; }
    if (seen.has(id)) { issues.push(`${id}: answered twice`); continue; }
    seen.add(id);
    if (raw.educational === false) {
      const reason = typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 80) : '';
      kept.push({ id, educational: false, reason: reason || 'not educational', v: PROMPT_VERSION });
      continue;
    }
    if (raw.educational !== true) { issues.push(`${id}: educational must be true or false`); continue; }
    const check = checkPlaces(Array.isArray(raw.places) ? raw.places : [], lookup);
    for (const move of check.moved) issues.push(`${id}: ${move.from} is not a taggable place; moved to ${move.to}`);
    for (const drop of check.dropped) issues.push(`${id}: dropped unknown place ${drop}`);
    if (!check.places.length) { issues.push(`${id}: no valid place, not kept`); continue; }
    const learn = typeof raw.learn === 'string' ? raw.learn.replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '') : '';
    if (learn.length < 12 || learn.length > 140 || EMOJI.test(learn) || /^(in )?this video/i.test(learn) || /!/.test(learn)) { issues.push(`${id}: learn line rejected (${JSON.stringify(learn)}), not kept`); continue; }
    kept.push({ id, educational: true, places: check.places, learn, v: PROMPT_VERSION });
  }
  for (const id of expected) if (!seen.has(id)) issues.push(`${id}: no verdict`);
  return { verdicts: kept, issues };
}

export const TAGGERS = {
  batch: {
    name: 'agent',
    /** Write one batch: instructions, places and candidates, all in one self-contained file. */
    export({ name, dir, candidates, places }) {
      const file = path.join(dir, `${name}.json`);
      writeFileSync(file, `${JSON.stringify({ batch: name, promptVersion: PROMPT_VERSION, instructions: PROMPT, answerFile: `${name}.answer.json`, places: places.map(p => `${p.id}  ${p.path}`), candidates }, null, 1)}\n`);
      return file;
    },
    /** Every answered batch in `dir`, with the IDs it was asked about. */
    *answers(dir) {
      for (const file of readdirSync(dir).filter(f => /^batch-\d+\.json$/.test(f)).sort()) {
        const answer = path.join(dir, file.replace(/\.json$/, '.answer.json'));
        if (!existsSync(answer)) continue;
        const batch = readJson(path.join(dir, file));
        let verdicts;
        try { verdicts = readJson(answer).verdicts; } catch (error) { console.log(`  ${batch.batch}: answer is not valid JSON (${error.message})`); continue; }
        yield { name: batch.batch, expected: new Set(batch.candidates.map(c => c.id)), verdicts };
      }
    },
  },
};
