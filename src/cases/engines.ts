// The maths behind every new case: one function per engine that runs the model from its seed and
// says which calls win. Nothing here is typed by a drafter; a case's data only sets the situation.
// Pure: no React, so the validator, tests and Node drivers import it.

import { alleleFor } from '../expeditions/sims/selection';
import { copies, expected, expected2, phenotype, phenotype2, sample, sample2, seeded as seededRng, splitPair, tally as crossTally, type Gene } from '../expeditions/sims/cross';
import { clockSeconds, formatClock } from '../expeditions/sims/deepTimeMath';
import { binomial, expectedNext, seeded } from '../expeditions/sims/drift';
import { contiguous, crossings, placeFind, placements, type Taxon } from '../expeditions/sims/nesting';
import { dropTicks, fallDistance, fallTime } from '../expeditions/sims/motionMath';
import { frequencyAtPull, lowWavesToRepeat, ratioOf, repeatsPerSecond, stoppedFrequency } from '../expeditions/sims/ratioMath';
import { arrivals, type Arrival, type Via } from '../expeditions/sims/spreadMath';
import { best, offspring } from '../expeditions/sims/tradeoffModel';
import { mrca, parseNewick, pathTo, tipsOf } from '../expeditions/sims/tree';
import { AMINO, BASES, EFFECTS, EFFECT_WORDS, badLetters, capFirst, changeProblems, closest, distance, effectOf, findStart, pairKey, read, symbolShort, type Effect, type Reading } from '../expeditions/sims/sequence';
import type { ArchetypeId } from '../expeditions/sims/archetypes';
import type { CaseAnswer, CaseCall, CaseEngineId, CaseModel, ChartModel, ClockModel, CrossModel, MotionModel, NestModel, PlaceCase, PopulationModel, RatioModel, SecondGene, SequenceModel, SpreadModel, TradeoffModel, TreeModel, Who } from './types';

/** The evidence rule for cases, with its tunable numbers in one place. */
export const CASE_POLICY = {
  /** Blind guessing may win a case at most this often. */
  maxGuessP: 0.2,
  /** Cases a place needs: the expedition's last beat, a retry after a miss, and the Lasting mission. */
  minCases: 3,
  /** Other seeds the validator replays a case under; the winning call must not change. */
  stabilitySeeds: 6,
} as const;

/** Which calls win: option IDs for a pick, a value for a set (the call's tolerance applies). */
export type Truth = { kind: 'pick'; win: string[] } | { kind: 'set'; value: number };

export interface PopulationRun { engine: 'population'; demes: { id: string; label: string; runs: number[][]; settled: number; mean: number }[]; generations: number }
export interface TradeoffRun { engine: 'tradeoff'; best: number; means: number[] }
export interface CrossRun { engine: 'cross'; expectedShare: number; brood: string[]; counts: Record<string, number> }
export interface TreeRun { engine: 'tree'; closer: string[] }
export interface ClockRun { engine: 'clock'; hours: number }
export interface NestRun { engine: 'nest'; homeless: string[]; slots: Record<string, number>; broken: Record<string, string | null> }
export interface ChartRun { engine: 'chart'; order: string[] }
export interface MotionRun { engine: 'motion'; /** Seconds to land. */ land: number; value: number }
export interface RatioRun { engine: 'ratio'; value: number; /** Lowest-terms ratio of each pair (calmest), or of the one pair. */ ratios: Record<string, [number, number]> }
export interface SpreadRun { engine: 'spread'; arrivals: Record<string, Arrival>; /** Days the run plays: until the last candidate is reached. */ days: number }
export interface SequenceRun {
  engine: 'sequence';
  /** The first string read as usual. */
  before: Reading;
  /** Each change applied to the first string alone, read again. */
  afters: { id: string; letters: string; reading: Reading; effect: Effect; firstChange: number }[];
  /** Every pair's differences, for closest and differences. */
  table?: { a: string; b: string; d: number }[];
}
export type CaseRun = PopulationRun | TradeoffRun | CrossRun | TreeRun | ClockRun | NestRun | ChartRun | MotionRun | RatioRun | SpreadRun | SequenceRun;

export interface Outcome { truth: Truth; run: CaseRun; /** What happened, computed, in one or two sentences. */ line: string }

interface Engine<M extends CaseModel> {
  archetype: ArchetypeId;
  /** Problems with the model's own data; empty means it runs. */
  check: (model: M) => string[];
  /** The pick options that mean something to this engine (a set call has none). */
  ids?: (model: M) => string[];
  /** Values the picture prints before the run, in the call's unit; none may win a set call. */
  printed?: (model: M) => number[];
  outcome: (model: M, seed: string) => Outcome;
}

const pct = (x: number) => Math.round(x * 100);
const NEITHER = 'neither';
/** A label as it reads mid-sentence: its first letter lowered, unless it opens with a name in
 * capitals ("XLH") or a capital and a digit ("G6PD"), which keeps its case. */
