// What the motion, ratio and spread case engines draw: the situation before the run, and the run
// itself as `t` goes 0 → 1. Every number on screen comes from the engine's outcome or the model;
// nothing drawn before the run hints at the answer.
import { useEffect, useMemo, useState } from 'react';
import { geoConicConformal, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { cachedLand, loadLand } from '../expeditions/sims/land';
import { dropTicks, fallDistance } from '../expeditions/sims/motionMath';
import { ratioOf } from '../expeditions/sims/ratioMath';
import { routePoints, type Pt } from '../expeditions/sims/spreadMath';
import type { ViewProps } from './views';
import type { CaseAnswer, MotionModel, RatioModel, SpreadModel } from './types';

const W = 343;
const valued = (answer: CaseAnswer | null) => answer && 'value' in answer ? answer.value : null;
const picked = (answer: CaseAnswer | null) => answer && 'pick' in answer ? answer.pick : null;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const metres = (x: number) => `${x >= 100 ? Math.round(x) : x.toFixed(1)} m`;

// ---------------------------------------------------------------- motion

/** A drop shaft drawn to scale. The run falls in its own time, flashing like a strobe photograph at
 * equal time steps, so the widening gaps show the speed building. */
export function MotionView({ model, answer, outcome, t }: ViewProps<MotionModel>) {
  const run = outcome?.run.engine === 'motion' ? outcome.run : null;
  const H = model.height, g = model.world.g, vt = model.body.terminal;
  const h = 300, top = 16, bottom = h - 16, x0 = 58, sw = 30, cx = x0 + sw / 2, mine = x0 + sw + 10, theirs = x0 + sw + 124;
  const py = (d: number) => top + (clamp(d / H)) * (bottom - top);
  const clock = run ? t * run.land : 0;
  const fallen = run ? fallDistance(g, clock, vt) : 0;
  const flashes = run ? Array.from({ length: 11 }, (_, i) => (i * run.land) / 10).filter(s => s <= clock + 1e-9) : [];
  const done = !!run && t >= 1;
  const value = valued(answer);
  const s = model.seconds ?? 0;
  // The learner's call, drawn on the shaft when it is a distance.
  const isDistance = model.measure === 'distance' || model.measure === 'final';
  const mark = value === null || !isDistance ? null : model.measure === 'distance' ? [0, value] : [H - value, H];
  const truth = done && isDistance ? (model.measure === 'distance' ? [0, run.value] : [H - run.value, H]) : null;
  const ticks = dropTicks(H);
  return (
    <div className="case-motion">
      {run && <p className="case-gen"><b>{clock.toFixed(2)}</b><span>seconds · {metres(fallen)} fallen</span></p>}
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`${model.body.label} falls ${H} metres, ${model.world.label}`}>
        <rect x={x0} y={top} width={sw} height={bottom - top} className="case-shaft" />
        {ticks.map(d => (
          <g key={d}>
            <line x1={x0 - 6} x2={x0} y1={py(d)} y2={py(d)} className="case-grid" />
            <text x={x0 - 10} y={py(d) + 4} textAnchor="end" className="case-tick">{d} m</text>
          </g>
        ))}
        {model.measure === 'reach' && <g className="case-fallmark is-target">
          <line x1={x0 - 4} x2={x0 + sw + 14} y1={py(model.metres!)} y2={py(model.metres!)} />
          <text x={x0 + sw + 18} y={py(model.metres!) + 4} className="case-tick is-label">{model.metres} m{done ? '' : ' · when?'}</text>
          {done && <text x={x0 + sw + 18} y={py(model.metres!) + 20} className="case-tick is-true">reached at {run.value.toFixed(2)} s</text>}
        </g>}
        {mark && <g className="case-fallmark is-yours">
          <line x1={mine} x2={mine} y1={py(mark[0])} y2={py(mark[1])} />
          <line x1={mine - 5} x2={mine + 5} y1={py(mark[0])} y2={py(mark[0])} /><line x1={mine - 5} x2={mine + 5} y1={py(mark[1])} y2={py(mark[1])} />
          <text x={mine + 10} y={(py(mark[0]) + py(mark[1])) / 2 + 4} className="case-tick is-label">yours · {metres(value!)}</text>
        </g>}
        {truth && <g className="case-fallmark is-true">
          <line x1={theirs} x2={theirs} y1={py(truth[0])} y2={py(truth[1])} />
          <line x1={theirs - 5} x2={theirs + 5} y1={py(truth[0])} y2={py(truth[0])} /><line x1={theirs - 5} x2={theirs + 5} y1={py(truth[1])} y2={py(truth[1])} />
          <text x={theirs + 10} y={(py(truth[0]) + py(truth[1])) / 2 + 4} className="case-tick is-true">{model.measure === 'distance' ? `${s} s` : `last ${s} s`} · {metres(run!.value)}</text>
        </g>}
        {model.measure === 'final' && run && clock >= run.land - s && <rect x={x0 + 2} y={py(H - run.value)} width={sw - 4} height={py(H) - py(H - run.value)} className="case-final" />}
        {flashes.map((f, i) => <circle key={i} cx={cx} cy={py(fallDistance(g, f, vt))} r="5" className="case-flash" />)}
        <circle cx={cx} cy={py(fallen)} r="7" className="case-body" />
        {done && model.measure === 'time' && <text x={mine} y={py(H) - 2} className="case-tick is-true">lands at {run.land.toFixed(2)} s</text>}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- ratio

/** One combined wave of two notes, `low` low waves long, as a path across `width`. */
function combined(lowHz: number, highHz: number, lowWaves: number, width: number, mid: number, amp: number): string {
  const k = highHz / lowHz, n = 480;
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = (i / n) * lowWaves;
    const y = (Math.sin(2 * Math.PI * x) + Math.sin(2 * Math.PI * k * x)) / 2;
    return `${i ? 'L' : 'M'}${((i / n) * width).toFixed(1)},${(mid - y * amp).toFixed(1)}`;
  }).join('');
}

