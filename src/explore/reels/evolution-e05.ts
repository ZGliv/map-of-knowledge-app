import type { Reel, ReelMedia } from '../types';

// E05 "The salamander ring": three reels from the pack's media and provenance. The transfer
// checks (apple maggot flies; what keeps species apart) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.new-species';
const PACK = 'evolution-e05';

const monterey: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Ensatina_eschscholtzii_eschscholtzii_261136762.jpg/1920px-Ensatina_eschscholtzii_eschscholtzii_261136762.jpg',
  alt: 'Close-up of a Monterey ensatina salamander, orange-brown with large black eyes',
  credit: 'Alex Heyman, via iNaturalist, 2023', license: 'CC0', page: commons('Ensatina_eschscholtzii_eschscholtzii_261136762.jpg'),
};
const ring: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Ensatina_eschscholtzii_ring_species.jpg',
  alt: 'Map of the seven Ensatina subspecies forming a horseshoe around California’s Central Valley, with a photo of each',
  credit: 'Thomas J. Devitt, Stuart J. E. Baird and Craig Moritz, BMC Evolutionary Biology, 2011', license: 'CC BY 2.0',
  page: commons('Ensatina_eschscholtzii_ring_species.jpg'),
};
const yellowEyed: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Yellow-eyed_Ensatina_%28Ensatina_eschscholtzii_xanthoptica%29_-_Flickr_-_GregTheBusker_%285%29.jpg/1280px-Yellow-eyed_Ensatina_%28Ensatina_eschscholtzii_xanthoptica%29_-_Flickr_-_GregTheBusker_%285%29.jpg',
  alt: 'A bright orange yellow-eyed ensatina salamander on a mossy log at night',
  credit: 'Greg Schechter, San Francisco, 2010', license: 'CC BY 2.0',
  page: commons('Yellow-eyed_Ensatina_(Ensatina_eschscholtzii_xanthoptica)_-_Flickr_-_GregTheBusker_(5).jpg'),
};

const SOURCES = {
  ensatina: 'Wikipedia: Ensatina; Ring species',
  stebbins: 'Devitt, Baird & Moritz 2011, BMC Evol Biol 11:245, doi:10.1186/1471-2148-11-245 (introduction)',
  wake: 'Wake 1997, PNAS 94:7761, doi:10.1073/pnas.94.15.7761 (abstract)',
  contact: 'Devitt et al. 2011 (abstract, introduction, discussion)',
  around: 'Pereira & Wake 2009, Evolution 63:2288, doi:10.1111/j.1558-5646.2009.00722.x (abstract)',
  crossed: 'Kuchta, Parks & Wake 2009, Mol Phylogenet Evol 50:240 (abstract); Alexandrino et al. 2005, Evolution 59:1334 (abstract)',
} as const;
const SAY = 'Ensa-teena';

