import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { casesFor } from '../cases';
import { runCase, wins } from '../cases/engines';
import type { CaseAnswer, PlaceCase } from '../cases/types';
import { createExpeditionLedger, type ExpeditionLedger } from '../expeditions/ledger';
import { catalog } from '../core/catalog';
import { createLearner } from '../core/learner';
import { buildHub } from '../hub/hubModel';
import { breakBefore, freshnessFrom, REFRESH_DAYS, welcomeBackSet } from './freshness';
import { appendCheckEvents, createCheckLedger, loadCheckLedger, parseCheckLedger, saveCheckLedger, type CaseEvent, type CheckLedger } from './ledger';
import { caseClosesRun, checkEarnedIds, checkSessions, checkStatus, dueChecks, earnedNodeIds, freshnessByNode, nextCaseAt, nextCaseOf, nodeProgress, welcomeBack, welcomeVisit } from './progress';
import { isWithinTerritory } from '../core/explorationContext';
import { nextStepFor } from '../hub/hubModel';
import { journalContent } from '../notebook/journalContent';
import { otherActivity } from '../core/activity';
import type { CheckAnswer } from './types';
import { recordRun } from '../expeditions/ledger';
import { CHECK_POLICY } from './rule';
import { EXPEDITIONS } from '../expeditions/registry';
import { GENERATED_PLACES } from '../places/generated';
import { bankFor } from './banks';
import { createReelShelf } from '../explore/pins';
import { createLibraryStore } from '../notebook/libraryStore';
import { buildJournal } from '../notebook/journal';

// Keeping what you learn: color is permanent, a separate glow dims, and refreshes fall due at 7, 21,
// 60 and then every 180 days after the last successful proof. Every clock here is injected.
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-03-02T15:00:00.000Z');
const at = (day: number) => new Date(T0 + day * DAY).toISOString();
const exp = createExpeditionLedger();
const place = (key: string) => evolutionTerritoryId(key);
const DRIFT = place('chance-drift');

/** A call that wins (or loses) a case, found by asking the engine, never typed. */
function callFor(c: PlaceCase, right: boolean): CaseAnswer {
  const truth = runCase(c).truth;
  if (c.call.kind === 'pick' && c.call.multi && truth.kind === 'pick') return { picks: right ? truth.win : [c.call.options.find(o => !truth.win.includes(o.id))!.id] };
  if (c.call.kind === 'pick') return { pick: c.call.options.find(o => wins(c.call, truth, { pick: o.id }) === right)!.id };
  const { min, max, step } = c.call;
  for (let v = min; v <= max + 1e-9; v += step) if (wins(c.call, truth, { value: v }) === right) {
    if (right || Math.abs(v - (truth.kind === 'set' ? truth.value : 0)) > c.call.tolerance * 2) return { value: v };
  }
  throw new Error(`no ${right ? 'winning' : 'losing'} call for ${c.id}`);
}
/** Play the place's next unplayed case on `day`. */
function play(checks: CheckLedger, nodeId: string, day: number, right = true): CheckLedger {
  const played = new Set(checks.events.flatMap(e => e.t === 'case' ? [e.case] : []));
  const c = casesFor(nodeId).find(x => !played.has(x.id))!;
  const id = `${c.id}@${day}`;
  const event: CaseEvent = { t: 'case', id, session: id, node: nodeId, case: c.id, answer: callFor(c, right), success: right, via: 'mission', ms: 900, at: at(day) };
  return appendCheckEvents(checks, [event]);
}

