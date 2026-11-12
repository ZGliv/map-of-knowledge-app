import { describe, expect, it } from 'vitest';
import { blankAttempt } from './contracts';
import type { Activity, AttemptState, Evidence } from './contracts';
import { ACTIVITIES, CONTENT_VERSION, freshCheck, getActivity, getActivityById, OBJECTIVES, SOURCES, SYNTHESIS } from './curriculum';
import { criterionKeys, evaluate, qualifiedObjectives } from './learning';

function solution(activity: Activity): AttemptState {
  const state = blankAttempt();
  if (activity.kind === 'pair') {
    for (let i = 0; i < Math.min(activity.sources, activity.receivers); i++) state.pairs[`s${i}`] = `r${i}`;
    state.surplus = activity.sources === activity.receivers ? 'neither' : activity.sources > activity.receivers ? 'sources' : 'receivers';
  } else if (activity.kind === 'collection') {
    state.answer = activity.correctAnswer;
    state.revealed = true;
  } else {
    state.origin = activity.start;
    state.unit = activity.targetUnit;
    state.answer = activity.correctAnswer;
  }
  return state;
}
function evidence(activity: Activity, overrides: Partial<Evidence> = {}): Evidence {
  return { eventId: `${activity.id}-pass`, objectiveId: OBJECTIVES.find(objective => objective.key === activity.objective)!.id, activityId: activity.id,
    contentVersion: CONTENT_VERSION, representationId: activity.representationId, phase: activity.phase, assisted: false,
    criterionResults: evaluate(activity, solution(activity)).criteria, occurredAt: '2026-09-06T12:00:00.000Z', ...overrides };
}

describe('authored curriculum integrity', () => {
  it('has a closed acyclic prerequisite graph and real source references for all eight narrow objectives', () => {
    expect(OBJECTIVES).toHaveLength(8);
    expect(new Set(OBJECTIVES.map(objective => objective.id)).size).toBe(8);
    const visit = (key: string, path: string[]) => {
      expect(path).not.toContain(key);
      const objective = OBJECTIVES.find(candidate => candidate.key === key);
      expect(objective, `missing objective ${key}`).toBeDefined();
      objective!.prerequisites.forEach(prerequisite => visit(prerequisite, [...path, key]));
    };
    for (const objective of OBJECTIVES) {
      expect(objective.id).toBe(`demo.math.v1.${objective.key}`);
      visit(objective.key, []);
      expect(objective.sourceRefs.length).toBeGreaterThan(0);
      objective.sourceRefs.forEach(ref => expect(SOURCES.some(source => source.id === ref && source.url.startsWith('https://'))).toBe(true));
    }
  });

  it('has distinct practice, transfer and retrieval content that is internally solvable', () => {
    expect(ACTIVITIES).toHaveLength(24);
    expect(new Set(ACTIVITIES.map(activity => activity.id)).size).toBe(24);
    for (const objective of OBJECTIVES) {
      const phases = ACTIVITIES.filter(activity => activity.objective === objective.key);
      expect(new Set(phases.map(activity => activity.phase))).toEqual(new Set(['practice', 'transfer', 'retrieval']));
      expect(new Set(phases.map(activity => activity.representationId)).size).toBe(3);
      for (const activity of phases) {
        expect(criterionKeys(activity)).toEqual(objective.criteria);
        expect(evaluate(activity, solution(activity)).passed, activity.id).toBe(true);
        expect(evaluate(activity, blankAttempt()).passed, `${activity.id} cannot pass by opening it`).toBe(false);
      }
    }
  });

  it('checks both rearrangement and membership change, and all fraction phases pass a whole boundary', () => {
    const invariance = ACTIVITIES.filter(activity => activity.objective === 'count-invariance');
    expect(invariance.some(activity => activity.kind === 'collection' && activity.rearrange && activity.change === 0)).toBe(true);
    expect(invariance.some(activity => activity.kind === 'collection' && activity.change !== 0)).toBe(true);
    for (const activity of ACTIVITIES.filter(activity => activity.objective === 'quarter-unit-path')) {
      expect(activity.kind).toBe('ruler');
      if (activity.kind === 'ruler') {
        expect(activity.targetUnit).toBe(1);
        expect(activity.end - activity.start).toBeGreaterThan(4);
      }
    }
  });
});

