import type { AutoPlace, QuickItem } from './types';
import type { Beat, Pack } from '../expeditions/content/types';

/*
 * The deterministic gate every generated place passes before it can be published: no model opinion,
 * only rules. A problem names what failed; a place with any problem is held back, never shown broken.
 */

const HYPE = /\b(fascinating|amazing|incredible|delve|journey|tapestry|unlock|in this (lesson|article|section)|according to the (article|text|passage|source))\b/i;
const VAGUE_OPTION = /\b(all|none|both) of (the|these)( above| options| answers)?\b|^\s*(all|none) above\b/i;

/** A citation mark like [3] belongs in `cites`, never in the words a learner reads. */
const MARKED = /\[\d+(,\s*\d+)*\]/;
/** Text saved in the wrong encoding: "a − b" read back as "a â\u0088\u0092 b", or a replacement mark. */
const GARBLED = /[\u0080-\u009f�]|[ÂÃâ][\u0080-¿]/;
const sentenceCount = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length;

function citesOk(cites: unknown, sentences: number): cites is number[] {
  return Array.isArray(cites) && cites.length > 0 && cites.every(n => Number.isInteger(n) && n >= 1 && n <= sentences);
}

/** Problems with one quick-check item, or none. */
export function itemProblems(item: QuickItem, sentences: number): string[] {
  const out: string[] = [];
  if (!item.prompt?.trim() || item.prompt.length > 260) out.push('prompt missing or too long');
  if (!Array.isArray(item.options) || item.options.length !== 4) return [...out, 'needs exactly 4 options'];
  const labels = item.options.map(option => option.label?.trim().toLowerCase());
  if (new Set(labels).size !== 4 || labels.some(label => !label)) out.push('options must be 4 different labels');
  if (new Set(item.options.map(option => option.id)).size !== 4) out.push('option ids must differ');
  if (item.options.some(option => VAGUE_OPTION.test(option.label))) out.push('"all/none of the above" option');
  const right = item.options.find(option => option.id === item.answer);
  if (!right) return [...out, 'answer is not an option'];
  // The right answer gives itself away when it runs far longer than every wrong one.
  const others = item.options.filter(option => option !== right).map(option => option.label.length);
  if (right.label.length > Math.max(...others) * 1.6 && right.label.length > 30) out.push('answer is a giveaway by length');
  if (item.prompt.toLowerCase().includes(right.label.trim().toLowerCase()) && right.label.length > 3) out.push('prompt contains the answer');
  if (!item.explain?.trim()) out.push('explain missing');
  if (!citesOk(item.cites, sentences)) out.push('cites must be source sentence numbers');
  if (HYPE.test(item.prompt) || HYPE.test(item.explain ?? '')) out.push('hype or article-talk');
  if ([item.prompt, item.explain, ...item.options.map(option => option.label)].some(text => MARKED.test(text ?? ''))) out.push('citation mark in the text');
  if ([item.prompt, item.explain, ...item.options.map(option => option.label)].some(text => GARBLED.test(text ?? ''))) out.push('garbled characters');
  return out;
}

/** Problems with a place's page: the summary, the facts and enough usable items. */
export function placeProblems(place: AutoPlace, sentences: number): string[] {
  const out: string[] = [];
  if (!place.summary || place.summary.length < 2 || place.summary.length > 3) out.push('summary must be 2 or 3 sentences');
  for (const line of place.summary ?? []) {
    if (sentenceCount(line.text) !== 1) out.push(`not one sentence: ${line.text}`);
    if (line.text.length > 240) out.push(`too long: ${line.text}`);
    if (!citesOk(line.cites, sentences)) out.push('summary line without valid cites');
    if (HYPE.test(line.text)) out.push(`hype or article-talk: ${line.text}`);
    if (MARKED.test(line.text)) out.push(`citation mark in the text: ${line.text}`);
    if (GARBLED.test(line.text)) out.push(`garbled characters: ${line.text}`);
  }
  if (!place.facts || place.facts.length < 2 || place.facts.length > 5) out.push('needs 2-5 facts');
  for (const fact of place.facts ?? []) {
    if (!fact.label?.trim() || !fact.value?.trim() || fact.value.length > 120) out.push(`bad fact: ${fact.label}`);
    if (!citesOk(fact.cites, sentences)) out.push(`fact without valid cites: ${fact.label}`);
    if (GARBLED.test(`${fact.label} ${fact.value}`)) out.push(`garbled characters: ${fact.label}`);
  }
  if (!place.items || place.items.length < 3) out.push('needs at least 3 items');
  return out;
}