/** A string's standing wave with `loops` humps, from x1 to x2, at phase `ph`. */
function stringWave(x1: number, x2: number, y: number, loops: number, amp: number): string {
  const n = 120;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return `${i ? 'L' : 'M'}${(x1 + u * (x2 - x1)).toFixed(1)},${(y - Math.sin(Math.PI * loops * u) * amp).toFixed(1)}`;
  }).join('');
}

export function RatioView({ model, answer, outcome, t }: ViewProps<RatioModel>) {
  const run = outcome?.run.engine === 'ratio' ? outcome.run : null;
  const done = !!run && t >= 1;
  const sway = run && !done ? Math.sin(t * Math.PI * 14) : done ? 1 : 0;
  const value = valued(answer);

  if (model.measure === 'pull') {
    // Loops per string in proportion to the two pitches, drawn only while it runs.
    const [hi, lo] = ratioOf(1, Math.sqrt(model.factor));
    const [p, q] = hi <= 8 ? (model.factor > 1 ? [hi, lo] : [lo, hi]) : [Math.max(1, Math.round(4 * Math.sqrt(model.factor))), 4];
    // Each weight's height is its pull, as the case states it; nothing on screen is the square root.
    const x1 = 20, x2 = W - 70, tall = (k: number) => 32 * k;
    const row = (y: number, loops: number, k: number | null, label: string, cls: string) => (
      <g>
        <line x1={x1} x2={x2} y1={y} y2={y} className="case-string" />
        {run && <path d={stringWave(x1, x2, y, loops, 9 * sway)} className="case-string is-moving" />}
        <circle cx={x2 + 8} cy={y + 8} r="8" className="case-pulley" />
        <line x1={x2 + 16} x2={x2 + 16} y1={y + 8} y2={y + 40} className="case-string" />
        {k !== null && <rect x={x2 + 6} y={y + 40} width={20} height={tall(k)} className={cls} />}
        <text x={x1} y={y - 16} className="case-tick is-label">{label}</text>
      </g>
    );
    return (
      <svg className="case-ratio" viewBox={`0 0 ${W} ${124 + 40 + tall(Math.max(1, model.factor)) + 6}`} role="img" aria-label={`A string at ${model.hz} Hz, then pulled ${+model.factor.toFixed(4)} times as hard`}>
        {row(34, q, 1, `Before · pull ×1 · ${model.hz} Hz`, 'case-weight')}
        {row(124, p, model.factor, `After · pull ×${+model.factor.toFixed(4)} · ${done ? `${run.value.toFixed(1)} Hz` : value !== null ? `yours ${Math.round(value)} Hz` : '? Hz'}`, 'case-weight is-true')}
      </svg>
    );
  }

  if (model.measure === 'pitch') {
    const { length, hz, unit } = model.string;
    const x1 = 18, x2 = W - 18, px = (len: number) => x2 - (len / length) * (x2 - x1);
    const stop = px(model.stopped);
    const [a, b] = ratioOf(length, model.stopped);
    return (
      <svg className="case-ratio" viewBox={`0 0 ${W} 150`} role="img" aria-label={`${model.string.label}, ${length} ${unit}, stopped to ${model.stopped} ${unit}`}>
        <text x={x1} y={18} className="case-tick is-label">{model.string.label} · {hz} Hz open</text>
        <line x1={x1} x2={x1} y1={40} y2={76} className="case-nut" /><line x1={x2} x2={x2} y1={40} y2={76} className="case-nut" />
        <line x1={x1} x2={stop} y1={58} y2={58} className="case-string is-dead" />
        <line x1={stop} x2={x2} y1={58} y2={58} className="case-string" />
        {run && <path d={stringWave(stop, x2, 58, 1, 10 * sway)} className="case-string is-moving" />}
        <circle cx={stop} cy={58} r="6" className="case-finger" />
        <line x1={x1} x2={x2} y1={98} y2={98} className="case-grid" />
        <text x={(x1 + x2) / 2} y={114} textAnchor="middle" className="case-tick">{length} {unit} open</text>
        <line x1={stop} x2={x2} y1={128} y2={128} className="case-measure" />
        <text x={(stop + x2) / 2} y={144} textAnchor="middle" className="case-tick is-label">{model.stopped} {unit} vibrating</text>
        {done && <text x={x2} y={18} textAnchor="end" className="case-tick is-true">{a > b ? `×${a}/${b}` : `×${b}/${a}`} · {run.value.toFixed(1)} Hz</text>}
      </svg>
    );
  }

  const pairs = model.measure === 'calmest' ? model.pairs : [{ id: 'pair', label: `${model.hz[0]} and ${model.hz[1]} Hz`, hz: model.hz }];
  const pick = picked(answer);
  const waves = 8, rowH = model.measure === 'calmest' ? 46 : 110, labelH = 16;
  const h = pairs.length * (rowH + labelH) + 6;
  return (
    <svg className="case-ratio" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={done ? outcome!.line : 'Each pair’s combined wave, drawn when you run it'}>
      {pairs.map((pair, i) => {
        const y0 = i * (rowH + labelH) + labelH, mid = y0 + rowH / 2;
        const lo = Math.min(...pair.hz), hi = Math.max(...pair.hz);
        const q = run?.ratios[pair.id]?.[1];
        const shown = run ? clamp(t * 1.15) : 0;
        const win = done && outcome!.truth.kind === 'pick' && outcome!.truth.win.includes(pair.id);
        return (
          <g key={pair.id} className={`${pick === pair.id ? 'is-picked' : ''}${win ? ' is-win' : ''}`}>
            <text x={0} y={y0 - 3} className="case-tick is-label">{pair.label}{done && q ? ` · repeats every ${q} low wave${q === 1 ? '' : 's'}` : ''}</text>
            <line x1={0} x2={W} y1={mid} y2={mid} className="case-grid" />
            {run && <>
              <clipPath id={`case-wave-${i}`}><rect x={0} y={y0} width={W * shown} height={rowH} /></clipPath>
              <path d={combined(lo, hi, waves, W, mid, rowH * 0.42)} clipPath={`url(#case-wave-${i})`} className="case-wave" />
              {done && q && q <= waves && Array.from({ length: Math.floor(waves / q) }, (_, k) => (k + 1) * q).map(x => (
                <line key={x} x1={(x / waves) * W} x2={(x / waves) * W} y1={y0} y2={y0 + rowH} className="case-repeat" />
              ))}
            </>}
          </g>
        );
      })}
      {done && model.measure === 'repeats' && <text x={W} y={h - 2} textAnchor="end" className="case-tick is-true">{+run.value.toFixed(2)} times a second</text>}
    </svg>
  );
}

