import { useEffect, useMemo, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { best, mating, offspring, sample, survival, type Mating, type Setting } from './tradeoffModel';
import './TradeOff.css';

// One trait, two pulls: the more of it a male has, the more females choose him and the
// more predators find him. The learner slides the trait to find the value that leaves the
// most young, then predicts where that best value goes when the cost changes.

export type Params = {
  trait: { name: string; low: string; high: string };
  figure?: 'guppy';
  curves: { survival: string; mating: string; offspring: string };
  settings: Setting[];
  mating: Mating;
  start: string;
  /** Within this distance of the best value counts as finding it. */
  tolerance: number;
  /** Feedback while searching, keyed by where the better value lies. */
  readout: { more: string; less: string; best: string };
  questions: { gradeId: string; prompt: string; choices: Choice[]; answer: string; explain: string; switchTo: string }[];
  credit: string;
};

const W = 600, H = 330, L = 18, R = 18, T = 20, B = 46;
const px = (x: number) => L + x * (W - L - R);
const py = (y: number) => T + (1 - y) * (H - T - B);
const line = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('');

export function TradeOff({ beat }: { beat: SimBeat }) {
  const { done, evidenceFor } = useBeat();
  const p = beat.params as unknown as Params;
  const q = p.questions[0];
  const answered = !!evidenceFor(q.gradeId);
  const [settingId, setSettingId] = useState(answered ? q.switchTo : p.start);
  const [x, setX] = useState(0.08);
  const [found, setFound] = useState(answered);
  const setting = p.settings.find(s => s.id === settingId)!;
  const peak = best(setting, p.mating);
  // Young are shown against the best male in the same stream (best = 100), so the peak always stands clear.
  const scale = offspring(peak, setting, p.mating) / 0.9;
  const curves = useMemo(() => ({
    survival: sample(v => survival(v, setting)),
    mating: sample(v => mating(v, p.mating)),
    offspring: sample(v => offspring(v, setting, p.mating) / scale),
  }), [setting, p.mating, scale]);
  const near = Math.abs(x - peak) <= p.tolerance;
  useEffect(() => { if (near && settingId === p.start) setFound(true); }, [near, settingId, p.start]);
  const here = { s: survival(x, setting), m: mating(x, p.mating), o: offspring(x, setting, p.mating) / scale };
  const status = near ? p.readout.best : x < peak ? p.readout.more : p.readout.less;

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="tradeoff">
        <div className="tradeoff__top">
          {p.figure === 'guppy' && <Guppy amount={x} />}
          <div className="tradeoff__place">
            {answered && <div className="segmented" role="radiogroup" aria-label="Setting">
              {p.settings.map(s => <button key={s.id} type="button" role="radio" aria-checked={s.id === settingId} onClick={() => setSettingId(s.id)}>{s.label}</button>)}
            </div>}
            {!answered && <p className="tradeoff__setting">{setting.label}</p>}
            <p className={`tradeoff__status${near ? ' is-best' : ''}`} aria-live="polite">{status}</p>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="tradeoff__chart" role="img" aria-label={`${p.curves.offspring} against ${p.trait.name.toLowerCase()}, ${setting.label.toLowerCase()}`}>
          <line x1={px(0)} x2={px(1)} y1={py(0)} y2={py(0)} className="tradeoff__axis" />
          <path d={line(curves.survival)} className="tradeoff__curve is-survival" />
          <path d={line(curves.mating)} className="tradeoff__curve is-mating" />
          <path d={`${line(curves.offspring)}L${px(1)},${py(0)}L${px(0)},${py(0)}Z`} className="tradeoff__area" />
          <path d={line(curves.offspring)} className="tradeoff__curve is-offspring" />
          <text x={px(0.02)} y={py(curves.survival[1][1]) - 10} className="tradeoff__label">{p.curves.survival}</text>
          <text x={px(0.98)} y={py(curves.mating[curves.mating.length - 2][1]) + 26} textAnchor="end" className="tradeoff__label">{p.curves.mating}</text>
          {found && (
            <g className="tradeoff__peak">
              <line x1={px(peak)} x2={px(peak)} y1={py(0)} y2={py(offspring(peak, setting, p.mating) / scale)} />
              <text x={px(peak)} y={py(offspring(peak, setting, p.mating) / scale) - 12} textAnchor="middle">{p.curves.offspring}: most</text>
            </g>
          )}
          <line x1={px(x)} x2={px(x)} y1={py(0)} y2={T} className="tradeoff__cursor" />
          <circle cx={px(x)} cy={py(here.o)} r="8" className="tradeoff__dot" />
          <circle cx={px(x)} cy={py(here.s)} r="5" className="tradeoff__dot is-minor" />
          <circle cx={px(x)} cy={py(here.m)} r="5" className="tradeoff__dot is-minor" />
          <text x={px(0)} y={H - 14} className="tradeoff__tick">{p.trait.low}</text>
          <text x={px(1)} y={H - 14} textAnchor="end" className="tradeoff__tick">{p.trait.high}</text>
        </svg>
        <label className="tradeoff__slider">
          <span>{p.trait.name}</span>
          <input type="range" min={0} max={1} step={0.01} value={x} aria-valuetext={`${Math.round(x * 100)} percent`} onChange={e => setX(Number(e.target.value))} />
        </label>
        <dl className="tradeoff__values">
          <div><dt>{p.curves.survival}</dt><dd>{Math.round(here.s * 100)}%</dd></div>
          <div><dt>{p.curves.mating}</dt><dd>{Math.round(here.m * 100)}%</dd></div>
          <div className="is-main"><dt>{p.curves.offspring}</dt><dd>{Math.round((here.o / 0.9) * 100)}<small> of 100</small></dd></div>
        </dl>
        <div className="sr-only"><table>
          <caption>{p.curves.offspring} by {p.trait.name.toLowerCase()}</caption>
          <thead><tr><th>{p.trait.name}</th>{p.settings.map(s => <th key={s.id}>{s.label}</th>)}</tr></thead>
          <tbody>{[0, 0.25, 0.5, 0.75, 1].map(v => <tr key={v}><td>{Math.round(v * 100)}%</td>{p.settings.map(s => <td key={s.id}>{Math.round(offspring(v, s, p.mating) / offspring(best(s, p.mating), s, p.mating) * 100)}</td>)}</tr>)}</tbody>
        </table></div>
      </div>
      {found && (
        <Question gradeId={q.gradeId} transfer={beat.grades?.find(g => g.gradeId === q.gradeId)?.transfer} prompt={q.prompt} choices={q.choices} answer={q.answer}
          explain={q.explain} onDone={() => { setSettingId(q.switchTo); done(); }} />
      )}
      <p className="credit-line">{p.credit}</p>
    </section>
  );
}

