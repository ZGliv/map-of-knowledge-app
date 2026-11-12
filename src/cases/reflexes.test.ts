import { describe, expect, it } from 'vitest';
import type { Pack, SimBeat } from '../expeditions/content/types';
import { expected2 } from '../expeditions/sims/cross';
import { caseProblems, guessP, runCase } from './engines';
import { crossReflexes, lessonShares, nearestReflex, reflexWins, type ReflexPlace } from './reflexes';
import type { CrossModel, PlaceCase, SecondGene } from './types';

// The reflex scan behind lazy.test.ts and validatePlace, tried on made-up places: the six cases the
// first design recommended (a reflex wins four of them), and the set the revised design recommends
// (docs/dihybrid-design.md §4), which nothing wins. Test fixtures only: real cases are written with
// their places.

const pack = (beats: unknown[]): Pack => ({ id: 'fixture', title: 'F', question: 'Q', path: [], hue: 150, minutes: 5, beats } as unknown as Pack);
const ask = { gradeId: 'g', prompt: 'p', choices: [], answer: 'a', explain: 'e' };
/** The Meiosis lesson as the design keeps it: copies dealt from two spots (a quarter, half, a quarter). */
const MEIOSIS = pack([{ kind: 'sim', sim: 'peaCross', title: 'Deal the copies', goal: 'g', params: {
  locus: { S: 1, N: 1 }, traits: { S: { label: 'Both', look: 'full' }, SN: { label: 'One', look: 'half' }, N: { label: 'Neither', look: 'none' } },
  seed: 's', steps: [{ id: 'spots', title: 't', parents: ['SN', 'SN'], parentNames: ['Chromosome 5 spot', 'Chromosome 11 spot'], action: 'a', seeds: 100, ask }] } }]);
/** The Sex-linked lesson: Follow the X, a counted colour-blind cross, and the new two-gene fly step. */
const SEX = pack([
  { kind: 'sim', sim: 'peaCross', title: 'Follow the X', goal: 'g', params: {
    locus: { N: 2, c: 1, Y: 1 }, traits: { N: { label: 'Normal', look: 'full' }, Yc: { label: 'Colour-blind male', look: 'none' }, c: { label: 'Colour-blind female', look: 'none' } },
    seed: 's', steps: [{ id: 'carrier', title: 't', parents: ['Nc', 'NY'], parentNames: ['Mother', 'Father'], action: 'a', seeds: 64, ask }, { id: 'cbfather', title: 't', parents: ['NN', 'cY'], parentNames: ['Mother', 'Father'], action: 'a', seeds: 64, ask }] } },
  { kind: 'number', gradeId: 'blind-mother', generator: 'crossCount', params: { locus: { N: 2, c: 1, Y: 1 }, parents: ['cc', 'NY'], trait: 'Yc' } },
  { kind: 'sim', sim: 'peaCross', title: 'White eyes, short wings', goal: 'g', params: {
    locus: { R: 2, w: 1, Y: 2 }, traits: { R: { label: 'Red-eyed daughter', look: 'full' }, w: { label: 'White-eyed daughter', look: 'none' }, RY: { label: 'Red-eyed son', look: 'full' }, Y: { label: 'White-eyed son', look: 'none' } },
    second: { locus: { V: 1, v: 0 }, traits: { V: { label: 'Normal wings', ring: 'none' }, v: { label: 'Vestigial wings', ring: 'ring' } } },
    seed: 's', steps: [{ id: 'fly', title: 't', parents: ['Rw', 'wY'], second: ['Vv', 'Vv'], parentNames: ['Mother', 'Father'], action: 'a', seeds: 64, ask }] } } as unknown as SimBeat,
]);

/** A two-gene case counting `focus`, with every other combination in one class. */
function two(id: string, m: Omit<CrossModel, 'engine' | 'measure' | 'focus' | 'cross' | 'who' | 'second' | 'traits'> & { traits?: Record<string, string>; second: Omit<SecondGene, 'classes' | 'traits'> & { traits?: Record<string, string> } }, focus: string[], tolerance: number): PlaceCase {
  const made = Object.keys(expected2({ locus: m.locus, parents: m.parents }, { locus: m.second.locus, parents: m.second.parents }));
  const label = (keys: string[]) => Object.fromEntries(keys.map(k => [k, `Look ${k}`]));
  const firstKeys = [...new Set(made.map(c => c.split('|')[0]))], secondKeys = [...new Set(made.map(c => c.split('|')[1]))];
  const model: CrossModel = {
    engine: 'cross', measure: 'count', cross: 'a cross', who: { one: 'young one', many: 'young' }, focus: focus.join(','), traits: m.traits ?? label(firstKeys), ...m,
    second: { traits: label(secondKeys), ...m.second, classes: { [focus.join(',')]: 'Counted', [made.filter(c => !focus.includes(c)).join(',')]: 'The rest' } },
  };
  return { id, archetype: 'cross', title: id, scenario: 'S', ask: 'A', model, call: { kind: 'set', label: 'How many', min: 0, max: model.count, step: 1, start: 0, tolerance },
    run: 'Run', reveal: 'What happened, at length enough.', claim: 'A claim of enough length.', entities: ['x'], sources: [{ label: 'Source', url: 'https://example.org' }], seed: id };
}
const SPOT = { locus: { M: 1, F: 1 }, parents: ['MF', 'MF'] as [string, string], spots: ['a', 'b'] as [string, string] };
const SPOT2 = { locus: { P: 1, Q: 1 }, parents: ['PQ', 'PQ'] as [string, string], spots: ['c', 'd'] as [string, string] };
const CAT = { locus: { O: 1, o: 1, Y: 1 }, parentLabels: ['Queen', 'Tom'] as [string, string] };
const WHITE = { sex: 'Y' as const, locus: { S: 1, s: 0 }, parents: ['Ss', 'Ss'] as [string, string] };
const G6PD = { locus: { N: 2, g: 1, Y: 2 }, parents: ['Ng', 'NY'] as [string, string], parentLabels: ['Mother', 'Father'] as [string, string] };
const SICKLE = { sex: 'Y' as const, locus: { A: 1, S: 0 }, parents: ['AS', 'SS'] as [string, string] };
const INO = { locus: { N: 2, i: 1, W: 2 }, parents: ['Ni', 'NW'] as [string, string], parentLabels: ['Cock', 'Hen'] as [string, string] };
const BLUE = { sex: 'W' as const, locus: { B: 1, b: 0 }, parents: ['Bb', 'Bb'] as [string, string] };

