import type { Reel, ReelMedia } from '../types';

// E03 "Be the bird": two reels from the pack's peppered-moth history, its media and provenance.
// The transfer checks (Daphne Major's finches; rock pocket mice) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.natural-selection';
const PACK = 'evolution-e03';
const MOTH_1931 = '(1931)_Peppered_Moth_(Biston_betularia)_f.carbonaria_-_Flickr_-_Bennyboymothman.jpg';
const WYLD = 'Wyld,_William_-_Manchester_from_Kersal_Moor,_with_rustic_figures_and_goats_-_Google_Art_Project.jpg';

const carbonaria: ReelMedia = {
  src: `https://upload.wikimedia.org/wikipedia/commons/8/85/${MOTH_1931}`,
  alt: 'A black peppered moth, wings spread flat, resting on pale, weathered bark',
  credit: 'Ben Sale, 2013', license: 'CC BY 2.0', page: commons(MOTH_1931), fit: 'contain',
};
const manchester: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Wyld%2C_William_-_Manchester_from_Kersal_Moor%2C_with_rustic_figures_and_goats_-_Google_Art_Project.jpg/1920px-Wyld%2C_William_-_Manchester_from_Kersal_Moor%2C_with_rustic_figures_and_goats_-_Google_Art_Project.jpg',
  alt: 'A watercolour of Manchester seen from a green hill, dozens of mill chimneys smoking under a hazy yellow sky',
  credit: 'William Wyld, Manchester from Kersal Moor, 1852', license: 'Public domain', page: commons(WYLD),
};
const plate: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Moths_of_the_British_Isles_Series2_Plate129.jpg',
  alt: 'A colour plate of three peppered moths: two pale and speckled, one solid black between them',
  credit: 'Richard South, The Moths of the British Isles, 1909', license: 'Public domain', page: commons('Moths_of_the_British_Isles_Series2_Plate129.jpg'),
};
const birch: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Lichte_en_zwarte_versie_berkenspanner.jpg',
  alt: 'Two peppered moths on a birch trunk: a black one easy to see on the white bark, a pale speckled one beside a patch of moss',
  credit: 'Maarten Sanne', license: 'CC BY-SA 3.0', page: commons('Lichte_en_zwarte_versie_berkenspanner.jpg'), fit: 'contain',
};

const SOURCES = {
  origin: 'Wikipedia: Peppered moth evolution (rev 1375599440, “Origin and evolution”)',
  soot: 'Wikipedia: Peppered moth evolution (rev 1375599440)',
  genetics: 'Wikipedia: Peppered moth evolution (Genetics)',
  kettlewell: 'Wikipedia: Peppered moth evolution (Kettlewell’s experiment)',
  cook: 'Cook, Grant, Saccheri & Mallet 2012, Biol Lett 8:609, doi:10.1098/rsbl.2011.1136 (abstract, PubMed 22319093)',
  bark: 'Cook et al. 2012 (abstract: “lower predation at daytime resting sites on dark, sooty bark”)',
  yearly: 'Wikipedia: Peppered moth (Life cycle)',
  cleanAir: 'Wikipedia: Clean Air Act 1956',
} as const;

