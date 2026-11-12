// The sim library: every hands-on engine, grouped into archetypes by the kind of idea it teaches.
//
// This is the catalogue the generator picks from (PLAN §6.4: knowledge types open formats; the
// engines on hand narrow them). A new place should be filled in with DATA for one of these
// engines. A new engine is built only when an idea fits none of them and the engine will serve
// ten or more ideas (PLAN §6.1 rule 6).
//
// Each engine here has:
//   - a typed params schema (exported from its renderer, gathered in SimParamsMap below);
//   - one renderer (SimRenderer.tsx dispatches on the archetype, then the engine);
//   - `asks`: every graded moment it records, so the validator can check grade IDs and keys;
//   - `check`: rules that recompute what the pack claims from the engine's own model, so a
//     drafted key can never disagree with what the learner will see happen.
// `leaks` lists what is still hard-coded in an engine: the honest limit of "data only".
//
// Pure data and functions: no React, so validators and Node scripts can import it.

import type { Choice, SimBeat } from '../content/types';
import { expected, expected2, phenotype, punnett, type Locus } from './cross';
import { clockSeconds, describeSpan, secondsBeforeMidnight } from './deepTimeMath';
import { contiguous, crossings, placements, type Taxon } from './nesting';
import { lastShared, problems, type Tree } from './rewind';
import { labProblems } from './sequence';
import { closer, closestRelatives, mrca, parseNewick, sameTree, tipsOf } from './tree';
import { shift, type Mating, type Setting } from './tradeoffModel';
import type { Params as DeepTimeParams } from './DeepTime';
import type { Params as DriftLabParams } from './DriftLab';
import type { Params as DropTowerParams } from './DropTower';
import type { Params as FluctuationParams } from './Fluctuation';
import type { Params as LifeChartParams } from './LifeChart';
import type { Params as LineageRewindParams } from './LineageRewind';
import type { Params as MonochordParams } from './Monochord';
import type { MothHuntParams } from './MothHunt';
import type { Params as NestTestParams } from './NestTest';
import type { PeaCrossParams } from './PeaCross';
import type { Params as SequenceLabParams } from './SequenceLab';
import type { Params as SpreadMapParams } from './SpreadMap';
import type { Params as TradeOffParams } from './TradeOff';
import type { TreeSpinParams } from './TreeSpin';
import type { Params as WaveMixerParams } from './WaveMixer';

/** PLAN §6.4: the 20 knowledge types an idea is tagged with (1–3 per idea). */
export type KnowledgeType =
  | 'causal-mechanism' | 'process' | 'quantitative-law' | 'spatial-spread'
  | 'historical-narrative' | 'argument' | 'classification-tree' | 'structure-vocabulary'
  | 'perceptual' | 'cognitive-procedure' | 'physical-procedure' | 'interpretive'
  | 'empirical-data' | 'biographical' | 'compare-contrast' | 'scale'
  | 'nature-of-science' | 'contested' | 'systems' | 'normative';

/** The typed params of every engine, keyed by the `sim` name a pack uses. */
export interface SimParamsMap {
  mothHunt: MothHuntParams;
  driftLab: DriftLabParams;
  fluctuation: FluctuationParams;
  treeSpin: TreeSpinParams;
  lineageRewind: LineageRewindParams;
  nestTest: NestTestParams;
  deepTime: DeepTimeParams;
  spreadMap: SpreadMapParams;
  tradeOff: TradeOffParams;
  peaCross: PeaCrossParams;
  lifeChart: LifeChartParams;
  dropTower: DropTowerParams;
  monochord: MonochordParams;
  waveMixer: WaveMixerParams;
  sequenceLab: SequenceLabParams;
}
export type SimKey = SimBeat['sim'];

/** A sim beat whose params are checked against its engine's schema by the compiler. New packs
 * write sim beats with `simBeat({...})` so a drafting mistake is a type error, not a blank screen. */
export type TypedSimBeat<K extends SimKey> = Omit<SimBeat, 'sim' | 'params'> & { sim: K; params: SimParamsMap[K] };
export const simBeat = <K extends SimKey>(beat: TypedSimBeat<K>): SimBeat => beat as unknown as SimBeat;

/** A graded moment an engine records, with its choices when it is multiple choice. */
export interface SimAsk { gradeId: string; prompt: string; choices?: Choice[]; answer?: string; transfer?: boolean }