const graded = (beat: Beat) => 'gradeId' in beat;

/** Problems with a generated pack: only the fixed exercise kinds, each one internally consistent. */
export function packProblems(pack: Pack): string[] {
  const out: string[] = [];
  if (!pack.title?.trim() || !pack.question?.trim()) out.push('title and question are required');
  if (GARBLED.test(JSON.stringify(pack.beats) + pack.title + pack.question)) out.push('garbled characters');
  if (pack.beats[0]?.kind !== 'cover') out.push('first beat must be the cover');
  if (pack.beats.at(-1)?.kind !== 'payoff') out.push('last beat must be the payoff');
  const ids = new Set<string>();
  for (const beat of pack.beats) {
    if (graded(beat)) {
      const id = (beat as { gradeId: string }).gradeId;
      if (ids.has(id)) out.push(`duplicate grade ${id}`);
      ids.add(id);
    }
    switch (beat.kind) {
      case 'cover': if (!pack.media[beat.media]) out.push('cover has no picture'); break;
      case 'predict':
        if (!beat.explain?.trim()) out.push('predict without an explanation');
        for (const part of beat.parts) {
          if (part.choices.length < 2 || part.choices.length > 5) out.push('predict needs 2-5 choices');
          if (!part.choices.some(choice => choice.id === part.answer)) out.push('predict answer is not a choice');
        }
        break;
      case 'order': {
        const items = new Set(beat.items.map(item => item.id));
        if (beat.items.length < 3 || beat.answer.length !== beat.items.length || beat.answer.some(id => !items.has(id))) out.push('order answer must use every item once');
        if (new Set(beat.answer).size !== beat.answer.length) out.push('order answer repeats an item');
        if (!beat.ends?.[0] || !beat.ends?.[1]) out.push('order needs both end labels');
        break;
      }
      case 'match': {
        const right = new Set(beat.right.map(item => item.id));
        if (beat.left.length < 3) out.push('match needs at least 3 rows');
        if (beat.left.some(item => !right.has(beat.pairs[item.id]))) out.push('match pairs must point at a right-hand label');
        break;
      }
      case 'flaw':
        if (beat.steps.length < 3 || !beat.steps.some(step => step.id === beat.answer)) out.push('flaw answer must be one of 3+ steps');
        break;
      case 'payoff': if (!beat.idea?.trim()) out.push('payoff needs its idea'); break;
      default: out.push(`beat kind not allowed in a generated pack: ${beat.kind}`);
    }
  }
  if (ids.size < 3) out.push('needs at least 3 graded beats');
  return out;
}

/* ---------- The compiled read and the links out (AutoPlace.read, AutoPlace.links) ---------- */

/** What a read draft looks like before publish: paragraphs only; minutes are computed from the words. */
export interface ReadDraft { paragraphs: { heading?: string; text: string; cites: number[] }[] }
/** A link as an agent writes it in links.json; `verified` and the rest are written back by the live check. */
export interface LinkDraft { id: string; kind: string; title: string; by: string; url: string; minutes?: number; note: string; license?: string; verified?: boolean; checkedAt?: string; fetchedTitle?: string; verifiedUrl?: string }

