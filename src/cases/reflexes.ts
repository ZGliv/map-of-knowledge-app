// The reflexes a learner could reach for instead of working a two-gene cross out. A case is won by
// reasoning, never by one of these: lazy.test.ts holds every place to it, and validatePlace refuses
// a two-gene case that one of them wins (cases.engine). Every value is tried one slider step either
// side, so rounding a share to a whole count never slips through.
//
// Pure: no React, so the validator, tests and Node drivers import it.

import type { Pack, SimBeat } from '../expeditions/content/types';
import { alleles, expected, expected2, joinPair, normalize, phenotype, punnett, splitPair, type Locus } from '../expeditions/sims/cross';
import type { PeaCrossParams } from '../expeditions/sims/PeaCross';
import { runCase, wins } from './engines';
import type { CrossModel, PlaceCase, SecondGene } from './types';

/** A value the learner might enter without reasoning, in the call's unit. */
export interface Reflex { how: string; value: number }
/** What a reflex scan needs from a place: its expedition (for what the sims print) and its cases. */
export interface ReflexPlace { pack: Pack; cases?: readonly PlaceCase[] }

/** The 9:3:3:1 table of two hybrids crossed: its single classes, and the sums of two or more. */
const TABLE_SINGLES = [1, 3, 9];
const TABLE_UNIONS = [4, 6, 7, 10, 12, 13, 15];

/** Every share the lesson shows or has the learner work out: each look of a one-gene pea-cross step,
 * each combination and each gene's own looks of a two-gene step, and the share behind every counted
 * cross number beat (crossCount). One entry per distinct share. */
export function lessonShares(pack: Pack): { how: string; share: number }[] {
  const out = new Map<number, string>();
  const add = (how: string, share: number) => { if (!out.has(share)) out.set(share, how); };
  for (const beat of pack.beats) {
    if (beat.kind === 'number' && (beat as { generator?: string }).generator === 'crossCount') {
      const { gradeId, params: q } = beat as unknown as { gradeId: string; params: { locus: Locus; parents: [string, string]; trait: string } };
      try {
        const n = expected(q.parents[0], q.parents[1], q.locus)[q.trait] ?? 0;
        add(`${q.trait} in ${n} of 4 (${gradeId})`, n / 4);
      } catch { /* the pack's own check reports a broken beat */ }
      continue;
    }
    if (beat.kind !== 'sim' || (beat as SimBeat).sim !== 'peaCross') continue;
    const p = (beat as SimBeat).params as unknown as PeaCrossParams;
    for (const step of p.steps) {
      try {
        const e1 = expected(step.parents[0], step.parents[1], p.locus);
        for (const [k, n] of Object.entries(e1)) add(`${k} in ${n} of 4 (${step.id})`, n / 4);
        if (p.second && step.second) {
          const e2 = expected(step.second[0], step.second[1], p.second.locus);
          for (const [k, n] of Object.entries(e2)) add(`${k} in ${n} of 4 (${step.id})`, n / 4);
          const both = expected2({ locus: p.locus, parents: step.parents }, { locus: p.second.locus, parents: step.second });
          for (const [k, n] of Object.entries(both)) add(`${k} in ${n} of 16 (${step.id})`, n / 16);
        }
      } catch { /* a broken step is the archetype check's to report */ }
    }
  }
  return [...out].map(([share, how]) => ({ how, share }));
}

type Kid = { g1: string; g2: string; w: number };
/** All sixteen equally likely boxes of a two-gene cross. */
function kidsOf(l1: Locus, p1: [string, string], l2: Locus, p2: [string, string]): Kid[] {
  const a = punnett(p1[0], p1[1], l1).flat(), b = punnett(p2[0], p2[1], l2).flat();
  return a.flatMap(g1 => b.map(g2 => ({ g1, g2, w: 1 / 16 })));
}
const sum = (kids: Kid[], pred: (k: Kid) => boolean) => kids.reduce((t, k) => t + (pred(k) ? k.w : 0), 0);

/** Copies that travel as the grandparents' sets: a parent with two different copies of both genes
 * passes them as two pairs, as written or crossed over, instead of dealing each gene separately. */