describe('the refresh ladder', () => {
  it('falls due 7, 21, 60 and then every 180 days after the last successful proof', () => {
    expect(REFRESH_DAYS).toEqual([7, 21, 60, 180]);
    const proofs = [at(0), at(7), at(28), at(88), at(268), at(448)];
    const f = freshnessFrom(proofs, T0 + 450 * DAY)!;
    expect(f.refreshes).toBe(5);
    expect(f.refreshTimes).toEqual(proofs.slice(1));
    expect(f.dueAt).toBe(at(448 + 180));
    expect(f.ready).toBe(false);
  });

  it('dims the glow from 1 to 0 across the interval, then holds at 0 while ready', () => {
    const glowOn = (day: number) => freshnessFrom([at(0)], T0 + day * DAY)!;
    expect(glowOn(0).glow).toBe(1);
    expect(glowOn(3).glow).toBeGreaterThan(glowOn(6).glow);
    expect(glowOn(6).glow).toBeGreaterThan(0);
    expect(glowOn(7)).toMatchObject({ glow: 0, ready: true, dueAt: at(7) });
    expect(glowOn(400)).toMatchObject({ glow: 0, ready: true, refreshes: 0 });
  });

  it('an early proof neither advances nor resets the ladder', () => {
    expect(freshnessFrom([at(0), at(2), at(5)], T0 + 6 * DAY)).toMatchObject({ refreshes: 0, lastAt: at(0), dueAt: at(7) });
    expect(freshnessFrom([at(0), at(8), at(10)], T0 + 11 * DAY)).toMatchObject({ refreshes: 1, lastAt: at(8), dueAt: at(29) });
  });

  it('is null before the first proof and ignores duplicates and junk', () => {
    expect(freshnessFrom([], T0)).toBeNull();
    expect(freshnessFrom(['not a date', at(0), at(0)], T0 + DAY)).toMatchObject({ refreshes: 0, litAt: at(0) });
  });
});

describe('ready to refresh, on the real record', () => {
  // Lit by a new case on day 0, Lasting from a second on day 8 (the ladder's first rung).
  const lasting = play(play(createCheckLedger(), DRIFT, 0), DRIFT, 8);

  it('the first refresh is exactly Lasting, and until the next one falls due the place stays Lasting', () => {
    const p = nodeProgress(DRIFT, exp, lasting, undefined, T0 + 10 * DAY);
    expect(p.level).toBe('Lasting');
    expect(p.freshness).toMatchObject({ refreshes: 1, lastAt: p.lastingAt, dueAt: at(8 + 21), ready: false });
    expect(checkStatus(DRIFT, exp, lasting, T0 + 10 * DAY)).toEqual({ kind: 'lasting', at: at(8), refreshAt: at(29) });
  });

  it('when the refresh falls due the place is ready to refresh with an unused case, and it never loses its color', () => {
    const now = T0 + 29 * DAY;
    expect(checkStatus(DRIFT, exp, lasting, now)).toEqual({ kind: 'ready', purpose: 'refresh', via: 'case' });
    expect(dueChecks('knowledge.science.biology.evolution', exp, lasting, now)).toContain(DRIFT);
    for (const day of [29, 90, 400, 4000]) {
      expect(checkEarnedIds(lasting)).toContain(DRIFT);
      expect(nodeProgress(DRIFT, exp, lasting, undefined, T0 + day * DAY).level).toBe('Lasting');
    }
  });

  it('one new case re-lights the glow and moves the ladder on', () => {
    const refreshed = play(lasting, DRIFT, 30);
    const p = nodeProgress(DRIFT, exp, refreshed, undefined, T0 + 30 * DAY);
    expect(p.freshness).toMatchObject({ refreshes: 2, glow: 1, ready: false, dueAt: at(30 + 60) });
    expect(checkStatus(DRIFT, exp, refreshed, T0 + 31 * DAY)).toMatchObject({ kind: 'lasting', refreshAt: at(90) });
    expect(freshnessByNode(exp, refreshed, T0 + 60 * DAY).get(DRIFT)!.glow).toBeCloseTo(Math.sqrt(0.5), 2);
  });

  it('a missed refresh changes nothing but the wait: color, level and ladder stay', () => {
    const missed = play(lasting, DRIFT, 30, false);
    const p = nodeProgress(DRIFT, exp, missed, undefined, T0 + 30 * DAY);
    expect(p).toMatchObject({ level: 'Lasting', lastingAt: at(8) });
    expect(p.freshness).toMatchObject({ refreshes: 1, dueAt: at(29) });
    expect(checkStatus(DRIFT, exp, missed, T0 + 31 * DAY)).toMatchObject({ kind: 'cooling', purpose: 'refresh' });
    expect(checkStatus(DRIFT, exp, missed, T0 + 32 * DAY)).toMatchObject({ kind: 'ready', purpose: 'refresh' });
    expect(checkEarnedIds(missed)).toContain(DRIFT);
  });

  it('with every case spent the refresh falls back to the question bank', () => {
    let checks = lasting;
    while (casesFor(DRIFT).some(c => !checks.events.some(e => e.t === 'case' && e.case === c.id))) checks = play(checks, DRIFT, 30);
    expect(checkStatus(DRIFT, exp, checks, T0 + 200 * DAY)).toMatchObject({ kind: 'ready', purpose: 'refresh', via: 'questions' });
  });

  it('a replayed expedition never refreshes: it has been seen before', () => {
    const runs: ExpeditionLedger = { ...exp, runs: [
      { id: 'r1', packId: 'evolution-e04', level: 'Understood', firstTry: { right: 5, total: 6 }, transfer: { right: 2, total: 2 }, at: at(0) },
      { id: 'r2', packId: 'evolution-e04', level: 'Understood', firstTry: { right: 6, total: 6 }, transfer: { right: 2, total: 2 }, at: at(9) },
    ] };
    expect(nodeProgress(DRIFT, runs, createCheckLedger(), undefined, T0 + 10 * DAY).freshness).toMatchObject({ refreshes: 0, ready: true });
  });
});

