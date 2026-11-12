import { describe, expect, it } from 'vitest';
import { boxesByLook, expected, expected2, phenotype, phenotype2, runsOf, sample2, seeded, splitPair, type Locus } from '../expeditions/sims/cross';
import { caseProblems, judgeCase, runCase } from './engines';
import type { CrossModel, PlaceCase, SecondGene } from './types';

// The second gene of the cross engine (types.ts SecondGene). Every share table in
// docs/dihybrid-design.md §2 is checked three ways: the design's own fraction, a brute-force deal of
// every allele from every parent written here from scratch, and the engine. These models are made up
// to exercise the engine; real cases live in places/.

const AB: Locus = { A: 1, a: 0 }, BB: Locus = { B: 1, b: 0 };
const X: Locus = { A: 2, a: 1, Y: 2 };              // an X-linked recessive, the Y ranked with the top allele
const CAT: Locus = { O: 1, o: 1, Y: 1 };            // orange and black on the X, codominant
const pairs = (g: string) => [...g];
/** Every one of the 16 equally likely deals: an allele from each parent for each gene. */
function deal(p1: [string, string], p2: [string, string]) {
  const out: { a: [string, string]; b: [string, string] }[] = [];
  for (const m1 of pairs(p1[0])) for (const f1 of pairs(p1[1])) for (const m2 of pairs(p2[0])) for (const f2 of pairs(p2[1])) out.push({ a: [m1, f1], b: [m2, f2] });
  return out;
}
const shareOf = (deals: ReturnType<typeof deal>, pred: (d: ReturnType<typeof deal>[number]) => boolean) => deals.filter(pred).length / deals.length;
/** The engine's share of the combinations that match. */
const engineShare = (l1: Locus, p1: [string, string], l2: Locus, p2: [string, string], combos: string[]) => {
  const made = expected2({ locus: l1, parents: p1 }, { locus: l2, parents: p2 });
  return combos.reduce((t, c) => t + (made[c] ?? 0), 0) / 16;
};

