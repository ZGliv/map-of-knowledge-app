import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// Ported from mok-content-lab/src/content/history.ts. Changes for the atlas: licences
// recorded on every image (checked on the Commons API, 2026-10-16), and the years
// taken out of the aftermath labels, because dates give an ordering task away
// (master plan §6.10). The atlas replaces `path` with the place's real path.
//
// Arrival months come from Wikipedia's Black Death articles (Europe, Italy,
// France, England, Norway). Where chronicles disagree, `note` says so.
// Sea routes carry rough waypoints so ships sail around land, not over it.
const places = [
  { id: 'kaffa', name: 'Kaffa', lat: 45.03, lon: 35.38, when: '1346-12', label: '1346' },
  { id: 'constantinople', name: 'Constantinople', lat: 41.01, lon: 28.98, when: '1347-06', label: 'Summer 1347', from: 'kaffa', via: 'sea', path: [[44.3, 33.2], [42.3, 29.6]] },
  { id: 'alexandria', name: 'Alexandria', lat: 31.2, lon: 29.92, when: '1347-10', label: 'Autumn 1347', from: 'constantinople', via: 'sea', path: [[40.2, 26.3], [37.6, 26.4], [34.6, 28.0]] },
  { id: 'messina', name: 'Messina', lat: 38.19, lon: 15.55, when: '1347-10', label: 'October 1347', from: 'constantinople', via: 'sea', path: [[40.2, 26.3], [37.8, 24.6], [36.2, 22.6], [37.4, 18.2]] },
  { id: 'marseille', name: 'Marseille', lat: 43.3, lon: 5.37, when: '1347-11', label: 'November 1347', from: 'messina', via: 'sea', path: [[39.4, 12.6], [41.3, 9.4], [42.6, 6.6]] },
  { id: 'genoa', name: 'Genoa', lat: 44.41, lon: 8.93, when: '1348-01', label: 'January 1348', from: 'messina', via: 'sea', path: [[40.1, 12.4], [42.6, 10.1]] },
  { id: 'venice', name: 'Venice', lat: 45.44, lon: 12.33, when: '1348-01', label: 'January 1348', note: 'Some chronicles say April', from: 'constantinople', via: 'sea', path: [[40.2, 26.3], [37.8, 24.6], [36.2, 22.6], [39.4, 19.4], [42.4, 16.0]] },
  { id: 'pisa', name: 'Pisa', lat: 43.72, lon: 10.4, when: '1348-01', label: 'January 1348', from: 'genoa', via: 'sea', path: [[44.0, 9.6]] },
  { id: 'florence', name: 'Florence', lat: 43.77, lon: 11.26, when: '1348-03', label: 'March 1348', from: 'pisa', via: 'land' },
  { id: 'tunis', name: 'Tunis', lat: 36.81, lon: 10.18, when: '1348-04', label: 'April 1348', from: 'messina', via: 'sea', path: [[37.7, 12.4]] },
  { id: 'lyon', name: 'Lyon', lat: 45.76, lon: 4.84, when: '1348-04', label: 'April 1348', from: 'marseille', via: 'river' },
  { id: 'siena', name: 'Siena', lat: 43.32, lon: 11.33, when: '1348-05', label: 'May 1348', from: 'florence', via: 'land' },
  { id: 'bordeaux', name: 'Bordeaux', lat: 44.84, lon: -0.58, when: '1348-06', label: 'June 1348', from: 'marseille', via: 'land' },
  { id: 'paris', name: 'Paris', lat: 48.86, lon: 2.35, when: '1348-06', label: 'June 1348', from: 'lyon', via: 'land' },
  { id: 'weymouth', name: 'Weymouth', lat: 50.61, lon: -2.45, when: '1348-06', label: 'June 1348', from: 'bordeaux', via: 'sea', path: [[45.9, -1.7], [47.7, -5.0], [49.4, -4.2]] },
  { id: 'rome', name: 'Rome', lat: 41.9, lon: 12.5, when: '1348-08', label: 'August 1348', from: 'siena', via: 'land' },
  { id: 'cairo', name: 'Cairo', lat: 30.04, lon: 31.24, when: '1348-08', label: 'Late summer 1348', from: 'alexandria', via: 'river' },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13, when: '1348-10', label: 'Autumn 1348', from: 'weymouth', via: 'land' },
  { id: 'york', name: 'York', lat: 53.96, lon: -1.08, when: '1349-05', label: 'May 1349', from: 'london', via: 'sea', path: [[51.6, 1.5], [52.9, 1.4], [53.6, 0.2]] },
  { id: 'bergen', name: 'Bergen', lat: 60.39, lon: 5.32, when: '1349-08', label: 'August 1349', from: 'london', via: 'sea', path: [[51.6, 1.6], [54.6, 3.4], [58.2, 4.1]] },
  { id: 'trondheim', name: 'Nidaros', lat: 63.43, lon: 10.39, when: '1349-10', label: 'Autumn 1349', from: 'bergen', via: 'sea', path: [[62.0, 4.6], [63.3, 7.6]] },
  { id: 'novgorod', name: 'Novgorod', lat: 58.52, lon: 31.27, when: '1352-06', label: '1352' },
  { id: 'moscow', name: 'Moscow', lat: 55.76, lon: 37.62, when: '1353-03', label: '1353', from: 'novgorod', via: 'land' },
];

