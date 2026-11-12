import { describe, expect, it } from 'vitest';
import { makeVariant } from './variants';

// chainLength: three letters per amino acid, and the stop codon adds none.
describe('chainLength', () => {
  const params = (cases: unknown[]) => ({ prompt: 'A gene has {letters} letters from start to stop.', ask: 'How many amino acids?', unit: 'amino acids', tolerance: 0, hint: 'Count codons.', cases });
  it('turns coding letters into amino acids: letters ÷ 3 − 1', () => {
    expect(makeVariant('chainLength', params([{ letters: 1500 }]), 0).answer).toBe(499);
    expect(makeVariant('chainLength', params([{ letters: 1500 }]), 0).prompt).toBe('A gene has 1,500 letters from start to stop.');
  });
  it('reads given letters from the start codon to the stop', () => {
    const v = makeVariant('chainLength', params([{ rna: 'GCAUGGCUAAAUGAUU' }]), 0);
    expect(v.answer).toBe(3);
    expect(v.working).toMatch(/AUG GCU AAA UGA/);
  });
  it('turns a chain length into the letters that code for it, stop codon included', () => {
    const v = makeVariant('chainLength', { ...params([{ residues: 238 }]), prompt: 'A chain of {residues} amino acids.' }, 0);
    expect(v.answer).toBe(717);
    expect(v.unit).toBe('letters');
    expect(v.prompt).toBe('A chain of 238 amino acids.');
  });
  it('refuses letters that are not whole codons, or letters with no stop', () => {
    expect(() => makeVariant('chainLength', params([{ letters: 1501 }]), 0)).toThrow(/whole number of codons/);
    expect(() => makeVariant('chainLength', params([{ rna: 'AUGGCU' }]), 0)).toThrow(/stop codon/);
  });
});
