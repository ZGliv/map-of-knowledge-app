import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// E07 "Four witnesses, one story": anatomy, geography, fossils and DNA, each
// questioned separately. Darwin's words are verbatim from Project Gutenberg #1228
// (On the Origin of Species, 1st edition, 1859), chapter XII, body paragraph 17.
export const evolutionE07: Pack = {
  id: 'evolution-e07',
  title: 'Four witnesses, one story',
  question: 'How do we know all life is related?',
  path: ['Life', 'Evolution', 'Evidence', 'Lines of evidence'],
  hue: 130,
  minutes: 8,
  media: {
    tree: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Origin_of_Species.svg/1920px-Origin_of_Species.svg.png',
      alt: 'Darwin’s branching diagram of species diverging over thousands of generations',
      credit: 'Charles Darwin, On the Origin of Species, 1859 (SVG by Inductiveload) · Public domain',
      page: commons('Origin_of_Species.svg'), date: '1859', tone: 'ink', license: 'Public domain',
    },
    limbs: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Homology_vertebrates-en.svg',
      alt: 'Forelimb bones of a human, dog, bird and whale, with matching bones in matching colours',
      credit: 'Volkov Vladislav Petrovich · CC BY-SA 4.0', page: commons('Homology_vertebrates-en.svg'),
      license: 'CC BY-SA 4.0', backdrop: 'paper',
    },
    archaeopteryx: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Woodward_%281862%29_London_Archaeopteryx_sketch.jpg',
      alt: 'Henry Woodward’s 1862 drawing of the London Archaeopteryx fossil', credit: 'Henry Woodward, 1862 · Public domain',
      page: commons('Woodward_(1862)_London_Archaeopteryx_sketch.jpg'), date: '1862', license: 'Public domain',
    },
    tiktaalik: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Tiktaalik_roseae_life_restor.jpg/960px-Tiktaalik_roseae_life_restor.jpg',
      alt: 'Artist’s reconstruction of Tiktaalik, a flat-headed fish propping itself up on its front fins at the water’s edge',
      credit: 'Reconstruction by Zina Deretsky, National Science Foundation · Public domain',
      page: commons('Tiktaalik_roseae_life_restor.jpg'), date: '2009', license: 'Public domain',
    },
    opabinia: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/USNM_PAL_57683_Opabinia_regalis_Image_3.jpg/960px-USNM_PAL_57683_Opabinia_regalis_Image_3.jpg',
      alt: 'A fossil of Opabinia regalis from the Burgess Shale, a flattened body with a long frontal nozzle',
      credit: 'Smithsonian NMNH, USNM PAL 57683 · CC0', page: commons('USNM_PAL_57683_Opabinia_regalis_Image_3.jpg'), license: 'CC0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'tree', title: 'Four witnesses, one story',
      hook: 'Darwin’s big book had a single picture: a tree. If all life really shares it, four witnesses who never met should tell the same story.',
      focus: [20, 78],
    },
    {
      kind: 'predict', gradeId: 'limbs-predict',
      prompt: 'An arm grabs. A dog’s leg runs. A bird’s wing flies. A whale’s flipper swims. If all four came from one ancestor, what should the bones inside share?',
      parts: [
        { id: 'share', label: '', answer: 'same', choices: [
          { id: 'same', label: 'The same set of bones, in the same order, reshaped' },
          { id: 'fresh', label: 'Very little. Each should be built for its own job',
            feedback: 'That is what you’d expect if flight and swimming were each designed from scratch. Open the limbs up and it isn’t what you find.' },
          { id: 'shape', label: 'The same outside shape',
            feedback: 'The outsides are the most different part: a wing, a paddle, a paw, a hand.' },
        ] },
      ],
      explain: 'One upper bone, two lower bones, a cluster of wrist bones, then fingers. Every time. A fresh design for flying and one for swimming would have no reason to share a parts list. A shared ancestor explains it.',
    },
    {
      kind: 'match', gradeId: 'limbs-match', media: 'limbs',
      prompt: 'Same bones, different jobs. Match each limb to how its finger bones changed.',
      left: [
        { id: 'human', label: 'Human' },
        { id: 'dog', label: 'Dog' },
        { id: 'bird', label: 'Bird' },
        { id: 'whale', label: 'Whale' },
      ],
      right: [
        { id: 'grip', label: 'Long and free' },
        { id: 'stand', label: 'Walked on' },
        { id: 'fused', label: 'Fused' },
        { id: 'extra', label: 'Extra bones' },
      ],
      pairs: { human: 'grip', dog: 'stand', bird: 'fused', whale: 'extra' },
      explain: 'Your fingers stay long and separate for gripping. A dog stands on its finger bones with the wrist lifted off the ground. A bird’s finger bones are fused into one stiff strut that carries the flight feathers. A whale packs extra finger bones inside its flipper. Same colours, same bones.',
    },
    {
      kind: 'source', gradeId: 'islands-source',
      source: { title: 'On the Origin of Species (1859)', detail: 'Charles Darwin · 1st edition, chapter XII, paragraph 17', page: 'https://www.gutenberg.org/ebooks/1228' },
      passage: [
        'The most striking and important fact for us in regard to the inhabitants of islands, is [[their affinity to those of the nearest mainland, without being actually the same species|mainland]].',
        '… the Galapagos Archipelago, situated under the equator, between 500 and 600 miles from the shores of South America. Here almost every product of the land and water [[bears the unmistakeable stamp of the American continent|stamp]].',
        'On the other hand, there is a considerable degree of resemblance in the volcanic nature of the soil, in climate, height, and size of the islands, between the Galapagos and Cape de Verde Archipelagos: [[but what an entire and absolute difference in their inhabitants!|cape]] The inhabitants of the Cape de Verde Islands are related to those of Africa, like those of the Galapagos to America.',
        '… the Galapagos Islands would be likely to receive colonists, whether by occasional means of transport or by formerly continuous land, from America; and the Cape de Verde Islands from Africa; and that such colonists would be liable to modification;—[[the principle of inheritance still betraying their original birthplace|birthplace]].',
      ],
      notes: {
        mainland: 'Island species are new species. Yet each looks like a cousin of something on the nearest coast.',
        stamp: 'Darwin saw this himself: HMS Beagle spent five weeks in the Galápagos in 1835.',
        cape: 'This is the test. Same kind of islands, same climate. If each species were made to suit its surroundings, both island groups should hold similar life. They don’t.',
        birthplace: 'His answer: settlers arrive from the nearest land, then change. Their ancestry still shows.',
      },
      question: {
        prompt: 'Which comparison does the most work in Darwin’s argument?',
        choices: [
          { id: 'galapagos', label: 'Galápagos birds look American' },
          { id: 'cape', label: 'Two similar island groups, with life matching two different continents' },
          { id: 'volcanic', label: 'Both island groups are volcanic' },
          { id: 'species', label: 'Island species are not exactly the mainland species' },
        ],
        answer: 'cape',
      },
    },
    {
      kind: 'spot', gradeId: 'fossil-predicted',
      prompt: 'One of these was found because scientists worked out what age of rock it should lie in, then went looking. Which?',
      options: [
        { id: 'archaeopteryx', media: 'archaeopteryx', year: 1861, label: 'Archaeopteryx', yearLabel: 'Found 1861' },
        { id: 'tiktaalik', media: 'tiktaalik', year: 2004, label: 'Tiktaalik (reconstruction)', yearLabel: 'Found 2004', focus: [22, 60] },
        { id: 'opabinia', media: 'opabinia', year: 1911, label: 'Opabinia', yearLabel: 'Found 1911', focus: [45, 50] },
      ],
      answer: 'tiktaalik',
      timeline: { from: 1840, to: 2020, band: [1859, 1872, 'Origin'] },
      explain: 'Tiktaalik. Fish-only rocks ran up to about 385 million years ago; four-legged animals showed up by 365 million. So a team searched 375-million-year-old rock in Arctic Canada, and in 2004 found a fish with a neck, wrist bones and lungs. Archaeopteryx was dug up in Germany in 1861, two years after Origin. Charles Walcott found Opabinia in the Burgess Shale in 1911.',
    },
    {
      kind: 'predict', gradeId: 'chromosome-2', transfer: true,
      prompt: 'Chimpanzees, gorillas and orangutans have 24 pairs of chromosomes. Humans have 23. If we share ancestors with them, what should our DNA show?',
      diagram: {
        kind: 'karyotype',
        rows: [{ label: 'Chimpanzee', pairs: 24, mark: [1, 2] }, { label: 'Human', pairs: 23, mark: [1] }],
        fused: {
          from: 'Chimpanzee 2A and 2B', into: 'Human chromosome 2',
          notes: [
            'Telomere DNA, normally found only at a chromosome’s tips, sits in the middle where the two ends joined.',
            'A second, silenced centromere: the leftover centre of the other ape chromosome.',
          ],
        },
      },
      parts: [
        { id: 'dna', label: '', answer: 'fused', choices: [
          { id: 'fused', label: 'One human chromosome that matches two ape chromosomes joined end to end' },
          { id: 'lost', label: 'A whole ape chromosome pair missing from us, its genes gone',
            feedback: 'The genes aren’t missing. Their sequences are all in our DNA. The question is where.' },
          { id: 'nothing', label: 'Nothing in particular. Chromosome numbers just differ',
            feedback: 'Common descent makes a sharper bet than that: the ape DNA has to be somewhere in us.' },
        ] },
      ],
      explain: 'Human chromosome 2 matches two separate chimpanzee chromosomes, and the same is true for gorillas and orangutans. The seam still shows, with tip DNA in the middle and a spare centromere. (Diagram not to scale.)',
    },
    {
      kind: 'flaw', gradeId: 'fossil-gaps',
      prompt: '“If evolution were true, we’d have fossils of every in-between form. We don’t, so it’s false.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Species changed through many in-between forms.' },
        { id: 'b', text: 'Nearly every one of those forms should have left a fossil we can find.' },
        { id: 'c', text: 'We haven’t found most of them.' },
        { id: 'd', text: 'So they never existed.' },
      ],
      answer: 'b',
      explain: 'Fossils are rare. Remains have to be buried fast, survive for millions of years, and then be found. Species known from fossils number under 5% of the species alive today, so well under 1% of everything that ever lived. Gaps are expected. What counts is that the in-between forms we do find, like Tiktaalik, sit in rock of the right age.',
    },
    {
      kind: 'order', gradeId: 'marsupials', transfer: true,
      prompt: 'Marsupials, the mammals that raise young in a pouch, live in Australia and in the Americas, an ocean apart. Put the detective work in order.',
      items: [
        { id: 'notice', label: 'Notice pouched mammals on continents an ocean apart' },
        { id: 'combine', label: 'Combine clues: older marsupial fossils in the Americas, and land that once joined South America to Australia through Antarctica' },
        { id: 'predict', label: 'Predict marsupial fossils in Antarctica' },
        { id: 'find', label: '1982: a marsupial fossil turns up on Seymour Island, Antarctica' },
        { id: 'conclude', label: 'Conclude that Australia’s marsupials descend from American ones that crossed Antarctica' },
      ],
      answer: ['notice', 'combine', 'predict', 'find', 'conclude'],
      ends: ['First', 'Last'],
      explain: 'Geography, fossils and geology pointed at one place no one had looked: Antarctica. The fossil turned up there, an extinct marsupial family on an island off the Antarctic Peninsula. Same method as Tiktaalik: predict, then dig.',
    },
    {
      kind: 'payoff',
      idea: 'Bones, islands, fossils and DNA were studied by different people with different tools. They tell one story: life is a single family tree.',
      connections: [
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'The salamander ring', place: 'Life › Evolution › New species', to: 'evolution-e05' },
        { title: 'Who’s your closest cousin? Reading the tree', place: 'Life › Evolution › Tree thinking' },
        { title: 'Earth’s history in one day', place: 'Life › Evolution › Deep time', to: 'evolution-e06' },
      ],
    },
  ],
  provenance: [
    { claim: 'Darwin passage on island inhabitants, Galápagos and Cape de Verde (verbatim)', source: 'Darwin, On the Origin of Species, 1st ed. 1859, ch. XII, body paragraph 17; Project Gutenberg #1228' },
    { claim: 'Origin of Species contains a single figure, the divergence diagram', source: 'Wikimedia Commons: File:Origin of Species.svg description' },
    { claim: 'Vertebrate forelimbs (whale flipper, bird wing, dog foreleg, human hand) share humerus, radius, ulna and are homologous', source: 'Wikipedia: Homology (biology)' },
    { claim: 'Dogs walk on their digits with the wrist bones set high (digitigrade)', source: 'Wikipedia: Digitigrade' },
    { claim: 'Bird wing digits are fused together', source: 'Wikipedia: Bird anatomy' },
    { claim: 'Whales have extra finger bones (hyperphalangy) inside a soft-tissue flipper', source: 'Wikipedia: Flipper (anatomy)' },
    { claim: 'HMS Beagle visited the Galápagos in September–October 1835', source: 'Wikipedia: Second voyage of HMS Beagle (arrived 15 September, sailed for Tahiti 20 October 1835)' },
    { claim: 'Tiktaalik prediction: amphibian features in rock no older than 365 Ma, fish only in rock older than 385 Ma, 2004 search of 375 Ma rocks in Arctic Canada', source: 'Wikipedia: Evidence of common descent; Tiktaalik (mobile neck, wrist bones, lungs; found 2004 on Ellesmere Island)' },
    { claim: 'Archaeopteryx London specimen unearthed in 1861 near Langenaltheim, Germany, two years after Origin', source: 'Wikipedia: Archaeopteryx' },
    { claim: 'Walcott found Opabinia in the Burgess Shale in 1911', source: 'Wikipedia: Opabinia' },
    { claim: 'Origin editions ran from 1859 to the sixth in 1872', source: 'Wikipedia: On the Origin of Species' },
    { claim: 'Humans have 23 chromosome pairs, other living great apes 24; chromosome 2 is an end-to-end fusion with a vestigial centromere and interior telomere sequences', source: 'Wikipedia: Chromosome 2' },
    { claim: 'Species known from fossils are under 5% of known living species, so far under 1% of all that ever lived', source: 'Wikipedia: Fossil' },
    { claim: 'Marsupial route South America → Antarctica → Australia predicted; first marsupial fossil (Polydolopidae) found on Seymour Island in 1982', source: 'Wikipedia: Evidence of common descent (biogeography section)' },
  ],
};
