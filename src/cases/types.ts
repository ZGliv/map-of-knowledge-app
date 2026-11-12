// A "new case": a situation the expedition never showed, played in one of the sim archetypes.
// The learner makes a call (picks or sets something), runs the model, and their call against what
// the model computes is the proof. Cases are pure data on the place contract (places/contract.ts,
// mok.place/2), so the generator can write them; cases/engines.ts computes every outcome.
//
// Rules the validator holds every case to (places/validate.ts, cases.*):
//   - Transfer is computed: none of the case's `entities` may appear in the expedition or its reels.
//   - Success is computed by the engine from the model. A case never states its own answer.
//   - Runs are seeded, and the winning call is the same under other seeds (luck never decides).
//   - The call starts neutral (no option picked, a slider outside the winning band), and blind
//     guessing wins at most CASE_POLICY.maxGuessP of the time.
//   - A place needs at least 3 cases: the expedition's last beat, a retry, and the Lasting mission.
//
// Pure types: generated bundles import only types from here.

import type { ItemSource } from '../checks/types';
import type { ArchetypeId } from '../expeditions/sims/archetypes';
import type { Locus } from '../expeditions/sims/cross';
import type { Taxon, Trait } from '../expeditions/sims/nesting';
import type { SpreadRoute, Via } from '../expeditions/sims/spreadMath';
import type { Mating, Setting } from '../expeditions/sims/tradeoffModel';
import type { Change, CompareBy, NucleicKind, ReadFrom } from '../expeditions/sims/sequence';

/** Singular and plural of who is counted: { one: 'lizard', many: 'lizards' }. */
export interface Who { one: string; many: string }

/** Populations over generations: selection (fitness ≠ 1), drift (small sizes) or both.
 * Diploid Wright–Fisher (sims/drift.ts); a `large` population follows the expected path. */
export interface PopulationModel {
  engine: 'population';
  /** The trait counted, as a phrase that reads after "with": "the pale stripe". */
  trait: string;
  who: Who;
  /** One or more populations, each with its own size (diploid individuals) or 'large'. A population
   * may override the shared `start` and `fitness` (a different place, a different pressure). */
  demes: { id: string; label: string; size: number | 'large'; start?: number; fitness?: number }[];
  /** Share of individuals showing the trait at the start, 0–1. A small population with a rare
   * variant may start with no copy at all: copies are whole. */
  start: number;
  /** How the variant shows: one copy (dominant), two copies (recessive), or counted by copies (additive). */
  shows: 'dominant' | 'recessive' | 'additive';
  /** Survival-and-breeding of an individual showing the trait, relative to one that doesn't. 1 = neither helps nor hurts. */
  fitness: number;
  /** New copies of the variant made by mutation, per gene copy per generation (default 0). */
  mutation?: number;
  /** Share of each generation's parents that come from all the populations pooled (default 0: cut off). */
  migration?: number;
  generations: number;
  /** Independent runs per population (1 for large populations). */
  replicates: number;
  /** What the call is about:
   *  share   – set: the % showing the trait in the first population at the end;
   *  settled – pick a population id, or 'neither': where the trait more often ends on all or none;
   *  most    – pick a population id, or 'neither': where the trait ends most common;
   *  gap     – set: how far apart the first two populations end, in % points showing the trait. */
  measure: 'share' | 'settled' | 'most' | 'gap';
}

/** One trait pulled two ways (sims/tradeoffModel.ts): the call is where offspring peak. */
export interface TradeoffModel {
  engine: 'tradeoff';
  /** The trait axis, from its low end to its high end: { label: 'song', low: 'silent', high: 'loud' }. */
  trait: { label: string; low: string; high: string };
  who: Who;
  /** The rising pull (mates) and the falling one (survival), as on-chart labels. */
  benefit: string;
  cost: string;
  setting: Setting;
  mating: Mating;
  /** Where the population's average starts, 0–1. */
  start: number;
  generations: number;
  measure: 'best';
}

/** A second gene in the same cross, on another chromosome pair (sims/cross.ts expected2). Each gene
 * is dealt separately, so a combination's share is the product of the two genes' own shares, in
 * sixteenths. Two genes on one chromosome travel together and would be dealt wrongly: the engine
 * cannot detect that, so only use genes on different chromosome pairs (an X or Z gene with an
 * ordinary one is fine). */
