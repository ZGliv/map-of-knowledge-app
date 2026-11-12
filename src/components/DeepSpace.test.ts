import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { deepSpaceOpacity, deepSpaceTransform } from './DeepSpace';

const root = catalog.root.id;
const territory = catalog.getChildren(catalog.root)[0];
const region = catalog.getChildren(territory)[0];

describe('deep space', () => {
  it('shows fully at the world view and never below it', () => {
    expect(deepSpaceOpacity({ parentId: root, zoom: 0 }, root)).toBe(1);
    expect(deepSpaceOpacity({ parentId: territory.id, zoom: 0 }, root)).toBe(0);
    expect(deepSpaceOpacity({ parentId: region.id, zoom: .3 }, root)).toBe(0);
  });
  it('fades on the camera zoom coordinate, so diving in and backing out retrace each other', () => {
    const at = (zoom: number) => deepSpaceOpacity({ parentId: root, zoom }, root);
    expect(at(.55)).toBe(0);
    expect(at(1)).toBe(0);
    let previous = 1;
    for (let zoom = .05; zoom <= .55; zoom += .05) {
      expect(at(zoom)).toBeLessThan(previous);
      previous = at(zoom);
    }
  });
  it('leaves the sky still at rest and moves it far less than the land while travelling', () => {
    expect(deepSpaceTransform({ scale: 1, x: 0, y: 0 }, 1200, 800)).toBe('');
    const camera = { scale: 4, x: -1800, y: -1200 };
    const [tx, ty, inner] = deepSpaceTransform(camera, 1200, 800).match(/-?[\d.]+(e-?\d+)?/g)!.map(Number);
    // Inside the camera group: screen = camera(inner(p)). The net zoom is the gentle camera.scale ** 0.3.
    expect(inner * camera.scale).toBeCloseTo(4 ** .3, 8);
    expect(Number.isFinite(tx) && Number.isFinite(ty)).toBe(true);
  });
});
