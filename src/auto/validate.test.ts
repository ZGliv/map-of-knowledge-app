import { describe, expect, it } from 'vitest';
import type { Pack } from '../expeditions/content/types';
import type { QuickItem } from './types';
import { hostAllowed, itemProblems, linkProblems, packProblems, readMinutes, readProblems, type LinkDraft, type ReadDraft } from './validate';

const item = (over: Partial<QuickItem> = {}): QuickItem => ({
  id: 'q1', prompt: 'A cyclist stops pedalling on flat ground. Why do they slow down?',
  options: [{ id: 'a', label: 'Friction and drag' }, { id: 'b', label: 'Their mass runs out' }, { id: 'c', label: 'Gravity pulls them back' }, { id: 'd', label: 'Inertia wears off' }],
  answer: 'a', explain: 'Friction and air drag oppose the motion.', cites: [2], ...over,
});

describe('generated item gate', () => {
  it('passes a sound item', () => expect(itemProblems(item(), 10)).toEqual([]));
  it('refuses an answer that is not an option', () => expect(itemProblems(item({ answer: 'z' }), 10)).toContain('answer is not an option'));
  it('refuses cites outside the source', () => expect(itemProblems(item({ cites: [11] }), 10)).toContain('cites must be source sentence numbers'));
  it('refuses "all of the above"', () => {
    const options = item().options.map((option, i) => i === 3 ? { ...option, label: 'All of the above' } : option);
    expect(itemProblems(item({ options }), 10)).toContain('"all/none of the above" option');
  });
  it('refuses a giveaway by length', () => {
    const options = item().options.map((option, i) => i === 0 ? { ...option, label: 'Friction with the road together with air drag on the rider and bike' } : option);
    expect(itemProblems(item({ options }), 10)).toContain('answer is a giveaway by length');
  });
  it('refuses a citation mark in the words', () => expect(itemProblems(item({ explain: 'Friction opposes it [2].' }), 10)).toContain('citation mark in the text'));
  it('refuses text saved in the wrong encoding', () => {
    expect(itemProblems(item({ explain: 'So a â\u0088\u0092 b is defined.' }), 10)).toContain('garbled characters');
    expect(itemProblems(item({ explain: 'So a − b = a + (−b), and 2⁸ = 256.' }), 10)).not.toContain('garbled characters');
  });
  it('refuses a prompt holding its answer', () => expect(itemProblems(item({ prompt: 'Is it friction and drag that slows a cyclist?' }), 10)).toContain('prompt contains the answer'));
});

const media = { hero: { src: 'x.jpg', alt: 'x', credit: 'x', page: 'x' } };
const cover: Pack['beats'][number] = { kind: 'cover', media: 'hero', title: 'T', hook: 'H' };
const payoff: Pack['beats'][number] = { kind: 'payoff', idea: 'I', connections: [] };
const flaw = (gradeId: string): Pack['beats'][number] => ({ kind: 'flaw', gradeId, prompt: 'P', steps: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }], answer: 'b', explain: 'E' });
const pack = (beats: Pack['beats']): Pack => ({ id: 'p', title: 'T', question: 'Q', path: [], hue: 40, minutes: 5, media, beats, provenance: [] });

describe('generated pack gate', () => {
  it('passes a sound pack', () => expect(packProblems(pack([cover, flaw('1'), flaw('2'), flaw('3'), payoff]))).toEqual([]));
  it('needs three graded beats', () => expect(packProblems(pack([cover, flaw('1'), payoff]))).toContain('needs at least 3 graded beats'));
  it('refuses a kind that needs custom code', () => {
    expect(packProblems(pack([cover, flaw('1'), flaw('2'), flaw('3'), { kind: 'sim', sim: 'dropTower', title: 'x', goal: 'x', params: {} }, payoff]))).toContain('beat kind not allowed in a generated pack: sim');
  });
});

