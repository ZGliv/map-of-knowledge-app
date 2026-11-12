// Spot checks for the banks written for E08, E09, E11, E12 and the Black Death, and for the
// generators they added. The shared rules (IDs, one answer, supply) live in banks.test.ts.
import { describe, expect, it } from 'vitest';
import { bankFor, preparedBanks } from './banks';
import { checkVariant } from './generators';
import type { NumberItem } from './types';

const entry = (id: string) => preparedBanks().flatMap(b => b.prepared).find(e => e.item.id === id)!;
const numeric = (id: string) => entry(id).item as NumberItem;
const testItem = (generator: string, params: Record<string, unknown>): NumberItem => ({
  id: 'i_test000000', family: 'f_test000000', kind: 'number', generator, claim: 'test claim here', entities: [],
  explain: 'test explanation, long enough', sources: [{ label: 'test source' }], params,
});
/** Each bank meets the how-to's mix: 12+ items, transfers of both kinds, and items on the pack's own scenarios. */
function expectMix(node: string, openTransfers: number) {
  const bank = bankFor(node)!;
  expect(bank, node).toBeTruthy();
  expect(bank.items.length).toBeGreaterThanOrEqual(12);
  expect(bank.prepared.filter(e => e.transfer && e.openResponse).length).toBeGreaterThanOrEqual(openTransfers);
  expect(bank.prepared.filter(e => e.transfer && !e.openResponse).length).toBeGreaterThanOrEqual(4);
  expect(bank.prepared.filter(e => !e.transfer).length).toBeGreaterThanOrEqual(4);
}

// --- anySurvives
describe('anySurvives', () => {
  it('a group survives unless every member is lost', () => {
    const item = testItem('anySurvives', { template: '{p}% each, {k} members', cases: [{ p: 80, k: 3 }, { p: 50, k: 2 }], unit: '%', tolerance: 0.03 });
    expect(checkVariant(item, 0).answer).toBeCloseTo(100 * (1 - 0.8 ** 3), 9); // 48.8
    expect(checkVariant(item, 1).answer).toBeCloseTo(75, 9);
    expect(checkVariant(item, 0).working).toContain('0.512');
    expect(() => checkVariant(testItem('anySurvives', { template: 'x', cases: [{ p: 80, k: 1 }], unit: '%', tolerance: 0 }), 0)).toThrow();
  });
});
// --- end anySurvives

// --- serialShare
describe('serialShare', () => {
  it('compounds the share each founding group keeps', () => {
    const item = testItem('serialShare', { template: '{r}% kept, {k} moves', cases: [{ r: 90, k: 2 }, { r: 95, k: 5 }], unit: '%', tolerance: 0.03 });
    expect(checkVariant(item, 0).answer).toBeCloseTo(81, 9);
    expect(checkVariant(item, 1).answer).toBeCloseTo(100 * 0.95 ** 5, 9);
    expect(() => checkVariant(testItem('serialShare', { template: 'x', cases: [{ r: 100, k: 3 }], unit: '%', tolerance: 0 }), 0)).toThrow();
  });
});
// --- end serialShare

// --- topShare
describe('topShare', () => {
  it('compares the top share with one of the equal shares of the rest', () => {
    const item = testItem('topShare', { template: '{top}% of {males}', cases: [{ top: 80, males: 9 }, { top: 50, males: 2 }], unit: 'times', tolerance: 0.02 });
    expect(checkVariant(item, 0).answer).toBeCloseTo(32, 9); // the other 8 share 20%: 2.5% each
    expect(checkVariant(item, 1).answer).toBeCloseTo(1, 9);
    expect(() => checkVariant(testItem('topShare', { template: 'x', cases: [{ top: 80, males: 1 }], unit: 'times', tolerance: 0 }), 0)).toThrow();
  });
});
// --- end topShare

// --- shareLost
describe('shareLost and speedRatio', () => {
  it('computes the share gone and the speed ratio', () => {
    const lost = testItem('shareLost', { template: '{before} to {after}', cases: [{ before: 200, after: 50 }], unit: '%', tolerance: 0.03 });
    expect(checkVariant(lost, 0).answer).toBeCloseTo(75, 9);
    const speed = testItem('speedRatio', { template: '{d1} {t1} {d2} {t2}', cases: [{ d1: 1000, t1: 2, d2: 100, t2: 4 }], unit: 'times', tolerance: 0.05 });
    expect(checkVariant(speed, 0).answer).toBeCloseTo(20, 9); // 500 a year against 25 a year
    expect(() => checkVariant(testItem('shareLost', { template: 'x', cases: [{ before: 50, after: 60 }], unit: '%', tolerance: 0 }), 0)).toThrow();
  });
});
// --- end shareLost

