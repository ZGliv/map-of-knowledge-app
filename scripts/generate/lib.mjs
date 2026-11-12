// Shared by the generate-place scripts: paths, a polite fetch, stage timing, marked-block
// rewriting and loading the app's TypeScript (validator, catalogue, registry) into Node.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Never a personal address: a generic bot name, as the Wikimedia API etiquette asks. */
export const USER_AGENT = 'MapOfKnowledge-ContentBot/0.1 (build-time content generator)';

export const workDir = id => path.join(ROOT, 'content/generator', id);
export const outDir = id => path.join(ROOT, 'output/generator', id);
export const bundleFile = id => path.join(ROOT, 'src/places/generated', `${id}.ts`);
export const today = () => new Date().toISOString().slice(0, 10);
export const safeName = id => id.replace(/[^\w.-]+/g, '_');

export function ensure(dir) { mkdirSync(dir, { recursive: true }); return dir; }
export const readJson = (file, fallback) => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
export const writeJson = (file, value) => { ensure(path.dirname(file)); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    const value = next === undefined || next.startsWith('--') ? true : (i++, next);
    out[key] = out[key] === undefined ? value : [out[key], value].flat();
  }
  return out;
}
export const list = value => value === undefined ? [] : [value].flat();

/** A short fingerprint of everything a case shows and computes (not its sources). A fact-check
 * verdict on a case records it, so editing the case after the check shows up as unchecked. */
export const caseHash = c => createHash('sha256').update(JSON.stringify([c.title, c.setting ?? '', c.scenario, c.ask, c.call, c.model, c.run, c.reveal, c.claim, c.entities])).digest('hex').slice(0, 12);

/** GET JSON with the bot User-Agent, one retry, and a pause so we never hammer a public API. */
export async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (res.ok) { await new Promise(r => setTimeout(r, 1000)); return res.json(); }  // >= 1 s apart: other agents share these APIs
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    console.error(`  (${res.status}, retrying)`); await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(`gave up on ${url}`);
}

/** Stage timing, appended to content/generator/<id>/log.json. Agent stages use stage.mjs. */
export function logStage(id, stage, by, startedAt, extra = {}) {
  const file = path.join(workDir(id), 'log.json');
  const log = readJson(file, { id, stages: [] });
  const minutes = Math.round(((Date.now() - startedAt) / 60000) * 10) / 10;
  log.stages = log.stages.filter(s => !(s.stage === stage && s.open));
  log.stages.push({ stage, by, minutes, at: new Date().toISOString(), ...extra });
  writeJson(file, log);
  return minutes;
}

/** Replace the text between `// <generated:NAME>` and `// </generated:NAME>` in a file. */
export function replaceBlock(file, name, body) {
  const text = readFileSync(file, 'utf8');
  const open = `// <generated:${name}>`, close = `// </generated:${name}>`;
  const a = text.indexOf(open), b = text.indexOf(close);
  if (a < 0 || b < a) throw new Error(`${path.relative(ROOT, file)} has no ${open} … ${close} block`);
  const indent = text.slice(text.lastIndexOf('\n', a) + 1, a);
  writeFileSync(file, `${text.slice(0, a + open.length)}\n${body.split('\n').map(line => line ? indent + line : line).join('\n')}\n${indent}${text.slice(b)}`);
}

/** Bundle TypeScript entry points for Node (the app's modules use bundler-style imports). */
export async function loadTs(exportsSource, name = 'mod') {
  const { rolldown } = await import('rolldown');
  const dir = ensure(path.join(ROOT, 'output/generator/.bundle'));
  const input = path.join(dir, `${name}-input.mjs`);
  writeFileSync(input, exportsSource.replaceAll('@/', `${path.join(ROOT, 'src')}/`));
  const bundle = await rolldown({ input, platform: 'node', external: [/\.css$/], moduleTypes: { '.css': 'empty' }, logLevel: 'silent' });
  const file = path.join(dir, `${name}-${Date.now()}.mjs`);
  await bundle.write({ file, format: 'es' });
  await bundle.close();
  return import(pathToFileURL(file).href);
}

/** The place context validatePlace needs, built from the bundled app modules. */
export function placeContext(m, id) {
  const texts = {};
  const dir = path.join(workDir(id), 'sources');
  const index = readJson(path.join(workDir(id), 'sources.json'), []);
  for (const s of index) {
    const file = path.join(dir, `${safeName(s.id)}.json`);
    if (existsSync(file)) texts[s.id] = readJson(file).text;
  }
  return {
    isLeaf: nid => { const node = m.catalog.get(nid); return !!node && m.catalog.getChildren(node).length === 0; },
    nodeName: nid => m.catalog.get(nid)?.name,
    nodeExists: nid => !!m.catalog.get(nid),
    expedition: packId => { const e = m.EXPEDITIONS.find(x => x.pack.id === packId); return e ? { pack: e.pack, nodeId: e.nodeId } : undefined; },
    checks: m.EXPEDITIONS.flatMap(e => m.checksOf(e.pack)),
    narration: JSON.parse(readFileSync(path.join(ROOT, 'src/explore/narration.json'), 'utf8')),
    sourceTexts: texts,
    places: m.PLACES,
  };
}

export const APP_EXPORTS = `
export { catalog } from '@/core/catalog';
export { EXPEDITIONS } from '@/expeditions/registry';
export { checksOf } from '@/explore/validate';
export { PLACES } from '@/places/index';
export { validatePlace, choiceMoments } from '@/places/validate';
export { PLACE_RULES } from '@/places/contract';
export { catalogueText, ARCHETYPES } from '@/expeditions/sims/archetypes';
export { prepare, itemText } from '@/checks/banks/index';
export { checkVariant } from '@/checks/generators';
export { makeVariant } from '@/expeditions/engine/variants';
export { runCase, rightWords } from '@/cases/engines';
`;
