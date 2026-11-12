import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const thumb = (path: string, width: number) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${path.split('/').pop()}`;
const PEACOCK = 'Peacock_displaying_in_Sri_Lanka.webm';
const PEACOCK_DIR = `https://upload.wikimedia.org/wikipedia/commons/transcoded/0/05/${PEACOCK}`;
const PEACOCK_CREDIT = 'Ankur P, Yala National Park, Sri Lanka (stabilised, sound removed) · CC BY 2.0';
const GUPPY = '1/19/Trinidadian_guppy_%28Poecilia_reticulata%29_male_and_female.png';
const GUPPY_CREDIT = 'Deacon, Shimadzu, Dornelas, Ramnarine & Magurran, Ecology and Evolution, 2015 · CC BY 4.0 · cropped';

// E11 "Worth the risk". Arc: experiment. Endler's guppy work is told from secondary sources
// (Weiner 1994; Raven et al.; Broder et al. 2016), because the 1980 abstract could not be
// fetched: those facts are marked basis: secondary in the provenance and should be audited.
// The trade-off sim is a teaching model and says so on screen.
export const evolutionE11: Pack = {
  id: 'evolution-e11',
  title: 'Worth the risk',
  question: 'Why would evolution build a trait that gets you eaten?',
  path: ['Life', 'Evolution', 'Sexual selection'],
  hue: 130,
  minutes: 9,
  media: {
    flight: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Longtailed_Widowbird%2C_Euplectes_progne_in_early_summer_breading_plumage_at_Rietvlei_Nature_Reserve%2C_Gauteng%2C_South_Africa_%2815668577645%29.jpg',
      alt: 'A male long-tailed widowbird in flight over grassland, black with a red shoulder patch, its long tail trailing behind',
      credit: 'Derek Keats, Rietvlei Nature Reserve, South Africa · CC BY 2.0',
      page: commons('Longtailed_Widowbird,_Euplectes_progne_in_early_summer_breading_plumage_at_Rietvlei_Nature_Reserve,_Gauteng,_South_Africa_(15668577645).jpg'), date: '2014', license: 'CC BY 2.0',
    },
    perched: {
      src: thumb('5/5b/Euplectes_progne_male_South_Africa.jpg', 1920),
      alt: 'A male long-tailed widowbird perched on a bush, its tail feathers hanging far below it',
      credit: 'Mohanr53, near Johannesburg, 2007 · Public domain', page: commons('Euplectes_progne_male_South_Africa.jpg'), date: '2007', license: 'Public domain',
    },
    peacock: {
      src: `${PEACOCK_DIR}/${PEACOCK}.480p.vp9.webm`,
      alt: 'A wild peacock in a clearing raises his fan of eyespot feathers',
      credit: PEACOCK_CREDIT, page: commons(PEACOCK), date: '2015', license: 'CC BY 2.0',
      sources: [
        { src: `${PEACOCK_DIR}/${PEACOCK}.480p.vp9.webm`, type: 'video/webm; codecs="vp9, opus"' },
        { src: `${PEACOCK_DIR}/${PEACOCK}.360p.mpeg4.mov`, type: 'video/quicktime' },
        { src: `https://upload.wikimedia.org/wikipedia/commons/0/05/${PEACOCK}`, type: 'video/webm; codecs="vp8, vorbis"' },
      ],
    },
    peacockStill: {
      src: `https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/${PEACOCK}/1280px-seek%3D20-${PEACOCK}.jpg`,
      alt: 'A wild peacock with his train fanned out in a green clearing',
      credit: PEACOCK_CREDIT, page: commons(PEACOCK), date: '2015', license: 'CC BY 2.0',
    },
    falls: {
      src: thumb('8/83/Venita_Waterfalls%2C_Brasso_Seco%2C_Trinidad_08.jpg', 1280),
      alt: 'A small waterfall pouring over dark rock into a forest pool in Trinidad',
      credit: 'Naiyo868, Venita Waterfalls, Brasso Seco, Trinidad · CC0', page: commons('Venita_Waterfalls,_Brasso_Seco,_Trinidad_08.jpg'), date: '2024', license: 'CC0',
    },
    guppies: {
      src: `https://upload.wikimedia.org/wikipedia/commons/${GUPPY}`,
      alt: 'Two Trinidadian guppies: a male above with orange, black and blue patches, and a plain, larger female below',
      credit: GUPPY_CREDIT, page: commons('Trinidadian_guppy_(Poecilia_reticulata)_male_and_female.png'), date: '2015', license: 'CC BY 4.0',
    },
    morin: {
      src: thumb('6/68/Felix_Morin_-_Waterfall%2C_Trinidad_3099116210.jpg', 1280),
      alt: 'An old sepia photograph of a tall waterfall falling down a forested rock face in Trinidad',
      credit: 'Félix Morin, Trinidad, before 1901 · Public domain', page: commons('Felix_Morin_-_Waterfall,_Trinidad_3099116210.jpg'), date: 'before 1901', license: 'Public domain',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'perched', title: 'Worth the risk',
      hook: 'A male long-tailed widowbird grows tail feathers about half a metre long. In wet weather they leave him unable to fly. Why would evolution build that?',
      focus: [44, 50],
    },
    {
      kind: 'predict', gradeId: 'widowbird', media: 'flight',
      prompt: 'In Kenya, Malte Andersson sorted 36 male widowbirds into nine matched groups of four. In each group he cut one male’s tail short and glued the cut pieces onto a second male, making his tail 20 to 30 cm longer. A third male’s tail was cut and glued straight back. The fourth was left alone.',
      parts: [
        { id: 'most', label: 'Which males gained the most new nests on their territories?', answer: 'long', choices: [
          { id: 'long', label: 'Lengthened tails' },
          { id: 'normal', label: 'Normal tails',
            feedback: 'The control males did worse than the lengthened ones.' },
          { id: 'short', label: 'Shortened tails',
            feedback: 'Shortened males did no better than normal-tailed ones. The clear result: the lengthened males did best.' },
        ] },
        { id: 'why', label: 'Why cut one male’s tail and glue it straight back on?', answer: 'control', choices: [
          { id: 'control', label: 'To check that cutting and gluing alone made no difference' },
          { id: 'mark', label: 'To mark him so he could be found again',
            feedback: 'The males already wore coloured leg rings for that.' },
          { id: 'strength', label: 'To test whether glued feathers last',
            feedback: 'That wasn’t the question. A male cut and glued back to his own length shows whether the handling itself changes his luck.' },
        ] },
      ],
      explain: 'Long tails won. The lengthened males gained the most new nests; shortened and normal-tailed males did about equally. Females preferred tails longer than any that grow naturally. The shortened males kept displaying and kept their territories, so it was choice by females, not fights between males, that favoured the longer tails.',
    },
    {
      kind: 'source', gradeId: 'darwin-loser',
      source: { title: 'On the Origin of Species (1859)', detail: 'Charles Darwin · 1st edition, chapter IV, “Sexual Selection”, paragraphs 1 and 2', page: 'https://www.gutenberg.org/ebooks/1228' },
      passage: [
        'And this leads me to say a few words on what I call Sexual Selection. This depends, not on a struggle for existence, but on a struggle between the males for possession of the females; [[the result is not death to the unsuccessful competitor, but few or no offspring|offspring]]. … [[A hornless stag or spurless cock would have a poor chance of leaving offspring.|weapons]]',
        '… The rock-thrush of Guiana, birds of Paradise, and some others, congregate; and successive males display their gorgeous plumage and perform strange antics before the females, which standing by as spectators, [[at last choose the most attractive partner|choose]].',
        '… I can see no good reason to doubt that female birds, by selecting, during thousands of generations, the most melodious or beautiful males, according to their standard of beauty, [[might produce a marked effect|effect]].',
      ],
      notes: {
        offspring: 'The heart of it. The loser doesn’t die; he leaves fewer young. That is enough to change the next generation.',
        weapons: 'One route: fighting. Antlers and spurs win contests between males.',
        choose: 'The other route: females choosing. Darwin had no experiment to prove it. Andersson’s widowbirds supplied one in 1982.',
        effect: 'His bold guess: choosy females, generation after generation, could reshape the males.',
      },
      question: {
        prompt: 'In Darwin’s account, how does a male lose at sexual selection?',
        choices: [
          { id: 'killed', label: 'He is killed by the winner' },
          { id: 'fewer', label: 'He leaves few or no offspring' },
          { id: 'starves', label: 'He is driven away from food' },
          { id: 'none', label: 'He can’t lose: every male breeds equally' },
        ],
        answer: 'fewer',
      },
    },
    {
      kind: 'footage', media: 'peacock', poster: 'peacockStill',
      caption: 'A wild peacock displaying in Yala National Park, Sri Lanka. Darwin’s chapter cites Sir R. Heron on one pied peacock that “was eminently attractive to all his hen birds”.',
    },
    {
      kind: 'sim', sim: 'tradeOff', title: 'What colour costs',
      goal: 'Male guppies in Trinidad’s streams. Find the amount of colour that leaves the most young where pike cichlids hunt.',
      params: {
        trait: { name: 'Colour', low: 'Drab', high: 'Gaudy' },
        figure: 'guppy',
        curves: { survival: 'Lives to breed', mating: 'Chosen by females', offspring: 'Young' },
        settings: [
          { id: 'many', label: 'Below the falls: pike cichlids', base: 0.5, rate: 4.5 },
          { id: 'few', label: 'Above the falls: no pike cichlids', base: 0.8, rate: 1.8 },
        ],
        mating: { lift: 0.05, power: 1.5 },
        start: 'many',
        tolerance: 0.03,
        readout: {
          more: 'A little more colour would leave more young.',
          less: 'A little less colour would leave more young.',
          best: 'No small change does better. This is the best colour here.',
        },
        questions: [{
          gradeId: 'falls-shift', prompt: 'Now move these guppies above a waterfall, where pike cichlids can’t follow. Where does the best colour go?',
          choices: [{ id: 'more', label: 'More colourful' }, { id: 'less', label: 'Duller' }, { id: 'same', label: 'It stays put' }],
          answer: 'more', switchTo: 'few',
          explain: 'More colourful. With fewer predators, colour costs less, so the balance tips toward what females prefer. In Trinidad, John Endler tested exactly this.',
        }],
        credit: 'A teaching model, not measurements: survival falls and mating success rises with colour, and young are the product of the two.',
      },
      grades: [{ gradeId: 'falls-shift' }],
    },
    {
      kind: 'documentary', title: 'Endler’s guppies',
      frames: [
        { media: 'falls', x: 50, y: 40, zoom: 1.08, seconds: 7, text: 'Trinidad’s mountain streams are broken by waterfalls. The pike cichlid, a fish that hunts guppies, can’t get past them, so guppies above the falls face far fewer enemies.' },
        { media: 'guppies', x: 50, y: 28, zoom: 1.5, seconds: 7, text: 'Below the falls live pike cichlids, which hunt guppies. Brighter males win more females, but predators notice them more.' },
        { media: 'guppies', x: 50, y: 72, zoom: 1.5, seconds: 6, text: 'Females are drawn to brightly coloured males, especially ones with orange spots.' },
        { media: 'guppies', x: 50, y: 50, zoom: 1, seconds: 8, text: 'In greenhouse ponds at Princeton, John Endler added pike cichlids to some ponds, a weaker predator to others, and left some with none. Within about ten generations, males in the cichlid ponds were duller; the rest were brighter.' },
        { media: 'morin', x: 50, y: 45, zoom: 1.1, seconds: 9, text: 'In 1976 he moved about two hundred guppies from a cichlid stream to one above a waterfall, where the only other fish was a small killifish that mostly takes young guppies. About 15 generations later, the males there had more spots, and bigger ones.' },
      ],
    },
    {
      kind: 'flaw', gradeId: 'fittest',
      prompt: '“Sexual selection is just survival of the fittest: the males that win mates are the ones best at staying alive.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Male túngara frogs with complex calls attract more females.' },
        { id: 'b', text: 'So complex callers are fitter.' },
        { id: 'c', text: 'Being fitter means being better at staying alive.' },
        { id: 'd', text: 'So complex callers must be safer from predators.' },
      ],
      answer: 'c',
      explain: 'Fitness counts offspring, not years alive. In fact, complex calls make it easier for fringe-lipped bats to find a calling frog, even as they draw in more females. Herbert Spencer coined “survival of the fittest” in 1864, and Darwin took the phrase into the fifth edition of Origin in 1869.',
    },
    {
      kind: 'match', gradeId: 'mates-or-life', transfer: true, buckets: true,
      prompt: 'Sort each trait: is its main job winning mates, or staying alive?',
      left: [
        { id: 'antlers', label: 'A red deer stag’s antlers' },
        { id: 'frog', label: 'A poison dart frog’s bright colours' },
        { id: 'eyes', label: 'A male stalk-eyed fly’s extra-wide eye span' },
        { id: 'stick', label: 'A stick insect’s twig-like body' },
        { id: 'bower', label: 'A male bowerbird’s decorated bower' },
        { id: 'hare', label: 'A snowshoe hare’s white winter coat' },
      ],
      right: [{ id: 'mates', label: 'Winning mates' }, { id: 'alive', label: 'Staying alive' }],
      pairs: { antlers: 'mates', frog: 'alive', eyes: 'mates', stick: 'alive', bower: 'mates', hare: 'alive' },
      explain: 'Stags clash antlers with rivals in the mating season; female stalk-eyed flies prefer males with longer eyestalks; a bower is built and decorated to attract a mate. The other three keep their owners from being eaten: the frog’s colours mainly warn predators, and the stick insect and the hare are camouflaged. Bright doesn’t always mean sexy.',
    },
    {
      kind: 'predict', gradeId: 'kauai', transfer: true,
      prompt: 'On Kauai, in Hawaii, a parasitic fly finds male field crickets by their song and deposits its larvae on them. Female crickets find their mates by that same song. What happened to the crickets?',
      parts: [{ id: 'what', label: '', answer: 'silent', choices: [
        { id: 'louder', label: 'Males evolved louder songs, to reach females before the flies reach them',
          feedback: 'A louder song would make males even easier for the flies to find. On Kauai the song itself had become the danger.' },
        { id: 'silent', label: 'Males that can’t sing spread, until most males on the island were silent' },
        { id: 'learned', label: 'Each male learned to sing only when flies were scarce',
          feedback: 'Nothing was learned. The change was in the males’ wings, inherited as a single sex-linked mutation.' },
        { id: 'stuck', label: 'Nothing changed: a male that can’t sing can’t mate, so silence couldn’t spread',
          feedback: 'Silent males still find mates. They seem to manage by moving toward the few males still singing and settling close by, where females drawn to the song arrive.' },
      ] }],
      explain: 'A mutation called flatwing leaves a male’s wings unable to make sound. On Kauai it spread to more than 90% of males in fewer than 20 generations: here the cost outweighed the pull of the song. Flatwing males partly make up for it by moving toward the remaining singers and settling close to them.',
    },
    {
      kind: 'payoff',
      idea: 'A trait can spread because it wins mates, even when it makes staying alive harder. Fitness is counted in offspring, not years.',
      connections: [
        { title: 'Be the bird: natural selection at work', place: 'Life › Evolution › Natural selection' },
        { title: 'The bacteria that walked through poison', place: 'Life › Evolution › Evolution now', to: 'evolution-e10' },
        { title: 'The coin-flip population: when chance alone decides', place: 'Life › Evolution › Drift' },
        { title: 'Costly signals: why a cheap boast convinces no one', place: 'Economics › Decision Theory' },
      ],
    },
  ],
  provenance: [
    { claim: 'Long-tailed widowbird males: 6–8 of 12 tail feathers about half a metre long; unable to fly in wet weather', source: 'Wikipedia: Long-tailed widowbird' },
    { claim: 'Andersson’s experiment: 36 males in nine groups of four matched for territory quality and tail length; one tail cut to about 14 cm, its feathers glued on to lengthen another by 20–30 cm; one cut and repaired; one unchanged; new nests counted; elongated males had higher mating success than normal or shortened males; shortened males kept displaying and kept territories; males colour-ringed', source: 'Wikipedia: Long-tailed widowbird; Andersson 1982, Nature 299:818, doi:10.1038/299818a0 (abstract)' },
    { claim: 'Shortened and normal (unmanipulated) males gained the same number of new nests (four each)', source: 'Baker & Parker 1983, Nature 302:456, doi:10.1038/302456a0, and Andersson’s reply (counts not disputed)' },
    { claim: 'Study site in Kenya (highland plateau)', source: 'Ehrlich, Dobkin & Wheye 1988, Stanford Birds essay "Sexual Selection"; Sridhar 2017 interview with Andersson (basis: secondary)' },
    { claim: 'Females attracted to tails longer than those that naturally occur', source: 'Wikipedia: Sexual selection' },
    { claim: 'Darwin’s sexual-selection passages (verbatim, elisions marked); pied peacock "eminently attractive to all his hen birds"', source: 'Darwin, On the Origin of Species, 1st ed. 1859, ch. IV, Sexual Selection, paragraphs 1–2; Project Gutenberg #1228' },
    { claim: 'Peacock displaying in Yala National Park, Sri Lanka; stabilised, audio removed', source: 'Wikimedia Commons: File:Peacock displaying in Sri Lanka.webm (CC BY 2.0, Ankur P)' },
    { claim: 'Brighter male guppies attract more females but are more noticeable to predators; females prefer bright males, especially with orange spots; Crenicichla and Anablepsoides hartii among wild predators', source: 'Wikipedia: Guppy' },
    { claim: 'Waterfalls stop the pike cichlid; guppies and a killifish live above them; greenhouse ponds at Princeton with pike cichlids, Rivulus or no predator; cichlid-pond males drab and the rest bright within about ten generations', source: 'Weiner, The Beak of the Finch (1994), guppy chapter; Raven et al., Biology, ch. 20 "Evolution in action" (basis: secondary; Endler 1980, Evolution 34:76, doi:10.2307/2408316)' },
    { claim: '1976 transfer of about two hundred guppies to a stream above a waterfall with only a killifish, a weak predator mainly of young guppies; about 15 generations later, males had more and bigger spots', source: 'Broder et al. 2016 case study; Weiner 1994; Raven et al. (basis: secondary)' },
    { claim: 'Complex túngara calls attract more females but make males easier for fringe-lipped bats to detect', source: 'Wikipedia: Túngara frog' },
    { claim: 'Fitness is expected reproductive success, not survival or life-span', source: 'Wikipedia: Fitness (biology)' },
    { claim: 'Spencer coined "survival of the fittest" in Principles of Biology (1864); Darwin used it in the 5th edition of Origin (1869)', source: 'Wikipedia: Survival of the fittest' },
    { claim: 'Red deer stags compete and clash antlers in the rut; female stalk-eyed flies prefer longer eyestalks; bowerbird males decorate structures to attract a mate; poison dart frogs’ colours warn predators; stick insects and snowshoe hares are camouflaged', source: 'Wikipedia: Red deer; Stalk-eyed fly; Bowerbird; Poison dart frog; Phasmatodea; Snowshoe hare' },
    { claim: 'Kauai: Ormia ochracea finds male Teleogryllus oceanicus by song; flatwing mutation, a single sex-linked allele, silent males; over 90% of males in under 20 generations; in playback tests flatwing males moved toward calling song and settled closer, supporting a satellite strategy', source: 'Zuk, Rotenberry & Tinghitella 2006, Biol. Lett. 2:521, doi:10.1098/rsbl.2006.0539; Wikipedia: Teleogryllus oceanicus; Ormia ochracea' },
    { claim: 'Images and film: widowbird in flight (CC BY 2.0), perched widowbird (PD), peacock film (CC BY 2.0), Venita Falls (CC0), guppies (CC BY 4.0), Morin waterfall (PD)', source: 'Wikimedia Commons file pages, licences checked through the Commons API on 2026-10-16' },
  ],
};