function linkedShares(m: CrossModel, s: SecondGene, inFocus: (combo: string) => boolean): { how: string; share: number }[] {
  const pairs = [0, 1].map(i => [alleles(m.parents[i], m.locus), alleles(s.parents[i], s.locus)] as const);
  const double = pairs.map(([a, b]) => a[0] !== a[1] && b[0] !== b[1]);
  if (!double.some(Boolean)) return [];
  type Pairing = 'as written' | 'crossed' | null;
  const gametes = (i: number, pairing: Pairing) => {
    const [a, b] = pairs[i];
    if (!pairing) return a.flatMap(x => b.map(y => ({ x, y, w: 1 / 4 })));
    return pairing === 'as written' ? [{ x: a[0], y: b[0], w: 1 / 2 }, { x: a[1], y: b[1], w: 1 / 2 }] : [{ x: a[0], y: b[1], w: 1 / 2 }, { x: a[1], y: b[0], w: 1 / 2 }];
  };
  const options = (i: number): Pairing[] => double[i] ? ['as written', 'crossed'] : [null];
  const out: { how: string; share: number }[] = [];
  for (const o0 of options(0)) for (const o1 of options(1)) {
    let share = 0;
    for (const u of gametes(0, o0)) for (const v of gametes(1, o1)) {
      const combo = joinPair(phenotype(normalize(u.x, v.x, m.locus), m.locus), phenotype(normalize(u.y, v.y, s.locus), s.locus));
      if (inFocus(combo)) share += u.w * v.w;
    }
    out.push({ how: `the genes linked (${[o0, o1].filter(Boolean).join(', ')})`, share });
  }
  return out;
}

/** Ignoring the sex split of an X- (or Z-) linked first gene: the focus counted within its own sex;
 * the sexes merged (when a look the focus counts also turns up in the other sex); and the gene read
 * as an ordinary one, the one-X parent given a second copy of any kind that leaves him looking as he
 * does (a second copy of his own, or a hidden one), with the sex word kept (half the young) or
 * dropped. A reading that changes his look (a black tom read as tortoiseshell) is not one a learner
 * can make from the scenario. */
function sexShares(m: CrossModel, s: SecondGene, inFocus: (combo: string) => boolean): { how: string; share: number }[] {
  const sex = s.sex!;
  const rest: Locus = Object.fromEntries(Object.entries(m.locus).filter(([a]) => a !== sex));
  // The parent and young with one X (a son), or one Z (a hen): their genotype holds the sex letter.
  const oneX = (g: string) => g.includes(sex);
  // What a genotype's own X copies show, whatever the sex: a son shows his one X.
  const look = (g: string) => { const xs = [...g].filter(a => a !== sex); return xs.length === 1 ? xs[0] : phenotype(normalize(xs[0], xs[1], rest), rest); };
  const kids = kidsOf(m.locus, m.parents, s.locus, s.parents);
  const focused = (k: Kid) => inFocus(joinPair(phenotype(k.g1, m.locus), phenotype(k.g2, s.locus)));
  const out: { how: string; share: number }[] = [];
  for (const one of [true, false]) {
    const both = sum(kids, k => focused(k) && oneX(k.g1) === one), all = sum(kids, k => oneX(k.g1) === one);
    if (both > 0 && all > 0) out.push({ how: `counted within ${one ? 'the sex with one X' : 'the sex with two Xs'}`, share: both / all });
  }
  const looks = new Set(kids.filter(focused).map(k => joinPair(look(k.g1), phenotype(k.g2, s.locus))));
  const truth = sum(kids, focused), merged = sum(kids, k => looks.has(joinPair(look(k.g1), phenotype(k.g2, s.locus))));
  // Merging only misleads when it adds young of the other sex; otherwise it is the answer itself.
  if (merged > truth + 1e-12) out.push({ how: 'the sexes merged', share: merged });
  const i = m.parents.findIndex(oneX);
  if (i < 0) return out;
  const own = [...m.parents[i]].find(a => a !== sex)!;
  for (const a of Object.keys(rest)) {
    const parents: [string, string] = [m.parents[0], m.parents[1]];
    parents[i] = normalize(own, a, rest);
    if (phenotype(parents[i], rest) !== own) continue;
    const ordinary = kidsOf(rest, parents, s.locus, s.parents);
    const share = sum(ordinary, k => looks.has(joinPair(phenotype(k.g1, rest), phenotype(k.g2, s.locus))));
    out.push({ how: `the one-X parent read as ${parents[i]}, sex dropped`, share }, { how: `the one-X parent read as ${parents[i]}, sex kept`, share: share / 2 });
  }
  return out;
}

