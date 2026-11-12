// Stage 5: run validatePlace on one place, exactly as places/places.test.ts does.
//
//   node scripts/generate/validate.mjs <id>     prints every problem by rule; exit 1 if any
import path from 'node:path';
import { APP_EXPORTS, args, loadTs, logStage, placeContext, workDir, writeJson } from './lib.mjs';

const started = Date.now();
const id = args()._[0];
if (!id) { console.error('usage: validate.mjs <id>'); process.exit(2); }
const m = await loadTs(APP_EXPORTS, 'validate');
const place = m.PLACES.find(p => p.id === id);
if (!place) throw new Error(`No place ${id}`);
const problems = m.validatePlace(place, placeContext(m, id));
const byRule = {};
for (const p of problems) (byRule[p.rule] ??= []).push(p.message);
for (const rule of Object.keys(m.PLACE_RULES)) {
  const hits = byRule[rule] ?? [];
  console.log(`${hits.length ? 'FAIL' : 'pass'}  ${rule}${hits.length ? '' : ''}`);
  for (const h of hits) console.log(`        ${h}`);
}
writeJson(path.join(workDir(id), 'validate.json'), { at: new Date().toISOString(), problems });
const minutes = logStage(id, 'validate', 'script', started, { problems: problems.length });
console.log(`\n${problems.length ? `${problems.length} problem(s)` : 'All rules pass'} (${minutes} min)`);
process.exit(problems.length ? 1 : 0);
