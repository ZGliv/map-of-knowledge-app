/**
 * Prototype switch for per-territory art, read once at load from `?art=`:
 * - off: the earlier dark map
 * - glyphs: one emblem per place, in its own colour
 * - terrain: each subject's own ground texture, tinted per place
 * - wallpaper: each place's own glyph, tiled faintly across its land
 * - plates: each headline place's picture, toned into its hue
 * - atlas: terrain and glyphs together
 * - stickers: wallpaper and glyphs together
 * - gradient (default): the whole tree as one mosaic, grey until learned, each place its own shade; glyphs on top
 */
export type ArtMode = 'off' | 'glyphs' | 'terrain' | 'wallpaper' | 'plates' | 'atlas' | 'stickers' | 'gradient';
export type Ground = 'terrain' | 'wallpaper' | 'plates';

const MODES: readonly ArtMode[] = ['off', 'glyphs', 'terrain', 'wallpaper', 'plates', 'atlas', 'stickers', 'gradient'];

export const ART_MODE: ArtMode = (() => {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get('art');
    return MODES.includes(value as ArtMode) ? value as ArtMode : 'gradient';
  } catch { return 'gradient'; }
})();

/** Emblems replace the subject motifs. */
export const showsEmblems = (mode: ArtMode) => mode === 'glyphs' || mode === 'atlas' || mode === 'stickers' || mode === 'gradient';
/** What covers each territory's land, if anything. */
export const groundOf = (mode: ArtMode): Ground | null => mode === 'atlas' ? 'terrain' : mode === 'stickers' ? 'wallpaper' : mode === 'terrain' || mode === 'wallpaper' || mode === 'plates' ? mode : null;
/** The glyph set is needed for emblems and for wallpaper. */
export const needsGlyphs = (mode: ArtMode) => showsEmblems(mode) || mode === 'wallpaper';
/** The land is one mosaic of every level down to the leaves (atlasArt/mosaic.ts). */
export const paintsMosaic = (mode: ArtMode) => mode === 'gradient';
