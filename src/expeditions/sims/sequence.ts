// The sequence engine: strings of letters paired, read in words, compared and changed.
//
// One set of pure functions for any idea built on letter strings. Genetics is the first user
// (DNA pairs with DNA, a gene is copied into RNA, RNA is read three letters at a time by the
// genetic code), but nothing below is specific to it: a pairing rule is any letter-for-letter
// substitution (a cipher), a word code is any fixed-size table (a telegraph or binary code), and
// comparison counts differences between any strings (two genomes, two manuscripts, two passwords).
//
// Conventions: positions in data are 1-based letter numbers, as a reader counts them ("letter 20");
// arrays inside are 0-based. Nucleic-acid strings are written 5′ to 3′, except that a template
// strand is written under its partner, letter for letter, so it reads 3′ to 5′ and pairs in place.
//
// Pure: no React, so the sim, the case engine, validators, tests and Node scripts import it.

import type { Choice } from '../content/types';

// ---------------------------------------------------------------- letters and pairing

export type NucleicKind = 'dna' | 'rna';
export const BASES: Record<NucleicKind, string> = { dna: 'ACGT', rna: 'ACGU' };

/** A pairing rule: each letter, and the letter set against it. */
export type PairRule = Readonly<Record<string, string>>;
export const PAIRS = {
  /** A DNA strand and its partner strand. */
  dna: { A: 'T', T: 'A', C: 'G', G: 'C' },
  /** A template DNA strand and the RNA built against it. */
  transcribe: { A: 'U', T: 'A', C: 'G', G: 'C' },
  /** RNA against RNA (a codon and an anticodon). */
  rna: { A: 'U', U: 'A', C: 'G', G: 'C' },
} as const satisfies Record<string, PairRule>;

/** Letters outside `alphabet`, as a list of problems (empty when the string is clean). */
export function badLetters(letters: string, alphabet: string): string[] {
  const bad = [...new Set([...letters].filter(ch => !alphabet.includes(ch)))];
  return bad.length ? [`letters ${bad.map(b => `"${b}"`).join(', ')} are not in ${alphabet}`] : [];
}

/** Pair every letter by the rule, in place. Throws on a letter the rule doesn't know. */
export function pairWith(letters: string, rule: PairRule): string {
  return [...letters].map((ch, i) => {
    const partner = rule[ch];
    if (partner === undefined) throw new Error(`letter ${i + 1} ("${ch}") has no partner under this rule`);
    return partner;
  }).join('');
}

export const reverse = (letters: string) => [...letters].reverse().join('');
/** The partner strand read 5′ to 3′: what a genome browser shows for "the other strand". */
export const reverseComplement = (dna: string) => reverse(pairWith(dna, PAIRS.dna));

/** The RNA copy of a gene. From the coding strand it is the same letters with U for T; from the
 * template strand (written under the coding strand) every letter is paired. */
export function transcribe(dna: string, strand: 'coding' | 'template' = 'coding'): string {
  if (badLetters(dna, BASES.dna).length) throw new Error(badLetters(dna, BASES.dna)[0]);
  return strand === 'coding' ? dna.replaceAll('T', 'U') : pairWith(dna, PAIRS.transcribe);
}

// ---------------------------------------------------------------- word codes

/** A code that reads fixed-size words: the genetic code, or any other. */
export interface WordCode {
  /** Letters per word (3 for the genetic code). */
  size: number;
  /** Word → symbol. */
  table: Readonly<Record<string, string>>;
  /** Words where reading begins when it starts at "the first start". */
  starts: readonly string[];
  /** The symbol that ends reading. */
  stop: string;
  /** Rewrites letters into the table's alphabet before reading (DNA's T as RNA's U). */
  normalise?: (letters: string) => string;
}

// NCBI translation table 1, with the bases in the order U, C, A, G at each of the three places.
const ORDER = 'UCAG';
const TABLE_1 = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
/** The standard genetic code: all 64 codons, written in RNA letters. `*` is stop. */
export const STANDARD_CODE: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  [...TABLE_1].map((symbol, i) => [ORDER[i >> 4] + ORDER[(i >> 2) & 3] + ORDER[i & 3], symbol])));

