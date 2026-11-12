import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { EXPEDITIONS } from '../expeditions/registry';
import { NARRATION } from '../explore/deck';
import { checksOf } from '../explore/validate';
import { isGenerated, LEGACY_COMMON_WAIVERS, LEGACY_WAIVERS, PLACES } from '.';
import { PLACE_RULES, type PlaceBundle, type PlaceRule } from './contract';
import { formatProblems, validatePlace, type PlaceContext } from './validate';

// One test for every place, old or new: validatePlace runs every content rule (places/contract.ts).
// Hand-written places may miss a rule only by the exact count in LEGACY_WAIVERS.

/** Cached Wikipedia extracts written by scripts/generate/facts.mjs, by source ID. */
const CACHED = import.meta.glob<{ id: string; text: string }>('/content/generator/*/sources/*.json', { eager: true, import: 'default' });
function sourceTexts(place: PlaceBundle): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [file, source] of Object.entries(CACHED)) if (file.startsWith(`/content/generator/${place.id}/`)) out[source.id] = source.text;
  return out;
}

const base: Omit<PlaceContext, 'sourceTexts'> = {
  isLeaf: id => { const node = catalog.get(id); return !!node && catalog.getChildren(node).length === 0; },
  nodeName: id => catalog.get(id)?.name,
  nodeExists: id => !!catalog.get(id),
  expedition: packId => { const e = EXPEDITIONS.find(x => x.pack.id === packId); return e ? { pack: e.pack, nodeId: e.nodeId } : undefined; },
  checks: EXPEDITIONS.flatMap(e => checksOf(e.pack)),
  narration: NARRATION,
  places: PLACES,
};

describe('every place passes validatePlace', () => {
  it('covers every placed expedition exactly once', () => {
    expect(PLACES.map(p => p.id).sort()).toEqual(EXPEDITIONS.map(e => e.pack.id).sort());
  });

  it.each(PLACES.map(p => [p.id, p] as const))('%s', (id, place) => {
    const problems = validatePlace(place, { ...base, sourceTexts: sourceTexts(place) });
    if (isGenerated(id)) { expect(formatProblems(id, problems)).toEqual([]); return; }
    const waivers = LEGACY_WAIVERS[id] ?? {};
    const unwaived = problems.filter(p => !(p.rule in waivers) && !(p.rule in LEGACY_COMMON_WAIVERS));
    expect(formatProblems(id, unwaived)).toEqual([]);
    for (const [rule, waiver] of Object.entries(waivers)) {
      const n = problems.filter(p => p.rule === rule).length;
      expect(n, `${id} ${rule}: waived ${waiver.count}, found ${n}${n < waiver.count ? ' (fixed some: lower the count)' : ''}`).toBe(waiver.count);
    }
  });

  it('waives only known rules, each with a reason', () => {
    for (const waivers of Object.values(LEGACY_WAIVERS)) for (const [rule, w] of Object.entries(waivers)) {
      expect(Object.keys(PLACE_RULES)).toContain(rule);
      expect(w.reason.length).toBeGreaterThan(20);
    }
    for (const id of Object.keys(LEGACY_WAIVERS)) expect(isGenerated(id), id).toBe(false);
  });
});

