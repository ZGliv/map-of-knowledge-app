import { describe, expect, it } from 'vitest';
import { emptyImpression, type Impression } from './engagement';
import { counts } from './interest';
import { createFeedMemory, recordImpression, type FeedMemory } from './memory';
import { fieldOf, territoryOf } from './places';
import type { FeedVideo } from './pool';
import {
  CHECKPOINT_EVERY, PLAN, createPlan, extendPlan, freshness, isCheckpointSlot, isExploreSlot, pickVideo, planStartingWith, popularity, pseudoCounts, replanAfter,
  type FeedItem, type FeedSignals, type PlanContext,
} from './recommend';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const PLACES = [
  'knowledge.science.physics.mechanics.motion', 'knowledge.science.physics.thermodynamics', 'knowledge.science.chemistry',
  'knowledge.science.biology.evolution.natural-selection', 'knowledge.science.astronomy', 'knowledge.mathematics.geometry',
  'knowledge.mathematics.probability', 'knowledge.technology.computing', 'knowledge.technology.engineering', 'knowledge.earth.oceans',
  'knowledge.earth.climate', 'knowledge.society.psychology', 'knowledge.humanities.history', 'knowledge.humanities.philosophy',
  'knowledge.arts.music', 'knowledge.arts.architecture', 'knowledge.economics.money', 'knowledge.economics.markets',
];
const CHANNELS = ['UCa', 'UCb', 'UCc', 'UCd', 'UCe', 'UCf', 'UCg', 'UCh'];

/** 8 videos per place, spread across eight channels, half of them Shorts. */
const POOL: FeedVideo[] = PLACES.flatMap((place, p) => [0, 1, 2, 3, 4, 5, 6, 7].map(n => ({
  id: `v${String(p).padStart(2, '0')}${n}`,
  channel: CHANNELS[(p + n) % CHANNELS.length],
  title: `Video ${p}.${n} about ${place.split('.').at(-1)}`,
  learn: 'Something concrete.',
  places: [place],
  short: n % 2 === 0,
  aspect: n % 2 === 0 ? 0.5625 : 1.778,
  duration: null,
  published: '2026-09-01',
  views: 1000 * (n + 1),
})));
const NO_MAP: FeedSignals = { focus: null, recent: [], pinned: [], lit: [] };
const signals = (extra: Partial<FeedSignals> = {}): FeedSignals => ({ ...NO_MAP, ...extra });
const context = (extra: Partial<PlanContext> = {}): PlanContext => ({ pool: POOL, signals: NO_MAP, memory: createFeedMemory(), seed: 'test', ...extra });
const plan = (ctx: PlanContext, count: number) => extendPlan(ctx, createPlan(), count, NOW).items;
const videos = (items: readonly FeedItem[]) => items.flatMap(item => item.kind === 'video' ? [item.video] : []);
const fitVideos = (items: readonly FeedItem[]) => items.flatMap(item => item.kind === 'video' && item.lane === 'fit' ? [item.video] : []);

const through = (video: FeedVideo): Impression => ({ ...emptyImpression(video.short), dwellMs: 40_000, playedS: 40, durationS: 40, ended: true, heard: true });
const skipped = (video: FeedVideo): Impression => ({ ...emptyImpression(video.short), dwellMs: 1200, playedS: 0.8, durationS: 40, heard: true });

/** A learner who finishes everything inside `likes` and skips everything else, card by card, the
 * plan made again after each card as the app does. Returns the videos served. */
function session(likes: (video: FeedVideo) => boolean, count: number, start: FeedMemory = createFeedMemory(), seed = 'learner'): { served: FeedVideo[]; memory: FeedMemory; items: FeedItem[] } {
  let memory = start;
  const ctx = () => context({ memory, seed });
  let state = extendPlan(ctx(), createPlan(), 6, NOW);
  const served: FeedVideo[] = [];
  for (let visible = 0; served.length < count; visible++) {
    const item = state.items[visible];
    if (!item || item.kind === 'end') break;
    if (item.kind !== 'video') continue;
    memory = recordImpression(memory, item.video, likes(item.video) ? through(item.video) : skipped(item.video), new Date(NOW + visible * 60_000).toISOString());
    served.push(item.video);
    state = extendPlan(ctx(), replanAfter(state, visible + 1), 6, NOW);
  }
  return { served, memory, items: state.items };
}

