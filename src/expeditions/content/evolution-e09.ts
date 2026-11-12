import type { Pack } from './types';

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const thumb = (path: string, width: number) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${path.split('/').pop()}`;

// E09 "The long walk out of Africa". Arc: myth-buster. Written to the plan's sensitive-
// content rules (§9.5): genetic ancestry is real and varies gradually; races are not
// discrete biological categories; Huxley's frontispiece appears only as the exhibit for
// the "ladder of progress" myth.
//
// Split dates in the rewind come from one analysis, Yoo et al. 2025 (complete ape genomes,
// Nature, CC BY 4.0), so the order of splits can't be scrambled by mixing studies. Gibbons
// are left out because that paper gives no gibbon date.

// Sites of our species, read from each site's Wikipedia infobox. `when` is thousands of
// years ago. Lines show who reached where; they are not routes anyone has traced, and
// every line starts in Africa so none implies one site's people descend from another's.
const places = [
  { id: 'irhoud', name: 'Jebel Irhoud', lat: 31.855, lon: -8.873, when: 315, label: 'oldest fossils' },
  { id: 'omo', name: 'Omo Kibish', lat: 4.8, lon: 35.967, when: 233, label: 'an early skull', labelSide: 'left' },
  { id: 'misliya', name: 'Misliya Cave', lat: 32.741, lon: 34.972, when: 185, label: 'an early crossing', from: 'omo', via: 'land' },
  { id: 'madjedbebe', name: 'Madjedbebe', lat: -12.5, lon: 132.883, when: 50, label: 'Australia', from: 'omo', via: 'sea', path: [[12, 45], [20, 72], [8, 98], [-8, 116]] },
  { id: 'bachokiro', name: 'Bacho Kiro', lat: 42.947, lon: 25.43, when: 46, label: 'Europe', from: 'omo', via: 'land', path: [[31, 35]], labelSide: 'left' },
  { id: 'tianyuan', name: 'Tianyuan Cave', lat: 39.658, lon: 115.871, when: 40, label: 'East Asia', from: 'omo', via: 'land', path: [[12, 45], [20, 72], [22, 96], [30, 110]] },
  { id: 'monteverde', name: 'Monte Verde', lat: -41.505, lon: -73.204, when: 14.5, label: 'South America', from: 'omo', via: 'land', path: [[31, 35], [45, 90], [60, 140], [65, -168], [55, -132], [20, -102], [2, -79]], labelSide: 'left' },
];

const story = [
  { when: 315, text: 'Jebel Irhoud, Morocco: the oldest known fossils of our species, from about 315,000 years ago.' },
  { when: 233, text: 'Omo Kibish, Ethiopia: a skull of our species at least 233,000 years old.' },
  { when: 185, text: 'Misliya Cave, Israel: a jaw from 177,000 to 194,000 years ago. Groups crossed into Asia more than once.' },
  { when: 120, text: 'Our species is about 300,000 years old. The wave that people outside Africa mainly descend from had not yet set out.' },
  { when: 60, text: 'People living outside Africa today descend mainly from groups that left between about 70,000 and 50,000 years ago.' },
  { when: 50, text: 'Australia, at least 50,000 years ago, reached by land bridges and sea crossings between islands.' },
  { when: 46, text: 'Bacho Kiro Cave, Bulgaria: remains of our species about 46,000 years old.' },
  { when: 40, text: 'Tianyuan Cave, near Beijing: bones of someone who lived 42,000 to 39,000 years ago.' },
  { when: 14.5, text: 'Monte Verde, southern Chile: people deep in South America by about 14,500 years ago, a date most but not all experts accept.' },
];

export const evolutionE09: Pack = {
  id: 'evolution-e09',
  title: 'The long walk out of Africa',
  question: 'If we came from chimpanzees, why are there still chimpanzees?',
  path: ['Life', 'Evolution', 'Human evolution'],
  hue: 130,
  minutes: 9,
  media: {
    chimp: {
      src: thumb('1/1d/Chimpanzee_Portrait.jpg', 1920),
      alt: 'Close-up of an adult chimpanzee’s face, looking straight at the camera',
      credit: 'Charles Patrick Ewing, Save the Chimps sanctuary · CC BY 2.0 · cropped', page: commons('Chimpanzee_Portrait.jpg'), date: '2016', license: 'CC BY 2.0',
    },
    huxley: {
      src: thumb("6/68/Frontispiece_to_Huxley_%27Evidence_as_to_man%27s_place...%27_Wellcome_L0063032.jpg", 1920),
      alt: 'Five skeletons drawn in a row, left to right: gibbon, orangutan, chimpanzee, gorilla and man',
      credit: 'Frontispiece to T. H. Huxley, Evidence as to Man’s Place in Nature, 1863, drawn by B. Waterhouse Hawkins · Wellcome Collection · CC BY 4.0',
      page: commons("Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg"), date: '1863', license: 'CC BY 4.0',
    },
    wolf: {
      src: thumb('e/e2/Wolf_%2850088111867%29.jpg', 1280),
      alt: 'A grey wolf standing in snow among pine trees, looking at the camera',
      credit: 'Jim Peaco, Yellowstone National Park (NPS) · Public domain', page: commons('Wolf_(50088111867).jpg'), date: '2020', license: 'Public domain',
    },
  },
  beats: [
    {
      kind: 'cover', media: 'chimp', title: 'The long walk out of Africa',
      hook: '“If we came from chimpanzees, why are there still chimpanzees?” It’s a fair question. The answer is that we didn’t, and the real story starts in Africa.',
      focus: [50, 38],
      note: 'Touches on race and human ancestry.',
    },
    {
      kind: 'sim', sim: 'lineageRewind', title: 'Wind the clock back',
      goal: 'Five kinds of great ape, humans among them. Their lines run back into the past until they meet.',
      params: {
        tree: {
          tips: [
            { id: 'human', label: 'Humans' }, { id: 'chimp', label: 'Chimpanzees' }, { id: 'bonobo', label: 'Bonobos' },
            { id: 'gorilla', label: 'Gorillas' }, { id: 'orangutan', label: 'Orangutans' },
          ],
          splits: [
            { id: 'pan', children: ['chimp', 'bonobo'], about: 1.7, range: [1, 2] },
            { id: 'hominini', children: ['human', 'pan'], about: 6, range: [5.5, 6.3] },
            { id: 'homininae', children: ['hominini', 'gorilla'], about: 10.7, range: [10.6, 10.9] },
            { id: 'hominidae', children: ['homininae', 'orangutan'], about: 18.9, range: [18.2, 19.6] },
          ],
        },
        max: 20, ticks: [0, 5, 10, 15, 20], unit: 'million years ago',
        focus: { pair: ['human', 'chimp'], label: 'Last shared ancestor' },
        questions: [
          {
            gradeId: 'join', prompt: 'Wind back until our line meets the chimpanzees’. What lived at the join?',
            choices: [{ id: 'chimp', label: 'A chimpanzee' }, { id: 'neither', label: 'An ape that was neither a chimpanzee nor a human' }, { id: 'human', label: 'An early human' }],
            answer: 'neither',
            explain: 'Neither. Our line and the chimpanzees’ meet at an ancestor of both, and both lines changed after the split. We share a great-great-…-grandparent with chimpanzees; we didn’t descend from them.',
          },
          {
            gradeId: 'longer', prompt: 'Since that ancestor, whose line has been evolving longer?',
            choices: [{ id: 'ours', label: 'Ours' }, { id: 'theirs', label: 'The chimpanzees’' }, { id: 'same', label: 'Exactly as long' }],
            answer: 'same',
            explain: 'Exactly as long: about 6 million years each, by the newest genome estimate. Chimpanzees aren’t a stage we passed through. They’re a branch that kept going, just as ours did. That’s why there are still chimpanzees.',
          },
        ],
        credit: 'Split dates: Yoo et al. 2025, from complete ape genomes; shaded bars show each estimate’s range. Other studies give different dates for every split; for humans and chimpanzees, anywhere from 5 to 13 million years ago.',
      },
      grades: [{ gradeId: 'join' }, { gradeId: 'longer' }],
    },
    {
      kind: 'predict', gradeId: 'ladder', media: 'huxley',
      prompt: 'Thomas Huxley published this line-up in 1863 to show how alike the bodies of apes and humans are. Read left to right, it looks like a ladder climbing to us. What’s wrong with reading it that way?',
      parts: [{ id: 'wrong', label: '', answer: 'cousins', choices: [
        { id: 'order', label: 'The order is off: chimpanzees should stand last, just before us',
          feedback: 'No order fixes it. Chimpanzees are our closest living relatives, but no living ape is a step on the way to us.' },
        { id: 'cousins', label: 'All five are living species: cousins side by side, not steps' },
        { id: 'gorilla', label: 'Nothing: gorillas really did turn into humans',
          feedback: 'Gorillas are cousins too. Their line split off before ours and the chimpanzees’ did, and it has been evolving ever since.' },
        { id: 'top', label: 'Nothing: evolution climbs from simple to advanced, with humans at the top',
          feedback: 'Evolution branches; it has no top. Every species alive today sits at the tip of a branch just as long as ours.' },
      ] }],
      explain: 'Huxley had the row drawn to compare skeletons. Read left to right, it became an unintended shorthand for evolution as a march toward us. The family tree says otherwise: all five sit at the tips, living species with ancestors in common.',
    },
    {
      kind: 'source', gradeId: 'africa-clue',
      source: { title: 'The Descent of Man', detail: 'Charles Darwin · 2nd edition, 1874, chapter VI, section “On the birthplace and antiquity of man”', page: 'https://www.gutenberg.org/ebooks/2300' },
      passage: [
        'We are naturally led to enquire, where was the birthplace of man at that stage of descent when our progenitors diverged from the Catarrhine stock? … [[In each great region of the world the living mammals are closely related to the extinct species of the same region.|region]]',
        'It is therefore probable that Africa was formerly inhabited by extinct apes closely allied to the gorilla and chimpanzee; and as [[these two species are now man’s nearest allies|allies]], it is somewhat more probable that [[our early progenitors lived on the African continent than elsewhere|africa]].',
        '[[But it is useless to speculate on this subject|hedge]]; for two or three anthropomorphous apes, … existed in Europe during the Miocene age; and since so remote a period the earth has certainly undergone many great revolutions, and there has been ample time for migration on the largest scale.',
      ],
      notes: {
        region: 'The rule Darwin leans on: a region’s living mammals are closely related to the extinct ones buried there.',
        allies: 'Complete ape genomes bear him out: chimpanzees and bonobos are our closest living relatives, then gorillas.',
        africa: 'Notice what he reasons from: living apes and that rule, not bones. In 1925 Raymond Dart described the Taung child, found in South Africa: the first fossil evidence that humanity began in Africa.',
        hedge: 'Then he hedges. Fossil apes had been found in Europe, and over such long spans animals could migrate far, so the evidence he had pointed both ways.',
      },
      question: {
        prompt: 'What was Darwin’s case for Africa built on?',
        choices: [
          { id: 'bones', label: 'Ancient human bones dug up in Africa' },
          { id: 'living', label: 'Where our closest living relatives live, and where their extinct kin should lie' },
          { id: 'tools', label: 'The oldest stone tools' },
          { id: 'climate', label: 'Africa’s warm climate' },
        ],
        answer: 'living',
      },
    },
    {
      kind: 'sim', sim: 'spreadMap', title: 'Out of Africa',
      goal: 'From the oldest fossils of our species to southern Chile.',
      params: {
        mode: 'play', places, story, region: 'the world', labels: 'fresh', freshText: 'label', labelFlip: true,
        size: [1000, 560],
        projection: { type: 'equirectangular', center: [150, 0], bbox: [[-19, -50], [-34, 70]] },
        time: { unit: 'kyr', start: 320, end: 10, step: 5, freshFor: 25 },
        legend: [{ via: 'sea', label: 'needed sea crossings' }],
        question: {
          ask: 'Genetic variety is greatest in Africa and falls with distance from it. Which statement fits the genetic data?',
          choices: [
            { id: 'gradual', label: 'Variety shades gradually from place to place, and most of it is found within local populations' },
            { id: 'races', label: 'Humans fall into a few sharply separate genetic races' },
            { id: 'blank', label: 'DNA can’t tell anything about where someone’s ancestors lived' },
            { id: 'between', label: 'Most genetic differences lie between continents, not within populations' },
          ],
          answer: 'gradual',
          explain: 'Each group that moved on carried only part of the variety with it, so diversity drops the farther a people’s ancestors travelled from Africa. The change is gradual, with no sharp borders: about 85% of human genetic variation lies within local populations. DNA can still show where someone’s ancestors probably lived. What it doesn’t show are discrete races, and the US National Academies advise researchers not to use race as a stand-in for genetic variation.',
        },
        credit: 'Ages: each site’s Wikipedia article. Australia may have been reached as early as 65,000 years ago, a date some experts question. Lines show who reached where, not exact routes. Coastlines: Natural Earth.',
      },
      grades: [{ gradeId: 'diversity' }],
    },
    {
      kind: 'flaw', gradeId: 'missing-link',
      prompt: '“Where’s the missing link? Until someone finds it, human evolution has a hole in the middle.” Which step breaks?',
      steps: [
        { id: 'a', text: 'Humans evolved from earlier apes.' },
        { id: 'b', text: 'So there must be one missing link: a single creature, half ape and half human.' },
        { id: 'c', text: 'Nobody has found that one creature.' },
        { id: 'd', text: 'So the story has a hole in the middle.' },
      ],
      answer: 'b',
      explain: 'Evolution branches; it doesn’t run along a single chain with one gap in it. That’s why anthropologists avoid “missing link” and speak of last common ancestors and transitional fossils. What exists instead is a crowd of fossil relatives. Lucy, from Ethiopia, walked upright 3.2 million years ago yet had a small, ape-like skull. The Taung child turned up in South Africa in 1924.',
    },
    {
      kind: 'predict', gradeId: 'wolves', transfer: true, media: 'wolf',
      prompt: 'Genetic studies find that the grey wolf is the dog’s closest living relative. Are today’s grey wolves the ancestors of dogs?',
      parts: [{ id: 'which', label: '', answer: 'cousins', choices: [
        { id: 'ancestors', label: 'Yes. Some of today’s wolves turned into dogs.',
          feedback: 'Today’s wolves are living relatives, not ancestors. Dogs come from an ancient wolf population, or populations, distinct from the modern wolf lineage and now extinct.' },
        { id: 'cousins', label: 'No. Dogs and today’s wolves both descend from an older wolf population that has since died out.' },
        { id: 'unrelated', label: 'No. Dogs and wolves aren’t related at all.',
          feedback: 'They’re close relatives: the grey wolf is the dog’s nearest living relative.' },
        { id: 'stopped', label: 'Yes, and wolves stopped evolving once dogs split off.',
          feedback: 'Wolves kept evolving too, for exactly as long as dogs have.' },
      ] }],
      explain: 'Same shape as us and chimpanzees: two living cousins, and an ancestor that was neither of them: a wolf population that no longer exists. Genetic estimates put the split between about 20,000 and 40,000 years ago.',
    },
    {
      kind: 'number', gradeId: 'apart', transfer: true, generator: 'apartTime',
      params: {
        prompt: 'By the newest genome estimate, the lines leading to {a} and to {b} split about {split} million years ago.',
        ask: 'Add up the time both lines have spent evolving on their own since. How many million years is that?',
        cases: [
          { a: 'cats', b: 'dogs', split: 42, prompt: 'The oldest fossils of the group that holds both cats and dogs are about 42 million years old, so their lines had split by then. Take {split} million years as the split.' },
          { a: 'humans', b: 'chimpanzees', split: 6 },
        ],
        unit: 'million years', figureUnit: 'million years', tolerance: 0,
        hint: 'Neither line waited for the other. Each has been evolving for the whole {split} million years.',
      },
    },
    {
      kind: 'payoff',
      idea: 'Humans are apes. We share an ancestor with chimpanzees rather than descending from them, and our species began in Africa.',
      connections: [
        { title: 'Who’s your closest cousin? Reading the tree', place: 'Life › Evolution › Tree thinking' },
        { title: 'Four witnesses, one story', place: 'Life › Evolution › Evidence', to: 'evolution-e07' },
        { title: 'Your DNA: reading where your ancestors lived', place: 'Life › Genetics' },
        { title: 'Earth’s history in one day', place: 'Life › Evolution › Deep time' },
      ],
    },
  ],
  provenance: [
    { claim: 'Apes (Hominoidea) include humans; "ape" now means all hominoids including humans', source: 'Wikipedia: Ape (Hominoidea)' },
    { claim: 'Split dates: human–chimpanzee 5.5–6.3 Ma; African ape (gorilla) split 10.6–10.9 Ma; orangutan 18.2–19.6 Ma; bonobo–chimpanzee 1–2 Ma, about 1.7 Ma', source: 'Yoo et al. 2025, Complete sequencing of ape genomes, Nature 641, doi:10.1038/s41586-025-08816-3 (PMC12058530, CC BY 4.0)' },
    { claim: 'Human–chimpanzee divergence estimates vary widely, from 13 to 5 million years ago', source: 'Wikipedia: Chimpanzee–human last common ancestor' },
    { claim: 'Huxley 1863 frontispiece: skeletons of gibbon, orang, chimpanzee, gorilla, man, drawn by Waterhouse Hawkins; Huxley used comparative anatomy to argue a common ancestor', source: 'Huxley, Man’s Place in Nature (Gutenberg #2931, frontispiece caption); Wikipedia: Man’s Place in Nature' },
    { claim: 'The left-to-right sequence unintentionally became shorthand for evolution; March-of-Progress images criticised as wrongly implying evolution is progressive', source: 'Wikipedia: March of Progress (Predecessors; citing Tucker)' },
    { claim: 'Darwin’s birthplace-of-man passage (verbatim, with elisions marked)', source: 'Darwin, The Descent of Man, 2nd ed. 1874, ch. VI, first paragraph under "On the birthplace and antiquity of man"; Project Gutenberg #2300' },
    { claim: 'Taung child found 1924, described by Dart in Nature, 7 Feb 1925; the first evidence that humanity originated in Africa', source: 'Wikipedia: Taung Child' },
    { claim: 'Lucy: Australopithecus afarensis, found 1974 at Hadar, Ethiopia, about 3.2 million years old; small skull akin to non-hominin apes with a bipedal, upright gait', source: 'Wikipedia: Lucy (Australopithecus)' },
    { claim: 'Jebel Irhoud about 315,000 years (earliest known H. sapiens); Omo Kibish at least about 233,000; Misliya 177,000–194,000; coordinates', source: 'Wikipedia: Jebel Irhoud; Omo remains; Misliya Cave' },
    { claim: 'Non-Africans descend mainly from an expansion about 70,000–50,000 years ago; earlier dispersals occurred', source: 'Wikipedia: Recent African origin of modern humans' },
    { claim: 'Monte Verde, near Puerto Montt in southern Chile, about 14,500 years; largely accepted though not without dissent', source: 'Wikipedia: Monte Verde; Peopling of the Americas' },
    { claim: 'Tianyuan man’s lineage followed a southern-route dispersal and is not directly ancestral to modern populations (so the map does not draw the Americas from Tianyuan)', source: 'Wikipedia: Tianyuan man' },
    { claim: 'Australia reached at least 50,000 years ago (65,000 questioned), by land bridges and sea crossings', source: 'Wikipedia: Madjedbebe; Prehistory of Australia' },
    { claim: 'Bacho Kiro about 46,000 years; Tianyuan man 42,000–39,000 years, near Beijing; Monte Verde 14,500 years', source: 'Wikipedia: Bacho Kiro Cave; Tianyuan man; Tianyuan Cave; Peopling of the Americas' },
    { claim: 'Genetic diversity decreases with migratory distance from Africa', source: 'Wikipedia: Human genetic variation; Ramachandran et al. 2005, PNAS 102:15942, doi:10.1073/pnas.0507611102 (heterozygosity against distance from Addis Ababa)' },
    { claim: 'About 85% of genetic variation lies within local populations; variation is clinal; genetic data can assign people to groups that often match geographic ancestry', source: 'Wikipedia: Human genetic variation' },
    { claim: 'Researchers should not use race as a proxy for human genetic variation', source: 'National Academies of Sciences, Engineering, and Medicine 2023, Using Population Descriptors in Genetics and Genomics Research, Recommendation 1' },
    { claim: '"Missing link" is a non-scientific term that fell out of favour because it implies a linear process; "last common ancestor" preferred', source: 'Wikipedia: Missing link (human evolution)' },
    { claim: 'Grey wolf is the dog’s closest living relative; dogs descend from an extinct wolf population distinct from the modern wolf lineage; divergence 20,000–40,000 years ago', source: 'Wikipedia: Domestication of the dog; Dog' },
    { claim: 'Crown carnivorans (the cat-and-dog group) first appear in fossils about 42 million years ago, a minimum for the split; molecular estimates are older', source: 'Wikipedia: Carnivora ("Crown carnivorans first appeared around 42 million years ago"); Feliformia' },
    { claim: 'Images: chimpanzee portrait (CC BY 2.0), Huxley frontispiece (Wellcome, CC BY 4.0), Yellowstone wolf (NPS, public domain)', source: 'Wikimedia Commons file pages, licences checked through the Commons API on 2026-10-16' },
  ],
};
