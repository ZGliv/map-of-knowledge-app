import { describe, expect, it } from 'vitest';
import { emptyImpression, GLANCE_MS, isThrough, judge, playedShare, QUICK_SKIP_MS, type Impression } from './engagement';
import { counts, posterior } from './interest';
import {
  applyLearning, createFeedMemory, FEED_MEMORY_KEY, fromLegacy, LEGACY_FEED_MEMORY_KEY, loadFeedMemory, markBroken, migrateLegacy,
  parseFeedMemory, parseLegacyFeedMemory, recordImpression, saveFeedMemory, startSession,
} from './memory';
import type { FeedVideo } from './pool';

const make = (id: string, place: string, channel = 'UCa', short = true): FeedVideo => ({ id, channel, title: `About ${place}`, learn: 'A thing.', places: [place], short, aspect: short ? 0.5625 : 1.78, duration: null, published: '2026-10-01' });
const A = make('aaaaaaaaaaa', 'knowledge.arts.music');
const B = make('bbbbbbbbbbb', 'knowledge.science.physics', 'UCb');
const C = make('ccccccccccc', 'knowledge.humanities.history', 'UCc', false);
const imp = (extra: Partial<Impression> = {}, short = true): Impression => ({ ...emptyImpression(short), heard: true, ...extra });

describe('what one impression says', () => {
  it('a glance says nothing; a quick skip is a strong no', () => {
    expect(judge(imp({ dwellMs: GLANCE_MS - 1 })).kind).toBe('glance');
    const skip = judge(imp({ dwellMs: QUICK_SKIP_MS - 100, playedS: 1, durationS: 40 }));
    expect(skip).toEqual({ kind: 'skip', r: 0, w: 1.6 });
  });

  it('partway is mostly a soft no; a few minutes of a long video a fair yes', () => {
    const half = judge(imp({ dwellMs: 20_000, playedS: 20, durationS: 40 }));
    expect(half.kind).toBe('partway');
    if (half.kind !== 'glance') expect(half.r).toBeLessThan(0.4);
    const long = judge(imp({ dwellMs: 150_000, playedS: 150, durationS: 900 }, false));
    if (long.kind !== 'glance') expect(long.r).toBeGreaterThanOrEqual(0.5);
  });

  it('through is a yes; again, saved and its place opened say more', () => {
    expect(judge(imp({ dwellMs: 40_000, playedS: 40, durationS: 40, ended: true }))).toMatchObject({ kind: 'through', r: 1 });
    const again = judge(imp({ dwellMs: 80_000, playedS: 40, durationS: 40, ended: true, replays: 1 }));
    const saved = judge(imp({ dwellMs: 4_000, playedS: 3, durationS: 40, saved: true }));
    const opened = judge(imp({ dwellMs: 3_000, playedS: 2.5, durationS: 40, openedPlace: true }));
    if (again.kind === 'glance' || saved.kind === 'glance' || opened.kind === 'glance') throw new Error('judged a glance');
    expect(again.w).toBeGreaterThan(1.5);
    expect(saved).toMatchObject({ r: 1 });
    expect(saved.w).toBeGreaterThanOrEqual(3);
    expect(opened.r).toBeGreaterThanOrEqual(0.8);
  });

  it('sound off during it is a little less of a yes', () => {
    const heard = judge(imp({ dwellMs: 30_000, playedS: 30, durationS: 40 }));
    const muted = judge(imp({ dwellMs: 30_000, playedS: 30, durationS: 40, muted: true, heard: false }));
    if (heard.kind === 'glance' || muted.kind === 'glance') throw new Error('judged a glance');
    expect(muted.r).toBeLessThan(heard.r);
  });

  it('reads the share played by the player’s length, else by time on screen', () => {
    expect(playedShare(imp({ playedS: 10, durationS: 40 }))).toBe(0.25);
    expect(playedShare(imp({ dwellMs: 20_000 }))).toBe(0.5);
    expect(isThrough(imp({ playedS: 200, durationS: 900 }, false))).toBe(true);
  });
});