export interface Engine<K extends SimKey = SimKey> {
  sim: K;
  /** What the learner does, in one line. */
  does: string;
  asks: (params: SimParamsMap[K], beat: SimBeat) => SimAsk[];
  /** Rules recomputed from the model. Returns problems; empty means the data is sound. */
  check: (params: SimParamsMap[K], beat: SimBeat) => string[];
  /** What is still hard-coded in the renderer, so data alone can't yet change it. */
  leaks: string[];
}

export type ArchetypeId = 'population' | 'tree' | 'grouping' | 'timescale' | 'spread' | 'tradeoff' | 'cross' | 'chart' | 'motion' | 'ratio' | 'sequence';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  /** The kind of idea it teaches, in a sentence a drafter can match an idea against. */
  teaches: string;
  knowledgeTypes: KnowledgeType[];
  /** Pick it when… */
  pickWhen: string;
  /** …and not when. */
  avoidWhen: string;
  /** Packs that use it, as worked examples to copy the data shape from. */
  examples: string[];
  engines: Engine[];
}

// ---------------------------------------------------------------- helpers

const q = (gradeId: string | undefined, prompt: string, choices?: Choice[], answer?: string, transfer?: boolean): SimAsk =>
  ({ gradeId: gradeId ?? '', prompt, choices, answer, transfer });
const grade = (beat: SimBeat, i: number) => beat.grades?.[i]?.gradeId;
const transferOf = (beat: SimBeat, id: string) => beat.grades?.find(g => g.gradeId === id)?.transfer;
const keyIn = (choices: { id: string }[], answer: string, where: string) =>
  choices.some(c => c.id === answer) ? [] : [`${where}: key "${answer}" is not one of its choices`];

/** Generic shape rules every engine shares: each ask names a declared grade, keys exist. */
function sharedChecks(asks: SimAsk[]): string[] {
  const out: string[] = [];
  for (const a of asks) {
    if (!a.gradeId) out.push(`an ask has no grade ID ("${a.prompt.slice(0, 40)}…"): declare it in beat.grades`);
    if (a.choices && a.answer !== undefined) out.push(...keyIn(a.choices, a.answer, a.gradeId));
  }
  return out;
}

// ---------------------------------------------------------------- engines

const mothHunt: Engine<'mothHunt'> = {
  sim: 'mothHunt',
  does: 'Be the predator: catch the easiest prey, let the rest breed, fast-forward generations and watch a form’s share change.',
  asks: p => p.script.flatMap(s => s.do === 'ask' ? [q(s.gradeId, s.prompt, s.choices, s.answer, s.transfer)] : []),
  check: p => {
    const out: string[] = [];
    if (p.start <= 0 || p.start >= 1) out.push('start share must be between 0 and 1');
    for (const s of p.script) if (s.do === 'forward' && !(s.rising ? s.until > p.start : s.until < 0.98)) out.push(`forward to ${s.until} can never be reached`);
    return out;
  },
  leaks: ['Barks are only "soot" and "lichen"; the prey is always drawn as a moth.'],
};

const driftLab: Engine<'driftLab'> = {
  sim: 'driftLab',
  does: 'Watch gene copies pick random parents until one version takes over, then compare many populations at a chosen size.',
  asks: (p, beat) => [q(grade(beat, 0), p.question.ask, p.question.choices, p.question.answer, transferOf(beat, grade(beat, 0) ?? ''))],
  check: p => {
    const out: string[] = [];
    if (p.beads.start <= 0 || p.beads.start >= p.beads.copies) out.push('beads must start with both versions present');
    if (!p.chart.sizes.length || p.chart.sizes.some(n => n < 2)) out.push('chart sizes must be populations of 2 or more');
    return out;
  },
  leaks: [],
};

const fluctuation: Engine<'fluctuation'> = {
  sim: 'fluctuation',
  does: 'Run a fluctuation test under two hypotheses, then lay the real published counts beside them.',
  asks: (p, beat) => [q(grade(beat, 0), p.question.ask, p.question.choices, p.question.answer)],
  check: p => {
    const out: string[] = [];
    if (p.hypotheses.map(h => h.id).sort().join() !== 'induced,random') out.push('needs exactly the "induced" and "random" hypotheses');
    for (const row of p.real.rows) if (row.counts.some(n => !Number.isInteger(n) || n < 0)) out.push(`real row "${row.label}" has a count that is not a whole number`);
    return out;
  },
  leaks: ['Only the two-hypothesis (induced vs random) design is supported.'],
};

