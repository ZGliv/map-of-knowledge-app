import { describe, expect, it } from 'vitest';
import { history } from '../content/history';
import { dropTicks, fallDistance, fallSpeed, fallTime } from './motionMath';
import { frequencyAtPull, lowWavesToRepeat, ratioOf, repeatsPerSecond, stoppedFrequency } from './ratioMath';
import { arrivals, km, pathKm, routePoints, type Pt } from './spreadMath';

describe('motionMath', () => {
  it('in a vacuum, distance is ½ g t² and time is its inverse', () => {
    expect(fallDistance(9.81, 2)).toBeCloseTo(19.62, 6);
    expect(fallTime(9.81, 19.62)).toBeCloseTo(2, 6);
    // Bremen's 110 m tube: the tower's own figure is 4.74 s.
    expect(fallTime(9.81, 110)).toBeCloseTo(4.74, 2);
    expect(fallSpeed(9.81, 3)).toBeCloseTo(29.43, 6);
  });
  it('in air, the fall approaches its terminal speed, never passes it, and time and distance agree', () => {
    const vt = 6;
    expect(fallSpeed(9.81, 30, vt)).toBeLessThanOrEqual(vt);
    expect(fallSpeed(9.81, 30, vt)).toBeCloseTo(vt, 6);
    expect(fallDistance(9.81, 0.05, vt)).toBeCloseTo(fallDistance(9.81, 0.05), 3);
    expect(fallDistance(9.81, 2, vt)).toBeLessThan(fallDistance(9.81, 2));
    for (const h of [1, 20, 500, 5000]) expect(fallDistance(9.81, fallTime(9.81, h, vt), vt)).toBeCloseTo(h, 6);
  });
  it('marks a drop at round metres, top and bottom, never at fractions of it', () => {
    expect(dropTicks(105)).toEqual([0, 25, 50, 75, 100, 105].filter(d => d !== 100));
    expect(dropTicks(130)).toEqual([0, 25, 50, 75, 100, 130]);
    expect(dropTicks(40)).toEqual([0, 10, 20, 30, 40]);
  });
  it('matches the drop tower’s step-by-step integration', () => {
    let v = 0, d = 0, t = 0; const dt = 1 / 20000, vt = 0.6;
    while (t < 1.5) { v += 9.81 * (1 - (v * v) / (vt * vt)) * dt; d += v * dt; t += dt; }
    expect(fallDistance(9.81, 1.5, vt)).toBeCloseTo(d, 2);
  });
});

describe('ratioMath', () => {
  it('reduces frequencies to their lowest-terms ratio, higher first', () => {
    expect(ratioOf(440, 330)).toEqual([4, 3]);
    expect(ratioOf(240, 476)).toEqual([119, 60]);
    expect(ratioOf(261.5, 523)).toEqual([2, 1]);
  });
  it('a p:q pair repeats every q low waves (the wave mixer’s rule)', () => {
    expect(lowWavesToRepeat(220, 264)).toBe(5); // 6:5, the pack’s minor third
    expect(lowWavesToRepeat(240, 256)).toBe(15);
    expect(repeatsPerSecond(396, 528)).toBe(132);
    expect(repeatsPerSecond(300, 450)).toBe(150);
  });
  it('length and tension (Mersenne): an octave is half the length or four times the pull', () => {
    expect(stoppedFrequency(196, 650, 325)).toBe(392);
    expect(stoppedFrequency(220, 70, 56)).toBeCloseTo(275, 9);
    expect(frequencyAtPull(196, 4)).toBe(392);
    expect(frequencyAtPull(392, 9 / 16)).toBe(294);
  });
});

describe('spreadMath', () => {
  const places = [{ id: 'a', lat: 0, lon: 0 }, { id: 'b', lat: 0, lon: 1 }, { id: 'c', lat: 0, lon: 2 }, { id: 'd', lat: 10, lon: 10 }];
  it('measures the globe and the drawn path', () => {
    expect(km([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
    const p: Pt[] = [[0, 0], [1, 0], [1, 1]];
    expect(pathKm(p)).toBeCloseTo(km(p[0], p[1]) + km(p[1], p[2]), 9);
  });
  it('finds the fastest chain of routes, both ways, by days', () => {
    const at = arrivals(places, [
      { from: 'a', to: 'c', via: 'road' },
      { from: 'b', to: 'a', via: 'sea', path: [[-1, 0.5]] },
      { from: 'b', to: 'c', via: 'sea' },
    ], 'a', { sea: 30, road: 2 });
    expect(at.b.from).toBe('a');
    expect(at.c.via).toBe('sea');
    expect(at.c.days).toBeCloseTo((pathKm(routePoints({ from: 'a', to: 'b', via: 'sea', path: [[-1, 0.5]] }, places)) + 111.19) / 30, 1);
    expect(at.d.days).toBe(Infinity);
  });
  it('the paces the history cases use are the ones the expedition’s own dates imply', () => {
    // Its map: the sea lane to a port reached a month later (October to November 1347), and the
    // chain of roads inland from the door port to a city reached seven months later (January to August 1348).
    const beat = history.beats.find(b => b.kind === 'sim' && (b.params as { mode?: string }).mode === 'play')!;
    const map = (beat as unknown as { params: { places: { id: string; lat: number; lon: number; from?: string; path?: number[][] }[] } }).params.places;
    const leg = (id: string) => { const p = map.find(x => x.id === id)!; const f = map.find(x => x.id === p.from)!; return pathKm([[f.lat, f.lon], ...(p.path ?? []) as Pt[], [p.lat, p.lon]]); };
    const seaPerDay = leg('marseille') / 30;
    const roadPerDay = (leg('florence') + leg('siena') + leg('rome')) / (7 * 30);
    expect(seaPerDay).toBeGreaterThan(30);
    expect(seaPerDay).toBeLessThan(40);
    expect(roadPerDay).toBeGreaterThan(1);
    expect(roadPerDay).toBeLessThan(3);
  });
});
