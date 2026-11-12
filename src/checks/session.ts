import type { Confidence } from '../expeditions/content/types';
import type { DrawnItem } from './draw';
import { grade } from './grade';
import type { CheckAttemptEvent, CheckFinishEvent } from './ledger';
import type { CheckAnswer } from './types';

export const newId = () => (typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** One answer, graded and ready to append before anything is revealed. */
export function attemptEvent(input: { session: string; node: string; drawn: DrawnItem; answer: CheckAnswer; confidence: Confidence; ms: number; at: string; id?: string }): CheckAttemptEvent {
  const { item } = input.drawn.entry;
  return {
    t: 'attempt', id: input.id ?? newId(), session: input.session, node: input.node,
    item: item.id, family: item.family, variant: input.drawn.variant, answer: input.answer,
    correct: grade(item, input.answer, input.drawn.variant), confidence: input.confidence, ms: Math.max(0, Math.round(input.ms)), at: input.at,
  };
}

export function finishEvent(input: { session: string; node: string; items: readonly DrawnItem[]; at: string; id?: string }): CheckFinishEvent {
  return { t: 'finish', id: input.id ?? newId(), session: input.session, node: input.node, items: input.items.map(d => d.entry.item.id), at: input.at };
}
