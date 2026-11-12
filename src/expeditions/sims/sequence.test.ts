import { describe, expect, it } from 'vitest';
import {
  AMINO, GENETIC_CODE, STANDARD_CODE, align, applyChange, chainWords, closest, differences, editDistance, effectOf, findStart,
  frames, labOutcome, labProblems, pairWith, PAIRS, read, reverseComplement, substitutionSpectrum, transcribe, wordsFor,
  type LabStep, type WordCode,
} from './sequence';

describe('the standard genetic code', () => {
  it('has 4 × 4 × 4 = 64 codons: 61 for the 20 amino acids and 3 stops', () => {
    expect(Object.keys(STANDARD_CODE)).toHaveLength(4 ** 3);
    expect(wordsFor('*').sort()).toEqual(['UAA', 'UAG', 'UGA']);
    const sense = Object.values(STANDARD_CODE).filter(s => s !== '*');
    expect(sense).toHaveLength(61);
    expect(new Set(sense).size).toBe(20);
    expect([...new Set(sense)].every(s => s in AMINO)).toBe(true);
  });

  it('gives each amino acid its textbook number of codons', () => {
    const count = (s: string) => wordsFor(s).length;
    expect({ L: count('L'), S: count('S'), R: count('R'), M: count('M'), W: count('W'), F: count('F'), I: count('I'), G: count('G') })
      .toEqual({ L: 6, S: 6, R: 6, M: 1, W: 1, F: 2, I: 3, G: 4 });
    expect(wordsFor('M')).toEqual(['AUG']);
    expect(wordsFor('W')).toEqual(['UGG']);
  });

  it('reads the codons first cracked and the classic examples', () => {
    expect([STANDARD_CODE.UUU, STANDARD_CODE.AAA, STANDARD_CODE.CCC, STANDARD_CODE.GGG]).toEqual(['F', 'K', 'P', 'G']);
    expect([STANDARD_CODE.GAG, STANDARD_CODE.GUG, STANDARD_CODE.CAG, STANDARD_CODE.UAG]).toEqual(['E', 'V', 'Q', '*']);
    expect(chainWords('MKV')).toBe('Met–Lys–Val');
  });
});

describe('pairing and transcription', () => {
  it('pairs A with T (or U) and C with G, letter by letter', () => {
    expect(pairWith('ATGC', PAIRS.dna)).toBe('TACG');
    expect(reverseComplement('ATGC')).toBe('GCAT');
    expect(() => pairWith('ATXG', PAIRS.dna)).toThrow(/letter 3/);
  });
  it('copies a gene into RNA from either strand, to the same message', () => {
    expect(transcribe('ATGGCCTAA')).toBe('AUGGCCUAA');
    expect(transcribe('TACCGGATT', 'template')).toBe('AUGGCCUAA');
    expect(transcribe(pairWith('ATGGCCTAA', PAIRS.dna), 'template')).toBe(transcribe('ATGGCCTAA'));
  });
});

describe('reading three letters at a time', () => {
  it('starts at the first AUG and stops at the first stop codon, which adds no amino acid', () => {
    const r = read('GGAUGAAAUAGCC');
    expect(r.start).toBe(2);
    expect(r.chain).toBe('MK');
    expect(r.stop).toEqual({ at: 8, word: 'UAG', symbol: '*' });
    expect(r.words.map(w => w.word)).toEqual(['AUG', 'AAA', 'UAG']);
  });
  it('reads a DNA coding strand as its RNA', () => {
    expect(read('CCATGTTTTGAA').chain).toBe('MF');
  });
  it('runs to the end of the letters when no stop comes, and finds nothing without a start', () => {
    expect(read('AUGCCCGG').chain).toBe('MP');
    expect(read('AUGCCCGG').stop).toBeNull();
    expect(read('CCCGGG').start).toBe(-1);
    expect(read('CCCGGG').chain).toBe('');
    expect(findStart('UAUGG')).toBe(1);
  });
  it('gives three different readings in the three frames', () => {
    const f = frames('UUUAAACCCG');
    expect(f.map(r => r.chain)).toEqual(['FKP', 'LNP', '*T']);
    expect(f[1].words.map(w => w.word)).toEqual(['UUA', 'AAC', 'CCG']);
    expect(read('UUUAAACCC', { from: 2 }).chain).toBe('LN');
  });
  it('reads any fixed-size word code, not only the genetic one', () => {
    const binary: WordCode = { size: 2, table: { '00': 'a', '01': 'b', '10': 'c', '11': '.' }, starts: ['01'], stop: '.' };
    expect(read('000110110000', { code: binary }).chain).toBe('bc');
  });
});

