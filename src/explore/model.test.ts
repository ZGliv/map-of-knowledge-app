import { hasCases } from '../cases';
import { describe, expect, it } from 'vitest';
import { REELS, reelsWithin, timelineFor, type NarrationManifest } from './deck';
import { frameHash, splitLines } from './narrationText';
import { createReelShelf, firstUnwatched, isPinned, loadReelShelf, markWatched, parseReelShelf, pinPlaces, removePin, REEL_SHELF_KEY, savePin, saveReelShelf, togglePin } from './pins';
import { proveItRoute } from './proveIt';
import { hasCheck } from '../checks';
import { commonsAtWidth } from './media';

const memory = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; };

describe('pinned reels', () => {
  it('pin, unpin and survive a reload through storage', () => {
    const store = memory();
    let shelf = togglePin(createReelShelf(), 'a', '2026-10-16T00:00:00.000Z');
    shelf = togglePin(shelf, 'b', '2026-10-16T00:01:00.000Z');
    expect(shelf.pinned.map(item => item.id)).toEqual(['b', 'a']);
    expect(saveReelShelf(shelf, store)).toBeNull();
    const reloaded = loadReelShelf(store);
    expect(isPinned(reloaded, 'a')).toBe(true);
    expect(isPinned(togglePin(reloaded, 'a'), 'a')).toBe(false);
  });

  it('reads damaged or foreign data as an empty shelf instead of failing', () => {
    expect(parseReelShelf('not json')).toEqual(createReelShelf());
    expect(parseReelShelf(JSON.stringify({ version: 2, pinned: [] }))).toEqual(createReelShelf());
    const store = memory(); store.setItem(REEL_SHELF_KEY, JSON.stringify({ version: 1, pinned: [{ id: 'x', at: 'never' }, { id: 'y', at: '2026-10-16T00:00:00.000Z' }, { id: 'y', at: '2026-10-16T00:00:00.000Z' }], watched: ['a', 'a', 3] }));
    expect(loadReelShelf(store)).toEqual({ version: 1, pinned: [{ id: 'y', at: '2026-10-16T00:00:00.000Z' }], watched: ['a'] });
  });

  it('saves a reel under the places chosen for it, moves it, and takes it out', () => {
    let shelf = savePin(createReelShelf(), 'a', ['knowledge.arts.music', 'knowledge.arts', 'knowledge.arts.music'], '2026-10-16T00:00:00.000Z');
    shelf = savePin(shelf, 'b', [], '2026-10-16T00:01:00.000Z');
    expect(shelf.pinned).toEqual([{ id: 'b', at: '2026-10-16T00:01:00.000Z' }, { id: 'a', at: '2026-10-16T00:00:00.000Z', places: ['knowledge.arts.music', 'knowledge.arts'] }]);
    expect(pinPlaces(shelf.pinned[1], 'knowledge.science')).toEqual(['knowledge.arts.music', 'knowledge.arts']);
    expect(pinPlaces(shelf.pinned[0], 'knowledge.science')).toEqual(['knowledge.science']);
    shelf = savePin(shelf, 'a', ['knowledge.earth'], '2026-10-16T00:02:00.000Z');
    expect(shelf.pinned[0]).toEqual({ id: 'a', at: '2026-10-16T00:02:00.000Z', places: ['knowledge.earth'] });
    expect(parseReelShelf(JSON.stringify(shelf))).toEqual(shelf);
    expect(isPinned(removePin(shelf, 'a'), 'a')).toBe(false);
    expect(removePin(shelf, 'zzz')).toBe(shelf);
  });

  it('opens the feed at the first reel not yet watched', () => {
    const ids = ['a', 'b', 'c'];
    expect(firstUnwatched(ids, createReelShelf())).toBe(0);
    const shelf = markWatched(markWatched(createReelShelf(), 'a'), 'b');
    expect(firstUnwatched(ids, shelf)).toBe(2);
    expect(firstUnwatched(ids, markWatched(shelf, 'c'))).toBe(0);
    expect(markWatched(shelf, 'a')).toBe(shelf);
  });
});

