import { describe, expect, it } from 'vitest';
import { PLACES } from '../places';
import { GENERATED_PLACES } from '../places/generated';
import { runCase, wins } from './engines';
import { reflexWins } from './reflexes';

// A case is won by reasoning, never by a reflex: the slider's middle or either end, the first or last
// option, or, in a cross, a quarter or three quarters of the count (the shares a one-gene cross makes,
// which every cross sim prints before its cases). Each place's validator already stops the slider's
// start and anything the picture prints. These are the ones still open, each for a stated reason; the
// list only shrinks, and a new reflex win anywhere fails here.
const HELD: Readonly<Record<string, string>> = {
  // One cross gives whole quarters, so every cross answer is a quarter, a half (the slider's middle)
  // or three quarters of the count. Zack's call: an engine that counts a second generation (eighths),
  // or accept these as known limits.
  'evolution-e02 c_7jbkjkqtqm quarter of the count': 'cross engine: whole quarters',
  'evolution-e02 c_a7v2k8r04n three quarters of the count': 'cross engine: whole quarters',
  'evolution-e02 c_mdxdgpk05j middle': 'cross engine: half the count',
  'genetics-dominance c_8pmv9br1x4 middle': 'cross engine: half the count',
  'genetics-dominance c_9k37gp8y1s quarter of the count': 'cross engine: whole quarters',
  'genetics-dominance c_4bckeyfa2m middle': 'cross engine: half the count',
  'genetics-dna c_x7pas1dzg1 middle': 'strand copying gives whole quarters: half the count',
  'genetics-dna c_jdtsqd9859 max': 'strand copying gives whole quarters: every copy',
  // Evolution is charted by hand; its option order is Zack's to change.
  'evolution-e04 c_dhq8nk9sse last': 'hand-charted',
  'evolution-e04 c_1maqrdddpz last': 'hand-charted',
  'evolution-e08 c_b4rt9s4s1w first': 'hand-charted',
  'evolution-e12 c_gsye4vthpw last': 'hand-charted',
};
// Known routes this test cannot see, on the record for Zack:
// - genetics-gene-to-protein c_5hvvxdp841 (haemoglobin Constant Spring): scanning the RNA's tail for the
//   lost stop's own spelling, TAA, ignoring the threes, happens to land in step and wins (172); a scan for
//   any stop meets an out-of-step TAG first and loses (146). The letters are the real gene's and can't move.
// - genetics-gene-to-protein c_b03vbe8y08 (six changes to HBB): two options share letter 9, so in any order
//   one of "smallest letter, first listed" and "smallest letter, last listed" wins. The order makes the
//   natural top-to-bottom scan meet the decoy (T to A) first and lose; "last listed" wins, and so does a
//   string sort's last label. Guessing between the pair wins 1 in 2. Closing it needs a third letter-9
//   change found in people, which no pinned source shows (rs713040 names c.9T>G with no frequency).

describe('no case falls to a reflex', () => {
  it('the slider’s middle and ends, the first and last option, and a cross’s quarters win only where held', () => {
    const found: string[] = [];
    for (const place of PLACES) for (const c of place.cases ?? []) {
      const truth = runCase(c).truth;
      const key = (how: string) => `${place.id} ${c.id} ${how}`;
      if (c.call.kind === 'set' && truth.kind === 'set') {
        const { min, max } = c.call;
        for (const [how, value] of [['middle', (min + max) / 2], ['min', min], ['max', max]] as const) if (wins(c.call, truth, { value })) found.push(key(how));
        // The middle already stands for half the count whenever the slider runs from 0 to the count.
        if (c.model.engine === 'cross') {
          const count = c.model.count;
          for (const [how, value] of [['quarter of the count', count / 4], ['half of the count', count / 2], ['three quarters of the count', (3 * count) / 4]] as const) {
            if (how === 'half of the count' && value === (min + max) / 2) continue;
            if (wins(c.call, truth, { value })) found.push(key(how));
          }
        }
      }
      if (c.call.kind === 'pick' && !c.call.multi && truth.kind === 'pick') {
        const at = c.call.options.findIndex(o => truth.win.includes(o.id));
        if (at === 0) found.push(key('first'));
        if (at === c.call.options.length - 1) found.push(key('last'));
      }
    }
    expect(found.sort()).toEqual(Object.keys(HELD).sort());
  });
});

