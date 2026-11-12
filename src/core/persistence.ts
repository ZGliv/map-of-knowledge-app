import type { Activity, AttemptState, EncounterSave, Evidence, ObjectiveKey, SaveData } from './contracts';
import { CONTENT_VERSION, OBJECTIVES, getActivityById } from './curriculum';
import { criterionKeys } from './learning';

export const STORAGE_KEY = 'mok-next.save.v1';
export const MAX_EVIDENCE_EVENTS = 10_000;
const MAX_IMPORT_LENGTH = 12_000_000;
const DAY = 86_400_000;
const REVIEW_INTERVALS = [DAY, 3 * DAY, 7 * DAY];
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type RecordValue = Record<string, unknown>;

function invalid(message: string): never {
  throw new Error(message);
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object.`);
  return value as RecordValue;
}

function text(value: unknown, label: string, maximum = 160): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) invalid(`${label} must be a nonempty string of at most ${maximum} characters.`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') invalid(`${label} must be true or false.`);
  return value;
}

function timestamp(value: unknown, label: string): string {
  const result = text(value, label, 24);
  const time = Date.parse(result);
  if (!Number.isFinite(time) || time < 0 || new Date(time).toISOString() !== result) {
    invalid(`${label} must be a valid UTC timestamp, such as 2026-09-06T12:00:00.000Z.`);
  }
  return result;
}

function activityFor(id: unknown): Activity {
  const activityId = text(id, 'Activity ID');
  const activity = getActivityById(activityId);
  if (!activity) invalid(`Unknown activity "${activityId}". This save needs a matching curriculum version.`);
  return activity;
}

function validateEvidence(value: unknown): Evidence {
  const event = record(value, 'Evidence event');
  const eventId = text(event.eventId, 'Evidence event ID');
  const objectiveId = text(event.objectiveId, 'Objective ID');
  if (!OBJECTIVES.some((objective) => objective.id === objectiveId)) invalid(`Unknown objective "${objectiveId}".`);
  const activity = activityFor(event.activityId);
  if (OBJECTIVES.find((objective) => objective.key === activity.objective)?.id !== objectiveId) invalid(`Evidence objective does not match activity "${activity.id}".`);
  if (event.contentVersion !== CONTENT_VERSION || event.contentVersion !== activity.contentVersion) {
    invalid(`Evidence content version for "${activity.id}" is unsupported; expected ${activity.contentVersion}.`);
  }
  if (event.phase !== activity.phase) invalid(`Evidence phase does not match activity "${activity.id}".`);
  if (event.representationId !== activity.representationId) invalid(`Evidence representation does not match activity "${activity.id}".`);
  const results = record(event.criterionResults, 'Criterion results');
  const keys = criterionKeys(activity);
  if (Object.keys(results).length !== keys.length || keys.some((key) => !Object.hasOwn(results, key))) {
    invalid(`Criterion results for "${activity.id}" must contain exactly: ${keys.join(', ')}.`);
  }
  const criterionResults: Evidence['criterionResults'] = {};
  for (const key of keys) {
    const status = results[key];
    if (status !== 'satisfied' && status !== 'unsatisfied' && status !== 'unobserved') invalid(`Invalid criterion status for "${key}".`);
    criterionResults[key] = status;
  }
  return {
    eventId, objectiveId, activityId: activity.id,
    contentVersion: activity.contentVersion, representationId: activity.representationId,
    phase: activity.phase, assisted: boolean(event.assisted, 'Evidence assistance'),
    criterionResults, occurredAt: timestamp(event.occurredAt, 'Evidence occurredAt'),
  };
}

function sameEvent(a: Evidence, b: Evidence): boolean {
  // validateEvidence emits a canonical field and criterion order.
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateEvidenceList(value: unknown): Evidence[] {
  if (!Array.isArray(value)) invalid('Saved evidence must be an array.');
  if (value.length > MAX_EVIDENCE_EVENTS) invalid(`This save exceeds the ${MAX_EVIDENCE_EVENTS.toLocaleString('en-US')}-event limit. No earned history was removed.`);
  const unique = new Map<string, Evidence>();
  for (const raw of value) {
    const event = validateEvidence(raw);
    const previous = unique.get(event.eventId);
    if (previous && !sameEvent(previous, event)) invalid(`Conflicting evidence shares event ID "${event.eventId}".`);
    if (!previous) unique.set(event.eventId, event);
  }
  return [...unique.values()];
}

function nullableChoice(value: unknown, options: readonly number[], label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || !options.includes(value)) invalid(`${label} is not an available activity option.`);
  return value;
}

function validateAttempt(value: unknown, activity: Activity): AttemptState {
  const attempt = record(value, 'Unfinished activity state');
  const rawPairs = record(attempt.pairs, 'Activity pairs');
  const pairs: Record<string, string> = {};
  const sourceIds = activity.kind === 'pair' ? Array.from({ length: activity.sources }, (_, index) => `s${index}`) : [];
  const receiverIds = activity.kind === 'pair' ? Array.from({ length: activity.receivers }, (_, index) => `r${index}`) : [];
  for (const [source, receiver] of Object.entries(rawPairs)) {
    if (!sourceIds.includes(source) || typeof receiver !== 'string' || !receiverIds.includes(receiver)) invalid('Saved pairing refers to an unavailable source or receiver.');
    pairs[source] = receiver;
  }
  const surplus = attempt.surplus;
  if (surplus !== null && (activity.kind !== 'pair' || (surplus !== 'sources' && surplus !== 'receivers' && surplus !== 'neither'))) invalid('Saved surplus choice is invalid for this activity.');
  const answerOptions = activity.kind === 'pair' ? [] : activity.answerOptions;
  const answer = attempt.answer;
  if (answer !== null && (typeof answer !== 'string' || !answerOptions.includes(answer))) invalid('Saved answer is not an available activity option.');
  return {
    pairs, surplus: surplus as AttemptState['surplus'],
    origin: nullableChoice(attempt.origin, activity.kind === 'ruler' ? activity.originOptions : [], 'Saved origin'),
    unit: nullableChoice(attempt.unit, activity.kind === 'ruler' ? activity.unitOptions : [], 'Saved unit'),
    answer: answer as string | null,
    revealed: boolean(attempt.revealed, 'Saved observation state'),
  };
}

function validateEncounter(value: unknown): EncounterSave | null {
  if (value === null) return null;
  const encounter = record(value, 'Unfinished activity');
  const activity = activityFor(encounter.activityId);
  if (encounter.contentVersion !== activity.contentVersion) invalid('Unfinished activity has a different content revision and cannot safely resume.');
  return {
    activityId: activity.id, contentVersion: activity.contentVersion,
    assisted: boolean(encounter.assisted, 'Unfinished activity assistance'),
    state: validateAttempt(encounter.state, activity),
  };
}

function validateDurable(value: unknown): Omit<SaveData, 'encounter'> {
  const save = record(value, 'Save');
  if (save.version !== 1) invalid(`Unsupported save version "${String(save.version)}". Expected version 1; the original data must be kept for migration.`);
  return {
    version: 1, evidence: validateEvidenceList(save.evidence),
    locationId: text(save.locationId, 'Saved map location'),
    updatedAt: timestamp(save.updatedAt, 'Save updatedAt'),
  };
}

function parseJson(value: string): unknown {
  if (typeof value !== 'string' || value.length > MAX_IMPORT_LENGTH) invalid('Import is too large. The maximum is 12 million characters and 10,000 evidence events.');
  try { return JSON.parse(value); } catch { return invalid('This is not valid JSON. Choose a Map of Knowledge save exported by this app.'); }
}

export function createSave(): SaveData {
  return { version: 1, evidence: [], locationId: 'knowledge', encounter: null, updatedAt: new Date().toISOString() };
}

export function parseImport(value: string): SaveData {
  const raw = parseJson(value);
  const durable = validateDurable(raw);
  return { ...durable, encounter: validateEncounter(record(raw, 'Save').encounter) };
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(parseImport(JSON.stringify(data)), null, 2);
}

function browserStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  try {
    if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  } catch { /* Browser privacy settings may deny the storage getter itself. */ }
  return invalid('Browser storage is unavailable. Progress lasts only for this session; export a backup.');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Storage could not be accessed.';
}

function quarantine(storage: StorageLike, raw: string): string {
  const base = `${STORAGE_KEY}.quarantine.${Date.now()}`;
  let key = base;
  for (let index = 1; storage.getItem(key) !== null; index += 1) {
    if (index > 100) invalid('Too many saved recovery copies. The original save was left untouched.');
    key = `${base}.${index}`;
  }
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) invalid('Could not verify the recovery copy. The original save was left untouched.');
  storage.removeItem(STORAGE_KEY);
  if (storage.getItem(STORAGE_KEY) !== null) invalid('Could not release the original save. New saves are blocked to protect it.');
  return key;
}

export function loadSave(storage?: StorageLike): { data: SaveData; warning: string | null } {
  let target: StorageLike;
  let raw: string | null;
  try {
    target = browserStorage(storage);
    raw = target.getItem(STORAGE_KEY);
  } catch (error) {
    return { data: createSave(), warning: `${message(error)} Export a backup before closing this session.` };
  }
  if (raw === null) return { data: createSave(), warning: null };

  let durable: Omit<SaveData, 'encounter'> | null = null;
  try {
    const parsed = parseJson(raw);
    durable = validateDurable(parsed);
    return { data: { ...durable, encounter: validateEncounter(record(parsed, 'Save').encounter) }, warning: null };
  } catch (error) {
    const recovered = durable ? { ...durable, encounter: null } : createSave();
    const prefix = durable ? 'Your learning history was restored, but the unfinished activity could not resume.' : 'The saved data could not be loaded. A fresh session has opened.';
    try {
      const recoveryKey = quarantine(target, raw);
      return { data: recovered, warning: `${prefix} ${message(error)} The original is preserved in browser storage as ${recoveryKey}.` };
    } catch (recoveryError) {
      return { data: recovered, warning: `${prefix} ${message(error)} Recovery copy failed: ${message(recoveryError)} The original save is protected; new saves are blocked. Export this session to keep new work.` };
    }
  }
}

export function writeSave(data: SaveData, storage?: StorageLike): string | null {
  try {
    const target = browserStorage(storage);
    const serialized = JSON.stringify(parseImport(JSON.stringify(data)));
    const previous = target.getItem(STORAGE_KEY);
    if (previous !== null) {
      try { parseImport(previous); } catch {
        return 'Saving is blocked because the existing save is invalid or from another revision. Reload to recover it safely, and export your current session first.';
      }
    }
    target.setItem(STORAGE_KEY, serialized);
    if (target.getItem(STORAGE_KEY) !== serialized) return 'The browser did not retain this save. Export a backup before closing.';
    return null;
  } catch (error) {
    return `Progress could not be saved: ${message(error)} Export a backup before closing.`;
  }
}

export function addEvidence(save: SaveData, value: Evidence): SaveData {
  const event = validateEvidence(value);
  const existing = save.evidence.find((candidate) => candidate.eventId === event.eventId);
  if (existing) {
    if (!sameEvent(validateEvidence(existing), event)) invalid(`Conflicting evidence shares event ID "${event.eventId}".`);
    return save;
  }
  if (save.evidence.length >= MAX_EVIDENCE_EVENTS) invalid('This save has reached its 10,000-event limit. Export your history; no earned progress has been discarded.');
  return { ...save, evidence: [...save.evidence, event], updatedAt: new Date().toISOString() };
}

export function getDueObjectives(evidence: Evidence[], now = Date.now()): ObjectiveKey[] {
  if (!Number.isFinite(now) || now < 0) return [];
  const events = new Map<string, Evidence>();
  for (const raw of evidence) {
    try {
      const event = validateEvidence(raw);
      // Ignore untrusted observations rather than accidentally qualifying a review.
      if (!events.has(event.eventId)) events.set(event.eventId, event);
    } catch { /* Imports reject these; this also protects direct caller input. */ }
  }
  const due: { key: ObjectiveKey; at: number }[] = [];
  for (const objective of OBJECTIVES) {
    const successes = [...events.values()].filter((event) => event.objectiveId === objective.id && !event.assisted &&
      event.phase !== 'practice' && Object.values(event.criterionResults).every((status) => status === 'satisfied'))
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    if (!successes.length) continue;
    const retrievalCount = successes.filter((event) => event.phase === 'retrieval').length;
    const latest = successes[successes.length - 1];
    const at = Date.parse(latest.occurredAt) + REVIEW_INTERVALS[Math.min(retrievalCount, REVIEW_INTERVALS.length - 1)];
    if (now >= at) due.push({ key: objective.key, at });
  }
  return due.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key)).slice(0, 3).map(({ key }) => key);
}
