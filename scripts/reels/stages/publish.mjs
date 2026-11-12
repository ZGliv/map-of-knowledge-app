// Stage 5b: publish a day's deck → public/explore/decks/<date>.json, and list it in index.json.
// Every rule runs again on the full record (quotes included); the published copy leaves the quotes
// out (each source's own text stays with the source) and names the evergreen reels to mix in.
import { readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { APP_EXPORTS, dayDir, dayNumber, deckFile, deckIndexFile, loadTs, logStage, readJson, writeJson } from '../lib.mjs';
import { dayContext } from './assemble.mjs';

export const EVERGREEN_PER_DAY = 3;

/** Evergreen reels for a day: the hand-made deck in turn, three a day, carrying on after the last
 * one the previous deck showed, never one shown in the past week, and never on a place the day's new
 * reels already cover. `previous` is the earlier decks' evergreen lists, oldest first. Pure. */
export function evergreenPicks(evergreen, reels, date, previous = [], per = EVERGREEN_PER_DAY) {
  const busy = new Set(reels.map(r => r.nodeId));
  const recent = new Set(previous.slice(-7).flat());
  const last = previous.at(-1)?.at(-1);
  const after = last ? evergreen.findIndex(r => r.id === last) + 1 : (dayNumber(date) * per) % evergreen.length;
  const out = [];
  for (const allowRecent of [false, true]) {
    for (let i = 0; i < evergreen.length && out.length < per; i++) {
      const reel = evergreen[(after + i) % evergreen.length];
      if (out.includes(reel.id) || busy.has(reel.nodeId) || (!allowRecent && recent.has(reel.id))) continue;
      out.push(reel.id); busy.add(reel.nodeId);
    }
  }
  return out;
}

/** The evergreen lists of the decks published before `date`, oldest first. */
function previousPicks(date) {
  const index = readJson(deckIndexFile(), { dates: [] });
  return index.dates.filter(d => d < date).sort().map(d => readJson(deckFile(d), { evergreen: [] }).evergreen ?? []);
}

/** The published form of a reel: no quotes. */
export const published = reel => ({ ...reel, sources: reel.sources.map(({ quote, ...rest }) => rest) });

export async function publish(date) {
  const started = Date.now();
  const record = readJson(path.join(dayDir(date), 'reels.json'));
  if (!record?.reels?.length) throw new Error(`No reels for ${date}`);
  const app = await loadTs(APP_EXPORTS, 'reels-publish');
  const ctx = dayContext(app, date);
  const evergreen = evergreenPicks(app.REELS, record.reels, date, previousPicks(date));
  const errors = app.validateEngineDeck({ date, reels: record.reels, evergreen }, ctx, app.REELS.map(r => r.id));
  if (errors.length) {
    console.log(`Not published: ${errors.length} problems`);
    for (const e of errors) console.log(`  ${e}`);
    return false;
  }
  const deck = { schema: 'mok.deck/1', date, made: new Date().toISOString(), reels: record.reels.map(published), evergreen };
  if (!app.parseDeck(deck) || app.parseDeck(deck).reels.length !== deck.reels.length) throw new Error('the deck does not read back as a playable deck');
  writeJson(deckFile(date), deck);
  // Keep only the pinned texts the published reels cite (the shortlist records the rest by URL and
  // revision, so any can be pinned again); this is what the repository keeps for every day.
  const cited = new Set(record.reels.flatMap(r => r.sources.map(s => s.cite)));
  const sourcesDir = path.join(dayDir(date), 'sources');
  for (const name of readdirSync(sourcesDir)) if (!cited.has(readJson(path.join(sourcesDir, name))?.id)) unlinkSync(path.join(sourcesDir, name));
  const index = readJson(deckIndexFile(), { schema: 'mok.decks/1', dates: [] });
  index.dates = [...new Set([...index.dates, date])].sort();
  writeJson(deckIndexFile(), index);
  const feed = app.todaysSet(app.parseDeck(deck), date, app.REELS, []);
  const minutes = logStage(date, 'publish', 'script', started, { reels: deck.reels.length, evergreen: evergreen.length });
  console.log(`Published public/explore/decks/${date}.json: ${deck.reels.length} new reels + ${evergreen.length} evergreen (${feed.length} in the feed) (${minutes} min)`);
  for (const [i, reel] of feed.entries()) console.log(`  ${String(i + 1).padStart(2)}. ${reel.id}${'template' in reel ? `  [${reel.template}${reel.expires ? `, until ${reel.expires}` : ''}]` : '  [evergreen]'}`);
  return true;
}
