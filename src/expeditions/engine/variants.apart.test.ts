import { describe, expect, it } from 'vitest';
import { isClose, makeVariant } from './variants';

const params = {
  prompt: '{a} and {b} last shared an ancestor about {split} million years ago.',
  ask: 'Counting along both lines, how many million years of evolution separate them?',
  cases: [{ a: 'Cats', b: 'Dogs', split: 40 }, { a: 'Humans', b: 'Chimpanzees', split: 6 }],
  unit: 'million years', tolerance: 0, hint: 'Each line evolved on its own for the whole {split} million years.',
};

describe('apartTime generator', () => {
  it('counts both lines: twice the time since the split', () => {
    const v = makeVariant('apartTime', params, 0);
    expect(v.answer).toBe(80);
    expect(v.prompt).toBe('Cats and Dogs last shared an ancestor about 40 million years ago.');
    expect(v.hint).toContain('40 million years');
    expect(v.figure).toEqual({ kind: 'apart', split: 40, a: 'Cats', b: 'Dogs', unit: 'million years' });
    expect(isClose(80, v)).toBe(true);
    // The one-line answer, the misconception this item is built to catch, is wrong.
    expect(isClose(40, v)).toBe(false);
  });

  it('cycles fresh cases and never echoes the key in the prompt', () => {
    const v = makeVariant('apartTime', params, 1);
    expect(v.answer).toBe(12);
    for (const n of [0, 1]) { const w = makeVariant('apartTime', params, n); expect(`${w.prompt} ${w.ask}`).not.toContain(String(w.answer)); }
  });
});
