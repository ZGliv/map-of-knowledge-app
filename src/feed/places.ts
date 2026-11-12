// Atlas places for videos: which places a tag may name, and how a stored tag is checked against
// the real catalog. IDs are dotted paths (knowledge.science.physics…), so a tag whose place has
// been renamed or removed falls back to its nearest surviving ancestor rather than vanishing.

export interface PlaceNode {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly depth: number;
  readonly sample?: boolean;
}

export interface PlaceLookup {
  get(id: string): PlaceNode | undefined;
  all(): readonly PlaceNode[];
}

/** The deepest illustrative levels (worked steps like "A steeper segment") are not topics. */
const SAMPLE_MAX_DEPTH = 7;

/** Places a video may be tagged to: real territories and fields, the charted places, and the
 * illustrative chains down to the level where they stop being topics. Never the root, and never
 * an interactive encounter's own node. */
export function taggablePlaces(lookup: PlaceLookup): PlaceNode[] {
  return lookup.all().filter(node => node.depth > 0 && !node.id.endsWith('.demonstration') && (!node.sample || node.depth <= SAMPLE_MAX_DEPTH));
}

/** The place itself when it exists, else its nearest existing ancestor (never the bare root). */
export function nearestPlace(id: string, lookup: Pick<PlaceLookup, 'get'>): string | null {
  const parts = id.split('.');
  while (parts.length > 1) {
    const candidate = parts.join('.');
    if (lookup.get(candidate)) return candidate;
    parts.pop();
  }
  return null;
}

export interface PlaceCheck {
  /** The places to use, deduplicated, at most three. */
  places: string[];
  /** Tags that named a missing place and were moved up to an ancestor. */
  moved: { from: string; to: string }[];
  /** Tags with no surviving place at all. */
  dropped: string[];
}

/** Check a tag's places against the catalog: keep real ones, lift missing ones to their nearest
 * ancestor, drop the rest, and drop an ancestor when one of its descendants is also tagged. */
export function checkPlaces(ids: readonly string[], lookup: Pick<PlaceLookup, 'get'>): PlaceCheck {
  const moved: PlaceCheck['moved'] = [];
  const dropped: string[] = [];
  const kept: string[] = [];
  for (const raw of ids) {
    const id = String(raw).trim();
    const place = nearestPlace(id, lookup);
    if (!place) { dropped.push(id); continue; }
    if (place !== id) moved.push({ from: id, to: place });
    if (!kept.includes(place)) kept.push(place);
  }
  const places = kept.filter(id => !kept.some(other => other !== id && other.startsWith(`${id}.`))).slice(0, 3);
  return { places, moved, dropped };
}

/** The territory (depth 1) a place belongs to: "knowledge.science". */
export const territoryOf = (id: string) => id.split('.').slice(0, 2).join('.');
/** The field (depth 2) a place belongs to, or the territory for a territory: "knowledge.science.physics". */
export const fieldOf = (id: string) => id.split('.').slice(0, 3).join('.');
/** True when `id` is `scope` or lies inside it. */
export const isWithin = (id: string, scope: string) => id === scope || id.startsWith(`${scope}.`);

/** How far apart two places are on the tree: 0 for the same place, 1 for parent and child or two
 * siblings, and so on up through their nearest common ancestor. */
export function placeDistance(a: string, b: string): number {
  const pa = a.split('.'), pb = b.split('.');
  let common = 0;
  while (common < pa.length && common < pb.length && pa[common] === pb[common]) common++;
  if (common === pa.length && common === pb.length) return 0;
  const up = pa.length - common, down = pb.length - common;
  // Siblings are as close as parent and child: both are one step from the shared parent.
  return Math.max(up, down) + Math.min(up, down) - (up > 0 && down > 0 ? 1 : 0);
}