/** Every reflex for a two-gene cross case (none for any other case). */
export function crossReflexes(c: PlaceCase, place: ReflexPlace): Reflex[] {
  const m = c.model;
  if (m.engine !== 'cross' || !m.second || c.call.kind !== 'set') return [];
  const s = m.second, call = c.call, n = m.count;
  const out: Reflex[] = [];
  const raw = (how: string, value: number) => out.push({ how, value });
  const share = (how: string, x: number) => out.push({ how, value: x * n });
  // The slider, and the shares a one-gene cross makes.
  raw('the slider’s start', call.start); raw('the slider’s middle', (call.min + call.max) / 2); raw('the slider’s minimum', call.min); raw('the slider’s maximum', call.max);
  share('a quarter of the count', 1 / 4); share('half the count', 1 / 2); share('three quarters of the count', 3 / 4);
  // What the lesson's sims print or its number beats work out, and the rest of each.
  for (const p of lessonShares(place.pack)) { share(`a share the lesson shows: ${p.how}`, p.share); share(`the rest of a share the lesson shows: ${p.how}`, 1 - p.share); }
  // Look-alikes: the place's other cases, by their answer and by their share.
  for (const d of place.cases ?? []) {
    if (d.id === c.id || d.call.kind !== 'set') continue;
    const o = runCase(d);
    if (o.truth.kind === 'set') raw(`the answer to ${d.id}`, o.truth.value);
    if (o.run.engine === 'cross') share(`the share in ${d.id}`, o.run.expectedShare);
  }
  // The two genes treated as one: either gene alone, or their shares added instead of multiplied.
  const made = expected2({ locus: m.locus, parents: m.parents }, { locus: s.locus, parents: s.parents });
  const e1 = expected(m.parents[0], m.parents[1], m.locus), e2 = expected(s.parents[0], s.parents[1], s.locus);
  const parts = m.focus.split(','), focus = new Set(parts), inFocus = (combo: string) => focus.has(combo);
  const first = new Set(parts.map(p => splitPair(p)[0])), second = new Set(parts.map(p => splitPair(p)[1]));
  const p1 = [...first].reduce((t, k) => t + (e1[k] ?? 0) / 4, 0), p2 = [...second].reduce((t, k) => t + (e2[k] ?? 0) / 4, 0);
  share('the first gene alone', p1);
  share('the second gene alone', p2);
  if (p1 + p2 <= 1) share('the two genes’ shares added', p1 + p2);
  if (parts.length > 1) for (const p of parts) share(`one part of the class alone (${p})`, (made[p] ?? 0) / 16);
  // The genes linked, travelling as the grandparents' sets.
  for (const l of linkedShares(m, s, inFocus)) share(l.how, l.share);
  // The 9:3:3:1 table, on any cross that is not two hybrids of a hidden trait: single classes for a
  // one-combination question, sums for a question that joins several.
  const plain = (e: Record<string, number>) => Object.values(e).sort().join() === '1,3';
  if (!(plain(e1) && plain(e2))) for (const k of parts.length === 1 ? TABLE_SINGLES : TABLE_UNIONS) share(`the 9:3:3:1 table: ${k} in 16`, k / 16);
  // The sex split ignored.
  if (s.sex) for (const x of sexShares(m, s, inFocus)) share(x.how, x.share);
  return out;
}

/** The reflexes that win a case, each tried one slider step either side. Empty is the goal. */
export function reflexWins(c: PlaceCase, place: ReflexPlace): string[] {
  if (c.call.kind !== 'set') return [];
  const call = c.call, truth = runCase(c).truth;
  if (truth.kind !== 'set') return [];
  const won = new Set<string>();
  for (const r of crossReflexes(c, place)) for (const d of [-1, 0, 1]) {
    const v = r.value + d * call.step;
    if (v < call.min - 1e-9 || v > call.max + 1e-9) continue;
    if (wins(call, truth, { value: v })) won.add(r.how);
  }
  return [...won].sort();
}

/** The reflex that lands closest to the winning band, and how far outside it (in the call's unit;
 * negative means it wins). */
export function nearestReflex(c: PlaceCase, place: ReflexPlace): { how: string; value: number; margin: number } | null {
  if (c.call.kind !== 'set') return null;
  const call = c.call, truth = runCase(c).truth;
  if (truth.kind !== 'set') return null;
  let best: { how: string; value: number; margin: number } | null = null;
  for (const r of crossReflexes(c, place)) {
    const margin = Math.abs(r.value - truth.value) - call.tolerance;
    if (!best || margin < best.margin) best = { ...r, margin };
  }
  return best;
}
