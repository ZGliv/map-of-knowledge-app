import type { PlaceCase } from '../types';

// New cases for evolution-e06: situations its expedition and reels never name (cases/types.ts).
// Each event is one whose felt age is far from its clock time: an "ice age" in the morning,
// a supercontinent that looks like the world's starting point but forms after ten at night, sex
// older than any large animal, a frozen planet that comes late. Same Earth age as the pack (4,540
// million years). Landmarks are generic (no named organism or place from the pack), and none sits
// close enough to an event to be copied: the learner has to place the age on the scale.
const EARTH_MA = 4540;
const LIFE = { label: 'First signs of life', ma: 3500 };
const OXYGEN = { label: 'Oxygen starts to build up in the air', ma: 2460 };
const LARGE = { label: 'First large, complex creatures', ma: 600 };
const clockCall = { kind: 'set', label: 'Clock time', min: 0, max: 24, step: 0.25, start: 0, tolerance: 1.5, unit: 'clock' } as const;

export const E06_CASES: readonly PlaceCase[] = [
  {
    id: 'c_ahce40med8',
    archetype: 'timescale',
    title: 'The oldest known ice',
    setting: 'South Africa and Eswatini',
    scenario: 'In South Africa and Eswatini, rocks laid down by glaciers record the oldest known ice age on Earth. It began about 2,985 million years ago.',
    ask: 'On Earth’s one-day clock, when did this ice age begin?',
    model: {
      engine: 'clock', earthMa: EARTH_MA,
      event: { label: 'The Pongola ice age begins', ma: 2985 },
      landmarks: [LIFE, LARGE],
      measure: 'time',
    },
    call: clockCall,
    run: 'Run the clock',
    reveal: 'Nearly 3 billion years is about two-thirds of Earth’s age, so the Pongola glaciation sits in the morning, though how far its ice spread is still uncertain. The ice ages most people picture are the recent ones: the last 2.6 million years of them fit inside the final minute before midnight.',
    claim: 'Places an event on a compressed timescale from its age, not from how recent the words “ice age” make it feel.',
    entities: ['South Africa', 'Eswatini'],
    sources: [
      { label: 'Wikipedia: Pongola glaciation', url: 'https://en.wikipedia.org/wiki/Pongola_glaciation' },
      { label: 'Wikipedia: Quaternary glaciation', url: 'https://en.wikipedia.org/wiki/Quaternary_glaciation' },
    ],
    seed: 'e06-pongola',
  },
  {
    id: 'c_z3nxmbse13',
    archetype: 'timescale',
    title: 'All the land in one piece',
    scenario: 'School maps often show Pangaea, all of Earth’s land joined in one supercontinent, as if it were the world at the start. It came together about 335 million years ago.',
    ask: 'On Earth’s one-day clock, when did Pangaea come together?',
    model: {
      engine: 'clock', earthMa: EARTH_MA,
      event: { label: 'Pangaea comes together', ma: 335 },
      landmarks: [LIFE, OXYGEN],
      measure: 'time',
    },
    call: clockCall,
    run: 'Run the clock',
    reveal: '335 million years sounds unimaginably old, but it is less than a thirteenth of Earth’s age, so Pangaea belongs to the late evening. It began to break apart about 175 million years ago, and it was the most recent supercontinent, not the first: Rodinia and others formed and broke up long before it.',
    claim: 'Reads a familiar “beginning of the world” picture as a late chapter once its real age is put on the scale.',
    entities: ['Pangaea', 'Rodinia'],
    sources: [{ label: 'Wikipedia: Pangaea', url: 'https://en.wikipedia.org/wiki/Pangaea' }],
    seed: 'e06-pangaea',
  },
  {
    id: 'c_7wqqzzsa4a',
    archetype: 'timescale',
    title: 'The oldest known sex',
    setting: 'Somerset Island, Canada',
    scenario: 'In rocks on Somerset Island in Canada lies Bangiomorpha, a red seaweed that lived about 1,047 million years ago. Some of its cells were set aside for making the next generation, the oldest evidence of sexual reproduction found so far.',
    ask: 'On Earth’s one-day clock, when did it live?',
    model: {
      engine: 'clock', earthMa: EARTH_MA,
      event: { label: 'Bangiomorpha, the oldest known sex', ma: 1047 },
      landmarks: [LIFE, OXYGEN, LARGE],
      measure: 'time',
    },
    call: clockCall,
    run: 'Run the clock',
    reveal: 'Bangiomorpha lived some 450 million years before the first large, complex creatures, so sex is not something that arrived with animals: the oldest evidence of it comes from a simple seaweed. Even so, it falls well into the evening, because a billion years is under a quarter of Earth’s age.',
    claim: 'Places a biological first by its age, even when intuition ties it to much later animals.',
    entities: ['Somerset Island', 'Canada', 'Bangiomorpha'],
    sources: [
      { label: 'Wikipedia: Bangiomorpha', url: 'https://en.wikipedia.org/wiki/Bangiomorpha' },
      { label: 'Gibson et al. 2018, Geology: Precise age of Bangiomorpha pubescens', url: 'https://doi.org/10.1130/G39829.1' },
    ],
    seed: 'e06-bangiomorpha',
  },
  {
    id: 'c_md71bhvtht',
    archetype: 'timescale',
    title: 'A planet under ice',
    scenario: 'Rocks dropped by glaciers turn up on every continent from one long ice age, the Sturtian, which began about 717 million years ago. Some geologists think it froze nearly the whole planet over, a “snowball Earth”.',
    ask: 'On Earth’s one-day clock, when did the Sturtian ice age begin?',
    model: {
      engine: 'clock', earthMa: EARTH_MA,
      event: { label: 'The Sturtian ice age begins', ma: 717 },
      landmarks: [LIFE, OXYGEN],
      measure: 'time',
    },
    call: clockCall,
    run: 'Run the clock',
    reveal: 'The Sturtian glaciation lasted from about 717 to 660 million years ago, ending some 60 million years before the first large, complex creatures. A frozen planet sounds like the raw young Earth, but this happened in the last sixth of its history.',
    claim: 'Places an event by its age even when its picture (a frozen, lifeless-looking world) suggests the planet’s early days.',
    entities: ['Sturtian'],
    sources: [
      { label: 'Wikipedia: Sturtian glaciation', url: 'https://en.wikipedia.org/wiki/Sturtian_glaciation' },
      { label: 'Wikipedia: Snowball Earth', url: 'https://en.wikipedia.org/wiki/Snowball_Earth' },
    ],
    seed: 'e06-sturtian',
  },
];
