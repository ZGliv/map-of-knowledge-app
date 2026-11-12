// Stage 7: render the place in a real browser and keep the screenshots for the review sheet.
//
//   MOK_URL=http://127.0.0.1:5234 node scripts/generate/render.mjs <id>
//
// Plays the expedition start to finish at phone (375 × 812) and desktop sizes with
// tests/expedition-playthrough.mjs, which answers every graded beat from the pack's own data and
// fails on broken images, sideways scroll or console errors. Screenshots land in
// output/generator/<id>/shots/. Needs the dev server running (npm run dev).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { args, logStage, outDir, ROOT } from './lib.mjs';

const started = Date.now();
const id = args()._[0];
if (!id) { console.error('usage: render.mjs <id>'); process.exit(2); }
const url = process.env.MOK_URL || 'http://127.0.0.1:5173';
const out = path.relative(ROOT, path.join(outDir(id), 'shots'));
let ok = true;
try {
  execFileSync(process.execPath, [path.join(ROOT, 'tests/expedition-playthrough.mjs'), id], {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, MOK_URL: url, OUT: out, VIEWPORTS: 'phone,desktop' },
  });
} catch { ok = false; }
const minutes = logStage(id, 'render', 'script', started, { ok });
console.log(`${ok ? 'Rendered' : 'RENDER FAILED'}: ${out}/ (${minutes} min)`);
process.exit(ok ? 0 : 1);
