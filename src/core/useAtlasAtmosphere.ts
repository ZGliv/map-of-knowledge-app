import { useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { atmosphereAccent, type AtlasAtmosphereFrame } from './atlasAtmosphere';
import { catalog } from './catalog';

/**
 * Chrome surfaces that carry the territory's light while the camera moves. The map is
 * deliberately absent: an inherited custom property written on the shell restyles every
 * map element on every frame (measured at roughly a third of a throttled frame), so moving
 * frames repaint only these small subtrees and the shell itself is updated once settled.
 * Accent tokens are declared on these surfaces too (see cartographic-theme.css).
 */
export const ATMOSPHERE_SURFACES = '.shell-bar,.studio-sidebar,.location-bar,.atlas-next,.studio-mobile-nav';

/** Paint chrome accents on the existing camera clock without re-rendering the workspace. */
export function useAtlasAtmosphere(initialId: string) {
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const initialAtmosphere = useMemo(() => {
    const { hue, tint } = atmosphereAccent({ parentId: initialId, childId: initialId, zoom: 0 }, catalog.root.id);
    return { '--atlas-hue': hue, '--atlas-tint': tint } as CSSProperties;
  }, []);
  const paintAtmosphere = useCallback((frame: AtlasAtmosphereFrame) => {
    const shell = atmosphereRef.current;
    if (!shell) return;
    const { hue, tint } = atmosphereAccent(frame, catalog.root.id);
    const values = [['--atlas-hue', hue.toFixed(5)], ['--atlas-tint', tint.toFixed(4)]] as const;
    shell.dataset.atlasHue = values[0][1];
    shell.dataset.atlasTint = values[1][1];
    for (const surface of shell.querySelectorAll<HTMLElement>(ATMOSPHERE_SURFACES)) {
      for (const [name, value] of values) surface.style.setProperty(name, value);
    }
    if (frame.parentId === frame.childId) for (const [name, value] of values) shell.style.setProperty(name, value);
  }, []);
  return { atmosphereRef, initialAtmosphere, paintAtmosphere };
}