describe('the validator catches (mutation tests)', () => {
  const e11 = PLACES.find(p => p.id === 'evolution-e11')!;
  const rules = (place: PlaceBundle) => new Set(validatePlace(place, base).map(p => p.rule));
  const mutate = (f: (p: PlaceBundle) => void) => { const copy = structuredClone(e11) as PlaceBundle; f(copy); return rules(copy); };
  const has = (r: Set<PlaceRule>, rule: PlaceRule) => expect([...r]).toContain(rule);

  it('a broken beat budget, rhythm and transfer', () => {
    has(mutate(p => { p.pack.beats = p.pack.beats.slice(0, 5); }), 'pack.budget');
    has(mutate(p => { p.pack.beats.splice(1, 0, { kind: 'documentary', title: 'x', frames: [] }, { kind: 'footage', media: 'peacock', caption: 'x' }); }), 'pack.rhythm');
    has(mutate(p => { for (const b of p.pack.beats) if ('transfer' in b) delete (b as { transfer?: boolean }).transfer; }), 'pack.transfer');
  });
  it('ShareAlike media on a cover, and an unlisted licence', () => {
    has(mutate(p => { p.pack.media.perched.license = 'CC BY-SA 4.0'; p.pack.media.perched.credit += ' CC BY-SA 4.0'; }), 'pack.media');
    has(mutate(p => { p.pack.media.falls.license = 'CC BY-NC 2.0'; }), 'pack.media');
  });
  it('a sim key the model disagrees with', () => {
    has(mutate(p => { const sim = p.pack.beats.find(b => b.kind === 'sim')!; ((sim as unknown as { params: { questions: { answer: string }[] } }).params.questions[0]).answer = 'same'; }), 'pack.sims');
  });
  it('a wrong option with no feedback, and a bank item with two right answers', () => {
    has(mutate(p => { const b = p.pack.beats.find(x => x.kind === 'predict')!; if (b.kind === 'predict') delete b.parts[0].choices[1].feedback; }), 'pack.feedback');
    has(mutate(p => { const item = p.bank.items.find(i => i.kind === 'choice')!; if (item.kind === 'choice') item.options[1].id = item.answer; }), 'bank.answers');
  });
  it('a reel that names a transfer item’s entity', () => {
    has(mutate(p => { p.reels = p.reels.map((r, i) => i ? r : { ...r, takeaway: `${r.takeaway} So do Photinus fireflies.` }); }), 'reels.noPreteach');
  });
  it('an unlisted source, an unpinned Wikipedia revision and a missing licence snapshot', () => {
    has(mutate(p => { p.sources = []; }), 'sources.complete');
    has(mutate(p => { p.sources = [{ id: 'Wikipedia: Guppy', kind: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Guppy', retrieved: '2026-10-17', licence: 'CC BY-SA 4.0', usage: ['ai_input'] }]; }), 'sources.allowed');
    has(rules(e11), 'media.checked');
  });
  it('Wikipedia prose copied into a generated place (the clean-room rule)', () => {
    // The worked example: its snapdragon sentence and Morgan quote are what this mutates.
    const generated = PLACES.find(p => p.id === 'genetics-dominance')!;
    const copy = structuredClone(generated) as PlaceBundle;
    const cover = copy.pack.beats[0];
    if (cover.kind === 'cover') cover.hook += ' When the red homozygous flower is paired with the white homozygous flower, the result yields a pink snapdragon flower.';
    const problems = validatePlace(copy, { ...base, sourceTexts: sourceTexts(copy) }).map(p => p.rule);
    expect(problems).toContain('sources.cleanRoom');
    const misquoted = structuredClone(generated) as PlaceBundle;
    const source = misquoted.pack.beats.find(b => b.kind === 'source');
    if (source?.kind === 'source') source.passage[0] = source.passage[0].replace('most beautiful', 'most handsome');
    expect(validatePlace(misquoted, { ...base, sourceTexts: sourceTexts(misquoted) }).map(p => p.rule)).toContain('sources.quotes');
    expect(validatePlace(generated, { ...base, sourceTexts: sourceTexts(generated) })).toEqual([]);
  });
});

describe('the validator catches bad new cases (mutation tests)', () => {
  const e04 = PLACES.find(p => p.id === 'evolution-e04')!;
  const rules = (place: PlaceBundle) => new Set(validatePlace(place, base).map(p => p.rule));
  const mutate = (f: (p: PlaceBundle) => void) => { const copy = structuredClone(e04) as PlaceBundle; f(copy); return rules(copy); };
  const has = (r: Set<PlaceRule>, rule: PlaceRule) => expect([...r]).toContain(rule);
  type Mutable = { -readonly [K in keyof PlaceBundle['cases'][number]]: PlaceBundle['cases'][number][K] };
  const first = (p: PlaceBundle) => (p.cases as Mutable[])[0];

  it('fewer than three cases, or a repeated ID', () => {
    has(mutate(p => { p.cases = p.cases.slice(0, 2); }), 'cases.supply');
    has(mutate(p => { p.cases = [p.cases[0], p.cases[0], ...p.cases.slice(1)]; }), 'cases.supply');
  });
  it('a case that names something the expedition already showed', () => {
    has(mutate(p => { const c = first(p); c.entities = [...c.entities, 'elephant seal']; c.scenario += ' Elephant seals live nearby.'; }), 'cases.transfer');
    has(mutate(p => { first(p).entities = ['Atlantis']; }), 'cases.transfer');
  });
  it('a case another place already teaches, a reused title, and a place that spoils another place’s case', () => {
    const genomes = PLACES.find(p => p.id === 'genetics-genomes')!;
    const transfer = (f: (p: PlaceBundle) => void) => {
      const copy = structuredClone(genomes) as PlaceBundle; f(copy);
      return validatePlace(copy, base).filter(x => x.rule === 'cases.transfer').map(x => x.message).join('\n');
    };
    // One shared name teaches no kinship: evolution-e08 names the koala (eating leaves), and the thylacine case still passes.
    expect(transfer(() => {})).toBe('');
    // The retired dolphin case: evolution-e01's tree sim already sets the hippo beside the great white shark.
    expect(transfer(p => { const c = (p.cases as Mutable[])[1]; c.entities = [...c.entities, 'hippopotamus', 'great white shark']; c.scenario += ' A hippopotamus and a great white shark.'; })).toMatch(/evolution-e01 beat \d+ already names hippopotamus, great white shark/);
    expect(transfer(p => { (p.cases as Mutable[])[2].title = 'Two pandas'; })).toMatch(/“Two pandas” is already used in evolution-e01/);
    // The retired panda reveal: naming the red panda beside raccoons gives away evolution-e01's case.
    expect(transfer(p => { const item = p.bank.items.find(i => i.kind === 'choice') as { explain: string }; item.explain += ' The red panda sits nearer raccoons.'; })).toMatch(/names red panda, raccoon, which evolution-e01’s case/);
  });
  it('a typed answer, guessing that wins too often, or a slider that starts on the answer', () => {
    has(mutate(p => { (first(p) as unknown as Record<string, unknown>).answer = 'x'; }), 'cases.engine');
    has(mutate(p => { const c = first(p); if (c.call.kind === 'pick') c.call = { ...c.call, options: c.call.options.slice(0, 2) }; else c.call = { ...c.call, tolerance: (c.call.max - c.call.min) / 2 }; }), 'cases.engine');
  });
  it('a case whose winner changes with the seed', () => {
    has(mutate(p => {
      const c = first(p);
      c.model = { engine: 'population', trait: 'the stripe', who: { one: 'lizard', many: 'lizards' }, demes: [{ id: 'a', label: 'A', size: 40 }, { id: 'b', label: 'B', size: 44 }], start: 0.5, shows: 'additive', fitness: 1, generations: 30, replicates: 4, measure: 'settled' };
      c.call = { kind: 'pick', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'neither', label: 'Neither' }] };
    }), 'cases.seeded');
  });
  it('an archetype the place doesn’t use, with no reason given', () => {
    has(mutate(p => { const c = first(p); c.archetype = 'chart'; c.model = { engine: 'chart', unit: 'm', measure: 'biggest', bars: [1, 9, 3, 4, 5].map((value, i) => ({ id: `b${i}`, label: `B${i}`, value })) }; c.call = { kind: 'pick', options: [0, 1, 2, 3, 4].map(i => ({ id: `b${i}`, label: `B${i}` })) }; delete c.fit; }), 'cases.archetype');
  });
  it('quiz language and missing sources', () => {
    has(mutate(p => { first(p).ask = 'Quick question: which island?'; }), 'cases.style');
    has(mutate(p => { first(p).sources = []; }), 'cases.sources');
  });
});

