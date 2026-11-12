import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankAttempt, type Evidence, type ObjectiveKey, type Phase } from './contracts';
import { getActivity, freshCheck, OBJECTIVES } from './curriculum';
import { criterionKeys } from './learning';
import { MAX_EVIDENCE_EVENTS, STORAGE_KEY, addEvidence, createSave, exportSave, getDueObjectives, loadSave, parseImport, writeSave } from './persistence';

const DAY = 86_400_000;
const START = Date.parse('2026-09-01T12:00:00.000Z');
class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
function event(key: ObjectiveKey = 'pair-surplus', phase: Phase = 'transfer', day = 0, overrides: Partial<Evidence> = {}): Evidence {
  const activity = getActivity(key, phase);
  return {
    eventId: `${key}-${phase}-${day}`, objectiveId: OBJECTIVES.find((objective) => objective.key === key)!.id, activityId: activity.id,
    contentVersion: activity.contentVersion, representationId: activity.representationId,
    phase, assisted: false, criterionResults: Object.fromEntries(criterionKeys(activity).map((criterion) => [criterion, 'satisfied' as const])),
    occurredAt: new Date(START + day * DAY).toISOString(), ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('save integrity and recovery', () => {
  it('round-trips an interrupted activity and immutable earned evidence', () => {
    const storage = new MemoryStorage();
    const activity = getActivity('pair-surplus', 'practice');
    const original = createSave();
    const save = addEvidence(original, event());
    save.encounter = { activityId: activity.id, contentVersion: activity.contentVersion, assisted: true, state: { ...blankAttempt(), pairs: { s0: 'r0' }, surplus: 'sources' } };
    expect(original.evidence).toEqual([]);
    expect(writeSave(save, storage)).toBeNull();
    expect(loadSave(storage)).toEqual({ data: save, warning: null });
    expect(parseImport(exportSave(save))).toEqual(save);
  });

  it('deduplicates event IDs while rejecting conflicting evidence', () => {
    const one = addEvidence(createSave(), event());
    expect(addEvidence(one, event())).toBe(one);
    expect(parseImport(JSON.stringify({ ...one, evidence: [event(), event()] })).evidence).toHaveLength(1);
    expect(() => addEvidence(one, event('pair-surplus', 'transfer', 0, { assisted: true }))).toThrow(/Conflicting evidence/);
    expect(() => parseImport(JSON.stringify({ ...one, evidence: [event(), event('pair-surplus', 'transfer', 0, { assisted: true })] }))).toThrow(/Conflicting evidence/);
  });

  it.each([
    ['unknown objective', { objectiveId: 'invented' }, /Unknown objective/],
    ['unknown activity', { activityId: 'invented' }, /Unknown activity/],
    ['objective mismatch', { objectiveId: OBJECTIVES.find((objective) => objective.key === 'zero-empty')!.id }, /does not match/],
    ['stale content', { contentVersion: '0.1.0' }, /version/],
    ['representation mismatch', { representationId: 'invented' }, /representation/],
    ['phase mismatch', { phase: 'practice' }, /phase/],
    ['missing criteria', { criterionResults: {} }, /exactly/],
    ['invalid timestamp', { occurredAt: 'yesterday' }, /timestamp/],
    ['impossible calendar date', { occurredAt: '2026-02-30T12:00:00.000Z' }, /timestamp/],
  ])('rejects %s during import', (_label, changes, error) => {
    expect(() => parseImport(JSON.stringify({ ...createSave(), evidence: [{ ...event(), ...changes }] }))).toThrow(error);
  });

  it('rejects invalid criterion statuses and invalid save envelopes', () => {
    const bad = event();
    bad.criterionResults[Object.keys(bad.criterionResults)[0]] = 'complete' as never;
    expect(() => parseImport(JSON.stringify({ ...createSave(), evidence: [bad] }))).toThrow(/criterion status/);
    expect(() => parseImport('{oops')).toThrow(/valid JSON/);
    expect(() => parseImport(JSON.stringify({ ...createSave(), version: 2 }))).toThrow(/Unsupported save version/);
    expect(() => parseImport(JSON.stringify({ ...createSave(), updatedAt: '2026-09-01' }))).toThrow(/timestamp/);
  });

  it('quarantines a damaged original before permitting a fresh save', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{damaged');
    const loaded = loadSave(storage);
    expect(loaded.warning).toMatch(/original is preserved/);
    expect(loaded.data.evidence).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    const recovery = [...storage.values.entries()].find(([key]) => key.startsWith(`${STORAGE_KEY}.quarantine.`));
    expect(recovery?.[1]).toBe('{damaged');
    expect(writeSave(loaded.data, storage)).toBeNull();
  });

  it('does not overwrite an old save when recovery storage is full', () => {
    const storage = new MemoryStorage();
    const old = JSON.stringify({ ...createSave(), version: 0 });
    storage.setItem(STORAGE_KEY, old);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(loadSave(storage).warning).toMatch(/new saves are blocked/);
    expect(storage.getItem(STORAGE_KEY)).toBe(old);
    expect(writeSave(createSave(), storage)).toMatch(/blocked/);
    expect(storage.getItem(STORAGE_KEY)).toBe(old);
  });

  it('keeps evidence when only an encounter revision is stale', () => {
    const storage = new MemoryStorage();
    const save = addEvidence(createSave(), event());
    save.encounter = { activityId: getActivity('pair-surplus', 'practice').id, contentVersion: 'old', state: blankAttempt(), assisted: false };
    const raw = JSON.stringify(save);
    expect(() => parseImport(raw)).toThrow(/different content revision/);
    storage.setItem(STORAGE_KEY, raw);
    const loaded = loadSave(storage);
    expect(loaded.warning).toMatch(/learning history was restored/);
    expect(loaded.data.evidence).toEqual(save.evidence);
    expect(loaded.data.encounter).toBeNull();
    expect([...storage.values.values()]).toContain(raw);
  });

  it('rejects unsafe pairing IDs and unavailable ruler options', () => {
    const pair = getActivity('pair-surplus', 'practice');
    const ruler = getActivity('measure-interval', 'practice');
    expect(() => parseImport(JSON.stringify({ ...createSave(), encounter: { activityId: pair.id, contentVersion: pair.contentVersion, assisted: false, state: { ...blankAttempt(), pairs: { s999: 'r0' } } } }))).toThrow(/unavailable source/);
    expect(() => parseImport(JSON.stringify({ ...createSave(), encounter: { activityId: ruler.id, contentVersion: ruler.contentVersion, assisted: false, state: { ...blankAttempt(), origin: 99999 } } }))).toThrow(/available activity option/);
  });

  it('restores deterministic fresh transfer variants by their full identity', () => {
    const activity = freshCheck('quantity-symbol', 7);
    const save = createSave();
    save.encounter = { activityId: activity.id, contentVersion: activity.contentVersion, assisted: false, state: blankAttempt() };
    expect(parseImport(exportSave(save))).toEqual(save);
  });

  it('refuses overflow without trimming earned qualifications', () => {
    const save = createSave();
    save.evidence = Array.from({ length: MAX_EVIDENCE_EVENTS }, (_, index) => event('pair-surplus', 'transfer', 0, { eventId: `event-${index}` }));
    expect(() => addEvidence(save, event())).toThrow(/no earned progress has been discarded/);
    expect(save.evidence).toHaveLength(MAX_EVIDENCE_EVENTS);
    expect(() => parseImport(JSON.stringify({ ...save, evidence: [...save.evidence, event()] }))).toThrow(/event limit/);
  });

  it('reports denied reads and writes without pretending progress is saved', () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Access denied'); });
    expect(loadSave(storage).warning).toMatch(/Access denied/);
    expect(writeSave(createSave(), storage)).toMatch(/could not be saved/);
  });
});

describe('prototype retrieval schedule', () => {
  it('uses one, three, then seven days and preserves earned evidence', () => {
    const evidence = [event()];
    expect(getDueObjectives(evidence, START + DAY - 1)).toEqual([]);
    expect(getDueObjectives(evidence, START + DAY)).toEqual(['pair-surplus']);
    evidence.push(event('pair-surplus', 'retrieval', 1));
    expect(getDueObjectives(evidence, START + 4 * DAY - 1)).toEqual([]);
    expect(getDueObjectives(evidence, START + 4 * DAY)).toEqual(['pair-surplus']);
    evidence.push(event('pair-surplus', 'retrieval', 4));
    expect(getDueObjectives(evidence, START + 11 * DAY - 1)).toEqual([]);
    expect(getDueObjectives(evidence, START + 11 * DAY)).toEqual(['pair-surplus']);
    expect(evidence).toHaveLength(3);
  });

  it('cannot qualify from practice, assisted transfer, or missing criteria', () => {
    const evidence = [event('pair-surplus', 'practice'), event('quantity-symbol', 'transfer', 0, { assisted: true }), event('unit-path', 'transfer', 0, { criterionResults: {} })];
    expect(getDueObjectives(evidence, START + 100 * DAY)).toEqual([]);
  });

  it('can schedule independently demonstrated retrieval evidence without an earlier transfer', () => {
    expect(getDueObjectives([event('zero-empty', 'retrieval')], START + 3 * DAY - 1)).toEqual([]);
    expect(getDueObjectives([event('zero-empty', 'retrieval')], START + 3 * DAY)).toEqual(['zero-empty']);
  });

  it('failed or assisted reviews remain due, and duplicate successes do not extend intervals', () => {
    const failed = event('pair-surplus', 'retrieval', 1);
    failed.criterionResults[Object.keys(failed.criterionResults)[0]] = 'unsatisfied';
    expect(getDueObjectives([event(), failed, event('pair-surplus', 'retrieval', 2, { assisted: true })], START + 2 * DAY)).toEqual(['pair-surplus']);
    const retrieval = event('pair-surplus', 'retrieval', 1);
    expect(getDueObjectives([event(), retrieval, retrieval], START + 4 * DAY)).toEqual(['pair-surplus']);
  });

  it('surfaces at most three oldest due objectives', () => {
    const evidence = [event('pair-surplus', 'transfer', 3), event('zero-empty', 'transfer', 0), event('unit-path', 'transfer', 2), event('quantity-symbol', 'transfer', 1)];
    expect(getDueObjectives(evidence, START + 10 * DAY)).toEqual(['zero-empty', 'quantity-symbol', 'unit-path']);
  });
});
