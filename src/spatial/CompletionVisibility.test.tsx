import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompletionLayer } from '../components/CompletionLayer';
import { territoryPalette } from '../core/territoryTheme';
import { completionAppearance, completionVisuals } from './CompletionVisibility';
import { projectCompletion, type CompletionProjection } from './CompletionProjection';
import { NodeStore } from './NodeStore';
import { polygonPath, SpatialLayoutEngine } from './SpatialLayoutEngine';

const makeProjection = (overrides: Partial<CompletionProjection> = {}): CompletionProjection => ({
  nodeId: 'knowledge.science.physics.example', polygon: [[10, 20], [10, 30], [20, 30], [20, 20]],
  centroid: [15, 25], area: 100, estimatedArea: 100, relativeDepth: 4, remainingDepth: 0, collapsed: false,
  ...overrides,
});

describe('earned footprint versus distant visibility', () => {
  it('uses a fixed subpixel core without a growing badge or wide glow', () => {
    for (const area of [0, 1e-40, 0.01, 0.1, 0.4]) {
      const appearance = completionAppearance(makeProjection({ estimatedArea: area, collapsed: true }));
      expect(appearance.coreRadius).toBe(0.65);
      expect(appearance.haloRadius).toBe(1.6);
      expect(appearance.haloOpacity).toBeLessThanOrEqual(0.16);
      expect(appearance.showGeometry).toBe(false);
    }
    const grown = completionAppearance(makeProjection({ estimatedArea: 9 }));
    expect(grown).toMatchObject({ coreRadius: 0, haloRadius: 0, coreOpacity: 0, haloOpacity: 0, showGeometry: true });
  });

  it('fades the beacon continuously as the exact footprint becomes visible', () => {
    const areas = [0, 0.2, 0.4, 0.8, 1.2, 1.8, 2.4, 4];
    const appearances = areas.map(estimatedArea => completionAppearance(makeProjection({ estimatedArea })));
    for (let index = 1; index < appearances.length; index++) {
      expect(appearances[index].coreOpacity).toBeLessThanOrEqual(appearances[index - 1].coreOpacity);
      expect(appearances[index].haloOpacity).toBeLessThanOrEqual(appearances[index - 1].haloOpacity);
    }
    expect(completionAppearance(makeProjection({ estimatedArea: 2.4 - 1e-6 })).coreOpacity).toBeLessThan(1e-9);
    expect(completionAppearance(makeProjection({ estimatedArea: 0.18, collapsed: true })).coreOpacity)
      .toBe(completionAppearance(makeProjection({ estimatedArea: 0.18, collapsed: false })).coreOpacity);
  });

  it('never paints a collapsed ancestor proxy as though that ancestor were earned', () => {
    const proxy = makeProjection({ collapsed: true, remainingDepth: 35, estimatedArea: 1e-30 });
    const html = renderToStaticMarkup(<svg><CompletionLayer projections={[proxy]} /></svg>);
    expect(html).not.toContain('<path');
    expect(html).toContain('data-core-radius="0.65"');
    expect(html).toContain(`data-completion-id="${proxy.nodeId}"`);
    expect(html).not.toContain('drop-shadow');
    expect(html).not.toContain('blur');
    expect(html).toContain('filter:none');
  });

  it('renders a resolved footprint exactly, using its inherited spectrum and no artificial badge', () => {
    const projection = makeProjection({ nodeId: 'knowledge.arts.music.rhythm.example' });
    const html = renderToStaticMarkup(<svg><CompletionLayer projections={[projection]} opacity={0.35} /></svg>);
    expect(html).toContain(`d="${polygonPath(projection.polygon)}"`);
    for (const color of Object.values(territoryPalette(projection.nodeId))) {
      expect(html).toContain(`stop-color="${color}"`);
    }
    const gradientId = html.match(/<linearGradient id="([^"]+)"/)?.[1];
    expect(gradientId).toBeTruthy();
    expect(html).toContain(`fill:url(#${gradientId})`);
    expect(html).toContain('opacity="0.35"');
    expect(html).toContain('data-estimated-area="100"');
    expect(html).toContain('data-core-radius="0"');
    expect(html).not.toContain('<circle');
  });
});

