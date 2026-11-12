import { describe, expect, it } from 'vitest';
import type { AutoPlace } from '../auto/types';
import { coreRows, linkRows, minutesLabel, percentLabel, splitLinks, splitProgress } from './shelfModel';

const ID = 'knowledge.science.astronomy.stars';
const base: AutoPlace = {
  schema: 'mok.auto/1', nodeId: ID, name: 'Stars', summary: [], facts: [], items: [],
  source: { title: 'Star', url: 'https://en.wikipedia.org/wiki/Star', revision: 1 },
} as unknown as AutoPlace;
const withAll = {
  ...base,
  read: { minutes: 12, paragraphs: [{ text: 'A star is a ball of plasma.', cites: [] }] },
  pack: { title: 'Why stars shine', minutes: 5 },
  links: [
    { id: 'cosmos', kind: 'documentary', title: 'Cosmos', by: 'Carl Sagan', url: 'https://example.org/cosmos', minutes: 60, note: 'The classic.' },
    { id: 'cosmos', kind: 'book', title: 'Duplicate', by: 'Someone', url: 'https://example.org/dup', note: 'Same id.' },
    { id: 'nourl', kind: 'article', title: 'No url', by: 'Someone', url: '', note: 'Skipped.' },
  ],
} as unknown as AutoPlace;
const progress = (done: number, core: number) => ({ fill: core ? done / core : 0, done, core, charted: core > 0 });

describe('a place’s shelf', () => {
  it('lists card, read and pack, only what the place has', () => {
    expect(coreRows(withAll, ID).map(row => [row.id, row.minutes])).toEqual([[`${ID}#card`, 1], [`${ID}#read`, 12], [`${ID}#pack`, 5]]);
    expect(coreRows(base, ID).map(row => row.kind)).toEqual(['card']);
    expect(coreRows(withAll, 'knowledge.science')).toEqual([]);
    expect(coreRows(null, ID)).toEqual([]);
  });

  it('lists links out once each, with their item ids', () => {
    const rows = linkRows(withAll, ID);
    expect(rows.map(row => row.id)).toEqual([`link:${ID}:cosmos`]);
    expect(rows[0].link.title).toBe('Cosmos');
    expect(linkRows(base, ID)).toEqual([]);
  });

  it('leaves a YouTube link the Watch group shows to that group, every other link out', () => {
    const place = { ...base, links: [
      { id: 'yt', kind: 'video', title: 'Shown', by: 'NASA', url: 'https://www.youtube.com/watch?v=G03N5_13Os0', note: '' },
      { id: 'short', kind: 'video', title: 'Short link', by: 'NASA', url: 'https://youtu.be/LPvfeOiKbm8', note: '' },
      { id: 'other', kind: 'video', title: 'Not in Watch', by: 'NASA', url: 'https://www.youtube.com/watch?v=zukBXehGHas', note: '' },
      { id: 'book', kind: 'book', title: 'A book', by: 'Someone', url: 'https://example.org/book', note: '' },
    ] } as unknown as AutoPlace;
    const { links, inWatch } = splitLinks(linkRows(place, ID), new Set(['G03N5_13Os0', 'LPvfeOiKbm8']));
    expect(links.map(row => row.link.id)).toEqual(['other', 'book']);
    expect([...inWatch].map(([video, row]) => [video, row.id])).toEqual([['G03N5_13Os0', `link:${ID}:yt`], ['LPvfeOiKbm8', `link:${ID}:short`]]);
    expect(splitLinks(linkRows(place, ID), new Set()).links).toHaveLength(4);
  });

  it('never lists a link that is not https', () => {
    const risky = { ...base, links: [
      { id: 'js', kind: 'article', title: 'Script', by: 'x', url: 'javascript:alert(1)', note: '' },
      { id: 'data', kind: 'article', title: 'Data', by: 'x', url: 'data:text/html,hi', note: '' },
      { id: 'plain', kind: 'article', title: 'Plain', by: 'x', url: 'http://example.org/a', note: '' },
      { id: 'bad', kind: 'article', title: 'Bad', by: 'x', url: 'not a url', note: '' },
      { id: 'ok', kind: 'article', title: 'Ok', by: 'x', url: 'https://example.org/b', note: '' },
    ] } as unknown as AutoPlace;
    expect(linkRows(risky, ID).map(row => row.link.id)).toEqual(['ok']);
  });

  it('splits progress into the place itself and everything inside it', () => {
    const rows = coreRows(withAll, ID);
    const done = new Set([`${ID}#card`, `${ID}#pack`]);
    // Own: 1 + 12 + 5 = 18 minutes, 6 finished. Inside: 82 more, 10 finished.
    const split = splitProgress(rows, id => done.has(id), progress(16, 100));
    expect(split.own).toEqual({ done: 6, core: 18, fill: 6 / 18 });
    expect(split.inside).toEqual({ done: 10, core: 82, fill: 10 / 82 });
  });

  it('has no inside line for a place with nothing inside', () => {
    const rows = coreRows(withAll, ID);
    expect(splitProgress(rows, () => false, progress(0, 18)).inside).toBeNull();
  });

  it('counts the place finished when its whole subtree is (older progress lights it)', () => {
    const rows = coreRows(withAll, ID);
    const split = splitProgress(rows, () => false, progress(40, 40));
    expect(split.own).toEqual({ done: 18, core: 18, fill: 1 });
    expect(split.inside).toEqual({ done: 22, core: 22, fill: 1 });
  });

  it('has only an inside line for a place without its own page', () => {
    const split = splitProgress([], () => false, progress(3, 12));
    expect(split.own).toBeNull();
    expect(split.inside).toEqual({ done: 3, core: 12, fill: 0.25 });
  });

  it('says percentages and minutes plainly', () => {
    expect(percentLabel(0)).toBe('0%');
    expect(percentLabel(0.004)).toBe('under 1%');
    expect(percentLabel(0.4)).toBe('40%');
    expect(minutesLabel(1)).toBe('1 core minute');
    expect(minutesLabel(2.25)).toBe('2.3 core minutes');
  });
});
