// Times the agent stages (draft, fact-check) so the lineage records every stage's minutes.
//
//   node scripts/generate/stage.mjs <id> start draft
//   node scripts/generate/stage.mjs <id> end draft [--note "…"]
import path from 'node:path';
import { args, readJson, workDir, writeJson } from './lib.mjs';

const a = args();
const [id, verb, stage] = a._;
if (!id || !['start', 'end'].includes(verb) || !stage) { console.error('usage: stage.mjs <id> start|end <stage>'); process.exit(2); }
const file = path.join(workDir(id), 'log.json');
const log = readJson(file, { id, stages: [] });
if (verb === 'start') {
  log.stages = log.stages.filter(s => !(s.stage === stage && s.open));
  log.stages.push({ stage, by: 'agent', open: true, startedAt: new Date().toISOString() });
} else {
  const open = log.stages.find(s => s.stage === stage && s.open);
  if (!open) throw new Error(`no open ${stage} stage`);
  open.minutes = Math.round(((Date.now() - Date.parse(open.startedAt)) / 60000) * 10) / 10;
  delete open.open;
  open.at = new Date().toISOString();
  if (a.note) open.note = a.note;
  console.log(`${stage}: ${open.minutes} min`);
}
writeJson(file, log);
