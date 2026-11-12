import { describe, expect, it } from 'vitest';
import { wrightFisher } from '../expeditions/sims/drift';
import { CASE_POLICY, caseProblems, guessP, judgeCase, populationRuns, runCase, tradeoffMeans, wins } from './engines';
import type { CaseModel, PlaceCase } from './types';

// The maths behind new cases: every outcome is computed from the model, seeded, and the same calls
// win under any seed. These cases are made up to exercise the engines; real ones live in content/.
const base = (model: CaseModel, call: PlaceCase['call'], extra: Partial<PlaceCase> = {}): PlaceCase => ({
  id: 'c_0000000000', archetype: 'population', title: 'T', scenario: 'S', ask: 'A', model, call, run: 'Run',
  reveal: 'What happened, at length enough.', claim: 'A claim of enough length.', entities: ['x'], sources: [{ label: 'Source', url: 'https://example.org' }], seed: 'seed', ...extra,
});

const islands = (sizes: number[]): CaseModel => ({
  engine: 'population', trait: 'the stripe', who: { one: 'lizard', many: 'lizards' },
  demes: sizes.map((size, i) => ({ id: `i${i}`, label: `Island ${i}`, size })), start: 0.25, shows: 'additive',
  fitness: 1, generations: 50, replicates: 20, measure: 'settled',
});
const pick = (ids: string[]): PlaceCase['call'] => ({ kind: 'pick', options: ids.map(id => ({ id, label: id })) });

describe('population', () => {
  it('drift settles small populations, not big ones, and the winner is stable across seeds', () => {
    const c = base(islands([6, 60, 600, 6000]), pick(['i0', 'i1', 'i2', 'i3', 'neither']));
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['i0'] });
    expect(caseProblems(c)).toEqual([]);
    expect(judgeCase(c, { pick: 'i0' }).success).toBe(true);
    expect(judgeCase(c, { pick: 'i3' }).success).toBe(false);
  });
  it('equal populations make "neither" the winner', () => {
    const c = base(islands([5000, 5000]), pick(['i0', 'i1', 'neither']));
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['neither'] });
  });
  it('selection in a large population follows the expected path, the same every time', () => {
    const m: CaseModel = { engine: 'population', trait: 'dark fur', who: { one: 'mouse', many: 'mice' }, demes: [{ id: 'lava', label: 'Lava', size: 'large' }], start: 0.05, shows: 'dominant', fitness: 1.3, generations: 60, replicates: 1, measure: 'share' };
    const a = populationRuns(m, 'a'), b = populationRuns(m, 'b');
    expect(a).toEqual(b);
    const path = a.demes[0].runs[0];
    expect(path[0]).toBeCloseTo(0.05, 6);
    expect(path.every((x, i) => i === 0 || x >= path[i - 1])).toBe(true);
    expect(path.at(-1)!).toBeGreaterThan(0.9);
  });
  it('a rare variant is missing from small populations, so selection there has nothing to work on', () => {
    const m: CaseModel = { engine: 'population', trait: 'resistance', who: { one: 'beetle', many: 'beetles' }, demes: [{ id: 's', label: 'Small', size: 50 }, { id: 'b', label: 'Big', size: 20000 }], start: 0.0002, shows: 'dominant', fitness: 3, generations: 20, replicates: 10, measure: 'most' };
    const run = populationRuns(m as Extract<CaseModel, { engine: 'population' }>, 'x');
    expect(run.demes[0].mean).toBe(0);
    expect(run.demes[1].mean).toBeGreaterThan(0.8);
  });
  it('migrants hold populations together; cut off, opposite pressures pull them apart', () => {
    const pools = (migration: number): CaseModel => ({ engine: 'population', trait: 'red fins', who: { one: 'fish', many: 'fish' }, demes: [{ id: 'a', label: 'A', size: 'large', fitness: 1.3 }, { id: 'b', label: 'B', size: 'large', fitness: 0.77 }], start: 0.5, shows: 'additive', fitness: 1, generations: 60, replicates: 1, migration, measure: 'gap' });
    const gap = (m: CaseModel) => (runCase(base(m, { kind: 'set', label: 'g', min: 0, max: 100, step: 1, start: 0, tolerance: 8 })).truth as { value: number }).value;
    expect(gap(pools(0))).toBeGreaterThan(90);
    expect(gap(pools(0.3))).toBeLessThan(30);
  });
  it('with no migration, a run is exactly drift.ts', () => {
    const m: CaseModel = { engine: 'population', trait: 't', who: { one: 'x', many: 'xs' }, demes: [{ id: 'a', label: 'A', size: 30 }], start: 0.4, shows: 'additive', fitness: 1, generations: 40, replicates: 2, measure: 'share' };
    const run = populationRuns(m as Extract<CaseModel, { engine: 'population' }>, 'k');
    expect(run.demes[0].runs[1]).toEqual(wrightFisher({ N: 30, p0: 0.4, generations: 40, seed: 'k:a:1' }));
  });
});

