// Numeric check items are generated, never typed: the bank names a generator and its
// cases, and code writes the prompt and computes the answer. A family's cases are surface
// variants of one scenario (the same answer logic with new numbers), so a retry or another
// learner can get fresh numbers without a fresh family.
import { makeVariant } from '../expeditions/engine/variants';
import { expected, type Locus } from '../expeditions/sims/cross';
import type { NumberItem } from './types';

export interface CheckVariant {
  prompt: string;
  answer: number;
  unit: string;
  /** Absolute tolerance. */
  tolerance: number;
  /** Decimal places the working shows. */
  digits: number;
  /** Where a blind guess could plausibly land; guessP is the tolerance band over this range. */
  plausible: [number, number];
  /** The worked answer, shown in the review after the check. */
  working: string;
}

type Case = Record<string, number | string>;
type Params = { template: string; cases: Case[]; unit: string; tolerance: number; digits?: number };

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const show = (value: number, digits = 0) => round(value, digits).toLocaleString('en-US', { maximumFractionDigits: digits });
/** Fill {name} slots; numbers print with thousands separators. */
const fill = (template: string, values: Case) => template.replace(/\{(\w+)\}/g, (_, key: string) => {
  const value = values[key];
  if (value === undefined) throw new Error(`Template slot {${key}} has no value`);
  return typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 6 }) : value;
});
const pick = (params: Params, n: number) => {
  if (!Array.isArray(params.cases) || !params.cases.length) throw new Error('A generated item needs at least one case');
  return params.cases[n % params.cases.length];
};
const num = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a number`);
  return value;
};
/** Relative tolerance in the bank becomes an absolute band, never tighter than the last shown digit. */
const band = (answer: number, relative: number, digits: number) => Math.max(Math.abs(answer) * relative, 0.5 * 10 ** -digits);

const generators: Record<string, (params: Params, n: number) => CheckVariant> = {
  /** Fallen from rest: distance after t seconds = (distance in the first second) × t². */
  squareFromFirst(params, n) {
    const c = pick(params, n);
    const first = num(c.first, 'first'), t = num(c.t, 't');
    const digits = params.digits ?? 1;
    const answer = first * t * t;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * answer],
      working: `${show(first, 2)} × ${t} × ${t} = ${show(answer, digits)} ${params.unit}. Distance grows with the square of the time.`,
    };
  },
  /** Time to fall a height from rest: h = ½ g t², so t = √(2h / g). */
  fallTime(params, n) {
    const c = pick(params, n);
    const h = num(c.height, 'height'), g = num(c.g, 'g');
    const digits = params.digits ?? 1;
    const answer = Math.sqrt((2 * h) / g);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * answer],
      working: `${show(h, 1)} m = ½ × ${g} × t × t, so t × t = ${show((2 * h) / g, 2)} and t = ${show(answer, digits)} ${params.unit}.`,
    };
  },
  /** Gap between flash k and flash k+1 of a body falling from rest: (first gap) × (2k − 1). */
  oddGap(params, n) {
    const c = pick(params, n);
    const first = num(c.first, 'first'), k = num(c.k, 'k');
    if (!Number.isInteger(k) || k < 2) throw new Error('oddGap needs a whole flash number of at least 2');
    const digits = params.digits ?? 0;
    const answer = first * (2 * k - 1);
    return {
      prompt: fill(params.template, { ...c, next: k + 1 }), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * answer],
      working: `The gaps grow 1, 3, 5, 7 …, so gap ${k} is ${2 * k - 1} × ${show(first, digits)} = ${show(answer, digits)} ${params.unit}.`,
    };
  },
  /** A quantity scaled by a whole-number ratio: base × num ÷ den (intervals, string lengths). */
  ratio(params, n) {
    const c = pick(params, n);
    const base = num(c.base, 'base'), top = num(c.num, 'num'), bottom = num(c.den, 'den');
    const digits = params.digits ?? 0;
    const answer = (base * top) / bottom;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * Math.max(answer, base)],
      working: `${show(base, digits)} × ${top}/${bottom} = ${show(answer, digits)} ${params.unit}.${c.note ? ` ${c.note}` : ''}`,
    };
  },
  /** A group survives if any one of its k members does, each lost independently with chance p%:
   * percent surviving = 100 × (1 − (p/100)^k). */
  anySurvives(params, n) {
    const c = pick(params, n);
    const p = num(c.p, 'p'), k = num(c.k, 'k');
    if (!Number.isInteger(k) || k < 2 || p <= 0 || p >= 100) throw new Error('anySurvives needs 0 < p < 100 and a whole k of at least 2');
    const digits = params.digits ?? 0;
    const allLost = (p / 100) ** k;
    const answer = 100 * (1 - allLost);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 100],
      working: `All ${k} lost: ${Array(k).fill(show(p / 100, 2)).join(' × ')} = ${show(allLost, 3)}. Surviving: 1 − ${show(allLost, 3)} = ${show(1 - allLost, 3)}, about ${show(answer, digits)}${params.unit}.`,
    };
  },
  /** Serial founding: each new group keeps r% of its parent group's variety, k times over:
   * percent kept = 100 × (r/100)^k. */
  serialShare(params, n) {
    const c = pick(params, n);
    const r = num(c.r, 'r'), k = num(c.k, 'k');
    if (!Number.isInteger(k) || k < 2 || r <= 0 || r >= 100) throw new Error('serialShare needs 0 < r < 100 and a whole k of at least 2');
    const digits = params.digits ?? 0;
    const kept = (r / 100) ** k;
    const answer = 100 * kept;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 100],
      working: `${show(r / 100, 2)} multiplied by itself ${k} times = ${show(kept, 3)}, about ${show(answer, digits)}${params.unit} of the original.`,
    };
  },
  /** One member takes top% of a prize and the other (members − 1) share the rest equally:
   * how many times one of the others' share is the top share? top × (members − 1) ÷ (100 − top). */
  topShare(params, n) {
    const c = pick(params, n);
    const top = num(c.top, 'top'), members = num(c.males, 'males');
    if (!Number.isInteger(members) || members < 2 || top <= 0 || top >= 100) throw new Error('topShare needs 0 < top < 100 and at least 2 members');
    const digits = params.digits ?? 0;
    const each = (100 - top) / (members - 1);
    const answer = top / each;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * answer],
      working: `The other ${members - 1} share ${100 - top}%: ${show(each, 2)}% each. ${top} ÷ ${show(each, 2)} = ${show(answer, digits)} ${params.unit}.`,
    };
  },
  /** Share of a population gone between two counts: 100 × (before − after) ÷ before. */
  shareLost(params, n) {
    const c = pick(params, n);
    const before = num(c.before, 'before'), after = num(c.after, 'after');
    if (!(before > after && after >= 0)) throw new Error('shareLost needs before > after >= 0');
    const digits = params.digits ?? 0;
    const answer = (100 * (before - after)) / before;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 100],
      working: `${show(before)} − ${show(after)} = ${show(before - after)} gone. ${show(before - after)} ÷ ${show(before)} = ${show(answer, digits)}${params.unit}.`,
    };
  },
  /** How many times faster one route was than another, in distance per unit of time: (d1 ÷ t1) ÷ (d2 ÷ t2). */
  speedRatio(params, n) {
    const c = pick(params, n);
    const d1 = num(c.d1, 'd1'), t1 = num(c.t1, 't1'), d2 = num(c.d2, 'd2'), t2 = num(c.t2, 't2');
    if (![d1, t1, d2, t2].every(x => x > 0)) throw new Error('speedRatio needs positive distances and times');
    const digits = params.digits ?? 0;
    const answer = (d1 / t1) / (d2 / t2);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 2 * answer],
      working: `${show(d1)} ÷ ${show(t1)} = ${show(d1 / t1, 1)} a year by sea; ${show(d2)} ÷ ${show(t2)} = ${show(d2 / t2, 1)} a year overland. ${show(d1 / t1, 1)} ÷ ${show(d2 / t2, 1)} = about ${show(answer, digits)} ${params.unit}.`,
    };
  },
  /** Years until two cycles line up again: the least common multiple of a and b. */
  meetAgain(params, n) {
    const c = pick(params, n);
    const a = num(c.a, 'a'), b = num(c.b, 'b');
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) throw new Error('meetAgain needs whole cycle lengths');
    const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
    const answer = (a * b) / gcd(a, b);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, 2 * answer],
      working: `The cycles line up again after the smallest number both ${a} and ${b} divide: ${show(answer)} ${params.unit}.`,
    };
  },
  /** Expected carriers of two independent variants: total ÷ (a × b). */
  bothVariants(params, n) {
    const c = pick(params, n);
    const total = num(c.total, 'total'), a = num(c.a, 'a'), b = num(c.b, 'b');
    const answer = total / (a * b);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, total / a],
      working: `${show(total)} ÷ ${show(a)} = ${show(total / a)} carry the first variant; 1 in ${show(b)} of those also carries the second: ${show(answer)}.`,
    };
  },
  /** Drawings of one tree: each of its (tips − 1) branch points can be drawn either way round,
   * so a fully branching tree of n tips has 2^(n − 1) orders of its names. */
  treeDrawings(params, n) {
    const c = pick(params, n);
    const tips = num(c.tips, 'tips');
    if (!Number.isInteger(tips) || tips < 3) throw new Error('treeDrawings needs a whole number of at least 3 tips');
    const points = tips - 1;
    const answer = 2 ** points;
    return {
      prompt: fill(params.template, { ...c, points }), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, 2 * answer],
      working: `${tips} tips are joined by ${points} branch points. Each can be drawn either way round, independently: 2 multiplied by itself ${points} times = ${show(answer)} ${params.unit}, all showing the same tree.`,
    };
  },
  /** Share of a variant after one round of selection: carriers survive at rate a, others at rate b. */
  afterSelection(params, n) {
    const c = pick(params, n);
    const p = num(c.percent, 'percent') / 100, a = num(c.keepA, 'keepA') / 100, b = num(c.keepB, 'keepB') / 100;
    if (p <= 0 || p >= 1 || a <= 0 || b <= 0 || a > 1 || b > 1) throw new Error('afterSelection needs shares between 0 and 100');
    const digits = params.digits ?? 0;
    const carriers = p * a, others = (1 - p) * b;
    const answer = (100 * carriers) / (carriers + others);
    const per100 = (x: number) => show(100 * x, 1);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 100],
      working: `Out of every 100 before, ${per100(carriers)} carriers and ${per100(others)} others survive. ${per100(carriers)} ÷ ${show(100 * (carriers + others), 1)} = ${show(answer, digits)}%. The variant went from ${show(100 * p)}% to ${show(answer, digits)}% in one generation, and no individual changed.`,
    };
  },
  /** A new neutral mutation is 1 of the population's 2N gene copies, so it takes over in 1 of every 2N tries. */
  newMutationFix(params, n) {
    const c = pick(params, n);
    const animals = num(c.animals, 'animals'), tries = num(c.tries, 'tries');
    if (!Number.isInteger(animals) || animals < 1) throw new Error('newMutationFix needs a whole number of animals');
    const copies = 2 * animals;
    const answer = tries / copies;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, tries],
      working: `${show(animals)} animals carry ${show(copies)} copies of the gene, and the new mutation is 1 of them. Each copy has the same chance of becoming the ancestor of every later copy: 1 in ${show(copies)}. ${show(tries)} ÷ ${show(copies)} = ${show(answer)} ${params.unit}.`,
    };
  },
  /** A mutant born in round `arose` of a culture dividing in step for `total` rounds: its family
   * doubles once per later round, 2^(total − arose) cells. Early mutants make jackpots. */
  jackpotSize(params, n) {
    const c = pick(params, n);
    const total = num(c.total, 'total'), arose = num(c.arose, 'arose');
    if (!Number.isInteger(total) || !Number.isInteger(arose) || arose < 1 || arose >= total) throw new Error('jackpotSize needs whole rounds, 1 ≤ arose < total');
    const answer = 2 ** (total - arose);
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, 2 * answer],
      working: `The mutant’s family doubles in each of the ${total - arose} rounds after round ${arose}: 2 multiplied by itself ${total - arose} times = ${show(answer)} ${params.unit}.`,
    };
  },
  /** Earth's history squeezed into one day: (from − to) million years ÷ the age of the Earth × 1,440 minutes. */
  dayClock(params, n) {
    const c = pick(params, n);
    const from = num(c.from, 'from'), to = num(c.to ?? 0, 'to'), earth = num(c.earth, 'earth');
    if (from <= to || from > earth) throw new Error('dayClock needs from > to, inside the age of the Earth');
    const digits = params.digits ?? 0;
    const answer = ((from - to) / earth) * 1440;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 1440],
      working: `A day has 1,440 minutes. ${show(from - to, 1)} million years ÷ ${show(earth)} million years × 1,440 = ${show(answer, digits)} ${params.unit}.`,
    };
  },
  /** Years recorded by yearly layers: thickness ÷ thickness laid down each year. */
  layerYears(params, n) {
    const c = pick(params, n);
    const cm = num(c.cm, 'cm'), mm = num(c.mm, 'mm');
    if (cm <= 0 || mm <= 0) throw new Error('layerYears needs positive thicknesses');
    const answer = (cm * 10) / mm;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, 2 * answer],
      working: `${show(cm, 1)} cm = ${show(cm * 10)} mm. ${show(cm * 10)} mm ÷ ${show(mm, 2)} mm a year = ${show(answer)} ${params.unit}.`,
    };
  },
  /** Expected offspring showing a trait from a one-gene cross: n × (its quarters ÷ 4), with the
   * quarters computed by sims/cross.ts from `locus`, `parents` and `trait` in the params. */
  crossCount(params, n) {
    const c = pick(params, n);
    const total = num(c.n, 'n');
    const p = params as unknown as Params & { locus: Locus; parents: [string, string]; trait: string };
    const quarters = expected(p.parents[0], p.parents[1], p.locus)[p.trait] ?? 0;
    if (!quarters) throw new Error(`crossCount: ${p.parents.join(' × ')} never gives ${p.trait}`);
    const answer = (total * quarters) / 4;
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits: 0,
      tolerance: band(answer, params.tolerance, 0), plausible: [0, total],
      working: `Each parent passes on one of its two copies at random, so ${quarters} in every 4 offspring show it. ${show(total)} × ${quarters}/4 = ${show(answer)} ${params.unit}.`,
    };
  },
  /** Share of a radioactive isotope left after whole half-lives: 100 ÷ 2^(age ÷ half-life). */
  fractionLeft(params, n) {
    const c = pick(params, n);
    const age = num(c.age, 'age'), half = num(c.halfLife, 'halfLife');
    const halvings = age / half;
    if (!Number.isInteger(halvings) || halvings < 1) throw new Error('fractionLeft needs a whole number of half-lives');
    const digits = params.digits ?? 2;
    const answer = 100 / 2 ** halvings;
    const chain = Array.from({ length: halvings + 1 }, (_, k) => `${show(100 / 2 ** k, 2)}%`).join(' → ');
    return {
      prompt: fill(params.template, c), answer, unit: params.unit, digits,
      tolerance: band(answer, params.tolerance, digits), plausible: [0, 100],
      working: `${show(age)} ÷ ${show(half)} = ${halvings} half-lives. ${chain}.`,
    };
  },
};

/** Expedition generators reused for items in an expedition's own family (`expedition:<name>`). */
function fromExpedition(name: string, params: Record<string, unknown>, n: number): CheckVariant {
  const v = makeVariant(name, params, n);
  return {
    prompt: [v.prompt, v.ask, v.aside].filter(Boolean).join(' '),
    answer: v.answer, unit: v.unit, digits: v.digits,
    tolerance: band(v.answer, v.tolerance, v.digits), plausible: [0, 2 * v.answer],
    working: v.working,
  };
}

export function checkVariant(item: NumberItem, n: number): CheckVariant {
  if (item.generator.startsWith('expedition:')) return fromExpedition(item.generator.slice('expedition:'.length), item.params, n);
  const make = generators[item.generator];
  if (!make) throw new Error(`Unknown check generator ${item.generator}`);
  return make(item.params as unknown as Params, n);
}

/** How many distinct variants the item's cases give. */
export function variantCount(item: NumberItem): number {
  if (item.generator.startsWith('expedition:')) {
    const p = item.params as Record<string, unknown[]>;
    const lists = Object.values(p).filter(Array.isArray) as unknown[][];
    return Math.max(1, ...lists.map(list => list.length));
  }
  return Math.max(1, (item.params as unknown as Params).cases?.length ?? 1);
}

export function isRightNumber(value: number, variant: CheckVariant): boolean {
  return Number.isFinite(value) && Math.abs(value - variant.answer) <= variant.tolerance + 1e-9;
}

/** Every number written in a piece of text, with thousands separators read correctly. */
export function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(match => Number(match[0].replace(/,/g, ''))).filter(Number.isFinite);
}
