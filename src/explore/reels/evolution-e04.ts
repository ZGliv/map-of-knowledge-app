import type { Reel, ReelMedia } from '../types';

// E04 "The coin-flip population": two reels, one per half of the pack (drift; mutation by
// chance), from its media, its Luria–Delbrück counts and its provenance. The transfer checks
// (drift, selection or gene flow; the prairie chickens; the Lederbergs' replica plates) are
// left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.chance-drift';
const PACK = 'evolution-e04';

const seal: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/CINMS_-_elephant_seal_lounging_%2827099177915%29.jpg/1920px-CINMS_-_elephant_seal_lounging_%2827099177915%29.jpg',
  alt: 'A male northern elephant seal, with its long drooping nose, lying at the edge of the water on San Miguel Island',
  credit: 'Robert Schwemmer, NOAA Channel Islands National Marine Sanctuary', license: 'Public domain', page: commons('CINMS_-_elephant_seal_lounging_(27099177915).jpg'),
};
const veteran: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Sanc0821_-_Flickr_-_NOAA_Photo_Library.jpg/1280px-Sanc0821_-_Flickr_-_NOAA_Photo_Library.jpg',
  alt: 'A scarred old male northern elephant seal resting in shallow water, its reflection beneath it',
  credit: 'Robert Schwemmer, NOAA', license: 'Public domain', page: commons('Sanc0821_-_Flickr_-_NOAA_Photo_Library.jpg'),
};
const delbruck: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Max_Delbruck.jpg/1280px-Max_Delbruck.jpg',
  alt: 'Black-and-white photograph of a young Max Delbrück in a suit, sitting outdoors',
  credit: 'Jonathan Delbrück, family photograph', license: 'Public domain', page: commons('Max_Delbruck.jpg'),
};
const luria: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Salvador_E._Luria_ca.1969_%28cropped%29.jpg/1280px-Salvador_E._Luria_ca.1969_%28cropped%29.jpg',
  alt: 'Black-and-white portrait of Salvador Luria in glasses and a tie, around 1969',
  credit: 'U.S. National Library of Medicine, c. 1969', license: 'Public domain', page: commons('Salvador_E._Luria_ca.1969_(cropped).jpg'),
};

const SOURCES = {
  seals: 'Wikipedia: Northern elephant seal (rev. 1380365743); Population bottleneck (rev. 1369785542)',
  drift: 'Wikipedia: Genetic drift (rev. 1364511177)',
  model: 'Code: src/expeditions/sims/drift.ts',
  paper: 'Luria & Delbrück 1943, Genetics 28:491, doi:10.1093/genetics/28.6.491, tables 1 and 2 and theory section (PMC1209226 scan)',
  experiment: 'Wikipedia: Luria–Delbrück experiment (rev. 1350909232)',
} as const;
const DELBRUCK = 'Delbrook';

