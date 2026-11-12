import { catalog } from './catalog';
import { SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { Polygon } from '../spatial/types';

export interface SubjectTheme {
  readonly key: string;
  readonly nodeId: string;
  readonly name: string;
  readonly color: string;
}

export interface TerritoryPalette {
  readonly start: string;
  readonly middle: string;
  readonly end: string;
}

export type TerritoryHueRange = readonly [number, number];

// Each subject owns a related band of the spectrum. Its descendants inherit
// progressively smaller pieces of that band, rather than starting a new rainbow.
const SUBJECT_BANDS: { readonly key: string; readonly name: string; hues: readonly [number, number] }[] = [
  { key: 'science', name: 'Science', hues: [148, 216] },
  { key: 'technology', name: 'Technology', hues: [202, 246] },
  { key: 'humanities', name: 'Humanities', hues: [318, 353] },
  { key: 'society', name: 'Society', hues: [5, 35] },
  { key: 'mathematics', name: 'Mathematics', hues: [35, 62] },
  { key: 'arts', name: 'Arts', hues: [248, 306] },
  { key: 'earth', name: 'Earth', hues: [86, 148] },
  { key: 'economics', name: 'Economics', hues: [56, 91] },
];

/*
 * Prototype (`?shade=ring&ring=today`): the subjects stay where they are today, and the wheel's bands
 * are handed out around them in the order they sit, turned and flipped so each subject's new colour
 * is as close as it can be to its old one. Neighbours then always hold neighbouring colours.
 */
const wheelAroundToday = (() => {
  try {
    const query = new URLSearchParams(globalThis.location?.search ?? '');
    return query.get('shade') === 'ring' && query.get('ring') === 'today';
  } catch { return false; }
})();
if (wheelAroundToday) {
  const height = 2165;
  const world = new SpatialLayoutEngine().layout(catalog.root, catalog.getChildren(catalog.root), [[0, 0], [0, height], [1000, height], [1000, 0]]);
  const turnOf = ([x, y]: readonly [number, number]) => ((Math.atan2(y - height / 2, x - 500) / (Math.PI * 2) + .25) % 1 + 1) % 1;
  const around = [...world].sort((a, b) => turnOf(a.centroid) - turnOf(b.centroid)).map(region => region.node.id.slice('knowledge.'.length));
  const wheel = [...SUBJECT_BANDS].sort((a, b) => a.hues[0] - b.hues[0]).map(subject => subject.hues);
  const middle = (hues: readonly [number, number]) => (hues[0] + hues[1]) / 2;
  const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  let best: (readonly [number, number])[] = [], cost = Infinity;
  for (const flip of [false, true]) for (let turn = 0; turn < wheel.length; turn += 1) {
    const handed = around.map((_, index) => wheel[((flip ? -index : index) + turn + wheel.length * 2) % wheel.length]);
    const total = around.reduce((sum, key, index) => sum + apart(middle(SUBJECT_BANDS.find(subject => subject.key === key)!.hues), middle(handed[index])), 0);
    if (total < cost) { cost = total; best = handed; }
  }
  for (const subject of SUBJECT_BANDS) subject.hues = best[around.indexOf(subject.key)] ?? subject.hues;
}

// Fixed chroma and lightness keep subject bands balanced against the dark map.
// Conversion happens here so callers can use the same colors in SVG, CSS and
// completion marks without relying on browser color interpolation behavior.
function hueToHex(hue: number): string {
  const saturation = 0.53;
  const lightness = 0.65;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const h = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs(h % 2 - 1));
  const rgb = h < 1 ? [chroma, x, 0]
    : h < 2 ? [x, chroma, 0]
      : h < 3 ? [0, chroma, x]
        : h < 4 ? [0, x, chroma]
          : h < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const offset = lightness - chroma / 2;
  return `#${rgb.map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`;
}

