import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '../core/discoveries';
import type { LearnerState } from '../core/guideTypes';
import { createLearner, recordAttempt, visitDiscovery } from '../core/learner';
import { createExpeditionLedger, markSeen, recordRun } from '../expeditions/ledger';
import { EXPEDITIONS } from '../expeditions/registry';
import { catalog } from '../core/catalog';
import { nextStepFor } from '../hub/hubModel';
import { buildLearnables, leadFor, learnableVerb } from './model';

const summary = (level: 'Glimpsed' | 'Familiar' | 'Understood') => ({ level, firstTry: { right: 6, total: 6 }, transfer: { right: 2, total: 2 }, calibration: { sureRight: 6, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: 'Monday' });
const rhythm = DISCOVERIES.find(discovery => discovery.id === 'rhythm-between-beats')!;
function answer(state: LearnerState, index: number, assisted = false) {
  const challenge = rhythm.challenges[index];
  return recordAttempt(state, { discoveryId: rhythm.id, challengeId: challenge.id, answerId: challenge.correctId, phase: index ? 'transfer' : 'probe', assisted });
}

describe('everything you can learn', () => {
  it('lists every expedition and discovery once, grouped by territory in atlas order', () => {
    const model = buildLearnables(createLearner(), createExpeditionLedger());
    expect(model.counts.total).toBe(EXPEDITIONS.length + DISCOVERIES.length);
    expect(new Set(model.items.map(item => `${item.kind}:${item.id}`)).size).toBe(model.items.length);
    expect(model.territories.flatMap(group => group.items)).toHaveLength(model.items.length);
    expect(model.territories.map(group => group.node.id)).toEqual(['knowledge.science', 'knowledge.technology', 'knowledge.humanities', 'knowledge.society', 'knowledge.mathematics', 'knowledge.arts', 'knowledge.earth', 'knowledge.economics']);
    for (const group of model.territories) for (const item of group.items) expect(item.nodeId.startsWith(`${group.node.id}.`)).toBe(true);
  });

  it('invents no progress: a fresh learner, or a visit alone, starts nothing', () => {
    const model = buildLearnables(visitDiscovery(createLearner(), rhythm.id), createExpeditionLedger());
    expect(model.items.every(item => item.status === 'new')).toBe(true);
    expect(model.continuing).toEqual([]);
    expect(model.counts).toMatchObject({ understood: 0, familiar: 0, inProgress: 0 });
  });

  it('reads expedition levels from the ledger and keeps Familiar in Continue', () => {
    const [first, second, third] = EXPEDITIONS;
    let ledger = recordRun(createExpeditionLedger(), { id: 'a', packId: first.pack.id, summary: summary('Familiar'), at: '2026-10-01T10:00:00.000Z' });
    ledger = recordRun(ledger, { id: 'b', packId: second.pack.id, summary: summary('Understood'), at: '2026-10-02T10:00:00.000Z' });
    ledger = markSeen(ledger, third.pack.id, 'any-grade');
    const model = buildLearnables(createLearner(), ledger);
    const status = (id: string) => model.items.find(item => item.id === id)?.status;
    expect(status(first.pack.id)).toBe('familiar');
    expect(status(second.pack.id)).toBe('understood');
    expect(status(third.pack.id)).toBe('in-progress');
    expect(model.continuing.map(item => item.id)).toEqual([first.pack.id, third.pack.id]);
    expect(model.counts).toMatchObject({ understood: 1, familiar: 1, inProgress: 1 });
    expect(learnableVerb(model.items.find(item => item.id === second.pack.id)!)).toBe('Play again');
  });

  it('follows the discovery journey: resume, then earned only on an unaided fresh example', () => {
    let learner = answer(createLearner(), 0);
    let item = buildLearnables(learner, createExpeditionLedger()).items.find(entry => entry.id === rhythm.id)!;
    expect(item.status).toBe('in-progress');
    expect(learnableVerb(item)).toBe('Continue');
    learner = answer(learner, 1);
    const model = buildLearnables(learner, createExpeditionLedger());
    item = model.items.find(entry => entry.id === rhythm.id)!;
    expect(item.status).toBe('understood');
    expect(model.continuing).toEqual([]);
    expect(model.territories.find(group => group.node.id === 'knowledge.arts')?.understood).toBe(1);
  });

  it('leads with the map’s own next step: E10 first, then the next unearned piece on the route', () => {
    const lead = (ledger = createExpeditionLedger()) => {
      const state = { learner: createLearner(), ledger, earnedIds: [], entries: [] };
      return leadFor(buildLearnables(state.learner, ledger), nextStepFor(catalog.root, state));
    };
    expect(lead()?.id).toBe('evolution-e10');
    expect(lead(recordRun(createExpeditionLedger(), { id: 'a', packId: 'evolution-e10', summary: summary('Understood') }))?.id).toBe('evolution-e02');
    // The rhythm discovery is still listed, just not first.
    expect(buildLearnables(createLearner(), createExpeditionLedger()).items.some(item => item.id === rhythm.id)).toBe(true);
  });

  it('leads with nothing rather than contradict a due check', () => {
    const model = buildLearnables(createLearner(), createExpeditionLedger());
    expect(leadFor(model, null)).toBeNull();
    expect(leadFor(model, { kind: 'check', item: { node: catalog.root, level: null, purpose: 'lasting' } })).toBeNull();
    expect(leadFor(model, { kind: 'welcome', items: [{ node: catalog.root, level: null, purpose: 'refresh' }] })).toBeNull();
  });
});
