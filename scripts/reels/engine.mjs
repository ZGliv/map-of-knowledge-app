#!/usr/bin/env node
// The reel engine: Explore's daily set, made from licence-safe sources with nobody at the keyboard
// except for drafting (an agent, or later an API model) and an independent fact-check.
//
//   node scripts/reels/engine.mjs run <date> [--count 7]      gather → pick → brief (stops for drafting)
//   node scripts/reels/engine.mjs draft <date> [--provider agent|openrouter]
//   node scripts/reels/engine.mjs assemble <date>             drafts.json → reels.json, every rule checked
//   node scripts/reels/engine.mjs factcheck <date> --sheet    → factcheck-input.md for a fresh checker
//   node scripts/reels/engine.mjs factcheck <date> --sheet --round 2   only what changed since (after fixes)
//   node scripts/reels/engine.mjs factcheck <date> --merge    exit 1 while any unit is open, missing or changed
//   node scripts/reels/engine.mjs narrate <date>              Piper narration → public/explore/decks/<date>/
//   node scripts/reels/engine.mjs publish <date>              → public/explore/decks/<date>.json + index.json
//   node scripts/reels/engine.mjs render <date> [--url …]     375 px strips + contact sheet (needs the dev server)
//   node scripts/reels/engine.mjs finish <date>               assemble → narrate → publish
//   node scripts/reels/engine.mjs stage <date> start|end <name>   time an agent stage (draft, factcheck)
//   node scripts/reels/engine.mjs status <date>               what exists for the day, and its timings
// Single stages: gather, pick [--keep: refresh the same shortlisted stories, after drafting began], brief. Days are YYYY-MM-DD; "today" means the local day.
// The skill (.claude/skills/generate-reels/SKILL.md) is the full procedure.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { args, dayDir, deckFile, isDay, localDay, logStage, readJson, writeJson } from './lib.mjs';

const a = args();
const [command, rawDate, ...rest] = a._;
const date = rawDate === 'today' || !rawDate ? localDay() : rawDate;
if (!command || !isDay(date)) {
  console.error('usage: node scripts/reels/engine.mjs <run|gather|pick|brief|draft|assemble|factcheck|narrate|publish|render|finish|stage|status> <YYYY-MM-DD|today> [options]');
  process.exit(2);
}
const count = Number(a.count ?? 7);
let ok = true;

switch (command) {
  case 'gather': await (await import('./stages/gather.mjs')).gather(date); break;
  case 'pick': await (await import('./stages/pick.mjs')).pick(date, { count, keep: !!a.keep }); break;
  case 'brief': await (await import('./stages/brief.mjs')).brief(date, { provider: a.provider }); break;
  case 'run': {
    await (await import('./stages/gather.mjs')).gather(date);
    await (await import('./stages/pick.mjs')).pick(date, { count });
    await (await import('./stages/brief.mjs')).brief(date, { provider: a.provider ?? 'agent' });
    console.log(`\nNext: draft the reels (node scripts/reels/engine.mjs draft ${date} --provider ${a.provider ?? 'agent'}).`);
    break;
  }
  case 'draft': {
    const { provider } = await import('./providers/index.mjs');
    const brief = readJson(path.join(dayDir(date), 'brief.json'));
    if (!brief) throw new Error(`No brief for ${date}: run first`);
    const started = Date.now();
    const result = await provider(a.provider ?? 'agent').draft(brief, { date, dir: dayDir(date) });
    if (result.status === 'pending') { console.log(result.message); break; }
    writeJson(path.join(dayDir(date), 'drafts.json'), { ...result.drafts, ...(result.usage ? { usage: result.usage } : {}) });
    logStage(date, 'draft', a.provider ?? 'agent', started, { reels: result.drafts.reels.length, ...(result.usage ?? {}) });
    console.log(`${result.drafts.reels.length} drafts from ${result.drafts.drafter}${result.usage ? ` (${result.usage.inputTokens} in, ${result.usage.outputTokens} out tokens, $${result.usage.costUsd ?? '?'})` : ''}`);
    break;
  }
  case 'assemble': { const r = await (await import('./stages/assemble.mjs')).assemble(date, { provider: a.provider ?? 'agent' }); ok = !!r && !r.errors.length; break; }
  case 'factcheck': {
    const m = await import('./stages/factcheck.mjs');
    if (a.sheet) m.sheet(date, { round: Number(a.round ?? 1) }); else if (a.merge) ok = m.merge(date); else { console.error('factcheck needs --sheet [--round N] or --merge'); ok = false; }
    break;
  }
  case 'narrate': (await import('./stages/narrate.mjs')).narrate(date, { all: !!a.all }); break;
  case 'publish': ok = await (await import('./stages/publish.mjs')).publish(date); break;
  case 'render': { const r = await (await import('./stages/render.mjs')).render(date, { url: a.url }); ok = r.every(x => !x.error); break; }
  case 'finish': {
    const r = await (await import('./stages/assemble.mjs')).assemble(date);
    if (!r || r.errors.length) { ok = false; break; }
    (await import('./stages/narrate.mjs')).narrate(date);
    ok = await (await import('./stages/publish.mjs')).publish(date);
    break;
  }
  case 'stage': {
    // Agent stages: `stage <date> start draft` … `stage <date> end draft`.
    const [what, name] = rest;
    const file = path.join(dayDir(date), 'log.json');
    const log = readJson(file, { date, stages: [] });
    if (what === 'start') { log.stages.push({ stage: name, by: 'agent', open: true, startedAt: Date.now(), at: new Date().toISOString() }); writeJson(file, log); console.log(`Timing ${name}…`); }
    else if (what === 'end') {
      const open = [...log.stages].reverse().find(s => s.stage === name && s.open);
      if (!open) { console.error(`No open ${name} stage`); ok = false; break; }
      const minutes = logStage(date, name, 'agent', open.startedAt, a.note ? { note: a.note } : {});
      console.log(`${name}: ${minutes} min`);
    } else { console.error('stage <date> start|end <name>'); ok = false; }
    break;
  }
  case 'status': {
    const dir = dayDir(date);
    const has = name => existsSync(path.join(dir, name)) ? 'yes' : '—';
    console.log(`content/reels/${date}: candidates ${has('candidates.json')} · shortlist ${has('shortlist.json')} · brief ${has('brief.md')} · drafts ${has('drafts.json')} · reels ${has('reels.json')} · fact-check ${has('factcheck.json')} · published ${existsSync(deckFile(date)) ? 'yes' : '—'}`);
    const log = readJson(path.join(dir, 'log.json'), { stages: [] });
    for (const s of log.stages) console.log(`  ${s.stage.padEnd(16)} ${s.by.padEnd(10)} ${s.open ? '(running)' : `${s.minutes} min`}`);
    break;
  }
  default: console.error(`Unknown command ${command}`); ok = false;
}
process.exit(ok ? 0 : 1);
