import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISCOVERIES } from './discoveries';
import type { AttemptInput, LearnerState } from './guideTypes';
import { createLearner, exportLearner, getEarnedIds, getFrontier, LEARNER_KEY, LEARNER_LIMITS, loadLearner, mergeLearner, parseLearner, recordAttempt, saveLearner, updateProfile, visitDiscovery } from './learner';

const first = DISCOVERIES[0];
function input(index = 0, assisted = false, correct = true, discovery = first): AttemptInput {
  const challenge = discovery.challenges[index];
  return { discoveryId: discovery.id, challengeId: challenge.id, answerId: correct ? challenge.correctId : challenge.choices.find((choice) => choice.id !== challenge.correctId)!.id, assisted, phase: index === 0 ? 'probe' : 'transfer' };
}
function memoryStorage(initial?: string) {
  const values = new Map<string, string>(initial === undefined ? [] : [[LEARNER_KEY, initial]]);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const roundTrip = (state: LearnerState) => parseLearner(exportLearner(state));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('learning evidence', () => {
  it('starts without invented history or personal claims', () => {
    const initial = createLearner();
    expect(initial.profile).toEqual({ name: '', goal: 'Understand more of the world, one connection at a time.', interests: [], minutes: 5 });
    expect(initial.attempts).toEqual([]);
    expect(initial.visitedIds).toEqual([]);
    expect(getEarnedIds(initial)).toEqual([]);
  });
  it('does not color from a visit, a probe, a wrong check, or assisted work', () => {
    let state = visitDiscovery(createLearner(), first.id);
    expect(getEarnedIds(state)).toEqual([]);
    state = recordAttempt(state, input());
    expect(getEarnedIds(state)).toEqual([]);
    state = recordAttempt(state, input(1, false, false));
    expect(getEarnedIds(state)).toEqual([]);
    state = recordAttempt(state, input(1, true));
    expect(getEarnedIds(state)).toEqual([]);
  });
  it('earns only the exact footprint after a fresh independent transfer', () => {
    let state = recordAttempt(createLearner(), input(0, true));
    state = recordAttempt(state, input(1));
    expect(getEarnedIds(state)).toEqual([first.footprintId]);
    expect(getEarnedIds(state)).not.toContain(`knowledge.${first.subject}`);
    expect(roundTrip(state)).toEqual(state);
  });
  it('recomputes model-supplied passed, IDs, and time in recordAttempt', () => {
    const wrong = { ...input(1, false, false), passed: true, id: 'made-up-id', at: '2026-01-01T00:00:00.000Z' };
    const state = recordAttempt(createLearner(), wrong);
    expect(state.attempts[0].passed).toBe(false);
    expect(state.attempts[0].id).not.toBe('made-up-id');
    expect(getEarnedIds(state)).toEqual([]);
  });
  it('persists help exposure before an answer and keeps assistance sticky after reload', () => {
    const help = { ...input(1), answerId: '', assisted: true };
    const supported = recordAttempt(createLearner(), help);
    expect(supported.attempts[0]).toMatchObject({ answerId: '', passed: false, assisted: true });
    const attempted = recordAttempt(roundTrip(supported), input(1, false));
    expect(attempted.attempts.at(-1)?.assisted).toBe(true);
    expect(getEarnedIds(attempted)).toEqual([]);
    const fresh = recordAttempt(attempted, input(2, false));
    expect(fresh.attempts.at(-1)?.assisted).toBe(false);
    expect(getEarnedIds(fresh)).toEqual([first.footprintId]);
  });
  it('never turns an already revealed wrong variant into independent evidence', () => {
    const wrong = recordAttempt(createLearner(), input(1, false, false));
    const retried = recordAttempt(wrong, input(1));
    expect(retried.attempts.at(-1)).toMatchObject({ passed: true, assisted: true });
    expect(getEarnedIds(retried)).toEqual([]);
  });
  it('preserves earlier independent evidence when a later revisit needs help', () => {
    const earned = recordAttempt(createLearner(), input(1));
    const later = recordAttempt(earned, { ...input(1), answerId: '', assisted: true });
    expect(getEarnedIds(later)).toEqual([first.footprintId]);
  });
  it('does not mutate caller state and creates independent arrays/profile objects', () => {
    const initial = createLearner();
    const before = JSON.stringify(initial);
    const recorded = recordAttempt(initial, input());
    const updated = updateProfile(recorded, { name: 'Taylor', interests: ['music'] });
    updated.profile.interests.push('physics');
    expect(JSON.stringify(initial)).toBe(before);
    expect(recorded.profile.interests).toEqual([]);
    expect(recorded.attempts).toHaveLength(1);
  });
  it('keeps event IDs stable through exports and clocks strictly increasing when the clock moves backward', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    const initial = createLearner();
    vi.setSystemTime(new Date('2026-09-06T12:00:00.000Z'));
    const state = recordAttempt(recordAttempt(initial, input()), input(1));
    expect(state.attempts[0].at > initial.updatedAt).toBe(true);
    expect(state.attempts[1].at > state.attempts[0].at).toBe(true);
    expect(new Set(state.attempts.map((event) => event.id)).size).toBe(2);
    expect(roundTrip(state).attempts.map((event) => event.id)).toEqual(state.attempts.map((event) => event.id));
  });
  it.each([
    { discoveryId: 'invented' }, { challengeId: 'invented' }, { answerId: 'invented' }, { phase: 'transfer' }, { assisted: 'false' }, { answerId: '', assisted: false },
  ])('rejects an invalid attempt %j', (changes) => {
    expect(() => recordAttempt(createLearner(), { ...input(), ...changes } as AttemptInput)).toThrow();
  });
});

