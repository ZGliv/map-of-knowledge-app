import type { Confidence } from '../expeditions/content/types';
import type { CaseAnswer } from '../cases/types';
import type { CheckAnswer } from './types';

/**
 * Check evidence, kept beside the expedition record (mok-expeditions-v1) under its own key.
 * The expedition record is never rewritten by checks, so older builds that read it keep
 * working, and nothing a check does can lose an expedition run.
 *
 * Append-only: events are only ever added. Each answer is written the moment it is given,
 * before anything is revealed, so a check abandoned halfway still marks its questions seen.
 * Correctness is stored for reading, but the projection regrades every answer from the key.
 * Event types this version doesn't know are kept as they are, so a newer build's events
 * survive a round trip through an older one.
 */
export const CHECK_LEDGER_KEY = 'mok-checks-v1';
const LIMITS = { events: 20_000, raw: 4_000_000 } as const;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface CheckAttemptEvent {
  readonly t: 'attempt';
  readonly id: string;
  readonly session: string;
  /** The node the check proves. */
  readonly node: string;
  readonly item: string;
  readonly family: string;
  /** Which generated variant a numeric item showed. */
  readonly variant: number;
  readonly answer: CheckAnswer;
  readonly correct: boolean;
  readonly confidence: Confidence;
  /** Time on the question, for later calibration of the "about 90 seconds". */
  readonly ms: number;
  readonly at: string;
}

/** Written with the last answer: the session's items, in the order shown. */
export interface CheckFinishEvent {
  readonly t: 'finish';
  readonly id: string;
  readonly session: string;
  readonly node: string;
  readonly items: readonly string[];
  readonly at: string;
}

/** A new case played (cases/types.ts): the learner's call, written the moment they press Run,
 * before the outcome shows. Whether it won is stored for reading; the projection reruns the case
 * from its seed and judges the call afresh. A case counts as proof only the first time it is
 * played, and only unassisted. */
export interface CaseEvent {
  readonly t: 'case';
  readonly id: string;
  readonly session: string;
  readonly node: string;
  readonly case: string;
  readonly answer: CaseAnswer;
  readonly success: boolean;
  /** Where it was played: the expedition's last beat, or a field mission from the hub. */
  readonly via: 'expedition' | 'mission';
  readonly ms: number;
  readonly at: string;
}

export type CheckEvent = CheckAttemptEvent | CheckFinishEvent | CaseEvent;

export interface CheckLedger {
  readonly version: 1;
  readonly events: readonly CheckEvent[];
  /** Events of a kind this version doesn't read, kept verbatim. */
  readonly other: readonly Record<string, unknown>[];
}

export const createCheckLedger = (): CheckLedger => ({ version: 1, events: [], other: [] });

const CONFIDENCES: readonly Confidence[] = ['guess', 'fair', 'certain'];
const fail = (message: string): never => { throw new Error(message); };
const text = (value: unknown, label: string) => (typeof value === 'string' && value.length > 0 && value.length < 400 ? value : fail(`${label} is missing.`));
const time = (value: unknown, label: string) => {
  const at = text(value, label);
  return Number.isNaN(Date.parse(at)) ? fail(`${label} is not a date.`) : at;
};

function answerOf(value: unknown): CheckAnswer {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') return fail('An answer is missing.');
  if (typeof raw.pick === 'string') return { pick: raw.pick };
  if (Array.isArray(raw.seq) && raw.seq.every(id => typeof id === 'string')) return { seq: [...raw.seq] as string[] };
  if (raw.pairs && typeof raw.pairs === 'object' && Object.values(raw.pairs).every(v => typeof v === 'string')) return { pairs: { ...(raw.pairs as Record<string, string>) } };
  if (typeof raw.value === 'number' && Number.isFinite(raw.value)) return { value: raw.value };
  return fail('An answer has an unknown shape.');
}

function eventOf(value: unknown): CheckEvent | Record<string, unknown> {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('A check event is not an object.');
  const base = () => ({ id: text(raw.id, 'An event ID'), session: text(raw.session, 'A session ID'), node: text(raw.node, 'A node'), at: time(raw.at, 'An event time') });
  if (raw.t === 'attempt') {
    if (!CONFIDENCES.includes(raw.confidence as Confidence)) fail('An answer has an unknown confidence.');
    if (typeof raw.correct !== 'boolean') fail('An answer has no result.');
    return {
      t: 'attempt', ...base(), item: text(raw.item, 'An item ID'), family: text(raw.family, 'A family ID'),
      variant: Number.isInteger(raw.variant) ? raw.variant as number : 0, answer: answerOf(raw.answer),
      correct: raw.correct as boolean, confidence: raw.confidence as Confidence,
      ms: typeof raw.ms === 'number' && raw.ms >= 0 ? raw.ms : 0,
    };
  }
  if (raw.t === 'case') {
    const answer = raw.answer as Record<string, unknown> | null;
    const parsed: CaseAnswer = answer && typeof answer.pick === 'string' ? { pick: answer.pick }
      : answer && Array.isArray(answer.picks) && answer.picks.every(id => typeof id === 'string') ? { picks: [...answer.picks] as string[] }
      : answer && typeof answer.value === 'number' && Number.isFinite(answer.value) ? { value: answer.value } : fail('A case call has an unknown shape.');
    if (typeof raw.success !== 'boolean') fail('A case has no result.');
    return {
      t: 'case', ...base(), case: text(raw.case, 'A case ID'), answer: parsed, success: raw.success as boolean,
      via: raw.via === 'mission' ? 'mission' : 'expedition', ms: typeof raw.ms === 'number' && raw.ms >= 0 ? raw.ms : 0,
    };
  }
  if (raw.t === 'finish') {
    const items = raw.items;
    if (!Array.isArray(items) || !items.every(id => typeof id === 'string')) return fail('A finished check lists no items.');
    return { t: 'finish', ...base(), items: [...items] as string[] };
  }
  // A kind from a newer build: keep it, untouched, as long as it has an ID to merge on.
  return typeof raw.t === 'string' ? { ...raw } : fail('A check event has no type.');
}

