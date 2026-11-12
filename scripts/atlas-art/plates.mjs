// Finds every atlas place a picture of its own, and never the same picture twice:
//   1. headline places: a hand-written Wikipedia search (their own articles show diagrams or nothing)
//   2. every place: the lead image of the Wikipedia article with its exact name, 50 names a request
//   3. still without one: a Wikimedia Commons file search on its name (with its parent's for context)
// Photos and paintings only: diagrams, logos, flags and maps tone into flat slabs. Answers are cached
// per place, so a rerun asks only about new places. Writes src/atlasArt/plates.generated.ts.
// Run: node scripts/atlas-art/plates.mjs   (paced to Wikimedia's limits; credit: each file's Commons page)
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

// Generic agent string: never a person's email.
const HEADERS = { 'User-Agent': 'MapOfKnowledgePrototype/0.2 (atlas art prototype)' };
const CACHE = 'scripts/atlas-art/.plates-cache-v2.json';
const QUERIES = {
  'knowledge.science': 'Laboratory', 'knowledge.technology': 'Steam turbine', 'knowledge.humanities': 'Library',
  'knowledge.society': 'Crowd', 'knowledge.mathematics': 'Euclid', 'knowledge.arts': 'The arts', 'knowledge.earth': 'Earth', 'knowledge.economics': 'Economics',
  'knowledge.science.physics': 'Lightning', 'knowledge.science.biology': 'Biodiversity', 'knowledge.science.chemistry': 'Laboratory glassware',
  'knowledge.society.psychology': 'Human brain', 'knowledge.society.sociology': 'Sociology', 'knowledge.society.anthropology': 'Ethnography',
  'knowledge.mathematics.foundations': 'Principia Mathematica', 'knowledge.mathematics.algebra': 'Al-Khwarizmi', 'knowledge.mathematics.geometry': "Euclid's Elements",
  'knowledge.mathematics.probability': 'Dice', 'knowledge.economics.markets': 'Marketplace', 'knowledge.economics.institutions': 'Central bank',
  'knowledge.science.biology.genetics-genomes': 'Gregor Mendel', 'knowledge.science.biology.molecules-cells': 'Cell (biology)',
  'knowledge.humanities.languages': 'Rosetta Stone', 'knowledge.science.biology.evolution': 'Darwin tree 1837',
};
const NOT_A_PICTURE = /\.svg|\.gif$|\.pdf|\.tif|diagram|chart|graph|plot|logo|icon|flag_of|map_of|_map|seal_of|coat_of_arms|symbol|equation|formula|signature/i;

let lastCall = 0;
async function api(host, params) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    lastCall = Date.now();
    const response = await fetch(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`, { headers: HEADERS });
    if (response.status === 429) { await new Promise(resolve => setTimeout(resolve, 1000 * (Number(response.headers.get('retry-after')) || 4) * (attempt + 1))); continue; }
    if (!response.ok) throw Error(`${response.status} from ${host}`);
    return response.json();
  }
  throw Error(`rate limited by ${host}`);
}

const fileOf = src => decodeURIComponent(src.split('/').slice(-2, -1)[0] ?? src);
const bare = src => src.split('?')[0];

const nodes = JSON.parse(execFileSync('node', ['scripts/atlas-art/dump-catalog.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 })).filter(node => node.depth > 0);
const byId = new Map(nodes.map(node => [node.id, node]));
const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {};
const save = () => writeFile(CACHE, JSON.stringify(cache));
// One picture, one place: a file already given to a place is never given to another.
const used = new Set(Object.values(cache).filter(Boolean).map(plate => fileOf(plate.src)));
const take = (id, plate) => { cache[id] = plate; used.add(fileOf(plate.src)); };
const free = src => src && !NOT_A_PICTURE.test(fileOf(src)) && !used.has(fileOf(src));
const missing = () => nodes.filter(node => !cache[node.id]);

// --write: only write the generated file from what is already cached (while a long run continues).
const WRITE_ONLY = process.argv.includes('--write');

// 1. Headline places, by hand-written search.
if (!WRITE_ONLY) for (const [id, query] of Object.entries(QUERIES)) {
  if (cache[id] || !byId.has(id)) continue;
  const result = await api('en.wikipedia.org', { action: 'query', generator: 'search', gsrsearch: query, gsrlimit: '3', gsrnamespace: '0', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '960' });
  const page = Object.values(result.query?.pages ?? {}).sort((a, b) => a.index - b.index).find(page => free(page.thumbnail?.source));
  if (page) take(id, { src: bare(page.thumbnail.source), page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` });
}
await save();
console.log(`headlines: ${Object.keys(QUERIES).filter(id => cache[id]).length} of ${Object.keys(QUERIES).length}`);

