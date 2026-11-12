import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { createExpeditionLedger } from '../expeditions/ledger';
import { CHECK_COLOR_KEY, recordFingerprint, rememberCheckColor, rememberedCheckColor } from './coloredCache';
import { appendCheckEvents, createCheckLedger, type CheckLedger } from './ledger';
import { checkEarnedIds, startCheck } from './progress';
import { at, DAY, T0, takeCheck } from './test-helpers';

const NEW_SPECIES = evolutionTerritoryId('new-species');
const memory = () => { const data = new Map<string, string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }; };
const take = (checks: CheckLedger, day: number, right: boolean) => {
  const { items } = startCheck(NEW_SPECIES, createExpeditionLedger(), checks, T0 + day * DAY, `s${day}`);
  return takeCheck(checks, NEW_SPECIES, `s${day}`, items!, at(day), () => ({ right, confidence: 'certain' }));
};

describe('the remembered check coloring', () => {
  it('knows a record with no finished check colors nothing, without any copy', () => {
    expect(rememberedCheckColor(createCheckLedger(), memory())).toEqual([]);
    const started = appendCheckEvents(createCheckLedger(), [{ t: 'attempt', id: 'a', session: 's', node: NEW_SPECIES, item: 'x', family: 'f', variant: 0, answer: { pick: 'a' }, correct: true, confidence: 'fair', ms: 1, at: at(0) }]);
    expect(rememberedCheckColor(started, memory())).toEqual([]);
  });

  it('is unknown until computed, then returns exactly what the banks computed', () => {
    const store = memory();
    const checks = take(createCheckLedger(), 0, true);
    expect(rememberedCheckColor(checks, store)).toBeNull();
    const computed = checkEarnedIds(checks);
    expect(computed).toEqual([NEW_SPECIES]);
    rememberCheckColor(checks, computed, store);
    expect(rememberedCheckColor(checks, store)).toEqual(computed);
  });

  it('remembers a miss as no color, not as unknown', () => {
    const store = memory();
    const checks = take(createCheckLedger(), 0, false);
    rememberCheckColor(checks, checkEarnedIds(checks), store);
    expect(rememberedCheckColor(checks, store)).toEqual([]);
  });

  it('never trusts a copy from another record, another source, or another version', () => {
    const store = memory();
    const first = take(createCheckLedger(), 0, true);
    rememberCheckColor(first, checkEarnedIds(first), store);
    const later = take(first, 8, false);
    expect(recordFingerprint(later)).not.toBe(recordFingerprint(first));
    expect(rememberedCheckColor(later, store)).toBeNull();
    expect(rememberedCheckColor(first, store, 'another-build')).toBeNull();
    const copy = JSON.parse(store.data.get(CHECK_COLOR_KEY)!);
    store.setItem(CHECK_COLOR_KEY, JSON.stringify({ ...copy, version: 2 }));
    expect(rememberedCheckColor(first, store)).toBeNull();
    store.setItem(CHECK_COLOR_KEY, '{not json');
    expect(rememberedCheckColor(first, store)).toBeNull();
  });

  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const checks = take(createCheckLedger(), 0, true);
    expect(() => rememberCheckColor(checks, [NEW_SPECIES], broken)).not.toThrow();
    expect(rememberedCheckColor(checks, broken)).toBeNull();
  });
});
