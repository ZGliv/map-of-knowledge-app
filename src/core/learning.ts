import type { Activity, AttemptState, Evaluation, Evidence, ObjectiveKey } from './contracts';
import { getActivityById, OBJECTIVES } from './curriculum';

export function criterionKeys(activity: Activity): string[] {
  return activity.kind === 'pair' ? ['valid-pairing', 'complete-pairing', 'surplus'] : activity.kind === 'collection' ? ['prediction', 'observation'] : ['origin', 'unit', 'measure'];
}
const observed = (value: unknown, correct: boolean): 'satisfied' | 'unsatisfied' | 'unobserved' =>
  value === null || value === undefined ? 'unobserved' : correct ? 'satisfied' : 'unsatisfied';
const result = (criteria: Evaluation['criteria'], success: string, failure: string): Evaluation => {
  const passed = Object.values(criteria).every(value => value === 'satisfied');
  return { passed, criteria, feedback: passed ? success : failure };
};

/** Evaluates semantic state only; pointer positions never become learning evidence. */
export function evaluate(activity: Activity, state: AttemptState): Evaluation {
  if (activity.kind === 'pair') {
    const pairs = Object.entries(state.pairs);
    const validSources = new Set(Array.from({ length: activity.sources }, (_, index) => `s${index}`));
    const validReceivers = new Set(Array.from({ length: activity.receivers }, (_, index) => `r${index}`));
    const valid = pairs.every(([source, receiver]) => validSources.has(source) && validReceivers.has(receiver)) && new Set(pairs.map(([, receiver]) => receiver)).size === pairs.length;
    const complete = valid && pairs.length === Math.min(activity.sources, activity.receivers);
    const surplus = activity.sources === activity.receivers ? 'neither' : activity.sources > activity.receivers ? 'sources' : 'receivers';
    const criteria = { 'valid-pairing': observed(pairs.length ? pairs : null, valid), 'complete-pairing': observed(pairs.length ? pairs : null, complete), surplus: observed(state.surplus, state.surplus === surplus) };
    return result(criteria, 'Every possible pair is valid, and your surplus matches what remains.', !valid ? 'Each existing object can belong to only one pair. Keep the valid pairs and repair the reused or unknown object.' : !complete ? 'Some objects can still be paired. Keep your connections and continue matching.' : 'Your pairs work. Look at the unpaired objects and reconsider which side has more.');
  }
  if (activity.kind === 'collection') {
    const correct = activity.answerOptions.includes(state.answer ?? '') && state.answer === activity.correctAnswer && Number(state.answer) === activity.initial + activity.change;
    return result({ prediction: observed(state.answer, correct), observation: state.revealed ? 'satisfied' : 'unobserved' }, 'Your prediction matches the resulting collection.', state.answer === null ? 'Make a prediction before revealing the change.' : !state.revealed ? 'Reveal the change to test your prediction.' : 'Compare the result with your prediction. Did an object move, join, or leave? A fresh check lets you try the idea again.');
  }
  const originCorrect = activity.originOptions.includes(state.origin ?? NaN) && state.origin === activity.start;
  const unitCorrect = activity.unitOptions.includes(state.unit ?? NaN) && state.unit === activity.targetUnit;
  const measureCorrect = activity.answerOptions.includes(state.answer ?? '') && state.answer === activity.correctAnswer && Number(state.answer) * activity.targetUnit === activity.end - activity.start;
  return result({ origin: observed(state.origin, originCorrect), unit: observed(state.unit, unitCorrect), measure: observed(state.answer, measureCorrect) }, 'The start, the unit, and the measure agree. You measured the interval, not just its endpoint.', !originCorrect ? 'Align the measuring origin with the beginning of the marked span. Keep your other choices.' : !unitCorrect ? 'Use the unit size requested in the prompt. The same span can have different numerical measures.' : 'Count the intervals from your chosen start. The endpoint label alone does not tell you the span’s length.');
}

export function qualifiedObjectives(evidence: Evidence[]): ObjectiveKey[] {
  const qualified = new Set<ObjectiveKey>();
  for (const event of evidence) {
    const activity = getActivityById(event.activityId);
    if (!activity || event.assisted || !['transfer', 'retrieval'].includes(event.phase) || activity.phase !== event.phase || event.contentVersion !== activity.contentVersion || event.representationId !== activity.representationId) continue;
    const objective = OBJECTIVES.find(candidate => candidate.key === activity.objective);
    if (!objective || event.objectiveId !== objective.id || !event.eventId.trim()) continue;
    const keys = criterionKeys(activity);
    if (Object.keys(event.criterionResults).length !== keys.length || !keys.every(key => event.criterionResults[key] === 'satisfied')) continue;
    qualified.add(objective.key);
  }
  return OBJECTIVES.filter(objective => qualified.has(objective.key)).map(objective => objective.key);
}
