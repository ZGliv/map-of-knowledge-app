import type { Reel, ReelMedia } from '../types';

// Two reels from "The hammer and the feather" (its Apollo 15 footage stills and its documentary
// beat) and one from "Why some notes agree" (its documentary beat). The transfer checks (which
// assumption Galileo's argument breaks; the well depth; matching sounds; fret lengths) are left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const ACCELERATION = 'knowledge.science.physics.mechanics.motion.acceleration';
const HARMONY = 'knowledge.arts.music.harmony';

const moon: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/AS15-88-11866_-_Apollo_15_flag%2C_rover%2C_LM%2C_Irwin_-_restoration1.jpg/1920px-AS15-88-11866_-_Apollo_15_flag%2C_rover%2C_LM%2C_Irwin_-_restoration1.jpg',
  alt: 'Apollo 15 on the Moon: the lunar module Falcon, the rover, the flag and astronaut James Irwin',
  credit: 'NASA, Apollo 15, 1971', license: 'Public domain', page: commons('AS15-88-11866_-_Apollo_15_flag,_rover,_LM,_Irwin_-_restoration1.jpg'),
};
const scott: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_%28S71-43788%29.jpg/1920px-Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_%28S71-43788%29.jpg',
  alt: 'David Scott on the Moon, watching the hammer and feather fall', credit: 'NASA, 1971', license: 'Public domain',
  page: commons('Astronaut_David_Scott_watching_hammer_and_feather_fall_to_lunar_surface_(S71-43788).jpg'),
  // A frame grabbed from the 1971 television picture: shown whole, like the footage it is.
  fit: 'contain',
};
const galileo: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/1920px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg',
  alt: 'Portrait of Galileo Galilei by Justus Sustermans', credit: 'Justus Sustermans, c. 1636', license: 'Public domain',
  page: commons('Justus_Sustermans_-_Portrait_of_Galileo_Galilei,_1636.jpg'),
};
const pisa: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/The_Leaning_Tower_of_Pisa_SB.jpeg/1920px-The_Leaning_Tower_of_Pisa_SB.jpeg',
  alt: 'The Leaning Tower of Pisa against a blue sky', credit: 'Saffron Blaze', license: 'CC BY-SA 3.0',
  page: commons('The_Leaning_Tower_of_Pisa_SB.jpeg'), fit: 'contain',
};
const stevin: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Portret_van_Simon_Stevin%2C_RP-P-1907-3467.jpg/1920px-Portret_van_Simon_Stevin%2C_RP-P-1907-3467.jpg',
  alt: 'Engraved portrait of Simon Stevin', credit: 'Portrait of Simon Stevin, print, 1821, Rijksmuseum', license: 'CC0',
  page: commons('Portret_van_Simon_Stevin,_RP-P-1907-3467.jpg'), tone: 'ink',
};
const gaffurio: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Gaffurio_Pythagoras.png/1920px-Gaffurio_Pythagoras.png',
  alt: 'Woodcut of Pythagoras testing bells, glasses of water, strings and pipes', credit: 'Franchino Gaffurio, Theorica musicae, 1492',
  license: 'Public domain', page: commons('Gaffurio_Pythagoras.png'), tone: 'ink',
};
const vincenzo: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Galilei_-_Della_musica_antica_et_della_moderna%2C_1581_-_1499450.jpg',
  alt: 'Title page of Vincenzo Galilei’s Dialogo della musica antica et della moderna', credit: 'Vincenzo Galilei, Florence, 1581',
  license: 'Public domain', page: commons('Galilei_-_Della_musica_antica_et_della_moderna,_1581_-_1499450.jpg'), tone: 'ink',
};

const PHYSICS = {
  nasa: 'NASA footage, Wikimedia Commons',
  pisa: 'Wikipedia: Galileo’s Leaning Tower of Pisa experiment',
  dialogue: 'Crew & de Salvio translation (1914), Internet Archive, pp. 62–63',
  values: 'Standard values',
} as const;
const MUSIC = {
  hammers: 'Wikipedia: Pythagorean hammers',
  vincenzo: 'Wikipedia: Vincenzo Galilei',
  mersenne: 'Mersenne’s laws',
  ratios: 'Standard music theory',
} as const;

