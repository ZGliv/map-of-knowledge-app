// Stage 6: the independent adversarial fact-check.
//
//   node scripts/generate/factcheck.mjs <id> --sheet    → content/generator/<id>/factcheck-input.md
//   (a FRESH subagent reads that file and writes content/generator/<id>/factcheck.json)
//   node scripts/generate/factcheck.mjs <id> --merge    checks every unit has a verdict; exit 1 on any open problem
//
// The sheet lists every checkable unit: each provenance claim, and every sentence a learner
// reads (hook, prompts, options, feedback, explanations, documentary frames, reel captions,
// bank items with their computed answers), each with the source IDs it rests on and where the
// cached source text lives. The checker's job is to break claims, not to approve them.
// factcheck.json: { "checker": "…", "independent": true | false (did a fresh agent that drafted nothing check it?), "units": [{ "id": "P3", "verdict": "supported" | "wrong" |
//   "unsupported" | "quote-mismatch" | "imprecise", "evidence": "[W4.19] …", "note": "…", "fix": "…" }] }
// After fixing, set "resolved": "how it was fixed" on the unit; merge treats it as closed.
// Set top-level "independent": true only when an agent that drafted nothing wrote the verdicts
// (false for a self-check), and "resolution" to who fixed what; the review sheet prints both beside
// the checker. A unit the drafting side checked itself (a unit a fix created, or a replacement case)
// carries "independent": false, and merge keeps it open until an independent checker writes its verdict.
// Each case is a unit C.<case id>; its verdict copies the case's hash from the sheet ("caseHash"),
// so a case edited after its check reads as unchecked on the review sheet. Verdicts written under the
// earlier sheet layouts, which keyed cases by position (C2, or C2.setup … C2.claim), still cover them.
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_EXPORTS, args, caseHash, loadTs, logStage, readJson, safeName, workDir } from './lib.mjs';

const started = Date.now();
const a = args();
const id = a._[0];
if (!id || (!a.sheet && !a.merge)) { console.error('usage: factcheck.mjs <id> --sheet | --merge'); process.exit(2); }
const m = await loadTs(APP_EXPORTS, 'factcheck');
const place = m.PLACES.find(p => p.id === id);
if (!place) throw new Error(`No place ${id}`);

