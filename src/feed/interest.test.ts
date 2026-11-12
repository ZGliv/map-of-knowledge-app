import { describe, expect, it } from 'vitest';
import {
  TUNING, chain, counts, createInterest, evidence, featuresOf, idle, interestIn, keysOf, keywords, observe, observePlace,
  packInterest, parentKey, posterior, recentCounts, sampler, unpackInterest,
} from './interest';
import type { FeedVideo } from './pool';
import { beta, hashString, rng, unit } from './rng';

const video = (extra: Partial<FeedVideo> = {}): FeedVideo => ({
  id: 'abcdefghijk', channel: 'UCx', title: 'How Black Holes Bend Light', learn: 'Why gravity curves the path of light near a black hole.',
  places: ['knowledge.science.astronomy', 'knowledge.science.physics.relativity'], short: true, aspect: 0.5625, duration: null, published: '2026-10-01', ...extra,
});

describe('seeded randomness', () => {
  it('gives the same numbers for the same seed, and different ones for another', () => {
    const a = rng('seed'), b = rng('seed'), c = rng('other');
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
    expect(hashString('x')).toBe(hashString('x'));
    expect(unit('s', 'k')).toBeGreaterThanOrEqual(0);
    expect(unit('s', 'k')).toBeLessThan(1);
  });

  it('draws Beta samples around their mean', () => {
    const rand = rng('beta');
    const draws = Array.from({ length: 4000 }, () => beta(rand, 8, 2));
    const mean = draws.reduce((s, n) => s + n, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.77);
    expect(mean).toBeLessThan(0.83);
    expect(draws.every(n => n >= 0 && n <= 1)).toBe(true);
  });
});

describe('features', () => {
  it('names a place and its ancestors, territory first, never the root', () => {
    expect(chain('knowledge.science.physics.relativity')).toEqual(['knowledge.science', 'knowledge.science.physics', 'knowledge.science.physics.relativity']);
    expect(chain('knowledge')).toEqual([]);
    expect(parentKey('p:knowledge.science.physics')).toBe('p:knowledge.science');
    expect(parentKey('p:knowledge.science')).toBe('g');
    expect(parentKey('c:UCx')).toBe('g');
    expect(parentKey('g')).toBeNull();
  });

  it('keeps the plain words of a title: no common words, plurals folded', () => {
    expect(keywords('How Black Holes Bend Light — and why it matters')).toEqual(['black', 'hole', 'bend', 'light', 'matter']);
    expect(keywords('The the THE, what a video!')).toEqual([]);
    expect(keywords('Gauss and Genus and Cactus and Atlases')).toEqual(['gauss', 'genus', 'cactus', 'atlase']);
  });

  it('teaches the places (secondary ones less), the channel and the words', () => {
    const f = featuresOf(video());
    expect(f.get('p:knowledge.science.astronomy')).toBe(1);
    expect(f.get('p:knowledge.science')).toBe(1);
    expect(f.get('p:knowledge.science.physics.relativity')).toBe(TUNING.secondary);
    expect(f.get('c:UCx')).toBe(1);
    expect(f.get('w:black')).toBe(TUNING.word);
  });
});

describe('learning', () => {
  it('adds good and bad evidence, one tick of the clock per impression', () => {
    let model = observe(createInterest(), video(), 1, 1);
    model = observe(model, video({ id: 'second' }), 0, 2);
    expect(model.clock).toBe(2);
    const g = counts(model.stats.g, model.clock);
    expect(g.a).toBeCloseTo(1 * TUNING.decay, 5);
    expect(g.b).toBeCloseTo(2, 5);
  });

  it('fades old evidence with each impression and with time away', () => {
    const model = observe(createInterest(), video(), 1, 1);
    const later = idle(model, 10);
    expect(later.clock).toBe(1 + 10 * TUNING.idlePerDay);
    expect(evidence(later)).toBeLessThan(evidence(model));
    expect(evidence(idle(model, 0))).toBe(evidence(model));
  });

  it('takes evidence from outside the feed up a place’s chain, nearer ancestors more', () => {
    const model = observePlace(createInterest(), 'knowledge.science.biology.evolution', 1, 2);
    const at = (key: string) => counts(model.stats[key], model.clock).a;
    expect(at('p:knowledge.science.biology.evolution')).toBe(2);
    expect(at('p:knowledge.science.biology')).toBeLessThan(2);
    expect(at('p:knowledge.science')).toBeLessThan(at('p:knowledge.science.biology'));
    expect(model.clock).toBe(0);
  });
});

