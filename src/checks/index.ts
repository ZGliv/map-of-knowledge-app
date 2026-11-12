// The small surface other parts of the app call. The Explore feed's "Prove it" button:
//   if (hasCheck(nodeId)) <a href={checkHref(nodeId, fromNodeId)}>Prove it</a>
// The check screen itself is routed at #/check/<nodeId>[?from=<hub nodeId>].
import { routeHash } from '../hub/route';
import { bankFor } from './banks';

/** True when this map node has a "Prove it" check. */
export const hasCheck = (nodeId: string): boolean => !!bankFor(nodeId);

/** The address of a node's check. `from` is the hub the check returns to (defaults to the node's own). */
export const checkHref = (nodeId: string, from?: string): string => routeHash({ kind: 'check', nodeId, from: from ?? null });

export { BANKS, bankFor } from './banks';
export { CHECK_LEDGER_KEY } from './ledger';
export { checkStatus, earnedNodeIds, nodeLevel, dueChecks, type CheckStatus, type NodeLevel } from './progress';
export { CHECK_POLICY } from './rule';
