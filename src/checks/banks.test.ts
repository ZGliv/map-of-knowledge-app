import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { gradesOf } from '../expeditions/engine/evidence';
import { getExpedition } from '../expeditions/registry';
import { BANKS, bankFor, itemText, mentions, packText, preparedBanks } from './banks';
import { drawCheck } from './draw';
import { checkVariant, numbersIn, variantCount } from './generators';
import { grade } from './grade';
import { canPass } from './rule';
import { rightAnswer, wrongAnswer } from './test-helpers';
import type { CheckItem, NumberItem } from './types';

// Plan §8.2: opaque IDs, 10 Crockford base32 characters after the family letter.
const ITEM_RE = /^i_[0-9a-hjkmnp-tv-z]{10}$/;
const FAMILY_RE = /^f_[0-9a-hjkmnp-tv-z]{10}$/;
const all = BANKS.flatMap(bank => bank.items.map(item => ({ bank, item })));
const label = ({ bank, item }: { bank: { node: string }; item: CheckItem }) => `${bank.node.split('.').at(-1)} ${item.id}`;

describe('check bank: identity', () => {
  it('gives every item and family an opaque ID, items unique across banks', () => {
    for (const { item } of all) {
      expect(item.id, item.id).toMatch(ITEM_RE);
      expect(item.family, item.id).toMatch(FAMILY_RE);
    }
    expect(new Set(all.map(({ item }) => item.id)).size).toBe(all.length);
  });

  it('never shares a family between banks', () => {
    const owner = new Map<string, string>();
    for (const bank of BANKS) for (const family of [...Object.values(bank.expeditionFamilies), ...bank.items.map(i => i.family)]) {
      if (owner.has(family)) expect(owner.get(family), family).toBe(bank.node);
      owner.set(family, bank.node);
    }
  });

  it('places each bank on its expedition’s own atlas leaf and maps every graded beat to a family', () => {
    for (const bank of BANKS) {
      const expedition = getExpedition(bank.pack)!;
      expect(expedition, bank.pack).toBeTruthy();
      expect(bank.node).toBe(expedition.nodeId);
      expect(catalog.get(bank.node)?.name).toBe(bank.title);
      expect(Object.keys(bank.expeditionFamilies).sort()).toEqual(gradesOf(expedition.pack).map(g => g.gradeId).sort());
      const families = Object.values(bank.expeditionFamilies);
      expect(new Set(families).size).toBe(families.length);
      families.forEach(f => expect(f).toMatch(FAMILY_RE));
      expect(bank.claim.length).toBeGreaterThan(20);
    }
  });

  it('keeps each fresh family to one item; only expedition families may be reused, and then only as variants', () => {
    for (const bank of BANKS) {
      const expedition = new Set(Object.values(bank.expeditionFamilies));
      const counts = new Map<string, number>();
      for (const item of bank.items) counts.set(item.family, (counts.get(item.family) ?? 0) + 1);
      for (const [family, n] of counts) if (!expedition.has(family)) expect(n, family).toBe(1);
    }
  });
});

