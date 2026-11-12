import { describe, expect, it } from 'vitest';
import type { SimBeat } from '../content/types';
import { EXPEDITIONS } from '../registry';
import { ARCHETYPES, archetypeOf, catalogueText, checkSimBeat, simAsks, type SimKey } from './archetypes';

const SIMS: SimKey[] = ['dropTower', 'monochord', 'waveMixer', 'spreadMap', 'driftLab', 'fluctuation', 'deepTime', 'lifeChart', 'mothHunt', 'peaCross', 'treeSpin', 'lineageRewind', 'tradeOff', 'nestTest', 'sequenceLab'];
const simBeats = EXPEDITIONS.flatMap(({ pack }) => pack.beats.filter((b): b is SimBeat => b.kind === 'sim').map(beat => [`${pack.id} ${beat.sim}`, beat] as const));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const find = (sim: SimKey) => simBeats.find(([, b]) => b.sim === sim)![1];

describe('the sim library', () => {
  it('puts every engine in exactly one archetype, each with a purpose, knowledge types and an example', () => {
    const engines = ARCHETYPES.flatMap(a => a.engines.map(e => e.sim));
    expect([...engines].sort()).toEqual([...SIMS].sort());
    expect(new Set(engines).size).toBe(engines.length);
    for (const a of ARCHETYPES) {
      expect(a.teaches.length, a.id).toBeGreaterThan(40);
      expect(a.knowledgeTypes.length, a.id).toBeGreaterThan(0);
      expect(a.examples.length, a.id).toBeGreaterThan(0);
    }
    expect(catalogueText()).toContain('## Cross and inheritance (cross)');
  });

  it.each(simBeats)('%s: grade IDs, keys and model-computed claims all hold', (_, beat) => {
    expect(archetypeOf(beat.sim)).toBeTruthy();
    expect(checkSimBeat(beat)).toEqual([]);
  });

  it('catches a key the model disagrees with (mutation tests)', () => {
    const trade = clone(find('tradeOff'));
    (trade.params as { questions: { answer: string }[] }).questions[0].answer = 'less';
    expect(checkSimBeat(trade).join()).toMatch(/model moves/);

    const nest = clone(find('nestTest'));
    const np = nest.params as { questions: { answer: string; choices: { id: string }[] }[] };
    np.questions[0].answer = np.questions[0].choices.find(c => c.id !== np.questions[0].answer)!.id;
    expect(checkSimBeat(nest).join()).toMatch(/nowhere to go/);

    const chart = clone(find('lifeChart'));
    const cp = chart.params as { pick: { answer: string }; events: { id: string; big?: boolean }[] };
    cp.pick.answer = cp.events.filter(e => e.big).find(e => e.id !== cp.pick.answer)!.id;
    expect(checkSimBeat(chart).join()).toMatch(/tallest/);

    const cross = clone(find('peaCross'));
    (cross.params as { steps: { expect?: Record<string, number> }[] }).steps[1].expect = { R: 1, r: 1 };
    expect(checkSimBeat(cross).join()).toMatch(/the cross gives/);

    const tree = clone(find('treeSpin'));
    (tree.params as { newick: string }).newick = (tree.params as { newick: string }).newick.replace(/\(([^(),]+),([^(),]+)\)/, '($1)');
    expect(checkSimBeat(tree).length).toBeGreaterThan(0);
  });

  it('recomputes every sequence-lab key from the letters', () => {
    const beat: SimBeat = {
      kind: 'sim', sim: 'sequenceLab', title: 'T', goal: 'G', grades: [{ gradeId: 'len' }],
      params: { steps: [{
        id: 's1', title: 'Read it', kind: 'rna', letters: 'CCAUGGCUGAGUAAGG', label: 'Messenger RNA', action: 'Read it',
        op: { do: 'translate', from: 'start' },
        ask: { gradeId: 'len', prompt: 'How many amino acids?', measure: 'length', answer: '3', explain: 'Three codons before the stop.',
          choices: [{ id: '3', label: 'Three' }, { id: '4', label: 'Four', feedback: 'The stop adds none.' }, { id: '5', label: 'Five', feedback: 'Count from AUG.' }] },
      }] },
    };
    expect(archetypeOf('sequenceLab').id).toBe('sequence');
    expect(checkSimBeat(beat)).toEqual([]);
    const wrong = clone(beat);
    (wrong.params as { steps: { ask: { answer: string } }[] }).steps[0].ask.answer = '4';
    expect(checkSimBeat(wrong).join()).toMatch(/keyed "4" but the letters give "3"/);
  });

  it('checks a sequence lab’s tree reveal against its own tips', () => {
    const beat: SimBeat = {
      kind: 'sim', sim: 'sequenceLab', title: 'T', goal: 'G', grades: [{ gradeId: 'pair' }],
      params: {
        steps: [{
          id: 's1', title: 'Line them up', kind: 'dna', letters: 'ACGTACGTAC', label: 'A', action: 'Count',
          op: { do: 'compare', first: 'a', with: [{ id: 'b', label: 'B', letters: 'ACGTACGTAA' }, { id: 'c', label: 'C', letters: 'TTGTACCTAA' }], by: 'position' },
          ask: { gradeId: 'pair', prompt: 'Which two differ least?', measure: 'closest', answer: 'a|b', explain: 'One letter apart.',
            choices: [{ id: 'a|b', label: 'A and B' }, { id: 'a|c', label: 'A and C', feedback: 'Count again.' }, { id: 'b|c', label: 'B and C', feedback: 'Count again.' }] },
        }],
        reveal: { title: 'The tree', newick: '((a,b),c);', tips: { a: 'A', b: 'B', c: 'C' }, marked: ['a', 'b'], credit: 'Tree: a source' },
      },
    };
    expect(checkSimBeat(beat)).toEqual([]);
    const wrong = clone(beat);
    (wrong.params as { reveal: { tips: Record<string, string>; marked: string[] } }).reveal.tips = { a: 'A', b: 'B', d: 'D' };
    (wrong.params as { reveal: { marked: string[] } }).reveal.marked = ['a', 'e'];
    expect(checkSimBeat(wrong).join()).toMatch(/tip labels do not match/);
    expect(checkSimBeat(wrong).join()).toMatch(/marked "e" is not a tip/);
  });

  it('checks a two-gene pea-cross beat: both genes named, every combination drawn, expect in sixteenths', () => {
    const beat: SimBeat = {
      kind: 'sim', sim: 'peaCross', title: 'White eyes, short wings', goal: 'G', grades: [{ gradeId: 'fly' }],
      params: {
        locus: { R: 2, w: 1, Y: 2 },
        traits: { R: { label: 'Red-eyed daughter', look: 'full' }, w: { label: 'White-eyed daughter', look: 'none' }, RY: { label: 'Red-eyed son', look: 'full' }, Y: { label: 'White-eyed son', look: 'none' } },
        second: { locus: { V: 1, v: 0 }, traits: { V: { label: 'Normal wings', ring: 'none' }, v: { label: 'Vestigial wings', ring: 'ring' } } },
        seed: 'fly', noun: ['fly', 'flies'],
        steps: [{
          id: 'fly', title: 'A carrier female and a white-eyed male, both hiding vestigial', parents: ['Rw', 'wY'], second: ['Vv', 'Vv'], parentNames: ['Mother', 'Father'],
          action: 'Breed them', seeds: 64, expect: { 'R|V': 3, 'R|v': 1, 'w|V': 3, 'w|v': 1, 'RY|V': 3, 'RY|v': 1, 'Y|V': 3, 'Y|v': 1 },
          ask: { gradeId: 'fly', prompt: 'Which young will have white eyes and vestigial wings?', answer: 'both', explain: 'Eyes follow the X; wings split the same way in sons and daughters.',
            choices: [{ id: 'both', label: 'Some sons and some daughters' }, { id: 'sons', label: 'Only sons', feedback: 'The father’s X carries white, so daughters can too.' }, { id: 'none', label: 'None', feedback: 'Both parents hide vestigial.' }] },
        }],
      },
    };
    expect(checkSimBeat(beat)).toEqual([]);
    const wrong = clone(beat), wp = wrong.params as { steps: { expect?: Record<string, number>; second?: [string, string] }[]; second: { traits: Record<string, { ring: string }> } };
    wp.steps[0].expect = { 'R|V': 4, 'R|v': 4, 'Y|V': 4, 'Y|v': 4 };
    expect(checkSimBeat(wrong).join()).toMatch(/in every sixteen, but the cross gives/);
    delete wp.steps[0].second;
    expect(checkSimBeat(wrong).join()).toMatch(/names each step's parents for the second gene/);
    const rings = clone(beat);
    (rings.params as { second: { traits: Record<string, { ring: string }> } }).second.traits.v.ring = 'none';
    expect(checkSimBeat(rings).join()).toMatch(/its own ring/);
    // A one-gene beat that names a second gene's parents in a step has no gene to give them to.
    const stray = clone(find('peaCross'));
    (stray.params as { steps: { second?: [string, string] }[] }).steps[0].second = ['Vv', 'Vv'];
    expect(checkSimBeat(stray).join()).toMatch(/step.second needs the beat's own second gene/);
  });

  it('catches grade IDs that differ from what the engine records', () => {
    const beat = clone(find('peaCross'));
    beat.grades = [{ gradeId: 'something-else' }];
    expect(checkSimBeat(beat).join()).toMatch(/differ from what the engine records/);
    expect(simAsks(find('peaCross')).length).toBe(2);
  });
});