describe('feed memory', () => {
  it('records a judged video once, watches through as watched and explored, and never as earned', () => {
    let memory = recordImpression(createFeedMemory(), A, imp({ dwellMs: 40_000, playedS: 40, durationS: 40, ended: true }), '2026-10-22T10:00:00.000Z');
    memory = recordImpression(memory, B, imp({ dwellMs: 1_200, playedS: 0.5, durationS: 40 }), '2026-10-22T10:01:00.000Z');
    expect(memory.seen).toEqual([A.id, B.id]);
    expect(memory.watched).toEqual({ [A.id]: '2026-10-22T10:00:00.000Z' });
    expect(memory.explored).toEqual({ [A.places[0]]: 1 });
    expect(memory.model.clock).toBe(2);
    expect(memory.at).toBe('2026-10-22T10:01:00.000Z');
    expect(recordImpression(memory, C, imp({ dwellMs: 200 }))).toBe(memory);
    expect(Object.keys(memory)).not.toContain('earned');
  });

  it('survives a round trip and drops malformed parts', () => {
    const memory = markBroken(recordImpression(createFeedMemory(), A, imp({ dwellMs: 40_000, playedS: 40, durationS: 40, ended: true }), '2026-10-22T10:00:00.000Z'), 'zzzzzzzzzzz');
    const store = new Map<string, string>();
    const target = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(saveFeedMemory(memory, target)).toBe(true);
    const back = loadFeedMemory(target);
    expect(back.watched).toEqual(memory.watched);
    expect(back.seen).toEqual(memory.seen);
    expect(back.broken).toEqual(['zzzzzzzzzzz']);
    expect(back.model.clock).toBe(1);
    expect(counts(back.model.stats['p:knowledge.arts.music'], 1).a).toBeCloseTo(1.1, 3);
    expect(parseFeedMemory('{"version":2,"watched":{"x":"not a date"},"seen":[1,"y"],"model":{"clock":"x"}}')).toMatchObject({ watched: {}, seen: ['y'], model: { clock: 0 } });
    expect(parseFeedMemory('nonsense')).toEqual(createFeedMemory());
    expect(parseFeedMemory('{"version":3}')).toEqual(createFeedMemory());
  });

  it('a new session forgets a little for each day away', () => {
    const memory = recordImpression(createFeedMemory(), A, imp({ dwellMs: 40_000, playedS: 40, durationS: 40, ended: true }), '2026-10-20T10:00:00.000Z');
    const later = startSession(memory, Date.parse('2026-10-24T10:00:00.000Z'));
    expect(later.model.clock).toBeGreaterThan(memory.model.clock);
    expect(startSession(memory, Date.parse('2026-10-20T11:00:00.000Z'))).toBe(memory);
  });

  it('folds learning actions in once each: started and proved places count as interest', () => {
    const events = [{ place: 'knowledge.science.biology.evolution', at: '2026-10-21T10:00:00.000Z', kind: 'started' as const }, { place: 'knowledge.science.biology.evolution', at: '2026-10-22T10:00:00.000Z', kind: 'proved' as const }];
    const memory = applyLearning(createFeedMemory(), events);
    expect(memory.learnedThrough).toBe('2026-10-22T10:00:00.000Z');
    expect(posterior(memory.model).mean('p:knowledge.science.biology.evolution')).toBeGreaterThan(posterior(createFeedMemory().model).mean('p:knowledge.science.biology.evolution'));
    expect(applyLearning(memory, events)).toBe(memory);
  });
});

describe('version 1', () => {
  const v1 = JSON.stringify({
    version: 1,
    watched: { [A.id]: '2026-10-20T10:00:00.000Z' },
    passed: { [B.id]: 2 },
    hidden: [C.id],
    broken: ['ddddddddddd'],
    prefs: { channels: { UCa: 2 }, places: { 'knowledge.arts.music': 3, 'knowledge.humanities.history': -2 } },
    seen: { 'knowledge.arts.music': 1 },
  });

  it('is read once from its own key when there is no version 2, and left where it was', () => {
    const store = new Map([[LEGACY_FEED_MEMORY_KEY, v1]]);
    const target = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    const memory = loadFeedMemory(target);
    expect(memory.legacy).toBeDefined();
    expect(memory.watched).toEqual({ [A.id]: '2026-10-20T10:00:00.000Z' });
    expect(memory.hidden).toEqual([C.id]);
    expect(memory.broken).toEqual(['ddddddddddd']);
    expect(store.get(LEGACY_FEED_MEMORY_KEY)).toBe(v1);
    expect(store.has(FEED_MEMORY_KEY)).toBe(false);
    expect(parseLegacyFeedMemory('{"version":2}')).toBeNull();
  });

  it('folds its watches, passes, hides and preferences into the model once the pool is here', () => {
    const memory = migrateLegacy(fromLegacy(parseLegacyFeedMemory(v1)!), new Map([A, B, C].map(v => [v.id, v])));
    expect(memory.legacy).toBeUndefined();
    const post = posterior(memory.model), fresh = posterior(createFeedMemory().model);
    expect(post.mean('p:knowledge.arts.music')).toBeGreaterThan(fresh.mean('p:knowledge.arts.music'));
    expect(post.mean('p:knowledge.humanities.history')).toBeLessThan(fresh.mean('p:knowledge.humanities.history'));
    expect(post.mean('c:UCa')).toBeGreaterThan(fresh.mean('c:UCa'));
    expect(memory.seen).toEqual(expect.arrayContaining([A.id, B.id]));
    expect(memory.explored).toEqual({ 'knowledge.arts.music': 1 });
    expect(migrateLegacy(memory, new Map())).toBe(memory);
    // Saved and read back, it stays folded.
    expect(parseFeedMemory(JSON.stringify({ ...memory, model: { clock: 0, stats: {} } })).legacy).toBeUndefined();
  });
});
