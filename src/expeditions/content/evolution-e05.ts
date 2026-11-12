import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// Example places along the Ensatina ring, read off the range map in Devitt, Baird &
// Moritz 2011 (CC BY 2.0). They mark where each line runs, not survey sites.
// The order of spread is Stebbins's hypothesis, supported by DNA (Wake 1997;
// Kuchta et al. 2009). No dates: the literature does not pin them down well
// enough to show, so time runs in stages instead of years.
const places = [
  { id: 'north', name: 'Klamath Mountains', lat: 41.5, lon: -123.3, when: 1, label: 'the ancestors' },
  { id: 'northcoast', name: 'North Coast Ranges', lat: 39.6, lon: -123.4, when: 2, label: 'coast line', from: 'north', via: 'sea', labelSide: 'left' },
  { id: 'northsierra', name: 'Northern Sierra', lat: 39.9, lon: -121.0, when: 2, label: 'Sierra line', from: 'north', via: 'land' },
  { id: 'bay', name: 'Bay Area', lat: 37.85, lon: -122.2, when: 3, label: 'yellow-eyed', from: 'northcoast', via: 'sea', labelSide: 'left' },
  { id: 'yosemite', name: 'Central Sierra', lat: 37.75, lon: -119.7, when: 3, label: 'spotted form', from: 'northsierra', via: 'land' },
  { id: 'monterey', name: 'Monterey', lat: 36.55, lon: -121.85, when: 4, label: 'plain form', from: 'bay', via: 'sea', labelSide: 'left' },
  { id: 'southsierra', name: 'Southern Sierra', lat: 36.4, lon: -118.75, when: 4, label: 'spotted form', from: 'yosemite', via: 'land' },
  { id: 'santaynez', name: 'Santa Ynez Mts', lat: 34.55, lon: -119.8, when: 5, label: 'plain form', from: 'monterey', via: 'sea', labelSide: 'left' },
  { id: 'tehachapi', name: 'Tehachapi Mts', lat: 35.0, lon: -118.55, when: 5, label: 'yellow-blotched form', from: 'southsierra', via: 'land' },
  { id: 'lacoast', name: 'LA ranges', lat: 34.15, lon: -118.4, when: 6, label: 'plain form', from: 'santaynez', via: 'sea', labelSide: 'left' },
  { id: 'sanbernardino', name: 'San Bernardino Mts', lat: 34.2, lon: -117.0, when: 6, label: 'large-blotched form', from: 'tehachapi', via: 'land' },
  { id: 'palomar', name: 'Palomar Mountain', lat: 33.36, lon: -116.84, when: 6, label: 'the ends meet', from: ['lacoast', 'sanbernardino'], reveal: true },
  // A tempting wrong answer only: nothing lives on the valley floor, so it never lights.
  { id: 'valley', name: 'Valley floor', lat: 36.75, lon: -119.95, when: 99, label: '', reveal: true },
];

const story = [
  { when: 1, text: 'Stebbins’s idea: the ancestors lived in the far north of California or in southern Oregon.' },
  { when: 2, text: 'The range forks. One front heads down the coast ranges, the other down the Sierra Nevada.' },
  { when: 3, text: 'Between them lies the hot, dry Central Valley. These forest salamanders don’t live on its floor.' },
  { when: 4, text: 'Kept apart, the two lines change: plain on the coast, spotted and blotched inland.' },
  { when: 5, text: 'Along each line, neighbours still interbreed where they meet.' },
  { when: 6, text: 'Both fronts reach the mountains of southern California.' },
];

// A rough outline of the valley floor, [lat, lon], for orientation only.
const valley = [
  [40.7, -122.35], [39.8, -122.25], [39.0, -122.05], [38.3, -121.9], [37.7, -121.45], [37.0, -120.95], [36.3, -120.45],
  [35.6, -119.85], [35.05, -119.3], [34.95, -118.95], [35.3, -118.85], [35.9, -119.15], [36.6, -119.5], [37.3, -120.1],
  [38.0, -120.75], [38.7, -121.05], [39.5, -121.5], [40.3, -121.95],
];

