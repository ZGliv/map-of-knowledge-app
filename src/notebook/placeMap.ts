import { catalog } from '../core/catalog';
import { EVOLUTION_ID, evolutionTerritoryId } from '../core/evolution';
import { BLACK_DEATH, MEDIEVAL_WORLD } from '../core/history';
import type { PlacePick } from './libraryStore';

/*
 * Where on the atlas a book, film, series, podcast or link belongs: 1–3 places, each with a score.
 * Deterministic: the same evidence always gives the same places in the same order. No model and no
 * network: catalog subjects (Open Library), main subjects and genres (Wikidata), the learner's own
 * shelves and tags, a title and free text are matched against the atlas's place names and an alias
 * table of the headings catalogs actually use, longest phrase first.
 *
 * A place is only a pointer for the Library: "read about" never colors land as proved.
 */

const SCIENCE = 'knowledge.science', TECH = 'knowledge.technology', HUM = 'knowledge.humanities', SOC = 'knowledge.society';
const MATH = 'knowledge.mathematics', ARTS = 'knowledge.arts', EARTH = 'knowledge.earth', ECON = 'knowledge.economics';
const BIO = `${SCIENCE}.biology`;
const evo = (key: string) => evolutionTerritoryId(key);

/** Place → the terms that name it, already normalized ("|" between terms, ":0.8" for a broad one).
 * A weight under 0.9 marks a broad term: it never counts in a title, and counts half in free text. */
