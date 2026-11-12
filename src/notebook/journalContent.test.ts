import { describe, expect, it } from 'vitest';
import { createCheckLedger, type CheckLedger } from '../checks/ledger';
import { casesFor } from '../cases';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import { BLACK_DEATH } from '../core/history';
import { EXPEDITIONS } from '../expeditions/registry';
import { journalContent } from './journalContent';

const SELECTION = evolutionTerritoryId('natural-selection');
const played = (nodeId: string): CheckLedger => ({
  ...createCheckLedger(),
  events: casesFor(nodeId).map((c, i) => ({ t: 'case', id: `e${i}`, session: `s${i}`, node: nodeId, case: c.id, answer: { pick: 'x' }, success: true, via: 'mission', ms: 1000, at: '2026-10-01T12:00:00.000Z' })) as CheckLedger['events'],
});

describe('the new case a finished book can offer', () => {
  it('is the place’s own next case', () => {
    expect(casesFor(SELECTION).length).toBeGreaterThan(0);
    expect(journalContent.caseOffer([SELECTION], createCheckLedger())).toBe(SELECTION);
    expect(journalContent.caseOffer([BLACK_DEATH.id], createCheckLedger())).toBe(BLACK_DEATH.id);
  });
  it('for a whole field, is a charted place inside it, in the route’s order', () => {
    expect(journalContent.caseOffer([EVOLUTION_ID], createCheckLedger())).toBe(evolutionTerritoryId('evolution-now'));
    expect(journalContent.caseOffer(['knowledge.science.biology.genetics-genomes'], createCheckLedger())).toBe(EXPEDITIONS.find(e => e.nodeId.startsWith('knowledge.science.biology.genetics-genomes.'))!.nodeId);
  });
  it('is not offered from too far above, where no case is left, or where there are no cases', () => {
    expect(journalContent.caseOffer(['knowledge.science'], createCheckLedger())).toBeUndefined();
    expect(journalContent.caseOffer([SELECTION], played(SELECTION))).toBeUndefined();
    expect(journalContent.caseOffer(['knowledge.humanities.philosophy'], createCheckLedger())).toBeUndefined();
    expect(journalContent.caseOffer([BLACK_DEATH.id], played(BLACK_DEATH.id))).toBeUndefined();
  });
});

describe('a call stored under a retired case ID', () => {
  it('keeps its words in the Library: the Mars tower, called 15 s under its old ID', () => {
    expect(journalContent.caseWords('c_wxta7z55rq', { value: 15 })).toEqual({ prompt: 'How many seconds would the capsule fall on Mars?', given: '15.00 s', right: '7.70 s' });
  });
});