const treeSpin: Engine<'treeSpin'> = {
  sim: 'treeSpin',
  does: 'Spin branches of a real tree without changing it, then read relatedness from shared ancestors.',
  asks: p => p.tasks.map(t => t.kind === 'spin' ? q(t.gradeId, t.ask, t.choices, t.answer, t.transfer)
    : t.kind === 'closer' ? q(t.gradeId, t.ask, [...t.options.map(id => ({ id, label: p.tips[id], feedback: t.feedback?.[id] })), { id: 'tie', label: t.tie, feedback: t.feedback?.tie }],
      closer(parseNewick(p.newick), t.of, t.options[0], t.options[1]), t.transfer)
    : q(t.gradeId, t.ask, undefined, undefined, t.transfer)),
  check: p => {
    const out: string[] = [];
    const shown = parseNewick(p.newick), pinned = parseNewick(p.pinned);
    if (!sameTree(shown, pinned)) out.push('the drawn tree is not the pinned tree (only branch order may differ)');
    if (tipsOf(shown).sort().join() !== Object.keys(p.tips).sort().join()) out.push('tip labels do not match the tree’s tips');
    for (const t of p.tasks) {
      if ((t.kind === 'closer' || t.kind === 'tapTip') && !tipsOf(shown).includes(t.of)) out.push(`${t.gradeId}: "${t.of}" is not a tip`);
      if (t.kind === 'tapTip' && !closestRelatives(shown, t.of).length) out.push(`${t.gradeId}: "${t.of}" has no closest relative`);
      if (t.kind === 'tapNode' && tipsOf(mrca(shown, t.pair[0], t.pair[1])).length <= 2) out.push(`${t.gradeId}: the pair’s ancestor must hold more than two tips`);
    }
    return out;
  },
  leaks: [],
};

const lineageRewind: Engine<'lineageRewind'> = {
  sim: 'lineageRewind',
  does: 'Wind the clock back from living species and watch their lines meet at shared ancestors, dated.',
  asks: (p, beat) => p.questions.map(x => q(x.gradeId, x.prompt, x.choices, x.answer, transferOf(beat, x.gradeId))),
  check: p => {
    const out = problems(p.tree as Tree).map(m => `tree: ${m}`);
    if (!lastShared(p.tree as Tree, ...p.focus.pair)) out.push('the focus pair never meets');
    for (const s of p.tree.splits) if (s.range[1] > p.max) out.push(`split ${s.id} is older than the clock winds back`);
    return out;
  },
  leaks: [],
};

const nestTest: Engine<'nestTest'> = {
  sim: 'nestTest',
  does: 'Switch on shared traits one at a time and watch groups fall inside groups; then find the one find with nowhere to go.',
  asks: (p, beat) => p.questions.map(x => q(x.gradeId, x.prompt, x.choices, x.answer, transferOf(beat, x.gradeId))),
  check: p => {
    const out: string[] = [];
    const traits = p.traits.map(t => t.id);
    if (crossings(p.taxa as Taxon[], traits).length) out.push('the real groups cross instead of nesting');
    if (!contiguous(p.taxa as Taxon[], traits)) out.push('taxa are not ordered so every group is contiguous');
    const homeless = p.candidates.filter(c => placements(p.taxa as Taxon[], traits, c).length === 0).map(c => c.id);
    const key = p.questions[0]?.answer;
    if (homeless.length !== 1 || homeless[0] !== key) out.push(`the keyed find "${key}" must be the only one with nowhere to go (found: ${homeless.join(', ') || 'none'})`);
    if (p.questions[0] && p.questions[0].choices.map(c => c.id).sort().join() !== p.candidates.map(c => c.id).sort().join()) out.push('question choices must be exactly the candidate finds');
    return out;
  },
  leaks: [],
};

