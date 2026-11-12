import type { PlaceCase } from '../types';

// New cases for evolution-e12: situations its expedition and reels never name (cases/types.ts).
// Three new sets of real animals whose traits nest (none of them vertebrates, the pack's set). Finds
// show their traits before Run, so every fitting find is a NEW combination (no find copies an
// animal in the outline), some bring a trait no outlined animal has, and in each case a fitting
// find has more traits than the one that breaks. The breaks differ: (1) the defining traits of two
// sister groups at once; (2) a group's inner traits without the outer trait every member has;
// (3) a trait from deep inside one branch with the defining trait of the other. Each forbidden
// combination is unknown in real animals, so trait loss can't excuse it.
const t = (id: string, label: string, traits: string[]) => ({ id, label, traits });

export const E12_CASES: readonly PlaceCase[] = [
  {
    id: 'c_498fecrp9y',
    archetype: 'grouping',
    title: 'Fangs and wings',
    scenario: 'Spiders and scorpions share chelicerae, fang- or pincer-like mouthparts. Six-legged animals form another group: silverfish, and winged weevils with hard wing cases. All of them have jointed legs and a hard outer skeleton. Collectors send in six finds, each with its traits.',
    ask: 'Which find, if it were real, would have nowhere to go in these groups?',
    model: {
      engine: 'nest',
      traits: [
        { id: 'jointed', label: 'Jointed legs, hard outer skeleton' },
        { id: 'jaws', label: 'Chelicerae (fang mouthparts)' },
        { id: 'sting', label: 'Venom stinger on the tail' },
        { id: 'six', label: 'Six legs' },
        { id: 'wings', label: 'Wings grown from the outer skeleton' },
        { id: 'cases', label: 'Hard wing cases over the wings' },
        { id: 'snout', label: 'Long snout' },
        { id: 'silk', label: 'Silk spinnerets on the belly' },
      ],
      taxa: [
        t('spider', 'Spider', ['jointed', 'jaws']),
        t('scorpion', 'Scorpion', ['jointed', 'jaws', 'sting']),
        t('silverfish', 'Silverfish', ['jointed', 'six']),
        t('weevil', 'Weevil', ['jointed', 'six', 'wings', 'cases', 'snout']),
      ],
      candidates: [
        t('soil', 'Soil find', []),
        t('shore', 'Shore fossil', ['jointed']),
        t('amber', 'Fossil in amber', ['jointed', 'six', 'wings']),
        t('desert', 'Desert find', ['jointed', 'jaws', 'wings']),
        t('cave', 'Cave find', ['jointed', 'jaws', 'silk']),
        t('log', 'Rotting-log find', ['jointed', 'six', 'wings', 'cases']),
      ],
      measure: 'homeless',
    },
    call: { kind: 'pick', options: [
      { id: 'soil', label: 'Soil find' },
      { id: 'shore', label: 'Shore fossil' },
      { id: 'amber', label: 'Fossil in amber' },
      { id: 'desert', label: 'Desert find' },
      { id: 'cave', label: 'Cave find' },
      { id: 'log', label: 'Rotting-log find' },
    ] },
    run: 'Place every find',
    reveal: 'Chelicerae belong to spiders, scorpions, mites and their kin, and among hard-skinned, jointed-legged animals only adults of the six-legged group ever have wings. Those two groups sit apart, so a winged animal with chelicerae would have to sit inside both at once. Every other find, even the four-trait beetle-like one and the silk-spinning one, slots into a group, and none like the desert find has ever turned up.',
    claim: 'Uses groups inside groups to say which combination of traits common descent rules out, even among finds unlike any animal already sorted.',
    entities: ['spiders', 'scorpions', 'silverfish', 'weevils', 'mites'],
    sources: [
      { label: 'Wikipedia: Chelicerata', url: 'https://en.wikipedia.org/wiki/Chelicerata' },
      { label: 'Wikipedia: Insect', url: 'https://en.wikipedia.org/wiki/Insect' },
      { label: 'Wikipedia: Weevil', url: 'https://en.wikipedia.org/wiki/Weevil' },
    ],
    seed: 'e12-jaws-wings-2',
  },
  {
    id: 'c_gsye4vthpw',
    archetype: 'grouping',
    title: 'A squid with no mantle',
    scenario: 'In every mollusc, a mantle, the fleshy body wall, builds the shell: an oyster’s two hinged valves, a cuttlefish’s hidden cuttlebone. Inside that group, some molluscs have two hinged shells and others have sucker-lined arms around the head. Divers report six finds.',
    ask: 'Which find, if it were real, would have nowhere to go in these groups?',
    model: {
      engine: 'nest',
      traits: [
        { id: 'mantle', label: 'A mantle (shell-building body wall)' },
        { id: 'hinged', label: 'Two hinged shells' },
        { id: 'cement', label: 'Cemented to rock by one shell' },
        { id: 'clap', label: 'Swims by clapping its shells' },
        { id: 'suckers', label: 'Sucker-lined arms around the head' },
        { id: 'bone', label: 'Chalky inner shell (cuttlebone)' },
      ],
      taxa: [
        t('oyster', 'Oyster', ['mantle', 'hinged', 'cement']),
        t('cuttlefish', 'Cuttlefish', ['mantle', 'suckers', 'bone']),
      ],
      candidates: [
        t('open', 'Open-sea find', []),
        t('pool', 'Rock-pool find', ['mantle']),
        t('mudflat', 'Mudflat find', ['mantle', 'hinged']),
        t('bay', 'Bay find', ['mantle', 'hinged', 'clap']),
        t('reef', 'Reef find', ['mantle', 'suckers']),
        t('harbour', 'Harbour find', ['suckers', 'bone']),
      ],
      measure: 'homeless',
    },
    call: { kind: 'pick', options: [
      { id: 'open', label: 'Open-sea find' },
      { id: 'pool', label: 'Rock-pool find' },
      { id: 'mudflat', label: 'Mudflat find' },
      { id: 'bay', label: 'Bay find' },
      { id: 'reef', label: 'Reef find' },
      { id: 'harbour', label: 'Harbour find' },
    ] },
    run: 'Place every find',
    reveal: 'Sucker-lined arms and a cuttlebone only occur inside the mollusc group, and every mollusc has a mantle, so an animal with both but no mantle would sit inside a group while lacking the trait that defines it. No such animal is known. The shell-clapping find, with more traits, fits fine: scallops swim exactly that way.',
    claim: 'Sees that nested groups forbid an inner trait turning up without the outer trait that contains it.',
    entities: ['oyster', 'cuttlefish', 'mollusc', 'scallops'],
    sources: [
      { label: 'Wikipedia: Mollusca', url: 'https://en.wikipedia.org/wiki/Mollusca' },
      { label: 'Wikipedia: Cephalopod', url: 'https://en.wikipedia.org/wiki/Cephalopod' },
      { label: 'Wikipedia: Scallop', url: 'https://en.wikipedia.org/wiki/Scallop' },
    ],
    seed: 'e12-no-mantle',
  },
  {
    id: 'c_65jydvwtyh',
    archetype: 'grouping',
    title: 'Stings and stony shells',
    scenario: 'Jellyfish make stinging cells and swim with a pulsing bell. Starfish and sea urchins walk on tube feet, and a sea urchin is also wrapped in a rigid round shell of fused plates. A survey team logs five finds, some unlike anything on the list.',
    ask: 'Which find, if it were real, would have nowhere to go in these groups?',
    model: {
      engine: 'nest',
      traits: [
        { id: 'sting', label: 'Stinging cells (cnidocytes)' },
        { id: 'bell', label: 'Swims with a pulsing bell' },
        { id: 'box', label: 'Box-shaped bell' },
        { id: 'tubefeet', label: 'Tube feet' },
        { id: 'test', label: 'Rigid round shell of fused plates' },
        { id: 'flat', label: 'Flattened into a disc' },
      ],
      taxa: [
        t('jellyfish', 'Jellyfish', ['sting', 'bell']),
        t('starfish', 'Starfish', ['tubefeet']),
        t('urchin', 'Sea urchin', ['tubefeet', 'test']),
      ],
      candidates: [
        t('kelp', 'Kelp-forest find', []),
        t('tidepool', 'Tide-pool find', ['sting']),
        t('ocean', 'Open-ocean find', ['sting', 'bell', 'box']),
        t('reef', 'Reef find', ['sting', 'test']),
        t('sand', 'Sandbar find', ['tubefeet', 'test', 'flat']),
      ],
      measure: 'homeless',
    },
    call: { kind: 'pick', options: [
      { id: 'kelp', label: 'Kelp-forest find' },
      { id: 'tidepool', label: 'Tide-pool find' },
      { id: 'ocean', label: 'Open-ocean find' },
      { id: 'reef', label: 'Reef find' },
      { id: 'sand', label: 'Sandbar find' },
    ] },
    run: 'Place every find',
    reveal: 'A rigid shell of fused plates sits deep inside the tube-feet group, which lies apart from the stinging-cell group, so a stinging animal with that shell would belong to both branches. The box-belled and disc-shaped finds bring traits nobody listed yet still fit: they are box jellyfish and sand dollars. Some sea slugs carry stinging cells stolen from prey, but no animal with tube feet or a fused shell makes its own.',
    claim: 'Places new kinds of animal, even ones with unfamiliar traits, and spots the one combination a branching tree forbids.',
    entities: ['jellyfish', 'starfish', 'sea urchin', 'box jellyfish', 'sand dollars', 'sea slugs'],
    sources: [
      { label: 'Wikipedia: Cnidocyte', url: 'https://en.wikipedia.org/wiki/Cnidocyte' },
      { label: 'Wikipedia: Echinoderm', url: 'https://en.wikipedia.org/wiki/Echinoderm' },
      { label: 'Wikipedia: Sand dollar', url: 'https://en.wikipedia.org/wiki/Sand_dollar' },
    ],
    seed: 'e12-stings-shells',
  },
];