const ALIAS_TABLE: readonly (readonly [string, string])[] = [
  [SCIENCE, 'science:.7|sciences:.7|popularisation of science:.85|popularization of science:.85|science podcast:.9|science documentary:.85|ciencia:.7|ciencias:.7|wissenschaft:.7|naturwissenschaften:.7|popular science:.8|science popular works:.8|scientists:.6|scientific method:.8|history of science:.9|science history:.9|philosophy of science:.5|research:.4'],
  [`${SCIENCE}.physics`, 'physics|physique|fisica|physik|physicists|quantum theory|quantum physics|quantum mechanics|relativity physics|relativity|general relativity|special relativity|theory of relativity|thermodynamics|electromagnetism|optics:.85|particle physics|particles nuclear physics|nuclear physics|string models|string theory|space and time:.9|gravitation|gravity:.85|atomic theory|mathematical physics|einstein albert:.9|feynman richard p:.9|newton isaac:.85'],
  [BIO, 'biology|biologie|biologia|biologists|life sciences|life biology|natural history:.7|naturalists:.8'],
  [`${BIO}.molecules-cells`, 'cells|cell biology|cytology|molecular biology|biochemistry|proteins|enzymes|metabolism:.8|eukaryotic cells'],
  [`${BIO}.genetics-genomes`, 'genetics|genetique|genetica|genetik|behavior genetics|genes|genomes|genomics|human genome|human genetics|medical genetics|dna|rna|molecular genetics|epigenetics|genetic engineering|gene editing|crispr|heredity:.8|eugenics:.8'],
  [`${BIO}.genetics-genomes.dominance`, 'dominance genetics|dominant and recessive genes'],
  [`${BIO}.plants-fungi`, 'botany|plants|plant physiology|trees:.85|fungi|mushrooms|mycology|flowers:.8|gardening:.6|forests:.6'],
  [`${BIO}.animals`, 'zoology|animals|animal behavior|ethology|animal intelligence|birds|ornithology|mammals|insects|entomology|fishes|reptiles|amphibians|primates|apes|whales:.85|dogs:.7|cats:.7|wildlife:.8|marine animals'],
  [`${BIO}.microbes`, 'microbiology|bacteria|microorganisms|viruses|virology|microbiome|germs'],
  [`${BIO}.development-physiology`, 'physiology|human physiology|anatomy|human anatomy|embryology|developmental biology|aging:.7|sleep:.6'],
  [EVOLUTION_ID, 'evolution|evolucion|evolutie|evolutionstheorie|sociobiology:.85|evolution biology|biological evolution|evolutionary biology|evolutionary theory|darwinism|darwin|darwin charles|origin of life|life origin|evolutionary developmental biology|evo devo|coevolution|evolution research'],
  [evo('tree-thinking'), 'phylogeny|phylogenetics|cladistics|tree of life|common descent|biology classification:.8|taxonomy:.8'],
  [evo('variation-heredity'), 'variation biology|heredity:.8|mendel gregor|mendels law|inheritance biology'],
  [evo('natural-selection'), 'natural selection|selection biology|survival of the fittest|adaptation biology|adaptation:.6'],
  [evo('chance-drift'), 'genetic drift|population genetics|mutation biology|mutation genetics|mutations:.85'],
  [evo('new-species'), 'speciation|origin of species|species:.8|island biogeography'],
  [evo('deep-time'), 'paleontology|palaeontology|fossils|fossil|geological time|earth age|dinosaurs|prehistoric animals|paleobiology|burgess shale|radiometric dating|geochronology|cambrian:.85'],
  [evo('evidence'), 'comparative anatomy|vestigial organs|homology biology|biogeography:.8'],
  [evo('transitions-extinctions'), 'extinction biology|mass extinctions|extinct animals|extinction:.85|extinctions:.85|sixth extinction|endosymbiosis|major transitions|symbiosis:.7'],
  [evo('human-evolution'), 'human evolution|fossil hominids|hominids|human beings origin|human origins|neanderthals|neanderthal|homo sapiens|paleoanthropology|prehistoric peoples:.8'],
  [evo('evolution-now'), 'drug resistance|drug resistance in microorganisms|antibiotic resistance|antibiotics:.8|pesticide resistance|superbugs|experimental evolution'],
  [evo('sexual-selection'), 'sexual selection|sexual selection in animals|mate choice|sexual behavior in animals'],
  [evo('how-we-know'), 'creationism|intelligent design|evolution and creationism'],
  [`${SCIENCE}.chemistry`, 'chemistry|chimie|quimica|chemie|chemists|chemical elements|periodic law|periodic table|organic chemistry|chemical reactions|molecules:.85|alchemy:.8'],
  [`${SCIENCE}.astronomy`, 'astronomy|astronomie|astronomia|cosmologie|cosmologia|kosmologie|astronomers|cosmology|astrophysics|stars:.8|planets|solar system|universe:.85|black holes|black holes astronomy|big bang theory|galaxies|telescopes|outer space|space exploration|space sciences|astronauts:.8|mars planet|moon:.8|exoplanets|extraterrestrial life|space flight:.85'],
  [`${SCIENCE}.medicine`, 'medicine|medecine|medicina|medizin|disease outbreaks|toxicology:.9|medical:.8|diseases|disease|epidemics|epidemiology|pandemics|public health|health:.7|physicians|doctors:.85|surgery|cancer|immunology|vaccines|vaccination|nursing|hospitals|nutrition:.8|pharmacology|infectious diseases|influenza|plague:.85|bubonic plague:.7|medical ethics|psychiatry:.6|mental health:.6|drugs:.5'],
  [TECH, 'technology:.7|technological innovations:.85|technology social aspects:.85|technology history:.85'],
  [`${TECH}.computing`, 'computers|computer:.85|computer science|computing|programming|computer programming|programming languages|computer program language|software|software engineering|artificial intelligence|machine learning|algorithms|computer algorithms|data structures|cryptography|information technology|cybernetics|computer security|hackers|data processing|information theory|computational complexity|video games:.6'],
  [`${TECH}.engineering`, 'engineering|engineers|inventions|inventors|robotics|robots|electronics|electrical engineering|mechanical engineering|civil engineering|aeronautics|astronautics:.85|airplanes|rockets:.85|bridges:.75|machinery:.8'],
  [`${TECH}.materials`, 'materials science|materials:.8|metals|metallurgy|plastics|polymers|nanotechnology|ceramics:.8|glass:.6'],
  [`${TECH}.energy`, 'energy:.6|power resources|renewable energy|renewable energy sources|solar energy|nuclear energy|nuclear power|petroleum|oil industry|electric power|energy policy|energy resources|fossil fuels|batteries:.85|electricity:.8'],
  [`${TECH}.networks`, 'internet|computer networks|networks:.8|network analysis|social networks:.7|online social networks|social media|telecommunication|world wide web|information networks|communication networks'],
  [`${HUM}.history`, 'history:.8|history podcast|historical documentary|history documentary|history of ideas:.6|histoire:.8|historia:.8|geschichte:.8|colonization:.8|world history|historians|historiography|civilization:.6|ancient history|history ancient|history modern|modern history|military history|wars:.8|war:.7|world war 1939 1945|world war 1914 1918|revolutions:.85|civil war:.85|holocaust|cold war|empires:.8|slavery:.85|renaissance|industrial revolution|social history:.6|economic history:.5|history of science:.5|historical fiction:.4'],
  [MEDIEVAL_WORLD.id, 'middle ages|medieval|civilization medieval|history medieval|medieval history|feudalism|crusades|knights:.8|vikings:.8'],
  [BLACK_DEATH.id, 'black death|bubonic plague:.6'],
  [`${HUM}.philosophy`, 'philosophy|philosophy podcast|history of ideas:.9|philosophie|filosofia|filosofie|philosophers|ethics|moral philosophy|metaphysics|epistemology|existentialism|stoics|stoicism|philosophy ancient|ancient philosophy|philosophy modern|philosophy of mind|political philosophy:.8|free will|meaning of life:.8|phenomenology|ontology|utilitarianism|nihilism|absurd philosophy|philosophy of science|aesthetics:.85|religion:.5|theology:.6|buddhism:.5'],
  [`${HUM}.languages`, 'language and languages|linguistics|languages:.9|language:.8|english language|grammar|etymology|translating and interpreting|translation:.8|vocabulary|sociolinguistics|words:.6'],
  [`${HUM}.literature`, 'literature|litterature|literatura|literatur|poetry|poems|literary criticism|classic literature|english literature|american literature|french literature|russian literature|literary fiction:.8|fiction:.5|novels:.6|short stories:.8|classics:.6|science fiction:.7|fantasy fiction:.6|fantasy:.5|mystery fiction:.6|detective and mystery stories:.6|romance fiction:.6|historical fiction:.6|authors:.7|authorship:.8|books and reading|fairy tales:.8|mythology:.6|essays:.6|drama:.6|graphic novels:.6|comic books strips:.6|young adult fiction:.5|juvenile fiction:.4|shakespeare william:.8'],
  [`${HUM}.archaeology`, 'archaeology|archaeologists|excavations archaeology|antiquities|egyptology|egypt antiquities|mummies|pyramids:.8|stone age|bronze age|iron age|prehistoric:.7|prehistoric peoples:.6'],
  [`${SOC}.psychology`, 'psychology|psychologie|psicologia|psychologists|cognitive psychology|social psychology|developmental psychology|child psychology|positive psychology|cognition|cognitive neuroscience|neuroscience:.9|neurosciences:.9|brain:.9|thought and thinking|thinking:.8|memory:.85|emotions|happiness:.85|habits:.85|habit:.85|motivation psychology|motivation:.7|self help techniques:.85|self help:.8|self actualization psychology|personality:.85|mind and body:.7|consciousness:.8|attention:.8|intelligence:.8|perception:.8|intuition:.8|reasoning:.8|creativity:.7|persuasion psychology|influence psychology|mental illness:.8|depression mental|anxiety:.8|psychiatry:.8|mindfulness:.8|judgment:.6|success:.6|behavior:.7|human behavior:.85|learning psychology|educational psychology:.5'],
  [`${SOC}.sociology`, 'sociology|sociologie|sociologia|soziologie|sociologists|social sciences:.7|social conditions|social classes|social problems|social change|social justice|race relations|racism|inequality|equality:.8|feminism|gender:.8|poverty|crime:.8|criminology|demography|urbanization|cities and towns:.7|population:.5|family:.6|marriage:.6|culture:.5|social history:.8|social networks:.6'],
  [`${SOC}.politics`, 'politics|politique:.8|political science|politics and government|government:.8|democracy|international relations|foreign relations|world politics|geopolitics|elections|politicians|presidents:.8|nationalism|socialism|communism|liberalism|conservatism|fascism|totalitarianism|propaganda|diplomacy|public policy|human rights|civil rights|terrorism|law:.6|constitutional law|political philosophy:.8'],
  [`${SOC}.anthropology`, 'anthropology|anthropologists|ethnology|cultural anthropology|social anthropology|indigenous peoples|hunting and gathering societies|rites and ceremonies|kinship|cultural evolution|social evolution:.8|evolution sociale:.8|sociale evolutie:.8|human ecology:.6|ethnicity:.8|culture:.5'],
  [`${SOC}.education`, 'education|teaching|teachers|schools|pedagogy|study skills|higher education|universities and colleges|homeschooling|educational psychology|learning:.7'],
  [MATH, 'mathematics|math|maths|mathematiques|matematicas|matematica|mathematik|mathematicians|mathematical recreations|mathematics history|chaos theory|graph theory|mathematics philosophy|popular mathematics'],
  [`${MATH}.foundations`, 'set theory|number concept|arithmetic|counting:.8|infinity:.85|numbers:.8|foundations of mathematics'],
  [`${MATH}.algebra`, 'algebra|number theory|linear algebra|abstract algebra|group theory|equations'],
  [`${MATH}.geometry`, 'geometry|trigonometry|topology|fractals|euclid'],
  [`${MATH}.analysis`, 'calculus|mathematical analysis|analysis mathematics|differential equations|real analysis'],
  [`${MATH}.probability`, 'probability|probabilities|statistics|mathematical statistics|statistical methods|randomness|chance:.7'],
  [`${MATH}.logic`, 'logic|logics|metamathematics|logic symbolic and mathematical|symbolic logic|mathematical logic|reasoning:.5|paradoxes|godels theorem'],
  [ARTS, 'arts:.8|the arts:.8|art and society:.8'],
  [`${ARTS}.music`, 'music|musique|musica|musik|musicians|composers|jazz|rock music|classical music|popular music|music theory|harmony music|musical instruments|music history and criticism|opera:.85|hip hop|rap music|songs:.8|singers:.85'],
  [`${ARTS}.visual-arts`, 'art|visual arts|painting|painters|drawing|art history|artists|photography|photographers|sculpture|modern art|art modern|illustration:.85|motion pictures:.6|cinema:.6|film:.5|animation:.7|aesthetics:.6'],
  [`${ARTS}.architecture`, 'architecture|architects|buildings:.85|city planning:.85|urban planning:.85|houses:.6'],
  [`${ARTS}.theatre`, 'theater|theatre|plays:.8|drama:.8|acting|actors:.85|playwrights|broadway|dance:.6|opera:.6|shakespeare william:.8'],
  [`${ARTS}.design`, 'design:.85|graphic design|typography|industrial design|product design|web design|user interface|user experience|design thinking|interior design:.85|fashion:.75'],
  [EARTH, 'earth sciences|earth:.6|planet earth'],
  [`${EARTH}.climate`, 'climate|climatic changes|climate change|global warming|weather|meteorology|climatology|greenhouse effect|atmosphere:.8|ice ages:.85'],
  [`${EARTH}.oceans`, 'ocean|oceans|oceanography|marine biology|sea:.8|seas:.8|coral reefs|deep sea|sharks:.8'],
  [`${EARTH}.geology`, 'geology|geologie|geologia|geologists|volcanoes|earthquakes|rocks|minerals:.85|plate tectonics|mountains:.8|glaciers:.85|caves:.8|geomorphology|earth history|historical geology'],
  [`${EARTH}.ecology`, 'ecology|nature documentary|environmental film:.85|ecologie|ecologia|pesticides:.9|environmental aspects:.8|ecosystems|biodiversity|nature:.7|environment:.7|environmental protection|environmentalism|environmental sciences|conservation of natural resources|nature conservation|wildlife conservation|conservation:.8|sustainability|pollution|endangered species:.8|forests and forestry:.85|rain forests:.85|human ecology:.7|natural history:.5'],
  [`${EARTH}.geography`, 'geography|maps|cartography|atlases|discoveries in geography|explorers|exploration:.7|description and travel:.6|voyages and travels:.5|travel:.5'],
  [ECON, 'economics|economie:.9|economia:.9|political economy|economists|economic history|economic policy|economic development|economic conditions|macroeconomics|microeconomics|economy:.8|economics popular works'],
  [`${ECON}.markets`, 'markets|capitalism|free enterprise|supply and demand|prices|business:.7|entrepreneurship:.85|marketing:.8|competition:.8|consumer behavior|advertising:.7|industries:.7'],
  [`${ECON}.exchange`, 'international trade|commerce|trade:.8|free trade|globalization|international economic relations|barter|tariff|trade routes'],
  [`${ECON}.money`, 'money|finance|personal finance|banks and banking|investments|investing|wealth|inflation finance|inflation:.8|currency|credit:.8|debt:.8|financial crises|cryptocurrencies|bitcoin|stock exchanges:.85|saving and investment'],
  [`${ECON}.institutions`, 'institutions:.8|institutional economics|corporations|organizational behavior|organizational change|management:.8|leadership:.6|property:.8|contracts:.8|regulation:.8|labor:.8|labor unions|employment:.7'],
  [`${ECON}.decision-theory`, 'decision making|decision theory|game theory|choice psychology|behavioral economics|rational choice theory|risk:.7|risk management:.8|uncertainty:.8|negotiation:.85|judgment:.6'],
];

