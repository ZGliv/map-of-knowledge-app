import { useEffect, useRef, useState } from 'react';
import { useWidth } from './useWidth';
import type { Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Confident, Verdict } from '../blocks/ui';

// Published values as rising bars. The learner first bets on which value is biggest, then the
// bars rise to the published values, then each of the big ones opens to what lies behind it.
// The pack supplies every event, value and line of text. Two layouts: 'time' (the default)
// places each event at its age in millions of years, with eras beneath (extinctions);
// 'groups' sets named bars side by side with no time axis (one gene read in several tissues).

type Era = { name: string; from: number; to: number };
/** `feedback` is shown when the learner bet on this event and it was not the biggest. */
type Event = { id: string; name: string; short: string; ma?: number; value: number; big?: boolean; feedback?: string; facts?: { label: string; text: string }[] };
export type Params = {
  layout?: 'time' | 'groups';
  /** Time layout: oldest and youngest age shown, in millions of years. */
  span?: [number, number];
  max: number;
  eras?: Era[];
  events: Event[];
  measure: string;
  /** Printed after a value: '%' (the default) sits flush; any other unit follows a space. */
  unit?: string;
  axis: string;
  pick: { ask: string; answer: string; right: string; wrong: string };
  source: string;
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function LifeChart({ beat }: { beat: SimBeat }) {
  const { record, done, evidenceFor } = useBeat();
  const p = beat.params as Params;
  const grade = beat.grades?.[0].gradeId ?? 'worst-crash';
  const prior = evidenceFor(grade);
  // Whether this beat was answered before it opened (Back, or a revisit), read once.
  const [answeredBefore] = useState(!!prior);
  const big = p.events.filter(e => e.big);
  const [pick, setPick] = useState<string | null>(prior?.parts?.pick ?? null);
  const [locked, setLocked] = useState(!!prior);
  const [grow, setGrow] = useState(prior ? 1 : 0);
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  // The bars rise once, when the bet is locked in.
  useEffect(() => {
    if (!locked || answeredBefore) return;
    if (reduced()) { setGrow(1); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => { const t = Math.min(1, Math.max(0, (now - start) / 1100)); setGrow(1 - (1 - t) ** 3); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);
  useEffect(() => { if (locked && !open) setOpen(p.pick.answer); }, [locked, open, p.pick.answer]);
  useEffect(() => { if (open) setSeen(s => s.has(open) ? s : new Set(s).add(open)); }, [open]);
  useEffect(() => { if (locked && big.every(e => seen.has(e.id))) done(); }, [locked, seen, big, done]);

  const commit = (confidence: Confidence) => {
    if (!pick) return;
    const chosen = big.find(e => e.id === pick)!;
    record({ gradeId: grade, transfer: false, correct: pick === p.pick.answer, confidence, prompt: p.pick.ask, parts: { pick }, chosen: chosen.name });
    setLocked(true);
  };

  const box = useRef<HTMLDivElement>(null);
  const groups = p.layout === 'groups';
  const unit = p.unit ?? '%';
  const num = (v: number) => v >= 100 ? Math.round(v).toLocaleString('en-US') : String(Number(v.toFixed(v >= 10 ? 1 : 2)));
  const withUnit = (v: number) => unit === '%' ? `${num(v)}%` : `${num(v)} ${unit}`;
  const W = useWidth(box), H = Math.round(Math.min(340, Math.max(280, W * 0.5))), L = groups ? 52 : 40, R = 14, T = 26, B = 64;
  // Before the reveal, the five markers' labels sit on two rows so neighbours never collide.
  const [older, younger] = p.span ?? [0, 0];
  const slot = (W - L - R) / Math.max(1, p.events.length);
  const at = (e: Event) => groups ? L + (p.events.indexOf(e) + 0.5) * slot : L + ((older - (e.ma ?? 0)) / (older - younger)) * (W - L - R);
  const x = (ma: number) => L + ((older - ma) / (older - younger)) * (W - L - R);
  const y = (v: number) => H - B - (v / p.max) * (H - T - B);
  const ticks = groups ? [] : [500, 400, 300, 200, 100, 0].filter(t => t <= older);
  const barW = (e: Event) => groups ? Math.min(40, slot * 0.5) : e.big ? 10 : 6;
  const detail = p.events.find(e => e.id === open);

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      {!locked && <p className="question__prompt">{p.pick.ask}</p>}
      <div className="stage lifechart" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={groups ? `${p.measure}, by ${p.axis.toLowerCase()}` : `${p.measure}, ${older} million years ago to today`}>
          {[0, p.max / 2, p.max].map(v => (
            <g key={v} className={locked ? '' : 'is-hidden'}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="lifechart__grid" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" className="lifechart__axis">{unit === '%' ? `${v}%` : num(v)}</text>
            </g>
          ))}
          {(groups ? [] : p.eras ?? []).map((era, i) => (
            <g key={era.name}>
              <rect x={x(era.from)} y={H - B + 8} width={x(era.to) - x(era.from)} height={18} className={`lifechart__era is-${i % 2 ? 'b' : 'a'}`} />
              <text x={(x(era.from) + x(era.to)) / 2} y={H - B + 21} textAnchor="middle" className="lifechart__eraname">{era.name}</text>
            </g>
          ))}
          {ticks.map(t => <text key={t} x={x(t)} y={H - B + 44} textAnchor="middle" className="lifechart__axis">{t}</text>)}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="lifechart__axis">{p.axis}</text>
          {locked && p.events.map(e => (
            <rect key={e.id} x={at(e) - barW(e) / 2} width={barW(e)} y={y(e.value * grow)} height={(H - B) - y(e.value * grow)}
              className={`lifechart__bar${e.big ? ' is-big' : ''}${e.id === open ? ' is-open' : ''}`} />
          ))}
          {locked && groups && p.events.map((e, i) => <text key={e.id} x={at(e)} y={H - B + 20 + (i % 2) * 18} textAnchor="middle" className="lifechart__axis">{e.short}</text>)}
          {locked && grow >= 1 && big.map(e => <text key={e.id} x={at(e)} y={y(e.value) - 6} textAnchor="middle" className="lifechart__value">{unit === '%' ? `${num(e.value)}%` : num(e.value)}</text>)}
          {!locked && big.map((e, i) => (
            <g key={e.id} className={`lifechart__marker${pick === e.id ? ' is-picked' : ''}`} role="button" tabIndex={0} aria-pressed={pick === e.id} aria-label={e.name}
              onClick={() => setPick(e.id)} onKeyDown={k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); setPick(e.id); } }}>
              <line x1={at(e)} x2={at(e)} y1={y(0)} y2={y(0) - 40 - (i % 2) * 44} />
              <circle cx={at(e)} cy={y(0)} r={9} />
              <rect x={at(e) - (e.short.length * 7.4 + 14) / 2} y={y(0) - 64 - (i % 2) * 44} width={e.short.length * 7.4 + 14} height={24} rx={3} />
              <text x={at(e)} y={y(0) - 47 - (i % 2) * 44} textAnchor="middle">{e.short}</text>
            </g>
          ))}
        </svg>
      </div>
      {!locked && pick && <Confident onCommit={commit} />}
      {locked && (
        <>
          <Verdict correct={pick === null ? null : pick === p.pick.answer}>{pick === p.pick.answer || pick === null ? p.pick.right : [big.find(e => e.id === pick)?.feedback, p.pick.wrong].filter(Boolean).join(' ')}</Verdict>
          <div className="segmented segmented--wrap lifechart__tabs" role="tablist" aria-label={groups ? p.axis : 'The big five'}>
            {big.map(e => <button key={e.id} type="button" role="tab" aria-selected={open === e.id} className={seen.has(e.id) ? 'is-seen' : ''} onClick={() => setOpen(e.id)}>{e.short}{!groups && <small>{e.ma} million</small>}</button>)}
          </div>
          {detail && (
            <div className="lifechart__detail" role="tabpanel">
              <h3>{detail.name}</h3>
              <dl>
                <div><dt>{p.measure}</dt><dd>{withUnit(detail.value)}</dd></div>
                {detail.facts?.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.text}</dd></div>)}
              </dl>
            </div>
          )}
          <div className="sr-only"><table>
            <caption>{p.measure}, by {groups ? p.axis : 'event'}</caption>
            <tbody>{p.events.map(e => <tr key={e.id}><th>{groups ? e.name : `${e.name}, ${e.ma} million years ago`}</th><td>{withUnit(e.value)}</td></tr>)}</tbody>
          </table></div>
          <p className="stage__note">{p.source}</p>
        </>
      )}
    </section>
  );
}
