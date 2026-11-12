// The arithmetic behind the trade-off sim, kept apart from drawing so it can be tested.
//
// A trait runs from 0 (none) to 1 (as much as the sim allows): colour on a male guppy,
// length of a tail. Two things depend on it, and they pull opposite ways:
//   survival(x) = base · e^(−rate·x)            falls as the trait grows (predators notice)
//   mating(x)   = ((lift + x) / (lift + 1))^power  rises as the trait grows (females prefer it)
// Expected offspring is their product. It is a teaching model, not fitted data: the
// pack says so on screen. What it gets right is the shape: a best value in the middle,
// which moves when the cost changes.

export interface Setting { id: string; label: string; base: number; rate: number }
export interface Mating { lift: number; power: number }

export const survival = (x: number, s: Setting) => s.base * Math.exp(-s.rate * x);
export const mating = (x: number, m: Mating) => ((m.lift + x) / (m.lift + 1)) ** m.power;
export const offspring = (x: number, s: Setting, m: Mating) => survival(x, s) * mating(x, m);

/** The best trait value. d/dx [e^(−rx)(l+x)^p] = 0 gives x* = p/r − l, clamped to the slider. */
export function best(s: Setting, m: Mating): number {
  return Math.min(1, Math.max(0, m.power / s.rate - m.lift));
}

/** Which way the best value moves between two settings, as a key the pack can be checked against. */
export function shift(from: Setting, to: Setting, m: Mating, tolerance = 0.02): 'more' | 'less' | 'same' {
  const d = best(to, m) - best(from, m);
  return Math.abs(d) <= tolerance ? 'same' : d > 0 ? 'more' : 'less';
}

/** Sample a curve for drawing: n + 1 points from x = 0 to 1. */
export const sample = (f: (x: number) => number, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const x = i / n; return [x, f(x)] as const; });

/** The tallest offspring value across every setting, so curves share one scale when the learner switches. */
export const peakAcross = (settings: Setting[], m: Mating) => Math.max(...settings.map(s => offspring(best(s, m), s, m)));
