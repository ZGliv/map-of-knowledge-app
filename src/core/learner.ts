import { catalog } from './catalog';
import { DISCOVERIES, getDiscovery } from './discoveries';
import type { AttemptInput, FrontierSuggestion, LearnerProfile, LearnerState, LearningAttempt } from './guideTypes';

export const LEARNER_KEY = 'mok-learner-v1';
export const LEARNER_LIMITS = { attempts: 5_000, importLength: 5_000_000, name: 80, goal: 500, interests: 24 } as const;
export interface LearnerSaveOptions { replaceInvalid?: boolean }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type RecordValue = Record<string, unknown>;

function invalid(message: string): never { throw new Error(message); }
function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object.`);
  return value as RecordValue;
}
function text(value: unknown, label: string, limit: number, required = false): string {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) invalid(`${label} must be ${required ? 'nonempty ' : ''}text of at most ${limit} characters.`);
  return value;
}
function timestamp(value: unknown, label: string): string {
  const result = text(value, label, 24, true);
  const time = Date.parse(result);
  if (!Number.isFinite(time) || time < 0 || new Date(time).toISOString() !== result) invalid(`${label} must be a valid UTC timestamp.`);
  return result;
}
function id(value: unknown): string {
  const result = text(value, 'Event ID', 160, true);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(result)) invalid('Event ID contains unsupported characters.');
  return result;
}
function profile(value: unknown): LearnerProfile {
  const raw = object(value, 'Learner profile');
  if (!Array.isArray(raw.interests) || raw.interests.length > LEARNER_LIMITS.interests) invalid(`Choose at most ${LEARNER_LIMITS.interests} interests.`);
  const interests = raw.interests.map((value) => {
    const interest = text(value, 'Interest', 80, true).trim();
    return interest;
  });
  if (typeof raw.minutes !== 'number' || !Number.isInteger(raw.minutes) || raw.minutes < 1 || raw.minutes > 60) invalid('Session length must be a whole number from 1 to 60 minutes.');
  return { name: text(raw.name, 'Name', LEARNER_LIMITS.name).trim(), goal: text(raw.goal, 'Learning goal', LEARNER_LIMITS.goal, true).trim(), interests: [...new Set(interests)], minutes: raw.minutes };
}
function discoveryId(value: unknown): string {
  const result = text(value, 'Discovery ID', 120, true);
  if (!getDiscovery(result)) invalid(`Unknown discovery "${result}". Keep the original for migration.`);
  return result;
}
function attemptInput(value: unknown): AttemptInput {
  const raw = object(value, 'Learning attempt');
  const discovery = getDiscovery(discoveryId(raw.discoveryId))!;
  const challengeId = text(raw.challengeId, 'Challenge ID', 120, true);
  const index = discovery.challenges.findIndex((challenge) => challenge.id === challengeId);
  if (index < 0) invalid('This challenge does not belong to this discovery.');
  if ((index === 0 && raw.phase !== 'probe') || (index > 0 && raw.phase !== 'transfer')) invalid('Attempt phase does not match this challenge.');
  if (typeof raw.assisted !== 'boolean') invalid('Assistance must be explicitly recorded as true or false.');
  const answerId = text(raw.answerId, 'Answer ID', 160);
  if (answerId === '') {
    if (!raw.assisted) invalid('An empty answer can only record help exposure.');
  } else if (!discovery.challenges[index].choices.some((choice) => choice.id === answerId)) invalid('This answer is not one of the challenge choices.');
  return { discoveryId: discovery.id, challengeId, answerId, assisted: raw.assisted, phase: index === 0 ? 'probe' : 'transfer' };
}
function basicAttempt(value: unknown): LearningAttempt {
  const raw = object(value, 'Learning event');
  const input = attemptInput(raw);
  if (typeof raw.passed !== 'boolean') invalid('An event must contain a boolean result.');
  const challenge = getDiscovery(input.discoveryId)!.challenges.find((candidate) => candidate.id === input.challengeId)!;
  // Stored/model-provided scores never decide map progress.
  return { id: id(raw.id), ...input, passed: input.answerId === challenge.correctId, at: timestamp(raw.at, 'Event time') };
}
function canonicalAttempts(values: unknown[]): LearningAttempt[] {
  if (values.length > LEARNER_LIMITS.attempts) invalid(`At most ${LEARNER_LIMITS.attempts} learning events can be kept in this prototype. Export your history; nothing has been discarded.`);
  const unique = new Map<string, LearningAttempt>();
  for (const value of values) {
    const event = basicAttempt(value);
    const previous = unique.get(event.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) invalid(`Conflicting events share ID "${event.id}". Neither has been discarded.`);
    unique.set(event.id, event);
  }
  const events = [...unique.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const exposedAt = new Map<string, string>();
  for (const event of events) {
    if (!event.passed || event.assisted) {
      const key = `${event.discoveryId}:${event.challengeId}`;
      const previous = exposedAt.get(key);
      if (!previous || event.at < previous) exposedAt.set(key, event.at);
    }
  }
  return events.map((event) => {
    const at = exposedAt.get(`${event.discoveryId}:${event.challengeId}`);
    // A same-timestamp import is ambiguous: conservatively treat a correct
    // answer as assisted when feedback/help exists at that time or earlier.
    return { ...event, assisted: event.assisted || (event.passed && !!at && at <= event.at) };
  });
}
function learner(value: unknown): LearnerState {
  const raw = object(value, 'Learning history');
  if (raw.version !== 1) invalid('Unsupported learning-history version. Keep the original for migration.');
  if (!Array.isArray(raw.attempts)) invalid('Learning events must be an array.');
  if (!Array.isArray(raw.visitedIds) || raw.visitedIds.length > DISCOVERIES.length) invalid('Visited discoveries are invalid or exceed the authored collection.');
  const updatedAt = timestamp(raw.updatedAt, 'History updatedAt');
  // Earlier v1 development exports used one clock; treat it as the profile's
  // last known edit rather than silently discarding those exports.
  const profileUpdatedAt = timestamp(raw.profileUpdatedAt ?? raw.updatedAt, 'Profile updatedAt');
  if (profileUpdatedAt > updatedAt) invalid('History updatedAt cannot be earlier than its profile.');
  const attempts = canonicalAttempts(raw.attempts);
  if (attempts.some((attempt) => attempt.at > updatedAt)) invalid('History updatedAt cannot be earlier than an event.');
  return { version: 1, profile: profile(raw.profile), profileUpdatedAt, attempts, visitedIds: [...new Set(raw.visitedIds.map(discoveryId))], updatedAt };
}
function nextTime(state: LearnerState): string {
  const next = new Date(Math.max(Date.now(), Date.parse(state.updatedAt) + 1)).toISOString();
  return timestamp(next, 'Next history time');
}
function eventId(state: LearnerState): string {
  let value: string;
  do {
    value = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `learn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  } while (state.attempts.some((attempt) => attempt.id === value));
  return value;
}

