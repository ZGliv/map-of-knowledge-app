import type { Reel, ReelMedia } from '../types';

// E11 "Worth the risk": two reels from the pack's media and provenance. Endler's guppy work rests
// on the pack's secondary sources, as the pack marks it. The transfer checks (which traits win mates
// and which keep animals alive; the silent crickets of Kauai) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.sexual-selection';
const PACK = 'evolution-e11';
const FLIGHT = 'Longtailed_Widowbird,_Euplectes_progne_in_early_summer_breading_plumage_at_Rietvlei_Nature_Reserve,_Gauteng,_South_Africa_(15668577645).jpg';

const perched: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Euplectes_progne_male_South_Africa.jpg/1920px-Euplectes_progne_male_South_Africa.jpg',
  alt: 'A male long-tailed widowbird perched on a bush, its tail feathers hanging far below it',
  credit: 'Mohanr53, near Johannesburg, 2007', license: 'Public domain', page: commons('Euplectes_progne_male_South_Africa.jpg'),
};
const flight: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Longtailed_Widowbird%2C_Euplectes_progne_in_early_summer_breading_plumage_at_Rietvlei_Nature_Reserve%2C_Gauteng%2C_South_Africa_%2815668577645%29.jpg',
  alt: 'A male long-tailed widowbird in flight over grassland, black with a red shoulder patch, its long tail trailing behind',
  credit: 'Derek Keats, Rietvlei Nature Reserve, South Africa, 2014', license: 'CC BY 2.0', page: commons(FLIGHT), fit: 'contain',
};
const guppies: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Trinidadian_guppy_%28Poecilia_reticulata%29_male_and_female.png',
  alt: 'Two Trinidadian guppies: a male above with orange, black and blue patches, and a plain, larger female below',
  credit: 'Deacon, Shimadzu, Dornelas, Ramnarine & Magurran, Ecology and Evolution, 2015 (cropped)', license: 'CC BY 4.0', page: commons('Trinidadian_guppy_(Poecilia_reticulata)_male_and_female.png'), fit: 'contain',
};
const falls: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Venita_Waterfalls%2C_Brasso_Seco%2C_Trinidad_08.jpg/1280px-Venita_Waterfalls%2C_Brasso_Seco%2C_Trinidad_08.jpg',
  alt: 'A small waterfall pouring over dark rock into a forest pool in Trinidad',
  credit: 'Naiyo868, Venita Waterfalls, Brasso Seco, Trinidad, 2024', license: 'CC0', page: commons('Venita_Waterfalls,_Brasso_Seco,_Trinidad_08.jpg'),
};
const morin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Felix_Morin_-_Waterfall%2C_Trinidad_3099116210.jpg/1280px-Felix_Morin_-_Waterfall%2C_Trinidad_3099116210.jpg',
  alt: 'An old sepia photograph of a tall waterfall falling down a forested rock face in Trinidad',
  credit: 'Félix Morin, Trinidad, before 1901', license: 'Public domain', page: commons('Felix_Morin_-_Waterfall,_Trinidad_3099116210.jpg'),
};

const SOURCES = {
  widowbird: 'Wikipedia: Long-tailed widowbird',
  andersson: 'Wikipedia: Long-tailed widowbird; Andersson 1982, Nature 299:818, doi:10.1038/299818a0 (abstract)',
  same: 'Baker & Parker 1983, Nature 302:456, doi:10.1038/302456a0, and Andersson’s reply (counts not disputed)',
  kenya: 'Ehrlich, Dobkin & Wheye 1988, Stanford Birds essay "Sexual Selection"; Sridhar 2017 interview with Andersson (basis: secondary)',
  longer: 'Wikipedia: Sexual selection',
  guppy: 'Wikipedia: Guppy',
  falls: 'Weiner, The Beak of the Finch (1994), guppy chapter; Raven et al., Biology, ch. 20 "Evolution in action" (basis: secondary; Endler 1980, Evolution 34:76, doi:10.2307/2408316)',
  transfer: 'Broder et al. 2016 case study; Weiner 1994; Raven et al. (basis: secondary)',
  fitness: 'Wikipedia: Fitness (biology)',
} as const;

