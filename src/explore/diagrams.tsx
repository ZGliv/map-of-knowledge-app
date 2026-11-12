import { memo, useId, type ReactNode } from 'react';
import type { ReelDiagram } from './types';
import { paintDiagramA, ReelDiagramViewA } from './diagrams-a';
import { paintDiagramB, ReelDiagramViewB } from './diagrams-b';

// Code-drawn figures for reels. React draws each one once; `paintDiagram` then moves it on the
// reel's own clock (progress 0–1 through the frame, plus elapsed ms for idle motion), writing SVG
// attributes directly so a playing reel never re-renders per animation frame. Every step's start
// matches the previous step's end, so consecutive frames cross-fade without a jump.
// All figures share one 360-wide box, drawn between y = 10 and 460, and sit above the caption.

const W = 360;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
const set = (el: Element | null | undefined, attrs: Record<string, string | number>) => {
  if (!el) return;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
};
const parts = (root: SVGSVGElement, name: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-part="${name}"]`));

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return <svg className="reel-diagram-svg" viewBox={`0 10 ${W} 450`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>{children}</svg>;
}

/* The MEGA-plate, stood on its end: bare ends top and bottom, stronger bands toward the middle. */
const PLATE = { x: 78, y: 34, w: 214, h: 405, labels: ['0', '1', '10', '100', '1,000', '100', '10', '1', '0'] };
const bandH = PLATE.h / PLATE.labels.length;
const bandTop = (i: number) => PLATE.y + i * bandH;
const depthOf = (i: number) => Math.min(i, PLATE.labels.length - 1 - i) / 4;
/** Where each band's breakthrough starts, as a fraction across the dish (from Fig. 1C's look, not its data). */
const FAN_X = [0, 0.32, 0.74, 0.22, 0.6, 0.38, 0.8, 0.66, 0];

function Plate() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <Frame label="The dish seen from above, its bands of antibiotic labelled 0, 1, 10, 100 and 1,000 from each end to the middle">
    <defs>
      {PLATE.labels.map((_, i) => <clipPath key={i} id={`${uid}-band-${i}`}><rect x={PLATE.x} y={bandTop(i)} width={PLATE.w} height={bandH + 0.5} /></clipPath>)}
      <filter id={`${uid}-glow`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    {PLATE.labels.map((label, i) => <g key={i}>
      <rect data-part="band" x={PLATE.x} y={bandTop(i)} width={PLATE.w} height={bandH} className="dg-band" style={{ fillOpacity: 0.05 + depthOf(i) * 0.5 }} opacity="0" />
      <text data-part="label" x={PLATE.x - 14} y={bandTop(i) + bandH / 2 + 5} textAnchor="end" className="dg-label" opacity="0">{label}</text>
    </g>)}
    <g filter={`url(#${uid}-glow)`}>
      {PLATE.labels.map((_, i) => {
        const fromTop = i <= 4;
        const cy = fromTop ? bandTop(i) : bandTop(i) + bandH;
        return <g key={i} clipPath={`url(#${uid}-band-${i})`}>
          <rect data-part="fill" x={PLATE.x} y={bandTop(i)} width={PLATE.w} height={bandH} className="dg-cells" opacity="0" />
          <circle data-part="fan" cx={PLATE.x + PLATE.w * FAN_X[i]} cy={cy} r="0" className="dg-cells" />
        </g>;
      })}
    </g>
    <rect data-part="dish" x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} rx="10" className="dg-outline" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
  </Frame>;
}

