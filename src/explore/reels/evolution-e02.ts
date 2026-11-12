import type { Reel, ReelMedia } from '../types';

// E02 "Why aren't you a blend?": two reels from Mendel's own counts (Bateson's translation) and
// the pack's blending story. The transfer checks (ABO blood groups; the queen bee) are left
// untouched: no blood groups, no bees.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.variation-heredity';
const PACK = 'evolution-e02';

const garden: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Fairbanks_-_Mendel_Tall_and_Dwarf_Pea_Plants.jpg/1920px-Fairbanks_-_Mendel_Tall_and_Dwarf_Pea_Plants.jpg',
  alt: 'An oil painting of two pea plants, one tall and climbing, one short, both with white flowers and green pods',
  credit: 'Daniel J. Fairbanks, for the Mendelianum, Brno, 2017', license: 'CC BY 4.0', page: commons('Fairbanks_-_Mendel_Tall_and_Dwarf_Pea_Plants.jpg'),
};
const pods: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Fairbanks_-_Mendel_Seed_Shape_%26_Color.jpg/960px-Fairbanks_-_Mendel_Seed_Shape_%26_Color.jpg',
  alt: 'An oil painting of two open pea pods, each holding a mix of round and wrinkled, yellow and green peas',
  credit: 'Daniel J. Fairbanks, for the Mendelianum, Brno, 2017', license: 'CC BY-SA 4.0', page: commons('Fairbanks_-_Mendel_Seed_Shape_&_Color.jpg'), fit: 'contain',
};
const jenkin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Henry_Charles_Fleeming_Jenkin._Etching_by_W._Holl%2C_1884._Wellcome_V0003068.jpg/1280px-Henry_Charles_Fleeming_Jenkin._Etching_by_W._Holl%2C_1884._Wellcome_V0003068.jpg',
  alt: 'An engraved portrait of the engineer Fleeming Jenkin standing in a workshop full of machinery',
  credit: 'W. Holl, 1884, Wellcome Collection', license: 'CC BY 4.0', page: commons('Henry_Charles_Fleeming_Jenkin._Etching_by_W._Holl,_1884._Wellcome_V0003068.jpg'),
};
const mendel: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Portrait_of_Gregor_Johann_Mendel%2C_Garrison._Wellcome_M0002351.jpg',
  alt: 'Black-and-white portrait of Gregor Mendel in round glasses and a clerical collar',
  credit: 'After a photograph of Gregor Mendel, Wellcome Collection', license: 'CC BY 4.0', page: commons('Portrait_of_Gregor_Johann_Mendel,_Garrison._Wellcome_M0002351.jpg'),
};

const SOURCES = {
  blending: 'Wikipedia: Blending inheritance (rev 1315232893); Fleeming Jenkin (June 1867, North British Review; blending the reigning hypothesis)',
  mendel: 'Wikipedia: Gregor Mendel (rev 1376806037)',
  paper: 'Mendel, Experiments in Plant Hybridisation, tr. Bateson, in Mendel’s Principles of Heredity: A Defence (1902), Project Gutenberg #69362 (verbatim)',
  selfing: 'Mendel, tr. Bateson 1902, Project Gutenberg #69362 (verbatim)',
} as const;

