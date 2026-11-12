import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useWidth } from './useWidth';
import type { Choice, Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Confident, Question, Verdict } from '../blocks/ui';
import { clockSeconds, DAY_SECONDS, describeSpan, dialAngle, formatClock, hoursFromRange, secondsBeforeMidnight, secondsFromPoint } from './deepTimeMath';

// Deep time on a 24-hour dial. The learner first places one event by feel, then watches the
// whole day play, then zooms into the last hour, minute and second. Every clock time shown
// is computed from an age in the pack; the component knows nothing about which events.

type DayEvent = { ma?: number; years?: number; label: string; hidden?: boolean };
export type Params = {
  earthMa: number;
  locate: { ask: string; range: [number, number]; toleranceHours: number; label: string; right: string; wrong: string };
  events: DayEvent[];
  question: { ask: string; choices: Choice[]; answer: string; explain: string };
  zooms: { label: string; seconds: number }[];
};

const C = 200, R = 150;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, k: string) => values[k] ?? all);

function eventSeconds(e: DayEvent, earthMa: number): number {
  return e.years !== undefined ? DAY_SECONDS - secondsBeforeMidnight(e.years, earthMa) : clockSeconds(e.ma ?? 0, earthMa);
}
function point(seconds: number, radius: number): [number, number] {
  const a = dialAngle(seconds);
  return [C + Math.sin(a) * radius, C - Math.cos(a) * radius];
}
function arc(from: number, to: number, radius: number): string {
  const [x0, y0] = point(from, radius), [x1, y1] = point(to, radius);
  const large = dialAngle(to) - dialAngle(from) > Math.PI ? 1 : 0;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${radius},${radius} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}
const clockLabel = (s: number) => s > DAY_SECONDS - 60 ? formatClock(s, true) : formatClock(s);

export function DeepTime({ beat }: { beat: SimBeat }) {
  const { record, done, evidenceFor } = useBeat();
  const p = beat.params as Params;
  const locateGrade = beat.grades?.[0].gradeId ?? 'deep-locate';
  const questionGrade = beat.grades?.[1]?.gradeId ?? 'deep-species';
  const prior = evidenceFor(locateGrade);
  const [guess, setGuess] = useState<number | null>(null);
  const [phase, setPhase] = useState<'locate' | 'day' | 'question' | 'zoom'>(prior ? 'question' : 'locate');
  const [sweep, setSweep] = useState(prior ? DAY_SECONDS : 0);
  const [zoom, setZoom] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const events = useMemo(() => p.events.map(e => ({ ...e, at: eventSeconds(e, p.earthMa) })), [p]);
  const [lo, hi] = [clockSeconds(p.locate.range[0], p.earthMa), clockSeconds(p.locate.range[1], p.earthMa)];
  const off = guess === null ? null : hoursFromRange(guess, p.locate.range, p.earthMa);
  const correct = off !== null && off <= p.locate.toleranceHours;

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    if (phase !== 'locate') return;
    const box = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 400 - C, y = ((e.clientY - box.top) / box.height) * 400 - C;
    if (Math.hypot(x, y) < 40) return;
    setGuess(secondsFromPoint(x, y));
  };
  const commit = (confidence: Confidence) => {
    if (guess === null) return;
    record({ gradeId: locateGrade, transfer: false, correct, confidence, prompt: p.locate.ask, chosen: `${formatClock(guess)} (${Math.round((p.earthMa * (DAY_SECONDS - guess)) / DAY_SECONDS)} million years ago)` });
    setPhase('day');
  };

  // The day plays once the guess is locked: a hand sweeps from midnight to midnight.
  useEffect(() => {
    if (phase !== 'day') return;
    if (reduced()) { setSweep(DAY_SECONDS); setPhase('question'); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const s = Math.min(DAY_SECONDS, Math.max(0, ((now - start) / 7000) * DAY_SECONDS));
      setSweep(s);
      if (s < DAY_SECONDS) raf = requestAnimationFrame(step); else setPhase('question');
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const answered = useCallback(() => { setPhase('zoom'); done(); }, [done]);
  const shownEvents = events.filter(e => e.at <= sweep && (!e.hidden || phase === 'zoom'));
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const window_ = p.zooms[zoom]?.seconds ?? DAY_SECONDS;

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{fill(beat.goal, { earth: `${(p.earthMa / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} billion`, hour: `${Math.round(p.earthMa / 24)} million` })}</p>
      <div className="deeptime">
        <div className="deeptime__dial">
          {phase === 'locate' && <p className="question__prompt">{p.locate.ask}</p>}
          <svg ref={svg} viewBox="0 0 400 400" role="img" aria-label={`A 24-hour clock: Earth forms at midnight${guess !== null ? `; your guess ${formatClock(guess)}` : ''}`}
            className={phase === 'locate' ? 'is-picking' : ''} onPointerDown={fromPointer}>
            <circle cx={C} cy={C} r={R + 24} className="deeptime__face" />
            <circle cx={C} cy={C} r={R} className="deeptime__ring" />
            {sweep > 0 && <path d={arc(0, Math.min(sweep, DAY_SECONDS - 1), R)} className="deeptime__elapsed" />}
            {hours.map(h => {
              const [x0, y0] = point(h * 3600, R - 8), [x1, y1] = point(h * 3600, R + 8);
              const [tx, ty] = point(h * 3600, R - 30);
              return (
                <g key={h}>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} className={`deeptime__tick${h % 6 === 0 ? ' is-major' : ''}`} />
                  {h % 6 === 0 && <text x={tx} y={ty + 5} textAnchor="middle" className="deeptime__hour">{`${String(h).padStart(2, '0')}:00`}</text>}
                </g>
              );
            })}
            {phase !== 'locate' && <path d={arc(lo, hi, R + 14)} className="deeptime__answer" />}
            {shownEvents.map((e, i) => { const [x, y] = point(e.at, R); return <circle key={i} cx={x} cy={y} r={6} className="deeptime__event" />; })}
            {guess !== null && (() => { const [x, y] = point(guess, R - 34); return <g className="deeptime__guess"><line x1={C} y1={C} x2={x} y2={y} /><circle cx={x} cy={y} r={7} /></g>; })()}
            {phase !== 'locate' && sweep < DAY_SECONDS && (() => { const [x, y] = point(sweep, R - 10); return <line x1={C} y1={C} x2={x} y2={y} className="deeptime__hand" />; })()}
            <text x={C} y={C - 6} textAnchor="middle" className="deeptime__now">{phase === 'locate' ? (guess === null ? '00:00' : formatClock(guess)) : formatClock(Math.min(sweep, DAY_SECONDS - 60))}</text>
            <text x={C} y={C + 18} textAnchor="middle" className="deeptime__ma">{phase === 'locate' ? (guess === null ? 'Earth forms' : `${Math.round((p.earthMa * (DAY_SECONDS - guess)) / DAY_SECONDS)} million years ago`) : (sweep >= DAY_SECONDS ? 'now' : `${Math.max(0, Math.round((p.earthMa * (DAY_SECONDS - sweep)) / DAY_SECONDS))} million years ago`)}</text>
          </svg>
          {phase === 'locate' && (
            <label className="deeptime__slider">
              <input type="range" min={0} max={1439} step={1} value={guess === null ? 0 : Math.floor(guess / 60)} aria-label="Clock time"
                onChange={e => setGuess(Number(e.target.value) * 60)} />
              <output>{guess === null ? '—' : formatClock(guess)}</output>
            </label>
          )}
          {phase === 'locate' && guess !== null && <Confident onCommit={commit} />}
        </div>
        <div className="deeptime__side">
          {phase !== 'locate' && guess !== null && (
            <Verdict correct={correct} title={correct ? 'Close enough' : guess < lo ? 'Later than that' : 'Earlier than that'}>
              {fill(correct ? p.locate.right : p.locate.wrong, { guess: formatClock(guess), from: formatClock(lo), to: formatClock(hi), hours: off ? off.toFixed(1) : '0' })}
            </Verdict>
          )}
          {phase !== 'locate' && (
            <ol className="deeptime__events">
              {shownEvents.map((e, i) => <li key={i} className={i === shownEvents.length - 1 && phase === 'day' ? 'is-new' : ''}><time>{clockLabel(e.at)}</time><span>{e.label}</span></li>)}
            </ol>
          )}
        </div>
      </div>
      {(phase === 'question' || phase === 'zoom') && (
        <Question gradeId={questionGrade} prompt={p.question.ask} choices={p.question.choices} answer={p.question.answer} explain={p.question.explain} columns onDone={answered} />
      )}
      {phase === 'zoom' && (
        <div className="deeptime__zoom">
          <div className="segmented segmented--wrap" role="radiogroup" aria-label="How much of the day to show">
            {p.zooms.map((z, i) => <button key={z.label} type="button" role="radio" aria-checked={i === zoom} onClick={() => setZoom(i)}>{z.label}</button>)}
          </div>
          <Ruler events={events} window_={window_} />
        </div>
      )}
    </section>
  );
}

