import type { BankItem, PreparedBank } from './banks';
import { variantCount } from './generators';
import { canPass, CHECK_POLICY } from './rule';

export interface DrawnItem { entry: BankItem; variant: number }

/** A small seeded generator, so a check (and a test) can be replayed from its session ID. */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function* combinations<T>(items: readonly T[], size: number, start = 0, picked: T[] = []): Generator<T[]> {
  if (picked.length === size) { yield [...picked]; return; }
  for (let i = start; i <= items.length - (size - picked.length); i++) {
    picked.push(items[i]);
    yield* combinations(items, size, i + 1, picked);
    picked.pop();
  }
}

const isMultipleChoice = (entry: BankItem) => !entry.openResponse;

/** Prefer plan §4.2's test-out shape: one open-response transfer, one multiple-choice transfer,
 * one more item; then variety of kinds. */
function score(set: readonly BankItem[]): number {
  const kinds = new Set(set.map(entry => entry.item.kind)).size;
  return (set.some(e => e.transfer && e.openResponse) ? 8 : 0)
    + (set.some(e => e.transfer && isMultipleChoice(e)) ? 4 : 0)
    + (set.some(e => !e.transfer) ? 2 : 0)
    + kinds;
}

function valid(set: readonly BankItem[]): boolean {
  const families = new Set(set.map(e => e.item.family));
  if (families.size !== set.length) return false;
  const keys = set.flatMap(e => e.keys);
  if (new Set(keys).size !== keys.length) return false;
  return set.some(e => e.transfer) && canPass(set);
}

/**
 * Draw one check from items whose families the learner has never answered, in the expedition
 * or in an earlier check. Three items when three can meet the evidence rule, four otherwise,
 * or null when the bank has run out of fresh questions for this learner.
 */
export function drawCheck(bank: PreparedBank, seen: ReadonlySet<string>, seed: string): DrawnItem[] | null {
  const random = seeded(seed);
  // One member per unseen family, picked at random when a family has several.
  const byFamily = new Map<string, BankItem[]>();
  for (const entry of bank.prepared) if (!seen.has(entry.item.family)) byFamily.set(entry.item.family, [...(byFamily.get(entry.item.family) ?? []), entry]);
  const pool = [...byFamily.values()].map(members => members[Math.floor(random() * members.length)]);

  for (const size of [CHECK_POLICY.size, CHECK_POLICY.size + 1]) {
    let best = -1;
    let choices: BankItem[][] = [];
    for (const set of combinations(pool, size)) {
      if (!valid(set)) continue;
      const s = score(set);
      if (s > best) { best = s; choices = [set]; } else if (s === best) choices.push(set);
    }
    if (!choices.length) continue;
    const set = choices[Math.floor(random() * choices.length)];
    // A non-transfer item first, transfers after, open-response last.
    const rank = (e: BankItem) => (e.transfer ? 1 : 0) + (e.openResponse ? 2 : 0);
    return [...set].sort((a, b) => rank(a) - rank(b)).map(entry => ({
      entry,
      variant: entry.item.kind === 'number' ? Math.floor(random() * variantCount(entry.item)) : 0,
    }));
  }
  return null;
}
