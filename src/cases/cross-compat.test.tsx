import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Pack, SimBeat } from '../expeditions/content/types';
import { BeatContext, type BeatApi } from '../expeditions/engine/context';
import { checkSimBeat, simAsks } from '../expeditions/sims/archetypes';
import { PeaCross } from '../expeditions/sims/PeaCross';
import { PLACES } from '../places';
import { caseProblems, runCase } from './engines';
import type { CrossModel } from './types';
import { CrossView } from './views';

// The one-gene cross must not move when the engine learns a second gene: the eight live cross cases
// keep their computed answer, brood, counts and line, their policing, and the exact markup a learner
// sees before, during and after the run. Pinned before the second gene was written (2026-10-27).
const LIVE = [
  ['evolution-e02', 'c_7jbkjkqtqm'], ['evolution-e02', 'c_a7v2k8r04n'], ['evolution-e02', 'c_mdxdgpk05j'],
  ['genetics-dominance', 'c_8pmv9br1x4'], ['genetics-dominance', 'c_9k37gp8y1s'], ['genetics-dominance', 'c_4bckeyfa2m'],
  ['genetics-dna', 'c_x7pas1dzg1'], ['genetics-dna', 'c_jdtsqd9859'],
] as const;

const caseOf = (placeId: string, id: string) => {
  const c = PLACES.find(p => p.id === placeId)?.cases?.find(x => x.id === id);
  if (!c || c.model.engine !== 'cross') throw new Error(`${placeId} ${id} is not a live cross case`);
  return c as typeof c & { model: CrossModel };
};

describe('one-gene crosses stay exactly as they were', () => {
  it.each(LIVE)('%s %s: answer, run, line and policing', (placeId, id) => {
    const c = caseOf(placeId, id);
    const out = runCase(c);
    expect(JSON.stringify(out)).toMatchSnapshot();
    expect(caseProblems(c)).toEqual([]);
  });

  it.each(LIVE)('%s %s: the picture before, during and after the run', (placeId, id) => {
    const c = caseOf(placeId, id);
    const outcome = runCase(c);
    const draw = (t: number, withOutcome: boolean) => renderToStaticMarkup(<CrossView model={c.model} answer={null} outcome={withOutcome ? outcome : null} t={t} />);
    expect([draw(0, false), draw(0.5, true), draw(1, true)]).toMatchSnapshot();
  });

  // The pea-cross sim shares the maths: every one-gene step keeps its checks and its questions. These
  // are the pea-cross beats the atlas held when the snapshot was taken, Meiosis and Sex-linked traits
  // (then held out of the build) included. Beats written since, on either gene count, have nothing to
  // stay equal to: their checks are held below and by validatePlace, their play by the playthrough.
  const PINNED = [
    ['evolution-e02', 'Mendel’s garden'], ['genetics-dna', 'Spin the copies'], ['genetics-dominance', 'Breed Andalusians'],
    ['genetics-meiosis', 'Deal the copies'], ['genetics-sex-linked', 'Follow the X'],
  ] as const;
  const peaCrosses = PLACES.flatMap(p => p.pack.beats.filter((b): b is SimBeat => b.kind === 'sim' && b.sim === 'peaCross').map(b => [p.id, b.title, b] as const));
  const beats = PINNED.map(([placeId, title]) => {
    const found = peaCrosses.find(([id, t]) => id === placeId && t === title);
    if (!found) throw new Error(`${placeId} “${title}” is pinned but no longer in the atlas`);
    return found;
  });
  it.each(beats)('%s “%s”: the pea-cross checks and questions', (_, __, beat) => {
    expect(checkSimBeat(beat)).toEqual([]);
    expect(JSON.stringify(simAsks(beat))).toMatchSnapshot();
  });
  it('every pea-cross beat in the atlas, pinned or written since, passes its checks', () => {
    for (const [placeId, title, beat] of peaCrosses) expect(checkSimBeat(beat), `${placeId} “${title}”`).toEqual([]);
  });

  // The sim as it opens (parents, question, choices), recorded from the pea-cross sim as it was before
  // the second gene. The grown tray and square are played through by tests/expedition-playthrough.mjs.
  const api = { pack: {} as Pack, media: () => ({ src: '', alt: '' }), done: () => {}, record: () => {}, evidenceFor: () => undefined, open: () => {}, openPlace: () => {}, finish: () => {} } as unknown as BeatApi;
  it.each(beats)('%s “%s”: the pea-cross sim as it opens', (_, __, beat) => {
    expect(renderToStaticMarkup(<BeatContext.Provider value={api}><PeaCross beat={beat} /></BeatContext.Provider>)).toMatchSnapshot();
  });
});