const deepTime: Engine<'deepTime'> = {
  sim: 'deepTime',
  does: 'Squeeze a huge span into one 24-hour day: place an event by feel, play the day, zoom into the last seconds.',
  asks: (p, beat) => [q(grade(beat, 0), p.locate.ask), q(grade(beat, 1), p.question.ask, p.question.choices, p.question.answer)],
  check: p => {
    const out: string[] = [];
    const [a, b] = p.locate.range.map(ma => clockSeconds(ma, p.earthMa));
    if (!(a > 0 && b > a)) out.push('the locate range must sit on the day, oldest first');
    const answer = p.question.choices.find(c => c.id === p.question.answer)?.label ?? '';
    // A clock time printed in the key must be the one the dial computes.
    const m = answer.match(/^About (.+)$/);
    if (m && /second|minute|hour/.test(m[1])) {
      const hit = p.events.some(e => e.years !== undefined && `About ${describeSpan(secondsBeforeMidnight(e.years, p.earthMa))}` === answer);
      if (!hit) out.push(`the keyed clock time "${answer}" is not one the dial computes from the pack’s events`);
    }
    return out;
  },
  leaks: ['The span is always drawn as a 24-hour clock face.'],
};

const spreadMap: Engine<'spreadMap'> = {
  sim: 'spreadMap',
  does: 'Play something spreading across real places over time on a projected map; predict a route or the next place reached.',
  asks: (p, beat) => p.mode === 'predict'
    ? [q(grade(beat, 0), beat.goal, (p.choices ?? []).map(c => ({ id: c.id, label: c.label })), p.answer, beat.grades?.[0]?.transfer)]
    : p.question ? [q(grade(beat, 0), p.question.ask, p.question.choices, p.question.answer, beat.grades?.[0]?.transfer)] : [],
  check: p => {
    const out: string[] = [];
    const ids = new Set(p.places.map(pl => pl.id));
    for (const pl of p.places) {
      if (Math.abs(pl.lat) > 90 || Math.abs(pl.lon) > 180) out.push(`${pl.id}: coordinates are off the globe`);
      for (const from of pl.from === undefined ? [] : [pl.from].flat()) if (!ids.has(from)) out.push(`${pl.id}: comes from unknown place "${from}"`);
    }
    if (p.question?.pickPlace) for (const c of p.question.choices) if (!ids.has(c.id)) out.push(`map question choice "${c.id}" is not a place`);
    if (p.mode === 'predict' && !(p.choices ?? []).length) out.push('predict mode needs route choices');
    return out;
  },
  leaks: [],
};

const tradeOff: Engine<'tradeOff'> = {
  sim: 'tradeOff',
  does: 'Slide one trait between two pulls (a benefit that rises, a cost that rises) to find the best value, then predict where it moves.',
  asks: (p, beat) => p.questions.map(x => q(x.gradeId, x.prompt, x.choices, x.answer, transferOf(beat, x.gradeId))),
  check: p => {
    const out: string[] = [];
    for (const x of p.questions) {
      const from = p.settings.find(s => s.id === p.start), to = p.settings.find(s => s.id === x.switchTo);
      if (!from || !to) { out.push(`${x.gradeId}: unknown setting`); continue; }
      const moved = shift(from as Setting, to as Setting, p.mating as Mating);
      if (x.answer !== moved) out.push(`${x.gradeId}: keyed "${x.answer}" but the model moves "${moved}"`);
      if (x.choices.map(c => c.id).sort().join() !== 'less,more,same') out.push(`${x.gradeId}: choices must be more, less and same`);
    }
    return out;
  },
  leaks: ['The optional figure is only a guppy.'],
};

