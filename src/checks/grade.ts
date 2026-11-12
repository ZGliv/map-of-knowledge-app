import { checkVariant, isRightNumber } from './generators';
import type { CheckAnswer, CheckItem } from './types';

/** Plan §2.1: a typed number, an ordering of 5+ items, a match of 5+ pairs, or a sort of 6+
 * items into buckets. These can't be passed by elimination, so every check holds at least one. */
export function isOpenResponse(item: CheckItem): boolean {
  switch (item.kind) {
    case 'number': return true;
    case 'order': return item.items.length >= 5;
    case 'match': return item.buckets ? item.left.length >= 6 : item.left.length >= 5;
    default: return false;
  }
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** The chance of getting the item right by blind guessing (plan §2.4). Computed, never authored. */
export function guessP(item: CheckItem): number {
  switch (item.kind) {
    case 'choice': return 1 / item.options.length;
    case 'flaw': return 1 / item.steps.length;
    case 'order': return Math.max(1 / factorial(item.items.length), 0.01);
    case 'match': return item.buckets
      ? Math.max((1 / item.right.length) ** item.left.length, 0.01)
      : Math.max(1 / factorial(item.left.length), 0.01);
    case 'number': {
      const v = checkVariant(item, 0);
      const range = v.plausible[1] - v.plausible[0];
      return Math.min(0.5, Math.max(0.02, range > 0 ? (2 * v.tolerance) / range : 0.5));
    }
  }
}

/** Correctness recomputed from the answer key; a stored score is never trusted. */
export function grade(item: CheckItem, answer: CheckAnswer, variant = 0): boolean {
  switch (item.kind) {
    case 'choice':
    case 'flaw':
      return 'pick' in answer && answer.pick === item.answer;
    case 'order':
      return 'seq' in answer && answer.seq.length === item.answer.length && answer.seq.every((id, i) => id === item.answer[i]);
    case 'match':
      return 'pairs' in answer && item.left.every(left => answer.pairs[left.id] === item.pairs[left.id]);
    case 'number':
      return 'value' in answer && isRightNumber(answer.value, checkVariant(item, variant));
  }
}

/** The misconception behind a wrong pick, if the item keys one. */
export function misconceptionOf(item: CheckItem, answer: CheckAnswer): string | undefined {
  if (item.kind !== 'choice' || !('pick' in answer) || answer.pick === item.answer) return undefined;
  return item.options.find(option => option.id === answer.pick)?.misconception;
}

/** The learner's answer and the key, in words, for the review after a check. */
export function describe(item: CheckItem, answer: CheckAnswer | null, variant = 0): { given: string; key: string } {
  switch (item.kind) {
    case 'choice': {
      const label = (id?: string) => item.options.find(option => option.id === id)?.label ?? '';
      return { given: answer && 'pick' in answer ? label(answer.pick) : '', key: label(item.answer) };
    }
    case 'flaw': {
      const step = (id?: string) => item.steps.find(s => s.id === id)?.text ?? '';
      return { given: answer && 'pick' in answer ? step(answer.pick) : '', key: step(item.answer) };
    }
    case 'order': {
      const label = (id: string) => item.items.find(i => i.id === id)?.label ?? id;
      return { given: answer && 'seq' in answer ? answer.seq.map(label).join(' → ') : '', key: item.answer.map(label).join(' → ') };
    }
    case 'match': {
      const right = (id?: string) => item.right.find(r => r.id === id)?.label ?? '–';
      const list = (pairs: Record<string, string>) => item.left.map(left => `${left.label}: ${right(pairs[left.id])}`).join(' · ');
      return { given: answer && 'pairs' in answer ? list(answer.pairs) : '', key: list(item.pairs) };
    }
    case 'number': {
      const v = checkVariant(item, variant);
      const shown = (x: number) => `${x.toLocaleString('en-US', { maximumFractionDigits: v.digits })} ${v.unit}`;
      return { given: answer && 'value' in answer ? shown(answer.value) : '', key: shown(Number(v.answer.toFixed(v.digits))) };
    }
  }
}