describe('check bank: exactly one defensible answer per item', () => {
  it.each(all.map(entry => [label(entry), entry.item] as const))('%s', (_, item) => {
    expect(item.claim.length).toBeGreaterThan(15);
    expect(item.explain.length).toBeGreaterThan(30);
    expect(item.sources.length).toBeGreaterThan(0);
    for (const source of item.sources) {
      expect(source.label.length).toBeGreaterThan(5);
      if (source.url) expect(source.url).toMatch(/^https:\/\//);
    }
    switch (item.kind) {
      case 'choice': {
        expect(item.options.length).toBeGreaterThanOrEqual(4);
        expect(new Set(item.options.map(o => o.id)).size).toBe(item.options.length);
        expect(new Set(item.options.map(o => o.label.toLowerCase())).size).toBe(item.options.length);
        expect(item.options.filter(o => o.id === item.answer)).toHaveLength(1);
        // The keyed answer is never also tagged as a misconception.
        expect(item.options.find(o => o.id === item.answer)!.misconception).toBeUndefined();
        for (const o of item.options) if (o.misconception) {
          expect(o.misconception).toMatch(/^(evo#\d+|[a-z]+:[a-z-]+)$/);
          // evo#N names a row of appendix-evolution.md §2, which has 33.
          if (o.misconception.startsWith('evo#')) expect(Number(o.misconception.slice(4))).toBeGreaterThanOrEqual(1);
          if (o.misconception.startsWith('evo#')) expect(Number(o.misconception.slice(4))).toBeLessThanOrEqual(33);
        }
        break;
      }
      case 'flaw':
        expect(item.steps.length).toBeGreaterThanOrEqual(4);
        expect(new Set(item.steps.map(s => s.id)).size).toBe(item.steps.length);
        expect(item.steps.filter(s => s.id === item.answer)).toHaveLength(1);
        // The broken step is never the first: the chain starts from something true.
        expect(item.steps[0].id).not.toBe(item.answer);
        break;
      case 'order':
        expect(item.items.length).toBeGreaterThanOrEqual(4);
        expect([...item.answer].sort()).toEqual(item.items.map(i => i.id).sort());
        expect(new Set(item.items.map(i => i.label)).size).toBe(item.items.length);
        break;
      case 'match': {
        const left = item.left.map(l => l.id), right = item.right.map(r => r.id);
        expect(new Set(left).size).toBe(left.length);
        expect(new Set(right).size).toBe(right.length);
        expect(Object.keys(item.pairs).sort()).toEqual([...left].sort());
        for (const target of Object.values(item.pairs)) expect(right).toContain(target);
        if (item.buckets) for (const r of right) expect(Object.values(item.pairs), `bucket ${r} unused`).toContain(r);
        else {
          expect(right.length).toBe(left.length);
          expect(new Set(Object.values(item.pairs)).size).toBe(left.length);
        }
        break;
      }
      case 'number':
        // No hand-typed answers anywhere in a numeric item's data.
        expect(JSON.stringify(item.params)).not.toMatch(/"answer"/);
        break;
    }
    // The key is right; a different answer is wrong.
    expect(grade(item, rightAnswer(item))).toBe(true);
    expect(grade(item, wrongAnswer(item))).toBe(false);
  });
});

describe('check bank: numbers are computed by code', () => {
  const numeric = all.filter((e): e is { bank: typeof e.bank; item: NumberItem } => e.item.kind === 'number');

  it('has numeric items, each with a generator, finite answers and a filled prompt', () => {
    expect(numeric.length).toBeGreaterThanOrEqual(5);
    for (const { item } of numeric) for (let n = 0; n < variantCount(item); n++) {
      const v = checkVariant(item, n);
      expect(Number.isFinite(v.answer) && v.answer > 0, item.id).toBe(true);
      expect(v.prompt, item.id).not.toMatch(/\{\w+\}/);
      expect(v.tolerance).toBeGreaterThan(0);
      // Plan §2.4: a key that is printed in the question is copying, not knowing.
      expect(numbersIn(v.prompt), `${item.id} variant ${n} shows its own answer`).not.toContain(Number(v.answer.toFixed(v.digits)));
    }
  });

  it('computes the answers the physics, music and evolution facts imply', () => {
    const byId = (id: string) => numeric.find(e => e.item.id === id)!.item;
    expect(checkVariant(byId('i_jv7h9nz2fy'), 0).answer).toBeCloseTo(1.85 * 16, 9); // Mercury, 4 s
    expect(checkVariant(byId('i_0z7w8pseqb'), 0).answer).toBeCloseTo(Math.sqrt(2 * 44.1 / 9.81), 9); // ≈ 3.0 s
    expect(checkVariant(byId('i_h9fsd6gt2a'), 0).answer).toBe(35); // gap 4 = 7 × 5 cm
    expect(checkVariant(byId('i_354zh0vfj0'), 0).answer).toBe(221); // 13- and 17-year broods
    expect(checkVariant(byId('i_zqqqypr7s2'), 0).answer).toBe(30); // 30,000,000 ÷ (1,000 × 1,000)
    expect(checkVariant(byId('i_pb88307h0h'), 0).answer).toBe(384); // a fifth above 256 Hz
    expect(checkVariant(byId('i_ndzwbsshz5'), 0).answer).toBe(300); // 200 Hz × 600/400
    expect(checkVariant(byId('i_2e4p5pg27a'), 0).answer).toBe(64); // 30-minute doublings for 3 hours
  });
});

describe('check bank: transfer is computed from entities', () => {
  it('lists only entities that appear in the item’s own text', () => {
    for (const { item } of all) for (const entity of item.entities) expect(mentions(itemText(item), entity), `${item.id}: ${entity}`).toBe(true);
  });

  it('marks an item transfer exactly when none of its entities appears in the expedition', () => {
    for (const bank of preparedBanks()) {
      const text = packText(bank.pack);
      for (const entry of bank.prepared) {
        const inPack = entry.item.entities.some(entity => mentions(text, entity));
        expect(entry.transfer, entry.item.id).toBe(entry.item.entities.length > 0 && !inPack);
      }
    }
    // Spot checks against what each item is about.
    const transfer = (id: string) => preparedBanks().flatMap(b => b.prepared).find(e => e.item.id === id)!.transfer;
    expect(transfer('i_evey01tej5')).toBe(true); // Lake Victoria cichlids: never in the salamander pack
    expect(transfer('i_5b8p4z9pfj')).toBe(false); // the Ensatina ring itself
    expect(transfer('i_fpwrj3d0fk')).toBe(false); // the MEGA-plate again
  });
});

describe('check bank: enough for retries and the Lasting check', () => {
  it.each(BANKS.map(bank => [bank.node.split('.').at(-1)!, bank] as const))('%s has 8+ items in 3+ families and 3+ kinds', (_, bank) => {
    const prepared = bankFor(bank.node)!.prepared;
    expect(bank.items.length).toBeGreaterThanOrEqual(8);
    expect(new Set(bank.items.map(i => i.family)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(bank.items.map(i => i.kind)).size).toBeGreaterThanOrEqual(3);
    expect(prepared.filter(e => e.transfer).length).toBeGreaterThanOrEqual(5);
    expect(prepared.filter(e => e.transfer && e.openResponse).length).toBeGreaterThanOrEqual(2);
  });

  it.each(BANKS.map(bank => [bank.node.split('.').at(-1)!, bank] as const))('%s supports three checks in a row after the expedition, and for a learner who skipped it', (_, bank) => {
    const prepared = bankFor(bank.node)!;
    for (const start of [new Set(Object.values(bank.expeditionFamilies)), new Set<string>()]) {
      const seen = new Set(start);
      for (let round = 0; round < 3; round++) {
        const drawn = drawCheck(prepared, seen, `supply-${round}`);
        expect(drawn, `round ${round}`).not.toBeNull();
        expect(drawn!.length).toBeGreaterThanOrEqual(3);
        expect(drawn!.length).toBeLessThanOrEqual(4);
        expect(canPass(drawn!.map(d => d.entry))).toBe(true);
        for (const d of drawn!) { expect(seen.has(d.entry.item.family)).toBe(false); seen.add(d.entry.item.family); }
      }
    }
  });
});
