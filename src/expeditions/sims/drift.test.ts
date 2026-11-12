import { describe, expect, it } from 'vitest';
import { absorbedAt, binomial, expectedFixed, expectedNext, genealogy, meanVariance, replicateRuns, seeded, tally, wrightFisher } from './drift';
import { chanceOfNone, expectedRandom, finalSize, plateCounts, poisson, randomCulture } from './fluctuationMath';

describe('binomial draws', () => {
  it('match the mean and variance of n·p and n·p·(1 − p) on both code paths', () => {
    for (const [n, p] of [[20, 0.5], [40, 0.1], [2000, 0.5], [2000, 0.01], [2000, 0.97]] as const) {
      const rand = seeded(`binom:${n}:${p}`);
      const draws = Array.from({ length: 6000 }, () => binomial(n, p, rand));
      const { mean, variance } = meanVariance(draws);
      expect(mean).toBeCloseTo(n * p, n * p > 50 ? -0.5 : 0);
      expect(variance / (n * p * (1 - p))).toBeGreaterThan(0.9);
      expect(variance / (n * p * (1 - p))).toBeLessThan(1.1);
      expect(draws.every(k => Number.isInteger(k) && k >= 0 && k <= n)).toBe(true);
    }
  });
  it('handle the edges exactly', () => {
    const rand = seeded('edges');
    expect(binomial(10, 0, rand)).toBe(0);
    expect(binomial(10, 1, rand)).toBe(10);
    expect(binomial(0, 0.5, rand)).toBe(0);
  });
});

describe('Wright–Fisher drift', () => {
  it('fixes a neutral variant in a share of populations within ±0.03 of its starting frequency', () => {
    for (const p0 of [0.5, 0.3]) {
      const runs = replicateRuns({ N: 10, p0, generations: 400, replicates: 2000, seed: `neutral:${p0}` });
      const t = tally(runs);
      expect(t.mixed).toBe(0);
      expect(Math.abs(t.fixed / 2000 - p0)).toBeLessThan(0.03);
    }
  });

  it('drifts every finite population, small ones far faster', () => {
    const small = replicateRuns({ N: 10, p0: 0.5, generations: 100, replicates: 200, seed: 'size' });
    const large = replicateRuns({ N: 1000, p0: 0.5, generations: 100, replicates: 200, seed: 'size' });
    const spread = (runs: number[][]) => meanVariance(runs.map(r => r[r.length - 1])).variance;
    expect(tally(small).mixed).toBeLessThan(10);
    expect(tally(large).mixed).toBe(200);
    // Large populations still move: theory gives a variance near p·q·(1 − (1 − 1/2N)^t) ≈ 0.012.
    expect(spread(large)).toBeGreaterThan(0.006);
    expect(spread(large)).toBeLessThan(0.02);
    expect(spread(small)).toBeGreaterThan(spread(large) * 10);
  });

  it('moves a favoured variant upward and leaves a neutral one unbiased', () => {
    expect(expectedNext(0.5, 0.1)).toBeGreaterThan(0.5);
    expect(expectedNext(0.5, -0.1)).toBeLessThan(0.5);
    expect(expectedNext(0.37, 0)).toBeCloseTo(0.37, 12);
    const favoured = replicateRuns({ N: 500, p0: 0.2, s: 0.1, generations: 200, replicates: 20, seed: 'sel' });
    expect(tally(favoured).fixed).toBeGreaterThan(15);
  });

  it('repeats exactly from the same seed and differs between seeds', () => {
    const a = wrightFisher({ N: 50, p0: 0.5, generations: 60, seed: 'same' });
    expect(wrightFisher({ N: 50, p0: 0.5, generations: 60, seed: 'same' })).toEqual(a);
    expect(wrightFisher({ N: 50, p0: 0.5, generations: 60, seed: 'other' })).not.toEqual(a);
    expect(a).toHaveLength(61);
    expect(a[0]).toBe(0.5);
  });

  it('stops once a variant is fixed or lost', () => {
    const path = wrightFisher({ N: 5, p0: 0.5, generations: 300, seed: 'stop' });
    const at = absorbedAt(path)!;
    expect(at).not.toBeNull();
    expect(new Set(path.slice(at))).toHaveProperty('size', 1);
  });

  it('runs 20 populations of 1,000 for 500 generations in well under 50 ms', () => {
    const t0 = performance.now();
    replicateRuns({ N: 1000, p0: 0.5, generations: 500, replicates: 20, seed: 'speed' });
    expect(performance.now() - t0).toBeLessThan(50);
  });

  it('gives the theoretical expectation for fixation, not a run', () => {
    expect(expectedFixed(0.3, 20)).toBe(6);
    expect(expectedFixed(0.5, 20)).toBe(10);
  });

  it('draws a genealogy where each copy inherits its parent’s version and lines never cross', () => {
    const g = genealogy(20, 10, 30, 'beads');
    expect(g.allele[0].reduce((a, b) => a + b, 0)).toBe(10);
    for (let gen = 1; gen < g.allele.length; gen++) {
      for (let i = 0; i < 20; i++) expect(g.allele[gen][i]).toBe(g.allele[gen - 1][g.parent[gen][i]]);
      for (let i = 1; i < 20; i++) expect(g.parent[gen][i]).toBeGreaterThanOrEqual(g.parent[gen][i - 1]);
    }
    expect(genealogy(20, 10, 30, 'beads')).toEqual(g);
  });
});

