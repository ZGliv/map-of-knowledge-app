import type { PlaceCase } from '../types';

// New cases for evolution-e02: situations its expedition and reels never name (cases/types.ts).
// One-gene crosses with complete dominance, each a different cross (carrier × carrier asking for
// the hidden trait, carrier × carrier asking for the shown one, carrier × back-cross), so no single
// memorised ratio wins them all, and "the parents' look wins" or "it blends" never does.
export const E02_CASES: readonly PlaceCase[] = [
  {
    id: 'c_7jbkjkqtqm', archetype: 'cross',
    title: 'Horns from hornless parents',
    scenario: 'Some cattle are born without horns. A hornless bull is mated with hornless cows, and the bull and every one of the cows had one horned parent. Over the years they have 120 calves.',
    ask: 'How many of the 120 calves will grow horns?',
    model: {
      engine: 'cross', locus: { P: 1, p: 0 }, parents: ['Pp', 'Pp'],
      traits: { P: 'Hornless', p: 'Horned' }, cross: 'a hornless bull and hornless cows, each with one horned parent',
      who: { one: 'calf', many: 'calves' }, count: 120, focus: 'p', measure: 'count',
    },
    call: { kind: 'set', label: 'Horned calves', min: 0, max: 120, step: 1, start: 0, tolerance: 9 },
    run: 'Breed 120 calves',
    reveal: 'In cattle the hornless version of the gene hides the horned one. Each parent got a horned copy from its own horned parent and carries it unseen. A calf grows horns only when it inherits that hidden copy from both parents, which happens about one time in four.',
    claim: 'A trait hidden in both parents is passed on whole and shows again in about a quarter of their young.',
    entities: ['cattle'],
    sources: [{ label: 'Wikipedia: Polled livestock', url: 'https://en.wikipedia.org/w/index.php?title=Polled_livestock&oldid=1378797750' }],
    seed: 'e02-polled',
  },
  {
    id: 'c_a7v2k8r04n', archetype: 'cross',
    title: 'Green birds, blue chicks',
    scenario: 'Wild budgerigars are green; sky-blue ones arose in captivity. Two green budgerigars, each with one sky-blue parent, raise 48 chicks over several seasons.',
    ask: 'How many of the 48 chicks will be green?',
    model: {
      engine: 'cross', locus: { G: 1, b: 0 }, parents: ['Gb', 'Gb'],
      traits: { G: 'Green', b: 'Sky blue' }, cross: 'two green budgerigars, each with one sky-blue parent',
      who: { one: 'chick', many: 'chicks' }, count: 48, focus: 'G', measure: 'count',
    },
    call: { kind: 'set', label: 'Green chicks', min: 0, max: 48, step: 1, start: 0, tolerance: 4 },
    run: 'Hatch 48 chicks',
    reveal: 'A budgerigar with one blue copy and one green copy looks fully green; breeders call it green split blue. Each parent hands on its hidden blue copy half the time, so about one chick in four gets two blue copies and comes out sky blue. The rest are green.',
    claim: 'Two parents that both carry a hidden version have about three young showing the visible trait for every one showing the hidden one.',
    entities: ['budgerigar'],
    sources: [{ label: 'Wikipedia: Blue budgerigar mutation', url: 'https://en.wikipedia.org/w/index.php?title=Blue_budgerigar_mutation&oldid=1307862401' }],
    seed: 'e02-budgerigar',
  },
  {
    id: 'c_mdxdgpk05j', archetype: 'cross',
    title: 'Sweet kernels on a starchy ear',
    scenario: 'Cross sweet corn with field corn and every kernel of the hybrid is starchy, not sweet. Grow those kernels into plants, then pollinate each hybrid plant with pollen from sweet corn. Every kernel on the new ears is a separate offspring.',
    ask: 'On an ear of 400 kernels, how many will be sweet?',
    model: {
      engine: 'cross', locus: { S: 1, s: 0 }, parents: ['Ss', 'ss'],
      traits: { S: 'Starchy', s: 'Sweet' }, cross: 'a hybrid corn plant pollinated by sweet corn',
      who: { one: 'kernel', many: 'kernels' }, count: 400, focus: 's', measure: 'count',
    },
    call: { kind: 'set', label: 'Sweet kernels', min: 0, max: 400, step: 1, start: 0, tolerance: 30 },
    run: 'Fill the ear',
    reveal: 'Sweetness in corn comes from a recessive version of a gene that turns sugar into starch. The hybrid carries it hidden behind the starchy version and passes it to about half its kernels; the sweet-corn pollen always brings another sweet copy. So about half the kernels get two sweet copies and come out sweet. That is also why sweet corn is grown away from field corn.',
    claim: 'A hidden version passed by a carrier to a partner that shows it reappears in about half the young.',
    entities: ['sweet corn', 'field corn'],
    sources: [{ label: 'Wikipedia: Sweet corn', url: 'https://en.wikipedia.org/w/index.php?title=Sweet_corn&oldid=1375598553' }],
    seed: 'e02-sweet-corn-backcross',
  },
];
