import { catalog, type AtlasNode } from '../core/catalog';
import { DISCOVERIES, getDiscovery } from '../core/discoveries';
import { EVOLUTION_CONNECTIONS, EVOLUTION_ID, EVOLUTION_TERRITORIES, type EvolutionTerritory } from '../core/evolution';
import { EVOLUTION_CORE, type LibraryWork } from '../core/evolutionLibrary';
import { getExplorationContext, isWithinTerritory } from '../core/explorationContext';
import type { Discovery, LearnerState } from '../core/guideTypes';
import { continueDiscovery, discoveryJourney } from '../core/learningJourney';
import { getNotebookEntriesForNode, type NotebookEntry } from '../core/notebook';
import { getTopicIntroduction, TOPIC_INTRODUCTIONS, type TopicIntroduction } from '../core/topicIntroductions';
import { bankFor } from '../checks/banks';
import { hasCases, nextCase } from '../cases';
import type { PlaceCase } from '../cases/types';
import type { CheckLedger } from '../checks/ledger';
import type { Freshness } from '../checks/freshness';
import { checkSessions, checkStatus, dueChecks, freshnessByNode, nodeLevel, nodeProgress, welcomeVisit, type CheckStatus, type NodeLevel } from '../checks/progress';
import { bestLevel, type ExpeditionLedger } from '../expeditions/ledger';
import { expeditionAt, expeditionsWithin, getExpedition, type Expedition } from '../expeditions/registry';

/** `level` counts passed checks as well as expedition runs; `check` is the node's "Prove it" check, where it has one. */
export interface HubExpedition { expedition: Expedition; level: NodeLevel | null; check?: CheckStatus }
/** A Lasting check or refresh that has come due: the node, the expedition that teaches it, and the
 * new case that will prove it again (none when only the question bank is left). */
export interface HubCheckStep { node: AtlasNode; expedition?: Expedition; level: NodeLevel | null; newCase?: PlaceCase; purpose: 'lasting' | 'refresh' }
export interface HubDiscovery { discovery: Discovery; earned: boolean; resume: boolean }
export type NextStep =
  | { kind: 'expedition'; item: HubExpedition }
  | { kind: 'discovery'; item: HubDiscovery }
  | { kind: 'check'; item: HubCheckStep }
  /** Back after a break: a few places ready to refresh (at most three), offered quietly. */
  | { kind: 'welcome'; items: HubCheckStep[] };

export interface HubChild {
  node: AtlasNode;
  childCount: number;
  earned: number;
  charted: number;
  notes: number;
  /** Set for Evolution's headline territories. */
  territory?: EvolutionTerritory;
  expedition?: HubExpedition;
  /** The child's check, when it has a bank. */
  check?: CheckStatus;
  /** Its freshness glow, 0 to 1, once proved. */
  glow?: number;
}

export interface HubConnection { label: string; nodeId: string; path: string }

export interface HubModel {
  node: AtlasNode;
  path: readonly AtlasNode[];
  parent: AtlasNode | null;
  territory?: EvolutionTerritory;
  overview: string;
  /** Curated key ideas and a thought experiment, where this place has them. */
  introduction: TopicIntroduction | null;
  /** Pieces that can be earned in or below this place in this edition, and how many are. */
  progress: { earned: number; charted: number; familiar: number; notes: number };
  next: NextStep | null;
  children: HubChild[];
  /** For a place with nothing inside it: the other places beside it. */
  siblings: HubChild[];
  expeditions: HubExpedition[];
  discoveries: HubDiscovery[];
  library: LibraryWork[];
  notes: NotebookEntry[];
  connections: HubConnection[];
  /** This place's own "Prove it" check, when it has a bank. */
  check: CheckStatus | null;
  /** Whether a new case is still left to play here; once they are spent, what opens next is a check in words. */
  caseLeft: boolean;
  /** This place's own freshness once proved: its glow and refresh ladder (checks/freshness.ts). */
  freshness: Freshness | null;
  /** When this place became Lasting. Lasting is never lost, whatever its refresh. */
  lastingAt: string | null;
  /** True inside the charted Evolution field, where uncharted land is named as such. */
  charting: boolean;
}

const territoryOf = (nodeId: string) => EVOLUTION_TERRITORIES.find(territory => `${EVOLUTION_ID}.${territory.key}` === nodeId);
const placeName = (nodeId: string) => {
  const node = catalog.get(nodeId);
  return node ? catalog.getPath(node).slice(1).map(step => step.name).join(' › ') : '';
};

/** Every place where a piece can be earned now: expedition leaves, discovery footprints and places
 * with a generated page (auto/), each of which has its own "Prove it". */
