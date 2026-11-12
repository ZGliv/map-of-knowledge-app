import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const thumb = (path: string, file: string, width: number) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${encodeURIComponent(file)}/${width}px-${encodeURIComponent(file)}`;
const TALL = 'Fairbanks_-_Mendel_Tall_and_Dwarf_Pea_Plants.jpg';
const PODS = 'Fairbanks_-_Mendel_Seed_Shape_&_Color.jpg';
const QUEEN = 'Weiselzellen_68a.jpg';

// E02 "Why aren't you a blend?". Arc: wrong turn (blending inheritance). The learner
// makes Mendel's cross before reading him. Mendel's words are verbatim from Bateson's
// 1902 translation (Project Gutenberg #69362). Every count and ratio in the garden is
// drawn by sims/cross.ts; the blood-group keys are recomputed by a test.
export const evolutionE02: Pack = {
  id: 'evolution-e02',
  title: 'Why aren’t you a blend?',
  question: 'If children mix their parents, why don’t differences fade away?',
  path: ['Life', 'Evolution', 'Variation and heredity', 'Heredity'],
  hue: 130,
  minutes: 8,
  media: {
    garden: {
      src: thumb('0/03', TALL, 1920),
      alt: 'An oil painting of two pea plants on a pale ground, one tall and climbing, one short, both with white flowers and green pods',
      credit: 'Daniel J. Fairbanks, Mendel’s Experiments: Tall and dwarf pea plants, Mendelianum, Brno · CC BY 4.0 · cropped',
      page: commons(TALL), date: '2017', license: 'CC BY 4.0',
    },
    pods: {
      src: thumb('3/31', PODS, 960),
      alt: 'An oil painting of two open pea pods, each holding a mix of round and wrinkled, yellow and green peas',
      credit: 'Daniel J. Fairbanks, Mendel’s Experiments: Seed Shape & Color, Mendelianum, Brno · CC BY-SA 4.0',
      page: commons(PODS), date: '2017', license: 'CC BY-SA 4.0',
    },
    queen: {
      src: thumb('8/89', QUEEN, 960),
      alt: 'Two opened wax cells from a beehive, each holding a pale larva lying in a pool of milky white food',
      credit: 'Waugsberg · CC BY-SA 3.0', page: commons(QUEEN), date: '2008', license: 'CC BY-SA 3.0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'garden', title: 'Why aren’t you a blend?',
      hook: 'Mix black paint with white and you get grey, for good. In the 1860s the reigning idea was that heredity mixed the same way. If it did, the differences between individuals would fade every generation. A monk in Brno counted peas and showed that they don’t.',
      focus: [40, 35],
    },
    {
      kind: 'sim', sim: 'peaCross', title: 'Mendel’s garden',
      goal: 'From 1856 to 1863 Gregor Mendel grew and tested some 28,000 plants in his monastery’s garden, most of them peas. Make his first cross.',
      params: {
        locus: { R: 1, r: 0 },
        traits: { R: { label: 'Round', look: 'round' }, r: { label: 'Wrinkled', look: 'wrinkled' } },
        seed: 'e02-mendel',
        steps: [
          {
            id: 'f1', title: 'A round-seeded plant crossed with a wrinkled-seeded one',
            parents: ['RR', 'rr'], parentNames: ['Round-seeded parent', 'Wrinkled-seeded parent'],
            action: 'Cross them', seeds: 12,
            ask: {
              gradeId: 'hybrid-seeds',
              prompt: 'Both parents come from lines that always breed true. What will the seeds of the cross look like?',
              choices: [
                { id: 'between', label: 'All in between: a little wrinkled', feedback: 'That is what blending predicts. In each of his seven crosses, Mendel found the hybrids looked like one parent, not halfway between.' },
                { id: 'mix', label: 'Some round, some wrinkled', feedback: 'Not yet. That mix turns up one generation later.' },
                { id: 'round', label: 'All round' },
                { id: 'wrinkled', label: 'All wrinkled', feedback: 'Round wins out here, not wrinkled. Mendel called the trait that shows dominant.' },
              ],
              answer: 'round',
              explain: 'Every seed is round, and wrinkled seems to vanish. But each seed carries a factor for wrinkled from its wrinkled parent, hidden behind the factor for round. Mendel called round dominant and wrinkled recessive.',
            },
          },
          {
            id: 'f2', title: 'The hybrids pollinate themselves',
            parents: ['Rr', 'Rr'], parentNames: ['Hybrid plant', 'Its own pollen'],
            action: 'Let them self-pollinate', seeds: 100,
            ask: {
              gradeId: 'self-seeds',
              prompt: 'A pea flower pollinates itself before it even opens. Grow the round hybrid seeds and let the plants do that. What seeds will they make?',
              choices: [
                { id: 'allround', label: 'All round again, just like the parent plant', feedback: 'If the wrinkled factor were gone, yes. It isn’t gone, only hidden.' },
                { id: 'three', label: 'Roughly three round to one wrinkled' },
                { id: 'between', label: 'All slightly wrinkled, in between', feedback: 'Blending again. Mendel: “Transitional forms were not observed in any experiment.”' },
                { id: 'half', label: 'Half round and half wrinkled', feedback: 'Wrinkled does come back, but in about one seed of every four, not two.' },
              ],
              answer: 'three',
              explain: 'Wrinkled seeds come back, about one in four, as wrinkled as ever. Each hybrid carries one factor for round and one for wrinkled, and each seed gets one of the two at random from the egg and one from the pollen. Only seeds that get wrinkled twice are wrinkled.',
            },
            scaleUp: { count: 7324, action: 'Count as many seeds as Mendel did', realLabel: 'Mendel’s count, from 253 hybrid plants', real: { R: 5474, r: 1850 } },
          },
        ],
        figure: { media: 'pods', caption: 'Pods on Mendel’s hybrids usually held both kinds of seed: in his words, “each pod yielded usually both kinds of seed.” A painting in the Mendelianum, Brno.' },
      },
      grades: [{ gradeId: 'hybrid-seeds' }, { gradeId: 'self-seeds' }],
    },
    {
      kind: 'source', gradeId: 'mendel-source',
      source: { title: 'Experiments in Plant-Hybridisation (1865)', detail: 'Gregor Mendel, translated by William Bateson, 1902', page: 'https://www.gutenberg.org/ebooks/69362' },
      passage: [
        'The expression “recessive” has been chosen because the characters thereby designated withdraw or entirely disappear in the hybrids, but nevertheless [[reappear unchanged in their progeny|unchanged]], as will be demonstrated later on.',
        'In this generation there reappear, together with the dominant characters, also the recessive ones with their full peculiarities, and this occurs in the definitely expressed average proportion of [[three to one|three]], so that among each four plants of this generation three display the dominant character and one the recessive. … [[Transitional forms were not observed in any experiment.|none]]',
        '… From 253 hybrids 7,324 seeds were obtained in the second trial year. Among them were 5,474 round or roundish ones and 1,850 angular wrinkled ones. Therefrom the ratio [[2·96 to 1|ratio]] is deduced.',
      ],
      notes: {
        unchanged: 'Hidden for a generation, then back exactly as it was: a wrinkled seed from a hybrid is as wrinkled as any.',
        three: 'Close to 3 to 1 for all seven traits he followed, from seed colour to the length of the stem.',
        none: 'The line that sinks the paint-pot idea. Blending makes in-between seeds. There were none.',
        ratio: 'Single plants wobbled far more. One gave 43 round seeds and 2 wrinkled; another gave 14 round and 15 wrinkled. Only big counts settle near 3 to 1.',
      },
      question: {
        prompt: 'Why did wrinkled seeds come back, unchanged, from round hybrid parents?',
        choices: [
          { id: 'pollen', label: 'Insects carried in pollen from wrinkled plants nearby', feedback: 'Mendel checked: the risk of foreign pollen, he wrote, “is, however, a very slight one with Pisum”. It can’t explain a steady one in four.' },
          { id: 'mutation', label: 'The wrinkled trait arose again by chance mutation', feedback: 'New mutations are far too rare to bring back the same trait in a quarter of the seeds, every time.' },
          { id: 'unmix', label: 'The hybrids were blends that slowly unmixed', feedback: 'The hybrids weren’t blends: they looked fully round. And a true blend has nothing left to unmix.' },
          { id: 'hidden', label: 'Each hybrid carried the wrinkled factor, hidden' },
        ],
        answer: 'hidden',
        explain: 'The factor for wrinkled passed through the round hybrids whole. Hidden is not lost.',
      },
    },
    {
      kind: 'predict', gradeId: 'variant-kept',
      prompt: 'A new variant turns up: one plant in a field has a trait no other plant has. It breeds with ordinary plants, and so do its offspring, generation after generation.',
      parts: [
        { id: 'blend', label: 'If heredity blended like paint, what happens to the new trait?', answer: 'halved', choices: [
          { id: 'halved', label: 'It is diluted each generation until it vanishes' },
          { id: 'whole', label: 'It passes on whole to about half of the offspring', feedback: 'That is what Mendel’s factors do. A blend can’t: it is the same all the way through.' },
          { id: 'spreads', label: 'It spreads until every plant in the field has it', feedback: 'Mixing with ordinary partners dilutes it. Nothing in blending makes it spread.' },
        ] },
        { id: 'factor', label: 'With Mendel’s factors instead, what happens to it?', answer: 'kept', choices: [
          { id: 'fades', label: 'It fades away gradually within a few generations', feedback: 'Factors don’t fade. Each offspring gets the factor whole, or doesn’t get it at all.' },
          { id: 'lost', label: 'It is lost for good the first time it is hidden', feedback: 'Hidden isn’t lost. Mendel’s wrinkled factor hid for a generation and came back intact.' },
          { id: 'kept', label: 'It passes on whole, even through hidden carriers' },
        ] },
      ],
      explain: 'Blending grinds variety down to sameness. In 1867 the engineer Fleeming Jenkin pressed exactly this point against Darwin: any useful new trait would be blended away before selection could act on it. Mendel’s factors don’t blend. They pass on whole or not at all, so a rare variant can hide in carriers and turn up again. That is how a population keeps the variety that natural selection works on.',
    },
    {
      kind: 'match', gradeId: 'blood-groups', transfer: true, buckets: true,
      prompt: 'Human ABO blood groups come from one gene with three versions: A, B and O. A and B both show; O shows only in a child who inherits two O’s. Could each couple have a child with type O blood?',
      left: [
        { id: 'a-b', label: 'Mother type A, father type B' },
        { id: 'ab-o', label: 'Mother type AB, father type O' },
        { id: 'o-o', label: 'Mother type O, father type O' },
        { id: 'a-a', label: 'Mother type A, father type A' },
        { id: 'ab-ab', label: 'Mother type AB, father type AB' },
        { id: 'b-o', label: 'Mother type B, father type O' },
        { id: 'ab-b', label: 'Mother type AB, father type B' },
      ],
      right: [{ id: 'yes', label: 'Could' }, { id: 'no', label: 'Couldn’t' }],
      pairs: { 'a-b': 'yes', 'ab-o': 'no', 'o-o': 'yes', 'a-a': 'yes', 'ab-ab': 'no', 'b-o': 'yes', 'ab-b': 'no' },
      explain: 'Type A and type B parents can each carry a hidden O, so an A and a B, or two A’s, can have a type O child. A parent with type AB has no O to pass on, so their child is never type O, barring rare exceptions such as the Bombay blood group. Mendel’s hidden factor again, with three versions of the gene instead of two.',
    },
    {
      kind: 'flaw', gradeId: 'heritability',
      prompt: 'A headline says height is “80% genetic.” A reader takes it from there. Which step breaks?',
      steps: [
        { id: 'a', text: 'Twin studies find that 60 to 80% of the differences in height between people track differences in their genes.' },
        { id: 'b', text: 'Height is shaped both by genes and by childhood food and health.' },
        { id: 'c', text: 'So genes built about 80% of my height, and food and health built the rest.' },
      ],
      answer: 'c',
      explain: 'Heritability describes differences within a population, in that population’s conditions. It doesn’t split one person into a gene part and a food part. Height is shaped by hundreds of gene variants and by childhood food and health. Maya children raised in the United States grew about 10 cm taller than Maya children of the same age in Guatemala, largely thanks to better nutrition and health care.',
    },
    {
      kind: 'predict', gradeId: 'queen-bee', transfer: true, media: 'queen',
      prompt: 'A honeybee queen is the mother of most, if not all, of the bees in her hive. A new queen and the workers start out as the same kind of egg. What turns one larva into a queen?',
      parts: [
        { id: 'what', label: '', answer: 'food', choices: [
          { id: 'gene', label: 'A queen gene that only a few of the eggs carry', feedback: 'Any fertilised egg can become a queen. The difference isn’t in the egg.' },
          { id: 'food', label: 'What it is fed: queen larvae get only royal jelly' },
          { id: 'mother', label: 'It inherits queenhood from its mother, the old queen', feedback: 'Then the workers would inherit it too: most of them share that mother.' },
          { id: 'fight', label: 'The strongest larva fights its way to the top', feedback: 'The workers decide, through what they feed it.' },
        ] },
      ],
      explain: 'Diet. Workers feed every larva some royal jelly for its first few days, but only queen larvae get it and nothing else, and they grow into egg-laying queens. Same kind of egg, different upbringing: not every difference between individuals is inherited. Mendel kept bees too, though none of his results on them survive.',
    },
    {
      kind: 'payoff',
      idea: 'Individuals differ, and much of that difference is inherited, in factors that don’t blend. They pass on whole, hide, and come back.',
      connections: [
        { title: 'Be the bird', place: 'Life › Evolution › Natural selection', to: 'evolution-e03' },
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'The coin-flip population: when chance alone decides', place: 'Life › Evolution › Drift' },
        { title: 'Genes and genomes', place: 'Life › Genetics & Genomes' },
      ],
    },
  ],
  provenance: [
    { claim: 'Blending inheritance: the 19th-century theory that offspring average their parents; Fleeming Jenkin’s 1867 review argued blending would average out new beneficial traits before selection acted', source: 'Wikipedia: Blending inheritance (rev 1315232893); Fleeming Jenkin (June 1867, North British Review; blending the reigning hypothesis)' },
    { claim: 'Mendel: Augustinian friar at St Thomas’s Abbey, Brno; 1856–1863 grew and tested some 28,000 plants, mostly peas; started from true-breeding varieties', source: 'Wikipedia: Gregor Mendel (rev 1376806037)' },
    { claim: 'Round seed dominant over wrinkled; hybrid resembles one parent; recessive “reappear unchanged in their progeny”; 3 to 1 in the next generation; “Transitional forms were not observed in any experiment”; Expt. 1: 253 hybrids, 7,324 seeds, 5,474 round and 1,850 wrinkled, ratio 2·96 to 1; extremes of 43:2 and 14:15 on single plants; all seven characters, average 2·98 to 1; “each pod yielded usually both kinds of seed”', source: 'Mendel, Experiments in Plant Hybridisation, tr. Bateson, in Mendel’s Principles of Heredity: A Defence (1902), Project Gutenberg #69362 (verbatim)' },
    { claim: 'Peas pollinate themselves in the bud: “the anther bursts within the bud, so that the stigma becomes covered with pollen even before the flower opens”; the risk of foreign pollen “is, however, a very slight one with Pisum”', source: 'Mendel, tr. Bateson 1902, Project Gutenberg #69362 (verbatim)' },
    { claim: 'ABO: one gene, three alleles (A, B, O); A and B codominant, both dominant over O; only OO is type O; an A and a B parent can have an O child; an AB parent can have an O child only in rare cases such as the Bombay phenotype or cis-AB', source: 'Wikipedia: ABO blood group system (rev 1371545206, Genetics)' },
    { claim: 'Heritability measures the share of variation in a population due to genetic variation; it is not the share of an individual’s trait caused by genes; it is specific to a population and environment', source: 'Wikipedia: Heritability (rev 1377641686)' },
    { claim: 'Differences in human height are 60–80% heritable in twin studies; hundreds of variants at hundreds of loci; Maya children in the US were 10.24 cm taller than Guatemalan Maya of the same age by 2000, largely due to nutrition and health care', source: 'Wikipedia: Human height (rev 1378445438)' },
    { claim: 'Queen bee: usually the mother of most, if not all, bees in the hive; any fertilised egg can become a queen; diet decides; all larvae get some royal jelly for a few days, only queen larvae exclusively; queens develop into sexually mature females', source: 'Wikipedia: Queen bee (rev 1375421356)' },
    { claim: 'Mendel kept bees at the monastery; none of his results on bees survived', source: 'Wikipedia: Gregor Mendel' },
    { claim: 'Media: Fairbanks paintings for the Mendelianum, Brno (tall/dwarf CC BY 4.0, cropped for the cover; seed shape and colour CC BY-SA 4.0, unmodified); Waugsberg queen cells photo (CC BY-SA 3.0, unmodified)', source: 'Wikimedia Commons API extmetadata and file descriptions, checked 2026-10-16' },
  ],
};