// The map frame and clock, shared by both map beats. Play shows the whole
// continent; the October 1347 question frames only the cities in play.
const europe = { type: 'conicConformal', parallels: [38, 60], center: [14, 0] } as const;
const continent = { ...europe, bbox: [[-10, 29.5], [42, 29.5], [42, 63.5], [-10, 63.5], [16, 65.5]] };

const story = [
  { when: '1346-12', text: 'Kaffa, a Genoese trading port in Crimea, is under siege. The besieging army is dying of plague.' },
  { when: '1347-06', text: 'Traders flee by ship. The disease reaches Constantinople.' },
  { when: '1347-10', text: 'Twelve Genoese galleys land at Messina, in Sicily.' },
  { when: '1348-01', text: 'Galleys reach Genoa and Venice. Pisa becomes the door into Italy.' },
  { when: '1348-03', text: 'Florence, a short way inland from Pisa.' },
  { when: '1348-06', text: 'A seaman from Gascony lands at Weymouth, England.' },
  { when: '1349-08', text: 'A ship from England reaches Bergen. Its crew die as the cargo comes ashore.' },
  { when: '1353-03', text: 'Moscow, at last. Six years after Kaffa.' },
];

export const history: Pack = {
  id: 'history',
  title: 'The speed of a ship',
  question: 'How did one disease cross a continent in five years?',
  path: ['Humanities', 'History', 'Medieval Europe', 'The Black Death'],
  hue: 335,
  minutes: 7,
  media: {
    bruegel: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg/1920px-The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg',
      alt: 'The Triumph of Death, a painted landscape of skeleton armies', credit: 'Pieter Bruegel the Elder, The Triumph of Death, c. 1562 · Public domain',
      page: commons('The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg'), date: 'c. 1562', license: 'Public domain',
    },
    tournai: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Burying_Plague_Victims_of_Tournai.jpg/1280px-Burying_Plague_Victims_of_Tournai.jpg',
      alt: 'Medieval miniature of townspeople carrying coffins to burial', credit: 'Chronicle of Gilles Li Muisis, Tournai, c. 1349–52 · Public domain',
      page: commons('Burying_Plague_Victims_of_Tournai.jpg'), date: 'c. 1350', license: 'Public domain',
    },
    furst: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Paul_F%C3%BCrst%2C_Der_Doctor_Schnabel_von_Rom_%28Holl%C3%A4nder_version%29.png/960px-Paul_F%C3%BCrst%2C_Der_Doctor_Schnabel_von_Rom_%28Holl%C3%A4nder_version%29.png',
      alt: 'Engraving of a plague doctor in a beaked mask', credit: 'Paul Fürst, Der Doctor Schnabel von Rom, c. 1656 · Public domain',
      page: commons('Paul_Fürst,_Der_Doctor_Schnabel_von_Rom_(Holländer_version).png'), date: 'c. 1656', license: 'Public domain',
    },
  },
  beats: [
    { kind: 'cover', media: 'bruegel', title: 'The speed of a ship', hook: 'In 1347 a disease left a port on the Black Sea. Within five years it had crossed a continent. What carried it?', focus: [40, 55] },
    {
      kind: 'sim', sim: 'spreadMap', title: 'October 1347',
      goal: 'Twelve Genoese galleys have just brought the plague to Messina. Which city falls sick first?',
      params: {
        mode: 'predict', places, story, credit: 'Coastlines: Natural Earth. Dates: Wikipedia’s Black Death articles.',
        region: 'Europe',
        projection: { ...europe, fitPlaces: ['constantinople', 'messina', 'rome', 'marseille'], pad: [3, 2.5] },
        time: { unit: 'month', start: '1347-10', end: '1347-10' },
        lit: ['kaffa', 'constantinople', 'messina'],
        choices: [
          { id: 'rome', via: 'land', label: 'Rome, by road' },
          { id: 'marseille', via: 'sea', label: 'Marseille, by sea' },
        ],
        origin: 'messina',
        answer: 'marseille',
        explain: 'Marseille: November 1347, a month later. Rome: August 1348, ten months later. Ships covered in weeks what roads took most of a year.',
      },
      grades: [{ gradeId: 'messina-next' }],
    },
    {
      kind: 'sim', sim: 'spreadMap', title: 'Six years in thirty seconds',
      goal: 'Play the spread. Watch which places light up early.',
      params: {
        mode: 'play', places, story,
        region: 'Europe', projection: continent,
        time: { unit: 'month', start: '1346-12', end: '1353-06' },
        credit: 'Coastlines: Natural Earth. Dates: Wikipedia’s Black Death articles. Venice’s date varies by chronicle; Novgorod’s route is unknown.',
        question: {
          ask: 'Moscow is about 1,200 km from Kaffa, closer than Paris or London. Why was it reached last?',
          choices: [
            { id: 'trade', label: 'It sat far from the sea routes the ships were sailing' },
            { id: 'cold', label: 'The cold killed the disease on the way' },
            { id: 'doctors', label: 'Its doctors held it off for years' },
            { id: 'distance', label: 'It was the farthest city from Kaffa' },
          ],
          answer: 'trade',
          explain: 'The plague followed ships around the Mediterranean and up the Atlantic coast before it came back east overland. Distance on the map mattered less than distance along trade routes.',
        },
      },
      grades: [{ gradeId: 'moscow-late' }],
    },
    {
      kind: 'source', gradeId: 'boccaccio-clue',
      source: { title: 'The Decameron, Introduction (1353)', detail: 'Giovanni Boccaccio, an eyewitness in Florence · translated by John Payne, 1886', page: 'https://www.gutenberg.org/ebooks/23700' },
      passage: [
        'I say, then, that the years [of the era] of the fruitful Incarnation of the Son of God had attained to the number of one thousand three hundred and forty-eight, when into the notable city of Florence, fair over every other of Italy, there came the death-dealing pestilence, which, [[through the operation of the heavenly bodies or of our own iniquitous dealings|heavens]], being sent down upon mankind for our correction by the just wrath of God, [[had some years before appeared in the parts of the East|east]] and after having bereft these latter of an innumerable number of inhabitants, extending without cease from one place to another, had now unhappily spread towards the West.',
        'And thereagainst no wisdom availing nor human foresight (whereby the city was purged of many impurities by officers deputed to that end and [[it was forbidden unto any sick person to enter therein|quarantine]] and many were the counsels given for the preservation of health) …',
        '… in men and women alike there appeared, at the beginning of the malady, [[certain swellings, either on the groin or under the armpits|buboes]], whereof some waxed of the bigness of a common apple, others like unto an egg …',
        '… there were made throughout the churchyards, after every other part was full, [[vast trenches, wherein those who came after were laid by the hundred|trenches]] and being heaped up therein by layers, as goods are stowed aboard ship, were covered with a little earth, till such time as they reached the top of the trench.',
      ],
      notes: {
        heavens: 'Learned people blamed the sky. One poem from 1350 pinned it on a meeting of Jupiter and Saturn. Nobody yet knew about bacteria.',
        east: 'He has the direction right. The disease came in from the Black Sea and moved west along trade routes.',
        quarantine: 'In autumn 1347 Florence cleaned its streets and turned sick travellers away. It wasn’t enough.',
        buboes: 'Swollen lymph nodes, later called buboes: the signature of bubonic plague, caused by the bacterium Yersinia pestis.',
        trenches: 'Graves like these are how we know the cause today. In 2011, Yersinia pestis DNA was found in skeletons from a Black Death cemetery at East Smithfield, London.',
      },
      question: {
        prompt: 'Which line is Boccaccio’s best evidence that the disease travelled to Florence rather than starting there?',
        choices: [
          { id: 'heavens', label: '“through the operation of the heavenly bodies”' },
          { id: 'east', label: '“had some years before appeared in the parts of the East”' },
          { id: 'buboes', label: '“certain swellings, either on the groin or under the armpits”' },
          { id: 'trenches', label: '“vast trenches”' },
        ],
        answer: 'east',
      },
    },
    {
      kind: 'spot', gradeId: 'who-lived-it',
      prompt: 'Only one of these was made by someone who lived through the Black Death. Which?',
      options: [
        { id: 'furst', media: 'furst', year: 1656, label: 'Doctor Schnabel of Rome' },
        { id: 'tournai', media: 'tournai', year: 1350, label: 'Burials at Tournai' },
        { id: 'bruegel', media: 'bruegel', year: 1562, label: 'The Triumph of Death' },
      ],
      answer: 'tournai',
      timeline: { from: 1300, to: 1700, band: [1347, 1353, 'Black Death'] },
      explain: 'The Tournai miniature comes from the chronicle of Gilles Li Muisis, written as the plague hit his town. Bruegel painted his nightmare two centuries later. The beaked plague doctor comes from a 1656 outbreak, three centuries late. (The painting on this lesson’s cover is Bruegel’s too.)',
    },
    {
      kind: 'flaw', gradeId: 'florence-count', transfer: true,
      prompt: 'Boccaccio wrote that “upward of an hundred thousand human beings perished within the walls of the city of Florence.” Check his number. Which step doesn’t hold?',
      steps: [
        { id: 'a', text: 'Florence had about 110,000–120,000 people in 1338.' },
        { id: 'b', text: 'About 50,000 were left in 1351.' },
        { id: 'c', text: 'So roughly 60,000–70,000 people were gone, from every cause.' },
        { id: 'd', text: 'That fits Boccaccio’s count of more than 100,000 dead.' },
        { id: 'e', text: 'Either way, more than half the city was gone.' },
      ],
      answer: 'd',
      explain: 'A hundred thousand deaths would have left almost nobody. Boccaccio half-admits it in the same sentence: the city “had not been accounted to hold so many.” He was right about the horror and wrong about the count. Chroniclers reached for big round numbers.',
    },
    {
      kind: 'order', gradeId: 'aftermath',
      prompt: 'The plague reshaped work too. Put England’s chain of events in order.',
      items: [
        { id: 'law', label: 'The king orders wages frozen at pre-plague levels' },
        { id: 'die', label: 'A huge share of England’s workers die' },
        { id: 'revolt', label: 'Anger at the labour laws feeds the Peasants’ Revolt' },
        { id: 'bargain', label: 'Surviving workers can bargain for higher pay' },
      ],
      answer: ['die', 'bargain', 'law', 'revolt'],
      ends: ['First', 'Last'],
      explain: 'Fewer workers meant each one was worth more. The Ordinance of Labourers (1349) and Statute of Labourers (1351) tried to hold wages at 1346 levels. Historians count them among the causes of the Peasants’ Revolt of 1381.',
    },
    {
      kind: 'payoff',
      idea: 'Disease moved at the speed of trade: ships first, roads later. Who and what travelled decided who got sick.',
      connections: [
        { title: 'Why scarce workers earn more', place: 'Economics › Markets' },
        { title: 'Hubs: why some places spread things fastest', place: 'Technology › Networks' },
        { title: 'Quarantine: where the word comes from', place: 'Science › Medicine' },
        { title: 'The Decameron: a hundred stories told while hiding from the plague', place: 'Humanities › Literature' },
      ],
    },
  ],
  provenance: [
    { claim: 'Arrival dates by city', source: 'Wikipedia: Black Death; Black Death in Italy / France / England / Norway' },
    { claim: 'Florence 110,000–120,000 (1338) to 50,000 (1351); Boccaccio’s 100,000 impossible', source: 'Wikipedia: Black Death; Black Death in Italy' },
    { claim: 'Decameron text', source: 'John Payne translation (1886), Project Gutenberg #23700' },
    { claim: 'Ordinance (1349), Statute of Labourers (1351), link to the 1381 revolt', source: 'Wikipedia: Statute of Labourers 1351; Ordinance of Labourers 1349' },
    { claim: 'East Smithfield Y. pestis DNA (2011)', source: 'Wikipedia: Black Death in England' },
    { claim: 'Coastlines', source: 'Natural Earth via world-atlas' },
  ],
};