// 2. Exact article names, fifty to a request. Shallow places first, so a broad place gets its own
// article's picture before a narrower one could take it.
const todo = WRITE_ONLY ? [] : missing().filter(node => !(node.id in QUERIES)).sort((a, b) => a.depth - b.depth);
for (let start = 0; start < todo.length; start += 50) {
  const batch = todo.slice(start, start + 50);
  const result = await api('en.wikipedia.org', { action: 'query', redirects: '1', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '500', titles: batch.map(node => node.name).join('|') });
  // Follow normalisation and redirects back to the names asked for.
  const final = new Map(batch.map(node => [node.name, node.name]));
  for (const step of [...(result.query?.normalized ?? []), ...(result.query?.redirects ?? [])]) for (const [asked, now] of final) if (now === step.from) final.set(asked, step.to);
  const pages = new Map(Object.values(result.query?.pages ?? {}).map(page => [page.title, page]));
  for (const node of batch) {
    const page = pages.get(final.get(node.name));
    const src = page?.thumbnail?.source;
    if (free(src)) take(node.id, { src: bare(src), page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` });
  }
  await save();
  console.log(`titles: ${Math.min(start + 50, todo.length)} of ${todo.length}, ${Object.values(cache).filter(Boolean).length} pictures so far`);
}

// 3. Commons file search for the rest, one place a request.
const rest = WRITE_ONLY ? [] : missing();
let done = 0;
for (const node of rest) {
  const parent = byId.get(node.id.slice(0, node.id.lastIndexOf('.')));
  for (const query of [parent ? `${node.name} ${parent.name}` : node.name, node.name]) {
    const result = await api('commons.wikimedia.org', { action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: '500' });
    const page = Object.values(result.query?.pages ?? {}).sort((a, b) => a.index - b.index)
      .find(page => /image\/(jpeg|png|webp)/.test(page.imageinfo?.[0]?.mime ?? '') && free(page.imageinfo[0].thumburl));
    if (page) { take(node.id, { src: bare(page.imageinfo[0].thumburl), page: page.imageinfo[0].descriptionurl }); break; }
  }
  if (++done % 25 === 0) { await save(); console.log(`commons: ${done} of ${rest.length}`); }
}
await save();

// Headline places draw large: ask for the 960px rendering (one of Wikimedia's standard widths).
const plates = Object.fromEntries(nodes.filter(node => cache[node.id]).map(node => {
  const plate = cache[node.id];
  return [node.id, node.depth <= 2 ? { ...plate, src: plate.src.replace(/\/(lossy-page1-|page1-)?\d+px-/, '/$1960px-') } : plate];
}));
await writeFile('src/atlasArt/plates.generated.ts', `// Generated by scripts/atlas-art/plates.mjs. Do not edit by hand.
// Each place's own picture (credit: see each file's Commons page). No file is used twice.
export const PLATE_OF: Readonly<Record<string, { readonly src: string; readonly page: string }>> = ${JSON.stringify(plates)};
`);
console.log(`${Object.keys(plates).length} of ${nodes.length} places have their own picture`);
if (!WRITE_ONLY) for (const node of missing()) console.log(`  none: ${node.id}`);
