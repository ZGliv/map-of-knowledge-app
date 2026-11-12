// Stage 2: gather and pin the facts.
//
//   node scripts/generate/facts.mjs <id> --wiki "Article title" [--wiki …] [--wikidata Q123 …]
//                                        [--paper "Cite label|https://doi.org/…"] [--pd "Cite label|https://…"]
//
// Wikipedia: the plain-text extract of each article, pinned to its revision ID (CC BY-SA 4.0,
// usable as model input ONLY through the fact sheet: the writer must not copy its prose; the
// validator's clean-room check enforces it). Wikidata: the entity's statements, pinned to
// lastrevid (CC0). Papers and public-domain texts are recorded as citations (facts-only / PD).
// Everything is cached in content/generator/<id>/sources/, with its URL, so reruns are offline.
// Writes:
//   sources.json   the source records (also written into the bundle's sources block)
//   factsheet.md   every extract split into numbered sentences [W1.12], for the drafter and the fact-checker
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { USER_AGENT, args, bundleFile, getJson, list, logStage, readJson, replaceBlock, safeName, today, workDir, writeJson } from './lib.mjs';

const started = Date.now();
const a = args();
const id = a._[0];
if (!id) { console.error('usage: facts.mjs <id> --wiki "Title" …'); process.exit(2); }
const dir = path.join(workDir(id), 'sources');
const index = readJson(path.join(workDir(id), 'sources.json'), []);
const upsert = record => { const i = index.findIndex(s => s.id === record.id); if (i >= 0) index[i] = record; else index.push(record); };

for (const title of list(a.wiki)) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|revisions&explaintext=1&exsectionformat=plain&rvprop=ids|timestamp&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  const page = data.query.pages[0];
  if (page.missing) throw new Error(`No Wikipedia article "${title}"`);
  const revision = String(page.revisions[0].revid);
  const record = {
    id: `Wikipedia: ${page.title}`, kind: 'wikipedia',
    url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title.replaceAll(' ', '_'))}&oldid=${revision}`,
    revision, retrieved: today(), licence: 'CC BY-SA 4.0', usage: ['ai_input'],
  };
  writeJson(path.join(dir, `${safeName(record.id)}.json`), { ...record, api: url, text: page.extract });
  upsert(record);
  console.log(`  ${record.id} @ ${revision}: ${page.extract.length.toLocaleString('en-US')} characters`);
}

for (const qid of list(a.wikidata)) {
  const data = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  const entity = data.entities[qid];
  const label = entity.labels?.en?.value ?? qid;
  // Keep statements compact: property → plain values (items as Q-ids, times, quantities, strings).
  const value = v => v?.datavalue?.value;
  const plain = v => typeof v === 'object' && v ? (v.id ?? v.time ?? (v.amount !== undefined ? `${v.amount} ${v.unit?.split('/').pop() ?? ''}`.trim() : v.text ?? JSON.stringify(v))) : v;
  const claims = Object.fromEntries(Object.entries(entity.claims).map(([p, cs]) => [p, cs.map(c => plain(value(c.mainsnak))).filter(x => x !== undefined)]));
  const record = {
    id: `Wikidata: ${label} (${qid})`, kind: 'wikidata', url: `https://www.wikidata.org/wiki/${qid}`,
    revision: String(entity.lastrevid), retrieved: today(), licence: 'CC0', usage: ['ai_input', 'display'],
  };
  const text = `${label}: ${entity.descriptions?.en?.value ?? ''}\n${Object.entries(claims).map(([p, vs]) => `${p}: ${vs.join('; ')}`).join('\n')}`;
  writeJson(path.join(dir, `${safeName(record.id)}.json`), { ...record, text, claims });
  upsert(record);
  console.log(`  ${record.id} @ ${record.revision}`);
}

for (const [flag, kind, licence, usage] of [['paper', 'paper', 'facts-only', ['ai_input']], ['pd', 'pd-text', 'Public domain', ['ai_input', 'display']], ['ref', 'reference', 'facts-only', ['link_only']]]) {
  for (const spec of list(a[flag])) {
    const [label, url, textUrl] = spec.split('|');
    if (!label || !/^https:\/\//.test(url ?? '')) throw new Error(`--${flag} takes "Cite label|https://…[|https://…plain text]"`);
    const record = { id: label, kind, url, retrieved: today(), licence, usage };
    // A public-domain text can be pinned whole, so quotes are checked against the exact edition.
    if (textUrl) {
      const res = await fetch(textUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`${res.status} ${textUrl}`);
      writeJson(path.join(dir, `${safeName(label)}.json`), { ...record, textUrl, text: await res.text() });
    }
    upsert(record);
    console.log(`  ${label} (${kind}, ${licence})`);
  }
}

writeJson(path.join(workDir(id), 'sources.json'), index);

// A period after an initial ("J. Heinrich Matthaei", "Marshall W. Nirenberg") or an abbreviation
// ("Dr.", "cf.", "e.g.") does not end a sentence. Splitting there dropped the short piece and with
// it the first half of a name, so credit came out wrong (W4.20, W12.51 in genetics-gene-to-protein).
const NOT_AN_END = /(?:^|[\s(“"])(?:[A-Z]|Dr|Drs|Mr|Mrs|Ms|Prof|St|Jr|Sr|Mt|No|Fig|cf|vs|ca|approx|al|e\.g|i\.e)\.$/;
export function splitSentences(text) {
  const pieces = text.replace(/\n+/g, ' \n ').split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])|\s\n\s/).map(t => t.trim());
  const out = [];
  for (const piece of pieces) {
    if (out.length && NOT_AN_END.test(out[out.length - 1]) && piece) out[out.length - 1] += ` ${piece}`;
    else out.push(piece);
  }
  return out;
}

// The fact sheet: numbered sentences, so the drafter cites facts and the checker can find them.
let sheet = `# Fact sheet: ${id}\n\nNumbered sentences from each pinned source. Draft from these facts in your own words: never copy a run of 8 words (the validator checks). Cite the source ID exactly as written in the heading.\n`;
index.forEach((s, n) => {
  const cached = path.join(dir, `${safeName(s.id)}.json`);
  sheet += `\n## [W${n + 1}] ${s.id}\n${s.url} · ${s.licence} · usage: ${s.usage.join(', ')}\n\n`;
  if (!existsSync(cached)) { sheet += '_(cited only; no cached text)_\n'; return; }
  const text = readJson(cached).text;
  const sentences = splitSentences(text).filter(t => t.length > 25);
  sentences.forEach((t, k) => { sheet += `- [W${n + 1}.${k + 1}] ${t}\n`; });
});
writeFileSync(path.join(workDir(id), 'factsheet.md'), sheet);

if (existsSync(bundleFile(id))) {
  replaceBlock(bundleFile(id), 'sources', `sources: ${JSON.stringify(index, null, 2)},`);
}
const minutes = logStage(id, 'facts', 'script', started, { sources: index.length });
console.log(`${index.length} sources pinned; fact sheet at content/generator/${id}/factsheet.md (${minutes} min)`);
