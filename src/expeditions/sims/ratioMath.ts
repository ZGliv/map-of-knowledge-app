// Two notes as numbers. Pure: the monochord and wave mixer show these ideas; the ratio case engine
// (cases/engines.ts) computes outcomes from them.
//
// A string's pitch (Mersenne, 1636): frequency is inversely proportional to the vibrating length
// and proportional to the square root of the tension. Two notes at p:q (in lowest terms, p > q)
// line up again every q waves of the lower note, so their combined shape repeats f_low / q times
// a second; the fewer low waves it takes, the calmer the pair sounds.

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** Frequencies are compared to a thousandth of a hertz, so any written value has an exact ratio. */
const SCALE = 1000;

/** Two frequencies as a ratio in lowest terms, higher first: 440 and 330 Hz give [4, 3]. */
export function ratioOf(a: number, b: number): [number, number] {
  const hi = Math.round(Math.max(a, b) * SCALE), lo = Math.round(Math.min(a, b) * SCALE);
  if (lo <= 0) throw new Error('frequencies must be positive');
  const d = gcd(hi, lo);
  return [hi / d, lo / d];
}

/** Waves of the lower note before the combined shape repeats. */
export const lowWavesToRepeat = (a: number, b: number): number => ratioOf(a, b)[1];

/** Times a second the combined shape of two notes repeats. */
export const repeatsPerSecond = (a: number, b: number): number => Math.min(a, b) / lowWavesToRepeat(a, b);

/** A string's frequency when its vibrating part is shortened (or lengthened) from `openLength` to `length`. */
export const stoppedFrequency = (openHz: number, openLength: number, length: number): number => openHz * openLength / length;

/** A string's frequency once its tension is multiplied by `factor`, all else equal: by the square root. */
export const frequencyAtPull = (hz: number, factor: number): number => hz * Math.sqrt(factor);
