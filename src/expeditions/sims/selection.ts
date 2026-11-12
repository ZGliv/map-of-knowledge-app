// Selection on one gene with two forms, one dominant: the peppered moth's case, where
// a single gene decides pale or black and black is dominant. The population is large;
// what the learner hunts each generation is a sample of it. Survival per form comes
// from the learner's own catches, so the curve they see is the consequence of what
// they did, computed with the standard one-locus selection recursion.

export type Form = 'dominant' | 'recessive';

/** Share showing the dominant form, from the dominant allele's frequency p (random mating). */
export const dominantShare = (p: number) => 1 - (1 - p) ** 2;
/** The dominant allele's frequency behind a given share of dominant-form individuals. */
export const alleleFor = (share: number) => 1 - Math.sqrt(1 - share);

/** One generation. `survive` is the share of each form that lives to breed.
 * Genotypes DD and Dd show the dominant form, dd the recessive one:
 * p' = p·w_D / w̄, with w̄ = (1 − q²)·w_D + q²·w_d. */
export function step(p: number, survive: Record<Form, number>): number {
  const q = 1 - p;
  const mean = (1 - q * q) * survive.dominant + q * q * survive.recessive;
  if (mean <= 0) return p;
  return Math.min(1, Math.max(0, (p * survive.dominant) / mean));
}

/** Run until `stop` says so or `max` generations pass. Returns every generation's p, starting with p0. */
export function run(p0: number, survive: Record<Form, number>, stop: (p: number) => boolean, max: number): number[] {
  const out = [p0];
  let p = p0;
  for (let g = 0; g < max && !stop(p); g++) { p = step(p, survive); out.push(p); }
  return out;
}

/** How many of `n` shown moths carry the dominant form: the expected number, rounded at random
 * so it stays honest on average, and never zero while a form is at least `floor` of the population. */
export function shownCount(share: number, n: number, rng: () => number, floor = 0.005): number {
  const exact = share * n;
  let count = Math.floor(exact) + (rng() < exact - Math.floor(exact) ? 1 : 0);
  if (share >= floor) count = Math.max(1, count);
  if (1 - share >= floor) count = Math.min(n - 1, count);
  return count;
}

export interface Tally { shown: Record<Form, number>; caught: Record<Form, number> }

/** Survival per form from what was caught. The hunted moths are a small sample of a large
 * population, so each form gets `prior` imagined survivors: catching the only two black moths
 * on screen doesn't mean no black moth anywhere survives. A form never shown keeps full survival. */
export function survivalFrom(hunts: Tally[], prior = 1): Record<Form, number> {
  const rate = (form: Form) => {
    const shown = hunts.reduce((sum, h) => sum + h.shown[form], 0);
    const caught = hunts.reduce((sum, h) => sum + h.caught[form], 0);
    return shown ? 1 - caught / (shown + prior) : 1;
  };
  return { dominant: rate('dominant'), recessive: rate('recessive') };
}

/** The stand-in bird's expected effect on a large population: among `shown` moths with this share of
 * the dominant form, it makes `catches` picks, each landing on a moth in proportion to how visible it is.
 * A moth's chance of being caught is 1 − (1 − w/T)^catches, with T the total visibility on the bark. */
export function birdSurvival(share: number, shown: number, catches: number, visible: Record<Form, number>): Record<Form, number> {
  const total = shown * (share * visible.dominant + (1 - share) * visible.recessive);
  const survive = (w: number) => (1 - Math.min(1, w / total)) ** catches;
  return { dominant: survive(visible.dominant), recessive: survive(visible.recessive) };
}

/** A stand-in bird for anyone who can't or won't tap: it picks `catches` moths one at a time,
 * each with chance in proportion to how much it stands out (`visible` per form). Returns indices. */
export function birdPicks(forms: Form[], visible: Record<Form, number>, catches: number, rng: () => number): number[] {
  const left = forms.map((form, index) => ({ index, weight: visible[form] }));
  const picked: number[] = [];
  while (picked.length < catches && left.length) {
    const total = left.reduce((sum, m) => sum + m.weight, 0);
    let r = rng() * total;
    let k = 0;
    while (k < left.length - 1 && r >= left[k].weight) { r -= left[k].weight; k++; }
    picked.push(left[k].index);
    left.splice(k, 1);
  }
  return picked;
}