const peaCross: Engine<'peaCross'> = {
  sim: 'peaCross',
  does: 'Commit to a prediction, then make a one-gene cross: offspring are drawn one at a time, tallied and set beside a Punnett square. With `copying`, DNA strands are copied instead: exact shares, no parents drawn as a pair, no square. With `second`, two genes on different chromosome pairs are dealt separately: each offspring is drawn for both (shape for the first gene, ring for the second), and the square becomes sixteen equally likely boxes; `expect` then counts sixteenths per combination ("R|y"). An X-linked first gene (the Y written as an allele) pairs with an ordinary second one.',
  asks: p => p.steps.map(s => q(s.ask.gradeId, s.ask.prompt, s.ask.choices, s.ask.answer, s.ask.transfer)),
  check: p => {
    if (p.second) return peaCrossTwoGenes(p);
    const out: string[] = [];
    const locus = p.locus as Locus;
    const traitKeys = new Set(Object.keys(p.traits));
    for (const s of p.steps) {
      let want: Record<string, number> = {};
      try { want = expected(s.parents[0], s.parents[1], locus); punnett(s.parents[0], s.parents[1], locus); }
      catch (e) { out.push(`${s.id}: ${(e as Error).message}`); continue; }
      for (const t of Object.keys(want)) if (!traitKeys.has(t)) out.push(`${s.id}: offspring trait "${t}" has no label in traits`);
      for (const g of s.parents) if (!traitKeys.has(phenotype(g, locus))) out.push(`${s.id}: parent ${g} shows a trait with no label`);
      if (s.expect) {
        const a = JSON.stringify(Object.entries(s.expect).filter(([, n]) => n).sort());
        const b = JSON.stringify(Object.entries(want).sort());
        if (a !== b) out.push(`${s.id}: the text expects ${a} in every four, but the cross gives ${b}`);
      }
      if (p.copying && !(Number.isInteger(s.seeds) && s.seeds % 4 === 0)) out.push(`${s.id}: a copying step needs a tray in whole fours, not ${s.seeds}`);
      if (s.scaleUp && Object.values(s.scaleUp.real).reduce((x, y) => x + y, 0) !== s.scaleUp.count) out.push(`${s.id}: the real counts do not add up to ${s.scaleUp.count}`);
      if (s.second) out.push(`${s.id}: step.second needs the beat's own second gene (second)`);
    }
    return out;
  },
  leaks: ['A one-gene beat shows two alleles at a time. Sex linkage is written as the Y (or W) being an allele of the X-linked gene; two genes need `second`, and the engine cannot tell two genes on one chromosome apart from two on different ones.'],
};

/** A pea-cross beat with a second gene: every step names both genes' parents, every combination the
 * cross makes is drawn and named, and `expect` matches the cross in sixteenths. */
function peaCrossTwoGenes(p: PeaCrossParams): string[] {
  const out: string[] = [];
  const second = p.second!;
  const firstKeys = new Set(Object.keys(p.traits)), secondKeys = new Set(Object.keys(second.traits));
  if (p.copying) out.push('copying and a second gene never go together');
  for (const [k, t] of Object.entries(second.traits)) if (!['ring', 'dashed', 'none'].includes(t.ring)) out.push(`second gene trait "${k}": ring must be ring, dashed or none`);
  if (new Set(Object.values(second.traits).map(t => t.ring)).size !== Object.keys(second.traits).length) out.push('each look of the second gene needs its own ring, so the tray never depends on colour');
  for (const s of p.steps) {
    if (!s.second) { out.push(`${s.id}: a two-gene beat names each step's parents for the second gene (step.second)`); continue; }
    if (s.scaleUp) out.push(`${s.id}: scaleUp is one gene only`);
    let want: Record<string, number> = {};
    try {
      want = expected2({ locus: p.locus as Locus, parents: s.parents }, { locus: second.locus, parents: s.second });
    } catch (e) { out.push(`${s.id}: ${(e as Error).message}`); continue; }
    for (const combo of Object.keys(want)) {
      const [k1, k2] = combo.split('|');
      if (!firstKeys.has(k1)) out.push(`${s.id}: offspring trait "${k1}" has no label in traits`);
      if (!secondKeys.has(k2)) out.push(`${s.id}: offspring trait "${k2}" of the second gene has no label`);
    }
    s.parents.forEach((g, i) => {
      if (!firstKeys.has(phenotype(g, p.locus as Locus))) out.push(`${s.id}: parent ${g} shows a trait with no label`);
      if (!secondKeys.has(phenotype(s.second![i], second.locus))) out.push(`${s.id}: parent ${s.second![i]} shows a second-gene trait with no label`);
    });
    if (s.expect) {
      const a = JSON.stringify(Object.entries(s.expect).filter(([, n]) => n).sort());
      const b = JSON.stringify(Object.entries(want).sort());
      if (a !== b) out.push(`${s.id}: the text expects ${a} in every sixteen, but the cross gives ${b}`);
    }
  }
  return [...new Set(out)];
}