describe('fluctuation test model', () => {
  it('draws Poisson counts with mean and variance near λ', () => {
    for (const lambda of [0.4, 11, 60]) {
      const rand = seeded(`poisson:${lambda}`);
      const { mean, variance } = meanVariance(Array.from({ length: 8000 }, () => poisson(lambda, rand)));
      expect(mean / lambda).toBeGreaterThan(0.95);
      expect(mean / lambda).toBeLessThan(1.05);
      expect(variance / lambda).toBeGreaterThan(0.9);
      expect(variance / lambda).toBeLessThan(1.1);
    }
  });

  const model = { start: 128, doublings: 22, rate: 1.1e-9 };

  it('makes chance mutation give jackpots: variance far above the mean, many empty dishes', () => {
    const rand = seeded('cultures');
    const counts = Array.from({ length: 4000 }, () => randomCulture(model, rand));
    const { mean, variance } = meanVariance(counts);
    expect(mean).toBeGreaterThan(expectedRandom(model) * 0.6);
    expect(mean).toBeLessThan(expectedRandom(model) * 1.4);
    expect(variance).toBeGreaterThan(mean * 20);
    const empty = counts.filter(c => c === 0).length / counts.length;
    expect(Math.abs(empty - chanceOfNone(model))).toBeLessThan(0.03);
  });

  it('makes induced resistance give even dishes', () => {
    const counts = plateCounts('induced', 4000, model, 11, seeded('induced'));
    const { mean, variance } = meanVariance(counts);
    expect(variance / mean).toBeLessThan(1.15);
  });

  it('matches its own arithmetic for culture size and expectation', () => {
    expect(finalSize(model)).toBe(128 * 2 ** 22);
    expect(expectedRandom(model)).toBeCloseTo(model.rate * finalSize(model) * model.doublings / 2, 6);
  });

  it('separates the 1943 control and the 1943 parallel cultures the same way the model does', () => {
    // Luria & Delbrück 1943, Table 1 (exp. 10a, ten samples of one culture) and Table 2 (exp. 16, twenty cultures).
    const oneCulture = [14, 15, 13, 21, 15, 14, 26, 16, 20, 13];
    const twentyCultures = [1, 0, 3, 0, 0, 5, 0, 5, 0, 6, 107, 0, 0, 0, 1, 0, 0, 64, 0, 35];
    const a = meanVariance(oneCulture), b = meanVariance(twentyCultures);
    expect(a.mean).toBeCloseTo(16.7, 5);
    expect(b.mean).toBeCloseTo(11.35, 5);
    expect(a.variance / a.mean).toBeLessThan(1.5);
    expect(b.variance / b.mean).toBeGreaterThan(50);
  });
});
