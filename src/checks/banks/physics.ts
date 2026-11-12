import { catalog } from '../../core/catalog';
import { physics } from '../../expeditions/content/physics';
import { getExpedition } from '../../expeditions/registry';
import type { CheckBank } from '../types';

const WP = (page: string, label = page.replace(/_/g, ' ')) => ({ label: `Wikipedia: ${label}`, url: `https://en.wikipedia.org/wiki/${page}` });
const node = getExpedition(physics.id)!.nodeId;
const payoff = physics.beats.find(beat => beat.kind === 'payoff');

/** The physics pack's node (acceleration: free fall). Values: g = 9.81 m/s² on Earth and
 * 1.62 on the Moon (the pack's own), 3.7 on Mercury (checked 2026-10-16). */
export const physicsBank: CheckBank = {
  node,
  title: catalog.get(node)!.name,
  claim: payoff && payoff.kind === 'payoff' ? payoff.idea : '',
  pack: physics.id,
  expeditionFamilies: {
    'drop-predict': 'f_a3bvvp7mxe',
    'strobe-gaps': 'f_3xxasp4a6q',
    'tie-together': 'f_wda0m0ysks',
    'tie-contradiction': 'f_1479jftsxa',
    'which-assumption': 'f_z2na0ev8tx',
    'well-depth': 'f_07wgnsvzhj',
  },
  items: [
    {
      id: 'i_k8h776213r', family: 'f_e9jk1vaztt', kind: 'choice', logic: 'mass-irrelevant',
      claim: 'With no air, a heavy object and a light one fall together.',
      entities: ['glass tube', 'steel ball', 'ping-pong ball'],
      prompt: 'In a tall glass tube with the air pumped out, a steel ball and a ping-pong ball of the same size are let go at the same moment. What happens?',
      options: [
        { id: 'together', label: 'They land at the same moment' },
        { id: 'steel', label: 'The steel ball lands well ahead, because it is heavier', misconception: 'phys:heavier-falls-faster' },
        { id: 'light', label: 'The ping-pong ball lands first, because it is lighter' },
        { id: 'float', label: 'The ping-pong ball floats, because without air nothing pulls it down', misconception: 'phys:no-air-no-gravity' },
      ],
      answer: 'together',
      explain: 'Gravity still pulls on both balls; the pump removed only the air. With no air pushing back on the light ball, nothing holds it back, and they fall together, like the hammer and the feather on the Moon.',
      sources: [WP('Free_fall'), { label: 'NASA, Apollo 15 hammer and feather drop, 1971', url: 'https://commons.wikimedia.org/wiki/File:Apollo_15_feather_and_hammer_drop.ogv' }],
    },
    {
      id: 'i_papmqvh18f', family: 'f_mgqtydm43j', kind: 'flaw', logic: 'air-not-weight',
      claim: 'In air, shape decides how hard the air holds a thing back; weight alone doesn’t set the fall.',
      entities: ['stapler', 'paper'],
      prompt: 'A stapler and a sheet of paper are dropped in a room. Here is one explanation of what happens. Which step breaks?',
      steps: [
        { id: 'a', text: 'Dropped together, the stapler lands before the flat sheet of paper.' },
        { id: 'b', text: 'The stapler is much heavier than the sheet.' },
        { id: 'c', text: 'How heavy something is, and nothing else, sets how fast it falls.' },
        { id: 'd', text: 'So crumpling the sheet into a tight ball wouldn’t change how fast it falls.' },
      ],
      answer: 'c',
      explain: 'The flat sheet is held back by the air it has to push aside. Crumple it and it weighs exactly the same, yet it falls far faster, nearly keeping up with the stapler. Take the air away and all three fall together.',
      sources: [WP('Drag_(physics)'), WP('Free_fall')],
    },
    {
      id: 'i_jv7h9nz2fy', family: 'f_rr37t0n7v6', kind: 'number', generator: 'squareFromFirst', logic: 'square-law',
      claim: 'Falling from rest, distance grows with the square of the time, on any world.',
      entities: ['Mercury', 'wrench'],
      params: {
        template: 'On {place}, which has almost no air, a dropped wrench falls {first} m in its first second. How far has it fallen after {t} seconds?',
        cases: [
          { place: 'Mercury', first: 1.85, t: 4 },
          { place: 'Mercury', first: 1.85, t: 3 },
          { place: 'Mercury', first: 1.85, t: 6 },
        ],
        unit: 'm', tolerance: 0.05, digits: 1,
      },
      explain: 'Twice the time, four times the distance; three times the time, nine times. You never need Mercury’s gravity: the first second’s distance times the time squared does it.',
      sources: [WP('Mercury_(planet)', 'Mercury (planet), surface gravity 3.7 m/s²'), WP('Two_New_Sciences')],
    },
    {
      id: 'i_c8ba756rv6', family: 'f_nf37rwgy7t', kind: 'choice', logic: 'time-from-height',
      claim: 'Four times the height takes only twice the time, because distance grows with time squared.',
      entities: ['balcony'],
      prompt: 'A ball dropped from a balcony takes 1 second to reach the ground. Ignoring air, how long would it take from a balcony four times as high?',
      options: [
        { id: 'two', label: '2 seconds' },
        { id: 'four', label: '4 seconds', misconception: 'phys:distance-linear' },
        { id: 'sixteen', label: '16 seconds' },
        { id: 'one-four', label: '1.4 seconds' },
      ],
      answer: 'two',
      explain: 'Distance grows with the square of the time, so to fall 4 times as far takes √4 = 2 times as long. In 2 seconds a dropped ball falls 4 times as far as in 1.',
      sources: [WP('Two_New_Sciences'), WP('Free_fall')],
    },
    {
      id: 'i_0z7w8pseqb', family: 'f_7x7qry225h', kind: 'number', generator: 'fallTime', logic: 'fall-time',
      claim: 'From the square law you can work back from a height to the time it takes to fall.',
      entities: ['bridge', 'river', 'pebble'],
      params: {
        template: 'A pebble is dropped from rest off a bridge {height} m above a river. Ignoring air, how many seconds until it hits the water? (g = {g} m/s²)',
        cases: [
          { height: 44.1, g: 9.81 },
          { height: 19.6, g: 9.81 },
          { height: 78.4, g: 9.81 },
        ],
        unit: 's', tolerance: 0.05, digits: 1,
      },
      explain: 'A dropped object falls ½ × 9.81 × t × t metres, about 4.9 × t × t. Set that equal to the height and solve for t.',
      sources: [WP('Free_fall'), WP('Two_New_Sciences')],
    },
    {
      id: 'i_h9fsd6gt2a', family: 'f_3xxasp4a6q', kind: 'number', generator: 'oddGap', logic: 'odd-gaps',
      claim: 'In equal time steps, a falling object’s gaps grow 1, 3, 5, 7.',
      entities: ['strobe'],
      params: {
        template: 'A strobe photo shows a ball dropped from rest at the first flash, lit at equal time steps after that. Between the first and second flashes it falls {first} cm. How far does it fall between flash {k} and flash {next}?',
        cases: [
          { first: 5, k: 4 },
          { first: 2, k: 5 },
          { first: 4, k: 3 },
        ],
        unit: 'cm', tolerance: 0,
      },
      explain: 'The gaps grow as the odd numbers, 1, 3, 5, 7 …, times the first gap. Add them up and you get the squares: 1, 4, 9, 16.',
      sources: [WP('Two_New_Sciences')],
    },
    {
      id: 'i_b8a8ebc5tw', family: 'f_07wgnsvzhj', kind: 'number', generator: 'expedition:fallDistance', logic: 'half-g-t-squared',
      claim: 'Distance fallen from rest is ½ × g × t × t.',
      entities: ['well'],
      params: {
        scenarios: [
          { place: 'earth', g: 9.81, prompt: 'You drop a stone into a dry well and hear it hit the bottom {t} seconds later.', ask: 'How deep is the well? (g = 9.81 m/s²; ignore the time the sound takes to travel back up.)' },
          { place: 'moon', g: 1.62, prompt: 'An astronaut drops a rock into a pit on the Moon. It lands {t} seconds later.', ask: 'How deep is the pit? (g = 1.62 m/s²)' },
        ],
        seconds: [3, 1.5, 2.2, 4],
        unit: 'm', tolerance: 0.06,
        hint: '',
      },
      explain: 'Distance = ½ × g × t × t. On Earth ½g is about 4.9, on the Moon about 0.81.',
      sources: [{ label: 'Standard values: g = 9.81 m/s² (Earth), 1.62 m/s² (Moon)', url: 'https://en.wikipedia.org/wiki/Gravity_of_Earth' }],
    },
    {
      id: 'i_41syykr5gd', family: 'f_zh8jskk475', kind: 'order', logic: 'square-law',
      claim: 'Time matters more than gravity: three seconds on the Moon outfalls one second on Earth.',
      entities: ['Moon', 'Mercury', 'Earth'],
      prompt: 'In its first second, a dropped rock falls about 4.9 m on Earth, 1.85 m on Mercury and 0.81 m on the Moon. With no air in the way, put these falls in order of distance, shortest first.',
      items: [
        { id: 'moon1', label: '1 second on the Moon' },
        { id: 'mercury1', label: '1 second on Mercury' },
        { id: 'earth1', label: '1 second on Earth' },
        { id: 'moon3', label: '3 seconds on the Moon' },
        { id: 'earth2', label: '2 seconds on Earth' },
      ],
      answer: ['moon1', 'mercury1', 'earth1', 'moon3', 'earth2'],
      ends: ['Shortest', 'Longest'],
      explain: 'Multiply the first second’s distance by the time squared: 0.81, 1.85, 4.9, then 0.81 × 9 = 7.3 m for three seconds on the Moon, and 4.9 × 4 = 19.6 m for two seconds on Earth.',
      sources: [WP('Mercury_(planet)', 'Mercury (planet), surface gravity 3.7 m/s²'), { label: 'Standard values: g = 9.81 m/s² (Earth), 1.62 m/s² (Moon)', url: 'https://en.wikipedia.org/wiki/Gravity_of_Earth' }],
    },
    {
      id: 'i_t58yd66ys1', family: 'f_znqqnmhq0j', kind: 'flaw', logic: 'square-law',
      claim: 'A falling object doesn’t cover the same distance every second; it speeds up.',
      entities: [],
      prompt: 'A student works out how far a dropped ball falls. Which step breaks?',
      steps: [
        { id: 'a', text: 'In its first second, the ball falls about 5 m.' },
        { id: 'b', text: 'It falls the same distance in every second after that.' },
        { id: 'c', text: 'So after 3 seconds it has fallen about 15 m.' },
        { id: 'd', text: 'So doubling the time only doubles the distance.' },
      ],
      answer: 'b',
      explain: 'A falling ball speeds up, so each second it covers more ground than the last: about 5 m, then 15 m, then 25 m. After 3 seconds it has fallen about 45 m, not 15.',
      sources: [WP('Two_New_Sciences')],
    },
    {
      id: 'i_8n7kbh9rx3', family: 'f_k7mejpjbsz', kind: 'choice', logic: 'time-from-height',
      claim: 'Weaker gravity stretches a fall by the square root, not in proportion.',
      entities: ['Moon', 'Earth'],
      prompt: 'On the Moon, gravity pulls about one-sixth as hard as on Earth. Dropped from the same height, how much longer does an object take to land on the Moon than on Earth?',
      options: [
        { id: 'root', label: 'About 2.5 times as long' },
        { id: 'six', label: '6 times as long', misconception: 'phys:distance-linear' },
        { id: 'thirtysix', label: '36 times as long' },
        { id: 'same', label: 'The same time, because without air everything falls at the same rate', misconception: 'phys:same-rate-everywhere' },
      ],
      answer: 'root',
      explain: 'Distance = ½ × g × t × t. With g six times smaller, t × t must be six times bigger, so t is √6, about 2.45, times longer. “Same rate” means everything on the Moon falls together, not that the Moon matches Earth.',
      sources: [{ label: 'Standard values: g = 9.81 m/s² (Earth), 1.62 m/s² (Moon)', url: 'https://en.wikipedia.org/wiki/Gravity_of_Earth' }],
    },
    {
      id: 'i_0zvcbkrwbj', family: 'f_66gs05mc63', kind: 'number', generator: 'squareFromFirst', logic: 'square-law',
      claim: 'The square law holds for any steady speeding-up, like a ball rolling down a ramp.',
      entities: ['ramp'],
      params: {
        template: 'A ball rolls from rest down a long, smooth, gently sloping {place}. In the first second it rolls {first} cm. How far has it rolled after {t} seconds?',
        cases: [
          { place: 'ramp', first: 10, t: 3 },
          { place: 'ramp', first: 8, t: 4 },
          { place: 'ramp', first: 12, t: 5 },
        ],
        unit: 'cm', tolerance: 0.03, digits: 0,
      },
      explain: 'Galileo slowed falling down with ramps like this and found the same rule: distance grows with the square of the time.',
      sources: [WP('Two_New_Sciences')],
    },
    {
      id: 'i_7z9b2j3zf5', family: 'f_s18b017tbv', kind: 'choice', logic: 'air-not-weight',
      claim: 'Air pushes back harder on a wider shape; the pull of gravity stays the same.',
      entities: ['skydiver'],
      prompt: 'A skydiver falling belly-down with arms and legs spread out tops out at about 55 m/s. With arms and legs tucked in, the same skydiver falls much faster. Why?',
      options: [
        { id: 'shape', label: 'Spread out, more air pushes back; the weight is the same' },
        { id: 'lighter', label: 'Spreading out makes the skydiver lighter' },
        { id: 'gravity', label: 'Gravity pulls harder on a compact body' },
        { id: 'lower', label: 'Tucked in, the weight sits lower, so it pulls the body down harder' },
      ],
      answer: 'shape',
      explain: 'Gravity pulls the same either way. A spread-out body has to push aside more air, so the air’s push balances gravity at a lower speed. In a vacuum, both poses would fall together.',
      sources: [WP('Terminal_velocity')],
    },
  ],
};