export interface SecondGene {
  locus: Locus;
  /** This gene's genotypes, in the same parent order as the first gene's `parents`. */
  parents: [string, string];
  /** Labels per visible trait of this gene (its phenotype keys): the picture's column headers and
   * the outcome line. Short: a grid header is about 64 px wide on a phone. */
  traits: Record<string, string>;
  /** With the model's `spots`: two more spots in the same animal, on two more chromosome pairs, so
   * an egg or sperm takes one copy at each of four spots. Both or neither. */
  spots?: [string, string];
  /** What is counted, and what the tally and picture show. A key names one combination as
   * 'k1|k2', the first gene's phenotype key then the second's ('R|y'), or joins several with
   * commas ('R|y,r|Y'). Together the keys cover every combination the cross makes, each exactly
   * once; 2 to 6 keys. The model's `focus` names one key. */
  classes: Record<string, string>;
  /** The first gene is on the X (or a bird's Z), and this letter in its locus stands for the Y (or a
   * hen's W): the parent carrying it has one X. Rank it level with the top allele, so every
   * phenotype key with it is a son (or hen) and every key without it a daughter (or cock). In a
   * two-gene cross a first-gene Y or W always means this, and the model needs `parentLabels`, since
   * its trait labels name the young (a father would show as a son). */
  sex?: 'Y' | 'W';
}

/** A cross (sims/cross.ts): one gene, or two with `second`. The call is how many of `count` offspring
 * show `focus` (a trait key; with `second`, a class key). */
export interface CrossModel {
  engine: 'cross';
  locus: Locus;
  parents: [string, string];
  /** Labels per visible trait (the phenotype keys of `locus`). */
  traits: Record<string, string>;
  /** The parents, in words, as the learner meets them: "two roan cattle". */
  cross: string;
  /** For one animal's eggs or sperm: the two "parents" are two spots on different chromosomes, each
   * holding one copy from its mother and one from its father. Names them, and the result counts
   * gametes instead of a cross's brood. The answer doesn't change. */
  spots?: [string, string];
  /** What the two parents are called before the run, when the trait each shows would misname them
   * (siblings counted by the copies they share: the parents show no such class). Display only. */
  parentLabels?: [string, string];
  who: Who;
  count: number;
  focus: string;
  measure: 'count';
  /** DNA strands copied, not a cross (sims/cross.ts copies): each copy is one strand from each
   * "parent" in exact shares, the parents are not drawn before the run, and there is no square. */
  copying?: boolean;
  /** A second gene on another chromosome pair: shares in sixteenths, a 16-box picture. */
  second?: SecondGene;
}

/** A pinned tree (sims/tree.ts). The call is every tip that shares a more recent ancestor with
 * `of` than `than` does (a multi pick). Look-alikes and neighbours in the drawing don't decide it. */
export interface TreeModel {
  engine: 'tree';
  newick: string;
  tips: Record<string, string>;
  of: string;
  than: string;
  measure: 'closer';
}

/** Earth's history as one day (sims/deepTimeMath.ts): the call is the clock time of `event`. */
export interface ClockModel {
  engine: 'clock';
  earthMa: number;
  event: { label: string; ma: number };
  /** Times already placed on the dial, so the learner has bearings. */
  landmarks: { label: string; ma: number }[];
  measure: 'time';
}

/** Groups inside groups (sims/nesting.ts): the call is the find that would have nowhere to go. */
export interface NestModel {
  engine: 'nest';
  taxa: Taxon[];
  traits: Trait[];
  candidates: Taxon[];
  measure: 'homeless';
}

/** Sourced values that rise as bars: the call is the biggest. */
export interface ChartModel {
  engine: 'chart';
  unit: string;
  bars: { id: string; label: string; value: number }[];
  measure: 'biggest';
}

/** A fall from rest (sims/motionMath.ts): in a vacuum, or in air when the body has a terminal speed. */
export interface MotionModel {
  engine: 'motion';
  /** Where it falls, and how hard that world pulls, in m/s per second. */
  world: { label: string; g: number };
  /** What falls. `terminal` is its top speed in air, m/s; leave it out in a vacuum. */
  body: { label: string; terminal?: number };
  /** The drop, in metres. */
  height: number;
  /** What the call is about:
   *  time     – set: seconds to fall the whole height;
   *  reach    – set: seconds to fall the first `metres`;
   *  distance – set: metres fallen `seconds` after release;
   *  final    – set: metres fallen in the last `seconds` before landing. */
  measure: 'time' | 'reach' | 'distance' | 'final';
  seconds?: number;
  metres?: number;
}

/** Two notes as numbers (sims/ratioMath.ts). Frequencies in Hz.
 *  pull    – set: the frequency of a string tuned to `hz` once its tension is multiplied by `factor`;
 *  pitch   – set: the frequency of `string` when its vibrating part is cut to `stopped` (same unit as its length);
 *  calmest – pick: the pair whose combined shape repeats after the fewest waves of its lower note;
 *  repeats – set: how many times a second the combined shape of `hz` repeats. */