describe('the other engines', () => {
  it('trade-off: the best value is where the curves balance, and the population climbs to it', () => {
    const m: CaseModel = { engine: 'tradeoff', trait: { label: 'tail', low: 'short', high: 'long' }, who: { one: 'bird', many: 'birds' }, benefit: 'mates', cost: 'survival', setting: { id: 's', label: 's', base: 1, rate: 3 }, mating: { lift: 0.1, power: 1.5 }, start: 0.9, generations: 40, measure: 'best' };
    const c = base(m, { kind: 'set', label: 'Tail', min: 0, max: 1, step: 0.01, start: 1, tolerance: 0.08, ends: ['short', 'long'] }, { archetype: 'tradeoff' });
    const truth = runCase(c).truth;
    expect(truth.kind === 'set' && truth.value).toBeCloseTo(0.4, 6);
    const means = tradeoffMeans(m as Extract<CaseModel, { engine: 'tradeoff' }>);
    expect(Math.abs(means.at(-1)! - 0.4)).toBeLessThan(Math.abs(means[0] - 0.4));
    expect(caseProblems(c)).toEqual([]);
    expect(wins(c.call, truth, { value: 0.45 })).toBe(true);
    expect(wins(c.call, truth, { value: 0.6 })).toBe(false);
    expect(guessP(c.call, truth)).toBeCloseTo(0.16, 6);
  });
  it('cross: the expected count comes from the Punnett square, not the brood', () => {
    const m: CaseModel = { engine: 'cross', locus: { R: 1, W: 1 }, parents: ['RW', 'RW'], traits: { R: 'Red', RW: 'Roan', W: 'White' }, cross: 'two roans', who: { one: 'calf', many: 'calves' }, count: 200, focus: 'RW', measure: 'count' };
    const c = base(m, { kind: 'set', label: 'Roan calves', min: 0, max: 200, step: 1, start: 0, tolerance: 15 }, { archetype: 'cross' });
    expect(runCase(c).truth).toEqual({ kind: 'set', value: 100 });
    expect(caseProblems(c)).toEqual([]);
  });
  it('cross, copying: strands copy in exact shares, so every seed shows the same count', () => {
    const m: CaseModel = { engine: 'cross', locus: { N: 1, B: 0 }, parents: ['NB', 'BB'], traits: { N: 'Dark', B: 'Pale' }, cross: 'a second copying', who: { one: 'chromatid', many: 'chromatids' }, count: 64, focus: 'B', measure: 'count', copying: true };
    const c = base(m, { kind: 'set', label: 'Pale', min: 0, max: 64, step: 1, start: 0, tolerance: 4 }, { archetype: 'cross' });
    for (const seed of ['a', 'b', 'c']) expect(runCase(c, seed).run).toMatchObject({ counts: { N: 32, B: 32 } });
    expect(runCase(c).line).toBe('A second copying: pale in half the chromatids, 32 of 64.');
    expect(caseProblems(c)).toEqual([]);
    expect(caseProblems({ ...c, model: { ...m, count: 30 } })).toContain('a copying count must be a whole number of fours');
  });
  it('cross: one animal’s gametes at two spots count sperm, not a cross or a brood, and keep the same answer', () => {
    const m: CaseModel = { engine: 'cross', locus: { M: 1, F: 1 }, parents: ['MF', 'MF'], traits: { M: 'His mother’s copy at both spots', FM: 'One of each', F: 'His father’s copy at both spots' }, cross: 'two spots in one bull', spots: ['Chromosome 6 spot', 'Chromosome 14 spot'], who: { one: 'sperm', many: 'sperm' }, count: 200, focus: 'M', measure: 'count' };
    const c = base(m, { kind: 'set', label: 'Sperm', min: 0, max: 200, step: 1, start: 0, tolerance: 12 }, { archetype: 'cross' });
    const out = runCase(c);
    expect(out.truth).toEqual({ kind: 'set', value: 50 });
    expect(out.line).toMatch(/^1 sperm in every 4 carries his mother’s copy at both spots: about 50 of 200\. These 200 sperm had \d+\.$/);
    expect(out.line).not.toMatch(/cross|brood/);
    expect(caseProblems(c)).toEqual([]);
  });
  it('cross: a label read mid-sentence keeps a name in capitals', () => {
    const m: CaseModel = { engine: 'cross', locus: { H: 2, Y: 2, n: 1 }, parents: ['Hn', 'HY'], traits: { H: 'Daughters with XLH', HY: 'Sons with XLH', Y: 'Sons without XLH' }, cross: 'mothers and fathers who both have XLH', who: { one: 'child', many: 'children' }, count: 120, focus: 'HY', measure: 'count' };
    const c = base(m, { kind: 'set', label: 'Sons with XLH', min: 0, max: 120, step: 1, start: 0, tolerance: 7 }, { archetype: 'cross' });
    expect(runCase(c).truth).toEqual({ kind: 'set', value: 30 });
    expect(runCase(c).line).toMatch(/^Mothers and fathers who both have XLH: sons with XLH in 1 of every 4 children, about 30 of 120\. This run had \d+\.$/);
    expect(runCase({ ...c, model: { ...m, traits: { ...m.traits, HY: 'XLH in a son' } } }).line).toMatch(/: XLH in a son in 1 of every 4/);
  });
  it('tree: every tip closer than the look-alike is computed from the tree, and a multi pick is hard to guess', () => {
    const m: CaseModel = { engine: 'tree', newick: '((((a,b),c),(d,e)),f);', tips: { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F' }, of: 'c', than: 'd', measure: 'closer' };
    const call: PlaceCase['call'] = { kind: 'pick', multi: true, options: ['a', 'b', 'e', 'f'].map(id => ({ id, label: id })) };
    const c = base(m, call, { archetype: 'tree' });
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['a', 'b'] });
    expect(caseProblems(c)).toEqual([]);
    expect(wins(call, runCase(c).truth, { picks: ['b', 'a'] })).toBe(true);
    expect(wins(call, runCase(c).truth, { picks: ['a'] })).toBe(false);
    expect(wins(call, runCase(c).truth, { picks: ['a', 'b', 'e'] })).toBe(false);
    expect(guessP(call, runCase(c).truth)).toBeCloseTo(1 / 15, 6);
  });
  it('clock: the clock time comes from the age', () => {
    const m: CaseModel = { engine: 'clock', earthMa: 4540, event: { label: 'E', ma: 2270 }, landmarks: [], measure: 'time' };
    const c = base(m, { kind: 'set', label: 'Time', min: 0, max: 24, step: 0.25, start: 0, tolerance: 1, unit: 'clock' }, { archetype: 'timescale' });
    expect(runCase(c).truth).toEqual({ kind: 'set', value: 12 });
    expect(judgeCase(c, { value: 12.5 }).right).toBe('12:00');
  });
  it('nest: the find with nowhere to go is computed', () => {
    const t = (id: string, traits: string[]) => ({ id, label: id.toUpperCase(), traits });
    const m: CaseModel = {
      engine: 'nest', traits: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }],
      taxa: [t('a', ['x', 'y']), t('b', ['x', 'y']), t('c', ['x']), t('d', [])],
      candidates: [t('p', ['x']), t('q', ['x', 'y']), t('r', []), t('s', ['y']), t('u', ['x'])], measure: 'homeless',
    };
    expect(runCase(base(m, pick(['p', 'q', 'r', 's', 'u']), { archetype: 'grouping' })).truth).toEqual({ kind: 'pick', win: ['s'] });
  });
  it('chart: the biggest bar wins', () => {
    const m: CaseModel = { engine: 'chart', unit: 'km', bars: [1, 5, 3, 2, 4].map((value, i) => ({ id: `b${i}`, label: `B${i}`, value })), measure: 'biggest' };
    expect(runCase(base(m, pick(['b0', 'b1', 'b2', 'b3', 'b4']), { archetype: 'chart' })).truth).toEqual({ kind: 'pick', win: ['b1'] });
  });
});

