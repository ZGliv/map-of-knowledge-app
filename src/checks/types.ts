// The item bank for "Prove it" checks. Items are pure data, kept apart from expedition
// packs: an expedition teaches, a check asks fresh questions it never showed.
//
// How to add a bank for a new node (see banks/evolution-e05.ts for a full example):
// 1. Mint IDs with `node scripts/mint-check-ids.mjs 20` and never edit one once committed.
//    A changed answer key, objective or node needs a NEW item ID (retire the old one);
//    wording fixes keep the ID.
// 2. Map every graded beat of the node's pack to a family in `expeditionFamilies`.
// 3. Write at least 12 items across 3+ kinds: 4+ open-response transfers, 4+ multiple-choice
//    transfers and 4+ items on the expedition's own scenarios. Numbers come from a named
//    generator (generators.ts), never typed by hand.
// 4. List every named organism, place, person or object in `entities`. Whether an item is a
//    transfer is computed from them (banks/index.ts), never declared.
// 5. Register the bank in banks/index.ts and run the tests: they check one right answer per
//    item, entities, sources, supply for three checks in a row, and computed numbers.

/** Where a fact comes from. `url` points at the page or DOI checked. */
export interface ItemSource { label: string; url?: string }

interface ItemBase {
  /** Opaque, stable item ID: `i_` + 10 Crockford base32 characters. */
  id: string;
  /** Opaque family ID (`f_…`). A family is one scenario with one answer logic; answering any
   * member uses up the whole family for proof. */
  family: string;
  /** The sub-claim this item tests, one plain sentence. The result lists it when answered right. */
  claim: string;
  /** Named organisms, places, people and objects that appear in the item's own text. An item is
   * a transfer only if none of them appears anywhere in the node's expedition. Two items that
   * share an entity are never drawn into the same check. */
  entities: string[];
  /** Optional answer-logic key. Two items with the same key are never drawn into one check, so
   * one question can't hand the learner the next one's answer. */
  logic?: string;
  /** Shown after the check, in the review. Says why the answer is right. */
  explain: string;
  sources: ItemSource[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** A wrong option built from a known misconception, e.g. `evo#2` (appendix-evolution §2, row 2).
   * Picking it at "Certain" blocks a pass, as plan §2.4 rule 6 says. */
  misconception?: string;
}

/** Multiple choice with at least four options. Options are shuffled per check. */
export interface ChoiceItem extends ItemBase {
  kind: 'choice';
  prompt: string;
  options: ChoiceOption[];
  answer: string;
}

/** Spot the flaw: a chain of steps with exactly one step that doesn't hold. */
export interface FlawItem extends ItemBase {
  kind: 'flaw';
  prompt: string;
  steps: { id: string; text: string }[];
  answer: string;
}

/** Put items in order. Authored in answer order; shown scrambled. */
export interface OrderItem extends ItemBase {
  kind: 'order';
  prompt: string;
  items: { id: string; label: string }[];
  answer: string[];
  ends: [string, string];
}

/** Match each left item to a right label. With `buckets`, several items can share a label (a sort). */
export interface MatchItem extends ItemBase {
  kind: 'match';
  prompt: string;
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
  pairs: Record<string, string>;
  buckets?: boolean;
}

/** A typed number. The generator writes the prompt and computes the answer. */
export interface NumberItem extends ItemBase {
  kind: 'number';
  generator: string;
  params: Record<string, unknown>;
}

export type CheckItem = ChoiceItem | FlawItem | OrderItem | MatchItem | NumberItem;
export type CheckKind = CheckItem['kind'];

export interface CheckBank {
  /** The atlas node a pass colors. */
  node: string;
  /** The node's name as the check shows it. */
  title: string;
  /** What a pass proves, one sentence. */
  claim: string;
  /** The node's expedition, suggested after a miss. */
  pack: string;
  /** The pack's graded beats, by gradeId, and the family each belongs to. Families the learner
   * answered in the expedition are never drawn into their check. */
  expeditionFamilies: Readonly<Record<string, string>>;
  items: readonly CheckItem[];
}

/** A raw answer, as stored in the ledger. */
export type CheckAnswer =
  | { pick: string }
  | { seq: string[] }
  | { pairs: Record<string, string> }
  | { value: number };