function paintPlate(root: SVGSVGElement, step: string, p: number, ms: number) {
  const bands = parts(root, 'band'), labels = parts(root, 'label'), fills = parts(root, 'fill'), fans = parts(root, 'fan');
  const last = PLATE.labels.length - 1;
  const show = step === 'bands' ? (i: number) => span(p, 0.15 + i * 0.04, 0.45 + i * 0.04) : () => 1;
  set(parts(root, 'dish')[0], { 'stroke-dashoffset': step === 'bands' ? 1 - ease(span(p, 0, 0.45)) : 0 });
  bands.forEach((band, i) => set(band, { opacity: show(i) }));
  labels.forEach((label, i) => {
    let o = step === 'bands' ? span(p, 0.4 + i * 0.03, 0.6 + i * 0.03) * 0.75 : 0.75;
    // While the strengths are read out, each band brightens from the ends to the middle.
    if (step === 'stall') o = 0.55 + 0.45 * span(p, 0.12 + depthOf(i) * 0.6, 0.22 + depthOf(i) * 0.6);
    set(label, { opacity: o.toFixed(3) });
  });
  // Bacteria: the bare ends fill first; each band then fills from one breakthrough point.
  const ends = step === 'bands' ? ease(span(p, 0.7, 1)) : 1;
  const radius = (i: number): number => {
    const full = 240;
    if (i === 0 || i === last) return 0;
    const band = Math.min(i, last - i); // 1..4, the middle last
    if (step === 'bands' || step === 'stall') return 0;
    if (step === 'breakthrough') {
      if (band !== 1) return 0;
      return full * ease(span(p, i <= 4 ? 0.38 : 0.52, i <= 4 ? 0.95 : 1));
    }
    if (band === 1) return full;
    const windows: Record<number, [number, number]> = i <= 4 ? { 2: [0, 0.34], 3: [0.32, 0.66], 4: [0.64, 1] } : { 2: [0.08, 0.42], 3: [0.4, 0.74] };
    const w = windows[band];
    return w ? full * ease(span(p, w[0], w[1])) : 0;
  };
  fills.forEach((fill, i) => set(fill, { opacity: i === 0 || i === last ? ends : 0 }));
  fans.forEach((fan, i) => set(fan, { r: radius(i).toFixed(1) }));
  // A stalled front flickers against the first wall.
  if (step === 'stall' || (step === 'breakthrough' && p < 0.4)) {
    const flicker = 0.86 + 0.14 * Math.sin(ms / 260);
    set(fills[0], { opacity: flicker.toFixed(3) }); set(fills[last], { opacity: flicker.toFixed(3) });
  }
}

/* A population: a few cells carry a change before any drug arrives. */
const COLS = 8, ROWS = 10, CELL = { x0: 58, y0: 46, dx: 35, dy: 39, r: 11 };
const cellAt = (i: number) => ({ x: CELL.x0 + (i % COLS) * CELL.dx, y: CELL.y0 + Math.floor(i / COLS) * CELL.dy });
const LUCKY = [13, 38, 51, 66];
const NEUTRAL = [5, 22, 29, 44, 59, 73, 76];
const nearestLucky = (i: number) => Math.min(...LUCKY.map(j => Math.hypot(cellAt(i).x - cellAt(j).x, cellAt(i).y - cellAt(j).y)));
const REGROW_ORDER = Array.from({ length: COLS * ROWS }, (_, i) => i).filter(i => !LUCKY.includes(i)).sort((a, b) => nearestLucky(a) - nearestLucky(b));

function Sorting() {
  return <Frame label="A grid of bacterial cells, a few of them carrying a change that resists the drug">
    <rect data-part="wash" x="30" y="20" width="300" height="0" className="dg-wash" />
    {Array.from({ length: COLS * ROWS }, (_, i) => <circle key={i} data-part="cell" cx={cellAt(i).x} cy={cellAt(i).y} r={CELL.r} className="dg-cell" opacity="0" />)}
  </Frame>;
}

function paintSorting(root: SVGSVGElement, step: string, p: number) {
  const cells = parts(root, 'cell');
  const wash = parts(root, 'wash')[0];
  const washY = step === 'drug' ? 20 + 420 * ease(span(p, 0, 0.75)) : step === 'regrow' ? 440 : 20;
  set(wash, { height: Math.max(0, washY - 20), opacity: step === 'regrow' ? Math.max(0, 1 - p * 2.5) : 1 });
  cells.forEach((cell, i) => {
    const lucky = LUCKY.includes(i), neutral = NEUTRAL.includes(i);
    const { y } = cellAt(i);
    let opacity = 1, kind = 'plain', scale = 1;
    if (step === 'before') {
      scale = ease(span(p, i * 0.004, 0.25 + i * 0.004));
      opacity = scale;
      if (neutral && p > 0.5 + (i % 3) * 0.05) kind = 'changed';
      if (lucky && p > 0.62 + LUCKY.indexOf(i) * 0.06) kind = 'lucky';
    } else {
      kind = lucky ? 'lucky' : neutral ? 'changed' : 'plain';
      const hit = step === 'regrow' || washY > y + CELL.r;
      if (!lucky && hit) { kind = 'dead'; opacity = 1; }
      if (step === 'regrow' && !lucky) {
        const order = REGROW_ORDER.indexOf(i) / REGROW_ORDER.length;
        if (p > 0.05 + order * 0.85) kind = 'lucky';
      }
    }
    set(cell, { opacity: opacity.toFixed(3), r: (CELL.r * scale).toFixed(2), class: `dg-cell is-${kind}` });
  });
}

