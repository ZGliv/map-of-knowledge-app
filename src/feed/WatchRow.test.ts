import { describe, expect, it } from 'vitest';
import type { FeedVideo } from './pool';
import { videosFor, watchScope } from './WatchRow';

const PLACES = ['knowledge.science.physics.mechanics.motion', 'knowledge.science.physics.thermodynamics', 'knowledge.science.chemistry', 'knowledge.arts.music'];
const POOL: FeedVideo[] = PLACES.flatMap((place, p) => [0, 1, 2, 3].map(n => ({
  id: `v${p}${n}`, channel: `UC${n}`, title: `Video ${p}.${n}`, learn: 'Something.', places: [place], short: n % 2 === 0, aspect: n % 2 === 0 ? 0.5625 : 1.778, duration: null, published: `2026-09-0${n + 1}`,
})));

describe('a hub’s Watch row', () => {
  it('lists the place’s own videos first, Shorts and unwatched ahead', () => {
    const watched = { [POOL.find(v => v.places[0] === 'knowledge.science.chemistry' && v.short)!.id]: '2026-10-01T00:00:00Z' };
    const list = videosFor('knowledge.science', POOL, watched);
    expect(list.every(v => v.places[0].startsWith('knowledge.science'))).toBe(true);
    expect(list.length).toBe(POOL.filter(v => v.places[0].startsWith('knowledge.science')).length);
    const chemistry = videosFor('knowledge.science.chemistry', POOL, watched);
    expect(watched[chemistry.at(-1)!.id]).toBeDefined();
    expect(chemistry[0].short).toBe(true);
  });

  it('puts videos saved here first, newest save first, each once, but only ones pinned inside the place', () => {
    const music = POOL.find(v => v.places[0] === 'knowledge.arts.music')!;
    const physics = POOL.filter(v => v.places[0] === 'knowledge.science.physics.thermodynamics');
    const list = videosFor('knowledge.science', POOL, {}, [music.id, physics[1].id, physics[0].id, 'gone-from-pool']);
    expect(list.slice(0, 2).map(v => v.id)).toEqual([physics[1].id, physics[0].id]);
    expect(list.filter(v => v.id === physics[0].id)).toHaveLength(1);
    // Saved under science, but its primary tag is music: it is not science's.
    expect(list.some(v => v.id === music.id)).toBe(false);
    expect(list).toHaveLength(POOL.filter(v => v.places[0].startsWith('knowledge.science')).length);
  });

  it('shows one card per title from a channel: a Short and a long cut of it read as a repeat', () => {
    const base = POOL.find(v => v.places[0] === 'knowledge.science.chemistry')!;
    const twin: FeedVideo = { ...base, id: 'twin', short: !base.short, title: `  ${base.title.toUpperCase()} ` };
    const other: FeedVideo = { ...base, id: 'other', channel: 'UCother' };
    const list = videosFor('knowledge.science.chemistry', [...POOL, twin, other], {});
    expect(list.filter(v => v.title.trim().toLowerCase() === base.title.toLowerCase() && v.channel === base.channel)).toHaveLength(1);
    expect(list.some(v => v.id === 'other')).toBe(true);
  });

  it('matches strictly on the primary tag: no secondary tags, no borrowing from a parent', () => {
    const secondary: FeedVideo = { ...POOL[0], id: 'secondary', title: 'Tagged twice', places: ['knowledge.arts.music', 'knowledge.science.chemistry'] };
    const pool = [...POOL, secondary];
    expect(videosFor('knowledge.science.chemistry', pool, {}).some(v => v.id === 'secondary')).toBe(false);
    expect(videosFor('knowledge.arts.music', pool, {}).some(v => v.id === 'secondary')).toBe(true);
    expect(videosFor('knowledge.arts', pool, {}).some(v => v.id === 'secondary')).toBe(true);
    // A place below the tagged one gets nothing from it, and an empty place gets nothing at all.
    expect(videosFor('knowledge.science.physics.mechanics.motion.acceleration', pool, {})).toEqual([]);
    expect(videosFor('knowledge.science.medicine', pool, {})).toEqual([]);
    expect(videosFor('knowledge.science.chemistry.organic', pool, {})).toEqual([]);
  });

  it('ranks videos pinned right here ahead of ones pinned deeper', () => {
    const here: FeedVideo = { ...POOL[0], id: 'here', title: 'Physics itself', places: ['knowledge.science.physics'], published: '2020-01-01' };
    const list = videosFor('knowledge.science.physics', [...POOL, here], {});
    expect(list[0].id).toBe('here');
    expect(list.every(v => v.places[0].startsWith('knowledge.science.physics'))).toBe(true);
  });

  it('keeps the parent-borrowing scope for the library lab only', () => {
    expect(watchScope('knowledge.science.chemistry', POOL)).toBe('knowledge.science.chemistry');
    expect(watchScope('knowledge.science.medicine', POOL)).toBe('knowledge.science');
    expect(watchScope('knowledge.nowhere', POOL)).toBeNull();
  });
});
