import type { Activity, ActivityBase, CollectionActivity, Objective, ObjectiveKey, PairActivity, Phase, RulerActivity } from './contracts';

export const CONTENT_VERSION = '1.0.0';
const standardsUrl = 'https://www.cde.ca.gov/be/st/ss/documents/ccssmathstandardaug2013.pdf';
export const SOURCES = [
  { id: 'counting', title: 'Counting and cardinality · K.CC.3–6', url: `${standardsUrl}#page=19`, note: 'Source for the mathematical objectives; these encounters assess only the stated narrow criteria.' },
  { id: 'measurement', title: 'Equal length units · 1.MD.2 and 2.MD.2', url: `${standardsUrl}#page=24`, note: 'Measurement depends on equal units and on which unit is chosen.' },
  { id: 'number-line', title: 'Number-line intervals · 2.MD.6', url: `${standardsUrl}#page=28`, note: 'The demo uses exact equal steps from a declared starting point.' },
  { id: 'fractions', title: 'Fractions as repeated unit lengths · 3.NF.1–2', url: `${standardsUrl}#page=33`, note: 'The demo checks quarter-unit iteration, not general fraction proficiency.' },
];

const objective = (key: ObjectiveKey, title: string, statement: string, prerequisites: ObjectiveKey[], criteria: string[], sourceRefs: string[]): Objective =>
  ({ key, id: `demo.math.v1.${key}`, title, statement, prerequisites, criteria, sourceRefs, version: CONTENT_VERSION });

export const OBJECTIVES: Objective[] = [
  objective('pair-surplus', 'Correspondence', 'Pair two collections without reuse and identify which has a surplus.', [], ['valid-pairing', 'complete-pairing', 'surplus'], ['counting']),
  objective('quantity-symbol', 'Number', 'Match a small whole quantity to its written numeral.', [], ['prediction', 'observation'], ['counting']),
  objective('count-invariance', 'Cardinality', 'Distinguish rearranging a collection from changing its membership.', ['pair-surplus', 'quantity-symbol'], ['prediction', 'observation'], ['counting']),
  objective('zero-empty', 'Zero', 'Use zero to describe a collection after its last members leave.', ['quantity-symbol'], ['prediction', 'observation'], ['counting']),
  objective('equal-units', 'Unitizing', 'Choose a specified equal unit and use its repeats to quantify a span.', ['quantity-symbol', 'count-invariance'], ['origin', 'unit', 'measure'], ['measurement']),
  objective('unit-path', 'Number Line', 'Count exact equal steps from a declared starting point.', ['quantity-symbol', 'zero-empty', 'equal-units'], ['origin', 'unit', 'measure'], ['number-line']),
  objective('measure-interval', 'Measurement', 'Align a measure with a span’s start and distinguish its length from its endpoint label.', ['equal-units', 'unit-path'], ['origin', 'unit', 'measure'], ['measurement', 'number-line']),
  objective('quarter-unit-path', 'Fractions', 'Iterate quarter-unit lengths past one whole and count the resulting steps.', ['measure-interval', 'unit-path'], ['origin', 'unit', 'measure'], ['fractions']),
];

function base(key: ObjectiveKey, phase: Phase, title: string, prompt: string, hint: string, explanation: string, representation: string): ActivityBase {
  return { id: `${key}-${phase}`, objective: key, phase, title, prompt, hint, explanation, representationId: representation, contentVersion: CONTENT_VERSION };
}
const pair = (phase: Phase, sources: number, receivers: number, sourceLabel: string, receiverLabel: string, title: string): PairActivity => ({
  ...base('pair-surplus', phase, title, `Connect each ${sourceLabel} to a different ${receiverLabel}. Make every possible pair, then identify the surplus.`, 'Select an object on the left, then one on the right. No object can belong to two pairs. Compare what remains.', 'A one-to-one match compares quantities without depending on their arrangement. If every object can be paired, the quantities are equal; otherwise the unpaired side has more.', `${sourceLabel}-${receiverLabel}-${phase}`),
  kind: 'pair', sources, receivers, sourceLabel, receiverLabel,
});
const collection = (key: ObjectiveKey, phase: Phase, initial: number, change: number, rearrange: boolean, arrangement: CollectionActivity['arrangement'], title: string, prompt: string, hint: string, explanation: string): CollectionActivity => {
  const correct = initial + change;
  const values = correct === 0 ? [0, 1, initial] : [Math.max(0, correct - 1), correct, correct + 1];
  return { ...base(key, phase, title, prompt, hint, explanation, `${arrangement}-${rearrange ? 'rearrange' : change === 0 ? 'symbol' : 'membership'}-${phase}`), kind: 'collection', initial, change, rearrange, arrangement,
    answerOptions: [...new Set(values)].map(String), correctAnswer: String(correct), actionLabel: rearrange ? 'Rearrange' : change < 0 ? `Remove ${-change}` : change > 0 ? `Add ${change}` : 'Reveal the count' };
};

