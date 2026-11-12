// Shared pieces of the generated-places pipeline: Wikipedia, the model call and the spend ledger.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { htmlToText } from './wikitext.mjs';

// 2 = formulas kept from the HTML extract (wikitext.mjs); 1 = the plain-text extract, which flattened them.
export const EXTRACTOR = 2;

export const ROOT = join(import.meta.dirname, '..', '..');
export const WORK = join(ROOT, 'content', 'auto');
export const PUBLISH = join(ROOT, 'public', 'auto');
// Free: Google AI Studio's free tier (no card on the account), so this costs $0. Gemini Flash allows
// only 20 requests a day there; Google's open Gemma models allow far more, and in a bake-off on the
// same source Gemma 4 31B wrote the plainest, best-built questions. The checker is a different model
// (Gemma 4 26B) so a question has to make sense to more than the model that wrote it.
export const DRAFT_MODEL = 'gemma-4-31b-it';
export const CHECK_MODEL = 'gemma-4-26b-a4b-it';

const USER_AGENT = 'MapOfKnowledge-ContentBot/0.1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export const writeJson = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`); };
export const workPath = (nodeId, file) => join(WORK, nodeId, file);

async function wikiQuery(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) { await sleep(1500); return response.json(); }
    if (response.status !== 429 && response.status < 500) throw new Error(`${host} answered ${response.status}`);
    await sleep(Math.max(Number(response.headers.get('retry-after') ?? 0) * 1000, 20000 * (attempt + 1)));
  }
  throw new Error(`${host} kept refusing`);
}

/** Plain sentences a model can cite by number: no headings, no formulas, no reference sections. */
// A sentence that leans on the one before it. When that one is dropped, this one would point at the
// wrong subject ("His paper..." landing on the previous person), so it goes too.
const LEANS = /^(It|Its|This|These|That|Those|Such|There|Here|The latter|The former|In this|At this|By this)\b|\b(he|she|his|her|hers|him|they|their|them)\b/i;

