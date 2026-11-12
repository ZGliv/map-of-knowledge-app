import { catalog } from '../../core/catalog';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import type { Content } from '../../contentLoader';

/*
 * Where every collection ends: the proof a place offers now. A lesson to begin, a case to try, a
 * refresh that is due, or the proof already made. Read from the same status the hubs and the map
 * use (checks/progress.ts), never decided here.
 */

export type ProofKind = 'lesson' | 'case' | 'refresh' | 'proved';
export interface Proof {
  readonly nodeId: string;
  readonly kind: ProofKind;
  /** The lesson at this place, when it has one. */
  readonly packId?: string;
  readonly lesson?: { readonly title: string; readonly minutes: number };
}

export const PROOF_WORD: Record<ProofKind, string> = { lesson: 'Lesson', case: 'Try a case', refresh: 'Refresh', proved: 'Proved' };

export interface ProofInput { readonly exp: ExpeditionLedger; readonly checks: CheckLedger; readonly now: number; readonly lit: (nodeId: string) => boolean }

/** The proof at exactly this place, or null when the place has no lesson, case or questions. */
export function proofAt(content: Content, nodeId: string, input: ProofInput): Proof | null {
  const expedition = content.expeditionAt(nodeId);
  const lesson = expedition ? { packId: expedition.pack.id, lesson: { title: expedition.pack.title, minutes: expedition.pack.minutes } } : {};
  const status = content.checkStatus(nodeId, input.exp, input.checks, input.now);
  const lit = input.lit(nodeId);
  const tried = !!expedition && input.exp.runs.some(run => run.packId === expedition.pack.id);
  if (status.kind === 'none') return expedition ? { nodeId, kind: lit ? 'proved' : 'lesson', ...lesson } : null;
  if (status.kind === 'ready') return { nodeId, kind: status.purpose === 'prove' ? (expedition && !tried ? 'lesson' : 'case') : 'refresh', ...lesson };
  if (lit) return { nodeId, kind: 'proved', ...lesson };
  // Not proved and nothing ready now (a miss is cooling): the lesson is still there to take.
  return expedition ? { nodeId, kind: 'lesson', ...lesson } : { nodeId, kind: 'case', ...lesson };
}

/** The nearest proof for a place without its own: an unproved charted place inside it (in route
 * order), else one beside it in its parent. */
export function nearestProof(content: Content, nodeId: string, input: ProofInput): Proof | null {
  const own = proofAt(content, nodeId, input);
  if (own) return own;
  const inside = (scope: string) => content.EXPEDITIONS.find(e => e.nodeId.startsWith(`${scope}.`) && !input.lit(e.nodeId));
  const parent = catalog.get(nodeId)?.parentId;
  const found = inside(nodeId) ?? (parent && catalog.get(parent)!.depth >= 2 ? inside(parent) : undefined);
  return found ? proofAt(content, found.nodeId, input) : null;
}
