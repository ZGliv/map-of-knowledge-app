// Where a video or a reel fits, for the Save sheet: its own places first, then close relatives on the
// map (the place above it, and the places beside and beneath it only when its title or learn line
// names them) and the learner's own places near it (in view, underway, saved, lit), ranked. Nothing is
// suggested just for being next door: a History video is not offered The Medieval World unless it is
// about it, and the sheet shows fewer places rather than a guess. And a plain search over the map for
// any other place. Pure: the catalog goes in.

import { keywords } from './interest';
import { placeDistance, territoryOf, type PlaceLookup, type PlaceNode } from './places';

export interface SaveLookup extends PlaceLookup {
  children(id: string): readonly PlaceNode[];
}

export interface SaveInput {
  /** The video's or reel's own places, primary first. */
  tagged: readonly string[];
  /** Its title and what you learn, for matching place names. */
  text: string;
  /** The learner's places, most telling first: in view, underway or recent, saved, lit. */
  mine: readonly string[];
}

/** A place a learner can keep things under: not the root, not an encounter's own node, not the
 * illustrative steps deep inside a worked example. */
export const savable = (node: PlaceNode | undefined): node is PlaceNode => !!node && node.depth > 0 && !node.id.endsWith('.demonstration') && !(node.sample && node.depth > 6);

/** How many of a place name's words the text uses (singulars and plurals alike), leaving out words
 * already in `except` (a sibling of natural selection does not fit better for saying "selection"). */
function named(name: string, words: ReadonlySet<string>, except = ''): number {
  const own = new Set(keywords(except, 4));
  return keywords(name, 4).filter(word => words.has(word) && !own.has(word)).length;
}
/** The text names the place: every word of a one- or two-word name ("Black Death" needs both), two
 * of a longer one. */
export function names(name: string, words: ReadonlySet<string>, except = ''): boolean {
  const own = new Set(keywords(except, 4));
  const wanted = keywords(name, 4).filter(word => !own.has(word));
  return wanted.length > 0 && wanted.filter(word => words.has(word)).length >= Math.min(2, wanted.length);
}

/** The best `count` places for it, best first. */
export function suggestPlaces(input: SaveInput, lookup: SaveLookup, count = 3): string[] {
  const words = new Set(keywords(input.text, 12));
  const scores = new Map<string, number>();
  const add = (id: string | null | undefined, score: number) => {
    const node = id ? lookup.get(id) : undefined;
    if (!savable(node)) return;
    // A bare territory says little about where a thing belongs.
    const s = node.depth === 1 && !input.tagged.includes(node.id) ? score * 0.5 : score;
    scores.set(node.id, Math.max(scores.get(node.id) ?? 0, s));
  };
  const tagged = input.tagged.filter(id => savable(lookup.get(id)));
  tagged.forEach((id, i) => {
    add(id, i === 0 ? 1 : 0.82);
    const node = lookup.get(id)!;
    if (node.parentId) {
      add(node.parentId, 0.42);
      for (const sibling of lookup.children(node.parentId)) if (sibling.id !== id && names(sibling.name, words, node.name)) add(sibling.id, 0.2 + 0.25 * named(sibling.name, words, node.name));
    }
    for (const child of lookup.children(id)) if (names(child.name, words, node.name)) add(child.id, 0.28 + 0.25 * named(child.name, words, node.name));
  });
  input.mine.slice(0, 16).forEach((id, i) => {
    const node = lookup.get(id);
    if (!savable(node)) return;
    const weight = 1 - 0.05 * i;
    const near = Math.min(...tagged.map(t => placeDistance(t, id)), 99);
    const sameTerritory = tagged.some(t => territoryOf(t) === territoryOf(id));
    if (near <= 3) add(id, (0.62 - 0.05 * near) * weight + 0.2 * named(node.name, words));
    else if (sameTerritory && named(node.name, words)) add(id, 0.3 * weight + 0.2 * named(node.name, words));
  });
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(([id]) => id);
}

/** Places whose names match `query`: names that start with it first, then any word that does, then
 * the rest; shallower places before deeper ones. */
export function searchPlaces(query: string, lookup: Pick<PlaceLookup, 'all'>, limit = 6): PlaceNode[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: { node: PlaceNode; rank: number }[] = [];
  for (const node of lookup.all()) {
    if (!savable(node)) continue;
    const name = node.name.toLowerCase();
    const rank = name.startsWith(q) ? 0 : name.split(/[\s-]+/).some(word => word.startsWith(q)) ? 1 : name.includes(q) ? 2 : -1;
    if (rank >= 0) hits.push({ node, rank });
  }
  return hits.sort((a, b) => a.rank - b.rank || a.node.depth - b.node.depth || a.node.name.localeCompare(b.node.name)).slice(0, limit).map(hit => hit.node);
}