// --- E08
describe('E08 Transitions and extinctions', () => {
  it('has the mix of items the how-to asks for', () => expectMix('knowledge.science.biology.evolution.transitions-extinctions', 4));
  it('computes genus survival from the species odds', () => {
    expect(checkVariant(numeric('i_cketp2at5e'), 0).answer).toBeCloseTo(48.8, 9);
    expect(checkVariant(numeric('i_cketp2at5e'), 1).answer).toBeCloseTo(100 * (1 - 0.9 ** 4), 9);
  });
  it('counts transfer from the pack text', () => {
    expect(entry('i_6eged2af3e').transfer).toBe(true); // pterosaurs and champsosaurs: never in the pack
    expect(entry('i_fgjmwd6sga').transfer).toBe(false); // the ammonites are in the pack
    expect(entry('i_d6s9gp6hkv').transfer).toBe(false); // the Yucatán impact itself
  });
});
// --- end E08

// --- E09
describe('E09 Human evolution', () => {
  it('has the mix of items the how-to asks for', () => expectMix('knowledge.science.biology.evolution.human-evolution', 3));
  it('computes the numbers the facts imply', () => {
    expect(checkVariant(numeric('i_2vhp50set8'), 0).answer).toBe(640); // mice and chickens, 320 Myr each
    expect(checkVariant(numeric('i_38ysdcx7fb'), 0).answer).toBe(38); // orangutans and humans, 19 Myr each
    expect(checkVariant(numeric('i_w58rtfp1xv'), 0).answer).toBeCloseTo(100 * 0.95 ** 5, 9);
  });
  it('counts transfer from the pack text', () => {
    expect(entry('i_ydyq58ehf1').transfer).toBe(true); // Neanderthals: never in the pack
    expect(entry('i_3hraxppzgw').transfer).toBe(false); // chimpanzees are the pack's own case
  });
});
// --- end E09

// --- E11
describe('E11 Sexual selection', () => {
  it('has the mix of items the how-to asks for', () => expectMix('knowledge.science.biology.evolution.sexual-selection', 3));
  it('computes the lopsided mating share', () => {
    expect(checkVariant(numeric('i_h2nr2a1sk8'), 0).answer).toBeCloseTo(32, 9);
    expect(checkVariant(numeric('i_h2nr2a1sk8'), 1).answer).toBeCloseTo(48, 9);
  });
  it('counts transfer from the pack text', () => {
    expect(entry('i_ww4m1k5yn2').transfer).toBe(true); // fireflies: never in the pack
    expect(entry('i_7ta2rw1sxg').transfer).toBe(false); // Endler's guppies are the pack's own
  });
});
// --- end E11

// --- E12
describe('E12 How we know', () => {
  it('has the mix of items the how-to asks for', () => expectMix('knowledge.science.biology.evolution.how-we-know', 3));
  it('counts transfer from the pack text', () => {
    expect(entry('i_yq7ekttvmp').transfer).toBe(true); // Neptune: never in the pack
    expect(entry('i_rz8w88rx1z').transfer).toBe(false); // Tiktaalik is the pack's own
  });
});
// --- end E12

// --- BD
describe('The Black Death', () => {
  it('has the mix of items the how-to asks for', () => expectMix('knowledge.humanities.history.medieval-world.black-death', 3));
  it('computes the numbers the facts imply', () => {
    expect(checkVariant(numeric('i_2pg7g9fv9y'), 0).answer).toBeCloseTo((100 * 60000) / 110000, 9); // Florence, 1338 to 1351
    expect(checkVariant(numeric('i_3xyvxddbjn'), 0).answer).toBeCloseTo((11100 / 6) / (1100 / 40), 9); // about 67 times
  });
  it('counts transfer from the pack text', () => {
    expect(entry('i_sa7ap4esq8').transfer).toBe(true); // Ragusa: never in the pack
    expect(entry('i_jx46abbpcm').transfer).toBe(false); // Pisa and Florence are the pack's own
  });
});
// --- end BD