export const tickLabel = (ticks: number): string => String(ticks / 4);
const unitName = (ticks: number): string => ticks === 1 ? 'quarter-unit' : ticks === 2 ? 'half-unit' : 'unit';
function ruler(key: ObjectiveKey, phase: Phase, start: number, end: number, targetUnit: number, title: string, prompt: string, explanation: string, representation: string): RulerActivity {
  const count = (end - start) / targetUnit;
  return { ...base(key, phase, title, prompt, 'Place the measuring origin at the span’s beginning. Choose the requested unit. Count the distances between marks, not the marks themselves.', explanation, representation), kind: 'ruler', start, end, targetUnit,
    originOptions: [...new Set([0, start, start === 0 ? 4 : start + 4])].sort((a, b) => a - b), unitOptions: [1, 2, 4], answerOptions: [...new Set([count - 1, count, count + 1])].filter(n => n >= 0).map(String), correctAnswer: String(count), unitLabel: unitName(targetUnit) };
}

export const ACTIVITIES: Activity[] = [
  pair('practice', 7, 6, 'signal', 'receiver', 'Enough without counting'),
  pair('transfer', 5, 7, 'traveler', 'seat', 'A different kind of surplus'),
  pair('retrieval', 6, 6, 'seed', 'pot', 'Exactly enough'),

  collection('quantity-symbol', 'practice', 5, 0, false, 'ring', 'One number, many objects', 'Which numeral names the quantity here? Choose before revealing the count.', 'Count each dot once. Its size and position do not become part of the number.', 'The numeral records how many objects there are. Five can describe five lights, five stones, or five ideas.'),
  collection('quantity-symbol', 'transfer', 8, 0, false, 'scatter', 'Read the constellation', 'These objects are scattered. Which numeral represents their quantity?', 'A counting route can help you avoid visiting a dot twice.', 'Changing the layout changes where you look, but a numeral still records the whole quantity.'),
  collection('quantity-symbol', 'retrieval', 6, 0, false, 'grid', 'Recognize the quantity', 'Give the quantity a numeral, then reveal it to check.', 'Match one count to one object.', 'The symbol names the collection’s quantity, independently of its arrangement.'),

  collection('count-invariance', 'practice', 7, 0, true, 'ring', 'Movement is not more', 'The dots will spread into a new arrangement. Predict how many will remain.', 'Nothing enters or leaves. Follow membership rather than the space occupied.', 'Spreading objects out can make a collection look larger. Rearrangement changes positions, not membership or quantity.'),
  collection('count-invariance', 'transfer', 6, 1, false, 'grid', 'This time, something changes', 'One new dot will join the collection. Predict the final quantity.', 'Distinguish a new member from a member moving to a new place.', 'Quantity stays fixed under rearrangement, but adding a member changes it. The condition matters.'),
  collection('count-invariance', 'retrieval', 8, -2, false, 'scatter', 'Keep track of membership', 'Two dots will leave. Predict how many will remain.', 'Count what leaves only once; the others stay members.', 'A quantity changes when membership changes, even if the overall shape looks similar.'),

  collection('zero-empty', 'practice', 4, -4, false, 'grid', 'A number for nothing here', 'All four dots will leave. Which numeral will describe what remains?', 'An empty collection still has a quantity. It is not an unanswered question.', 'Zero lets us distinguish an empty collection from a missing measurement. Here, we know that nothing remains.'),
  collection('zero-empty', 'transfer', 7, -7, false, 'ring', 'The last light leaves', 'Every light will leave this ring. Predict its final quantity.', 'Track the collection after all its members leave.', 'Zero describes the resulting empty collection, regardless of how many members it had before.'),
  collection('zero-empty', 'retrieval', 3, -3, false, 'scatter', 'Empty is precise', 'Three dots will leave this collection of three. What quantity will remain?', 'There will be no unremoved member.', 'Zero is a precise count of an empty collection.'),

  ruler('equal-units', 'practice', 0, 12, 4, 'Choose what one means', 'Measure the span with steps of size 1. Set the start and the unit, then predict the number of steps.', 'An equal unit is a repeatable length. Three copies of a size-1 unit span length 3.', 'whole-unit-rail'),
  ruler('equal-units', 'transfer', 4, 16, 2, 'A smaller unit, a larger count', 'Use steps of size 0.5 to cover this span. How many half-units fit?', 'The span has not grown because the count is larger. Smaller measuring units require more repeats.', 'half-unit-ribbon'),
  ruler('equal-units', 'retrieval', 0, 8, 1, 'Name the unit first', 'Use steps of size 0.25. How many quarter-units cover the span?', 'A numerical measure needs its unit: eight quarter-units cover the same length as two whole units.', 'quarter-unit-strip'),

  ruler('unit-path', 'practice', 0, 16, 4, 'Positions come from steps', 'Start at the beginning of the marked span. Use size-1 steps. How many steps reach its end?', 'A step is the interval between adjacent marks. The starting mark is a position, not a completed step.', 'origin-path'),
  ruler('unit-path', 'transfer', 8, 24, 4, 'Starting somewhere else', 'Begin at position 2 and use size-1 steps. How many steps reach position 6?', 'The endpoint is a location. The number of steps describes the distance from the chosen start.', 'offset-path'),
  ruler('unit-path', 'retrieval', 4, 16, 2, 'Follow half-steps', 'Begin at the marked span’s start. Use size-0.5 steps and count how many reach its end.', 'Changing the step size changes the count while the two endpoint positions stay fixed.', 'half-step-path'),

  ruler('measure-interval', 'practice', 8, 20, 4, 'Two correct measurements disagree', 'The span begins at 2 and ends at 5. Align the measuring origin, use size-1 units, and predict its length in those units.', 'The endpoint says 5, but the span is 3 units long: 5 − 2. Measuring with half-sized units would give 6. Both counts are correct when their units are stated.', 'offset-bridge-whole'),
  ruler('measure-interval', 'transfer', 6, 18, 2, 'Same length, new instrument', 'This span begins at 1.5 and ends at 4.5. Use size-0.5 units. How many half-units span the gap?', 'The interval is three whole units long. Six half-units cover that interval. Moving the origin or changing the unit does not change the object.', 'offset-ribbon-half'),
  ruler('measure-interval', 'retrieval', 12, 28, 4, 'Read the gap, not the label', 'Measure from 3 to 7 using size-1 units. Set the measuring origin and predict the count.', 'A length comes from the difference between endpoints, expressed in a declared unit.', 'offset-rail-return'),

  ruler('quarter-unit-path', 'practice', 0, 7, 1, 'A fraction can pass one', 'Build from 0 to 1.75 with steps of size 0.25. How many quarter-units are needed?', 'Four quarters reach one whole. Three more quarters reach 1.75. The same fractional unit keeps working beyond one.', 'quarter-path-first'),
  ruler('quarter-unit-path', 'transfer', 4, 13, 1, 'Carry the unit across a boundary', 'Start at 1 and reach 3.25 with size-0.25 steps. How many quarter-units span this interval?', 'Nine quarter-units make a length of 2.25. Starting at 1 puts the endpoint at 3.25; length and endpoint are different quantities.', 'quarter-path-offset'),
  ruler('quarter-unit-path', 'retrieval', 0, 11, 1, 'Keep going with quarters', 'Use size-0.25 steps from 0 to 2.75. How many quarter-units reach the endpoint?', 'Eleven quarters make two wholes and three quarters. A fraction is not confined to one whole.', 'quarter-path-return'),
];