describe('reading it back', () => {
  it('leans on the parent where a place knows little, and on its own evidence as it grows', () => {
    let model = createInterest();
    for (let i = 0; i < 6; i++) model = observe(model, video({ id: `a${i}`, places: ['knowledge.science.astronomy'] }), 1, 1);
    const post = posterior(model);
    // Physics knows nothing of its own: it is where science stands, which astronomy has lifted.
    expect(post.mean('p:knowledge.science.physics')).toBeCloseTo(post.mean('p:knowledge.science'), 5);
    expect(post.mean('p:knowledge.science.astronomy')).toBeGreaterThan(post.mean('p:knowledge.science'));
    expect(post.mean('p:knowledge.arts')).toBeCloseTo(post.mean('g'), 5);
    expect(post.mean('p:knowledge.science')).toBeGreaterThan(TUNING.prior);
  });

  it('adds pseudo-evidence from the map without saving it', () => {
    const model = createInterest();
    const post = posterior(model, new Map([['p:knowledge.arts.music', 3]]));
    expect(post.mean('p:knowledge.arts.music')).toBeGreaterThan(posterior(model).mean('p:knowledge.arts.music'));
    expect(model.stats).toEqual({});
  });

  it('draws parent first; an untouched deep place is its parent’s draw; territories and fields are always drawn', () => {
    const post = posterior(createInterest());
    const draw = sampler(post, rng('s'));
    expect(draw('p:knowledge.science.physics.relativity.gravity')).toBe(draw('p:knowledge.science.physics.relativity'));
    expect(draw('p:knowledge.science.physics.relativity')).toBe(draw('p:knowledge.science.physics'));
    expect(draw('c:UCnew')).toBe(draw('g'));
    expect(draw('p:knowledge.science.physics')).not.toBe(draw('p:knowledge.science'));
    // The same seed draws the same.
    expect(sampler(post, rng('s'))('p:knowledge.arts')).toBe(sampler(post, rng('s'))('p:knowledge.arts'));
  });

  it('draws close to the mean when sharpened, freely otherwise', () => {
    let model = createInterest();
    for (let i = 0; i < 3; i++) model = observe(model, video({ id: `x${i}` }), 1, 1);
    const post = posterior(model);
    const spread = (sharpness: number) => {
      const draws = Array.from({ length: 400 }, (_, i) => sampler(post, rng(`d${i}`), sharpness)('p:knowledge.arts'));
      const mean = draws.reduce((s, n) => s + n, 0) / draws.length;
      return Math.sqrt(draws.reduce((s, n) => s + (n - mean) ** 2, 0) / draws.length);
    };
    expect(spread(12)).toBeLessThan(spread(1) / 2);
  });

  it('wants a video by its best place, its channel and its words', () => {
    let model = createInterest();
    for (let i = 0; i < 5; i++) model = observe(model, video({ id: `l${i}`, channel: 'UCloved' }), 1, 1);
    for (let i = 0; i < 5; i++) model = observe(model, video({ id: `s${i}`, channel: 'UCskipped', places: ['knowledge.humanities.history'], title: 'Kings', learn: 'Crowns.' }), 0, 1.6);
    const post = posterior(model);
    const want = (v: FeedVideo) => interestIn(keysOf(v), post.mean('g'), post.mean);
    expect(want(video({ channel: 'UCloved' }))).toBeGreaterThan(want(video({ channel: 'UCskipped' })));
    expect(want(video())).toBeGreaterThan(want(video({ places: ['knowledge.humanities.history'] })));
  });
});

