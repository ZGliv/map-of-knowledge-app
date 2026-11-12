import { memo, useId, type ReactNode } from 'react';
import { territoryColor, subjectTheme } from '../core/territoryTheme';
import { hashString } from '../spatial/deterministic';
import { polygonPath } from '../spatial/SpatialLayoutEngine';
import type { ShapedCell } from '../spatial/MapShape';
import type { RegionLayout } from '../spatial/types';
import type { GlyphKit } from './Glyph';
import type { Ground } from './mode';
import type * as Plates from './plates.generated';

export type PlateKit = typeof Plates;

/**
 * A subject's ground: one line drawing per subject, tiled, so every place inherits a texture
 * without anyone drawing one for it. Siblings differ by a seeded turn and scale; each place
 * draws it in its own hue. Every tile repeats seamlessly at its width and height.
 */
interface Terrain { readonly width: number; readonly height: number; readonly art: ReactNode }

const TERRAIN: Readonly<Record<string, Terrain>> = {
  // Science: a molecular lattice.
  science: { width: 20.78, height: 36, art: <path d="M0 6L10.39 0L20.78 6M0 6V18L10.39 24L20.78 18M10.39 24V36" fill="none"/> },
  // Technology: circuit traces and pads.
  technology: { width: 48, height: 48, art: <>
    <path d="M0 10H14L22 18H34L42 10H48M28 18V30L36 38V48M36 0V2M8 24V40H16" fill="none"/>
    <circle cx="8" cy="24" r="2" fill="none"/><circle cx="18" cy="40" r="2" fill="none"/><circle cx="36" cy="4" r="2" fill="none"/>
  </> },
  // Humanities: ruled lines of writing.
  humanities: { width: 64, height: 26, art: <path d="M3 8H17M21 8H36M40 8H45M49 8H61M3 20H9M13 20H30M34 20H52M56 20H61" fill="none" strokeLinecap="round"/> },
  // Society: people as stipple, a few of them connected.
  society: { width: 40, height: 40, art: <>
    <path d="M6 8L14 22L28 30" fill="none" opacity=".55"/>
    {[[6, 8, 1.7], [22, 5, 1.2], [33, 15, 1.8], [14, 22, 1.4], [28, 30, 1.6], [8, 35, 1.1], [37, 36, 1]].map(([x, y, r]) => <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill="currentColor" stroke="none"/>)}
  </> },
  // Mathematics: graph paper.
  mathematics: { width: 48, height: 48, art: <>
    <path d="M0 .5H48M.5 0V48" fill="none"/>
    <path d="M12 0V48M24 0V48M36 0V48M0 12H48M0 24H48M0 36H48" fill="none" opacity=".3"/>
  </> },
  // Arts: brushed waves.
  arts: { width: 72, height: 22, art: <path d="M0 9C18-1 18 19 36 9S54-1 72 9M0 14C18 4 18 24 36 14S54 4 72 14" fill="none" strokeLinecap="round"/> },
  // Earth: topographic contours around a summit.
  earth: { width: 120, height: 120, art: <>
    <path d="M60 14C88 12 108 34 104 60C100 88 82 106 58 104C30 102 14 84 16 58C18 32 34 16 60 14ZM60 28C80 27 93 42 90 61C87 80 74 91 57 89C39 87 29 75 30 58C31 41 42 29 60 28ZM61 43C71 43 77 51 75 61C73 70 66 75 58 74C49 73 44 66 45 58C46 50 52 43 61 43Z" fill="none"/>
    <circle cx="60" cy="59" r="1.6" fill="currentColor" stroke="none"/>
  </> },
  // Economics: a ledger of candlesticks.
  economics: { width: 44, height: 44, art: <>
    <path d="M7 10V32M17 6V24M27 14V36M37 8V28" fill="none"/>
    <path d="M5 15h4v10H5zM15 9h4v9h-4zM25 20h4v9h-4zM35 12h4v8h-4z" fill="currentColor" fillOpacity=".35"/>
  </> },
};

const WASH = .07;
const GROUND = .34;
const WALLPAPER = .32;
const PLATE = .5;

// Escape everything but letters and digits, so an ID never collides or breaks a url(#…).
const idPart = (value: string) => Array.from(value, c => /[a-zA-Z0-9]/.test(c) ? c : `_${c.codePointAt(0)!.toString(16)}_`).join('');

/** A tile of one place's own glyph, twice, turned a little: its land's wallpaper. */
function wallpaperTile(kit: GlyphKit, id: string): Terrain | undefined {
  const name = kit.GLYPH_OF[id];
  const body = name ? kit.GLYPH_SVG[name] : undefined;
  if (!body) return undefined;
  const glyph = (x: number, y: number, turn: number) => <g transform={`translate(${x} ${y}) rotate(${turn})`}>
    <svg x={-10} y={-10} width={20} height={20} viewBox="0 0 256 256" fill="currentColor" dangerouslySetInnerHTML={{ __html: body }}/>
  </g>;
  return { width: 64, height: 64, art: <g stroke="none">{glyph(16, 16, -12)}{glyph(48, 48, 10)}</g> };
}

/** Grey to the place's hue: dark stays dark, light takes its colour (a duotone in one matrix). */
function toneMatrix(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255 * .85);
  const row = (c: number) => `${c * .2126} ${c * .7152} ${c * .0722} 0 0`;
  return `${row(r)} ${row(g)} ${row(b)} 0 0 0 1 0`;
}