describe('welcome back', () => {
  const FOUR = ['chance-drift', 'tree-thinking', 'variation-heredity', 'new-species'].map(place);
  // Four places lit on days 0 to 3, then nothing for weeks.
  const record = FOUR.reduce((checks, nodeId, i) => play(checks, nodeId, i), createCheckLedger());
  const scope = 'knowledge.science.biology.evolution';

  it('finds a break of 14 days or more before this visit, and only then', () => {
    expect(breakBefore([at(0), at(3)], T0 + 17 * DAY)).toMatchObject({ lastSeen: at(3) });
    expect(breakBefore([at(0), at(3)], T0 + 16 * DAY)).toBeNull();
    expect(breakBefore([], T0)).toBeNull();
    // Activity earlier in this visit keeps the welcome for the rest of it.
    expect(breakBefore([at(3), new Date(T0 + 30 * DAY - 3600_000).toISOString()], T0 + 30 * DAY)).toMatchObject({ lastSeen: at(3), visitFrom: T0 + 30 * DAY - 3600_000 });
  });

  it('offers at most three ready places, longest waiting first', () => {
    expect(welcomeBackSet([{ nodeId: 'd', dueAt: at(9) }, { nodeId: 'a', dueAt: at(7) }, { nodeId: 'c', dueAt: at(8) }, { nodeId: 'b', dueAt: at(7) }])).toEqual(['a', 'b', 'c']);
    const back = welcomeBack(scope, exp, record, T0 + 20 * DAY)!;
    expect(back.lastSeen).toBe(at(3));
    expect(back.nodes).toEqual(FOUR.slice(0, 3));
  });

  it('is quiet without a break', () => {
    expect(welcomeBack(scope, exp, record, T0 + 12 * DAY)).toBeNull();
    expect(welcomeBack(scope, exp, createCheckLedger(), T0 + 400 * DAY)).toBeNull();
  });

  it('leads the hub and the map with the set, and the hub shows each place’s glow', () => {
    const input = (checks: CheckLedger, now: number) => ({ learner: createLearner(), ledger: exp, earnedIds: earnedNodeIds(exp, checks), entries: [], checks, now });
    const back = buildHub(catalog.get(scope)!, input(record, T0 + 20 * DAY));
    expect(back.next).toMatchObject({ kind: 'welcome' });
    expect(back.next?.kind === 'welcome' && back.next.items.map(item => item.node.id)).toEqual(FOUR.slice(0, 3));
    // Five days in, nothing is due and there was no break: every lit place glows (on the strip and
    // the map; the field itself keeps no count of it).
    const fresh = buildHub(catalog.get(scope)!, input(record, T0 + 5 * DAY));
    expect(fresh.next?.kind).not.toBe('welcome');
    expect(fresh.freshness).toBeNull();
    expect(fresh.children.filter(child => (child.glow ?? 0) > 0).map(child => child.node.id).sort()).toEqual([...FOUR].sort());
  });

  it('each place opened during the visit uses one of the three: the set shrinks, never refills', () => {
    const now = T0 + 20 * DAY;
    const one = play(record, FOUR[0], 20);
    expect(welcomeBack(scope, exp, one, now + 600_000)!.nodes).toEqual(FOUR.slice(1, 3));
    const missed = play(record, FOUR[0], 20, false);
    expect(welcomeBack(scope, exp, missed, now + 600_000)!.nodes).toEqual(FOUR.slice(1, 3));
  });
});

