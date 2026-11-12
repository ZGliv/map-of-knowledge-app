import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const SCORE = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/13/Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg/Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg.mp3';

export const music: Pack = {
  id: 'music',
  title: 'Why some notes agree',
  question: 'What makes two notes sound calm together?',
  path: ['Arts', 'Music', 'Harmony', 'Consonance'],
  hue: 277,
  minutes: 7,
  media: {
    gaffurio: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Gaffurio_Pythagoras.png/1920px-Gaffurio_Pythagoras.png',
      alt: 'Woodcut of Pythagoras testing bells, glasses of water, strings and pipes', credit: 'Franchino Gaffurio, Theorica musicae, 1492 · Public domain',
      page: commons('Gaffurio_Pythagoras.png'), date: '1492', tone: 'ink',
    },
    vincenzo: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Galilei_-_Della_musica_antica_et_della_moderna%2C_1581_-_1499450.jpg',
      alt: 'Title page of Vincenzo Galilei’s Dialogo della musica antica et della moderna', credit: 'Vincenzo Galilei, Florence, 1581 · Public domain',
      page: commons('Galilei_-_Della_musica_antica_et_della_moderna,_1581_-_1499450.jpg'), date: '1581', tone: 'ink',
    },
    monochord: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Fotothek_df_tg_0006258_Musik_%5E_Harmonik_%5E_Monochord_%5E_Einsaiter.jpg',
      alt: 'A 1624 engraving of a monochord divided into harmonic ratios', credit: 'Monochord, 1624 · Deutsche Fotothek · Public domain',
      page: commons('Fotothek_df_tg_0006258_Musik_^_Harmonik_^_Monochord_^_Einsaiter.jpg'), date: '1624',
    },
    galileiScore: {
      src: SCORE, alt: 'Vincenzo Galilei, Ricercari, played on lute', credit: 'Music: Vincenzo Galilei, Ricercari · Public domain recording',
      page: commons('Vincenzo_Galilei_-_Ricercari_da_uno_a_duodecimo_tuono.ogg'),
      sources: [{ src: SCORE, type: 'audio/mpeg' }],
    },
  },
  beats: [
    { kind: 'cover', media: 'gaffurio', title: 'Why some notes agree', hook: 'Play two notes together. Some pairs sound calm, some sound tense. What decides which?', focus: [50, 30] },
    {
      kind: 'order', gradeId: 'ear-rank',
      prompt: 'Listen to each pair, then put them in order from calmest to harshest.',
      items: [
        { id: 'fifth', label: 'Pair A', sound: { type: 'interval', base: 220, ratio: [3, 2] } },
        { id: 'm2', label: 'Pair B', sound: { type: 'interval', base: 220, ratio: [16, 15] } },
        { id: 'oct', label: 'Pair C', sound: { type: 'interval', base: 220, ratio: [2, 1] } },
      ],
      answer: ['oct', 'fifth', 'm2'],
      ends: ['Calmest', 'Harshest'],
      explain: 'Most ears hear C, then A, then B. Hold on to your ranking. By the end you’ll know the numbers hiding inside it.',
    },
    {
      kind: 'documentary', title: 'The legend of the hammers', score: 'galileiScore',
      frames: [
        { media: 'gaffurio', x: 27, y: 24, zoom: 1.9, seconds: 7, text: 'An old legend: Pythagoras walks past a blacksmith’s shop and hears the hammers ringing in harmony.' },
        { media: 'gaffurio', x: 74, y: 24, zoom: 1.9, seconds: 9, text: 'He weighs them: 12, 9, 8 and 6 pounds. The best pairs have simple ratios. 12 to 6 is 2:1. 12 to 8 is 3:2. 12 to 9 is 4:3.' },
        { media: 'gaffurio', x: 50, y: 50, zoom: 1.0, seconds: 8, text: 'This woodcut from 1492 puts the same numbers on bells, glasses and pipes. But the story is false. A hammer’s weight doesn’t set its pitch that way.' },
        { media: 'vincenzo', x: 50, y: 38, zoom: 1.08, seconds: 9, text: 'In the 1580s a lute player tested it with strings and hanging weights. To raise a string by an octave took four times the weight, not twice. His name was Vincenzo Galilei. His son was Galileo.' },
        { media: 'gaffurio', x: 26, y: 76, zoom: 1.7, seconds: 7, text: 'The ratios are real, though. They belong to the length of a vibrating string. Try it.' },
      ],
    },
    {
      kind: 'sim', sim: 'monochord', title: 'The monochord',
      goal: 'Slide the bridge, pluck both strings, and find three places where the pair sounds calm.',
      params: {
        base: 196,
        media: 'monochord',
        targets: [
          { n: 1, d: 2, name: 'Octave' },
          { n: 2, d: 3, name: 'Fifth' },
          { n: 3, d: 4, name: 'Fourth' },
        ],
        divisions: 12,
      },
    },
    {
      kind: 'sim', sim: 'waveMixer', title: 'See the agreement',
      goal: 'Pick a pair and watch the combined wave. Simple ratios repeat quickly; messy ones barely repeat at all.',
      params: {
        base: 220,
        presets: [
          { label: 'Unison', ratio: [1, 1] }, { label: 'Octave', ratio: [2, 1] }, { label: 'Fifth', ratio: [3, 2] },
          { label: 'Fourth', ratio: [4, 3] }, { label: 'Major third', ratio: [5, 4] }, { label: 'Tritone', ratio: [45, 32] },
          { label: 'Semitone', ratio: [16, 15] },
        ],
        question: {
          ask: 'A minor third is 6:5. It isn’t in the list. How many waves of the lower note pass before its combined shape repeats?',
          choices: [{ id: '1', label: '1' }, { id: '5', label: '5' }, { id: '6', label: '6' }, { id: '30', label: '30' }],
          answer: '5',
          explain: 'The low note makes 5 waves while the high note makes 6, then they line up. For any p:q pair the shape repeats every q low waves. A 16:15 semitone needs 15, and your ear hears that long, restless pattern as harsh.',
        },
      },
      grades: [{ gradeId: 'pattern-repeat' }],
    },
    {
      kind: 'match', gradeId: 'ear-match', transfer: true,
      prompt: 'New notes, never heard before. Match each sound to its ratio.',
      left: [
        { id: 's1', label: 'Sound 1', sound: { type: 'interval', base: 262, ratio: [16, 15] } },
        { id: 's2', label: 'Sound 2', sound: { type: 'interval', base: 247, ratio: [2, 1] } },
        { id: 's3', label: 'Sound 3', sound: { type: 'interval', base: 294, ratio: [3, 2] } },
      ],
      right: [{ id: 'r21', label: '2 : 1' }, { id: 'r32', label: '3 : 2' }, { id: 'r1615', label: '16 : 15' }],
      pairs: { s1: 'r1615', s2: 'r21', s3: 'r32' },
      explain: 'Sound 2 is an octave (2:1), almost one note. Sound 3 is a fifth (3:2), open and hollow. Sound 1 is a semitone (16:15), the grind of a long, restless pattern.',
    },
    {
      kind: 'number', gradeId: 'string-length', transfer: true, generator: 'stringLength',
      params: {
        instruments: [
          { name: 'classical guitar', mm: 650, frets: true, notes: { '2/3': 'That is almost exactly where the 7th fret sits.', '1/2': 'That is the 12th fret, halfway along.' } },
          { name: 'violin', mm: 328 },
          { name: 'bass guitar', mm: 864, frets: true, notes: { '2/3': 'That is almost exactly where the 7th fret sits.', '1/2': 'That is the 12th fret, halfway along.' } },
        ],
        intervals: [{ name: 'a fifth', n: 2, d: 3 }, { name: 'an octave', n: 1, d: 2 }, { name: 'a fourth', n: 3, d: 4 }],
        unit: 'mm', tolerance: 0.015,
        hint: 'A higher note needs a shorter string. For a fifth the vibrating part is 2/3 as long; for an octave, 1/2; for a fourth, 3/4.',
      },
    },
    {
      kind: 'payoff',
      idea: 'Two notes agree when their vibrations line up in simple whole-number ratios: 2:1, 3:2, 4:3.',
      connections: [
        { title: 'The space between beats', place: 'Arts › Music › Rhythm' },
        { title: 'Fractions past one', place: 'Mathematics › Foundations' },
        { title: 'The hammer and the feather', place: 'Science › Physics', to: 'physics' },
        { title: 'Why a piano’s fifth is slightly out of tune', place: 'Arts › Music › Tuning' },
      ],
    },
  ],
  provenance: [
    { claim: 'Hammer legend (weights 12, 9, 8, 6) and that it is false for hammers', source: 'Wikipedia: Pythagorean hammers' },
    { claim: 'Vincenzo Galilei studied pitch and string tension; father of Galileo', source: 'Wikipedia: Vincenzo Galilei' },
    { claim: 'Frequency of a stretched string is inversely proportional to its length and grows with √tension', source: 'Mersenne’s laws' },
    { claim: 'Interval ratios: octave 2:1, fifth 3:2, fourth 4:3, semitone 16:15 (just intonation)', source: 'Standard music theory' },
  ],
};
