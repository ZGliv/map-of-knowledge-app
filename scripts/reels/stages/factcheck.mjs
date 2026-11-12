// Stage 4b: the independent adversarial fact-check, one fresh checker per day's batch.
//   factcheck <date> --sheet   → content/reels/<date>/factcheck-input.md (every checkable unit)
//   (a FRESH subagent, which drafted nothing, reads it and writes content/reels/<date>/factcheck.json)
//   factcheck <date> --merge   every unit has a verdict and none is open; exit 1 otherwise
// factcheck.json: { "checker": "…", "checkedAt": "…", "units": [{ "id": "<unit>", "verdict":
//   "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch", "evidence": "…", "note": "…",
//   "fix": "…" }] }. After fixing (or cutting the reel), add "resolved": "what changed" to the unit.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { dayDir, logStage, readJson, safeName, writeJson } from '../lib.mjs';

/** Every unit a checker must try to break, with a stable ID. Pure. */
export function units(reels, mediaChecks = {}) {
  const out = [];
  for (const reel of reels) {
    const cite = Object.fromEntries(reel.sources.map(s => [s.id, s]));
    const backing = ids => ids.map(id => cite[id] ? `${id}: ${cite[id].claim} [${cite[id].cite}: “${cite[id].quote ?? ''}”]` : `${id}: (missing)`).join('\n      ');
    const add = (key, what, text, ids = []) => out.push({ id: `${reel.id}/${key}`, reel: reel.id, what, text, backing: backing(ids) });
    add('title', 'title', reel.title, reel.sources.map(s => s.id));
    reel.frames.forEach((f, i) => add(`f${i + 1}`, `frame ${i + 1} caption${f.say ? ' (and what the voice says)' : ''}`, f.say ? `${f.text}\n      spoken: ${f.say}` : f.text, f.claims));
    const p = reel.prediction;
    add('prediction', 'prediction (the key must be right, every other choice wrong)', `${p.prompt}\n      KEY: ${p.choices.find(c => c.id === p.answer)?.label}\n      Others: ${p.choices.filter(c => c.id !== p.answer).map(c => c.label).join(' | ')}`, p.claims);
    add('takeaway', 'takeaway', reel.takeaway, reel.sources.map(s => s.id));
    for (const s of reel.sources) add(`claim.${s.id}`, 'claim and its quote (the quote must support the claim, and be in the source)', `${s.claim}\n      quote: “${s.quote ?? ''}”\n      source: ${s.cite}`);
    for (const [key, m] of Object.entries(reel.media)) {
      const snap = mediaChecks[m.page];
      add(`media.${key}`, 'image: alt text against the file description; credit and licence against Commons', `alt: ${m.alt}\n      credit: ${m.credit} · ${m.license} · ${m.page}\n      Commons said: ${snap ? `${snap.license}, ${snap.width}×${snap.height}${snap.restrictions.length ? `, restrictions ${snap.restrictions.join(', ')}` : ''}` : '(no snapshot)'}`);
    }
    add('place', 'the atlas place it is tagged to (does the story belong there?)', `${reel.nodeId}${reel.packId ? ` (expedition ${reel.packId})` : ''}`);
  }
  return out;
}

const unitKey = u => `${u.text}\n${u.backing}`;
/** Every round's verdicts, later rounds over earlier ones: factcheck.json, factcheck-2.json, … */
function verdicts(dir) {
  const byId = new Map();
  let checker = '', round = 0;
  for (let n = 1; n < 10; n++) {
    const result = readJson(path.join(dir, n === 1 ? 'factcheck.json' : `factcheck-${n}.json`));
    if (!result) break;
    round = n;
    checker = checker ? `${checker}; round ${n}: ${result.checker}` : result.checker;
    for (const u of result.units) byId.set(u.id, { ...u, round: n });
  }
  return { byId, checker, round };
}

/** The sheet for a fresh checker. Round 1 lists every unit; a later round (after fixes) lists only
 * the units whose words changed since they were checked, or that are new. */
