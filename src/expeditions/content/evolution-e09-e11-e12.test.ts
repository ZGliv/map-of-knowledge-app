import { describe, expect, it } from 'vitest';
import { getExpedition } from '../registry';
import { history } from './history';

// The shared pack rules run for every place in places/places.test.ts, and the sim keys of
// E09, E11 and E12 (lineage rewind, trade-off, nested groups) are recomputed by
// sims/archetypes.ts. What is left here is specific to one pack.
describe('the Black Death pack in the atlas', () => {
  it('lives at History › The Medieval World › The Black Death', () => {
    expect(getExpedition(history.id)!.pack.path).toEqual(['Humanities', 'History', 'The Medieval World', 'The Black Death']);
  });
  it('has no years in its ordering labels', () => {
    for (const beat of history.beats) if (beat.kind === 'order') for (const item of beat.items) expect(item.label).not.toMatch(/\b1[0-9]{3}\b/);
  });
});