const lifeChart: Engine<'lifeChart'> = {
  sim: 'lifeChart',
  does: 'Bet on the biggest value, then watch bars rise to the published figures and open each one.',
  asks: (p, beat) => [q(grade(beat, 0), p.pick.ask, p.events.filter(e => e.big).map(e => ({ id: e.id, label: e.name, feedback: e.feedback })), p.pick.answer)],
  check: p => {
    const out: string[] = [];
    const big = p.events.filter(e => e.big);
    if (!big.length) out.push('mark the events the learner bets on with big: true');
    else if (big.reduce((m, e) => e.value > m.value ? e : m).id !== p.pick.answer) out.push('the keyed pick is not the tallest of the big events');
    if (Math.max(...p.events.map(e => e.value)) > p.max) out.push('a value runs past the chart’s max');
    if (p.layout === 'groups') {
      if (p.events.length > 7) out.push('a side-by-side chart holds at most 7 bars, so labels fit at phone width');
    } else {
      if (!p.span) out.push('a time chart needs a span');
      else for (const e of p.events) if (e.ma === undefined || e.ma < p.span[1] || e.ma > p.span[0]) out.push(`${e.id} lies outside the time span`);
    }
    return out;
  },
  leaks: ['No log-scale charts yet: a value thousands of times smaller than the biggest draws as a flat bar.'],
};

const dropTower: Engine<'dropTower'> = {
  sim: 'dropTower',
  does: 'Re-shoot a strobe photograph of falling objects under different gravity and air.',
  asks: (p, beat) => [q(grade(beat, 0), p.strobe.ask, p.strobe.choices, p.strobe.answer)],
  check: p => p.worlds.flatMap(w => w.g > 0 ? [] : [`world ${w.id} needs positive gravity`]),
  leaks: ['Objects are always a hammer and a feather.'],
};

const monochord: Engine<'monochord'> = {
  sim: 'monochord',
  does: 'Slide a bridge along a string to find the lengths that sound in agreement.',
  asks: () => [],
  check: p => p.targets.flatMap(t => t.n > 0 && t.d > t.n ? [] : [`${t.name}: a stopped string must be a fraction shorter than the open one`]),
  leaks: ['A single string; targets must be simple fractions.'],
};

const waveMixer: Engine<'waveMixer'> = {
  sim: 'waveMixer',
  does: 'Overlay two waves at a chosen ratio and see where the combined shape repeats.',
  asks: (p, beat) => [q(grade(beat, 0), p.question.ask, p.question.choices, p.question.answer)],
  check: p => p.presets.flatMap(x => x.ratio.every(n => Number.isInteger(n) && n > 0) ? [] : [`${x.label}: ratio must be whole numbers`]),
  leaks: [],
};

const sequenceLab: Engine<'sequenceLab'> = {
  sim: 'sequenceLab',
  does: 'Predict, then run an operation on real letters: pair a strand, copy a gene into RNA, read it three letters at a time, change one letter or several, or line strings up and count their differences.',
  asks: p => p.steps.map(s => q(s.ask.gradeId, s.ask.prompt, s.ask.choices, s.ask.answer, s.ask.transfer)),
  check: p => {
    const out: string[] = [];
    if (!p.steps.length) out.push('needs at least one step');
    if (new Set(p.steps.map(s => s.id)).size !== p.steps.length) out.push('step IDs repeat');
    for (const s of p.steps) out.push(...labProblems(s).map(m => `${s.id}: ${m}`));
    if (p.reveal) {
      let tips: string[] = [];
      try { tips = tipsOf(parseNewick(p.reveal.newick)); } catch (e) { out.push(`reveal: the tree does not parse (${(e as Error).message})`); }
      if (tips.length && tips.slice().sort().join() !== Object.keys(p.reveal.tips).sort().join()) out.push('reveal: tip labels do not match the tree’s tips');
      for (const id of p.reveal.marked ?? []) if (!tips.includes(id)) out.push(`reveal: marked "${id}" is not a tip`);
      if (!p.reveal.credit.trim()) out.push('reveal: the tree needs a credit naming its source');
    }
    return out;
  },
  leaks: [
    'Only the standard genetic code is drawn and read in the lab (sequence.ts itself reads any word code).',
    'Letters are DNA or RNA only; a cipher or text alphabet needs its own tile colours.',
    'A lab step shows every letter, so keep it under about 60; a case can fold a long gene with a window.',
    'Play mode lets the learner change letters freely, but only the drafted change is named as an effect.',
  ],
};