export const E11_REELS: Reel[] = [
  {
    id: 'e11-glued-on-tails',
    title: 'Tails with glue on',
    nodeId: NODE, packId: PACK, hero: 'perched',
    prediction: {
      id: 'pre:e11-longer-tails',
      prompt: 'A scientist glued extra feathers onto some male widowbirds, making their long tails even longer. Did those males attract more mates, or fewer?',
      choices: [{ id: 'more', label: 'More mates' }, { id: 'fewer', label: 'Fewer mates' }, { id: 'same', label: 'No difference' }],
      answer: 'more', reveal: 4, claims: ['andersson'],
    },
    frames: [
      { media: 'perched', x: 48, y: 45, zoom: 1.15, text: 'A male long-tailed widowbird grows tail feathers about half a metre long. In wet weather, they leave him unable to fly.', claims: ['tail'] },
      { media: 'flight', x: 50, y: 50, zoom: 1, text: 'So why grow them? In Kenya, Malte Andersson tested whether females choose, using scissors and glue.', claims: ['kenya', 'andersson'] },
      { diagram: { name: 'tails', step: 'four' }, text: 'He sorted thirty-six males into matched groups of four.', claims: ['andersson'] },
      { diagram: { name: 'tails', step: 'swap' }, text: 'In each group, one tail was cut short and the feathers glued onto another male. One was cut and glued back. One was left alone.', claims: ['andersson'] },
      { diagram: { name: 'tails', step: 'nests' }, text: 'Then he counted new nests. The lengthened males gained the most. The shortened and untouched ones gained the same.', claims: ['andersson', 'same'] },
      { media: 'perched', x: 50, y: 50, zoom: 1, text: 'Females preferred tails longer than any that grow naturally. A tail that grounds him in the rain still wins mates.', claims: ['longer', 'tail'] },
    ],
    takeaway: 'Widowbird females chose the longest tails, longer than nature makes. A costly trait can spread because it wins mates.',
    media: { perched, flight },
    sources: [
      { id: 'tail', claim: 'Male long-tailed widowbirds grow 6–8 of 12 tail feathers about half a metre long and cannot fly in wet weather', cite: SOURCES.widowbird },
      { id: 'andersson', claim: 'Andersson’s experiment: 36 males in nine matched groups of four; one tail cut, its feathers glued on to lengthen another by 20–30 cm; one cut and repaired; one unchanged; new nests counted; lengthened males had the highest mating success', cite: SOURCES.andersson },
      { id: 'same', claim: 'Shortened and unmanipulated males gained the same number of new nests', cite: SOURCES.same },
      { id: 'kenya', claim: 'The study site was in Kenya', cite: SOURCES.kenya },
      { id: 'longer', claim: 'Females were attracted to tails longer than those that naturally occur', cite: SOURCES.longer },
    ],
  },
  {
    id: 'e11-what-colour-costs',
    title: 'What colour costs',
    nodeId: NODE, packId: PACK, hero: 'guppies',
    prediction: {
      id: 'pre:e11-guppy-colour',
      prompt: 'Bright male guppies win more mates, but predators spot them more easily. Move some to a stream with few predators. Over generations, what happens?',
      choices: [{ id: 'brighter', label: 'The males get brighter' }, { id: 'duller', label: 'The males get duller' }, { id: 'same', label: 'Nothing changes' }],
      answer: 'brighter', reveal: 5, claims: ['guppy', 'transfer'],
    },
    frames: [
      { media: 'guppies', x: 50, y: 50, zoom: 1, text: 'In Trinidad’s streams, male guppies wear orange, black and blue. Females favour bright males, especially ones with orange spots.', claims: ['photo', 'guppy'] },
      { media: 'falls', x: 45, y: 45, zoom: 1.1, text: 'But below the waterfalls lives the pike cichlid, which hunts guppies, and bright males are easier to spot.', say: 'But below the waterfalls lives the pike sick lid, which hunts guppies, and bright males are easier to spot.', claims: ['falls', 'guppy'] },
      { diagram: { name: 'tradeoff', step: 'costs' }, text: 'More colour wins more mates, but fewer bright males live long enough to breed.', claims: ['guppy'] },
      { diagram: { name: 'tradeoff', step: 'peak' }, text: 'The colour that leaves the most young sits in between. In biology, fitness counts young, not years alive.', claims: ['fitness'] },
      { media: 'morin', x: 35, y: 45, zoom: 1.15, text: 'In 1976, John Endler moved about two hundred guppies above a waterfall, where the only other fish mostly eats young guppies.', say: 'In nineteen seventy-six, John Endler moved about two hundred guppies above a waterfall, where the only other fish mostly eats young guppies.', claims: ['transfer'] },
      { diagram: { name: 'tradeoff', step: 'falls' }, text: 'With less danger, the balance tipped. About fifteen generations later, the males had more spots, and bigger ones.', claims: ['transfer'] },
    ],
    takeaway: 'Colour is a trade between mates and survival. Take away the predators, and the best colour moves toward bright.',
    media: { guppies, falls, morin },
    sources: [
      { id: 'photo', claim: 'A Trinidadian guppy male with orange, black and blue patches, and a plainer female', cite: commons('Trinidadian_guppy_(Poecilia_reticulata)_male_and_female.png') },
      { id: 'guppy', claim: 'Brighter male guppies attract more females but are more noticeable to predators; females prefer bright males, especially with orange spots', cite: SOURCES.guppy },
      { id: 'falls', claim: 'Waterfalls stop the pike cichlid, a predator of guppies, so guppies above the falls face fewer enemies', cite: SOURCES.falls },
      { id: 'fitness', claim: 'Fitness is expected reproductive success, not survival or life-span', cite: SOURCES.fitness },
      { id: 'transfer', claim: 'In 1976 about two hundred guppies were moved above a waterfall where the only other fish was a killifish that mainly takes young guppies; about 15 generations later, males had more and bigger spots', cite: SOURCES.transfer },
    ],
  },
];
