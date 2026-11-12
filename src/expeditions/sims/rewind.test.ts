import { describe, expect, it } from 'vitest';
import { lastShared, layout, problems, timeSince, visible, type Tree } from './rewind';

const tree: Tree = {
  tips: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
  splits: [
    { id: 'ab', children: ['a', 'b'], about: 2, range: [1, 3] },
    { id: 'abc', children: ['ab', 'c'], about: 6, range: [5, 8] },
    { id: 'root', children: ['abc', 'd'], about: 10, range: [9, 12] },
  ],
};

describe('lineage rewind', () => {
  it('lays tips out in order and puts each split midway between its children', () => {
    const l = layout(tree);
    expect([l.y.a, l.y.b, l.y.c, l.y.d]).toEqual([0, 1, 2, 3]);
    expect(l.y.ab).toBe(0.5);
    expect(l.y.abc).toBe(1.25);
    expect(l.y.root).toBe(2.125);
    expect(l.t.root).toBe(10);
    expect(l.root).toBe('root');
  });

  it('finds the most recent split two tips share', () => {
    expect(lastShared(tree, 'a', 'b')).toBe('ab');
    expect(lastShared(tree, 'b', 'c')).toBe('abc');
    expect(lastShared(tree, 'c', 'd')).toBe('root');
  });

  it('gives both lines from a split the same time on their own', () => {
    const l = layout(tree);
    const along = (tip: string, split: string) => { let total = 0; let at = tip; while (at !== split) { total += l.t[l.parent[at]] - l.t[at]; at = l.parent[at]; } return total; };
    expect(along('a', 'abc')).toBe(timeSince(tree, 'abc'));
    expect(along('c', 'abc')).toBe(timeSince(tree, 'abc'));
  });

  it('shows nothing at today, the near splits first, and the whole tree at the far past', () => {
    const l = layout(tree);
    expect(visible(tree, l, 0)).toEqual({ segments: [], joins: [] });
    const near = visible(tree, l, 3);
    expect(near.joins.map(j => j.id)).toEqual(['ab']);
    expect(near.segments.find(s => s.id === 'a')).toEqual({ id: 'a', y: 0, from: 0, to: 2 });
    expect(near.segments.find(s => s.id === 'c')).toEqual({ id: 'c', y: 2, from: 0, to: 3 });
    const far = visible(tree, l, 14);
    expect(far.joins).toHaveLength(3);
    expect(far.segments.find(s => s.id === 'root')).toEqual({ id: 'root', y: 2.125, from: 10, to: 14 });
  });

  it('catches trees that would draw a lie', () => {
    expect(problems(tree)).toEqual([]);
    expect(problems({ ...tree, splits: tree.splits.map(s => s.id === 'ab' ? { ...s, about: 7 } : s) }).join()).toMatch(/not younger|outside its range/);
    expect(problems({ ...tree, tips: [tree.tips[0], tree.tips[2], tree.tips[1], tree.tips[3]] }).join()).toMatch(/side by side/);
  });
});
