import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const MOTH_1931 = '(1931)_Peppered_Moth_(Biston_betularia)_f.carbonaria_-_Flickr_-_Bennyboymothman.jpg';
const WYLD = 'Wyld,_William_-_Manchester_from_Kersal_Moor,_with_rustic_figures_and_goats_-_Google_Art_Project.jpg';

// E03 "Be the bird". Arc: experiment. The learner is the selective agent first, then
// meets the real history. The moth story is a teaching simplification, said so on
// screen, anchored on Cook, Grant, Saccheri & Mallet 2012 (Majerus's experiment).
// Every key comes from theory (sims/selection.ts), never from the learner's own run.
export const evolutionE03: Pack = {
  id: 'evolution-e03',
  title: 'Be the bird',
  question: 'How does a population change when no single animal does?',
  path: ['Life', 'Evolution', 'Natural selection', 'Selection'],
  hue: 130,
  minutes: 9,
  media: {
    carbonaria: {
      src: `https://upload.wikimedia.org/wikipedia/commons/8/85/${encodeURIComponent(MOTH_1931)}`,
      alt: 'A black peppered moth, wings spread flat, resting on pale, weathered bark',
      credit: 'Ben Sale, via Flickr · CC BY 2.0 · cropped', page: commons(MOTH_1931), date: '2013', license: 'CC BY 2.0',
    },
    birch: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Lichte_en_zwarte_versie_berkenspanner.jpg',
      alt: 'Two peppered moths on a birch trunk: a black one easy to see on the white bark, a pale speckled one beside a patch of moss',
      credit: 'Maarten Sanne (Martinowksy), Dutch Wikipedia · CC BY-SA 3.0', page: commons('Lichte_en_zwarte_versie_berkenspanner.jpg'),
      license: 'CC BY-SA 3.0',
    },
    manchester: {
      src: `https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/${encodeURIComponent(WYLD)}/1920px-${encodeURIComponent(WYLD)}`,
      alt: 'A watercolour of Manchester seen from a green hill, dozens of mill chimneys smoking under a hazy yellow sky',
      credit: 'William Wyld, Manchester from Kersal Moor, 1852 · Public domain', page: commons(WYLD), date: '1852', license: 'Public domain',
    },
    plate: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Moths_of_the_British_Isles_Series2_Plate129.jpg',
      alt: 'A colour plate of three peppered moths: two pale and speckled, one solid black between them',
      credit: 'Richard South, The Moths of the British Isles, 1909, plate 129 · Public domain', page: commons('Moths_of_the_British_Isles_Series2_Plate129.jpg'),
      date: '1909', license: 'Public domain',
    },
    woodcut: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/8/86/EB1911_Lepidoptera_-_Geometrid_Moth.jpg',
      alt: 'An engraving of the pale and the dark peppered moth side by side, with a caterpillar looping along a twig below',
      credit: 'Encyclopædia Britannica, 11th edition, 1911 · Public domain', page: commons('EB1911_Lepidoptera_-_Geometrid_Moth.jpg'),
      date: '1911', license: 'Public domain',
    },
    finches: {
      src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Darwin%27s_finches_by_Gould.jpg/1280px-Darwin%27s_finches_by_Gould.jpg',
      alt: 'Four Galápagos finch heads drawn in profile, their beaks ranging from thick and deep to thin and pointed',
      credit: 'John Gould, in Darwin’s Journal of Researches, 1845 · Public domain', page: commons("Darwin's_finches_by_Gould.jpg"),
      date: '1845', license: 'Public domain',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'carbonaria', title: 'Be the bird',
      hook: 'In 19th-century Manchester, soot blackened the trees, and a moth that had almost always been pale became almost always black. You are about to find out how. You are the bird.',
      focus: [50, 50],
    },
    {
      kind: 'sim', sim: 'mothHunt', title: 'The hunt',
      goal: 'Peppered moths rest on tree bark by day. Birds eat the ones they find.',
      params: {
        start: 0.1, shown: 24, catches: 8, seed: 'e03-moths',
        visible: { soot: { dominant: 1, recessive: 4 }, lichen: { dominant: 4, recessive: 1 } },
        forms: { dominant: 'black', recessive: 'pale' },
        barks: { soot: 'Sooty bark', lichen: 'Clean bark' },
        note: 'A teaching model: one gene, moths on open bark, birds as the only hunters. In the long runs a stand-in bird finds a moth that stands out four times as easily as one that blends in.',
        script: [
          { do: 'hunt', bark: 'soot', text: 'Soot has blackened this bark. Most of the moths on it are pale; a few are black. You are a hungry bird. Catch 8.' },
          {
            do: 'ask', gradeId: 'soot-predict', reveal: 'later',
            prompt: 'Birds find the moths that stand out. If they keep hunting like this, generation after generation, what happens?',
            choices: [
              { id: 'darken', label: 'The pale moths slowly darken to match', feedback: 'A moth’s colour is set by a gene it inherited. What can change is how many moths of each colour there are.' },
              { id: 'need', label: 'Black moths appear because the moths need them', feedback: 'Need doesn’t write new genes. The black form was already there, rare. The birds just stopped finding most of it.' },
              { id: 'more', label: 'Black moths become more and more common' },
              { id: 'nothing', label: 'Nothing, because a moth can’t choose its colour', feedback: 'It can’t, and it doesn’t have to. The birds do the choosing, and the survivors pass their colour on.' },
            ],
            answer: 'more',
            explain: 'Black moths take over. No moth changed. Each generation the birds removed more pale moths than black ones, so more black moths lived to breed, and black is inherited.',
          },
          { do: 'hunt', bark: 'soot', text: 'The survivors have bred. This is their offspring’s generation. Catch 8.' },
          { do: 'hunt', bark: 'soot', text: 'One more generation. Catch 8.' },
          {
            do: 'ask', gradeId: 'how-changed', reveal: 'now',
            prompt: 'Look at the rows of moths under the chart, one row per generation you hunted. How did the population change?',
            choices: [
              { id: 'darker', label: 'Every moth was a little darker than the generation before', feedback: 'Check the rows: there are no grey moths. The mix changed; the moths didn’t.' },
              { id: 'share', label: 'More moths were black; each was black or pale' },
              { id: 'turned', label: 'Some of the pale moths turned black', feedback: 'No moth in the rows changed colour. Black moths grew more common because more of their parents survived.' },
            ],
            answer: 'share',
            explain: 'That is natural selection. The population changes, not the individuals: each generation is a new set of moths, with more black ones because more black parents lived to breed.',
          },
          {
            do: 'forward', bark: 'soot', until: 0.98, rising: true, max: 120,
            button: 'Let the birds hunt for many generations',
            reached: 'After {n} more generations, black moths are {pct} of the population. Manchester’s peppered moths went from a rare black one to 98% black between 1848 and 1895, at one generation a year.',
            notReached: 'After {n} more generations, black moths are {pct} of the population.',
          },
          { do: 'say', bark: 'lichen', text: '1956: Britain passes the Clean Air Act. Smoke is cut, soot stops settling, and the bark grows pale again.', button: 'See the clean bark' },
          {
            do: 'ask', gradeId: 'clean-predict', reveal: 'later',
            prompt: 'Nearly every moth is now black, sitting on pale bark. What happens next?',
            choices: [
              { id: 'turn', label: 'The black moths turn pale', feedback: 'Same answer as before: no moth changes colour. The mix of moths does.' },
              { id: 'forward', label: 'Nothing, because evolution doesn’t go backwards', feedback: 'Evolution has no direction to go back from. Selection favours whatever survives where the moths live now.' },
              { id: 'gone', label: 'Pale can’t return, since almost no pale moths are left', feedback: 'Pale is recessive. Its gene hides in black moths that carry one copy, and two such carriers can have pale young.' },
              { id: 'back', label: 'Pale moths become common again' },
            ],
            answer: 'back',
            explain: 'Pale moths come back. The gene for pale never left: it was hiding in black moths that carried one copy. In Britain the black form has been declining since about 1970.',
          },
          { do: 'hunt', bark: 'lichen', text: 'Clean bark. Catch 8.' },
          { do: 'hunt', bark: 'lichen', text: 'Next generation. Catch 8.' },
          {
            do: 'forward', bark: 'lichen', until: 0.1, rising: false, max: 160,
            button: 'Let the birds hunt for many generations',
            reached: 'After {n} more generations, black moths are down to {pct}.',
            notReached: 'After {n} more generations, black moths are {pct} of the population.',
          },
        ],
      },
      grades: [{ gradeId: 'soot-predict' }, { gradeId: 'how-changed' }, { gradeId: 'clean-predict' }],
    },
    {
      kind: 'documentary', title: 'The real moths',
      frames: [
        { media: 'manchester', x: 60, y: 60, zoom: 1.45, seconds: 10, text: 'Manchester in 1852. Smoke from the city’s coal-fired mills drifted over the countryside. Soot darkened the trees, and sulphur dioxide killed the pale lichens on their bark.' },
        { media: 'plate', x: 50, y: 47, zoom: 1.7, seconds: 8, text: 'In 1848 a collector caught a black peppered moth in Manchester. By 1895, 98 of every 100 peppered moths there were black.' },
        { media: 'woodcut', x: 50, y: 32, zoom: 1.1, seconds: 10, text: 'One gene decides black or pale, and black is dominant. In 2016 geneticists found the mutation: a stretch of “jumping” DNA inserted into a gene called cortex, around 1819 by their estimate.' },
        { media: 'plate', x: 50, y: 14, zoom: 1.5, seconds: 9, text: 'In the 1950s Bernard Kettlewell released marked moths in a polluted wood in Birmingham and in clean woods in Dorset. Birds took more of whichever form stood out.' },
        { media: 'carbonaria', x: 50, y: 50, zoom: 1.2, seconds: 9, text: 'Critics attacked his methods. So Michael Majerus ran a bigger test, releasing 4,864 moths over six years. On today’s cleaner bark, birds took more of the black ones.' },
        { media: 'manchester', x: 28, y: 72, zoom: 1.35, seconds: 10, text: 'Most peppered moths rest on branches rather than open trunks, so the hunt you played is simpler than life. The experiments still point to the same main cause: camouflage, and birds.' },
      ],
    },
    {
      kind: 'predict', gradeId: 'fittest', media: 'birch',
      prompt: 'In 1869 Darwin added Herbert Spencer’s phrase “survival of the fittest” to the Origin. On sooty bark in 1890s Manchester, which peppered moth was the fittest?',
      parts: [
        { id: 'who', label: '', answer: 'young', choices: [
          { id: 'young', label: 'The one leaving the most young that bred' },
          { id: 'strong', label: 'The biggest, strongest moth on the whole tree', feedback: 'Size and strength don’t stop a bird. Fitness is counted in offspring, not muscle.' },
          { id: 'long', label: 'The moth that lived the longest life of all', feedback: 'Survival only counts if it leads to young. A long life with no offspring leaves nothing in the next generation.' },
          { id: 'hide', label: 'The moth that tried the hardest to hide itself', feedback: 'Trying doesn’t change a colour. A black moth on black bark is hidden without trying.' },
        ] },
      ],
      explain: 'Fitness means leaving offspring, compared with the others in the same place. On sooty bark that was usually a black moth; on clean bark, a pale one, like the pale moth half-hidden on this birch. By “fittest” Darwin meant best suited to local conditions, not in the best physical shape.',
    },
    {
      kind: 'flaw', gradeId: 'giraffe',
      prompt: 'Before Darwin, Jean-Baptiste Lamarck imagined how giraffes got long necks. Follow his story. Which step breaks?',
      steps: [
        { id: 'a', text: 'Giraffes stretch up to reach leaves that other grazers can’t.' },
        { id: 'b', text: 'Using a body part can change it in a lifetime, the way hard work builds a blacksmith’s arms.' },
        { id: 'c', text: 'So a giraffe that stretched all its life has calves born with longer necks.' },
        { id: 'd', text: 'So, generation by generation, giraffe necks grew longer.' },
      ],
      answer: 'c',
      explain: 'Changes a body picks up in its lifetime, like strong arms or a stretched neck, aren’t written into its DNA, so its young don’t inherit them. Selection tells it differently: giraffes are born with necks of different lengths, and those whose necks helped them feed or win mates left more calves. Which of those mattered more is still debated.',
    },
    {
      kind: 'predict', gradeId: 'finches', transfer: true, media: 'finches',
      prompt: 'Daphne Major, Galápagos, 1977. Only 24 mm of rain fell all wet season. The small, soft seeds ran out, leaving big, hard ones, and many medium ground finches starved. Whose chicks filled the island afterwards?',
      parts: [
        { id: 'whose', label: '', answer: 'deep', choices: [
          { id: 'used', label: 'Chicks of birds whose beaks grew stronger from cracking hard seeds', feedback: 'A beak toughened by use doesn’t change the genes a bird passes on.' },
          { id: 'deep', label: 'Chicks of birds born with deep beaks, able to crack the hard seeds' },
          { id: 'need', label: 'Every finch’s chicks, born with bigger beaks because the island needed them', feedback: 'Need doesn’t make anything. Chicks got whatever beaks their parents’ genes gave them.' },
          { id: 'fight', label: 'Chicks of the strongest fighters, which drove the others off the food', feedback: 'Not fighting: cracking. The survivors were the birds that could open the big, hard seeds.' },
        ] },
      ],
      explain: 'Peter Boag and Peter Grant found that large birds, especially males with large beaks, survived best, because they could crack the hard seeds. Beak size is strongly inherited, so the next generation’s beaks were bigger on average. Then in 1982–83 months of heavy rain filled the island with small, soft seeds, and selection swung back toward smaller beaks.',
    },
    {
      kind: 'order', gradeId: 'pocket-mice', transfer: true,
      prompt: 'Rock pocket mice live on pale desert rock in the US Southwest and Mexico. On black lava flows, most of them are dark. Follow one family of mice and put the story in order.',
      items: [
        { id: 'born', label: 'A mouse on the lava is born with a changed Mc1r gene that darkens its coat' },
        { id: 'owls', label: 'Owls hunting on the lava catch it less often than its pale neighbours' },
        { id: 'pups', label: 'It lives to breed, and some of its pups inherit the dark coat' },
        { id: 'again', label: 'Those dark pups, too, outlast pale mice and breed' },
        { id: 'most', label: 'Over many generations, dark mice come to outnumber pale ones on the lava' },
      ],
      answer: ['born', 'owls', 'pups', 'again', 'most'],
      ends: ['First', 'Last'],
      explain: 'Variation first, then selection, then inheritance, over and over. And a twist: dark mice on a lava flow in New Mexico got their dark coats from changes in other genes. The same answer evolved more than once, by different routes.',
    },
    {
      kind: 'payoff',
      idea: 'Inherited traits that help an animal survive and breed become more common. No moth changed colour; the population did.',
      connections: [
        { title: 'Why aren’t you a blend?', place: 'Life › Evolution › Variation and heredity', to: 'evolution-e02' },
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'The coin-flip population: when chance alone decides', place: 'Life › Evolution › Drift' },
        { title: 'The guppy’s dilemma', place: 'Life › Evolution › Sexual selection' },
      ],
    },
  ],
  provenance: [
    { claim: 'Peppered moth: black form rare before the Industrial Revolution; first live black specimen caught by R. S. Edleston in Manchester in 1848; 98% black in Manchester by 1895', source: 'Wikipedia: Peppered moth evolution (rev 1375599440, “Origin and evolution”)' },
    { claim: 'Soot from coal-burning factories darkened trees; sulphur dioxide killed light-coloured lichens', source: 'Wikipedia: Peppered moth evolution (rev 1375599440)' },
    { claim: 'Black (carbonaria) and pale forms inherited at a single locus; black is autosomal dominant', source: 'Wikipedia: Peppered moth evolution (Genetics)' },
    { claim: 'The carbonaria mutation is a large transposable element inserted into the first intron of cortex, dated to around 1819; “jumping genes”', source: 'van’t Hof et al. 2016, Nature 534:102, doi:10.1038/nature17951 (abstract, via PubMed 27251284)' },
    { claim: 'Kettlewell’s 1950s mark-release-recapture work: polluted Birmingham woodland favoured melanics; unpolluted Dorset woods favoured pale moths', source: 'Wikipedia: Peppered moth evolution (Kettlewell’s experiment)' },
    { claim: 'Majerus released 4,864 moths in a six-year experiment; strong differential bird predation against melanics on today’s less sooty bark; reversal since 1970; camouflage and bird predation the overriding explanation', source: 'Cook, Grant, Saccheri & Mallet 2012, Biol Lett 8:609, doi:10.1098/rsbl.2011.1136 (abstract, PubMed 22319093)' },
    { claim: 'Of 135 moths found resting naturally, over half were on branches and 37% on trunks', source: 'Wikipedia: Peppered moth evolution (Majerus’s experiment)' },
    { claim: 'Peppered moths rest by day on bark, where birds find them', source: 'Cook et al. 2012 (abstract: “lower predation at daytime resting sites on dark, sooty bark”)' },
    { claim: 'Peppered moth has one generation a year in Britain (univoltine)', source: 'Wikipedia: Peppered moth (Life cycle)' },
    { claim: 'Clean Air Act passed in the UK in 1956', source: 'Wikipedia: Clean Air Act 1956' },
    { claim: 'Herbert Spencer coined “survival of the fittest” (1864); Darwin added it to the 5th edition of the Origin in 1869; by “fittest” Darwin meant best adapted to the local environment, not in best physical shape; fitness is reproductive success', source: 'Wikipedia: Survival of the fittest (rev 1375458745)' },
    { claim: 'Lamarck’s imagined giraffe stretching its neck and passing on a longer neck; the blacksmith’s arms', source: 'Wikipedia: Lamarckism (rev 1375677163)' },
    { claim: 'Giraffes feed up to 4.5 m high, above competing browsers; neck length explained by competing-browsers and sexual-selection hypotheses, still debated', source: 'Wikipedia: Giraffe (Neck)' },
    { claim: 'Changes acquired in a lifetime are not inherited (Weismann barrier; misconception #3)', source: 'Wikipedia: Lamarckism (Weismann’s germ plasm theory); appendix misconception row 3' },
    { claim: 'Daphne Major 1977: 24 mm of rain in the wet season; small soft seeds ran out, leaving large hard seeds; many finches died', source: 'Wikipedia: Peter and Rosemary Grant (rev 1372520945)' },
    { claim: 'Large birds, especially males with large beaks, survived the drought best because they could crack the large, hard seeds', source: 'Boag & Grant 1981, Science 214:82, doi:10.1126/science.214.4516.82 (abstract, PubMed 17802577)' },
    { claim: 'Beak size is highly heritable; the 1982–83 El Niño brought eight months of rain and small soft seeds, favouring smaller beaks', source: 'Wikipedia: Medium ground finch; Peter and Rosemary Grant' },
    { claim: 'Rock pocket mice: mostly light on light rock, dark on dark lava; owls the main predator; concealing colour protects from avian and mammalian predators; Mc1r mutations explain one lava population; another population evolved dark colour through other genes', source: 'Nachman, Hoekstra & D’Agostino 2003, PNAS 100:5268, doi:10.1073/pnas.0431157100 (abstract); Wikipedia: Rock pocket mouse' },
    { claim: 'Dark Mc1r alleles are dominant (DD and Dd melanic); allele frequency tracks habitat colour', source: 'Hoekstra, Drumm & Nachman 2004, Evolution 58:1329, doi:10.1111/j.0014-3820.2004.tb01711.x (abstract)' },
    { claim: 'Media: Wyld 1852 (PD), South 1909 plate 129 (PD), EB1911 engraving (PD), Gould 1845 finches (PD), Ben Sale carbonaria photo (CC BY 2.0, cropped), Sanne birch photo (CC BY-SA 3.0, unmodified)', source: 'Wikimedia Commons API extmetadata, checked 2026-10-16' },
  ],
};
