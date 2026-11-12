import type { PlaceCase } from '../types';

// New cases for evolution-e09: situations its expedition and reels never name (cases/types.ts).
// Humans are apes, read off our own primate family tree. Humans are a tip on every tree (the
// place's subject, so not a new entity); every other species is new to the pack and its reels.
// Every tree is an induced subtree of the Open Tree of Life synthetic tree opentree16.1 (CC0),
// fetched 2026-10-17 and collapsed to its branch points; branches are turned so the `of` tip is
// drawn beside the look-alike the story names (`than`).
const OTOL = { label: 'Open Tree of Life, synthetic tree opentree16.1', url: 'https://tree.opentreeoflife.org/about/synthesis-release/v16.1' };

export const E09_CASES: readonly PlaceCase[] = [
  {
    id: 'c_3e1ee6wv80', archetype: 'tree',
    title: 'Two ways to swing',
    scenario: 'The siamang swings hand over hand through the treetops of Southeast Asia. Half a world away, the spider monkey also travels partly by swinging from its long arms. Here both sit on a real family tree of seven living primates.',
    ask: 'Which primates share a more recent ancestor with the siamang than the spider monkey does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((baboon,rhesus),(human,siamang)),(marmoset,spider)),lemur); turned.
      newick: '(lemur,((marmoset,spider),((siamang,human),(rhesus,baboon))));',
      tips: { siamang: 'Siamang', spider: 'Spider monkey', human: 'Human', rhesus: 'Rhesus macaque', baboon: 'Olive baboon', marmoset: 'Common marmoset', lemur: 'Ring-tailed lemur' },
      of: 'siamang', than: 'spider', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'human', label: 'Human' }, { id: 'rhesus', label: 'Rhesus macaque' }, { id: 'baboon', label: 'Olive baboon' },
      { id: 'marmoset', label: 'Common marmoset' }, { id: 'lemur', label: 'Ring-tailed lemur' },
    ] },
    run: 'Trace the branches back',
    reveal: 'The siamang is a gibbon, a small ape, so its closest relative here is you. The macaque and baboon are monkeys of the Old World, and they too share a more recent ancestor with the siamang than the spider monkey does. Swinging through trees is no sign of close kinship here.',
    claim: 'Humans sit on the ape branch, and a shared way of moving does not make two primates close relatives.',
    entities: ['siamang', 'Southeast Asia', 'spider monkey', 'rhesus macaque', 'olive baboon', 'common marmoset', 'ring-tailed lemur'],
    sources: [
      { label: 'Wikipedia: Siamang', url: 'https://en.wikipedia.org/w/index.php?title=Siamang&oldid=1380581695' },
      { label: 'Wikipedia: Brachiation', url: 'https://en.wikipedia.org/w/index.php?title=Brachiation&oldid=1348794421' },
      OTOL,
    ],
    seed: 'e09-siamang',
  },
  {
    id: 'c_hs3p9na5sk', archetype: 'tree',
    title: 'Ape or monkey',
    scenario: 'A rhesus macaque sits, grips and stares much like a small person. A siamang is black-furred and lives high in the treetops. Here they sit on a real family tree of seven living primates.',
    ask: 'Which primates share a more recent ancestor with humans than the rhesus macaque does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((proboscis,(gelada,rhesus)),(human,siamang)),capuchin),tarsier); turned.
      newick: '(tarsier,(capuchin,((proboscis,(gelada,rhesus)),(human,siamang))));',
      tips: { human: 'Human', rhesus: 'Rhesus macaque', siamang: 'Siamang', gelada: 'Gelada', proboscis: 'Proboscis monkey', capuchin: 'Capuchin monkey', tarsier: 'Tarsier' },
      of: 'human', than: 'rhesus', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'siamang', label: 'Siamang' }, { id: 'gelada', label: 'Gelada' }, { id: 'proboscis', label: 'Proboscis monkey' },
      { id: 'capuchin', label: 'Capuchin monkey' }, { id: 'tarsier', label: 'Tarsier' },
    ] },
    run: 'Trace the branches back',
    reveal: 'Only the siamang. It is a gibbon, one of the apes, and humans are apes too. The gelada and the proboscis monkey join our line at the same ancestor as the macaque does, so they are no closer, and the capuchin and tarsier are farther still.',
    claim: 'Humans are apes: our branch holds the gibbons and great apes, and every monkey joins it further back.',
    entities: ['rhesus macaque', 'siamang', 'gelada', 'proboscis monkey', 'capuchin monkey', 'tarsier'],
    sources: [
      { label: 'Wikipedia: Siamang', url: 'https://en.wikipedia.org/w/index.php?title=Siamang&oldid=1380581695' },
      { label: 'Wikipedia: Gelada', url: 'https://en.wikipedia.org/w/index.php?title=Gelada&oldid=1343761319' },
      OTOL,
    ],
    seed: 'e09-ape-or-monkey',
  },
  {
    id: 'c_1stx4q54xd', archetype: 'tree',
    title: 'Big eyes in the dark',
    scenario: 'A tarsier is a palm-sized night hunter with enormous eyes that clings to stems and leaps, much like a bush baby or a slow loris. For much of the 1900s it was often grouped with them. Here it sits on a real family tree of seven living mammals.',
    ask: 'Which animals share a more recent ancestor with the tarsier than the slow loris does? Pick every one.',
    model: {
      engine: 'tree',
      // OToL: ((((human,marmoset),tarsier),(mouselemur,(loris,galago))),colugo); turned.
      newick: '(colugo,((mouselemur,(galago,loris)),(tarsier,(marmoset,human))));',
      tips: { tarsier: 'Tarsier', loris: 'Slow loris', human: 'Human', marmoset: 'Common marmoset', galago: 'Bush baby', mouselemur: 'Grey mouse lemur', colugo: 'Colugo' },
      of: 'tarsier', than: 'loris', measure: 'closer',
    },
    call: { kind: 'pick', multi: true, options: [
      { id: 'human', label: 'Human' }, { id: 'marmoset', label: 'Common marmoset' }, { id: 'galago', label: 'Bush baby' },
      { id: 'mouselemur', label: 'Grey mouse lemur' }, { id: 'colugo', label: 'Colugo' },
    ] },
    run: 'Trace the branches back',
    reveal: 'The tarsier belongs on our side of the primate tree, with monkeys, apes and you. One clue in its DNA: like them, it carries a broken gene for making vitamin C and must get it from food, while bush babies and lorises can still make their own.',
    claim: 'Shared looks from a shared way of life can hide ancestry; the tree, backed by genes, puts humans and tarsiers on one branch.',
    entities: ['tarsier', 'slow loris', 'common marmoset', 'bush baby', 'grey mouse lemur', 'colugo'],
    sources: [
      { label: 'Wikipedia: Tarsier', url: 'https://en.wikipedia.org/w/index.php?title=Tarsier&oldid=1377298293' },
      OTOL,
    ],
    seed: 'e09-tarsier',
  },
];
