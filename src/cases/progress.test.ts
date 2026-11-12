import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { appendCheckEvents, createCheckLedger, parseCheckLedger, type CaseEvent, type CheckLedger } from '../checks/ledger';
import { checkEarnedIds, checkSessions, checkStatus, nodeProgress } from '../checks/progress';
import { createExpeditionLedger } from '../expeditions/ledger';
import { PLACES } from '../places';
import { caseById, casesFor, isLastCase, judgedSuccess, nextCase, playedCases } from '.';
import { nextLine } from './nextLine';
import { runCase, wins } from './engines';
import type { CaseAnswer, PlaceCase } from './types';

// New cases in the record: a call is written when Run is pressed, rerun from the case's seed and
// judged afresh, and it lights land, retries and earns Lasting through the same projection as checks.
const DRIFT = evolutionTerritoryId('chance-drift');
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-10-01T12:00:00.000Z');
const at = (day: number) => new Date(T0 + day * DAY).toISOString();
const exp = createExpeditionLedger();

/** A call that wins (or loses) the case, found by asking the engine, never typed. */
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

const play = (checks: CheckLedger, c: PlaceCase, day: number, right: boolean, id = `${c.id}-${day}`): CheckLedger => {
  const event: CaseEvent = { t: 'case', id, session: id, node: DRIFT, case: c.id, answer: callFor(c, right), success: right, via: 'mission', ms: 1000, at: at(day) };
  return appendCheckEvents(checks, [event]);
};

