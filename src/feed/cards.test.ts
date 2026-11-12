import { describe, expect, it } from 'vitest';
import type { Reel } from '../explore/types';
import { cardId, reelItemId, type CoreMinutes } from '../shelf/types';
import { branchOf, cardQueue, isCardSlot, isReelSlot, isRootScope, parentScope, scopeReels, scopeState, scopeVideos } from './cards';
import { createFeedMemory } from './memory';
import { effectiveScope } from './scope';
import type { FeedVideo } from './pool';
import { createPlan, extendPlan, replanAfter, type FeedItem, type PlanContext } from './recommend';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const video = (id: string, places: string[], channel = `UC${id}`): FeedVideo => ({ id, channel, title: `Video ${id}`, learn: 'Something.', places, short: true, aspect: 0.5625, duration: null, published: '2026-09-01', views: 1000 });
const POOL: FeedVideo[] = [
  video('a1', ['knowledge.science.astronomy.stars']),
  video('a2', ['knowledge.science.astronomy']),
  video('a3', ['knowledge.science.astronomy.planets.mars']),
  video('p1', ['knowledge.science.physics', 'knowledge.science.astronomy.stars']),
  video('h1', ['knowledge.humanities.history']),
  video('x1', ['knowledge.science.astronomyish']),
];
const CORE: Record<string, CoreMinutes> = {
  'knowledge.science': [1, 0, 5],
  'knowledge.science.astronomy': [1, 0, 5],
  'knowledge.science.astronomy.stars': [1, 4, 0],
  'knowledge.science.astronomy.planets': [1, 0, 0],
  'knowledge.science.astronomy.planets.mars': [1, 0, 0],
  'knowledge.science.physics': [1, 0, 5],
  'knowledge.science.physics.optics': [0, 0, 5],
  'knowledge.mathematics': [1, 0, 0],
  'knowledge.mathematics.geometry': [1, 0, 0],
  'knowledge.humanities.history': [1, 0, 5],
};
const NONE: ReadonlySet<string> = new Set();
const NO_MAP = { focus: null, recent: [], pinned: [], lit: [] };
const context = (pool: readonly FeedVideo[], cards: readonly string[], reels: readonly Reel[] = []): PlanContext => ({ pool, signals: NO_MAP, memory: createFeedMemory(), seed: 'test', cards, reels });
const reel = (id: string, nodeId = 'knowledge.science.astronomy'): Reel => ({ id, nodeId, title: `Reel ${id}` }) as unknown as Reel;
const kinds = (items: readonly FeedItem[]) => items.map(item => item.kind);

describe('scope filter', () => {
  it('keeps every video at the root, and none of a sibling with a shared prefix inside a scope', () => {
    expect(isRootScope('knowledge')).toBe(true);
    expect(isRootScope(undefined)).toBe(true);
    expect(isRootScope('knowledge.science')).toBe(false);
    expect(scopeVideos(POOL, 'knowledge').map(v => v.id)).toEqual(POOL.map(v => v.id));
    expect(scopeVideos(POOL, 'knowledge.science.astronomy').map(v => v.id)).toEqual(['a1', 'a2', 'a3']);
  });
  it('reads only the primary tag: a secondary tag inside the scope does not bring a video in', () => {
    expect(scopeVideos(POOL, 'knowledge.science.astronomy.stars').map(v => v.id)).toEqual(['a1']);
    expect(scopeVideos(POOL, 'knowledge.science.physics').map(v => v.id)).toEqual(['p1']);
  });
  it('never climbs to ancestors: a video on a field is not in a scope below it', () => {
    expect(scopeVideos(POOL, 'knowledge.science.astronomy.planets').map(v => v.id)).toEqual(['a3']);
  });
  it('scopes reels by their node', () => {
    const reels = [{ id: 'r1', nodeId: 'knowledge.science.astronomy.stars' }, { id: 'r2', nodeId: 'knowledge.arts.music' }];
    expect(scopeReels(reels, 'knowledge.science').map(r => r.id)).toEqual(['r1']);
    expect(scopeReels(reels, 'knowledge').map(r => r.id)).toEqual(['r1', 'r2']);
  });
  it('knows one level up', () => {
    expect(parentScope('knowledge.science.astronomy')).toBe('knowledge.science');
    expect(parentScope('knowledge.science')).toBe('knowledge');
    expect(parentScope('knowledge')).toBeNull();
  });
});

