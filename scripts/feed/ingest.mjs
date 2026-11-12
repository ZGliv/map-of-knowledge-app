// Grow the video catalog (content/feed/catalog.json) from the allowlist (content/feed/channels.json).
//
//   node scripts/feed/ingest.mjs                   every channel: free RSS feeds, then checks
//   node scripts/feed/ingest.mjs --verify          only confirm every channel's feeds answer, and name the channel
//   node scripts/feed/ingest.mjs --channel UC…     one channel
//   node scripts/feed/ingest.mjs --no-check        feeds only, no embeddability checks
//   node scripts/feed/ingest.mjs --backfill 4      with YOUTUBE_API_KEY: up to 4 pages (200 videos) of each
//                                                  channel's Shorts and long-form uploads
//
// Without a key: each channel's three public feeds (latest uploads, latest Shorts, latest long-form,
// ~15 each), then YouTube's oEmbed endpoint for every new video and every video due for its
// refresh: 200 means embeddable (with its player shape: asked by its /shorts/ address, a Short
// answers in portrait), 401 means embedding is off, 404 gone.
// With YOUTUBE_API_KEY (in .env.local), only the cheap Data API v3 endpoints, never search.list:
// channels.list (uploads playlist, 1 unit per 50 channels), playlistItems.list (1 unit per 50
// videos) and videos.list (1 unit per 50 videos) for duration, embeddable, madeForKids and shape.
// Metadata is refreshed within 25 days; anything not confirmed within 30 is dropped (YouTube's
// developer policies). Run it daily: the feeds only reach back ~15 videos, so the pool grows by
// keeping what each run sees. Requests are serial per host with a pause between them, and feed
// responses are cached for three hours in output/feed/cache.
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { FEED, args, env, loadTs, politeFetch, readJson } from './lib.mjs';

const opts = args();
const CATALOG = path.join(FEED, 'catalog.json');
const now = new Date().toISOString();
const m = await loadTs(`export * from '@/feed/ingest/rss'; export * from '@/feed/ingest/catalog';`, 'ingest');
const fetchText = politeFetch({ gapMs: 450 });
const { channels } = readJson(path.join(FEED, 'channels.json'));
const only = typeof opts.channel === 'string' ? channels.filter(c => c.id === opts.channel || c.handle === opts.channel) : channels;
if (!only.length) throw new Error(`No channel ${opts.channel} on the allowlist.`);

