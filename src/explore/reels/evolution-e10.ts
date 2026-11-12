import type { Reel, ReelMedia } from '../types';

// E10 "The bacteria that walked through poison": three reels cut from the pack's media and
// provenance. Transfer checks (waterhemp, mosquitoes) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.evolution-now';
const PACK = 'evolution-e10';
const MEGA = 'Kishony_lab-The_Evolution_of_Bacteria_on_a_Mega-Plate.webm';
/** Commons renders stills from the film itself; `seek` is seconds into it. Shown whole: the film is ShareAlike. */
const megaStill = (seek: number, alt: string): ReelMedia => ({
  src: `https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/${MEGA}/1280px-seek%3D${seek}-${MEGA}.jpg`,
  alt, credit: 'Kishony lab, Harvard Medical School and Technion, 2016', license: 'CC BY-SA 3.0', page: commons(MEGA), fit: 'contain',
});

const ecoli: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/E_coli_at_10000x%2C_original.jpg/1920px-E_coli_at_10000x%2C_original.jpg',
  alt: 'A cluster of rod-shaped E. coli bacteria under an electron microscope, magnified 10,000 times',
  credit: 'Eric Erbe and Christopher Pooley, USDA Agricultural Research Service, 2005', license: 'Public domain',
  page: commons('E_coli_at_10000x,_original.jpg'),
};

const SOURCES = {
  cover: 'Wikimedia Commons: File:E coli at 10000x, original.jpg',
  ecoli: 'Wikipedia: Escherichia coli',
  baym: 'Baym et al. 2016, Science 353:1147, doi:10.1126/science.aag0822 (abstract and PMC5534434 main text)',
  film: 'Commons file description and the film itself, Kishony lab (CC BY-SA 3.0)',
  spots: 'Baym et al. 2016 (main text, Fig. 1C) and the film',
  luria: 'Wikipedia: Luria–Delbrück experiment',
} as const;