describe('two genes: every share table, three ways', () => {
  // A_B_, A_bb, aaB_, aabb, one hidden trait only, at least one hidden.
  const dihybrid: [string, [string, string], [string, string], number[]][] = [
    ['AaBb × AaBb', ['Aa', 'Aa'], ['Bb', 'Bb'], [9, 3, 3, 1, 6, 7]],
    ['AaBb × aabb', ['Aa', 'aa'], ['Bb', 'bb'], [4, 4, 4, 4, 8, 12]],
    ['AaBb × Aabb', ['Aa', 'Aa'], ['Bb', 'bb'], [6, 6, 2, 2, 8, 10]],
    ['AaBb × aaBb', ['Aa', 'aa'], ['Bb', 'Bb'], [6, 2, 6, 2, 8, 10]],
    ['AaBb × AABb', ['Aa', 'AA'], ['Bb', 'Bb'], [12, 4, 0, 0, 4, 4]],
  ];
  it.each(dihybrid)('%s', (_, a, b, sixteenths) => {
    const deals = deal(a, b);
    const showsA = (d: (typeof deals)[number]) => d.a.includes('A'), showsB = (d: (typeof deals)[number]) => d.b.includes('B');
    const brute = [
      shareOf(deals, d => showsA(d) && showsB(d)), shareOf(deals, d => showsA(d) && !showsB(d)),
      shareOf(deals, d => !showsA(d) && showsB(d)), shareOf(deals, d => !showsA(d) && !showsB(d)),
      shareOf(deals, d => showsA(d) !== showsB(d)), shareOf(deals, d => !showsA(d) || !showsB(d)),
    ];
    const engine = [['A|B'], ['A|b'], ['a|B'], ['a|b'], ['A|b', 'a|B'], ['A|b', 'a|B', 'a|b']].map(c => engineShare(AB, a, BB, b, c));
    expect(brute).toEqual(sixteenths.map(n => n / 16));
    expect(engine).toEqual(sixteenths.map(n => n / 16));
  });

  // X-linked recessive × an ordinary gene: [class, B_ share, bb share, the same within that sex].
  const son = (d: { a: [string, string] }) => d.a[1] === 'Y';
  const affected = (d: { a: [string, string] }) => son(d) ? d.a[0] === 'a' : d.a[0] === 'a' && d.a[1] === 'a';
  const xRows: [string, [string, string], [string, string], [string, (d: ReturnType<typeof deal>[number]) => boolean, string, number, number][]][] = [
    ['XᴬXᵃ Bb × XᴬY Bb', ['Aa', 'AY'], ['Bb', 'Bb'], [['affected sons', d => son(d) && affected(d), 'Y', 3, 1], ['unaffected sons', d => son(d) && !affected(d), 'AY', 3, 1], ['daughters', d => !son(d) && !affected(d), 'A', 6, 2]]],
    ['XᴬXᵃ Bb × XᵃY Bb', ['Aa', 'aY'], ['Bb', 'Bb'], [['affected sons', d => son(d) && affected(d), 'Y', 3, 1], ['unaffected sons', d => son(d) && !affected(d), 'AY', 3, 1], ['affected daughters', d => !son(d) && affected(d), 'a', 3, 1], ['unaffected daughters', d => !son(d) && !affected(d), 'A', 3, 1]]],
    ['XᵃXᵃ Bb × XᴬY Bb', ['aa', 'AY'], ['Bb', 'Bb'], [['affected sons', d => son(d) && affected(d), 'Y', 6, 2], ['unaffected daughters', d => !son(d) && !affected(d), 'A', 6, 2]]],
    ['XᴬXᵃ Bb × XᴬY bb', ['Aa', 'AY'], ['Bb', 'bb'], [['affected sons', d => son(d) && affected(d), 'Y', 2, 2], ['unaffected sons', d => son(d) && !affected(d), 'AY', 2, 2]]],
    ['XᴬXᴬ Bb × XᵃY Bb', ['AA', 'aY'], ['Bb', 'Bb'], [['unaffected sons', d => son(d) && !affected(d), 'AY', 6, 2], ['carrier daughters', d => !son(d) && !affected(d), 'A', 6, 2]]],
  ];
  it.each(xRows)('%s, by sex', (_, a, b, rows) => {
    const deals = deal(a, b);
    for (const [name, pred, key, nB, nb] of rows) {
      const brute = [shareOf(deals, d => pred(d) && d.b.includes('B')), shareOf(deals, d => pred(d) && !d.b.includes('B'))];
      expect(brute, name).toEqual([nB / 16, nb / 16]);
      expect([engineShare(X, a, BB, b, [`${key}|B`]), engineShare(X, a, BB, b, [`${key}|b`])], name).toEqual([nB / 16, nb / 16]);
      // Within its own sex the share doubles: half the young are of each sex.
      const sex = shareOf(deals, d => son(d) === name.includes('son'));
      expect(sex).toBe(1 / 2);
      expect(shareOf(deals, d => pred(d) && d.b.includes('B')) / sex, name).toBe((2 * nB) / 16);
    }
  });

  it('calico: a female with one orange and one black copy is tortoiseshell, and white is its own gene', () => {
    const tortie = (d: ReturnType<typeof deal>[number]) => d.a[1] !== 'Y' && new Set(d.a).size === 2;
    for (const [a, b, n] of [[['Oo', 'oY'], ['Ss', 'Ss'], 3], [['Oo', 'oY'], ['ss', 'Ss'], 2], [['OO', 'oY'], ['Ss', 'Ss'], 6], [['oo', 'OY'], ['Ss', 'Ss'], 6]] as [[string, string], [string, string], number][]) {
      expect(shareOf(deal(a, b), d => tortie(d) && d.b.includes('S'))).toBe(n / 16);
      expect(engineShare(CAT, a, { S: 1, s: 0 }, b, ['Oo|S'])).toBe(n / 16);
    }
    // Every son of a black queen is black, whatever his father: black-and-white toms are half the sons' three in four.
    expect(engineShare(CAT, ['oo', 'OY'], { S: 1, s: 0 }, ['Ss', 'Ss'], ['Yo|S'])).toBe(6 / 16);
  });

  it('one limit of an X-linked recessive: “how many affected” is the ordinary-gene share with the right reading of the father', () => {
    // Affected children = ½q + ½q·f, where q is the mother's chance of passing the copy and f is 1
    // when the father is affected. That equals an ordinary gene with an unaffected father carrying
    // one copy, or an affected father carrying two, so only a question that names a sex can test the split.
    for (const mother of ['AA', 'Aa', 'aa']) for (const father of ['AY', 'aY']) {
      const xShare = (expected(mother, father, X).Y ?? 0) / 4 + (expected(mother, father, X).a ?? 0) / 4;
      const q = [...mother].filter(c => c === 'a').length / 2, f = father[0] === 'a' ? 1 : 0;
      expect(xShare).toBe(q / 2 + (q * f) / 2);
      expect(xShare).toBe((expected(mother, f ? 'aa' : 'Aa', AB).a ?? 0) / 4);
    }
  });
});