describe('history imports and merges', () => {
  it('recomputes forged results on import instead of accepting earned claims', () => {
    const state = recordAttempt(createLearner(), input(1, false, false));
    const raw = JSON.parse(exportLearner(state));
    raw.attempts[0].passed = true;
    const restored = parseLearner(JSON.stringify(raw));
    expect(restored.attempts[0].passed).toBe(false);
    expect(getEarnedIds(restored)).toEqual([]);
  });
  it('reconstructs omitted assistance from prior wrong feedback, even in reordered imports', () => {
    const state = recordAttempt(recordAttempt(createLearner(), input(1, false, false)), input(1));
    const raw = JSON.parse(exportLearner(state));
    raw.attempts[1].assisted = false;
    raw.attempts.reverse();
    const restored = parseLearner(JSON.stringify(raw));
    expect(restored.attempts[1].assisted).toBe(true);
    expect(getEarnedIds(restored)).toEqual([]);
  });
  it('treats same-time help and correct answers conservatively', () => {
    const state = recordAttempt(recordAttempt(createLearner(), { ...input(1), answerId: '', assisted: true }), input(1));
    const raw = JSON.parse(exportLearner(state));
    raw.attempts[1].at = raw.attempts[0].at;
    raw.attempts[1].assisted = false;
    expect(getEarnedIds(parseLearner(JSON.stringify(raw)))).toEqual([]);
  });
  it('unions stable event IDs without duplicating visits or evidence', () => {
    const base = recordAttempt(createLearner(), input());
    const left = recordAttempt(base, input(1));
    const right = recordAttempt(base, input(0, false, true, DISCOVERIES[1]));
    const merged = mergeLearner(left, right);
    expect(merged.attempts).toHaveLength(3);
    expect(merged.visitedIds).toHaveLength(2);
    expect(mergeLearner(merged, merged)).toEqual(merged);
    expect(getEarnedIds(merged)).toEqual([first.footprintId]);
  });
  it('can remerge an older event copy after support is learned from another tab', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    const base = createLearner();
    const support = recordAttempt(base, { ...input(1), answerId: '', assisted: true });
    vi.setSystemTime(new Date('2026-09-07T12:00:01.000Z'));
    const anotherTab = recordAttempt(base, input(1));
    const reconciled = mergeLearner(support, anotherTab);
    expect(getEarnedIds(reconciled)).toEqual([]);
    expect(mergeLearner(reconciled, anotherTab)).toEqual(reconciled);
  });
  it('chooses the latest profile edit independently of later activity on another tab', () => {
    const base = createLearner();
    const edited = updateProfile(base, { name: 'New name' });
    const activity = recordAttempt(recordAttempt(base, input()), input(1));
    expect(activity.updatedAt > edited.profileUpdatedAt).toBe(true);
    const result = mergeLearner(edited, activity);
    expect(result.profile.name).toBe('New name');
    expect(result.attempts).toHaveLength(2);
    expect(result.updatedAt).toBe(activity.updatedAt);
  });
  it('does not arbitrarily choose between concurrent conflicting profile edits', () => {
    const base = createLearner();
    const left = updateProfile(base, { name: 'Left' });
    const right = updateProfile(base, { name: 'Right' });
    right.profileUpdatedAt = left.profileUpdatedAt;
    right.updatedAt = left.updatedAt;
    expect(() => mergeLearner(left, right)).toThrow(/conflicting profiles/i);
  });
  it('rejects conflicting event IDs atomically in imports and merges', () => {
    const original = recordAttempt(createLearner(), input(1));
    const changed = roundTrip(original);
    changed.attempts[0].answerId = input(1, false, false).answerId;
    expect(() => mergeLearner(original, changed)).toThrow(/Conflicting events/);
    expect(() => parseLearner(JSON.stringify({ ...original, attempts: [original.attempts[0], changed.attempts[0]] }))).toThrow(/Conflicting events/);
    expect(getEarnedIds(original)).toEqual([first.footprintId]);
  });
  it('rejects oversized imports, event counts, unknown versions, missing structures, and future event ordering', () => {
    expect(() => parseLearner('x'.repeat(LEARNER_LIMITS.importLength + 1))).toThrow(/too large/);
    expect(() => parseLearner('{bad')).toThrow(/valid JSON/);
    const state = recordAttempt(createLearner(), input());
    for (const changes of [{ version: 2 }, { attempts: {} }, { visitedIds: ['missing'] }, { updatedAt: 'bad' }, { profileUpdatedAt: '9999-01-01T00:00:00.000Z' }, { updatedAt: '2020-01-01T00:00:00.000Z', profileUpdatedAt: '2020-01-01T00:00:00.000Z' }, { attempts: Array(LEARNER_LIMITS.attempts + 1).fill(state.attempts[0]) }]) {
      expect(() => parseLearner(JSON.stringify({ ...state, ...changes }))).toThrow();
    }
  });
  it('bounds editable profile fields and copies earlier v1 profile clocks', () => {
    const state = createLearner();
    for (const changes of [{ name: 'a'.repeat(81) }, { goal: '' }, { goal: 'a'.repeat(501) }, { minutes: 0 }, { minutes: 1.5 }, { minutes: 61 }, { interests: Array(25).fill('music') }, { interests: [''] }]) expect(() => updateProfile(state, changes)).toThrow();
    const old = JSON.parse(exportLearner(state));
    delete old.profileUpdatedAt;
    expect(parseLearner(JSON.stringify(old)).profileUpdatedAt).toBe(state.updatedAt);
  });
});

