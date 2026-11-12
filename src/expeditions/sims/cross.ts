// Mendelian crosses for one gene, computed rather than typed. A pack names the alleles
// and how they rank; ratios, Punnett squares and "can this couple have that child?"
// all come from here, so no number a learner sees is hand-entered.

/** Each allele's rank: the highest-ranked alleles present decide the visible trait.
 * Peas: R 1, r 0 (round hides wrinkled). ABO blood groups: A 1, B 1, O 0 (A and B both show). */
export type Locus = Record<string, number>;
export type Genotype = string;

/** A seeded random number generator (mulberry32), so a pack's run is the same every time. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let k = 0; k < seed.length; k++) { h = Math.imul(h ^ seed.charCodeAt(k), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Alleles are single characters; a genotype is two of them. */
export function alleles(genotype: Genotype, locus: Locus): [string, string] {
  const pair = [...genotype];
  if (pair.length !== 2 || pair.some(a => !(a in locus))) throw new Error(`Bad genotype ${genotype}`);
  return [pair[0], pair[1]];
}

/** One canonical spelling per genotype: higher rank first, then alphabetical (Rr, never rR; AO, never OA). */
export function normalize(a: string, b: string, locus: Locus): Genotype {
  return [a, b].sort((x, y) => locus[y] - locus[x] || x.localeCompare(y)).join('');
}

/** The visible trait: the top-ranked alleles present, e.g. "R", "r", "A", "AB", "O". */
export function phenotype(genotype: Genotype, locus: Locus): string {
  const [a, b] = alleles(genotype, locus);
  const top = Math.max(locus[a], locus[b]);
  return [...new Set([a, b].filter(x => locus[x] === top))].sort().join('');
}

/** The four boxes of a Punnett square: rows are the first parent's alleles, columns the second's. */
export function punnett(p1: Genotype, p2: Genotype, locus: Locus): Genotype[][] {
  const [a1, a2] = alleles(p1, locus), [b1, b2] = alleles(p2, locus);
  return [a1, a2].map(a => [b1, b2].map(b => normalize(a, b, locus)));
}

/** Expected share of each visible trait among the offspring, as whole quarters. */
export function expected(p1: Genotype, p2: Genotype, locus: Locus): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of punnett(p1, p2, locus)) for (const g of row) { const ph = phenotype(g, locus); out[ph] = (out[ph] ?? 0) + 1; }
  return out;
}

/** Offspring drawn one at a time: one allele at random from each parent. */
export function sample(p1: Genotype, p2: Genotype, n: number, locus: Locus, rng: () => number): Genotype[] {
  const a = alleles(p1, locus), b = alleles(p2, locus);
  return Array.from({ length: n }, () => normalize(a[rng() < 0.5 ? 0 : 1], b[rng() < 0.5 ? 0 : 1], locus));
}

/** Strand copying, not a cross: each copy is exactly one strand from each "parent" (an old
 * molecule's strand plus a new one), so every pairing in the square turns up in exactly a quarter
 * of the copies, never a chance spread. Shuffled with `rng` so the tray still reads as a mix. */
export function copies(p1: Genotype, p2: Genotype, n: number, locus: Locus, rng: () => number): Genotype[] {
  if (!(Number.isInteger(n) && n > 0 && n % 4 === 0)) throw new Error(`Copying needs a whole number of fours, not ${n}`);
  const boxes = punnett(p1, p2, locus).flat();
  const out = Array.from({ length: n }, (_, k) => boxes[k % 4]);
  for (let k = n - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; }
  return out;
}

export function tally(genotypes: Genotype[], locus: Locus): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of genotypes) { const ph = phenotype(g, locus); out[ph] = (out[ph] ?? 0) + 1; }
  return out;
}

/** Every genotype that shows a given trait. */
export function genotypesFor(trait: string, locus: Locus): Genotype[] {
  const keys = Object.keys(locus);
  const all = new Set<Genotype>();
  for (const a of keys) for (const b of keys) all.add(normalize(a, b, locus));
  return [...all].filter(g => phenotype(g, locus) === trait).sort();
}