describe('the short memory', () => {
  const arts = (i: number) => video({ id: `art${i}`, channel: `UCart${i % 3}`, places: ['knowledge.arts.visual-arts.painting'], title: `Painting ${i}`, learn: 'Brushwork.' });
  const liked = () => { let model = createInterest(); for (let i = 0; i < 12; i++) model = observe(model, arts(i), 1, 1); return model; };

  it('counts the no’s in a row, back to none at a yes or a new day', () => {
    let model = liked();
    expect(model.streak).toBe(0);
    for (let i = 0; i < 3; i++) model = observe(model, arts(20 + i), 0, 1.6);
    expect(model.streak).toBe(3);
    expect(observe(model, arts(30), 1, 1).streak).toBe(0);
    expect(idle(model, 1).streak).toBe(0);
  });

  it('lets an old favourite go once the learner keeps skipping it, down every place beneath it', () => {
    let model = liked();
    const before = posterior(model);
    expect(before.trust('p:knowledge.arts')).toBe(1);
    for (let i = 0; i < 4; i++) model = observe(model, arts(40 + i), 0, 1.6);
    const after = posterior(model);
    expect(after.trust('p:knowledge.arts')).toBeLessThan(0.3);
    // A corner of arts never shown inherits the doubt.
    expect(after.trust('p:knowledge.arts.music')).toBeLessThan(0.3);
    expect(after.mean('p:knowledge.arts')).toBeLessThan(before.mean('p:knowledge.arts') / 2);
    // The long memory still has the old yes's: the short memory only says how much they count now.
    expect(counts(model.stats['p:knowledge.arts'], model.clock).a).toBeGreaterThan(8);
    // A yes again, and they count more.
    const back = posterior(observe(model, arts(50), 1, 1));
    expect(back.trust('p:knowledge.arts')).toBeGreaterThan(after.trust('p:knowledge.arts'));
  });

  it('does not doubt a favourite over one skip among yes’s', () => {
    let model = liked();
    model = observe(model, arts(60), 0, 1.6);
    expect(posterior(model).trust('p:knowledge.arts')).toBe(1);
  });

  it('fades within a session, and leans a doubted area’s channel and words toward the overall appetite', () => {
    let model = liked();
    for (let i = 0; i < 4; i++) model = observe(model, arts(70 + i), 0, 1.6);
    const { a, b } = recentCounts(model, 'p:knowledge.arts');
    expect(a + b).toBeGreaterThan(3);
    // It fades over a session, and mostly goes in a week away.
    expect(recentCounts({ ...model, clock: model.clock + 20 }, 'p:knowledge.arts').b).toBeLessThan(b / 2);
    expect(recentCounts(idle(model, 7), 'p:knowledge.arts').b).toBeLessThan(b * 0.15);
    // A loved channel and words, in an area now doubted: they lean back toward the overall appetite.
    const keys = keysOf(arts(1));
    const value = (key: string) => key === 'g' ? 0.2 : 0.8;
    expect(interestIn(keys, 0.9, value, 0.2)).toBeLessThan(interestIn(keys, 0.9, value, 1));
    expect(interestIn(keys, 0.9, value)).toBe(interestIn(keys, 0.9, value, 1));
  });
});

describe('keeping it', () => {
  it('survives a round trip, rounded, and drops malformed or faded entries', () => {
    const model = observe(observe(createInterest(), video(), 1, 1), video({ id: 'b' }), 0.5, 1);
    const back = unpackInterest(JSON.parse(JSON.stringify(packInterest(model))));
    expect(back.clock).toBe(model.clock);
    expect(Object.keys(back.stats).sort()).toEqual(Object.keys(model.stats).sort());
    expect(back.stats.g.a).toBeCloseTo(model.stats.g.a, 3);
    expect(Object.keys(back.recent ?? {}).sort()).toEqual(Object.keys(model.recent ?? {}).filter(key => !key.startsWith('w:')).sort());
    expect(back.streak).toBe(model.streak);
    expect(unpackInterest({ clock: 3, stats: {}, recent: { g: [1, 1, 1], 'w:x': [1, 1, 1], 'p:knowledge.arts': [0, 2, 3] }, streak: -2 })).toMatchObject({ recent: { 'p:knowledge.arts': { a: 0, b: 2, n: 3 } }, streak: 0 });
    expect(unpackInterest({ clock: 3, stats: { g: [1, 1, 2], 'bad key!': [1, 1, 1], 'p:knowledge.arts': [1, -1, 1], 'c:UCy': 'x' } }).stats).toEqual({ g: { a: 1, b: 1, n: 2 } });
    expect(unpackInterest(null)).toEqual(createInterest());
    expect(unpackInterest({ clock: -4 }).clock).toBe(0);
  });

  it('keeps at most maxStats features, the strongest', () => {
    let model = createInterest();
    const stats: Record<string, { a: number; b: number; n: number }> = { g: { a: 1, b: 1, n: 0 } };
    for (let i = 0; i < TUNING.maxStats + 50; i++) stats[`w:word${i}`] = { a: i / 1000, b: 0, n: 0 };
    model = { clock: 0, stats };
    const packed = packInterest(model);
    expect(Object.keys(packed.stats).length).toBeLessThanOrEqual(TUNING.maxStats);
    expect(packed.stats[`w:word${TUNING.maxStats + 49}`]).toBeDefined();
    expect(packed.stats['w:word1']).toBeUndefined();
  });
});
