import { hasCases } from '../cases';
import { hasCheck } from '../checks';
import { expeditionAt } from '../expeditions/registry';
import { pushRoute, type AtlasRoute } from '../hub/route';

/** Where a reel's "Try a new case" leads: the place's field mission, else its question bank, else
 * its expedition, else its hub. */
export function proveItRoute(nodeId: string): AtlasRoute {
  if (hasCases(nodeId)) return { kind: 'mission', nodeId, from: null };
  if (hasCheck(nodeId)) return { kind: 'check', nodeId, from: null };
  const expedition = expeditionAt(nodeId);
  return expedition ? { kind: 'expedition', packId: expedition.pack.id, beat: 0, from: null } : { kind: 'hub', nodeId };
}

/** Open a new case for a place. Reels never color the map; only what this opens can. */
export function proveIt(nodeId: string): void {
  pushRoute(proveItRoute(nodeId));
}
