// Numeric questions are generated, not authored. The pack names a generator
// and its parameters; code computes the answer, so a model never does arithmetic
// and a learner can always get a question they have not seen.
import { expected, type Locus } from '../sims/cross';
import { replicateRuns, tally } from '../sims/drift';
import { read } from '../sims/sequence';

export interface Variant {
  key: string;
  prompt: string;
  ask: string;
  answer: number;
  digits: number;
  unit: string;
  tolerance: number;
  hint: string;
  aside?: string;
  working: string;
  figure?: { kind: 'drop'; seconds: number; surface: 'earth' | 'moon' } | { kind: 'string'; total: number; frets: boolean }
    | { kind: 'growth'; doublings: number; minutes: number }
    | { kind: 'decay'; halvings: number; halfLife: number; unit: string }
    | { kind: 'ponds'; total: number; expected: number; run: number }
    | { kind: 'apart'; split: number; a: string; b: string; unit: string };
}

type Scenario = { place: string; g: number; prompt: string; ask: string };

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 3 });
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);

const generators: Record<string, (params: Record<string, unknown>, n: number) => Variant> = {
  fallDistance(params, n) {
    const scenarios = params.scenarios as Scenario[];
    const seconds = params.seconds as number[];
    // First question is the plain Earth case; fresh ones cycle place and time.
    const scenario = n === 0 ? scenarios[0] : scenarios[n % scenarios.length];
    const t = seconds[n % seconds.length];
    const half = scenario.g / 2;
    const answer = half * t * t;
    return {
      key: `${scenario.place}-${t}`,
      prompt: scenario.prompt.replace('{t}', String(t)),
      ask: scenario.ask,
      answer,
      digits: 1,
      unit: String(params.unit),
      tolerance: Number(params.tolerance),
      hint: String(params.hint),
      aside: params.aside ? String(params.aside) : undefined,
      working: `½ × ${scenario.g} × ${t} × ${t} = ${round(answer, 1)} ${params.unit}`,
      figure: { kind: 'drop', seconds: t, surface: scenario.place === 'moon' ? 'moon' : 'earth' },
    };
  },
  stringLength(params, n) {
    // Instrument-specific remarks (frets and the like) live in the pack, keyed by interval ratio.
    const instruments = params.instruments as { name: string; mm: number; frets?: boolean; notes?: Record<string, string> }[];
    const intervals = params.intervals as { name: string; n: number; d: number }[];
    const instrument = instruments[n % instruments.length];
    const interval = intervals[(n + Math.floor(n / instruments.length)) % intervals.length];
    const answer = instrument.mm * interval.n / interval.d;
    const note = instrument.notes?.[`${interval.n}/${interval.d}`];
    return {
      key: `${instrument.name}-${interval.name}`,
      prompt: `A ${instrument.name}’s open string vibrates along ${instrument.mm} mm.`,
      ask: `To play ${interval.name} higher, how long must the vibrating part be?`,
      answer,
      digits: 0,
      unit: String(params.unit),
      tolerance: Number(params.tolerance),
      hint: String(params.hint),
      working: `${instrument.mm} × ${interval.n}/${interval.d} = ${Math.round(answer)} mm.${note ? ` ${note}` : ''}`,
      figure: { kind: 'string', total: instrument.mm, frets: !!instrument.frets },
    };
  },
  doubling(params, n) {
    // Whole doublings only, so the answer is an exact power of two the learner can reach by hand.
    const cases = params.cases as { minutes: number; hours: number }[];
    const c = cases[n % cases.length];
    const doublings = Math.round((c.hours * 60) / c.minutes);
    const answer = 2 ** doublings;
    const fill = (t: string) => t.replace('{minutes}', String(c.minutes)).replace('{hours}', String(c.hours));
    return {
      key: `${c.minutes}-${c.hours}`,
      prompt: fill(String(params.prompt)),
      ask: fill(String(params.ask)),
      answer,
      digits: 0,
      unit: String(params.unit),
      tolerance: Number(params.tolerance),
      hint: fill(String(params.hint)),
      aside: params.aside ? fill(String(params.aside)) : undefined,
      working: `${c.hours} h ÷ ${c.minutes} min = ${doublings} doublings. 1 cell doubled ${doublings} times = ${answer.toLocaleString("en-US")} cells.`,
      figure: { kind: 'growth', doublings, minutes: c.minutes },
    };
  },
  apartTime(params, n) {
    // Two living groups that split `split` units ago have each evolved on their own for all of it,
    // so the time separating them, counted along both lines, is twice the split.
    // A case may carry its own prompt, when its date needs its own wording (a fossil minimum, say).
    const cases = params.cases as { a: string; b: string; split: number; prompt?: string }[];
    const c = cases[n % cases.length];
    const fill = (t: string) => t.replaceAll('{a}', c.a).replaceAll('{b}', c.b).replaceAll('{split}', String(c.split));
    return {
      key: `${c.a}-${c.b}`,
      prompt: fill(c.prompt ?? String(params.prompt)),
      ask: fill(String(params.ask)),
      answer: 2 * c.split,
      digits: 0,
      unit: String(params.unit),
      tolerance: Number(params.tolerance),
      hint: fill(String(params.hint)),
      aside: params.aside ? fill(String(params.aside)) : undefined,
      working: `${c.split} along the ${c.a.toLowerCase()} line + ${c.split} along the ${c.b.toLowerCase()} line = ${2 * c.split} ${params.unit}.`,
      figure: { kind: 'apart', split: c.split, a: c.a, b: c.b, unit: String(params.figureUnit ?? params.unit) },
    };
  },
};