describe('changes and their effects', () => {
  // AUG GCU GAG CAG UGG AAA UAA: Met Ala Glu Gln Trp Lys, then stop.
  const gene = 'CCAUGGCUGAGCAGUGGAAAUAAGG';
  const fx = (c: Parameters<typeof effectOf>[1]) => effectOf(gene, c);

  it('applies substitutions, insertions and deletions at 1-based letter numbers', () => {
    expect(applyChange('ACGT', { kind: 'sub', at: 2, to: 'T' })).toBe('ATGT');
    expect(applyChange('ACGT', { kind: 'ins', at: 3, letters: 'AA' })).toBe('ACAAGT');
    expect(applyChange('ACGT', { kind: 'del', at: 2, count: 2 })).toBe('AT');
  });

  it('names a silent change, a swap and an early stop', () => {
    expect(fx({ kind: 'sub', at: 8, to: 'C' }).effect).toBe('silent'); // GCU → GCC, both Ala
    const swap = fx({ kind: 'sub', at: 10, to: 'U' }); // GAG → GUG, Glu → Val
    expect(swap.effect).toBe('missense');
    expect(swap.after.chain).toBe('MAVQWK');
    expect(swap.firstChange).toBe(3);
    const stop = fx({ kind: 'sub', at: 12, to: 'U' }); // CAG → UAG
    expect(stop.effect).toBe('nonsense');
    expect(stop.after.chain).toBe('MAE');
  });

  it('names a lost start and a lost stop', () => {
    expect(fx({ kind: 'sub', at: 4, to: 'C' }).effect).toBe('start-lost');
    const runOn = effectOf('AUGAAAUAACCCGGGUGA', { kind: 'sub', at: 7, to: 'C' }); // UAA → CAA: reads on to UGA
    expect(runOn.effect).toBe('stop-lost');
    expect(runOn.after.chain).toBe('MKQPG');
  });

  it('tells a frameshift from an in-frame loss', () => {
    const shift = fx({ kind: 'del', at: 9, count: 1 });
    expect(shift.effect).toBe('frameshift');
    expect(shift.after.chain).not.toBe(shift.before.chain);
    const inFrame = fx({ kind: 'del', at: 9, count: 3 }); // one whole codon (GAG) goes
    expect(inFrame.effect).toBe('in-frame');
    expect(inFrame.after.chain).toBe('MAQWK');
    // A three-letter loss across a codon join keeps the frame: one amino acid fewer, the rest as before.
    const across = fx({ kind: 'del', at: 10, count: 3 }); // G[AGC]AG: GAG CAG becomes GAG
    expect(across.effect).toBe('in-frame');
    expect(across.after.chain.length).toBe(5);
  });

  it('calls an in-frame loss that makes a stop at the join an early stop', () => {
    // AUG UA[U GG]A AAA UAA: losing letters 6–8 leaves AUG UAA, a stop straight after the start.
    expect(effectOf('AUGUAUGGAAAAUAA', { kind: 'del', at: 6, count: 3 }).effect).toBe('nonsense');
  });

  it('flags a frameshift whose first new codon is a stop', () => {
    // AUG GCU UAA...: inserting "U" before the G of GCU: AUG UGC UUA A: no stop at once.
    expect(effectOf('AUGGCUAAAUAA', { kind: 'ins', at: 4, letters: 'U' }).stopsAtOnce).toBe(false);
    // AUG AUA AAG UAA: deleting the A at 4 gives AUG UAA: a stop at once.
    expect(effectOf('AUGAUAAAGUAA', { kind: 'del', at: 4, count: 1 }).stopsAtOnce).toBe(true);
  });

  it('leaves the chain alone for a change outside the part that is read', () => {
    expect(fx({ kind: 'sub', at: 1, to: 'G' }).effect).toBe('outside');
    expect(fx({ kind: 'sub', at: 25, to: 'C' }).effect).toBe('outside');
    expect(fx({ kind: 'del', at: 1, count: 1 }).after.chain).toBe(fx({ kind: 'del', at: 1, count: 1 }).before.chain);
  });

  it('counts every single-letter change in the read part exactly', () => {
    const s = substitutionSpectrum('AUGGCUUAA', 'ACGU');
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(9 * 3);
    // GCU's third letter: GCC, GCA and GCG are all alanine.
    expect(s.silent).toBeGreaterThanOrEqual(3);
    expect(s['start-lost']).toBe(9);
  });
});

