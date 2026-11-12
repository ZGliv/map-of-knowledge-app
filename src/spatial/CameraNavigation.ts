import type { CompletionProjection } from './CompletionProjection';
import { smoothNavigationProgress } from './NavigationMotion';
import { polygonArea, polygonCentroid } from './SpatialLayoutEngine';
import type { Point, Polygon, RegionLayout } from './types';
export { clipCameraRegions, interpolateOwnedCompletionMorphs } from './CameraGeometry';

export interface NavigationCamera {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface CameraJourney {
  readonly sourceClip: Polygon;
  readonly targetClip: Polygon;
  readonly cameraAt: (progress: number) => NavigationCamera;
  readonly toLocal: (point: Point) => Point;
}

const IDENTITY: NavigationCamera = { scale: 1, x: 0, y: 0 };
const isIdentity = ({ scale, x, y }: NavigationCamera): boolean => scale === 1 && x === 0 && y === 0;

export const cameraPoint = (point: Point, camera: NavigationCamera): Point => isIdentity(camera)
  ? point : [point[0] * camera.scale + camera.x, point[1] * camera.scale + camera.y];

export const cameraPolygon = (polygon: Polygon, camera: NavigationCamera): Polygon => isIdentity(camera)
  ? polygon : polygon.map(point => cameraPoint(point, camera));

/** One canonical journey is evaluated at q on entry and 1-q on return. */
export function createCameraJourney(selected: Polygon, viewport: Polygon): CameraJourney {
  const sourceArea = polygonArea(selected);
  const viewportArea = polygonArea(viewport);
  if (!(sourceArea > 0) || !(viewportArea > 0)) throw new Error('Camera journeys require positive polygon areas');
  const sourceCenter = polygonCentroid(selected);
  const viewCenter = polygonCentroid(viewport);
  const halfWidth = (Math.max(...viewport.map(point => point[0])) - Math.min(...viewport.map(point => point[0]))) / 2;
  const halfHeight = (Math.max(...viewport.map(point => point[1])) - Math.min(...viewport.map(point => point[1]))) / 2;
  // Fit the viewport inside the selected convex polygon, so its true boundary
  // travels beyond the screen instead of reshaping into a floating rectangle.
  const coverScale = Math.max(...selected.map((point, index) => {
    const next = selected[(index + 1) % selected.length];
    const dx = next[0] - point[0], dy = next[1] - point[1];
    if (dx === 0 && dy === 0) return 0;
    const distance = Math.abs(dx * (sourceCenter[1] - point[1]) - dy * (sourceCenter[0] - point[0]));
    return (Math.abs(dy) * halfWidth + Math.abs(dx) * halfHeight) / distance;
  }));
  const finalScale = coverScale * 1.015;
  const destination: NavigationCamera = {
    scale: finalScale,
    x: viewCenter[0] - finalScale * sourceCenter[0],
    y: viewCenter[1] - finalScale * sourceCenter[1],
  };
  const toLocal = (point: Point): Point => isIdentity(destination) ? point : [
    (point[0] - destination.x) / finalScale,
    (point[1] - destination.y) / finalScale,
  ];
  return {
    sourceClip: selected,
    targetClip: viewport.map(toLocal),
    toLocal,
    cameraAt: progress => {
      if (progress <= 0) return IDENTITY;
      if (progress >= 1) return destination;
      const scale = Math.exp(Math.log(finalScale) * progress);
      // Interpolate the selected point's screen position, not the camera center.
      // This avoids initial outward drift when a small cell requires a large zoom.
      return {
        scale,
        x: sourceCenter[0] + (viewCenter[0] - sourceCenter[0]) * progress - scale * sourceCenter[0],
        y: sourceCenter[1] + (viewCenter[1] - sourceCenter[1]) * progress - scale * sourceCenter[1],
      };
    },
  };
}

/** Let the camera establish direction before blending the residual geography. */
export const cameraReshapeProgress = (progress: number): number => smoothNavigationProgress((progress - 0.08) / 0.82);

export const cameraRegions = (regions: readonly RegionLayout[], camera: NavigationCamera): readonly RegionLayout[] => {
  if (isIdentity(camera)) return regions;
  return regions.map(region => {
    const polygon = cameraPolygon(region.polygon, camera);
    const xs = polygon.map(point => point[0]);
    const ys = polygon.map(point => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return {
      ...region, polygon,
      site: cameraPoint(region.site, camera),
      centroid: cameraPoint(region.centroid, camera),
      area: region.area * camera.scale ** 2,
      bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
    };
  });
};

export const cameraProjection = (projection: CompletionProjection, camera: NavigationCamera): CompletionProjection => isIdentity(camera)
  ? projection : {
    ...projection,
    polygon: cameraPolygon(projection.polygon, camera),
    centroid: cameraPoint(projection.centroid, camera),
    area: projection.area * camera.scale ** 2,
    estimatedArea: projection.estimatedArea * camera.scale ** 2,
  };
