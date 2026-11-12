// Build the app's pool (src/feed/pool.json) from content/feed: the catalog, the taggers' verdicts
// and the hand overrides. Every place is checked against the real atlas catalog; a place that no
// longer exists moves up to its nearest ancestor, and the report says so.
//
//   node scripts/feed/build.mjs            write the pool and print what is in it
//   node scripts/feed/build.mjs --check    fail if the pool on disk is not what the content builds
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { FEED, ROOT, args, loadTs, readJson } from './lib.mjs';

const opts = args();
const now = new Date().toISOString();
const m = await loadTs(`export { catalog } from '@/core/catalog'; export * from '@/feed/pool'; export * from '@/feed/places'; export * from '@/feed/ingest/catalog';`, 'build');
const POOL = path.join(ROOT, 'src/feed/pool.json');
const { channels } = readJson(path.join(FEED, 'channels.json'));
const report = m.buildPool({
  videos: readJson(path.join(FEED, 'catalog.json'), { videos: [] }).videos,
  tags: readJson(path.join(FEED, 'tags.json'), { tags: {} }).tags,
  overrides: readJson(path.join(FEED, 'overrides.json'), { videos: {} }).videos,
  channels,
  lookup: m.catalog,
  playable: video => m.isPlayable(video, now),
  now,
});
const { pool } = report;
const text = `{"version":1,"builtAt":${JSON.stringify(opts.check ? '' : now)},"channels":${JSON.stringify(pool.channels)},"videos":[\n${pool.videos.map(v => JSON.stringify(v)).join(',\n')}\n]}\n`;
if (opts.check) {
  const disk = readFileSync(POOL, 'utf8').replace(/"builtAt":"[^"]*"/, '"builtAt":""');
  if (disk !== text) { console.error('src/feed/pool.json is out of date: run node scripts/feed/build.mjs'); process.exit(1); }
  console.log('src/feed/pool.json matches content/feed.');
  process.exit(0);
}
writeFileSync(POOL, text);

const territory = id => id.split('.')[1];
const by = (list, key) => list.reduce((acc, item) => (acc[key(item)] = (acc[key(item)] ?? 0) + 1, acc), {});
const perTerritory = by(pool.videos, v => territory(v.places[0]));
const perChannel = by(pool.videos, v => pool.channels[v.channel].name);
console.log(`${pool.videos.length} videos in the pool (${pool.videos.filter(v => v.short).length} Shorts) from ${Object.keys(pool.channels).length} channels.`);
console.log(`Not in it: ${report.rejected} judged not educational, ${report.long} too long for a feed, ${report.untagged} not yet tagged, ${report.unplayable} unplayable or unconfirmed.`);
console.log(`By territory (primary place): ${Object.entries(perTerritory).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`Distinct places: ${new Set(pool.videos.flatMap(v => v.places)).size}. Channels with fewest: ${Object.entries(perChannel).sort((a, b) => a[1] - b[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ')}`);
for (const move of report.moved) console.log(`  moved ${move.id}: ${move.from} → ${move.to}`);
for (const drop of report.dropped) console.log(`  dropped ${drop.id}: ${drop.place}`);
