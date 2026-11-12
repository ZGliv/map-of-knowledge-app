import { describe, expect, it } from 'vitest';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import { createExpeditionLedger, EXPEDITION_LEDGER_KEY, getExpeditionEarnedIds, loadExpeditionLedger, recordRun, saveExpeditionLedger } from '../expeditions/ledger';
import type { Summary } from '../expeditions/engine/evidence';
import { appendCheckEvents, CHECK_LEDGER_KEY, createCheckLedger, loadCheckLedger, mergeCheckLedgers, parseCheckLedger, readCheckLedger, saveCheckLedger } from './ledger';
import { checkStatus, dueChecks, earnedNodeIds, nodeLevel, startCheck } from './progress';
import { at, DAY, T0, takeCheck } from './test-helpers';

const NEW_SPECIES = evolutionTerritoryId('new-species');
const EVOLUTION_NOW = evolutionTerritoryId('evolution-now');
const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};
const summary = (level: Summary['level']): Summary => ({ level, firstTry: { right: 5, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '' });
/** Take a check on `node` at `day`, every answer right (or wrong). */
const take = (checks = createCheckLedger(), node: string, day: number, right: boolean, exp = createExpeditionLedger(), id = `s${day}-${right}`) => {
  const { items } = startCheck(node, exp, checks, T0 + day * DAY, id);
  if (!items) throw new Error(`No check ready on day ${day}`);
  return takeCheck(checks, node, id, items, at(day), () => ({ right, confidence: 'certain' }));
};

describe('check ledger: migration from the expedition-only record', () => {
  // The exact shape mok-expeditions-v1 has held since expeditions shipped.
  const legacy = JSON.stringify({ version: 1, runs: [{ id: 'run-1', packId: 'evolution-e10', level: 'Understood', firstTry: { right: 5, total: 6 }, transfer: { right: 2, total: 2 }, at: '2026-10-10T18:00:00.000Z' }], seen: { 'evolution-e10': ['mega-predict', 'doubling'] } });

  it('starts an empty check record beside an existing expedition record, and never rewrites it', () => {
    const store = memory({ [EXPEDITION_LEDGER_KEY]: legacy });
    const { data, warning } = loadCheckLedger(store);
    expect(warning).toBeNull();
    expect(data).toEqual(createCheckLedger());
    const exp = loadExpeditionLedger(store).data;
    const checks = take(data, NEW_SPECIES, 0, true, exp);
    expect(saveCheckLedger(checks, store)).toBeNull();
    expect(store.data.get(EXPEDITION_LEDGER_KEY)).toBe(legacy);
    expect(readCheckLedger(store)?.events.length).toBe(checks.events.length);
  });

  it('counts an Understood run recorded before checks existed as the start of the Lasting clock', () => {
    const exp = loadExpeditionLedger(memory({ [EXPEDITION_LEDGER_KEY]: legacy })).data;
    const status = checkStatus(EVOLUTION_NOW, exp, createCheckLedger(), Date.parse('2026-10-12T00:00:00.000Z'));
    expect(status).toEqual({ kind: 'waiting', dueAt: '2026-10-17T18:00:00.000Z' });
    expect(nodeLevel(EVOLUTION_NOW, exp, createCheckLedger())).toBe('Understood');
  });

  it('keeps an unreadable check record under a recovery key instead of losing it', () => {
    const store = memory({ [CHECK_LEDGER_KEY]: '{not json' });
    const { data, warning } = loadCheckLedger(store);
    expect(data.events).toEqual([]);
    expect(warning).toMatch(/kept as mok-checks-v1\.recovery\./);
    expect(saveCheckLedger(take(data, NEW_SPECIES, 0, true), store)).toBeNull();
    const copies = [...store.data.entries()].filter(([k]) => k.startsWith(`${CHECK_LEDGER_KEY}.recovery.`));
    expect(copies.length).toBeGreaterThan(0);
    expect(copies.every(([, v]) => v === '{not json')).toBe(true);
  });

  it('round-trips events of kinds a newer build might add', () => {
    const future = JSON.stringify({ version: 1, events: [{ t: 'calibration', id: 'c1', at: '2026-10-20T00:00:00.000Z', note: 'held-out' }] });
    const parsed = parseCheckLedger(future);
    expect(parsed.other).toHaveLength(1);
    const again = parseCheckLedger(JSON.stringify(take(parsed, NEW_SPECIES, 0, true)));
    expect(again.other).toEqual([{ t: 'calibration', id: 'c1', at: '2026-10-20T00:00:00.000Z', note: 'held-out' }]);
  });

  it('is append-only: repeated writes change nothing, and two copies merge without loss', () => {
    const a = take(createCheckLedger(), NEW_SPECIES, 0, false);
    expect(appendCheckEvents(a, a.events)).toBe(a);
    const b = take(createCheckLedger(), EVOLUTION_NOW, 0, true);
    const merged = mergeCheckLedgers(a, b);
    expect(merged.events.length).toBe(a.events.length + b.events.length);
    expect(mergeCheckLedgers(merged, a)).toEqual(merged);
  });
});

describe('evidence: what a check does to the map', () => {
  it('colors the node’s land on a pass, by the same list expeditions use', () => {
    const exp = createExpeditionLedger();
    expect(earnedNodeIds(exp, createCheckLedger())).toEqual([]);
    const checks = take(createCheckLedger(), NEW_SPECIES, 0, true);
    expect(earnedNodeIds(exp, checks)).toEqual([NEW_SPECIES]);
    expect(nodeLevel(NEW_SPECIES, exp, checks)).toBe('Understood');
  });

  it('never removes land on a fail, whether it came from an expedition or an earlier check', () => {
    const exp = recordRun(createExpeditionLedger(), { id: 'r1', packId: 'evolution-e10', summary: summary('Understood'), at: at(0) });
    // Due a week later, missed: the expedition's land stays.
    let checks = take(createCheckLedger(), EVOLUTION_NOW, 8, false, exp);
    expect(earnedNodeIds(exp, checks)).toEqual(getExpeditionEarnedIds(exp));
    expect(nodeLevel(EVOLUTION_NOW, exp, checks)).toBe('Understood');
    // Proved by a check, then a later check missed: still colored.
    checks = take(createCheckLedger(), NEW_SPECIES, 0, true);
    checks = take(checks, NEW_SPECIES, 9, false);
    expect(earnedNodeIds(createExpeditionLedger(), checks)).toEqual([NEW_SPECIES]);
  });

  it('leaves an unproved node uncolored after a fail, opens a retry two days later, and suggests the expedition meanwhile', () => {
    const exp = createExpeditionLedger();
    const checks = take(createCheckLedger(), NEW_SPECIES, 0, false);
    expect(earnedNodeIds(exp, checks)).toEqual([]);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 1.9 * DAY)).toEqual({ kind: 'cooling', readyAt: at(2), purpose: 'prove' });
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 2 * DAY)).toMatchObject({ kind: 'ready', purpose: 'prove' });
    // An Understood expedition run in the meantime colors the land and starts the Lasting clock.
    const played = recordRun(exp, { id: 'r2', packId: 'evolution-e05', summary: summary('Understood'), at: at(1) });
    expect(earnedNodeIds(played, checks)).toEqual([NEW_SPECIES]);
    expect(checkStatus(NEW_SPECIES, played, checks, T0 + 2 * DAY)).toEqual({ kind: 'waiting', dueAt: at(8) });
  });
});

