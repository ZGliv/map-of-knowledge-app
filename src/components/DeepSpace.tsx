import { forwardRef, memo, useEffect, useLayoutEffect, useState } from 'react';
import { createRandom } from '../spatial/deterministic';
import type { NavigationCamera } from '../spatial/CameraNavigation';
import type { Point, Polygon } from '../spatial/types';

/*
 * Deep space at the world view: a deterministic starfield painted once into a
 * bitmap, layered just above the territory fills and beneath every border,
 * label, icon and completion mark. The atlas fills its viewport edge to edge,
 * so the dark land is the only "background" there is; stars sit in that dark
 * and never over data. Opacity and parallax are written imperatively on the
 * camera clock (see Atlas), so the stars never cause a React render per frame.
 */

const FIELD = 1536; // one deterministic patch of sky in CSS px, wrapped to cover any viewport
const SEED = 'map-of-knowledge/deep-space';
const PARALLAX_ZOOM = 0.3; // stars zoom at camera.scale ** 0.3: far behind the land
const PARALLAX_DRIFT = 0.35; // and follow the camera's focus at a third of its pace
const FADE_END = 0.55; // fully gone by this point of the parent-to-child zoom

interface Star { x: number; y: number; r: number; a: number; color: string; glow: number }
interface Haze { x: number; y: number; r: number; color: string }

let SKY: { stars: Star[]; haze: Haze[] } | null = null;
const sky = () => {
  if (SKY) return SKY;
  const random = createRandom(SEED);
  const tint = () => { const t = random(); return t < .62 ? '236,241,255' : t < .86 ? '200,216,255' : '255,236,214'; };
  const stars: Star[] = [];
  const layer = (count: number, r: [number, number], a: [number, number], glow: number) => {
    for (let i = 0; i < count; i += 1) stars.push({
      x: random() * FIELD, y: random() * FIELD,
      r: r[0] + random() * (r[1] - r[0]), a: a[0] + random() ** 1.6 * (a[1] - a[0]),
      color: tint(), glow: glow ? glow * (.7 + random() * .6) : 0,
    });
  };
  layer(1150, [.34, .66], [.16, .48], 0); // dust
  layer(240, [.6, 1], [.38, .78], 0); // stars
  layer(20, [.9, 1.35], [.82, 1], 8); // a few bright ones with a soft glow
  // A faint galactic band running corner to corner; its slope wraps seamlessly from one patch to the next.
  const band = (u: number, spread: number) => {
    const g = (random() + random() + random() - 1.5) * spread;
    return [u * FIELD + g * .7, (.72 - u) * FIELD + g] as const;
  };
  for (let i = 0; i < 900; i += 1) {
    const [x, y] = band(random(), .11 * FIELD);
    stars.push({ x: (x + FIELD) % FIELD, y: (y + FIELD) % FIELD, r: .28 + random() * .4, a: .12 + random() ** 1.5 * .38, color: tint(), glow: 0 });
  }
  const haze: Haze[] = [
    { x: .2, y: .52, r: .34, color: '96,88,204' },
    { x: .47, y: .25, r: .3, color: '126,84,186' },
    { x: .78, y: .94, r: .36, color: '58,128,176' },
    { x: .72, y: .55, r: .22, color: '170,96,160' },
  ].map(h => ({ x: h.x * FIELD, y: h.y * FIELD, r: h.r * FIELD, color: h.color }));
  return (SKY = { stars, haze });
};

type Part = 'haze' | 'stars';

/**
 * Paint one layer of sky for a viewport size, anchored at its centre so resizing only reveals more sky.
 * Stars are painted at up to 2x DPR; the soft haze needs only a quarter-resolution bitmap.
 */