export const midSentence = (label: string) => /^\p{Lu}[\p{Lu}\d]/u.test(label) ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`;

// ---------------------------------------------------------------- population

const toAllele = (share: number, shows: PopulationModel['shows']) => shows === 'dominant' ? alleleFor(share) : shows === 'recessive' ? Math.sqrt(share) : share;
const toShare = (p: number, shows: PopulationModel['shows']) => shows === 'dominant' ? 1 - (1 - p) ** 2 : shows === 'recessive' ? p * p : p;

/** Every population, generation by generation: selection and mutation shift the odds, migrants mix
 * the populations, then each finite population draws its next generation at random (diploid
 * Wright–Fisher, as sims/drift.ts). Each population draws from its own seeded stream, so with no
 * migration a run is exactly drift.ts's wrightFisher. */
export function populationRuns(m: PopulationModel, seed: string): PopulationRun {
  const h = m.shows === 'dominant' ? 1 : m.shows === 'recessive' ? 0 : 0.5;
  const mu = m.mutation ?? 0, mig = m.migration ?? 0;
  const demes = m.demes.map(d => ({ d, s: (d.fitness ?? m.fitness) - 1, p0: toAllele(d.start ?? m.start, m.shows), copies: d.size === 'large' ? 0 : 2 * d.size }));
  const R = demes.every(x => !x.copies) ? 1 : m.replicates;
  const runs: number[][][] = demes.map(() => []);
  for (let r = 0; r < R; r++) {
    const rands = demes.map(x => seeded(`${seed}:${x.d.id}:${r}`));
    let ps = demes.map(x => x.copies ? Math.round(x.p0 * x.copies) / x.copies : x.p0);
    const paths = ps.map(p => [p]);
    for (let g = 0; g < m.generations; g++) {
      // A lost or fixed variant with no mutation and no migrants stays put; the draw would only repeat it.
      const stuck = ps.map((p, k) => !!demes[k].copies && mu === 0 && mig === 0 && (p <= 0 || p >= 1));
      const selected = ps.map((p, k) => stuck[k] ? p : expectedNext(p, demes[k].s, h, mu));
      const pool = selected.reduce((a, b) => a + b, 0) / selected.length;
      ps = selected.map((p, k) => {
        if (stuck[k]) return p;
        const mixed = (1 - mig) * p + mig * pool;
        const c = demes[k].copies;
        return c ? binomial(c, mixed, rands[k]) / c : mixed;
      });
      ps.forEach((p, k) => paths[k].push(p));
    }
    paths.forEach((path, k) => runs[k].push(path.map(p => toShare(p, m.shows))));
  }
  return {
    engine: 'population', generations: m.generations,
    demes: demes.map(({ d }, k) => {
      const finals = runs[k].map(path => path[path.length - 1]);
      return { id: d.id, label: d.label, runs: runs[k], settled: finals.filter(x => x <= 0 || x >= 1).length, mean: finals.reduce((a, b) => a + b, 0) / finals.length };
    }),
  };
}

const population: Engine<PopulationModel> = {
  archetype: 'population',
  check: m => {
    const out: string[] = [];
    if (!(m.start >= 0 && m.start < 1)) out.push('start must be a share from 0 up to 1');
    if (!(m.fitness > 0)) out.push('fitness must be positive');
    if (!m.demes.length) out.push('needs at least one population');
    if (new Set(m.demes.map(d => d.id)).size !== m.demes.length || m.demes.some(d => d.id === NEITHER)) out.push('population IDs must be unique and not "neither"');
    for (const d of m.demes) if (d.size !== 'large' && !(Number.isInteger(d.size) && d.size >= 2)) out.push(`${d.id}: size must be 2 or more, or "large"`);
    if (!(Number.isInteger(m.generations) && m.generations >= 1 && m.generations <= 2000)) out.push('generations must be 1–2000');
    if (!(Number.isInteger(m.replicates) && m.replicates >= 1 && m.replicates <= 40)) out.push('replicates must be 1–40');
    if (m.measure !== 'share' && m.demes.length < 2) out.push(`measure "${m.measure}" compares populations: give two or more`);
    for (const d of m.demes) {
      if (d.start !== undefined && !(d.start >= 0 && d.start < 1)) out.push(`${d.id}: start must be 0 up to 1`);
      if (d.fitness !== undefined && !(d.fitness > 0)) out.push(`${d.id}: fitness must be positive`);
    }
    if (m.mutation !== undefined && !(m.mutation >= 0 && m.mutation < 0.01)) out.push('mutation must be 0 up to 1 in 100');
    if (m.migration !== undefined && !(m.migration >= 0 && m.migration <= 0.5)) out.push('migration must be 0 up to a half');
    return out;
  },
  ids: m => m.measure === 'share' || m.measure === 'gap' ? [] : [...m.demes.map(d => d.id), NEITHER],
  outcome: (m, seed) => {
    const run = populationRuns(m, seed);
    const R = (d: { runs: number[][] }) => d.runs.length;
    if (m.measure === 'share') {
      const d = run.demes[0];
      return { run, truth: { kind: 'set', value: d.mean * 100 }, line: `After ${m.generations} generations, ${pct(d.mean)} in 100 ${m.who.many} show ${m.trait}.` };
    }
    if (m.measure === 'gap') {
      const [a, b] = run.demes;
      const gaps = a.runs.map((path, r) => Math.abs(path[path.length - 1] - b.runs[r][b.runs[r].length - 1]));
      const gap = gaps.reduce((x, y) => x + y, 0) / gaps.length;
      return { run, truth: { kind: 'set', value: gap * 100 }, line: `After ${m.generations} generations, ${a.label} has ${pct(a.mean)} in 100 ${m.who.many} showing ${m.trait} and ${b.label} ${pct(b.mean)}: about ${pct(gap)} points apart.` };
    }
    if (m.measure === 'settled') {
      const counts = run.demes.map(d => d.settled / R(d));
      const top = Math.max(...counts), low = Math.min(...counts);
      const win = top - low <= 0.2 ? [NEITHER] : run.demes.filter((_, i) => counts[i] === top).map(d => d.id);
      const line = run.demes.map(d => d.runs.length > 1
        ? `${d.label}: in ${d.settled} of ${R(d)} runs, ${m.trait} was on every ${m.who.one} or on none by generation ${m.generations}.`
        : `${d.label}: ${pct(d.mean)} in 100 ${m.who.many} show ${m.trait} at generation ${m.generations}.`).join(' ');
      return { run, truth: { kind: 'pick', win }, line };
    }
    const means = run.demes.map(d => d.mean);
    const top = Math.max(...means), low = Math.min(...means);
    const win = top - low < 0.05 ? [NEITHER] : run.demes.filter(d => d.mean === top).map(d => d.id);
    return { run, truth: { kind: 'pick', win }, line: run.demes.map(d => `${d.label}: ${pct(d.mean)} in 100 ${m.who.many} show ${m.trait}.`).join(' ') };
  },
};

// ---------------------------------------------------------------- trade-off

/** The population's average trait, generation by generation: offspring weighted by the trade-off
 * curve, around a spread of individuals (truncated normal, sd 0.12). Deterministic, no seed. */
export function tradeoffMeans(m: TradeoffModel): number[] {
  const xs = Array.from({ length: 101 }, (_, i) => i / 100);
  const out = [m.start];
  let mean = m.start;
  for (let g = 0; g < m.generations; g++) {
    let w = 0, wx = 0;
    for (const x of xs) {
      const weight = Math.exp(-(((x - mean) / 0.12) ** 2) / 2) * offspring(x, m.setting, m.mating);
      w += weight; wx += weight * x;
    }
    mean = w > 0 ? wx / w : mean;
    out.push(mean);
  }
  return out;
}

const tradeoff: Engine<TradeoffModel> = {
  archetype: 'tradeoff',
  check: m => {
    const out: string[] = [];
    if (!(m.setting.base > 0 && m.setting.rate > 0)) out.push('the cost needs a positive base and rate');
    if (!(m.mating.power > 0 && m.mating.lift >= 0)) out.push('the benefit needs a positive power and a lift of 0 or more');
    if (!(m.start >= 0 && m.start <= 1)) out.push('start must be 0–1');
    if (!(Number.isInteger(m.generations) && m.generations >= 1 && m.generations <= 500)) out.push('generations must be 1–500');
    return out;
  },
  outcome: m => {
    const at = best(m.setting, m.mating);
    const means = tradeoffMeans(m);
    const words = at <= 0.02 ? `at the ${m.trait.low} end` : at >= 0.98 ? `at the ${m.trait.high} end` : `${pct(at)}% of the way from ${m.trait.low} to ${m.trait.high}`;
    return { run: { engine: 'tradeoff', best: at, means }, truth: { kind: 'set', value: at }, line: `${m.who.many[0].toUpperCase()}${m.who.many.slice(1)} leave the most young ${words}. After ${m.generations} generations the average ${m.who.one} sits ${pct(means.at(-1)!)}% of the way along.` };
  },
};

// ---------------------------------------------------------------- cross

const cross: Engine<CrossModel> = {
  archetype: 'cross',
  check: m => {
    if (m.second) return checkTwoGenes(m, m.second);
    const out: string[] = [];
    try {
      const want = expected(m.parents[0], m.parents[1], m.locus);
      for (const t of Object.keys(want)) if (!(t in m.traits)) out.push(`offspring trait "${t}" has no label`);
      for (const g of m.parents) if (!(phenotype(g, m.locus) in m.traits)) out.push(`parent ${g} shows a trait with no label`);
    } catch (e) { out.push((e as Error).message); }
    if (!(m.focus in m.traits)) out.push(`focus "${m.focus}" is not a trait`);
    if (!(Number.isInteger(m.count) && m.count >= 8 && m.count <= 2000)) out.push('count must be 8–2000');
    if (m.copying && m.count % 4) out.push('a copying count must be a whole number of fours');
    return out;
  },
  outcome: (m, seed) => {
    if (m.second) return twoGeneOutcome(m, m.second, seed);
    const want = expected(m.parents[0], m.parents[1], m.locus);
    const share = (want[m.focus] ?? 0) / 4;
    const brood = (m.copying ? copies : sample)(m.parents[0], m.parents[1], m.count, m.locus, seededRng(seed));
    const counts = crossTally(brood, m.locus);
    const trait = midSentence(m.traits[m.focus]), about = `about ${Math.round(share * m.count)} of ${m.count}`, got = counts[m.focus] ?? 0;
    // Half and all are said in words, as the number beats say them: "2 of every 4" reads as a puzzle.
    const head = `${m.cross[0].toUpperCase()}${m.cross.slice(1)}: ${trait} in ${share === 1 ? `every ${m.who.one}` : share === 0.5 ? `half the ${m.who.many}` : `${share * 4} of every 4 ${m.who.many}`}`;
    // One animal's gametes: there is no cross and no brood, only its eggs or sperm.
    const line = m.copying ? `${head}, ${got} of ${m.count}.`
      : m.spots ? `${share * 4} ${share * 4 === 1 ? m.who.one : m.who.many} in every 4 ${share * 4 === 1 ? 'carries' : 'carry'} ${trait}: ${about}. These ${m.count} ${m.who.many} had ${got}.`
      : `${head}, ${about}. This run had ${got}.`;
    return { run: { engine: 'cross', expectedShare: share, brood, counts }, truth: { kind: 'set', value: share * m.count }, line };
  },
};

// ---------------------------------------------------------------- cross, two genes
// A second gene on another chromosome pair (types.ts SecondGene). Each gene is dealt separately, so
// every share is a whole number of sixteenths: the product of each gene's own quarters. The one-gene
// path above never reaches here, so a one-gene model runs exactly as it always has.

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
/** n out of d in lowest terms. */
const lowest = (n: number, d: number): [number, number] => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
/** How many of the offspring, as the one-gene lines say it: every, half, or "3 of every 16". */
const portionOf = ([n, d]: [number, number], who: Who) => n === d ? `every ${who.one}` : 2 * n === d ? `half the ${who.many}` : `${n} of every ${d} ${who.many}`;
const ofThose = ([n, d]: [number, number]) => n === d ? 'all of those' : 2 * n === d ? 'half of those' : `${n} of every ${d} of those`;
/** "a, b and c", with a comma before the last when an item already says "and". */
const listAnd = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')}${items.length > 2 || items.some(x => / and /.test(x)) ? ',' : ''} and ${items.at(-1)}`;