describe('cadence', () => {
  it('puts a checkpoint on every 8th card', () => {
    expect(CHECKPOINT_EVERY).toBe(8);
    expect([0, 6, 7, 8, 14, 15, 23].map(isCheckpointSlot)).toEqual([false, false, true, false, false, true, true]);
    const at = plan(context(), 40).flatMap((item, i) => item.kind === 'checkpoint' ? [i] : []);
    expect(at).toEqual([7, 15, 23, 31, 39]);
  });

  it('is YouTube only: every card is a video or a checkpoint (MoK’s reels have their own tab)', () => {
    for (const seed of ['a', 'b', 'c']) {
      const items = plan(context({ seed, signals: signals({ focus: 'knowledge.science.physics' }) }), 64);
      expect(items).toHaveLength(64);
      expect(new Set(items.map(item => item.kind))).toEqual(new Set(['video', 'checkpoint']));
      expect(videos(items)).toHaveLength(56);
    }
  });

  it('makes every fifth video an exploring pick, never the first', () => {
    expect(PLAN.exploreEvery).toBe(5);
    expect([0, 3, 4, 8, 9, 10].map(i => isExploreSlot(i))).toEqual([false, false, true, false, true, false]);
    const lanes = plan(context(), 24).flatMap(item => item.kind === 'video' ? [item.lane] : []);
    expect(lanes.map((lane, i) => lane === 'explore' ? i : -1).filter(i => i >= 0)).toEqual([4, 9, 14, 19]);
  });
});

describe('the same seed, the same feed', () => {
  it('is deterministic given its inputs and seed, and varies with the seed', () => {
    const ids = (seed: string) => videos(plan(context({ seed }), 30)).map(v => v.id).join(' ');
    expect(ids('one')).toBe(ids('one'));
    expect(ids('one')).not.toBe(ids('two'));
    const learned = (seed: string) => session(v => v.places[0].startsWith('knowledge.arts'), 20, createFeedMemory(), seed).served.map(v => v.id).join(' ');
    expect(learned('x')).toBe(learned('x'));
  });
});

describe('variety', () => {
  it('never shows the same channel twice in a row, nor repeats a video in a session', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const shown = videos(plan(context({ seed, signals: signals({ focus: 'knowledge.science.physics' }) }), 60));
      for (let i = 1; i < shown.length; i++) expect(shown[i].channel).not.toBe(shown[i - 1].channel);
      expect(new Set(shown.map(v => v.id)).size).toBe(shown.length);
    }
  });

  it(`never puts more than ${PLAN.maxRun} cards in a row from one territory, even for a learner who loves one`, () => {
    const { served } = session(v => v.places[0].startsWith('knowledge.science'), 60);
    const territories = served.map(video => territoryOf(video.places[0]));
    for (let i = PLAN.maxRun; i < territories.length; i++) expect(territories.slice(i - PLAN.maxRun, i + 1).every(t => t === territories[i])).toBe(false);
  });

  it('opens a first session (nothing learned, no map) on Shorts spread across territories', () => {
    const first = videos(plan(context({ seed: 'fresh' }), 8));
    expect(first.filter(v => v.short).length).toBeGreaterThanOrEqual(6);
    expect(new Set(first.map(v => territoryOf(v.places[0]))).size).toBeGreaterThanOrEqual(5);
    expect(new Set(first.map(v => v.channel)).size).toBeGreaterThanOrEqual(5);
  });

  it('keeps exploring: exploring picks come from fields the learner has hardly met', () => {
    const music = (v: FeedVideo) => fieldOf(v.places[0]) === 'knowledge.arts.music';
    const { items, memory } = session(music, 40);
    const explored = items.flatMap(item => item.kind === 'video' && item.lane === 'explore' ? [item.video] : []);
    expect(explored.length).toBeGreaterThanOrEqual(6);
    // Each was barely met when it was picked; together they reach well beyond music. An exploring
    // pick may be what found music, but once music is known none goes back there.
    expect(new Set(explored.map(v => fieldOf(v.places[0]))).size).toBeGreaterThanOrEqual(5);
    const firstMusic = items.findIndex(item => item.kind === 'video' && music(item.video));
    expect(items.slice(firstMusic + 1).filter(item => item.kind === 'video' && item.lane === 'explore' && music(item.video))).toHaveLength(0);
    expect(counts(memory.model.stats['p:knowledge.arts.music'], memory.model.clock).a).toBeGreaterThan(3);
  });
});

