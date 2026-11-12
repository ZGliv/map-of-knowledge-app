// Stage 8: the one-page review sheet Zack approves from.
//
//   node scripts/generate/review.mjs <id>     → output/generator/<id>/review.html (+ review.png)
//
// Top to bottom: what needs a decision (validator and fact-check problems first), the phone
// contact sheet, every claim with its pinned source, the reels frame by frame, the check bank
// with keys, media licences, and the minutes each stage took. It also writes the stage timings
// into the bundle's lineage block, so the shipped data records how it was made.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_EXPORTS, args, bundleFile, caseHash, ensure, loadTs, logStage, outDir, placeContext, readJson, replaceBlock, workDir } from './lib.mjs';

const started = Date.now();
const id = args()._[0];
if (!id) { console.error('usage: review.mjs <id>'); process.exit(2); }
const m = await loadTs(APP_EXPORTS, 'review');
const place = m.PLACES.find(p => p.id === id);
if (!place) throw new Error(`No place ${id}`);
const dir = workDir(id), out = ensure(outDir(id));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const problems = m.validatePlace(place, placeContext(m, id));
const fact = readJson(path.join(dir, 'factcheck.json'));
const cases = await loadTs("export { runCase, guessP } from '@/cases/engines';", 'review-cases');
const log = readJson(path.join(dir, 'log.json'), { stages: [] });
const sources = new Map(place.sources.map(s => [s.id, s]));
const link = id => { const s = sources.get(id); return s ? `<a href="${esc(s.url)}">${esc(id)}</a>${s.revision ? ` <small>rev ${esc(s.revision)}</small>` : ''}` : esc(id); };
const node = m.catalog.get(place.nodeId);
const atlasPath = node ? m.catalog.getPath(node).slice(1).map(n => n.name).join(' › ') : place.nodeId;

// Stage minutes: sum every run of a stage (reruns count), in pipeline order.
const ORDER = ['scaffold', 'facts', 'media-search', 'brief', 'draft', 'register', 'media-check', 'validate', 'factcheck-sheet', 'factcheck', 'fix', 'factcheck-merge', 'render', 'review'];
const totals = new Map();
for (const s of log.stages) if (!s.open) { const t = totals.get(s.stage) ?? { minutes: 0, runs: 0, by: s.by }; t.minutes += s.minutes ?? 0; t.runs++; totals.set(s.stage, t); }
const stageRows = [...totals.entries()].sort((a, b) => (ORDER.indexOf(a[0]) + 99) % 99 - (ORDER.indexOf(b[0]) + 99) % 99);
const sum = by => stageRows.filter(([, t]) => t.by === by).reduce((x, [, t]) => x + t.minutes, 0);
const round = n => Math.round(n * 10) / 10;

// Lineage into the bundle (agent and script minutes per stage).
replaceBlock(bundleFile(id), 'lineage', `lineage: ${JSON.stringify({ pipeline: 'scripts/generate v0', madeAt: new Date().toISOString().slice(0, 10), stages: stageRows.map(([stage, t]) => ({ stage, minutes: round(t.minutes), by: t.by })) }, null, 2)},`);