/** Each combination a two-gene model counts ('R|y'), mapped to the class key that counts it. */
export function crossClassOf(s: SecondGene): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(s.classes)) for (const part of key.split(',')) out[part] = key;
  return out;
}

const genes = (m: CrossModel, s: SecondGene): [Gene, Gene] => [{ locus: m.locus, parents: m.parents }, { locus: s.locus, parents: s.parents }];

/** A class part the cross never makes: point at the spelling it probably meant. */
function neverMade(part: string, made: Record<string, number>): string {
  const all = Object.keys(made);
  if (!part.includes('|')) return `class part "${part}" is not a combination: write the first gene's trait key, a bar, the second's ("${all[0]}")`;
  const spell = (k: string) => [...k].sort().join('');
  const [k1, k2] = splitPair(part);
  const twin = all.find(c => { const [c1, c2] = splitPair(c); return spell(c1) === spell(k1) && spell(c2) === spell(k2); });
  return twin ? `class part "${part}" is spelled "${twin}": a trait key lists its top alleles in sorted order` : `class part "${part}" is never made by this cross, which makes ${all.join(', ')}`;
}

function checkTwoGenes(m: CrossModel, s: SecondGene): string[] {
  const out: string[] = [];
  const [g1, g2] = genes(m, s);
  let made: Record<string, number>, e1: Record<string, number>, e2: Record<string, number>;
  try {
    made = expected2(g1, g2);
    e1 = expected(g1.parents[0], g1.parents[1], g1.locus);
    e2 = expected(g2.parents[0], g2.parents[1], g2.locus);
  } catch (e) { return [(e as Error).message]; }
  // The sex letter: the one-X (or one-Z) parent's Y or W, ranked with the top allele so each class names its sex.
  if (s.sex) {
    const top = Math.max(...Object.values(m.locus));
    if (!(s.sex in m.locus)) out.push(`sex "${s.sex}" is not an allele of the first gene`);
    else if (m.locus[s.sex] !== top) out.push(`the sex letter ${s.sex} must rank level with the first gene's top allele (${top}), so every class names its sex`);
    const holders = m.parents.map(g => [...g].filter(a => a === s.sex).length);
    if (holders.sort().join() !== '0,1') out.push(`exactly one parent carries one ${s.sex}: the one with a single X (or Z)`);
    if (s.sex in s.locus) out.push(`the second gene sits on an ordinary chromosome, so it never uses the sex letter ${s.sex}`);
    // Without them a parent is named by an offspring class: the father as a son, the hen as a daughter.
    if (!m.parentLabels && !m.spots) out.push(`a cross with the sex letter ${s.sex} names its parents with parentLabels: its traits name sons and daughters (or cocks and hens), so a parent would show as one of its own young`);
  }
  for (const x of ['Y', 'W']) if (x in m.locus && x !== s.sex) out.push(`a first-gene ${x} in a two-gene cross is the Y chromosome or a hen's W: declare it with sex: '${x}', or give that allele another letter`);
  // Labels: every trait the cross makes is named, and the parents too unless something else names them.
  for (const k of Object.keys(e1)) if (!(k in m.traits)) out.push(`offspring trait "${k}" of the first gene has no label`);
  for (const k of Object.keys(e2)) if (!(k in s.traits)) out.push(`offspring trait "${k}" of the second gene has no label`);
  if (!m.parentLabels && !m.spots) m.parents.forEach((g, i) => {
    if (!(phenotype(g, m.locus) in m.traits) || !(phenotype(s.parents[i], s.locus) in s.traits)) out.push(`parent ${i + 1} shows a trait with no label`);
  });
  // Classes: an exact partition of the combinations the cross makes.
  const keys = Object.keys(s.classes);
  if (keys.length < 2 || keys.length > 6) out.push(`${keys.length} classes: give 2 to 6, so the tally fits a phone and every class has its own colour`);
  const seen: Record<string, string[]> = {};
  for (const key of keys) {
    if (!s.classes[key]?.trim()) out.push(`class "${key}" has no label`);
    for (const part of key.split(',')) {
      if (!(part in made)) out.push(neverMade(part, made));
      else (seen[part] ??= []).push(key);
    }
  }
  for (const combo of Object.keys(made)) {
    const n = seen[combo]?.length ?? 0;
    if (!n) out.push(`the cross makes ${combo}, which no class counts`);
    if (n > 1) out.push(`${combo} is counted by ${n} classes (${seen[combo].join('; ')})`);
  }
  if (!(m.focus in s.classes)) out.push(`focus "${m.focus}" is not a class`);
  if (m.copying) out.push('copying and a second gene never go together');
  if (!!m.spots !== !!s.spots) out.push('give spots for both genes or for neither (`spots` and `second.spots`)');
  if (!(Number.isInteger(m.count) && m.count >= 8 && m.count <= 2000)) out.push('count must be 8–2000');
  return out;
}

