import type { Reel, ReelMedia } from '../types';

// E01 "Who's your closest cousin?": three reels from the pack's own tree (Open Tree of Life,
// drawn by diagrams-a), its media and its provenance. The transfer checks (which animals are
// tetrapods; the mushroom and the bee) are left untouched: no snakes, caecilians or fungi here.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.tree-thinking';
const PACK = 'evolution-e01';

const notebook: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Darwin_Tree_1837.png/1280px-Darwin_Tree_1837.png',
  alt: 'A page of Darwin’s notebook: the words “I think” above a small branching tree with lettered tips',
  credit: 'Charles Darwin, Notebook B, page 36, 1837', license: 'Public domain', page: commons('Darwin_Tree_1837.png'), tone: 'ink',
};
const lungfish: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/South_American_lungfish_(Lepidosiren_paradoxa).jpg/960px-South_American_lungfish_(Lepidosiren_paradoxa).jpg',
  alt: 'A long, grey, eel-shaped South American lungfish resting on gravel in an aquarium',
  credit: 'JSutton93, 2018', license: 'CC BY-SA 4.0', page: commons('South_American_lungfish_(Lepidosiren_paradoxa).jpg'), fit: 'contain',
};
const whale: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg/1280px-Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg',
  alt: 'A blue whale surfacing in dark blue water, seen from the air, its blow drifting beside it',
  credit: 'NOAA Photo Library', license: 'Public domain', page: commons('Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg'),
};
const hippo: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Hippopotamus_%40_Barcelona_zoo.jpg/1280px-Hippopotamus_%40_Barcelona_zoo.jpg',
  alt: 'Two hippos in churning water, mouths wide open, showing their tusks',
  credit: 'Pedroserafin, Barcelona Zoo, 2010', license: 'Public domain', page: commons('Hippopotamus_@_Barcelona_zoo.jpg'),
};

const SOURCES = {
  notebook: 'Wikipedia: Inception of Darwin’s theory (Notebook B, mid-July 1837; “With the words ‘I think’, he sketched a diagram”); Wikimedia Commons: File:Darwin Tree 1837.png description',
  tree: 'Open Tree of Life synthetic tree opentree16.1 (taxonomy 3.7draft3), induced_subtree API, fetched 2026-10-16; CC0',
  lungfish: 'Wikipedia: Lungfish (rev 1377158835)',
  hippo: 'Wikipedia: Hippopotamus (rev 1380577215)',
  origin: 'Darwin, On the Origin of Species, 1st ed. 1859, chapter IV, last paragraph; Project Gutenberg #1228',
  reading: 'Appendix misconception rows 19–21, 33 (Baum et al. 2005; Gregory 2008; UCB)',
} as const;