export const evolutionE05: Pack = {
  id: 'evolution-e05',
  title: 'The salamander ring',
  question: 'Where does one species end and the next begin?',
  path: ['Life', 'Evolution', 'New species', 'Ring species'],
  hue: 130,
  minutes: 7,
  media: {
    monterey: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Ensatina_eschscholtzii_eschscholtzii_261136762.jpg/1920px-Ensatina_eschscholtzii_eschscholtzii_261136762.jpg',
      alt: 'Close-up of a Monterey ensatina salamander, orange-brown with large black eyes', credit: 'Alex Heyman, via iNaturalist · CC0',
      page: commons('Ensatina_eschscholtzii_eschscholtzii_261136762.jpg'), date: '2023', license: 'CC0',
    },
    ring: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Ensatina_eschscholtzii_ring_species.jpg',
      alt: 'Map of the seven Ensatina subspecies forming a horseshoe around California’s Central Valley, with a photo of each',
      credit: 'Thomas J. Devitt, Stuart J. E. Baird and Craig Moritz, BMC Evolutionary Biology, 2011 · CC BY 2.0',
      page: commons('Ensatina_eschscholtzii_ring_species.jpg'), date: '2011', license: 'CC BY 2.0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'monterey', title: 'The salamander ring',
      hook: 'Follow one salamander family around California’s Central Valley. Every neighbour can breed with the next. Then the two ends meet.',
      focus: [42, 45],
    },
    {
      kind: 'predict', gradeId: 'ends-meet', media: 'ring',
      prompt: 'Ensatina salamanders live in a horseshoe of mountains around the Central Valley. Each population can breed with its neighbours. In the far south, the two ends of the horseshoe meet. What happens there?',
      parts: [
        { id: 'meet', label: '', answer: 'rarely', choices: [
          { id: 'freely', label: 'They interbreed freely, like every other pair of neighbours',
            feedback: 'That would follow if interbreeding passed down the line like a relay baton. It doesn’t.' },
          { id: 'rarely', label: 'They live side by side and rarely interbreed, almost like two species' },
          { id: 'wipeout', label: 'One form wipes out the other',
            feedback: 'They share the mountains. On Palomar Mountain the plain form lives in the oak scrub below about 1,370 m, the blotched form in the pine forest above.' },
        ] },
      ],
      explain: 'Mostly they keep apart. At most of the places where the plain coastal form meets the blotched inland form, hybrids are rare. At one site on Palomar Mountain they are common, but still selected against. Some biologists argue Ensatina is several species, not one ring, so this classic case is still debated.',
    },
    {
      kind: 'sim', sim: 'spreadMap', title: 'Around the valley',
      goal: 'Press Play to follow the spread. There are no dates: biologists can put these steps in order but can’t yet date them well.',
      params: {
        mode: 'play', places, story, region: 'California', labelFlip: true, labels: 'fresh', freshText: 'label',
        size: [860, 1000],
        projection: { type: 'conicEqualArea', parallels: [34, 40.5], center: [-120, 0], bbox: [[-124.5, 32.6], [-115.9, 42.0]] },
        time: {
          unit: 'stage', start: 1, end: 6, freshFor: 1,
          labels: { 1: 'Ancestors in the north', 2: 'The fork', 3: 'Two lines', 4: 'Drifting apart', 5: 'Still south', 6: 'Southern mountains' },
        },
        legend: [{ via: 'sea', label: 'coast line' }, { via: 'land', label: 'Sierra line' }],
        regions: [{ name: 'Central Valley', coords: valley, labelAt: [37.75, -121.0], labelAngle: 58 }],
        question: {
          pickPlace: true,
          ask: 'Where do the two ends of the ring meet? Tap the place.',
          choices: [
            { id: 'palomar', label: 'Palomar Mountain, in the far south' },
            { id: 'monterey', label: 'Monterey Bay, on the coast' },
            { id: 'valley', label: 'The valley floor, straight across' },
          ],
          answer: 'palomar',
          explain: 'Palomar Mountain is one of four places in southern California where the two ends live side by side. A 2009 DNA study tested a rival idea, that the ring closed at Monterey Bay, and found strong support for the southern meeting. Nothing lives on the valley floor: too dry.',
        },
        credit: 'Order of spread: Stebbins’s hypothesis, supported by DNA (Wake 1997; Kuchta et al. 2009). Dots are example places along each line, not survey sites. Coastlines: Natural Earth.',
      },
      grades: [{ gradeId: 'ring-meet' }],
    },
    {
      kind: 'order', gradeId: 'split-steps',
      prompt: 'Put the making of the ring in order.',
      items: [
        { id: 'north', label: 'One ancestral population lives in the north' },
        { id: 'fork', label: 'It spreads south down both sides of the dry valley' },
        { id: 'apart', label: 'Kept apart, the two lines change in different ways' },
        { id: 'meet', label: 'The two lines meet again in the south' },
        { id: 'barrier', label: 'They now rarely interbreed: nearly two species' },
      ],
      answer: ['north', 'fork', 'apart', 'meet', 'barrier'],
      ends: ['First', 'Last'],
      explain: 'Split first, differ while apart, and the breeding barrier is what shows when they meet. Real life is messier: near San Francisco Bay the yellow-eyed coastal form crossed the valley into the Sierra foothills, and its hybrids with the spotted Sierra form are strongly selected against.',
    },
    {
      kind: 'flaw', gradeId: 'fixed-types',
      prompt: '“Species are fixed, separate types, and every animal belongs to exactly one.” Follow that idea around the ring. Which step breaks?',
      steps: [
        { id: 'a', text: 'Animals that can interbreed belong to the same species.' },
        { id: 'b', text: 'Each Ensatina population interbreeds with its neighbour.' },
        { id: 'c', text: 'So each population is the same species as its neighbour.' },
        { id: 'd', text: 'So, neighbour by neighbour, the two ends are one species too.' },
        { id: 'e', text: 'So the two ends should interbreed freely.' },
      ],
      answer: 'd',
      explain: 'Interbreeding doesn’t pass along a chain. A breeds with B, and B with C, yet A and C may not. Small differences pile up from neighbour to neighbour, so there is no single place to draw the line. Species blur at the edges because they form gradually.',
    },
    {
      kind: 'predict', gradeId: 'apple-flies', transfer: true,
      prompt: 'Apple maggot flies once laid eggs only in hawthorn fruit. Apples came to North America, and by the mid-1800s some flies lived on apples. Today the two groups rarely interbreed in the wild, though they can in a lab. Why?',
      parts: [
        { id: 'why', label: '', answer: 'timing', choices: [
          { id: 'timing', label: 'Apples fruit earlier, so apple flies emerge earlier. The two groups are adults at different times.' },
          { id: 'sterile', label: 'Their offspring can’t survive.',
            feedback: 'In a lab they produce healthy young. Whatever keeps them apart acts before mating.' },
          { id: 'mountains', label: 'Mountains split them, like the salamanders’ valley.',
            feedback: 'They share the same land: the apple flies’ range sits inside the hawthorn flies’ range.' },
          { id: 'better', label: 'Some flies chose apples because apples are better food.',
            feedback: 'Even if true, that says nothing about why the groups stopped interbreeding. Something has to keep them apart.' },
        ] },
      ],
      explain: 'Timing. Same orchards, different calendars. Biologists see the apple flies as a possible early step toward a new species, split without any mountain or valley between them. It is happening now, and how it ends isn’t settled.',
    },
    {
      kind: 'match', gradeId: 'barriers', transfer: true, buckets: true,
      prompt: 'What keeps species apart? Sort each case: does the barrier act before mating or after?',
      left: [
        { id: 'monkey', label: 'Two monkeyflowers: one pollinated by bees, one by hummingbirds' },
        { id: 'mule', label: 'Horse and donkey: their mule is nearly always sterile' },
        { id: 'skunk', label: 'Spotted skunks: one kind mates in spring, the western kind in autumn' },
        { id: 'liger', label: 'Lion and tiger: male ligers are sterile' },
        { id: 'song', label: 'Two grasshoppers that differ in their mating song' },
        { id: 'frog', label: 'Some frogs: eggs fertilised by another species stop developing' },
      ],
      right: [{ id: 'before', label: 'Before mating' }, { id: 'after', label: 'After mating' }],
      pairs: { monkey: 'before', mule: 'after', skunk: 'before', liger: 'after', song: 'before', frog: 'after' },
      explain: 'Before mating: different pollinators, seasons or songs mean the two never pair up. After mating: young are made, but they die early or can’t breed. At the ends of the Ensatina ring, biologists suspect both kinds are at work.',
    },
    {
      kind: 'payoff',
      idea: 'New species form gradually. Split a population, let the parts change apart, and when they meet again they may no longer interbreed.',
      connections: [
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'The greenish warbler: a ring around Tibet (debated)', place: 'Life › Evolution › New species' },
        { title: 'Why islands breed new species', place: 'Life › Evolution › Biogeography' },
      ],
    },
  ],
  provenance: [
    { claim: 'Ensatina forms a horseshoe of populations around the Central Valley; neighbours interbreed, the ends largely do not; Highton argued for multiple species', source: 'Wikipedia: Ensatina; Ring species' },
    { claim: 'Stebbins: origin in northern California or southern Oregon, two fronts south along the coast ranges and Sierra Nevada, rejoining in southern California around the arid Central Valley', source: 'Devitt, Baird & Moritz 2011, BMC Evol Biol 11:245, doi:10.1186/1471-2148-11-245 (introduction)' },
    { claim: 'North-to-south expansion along two axes, ring completed in southern California; the gene-flow-around-the-ring hypothesis not supported', source: 'Wake 1997, PNAS 94:7761, doi:10.1073/pnas.94.15.7761 (abstract)' },
    { claim: 'DNA phylogeny supports southern closure over the Monterey closure model (99.92% of credible trees)', source: 'Kuchta, Parks, Mueller & Wake 2009, J Biogeography, doi:10.1111/j.1365-2699.2008.02052.x (abstract)' },
    { claim: 'Four contact zones of eschscholtzii and klauberi in southern California; Palomar habitats split near 1,370 m; hybridization infrequent, none found at Cuyamaca; one Palomar zone with many hybrids but strong selection against them', source: 'Devitt et al. 2011 (abstract, introduction, discussion)' },
    { claim: 'Hybrids common around the ring; isolation or rare hybridization only at the terminus', source: 'Pereira & Wake 2009, Evolution 63:2288, doi:10.1111/j.1558-5646.2009.00722.x (abstract)' },
    { claim: 'Yellow-eyed (xanthoptica) lineage colonised the Sierra foothills; strong selection against xanthoptica × platensis hybrids', source: 'Kuchta, Parks & Wake 2009, Mol Phylogenet Evol 50:240 (abstract); Alexandrino et al. 2005, Evolution 59:1334 (abstract)' },
    { claim: 'Apple race arose from hawthorn race after apples arrived; can interbreed in the lab; kept apart in nature partly by earlier emergence, as apples fruit before hawthorn; apple range within hawthorn range; possible early speciation', source: 'Wikipedia: Apple maggot' },
    { claim: 'Scarlet and Lewis monkeyflowers isolated almost entirely by pollinators (hummingbirds vs bees)', source: 'Wikipedia: Erythranthe cardinalis' },
    { claim: 'Mules nearly always sterile (63 chromosomes)', source: 'Wikipedia: Mule; Reproductive isolation' },
    { claim: 'Spotted skunks mate in March; western spotted skunks in late September and October', source: 'Wikipedia: Spotted skunk' },
    { claim: 'Male ligers sterile, females not (Haldane’s rule)', source: 'Wikipedia: Liger' },
    { claim: 'Song pattern isolates Chorthippus grasshopper species; some frog crosses fail during development', source: 'Wikipedia: Reproductive isolation' },
  ],
};
