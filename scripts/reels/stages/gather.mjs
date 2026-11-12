// Stage 1: gather candidate stories from every source for a day → content/reels/<date>/candidates.json
import path from 'node:path';
import { APP_EXPORTS, dayDir, loadTs, logStage, writeJson } from '../lib.mjs';
import { fetchApod } from '../sources/apod.mjs';
import { evergreenStories } from '../sources/evergreen.mjs';
import { fetchWikimedia } from '../sources/wikimedia.mjs';

/** Keep the candidates file readable: page extracts trimmed (full text is pinned later, for the shortlist only). */
const compact = story => ({ ...story, pages: story.pages.map(page => ({ ...page, extract: (page.extract ?? '').slice(0, 700) })) });

export async function gather(date) {
  const started = Date.now();
  const app = await loadTs(APP_EXPORTS, 'reels-gather');
  const wikimedia = await fetchWikimedia(date);
  const apod = await fetchApod(date);
  const evergreen = evergreenStories({ expeditions: app.EXPEDITIONS, transferOnly: app.TRANSFER_ONLY_SOURCES, reels: app.REELS, checks: app.editionSpoilers() }, date);
  const stories = [...evergreen, ...wikimedia.stories, ...apod.stories];
  const counts = stories.reduce((acc, s) => ({ ...acc, [s.kind]: (acc[s.kind] ?? 0) + 1 }), {});
  writeJson(path.join(dayDir(date), 'candidates.json'), { date, gatheredAt: new Date().toISOString(), counts, rejected: { apod: apod.rejected }, stories: stories.map(compact) });
  const minutes = logStage(date, 'gather', 'script', started, { stories: stories.length, counts });
  console.log(`${stories.length} candidate stories (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}); APOD rejected ${apod.rejected.length}${apod.rejected[0] ? ` (e.g. ${apod.rejected[0].reason})` : ''} (${minutes} min)`);
  return stories;
}