describe('prove it', () => {
  it('opens a new case where the place has them, else its question bank, else the expedition, else the hub', () => {
    expect(proveItRoute('knowledge.science.biology.evolution.new-species')).toEqual({ kind: 'mission', nodeId: 'knowledge.science.biology.evolution.new-species', from: null });
    expect(proveItRoute('knowledge.arts.music.harmony')).toEqual({ kind: 'mission', nodeId: 'knowledge.arts.music.harmony', from: null });
    expect(proveItRoute('knowledge.science.astronomy')).toEqual({ kind: 'hub', nodeId: 'knowledge.science.astronomy' });
  });

  it('is offered by every reel, and every reel’s place now proves it with a new case', () => {
    for (const reel of REELS) expect(proveItRoute(reel.nodeId).kind, reel.id).toBe(hasCases(reel.nodeId) ? 'mission' : hasCheck(reel.nodeId) ? 'check' : 'expedition');
    for (const reel of REELS) expect(proveItRoute(reel.nodeId).kind, reel.id).toBe('mission');
    for (const packId of ['physics', 'music', 'history']) expect(REELS.some(reel => reel.packId === packId), packId).toBe(true);
  });
});

describe('reels on the map', () => {
  it('belong to every place on the path to their tag', () => {
    expect(reelsWithin('knowledge')).toHaveLength(REELS.length);
    expect(reelsWithin('knowledge.science.biology.evolution')).toHaveLength(REELS.filter(reel => reel.packId.startsWith('evolution-')).length);
    expect(reelsWithin('knowledge.science.biology.evolution.new-species').map(reel => reel.packId)).toEqual(['evolution-e05', 'evolution-e05', 'evolution-e05']);
    expect(reelsWithin('knowledge.arts').map(reel => reel.id)).toEqual(['music-legend-of-the-hammers']);
    expect(reelsWithin('knowledge.economics')).toEqual([]);
  });
});

describe('reel timing', () => {
  it('follows the narration, frame by frame, when it matches the captions', () => {
    const reel = REELS[0];
    const timeline = timelineFor(reel);
    expect(timeline.audio).toMatch(/\.mp3$/);
    expect(timeline.frames).toHaveLength(reel.frames.length);
    expect(timeline.frames[0].start).toBe(0);
    for (let i = 1; i < timeline.frames.length; i += 1) expect(timeline.frames[i].start).toBe(timeline.frames[i - 1].end);
    expect(timeline.frames.at(-1)!.end).toBe(timeline.duration);
  });

  it('falls back to a reading pace, without audio, when the captions changed', () => {
    const reel = REELS[1];
    const stale: NarrationManifest = { voice: 'test', reels: { [reel.id]: { src: 'x.mp3', bytes: 1, duration: 30, frames: reel.frames.map(() => ({ hash: 'stale', start: 0, end: 1, lines: [[0, 1]] })) } } };
    const timeline = timelineFor(reel, stale);
    expect(timeline.audio).toBeNull();
    expect(timeline.frames.map(frame => frame.lines.length)).toEqual(reel.frames.map(frame => splitLines(frame.text).length));
    expect(timeline.duration).toBeGreaterThan(15_000);
  });

  it('splits captions into spoken sentences without breaking “E. coli” or quotations', () => {
    expect(splitLines('This is E. coli, magnified ten thousand times.')).toHaveLength(1);
    expect(splitLines('“But what an entire and absolute difference in their inhabitants!” Cape Verde’s life is related to Africa’s.')).toHaveLength(2);
    expect(splitLines('He weighs them: 12, 9, 8 and 6 pounds. The best pairs make simple ratios.')).toHaveLength(2);
    expect(frameHash({ text: 'a' })).not.toBe(frameHash({ text: 'a', say: 'b' }));
  });
});

describe('card images', () => {
  it('ask Commons for a standard small width, from a thumbnail or an original', () => {
    expect(commonsAtWidth('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Darwin%27s_finches_by_Gould.jpg/1280px-Darwin%27s_finches_by_Gould.jpg'))
      .toBe('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Darwin%27s_finches_by_Gould.jpg/330px-Darwin%27s_finches_by_Gould.jpg');
    expect(commonsAtWidth('https://upload.wikimedia.org/wikipedia/commons/e/e3/Ensatina_eschscholtzii_ring_species.jpg'))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Ensatina_eschscholtzii_ring_species.jpg/330px-Ensatina_eschscholtzii_ring_species.jpg');
    const still = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Film.webm/1280px-seek%3D75-Film.webm.jpg';
    expect(commonsAtWidth(still)).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Film.webm/330px-seek%3D75-Film.webm.jpg');
    for (const reel of REELS) expect(commonsAtWidth(reel.media[reel.hero].src), reel.id).toMatch(/\/330px-/);
  });
});
