import type { PlaceCase } from '../types';

// New cases for evolution-e08: situations its expedition and reels never name (cases/types.ts).
// The pack ranks whole crises; these ask which group a crisis hit hardest, from how it killed.
// Lamp shells (brachiopods) and clams (bivalves) both sieve food inside two shells, but lamp
// shells live slowly and breathe weakly, so the oxygen-stripping crises (end-Permian, Late
// Devonian) treat them very differently; the asteroid, which starved plankton-sievers, turns
// the clams from best survivors into worst losers. Values: case 1 from Wikipedia's end-Permian
// table (100 minus the share of genera lost); cases 2 and 3 computed from Sepkoski's genus
// compendium via Sepkoski Online, as the share of genera entering the crisis stage (Frasnian,
// Maastrichtian) that ended in it, X-bL / (X-bL + X-bt), rounded:
//   Frasnian: Articulata 78/109, Demospongia 24/44, Crinoidea 12/34, Ostracoda 30/94,
//             Bivalvia 7/31, Gastropoda 14/78 (Anthozoa 63/84 left out: corals are in the pack).
//   Maastrichtian: Bivalvia 218/331, Echinoidea 68/117, Gastropoda 123/297, Stenolaemata +
//             Gymnolaemata (46+27)/(127+100), Ostracoda 24/119, Asteroidea 4/26 (Articulata
//             22/33 is a tie with clams and is named in the reveal; Cephalopoda are the pack's ammonites).
export const E08_CASES: readonly PlaceCase[] = [
  {
    id: 'c_b4rt9s4s1w',
    archetype: 'chart',
    title: 'Two shells, two fates',
    setting: 'Sea floors worldwide · 252 million years ago',
    scenario: 'The end-Permian crisis warmed the seas and stripped them of oxygen. On the sea floor, lamp shells and clams both filtered food from the water inside two shells, but lamp shells burn energy at a third to a tenth of a clam’s rate. Sea lilies, moss animals, seed shrimps and sea snails lived there too.',
    ask: 'Which group kept the largest share of its genera?',
    model: {
      engine: 'chart', unit: 'in every 100 genera came through', measure: 'biggest',
      bars: [
        { id: 'clams', label: 'Clams', value: 41 },
        { id: 'lampshells', label: 'Lamp shells', value: 4 },
        { id: 'sealilies', label: 'Sea lilies', value: 2 },
        { id: 'moss', label: 'Moss animals', value: 21 },
        { id: 'seedshrimps', label: 'Seed shrimps', value: 26 },
        { id: 'snails', label: 'Sea snails', value: 2 },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'clams', label: 'Clams' },
      { id: 'lampshells', label: 'Lamp shells' },
      { id: 'sealilies', label: 'Sea lilies' },
      { id: 'moss', label: 'Moss animals' },
      { id: 'seedshrimps', label: 'Seed shrimps' },
      { id: 'snails', label: 'Sea snails' },
    ] },
    run: 'Show the survivors',
    reveal: 'Slow-living animals with weak breathing were among the most vulnerable when the seas warmed and lost their oxygen, so the crisis was moderately severe for clams but devastating for lamp shells, though chance may have played a part too. Today clams fill most of the places on the sea floor that lamp shells once held.',
    claim: 'Predicts which group survives a crisis from how the crisis killed and how each group lives, not from which group seems stronger.',
    entities: ['lamp shells', 'clams', 'sea lilies', 'moss animals', 'seed shrimps', 'sea snails'],
    sources: [
      { label: 'Wikipedia: Permian–Triassic extinction event (marine genera table)', url: 'https://en.wikipedia.org/wiki/Permian%E2%80%93Triassic_extinction_event' },
      { label: 'Wikipedia: Brachiopod', url: 'https://en.wikipedia.org/wiki/Brachiopod' },
      { label: 'Wikipedia: Bivalvia', url: 'https://en.wikipedia.org/wiki/Bivalvia' },
    ],
    seed: 'e08-permian-shells',
  },
  {
    id: 'c_q4eb142895',
    archetype: 'chart',
    title: 'Breathless shallow seas',
    setting: 'Shallow seas worldwide · 372 million years ago',
    scenario: 'In the Late Devonian crisis, warm shallow seas lost their oxygen. On those sea floors, sponges pumped water through their whole bodies, clams pumped it over gills, and lamp shells ran their bodies at a third to a tenth of a clam’s energy use. Sea lilies, seed shrimps and sea snails lived there too.',
    ask: 'Which group lost the largest share of its genera?',
    model: {
      engine: 'chart', unit: 'in every 100 genera died out', measure: 'biggest',
      bars: [
        { id: 'sponges', label: 'Sponges', value: 55 },
        { id: 'sealilies', label: 'Sea lilies', value: 35 },
        { id: 'lampshells', label: 'Lamp shells', value: 72 },
        { id: 'seedshrimps', label: 'Seed shrimps', value: 32 },
        { id: 'clams', label: 'Clams', value: 23 },
        { id: 'snails', label: 'Sea snails', value: 18 },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'sponges', label: 'Sponges' },
      { id: 'sealilies', label: 'Sea lilies' },
      { id: 'lampshells', label: 'Lamp shells' },
      { id: 'seedshrimps', label: 'Seed shrimps' },
      { id: 'clams', label: 'Clams' },
      { id: 'snails', label: 'Sea snails' },
    ] },
    run: 'Show the losses',
    reveal: 'In Sepkoski’s count of fossil genera, lamp shells lost the most of these groups at the end of the Frasnian, the stage the crisis closed. Animals with slow metabolisms and weak breathing struggle when warm water loses its oxygen, and this crisis hit warm, shallow-water life hardest.',
    claim: 'Carries one mechanism (oxygen loss punishes slow, weak breathers) from one crisis to another to predict who suffers most.',
    entities: ['sponges', 'sea lilies', 'lamp shells', 'seed shrimps', 'clams', 'sea snails'],
    sources: [
      { label: 'Sepkoski Online (S. E. Peters), Sepkoski 2002 genus compendium: Frasnian counts by class', url: 'https://strata.geology.wisc.edu/jack/' },
      { label: 'Wikipedia: Late Devonian extinction', url: 'https://en.wikipedia.org/wiki/Late_Devonian_extinction' },
      { label: 'Wikipedia: Brachiopod', url: 'https://en.wikipedia.org/wiki/Brachiopod' },
    ],
    seed: 'e08-devonian-shells',
  },
  {
    id: 'c_575x0cqfbj',
    archetype: 'chart',
    title: 'When the plankton stopped',
    setting: 'Seas worldwide · 66 million years ago',
    scenario: 'After the asteroid, dust and soot blocked the sun and the plankton in the sea stopped growing. Clams sieve living plankton from the water; sea snails mostly graze, hunt or scavenge. Sea urchins, moss animals, seed shrimps and starfish lived on the same sea floors.',
    ask: 'Which group lost the largest share of its genera?',
    model: {
      engine: 'chart', unit: 'in every 100 genera died out', measure: 'biggest',
      bars: [
        { id: 'snails', label: 'Sea snails', value: 41 },
        { id: 'urchins', label: 'Sea urchins', value: 58 },
        { id: 'clams', label: 'Clams', value: 66 },
        { id: 'moss', label: 'Moss animals', value: 32 },
        { id: 'seedshrimps', label: 'Seed shrimps', value: 20 },
        { id: 'starfish', label: 'Starfish', value: 15 },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'snails', label: 'Sea snails' },
      { id: 'urchins', label: 'Sea urchins' },
      { id: 'clams', label: 'Clams' },
      { id: 'moss', label: 'Moss animals' },
      { id: 'seedshrimps', label: 'Seed shrimps' },
      { id: 'starfish', label: 'Starfish' },
    ] },
    run: 'Show the losses',
    reveal: 'The same clams that came through the oxygen crises well lost the most here: they sieve living plankton, and the clams common afterwards were mostly deposit feeders, eating dead matter in the mud. Other sievers varied (lamp shells lost a similar share in Sepkoski’s count, moss animals fewer), so diet tilts the odds rather than settling them. Survival depends on how a crisis kills, not on being tough.',
    claim: 'Sees that the same group can thrive in one crisis and suffer most in another, because what matters is how each crisis kills.',
    entities: ['sea snails', 'sea urchins', 'clams', 'moss animals', 'seed shrimps', 'starfish', 'lamp shells'],
    sources: [
      { label: 'Sepkoski Online (S. E. Peters), Sepkoski 2002 genus compendium: Maastrichtian counts by class', url: 'https://strata.geology.wisc.edu/jack/' },
      { label: 'Wikipedia: Cretaceous–Paleogene extinction event', url: 'https://en.wikipedia.org/wiki/Cretaceous%E2%80%93Paleogene_extinction_event' },
    ],
    seed: 'e08-kpg-clams',
  },
];
