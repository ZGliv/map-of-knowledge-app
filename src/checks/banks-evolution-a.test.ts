// Spot checks for the E01–E04 and E06 banks: the generators compute the answers the facts imply.
import { describe, expect, it } from 'vitest';
import { BANKS } from './banks';
import { checkVariant } from './generators';
import type { NumberItem } from './types';

const item = (id: string) => BANKS.flatMap(b => b.items).find(i => i.id === id) as NumberItem;
const answers = (id: string, n = 3) => Array.from({ length: n }, (_, k) => checkVariant(item(id), k).answer);

describe('evolution banks E01–E06: computed numbers', () => {
  it('E01: a tree of n tips can be drawn in 2^(n − 1) orders', () => {
    expect(answers('i_qbjtzdv8e1')).toEqual([64, 16, 256]);
  });

  it('E02: carrier crosses give 1 in 4 and 1 in 2; Mendel’s 1,064 plants imply 266 dwarf', () => {
    expect(answers('i_a6be7ddn15')).toEqual([16, 12, 9]);
    expect(answers('i_vhqg6c7gea')).toEqual([10, 9, 7]);
    expect(answers('i_qys72ry49y')[0]).toBe(266);
  });

  it('E03: one round of selection raises a variant’s share among survivors', () => {
    expect(answers('i_gm6gkcrrwe').map(a => Number(a.toFixed(2)))).toEqual([31.03, 18.18, 46.15]); // 18/58, 8/44, 18/39
    expect(answers('i_dxpcmq16zk').map(a => Number(a.toFixed(2)))).toEqual([15.38, 14.04, 32.14]); // 0.9/5.85, 1.6/11.4, 4.5/14
  });

  it('E04: a new neutral mutation fixes 1 time in 2N; size never changes the odds; early mutants make jackpots', () => {
    expect(answers('i_zn15ktk531')).toEqual([5, 6, 4]); // 500/100, 300/50, 480/120
    expect(answers('i_fqywareaq3')).toEqual([10, 18, 20]); // 25% of 40, 30% of 60, 40% of 50
    expect(answers('i_262gg8xasn')).toEqual([128, 1024, 8]); // 2^7, 2^10, 2^3
  });

  it('E06: the one-day clock, yearly layers and half-lives', () => {
    expect(answers('i_t5gzw0ftna', 1)[0]).toBeCloseTo((130 / 4540) * 1440, 9); // ≈ 41 minutes
    expect(answers('i_atjefac1sd', 1)[0]).toBeCloseTo((167 / 4540) * 1440, 9); // ≈ 53 minutes
    expect(answers('i_eg9va41px8').map(a => Math.round(a))).toEqual([500, 200, 1500]); // 90, 36, 270 mm ÷ 0.18 mm
    expect(answers('i_8srgsrddaa')).toEqual([6.25, 3.125, 1.5625]); // 4, 5, 6 half-lives of 5,700 years
  });
});
