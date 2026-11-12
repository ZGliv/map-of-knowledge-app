import type { Beat, Pack } from '../expeditions/content/types';
import type { NarrationManifest } from './deck';
import { frameHash, splitLines, spokenText } from './narrationText';
import { isShareAlike, REEL_LICENSES, REEL_TEMPLATES, type EngineReel, type Reel, type ReelNarration } from './types';
import { GENERATED_PLACES } from '../places/generated';

// The deterministic reel validator: every rule a reel must meet before it ships, written as
// code so a generated reel is held to the same bar as a hand-written one.

export const REEL_LIMITS = { frames: [4, 7], seconds: [20, 50], caption: 200, prompt: 200, choice: 60, zoom: [1, 2.2], overlapWords: 8 } as const;

/** Provenance sources that back only a pack's transfer checks. A reel that cited one would be
 * teaching the unseen situation a check is saved for, so no reel may. */
export const TRANSFER_ONLY_SOURCES: Readonly<Record<string, readonly string[]>> = {
  'evolution-e05': ['Wikipedia: Apple maggot', 'Wikipedia: Erythranthe cardinalis', 'Wikipedia: Mule; Reproductive isolation', 'Wikipedia: Spotted skunk', 'Wikipedia: Liger', 'Wikipedia: Reproductive isolation'],
  'evolution-e01': ['Wikipedia: Tetrapod (rev 1379823950)', 'Wikipedia: Fungus (rev 1380255362); Opisthokont (rev 1363243090); Chitin (lead)'],
  'evolution-e02': ['Wikipedia: ABO blood group system (rev 1371545206, Genetics)', 'Wikipedia: Queen bee (rev 1375421356)', 'Wikipedia: Gregor Mendel'],
  'evolution-e03': ['Wikipedia: Peter and Rosemary Grant (rev 1372520945)', 'Boag & Grant 1981, Science 214:82, doi:10.1126/science.214.4516.82 (abstract, PubMed 17802577)', 'Wikipedia: Medium ground finch; Peter and Rosemary Grant', 'Nachman, Hoekstra & D’Agostino 2003, PNAS 100:5268, doi:10.1073/pnas.0431157100 (abstract); Wikipedia: Rock pocket mouse', 'Hoekstra, Drumm & Nachman 2004, Evolution 58:1329, doi:10.1111/j.0014-3820.2004.tb01711.x (abstract)'],
  'evolution-e04': ['Westemeier et al. 1998, Science 282:1695, doi:10.1126/science.282.5394.1695 (abstract, PubMed 9831558)', 'Lederberg & Lederberg 1952, J Bacteriol 63:399, doi:10.1128/jb.63.3.399-406.1952 (PMC169282 scan); Wikipedia: Esther Lederberg; Replica plating', 'Wikipedia: Gene flow (rev. 1379223119)', 'Wikipedia: Genetic drift (Population bottleneck; Founder effect sections)'],
  'evolution-e06': ['Hutton, Theory of the Earth vol. 1 (1795), Project Gutenberg #12861', 'Wikipedia: Hutton’s Unconformity', 'Wikipedia: Fossil; Law of superposition'],
  'evolution-e07': ['Wikipedia: Chromosome 2', 'Wikipedia: Evidence of common descent (biogeography section)'],
  'evolution-e10': ['Wikipedia: Herbicide (Resistance section)', 'Wikipedia: Pesticide resistance (Behavioral resistance)'],
  'evolution-e08': ['Wikipedia: Cretaceous–Paleogene extinction event (Extinction patterns; Mammals)', 'Wikipedia: Bird (rev. 1380656033); Synapsida'],
  'evolution-e09': ['Wikipedia: Domestication of the dog; Dog', 'Wikipedia: Carnivora ("Crown carnivorans first appeared around 42 million years ago"); Feliformia'],
  'evolution-e11': ['Wikipedia: Red deer; Stalk-eyed fly; Bowerbird; Poison dart frog; Phasmatodea; Snowshoe hare', 'Zuk, Rotenberry & Tinghitella 2006, Biol. Lett. 2:521, doi:10.1098/rsbl.2006.0539; Wikipedia: Teleogryllus oceanicus; Ormia ochracea'],
  'evolution-e12': ['Darwin, On the Various Contrivances by which British and Foreign Orchids are Fertilised by Insects, 1st ed. 1862, pp. 197–198 (Internet Archive B-001-002-946)', 'Wikipedia: Xanthopan; Angraecum sesquipedale; Fertilisation of Orchids', 'Natural History Museum, London, news, September 2021: moth predicted to exist by Darwin and Wallace becomes a new species', 'Wikipedia: Precambrian; Mammal; Precambrian rabbit', 'Wikipedia: Evolution of cetaceans; Basilosaurus; Human evolutionary genetics; Amniote', 'Baym et al. 2016, Science 353:1147, doi:10.1126/science.aag0822'],
  history: ['Wikipedia: Black Death; Black Death in Italy'],
  physics: [],
  music: [],
  // Generated places carry their own list (places/contract.ts).
  ...Object.fromEntries(GENERATED_PLACES.map(place => [place.pack.id, place.transferOnlySources])),
};