describe('small-pixel collision handling', () => {
  it('bounds colliding beacons while preserving every source identity and exact geometry', () => {
    const projections = Array.from({ length: 100 }, (_, index) => makeProjection({
      nodeId: `knowledge.science.test-${String(index).padStart(3, '0')}`,
      centroid: [15.1 + index / 200, 25.2], estimatedArea: 0.001, collapsed: true,
    }));
    const before = structuredClone(projections);
    const visuals = completionVisuals(projections);
    expect(visuals).toHaveLength(100);
    expect(visuals.filter(visual => visual.coreOpacity > 0)).toHaveLength(1);
    expect(visuals.every(visual => visual.collisionCount === 100)).toBe(true);
    visuals.forEach((visual, index) => expect(visual.projection).toBe(projections[index]));
    expect(projections).toEqual(before);
    const leader = visuals.find(visual => visual.beaconRepresentative)!;
    expect(leader.projection.centroid).toEqual(projections[0].centroid);
    expect(leader.coreRadius).toBe(0.65);
    const reversed = completionVisuals([...projections].reverse()).find(visual => visual.beaconRepresentative)!;
    expect(reversed.projection.nodeId).toBe(leader.projection.nodeId);
    const html = renderToStaticMarkup(<svg><CompletionLayer projections={projections} /></svg>);
    expect((html.match(/data-completion-id=/g) ?? [])).toHaveLength(100);
    expect((html.match(/class="completion-core"/g) ?? [])).toHaveLength(1);
  });

  it('resolves separated beacons and never aggregates the geometry of larger footprints', () => {
    const projections = [
      makeProjection({ nodeId: 'a', estimatedArea: 0.1, centroid: [10.2, 10.2], collapsed: true }),
      makeProjection({ nodeId: 'b', estimatedArea: 0.1, centroid: [11.2, 10.2], collapsed: true }),
      makeProjection({ nodeId: 'c', estimatedArea: 30, centroid: [10.2, 10.2] }),
      makeProjection({ nodeId: 'd', estimatedArea: 40, centroid: [10.2, 10.2] }),
    ];
    const visuals = completionVisuals(projections);
    expect(visuals.filter(visual => visual.coreOpacity > 0)).toHaveLength(2);
    expect(visuals.filter(visual => visual.showGeometry)).toHaveLength(2);
    expect(visuals.every(visual => visual.collisionCount === 1)).toBe(true);
  });

  it('drops invalid drawing coordinates and deduplicates repeated evidence marks', () => {
    const good = makeProjection();
    const visuals = completionVisuals([good, good, makeProjection({ nodeId: 'bad', centroid: [NaN, 2] }), makeProjection({ nodeId: 'bad-area', estimatedArea: Infinity })]);
    expect(visuals.map(visual => visual.projection.nodeId)).toEqual([good.nodeId]);
  });
});

describe('deep completion identity', () => {
  it('preserves the depth-50 projected anchor rather than drawing its collapsed ancestor', () => {
    const viewport = [[0, 0], [0, 844], [390, 844], [390, 0]] as const;
    const firstStore = new NodeStore();
    const completed = firstStore.ensurePath(50, 'visibility-audit');
    const project = (store: NodeStore) => projectCompletion({ store, layoutEngine: new SpatialLayoutEngine(), scope: store.root, clip: viewport, completedId: completed.id });
    const first = project(firstStore)!;
    const secondStore = new NodeStore();
    secondStore.ensurePath(50, 'visibility-audit');
    const second = project(secondStore)!;
    expect(first.nodeId).toBe(completed.id);
    expect(first.collapsed).toBe(true);
    expect(first.remainingDepth).toBeGreaterThan(0);
    expect(second.centroid).toEqual(first.centroid);
    const visual = completionVisuals([first])[0];
    expect(visual.projection).toBe(first);
    expect(visual.projection.centroid).toEqual(first.centroid);
    expect(visual.showGeometry).toBe(false);
    expect(visual.coreRadius).toBe(0.65);
  });
});
