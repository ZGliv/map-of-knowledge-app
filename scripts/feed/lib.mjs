// Shared by the feed scripts (ingest, tag, build): paths, a polite rate-limited fetch with an
// on-disk cache, JSON helpers, .env.local, and loading the app's TypeScript into Node.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FEED = path.join(ROOT, 'content/feed');
export const CACHE = path.join(ROOT, 'output/feed/cache');
/** A generic bot name and the public site: never a personal address. */
export const USER_AGENT = 'MapOfKnowledge-FeedBot/0.1 (+https://map-of-knowledge.vercel.app)';

export const ensure = dir => { mkdirSync(dir, { recursive: true }); return dir; };
export const readJson = (file, fallback) => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
export const writeJson = (file, value) => { ensure(path.dirname(file)); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    out[key] = next === undefined || next.startsWith('--') ? true : (i++, next);
  }
  return out;
}

/** Keys from .env.local (KEY=value lines), without overriding the real environment. */
export function env(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(ROOT, '.env.local');
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && match[1] === name) return match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return undefined;
}

/**
 * One request at a time per host, at least `gapMs` apart, with retries on 429/5xx. A response can
 * be cached on disk for `maxAgeMs`, so a re-run within the hour never asks again.
 */
export function politeFetch({ gapMs = 700, retries = 4 } = {}) {
  const last = new Map();
  const queue = new Map();
  async function once(url) {
    const host = new URL(url).host;
    const wait = (last.get(host) ?? 0) + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last.set(host, Date.now());
    return fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' }, redirect: 'follow' });
  }
  async function get(url, { maxAgeMs = 0 } = {}) {
    const file = path.join(CACHE, `${createHash('sha1').update(url).digest('hex').slice(0, 20)}.json`);
    if (maxAgeMs > 0) {
      const hit = readJson(file, null);
      if (hit && Date.now() - Date.parse(hit.at) < maxAgeMs) return hit;
    }
    for (let attempt = 0; ; attempt++) {
      const res = await once(url);
      if ((res.status === 429 || res.status >= 500) && attempt < retries) { await sleep(2500 * (attempt + 1)); continue; }
      const out = { url, status: res.status, text: res.ok ? await res.text() : '', at: new Date().toISOString() };
      if (maxAgeMs > 0 && res.ok) writeJson(file, out);
      return out;
    }
  }
  // Same-host requests run in order; different hosts may overlap.
  return (url, options) => { const host = new URL(url).host; const run = (queue.get(host) ?? Promise.resolve()).then(() => get(url, options)); queue.set(host, run.catch(() => {})); return run; };
}

/** Bundle the app's TypeScript (bundler-style imports) into one Node module and import it. */
export async function loadTs(exportsSource, name = 'feed') {
  const { rolldown } = await import('rolldown');
  const dir = ensure(path.join(ROOT, 'output/feed/.bundle'));
  const input = path.join(dir, `${name}-input.mjs`);
  writeFileSync(input, exportsSource.replaceAll('@/', `${path.join(ROOT, 'src')}/`));
  const bundle = await rolldown({ input, platform: 'node', external: [/\.css$/], moduleTypes: { '.css': 'empty' }, logLevel: 'silent' });
  const file = path.join(dir, `${name}-${Date.now()}.mjs`);
  await bundle.write({ file, format: 'es', codeSplitting: false });
  await bundle.close();
  return import(pathToFileURL(file).href);
}
