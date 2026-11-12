import { useMemo, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { seeded, meanVariance } from './drift';
import { expectedRandom, finalSize, plateCounts, type CultureModel } from './fluctuationMath';

// A fluctuation test you can rerun. Two hypotheses about where resistant bacteria come from
// each fill a row of dishes; then the real counts from the original experiment appear for
// comparison. Dishes are drawn in code: a colony is a dot, a big count is a crowded dish.

type Hypothesis = { id: 'induced' | 'random'; label: string; note: string };
type RealRow = { label: string; counts: number[]; note: string };
export type Params = {
  cultures: number;
  model: CultureModel;
  seed: string;
  hypotheses: Hypothesis[];
  grow: string;
  real: { label: string; rows: RealRow[]; source: string };
  question: { ask: string; choices: Choice[]; answer: string; explain: string };
};

const MAX_DOTS = 160;
const millions = (n: number) => `${Math.round(n / 1e6).toLocaleString('en-US')} million`;
/** Model numbers in a note are computed, never typed: {cells} per culture, {odds} per new cell, {dishes}. */
const fillModel = (text: string, p: Params) => text
  .replace('{cells}', millions(finalSize(p.model)))
  .replace('{odds}', `1 in ${millions(1 / p.model.rate)}`)
  .replace('{dishes}', String(p.cultures));

function Dish({ count, seed, label }: { count: number; seed: string; label: string }) {
  const dots = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: Math.min(count, MAX_DOTS) }, () => {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 25;
      return [32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1.4 + rand() * 1.6] as const;
    });
  }, [count, seed]);
  return (
    <figure className={`dish${count === 0 ? ' is-empty' : ''}${count > 50 ? ' is-jackpot' : ''}`}>
      <svg viewBox="0 0 64 64" role="img" aria-label={label}>
        <circle cx="32" cy="32" r="30" className="dish__rim" />
        <circle cx="32" cy="32" r="27.5" className="dish__agar" />
        {dots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="dish__colony" />)}
      </svg>
      <figcaption>{count}</figcaption>
    </figure>
  );
}

function Row({ counts, seed, caption }: { counts: number[]; seed: string; caption?: string }) {
  const { mean } = meanVariance(counts);
  const none = counts.filter(c => c === 0).length;
  return (
    <div className="dishes">
      {caption && <p className="dishes__caption">{caption}</p>}
      <div className="dishes__grid">{counts.map((c, i) => <Dish key={i} count={c} seed={`${seed}:${i}`} label={`Dish ${i + 1}: ${c} resistant colonies`} />)}</div>
      <p className="readout">Average {Number(mean.toFixed(2))} · Most on one dish {Math.max(...counts)} · Empty dishes {none}</p>
    </div>
  );
}

export function Fluctuation({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as Params;
  const [view, setView] = useState<Hypothesis['id'] | 'real'>(p.hypotheses[0].id);
  const [grown, setGrown] = useState<Record<string, number>>({});
  const tried = p.hypotheses.every(h => grown[h.id]);
  const counts = useMemo(() => {
    if (view === 'real' || !grown[view]) return null;
    // The two ideas get the same average, so only the spread differs.
    return plateCounts(view, p.cultures, p.model, expectedRandom(p.model), seeded(`${p.seed}:${view}:${grown[view]}`));
  }, [view, grown, p]);
  const hyp = p.hypotheses.find(h => h.id === view);
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="sim-toolbar">
        <div className="segmented segmented--wrap fluct__modes" role="radiogroup" aria-label="Where resistance comes from">
          {p.hypotheses.map(h => <button key={h.id} type="button" role="radio" aria-checked={view === h.id} onClick={() => setView(h.id)}>{h.label}</button>)}
          {tried && <button type="button" role="radio" aria-checked={view === 'real'} onClick={() => setView('real')}>{p.real.label}</button>}
        </div>
        {view !== 'real' && <button type="button" className="drift__run" onClick={() => setGrown(g => ({ ...g, [view]: (g[view] ?? 0) + 1 }))}>{p.grow}</button>}
      </div>
      {hyp && <p className="fluct__note">{fillModel(hyp.note, p)}</p>}
      {counts && <Row counts={counts} seed={`${p.seed}:${view}:${grown[view]}`} />}
      {view === 'real' && (
        <>
          {p.real.rows.map((row, i) => (
            <div key={row.label} className="fluct__real">
              <Row counts={row.counts} seed={`real:${i}`} caption={row.label} />
              <p className="stage__note">{row.note}</p>
            </div>
          ))}
          <p className="stage__note">{p.real.source}</p>
          <Question gradeId={beat.grades?.[0].gradeId ?? 'fluct-real'} prompt={p.question.ask} choices={p.question.choices}
            answer={p.question.answer} explain={p.question.explain} onDone={done} />
        </>
      )}
    </section>
  );
}