export function parseCheckLedger(raw: string): CheckLedger {
  if (typeof raw !== 'string' || raw.length > LIMITS.raw) fail('The check record is too large to read.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('The check record is not valid JSON.'); }
  const data = value as { version?: unknown; events?: unknown; other?: unknown } | null;
  if (!data || data.version !== 1 || !Array.isArray(data.events)) fail('Unsupported check record.');
  const all = [...(data!.events as unknown[]), ...(Array.isArray(data!.other) ? data!.other as unknown[] : [])];
  if (all.length > LIMITS.events) fail('The check record holds more events than this version keeps.');
  const events: CheckEvent[] = [];
  const other: Record<string, unknown>[] = [];
  for (const item of all) {
    const event = eventOf(item);
    if (event.t === 'attempt' || event.t === 'finish' || event.t === 'case') events.push(event as CheckEvent); else other.push(event as Record<string, unknown>);
  }
  return { version: 1, events, other };
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadCheckLedger(target?: StorageLike): { data: CheckLedger; warning: string | null } {
  const store = storage(target);
  if (!store) return { data: createCheckLedger(), warning: 'Browser storage is unavailable. Check results will last only for this session.' };
  let raw: string | null;
  try { raw = store.getItem(CHECK_LEDGER_KEY); } catch { return { data: createCheckLedger(), warning: 'Check results could not be read from this browser.' }; }
  if (raw === null) return { data: createCheckLedger(), warning: null };
  try { return { data: parseCheckLedger(raw), warning: null }; } catch (error) {
    // Keep the unreadable original; new results start beside it, never over it.
    const backup = `${CHECK_LEDGER_KEY}.recovery.${Date.now()}`;
    try { store.setItem(backup, raw); } catch { /* the original key is still untouched */ }
    return { data: createCheckLedger(), warning: `${error instanceof Error ? error.message : 'The check record could not be read.'} The original is kept as ${backup}.` };
  }
}

/** The saved copy, or null when absent or unreadable. No side effects. */
export function readCheckLedger(target?: StorageLike): CheckLedger | null {
  try { const raw = storage(target)?.getItem(CHECK_LEDGER_KEY); return raw ? parseCheckLedger(raw) : null; } catch { return null; }
}

export function saveCheckLedger(ledger: CheckLedger, target?: StorageLike): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Check results will last only for this session.';
  try {
    // Never write over something unreadable without keeping a copy of it first.
    const existing = store.getItem(CHECK_LEDGER_KEY);
    if (existing !== null) {
      try { parseCheckLedger(existing); } catch { store.setItem(`${CHECK_LEDGER_KEY}.recovery.${Date.now()}`, existing); }
    }
    const output = JSON.stringify(ledger);
    store.setItem(CHECK_LEDGER_KEY, output);
    return store.getItem(CHECK_LEDGER_KEY) === output ? null : 'The browser did not keep your check results.';
  } catch { return 'Check results could not be saved in this browser.'; }
}

const order = (a: { at: unknown; id: unknown }, b: { at: unknown; id: unknown }) => String(a.at).localeCompare(String(b.at)) || String(a.id).localeCompare(String(b.id));

/** Add events. The first write of an ID wins, so a repeated write changes nothing. */
export function appendCheckEvents(ledger: CheckLedger, events: readonly CheckEvent[]): CheckLedger {
  const ids = new Set(ledger.events.map(e => e.id));
  const fresh = events.filter(e => !ids.has(e.id) && (ids.add(e.id), true));
  if (!fresh.length) return ledger;
  if (ledger.events.length + ledger.other.length + fresh.length > LIMITS.events) fail('The check record is full.');
  return { ...ledger, events: [...ledger.events, ...fresh].sort(order) };
}

/** Combine two copies (another tab, or memory and disk) without losing an event. */
export function mergeCheckLedgers(a: CheckLedger, b: CheckLedger): CheckLedger {
  const events = new Map<string, CheckEvent>();
  for (const e of [...a.events, ...b.events]) if (!events.has(e.id)) events.set(e.id, e);
  const other = new Map<string, Record<string, unknown>>();
  for (const e of [...a.other, ...b.other]) { const key = String(e.id ?? JSON.stringify(e)); if (!other.has(key)) other.set(key, e); }
  return { version: 1, events: [...events.values()].sort(order), other: [...other.values()] };
}
