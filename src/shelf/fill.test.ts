import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { computeFill, formatPercent, glowFromGuesses, mapPercent, newlyComplete, placeProgress, sameFill, sameSet, type FillNode } from './fill';
import { emptyShelf, mergeShelves, parseShelf, shelfFrom, withComplete, withDone, withGuess } from './store';
import { parseShelfIndex } from './shelfIndex';
import { cardId, coreItemId, guessPlace, linkItemId, packId, parseCoreId, readId, reelItemId, videoItemId, type CoreMinutes } from './types';

// k
// ├── k.a
// │   ├── k.a.x   (card 1, read 4, pack 5)
// │   └── k.a.y   (card 1)
// ├── k.b
// │   └── k.b.z   (nothing)
// └── k.c         (card 1, read 2)
//     └── k.c.w   (card 1)
const NODES: FillNode[] = [
  { id: 'k.a.y', parentId: 'k.a' }, { id: 'k', parentId: null }, { id: 'k.a', parentId: 'k' }, { id: 'k.a.x', parentId: 'k.a' },
  { id: 'k.b', parentId: 'k' }, { id: 'k.b.z', parentId: 'k.b' }, { id: 'k.c', parentId: 'k' }, { id: 'k.c.w', parentId: 'k.c' },
];
const CORE: Record<string, CoreMinutes> = { 'k.a.x': [1, 4, 5], 'k.a.y': [1, 0, 0], 'k.c': [1, 2, 0], 'k.c.w': [1, 0, 0] };
const fillOf = (done: string[] = [], legacy: string[] = [], handBuilt: string[] = []) => computeFill({ nodes: NODES, core: CORE, done: new Set(done), legacy, handBuilt });

describe('item ids', () => {
  it('follow the spec and parse back', () => {
    expect([cardId('k.a'), readId('k.a'), packId('k.a'), videoItemId('abc'), reelItemId('r1'), linkItemId('k.a', 'l1')])
      .toEqual(['k.a#card', 'k.a#read', 'k.a#pack', 'video:abc', 'reel:r1', 'link:k.a:l1']);
    expect(parseCoreId(coreItemId('k.a.x', 'read'))).toEqual({ placeId: 'k.a.x', kind: 'read' });
    expect(parseCoreId('video:abc')).toBeNull();
    expect(parseCoreId('k.a#other')).toBeNull();
    expect(guessPlace('knowledge.science.astronomy:q12')).toBe('knowledge.science.astronomy');
    expect(guessPlace('nonsense')).toBeNull();
  });
});

