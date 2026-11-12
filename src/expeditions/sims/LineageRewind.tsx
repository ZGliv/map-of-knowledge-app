import { useEffect, useMemo, useRef, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { lastShared, layout, visible, type Tree } from './rewind';
import './LineageRewind.css';

// Living species at today's edge. Wind the clock back and their lines run into the past
// and meet where two lines last shared an ancestor. Two questions frame it: what sits at
// the join (asked before rewinding), and whose line has been evolving longer since.

export type Params = {
  tree: Tree;
  /** How far back the clock winds, in the tree's unit. */
  max: number;
  ticks: number[];
  unit: string;
  focus: { pair: [string, string]; label: string };
  questions: { gradeId: string; prompt: string; choices: Choice[]; answer: string; explain: string }[];
  credit: string;
};

const W = 640, LABELS = 186, LEFT = 18, ROW = 54, TOP = 64, AXIS = 52;

export function LineageRewind({ beat }: { beat: SimBeat }) {
  const { done, evidenceFor } = useBeat();
  const p = beat.params as unknown as Params;
  const [q1, q2] = p.questions;
  const first = !!evidenceFor(q1.gradeId), second = !!evidenceFor(q2.gradeId);
  const l = useMemo(() => layout(p.tree), [p.tree]);
  const focus = useMemo(() => lastShared(p.tree, ...p.focus.pair), [p.tree, p.focus.pair]);
  const [cursor, setCursor] = useState(second ? p.max : 0);
  const [reached, setReached] = useState(second);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const H = TOP + p.tree.tips.length * ROW + AXIS;
  const x = (t: number) => W - LABELS - (t / p.max) * (W - LABELS - LEFT);
  const y = (row: number) => TOP + row * ROW + ROW / 2;
  const { segments, joins } = visible(p.tree, l, cursor);
  const passed = cursor >= l.t[focus];
  useEffect(() => { if (cursor >= p.max * 0.995) setReached(true); }, [cursor, p.max]);

  // Rewind runs the clock from where it is to the far past in about six seconds.
  useEffect(() => {
    if (!playing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = cursor >= p.max ? 0 : cursor, start = performance.now(), span = reduce ? 1 : 6000 * (1 - from / p.max);
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / Math.max(1, span));
      setCursor(from + (p.max - from) * k);
      if (k < 1) raf.current = requestAnimationFrame(step); else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // The animation reads the cursor once, when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, p.max]);

  const onPath = (id: string) => second && p.focus.pair.some(tip => { let at: string | undefined = tip; while (at && at !== focus) { if (at === id) return true; at = l.parent[at]; } return false; });
  const when = cursor < p.max * 0.004 ? 'Today' : `${cursor < 10 ? cursor.toFixed(1).replace(/\.0$/, '') : Math.round(cursor)} ${p.unit}`;
  const split = p.tree.splits.find(s => s.id === focus)!;

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="rewind">
        <svg viewBox={`0 0 ${W} ${H}`} className="rewind__chart" role="img" aria-label={`Family tree wound back to ${when}`}>
          <text x={x(cursor)} y="30" textAnchor={cursor > p.max * 0.75 ? 'start' : cursor < p.max * 0.08 ? 'end' : 'middle'} className="rewind__when">{when}</text>
          <line x1={x(cursor)} x2={x(cursor)} y1={42} y2={H - AXIS + 6} className="rewind__cursor" />
          {p.tree.splits.filter(s => cursor >= s.about).map(s => (
            <line key={`r-${s.id}`} x1={x(s.range[1])} x2={x(s.range[0])} y1={y(l.y[s.id])} y2={y(l.y[s.id])} className="rewind__range" />
          ))}
          {segments.map(s => <line key={`s-${s.id}`} x1={x(s.from)} x2={x(s.to)} y1={y(s.y)} y2={y(s.y)} className={`rewind__line${onPath(s.id) ? ' is-path' : ''}`} />)}
          {joins.map(j => <line key={`j-${j.id}`} x1={x(j.at)} x2={x(j.at)} y1={y(j.y0)} y2={y(j.y1)} className={`rewind__line${onPath(j.id) ? ' is-path' : ''}`} />)}
          {p.tree.splits.filter(s => cursor >= s.about).map(s => (
            <circle key={`n-${s.id}`} cx={x(s.about)} cy={y(l.y[s.id])} r={s.id === focus ? 9 : 6} className={`rewind__node${s.id === focus ? ' is-focus' : ''}`} />
          ))}
          {passed && (
            <g className="rewind__label">
              <text x={x(split.about) - 16} y={y(l.y[focus]) - 8} textAnchor="end">{p.focus.label}</text>
              <text x={x(split.about) - 16} y={y(l.y[focus]) + 22} textAnchor="end" className="is-date">about {split.about} {p.unit}</text>
            </g>
          )}
          {p.tree.tips.map((tip, i) => (
            <g key={tip.id} className={`rewind__tip${p.focus.pair.includes(tip.id) ? ' is-pair' : ''}`}>
              <circle cx={x(0)} cy={y(i)} r="7" />
              <text x={x(0) + 16} y={y(i) + 8}>{tip.label}</text>
            </g>
          ))}
          <line x1={x(p.max)} x2={x(0)} y1={H - AXIS + 10} y2={H - AXIS + 10} className="rewind__axis" />
          {p.ticks.map(t => (
            <g key={t} className="rewind__tick">
              <line x1={x(t)} x2={x(t)} y1={H - AXIS + 4} y2={H - AXIS + 16} />
              <text x={x(t)} y={H - AXIS + 42} textAnchor="middle">{t === 0 ? 'Today' : t}</text>
            </g>
          ))}
        </svg>
        {first && (
          <div className="rewind__controls">
            <button type="button" className="rewind__play" onClick={() => setPlaying(v => !v)}>{playing ? 'Pause' : cursor >= p.max ? 'Again' : cursor > 0 ? 'Keep going' : 'Rewind'}</button>
            <label className="rewind__slider">
              <span className="sr-only">Wind the clock back</span>
              <input type="range" min={0} max={p.max} step={p.max / 400} value={p.max - cursor} aria-valuetext={when}
                onChange={e => { setPlaying(false); setCursor(p.max - Number(e.target.value)); }} />
            </label>
          </div>
        )}
        <div className="sr-only"><table>
          <caption>Splits in the family tree</caption>
          <thead><tr><th>Lines that meet</th><th>About</th><th>Range</th></tr></thead>
          <tbody>{p.tree.splits.map(s => <tr key={s.id}><td>{s.children.join(' and ')}</td><td>{s.about} {p.unit}</td><td>{s.range[0]}–{s.range[1]}</td></tr>)}</tbody>
        </table></div>
      </div>
      <Question gradeId={q1.gradeId} transfer={beat.grades?.find(g => g.gradeId === q1.gradeId)?.transfer} prompt={q1.prompt} choices={q1.choices} answer={q1.answer} explain={q1.explain} />
      {first && reached && (
        <Question gradeId={q2.gradeId} transfer={beat.grades?.find(g => g.gradeId === q2.gradeId)?.transfer} prompt={q2.prompt} choices={q2.choices} answer={q2.answer} explain={q2.explain} onDone={done} />
      )}
      <p className="credit-line">{p.credit}</p>
    </section>
  );
}