// ---------------------------------------------------------------- spread

const SIDE_OFFSET = { right: [8, 4, 'start'], left: [-8, 4, 'end'], above: [0, -9, 'middle'], below: [0, 16, 'middle'] } as const;

/** A place label kept inside the map: a label that would run off one edge moves to the dot's other
 * side, and failing that is pulled in. Widths are estimated from the 12 px label font. */
function placeLabel(x: number, y: number, side: keyof typeof SIDE_OFFSET, text: string, width: number): { x: number; y: number; anchor: 'start' | 'end' | 'middle' } {
  const w = text.length * 6.4 + 4, pad = 4;
  let [dx, dy, anchor] = SIDE_OFFSET[side] as readonly [number, number, 'start' | 'end' | 'middle'];
  const left = () => anchor === 'start' ? x + dx : anchor === 'end' ? x + dx - w : x + dx - w / 2;
  if (anchor === 'end' && left() < pad) [dx, anchor] = [8, 'start'];
  else if (anchor === 'start' && left() + w > width - pad) [dx, anchor] = [-8, 'end'];
  const shift = Math.max(pad - left(), 0) - Math.max(left() + w - (width - pad), 0);
  return { x: x + dx + shift, y: y + dy, anchor };
}

/** The routes on a real map: sea lanes dashed, roads solid. The run lights each route as the
 * spread travels it, day by day, and a place lights when it falls sick. */
