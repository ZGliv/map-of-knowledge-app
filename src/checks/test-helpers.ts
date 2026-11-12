// Shared by the check tests: take a drawn check with chosen answers, at a chosen time.
import type { Confidence } from '../expeditions/content/types';
import type { DrawnItem } from './draw';
import { checkVariant } from './generators';
import { appendCheckEvents, type CheckLedger } from './ledger';
import { attemptEvent, finishEvent } from './session';
import type { CheckAnswer, CheckItem } from './types';

export const DAY = 24 * 60 * 60 * 1000;
export const T0 = Date.parse('2026-10-16T20:00:00.000Z');
export const at = (days: number) => new Date(T0 + days * DAY).toISOString();

/** The keyed answer for an item. */
export function rightAnswer(item: CheckItem, variant = 0): CheckAnswer {
  switch (item.kind) {
    case 'choice': case 'flaw': return { pick: item.answer };
    case 'order': return { seq: [...item.answer] };
    case 'match': return { pairs: { ...item.pairs } };
    case 'number': return { value: checkVariant(item, variant).answer };
  }
}

/** A wrong answer for an item: another option, a swapped order, a moved pair, a far-off number. */
export function wrongAnswer(item: CheckItem, variant = 0): CheckAnswer {
  switch (item.kind) {
    case 'choice': return { pick: item.options.find(o => o.id !== item.answer)!.id };
    case 'flaw': return { pick: item.steps.find(s => s.id !== item.answer)!.id };
    case 'order': return { seq: [...item.answer].reverse() };
    case 'match': {
      const first = item.left[0].id;
      return { pairs: { ...item.pairs, [first]: item.right.find(r => r.id !== item.pairs[first])!.id } };
    }
    case 'number': return { value: checkVariant(item, variant).answer * 3 + 7 };
  }
}

/** Answer every drawn item and finish, appending to the ledger. `plan` picks right/wrong and confidence per item. */
export function takeCheck(ledger: CheckLedger, node: string, session: string, drawn: DrawnItem[], when: string,
  plan: (index: number, drawn: DrawnItem) => { right: boolean; confidence: Confidence } = () => ({ right: true, confidence: 'certain' })): CheckLedger {
  const events = drawn.map((d, i) => {
    const { right, confidence } = plan(i, d);
    const answer = right ? rightAnswer(d.entry.item, d.variant) : wrongAnswer(d.entry.item, d.variant);
    return attemptEvent({ session, node, drawn: d, answer, confidence, ms: 15_000, at: when, id: `${session}-a${i}` });
  });
  return appendCheckEvents(ledger, [...events, finishEvent({ session, node, items: drawn, at: when, id: `${session}-finish` })]);
}
