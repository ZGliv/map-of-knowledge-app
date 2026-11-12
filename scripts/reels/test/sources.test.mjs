import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { apodProblem, parseApod } from '../sources/apod.mjs';
import { commonsFileOf, isBackdrop, pageOf, slug } from '../sources/common.mjs';
import { evergreenStories, overlap } from '../sources/evergreen.mjs';
import { linkedTitles, parseWikimedia } from '../sources/wikimedia.mjs';

// The story sources, on trimmed copies of real API responses (no network in unit tests).
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const featured = fixture('featured-2026-10-23.json');
const otd = fixture('onthisday-10-23.json');

describe('shared story helpers', () => {
  it('read a Commons file only from Commons URLs, never from en.wikipedia uploads', () => {
    expect(commonsFileOf('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Patricia_2015-10-23_1730Z.jpg/1280px-Patricia_2015-10-23_1730Z.jpg')).toBe('File:Patricia 2015-10-23 1730Z.jpg');
    expect(commonsFileOf('https://upload.wikimedia.org/wikipedia/commons/5/57/Paul_F%C3%BCrst.png')).toBe('File:Paul Fürst.png');
    expect(commonsFileOf('https://upload.wikimedia.org/wikipedia/en/4/4a/Non-free_poster.jpg')).toBeNull();
  });

  it('treat years, dates and lists as backdrops, and make stable keys', () => {
    for (const title of ['1906', '4004 BC', 'October 23', '17th century', 'List of hurricanes', 'Deaths in 2026']) expect(isBackdrop(title), title).toBe(true);
    expect(isBackdrop('Hurricane Patricia')).toBe(false);
    expect(slug('Santos-Dumont 14-bis (Oiseau de proie)')).toBe('santos-dumont-14-bis-oiseau-de-proie');
    expect(pageOf({ type: 'disambiguation', title: 'X' })).toBeNull();
  });
});

describe('the Wikimedia feed source', () => {
  const stories = parseWikimedia(featured, otd, '2026-10-23', { today: '2026-10-23' });
  const byKind = kind => stories.filter(story => story.kind === kind);

  it('turns on-this-day events into date-bound stories with their pages and Commons images', () => {
    const patricia = stories.find(story => story.id === 'onthisday:2026-10-23:2015-hurricane-patricia');
    expect(patricia).toMatchObject({ kind: 'this-day', dateBound: true, year: 2015, source: 'wikimedia' });
    expect(patricia.pages[0]).toMatchObject({ title: 'Hurricane Patricia', qid: 'Q21175521' });
    expect(patricia.images).toContain('File:Patricia 2015-10-23 1730Z.jpg');
  });

  it('keeps births and deaths only for people in a field the atlas has', () => {
    const born = byKind('this-day').filter(story => story.group === 'births').map(story => story.pages[0].title);
    expect(born).toEqual(['Carlo Forlivesi', 'Grant Imahara']);
  });

  it('takes the featured article, the picture of the day with its linked articles, and most-read as date-bound', () => {
    expect(byKind('featured')[0]).toMatchObject({ id: 'featured:2026-10-23:thuggee', dateBound: false });
    const picture = byKind('picture')[0];
    expect(picture.images).toEqual(['File:Vodno Telecommunication Tower.jpg']);
    expect(picture.pages.map(page => page.title)).toContain('Vodno');
    expect(picture.text[0].text).toMatch(/Vodno Telecommunication Tower under construction/);
    expect(byKind('mostread').every(story => story.dateBound)).toBe(true);
  });

  it('uses Did-you-know hooks only on their own day (the feed repeats today’s for any future day)', () => {
    const hooks = parseWikimedia(featured, otd, '2026-10-23', { today: '2026-10-23' }).filter(story => story.kind === 'dyk');
    expect(hooks.map(story => story.pages[0].title)).toEqual(['Rancho San Rafael Regional Park', 'Nicolas Gessner']);
    expect(hooks[0].headline).toBe('there were two elephants at the grand opening of Rancho San Rafael Regional Park');
    expect(parseWikimedia(featured, otd, '2026-10-25', { today: '2026-10-23' }).some(story => story.kind === 'dyk')).toBe(false);
  });

  it('finds the bold subject of a hook first', () => {
    expect(linkedTitles('<b><a href="https://en.wikipedia.org/wiki/Rancho_San_Rafael">Rancho San Rafael</a></b> and <a href="https://en.wikipedia.org/wiki/Reno,_Nevada">Reno</a>'))
      .toEqual(['Rancho San Rafael', 'Reno, Nevada']);
  });
});