// Fact-check: disagreements first.
const factUnits = fact?.units ?? [];
const openUnits = factUnits.filter(u => u.verdict !== 'supported');
const factSummary = fact ? Object.entries(factUnits.reduce((a, u) => ({ ...a, [u.verdict]: (a[u.verdict] ?? 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(' · ') : 'not run';
// Units on the current sheet (factcheck.mjs --sheet) that no verdict covers yet, and verdicts on text
// that has since been replaced: both still need a checker, so "None open" must not hide them.
const sheetFile = path.join(dir, 'factcheck-input.md');
const sheetIds = existsSync(sheetFile) ? [...readFileSync(sheetFile, 'utf8').matchAll(/^### (\S+) · /gm)].map(x => x[1]) : [];
// Cases are counted below, so their sheet units (C.<case id>) are left out here.
const awaiting = fact ? sheetIds.filter(uid => !uid.startsWith('C.') && !factUnits.some(u => u.id === uid)) : [];
const superseded = factUnits.filter(u => u.superseded);
// Units only the drafting side has checked ("independent": false) are not checks yet.
const live = factUnits.filter(u => !u.superseded);
// A verdict names its case by ID, or (under the earlier sheet layouts) by position: C2, C2.setup and
// so on count for the second case unless their text names a different case.
const namesCase = (u, c) => {
  const text = [u.id, u.evidence, u.note].join(' ');
  if (text.includes(c.id)) return true;
  const n = (place.cases ?? []).indexOf(c) + 1;
  return (u.id === `C${n}` || u.id.startsWith(`C${n}.`)) && !/\bc_[a-z0-9]{10}\b/.test(text);
};
const selfOnly = live.filter(u => u.independent === false && !(place.cases ?? []).some(c => namesCase(u, c)));
// A case is checked once an independent live verdict names it. A verdict that carries the case's
// hash must match the case as it is now; once any verdict on a case carries a hash, an older one
// without a hash no longer counts, so editing a case after its check can't pass unnoticed.
const caseChecked = c => {
  const on = live.filter(u => u.independent !== false && namesCase(u, c));
  return on.some(u => u.caseHash === caseHash(c)) || (!on.some(u => u.caseHash) && on.length > 0);
};
const casesUnchecked = (place.cases ?? []).filter(c => !caseChecked(c));
const unchecked = awaiting.length + superseded.length + selfOnly.length + casesUnchecked.length;

// Screenshots from render.mjs.
const shotDir = path.join(out, 'shots', id, 'phone');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter(f => f.endsWith('.png') && !f.startsWith('failure')).sort() : [];

const beatSummary = place.pack.beats.map((b, i) => `${i + 1}. ${b.kind}${b.kind === 'sim' ? ` (${b.sim})` : ''}${'gradeId' in b ? ` · ${b.gradeId}${b.transfer ? ' · transfer' : ''}` : ''}`).join('<br>');
const prepared = m.prepare(place.bank).prepared;
const itemRow = e => {
  const it = e.item;
  const key = it.kind === 'choice' ? it.options.find(o => o.id === it.answer).label
    : it.kind === 'flaw' ? `broken step: ${it.steps.find(s => s.id === it.answer).text}`
    : it.kind === 'order' ? it.answer.map(x => it.items.find(i => i.id === x).label).join(' → ')
    : it.kind === 'match' ? Object.entries(it.pairs).map(([l, r]) => `${it.left.find(x => x.id === l).label} → ${it.right.find(x => x.id === r).label}`).join('; ')
    : (() => { const v = m.checkVariant(it, 0); return `${round(v.answer)} ${v.unit} (${v.working})`; })();
  const prompt = it.kind === 'number' ? m.checkVariant(it, 0).prompt : it.prompt;
  return `<tr><td><code>${esc(it.id)}</code><br><small>${esc(it.kind)}${e.transfer ? ' · <b>transfer</b>' : ''}${e.openResponse ? ' · open' : ''}</small></td><td>${esc(prompt)}${it.kind === 'choice' ? `<ul class="opts">${it.options.map(o => `<li${o.id === it.answer ? ' class="key"' : ''}>${esc(o.label)}${o.misconception ? ` <small>${esc(o.misconception)}</small>` : ''}</li>`).join('')}</ul>` : ''}</td><td>${esc(key)}<br><small>${esc(it.explain)}</small></td><td>${it.sources.map(s => link(s.label)).join('<br>')}</td></tr>`;
};
const media = [...Object.entries(place.pack.media).map(([k, v]) => ({ k, v, where: 'pack' })), ...place.reels.flatMap(r => Object.entries(r.media).map(([k, v]) => ({ k, v, where: r.id })))];
const snap = new Map(place.mediaChecks.map(c => [c.page, c]));

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review: ${esc(place.pack.title)}</title>
<style>
:root { --ink:#1d1f24; --muted:#5d6370; --rule:#d9dce2; --bg:#fafaf7; --ok:#1d7a46; --bad:#b3261e; --warn:#8a5a00; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; }
h1 { font: 600 28px/1.2 Georgia, serif; margin: 0 0 4px; } h2 { font: 600 19px/1.3 Georgia, serif; margin: 34px 0 10px; border-top: 1px solid var(--rule); padding-top: 18px; }
small, .muted { color: var(--muted); } code { font-size: 12px; }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 16px 0; }
.card { background: #fff; border: 1px solid var(--rule); border-radius: 6px; padding: 10px 12px; }
.card b { display: block; font-size: 22px; } .ok { color: var(--ok); } .bad { color: var(--bad); } .warn { color: var(--warn); }
table { width: 100%; border-collapse: collapse; background: #fff; font-size: 14px; } td, th { border-top: 1px solid var(--rule); padding: 8px; vertical-align: top; text-align: left; }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; } .shots figure { margin: 0; } .shots img { width: 100%; border: 1px solid var(--rule); border-radius: 4px; } .shots figcaption { font-size: 11px; color: var(--muted); }
.frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; } .frames img { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; }
.opts { margin: 4px 0 0; padding-left: 18px; } .key { font-weight: 600; } .key::after { content: '  ← key'; color: var(--ok); font-weight: 400; }
.open { border-left: 3px solid var(--bad); padding-left: 10px; margin: 8px 0; }
.cmd { background: #fff; border: 1px dashed var(--rule); padding: 8px 10px; font: 13px ui-monospace, monospace; overflow-x: auto; }
@media (max-width: 600px) { td, th { display: block; } tr { display: block; border-top: 1px solid var(--rule); } }
</style></head><body><main>
<p class="muted">Review sheet · ${esc(place.schema)} · generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</p>
<h1>${esc(place.pack.title)}</h1>
<p><b>${esc(atlasPath)}</b> <small>(${esc(place.nodeId)})</small><br>${esc(place.bank.claim)}</p>
<div class="strip">
  <div class="card"><small>Validator (${Object.keys(m.PLACE_RULES).length} rules)</small><b class="${problems.length ? 'bad' : 'ok'}">${problems.length ? `${problems.length} problems` : 'All pass'}</b></div>
  <div class="card"><small>Fact-check (${factUnits.length} units${fact?.independent === true ? ', independent' : fact?.independent === false ? ', not independent' : ''})</small><b class="${openUnits.filter(u => !u.resolved).length || unchecked ? 'bad' : 'ok'}">${openUnits.filter(u => !u.resolved).length ? `${openUnits.filter(u => !u.resolved).length} open` : unchecked ? `${unchecked} unchecked` : 'None open'}</b><small>${esc(factSummary)}</small></div>
  <div class="card"><small>Media licences</small><b class="${place.mediaChecks.some(c => c.restrictions.length) ? 'bad' : 'ok'}">${place.mediaChecks.length} checked</b><small>${esc([...new Set(place.mediaChecks.map(c => c.license))].join(', '))}</small></div>
  <div class="card"><small>Made in</small><b>${round(sum('agent') + sum('script'))} min</b><small>agent ${round(sum('agent'))} · scripts ${round(sum('script'))}</small></div>
</div>
<p>Decide, then record it:</p>
<div class="cmd">node scripts/generate/verdict.mjs ${esc(id)} ship --minutes N<br>node scripts/generate/verdict.mjs ${esc(id)} fix --note "one line" --minutes N<br>node scripts/generate/verdict.mjs ${esc(id)} kill --minutes N</div>

<h2>Needs a look first</h2>
${problems.length ? problems.map(p => `<div class="open"><b>${esc(p.rule)}</b> ${esc(p.message)}</div>`).join('') : '<p class="ok">The validator found nothing.</p>'}
${fact?.checker ? `<p>Fact-checked by ${esc(fact.checker)}${fact.independent === true ? ': <b class="ok">independent</b>, it drafted nothing.' : fact.independent === false ? ': <b class="bad">not independent</b>.' : '.'}${fact.resolution ? `<br><small>${esc(fact.resolution)}</small>` : ''}</p>` : ''}
${awaiting.length ? `<div class="open"><b>No verdict yet (${awaiting.length} units on the current sheet)</b><br>${esc(awaiting.join(', '))}</div>` : ''}
${superseded.map(u => `<div class="open"><b>${esc(u.id)} · verdict on replaced text</b><br>${esc(u.superseded)}</div>`).join('')}
${selfOnly.map(u => `<div class="open"><b>${esc(u.id)} · checked by the drafting side only</b><br>${esc(u.by ?? '')}</div>`).join('')}
${casesUnchecked.length ? `<div class="open"><b>Cases with no independent verdict on their current text (${casesUnchecked.length})</b><br>${esc(casesUnchecked.map(c => `${c.id} ${c.title} (hash ${caseHash(c)})`).join(', '))}</div>` : ''}
${openUnits.length ? openUnits.map(u => `<div class="open"><b>${esc(u.id)} · ${esc(u.verdict)}</b>${u.resolved ? ` <span class="ok">resolved: ${esc(u.resolved)}</span>` : ''}<br>${esc(u.note)}${u.fix ? `<br><small>Suggested fix: ${esc(u.fix)}</small>` : ''}${u.evidence ? `<br><small>Evidence: ${esc(u.evidence)}</small>` : ''}</div>`).join('') : `<p class="ok">${fact ? 'The fact-checker supported every unit.' : 'The fact-check has not run.'}</p>`}

<h2>Contact sheet (phone, 375 px)</h2>
<p class="muted">${esc(place.pack.question)}<br>${beatSummary}</p>
${shots.length ? `<div class="shots">${shots.map(f => `<figure><a href="shots/${esc(id)}/phone/${esc(f)}"><img loading="lazy" src="shots/${esc(id)}/phone/${esc(f)}" alt="${esc(f)}"></a><figcaption>${esc(f.replace('.png', ''))}</figcaption></figure>`).join('')}</div><p><a href="shots/${esc(id)}-contact-phone.png">Full phone contact sheet</a> · desktop shots in shots/${esc(id)}/desktop/</p>` : '<p class="bad">No screenshots: run render.mjs.</p>'}

<h2>Every claim and its source</h2>
<table><tr><th>#</th><th>Claim</th><th>Source</th><th>Fact-check</th></tr>
${place.pack.provenance.map((p, i) => { const u = factUnits.find(x => x.id === `P${i + 1}`); return `<tr><td>P${i + 1}</td><td>${esc(p.claim)}</td><td>${link(p.source)}${place.transferOnlySources.includes(p.source) ? '<br><small>transfer only</small>' : ''}</td><td class="${u?.verdict === 'supported' ? 'ok' : u?.resolved ? 'warn' : 'bad'}">${esc(u?.verdict ?? '—')}${u?.resolved ? ' · resolved' : ''}<br><small>${esc(u?.evidence ?? '')}</small></td></tr>`; }).join('')}
</table>

<h2>New cases (${(place.cases ?? []).length})</h2>
${(place.cases ?? []).map(c => { const o = cases.runCase(c); const opts = c.call.kind === 'pick' ? c.call.options : []; const win = o.truth.kind === 'pick' ? o.truth.win : [];
  return `<h3>${esc(c.title)} <small>${esc(c.id)} · hash ${esc(caseHash(c))} · ${esc(c.model.engine)} engine · a blind call wins ${Math.round(cases.guessP(c.call, o.truth) * 100)}%</small></h3><p>${esc(c.scenario)} <b>${esc(c.ask)}</b></p>${opts.length ? `<ul class="opts">${opts.map(op => `<li${win.includes(op.id) ? ' class="key"' : ''}>${esc(op.label)}</li>`).join('')}</ul>` : ''}<p><small>Computed: ${esc(o.line)}</small></p><p>${esc(c.reveal)}</p><p class="muted">${c.sources.map(src => link(src.label)).join(' · ')}</p>`; }).join('')}

<h2>Reels</h2>
${place.reels.map(r => `<h3>${esc(r.title)} <small>${esc(r.id)}</small></h3><p><b>Prequestion:</b> ${esc(r.prediction.prompt)} <small>(${esc(r.prediction.choices.map(c => c.id === r.prediction.answer ? `[${c.label}]` : c.label).join(' / '))})</small></p>
<div class="frames">${r.frames.map(f => `<div>${f.media ? `<img loading="lazy" src="${esc(r.media[f.media].src)}" alt="">` : ''}<small>${esc(f.text)}</small><br><small class="muted">${f.claims.map(c => esc(r.sources.find(s => s.id === c)?.cite)).join('; ')}</small></div>`).join('')}</div><p class="muted">${esc(r.takeaway)}</p>`).join('')}

<h2>Check bank (${place.bank.items.length} items, ${prepared.filter(e => e.transfer).length} transfer)</h2>
<table><tr><th>Item</th><th>Question</th><th>Key and why</th><th>Sources</th></tr>${prepared.map(itemRow).join('')}</table>

<h2>Media</h2>
<table><tr><th></th><th>File</th><th>Licence (printed / Commons)</th><th>Where</th></tr>
${media.map(({ k, v, where }) => { const c = snap.get(v.page); return `<tr><td><img loading="lazy" src="${esc(v.src)}" alt="" style="width:90px;height:60px;object-fit:cover"></td><td><a href="${esc(v.page)}">${esc(k)}</a><br><small>${esc(v.credit)}</small></td><td class="${c && c.license === v.license && !c.restrictions.length ? 'ok' : 'bad'}">${esc(v.license)} / ${esc(c?.license ?? 'unchecked')}${c?.restrictions.length ? `<br>restrictions: ${esc(c.restrictions.join(', '))}` : ''}</td><td>${esc(where)}</td></tr>`; }).join('')}
</table>

<h2>How it was made</h2>
<table><tr><th>Stage</th><th>By</th><th>Minutes</th><th>Runs</th></tr>${stageRows.map(([s, t]) => `<tr><td>${esc(s)}</td><td>${esc(t.by)}</td><td>${round(t.minutes)}</td><td>${t.runs}</td></tr>`).join('')}</table>
<p class="muted">Bundle: src/places/generated/${esc(id)}.ts · work files: content/generator/${esc(id)}/ · rules: src/places/contract.ts</p>
</main></body></html>`;
writeFileSync(path.join(out, 'review.html'), html);

// A full-page PNG of the sheet, for a phone glance.
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(pathToFileURL(path.join(out, 'review.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'review.png'), fullPage: true });
  await browser.close();
} catch (e) { console.log(`(no PNG: ${e.message})`); }
const minutes = logStage(id, 'review', 'script', started);
console.log(`Review sheet → output/generator/${id}/review.html (${minutes} min). Validator: ${problems.length} problems; fact-check: ${factSummary}.`);
