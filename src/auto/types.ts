import type { Pack } from '../expeditions/content/types';

/** A generated quick-check question. Authored with the answer known; options are shuffled when shown. */
export interface QuickItem {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  answer: string;
  explain: string;
  /** Numbered sentences of the source that back the answer. */
  cites: number[];
}

/** One place's generated page: pure data, fetched on demand from /auto/<nodeId>.json. */
export interface AutoPlace {
  schema: 'mok.auto/1';
  nodeId: string;
  name: string;
  /** The explainer, two or three sentences in plain words, each backed by the source. */
  summary: { text: string; cites: number[] }[];
  facts: { label: string; value: string; cites: number[] }[];
  items: QuickItem[];
  image?: { src: string; alt: string; credit: string; license: string; page: string };
  source: { title: string; url: string; revision: number };
  /** A generated interactive pack, on the areas that have one. */
  pack?: Pack;
  /** The long read, compiled from the source: optional headings over paragraphs, each backed by the source. */
  read?: AutoRead;
  /** Free outside content worth the time (books, courses, documentaries...), ticked done by hand. */
  links?: AutoLink[];
}

export interface AutoRead {
  minutes: number;
  paragraphs: { heading?: string; text: string; cites: number[] }[];
}

export type AutoLinkKind = 'book' | 'course' | 'video' | 'documentary' | 'article' | 'primary';

export interface AutoLink {
  id: string;
  kind: AutoLinkKind;
  title: string;
  /** Author, teacher or publisher. */
  by: string;
  url: string;
  minutes?: number;
  /** Why it is worth the time, in a line. */
  note: string;
  license?: string;
}

/** A quick check is this long, and this many right proves the place. */
export const QUICK_SIZE = 3;
export const QUICK_PASS = 2;