describe('two genes: the deal, the grid order and the run', () => {
  it('draws gene 1 then gene 2 from one stream, the same every time, near the expected shares, each gene independent of the other', () => {
    const a = { locus: AB, parents: ['Aa', 'Aa'] as [string, string] }, b = { locus: BB, parents: ['Bb', 'Bb'] as [string, string] };
    expect(sample2(a, b, 40, seeded('x'))).toEqual(sample2(a, b, 40, seeded('x')));
    const N = 20000, kids = sample2(a, b, N, seeded('many')).map(g => phenotype2(g, AB, BB));
    const share = (k: string) => kids.filter(x => x === k).length / N;
    for (const [k, n] of Object.entries(expected2(a, b))) expect(Math.abs(share(k) - n / 16), k).toBeLessThan(0.015);
    // Independence: the joint share of a hidden trait at both genes is the product of each gene's own share.
    const pa = kids.filter(k => k.startsWith('a|')).length / N, pb = kids.filter(k => k.endsWith('|b')).length / N;
    expect(Math.abs(share('a|b') - pa * pb)).toBeLessThan(0.005);
  });

  it('orders a gene’s four boxes so equal looks sit together, and merges their headers', () => {
    // Ng × NY deals N, NY, N, Y in square order; drawn by look it is N, N, NY, Y.
    const sexed: Locus = { N: 2, g: 1, Y: 2 };
    expect(boxesByLook('Ng', 'NY', sexed, ['N', 'g', 'NY', 'Y']).map(g => phenotype(g, sexed))).toEqual(['N', 'N', 'NY', 'Y']);
    expect(runsOf(['N', 'N', 'NY', 'Y'])).toEqual([['N', 2], ['NY', 1], ['Y', 1]]);
    expect(runsOf(boxesByLook('Rr', 'Rr', { R: 1, r: 0 }, ['R', 'r']).map(g => phenotype(g, { R: 1, r: 0 })))).toEqual([['R', 3], ['r', 1]]);
    expect(splitPair('Rr|yy')).toEqual(['Rr', 'yy']);
  });
});

// ---------------------------------------------------------------- the case engine