function paintSky(part: Part, width: number, height: number, scale: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = 'lighter';
  const ox = width / 2 - FIELD / 2, oy = height / 2 - FIELD / 2;
  const { stars, haze } = sky();
  const tiles = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
    for (let tx = Math.floor((-reach - ox - x) / FIELD); ox + x + tx * FIELD < width + reach; tx += 1)
      for (let ty = Math.floor((-reach - oy - y) / FIELD); oy + y + ty * FIELD < height + reach; ty += 1)
        draw(ox + x + tx * FIELD, oy + y + ty * FIELD);
  };
  if (part === 'haze') for (const h of haze) tiles(h.x, h.y, h.r, (x, y) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, h.r);
    g.addColorStop(0, `rgba(${h.color},.12)`);
    g.addColorStop(.5, `rgba(${h.color},.045)`);
    g.addColorStop(1, `rgba(${h.color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - h.r, y - h.r, h.r * 2, h.r * 2);
  });
  if (part === 'stars') for (const s of stars) tiles(s.x, s.y, s.glow + 2, (x, y) => {
    if (s.glow) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s.glow);
      g.addColorStop(0, `rgba(${s.color},.26)`);
      g.addColorStop(.35, `rgba(${s.color},.07)`);
      g.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s.glow, y - s.glow, s.glow * 2, s.glow * 2);
    }
    ctx.fillStyle = `rgba(${s.color},${s.a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}

// Module cache: the idle and travelling scenes each mount their own <image>s, and both reuse the bitmaps.
const URLS = new Map<string, Promise<string | null>>();
const skyUrl = (part: Part, width: number, height: number): Promise<string | null> => {
  const scale = part === 'haze' ? .25 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const key = `${part}:${width}x${height}@${scale}`;
  let url = URLS.get(key);
  if (!url) {
    url = new Promise(resolve => {
      const canvas = paintSky(part, width, height, scale);
      if (!canvas) return resolve(null);
      canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : null));
    });
    URLS.set(key, url);
    while (URLS.size > 6) { // keep a few recent sizes, release the rest
      const [oldest, stale] = URLS.entries().next().value!;
      URLS.delete(oldest);
      void stale.then(href => href && URL.revokeObjectURL(href));
    }
  }
  return url;
};

/**
 * The stars with their clearings already cut out, as one bitmap. An SVG mask over a full-screen
 * image is recomposited on every camera frame and was most of a world flight's cost on a phone;
 * a plain image moves for free. The clearings ride with the stars' gentle parallax during a
 * flight (the stars are fading out by then) and sit exactly where the mask put them at rest.
 */
const MASKED = new Map<string, Promise<string | null>>();
const maskedStarsUrl = (width: number, height: number, holes: readonly Polygon[], beacons: readonly Point[], labels: readonly Point[]): Promise<string | null> => {
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const round = (point: Point) => `${Math.round(point[0])},${Math.round(point[1])}`;
  const key = `${width}x${height}@${scale}|${holes.map(polygon => polygon.map(round).join(' ')).join(';')}|${beacons.map(round).join(';')}|${labels.map(round).join(';')}`;
  let url = MASKED.get(key);
  if (!url) {
    url = new Promise(resolve => {
      const canvas = paintSky('stars', width, height, scale);
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return resolve(null);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      for (const polygon of holes) {
        ctx.beginPath();
        polygon.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // A clearing: fully clear inside 60% of its radius, fading back to stars at the rim.
      const clearing = (x: number, y: number, rx: number, ry: number) => {
        ctx.save();
        ctx.translate(x, y); ctx.scale(rx, ry);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, 'rgba(0,0,0,1)'); gradient.addColorStop(.6, 'rgba(0,0,0,1)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      const compact = width < 600;
      for (const [x, y] of labels) clearing(x, y - (compact ? 8 : 14), compact ? 72 : 132, compact ? 60 : 100);
      for (const [x, y] of beacons) clearing(x, y, 26, 26);
      canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : null));
    });
    MASKED.set(key, url);
    while (MASKED.size > 6) {
      const [oldest, stale] = MASKED.entries().next().value!;
      MASKED.delete(oldest);
      void stale.then(href => href && URL.revokeObjectURL(href));
    }
  }
  return url;
};

