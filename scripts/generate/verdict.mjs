// Stage 9: Zack's verdict, recorded with the minutes he spent (PLAN §6.12).
//
//   node scripts/generate/verdict.mjs <id> ship|fix|kill [--note "…"] [--minutes 6]
import path from 'node:path';
import { args, readJson, workDir, writeJson } from './lib.mjs';

const a = args();
const [id, verdict] = a._;
if (!id || !['ship', 'fix', 'kill'].includes(verdict)) { console.error('usage: verdict.mjs <id> ship|fix|kill [--note "…"] [--minutes N]'); process.exit(2); }
if (verdict === 'fix' && !a.note) { console.error('A fix needs a one-line --note'); process.exit(2); }
const file = path.join(workDir(id), 'review.json');
const history = readJson(file, []);
history.push({ verdict, note: a.note ?? '', minutes: a.minutes ? Number(a.minutes) : null, at: new Date().toISOString() });
writeJson(file, history);
console.log(`${id}: ${verdict}${a.note ? ` — ${a.note}` : ''}`);
