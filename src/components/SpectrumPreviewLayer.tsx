import { useId } from 'react';
import { catalog } from '../core/catalog';
import { includesTerritory, SPECTRUM_SAMPLE_IDS, type SpectrumPreviewMode } from '../core/spectrumPreview';
import { projectCompletions } from '../spatial/CompletionProjection';
import { polygonPath, type SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import type { ShapeScope } from '../spatial/MapShape';
import type { KnowledgeNode, Polygon, RegionLayout } from '../spatial/types';
import { TerritoryGradient } from './TerritoryGradient';

export interface SpectrumPreviewLayerProps {
  mode: SpectrumPreviewMode;
  scope: KnowledgeNode;
  clip: Polygon;
  regions: readonly RegionLayout[];
  engine: SpatialLayoutEngine;
  opacity?: number;
  detailRegions?: ReadonlyMap<string, readonly RegionLayout[]>;
  /** The level's curved territories; absent, polygons are drawn as they are. */
  shapes?: ShapeScope;
}

/** Color is a continuous field. The preview merely reveals selected parts of it. */
export function SpectrumPreviewLayer({ mode, scope, clip, regions, engine, opacity = 1, detailRegions, shapes }: SpectrumPreviewLayerProps) {
  const instance = useId().replaceAll(':', '_');
  if (mode === 'off' || opacity <= 0) return null;
  const childrenOf = (ownerId: string) => {
    const owner = regions.find(region => region.node.id === ownerId);
    return detailRegions?.get(ownerId) ?? (owner && engine.layout(owner.node, catalog.getChildren(owner.node), owner.polygon));
  };
  const shaped = (nodeId: string, polygon: Polygon) => shapes?.footprint(nodeId, polygon, childrenOf)?.path ?? polygonPath(polygon);
  const fields = scope.depth === 0 ? regions.map(region => ({
    node: region.node, polygon: region.polygon,
    children: detailRegions?.get(region.node.id) ?? engine.layout(region.node, catalog.getChildren(region.node), region.polygon),
  })) : [{ node: scope, polygon: clip, children: regions }];

  return <g className="spectrum-preview-layer" data-preview-mode={mode} opacity={opacity} pointerEvents="none" aria-hidden="true">
    {fields.map(({ node, polygon, children }, index) => {
      if (polygon.length < 3) return null;
      const whole = mode === 'all' || SPECTRUM_SAMPLE_IDS.some(id => includesTerritory(id, node.id));
      const masks = whole ? [{ nodeId: node.id, polygon }] : projectCompletions({
        store: catalog, layoutEngine: engine, scope: node, clip: polygon,
        firstRegions: children, completedIds: SPECTRUM_SAMPLE_IDS.filter(id => includesTerritory(node.id, id)),
      });
      if (masks.length === 0) return null;
      const gradientId = `spectrum-field-${instance}-${index}`;
      const clipId = `spectrum-mask-${instance}-${index}`;
      return <g key={node.id} data-preview-field={node.id}>
        <defs>
          <TerritoryGradient id={gradientId} nodeId={node.id}/>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">{masks.map(mask =>
            <path key={mask.nodeId} d={shaped(mask.nodeId, mask.polygon)} data-preview-id={mask.nodeId}/>
          )}</clipPath>
        </defs>
        <path className="spectrum-preview-fill" d={scope.depth === 0 ? shaped(node.id, polygon) : polygonPath(polygon)} fill={`url(#${gradientId})`} clipPath={`url(#${clipId})`}/>
      </g>;
    })}
  </g>;
}