describe('existing records', () => {
  // A record written before the refresh ladder existed: an old check session, case plays and an
  // event kind this build does not know. Freshness is computed from it; nothing new is stored.
  const raw = JSON.stringify({ version: 1, events: [], other: [{ t: 'note-from-a-newer-build', id: 'x1', at: at(1) }] });
  const old = play(play(appendCheckEvents(parseCheckLedger(raw), []), DRIFT, 0), DRIFT, 8);
  const stored = JSON.stringify(old);

  it('read the same, keep every event and color, and gain a glow', () => {
    const memory = new Map<string, string>([['mok-checks-v1', stored]]);
    const store = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } };
    const loaded = loadCheckLedger(store);
    expect(loaded.warning).toBeNull();
    expect(loaded.data).toEqual(old);
    expect(loaded.data.other).toEqual([{ t: 'note-from-a-newer-build', id: 'x1', at: at(1) }]);
    expect(earnedNodeIds(exp, loaded.data)).toEqual([DRIFT]);
    expect(nodeProgress(DRIFT, exp, loaded.data, undefined, T0 + 9 * DAY)).toMatchObject({ level: 'Lasting', lastingAt: at(8), freshness: { refreshes: 1 } });
    // Reading freshness writes nothing: the only key is the record itself, byte for byte.
    freshnessByNode(exp, loaded.data, T0 + 500 * DAY);
    expect([...memory.keys()]).toEqual(['mok-checks-v1']);
    expect(memory.get('mok-checks-v1')).toBe(stored);
    // Saving it again (as the app does after the next answer) keeps every event, the unknown one too.
    expect(saveCheckLedger(loaded.data, store)).toBeNull();
    expect(parseCheckLedger(memory.get('mok-checks-v1')!)).toEqual(old);
  });
});

