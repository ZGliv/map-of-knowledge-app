import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const thumb = (path: string, width: number) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${path.split('/').pop()}`;
const TIK = 'Tiktaalik_roseae_%28fish_to_amphibian_transitional_fossil%29_%28Fram_Formation%2C_Upper_Devonian%3B_Ellesmere_Island%2C_Arctic_Canada%29_2_%2849755646886%29.jpg';

// E12 "How we found out". Arc: how we found out (never rivalry). Darwin's words are verbatim
// from Project Gutenberg #1228 (On the Origin of Species, 1st edition, 1859) and from page 198
// of the 1862 first edition of his orchid book (Internet Archive scan B-001-002-946).
// The Tiktaalik story rests on three independent sources: Wikipedia, the NSF press release of
// 5 April 2006 (US government, public domain) and the University of Chicago release.
// The plan's religion row (#30) is not taught here; this pack keeps to how the theory is tested.
export const evolutionE12: Pack = {
  id: 'evolution-e12',
  title: 'How we found out',
  question: 'What would it take to prove evolution wrong?',
  path: ['Life', 'Evolution', 'How we know'],
  hue: 130,
  minutes: 9,
  media: {
    darwin: {
      src: thumb('3/33/Charles_Darwin_by_Julia_Margaret_Cameron%2C_c._1868.jpg', 1920),
      alt: 'Charles Darwin in later life, white-bearded, in a dark coat, photographed in soft light',
      credit: 'Julia Margaret Cameron, c. 1868 (Art Institute of Chicago; restored by Adam Cuerden) · Public domain',
      page: commons('Charles_Darwin_by_Julia_Margaret_Cameron,_c._1868.jpg'), date: 'c. 1868', license: 'Public domain',
    },
    ellesmere: {
      src: thumb('d/df/Ellesmere_Island%2C_Canada_%28ASTER%29.jpg', 1920),
      alt: 'Satellite view of Ellesmere Island: ice fields and glaciers threading between bare brown ridges',
      credit: 'NASA/METI/AIST/Japan Space Systems and the U.S./Japan ASTER Science Team, 2000 · Public domain',
      page: commons('Ellesmere_Island,_Canada_(ASTER).jpg'), date: '2000', license: 'Public domain',
    },
    tiktaalik: {
      src: thumb(`3/32/${TIK}`, 1920),
      alt: 'A cast of the Tiktaalik fossil: a flat, crocodile-like head and the front of the body, scaly and pale against a dark base',
      credit: 'James St. John, cast at the Field Museum, Chicago · CC BY 2.0 · cropped',
      page: commons('Tiktaalik_roseae_(fish_to_amphibian_transitional_fossil)_(Fram_Formation,_Upper_Devonian;_Ellesmere_Island,_Arctic_Canada)_2_(49755646886).jpg'),
      date: '2010', license: 'CC BY 2.0',
    },
    restoration: {
      src: thumb('2/2b/Tiktaalik_roseae_life_restor.jpg', 1280),
      alt: 'Artist’s reconstruction of Tiktaalik, a flat-headed fish propping itself up on its front fins at the water’s edge',
      credit: 'Reconstruction by Zina Deretsky, National Science Foundation · Public domain',
      page: commons('Tiktaalik_roseae_life_restor.jpg'), date: '2006', license: 'Public domain',
    },
    orchid: {
      src: thumb('3/3c/Angraecum_sesquipedale_%2814877836163%29.jpg', 1280),
      alt: 'White star-shaped orchid flowers, each trailing a long green tube, the spur, hanging below it',
      credit: 'Wilferd Duckitt · CC BY 2.0', page: commons('Angraecum_sesquipedale_(14877836163).jpg'), date: '2014', license: 'CC BY 2.0',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'darwin', title: 'How we found out',
      hook: 'In 1859 Darwin wrote down what would prove him wrong. People have been checking ever since.',
      focus: [50, 30],
    },
    {
      kind: 'predict', gradeId: 'theory-meaning',
      prompt: '“Evolution is just a theory.” When scientists call something a theory, what do they mean?',
      parts: [{ id: 'means', label: '', answer: 'tested', choices: [
        { id: 'hunch', label: 'A hunch nobody has proved yet',
          feedback: 'That’s the everyday sense of the word. In science, a theory usually means an explanation that has already been tested and is widely accepted.' },
        { id: 'law', label: 'An idea that becomes a law once there is enough evidence',
          feedback: 'A common mix-up. Theories never graduate into laws, however much evidence piles up. A law describes how nature behaves; a theory explains why.' },
        { id: 'tested', label: 'A well-tested explanation that ties many facts together' },
        { id: 'opinion', label: 'What most scientists happen to believe',
          feedback: 'Scientists argue all the time about how evolution works in particular cases. That it happened, and still happens, is undisputed among them.' },
      ] }],
      explain: 'The US National Academy of Sciences defines a theory as “a well-substantiated explanation of some aspect of the natural world that can incorporate facts, laws, inferences, and tested hypotheses.” Germ theory, cell theory and the theory of evolution all use the word in that sense.',
    },
    {
      kind: 'source', gradeId: 'break-down',
      source: { title: 'On the Origin of Species (1859)', detail: 'Charles Darwin · 1st edition, chapter VI, “Organs of extreme perfection and complication”, paragraphs 1 and 6', page: 'https://www.gutenberg.org/ebooks/1228' },
      passage: [
        'To suppose that the eye, with all its inimitable contrivances for adjusting the focus to different distances, for admitting different amounts of light, and for the correction of spherical and chromatic aberration, could have been formed by natural selection, seems, I freely confess, [[absurd in the highest possible degree|absurd]].',
        'Yet reason tells me, that if [[numerous gradations from a perfect and complex eye to one very imperfect and simple, each grade being useful to its possessor|grades]], can be shown to exist; if further, the eye does vary ever so slightly, and the variations be inherited, which is certainly the case; and if any variation or modification in the organ be ever useful to an animal under changing conditions of life, then the difficulty of believing that a perfect and complex eye could be formed by natural selection, though insuperable by our imagination, can hardly be considered real. …',
        '[[If it could be demonstrated that any complex organ existed, which could not possibly have been formed by numerous, successive, slight modifications, my theory would absolutely break down.|test]] But I can find out no such case.',
      ],
      notes: {
        absurd: 'Stop here and Darwin seems to give up. He’s stating the objection at full strength so he can answer it.',
        grades: 'Living animals show many of the steps: light-sensitive eyespots, cup-shaped pit eyes in some snails, the pinhole eye of the nautilus, camera eyes like ours.',
        test: 'Here he names the finding that would sink his theory: one complex organ that could not be built in small, useful steps.',
      },
      question: {
        prompt: 'What makes Darwin’s claim here a scientific one?',
        choices: [
          { id: 'sure', label: 'He is completely sure he is right' },
          { id: 'eye', label: 'He explains how every part of the eye works' },
          { id: 'risk', label: 'He says what finding would prove him wrong' },
          { id: 'famous', label: 'He was a respected naturalist' },
        ],
        answer: 'risk',
      },
    },
    {
      kind: 'sim', sim: 'nestTest', title: 'Groups inside groups',
      goal: 'Switch on each shared trait and watch where its group lands.',
      params: {
        taxa: [
          { id: 'shark', label: 'Shark', traits: ['backbone'] },
          { id: 'salmon', label: 'Salmon', traits: ['backbone'] },
          { id: 'frog', label: 'Frog', traits: ['backbone', 'limbs'] },
          { id: 'lizard', label: 'Lizard', traits: ['backbone', 'limbs', 'amnion'] },
          { id: 'crocodile', label: 'Crocodile', traits: ['backbone', 'limbs', 'amnion'] },
          { id: 'pigeon', label: 'Pigeon', traits: ['backbone', 'limbs', 'amnion', 'feathers'] },
          { id: 'mouse', label: 'Mouse', traits: ['backbone', 'limbs', 'amnion', 'hair'] },
          { id: 'human', label: 'Human', traits: ['backbone', 'limbs', 'amnion', 'hair'] },
        ],
        traits: [
          { id: 'backbone', label: 'Backbone' },
          { id: 'limbs', label: 'Four limbs' },
          { id: 'amnion', label: 'Amniotic sac' },
          { id: 'feathers', label: 'Feathers' },
          { id: 'hair', label: 'Hair and milk glands' },
        ],
        allOn: 'Every group sits inside a bigger one. None straddles two.',
        candidates: [
          { id: 'feathered-mammal', short: 'Feathered mammal', label: 'A furry animal with feathers that feeds its young milk', traits: ['backbone', 'limbs', 'amnion', 'feathers', 'hair'], verdict: 'Nowhere to put it. Feathers and hair would overlap, with neither group inside the other.' },
          { id: 'lungfish', short: 'Air-breathing fish', label: 'A fish that breathes air', traits: ['backbone'], verdict: 'It fits, in the backbone-only group with the fish.' },
          { id: 'bat', short: 'Flying mammal', label: 'A mammal that flies', traits: ['backbone', 'limbs', 'amnion', 'hair'], verdict: 'It fits, among the mammals.' },
          { id: 'newt', short: 'Four legs, eggs in water', label: 'A four-legged animal that lays its eggs in water', traits: ['backbone', 'limbs'], verdict: 'It fits, beside the frog.' },
        ],
        questions: [{
          gradeId: 'nest-break', prompt: 'A fossil hunter reports four finds. Which would break the pattern?',
          choices: [
            { id: 'lungfish', label: 'A fish that breathes air' },
            { id: 'bat', label: 'A mammal that flies' },
            { id: 'feathered-mammal', label: 'A furry animal with feathers that feeds its young milk' },
            { id: 'newt', label: 'A four-legged animal that lays its eggs in water' },
          ],
          answer: 'feathered-mammal',
          explain: 'Common descent predicts groups inside groups, and that rules things out. A furry, milk-feeding animal with feathers would have to sit inside the feathered group (birds and their dinosaur relatives) and the mammals’ group at once, and those groups don’t overlap. Among living animals, only birds have feathers and only mammals have true hair. Darwin called the pattern “groups subordinate to groups”.',
        }],
        credit: 'Traits: Wikipedia’s articles on vertebrates, tetrapods, amniotes, mammals and feathers. Birds’ wings are forelimbs, so a pigeon has four limbs.',
      },
      grades: [{ gradeId: 'nest-break' }],
    },
    {
      kind: 'documentary', title: 'Where to dig',
      frames: [
        { media: 'ellesmere', x: 45, y: 45, zoom: 1.05, seconds: 8, text: 'Before 2004, the oldest four-legged animals with necks came from rock about 365 million years old. Rock older than about 385 million years held fish but no four-legged animals.' },
        { media: 'ellesmere', x: 55, y: 55, zoom: 1.35, seconds: 8, text: 'So an in-between form should lie in rock around 375 million years old. Rock of that age, laid down by ancient rivers, lies exposed on Ellesmere Island, far above the Arctic Circle.' },
        { media: 'tiktaalik', x: 30, y: 50, zoom: 1.05, seconds: 7, text: 'A team led by Edward Daeschler, Neil Shubin and Farish Jenkins explored the island over four summers. In 2004 they found it.' },
        { media: 'tiktaalik', x: 24, y: 45, zoom: 1.5, seconds: 8, text: 'A fish with a neck, wrist bones in its front fins, and notches on its head that may have held spiracles: a hint of simple lungs as well as gills.' },
        { media: 'restoration', x: 30, y: 55, zoom: 1.08, seconds: 8, text: 'The Nunavut Elders Council suggested its name, Tiktaalik, and the team published it in 2006. The fish had turned up in the rock the prediction pointed to.' },
        { media: 'restoration', x: 70, y: 45, zoom: 1.3, seconds: 9, text: 'In 2010, tracks in Poland at least 10 million years older hinted that four-legged walkers came earlier still. A 2015 re-study argued they may be fish nests; most researchers still accept them as tracks.' },
      ],
    },
    {
      kind: 'flaw', gradeId: 'test-the-past',
      prompt: '“Nobody watched evolution happen over millions of years, so it can’t be tested.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Most of evolution’s story happened in the deep past.' },
        { id: 'b', text: 'Nobody was there to watch it.' },
        { id: 'c', text: 'A claim can only be tested by watching it happen.' },
        { id: 'd', text: 'So evolution can’t be tested.' },
      ],
      answer: 'c',
      explain: 'Testing doesn’t need an eyewitness. An explanation of the past predicts evidence nobody has seen yet: which rock a fossil will lie in, how traits will group, what DNA will show. Then someone looks. Tiktaalik turned up in rock of the predicted age.',
    },
    {
      kind: 'predict', gradeId: 'moth', transfer: true, media: 'orchid',
      prompt: 'In 1862 an English grower sent Darwin flowers of this orchid, which grows wild only in Madagascar. Their nectar sat at the bottom of spurs eleven and a half inches long, with only the last inch and a half filled. What did he predict?',
      parts: [{ id: 'predict', label: '', answer: 'moth', choices: [
        { id: 'self', label: 'The orchid pollinates itself, so it needs no visitor',
          feedback: 'His book was about how orchids get insects to carry their pollen.' },
        { id: 'moth', label: 'Madagascar must have a moth with a tongue about ten to eleven inches long' },
        { id: 'useless', label: 'The spur is a useless leftover with no job',
          feedback: 'He bet the opposite: a spur that long makes sense only if some animal can reach the bottom.' },
        { id: 'wind', label: 'The wind must carry its pollen',
          feedback: 'A flower pollinated by wind has no reason to make nectar, which pays animals to visit.' },
      ] }],
      explain: 'His words: “in Madagascar there must be moths with probosces capable of extension to a length of between ten and eleven inches!” Alfred Russel Wallace backed the idea in 1867. In 1903 Walter Rothschild and Karl Jordan described a Madagascan hawk moth whose tongue can reach about 11 inches, and named it praedicta in honour of Wallace’s forecast. That was 21 years after Darwin’s death.',
    },
    {
      kind: 'match', gradeId: 'fits-or-clashes', transfer: true, buckets: true,
      prompt: 'Six reports come in. Sort each one: does it fit what evolution predicts, or clash with it?',
      left: [
        { id: 'rabbit', label: 'A rabbit fossil in rock 600 million years old' },
        { id: 'whale', label: 'A fossil whale with small hind legs' },
        { id: 'dna', label: 'For most of our DNA, our closest relative is the chimpanzee, not the gorilla' },
        { id: 'bird', label: 'A bird fossil older than any fish fossil' },
        { id: 'platypus', label: 'A furry mammal that lays eggs' },
        { id: 'germs', label: 'Bacteria in a lab evolve resistance to a new drug' },
      ],
      right: [{ id: 'fits', label: 'Fits' }, { id: 'clashes', label: 'Clashes' }],
      pairs: { rabbit: 'clashes', whale: 'fits', dna: 'fits', bird: 'clashes', platypus: 'fits', germs: 'fits' },
      explain: 'The rabbit and the early bird would put an animal before its ancestors’ kind. Mammals appear about 225 million years ago, genuine rabbits only after 56 million, and the Precambrian ended 538.8 million years ago. Asked what would destroy his confidence in evolution, J. B. S. Haldane is reported to have said “fossil rabbits in the Precambrian”. Even a genuine find probably wouldn’t topple everything at once, but it would mean something serious was wrong. The other four are all real: Basilosaurus had tiny hind legs, the platypus lays eggs, and labs watch bacteria evolve.',
    },
    {
      kind: 'payoff',
      idea: 'Evolution is a theory in the scientific sense: a tested explanation that says what we should find, and what we never should.',
      connections: [
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'The salamander ring', place: 'Life › Evolution › New species', to: 'evolution-e05' },
        { title: 'Earth’s history in one day', place: 'Life › Evolution › Deep time' },
        { title: 'Falsifiability: what a scientific claim must risk', place: 'Humanities › Philosophy' },
      ],
    },
  ],
  provenance: [
    { claim: 'A scientific theory is "a well-substantiated explanation of some aspect of the natural world that can incorporate facts, laws, inferences, and tested hypotheses." (US National Academy of Sciences 1999)', source: 'Wikipedia: Evolution as fact and theory (quoting NAS, Science and Creationism, 2nd ed., 1999, p. 2)' },
    { claim: 'Everyday "theory" means a speculative guess; scientific theory means an explanation already tested and widely accepted; theories do not graduate into laws; laws describe, theories explain', source: 'Wikipedia: Scientific theory' },
    { claim: 'Germ theory and cell theory use "theory" in the same sense as the theory of evolution', source: 'Wikipedia: Evolution as fact and theory' },
    { claim: 'Scientists argue about particular mechanisms; that evolution occurred and is occurring is undisputed', source: 'Wikipedia: Evolution as fact and theory' },
    { claim: 'Darwin’s eye passage and "my theory would absolutely break down" (verbatim, elision marked)', source: 'Darwin, On the Origin of Species, 1st ed. 1859, ch. VI, section "Organs of extreme perfection and complication", paragraphs 1 and 6; Project Gutenberg #1228' },
    { claim: 'Eyespots in nearly all major animal groups; pit eyes in some snails; pinhole eyes in the nautilus; camera eyes in vertebrates and octopuses', source: 'Wikipedia: Evolution of the eye' },
    { claim: 'Darwin: "groups subordinate to groups"', source: 'Darwin, On the Origin of Species, 1st ed., ch. XIII, paragraph 2; Project Gutenberg #1228' },
    { claim: 'Vertebrates have a vertebral column (sharks included); tetrapods are defined by four limbs, birds’ wings are forelimbs; amniotes have an amnion (not amphibians); only mammals have hair and milk-producing mammary glands; feathers distinguish living birds', source: 'Wikipedia: Vertebrate; Tetrapod; Bird; Amniote; Mammal; Feather' },
    { claim: 'Tiktaalik prediction: necked four-legged animals in rock no older than 365 Ma, only fish in rock over 385 Ma; 2004 expedition searched 375 Ma rock in Arctic Canada', source: 'Wikipedia: Evidence of common descent' },
    { claim: 'Found 2004 on Ellesmere Island, Nunavut, in the fluvial Fram Formation; Daeschler, Shubin and Jenkins; published in Nature, 6 April 2006; neck, two large wrist bones, spiracles suggesting primitive lungs as well as gills', source: 'Wikipedia: Tiktaalik; Daeschler, Shubin & Jenkins 2006, Nature 440:757, doi:10.1038/nature04639 (abstract)' },
    { claim: 'Rocks more than 375 million years old far above the Arctic Circle; collected during four summer explorations on Ellesmere Island; the Nunavut Elders Council suggested the name', source: 'National Science Foundation press release 06-055, 5 April 2006 (US government, public domain); University of Chicago Medicine news release, April 2006' },
    { claim: 'Zachełmie trackways (2010) at least 10 Myr older than the oldest elpistostegids; 2015 reanalysis suggests fish nests or feeding traces; a 2022 study found them largely accepted as tetrapod tracks', source: 'Niedźwiedzki et al. 2010, Nature 463:43 (PubMed 20054388); Wikipedia: Tiktaalik' },
    { claim: 'Darwin, 1862: nectaries eleven and a half inches long, lower inch and a half filled; "in Madagascar there must be moths with probosces capable of extension to a length of between ten and eleven inches!"', source: 'Darwin, On the Various Contrivances by which British and Foreign Orchids are Fertilised by Insects, 1st ed. 1862, pp. 197–198 (Internet Archive B-001-002-946)' },
    { claim: 'Darwin’s flowers came from the grower James Bateman; the orchid is endemic to Madagascar; Wallace supported the prediction in 1867; Rothschild and Jordan described the moth in 1903 and named it praedicta in honour of Wallace’s prediction; unverified for 21 years after Darwin’s death', source: 'Wikipedia: Xanthopan; Angraecum sesquipedale; Fertilisation of Orchids' },
    { claim: 'The moth’s proboscis varies from 15 to 28.5 cm (up to about 11 inches)', source: 'Natural History Museum, London, news, September 2021: moth predicted to exist by Darwin and Wallace becomes a new species' },
    { claim: 'Precambrian ends 538.8 Ma; first mammals about 225 Ma; genuine rabbit fossils from the Eocene (56–33.9 Ma); Haldane reportedly answered "fossil rabbits in the Precambrian"; a single such find would show serious errors rather than refute everything instantly', source: 'Wikipedia: Precambrian; Mammal; Precambrian rabbit' },
    { claim: 'Basilosaurids had two tiny but well-formed hind legs; for most DNA sequences humans and chimpanzees are most closely related; monotremes lay shelled eggs', source: 'Wikipedia: Evolution of cetaceans; Basilosaurus; Human evolutionary genetics; Amniote' },
    { claim: 'Bacteria evolve antibiotic resistance in the laboratory', source: 'Baym et al. 2016, Science 353:1147, doi:10.1126/science.aag0822' },
    { claim: 'Images: Darwin by Cameron (PD), Ellesmere ASTER (NASA, PD), Tiktaalik cast (CC BY 2.0), NSF restoration (PD), Angraecum sesquipedale (CC BY 2.0)', source: 'Wikimedia Commons file pages, licences checked through the Commons API on 2026-10-16' },
  ],
};
