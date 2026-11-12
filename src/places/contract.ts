// The place bundle: the one frozen template every atlas place is built to, old or new.
//
// A place is one terminal atlas leaf and everything that teaches and tests it:
//   - one expedition pack (expeditions/content/types.ts),
//   - 2–3 Explore reels cut from that pack (explore/types.ts),
//   - at least 3 new cases (cases/types.ts): situations the expedition never showed, played in a
//     sim archetype, where the learner's call against the model's computed outcome is the proof,
//   - one question bank (checks/types.ts), the fallback for accessibility and for retries,
//   - the sources behind every claim, and a licence snapshot for every media file.
// `validatePlace()` (places/validate.ts) holds every bundle to the same rules.
//
// Versioning: PLACE_SCHEMA names the contract. A change that would make an existing bundle
// invalid, or that changes what a field means, bumps the version; adding an optional field
// does not. The generator (scripts/generate/) writes this version and nothing else.
//
// Pure types and data: generated bundles import only types from here, so Node scripts can
// load them without a bundler.

import type { CheckBank } from '../checks/types';
import type { Pack } from '../expeditions/content/types';
import type { Reel } from '../explore/types';
import type { PlaceCase } from '../cases/types';

/** mok.place/2 (2026-10-17) adds `cases`, required: a /1 bundle has none, so it is not a valid /2. */
export const PLACE_SCHEMA = 'mok.place/2' as const;

/** PLAN §5.5: what a source may be used for. `ai_input` means a model may read it (only through
 * the fact sheet for Wikipedia); `link_only` sources are never model input. */
export type SourceUsage = 'ai_input' | 'display' | 'display_unmodified' | 'link_only' | 'metadata_only';

/** Licences a source may carry. Facts are not copyrightable; `facts-only` marks a paper or page
 * whose facts are cited but whose text is never copied. */
export type SourceLicence = 'CC0' | 'CC BY-SA 4.0' | 'CC BY 4.0' | 'Public domain' | 'facts-only';

export interface PlaceSource {
  /** Exactly the string the pack's provenance, the reels and the bank items cite. */
  id: string;
  kind: 'wikipedia' | 'wikidata' | 'paper' | 'pd-text' | 'reference' | 'commons' | 'museum' | 'gov';
  url: string;
  /** Wikipedia revision ID or Wikidata lastrevid, pinned when the facts were gathered. */
  revision?: string;
  /** ISO date the source was fetched. */
  retrieved: string;
  licence: SourceLicence;
  usage: SourceUsage[];
}

/** What the Commons API said about a media file when it was checked (scripts/generate/media.mjs). */
export interface MediaCheck {
  /** The Commons file page, as in Media.page. */
  page: string;
  /** Short licence name as the pack prints it ('CC BY 4.0', 'Public domain', …). */
  license: string;
  author: string;
  /** Commons "Restrictions" (trademark, personality rights, …). Must be empty to ship. */
  restrictions: string[];
  checkedAt: string;
}

/** One stage of the pipeline that produced the bundle, with its wall-clock minutes. */
export interface LineageStage { stage: string; minutes: number; by: 'script' | 'agent' | 'zack' }

export interface PlaceBundle {
  schema: typeof PLACE_SCHEMA;
  /** Slug, also the pack ID for generated places. */
  id: string;
  /** The terminal atlas leaf a pass colors. */
  nodeId: string;
  pack: Pack;
  reels: readonly Reel[];
  bank: CheckBank;
  /** New cases, in the order they are offered: the first ends the expedition, the rest are field
   * missions (a retry, the Lasting mission, a place the learner skipped). */
  cases: readonly PlaceCase[];
  /** Provenance sources that back only transfer items: no reel may cite them. */
  transferOnlySources: readonly string[];
  /** Every source the pack, reels and bank cite. */
  sources: readonly PlaceSource[];
  /** A licence snapshot for every media file the pack and reels show. */
  mediaChecks: readonly MediaCheck[];
  /** How the bundle was made. Absent for hand-written places. */
  lineage?: { pipeline: string; madeAt: string; stages: readonly LineageStage[] };
}

