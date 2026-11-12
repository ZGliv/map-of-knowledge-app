import type { Reel, ReelMedia } from '../types';

// E06 "Earth's history in one day": two reels, the one-day clock (every time computed by
// deepTimeMath, drawn by diagrams-a) and Siccar Point (Playfair's own words). The transfer checks
// (Hutton's Jedburgh riverbank; ash layers bracketing a fossil) are left untouched: no Jedburgh,
// no Hutton plate, no ash.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.science.biology.evolution.deep-time';
const PACK = 'evolution-e06';

const canyon: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Grand_Canyon_%28Grand_Canyon_National_Park_Service%29.jpg/1280px-Grand_Canyon_%28Grand_Canyon_National_Park_Service%29.jpg',
  alt: 'The Grand Canyon from the South Rim at dusk: walls of red, cream and grey rock layers stepping down into the gorge',
  credit: 'Grand Canyon National Park (NPS)', license: 'CC BY 2.0', page: commons('Grand_Canyon_(Grand_Canyon_National_Park_Service).jpg'),
};
const capstone: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Siccar_Point_red_capstone_closeup.jpg/1280px-Siccar_Point_red_capstone_closeup.jpg',
  alt: 'Siccar Point: gently sloping layers of red sandstone resting on the worn edges of upright grey rock, the sea behind',
  credit: 'Dave Souza, 2008', license: 'CC BY-SA 4.0', page: commons('Siccar_Point_red_capstone_closeup.jpg'), fit: 'contain',
};
const cliff: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Siccar_point_SE_cliff.jpg/1280px-Siccar_point_SE_cliff.jpg',
  alt: 'The cliff south-east of Siccar Point: red sandstone layers over upright grey rock, above the sea',
  credit: 'Dave Souza, 2008', license: 'CC BY-SA 4.0', page: commons('Siccar_point_SE_cliff.jpg'), fit: 'contain',
};
const sketch: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Huttons_Unconformity_at_Sicar_Point_by_James_Hall_%281788%29.jpg',
  alt: 'A pencil sketch of Siccar Point: tall upright slabs of rock with flat layers lying across their tops',
  credit: 'Sir James Hall, 1788', license: 'Public domain', page: commons('Huttons_Unconformity_at_Sicar_Point_by_James_Hall_(1788).jpg'), tone: 'ink',
};

const SOURCES = {
  canyon: 'Wikipedia: Geology of the Grand Canyon area (rev. 1357763804); Vishnu Basement Rocks',
  age: 'Wikipedia: Age of Earth (rev. 1380004254)',
  clock: 'Code: src/expeditions/sims/deepTimeMath.ts (tested in deepTimeMath.test.ts)',
  life: 'Wikipedia: Earliest known life forms (rev. 1380618667)',
  complex: 'Wikipedia: Ediacaran biota (rev. 1375624864); Cambrian explosion (rev. 1378672162)',
  dinosaurs: 'Wikipedia: Dinosaur (rev. 1380480508)',
  asteroid: 'Wikipedia: Cretaceous–Paleogene extinction event (rev. 1379830492)',
  human: 'Wikipedia: Human (rev. 1380627378)',
  playfair: 'Playfair 1805, Transactions of the Royal Society of Edinburgh 5: 72–73, archive.org transactionsofro05murr; Wikipedia: Hutton’s Unconformity',
  siccar: 'Wikipedia: Hutton’s Unconformity (rev. as fetched 2026-10-16)',
} as const;

