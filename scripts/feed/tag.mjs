// Classify and tag catalog videos: educational or not, 1–3 atlas places, one line on what you learn.
//
//   node scripts/feed/tag.mjs status               how many playable videos are tagged, waiting, rejected
//   node scripts/feed/tag.mjs export [--size 90]   write batches of untagged videos for a tagger
//   node scripts/feed/tag.mjs import               validate the answered batches and merge them into tags.json
//   node scripts/feed/tag.mjs sample [--n 40]      print a random sample of tags for a spot check
//   node scripts/feed/tag.mjs places               the place list taggers choose from
//
// Taggers are providers (scripts/feed/taggers.mjs). Today's is `batch`: export writes each batch,
// with its instructions, to output/feed/batches/<name>.json; an agent answers it in
// <name>.answer.json; import checks every answer against the real catalog before keeping it. A
// nightly API model plugs in as another provider with the same prompt and the same checks.
//
// Corrections: content/feed/overrides.json wins over any tagger, per video (places, learn,
// educational). Edit it by hand, then run scripts/feed/build.mjs.
import path from 'node:path';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { FEED, ROOT, args, ensure, loadTs, readJson } from './lib.mjs';
import { TAGGERS, placeList, validateVerdicts } from './taggers.mjs';

const opts = args();
const [command = 'status'] = opts._;
const now = new Date().toISOString();
const BATCHES = ensure(path.join(ROOT, 'output/feed/batches'));
const TAGS = path.join(FEED, 'tags.json');
const m = await loadTs(`export { catalog } from '@/core/catalog'; export * from '@/feed/places'; export * from '@/feed/ingest/catalog';`, 'tag');
const catalog = readJson(path.join(FEED, 'catalog.json'), { videos: [] });
const { channels } = readJson(path.join(FEED, 'channels.json'));
const channelName = new Map(channels.map(c => [c.id, c.name]));
const tags = readJson(TAGS, { version: 1, tags: {} }).tags;
const playable = catalog.videos.filter(video => m.isPlayable(video, now));
const places = placeList(m);

const saveTags = () => {
  const ids = Object.keys(tags).sort();
  writeFileSync(TAGS, `{"version":1,"tags":{\n${ids.map(id => `${JSON.stringify(id)}:${JSON.stringify(tags[id])}`).join(',\n')}\n}}\n`);
};

if (command === 'places') {
  for (const place of places) console.log(`${place.id}  ${place.path}`);
} else if (command === 'status') {
  const tagged = playable.filter(video => tags[video.id]);
  const kept = tagged.filter(video => tags[video.id].educational);
  console.log(`${playable.length} playable videos: ${tagged.length} classified (${kept.length} educational, ${tagged.length - kept.length} rejected), ${playable.length - tagged.length} waiting.`);
} else if (command === 'export') {
  const tagger = TAGGERS[opts.tagger ?? 'batch'];
  const waiting = playable.filter(video => !tags[video.id]);
  const size = Number(opts.size ?? 90);
  // Interleave channels so every batch sees a mix, and a tagger's habits never cluster on one channel.
  const byChannel = new Map();
  for (const video of waiting) byChannel.set(video.channelId, [...(byChannel.get(video.channelId) ?? []), video]);
  const mixed = [];
  for (let round = 0; mixed.length < waiting.length; round++) for (const list of byChannel.values()) if (list[round]) mixed.push(list[round]);
  const existing = readdirSync(BATCHES).filter(file => /^batch-\d+\.json$/.test(file)).length;
  const written = [];
  for (let i = 0; i < mixed.length; i += size) {
    const name = `batch-${String(existing + written.length + 1).padStart(2, '0')}`;
    const candidates = mixed.slice(i, i + size).map(video => ({ id: video.id, channel: channelName.get(video.channelId), title: video.title, description: video.description.slice(0, 320), short: video.short }));
    written.push(tagger.export({ name, dir: BATCHES, candidates, places }));
  }
  console.log(`${waiting.length} videos waiting → ${written.length} batches:\n${written.map(file => `  ${path.relative(ROOT, file)}`).join('\n')}`);
} else if (command === 'import') {
  const tagger = TAGGERS[opts.tagger ?? 'batch'];
  const byId = new Map(catalog.videos.map(video => [video.id, video]));
  let kept = 0, problems = 0;
  for (const answer of tagger.answers(BATCHES)) {
    const { verdicts, issues } = validateVerdicts(answer.verdicts, answer.expected, m.catalog, m.checkPlaces);
    for (const issue of issues) { problems++; console.log(`  ${answer.name}: ${issue}`); }
    for (const verdict of verdicts) {
      if (!byId.has(verdict.id)) continue;
      tags[verdict.id] = { ...verdict, by: `${tagger.name}:${answer.name}`, at: now };
      kept++;
    }
  }
  saveTags();
  console.log(`${kept} verdicts kept, ${problems} problems reported. Run scripts/feed/build.mjs next.`);
} else if (command === 'sample') {
  const n = Number(opts.n ?? 40);
  const pool = playable.filter(video => tags[video.id]);
  let seed = Number(opts.seed ?? Date.now()) % 2147483647 || 1;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const picked = [...pool].sort(() => random() - 0.5).slice(0, n);
  for (const video of picked) {
    const tag = tags[video.id];
    console.log(`\n${video.id}  [${channelName.get(video.channelId)}] ${video.title}`);
    console.log(tag.educational ? `  → ${tag.places.join(', ')}\n  “${tag.learn}”` : `  ✗ rejected: ${tag.reason}`);
  }
} else {
  console.error(`Unknown command ${command}.`);
  process.exit(1);
}
if (command === 'export' && !existsSync(TAGS)) saveTags();
