import type { Reel, ReelMedia } from '../types';

// E07 "Four witnesses, one story": three reels from the pack's media and provenance, plus three
// public-domain / CC BY files from mok-content-lab's appendix-evolution.md §4, each re-checked
// through the Commons API on 2026-10-16. The transfer checks (chromosome 2; marsupials across
// Antarctica) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.evidence';
const PACK = 'evolution-e07';

const tiktaalik: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Tiktaalik_roseae_life_restor.jpg',
  alt: 'Artist’s reconstruction of Tiktaalik, a flat-headed fish propping itself up on its front fins at the water’s edge',
  credit: 'Zina Deretsky, National Science Foundation', license: 'Public domain', page: commons('Tiktaalik_roseae_life_restor.jpg'),
};
const archaeopteryx: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Woodward_%281862%29_London_Archaeopteryx_sketch.jpg',
  alt: 'Henry Woodward’s 1862 drawing of the London Archaeopteryx fossil', credit: 'Henry Woodward, 1862', license: 'Public domain',
  page: commons('Woodward_(1862)_London_Archaeopteryx_sketch.jpg'), tone: 'ink',
};
const opabinia: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/USNM_PAL_57683_Opabinia_regalis_Image_3.jpg/1920px-USNM_PAL_57683_Opabinia_regalis_Image_3.jpg',
  alt: 'A fossil of Opabinia regalis from the Burgess Shale, a flattened body with a long frontal nozzle',
  credit: 'Smithsonian National Museum of Natural History, USNM PAL 57683', license: 'CC0', page: commons('USNM_PAL_57683_Opabinia_regalis_Image_3.jpg'),
};
const finches: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Darwin%27s_finches_by_Gould.jpg/1280px-Darwin%27s_finches_by_Gould.jpg',
  alt: 'Engraving of the heads of four Galápagos finches with different beaks', credit: 'John Gould, in Darwin’s Journal of Researches, 1845',
  license: 'Public domain', page: commons("Darwin's_finches_by_Gould.jpg"), tone: 'ink',
};
const darwin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Charles_Darwin_by_G._Richmond.jpg/1280px-Charles_Darwin_by_G._Richmond.jpg',
  alt: 'Watercolour portrait of a young Charles Darwin', credit: 'George Richmond, 1840', license: 'Public domain',
  page: commons('Charles_Darwin_by_G._Richmond.jpg'),
};
const beagle: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Map_charting_the_voyage_of_H.M.S._Beagle_Wellcome_L0051046.jpg/1920px-Map_charting_the_voyage_of_H.M.S._Beagle_Wellcome_L0051046.jpg',
  alt: 'Engraved world chart of the principal tracks of HMS Beagle, 1831 to 1836', credit: 'Wellcome Collection',
  license: 'CC BY 4.0', page: commons('Map_charting_the_voyage_of_H.M.S._Beagle_Wellcome_L0051046.jpg'),
};

const SOURCES = {
  darwin: 'Darwin, On the Origin of Species, 1st ed. 1859, ch. XII, body paragraph 17; Project Gutenberg #1228',
  beagle: 'Wikipedia: Second voyage of HMS Beagle (arrived 15 September, sailed for Tahiti 20 October 1835)',
  tiktaalik: 'Wikipedia: Evidence of common descent; Tiktaalik (mobile neck, wrist bones, lungs; found 2004 on Ellesmere Island)',
  archaeopteryx: 'Wikipedia: Archaeopteryx',
  opabinia: 'Wikipedia: Opabinia',
  fossil: 'Wikipedia: Fossil',
} as const;