// Radiometric dating with whole half-lives, so the arithmetic can be done by hand:
// a fraction 1/2^k of the parent isotope left means k half-lives have passed.
type DecayCase = { isotope: string; halfLife: number; unit: string; denominator: number; sample: string; digits?: number };
const decay = (params: Record<string, unknown>, n: number): Variant => {
  const cases = params.cases as DecayCase[];
  const c = cases[n % cases.length];
  const halvings = Math.round(Math.log2(c.denominator));
  if (2 ** halvings !== c.denominator) throw new Error(`halfLife needs a power-of-two fraction, not 1/${c.denominator}`);
  const answer = halvings * c.halfLife;
  const digits = c.digits ?? 0;
  const values = { isotope: c.isotope, halfLife: `${fmt(c.halfLife)} ${c.unit}`, fraction: `1/${c.denominator}`, sample: c.sample };
  const chain = Array.from({ length: halvings + 1 }, (_, k) => (k === 0 ? '1' : `1/${2 ** k}`)).join(' → ');
  return {
    key: `${c.isotope}-${c.denominator}`,
    // An isotope name may open the sentence: "carbon-14 breaks down" becomes "Carbon-14 breaks down".
    prompt: fill(String(params.prompt), values).replace(/^./, ch => ch.toUpperCase()),
    ask: fill(String(params.ask), values),
    answer,
    digits,
    unit: c.unit,
    tolerance: Number(params.tolerance),
    hint: fill(String(params.hint), values),
    aside: params.aside ? fill(String(params.aside), values) : undefined,
    working: `${chain}: ${halvings} half-lives. ${halvings} × ${fmt(c.halfLife)} ${c.unit} = ${fmt(round(answer, digits))} ${c.unit}.`,
    figure: { kind: 'decay', halvings, halfLife: c.halfLife, unit: c.unit },
  };
};

