import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Pack, SimBeat } from '../expeditions/content/types';
import { BeatContext, type BeatApi } from '../expeditions/engine/context';
import { PeaCross } from '../expeditions/sims/PeaCross';
import { runCase } from './engines';
import type { CrossModel, PlaceCase } from './types';
import { CrossView } from './views';

// What a learner sees of a two-gene cross: nothing about shares before the run, a tray and a tally by
// class during it, and the sixteen equally likely boxes once it is done, with the counted ones ringed.

const FLIES: CrossModel = {
  engine: 'cross', locus: { E: 1, e: 0 }, parents: ['Ee', 'Ee'], traits: { E: 'Grey body', e: 'Ebony body' }, cross: 'grey flies', who: { one: 'fly', many: 'flies' }, count: 320, focus: 'e|V', measure: 'count',
  second: { locus: { V: 1, v: 0 }, parents: ['Vv', 'Vv'], traits: { V: 'Normal wings', v: 'Vestigial wings' }, classes: { 'e|V': 'Ebony with normal wings', 'E|V': 'Grey with normal wings', 'E|v': 'Grey with vestigial wings', 'e|v': 'Ebony with vestigial wings' } },
};
const c = { id: 'c_0000000000', archetype: 'cross', title: 'T', scenario: 'S', ask: 'A', model: FLIES, call: { kind: 'set', label: 'x', min: 0, max: 320, step: 1, start: 0, tolerance: 10 }, run: 'R', reveal: 'r', claim: 'c', entities: [], sources: [], seed: 'flies' } as PlaceCase;
const draw = (model: CrossModel, t: number, ran = true) => renderToStaticMarkup(<CrossView model={model} answer={null} outcome={ran ? runCase({ ...c, model }) : null} t={t} />);
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;

describe('the two-gene picture', () => {
  it('shows the parents and nothing else before the run', () => {
    const before = draw(FLIES, 0, false);
    expect(before).toContain('Grey body, normal wings');
    expect(before).not.toMatch(/cross-grid|case-tally|case-brood|16/);
  });

  it('fills the tray and tally by class during the run, and holds the grid back until it ends', () => {
    const mid = draw(FLIES, 0.5);
    expect(count(mid, /<i style/g)).toBeGreaterThan(150);
    for (const label of Object.values(FLIES.second!.classes)) expect(mid).toContain(label);
    expect(mid).not.toContain('cross-grid');
  });

  it('draws sixteen boxes after the run, equal looks under one header, the counted ones ringed', () => {
    const after = draw(FLIES, 1);
    expect(count(after, /<td( class="[^"]*")?><i class="case-cell"/g)).toBe(16);
    expect(count(after, /is-marked/g)).toBe(3);                       // ebony × normal wings: 1 row × 3 columns
    expect(after).toMatch(/rowSpan="3"[^>]*>Grey body|rowspan="3"[^>]*>Grey body/);
    expect(after).toMatch(/colSpan="3"[^>]*>Normal wings|colspan="3"[^>]*>Normal wings/);
    expect(after).toContain('aria-label="Sixteen equally likely combinations: ebony with normal wings in 3"');
  });

  it('lays four spots out as a 2 × 2 before the run', () => {
    const spots: CrossModel = {
      engine: 'cross', locus: { M: 1, F: 1 }, parents: ['MF', 'MF'], traits: { M: 'Mother’s at both', FM: 'One of each', F: 'Father’s at both' }, cross: 'four spots', spots: ['Chromosome 2 spot', 'Chromosome 5 spot'],
      who: { one: 'sperm', many: 'sperm' }, count: 320, focus: 'M|P', measure: 'count',
      second: { locus: { P: 1, Q: 1 }, parents: ['PQ', 'PQ'], traits: { P: 'Mother’s at both', PQ: 'One of each', Q: 'Father’s at both' }, spots: ['Chromosome 7 spot', 'Chromosome 9 spot'], classes: { 'M|P': 'All four', 'M|PQ,M|Q,FM|P,FM|PQ,FM|Q,F|P,F|PQ,F|Q': 'A mix' } },
    };
    const before = draw(spots, 0, false);
    expect(before).toContain('is-four');
    expect(count(before, /Chromosome \d spot/g)).toBe(4);
  });
});

describe('the two-gene pea-cross step', () => {
  it('opens on the two parents, each drawn for both genes, and the question', () => {
    const beat = { kind: 'sim', sim: 'peaCross', title: 'White eyes, short wings', goal: 'G', params: {
      locus: { R: 2, w: 1, Y: 2 }, traits: { R: { label: 'Red-eyed daughter', look: 'full' }, w: { label: 'White-eyed daughter', look: 'none' }, RY: { label: 'Red-eyed son', look: 'full' }, Y: { label: 'White-eyed son', look: 'none' } },
      second: { locus: { V: 1, v: 0 }, traits: { V: { label: 'Normal wings', ring: 'none' }, v: { label: 'Vestigial wings', ring: 'ring' } } },
      seed: 'fly', steps: [{ id: 'fly', title: 'A carrier female and a white-eyed male', parents: ['Rw', 'wY'], second: ['Vv', 'Vv'], parentNames: ['Mother', 'Father'], action: 'Breed them', seeds: 64,
        ask: { gradeId: 'fly', prompt: 'Which young will have white eyes and vestigial wings?', answer: 'both', explain: 'E', choices: [{ id: 'both', label: 'Some of each' }, { id: 'sons', label: 'Only sons' }] } }] } } as unknown as SimBeat;
    const api = { pack: {} as Pack, media: () => ({}), done: () => {}, record: () => {}, evidenceFor: () => undefined, open: () => {}, openPlace: () => {}, finish: () => {} } as unknown as BeatApi;
    const html = renderToStaticMarkup(<BeatContext.Provider value={api}><PeaCross beat={beat} /></BeatContext.Provider>);
    expect(count(html, /class="pea2 pea2--none"/g)).toBe(2);           // both parents show normal wings
    expect(html).toContain('Which young will have white eyes and vestigial wings?');
    expect(html).not.toContain('cross-grid');
  });
});