function chartedWithin(nodeId: string, generated: ReadonlySet<string> = NONE): Set<string> {
  const pieces = new Set(expeditionsWithin(nodeId).map(expedition => expedition.nodeId));
  for (const discovery of DISCOVERIES) if (isWithinTerritory(discovery.footprintId, nodeId)) pieces.add(discovery.footprintId);
  for (const id of generated) if (id === nodeId || id.startsWith(`${nodeId}.`)) pieces.add(id);
  return pieces;
}
const NONE: ReadonlySet<string> = new Set();

export interface HubInput {
  learner: LearnerState;
  ledger: ExpeditionLedger;
  /** Every earned map piece: discovery footprints and Understood expedition leaves. */
  earnedIds: readonly string[];
  entries: readonly NotebookEntry[];
  /** "Prove it" check answers, and the clock they're judged by. Without them, checks are ignored. */
  checks?: CheckLedger;
  now?: number;
  /** When the learner did anything else on this device (core/activity.ts): a day spent watching is not a break. */
  activity?: readonly string[];
  /** Places with a generated page (auto/index.json). */
  generated?: ReadonlySet<string>;
}

/** Levels from expedition runs and passed checks together, plus the node's check status. */
function evidenceOf({ ledger, checks, now }: HubInput) {
  const level = (expedition: Expedition): NodeLevel | null => checks ? nodeLevel(expedition.nodeId, ledger, checks) : bestLevel(ledger, expedition.pack.id);
  const status = (nodeId: string): CheckStatus | undefined => checks && (bankFor(nodeId) || hasCases(nodeId)) ? checkStatus(nodeId, ledger, checks, now ?? Date.now()) : undefined;
  const item = (expedition: Expedition): HubExpedition => ({ expedition, level: level(expedition), check: status(expedition.nodeId) });
  return { item, status };
}
const proved = (level: NodeLevel | null) => level === 'Understood' || level === 'Lasting';

/** The single next step for a place: unfinished work first, then (back after a break) the visit's
 * welcome-back set, or a Lasting check or refresh that has come due, then the next expedition on the
 * route, then the discovery the field guide suggests here. The world follows the route too, so a new
 * learner starts at its first expedition (E10). */
export function nextStepFor(node: AtlasNode, input: HubInput): NextStep | null {
  const { learner, ledger, earnedIds, entries, checks, now } = input;
  const evidence = evidenceOf(input);
  const discoveryState = (discovery: Discovery): HubDiscovery => {
    const journey = discoveryJourney(discovery, learner);
    return { discovery, earned: journey.earned, resume: journey.resumeIndex !== null };
  };
  const resuming = continueDiscovery(learner);
  if (resuming && isWithinTerritory(resuming.footprintId, node.id)) return { kind: 'discovery', item: discoveryState(resuming) };
  // Route order (Evolution's route, then the other packs): the first one not yet proved.
  const expeditions = expeditionsWithin(node.id).map(evidence.item);
  const open = expeditions.find(item => !proved(item.level));
  // Started and not yet Understood is still in progress, and comes first.
  if (open?.level) return { kind: 'expedition', item: open };
  const clock = now ?? Date.now();
  const sessions = checks ? checkSessions(checks) : [];
  const step = (nodeId: string): HubCheckStep | undefined => {
    const dueNode = catalog.get(nodeId);
    if (!dueNode || !checks) return undefined;
    const expedition = expeditionAt(dueNode.id);
    const status = evidence.status(dueNode.id);
    const purpose = status?.kind === 'ready' && status.purpose === 'refresh' ? 'refresh' : 'lasting';
    return { node: dueNode, expedition, level: expedition ? evidence.item(expedition).level : null, newCase: nextCase(dueNode.id, checks), purpose };
  };
  const visit = checks ? welcomeVisit(ledger, checks, clock, sessions, input.activity) : null;
  const welcomeItems = visit?.nodes.filter(id => isWithinTerritory(id, node.id)).map(step).filter((item): item is HubCheckStep => !!item) ?? [];
  if (welcomeItems.length) return { kind: 'welcome', items: welcomeItems };
  // Back after a break, the welcome set is all that is offered: other due places wait for the next
  // visit rather than following one by one. A place's own page still offers its own refresh.
  const due = checks ? dueChecks(node.id, ledger, checks, clock, sessions).find(id => !visit || id === node.id) : undefined;
  const dueStep = due ? step(due) : undefined;
  if (dueStep) return { kind: 'check', item: dueStep };
  if (open) return { kind: 'expedition', item: open };
  const context = getExplorationContext(node, learner, entries, earnedIds);
  const inside = node.depth === 0 ? context.suggestions[0] : context.suggestions.find(suggestion => suggestion.proximity === 'inside');
  if (inside) return { kind: 'discovery', item: discoveryState(inside.discovery) };
  if (expeditions[0]) return { kind: 'expedition', item: expeditions[0] };
  return null;
}

