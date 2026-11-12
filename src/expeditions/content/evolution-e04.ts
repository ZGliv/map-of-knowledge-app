import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// E04 "The coin-flip population": chance in evolution, in two halves. Drift first, run by the
// learner in a seeded Wright–Fisher lab; then where mutations come from, with the real counts
// from Luria and Delbrück (1943) and the Lederbergs' replica plates (1952), both read from the
// papers themselves (PMC1209226, PMC169282). Every model number is computed in sims/drift.ts
// and sims/fluctuationMath.ts. Misconceptions targeted: #2 (mutation by need), #11 (pure
// chance), #15 (drift only in small populations), #16 (drift confused with selection, flow or
// mutation).
export const evolutionE04: Pack = {
  id: 'evolution-e04',
  title: 'The coin-flip population',
  question: 'Can a population change when nothing is better than anything else?',
  path: ['Life', 'Evolution', 'Chance and drift', 'Genetic drift'],
  hue: 130,
  minutes: 9,
  media: {
    seal: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/CINMS_-_elephant_seal_lounging_%2827099177915%29.jpg/1920px-CINMS_-_elephant_seal_lounging_%2827099177915%29.jpg',
      alt: 'A male northern elephant seal, with its long drooping nose, lying at the edge of the water on San Miguel Island',
      credit: 'Robert Schwemmer, NOAA Channel Islands National Marine Sanctuary · Public domain',
      page: commons('CINMS_-_elephant_seal_lounging_(27099177915).jpg'), license: 'Public domain',
    },
    prairie: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Greater_prairie_chicken_%2852869828321%29.jpg/1280px-Greater_prairie_chicken_%2852869828321%29.jpg',
      alt: 'A male greater prairie chicken displaying in dry grass, orange air sacs puffed out on its neck',
      credit: 'Grayson Smith, US Fish and Wildlife Service · Public domain',
      page: commons('Greater_prairie_chicken_(52869828321).jpg'), license: 'Public domain',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'seal', title: 'The coin-flip population',
      hook: 'By the 1890s, hunting had left perhaps 20 to 40 northern elephant seals. Today there are more than 200,000, and their genes are strikingly alike. No one chose which genes made it through.',
      focus: [40, 52],
    },
    {
      kind: 'sim', sim: 'driftLab', title: 'Twenty copies, no winner chosen',
      goal: 'Ten animals carry twenty copies of one gene, in two versions: filled and hollow. Neither version helps or hurts. Each copy in the next generation is drawn at random from the copies in this one, like marbles pulled from a jar.',
      params: {
        beads: {
          copies: 20, start: 10, generations: 120, seed: 'e04-beads', a: 'filled', b: 'hollow',
          title: 'One population of ten animals',
          note: 'The model: one gene with two versions, a fixed population, every new copy drawn at random from the last generation. No selection, no mutation, no migration.',
        },
        chart: {
          sizes: [10, 100, 1000], p0: 0.5, generations: 100, replicates: 20, seed: 'e04-chart',
          title: 'Now twenty populations at once', sizeLabel: 'animals', axis: 'Share of copies that are filled',
        },
        question: {
          ask: 'What did population size change?',
          choices: [
            { id: 'small-only', label: 'Only the small populations drifted. The big ones held still.',
              feedback: 'Look again at the populations of 1,000: their lines still wander, just more slowly. Every population of limited size drifts.' },
            { id: 'speed', label: 'Every population drifted, but the small ones drifted far faster.' },
            { id: 'better', label: 'In the big populations, the better version won.',
              feedback: 'Neither version was better. Nothing in the model favours one, so any trend you saw was luck.' },
            { id: 'mutated', label: 'The small populations lost a version because it mutated away.',
              feedback: 'There is no mutation in this model. A version vanishes when, by chance, none of its copies is drawn into the next generation.' },
          ],
          answer: 'speed',
          explain: 'Every generation is a fresh draw, so the share of each version wobbles. With 20 copies a few unlucky draws can wipe a version out. With 2,000 copies the wobbles are smaller, but they never stop. Given enough time, one of today’s copies becomes the ancestor of every copy, and each copy has the same chance. So a version held by half the copies takes over about half the time.',
        },
      },
      grades: [{ gradeId: 'drift-size' }],
    },
    {
      kind: 'number', gradeId: 'fixation-count', generator: 'fixation',
      params: {
        N: 10, generations: 400, margin: 2,
        prompt: '{populations} ponds each hold a small population of snails. In every pond, {percent}% of the copies of one gene carry a harmless stripe version.',
        ask: 'Once every pond has either lost it or carries it in every copy, in about how many ponds has the stripe version taken over?',
        cases: [
          { percent: 30, populations: 20, place: 'ponds' },
          { percent: 25, populations: 40, place: 'ponds' },
          { percent: 10, populations: 30, place: 'ponds' },
          { percent: 75, populations: 12, place: 'ponds' },
        ],
        hint: 'In the lab, a version held by half the copies took over in about half the populations. What would you expect for a version held by {percent}%?',
        working: 'Each copy is equally likely to become the ancestor of all later copies, so the stripe version takes over in each pond with a {percent}% chance. {percent}% of {populations} = {answer}. One run of the model gave {run}; runs scatter around {answer}, because every pond is its own coin toss.',
      },
    },
    {
      kind: 'match', gradeId: 'chance-or-not', transfer: true, buckets: true,
      prompt: 'Three ways a population’s genes change. Sort each case.',
      left: [
        { id: 'storm', label: 'A storm happens to kill most of the lizards on a small island, whatever their colour. The survivors happen to be mostly brown.' },
        { id: 'mice', label: 'Hawks catch more of the mice whose fur stands out against the sand.' },
        { id: 'pollen', label: 'Wind carries pollen from a neighbouring valley’s flowers into this one.' },
        { id: 'founders', label: 'Three finches blown onto an empty island start a new population, carrying only some of the mainland’s gene versions.' },
        { id: 'bacteria', label: 'Bacteria that carry a resistance gene survive an antibiotic, and the rest die.' },
        { id: 'deer', label: 'Young male deer wander in from a neighbouring herd and breed.' },
      ],
      right: [{ id: 'drift', label: 'Drift' }, { id: 'selection', label: 'Selection' }, { id: 'flow', label: 'Gene flow' }],
      pairs: { storm: 'drift', mice: 'selection', pollen: 'flow', founders: 'drift', bacteria: 'selection', deer: 'flow' },
      explain: 'Drift is luck in who happens to leave offspring: a storm that strikes at random, a handful of founders. Selection is not luck: some variants do better, generation after generation. Gene flow carries variants in from another population. All three change a population’s genes, for different reasons.',
    },
    {
      kind: 'predict', gradeId: 'prairie-chickens', transfer: true, media: 'prairie',
      prompt: 'In one Illinois population, greater prairie chickens fell from about 2,000 birds in 1962 to fewer than 50 by 1994. Over the same years their genetic diversity dropped sharply. Which explanation fits best?',
      parts: [
        { id: 'why', label: '', answer: 'chance', choices: [
          { id: 'chance', label: 'With so few birds, chance decided which gene versions were passed on, and many were lost.' },
          { id: 'weeded', label: 'Natural selection weeded out the gene versions that caused the decline.',
            feedback: 'Selection favours helpful versions; it doesn’t strip variety out across the board. With so few birds, chance did that, and the loss hurt: fertility and hatching fell.' },
          { id: 'uniform', label: 'The birds became alike because a small population needs to be uniform.',
            feedback: 'Populations don’t need anything. Nothing steered the birds’ genes toward sameness.' },
          { id: 'species', label: 'It can’t be drift. The species as a whole is still large.',
            feedback: 'Drift works on each population’s own size, and this one was down to a few dozen birds.' },
        ] },
      ],
      explain: 'A few dozen birds is a short run of coin flips: a gene version can vanish just because no bird carrying it happened to breed. In 1992 biologists began bringing in birds from large, genetically diverse populations, and egg viability recovered. Gene flow began to undo what drift had done. The elephant seals went through the same squeeze, and their genes still show it.',
    },
    {
      kind: 'sim', sim: 'fluctuation', title: 'The slot machine',
      goal: 'In 1943 Salvador Luria and Max Delbrück asked where virus-resistant bacteria come from. Does the virus make a few cells resistant, or are some cells resistant already, by chance? Their test: grow many separate cultures, each from a small number of cells, then count the survivors in every one.',
      params: {
        cultures: 20, seed: 'jackpot',
        model: { start: 128, doublings: 22, rate: 1.9e-9 },
        grow: 'Grow 20 cultures and add the virus',
        hypotheses: [
          { id: 'induced', label: 'The virus triggers resistance', note: 'In this model every cell has the same small chance of turning resistant when the virus touches it. {dishes} cultures of about {cells} cells each.' },
          { id: 'random', label: 'Resistance arises by chance first', note: 'In this model each new cell has about a {odds} chance of being born resistant while the cultures grow, long before any virus. A resistant cell’s offspring are resistant too.' },
        ],
        real: {
          label: 'Luria and Delbrück, 1943',
          rows: [
            { label: 'Twenty separate cultures, one sample of each', counts: [1, 0, 3, 0, 0, 5, 0, 5, 0, 6, 107, 0, 0, 0, 1, 0, 0, 64, 0, 35], note: 'Their experiment 16: resistant colonies from each culture.' },
            { label: 'One culture, sampled ten times', counts: [14, 15, 13, 21, 15, 14, 26, 16, 20, 13], note: 'Their check on the counting method: ten samples of the same culture.' },
          ],
          source: 'S. E. Luria and M. Delbrück, Genetics 28:491 (1943), tables 1 and 2. E. coli strain B and the virus they called α, now known as T1.',
        },
        question: {
          ask: 'Which idea do the real counts support?',
          choices: [
            { id: 'chance', label: 'Resistance arose by chance before the virus: a few cultures got lucky early.' },
            { id: 'virus', label: 'The virus triggered resistance.',
              feedback: 'Then the twenty cultures would look like the ten samples of one culture, with similar counts on every dish. They don’t.' },
            { id: 'sloppy', label: 'Neither. The counting method was unreliable.',
              feedback: 'The check rules that out: ten samples of one culture gave steady counts, from 13 to 26.' },
            { id: 'faster', label: 'Bacteria under threat mutate faster, so resistance appeared when it was needed.',
              feedback: 'If the threat produced the needed mutations, every culture met the same threat and would show similar numbers. The jackpots say the resistant cells were there before the virus came.' },
          ],
          answer: 'chance',
          explain: 'A culture where a resistant cell happened to appear early grew a big resistant family before any virus arrived. That is the jackpot; most cultures had a few or none. Luria and Delbrück compared it to a slot machine. Mutations, many of them copying errors, arise whether or not they will ever be useful. Luria and Delbrück shared a Nobel Prize in 1969, in part for this work.',
        },
      },
      grades: [{ gradeId: 'fluctuation-real' }],
    },
    {
      kind: 'predict', gradeId: 'replica', transfer: true,
      prompt: 'In 1952 Esther and Joshua Lederberg grew bacteria on a plain dish with no virus. Using velvet, they stamped copies of it onto dishes coated with virus. Many, often nearly all, of the resistant colonies grew at the same spots on every copy. What does that tell you?',
      diagram: {
        kind: 'replica', title: 'Velvet copies of one plain dish', source: 'Plain dish',
        copies: ['Copy 1', 'Copy 2', 'Copy 3'], spots: [[0.3, 0.36], [0.66, 0.3], [0.52, 0.72]],
        note: 'In their experiments, at least half and often nearly all of the resistant colonies on the copies grew at matching spots.',
      },
      parts: [
        { id: 'means', label: '', answer: 'before', choices: [
          { id: 'virus', label: 'The virus turned a few cells resistant on each copy.',
            feedback: 'Then the survivors would turn up in different places on each copy. They lined up instead.' },
          { id: 'before', label: 'The resistant cells were already on the plain dish, at those spots, before any virus touched them.' },
          { id: 'velvet', label: 'The velvet pressed resistance into those spots.',
            feedback: 'Velvet only copies the pattern. Cells taken from those spots on the plain dish grew into a resistant strain that never met the virus.' },
          { id: 'needed', label: 'The bacteria at those spots needed resistance more than the others did.',
            feedback: 'No cell on the plain dish needed anything: there was no virus there. The resistance came first, and the virus revealed it.' },
        ] },
      ],
      explain: 'The resistance existed before the test. The Lederbergs proved it by going back to the plain dish, taking cells from those spots and, after a few rounds of enrichment, growing pure resistant strains that had never met the virus. They did the same with the antibiotic streptomycin.',
    },
    {
      kind: 'flaw', gradeId: 'pure-chance',
      prompt: '“Mutations are random and drift is random, so evolution is pure chance. Nothing as complex as an eye could come from it.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Mutations arise by chance, with no regard to what an organism needs.' },
        { id: 'b', text: 'Drift changes how common gene versions are, by chance too.' },
        { id: 'c', text: 'So which versions spread is always down to chance.' },
        { id: 'd', text: 'So complex organs would need a miracle of luck.' },
      ],
      answer: 'c',
      explain: 'Natural selection isn’t random. Versions that help an organism survive and reproduce are passed on more often, generation after generation, for as long as conditions favour them. Chance supplies the variation and jostles the numbers; selection keeps what works and builds on it.',
    },
    {
      kind: 'payoff',
      idea: 'Mutations arise by chance, not by need, and chance reshuffles every population of limited size, the small ones fastest. Selection is the part that isn’t luck.',
      connections: [
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'Natural selection: the part that isn’t luck', place: 'Life › Evolution › Natural selection' },
        { title: 'The salamander ring', place: 'Life › Evolution › New species', to: 'evolution-e05' },
        { title: 'Coin flips and sampling: the mathematics of chance', place: 'Mathematics › Probability' },
      ],
    },
  ],
  provenance: [
    { claim: 'Northern elephant seals hunted almost to extinction by the end of the 19th century; population may have fallen to 20–40; now over 200,000; genetic variation remains very low', source: 'Wikipedia: Northern elephant seal (rev. 1380365743); Population bottleneck (rev. 1369785542)' },
    { claim: 'Wright–Fisher model: non-overlapping generations, each new gene copy drawn independently at random from the last generation; smaller populations fix faster; infinite populations never fix', source: 'Wikipedia: Genetic drift (rev. 1364511177)' },
    { claim: 'A neutral allele fixes with probability equal to its current frequency; every finite set of genes coalesces to a single ancestor', source: 'Wikipedia: Genetic drift; Fixation (population genetics) (rev. 1367873005)' },
    { claim: 'Drift model numbers (bead genealogy, 20-population runs, one model run per pond count) computed by a seeded Wright–Fisher simulation', source: 'Code: src/expeditions/sims/drift.ts' },
    { claim: 'Bottleneck survival is random and not improved by genetic advantage; founder effect is a special case of a bottleneck', source: 'Wikipedia: Genetic drift (Population bottleneck; Founder effect sections)' },
    { claim: 'Gene flow is the transfer of genetic material from one population to another', source: 'Wikipedia: Gene flow (rev. 1379223119)' },
    { claim: 'Greater prairie chickens in one Illinois population fell from 2,000 in 1962 to fewer than 50 by 1994; fertility, hatching and genetic diversity declined; translocations from large, diverse populations from 1992 restored egg viability', source: 'Westemeier et al. 1998, Science 282:1695, doi:10.1126/science.282.5394.1695 (abstract, PubMed 9831558)' },
    { claim: 'Mutations result from errors during replication, mitosis or meiosis, or from damage to DNA', source: 'Wikipedia: Mutation (rev. 1372306895)' },
    { claim: 'Fluctuation test: E. coli strain B and virus α; small inocula; experiment 16 counts (20 cultures) 1, 0, 3, 0, 0, 5, 0, 5, 0, 6, 107, 0, 0, 0, 1, 0, 0, 64, 0, 35 (average 11.35); control experiment 10a (ten samples of one culture) 14, 15, 13, 21, 15, 14, 26, 16, 20, 13 (average 16.7); the slot-machine comparison', source: 'Luria & Delbrück 1943, Genetics 28:491, doi:10.1093/genetics/28.6.491, tables 1 and 2 and theory section (PMC1209226 scan)' },
    { claim: 'The phage was T1; mutations arise without selective pressure; Delbrück and Luria won the 1969 Nobel Prize in part for this work', source: 'Wikipedia: Luria–Delbrück experiment (rev. 1350909232)' },
    { claim: 'Fluctuation model: 128 starting cells, 22 doublings (about 537 million cells), each new cell resistant with chance 1.9 × 10⁻⁹; induced model uses a Poisson count with the same expected mean', source: 'Code: src/expeditions/sims/fluctuationMath.ts (a model, not the 1943 parameters)' },
    { claim: 'Replica plating with velveteen, 1952, Esther and Joshua Lederberg; resistant colonies recurred at congruent sites (at least half, often nearly all); resistant strains to phage T1 and streptomycin isolated by indirect selection without exposure to the agent', source: 'Lederberg & Lederberg 1952, J Bacteriol 63:399, doi:10.1128/jb.63.3.399-406.1952 (PMC169282 scan); Wikipedia: Esther Lederberg; Replica plating' },
    { claim: 'Organisms with advantageous traits are more likely to pass them on; natural selection preserves traits fitted to their functions', source: 'Wikipedia: Evolution; Natural selection' },
    { claim: 'Misconceptions #2, #11, #15, #16', source: 'mok-content-lab docs/research/appendix-evolution.md §2 (Andrews et al. 2012; Bishop & Anderson 1990)' },
    { claim: 'Cover: northern elephant seal, San Miguel Island (NOAA, public domain); prairie chicken (USFWS, public domain)', source: 'Wikimedia Commons file pages, licenses checked via the Commons API 2026-10-16' },
  ],
};
