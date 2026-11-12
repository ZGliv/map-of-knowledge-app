// Shared by the reel engine (scripts/reels/engine.mjs): paths, a polite cached fetch, days, stage
// timing and loading the app's TypeScript into Node.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Never a personal address: a generic bot name with a contact URL, as Wikimedia's etiquette asks. */
export const USER_AGENT = 'MapOfKnowledge-ReelBot/0.1 (+https://map-of-knowledge.vercel.app)';

/** Where a day's working files live (committed: the audit trail of every published reel). */
export const dayDir = date => path.join(ROOT, 'content/reels', date);
/** The published deck and its narration. */
export const deckFile = date => path.join(ROOT, 'public/explore/decks', `${date}.json`);
export const deckAudioDir = date => path.join(ROOT, 'public/explore/decks', date);
export const deckIndexFile = () => path.join(ROOT, 'public/explore/decks/index.json');
/** Screenshots and caches (gitignored). */
export const outDir = date => path.join(ROOT, 'output/reelengine', date);
const CACHE = path.join(ROOT, 'output/reelengine/.cache');

export function ensure(dir) { mkdirSync(dir, { recursive: true }); return dir; }
export const readJson = (file, fallback) => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
export const writeJson = (file, value) => { ensure(path.dirname(file)); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
export const safeName = id => id.replace(/[^\w.-]+/g, '_').slice(0, 120);
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

// Days are calendar days, YYYY-MM-DD.
export const isDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export function addDays(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
/** Today's date in UTC, for retrieval stamps. */
export const today = () => new Date().toISOString().slice(0, 10);
export const localDay = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export const dayParts = day => { const [y, m, d] = day.split('-'); return { y, m, d }; };
export const dayNumber = day => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

let lastRequest = 0;
/** GET with the bot User-Agent, a pause between requests, retries on 429/5xx, and an on-disk cache
 * (output/reelengine/.cache) so reruns are fast and offline-safe. `ttlHours: 0` skips the cache.
 * `as`: 'json', 'text' or 'bytes' (a Buffer). */
export async function get(url, { as = 'json', ttlHours = 12, headers = {} } = {}) {
  const key = createHash('sha256').update(`${as} ${url}`).digest('hex').slice(0, 24);
  const file = path.join(CACHE, `${key}.json`);
  if (ttlHours > 0 && existsSync(file)) {
    const hit = JSON.parse(readFileSync(file, 'utf8'));
    if (Date.now() - hit.at < ttlHours * 3_600_000) return as === 'bytes' ? Buffer.from(hit.body, 'base64') : hit.body;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = 120 - (Date.now() - lastRequest);
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: as === 'json' ? 'application/json' : '*/*', ...headers }, redirect: 'follow' });
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (res.status === 404) return null;
    if (res.ok) {
      const body = as === 'json' ? await res.json() : as === 'bytes' ? Buffer.from(await res.arrayBuffer()).toString('base64') : await res.text();
      if (ttlHours > 0) { ensure(CACHE); writeFileSync(file, JSON.stringify({ at: Date.now(), url, body })); }
      return as === 'bytes' ? Buffer.from(body, 'base64') : body;
    }
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    console.error(`  (${res.status} from ${new URL(url).host}, retrying)`);
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`gave up on ${url}`);
}

/** Stage timing, appended to content/reels/<date>/log.json. Agent stages are timed with `engine.mjs stage`. */
export function logStage(date, stage, by, startedAt, extra = {}) {
  const file = path.join(dayDir(date), 'log.json');
  const log = readJson(file, { date, stages: [] });
  const minutes = Math.round(((Date.now() - startedAt) / 60000) * 100) / 100;
  log.stages = log.stages.filter(s => !(s.stage === stage && s.open));
  log.stages.push({ stage, by, minutes, at: new Date().toISOString(), ...extra });
  writeJson(file, log);
  return minutes;
}

/** Bundle the app's TypeScript (bundler-style imports) for Node, as the place engine does. */
export { loadTs } from '../generate/lib.mjs';

/** Everything the engine needs from the app, in one bundle. */
export const APP_EXPORTS = `
export { catalog } from '@/core/catalog';
export { EXPEDITIONS } from '@/expeditions/registry';
export { REELS } from '@/explore/deck';
export { hasCases } from '@/cases/index';
export { proveItRoute } from '@/explore/proveIt';
export { validateEngineReel, validateEngineDeck, reelText, normaliseQuote, DATE_WORDS, SLOP, REEL_LIMITS, TRANSFER_ONLY_SOURCES } from '@/explore/validate';
export { engineContext, editionSpoilers, transferOnlyCites } from '@/explore/engineContext';
export { parseDeck, todaysSet } from '@/explore/today';
export { REEL_TEMPLATES, REEL_LICENSES } from '@/explore/types';
`;