describe('the rules a case is held to', () => {
  const ok = base(islands([6, 60, 600, 6000]), pick(['i0', 'i1', 'i2', 'i3', 'neither']));
  it('a slider that starts inside the winning band', () => {
    const c = base({ engine: 'clock', earthMa: 4540, event: { label: 'E', ma: 2270 }, landmarks: [], measure: 'time' }, { kind: 'set', label: 'T', min: 0, max: 24, step: 0.25, start: 12, tolerance: 1 }, { archetype: 'timescale' });
    expect(caseProblems(c)).toContain('the slider starts inside the winning band: doing nothing would win');
  });
  it('options that mean nothing to the engine, and guessing that wins too often', () => {
    expect(caseProblems({ ...ok, call: pick(['i0', 'moon']) }).join()).toMatch(/"moon" means nothing/);
    expect(caseProblems({ ...ok, call: pick(['i0', 'i3']) }).join()).toMatch(/blind guess wins 50%/);
    expect(CASE_POLICY.maxGuessP).toBeLessThanOrEqual(0.2);
  });
  it('a winner that depends on luck', () => {
    // Two middling islands: which settles more often is a coin toss between seeds.
    const c = base({ ...islands([40, 44]), replicates: 6 } as CaseModel, pick(['i0', 'i1', 'neither']));
    const problems = caseProblems({ ...c, call: { kind: 'pick', options: [...(c.call as { options: { id: string; label: string }[] }).options] } });
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe('motion, ratio and spread', () => {
  const set = (min: number, max: number, step: number, tolerance: number, start = min): PlaceCase['call'] => ({ kind: 'set', label: 'x', min, max, step, start, tolerance });
  it('motion: time, distance after some seconds, and the stretch in the last seconds, from ½ g t²', () => {
    const drop = (measure: 'time' | 'distance' | 'final', seconds?: number): CaseModel => ({ engine: 'motion', world: { label: 'Vacuum', g: 9.81 }, body: { label: 'The ball' }, height: 105, measure, seconds });
    const time = base(drop('time'), set(0, 12, 0.05, 0.25), { archetype: 'motion' });
    expect((runCase(time).truth as { value: number }).value).toBeCloseTo(Math.sqrt(210 / 9.81), 9);
    expect(caseProblems(time)).toEqual([]);
    const halfway = base({ ...drop('time'), measure: 'reach', metres: 52.5 } as CaseModel, set(0, 6, 0.05, 0.2), { archetype: 'motion' });
    expect((runCase(halfway).truth as { value: number }).value).toBeCloseTo(Math.sqrt(210 / 9.81) / Math.SQRT2, 9);
    expect(caseProblems({ ...halfway, model: { ...(halfway.model as Extract<CaseModel, { engine: 'motion' }>), metres: 200 } }).join()).toMatch(/needs metres between/);
    const half = base(drop('distance', 2), set(0, 105, 1, 5), { archetype: 'motion' });
    expect((runCase(half).truth as { value: number }).value).toBeCloseTo(19.62, 6);
    const last = base(drop('final', 1), set(0, 105, 1, 5), { archetype: 'motion' });
    expect((runCase(last).truth as { value: number }).value).toBeCloseTo(105 - 0.5 * 9.81 * (Math.sqrt(210 / 9.81) - 1) ** 2, 6);
    expect(caseProblems(base(drop('distance', 9), set(0, 105, 1, 5), { archetype: 'motion' })).join()).toMatch(/needs seconds between 0 and/);
    expect(caseProblems(base(drop('time'), set(0, 12, 0.05, 3), { archetype: 'motion' })).join()).toMatch(/blind guess wins/);
    // The shaft is marked every 25 m: a drop whose answer sits on a mark is refused.
    expect(caseProblems(base({ ...drop('distance', 2), height: 100 } as CaseModel, set(0, 100, 1, 6), { archetype: 'motion' })).join()).toMatch(/the picture prints 25 before the run/);
  });
  it('ratio: pitch follows the square root of the pull, the stopped string goes inversely, and repeats are the low note over q', () => {
    expect(runCase(base({ engine: 'ratio', measure: 'pull', hz: 392, factor: 9 / 16 }, set(200, 500, 1, 6), { archetype: 'ratio' })).truth).toEqual({ kind: 'set', value: 294 });
    expect((runCase(base({ engine: 'ratio', measure: 'pitch', string: { label: 'S', hz: 220, length: 70, unit: 'cm' }, stopped: 56 }, set(100, 500, 1, 6), { archetype: 'ratio' })).truth as { value: number }).value).toBeCloseTo(275, 9);
    expect(runCase(base({ engine: 'ratio', measure: 'repeats', hz: [396, 528] }, set(0, 600, 1, 8), { archetype: 'ratio' })).truth).toEqual({ kind: 'set', value: 132 });
    const pairs = (hz: number[]): CaseModel => ({ engine: 'ratio', measure: 'calmest', pairs: hz.map(h => ({ id: `p${h}`, label: `${h}`, hz: [240, h] as [number, number] })) });
    const calm = base(pairs([300, 476, 360, 256, 320]), pick(['p300', 'p476', 'p360', 'p256', 'p320']), { archetype: 'ratio' });
    expect(runCase(calm).truth).toEqual({ kind: 'pick', win: ['p360'] });
    expect(caseProblems(calm)).toEqual([]);
    // A fourth (4:3) and a major sixth (5:3) both repeat every 3 low waves: no single calmest.
    expect(caseProblems(base(pairs([320, 400, 300, 256, 476]), pick(['p320', 'p400', 'p300', 'p256', 'p476']), { archetype: 'ratio' })).join()).toMatch(/tie for the calmest/);
  });
  it('spread: the fastest chain of routes decides, the margin is clear, and the winner survives pace errors', () => {
    const map = (roadKm: number): CaseModel => ({
      engine: 'spread', what: 'plague', speeds: { sea: 35, road: 2 }, origin: 'o', measure: 'first', candidates: ['port', 'town', 'far', 'hill', 'vale'],
      places: [{ id: 'o', label: 'O', lat: 0, lon: 0 }, { id: 'port', label: 'Port', lat: 0, lon: 3 }, { id: 'far', label: 'Far', lat: 0, lon: 6 },
        { id: 'town', label: 'Town', lat: roadKm / 111.19, lon: 0 }, { id: 'hill', label: 'Hill', lat: 2, lon: 0 }, { id: 'vale', label: 'Vale', lat: -3, lon: 0 }],
      routes: [{ from: 'o', to: 'port', via: 'sea' }, { from: 'port', to: 'far', via: 'sea' }, { from: 'o', to: 'town', via: 'road' }, { from: 'o', to: 'hill', via: 'road' }, { from: 'o', to: 'vale', via: 'road' }],
    });
    const call = pick(['port', 'town', 'far', 'hill', 'vale']);
    // A port 334 km away by sea beats a town 100 km away by road.
    const c = base(map(100), call, { archetype: 'spread' });
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['port'] });
    expect(caseProblems(c)).toEqual([]);
    expect(runCase({ ...c, model: { ...(c.model as Extract<CaseModel, { engine: 'spread' }>), measure: 'last' } }).truth).toEqual({ kind: 'pick', win: ['vale'] });
    // A town 15 km up the road wins, but only by a whisker over the port: too close to call.
    expect(caseProblems(base(map(17), call, { archetype: 'spread' })).join()).toMatch(/runner-up by less than/);
    // A town 13 km away wins clearly at these paces, yet the port would win if the road were a third slower.
    expect(caseProblems(base(map(13), call, { archetype: 'spread' })).join()).toMatch(/hangs on the exact paces/);
  });
});

describe('sequence', () => {
  // AUG GCU GAG CAG UGG AAA UAA: Met Ala Glu Gln Trp Lys, then stop.
  const gene = 'CCATGGCTGAGCAGTGGAAATAAGG';
  const seq = (extra: Partial<Extract<CaseModel, { engine: 'sequence' }>>): CaseModel => ({ engine: 'sequence', kind: 'dna', seqs: [{ id: 'g', label: 'Gene', letters: gene }], from: 'start', measure: 'effect', ...extra });
  const effects = pick(['silent', 'missense', 'nonsense', 'frameshift', 'in-frame']);

  it('names what one change does, from the letters, the same under any seed', () => {
    const c = base(seq({ changes: [{ id: 'x', label: 'Letter 10: A becomes T', change: { kind: 'sub', at: 10, to: 'T' } }] }), effects, { archetype: 'sequence' });
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['missense'] });
    expect(runCase(c).line).toMatch(/Position 3 of the chain is now valine instead of glutamic acid/);
    expect(caseProblems(c)).toEqual([]);
    expect(guessP(c.call, runCase(c).truth)).toBeCloseTo(0.2, 9);
  });

  it('measures the chain after an early stop, counting from the excerpt’s first position', () => {
    const c = base(seq({ measure: 'length', firstResidue: 40, changes: [{ id: 'x', label: 'Letter 12: C becomes T', change: { kind: 'sub', at: 12, to: 'T' } }] }),
      { kind: 'set', label: 'Amino acids', min: 0, max: 100, step: 1, start: 0, tolerance: 1 }, { archetype: 'sequence' });
    expect(runCase(c).truth).toEqual({ kind: 'set', value: 39 + 3 });
    expect(caseProblems(c)).toEqual([]);
  });

  it('names the amino acid a change puts in place', () => {
    const c = base(seq({ measure: 'residue', at: 3, changes: [{ id: 'x', label: 'Letter 10: A becomes T', change: { kind: 'sub', at: 10, to: 'T' } }] }),
      pick(['E', 'V', 'K', 'D', 'A', '*']), { archetype: 'sequence' });
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['V'] });
    expect(caseProblems(c)).toEqual([]);
  });

  it('picks the one change that leaves the chain as it was', () => {
    const changes = [
      { id: 'a', label: 'Letter 8: T becomes C', change: { kind: 'sub' as const, at: 8, to: 'C' } },
      { id: 'b', label: 'Letter 10: A becomes T', change: { kind: 'sub' as const, at: 10, to: 'T' } },
      { id: 'c', label: 'Letter 12: C becomes T', change: { kind: 'sub' as const, at: 12, to: 'T' } },
      { id: 'd', label: 'Letter 9 is lost', change: { kind: 'del' as const, at: 9, count: 1 } },
      { id: 'e', label: 'Letters 9–11 are lost', change: { kind: 'del' as const, at: 9, count: 3 } },
    ];
    const c = base(seq({ measure: 'same', changes }), pick(changes.map(x => x.id)), { archetype: 'sequence' });
    expect(runCase(c).truth).toEqual({ kind: 'pick', win: ['a'] });
    // The line names the one that holds, then what each other change did, grouped by effect; labels
    // are quoted, since they carry their own colon.
    expect(runCase(c).line).toBe('“Letter 8: T becomes C” leaves the chain exactly as it was. “Letter 10: A becomes T” swaps one amino acid; “Letter 12: C becomes T” stops the chain early; “Letter 9 is lost” makes everything after it read wrong; “Letters 9–11 are lost” adds or removes whole amino acids and leaves the rest as they were.');
    expect(caseProblems(c)).toEqual([]);
  });

  it('finds the two strings that differ least, and counts differences', () => {
    const seqs = [
      { id: 'a', label: 'A', letters: 'ACGTACGTACGTACGTACGT' },
      { id: 'b', label: 'B', letters: 'ACGTACGTTCGTACGTACGT' },
      { id: 'c', label: 'C', letters: 'TCGAACGGACGTTCGTACCT' },
      { id: 'd', label: 'D', letters: 'TCGAACGGACGTTCGAACCA' },
    ];
    const close = base({ engine: 'sequence', kind: 'dna', seqs, from: 1, measure: 'closest' }, pick(['a|b', 'a|c', 'a|d', 'b|c', 'b|d', 'c|d']), { archetype: 'sequence' });
    expect(runCase(close).truth).toEqual({ kind: 'pick', win: ['a|b'] });
    // The rest in one sentence, nearest first, so a wrapped line never opens on a bare number.
    expect(runCase(close).line).toMatch(/^A and B differ least: 1 letter\. The other pairs differ more: ([A-D] and [A-D] by \d+; ){4}[A-D] and [A-D] by \d+\.$/);
    const by = [...runCase(close).line.matchAll(/by (\d+)/g)].map(x => Number(x[1]));
    expect(by).toEqual([...by].sort((x, y) => x - y));
    expect(caseProblems(close)).toEqual([]);
    const count = base({ engine: 'sequence', kind: 'dna', seqs: seqs.slice(2), from: 1, measure: 'differences' }, { kind: 'set', label: 'Letters that differ', min: 0, max: 20, step: 1, start: 10, tolerance: 1 }, { archetype: 'sequence' });
    expect(runCase(count).truth).toEqual({ kind: 'set', value: 2 });
  });

  it('refuses an effect case where two answers would be right, and options that mean nothing', () => {
    const atOnce = base({ engine: 'sequence', kind: 'rna', seqs: [{ id: 'g', label: 'G', letters: 'AUGAUAAAGUAA' }], from: 'start', measure: 'effect', changes: [{ id: 'x', label: 'x', change: { kind: 'del', at: 4, count: 1 } }] }, effects, { archetype: 'sequence' });
    expect(caseProblems(atOnce).join()).toMatch(/two effects are right/);
    const bad = base(seq({ changes: [{ id: 'x', label: 'x', change: { kind: 'sub', at: 10, to: 'T' } }] }), pick(['missense', 'swap', 'silent', 'nonsense', 'frameshift']), { archetype: 'sequence' });
    expect(caseProblems(bad).join()).toMatch(/option "swap" means nothing/);
  });
});
