import type { Reel, ReelMedia } from '../types';

// The Black Death ("The speed of a ship"): two reels from the pack's media, places and provenance.
// Dates are the pack's, from Wikipedia's Black Death articles; no reel gives a death toll, since the
// pack's only figures (Florence's) belong to its transfer check, which is left untouched.

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const NODE = 'knowledge.humanities.history.medieval-world.black-death';
const PACK = 'history';

const tournai: ReelMedia = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Burying_Plague_Victims_of_Tournai.jpg/1280px-Burying_Plague_Victims_of_Tournai.jpg',
  alt: 'Medieval miniature of townspeople carrying coffins to burial', credit: 'Chronicle of Gilles Li Muisis, Tournai, c. 1349–52',
  license: 'Public domain', page: commons('Burying_Plague_Victims_of_Tournai.jpg'), fit: 'contain',
};
const furst: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Paul_F%C3%BCrst%2C_Der_Doctor_Schnabel_von_Rom_%28Holl%C3%A4nder_version%29.png/960px-Paul_F%C3%BCrst%2C_Der_Doctor_Schnabel_von_Rom_%28Holl%C3%A4nder_version%29.png',
  alt: 'Engraving of a plague doctor in a beaked mask, long coat and hat, holding a stick', credit: 'Paul Fürst, Der Doctor Schnabel von Rom, c. 1656',
  license: 'Public domain', page: commons('Paul_Fürst,_Der_Doctor_Schnabel_von_Rom_(Holländer_version).png'),
};
const bruegel: ReelMedia = {
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg/1920px-The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg',
  alt: 'The Triumph of Death, a painted landscape of skeleton armies', credit: 'Pieter Bruegel the Elder, The Triumph of Death, c. 1562',
  license: 'Public domain', page: commons('The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg'),
};

const SOURCES = {
  arrival: 'Wikipedia: Black Death; Black Death in Italy / France / England / Norway',
} as const;