describe('fill', () => {
  it('is zero and uncharted where nothing exists', () => {
    const result = fillOf();
    expect(result.fill.size).toBe(0);
    expect([...result.charted].sort()).toEqual(['k', 'k.a', 'k.a.x', 'k.a.y', 'k.c', 'k.c.w']);
    expect(result.charted.has('k.b')).toBe(false);
    expect(result.charted.has('k.b.z')).toBe(false);
    expect(placeProgress(result, 'k.b')).toEqual({ fill: 0, done: 0, core: 0, charted: false });
    expect(result.root).toBe('k');
  });

  it('weights a leaf by minutes', () => {
    const result = fillOf([readId('k.a.x')]);
    expect(placeProgress(result, 'k.a.x')).toEqual({ fill: 0.4, done: 4, core: 10, charted: true });
  });

  it('rolls areas up by minutes, not by children', () => {
    // k.a: x has 10 minutes, y has 1. Finishing y alone is 1 of 11, not half.
    const result = fillOf([cardId('k.a.y')]);
    expect(result.fill.get('k.a.y')).toBe(1);
    expect(result.fill.get('k.a')).toBeCloseTo(1 / 11);
    // The area's own minutes count beside its children's.
    const c = fillOf([cardId('k.c'), readId('k.c')]);
    expect(placeProgress(c, 'k.c')).toMatchObject({ done: 3, core: 4 });
    expect(c.fill.get('k.c.w') ?? 0).toBe(0);
    // The root sums everything: 11 + 4 = 15 minutes.
    expect(placeProgress(c, 'k')).toMatchObject({ done: 3, core: 15 });
    expect(mapPercent(c)).toBe(20);
  });

  it('ignores extras and unknown ids', () => {
    const result = fillOf([videoItemId('abc'), reelItemId('r'), linkItemId('k.a.x', 'l'), 'k.b.z#card', packId('k.a.y')]);
    expect(result.fill.size).toBe(0);
  });

  it('lights a completed place and everything inside it', () => {
    const result = fillOf([], ['k.a']);
    expect(result.fill.get('k.a')).toBe(1);
    expect(result.fill.get('k.a.x')).toBe(1);
    expect(result.fill.get('k.a.y')).toBe(1);
    expect(placeProgress(result, 'k')).toMatchObject({ done: 11, core: 15 });
    expect(result.fill.get('k.c') ?? 0).toBe(0);
  });

  it('counts a completed place with no core minutes as one finished minute of one', () => {
    const result = fillOf([], ['k.b.z']);
    expect(result.charted.has('k.b.z')).toBe(true);
    expect(result.charted.has('k.b')).toBe(true);
    expect(placeProgress(result, 'k.b.z')).toEqual({ fill: 1, done: 1, core: 1, charted: true });
    expect(placeProgress(result, 'k.b')).toEqual({ fill: 1, done: 1, core: 1, charted: true });
    expect(placeProgress(result, 'k')).toMatchObject({ done: 1, core: 16 });
    // Inside a completed place with nothing to finish: lit and charted, without extra minutes.
    const area = fillOf([], ['k.b']);
    expect(placeProgress(area, 'k.b.z')).toEqual({ fill: 1, done: 0, core: 0, charted: true });
    expect(placeProgress(area, 'k.b')).toMatchObject({ done: 1, core: 1 });
  });

  it('charts hand-built places and their ancestors without adding minutes', () => {
    const result = fillOf([], [], ['k.b.z']);
    expect(result.charted.has('k.b.z')).toBe(true);
    expect(result.charted.has('k.b')).toBe(true);
    expect(result.fill.get('k.b.z') ?? 0).toBe(0);
    expect(placeProgress(result, 'k').core).toBe(15);
  });

  it('is all filled when everything is finished', () => {
    const all = Object.keys(CORE).flatMap(id => [cardId(id), readId(id), packId(id)]);
    const result = fillOf(all);
    for (const id of ['k', 'k.a', 'k.a.x', 'k.a.y', 'k.c', 'k.c.w']) expect(result.fill.get(id)).toBe(1);
    expect(mapPercent(result)).toBe(100);
  });

  it('handles an empty map', () => {
    const result = computeFill({ nodes: [], core: {}, done: new Set() });
    expect(result.root).toBeNull();
    expect(mapPercent(result)).toBe(0);
  });

  it('runs the whole catalog in one quick pass', () => {
    const nodes = catalog.all();
    const leaves = nodes.filter(node => !catalog.getChildren(node).length).slice(0, 900);
    const core = Object.fromEntries(leaves.map(node => [node.id, [1, 3, 5] as const]));
    const done = new Set(leaves.slice(0, 9).map(node => cardId(node.id)));
    const started = performance.now();
    const result = computeFill({ nodes, core, done, legacy: [] });
    expect(performance.now() - started).toBeLessThan(250);
    expect(result.root).toBe(catalog.root.id);
    expect(placeProgress(result, catalog.root.id)).toMatchObject({ done: 9, core: 900 * 9 });
    expect(mapPercent(result)).toBe(0.1);
    expect(result.charted.size).toBeGreaterThan(900);
    expect(result.charted.size).toBeLessThan(nodes.length);
  });
});

