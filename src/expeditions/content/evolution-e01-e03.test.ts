import { describe, expect, it } from 'vitest';
import { gradesOf } from '../engine/evidence';
import { possibleChildren } from '../sims/cross';
import type { MothHuntParams } from '../sims/MothHunt';
import type { PeaCrossParams } from '../sims/PeaCross';
import { closestRelatives, mrca, parseNewick, sameTree, tipsOf } from '../sims/tree';
import type { TreeSpinParams } from '../sims/TreeSpin';
import { evolutionE01 } from './evolution-e01';
import { evolutionE02 } from './evolution-e02';
import { evolutionE03 } from './evolution-e03';

// Facts only these three packs state, recomputed by code. The rules every pack shares (beat
// budget, transfer, rhythm, media, feedback, keys) run for every place in places/places.test.ts.
describe('keys computed by code', () => {
  it('E02: every blood-group answer follows from the ABO rules', () => {
    const beat = evolutionE02.beats.find(b => b.kind === 'match' && b.gradeId === 'blood-groups');
    if (beat?.kind !== 'match') throw new Error('missing blood-group beat');
    const ABO = { A: 1, B: 1, O: 0 };
    for (const left of beat.left) {
      const [, mother, father] = left.label.match(/Mother type (\w+), father type (\w+)/)!;
      expect(beat.pairs[left.id], left.label).toBe(possibleChildren(mother, father, ABO).includes('O') ? 'yes' : 'no');
    }
  });

  it('E02: the garden compares itself with Mendel’s own count, as quoted', () => {
    const sim = evolutionE02.beats.find(b => b.kind === 'sim');
    const source = evolutionE02.beats.find(b => b.kind === 'source');
    if (sim?.kind !== 'sim' || source?.kind !== 'source') throw new Error('missing beats');
    const real = (sim.params as unknown as PeaCrossParams).steps.find(s => s.scaleUp)!.scaleUp!;
    const passage = source.passage.join(' ');
    expect(passage).toContain(real.real.R.toLocaleString('en-US'));
    expect(passage).toContain(real.real.r.toLocaleString('en-US'));
    expect(passage).toContain((real.real.R + real.real.r).toLocaleString('en-US'));
    expect(real.count).toBe(real.real.R + real.real.r);
  });

  it('E03: the stated stand-in bird matches the model, and every stop rule can be reached', () => {
    const sim = evolutionE03.beats.find(b => b.kind === 'sim');
    if (sim?.kind !== 'sim') throw new Error('missing sim');
    const p = sim.params as unknown as MothHuntParams;
    expect(p.visible.soot.recessive / p.visible.soot.dominant).toBe(4);
    expect(p.visible.lichen.dominant / p.visible.lichen.recessive).toBe(4);
    expect(p.note).toContain('four times');
    for (const s of p.script) if (s.do === 'forward') expect(s.rising ? s.until > p.start : s.until < 0.98).toBe(true);
    expect(gradesOf(evolutionE03).filter(g => p.script.some(s => s.do === 'ask' && s.gradeId === g.gradeId))).toHaveLength(3);
  });

  it('E01: trees shown are the pinned Open Tree trees, and the tasks name real tips', () => {
    for (const beat of evolutionE01.beats) {
      if (beat.kind !== 'sim') continue;
      const p = beat.params as unknown as TreeSpinParams;
      const shown = parseNewick(p.newick), pinned = parseNewick(p.pinned);
      expect(sameTree(shown, pinned)).toBe(true);
      expect(tipsOf(shown).sort()).toEqual(Object.keys(p.tips).sort());
      for (const t of p.tasks) {
        if (t.kind === 'closer' || t.kind === 'tapTip') expect(tipsOf(shown)).toContain(t.of);
        if (t.kind === 'tapTip') expect(closestRelatives(shown, t.of).length).toBeGreaterThan(0);
        if (t.kind === 'tapNode') expect(tipsOf(mrca(shown, t.pair[0], t.pair[1])).length).toBeGreaterThan(2);
      }
    }
    // The traps are real: the drawing puts the lungfish beside the salmon and the mushroom beside the moss.
    const [first, second] = evolutionE01.beats.filter(b => b.kind === 'sim').map(b => tipsOf(parseNewick(((b as { params: unknown }).params as TreeSpinParams).newick)));
    expect(Math.abs(first.indexOf('Lepidosiren_paradoxa') - first.indexOf('Salmo_salar'))).toBe(1);
    expect(Math.abs(second.indexOf('Agaricus_bisporus') - second.indexOf('Physcomitrella_patens'))).toBe(1);
  });
});
