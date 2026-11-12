import { describe, expect, it } from 'vitest';
import * as content from '../../content';
import { createCheckLedger } from '../../checks/ledger';
import { createExpeditionLedger, type ExpeditionLedger } from '../../expeditions/ledger';
import { expeditionAt } from '../../expeditions/registry';
import { nearestProof, proofAt, type ProofInput } from './proof';

const DAY = 864e5;
const NOW = Date.parse('2026-10-26T12:00:00.000Z');
const SELECTION = 'knowledge.science.biology.evolution.natural-selection';
const proved = (nodeId: string, days: number): ExpeditionLedger => ({ ...createExpeditionLedger(), runs: [{ id: 'r', packId: expeditionAt(nodeId)!.pack.id, level: 'Understood', firstTry: { right: 5, total: 6 }, transfer: { right: 2, total: 2 }, at: new Date(NOW - days * DAY).toISOString() }] });
const input = (exp: ExpeditionLedger, lit: string[] = []): ProofInput => ({ exp, checks: createCheckLedger(), now: NOW, lit: id => lit.includes(id) });

describe('the proof a place offers', () => {
  it('is its lesson until it has been tried', () => {
    expect(proofAt(content, SELECTION, input(createExpeditionLedger()))).toMatchObject({ kind: 'lesson', packId: expeditionAt(SELECTION)!.pack.id });
  });
  it('is the proof itself while it is fresh, and a refresh once one is due', () => {
    expect(proofAt(content, SELECTION, input(proved(SELECTION, 2), [SELECTION]))?.kind).toBe('proved');
    expect(proofAt(content, SELECTION, input(proved(SELECTION, 12), [SELECTION]))?.kind).toBe('refresh');
  });
  it('is nothing where there is no lesson, case or question', () => {
    expect(proofAt(content, 'knowledge.arts.music.timbre', input(createExpeditionLedger()))).toBeNull();
  });
  it('for a place without one, is the nearest charted place inside it or beside it', () => {
    expect(nearestProof(content, 'knowledge.arts.music', input(createExpeditionLedger()))?.nodeId).toBe('knowledge.arts.music.harmony');
    expect(nearestProof(content, 'knowledge.arts.music.timbre', input(createExpeditionLedger()))?.nodeId).toBe('knowledge.arts.music.harmony');
    expect(nearestProof(content, 'knowledge.society.politics', input(createExpeditionLedger()))).toBeNull();
  });
});