export const GENETIC_CODE: WordCode = {
  size: 3, table: STANDARD_CODE, starts: ['AUG'], stop: '*',
  normalise: letters => letters.toUpperCase().replaceAll('T', 'U'),
};

/** The 20 amino acids by one-letter code, plus stop. */
export const AMINO: Readonly<Record<string, { three: string; name: string }>> = {
  A: { three: 'Ala', name: 'alanine' }, R: { three: 'Arg', name: 'arginine' }, N: { three: 'Asn', name: 'asparagine' },
  D: { three: 'Asp', name: 'aspartic acid' }, C: { three: 'Cys', name: 'cysteine' }, Q: { three: 'Gln', name: 'glutamine' },
  E: { three: 'Glu', name: 'glutamic acid' }, G: { three: 'Gly', name: 'glycine' }, H: { three: 'His', name: 'histidine' },
  I: { three: 'Ile', name: 'isoleucine' }, L: { three: 'Leu', name: 'leucine' }, K: { three: 'Lys', name: 'lysine' },
  M: { three: 'Met', name: 'methionine' }, F: { three: 'Phe', name: 'phenylalanine' }, P: { three: 'Pro', name: 'proline' },
  S: { three: 'Ser', name: 'serine' }, T: { three: 'Thr', name: 'threonine' }, W: { three: 'Trp', name: 'tryptophan' },
  Y: { three: 'Tyr', name: 'tyrosine' }, V: { three: 'Val', name: 'valine' }, '*': { three: 'Stop', name: 'stop' },
};
/** "Met", "Stop", or the symbol itself for a code with no names. */
export const symbolShort = (symbol: string) => AMINO[symbol]?.three ?? symbol;
/** A chain as three-letter names: "Met–Ala–Ser". */
export const chainWords = (chain: string) => [...chain].map(symbolShort).join('–');

/** Every word that gives `symbol`, in table order. */
export const wordsFor = (symbol: string, code: WordCode = GENETIC_CODE) => Object.keys(code.table).filter(w => code.table[w] === symbol);

export interface Word { /** 0-based index of the word's first letter. */ at: number; word: string; symbol: string }
export interface Reading {
  /** 0-based index where reading began, or -1 when no start word was found. */
  start: number;
  /** Every word read, in order, the stop word included. */
  words: Word[];
  /** The symbols read before the stop: for the genetic code, the amino-acid chain. */
  chain: string;
  /** The stop word, or null when the letters ran out first. */
  stop: Word | null;
}

export type ReadFrom = 'start' | number;

/** Read letters a word at a time. `from: 'start'` begins at the first start word; a number begins at
 * that letter (1-based). Reading ends at the first stop (kept as `stop`) or when fewer letters than
 * a word remain. `throughStops` keeps reading past stops (to show every frame). A word missing from
 * the table reads as "?". */
export function read(letters: string, opts: { from?: ReadFrom; code?: WordCode; throughStops?: boolean } = {}): Reading {
  const code = opts.code ?? GENETIC_CODE;
  const s = code.normalise ? code.normalise(letters) : letters;
  const from = opts.from ?? 'start';
  const start = from === 'start' ? findStart(s, code) : from - 1;
  const out: Reading = { start, words: [], chain: '', stop: null };
  if (start < 0) return out;
  for (let i = start; i + code.size <= s.length; i += code.size) {
    const word = s.slice(i, i + code.size);
    const symbol = code.table[word] ?? '?';
    out.words.push({ at: i, word, symbol });
    if (symbol === code.stop && !opts.throughStops) { out.stop = { at: i, word, symbol }; break; }
    out.chain += symbol;
  }
  return out;
}

/** 0-based index of the first start word, or -1. Every letter is a possible beginning. */
export function findStart(letters: string, code: WordCode = GENETIC_CODE): number {
  const s = code.normalise ? code.normalise(letters) : letters;
  for (let i = 0; i + code.size <= s.length; i++) if (code.starts.includes(s.slice(i, i + code.size))) return i;
  return -1;
}