describe('Lasting: a pass at least 7 days after the first proof', () => {
  it('waits seven days, then comes due, then marks the node Lasting', () => {
    const exp = createExpeditionLedger();
    let checks = take(createCheckLedger(), NEW_SPECIES, 0, true);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 6.99 * DAY)).toEqual({ kind: 'waiting', dueAt: at(7) });
    expect(dueChecks(EVOLUTION_ID, exp, checks, T0 + 6.99 * DAY)).toEqual([]);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 7 * DAY)).toMatchObject({ kind: 'ready', purpose: 'lasting' });
    expect(dueChecks(EVOLUTION_ID, exp, checks, T0 + 7 * DAY)).toEqual([NEW_SPECIES]);
    expect(dueChecks('knowledge', exp, checks, T0 + 7 * DAY)).toEqual([NEW_SPECIES]);
    expect(dueChecks('knowledge.science.physics', exp, checks, T0 + 7 * DAY)).toEqual([]);
    checks = take(checks, NEW_SPECIES, 7, true);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 7 * DAY)).toEqual({ kind: 'lasting', at: at(7), refreshAt: at(28) });
    expect(nodeLevel(NEW_SPECIES, exp, checks)).toBe('Lasting');
    expect(dueChecks(EVOLUTION_ID, exp, checks, T0 + 27 * DAY)).toEqual([]);
    // Lasting stays Lasting; three weeks on, the place is ready to refresh (checks/freshness.ts).
    expect(dueChecks(EVOLUTION_ID, exp, checks, T0 + 28 * DAY)).toEqual([NEW_SPECIES]);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 28 * DAY)).toMatchObject({ kind: 'ready', purpose: 'refresh' });
  });

  it('starts the clock from an Understood expedition run, and a missed Lasting check can be retried', () => {
    const exp = recordRun(createExpeditionLedger(), { id: 'r1', packId: 'evolution-e05', summary: summary('Understood'), at: at(0) });
    expect(checkStatus(NEW_SPECIES, exp, createCheckLedger(), T0 + 3 * DAY)).toEqual({ kind: 'waiting', dueAt: at(7) });
    let checks = take(createCheckLedger(), NEW_SPECIES, 7.5, false, exp);
    expect(checkStatus(NEW_SPECIES, exp, checks, T0 + 8 * DAY)).toEqual({ kind: 'cooling', readyAt: at(9.5), purpose: 'lasting' });
    checks = take(checks, NEW_SPECIES, 10, true, exp);
    expect(nodeLevel(NEW_SPECIES, exp, checks)).toBe('Lasting');
  });

  it('doesn’t count a second pass on the same day as Lasting', () => {
    let checks = take(createCheckLedger(), NEW_SPECIES, 0, true);
    // Not offered while waiting; even if two tabs finished checks, a same-week pass is not Lasting.
    checks = takeCheckAnyway(checks, 3);
    expect(nodeLevel(NEW_SPECIES, createExpeditionLedger(), checks)).toBe('Understood');
  });
});

function takeCheckAnyway(checks: ReturnType<typeof createCheckLedger>, day: number) {
  // Draw directly, bypassing the status gate, as a second tab could.
  const { items } = startCheck(NEW_SPECIES, createExpeditionLedger(), createCheckLedger(), T0, 'other-tab');
  return takeCheck(checks, NEW_SPECIES, 'other-tab', items!, at(day));
}

it('keeps the expedition record’s own save path working beside checks', () => {
  const store = memory();
  const exp = recordRun(createExpeditionLedger(), { id: 'r', packId: 'evolution-e10', summary: summary('Understood'), at: at(0) });
  expect(saveExpeditionLedger(exp, store)).toBeNull();
  expect(saveCheckLedger(take(createCheckLedger(), NEW_SPECIES, 0, true), store)).toBeNull();
  expect(loadExpeditionLedger(store).data).toEqual(exp);
});
