import type { PlaceCase } from '../types';

// New cases for physics (Acceleration): situations its expedition and reels never name. They play
// in the motion engine (sims/motionMath.ts), the drop tower's own maths, in real vacuum drop tubes,
// so the rule the expedition found (distance = ½ g t², the same for everything without air) is the
// whole story, turned a new way each time, never the expedition's own distance-from-time sum: the
// time from a height (a square root), the time to halfway (not half the time), the stretch in the
// last second (far more than the average), and the time on another world (the square root of the
// weaker pull, not the pull itself). The model drop for the Glenn chamber is ½ g t² for its quoted
// 5.15 s; the shaft is drawn with round-metre ticks so no tick marks a fraction of the drop.
// Heights and times: Wikipedia (revisions pinned below); Mars's pull from NASA's fact sheet.
const DROP_TUBE = { label: 'Drop tube (Wikipedia, revision 1361479360): Bremen 4.74 s, Marshall 105 m for 4.6 s', url: 'https://en.wikipedia.org/w/index.php?title=Drop_tube&oldid=1361479360' };
const BREMEN = { label: 'Fallturm Bremen (Wikipedia, revision 1367141139): 110 m drop, 4.74 s, tube pumped to about 10 Pa', url: 'https://en.wikipedia.org/w/index.php?title=Fallturm_Bremen&oldid=1367141139' };

export const PHYSICS_CASES: readonly PlaceCase[] = [
  {
    id: 'c_vr5wp3r1c6',
    archetype: 'motion',
    title: 'Four seconds of nothing',
    setting: 'University of Bremen · since 1990',
    scenario: 'At the University of Bremen a concrete tower hides a steel tube 122 m tall, pumped almost empty of air before every drop. Scientists seal an experiment in a capsule and let it fall 110 m. While it falls, everything inside floats.',
    ask: 'How many seconds does the capsule fall?',
    model: { engine: 'motion', world: { label: 'In the tube, almost no air', g: 9.81 }, body: { label: 'The capsule' }, height: 110, measure: 'time' },
    call: { kind: 'set', label: 'Seconds falling', min: 0, max: 12, step: 0.05, start: 0, tolerance: 0.2, unit: 's' },
    run: 'Release the capsule',
    reveal: 'The tower’s own figure is 4.74 seconds. Falling speeds up, so the time grows only with the square root of the height: a tube four times as tall would buy just twice the seconds. That is why Bremen later added a catapult that fires the capsule up the tube first, for over 9 seconds.',
    claim: 'Fall time grows with the square root of the height, because distance grows with the square of the time.',
    entities: ['University of Bremen', 'Bremen'],
    sources: [BREMEN, DROP_TUBE],
    seed: 'physics-bremen-time',
  },
  {
    id: 'c_3r1qtrafw2',
    archetype: 'motion',
    title: 'Halfway down',
    setting: 'Glenn Research Center, Cleveland · since 1966',
    scenario: 'Under the Glenn Research Center in Cleveland, a shaft holds a steel chamber 140 m tall, pumped nearly empty of air. A package dropped inside falls the whole drop in about 5.15 seconds before a cart of foam beads stops it.',
    ask: 'How many seconds after release is the package halfway down?',
    model: { engine: 'motion', world: { label: 'In the chamber, almost no air', g: 9.81 }, body: { label: 'The package' }, height: 130, measure: 'reach', metres: 65 },
    call: { kind: 'set', label: 'Seconds to halfway', min: 0, max: 6, step: 0.05, start: 0, tolerance: 0.2, unit: 's' },
    run: 'Drop the package',
    reveal: 'About 3.64 seconds, well past half the time. Distance grows with the square of the time, so half the drop takes 1/√2 of the fall, about 0.71 of 5.15 seconds. The package spends most of its time on the slow top half and crosses the bottom half in 1.5 seconds.',
    claim: 'Distance fallen grows with the square of the time, so half the drop takes about seven tenths of the time, not half.',
    entities: ['Glenn Research Center', 'Cleveland'],
    sources: [{ label: 'Zero Gravity Research Facility (Wikipedia, revision 1373546488): 140 m chamber, about 5.15 s of microgravity (the 130 m drop is ½ g t² for 5.15 s)', url: 'https://en.wikipedia.org/w/index.php?title=Zero_Gravity_Research_Facility&oldid=1373546488' }],
    seed: 'physics-glenn-halfway',
  },
  {
    id: 'c_zbgy8yfdc4',
    archetype: 'motion',
    title: 'The last second',
    setting: 'Marshall Space Flight Center, Huntsville, Alabama',
    scenario: 'The drop tube at the Marshall Space Flight Center in Huntsville, Alabama, is 105 m tall. With the air pumped out, a small sample let go at the top falls freely all the way down, about 4.6 seconds.',
    ask: 'How far does the sample fall in its last second alone?',
    model: { engine: 'motion', world: { label: 'In the tube, almost no air', g: 9.81 }, body: { label: 'The sample' }, height: 105, measure: 'final', seconds: 1 },
    call: { kind: 'set', label: 'Metres in the last second', min: 0, max: 105, step: 1, start: 0, tolerance: 4, unit: 'm' },
    run: 'Let it go',
    reveal: 'About 40 m, nearly two fifths of the tube, in the final second, against under 5 m in the first. The sample gains almost 10 m/s of speed every second, so each second covers more ground than the one before; the average, 105 m over 4.6 s, says nothing about the end.',
    claim: 'A falling body gains speed steadily, so equal times cover longer and longer distances.',
    entities: ['Marshall Space Flight Center', 'Huntsville', 'Alabama'],
    sources: [DROP_TUBE],
    seed: 'physics-marshall-last',
  },
  {
    // Was c_wxta7z55rq on a 0–15 s slider, whose middle (7.5 s) sat inside the winning band. A play
    // of the old ID spends this one: its reveal gave the 7.7 s.
    id: 'c_pb808xkhd0', was: ['c_wxta7z55rq'],
    archetype: 'motion',
    title: 'The same tower on Mars',
    setting: 'Mars, in a thought experiment',
    scenario: 'Say the 110 m drop tube from the University of Bremen were rebuilt on Mars and pumped empty of air. On Mars a falling body gains 3.71 m/s of speed every second, about 2.6 times less than in Bremen, where the same drop takes 4.74 seconds.',
    ask: 'How many seconds would the capsule fall on Mars?',
    model: { engine: 'motion', world: { label: 'Mars, almost no air', g: 3.71 }, body: { label: 'The capsule' }, height: 110, measure: 'time' },
    call: { kind: 'set', label: 'Seconds falling', min: 0, max: 20, step: 0.05, start: 0, tolerance: 0.25, unit: 's' },
    run: 'Release it on Mars',
    reveal: 'About 7.7 seconds, not 2.64 × 4.74 = 12.5. The time grows with the square root of how much weaker the pull is: √2.64 is about 1.6, so the fall lasts 1.6 times longer. The same tube on Mars beats a plain drop in Bremen by 3 seconds, not by 8.',
    claim: 'Fall time depends on the square root of the pull, so a weaker pull lengthens the fall by less than it weakens.',
    entities: ['Mars', 'University of Bremen', 'Bremen'],
    sources: [BREMEN, { label: 'NASA Mars Fact Sheet: surface gravity 3.71 m/s²', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' }],
    seed: 'physics-mars-time',
  },
];
