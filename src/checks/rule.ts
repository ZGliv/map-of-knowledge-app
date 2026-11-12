import type { Confidence } from '../expeditions/content/types';

/** The evidence rule from plan §2.4, with its tunable numbers in one place. */
export const CHECK_POLICY = {
  /** Items in one check: plan §4.2's test-out shape, one open-response transfer, one
   * multiple-choice transfer and one more. A fourth is added only when three can't meet the rule. */
  size: 3,
  minStrongRight: 2,
  minOtherShare: 0.6,
  maxGuessProduct: 0.005,
  /** A pass this many days after the idea was first proved marks it Lasting (plan §2.3). */
  lastingDays: 7,
  /** After a missed check the next one opens this many days later (plan §2.8's relearn step). */
  retryAfterDays: 2,
} as const;

export interface JudgedAttempt {
  transfer: boolean;
  guessP: number;
  correct: boolean;
  confidence: Confidence;
  /** The misconception behind the picked wrong option, if any. */
  misconception?: string;
}

export type MissReason = 'transfer-missed' | 'too-many-missed' | 'guessed' | 'sure-misconception';
export interface Verdict { passed: boolean; reasons: MissReason[] }

const strong = (a: JudgedAttempt) => a.correct && a.confidence !== 'guess';

/**
 * A check passes when all six of plan §2.4's conditions hold:
 * 1. at least two right answers given at "fair" or "certain";
 * 2. at least one of those is a transfer item;
 * 3. every transfer item is right;
 * 4. at least 60% of the other items are right;
 * 5. the product of the guess chances of the confidently right items is at most 0.005;
 * 6. no "certain" pick of a wrong answer built from a misconception.
 */
export function judge(attempts: readonly JudgedAttempt[]): Verdict {
  const reasons = new Set<MissReason>();
  const right = attempts.filter(strong);
  const transfers = attempts.filter(a => a.transfer);
  const others = attempts.filter(a => !a.transfer);
  if (!transfers.every(a => a.correct)) reasons.add('transfer-missed');
  if (others.length && others.filter(a => a.correct).length / others.length < CHECK_POLICY.minOtherShare) reasons.add('too-many-missed');
  if (attempts.some(a => !a.correct && a.confidence === 'certain' && a.misconception)) reasons.add('sure-misconception');
  const product = right.reduce((p, a) => p * a.guessP, 1);
  const enough = right.length >= CHECK_POLICY.minStrongRight && right.some(a => a.transfer) && product <= CHECK_POLICY.maxGuessProduct * (1 + 1e-9);
  // Right answers marked as guesses don't count; say so when that is what fell short.
  if (!enough && !reasons.size) reasons.add(attempts.some(a => a.correct && a.confidence === 'guess') ? 'guessed' : 'too-many-missed');
  return { passed: attempts.length > 0 && reasons.size === 0, reasons: [...reasons] };
}

/** Could a set of items pass at all, if every answer were right and given at "certain"? */
export function canPass(items: readonly { transfer: boolean; guessP: number }[]): boolean {
  return judge(items.map(item => ({ ...item, correct: true, confidence: 'certain' as const }))).passed;
}
