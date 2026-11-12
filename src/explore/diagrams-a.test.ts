import { describe, expect, it } from 'vitest';
import { evolutionE01 } from '../expeditions/content/evolution-e01';
import { evolutionE04 } from '../expeditions/content/evolution-e04';
import { DAY_SECONDS, describeSpan, formatClock } from '../expeditions/sims/deepTimeMath';
import { closer, parseNewick, sameTree } from '../expeditions/sims/tree';
import { CLOCK_EVENTS, E01_TREE, HUMAN_LIFE_SECONDS, LURIA_DELBRUCK, MA_PER_HOUR, MENDEL, MOTH_CURVES, MOTHS, OUR_SPECIES_SECONDS, SICCAR, SQUEEZE } from './diagrams-a';
import { clockSeconds } from '../expeditions/sims/deepTimeMath';

// The numbers the E01–E06 reels say out loud, recomputed from the figures that draw them.

describe('reel figures, E01–E06', () => {
  it('draw E01’s own tree, so the lungfish and whale captions follow from it', () => {
    const pinned = (evolutionE01.beats[1] as unknown as { params: { pinned: string } }).params.pinned;
    const tree = parseNewick(E01_TREE);
    expect(sameTree(tree, parseNewick(pinned))).toBe(true);
    expect(closer(tree, 'Lepidosiren_paradoxa', 'Salmo_salar', 'Bos_taurus')).toBe('Bos_taurus');
    expect(closer(tree, 'Lepidosiren_paradoxa', 'Salmo_salar', 'Homo_sapiens')).toBe('Homo_sapiens');
    expect(closer(tree, 'Balaenoptera_musculus', 'Hippopotamus_amphibius', 'Bos_taurus')).toBe('Hippopotamus_amphibius');
  });

  it('use Mendel’s counts as the pack quotes them', () => {
    expect(MENDEL.round + MENDEL.wrinkled).toBe(7324);
    expect((MENDEL.round / MENDEL.wrinkled).toFixed(2)).toBe('2.96');
  });

  it('bring the moth model from a rarity in 1848 to 98% in 1895, then down after 1970', () => {
    expect(MOTH_CURVES.rise).toHaveLength(MOTHS.to - MOTHS.from + 1);
    expect(MOTH_CURVES.rise.at(-1)).toBeCloseTo(0.98, 3);
    expect(MOTH_CURVES.fall[MOTHS.decline - MOTHS.cleanAir]).toBeCloseTo(0.98, 3);
    expect(MOTH_CURVES.fall.at(-1)!).toBeLessThan(0.2);
  });

  it('leave two gene versions after the seal squeeze, by chance alone', () => {
    expect(SQUEEZE.survivors).toHaveLength(24);
    expect(new Set(SQUEEZE.generations[0]).size).toBeGreaterThanOrEqual(5);
    expect(new Set(SQUEEZE.regrown).size).toBe(2);
  });

  it('show Luria and Delbrück’s counts exactly as the pack does', () => {
    const real = (evolutionE04.beats.find(beat => beat.kind === 'sim' && beat.sim === 'fluctuation') as unknown as { params: { real: { rows: { counts: number[] }[] } } }).params.real.rows;
    expect([...LURIA_DELBRUCK.twentyCultures]).toEqual(real[0].counts);
    expect([...LURIA_DELBRUCK.oneCulture]).toEqual(real[1].counts);
    expect(Math.min(...LURIA_DELBRUCK.oneCulture)).toBe(13);
    expect(Math.max(...LURIA_DELBRUCK.oneCulture)).toBe(26);
  });

  it('put each event at the clock time the deep-time reel says', () => {
    const at = CLOCK_EVENTS.map(event => formatClock(clockSeconds(event.ma, 4540)));
    expect(at).toEqual(['05:29', '20:49', '22:46', '23:39']);
    expect(Math.round(MA_PER_HOUR / 10) * 10).toBe(190);
    expect(Math.round(OUR_SPECIES_SECONDS)).toBe(6);
    expect(formatClock(DAY_SECONDS - OUR_SPECIES_SECONDS, true)).toBe('23:59:54');
    expect(HUMAN_LIFE_SECONDS).toBeLessThan(0.002);
    expect(describeSpan(HUMAN_LIFE_SECONDS)).toBe('1.5 thousandths of a second');
    expect(SICCAR.grey - SICCAR.red).toBe(65);
  });
});