/** The three ways to cut a string into words, read through stops. */
export const frames = (letters: string, code: WordCode = GENETIC_CODE): Reading[] =>
  Array.from({ length: code.size }, (_, k) => read(letters, { from: k + 1, code, throughStops: true }));

// ---------------------------------------------------------------- changes

/** One change to a string. `at` is a 1-based letter number; an insertion goes before letter `at`
 * (one past the end appends). */
export type Change =
  | { kind: 'sub'; at: number; to: string }
  | { kind: 'ins'; at: number; letters: string }
  | { kind: 'del'; at: number; count: number };

/** Where a change falls, 0-based: letters [from, from + removed) go, `added` arrive at `from`. */
export function changeSpan(c: Change): { from: number; removed: number; added: number } {
  if (c.kind === 'sub') return { from: c.at - 1, removed: 1, added: 1 };
  if (c.kind === 'ins') return { from: c.at - 1, removed: 0, added: c.letters.length };
  return { from: c.at - 1, removed: c.count, added: 0 };
}

export function changeProblems(letters: string, c: Change, alphabet: string): string[] {
  const out: string[] = [];
  const n = letters.length;
  if (!Number.isInteger(c.at) || c.at < 1) return [`a change at letter ${c.at} is not a letter number`];
  if (c.kind === 'sub') {
    if (c.at > n) out.push(`letter ${c.at} is past the end (${n} letters)`);
    else if (c.to.length !== 1 || !alphabet.includes(c.to)) out.push(`a substitution puts in one letter of ${alphabet}, not "${c.to}"`);
    else if (letters[c.at - 1] === c.to) out.push(`letter ${c.at} is already ${c.to}: nothing changes`);
  }
  if (c.kind === 'ins') {
    if (c.at > n + 1) out.push(`an insertion before letter ${c.at} is past the end`);
    if (!c.letters.length) out.push('an insertion needs at least one letter');
    out.push(...badLetters(c.letters, alphabet));
  }
  if (c.kind === 'del' && (!Number.isInteger(c.count) || c.count < 1 || c.at + c.count - 1 > n)) out.push(`deleting ${c.count} from letter ${c.at} runs past the end`);
  return out;
}

export function applyChange(letters: string, c: Change): string {
  const { from, removed } = changeSpan(c);
  const put = c.kind === 'sub' ? c.to : c.kind === 'ins' ? c.letters : '';
  return letters.slice(0, from) + put + letters.slice(from + removed);
}

/** What a change does to the chain a string is read into. */
export type Effect = 'silent' | 'missense' | 'nonsense' | 'stop-lost' | 'start-lost' | 'frameshift' | 'in-frame' | 'outside';
export const EFFECTS: readonly Effect[] = ['silent', 'missense', 'nonsense', 'stop-lost', 'start-lost', 'frameshift', 'in-frame', 'outside'];
/** Each effect in plain words, as an option or a readout says it. */
export const EFFECT_WORDS: Readonly<Record<Effect, string>> = {
  silent: 'The chain stays the same',
  missense: 'One amino acid is swapped',
  nonsense: 'The chain stops early',
  'stop-lost': 'The chain runs on past its usual end',
  'start-lost': 'The start is lost',
  frameshift: 'Everything after it is read wrong',
  'in-frame': 'Amino acids are added or lost; the rest stay the same',
  outside: 'Nothing: it lies outside the part that is read',
};

export interface EffectReport {
  effect: Effect;
  before: Reading;
  after: Reading;
  /** The changed letters, and where reading begins in them. */
  letters: string;
  /** 1-based number of the first chain position that differs; 0 when none does. */
  firstChange: number;
  /** A frameshift whose very first shifted word is a stop: it reads as early-stop too. */
  stopsAtOnce: boolean;
}