describe('learning storage', () => {
  it('round-trips browser storage without changing existing progress or notebook keys', () => {
    const storage = memoryStorage();
    storage.values.set('mok-notebook-v1', 'notebook');
    storage.values.set('mok-next.demo-progress.v1', 'progress');
    const state = recordAttempt(createLearner(), input(1));
    expect(saveLearner(state, storage)).toBeNull();
    expect(loadLearner(storage)).toEqual({ data: state, warning: null });
    expect(storage.values.get('mok-notebook-v1')).toBe('notebook');
    expect(storage.values.get('mok-next.demo-progress.v1')).toBe('progress');
  });
  it('never overwrites unreadable stored bytes during ordinary saves', () => {
    const storage = memoryStorage('{broken original');
    expect(loadLearner(storage).warning).toMatch(/original is untouched/i);
    expect(saveLearner(createLearner(), storage)).toMatch(/blocked/i);
    expect(storage.getItem(LEARNER_KEY)).toBe('{broken original');
  });
  it('backs up and verifies unreadable bytes only during explicit import recovery', () => {
    const storage = memoryStorage('important unreadable history');
    const state = createLearner();
    expect(saveLearner(state, storage, { replaceInvalid: true })).toBeNull();
    const recovery = [...storage.values.entries()].find(([key]) => key.startsWith(`${LEARNER_KEY}.recovery.`));
    expect(recovery?.[1]).toBe('important unreadable history');
    expect(loadLearner(storage).data).toEqual(state);
  });
  it('keeps the original when a recovery copy cannot be written or verified', () => {
    const storage = memoryStorage('original');
    const broken = { getItem: storage.getItem, setItem: (key: string, value: string) => { if (!key.includes('.recovery.')) storage.setItem(key, value); } };
    expect(saveLearner(createLearner(), broken, { replaceInvalid: true })).toMatch(/recovery copy/i);
    expect(storage.getItem(LEARNER_KEY)).toBe('original');
  });
  it('reports unavailable, throwing, quota-limited, and silently dropped storage', () => {
    const inaccessible = { getItem: () => { throw Error('denied'); }, setItem: () => {} };
    expect(loadLearner(inaccessible).warning).toMatch(/denied/);
    expect(saveLearner(createLearner(), inaccessible)).toMatch(/denied/);
    const quota = { getItem: () => null, setItem: () => { throw Error('quota'); } };
    expect(saveLearner(createLearner(), quota)).toMatch(/quota/);
    expect(saveLearner(createLearner(), { getItem: () => null, setItem: () => {} })).toMatch(/did not retain/);
    vi.stubGlobal('localStorage', undefined);
    expect(loadLearner().warning).toMatch(/unavailable/);
  });
});