/* Rock layers, oldest at the bottom: fish only below, four legs above, a gap between. */
const LAYERS = [
  { y: 352, h: 78, age: '', fill: 'dg-rock-a' },
  { y: 270, h: 82, age: '385 million years', note: 'fish only', fill: 'dg-rock-b' },
  { y: 192, h: 78, age: '375 million years', fill: 'dg-rock-c' },
  { y: 112, h: 80, age: '365 million years', note: 'four legs', fill: 'dg-rock-b' },
  { y: 40, h: 72, age: '', fill: 'dg-rock-a' },
];
const COLUMN = { x: 34, w: 176 };

function Strata() {
  return <Frame label="Rock layers: fish only in rock 385 million years old, animals with four legs by 365 million, and the layer between at 375 million">
    {LAYERS.map((layer, i) => <g key={i} data-part="layer" opacity="0">
      <rect x={COLUMN.x} y={layer.y} width={COLUMN.w} height={layer.h} className={`dg-rock ${layer.fill}`} />
      <path d={`M${COLUMN.x} ${layer.y + layer.h * 0.35}h${COLUMN.w}M${COLUMN.x} ${layer.y + layer.h * 0.7}h${COLUMN.w}`} className="dg-seam" />
    </g>)}
    <rect data-part="target" x={COLUMN.x} y={LAYERS[2].y} width={COLUMN.w} height={LAYERS[2].h} className="dg-target" opacity="0" />
    {/* A fish in the 385 layer, a four-legged animal in the 365 layer. */}
    <g data-part="fish" opacity="0" transform={`translate(${COLUMN.x + 58} ${LAYERS[1].y + 30})`}>
      <path d="M0 12 C14 -2 44 -2 58 12 C44 26 14 26 0 12 Z M58 12 L74 0 L72 24 Z" className="dg-glyph" />
      <circle cx="12" cy="10" r="2" className="dg-glyph-eye" />
    </g>
    <g data-part="tetrapod" opacity="0" transform={`translate(${COLUMN.x + 46} ${LAYERS[3].y + 30})`}>
      <path d="M0 14 C10 4 30 4 50 10 C66 14 80 12 92 8 C82 18 66 22 50 20 C32 22 12 22 0 14 Z" className="dg-glyph" />
      <path d="M18 19 l-6 14 M28 20 l4 14 M52 20 l-5 13 M62 19 l6 13" className="dg-glyph-line" />
      <circle cx="9" cy="12" r="2" className="dg-glyph-eye" />
    </g>
    <text data-part="question" x={COLUMN.x + COLUMN.w / 2} y={LAYERS[2].y + 52} textAnchor="middle" className="dg-question" opacity="0">?</text>
    {LAYERS.map((layer, i) => layer.age && <g key={i} data-part="caption" opacity="0">
      <text x={COLUMN.x + COLUMN.w + 14} y={layer.y + layer.h / 2 - (layer.note ? 2 : -5)} className="dg-age">{layer.age}</text>
      {layer.note && <text x={COLUMN.x + COLUMN.w + 14} y={layer.y + layer.h / 2 + 18} className="dg-note">{layer.note}</text>}
    </g>)}
    <line data-part="dig" x1={COLUMN.x + COLUMN.w * 0.62} y1="22" x2={COLUMN.x + COLUMN.w * 0.62} y2="22" className="dg-dig" />
    <circle data-part="site" cx={COLUMN.x + COLUMN.w * 0.62} cy={LAYERS[2].y + LAYERS[2].h / 2} r="0" className="dg-site" />
  </Frame>;
}

function paintStrata(root: SVGSVGElement, step: string, p: number, ms: number) {
  const layers = parts(root, 'layer'), captions = parts(root, 'caption');
  const gap = step === 'gap';
  // Layers settle from the oldest up.
  layers.forEach((layer, i) => set(layer, { opacity: gap ? ease(span(p, i * 0.07, 0.2 + i * 0.07)) : 1 }));
  set(parts(root, 'fish')[0], { opacity: gap ? ease(span(p, 0.32, 0.5)) : 1 });
  set(parts(root, 'tetrapod')[0], { opacity: gap ? ease(span(p, 0.56, 0.74)) : 1 });
  const captionAt = [0, gap ? span(p, 0.32, 0.5) : 1, gap ? 0 : ease(span(p, 0.08, 0.3)), gap ? span(p, 0.56, 0.74) : 1];
  let c = 0;
  LAYERS.forEach((layer, i) => { if (layer.age) { set(captions[c], { opacity: (i === 0 ? (gap ? span(p, 0.2, 0.35) * 0.6 : 0.6) : captionAt[i]).toFixed(3) }); c += 1; } });
  set(parts(root, 'question')[0], { opacity: gap ? ease(span(p, 0.8, 0.95)) : Math.max(0, 1 - p * 4) });
  const glow = gap ? 0 : ease(span(p, 0, 0.3)) * (0.34 + 0.1 * Math.sin(ms / 420));
  set(parts(root, 'target')[0], { opacity: glow.toFixed(3) });
  const digTo = gap ? 22 : 22 + (LAYERS[2].y + LAYERS[2].h / 2 - 22) * ease(span(p, 0.35, 0.8));
  set(parts(root, 'dig')[0], { y2: digTo.toFixed(1) });
  set(parts(root, 'site')[0], { r: gap ? 0 : (9 * ease(span(p, 0.78, 0.92))).toFixed(1) });
}

