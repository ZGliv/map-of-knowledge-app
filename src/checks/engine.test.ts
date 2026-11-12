import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { createExpeditionLedger, markSeen, recordRun } from '../expeditions/ledger';
import { bankFor } from './banks';
import { drawCheck } from './draw';
import { createCheckLedger } from './ledger';
import { checkStatus, seenFamilies, startCheck } from './progress';
import { canPass, judge, type JudgedAttempt } from './rule';
import { T0, takeCheck, at } from './test-helpers';

const NEW_SPECIES = evolutionTerritoryId('new-species');
const bank = bankFor(NEW_SPECIES)!;

describe('family exclusion', () => {
  it('never draws a family the learner answered in the expedition', () => {
    let exp = createExpeditionLedger();
    for (const gradeId of Object.keys(bank.expeditionFamilies)) exp = markSeen(exp, bank.pack, gradeId);
    const seen = seenFamilies(exp, createCheckLedger());
    expect([...seen].sort()).toEqual(Object.values(bank.expeditionFamilies).sort());
    for (let i = 0; i < 40; i++) {
      const drawn = drawCheck(bank, seen, `seed-${i}`)!;
      for (const d of drawn) expect(seen.has(d.entry.item.family)).toBe(false);
    }
  });

  it('draws an expedition-family variant only for a learner who never saw that grade', () => {
    const e10 = bankFor(evolutionTerritoryId('evolution-now'))!;
    const doubling = e10.expeditionFamilies.doubling;
    const variantItem = e10.items.find(item => item.family === doubling)!;
    expect(variantItem).toBeTruthy();
    const seenDoubling = seenFamilies(markSeen(createExpeditionLedger(), e10.pack, 'doubling'), createCheckLedger());
    for (let i = 0; i < 60; i++) expect(drawCheck(e10, seenDoubling, `s${i}`)!.some(d => d.entry.item.id === variantItem.id)).toBe(false);
    const draws = Array.from({ length: 60 }, (_, i) => drawCheck(e10, new Set(), `s${i}`)!);
    expect(draws.some(d => d.some(x => x.entry.item.id === variantItem.id))).toBe(true);
  });

  it('gives a retry only families the first check didn’t use, even half-answered ones', () => {
    const exp = createExpeditionLedger();
    let checks = createCheckLedger();
    const first = startCheck(NEW_SPECIES, exp, checks, T0, 'first').items!;
    checks = takeCheck(checks, NEW_SPECIES, 'first', first, at(0), () => ({ right: false, confidence: 'fair' }));
    const used = new Set(first.map(d => d.entry.item.family));
    // After the cooldown, the retry is entirely fresh.
    const retry = startCheck(NEW_SPECIES, exp, checks, T0 + 3 * 864e5, 'retry').items!;
    for (const d of retry) expect(used.has(d.entry.item.family)).toBe(false);
  });

  it('returns nothing once every family is used up', () => {
    const all = new Set(bank.items.map(item => item.family));
    expect(drawCheck(bank, all, 'x')).toBeNull();
  });

  it('is repeatable from its session ID and varies across sessions', () => {
    const ids = (seed: string) => drawCheck(bank, new Set(), seed)!.map(d => d.entry.item.id).join();
    expect(ids('abc')).toBe(ids('abc'));
    expect(new Set(Array.from({ length: 30 }, (_, i) => ids(`v${i}`))).size).toBeGreaterThan(1);
  });

  it('always includes a transfer, never pairs two items about the same thing, and can be passed', () => {
    for (let i = 0; i < 40; i++) {
      const drawn = drawCheck(bank, new Set(), `c${i}`)!;
      expect(drawn.some(d => d.entry.transfer)).toBe(true);
      const keys = drawn.flatMap(d => d.entry.keys);
      expect(new Set(keys).size).toBe(keys.length);
      expect(canPass(drawn.map(d => d.entry))).toBe(true);
    }
  });
});

describe('the evidence rule (plan §2.4)', () => {
  const OR_T = { transfer: true, guessP: 0.01 }, MC_T = { transfer: true, guessP: 0.25 }, C = { transfer: false, guessP: 0.25 };
  const a = (item: { transfer: boolean; guessP: number }, correct: boolean, confidence: JudgedAttempt['confidence'] = 'certain', misconception?: string): JudgedAttempt => ({ ...item, correct, confidence, misconception });

  it('passes three right answers given with confidence', () => {
    expect(judge([a(C, true), a(MC_T, true, 'fair'), a(OR_T, true)])).toEqual({ passed: true, reasons: [] });
  });
  it('fails when any transfer item is missed', () => {
    expect(judge([a(C, true), a(MC_T, false), a(OR_T, true)]).reasons).toContain('transfer-missed');
  });
  it('fails when too few of the other items are right', () => {
    expect(judge([a(C, false), a(MC_T, true), a(OR_T, true)]).reasons).toContain('too-many-missed');
  });
  it('doesn’t count right answers marked as guesses', () => {
    // Without the open-response item's 0.01, two multiple-choice items can't beat the 0.005 guess cap.
    expect(judge([a(C, true), a(MC_T, true), a(OR_T, true, 'guess')])).toEqual({ passed: false, reasons: ['guessed'] });
  });
  it('blocks a pass after a certain pick of a misconception', () => {
    const verdict = judge([a(C, false, 'certain', 'evo#2'), a(MC_T, true), a(OR_T, true), a(C, true), a(C, true)]);
    expect(verdict.passed).toBe(false);
    expect(verdict.reasons).toContain('sure-misconception');
  });
  it('needs at least one open-response item or four multiple-choice items to be passable', () => {
    expect(canPass([C, MC_T, MC_T])).toBe(false);
    expect(canPass([C, MC_T, MC_T, C])).toBe(true);
    expect(canPass([C, MC_T, OR_T])).toBe(true);
    expect(canPass([C, C, OR_T].map(x => ({ ...x, transfer: false })))).toBe(false);
  });
});

describe('a check from start to finish', () => {
  it('records each answer and lets a full right check pass', () => {
    const exp = recordRun(createExpeditionLedger(), { id: 'r', packId: bank.pack, summary: { level: 'Familiar', firstTry: { right: 3, total: 6 }, transfer: { right: 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '' }, at: at(0) });
    const { status, items } = startCheck(NEW_SPECIES, exp, createCheckLedger(), T0, 's1');
    expect(status).toMatchObject({ kind: 'ready', purpose: 'prove' });
    const checks = takeCheck(createCheckLedger(), NEW_SPECIES, 's1', items!, at(0));
    expect(checks.events.filter(e => e.t === 'attempt')).toHaveLength(items!.length);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 1000).kind).toBe('waiting');
  });
});