export interface ReelContext {
  nodeExists: (nodeId: string) => boolean;
  /** The placed expedition for a pack: its content and the leaf it lights. */
  expedition: (packId: string) => { pack: Pack; nodeId: string } | undefined;
  /** Every graded check across the edition, so a prequestion can never reuse one. */
  checks: readonly { gradeId: string; prompt: string }[];
  narration: NarrationManifest;
}

/** Each graded moment of a pack with the words a learner reads for it. */
export function checksOf(pack: Pack): { gradeId: string; prompt: string }[] {
  const out: { gradeId: string; prompt: string }[] = [];
  const params = (beat: Beat) => ('params' in beat ? beat.params : {}) as Record<string, unknown>;
  for (const beat of pack.beats) {
    if (beat.kind === 'predict') out.push({ gradeId: beat.gradeId, prompt: [beat.prompt, ...beat.parts.map(part => part.label)].join(' ') });
    else if (beat.kind === 'source') out.push({ gradeId: beat.gradeId, prompt: beat.question.prompt });
    else if (beat.kind === 'order' || beat.kind === 'match' || beat.kind === 'spot' || beat.kind === 'flaw') out.push({ gradeId: beat.gradeId, prompt: [beat.prompt, ...(beat.kind === 'flaw' ? beat.steps.map(step => step.text) : [])].join(' ') });
    else if (beat.kind === 'number') {
      const p = params(beat);
      const texts = [p.prompt, p.ask, p.hint, ...(Array.isArray(p.scenarios) ? p.scenarios.flatMap((s: { prompt?: string; ask?: string }) => [s.prompt, s.ask]) : [])].filter((t): t is string => typeof t === 'string');
      out.push({ gradeId: beat.gradeId, prompt: texts.join(' ') });
    } else if (beat.kind === 'sim') {
      const p = params(beat) as { question?: { ask?: string }; strobe?: { ask?: string } };
      for (const grade of beat.grades ?? []) out.push({ gradeId: grade.gradeId, prompt: p.question?.ask ?? p.strobe?.ask ?? beat.goal });
    } else if (beat.kind === 'dialogue') {
      for (const line of beat.script) if ('gradeId' in line) out.push({ gradeId: line.gradeId, prompt: line.ask });
    }
  }
  return out;
}

const words = (text: string) => text.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]+/g) ?? [];
/** The first run of `n` consecutive words the two texts share, or null. */
export function sharedRun(a: string, b: string, n: number = REEL_LIMITS.overlapWords): string | null {
  const left = words(a), right = ` ${words(b).join(' ')} `;
  for (let i = 0; i + n <= left.length; i += 1) { const run = left.slice(i, i + n).join(' '); if (right.includes(` ${run} `)) return run; }
  return null;
}
/** True when the two texts share a run of `n` consecutive words. */
export const sharesRun = (a: string, b: string, n: number = REEL_LIMITS.overlapWords): boolean => sharedRun(a, b, n) !== null;

