import { catalog, conceptNodeId } from '../core/catalog';
import { EVOLUTION_ROUTE, EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import { evolutionE04 } from './content/evolution-e04';
import { evolutionE01 } from './content/evolution-e01';
import { evolutionE02 } from './content/evolution-e02';
import { evolutionE03 } from './content/evolution-e03';
import { BLACK_DEATH } from '../core/history';
import { evolutionE05 } from './content/evolution-e05';
import { evolutionE06 } from './content/evolution-e06';
import { evolutionE07 } from './content/evolution-e07';
import { evolutionE08 } from './content/evolution-e08';
import { evolutionE09 } from './content/evolution-e09';
import { evolutionE10 } from './content/evolution-e10';
import { evolutionE11 } from './content/evolution-e11';
import { evolutionE12 } from './content/evolution-e12';
import { history } from './content/history';
import { music } from './content/music';
import { physics } from './content/physics';
import type { Media, Pack } from './content/types';
import { GENERATED_PLACES } from '../places/generated';

/** A playable expedition and the exact map piece it can light. */
export interface Expedition {
  readonly pack: Pack;
  /** A terminal atlas leaf. Understood here colors exactly this piece. */
  readonly nodeId: string;
  /** Evolution headline code, when the expedition belongs to the charted field. */
  readonly code?: string;
}

const evo = (code: string) => evolutionTerritoryId(EVOLUTION_TERRITORIES.find(t => t.code === code)!.key);
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const HARMONY = 'knowledge.arts.music.harmony';

/** Lab packs and their homes. The lab's own "Life › …" paths are replaced by atlas paths.
 * The Black Death lives at History › The Medieval World › The Black Death (core/history.ts). */
const PLACEMENTS: readonly { pack: Pack; nodeId: string; code?: string }[] = [
  { pack: evolutionE10, nodeId: evo('E10'), code: 'E10' },
  { pack: evolutionE07, nodeId: evo('E07'), code: 'E07' },
  { pack: evolutionE05, nodeId: evo('E05'), code: 'E05' },
  { pack: evolutionE04, nodeId: evo('E04'), code: 'E04' },
  { pack: evolutionE06, nodeId: evo('E06'), code: 'E06' },
  { pack: evolutionE08, nodeId: evo('E08'), code: 'E08' },
  { pack: evolutionE02, nodeId: evo('E02'), code: 'E02' },
  { pack: evolutionE03, nodeId: evo('E03'), code: 'E03' },
  { pack: evolutionE01, nodeId: evo('E01'), code: 'E01' },
  { pack: evolutionE09, nodeId: evo('E09'), code: 'E09' },
  { pack: evolutionE11, nodeId: evo('E11'), code: 'E11' },
  { pack: evolutionE12, nodeId: evo('E12'), code: 'E12' },
  { pack: physics, nodeId: ACCELERATION },
  { pack: music, nodeId: HARMONY },
  { pack: history, nodeId: BLACK_DEATH.id },
  // Generated places (places/generated/), each one bundle file.
  ...GENERATED_PLACES.map(place => ({ pack: place.pack, nodeId: place.nodeId })),
];

/** Where each payoff connection lives on the atlas. `visit` is false when the idea itself
 * is not charted yet, so the payoff names its place without pretending there is more to open. */
const CONNECTION_PLACES: Readonly<Record<string, { node: string; visit: boolean }>> = {
  'The salamander ring': { node: evo('E05'), visit: true },
  'Four witnesses, one story': { node: evo('E07'), visit: true },
  'The bacteria that walked through poison': { node: evo('E10'), visit: true },
  'The coin-flip population: when chance alone decides': { node: evo('E04'), visit: true },
  'Why a virus keeps changing its coat': { node: 'knowledge.science.medicine', visit: true },
  'Who’s your closest cousin? Reading the tree': { node: evo('E01'), visit: true },
  'Earth’s history in one day': { node: evo('E06'), visit: true },
  'The greenish warbler: a ring around Tibet (debated)': { node: evo('E05'), visit: false },
  'Why islands breed new species': { node: evo('E05'), visit: false },
  'Orbits: the Moon is falling too': { node: 'knowledge.science.physics.mechanics', visit: true },
  'Air resistance and terminal speed': { node: 'knowledge.science.physics.mechanics.forces', visit: true },
  'Why some notes agree': { node: HARMONY, visit: true },
  'The space between beats': { node: 'knowledge.arts.music.rhythm', visit: true },
  'Fractions past one': { node: conceptNodeId('quarter-unit-path'), visit: true },
  'The hammer and the feather': { node: ACCELERATION, visit: true },
  'Why a piano’s fifth is slightly out of tune': { node: HARMONY, visit: false },
  'The coin-flip population': { node: evo('E04'), visit: true },
  'Five times the world almost ended': { node: evo('E08'), visit: true },
  'Natural selection: the part that isn’t luck': { node: evo('E03'), visit: true },
  'Coin flips and sampling: the mathematics of chance': { node: 'knowledge.mathematics.probability', visit: true },
  'Radioactive decay: atoms that keep time': { node: 'knowledge.science.physics', visit: true },
  'How geologists read rock': { node: 'knowledge.earth.geology', visit: true },
  'Is a sixth extinction underway?': { node: 'knowledge.earth.ecology', visit: true },
  'Why aren’t you a blend?': { node: evo('E02'), visit: true },
  'Be the bird': { node: evo('E03'), visit: true },
  'The guppy’s dilemma': { node: evo('E11'), visit: true },
  'The long walk out of Africa': { node: evo('E09'), visit: true },
  'Genes and genomes': { node: 'knowledge.science.biology.genetics-genomes', visit: true },
  'Be the bird: natural selection at work': { node: evo('E03'), visit: true },
  'Your DNA: reading where your ancestors lived': { node: 'knowledge.science.biology.genetics-genomes', visit: true },
  'Costly signals: why a cheap boast convinces no one': { node: 'knowledge.economics.decision-theory', visit: true },
  'Falsifiability: what a scientific claim must risk': { node: 'knowledge.humanities.philosophy', visit: true },
  'Why scarce workers earn more': { node: 'knowledge.economics.markets', visit: true },
  'Hubs: why some places spread things fastest': { node: 'knowledge.technology.networks', visit: true },
  'Quarantine: where the word comes from': { node: 'knowledge.science.medicine', visit: true },
  'The Decameron: a hundred stories told while hiding from the plague': { node: 'knowledge.humanities.literature', visit: true },
};

export const atlasPath = (nodeId: string): string[] => {
  const node = catalog.get(nodeId);
  return node ? catalog.getPath(node).slice(1).map(step => step.name) : [];
};

/** Each placed pack's atlas leaf, so a connection that opens a pack (`to`) can name where it lives. */
const PACK_NODES: ReadonlyMap<string, string> = new Map(PLACEMENTS.map(p => [p.pack.id, p.nodeId]));

function placed({ pack, nodeId, code }: (typeof PLACEMENTS)[number]): Expedition {
  if (!catalog.get(nodeId) || catalog.getChildren(catalog.get(nodeId)!).length) throw new Error(`Expedition ${pack.id} needs a terminal atlas leaf, not ${nodeId}`);
  const beats = pack.beats.map(beat => beat.kind !== 'payoff' ? beat : {
    ...beat,
    connections: beat.connections.map(connection => {
      const place = CONNECTION_PLACES[connection.title];
      if (!place) {
        // A generated pack leaves `place` empty: the pack it opens says where it lives.
        const at = !connection.place && connection.to ? PACK_NODES.get(connection.to) : undefined;
        return at ? { ...connection, place: atlasPath(at).join(' › ') } : connection;
      }
      return { ...connection, place: atlasPath(place.node).join(' › '), node: place.visit && !connection.to ? place.node : undefined };
    }),
  });
  return { pack: { ...pack, path: atlasPath(nodeId), beats }, nodeId, code };
}

const routeRank = (code?: string) => code ? (EVOLUTION_ROUTE as readonly string[]).indexOf(code) : EVOLUTION_ROUTE.length;

/** Every placed expedition, in the order a learner should meet them: Evolution's route first. */
export const EXPEDITIONS: readonly Expedition[] = PLACEMENTS.map(placed)
  .map((expedition, index) => ({ expedition, index }))
  .sort((a, b) => routeRank(a.expedition.code) - routeRank(b.expedition.code) || a.index - b.index)
  .map(({ expedition }) => expedition);

export const getExpedition = (packId: string) => EXPEDITIONS.find(expedition => expedition.pack.id === packId);
export const expeditionAt = (nodeId: string) => EXPEDITIONS.find(expedition => expedition.nodeId === nodeId);

/** Expeditions whose piece is this node or lies inside it, in route order. */
export function expeditionsWithin(nodeId: string): Expedition[] {
  return EXPEDITIONS.filter(expedition => expedition.nodeId === nodeId || expedition.nodeId.startsWith(`${nodeId}.`));
}

/** The cover still, for hub cards. */
export function coverOf(pack: Pack): { media: Media; focus: [number, number] } | null {
  const cover = pack.beats.find(beat => beat.kind === 'cover');
  if (!cover || cover.kind !== 'cover') return null;
  return { media: pack.media[cover.media], focus: cover.focus ?? [50, 50] };
}