/** A place's own picture, or else its nearest ancestor's (marked borrowed). */
function plateFor(kit: PlateKit, id: string): { src: string; borrowed: boolean } | undefined {
  for (let at = id; at.includes('.'); at = at.slice(0, at.lastIndexOf('.'))) {
    const plate = kit.PLATE_OF[at];
    if (plate) return { src: plate.src, borrowed: at !== id };
  }
  return undefined;
}

export interface TerritoryArtProps {
  readonly regions: readonly RegionLayout[];
  readonly shapes?: ReadonlyMap<string, ShapedCell>;
  readonly opacity?: number;
  readonly ground: Ground;
  readonly glyphs?: GlyphKit | null;
  readonly plates?: PlateKit | null;
}

/** Each territory's tint and ground (texture, wallpaper or picture), beneath its light, names and borders. */
export const TerritoryArt = memo(function TerritoryArt({ regions, shapes, opacity = 1, ground, glyphs, plates }: TerritoryArtProps) {
  const prefix = `terrain-${idPart(useId())}`;
  if (opacity <= 0) return null;
  const drawn = regions.filter(region => region.polygon.length >= 3).map(region => {
    const id = region.node.id;
    const subject = subjectTheme(id)?.key;
    const hash = hashString(id);
    const plate = ground === 'plates' && plates ? plateFor(plates, id) : undefined;
    // A place with no picture keeps its subject's texture.
    const tile = ground === 'wallpaper' ? glyphs ? wallpaperTile(glyphs, id) : undefined : !plate && subject ? TERRAIN[subject] : undefined;
    const b = region.bounds;
    // A borrowed picture is drawn larger and shifted, so a place never repeats its parent's view.
    const zoom = plate?.borrowed ? 1.7 : 1, fx = (hash % 100) / 100, fy = ((hash >>> 7) % 100) / 100;
    return {
      id, tile, plate, color: territoryColor(id),
      frame: { x: b.x - b.width * (zoom - 1) * fx, y: b.y - b.height * (zoom - 1) * fy, width: b.width * zoom, height: b.height * zoom },
      path: shapes?.get(id)?.path ?? polygonPath(region.polygon),
      // Siblings turn and scale differently, so neighbours never look like one sheet.
      turn: ground === 'wallpaper' ? 0 : (hash % 120) - 60, scale: .9 + (hash >>> 8) % 40 / 100,
      key: `${prefix}-${idPart(id)}`,
    };
  });
  return <g className={`territory-art territory-art--${ground}`} opacity={opacity} pointerEvents="none" aria-hidden="true">
    <defs>
      {/* Texture fades out toward each territory's middle, where its name and emblem sit. */}
      <radialGradient id={`${prefix}-fade`} cx=".5" cy=".46" r=".62">
        <stop offset=".18" stopColor="#000"/><stop offset=".62" stopColor="#5a5a5a"/><stop offset="1" stopColor="#fff"/>
      </radialGradient>
      <radialGradient id={`${prefix}-scrim`} cx=".5" cy=".46" r=".5">
        <stop offset="0" stopColor="#05070f" stopOpacity=".55"/><stop offset="1" stopColor="#05070f" stopOpacity="0"/>
      </radialGradient>
      <mask id={`${prefix}-mask`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${prefix}-fade)`}/></mask>
      {drawn.filter(cell => cell.tile).map(cell => <pattern
        key={cell.id} id={cell.key} patternUnits="userSpaceOnUse"
        width={cell.tile!.width} height={cell.tile!.height}
        patternTransform={`rotate(${cell.turn}) scale(${cell.scale})`}
      >
        <g style={{ color: cell.color }} stroke="currentColor" strokeWidth="1">{cell.tile!.art}</g>
      </pattern>)}
      {drawn.filter(cell => cell.plate).map(cell => <g key={cell.id}>
        <clipPath id={`${cell.key}-clip`}><path d={cell.path}/></clipPath>
        <filter id={`${cell.key}-tone`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={toneMatrix(cell.color)}/></filter>
      </g>)}
    </defs>
    {/* A whisper of the place's own hue, so neighbours read apart before any is earned. */}
    <g className="territory-wash">{drawn.map(cell => <path key={cell.id} d={cell.path} fill={cell.color} fillOpacity={WASH}/>)}</g>
    <g className="territory-plates" opacity={PLATE}>
      {drawn.filter(cell => cell.plate).map(cell => <image
        key={cell.id} href={cell.plate!.src} preserveAspectRatio="xMidYMid slice"
        x={cell.frame.x} y={cell.frame.y} width={cell.frame.width} height={cell.frame.height}
        clipPath={`url(#${cell.key}-clip)`} filter={`url(#${cell.key}-tone)`}
      />)}
      {/* Darker where the name and emblem sit, so a busy picture never fights the label. */}
      {drawn.filter(cell => cell.plate).map(cell => <path key={cell.id} d={cell.path} fill={`url(#${prefix}-scrim)`}/>)}
    </g>
    <g className="territory-ground" opacity={ground === 'wallpaper' ? WALLPAPER : GROUND}>
      {/* The mask is per path: its box is each territory's own, not the whole level's. */}
      {drawn.filter(cell => cell.tile).map(cell => <path key={cell.id} d={cell.path} fill={`url(#${cell.key})`} mask={`url(#${prefix}-mask)`}/>)}
    </g>
  </g>;
});