/** Every rule validatePlace runs, by ID. A legacy waiver names one of these. */
export const PLACE_RULES = {
  'place.leaf': 'The place is a terminal atlas leaf and the pack, reels and bank all point at it.',
  'pack.budget': '7–11 beats, cover first, payoff last; 5–8 graded beats with unique grade IDs.',
  'pack.transfer': 'At least two transfer checks, at least one of them open-response.',
  'pack.rhythm': 'An interaction by beat 2; never more than two passive beats in a row.',
  'pack.formats': 'At least one sim, at most one documentary; no format family more than twice or twice in a row.',
  'pack.prompts': 'Every prompt is 60 words or fewer.',
  'pack.feedback': 'Every wrong option in every multiple-choice moment has its own feedback.',
  'pack.keys': 'Key positions vary; keys come first at most a third of the time and are the longest option at most a quarter of the time.',
  'pack.wellFormed': 'Orders, matches and flaws are keyed to items that exist.',
  'pack.orderLabels': 'No years in ordering labels (dates give the order away).',
  'pack.style': 'No emoji, hype, ladder-of-life words or banned AI tells.',
  'pack.numbers': 'Number beats compute a finite answer for every case, and no answer is printed elsewhere in the pack.',
  'pack.sims': 'Every sim belongs to an archetype; its grade IDs, keys and stated results agree with its model.',
  'pack.media': 'Allowlisted Commons media only, credited with licence and alt text; ShareAlike never cropped, zoomed or filtered; CC BY crops say so; no unused or undeclared media.',
  'pack.provenance': 'At least 8 provenance entries, each a real claim with a real source.',
  'reels.count': '2–3 reels per place.',
  'reels.valid': 'Every reel passes the reel validator (sourced frames, narration, licences, prequestion never a check).',
  'reels.noPreteach': 'No reel names an entity a transfer check relies on, or shares 8 words in a row with a transfer item.',
  'bank.identity': 'Opaque item and family IDs; every graded beat maps to its own family; fresh families hold one item.',
  'bank.answers': 'Each item has exactly one defensible answer, a claim, an explanation and a source.',
  'bank.entities': 'Every listed entity appears in its item’s own text.',
  'bank.supply': '12+ items in 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios; three checks in a row can be drawn.',
  'bank.numbers': 'Number items are computed by a named generator, never typed, and never print their own answer.',
  'cases.supply': 'At least 3 new cases per place (the expedition’s last beat, a retry, the Lasting mission), with unique opaque IDs.',
  'cases.transfer': 'Transfer is computed: no case names an entity its expedition or reels name, and every listed entity is in the case’s own text. Across the atlas, no beat, reel, check item or case of another place (nor this place’s own check bank) names two of a case’s entities together or reuses its title, and nothing in a place names two of another place’s case entities together.',
  'cases.engine': 'Success is computed by the engine from the model: valid options, no typed answer, a neutral start, and a blind guess wins at most 1 in 5. A two-gene cross also falls to no reflex: the slider’s landmarks, a share the lesson shows, another case’s answer or share, one gene alone, the genes linked, the 9:3:3:1 table, or the sex split ignored.',
  'cases.seeded': 'Every case is seeded: the same seed gives the same run, and other seeds never change the winning call.',
  'cases.archetype': 'A case plays in one of the place’s own sim archetypes, or says why another fits better.',
  'cases.style': 'No quiz words (quiz, test, check, question, score, points), no emoji or hype; scenario and ask together are 70 words or fewer.',
  'cases.sources': 'Every case has a claim, a reveal and an https source; a generated place lists the source in its sources.',
  'sources.complete': 'Every cited source is listed with a URL, retrieval date, licence and usage.',
  'sources.allowed': 'No source is used beyond its licence: link-only sources are never model input; Wikipedia revisions are pinned.',
  'sources.quotes': 'Every quoted passage matches its pinned public-domain edition word for word (elisions marked …).',
  'sources.cleanRoom': 'No text shares a run of 8 words with a cached Wikipedia extract (the writer works from the fact sheet, never the prose).',
  'media.checked': 'Every media file has a Commons licence snapshot that matches the licence printed, with no restrictions.',
} as const;
export type PlaceRule = keyof typeof PLACE_RULES;
