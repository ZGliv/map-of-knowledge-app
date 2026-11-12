import type { Reel, ReelMedia } from '../types';

// E08 "Five times the world almost ended": three reels from the pack's media and provenance, plus
// one CC0 Smithsonian trilobite checked through the Commons API on 2026-10-17. The transfer checks
// (who survives an impact winter; the living relatives of T. rex) are left untouched: no reel cites
// their sources or says what survived, or that birds are dinosaurs.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.transitions-extinctions';
const PACK = 'evolution-e08';
const GUBBIO = 'Der_Aufschluss_der_KP-Grenze_bei_Gubbio_(43.36555_N,_12.58266_E)._Proben_von_diesem_Ort_zeigten_erstmals_die_Iridium-Anomalie,_die_zur_Annahme_eines_Asteroideneinschlags_führte.jpg';

const geulhem: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg/1280px-Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg',
  alt: 'A finger points just below a thin grey band of clay running through pale yellow rock in a tunnel wall',
  credit: 'Wilson44691, Geulhemmergroeve, the Netherlands', license: 'CC0', page: commons('Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg'),
};
const gubbio: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Der_Aufschluss_der_KP-Grenze_bei_Gubbio_%2843.36555_N%2C_12.58266_E%29._Proben_von_diesem_Ort_zeigten_erstmals_die_Iridium-Anomalie%2C_die_zur_Annahme_eines_Asteroideneinschlags_f%C3%BChrte.jpg/1280px-thumbnail.jpg',
  alt: 'The tilted limestone outcrop in the Bottaccione Gorge near Gubbio, with a red arrow marking the boundary clay',
  credit: 'Biandh, 2018 (zoomed and panned)', license: 'CC BY 4.0', page: commons(GUBBIO),
};
const alvarez: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/LWA_with_Walt.JPG/1280px-LWA_with_Walt.JPG',
  alt: 'Luis Alvarez, left, and his son Walter, right, standing at a tilted rock face in the Bottaccione Gorge, each with a hand on the rock',
  credit: 'Lawrence Berkeley Laboratory, 1981', license: 'Public domain', page: commons('LWA_with_Walt.JPG'),
};
const chicxulub: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Chicxulub_radar_topography.jpg',
  alt: 'Shaded relief of Mexico’s Yucatán Peninsula from Space Shuttle radar, shown twice; the lower copy marks a faint curved trough and a ring of sinkholes',
  credit: 'NASA/JPL-Caltech, Shuttle Radar Topography Mission, 2000', license: 'Public domain', page: commons('Chicxulub_radar_topography.jpg'), fit: 'contain',
};
const trilobite: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/USNM_PAL_536866_Eoharpes_sp.jpg/960px-USNM_PAL_536866_Eoharpes_sp.jpg',
  alt: 'A fossil trilobite in tan rock: a ridged, segmented body inside a broad horseshoe-shaped rim',
  credit: 'Chip Clark, Smithsonian National Museum of Natural History, USNM PAL 536866', license: 'CC0', page: commons('USNM_PAL_536866_Eoharpes_sp.jpg'),
};
const trex: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Tyrannosaurus_skeleton.jpg/1280px-Tyrannosaurus_skeleton.jpg',
  alt: 'A 1905 drawing of a Tyrannosaurus skeleton standing upright, with a human skeleton beside its foot for scale',
  credit: 'William D. Matthew, 1905', license: 'Public domain', page: commons('Tyrannosaurus_skeleton.jpg'), tone: 'ink', fit: 'contain',
};

const SOURCES = {
  family: 'Wikipedia: Luis Walter Alvarez (rev. 1379166099); Alvarez hypothesis (rev. 1378645628)',
  paper: 'Alvarez, Alvarez, Asaro & Michel 1980, Science 208:1095, doi:10.1126/science.208.4448.1095 (pp. 1095–1096; read, not quoted)',
  abstract: 'Alvarez et al. 1980, abstract (PubMed 17783054)',
  kpg: 'Wikipedia: Cretaceous–Paleogene extinction event (rev. 1379830492)',
  crater: 'Wikipedia: Chicxulub crater (rev. 1379989654); Cretaceous–Paleogene extinction event',
  timescale: 'Paleobiology Database time scale (API, 2026-10-16); Wikipedia: Paleozoic; Cretaceous–Paleogene extinction event',
  raup: 'Wikipedia: Extinction event (rev. 1379759322)',
  table: 'Wikipedia: Extinction event, table of extinction proportions (Sepkoski 1996 column)',
  events: 'Wikipedia: Extinction event',
  permian: 'Wikipedia: Permian–Triassic extinction event (rev. 1380638197); Triassic–Jurassic extinction',
} as const;

