import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// E06 "Earth's history in one day": a zoom from the whole of Earth's age down to a human
// lifetime, then how rocks keep the record. The Playfair passage is verbatim excerpts (cuts
// marked …; the original runs paragraphs two to four together) from Transactions
// of the Royal Society of Edinburgh vol. 5 (1805), pp. 72–73 (Internet Archive scans
// transactionsofro05murr, cross-checked against a second scan; long s modernised). Hutton's
// words are from Theory of the Earth vol. 1 (1795), Project Gutenberg #12861. Every clock time
// is computed in sims/deepTimeMath.ts and every age in engine/variants.ts (halfLife).
// Misconceptions targeted: #24 (deep time compressed or misordered), #27 (gaps and dating).
export const evolutionE06: Pack = {
  id: 'evolution-e06',
  title: 'Earth’s history in one day',
  question: 'How old is the Earth, and how can rocks tell us?',
  path: ['Life', 'Evolution', 'Deep time', 'The age of the Earth'],
  hue: 130,
  minutes: 9,
  media: {
    canyon: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Grand_Canyon_%28Grand_Canyon_National_Park_Service%29.jpg/1920px-Grand_Canyon_%28Grand_Canyon_National_Park_Service%29.jpg',
      alt: 'The Grand Canyon from the South Rim at dusk: walls of red, cream and grey rock layers stepping down into the gorge',
      credit: 'Grand Canyon National Park (NPS) · CC BY 2.0 · cropped',
      page: commons('Grand_Canyon_(Grand_Canyon_National_Park_Service).jpg'), license: 'CC BY 2.0',
    },
    hutton: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Theory_of_the_Earth_Hutton_Ill_3.png',
      alt: 'An engraving of a riverbank at Jedburgh: upright layers of rock below, flat layers above, and a horse and carriage on the road at the top',
      credit: 'John Clerk of Eldin, in James Hutton’s Theory of the Earth, 1795, plate III · Public domain',
      page: commons('Theory_of_the_Earth_Hutton_Ill_3.png'), date: '1787 drawing, printed 1795', tone: 'ink', license: 'Public domain',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'canyon', title: 'Earth’s history in one day',
      hook: 'Layer on layer, these walls took ages to build. The dark schist near the bottom formed about 1.75 billion years ago. The planet holding it is far older.',
      focus: [42, 58],
    },
    {
      kind: 'sim', sim: 'deepTime', title: 'One day, 4.54 billion years',
      goal: 'Squeeze all {earth} years into a single day. Earth forms at midnight; now is the next midnight. Each hour of the clock stands for about {hour} years.',
      params: {
        earthMa: 4540,
        locate: {
          ask: 'On this clock, when do the first large, complex creatures appear in the sea?',
          range: [600, 538.8], toleranceHours: 1,
          right: 'You tapped {guess}. Large, complex life appears between {from} and {to}, in the last few hours of the day.',
          wrong: 'You tapped {guess}. Large, complex life appears between {from} and {to}. For most of the day, nearly every living thing was too small to see.',
        },
        events: [
          { ma: 4540, label: 'Earth forms' },
          { ma: 4404, label: 'The oldest known bits of Earth: zircon crystals from Australia’s Jack Hills' },
          { ma: 3500, label: 'The oldest undisputed signs of life: stromatolites, layered mats built by microbes' },
          { ma: 2460, label: 'Oxygen begins to build up in the air' },
          { ma: 600, label: 'The first large, complex creatures: the Ediacaran biota' },
          { ma: 538.8, label: 'The Cambrian explosion: nearly every animal group appears' },
          { ma: 470, label: 'Plants spread onto land' },
          { ma: 233, label: 'The earliest known dinosaurs' },
          { ma: 66, label: 'An asteroid ends the age of dinosaurs' },
          { years: 300000, label: 'Our species, Homo sapiens', hidden: true },
          { years: 80, label: 'One 80-year human life', hidden: true },
        ],
        question: {
          ask: 'Our species, Homo sapiens, appeared about 300,000 years ago. On this clock, how long before midnight is that?',
          choices: [
            { id: 'seconds', label: 'About 6 seconds' },
            { id: 'minutes', label: 'About 6 minutes', feedback: 'Six minutes of this clock is millions of years. Our species is far younger than that.' },
            { id: 'hour', label: 'About an hour', feedback: 'An hour before midnight on this clock, dinosaurs were alive.' },
            { id: 'hours', label: 'About 3 hours', feedback: 'Three hours before midnight, large animals had barely appeared.' },
          ],
          answer: 'seconds',
          explain: '300,000 years is a tiny fraction of 4.54 billion: about 6 seconds of the day. A whole human life takes up less than two thousandths of a second.',
        },
        zooms: [
          { label: 'Whole day', seconds: 86400 },
          { label: 'Last hour', seconds: 3600 },
          { label: 'Last minute', seconds: 60 },
          { label: 'Last second', seconds: 1 },
        ],
      },
      grades: [{ gradeId: 'first-large-life' }, { gradeId: 'our-species' }],
    },
    {
      kind: 'source', gradeId: 'siccar-point',
      source: { title: 'At Siccar Point, June 1788', detail: 'John Playfair · Transactions of the Royal Society of Edinburgh, vol. 5 (1805), pp. 72–73', page: 'https://archive.org/details/transactionsofro05murr' },
      passage: [
        'Here, therefore, the immediate contact of the two rocks is not only visible, but is curiously dissected and laid open by the action of the waves. [[The rugged tops of the schistus are seen penetrating into the horizontal beds of sandstone|schistus]], and [[the lowest of these last form a breccia containing fragments of schistus|breccia]], some round and others angular, united by an arenaceous cement.',
        '… We felt ourselves necessarily carried back to the time when [[the schistus on which we stood was yet at the bottom of the sea|sea]], and when the sandstone before us was only beginning to be deposited, in the shape of sand or mud, from the waters of a superincumbent ocean.',
        '[[An epocha still more remote presented itself|remote]], when even the most ancient of these rocks, instead of standing upright in vertical beds, lay in horizontal planes at the bottom of the sea, and was not yet disturbed by that immeasurable force which has burst asunder the solid pavement of the globe.',
        '… [[The mind seemed to grow giddy by looking so far into the abyss of time|abyss]]; and while we listened with earnestness and admiration to the philosopher who was now unfolding to us the order and series of these wonderful events, we became sensible how much farther reason may sometimes go than imagination can venture to follow.',
      ],
      notes: {
        schistus: 'Playfair’s “schistus” is the hard grey rock now called greywacke, laid down about 435 million years ago. The red sandstone resting on its worn tops is about 370 million years old.',
        breccia: 'Broken pieces of the grey rock sit in the bottom of the sandstone. The grey rock was already hard and worn before the sand arrived.',
        sea: 'Playfair thought both rocks formed under the sea. We now know the grey layers settled in a deep ocean, but the red sandstone was laid down by rivers and wind on low tropical land.',
        remote: 'Layers settle flat. These grey ones now stand on end, so something tilted them after they formed and before the sand covered them: about 65 million years separate the two rocks.',
        abyss: 'The philosopher is James Hutton, who concluded that “we find no vestige of a beginning,—no prospect of an end.”',
      },
      question: {
        prompt: 'What convinced them that a vast stretch of time had passed?',
        choices: [
          { id: 'sequence', label: 'The grey layers had settled, hardened, been tilted upright and worn down before the sand buried them' },
          { id: 'fossils', label: 'The rocks held fossils of animals that no longer exist', feedback: 'Playfair says nothing about fossils here. The argument is in how the two rocks meet.' },
          { id: 'waves', label: 'The waves were wearing the cliff away quickly', feedback: 'The waves only exposed the junction. The time is in the steps the junction records.' },
          { id: 'colour', label: 'The two rocks are different colours', feedback: 'Colour alone says nothing about age. The order of events does.' },
        ],
        answer: 'sequence',
        explain: 'Settling, hardening, tilting, wearing flat, being buried again: each step had to finish before the next began, and at the pace rock changes, each takes an immense time.',
      },
    },
    {
      kind: 'order', gradeId: 'jedburgh', transfer: true, media: 'hutton',
      prompt: 'A year before Siccar Point, Hutton found the same pattern on the banks of the Jed Water near Jedburgh. Put the history of this riverbank in order.',
      items: [
        { id: 'settle', label: 'Mud and sand settle in flat layers on an ancient sea floor' },
        { id: 'upend', label: 'The layers harden, then are broken and pushed up on end' },
        { id: 'wear', label: 'Water and weather wear the upright layers down to a flat surface' },
        { id: 'pebbles', label: 'Rounded pebbles of the worn rock collect on that surface' },
        { id: 'cover', label: 'New flat layers of sandstone settle on top' },
        { id: 'river', label: 'The land rises, and the Jed Water cuts down through both' },
      ],
      answer: ['settle', 'upend', 'wear', 'pebbles', 'cover', 'river'],
      ends: ['First', 'Last'],
      explain: 'Hutton read it the same way: the upright layers “had been formed, and had been wasted and worn” before the flat ones began, and the rounded stones between them came from the older rock. Each step takes ages, and each had to finish before the next could begin.',
    },
    {
      kind: 'number', gradeId: 'half-life', generator: 'halfLife',
      params: {
        prompt: '{isotope} breaks down at a steady rate: half of any amount is gone after {halfLife}. {sample} still holds {fraction} of the {isotope} it started with.',
        ask: 'How old is it?',
        cases: [
          { isotope: 'carbon-14', halfLife: 5700, unit: 'years', denominator: 4, sample: 'Charcoal from an ancient campfire' },
          { isotope: 'potassium-40', halfLife: 1.25, unit: 'billion years', denominator: 4, sample: 'A crystal from an ancient lava flow', digits: 2 },
          { isotope: 'carbon-14', halfLife: 5700, unit: 'years', denominator: 8, sample: 'A bone from a cave floor' },
          { isotope: 'uranium-235', halfLife: 704, unit: 'million years', denominator: 4, sample: 'A zircon crystal from an old granite' },
        ],
        tolerance: 0.02,
        hint: 'Each half-life halves what is left: all of it, then 1/2, then 1/4. Count the halvings it takes to reach {fraction}, then multiply by {halfLife}.',
        aside: 'Assume nothing has leaked in or out since it formed.',
      },
    },
    {
      kind: 'match', gradeId: 'carbon-limit', buckets: true,
      prompt: 'Carbon-14 halves every 5,700 years, and after about 50,000 years too little is left to measure. Which of these can it date?',
      left: [
        { id: 'linen', label: 'Linen from a mummy’s wrappings, about 3,000 years old' },
        { id: 'trex', label: 'A Tyrannosaurus bone' },
        { id: 'mammoth', label: 'A woolly mammoth bone, about 30,000 years old' },
        { id: 'coal', label: 'A lump of coal, about 300 million years old' },
        { id: 'hearth', label: 'Charcoal from a cave hearth, about 12,000 years old' },
        { id: 'trilobite', label: 'A trilobite fossil' },
      ],
      right: [{ id: 'yes', label: 'Carbon-14 works' }, { id: 'old', label: 'Too old' }],
      pairs: { linen: 'yes', trex: 'old', mammoth: 'yes', coal: 'old', hearth: 'yes', trilobite: 'old' },
      explain: 'Ten half-lives of carbon-14 is 57,000 years, and by then less than a thousandth of it is left. The last non-bird dinosaurs died 66 million years ago and the last trilobites 252 million years ago, so their remains have none to measure. Ages like those come from slow clocks such as potassium-40 and uranium-238, read in volcanic rock.',
    },
    {
      kind: 'predict', gradeId: 'ash-layers', transfer: true,
      prompt: 'A fossil fish lies in sandstone, which holds no clock anyone can read. Two metres below it is a layer of volcanic ash dated to 50.4 million years ago. Three metres above it, another ash layer is dated to 49.9 million years ago. How old is the fish?',
      parts: [
        { id: 'age', label: '', answer: 'between', choices: [
          { id: 'older', label: 'Older than 50.4 million years, because it is deeper',
            feedback: 'It lies above the 50.4-million-year ash, so it settled after that ash fell: younger, not older.' },
          { id: 'between', label: 'Between 49.9 and 50.4 million years old' },
          { id: 'younger', label: 'Younger than 49.9 million years',
            feedback: 'The 49.9-million-year ash lies on top of it, so the fish was already buried when that ash fell.' },
          { id: 'unknown', label: 'There is no way to tell without dating the fish itself',
            feedback: 'Layers stack in order, oldest at the bottom, so two dated layers pin everything between them.' },
        ] },
      ],
      explain: 'Layers pile up in order, so the fish is younger than the ash below it and older than the ash above. Most rocks that hold fossils can’t be dated directly; volcanic ash can, and ash layers bracket the fossils between them. That is how many of the dates on the clock were set.',
    },
    {
      kind: 'payoff',
      idea: 'Earth is about 4.54 billion years old. Rock layers pile up in order, and radioactive clocks in some of them give the dates, so the rocks and their fossils read as a record of life’s history.',
      connections: [
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'Five times the world almost ended', place: 'Life › Evolution › Transitions and extinctions', to: 'evolution-e08' },
        { title: 'Radioactive decay: atoms that keep time', place: 'Science › Physics' },
        { title: 'How geologists read rock', place: 'Earth › Geology' },
      ],
    },
  ],
  provenance: [
    { claim: 'Vishnu Schist and related schists at the bottom of the Grand Canyon formed 1.75 to 1.73 billion years ago (the oldest basement rock there, the Elves Chasm pluton, is about 1.84 billion)', source: 'Wikipedia: Geology of the Grand Canyon area (rev. 1357763804); Vishnu Basement Rocks' },
    { claim: 'Age of Earth 4.54 ± 0.05 billion years, from radiometric dating of meteorites; Patterson 1956 (4.55 billion)', source: 'Wikipedia: Age of Earth (rev. 1380004254)' },
    { claim: 'Clock times, the hour-to-years scale, “about 6 seconds” for 300,000 years and the 80-year-life span are computed from 4,540 million years', source: 'Code: src/expeditions/sims/deepTimeMath.ts (tested in deepTimeMath.test.ts)' },
    { claim: 'Jack Hills zircons formed around 4.404 billion years ago, the oldest terrestrial material found', source: 'Wikipedia: Jack Hills (rev. 1339661666)' },
    { claim: 'Earliest undisputed evidence of life: stromatolites, at least 3.5 billion years ago', source: 'Wikipedia: Earliest known life forms (rev. 1380618667)' },
    { claim: 'Great Oxidation Event began about 2.46–2.426 billion years ago', source: 'Wikipedia: Great Oxidation Event (rev. 1372280009)' },
    { claim: 'Ediacaran organisms first appeared around 600 Ma and flourished until 538.8 Ma; the Cambrian explosion holds first appearances of practically every animal phylum', source: 'Wikipedia: Ediacaran biota (rev. 1375624864); Cambrian explosion (rev. 1378672162)' },
    { claim: 'Earliest land plants about 470 Ma', source: 'Wikipedia: Evolutionary history of plants (rev. 1380266639)' },
    { claim: 'Dinosaurs: Santa Maria Formation dinosaurs 233.23 Ma; possibly as early as 243 Ma (Nyasasaurus)', source: 'Wikipedia: Dinosaur (rev. 1380480508)' },
    { claim: 'K–Pg extinction 66 million years ago', source: 'Wikipedia: Cretaceous–Paleogene extinction event (rev. 1379830492)' },
    { claim: 'Homo sapiens emerged around 300,000 years ago', source: 'Wikipedia: Human (rev. 1380627378)' },
    { claim: 'Playfair passage (verbatim), Siccar Point excursion with Hutton and Hall in June 1788', source: 'Playfair 1805, Transactions of the Royal Society of Edinburgh 5: 72–73, archive.org transactionsofro05murr; Wikipedia: Hutton’s Unconformity' },
    { claim: 'Siccar Point: Silurian greywacke laid down around 435 Ma in the deep Iapetus Ocean, tilted near-vertical over the following 65 million years, overlain by Late Devonian (around 370 Ma) sandstone deposited by rivers and wind on low tropical land, with a basal conglomerate of greywacke fragments', source: 'Wikipedia: Hutton’s Unconformity (rev. as fetched 2026-10-16)' },
    { claim: 'Hutton: “we find no vestige of a beginning,—no prospect of an end”; Jedburgh description: vertical strata in the riverbed, horizontal strata above, pudding-stone of worn stones from the vertical strata between; the vertical strata “had been formed, and had been wasted and worn” before the horizontal strata; note 32: plate 3 from a drawing by Mr Clerk of Eldin', source: 'Hutton, Theory of the Earth vol. 1 (1795), Project Gutenberg #12861' },
    { claim: 'Hutton found the Jedburgh unconformity in 1787 and Siccar Point in 1788', source: 'Wikipedia: Hutton’s Unconformity' },
    { claim: 'Half-lives: carbon-14 5,700 ± 30 years; potassium-40 1.248 billion years (1.25 in the pack); uranium-235 704 million years; uranium-238 4.463 billion years; decay rates are constant; dating needs parent and daughter neither to enter nor leave', source: 'Wikipedia: Carbon-14; Potassium-40; Uranium-238 (NUBASE2020 values); Radiometric dating (rev. 1375582012)' },
    { claim: 'Radiocarbon dating is generally limited to samples no more than 50,000 years old; coal contains little or no detectable carbon-14', source: 'Wikipedia: Radiocarbon dating' },
    { claim: 'Trilobites became extinct in the Permian–Triassic extinction, 252 Ma', source: 'Wikipedia: Extinction event (rev. 1379759322)' },
    { claim: 'Fossil beds usually lack radioactive elements; volcanic ash layers can be dated and bracket the sediments between them; oldest strata lie at the bottom of undeformed sequences', source: 'Wikipedia: Fossil; Law of superposition' },
    { claim: 'Ages in the radiometric answers are computed from whole half-lives', source: 'Code: src/expeditions/engine/variants.ts (halfLife)' },
    { claim: 'Misconceptions #24, #27', source: 'mok-content-lab docs/research/appendix-evolution.md §2 (Catley & Novick 2009)' },
    { claim: 'Grand Canyon photo (NPS, CC BY 2.0) and Hutton’s plate III (public domain)', source: 'Wikimedia Commons file pages, licenses checked via the Commons API 2026-10-16' },
  ],
};