const SOURCE = [
  'Jupiter is the fifth planet from the Sun and the largest in the Solar System by a wide margin.',
  'It is a gas giant with a mass more than two and a half times that of all the other planets combined.',
  'Its atmosphere is mostly hydrogen and helium, with bands of clouds and a long-lived storm called the Great Red Spot.',
  'Jupiter has at least ninety moons, and the four largest were discovered by Galileo Galilei in 1610.',
];
// About 80 words each in three to four sentences, in words of its own.
const para = (n: number, over: Partial<ReadDraft['paragraphs'][number]> = {}) => ({
  text: `Picture the biggest world circling our star, one that would swallow every other planet with room to spare. Paragraph ${n} tells you that this giant is made mostly of the two lightest gases, so you could never stand on it. Its cloud tops are striped like a ribbon, and one great reddish storm has churned there for centuries. Even its family of moons is large, and four of them were first spotted through an early telescope more than four hundred years ago.`,
  cites: [1, 2, 3, 4], ...over,
});
const read = (count = 4, over: Partial<ReadDraft['paragraphs'][number]> = {}): ReadDraft => ({ paragraphs: Array.from({ length: count }, (_, i) => para(i + 1, i === 0 ? over : {})) });

describe('compiled read gate', () => {
  it('passes a sound read', () => expect(readProblems(read(), SOURCE)).toEqual([]));
  it('counts reading minutes at 200 words a minute, at least one', () => {
    expect(readMinutes(read().paragraphs)).toBe(2);
    expect(readMinutes([{ text: 'Short.' }])).toBe(1);
  });
  it('needs 4 to 8 paragraphs', () => {
    expect(readProblems(read(3), SOURCE)).toContain('needs 4-8 paragraphs, has 3');
    expect(readProblems(read(9), SOURCE).some(p => p.startsWith('needs 4-8 paragraphs'))).toBe(true);
  });
  it('needs 300 to 650 words in all', () => {
    const short = { paragraphs: read().paragraphs.map(p => ({ ...p, text: 'Jupiter is big. It is made of gas.' })) };
    expect(readProblems(short, SOURCE).some(p => p.startsWith('needs 300-650 words'))).toBe(true);
    expect(readProblems(read(8), SOURCE).some(p => p.startsWith('needs 300-650 words'))).toBe(true);
  });
  it('needs 2 to 6 sentences a paragraph', () => {
    expect(readProblems(read(4, { text: para(1).text.replace(/\. /g, ', and ') }), SOURCE).some(p => p.includes('needs 2-6 sentences, has 1'))).toBe(true);
  });
  it('needs valid cites on every paragraph', () => {
    expect(readProblems(read(4, { cites: [] }), SOURCE).some(p => p.startsWith('paragraph 1: cites must be'))).toBe(true);
    expect(readProblems(read(4, { cites: [5] }), SOURCE).some(p => p.startsWith('paragraph 1: cites must be'))).toBe(true);
  });
  it('refuses a run of 10 words copied from a source sentence, whatever the case and punctuation', () => {
    const copied = `${para(1).text} Indeed, IT IS a gas giant with a mass more than two and a half times as much.`;
    expect(readProblems(read(4, { text: copied }), SOURCE).some(p => p.includes('copies 10+ words'))).toBe(true);
    const nine = `${para(1).text} It is a gas giant with a mass more, so heavy.`;
    expect(readProblems(read(4, { text: nine }), SOURCE).some(p => p.includes('copies'))).toBe(false);
  });
  it('refuses hype, article-talk, citation marks and garbled text', () => {
    const base = para(1).text;
    expect(readProblems(read(4, { text: `${base} It is a fascinating place.` }), SOURCE).some(p => p.includes('hype'))).toBe(true);
    expect(readProblems(read(4, { text: `${base} The article says it is big.` }), SOURCE).some(p => p.includes('hype or article-talk'))).toBe(true);
    expect(readProblems(read(4, { text: `${base} It is big [2].` }), SOURCE).some(p => p.includes('citation mark'))).toBe(true);
    expect(readProblems(read(4, { text: `${base} It is â\u0088\u0092 big.` }), SOURCE).some(p => p.includes('garbled'))).toBe(true);
    expect(readProblems(read(4, { text: `${base} Rivers have a source too.` }), SOURCE)).toEqual([]);
  });
  it('keeps headings short and without trailing punctuation', () => {
    expect(readProblems(read(4, { heading: 'What it is made of' }), SOURCE)).toEqual([]);
    expect(readProblems(read(4, { heading: 'What it is made of:' }), SOURCE).some(p => p.includes('heading ends in punctuation'))).toBe(true);
    expect(readProblems(read(4, { heading: 'A heading that runs on far past forty characters' }), SOURCE).some(p => p.includes('heading over 40'))).toBe(true);
    expect(readProblems(read(4, { heading: ' ' }), SOURCE).some(p => p.includes('empty heading'))).toBe(true);
  });
  it('never throws on a malformed draft', () => {
    expect(readProblems({} as ReadDraft, SOURCE).length).toBeGreaterThan(0);
    expect(readProblems({ paragraphs: [null, { text: 3 }] } as unknown as ReadDraft, SOURCE).length).toBeGreaterThan(0);
  });
});