export const E04_REELS: Reel[] = [
  {
    id: 'e04-twenty-to-forty-seals',
    title: 'Twenty to forty seals',
    nodeId: NODE, packId: PACK, hero: 'seal',
    prediction: {
      id: 'pre:e04-seal-genes',
      prompt: 'Hunting cut northern elephant seals to perhaps 20 to 40 animals. Today there are more than 200,000. How varied are their genes?',
      choices: [{ id: 'varied', label: 'As varied as ever' }, { id: 'alike', label: 'Strikingly alike' }, { id: 'more', label: 'More varied than before' }],
      answer: 'alike', reveal: 3, claims: ['low'],
    },
    frames: [
      { media: 'seal', x: 40, y: 52, zoom: 1.2, text: 'A northern elephant seal, on San Miguel Island off California.', claims: ['photo'] },
      { diagram: { name: 'drift', step: 'squeeze' }, text: 'By the end of the 1800s, hunters had left perhaps 20 to 40 of them. In a group that small, each generation is a random draw from the last, and gene versions vanish by luck.', say: 'By the end of the eighteen hundreds, hunters had left perhaps twenty to forty of them. In a group that small, each generation is a random draw from the last, and gene versions vanish by luck.', claims: ['hunted', 'draw', 'model'] },
      { diagram: { name: 'drift', step: 'regrow' }, text: 'The seals came back. Today there are more than 200,000.', say: 'The seals came back. Today there are more than two hundred thousand.', claims: ['now', 'model'] },
      { media: 'veteran', x: 55, y: 50, zoom: 1.3, text: 'But their genetic variation is still very low, more than a century later.', claims: ['low'] },
      { media: 'seal', x: 58, y: 44, zoom: 1.5, text: 'No one chose which gene versions made it through. In a population that small, chance does the choosing.', claims: ['draw'] },
    ],
    takeaway: 'Chance reshapes every population of limited size, and the smaller it is, the faster.',
    media: { seal, veteran },
    sources: [
      { id: 'photo', claim: 'A northern elephant seal on San Miguel Island, NOAA Channel Islands National Marine Sanctuary', cite: commons('CINMS_-_elephant_seal_lounging_(27099177915).jpg') },
      { id: 'hunted', claim: 'Hunted almost to extinction by the end of the 19th century; the population may have fallen to 20–40', cite: SOURCES.seals },
      { id: 'now', claim: 'Over 200,000 northern elephant seals today', cite: SOURCES.seals },
      { id: 'low', claim: 'Genetic variation in northern elephant seals remains very low', cite: SOURCES.seals },
      { id: 'draw', claim: 'Each generation’s gene copies are drawn at random from the last; smaller populations drift faster', cite: SOURCES.drift },
      { id: 'model', claim: 'The animation: a seeded random draw of gene copies, generation by generation (Wright–Fisher), as in the pack’s drift lab', cite: SOURCES.model },
    ],
  },
  {
    id: 'e04-the-jackpot-flasks',
    title: 'The jackpot flasks',
    nodeId: NODE, packId: PACK, hero: 'delbruck',
    prediction: {
      id: 'pre:e04-twenty-flasks',
      prompt: 'Twenty flasks of bacteria grow separately, then all meet the same virus. How many survivors does each flask hold?',
      choices: [{ id: 'even', label: 'About the same number' }, { id: 'jackpots', label: 'Mostly none, a few hold many' }, { id: 'none', label: 'None in any flask' }],
      answer: 'jackpots', reveal: 2, claims: ['jackpots'],
    },
    frames: [
      { media: 'delbruck', x: 50, y: 30, zoom: 1.35, text: 'In 1943, Max Delbrück and Salvador Luria asked where virus-resistant bacteria come from.', say: `In nineteen forty-three, Max ${DELBRUCK} and Salvador Luria asked where virus-resistant bacteria come from.`, claims: ['photo', 'question'] },
      { diagram: { name: 'jackpot', step: 'samples' }, text: 'First, a check. Ten samples from one flask gave steady counts of resistant colonies, from 13 to 26.', say: 'First, a check. Ten samples from one flask gave steady counts of resistant colonies, from thirteen to twenty-six.', claims: ['control'] },
      { diagram: { name: 'jackpot', step: 'cultures' }, text: 'Then twenty separate flasks. Most held none or a few. One held 107, another 64.', say: 'Then twenty separate flasks. Most held none or a few. One held a hundred and seven, another sixty-four.', claims: ['jackpots'] },
      { diagram: { name: 'jackpot', step: 'early' }, text: 'Where a resistant cell happened to appear early, its family grew huge before any virus arrived. They compared it to a slot machine.', claims: ['early', 'slot'] },
      { media: 'luria', x: 52, y: 36, zoom: 1.15, text: 'Mutations arise whether or not they will ever be useful. In 1969 the work helped win them a Nobel Prize.', say: 'Mutations arise whether or not they will ever be useful. In nineteen sixty-nine the work helped win them a Nobel Prize.', claims: ['chance', 'nobel', 'luria'] },
    ],
    takeaway: 'Mutations arise by chance, before they are needed. The virus only reveals which cells already had one.',
    media: { delbruck, luria },
    sources: [
      { id: 'photo', claim: 'Photograph of Max Delbrück', cite: commons('Max_Delbruck.jpg') },
      { id: 'luria', claim: 'Portrait of Salvador Luria, about 1969', cite: commons('Salvador_E._Luria_ca.1969_(cropped).jpg') },
      { id: 'question', claim: 'Luria and Delbrück (1943) tested whether resistance to virus α (T1) is caused by the virus or arises before it', cite: SOURCES.experiment },
      { id: 'control', claim: 'Control experiment 10a: ten samples of one culture gave 14, 15, 13, 21, 15, 14, 26, 16, 20, 13', cite: SOURCES.paper },
      { id: 'jackpots', claim: 'Experiment 16: twenty cultures gave 1, 0, 3, 0, 0, 5, 0, 5, 0, 6, 107, 0, 0, 0, 1, 0, 0, 64, 0, 35', cite: SOURCES.paper },
      { id: 'early', claim: 'A mutation early in a culture’s growth leaves a large resistant clone: the source of the fluctuation', cite: SOURCES.paper },
      { id: 'slot', claim: 'The slot-machine comparison', cite: SOURCES.paper },
      { id: 'chance', claim: 'Mutations arise without the selective pressure, not in response to it', cite: SOURCES.experiment },
      { id: 'nobel', claim: 'Delbrück and Luria won the 1969 Nobel Prize in part for this work', cite: SOURCES.experiment },
    ],
  },
];