const EMOJI = /\p{Extended_Pictographic}/u;
const HYPE = /\bdid you know\b|\bmind[- ]?blowing\b|\byou won[’']?t believe\b|\bshocking\b/i;
/** An exclamation mark is allowed only inside a quotation (Darwin’s “…difference in their inhabitants!”). */
const bareExclamation = (text: string) => /!/.test(text.replace(/“[^”]*”/g, ''));
const isCommonsFile = (url: string) => /^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/.test(url);
const isCommonsMedia = (url: string) => /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//.test(url);

type Fail = (message: string) => void;

/** The rules every reel meets, hand-written or engine-made: style, frames, media and licences, the
 * prediction, and claims that are all cited and all used. Returns the claim IDs the reel cites. */
function checkBody(reel: Reel, checks: ReelContext['checks'], fail: Fail, extraStyle?: (text: string, where: string) => void) {
  const sourceIds = new Set(reel.sources.map(source => source.id));
  const cited = new Set<string>();
  const cite = (ids: readonly string[], where: string) => {
    if (!ids.length) fail(`${where} has no claim`);
    for (const id of ids) { if (!sourceIds.has(id)) fail(`${where} cites unknown claim "${id}"`); cited.add(id); }
  };
  const style = (text: string, where: string, max: number) => {
    if (!text.trim()) fail(`${where} is empty`);
    if (text.length > max) fail(`${where} is longer than ${max} characters`);
    if (EMOJI.test(text)) fail(`${where} contains an emoji`);
    if (HYPE.test(text)) fail(`${where} reads like hype`);
    if (bareExclamation(text)) fail(`${where} uses an exclamation mark outside a quotation`);
    extraStyle?.(text, where);
  };

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(reel.id)) fail('id must be a lowercase slug');
  style(reel.title, 'title', 60);
  style(reel.takeaway, 'takeaway', REEL_LIMITS.caption);

  // Frames.
  const [minFrames, maxFrames] = REEL_LIMITS.frames;
  if (reel.frames.length < minFrames || reel.frames.length > maxFrames) fail(`has ${reel.frames.length} frames; a reel has ${minFrames}–${maxFrames}`);
  const usedMedia = new Set<string>([reel.hero]);
  reel.frames.forEach((frame, index) => {
    const where = `frame ${index + 1}`;
    style(frame.text, `${where} caption`, REEL_LIMITS.caption);
    if (frame.say !== undefined && splitLines(frame.say).length !== splitLines(frame.text).length) fail(`${where} narration and caption differ in sentence count`);
    cite(frame.claims, where);
    if (frame.media !== undefined) {
      usedMedia.add(frame.media);
      const media = reel.media[frame.media];
      if (!media) { fail(`${where} shows unknown media "${frame.media}"`); return; }
      if (frame.x < 0 || frame.x > 100 || frame.y < 0 || frame.y > 100) fail(`${where} focal point is outside the image`);
      if (frame.zoom < REEL_LIMITS.zoom[0] || frame.zoom > REEL_LIMITS.zoom[1]) fail(`${where} zoom ${frame.zoom} is outside ${REEL_LIMITS.zoom.join('–')}`);
      if ((isShareAlike(media.license) || media.fit === 'contain') && frame.zoom !== 1) fail(`${where} zooms into "${frame.media}", which must be shown whole and unmoved`);
    }
  });
  const first = reel.frames[0];
  if (!first || first.media !== reel.hero) fail('the first frame must show the hero asset');

  // Media: allowlisted licences, attribution, and ShareAlike files never cropped, zoomed or filtered.
  if (!reel.media[reel.hero]) fail(`hero "${reel.hero}" is not in the reel's media`);
  for (const [key, media] of Object.entries(reel.media)) {
    const where = `media "${key}"`;
    if (!usedMedia.has(key)) fail(`${where} is never shown`);
    if (!(REEL_LICENSES as readonly string[]).includes(media.license)) fail(`${where} has licence "${media.license}", which is not on the allowlist`);
    if (!media.credit.trim()) fail(`${where} has no attribution`);
    if (!media.alt.trim()) fail(`${where} has no alt text`);
    if (!isCommonsFile(media.page)) fail(`${where} must link its Commons file page`);
    if (!isCommonsMedia(media.src)) fail(`${where} must be served from Wikimedia Commons`);
    if (isShareAlike(media.license) && media.fit !== 'contain') fail(`${where} is ShareAlike, so it must be shown whole (fit: contain)`);
    if (media.tone === 'ink' && media.license !== 'Public domain' && media.license !== 'CC0') fail(`${where} may not be ink-filtered: only public-domain and CC0 files can be altered`);
  }
  if (reel.score) {
    if (!(REEL_LICENSES as readonly string[]).includes(reel.score.license)) fail(`score has licence "${reel.score.license}", which is not on the allowlist`);
    if (!reel.score.credit.trim() || !isCommonsFile(reel.score.page) || !isCommonsMedia(reel.score.src)) fail('score needs a credit, its Commons page and a Commons file');
  }

  // Prediction: a prequestion, never a check.
  const { prediction } = reel;
  if (!prediction.id.startsWith('pre:')) fail('prediction id must start with "pre:"');
  const bare = prediction.id.slice(4);
  for (const check of checks) {
    if (check.gradeId === prediction.id || check.gradeId === bare) fail(`prediction reuses check "${check.gradeId}"`);
    if (sharesRun(prediction.prompt, check.prompt)) fail(`prediction shares ${REEL_LIMITS.overlapWords} words in a row with check "${check.gradeId}"`);
  }
  style(prediction.prompt, 'prediction prompt', REEL_LIMITS.prompt);
  if (prediction.choices.length < 2 || prediction.choices.length > 4) fail('prediction needs 2–4 choices');
  if (new Set(prediction.choices.map(choice => choice.id)).size !== prediction.choices.length) fail('prediction choice ids repeat');
  for (const choice of prediction.choices) style(choice.label, `choice "${choice.id}"`, REEL_LIMITS.choice);
  if (!prediction.choices.some(choice => choice.id === prediction.answer)) fail('prediction answer is not one of its choices');
  if (!Number.isInteger(prediction.reveal) || prediction.reveal < 0 || prediction.reveal >= reel.frames.length) fail('prediction reveal must name one of the frames');
  cite(prediction.claims, 'prediction');

  // Claims: unique, said, and every one used.
  if (new Set(reel.sources.map(source => source.id)).size !== reel.sources.length) fail('source ids repeat');
  for (const source of reel.sources) {
    if (!source.claim.trim()) fail(`claim "${source.id}" is empty`);
    if (!cited.has(source.id)) fail(`claim "${source.id}" is never used`);
  }
}