/** Read the letters before and after a change and name what changed in the chain. */
export function effectOf(letters: string, c: Change, opts: { from?: ReadFrom; code?: WordCode } = {}): EffectReport {
  const code = opts.code ?? GENETIC_CODE;
  const from = opts.from ?? 'start';
  const before = read(letters, { from, code });
  if (before.start < 0) throw new Error('no start word: nothing is read');
  const changed = applyChange(letters, c);
  const { from: at, removed, added } = changeSpan(c);
  const net = added - removed;
  const size = code.size;
  const start = before.start;
  const end = before.stop ? before.stop.at + size : start + before.words.length * size;
  // Reading begins at the same letter, moved along if letters were added or lost ahead of it.
  const upstream = c.kind === 'ins' ? at <= start : at + removed <= start;
  const shiftedStart = upstream ? start + net : start;
  const after = read(changed, { from: shiftedStart + 1, code });
  const report = (effect: Effect, stopsAtOnce = false): EffectReport => ({ effect, before, after, letters: changed, firstChange: firstDifference(before.chain, after.chain), stopsAtOnce });

  if (upstream) return report('outside');
  if (at >= end) return report('outside');
  const startWord = (code.normalise ? code.normalise(changed) : changed).slice(shiftedStart, shiftedStart + size);
  if (at < start + size && !code.starts.includes(startWord)) return report('start-lost');

  if (c.kind === 'sub') {
    const k = Math.floor((at - start) / size);
    const old = before.words[k].symbol, now = after.words[k]?.symbol;
    if (now === old) return report('silent');
    if (old === code.stop) return report('stop-lost');
    if (now === code.stop) return report('nonsense');
    return report('missense');
  }
  if (net % size !== 0) {
    const k = Math.floor((at - start) / size);
    return report('frameshift', after.words[k]?.symbol === code.stop);
  }
  // In frame: words are added or lost whole, so the chain should change length by exactly that many.
  // Shorter means a stop was made at the join; longer means the stop was taken away.
  const expected = before.chain.length + net / size;
  if (after.chain.length < expected) return report('nonsense');
  if (after.chain.length > expected) return report('stop-lost');
  return report('in-frame');
}

const firstDifference = (a: string, b: string) => {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i + 1;
  return 0;
};

/** Every single-letter substitution inside the read part, sorted by what it does. Exact, no
 * sampling: the share of silent changes is a property of the letters and the code. */
export function substitutionSpectrum(letters: string, alphabet: string, opts: { from?: ReadFrom; code?: WordCode } = {}): Record<Effect, number> {
  const out = Object.fromEntries(EFFECTS.map(e => [e, 0])) as Record<Effect, number>;
  const before = read(letters, opts);
  if (before.start < 0) return out;
  const size = (opts.code ?? GENETIC_CODE).size;
  const end = before.stop ? before.stop.at + size : before.start + before.words.length * size;
  for (let i = before.start; i < end; i++) for (const to of alphabet) {
    if (to === letters[i]) continue;
    out[effectOf(letters, { kind: 'sub', at: i + 1, to }, opts).effect]++;
  }
  return out;
}

// ---------------------------------------------------------------- comparing

/** 0-based positions where two strings differ, compared letter by letter from the left. Letters
 * past the end of the shorter one all count. */
export function differences(a: string, b: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

/** Fewest single-letter substitutions, insertions and deletions turning `a` into `b`. */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** The two strings lined up with gaps ("-") so matching letters sit together, at the edit distance.
 * Ties prefer a substitution, then a gap in `b`, so the result is the same every time. */
export function align(a: string, b: string): { a: string; b: string } {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  let i = a.length, j = b.length, outA = '', outB = '';
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { outA = a[--i] + outA; outB = b[--j] + outB; }
    else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { outA = a[--i] + outA; outB = '-' + outB; }
    else { outA = '-' + outA; outB = b[--j] + outB; }
  }
  return { a: outA, b: outB };
}

export type CompareBy = 'position' | 'edits';
export const distance = (a: string, b: string, by: CompareBy) => by === 'position' ? differences(a, b).length : editDistance(a, b);

/** A string's label is written as it reads mid-sentence ("golden jackal", "Canada lynx"); where it
 * starts a sentence or stands alone, only a leading a–z is raised, so "β-globin" keeps its Greek. */
