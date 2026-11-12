// Population genetics in code, so no pack ever states a number the model did not compute.
// Diploid Wright–Fisher: each generation, 2N gene copies are drawn at random from the last
// generation's pool, after selection and mutation have shifted the odds. With s = 0 the
// variant is neutral and only chance moves it. Every run is seeded, so a test or a
// screenshot sees exactly what a learner saw.
import { createRandom } from '../../spatial/deterministic';

export type Rand = () => number;

export const seeded = (seed: string): Rand => createRandom(seed);

/** A standard normal draw (Box–Muller). */
function normal(rand: Rand): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Number of successes in n draws at probability p. Exact when few successes are expected
 * (counting the gaps between successes), normal-approximated when many are. */
export function binomial(n: number, p: number, rand: Rand): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (p > 0.5) return n - binomial(n, 1 - p, rand);
  if (n * p < 30) {
    // Geometric skipping: the gap to the next success is floor(ln U / ln(1 - p)).
    const log1p = Math.log(1 - p);
    let count = 0;
    let at = -1;
    for (;;) {
      at += 1 + Math.floor(Math.log(Math.max(rand(), 1e-300)) / log1p);
      if (at >= n) return count;
      count += 1;
    }
  }
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return Math.min(n, Math.max(0, Math.round(mean + sd * normal(rand))));
}

export interface DriftParams {
  /** Diploid individuals; the population carries 2N copies of the gene. */
  N: number;
  /** Starting frequency of the variant, 0–1. */
  p0: number;
  generations: number;
  /** Selection coefficient: fitness AA 1+s, Aa 1+hs, aa 1. Zero means neutral. */
  s?: number;
  h?: number;
  /** Symmetric mutation rate per copy per generation. */
  mu?: number;
  seed: string;
}

/** The expected frequency after selection and mutation, before the random draw. */
export function expectedNext(p: number, s = 0, h = 0.5, mu = 0): number {
  const q = 1 - p;
  const wAA = 1 + s, wAa = 1 + h * s, waa = 1;
  const mean = p * p * wAA + 2 * p * q * wAa + q * q * waa;
  const selected = mean > 0 ? (p * p * wAA + p * q * wAa) / mean : p;
  return selected * (1 - mu) + (1 - selected) * mu;
}

/** One population's variant frequency, generation by generation (length generations + 1). */
export function wrightFisher({ N, p0, generations, s = 0, h = 0.5, mu = 0, seed }: DriftParams): number[] {
  const rand = seeded(seed);
  const copies = 2 * N;
  let count = Math.round(p0 * copies);
  const path = [count / copies];
  for (let g = 0; g < generations; g++) {
    const p = count / copies;
    // Without mutation a lost or fixed variant stays put; the draw would only repeat it.
    if (mu === 0 && (count === 0 || count === copies)) { path.push(p); continue; }
    count = binomial(copies, expectedNext(p, s, h, mu), rand);
    path.push(count / copies);
  }
  return path;
}

/** Several independent populations with the same settings and distinct seeds. */
export function replicateRuns(params: DriftParams & { replicates: number }): number[][] {
  return Array.from({ length: params.replicates }, (_, i) => wrightFisher({ ...params, seed: `${params.seed}:${i}` }));
}

export type Outcome = 'fixed' | 'lost' | 'mixed';
export const outcomeOf = (path: number[]): Outcome => {
  const last = path[path.length - 1];
  return last >= 1 ? 'fixed' : last <= 0 ? 'lost' : 'mixed';
};

export function tally(paths: number[][]): Record<Outcome, number> {
  const out: Record<Outcome, number> = { fixed: 0, lost: 0, mixed: 0 };
  for (const path of paths) out[outcomeOf(path)] += 1;
  return out;
}

/** Theory, not a run: a neutral variant ends up in every copy with probability equal to its
 * current frequency, so this many of n populations are expected to fix. */
export const expectedFixed = (p0: number, populations: number) => p0 * populations;

/** The generation at which a run first fixed or lost the variant, or null if it never did. */
export function absorbedAt(path: number[]): number | null {
  const i = path.findIndex(p => p <= 0 || p >= 1);
  return i < 0 ? null : i;
}

export interface Genealogy {
  /** allele[g][i]: 1 if copy i in generation g carries the variant. */
  allele: number[][];
  /** parent[g][i]: which copy of generation g − 1 copy i was drawn from (row 0 has none). */
  parent: number[][];
}

/** Gene copies drawn one generation at a time, each from a random parent. Children are listed
 * in parent order, so the lines from parents to children never cross. */
export function genealogy(copies: number, carriers: number, generations: number, seed: string): Genealogy {
  const rand = seeded(seed);
  // Spread the starting carriers through the row instead of bunching them at one end.
  const order = Array.from({ length: copies }, (_, i) => i);
  for (let i = copies - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const first = new Array<number>(copies).fill(0);
  for (let k = 0; k < carriers; k++) first[order[k]] = 1;
  const allele = [first];
  const parent: number[][] = [new Array<number>(copies).fill(-1)];
  for (let g = 1; g <= generations; g++) {
    const picks = Array.from({ length: copies }, () => Math.floor(rand() * copies)).sort((a, b) => a - b);
    parent.push(picks);
    allele.push(picks.map(p => allele[g - 1][p]));
  }
  return { allele, parent };
}

/** Summary statistics for a list of numbers. */
export function meanVariance(values: number[]): { mean: number; variance: number } {
  if (!values.length) return { mean: 0, variance: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.length > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1) : 0;
  return { mean, variance };
}
