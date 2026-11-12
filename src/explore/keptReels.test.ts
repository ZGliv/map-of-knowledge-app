import { describe, expect, it } from 'vitest';
import { REELS } from './deck';
import { KEPT_REELS_KEY, keepSaved, loadKeptReels, MAX_KEPT, parseKeptReels, saveKeptReels } from './keptReels';
import { parseDeck } from './today';
import type { EngineReel } from './types';

// A saved reel from a dated deck keeps its own copy, so it stays on its hubs and in the Library once
// the deck has moved on. Checked on a real published deck.

const decks = import.meta.glob('../../public/explore/decks/2*.json', { eager: true, import: 'default' });
const dated = Object.values(decks).flatMap(raw => parseDeck(raw)?.reels ?? []);
const memory = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }; };

describe('kept copies of saved dated reels', () => {
  it('has real dated reels to test with', () => expect(dated.length).toBeGreaterThan(2));

  it('copies each saved dated reel the Reels tab holds, newest save first, and never an evergreen one', () => {
    const [a, b, c] = dated;
    const evergreen = REELS[0];
    const kept = keepSaved([], [b.id, evergreen.id, a.id], [evergreen, a, b, c]);
    expect(kept.map(reel => reel.id)).toEqual([b.id, a.id]);
    // Nothing new: the same array, so nothing is written.
    expect(keepSaved(kept, [b.id, evergreen.id, a.id], [a, b, c])).toBe(kept);
    // The deck has moved on (nothing loaded): the copies stay.
    expect(keepSaved(kept, [b.id, a.id], [])).toBe(kept);
    // A fresh fetch of the same reel never replaces the copy already kept.
    expect(keepSaved(kept, [b.id, a.id], [structuredClone(a)])[1]).toBe(a);
    // Unsaved: its copy goes.
    expect(keepSaved(kept, [a.id], []).map(reel => reel.id)).toEqual([a.id]);
  });

  it('survives a reload, and reads damaged data as no copies instead of failing', () => {
    const store = memory();
    expect(saveKeptReels(dated.slice(0, 2), store)).toBeNull();
    expect(loadKeptReels(store).map(reel => reel.id)).toEqual(dated.slice(0, 2).map(reel => reel.id));
    expect(parseKeptReels('not json')).toEqual([]);
    expect(parseKeptReels(JSON.stringify({ version: 2, reels: dated }))).toEqual([]);
    const broken = { ...dated[0], id: 'broken', frames: [] } as EngineReel;
    store.setItem(KEPT_REELS_KEY, JSON.stringify({ version: 1, reels: [broken, dated[0], dated[0], { id: 'x' }] }));
    expect(loadKeptReels(store).map(reel => reel.id)).toEqual([dated[0].id]);
  });

  it('keeps at most MAX_KEPT copies, the newest saves', () => {
    const many = Array.from({ length: MAX_KEPT + 5 }, (_, i) => ({ ...dated[0], id: `reel-${i}` }));
    const kept = keepSaved([], many.map(reel => reel.id), many);
    expect(kept).toHaveLength(MAX_KEPT);
    expect(kept[0].id).toBe('reel-0');
  });

  it('says so when the browser will not keep them', () => {
    expect(saveKeptReels(dated.slice(0, 1), { getItem: () => null, setItem: () => { throw new Error('full'); } })).toMatch(/could not be kept/);
  });
});