export function sheet(date, { round = 1 } = {}) {
  const started = Date.now();
  const dir = dayDir(date);
  const { reels } = readJson(path.join(dir, 'reels.json'), { reels: [] });
  const media = readJson(path.join(dir, 'media.json'), {});
  const all = units(reels, media);
  const seen = readJson(path.join(dir, 'factcheck-units.json'), {});
  const list = round === 1 ? all : all.filter(u => seen[u.id] !== unitKey(u));
  for (const u of list) seen[u.id] = unitKey(u);
  writeJson(path.join(dir, 'factcheck-units.json'), seen);
  const out = round === 1 ? 'factcheck.json' : `factcheck-${round}.json`;
  const cites = [...new Set(reels.flatMap(r => r.sources.map(s => s.cite)))];
  const md = `# Adversarial fact-check${round > 1 ? ` (round ${round}: only what changed after round ${round - 1}'s fixes)` : ''}: reels for ${date}

You are an independent checker. You did not write these reels. Your job is to BREAK them: for every
unit below, look for a claim that is wrong, overstated, missing a qualifier, unsupported by its quote,
a quote that is not word for word in its pinned source, a prediction key that is not clearly right
(or a wrong choice that is arguably right), alt text that describes something the picture does not
show, and a place tag that does not fit. Default to suspicion; "supported" needs evidence you can
point to. Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.

Pinned sources (text in content/reels/${date}/sources/<file>, field "text"):
${cites.map(c => `- ${c} → sources/${safeName(c)}.json`).join('\n')}
Image licence snapshots: content/reels/${date}/media.json. You may also look things up on the web
to break a claim (cite what you find), but a claim stands or falls on its pinned source.

Write content/reels/${date}/${out}:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (${list.length}, ${reels.length} reels)
${list.map(u => `\n### ${u.id} · ${u.what}\n      ${u.text}${u.backing ? `\n    Rests on:\n      ${u.backing}` : ''}`).join('\n')}
`;
  const name = round === 1 ? 'factcheck-input.md' : `factcheck-input-${round}.md`;
  writeFileSync(path.join(dir, name), md);
  const minutes = logStage(date, `factcheck-sheet${round > 1 ? `-${round}` : ''}`, 'script', started, { units: list.length });
  console.log(`${list.length} units for ${reels.length} reels → content/reels/${date}/${name} (${minutes} min)`);
}

export function merge(date) {
  const started = Date.now();
  const dir = dayDir(date);
  const { reels } = readJson(path.join(dir, 'reels.json'), { reels: [] });
  const { byId, checker, round } = verdicts(dir);
  if (!round) throw new Error('No factcheck.json yet');
  const list = units(reels, readJson(path.join(dir, 'media.json'), {}));
  // A unit whose words changed after its last check needs a new round.
  const seen = readJson(path.join(dir, 'factcheck-units.json'), {});
  const stale = list.filter(u => byId.has(u.id) && seen[u.id] !== unitKey(u) && !byId.get(u.id).resolved).map(u => u.id);
  const missing = list.filter(u => !byId.has(u.id)).map(u => u.id);
  const live = new Set(list.map(u => u.id));
  const latest = [...byId.values()].filter(u => live.has(u.id));
  const open = latest.filter(u => u.verdict !== 'supported' && !u.resolved);
  const counts = latest.reduce((acc, u) => ({ ...acc, [u.verdict]: (acc[u.verdict] ?? 0) + 1 }), {});
  console.log(`Checker: ${checker}. ${list.length - missing.length}/${list.length} units: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  if (stale.length) console.log(`  CHANGED since checked (run factcheck --sheet --round ${round + 1}): ${stale.join(', ')}`);
  for (const u of open) console.log(`  OPEN ${u.id} [${u.verdict}] ${u.note ?? ''}${u.fix ? `\n       fix: ${u.fix}` : ''}`);
  if (missing.length) console.log(`  MISSING verdicts: ${missing.join(', ')}`);
  logStage(date, 'factcheck-merge', 'script', started, { units: list.length, open: open.length, missing: missing.length, stale: stale.length, rounds: round, counts });
  return open.length === 0 && missing.length === 0 && stale.length === 0;
}
