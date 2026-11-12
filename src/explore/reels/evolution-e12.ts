import type { Reel, ReelMedia } from '../types';

// E12 "How we found out": two reels from the pack's provenance, plus Darwin's own diagram from the
// Origin (public domain; licence checked through the Commons API on 2026-10-17). Tiktaalik is left to
// the E07 reel. The transfer checks (Darwin's orchid moth; fits or clashes, with Precambrian rabbits)
// are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.how-we-know';
const PACK = 'evolution-e12';

const darwin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Charles_Darwin_by_Julia_Margaret_Cameron%2C_c._1868.jpg/1920px-Charles_Darwin_by_Julia_Margaret_Cameron%2C_c._1868.jpg',
  alt: 'Charles Darwin in later life, white-bearded, in a dark coat, photographed in soft light',
  credit: 'Julia Margaret Cameron, c. 1868 (restored by Adam Cuerden)', license: 'Public domain', page: commons('Charles_Darwin_by_Julia_Margaret_Cameron,_c._1868.jpg'),
};
const origin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Origin_of_Species.svg/1280px-Origin_of_Species.svg.png',
  alt: 'Darwin’s diagram of divergence: lines of descent rising from letters A to L, splitting and splitting again over fourteen levels',
  credit: 'Charles Darwin, On the Origin of Species, 1859 (redrawn as SVG by Inductiveload)', license: 'Public domain', page: commons('Origin_of_Species.svg'),
  tone: 'ink', fit: 'contain',
};

const SOURCES = {
  eye: 'Darwin, On the Origin of Species, 1st ed. 1859, ch. VI, section "Organs of extreme perfection and complication", paragraphs 1 and 6; Project Gutenberg #1228',
  eyes: 'Wikipedia: Evolution of the eye',
  theory: 'Wikipedia: Scientific theory',
  groups: 'Darwin, On the Origin of Species, 1st ed., ch. XIII, paragraph 2; Project Gutenberg #1228',
  traits: 'Wikipedia: Vertebrate; Tetrapod; Bird; Amniote; Mammal; Feather',
} as const;

export const E12_REELS: Reel[] = [
  {
    id: 'e12-what-would-break-it',
    title: 'What would break it',
    nodeId: NODE, packId: PACK, hero: 'darwin',
    prediction: {
      id: 'pre:e12-darwin-and-the-eye',
      prompt: 'Darwin admitted that an eye built by natural selection seemed absurd. What did he do about it?',
      choices: [{ id: 'test', label: 'Said what would prove his theory wrong' }, { id: 'skip', label: 'Left the eye out of his book' }, { id: 'sure', label: 'Insisted he was certainly right' }],
      answer: 'test', reveal: 5, claims: ['eye'],
    },
    frames: [
      { media: 'darwin', x: 40, y: 26, zoom: 1.15, text: 'In 1859, Charles Darwin wrote that an eye formed by natural selection “seems, I freely confess, absurd in the highest possible degree.”', say: 'In eighteen fifty-nine, Charles Darwin wrote that an eye formed by natural selection “seems, I freely confess, absurd in the highest possible degree.”', claims: ['eye'] },
      { diagram: { name: 'eyes', step: 'spot' }, text: 'Then he answered it. If many small steps, each one useful, link a simple eye to a complex one, the difficulty “can hardly be considered real.”', claims: ['eye'] },
      { diagram: { name: 'eyes', step: 'cup' }, text: 'Living animals show such steps. Many have simple eyespots. Some snails have eyes shaped like a cup.', claims: ['eyes'] },
      { diagram: { name: 'eyes', step: 'pinhole' }, text: 'The nautilus has a pinhole eye, with no lens.', claims: ['eyes'] },
      { diagram: { name: 'eyes', step: 'camera' }, text: 'Ours, like an octopus’s, is a camera eye, with a lens.', claims: ['eyes'] },
      { media: 'darwin', x: 42, y: 32, zoom: 1, text: 'And he named what would sink him: a complex organ that could not be built in small steps. Then “my theory would absolutely break down.”', claims: ['eye', 'theory'] },
    ],
    takeaway: 'Darwin said exactly what would break his theory. Naming how a claim could fail is what makes it testable.',
    media: { darwin },
    sources: [
      { id: 'eye', claim: 'Darwin’s eye passage: “absurd in the highest possible degree”; numerous useful gradations make the difficulty “hardly … real”; “my theory would absolutely break down”', cite: SOURCES.eye },
      { id: 'eyes', claim: 'Eyespots in nearly all major animal groups; pit eyes in some snails; pinhole eyes in the nautilus; camera eyes in vertebrates and octopuses', cite: SOURCES.eyes },
      { id: 'theory', claim: 'A scientific theory is an explanation that has been tested', cite: SOURCES.theory },
    ],
  },
  {
    id: 'e12-groups-inside-groups',
    title: 'Groups inside groups',
    nodeId: NODE, packId: PACK, hero: 'origin',
    prediction: {
      id: 'pre:e12-shape-of-groups',
      prompt: 'Sort sharks, frogs, lizards, pigeons, mice and people by the traits they share. What shape do the groups make?',
      choices: [{ id: 'nested', label: 'Groups sitting neatly inside bigger groups' }, { id: 'tangle', label: 'Groups that overlap every which way' }, { id: 'ladder', label: 'One ladder, from simple to complex' }],
      answer: 'nested', reveal: 3, claims: ['traits'],
    },
    frames: [
      { media: 'origin', x: 50, y: 50, zoom: 1, text: 'The only diagram in Darwin’s Origin of Species: lines of descent, branching and branching again.', claims: ['figure'] },
      { diagram: { name: 'nest', step: 'backbone' }, text: 'If life is one family tree, living things should fall into “groups subordinate to groups.” Start with a backbone.', claims: ['groups', 'traits'] },
      { diagram: { name: 'nest', step: 'limbs' }, text: 'Inside that group sit the four-limbed animals. Inside them, those whose embryos grow in an amniotic sac.', claims: ['traits'] },
      { diagram: { name: 'nest', step: 'split' }, text: 'Feathers mark one group inside that, and hair and milk another. Every group sits inside a bigger one.', claims: ['traits'] },
      { diagram: { name: 'nest', step: 'misfit' }, text: 'That pattern rules things out. A furry animal with feathers that fed its young milk would have nowhere to go.', claims: ['traits'] },
      { media: 'origin', x: 50, y: 50, zoom: 1, text: 'Only birds have feathers, and only mammals have hair. A theory that forbids things can be tested.', claims: ['traits', 'theory'] },
    ],
    takeaway: 'Common descent predicts groups inside groups, and that forbids some animals. A feathered mammal would break it.',
    media: { origin },
    sources: [
      { id: 'figure', claim: 'The only illustration in On the Origin of Species (1859), showing the divergence of species', cite: commons('Origin_of_Species.svg') },
      { id: 'groups', claim: 'Darwin: “groups subordinate to groups”', cite: SOURCES.groups },
      { id: 'traits', claim: 'Vertebrates have a backbone; tetrapods have four limbs; amniotes have an amnion; only mammals have hair and milk glands; feathers distinguish living birds', cite: SOURCES.traits },
      { id: 'theory', claim: 'A scientific theory is a tested explanation', cite: SOURCES.theory },
    ],
  },
];
