import { describe, expect, it } from 'vitest';
import { clockSeconds, describeSpan, secondsBeforeMidnight } from '../sims/deepTimeMath';
import { getExpedition } from '../registry';
import type { Pack, SimBeat } from './types';

// Numbers E04, E06 and E08 print, recomputed by code. The shared pack rules run for every
// place in places/places.test.ts; sim keys are also checked by sims/archetypes.ts.
const simParams = <T,>(pack: Pack, sim: SimBeat['sim']) => (pack.beats.find((b): b is SimBeat => b.kind === 'sim' && b.sim === sim)!.params as unknown) as T;

describe('numbers the packs print are the ones the code computes', () => {
  it('E06: our species sits where the dial says, and the locate range is on the day', () => {
    const e06 = getExpedition('evolution-e06')!.pack;
    const p = simParams<{ earthMa: number; question: { choices: { id: string; label: string }[]; answer: string }; locate: { range: [number, number] } }>(e06, 'deepTime');
    const answer = p.question.choices.find(c => c.id === p.question.answer)!.label;
    expect(answer).toBe(`About ${describeSpan(secondsBeforeMidnight(300_000, p.earthMa))}`);
    const [a, b] = p.locate.range.map(ma => clockSeconds(ma, p.earthMa));
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });

  it('E08: the keyed worst crash is the tallest of the big five', () => {
    const e08 = getExpedition('evolution-e08')!.pack;
    const p = simParams<{ events: { id: string; value: number; big?: boolean }[]; pick: { answer: string }; max: number }>(e08, 'lifeChart');
    const big = p.events.filter(e => e.big);
    expect(big).toHaveLength(5);
    expect(big.reduce((m, e) => e.value > m.value ? e : m).id).toBe(p.pick.answer);
    expect(Math.max(...p.events.map(e => e.value))).toBeLessThanOrEqual(p.max);
  });

  it('E04: the 1943 counts are the published ones', () => {
    const e04 = getExpedition('evolution-e04')!.pack;
    const rows = simParams<{ real: { rows: { counts: number[] }[] } }>(e04, 'fluctuation').real.rows;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    expect(sum(rows[0].counts) / rows[0].counts.length).toBeCloseTo(11.35, 5);
    expect(sum(rows[1].counts) / rows[1].counts.length).toBeCloseTo(16.7, 5);
  });
});