describe('the completion latch', () => {
  const latch = (done: string[], complete: Record<string, string> = {}, legacy: string[] = [], mock: string[] = [], handBuilt: string[] = []) =>
    newlyComplete(computeFill({ nodes: NODES, core: CORE, done: new Set(done), legacy, mock, complete: Object.keys(complete), handBuilt }), complete);
  const at = '2026-11-01T00:00:00.000Z';
  const ALL_C = [cardId('k.c'), readId('k.c'), cardId('k.c.w')];
  const ALL = Object.keys(CORE).flatMap(id => [cardId(id), readId(id), packId(id)]);

  it('latches every place that reaches 100% with core minutes, and nothing short of it', () => {
    expect(latch([])).toEqual([]);
    expect(latch([cardId('k.c'), readId('k.c')])).toEqual([]);
    expect(latch([cardId('k.c.w')])).toEqual(['k.c.w']);
    expect(latch(ALL_C).sort()).toEqual(['k.c', 'k.c.w']);
  });

  it('never latches from an empty index, legacy lighting, or places with no core minutes', () => {
    expect(newlyComplete(computeFill({ nodes: NODES, core: {}, done: new Set(ALL_C), legacy: ['k.b.z'] }), {})).toEqual([]);
    // Legacy places (and all inside) are already lit: nothing to latch there.
    expect(latch([], {}, ['k.a'])).toEqual([]);
    // k.b holds only a legacy place with no minutes (one of one): no real minutes, no latch.
    expect(latch([], {}, ['k.b.z'])).toEqual([]);
  });

  it('never latches an area with a place inside that has nothing published yet', () => {
    // Everything published is finished, but k.b and k.b.z have no minutes: k stays open, its finished areas latch.
    expect(latch(ALL).sort()).toEqual(['k.a', 'k.a.x', 'k.a.y', 'k.c', 'k.c.w']);
    // A completed place counts as finished even with no minutes: then k latches too.
    expect(latch(ALL, {}, ['k.b'])).toContain('k');
    // So does publishing k.b.z and finishing it.
    const core = { ...CORE, 'k.b.z': [1, 0, 0] as CoreMinutes };
    expect(newlyComplete(computeFill({ nodes: NODES, core, done: new Set([...ALL, cardId('k.b.z')]) }), {})).toContain('k');
    // A hand-built lesson with no minutes is content still to finish.
    expect(newlyComplete(computeFill({ nodes: [...NODES, { id: 'k.c.l', parentId: 'k.c' }], core, done: new Set([...ALL, cardId('k.b.z')]), handBuilt: ['k.c.l'] }), {}))
      .not.toContain('k.c');
  });

  it('never latches on a demo mark', () => {
    const almost = [cardId('k.c'), readId('k.c')];
    expect(latch(almost, {}, ['k.c.w'])).toEqual(['k.c']);
    expect(latch(almost, {}, ['k.c.w'], ['k.c.w'])).toEqual([]);
    // The demo mark still colours the map as before.
    expect(computeFill({ nodes: NODES, core: CORE, done: new Set(almost), legacy: ['k.c.w'], mock: ['k.c.w'] }).fill.get('k.c')).toBe(1);
  });

  it('settles once latched: a latched place is never full again', () => {
    const complete = { 'k.c': at, 'k.c.w': at };
    expect(latch(ALL_C, complete)).toEqual([]);
    // Even from a stale result, ids already in the store are not latched twice.
    expect(newlyComplete(computeFill({ nodes: NODES, core: CORE, done: new Set(ALL_C) }), complete)).toEqual([]);
  });

  it('keeps a latched place at 100% when its shelf grows, without counting anything new as finished', () => {
    const complete = ['k.c', 'k.c.w'];
    // k.c was 1 + 2 minutes (and k.c.w 1); now k.c has a 6-minute pack, k.c.w a 4-minute read, and k.c.v is published.
    const grown: Record<string, CoreMinutes> = { ...CORE, 'k.c': [1, 2, 6], 'k.c.w': [1, 4, 0], 'k.c.v': [1, 0, 0] };
    const nodes = [...NODES, { id: 'k.c.v', parentId: 'k.c' }];
    const result = computeFill({ nodes, core: grown, done: new Set(ALL_C), complete });
    expect(result.fill.get('k.c')).toBe(1);
    expect(result.fill.get('k.c.w')).toBe(1);
    expect([...result.latched].sort()).toEqual(['k.c', 'k.c.w']);
    // The place published later is not lit: it fills from what is finished in it, like anywhere else.
    expect(result.fill.get('k.c.v') ?? 0).toBe(0);
    expect(result.charted.has('k.c.v')).toBe(true);
    // The minutes are the real ones, and the map counts only what was finished.
    expect(placeProgress(result, 'k.c')).toEqual({ fill: 1, done: 4, core: 15, charted: true });
    expect(placeProgress(result, 'k')).toMatchObject({ done: 4, core: 26 });
    // Without the latch the same content would have dropped it.
    expect(computeFill({ nodes, core: grown, done: new Set(ALL_C) }).fill.get('k.c')).toBeCloseTo(4 / 15);
    // A latched place that later loses its minutes stays at 100% and charted, without adding minutes.
    expect(placeProgress(computeFill({ nodes: NODES, core: {}, done: new Set(), complete }), 'k.c')).toEqual({ fill: 1, done: 0, core: 0, charted: true });
  });

  it('leaves legacy lighting as it was, and marks only latched places latched', () => {
    const plain = fillOf([], ['k.a']);
    const withLatch = computeFill({ nodes: NODES, core: CORE, done: new Set(), legacy: ['k.a'], complete: ['k.c'] });
    expect(withLatch.fill.get('k.a')).toBe(plain.fill.get('k.a'));
    expect(plain.latched.size).toBe(0);
    expect([...withLatch.latched]).toEqual(['k.c']);
    expect(withLatch.fill.get('k.c.w') ?? 0).toBe(0);
    // A latched place inside a legacy one keeps the legacy look.
    expect(computeFill({ nodes: NODES, core: CORE, done: new Set(), legacy: ['k.c'], complete: ['k.c.w'] }).latched.has('k.c.w')).toBe(false);
  });
});