/** Narration made from these exact captions, frame by frame, and a story of 20–50 seconds. */
function checkNarration(reel: Reel, audio: ReelNarration | undefined, fail: Fail, path: RegExp, missing: string, where: string) {
  if (!audio) { fail(missing); return; }
  if (audio.frames.length !== reel.frames.length) fail('narration has a different number of frames');
  reel.frames.forEach((frame, index) => {
    const timing = audio.frames[index];
    if (!timing) return;
    if (timing.hash !== frameHash(frame)) fail(`frame ${index + 1} caption changed since its narration was made (run ${where})`);
    if (timing.lines.length !== splitLines(spokenText(frame)).length) fail(`frame ${index + 1} narration has the wrong number of lines`);
    if (!(timing.start < timing.end) || timing.lines.some(([start, end]) => start < timing.start || end > timing.end || start >= end)) fail(`frame ${index + 1} narration timing is out of order`);
    if (index && audio.frames[index - 1].end !== timing.start) fail(`frame ${index + 1} does not start where frame ${index} ends`);
  });
  const [low, high] = REEL_LIMITS.seconds;
  if (audio.duration < low || audio.duration > high) fail(`story runs ${audio.duration.toFixed(1)} s; a reel runs ${low}–${high} s`);
  if (!path.test(audio.src)) fail(`narration file must match ${path.source}`);
}

