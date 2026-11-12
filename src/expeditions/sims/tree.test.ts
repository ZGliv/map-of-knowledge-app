import { describe, expect, it } from 'vitest';
import { closer, closestRelatives, depthOf, layout, mrca, parseNewick, relationships, rotate, sameTree, tipsOf } from './tree';

// Open Tree of Life synthetic tree opentree16.1, induced subtree, unary nodes collapsed.
const VERTEBRATES = '((((((Homo_sapiens,(Bos_taurus,(Balaenoptera_musculus,Hippopotamus_amphibius))),((Passer_domesticus,Crocodylus_niloticus),Podarcis_muralis)),Rana_temporaria),Lepidosiren_paradoxa),Salmo_salar),Carcharodon_carcharias);';

describe('tree reading', () => {
  const tree = parseNewick(VERTEBRATES);

  it('parses tips in order and ignores internal labels and branch lengths', () => {
    expect(tipsOf(tree)).toHaveLength(11);
    expect(tipsOf(tree)[0]).toBe('Homo_sapiens');
    const labelled = parseNewick("((A:0.1,B:2)AB:0.3,'C c')root;");
    expect(tipsOf(labelled)).toEqual(['A', 'B', 'C c']);
    expect(() => parseNewick('((A,B)')).toThrow();
  });

  it('finds the most recent common ancestor from the shape alone', () => {
    const lungCow = mrca(tree, 'Lepidosiren_paradoxa', 'Bos_taurus');
    const lungSalmon = mrca(tree, 'Lepidosiren_paradoxa', 'Salmo_salar');
    expect(depthOf(tree, lungCow.id)).toBeGreaterThan(depthOf(tree, lungSalmon.id));
    expect(tipsOf(lungSalmon)).toContain('Bos_taurus');
  });

  it('answers the classic puzzles', () => {
    expect(closer(tree, 'Lepidosiren_paradoxa', 'Salmo_salar', 'Bos_taurus')).toBe('Bos_taurus');
    expect(closer(tree, 'Crocodylus_niloticus', 'Podarcis_muralis', 'Passer_domesticus')).toBe('Passer_domesticus');
    expect(closer(tree, 'Balaenoptera_musculus', 'Carcharodon_carcharias', 'Hippopotamus_amphibius')).toBe('Hippopotamus_amphibius');
    expect(closer(tree, 'Salmo_salar', 'Homo_sapiens', 'Bos_taurus')).toBe('tie');
    expect(closestRelatives(tree, 'Balaenoptera_musculus')).toEqual(['Hippopotamus_amphibius']);
    expect(closestRelatives(tree, 'Lepidosiren_paradoxa').sort()).toEqual(tipsOf(tree).filter(t => !['Lepidosiren_paradoxa', 'Salmo_salar', 'Carcharodon_carcharias'].includes(t)).sort());
  });

  it('never changes a relationship when branches are rotated', () => {
    const before = relationships(tree);
    let spun = tree;
    for (const id of ['n0', 'n1', 'n4', 'n5', 'n8']) spun = rotate(spun, id);
    expect(tipsOf(spun)).not.toEqual(tipsOf(tree));
    expect(relationships(spun)).toEqual(before);
    expect(sameTree(spun, tree)).toBe(true);
    expect(sameTree(parseNewick('((A,B),C);'), parseNewick('((A,C),B);'))).toBe(false);
  });

  it('lays tips out one per row, all at the same distance from the root', () => {
    const placed = layout(tree);
    const tips = [...placed.values()].filter(p => p.tip);
    expect(new Set(tips.map(p => p.x)).size).toBe(1);
    expect(tips.map(p => p.y).sort((a, b) => a - b)).toEqual(Array.from({ length: 11 }, (_, i) => i));
    for (const p of placed.values()) if (!p.tip) for (const child of p.children) expect(placed.get(child)!.x).toBeGreaterThan(p.x);
  });
});
