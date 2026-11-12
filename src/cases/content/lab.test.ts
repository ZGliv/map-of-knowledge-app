import { describe, expect, it } from 'vitest';
import { numbersIn } from '../../checks/generators';
import { km } from '../../expeditions/sims/spreadMath';
import { runCase, wins } from '../engines';
import type { PlaceCase, SpreadModel } from '../types';
import { HISTORY_CASES } from './history';
import { MUSIC_CASES } from './music';
import { PHYSICS_CASES } from './physics';

// The adversarial rules for the physics, music and history cases, beyond validatePlace: nothing the
// learner reads before Run wins by copying, the tempting wrong idea loses, and on a map the place
// that looks right by straight-line distance is not the answer.
const ALL: readonly PlaceCase[] = [...PHYSICS_CASES, ...MUSIC_CASES, ...HISTORY_CASES];
const value = (c: PlaceCase) => { const t = runCase(c).truth; if (t.kind !== 'set') throw new Error('not a set case'); return t; };

describe('the physics, music and history cases', () => {
  it('print no number that wins: copying from the text proves nothing', () => {
    for (const c of ALL) if (c.call.kind === 'set') {
      const printed = numbersIn([c.title, c.setting ?? '', c.scenario, c.ask].join(' '));
      for (const n of printed) expect(wins(c.call, value(c), { value: n }), `${c.id} prints ${n}`).toBe(false);
    }
  });

  it('lose with the tempting wrong idea', () => {
    const lose = (id: string, wrong: number) => {
      const c = ALL.find(x => x.id === id)!;
      expect(wins(c.call, value(c), { value: wrong }), `${id} with ${wrong}`).toBe(false);
    };
    lose('c_vr5wp3r1c6', 110 / 9.81); // distance over the pull, as if speed were steady
    lose('c_vr5wp3r1c6', 4.5); // the round number nearest the answer
    lose('c_3r1qtrafw2', 5.15 / 2); // half the drop in half the time
    lose('c_zbgy8yfdc4', 105 / 4.6); // the average second
    lose('c_zbgy8yfdc4', 9.81 * 4.6); // the landing speed, taken for the last second's distance
    lose('c_pb808xkhd0', 4.74 * 9.81 / 3.71); // the time scaled with the pull, not its square root
    lose('c_pb808xkhd0', 8); // the round number nearest the answer
    lose('c_n3dtrjphap', 392 * 9 / 16); // the pull taken at face value
    lose('c_n3dtrjphap', 392); // no change
    lose('c_n3dtrjphap', 300); // the round number nearest the answer
    lose('c_7t1tzq95pd', 220 * 56 / 70); // shorter string, lower note
    lose('c_qtbgmdw60t', 550 - 330); // the gap between the tones
    lose('c_qtbgmdw60t', 100); // the round low note
  });

  it('do not narrow to one plain-looking pair: every frequency is a three-digit number, none a round fifty', () => {
    for (const c of MUSIC_CASES) if (c.model.engine === 'ratio' && c.model.measure === 'calmest')
      for (const pair of c.model.pairs) for (const hz of pair.hz) expect(Number.isInteger(hz) && hz >= 100 && hz < 1000 && hz % 50 !== 0, `${pair.label}`).toBe(true);
  });

  it('on a map, never reward straight-line distance', () => {
    for (const c of HISTORY_CASES) {
      const m = c.model as SpreadModel;
      const at = (id: string) => { const p = m.places.find(x => x.id === id)!; return [p.lat, p.lon] as [number, number]; };
      const byMap = [...m.candidates].sort((a, b) => km(at(m.origin), at(a)) - km(at(m.origin), at(b)));
      const tempting = m.measure === 'first' ? byMap[0] : byMap.at(-1)!;
      expect(runCase(c).truth, c.id).not.toEqual({ kind: 'pick', win: [tempting] });
    }
  });

  it('put the winning option somewhere new in the list each time, never first or last', () => {
    for (const cases of [MUSIC_CASES, HISTORY_CASES]) {
      const at = cases.flatMap(c => {
        const t = runCase(c).truth;
        return c.call.kind === 'pick' && t.kind === 'pick' ? [{ i: c.call.options.findIndex(o => t.win.includes(o.id)), n: c.call.options.length }] : [];
      });
      expect(new Set(at.map(x => x.i)).size, JSON.stringify(at)).toBe(at.length);
      for (const { i, n } of at) expect(i > 0 && i < n - 1, JSON.stringify(at)).toBe(true);
    }
  });
});
