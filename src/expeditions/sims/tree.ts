// Tree reading as plain functions. A pack hands over a Newick string; every key
// (closest relative, most recent common ancestor) is computed here from the
// tree's shape, never typed into the pack.

export interface TreeNode {
  /** Tips keep their Newick label (e.g. "Bos_taurus"); branch points get n0, n1… in preorder. */
  id: string;
  children: TreeNode[];
}

/** Parse a Newick string. Branch lengths and internal labels are ignored: only shape matters here. */
export function parseNewick(text: string): TreeNode {
  const s = text.trim().replace(/;$/, '');
  let i = 0;
  let next = 0;
  const label = () => {
    const start = i;
    if (s[i] === "'") {
      i += 1;
      while (i < s.length && s[i] !== "'") i += 1;
      i += 1;
      return s.slice(start + 1, i - 1);
    }
    while (i < s.length && !',();:'.includes(s[i])) i += 1;
    return s.slice(start, i).trim();
  };
  const skipLength = () => { if (s[i] === ':') { i += 1; while (i < s.length && !',();'.includes(s[i])) i += 1; } };
  const node = (): TreeNode => {
    if (s[i] === '(') {
      const id = `n${next++}`;
      const children: TreeNode[] = [];
      i += 1;
      for (;;) {
        children.push(node());
        if (s[i] === ',') { i += 1; continue; }
        if (s[i] === ')') { i += 1; break; }
        throw new Error(`Unexpected "${s[i] ?? 'end'}" at ${i} in Newick`);
      }
      label();
      skipLength();
      return { id, children };
    }
    const id = label();
    if (!id) throw new Error(`Empty tip label at ${i} in Newick`);
    skipLength();
    return { id, children: [] };
  };
  const root = node();
  if (i !== s.length) throw new Error(`Trailing text at ${i} in Newick`);
  return root;
}

export const isTip = (node: TreeNode) => node.children.length === 0;

/** Tips in display order, top to bottom. */
export function tipsOf(node: TreeNode): string[] {
  return isTip(node) ? [node.id] : node.children.flatMap(tipsOf);
}

export function find(root: TreeNode, id: string): TreeNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) { const hit = find(child, id); if (hit) return hit; }
  return undefined;
}

/** Root first, the node itself last. */
export function pathTo(root: TreeNode, id: string): TreeNode[] {
  if (root.id === id) return [root];
  for (const child of root.children) { const rest = pathTo(child, id); if (rest.length) return [root, ...rest]; }
  return [];
}

/** The most recent common ancestor: the deepest branch point both tips descend from. */
export function mrca(root: TreeNode, a: string, b: string): TreeNode {
  const pa = pathTo(root, a), pb = pathTo(root, b);
  if (!pa.length || !pb.length) throw new Error(`Unknown tip ${pa.length ? b : a}`);
  let shared = root;
  for (let k = 0; k < Math.min(pa.length, pb.length) && pa[k].id === pb[k].id; k++) shared = pa[k];
  return shared;
}

/** Steps from the root. A deeper common ancestor is a more recent one. */
export const depthOf = (root: TreeNode, id: string) => pathTo(root, id).length - 1;

/** Every tip that shares the most recent common ancestor with `tip`: its sister group. */
export function closestRelatives(root: TreeNode, tip: string): string[] {
  const path = pathTo(root, tip);
  if (path.length < 2) throw new Error(`Unknown or root tip ${tip}`);
  const parent = path[path.length - 2];
  return parent.children.filter(child => child.id !== tip).flatMap(tipsOf);
}

/** Which of two tips is the closer relative of `of`, or 'tie' when they share the same ancestor with it. */
export function closer(root: TreeNode, of: string, a: string, b: string): string {
  const da = depthOf(root, mrca(root, of, a).id), db = depthOf(root, mrca(root, of, b).id);
  return da === db ? 'tie' : da > db ? a : b;
}

/** Swap a branch point's branches. Nothing about who is related to whom changes. */
export function rotate(root: TreeNode, id: string): TreeNode {
  if (root.id === id) return { ...root, children: [...root.children].reverse() };
  return { ...root, children: root.children.map(child => rotate(child, id)) };
}

/** A fingerprint of every relationship: for each pair of tips, the set of tips under their common ancestor.
 * Two drawings with equal fingerprints show the same tree, however the branches are turned. */
export function relationships(root: TreeNode): Map<string, string> {
  const tips = tipsOf(root).sort();
  const out = new Map<string, string>();
  for (let x = 0; x < tips.length; x++) for (let y = x + 1; y < tips.length; y++) {
    out.set(`${tips[x]}|${tips[y]}`, tipsOf(mrca(root, tips[x], tips[y])).sort().join(','));
  }
  return out;
}

export function sameTree(a: TreeNode, b: TreeNode): boolean {
  const ra = relationships(a), rb = relationships(b);
  if (ra.size !== rb.size) return false;
  for (const [key, value] of ra) if (rb.get(key) !== value) return false;
  return true;
}

export interface Placed { id: string; x: number; y: number; tip: boolean; children: string[] }

/** A cladogram: tips stacked one per row at the right (all alive today), branch points
 * placed by how many splits lie between them and the root, halfway between their children. */
export function layout(root: TreeNode): Map<string, Placed> {
  const out = new Map<string, Placed>();
  const height = (node: TreeNode): number => isTip(node) ? 0 : 1 + Math.max(...node.children.map(height));
  const total = height(root);
  let row = 0;
  const place = (node: TreeNode): number => {
    if (isTip(node)) {
      out.set(node.id, { id: node.id, x: total, y: row, tip: true, children: [] });
      return row++;
    }
    const ys = node.children.map(place);
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    out.set(node.id, { id: node.id, x: total - height(node), y, tip: false, children: node.children.map(child => child.id) });
    return y;
  };
  place(root);
  return out;
}