export function sentencesOf(text, limit = 45) {
  const out = [];
  for (const line of text.split('\n')) {
    if (/^(See also|References|Notes|Further reading|External links|Bibliography|Sources)\s*$/i.test(line.trim())) break;
    if (line.trim().length < 60 || !/[.!?]["')]?$/.test(line.trim())) continue;
    let dropped = false;
    for (const sentence of line.trim().split(/(?<=[.!?])\s+(?=[A-Z])/)) {
      if (sentence.length < 30 || sentence.length > 420 || /[{}\\]|displaystyle/.test(sentence) || (dropped && LEANS.test(sentence))) { dropped = true; continue; }
      dropped = false;
      out.push(sentence);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

const page = async title => (await wikiQuery('en.wikipedia.org', {
  action: 'query', redirects: '1', titles: title,
  prop: 'extracts|pageprops|revisions|pageimages|info', exsectionformat: 'plain',
  rvprop: 'ids', piprop: 'name', ppprop: 'disambiguation', inprop: 'url',
})).query?.pages?.[0];

const wordsOf = text => text.toLowerCase().replace(/\(.*?\)/g, ' ').match(/[a-z0-9]+/g)?.map(word => word.replace(/s$/, '')) ?? [];
const SMALL = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'on', 'over', 'to']);
/** How many of these sentences mention every meaningful word of the name. */
export const mentions = (sentences, name) => {
  const words = wordsOf(name).filter(word => !SMALL.has(word));
  return sentences.filter(sentence => { const inside = new Set(wordsOf(sentence)); return words.length > 0 && words.every(word => inside.has(word)); }).length;
};
// A hit is plainly about the place when every word of the name is in its title and the title adds at
// most one word of its own ("Mechanical equilibrium" for Equilibrium, never "Seismic wide-angle
// reflection and refraction" for Reflection and refraction). Words in brackets are a disambiguator.
export const namesPlace = (title, name) => {
  const named = wordsOf(name).filter(word => !SMALL.has(word));
  const inTitle = wordsOf(title).filter(word => !SMALL.has(word));
  return named.every(word => inTitle.includes(word)) && inTitle.filter(word => !named.includes(word)).length <= 1;
};

/** A place's article: its own name if that is an article, otherwise the best search hit within the subject. */
export async function articleFor(name, contexts, subjectWords = []) {
  let found = await page(name);
  // An article under the place's own name can still be about something else ("Independence" is the
  // nations' kind): when its opening never mentions the subject, search within the subject instead.
  const opening = found?.extract ? wordsOf(sentencesOf(htmlToText(found.extract), 5).join(' ')) : [];
  const offSubject = subjectWords.length > 0 && !subjectWords.some(word => opening.includes(word));
  if (!found || found.missing || found.pageprops?.disambiguation !== undefined || offSubject) {
    found = undefined;
    for (const context of contexts) {
    if (found) break;
    const hits = (await wikiQuery('en.wikipedia.org', { action: 'query', list: 'search', srsearch: `${name} ${context}`, srlimit: '5', srnamespace: '0' })).query?.search ?? [];
    // A search hit only counts if it is plainly about this place: every word of the name is in its title.
    for (const hit of hits.filter(hit => namesPlace(hit.title, name) && !/\bnon-/i.test(hit.title)).sort((x, y) => x.title.length - y.title.length)) {
      const candidate = await page(hit.title);
      if (candidate && !candidate.missing && candidate.pageprops?.disambiguation === undefined) { found = candidate; break; }
    }
    }
  }
  if (!found?.extract) return null;
  return { title: found.title, url: found.fullurl, revision: found.revisions?.[0]?.revid ?? 0, imageName: found.pageimage ?? null, extractor: EXTRACTOR, sentences: sentencesOf(htmlToText(found.extract)) };
}

const FREE_LICENCE = /^(CC0|Public domain|PD\b|CC BY(-SA)? \d)/i;
/** The article's lead picture, only from Commons and only under a licence that allows reuse. */
export async function pictureFor(imageName, name) {
  if (!imageName) return null;
  const info = (await wikiQuery('commons.wikimedia.org', { action: 'query', titles: `File:${imageName}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960' })).query?.pages?.[0]?.imageinfo?.[0];
  const license = info?.extmetadata?.LicenseShortName?.value;
  if (!info || !license || !FREE_LICENCE.test(license) || /\b(NC|ND)\b/.test(license)) return null;
  const credit = String(info.extmetadata?.Artist?.value ?? 'Wikimedia Commons').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Wikimedia Commons';
  return { src: info.thumburl ?? info.url, alt: name, credit, license, page: info.descriptionurl };
}

/** The key lives outside the repo so no deploy or commit can carry it. */
const KEY_FILE = join(homedir(), '.config', 'mok', 'gemini.env');
export function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (!existsSync(KEY_FILE)) return null;
  return readFileSync(KEY_FILE, 'utf8').match(/GEMINI_API_KEY=(\S+)/)?.[1] ?? null;
}
export const keyFilePath = KEY_FILE;

const CALLS = join(WORK, 'calls.json');
// Calls start at least 2 seconds apart so a parallel run eases into the per-minute limit.
let lastCall = 0;

/** One JSON call to Gemini's free tier. Every call is counted; nothing here can be billed. */
export async function askJson(model, system, user) {
  const key = apiKey();
  if (!key) throw new Error(`No Gemini key: add GEMINI_API_KEY=... to ${KEY_FILE}`);
  for (let attempt = 0; ; attempt += 1) {
    const start = Math.max(Date.now(), lastCall + 2000);
    lastCall = start;
    await sleep(start - Date.now());
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }),
    });
    const body = await response.json().catch(() => null);
    // Thinking models send their reasoning as parts marked `thought`; only the rest is the answer.
    const text = body?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? '').join('');
    if (!response.ok || !text) {
      if (attempt < 4 && (response.status === 429 || response.status >= 500)) { await sleep(30000 * (attempt + 1)); continue; }
      throw new Error(`${model} answered ${response.status}: ${JSON.stringify(body?.error ?? body).slice(0, 200)}`);
    }
    const log = existsSync(CALLS) ? readJson(CALLS) : { calls: 0, tokens: 0 };
    writeJson(CALLS, { calls: log.calls + 1, tokens: log.tokens + (body.usageMetadata?.totalTokenCount ?? 0) });
    try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch (error) {
      if (attempt < 2) continue;
      throw new Error(`${model} did not return JSON: ${error.message}`);
    }
  }
}