describe('explainable frontier', () => {
  it('offers deterministic, unlocked starting points with uncertainty', () => {
    const state = createLearner();
    expect(getFrontier(state)).toHaveLength(3);
    expect(getFrontier(state)).toEqual(getFrontier(state));
    expect(getFrontier(state)[0].reason).toMatch(/not enough evidence/i);
    expect(getFrontier(state, undefined, 99)).toHaveLength(9);
    expect(getFrontier(state, undefined, 0)).toEqual([]);
  });
  it('respects map context and explicitly chosen interests', () => {
    const initial = createLearner();
    expect(getFrontier(initial, 'knowledge.technology')[0].discovery.subject).toBe('technology');
    const interested = updateProfile(initial, { interests: ['ecology'] });
    expect(getFrontier(interested)[0].discovery.subject).toBe('earth');
    expect(getFrontier(interested)[0].reason).toContain('ecology');
  });
  it('suggests fresh supported practice without claiming mastery, then a music–fraction bridge', () => {
    const supported = recordAttempt(createLearner(), { ...input(1), answerId: '', assisted: true });
    const suggestion = getFrontier(supported)[0];
    expect(suggestion.discovery.id).toBe(first.id);
    expect(suggestion.reason).toMatch(/fresh example/i);
    expect(suggestion.kind).toBe('revisit');
    const earned = recordAttempt(supported, input(2));
    expect(getFrontier(earned)[0].discovery.id).toBe('fractions-past-one');
    expect(getFrontier(earned)[0].kind).toBe('bridge');
    const revisit = getFrontier(earned, undefined, 9).find((candidate) => candidate.discovery.id === first.id)!;
    expect(revisit.reason).toMatch(/not a claim of mastery/);
  });
  it('honestly labels exhausted examples as supported revisits', () => {
    let state = createLearner();
    for (const index of [1, 2]) state = recordAttempt(state, { ...input(index), answerId: '', assisted: true });
    const suggestions = getFrontier(state, undefined, 9);
    expect(suggestions[0].discovery.id).not.toBe(first.id);
    expect(suggestions.find(suggestion => suggestion.discovery.id === first.id)?.reason).toMatch(/repeating a revealed answer will not/i);
    expect(getFrontier(state, first.topicId)[0].discovery.id).toBe(first.id);
  });
});