/** The last `window_` seconds before midnight, stretched across the screen. Events inside the
 * window are dots on the rule and lines in a list beneath it, so long labels never collide. */
function Ruler({ events, window_ }: { events: (DayEvent & { at: number })[]; window_: number }) {
  const box = useRef<HTMLDivElement>(null);
  const W = useWidth(box), L = 14, Rt = 14, start = DAY_SECONDS - window_;
  const x = (s: number) => L + ((s - start) / window_) * (W - L - Rt);
  const inside = events.filter(e => e.at >= start).sort((a, b) => a.at - b.at);
  const tickLabel = (t: number, k: number) => k === 2 ? 'midnight'
    : window_ <= 1 ? (k === 0 ? '23:59:59' : '23:59:59.5') : window_ <= 60 ? formatClock(t, true) : formatClock(t);
  const ticks = [start, start + window_ / 2, DAY_SECONDS];
  return (
    <div ref={box} className="deeptime__rulerbox">
      <svg className="deeptime__ruler" viewBox={`0 0 ${W} 54`} role="img" aria-label={`The last ${describeSpan(window_)} before midnight`}>
        <line x1={L} x2={W - Rt} y1={36} y2={36} className="deeptime__rule" />
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={x(t)} x2={x(t)} y1={30} y2={42} className="deeptime__tick" />
            <text x={x(t)} y={18} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} className="deeptime__hour">{tickLabel(t, k)}</text>
          </g>
        ))}
        {inside.map(e => <circle key={e.label} cx={x(e.at)} cy={36} r={5} className="deeptime__event" />)}
      </svg>
      <ol className="deeptime__events deeptime__events--zoom">
        {inside.map(e => <li key={e.label}><time>{clockLabel(e.at)}</time><span>{e.label} · in the last {describeSpan(DAY_SECONDS - e.at)}</span></li>)}
      </ol>
    </div>
  );
}