// The first design's six.
const FIRST = {
  meiosis: [
    two('m1-all-four', { ...SPOT, count: 320, second: SPOT2 }, ['M|P'], 8),
    two('m2-ebony', { locus: { E: 1, e: 0 }, parents: ['Ee', 'Ee'], count: 320, second: { locus: { V: 1, v: 0 }, parents: ['Vv', 'Vv'] } }, ['e|V'], 10),
    two('m3-peas', { locus: { R: 1, r: 0 }, parents: ['Rr', 'Rr'], parentLabels: ['Egg cells', 'Pollen'], count: 556, second: { locus: { Y: 1, y: 0 }, parents: ['Yy', 'Yy'] } }, ['R|y', 'r|Y'], 28),
  ],
  sex: [
    two('s1-calico', { ...CAT, parents: ['Oo', 'oY'], count: 160, second: WHITE }, ['Oo|S'], 6),
    two('s2-both', { ...G6PD, count: 160, second: SICKLE }, ['Y|S'], 6),
    two('s3-albino', { ...INO, count: 320, second: BLUE }, ['W|b'], 6),
  ],
};
// The revised design's six (§4).
const REVISED = {
  meiosis: [
    two('m1-one-parent', { ...SPOT, count: 320, second: SPOT2 }, ['M|P', 'F|Q'], 8),
    two('m2-ebony', { locus: { E: 1, e: 0 }, parents: ['Ee', 'Ee'], count: 320, second: { locus: { V: 1, v: 0 }, parents: ['Vv', 'Vv'] } }, ['e|V'], 10),
    two('m3-peas', { locus: { R: 1, r: 0 }, parents: ['Rr', 'Rr'], parentLabels: ['Egg cells', 'Pollen'], count: 556, second: { locus: { Y: 1, y: 0 }, parents: ['Yy', 'Yy'] } }, ['R|y', 'r|Y'], 24),
  ],
  sex: [
    two('s1-black-toms', { ...CAT, parents: ['oo', 'OY'], count: 192, second: WHITE }, ['Yo|S'], 8),
    two('s2-escaped', { ...G6PD, count: 160, second: SICKLE }, ['NY|S'], 6),
    two('s3-hens', { ...INO, count: 320, second: BLUE }, ['NW|b', 'W|B', 'W|b'], 15),
  ],
};
const placeOf = (lesson: Pack, cases: PlaceCase[]): ReflexPlace => ({ pack: lesson, cases });