export const E08_REELS: Reel[] = [
  {
    id: 'e08-a-centimetre-of-clay',
    title: 'A centimetre of clay',
    nodeId: NODE, packId: PACK, hero: 'gubbio',
    prediction: {
      id: 'pre:e08-above-the-clay',
      prompt: 'In an Italian gorge, limestone built from tiny shells is split by a band of clay one centimetre thick. What lies above the clay?',
      choices: [{ id: 'same', label: 'The same kinds of shells' }, { id: 'gone', label: 'Rock where most of those kinds are gone' }, { id: 'bigger', label: 'Bigger shells of the same kinds' }],
      answer: 'gone', reveal: 1, claims: ['gorge'],
    },
    frames: [
      { media: 'gubbio', x: 42, y: 50, zoom: 1.25, text: 'In a gorge in central Italy, a bed of clay a centimetre thick splits the limestone.', claims: ['gorge'] },
      { media: 'gubbio', x: 44, y: 54, zoom: 1.7, text: 'Below it, rock packed with tiny shells. Above it, most of those kinds are gone.', claims: ['gorge'] },
      { media: 'geulhem', x: 40, y: 50, zoom: 1.3, text: 'The same thin layer runs through rocks around the world, like this tunnel wall in the Netherlands.', claims: ['geulhem', 'worldwide'] },
      { media: 'alvarez', x: 42, y: 32, zoom: 1, text: 'Walter Alvarez and his father Luis measured its iridium, hoping to learn how long the clay took to form.', claims: ['family', 'timing'] },
      { diagram: { name: 'iridium', step: 'italy' }, text: 'It held about thirty times the normal level.', claims: ['spike'] },
      { diagram: { name: 'iridium', step: 'world' }, text: 'In Denmark, a hundred and sixty times. Iridium is rare in Earth’s crust, but more common in asteroids.', claims: ['spike', 'rare'] },
      { media: 'alvarez', x: 62, y: 36, zoom: 1.2, text: 'In 1980, they blamed an asteroid about ten kilometres wide.', say: 'In nineteen eighty, they blamed an asteroid about ten kilometres wide.', claims: ['asteroid'] },
    ],
    takeaway: 'One thin layer of clay held far too much iridium, the trace of an asteroid that struck the whole world at once.',
    media: { gubbio, geulhem, alvarez },
    sources: [
      { id: 'geulhem', claim: 'Cretaceous–Paleogene boundary clay in the Geulhemmergroeve tunnels near Geulhem, the Netherlands', cite: commons('Cretaceous_Paleogene_clay_at_Geulhemmergroeve.jpg') },
      { id: 'worldwide', claim: 'The boundary layer is found worldwide in marine and terrestrial rocks', cite: SOURCES.kpg },
      { id: 'gorge', claim: 'Bottaccione Gorge: a clay bed about 1 cm thick between the highest Cretaceous and lowest Tertiary limestone; the forams disappear abruptly and planktonic forams are nearly exterminated at the boundary', cite: SOURCES.paper },
      { id: 'family', claim: 'Walter Alvarez found the boundary clay in central Italy in the 1970s and told his father Luis about it', cite: SOURCES.family },
      { id: 'timing', claim: 'The team measured iridium hoping to learn the time the clay represented', cite: SOURCES.paper },
      { id: 'spike', claim: 'Iridium about 30, 160 and 20 times the background level in Italy, Denmark and New Zealand', cite: SOURCES.abstract },
      { id: 'rare', claim: 'Iridium is more common in asteroids than in Earth’s crust', cite: SOURCES.kpg },
      { id: 'asteroid', claim: 'The 1980 paper proposed an asteroid 10 ± 4 km across', cite: SOURCES.abstract },
    ],
  },
  {
    id: 'e08-the-buried-crater',
    title: 'The crater under Yucatán',
    nodeId: NODE, packId: PACK, hero: 'chicxulub',
    prediction: {
      id: 'pre:e08-where-is-the-crater',
      prompt: 'An asteroid ten kilometres wide hit Earth 66 million years ago. Why did nobody find its crater until the 1990s?',
      choices: [{ id: 'buried', label: 'It lies buried under younger rock' }, { id: 'worn', label: 'It had worn away completely' }, { id: 'sea', label: 'Ocean impacts leave no crater' }],
      answer: 'buried', reveal: 3, claims: ['size', 'when'],
    },
    frames: [
      { media: 'chicxulub', x: 50, y: 50, zoom: 1, text: 'This is Mexico’s Yucatán Peninsula, mapped by radar from the Space Shuttle.', say: 'This is Mexico’s Yucatan Peninsula, mapped by radar from the Space Shuttle.', claims: ['radar'] },
      { media: 'alvarez', x: 50, y: 30, zoom: 1.25, text: 'In 1980, iridium in a thin layer of clay pointed to an asteroid ten kilometres wide. So where was its crater?', say: 'In nineteen eighty, iridium in a thin layer of clay pointed to an asteroid ten kilometres wide. So where was its crater?', claims: ['asteroid'] },
      { media: 'chicxulub', x: 50, y: 50, zoom: 1, text: 'Oil prospectors had already mapped a huge buried ring under Yucatán, in 1978.', say: 'Oil prospectors had already mapped a huge buried ring under Yucatan, in nineteen seventy-eight.', claims: ['ring'] },
      { diagram: { name: 'crater', step: 'buried' }, text: 'It is a crater about two hundred kilometres across, buried about a kilometre down.', claims: ['size'] },
      { diagram: { name: 'crater', step: 'core' }, text: 'From 1990, drill samples from the ring showed rock damaged by a violent shock. By the early 1990s, the crater was confirmed.', say: 'From nineteen ninety, drill samples from the ring showed rock damaged by a violent shock. By the early nineteen nineties, the crater was confirmed.', claims: ['cores'] },
      { media: 'chicxulub', x: 50, y: 50, zoom: 1, text: 'On the surface, the only signs are a faint curved trough and a ring of sinkholes.', claims: ['radar'] },
    ],
    takeaway: 'The crater was there all along: about two hundred kilometres wide, buried a kilometre under Yucatán.',
    media: { chicxulub, alvarez },
    sources: [
      { id: 'radar', claim: 'Shaded relief of the Yucatán from the Shuttle Radar Topography Mission, showing a subtle trough and a ring of cenotes (sinkholes) over the buried crater', cite: commons('Chicxulub_radar_topography.jpg') },
      { id: 'asteroid', claim: 'In 1980 the Alvarez team proposed an asteroid 10 ± 4 km across from the iridium in the boundary clay', cite: SOURCES.abstract },
      { id: 'when', claim: 'The Cretaceous–Paleogene boundary is 66.0 million years ago', cite: SOURCES.timescale },
      { id: 'ring', claim: 'Camargo and Penfield found the buried ring in a 1978 Pemex magnetic survey', cite: SOURCES.crater },
      { id: 'size', claim: 'The crater is about 200 km wide and buried about 1 km down; it was confirmed in the early 1990s', cite: SOURCES.crater },
      { id: 'cores', claim: 'Drill samples obtained from 1990 showed shock metamorphism; the crater was confirmed in the early 1990s', cite: SOURCES.crater },
    ],
  },
  {
    id: 'e08-the-great-dying',
    title: 'Worse than the asteroid',
    nodeId: NODE, packId: PACK, hero: 'trilobite',
    prediction: {
      id: 'pre:e08-share-of-sea-species',
      prompt: 'About 252 million years ago, life in the sea crashed. Roughly what share of sea species vanished?',
      choices: [{ id: 'quarter', label: 'About a quarter' }, { id: 'half', label: 'About half' }, { id: 'most', label: 'About four in five' }],
      answer: 'most', reveal: 3, claims: ['species'],
    },
    frames: [
      { media: 'trilobite', x: 50, y: 50, zoom: 1.05, text: 'A trilobite, found in Morocco. The very last trilobites vanished in one great crash.', claims: ['specimen', 'species'] },
      { diagram: { name: 'extinctions', step: 'rise' }, text: 'Five crashes stand out. These bars show the share of sea-animal genera lost in each.', claims: ['big-five', 'table'] },
      { diagram: { name: 'extinctions', step: 'permian' }, text: 'The tallest bar is not the asteroid’s. It is the end of the Permian, 252 million years ago.', say: 'The tallest bar is not the asteroid’s. It is the end of the Permian, two hundred and fifty-two million years ago.', claims: ['table'] },
      { media: 'trilobite', x: 50, y: 44, zoom: 1.6, text: 'About four in five sea species vanished, and seven in ten species of land vertebrates. The trilobites went with them.', claims: ['species'] },
      { media: 'trilobite', x: 50, y: 50, zoom: 1, text: 'The consensus cause: the Siberian Traps, vast volcanic eruptions. Land vertebrates may have taken thirty million years to recover.', claims: ['cause', 'recovery'] },
      { media: 'trex', x: 50, y: 50, zoom: 1, text: 'Into that emptied world spread the archosaurs: the line that led to crocodiles and dinosaurs.', say: 'Into that emptied world spread the arko-sores: the line that led to crocodiles and dinosaurs.', claims: ['recovery'] },
    ],
    takeaway: 'The worst crash came 252 million years ago, not 66. About four in five sea species vanished.',
    media: { trilobite, trex },
    sources: [
      { id: 'specimen', claim: 'An Eoharpes trilobite collected in Morocco, Smithsonian NMNH USNM PAL 536866', cite: commons('USNM_PAL_536866_Eoharpes_sp.jpg') },
      { id: 'big-five', claim: 'Raup and Sepkoski (1982) identified five intervals of excessive diversity loss', cite: SOURCES.raup },
      { id: 'table', claim: 'Genus losses (Sepkoski 1996): Permian–Triassic 252 Ma, about 58%, the largest of the fifteen events', cite: SOURCES.table },
      { id: 'species', claim: 'Permian–Triassic: about 81% of marine species and 70% of terrestrial vertebrate species; the last trilobites were lost', cite: SOURCES.events },
      { id: 'cause', claim: 'The consensus cause of the end-Permian extinction is the Siberian Traps flood basalts', cite: SOURCES.permian },
      { id: 'recovery', claim: 'Vertebrate recovery took 30 million years by some estimates (debated); archosaurs diversified afterwards', cite: SOURCES.events },
    ],
  },
];