describe('every place with cases', () => {
  // Every expedition place with new cases walks the same ladder: the Evolution route, physics, music,
  // history and every generated place (the Genetics ones included). Nothing here names a place it
  // expects; the list is read from the registry, so a new place is covered the day it lands.
  const PLACES = [...new Set(EXPEDITIONS.filter(e => casesFor(e.nodeId).length).map(e => e.nodeId))];
  const lit = PLACES.reduce((checks, nodeId) => play(checks, nodeId, 0), createCheckLedger());

  it('covers the whole registry, the Genetics places, physics, music and history among them', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(EXPEDITIONS.filter(e => e.pack.id.startsWith('evolution-')).length + 3 + GENERATED_PLACES.length);
    for (const place of GENERATED_PLACES) expect(PLACES).toContain(place.nodeId);
    for (const packId of ['physics', 'music', 'history']) expect(PLACES).toContain(EXPEDITIONS.find(e => e.pack.id === packId)!.nodeId);
    for (const nodeId of PLACES) expect(catalog.get(nodeId), nodeId).toBeDefined();
  });

  it('a first case lights the place and its glow, and the map, the hub and the Library all see it', () => {
    const now = T0 + 2 * DAY;
    const glow = freshnessByNode(exp, lit, now);
    const journal = buildJournal({
      exp, checks: lit, entries: [], shelf: createReelShelf(), library: createLibraryStore(), now,
      content: { checkSessions, describe: () => ({ given: '', key: '' }), packTitle: () => undefined, answerKey: () => undefined, caseWords: () => undefined, caseOffer: () => undefined, reels: [] },
    });
    for (const nodeId of PLACES) {
      expect(checkEarnedIds(lit), nodeId).toContain(nodeId);
      expect(glow.get(nodeId), nodeId).toMatchObject({ refreshes: 0, ready: false, dueAt: at(7) });
      expect(journal.status.get(nodeId), nodeId).toMatchObject({ state: 'lit', ready: false });
      expect(journal.status.get(nodeId)!.glow, nodeId).toBeGreaterThan(0);
    }
  });

  it('Lasting stays the first rung: a week on each place is due, and a second case makes it Lasting', () => {
    const due = dueChecks('knowledge', exp, lit, T0 + 7 * DAY);
    expect([...due].sort()).toEqual([...PLACES].sort());
    for (const nodeId of PLACES) {
      expect(checkStatus(nodeId, exp, lit, T0 + 7 * DAY), nodeId).toMatchObject({ kind: 'ready', purpose: 'lasting', via: 'case' });
      const lasting = play(lit, nodeId, 7);
      expect(nodeProgress(nodeId, exp, lasting, undefined, T0 + 8 * DAY), nodeId).toMatchObject({ level: 'Lasting', lastingAt: at(7), freshness: { refreshes: 1, dueAt: at(28), ready: false } });
      expect(checkStatus(nodeId, exp, lasting, T0 + 8 * DAY), nodeId).toEqual({ kind: 'lasting', at: at(7), refreshAt: at(28) });
    }
  });

  it('three weeks after Lasting each place is ready to refresh, with a new case or, failing that, its questions', () => {
    const lasting = PLACES.reduce((checks, nodeId) => play(checks, nodeId, 7), lit);
    const due = dueChecks('knowledge', exp, lasting, T0 + 28 * DAY);
    for (const nodeId of PLACES) {
      // Every place has a third case or a question bank, so none is left with nothing to refresh with.
      expect(casesFor(nodeId).length >= 3 || !!bankFor(nodeId), nodeId).toBe(true);
      expect(checkStatus(nodeId, exp, lasting, T0 + 28 * DAY), nodeId).toMatchObject({ kind: 'ready', purpose: 'refresh' });
      expect(due, nodeId).toContain(nodeId);
      const refreshed = play(lasting, nodeId, 28);
      expect(nodeProgress(nodeId, exp, refreshed, undefined, T0 + 28 * DAY).freshness, nodeId).toMatchObject({ refreshes: 2, glow: 1, dueAt: at(88) });
      expect(nodeProgress(nodeId, exp, lasting, undefined, T0 + 400 * DAY).level, nodeId).toBe('Lasting');
    }
  });

  it('after a break any of them can be in the welcome-back set, which stays at three', () => {
    const back = welcomeBack('knowledge', exp, lit, T0 + 30 * DAY)!;
    expect(back.lastSeen).toBe(at(0));
    expect(back.nodes).toHaveLength(3);
    for (const nodeId of back.nodes) expect(PLACES).toContain(nodeId);
    const hub = buildHub(catalog.root, { learner: createLearner(), ledger: exp, earnedIds: earnedNodeIds(exp, lit), entries: [], checks: lit, now: T0 + 30 * DAY });
    expect(hub.next?.kind === 'welcome' && hub.next.items.map(item => item.node.id)).toEqual(back.nodes);
  });
});

