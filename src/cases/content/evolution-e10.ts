import type { PlaceCase } from '../types';

// New cases for evolution-e10: situations its expedition and reels never name (cases/types.ts).
// The pack has no sim, so these play in the population engine: resistance is a variant whose share
// rises under a drug's selection. Bacteria are haploid, so they count by copies (additive) and make
// new resistant copies by mutation. The twists: the BIGGEST infection, not the smallest, goes
// resistant first, because only big populations hold a rare mutant; a drug used alone fails even
// when no resistant cell exists at the start; and a disease reshapes a species in six generations.
// Advantages, sizes and generation counts are a teaching model; each reveal says what was measured.
const FIT = 'Resistance evolving is a variant’s share rising under selection, generation by generation, which is exactly what the population engine computes.';

export const E10_CASES: readonly PlaceCase[] = [
  {
    id: 'c_dwx8030fma',
    archetype: 'population',
    fit: FIT,
    title: 'Four infections, one drug',
    setting: 'Tuberculosis treated with isoniazid alone',
    scenario: 'Isoniazid kills tuberculosis bacteria, but about 1 in a million carries a mutation that resists it. Say four patients take isoniazid alone, with infections of the sizes below, and resistant bacteria leave six times as many offspring on the drug.',
    ask: 'After 12 generations on the drug, in which infection are resistant bacteria most common?',
    model: {
      engine: 'population',
      trait: 'isoniazid resistance',
      who: { one: 'bacterium', many: 'bacteria' },
      demes: [
        { id: 'n100k', label: '100,000 bacteria', size: 100000 },
        { id: 'n1k', label: '1,000 bacteria', size: 1000 },
        { id: 'n10m', label: '10 million bacteria', size: 10000000 },
        { id: 'n10k', label: '10,000 bacteria', size: 10000 },
      ],
      start: 0.000001,
      shows: 'additive',
      fitness: 6,
      mutation: 0.00000001,
      generations: 12,
      replicates: 10,
      measure: 'most',
    },
    call: { kind: 'pick', options: [
      { id: 'n100k', label: '100,000 bacteria' },
      { id: 'n1k', label: '1,000 bacteria' },
      { id: 'n10m', label: '10 million bacteria' },
      { id: 'n10k', label: '10,000 bacteria' },
      { id: 'neither', label: 'No real difference' },
    ] },
    run: 'Run 12 generations',
    reveal: 'Measured: a lung cavity can hold 10 million to a billion tuberculosis bacteria, and may already contain 10 to 1,000 that resist isoniazid before treatment starts; in any large population of these bacteria, a few resistant mutants are there by chance. That is why tuberculosis is treated with several drugs at once. The run’s sizes and advantage are a teaching model.',
    claim: 'A rare resistant mutant is almost certain to exist in a huge population and almost certainly absent from a small one, so big infections go resistant first.',
    entities: ['tuberculosis', 'isoniazid'],
    sources: [
      { label: 'Long 2000, CMAJ 163:425, Drug-resistant tuberculosis (mutant frequencies, cavity sizes)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC80378' },
    ],
    seed: 'e10-tb-cavity',
  },
  {
    id: 'c_7xae27aq5c',
    archetype: 'population',
    fit: FIT,
    title: 'One drug, from a clean start',
    setting: 'Britain · 1946–48',
    scenario: 'In the first randomised trial of streptomycin against tuberculosis, run by Britain’s Medical Research Council, patients took the new drug. Say a patient’s bacteria start with not one resistant cell, mutation makes 1 in every million new copies resistant, and resistant cells leave six times as many offspring on the drug.',
    ask: 'After 15 generations on the drug, how many bacteria in 100 resist it?',
    model: {
      engine: 'population',
      trait: 'streptomycin resistance',
      who: { one: 'bacterium', many: 'bacteria' },
      demes: [{ id: 'patient', label: 'One patient’s lungs', size: 'large' }],
      start: 0,
      shows: 'additive',
      fitness: 6,
      mutation: 0.000001,
      generations: 15,
      replicates: 1,
      measure: 'share',
    },
    call: { kind: 'set', label: 'Resistant in 100', min: 0, max: 100, step: 1, start: 0, tolerance: 10 },
    run: 'Run 15 generations',
    reveal: 'Measured: the 1946–48 trial showed streptomycin worked against tuberculosis, but the bacteria acquired resistance to it. In a huge population, mutation keeps making resistant cells whether or not any exist at the start, and the drug hands each one the field. The mutation rate and advantage here are a teaching model.',
    claim: 'In a large population, mutation supplies resistant variants even when none exist at the start, so a single drug used alone is soon outrun.',
    entities: ['Britain', 'Medical Research Council', 'streptomycin', 'tuberculosis'],
    sources: [
      { label: 'Streptomycin (Wikipedia, revision 1378851738): the 1946–48 MRC trial and acquired resistance', url: 'https://en.wikipedia.org/w/index.php?title=Streptomycin&oldid=1378851738' },
      { label: 'Long 2000, CMAJ 163:425, Drug-resistant tuberculosis (streptomycin-resistant mutants about 1 in a million)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC80378' },
    ],
    seed: 'e10-streptomycin',
  },
  {
    id: 'c_r0mhbg51ve',
    archetype: 'population',
    fit: FIT,
    title: 'Devils against a cancer',
    setting: 'Tasmania · since 1996',
    scenario: 'Since 1996 a contagious cancer, spread by bites, has swept through Tasmanian devils and kills almost every devil it infects. Say a gene version that helps devils resist it starts in 5 of every 100 gene copies, and each copy a devil carries raises its young by half.',
    ask: 'After 6 generations, how many gene copies in 100 are the resisting version?',
    model: {
      engine: 'population',
      trait: 'the resisting version',
      who: { one: 'gene copy', many: 'gene copies' },
      demes: [{ id: 'devils', label: 'Tasmania’s devils', size: 'large' }],
      start: 0.05,
      shows: 'additive',
      fitness: 2,
      generations: 6,
      replicates: 1,
      measure: 'share',
    },
    call: { kind: 'set', label: 'Resisting copies in 100', min: 0, max: 100, step: 1, start: 5, tolerance: 10 },
    run: 'Run 6 generations',
    reveal: 'Measured: devil numbers fell by more than 80% in under 20 years, yet within about four to six devil generations two regions of the genome, holding immune and cancer-related genes, shifted the same way in three separate populations. Strong selection on versions already present works within a handful of generations, but a rare version does not take over that fast. The starting share and advantage are a teaching model.',
    claim: 'Strong selection on variation that already exists shifts a population within a handful of generations, though a rare variant needs longer to dominate.',
    entities: ['Tasmania', 'Tasmanian devils'],
    sources: [
      { label: 'Epstein et al. 2016, Nature Communications 7:12684, Rapid evolutionary response to a transmissible cancer in Tasmanian devils', url: 'https://doi.org/10.1038/ncomms12684' },
    ],
    seed: 'e10-tasmanian-devil-5',
  },
];