export function validateReel(reel: Reel, ctx: ReelContext): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${reel.id}: ${message}`);
  const placed = ctx.expedition(reel.packId);

  // Place: the tag must name a real atlas place, and Prove it must lead to this pack's check.
  if (!ctx.nodeExists(reel.nodeId)) fail(`tagged node ${reel.nodeId} is not in the catalog`);
  if (!placed) fail(`pack ${reel.packId} is not a placed expedition`);
  else if (placed.nodeId !== reel.nodeId) fail(`tagged node ${reel.nodeId} is not where ${reel.packId} lives (${placed.nodeId})`);

  checkBody(reel, ctx.checks, fail);

  // Sources: each traced to the pack's own provenance (or a file page shown here), never a transfer check's.
  const allowed = new Set<string>([...(placed?.pack.provenance.map(entry => entry.source) ?? []), ...Object.values(reel.media).map(media => media.page)]);
  const forbidden = new Set(TRANSFER_ONLY_SOURCES[reel.packId] ?? []);
  for (const source of reel.sources) {
    if (!allowed.has(source.cite)) fail(`claim "${source.id}" cites "${source.cite}", which is not in ${reel.packId}'s provenance`);
    if (forbidden.has(source.cite)) fail(`claim "${source.id}" cites a source reserved for a transfer check`);
  }

  // Narration: made from these exact captions, and the story runs 20–50 seconds.
  checkNarration(reel, ctx.narration.reels[reel.id], fail, /^explore\/narration\/[a-z0-9-]+\.mp3$/, 'has no narration timing (run node scripts/narrate-reels.mjs)', 'node scripts/narrate-reels.mjs');
  return errors;
}

export function validateDeck(reels: readonly Reel[], ctx: ReelContext): string[] {
  const errors = reels.flatMap(reel => validateReel(reel, ctx));
  const repeated = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  for (const id of repeated(reels.map(reel => reel.id))) errors.push(`deck: reel id "${id}" repeats`);
  for (const id of repeated(reels.map(reel => reel.prediction.id))) errors.push(`deck: prediction id "${id}" repeats`);
  return errors;
}

// ── The reel engine's rules (scripts/reels, .claude/skills/generate-reels) ──────────────────────
// An engine reel may tag any atlas place, so it cannot lean on a pack's provenance. Instead every
// claim carries the exact words of a pinned source that back it, and the engine adds what a reel
// made without a person at the keyboard needs: a licence snapshot for every file, an expiry when
// the story is tied to a date, and a guarantee that it never gives away a check or a case.

/** What Commons said about a file when the engine checked it (scripts/reels/commons.mjs). */
export interface EngineMediaCheck {
  page: string;
  license: string;
  restrictions: string[];
  /** Filed under an AI-generated category or template on Commons. */
  aiGenerated: boolean;
  width: number;
  height: number;
  /** Drawn in black on a transparent background (how Commons renders most SVGs): it all but
   * disappears on the reel's near-black stage unless shown inked. Measured at assembly. */
  vanishes?: boolean;
  checkedAt: string;
}

/** A check item or case a reel must never give away: its words and the entities it relies on. */
export interface Spoiler {
  id: string;
  /** The atlas place it proves. */
  node: string;
  text: string;
  /** Named things the learner must meet fresh there. Empty for items on the pack's own scenarios. */
  entities: readonly string[];
}

export interface EngineReelContext {
  nodeExists: (nodeId: string) => boolean;
  /** The expedition pack placed at a node, if any: an engine reel's packId names it (or is empty). */
  packAt: (nodeId: string) => string | undefined;
  checks: ReelContext['checks'];
  /** Pinned source text by cite, and each Commons file's description by its file page. */
  sourceTexts: Readonly<Record<string, string>>;
  mediaChecks: Readonly<Record<string, EngineMediaCheck>>;
  spoilers: readonly Spoiler[];
  /** Cites (`Wikipedia: <Title>`) that back a transfer check somewhere: no engine reel may use one. */
  transferOnly: ReadonlySet<string>;
  /** File pages that already lead an evergreen reel: a new reel never opens on the same picture. */
  evergreenHeroes: ReadonlySet<string>;
}

