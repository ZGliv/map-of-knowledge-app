import { describe, expect, it } from 'vitest';
import { isOtherLab, isPickerHash, LIBRARY_PROTOTYPES } from './picker';

const isA = (hash: string) => /^#\/lab\/library-a\/?$/.test(hash);

describe('library prototype picker', () => {
  it('lists the prototypes by name, the new ones first, each at its own address, The Index no longer among them', () => {
    expect(LIBRARY_PROTOTYPES.map(p => p.name)).toEqual(['The Logbook', 'Your Library', 'The Edition', 'Exhibitions', 'The Mosaic']);
    expect(new Set(LIBRARY_PROTOTYPES.map(p => p.hash)).size).toBe(LIBRARY_PROTOTYPES.length);
  });

  it('reads only its own address as the picker', () => {
    expect(isPickerHash('#/lab/library')).toBe(true);
    expect(isPickerHash('#/lab/library/')).toBe(true);
    for (const prototype of LIBRARY_PROTOTYPES) expect(isPickerHash(prototype.hash)).toBe(false);
    expect(isPickerHash('')).toBe(false);
    expect(isPickerHash('#/hub/knowledge.science')).toBe(false);
  });

  it('makes a prototype step aside for the picker and its siblings, never for the app', () => {
    expect(isOtherLab('#/lab/library', isA)).toBe(true);
    expect(isOtherLab('#/lab/library-b/place/knowledge.arts', isA)).toBe(true);
    expect(isOtherLab('#/lab/library-c', isA)).toBe(true);
    expect(isOtherLab('#/lab/library-a', isA)).toBe(false);
    expect(isOtherLab('', isA)).toBe(false);
    expect(isOtherLab('#/hub/knowledge.science', isA)).toBe(false);
    expect(isOtherLab('#/check/knowledge.science?from=knowledge.science', isA)).toBe(false);
  });
});
