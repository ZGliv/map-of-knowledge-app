import type * as Kit from './glyphs.generated';

export type GlyphKit = typeof Kit;

/**
 * A place's emblem: its own glyph over a soft light of its hue, drawn in the box the map's
 * label layout already keeps clear for a motif (a ring about three quarters of `size`).
 */
export function Glyph({ kit, nodeId, size, color }: { kit: GlyphKit; nodeId: string; size: number; color: string }) {
  const name = kit.GLYPH_OF[nodeId];
  const body = name ? kit.GLYPH_SVG[name] : undefined;
  if (!body) return null;
  const glow = size * .4, icon = size * .66;
  return <g className="map-glyph" style={{ color }}>
    {/* Two faint discs instead of a blur or a gradient: a gradient's currentColor would not follow each emblem's hue. */}
    <circle r={glow} fill="currentColor" fillOpacity=".05"/><circle r={glow * .66} fill="currentColor" fillOpacity=".07"/>
    {/* The body is paths only (the generator keeps nothing else from each icon file). */}
    <svg x={-icon / 2} y={-icon / 2} width={icon} height={icon} viewBox="0 0 256 256" fill="currentColor" dangerouslySetInnerHTML={{ __html: body }}/>
  </g>;
}
