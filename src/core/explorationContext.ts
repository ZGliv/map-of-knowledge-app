import { catalog, type AtlasNode } from './catalog';
import { DISCOVERIES } from './discoveries';
import type { FrontierSuggestion, LearnerState } from './guideTypes';
import { getEarnedIds, getFrontier } from './learner';
import type { NotebookEntry } from './notebook';
import { getTopicIntroduction } from './topicIntroductions';

export type DiscoveryProximity = 'inside' | 'nearby' | 'elsewhere';
export interface ScopedFrontierSuggestion extends FrontierSuggestion {
  proximity: DiscoveryProximity;
  scopeLabel: string;
}
export interface ExplorationBranch {
  node: AtlasNode;
  childCount: number;
  earnedCount: number;
  noteCount: number;
}
export interface ExplorationContext {
  node: AtlasNode;
  parent: AtlasNode | null;
  path: readonly AtlasNode[];
  domain: AtlasNode;
  overview: string;
  children: ExplorationBranch[];
  earnedCount: number;
  noteCount: number;
  scopedNotebookEntries: NotebookEntry[];
  suggestions: ScopedFrontierSuggestion[];
}

/** Membership follows the real catalog, not a shared text prefix or subject. */
export function isWithinTerritory(candidateId: string, territoryId: string): boolean {
  const candidate = catalog.get(candidateId);
  if (!candidate || !catalog.get(territoryId)) return false;
  return catalog.getPath(candidate).some(ancestor => ancestor.id === territoryId);
}

function notebookCount(entries: readonly NotebookEntry[], territoryId: string): number {
  return new Set(entries.filter(entry => entry.nodeIds.some(id => isWithinTerritory(id, territoryId))).map(entry => entry.id)).size;
}

function recentScopedEntries(entries: readonly NotebookEntry[], territoryId: string): NotebookEntry[] {
  const ordered = entries.filter(entry => entry.nodeIds.some(id => isWithinTerritory(id, territoryId)))
    .slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const unique = new Map<string, NotebookEntry>();
  for (const entry of ordered) if (!unique.has(entry.id)) unique.set(entry.id, entry);
  return [...unique.values()].slice(0, 3);
}

/** Context for the area on screen. Broad topic associations can suggest a
 * nearby discovery, but never move its evidence into a sibling territory. */
export function getExplorationContext(node: AtlasNode, learner: LearnerState, entries: readonly NotebookEntry[] = [], otherEarnedIds: readonly string[] = []): ExplorationContext {
  // Pieces earned elsewhere (expedition results) count toward the same area totals.
  const earned = new Set([...getEarnedIds(learner), ...otherEarnedIds]);
  const earnedCount = (id: string) => [...earned].filter(footprintId => isWithinTerritory(footprintId, id)).length;
  const priority: Record<DiscoveryProximity, number> = { inside: 0, nearby: 1, elsewhere: 2 };
  const suggestions = getFrontier(learner, node.id, DISCOVERIES.length).map(suggestion => {
    const { discovery } = suggestion;
    const proximity: DiscoveryProximity = isWithinTerritory(discovery.footprintId, node.id)
      ? 'inside'
      : discovery.topicId !== 'knowledge' && isWithinTerritory(node.id, discovery.topicId)
        ? 'nearby'
        : 'elsewhere';
    const topicName = catalog.get(discovery.topicId)?.name ?? discovery.subject;
    const discoveryNode = catalog.get(discovery.topicId);
    const discoveryDomain = discoveryNode ? catalog.getPath(discoveryNode)[1] : undefined;
    const currentDomain = catalog.getPath(node)[1];
    const scopeLabel = proximity === 'inside'
      ? `Within ${node.name}`
      : proximity === 'nearby' ? `Nearby in ${topicName}`
        : discoveryDomain && discoveryDomain.id === currentDomain?.id ? `Elsewhere in ${discoveryDomain.name}`
          : `Across the map · ${discoveryDomain?.name ?? discovery.subject}`;
    // getFrontier's original "inside" wording also covers broader topic
    // ancestry. Relabel that reason when this particular footprint is outside.
    const reason = proximity !== 'inside' && suggestion.reason.startsWith('A question inside the territory')
      ? `A question in ${topicName}, outside this specific map area. Its first check can help find a starting point.`
      : suggestion.reason;
    return { ...suggestion, reason, proximity, scopeLabel };
  }).sort((a, b) => priority[a.proximity] - priority[b.proximity]).slice(0, 3);
  return {
    node,
    parent: catalog.getParent(node),
    path: catalog.getPath(node),
    domain: catalog.getPath(node)[1] ?? catalog.root,
    overview: getTopicIntroduction(node).overview,
    children: catalog.getChildren(node).map(child => ({
      node: child,
      childCount: catalog.childCount(child),
      earnedCount: earnedCount(child.id),
      noteCount: notebookCount(entries, child.id),
    })),
    earnedCount: earnedCount(node.id),
    noteCount: notebookCount(entries, node.id),
    scopedNotebookEntries: recentScopedEntries(entries, node.id),
    suggestions,
  };
}
