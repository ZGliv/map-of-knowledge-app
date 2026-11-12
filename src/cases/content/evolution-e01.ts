import type { PlaceCase } from '../types';

// New cases for evolution-e01: situations its expedition and reels never name (cases/types.ts).
// Every tree is an induced subtree of the Open Tree of Life synthetic tree opentree16.1 (CC0),
// fetched 2026-10-17 and collapsed to its branch points. Branches are turned (which changes no
// relationship) so the `of` tip is drawn beside the look-alike the story names (`than`).
const OTOL = { label: 'Open Tree of Life, synthetic tree opentree16.1', url: 'https://tree.opentreeoflife.org/about/synthesis-release/v16.1' };

export const E01_CASES: readonly PlaceCase[] = [
  {
    id: 'c_00qd85m1hv', archetype: 'tree',
    title: 'The mole that isn’t',
    scenario: 'Golden moles tunnel through sand: blind, velvet-furred, with spade-like front claws. They look almost exactly like the European mole of garden lawns. Here both sit on a real family tree of eight living mammals.',
    ask: 'Which animals share a more recent ancestor with the golden mole than the European mole does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((shrew,mole),hedgehog),(((tenrec,gmole),aardvark),anteater)),mmole); turned.
      newick: '(((anteater,(aardvark,(tenrec,gmole))),((mole,shrew),hedgehog)),mmole);',
      tips: { gmole: 'Golden mole', mole: 'European mole', tenrec: 'Tenrec', aardvark: 'Aardvark', anteater: 'Giant anteater', shrew: 'Common shrew', hedgehog: 'Hedgehog', mmole: 'Marsupial mole' },
      of: 'gmole', than: 'mole', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'tenrec', label: 'Tenrec' }, { id: 'aardvark', label: 'Aardvark' }, { id: 'anteater', label: 'Giant anteater' },
      { id: 'shrew', label: 'Common shrew' }, { id: 'hedgehog', label: 'Hedgehog' }, { id: 'mmole', label: 'Marsupial mole' },
    ] },
    run: 'Trace the branches back',
    reveal: 'The golden mole’s closest living relatives are the tenrecs, whose members can look like hedgehogs or shrews. True moles sit on a far branch, and the shrew and hedgehog join there too, no closer. The marsupial mole looks most alike of all and is the most distant: digging shaped all three moles the same way, more than once.',
    claim: 'Relatedness is read from where branches join, not from body shape: two look-alikes can be distant cousins.',
    entities: ['golden mole', 'European mole', 'tenrec', 'aardvark', 'giant anteater', 'common shrew', 'hedgehog', 'marsupial mole'],
    sources: [
      { label: 'Wikipedia: Golden mole', url: 'https://en.wikipedia.org/w/index.php?title=Golden_mole&oldid=1374871382' },
      { label: 'Wikipedia: Tenrec', url: 'https://en.wikipedia.org/w/index.php?title=Tenrec&oldid=1368540185' },
      OTOL,
    ],
    seed: 'e01-golden-mole',
  },
  {
    id: 'c_ae5xsh5e3n', archetype: 'tree',
    title: 'Two pandas',
    scenario: 'The red panda eats bamboo and grips the stems with a long wrist bone that works like a thumb, just as the giant panda does. In the early 1900s most biologists counted the two as relatives. Here both sit on a real family tree of nine living mammals.',
    ask: 'Which animals share a more recent ancestor with the red panda than the giant panda does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((((weasel,raccoon),redpanda),skunk),((brownbear,giantpanda),seal)),fox),meerkat); turned.
      newick: '((((skunk,((raccoon,weasel),redpanda)),((giantpanda,brownbear),seal)),fox),meerkat);',
      tips: { redpanda: 'Red panda', giantpanda: 'Giant panda', raccoon: 'Raccoon', weasel: 'Least weasel', skunk: 'Striped skunk', brownbear: 'Brown bear', seal: 'Harbour seal', fox: 'Red fox', meerkat: 'Meerkat' },
      of: 'redpanda', than: 'giantpanda', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'raccoon', label: 'Raccoon' }, { id: 'weasel', label: 'Least weasel' }, { id: 'skunk', label: 'Striped skunk' },
      { id: 'brownbear', label: 'Brown bear' }, { id: 'seal', label: 'Harbour seal' }, { id: 'fox', label: 'Red fox' }, { id: 'meerkat', label: 'Meerkat' },
    ] },
    run: 'Trace the branches back',
    reveal: 'Genetic studies put the red panda in a family of its own, on the branch with raccoons, skunks and weasels. The giant panda is a bear. Both grip bamboo with a long wrist bone, yet on the tree they are only distant cousins: the shared name and diet say nothing about ancestry.',
    claim: 'A shared name, diet or grip is not evidence of close kinship; the branch points are.',
    entities: ['red panda', 'giant panda', 'raccoon', 'least weasel', 'striped skunk', 'brown bear', 'harbour seal', 'red fox', 'meerkat'],
    sources: [
      { label: 'Wikipedia: Red panda', url: 'https://en.wikipedia.org/w/index.php?title=Red_panda&oldid=1374034403' },
      OTOL,
    ],
    seed: 'e01-red-panda',
  },
  {
    id: 'c_779e9naem6', archetype: 'tree',
    title: 'The lily pad that isn’t',
    scenario: 'The sacred lotus floats round leaves and large flowers on still ponds, much like a water lily, and older plant classifications put the two in the same group. Here both sit on a real family tree of nine seed plants.',
    ask: 'Which plants share a more recent ancestor with the sacred lotus than the water lily does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((((rose,sunflower),(plane,lotus)),(duckweed,magnolia)),lily),amborella),pine); turned.
      newick: '(pine,(amborella,(lily,(((lotus,plane),(rose,sunflower)),(duckweed,magnolia)))));',
      tips: { lotus: 'Sacred lotus', lily: 'White water lily', plane: 'Plane tree', rose: 'Rugosa rose', sunflower: 'Sunflower', duckweed: 'Duckweed', magnolia: 'Magnolia', amborella: 'Amborella', pine: 'Scots pine' },
      of: 'lotus', than: 'lily', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'plane', label: 'Plane tree' }, { id: 'rose', label: 'Rugosa rose' }, { id: 'sunflower', label: 'Sunflower' },
      { id: 'duckweed', label: 'Duckweed' }, { id: 'magnolia', label: 'Magnolia' }, { id: 'amborella', label: 'Amborella' }, { id: 'pine', label: 'Scots pine' },
    ] },
    run: 'Trace the branches back',
    reveal: 'Genetic comparisons put the lotus with plane trees and proteas, its closest living relatives, which are shrubs and trees. The water lily joins much further back, so nearly every flowering plant here is closer to the lotus than it is; only Amborella, the sister of all other flowering plants, and the pine are farther. Plants that took to the water came to look alike.',
    claim: 'Living in the same place can make unrelated things look alike; only shared ancestry places them together on the tree.',
    entities: ['sacred lotus', 'white water lily', 'plane tree', 'rugosa rose', 'sunflower', 'duckweed', 'magnolia', 'Amborella', 'Scots pine', 'proteas'],
    sources: [
      { label: 'Wikipedia: Nelumbo', url: 'https://en.wikipedia.org/w/index.php?title=Nelumbo&oldid=1351117746' },
      { label: 'Wikipedia: Amborella', url: 'https://en.wikipedia.org/w/index.php?title=Amborella&oldid=1380570699' },
      OTOL,
    ],
    seed: 'e01-lotus',
  },
];