/** Traits two parents could have children with, considering every genotype hidden behind their traits. */
export function possibleChildren(trait1: string, trait2: string, locus: Locus): string[] {
  const out = new Set<string>();
  for (const g1 of genotypesFor(trait1, locus)) for (const g2 of genotypesFor(trait2, locus)) {
    for (const row of punnett(g1, g2, locus)) for (const g of row) out.add(phenotype(g, locus));
  }
  return [...out].sort();
}

/** "2.96 to 1": the larger count divided by the smaller, to two decimals. */
export function ratioText(a: number, b: number): string {
  if (!b) return `${a.toLocaleString('en-US')} to 0`;
  return `${(a / b).toFixed(2)} to 1`;
}

// ---------------------------------------------------------------- two genes
// Two genes on different chromosome pairs are dealt separately: each offspring takes one copy of
// each gene from each parent, and which copy of one gene it gets says nothing about the other. So a
// combination's share is the product of the two genes' own shares, in whole sixteenths. A two-gene
// genotype or combination is written gene 1, a bar, gene 2: 'Rr|Yy', 'R|y'.

/** One gene of a cross: how its alleles rank and the two parents' genotypes for it. */
export interface Gene { locus: Locus; parents: [Genotype, Genotype] }

export const joinPair = (a: string, b: string): string => `${a}|${b}`;
export function splitPair(s: string): [string, string] {
  const at = s.indexOf('|');
  return at < 0 ? [s, ''] : [s.slice(0, at), s.slice(at + 1)];
}

/** Expected share of each combination of visible traits ('R|y'), in whole sixteenths. */
export function expected2(a: Gene, b: Gene): Record<string, number> {
  const e1 = expected(a.parents[0], a.parents[1], a.locus), e2 = expected(b.parents[0], b.parents[1], b.locus);
  const out: Record<string, number> = {};
  for (const [k1, n1] of Object.entries(e1)) for (const [k2, n2] of Object.entries(e2)) out[joinPair(k1, k2)] = n1 * n2;
  return out;
}

/** The visible combination of a two-gene genotype: 'Rr|yy' → 'R|y'. */
export function phenotype2(genotype: Genotype, a: Locus, b: Locus): string {
  const [g1, g2] = splitPair(genotype);
  return joinPair(phenotype(g1, a), phenotype(g2, b));
}

/** Offspring drawn one at a time from one seeded stream: gene 1 from both parents, then gene 2. */
export function sample2(a: Gene, b: Gene, n: number, rng: () => number): Genotype[] {
  const a0 = alleles(a.parents[0], a.locus), a1 = alleles(a.parents[1], a.locus);
  const b0 = alleles(b.parents[0], b.locus), b1 = alleles(b.parents[1], b.locus);
  return Array.from({ length: n }, () => {
    const g1 = normalize(a0[rng() < 0.5 ? 0 : 1], a1[rng() < 0.5 ? 0 : 1], a.locus);
    const g2 = normalize(b0[rng() < 0.5 ? 0 : 1], b1[rng() < 0.5 ? 0 : 1], b.locus);
    return joinPair(g1, g2);
  });
}

/** A gene's four equally likely boxes in drawing order: equal looks side by side, looks in the
 * order given (the order the pack lists its traits), boxes of one look in square order. A sex-linked
 * square (Ng × NY gives N, NY, N, Y) would otherwise split one look in two. */
export function boxesByLook(p1: Genotype, p2: Genotype, locus: Locus, order: string[]): Genotype[] {
  const rank = (g: Genotype) => { const i = order.indexOf(phenotype(g, locus)); return i < 0 ? order.length : i; };
  return punnett(p1, p2, locus).flat().map((g, i) => ({ g, i })).sort((x, y) => rank(x.g) - rank(y.g) || x.i - y.i).map(x => x.g);
}

/** Runs of equal values, for merging grid headers: ['N', 'N', 'NY', 'Y'] → [['N', 2], ['NY', 1], ['Y', 1]]. */
export function runsOf<T>(items: T[]): [T, number][] {
  const out: [T, number][] = [];
  for (const x of items) { const last = out.at(-1); if (last && last[0] === x) last[1]++; else out.push([x, 1]); }
  return out;
}