describe('new cases in the record', () => {
  const cases = casesFor(DRIFT);
  it('every Evolution place and Dominance has at least three cases, and IDs never repeat across places', () => {
    for (const place of PLACES.filter(p => p.id.startsWith('evolution-') || p.id === 'genetics-dominance')) expect(place.cases.length, place.id).toBeGreaterThanOrEqual(3);
    const ids = PLACES.flatMap(p => p.cases.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a right first call lights the place; the next case moves on', () => {
    const checks = play(createCheckLedger(), cases[0], 0, true);
    expect(checkEarnedIds(checks)).toContain(DRIFT);
    expect(nodeProgress(DRIFT, exp, checks).level).toBe('Understood');
    expect(nextCase(DRIFT, checks)?.id).toBe(cases[1].id);
  });

  it('a stored "success" is never trusted: the call is rerun and judged afresh', () => {
    const forged: CaseEvent = { t: 'case', id: 'f', session: 'f', node: DRIFT, case: cases[0].id, answer: callFor(cases[0], false), success: true, via: 'mission', ms: 1, at: at(0) };
    expect(checkEarnedIds(appendCheckEvents(createCheckLedger(), [forged]))).not.toContain(DRIFT);
  });

  it('a replayed case never counts: its outcome has been seen', () => {
    let checks = play(createCheckLedger(), cases[0], 0, false, 'first');
    checks = play(checks, cases[0], 3, true, 'again');
    expect(checkSessions(checks).map(s => s.verdict.passed)).toEqual([false, false]);
    expect(checkEarnedIds(checks)).not.toContain(DRIFT);
  });

  it('a miss removes nothing, cools for two days, then offers another new case', () => {
    let checks = play(createCheckLedger(), cases[0], 0, true);
    checks = play(checks, cases[1], 8, false);
    expect(checkEarnedIds(checks)).toContain(DRIFT);
    const fresh = play(createCheckLedger(), cases[0], 0, false);
    expect(checkStatus(DRIFT, exp, fresh, T0 + 1 * DAY).kind).toBe('cooling');
    expect(checkStatus(DRIFT, exp, fresh, T0 + 2 * DAY)).toMatchObject({ kind: 'ready', purpose: 'prove', via: 'case' });
  });

  it('a right call a week after the place lit makes it Lasting', () => {
    let checks = play(createCheckLedger(), cases[0], 0, true);
    expect(checkStatus(DRIFT, exp, checks, T0 + 3 * DAY).kind).toBe('waiting');
    expect(checkStatus(DRIFT, exp, checks, T0 + 7 * DAY)).toMatchObject({ kind: 'ready', purpose: 'lasting', via: 'case' });
    checks = play(checks, cases[1], 7, true);
    expect(nodeProgress(DRIFT, exp, checks).level).toBe('Lasting');
  });

  it('falls back to the question bank once every case is played', () => {
    let checks = createCheckLedger();
    cases.forEach((c, i) => { checks = play(checks, c, i * 3, false); });
    expect(nextCase(DRIFT, checks)).toBeUndefined();
    expect(checkStatus(DRIFT, exp, checks, T0 + 100 * DAY)).toMatchObject({ kind: 'ready', via: 'questions' });
  });

  it('round-trips through storage, and an older build keeps case events it cannot read', () => {
    const checks = play(createCheckLedger(), cases[0], 0, true);
    expect(parseCheckLedger(JSON.stringify(checks))).toEqual(checks);
    const raw = JSON.parse(JSON.stringify(checks));
    expect(raw.events[0]).toMatchObject({ t: 'case', case: cases[0].id, via: 'mission' });
  });
});

describe('what the end of a case promises next', () => {
  it('a new case while one is left, and a fresh check once the last is played', () => {
    for (const place of PLACES) {
      const cases = place.cases ?? [];
      cases.forEach((c, i) => expect(isLastCase(c.id), c.id).toBe(i === cases.length - 1));
    }
    expect(nextLine(true, true, 'Monday')).toBe('Back for a new case on Monday.');
    expect(nextLine(false, true, 'Monday')).toBe('Another new case opens Monday.');
    expect(nextLine(true, false, 'Monday')).toBe('Back for a fresh check on Monday.');
    expect(nextLine(false, false, 'Monday')).toBe('A fresh check opens Monday.');
  });
});

describe('a case renamed for its wording, labels, order or range', () => {
  const all = PLACES.flatMap(place => (place.cases ?? []).map(c => ({ place, c })));
  const renamed = all.filter(x => x.c.was?.length);

  it('keeps its old IDs out of use, and the Mars tower among them', () => {
    const live = new Set(all.map(x => x.c.id));
    const old = renamed.flatMap(x => x.c.was!);
    expect(new Set(old).size).toBe(old.length);
    for (const id of old) { expect(live.has(id), id).toBe(false); expect(id).toMatch(/^c_[0-9a-hjkmnp-tv-z]{10}$/); }
    expect(renamed.map(x => x.c.id)).toContain('c_pb808xkhd0');
  });

  it('a play under an old ID spends the new one, so the same situation never comes back as new', () => {
    for (const { place, c } of renamed) {
      const others = (place.cases ?? []).filter(d => d.id !== c.id);
      let checks = createCheckLedger();
      const event = (id: string, k: number): CaseEvent => ({ t: 'case', id: `${id}-${k}`, session: `${id}-${k}`, node: place.nodeId, case: id, answer: { value: 0 }, success: false, via: 'mission', ms: 1, at: at(k) });
      checks = appendCheckEvents(checks, [event(c.was![0], 0), ...others.map((d, k) => event(d.id, k + 1))]);
      expect(playedCases(checks).has(c.id), c.id).toBe(true);
      expect(nextCase(place.nodeId, checks), c.id).toBeUndefined();
    }
  });

  it('a call under an old ID is read and judged as the new case, not taken on its stored word', () => {
    const mars = renamed.find(x => x.c.id === 'c_pb808xkhd0')!;
    const old = mars.c.was![0];
    // Called 15 s on the old 0–15 s slider, and stored as a win: rejudged, it is still a miss.
    expect(caseById(old, { value: 15 })?.case.id).toBe(mars.c.id);
    expect(judgedSuccess(old, { value: 15 })).toBe(false);
    expect(judgedSuccess(old, callFor(mars.c, true))).toBe(true);
    const forged: CaseEvent = { t: 'case', id: 'm', session: 'm', node: mars.place.nodeId, case: old, answer: { value: 15 }, success: true, via: 'mission', ms: 1, at: at(0) };
    expect(checkSessions(appendCheckEvents(createCheckLedger(), [forged]))[0].played).toMatchObject({ caseId: old, success: false });
  });

  it('a stored pick the new case no longer offers keeps what was stored', () => {
    for (const { c } of renamed.filter(x => x.c.call.kind === 'pick')) {
      expect(caseById(c.was![0], { pick: 'gone' }), c.id).toBeUndefined();
      expect(judgedSuccess(c.was![0], { pick: 'gone' }), c.id).toBeUndefined();
      expect(caseById(c.was![0])?.case.id, c.id).toBe(c.id);
    }
  });
});
