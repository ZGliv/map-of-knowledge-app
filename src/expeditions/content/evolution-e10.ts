import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const MEGA = 'Kishony_lab-The_Evolution_of_Bacteria_on_a_Mega-Plate.webm';
const MEGA_DIR = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a';
// Commons renders stills from the video itself; 4 s in is the film's own title shot.
const MEGA_STILL = `https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/${MEGA}/1280px-seek%3D4-${MEGA}.jpg`;
const MEGA_CREDIT = 'Kishony lab (Harvard Medical School and Technion) · CC BY-SA 3.0';

// E10 "The bacteria that walked through poison". Anchor: Baym et al., Science 2016.
// Sensitive-content rule (plan §9.5): no answer key about what patients should do.
export const evolutionE10: Pack = {
  id: 'evolution-e10',
  title: 'The bacteria that walked through poison',
  question: 'Can you watch evolution happen in a matter of days?',
  path: ['Life', 'Evolution', 'Evolution now', 'Resistance'],
  hue: 130,
  minutes: 8,
  media: {
    ecoli: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/E_coli_at_10000x%2C_original.jpg/1920px-E_coli_at_10000x%2C_original.jpg',
      alt: 'A cluster of rod-shaped E. coli bacteria under an electron microscope, magnified 10,000 times',
      credit: 'Eric Erbe and Christopher Pooley, USDA Agricultural Research Service · Public domain',
      page: commons('E_coli_at_10000x,_original.jpg'), date: '2005', license: 'Public domain',
    },
    mega: {
      src: `${MEGA_DIR}/${MEGA}/${MEGA}.480p.vp9.webm`,
      alt: 'Time-lapse film of E. coli spreading across a large dish with bands of antibiotic, narrated by Michael Baym',
      credit: MEGA_CREDIT, page: commons(MEGA), date: '2016', license: 'CC BY-SA 3.0',
      sources: [
        { src: `${MEGA_DIR}/${MEGA}/${MEGA}.480p.vp9.webm`, type: 'video/webm; codecs="vp9, opus"' },
        { src: `https://upload.wikimedia.org/wikipedia/commons/7/7a/${MEGA}`, type: 'video/webm; codecs="vp8, vorbis"' },
      ],
    },
    megaStill: {
      src: MEGA_STILL, alt: 'The MEGA-plate on its table in the lab, the opening shot of the film',
      credit: MEGA_CREDIT, page: commons(MEGA), date: '2016', license: 'CC BY-SA 3.0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'ecoli', title: 'The bacteria that walked through poison',
      hook: 'Scientists at Harvard built a dish four feet long and laced it with an antibiotic. Then they let bacteria loose and filmed for nearly twelve days.',
      focus: [55, 40],
    },
    {
      kind: 'predict', gradeId: 'mega-predict',
      prompt: 'E. coli start at both ends, where there is no drug. Each band inward holds ten times more antibiotic than the last.',
      diagram: {
        kind: 'bands', title: 'The MEGA-plate, 120 × 60 cm, seen from above',
        bands: ['0', '1', '10', '100', '1,000'],
        note: 'Band labels as the experiment’s film shows them. In the paper the first band is 3 times the dose that stops ordinary E. coli, and the middle 3,000 times.',
      },
      parts: [
        { id: 'where', label: 'The bacteria reach the edge of a stronger band and stop. How do they get across?', answer: 'spots', choices: [
          { id: 'line', label: 'The whole front creeps in together' },
          { id: 'spots', label: 'At one or two spots, then it spreads' },
          { id: 'never', label: 'They don’t. It’s too strong' },
        ] },
        { id: 'why', label: 'What makes those first cells different?', answer: 'mutant', choices: [
          { id: 'mutant', label: 'A random change in their DNA happens to let them grow there' },
          { id: 'tough', label: 'They sat in the drug longest and got used to it' },
          { id: 'weak', label: 'The drug is weaker at that spot' },
        ] },
      ],
    },
    {
      kind: 'footage', media: 'mega', poster: 'megaStill',
      caption: 'Harvard Medical School, 2016. Nearly twelve days, played at 18,000 times normal speed. Bacteria show white on black.',
      reveal: {
        predictGrade: 'mega-predict', part: 'where',
        text: 'Each wall holds them back. Then one cell with a lucky mutation breaks through, and a fan of its descendants floods the band. The same thing happens again at the next wall.',
      },
    },
    {
      kind: 'order', gradeId: 'lineage-steps',
      prompt: 'Follow one family of cells from the bare edge into the 10 band. Put the steps in order.',
      items: [
        { id: 'stall1', label: 'Cells fill the drug-free edge and stall at the 1 band' },
        { id: 'mut1', label: 'One cell’s DNA is copied with a change that lets it grow in 1' },
        { id: 'fill1', label: 'Its descendants fill the 1 band and stall at the 10 band' },
        { id: 'mut2', label: 'One of those descendants picks up a second change' },
        { id: 'cross', label: 'Its lineage, carrying both changes, spreads into 10' },
      ],
      answer: ['stall1', 'mut1', 'fill1', 'mut2', 'cross'],
      ends: ['First', 'Last'],
      explain: 'Each step stacks on the last. A cell in the middle band carries a chain of changes, each picked out by the band its ancestors crossed. By the end, cells taken from the middle resisted about 10,000 times more drug than the starting strain.',
    },
    {
      kind: 'flaw', gradeId: 'learned-flaw',
      prompt: 'A friend says the bacteria “learned to resist.” Here is their argument. Which step breaks?',
      steps: [
        { id: 'a', text: 'Bacteria at the edge of each band met the antibiotic.' },
        { id: 'b', text: 'Each cell sensed the drug and changed its own DNA to survive it.' },
        { id: 'c', text: 'Those cells passed the change to their offspring.' },
        { id: 'd', text: 'So the population ended up resistant.' },
      ],
      answer: 'b',
      explain: 'DNA changes arise by chance as cells copy themselves, whether or not they help. The drug doesn’t write the fix. It kills or stalls everything without one. In 1943 Luria and Delbrück showed that resistant mutants already exist before bacteria ever meet the threat.',
    },
    {
      kind: 'number', gradeId: 'doubling', generator: 'doubling',
      params: {
        prompt: 'One mutant cell lands in fresh ground. In good conditions E. coli can split in two every {minutes} minutes.',
        ask: 'How many cells after {hours} hours?',
        cases: [
          { minutes: 20, hours: 3 },
          { minutes: 30, hours: 4 },
          { minutes: 20, hours: 4 },
          { minutes: 60, hours: 10 },
        ],
        unit: 'cells', tolerance: 0,
        hint: 'Count the splits first: {hours} hours divided into {minutes}-minute steps. Then start at 1 and double once per step.',
        aside: 'Assume every cell keeps splitting and none die.',
      },
    },
    {
      kind: 'predict', gradeId: 'weeds', transfer: true,
      prompt: 'Glyphosate weedkiller went on sale in 1971. A 2008–09 survey tested waterhemp weeds from 144 farm sites in Missouri. At 69% of them, the weeds survived glyphosate. Which explanation fits?',
      parts: [
        { id: 'why', label: '', answer: 'sorted', choices: [
          { id: 'sorted', label: 'Some plants already carried variants that survived spraying. They seeded the next crop of weeds, year after year.' },
          { id: 'toughen', label: 'Each sprayed plant toughened up and passed its toughness to its seeds.',
            feedback: 'A plant that gets through one spraying doesn’t hand that experience to its seeds. Only DNA it already carries gets passed on.' },
          { id: 'caused', label: 'The weedkiller caused the exact mutations the weeds needed.',
            feedback: 'Mutations aren’t aimed. The spray decides which existing variants survive; it doesn’t write new ones to order.' },
          { id: 'needed', label: 'Waterhemp evolved resistance because it needed to.',
            feedback: 'Need doesn’t create anything. Plants without a resistant variant simply die, however much they “need” one.' },
        ] },
      ],
      explain: 'Same story as the dish, on farms. Spraying the same weedkiller year after year kills the weeds without a resistant variant, so the survivors become the parents of the next generation.',
    },
    {
      kind: 'order', gradeId: 'mosquitoes', transfer: true,
      prompt: 'Malaria programmes spray insecticide on the inside walls of houses. In some places Anopheles mosquitoes evolved to rest outdoors instead. Put the steps in order.',
      items: [
        { id: 'vary', label: 'Mosquitoes differ: most rest on indoor walls, a few rest outside' },
        { id: 'spray', label: 'Indoor walls are sprayed' },
        { id: 'die', label: 'Indoor resters die; outdoor resters live to lay eggs' },
        { id: 'shift', label: 'Each generation, more of the young inherit the outdoor habit' },
        { id: 'fail', label: 'The wall spray kills fewer and fewer mosquitoes' },
      ],
      answer: ['vary', 'spray', 'die', 'shift', 'fail'],
      ends: ['First', 'Last'],
      explain: 'The variation came first: some mosquitoes rested outdoors before any wall was sprayed. And resistance doesn’t have to be chemical. Here the trait that spread was a habit. The insecticide still works on any mosquito that touches it; the population changed so fewer of them do.',
    },
    {
      kind: 'payoff',
      idea: 'Random changes give a few individuals a way through. The poison kills the rest. Repeat, and a population evolves in days.',
      connections: [
        { title: 'The salamander ring', place: 'Life › Evolution › New species', to: 'evolution-e05' },
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'The coin-flip population: when chance alone decides', place: 'Life › Evolution › Drift', to: 'evolution-e04' },
        { title: 'Why a virus keeps changing its coat', place: 'Life › Medicine › Infection' },
      ],
    },
  ],
  provenance: [
    { claim: 'MEGA-plate: 120 × 60 cm; tenfold steps of trimethoprim (0, 3, 30, 300, 3,000× the wild-type MIC); mutants from the middle about 10,000-fold more resistant; about 10 days to adapt', source: 'Baym et al. 2016, Science 353:1147, doi:10.1126/science.aag0822 (abstract and PMC5534434 main text)' },
    { claim: 'Film: bands labelled 0/1/10/100/1000; 11.7 days at 18,000× speed; bacteria white on black', source: 'Commons file description and the film itself, Kishony lab (CC BY-SA 3.0)' },
    { claim: 'Resistance breaks through at single spots where a mutant arises; lineages fan out', source: 'Baym et al. 2016 (main text, Fig. 1C) and the film' },
    { claim: 'E. coli can reproduce in as little as 20 minutes in favourable conditions', source: 'Wikipedia: Escherichia coli' },
    { claim: 'Luria–Delbrück (1943): mutations arise without the selective pressure, not in response to it', source: 'Wikipedia: Luria–Delbrück experiment' },
    { claim: 'Glyphosate marketed as Roundup in 1971; 2008–09 survey of 144 waterhemp populations in 41 Missouri counties found glyphosate resistance in 69%', source: 'Wikipedia: Herbicide (Resistance section)' },
    { claim: 'Some Anopheles mosquitoes evolved a preference for resting outside, away from insecticide on interior walls', source: 'Wikipedia: Pesticide resistance (Behavioral resistance)' },
    { claim: 'Cover image: E. coli at 10,000×, USDA ARS (public domain)', source: 'Wikimedia Commons: File:E coli at 10000x, original.jpg' },
  ],
};
