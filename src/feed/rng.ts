// Seeded randomness for the feed. The same seed gives the same numbers in the same order, so a feed
// planned from a seed is the same feed every time, and every rule that uses chance is testable.

/** FNV-1a over the string, finished with a murmur-style mix: a well-spread 32-bit number. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}

/** A stable 0–1 number per seed and key. */
export const unit = (seed: string, key: string) => hashString(`${seed}|${key}`) / 4294967296;

/** mulberry32: a small, fast generator of 0–1 numbers from a seed string. */
export function rng(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw (Box–Muller). */
export function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A Gamma(shape, 1) draw (Marsaglia and Tsang; boosted for shapes under 1). */
export function gamma(rand: () => number, shape: number): number {
  if (shape < 1) return gamma(rand, shape + 1) * Math.pow(Math.max(rand(), 1e-12), 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = normal(rand); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(Math.max(u, 1e-12)) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** A Beta(a, b) draw: how likely something is, given a successes and b failures (plus a prior). */
export function beta(rand: () => number, a: number, b: number): number {
  const x = gamma(rand, Math.max(a, 1e-3)), y = gamma(rand, Math.max(b, 1e-3));
  return x + y > 0 ? x / (x + y) : 0.5;
}