/* A hammer and a feather, dropped together from shoulder height. */
const DROP = { top: 96, ground: 426, hammer: 124, feather: 238 };

function Fall({ step }: { step: string }) {
  return <Frame label={step === 'air' ? 'In air, the hammer lands first and the feather drifts down after it' : 'With no air, the hammer and the feather fall slowly and land together'}>
    <text x={W / 2} y="44" textAnchor="middle" className="dg-age">{step === 'air' ? 'Earth, in air' : 'Moon, no air'}</text>
    <line x1="40" x2="320" y1={DROP.ground + 22} y2={DROP.ground + 22} className="dg-ground" />
    <path d={`M40 ${DROP.top - 8}h280`} className="dg-start" />
    <g data-part="hammer" transform={`translate(${DROP.hammer} ${DROP.top})`}>
      <rect x="-4" y="-2" width="8" height="40" rx="3" className="dg-handle" />
      <rect x="-20" y="-12" width="40" height="15" rx="3" className="dg-head" />
    </g>
    <g data-part="feather" transform={`translate(${DROP.feather} ${DROP.top})`}>
      <path d="M0 40 C-4 26 -14 10 -4 -14 C6 -2 10 18 0 40 Z" className="dg-vane" />
      <path d="M0 44 L-3 -10" className="dg-quill" />
    </g>
    {[DROP.hammer, DROP.feather].map(x => <g key={x} data-part="dust">
      <ellipse cx={x - 14} cy={DROP.ground + 20} rx="0" ry="0" className="dg-dust" />
      <ellipse cx={x + 14} cy={DROP.ground + 20} rx="0" ry="0" className="dg-dust" />
    </g>)}
  </Frame>;
}

function paintFall(root: SVGSVGElement, step: string, p: number, ms: number) {
  const distance = DROP.ground - DROP.top;
  const hammer = parts(root, 'hammer')[0], feather = parts(root, 'feather')[0];
  const drop = (q: number) => DROP.top + distance * Math.min(1, q * q);
  if (step === 'air') {
    set(hammer, { transform: `translate(${DROP.hammer} ${drop(p / 0.42).toFixed(1)})` });
    const f = clamp(p / 0.96);
    const sway = Math.sin(ms / 330) * 16 * (1 - f);
    set(feather, { transform: `translate(${(DROP.feather + sway).toFixed(1)} ${(DROP.top + distance * f).toFixed(1)}) rotate(${(sway * 1.4).toFixed(1)})` });
  } else {
    const y = drop(p / 0.82).toFixed(1);
    set(hammer, { transform: `translate(${DROP.hammer} ${y})` });
    set(feather, { transform: `translate(${DROP.feather} ${y})` });
  }
  // Dust where each one lands.
  const landed = step === 'air' ? [0.42, 0.96] : [0.82, 0.82];
  parts(root, 'dust').forEach((group, k) => {
    const t = span(p, landed[k], landed[k] + 0.16);
    Array.from(group.children).forEach(puff => set(puff, { rx: (t * 22).toFixed(1), ry: (t * 6).toFixed(1), opacity: (t > 0 ? 1 - t : 0).toFixed(3) }));
  });
}

/* A string: whole, then stopped halfway. The half vibrates twice as fast: an octave. */
const STRING = { x0: 40, x1: 320, y: 150, amp: 26 };
const HALF = (STRING.x0 + STRING.x1) / 2;

function Waves() {
  return <Frame label="A whole string vibrating, then half of it vibrating twice as fast, with the two waves lining up">
    <path data-part="string" className="dg-string" d="" />
    <path data-part="half" className="dg-string is-dim" d="" />
    <path d={`M${STRING.x0} ${STRING.y - 16}l-8 32h16Z`} className="dg-bridge" />
    <path data-part="bridge" d="" className="dg-bridge is-moving" />
    <text data-part="string-label" x={W / 2} y={STRING.y + 66} textAnchor="middle" className="dg-note">whole string</text>
    <path data-part="low" className="dg-wave" d="" />
    <path data-part="high" className="dg-wave is-high" d="" />
    {[0, 1, 2].map(k => <line key={k} data-part="tick" x1={STRING.x0 + k * 140} x2={STRING.x0 + k * 140} y1="262" y2="412" className="dg-tick" opacity="0" />)}
    <text data-part="ratio" x={W / 2} y="446" textAnchor="middle" className="dg-age" opacity="0">2 : 1</text>
  </Frame>;
}