// Genetic drift: a neutral variant ends up in every copy with probability equal to its
// starting share, so the expected number of populations where it takes over is share × count.
// The figure also shows one seeded run of the Wright–Fisher model, so the spread is visible.
type FixCase = { percent: number; populations: number; place: string };
const fixation = (params: Record<string, unknown>, n: number): Variant => {
  const cases = params.cases as FixCase[];
  const c = cases[n % cases.length];
  const answer = (c.percent / 100) * c.populations;
  const run = tally(replicateRuns({ N: Number(params.N), p0: c.percent / 100, generations: Number(params.generations), replicates: c.populations, seed: `fixation:${c.percent}:${c.populations}` })).fixed;
  const values = { percent: String(c.percent), populations: String(c.populations), place: c.place };
  return {
    key: `${c.percent}-${c.populations}`,
    prompt: fill(String(params.prompt), values),
    ask: fill(String(params.ask), values),
    answer,
    digits: 0,
    unit: c.place,
    // Within the absolute margin the pack sets, whatever the size of the answer.
    tolerance: Number(params.margin) / answer,
    hint: fill(String(params.hint), values),
    aside: params.aside ? fill(String(params.aside), values) : undefined,
    working: fill(String(params.working), { ...values, answer: fmt(answer), run: String(run) }),
    figure: { kind: 'ponds', total: c.populations, expected: answer, run },
  };
};
// Any one-gene cross: the expected number of offspring showing a trait, out of n. The share is
// computed by sims/cross.ts from the parents' genotypes, so a pack never types a ratio.
type CrossCase = { n: number };
const crossCount = (params: Record<string, unknown>, n: number): Variant => {
  const cases = params.cases as CrossCase[];
  const c = cases[n % cases.length];
  const locus = params.locus as Locus, [p1, p2] = params.parents as [string, string], trait = String(params.trait);
  const quarters = expected(p1, p2, locus)[trait] ?? 0;
  const answer = (c.n * quarters) / 4;
  const values = { n: fmt(c.n) };
  return {
    key: `${p1}-${p2}-${trait}-${c.n}`,
    prompt: fill(String(params.prompt), values),
    ask: fill(String(params.ask), values),
    answer,
    digits: 0,
    unit: String(params.unit),
    tolerance: Number(params.tolerance),
    hint: fill(String(params.hint), values),
    aside: params.aside ? fill(String(params.aside), values) : undefined,
    // `cross` names the parents in words ("two pink plants"); genotype letters are the fallback.
    // `shows` says what the counted offspring do, when "show it" doesn't fit ("share neither copy").
    // Half and all are said in words: "2 in every 4 offspring" reads as a puzzle. The sum then says
    // the same thing ("80 ÷ 2"), not "80 × 2/4" under a line that says half.
    working: `${quarters === 4 ? 'All the offspring' : quarters === 2 ? 'Half the offspring' : `${quarters} in every 4 offspring`} of ${params.cross ? String(params.cross) : `${p1} × ${p2}`} ${params.shows ? String(params.shows) : 'show it'}. ${quarters === 4 ? `All ${fmt(c.n)} ${params.unit}.` : quarters === 2 ? `${fmt(c.n)} ÷ 2 = ${fmt(answer)} ${params.unit}.` : `${fmt(c.n)} × ${quarters}/4 = ${fmt(answer)} ${params.unit}.`}`,
  };
};
// The genetic code reads three letters for each amino acid, and the stop codon adds none: a gene's
// letters from the start codon through the stop codon make letters ÷ 3 − 1 amino acids, and a chain
// of n amino acids needs 3 × (n + 1) letters. A case gives `letters` (asks for amino acids),
// `residues` (asks for letters), or the letters themselves as `rna`, read by sims/sequence.ts.
type ChainCase = { letters?: number; residues?: number; rna?: string; name?: string };
const chainLength = (params: Record<string, unknown>, n: number): Variant => {
  const cases = params.cases as ChainCase[];
  const c = cases[n % cases.length];
  let answer: number, working: string, letters: number, residues: number;
  if (c.rna) {
    const r = read(c.rna);
    if (r.start < 0 || !r.stop) throw new Error(`chainLength: "${c.rna}" needs a start and a stop codon`);
    letters = r.words.length * 3;
    residues = answer = r.chain.length;
    working = `Reading from AUG: ${r.words.map(w => w.word).join(' ')}. ${r.words.length} codons, and the last is the stop, which adds no amino acid: ${answer}.`;
  } else if (c.residues !== undefined) {
    residues = Number(c.residues);
    if (!Number.isInteger(residues) || residues < 1) throw new Error(`chainLength: ${c.residues} is not a whole chain`);
    letters = answer = 3 * (residues + 1);
    working = `${fmt(residues)} amino acids need ${fmt(residues)} codons, and one more codon, the stop, ends the chain: ${fmt(residues + 1)} × 3 = ${fmt(answer)} letters.`;
  } else {
    letters = Number(c.letters);
    if (!Number.isInteger(letters) || letters < 6 || letters % 3) throw new Error(`chainLength: ${c.letters} letters is not a whole number of codons`);
    residues = answer = letters / 3 - 1;
    working = `${fmt(letters)} ÷ 3 = ${fmt(letters / 3)} codons. The last is the stop codon, which adds no amino acid: ${fmt(answer)}.`;
  }
  const values = { letters: fmt(letters), residues: fmt(residues), rna: c.rna ?? '', name: c.name ?? '' };
  const unit = c.residues !== undefined ? String(params.letterUnit ?? 'letters') : String(params.unit);
  return {
    key: `${c.name ?? ''}-${c.rna ?? (c.residues !== undefined ? `r${residues}` : letters)}`,
    prompt: fill(String(params.prompt), values),
    ask: fill(String(params.ask), values),
    answer,
    digits: 0,
    unit,
    tolerance: Number(params.tolerance),
    hint: fill(String(params.hint), values),
    aside: params.aside ? fill(String(params.aside), values) : undefined,
    working,
  };
};
generators.crossCount = crossCount;
generators.halfLife = decay;
generators.fixation = fixation;
generators.chainLength = chainLength;