if (opts.verify) {
  let bad = 0;
  for (const channel of only) {
    const urls = m.channelFeedUrls(channel.id);
    const [uploads, shorts] = [await fetchText(urls.uploads), await fetchText(urls.shorts)];
    const feed = m.parseYouTubeFeed(uploads.text);
    const ok = uploads.status === 200 && feed.channelId === channel.id && feed.entries.length > 0;
    const short = shorts.status === 200 ? m.parseYouTubeFeed(shorts.text).entries.length : 0;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${channel.id} ${channel.name.padEnd(32)} feed says "${feed.author}" · ${feed.entries.length} latest, ${short} Shorts${feed.author && feed.author !== channel.name ? '  (name differs)' : ''}`);
  }
  console.log(`\n${only.length - bad} of ${only.length} channels verified.`);
  process.exit(bad ? 1 : 0);
}

const stored = readJson(CATALOG, m.createCatalog(now));
const videos = new Map(stored.videos.map(video => [video.id, video]));
const known = new Set(channels.map(c => c.id));
const stats = { channels: 0, feeds: 0, failedFeeds: [], added: 0, checked: 0, embeddable: 0, blocked: 0, gone: 0, dropped: 0, apiUnits: 0 };

// 1. The free feeds.
for (const channel of only) {
  const urls = m.channelFeedUrls(channel.id);
  let added = 0;
  for (const [kind, url] of Object.entries(urls)) {
    const res = await fetchText(url, { maxAgeMs: 3 * 3600_000 });
    if (res.status !== 200) { if (kind === 'uploads') stats.failedFeeds.push(`${channel.name} (${res.status})`); continue; }
    stats.feeds++;
    added += m.mergeEntries(videos, channel.id, m.parseYouTubeFeed(res.text).entries, now).length;
  }
  stats.channels++;
  stats.added += added;
  process.stdout.write(`\r${stats.channels}/${only.length} channels · ${stats.added} new videos   `);
}
process.stdout.write('\n');

// 2. Checks: the Data API when there is a key, else oEmbed.
const key = env('YOUTUBE_API_KEY');
const api = async (endpoint, params) => {
  const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetchText(url);
  stats.apiUnits++;
  if (res.status !== 200) throw new Error(`YouTube Data API ${endpoint} answered ${res.status}. Check the key and its quota.`);
  return JSON.parse(res.text);
};
const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

if (!opts['no-check'] && key) {
  // Backfill older uploads through each channel's upload playlists (never search.list).
  const pages = Number(opts.backfill ?? 0);
  if (pages > 0) {
    for (const group of chunks(only, 50)) {
      const res = await api('channels.list', { part: 'contentDetails', id: group.map(c => c.id).join(','), maxResults: '50' });
      for (const item of res.items ?? []) {
        const uploads = item.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads?.startsWith('UU')) continue;
        for (const [prefix, short] of [['UUSH', true], ['UULF', false]]) {
          let pageToken;
          for (let page = 0; page < pages; page++) {
            let list;
            try { list = await api('playlistItems.list', { part: 'contentDetails', playlistId: prefix + uploads.slice(2), maxResults: '50', ...(pageToken ? { pageToken } : {}) }); } catch { break; }
            for (const entry of list.items ?? []) {
              const id = entry.contentDetails?.videoId;
              if (!id || videos.has(id)) continue;
              videos.set(id, { id, channelId: item.id, title: '', description: '', publishedAt: entry.contentDetails.videoPublishedAt ?? null, short, views: null, firstSeenAt: now, refreshedAt: now, checkedAt: null, checkedBy: null, embeddable: null, aspect: null, durationSec: null, madeForKids: null });
              stats.added++;
            }
            pageToken = list.nextPageToken;
            if (!pageToken) break;
          }
        }
      }
    }
  }
  const due = [...videos.values()].filter(video => known.has(video.channelId) && m.dueForCheck(video, now));
  for (const group of chunks(due, 50)) {
    const res = await api('videos.list', { part: 'snippet,contentDetails,status,player', id: group.map(v => v.id).join(','), maxWidth: '480', maxResults: '50' });
    const found = new Map((res.items ?? []).map(item => [item.id, item]));
    for (const video of group) {
      const item = found.get(video.id);
      videos.set(video.id, item ? m.applyApi(video, item, now) : m.markGone(video, now));
      stats.checked++;
    }
    process.stdout.write(`\rData API: ${stats.checked}/${due.length} videos checked   `);
  }
  process.stdout.write('\n');
} else if (!opts['no-check']) {
  const due = [...videos.values()].filter(video => known.has(video.channelId) && m.dueForCheck(video, now));
  const limit = Number(opts['max-checks'] ?? 3000);
  for (const video of due.slice(0, limit)) {
    const res = await fetchText(`https://www.youtube.com/oembed?${new URLSearchParams({ url: video.short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`, format: 'json' })}`);
    let body = {};
    try { body = res.status === 200 ? JSON.parse(res.text) : {}; } catch { /* treated as unchecked below */ }
    videos.set(video.id, m.applyOembed(video, { status: res.status === 200 && !body.width ? 0 : res.status, width: body.width, height: body.height, title: body.title }, now));
    stats.checked++;
    if (stats.checked % 25 === 0 || stats.checked === Math.min(due.length, limit)) process.stdout.write(`\roEmbed: ${stats.checked}/${Math.min(due.length, limit)} checked   `);
  }
  process.stdout.write('\n');
}

// 3. Drop what can no longer be confirmed (policy), and whatever left the allowlist.
for (const [id, video] of videos) {
  if (!known.has(video.channelId) || m.isStale(video, now)) { videos.delete(id); stats.dropped++; }
}
const list = m.sortVideos(videos.values());
for (const video of list) { if (video.gone) stats.gone++; else if (video.embeddable === true) stats.embeddable++; else if (video.embeddable === false) stats.blocked++; }

// One video per line, so a daily run's diff reads as a list of changes.
writeFileSync(CATALOG, `{"version":1,"updatedAt":${JSON.stringify(now)},"videos":[\n${list.map(video => JSON.stringify(video)).join(',\n')}\n]}\n`);
const shorts = list.filter(v => v.short && v.embeddable).length;
console.log(`${list.length} videos in the catalog (${stats.added} new this run). ${stats.embeddable} embeddable (${shorts} Shorts), ${stats.blocked} with embedding off, ${stats.gone} gone, ${stats.dropped} dropped.`);
console.log(`${stats.feeds} feeds read${stats.failedFeeds.length ? `; failed: ${stats.failedFeeds.join(', ')}` : ''}. ${key ? `Data API: ${stats.apiUnits} requests (≈${stats.apiUnits} quota units).` : 'No YOUTUBE_API_KEY: oEmbed checks only (no durations).'}`);
