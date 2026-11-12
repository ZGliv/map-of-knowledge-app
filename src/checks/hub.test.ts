import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import { createLearner } from '../core/learner';
import { createExpeditionLedger, recordRun, type ExpeditionLedger } from '../expeditions/ledger';
import { buildHub, nextStepFor } from '../hub/hubModel';
import { parseRoute, routeHash } from '../hub/route';
import { checkHref, hasCheck } from './index';
import { createCheckLedger, type CheckLedger } from './ledger';
import { earnedNodeIds, startCheck } from './progress';
import { at, DAY, T0, takeCheck } from './test-helpers';

const NEW_SPECIES = evolutionTerritoryId('new-species');
const summary = (level: 'Familiar' | 'Understood') => ({ level, firstTry: { right: 4, total: 6 }, transfer: { right: level === 'Understood' ? 2 : 0, total: 2 }, calibration: { sureRight: 0, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '' });
const input = (ledger: ExpeditionLedger, checks: CheckLedger, now: number) => ({ learner: createLearner(), ledger, earnedIds: earnedNodeIds(ledger, checks), entries: [], checks, now });
const pass = (checks: CheckLedger, day: number, exp = createExpeditionLedger()) => {
  const { items } = startCheck(NEW_SPECIES, exp, checks, T0 + day * DAY, `p${day}`);
  return takeCheck(checks, NEW_SPECIES, `p${day}`, items!, at(day));
};

describe('the API the Explore feed calls', () => {
  it('knows which nodes have checks and where they live', () => {
    expect(hasCheck(NEW_SPECIES)).toBe(true);
    expect(hasCheck(EVOLUTION_ID)).toBe(false);
    expect(checkHref(NEW_SPECIES)).toBe(`#/check/${encodeURIComponent(NEW_SPECIES)}`);
    expect(parseRoute(checkHref(NEW_SPECIES, EVOLUTION_ID))).toEqual({ kind: 'check', nodeId: NEW_SPECIES, from: EVOLUTION_ID });
    expect(routeHash(parseRoute(checkHref(NEW_SPECIES)))).toBe(checkHref(NEW_SPECIES));
  });
});

describe('hubs and the map’s next step', () => {
  it('offers the check beside the expedition until the idea is proved', () => {
    const hub = buildHub(catalog.get(NEW_SPECIES)!, input(createExpeditionLedger(), createCheckLedger(), T0));
    expect(hub.check).toMatchObject({ kind: 'ready', purpose: 'prove' });
    expect(hub.next?.kind === 'expedition' && hub.next.item.check).toMatchObject({ kind: 'ready', purpose: 'prove' });
  });

  it('shows a check pass as Understood land, with the next check’s date', () => {
    const checks = pass(createCheckLedger(), 0);
    const hub = buildHub(catalog.get(EVOLUTION_ID)!, input(createExpeditionLedger(), checks, T0 + DAY));
    expect(hub.progress.earned).toBe(1);
    const row = hub.children.find(child => child.node.id === NEW_SPECIES)!;
    expect(row.expedition?.level).toBe('Understood');
    expect(row.check).toEqual({ kind: 'waiting', dueAt: at(7) });
  });

  it('surfaces a due Lasting check as the next step once nothing else is in progress', () => {
    const checks = pass(createCheckLedger(), 0);
    const earth = (day: number) => nextStepFor(catalog.root, input(createExpeditionLedger(), checks, T0 + day * DAY));
    expect(earth(6)?.kind).not.toBe('check');
    const step = earth(7);
    expect(step?.kind).toBe('check');
    expect(step?.kind === 'check' && step.item.node.id).toBe(NEW_SPECIES);
    // The node's own hub and its field lead with it too.
    expect(nextStepFor(catalog.get(NEW_SPECIES)!, input(createExpeditionLedger(), checks, T0 + 7 * DAY))?.kind).toBe('check');
    expect(nextStepFor(catalog.get(EVOLUTION_ID)!, input(createExpeditionLedger(), checks, T0 + 7 * DAY))?.kind).toBe('check');
    // An expedition already started and not yet Understood stays first.
    const started = recordRun(createExpeditionLedger(), { id: 'r', packId: 'evolution-e10', summary: summary('Familiar'), at: at(1) });
    const field = nextStepFor(catalog.get(EVOLUTION_ID)!, input(started, checks, T0 + 7 * DAY));
    expect(field?.kind === 'expedition' && field.item.expedition.pack.id).toBe('evolution-e10');
  });

  it('marks a Lasting node and stops offering its check', () => {
    let checks = pass(createCheckLedger(), 0);
    checks = pass(checks, 8);
    const hub = buildHub(catalog.get(NEW_SPECIES)!, input(createExpeditionLedger(), checks, T0 + 9 * DAY));
    // Lasting is the ladder's first refresh: the next falls due 21 days on (checks/freshness.ts).
    expect(hub.check).toEqual({ kind: 'lasting', at: at(8), refreshAt: at(29) });
    expect(hub.freshness).toMatchObject({ refreshes: 1, ready: false });
    expect(hub.lastingAt).toBe(at(8));
    expect(hub.next?.kind).toBe('expedition');
    expect(hub.next?.kind === 'expedition' && hub.next.item.level).toBe('Lasting');
  });
});