// Base pairing: in double-stranded DNA every A faces a T and every C a G, so one letter's share
// fixes all four. The letter asked for is always from the other pair, so the prompt never prints it.
type PairCase = { given: string; percent: number; asked: string };
const PARTNER: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
const pairShare = (params: Record<string, unknown>, n: number): Variant => {
  const cases = params.cases as PairCase[];
  const c = cases[n % cases.length];
  const partner = PARTNER[c.given];
  if (!partner || !PARTNER[c.asked]) throw new Error('pairShare: the letters are A, T, C and G');
  if (c.asked === c.given || c.asked === partner) throw new Error('pairShare: ask for a letter of the other pair');
  if (!(c.percent > 0 && c.percent < 50 && c.percent !== 25)) throw new Error('pairShare: the given share must lie between 0 and 50%, and not be 25%');
  const answer = (100 - 2 * c.percent) / 2;
  const values = { given: c.given, percent: fmt(c.percent), asked: c.asked };
  return {
    key: `${c.given}-${c.percent}-${c.asked}`,
    prompt: fill(String(params.prompt), values),
    ask: fill(String(params.ask), values),
    answer,
    digits: 1,
    unit: String(params.unit),
    tolerance: Number(params.tolerance),
    hint: fill(String(params.hint), values),
    aside: params.aside ? fill(String(params.aside), values) : undefined,
    working: `${c.given} pairs with ${partner}, so ${partner} is ${fmt(c.percent)}% too: ${fmt(2 * c.percent)}% together. The other pair shares the remaining ${fmt(100 - 2 * c.percent)}% equally: ${fmt(answer)}% each.`,
  };
};
generators.pairShare = pairShare;

export function makeVariant(generator: string, params: Record<string, unknown>, n: number): Variant {
  const make = generators[generator];
  if (!make) throw new Error(`Unknown generator ${generator}`);
  return make(params, n);
}

export function isClose(value: number, variant: Variant): boolean {
  return Math.abs(value - variant.answer) <= Math.max(variant.answer * variant.tolerance, 0.5 * 10 ** -variant.digits);
}
