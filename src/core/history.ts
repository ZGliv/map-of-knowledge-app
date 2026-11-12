/** Humanities › History. Its first charted place is the lab's Black Death expedition.
 * Source: mok-content-lab docs/EVOLUTION-SLICE.md §5.2 (lab homes: History → The Medieval World →
 * The Black Death). Only the path to that one idea is charted; the rest of History stays a single
 * uncharted place until it has content. Pure data: the catalog imports this file. */

export const HISTORY_ID = 'knowledge.humanities.history';
export const MEDIEVAL_WORLD = { id: `${HISTORY_ID}.medieval-world`, name: 'The Medieval World' } as const;
export const BLACK_DEATH = {
  id: `${MEDIEVAL_WORLD.id}.black-death`,
  name: 'The Black Death',
  claim: 'The plague of 1346–1353 moved at the speed of trade: by ship first, overland later.',
} as const;
