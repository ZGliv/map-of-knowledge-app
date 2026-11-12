import type { DiagramA } from './diagrams-a';
import type { DiagramB } from './diagrams-b';

// A reel is pure data, rendered live in the browser: real images with a slow camera move,
// timed real-text captions, optional pre-recorded narration and code-drawn diagrams.
// Nothing here is a function, so a generator could emit it as JSON.
//
// The evidence rule for reels (mok-content-lab docs/research/explore-feed-feasibility.md §3.6):
// watching a reel never colors the map. Its opening prediction comes from a separate pool of
// prequestions that never counts as evidence; only a passed check colors land.

/** Licences a reel may show. Anything else (NC, ND, unknown) fails validation. */
export const REEL_LICENSES = ['Public domain', 'CC0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0'] as const;
export type ReelLicense = (typeof REEL_LICENSES)[number];

export interface ReelMedia {
  /** A Wikimedia Commons image (upload.wikimedia.org or thumb.wikimedia.org). */
  src: string;
  alt: string;
  /** Who made it, for the credits: "John Gould, 1845". */
  credit: string;
  license: ReelLicense;
  /** The Commons file page, where the licence was checked. */
  page: string;
  /** 'ink' shows a black-on-white engraving as light lines on the territory's color (public domain only). */
  tone?: 'ink';
  /** 'contain' shows the whole picture, unmoved and uncropped. ShareAlike files must use it. */
  fit?: 'cover' | 'contain';
}

/** A claim the reel makes, and where it comes from: one of the pack's own provenance sources. */
export interface ReelSource {
  id: string;
  claim: string;
  cite: string;
  /** Engine reels only: the exact words of the pinned source that back the claim. Checked when the
   * reel is made, then left out of the published deck (the source's text stays with its source). */
  quote?: string;
}

/** Code-drawn diagrams (explore/diagrams). They need no licence and animate with the frame. */
export type ReelDiagram =
  | { name: 'plate'; step: 'bands' | 'stall' | 'breakthrough' | 'march' }
  | { name: 'sorting'; step: 'before' | 'drug' | 'regrow' }
  | { name: 'strata'; step: 'gap' | 'target' }
  | { name: 'fall'; step: 'air' | 'moon' }
  | { name: 'waves'; step: 'octave' }
  | DiagramA
  | DiagramB;

interface FrameBase {
  /** The caption, shown as real text. It is also what the narration says, unless `say` is set. */
  text: string;
  /** Narration only: the same words spelled for the voice ("Ensatina" as "en-sa-TEE-na"). */
  say?: string;
  /** IDs in the reel's `sources`: every frame states something sourced. */
  claims: string[];
}
/** A still with a slow camera move toward a focal point (percent of the image) at a zoom. */
export interface ImageFrame extends FrameBase { media: string; x: number; y: number; zoom: number; diagram?: undefined }
export interface DiagramFrame extends FrameBase { diagram: ReelDiagram; media?: undefined }
export type ReelFrame = ImageFrame | DiagramFrame;

/** The one-tap opener. Prequestion pool only: never evidence, never a check item. */
export interface ReelPrediction {
  /** Always `pre:`-prefixed, so it can never collide with a check's grade ID. */
  id: `pre:${string}`;
  prompt: string;
  choices: { id: string; label: string }[];
  answer: string;
  /** The frame whose caption settles it; the learner's pick is recalled there. */
  reveal: number;
  claims: string[];
}

export interface Reel {
  id: string;
  title: string;
  /** The atlas place this idea belongs to: its subject tag, and where Prove it leads. */
  nodeId: string;
  /** The expedition pack it was cut from; every source comes from that pack's provenance. */
  packId: string;
  /** The real hero asset: the first frame shows it, and so does the prediction behind its question. */
  hero: string;
  prediction: ReelPrediction;
  frames: ReelFrame[];
  /** The one idea, in a sentence, for the end card. */
  takeaway: string;
  media: Record<string, ReelMedia>;
  sources: ReelSource[];
  /** Period music under the narration, when sound is on. */
  score?: { src: string; credit: string; license: ReelLicense; page: string };
}

export const isShareAlike = (license: ReelLicense) => license.startsWith('CC BY-SA');

/** A reel's narration timing, in seconds (scripts/narrate-reels.mjs, scripts/reels/engine.mjs narrate). */
export interface NarrationFrame { hash: string; start: number; end: number; lines: [number, number][] }
export interface ReelNarration { src: string; bytes: number; duration: number; frames: NarrationFrame[] }

/** The reel engine's story shapes (.claude/skills/generate-reels): a few distinct ones, so a day's
 * set never reads as one reel five times. Each has its own kind of prediction hook. */
export const REEL_TEMPLATES = ['this-day', 'number', 'myth', 'how-we-know', 'picture'] as const;
export type ReelTemplate = (typeof REEL_TEMPLATES)[number];

/** A reel the engine made for a dated deck (public/explore/decks/<date>.json). Its claims rest on
 * pinned source text instead of a pack's provenance, it may tag any atlas place, and it carries its
 * own narration timing, since dated decks ship without rebuilding the app. */
export interface EngineReel extends Reel {
  template: ReelTemplate;
  /** The story it was drafted from, `<source>:<key>`, for dedupe and the audit trail. */
  story: string;
  /** What it is about (a Wikipedia page, or a place's claim), so a later day never retells it. */
  subject?: string;
  /** The first local day it may show, YYYY-MM-DD. */
  from: string;
  /** Date-bound reels only: the first local day it may no longer show. */
  expires?: string;
  narration: ReelNarration;
}

export const isEngineReel = (reel: Reel): reel is EngineReel => 'story' in reel && 'template' in reel;