function twoGeneOutcome(m: CrossModel, s: SecondGene, seed: string): Outcome {
  const [g1, g2] = genes(m, s);
  const made = expected2(g1, g2);
  const e1 = expected(g1.parents[0], g1.parents[1], g1.locus), e2 = expected(g2.parents[0], g2.parents[1], g2.locus);
  const classOf = crossClassOf(s);
  const parts = m.focus.split(',');
  const n16 = parts.reduce((t, c) => t + (made[c] ?? 0), 0), share = n16 / 16;
  const brood = sample2(g1, g2, m.count, seededRng(seed));
  const counts: Record<string, number> = {};
  for (const g of brood) { const key = classOf[phenotype2(g, m.locus, s.locus)]; counts[key] = (counts[key] ?? 0) + 1; }
  const label = midSentence(s.classes[m.focus]), about = `about ${Math.round(share * m.count)} of ${m.count}`, got = counts[m.focus] ?? 0;
  const both = (c: string) => { const [k1, k2] = splitPair(c); return `${midSentence(m.traits[k1])} and ${midSentence(s.traits[k2])}`; };
  let dealt: string;
  if (parts.length === 1) {
    // One combination: say how it multiplies, the first gene's share and then the second's "of those".
    const [k1, k2] = splitPair(parts[0]);
    dealt = `${m.spots ? 'Each spot is dealt separately' : 'Each gene is dealt separately'}: ${midSentence(m.traits[k1])} in ${portionOf(lowest(e1[k1], 4), m.who)}, and ${midSentence(s.traits[k2])} in ${ofThose(lowest(e2[k2], 4))}.`;
  } else {
    // A union: each part over one shared denominator, so the parts visibly add up.
    const d = Math.max(...parts.map(c => lowest(made[c], 16)[1]));
    const items = parts.map(c => `${both(c)} in ${(made[c] * d) / 16} of every ${d}`);
    const text = listAnd(items);
    dealt = `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  }
  const [n, d] = lowest(n16, 16);
  const line = m.spots
    ? `${n === d ? `Every ${m.who.one} carries` : 2 * n === d ? `Half the ${m.who.many} carry` : `${n} ${n === 1 ? m.who.one : m.who.many} in every ${d} ${n === 1 ? 'carries' : 'carry'}`} ${label}: ${about}. ${dealt} These ${m.count} ${m.who.many} had ${got}.`
    : `${m.cross[0].toUpperCase()}${m.cross.slice(1)}: ${label} in ${portionOf([n, d], m.who)}, ${about}. ${dealt} This run had ${got}.`;
  return { run: { engine: 'cross', expectedShare: share, brood, counts }, truth: { kind: 'set', value: share * m.count }, line };
}

// ---------------------------------------------------------------- tree

/** Tips that share a more recent ancestor with `of` than `than` does: the clade `of` sits in, just
 * below where its line meets `than`'s. */
export function closerThan(m: TreeModel): string[] {
  const root = parseNewick(m.newick);
  const meet = mrca(root, m.of, m.than);
  const branch = pathTo(meet, m.of)[1];
  return tipsOf(branch).filter(id => id !== m.of);
}

const tree: Engine<TreeModel> = {
  archetype: 'tree',
  check: m => {
    const out: string[] = [];
    try {
      const root = parseNewick(m.newick);
      const tips = tipsOf(root);
      if (tips.slice().sort().join() !== Object.keys(m.tips).sort().join()) out.push('tip labels do not match the tree’s tips');
      for (const id of [m.of, m.than]) if (!tips.includes(id)) out.push(`"${id}" is not a tip`);
      if (m.of === m.than) out.push('`of` and `than` must differ');
      if (tips.length < 6) out.push('a tree case needs at least 6 tips');
    } catch (e) { out.push((e as Error).message); }
    return out;
  },
  ids: m => Object.keys(m.tips).filter(id => id !== m.of && id !== m.than),
  outcome: m => {
    const closer = closerThan(m);
    return { run: { engine: 'tree', closer }, truth: { kind: 'pick', win: closer }, line: `${m.tips[m.of]} shares a more recent ancestor with ${listOf(closer.map(id => m.tips[id]))} than with ${m.tips[m.than]}.` };
  },
};

// ---------------------------------------------------------------- clock

const clock: Engine<ClockModel> = {
  archetype: 'timescale',
  check: m => {
    const out: string[] = [];
    if (!(m.event.ma > 0 && m.event.ma < m.earthMa)) out.push('the event must fall inside Earth’s history');
    for (const l of m.landmarks) if (!(l.ma >= 0 && l.ma < m.earthMa)) out.push(`landmark ${l.label} is off the day`);
    return out;
  },
  outcome: m => {
    const seconds = clockSeconds(m.event.ma, m.earthMa);
    return { run: { engine: 'clock', hours: seconds / 3600 }, truth: { kind: 'set', value: seconds / 3600 }, line: `${m.event.label}: ${formatClock(seconds)} on Earth’s day.` };
  },
};

// ---------------------------------------------------------------- nest

const nest: Engine<NestModel> = {
  archetype: 'grouping',
  check: m => {
    const out: string[] = [];
    const traits = m.traits.map(t => t.id);
    if (crossings(m.taxa, traits).length) out.push('the groups cross instead of nesting');
    if (!contiguous(m.taxa, traits)) out.push('taxa are not ordered so every group is contiguous');
    if (m.candidates.length < 5) out.push('a nest case needs at least 5 finds');
    return out;
  },
  ids: m => m.candidates.map(c => c.id),
  outcome: m => {
    const traits = m.traits.map(t => t.id);
    const homeless = m.candidates.filter(c => placements(m.taxa, traits, c).length === 0).map(c => c.id);
    const slots: Record<string, number> = {}, broken: Record<string, string | null> = {};
    for (const c of m.candidates) {
      const at = placeFind(m.taxa, traits, c);
      slots[c.id] = at.slot;
      const next: Taxon[] = [...m.taxa.slice(0, at.slot), c, ...m.taxa.slice(at.slot)];
      broken[c.id] = at.fits ? null : m.traits.find(t => !contiguous(next, [t.id]) || crossings(next, [t.id, ...traits]).some(pair => pair.includes(t.id)))?.label ?? null;
    }
    const labels = homeless.map(id => m.candidates.find(c => c.id === id)!.label);
    return { run: { engine: 'nest', homeless, slots, broken }, truth: { kind: 'pick', win: homeless }, line: `${listOf(labels)} ${homeless.length === 1 ? 'has' : 'have'} nowhere to go: every place in the groups breaks one of them. Every other find slots in.` };
  },
};

// ---------------------------------------------------------------- chart

const chart: Engine<ChartModel> = {
  archetype: 'chart',
  check: m => {
    const out: string[] = [];
    if (m.bars.length < 5) out.push('a chart case needs at least 5 bars');
    if (m.bars.some(b => !(Number.isFinite(b.value) && b.value >= 0))) out.push('bar values must be numbers of 0 or more');
    const top = [...m.bars].sort((a, b) => b.value - a.value);
    if (top[1] && top[0].value - top[1].value < top[0].value * 0.05) out.push('the two biggest bars are too close to call');
    return out;
  },
  ids: m => m.bars.map(b => b.id),
  outcome: m => {
    const order = [...m.bars].sort((a, b) => b.value - a.value).map(b => b.id);
    const top = m.bars.find(b => b.id === order[0])!;
    return { run: { engine: 'chart', order }, truth: { kind: 'pick', win: [top.id] }, line: `${top.label}: ${top.value.toLocaleString('en-US')} ${m.unit}, the largest.` };
  },
};


// ---------------------------------------------------------------- motion

const motion: Engine<MotionModel> = {
  archetype: 'motion',
  check: m => {
    const out: string[] = [];
    if (!(m.world.g > 0)) out.push('the world’s pull must be positive');
    if (!(m.height > 0)) out.push('the drop must be positive');
    if (m.body.terminal !== undefined && !(m.body.terminal > 0)) out.push('a terminal speed must be positive');
    const land = m.height > 0 && m.world.g > 0 ? fallTime(m.world.g, m.height, m.body.terminal) : 0;
    if (m.measure === 'distance' || m.measure === 'final') {
      if (!(m.seconds !== undefined && m.seconds > 0 && m.seconds < land)) out.push(`measure "${m.measure}" needs seconds between 0 and the ${land.toFixed(2)} s it takes to land`);
    } else if (m.seconds !== undefined) out.push(`measure "${m.measure}" takes no seconds`);
    if (m.measure === 'reach') {
      if (!(m.metres !== undefined && m.metres > 0 && m.metres < m.height)) out.push('measure "reach" needs metres between 0 and the height');
    } else if (m.metres !== undefined) out.push(`measure "${m.measure}" takes no metres`);
    return out;
  },
  printed: m => m.measure === 'distance' || m.measure === 'final' ? dropTicks(m.height) : [],
  outcome: m => {
    const { g } = m.world, vt = m.body.terminal;
    const land = fallTime(g, m.height, vt);
    const s = m.seconds ?? 0;
    const value = m.measure === 'time' ? land : m.measure === 'reach' ? fallTime(g, m.metres!, vt) : m.measure === 'distance' ? fallDistance(g, s, vt) : m.height - fallDistance(g, land - s, vt);
    const line = m.measure === 'time'
      ? `${m.body.label} falls the ${m.height} m in ${land.toFixed(2)} seconds.`
      : m.measure === 'reach'
        ? `${m.body.label} has fallen ${m.metres} m ${value.toFixed(2)} seconds after release, ${pct(value / land)}% of the way through its ${land.toFixed(2)}-second fall.`
        : m.measure === 'distance'
        ? `${s} second${s === 1 ? '' : 's'} after release, ${m.body.label.toLowerCase()} has fallen ${value.toFixed(1)} m of the ${m.height}.`
        : `In its last ${s === 1 ? 'second' : `${s} seconds`}, ${m.body.label.toLowerCase()} falls ${value.toFixed(1)} m: ${pct(value / m.height)}% of the drop.`;
    return { run: { engine: 'motion', land, value }, truth: { kind: 'set', value }, line };
  },
};

// ---------------------------------------------------------------- ratio

const ratio: Engine<RatioModel> = {
  archetype: 'ratio',
  check: m => {
    const out: string[] = [];
    if (m.measure === 'pull') {
      if (!(m.hz > 0 && m.factor > 0 && m.factor !== 1)) out.push('the string needs a positive frequency and a pull that changes');
    } else if (m.measure === 'pitch') {
      if (!(m.string.hz > 0 && m.string.length > 0 && m.stopped > 0)) out.push('the string needs a positive frequency, length and stopped length');
      if (m.stopped === m.string.length) out.push('the stopped length is the open string');
    } else if (m.measure === 'calmest') {
      if (m.pairs.length < 2) out.push('needs two or more pairs');
      if (new Set(m.pairs.map(x => x.id)).size !== m.pairs.length) out.push('pair IDs repeat');
      if (m.pairs.some(x => !(x.hz[0] > 0 && x.hz[1] > 0) || x.hz[0] === x.hz[1])) out.push('every pair needs two different positive frequencies');
      else {
        const waves = m.pairs.map(x => lowWavesToRepeat(...x.hz)).sort((a, b) => a - b);
        if (waves[0] === waves[1]) out.push('two pairs tie for the calmest');
      }
    } else if (!(m.hz[0] > 0 && m.hz[1] > 0) || m.hz[0] === m.hz[1]) out.push('needs two different positive frequencies');
    return out;
  },
  ids: m => m.measure === 'calmest' ? m.pairs.map(x => x.id) : [],
  outcome: (m): Outcome => {
    if (m.measure === 'pull') {
      const value = frequencyAtPull(m.hz, m.factor);
      return { run: { engine: 'ratio', value, ratios: {} }, truth: { kind: 'set', value }, line: `Pitch follows the square root of the pull: √${+m.factor.toFixed(4)} = ${+Math.sqrt(m.factor).toFixed(3)}, so ${m.hz} Hz becomes ${value.toFixed(1)} Hz.` };
    }
    if (m.measure === 'pitch') {
      const value = stoppedFrequency(m.string.hz, m.string.length, m.stopped);
      const [p, q] = ratioOf(m.string.length, m.stopped);
      return { run: { engine: 'ratio', value, ratios: { string: [p, q] } }, truth: { kind: 'set', value }, line: `${m.stopped} of ${m.string.length} ${m.string.unit} is ${m.stopped < m.string.length ? `${q}/${p}` : `${p}/${q}`} of the string, so it sounds ${m.string.hz} × ${m.stopped < m.string.length ? `${p}/${q}` : `${q}/${p}`} = ${value.toFixed(1)} Hz.` };
    }
    if (m.measure === 'calmest') {
      const ratios = Object.fromEntries(m.pairs.map(x => [x.id, ratioOf(...x.hz)])) as Record<string, [number, number]>;
      const top = m.pairs.reduce((a, b) => ratios[b.id][1] < ratios[a.id][1] ? b : a);
      const [p, q] = ratios[top.id];
      return { run: { engine: 'ratio', value: q, ratios }, truth: { kind: 'pick', win: [top.id] }, line: `${top.label} is ${p}:${q}: its shape repeats every ${q} waves of the lower note, sooner than any other pair.` };
    }
    const value = repeatsPerSecond(...m.hz);
    const [p, q] = ratioOf(...m.hz);
    return { run: { engine: 'ratio', value, ratios: { pair: [p, q] } }, truth: { kind: 'set', value }, line: `${Math.max(...m.hz)} to ${Math.min(...m.hz)} is ${p}:${q}, so the shape repeats every ${q} low waves: ${Math.min(...m.hz)} ÷ ${q} = ${+value.toFixed(2)} times a second.` };
  },
};

// ---------------------------------------------------------------- spread

/** How far the paces may be off before the winner must still hold: each way of travel at two thirds
 * and one and a half times its pace, in every combination. */
const PACE_SHIFTS = [2 / 3, 1, 3 / 2];
/** The winner must beat the runner-up by this factor in days, so a map, not a ruler, settles it. */
const SPREAD_MARGIN = 1.25;

function spreadWinner(m: SpreadModel, speeds: Partial<Record<Via, number>>): { at: Record<string, Arrival>; order: string[] } {
  const at = arrivals(m.places, m.routes, m.origin, speeds);
  const order = [...m.candidates].sort((a, b) => at[a].days - at[b].days);
  if (m.measure === 'last') order.reverse();
  return { at, order };
}

const days = (n: number) => Math.max(1, Math.round(n));

const spread: Engine<SpreadModel> = {
  archetype: 'spread',
  check: m => {
    const out: string[] = [];
    const ids = new Set(m.places.map(p => p.id));
    if (ids.size !== m.places.length) out.push('place IDs repeat');
    for (const p of m.places) if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) out.push(`${p.id}: coordinates are off the globe`);
    if (!ids.has(m.origin)) out.push(`origin "${m.origin}" is not a place`);
    for (const r of m.routes) {
      for (const end of [r.from, r.to]) if (!ids.has(end)) out.push(`a route ends at unknown place "${end}"`);
      if (!(m.speeds[r.via]! > 0)) out.push(`no pace for ${r.via}`);
      for (const [lat, lon] of r.path ?? []) if (Math.abs(lat) > 90 || Math.abs(lon) > 180) out.push(`${r.from}–${r.to}: a waypoint is off the globe`);
    }
    if (m.candidates.length < 2 || new Set(m.candidates).size !== m.candidates.length) out.push('needs two or more different candidates');
    for (const c of m.candidates) if (!ids.has(c) || c === m.origin) out.push(`candidate "${c}" is not a place other than the origin`);
    if (out.length) return out;
    const base = spreadWinner(m, m.speeds);
    const unreached = m.candidates.filter(c => !Number.isFinite(base.at[c].days));
    if (unreached.length) return [`no route reaches ${unreached.join(', ')}`];
    const [w, r] = base.order.map(c => base.at[c].days);
    if ((m.measure === 'first' ? r / w : w / r) < SPREAD_MARGIN) out.push(`the winner beats the runner-up by less than ${SPREAD_MARGIN}× in days`);
    const modes = [...new Set(m.routes.map(x => x.via))];
    const combos = modes.reduce<Partial<Record<Via, number>>[]>((acc, via) => acc.flatMap(sp => PACE_SHIFTS.map(k => ({ ...sp, [via]: m.speeds[via]! * k }))), [{}]);
    for (const sp of combos) {
      const won = spreadWinner(m, sp).order[0];
      if (won !== base.order[0]) { out.push(`the winner hangs on the exact paces: at ${modes.map(v => `${v} ${+sp[v]!.toFixed(1)}`).join(', ')} km a day, ${won} wins instead`); break; }
    }
    return out;
  },
  ids: m => m.candidates,
  outcome: m => {
    const { at, order } = spreadWinner(m, m.speeds);
    const label = (id: string) => m.places.find(p => p.id === id)!.label;
    const [won, other] = [order[0], order[order.length - 1]];
    const what = m.what[0].toUpperCase() + m.what.slice(1);
    const line = m.measure === 'first'
      ? `${what} reaches ${label(won)} first, on day ${days(at[won].days)}. ${label(other)} waits until day ${days(at[other].days)}.`
      : `${what} reaches ${label(won)} last, on day ${days(at[won].days)}. ${label(other)} falls sick on day ${days(at[other].days)}.`;
    return { run: { engine: 'spread', arrivals: at, days: Math.max(...m.candidates.map(c => at[c].days)) }, truth: { kind: 'pick', win: [won] }, line };
  },
};

// ---------------------------------------------------------------- sequence

const ONE_CHANGE = new Set<SequenceModel['measure']>(['effect', 'residue']);

/** The first string read, each change read again, and the pair table: exact, so any seed gives
 * the same run. */
export function sequenceRun(m: SequenceModel): SequenceRun {
  const first = m.seqs[0];
  const before = read(first.letters, { from: m.from });
  const afters = (m.changes ?? []).map(c => {
    const fx = effectOf(first.letters, c.change, { from: m.from });
    return { id: c.id, letters: fx.letters, reading: fx.after, effect: fx.effect, firstChange: fx.firstChange };
  });
  const table = m.measure === 'closest' || m.measure === 'differences' ? closest(m.seqs, m.by ?? 'position').table : undefined;
  return { engine: 'sequence', before, afters, table };
}

/** What one change did, in a computed sentence. Positions and lengths count from firstResidue. */
/** What to add to a chain index (from the first codon read) to get the protein's own position. */
const offsetOf = (m: SequenceModel) => (m.firstResidue ?? 1) - 1 - (m.trimFirst ? 1 : 0);

function changeLine(m: SequenceModel, run: SequenceRun, k: number): string {
  const a = run.afters[k], off = offsetOf(m);
  const was = run.before.chain, now = a.reading.chain;
  const pos = a.firstChange + off, oldName = AMINO[was[a.firstChange - 1]]?.name, newName = AMINO[now[a.firstChange - 1]]?.name;
  const n = (k: number) => (k + off).toLocaleString('en-US');
  switch (a.effect) {
    case 'silent': return 'The changed codon still spells the same amino acid, so the chain is exactly as it was.';
    case 'missense': return `Position ${pos} of the chain is now ${newName} instead of ${oldName}; every other amino acid is the same.`;
    case 'nonsense': return `The chain now stops after ${n(now.length)} amino acids instead of ${n(was.length)}.`;
    case 'stop-lost': return `The stop codon is gone, so reading runs on: ${n(now.length)} amino acids instead of ${n(was.length)}${a.reading.stop ? '' : ', and still no stop in these letters'}.`;
    case 'start-lost': return 'The start codon is gone, so reading never begins where it did.';
    case 'frameshift': {
      const span = now.length - a.firstChange + 1;
      const differ = [...now].filter((x, i) => i >= a.firstChange - 1 && x !== was[i]).length;
      // Counted in amino acids, not codons: the codon holding the change can be regrouped and still
      // spell the same amino acid (ABO c.261delG: codon 87 GTG becomes GTA, valine either way).
      return `From amino acid ${pos} on, the chain reads differently: ${differ} of the next ${span} amino acids differ, and the chain ends after ${n(now.length)} amino acids instead of ${n(was.length)}.`;
    }
    case 'in-frame': {
      const d = now.length - was.length;
      return `${Math.abs(d)} amino acid${Math.abs(d) === 1 ? ' is' : 's are'} ${d < 0 ? 'lost' : 'added'} and the rest read as before: ${n(now.length)} amino acids instead of ${n(was.length)}.`;
    }
    case 'outside': return 'The change lies outside the part that is read, so the chain is the same.';
  }
}

/** What a change does, said after its label: for one change, then for several. */
const DOES: Readonly<Record<Effect, readonly [string, string]>> = {
  silent: ['leaves the chain the same', 'each leave the chain the same'],
  missense: ['swaps one amino acid', 'each swap one amino acid'],
  nonsense: ['stops the chain early', 'each stop the chain early'],
  'stop-lost': ['lets the chain run on past its usual end', 'each let the chain run on past its usual end'],
  'start-lost': ['loses the start', 'each lose the start'],
  frameshift: ['makes everything after it read wrong', 'each make everything after them read wrong'],
  'in-frame': ['adds or removes whole amino acids and leaves the rest as they were', 'each add or remove whole amino acids and leave the rest as they were'],
  outside: ['lies outside the part that is read', 'each lie outside the part that is read'],
};

const sequence: Engine<SequenceModel> = {
  archetype: 'sequence',
  check: m => {
    const out: string[] = [];
    const alphabet = BASES[m.kind];
    if (!m.seqs.length) return ['needs at least one string'];
    if (new Set(m.seqs.map(s => s.id)).size !== m.seqs.length) out.push('string IDs repeat');
    for (const s of m.seqs) out.push(...badLetters(s.letters, alphabet).map(x => `${s.id}: ${x}`));
    const changes = m.changes ?? [];
    if (new Set(changes.map(c => c.id)).size !== changes.length) out.push('change IDs repeat');
    for (const c of changes) out.push(...changeProblems(m.seqs[0].letters, c.change, alphabet).map(x => `${c.id}: ${x}`));
    const reads = m.measure !== 'closest' && m.measure !== 'differences';
    if (reads && m.from === 'start' && findStart(m.seqs[0].letters) < 0) out.push('no start codon (AUG) in the first string');
    if (reads && typeof m.from === 'number' && !(Number.isInteger(m.from) && m.from >= 1 && m.from <= m.seqs[0].letters.length)) out.push(`reading can't begin at letter ${m.from}`);
    if (ONE_CHANGE.has(m.measure) && changes.length !== 1) out.push(`measure "${m.measure}" reads exactly one change`);
    if (m.measure === 'length' && changes.length > 1) out.push('measure "length" reads one change, or none');
    if (m.measure === 'same' && changes.length < 2) out.push('measure "same" picks among two changes or more');
    if (m.measure === 'residue' && !(Number.isInteger(m.at) && (m.at ?? 0) >= 1 + offsetOf(m))) out.push('measure "residue" names a chain position (at) the reading covers');
    if (m.trimFirst && m.from !== 'start') out.push('trimFirst drops the start methionine, so reading must begin at the start codon');
    if (m.measure === 'closest' && m.seqs.length < 3) out.push('measure "closest" compares three strings or more');
    if (m.measure === 'differences' && m.seqs.length !== 2) out.push('measure "differences" compares exactly two strings');
    if (m.window && !(m.window[0] >= 1 && m.window[1] >= m.window[0] && m.window[1] <= m.seqs[0].letters.length)) out.push('the window lies outside the letters');
    if (out.length) return out;
    const run = sequenceRun(m);
    if (m.measure === 'effect' && effectOf(m.seqs[0].letters, changes[0].change, { from: m.from }).stopsAtOnce) out.push('the shift meets a stop at once, so two effects are right: pick another change');
    if (m.measure === 'same' && !run.afters.some(a => a.reading.chain === run.before.chain)) out.push('no change leaves the chain as it was');
    return out;
  },
  ids: m => m.measure === 'effect' ? [...EFFECTS]
    : m.measure === 'residue' ? Object.keys(AMINO)
    : m.measure === 'same' ? (m.changes ?? []).map(c => c.id)
    : m.measure === 'closest' ? m.seqs.flatMap((a, i) => m.seqs.slice(i + 1).map(b => pairKey(a.id, b.id)))
    : [],
  outcome: m => {
    const run = sequenceRun(m);
    const off = offsetOf(m);
    if (m.measure === 'effect') return { run, truth: { kind: 'pick', win: [run.afters[0].effect] }, line: `${EFFECT_WORDS[run.afters[0].effect]}. ${changeLine(m, run, 0)}` };
    if (m.measure === 'length') {
      const chain = run.afters[0]?.reading.chain ?? run.before.chain;
      return { run, truth: { kind: 'set', value: chain.length + off }, line: run.afters.length ? changeLine(m, run, 0) : `The gene reads into a chain of ${chain.length + off} amino acids.` };
    }
    if (m.measure === 'residue') {
      const sym = run.afters[0].reading.chain[(m.at ?? 1) - 1 - off] ?? '*';
      return { run, truth: { kind: 'pick', win: [sym] }, line: `${sym === '*' ? `The chain has ended before position ${m.at}` : `Position ${m.at} is now ${AMINO[sym].name} (${symbolShort(sym)})`}. ${changeLine(m, run, 0)}` };
    }
    if (m.measure === 'same') {
      const win = run.afters.filter(a => a.reading.chain === run.before.chain && !!a.reading.stop === !!run.before.stop).map(a => a.id);
      // Labels are quoted: they carry their own colon ("Letter 9: T becomes C"), which mid-sentence
      // reads as a heading. The other changes are named with what they did, grouped by effect, so a
      // learner sees what their own pick did here, where the picture's list may be scrolled away.
      const quoted = (id: string) => `“${m.changes!.find(c => c.id === id)!.label}”`;
      const groups = new Map<Effect, string[]>();
      for (const a of run.afters) if (!win.includes(a.id)) groups.set(a.effect, [...(groups.get(a.effect) ?? []), a.id]);
      const others = [...groups].map(([effect, ids]) => `${listOf(ids.map(quoted))} ${ids.length === 1 ? DOES[effect][0] : DOES[effect][1]}`);
      return { run, truth: { kind: 'pick', win }, line: `${listOf(win.map(quoted))} ${win.length === 1 ? 'leaves' : 'leave'} the chain exactly as it was.${others.length ? ` ${others.join('; ')}.` : ''}` };
    }
    const table = run.table!;
    const name = (id: string) => m.seqs.find(s => s.id === id)!.label;
    if (m.measure === 'differences') {
      const d = distance(m.seqs[0].letters, m.seqs[1].letters, m.by ?? 'position');
      return { run, truth: { kind: 'set', value: d }, line: `${capFirst(name(m.seqs[0].id))} and ${name(m.seqs[1].id)} differ at ${d} ${d === 1 ? 'letter' : 'letters'}.` };
    }
    // Labels read mid-sentence; only a sentence's first word is raised.
    const least = closest(m.seqs, m.by ?? 'position');
    // The other pairs in one sentence, nearest first: printed one sentence each ("European badger and
    // wolverine: 6."), a wrapped line could open on "6." and read as a numbered list.
    const rest = table.filter(t => !least.least.includes(pairKey(t.a, t.b))).sort((x, y) => x.d - y.d).map(t => `${name(t.a)} and ${name(t.b)} by ${t.d}`);
    return { run, truth: { kind: 'pick', win: least.least }, line: `${capFirst(least.least.map(k => k.split('|').map(name).join(' and ')).join('; '))} differ least: ${least.d} ${least.d === 1 ? 'letter' : 'letters'}.${rest.length ? ` The other pairs differ more: ${rest.join('; ')}.` : ''}` };
  },
};

