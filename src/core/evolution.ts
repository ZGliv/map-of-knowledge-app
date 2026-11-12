/** Science › Biology › Evolution, the first charted field.
 * Sources: mok-content-lab docs/PLAN.md §9.3–9.4 (headline claims v0), §7.8 (route),
 * docs/EVOLUTION-SLICE.md §5.2–5.3, and docs/research/appendix-evolution.md (verified 2026-10-16).
 * Pure data: the catalog imports this file, so it must not import the catalog. */

export const BIOLOGY_ID = 'knowledge.science.biology';
export const EVOLUTION_ID = `${BIOLOGY_ID}.evolution`;

/** Biology's fields from the plan's Life realm (EVOLUTION-SLICE §5.2). Only Evolution is charted.
 * Ecology is omitted here because the atlas already places it at Earth › Ecology. */
export const BIOLOGY_FIELDS = [
  { key: 'molecules-cells', name: 'Molecules & Cells' },
  { key: 'genetics-genomes', name: 'Genetics & Genomes' },
  { key: 'evolution', name: 'Evolution' },
  { key: 'plants-fungi', name: 'Plants & Fungi' },
  { key: 'animals', name: 'Animals' },
  { key: 'microbes', name: 'Microbes' },
  { key: 'development-physiology', name: 'Development & Physiology' },
] as const;

export interface EvolutionTerritory {
  /** Headline code from the plan. */
  readonly code: string;
  /** Stable map key; the node ID is `${EVOLUTION_ID}.${key}`. Never derive it from the display name. */
  readonly key: string;
  readonly name: string;
  readonly claim: string;
}

/** The 12 headline claims, in E-code order. Wording is the plan's v0. */
export const EVOLUTION_TERRITORIES: readonly EvolutionTerritory[] = [
  { code: 'E01', key: 'tree-thinking', name: 'Tree thinking', claim: 'All life is one family tree; relatedness means a more recent shared ancestor.' },
  { code: 'E02', key: 'variation-heredity', name: 'Variation and heredity', claim: 'Individuals differ, and much of that difference is inherited.' },
  { code: 'E03', key: 'natural-selection', name: 'Natural selection', claim: 'Inherited traits that help survival and reproduction become more common; populations evolve, individuals don’t.' },
  { code: 'E04', key: 'chance-drift', name: 'Chance and drift', claim: 'Chance changes populations too: mutation is random with respect to need, and drift acts on every finite population.' },
  { code: 'E05', key: 'new-species', name: 'New species', claim: 'New species form when populations split and stop interbreeding.' },
  { code: 'E06', key: 'deep-time', name: 'Deep time', claim: 'Earth is about 4.5 billion years old, and rocks and fossils record life’s history.' },
  { code: 'E07', key: 'evidence', name: 'Evidence', claim: 'Independent lines of evidence (fossils, anatomy, DNA, geography) tell the same story.' },
  { code: 'E08', key: 'transitions-extinctions', name: 'Transitions and extinctions', claim: 'Life’s history runs through rare major transitions and mass extinctions.' },
  { code: 'E09', key: 'human-evolution', name: 'Human evolution', claim: 'Humans are apes: we share an ancestor with chimpanzees (we did not descend from them), and our species arose in Africa.' },
  { code: 'E10', key: 'evolution-now', name: 'Evolution now', claim: 'Evolution is happening now: resistance in bacteria, pests and viruses.' },
  { code: 'E11', key: 'sexual-selection', name: 'Sexual selection', claim: 'Some traits spread because they win mates, even at a cost to survival.' },
  { code: 'E12', key: 'how-we-know', name: 'How we know', claim: 'Evolution is a tested scientific theory, and we can say how we know.' },
];

export const evolutionTerritoryId = (key: string) => `${EVOLUTION_ID}.${key}`;

/** The default learning route through the field (PLAN §7.8). */
export const EVOLUTION_ROUTE = ['E10', 'E02', 'E03', 'E04', 'E01', 'E06', 'E07', 'E05', 'E11', 'E08', 'E09', 'E12'] as const;

export const EVOLUTION_OVERVIEW = 'How living things change across generations, how every species is related, and how we know. Twelve headline claims, from bacteria that evolve in days to the long walk out of Africa.';

/** Where Evolution meets the rest of the atlas: the plan's portal notes (PLAN §9.3) and the
 * appendix's prerequisite bridges, each pointed at the closest existing atlas place. */
export const EVOLUTION_CONNECTIONS: readonly { label: string; nodeId: string; kind: 'portal' | 'bridge' }[] = [
  { label: 'Paleontology methods', nodeId: 'knowledge.earth.geology', kind: 'portal' },
  { label: 'Evolutionary psychology', nodeId: 'knowledge.society.psychology', kind: 'portal' },
  { label: 'Cultural evolution', nodeId: 'knowledge.society.anthropology', kind: 'portal' },
  { label: 'Genetic algorithms', nodeId: 'knowledge.technology.computing', kind: 'portal' },
  { label: 'Philosophy of biology', nodeId: 'knowledge.humanities.philosophy', kind: 'portal' },
  { label: 'Probability and sampling', nodeId: 'knowledge.mathematics.probability', kind: 'bridge' },
  { label: 'Radioactive decay', nodeId: 'knowledge.science.physics', kind: 'bridge' },
  { label: 'Populations, predation and niches', nodeId: 'knowledge.earth.ecology', kind: 'bridge' },
  { label: 'Victorian Britain and the Industrial Revolution', nodeId: 'knowledge.humanities.history', kind: 'bridge' },
];