describe('the NASA APOD source', () => {
  it('rejects the API’s broken scrape, copyrighted pictures and videos', () => {
    const broken = fixture('apod-broken.json');
    expect(apodProblem(broken[0])).toMatch(/broken scrape/);
    expect(apodProblem({ title: 'M31', explanation: 'x', media_type: 'image', url: 'https://apod.nasa.gov/a.jpg', copyright: 'Lucy Yunxi Hu' })).toMatch(/copyright: Lucy/);
    expect(apodProblem({ title: 'A film', explanation: 'x', media_type: 'video', url: 'https://youtube.com/x' })).toMatch(/not an image/);
  });

  it('keeps a public-domain picture as a story whose explanation is pinned text', () => {
    const { stories, rejected } = parseApod([{ date: '2024-01-02', title: 'Earthrise', explanation: 'Apollo 8 saw the Earth rise.', media_type: 'image', url: 'https://apod.nasa.gov/apod/image/earthrise.jpg' }, ...fixture('apod-broken.json')], '2026-10-23');
    expect(stories.map(story => story.id)).toEqual(['apod:2024-01-02:earthrise']);
    expect(stories[0].text[0]).toMatchObject({ licence: 'Public domain (NASA)', url: 'https://apod.nasa.gov/apod/ap240102.html' });
    expect(rejected.length).toBe(2);
  });
});

describe('the evergreen source', () => {
  const pack = {
    id: 'evolution-e99',
    media: { a: { page: 'https://commons.wikimedia.org/wiki/File:Grand_Canyon.jpg' } },
    provenance: [
      { claim: 'Jack Hills zircons formed around 4.404 billion years ago, the oldest terrestrial material found', source: 'Wikipedia: Jack Hills (rev. 1339661666)' },
      { claim: 'A claim only a transfer check uses', source: 'Wikipedia: Siccar Point' },
      { claim: 'Clock times computed in code', source: 'Code: src/expeditions/sims/deepTimeMath.ts' },
      { claim: 'Earth is about 4.54 billion years old', source: 'Wikipedia: Age of Earth' },
      { claim: 'Hutton’s unconformity at Siccar Point shows tilted greywacke under sandstone', source: 'Wikipedia: Hutton’s Unconformity' },
    ],
  };
  const reels = [{ packId: 'evolution-e99', title: 'Six seconds', takeaway: 'Earth is about 4.54 billion years old.', prediction: { prompt: 'How old?' }, frames: [{ text: 'Earth is 4.54 billion years old.' }], sources: [] }];
  const checks = [{ node: 'knowledge.x', text: 'Hutton found an unconformity at Siccar Point: tilted greywacke under red sandstone.' }];
  const stories = evergreenStories({ expeditions: [{ pack, nodeId: 'knowledge.x' }], transferOnly: { 'evolution-e99': ['Wikipedia: Siccar Point'] }, reels, checks }, '2026-10-23');

  it('makes one story per sourced claim, pinned to its Wikipedia articles, with the place and its media', () => {
    expect(stories.map(story => story.claim)).toEqual(['Jack Hills zircons formed around 4.404 billion years ago, the oldest terrestrial material found']);
    expect(stories[0]).toMatchObject({ kind: 'place', place: 'knowledge.x', packId: 'evolution-e99', subject: 'claim:evolution-e99:1', images: ['File:Grand Canyon.jpg'] });
    expect(stories[0].pages.map(page => page.title)).toEqual(['Jack Hills']);
  });

  it('skips transfer-only sources, code and plan citations, claims a reel already tells, and claims a check is built on', () => {
    expect(overlap('Earth is about 4.54 billion years old', reels[0].takeaway)).toBeGreaterThan(0.5);
    expect(stories.some(story => /transfer|Clock|4\.54|unconformity/.test(story.claim))).toBe(false);
  });
});