export const E07_REELS: Reel[] = [
  {
    id: 'e07-found-on-purpose',
    title: 'Found on purpose',
    nodeId: NODE, packId: PACK, hero: 'tiktaalik',
    prediction: {
      id: 'pre:e07-where-to-dig',
      prompt: 'Rocks older than about 385 million years hold only fish. By 365 million years ago there are four-legged animals. Where would you dig for something in between?',
      choices: [{ id: 'middle', label: 'Rock about 375 million years old' }, { id: 'older', label: 'Rock older than 385 million years' }, { id: 'younger', label: 'Rock younger than 365 million years' }],
      answer: 'middle', reveal: 2, claims: ['prediction'],
    },
    frames: [
      { media: 'tiktaalik', x: 24, y: 58, zoom: 1.15, text: 'This flat-headed fish is Tiktaalik, as an artist imagines it, propping itself up at the water’s edge.', say: 'This flat-headed fish is Tick-tah-lick, as an artist imagines it, propping itself up at the water’s edge.', claims: ['art', 'found'] },
      { diagram: { name: 'strata', step: 'gap' }, text: 'Rock older than about 385 million years held only fish. By 365 million years ago, there were animals with four legs.', claims: ['prediction'] },
      { diagram: { name: 'strata', step: 'target' }, text: 'So a team went looking in rock from in between, about 375 million years old, in Arctic Canada.', claims: ['prediction'] },
      { media: 'tiktaalik', x: 30, y: 52, zoom: 1.7, text: 'In 2004, on Ellesmere Island, they found it: a fish with a neck, wrist bones and lungs.', claims: ['found'] },
      { media: 'tiktaalik', x: 50, y: 50, zoom: 1, text: 'The prediction came first. The fossil came second. That order is what makes it evidence.', claims: ['prediction', 'found'] },
    ],
    takeaway: 'Common descent said where to dig. The rock gave back a fish with a neck and wrists.',
    media: { tiktaalik },
    sources: [
      { id: 'art', claim: 'Reconstruction of Tiktaalik roseae by Zina Deretsky, National Science Foundation', cite: commons('Tiktaalik_roseae_life_restor.jpg') },
      { id: 'prediction', claim: 'Fish only in rock older than 385 Ma, four-limbed animals by 365 Ma; a 2004 search of 375 Ma rocks in Arctic Canada', cite: SOURCES.tiktaalik },
      { id: 'found', claim: 'Tiktaalik, found in 2004 on Ellesmere Island, had a mobile neck, wrist bones and lungs', cite: SOURCES.tiktaalik },
    ],
  },
  {
    id: 'e07-the-wrong-continent',
    title: 'Islands that look like the nearest coast',
    nodeId: NODE, packId: PACK, hero: 'finches',
    prediction: {
      id: 'pre:e07-twin-islands',
      prompt: 'Two island groups share volcanic soil, climate and size. One lies off South America, the other off Africa. What lives on them?',
      choices: [{ id: 'same', label: 'Much the same kinds of life' }, { id: 'coast', label: 'Life like each one’s nearest continent' }],
      answer: 'coast', reveal: 3, claims: ['cape'],
    },
    frames: [
      { media: 'finches', x: 28, y: 32, zoom: 1.3, text: 'In 1835, HMS Beagle spent five weeks in the Galápagos, five or six hundred miles off South America.', say: 'In 1835, HMS Beagle spent five weeks in the Galapagos, five or six hundred miles off South America.', claims: ['visit', 'distance'] },
      { media: 'darwin', x: 50, y: 34, zoom: 1.2, text: 'Charles Darwin saw that almost everything living there bore, in his words, “the unmistakeable stamp of the American continent.”', claims: ['stamp'] },
      { media: 'beagle', x: 41, y: 32, zoom: 1.15, text: 'Then he weighed another group: the Cape Verde Islands, off Africa. Volcanic soil. Similar climate, height and size.', claims: ['cape'] },
      { media: 'beagle', x: 44, y: 36, zoom: 1.45, text: '“But what an entire and absolute difference in their inhabitants!” Cape Verde’s life is related to Africa’s.', claims: ['cape'] },
      { media: 'finches', x: 50, y: 50, zoom: 1, text: 'His answer: settlers arrive from the nearest land, then change. Their ancestry still shows.', claims: ['birthplace'] },
    ],
    takeaway: 'Island life matches its nearest continent, not its climate. Ancestry, not surroundings, decides who lives there.',
    media: { finches, darwin, beagle },
    sources: [
      { id: 'visit', claim: 'HMS Beagle reached the Galápagos on 15 September 1835 and left on 20 October', cite: SOURCES.beagle },
      { id: 'distance', claim: 'The Galápagos lie between 500 and 600 miles from South America', cite: SOURCES.darwin },
      { id: 'stamp', claim: '“Almost every product of the land and water bears the unmistakeable stamp of the American continent”', cite: SOURCES.darwin },
      { id: 'cape', claim: 'Galápagos and Cape de Verde islands resemble each other in soil, climate, height and size, but their inhabitants differ entirely; Cape de Verde’s are related to Africa’s', cite: SOURCES.darwin },
      { id: 'birthplace', claim: 'Colonists from the nearest land are modified, “the principle of inheritance still betraying their original birthplace”', cite: SOURCES.darwin },
    ],
  },
  {
    id: 'e07-most-life-leaves-no-trace',
    title: 'Most life leaves no trace',
    nodeId: NODE, packId: PACK, hero: 'opabinia',
    prediction: {
      id: 'pre:e07-fossil-share',
      prompt: 'Of every species that has ever lived, what share do we know from fossils?',
      choices: [{ id: 'half', label: 'About half' }, { id: 'tenth', label: 'About a tenth' }, { id: 'tiny', label: 'Well under one percent' }],
      answer: 'tiny', reveal: 3, claims: ['share'],
    },
    frames: [
      { media: 'opabinia', x: 20, y: 38, zoom: 1.12, text: 'Charles Walcott found this animal, Opabinia, in the Burgess Shale in 1911.', say: 'Charles Walcott found this animal, Oh-pa-binnia, in the Burgess Shale in 1911.', claims: ['walcott'] },
      { media: 'opabinia', x: 48, y: 56, zoom: 1.35, text: 'To become a fossil, a body has to be buried fast, survive for millions of years, and then be found.', claims: ['rare'] },
      { media: 'archaeopteryx', x: 50, y: 46, zoom: 1.2, text: 'This is Archaeopteryx, dug up in Germany in 1861. It beat the odds. Most bodies never do.', claims: ['archaeopteryx', 'rare'] },
      { media: 'archaeopteryx', x: 46, y: 40, zoom: 1.6, text: 'Species known from fossils number fewer than one in twenty of those alive today. Of everything that ever lived, well under one percent.', claims: ['share'] },
      { media: 'opabinia', x: 50, y: 50, zoom: 1, text: 'So gaps are expected. The real test is whether the fossils we do find sit in rock of the right age.', claims: ['rare'] },
    ],
    takeaway: 'Fossils are rare, so gaps are expected. What counts is that the fossils we find sit in rock of the right age.',
    media: { opabinia, archaeopteryx },
    sources: [
      { id: 'walcott', claim: 'Charles Walcott found Opabinia in the Burgess Shale in 1911', cite: SOURCES.opabinia },
      { id: 'rare', claim: 'Fossilisation needs rapid burial and long survival; most organisms leave no fossil', cite: SOURCES.fossil },
      { id: 'archaeopteryx', claim: 'The London Archaeopteryx was unearthed in 1861 near Langenaltheim, Germany', cite: SOURCES.archaeopteryx },
      { id: 'share', claim: 'Species known from fossils are under 5% of known living species, so far under 1% of all that ever lived', cite: SOURCES.fossil },
    ],
  },
];