const base = (model: CrossModel, tolerance: number, extra: Partial<PlaceCase> = {}): PlaceCase => ({
  id: 'c_0000000000', archetype: 'cross', title: 'T', scenario: 'S', ask: 'A', model,
  call: { kind: 'set', label: 'How many', min: 0, max: model.count, step: 1, start: 0, tolerance }, run: 'Run',
  reveal: 'What happened, at length enough.', claim: 'A claim of enough length.', entities: ['x'], sources: [{ label: 'Source', url: 'https://example.org' }], seed: 'seed', ...extra,
});
const FLIES: CrossModel = {
  engine: 'cross', locus: { E: 1, e: 0 }, parents: ['Ee', 'Ee'], traits: { E: 'Grey body', e: 'Ebony body' },
  cross: 'grey flies with normal wings, each from an ebony fly and a vestigial one', who: { one: 'fly', many: 'flies' }, count: 320, focus: 'e|V', measure: 'count',
  second: { locus: { V: 1, v: 0 }, parents: ['Vv', 'Vv'], traits: { V: 'Normal wings', v: 'Vestigial wings' }, classes: { 'e|V': 'Ebony with normal wings', 'E|V': 'Grey with normal wings', 'E|v': 'Grey with vestigial wings', 'e|v': 'Ebony with vestigial wings' } },
};
const PEAS: CrossModel = {
  engine: 'cross', locus: { R: 1, r: 0 }, parents: ['Rr', 'Rr'], traits: { R: 'Round', r: 'Wrinkled' }, cross: 'round, yellow pea plants pollinating themselves',
  parentLabels: ['Its egg cells', 'Its pollen'], who: { one: 'seed', many: 'seeds' }, count: 556, focus: 'R|y,r|Y', measure: 'count',
  second: { locus: { Y: 1, y: 0 }, parents: ['Yy', 'Yy'], traits: { Y: 'Yellow', y: 'Green' }, classes: { 'R|Y': 'Round and yellow', 'R|y,r|Y': 'A mix of the grandparents’ looks', 'r|y': 'Wrinkled and green' } },
};
const G6PD: CrossModel = {
  engine: 'cross', locus: { N: 2, g: 1, Y: 2 }, parents: ['Ng', 'NY'], traits: { N: 'Daughter without G6PD deficiency', NY: 'Son without G6PD deficiency', Y: 'G6PD-deficient son' },
  cross: 'carrier mothers with sickle cell trait and fathers with sickle cell disease', parentLabels: ['Mother', 'Father'], who: { one: 'child', many: 'children' }, count: 160, focus: 'NY|S', measure: 'count',
  second: { sex: 'Y', locus: { A: 1, S: 0 }, parents: ['AS', 'SS'], traits: { A: 'Sickle cell trait', S: 'Sickle cell disease' }, classes: { 'NY|S': 'Sons with sickle cell disease but no G6PD deficiency', 'NY|A': 'Sons with neither', 'Y|A,Y|S': 'G6PD-deficient sons', 'N|A,N|S': 'Daughters' } },
};
const SPOTS: CrossModel = {
  engine: 'cross', locus: { M: 1, F: 1 }, parents: ['MF', 'MF'], traits: { M: 'Mother’s at spots 1 and 2', FM: 'One of each at 1 and 2', F: 'Father’s at spots 1 and 2' },
  cross: 'four spots in one drake', spots: ['Chromosome 2 spot', 'Chromosome 5 spot'], who: { one: 'sperm', many: 'sperm' }, count: 320, focus: 'M|P,F|Q', measure: 'count',
  second: { locus: { P: 1, Q: 1 }, parents: ['PQ', 'PQ'], traits: { P: 'Mother’s at spots 3 and 4', PQ: 'One of each at 3 and 4', Q: 'Father’s at spots 3 and 4' }, spots: ['Chromosome 7 spot', 'Chromosome 9 spot'],
    classes: { 'M|P,F|Q': 'Copies from only one of his parents', 'M|PQ,M|Q,FM|P,FM|PQ,FM|Q,F|P,F|PQ': 'A mix of both' } },
};