// ---------------------------------------------------------------- the catalogue

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: 'population', name: 'Population over generations',
    teaches: 'A share in a population changes over generations because of a rule (selection), luck (drift) or chance mutation, and the learner can rerun it.',
    knowledgeTypes: ['causal-mechanism', 'quantitative-law', 'process'],
    pickWhen: 'The idea is about frequencies changing across generations, or about chance versus cause.',
    avoidWhen: 'Nothing is inherited or counted across generations.',
    examples: ['evolution-e03 (mothHunt)', 'evolution-e04 (driftLab, fluctuation)'],
    engines: [mothHunt as Engine, driftLab as Engine, fluctuation as Engine],
  },
  {
    id: 'tree', name: 'Tree and phylogeny',
    teaches: 'Relatedness is read from shared ancestors on a branching tree, and splits can be dated.',
    knowledgeTypes: ['classification-tree', 'scale', 'nature-of-science'],
    pickWhen: 'The idea asks who is closer to whom, or when two lines last shared an ancestor.',
    avoidWhen: 'There is no pinned tree from a citable source (Open Tree of Life, a dated paper).',
    examples: ['evolution-e01 (treeSpin)', 'evolution-e09 (lineageRewind)'],
    engines: [treeSpin as Engine, lineageRewind as Engine],
  },
  {
    id: 'grouping', name: 'Sorting and grouping',
    teaches: 'Things sort into groups inside groups by shared features; a real pattern nests, and some finds would break it.',
    knowledgeTypes: ['classification-tree', 'argument', 'nature-of-science'],
    pickWhen: 'The idea is a classification whose structure is the evidence (nested hierarchy, a key).',
    avoidWhen: 'A flat sort into buckets is enough: use a match beat with buckets instead.',
    examples: ['evolution-e12 (nestTest)'],
    engines: [nestTest as Engine],
  },
  {
    id: 'timescale', name: 'Timeline and scale',
    teaches: 'A span too large to picture is mapped onto a familiar one, so relative times become visible.',
    knowledgeTypes: ['scale', 'quantitative-law'],
    pickWhen: 'The surprise is how long or short something is relative to something else.',
    avoidWhen: 'Order matters but proportion doesn’t: use an order beat.',
    examples: ['evolution-e06 (deepTime)'],
    engines: [deepTime as Engine],
  },
  {
    id: 'spread', name: 'Map spread',
    teaches: 'Something moves across real places over time, and its route or speed is the lesson.',
    knowledgeTypes: ['spatial-spread', 'historical-narrative', 'empirical-data'],
    pickWhen: 'Places, dates and routes are known and sourced.',
    avoidWhen: 'Geography is incidental to the idea.',
    examples: ['history (spreadMap)', 'evolution-e05 (spreadMap)', 'evolution-e09 (spreadMap)'],
    engines: [spreadMap as Engine],
  },
  {
    id: 'tradeoff', name: 'Trade-off curve',
    teaches: 'One trait is pulled two ways; the best value is where the gain and the cost balance, and it moves when either changes.',
    knowledgeTypes: ['systems', 'quantitative-law', 'causal-mechanism'],
    pickWhen: 'The idea is an optimum between a rising benefit and a rising cost.',
    avoidWhen: 'The two pulls are not on the same trait.',
    examples: ['evolution-e11 (tradeOff)'],
    engines: [tradeOff as Engine],
  },
  {
    id: 'cross', name: 'Cross and inheritance',
    teaches: 'Offspring traits follow from one random copy from each parent; ratios appear in big counts, not small ones.',
    knowledgeTypes: ['quantitative-law', 'process', 'causal-mechanism'],
    pickWhen: 'The idea is an inheritance pattern of one gene (dominance, carriers, ratios, codominance, an X-linked gene), or of two genes on different chromosome pairs dealt separately.',
    avoidWhen: 'The trait is polygenic, or two genes sit on the same chromosome (linkage is not modelled).',
    examples: ['evolution-e02 (peaCross)', 'genetics-dominance (peaCross, dot looks)', 'genetics-sex-linked (peaCross, the Y as an allele; a second gene in the fly beat and the cases)', 'genetics-meiosis (two-gene cases, four spots in one animal)'],
    engines: [peaCross as Engine],
  },
  {
    id: 'chart', name: 'Chart reveal',
    teaches: 'The learner bets on which value is biggest, then real published data rises and settles it.',
    knowledgeTypes: ['empirical-data', 'compare-contrast'],
    pickWhen: 'There is a sourced dataset whose ranking is surprising.',
    avoidWhen: 'The values are not comparable on one linear scale, or the ranking is obvious.',
    examples: ['evolution-e08 (lifeChart, time layout)', 'genetics-gene-regulation (lifeChart, groups layout)'],
    engines: [lifeChart as Engine],
  },
  {
    id: 'motion', name: 'Physical motion',
    teaches: 'A motion law is seen by re-running an experiment under changed conditions.',
    knowledgeTypes: ['quantitative-law', 'perceptual'],
    pickWhen: 'The idea is a fall, throw or drag effect.',
    avoidWhen: 'The objects are not a hammer and a feather (leak: fix the drawing first).',
    examples: ['physics (dropTower)'],
    engines: [dropTower as Engine],
  },
  {
    id: 'sequence', name: 'Sequence and code',
    teaches: 'A string of letters carries information by a rule: it is paired, copied, read in fixed-size words by a code, and a single changed letter can change everything downstream or nothing at all.',
    knowledgeTypes: ['process', 'causal-mechanism', 'cognitive-procedure'],
    pickWhen: 'The idea lives in letters: DNA pairing and copying, transcription, the genetic code and reading frames, mutations and their effects, or two genomes (or texts) compared letter by letter.',
    avoidWhen: 'The letters are incidental to the idea, or the sequence is too long to show (fold it with a window, or compare a sourced excerpt).',
    examples: ['genetics-gene-to-protein (sequenceLab: transcribe, translate, change)'],
    engines: [sequenceLab as Engine],
  },
  {
    id: 'ratio', name: 'Ratio and sound',
    teaches: 'Simple whole-number ratios are heard and seen as agreement.',
    knowledgeTypes: ['perceptual', 'quantitative-law'],
    pickWhen: 'The idea is about proportions you can hear.',
    avoidWhen: 'There is no sound or wave in the idea.',
    examples: ['music (monochord, waveMixer)'],
    engines: [monochord as Engine, waveMixer as Engine],
  },
];

