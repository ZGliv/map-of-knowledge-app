import type { Reel, ReelMedia } from '../types';

// E09 "The long walk out of Africa": three reels from the pack's provenance, written to the plan's
// sensitive-content rules: we share an ancestor with chimpanzees (we did not descend from them), and
// human genetic variety shades gradually with no sharp borders. Three new files, each licence checked
// through the Commons API on 2026-10-17: a cast of Lucy (CC BY 2.5), a cast of the Taung child
// (CC BY-SA 3.0, shown whole) and the Kibish hills (NSF, public domain). The transfer checks (wolves
// and dogs; cats and dogs) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.human-evolution';
const PACK = 'evolution-e09';

const chimp: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Chimpanzee_Portrait.jpg/1920px-Chimpanzee_Portrait.jpg',
  alt: 'Close-up of an adult chimpanzee’s face, looking straight at the camera',
  credit: 'Charles Patrick Ewing, Save the Chimps sanctuary, 2016 (cropped)', license: 'CC BY 2.0', page: commons('Chimpanzee_Portrait.jpg'),
};
const lucy: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Lucy_blackbg.jpg',
  alt: 'The bones of Lucy laid out on black as they were found: skull fragments at the top, ribs, arm bones, the pelvis and a thigh bone',
  credit: '120 (Wikimedia Commons), cast at the Muséum national d’histoire naturelle, Paris, 2007', license: 'CC BY 2.5', page: commons('Lucy_blackbg.jpg'), fit: 'contain',
};
/** The same photograph, close up: the pelvis and legs. */
const lucyClose: ReelMedia = { ...lucy, alt: 'Close-up of Lucy’s pelvis and thigh bone', fit: undefined };
const taung: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Australopithecus_africanus_-_Cast_of_taung_child_Face.jpg/1280px-Australopithecus_africanus_-_Cast_of_taung_child_Face.jpg',
  alt: 'A cast of the Taung child’s skull seen from the front: a small face with large eye sockets and baby teeth',
  credit: 'Didier Descouens, cast in the collection of the University of the Witwatersrand, 2013', license: 'CC BY-SA 3.0',
  page: commons('Australopithecus_africanus_-_Cast_of_taung_child_Face.jpg'), fit: 'contain',
};
const kibish: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Kibish_formation_area_of_archaeology_dig.jpg',
  alt: 'Eroded grey and tan hills under a pale sky in the Kibish Formation by the Omo River, southern Ethiopia, with a flat-topped mountain behind',
  credit: 'John Fleagle, National Science Foundation', license: 'Public domain', page: commons('Kibish_formation_area_of_archaeology_dig.jpg'),
};

const SOURCES = {
  apes: 'Wikipedia: Ape (Hominoidea)',
  yoo: 'Yoo et al. 2025, Complete sequencing of ape genomes, Nature 641, doi:10.1038/s41586-025-08816-3 (PMC12058530, CC BY 4.0)',
  range: 'Wikipedia: Chimpanzee–human last common ancestor',
  lucy: 'Wikipedia: Lucy (Australopithecus)',
  taung: 'Wikipedia: Taung Child',
  missing: 'Wikipedia: Missing link (human evolution)',
  sites: 'Wikipedia: Jebel Irhoud; Omo remains; Misliya Cave',
  wave: 'Wikipedia: Recent African origin of modern humans',
  australia: 'Wikipedia: Madjedbebe; Prehistory of Australia',
  monte: 'Wikipedia: Monte Verde; Peopling of the Americas',
  diversity: 'Wikipedia: Human genetic variation; Ramachandran et al. 2005, PNAS 102:15942, doi:10.1073/pnas.0507611102 (heterozygosity against distance from Addis Ababa)',
  clinal: 'Wikipedia: Human genetic variation',
} as const;

