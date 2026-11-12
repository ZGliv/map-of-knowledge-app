// Search the link catalogs (content/links/*.json: open textbooks, encyclopedias, lectures, educator videos)
// for material a place could link out to:
//   node scripts/auto/findlinks.mjs "<words>" [--kind video|book|article|primary|course|documentary] [--source <file slug part>] [--top 12]
// Every query word must appear in an entry's title, topics or author (stems: a trailing "s" is ignored);
// a title hit outranks a topic hit, and the whole phrase in the title outranks both. Prints one JSON entry per line.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'links');
const SMALL = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'is', 'what', 'how', 'why', 'with', 'by', 'from', 'at', 'as']);
const fold = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const wordsOf = text => fold(text).split(/[^a-z0-9]+/).filter(word => word && !SMALL.has(word)).map(word => word.length > 3 ? word.replace(/s$/, '') : word);

/** How well an entry answers the query words (0 = at least one word is missing everywhere). */
export function scoreEntry(entry, query) {
  const wanted = wordsOf(query);
  if (!wanted.length) return 0;
  const title = wordsOf(entry.title), topics = wordsOf((entry.topics ?? []).join(' ')), by = wordsOf(entry.by);
  let score = 0;
  for (const word of wanted) {
    if (title.includes(word)) score += 3;
    else if (topics.includes(word)) score += 2;
    else if (by.includes(word)) score += 1;
    else return 0;
  }
  if (wanted.length > 1 && title.join(' ').includes(wanted.join(' '))) score += 4;
  // A short title that is mostly the query is about the query; a long one only mentions it.
  return score + wanted.length / Math.max(title.length, wanted.length);
}

export function findLinks(entries, query, { kind, top = 12 } = {}) {
  return entries.filter(entry => !kind || entry.kind === kind)
    .map(entry => ({ entry, score: scoreEntry(entry, query) }))
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.url.localeCompare(b.entry.url))
    .slice(0, top).map(hit => hit.entry);
}

export function loadCatalogs(sourcePart) {
  return readdirSync(DIR).filter(file => file.endsWith('.json') && (!sourcePart || file.includes(sourcePart)))
    .flatMap(file => JSON.parse(readFileSync(join(DIR, file), 'utf8')).entries.map(entry => ({ ...entry, catalog: file.slice(0, -5) })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const flag = name => { const at = args.indexOf(`--${name}`); return at < 0 ? undefined : args.splice(at, 2)[1]; };
  const kind = flag('kind'), source = flag('source'), top = Number(flag('top') ?? 12);
  const query = args.join(' ');
  if (!query) { console.error('usage: node scripts/auto/findlinks.mjs "<words>" [--kind video] [--source openstax] [--top 12]'); process.exit(1); }
  const hits = findLinks(loadCatalogs(source), query, { kind, top });
  console.log(hits.length ? hits.map(hit => JSON.stringify(hit)).join('\n') : 'no match');
}
