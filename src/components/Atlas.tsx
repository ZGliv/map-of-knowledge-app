import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createCameraJourney, cameraPolygon, cameraRegions, clipCameraRegions, interpolateOwnedCompletionMorphs, cameraProjection, cameraReshapeProgress, type CameraJourney, type NavigationCamera } from '../spatial/CameraNavigation';
import { createCameraFlight, createFlightClock, flightDuration, flightLevels, type CameraFlight, type FlightClock } from '../spatial/CameraFlight';
import { CompletionLayer } from './CompletionLayer';
import { FreshGlow, type FreshGlowItem } from './FreshGlow';
import { TerritoryBorders, TerritoryLight } from './TerritoryBorders';
import { SpectrumPreviewLayer } from './SpectrumPreviewLayer';
import { DeepSpace, deepSpaceOpacity, deepSpaceTransform, paintDeepSpace } from './DeepSpace';
import type { SpectrumPreviewMode } from '../core/spectrumPreview';
import { territoryColor } from '../core/territoryTheme';
import type { AtlasAtmosphereFrame } from '../core/atlasAtmosphere';
import {
  projectCompletions,
  type CompletionProjection,
} from '../spatial/CompletionProjection';
import { catalog, type AtlasNode } from '../core/catalog';
import { labelLayout, MapDetails, type LabelLayout, type MapRect, type MapSafeArea } from './MapDetails';
import {
  createCompletionMorphs,
  createRegionDetailMorphs,
  interpolatePoint,
  interpolateRegionDetails,
  NavigationLayoutResolver,
  smoothNavigationProgress,
  type CompletionMorph,
  type RegionDetailMorph,
} from '../spatial/NavigationMotion';
import { blendWeights, polygonPath, SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import { cameraShapedCell, createShapeScope, outlinePoints, type ShapedCell, type ShapeScope } from '../spatial/MapShape';
import type { KnowledgeNode, Point, Polygon, RegionLayout } from '../spatial/types';
import { ART_MODE, groundOf, needsGlyphs, paintsMosaic, showsEmblems } from '../atlasArt/mode';
import { drawLand, flightSites, isFog, paintKey, restingSites, shadeOf, type FillPaint, type LandTop, type Paint } from '../atlasArt/mosaic';
import './atlas-fill.css';
import { hashString } from '../spatial/deterministic';
import { TerritoryArt, type PlateKit } from '../atlasArt/TerritoryArt';
import type { GlyphKit } from '../atlasArt/Glyph';

const FALLBACK_WIDTH = 1200;
const FALLBACK_HEIGHT = 800;
/** A redirected camera eases out of its old path over this long instead of snapping onto the new one. */
const REDIRECT_BLEND = 380;

interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

interface TransitionBase {
  readonly direction: 'in' | 'out';
  readonly journey: CameraJourney;
  readonly sourceProjections: readonly CompletionProjection[];
  readonly targetProjections: readonly CompletionProjection[];
  readonly parentNode: KnowledgeNode;
  readonly childNode: KnowledgeNode;
  readonly parentRegions: readonly RegionLayout[];
  readonly parentRegion: RegionLayout;
  readonly detailChildren: readonly KnowledgeNode[];
  readonly sourceSites: readonly Point[];
  readonly targetSites: readonly Point[];
  readonly sourceRegions: readonly RegionLayout[];
  readonly targetRegions: readonly RegionLayout[];
  readonly targetOwners: readonly RegionLayout[];
  readonly detailMorphs: readonly RegionDetailMorph[];
  readonly completionMorphs: readonly CompletionMorph[];
}

/** One rendered frame: the leg the camera is crossing, and where along the whole flight it is. */
interface NavigationTransition extends TransitionBase {
  readonly progress: number;
  /** The leg that crosses the world view, if any: its starfield is mounted for the whole flight. */
  readonly worldLeg: TransitionBase | null;
  readonly routeFrame: {
    readonly camera: NavigationCamera;
    readonly progress: number;
    readonly scale: number;
    readonly leg: number;
    readonly length: number;
  };
}

/**
 * Every multi-level move is one flight: all legs are prepared before the first
 * frame, and one clock drives the camera through every level without stopping.
 */
interface ActiveNavigation {
  readonly legs: readonly TransitionBase[];
  readonly flight: CameraFlight;
  readonly clock: FlightClock;
  readonly destination: KnowledgeNode;
  readonly worldLeg: TransitionBase | null;
  readonly viewport: ViewportSize;
  /** Screen offset between a redirected camera and its new path, eased away at the start. */
  readonly offset: { readonly x: number; readonly y: number } | null;
  /** rAF time at which the clock reads zero; null until the first frame of a flight from rest. */
  startedAt: number | null;
  /** Last displayed clock time, route position, camera and rAF time: where a redirect departs from. */
  time: number;
  s: number;
  camera: NavigationCamera;
  frameTime: number | null;
}

const smoothStep = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** Earned footprints with curved borders, by completed node, optionally seen through a camera. */
function footprintPaths(
  scope: ShapeScope,
  projections: readonly CompletionProjection[],
  childrenOf: (ownerId: string) => readonly RegionLayout[] | undefined,
  camera?: NavigationCamera,
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  for (const projection of projections) {
    if (projection.collapsed || projection.polygon.length < 3) continue;
    const cell = scope.footprint(projection.nodeId, projection.polygon, childrenOf);
    if (cell) paths.set(projection.nodeId, camera ? cameraShapedCell(cell, camera).path : cell.path);
  }
  return paths;
}

/** Sample the flight at a clock time and record it as the pose a redirect would depart from. */
function navigationFrame(active: ActiveNavigation, time: number): NavigationTransition {
  const s = active.clock.position(time);
  const frame = active.flight.sample(s);
  let camera = frame.camera;
  if (active.offset && time < REDIRECT_BLEND) {
    // Ease out of the previous path. The blend never uncovers an edge that the
    // new path itself keeps covered: the parent scene is exactly one viewport.
    const weight = 1 - smoothStep(time / REDIRECT_BLEND);
    const { width, height } = active.viewport;
    const cover = (value: number, offset: number, size: number) => Math.max(
      Math.min(value, size * (1 - camera.scale)),
      Math.min(Math.max(value, 0), value + offset * weight),
    );
    camera = { scale: camera.scale, x: cover(camera.x, active.offset.x, width), y: cover(camera.y, active.offset.y, height) };
  }
  active.time = time;
  active.s = s;
  active.camera = camera;
  const leg = active.legs[frame.leg];
  return {
    ...leg, progress: frame.progress,
    worldLeg: leg.parentNode.parentId === null ? leg : active.worldLeg,
    routeFrame: { camera, progress: s / active.flight.distance, scale: frame.globalCamera.scale, leg: frame.leg, length: active.flight.length },
  };
}

const viewportPolygon = ({ width, height }: ViewportSize): Polygon => [
  [0, 0],
  [0, height],
  [width, height],
  [width, 0],
];

/**
 * Where the map may put names. The map runs full-bleed: CSS sizes a hidden probe to its frame
 * (see .map-safe-area: the screen inside the device's insets, or below a desktop's top bar), and
 * every control that floats over the map marks itself data-map-obstacle and is avoided as the
 * rectangle it covers. The probe follows the insets, so a late inset re-measures the controls too.
 */
const useSafeArea = (shell: RefObject<HTMLElement | null>, probe: RefObject<HTMLElement | null>): MapSafeArea | null => {
  const [safe, setSafe] = useState<MapSafeArea | null>(null);
  useLayoutEffect(() => {
    const outer = shell.current, inner = probe.current;
    if (!outer || !inner) return;
    const floating = () => [...document.querySelectorAll<HTMLElement>('[data-map-obstacle]')];
    const key = (area: MapSafeArea) => `${area.x0},${area.y0},${area.x1},${area.y1}|${area.obstacles?.map(o => `${o.x0},${o.y0},${o.x1},${o.y1}`).join(';')}`;
    const measure = () => {
      const o = outer.getBoundingClientRect();
      const local = (r: DOMRect): MapRect => ({ x0: Math.round(r.left - o.left), y0: Math.round(r.top - o.top), x1: Math.round(r.right - o.left), y1: Math.round(r.bottom - o.top) });
      // Hidden controls (display: none, or dissolved into a bar) measure empty.
      const width = Math.round(o.width), height = Math.round(o.height);
      // Controls along the top (the location capsule, search, menu) and the bottom (the intro pill, the tab
      // bar) are kept clear of as full-width bands: the capsule's and the pill's widths follow the place's
      // name, and names that steered around their exact edges would jump as a flight lands.
      const measured = floating().map(element => element.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0).map(local);
      const band = (rects: MapRect[]): MapRect[] => rects.length ? [{ x0: 0, x1: width, y0: Math.min(...rects.map(r => r.y0)), y1: Math.max(...rects.map(r => r.y1)) }] : [];
      const obstacles = [...band(measured.filter(r => r.y1 < height * .2)), ...band(measured.filter(r => r.y0 > height * .7)), ...measured.filter(r => r.y1 >= height * .2 && r.y0 <= height * .7)];
      const next: MapSafeArea = { ...local(inner.getBoundingClientRect()), obstacles };
      setSafe(previous => previous && key(previous) === key(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    for (const element of floating()) observer.observe(element);
    return () => observer.disconnect();
  }, [shell, probe]);
  return safe;
};

const useElementSize = (ref: RefObject<HTMLElement | null>): ViewportSize => {
  const [size, setSize] = useState<ViewportSize>({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const next = {
        width: Math.max(320, Math.round(bounds.width)),
        height: Math.max(100, Math.round(bounds.height)),
      };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

// Deep-space land: near-black indigo with just enough variation to tell neighbors apart.
const REGION_TONES = [
  '#0f1426', '#11172b', '#0e1323', '#131a30', '#10162a', '#0f1527', '#12182e', '#101629',
];

const toneFor = (node: KnowledgeNode): string => (
  REGION_TONES[(node.index + node.depth * 3) % REGION_TONES.length]
);

const completionToneFor=(node:KnowledgeNode):string=>{
 const hex=territoryColor(node.id);const mix=(part:string)=>Math.round(parseInt(part,16)*.57+18*.43);
 return `rgb(${mix(hex.slice(1,3))},${mix(hex.slice(3,5))},${mix(hex.slice(5,7))})`;
};

const mixTone=(from:string,to:string,progress:number):string=>{
 if(progress<=0)return from;if(progress>=1)return to;
 const rgb=(color:string)=>color.startsWith('#')?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)):color.match(/[\d.]+/g)!.map(Number);
 const a=rgb(from),b=rgb(to);return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*progress)).join(',')})`;
};

interface CellProps {
  readonly region: RegionLayout;
  /** The drawn (curved) outline; absent, the polygon itself. */
  readonly path?: string;
  readonly className: string;
  readonly fillOverride?: string;
  readonly outlineOpacity?: number;
  readonly opacity?: number;
  readonly completed?: boolean;
  /** Nothing to explore here yet: drawn as fog. */
  readonly uncharted?: boolean;
  readonly interactive?: boolean;
  readonly pointerHoverEnabled?: boolean;
  readonly hovered?: boolean;
  readonly onHover?: (nodeId: string | null) => void;
  readonly onPointerIntent?: (nodeId: string) => void;
  readonly onSelect?: (region: RegionLayout) => void;
}

function Cell({
  region,
  path,
  className,
  fillOverride,
  outlineOpacity = 1,
  opacity = 1,
  completed = false,
  uncharted = false,
  interactive = false,
  pointerHoverEnabled = true,
  hovered = false,
  onHover,
  onPointerIntent,
  onSelect,
}: CellProps) {
  return (
    <path
      className={`${className}${hovered ? ' is-hovered' : ''}${completed ? ' is-complete' : ''}${uncharted ? ' is-uncharted' : ''}`}
      d={path ?? polygonPath(region.polygon)}
      fill={fillOverride ?? (completed ? completionToneFor(region.node) : toneFor(region.node))}
      style={fillOverride==='transparent'?{strokeOpacity:outlineOpacity,fill:'transparent'}:{strokeOpacity:outlineOpacity}}
      opacity={opacity}
      pointerEvents={interactive ? 'auto' : 'none'}
      data-region-id={region.node.id}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `Explore ${region.node.name}` : undefined}
      onPointerEnter={interactive && pointerHoverEnabled
        ? () => onHover?.(region.node.id)
        : undefined}
      onPointerMove={interactive && !pointerHoverEnabled
        ? () => onPointerIntent?.(region.node.id)
        : undefined}
      onPointerLeave={interactive ? () => onHover?.(null) : undefined}
      onFocus={interactive ? () => onHover?.(region.node.id) : undefined}
      onBlur={interactive ? () => onHover?.(null) : undefined}
      onClick={interactive ? () => onSelect?.(region) : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(region);
        }
      } : undefined}
    />
  );
}

interface AtlasProps {
 initialId:string;
 request:{id:string;nonce:number}|null;
 completedIds:readonly string[];
 /** The freshness glow of proved places, 0 to 1 (checks/freshness.ts). Drawn on the idle map only. */
 glow?:ReadonlyMap<string,number>;
 colorPreview?:SpectrumPreviewMode;
 noteCounts?:Readonly<Record<string,number>>;
 learningCounts?:Readonly<Record<string,number>>;
 frontierIds?:ReadonlySet<string>;
 onLocationChange:(node:AtlasNode)=>void;
 onBusy:(busy:boolean)=>void;
 onAtmosphereFrame?:(frame:AtlasAtmosphereFrame)=>void;
 /** How much of each place is filled in, 0 to 1 (src/shelf/fill.ts); places at 0 are absent. */
 fill?:ReadonlyMap<string,number>;
 /** Places with something to explore; every other place is uncharted (drawn as fog). */
 charted?:ReadonlySet<string>;
}
export function Atlas({initialId,request,completedIds,glow,colorPreview='off',noteCounts,learningCounts,frontierIds,onLocationChange,onBusy,onAtmosphereFrame,fill,charted}:AtlasProps) {
  const shellRef = useRef<HTMLElement>(null);
  const animationFrame = useRef<number | null>(null);
  const activeNavigation = useRef<ActiveNavigation | null>(null);
  const previousViewport = useRef<ViewportSize | null>(null);
  const deepSpace = useRef<SVGGElement>(null);
  const liveCanvas = useRef<HTMLCanvasElement>(null);
  const store = catalog;
  const layoutEngine = useMemo(() => new SpatialLayoutEngine(), []);
  const navigationLayouts = useMemo(
    () => new NavigationLayoutResolver(store, layoutEngine),
    [layoutEngine, store],
  );

  const viewport = useElementSize(shellRef);
  const safeProbe = useRef<HTMLDivElement>(null);
  const safe = useSafeArea(shellRef, safeProbe);
  const clip = useMemo(() => viewportPolygon(viewport), [viewport]);
  const [current, setCurrent] = useState(store.get(initialId)||store.root);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointerHoverEnabled, setPointerHoverEnabled] = useState(true);
  const [transition, setTransition] = useState<NavigationTransition | null>(null);
  // The ?art= prototype: its glyphs and pictures load on their own, so the default map never downloads them.
  const [glyphs, setGlyphs] = useState<GlyphKit | null>(null);
  const [plates, setPlates] = useState<PlateKit | null>(null);
  const ground = groundOf(ART_MODE);
  useEffect(() => {
    if (needsGlyphs(ART_MODE)) void import('../atlasArt/glyphs.generated').then(setGlyphs);
    if (ground === 'plates') void import('../atlasArt/plates.generated').then(setPlates);
  }, [ground]);
  const emblems = showsEmblems(ART_MODE) ? glyphs : null;
  // ?art=gradient: the land is drawn on one canvas beneath the map, at rest and in flight (atlasArt/mosaic.ts).
  const mosaic = paintsMosaic(ART_MODE);
  const clear = mosaic ? 'transparent' : undefined;
  const completedKey = completedIds.join('|');
  // Preview paints the land itself: every leaf lit, or a random fifth of the leaves, each in its own shade.
  const learned = useMemo(() => {
    const done = new Set(completedIds);
    return colorPreview === 'all' ? () => true
      : colorPreview === 'sample' ? (id: string) => !store.getChildren(store.get(id)!).length && hashString(`preview:${id}`) % 100 < 22
      : (id: string) => { for (let at = id; at; at = at.slice(0, Math.max(0, at.lastIndexOf('.')))) if (done.has(at)) return true; return false; };
  }, [completedKey, colorPreview, store]);
  // The shelf's fill, when given, lights the land instead (every level grey to colour by its fill, fog
  // where uncharted). Kept under a signature of what it paints, so the canvases below are thrown away
  // only when a cell would change colour, never because the map re-rendered.
  const fillKey = useMemo(() => paintKey(fill, charted), [fill, charted]);
  const fillPaint = useMemo((): FillPaint | null => fill ? { fill, charted } : null, [fillKey]);
  const paint: Paint = fillPaint && colorPreview === 'off' ? fillPaint : learned;
  const fogged = (id: string) => fillPaint !== null && isFog(id, fillPaint);
  // The flat map (?art=off and the like): each cell's own tone mixed toward its completed tone by its fill.
  const toneAt = (node: KnowledgeNode) => fill ? mixTone(toneFor(node), completionToneFor(node), fill.get(node.id) ?? 0) : completedIds.includes(node.id) ? completionToneFor(node) : toneFor(node);
  // Each level's land, painted once into an offscreen canvas (device resolution) and drawn from there.
  const levels = useMemo(() => new Map<string, HTMLCanvasElement>(), [clip, paint, viewport.width, viewport.height]);
  const levelLand = useCallback((node: KnowledgeNode): HTMLCanvasElement | null => {
    if (!mosaic) return null;
    const cached = levels.get(node.id);
    if (cached) return cached;
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width * ratio);
    canvas.height = Math.round(viewport.height * ratio);
    const context = canvas.getContext('2d')!;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#05070f';
    context.fillRect(0, 0, viewport.width, viewport.height);
    const levelRegions = navigationLayouts.layoutForViewport(node, clip);
    if (!levelRegions.length) {
      context.fillStyle = shadeOf(node, paint);
      context.fillRect(0, 0, viewport.width, viewport.height);
    } else {
      const shapes = createShapeScope(levelRegions, { frame: clip, pxPerUnit: 1, sibling: 1 });
      drawLand(context, levelRegions.map((region): LandTop => {
        const cell = shapes.cells.get(region.node.id);
        return { node: region.node, real: region.polygon, draw: cell ? outlinePoints(cell) : region.polygon, path: cell?.path ?? polygonPath(region.polygon) };
      }), { engine: layoutEngine, learned: paint, sites: restingSites(layoutEngine) });
    }
    levels.set(node.id, canvas);
    return canvas;
  }, [mosaic, levels, navigationLayouts, clip, viewport.width, viewport.height, layoutEngine, paint]);
  // While a level rests, its children's land is painted in idle time, so a flight never waits on it.
  useEffect(() => {
    if (!mosaic) return;
    const queue = store.getChildren(current).filter(child => store.getChildren(child).length);
    let handle = 0;
    const next = () => { const child = queue.shift(); if (!child) return; levelLand(child); handle = window.setTimeout(next, 30); };
    handle = window.setTimeout(next, 400);
    return () => window.clearTimeout(handle);
  }, [mosaic, current, levelLand, store]);
  // Pictures one level down are fetched while this level rests, so a flight never waits on one.
  useEffect(() => {
    if (!plates) return;
    for (const region of navigationLayouts.layoutForViewport(current, clip)) for (const child of store.getChildren(region.node)) {
      const src = plates.PLATE_OF[child.id]?.src;
      if (src) new Image().src = src;
    }
  }, [plates, current, clip, navigationLayouts, store]);
  const art = (props: { regions: readonly RegionLayout[]; shapes?: ReadonlyMap<string, ShapedCell>; opacity?: number }) => ground && <TerritoryArt {...props} ground={ground} glyphs={glyphs} plates={plates}/>;
  const committedTransition = useRef<NavigationTransition | null>(null);
  useLayoutEffect(() => { committedTransition.current = transition; }, [transition]);
  const lastRequest=useRef(-1);
  useEffect(()=>{onLocationChange(current as AtlasNode)},[current,onLocationChange]);
  useEffect(()=>{onBusy(!!transition)},[transition!==null,onBusy]);
  const children = useMemo(() => store.getChildren(current), [current, store]);
  const regions = useMemo(
    () => navigationLayouts.layoutForViewport(current, clip),
    [clip, current, navigationLayouts],
  );

  const idleCompletionProjections = useMemo(() => projectCompletions({
    store,
    layoutEngine,
    scope: current,
    clip,
    completedIds,
    firstRegions: regions,
  }).filter(({ relativeDepth }) => relativeDepth > 1), [
    clip,
    completedIds,
    current,
    layoutEngine,
    regions,
    store,
  ]);

  const idleShapes = useMemo(() => createShapeScope(regions, { frame: clip, pxPerUnit: 1, sibling: 1 }), [clip, regions]);
  const idleFootprints = useMemo(() => footprintPaths(idleShapes, idleCompletionProjections, ownerId => {
    const owner = regions.find(region => region.node.id === ownerId);
    return owner && layoutEngine.layout(owner.node, store.getChildren(owner.node), owner.polygon);
  }), [idleCompletionProjections, idleShapes, layoutEngine, regions, store]);

  // The glow's shapes are the idle map's own cell and footprint paths, so it costs nothing new to lay out.
  const idleGlow = useMemo((): FreshGlowItem[] => {
    if (!glow?.size) return [];
    const cells = regions.filter(region => glow.get(region.node.id)).map(region => ({ id: region.node.id, d: idleShapes.cells.get(region.node.id)?.path ?? polygonPath(region.polygon), glow: glow.get(region.node.id)! }));
    const deeper = idleCompletionProjections.filter(projection => !projection.collapsed && projection.polygon.length >= 3 && glow.get(projection.nodeId))
      .map(projection => ({ id: projection.nodeId, d: idleFootprints.get(projection.nodeId) ?? polygonPath(projection.polygon), glow: glow.get(projection.nodeId)!, deep: true }));
    // Inside a proved place itself, its own land carries the rim.
    const own = !regions.length && glow.get(current.id) ? [{ id: current.id, d: polygonPath(clip), glow: glow.get(current.id)! }] : [];
    return [...cells, ...deeper, ...own];
  }, [glow, regions, idleShapes, idleCompletionProjections, idleFootprints, current.id, clip]);

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  const rearmPointerHover = useCallback((nodeId: string) => {
    if (activeNavigation.current) return;
    setPointerHoverEnabled(true);
    setHoveredId(nodeId);
  }, []);

  /** Everything one parent/child leg renders, shared by both directions through it. */
  const createTransition = useCallback((
    parentNode: KnowledgeNode,
    childNode: KnowledgeNode,
  ): Omit<TransitionBase, 'direction'> | null => {
    const parentRegions = navigationLayouts.layoutForViewport(parentNode, clip);
    const parentRegion = parentRegions.find(({node}) => node.id === childNode.id);
    if (!parentRegion) return null;
    const journey = createCameraJourney(parentRegion.polygon, clip);
    const endCamera = journey.cameraAt(1);
    const localCamera = {scale:1/endCamera.scale,x:-endCamera.x/endCamera.scale,y:-endCamera.y/endCamera.scale};
    const detailChildren = store.getChildren(childNode);
    const nested = layoutEngine.layout(childNode, detailChildren, parentRegion.polygon);
    const expanded = navigationLayouts.layoutForViewport(childNode, clip);
    const localExpanded = cameraRegions(expanded, localCamera);
    const targetOwners = layoutEngine.layoutFromSites(childNode,detailChildren,parentRegion.polygon,localExpanded.map(({site})=>site),blendWeights(localExpanded,localExpanded,0));
    const projections = (endpointClip: Polygon, firstRegions: readonly RegionLayout[]) => projectCompletions({
      store, layoutEngine, scope: childNode, clip: endpointClip, completedIds, firstRegions,
    });
    const sourceProjections = projections(parentRegion.polygon, nested);
    const targetProjections = projections(clip, expanded);
    const detailMorphs = createRegionDetailMorphs(layoutEngine, store, nested, expanded).map((morph,index) => {
      const targetClip=targetOwners[index].polygon;
      const local=cameraRegions(morph.target,localCamera);
      return {...morph,targetClip,target:layoutEngine.layoutFromSites(morph.parent,morph.children,targetClip,local.map(({site})=>site),blendWeights(local,local,0))};
    });
    return {
      journey, parentNode, childNode, parentRegions, parentRegion, detailChildren,
      sourceRegions:nested, targetRegions:expanded, targetOwners, sourceProjections, targetProjections,
      sourceSites:nested.map(({site})=>site),targetSites:localExpanded.map(({site})=>site),
      detailMorphs,
      completionMorphs:createCompletionMorphs(sourceProjections,targetProjections.map(projection=>cameraProjection(projection,localCamera))),
    };
  }, [clip, completedIds, layoutEngine, navigationLayouts, store]);

  // Each leg is prepared once per viewport and completion set, before the first
  // frame of any flight through it, so no level is laid out while the camera moves.
  const legCache = useMemo(() => new Map<string, Omit<TransitionBase, 'direction'> | null>(), [createTransition]);
  const legsAlong = useCallback((levels: readonly KnowledgeNode[]): TransitionBase[] | null => {
    const legs: TransitionBase[] = [];
    for (let index = 1; index < levels.length; index++) {
      const from = levels[index - 1], to = levels[index];
      const direction = to.parentId === from.id ? 'in' : 'out';
      const [parent, child] = direction === 'in' ? [from, to] : [to, from];
      const key = `${parent.id}>${child.id}`;
      if (!legCache.has(key)) legCache.set(key, createTransition(parent, child));
      const leg = legCache.get(key);
      if (!leg) return null;
      legs.push({ ...leg, direction });
    }
    return legs;
  }, [createTransition, legCache]);

  const tick = useCallback(function tick(now: number) {
    const active = activeNavigation.current;
    if (!active) { animationFrame.current = null; return; }
    if (active.startedAt === null) {
      // Start the clock on the first frame after the departure pose is on screen,
      // however long that first render took, so a trip never begins mid-motion.
      if (committedTransition.current) active.startedAt = active.frameTime = now;
      animationFrame.current = requestAnimationFrame(tick);
      return;
    }
    const time = Math.min(active.clock.duration, now - active.startedAt);
    active.frameTime = now;
    setTransition(navigationFrame(active, time));
    if (time < active.clock.duration) {
      animationFrame.current = requestAnimationFrame(tick);
      return;
    }
    animationFrame.current = requestAnimationFrame(() => {
      if (activeNavigation.current !== active) return;
      setCurrent(active.destination);
      setHoveredId(null);
      setTransition(null);
      activeNavigation.current = null;
      animationFrame.current = null;
    });
  }, []);

  const launch = useCallback((
    legs: readonly TransitionBase[],
    destination: KnowledgeNode,
    from: {
      readonly position: (flight: CameraFlight) => number;
      readonly velocity: (flight: CameraFlight) => number;
      readonly duration: number;
      readonly startedAt: number | null;
      readonly camera?: NavigationCamera;
    },
  ): ActiveNavigation => {
    const flight = createCameraFlight(legs);
    const s = from.position(flight);
    const clock = createFlightClock({ start: s, end: flight.distance, apex: flight.apex, velocity: from.velocity(flight), duration: from.duration });
    const path = flight.sample(s).camera;
    const active: ActiveNavigation = {
      legs, flight, clock, destination, viewport,
      worldLeg: legs.find(leg => leg.parentNode.id === store.root.id) ?? null,
      offset: from.camera ? { x: from.camera.x - path.x, y: from.camera.y - path.y } : null,
      startedAt: from.startedAt, frameTime: from.startedAt, time: 0, s, camera: from.camera ?? path,
    };
    activeNavigation.current = active;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(tick);
    return active;
  }, [store, tick, viewport]);

  /** Fly to any place: one continuous camera move, redirected smoothly if one is under way. */
  const flyTo = useCallback((targetId: string) => {
    const target = store.get(targetId);
    if (!target) return;
    const active = activeNavigation.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!active) {
      if (target.id === current.id) { onLocationChange(current as AtlasNode); return; }
      const legs = legsAlong(flightLevels(store.getPath(current), store.getPath(target)));
      if (!legs) return;
      setHoveredId(null);
      setPointerHoverEnabled(false);
      if (reduced) { setCurrent(target); return; }
      const started = launch(legs, target, { position: () => 0, velocity: () => 0, duration: flightDuration(legs.length), startedAt: null });
      setTransition(navigationFrame(started, 0));
      return;
    }
    if (target.id === active.destination.id) return;
    if (reduced) {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      activeNavigation.current = null;
      setCurrent(target);
      setTransition(null);
      return;
    }
    // Redirect from the camera's current pose and speed. Inside the leg being
    // crossed, the new route either keeps entering its child or turns back out.
    const frame = active.flight.sample(active.s);
    const leg = active.legs[frame.leg];
    const entering = store.getPath(target).some(node => node.id === leg.childNode.id);
    const legs = legsAlong(entering
      ? [leg.parentNode, ...flightLevels(store.getPath(leg.childNode), store.getPath(target))]
      : [leg.childNode, ...flightLevels(store.getPath(leg.parentNode), store.getPath(target))]);
    if (!legs) return;
    const along = entering ? frame.zoom : 1 - frame.zoom;
    const velocity = (leg.direction === legs[0].direction ? 1 : -1) * active.clock.velocity(active.time);
    launch(legs, target, {
      position: flight => along * flight.distances[0], velocity: () => velocity,
      duration: flightDuration(legs.length - along), startedAt: active.frameTime, camera: active.camera,
    });
  }, [current, launch, legsAlong, onLocationChange, store]);

  const enterRegion = useCallback((region: RegionLayout) => {
    if (!activeNavigation.current) flyTo(region.node.id);
  }, [flyTo]);

  useEffect(() => {
    if (!request || request.nonce === lastRequest.current) return;
    lastRequest.current = request.nonce;
    flyTo(request.id);
  }, [request, flyTo]);

  // A resize mid-flight re-lays every level for the new viewport and continues
  // the same route from the same share of the journey, at the same pace.
  useLayoutEffect(() => {
    const previous = previousViewport.current;
    previousViewport.current = viewport;
    if (!previous || (previous.width === viewport.width && previous.height === viewport.height)) return;
    const active = activeNavigation.current;
    if (!active) return;
    const first = active.legs[0];
    const legs = legsAlong([first.direction === 'in' ? first.parentNode : first.childNode,
      ...active.legs.map(leg => leg.direction === 'in' ? leg.childNode : leg.parentNode)]);
    if (!legs) return;
    const share = active.s / active.flight.distance;
    const resized = launch(legs, active.destination, {
      position: flight => share * flight.distance,
      velocity: flight => active.clock.velocity(active.time) / active.flight.distance * flight.distance,
      duration: Math.max(1, active.clock.duration - active.time), startedAt: active.frameTime,
    });
    setTransition(navigationFrame(resized, 0));
  }, [launch, legsAlong, viewport]);

  // One canonical zoom coordinate makes backing out retrace the same camera path.
  const zoom = transition ? (transition.direction==='in'?transition.progress:1-transition.progress) : 0;
  useLayoutEffect(() => {
    onAtmosphereFrame?.({
      parentId: transition?.parentNode.id ?? current.id,
      childId: transition?.childNode.id ?? current.id,
      zoom,
    });
  }, [onAtmosphereFrame, current.id, transition?.parentNode.id, transition?.childNode.id, zoom]);
  const camera = transition?.routeFrame.camera ?? {scale:1,x:0,y:0};
  // Deep space rides the same camera frame as the atmosphere hue: written to the DOM, never re-rendered.
  const atWorld = (transition?.parentNode.id ?? current.id) === store.root.id;
  useLayoutEffect(() => {
    const layer = deepSpace.current;
    if (!layer) return;
    const opacity = deepSpaceOpacity({ parentId: transition?.parentNode.id ?? current.id, zoom }, store.root.id);
    paintDeepSpace(layer, opacity, transition ? deepSpaceTransform(camera, viewport.width, viewport.height) : '');
  });
  const reshape = cameraReshapeProgress(zoom);
  const localTransitionRegions = useMemo(() => {
    if (!transition) return [];
    if(reshape<=0)return transition.sourceRegions;
    if(reshape>=1)return transition.targetOwners;
    return layoutEngine.layoutFromSites(transition.childNode,transition.detailChildren,transition.parentRegion.polygon,transition.sourceSites.map((site,index)=>interpolatePoint(site,transition.targetSites[index],reshape)),blendWeights(transition.sourceRegions,transition.targetOwners,reshape));
  },[layoutEngine,transition,reshape]);
  const transitionRegions = useMemo(() => {
    if (!transition) return [];
    if(zoom<=0)return transition.sourceRegions;
    if(zoom>=1)return transition.targetRegions;
    return clipCameraRegions(cameraRegions(localTransitionRegions,camera),clip);
  },[transition,zoom,localTransitionRegions,camera.scale,camera.x,camera.y,clip]);
  const transitionDetails = useMemo(() => {
    if(!transition || zoom>=1)return undefined;
    return new Map([...interpolateRegionDetails(layoutEngine,transition.detailMorphs,localTransitionRegions,reshape)]
      .map(([id,regions])=>[id,cameraRegions(regions,camera)]));
  },[layoutEngine,transition,localTransitionRegions,reshape,zoom,camera.scale,camera.x,camera.y]);
  const transitionChildProjections = useMemo(() => {
    if(!transition)return [];
    if(zoom<=0)return transition.sourceProjections;
    if(zoom>=1)return transition.targetProjections;
    return interpolateOwnedCompletionMorphs(transition.completionMorphs,transition.sourceRegions,transition.targetOwners,localTransitionRegions,reshape).map(projection=>cameraProjection(projection,camera));
  },[transition,reshape,zoom,localTransitionRegions,camera.scale,camera.x,camera.y]);

  const parentProjections = useCallback((parentNode: KnowledgeNode, childNode: KnowledgeNode, parentRegions: readonly RegionLayout[]) => projectCompletions({
    store,
    layoutEngine,
    scope: parentNode,
    clip,
    completedIds,
    firstRegions: parentRegions,
  }).filter(({ nodeId, relativeDepth }) => (
    relativeDepth > 1
    && nodeId !== childNode.id
    && !nodeId.startsWith(`${childNode.id}.`)
  )), [clip, completedIds, layoutEngine, store]);
  const transitionParentProjections = useMemo(() => transition
    ? parentProjections(transition.parentNode, transition.childNode, transition.parentRegions) : [],
  [parentProjections, transition?.childNode, transition?.parentNode, transition?.parentRegions]);
  const worldLeg = transition?.worldLeg ?? null;
  const worldProjections = useMemo(() => worldLeg
    ? parentProjections(worldLeg.parentNode, worldLeg.childNode, worldLeg.parentRegions) : [],
  [parentProjections, worldLeg]);

  // Labels for a leg, laid out once when the leg begins: the parent level's exactly as they rest
  // (so departure does not jump), the child level's as they will rest, carried on their moving
  // territories (so arrival does not jump). Fitting a label is far too slow to repeat every frame.
  const legLabels = useMemo(() => {
    if (!transition) return null;
    const restingLayouts = (levelRegions: readonly RegionLayout[]) => {
      const shapes = createShapeScope(levelRegions, { frame: clip, pxPerUnit: 1, sibling: 1 });
      return new Map(levelRegions.map(region => {
        const cell = shapes.cells.get(region.node.id);
        return [region.node.id, { layout: labelLayout(region, viewport, safe, cell ? outlinePoints(cell) : undefined), centroid: region.centroid }] as const;
      }));
    };
    const parent = restingLayouts(transition.parentRegions), child = restingLayouts(transition.targetRegions);
    return {
      parent: (region: RegionLayout): LabelLayout | undefined => parent.get(region.node.id)?.layout,
      child: (region: RegionLayout): LabelLayout | undefined => {
        const rest = child.get(region.node.id);
        return rest && { ...rest.layout, x: region.centroid[0] + rest.layout.x - rest.centroid[0], y: region.centroid[1] + rest.layout.y - rest.centroid[1] };
      },
    };
  }, [transition?.parentRegions, transition?.targetRegions, clip, safe, viewport]);

  // Shapes for one camera frame. The parent level is shaped in its own coordinates at the camera's
  // scale (a bend's size follows its on-screen length); the entered territory's edges relax toward
  // straight frame edges as the camera arrives, so the resting level takes over without a jump.
  const transitionShapes = useMemo(() => {
    if (!transition) return null;
    // The entered territory keeps its bends through most of the dive, and settles into a straight
    // frame over the last stretch, while its edge is already near the screen's.
    const relax = 1 - smoothNavigationProgress(Math.max(0, Math.min(1, (zoom - .35) / .65)));
    // Parent territories the camera has left keep their last outline: no rebuilt paths for unseen land.
    const hidden = new Set(transition.parentRegions.filter(({ bounds }) => (
      bounds.x * camera.scale + camera.x > viewport.width || (bounds.x + bounds.width) * camera.scale + camera.x < 0
      || bounds.y * camera.scale + camera.y > viewport.height || (bounds.y + bounds.height) * camera.scale + camera.y < 0
    )).map(region => region.polygon));
    const parent = createShapeScope(transition.parentRegions, {
      frame: clip, hidden, pxPerUnit: camera.scale, sibling: 1,
      focus: { polygon: transition.parentRegion.polygon, weight: relax },
    });
    const entered = parent.cells.get(transition.childNode.id);
    const window: ShapedCell | null = entered ? cameraShapedCell(entered, camera) : null;
    const children = createShapeScope(transitionRegions, { frame: clip, pxPerUnit: 1, sibling: 1, container: window });
    const parentChildren = (ownerId: string) => {
      const owner = transition.parentRegions.find(region => region.node.id === ownerId);
      return owner && layoutEngine.layout(owner.node, store.getChildren(owner.node), owner.polygon);
    };
    const childChildren = (ownerId: string) => {
      const owner = transitionRegions.find(region => region.node.id === ownerId);
      return transitionDetails?.get(ownerId) ?? (owner && layoutEngine.layout(owner.node, store.getChildren(owner.node), owner.polygon));
    };
    return {
      parent, children,
      window: window ? new Map([[transition.childNode.id, window]]) : undefined,
      windowPath: window?.path,
      parentFootprints: footprintPaths(parent, transitionParentProjections, parentChildren, camera),
      childFootprints: footprintPaths(children, transitionChildProjections, childChildren),
    };
  }, [camera, clip, layoutEngine, store, transition, transitionChildProjections, transitionDetails, transitionParentProjections, transitionRegions, viewport.height, viewport.width, zoom]);

  // A flight leg's sites: every place laid out as at rest where the leg starts and where it lands.
  const legSites = useMemo(() => mosaic && transition?.detailChildren.length
    ? flightSites(layoutEngine, transition.sourceRegions, transition.targetRegions) : null,
  [mosaic, transition?.parentNode.id, transition?.childNode.id, transition?.sourceRegions, transition?.targetRegions, layoutEngine]);
  // The land, on one canvas beneath the map. At rest: the level's land. In flight: the departing level's
  // land riding the camera around the place being entered, and inside it that place's own children, each
  // divided into exactly its own children, sliding from their places at take-off to their places on
  // landing. The first frame is the departing level's land and the last the arriving level's, exactly.
  useLayoutEffect(() => {
    const canvas = liveCanvas.current;
    if (!mosaic || !canvas) return;
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const width = Math.round(viewport.width * ratio), height = Math.round(viewport.height * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#05070f';
    context.fillRect(0, 0, viewport.width, viewport.height);
    if (!transition) {
      const land = levelLand(current);
      if (land) context.drawImage(land, 0, 0, viewport.width, viewport.height);
      return;
    }
    const ts = transitionShapes;
    const parentLand = levelLand(transition.parentNode);
    if (parentLand) {
      context.save();
      context.setTransform(ratio * camera.scale, 0, 0, ratio * camera.scale, ratio * camera.x, ratio * camera.y);
      const around = new Path2D(`M-100000,-100000H100000V100000H-100000Z${ts?.parent.cells.get(transition.childNode.id)?.path ?? polygonPath(transition.parentRegion.polygon)}`);
      context.clip(around, 'evenodd');
      context.drawImage(parentLand, 0, 0, viewport.width, viewport.height);
      context.restore();
    }
    const sceneClip = zoom <= 0 ? transition.parentRegion.polygon : zoom >= 1 ? clip : cameraPolygon(transition.parentRegion.polygon, camera);
    const window = new Path2D(ts?.windowPath ?? polygonPath(sceneClip));
    context.save();
    context.clip(window);
    context.fillStyle = '#05070f';
    context.fill(window);
    if (!transition.detailChildren.length || !legSites) {
      context.fillStyle = shadeOf(transition.childNode, paint);
      context.fill(window);
    } else {
      drawLand(context, transitionRegions.filter(region => region.polygon.length >= 3).map((region): LandTop => {
        const cell = ts?.children.cells.get(region.node.id);
        return { node: region.node, real: region.polygon, draw: cell ? outlinePoints(cell) : region.polygon, path: cell?.path ?? polygonPath(region.polygon) };
      }), { engine: layoutEngine, learned: paint, sites: legSites(reshape) });
    }
    context.restore();
  });

  const idleSpaceHoles = useMemo(() => regions.filter(region => completedIds.includes(region.node.id)).map(region => region.polygon), [regions, completedIds]);
  const idleSpaceBeacons = useMemo(() => idleCompletionProjections.map(projection => projection.centroid), [idleCompletionProjections]);
  // Fitting a label is costly; the resting level's are fitted once, not on every render of the map.
  const idleLabels = useMemo(() => new Map(regions.map(region => {
    const cell = idleShapes.cells.get(region.node.id);
    return [region.node.id, labelLayout(region, viewport, safe, cell ? outlinePoints(cell) : undefined)] as const;
  })), [idleShapes, regions, safe, viewport]);
  const placeIdleLabel = useCallback((region: RegionLayout) => idleLabels.get(region.node.id), [idleLabels]);
  const idleSpaceLabels = useMemo(() => regions.map(region => { const { x, y } = idleLabels.get(region.node.id)!; return [x, y] as Point; }), [idleLabels, regions]);
  // The same clearings as at rest (same outlines), so the sky's bitmap is reused, not rebuilt, as a flight leaves the world.
  const travelSpaceLabels = useMemo(() => {
    if (!worldLeg) return [];
    const shapes = createShapeScope(worldLeg.parentRegions, { frame: clip, pxPerUnit: 1, sibling: 1 });
    return worldLeg.parentRegions.map(region => { const cell = shapes.cells.get(region.node.id); const { x, y } = labelLayout(region, viewport, safe, cell ? outlinePoints(cell) : undefined); return [x, y] as Point; });
  }, [worldLeg, clip, safe, viewport]);
  const travelSpaceHoles = useMemo(() => worldLeg?.parentRegions.filter(region => completedIds.includes(region.node.id)).map(region => region.polygon) ?? [], [worldLeg?.parentRegions, completedIds]);
  const travelSpaceBeacons = useMemo(() => worldProjections.map(projection => projection.centroid), [worldProjections]);

  const renderIdleScene = () => (
    <>
      <g className="map-scene map-scene--idle">
        {regions.map((region) => (
          <Cell
            key={region.node.id}
            region={region}
            path={idleShapes.cells.get(region.node.id)?.path}
            className="map-cell"
            fillOverride={clear??(fill?toneAt(region.node):undefined)}
            uncharted={fogged(region.node.id)}
            interactive
            pointerHoverEnabled={pointerHoverEnabled}
            hovered={region.node.id === hoveredId}
            completed={completedIds.includes(region.node.id)}
            onHover={setHoveredId}
            onPointerIntent={rearmPointerHover}
            onSelect={enterRegion}
          />
        ))}
      </g>
      {art({ regions, shapes: idleShapes.cells })}
      <TerritoryLight regions={regions} hoveredId={hoveredId} shapes={idleShapes.cells}/>
      {atWorld&&<DeepSpace ref={deepSpace} width={viewport.width} height={viewport.height} holes={idleSpaceHoles} beacons={idleSpaceBeacons} labels={idleSpaceLabels}/>}
      {regions.length===0&&!mosaic&&<path d={polygonPath(clip)} fill={toneAt(current)} className={`leaf-territory${fogged(current.id)?' is-uncharted':''}`}/>}
      <SpectrumPreviewLayer mode={mosaic?'off':colorPreview} scope={current} clip={clip} regions={regions} engine={layoutEngine} shapes={idleShapes}/>
      {/* Earned pieces sit beneath names so a filled fragment never covers the label above it. */}
      {!mosaic&&<CompletionLayer projections={idleCompletionProjections} paths={idleFootprints} />}
      <FreshGlow items={idleGlow} />
      <MapDetails minimal={mosaic} learningCounts={learningCounts} frontierIds={frontierIds} noteCounts={noteCounts} regions={regions} store={store} engine={layoutEngine} viewport={viewport} hoveredId={hoveredId} completedIds={completedIds} charted={fillPaint?charted:undefined} shapes={idleShapes} safe={safe} placeLabel={placeIdleLabel} glyphs={emblems} />
      <TerritoryBorders regions={regions} namespace="idle" hoveredId={hoveredId} shapes={idleShapes.cells}/>
    </>
  );

  const renderTransitionScene = () => {
    if (!transition) return null;
    const reveal=(start:number,end:number)=>smoothNavigationProgress(Math.max(0,Math.min(1,(zoom-start)/(end-start))));
    const surfaceReveal=reveal(0,.24);
    // Line reveal on the zoom clock: child borders open as the camera arrives.
    const lineReveal=reveal(.08,.5);
    const ts=transitionShapes;
    const labelReveal=reveal(.24,.76);
    const parentLabelReveal=1-reveal(.26,.7);
    const transform=`translate(${camera.x} ${camera.y}) scale(${camera.scale})`;
    const parentFill=toneAt(transition.childNode);
    const sceneClip=zoom<=0?transition.parentRegion.polygon:zoom>=1?clip:cameraPolygon(transition.parentRegion.polygon,camera);
    return <>
      {/* The land is drawn beneath and the cells are clear, so nothing of the departing level (its light,
          borders, contours) may show inside the place being entered. */}
      {mosaic&&<defs><clipPath id="camera-around-window" clipRule="evenodd"><path clipRule="evenodd" d={`M-100000,-100000H100000V100000H-100000Z${ts?.parent.cells.get(transition.childNode.id)?.path ?? polygonPath(transition.parentRegion.polygon)}`}/></clipPath></defs>}
      <g className="map-camera-context" transform={transform} aria-hidden="true" clipPath={mosaic?'url(#camera-around-window)':undefined}>
       <g className="map-scene map-scene--parent">
        {transition.parentRegions.map(region=><Cell key={region.node.id} region={region} path={ts?.parent.cells.get(region.node.id)?.path} className="map-cell" completed={completedIds.includes(region.node.id)} uncharted={fogged(region.node.id)} fillOverride={clear??(fill?toneAt(region.node):undefined)}/>)}
       </g>
       {art({ regions: transition.parentRegions, shapes: ts?.parent.cells })}
       <TerritoryLight regions={transition.parentRegions} shapes={ts?.parent.cells}/>
       {/* Mounted for the whole flight and hidden off its world leg, so reaching the world never pauses to build the sky. */}
       {worldLeg&&<DeepSpace ref={deepSpace} width={viewport.width} height={viewport.height} holes={travelSpaceHoles} beacons={travelSpaceBeacons} labels={travelSpaceLabels}/>}
       <SpectrumPreviewLayer mode={mosaic?'off':colorPreview} scope={transition.parentNode} clip={clip} regions={transition.parentRegions} engine={layoutEngine} shapes={ts?.parent}/>
       <TerritoryBorders regions={transition.parentRegions} namespace="transition-parent" shapes={ts?.parent.cells}/>
      </g>
      {!mosaic&&<CompletionLayer projections={transitionParentProjections.map(projection=>cameraProjection(projection,camera))} paths={ts?.parentFootprints}/>}
      <g className="transition-scene" opacity={1} aria-hidden="true">
       {transition.detailChildren.length===0&&!mosaic&&<path d={ts?.windowPath??polygonPath(sceneClip)} fill={parentFill} className="transition-cell"/>}
       {transitionRegions.map(region=><Cell key={region.node.id} region={region} path={ts?.children.cells.get(region.node.id)?.path} className="transition-cell" completed={completedIds.includes(region.node.id)} uncharted={fogged(region.node.id)} outlineOpacity={lineReveal} fillOverride={clear??mixTone(parentFill,toneAt(region.node),surfaceReveal)}/>)}
       {/* The arriving level's own mosaic, laid out for the screen, fades in over the zoomed one. */}
       {/* The entered territory keeps its own ground and rides the camera in, then hands over to its children's. */}
       {ground&&<g transform={transform}>{art({ regions: [transition.parentRegion], shapes: ts?.parent.cells, opacity: 1-reveal(.3,.85) })}</g>}
       {art({ regions: transitionRegions, shapes: ts?.children.cells, opacity: reveal(.3,.85) })}
       {/* The entered territory's light hands over to its children's on the surface clock. */}
       <TerritoryLight regions={[{...transition.parentRegion,polygon:sceneClip}]} opacity={1-surfaceReveal} shapes={ts?.window}/>
       <TerritoryLight regions={transitionRegions} opacity={surfaceReveal} shapes={ts?.children.cells}/>
       {colorPreview!=='off'&&!mosaic&&<>
        <defs><clipPath id="spectrum-travel-window"><path d={ts?.windowPath??polygonPath(sceneClip)}/></clipPath></defs>
        <g clipPath="url(#spectrum-travel-window)"><g transform={transform}>
         <SpectrumPreviewLayer mode={mosaic?'off':colorPreview} scope={transition.parentNode} clip={clip} regions={transition.parentRegions} engine={layoutEngine} opacity={1-surfaceReveal} shapes={ts?.parent}/>
        </g></g>
        <SpectrumPreviewLayer mode={mosaic?'off':colorPreview} scope={transition.childNode} clip={sceneClip} regions={transitionRegions} engine={layoutEngine} detailRegions={transitionDetails} opacity={surfaceReveal} shapes={ts?.children}/>
       </>}
       <g className="map-contours" opacity={1-lineReveal}>{transitionRegions.map(region=><path key={region.node.id} d={ts?.children.cells.get(region.node.id)?.path??polygonPath(region.polygon)}/>)}</g>
       {!mosaic&&<CompletionLayer projections={transitionChildProjections.filter(({relativeDepth})=>relativeDepth>1)} paths={ts?.childFootprints}/>}
       {!mosaic&&<CompletionLayer projections={transitionChildProjections.filter(({relativeDepth})=>relativeDepth===1)} opacity={1-surfaceReveal} paths={ts?.childFootprints}/>}
       <MapDetails minimal={mosaic} learningCounts={learningCounts} frontierIds={frontierIds} noteCounts={noteCounts} regions={transitionRegions} store={store} engine={layoutEngine} viewport={viewport} hoveredId={null} completedIds={completedIds} charted={fillPaint?charted:undefined} detailRegions={transitionDetails} opacity={labelReveal} shapes={ts?.children} safe={safe} placeLabel={legLabels?.child} glyphs={emblems}/>
      </g>
      <g className="map-camera-labels" transform={transform}>
       <MapDetails minimal={mosaic} learningCounts={learningCounts} frontierIds={frontierIds} noteCounts={noteCounts} regions={transition.parentRegions} store={store} engine={layoutEngine} viewport={viewport} hoveredId={null} completedIds={completedIds} charted={fillPaint?charted:undefined} detailRegions={new Map([[transition.childNode.id,[]]])} opacity={parentLabelReveal} shapes={ts?.parent} safe={safe} placeLabel={legLabels?.parent} glyphs={emblems}/>
      </g>
      <TerritoryBorders regions={transitionRegions} namespace="transition-detail" opacity={lineReveal} shapes={ts?.children.cells}/>
      <TerritoryBorders regions={[{...transition.parentRegion,polygon:sceneClip}]} namespace="transition-window" opacity={1-lineReveal} shapes={ts?.window}/>
    </>;
  };

  return (
    <main
      ref={shellRef}
      className={`map-system${transition ? ' is-navigating' : ''}${pointerHoverEnabled ? ' is-pointer-hover-enabled' : ''}`}
      data-transition-progress={transition?.progress}
      data-transition-direction={transition?.direction}
      data-camera-scale={transition?camera.scale:undefined}
      data-journey-progress={transition?.routeFrame.progress}
      data-journey-scale={transition?.routeFrame.scale}
      data-journey-leg={transition?.routeFrame.leg}
      data-journey-length={transition?.routeFrame.length}
    >
      {/* The flight's live land, beneath the map: the svg above is clear wherever it shows. */}
      {mosaic&&<canvas ref={liveCanvas} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: viewport.width, height: viewport.height, pointerEvents: 'none' }}/>}
      <svg
        className="map-viewport"
        // Positioned, so it stacks above the flight's live land canvas (an absolutely positioned sibling).
        style={mosaic ? { position: 'relative' } : undefined}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        width={viewport.width}
        height={viewport.height}
        aria-label={`Map of ${current.name}. ${children.length} regions.`}
      >
        <defs>
          <radialGradient id="atlas-light"><stop offset="0" stopColor="#c8d3ff" stopOpacity=".04"/><stop offset="1" stopColor="#070a14" stopOpacity="0"/></radialGradient>
          <radialGradient id="atlas-vignette" cx=".5" cy=".47" r=".78"><stop offset=".6" stopColor="#020309" stopOpacity="0"/><stop offset="1" stopColor="#020309" stopOpacity=".42"/></radialGradient>
        </defs>
        <rect className="map-background" width={viewport.width} height={viewport.height} style={mosaic?{fill:'transparent'}:undefined}/>
        {transition ? renderTransitionScene() : renderIdleScene()}
        <rect width={viewport.width} height={viewport.height} fill="url(#atlas-light)" pointerEvents="none"/>
        <rect className="atlas-vignette" width={viewport.width} height={viewport.height} fill="url(#atlas-vignette)" pointerEvents="none"/>
      </svg>

      <div className="map-safe-area" ref={safeProbe} aria-hidden="true"/>
      <p className="sr-only" aria-live="polite">
        Viewing depth {current.depth}. {children.length} regions available. {completedIds.length} completion marks.
      </p>
    </main>
  );
}
