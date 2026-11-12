import { EVOLUTION_ROUTE, EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import { BLACK_DEATH } from '../core/history';
import { CHARTED_LEAVES, leafId } from '../core/places';

export interface PackPlace { readonly packId: string; readonly nodeId: string; readonly code?: string }

/** Every placed expedition's pack ID and the leaf it lights, in route order: the registry's
 * EXPEDITIONS without the packs themselves (registry.test.ts keeps the two equal). The map paints
 * from this list; the packs load after the first paint. */
export const PACK_PLACES: readonly PackPlace[] = [
  ...EVOLUTION_ROUTE.map(code => ({ packId: `evolution-${code.toLowerCase()}`, nodeId: evolutionTerritoryId(EVOLUTION_TERRITORIES.find(territory => territory.code === code)!.key), code })),
  { packId: 'physics', nodeId: 'knowledge.science.physics.mechanics.motion.acceleration' },
  { packId: 'music', nodeId: 'knowledge.arts.music.harmony' },
  { packId: 'history', nodeId: BLACK_DEATH.id },
  ...CHARTED_LEAVES.map(leaf => ({ packId: leaf.packId, nodeId: leafId(leaf) })),
];

export const packPlace = (packId: string) => PACK_PLACES.find(place => place.packId === packId);
export const packPlaceAt = (nodeId: string) => PACK_PLACES.find(place => place.nodeId === nodeId);
