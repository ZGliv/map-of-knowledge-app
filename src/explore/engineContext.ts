import { prepare, itemText, BANKS } from '../checks/banks';
import { LEGACY_CASES } from '../cases/content';
import { catalog } from '../core/catalog';
import { EXPEDITIONS } from '../expeditions/registry';
import { GENERATED_PLACES } from '../places/generated';
import { REELS } from './deck';
import { titleVariants, wikipediaCite, wikipediaTitles } from './sourceTitles';
import { checksOf, TRANSFER_ONLY_SOURCES, type EngineMediaCheck, type EngineReelContext, type Spoiler } from './validate';

// The edition-wide facts the reel engine's validator needs (explore/validate.ts, validateEngineReel):
// every check item and case a reel must not give away, every transfer-only source, every check
// prompt, and where each expedition lives. Used by the engine (scripts/reels) and the tests.

/** Every check item and case, as a spoiler. Transfer items and cases carry their entities: those
 * situations must reach the learner fresh. Items on a pack's own scenarios carry only their words. */
export function editionSpoilers(): Spoiler[] {
  const out: Spoiler[] = [];
  for (const bank of BANKS) for (const entry of prepare(bank).prepared) {
    out.push({ id: `check item ${entry.item.id} (${bank.node})`, node: bank.node, text: itemText(entry.item), entities: entry.transfer ? entry.item.entities : [] });
  }
  const nodeOfPack = (packId: string) => EXPEDITIONS.find(e => e.pack.id === packId)?.nodeId ?? '';
  const cases = [...Object.entries(LEGACY_CASES).flatMap(([packId, list]) => list.map(c => ({ c, node: nodeOfPack(packId) }))), ...GENERATED_PLACES.flatMap(place => place.cases.map(c => ({ c, node: place.nodeId })))];
  for (const { c, node } of cases) out.push({ id: `case ${c.id}`, node, text: [c.title, c.setting ?? '', c.scenario, c.ask, c.reveal].join('\n'), entities: c.entities });
  return out;
}

/** `Wikipedia: <Title>` for every article a pack's transfer-only provenance names (each spelling). */
export function transferOnlyCites(): Set<string> {
  return new Set(Object.values(TRANSFER_ONLY_SOURCES).flat().flatMap(wikipediaTitles).flatMap(titleVariants).map(wikipediaCite));
}

export function engineContext(sourceTexts: Readonly<Record<string, string>>, mediaChecks: Readonly<Record<string, EngineMediaCheck>>): EngineReelContext {
  return {
    nodeExists: nodeId => !!catalog.get(nodeId),
    packAt: nodeId => EXPEDITIONS.find(expedition => expedition.nodeId === nodeId)?.pack.id,
    checks: EXPEDITIONS.flatMap(expedition => checksOf(expedition.pack)),
    sourceTexts,
    mediaChecks,
    spoilers: editionSpoilers(),
    transferOnly: transferOnlyCites(),
    evergreenHeroes: new Set(REELS.map(reel => reel.media[reel.hero]?.page).filter((page): page is string => !!page).map(page => decodeURI(page) === page ? encodeURI(page) : page)),
  };
}
