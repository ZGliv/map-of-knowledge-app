import { describe, expect, it } from 'vitest';
import { LAB_HASH, labHash, nextLabState, parseLabHash } from './labRoute';

describe('the lab route', () => {
  it('reads the index and a place page, and nothing else', () => {
    expect(parseLabHash(LAB_HASH)).toEqual({ place: null });
    expect(parseLabHash('#/lab/library-b/place/knowledge.arts.music')).toEqual({ place: 'knowledge.arts.music' });
    expect(parseLabHash('#/lab/library-a')).toBeNull();
    expect(parseLabHash('#/lab/library-bb')).toBeNull();
    expect(parseLabHash('#/hub/knowledge.arts')).toBeNull();
    expect(parseLabHash('')).toBeNull();
  });
  it('writes what it reads', () => {
    for (const route of [{ place: null }, { place: 'knowledge.science.biology.evolution.natural-selection' }]) expect(parseLabHash(labHash(route))).toEqual(route);
  });
  it('comes back to the index when a case opened from it returns to the map', () => {
    const open = nextLabState({ lab: null, returning: false }, `${LAB_HASH}/place/knowledge.arts.music.harmony`);
    expect(open).toMatchObject({ lab: `${LAB_HASH}/place/knowledge.arts.music.harmony`, restore: null });
    const proving = nextLabState(open, '#/mission/knowledge.arts.music.harmony?from=knowledge.arts.music.harmony');
    expect(proving.returning).toBe(true);
    const words = nextLabState(proving, '#/check/knowledge.arts.music.harmony');
    expect(words.returning).toBe(true);
    expect(nextLabState(words, '').restore).toBe(`${LAB_HASH}/place/knowledge.arts.music.harmony`);
  });
  it('lets go once the learner goes anywhere else', () => {
    const proving = nextLabState(nextLabState({ lab: null, returning: false }, LAB_HASH), '#/expedition/evolution-e03');
    const hub = nextLabState(proving, '#/hub/knowledge.science');
    expect(hub).toEqual({ lab: null, returning: false, restore: null });
    expect(nextLabState(hub, '').restore).toBeNull();
    expect(nextLabState({ lab: null, returning: false }, '#/mission/x').returning).toBe(false);
  });
});
