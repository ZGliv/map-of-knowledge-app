// Stage 3a: the drafting brief → content/reels/<date>/brief.md (for an agent) and brief.json (for an
// API model). Same content either way: the templates, the rules, the output schema, and for each
// shortlisted story its place, its media and its pinned sources as numbered sentences.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_EXPORTS, dayDir, loadTs, logStage, readJson, writeJson } from '../lib.mjs';
import { DRAFT_SCHEMA, RULES, TEMPLATES } from '../templates.mjs';

/** A pinned text as sentences, the way the drafter quotes it. */
export function sentences(text) {
  // A full stop (or one inside a closing quote or bracket) ends a sentence, but not after a common
  // abbreviation or an initial ("No. 1", "Op. 23", "St. Paul", "F. Clark").
  return String(text).replace(/\n+/g, ' \n ')
    .split(/(?<!\b(?:No|Op|St|Mr|Mrs|Ms|Dr|Jr|Sr|vs|ca|c|Fig|Vol|pp|Ed|Gen|Lt|Capt|Rev|Mt)\.)(?<!\b[A-Z]\.)(?<=[.!?]["”’)]?)\s+(?=[A-Z0-9“"(‘'])|\s\n\s/)
    .map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 20);
}

const words = text => new Set(String(text).toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
/** The sentences worth a drafter's time: the opening, then those that share the story's telling
 * words (a word in more than a sixth of the article, like its subject's name, tells nothing). */
export function relevant(all, about, { head = 30, more = 30 } = {}) {
  const seen = new Map();
  for (const s of all) for (const w of words(s)) seen.set(w, (seen.get(w) ?? 0) + 1);
  const keys = new Set([...words(about)].filter(w => (seen.get(w) ?? 0) <= Math.max(2, all.length / 6)));
  const scored = all.map((s, i) => ({ i, s, hits: [...words(s)].filter(w => keys.has(w)).length }));
  const keep = new Set(scored.slice(0, head).map(x => x.i));
  for (const x of scored.slice(head).filter(x => x.hits >= 2).sort((a, b) => b.hits - a.hits).slice(0, more)) keep.add(x.i);
  return scored.filter(x => keep.has(x.i));
}

export async function brief(date, { provider = 'agent' } = {}) {
  const started = Date.now();
  const dir = dayDir(date);
  const list = readJson(path.join(dir, 'shortlist.json'));
  if (!list) throw new Error(`No shortlist for ${date}: run pick first`);
  const app = await loadTs(APP_EXPORTS, 'reels-brief');
  // What a reel may not name (the validator's spoiler rule): anything a check at its own place relies
  // on; elsewhere, many-word names ("Daphne Major"), or two names from the same check.
  const spoilers = app.editionSpoilers();
  const within = (node, place) => node === place || node.startsWith(`${place}.`) || place.startsWith(`${node}.`);
  const reservedAt = node => [...new Set(spoilers.filter(s => within(s.node, node)).flatMap(s => s.entities))].sort((a, b) => a.localeCompare(b));
  const reserved = [...new Set(spoilers.flatMap(s => s.entities).filter(e => /\s/.test(e.trim())))].sort((a, b) => a.localeCompare(b));
  const stories = list.stories.map((story, n) => {
    const about = `${story.headline} ${story.claim ?? ''} ${story.subject ?? ''}`;
    // The main source shows its opening and what bears on the story; the others only the latter.
    // The full text is one file away for a drafter who needs more.
    const sources = story.sources.map(source => {
      const text = readJson(path.join(dir, source.file))?.text ?? '';
      const all = sentences(text);
      return { ...source, total: all.length, sentences: relevant(all, about, source.key === 'S1' ? { head: 18, more: 22 } : { head: 4, more: 10 }).map(x => ({ n: x.i + 1, text: x.s })) };
    });
    // A picture's own description, quotable by its page.
    const told = app.REELS.filter(r => r.nodeId === story.place.node).map(r => `${r.title}: ${r.takeaway}`);
    return { n: n + 1, ...story, sources, told, reservedHere: reservedAt(story.place.node) };
  });
  const json = { date, count: list.count, provider, templates: TEMPLATES, rules: RULES, schema: DRAFT_SCHEMA, reserved, stories };
  writeJson(path.join(dir, 'brief.json'), json);

  const md = [];
  md.push(`# Reel brief: ${date}\n`);
  md.push(`Draft **${list.count} reels** from the ${stories.length} stories below (pick the strongest; use at least three different templates; at least two reels from places marked "Try a new case"). Write them to \`content/reels/${date}/drafts.json\` in the schema at the end. Every reel is validated by code and then fact-checked by a separate checker who tries to break every claim.\n`);
  md.push('## Templates\n');
  for (const [id, t] of Object.entries(TEMPLATES)) md.push(`- **${id}** (${t.name}). Fits: ${t.fits}\n  Shape: ${t.shape}\n  Hook: ${t.hook}${t.dated ? '\n  Date-bound: expires the next day.' : ''}`);
  md.push(`\n## Rules\n\n${RULES}\n`);
  md.push(`## Never hand over a check\nA reel plays before any check, so it never names what a check or case relies on. Each story lists the names its own place's checks use. Anywhere, never name these, and never two names from the same check:\n${reserved.join(', ')}\n`);
  md.push(`## Stories (${stories.length})\n`);
  for (const s of stories) {
    md.push(`### ${s.n}. ${s.id}`);
    md.push(`- Kind: ${s.kind}${s.year ? ` (${s.year})` : ''} · score ${s.score.total} · ${s.dateBound ? `date-bound: expires ${s.expires}` : 'evergreen'}`);
    md.push(`- Place: **${s.place.name}** (${s.place.path}) · end card: ${s.place.provable ? '"Try a new case"' : `"Open ${s.place.name}" (no case there yet)`}`);
    md.push(`- Headline (the source's words, do not copy): ${s.headline}`);
    if (s.claim) md.push(`- The place's claim this reel grows from: ${s.claim}`);
    if (s.told.length) md.push(`- Already told at this place (tell something else): ${s.told.join(' | ')}`);
    if (s.reservedHere.length) md.push(`- Never name (this place's checks rely on them): ${s.reservedHere.join(', ')}`);
    md.push('- Media:');
    for (const m of s.media) md.push(`  - **${m.key}** ${m.file} · ${m.width}×${m.height} · ${m.license}${m.mustContain ? ' · SHOW WHOLE (zoom 1)' : ''} · credit: ${m.credit}${m.featured ? ' · featured picture' : ''}\n    description (quotable as source "${m.page}"): ${(m.description || '(none)').slice(0, 300)}`);
    md.push('- Sources:');
    for (const src of s.sources) {
      md.push(`  - **${src.key}** ${src.cite}${src.revision ? ` (rev ${src.revision})` : ''} · ${src.licence} · full text: content/reels/${date}/${src.file} (${src.total} sentences; the opening and the most relevant shown)`);
      for (const sentence of src.sentences) md.push(`    [${src.key}.${sentence.n}] ${sentence.text}`);
    }
    md.push('');
  }
  md.push(`## Output: content/reels/${date}/drafts.json\n\n\`\`\`\n${DRAFT_SCHEMA}\n\`\`\`\n`);
  md.push('A claim that rests on a file\'s description uses the file page URL as its "source" (instead of S1…), and quotes the description.');
  writeFileSync(path.join(dir, 'brief.md'), `${md.join('\n')}\n`);
  const minutes = logStage(date, 'brief', 'script', started, { stories: stories.length, chars: md.join('\n').length });
  console.log(`Brief for ${list.count} reels from ${stories.length} stories → content/reels/${date}/brief.md (${Math.round(md.join('\n').length / 1000)}k characters, ~${Math.round(md.join('\n').length / 4000)}k tokens) (${minutes} min)`);
  return json;
}