export function buildHub(node: AtlasNode, input: HubInput): HubModel {
  const { learner, earnedIds, entries } = input;
  const evidence = evidenceOf(input);
  const earned = new Set(earnedIds);
  const notesFor = (id: string) => new Set(entries.filter(entry => entry.nodeIds.some(nodeId => isWithinTerritory(nodeId, id))).map(entry => entry.id)).size;
  const countEarned = (pieces: Set<string>) => [...pieces].filter(id => earned.has(id)).length;
  const levelOf = evidence.item;
  const fresh = input.checks ? freshnessByNode(input.ledger, input.checks, input.now ?? Date.now()) : new Map<string, Freshness>();

  const charted = chartedWithin(node.id, input.generated);
  const expeditions = expeditionsWithin(node.id).map(levelOf);
  const discoveries = DISCOVERIES.filter(discovery => isWithinTerritory(discovery.footprintId, node.id)).map(discovery => {
    const journey = discoveryJourney(discovery, learner);
    return { discovery, earned: journey.earned, resume: journey.resumeIndex !== null };
  });
  const describe = (child: AtlasNode): HubChild => {
    const pieces = chartedWithin(child.id, input.generated);
    const expedition = expeditionAt(child.id);
    return {
      node: child,
      childCount: catalog.childCount(child),
      earned: countEarned(pieces),
      charted: pieces.size,
      notes: notesFor(child.id),
      territory: territoryOf(child.id),
      expedition: expedition ? levelOf(expedition) : undefined,
      check: evidence.status(child.id),
      glow: fresh.get(child.id)?.glow,
    };
  };
  const children = catalog.getChildren(node).map(describe);
  const parentNode = catalog.getParent(node);
  const siblings = !children.length && parentNode ? catalog.getChildren(parentNode).filter(sibling => sibling.id !== node.id).map(describe) : [];

  const territory = territoryOf(node.id);
  const inEvolution = node.id === EVOLUTION_ID || node.id.startsWith(`${EVOLUTION_ID}.`);
  const library = node.id === EVOLUTION_ID ? [...EVOLUTION_CORE]
    : territory ? EVOLUTION_CORE.filter(work => work.covers?.includes(territory.code)) : [];

  // Connections: Evolution's portals and bridges, then the places this area's own
  // expeditions and discoveries point to outside it.
  const connections: HubConnection[] = [];
  const add = (label: string, nodeId: string) => {
    if (!catalog.get(nodeId) || isWithinTerritory(nodeId, node.id) || connections.some(item => item.label === label)) return;
    connections.push({ label, nodeId, path: placeName(nodeId) });
  };
  if (node.id === EVOLUTION_ID) for (const connection of EVOLUTION_CONNECTIONS) add(connection.label, connection.nodeId);
  for (const { expedition } of expeditions) {
    for (const beat of expedition.pack.beats) if (beat.kind === 'payoff') for (const connection of beat.connections) {
      const target = connection.to ? getExpedition(connection.to)?.nodeId : connection.node;
      if (target) add(connection.title, target);
    }
  }
  for (const { discovery } of discoveries) for (const id of discovery.connections) {
    const other = getDiscovery(id);
    if (other) add(other.title, other.topicId);
  }

  const familiar = expeditions.filter(item => item.level === 'Familiar').length;
  return {
    node,
    path: catalog.getPath(node),
    parent: parentNode,
    territory,
    overview: territory?.claim ?? getTopicIntroduction(node).overview,
    introduction: TOPIC_INTRODUCTIONS[node.id] ?? null,
    progress: { earned: countEarned(charted), charted: charted.size, familiar, notes: notesFor(node.id) },
    next: nextStepFor(node, input),
    children,
    siblings,
    expeditions,
    discoveries,
    library,
    notes: getNotebookEntriesForNode({ version: 1, entries: [...entries] }, node.id).slice(0, 6),
    connections: connections.slice(0, 12),
    check: evidence.status(node.id) ?? null,
    caseLeft: !!input.checks && !!nextCase(node.id, input.checks),
    freshness: fresh.get(node.id) ?? null,
    lastingAt: input.checks ? nodeProgress(node.id, input.ledger, input.checks, undefined, input.now ?? Date.now()).lastingAt : null,
    charting: inEvolution,
  };
}