export const capFirst = (label: string) => label.replace(/^[a-z]/, c => c.toUpperCase());

export interface Named { id: string; label: string; letters: string }
/** Pair key for two named strings, in the order given. */
export const pairKey = (a: string, b: string) => `${a}|${b}`;

/** Every pair's distance, and the pairs that differ least. */
export function closest(seqs: readonly Named[], by: CompareBy): { table: { a: string; b: string; d: number }[]; least: string[]; d: number } {
  const table: { a: string; b: string; d: number }[] = [];
  for (let i = 0; i < seqs.length; i++) for (let j = i + 1; j < seqs.length; j++) table.push({ a: seqs[i].id, b: seqs[j].id, d: distance(seqs[i].letters, seqs[j].letters, by) });
  const d = Math.min(...table.map(t => t.d));
  return { table, d, least: table.filter(t => t.d === d).map(t => pairKey(t.a, t.b)) };
}

// ---------------------------------------------------------------- the lab: one step, one call

/** What a lab step does when the learner runs it. */
export type LabOp =
  | { do: 'transcribe'; strand: 'coding' | 'template' }
  | { do: 'translate'; from: ReadFrom }
  | { do: 'change'; from: ReadFrom; change: Change }
  | { do: 'compare'; /** ID of the step's own letters. */ first: string; with: Named[]; by: CompareBy; /** Letters per group on screen (10 for genomes, 3 for codons). */ group?: number };

/** What the step's question asks, so its key can be recomputed:
 *  rna         – the RNA made (choice IDs are RNA strings);
 *  chain       – the chain read (IDs are one-letter chains, "MKV");
 *  length      – how many amino acids long the chain is (IDs are numbers);
 *  residue     – which amino acid sits at chain position `at` (IDs are one-letter codes, `*` for none);
 *  effect      – what a change does (IDs are Effects);
 *  closest     – which two strings differ least (IDs are "a|b" pair keys);
 *  differences – how many letters differ between the first two (IDs are numbers). */
export type LabMeasure = 'rna' | 'chain' | 'length' | 'residue' | 'effect' | 'closest' | 'differences';

export interface LabAsk { gradeId: string; transfer?: boolean; prompt: string; choices: Choice[]; answer: string; explain: string; measure: LabMeasure; at?: number }

export interface LabStep {
  id: string;
  title: string;
  /** 'dna' shows T, 'rna' shows U. */
  kind: NucleicKind;
  /** The strand the step starts from, 5′ to 3′ (a template strand runs 3′ to 5′ under its partner). */
  letters: string;
  /** Its name on screen: "Coding strand", "Messenger RNA". */
  label: string;
  op: LabOp;
  /** The run button: "Copy it into RNA". */
  action: string;
  ask: LabAsk;
  /** After the verdict, letters can be tapped and changed, and the chain is read again at once. */
  play?: boolean;
}

export interface LabOutcome {
  /** The choice ID that is right, computed. */
  truth: string;
  rna?: string;
  reading?: Reading;
  effect?: EffectReport;
  table?: { a: string; b: string; d: number }[];
  /** The rows a compare lines up, gapped when compared by edits. */
  rows?: Named[];
}

const MEASURES: Record<LabOp['do'], LabMeasure[]> = {
  transcribe: ['rna'],
  translate: ['chain', 'length', 'residue'],
  change: ['effect', 'chain', 'length', 'residue'],
  compare: ['closest', 'differences'],
};