export const E03_REELS: Reel[] = [
  {
    id: 'e03-ninety-eight-in-a-hundred',
    title: 'Ninety-eight in a hundred',
    nodeId: NODE, packId: PACK, hero: 'carbonaria',
    prediction: {
      id: 'pre:e03-black-by-1895',
      prompt: 'In 1848 a collector caught a black peppered moth in Manchester, a rarity. By 1895, how many in every 100 there were black?',
      choices: [{ id: 'ten', label: 'About 10' }, { id: 'half', label: 'About 50' }, { id: 'most', label: 'About 98' }],
      answer: 'most', reveal: 2, claims: ['ninety-eight'],
    },
    frames: [
      { media: 'carbonaria', x: 50, y: 50, zoom: 1, text: 'This is the black form of the peppered moth. Before the Industrial Revolution, it was rare.', claims: ['photo', 'rare'] },
      { media: 'manchester', x: 60, y: 58, zoom: 1.45, text: 'Manchester, 1852. Smoke from coal-fired mills darkened the trees and killed the pale lichens on their bark.', say: 'Manchester, eighteen fifty-two. Smoke from coal-fired mills darkened the trees and killed the pale lichens on their bark.', claims: ['painting', 'soot'] },
      { diagram: { name: 'moths', step: 'rise' }, text: 'In 1848 a collector caught a black one there. By 1895, 98 of every 100 peppered moths in Manchester were black.', say: 'In eighteen forty-eight a collector caught a black one there. By eighteen ninety-five, ninety-eight of every hundred peppered moths in Manchester were black.', claims: ['ninety-eight'] },
      { media: 'plate', x: 50, y: 47, zoom: 1.6, text: 'No moth changed colour. On dark bark, birds found more of the pale ones, so more black parents lived to breed.', claims: ['birds'] },
      { media: 'carbonaria', x: 50, y: 50, zoom: 1, text: 'Black is inherited, and the moths breed once a year. Fewer than fifty generations turned a rarity into nearly every moth.', claims: ['genetics', 'yearly', 'ninety-eight'] },
    ],
    takeaway: 'Selection changes a population, not its members: each generation, more of the survivors carried black.',
    media: { carbonaria, manchester, plate },
    sources: [
      { id: 'photo', claim: 'A black (carbonaria) peppered moth, Biston betularia', cite: commons(MOTH_1931) },
      { id: 'rare', claim: 'The black form was rare before the Industrial Revolution', cite: SOURCES.origin },
      { id: 'painting', claim: 'William Wyld’s watercolour of Manchester, 1852', cite: commons(WYLD) },
      { id: 'soot', claim: 'Soot from coal-burning factories darkened trees; sulphur dioxide killed light-coloured lichens', cite: SOURCES.soot },
      { id: 'ninety-eight', claim: 'First live black specimen caught in Manchester in 1848; 98% black in Manchester by 1895', cite: SOURCES.origin },
      { id: 'birds', claim: 'Bird predation at daytime resting sites, lower for black moths on dark, sooty bark', cite: SOURCES.bark },
      { id: 'genetics', claim: 'Black and pale are inherited at a single locus; black is dominant', cite: SOURCES.genetics },
      { id: 'yearly', claim: 'One generation a year in Britain', cite: SOURCES.yearly },
    ],
  },
  {
    id: 'e03-the-way-back',
    title: 'The way back',
    nodeId: NODE, packId: PACK, hero: 'birch',
    prediction: {
      id: 'pre:e03-after-clean-air',
      prompt: 'In 1956 Britain passed its Clean Air Act. What happened next to the black peppered moths?',
      choices: [{ id: 'turned', label: 'They turned pale' }, { id: 'stayed', label: 'Nothing: evolution can’t go back' }, { id: 'rarer', label: 'They grew rarer again' }],
      answer: 'rarer', reveal: 2, claims: ['decline'],
    },
    frames: [
      { media: 'birch', x: 50, y: 50, zoom: 1, text: 'A black and a pale peppered moth on birch bark. Which one a bird misses depends on the bark.', claims: ['photo', 'stand-out'] },
      { media: 'manchester', x: 30, y: 70, zoom: 1.35, text: 'In 1956 Britain passed the Clean Air Act. Smoke was cut, and over the years the bark grew less sooty.', say: 'In nineteen fifty-six Britain passed the Clean Air Act. Smoke was cut, and over the years the bark grew less sooty.', claims: ['clean-air', 'cleaner'] },
      { diagram: { name: 'moths', step: 'fall' }, text: 'From about 1970, the black form began to decline.', say: 'From about nineteen seventy, the black form began to decline.', claims: ['decline'] },
      { media: 'plate', x: 50, y: 20, zoom: 1.5, text: 'Pale moths had never gone. Black is dominant, so the pale version hid in black moths carrying one copy of it.', claims: ['genetics'] },
      { media: 'carbonaria', x: 50, y: 50, zoom: 1, text: 'Michael Majerus released 4,864 moths over six years. On today’s cleaner bark, birds took more of the black ones.', say: 'Michael Majerus released four thousand, eight hundred and sixty-four moths over six years. On today’s cleaner bark, birds took more of the black ones.', claims: ['majerus'] },
    ],
    takeaway: 'Selection has no direction. It favours whatever survives where a population lives now.',
    media: { birch, manchester, plate, carbonaria },
    sources: [
      { id: 'photo', claim: 'A black and a pale peppered moth on a birch trunk', cite: commons('Lichte_en_zwarte_versie_berkenspanner.jpg') },
      { id: 'stand-out', claim: 'Kettlewell: birds took more of whichever form stood out against the bark', cite: SOURCES.kettlewell },
      { id: 'clean-air', claim: 'The Clean Air Act was passed in the UK in 1956', cite: SOURCES.cleanAir },
      { id: 'cleaner', claim: 'Bark today is less sooty', cite: SOURCES.cook },
      { id: 'decline', claim: 'The black form has declined since 1970', cite: SOURCES.cook },
      { id: 'genetics', claim: 'One locus; black is dominant, so pale is recessive and can be carried hidden', cite: SOURCES.genetics },
      { id: 'majerus', claim: 'Majerus released 4,864 moths in a six-year experiment; strong bird predation against black moths on today’s less sooty bark', cite: SOURCES.cook },
    ],
  },
];
