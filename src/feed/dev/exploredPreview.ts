// Screenshot-only: what "explored by watching" could look like on the Atlas. Nothing in the app
// imports this file, so it never ships; tests/explore-journey.mjs loads it from the dev server
// and paints it over the world view for one screenshot, then removes it.
//
// Places explored by watching get a faint point of starlight in their territory's color: never a
// fill, because only proof colors land.

import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import type { Polygon } from '../../spatial/types';
import { placePoint } from '../SessionMap';

const SVG = 'http://www.w3.org/2000/svg';

export function showExploredByWatching(places: readonly string[]): () => void {
  const stage = document.querySelector<HTMLElement>('.atlas-stage');
  if (!stage) throw new Error('No atlas on screen.');
  const { width, height } = stage.getBoundingClientRect();
  const clip: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('data-explored-preview', places.join(' '));
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '3' });
  for (const id of places) {
    const at = placePoint(id, clip);
    if (!at || !catalog.get(id)) continue;
    const color = territoryColor(id);
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('transform', `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`);
    for (const [r, opacity] of [[16, 0.08], [9, 0.16], [3.2, 0.95]] as const) {
      const circle = document.createElementNS(SVG, 'circle');
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', color);
      circle.setAttribute('opacity', String(opacity));
      g.appendChild(circle);
    }
    const core = document.createElementNS(SVG, 'circle');
    core.setAttribute('r', '1.3');
    core.setAttribute('fill', '#fff');
    g.appendChild(core);
    svg.appendChild(g);
  }
  stage.appendChild(svg);
  return () => svg.remove();
}