describe('semantic evaluation', () => {
  it('accepts arbitrary bijections and arbitrary unmatched objects, not one memorized wiring order', () => {
    const activity = getActivity('pair-surplus', 'practice');
    const state = solution(activity);
    state.pairs = { s6: 'r0', s4: 'r1', s2: 'r2', s0: 'r3', s5: 'r4', s1: 'r5' };
    expect(evaluate(activity, state).passed).toBe(true);
    const equal = getActivity('pair-surplus', 'retrieval');
    expect(evaluate(equal, { ...state, pairs: { s5: 'r0', s4: 'r1', s3: 'r2', s2: 'r3', s1: 'r4', s0: 'r5' }, surplus: 'neither' }).passed).toBe(true);
  });

  it('rejects duplicate receivers, fabricated IDs, incomplete pairs, and wrong surplus without mutating work', () => {
    const activity = getActivity('pair-surplus', 'practice');
    const cases: AttemptState[] = [
      { ...solution(activity), pairs: { s0: 'r0', s1: 'r0', s2: 'r2', s3: 'r3', s4: 'r4', s5: 'r5' } },
      { ...solution(activity), pairs: { s0: 'r0', s1: 'r1', s2: 'r2', s3: 'r3', s4: 'r4', s7: 'r5' } },
      { ...solution(activity), pairs: { s0: 'r0', s1: 'r1' } },
      { ...solution(activity), surplus: 'receivers' as const },
    ];
    for (const state of cases) {
      const before = structuredClone(state);
      expect(evaluate(activity, state).passed).toBe(false);
      expect(state).toEqual(before);
    }
    expect(evaluate(activity, cases[3]).criteria['complete-pairing']).toBe('satisfied');
  });

  it('requires a committed prediction and observation; revealing cannot repair an incorrect prediction', () => {
    const activity = getActivity('count-invariance', 'practice');
    const right = solution(activity);
    expect(evaluate(activity, { ...right, revealed: false }).passed).toBe(false);
    expect(evaluate(activity, { ...right, answer: null }).passed).toBe(false);
    expect(evaluate(activity, { ...right, answer: '8' }).passed).toBe(false);
    expect(evaluate(activity, right).passed).toBe(true);
  });

  it('distinguishes an offset endpoint, a unit choice, and the interval count', () => {
    const activity = getActivity('measure-interval', 'practice');
    expect(activity.kind).toBe('ruler');
    const right = solution(activity);
    expect(right).toMatchObject({ origin: 8, unit: 4, answer: '3' });
    expect(evaluate(activity, right).passed).toBe(true);
    expect(evaluate(activity, { ...right, origin: 0 }).criteria).toEqual({ origin: 'unsatisfied', unit: 'satisfied', measure: 'satisfied' });
    expect(evaluate(activity, { ...right, answer: '5' }).passed).toBe(false);
    expect(evaluate(activity, { ...right, unit: 2, answer: '6' }).passed).toBe(false);
    const half = getActivity('measure-interval', 'transfer');
    expect(solution(half)).toMatchObject({ origin: 6, unit: 2, answer: '6' });
    expect(evaluate(half, solution(half)).passed).toBe(true);
  });

  it('accepts an exact fractional whole-unit result in the synthesis', () => {
    expect(evaluate(SYNTHESIS, { ...blankAttempt(), origin: 5, unit: 4, answer: '1.75' }).passed).toBe(true);
    expect(evaluate(SYNTHESIS, { ...blankAttempt(), origin: 5, unit: 4, answer: '3' }).passed).toBe(false);
    expect(evaluate(SYNTHESIS, { ...blankAttempt(), origin: 5, unit: 1, answer: '7' }).passed).toBe(false);
  });
});