describe('card queue', () => {
  it('holds the places inside the scope that have a card, and only those', () => {
    const queue = cardQueue({ core: CORE, scope: 'knowledge.science.astronomy', done: NONE, seed: 's' });
    expect([...queue].sort()).toEqual(['knowledge.science.astronomy', 'knowledge.science.astronomy.planets', 'knowledge.science.astronomy.planets.mars', 'knowledge.science.astronomy.stars']);
    // Optics has a pack but no card.
    expect(cardQueue({ core: CORE, scope: 'knowledge.science.physics', done: NONE, seed: 's' })).toEqual(['knowledge.science.physics']);
    expect(cardQueue({ core: CORE, scope: 'knowledge.arts', done: NONE, seed: 's' })).toEqual([]);
  });
  it('puts the cards not done first', () => {
    const done = new Set([cardId('knowledge.science.astronomy'), cardId('knowledge.science.astronomy.stars')]);
    const queue = cardQueue({ core: CORE, scope: 'knowledge.science.astronomy', done, seed: 's' });
    expect(queue.slice(0, 2).sort()).toEqual(['knowledge.science.astronomy.planets', 'knowledge.science.astronomy.planets.mars']);
    expect(queue.slice(2).sort()).toEqual(['knowledge.science.astronomy', 'knowledge.science.astronomy.stars']);
  });
  it('is the same for the same seed, and leads with places near the top of the scope', () => {
    const a = cardQueue({ core: CORE, scope: 'knowledge', done: NONE, seed: 'one' });
    expect(cardQueue({ core: CORE, scope: 'knowledge', done: NONE, seed: 'one' })).toEqual(a);
    expect(a).toHaveLength(9);
    const depth = (id: string) => id.split('.').length;
    // The deepest place never comes before every shallow one.
    expect(depth(a[0])).toBeLessThanOrEqual(3);
    expect(a.indexOf('knowledge.science.astronomy.planets.mars')).toBeGreaterThan(a.findIndex(id => depth(id) === 2));
  });
  it('moves between branches of the scope rather than running one down', () => {
    const core: Record<string, CoreMinutes> = {};
    for (const territory of ['science', 'arts', 'earth']) for (let i = 0; i < 6; i++) core[`knowledge.${territory}.f${i}`] = [1, 0, 0];
    const queue = cardQueue({ core, scope: 'knowledge', done: NONE, seed: 'mix' });
    const branches = queue.map(id => branchOf(id, 'knowledge'));
    const repeats = branches.filter((branch, i) => i > 0 && branch === branches[i - 1]).length;
    expect(repeats).toBe(0);
  });
});

describe('the plan with place cards', () => {
  const cards = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'].map(c => `knowledge.science.astronomy.${c}`);
  const sky = Array.from({ length: 12 }, (_, i) => video(`s${i}`, ['knowledge.science.astronomy'], `UC${i % 4}`));
  it('takes about one card per two videos', () => {
    const items = extendPlan(context(sky, cards), createPlan(), 7, NOW).items;
    expect(kinds(items)).toEqual(['video', 'card', 'video', 'video', 'card', 'video', 'video']);
    expect(isCardSlot(1) && isCardSlot(4) && !isCardSlot(0) && !isCardSlot(2)).toBe(true);
  });
  it('serves the cards in the queue order, each once, across a replan', () => {
    let state = extendPlan(context(sky, cards), createPlan(), 6, NOW);
    state = extendPlan(context(sky, cards), replanAfter(state, 2), 12, NOW);
    const served = state.items.flatMap(item => item.kind === 'card' ? [item.placeId] : []);
    expect(served).toEqual(cards.slice(0, served.length));
    expect(new Set(served).size).toBe(served.length);
  });
  it('is cards alone (no checkpoints) where the scope has no videos, then ends', () => {
    const items = extendPlan(context([], cards.slice(0, 3)), createPlan(), 10, NOW).items;
    expect(kinds(items)).toEqual(['card', 'card', 'card', 'end']);
  });
  it('carries on with cards once the videos run out, and with videos once the cards do', () => {
    const items = extendPlan(context(sky.slice(0, 2), cards.slice(0, 4)), createPlan(), 12, NOW).items;
    expect(kinds(items)).toEqual(['video', 'card', 'video', 'card', 'card', 'card', 'end']);
    const more = extendPlan(context(sky.slice(0, 6), cards.slice(0, 1)), createPlan(), 12, NOW).items;
    expect(kinds(more)).toEqual(['video', 'card', 'video', 'video', 'video', 'video', 'video', 'checkpoint', 'end']);
  });
  it('is the old video feed when there are no cards', () => {
    const items = extendPlan(context(sky, []), createPlan(), 9, NOW).items;
    expect(kinds(items)).toEqual(['video', 'video', 'video', 'video', 'video', 'video', 'video', 'checkpoint', 'video']);
  });
  it('is only the end where nothing is charted and no video is in scope', () => {
    expect(kinds(extendPlan(context([], []), createPlan(), 6, NOW).items)).toEqual(['end']);
  });
});

