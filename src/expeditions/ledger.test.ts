import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { summarize, type Evidence } from './engine/evidence';
import { bestLevel, createExpeditionLedger, EXPEDITION_LEDGER_KEY, getExpeditionEarnedIds, loadExpeditionLedger, markSeen, mergeExpeditionLedgers, parseExpeditionLedger, readExpeditionLedger, recordRun, saveExpeditionLedger } from './ledger';
import { getExpedition } from './registry';

const e10 = getExpedition('evolution-e10')!;
const summary = (level: 'Glimpsed' | 'Familiar' | 'Understood') => ({ level, firstTry: { right: 6, total: 6 }, transfer: { right: 2, total: 2 }, calibration: { sureRight: 6, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: 'Monday' });
const memory = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data }; };
const answers = (assisted: boolean): Evidence[] => [
  ...['mega-predict', 'lineage-steps', 'learned-flaw', 'doubling'].map(gradeId => ({ gradeId, correct: true, confidence: 'certain' as const, assisted, transfer: false, prompt: '', chosen: '', at: 1 })),
  ...['weeds', 'mosquitoes'].map(gradeId => ({ gradeId, correct: true, confidence: 'certain' as const, assisted, transfer: true, prompt: '', chosen: '', at: 1 })),
];

describe('expedition ledger', () => {
  it('lights exactly the expedition leaf, and only for Understood', () => {
    let ledger = createExpeditionLedger();
    expect(getExpeditionEarnedIds(ledger)).toEqual([]);
    ledger = recordRun(ledger, { id: 'run-1', packId: e10.pack.id, summary: summary('Familiar') });
    expect(bestLevel(ledger, e10.pack.id)).toBe('Familiar');
    expect(getExpeditionEarnedIds(ledger)).toEqual([]);
    ledger = recordRun(ledger, { id: 'run-2', packId: e10.pack.id, summary: summary('Understood') });
    expect(getExpeditionEarnedIds(ledger)).toEqual([evolutionTerritoryId('evolution-now')]);
    // A later, weaker run does not take earned land away.
    ledger = recordRun(ledger, { id: 'run-3', packId: e10.pack.id, summary: summary('Glimpsed') });
    expect(bestLevel(ledger, e10.pack.id)).toBe('Understood');
  });

  it('records a run once per run ID and refuses unknown packs', () => {
    const once = recordRun(createExpeditionLedger(), { id: 'same', packId: e10.pack.id, summary: summary('Understood') });
    expect(recordRun(once, { id: 'same', packId: e10.pack.id, summary: summary('Understood') })).toBe(once);
    expect(() => recordRun(once, { id: 'other', packId: 'not-a-pack', summary: summary('Understood') })).toThrow(/Unknown lesson/);
  });

  it('a replay of revealed answers cannot reach Understood', () => {
    expect(summarize(e10.pack, answers(false)).level).toBe('Understood');
    // The player marks every grade seen in an earlier session as assisted.
    expect(summarize(e10.pack, answers(true)).level).not.toBe('Understood');
    const seen = ['weeds', 'mosquitoes'].reduce((ledger, gradeId) => markSeen(ledger, e10.pack.id, gradeId), createExpeditionLedger());
    expect(seen.seen[e10.pack.id]).toEqual(['weeds', 'mosquitoes']);
    expect(markSeen(seen, e10.pack.id, 'weeds')).toBe(seen);
  });

  it('round-trips through storage, keeps unreadable originals, and merges copies', () => {
    const store = memory();
    const ledger = markSeen(recordRun(createExpeditionLedger(), { id: 'a', packId: e10.pack.id, summary: summary('Understood'), at: '2026-10-16T10:00:00.000Z' }), e10.pack.id, 'weeds');
    expect(saveExpeditionLedger(ledger, store)).toBeNull();
    expect(loadExpeditionLedger(store)).toEqual({ data: ledger, warning: null });
    expect(() => parseExpeditionLedger('{"version":2,"runs":[],"seen":{}}')).toThrow();
    expect(() => parseExpeditionLedger(JSON.stringify({ version: 1, runs: [{ id: 'x', packId: e10.pack.id, level: 'Mastered', firstTry: { right: 1, total: 1 }, transfer: { right: 0, total: 0 }, at: '2026-10-16T10:00:00.000Z' }], seen: {} }))).toThrow(/unknown level/);
    store.setItem(EXPEDITION_LEDGER_KEY, 'not json');
    // Frequent reads never write: only the first load keeps a recovery copy.
    expect(readExpeditionLedger(store)).toBeNull();
    expect(store.data.size).toBe(1);
    const broken = loadExpeditionLedger(store);
    expect(broken.data).toEqual(createExpeditionLedger());
    expect(broken.warning).toMatch(/kept as/);
    expect([...store.data.keys()].some(key => key.startsWith(`${EXPEDITION_LEDGER_KEY}.recovery.`))).toBe(true);
    const other = markSeen(recordRun(createExpeditionLedger(), { id: 'b', packId: e10.pack.id, summary: summary('Familiar'), at: '2026-10-16T09:00:00.000Z' }), e10.pack.id, 'mosquitoes');
    const merged = mergeExpeditionLedgers(ledger, other);
    expect(merged.runs.map(run => run.id)).toEqual(['b', 'a']);
    expect(merged.seen[e10.pack.id]).toEqual(['weeds', 'mosquitoes']);
  });
});

describe('missed answers on a run', () => {
  it('are kept for the journal, and malformed ones are dropped rather than failing the record', () => {
    const summary = { level: 'Familiar' as const, firstTry: { right: 3, total: 6 }, transfer: { right: 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [{ gradeId: 'g1', prompt: 'Where?', chosen: 'Here' }] };
    const ledger = recordRun(createExpeditionLedger(), { id: 'r', packId: 'evolution-e10', summary, at: '2026-10-09T10:00:00.000Z' });
    expect(ledger.runs[0].misses).toEqual([{ gradeId: 'g1', prompt: 'Where?', chosen: 'Here' }]);
    const raw = JSON.parse(JSON.stringify(ledger));
    raw.runs[0].misses.push({ gradeId: 7 });
    expect(parseExpeditionLedger(JSON.stringify(raw)).runs[0].misses).toHaveLength(1);
  });
});
