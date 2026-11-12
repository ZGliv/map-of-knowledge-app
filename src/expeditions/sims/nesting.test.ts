import { describe, expect, it } from 'vitest';
import { contiguous, crossings, members, outline, placeFind, placements, relate, type Taxon } from './nesting';

const taxa: Taxon[] = [
  { id: 'shark', label: 'Shark', traits: ['spine'] },
  { id: 'frog', label: 'Frog', traits: ['spine', 'limbs'] },
  { id: 'lizard', label: 'Lizard', traits: ['spine', 'limbs', 'amnion'] },
  { id: 'pigeon', label: 'Pigeon', traits: ['spine', 'limbs', 'amnion', 'feathers'] },
  { id: 'mouse', label: 'Mouse', traits: ['spine', 'limbs', 'amnion', 'hair'] },
];
const traits = ['spine', 'limbs', 'amnion', 'feathers', 'hair'];

describe('nested groups', () => {
  it('names how two groups relate', () => {
    expect(relate(['a'], ['a', 'b'])).toBe('inside');
    expect(relate(['a', 'b'], ['a'])).toBe('contains');
    expect(relate(['a'], ['b'])).toBe('apart');
    expect(relate(['a', 'b'], ['b', 'a'])).toBe('same');
    expect(relate(['a', 'b'], ['b', 'c'])).toBe('cross');
  });

  it('finds real groups nested, with every group an unbroken run in the listed order', () => {
    expect(crossings(taxa, traits)).toEqual([]);
    expect(contiguous(taxa, traits)).toBe(true);
    expect(members(taxa, 'amnion')).toEqual(['lizard', 'pigeon', 'mouse']);
    expect(contiguous([taxa[0], taxa[2], taxa[1]], ['limbs', 'amnion'])).toBe(true);
    expect(contiguous([taxa[2], taxa[0], taxa[1]], ['limbs'])).toBe(false);
  });

  it('finds a slot for a find that fits, and none for one that straddles two groups', () => {
    const newt: Taxon = { id: 'newt', label: 'Newt', traits: ['spine', 'limbs'] };
    const bat: Taxon = { id: 'bat', label: 'Bat', traits: ['spine', 'limbs', 'amnion', 'hair'] };
    const chimera: Taxon = { id: 'x', label: 'Feathered mammal', traits: ['spine', 'limbs', 'amnion', 'feathers', 'hair'] };
    expect(placements(taxa, traits, newt)).toEqual([1, 2, 5]);
    expect(placements(taxa, traits, bat)).toEqual([4, 5]);
    expect(placements(taxa, traits, chimera)).toEqual([]);
    expect(placeFind(taxa, traits, newt)).toEqual({ slot: 1, fits: true });
    const broken = placeFind(taxa, traits, chimera);
    expect(broken.fits).toBe(false);
    const withIt = [...taxa.slice(0, broken.slot), chimera, ...taxa.slice(broken.slot)];
    expect(crossings(withIt, traits)).toEqual([['feathers', 'hair']]);
  });

  it('draws an outline with each group indented one step inside the groups that contain it', () => {
    const rows = outline(taxa, traits);
    const heads = rows.filter(r => r.kind === 'group').map(r => r.kind === 'group' ? [r.trait, r.depth] : null);
    expect(heads).toEqual([['spine', 0], ['limbs', 1], ['amnion', 2], ['feathers', 3], ['hair', 3]]);
    const depth = (id: string) => rows.find(r => r.kind === 'taxon' && r.taxon.id === id)!.depth;
    expect([depth('shark'), depth('frog'), depth('lizard'), depth('pigeon'), depth('mouse')]).toEqual([1, 2, 3, 4, 4]);
    for (const [i, row] of rows.entries()) if (row.kind === 'group') {
      expect(row.end).toBeGreaterThan(i);
      const last = rows[row.end];
      expect(last.kind === 'taxon' && last.taxon.traits.includes(row.trait)).toBe(true);
    }
  });

  it('shows only the groups switched on', () => {
    const rows = outline(taxa, ['spine', 'hair']);
    expect(rows.filter(r => r.kind === 'group').length).toBe(2);
    expect(rows.filter(r => r.kind === 'taxon').length).toBe(taxa.length);
  });
});
