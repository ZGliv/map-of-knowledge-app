import { describe, expect, it } from 'vitest';
import { best, mating, offspring, peakAcross, sample, shift, survival, type Setting } from './tradeoffModel';

const many: Setting = { id: 'many', label: 'Many predators', base: 0.5, rate: 4.5 };
const few: Setting = { id: 'few', label: 'Few predators', base: 0.8, rate: 1.8 };
const pull = { lift: 0.05, power: 1.5 };

describe('trade-off model', () => {
  it('pulls two ways: survival falls and mating success rises as the trait grows', () => {
    const xs = sample(x => x, 20).map(([x]) => x);
    for (let i = 1; i < xs.length; i++) {
      expect(survival(xs[i], many)).toBeLessThan(survival(xs[i - 1], many));
      expect(mating(xs[i], pull)).toBeGreaterThan(mating(xs[i - 1], pull));
    }
    expect(mating(1, pull)).toBeCloseTo(1, 12);
    expect(survival(0, few)).toBe(few.base);
  });

  it('puts the best value where the closed form says, and a fine scan agrees', () => {
    for (const s of [many, few]) {
      const scan = sample(x => offspring(x, s, pull), 20000).reduce((a, b) => (b[1] > a[1] ? b : a));
      expect(best(s, pull)).toBeCloseTo(pull.power / s.rate - pull.lift, 12);
      expect(Math.abs(scan[0] - best(s, pull))).toBeLessThan(1e-3);
    }
  });

  it('keeps the best value strictly inside the slider for these settings, so the peak is a real peak', () => {
    for (const s of [many, few]) { expect(best(s, pull)).toBeGreaterThan(0.05); expect(best(s, pull)).toBeLessThan(0.95); }
  });

  it('moves the best value up when the cost falls, and down when it rises', () => {
    expect(best(few, pull)).toBeGreaterThan(best(many, pull));
    expect(shift(many, few, pull)).toBe('more');
    expect(shift(few, many, pull)).toBe('less');
    expect(shift(many, many, pull)).toBe('same');
  });

  it('clamps the best value to the slider when one pull overwhelms the other', () => {
    expect(best({ ...few, rate: 0.5 }, pull)).toBe(1);
    expect(best({ ...many, rate: 100 }, pull)).toBe(0);
  });

  it('scales every setting against the tallest peak, so switching settings compares honestly', () => {
    const top = peakAcross([many, few], pull);
    expect(top).toBeCloseTo(Math.max(offspring(best(many, pull), many, pull), offspring(best(few, pull), few, pull)), 12);
    for (const s of [many, few]) for (const [, v] of sample(x => offspring(x, s, pull) / top)) expect(v).toBeLessThanOrEqual(1 + 1e-12);
  });
});