export const E02_REELS: Reel[] = [
  {
    id: 'e02-hidden-not-lost',
    title: 'Hidden, not lost',
    nodeId: NODE, packId: PACK, hero: 'garden',
    prediction: {
      id: 'pre:e02-wrinkled-return',
      prompt: 'Mendel crossed round peas with wrinkled ones, and every seed came out round. When those round hybrids pollinated themselves, how many wrinkled seeds came back?',
      choices: [{ id: 'none', label: 'None at all' }, { id: 'quarter', label: 'About one in four' }, { id: 'half', label: 'About half' }],
      answer: 'quarter', reveal: 2, claims: ['three-to-one'],
    },
    frames: [
      { media: 'garden', x: 42, y: 38, zoom: 1.2, text: 'From 1856 to 1863, in his monastery garden in Brno, Gregor Mendel grew some 28,000 plants, mostly peas.', say: 'From eighteen fifty-six to eighteen sixty-three, in his monastery garden in Brno, Gregor Mendel grew some twenty-eight thousand plants, mostly peas.', claims: ['mendel'] },
      { diagram: { name: 'peas', step: 'cross' }, text: 'He crossed plants that always bred round seeds with plants that always bred wrinkled ones. Every seed of the cross was round.', claims: ['true-breeding', 'dominant'] },
      { diagram: { name: 'peas', step: 'self' }, text: 'Then the round hybrids pollinated themselves. Wrinkled seeds came back, about one in four, as wrinkled as ever.', claims: ['selfing', 'three-to-one'] },
      { diagram: { name: 'peas', step: 'count' }, text: 'From 253 plants he counted 7,324 seeds: 5,474 round, 1,850 wrinkled.', say: 'From two hundred and fifty-three plants he counted seven thousand, three hundred and twenty-four seeds: five thousand, four hundred and seventy-four round, eighteen hundred and fifty wrinkled.', claims: ['counts'] },
      { media: 'pods', x: 50, y: 50, zoom: 1, text: 'Wrinkled had been hiding in round seeds all along. In Mendel’s words, it would “reappear unchanged.”', claims: ['unchanged'] },
    ],
    takeaway: 'Inheritance hands on whole factors. A trait can hide for a generation and come back unchanged.',
    media: { garden, pods },
    sources: [
      { id: 'mendel', claim: 'Mendel, a friar at St Thomas’s Abbey in Brno, grew and tested some 28,000 plants, mostly peas, from 1856 to 1863', cite: SOURCES.mendel },
      { id: 'true-breeding', claim: 'Mendel started from true-breeding varieties', cite: SOURCES.mendel },
      { id: 'dominant', claim: 'Round seed is dominant over wrinkled; the hybrid resembles one parent', cite: SOURCES.paper },
      { id: 'selfing', claim: 'Pea flowers pollinate themselves in the bud', cite: SOURCES.selfing },
      { id: 'three-to-one', claim: 'In the next generation the recessive reappears in about one plant in four: 3 to 1', cite: SOURCES.paper },
      { id: 'counts', claim: 'Experiment 1: 253 hybrids gave 7,324 seeds, 5,474 round and 1,850 wrinkled, a ratio of 2·96 to 1', cite: SOURCES.paper },
      { id: 'unchanged', claim: 'Recessive characters “reappear unchanged in their progeny” (verbatim)', cite: SOURCES.paper },
    ],
  },
  {
    id: 'e02-the-paint-pot',
    title: 'The paint-pot problem',
    nodeId: NODE, packId: PACK, hero: 'jenkin',
    prediction: {
      id: 'pre:e02-paint-pot',
      prompt: 'Suppose children were a mix of their parents, like paint. What would happen to one rare new trait, generation after generation?',
      choices: [{ id: 'spread', label: 'It would spread' }, { id: 'fade', label: 'It would fade to nothing' }, { id: 'stay', label: 'It would stay as it is' }],
      answer: 'fade', reveal: 2, claims: ['dilute'],
    },
    frames: [
      { media: 'jenkin', x: 50, y: 42, zoom: 1.35, text: 'In 1867 an engineer, Fleeming Jenkin, raised a hard objection to Darwin’s theory.', say: 'In eighteen sixty-seven an engineer, Flemming Jenkin, raised a hard objection to Darwin’s theory.', claims: ['jenkin'] },
      { media: 'jenkin', x: 52, y: 30, zoom: 1.9, text: 'Back then, most naturalists assumed heredity blended, like mixing paint.', claims: ['reigning'] },
      { diagram: { name: 'blend', step: 'paint' }, text: 'Then a rare new trait would be halved in every generation, and halved again, until nothing was left for selection to work on.', claims: ['dilute'] },
      { media: 'pods', x: 50, y: 50, zoom: 1, text: 'Mendel’s peas never blended. In his words: “Transitional forms were not observed in any experiment.”', claims: ['no-blend'] },
      { diagram: { name: 'blend', step: 'genes' }, text: 'Heredity hands on whole factors. A rare one can hide in carriers for generations, then show again at full strength.', claims: ['unchanged'] },
      { media: 'mendel', x: 50, y: 33, zoom: 1.35, text: 'That is how a population keeps the variety natural selection needs.', claims: ['variety'] },
    ],
    takeaway: 'Blending would grind variety down to sameness. Heredity doesn’t blend, so variety survives for selection to act on.',
    media: { jenkin, pods, mendel },
    sources: [
      { id: 'jenkin', claim: 'Fleeming Jenkin’s June 1867 review in the North British Review objected to Darwin’s theory', cite: SOURCES.blending },
      { id: 'reigning', claim: 'Blending inheritance was the reigning hypothesis in the 19th century', cite: SOURCES.blending },
      { id: 'dilute', claim: 'Under blending, a new beneficial trait would be averaged out before selection could act on it', cite: SOURCES.blending },
      { id: 'no-blend', claim: '“Transitional forms were not observed in any experiment” (verbatim)', cite: SOURCES.paper },
      { id: 'unchanged', claim: 'Recessive characters withdraw in hybrids and “reappear unchanged in their progeny”', cite: SOURCES.paper },
      { id: 'variety', claim: 'Particulate inheritance does not average variation away, answering the blending objection', cite: SOURCES.blending },
    ],
  },
];