describe('qualification boundaries', () => {
  const transfer = getActivity('measure-interval', 'transfer');
  it('grants only a directly demonstrated objective, even for skip-ahead or synthesis', () => {
    expect(qualifiedObjectives([evidence(transfer)])).toEqual(['measure-interval']);
    expect(qualifiedObjectives([evidence(SYNTHESIS)])).toEqual(['measure-interval']);
    expect(qualifiedObjectives([evidence(getActivity('quarter-unit-path', 'transfer'))])).toEqual(['quarter-unit-path']);
    expect(qualifiedObjectives([evidence(getActivity('zero-empty', 'retrieval'))])).toEqual(['zero-empty']);
  });

  it('does not convert practice, assistance, partial results, or unknown/revised content into qualification', () => {
    const bad = [
      evidence(getActivity('measure-interval', 'practice')),
      evidence(transfer, { assisted: true }),
      evidence(transfer, { criterionResults: { origin: 'satisfied', unit: 'satisfied', measure: 'unsatisfied' } }),
      evidence(transfer, { criterionResults: {} }),
      evidence(transfer, { criterionResults: { origin: 'satisfied', unit: 'satisfied' } }),
      evidence(transfer, { criterionResults: { origin: 'satisfied', unit: 'satisfied', measure: 'satisfied', invented: 'satisfied' } }),
      evidence(transfer, { objectiveId: 'demo.math.v1.quarter-unit-path' }),
      evidence(transfer, { activityId: 'missing-activity' }),
      evidence(transfer, { contentVersion: '0.0.0' }),
      evidence(transfer, { representationId: 'already-seen-solution' }),
      evidence(transfer, { phase: 'retrieval' }),
    ];
    for (const event of bad) expect(qualifiedObjectives([event]), JSON.stringify(event)).toEqual([]);
  });

  it('does not duplicate rewards or erase prior achievement after a failed review', () => {
    const pass = evidence(transfer);
    const failed = evidence(getActivity('measure-interval', 'retrieval'), { criterionResults: { origin: 'satisfied', unit: 'satisfied', measure: 'unsatisfied' } });
    expect(qualifiedObjectives([pass, pass, { ...pass, eventId: 'another-pass' }, failed])).toEqual(['measure-interval']);
  });
});

describe('fresh independent checks', () => {
  it('round-trips bounded dynamic IDs and rejects ambiguous or invalid IDs', () => {
    for (const objective of OBJECTIVES) {
      for (const nonce of [1, 2, 13, 9999]) {
        const fresh = freshCheck(objective.key, nonce);
        expect(getActivityById(fresh.id)).toEqual(fresh);
        expect(fresh.phase).toBe('transfer');
        expect(fresh.representationId).not.toBe(getActivity(objective.key, 'transfer').representationId);
        expect(evaluate(fresh, solution(fresh)).passed).toBe(true);
        expect(qualifiedObjectives([evidence(fresh)])).toEqual([objective.key]);
      }
    }
    for (const id of ['zero-empty-transfer-retry-0', 'zero-empty-transfer-retry-01', 'zero-empty-transfer-retry-10000', 'unknown-transfer-retry-1', 'zero-empty-transfer-retry-1.5']) expect(getActivityById(id)).toBeUndefined();
    expect(() => freshCheck('zero-empty', 0)).toThrow();
    expect(() => freshCheck('zero-empty', NaN)).toThrow();
  });

  it('changes the exposed collection quantity or origin rather than only renaming the same question', () => {
    for (const objective of OBJECTIVES) {
      const template = getActivity(objective.key, 'transfer');
      for (let nonce = 1; nonce < 50; nonce++) {
        const fresh = freshCheck(objective.key, nonce);
        if (fresh.kind === 'collection' && template.kind === 'collection') expect(fresh.initial).not.toBe(template.initial);
        if (fresh.kind === 'ruler' && template.kind === 'ruler') expect(fresh.start).not.toBe(template.start);
      }
    }
  });
});