const BY_SIM = new Map<SimKey, { archetype: Archetype; engine: Engine }>(
  ARCHETYPES.flatMap(archetype => archetype.engines.map(engine => [engine.sim, { archetype, engine }] as const)));

export const archetypeOf = (sim: SimKey): Archetype => {
  const hit = BY_SIM.get(sim);
  if (!hit) throw new Error(`Sim "${sim}" belongs to no archetype`);
  return hit.archetype;
};
export const engineOf = (sim: SimKey): Engine => {
  const hit = BY_SIM.get(sim);
  if (!hit) throw new Error(`Sim "${sim}" belongs to no archetype`);
  return hit.engine;
};

/** Every graded moment a sim beat will record. */
export const simAsks = (beat: SimBeat): SimAsk[] => engineOf(beat.sim).asks(beat.params as never, beat);

/** All problems with one sim beat: grade IDs match what the engine records, keys exist, and the
 * engine's own model agrees with every number and key the pack states. */
export function checkSimBeat(beat: SimBeat): string[] {
  const engine = BY_SIM.get(beat.sim)?.engine;
  if (!engine) return [`sim "${beat.sim}" belongs to no archetype`];
  let asks: SimAsk[];
  try { asks = engine.asks(beat.params as never, beat); }
  catch (e) { return [`params do not fit the ${beat.sim} schema (${(e as Error).message})`]; }
  const out = sharedChecks(asks);
  const declared = (beat.grades ?? []).map(g => g.gradeId).sort().join();
  const recorded = asks.map(a => a.gradeId).filter(Boolean).sort().join();
  if (declared !== recorded) out.push(`beat.grades [${declared}] differ from what the engine records [${recorded}]`);
  try { out.push(...engine.check(beat.params as never, beat)); }
  catch (e) { out.push(`params do not fit the ${beat.sim} schema (${(e as Error).message})`); }
  return out.map(m => `${beat.sim}: ${m}`);
}

/** The catalogue as plain text, for the drafting brief (scripts/generate/brief.mjs). */
export function catalogueText(): string {
  return ARCHETYPES.map(a => [
    `## ${a.name} (${a.id})`,
    a.teaches,
    `Knowledge types: ${a.knowledgeTypes.join(', ')}`,
    `Pick when: ${a.pickWhen}`,
    `Avoid when: ${a.avoidWhen}`,
    `Worked examples: ${a.examples.join('; ')}`,
    ...a.engines.map(e => `- engine \`${e.sim}\`: ${e.does}${e.leaks.length ? ` Leaks: ${e.leaks.join(' ')}` : ''}`),
  ].join('\n')).join('\n\n');
}