export const SYNTHESIS: RulerActivity = {
  ...ruler('measure-interval', 'transfer', 5, 12, 4, 'The ruler starts in the wrong place', 'The span runs from 1.25 to 3. Use a size-1 unit, align the measuring origin, and report the length in whole units. A fractional answer is allowed.', 'The length is 3 − 1.25 = 1.75 units. That is seven quarter-units, but 1.75 whole units. The origin, the unit, and the count each play a different role.', 'synthesis-offset-fraction'),
  id: 'synthesis-transfer', answerOptions: ['1.25', '1.75', '3'],
};

export function getActivity(key: ObjectiveKey, phase: Phase): Activity {
  const found = ACTIVITIES.find(activity => activity.objective === key && activity.phase === phase);
  if (!found) throw new Error(`Unknown activity: ${key}/${phase}`);
  return found;
}

/** Fresh checks are reproducible from their IDs, so saved evidence remains auditable. */
export function freshCheck(key: ObjectiveKey, nonce: number): Activity {
  if (!Number.isSafeInteger(nonce) || nonce < 1 || nonce > 9999) throw new Error('Fresh-check number must be between 1 and 9999.');
  const template = getActivity(key, 'transfer');
  let next: Activity;
  if (template.kind === 'pair') {
    const sources = 3 + nonce % 5;
    const receivers = Math.max(2, Math.min(8, sources + [1, -1, 0][nonce % 3]));
    next = pair('transfer', sources, receivers, 'signal', 'receiver', 'A fresh correspondence');
  } else if (template.kind === 'collection') {
    let initial = 3 + nonce % 6;
    // Even the first check after a reveal must not repeat the revealed quantity.
    if (initial === template.initial) initial = initial === 8 ? 3 : initial + 1;
    const change = key === 'zero-empty' ? -initial : key === 'count-invariance' ? [0, 1, -1][nonce % 3] : 0;
    const rearrange = key === 'count-invariance' && change === 0;
    const action = change < 0 ? `${-change} will leave` : change > 0 ? `${change} will join` : rearrange ? 'they will move to new positions' : 'none will enter or leave';
    next = collection(key, 'transfer', initial, change, rearrange, (['scatter', 'ring', 'grid'] as const)[nonce % 3], 'A fresh prediction', `There are ${initial} dots; ${action}. Predict the final quantity before revealing it.`, 'Track the members of the collection, not how much space they occupy.', template.explanation);
  } else {
    // Quarter-offset origins differ from every authored transfer's whole/half origin.
    const start = 1 + 2 * (nonce % 4);
    const targetUnit = key === 'quarter-unit-path' ? 1 : ([4, 2, 1] as const)[nonce % 3];
    const count = key === 'quarter-unit-path' ? 5 + nonce % 7 : 3 + nonce % 5;
    const end = start + count * targetUnit;
    next = ruler(key, 'transfer', start, end, targetUnit, 'A fresh instrument', `Measure from ${tickLabel(start)} to ${tickLabel(end)} with steps of size ${tickLabel(targetUnit)}. How many ${unitName(targetUnit)}s span the interval?`, 'Measure the difference between the endpoints in the requested unit. A new origin changes endpoint labels; a new unit changes the numerical measure.', 'fresh-offset-instrument');
  }
  return { ...next, id: `${key}-transfer-retry-${nonce}`, representationId: `${next.representationId}-variation-${nonce}` };
}

export function getActivityById(id: string): Activity | undefined {
  const fixed = id === SYNTHESIS.id ? SYNTHESIS : ACTIVITIES.find(activity => activity.id === id);
  if (fixed) return fixed;
  const match = /^(.*)-transfer-retry-([1-9]\d{0,3})$/.exec(id);
  if (!match || !OBJECTIVES.some(objective => objective.key === match[1])) return undefined;
  return freshCheck(match[1] as ObjectiveKey, Number(match[2]));
}
