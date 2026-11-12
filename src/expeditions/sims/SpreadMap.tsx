import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { geoConicConformal, geoConicEqualArea, geoEquirectangular, geoGraticule10, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo';
import { cachedLand, loadLand } from './land';
import type { Choice, Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Confident, Question, Verdict } from '../blocks/ui';

// "Something spread across places over time": plague, printing presses,
// languages, railways, salamanders. The pack supplies the projection, the
// time scale, places, routes and a story; nothing here knows which map it is.

type When = string | number;
type Place = {
  id: string; name: string; lat: number; lon: number; when: When; label: string; note?: string;
  /** One origin, or several when two fronts arrive at the same place. */
  from?: string | string[]; via?: string; path?: number[][];
  /** Hidden until the map question is answered: the outcome the learner is asked to predict. */
  reveal?: boolean;
  /** Put this place's label left of its dot, e.g. on a coast with open sea to the west. */
  labelSide?: 'left';
};
type Story = { when: When; text: string };
type Pt = [number, number];

/** Map frame. `bbox` points (lon, lat) or `fitPlaces` (padded by `pad` degrees) decide what fills the view. */
export type ProjectionSpec = {
  type: 'conicConformal' | 'conicEqualArea' | 'equirectangular';
  center?: [number, number];
  parallels?: [number, number];
  bbox?: [number, number][];
  fitPlaces?: string[];
  pad?: [number, number];
};
/**
 * Time scale. Places and story use `when` in the same unit: 'YYYY-MM' for months,
 * a year for years, an age before present for kyr/Myr, an ordinal for stages.
 */
export type TimeSpec = {
  unit: 'month' | 'year' | 'kyr' | 'Myr' | 'stage';
  start: When; end: When;
  step?: number;
  /** Stage names, for `stage` time where no dates are known. */
  labels?: Record<string, string>;
  /** How many steps a newly reached place keeps pulsing. */
  freshFor?: number;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const UNIT_NAME: Record<TimeSpec['unit'], string> = { month: 'Month', year: 'Year', kyr: 'Thousands of years ago', Myr: 'Millions of years ago', stage: 'Stage' };

/** Every unit maps to a number that grows as time moves forward. */
function tick(time: TimeSpec, when: When): number {
  if (time.unit === 'month') { const [y, m] = String(when).split('-').map(Number); return y * 12 + (m - 1); }
  const v = Number(when);
  return time.unit === 'kyr' || time.unit === 'Myr' ? -v : v;
}
function format(time: TimeSpec, t: number): string {
  switch (time.unit) {
    case 'month': return `${MONTHS[((t % 12) + 12) % 12]} ${Math.floor(t / 12)}`;
    case 'year': return t < 0 ? `${-t} BCE` : String(t);
    case 'kyr': return t === 0 ? 'Today' : `${(-t).toLocaleString('en-US')} thousand years ago`;
    case 'Myr': return t === 0 ? 'Today' : `${(-t).toLocaleString('en-US')} million years ago`;
    case 'stage': return time.labels?.[String(t)] ?? `Stage ${t}`;
  }
}

const PROJECTIONS: Record<ProjectionSpec['type'], () => GeoProjection> = {
  conicConformal: geoConicConformal, conicEqualArea: geoConicEqualArea, equirectangular: geoEquirectangular,
};


function km(a: Pt, b: Pt) {
  const r = Math.PI / 180, [lon1, lat1] = a, [lon2, lat2] = b;
  const h = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function smooth(points: Pt[]): string {
  if (points.length === 2) return `M${points[0]}L${points[1]}`;
  let d = `M${points[0]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1} ${c2} ${p2}`;
  }
  return d;
}

const origins = (pl: Place) => (pl.from === undefined ? [] : Array.isArray(pl.from) ? pl.from : [pl.from]);

export type Params = {
  mode: 'predict' | 'play'; places: Place[]; story: Story[];
  projection: ProjectionSpec; time: TimeSpec;
  /** Map name for screen readers, e.g. "Europe". */
  region: string;
  size?: [number, number];
  legend?: { via: string; label: string }[];
  /** Shaded areas, e.g. a barrier the spread goes around. Coordinates are [lat, lon]. */
  regions?: { name: string; coords: number[][]; labelAt?: [number, number]; labelAngle?: number }[];
  lit?: string[]; choices?: { id: string; via: string; label: string }[]; origin?: string; answer?: string; explain?: string;
  /** Asked when play ends. With `pickPlace`, choices are place ids the learner can also tap on the map. */
  question?: { ask: string; choices: Choice[]; answer: string; explain: string; pickPlace?: boolean };
  credit?: string;
  labelFlip?: boolean;
  labels?: 'all' | 'fresh';
  freshText?: 'label';
};

export function SpreadMap({ beat }: { beat: SimBeat }) {
  const { done, record, evidenceFor } = useBeat();
  const p = beat.params as unknown as Params;
  const [W, H] = p.size ?? [1000, 640];
  const gradeId = beat.grades?.[0].gradeId ?? beat.title;
  const [land, setLand] = useState<GeoPermissibleObjects | null>(cachedLand);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const at = (when: When) => tick(p.time, when);
  const step = p.time.step ?? 1;
  const freshFor = p.time.freshFor ?? 3;
  const start = at(p.time.start);
  const end = p.mode === 'play' ? at(p.time.end) : start;
  const [t, setT] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const prior = evidenceFor(gradeId);
  const pickPlace = p.mode === 'play' && !!p.question?.pickPlace;
  const [pick, setPick] = useState<string | null>(prior?.parts?.pick ?? null);
  const [locked, setLocked] = useState(!!prior && (p.mode === 'predict' || pickPlace));

  useEffect(() => { if (!land) void loadLand().then(setLand); }, [land]);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(W / Math.max(1, e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, [W]);

  const projection = useMemo(() => {
    const spec = p.projection;
    const [dLon, dLat] = spec.pad ?? [0, 0];
    const coords: [number, number][] = spec.fitPlaces
      ? p.places.filter(pl => spec.fitPlaces!.includes(pl.id)).flatMap(pl => [[pl.lon - dLon, pl.lat - dLat], [pl.lon + dLon, pl.lat + dLat]] as [number, number][])
      : spec.bbox ?? p.places.map(pl => [pl.lon, pl.lat] as [number, number]);
    let proj = PROJECTIONS[spec.type]();
    if (spec.parallels && 'parallels' in proj) proj = (proj as ReturnType<typeof geoConicConformal>).parallels(spec.parallels);
    if (spec.center) proj = proj.rotate([-spec.center[0], 0]);
    return proj.fitExtent([[14, 14], [W - 14, H - 14]], { type: 'MultiPoint', coordinates: coords });
  }, [p.projection, p.places, W, H]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const byId = useMemo(() => Object.fromEntries(p.places.map(pl => [pl.id, pl])), [p.places]);
  const xy = (pl: Place) => projection([pl.lon, pl.lat]) as Pt;
  const routeLonLat = (pl: Place, from: string): Pt[] => {
    const o = byId[from];
    const waypoints = origins(pl).length === 1 ? (pl.path ?? []) : [];
    return [[o.lon, o.lat], ...waypoints.map(([lat, lon]) => [lon, lat] as Pt), [pl.lon, pl.lat]];
  };
  const routeKm = (pl: Place, from: string) => { const pts = routeLonLat(pl, from); let sum = 0; for (let i = 1; i < pts.length; i++) sum += km(pts[i - 1], pts[i]); return sum; };

  // Play: one step every 420 ms.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT(v => Math.min(end, v + step)), 420);
    return () => window.clearInterval(id);
  }, [playing, end, step]);
  useEffect(() => { if (p.mode === 'play' && t >= end) { setPlaying(false); setFinished(true); } }, [t, end, p.mode]);

  const reveal = p.mode === 'predict' && locked;
  const revealed = (pl: Place) => !pl.reveal || (pickPlace && locked);
  // Answer options appear on the map only once the spread has played out.
  const candidate = (id: string) => pickPlace && finished && !!p.question?.choices.some(c => c.id === id);
  const isLit = (pl: Place) => p.mode === 'predict'
    ? (p.lit ?? []).includes(pl.id) || (reveal && (pl.id === p.answer || p.choices?.some(c => c.id === pl.id)))
    : revealed(pl) && at(pl.when) <= t;
  const visible = (pl: Place) => revealed(pl) || candidate(pl.id);
  const fresh = (pl: Place) => p.mode === 'play' && revealed(pl) && t - at(pl.when) < freshFor && at(pl.when) <= t;
  const story = [...p.story].reverse().find(s => at(s.when) <= t);
  // freshText 'label': a newly reached place shows only its label (say, the form found there), not its name.
  const onlyLabel = (pl: Place) => p.freshText === 'label' && fresh(pl) && !candidate(pl.id);
  const fs = Math.max(13, 12.5 * scale);

  // Greedy label placement: earlier places keep their labels; later ones that would collide stay unlabeled.
  const labels = useMemo(() => {
    const placed: { x: number; y: number; w: number; h: number; id: string; flip: boolean }[] = [];
    // labels 'fresh' keeps a dense map readable on a phone: only places reached in the last few steps, and answer options, are named.
    const named = (pl: Place) => p.labels !== 'fresh' || fresh(pl) || candidate(pl.id) || (pickPlace && locked && !!pl.reveal);
    const order = [...p.places].filter(pl => visible(pl) && named(pl) && (isLit(pl) || p.choices?.some(c => c.id === pl.id) || candidate(pl.id))).sort((a, b) => at(a.when) - at(b.when));
    const priority = new Set([...(p.choices ?? []).map(c => c.id), ...(pickPlace ? p.question!.choices.map(c => c.id) : []), p.origin ?? '']);
    order.sort((a, b) => Number(priority.has(b.id)) - Number(priority.has(a.id)));
    for (const pl of order) {
      const [x, y] = xy(pl);
      const text = onlyLabel(pl) ? pl.label : `${pl.name}${p.mode === 'play' && fresh(pl) ? ` · ${pl.label}` : ''}`;
      const w = text.length * fs * 0.55, h = fs * 1.2;
      // With labelFlip, a label that would run off the right edge sits to the left of its dot.
      const flip = (pl.labelSide === 'left' && x - 9 * scale - w >= 4) || (!!p.labelFlip && x + 9 * scale + w > W - 6 && x - 9 * scale - w >= 4);
      const rect = { x: flip ? x - 9 * scale - w : x + 9 * scale, y: y - h / 2, w, h, id: pl.id, flip };
      const hits = placed.some(o => rect.x < o.x + o.w && rect.x + rect.w > o.x && rect.y < o.y + o.h && rect.y + rect.h > o.y);
      if (!hits || priority.has(pl.id)) placed.push(rect);
    }
    return new Map(placed.map(r => [r.id, r]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, scale, locked, finished, p.places, projection]);

  const commit = (confidence: Confidence) => {
    if (!pick) return;
    const options = p.mode === 'predict' ? p.choices ?? [] : p.question?.choices ?? [];
    const answer = p.mode === 'predict' ? p.answer : p.question?.answer;
    record({ gradeId, transfer: !!beat.grades?.[0].transfer, correct: pick === answer, confidence, prompt: p.mode === 'predict' ? beat.goal : p.question!.ask, parts: { pick }, chosen: options.find(c => c.id === pick)!.label });
    setLocked(true); done();
  };

  const origin = p.origin ? byId[p.origin] : null;
  const canTap = pickPlace && finished && !locked;
  const legend = p.legend ?? [{ via: 'sea', label: 'by sea' }, { via: 'land', label: 'by road' }, { via: 'river', label: 'by river' }];
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{p.mode === 'predict' ? format(p.time, start) : beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className={`map${H > W ? ' map--tall' : ''}`} ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of ${p.region}, ${format(p.time, t)}`} style={{ ['--k' as string]: scale }}>
          <rect width={W} height={H} className="map__sea" />
          <path d={path(geoGraticule10()) ?? ''} className="map__grid" />
          {land && <path d={path(land) ?? ''} className="map__land" />}
          {p.regions?.map(r => {
            const ring = r.coords.map(([lat, lon]) => [lon, lat]);
            const d = path({ type: 'Polygon', coordinates: [[...ring, ring[0]].reverse()] } as GeoPermissibleObjects) ?? '';
            const at2 = r.labelAt ? projection([r.labelAt[1], r.labelAt[0]]) as Pt : null;
            return (
              <g key={r.name} className="map__region">
                <path d={d} />
                {at2 && <text x={at2[0]} y={at2[1]} fontSize={fs * 0.85} textAnchor="middle" dominantBaseline="middle" transform={r.labelAngle ? `rotate(${r.labelAngle} ${at2[0]} ${at2[1]})` : undefined}>{r.name}</text>}
              </g>
            );
          })}
          {p.places.filter(pl => origins(pl).length && isLit(pl)).flatMap(pl => origins(pl).map(from => {
            const d = smooth(routeLonLat(pl, from).map(c => projection(c) as Pt));
            return <path key={`r-${pl.id}-${from}`} d={d} pathLength={1} className={`route route--${origins(pl).length > 1 ? byId[from].via ?? pl.via : pl.via}`} />;
          }))}
          {p.mode === 'predict' && !locked && origin && p.choices?.map(c => {
            const target = byId[c.id];
            const pts = origins(target).includes(origin.id) ? routeLonLat(target, origin.id) : [[origin.lon, origin.lat], [target.lon, target.lat]] as Pt[];
            return <path key={`c-${c.id}`} d={smooth(pts.map(q => projection(q) as Pt))} className={`route route--option route--${c.via}${pick === c.id ? ' is-picked' : ''}`} />;
          })}
          {p.places.filter(visible).map(pl => {
            const [x, y] = xy(pl);
            const lit = isLit(pl);
            const option = (p.mode === 'predict' && p.choices?.some(c => c.id === pl.id)) || (candidate(pl.id) && finished);
            const tap = canTap && candidate(pl.id);
            return (
              <g key={pl.id} transform={`translate(${x},${y})`} onClick={tap ? () => setPick(pl.id) : undefined} role={tap ? 'button' : undefined}
                aria-label={tap ? pl.name : undefined} className={`city${lit ? ' is-lit' : ''}${fresh(pl) ? ' is-fresh' : ''}${option ? ' is-option' : ''}${pick === pl.id ? ' is-picked' : ''}${tap ? ' is-tappable' : ''}`}>
                {tap && <circle r={30 * Math.min(scale, 2)} className="city__hit" />}
                {fresh(pl) && <circle r={14 * Math.min(scale, 1.6)} className="city__pulse" />}
                {option && !locked && <circle r={13 * Math.min(scale, 1.6)} className="city__ring" />}
                <circle r={(lit ? 5.5 : 3.2) * Math.min(scale, 1.7)} className="city__dot" />
                {labels.has(pl.id) && (
                  <text x={labels.get(pl.id)!.flip ? -9 * scale : 9 * scale} textAnchor={labels.get(pl.id)!.flip ? 'end' : undefined} y={fs * 0.36} fontSize={fs} className="city__label">
                    {onlyLabel(pl) ? <tspan className="city__when">{pl.label}</tspan> : <>{pl.name}{(p.mode === 'play' && fresh(pl)) || (reveal && option) ? <tspan className="city__when"> · {pl.label}</tspan> : null}</>}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {p.mode === 'play' && story && <p className="map__story" key={String(story.when)}>{story.text}</p>}
        <div className="map__legend" aria-hidden="true">{legend.map(l => <span key={l.via} className={`is-${l.via}`}>{l.label}</span>)}</div>
      </div>

      {p.mode === 'play' && (
        <div className="timebar">
          <button type="button" className="timebar__play" onClick={() => { if (t >= end) setT(start); setPlaying(v => !v); }}>
            {playing ? 'Pause' : t >= end ? 'Replay' : t > start ? 'Resume' : 'Play'}
          </button>
          <div className="timebar__track">
            <span className="timebar__date">{format(p.time, t)}</span>
            <input type="range" min={start} max={end} step={step} value={t} aria-label={UNIT_NAME[p.time.unit]} onChange={e => { setPlaying(false); setT(Number(e.target.value)); }} />
          </div>
        </div>
      )}

      {p.mode === 'predict' && p.choices && origin && (
        <div className="question">
          <div className="choices">
            {p.choices.map(c => {
              const target = byId[c.id];
              const dist = origins(target).includes(origin.id) ? routeKm(target, origin.id) : km([origin.lon, origin.lat], [target.lon, target.lat]);
              const state = locked ? (c.id === p.answer ? 'right' : c.id === pick ? 'wrong' : 'idle') : pick === c.id ? 'picked' : 'idle';
              return (
                <button key={c.id} type="button" className={`choice choice--${state}`} disabled={locked} onClick={() => setPick(c.id)}>
                  {c.label}<small>about {Math.round(dist / 10) * 10} km</small>
                  {locked && <small>Reached: {target.label}</small>}
                </button>
              );
            })}
          </div>
          {pick && !locked && <Confident onCommit={commit} />}
          {locked && <Verdict correct={pick === p.answer}>{p.explain}</Verdict>}
        </div>
      )}

      {pickPlace && finished && p.question && (
        <div className="question">
          <p className="question__prompt">{p.question.ask}</p>
          <div className="choices">
            {p.question.choices.map(c => {
              const state = locked ? (c.id === p.question!.answer ? 'right' : c.id === pick ? 'wrong' : 'idle') : pick === c.id ? 'picked' : 'idle';
              return <button key={c.id} type="button" className={`choice choice--${state}`} disabled={locked} onClick={() => setPick(c.id)}>{c.label}</button>;
            })}
          </div>
          {pick && !locked && <Confident onCommit={commit} />}
          {locked && <Verdict correct={pick === p.question.answer}>{p.question.explain}</Verdict>}
        </div>
      )}
      {p.mode === 'play' && !pickPlace && finished && p.question && (
        <Question gradeId={gradeId} transfer={beat.grades?.[0].transfer} prompt={p.question.ask} choices={p.question.choices}
          answer={p.question.answer} explain={p.question.explain} onDone={done} />
      )}
      {p.credit && <p className="credit-line">{p.credit}</p>}
    </section>
  );
}