export const ENGINE_LIMITS = { quote: [12, 600], heroSide: 640, expiryDays: 7 } as const;

/** Words that mark a reel as a date's story: it must carry an expiry. */
export const DATE_WORDS = /\b(today|tonight|yesterday|tomorrow|this (week|month|morning|evening|weekend)|right now|at the moment|on this day|this day in)\b/i;
/** The tells of mass-produced content, on top of HYPE: an engine reel uses none of them. */
export const SLOP = /\b(amazing|incredible|incredibly|astonishing|astounding|jaw[- ]?dropping|fascinating|stunning|breathtaking|epic|ever wondered|let['’]s dive|dive in|delve|tapestry|testament to|game[- ]?chang\w*|unveil\w*|unlock\w*|buckle up|here['’]s the (thing|kicker)|the answer (may|might|will) surprise|you['’]ll never guess|believe it or not|mind[- ]?boggling|whopping|a journey through|stay tuned)\b/i;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
const validDay = (day: string | undefined): day is string => !!day && DAY.test(day) && !Number.isNaN(dayNumber(day)) && new Date(`${day}T00:00:00Z`).toISOString().startsWith(day);
/** Quotes are compared with whitespace, quote marks and dashes normalised; nothing else. */
export const normaliseQuote = (text: string) => text.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[‐‑‒–—―]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word, case-insensitive, with an optional plural (the same test the banks use). */
const mentionsEntity = (text: string, entity: string) => new RegExp(`(^|[^\\p{L}])${escapeRe(entity)}(s|es)?(?![\\p{L}])`, 'iu').test(text);

/** Everything a learner reads in a reel (the narration says the same words, spelled for the voice). */
export const reelText = (reel: Reel) => [reel.title, reel.takeaway, reel.prediction.prompt, ...reel.prediction.choices.map(c => c.label), ...reel.frames.map(f => f.text)].join('\n');
const within = (node: string, place: string) => node === place || node.startsWith(`${place}.`) || place.startsWith(`${node}.`);

/** Why a reel would give a check item or case away, or null. Words: never 8 in a row from it,
 * anywhere. Situations: at the reel's own place (where Prove it leads) not one of the entities its
 * transfer items and cases rely on; elsewhere not a many-word one ("Daphne Major") nor two of one
 * item's, since one shared common name ("England", "bees") hands nothing over. */
export function spoils(reel: Reel, spoiler: Spoiler, text = reelText(reel)): string | null {
  const named = spoiler.entities.filter(entity => mentionsEntity(text, entity));
  if (named.length && within(spoiler.node, reel.nodeId)) return `names "${named[0]}", which ${spoiler.id} at this reel's own place relies on`;
  const specific = named.find(entity => /\s/.test(entity.trim()));
  if (specific) return `names "${specific}", which ${spoiler.id} relies on`;
  if (named.length >= 2) return `names ${named.slice(0, 3).map(e => `"${e}"`).join(' and ')}, which ${spoiler.id} relies on`;
  const run = sharedRun(text, spoiler.text);
  if (run) return `shares ${REEL_LIMITS.overlapWords} words in a row with ${spoiler.id} ("${run}")`;
  return null;
}

export function validateEngineReel(reel: EngineReel, ctx: EngineReelContext): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${reel.id}: ${message}`);
  checkBody(reel, ctx.checks, fail, (text, where) => {
    const slop = text.match(SLOP);
    if (slop) fail(`${where} reads like mass-produced content ("${slop[0]}")`);
  });

  // The title shows before the prediction (cards, screen readers): it must not give the answer away.
  const telling = (label: string) => new Set(label.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const key = reel.prediction.choices.find(c => c.id === reel.prediction.answer);
  if (key) {
    const others = new Set([...reel.prediction.choices.filter(c => c !== key).flatMap(c => [...telling(c.label)]), ...telling(reel.prediction.prompt)]);
    const given = [...telling(key.label)].filter(w => !others.has(w) && telling(reel.title).has(w));
    if (given.length) fail(`title gives the prediction away ("${given.join('", "')}")`);
  }

  // Where it came from and when it may show.
  if (!(REEL_TEMPLATES as readonly string[]).includes(reel.template)) fail(`template "${reel.template}" is not one of ${REEL_TEMPLATES.join(', ')}`);
  if (!/^[a-z]+:\S/.test(reel.story ?? '')) fail('names no story it was drafted from');
  if (!validDay(reel.from)) fail(`from "${reel.from}" is not a YYYY-MM-DD day`);
  else if (!reel.id.startsWith(`${reel.from}-`)) fail(`id must start with its day (${reel.from}-…)`);
  if (reel.expires !== undefined) {
    if (!validDay(reel.expires)) fail(`expires "${reel.expires}" is not a YYYY-MM-DD day`);
    else if (validDay(reel.from)) {
      const days = dayNumber(reel.expires) - dayNumber(reel.from);
      if (days < 1) fail('expires before it starts');
      if (days > ENGINE_LIMITS.expiryDays) fail(`stays up ${days} days; a date-bound reel expires within ${ENGINE_LIMITS.expiryDays}`);
      if (reel.template === 'this-day' && days !== 1) fail('a this-day reel expires the day after its day');
    }
  }
  const dated = reel.template === 'this-day' ? 'is a this-day reel' : DATE_WORDS.test(reelText(reel)) ? `says "${reelText(reel).match(DATE_WORDS)![0]}"` : null;
  if (dated && reel.expires === undefined) fail(`${dated}, so it is date-bound and needs an expiry`);

  // Place: any atlas place, and the pack named is the one placed there (or none).
  if (!ctx.nodeExists(reel.nodeId)) fail(`tagged node ${reel.nodeId} is not in the catalog`);
  else if (reel.packId !== (ctx.packAt(reel.nodeId) ?? '')) fail(`packId "${reel.packId}" is not the expedition at ${reel.nodeId} ("${ctx.packAt(reel.nodeId) ?? ''}")`);

  // Claims: each one quoted, word for word, from the pinned source it cites; the reel itself in its
  // own words (clean room: never eight words in a row from a source's prose).
  const pages = new Set(Object.values(reel.media).map(media => media.page));
  const said = reelText(reel);
  for (const cite of new Set(reel.sources.map(source => source.cite))) {
    const pinned = ctx.sourceTexts[cite];
    const run = pinned === undefined ? null : sharedRun(said, pinned);
    if (run) fail(`copies ${REEL_LIMITS.overlapWords} words in a row from ${cite} ("${run}"); write it in your own words`);
  }
  for (const source of reel.sources) {
    const where = `claim "${source.id}"`;
    const pinned = ctx.sourceTexts[source.cite];
    if (pinned === undefined) { fail(`${where} cites "${source.cite}", which is not a pinned source${pages.has(source.cite) ? ' (no description was pinned for this file)' : ''}`); continue; }
    if (ctx.transferOnly.has(source.cite)) fail(`${where} cites a source reserved for a transfer check`);
    const quote = normaliseQuote(source.quote ?? '');
    const [shortest, longest] = ENGINE_LIMITS.quote;
    if (!quote) { fail(`${where} has no quote from its source`); continue; }
    if (quote.length < shortest || quote.length > longest) fail(`${where} quote is ${quote.length} characters; a quote runs ${shortest}–${longest}`);
    if (!normaliseQuote(pinned).includes(quote)) fail(`${where} quote is not in ${source.cite}: "${quote.slice(0, 70)}${quote.length > 70 ? '…' : ''}"`);
  }

  // Media: a licence snapshot for every file, matching what is printed; a real hero image.
  for (const [key, media] of Object.entries(reel.media)) {
    const where = `media "${key}"`;
    const snapshot = ctx.mediaChecks[media.page];
    if (!snapshot) { fail(`${where} has no Commons licence snapshot`); continue; }
    if (snapshot.license !== media.license) fail(`${where} prints "${media.license}", but Commons says "${snapshot.license}"`);
    if (snapshot.restrictions.length) fail(`${where} carries Commons restrictions (${snapshot.restrictions.join(', ')})`);
    if (snapshot.aiGenerated) fail(`${where} is AI-generated`);
    if (media.tone === 'ink' && media.license !== 'Public domain' && media.license !== 'CC0') fail(`${where} is inked, which alters the picture; only public-domain or CC0 files may be`);
    if (snapshot.vanishes && media.tone !== 'ink') fail(`${where} is dark line art on a transparent background and would vanish on the reel (inking it is only for public-domain or CC0 files; choose another file)`);
    if (/^CC BY \d/.test(media.license) && media.fit !== 'contain' && !/\b(cropped|modified)\b/.test(media.credit)) fail(`${where} is CC BY and cropped to the frame, so its credit must say "cropped"`);
  }
  if (reel.media[reel.hero] && ctx.evergreenHeroes.has(reel.media[reel.hero].page)) fail(`opens on ${reel.media[reel.hero].page}, which already leads an evergreen reel`);
  const hero = reel.media[reel.hero] && ctx.mediaChecks[reel.media[reel.hero].page];
  if (hero && Math.max(hero.width, hero.height) < ENGINE_LIMITS.heroSide) fail(`hero is ${hero.width}×${hero.height}; a hero image is at least ${ENGINE_LIMITS.heroSide} px on its long side`);

  // Spoilers: a reel plays before any check, so it never hands over what a transfer item or a case
  // is about (spoils above).
  const text = reelText(reel);
  for (const spoiler of ctx.spoilers) { const why = spoils(reel, spoiler, text); if (why) fail(why); }

  // Narration: the reel carries its own, under its deck's folder.
  checkNarration(reel, reel.narration, fail, /^explore\/decks\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\.mp3$/, 'has no narration (run node scripts/reels/engine.mjs narrate <date>)', 'node scripts/reels/engine.mjs narrate <date>');
  return errors;
}

/** A dated deck as published: its reels, and the evergreen reels it mixes in. */
export interface DeckForValidation { date: string; reels: readonly EngineReel[]; evergreen: readonly string[] }

export function validateEngineDeck(deck: DeckForValidation, ctx: EngineReelContext, evergreenIds: readonly string[]): string[] {
  const errors = deck.reels.flatMap(reel => validateEngineReel(reel, ctx));
  const fail = (message: string) => errors.push(`deck ${deck.date}: ${message}`);
  if (!validDay(deck.date)) fail('date is not a YYYY-MM-DD day');
  if (!deck.reels.length) fail('has no reels');
  const repeated = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  for (const id of repeated(deck.reels.map(reel => reel.id))) fail(`reel id "${id}" repeats`);
  for (const id of repeated(deck.reels.map(reel => reel.prediction.id))) fail(`prediction id "${id}" repeats`);
  for (const story of repeated(deck.reels.map(reel => reel.story))) fail(`story "${story}" is told twice`);
  for (const page of repeated(deck.reels.map(reel => reel.media[reel.hero]?.page ?? ''))) fail(`two reels lead with the same image (${page})`);
  for (const reel of deck.reels) {
    if (evergreenIds.includes(reel.id)) fail(`reel id "${reel.id}" is already an evergreen reel`);
    if (reel.from > deck.date || (reel.expires !== undefined && reel.expires <= deck.date)) fail(`${reel.id} is not live on ${deck.date}`);
  }
  for (const id of deck.evergreen) if (!evergreenIds.includes(id)) fail(`evergreen reel "${id}" does not exist`);
  for (const id of repeated([...deck.evergreen])) fail(`evergreen reel "${id}" repeats`);
  return errors;
}