export const PHYSICS_MUSIC_REELS: Reel[] = [
  {
    id: 'physics-hammer-and-feather',
    title: 'The hammer and the feather',
    nodeId: ACCELERATION, packId: 'physics', hero: 'moon',
    prediction: {
      id: 'pre:physics-moon-pull',
      prompt: 'How hard does the Moon pull on a falling object, compared with Earth?',
      choices: [{ id: 'sixth', label: 'About a sixth as hard' }, { id: 'half', label: 'About half as hard' }, { id: 'same', label: 'Just as hard' }],
      answer: 'sixth', reveal: 4, claims: ['gravity'],
    },
    frames: [
      { media: 'moon', x: 50, y: 45, zoom: 1.12, text: 'Hadley Plain, on the Moon, 2 August 1971. Apollo 15’s last moonwalk is nearly over.', say: 'Hadley Plain, on the Moon, the second of August, 1971. Apollo fifteen’s last moonwalk is nearly over.', claims: ['apollo'] },
      { media: 'scott', x: 50, y: 50, zoom: 1, text: 'Commander David Scott held up a geologist’s hammer and a falcon feather.', claims: ['apollo'] },
      { media: 'scott', x: 50, y: 50, zoom: 1, text: 'He let go of both at the same moment.', claims: ['apollo'] },
      { diagram: { name: 'fall', step: 'air' }, text: 'In a room on Earth, air pushes back on the feather, and it drifts down late.', claims: ['air'] },
      { diagram: { name: 'fall', step: 'moon' }, text: 'The Moon has no air, and pulls only about a sixth as hard as Earth. Both fell slowly. Both fell together.', claims: ['air', 'gravity'] },
      { media: 'moon', x: 46, y: 60, zoom: 1.3, text: 'They hit the dust at the same instant. Without air, everything falls at the same rate.', claims: ['apollo', 'air'] },
    ],
    takeaway: 'Without air, everything falls at the same rate.',
    media: { moon, scott },
    sources: [
      { id: 'apollo', claim: 'Apollo 15 hammer-and-feather demonstration by David Scott, 2 August 1971, at the end of the last moonwalk', cite: PHYSICS.nasa },
      { id: 'air', claim: 'In air the feather lags; with no air on the Moon, both landed together', cite: PHYSICS.nasa },
      { id: 'gravity', claim: 'g is 9.81 m/s² on Earth and 1.62 m/s² on the Moon: a ratio of about one sixth', cite: PHYSICS.values },
    ],
  },
  {
    id: 'physics-who-checked',
    title: 'Who actually checked?',
    nodeId: ACCELERATION, packId: 'physics', hero: 'galileo',
    prediction: {
      id: 'pre:physics-pisa',
      prompt: 'Galileo dropping two balls from the Leaning Tower of Pisa: did it really happen?',
      choices: [{ id: 'crowd', label: 'Yes, in front of a crowd' }, { id: 'probably-not', label: 'Probably not' }, { id: 'heavy', label: 'Yes, and the heavy ball won' }],
      answer: 'probably-not', reveal: 1, claims: ['myth'],
    },
    frames: [
      { media: 'galileo', x: 50, y: 30, zoom: 1.12, text: 'For nearly two thousand years, the standard answer came from Aristotle: a heavier body falls faster.', claims: ['aristotle'] },
      { media: 'pisa', x: 50, y: 50, zoom: 1, text: 'The famous story says Galileo dropped two balls from this tower to prove him wrong. Most historians think he never did.', claims: ['myth'] },
      { media: 'stevin', x: 50, y: 34, zoom: 1.35, text: 'Others really did. In 1586, in Delft, Simon Stevin and Jan Cornets de Groot dropped two lead balls, one ten times heavier. They landed together.', say: 'Others really did. In 1586, in Delft, Simon Stayvin and Yan Cornets de Groat dropped two lead balls, one ten times heavier. They landed together.', claims: ['delft'] },
      { media: 'galileo', x: 56, y: 26, zoom: 1.5, text: 'Galileo’s sharper weapon was an argument. In 1638 he printed it as a conversation between three friends.', claims: ['book'] },
      { media: 'galileo', x: 54, y: 24, zoom: 1.85, text: 'In it, Galileo’s spokesman doubts that Aristotle ever tested the idea at all.', claims: ['doubt'] },
    ],
    takeaway: 'Heavy and light fall together, and someone checked: Delft, 1586.',
    media: { galileo, pisa, stevin },
    sources: [
      { id: 'aristotle', claim: 'Aristotle’s view that heavier bodies fall faster stood until the late sixteenth century', cite: PHYSICS.pisa },
      { id: 'myth', claim: 'The Pisa drop is probably a thought experiment rather than an event', cite: PHYSICS.pisa },
      { id: 'delft', claim: 'Stevin and de Groot dropped two lead balls, one ten times heavier, in Delft in 1586; they landed together', cite: PHYSICS.pisa },
      { id: 'book', claim: 'Two New Sciences (1638), First Day: a conversation between Salviati, Sagredo and Simplicio', cite: PHYSICS.dialogue },
      { id: 'doubt', claim: 'Salviati: “I greatly doubt that Aristotle ever tested by experiment…”', cite: PHYSICS.dialogue },
    ],
  },
  {
    id: 'music-legend-of-the-hammers',
    title: 'The legend of the hammers',
    nodeId: HARMONY, packId: 'music', hero: 'gaffurio',
    prediction: {
      id: 'pre:music-hammer-legend',
      prompt: 'An old legend says Pythagoras found the secret of harmony by weighing a blacksmith’s hammers. Is it true?',
      choices: [{ id: 'true', label: 'Yes, the weights match the notes' }, { id: 'false', label: 'No, a hammer’s weight doesn’t set its pitch that way' }, { id: 'untested', label: 'Nobody has ever checked' }],
      answer: 'false', reveal: 2, claims: ['false'],
    },
    frames: [
      { media: 'gaffurio', x: 27, y: 24, zoom: 1.9, text: 'An old legend: Pythagoras walks past a blacksmith’s shop and hears the hammers ringing in harmony.', say: 'An old legend: Pith-ag-oras walks past a blacksmith’s shop and hears the hammers ringing in harmony.', claims: ['legend'] },
      { media: 'gaffurio', x: 74, y: 24, zoom: 1.9, text: 'He weighs them: 12, 9, 8 and 6 pounds. The best pairs make simple ratios, like 12 to 6, or 12 to 8.', claims: ['legend', 'ratios'] },
      { media: 'gaffurio', x: 50, y: 50, zoom: 1, text: 'This woodcut, from 1492, puts the same numbers on bells and pipes. But for hammers, the story is false.', claims: ['false'] },
      { media: 'vincenzo', x: 50, y: 38, zoom: 1.08, text: 'In the 1580s, the lute player Vincenzo Galilei tested it with strings and hanging weights. An octave took four times the weight, not twice.', say: 'In the 1580s, the lute player Vin-chen-zo Galilei tested it with strings and hanging weights. An octave took four times the weight, not twice.', claims: ['vincenzo', 'tension'] },
      { media: 'vincenzo', x: 50, y: 26, zoom: 1.35, text: 'His son was Galileo.', claims: ['vincenzo'] },
      { diagram: { name: 'waves', step: 'octave' }, text: 'The ratios are real, though. They belong to a vibrating string’s length. Halve it, and the note rises an octave.', claims: ['length', 'ratios'] },
    ],
    takeaway: 'Two notes agree when their vibrations line up in simple whole-number ratios: 2:1, 3:2, 4:3.',
    media: { gaffurio, vincenzo },
    sources: [
      { id: 'legend', claim: 'The legend of Pythagoras and the blacksmith’s hammers weighing 12, 9, 8 and 6', cite: MUSIC.hammers },
      { id: 'false', claim: 'The legend is false: a hammer’s weight does not set its pitch in those ratios', cite: MUSIC.hammers },
      { id: 'vincenzo', claim: 'Vincenzo Galilei, lutenist, studied pitch and string tension; father of Galileo', cite: MUSIC.vincenzo },
      { id: 'tension', claim: 'Frequency grows with the square root of tension, so an octave needs four times the weight', cite: MUSIC.mersenne },
      { id: 'length', claim: 'A stretched string’s frequency is inversely proportional to its length', cite: MUSIC.mersenne },
      { id: 'ratios', claim: 'Octave 2:1, fifth 3:2, fourth 4:3', cite: MUSIC.ratios },
    ],
    score: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/13/Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg/Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg.mp3',
      credit: 'Vincenzo Galilei, Ricercari, played on lute by Pracchia-78', license: 'Public domain',
      page: commons('Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg'),
    },
  },
];
