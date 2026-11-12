import type { QuickItem } from '../auto/types';

// A place card's guess is an optional extra, so it has to be light: of the place's questions not
// answered yet, the one with the least to read, and none at all when even that one is too long.

/** How much there is to read: the prompt plus every option, in characters. */
export const guessWeight = (item: QuickItem): number => item.prompt.length + item.options.reduce((sum, option) => sum + option.label.length, 0);

/** Heavier than this and the card offers no guess: it opens straight on the place. */
export const GUESS_MAX = 220;

/** The lightest unanswered question within GUESS_MAX (the first of equals), or null. */
export function pickGuess(items: readonly QuickItem[], answered: (id: string) => boolean): QuickItem | null {
  let best: QuickItem | null = null;
  let least = GUESS_MAX + 1;
  for (const item of items) {
    if (answered(item.id)) continue;
    const weight = guessWeight(item);
    if (weight < least) { best = item; least = weight; }
  }
  return best;
}