describe('the cross engine with a second gene', () => {
  it('computes the truth as share × count, exactly, whatever the seed; a union sums its parts and the counts add up', () => {
    expect(runCase(base(FLIES, 10)).truth).toEqual({ kind: 'set', value: 60 });
    expect(runCase(base(PEAS, 24)).truth).toEqual({ kind: 'set', value: 208.5 });
    expect(runCase(base(G6PD, 6)).truth).toEqual({ kind: 'set', value: 20 });
    expect(runCase(base(SPOTS, 8)).truth).toEqual({ kind: 'set', value: 40 });
    for (const seed of ['a', 'b', 'c']) expect(runCase(base(PEAS, 24), seed).truth).toEqual({ kind: 'set', value: 208.5 });
    const run = runCase(base(PEAS, 24)).run as { counts: Record<string, number>; brood: string[]; expectedShare: number };
    expect(Object.values(run.counts).reduce((x, y) => x + y, 0)).toBe(556);
    expect(Object.keys(run.counts).sort()).toEqual(Object.keys(PEAS.second!.classes).sort());
    expect(run.brood[0]).toMatch(/^[Rr]{2}\|[Yy]{2}$/);
    expect(run.expectedShare).toBe(6 / 16);
    expect(judgeCase(base(PEAS, 24), { value: 209 }).success).toBe(true);
    expect(judgeCase(base(PEAS, 24), { value: 278 }).success).toBe(false);
  });

  it('passes its own policing for every model here', () => {
    for (const [m, tol] of [[FLIES, 10], [PEAS, 24], [G6PD, 6], [SPOTS, 8]] as const) expect(caseProblems(base(m, tol)), m.cross).toEqual([]);
  });

  it('writes each line from the model: a single combination, a union, a sex in the label, four spots', () => {
    expect(runCase(base(FLIES, 10)).line).toMatch(/^Grey flies with normal wings, each from an ebony fly and a vestigial one: ebony with normal wings in 3 of every 16 flies, about 60 of 320\. Each gene is dealt separately: ebony body in 1 of every 4 flies, and normal wings in 3 of every 4 of those\. This run had \d+\.$/);
    expect(runCase(base(PEAS, 24)).line).toMatch(/^Round, yellow pea plants pollinating themselves: a mix of the grandparents’ looks in 3 of every 8 seeds, about 209 of 556\. Round and green in 3 of every 16, and wrinkled and yellow in 3 of every 16\. This run had \d+\.$/);
    expect(runCase(base(G6PD, 6)).line).toMatch(/^Carrier mothers with sickle cell trait and fathers with sickle cell disease: sons with sickle cell disease but no G6PD deficiency in 1 of every 8 children, about 20 of 160\. Each gene is dealt separately: son without G6PD deficiency in 1 of every 4 children, and sickle cell disease in half of those\. This run had \d+\.$/);
    expect(runCase(base(SPOTS, 8)).line).toMatch(/^1 sperm in every 8 carries copies from only one of his parents: about 40 of 320\. Mother’s at spots 1 and 2 and mother’s at spots 3 and 4 in 1 of every 16, and father’s at spots 1 and 2 and father’s at spots 3 and 4 in 1 of every 16\. These 320 sperm had \d+\.$/);
    // "all of those", and a label that opens with a capital and a digit keeps its case.
    const all: CrossModel = { ...FLIES, parents: ['Ee', 'Ee'], focus: 'e|V', second: { ...FLIES.second!, parents: ['VV', 'Vv'], classes: { 'e|V': 'G6PD-like ebony', 'E|V': 'Grey' } } };
    expect(runCase(base(all, 10)).line).toMatch(/: G6PD-like ebony in 1 of every 4 flies, about 80 of 320\. Each gene is dealt separately: ebony body in 1 of every 4 flies, and normal wings in all of those\./);
    const half: CrossModel = { ...FLIES, focus: 'e|V', second: { ...FLIES.second!, parents: ['Vv', 'vv'] } };
    expect(runCase(base(half, 10)).line).toMatch(/in 1 of every 8 flies, about 40 of 320\. Each gene is dealt separately: ebony body in 1 of every 4 flies, and normal wings in half of those\./);
  });

  it('refuses a model it would deal or draw wrongly', () => {
    const problems = (second: Partial<SecondGene>, model: Partial<CrossModel> = {}) => caseProblems(base({ ...FLIES, ...model, second: { ...FLIES.second!, ...second } }, 10)).join(' | ');
    expect(problems({ classes: { 'e|V': 'a', 'E|V,E|v': 'b' } })).toMatch(/the cross makes e\|v, which no class counts/);
    expect(problems({ classes: { 'e|V': 'a', 'E|V,e|V': 'b', 'E|v,e|v': 'c' } })).toMatch(/e\|V is counted by 2 classes/);
    expect(problems({ classes: { 'e|V': 'a', 'E|V': 'b', 'E|v': 'c', 'e|v': 'd', 'e|x': 'e' } })).toMatch(/class part "e\|x" is never made by this cross/);
    expect(problems({ classes: { 'e|V': 'a', 'E|V,E|v,e|v': 'b' } }, { focus: 'E|V' })).toMatch(/focus "E\|V" is not a class/);
    expect(problems({ classes: { 'e|V,E|V,E|v,e|v': 'all' } }, { focus: 'e|V,E|V,E|v,e|v' })).toMatch(/1 classes: give 2 to 6/);
    expect(problems({ parents: ['Vv', 'Vx'] })).toMatch(/Bad genotype Vx/);
    expect(problems({ traits: { V: 'Normal wings' } })).toMatch(/offspring trait "v" of the second gene has no label/);
    expect(problems({}, { copying: true })).toMatch(/copying and a second gene never go together/);
    expect(problems({ spots: ['a', 'b'] })).toMatch(/give spots for both genes or for neither/);
    expect(problems({}, { count: 4 })).toMatch(/count must be 8–2000/);
    // The sex letter: declared, ranked with the top allele, carried by one parent once, and never in the second gene.
    const sexed = (second: Partial<SecondGene>, model: Partial<CrossModel> = {}) => caseProblems(base({ ...G6PD, ...model, second: { ...G6PD.second!, ...second } }, 6)).join(' | ');
    expect(sexed({ sex: undefined })).toMatch(/a first-gene Y in a two-gene cross is the Y chromosome or a hen's W: declare it/);
    expect(sexed({}, { locus: { N: 2, g: 1, Y: 1 }, traits: { N: 'a', Yg: 'b' }, focus: 'N|S' })).toMatch(/the sex letter Y must rank level with the first gene's top allele/);
    expect(sexed({}, { parents: ['Ng', 'Ng'] })).toMatch(/exactly one parent carries one Y/);
    expect(sexed({ locus: { A: 1, S: 0, Y: 0 } })).toMatch(/never uses the sex letter Y/);
    // A sex-linked cross names its parents itself: otherwise the father would show as "Son without G6PD deficiency".
    expect(sexed({}, { parentLabels: undefined })).toMatch(/a cross with the sex letter Y names its parents with parentLabels/);
    // A drafter who writes a codominant class in the wrong order is told the spelling the engine uses.
    const cat: CrossModel = { engine: 'cross', locus: { O: 1, o: 1, Y: 1 }, parents: ['Oo', 'oY'], traits: { Oo: 'Tortoiseshell daughter', o: 'Black daughter', OY: 'Orange son', Yo: 'Black son' }, cross: 'a calico queen and a black-and-white tom', parentLabels: ['Queen', 'Tom'], who: { one: 'kitten', many: 'kittens' }, count: 160, focus: 'Oo|S', measure: 'count',
      second: { sex: 'Y', locus: { S: 1, s: 0 }, parents: ['Ss', 'Ss'], traits: { S: 'White patches', s: 'No white' }, classes: { 'Oo|S': 'Calico', 'Oo|s': 'Tortoiseshell', 'o|S,oY|S': 'Black and white', 'o|s,Yo|s': 'Black', 'OY|S,OY|s': 'Orange' } } };
    expect(caseProblems(base(cat, 6)).join(' | ')).toMatch(/class part "oY\|S" is spelled "Yo\|S"/);
  });

  it('leaves the one-gene line alone, except that a label opening with a capital and a digit now keeps its case', () => {
    const one: CrossModel = { engine: 'cross', locus: { N: 2, g: 1, Y: 2 }, parents: ['Ng', 'NY'], traits: { N: 'No deficiency', NY: 'Son without it', Y: 'G6PD-deficient son' }, cross: 'carrier mothers', who: { one: 'child', many: 'children' }, count: 120, focus: 'Y', measure: 'count' };
    expect(runCase(base(one, 7)).line).toMatch(/^Carrier mothers: G6PD-deficient son in 1 of every 4 children, about 30 of 120\. This run had \d+\.$/);
  });
});