describe('the plan with MoK reels', () => {
  const cards = ['c1', 'c2', 'c3', 'c4', 'c5'].map(c => `knowledge.science.astronomy.${c}`);
  const sky = Array.from({ length: 12 }, (_, i) => video(`s${i}`, ['knowledge.science.astronomy'], `UC${i % 4}`));
  const reels = [reel('r1'), reel('r2'), reel('r3')];
  it('mixes a reel into every sixth content slot, never a card’s', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(isReelSlot)).toEqual([false, false, false, true, false, false, true]);
    expect([3, 9, 15].some(isCardSlot)).toBe(false);
    const items = extendPlan(context(sky, cards, reels), createPlan(), 7, NOW).items;
    expect(kinds(items)).toEqual(['video', 'card', 'video', 'reel', 'card', 'video', 'video']);
  });
  it('is cards and reels where the scope has no videos, then ends', () => {
    const items = extendPlan(context([], cards.slice(0, 3), reels.slice(0, 2)), createPlan(), 10, NOW).items;
    expect(kinds(items)).toEqual(['card', 'card', 'card', 'reel', 'reel', 'end']);
  });
  it('is reels alone in a scope with only reels: never empty', () => {
    const items = extendPlan(context([], [], reels), createPlan(), 10, NOW).items;
    expect(kinds(items)).toEqual(['reel', 'reel', 'reel', 'end']);
  });
  it('serves each reel once across a replan', () => {
    let state = extendPlan(context(sky, cards, reels), createPlan(), 5, NOW);
    state = extendPlan(context(sky, cards, reels), replanAfter(state, 4), 12, NOW);
    const served = state.items.flatMap(item => item.kind === 'reel' ? [item.reel.id] : []);
    expect(served).toEqual(['r1', 'r2']);
  });
});

describe('scope state', () => {
  const queue = ['knowledge.science.astronomy', 'knowledge.science.astronomy.stars'];
  it('is empty with nothing charted and no videos', () => {
    expect(scopeState([], NONE, 0)).toBe('empty');
    expect(scopeState([], NONE, 3)).toBe('open');
  });
  it('is complete once every card is done and there is no video to watch', () => {
    expect(scopeState(queue, new Set(queue.map(cardId)), 0)).toBe('complete');
    expect(scopeState(queue, new Set([cardId(queue[0])]), 0)).toBe('open');
    expect(scopeState(queue, new Set(queue.map(cardId)), 2)).toBe('open');
  });
  it('counts reels: a scope with only reels is not empty, and complete once they are done too', () => {
    expect(scopeState([], NONE, 0, ['r1'])).toBe('open');
    expect(scopeState([], new Set([reelItemId('r1')]), 0, ['r1'])).toBe('complete');
    expect(scopeState(queue, new Set(queue.map(cardId)), 0, ['r1'])).toBe('open');
  });
});

describe('the scope asked for from Explore', () => {
  it('shows at once, while the map is still where it was asked from', () => {
    expect(effectiveScope('knowledge.science.astronomy', { id: 'knowledge.science', from: 'knowledge.science.astronomy' })).toBe('knowledge.science');
  });
  it('gives way to the map once the map has moved', () => {
    expect(effectiveScope('knowledge.science', { id: 'knowledge.science', from: 'knowledge.science.astronomy' })).toBe('knowledge.science');
    expect(effectiveScope('knowledge.arts', { id: 'knowledge.science', from: 'knowledge.science.astronomy' })).toBe('knowledge.arts');
    expect(effectiveScope('knowledge.arts', null)).toBe('knowledge.arts');
  });
});