export const SUBJECT_THEMES: readonly SubjectTheme[] = SUBJECT_BANDS.map(subject => ({
  key: subject.key,
  nodeId: `knowledge.${subject.key}`,
  name: subject.name,
  color: hueToHex((subject.hues[0] + subject.hues[1]) / 2),
}));

export const NEUTRAL_TERRITORY_COLOR = '#81938b';
const NEUTRAL_PALETTE: TerritoryPalette = Object.freeze({
  start: NEUTRAL_TERRITORY_COLOR,
  middle: NEUTRAL_TERRITORY_COLOR,
  end: NEUTRAL_TERRITORY_COLOR,
});
const NEUTRAL_RANGE: TerritoryHueRange = Object.freeze([153, 153]);

export function subjectTheme(nodeId: string): SubjectTheme | undefined {
  return SUBJECT_THEMES.find(subject => nodeId === subject.nodeId || nodeId.startsWith(`${subject.nodeId}.`));
}

const ranges = new Map<string, TerritoryHueRange>(SUBJECT_BANDS.map(subject => [
  `knowledge.${subject.key}`, Object.freeze(subject.hues),
]));
const palettes = new Map<string, TerritoryPalette>();
const siblingOrders = new Map<string, readonly string[]>();
const canonicalEngine = new SpatialLayoutEngine();
const CANONICAL_CLIP: Polygon = [[0, 0], [0, 1000], [1000, 1000], [1000, 0]];

function orderedSiblings(parentId: string): readonly string[] {
  const existing = siblingOrders.get(parentId);
  if (existing) return existing;
  const parent = catalog.get(parentId)!;
  // A canonical spatial order puts neighboring colors near each other without
  // making an idea change color on rotation, resizing, navigation or reload.
  const order = [...canonicalEngine.layout(parent, catalog.getChildren(parent), CANONICAL_CLIP)]
    .sort((first, second) => first.centroid[0] - second.centroid[0]
      || first.centroid[1] - second.centroid[1]
      || first.node.index - second.node.index)
    .map(region => region.node.id);
  siblingOrders.set(parentId, order);
  return order;
}

/** Stable, contained hue interval. Unknown IDs inherit their nearest known parent. */
export function territoryHueRange(nodeId: string): TerritoryHueRange {
  const existing = ranges.get(nodeId);
  if (existing) return existing;
  const theme = subjectTheme(nodeId);
  if (!theme) return NEUTRAL_RANGE;
  const node = catalog.get(nodeId);
  if (!node?.parentId) {
    const parentId = nodeId.slice(0, nodeId.lastIndexOf('.'));
    return territoryHueRange(parentId);
  }
  const parentRange = territoryHueRange(node.parentId);
  const siblings = orderedSiblings(node.parentId);
  if (siblings.length <= 1) {
    ranges.set(nodeId, parentRange);
    return parentRange;
  }
  const rank = siblings.indexOf(nodeId);
  const span = parentRange[1] - parentRange[0];
  // Overlapping halves form a smooth family of shades. Dividing into disjoint
  // slices would exhaust visible color variation within a few levels.
  const childSpan = span / 2;
  const start = parentRange[0] + (span - childSpan) * rank / (siblings.length - 1);
  const end = Math.min(parentRange[1], start + childSpan);
  const range: TerritoryHueRange = Object.freeze([start, end]);
  ranges.set(nodeId, range);
  return range;
}

/** Three hex stops for a territory's inherited section of the spectrum. */
export function territoryPalette(nodeId: string): TerritoryPalette {
  const existing = palettes.get(nodeId);
  if (existing) return existing;
  if (!subjectTheme(nodeId)) return NEUTRAL_PALETTE;
  const [start, end] = territoryHueRange(nodeId);
  const palette = Object.freeze({
    start: hueToHex(start),
    middle: hueToHex((start + end) / 2),
    end: hueToHex(end),
  });
  palettes.set(nodeId, palette);
  return palette;
}

/** A compact accent or completion beacon uses the middle of its own palette. */
export function territoryColor(nodeId: string): string {
  return territoryPalette(nodeId).middle;
}