export const PLAGUE_REELS: Reel[] = [
  {
    id: 'plague-ships-beat-roads',
    title: 'Ships beat roads',
    nodeId: NODE, packId: PACK, hero: 'tournai',
    prediction: {
      id: 'pre:plague-after-messina',
      prompt: 'October 1347: the plague lands at Messina, in Sicily. Where does it strike next: Rome, by road, or Marseille, by sea?',
      choices: [{ id: 'rome', label: 'Rome, up the roads of Italy' }, { id: 'marseille', label: 'Marseille, across the sea' }],
      answer: 'marseille', reveal: 2, claims: ['arrival'],
    },
    frames: [
      { media: 'tournai', x: 50, y: 50, zoom: 1, text: 'Townspeople carry coffins to burial in Tournai, painted as the plague reached the town.', claims: ['tournai'] },
      { diagram: { name: 'spread', map: 'plague', step: 'messina' }, text: 'In 1346 it was killing the army besieging Kaffa, a trading port on the Black Sea. By October 1347, ships had carried it to Messina.', say: 'In thirteen forty-six it was killing the army besieging Kaffa, a trading port on the Black Sea. By October thirteen forty-seven, ships had carried it to Messina.', claims: ['arrival'] },
      { diagram: { name: 'spread', map: 'plague', step: 'race' }, text: 'Ships brought it to Marseille within a month. Rome, reached overland, held out until August 1348.', say: 'Ships brought it to Marseille within a month. Rome, reached overland, held out until August thirteen forty-eight.', claims: ['arrival'] },
      { diagram: { name: 'spread', map: 'plague', step: 'coast' }, text: 'It followed the sea lanes up the Atlantic coast, to England by June 1348 and Norway the next year.', say: 'It followed the sea lanes up the Atlantic coast, to England by June thirteen forty-eight and Norway the next year.', claims: ['arrival'] },
      { diagram: { name: 'spread', map: 'plague', step: 'moscow' }, text: 'Moscow, nearer to Kaffa than Paris is but far from the sea lanes, came last, in 1353.', say: 'Moscow, nearer to Kaffa than Paris is but far from the sea lanes, came last, in thirteen fifty-three.', claims: ['arrival'] },
      { media: 'tournai', x: 50, y: 50, zoom: 1, text: 'Distance on the map mattered less than distance along the trade routes.', claims: ['arrival'] },
    ],
    takeaway: 'The plague moved at the speed of trade: weeks by ship, months by road.',
    media: { tournai },
    sources: [
      { id: 'tournai', claim: 'The burial of plague victims in Tournai, from the chronicle of Gilles Li Muisis, c. 1349–52', cite: commons('Burying_Plague_Victims_of_Tournai.jpg') },
      { id: 'arrival', claim: 'Arrival dates: Kaffa 1346, Constantinople summer 1347, Messina October 1347, Marseille November 1347, Rome August 1348, Weymouth June 1348, Bergen August 1349, Moscow 1353', cite: SOURCES.arrival },
    ],
  },
  {
    id: 'plague-the-doctor-came-late',
    title: 'The plague doctor came late',
    nodeId: NODE, packId: PACK, hero: 'furst',
    prediction: {
      id: 'pre:plague-doctor-date',
      prompt: 'When was this picture of a beaked plague doctor made?',
      choices: [{ id: 'during', label: 'During the Black Death, around 1348' }, { id: 'century', label: 'About a century later' }, { id: 'three', label: 'About three centuries later' }],
      answer: 'three', reveal: 1, claims: ['furst'],
    },
    frames: [
      { media: 'furst', x: 48, y: 24, zoom: 1.35, text: 'A plague doctor in a beaked mask and a long coat, with a stick in his hand.', claims: ['furst'] },
      { media: 'furst', x: 50, y: 45, zoom: 1, text: 'Paul Fürst engraved him around 1656, as a doctor of Rome. The Black Death had ended three centuries before.', say: 'Paul Feerst engraved him around sixteen fifty-six, as a doctor of Rome. The Black Death had ended three centuries before.', claims: ['furst', 'arrival'] },
      { media: 'bruegel', x: 25, y: 68, zoom: 1.35, text: 'Pieter Bruegel painted The Triumph of Death around 1562, two centuries after the Black Death.', say: 'Peter Broygle painted The Triumph of Death around fifteen sixty-two, two centuries after the Black Death.', claims: ['bruegel', 'arrival'] },
      { media: 'tournai', x: 50, y: 50, zoom: 1, text: 'This miniature is different. It comes from the chronicle of Gilles Li Muisis, written in Tournai as the plague struck.', say: 'This miniature is different. It comes from a chronicle written in Tournai as the plague struck.', claims: ['tournai'] },
      { media: 'tournai', x: 50, y: 50, zoom: 1, text: 'No beaks and no skeletons: townspeople carrying coffins to their burial.', claims: ['tournai'] },
      { media: 'tournai', x: 50, y: 50, zoom: 1, text: 'To learn what people lived through, start with what they made at the time.', claims: ['tournai', 'furst', 'bruegel'] },
    ],
    takeaway: 'The famous plague doctor came three centuries late. For what people lived through, look for what they made at the time.',
    media: { furst, bruegel, tournai },
    sources: [
      { id: 'furst', claim: 'Paul Fürst, Der Doctor Schnabel von Rom, a copper engraving of a plague doctor in seventeenth-century Rome, c. 1656', cite: commons('Paul_Fürst,_Der_Doctor_Schnabel_von_Rom_(Holländer_version).png') },
      { id: 'bruegel', claim: 'Pieter Bruegel the Elder, The Triumph of Death, c. 1562', cite: commons('The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg') },
      { id: 'tournai', claim: 'The burial of plague victims in Tournai, a miniature from the chronicle of Gilles Li Muisis, c. 1349–52', cite: commons('Burying_Plague_Victims_of_Tournai.jpg') },
      { id: 'arrival', claim: 'The Black Death ran from 1346 to 1353', cite: SOURCES.arrival },
    ],
  },
];