export type RatioModel =
  | { engine: 'ratio'; measure: 'pull'; hz: number; factor: number }
  | { engine: 'ratio'; measure: 'pitch'; string: { label: string; hz: number; length: number; unit: string }; stopped: number }
  | { engine: 'ratio'; measure: 'calmest'; pairs: { id: string; label: string; hz: [number, number] }[] }
  | { engine: 'ratio'; measure: 'repeats'; hz: [number, number] };

/** Something spreading along routes at the pace of each way of travel (sims/spreadMath.ts). The call
 * is which of `candidates` it reaches first, or last. */
export interface SpreadModel {
  engine: 'spread';
  /** What spreads, as a noun: "plague". */
  what: string;
  /** Pace by way of travel, in km a day. */
  speeds: Partial<Record<Via, number>>;
  /** `side` puts the label on that side of the dot, so close places stay readable. */
  places: { id: string; label: string; lat: number; lon: number; side?: 'left' | 'right' | 'above' | 'below' }[];
  origin: string;
  /** Routes run both ways; waypoints ([lat, lon]) let a ship sail around land. */
  routes: SpreadRoute[];
  measure: 'first' | 'last';
  candidates: string[];
}


/** Letters read by the genetic code (sims/sequence.ts). The call is what a change does to the
 * chain, how long the chain ends up, which amino acid lands at a place, which of several changes
 * leaves the chain as it was, or which strings differ least. Every answer is computed from the letters. */
export interface SequenceModel {
  engine: 'sequence';
  kind: NucleicKind;
  /** The strings shown. The first is the gene as usual: coding strand (DNA) or RNA, 5′ to 3′. */
  seqs: { id: string; label: string; letters: string }[];
  /** Where reading begins in the first string: 'start' (its first AUG) or a letter number. */
  from: ReadFrom;
  /** Chain position of the first codon read, when the letters are an excerpt (default 1). */
  firstResidue?: number;
  /** Count the chain without its first methionine, which the cell trims off (as in globins), so
   * positions and lengths match the protein's own numbering. */
  trimFirst?: boolean;
  /** Changes to the first string: effect, length and residue read the one change; same picks among them. */
  changes?: { id: string; label: string; change: Change }[];
  /** Letters shown, 1-based and inclusive, when the string is long; the rest fold into a count. */
  window?: [number, number];
  /** effect      – what the change does (pick among effects);
   *  length      – amino acids in the chain after the change, counted from position 1 (set);
   *  residue     – the amino acid at chain position `at` after the change (pick among one-letter codes);
   *  same        – which change leaves the chain exactly as it was (pick among change IDs);
   *  closest     – which two strings differ least (pick among "a|b" pairs);
   *  differences – how many letters differ between the first two strings (set). */
  measure: 'effect' | 'length' | 'residue' | 'same' | 'closest' | 'differences';
  at?: number;
  /** closest and differences: letter by letter (default), or fewest edits when letters were lost or gained. */
  by?: CompareBy;
}

export type CaseModel = PopulationModel | TradeoffModel | CrossModel | TreeModel | ClockModel | NestModel | ChartModel | MotionModel | RatioModel | SpreadModel | SequenceModel;
export type CaseEngineId = CaseModel['engine'];

/** What the learner does before running. Pick options are engine IDs (a population, a tip, a find,
 * a bar); a set call is a value on a range. Neither carries an answer: the engine computes it. */
export type CaseCall =
  | { kind: 'pick'; options: { id: string; label: string }[]; /** Pick every option that holds. */ multi?: boolean }
  | { kind: 'set'; label: string; min: number; max: number; step: number; start: number; tolerance: number; unit?: string; ends?: [string, string] };

export type CaseAnswer = { pick: string } | { picks: string[] } | { value: number };

export interface PlaceCase {
  /** Opaque, stable: `c_` + 10 Crockford base32 characters. A changed model or call needs a new ID. */
  id: string;
  /** IDs this case once had, when only its wording, labels, order or range changed: the situation is
   * the one a learner already met, so playing any of them spends this case too (cases/index.ts). */
  was?: string[];
  /** The archetype it plays in: the place's own, or the best-fitting one (then `fit` says why). */
  archetype: ArchetypeId;
  fit?: string;
  title: string;
  /** Where and when, when it is a real place and time: "Kauai, Hawaii · 1991". */
  setting?: string;
  /** The new situation, in two or three sentences. */
  scenario: string;
  /** The call to make, as a question. */
  ask: string;
  model: CaseModel;
  call: CaseCall;
  /** The run button: "Run 50 generations". */
  run: string;
  /** After the run, right or wrong: what really happened (when real) and why. */
  reveal: string;
  /** What a successful call shows the learner understands, one sentence. */
  claim: string;
  /** Every named organism, place, person or object in the case's text. */
  entities: string[];
  sources: ItemSource[];
  seed: string;
}