describe('one ladder, one promise', () => {
  const understood = { level: 'Understood' as const, firstTry: { right: 5, total: 6 }, transfer: { right: 2, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '', misses: [] };
  const hubAt = (nodeId: string, checks: CheckLedger, now: number, ledger = exp) =>
    buildHub(catalog.get(nodeId)!, { learner: createLearner(), ledger, earnedIds: earnedNodeIds(ledger, checks), entries: [], checks, now });
  /** Every family of the place's question bank answered, so no new check can be drawn. */
  const spendBank = (checks: CheckLedger, nodeId: string, day: number) => {
    const bank = bankFor(nodeId)!;
    const families = [...new Set(bank.prepared.map(entry => entry.item.family))];
    return appendCheckEvents(checks, families.map((family, i) => ({ t: 'attempt' as const, id: `spent-${i}`, session: 'spent', node: nodeId, item: bank.prepared.find(entry => entry.item.family === family)!.item.id, family, variant: 0, answer: { pick: 'x' } as CheckAnswer, correct: false, confidence: 'guess' as const, ms: 1, at: at(day) })));
  };

  it('a case first and the expedition ten days later: the ladder starts at the case, and Lasting is its first step', () => {
    const ledger = recordRun(exp, { id: 'r-drift', packId: 'evolution-e04', summary: understood, at: at(10) });
    const checks = play(createCheckLedger(), DRIFT, 0);
    const p = nodeProgress(DRIFT, ledger, checks, undefined, T0 + 12 * DAY);
    expect(p).toMatchObject({ level: 'Understood', understoodAt: at(0), lastingAt: null });
    expect(p.freshness).toMatchObject({ refreshes: 0, dueAt: at(7), ready: true, glow: 0 });
    expect(checkStatus(DRIFT, ledger, checks, T0 + 12 * DAY)).toEqual({ kind: 'ready', purpose: 'lasting', via: 'case' });
    // The Lasting case then takes the first step, and the next refresh is 21 days on.
    const lasting = play(checks, DRIFT, 12);
    const after = nodeProgress(DRIFT, ledger, lasting, undefined, T0 + 12.1 * DAY);
    expect(after).toMatchObject({ level: 'Lasting', lastingAt: at(12) });
    expect(after.freshness).toMatchObject({ refreshes: 1, lastAt: at(12), dueAt: at(33) });
    expect(after.freshness!.glow).toBeGreaterThan(0.99);
    // The Library walks the same ladder.
    const journal = buildJournal({ exp: ledger, checks, entries: [], shelf: createReelShelf(), library: createLibraryStore(), now: T0 + 12 * DAY, content: journalContent });
    expect(journal.status.get(DRIFT)).toMatchObject({ glow: 0, ready: true });
  });

  it('Lasting stays on the hub while its refresh is due', () => {
    const lasting = play(play(createCheckLedger(), DRIFT, 0), DRIFT, 8);
    const due = hubAt(DRIFT, lasting, T0 + 30 * DAY);
    expect(due.check).toMatchObject({ kind: 'ready', purpose: 'refresh' });
    expect(due.lastingAt).toBe(at(8));
    const field = hubAt('knowledge.science.biology.evolution', lasting, T0 + 30 * DAY);
    expect(field.children.find(child => child.node.id === DRIFT)?.expedition?.level).toBe('Lasting');
  });

  it('with every case and question spent the place is plain Lasting: never ready, no date, nothing due', () => {
    let checks = play(play(play(createCheckLedger(), DRIFT, 0), DRIFT, 7), DRIFT, 28);
    expect(casesFor(DRIFT).every(c => checks.events.some(e => e.t === 'case' && e.case === c.id))).toBe(true);
    checks = spendBank(checks, DRIFT, 29);
    for (const day of [30, 89, 400]) {
      const now = T0 + day * DAY;
      expect(checkStatus(DRIFT, exp, checks, now), String(day)).toEqual({ kind: 'lasting', at: at(7) });
      expect(nextCaseAt(DRIFT, exp, checks, now)).toBeNull();
      expect(dueChecks('knowledge', exp, checks, now)).not.toContain(DRIFT);
      expect(hubAt(DRIFT, checks, now).next?.kind).not.toBe('check');
      const journal = buildJournal({ exp, checks, entries: [], shelf: createReelShelf(), library: createLibraryStore(), now, content: journalContent });
      expect(journal.status.get(DRIFT)).toMatchObject({ state: 'lasting', ready: false });
    }
  });

  it('a replay ends on a new case only while the place is unproved or due, and the next date is the ladder’s', () => {
    expect(caseClosesRun(DRIFT, exp, createCheckLedger(), T0)).toBe(true);
    const lit = play(createCheckLedger(), DRIFT, 0);
    expect(caseClosesRun(DRIFT, exp, lit, T0 + 3 * DAY)).toBe(false);
    expect(caseClosesRun(DRIFT, exp, lit, T0 + 7 * DAY)).toBe(true);
    const lasting = play(lit, DRIFT, 8);
    expect(nextCaseAt(DRIFT, exp, lasting, T0 + 8.01 * DAY)).toBe(Date.parse(at(29)));
    expect(caseClosesRun(DRIFT, exp, lasting, T0 + 27 * DAY)).toBe(false);
    expect(caseClosesRun(DRIFT, exp, lasting, T0 + 29 * DAY)).toBe(true);
    // The refresh on day 29 moves it 60 days on; a miss instead opens another case two days later.
    expect(nextCaseAt(DRIFT, exp, play(lasting, DRIFT, 29), T0 + 29.01 * DAY)).toBe(Date.parse(at(89)));
    expect(nextCaseAt(DRIFT, exp, play(lasting, DRIFT, 29, false), T0 + 29.01 * DAY)).toBe(Date.parse(at(29 + CHECK_POLICY.retryAfterDays)));
    expect(nextCaseOf({ kind: 'lasting', at: at(8) })).toBeUndefined();
  });
});

describe('the welcome-back visit', () => {
  const PLACES = [...new Set(EXPEDITIONS.filter(e => casesFor(e.nodeId).length).map(e => e.nodeId))];
  // Every place lit a minute apart on day 0, then a five-week break.
  const lit = PLACES.reduce((checks, nodeId, i) => play(checks, nodeId, i / 1440), createCheckLedger());
  const now = T0 + 40 * DAY;
  const input = (checks: CheckLedger, clock: number, activity?: string[]) => ({ learner: createLearner(), ledger: exp, earnedIds: earnedNodeIds(exp, checks), entries: [], checks, now: clock, activity });
  const scopes = [...new Set(PLACES.flatMap(id => catalog.getPath(catalog.get(id)!).slice(0, -1).map(node => node.id)))];

  it('is one set of three for the whole visit: every hub and the map offer only places from it', () => {
    const visit = welcomeVisit(exp, lit, now)!;
    expect(visit.nodes).toEqual(PLACES.slice(0, 3));
    const offered = new Set<string>();
    for (const scope of scopes) {
      const next = nextStepFor(catalog.get(scope)!, input(lit, now));
      if (next?.kind === 'welcome') for (const item of next.items) offered.add(item.node.id);
      expect(next?.kind, scope).not.toBe('check');
      if (next?.kind === 'welcome') expect(next.items.map(item => item.node.id), scope).toEqual(visit.nodes.filter(id => isWithinTerritory(id, scope)));
    }
    expect([...offered].sort()).toEqual([...visit.nodes].sort());
  });

  it('once the three are refreshed nothing else follows in the same visit, except on a place’s own page', () => {
    const done = PLACES.slice(0, 3).reduce((checks, nodeId, i) => play(checks, nodeId, 40 + (i + 1) / 1440), lit);
    const later = now + 10 * 60_000;
    expect(welcomeVisit(exp, done, later)!.nodes).toEqual([]);
    for (const scope of scopes) {
      const next = nextStepFor(catalog.get(scope)!, input(done, later));
      expect(next?.kind === 'check' || next?.kind === 'welcome', scope).toBe(false);
    }
    expect(nextStepFor(catalog.get(PLACES[5])!, input(done, later))?.kind).toBe('check');
    // The next visit, with no break before it, serves due places one at a time again.
    expect(nextStepFor(catalog.root, input(done, later + DAY))?.kind).toBe('check');
  });

  it('proving a brand-new place during the visit leaves the set alone', () => {
    const three = PLACES.slice(0, 4);
    const some = three.reduce((checks, nodeId, i) => play(checks, nodeId, i), createCheckLedger());
    const clock = T0 + 20 * DAY;
    const before = welcomeVisit(exp, some, clock)!.nodes;
    expect(before).toEqual(three.slice(0, 3));
    expect(welcomeVisit(exp, play(some, PLACES[6], 20), clock + 60_000)!.nodes).toEqual(before);
  });

  it('a day spent watching, pinning, writing or reading is not a break', () => {
    // Watched two days ago, after the last case: today is an ordinary day, and due places come one at a time.
    const twoDaysAgo = at(38);
    expect(welcomeVisit(exp, lit, now, undefined, [twoDaysAgo])).toBeNull();
    expect(nextStepFor(catalog.root, input(lit, now, [twoDaysAgo]))?.kind).toBe('check');
    // Watching every day for a month keeps it a run of ordinary days.
    const daily = Array.from({ length: 39 }, (_, d) => at(1 + d));
    expect(welcomeVisit(exp, lit, now, undefined, daily)).toBeNull();
    // Back after the break and watching for an hour first: still this visit, so the welcome waits for it.
    expect(welcomeVisit(exp, lit, now, undefined, [new Date(now - 3600_000).toISOString()])).toMatchObject({ lastSeen: lit.events.at(-1)!.at, visitFrom: now - 3600_000 });
    const shelf = { ...createReelShelf(), pinned: [{ id: 'r', at: at(10) }] };
    const library = { ...createLibraryStore(), items: [{ createdAt: at(11), updatedAt: at(39), enrichedAt: at(39) } as never] };
    const times = otherActivity({ watched: { v: at(12), future: at(99) }, shelf, library, entries: [{ createdAt: at(13), updatedAt: at(14) } as never] }, now);
    expect(times).toEqual([at(10), at(11), at(12), at(13), at(14)]);
  });
});
