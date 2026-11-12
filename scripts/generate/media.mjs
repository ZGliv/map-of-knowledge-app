// Stage 3: find media on Wikimedia Commons, with an automatic licence check.
//
//   node scripts/generate/media.mjs <id> --search "query" [--search …]   candidates → media-candidates.json / .md
//   node scripts/generate/media.mjs <id> --file "File:Name.jpg" [--file …] add specific files as candidates
//   node scripts/generate/media.mjs <id> --check                         snapshot every file the bundle shows
//
// Only files whose Commons licence is on the allowlist survive (public domain, CC0, CC BY,
// CC BY-SA; never NC, ND, GFDL-only or unknown), and only with no "Restrictions" (trademark,
// personality rights…). `--check` re-reads each media page the bundle uses and writes the
// snapshot into the bundle's mediaChecks block; validatePlace compares it with what is printed.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { args, bundleFile, getJson, list, logStage, readJson, replaceBlock, workDir, writeJson } from './lib.mjs';

const started = Date.now();
const a = args();
const id = a._[0];
if (!id) { console.error('usage: media.mjs <id> --search "q" | --file "File:x" | --check'); process.exit(2); }
const API = 'https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280';

const strip = html => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
/** Commons metadata → the short licence name packs print, or null when it is not allowed. */
export function licenceOf(meta) {
  const code = String(meta.License?.value ?? '').toLowerCase();
  const short = String(meta.LicenseShortName?.value ?? '');
  if (/\bnc\b|-nc-|noncommercial|\bnd\b|-nd-|noderiv/i.test(`${code} ${short}`)) return null;
  let m = code.match(/^cc-by-sa-(\d\.\d)/); if (m) return `CC BY-SA ${m[1]}`;
  m = code.match(/^cc-by-(\d\.\d)/); if (m) return `CC BY ${m[1]}`;
  if (code === 'cc0' || /^CC0/.test(short)) return 'CC0';
  if (code === 'pd' || code.startsWith('pd-') || /^public domain$/i.test(short)) return 'Public domain';
  return null;
}
const restrictionsOf = meta => String(meta.Restrictions?.value ?? '').split('|').map(s => s.trim()).filter(Boolean);
function describe(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    title: page.title,
    page: `https://commons.wikimedia.org/wiki/${encodeURI(page.title.replaceAll(' ', '_'))}`,
    src: (info.thumburl ?? info.url).replace(/\?.*$/, ''),
    // (tracking query strings stripped: the validator wants plain Commons URLs)
    original: info.url,
    width: info.width, height: info.height, mime: info.mime,
    license: licenceOf(meta),
    rawLicense: strip(meta.LicenseShortName?.value),
    // No Artist field means Commons metadata is silent, not that the author is unknown: the file
    // page usually names them (read it before crediting).
    author: strip(meta.Artist?.value) || 'author not in Commons metadata: see file page',
    credit: strip(meta.Credit?.value),
    date: strip(meta.DateTimeOriginal?.value),
    description: strip(meta.ImageDescription?.value).slice(0, 300),
    restrictions: restrictionsOf(meta),
  };
}
// OpenStax is barred outright (Zack's rule), whatever licence a Commons copy carries.
const barred = d => /openstax/i.test(`${d.title} ${d.author} ${d.credit ?? ''} ${d.description}`);
const usable = d => d && d.license && !d.restrictions.length && !barred(d) && /^image\/(jpeg|png|webp|svg\+xml|gif)$|^video\//.test(d.mime);

async function byTitles(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 40) {
    const data = await getJson(`${API}&action=query&titles=${encodeURIComponent(titles.slice(i, i + 40).join('|'))}`);
    for (const page of data.query?.pages ?? []) out.push(describe(page) ?? { title: page.title, missing: true });
  }
  return out;
}

if (a.check) {
  const { place } = await import(pathToFileURL(bundleFile(id)).href);
  const pages = [...new Set([...Object.values(place.pack.media), ...place.reels.flatMap(r => Object.values(r.media))].map(m => m.page))];
  const titles = pages.map(p => decodeURIComponent(p.replace('https://commons.wikimedia.org/wiki/', '')).replaceAll('_', ' '));
  const found = await byTitles(titles);
  const checks = [];
  let bad = 0;
  pages.forEach((page, i) => {
    const d = found.find(f => f.title === titles[i]);
    if (!d || d.missing) { console.log(`  MISSING  ${page}`); bad++; return; }
    const ok = !!d.license && !d.restrictions.length;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok      ' : 'REJECTED'} ${d.license ?? d.rawLicense}  ${d.title}${d.restrictions.length ? `  restrictions: ${d.restrictions.join(', ')}` : ''}`);
    checks.push({ page, license: d.license ?? d.rawLicense, author: d.author, restrictions: d.restrictions, checkedAt: new Date().toISOString() });
  });
  replaceBlock(bundleFile(id), 'mediaChecks', `mediaChecks: ${JSON.stringify(checks, null, 2)},`);
  const minutes = logStage(id, 'media-check', 'script', started, { files: pages.length, rejected: bad });
  console.log(`${pages.length} files checked, ${bad} rejected (${minutes} min)`);
  process.exit(bad ? 1 : 0);
}

const file = path.join(workDir(id), 'media-candidates.json');
const candidates = readJson(file, []).filter(c => !barred(c));
const add = d => { if (!candidates.some(c => c.title === d.title)) candidates.push(d); };
let rejected = 0;
for (const query of list(a.search)) {
  const data = await getJson(`${API}&action=query&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=${encodeURIComponent(query)}`);
  const pages = (data.query?.pages ?? []).sort((x, y) => (x.index ?? 0) - (y.index ?? 0));
  for (const page of pages) { const d = describe(page); if (usable(d)) add({ ...d, query }); else rejected++; }
}
for (const d of await byTitles(list(a.file))) { if (usable(d)) add({ ...d, query: 'named' }); else { rejected++; console.log(`  rejected ${d.title}: ${d?.rawLicense ?? 'missing'} ${d?.restrictions?.join(', ') ?? ''}`); } }
writeJson(file, candidates);
writeFileSync(path.join(workDir(id), 'media-candidates.md'), `# Media candidates: ${id}\n\nAll on the licence allowlist with no restrictions. ShareAlike files can only be shown whole (no cover, no documentary pan, no ink tone). CC BY files that are cropped must say "cropped" in the credit.\n\n${candidates.map(c => `- **${c.title}** · ${c.license} · ${c.author}${c.date ? ` · ${c.date}` : ''} · ${c.width}×${c.height}${c.note ? `\n  - note: ${c.note}` : ''}\n  - src: ${c.src}\n  - page: ${c.page}\n  - ${c.description}`).join('\n')}\n`);
const minutes = logStage(id, 'media-search', 'script', started, { candidates: candidates.length, rejected });
console.log(`${candidates.length} usable candidates (${rejected} rejected on licence or restrictions) → content/generator/${id}/media-candidates.md (${minutes} min)`);
