import { describe, expect, it } from 'vitest';
import { makeVariant } from '../engine/variants';
import { clockSeconds, DAY_SECONDS, describeSpan, dialAngle, formatClock, hoursFromRange, maAtClock, secondsBeforeMidnight, secondsFromPoint } from './deepTimeMath';

const EARTH = 4540;

describe('Earth’s history in one day', () => {
  it('puts formation at midnight, now at the next midnight, and is linear between', () => {
    expect(clockSeconds(EARTH, EARTH)).toBe(0);
    expect(clockSeconds(0, EARTH)).toBe(DAY_SECONDS);
    expect(clockSeconds(EARTH / 2, EARTH)).toBe(DAY_SECONDS / 2);
    expect(maAtClock(clockSeconds(538.8, EARTH), EARTH)).toBeCloseTo(538.8, 9);
  });

  it('places the landmarks where the arithmetic says', () => {
    expect(formatClock(clockSeconds(66, EARTH))).toBe('23:39');
    expect(formatClock(clockSeconds(538.8, EARTH))).toBe('21:09');
    expect(formatClock(clockSeconds(3500, EARTH))).toBe('05:29');
    // Our species, about 300,000 years ago: under six seconds before midnight.
    expect(secondsBeforeMidnight(300_000, EARTH)).toBeCloseTo(5.709, 2);
    expect(formatClock(DAY_SECONDS - secondsBeforeMidnight(300_000, EARTH), true)).toBe('23:59:54');
  });

  it('describes spans in plain words', () => {
    expect(describeSpan(secondsBeforeMidnight(300_000, EARTH))).toBe('6 seconds');
    expect(describeSpan(secondsBeforeMidnight(80, EARTH))).toBe('1.5 thousandths of a second');
    expect(describeSpan(clockSeconds(538.8, EARTH) - clockSeconds(600, EARTH))).toBe('19 minutes');
    expect(describeSpan(DAY_SECONDS - clockSeconds(538.8, EARTH))).toBe('2 hours 51 minutes');
  });

  it('measures how far a tap lands from a date range', () => {
    const inside = clockSeconds(570, EARTH);
    expect(hoursFromRange(inside, [600, 538.8], EARTH)).toBe(0);
    const early = clockSeconds(600, EARTH) - 2 * 3600;
    expect(hoursFromRange(early, [600, 538.8], EARTH)).toBeCloseTo(2, 9);
  });

  it('turns a point on the dial into a time and back', () => {
    expect(secondsFromPoint(0, -1)).toBeCloseTo(0, 9);
    expect(secondsFromPoint(1, 0)).toBeCloseTo(DAY_SECONDS / 4, 9);
    expect(secondsFromPoint(0, 1)).toBeCloseTo(DAY_SECONDS / 2, 9);
    expect(secondsFromPoint(-1, 0)).toBeCloseTo((3 * DAY_SECONDS) / 4, 9);
    expect(dialAngle(DAY_SECONDS / 2)).toBeCloseTo(Math.PI, 12);
  });
});

describe('number generators for E04 and E06', () => {
  const decay = {
    prompt: '{isotope}: half gone every {halfLife}. {sample} has {fraction} left.', ask: 'How old?', tolerance: 0.02, hint: 'h', aside: 'a',
    cases: [
      { isotope: 'Carbon-14', halfLife: 5700, unit: 'years', denominator: 4, sample: 'Charcoal' },
      { isotope: 'Potassium-40', halfLife: 1.25, unit: 'billion years', denominator: 8, sample: 'Ash', digits: 2 },
    ],
  };
  it('computes radiometric ages from whole half-lives', () => {
    const v = makeVariant('halfLife', decay, 0);
    expect(v.answer).toBe(11_400);
    expect(v.prompt).toBe('Carbon-14: half gone every 5,700 years. Charcoal has 1/4 left.');
    expect(v.working).toContain('1 → 1/2 → 1/4: 2 half-lives');
    const w = makeVariant('halfLife', decay, 1);
    expect(w.answer).toBeCloseTo(3.75, 12);
    expect(w.unit).toBe('billion years');
    expect(w.figure).toEqual({ kind: 'decay', halvings: 3, halfLife: 1.25, unit: 'billion years' });
    expect(() => makeVariant('halfLife', { ...decay, cases: [{ ...decay.cases[0], denominator: 3 }] }, 0)).toThrow();
  });

  it('expects a neutral variant to fix in share × populations, within the pack’s margin', () => {
    const params = { N: 10, generations: 400, margin: 2, prompt: '{populations} {place} at {percent}%', ask: 'How many?', hint: 'h', working: '{answer} expected; run {run}', cases: [{ percent: 30, populations: 20, place: 'ponds' }] };
    const v = makeVariant('fixation', params, 0);
    expect(v.answer).toBe(6);
    expect(v.answer * v.tolerance).toBeCloseTo(2, 12);
    expect(v.figure?.kind).toBe('ponds');
    const run = (v.figure as { run: number }).run;
    expect(run).toBeGreaterThanOrEqual(0);
    expect(run).toBeLessThanOrEqual(20);
    expect(makeVariant('fixation', params, 0)).toEqual(v);
  });
});
