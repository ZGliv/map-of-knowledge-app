// The logic behind the nested-groups sim. Common descent predicts that shared traits
// fall into groups inside groups: any two groups are either one inside the other or
// apart, never overlapping halfway. Here that is checked, and a new find is tested by
// asking whether there is anywhere it can sit without breaking the pattern.

export interface Taxon { id: string; label: string; traits: readonly string[] }
export interface Trait { id: string; label: string }

export const members = (taxa: readonly Taxon[], trait: string) => taxa.filter(t => t.traits.includes(trait)).map(t => t.id);

export type Relation = 'inside' | 'contains' | 'same' | 'apart' | 'cross';

/** How group a relates to group b. */
export function relate(a: readonly string[], b: readonly string[]): Relation {
  const inB = a.filter(id => b.includes(id)).length;
  if (inB === 0) return 'apart';
  if (inB === a.length && inB === b.length) return 'same';
  if (inB === a.length) return 'inside';
  if (inB === b.length) return 'contains';
  return 'cross';
}

/** Pairs of traits whose groups overlap without one containing the other. */
export function crossings(taxa: readonly Taxon[], traits: readonly string[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < traits.length; i++) for (let j = i + 1; j < traits.length; j++) {
    if (relate(members(taxa, traits[i]), members(taxa, traits[j])) === 'cross') out.push([traits[i], traits[j]]);
  }
  return out;
}

/** True when every group is a single unbroken run in this order. */
export function contiguous(order: readonly Taxon[], traits: readonly string[]): boolean {
  return traits.every(trait => {
    const at = order.map((t, i) => (t.traits.includes(trait) ? i : -1)).filter(i => i >= 0);
    return at.length === 0 || at[at.length - 1] - at[0] === at.length - 1;
  });
}

/** Every slot where a new taxon can be inserted so all groups stay unbroken and nested. */
export function placements(order: readonly Taxon[], traits: readonly string[], candidate: Taxon): number[] {
  const slots: number[] = [];
  for (let i = 0; i <= order.length; i++) {
    const next = [...order.slice(0, i), candidate, ...order.slice(i)];
    if (contiguous(next, traits) && crossings(next, traits).length === 0) slots.push(i);
  }
  return slots;
}

/** Where a find goes on screen: its first valid slot, or else the slot that breaks the fewest groups. */
export function placeFind(order: readonly Taxon[], traits: readonly string[], candidate: Taxon): { slot: number; fits: boolean } {
  const ok = placements(order, traits, candidate);
  if (ok.length) return { slot: ok[0], fits: true };
  let bestSlot = order.length, fewest = Infinity;
  for (let i = 0; i <= order.length; i++) {
    const next = [...order.slice(0, i), candidate, ...order.slice(i)];
    const broken = traits.filter(trait => !contiguous(next, [trait])).length * 10 + crossings(next, traits).length;
    if (broken < fewest) { fewest = broken; bestSlot = i; }
  }
  return { slot: bestSlot, fits: false };
}

export type Row = { kind: 'group'; trait: string; depth: number; end: number } | { kind: 'taxon'; taxon: Taxon; depth: number };

/**
 * The outline drawn on screen: each shown group is a heading followed by its members,
 * indented one step per group it sits inside. `end` is the index of the group's last row.
 * Groups that cross still get a heading and a bar; the bar then runs through another group.
 */
export function outline(order: readonly Taxon[], shown: readonly string[]): Row[] {
  const groups = shown.map(trait => ({ trait, ids: members(order, trait) })).filter(g => g.ids.length);
  // A group's depth is how many shown groups contain it (an identical group counts once, by order).
  const ancestors = (g: { trait: string; ids: string[] }) => groups.filter(o => {
    if (o === g) return false;
    const r = relate(o.ids, g.ids);
    return r === 'contains' || (r === 'same' && groups.indexOf(o) < groups.indexOf(g));
  }).length;
  const rows: Row[] = [];
  const first = (g: { trait: string; ids: string[] }) => order.findIndex(t => g.ids.includes(t.id));
  order.forEach((taxon, i) => {
    // Headings for groups that begin here, outermost first.
    groups.filter(g => first(g) === i).sort((a, b) => ancestors(a) - ancestors(b) || b.ids.length - a.ids.length)
      .forEach(g => rows.push({ kind: 'group', trait: g.trait, depth: ancestors(g), end: -1 }));
    rows.push({ kind: 'taxon', taxon, depth: groups.filter(g => g.ids.includes(taxon.id)).length });
  });
  // Close each group at its last member's row.
  rows.forEach(row => {
    if (row.kind !== 'group') return;
    const ids = groups.find(g => g.trait === row.trait)!.ids;
    row.end = rows.reduce((last, r, i) => (r.kind === 'taxon' && ids.includes(r.taxon.id) ? i : last), -1);
  });
  return rows;
}