describe('comparing strings', () => {
  it('counts differences position by position, and edits when lengths differ', () => {
    expect(differences('GATTACA', 'GACTACA')).toEqual([2]);
    expect(differences('ACGT', 'ACG')).toEqual([3]);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    // One letter lost early: position by position nearly everything differs, but it is one edit.
    expect(differences('ACGTACGT', 'AGTACGT').length).toBeGreaterThan(5);
    expect(editDistance('ACGTACGT', 'AGTACGT')).toBe(1);
    expect(align('ACGT', 'AGT')).toEqual({ a: 'ACGT', b: 'A-GT' });
  });
  it('finds the pair that differs least, the same way every time', () => {
    const seqs = [
      { id: 'a', label: 'A', letters: 'ACGTACGTAC' },
      { id: 'b', label: 'B', letters: 'ACGTACGTTC' },
      { id: 'c', label: 'C', letters: 'TCGAACGGAC' },
    ];
    const c = closest(seqs, 'position');
    expect(c.least).toEqual(['a|b']);
    expect(c.d).toBe(1);
    expect(c.table.find(t => t.a === 'a' && t.b === 'c')!.d).toBe(3);
  });
});

describe('a lab step', () => {
  const step = (over: Partial<LabStep> = {}): LabStep => ({
    id: 's', title: 'T', kind: 'rna', letters: 'GGAUGGCUGAGUAAC', label: 'Messenger RNA', action: 'Read it',
    op: { do: 'translate', from: 'start' },
    ask: { gradeId: 'g', prompt: 'How long?', explain: 'Because.', measure: 'length', answer: '3', choices: ['2', '3', '4', '5'].map(id => ({ id, label: id })) },
    ...over,
  });
  it('agrees with a key the letters support, and computes the outcome', () => {
    expect(labProblems(step())).toEqual([]);
    expect(labOutcome(step()).reading!.chain).toBe('MAE');
  });
  it('catches a key the letters disagree with, and choices that mean nothing', () => {
    expect(labProblems(step({ ask: { ...step().ask, answer: '4' } })).join()).toMatch(/keyed "4" but the letters give "3"/);
    expect(labProblems(step({ ask: { ...step().ask, choices: [{ id: 'three', label: 'three' }, { id: '3', label: '3' }] } })).join()).toMatch(/means nothing/);
    expect(labProblems(step({ letters: 'GGCUGAGUAAC' })).join()).toMatch(/no start codon/);
  });
  it('rejects an effect question whose shift stops at once (two options would be right)', () => {
    const s = step({ letters: 'AUGAUAAAGUAA', op: { do: 'change', from: 'start', change: { kind: 'del', at: 4, count: 1 } }, ask: { ...step().ask, measure: 'effect', answer: 'frameshift', choices: ['frameshift', 'nonsense', 'silent'].map(id => ({ id, label: id })) } });
    expect(labProblems(s).join()).toMatch(/both right/);
  });
  it('checks transcription keys letter for letter', () => {
    const s = step({ kind: 'dna', letters: 'TACCGG', op: { do: 'transcribe', strand: 'template' }, ask: { ...step().ask, measure: 'rna', answer: 'AUGGCC', choices: ['AUGGCC', 'UACCGG', 'ATGGCC'].map(id => ({ id, label: id })) } });
    expect(labProblems(s)).toEqual([]);
    expect(labProblems({ ...s, ask: { ...s.ask, choices: [...s.ask.choices, { id: 'AXG', label: 'AXG' }] } }).join()).toMatch(/"AXG" means nothing/);
    expect(labOutcome(s).truth).toBe('AUGGCC');
  });
  it('uses the genetic code for DNA letters too', () => {
    expect(GENETIC_CODE.normalise!('atg')).toBe('AUG');
  });
});
