import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { CHARTED_LEAVES } from '../core/places';
import { scrambled } from './blocks/exercises';
import { PACK_PLACES } from './manifest';
import { atlasPath, coverOf, EXPEDITIONS, expeditionsWithin, getExpedition } from './registry';
import { GENERATED_PLACES } from '../places/generated';

// Generated places follow the hand-made packs, in the order the generator registered them.
const GENERATED_IDS = GENERATED_PLACES.map(place => place.id);

describe('expedition registry', () => {
  it('places every pack on a terminal atlas leaf and shows the atlas path', () => {
    // The atlas charts generated leaves in the order the generator registered their bundles.
    expect(CHARTED_LEAVES.map(leaf => leaf.packId)).toEqual(GENERATED_IDS);
    expect(EXPEDITIONS.map(expedition => expedition.pack.id)).toEqual(['evolution-e10', 'evolution-e02', 'evolution-e03', 'evolution-e04', 'evolution-e01', 'evolution-e06', 'evolution-e07', 'evolution-e05', 'evolution-e11', 'evolution-e08', 'evolution-e09', 'evolution-e12', 'physics', 'music', 'history', ...GENERATED_IDS]);
    for (const expedition of EXPEDITIONS) {
      const node = catalog.get(expedition.nodeId)!;
      expect(node, expedition.nodeId).toBeDefined();
      expect(catalog.getChildren(node)).toHaveLength(0);
      expect(expedition.pack.path).toEqual(atlasPath(expedition.nodeId));
      expect(coverOf(expedition.pack)?.media.src).toMatch(/^https:\/\//);
    }
    expect(new Set(EXPEDITIONS.map(expedition => expedition.nodeId)).size).toBe(EXPEDITIONS.length);
  });

  it('matches the manifest the map paints from before the packs load', () => {
    // A new pack goes in expeditions/manifest.ts as well as in PLACEMENTS.
    expect(PACK_PLACES.map(place => [place.packId, place.nodeId, place.code])).toEqual(EXPEDITIONS.map(expedition => [expedition.pack.id, expedition.nodeId, expedition.code]));
  });

  it('keeps payoff connections pointed at real places and real packs', () => {
    for (const { pack } of EXPEDITIONS) for (const beat of pack.beats) if (beat.kind === 'payoff') for (const connection of beat.connections) {
      if (connection.to) expect(getExpedition(connection.to), connection.title).toBeDefined();
      if (connection.node) expect(catalog.get(connection.node), connection.title).toBeDefined();
      expect(connection.place).not.toMatch(/^Life ›/);
      // Every connection names where it lives, so the payoff never prints a title with no place.
      expect(connection.place, `${pack.id}: ${connection.title}`).toMatch(/›/);
    }
  });

  it('finds expeditions inside any place, Evolution route first', () => {
    expect(expeditionsWithin('knowledge.science').map(item => item.pack.id)).toEqual(['evolution-e10', 'evolution-e02', 'evolution-e03', 'evolution-e04', 'evolution-e01', 'evolution-e06', 'evolution-e07', 'evolution-e05', 'evolution-e11', 'evolution-e08', 'evolution-e09', 'evolution-e12', 'physics', ...GENERATED_IDS]);
    expect(expeditionsWithin('knowledge.arts').map(item => item.pack.id)).toEqual(['music']);
    expect(expeditionsWithin('knowledge.humanities').map(item => item.pack.id)).toEqual(['history']);
    expect(expeditionsWithin('knowledge.humanities.history.medieval-world').map(item => item.nodeId)).toEqual(['knowledge.humanities.history.medieval-world.black-death']);
  });

  it('never shows an ordering task in its answer order', () => {
    for (const { pack } of EXPEDITIONS) for (const beat of pack.beats) if (beat.kind === 'order') {
      const shown = scrambled(beat.items, beat.answer, beat.gradeId);
      expect(shown.map(item => item.id)).not.toEqual(beat.answer);
      expect(shown.map(item => item.id).sort()).toEqual(beat.items.map(item => item.id).sort());
      expect(scrambled(beat.items, beat.answer, beat.gradeId)).toEqual(shown);
    }
  });
});