/** Run a step: what really happens, and which choice that makes right. */
export function labOutcome(step: LabStep): LabOutcome {
  const { op, ask } = step;
  if (op.do === 'transcribe') {
    const rna = transcribe(step.letters, op.strand);
    return { truth: rna, rna };
  }
  if (op.do === 'compare') {
    const seqs: Named[] = [{ id: op.first, label: step.label, letters: step.letters }, ...op.with];
    const c = closest(seqs, op.by);
    const truth = ask.measure === 'closest' ? c.least.join(',') : String(c.table[0].d);
    const rows = op.by === 'edits' && seqs.length === 2 ? (() => { const g = align(seqs[0].letters, seqs[1].letters); return [{ ...seqs[0], letters: g.a }, { ...seqs[1], letters: g.b }]; })() : seqs;
    return { truth, table: c.table, rows };
  }
  const chainOf = (r: Reading) => r.chain;
  if (op.do === 'translate') {
    const reading = read(step.letters, { from: op.from });
    return { truth: measureOf(ask, chainOf(reading)), reading };
  }
  const effect = effectOf(step.letters, op.change, { from: op.from });
  return { truth: ask.measure === 'effect' ? effect.effect : measureOf(ask, chainOf(effect.after)), effect, reading: effect.after };
}

function measureOf(ask: LabAsk, chain: string): string {
  if (ask.measure === 'chain') return chain;
  if (ask.measure === 'length') return String(chain.length);
  if (ask.measure === 'residue') return chain[(ask.at ?? 0) - 1] ?? '*';
  throw new Error(`measure ${ask.measure} does not read a chain`);
}

/** Problems with a step's data and key; empty when the model and the stated answer agree. */
export function labProblems(step: LabStep): string[] {
  const out: string[] = [];
  const { op, ask } = step;
  out.push(...badLetters(step.letters, BASES[step.kind]));
  if (op.do === 'transcribe' && step.kind !== 'dna') out.push('only DNA is copied into RNA');
  if (op.do === 'compare') for (const s of op.with) out.push(...badLetters(s.letters, BASES[step.kind]).map(m => `${s.id}: ${m}`));
  if (!MEASURES[op.do].includes(ask.measure)) out.push(`a ${op.do} step can't ask about ${ask.measure}`);
  if (op.do === 'change') out.push(...changeProblems(step.letters, op.change, BASES[step.kind]));
  if ((op.do === 'translate' || op.do === 'change') && op.from === 'start' && findStart(step.letters) < 0) out.push('no start codon (AUG) to begin reading from');
  if ((op.do === 'translate' || op.do === 'change') && typeof op.from === 'number' && !(Number.isInteger(op.from) && op.from >= 1 && op.from <= step.letters.length)) out.push(`reading can't begin at letter ${op.from}`);
  if (ask.measure === 'residue' && !(Number.isInteger(ask.at) && (ask.at ?? 0) >= 1)) out.push('a residue question names its chain position (at, from 1)');
  if (op.do === 'compare' && ask.measure === 'differences' && op.with.length !== 1) out.push('a differences question compares exactly two strings');
  if (op.do === 'compare' && ask.measure === 'closest' && op.with.length < 2) out.push('a closest question compares three strings or more');
  if (out.length) return out;
  let outcome: LabOutcome;
  try { outcome = labOutcome(step); } catch (e) { return [(e as Error).message]; }
  if (op.do === 'change' && outcome.effect?.stopsAtOnce && ask.measure === 'effect') out.push('the shift meets a stop at once, so "stops early" and "every amino acid after it changes" are both right: pick another change');
  if (op.do === 'compare' && ask.measure === 'closest' && outcome.truth.includes(',')) out.push(`two pairs tie for closest (${outcome.truth})`);
  if (ask.answer !== outcome.truth) out.push(`${ask.gradeId}: keyed "${ask.answer}" but the letters give "${outcome.truth}"`);
  const ids = ask.choices.map(c => c.id);
  if (new Set(ids).size !== ids.length) out.push(`${ask.gradeId}: choice IDs repeat`);
  for (const id of ids) {
    const fits = ask.measure === 'effect' ? (EFFECTS as readonly string[]).includes(id)
      : ask.measure === 'residue' ? id in AMINO
      : ask.measure === 'length' || ask.measure === 'differences' ? /^\d+$/.test(id)
      : ask.measure === 'closest' ? id.split('|').length === 2
      : ask.measure === 'rna' ? !badLetters(id, 'ACGTU').length
      : !badLetters(id, Object.keys(AMINO).join('')).length;
    if (!fits) out.push(`${ask.gradeId}: choice "${id}" means nothing for ${ask.measure}`);
  }
  return out;
}
