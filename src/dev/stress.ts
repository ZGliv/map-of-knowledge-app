import { NodeStore } from '../spatial/NodeStore';
import { SpatialLayoutEngine, polygonArea, polygonPath } from '../spatial/SpatialLayoutEngine';
import { NavigationLayoutResolver } from '../spatial/NavigationMotion';
import { projectCompletion } from '../spatial/CompletionProjection';
import type { Polygon } from '../spatial/types';

const viewport: Polygon = [[0, 0], [0, 844], [390, 844], [390, 0]];
const output = document.querySelector<HTMLPreElement>('#output')!;
const map = document.querySelector<SVGSVGElement>('#map')!;
const seed = 'mok-next-depth-50';
let store = new NodeStore();
let engine = new SpatialLayoutEngine();
let resolver = new NavigationLayoutResolver(store, engine);
let target = store.ensurePath(50, seed);

function show(depth: number) {
  const scope = store.getPath(target)[depth];
  const regions = resolver.layoutForViewport(scope, viewport);
  const projection = projectCompletion({ store, layoutEngine: engine, scope, clip: viewport, completedId: target.id, firstRegions: regions });
  const nodes = regions.map(region => `<path d="${polygonPath(region.polygon)}" fill="${region.node.id === target.id ? '#8d7440' : '#21382d'}" stroke="#76977e" stroke-width="1.2"/><text x="${region.centroid[0]}" y="${region.centroid[1]}" fill="#d7e3d7" text-anchor="middle" font-size="13">Test ${region.node.index + 1}</text>`);
  if (projection && depth !== 49) nodes.push(`<circle cx="${projection.centroid[0]}" cy="${projection.centroid[1]}" r="4" fill="#f0c777"/>`);
  map.innerHTML = nodes.join('');
  map.setAttribute('aria-label', `Synthetic depth ${depth}: ${regions.length} test regions; one marked depth-50 descendant.`);
}

function run() {
  store = new NodeStore(); engine = new SpatialLayoutEngine(); resolver = new NavigationLayoutResolver(store, engine);
  const started = performance.now();
  target = store.ensurePath(50, seed);
  const initial = resolver.layoutForViewport(target, viewport);
  const coldMs = performance.now() - started;
  const generated = store.generatedCount;
  const warmStart = performance.now();
  const repeated = resolver.layoutForViewport(target, viewport);
  const warmMs = performance.now() - warmStart;
  const otherStore = new NodeStore();
  const otherTarget = otherStore.ensurePath(50, seed);
  const rebuilt = new NavigationLayoutResolver(otherStore, new SpatialLayoutEngine()).layoutForViewport(otherTarget, viewport);
  const stats = {
    routeSeed: seed,
    reachedDepth: target.depth,
    pathLength: store.getPath(target).length,
    generatedNodes: store.generatedCount,
    repeatedVisitAddedNodes: store.generatedCount - generated,
    visibleRegions: initial.length,
    finiteGeometry: initial.every(region => region.polygon.every(point => point.every(Number.isFinite)) && region.area > 0),
    viewportArea: polygonArea(viewport),
    partitionArea: initial.reduce((sum, region) => sum + region.area, 0),
    warmRouteIdentical: JSON.stringify(initial) === JSON.stringify(repeated),
    reconstructedRouteIdentical: JSON.stringify(initial) === JSON.stringify(rebuilt),
    coldGeometryMs: Number(coldMs.toFixed(2)),
    warmGeometryMs: Number(warmMs.toFixed(2)),
    userAgent: navigator.userAgent,
    fixtureOnly: true,
  };
  output.textContent = JSON.stringify(stats, null, 2);
  show(0);
}
document.querySelector('#run')!.addEventListener('click', run);
document.querySelectorAll<HTMLButtonElement>('[data-depth]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.depth))));
run();
