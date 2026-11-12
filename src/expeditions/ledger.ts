import type { Level, Summary } from './engine/evidence';
import { PACK_PLACES, packPlace } from './manifest';

/** Expedition evidence, kept beside the discovery learner (mok-learner-v1), whose events
 * are tied to authored discovery challenges and cannot hold expedition grades.
 *
 * The rule is the lab's, applied honestly across sessions:
 * - A run's level comes from first, unaided answers (engine/evidence.ts summarize).
 * - Once a grade has been answered, its answer has been shown. In any later session that
 *   grade counts as assisted, so replaying cannot turn a revealed answer into evidence.
 * - A piece of the map lights when any run reaches Understood: every transfer check right
 *   on the first, unaided try. Familiar is recorded and shown, but does not color land. */
export const EXPEDITION_LEDGER_KEY = 'mok-expeditions-v1';
const LIMITS = { runs: 2_000, raw: 2_000_000, misses: 24, text: 600 } as const;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface ExpeditionRun {
  readonly id: string;
  readonly packId: string;
  readonly level: Level;
  readonly firstTry: { right: number; total: number };
  readonly transfer: { right: number; total: number };
  readonly at: string;
  /** First answers that were wrong, in the learner's words. Optional: older runs have none. */
  readonly misses?: readonly RunMiss[];
}
export interface RunMiss { readonly gradeId: string; readonly prompt: string; readonly chosen: string }
export interface ExpeditionLedger {
  readonly version: 1;
  readonly runs: readonly ExpeditionRun[];
  /** Grades answered at least once, per pack. */
  readonly seen: Readonly<Record<string, readonly string[]>>;
}

export const createExpeditionLedger = (): ExpeditionLedger => ({ version: 1, runs: [], seen: {} });

const LEVELS: readonly Level[] = ['Glimpsed', 'Familiar', 'Understood'];
const fail = (message: string): never => { throw new Error(message); };
const count = (value: unknown, label: string) => {
  const raw = value as { right?: unknown; total?: unknown } | null;
  if (!raw || !Number.isInteger(raw.right) || !Number.isInteger(raw.total) || (raw.right as number) < 0 || (raw.right as number) > (raw.total as number)) fail(`${label} must be whole counts.`);
  return { right: raw!.right as number, total: raw!.total as number };
};

/** Misses are a convenience for the journal: malformed ones are dropped, never fatal. */
function missesOf(value: unknown): RunMiss[] {
  if (!Array.isArray(value)) return [];
  const ok = (text: unknown): text is string => typeof text === 'string' && text.length > 0 && text.length <= LIMITS.text;
  return value.filter((m): m is RunMiss => !!m && ok(m.gradeId) && ok(m.prompt) && ok(m.chosen))
    .slice(0, LIMITS.misses).map(m => ({ gradeId: m.gradeId, prompt: m.prompt, chosen: m.chosen }));
}

