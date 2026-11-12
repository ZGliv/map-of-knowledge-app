import type { Beat, Confidence, Pack } from '../content/types';

export interface Evidence {
  gradeId: string;
  correct: boolean;
  confidence: Confidence;
  assisted: boolean;
  transfer: boolean;
  prompt: string;
  chosen: string;
  /** Choice ids per part, for questions answered in several parts. */
  parts?: Record<string, string>;
  at: number;
}

export type Level = 'Glimpsed' | 'Familiar' | 'Understood';

export interface Summary {
  level: Level;
  firstTry: { right: number; total: number };
  transfer: { right: number; total: number };
  calibration: { sureRight: number; sureWrong: number; guessRight: number; guessWrong: number };
  confidentMisses: Evidence[];
  /** Every first answer that was wrong, in the learner's words: the journal's "changed your mind". */
  misses?: { gradeId: string; prompt: string; chosen: string }[];
  reviewOn: string;
}

/** Every graded moment declared in a pack, in order. */
export function gradesOf(pack: Pack): { gradeId: string; transfer: boolean }[] {
  const out: { gradeId: string; transfer: boolean }[] = [];
  const visit = (beat: Beat) => {
    if ('gradeId' in beat) out.push({ gradeId: beat.gradeId, transfer: !!beat.transfer });
    if (beat.kind === 'sim') beat.grades?.forEach(g => out.push({ gradeId: g.gradeId, transfer: !!g.transfer }));
    if (beat.kind === 'dialogue') beat.script.forEach(line => { if ('gradeId' in line) out.push({ gradeId: line.gradeId, transfer: !!line.transfer }); });
  };
  pack.beats.forEach(visit);
  return out;
}

const sure = (c: Confidence) => c !== 'guess';

/**
 * The ladder is a rule anyone can read, not a model:
 * Understood = every transfer check right on the first, unassisted try, and most of the rest right.
 * Familiar   = at least half of everything right on the first try.
 * Lasting is only earned later, by passing a review on another day.
 */
export function summarize(pack: Pack, evidence: Evidence[]): Summary {
  const declared = gradesOf(pack);
  const first = new Map<string, Evidence>();
  for (const e of evidence) if (!first.has(e.gradeId)) first.set(e.gradeId, e);
  const seen = declared.map(d => first.get(d.gradeId)).filter((e): e is Evidence => !!e);
  const right = seen.filter(e => e.correct && !e.assisted);
  const transfers = seen.filter(e => e.transfer);
  const transferRight = transfers.filter(e => e.correct && !e.assisted);
  const others = seen.filter(e => !e.transfer);
  const othersRight = others.filter(e => e.correct && !e.assisted);
  const declaredTransfers = declared.filter(d => d.transfer).length;

  let level: Level = 'Glimpsed';
  if (seen.length && right.length / declared.length >= 0.5) level = 'Familiar';
  if (declaredTransfers && transferRight.length === declaredTransfers && othersRight.length >= Math.ceil(others.length * 0.6)) level = 'Understood';

  // Plan §2.8: the first check that can make an idea Lasting comes a week after it is proved.
  const review = new Date();
  review.setDate(review.getDate() + 7);
  return {
    level,
    firstTry: { right: right.length, total: declared.length },
    transfer: { right: transferRight.length, total: declaredTransfers },
    calibration: {
      sureRight: seen.filter(e => sure(e.confidence) && e.correct).length,
      sureWrong: seen.filter(e => sure(e.confidence) && !e.correct).length,
      guessRight: seen.filter(e => !sure(e.confidence) && e.correct).length,
      guessWrong: seen.filter(e => !sure(e.confidence) && !e.correct).length,
    },
    confidentMisses: seen.filter(e => !e.correct && sure(e.confidence)),
    misses: seen.filter(e => !e.correct).map(e => ({ gradeId: e.gradeId, prompt: e.prompt, chosen: e.chosen })),
    reviewOn: review.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}
