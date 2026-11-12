import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const LUNGFISH = 'South_American_lungfish_(Lepidosiren_paradoxa).jpg';

// Trees pinned from the Open Tree of Life synthetic tree opentree16.1 (CC0), induced
// subtrees fetched 2026-10-16 and collapsed to their branch points. `pinned` is the
// tree as fetched; `newick` is the same tree with branches turned so that names sit
// next to misleading neighbours (a test proves the two are the same tree).
const VERTEBRATES_PINNED = '((((((Homo_sapiens,(Bos_taurus,(Balaenoptera_musculus,Hippopotamus_amphibius))),((Passer_domesticus,Crocodylus_niloticus),Podarcis_muralis)),Rana_temporaria),Lepidosiren_paradoxa),Salmo_salar),Carcharodon_carcharias);';
const VERTEBRATES_SHOWN = '(Carcharodon_carcharias,(Salmo_salar,(Lepidosiren_paradoxa,(((((Balaenoptera_musculus,Hippopotamus_amphibius),Bos_taurus),Homo_sapiens),((Passer_domesticus,Crocodylus_niloticus),Podarcis_muralis)),Rana_temporaria))));';
const EUKARYOTES_PINNED = '(((Quercus_robur,Triticum_aestivum),Physcomitrella_patens),(((Octopus_vulgaris,Apis_mellifera),Aurelia_aurita),(Agaricus_bisporus,Saccharomyces_cerevisiae)));';
const EUKARYOTES_SHOWN = '(((Quercus_robur,Triticum_aestivum),Physcomitrella_patens),((Agaricus_bisporus,Saccharomyces_cerevisiae),(Aurelia_aurita,(Octopus_vulgaris,Apis_mellifera))));';