describe('learning from what the learner does', () => {
  it('leans toward what they watch through and away from what they skip', () => {
    // Arts is 2 of the 18 places (16 videos): by chance about one card in nine.
    const arts = (v: FeedVideo) => v.places[0].startsWith('knowledge.arts');
    const { served, items } = session(arts, 24);
    expect(served.slice(0, 6).filter(arts).length).toBeLessThanOrEqual(3);
    const fit = fitVideos(items.slice(6, 26));
    expect(fit.filter(arts).length / fit.length).toBeGreaterThan(0.5);
  });

  it('follows a shift in interest within a session', () => {
    const arts = (v: FeedVideo) => v.places[0].startsWith('knowledge.arts');
    const maths = (v: FeedVideo) => v.places[0].startsWith('knowledge.mathematics');
    const before = session(arts, 30);
    const after = session(maths, 30, before.memory, 'later');
    expect(after.served.slice(-15).filter(maths).length).toBeGreaterThanOrEqual(5);
    expect(after.served.slice(-15).filter(arts).length).toBeLessThan(after.served.slice(-15).filter(maths).length);
  });

  it('lets go of an old favourite once the learner keeps skipping it', () => {
    const arts = (v: FeedVideo) => v.places[0].startsWith('knowledge.arts');
    const maths = (v: FeedVideo) => v.places[0].startsWith('knowledge.mathematics');
    const before = session(arts, 30);
    const after = session(maths, 30, before.memory, 'later');
    // Arts is skipped every time now: within a few cards it stops coming back, beyond a rare exploring pick.
    expect(after.served.slice(8).filter(arts).length).toBeLessThanOrEqual(3);
  });

  it('explores harder when nothing lands, and settles once something does', () => {
    // Skips everything at first: after PLAN.slump no's in a row, two cards in three explore.
    let memory = createFeedMemory();
    for (const video of POOL.filter(v => v.places[0].startsWith('knowledge.arts')).slice(0, PLAN.slump)) memory = recordImpression(memory, video, skipped(video));
    expect(memory.model.streak).toBe(PLAN.slump);
    const lanes = (m: FeedMemory) => extendPlan(context({ memory: m }), createPlan(), 12, NOW).items.flatMap(item => item.kind === 'video' ? [item.lane] : []);
    expect(lanes(memory).filter(lane => lane === 'explore').length).toBeGreaterThanOrEqual(6);
    const hit = POOL.find(v => v.places[0] === 'knowledge.earth.oceans')!;
    const landed = recordImpression(memory, hit, through(hit));
    expect(landed.model.streak).toBe(0);
    expect(lanes(landed).filter(lane => lane === 'explore').length).toBeLessThanOrEqual(2);
    expect([1, 2, 3, 4, 5].map(i => isExploreSlot(i, true))).toEqual([true, true, false, true, true]);
    // Not a slump while the map says where their attention is: the place in view still looks good.
    const focused = extendPlan(context({ memory, signals: signals({ focus: 'knowledge.earth.oceans' }) }), createPlan(), 12, NOW).items.flatMap(item => item.kind === 'video' ? [item.lane] : []);
    expect(focused.filter(lane => lane === 'explore').length).toBeLessThanOrEqual(2);
  });

  it('sinks a channel the learner keeps skipping', () => {
    const victim = 'UCa';
    const { served } = session(v => v.channel !== victim, 48);
    const late = served.slice(24);
    expect(late.filter(v => v.channel === victim).length / late.length).toBeLessThan(1 / CHANNELS.length);
  });
});

