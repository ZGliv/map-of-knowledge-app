import { useId } from 'react';
import { territoryColor } from '../core/territoryTheme';
import { TerritoryGradient } from './TerritoryGradient';
import type { CompletionProjection } from '../spatial/CompletionProjection';
import { completionVisuals } from '../spatial/CompletionVisibility';
import { polygonPath } from '../spatial/SpatialLayoutEngine';

export interface CompletionLayerProps {
  readonly projections: readonly CompletionProjection[];
  readonly opacity?: number;
  /** Curved footprint outlines by completed node; a footprint without one is drawn as its polygon. */
  readonly paths?: ReadonlyMap<string, string>;
}

export function CompletionLayer({ projections, opacity = 1, paths }: CompletionLayerProps) {
  const instance = useId().replaceAll(':', '_');
  const visuals = completionVisuals(projections);
  if (visuals.length === 0) return null;
  return (
    <g className="completion-layer" opacity={opacity} aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {visuals.map(({ projection, showGeometry, coreRadius, haloRadius, coreOpacity, haloOpacity, collisionCount, beaconRepresentative }, index) => {
        const color = territoryColor(projection.nodeId);
        const gradientId = `completion-spectrum-${instance}-${index}`;
        return (
          <g
            key={projection.nodeId}
            className={`completion-marker${projection.collapsed ? ' is-collapsed' : ' is-resolved'}`}
            data-completion-id={projection.nodeId}
            data-estimated-area={projection.estimatedArea}
            data-core-radius={coreRadius}
            data-collision-count={collisionCount}
            data-beacon-representative={beaconRepresentative}
          >
            {showGeometry && <defs><TerritoryGradient id={gradientId} nodeId={projection.nodeId}/></defs>}
            {showGeometry && (
              <path
                className="completion-fragment"
                d={paths?.get(projection.nodeId) ?? polygonPath(projection.polygon)}
                style={{ fill: `url(#${gradientId})`, fillOpacity: 0.88, stroke: 'none', filter: 'none' }}
              />
            )}
            {haloOpacity > 0 && (
              <circle
                className="completion-halo"
                cx={projection.centroid[0]}
                cy={projection.centroid[1]}
                r={haloRadius}
                style={{ fill: color, opacity: haloOpacity, filter: 'none' }}
              />
            )}
            {coreOpacity > 0 && (
              <circle
                className="completion-core"
                cx={projection.centroid[0]}
                cy={projection.centroid[1]}
                r={coreRadius}
                style={{ fill: color, opacity: coreOpacity, filter: 'none' }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
