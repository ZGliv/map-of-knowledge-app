import { useEffect, useMemo, useRef, useState } from 'react';
import { useWidth } from './useWidth';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { genealogy, outcomeOf, replicateRuns, tally } from './drift';

// Genetic drift, twice. First one small population, drawn as gene copies that each pick a
// random parent in the row above, so a learner watches luck alone fix a version. Then many
// populations side by side at a size the learner chooses. All text comes from the pack.

export type Params = {
  beads: { copies: number; start: number; generations: number; seed: string; title: string; note: string; a: string; b: string };
  chart: { sizes: number[]; p0: number; generations: number; replicates: number; seed: string; title: string; note?: string; sizeLabel: string; axis: string };
  question: { ask: string; choices: Choice[]; answer: string; explain: string };
};

const ROWS_SHOWN = 9;
const fmt = (n: number) => n.toLocaleString('en-US');
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Beads({ p, onSettled }: { p: Params['beads']; onSettled: () => void }) {
  const tree = useMemo(() => genealogy(p.copies, p.start, p.generations, p.seed), [p]);
  const [gen, setGen] = useState(0);
  const [running, setRunning] = useState(false);
  const count = (g: number) => tree.allele[g].reduce((a, b) => a + b, 0);
  const settledAt = useMemo(() => tree.allele.findIndex(row => row.every(x => x === row[0])), [tree]);
  const done = (settledAt >= 0 && gen >= settledAt) || gen >= p.generations;
  const settled = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  useEffect(() => { if (done && !settled.current) { settled.current = true; onSettled(); } }, [done, onSettled]);
  useEffect(() => {
    if (!running) return;
    if (done || gen >= p.generations) { setRunning(false); return; }
    const id = window.setTimeout(() => setGen(g => g + 1), reduced() ? 0 : 260);
    return () => window.clearTimeout(id);
  }, [running, gen, done, p.generations]);

  const first = Math.max(0, gen - ROWS_SHOWN + 1);
  const rows = Array.from({ length: gen - first + 1 }, (_, k) => first + k);
  // A label column on the left, then twenty copies; the field grows down one row per generation.
  const W = width, G = width < 500 ? 46 : 64, gap = (W - G) / p.copies, rowH = Math.max(30, Math.min(46, gap * 2.2)), H = rows.length * rowH + 4;
  const x = (i: number) => G + gap / 2 + i * gap;
  const y = (k: number) => rowH / 2 + k * rowH;
  const r = Math.min(10, gap * 0.34);
  const a = count(gen);
  return (
    <div className="drift" ref={box}>
      <p className="drift__title">{p.title}</p>
      <div className="drift__controls">
        <button type="button" className="drift__step" onClick={() => setGen(g => Math.min(p.generations, g + 1))} disabled={done || running}>Next generation</button>
        <button type="button" className="text-button" onClick={() => setRunning(true)} disabled={done || running}>Run until one version is left</button>
        <p className="readout" aria-live="polite">{done && (a === 0 || a === p.copies) ? `Generation ${gen}: every copy is ${a ? p.a : p.b}.` : `Generation ${gen}: ${p.a} ${a} · ${p.b} ${p.copies - a}`}</p>
      </div>
      <svg className="drift__beads" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Generation ${gen}: ${p.a} in ${a} of ${p.copies} copies`}>
        {rows.map((g, k) => k > 0 && tree.parent[g].map((par, i) => (
          <line key={`l${g}-${i}`} x1={x(par)} y1={y(k - 1) + r} x2={x(i)} y2={y(k) - r} className={`drift__link${tree.allele[g][i] ? ' is-a' : ''}`} />
        )))}
        {rows.map((g, k) => (
          <g key={g} className={g === gen ? 'is-now' : ''}>
            <text x={0} y={y(k) + 5} className="drift__gen">{g === 0 ? 'start' : `gen ${g}`}</text>
            {tree.allele[g].map((v, i) => <circle key={i} cx={x(i)} cy={y(k)} r={r} className={v ? 'drift__a' : 'drift__b'} />)}
          </g>
        ))}
      </svg>
      <p className="stage__note">{p.note}</p>
    </div>
  );
}

function Chart({ p, onRun }: { p: Params['chart']; onRun: (size: number) => void }) {
  const [size, setSize] = useState(p.sizes[0]);
  const [runs, setRuns] = useState(0);
  const [shown, setShown] = useState(0);
  const paths = useMemo(() => runs ? replicateRuns({ N: size, p0: p.p0, generations: p.generations, replicates: p.replicates, seed: `${p.seed}:${size}:${runs}` }) : [], [p, size, runs]);
  useEffect(() => {
    if (!runs) return;
    if (reduced()) { setShown(p.generations); onRun(size); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const g = Math.min(p.generations, Math.max(0, Math.round(((now - start) / 1800) * p.generations)));
      setShown(g);
      if (g < p.generations) raf = requestAnimationFrame(step); else onRun(size);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [runs, size, p.generations, onRun]);
  const run = () => { setShown(0); setRuns(n => n + 1); };
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const pick = (n: number) => { setSize(n); setRuns(0); setShown(0); };
  const W = width, H = Math.round(Math.min(320, Math.max(220, width * 0.5))), L = 44, R = 12, T = 34, B = 34;
  const gx = (g: number) => L + (g / p.generations) * (W - L - R);
  const fy = (f: number) => T + (1 - f) * (H - T - B);
  const finished = runs > 0 && shown >= p.generations;
  const t = finished ? tally(paths) : null;
  return (
    <div className="drift">
      <p className="drift__title">{p.title}</p>
      <div className="sim-toolbar">
        <div className="segmented" role="radiogroup" aria-label={p.sizeLabel}>
          {p.sizes.map(n => <button key={n} type="button" role="radio" aria-checked={n === size} onClick={() => pick(n)}>{fmt(n)}<small>{p.sizeLabel}</small></button>)}
        </div>
        <button type="button" className="drift__run" onClick={run} disabled={runs > 0 && !finished}>{runs ? 'Run again' : `Run ${p.replicates} populations`}</button>
      </div>
      <div className="stage" ref={box}>
        <svg className="drift__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.replicates} populations of ${fmt(size)} over ${p.generations} generations`}>
          {[0, 0.5, 1].map(f => (
            <g key={f}>
              <line x1={L} x2={W - R} y1={fy(f)} y2={fy(f)} className="drift__grid" />
              <text x={L - 8} y={fy(f) + 4} textAnchor="end" className="drift__axis">{f * 100}%</text>
            </g>
          ))}
          <text x={L} y={16} className="drift__axis">{p.axis}</text>
          {[0, p.generations / 2, p.generations].map(g => <text key={g} x={gx(g)} y={H - 10} textAnchor={g === 0 ? 'start' : g === p.generations ? 'end' : 'middle'} className="drift__axis">{g === 0 ? 'start' : `gen ${g}`}</text>)}
          {paths.map((path, i) => {
            const pts = path.slice(0, shown + 1).map((f, g) => `${gx(g).toFixed(1)},${fy(f).toFixed(1)}`).join(' ');
            const end = finished ? outcomeOf(path) : 'mixed';
            return <polyline key={i} points={pts} className={`drift__path is-${end}`} />;
          })}
        </svg>
      </div>
      {t ? (
        <p className="readout" aria-live="polite">In every copy: {t.fixed} · Gone: {t.lost} · Still mixed: {t.mixed}</p>
      ) : <p className="readout" aria-hidden="true">&nbsp;</p>}
      {t && (
        <div className="sr-only"><table>
          <caption>Final share of the variant in each population</caption>
          <tbody>{paths.map((path, i) => <tr key={i}><th>Population {i + 1}</th><td>{Math.round(path[path.length - 1] * 100)}%</td></tr>)}</tbody>
        </table></div>
      )}
      {p.note && <p className="stage__note">{p.note}</p>}
    </div>
  );
}

export function DriftLab({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as Params;
  const [stage, setStage] = useState<'beads' | 'chart'>('beads');
  const [settled, setSettled] = useState(false);
  const [tried, setTried] = useState<Set<number>>(new Set());
  const onRun = useMemo(() => (n: number) => setTried(s => s.has(n) ? s : new Set(s).add(n)), []);
  const extremes = [Math.min(...p.chart.sizes), Math.max(...p.chart.sizes)];
  const ready = extremes.every(n => tried.has(n));
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      {stage === 'beads' ? (
        <>
          <Beads p={p.beads} onSettled={() => setSettled(true)} />
          {settled && <button type="button" className="drift__next" onClick={() => setStage('chart')}>{p.chart.title}</button>}
        </>
      ) : (
        <Chart p={p.chart} onRun={onRun} />
      )}
      {stage === 'chart' && ready && (
        <Question gradeId={beat.grades?.[0].gradeId ?? 'drift-size'} prompt={p.question.ask} choices={p.question.choices}
          answer={p.question.answer} explain={p.question.explain} onDone={done} />
      )}
    </section>
  );
}