export const E06_REELS: Reel[] = [
  {
    id: 'e06-six-seconds-to-midnight',
    title: 'Six seconds to midnight',
    nodeId: NODE, packId: PACK, hero: 'canyon',
    prediction: {
      id: 'pre:e06-our-arrival',
      prompt: 'Squeeze all of Earth’s history into one day that ends at midnight. When does our species show up?',
      choices: [{ id: 'seconds', label: 'Seconds before midnight' }, { id: 'minutes', label: 'Minutes before midnight' }, { id: 'hours', label: 'Hours before midnight' }],
      answer: 'seconds', reveal: 4, claims: ['species'],
    },
    frames: [
      { media: 'canyon', x: 42, y: 62, zoom: 1.3, text: 'The dark rock at the bottom of the Grand Canyon is about 1.75 billion years old. Earth is older still: about 4.54 billion years.', say: 'The dark rock at the bottom of the Grand Canyon is about one point seven five billion years old. Earth is older still: about four point five four billion years.', claims: ['schist', 'age'] },
      { diagram: { name: 'clock', step: 'day' }, text: 'Squeeze all of it into one day. Earth forms at midnight, and each hour stands for about 190 million years.', say: 'Squeeze all of it into one day. Earth forms at midnight, and each hour stands for about a hundred and ninety million years.', claims: ['clock'] },
      { diagram: { name: 'clock', step: 'life' }, text: 'The first undisputed signs of life appear by half past five in the morning. Large, complex creatures wait until ten to nine at night.', claims: ['life', 'complex', 'clock'] },
      { diagram: { name: 'clock', step: 'late' }, text: 'The first dinosaurs arrive at a quarter to eleven. The asteroid that ends their age strikes at 11:39.', say: 'The first dinosaurs arrive at a quarter to eleven. The asteroid that ends their age strikes at eleven thirty-nine.', claims: ['dinosaurs', 'asteroid', 'clock'] },
      { diagram: { name: 'clock', step: 'zoom' }, text: 'Our species, Homo sapiens, turns up about six seconds before midnight.', claims: ['species', 'clock'] },
      { diagram: { name: 'clock', step: 'blink' }, text: 'A whole human life takes up less than two thousandths of a second.', claims: ['clock'] },
    ],
    takeaway: 'Earth is about 4.54 billion years old. On a one-day clock, our whole species fits in its last six seconds.',
    media: { canyon },
    sources: [
      { id: 'schist', claim: 'The Vishnu Schist at the bottom of the Grand Canyon formed 1.75 to 1.73 billion years ago', cite: SOURCES.canyon },
      { id: 'age', claim: 'Earth is 4.54 ± 0.05 billion years old', cite: SOURCES.age },
      { id: 'clock', claim: 'Clock times and the hour-to-years scale computed from 4,540 million years (05:29, 20:49, 22:46, 23:39, 6 s, 1.5 ms)', cite: SOURCES.clock },
      { id: 'life', claim: 'Earliest undisputed evidence of life: stromatolites, at least 3.5 billion years ago', cite: SOURCES.life },
      { id: 'complex', claim: 'Ediacaran organisms, the first large complex life, appeared around 600 million years ago', cite: SOURCES.complex },
      { id: 'dinosaurs', claim: 'The earliest known dinosaurs, 233 million years ago', cite: SOURCES.dinosaurs },
      { id: 'asteroid', claim: 'The K–Pg extinction, 66 million years ago', cite: SOURCES.asteroid },
      { id: 'species', claim: 'Homo sapiens emerged around 300,000 years ago', cite: SOURCES.human },
    ],
  },
  {
    id: 'e06-the-abyss-of-time',
    title: 'The abyss of time',
    nodeId: NODE, packId: PACK, hero: 'capstone',
    prediction: {
      id: 'pre:e06-siccar-gap',
      prompt: 'At Siccar Point, grey rock layers stand on end beneath flat red sandstone. How much time separates the two rocks?',
      choices: [{ id: 'thousands', label: 'A few thousand years' }, { id: 'million', label: 'About a million years' }, { id: 'many', label: 'About 65 million years' }],
      answer: 'many', reveal: 3, claims: ['siccar'],
    },
    frames: [
      { media: 'capstone', x: 50, y: 50, zoom: 1, text: 'Siccar Point, on the coast of Scotland. Grey layers of rock stand on end, with red sandstone lying across their worn tops.', claims: ['photo', 'siccar'] },
      { diagram: { name: 'rocks', step: 'settle' }, text: 'The grey rock began as flat layers on a deep ocean floor, about 435 million years ago.', say: 'The grey rock began as flat layers on a deep ocean floor, about four hundred and thirty-five million years ago.', claims: ['siccar'] },
      { diagram: { name: 'rocks', step: 'tilt' }, text: 'Later it was tilted until the layers stood upright, and their tops were worn away.', claims: ['siccar'] },
      { diagram: { name: 'rocks', step: 'cover' }, text: 'Only then did red sand settle on top, about 370 million years ago. Some 65 million years separate the two rocks.', say: 'Only then did red sand settle on top, about three hundred and seventy million years ago. Some sixty-five million years separate the two rocks.', claims: ['siccar'] },
      { media: 'sketch', x: 62, y: 55, zoom: 1.3, text: 'In June 1788, James Hutton came here with John Playfair and James Hall. Hall sketched what they saw.', say: 'In June seventeen eighty-eight, James Hutton came here with John Playfair and James Hall. Hall sketched what they saw.', claims: ['visit', 'sketch'] },
      { media: 'cliff', x: 50, y: 50, zoom: 1, text: 'Playfair wrote: “The mind seemed to grow giddy by looking so far into the abyss of time.”', claims: ['giddy'] },
    ],
    takeaway: 'Each step in a rock’s story takes ages, and each had to finish before the next began. That is how rocks record deep time.',
    media: { capstone, sketch, cliff },
    sources: [
      { id: 'photo', claim: 'Siccar Point: red sandstone over upright grey greywacke', cite: commons('Siccar_Point_red_capstone_closeup.jpg') },
      { id: 'siccar', claim: 'Silurian greywacke laid down around 435 Ma in the deep Iapetus Ocean, tilted near-vertical over the following 65 million years, overlain by Late Devonian (around 370 Ma) sandstone', cite: SOURCES.siccar },
      { id: 'visit', claim: 'The Siccar Point excursion of Hutton, Playfair and Hall, June 1788', cite: SOURCES.playfair },
      { id: 'sketch', claim: 'Sketch of the unconformity at Siccar Point by Sir James Hall, 1788', cite: commons('Huttons_Unconformity_at_Sicar_Point_by_James_Hall_(1788).jpg') },
      { id: 'giddy', claim: '“The mind seemed to grow giddy by looking so far into the abyss of time” (verbatim)', cite: SOURCES.playfair },
    ],
  },
];