describe('the reflex scan', () => {
  it('reads every share the lesson shows: one-gene steps, a two-gene step’s combinations and genes, and counted number beats', () => {
    const shares = lessonShares(SEX).map(s => s.share).sort((a, b) => a - b);
    expect(shares).toEqual([1 / 16, 3 / 16, 1 / 4, 1 / 2, 3 / 4, 1]);
    expect(lessonShares(MEIOSIS).map(s => s.share).sort()).toEqual([0.25, 0.5]);
  });

  it('finds the reflexes the reviews found in the first design', () => {
    const wins = (c: PlaceCase, cases: PlaceCase[], lesson: Pack) => reflexWins(c, placeOf(lesson, cases));
    const [m1, m2, m3] = FIRST.meiosis, [s1, s2, s3] = FIRST.sex;
    // Four spots, mother's copy at all four: the 9:3:3:1 table's corner, on a cross of two 1:2:1 genes.
    expect(wins(m1, FIRST.meiosis, MEIOSIS)).toEqual(['the 9:3:3:1 table: 1 in 16']);
    expect(wins(m2, FIRST.meiosis, MEIOSIS)).toEqual([]);
    expect(wins(m3, FIRST.meiosis, MEIOSIS)).toEqual([]);
    // Calico 3/16: the table, a share the fly step prints, and the X read as an ordinary gene with the tom given two of his own.
    expect(wins(s1, FIRST.sex, SEX)).toEqual(expect.arrayContaining(['the 9:3:3:1 table: 3 in 16', 'the one-X parent read as oo, sex kept']));
    // Sons with both: the father read as a carrier and "sons" dropped; and the same number as s3.
    expect(wins(s2, FIRST.sex, SEX)).toEqual(expect.arrayContaining(['the one-X parent read as Ng, sex dropped', 'the answer to s3-albino']));
    // Albino chicks: the table's corner, and the hen read as an ordinary ino carrier.
    expect(wins(s3, FIRST.sex, SEX)).toEqual(expect.arrayContaining(['the 9:3:3:1 table: 1 in 16', 'the one-X parent read as Ni, sex dropped', 'the answer to s2-both']));
  });

  it('also refuses the engine review’s skyblue hens: the 9:3:3:1 corner on a Z-linked cross', () => {
    const skyblue = two('s3-skyblue', { ...INO, count: 320, second: BLUE }, ['NW|b'], 6);
    expect(reflexWins(skyblue, placeOf(SEX, [skyblue]))).toContain('the 9:3:3:1 table: 1 in 16');
  });

  it('also refuses a calico case that an ordinary reading plus “calico is female” wins', () => {
    // An orange-and-white queen and a black-and-white tom: every daughter is tortoiseshell either way.
    const calico = two('s1-orange-queen', { ...CAT, parents: ['OO', 'oY'], count: 160, second: WHITE }, ['Oo|S'], 6);
    expect(reflexWins(calico, placeOf(SEX, [calico]))).toEqual(['the one-X parent read as oo, sex kept']);
  });

  it('lets no reflex win the revised design’s six, and none of them breaks the engine’s own policing', () => {
    for (const [lesson, cases] of [[MEIOSIS, REVISED.meiosis], [SEX, REVISED.sex]] as const) for (const c of cases) {
      expect(caseProblems(c), c.id).toEqual([]);
      expect(reflexWins(c, placeOf(lesson, cases)), c.id).toEqual([]);
      const near = nearestReflex(c, placeOf(lesson, cases))!;
      expect(near.margin, `${c.id}: ${near.how}`).toBeGreaterThanOrEqual(3);
      expect(guessP(c.call, runCase(c).truth), c.id).toBeLessThanOrEqual(0.1);
    }
    // These fixtures' own margins: the six as the design first recommended them. Design §4 quotes the
    // built cases' margins instead, which differ where a case changed later (M2, M3, S1 and S3
    // tightened, S2 replaced; the fact-check recomputes those on the bundle).
    const margin = (c: PlaceCase, lesson: Pack, cases: PlaceCase[]) => nearestReflex(c, placeOf(lesson, cases))!.margin;
    expect(REVISED.meiosis.map(c => margin(c, MEIOSIS, REVISED.meiosis))).toEqual([12, 10, 45.5]);
    expect(REVISED.sex.map(c => margin(c, SEX, REVISED.sex))).toEqual([4, 4, 5]);
  });

  it('tries every reflex in the rules: landmarks, look-alikes, one gene, linked genes, the table and the sex split', () => {
    const [, s2] = REVISED.sex;
    const hows = crossReflexes(s2, placeOf(SEX, REVISED.sex)).map(r => r.how);
    for (const how of ['the slider’s middle', 'a quarter of the count', 'three quarters of the count', 'the first gene alone', 'the second gene alone', 'the two genes’ shares added',
      'the answer to s1-black-toms', 'the share in s3-hens', 'the 9:3:3:1 table: 3 in 16', 'counted within the sex with one X', 'the sexes merged',
      'the one-X parent read as NN, sex kept', 'the one-X parent read as Ng, sex dropped']) expect(hows, how).toContain(how);
    expect(hows.some(h => h.startsWith('a share the lesson shows'))).toBe(true);
    expect(hows.some(h => h.startsWith('the genes linked'))).toBe(true);
    // Linked, two hybrids: copies as written never make ebony with normal wings; crossed, a quarter.
    const linked = crossReflexes(REVISED.meiosis[1], placeOf(MEIOSIS, [])).filter(r => r.how.startsWith('the genes linked')).map(r => r.value / 320);
    expect(linked).toEqual([0, 1 / 4, 1 / 4, 1 / 4]);
    // A two-hybrid cross is where the table is the reasoning itself, so it is not a reflex there.
    expect(crossReflexes(REVISED.meiosis[1], placeOf(MEIOSIS, [])).some(r => r.how.startsWith('the 9:3:3:1'))).toBe(false);
    // A reading of the one-X parent that changes how he looks is not offered: a black tom is never read as tortoiseshell.
    expect(crossReflexes(REVISED.sex[0], placeOf(SEX, [])).map(r => r.how)).not.toContain('the one-X parent read as oO, sex dropped');
    // A one-gene case has no two-gene reflexes: lazy.test.ts scans those its own way.
    expect(crossReflexes({ ...s2, model: { ...s2.model, second: undefined } as CrossModel }, placeOf(SEX, []))).toEqual([]);
  });
});
