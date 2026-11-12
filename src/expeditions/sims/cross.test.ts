import { describe, expect, it } from 'vitest';
import { copies, expected, genotypesFor, normalize, phenotype, possibleChildren, punnett, ratioText, sample, seeded, tally, type Locus } from './cross';

const PEA: Locus = { R: 1, r: 0 };
const ABO: Locus = { A: 1, B: 1, O: 0 };

describe('Mendelian crosses', () => {
  it('spells genotypes one way and reads the visible trait from allele rank', () => {
    expect(normalize('r', 'R', PEA)).toBe('Rr');
    expect(phenotype('Rr', PEA)).toBe('R');
    expect(phenotype('rr', PEA)).toBe('r');
    expect(phenotype('AO', ABO)).toBe('A');
    expect(phenotype('BA', ABO)).toBe('AB');
    expect(phenotype('OO', ABO)).toBe('O');
  });

  it('builds Punnett squares and expected ratios', () => {
    expect(punnett('RR', 'rr', PEA)).toEqual([['Rr', 'Rr'], ['Rr', 'Rr']]);
    expect(expected('RR', 'rr', PEA)).toEqual({ R: 4 });
    expect(expected('Rr', 'Rr', PEA)).toEqual({ R: 3, r: 1 });
    expect(expected('Rr', 'rr', PEA)).toEqual({ R: 2, r: 2 });
    expect(expected('AO', 'BO', ABO)).toEqual({ A: 1, AB: 1, B: 1, O: 1 });
  });

  it('samples offspring that settle near the expected ratio, the same way every time', () => {
    const seeds = sample('Rr', 'Rr', 20000, PEA, seeded('peas'));
    const counts = tally(seeds, PEA);
    expect(counts.R / 20000).toBeGreaterThan(0.74);
    expect(counts.R / 20000).toBeLessThan(0.76);
    expect(tally(sample('Rr', 'Rr', 50, PEA, seeded('x')), PEA)).toEqual(tally(sample('Rr', 'Rr', 50, PEA, seeded('x')), PEA));
    expect(new Set(sample('RR', 'rr', 200, PEA, seeded('f1')))).toEqual(new Set(['Rr']));
  });

  it('knows which children a couple can have, hidden alleles included', () => {
    expect(genotypesFor('A', ABO)).toEqual(['AA', 'AO']);
    expect(possibleChildren('A', 'B', ABO)).toEqual(['A', 'AB', 'B', 'O']);
    expect(possibleChildren('AB', 'O', ABO)).toEqual(['A', 'B']);
    expect(possibleChildren('O', 'O', ABO)).toEqual(['O']);
    expect(possibleChildren('AB', 'AB', ABO)).toEqual(['A', 'AB', 'B']);
    expect(possibleChildren('R', 'R', PEA)).toEqual(['R', 'r']);
  });

  it('writes ratios the way Mendel did', () => {
    expect(ratioText(5474, 1850)).toBe('2.96 to 1');
    expect(ratioText(6022, 2001)).toBe('3.01 to 1');
  });

  it('copies strands in exact quarters, never a chance spread', () => {
    const DNA: Locus = { H: 1, L: 1 };
    const once = copies('HH', 'LL', 12, DNA, seeded('x'));
    expect(tally(once, DNA)).toEqual({ HL: 12 });
    for (const seed of ['a', 'b', 'genetics-dna-meselson']) expect(tally(copies('HL', 'LL', 64, DNA, seeded(seed)), DNA)).toEqual({ HL: 32, L: 32 });
    expect(copies('HL', 'LL', 64, DNA, seeded('a'))).toEqual(copies('HL', 'LL', 64, DNA, seeded('a')));
    expect(() => copies('HL', 'LL', 10, DNA, seeded('a'))).toThrow();
  });
});