/** Every checkable unit, with a stable ID. */
function units() {
  const out = [];
  const add = (uid, where, text, sources = []) => { if (text && String(text).trim()) out.push({ id: uid, where, text: String(text).trim(), sources }); };
  const all = place.pack.provenance.map(p => p.source);
  place.pack.provenance.forEach((p, i) => add(`P${i + 1}`, 'provenance claim', p.claim, [p.source]));
  place.pack.beats.forEach((beat, i) => {
    const b = `B${i + 1}`;
    const say = (k, text) => add(`${b}.${k}`, `beat ${i + 1} (${beat.kind})`, text, all);
    if (beat.kind === 'cover') say('hook', beat.hook);
    if ('prompt' in beat && typeof beat.prompt === 'string') say('prompt', beat.prompt);
    if ('explain' in beat && typeof beat.explain === 'string') say('explain', beat.explain);
    if (beat.kind === 'predict') beat.parts.forEach(part => part.choices.forEach(c => say(`${part.id}.${c.id}`, `${c.label}${c.id === part.answer ? ' [KEY]' : ''}${c.feedback ? ` — feedback: ${c.feedback}` : ''}`)));
    if (beat.kind === 'source') {
      beat.passage.forEach((para, k) => say(`quote${k + 1}`, `QUOTE (must match ${beat.source.page} exactly, “…” marks an elision): ${para.replace(/\[\[([^|]+)\|[^\]]+\]\]/g, '$1')}`));
      Object.entries(beat.notes).forEach(([k, v]) => say(`note.${k}`, v));
      beat.question.choices.forEach(c => say(`q.${c.id}`, `${c.label}${c.id === beat.question.answer ? ' [KEY]' : ''}${c.feedback ? ` — feedback: ${c.feedback}` : ''}`));
    }
    if (beat.kind === 'documentary') beat.frames.forEach((f, k) => say(`frame${k + 1}`, f.text));
    if (beat.kind === 'flaw') beat.steps.forEach(s => say(`step.${s.id}`, `${s.text}${s.id === beat.answer ? ' [THE BROKEN STEP]' : ''}`));
    if (beat.kind === 'match') beat.left.forEach(l => say(`pair.${l.id}`, `${l.label} → ${beat.right.find(r => r.id === beat.pairs[l.id]).label}`));
    if (beat.kind === 'order') say('order', beat.answer.map(x => beat.items.find(it => it.id === x).label).join(' → '));
    if (beat.kind === 'number') { const v = m.makeVariant(beat.generator, beat.params, 0); say('number', `${v.prompt} ${v.ask} → computed answer ${v.answer} ${v.unit} (${v.working})`); }
    if (beat.kind === 'sim') {
      say('goal', beat.goal);
      for (const step of beat.params.steps ?? []) {
        say(`${step.id}.ask`, step.ask.prompt);
        step.ask.choices.forEach(c => say(`${step.id}.${c.id}`, `${c.label}${c.id === step.ask.answer ? ' [KEY]' : ''}${c.feedback ? ` — feedback: ${c.feedback}` : ''}`));
        say(`${step.id}.explain`, step.ask.explain);
      }
      // A chart sim: every bar's value, its facts and the feedback for a wrong bet.
      if (beat.sim === 'lifeChart') {
        const p = beat.params, unit = p.unit && p.unit !== '%' ? ` ${p.unit}` : '%';
        say('ask', `${p.pick.ask} [KEY: ${p.events.find(e => e.id === p.pick.answer)?.name}]`);
        p.events.forEach(e => say(`bar.${e.id}`, `${e.name}: ${e.value}${unit}${e.feedback ? ` — feedback: ${e.feedback}` : ''}${(e.facts ?? []).map(f => ` — ${f.label}: ${f.text}`).join('')}`));
        say('right', p.pick.right); say('wrong', p.pick.wrong); say('source', p.source);
      }
    }
    if (beat.kind === 'payoff') say('idea', beat.idea);
  });
  place.reels.forEach((reel, r) => {
    const cite = Object.fromEntries(reel.sources.map(s => [s.id, s.cite]));
    reel.frames.forEach((f, k) => add(`R${r + 1}.f${k + 1}`, `reel ${reel.id}`, f.text, f.claims.map(c => cite[c])));
    add(`R${r + 1}.prediction`, `reel ${reel.id}`, `${reel.prediction.prompt} [KEY: ${reel.prediction.choices.find(c => c.id === reel.prediction.answer).label}]`, reel.prediction.claims.map(c => cite[c]));
    add(`R${r + 1}.takeaway`, `reel ${reel.id}`, reel.takeaway, reel.sources.map(s => s.cite));
  });
  place.bank.items.forEach(item => {
    const srcs = item.sources.map(s => s.label);
    const key = item.kind === 'number' ? (() => { const v = m.checkVariant(item, 0); return `${v.prompt} → computed answer ${Math.round(v.answer * 100) / 100} ${v.unit}`; })()
      : item.kind === 'choice' ? `${item.prompt} [KEY: ${item.options.find(o => o.id === item.answer).label}] Other options: ${item.options.filter(o => o.id !== item.answer).map(o => o.label).join(' | ')}`
      : item.kind === 'flaw' ? `${item.prompt} ${item.steps.map(s => `(${s.id}) ${s.text}`).join(' ')} [BROKEN: ${item.answer}]`
      : item.kind === 'order' ? `${item.prompt} ${item.answer.map(x => item.items.find(i => i.id === x).label).join(' → ')}`
      : `${item.prompt} ${Object.entries(item.pairs).map(([l, r]) => `${item.left.find(x => x.id === l).label} → ${item.right.find(x => x.id === r).label}`).join('; ')}`;
    add(`I.${item.id}`, `check item (${item.kind})`, `${key}\n    Claim: ${item.claim}\n    Explain: ${item.explain}`, srcs);
  });
  // New cases, one unit each, keyed by the case's own ID so a verdict can't carry over to a replacement:
  // the setup, what the engine computes from it (the winning call and its line), the model it runs,
  // and the reveal and claim a learner reads after the run. Long letter strings are abbreviated here;
  // the full strings are in the bundle and must match the pinned sequence records.
  const brief = value => JSON.stringify(value, (k, v) => typeof v === 'string' && v.length > 80 ? `${v.slice(0, 30)}…${v.slice(-30)} (${v.length} letters)` : v);
  (place.cases ?? []).forEach((c, n) => {
    const o = m.runCase(c);
    const call = c.call.kind === 'pick'
      ? `Options: ${c.call.options.map(op => `${op.label}${o.truth.kind === 'pick' && o.truth.win.includes(op.id) ? ' [COMPUTED WINNER]' : ''}`).join(' | ')}`
      : `Set "${c.call.label}" from ${c.call.min} to ${c.call.max}; the engine computes ${Math.round(o.truth.value * 100) / 100}, and calls within ${c.call.tolerance} win`;
    add(`C.${c.id}`, `case ${n + 1} (${c.model.engine} engine; hash ${caseHash(c)}: copy it into the verdict as "caseHash")`,
      `${c.title}${c.setting ? ` · ${c.setting}` : ''}. ${c.scenario} ${c.ask}\n    ${call}\n    Model the engine runs: ${brief(c.model)}\n    Computed after the run: ${o.line}\n    Reveal: ${c.reveal}\n    Claim: ${c.claim}`,
      c.sources.map(x => x.label));
  });
  return out;
}