export function createLearner(): LearnerState {
  const at = new Date().toISOString();
  return { version: 1, profile: { name: '', goal: 'Understand more of the world, one connection at a time.', interests: [], minutes: 5 }, profileUpdatedAt: at, attempts: [], visitedIds: [], updatedAt: at };
}
export function parseLearner(raw: string): LearnerState {
  if (typeof raw !== 'string' || raw.length > LEARNER_LIMITS.importLength) invalid('Learning-history import is too large. The limit is 5 million characters.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid('Choose a valid JSON learning-history export.'); }
  return learner(value);
}
export function exportLearner(state: LearnerState): string {
  const output = JSON.stringify(learner(state), null, 2);
  if (output.length > LEARNER_LIMITS.importLength) invalid('This history exceeds the import size limit; it cannot be exported safely.');
  return output;
}
function storageTarget(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  try { if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage; } catch { /* Browser privacy settings may reject the getter. */ }
  return invalid('Browser storage is unavailable.');
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'Storage could not be accessed.'; }
export function loadLearner(storage?: StorageLike): { data: LearnerState; warning: string | null } {
  try {
    const raw = storageTarget(storage).getItem(LEARNER_KEY);
    return { data: raw === null ? createLearner() : parseLearner(raw), warning: null };
  } catch (error) {
    return { data: createLearner(), warning: `Learning history could not be loaded. ${message(error)} The original is untouched. New changes may last only in this session; export before closing.` };
  }
}
export function saveLearner(state: LearnerState, storage?: StorageLike, options: LearnerSaveOptions = {}): string | null {
  try {
    const target = storageTarget(storage);
    const output = exportLearner(state);
    const original = target.getItem(LEARNER_KEY);
    if (original !== null) {
      try { parseLearner(original); } catch {
        if (!options.replaceInvalid) return 'Saving is blocked because the existing learning history is unreadable or from another version. The original is untouched. Export this session before closing.';
        const base = `${LEARNER_KEY}.recovery.${Date.now()}`;
        let key = base;
        for (let suffix = 1; target.getItem(key) !== null; suffix += 1) {
          if (suffix > 100) invalid('Too many recovery copies. The original history is untouched.');
          key = `${base}.${suffix}`;
        }
        target.setItem(key, original);
        if (target.getItem(key) !== original) invalid('Could not verify a recovery copy. The original history is untouched.');
      }
    }
    target.setItem(LEARNER_KEY, output);
    if (target.getItem(LEARNER_KEY) !== output) return 'The browser did not retain your learning history. Export before closing.';
    return null;
  } catch (error) { return `Learning history could not be saved. ${message(error)} Export before closing.`; }
}
export function recordAttempt(state: LearnerState, input: AttemptInput): LearnerState {
  const current = learner(state);
  if (current.attempts.length >= LEARNER_LIMITS.attempts) invalid('This prototype history is full. Export before continuing; no evidence has been removed.');
  const checked = attemptInput(input);
  const challenge = getDiscovery(checked.discoveryId)!.challenges.find((candidate) => candidate.id === checked.challengeId)!;
  const priorExposure = current.attempts.some((event) => event.challengeId === checked.challengeId && event.discoveryId === checked.discoveryId && (!event.passed || event.assisted));
  const at = nextTime(current);
  const event: LearningAttempt = { ...checked, id: eventId(current), at, passed: checked.answerId === challenge.correctId, assisted: checked.assisted || priorExposure };
  const result: LearnerState = { ...current, attempts: [...current.attempts, event], visitedIds: [...new Set([...current.visitedIds, checked.discoveryId])], updatedAt: at };
  exportLearner(result);
  return result;
}
export function visitDiscovery(state: LearnerState, value: string): LearnerState {
  const current = learner(state);
  const visited = discoveryId(value);
  if (current.visitedIds.includes(visited)) return current;
  return { ...current, visitedIds: [...current.visitedIds, visited], updatedAt: nextTime(current) };
}
export function updateProfile(state: LearnerState, changes: Partial<LearnerProfile>): LearnerState {
  const current = learner(state);
  const at = nextTime(current);
  return { ...current, profile: profile({ ...current.profile, ...object(changes, 'Profile changes') }), profileUpdatedAt: at, updatedAt: at };
}
export function mergeLearner(a: LearnerState, b: LearnerState): LearnerState {
  const left = learner(a), right = learner(b);
  if (left.profileUpdatedAt === right.profileUpdatedAt && JSON.stringify(left.profile) !== JSON.stringify(right.profile)) invalid('These histories contain conflicting profiles with the same update time. Neither was discarded.');
  const byId = new Map(left.attempts.map((event) => [event.id, event]));
  for (const event of right.attempts) {
    const previous = byId.get(event.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) {
      // Assistance can become known after merging another tab's earlier help
      // event. That conservative annotation is monotonic, not a new answer.
      if (JSON.stringify({ ...previous, assisted: false }) !== JSON.stringify({ ...event, assisted: false })) invalid(`Conflicting events share ID "${event.id}". Neither was discarded.`);
      byId.set(event.id, { ...event, assisted: previous.assisted || event.assisted });
    } else byId.set(event.id, event);
  }
  const newest = right.profileUpdatedAt > left.profileUpdatedAt ? right : left;
  return learner({ version: 1, profile: newest.profile, profileUpdatedAt: newest.profileUpdatedAt, attempts: [...byId.values()], visitedIds: [...new Set([...left.visitedIds, ...right.visitedIds])], updatedAt: right.updatedAt > left.updatedAt ? right.updatedAt : left.updatedAt });
}
export function getEarnedIds(state: LearnerState): string[] {
  const current = learner(state);
  const earned = new Set(current.attempts.filter((event) => event.phase === 'transfer' && event.passed && !event.assisted).map((event) => event.discoveryId));
  return DISCOVERIES.filter((discovery) => earned.has(discovery.id)).map((discovery) => discovery.footprintId);
}

/** Transparent, bounded readiness suggestions. These are navigation hypotheses
 * over a few checks, not a psychometric assessment or a mastery probability. */
export function getFrontier(state: LearnerState, nodeId?: string, limit = 3): FrontierSuggestion[] {
  const current = learner(state);
  const requested = Number.isFinite(limit) ? Math.max(0, Math.min(DISCOVERIES.length, Math.floor(limit))) : 3;
  if (!requested) return [];
  const node = nodeId && catalog.get(nodeId) ? nodeId : 'knowledge';
  const earned = new Set(getEarnedIds(current));
  const independent = new Set(DISCOVERIES.filter((discovery) => earned.has(discovery.footprintId)).map((discovery) => discovery.id));
  const interests = current.profile.interests.map((interest) => interest.toLowerCase().replace(/^knowledge\./, '').replaceAll('-', ' '));
  const candidates = DISCOVERIES.map((discovery, index) => {
    const events = current.attempts.filter((event) => event.discoveryId === discovery.id);
    const last = events.at(-1);
    const passed = independent.has(discovery.id);
    const nearby = node !== 'knowledge' && (discovery.footprintId === node || discovery.footprintId.startsWith(`${node}.`) || node.startsWith(`${discovery.topicId}.`));
    const origin = DISCOVERIES.find((candidate) => independent.has(candidate.id) && (candidate.connections.includes(discovery.id) || discovery.connections.includes(candidate.id)));
    const interest = interests.find((interest) => [discovery.subject, discovery.title, discovery.question, discovery.summary, discovery.topicId.replaceAll('.', ' ')].join(' ').toLowerCase().includes(interest));
    const unseenTransfer = discovery.challenges.slice(1).some((challenge) => !events.some((event) => event.challengeId === challenge.id));
    let kind: FrontierSuggestion['kind'] = 'begin';
    let reason = 'A small starting question. There is not enough evidence yet to estimate your readiness.';
    let score = 20 - index / 100;
    if (interest) { score += 22; reason = `Related to an interest you chose: ${current.profile.interests[interests.indexOf(interest)]}. Readiness is still a question to test.`; }
    if (origin && !passed) { score += 30; kind = 'connect'; reason = `Connects with “${origin.title},” where you answered a transfer check independently. This connection is a suggestion, not proof of readiness.`; }
    if (!passed && discovery.prerequisites.some((value) => independent.has(value))) { score += 14; kind = 'bridge'; reason = 'An independent check on a connected idea makes this a promising bridge. You can still open any territory.'; }
    if (last && !passed) {
      score += 36;
      if (!unseenTransfer) { score = Math.min(score, 5 - index / 100); kind = 'revisit'; reason = 'You have seen these examples. Revisit with support; repeating a revealed answer will not create independent evidence.'; }
      else if (last.assisted || !last.passed) { kind = 'revisit'; reason = 'A previous check needed support. A fresh example can help test what you can now do independently.'; }
      else { kind = 'stretch'; reason = 'Your first check went well. A different example can test whether the idea carries over; one result is still limited evidence.'; }
    }
    if (current.visitedIds.includes(discovery.id) && !events.length) { score += 8; reason = 'You opened this question before. Try a short check to find a useful starting point.'; }
    if (nearby) { score += 60; if (!events.length && !origin) reason = 'A question inside the territory you are exploring. Its first check will help find a starting point.'; }
    if (discovery.minutes <= current.profile.minutes) score += 2;
    if (passed) { score -= 90; kind = 'revisit'; reason = 'You answered one fresh transfer check independently. A later revisit can explore retention; this is not a claim of mastery.'; }
    return { discovery, reason, kind, score, index };
  });
  return candidates.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, requested).map(({ discovery, reason, kind }) => ({ discovery, reason, kind }));
}