// A two-gene cross (types.ts SecondGene) falls to no reflex at all (cases/reflexes.ts): the slider's
// landmarks and a one-gene cross's quarters, a share the lesson shows or the rest of it, another case's
// answer or share, either gene alone or the two added, the genes linked, the 9:3:3:1 table on a cross
// that isn't two hybrids, and the sex split ignored. Each is tried a slider step either side.
// validatePlace refuses such a case while it is drafted; this holds every place to it, and holds
// nothing: two-gene crosses exist to close the quarters above.
describe('no two-gene cross falls to a reflex', () => {
  it('every reflex in cases/reflexes.ts misses every two-gene case', () => {
    const found = PLACES.flatMap(place => (place.cases ?? []).flatMap(c => reflexWins(c, place).map(how => `${place.id} ${c.id} ${how}`)));
    expect(found).toEqual([]);
  });

  // The scan's look-alikes stay inside one place. Two-gene crosses in different places share an engine
  // and similar counts, so a learner who carries one's answer to another must lose there too: having
  // different answers isn't enough when a band reaches the other number (Meiosis's drake, 40 within 8,
  // took Sex-linked's 48 until both went to 6). A share carried across places (1/8 in both, 3/8 in
  // both) is a known open call, docs/dihybrid-design.md §7.2, and is not checked here.
  it('no two-gene cross is won by another two-gene cross’s answer typed in, a step either side', () => {
    const two = PLACES.flatMap(place => (place.cases ?? []).filter(c => c.model.engine === 'cross' && c.model.second).map(c => ({ place, c, truth: runCase(c).truth })));
    const found: string[] = [];
    for (const a of two) for (const b of two) {
      if (a.c.id === b.c.id || a.c.call.kind !== 'set' || a.truth.kind !== 'set' || b.truth.kind !== 'set') continue;
      const typed = Math.round(b.truth.value);
      for (const value of [typed - a.c.call.step, typed, typed + a.c.call.step]) if (wins(a.c.call, a.truth, { value })) found.push(`${a.place.id} ${a.c.id} won by ${b.c.id}’s ${value}`);
    }
    expect(two.length).toBeGreaterThanOrEqual(6);
    expect(found).toEqual([]);
  });
});

// A pick is won by reading the case, never by the label itself: the one an A–Z sort puts first or
// last, or the one longer or shorter than every other. Checked on the generator's places; these are
// the ones still open.
const HELD_LABELS: Readonly<Record<string, string>> = {
  'genetics-dna c_rp6th0k633 longest': 'on prod before this check: Streptomyces coelicolor (23 letters) against Plasmodium falciparum (21)',
  'genetics-gene-to-protein c_b03vbe8y08 A–Z last': 'two options share letter 9, so “T becomes C” sorts after “T becomes A” in any order (the known route above)',
};

describe('no pick falls to its label', () => {
  it('the A–Z first and last labels, and the longest and shortest, win only where held', () => {
    const found: string[] = [];
    for (const place of GENERATED_PLACES) for (const c of place.cases ?? []) {
      const truth = runCase(c).truth;
      if (c.call.kind !== 'pick' || c.call.multi || truth.kind !== 'pick') continue;
      const options = c.call.options, win = truth.win;
      const labels = options.map(o => o.label);
      const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'en'));
      const won = (label: string) => win.includes(options.find(o => o.label === label)!.id);
      const alone = (n: number) => labels.filter(l => l.length === n).length === 1 ? labels.find(l => l.length === n)! : undefined;
      const key = (how: string) => `${place.id} ${c.id} ${how}`;
      if (won(sorted[0])) found.push(key('A–Z first'));
      if (won(sorted.at(-1)!)) found.push(key('A–Z last'));
      const longest = alone(Math.max(...labels.map(l => l.length))), shortest = alone(Math.min(...labels.map(l => l.length)));
      if (longest && won(longest)) found.push(key('longest'));
      if (shortest && won(shortest)) found.push(key('shortest'));
    }
    expect(found.sort()).toEqual(Object.keys(HELD_LABELS).sort());
  });
});