function paintWaves(root: SVGSVGElement, _step: string, p: number, ms: number) {
  const bridgeX = STRING.x1 - (STRING.x1 - HALF) * ease(span(p, 0.32, 0.5));
  const halved = p >= 0.5;
  const t = ms / 1000;
  const arc = (x0: number, x1: number, amp: number) => `M${x0} ${STRING.y} Q${(x0 + x1) / 2} ${(STRING.y + amp * 2).toFixed(1)} ${x1} ${STRING.y}`;
  const wobble = (freq: number) => Math.sin(t * Math.PI * 2 * freq);
  const fade = 1 - span(p, 0.3, 0.42) + span(p, 0.5, 0.62);
  set(parts(root, 'string')[0], { d: halved ? arc(STRING.x0, bridgeX, STRING.amp * 0.8 * wobble(3.2)) : arc(STRING.x0, STRING.x1, STRING.amp * wobble(1.6) * Math.min(1, fade)) });
  set(parts(root, 'half')[0], { d: halved ? `M${bridgeX} ${STRING.y}H${STRING.x1}` : '' });
  set(parts(root, 'bridge')[0], { d: p > 0.3 ? `M${bridgeX.toFixed(1)} ${STRING.y - 16}l-8 32h16Z` : `M${STRING.x1} ${STRING.y - 16}l-8 32h16Z` });
  const label = parts(root, 'string-label')[0];
  if (label) label.textContent = halved ? 'half the string: an octave higher' : 'whole string';
  // Below: the low and the high note’s waves, lining up every one low wave.
  const wave = (cycles: number, y: number, amp: number) => {
    let d = '';
    for (let x = 0; x <= 280; x += 4) d += `${x ? 'L' : 'M'}${STRING.x0 + x} ${(y - amp * Math.sin((x / 280) * cycles * Math.PI * 2 - t * 2.4)).toFixed(1)}`;
    return d;
  };
  const show = ease(span(p, 0.55, 0.75));
  set(parts(root, 'low')[0], { d: wave(2, 300, 24), opacity: show.toFixed(3) });
  set(parts(root, 'high')[0], { d: wave(4, 376, 24), opacity: show.toFixed(3) });
  parts(root, 'tick').forEach((tick, k) => set(tick, { opacity: (ease(span(p, 0.72 + k * 0.06, 0.82 + k * 0.06)) * 0.8).toFixed(3) }));
  set(parts(root, 'ratio')[0], { opacity: ease(span(p, 0.84, 0.96)).toFixed(3) });
}

/** Drawn once per diagram (memo): the reel re-renders on every line, frame and mode change, and a
 * figure that only paintDiagram moves has nothing new to draw then. On a slow phone, redrawing a
 * reel's every figure as it comes on screen was most of a swipe's longest frame. */
export const ReelDiagramView = memo(function ReelDiagramView({ diagram }: { diagram: ReelDiagram }) {
  switch (diagram.name) {
    case 'plate': return <Plate />;
    case 'sorting': return <Sorting />;
    case 'strata': return <Strata />;
    case 'fall': return <Fall step={diagram.step} />;
    case 'tree': case 'peas': case 'blend': case 'moths': case 'drift': case 'jackpot': case 'clock': case 'rocks': return <ReelDiagramViewA diagram={diagram} />;
    case 'waves': return <Waves />;
    default: return <ReelDiagramViewB diagram={diagram} />;
  }
});

/** Draw one moment of a diagram: `p` is progress through its frame, `ms` the reel's clock. */
export function paintDiagram(root: SVGSVGElement, diagram: ReelDiagram, p: number, ms: number): void {
  switch (diagram.name) {
    case 'plate': return paintPlate(root, diagram.step, p, ms);
    case 'sorting': return paintSorting(root, diagram.step, p);
    case 'strata': return paintStrata(root, diagram.step, p, ms);
    case 'fall': return paintFall(root, diagram.step, p, ms);
    case 'tree': case 'peas': case 'blend': case 'moths': case 'drift': case 'jackpot': case 'clock': case 'rocks': return paintDiagramA(root, diagram, p);
    case 'waves': return paintWaves(root, diagram.step, p, ms);
    default: return paintDiagramB(root, diagram, p, ms);
  }
}
