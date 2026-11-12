import type { PlaceCase } from '../types';

// New cases for music (Harmony): situations its expedition and reels never name. They play in the
// ratio engine (sims/ratioMath.ts), the monochord's and wave mixer's own maths: pitch goes
// inversely with a string's length and with the square root of its tension (Mersenne's laws), and a
// pair at p:q repeats its combined shape every q waves of the lower note. Each asks for a different
// turn, never the expedition's own (weights for an octave, finger places for an interval): a string
// that loses pull (the square root, not the pull itself), a stopped cello string (shorter is higher,
// by the inverse fraction), the calmest of five plain-looking pairs (a simple ratio, not a near
// octave), and
// how often a pair's shape repeats (the low tone divided by q, not the gap between the tones).
const MERSENNE = { label: 'Mersenne’s laws (Wikipedia, revision 1378790247): frequency ∝ 1/length and ∝ √tension; Harmonie universelle, 1636', url: 'https://en.wikipedia.org/w/index.php?title=Mersenne%27s_laws&oldid=1378790247' };

export const MUSIC_CASES: readonly PlaceCase[] = [
  {
    id: 'c_n3dtrjphap',
    archetype: 'ratio',
    title: 'A slipped peg',
    scenario: 'A harp string is tuned to 392 Hz, the G above middle C. Overnight its tuning peg slips, and by morning the string pulls with only nine sixteenths of the force it had. Its length and thickness have not changed.',
    ask: 'What frequency does it sound now?',
    model: { engine: 'ratio', measure: 'pull', hz: 392, factor: 9 / 16 },
    call: { kind: 'set', label: 'Frequency', min: 200, max: 500, step: 1, start: 500, tolerance: 5, unit: 'Hz' },
    run: 'Pluck it',
    reveal: '294 Hz, a fourth lower. Pitch follows the square root of the pull, and the square root of 9/16 is 3/4, so 392 × 3/4 = 294. Taking the pull at face value, 392 × 9/16 = 220, would drop it almost an octave.',
    claim: 'A string’s pitch follows the square root of its tension, so a change in pull moves the pitch by less.',
    entities: ['harp'],
    sources: [MERSENNE, { label: 'Piano key frequencies (Wikipedia): G4 = 392.00 Hz', url: 'https://en.wikipedia.org/wiki/Piano_key_frequencies' }],
    seed: 'music-harp-peg',
  },
  {
    id: 'c_7t1tzq95pd',
    archetype: 'ratio',
    title: 'A finger on the cello',
    scenario: 'A cello’s highest string vibrates 70 cm long, from the nut to the bridge, and sounds 220 Hz when it is played open. A cellist presses it to the fingerboard so that only 56 cm, from the finger to the bridge, still vibrates.',
    ask: 'What frequency does the string sound now?',
    model: { engine: 'ratio', measure: 'pitch', string: { label: 'Cello A string', hz: 220, length: 70, unit: 'cm' }, stopped: 56 },
    call: { kind: 'set', label: 'Frequency', min: 100, max: 500, step: 1, start: 100, tolerance: 6, unit: 'Hz' },
    run: 'Bow the string',
    reveal: '275 Hz. 56 cm is four fifths of the string, and a shorter string vibrates faster in the same proportion, so the frequency is 220 × 5/4. The ratio 5:4 is a major third: the C sharp above the open A.',
    claim: 'A string’s frequency goes inversely with its vibrating length.',
    entities: ['cello'],
    sources: [{ label: 'Cello (Wikipedia, revision 1378321411): scale length about 70 cm, top string A3', url: 'https://en.wikipedia.org/w/index.php?title=Cello&oldid=1378321411' }, MERSENNE],
    seed: 'music-cello-third',
  },
  {
    id: 'c_bxawzsk8xy',
    archetype: 'ratio',
    title: 'Five pairs on a harpsichord',
    scenario: 'A harpsichord maker tunes pairs of strings and plucks each pair together. Harpsichord strings ring with bright overtones, so every rough edge is easy to hear. Here are five pairs, in hertz.',
    ask: 'Which pair sounds calmest?',
    model: {
      engine: 'ratio', measure: 'calmest',
      pairs: [
        { id: 'p330', label: '264 and 330 Hz', hz: [264, 330] },
        { id: 'p524', label: '264 and 524 Hz', hz: [264, 524] },
        { id: 'p297', label: '264 and 297 Hz', hz: [264, 297] },
        { id: 'p396', label: '264 and 396 Hz', hz: [264, 396] },
        { id: 'p352', label: '264 and 352 Hz', hz: [264, 352] },
      ],
    },
    call: { kind: 'pick', options: [
      { id: 'p330', label: '264 and 330 Hz' },
      { id: 'p524', label: '264 and 524 Hz' },
      { id: 'p297', label: '264 and 297 Hz' },
      { id: 'p396', label: '264 and 396 Hz' },
      { id: 'p352', label: '264 and 352 Hz' },
    ] },
    run: 'Pluck every pair',
    reveal: '264 and 396 Hz, a fifth: 3:2 lines up every 2 waves. 264 and 524 looks close to an octave, but it is 131:66; its overtone at 528 Hz grinds against 524 four times a second. Near misses sound rough, and simple ratios calm, however far apart the notes are.',
    claim: 'How calm two notes sound follows how simple their frequency ratio is, not how far apart they are.',
    entities: ['harpsichord'],
    sources: [{ label: 'Consonance and dissonance (Wikipedia, revision 1378504564): beating and roughness from interfering components', url: 'https://en.wikipedia.org/w/index.php?title=Consonance_and_dissonance&oldid=1378504564' }],
    seed: 'music-harpsichord-calmest',
  },
  {
    id: 'c_qtbgmdw60t',
    archetype: 'ratio',
    title: 'A note no speaker plays',
    scenario: 'A small loudspeaker cannot play low notes. Feed it just two tones, 330 and 550 Hz, at once, and it plays both cleanly.',
    ask: 'How many times a second does their combined wave repeat its shape?',
    model: { engine: 'ratio', measure: 'repeats', hz: [330, 550] },
    call: { kind: 'set', label: 'Repeats a second', min: 0, max: 600, step: 1, start: 0, tolerance: 8, unit: 'times' },
    run: 'Play the two tones',
    reveal: '110 times a second, not 220. 550:330 is 5:3, so the shape comes round every 3 waves of the lower tone, and 330 ÷ 3 = 110. Many listeners hear a low 110 Hz pitch, an A, that the speaker never plays: the brain reads the repeat as a note. Small speakers use this to fake bass they cannot make.',
    claim: 'Two tones in the ratio p:q make a combined wave that repeats once every q waves of the lower tone.',
    entities: ['loudspeaker'],
    sources: [{ label: 'Missing fundamental (Wikipedia, revision 1368916989): the heard pitch sits at the repeat, usually the greatest common divisor; speakers use it for bass', url: 'https://en.wikipedia.org/w/index.php?title=Missing_fundamental&oldid=1368916989' }],
    seed: 'music-speaker-repeats',
  },
];
