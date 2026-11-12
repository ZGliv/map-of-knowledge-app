// Every place's new cases, by atlas node, and which one a learner meets next.
import type { CheckLedger } from '../checks/ledger';
import { EXPEDITIONS } from '../expeditions/registry';
import { GENERATED_PLACES } from '../places/generated';
import { LEGACY_CASES } from './content';
import { judgeCase } from './engines';
import type { CaseAnswer, PlaceCase } from './types';

const BY_NODE = new Map<string, readonly PlaceCase[]>(EXPEDITIONS.map(e => [
  e.nodeId, LEGACY_CASES[e.pack.id] ?? GENERATED_PLACES.find(place => place.pack.id === e.pack.id)?.cases ?? [],
]));
const BY_ID = new Map([...BY_NODE].flatMap(([nodeId, cases]) => cases.map(c => [c.id, { nodeId, case: c }] as const)));

/** A place's cases, in the order they are offered. */
export const casesFor = (nodeId: string): readonly PlaceCase[] => BY_NODE.get(nodeId) ?? [];
export const hasCases = (nodeId: string): boolean => casesFor(nodeId).length > 0;

/** A retired ID's current case, when only its wording, labels, order or range changed (PlaceCase.was). */
const SUCCESSOR = new Map([...BY_NODE.values()].flatMap(cases => cases.flatMap(c => (c.was ?? []).map(old => [old, c.id] as const))));

/** Whether a stored call still reads against this case: a value always does, a pick only when every
 * option it names is still offered. */
function fits(c: PlaceCase, answer: CaseAnswer): boolean {
  if (c.call.kind !== 'pick') return 'value' in answer;
  const offered = new Set(c.call.options.map(o => o.id));
  return 'pick' in answer ? offered.has(answer.pick) : 'picks' in answer && answer.picks.every(id => offered.has(id));
}

/** A case by its ID, or by an ID it once had (PlaceCase.was), so a call stored under a retired ID is
 * read, and rejudged, as the case that replaced it. Given the stored call, a retired ID resolves only
 * when that call still reads against the new case. */
export function caseById(id: string, answer?: CaseAnswer) {
  const own = BY_ID.get(id);
  if (own) return own;
  const next = BY_ID.get(SUCCESSOR.get(id) ?? '');
  return next && (!answer || fits(next.case, answer)) ? next : undefined;
}

/** Cases this learner has already played: their outcome has been shown, so they are spent as proof.
 * A play under a retired ID spends the case that replaced it, so the same situation never comes back
 * as a new case. */
export const playedCases = (checks: CheckLedger): Set<string> => new Set(checks.events.flatMap(e => e.t !== 'case' ? [] : SUCCESSOR.has(e.case) ? [e.case, SUCCESSOR.get(e.case)!] : [e.case]));

/** The next case this learner hasn't played at this place, or undefined when they are all spent. */
export const nextCase = (nodeId: string, checks: CheckLedger): PlaceCase | undefined => {
  const played = playedCases(checks);
  return casesFor(nodeId).find(c => !played.has(c.id));
};

/** Whether this is the place's last case: once it is played, no new case is left there. */
export const isLastCase = (caseId: string): boolean => {
  const hit = BY_ID.get(caseId);
  return !!hit && casesFor(hit.nodeId).at(-1)?.id === caseId;
};

const JUDGED = new Map<string, boolean>();
/** Rerun a played case from its seed and judge the stored call afresh (memoised: runs are pure). A call
 * under a retired ID is judged as the case that replaced it; undefined when neither reads it. */
export function judgedSuccess(caseId: string, answer: CaseAnswer): boolean | undefined {
  const hit = caseById(caseId, answer);
  if (!hit) return undefined;
  const key = `${caseId}|${JSON.stringify(answer)}`;
  if (!JUDGED.has(key)) JUDGED.set(key, judgeCase(hit.case, answer).success);
  return JUDGED.get(key);
}