export const E10_REELS: Reel[] = [
  {
    id: 'e10-four-feet-of-poison',
    title: 'Four feet of poison',
    nodeId: NODE, packId: PACK, hero: 'ecoli',
    prediction: {
      id: 'pre:e10-days-to-the-middle',
      prompt: 'Bacteria start at both bare ends of a dish four feet long. Toward the middle, each band of antibiotic is ten times stronger. How long until they reach the middle?',
      choices: [{ id: 'days', label: 'About ten days' }, { id: 'months', label: 'About ten months' }, { id: 'never', label: 'Never' }],
      answer: 'days', reveal: 4, claims: ['ten-days'],
    },
    frames: [
      { media: 'ecoli', x: 55, y: 40, zoom: 1.25, text: 'This is E. coli, magnified ten thousand times.', claims: ['cover'] },
      { diagram: { name: 'plate', step: 'bands' }, text: 'In 2016, a lab at Harvard Medical School built it a dish 120 centimetres long, with no drug at either end.', claims: ['plate', 'lab'] },
      { diagram: { name: 'plate', step: 'stall' }, text: 'Toward the middle, each band holds ten times more antibiotic. The centre holds three thousand times the dose that stops ordinary E. coli.', claims: ['bands'] },
      { diagram: { name: 'plate', step: 'breakthrough' }, text: 'The bacteria fill the bare ends and stall at the first band. Then one spot breaks through, and its descendants pour in.', claims: ['spots'] },
      { diagram: { name: 'plate', step: 'march' }, text: 'Band after band, the same thing happens. In about ten days, they reach the middle.', claims: ['ten-days', 'spots'] },
      { media: 'ecoli', x: 40, y: 58, zoom: 1.7, text: 'Cells from the centre survive about ten thousand times more drug than the ones that started.', claims: ['resistance'] },
    ],
    takeaway: 'Random changes give a few cells a way through. The poison kills the rest. Repeat, and a population evolves in days.',
    media: { ecoli },
    sources: [
      { id: 'cover', claim: 'Electron micrograph of E. coli at 10,000×, USDA ARS', cite: SOURCES.cover },
      { id: 'plate', claim: 'The MEGA-plate is 120 × 60 cm, with no drug at the ends', cite: SOURCES.baym },
      { id: 'lab', claim: 'Filmed in 2016 by the Kishony lab, Harvard Medical School and Technion', cite: SOURCES.film },
      { id: 'bands', claim: 'Tenfold steps of trimethoprim: 0, 3, 30, 300 and 3,000 times the wild-type MIC', cite: SOURCES.baym },
      { id: 'spots', claim: 'Resistance breaks through at single spots where a mutant arises; its lineage fans out', cite: SOURCES.spots },
      { id: 'ten-days', claim: 'About 10 days to adapt to the highest concentration', cite: SOURCES.baym },
      { id: 'resistance', claim: 'Mutants from the middle are about 10,000-fold more resistant than the starting strain', cite: SOURCES.baym },
    ],
  },
  {
    id: 'e10-every-fan-is-a-family',
    title: 'Every fan is a family',
    nodeId: NODE, packId: PACK, hero: 'fans',
    prediction: {
      id: 'pre:e10-film-length',
      prompt: 'The lab filmed its dish for nearly twelve days, then played it back 18,000 times faster. How long does the time-lapse last?',
      choices: [{ id: 'minute', label: 'Under a minute' }, { id: 'hour', label: 'About an hour' }, { id: 'day', label: 'Most of a day' }],
      answer: 'minute', reveal: 1, claims: ['speed'],
    },
    frames: [
      { media: 'fans', x: 50, y: 50, zoom: 1, text: 'This is that dish, filmed from above. Bacteria show white on black.', claims: ['film'] },
      { media: 'edge', x: 50, y: 50, zoom: 1, text: 'Nearly twelve days, sped up eighteen thousand times, pass in under a minute.', claims: ['speed'] },
      { media: 'bulge', x: 50, y: 50, zoom: 1, text: 'Watch the edge of a band. The front stops dead. Then one point bulges forward.', claims: ['spots'] },
      { media: 'fanning', x: 50, y: 50, zoom: 1, text: 'That bulge is one cell with a lucky change in its DNA, plus all of its descendants.', claims: ['spots'] },
      { media: 'crowded', x: 50, y: 50, zoom: 1, text: 'So every fan you see is one family, pushing into stronger drug.', claims: ['spots'] },
      { media: 'tree', x: 50, y: 50, zoom: 1, text: 'The lab traced who came from whom. Every branch of this tree began as a single cell.', claims: ['lineage'] },
    ],
    takeaway: 'Resistance doesn’t rise like a tide. It starts in single cells, and their families take over.',
    media: {
      fans: megaStill(75, 'The MEGA-plate from above: white fans of bacteria spreading through the dark bands'),
      edge: megaStill(45, 'The dark plate early on, with bacteria filling only the bare end'),
      bulge: megaStill(55, 'A single bulge of bacteria pushing past the edge of a band'),
      fanning: megaStill(65, 'Fans of bacteria spreading from single points into the next band'),
      crowded: megaStill(85, 'Many overlapping fans of bacteria filling the inner bands'),
      tree: megaStill(105, 'The film’s family tree of mutant lineages, drawn in colour over the plate'),
    },
    sources: [
      { id: 'film', claim: 'The film shows the plate from above, bacteria white on black', cite: SOURCES.film },
      { id: 'speed', claim: '11.7 days played at 18,000× speed: about 56 seconds of time-lapse', cite: SOURCES.film },
      { id: 'spots', claim: 'Resistance breaks through at single spots where a mutant arises; lineages fan out', cite: SOURCES.spots },
      { id: 'lineage', claim: 'The lineage tree of mutants traced across the plate', cite: SOURCES.spots },
    ],
  },
  {
    id: 'e10-nobody-taught-them',
    title: 'Nobody taught them',
    nodeId: NODE, packId: PACK, hero: 'luria',
    prediction: {
      id: 'pre:e10-before-or-after',
      prompt: 'A dish of bacteria meets an antibiotic, and a few survive. When did those few become resistant?',
      choices: [{ id: 'before', label: 'Before the drug arrived' }, { id: 'moment', label: 'The moment the drug hit them' }, { id: 'after', label: 'Over the next few days' }],
      answer: 'before', reveal: 2, claims: ['luria'],
    },
    frames: [
      { media: 'luria', x: 50, y: 32, zoom: 1.15, text: 'It’s tempting to say bacteria learn to resist a drug. That gets it backwards.', claims: ['luria'] },
      { diagram: { name: 'sorting', step: 'before' }, text: 'Each time a cell copies its DNA, small changes can slip in, whether or not they help.', claims: ['chance'] },
      { media: 'luria', x: 56, y: 30, zoom: 1.6, text: 'In 1943, Salvador Luria and Max Delbrück showed that resistant mutants exist before bacteria ever meet the threat.', say: 'In 1943, Salvador Luria and Max Delbrook showed that resistant mutants exist before bacteria ever meet the threat.', claims: ['luria', 'portrait'] },
      { diagram: { name: 'sorting', step: 'drug' }, text: 'The drug doesn’t write the fix. It kills or stalls every cell without one.', claims: ['chance'] },
      { diagram: { name: 'sorting', step: 'regrow' }, text: 'The few that already had it are left to multiply. Nobody taught them. They were sorted.', claims: ['luria'] },
    ],
    takeaway: 'Chance makes the changes. The drug only decides who is left.',
    media: {
      luria: {
        src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Salvador_E._Luria_ca.1969_%28cropped%29.jpg/1280px-Salvador_E._Luria_ca.1969_%28cropped%29.jpg',
        alt: 'Black-and-white portrait of Salvador Luria in glasses and a tie, around 1969',
        credit: 'U.S. National Library of Medicine, c. 1969', license: 'Public domain', page: commons('Salvador_E._Luria_ca.1969_(cropped).jpg'),
      },
    },
    sources: [
      { id: 'luria', claim: 'Luria and Delbrück (1943): mutations arise without the selective pressure, not in response to it', cite: SOURCES.luria },
      { id: 'chance', claim: 'Mutations arise at random as cells copy themselves; the drug selects among them rather than causing them', cite: SOURCES.luria },
      { id: 'portrait', claim: 'Portrait of Salvador Luria, about 1969', cite: commons('Salvador_E._Luria_ca.1969_(cropped).jpg') },
    ],
  },
];