// ---------------------------------------------------------------- the catalogue

export const CASE_ENGINES: { [K in CaseEngineId]: Engine<Extract<CaseModel, { engine: K }>> } = { population, tradeoff, cross, tree, clock, nest, chart, motion, ratio, spread, sequence };

const engineOf = (m: CaseModel) => CASE_ENGINES[m.engine] as unknown as Engine<CaseModel>;

/** The run a case shows, from its own seed (or another, for the stability check). */
export const runCase = (c: PlaceCase, seed = c.seed): Outcome => engineOf(c.model).outcome(c.model, seed);

/** Does this answer win, against a computed outcome? */
export function wins(call: CaseCall, truth: Truth, answer: CaseAnswer): boolean {
  if (call.kind === 'pick' && call.multi && truth.kind === 'pick' && 'picks' in answer) return new Set(answer.picks).size === truth.win.length && answer.picks.every(id => truth.win.includes(id));
  if (call.kind === 'pick' && !call.multi && truth.kind === 'pick' && 'pick' in answer) return truth.win.includes(answer.pick);
  if (call.kind === 'set' && truth.kind === 'set' && 'value' in answer) return Math.abs(answer.value - truth.value) <= call.tolerance + 1e-9;
  return false;
}

/** The chance a blind guess wins: winning options over options, or the winning band over the range. */
export function guessP(call: CaseCall, truth: Truth): number {
  // A multi pick wins only with exactly the right set: one of the 2^n − 1 non-empty choices.
  if (call.kind === 'pick' && call.multi) return 1 / (2 ** call.options.length - 1);
  if (call.kind === 'pick') return truth.kind === 'pick' ? call.options.filter(o => truth.win.includes(o.id)).length / call.options.length : 1;
  if (truth.kind !== 'set') return 1;
  const lo = Math.max(call.min, truth.value - call.tolerance), hi = Math.min(call.max, truth.value + call.tolerance);
  return Math.max(0, hi - lo) / (call.max - call.min);
}