export const E01_REELS: Reel[] = [
  {
    id: 'e01-two-words',
    title: 'Two words in a notebook',
    nodeId: NODE, packId: PACK, hero: 'notebook',
    prediction: {
      id: 'pre:e01-evolving-longer',
      prompt: 'Drawings of the tree of life often put sharks near the bottom and humans near the top. Which line has been evolving longer?',
      choices: [{ id: 'sharks', label: 'Sharks' }, { id: 'humans', label: 'Humans' }, { id: 'same', label: 'Both, for the same time' }],
      answer: 'same', reveal: 4, claims: ['same-time'],
    },
    frames: [
      { media: 'notebook', x: 30, y: 8, zoom: 1.7, text: 'In July 1837, in a private notebook, Charles Darwin wrote two words: “I think.”', claims: ['notebook'] },
      { media: 'notebook', x: 52, y: 38, zoom: 1.25, text: 'Under them he sketched species branching from one shared ancestor.', claims: ['notebook'] },
      { diagram: { name: 'tree', step: 'grow' }, text: 'Biologists still draw life this way. Here are eleven animals on a real tree of life, every one of them alive today.', claims: ['tree'] },
      { diagram: { name: 'tree', step: 'spin' }, text: 'Spin a branch point, like a hanging mobile, and the order changes. Who is related to whom does not.', claims: ['tree', 'reading'] },
      { media: 'notebook', x: 50, y: 50, zoom: 1.05, text: 'So top and bottom mean nothing. Since their shared ancestor, every line has been evolving for exactly the same time.', claims: ['same-time'] },
      { media: 'notebook', x: 62, y: 30, zoom: 1.35, text: 'Darwin, in 1859: “The green and budding twigs may represent existing species.”', claims: ['twigs'] },
    ],
    takeaway: 'Every living species is a twig tip. None is older, higher or more evolved than another.',
    media: { notebook },
    sources: [
      { id: 'notebook', claim: 'Darwin’s 1837 sketch in Notebook B, under the words “I think”: species branching from a common ancestor', cite: SOURCES.notebook },
      { id: 'tree', claim: 'The eleven-animal tree: Open Tree of Life opentree16.1; every tip is a living species', cite: SOURCES.tree },
      { id: 'reading', claim: 'Neighbouring tips are read as closest, top as advanced, bottom as ancestral: common misreadings', cite: SOURCES.reading },
      { id: 'same-time', claim: 'Bottom or left read as ancestral is a misconception; every living line has evolved equally long since the shared root', cite: SOURCES.reading },
      { id: 'twigs', claim: '“The green and budding twigs may represent existing species” (verbatim)', cite: SOURCES.origin },
    ],
  },
  {
    id: 'e01-the-fish-with-lungs',
    title: 'The fish with lungs',
    nodeId: NODE, packId: PACK, hero: 'lungfish',
    prediction: {
      id: 'pre:e01-lungfish-cousin',
      prompt: 'This lungfish breathes air. Which is its closer relative?',
      choices: [{ id: 'salmon', label: 'A salmon' }, { id: 'you', label: 'You' }, { id: 'both', label: 'Both equally' }],
      answer: 'you', reveal: 2, claims: ['closest'],
    },
    frames: [
      { media: 'lungfish', x: 50, y: 50, zoom: 1, text: 'This is a South American lungfish. It looks like a fish, and it is one. It also breathes air.', claims: ['photo', 'air'] },
      { diagram: { name: 'tree', step: 'lungfish' }, text: 'On this tree of eleven living animals, it sits right next to the salmon.', claims: ['tree'] },
      { diagram: { name: 'tree', step: 'trace' }, text: 'But trace the branches back. The lungfish meets the cow, and you, at an ancestor more recent than the one it shares with the salmon.', claims: ['tree', 'closest'] },
      { diagram: { name: 'tree', step: 'turn' }, text: 'Spin that branch point and the lungfish lands beside the blue whale instead. Neighbours on the page mean nothing.', claims: ['tree', 'reading'] },
      { media: 'lungfish', x: 50, y: 50, zoom: 1, text: 'Its lungs match ours. Lungfish are the closest living relatives of every four-limbed animal, you included.', claims: ['closest'] },
    ],
    takeaway: 'Relatedness is where branches join, not who is drawn next to whom.',
    media: { lungfish },
    sources: [
      { id: 'photo', claim: 'A South American lungfish, Lepidosiren paradoxa', cite: commons('South_American_lungfish_(Lepidosiren_paradoxa).jpg') },
      { id: 'air', claim: 'Lungfish breathe air', cite: SOURCES.lungfish },
      { id: 'tree', claim: 'Tree of eleven living vertebrates: Open Tree of Life opentree16.1', cite: SOURCES.tree },
      { id: 'closest', claim: 'Lungfish are the closest living relatives of tetrapods; their lungs are homologous to tetrapod lungs', cite: SOURCES.lungfish },
      { id: 'reading', claim: 'Reading neighbouring tips as closest relatives is a common misreading of trees', cite: SOURCES.reading },
    ],
  },
  {
    id: 'e01-the-whales-cousin',
    title: 'The whale’s closest cousin',
    nodeId: NODE, packId: PACK, hero: 'whale',
    prediction: {
      id: 'pre:e01-whale-cousin',
      prompt: 'Which of these is the blue whale’s closest living relative?',
      choices: [{ id: 'hippo', label: 'A hippo' }, { id: 'pig', label: 'A pig' }, { id: 'cow', label: 'A cow' }],
      answer: 'hippo', reveal: 3, claims: ['cetaceans'],
    },
    frames: [
      { media: 'whale', x: 46, y: 52, zoom: 1.25, text: 'A blue whale, surfacing, seen from the air.', claims: ['photo-whale'] },
      { media: 'hippo', x: 50, y: 50, zoom: 1.05, text: 'Naturalists long classed hippos with pigs. That held until 1909.', say: 'Naturalists long classed hippos with pigs. That held until nineteen oh nine.', claims: ['pigs', 'photo-hippo'] },
      { diagram: { name: 'tree', step: 'whale' }, text: 'Then the evidence came in: blood proteins, DNA and fossils. All of it points the same way.', claims: ['evidence'] },
      { diagram: { name: 'tree', step: 'cow' }, text: 'Whales and hippos share an ancestor more recent than the one either shares with the cow.', claims: ['tree', 'cetaceans'] },
      { media: 'hippo', x: 62, y: 52, zoom: 1.45, text: 'Of every animal alive, the hippo’s closest relatives are the whales.', claims: ['cetaceans'] },
    ],
    takeaway: 'Looks mislead. A whale and a hippo share a more recent ancestor than either does with a cow.',
    media: { whale, hippo },
    sources: [
      { id: 'photo-whale', claim: 'A blue whale, Balaenoptera musculus, NOAA', cite: commons('Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg') },
      { id: 'photo-hippo', claim: 'Hippopotamus amphibius at Barcelona Zoo', cite: commons('Hippopotamus_@_Barcelona_zoo.jpg') },
      { id: 'pigs', claim: 'Naturalists classed hippos with pigs until 1909', cite: SOURCES.hippo },
      { id: 'evidence', claim: 'Blood proteins, molecular systematics, DNA and fossils show hippos’ closest living relatives are cetaceans', cite: SOURCES.hippo },
      { id: 'cetaceans', claim: 'Hippos’ closest living relatives are cetaceans', cite: SOURCES.hippo },
      { id: 'tree', claim: 'Whale and hippo are sister tips, with the cow outside them, in Open Tree of Life opentree16.1', cite: SOURCES.tree },
    ],
  },
];
