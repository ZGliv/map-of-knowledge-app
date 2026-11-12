import { catalog, type AtlasNode } from '../core/catalog';
import { DISCOVERIES } from '../core/discoveries';
import type { Discovery, LearnerState } from '../core/guideTypes';
import { discoveryJourney } from '../core/learningJourney';
import { bestLevel, type ExpeditionLedger } from '../expeditions/ledger';
import { EXPEDITIONS, type Expedition } from '../expeditions/registry';
import type { NextStep } from '../hub/hubModel';

/** Where a learner stands with one thing they can learn, from the real ledgers only. */
export type LearnableStatus = 'new' | 'in-progress' | 'glimpsed' | 'familiar' | 'understood';

interface LearnableBase {
  /** Pack ID or discovery ID. */
  id: string;
  title: string;
  question: string;
  minutes: number;
  /** The exact map piece it can light. */
  nodeId: string;
  /** The top-level territory it belongs to. */
  territoryId: string;
  status: LearnableStatus;
  /** Latest recorded activity (ISO), or null when nothing with a time has been recorded. */
  lastAt: string | null;
}
export type Learnable =
  | LearnableBase & { kind: 'expedition'; expedition: Expedition }
  | LearnableBase & { kind: 'discovery'; discovery: Discovery };

export interface LearnableTerritory { node: AtlasNode; items: Learnable[]; understood: number }
export interface LearnablesModel {
  items: Learnable[];
  /** Started and not yet Understood, most recent first. */
  continuing: Learnable[];
  /** Every territory that has something to learn, in atlas order. */
  territories: LearnableTerritory[];
  counts: { total: number; understood: number; familiar: number; inProgress: number };
}

const territoryOf = (nodeId: string) => catalog.getChildren(catalog.root).find(node => nodeId === node.id || nodeId.startsWith(`${node.id}.`))?.id ?? catalog.root.id;
const latest = (times: readonly string[]) => times.reduce<string | null>((best, at) => !best || at > best ? at : best, null);

function expeditionStatus(ledger: ExpeditionLedger, packId: string): LearnableStatus {
  const level = bestLevel(ledger, packId);
  if (level === 'Understood') return 'understood';
  if (level === 'Familiar') return 'familiar';
  if (level === 'Glimpsed') return 'glimpsed';
  // Answers recorded without a finished run: the expedition was started.
  return ledger.seen[packId]?.length ? 'in-progress' : 'new';
}

function discoveryStatus(discovery: Discovery, learner: LearnerState): LearnableStatus {
  const journey = discoveryJourney(discovery, learner);
  if (journey.earned) return 'understood';
  if (journey.resumeIndex !== null) return 'in-progress';
  // A fresh example solved with support.
  if (journey.explored) return 'familiar';
  return 'new';
}

/** Everything that can be learned in this edition: placed expeditions, then authored discoveries.
 * `proven` lists nodes proved another way (a passed check), which count as Understood. */
export function listLearnables(learner: LearnerState, ledger: ExpeditionLedger, proven: readonly string[] = []): Learnable[] {
  const expeditions: Learnable[] = EXPEDITIONS.map(expedition => ({
    kind: 'expedition',
    expedition,
    id: expedition.pack.id,
    title: expedition.pack.title,
    question: expedition.pack.question,
    minutes: expedition.pack.minutes,
    nodeId: expedition.nodeId,
    territoryId: territoryOf(expedition.nodeId),
    status: proven.includes(expedition.nodeId) ? 'understood' : expeditionStatus(ledger, expedition.pack.id),
    lastAt: latest(ledger.runs.filter(run => run.packId === expedition.pack.id).map(run => run.at)),
  }));
  const discoveries: Learnable[] = DISCOVERIES.map(discovery => ({
    kind: 'discovery',
    discovery,
    id: discovery.id,
    title: discovery.title,
    question: discovery.question,
    minutes: discovery.minutes,
    nodeId: discovery.footprintId,
    territoryId: territoryOf(discovery.footprintId),
    status: discoveryStatus(discovery, learner),
    lastAt: latest(learner.attempts.filter(attempt => attempt.discoveryId === discovery.id).map(attempt => attempt.at)),
  }));
  return [...expeditions, ...discoveries];
}

export function buildLearnables(learner: LearnerState, ledger: ExpeditionLedger, proven: readonly string[] = []): LearnablesModel {
  const items = listLearnables(learner, ledger, proven);
  const continuing = items
    .filter(item => item.status !== 'new' && item.status !== 'understood')
    .map((item, index) => ({ item, index }))
    // Most recent first; untimed starts keep catalog order after the timed ones.
    .sort((a, b) => (b.item.lastAt ?? '').localeCompare(a.item.lastAt ?? '') || a.index - b.index)
    .map(({ item }) => item);
  const territories = catalog.getChildren(catalog.root)
    .map(node => {
      const inside = items.filter(item => item.territoryId === node.id);
      return { node, items: inside, understood: inside.filter(item => item.status === 'understood').length };
    })
    .filter(group => group.items.length > 0);
  return {
    items,
    continuing,
    territories,
    counts: {
      total: items.length,
      understood: items.filter(item => item.status === 'understood').length,
      familiar: items.filter(item => item.status === 'familiar').length,
      inProgress: items.filter(item => item.status === 'in-progress' || item.status === 'glimpsed').length,
    },
  };
}

/** What the list leads with when nothing is in progress: the map's own next step, when that step
 * is on the list. A due check is not, so the list then leads with nothing rather than with
 * something the map isn't suggesting. */
export function leadFor(model: LearnablesModel, next: NextStep | null): Learnable | null {
  if (!next || next.kind === 'check' || next.kind === 'welcome') return null;
  return model.items.find(item => next.kind === 'expedition'
    ? item.kind === 'expedition' && item.id === next.item.expedition.pack.id
    : item.kind === 'discovery' && item.id === next.item.discovery.id) ?? null;
}

/** The verb on an item's way in, matching the hub and the map's own leaf panel. */
export function learnableVerb(item: Learnable): string {
  if (item.kind === 'expedition') return item.status === 'understood' ? 'Play again' : item.status === 'new' || item.status === 'in-progress' ? 'Begin' : 'Try again';
  return item.status === 'in-progress' ? 'Continue' : item.status === 'new' ? 'Begin' : 'Revisit';
}
