import { describe, expect, it } from 'vitest';
import { seeded } from './cross';
import { alleleFor, birdPicks, birdSurvival, dominantShare, run, shownCount, step, survivalFrom, type Form } from './selection';

describe('selection on a dominant form', () => {
  it('converts between allele frequency and the share showing the dominant form', () => {
    expect(dominantShare(0.5)).toBeCloseTo(0.75);
    expect(alleleFor(0.75)).toBeCloseTo(0.5);
    for (const share of [0.01, 0.1, 0.5, 0.98]) expect(dominantShare(alleleFor(share))).toBeCloseTo(share, 10);
  });

  it('changes nothing without selection and moves the favoured form up', () => {
    expect(step(0.3, { dominant: 0.8, recessive: 0.8 })).toBeCloseTo(0.3, 12);
    expect(step(0.3, { dominant: 1, recessive: 0.6 })).toBeGreaterThan(0.3);
    expect(step(0.3, { dominant: 0.6, recessive: 1 })).toBeLessThan(0.3);
  });

  it('matches the recursion worked by hand', () => {
    // p = 0.1: q² = 0.81, mean fitness = 0.19·1 + 0.81·0.5 = 0.595, p' = 0.1/0.595.
    expect(step(0.1, { dominant: 1, recessive: 0.5 })).toBeCloseTo(0.1 / 0.595, 12);
  });

  it('keeps the recessive allele hidden in carriers even when every recessive-form moth is eaten', () => {
    const p = step(0.5, { dominant: 1, recessive: 0 });
    expect(1 - p).toBeCloseTo(0.5 / 1.5, 12); // q' = q / (1 + q)
    expect(1 - p).toBeGreaterThan(0);
  });

  it('runs until the stop rule or the cap', () => {
    const toward = run(alleleFor(0.1), { dominant: 1, recessive: 0.64 }, p => dominantShare(p) >= 0.98, 200);
    expect(dominantShare(toward.at(-1)!)).toBeGreaterThanOrEqual(0.98);
    expect(toward.length).toBeGreaterThan(5);
    expect(run(0.2, { dominant: 1, recessive: 1 }, () => false, 7)).toHaveLength(8);
  });

  it('shows an honest sample, never hiding a form that is still around', () => {
    const rng = seeded('moths');
    const counts = Array.from({ length: 4000 }, () => shownCount(0.1, 24, rng));
    expect(counts.reduce((a, b) => a + b, 0) / counts.length).toBeCloseTo(2.4, 1);
    expect(shownCount(0.01, 24, () => 0.99)).toBe(1);
    expect(shownCount(0.99, 24, () => 0)).toBe(23);
    expect(shownCount(0.999, 24, () => 0)).toBe(24);
  });

  it('reads survival from the hunts and lets a stand-in bird favour moths that stand out', () => {
    expect(survivalFrom([{ shown: { dominant: 2, recessive: 22 }, caught: { dominant: 0, recessive: 8 } }]))
      .toEqual({ dominant: 1, recessive: 1 - 8 / 23 });
    // Catching every black moth on screen never wipes black out of the whole population.
    expect(survivalFrom([{ shown: { dominant: 2, recessive: 22 }, caught: { dominant: 2, recessive: 6 } }]).dominant).toBeCloseTo(1 / 3);
    expect(survivalFrom([{ shown: { dominant: 0, recessive: 24 }, caught: { dominant: 0, recessive: 8 } }]).dominant).toBe(1);
    const forms: Form[] = Array.from({ length: 24 }, (_, i) => (i < 12 ? 'dominant' : 'recessive'));
    let dark = 0;
    const rng = seeded('bird');
    for (let k = 0; k < 500; k++) dark += birdPicks(forms, { dominant: 1, recessive: 4 }, 8, rng).filter(i => forms[i] === 'dominant').length;
    expect(dark / (500 * 8)).toBeLessThan(0.35);
    expect(new Set(birdPicks(forms, { dominant: 1, recessive: 1 }, 8, seeded('n'))).size).toBe(8);
  });

  it('gives the stand-in bird smooth, repeatable effects that favour camouflage both ways', () => {
    const soot = { dominant: 1, recessive: 4 }, lichen = { dominant: 4, recessive: 1 };
    const onSoot = birdSurvival(0.1, 24, 8, soot);
    expect(onSoot.dominant).toBeGreaterThan(onSoot.recessive);
    // A single conspicuous moth among 23 camouflaged ones: 1 − (1 − 4/27)^8.
    expect(1 - birdSurvival(1 / 24, 24, 8, lichen).dominant).toBeCloseTo(1 - (1 - 4 / 27) ** 8, 10);
    let p = alleleFor(0.15), n = 0;
    while (dominantShare(p) < 0.98 && n < 120) { p = step(p, birdSurvival(dominantShare(p), 24, 8, soot)); n++; }
    expect(dominantShare(p)).toBeGreaterThanOrEqual(0.98);
    let back = 0;
    while (dominantShare(p) > 0.1 && back < 160) { p = step(p, birdSurvival(dominantShare(p), 24, 8, lichen)); back++; }
    expect(dominantShare(p)).toBeLessThanOrEqual(0.1);
    expect(dominantShare(p)).toBeGreaterThan(0.05);
  });
});