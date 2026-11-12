/** The shelf: everything pinned to one place on the map, and what the learner has finished of it.
 * Core items (a place's card, read and pack) fill the map; extras (videos, reels, links out) are
 * shown with a done state and never change fill. */

export type CoreKind = 'card' | 'read' | 'pack';
export type ExtraKind = 'video' | 'reel' | 'link';
export type ItemKind = CoreKind | ExtraKind;

export const CORE_KINDS: readonly CoreKind[] = ['card', 'read', 'pack'];
/** A place card is a one-minute read. */
export const CARD_MINUTES = 1;

/** One thing pinned to exactly one place. */
export interface ShelfItem {
  id: string;
  kind: ItemKind;
  /** The catalog node it is pinned to. */
  placeId: string;
  title: string;
  minutes: number;
  /** Counts toward fill (card, read, pack). */
  core: boolean;
  /** Where it opens, for links out. */
  url?: string;
}

/** Core minutes of one place: [card, read, pack], 0 where the place lacks that item. */
export type CoreMinutes = readonly [card: number, read: number, pack: number];

/** public/auto/shelf.json, written by scripts/auto/shelf.mjs. */
export interface ShelfIndex {
  schema: 'mok.shelf/1';
  core: Readonly<Record<string, CoreMinutes>>;
  /** How many quick questions each place has (its glow's denominator). */
  quick?: Readonly<Record<string, number>>;
}

export interface ShelfGuess { right: boolean; at: string }

/** localStorage 'mok-shelf-v1'. Append-only: done is forever, and a guess's first answer wins. */
export interface ShelfState {
  version: 1;
  done: Readonly<Record<string, string>>;
  guesses: Readonly<Record<string, ShelfGuess>>;
  /** Places whose fill reached 100%, and when: complete for good, whatever is added to them later.
   * Older saved shelves have none. */
  complete: Readonly<Record<string, string>>;
}

export const cardId = (placeId: string) => `${placeId}#card`;
export const readId = (placeId: string) => `${placeId}#read`;
export const packId = (placeId: string) => `${placeId}#pack`;
export const videoItemId = (youtubeId: string) => `video:${youtubeId}`;
export const reelItemId = (reelId: string) => `reel:${reelId}`;
export const linkItemId = (placeId: string, linkId: string) => `link:${placeId}:${linkId}`;
export const coreItemId = (placeId: string, kind: CoreKind) => `${placeId}#${kind}`;

/** A core item's place and kind, or null for an extra (or anything else). */
export function parseCoreId(id: string): { placeId: string; kind: CoreKind } | null {
  const at = id.lastIndexOf('#');
  if (at <= 0) return null;
  const kind = id.slice(at + 1);
  return kind === 'card' || kind === 'read' || kind === 'pack' ? { placeId: id.slice(0, at), kind } : null;
}

/** The place a quick question belongs to: its id is '<placeId>:q<n>'. */
export function guessPlace(quickItemId: string): string | null {
  const match = /^(.+):q\d+$/.exec(quickItemId);
  return match ? match[1] : null;
}