const list = units();
const dir = workDir(id);

if (a.sheet) {
  const sources = readJson(path.join(dir, 'sources.json'), []);
  const sheet = `# Adversarial fact-check: ${place.pack.title} (${id})

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/${id}/sources/<file>.json, field "text"):
${sources.map(s => `- ${s.id} · ${s.url}${existsSync(path.join(dir, 'sources', `${safeName(s.id)}.json`)) ? ` · file: sources/${safeName(s.id)}.json` : ' · (no cached text: judge from general knowledge and say so)'}`).join('\n')}
Fact sheet with numbered sentences: content/generator/${id}/factsheet.md

For each unit write one entry to content/generator/${id}/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (${list.length})
${list.map(u => `\n### ${u.id} · ${u.where}\n${u.text}\nCites: ${u.sources.length ? [...new Set(u.sources)].join('; ') : '(none)'}`).join('\n')}
`;
  writeFileSync(path.join(dir, 'factcheck-input.md'), sheet);
  const minutes = logStage(id, 'factcheck-sheet', 'script', started, { units: list.length });
  console.log(`${list.length} units → content/generator/${id}/factcheck-input.md (${minutes} min)`);
} else {
  const result = readJson(path.join(dir, 'factcheck.json'));
  if (!result) throw new Error('No factcheck.json yet');
  const byId = new Map(result.units.map(u => [u.id, u]));
  // A case is covered by a verdict on C.<case id>, or by one written under an earlier layout that
  // keyed it by position: C<n>, or all five of C<n>.setup, .model, .line, .reveal and .claim.
  const caseAt = new Map((place.cases ?? []).map((c, n) => [`C.${c.id}`, n + 1]));
  const covered = u => byId.has(u.id) || (caseAt.has(u.id) && (byId.has(`C${caseAt.get(u.id)}`)
    || ['setup', 'model', 'line', 'reveal', 'claim'].every(part => byId.has(`C${caseAt.get(u.id)}.${part}`))));
  const missing = list.filter(u => !covered(u)).map(u => u.id);
  const open = result.units.filter(u => u.verdict !== 'supported' && !u.resolved);
  const selfOnly = result.units.filter(u => u.independent === false);
  const counts = result.units.reduce((acc, u) => ({ ...acc, [u.verdict]: (acc[u.verdict] ?? 0) + 1 }), {});
  console.log(`Checker: ${result.checker}. ${result.units.length}/${list.length} units: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  for (const u of open) console.log(`  OPEN ${u.id} [${u.verdict}] ${u.note ?? ''}${u.fix ? `\n       fix: ${u.fix}` : ''}`);
  for (const u of selfOnly) console.log(`  NOT YET INDEPENDENT ${u.id}: checked by the drafting side only`);
  if (missing.length) console.log(`  MISSING verdicts: ${missing.join(', ')}`);
  logStage(id, 'factcheck-merge', 'script', started, { units: list.length, open: open.length, missing: missing.length, selfOnly: selfOnly.length });
  process.exit(open.length || missing.length || selfOnly.length ? 1 : 0);
}
