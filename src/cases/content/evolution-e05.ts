import type { PlaceCase } from '../types';

// New cases for evolution-e05: situations its expedition and reels never name (cases/types.ts).
// The pack's map-spread sim has no case engine, so these play in the population engine with what
// a split is made of: two populations, each with its own pressure (per-population fitness), a share
// of migrants crossing between them every generation (migration), and the call is how far apart they
// end (gap). The twists: selection can pull two groups apart even while fish swim between them; a
// strong flow of migrants holds two groups together even under opposite pressures; and a small
// cut-off population drifts away from its relatives with no selection at all.
// Pressures, migrant shares and sizes are a teaching model; each reveal says what was measured.
const FIT = 'No case engine draws spread on a map; a split plays as two populations with their own pressures and a share of migrants between them, and the call is how far apart they end.';

export const E05_CASES: readonly PlaceCase[] = [
  {
    id: 'c_r8h7kk8x23',
    archetype: 'population',
    fit: FIT,
    title: 'Beach fish and river fish',
    setting: 'Lake Washington, Seattle · since 1937',
    scenario: 'Sockeye salmon released into Lake Washington, near Seattle, in 1937–45 now spawn in two places: a river and a lake beach. Fish swim between the sites, and each generation some cross to breed. Say a deep body helps beach spawners but slows fish in the river current, and half of every group starts deep-bodied.',
    ask: 'After 13 generations, how far apart are beach and river, in deep-bodied fish per 100?',
    model: {
      engine: 'population',
      trait: 'a deep body',
      who: { one: 'fish', many: 'fish' },
      demes: [
        { id: 'beach', label: 'Beach spawners', size: 'large', fitness: 1.25 },
        { id: 'river', label: 'River spawners', size: 'large', fitness: 0.8 },
      ],
      start: 0.5,
      shows: 'additive',
      fitness: 1,
      migration: 0.1,
      generations: 13,
      replicates: 1,
      measure: 'gap',
    },
    call: { kind: 'set', label: 'Gap in 100', min: 0, max: 100, step: 1, start: 0, tolerance: 10 },
    run: 'Run 13 generations',
    reveal: 'Measured: within about 13 generations, beach males had become deeper-bodied than river males and river females larger, and river-born fish rarely bred successfully at the beach, though fish swam between the sites. Opposite pressures pulled the two groups apart faster than crossing fish could blend them: the first step toward a split. The pressures and migrant share are a teaching model.',
    claim: 'Opposite selection in two places can pull populations apart even while some individuals still move between them.',
    entities: ['sockeye salmon', 'Lake Washington', 'Seattle'],
    sources: [
      { label: 'Hendry et al. 2000, Science 290:516, Rapid evolution of reproductive isolation in the wild: evidence from introduced salmon', url: 'https://doi.org/10.1126/science.290.5491.516' },
      { label: 'University of Washington news, 2000: Transplanted sockeye salmon show rapid differentiation', url: 'https://www.washington.edu/news/2000/10/19/transplanted-sockeye-salmon-show-rapid-differentiation/' },
    ],
    seed: 'e05-sockeye-gap',
  },
  {
    id: 'c_5b90xv5v25',
    archetype: 'population',
    fit: FIT,
    title: 'The stream that never quite split',
    setting: 'Misty Lake, Vancouver Island',
    scenario: 'Sticklebacks live in Misty Lake and in the stream flowing out of it. Stream fish do best with a stream body shape, lake fish with a lake shape, and the push each way is strong. But every generation, lake fish wash down the outlet: say 3 in 10 outlet parents come from the mix.',
    ask: 'After 100 generations, how far apart are outlet and lake, in stream-shaped fish per 100?',
    model: {
      engine: 'population',
      trait: 'a stream body shape',
      who: { one: 'fish', many: 'fish' },
      demes: [
        { id: 'outlet', label: 'Outlet stream', size: 'large', fitness: 1.4 },
        { id: 'lake', label: 'Misty Lake', size: 'large', fitness: 0.7 },
      ],
      start: 0.5,
      shows: 'additive',
      fitness: 1,
      migration: 0.3,
      generations: 100,
      replicates: 1,
      measure: 'gap',
    },
    call: { kind: 'set', label: 'Gap in 100', min: 0, max: 100, step: 1, start: 100, tolerance: 10 },
    run: 'Run 100 generations',
    reveal: 'Measured: outlet sticklebacks are in between lake and stream fish in shape, and gene flow from the lake into the outlet is far higher than into the inlet stream. One estimate is that this flow holds back the outlet fish’s adaptation by 80 to 86 percent. Strong opposite pressures are not enough to split two groups while many migrants keep crossing.',
    claim: 'A steady flow of migrants can hold two populations together even when selection pulls them opposite ways.',
    entities: ['sticklebacks', 'Misty Lake', 'Vancouver Island'],
    sources: [
      { label: 'Hendry, Taylor & McPhail 2002, Evolution 56:1199, Adaptive divergence and the balance between selection and gene flow: lake and stream stickleback in the Misty system', url: 'https://doi.org/10.1111/j.0014-3820.2002.tb01432.x' },
      { label: 'Moore, Gow, Taylor & Hendry 2007, Evolution 61:2015, Quantifying the constraining influence of gene flow on adaptive divergence in the lake-stream stickleback system', url: 'https://doi.org/10.1111/j.1558-5646.2007.00168.x' },
    ],
    seed: 'e05-misty-outlet',
  },
  {
    id: 'c_2bhayfz13w',
    archetype: 'population',
    fit: FIT,
    title: 'Fish in a desert cave',
    setting: 'Devils Hole, near Death Valley',
    scenario: 'Devils Hole is a water-filled cave in the desert near Death Valley, holding a few hundred pupfish at most, cut off from every other pupfish. Take a harmless gene version, with no effect on survival, in half the cave fish and half of a large population of their relatives.',
    ask: 'After 500 generations, how far apart are the cave and its relatives, in fish per 100 with that version?',
    model: {
      engine: 'population',
      trait: 'the harmless version',
      who: { one: 'fish', many: 'fish' },
      demes: [
        { id: 'hole', label: 'Devils Hole · 300', size: 300 },
        { id: 'kin', label: 'Large relatives', size: 'large' },
      ],
      start: 0.5,
      shows: 'additive',
      fitness: 1,
      migration: 0,
      generations: 500,
      replicates: 40,
      measure: 'gap',
    },
    call: { kind: 'set', label: 'Gap in 100', min: 0, max: 100, step: 1, start: 0, tolerance: 10 },
    run: 'Run 500 generations',
    reveal: 'Measured: from 1970 to 1996 Devils Hole held 324 pupfish on average, and they are among the most inbred vertebrates known. Cut off and small, a population drifts away from its relatives by chance alone, with no selection at all; across many genes that adds up to a distinct population. How long the fish have been in the cave is still debated; the sizes are a teaching model.',
    claim: 'A small population cut off from gene flow drifts away from its relatives even with no selection.',
    entities: ['pupfish', 'Death Valley', 'Devils Hole'],
    sources: [
      { label: 'Devils Hole pupfish (Wikipedia, revision 1379961624): population counts, inbreeding, debated age', url: 'https://en.wikipedia.org/w/index.php?title=Devils_Hole_pupfish&oldid=1379961624' },
    ],
    seed: 'e05-hole-drift',
  },
];
