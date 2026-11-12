import { createContext, useContext } from 'react';
import type { Confidence, Media, Pack } from '../content/types';
import type { CheckStatus } from '../../checks/progress';
import type { CaseAnswer, PlaceCase } from '../../cases/types';
import type { Evidence, Summary } from './evidence';

/** Where the node stands, as the payoff shows it. `lit` is true when its land was already lit. */
export interface PayoffCheck { status: CheckStatus; open: () => void; lit?: boolean }

/** The new case that ends this run: the place's next unplayed case, fixed when the run opened. */
export interface NewCase {
  case: PlaceCase;
  play: (answer: CaseAnswer, success: boolean, ms: number) => void;
  /** Once the call is on the record: when the place's next new case opens, or null when none is left. */
  nextAt?: () => number | null;
  /** The place's last case: once it is played, what opens next is a check in words. */
  last?: boolean;
}

export interface BeatApi {
  pack: Pack;
  media: (id: string) => Media;
  /** Mark the current beat finished so Continue unlocks. */
  done: () => void;
  record: (e: Omit<Evidence, 'at' | 'assisted'> & { assisted?: boolean }) => void;
  evidenceFor: (gradeId: string) => Evidence | undefined;
  open: (packId: string) => void;
  /** Open an atlas place (its hub). Used by payoff connections that have no pack yet. */
  openPlace: (nodeId: string) => void;
  /** The payoff reports the run's summary once, so the atlas can keep the evidence. */
  finish: (summary: Summary) => void;
  /** The node's check, when it has a bank. */
  check?: PayoffCheck;
  /** The new case on the payoff, when the place has one left for this learner. */
  newCase?: NewCase;
  /** Keep the learner's optional "what stuck" line for this run. Returns an error, or null. */
  keepStuck?: (line: string) => string | null;
}

export const BeatContext = createContext<BeatApi | null>(null);

export function useBeat(): BeatApi {
  const api = useContext(BeatContext);
  if (!api) throw new Error('useBeat outside a beat');
  return api;
}

export const CONFIDENCE: { id: Confidence; label: string }[] = [
  { id: 'guess', label: 'Guessing' },
  { id: 'fair', label: 'Fairly sure' },
  { id: 'certain', label: 'Certain' },
];