export const E09_REELS: Reel[] = [
  {
    id: 'e09-why-still-chimpanzees',
    title: 'Why there are still chimpanzees',
    nodeId: NODE, packId: PACK, hero: 'chimp',
    prediction: {
      id: 'pre:e09-still-chimps',
      prompt: 'If humans evolved from apes, why are there still chimpanzees?',
      choices: [{ id: 'cousins', label: 'We share an ancestor; we didn’t come from them' }, { id: 'behind', label: 'Chimps are still on their way to becoming human' }, { id: 'stopped', label: 'Chimps stopped evolving long ago' }],
      answer: 'cousins', reveal: 2, claims: ['split'],
    },
    frames: [
      { media: 'chimp', x: 50, y: 45, zoom: 1.15, text: 'Chimpanzees and bonobos are our closest living relatives. But we are not descended from them.', claims: ['split'] },
      { diagram: { name: 'rewind', step: 'today' }, text: 'Five living great apes, humans among them. Wind the clock back, and their lines meet.', claims: ['apes', 'split'] },
      { diagram: { name: 'rewind', step: 'join' }, text: 'By one new estimate, ours meets theirs about six million years ago, at an ape that was neither chimpanzee nor human.', claims: ['split', 'range'] },
      { diagram: { name: 'rewind', step: 'both' }, text: 'Since then, both lines have evolved for exactly as long. Chimpanzees are not a stage we passed through.', claims: ['split'] },
      { diagram: { name: 'rewind', step: 'deep' }, text: 'Gorillas join about eleven million years back, orangutans about nineteen. Humans are one more kind of ape.', claims: ['split', 'apes'] },
      { media: 'chimp', x: 50, y: 48, zoom: 1, text: 'There are still chimpanzees for the same reason there are still humans: each is a branch that kept going.', claims: ['split'] },
    ],
    takeaway: 'We share an ancestor with chimpanzees; we did not descend from them. Both branches kept evolving.',
    media: { chimp },
    sources: [
      { id: 'apes', claim: 'Apes (Hominoidea) include humans', cite: SOURCES.apes },
      { id: 'split', claim: 'Complete ape genomes: chimpanzee–bonobo split about 1.7 Ma, human–chimpanzee 5.5–6.3 Ma, gorilla 10.6–10.9 Ma, orangutan 18.2–19.6 Ma', cite: SOURCES.yoo },
      { id: 'range', claim: 'Estimates of the human–chimpanzee divergence vary widely, from 13 to 5 million years ago', cite: SOURCES.range },
    ],
  },
  {
    id: 'e09-lucy-stood-up-first',
    title: 'Lucy stood up first',
    nodeId: NODE, packId: PACK, hero: 'lucy',
    prediction: {
      id: 'pre:e09-what-lucy-shows',
      prompt: 'Lucy lived in Ethiopia about 3.2 million years ago. What do her bones show?',
      choices: [{ id: 'walk', label: 'She walked upright, with a small, ape-like skull' }, { id: 'brain', label: 'A big brain, but she walked on all fours' }, { id: 'modern', label: 'A body and skull much like ours' }],
      answer: 'walk', reveal: 2, claims: ['lucy'],
    },
    frames: [
      { media: 'lucy', x: 50, y: 50, zoom: 1, text: 'In 1974, at Hadar in Ethiopia, fossil hunters found much of one skeleton: Lucy.', say: 'In nineteen seventy-four, at Hadar in Ethiopia, fossil hunters found much of one skeleton: Lucy.', claims: ['lucy', 'cast'] },
      { media: 'lucyClose', x: 52, y: 62, zoom: 1.45, text: 'Her skeleton shows she walked upright, about 3.2 million years ago.', say: 'Her skeleton shows she walked upright, about three point two million years ago.', claims: ['lucy'] },
      { media: 'lucy', x: 50, y: 50, zoom: 1, text: 'But her skull was small and ape-like: an upright walker with an ape-sized head.', claims: ['lucy'] },
      { media: 'taung', x: 50, y: 50, zoom: 1, text: 'In 1924, a child’s skull turned up at Taung, in South Africa. It was the first fossil evidence that humanity began in Africa.', say: 'In nineteen twenty-four, a child’s skull turned up at Towng, in South Africa. It was the first fossil evidence that humanity began in Africa.', claims: ['taung'] },
      { media: 'lucyClose', x: 50, y: 40, zoom: 1.1, text: 'People ask for the missing link: one creature, half ape, half human. Scientists avoid the phrase. It pictures a single chain.', claims: ['missing'] },
      { media: 'taung', x: 50, y: 50, zoom: 1, text: 'What fossils show instead is a branching crowd of relatives. Lucy and the Taung child are two of them.', say: 'What fossils show instead is a branching crowd of relatives. Lucy and the Towng child are two of them.', claims: ['missing', 'taung', 'lucy'] },
    ],
    takeaway: 'Lucy walked upright with an ape-sized skull. Human evolution is a branching crowd of relatives, not one chain with a missing link.',
    media: { lucy, lucyClose, taung },
    sources: [
      { id: 'lucy', claim: 'Lucy, Australopithecus afarensis, found 1974 at Hadar, Ethiopia, about 3.2 million years old; a small skull akin to non-hominin apes, with a bipedal, upright gait', cite: SOURCES.lucy },
      { id: 'cast', claim: 'Cast of the Lucy skeleton (AL 288-1), Muséum national d’histoire naturelle, Paris', cite: commons('Lucy_blackbg.jpg') },
      { id: 'taung', claim: 'The Taung child, found in South Africa in 1924 and described by Dart in 1925, was the first evidence that humanity originated in Africa', cite: SOURCES.taung },
      { id: 'missing', claim: '“Missing link” fell out of favour because it implies a linear process; scientists speak of last common ancestors instead', cite: SOURCES.missing },
    ],
  },
  {
    id: 'e09-out-of-africa',
    title: 'Out of Africa',
    nodeId: NODE, packId: PACK, hero: 'kibish',
    prediction: {
      id: 'pre:e09-oldest-sapiens',
      prompt: 'The oldest known fossils of our own species come from Morocco. Roughly how old are they?',
      choices: [{ id: 'recent', label: 'About 30,000 years' }, { id: 'middle', label: 'About 315,000 years' }, { id: 'ancient', label: 'About 3 million years' }],
      answer: 'middle', reveal: 1, claims: ['sites'],
    },
    frames: [
      { media: 'kibish', x: 50, y: 55, zoom: 1.15, text: 'These hills by Ethiopia’s Omo River held one of the oldest known skulls of our species.', claims: ['kibish', 'sites'] },
      { diagram: { name: 'spread', map: 'africa', step: 'origins' }, text: 'Older still: fossils from Jebel Irhoud, in Morocco, about 315,000 years old.', say: 'Older still: fossils from Jebel Irhoud, in Morocco, about three hundred and fifteen thousand years old.', claims: ['sites'] },
      { diagram: { name: 'spread', map: 'africa', step: 'asia' }, text: 'A jawbone from Misliya Cave, in Israel, is at least 177,000 years old: an early crossing into Asia.', say: 'A jawbone from Misliya Cave, in Israel, is at least a hundred and seventy-seven thousand years old: an early crossing into Asia.', claims: ['sites', 'wave'] },
      { diagram: { name: 'spread', map: 'africa', step: 'wave' }, text: 'But people outside Africa descend mainly from groups that left 70,000 to 50,000 years ago.', say: 'But people outside Africa descend mainly from groups that left seventy to fifty thousand years ago.', claims: ['wave', 'australia'] },
      { diagram: { name: 'spread', map: 'africa', step: 'world' }, text: 'People reached southern Chile by about 14,500 years ago, a date most experts accept.', say: 'People reached southern Chile by about fourteen thousand five hundred years ago, a date most experts accept.', claims: ['monte'] },
      { media: 'kibish', x: 50, y: 50, zoom: 1, text: 'Each group that moved on took only part of the variety. So genetic variety is greatest in Africa, fading gradually with distance.', claims: ['diversity', 'clinal'] },
    ],
    takeaway: 'Our species began in Africa and spread from there. Genetic variety fades gradually with distance from Africa, with no sharp borders.',
    media: { kibish },
    sources: [
      { id: 'kibish', claim: 'The Kibish Formation by the Omo River in southern Ethiopia, where the Omo remains were found', cite: commons('Kibish_formation_area_of_archaeology_dig.jpg') },
      { id: 'sites', claim: 'Jebel Irhoud about 315,000 years (the earliest known Homo sapiens); Omo Kibish at least about 233,000; Misliya 177,000–194,000', cite: SOURCES.sites },
      { id: 'wave', claim: 'Non-Africans descend mainly from an expansion about 70,000–50,000 years ago; earlier dispersals occurred', cite: SOURCES.wave },
      { id: 'australia', claim: 'Australia reached at least 50,000 years ago', cite: SOURCES.australia },
      { id: 'monte', claim: 'Monte Verde, southern Chile, about 14,500 years ago; largely accepted though not without dissent', cite: SOURCES.monte },
      { id: 'diversity', claim: 'Genetic diversity decreases with migratory distance from Africa', cite: SOURCES.diversity },
      { id: 'clinal', claim: 'Human genetic variation is clinal: it changes gradually across geography', cite: SOURCES.clinal },
    ],
  },
];