describe('the learner’s map', () => {
  it('leans toward the place in view from the very first card', () => {
    const shown = fitVideos(plan(context({ signals: signals({ focus: 'knowledge.science.physics' }) }), 10));
    expect(shown.filter(v => fieldOf(v.places[0]) === 'knowledge.science.physics').length).toBeGreaterThanOrEqual(4);
  });

  it('counts places underway, saved and lit, weighted, up each place’s chain', () => {
    const pseudo = pseudoCounts(signals({ focus: 'knowledge.science.physics.mechanics.motion', recent: ['knowledge.arts.music'], pinned: ['knowledge.earth.oceans'], lit: ['knowledge.mathematics.geometry'] }));
    expect(pseudo.get('p:knowledge.science.physics.mechanics.motion')).toBe(3);
    expect(pseudo.get('p:knowledge.science.physics.mechanics')!).toBeCloseTo(1.65);
    expect(pseudo.get('p:knowledge.science')!).toBeLessThan(pseudo.get('p:knowledge.science.physics')!);
    expect(pseudo.get('p:knowledge.arts.music')).toBe(2);
    expect(pseudo.get('p:knowledge.earth.oceans')).toBe(1.2);
    expect(pseudo.get('p:knowledge.mathematics.geometry')).toBe(0.8);
    expect(pseudo.has('p:knowledge')).toBe(false);
  });
});

describe('what never comes round again', () => {
  it('drops judged, watched, hidden and broken videos', () => {
    const [a, b, c, d] = POOL;
    let memory = recordImpression(createFeedMemory(), a, through(a), '2026-10-22T00:00:00Z');
    memory = recordImpression(memory, b, skipped(b), '2026-10-22T00:01:00Z');
    memory = { ...memory, hidden: [c.id], broken: [d.id] };
    const ids = new Set(videos(plan(context({ memory }), 160)).map(v => v.id));
    for (const gone of [a, b, c, d]) expect(ids.has(gone.id)).toBe(false);
  });

  it('a glance (a card flicked past) is not a judgement: it may come back', () => {
    const [a] = POOL;
    const memory = recordImpression(createFeedMemory(), a, { ...skipped(a), dwellMs: 300 });
    expect(memory.seen).not.toContain(a.id);
  });

  it('a video asked for by name plays even if watched, the plan carries on, and the session leans its way', () => {
    const asked = POOL.find(v => v.places[0] === 'knowledge.economics.money')!;
    const memory = recordImpression(createFeedMemory(), asked, through(asked));
    const state = extendPlan(context({ memory }), planStartingWith(asked), 10, NOW);
    expect(state.items[0]).toMatchObject({ kind: 'video', lane: 'asked', video: { id: asked.id } });
    expect(videos(state.items).filter(v => v.id === asked.id)).toHaveLength(1);
    expect(fitVideos(state.items).filter(v => territoryOf(v.places[0]) === 'knowledge.economics').length).toBeGreaterThanOrEqual(2);
    expect(replanAfter(state, 3).asked).toEqual(asked.places);
  });

  it('ends quietly when every video has been seen', () => {
    const items = plan(context({ pool: POOL.slice(0, 5) }), 20);
    expect(items.at(-1)?.kind).toBe('end');
    expect(videos(items)).toHaveLength(5);
  });
});

describe('lifts', () => {
  it('lifts new uploads, most in their first days', () => {
    expect(freshness({ published: '2026-10-22' }, NOW)).toBeGreaterThan(freshness({ published: '2026-10-10' }, NOW));
    expect(freshness({ published: '2026-10-10' }, NOW)).toBeGreaterThan(freshness({ published: '2026-01-01' }, NOW));
    expect(freshness({ published: null }, NOW)).toBe(1);
  });

  it('ranks popularity by views per day within the pool', () => {
    const ranks = popularity(POOL, NOW);
    expect(ranks.get('v007')).toBeGreaterThan(ranks.get('v000')!);
    expect(Math.max(...ranks.values())).toBe(1);
    expect(Math.min(...ranks.values())).toBe(0);
  });

  it('keeps the cards up to `keep` and nothing after when planning again', () => {
    const state = extendPlan(context(), createPlan(), 10, NOW);
    expect(replanAfter(state, 4).items).toEqual(state.items.slice(0, 5));
    expect(pickVideo(context({ pool: [] }), createPlan(), NOW)).toBeNull();
  });
});