/** A male guppy drawn in code. More of the trait means more, and larger, orange, black and blue spots. */
function Guppy({ amount }: { amount: number }) {
  const spots = [
    { x: 66, y: 52, c: 'o', at: 0.02 }, { x: 92, y: 40, c: 'k', at: 0.12 }, { x: 108, y: 60, c: 'b', at: 0.22 },
    { x: 80, y: 66, c: 'o', at: 0.32 }, { x: 122, y: 44, c: 'o', at: 0.42 }, { x: 54, y: 40, c: 'k', at: 0.5 },
    { x: 136, y: 58, c: 'b', at: 0.6 }, { x: 98, y: 52, c: 'k', at: 0.68 }, { x: 150, y: 50, c: 'o', at: 0.76 },
    { x: 70, y: 36, c: 'b', at: 0.84 }, { x: 118, y: 70, c: 'k', at: 0.92 },
  ];
  const tail = 0.35 + amount * 0.65;
  return (
    <svg viewBox="0 0 230 104" className="guppy" role="img" aria-label={`A male guppy with ${amount < 0.2 ? 'almost no' : amount < 0.6 ? 'some' : 'lots of'} colour`}>
      <path d="M150 52 L212 18 Q226 52 212 86 Z" className="guppy__tail" style={{ fillOpacity: tail }} />
      {amount > 0.45 && <path d="M150 52 L206 30 Q214 52 206 74 Z" className="guppy__tailspot" style={{ opacity: Math.min(1, (amount - 0.45) * 2.5) }} />}
      <ellipse cx="96" cy="52" rx="62" ry="22" className="guppy__body" />
      <path d="M86 32 Q100 18 118 30" className="guppy__fin" />
      <circle cx="46" cy="48" r="5.5" className="guppy__eye" />
      {spots.map((s, i) => amount >= s.at && (
        <circle key={i} cx={s.x} cy={s.y} r={3.5 + amount * 5.5} className={`guppy__spot is-${s.c}`} />
      ))}
    </svg>
  );
}