describe('the whole-map percentage', () => {
  it('reads with one decimal', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.014)).toBe('1.4%');
    expect(formatPercent(0.0004)).toBe('under 0.1%');
    expect(formatPercent(1)).toBe('100.0%');
  });
});

describe('glowFromGuesses', () => {
  const at = '2026-11-01T00:00:00.000Z';
  it('is right guesses over the place’s questions, merged by max', () => {
    const guesses = { 'k.a.x:q1': { right: true, at }, 'k.a.x:q2': { right: false, at }, 'k.c:q1': { right: true, at }, odd: { right: true, at } };
    const glow = glowFromGuesses(guesses, { 'k.a.x': 4, 'k.c': 2 }, new Map([['k.c', 0.9], ['k.b', 0.3]]));
    expect(glow.get('k.a.x')).toBe(0.25);
    expect(glow.get('k.c')).toBe(0.9);
    expect(glow.get('k.b')).toBe(0.3);
    expect(glow.size).toBe(3);
  });
  it('falls back to the answered count where the questions are unknown', () => {
    expect(glowFromGuesses({ 'p:q1': { right: true, at }, 'p:q2': { right: false, at } }).get('p')).toBe(0.5);
  });
});

describe('stable identities', () => {
  it('treats equal fills and sets as the same', () => {
    expect(sameFill(new Map([['a', 0.5]]), new Map([['a', 0.5001]]))).toBe(true);
    expect(sameFill(new Map([['a', 0.5]]), new Map([['a', 0.6]]))).toBe(false);
    expect(sameFill(new Map([['a', 0.5]]), new Map([['b', 0.5]]))).toBe(false);
    expect(sameSet(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameSet(new Set(['a']), new Set(['b']))).toBe(false);
  });
});

describe('the store', () => {
  const t1 = '2026-11-01T10:00:00.000Z';
  const t2 = '2026-11-02T10:00:00.000Z';
  it('tolerates anything stored', () => {
    expect(parseShelf(null)).toEqual(emptyShelf());
    expect(parseShelf('{not json')).toEqual(emptyShelf());
    expect(parseShelf('[1,2]')).toEqual(emptyShelf());
    expect(parseShelf(JSON.stringify({ version: 1, done: { a: t1, b: 'yesterday', c: 3 }, guesses: { q: { right: true, at: t1 }, r: { right: 'yes', at: t1 }, s: null } })))
      .toEqual({ version: 1, done: { a: t1 }, guesses: { q: { right: true, at: t1 } }, complete: {} });
    // Completed places: older shelves have none; malformed stamps are dropped.
    expect(parseShelf(JSON.stringify({ version: 1, done: {}, guesses: {}, complete: { 'k.a': t1, 'k.b': 'soon', '': t1 } })).complete).toEqual({ 'k.a': t1 });
    expect(parseShelf(JSON.stringify({ version: 1, done: { a: t1 }, guesses: {} })).complete).toEqual({});
    expect(shelfFrom(undefined)).toEqual(emptyShelf());
  });
  it('is append-only: done stays, the first guess wins', () => {
    const one = withDone(emptyShelf(), 'k.a#card', t1);
    expect(one.done).toEqual({ 'k.a#card': t1 });
    expect(withDone(one, 'k.a#card', t2)).toBe(one);
    const guessed = withGuess(one, 'k.a:q1', false, t1);
    expect(withGuess(guessed, 'k.a:q1', true, t2)).toBe(guessed);
    expect(guessed.guesses['k.a:q1']).toEqual({ right: false, at: t1 });
    expect(withDone(one, '', t2)).toBe(one);
  });
  it('merges two tabs without losing anything, the earlier of each kept', () => {
    const a = { version: 1 as const, done: { x: t2, y: t1 }, guesses: { q: { right: false, at: t2 } }, complete: { 'k.a': t2 } };
    const b = { version: 1 as const, done: { x: t1, z: t2 }, guesses: { q: { right: true, at: t1 }, r: { right: true, at: t2 } }, complete: { 'k.a': t1, 'k.c': t2 } };
    const merged = mergeShelves(a, b);
    expect(merged.done).toEqual({ x: t1, y: t1, z: t2 });
    expect(merged.guesses).toEqual({ q: { right: true, at: t1 }, r: { right: true, at: t2 } });
    expect(merged.complete).toEqual({ 'k.a': t1, 'k.c': t2 });
    expect(mergeShelves(merged, a)).toBe(merged);
    expect(mergeShelves(merged, emptyShelf())).toBe(merged);
    // A shelf without completed places never takes any away.
    expect(mergeShelves(merged, parseShelf(JSON.stringify({ version: 1, done: { x: t1 }, guesses: {} })))).toBe(merged);
    // Only completed places differing still merges.
    expect(mergeShelves(emptyShelf(), { ...emptyShelf(), complete: { 'k.b': t1 } }).complete).toEqual({ 'k.b': t1 });
  });
  it('records completed places once: the first time is kept, nothing is removed', () => {
    const one = withComplete(emptyShelf(), ['k.a', 'k.a.x'], t1);
    expect(one.complete).toEqual({ 'k.a': t1, 'k.a.x': t1 });
    expect(withComplete(one, ['k.a'], t2)).toBe(one);
    expect(withComplete(one, [], t2)).toBe(one);
    expect(withComplete(one, ['k.c', 'k.a'], t2).complete).toEqual({ 'k.a': t1, 'k.a.x': t1, 'k.c': t2 });
    expect(parseShelf(JSON.stringify(one))).toEqual(one);
  });
});

describe('the shelf index', () => {
  it('reads the published file and drops anything malformed', () => {
    expect(parseShelfIndex(null).core).toEqual({});
    expect(parseShelfIndex({ schema: 'other', core: { a: [1, 0, 0] } }).core).toEqual({});
    const index = parseShelfIndex({ schema: 'mok.shelf/1', core: { a: [1, 12, 5], b: 'x', c: [1, -3, null] }, quick: { a: 9, b: 'x' } });
    expect(index.core).toEqual({ a: [1, 12, 5], c: [1, 0, 0] });
    expect(index.quick).toEqual({ a: 9 });
  });
});