interface Alias { readonly nodeId: string; readonly weight: number }
const ALIASES: ReadonlyMap<string, readonly Alias[]> = (() => {
  const map = new Map<string, Alias[]>();
  for (const [nodeId, terms] of ALIAS_TABLE) for (const term of terms.split('|')) {
    const [phrase, weight] = term.split(':');
    const list = map.get(phrase) ?? [];
    list.push({ nodeId, weight: weight ? Number(weight) : 1 });
    map.set(phrase, list);
  }
  return map;
})();
/** Phrases that name no place but would otherwise match one: a "non-fiction" shelf is not fiction,
 * and "Juvenile literature" (a children's book on any subject) is not Literature. */
const STOP = new Set(['non fiction', 'nonfiction', 'juvenile literature', 'popular works', 'to read', 'currently reading', 'long now manual for civilization']);
const LONGEST = Math.max(...[...ALIASES.keys(), ...STOP].map(term => term.split(' ').length));

/** Every term in the table, with its places: for tests and inspection. */
export const placeAliases = (): ReadonlyMap<string, readonly Alias[]> => ALIASES;

/** Lowercase, plain letters, "&" as "and", no punctuation: "Évolution (Biology)" → "evolution biology". */
export function normalizeTerm(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** The aliases in a phrase, longest first, each word used once: "history of science" is not also "history".
 * Catalog subdivisions run on ("Human beings -- Origin" reads as "human beings origin"). */
function matchTerms(text: string, specificOnly: boolean): Alias[] {
  const found: Alias[] = [];
  const words = normalizeTerm(text).split(' ').filter(Boolean);
  const used = new Array<boolean>(words.length).fill(false);
  for (let size = Math.min(LONGEST, words.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      if (used.slice(start, start + size).some(Boolean)) continue;
      const phrase = words.slice(start, start + size).join(' ');
      const aliases = STOP.has(phrase) ? [] : ALIASES.get(phrase);
      if (!aliases) continue;
      const usable = specificOnly ? aliases.filter(alias => alias.weight >= 0.9) : aliases;
      if (!usable.length && !STOP.has(phrase)) continue;
      for (let i = start; i < start + size; i += 1) used[i] = true;
      found.push(...usable);
    }
  }
  return found;
}

export interface PlaceEvidence {
  readonly title?: string;
  /** Catalog subjects, most telling first (Open Library lists them roughly that way). */
  readonly subjects?: readonly string[];
  /** Wikidata "main subject" (P921) labels. */
  readonly mainSubjects?: readonly string[];
  /** Wikidata genre (P136) labels. */
  readonly genres?: readonly string[];
  /** The learner's own shelves and tags. */
  readonly shelves?: readonly string[];
  /** Free text: a link's line in the learner's words, a page's title and description. */
  readonly text?: string;
  /** Free text that is not the learner's own (a page describing itself): counts for less. */
  readonly pageText?: string;
}

const SOURCE_WEIGHT = { mainSubjects: 2.5, genres: 1.2, subjects: 1, shelves: 1.3, text: 1.2, pageText: 0.6, title: 0.95 } as const;
/** Below this a top place is not claimed at all; a runner-up needs a share of the leader's score. */
const MIN_SCORE = 0.9;
const RUNNER_UP = 0.35;
/** A narrower place stands in for the broader one around it when it carries this share of the broader one's score. */
const NARROWER = 0.75;
const position = (index: number) => index < 6 ? 1 : index < 12 ? 0.6 : 0.35;
const isWithin = (nodeId: string, scope: string) => nodeId === scope || nodeId.startsWith(`${scope}.`);

/** Raw scores per place, from every piece of evidence. Each string counts once per place. */
export function scorePlaces(evidence: PlaceEvidence): Map<string, number> {
  const scores = new Map<string, number>();
  const add = (strings: readonly string[] | undefined, weight: number, options: { specificOnly?: boolean; broadHalf?: boolean; decay?: boolean } = {}) => {
    strings?.forEach((value, index) => {
      const best = new Map<string, number>();
      for (const alias of matchTerms(value, !!options.specificOnly)) {
        const strength = alias.weight * (options.broadHalf && alias.weight < 0.9 ? 0.5 : 1);
        best.set(alias.nodeId, Math.max(best.get(alias.nodeId) ?? 0, strength));
      }
      for (const [nodeId, strength] of best) scores.set(nodeId, (scores.get(nodeId) ?? 0) + weight * strength * (options.decay ? position(index) : 1));
    });
  };
  add(evidence.mainSubjects, SOURCE_WEIGHT.mainSubjects);
  add(evidence.genres, SOURCE_WEIGHT.genres);
  add(evidence.subjects, SOURCE_WEIGHT.subjects, { decay: true });
  add(evidence.shelves, SOURCE_WEIGHT.shelves);
  add(evidence.text ? [evidence.text] : undefined, SOURCE_WEIGHT.text, { broadHalf: true });
  add(evidence.pageText ? [evidence.pageText] : undefined, SOURCE_WEIGHT.pageText, { broadHalf: true });
  add(evidence.title ? [evidence.title] : undefined, SOURCE_WEIGHT.title, { specificOnly: true });
  for (const nodeId of [...scores.keys()]) {
    const node = catalog.get(nodeId);
    if (!node || (node as { sample?: boolean }).sample) scores.delete(nodeId);
  }
  return scores;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;
const byScore = (a: [string, number], b: [string, number]) => round(b[1]) - round(a[1]) || (catalog.get(b[0])!.depth - catalog.get(a[0])!.depth) || a[0].localeCompare(b[0]);

/** 0–3 places for the evidence, best first, with scores from 0 to 1. */
export function mapPlaces(evidence: PlaceEvidence, options: { limit?: number; minScore?: number } = {}): PlacePick[] {
  const limit = options.limit ?? 3;
  const minimum = options.minScore ?? MIN_SCORE;
  const ranked = [...scorePlaces(evidence)].sort(byScore);
  // A narrower place that carries most of a broader one's support stands in for it. Otherwise both
  // stay in the running: the thresholds below decide whether the narrower one is strong enough.
  const kept = new Map(ranked);
  for (const [outer, outerScore] of ranked) {
    for (const [inner, innerScore] of ranked) {
      if (inner === outer || !isWithin(inner, outer) || !kept.has(inner) || !kept.has(outer)) continue;
      if (innerScore >= outerScore * NARROWER) kept.delete(outer);
    }
  }
  const list = [...kept].sort(byScore);
  const top = list[0]?.[1] ?? 0;
  if (top < minimum) return [];
  return list.filter(([, score]) => score >= top * RUNNER_UP && score >= minimum).slice(0, limit)
    .map(([nodeId, score]) => ({ nodeId, score: Math.round(Math.min(1, score / 3) * 100) / 100 }));
}

/** Places for a link: the learner's line counts most, the page's own words less. Best first. */
export function suggestPlaces(text: string, pageText = '', limit = 4): string[] {
  if (normalizeTerm(text + ' ' + pageText).length < 3) return [];
  return mapPlaces({ text, pageText }, { limit, minScore: 0.5 }).map(pick => pick.nodeId);
}