export const E05_REELS: Reel[] = [
  {
    id: 'e05-around-the-valley',
    title: 'Around the valley, not across',
    nodeId: NODE, packId: PACK, hero: 'monterey',
    prediction: {
      id: 'pre:e05-valley-floor',
      prompt: 'This salamander’s family circles California’s Central Valley but never lives on the valley floor. Why not?',
      choices: [{ id: 'dry', label: 'It’s too dry' }, { id: 'predators', label: 'Too many predators' }, { id: 'rivers', label: 'Rivers cut it off' }],
      answer: 'dry', reveal: 1, claims: ['arid'],
    },
    frames: [
      { media: 'monterey', x: 42, y: 45, zoom: 1.2, text: 'This is an Ensatina, a small forest salamander from California.', say: `This is an ${SAY}, a small forest salamander from California.`, claims: ['photo'] },
      { media: 'ring', x: 49, y: 62, zoom: 1.25, text: 'Its kind lives in a horseshoe of mountains around the Central Valley. The valley floor is too dry.', claims: ['horseshoe', 'arid'] },
      { media: 'ring', x: 45, y: 22, zoom: 1.15, text: 'The best-supported story: the ancestors lived in the far north, then spread south down both sides of the valley.', claims: ['spread'] },
      { media: 'ring', x: 68, y: 44, zoom: 1.3, text: 'Kept apart, the two lines changed. Plain on the coast. Spotted and blotched inland.', claims: ['forms'] },
      { media: 'ring', x: 62, y: 84, zoom: 1.2, text: 'In the mountains of southern California, the two fronts finally meet.', claims: ['spread'] },
      { media: 'ring', x: 80, y: 86, zoom: 1.4, text: 'On Palomar Mountain they split it. The plain form keeps below about 1,370 metres; the blotched form takes the pine forest above.', say: 'On Palomar Mountain they split it. The plain form keeps below about thirteen hundred and seventy metres; the blotched form takes the pine forest above.', claims: ['palomar'] },
    ],
    takeaway: 'A population that spreads around a barrier can meet itself again, changed.',
    media: { monterey, ring },
    sources: [
      { id: 'photo', claim: 'A Monterey ensatina, Ensatina eschscholtzii eschscholtzii', cite: commons('Ensatina_eschscholtzii_eschscholtzii_261136762.jpg') },
      { id: 'horseshoe', claim: 'Ensatina forms a horseshoe of populations around the Central Valley', cite: SOURCES.ensatina },
      { id: 'arid', claim: 'The ring runs around the arid Central Valley', cite: SOURCES.stebbins },
      { id: 'spread', claim: 'Origin in the north, two fronts south along the coast ranges and the Sierra Nevada, rejoining in southern California', cite: SOURCES.wake },
      { id: 'forms', claim: 'Unblotched coastal forms; spotted and blotched inland forms', cite: commons('Ensatina_eschscholtzii_ring_species.jpg') },
      { id: 'palomar', claim: 'On Palomar the two forms’ habitats split near 1,370 m', cite: SOURCES.contact },
    ],
  },
  {
    id: 'e05-the-one-that-crossed',
    title: 'The salamander that crossed',
    nodeId: NODE, packId: PACK, hero: 'yellowEyed',
    prediction: {
      id: 'pre:e05-crossing',
      prompt: 'One coastal salamander crossed California’s Central Valley and met its spotted cousin in the Sierra Nevada. What happened?',
      choices: [{ id: 'merged', label: 'They merged into one form' }, { id: 'hybrids', label: 'Their hybrids lost out' }, { id: 'vanished', label: 'The newcomer vanished' }],
      answer: 'hybrids', reveal: 3, claims: ['selection'],
    },
    frames: [
      { media: 'yellowEyed', x: 48, y: 55, zoom: 1.15, text: 'This is the yellow-eyed ensatina, from the coast side of the ring, near San Francisco Bay.', say: `This is the yellow-eyed ${SAY}, from the coast side of the ring, near San Francisco Bay.`, claims: ['photo', 'crossed'] },
      { media: 'ring', x: 50, y: 60, zoom: 1.35, text: 'The dry valley floor stops most salamanders. This one crossed it, into the foothills of the Sierra Nevada.', claims: ['crossed'] },
      { media: 'ring', x: 70, y: 40, zoom: 1.35, text: 'There it met the spotted Sierra form, a cousin from the other side of the ring.', claims: ['crossed'] },
      { media: 'yellowEyed', x: 50, y: 50, zoom: 1.5, text: 'They do mate. But their hybrids are strongly selected against, so the two forms stay apart.', claims: ['selection'] },
      { media: 'ring', x: 50, y: 50, zoom: 1, text: 'Two forms of one species, side by side, keeping their distance. A split, partway made.', claims: ['selection', 'gradual'] },
    ],
    takeaway: 'Where hybrids lose out, two forms of one species stay apart, even side by side.',
    media: { yellowEyed, ring },
    sources: [
      { id: 'photo', claim: 'A yellow-eyed ensatina, Ensatina eschscholtzii xanthoptica', cite: commons('Yellow-eyed_Ensatina_(Ensatina_eschscholtzii_xanthoptica)_-_Flickr_-_GregTheBusker_(5).jpg') },
      { id: 'crossed', claim: 'The yellow-eyed (xanthoptica) lineage colonised the Sierra foothills from the Bay Area', cite: SOURCES.crossed },
      { id: 'selection', claim: 'Strong selection against xanthoptica × platensis hybrids', cite: SOURCES.crossed },
      { id: 'gradual', claim: 'Neighbouring populations interbreed around the ring; isolation appears where forms meet', cite: SOURCES.around },
    ],
  },
  {
    id: 'e05-where-to-draw-the-line',
    title: 'Where do you draw the line?',
    nodeId: NODE, packId: PACK, hero: 'ring',
    prediction: {
      id: 'pre:e05-how-many-species',
      prompt: 'How many species of Ensatina salamander are there?',
      choices: [{ id: 'one', label: 'One' }, { id: 'seven', label: 'Seven' }, { id: 'disputed', label: 'Biologists still disagree' }],
      answer: 'disputed', reveal: 4, claims: ['debate'],
    },
    frames: [
      { media: 'ring', x: 50, y: 50, zoom: 1, text: 'Seven forms of Ensatina circle California’s Central Valley.', say: `Seven forms of ${SAY} circle California’s Central Valley.`, claims: ['seven'] },
      { media: 'ring', x: 30, y: 30, zoom: 1.2, text: 'Each population breeds with its neighbour, and that neighbour with the next, all the way around.', claims: ['around'] },
      { media: 'ring', x: 66, y: 86, zoom: 1.3, text: 'Yet at the far southern end, the plain coastal form and the blotched inland form rarely interbreed.', claims: ['ends'] },
      { media: 'ring', x: 48, y: 60, zoom: 1.45, text: 'So where does one species stop and the next begin? There is no single place to draw the line.', claims: ['gradual'] },
      { media: 'ring', x: 80, y: 86, zoom: 1.2, text: 'Some biologists call Ensatina one species, bent into a ring. Others argue it is already several.', say: `Some biologists call ${SAY} one species, bent into a ring. Others argue it is already several.`, claims: ['debate'] },
    ],
    takeaway: 'Species blur at the edges because they form gradually.',
    media: { ring },
    sources: [
      { id: 'seven', claim: 'Seven Ensatina subspecies form a horseshoe around the Central Valley', cite: commons('Ensatina_eschscholtzii_ring_species.jpg') },
      { id: 'around', claim: 'Hybrids are common around the ring; isolation only at the terminus', cite: SOURCES.around },
      { id: 'ends', claim: 'Where eschscholtzii and klauberi meet in southern California, hybridization is infrequent', cite: SOURCES.contact },
      { id: 'gradual', claim: 'Neighbours interbreed, the ends largely do not: no single boundary between species', cite: SOURCES.ensatina },
      { id: 'debate', claim: 'Highton argued that Ensatina is several species rather than one ring species', cite: SOURCES.ensatina },
    ],
  },
];