/** How much deep space shows for a camera frame: all of it at the world view, none below it. */
export function deepSpaceOpacity(frame: { parentId: string; zoom: number }, rootId: string): number {
  if (frame.parentId !== rootId) return 0;
  const t = Math.max(0, Math.min(1, frame.zoom / FADE_END));
  return 1 - t * t * (3 - 2 * t);
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * SVG transform for the star layer when it sits inside the camera's group: undo the camera,
 * then apply a much gentler zoom/drift about the viewport centre (parallax).
 */
export function deepSpaceTransform(camera: NavigationCamera, width: number, height: number): string {
  const { scale: s, x: tx, y: ty } = camera;
  if (s === 1 && tx === 0 && ty === 0) return '';
  const vx = width / 2, vy = height / 2;
  const still = reducedMotion();
  const sp = still ? 1 : s ** PARALLAX_ZOOM;
  const drift = still ? 0 : PARALLAX_DRIFT;
  const qx = (vx - tx) / s, qy = (vy - ty) / s; // parent point now under the viewport centre
  const sx = (1 - sp) * vx - drift * sp * (qx - vx);
  const sy = (1 - sp) * vy - drift * sp * (qy - vy);
  return `translate(${(sx - tx) / s} ${(sy - ty) / s}) scale(${sp / s})`;
}

/** Write one camera frame onto a mounted layer: plain DOM attributes, no React render. */
export function paintDeepSpace(layer: SVGGElement, opacity: number, transform: string): void {
  layer.setAttribute('opacity', opacity.toFixed(4));
  layer.setAttribute('visibility', opacity > 0 ? 'visible' : 'hidden');
  layer.dataset.transform = transform;
  layer.querySelectorAll('[data-parallax]').forEach(node => {
    if (transform) node.setAttribute('transform', transform); else node.removeAttribute('transform');
  });
}

export interface DeepSpaceProps {
  readonly width: number;
  readonly height: number;
  /** Earned territory and completion marks, in the same coordinates as the layer: stars stay off them. */
  readonly holes?: readonly Polygon[];
  readonly beacons?: readonly Point[];
  /** Territory centroids: a soft clearing keeps stars from crowding each name, motif and caption. */
  readonly labels?: readonly Point[];
}

export const DeepSpace = memo(forwardRef<SVGGElement, DeepSpaceProps>(function DeepSpace({ width, height, holes = [], beacons = [], labels = [] }, ref) {
  const [href, setHref] = useState<{ haze: string | null; stars: string | null }>({ haze: null, stars: null });
  const masked = holes.length > 0 || beacons.length > 0 || labels.length > 0;
  useEffect(() => {
    let live = true;
    void Promise.all([skyUrl('haze', width, height), masked ? maskedStarsUrl(width, height, holes, beacons, labels) : skyUrl('stars', width, height)])
      .then(([haze, stars]) => { if (live) setHref({ haze, stars }); });
    return () => { live = false; };
  }, [width, height, masked, holes, beacons, labels]);
  useLayoutEffect(() => {
    const layer = (ref as { current: SVGGElement | null } | null)?.current;
    if (layer?.dataset.transform) layer.querySelectorAll('[data-parallax]').forEach(node => node.setAttribute('transform', layer.dataset.transform!));
  }, [href, ref]);
  return (
    <g className="deep-space" ref={ref} aria-hidden="true" pointerEvents="none">
      {href.haze && <g data-parallax=""><image href={href.haze} width={width} height={height} preserveAspectRatio="none"/></g>}
      {href.stars && <g data-parallax=""><image href={href.stars} width={width} height={height} preserveAspectRatio="none"/></g>}
    </g>
  );
}));

/**
 * The same sky as a plain HTML layer: Explore's desktop reel column floats on it. It is composited,
 * not repainted per frame.
 */
export const DeepSpaceBackdrop = memo(forwardRef<HTMLDivElement, { readonly width: number; readonly height: number }>(function DeepSpaceBackdrop({ width, height }, ref) {
  const [urls, setUrls] = useState<readonly string[]>([]);
  useEffect(() => {
    let live = true;
    void Promise.all([skyUrl('stars', width, height), skyUrl('haze', width, height)])
      .then(found => { if (live) setUrls(found.filter((url): url is string => !!url)); });
    return () => { live = false; };
  }, [width, height]);
  return <div className="deep-space-backdrop" aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#070a14', pointerEvents: 'none' }}>
    <div ref={ref} style={{
      position: 'absolute', inset: 0, willChange: 'opacity',
      backgroundImage: urls.map(url => `url(${url})`).join(','),
      backgroundSize: `${width}px ${height}px`, backgroundRepeat: 'no-repeat',
    }}/>
  </div>;
}));
