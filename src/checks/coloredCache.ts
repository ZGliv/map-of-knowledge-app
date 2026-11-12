import type { CheckLedger } from './ledger';

/**
 * The land passed checks color, remembered beside the check record (mok-checks-v1) so the map can
 * paint before the check banks load: a pass is always regraded from its bank, and the banks are
 * too big to wait for. The copy is trusted only for the exact record and the exact grading code it
 * was computed from; anything else reads as unknown. Once the banks load, the app recomputes the
 * real answer and writes it here, so the copy is never more than a cache.
 */
export const CHECK_COLOR_KEY = 'mok-check-color-v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

// A fingerprint of the grading code (checks/progress.ts and everything it imports), set at build
// time in vite.config.ts.
declare const __MOK_GRADING_KEY__: string | undefined;
export const GRADING_KEY = typeof __MOK_GRADING_KEY__ === 'string' ? __MOK_GRADING_KEY__ : 'unbuilt';

interface CheckColor { version: 1; source: string; record: string; ids: string[] }

/** cyrb53: a fast 53-bit string hash. Not cryptographic; it only has to tell two records apart. */
function hash(text: string): string {
  let a = 0xdeadbeef, b = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}

/** Which record a copy belongs to: its events, in order. */
export const recordFingerprint = (checks: CheckLedger): string => {
  const text = JSON.stringify(checks.events);
  return `${checks.events.length}.${text.length}.${hash(text)}`;
};

function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** What passed checks color, known without the banks: nothing when no check was ever finished,
 * the remembered copy when it matches this record and this grading code, otherwise null (unknown). */
export function rememberedCheckColor(checks: CheckLedger, target?: StorageLike, source = GRADING_KEY): string[] | null {
  if (!checks.events.some(event => event.t === 'finish')) return [];
  try {
    const raw = storage(target)?.getItem(CHECK_COLOR_KEY);
    if (!raw) return null;
    const copy = JSON.parse(raw) as Partial<CheckColor> | null;
    if (!copy || copy.version !== 1 || copy.source !== source || copy.record !== recordFingerprint(checks)) return null;
    return Array.isArray(copy.ids) && copy.ids.every(id => typeof id === 'string') ? [...copy.ids] : null;
  } catch { return null; }
}

/** Keep the computed answer for the next visit. Best effort: a failed write only costs speed. */
export function rememberCheckColor(checks: CheckLedger, ids: readonly string[], target?: StorageLike, source = GRADING_KEY): void {
  const output = JSON.stringify({ version: 1, source, record: recordFingerprint(checks), ids: [...ids] } satisfies CheckColor);
  try {
    const store = storage(target);
    if (store && store.getItem(CHECK_COLOR_KEY) !== output) store.setItem(CHECK_COLOR_KEY, output);
  } catch { /* the next visit recomputes */ }
}