export const READ_PARAGRAPHS = [4, 8] as const;
export const READ_WORDS = [300, 650] as const;
export const READ_SENTENCES = [2, 6] as const;
/** This many words in a row taken from one source sentence is copying, not paraphrase. */
export const COPY_RUN = 10;
export const LINK_KINDS = ['book', 'course', 'video', 'documentary', 'article', 'primary'] as const;
export const LINK_COUNT = [1, 6] as const;

/** Words to count and compare: case, accents and punctuation do not matter. */
const wordsIn = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
export const wordCount = (text: string) => wordsIn(text).length;
/** Reading time at 200 words a minute, never under a minute. */
export const readMinutes = (paragraphs: readonly { text: string }[]) => Math.max(1, Math.ceil(paragraphs.reduce((sum, p) => sum + wordCount(p.text), 0) / 200));
/** Talk about where the words came from ("the article says"); plain "the source of the Nile" is fine. */
const READ_TALK = /\b(the|this) (article|passage)\b|\b(article|text|passage|source|sentence|sentences) (says|say|states|notes|explains|mentions|tells)\b/i;

/** Every run of COPY_RUN words found in the source sentences. */
function copyRuns(sentences: readonly string[]) {
  const runs = new Set<string>();
  for (const sentence of sentences) {
    const words = wordsIn(sentence);
    for (let i = 0; i + COPY_RUN <= words.length; i += 1) runs.add(words.slice(i, i + COPY_RUN).join(' '));
  }
  return runs;
}
const copiedFrom = (text: string, runs: Set<string>) => {
  const words = wordsIn(text);
  for (let i = 0; i + COPY_RUN <= words.length; i += 1) { const run = words.slice(i, i + COPY_RUN).join(' '); if (runs.has(run)) return run; }
  return null;
};

/** Problems with one paragraph of a read on its own (publish keeps only paragraphs with none). */
export function paragraphProblems(paragraph: ReadDraft['paragraphs'][number], sentences: readonly string[], runs = copyRuns(sentences)): string[] {
  const out: string[] = [];
  const text = typeof paragraph?.text === 'string' ? paragraph.text.trim() : '';
  const head = text.slice(0, 40);
  if (!text) return ['paragraph without text'];
  const count = sentenceCount(text);
  if (count < READ_SENTENCES[0] || count > READ_SENTENCES[1]) out.push(`needs ${READ_SENTENCES[0]}-${READ_SENTENCES[1]} sentences, has ${count}: ${head}...`);
  if (!citesOk(paragraph.cites, sentences.length)) out.push(`cites must be source sentence numbers: ${head}...`);
  const copied = copiedFrom(text, runs);
  if (copied) out.push(`copies ${COPY_RUN}+ words from a source sentence ("${copied}"): ${head}...`);
  if (HYPE.test(text) || READ_TALK.test(text)) out.push(`hype or article-talk: ${head}...`);
  if (MARKED.test(text)) out.push(`citation mark in the text: ${head}...`);
  if (GARBLED.test(text)) out.push(`garbled characters: ${head}...`);
  if (paragraph.heading !== undefined) {
    const heading = typeof paragraph.heading === 'string' ? paragraph.heading.trim() : '';
    if (!heading) out.push('empty heading (leave it out instead)');
    else {
      if (heading.length > 40) out.push(`heading over 40 characters: ${heading}`);
      if (/[.,:;!?…-]$/.test(heading)) out.push(`heading ends in punctuation: ${heading}`);
      if (HYPE.test(heading) || MARKED.test(heading) || GARBLED.test(heading)) out.push(`bad heading: ${heading}`);
    }
  }
  return out;
}

