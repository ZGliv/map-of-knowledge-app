import { describe, expect, it } from 'vitest';
import type { QuickItem } from '../auto/types';
import { GUESS_MAX, guessWeight, pickGuess } from './guess';

const item = (id: string, prompt: string, labels: string[]): QuickItem => ({ id, prompt, options: labels.map((label, at) => ({ id: `${id}-${at}`, label })), answer: `${id}-0`, explain: 'Why.', cites: [1] });
const NONE = () => false;

describe('guessWeight', () => {
  it('counts the prompt and every option', () => {
    expect(guessWeight(item('a', '12345', ['ab', 'cde', '', 'f']))).toBe(5 + 2 + 3 + 0 + 1);
  });
});

describe('pickGuess', () => {
  const long = item('long', 'x'.repeat(160), ['y'.repeat(20), 'y'.repeat(20), 'y'.repeat(20), 'y'.repeat(20)]);
  const short = item('short', 'Which one?', ['Mars', 'Venus', 'Earth', 'Moon']);
  const mid = item('mid', 'x'.repeat(60), ['y'.repeat(10), 'y'.repeat(10), 'y'.repeat(10), 'y'.repeat(10)]);

  it('prefers the lightest question, not the first', () => {
    expect(pickGuess([long, mid, short], NONE)?.id).toBe('short');
  });

  it('skips questions already answered', () => {
    expect(pickGuess([long, mid, short], id => id === 'short')?.id).toBe('mid');
  });

  it('keeps the first of two equally light questions', () => {
    const twin = item('twin', 'Which one?', ['Mars', 'Venus', 'Earth', 'Moon']);
    expect(pickGuess([short, twin], NONE)?.id).toBe('short');
  });

  it('offers nothing above the cap, and accepts a question exactly at it', () => {
    const at = item('at', 'x'.repeat(GUESS_MAX - 4), ['a', 'b', 'c', 'd']);
    const over = item('over', 'x'.repeat(GUESS_MAX - 3), ['a', 'b', 'c', 'd']);
    expect(guessWeight(at)).toBe(GUESS_MAX);
    expect(pickGuess([at], NONE)?.id).toBe('at');
    expect(pickGuess([over, long], NONE)).toBeNull();
  });

  it('offers nothing once every light question is answered', () => {
    expect(pickGuess([long, short], id => id === 'short')).toBeNull();
    expect(pickGuess([], NONE)).toBeNull();
  });
});