const HOSTS = ['openstax.org', 'www.youtube.com', 'science.nasa.gov', '*.libretexts.org', 'libretexts.org'];
const link = (over: Partial<LinkDraft> = {}): LinkDraft => ({ id: 'openstax-astro', kind: 'book', title: 'Astronomy 2e, chapter 11', by: 'OpenStax', url: 'https://openstax.org/books/astronomy-2e/pages/11-introduction', minutes: 40, note: 'A free college textbook chapter on the giant planets, with clear diagrams.', license: 'CC BY 4.0', ...over });
const nasa = link({ id: 'nasa-jupiter', kind: 'primary', title: 'Jupiter', by: 'NASA', url: 'https://science.nasa.gov/jupiter/', note: 'NASA facts and mission pictures.', license: undefined });

describe('links gate', () => {
  it('passes sound links', () => expect(linkProblems([link(), nasa], HOSTS)).toEqual([]));
  it('allows a listed host and its listed subdomains only', () => {
    expect(hostAllowed('phys.libretexts.org', HOSTS)).toBe(true);
    expect(hostAllowed('libretexts.org', HOSTS)).toBe(true);
    expect(hostAllowed('evil-libretexts.org', HOSTS)).toBe(false);
    expect(hostAllowed('openstax.org.evil.com', HOSTS)).toBe(false);
    expect(hostAllowed('www.coursera.org', HOSTS)).toBe(false);
  });
  it('needs 1 to 6 links', () => {
    expect(linkProblems([], HOSTS)).toContain('needs 1-6 links, has 0');
    expect(linkProblems([link()], HOSTS)).toEqual([]);
    expect(linkProblems(Array.from({ length: 7 }, (_, i) => link({ id: `l${i}`, url: `https://openstax.org/${i}` })), HOSTS)).toContain('needs 1-6 links, has 7');
  });
  it('refuses http and hosts off the allowlist', () => {
    expect(linkProblems([link({ url: 'http://openstax.org/books' }), nasa], HOSTS)).toContain('openstax-astro: url must be https');
    expect(linkProblems([link({ url: 'https://www.coursera.org/learn/astro' }), nasa], HOSTS)).toContain('openstax-astro: host not on the allowlist: www.coursera.org');
    expect(linkProblems([link({ url: 'not a url' }), nasa], HOSTS)).toContain('openstax-astro: url is not a URL');
  });
  it('refuses a kind outside the spec, missing words and a long or hyped note', () => {
    expect(linkProblems([link({ kind: 'podcast' }), nasa], HOSTS).some(p => p.startsWith('openstax-astro: kind must be'))).toBe(true);
    expect(linkProblems([link({ by: '' }), nasa], HOSTS)).toContain('openstax-astro: by missing');
    expect(linkProblems([link({ note: 'x'.repeat(141) }), nasa], HOSTS)).toContain('openstax-astro: note over 140 characters');
    expect(linkProblems([link({ note: 'An amazing journey through the giants.' }), nasa], HOSTS)).toContain('openstax-astro: hype or article-talk');
  });
  it('refuses repeated ids and urls, and bad slugs or minutes', () => {
    expect(linkProblems([link(), link({ id: 'other' })], HOSTS)).toContain('link urls must differ');
    expect(linkProblems([link(), nasa, { ...nasa, url: 'https://science.nasa.gov/saturn/' }], HOSTS)).toContain('link ids must differ');
    expect(linkProblems([link({ id: 'Open Stax' }), nasa], HOSTS)).toContain('Open Stax: id must be a short lowercase slug');
    expect(linkProblems([link({ minutes: 0 }), nasa], HOSTS)).toContain('openstax-astro: minutes must be a whole number above 0');
  });
});
