// A dated family tree you can wind backwards. Living species sit at today; every split
// carries the date (with its range) when two lines last shared an ancestor. Drawing and
// testing share these functions, so the picture can't disagree with the numbers.

export interface Tip { id: string; label: string }
/** A split where two lines meet, `about` units before today, with the published range. */
export interface Split { id: string; children: [string, string]; about: number; range: [number, number] }
export interface Tree { tips: Tip[]; splits: Split[] }

export interface Layout {
  /** Row of each tip and split: tips are 0…n−1 in listed order, a split sits midway between its children. */
  y: Record<string, number>;
  /** Age of each node: 0 for living tips. */
  t: Record<string, number>;
  parent: Record<string, string>;
  root: string;
}

export function layout(tree: Tree): Layout {
  const y: Record<string, number> = {}, t: Record<string, number> = {}, parent: Record<string, string> = {};
  tree.tips.forEach((tip, i) => { y[tip.id] = i; t[tip.id] = 0; });
  for (const split of tree.splits) for (const child of split.children) parent[child] = split.id;
  const place = (id: string): number => {
    if (id in y) return y[id];
    const split = tree.splits.find(s => s.id === id);
    if (!split) throw new Error(`Unknown node ${id}`);
    t[id] = split.about;
    return (y[id] = (place(split.children[0]) + place(split.children[1])) / 2);
  };
  const roots = tree.splits.filter(s => !(s.id in parent));
  if (roots.length !== 1) throw new Error(`A tree needs one root, found ${roots.length}`);
  place(roots[0].id);
  return { y, t, parent, root: roots[0].id };
}

/** Problems that would make the picture lie. An empty list means the tree is sound. */
export function problems(tree: Tree): string[] {
  const out: string[] = [];
  const ids = new Set([...tree.tips.map(t => t.id), ...tree.splits.map(s => s.id)]);
  const descendants = (id: string): string[] => {
    const s = tree.splits.find(x => x.id === id);
    return s ? s.children.flatMap(descendants) : [id];
  };
  for (const s of tree.splits) {
    for (const child of s.children) {
      if (!ids.has(child)) out.push(`${s.id}: unknown child ${child}`);
      const c = tree.splits.find(x => x.id === child);
      if (c && c.about >= s.about) out.push(`${s.id}: child ${child} is not younger than its parent`);
    }
    if (!(s.range[0] <= s.about && s.about <= s.range[1])) out.push(`${s.id}: ${s.about} lies outside its range`);
    // Every split's tips must be neighbours in the listed order, or branches would cross.
    const rows = descendants(s.id).map(id => tree.tips.findIndex(t => t.id === id)).sort((a, b) => a - b);
    if (rows.some(r => r < 0) || rows[rows.length - 1] - rows[0] !== rows.length - 1) out.push(`${s.id}: its tips are not side by side`);
  }
  try { layout(tree); } catch (error) { out.push((error as Error).message); }
  return out;
}

/** The most recent split shared by two tips. */
export function lastShared(tree: Tree, a: string, b: string): string {
  const { parent } = layout(tree);
  const up = (id: string) => { const path: string[] = []; let at: string | undefined = parent[id]; while (at) { path.push(at); at = parent[at]; } return path; };
  const fromA = up(a);
  const hit = up(b).find(id => fromA.includes(id));
  if (!hit) throw new Error(`${a} and ${b} share no split`);
  return hit;
}

/** How long each tip's line has run on its own since a split: the same for both sides, always. */
export const timeSince = (tree: Tree, split: string) => layout(tree).t[split];

export interface Segment { id: string; y: number; from: number; to: number }
export interface Join { id: string; y0: number; y1: number; at: number }

/**
 * What is visible with the clock wound back to `cursor`: each line from its own node back
 * to its parent split (or to the cursor, if that comes first), and every join the cursor has passed.
 * The root's line runs on into the past as far as the cursor goes.
 */
export function visible(tree: Tree, l: Layout, cursor: number): { segments: Segment[]; joins: Join[] } {
  const segments: Segment[] = [];
  for (const id of Object.keys(l.y)) {
    const start = l.t[id];
    if (cursor <= start) continue;
    const end = id === l.root ? cursor : Math.min(cursor, l.t[l.parent[id]]);
    segments.push({ id, y: l.y[id], from: start, to: end });
  }
  const joins = tree.splits.filter(s => cursor >= s.about).map(s => {
    const [a, b] = s.children.map(c => l.y[c]);
    return { id: s.id, y0: Math.min(a, b), y1: Math.max(a, b), at: s.about };
  });
  return { segments, joins };
}