export function parseExpeditionLedger(raw: string): ExpeditionLedger {
  if (typeof raw !== 'string' || raw.length > LIMITS.raw) fail('The lesson record is too large to read.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('The lesson record is not valid JSON.'); }
  const data = value as { version?: unknown; runs?: unknown; seen?: unknown } | null;
  if (!data || data.version !== 1 || !Array.isArray(data.runs) || !data.seen || typeof data.seen !== 'object' || Array.isArray(data.seen)) fail('Unsupported lesson record.');
  if ((data!.runs as unknown[]).length > LIMITS.runs) fail('The lesson record holds more runs than this version keeps.');
  const runs = (data!.runs as unknown[]).map((item): ExpeditionRun => {
    const run = item as Record<string, unknown>;
    if (!run || typeof run.id !== 'string' || typeof run.packId !== 'string' || typeof run.at !== 'string' || Number.isNaN(Date.parse(run.at))) fail('A lesson run is incomplete.');
    if (!LEVELS.includes(run.level as Level)) fail('A lesson run has an unknown level.');
    const parsed: ExpeditionRun = { id: run.id as string, packId: run.packId as string, level: run.level as Level, firstTry: count(run.firstTry, 'First-try results'), transfer: count(run.transfer, 'Transfer results'), at: run.at as string };
    const misses = missesOf(run.misses);
    return misses.length ? { ...parsed, misses } : parsed;
  });
  const seen: Record<string, string[]> = {};
  for (const [packId, grades] of Object.entries(data!.seen as Record<string, unknown>)) {
    if (!Array.isArray(grades) || grades.some(grade => typeof grade !== 'string')) fail('Seen grades must be lists of grade IDs.');
    seen[packId] = [...new Set(grades as string[])];
  }
  return { version: 1, runs, seen };
}

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadExpeditionLedger(target?: StorageLike): { data: ExpeditionLedger; warning: string | null } {
  const store = storage(target);
  if (!store) return { data: createExpeditionLedger(), warning: 'Browser storage is unavailable. Lesson results will last only for this session.' };
  let raw: string | null;
  try { raw = store.getItem(EXPEDITION_LEDGER_KEY); } catch { return { data: createExpeditionLedger(), warning: 'Lesson results could not be read from this browser.' }; }
  if (raw === null) return { data: createExpeditionLedger(), warning: null };
  try { return { data: parseExpeditionLedger(raw), warning: null }; } catch (error) {
    // Keep the unreadable original; new results start beside it rather than over it.
    const backup = `${EXPEDITION_LEDGER_KEY}.recovery.${Date.now()}`;
    try { store.setItem(backup, raw); } catch { /* the original key is still untouched */ }
    return { data: createExpeditionLedger(), warning: `${error instanceof Error ? error.message : 'The lesson record could not be read.'} The original is kept as ${backup}.` };
  }
}

/** The saved copy, or null when it is absent or unreadable. No side effects, for frequent reads. */
export function readExpeditionLedger(target?: StorageLike): ExpeditionLedger | null {
  try { const raw = storage(target)?.getItem(EXPEDITION_LEDGER_KEY); return raw ? parseExpeditionLedger(raw) : null; } catch { return null; }
}

export function saveExpeditionLedger(ledger: ExpeditionLedger, target?: StorageLike): string | null {
  const store = storage(target);
  if (!store) return 'Browser storage is unavailable. Lesson results will last only for this session.';
  try {
    const output = JSON.stringify(ledger);
    store.setItem(EXPEDITION_LEDGER_KEY, output);
    return store.getItem(EXPEDITION_LEDGER_KEY) === output ? null : 'The browser did not keep your lesson results.';
  } catch { return 'Lesson results could not be saved in this browser.'; }
}

export function markSeen(ledger: ExpeditionLedger, packId: string, gradeId: string): ExpeditionLedger {
  const current = ledger.seen[packId] ?? [];
  if (current.includes(gradeId)) return ledger;
  return { ...ledger, seen: { ...ledger.seen, [packId]: [...current, gradeId] } };
}

/** Idempotent per run ID, so a payoff that reports twice records once. */
export function recordRun(ledger: ExpeditionLedger, run: { id: string; packId: string; summary: Summary; at?: string }): ExpeditionLedger {
  if (ledger.runs.some(existing => existing.id === run.id)) return ledger;
  if (!packPlace(run.packId)) fail(`Unknown lesson "${run.packId}".`);
  if (ledger.runs.length >= LIMITS.runs) fail('The lesson record is full.');
  const { level, firstTry, transfer } = run.summary;
  const misses = missesOf(run.summary.misses);
  const recorded: ExpeditionRun = { id: run.id, packId: run.packId, level, firstTry: { ...firstTry }, transfer: { ...transfer }, at: run.at ?? new Date().toISOString() };
  return { ...ledger, runs: [...ledger.runs, misses.length ? { ...recorded, misses } : recorded] };
}

/** The best level any run reached for a pack, or null if none finished. */
export function bestLevel(ledger: ExpeditionLedger, packId: string): Level | null {
  let best = -1;
  for (const run of ledger.runs) if (run.packId === packId) best = Math.max(best, LEVELS.indexOf(run.level));
  return best < 0 ? null : LEVELS[best];
}

/** Map pieces earned through expeditions: the leaf of every pack with an Understood run. */
export function getExpeditionEarnedIds(ledger: ExpeditionLedger): string[] {
  return PACK_PLACES.filter(place => bestLevel(ledger, place.packId) === 'Understood').map(place => place.nodeId);
}

/** Combine two copies (another tab, or memory and disk) without losing a run or a seen grade. */
export function mergeExpeditionLedgers(a: ExpeditionLedger, b: ExpeditionLedger): ExpeditionLedger {
  const runs = new Map(a.runs.map(run => [run.id, run]));
  for (const run of b.runs) if (!runs.has(run.id)) runs.set(run.id, run);
  const seen: Record<string, string[]> = {};
  for (const source of [a.seen, b.seen]) for (const [packId, grades] of Object.entries(source)) seen[packId] = [...new Set([...(seen[packId] ?? []), ...grades])];
  return { version: 1, runs: [...runs.values()].sort((x, y) => x.at.localeCompare(y.at) || x.id.localeCompare(y.id)), seen };
}