/** The winning call, in words. */
export function rightWords(c: PlaceCase, truth: Truth): string {
  if (c.call.kind === 'pick' && truth.kind === 'pick') return listOf(c.call.options.filter(o => truth.win.includes(o.id)).map(o => o.label));
  if (c.call.kind === 'set' && truth.kind === 'set') return valueWords(c.call, truth.value);
  return '';
}

/** The learner's call, in words. */
export function answerWords(c: PlaceCase, answer: CaseAnswer): string {
  if (c.call.kind === 'pick' && 'pick' in answer) return c.call.options.find(o => o.id === answer.pick)?.label ?? answer.pick;
  if (c.call.kind === 'pick' && 'picks' in answer) return listOf(c.call.options.filter(o => answer.picks.includes(o.id)).map(o => o.label));
  if (c.call.kind === 'set' && 'value' in answer) return valueWords(c.call, answer.value);
  return '';
}

export function valueWords(call: Extract<CaseCall, { kind: 'set' }>, value: number): string {
  if (call.unit === 'clock') {
    const minutes = Math.round(value * 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  if (call.ends && call.max === 1 && call.min === 0) return value <= 0.02 ? call.ends[0] : value >= 0.98 ? call.ends[1] : `${pct(value)}% of the way from ${call.ends[0]} to ${call.ends[1]}`;
  const digits = call.step < 1 ? Math.min(2, String(call.step).split('.')[1]?.length ?? 1) : 0;
  return `${value.toFixed(digits)}${call.unit ? ` ${call.unit}` : ''}`;
}

/** A case judged: the outcome, whether the answer wins, and the right call in words. */
export function judgeCase(c: PlaceCase, answer: CaseAnswer): { outcome: Outcome; success: boolean; right: string; given: string } {
  const outcome = runCase(c);
  return { outcome, success: wins(c.call, outcome.truth, answer), right: rightWords(c, outcome.truth), given: answerWords(c, answer) };
}

/** Every problem with how a case computes (the validator adds transfer and sources). */
export function caseProblems(c: PlaceCase): string[] {
  const engine = CASE_ENGINES[c.model.engine] as unknown as Engine<CaseModel> | undefined;
  if (!engine) return [`unknown engine "${(c.model as { engine: string }).engine}"`];
  const out = engine.check(c.model);
  if (out.length) return out;
  let first: Outcome;
  try { first = engine.outcome(c.model, c.seed); } catch (e) { return [`the engine could not run it: ${(e as Error).message}`]; }
  const ids = engine.ids?.(c.model) ?? [];
  if (c.call.kind === 'pick') {
    if (first.truth.kind !== 'pick') out.push('a pick call on a measure that computes a value');
    for (const o of c.call.options) if (!ids.includes(o.id)) out.push(`option "${o.id}" means nothing to the ${c.model.engine} engine`);
    if (new Set(c.call.options.map(o => o.id)).size !== c.call.options.length) out.push('options repeat');
  } else {
    if (first.truth.kind !== 'set') out.push('a set call on a measure that picks');
    const { min, max, step, start, tolerance } = c.call;
    if (!(max > min && step > 0 && tolerance > 0)) out.push('the range, step and tolerance must be positive');
    if (first.truth.kind === 'set' && (first.truth.value < min || first.truth.value > max)) out.push(`the computed answer ${first.truth.value.toFixed(2)} is off the range`);
    if (first.truth.kind === 'set' && wins(c.call, first.truth, { value: start })) out.push('the slider starts inside the winning band: doing nothing would win');
    if (first.truth.kind === 'set' && tolerance < step) out.push('the tolerance is narrower than one step');
    for (const v of engine.printed?.(c.model) ?? []) if (first.truth.kind === 'set' && wins(c.call, first.truth, { value: v })) { out.push(`the picture prints ${v} before the run, and it wins`); break; }
  }
  if (out.length) return out;
  const winning = c.call.kind === 'pick' && first.truth.kind === 'pick' ? c.call.options.filter(o => (first.truth as { win: string[] }).win.includes(o.id)).length : 1;
  if (!winning) out.push('no option wins');
  if (c.call.kind === 'pick' && winning === c.call.options.length) out.push('every option wins');
  if (c.call.kind === 'pick' && !c.call.multi && c.model.engine === 'tree') out.push('a tree case is a multi pick: every tip closer than `than`');
  if (c.call.kind === 'pick' && c.call.multi && c.model.engine !== 'tree') out.push('only tree cases pick several');
  const p = guessP(c.call, first.truth);
  if (p > CASE_POLICY.maxGuessP + 1e-9) out.push(`a blind guess wins ${(p * 100).toFixed(0)}% of the time; at most ${CASE_POLICY.maxGuessP * 100}%`);
  // Determinism: the same seed, the same outcome.
  if (JSON.stringify(engine.outcome(c.model, c.seed)) !== JSON.stringify(first)) out.push('two runs from the same seed differ');
  // Stability: luck never decides. Under other seeds the same calls win.
  for (let k = 0; k < CASE_POLICY.stabilitySeeds; k++) {
    const other = engine.outcome(c.model, `${c.seed}~${k}`).truth;
    if (other.kind === 'pick' && first.truth.kind === 'pick' && other.win.slice().sort().join() !== first.truth.win.slice().sort().join()) { out.push(`under another seed the winner changes (${first.truth.win.join()} → ${other.win.join()})`); break; }
    if (other.kind === 'set' && first.truth.kind === 'set' && c.call.kind === 'set' && Math.abs(other.value - first.truth.value) > c.call.tolerance / 2) { out.push(`under another seed the answer moves by more than half the tolerance (${first.truth.value.toFixed(2)} → ${other.value.toFixed(2)})`); break; }
  }
  return out;
}

/** The text a learner reads in a case, for the transfer check. */
export const caseText = (c: PlaceCase): string => [c.title, c.setting ?? '', c.scenario, c.ask, c.reveal, JSON.stringify(c.call), JSON.stringify(c.model)].join('\n');

function listOf(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