export function SpreadView({ model, answer, outcome, t }: ViewProps<SpreadModel>) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(cachedLand);
  useEffect(() => { if (!land) void loadLand().then(setLand).catch(() => {}); }, [land]);
  const h = 300;
  const routes = useMemo(() => model.routes.map(r => ({ ...r, points: routePoints(r, model.places) })), [model]);
  const { project, path } = useMemo(() => {
    const all: Pt[] = routes.flatMap(r => r.points);
    const lats = all.map(p => p[0]), lons = all.map(p => p[1]);
    const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2, lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
    const projection = geoConicConformal().parallels([lat0 - 4, lat0 + 4]).rotate([-lon0, 0])
      .fitExtent([[40, 26], [W - 40, h - 34]], { type: 'MultiPoint', coordinates: all.map(([lat, lon]) => [lon, lat]) })
      .clipExtent([[0, 0], [W, h]]);
    return { project: ([lat, lon]: Pt) => projection([lon, lat]) as [number, number], path: geoPath(projection) };
  }, [routes]);
  const run = outcome?.run.engine === 'spread' ? outcome.run : null;
  const done = !!run && t >= 1;
  const day = run ? t * run.days : 0;
  const pick = picked(answer);
  const win = done && outcome!.truth.kind === 'pick' ? outcome!.truth.win : [];
  // A 100 km scale bar at the map's middle latitude, in the bottom corner farthest from any place.
  const scale = useMemo(() => {
    const mid = model.places.reduce((s, p) => s + p.lat, 0) / model.places.length, lon = model.places[0].lon;
    const a = project([mid, lon]), b = project([mid, lon + 100 / (111.32 * Math.cos((mid * Math.PI) / 180))]);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dots = model.places.map(p => project([p.lat, p.lon]));
    const room = (cx: number) => Math.min(...dots.map(([x, y]) => Math.hypot(x - cx, y - (h - 14))));
    const right = room(W - 12 - length / 2 - 24) > room(12 + length / 2 + 24);
    return { length, x: right ? W - 12 - length - 48 : 12 };
  }, [model.places, project]);
  const line = (points: Pt[]) => points.map((p, i) => { const [x, y] = project(p); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('');
  const lit = run ? model.places.flatMap(p => {
    const a = run.arrivals[p.id];
    if (!a.from || day <= run.arrivals[a.from].days) return [];
    const r = routes.find(x => x.via === a.via && ((x.from === a.from && x.to === p.id) || (x.to === a.from && x.from === p.id)));
    if (!r) return [];
    const points = r.from === a.from ? r.points : [...r.points].reverse();
    const span = a.days - run.arrivals[a.from].days;
    return [{ id: p.id, d: line(points), k: span > 0 ? clamp((day - run.arrivals[a.from].days) / span) : 1 }];
  }) : [];
  return (
    <div className="case-spread">
      {run && <p className="case-gen"><b>{Math.floor(day)}</b><span>days since {model.places.find(p => p.id === model.origin)!.label}</span></p>}
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`A map of the routes from ${model.places.find(p => p.id === model.origin)!.label}`}>
        <rect width={W} height={h} className="case-sea" />
        {land && <path d={path(land) ?? ''} className="case-land" />}
        {routes.map((r, i) => <path key={i} d={line(r.points)} className={`case-route is-${r.via}`} />)}
        {lit.map(l => <path key={l.id} d={l.d} pathLength={1} strokeDasharray={`${l.k} 1`} className="case-route is-lit" />)}
        {model.places.map(p => {
          const [x, y] = project([p.lat, p.lon]);
          const reached = !!run && day >= run.arrivals[p.id].days;
          const candidate = model.candidates.includes(p.id);
          const days = run && done && candidate ? ` · day ${Math.max(1, Math.round(run.arrivals[p.id].days))}` : '';
          const label = placeLabel(x, y, p.side ?? 'right', `${p.label}${days}`, W);
          return (
            <g key={p.id} className={`case-place${p.id === model.origin ? ' is-origin' : ''}${candidate ? ' is-candidate' : ''}${reached ? ' is-reached' : ''}${pick === p.id ? ' is-picked' : ''}${win.includes(p.id) ? ' is-win' : ''}`}>
              {p.id === model.origin && <circle cx={x} cy={y} r="8" className="case-place-ring" />}
              <circle cx={x} cy={y} r={candidate || p.id === model.origin ? 4 : 2.5} />
              <text x={label.x} y={label.y} textAnchor={label.anchor}>{p.label}{days}</text>
            </g>
          );
        })}
        <g className="case-scale" transform={`translate(${scale.x} ${h - 14})`}>
          <line x1={0} x2={scale.length} y1={0} y2={0} /><line x1={0} x2={0} y1={-4} y2={4} /><line x1={scale.length} x2={scale.length} y1={-4} y2={4} />
          <text x={scale.length + 6} y={4}>100 km</text>
        </g>
      </svg>
      <p className="case-legend">
        {(['sea', 'river', 'road'] as const).filter(v => model.routes.some(r => r.via === v)).map(v => <span key={v}><svg viewBox="0 0 22 6" width="22" height="6" aria-hidden="true"><line x1="0" x2="22" y1="3" y2="3" className={`case-route is-${v}`} /></svg>{v === 'sea' ? 'by sea' : v === 'river' ? 'by river' : 'by road'}</span>)}
      </p>
    </div>
  );
}