// E01 "Who's your closest cousin?". Arc: mystery. The learner reads a real tree before
// being told how, meets Darwin's own tree simile (Origin, 1st ed., Project Gutenberg #1228,
// verbatim), then reads a tree it has never seen. No "higher" or "lower" anywhere.
export const evolutionE01: Pack = {
  id: 'evolution-e01',
  title: 'Who’s your closest cousin?',
  question: 'What does it mean for two living things to be related?',
  path: ['Life', 'Evolution', 'Tree thinking', 'Reading trees'],
  hue: 130,
  minutes: 8,
  media: {
    notebook: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Darwin_Tree_1837.png/1280px-Darwin_Tree_1837.png',
      alt: 'A page of Darwin’s notebook: the words “I think” above a small branching tree with lettered tips, and handwriting below',
      credit: 'Charles Darwin, Notebook B, page 36, 1837 · Public domain', page: commons('Darwin_Tree_1837.png'), date: '1837',
      tone: 'ink', license: 'Public domain',
    },
    lungfish: {
      src: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/${encodeURIComponent(LUNGFISH)}/960px-${encodeURIComponent(LUNGFISH)}`,
      alt: 'A long, grey, eel-shaped South American lungfish resting on gravel in an aquarium, a thin threadlike fin by its head',
      credit: 'JSutton93 · CC BY-SA 4.0', page: commons(LUNGFISH), date: '2018', license: 'CC BY-SA 4.0',
    },
    caecilian: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Caecilia_tentaculata_109865573.jpg/960px-Caecilia_tentaculata_109865573.jpg',
      alt: 'A long, smooth, grey, legless animal, like a giant earthworm, crossing orange gravel',
      credit: 'yvesbas, via iNaturalist · CC BY 4.0', page: commons('Caecilia_tentaculata_109865573.jpg'), date: '2016', license: 'CC BY 4.0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'notebook', title: 'Who’s your closest cousin?',
      hook: 'In 1837, in a notebook, Charles Darwin wrote “I think” and drew this: species branching like a tree from one ancestor. Biologists still picture all of life this way. The rest of us often read such pictures wrong.',
      focus: [60, 5],
    },
    {
      kind: 'sim', sim: 'treeSpin', title: 'Eleven cousins',
      goal: 'Every animal on this tree is alive today. Wherever two branches join stands an ancestor they share.',
      params: {
        newick: VERTEBRATES_SHOWN, pinned: VERTEBRATES_PINNED,
        tips: {
          Carcharodon_carcharias: 'Shark', Salmo_salar: 'Salmon', Lepidosiren_paradoxa: 'Lungfish', Rana_temporaria: 'Frog',
          Podarcis_muralis: 'Lizard', Crocodylus_niloticus: 'Crocodile', Passer_domesticus: 'Sparrow', Homo_sapiens: 'Human',
          Bos_taurus: 'Cow', Hippopotamus_amphibius: 'Hippo', Balaenoptera_musculus: 'Blue whale',
        },
        credit: 'Tree: Open Tree of Life, synthesis opentree16.1 (CC0). Species: great white shark, Atlantic salmon, South American lungfish, common frog, wall lizard, Nile crocodile, house sparrow, human, cow, hippo, blue whale.',
        figure: { media: 'lungfish', caption: 'A South American lungfish. It breathes air.' },
        tasks: [
          {
            kind: 'closer', gradeId: 'lungfish',
            ask: 'Is the lungfish more closely related to the salmon or to the cow?',
            of: 'Lepidosiren_paradoxa', options: ['Salmo_salar', 'Bos_taurus'], tie: 'Equally related to both',
            feedback: {
              Salmo_salar: 'It sits next to the salmon, and it looks like a fish because it is one. But follow the branches back: the lungfish meets the cow at a more recent ancestor.',
              tie: 'Trace each pair back to where their branches meet. The two meeting points aren’t the same one.',
            },
            explain: 'The cow. Follow the lungfish and the cow back until their branches meet, then do the same for the salmon: the cow’s meeting point is further right, so more recent. Lungfish breathe with lungs that match ours, and they are the closest living relatives of every four-limbed animal.',
          },
          {
            kind: 'spin', gradeId: 'spin', minSpins: 3,
            prompt: 'Tap any branch point to swap its two branches. Turn three of them.',
            ask: 'You have moved animals next to new neighbours. What changed?',
            choices: [
              { id: 'neighbours', label: 'Animals now side by side became closer relatives', feedback: 'Being drawn side by side means nothing. Relatedness is where branches join, and no join moved.' },
              { id: 'top', label: 'The animal now at the top is the most advanced', feedback: 'Top, bottom, left and right carry no meaning on a tree. All eleven animals are alive today, and none is more evolved than another.' },
              { id: 'nothing', label: 'No animal gained or lost a closer relative' },
              { id: 'bottom', label: 'The animals now at the bottom evolved first', feedback: 'Every line on this tree has been evolving for the same length of time since the shared ancestor at the root.' },
            ],
            answer: 'nothing',
            explain: 'Nothing changed. A tree is like a hanging mobile: spin any branch point and the same groups still hang together. What counts is where branches join, not which name sits next to which.',
          },
          {
            kind: 'tapTip', gradeId: 'whale',
            ask: 'Tap the blue whale’s closest relative on this tree.',
            of: 'Balaenoptera_musculus',
            explain: 'The hippo. Whales and hippos share an ancestor more recent than the one either shares with the cow. Blood proteins, DNA and fossils all point that way, though naturalists once classed hippos with pigs.',
          },
        ],
      },
      grades: [{ gradeId: 'lungfish' }, { gradeId: 'spin' }, { gradeId: 'whale' }],
    },
    {
      kind: 'source', gradeId: 'darwin-tree',
      source: { title: 'On the Origin of Species (1859)', detail: 'Charles Darwin · 1st edition, chapter IV, last paragraph', page: 'https://www.gutenberg.org/ebooks/1228' },
      passage: [
        'The affinities of all the beings of the same class have sometimes been represented by a great tree. I believe this simile largely speaks the truth. [[The green and budding twigs may represent existing species|twigs]]; and those produced during each former year may represent the long succession of extinct species.',
        '… As we here and there see a thin straggling branch springing from a fork low down in a tree, and which by some chance has been favoured and is still alive on its summit, so we occasionally see an animal like the Ornithorhynchus or [[Lepidosiren|lepidosiren]], which in some small degree connects by its affinities two large branches of life …',
        'As buds give rise by growth to fresh buds, and these, if vigorous, branch out and overtop on all sides many a feebler branch, so by generation I believe it has been with the great Tree of Life, which [[fills with its dead and broken branches the crust of the earth|dead]], and covers the surface with its ever branching and beautiful ramifications.',
      ],
      notes: {
        twigs: 'Every living species is a twig tip. Twigs don’t sprout from other twigs’ tips: no species alive today is the ancestor of another.',
        lepidosiren: 'The South American lungfish, on the tree you just read. Ornithorhynchus is the platypus.',
        dead: 'The extinct branches: fossils in the rocks.',
      },
      question: {
        prompt: 'In Darwin’s picture, where are the species alive today?',
        choices: [
          { id: 'trunk', label: 'Along the trunk, the oldest at the bottom', feedback: 'The trunk and branches are ancestors, long gone. Today’s species are only at the tips.' },
          { id: 'tips', label: 'At the tips of the twigs, all of them at once' },
          { id: 'top', label: 'At the very top, with the most advanced highest', feedback: 'Twigs grow out on all sides. Height on a tree means nothing.' },
          { id: 'forks', label: 'At the forks where branches split', feedback: 'Forks are where lines divided, long ago. The living are at the ends.' },
        ],
        answer: 'tips',
        explain: 'At the tips, all at once. The forks are shared ancestors, and the dead branches are extinct lines.',
      },
    },
    {
      kind: 'flaw', gradeId: 'chimps',
      prompt: '“If humans came from chimps, why are there still chimps?” Here is the reasoning behind that question. Which step breaks?',
      steps: [
        { id: 'a', text: 'Evolution says humans and chimpanzees are related.' },
        { id: 'b', text: 'Chimpanzees and bonobos are our closest living relatives.' },
        { id: 'c', text: 'So humans evolved from chimpanzees, and the chimps that are left should have become human too.' },
      ],
      answer: 'c',
      explain: 'Closest relatives are cousins, not grandparents. Humans and chimpanzees share an ancestor that was neither. Since the two lines split, both have kept evolving, for exactly the same length of time.',
    },
    {
      kind: 'match', gradeId: 'tetrapods', transfer: true, buckets: true, media: 'caecilian',
      prompt: 'One branch of the tree holds the first four-limbed animal and every one of its descendants: the tetrapods. Sort these animals. On that branch or not?',
      left: [
        { id: 'snake', label: 'Snake' },
        { id: 'tuna', label: 'Tuna' },
        { id: 'caecilian', label: 'Caecilian (pictured)' },
        { id: 'coelacanth', label: 'Coelacanth, a fish with fleshy fins' },
        { id: 'bat', label: 'Bat' },
        { id: 'seahorse', label: 'Seahorse' },
        { id: 'manatee', label: 'Manatee' },
        { id: 'lamprey', label: 'Lamprey' },
      ],
      right: [{ id: 'in', label: 'Tetrapod' }, { id: 'out', label: 'Not a tetrapod' }],
      pairs: { snake: 'in', tuna: 'out', caecilian: 'in', coelacanth: 'out', bat: 'in', seahorse: 'out', manatee: 'in', lamprey: 'out' },
      explain: 'Snakes and caecilians (legless amphibians) have no legs, and manatees have no hind legs, yet all descend from four-limbed ancestors, so all are tetrapods. A branch is defined by ancestry, not looks. The coelacanth has fleshy fins like the lungfish, but its line split off a little earlier.',
    },
    {
      kind: 'sim', sim: 'treeSpin', title: 'Mushroom, oak or bee?',
      goal: 'A tree you haven’t seen: plants, fungi and animals. The same rules hold.',
      params: {
        newick: EUKARYOTES_SHOWN, pinned: EUKARYOTES_PINNED,
        tips: {
          Quercus_robur: 'Oak', Triticum_aestivum: 'Wheat', Physcomitrella_patens: 'Moss', Agaricus_bisporus: 'Mushroom',
          Saccharomyces_cerevisiae: 'Baker’s yeast', Aurelia_aurita: 'Jellyfish', Octopus_vulgaris: 'Octopus', Apis_mellifera: 'Honeybee',
        },
        credit: 'Tree: Open Tree of Life, synthesis opentree16.1 (CC0). Species: English oak, bread wheat, the moss Physcomitrium patens, button mushroom, baker’s yeast, moon jellyfish, common octopus, western honeybee.',
        tasks: [
          {
            kind: 'tapNode', gradeId: 'mushroom-bee', transfer: true,
            ask: 'Tap the most recent ancestor that the mushroom shares with the honeybee.',
            pair: ['Agaricus_bisporus', 'Apis_mellifera'],
            explain: 'That branch point is the ancestor of every fungus and every animal here, and of nothing else. So a mushroom is more closely related to a honeybee, an octopus or you than to an oak. Fungi were long filed with plants; DNA comparisons put them beside the animals. Their cell walls contain chitin, the same material as insect shells.',
          },
        ],
      },
      grades: [{ gradeId: 'mushroom-bee', transfer: true }],
    },
    {
      kind: 'payoff',
      idea: 'All life is one family tree. Your closest cousin is the one you share the most recent ancestor with, wherever the drawing puts it.',
      connections: [
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'Earth’s history in one day', place: 'Life › Evolution › Deep time' },
        { title: 'The long walk out of Africa', place: 'Life › Evolution › Human evolution' },
        { title: 'The salamander ring', place: 'Life › Evolution › New species', to: 'evolution-e05' },
      ],
    },
  ],
  provenance: [
    { claim: 'Darwin’s 1837 sketch in Notebook B (page 36), under the words “I think”: species branching from a common ancestor (marked 1)', source: 'Wikipedia: Inception of Darwin’s theory (Notebook B, mid-July 1837; “With the words ‘I think’, he sketched a diagram”); Wikimedia Commons: File:Darwin Tree 1837.png description' },
    { claim: 'Tree topologies for 11 vertebrates and 8 eukaryotes', source: 'Open Tree of Life synthetic tree opentree16.1 (taxonomy 3.7draft3), induced_subtree API, fetched 2026-10-16; CC0' },
    { claim: 'Lungfish are the closest living relatives of tetrapods; their lungs are homologous to tetrapod lungs; they breathe air; coelacanths branched slightly earlier', source: 'Wikipedia: Lungfish (rev 1377158835)' },
    { claim: 'Hippos’ closest living relatives are cetaceans, shown by blood proteins, molecular systematics, DNA and fossils; naturalists classed hippos with pigs until 1909', source: 'Wikipedia: Hippopotamus (rev 1380577215)' },
    { claim: 'Darwin’s tree simile, including Ornithorhynchus and Lepidosiren (verbatim)', source: 'Darwin, On the Origin of Species, 1st ed. 1859, chapter IV, last paragraph; Project Gutenberg #1228' },
    { claim: 'Lepidosiren is the South American lungfish genus; Ornithorhynchus is the platypus genus', source: 'Wikipedia: South American lungfish; Platypus' },
    { claim: 'Chimpanzees and bonobos are humans’ closest living relatives; humans and Pan share a last common ancestor, and both lines evolved since the split', source: 'Wikipedia: Chimpanzee (lead); Chimpanzee–human last common ancestor (rev 1374198374)' },
    { claim: 'Tetrapoda includes every descendant of four-limbed ancestors, including limbless snakes and caecilians and two-limbed cetaceans and sirenians', source: 'Wikipedia: Tetrapod (rev 1379823950)' },
    { claim: 'Fungi and animals form the opisthokont clade; fungi are more closely related to animals than to plants; fungi were classed as plants before molecular phylogenetics; fungal cell walls contain chitin, which is also a primary component of insect exoskeletons', source: 'Wikipedia: Fungus (rev 1380255362); Opisthokont (rev 1363243090); Chitin (lead)' },
    { claim: 'Misconceptions: neighbouring tips read as closest (#19), top/right read as advanced (#20), bottom/left read as ancestral (#21), humans descended from chimps (#33)', source: 'Appendix misconception rows 19–21, 33 (Baum et al. 2005; Gregory 2008; UCB)' },
    { claim: 'Media: Darwin Notebook B page 36 (PD); JSutton93 lungfish photo (CC BY-SA 4.0, unmodified); yvesbas caecilian photo (CC BY 4.0)', source: 'Wikimedia Commons API extmetadata, checked 2026-10-16' },
  ],
};
