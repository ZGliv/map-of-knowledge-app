// A concept pack is pure data. Every subject is written in the same small
// vocabulary of beats; the renderers in /blocks and /sims are built once.
// Nothing here is a function, so a generator can emit it as JSON.

export type Confidence = 'guess' | 'fair' | 'certain';

export interface Media {
  src: string;
  alt: string;
  credit: string;      // shown under the media, e.g. "NASA · Public domain"
  page: string;        // the Commons/archive page the credit links to
  date?: string;       // when the object was made, shown where dating matters
  /** 'ink' shows a black-on-white engraving as light lines on the territory colour. */
  tone?: 'ink';
  sources?: { src: string; type: string }[]; // video/audio alternates
  /** License short name, e.g. 'CC BY-SA 4.0'. ShareAlike files are never filtered, zoomed or cropped. */
  license?: string;
  /** 'paper' sets a transparent diagram on a white card, as published. */
  backdrop?: 'paper';
}

export interface Choice {
  id: string;
  label: string;
  media?: string;
  /** Shown when this choice was picked and is wrong: why it tempts, and why it fails. */
  feedback?: string;
}

/** A graded moment. `transfer` marks an unseen-situation check that can earn Understood. */
export interface Graded { gradeId: string; transfer?: boolean }

export interface CoverBeat {
  kind: 'cover'; media: string; title: string; hook: string; focus?: [number, number];
  /** A content note for sensitive packs (plan §9.5), shown under the time. */
  note?: string;
}

export interface PredictBeat extends Graded {
  kind: 'predict';
  prompt: string;
  media?: string;
  /** A code-drawn figure (see blocks/Diagram.tsx). It may change once the answer is locked. */
  diagram?: DiagramSpec;
  parts: { id: string; label: string; choices: Choice[]; answer: string }[];
  /** With an explanation the answer is revealed at once. Without one, a later footage beat reveals it. */
  explain?: string;
}

/** Diagrams are drawn in code from data, so they need no licence and can respond to the learner. */
export type DiagramSpec =
  | { kind: 'bands'; title: string; bands: string[]; note: string }
  | { kind: 'karyotype'; rows: { label: string; pairs: number; mark: number[] }[]; fused: { from: string; into: string; notes: string[] } }
  /** A plain dish copied by velvet onto several treated dishes; `spots` are colony positions (0–1) shared by every copy. */
  | { kind: 'replica'; title: string; source: string; copies: string[]; spots: [number, number][]; note: string };

export interface FootageBeat {
  kind: 'footage';
  media: string;
  /** Still image shown before the clip plays, and instead of it if the video fails. */
  poster?: string;
  caption: string;
  /** Shown after the clip, comparing the learner's earlier prediction. Without it the clip simply plays. */
  reveal?: { predictGrade: string; part: string; text: string };
}

export interface DocFrame { media: string; x: number; y: number; zoom: number; text: string; seconds: number }
export interface DocumentaryBeat { kind: 'documentary'; title: string; frames: DocFrame[]; score?: string }

export interface DialogueLine { who: string; text: string }
export interface DialogueChoicePoint extends Graded {
  ask: string;
  choices: Choice[];
  answer: string;
  /** The real next line(s) of the source, revealed after choosing. */
  then: DialogueLine[];
}
export interface DialogueBeat {
  kind: 'dialogue';
  source: { title: string; detail: string; page: string };
  cast: Record<string, { name: string; note: string }>;
  learner: string;
  script: (DialogueLine | DialogueChoicePoint)[];
}

export interface SourceBeat extends Graded {
  kind: 'source';
  source: { title: string; detail: string; page: string };
  /** Text with [[phrase|noteId]] marks. */
  passage: string[];
  notes: Record<string, string>;
  question: { prompt: string; choices: Choice[]; answer: string; explain?: string };
}

export interface OrderBeat extends Graded {
  kind: 'order';
  prompt: string;
  items: { id: string; label: string; sound?: SoundSpec }[];
  answer: string[];
  ends: [string, string];
  explain: string;
  /** A figure the steps describe, shown above the list. */
  media?: string;
}

export interface MatchBeat extends Graded {
  kind: 'match';
  prompt: string;
  left: { id: string; label: string; sound?: SoundSpec }[];
  right: { id: string; label: string }[];
  pairs: Record<string, string>;
  explain: string;
  /** A figure the pairs refer to, shown above the list. */
  media?: string;
  /** Right-hand labels are buckets that several items can share. */
  buckets?: boolean;
}

export interface SpotBeat extends Graded {
  kind: 'spot';
  prompt: string;
  options: { id: string; media: string; year: number; label: string; yearLabel?: string; focus?: [number, number] }[];
  answer: string;
  timeline: { from: number; to: number; band: [number, number, string] };
  explain: string;
}

export interface FlawBeat extends Graded {
  kind: 'flaw';
  prompt: string;
  steps: { id: string; text: string }[];
  answer: string;
  explain: string;
}

export interface NumberBeat extends Graded {
  kind: 'number';
  /** Named generator in engine/variants.ts; params keep the content declarative. */
  generator: string;
  params: Record<string, unknown>;
}

export interface SimBeat {
  kind: 'sim';
  sim: 'dropTower' | 'monochord' | 'waveMixer' | 'spreadMap'
    | 'driftLab' | 'fluctuation' | 'deepTime' | 'lifeChart'
    | 'mothHunt' | 'peaCross' | 'treeSpin'
    | 'lineageRewind' | 'tradeOff' | 'nestTest' | 'sequenceLab';
  title: string;
  goal: string;
  params: Record<string, unknown>;
  grades?: Graded[];
}

export interface PayoffBeat {
  kind: 'payoff';
  idea: string;
  /** `to` opens another pack; `node` is the atlas place the connection lives in. */
  connections: { title: string; place: string; to?: string; node?: string }[];
}

export type SoundSpec = { type: 'interval'; base: number; ratio: [number, number] };

export type Beat = CoverBeat | PredictBeat | FootageBeat | DocumentaryBeat | DialogueBeat | SourceBeat
  | OrderBeat | MatchBeat | SpotBeat | FlawBeat | NumberBeat | SimBeat | PayoffBeat;

export interface Pack {
  id: string;
  title: string;
  question: string;
  path: string[];
  hue: number;
  minutes: number;
  media: Record<string, Media>;
  beats: Beat[];
  provenance: { claim: string; source: string }[];
}