/** Problems with a whole read draft against its numbered source sentences (none = ready to check). */
export function readProblems(draft: ReadDraft, sentences: readonly string[]): string[] {
  const paragraphs = Array.isArray(draft?.paragraphs) ? draft.paragraphs : [];
  const out: string[] = [];
  if (paragraphs.length < READ_PARAGRAPHS[0] || paragraphs.length > READ_PARAGRAPHS[1]) out.push(`needs ${READ_PARAGRAPHS[0]}-${READ_PARAGRAPHS[1]} paragraphs, has ${paragraphs.length}`);
  const words = paragraphs.reduce((sum, p) => sum + wordCount(typeof p?.text === 'string' ? p.text : ''), 0);
  if (words < READ_WORDS[0] || words > READ_WORDS[1]) out.push(`needs ${READ_WORDS[0]}-${READ_WORDS[1]} words, has ${words}`);
  const runs = copyRuns(sentences);
  paragraphs.forEach((paragraph, index) => out.push(...paragraphProblems(paragraph, sentences, runs).map(problem => `paragraph ${index + 1}: ${problem}`)));
  return out;
}

/** Whether a host is on the allowlist; an entry "*.example.org" allows every subdomain of example.org. */
export function hostAllowed(host: string, hosts: readonly string[]): boolean {
  const name = host.toLowerCase();
  return hosts.some(entry => entry.startsWith('*.') ? name.endsWith(entry.slice(1)) : name === entry.toLowerCase());
}

/** Problems with one link on its own (publish keeps only verified links with none). */
export function oneLinkProblems(link: LinkDraft, hosts: readonly string[]): string[] {
  const out: string[] = [];
  const name = typeof link?.id === 'string' ? link.id : '?';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 32) out.push(`${name}: id must be a short lowercase slug`);
  if (!(LINK_KINDS as readonly string[]).includes(link?.kind)) out.push(`${name}: kind must be one of ${LINK_KINDS.join(', ')}`);
  for (const field of ['title', 'by', 'note'] as const) if (typeof link?.[field] !== 'string' || !link[field].trim()) out.push(`${name}: ${field} missing`);
  if (typeof link?.note === 'string' && link.note.length > 140) out.push(`${name}: note over 140 characters`);
  const words = [link?.title, link?.by, link?.note].filter(text => typeof text === 'string').join(' ');
  if (HYPE.test(words)) out.push(`${name}: hype or article-talk`);
  if (MARKED.test(words)) out.push(`${name}: citation mark in the text`);
  if (GARBLED.test(words)) out.push(`${name}: garbled characters`);
  if (link?.minutes !== undefined && !(Number.isInteger(link.minutes) && link.minutes > 0)) out.push(`${name}: minutes must be a whole number above 0`);
  if (link?.license !== undefined && (typeof link.license !== 'string' || !link.license.trim())) out.push(`${name}: license must be text when given`);
  let url: URL | null = null;
  try { url = new URL(link?.url); } catch { out.push(`${name}: url is not a URL`); }
  if (url) {
    if (url.protocol !== 'https:') out.push(`${name}: url must be https`);
    if (url.username || url.password) out.push(`${name}: url must not carry credentials`);
    if (!hostAllowed(url.hostname, hosts)) out.push(`${name}: host not on the allowlist: ${url.hostname}`);
  }
  return out;
}

/** Problems with a place's links.json (none = ready for the live check). */
export function linkProblems(links: readonly LinkDraft[], hosts: readonly string[]): string[] {
  const list = Array.isArray(links) ? links : [];
  const out: string[] = [];
  if (list.length < LINK_COUNT[0] || list.length > LINK_COUNT[1]) out.push(`needs ${LINK_COUNT[0]}-${LINK_COUNT[1]} links, has ${list.length}`);
  const ids = list.map(link => link?.id), urls = list.map(link => typeof link?.url === 'string' ? link.url.trim().replace(/\/$/, '') : link?.url);
  if (new Set(ids).size !== ids.length) out.push('link ids must differ');
  if (new Set(urls).size !== urls.length) out.push('link urls must differ');
  for (const link of list) out.push(...oneLinkProblems(link, hosts));
  return out;
}
