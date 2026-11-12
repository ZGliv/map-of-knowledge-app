import type { PlaceCase } from '../types';

// New cases for evolution-e07: situations its expedition and reels never name (cases/types.ts).
// The pack has no sim, so these play in the tree engine (see `fit`). Every tree is an induced
// subtree of the Open Tree of Life synthetic tree opentree16.1 (CC0), fetched 2026-10-17 and
// collapsed to its branch points; branches are turned so the `of` tip is drawn beside the look-alike
// the story names (`than`).
const OTOL = { label: 'Open Tree of Life, synthetic tree opentree16.1', url: 'https://tree.opentreeoflife.org/about/synthesis-release/v16.1' };
const FIT = 'Each case is two independent lines of evidence landing on one family tree, so reading that pinned tree is the call that shows they agree.';

export const E07_CASES: readonly PlaceCase[] = [
  {
    id: 'c_5rns77x0d4', archetype: 'tree', fit: FIT,
    title: 'Glued to a rock',
    scenario: 'An adult barnacle lives glued to a rock inside a hard shell, like a limpet or a mussel, and early naturalists filed it with the molluscs. Then its swimming larvae were studied, and much later its DNA. Both point to the same place on this real tree.',
    ask: 'Which animals share a more recent ancestor with the barnacle than the limpet does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((limpet,snail),mussel),earthworm),(fly,(crab,barnacle))); turned.
      newick: '((fly,(crab,barnacle)),(((limpet,snail),mussel),earthworm));',
      tips: { barnacle: 'Acorn barnacle', crab: 'Shore crab', fly: 'Housefly', limpet: 'Limpet', snail: 'Garden snail', mussel: 'Blue mussel', earthworm: 'Earthworm' },
      of: 'barnacle', than: 'limpet', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'crab', label: 'Shore crab' }, { id: 'fly', label: 'Housefly' }, { id: 'snail', label: 'Garden snail' },
      { id: 'mussel', label: 'Blue mussel' }, { id: 'earthworm', label: 'Earthworm' },
    ] },
    run: 'Trace the branches back',
    reveal: 'In 1830 barnacle larvae were seen turning into adults, and they matched the larvae of crabs and other crustaceans. A 2010 study of 62 genes put barnacles in the same crustacean group as crabs and lobsters. Insects branch off inside the crustaceans too, so even the housefly is closer to a barnacle than a limpet is. The shell is a disguise: larvae and genes, read separately, tell one story.',
    claim: 'Independent kinds of evidence, such as larvae and DNA, converge on the same branch even when the adult’s looks point elsewhere.',
    entities: ['barnacle', 'shore crab', 'housefly', 'limpet', 'garden snail', 'blue mussel', 'earthworm', 'lobsters'],
    sources: [
      { label: 'Wikipedia: Barnacle', url: 'https://en.wikipedia.org/w/index.php?title=Barnacle&oldid=1376789817' },
      { label: 'Regier et al. 2010, Arthropod relationships revealed by phylogenomic analysis, Nature 463:1079', url: 'https://doi.org/10.1038/nature08742' },
      OTOL,
    ],
    seed: 'e07-barnacle',
  },
  {
    id: 'c_dx11crw7re', archetype: 'tree', fit: FIT,
    title: 'The closed skull',
    scenario: 'A turtle’s skull has no openings behind the eyes, unlike a lizard’s, so turtles were long taken for the last survivors of the oldest reptile line. Then two new lines of evidence came in: whole turtle genomes, and fossils of early turtles that had no shell yet.',
    ask: 'On this real tree, which animals share a more recent ancestor with the turtle than the iguana does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: (kangaroo,(((mallard,croc),turtle),(python,((chameleon,iguana),komodo)))); turned.
      newick: '(kangaroo,(((mallard,croc),turtle),(((iguana,chameleon),komodo),python)));',
      tips: { turtle: 'Green sea turtle', mallard: 'Mallard', croc: 'Saltwater crocodile', iguana: 'Green iguana', chameleon: 'Veiled chameleon', komodo: 'Komodo dragon', python: 'Ball python', kangaroo: 'Red kangaroo' },
      of: 'turtle', than: 'iguana', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'mallard', label: 'Mallard' }, { id: 'croc', label: 'Saltwater crocodile' }, { id: 'chameleon', label: 'Veiled chameleon' },
      { id: 'komodo', label: 'Komodo dragon' }, { id: 'python', label: 'Ball python' }, { id: 'kangaroo', label: 'Red kangaroo' },
    ] },
    run: 'Trace the branches back',
    reveal: 'Genome studies place turtles closer to crocodiles and ducks than to lizards and snakes. The fossils agree from a different direction: early relatives of turtles had small openings in the skull, so the closed skull came later. Two separate kinds of evidence, one branch.',
    claim: 'When genes and fossils, gathered separately, agree on a branch, that agreement is the evidence for common descent.',
    entities: ['green sea turtle', 'mallard', 'saltwater crocodile', 'green iguana', 'veiled chameleon', 'Komodo dragon', 'ball python', 'red kangaroo', 'lizard', 'crocodiles', 'ducks', 'snakes'],
    sources: [
      { label: 'Wikipedia: Turtle', url: 'https://en.wikipedia.org/w/index.php?title=Turtle&oldid=1375970473' },
      OTOL,
    ],
    seed: 'e07-turtle',
  },
  {
    id: 'c_zx594awrmk', archetype: 'tree', fit: FIT,
    title: 'Built like a dog',
    scenario: 'A spotted hyena chases prey on long legs and kills with its teeth, much like a wild dog. But its grooming, scent marking and parenting habits, and its DNA, were compared with the other meat-eating mammals. Here is where it lands on a real tree.',
    ask: 'Which animals share a more recent ancestor with the hyena than the African wild dog does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: (((skunk,walrus),(wilddog,coyote)),((meerkat,hyena),cheetah)); turned.
      newick: '(((walrus,skunk),(coyote,wilddog)),((hyena,meerkat),cheetah));',
      tips: { hyena: 'Spotted hyena', meerkat: 'Meerkat', cheetah: 'Cheetah', wilddog: 'African wild dog', coyote: 'Coyote', walrus: 'Walrus', skunk: 'Striped skunk' },
      of: 'hyena', than: 'wilddog', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'meerkat', label: 'Meerkat' }, { id: 'cheetah', label: 'Cheetah' }, { id: 'coyote', label: 'Coyote' }, { id: 'walrus', label: 'Walrus' }, { id: 'skunk', label: 'Striped skunk' },
    ] },
    run: 'Trace the branches back',
    reveal: 'Hyenas belong to the cat-like branch of meat-eating mammals, with mongooses such as the meerkat, and with cats. Their DNA and their habits agree on this; the dog-like build evolved separately, for the same chase-and-bite way of hunting.',
    claim: 'A body built for the same job can mislead; behaviour and DNA, read independently, place an animal on its real branch.',
    entities: ['spotted hyena', 'meerkat', 'cheetah', 'African wild dog', 'coyote', 'walrus', 'striped skunk', 'mongooses'],
    sources: [
      { label: 'Wikipedia: Hyena', url: 'https://en.wikipedia.org/w/index.php?title=Hyena&oldid=1376496654' },
      { label: 'Wikipedia: Meerkat', url: 'https://en.wikipedia.org/w/index.php?title=Meerkat&oldid=1376329007' },
      OTOL,
    ],
    seed: 'e07-hyena',
  },
];
