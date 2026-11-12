// The Luria–Delbrück fluctuation test as a model. Two ideas about where virus-resistant
// bacteria come from make different predictions about many parallel cultures:
// - induced: the virus itself turns a few cells resistant at plating, so every dish gets a
//   similar, Poisson-scattered count (variance about equal to the mean);
// - random: resistance arises by chance while the cultures grow, before any virus. A rare
//   early mutation leaves a huge family of resistant descendants, so most dishes have few
//   or none and a few hit a "jackpot" (variance far above the mean).
import type { Rand } from './drift';

/** A Poisson draw: exact (Knuth) for small means, normal-approximated for large ones. */
export function poisson(lambda: number, rand: Rand): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const limit = Math.exp(-lambda);
    let k = 0;
    let product = rand();
    while (product > limit) { k += 1; product *= rand(); }
    return k;
  }
  const u = Math.max(rand(), 1e-12);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
}

export interface CultureModel {
  /** Cells that start each culture. */
  start: number;
  /** Doublings before the virus is added. */
  doublings: number;
  /** Chance that a newly made cell is born resistant. */
  rate: number;
}

/** Cells in one culture when the virus arrives. */
export const finalSize = (m: CultureModel) => m.start * 2 ** m.doublings;

/** Resistant cells in one culture when resistance arises by chance during growth.
 * A mutation in the cells made during doubling k leaves 2^(doublings − 1 − k) descendants. */
export function randomCulture(m: CultureModel, rand: Rand): number {
  let resistant = 0;
  for (let k = 0; k < m.doublings; k++) {
    const newCells = m.start * 2 ** k;
    const mutations = poisson(m.rate * newCells, rand);
    resistant += mutations * 2 ** (m.doublings - 1 - k);
  }
  return resistant;
}

/** Theory: the expected number of resistant cells under the random model. Each doubling
 * makes start·2^k new cells, and each mutant among them grows 2^(doublings−1−k)-fold. */
export function expectedRandom(m: CultureModel): number {
  let sum = 0;
  for (let k = 0; k < m.doublings; k++) sum += m.rate * m.start * 2 ** k * 2 ** (m.doublings - 1 - k);
  return sum;
}

/** Probability that a culture has no resistant cells at all under the random model. */
export function chanceOfNone(m: CultureModel): number {
  return Math.exp(-m.rate * (finalSize(m) - m.start));
}

/** Counts for a row of dishes. `induced` uses a Poisson count with the given mean. */
export function plateCounts(kind: 'induced' | 'random', cultures: number, m: CultureModel, inducedMean: number, rand: Rand): number[] {
  return Array.from({ length: cultures }, () => kind === 'induced' ? poisson(inducedMean, rand) : randomCulture(m, rand));
}
