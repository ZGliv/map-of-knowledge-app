import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';
import { answerWords, judgeCase, valueWords, type Outcome } from './engines';
import type { CaseAnswer, PlaceCase } from './types';
import { ChartView, ClockLandmarks, ClockView, CrossView, NestView, PopulationView, SequenceView, TradeoffView, TreeView } from './views';
import { MotionView, RatioView, SpreadView } from './views-sims';
import './case.css';

const RUN_MS = 2600;

/** The engine's picture of the case, before and during the run. */
function Picture({ c, answer, outcome, t }: { c: PlaceCase; answer: CaseAnswer | null; outcome: Outcome | null; t: number }): ReactElement {
  const m = c.model;
  switch (m.engine) {
    case 'population': return <PopulationView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'tradeoff': return <TradeoffView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'cross': return <CrossView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'tree': return <TreeView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'clock': return <><ClockView model={m} answer={answer} outcome={outcome} t={t} /><ClockLandmarks model={m} /></>;
    case 'nest': return <NestView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'chart': return <ChartView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'motion': return <MotionView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'ratio': return <RatioView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'spread': return <SpreadView model={m} answer={answer} outcome={outcome} t={t} />;
    case 'sequence': return <SequenceView model={m} answer={answer} outcome={outcome} t={t} />;
  }
}

export interface CaseViewProps {
  c: PlaceCase;
  /** The call, written to the record the moment Run is pressed, before anything is revealed. */
  onCommit: (answer: CaseAnswer, success: boolean, ms: number) => void;
  /** The run has finished playing. */
  onSettled?: (success: boolean) => void;
  /** In the expedition the case is the last beat (no title, the story in the reading face); a field
   * mission is a page of its own, headed by the case's title. */
  layout?: 'beat' | 'mission';
}

/**
 * A new case: the situation, one call (pick or set), Run, and the model's outcome. The call locks
 * when Run is pressed; nothing about the answer shows before then.
 */
export function CaseView({ c, onCommit, onSettled, layout = 'beat' }: CaseViewProps) {
  const call = c.call;
  const [value, setValue] = useState(call.kind === 'set' ? call.start : 0);
  const [touched, setTouched] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const multi = call.kind === 'pick' && !!call.multi;
  const [result, setResult] = useState<{ outcome: Outcome; success: boolean; given: string } | null>(null);
  const [t, setT] = useState(0);
  const opened = useRef(Date.now());
  const settled = useRef(false);
  const after = useRef<HTMLDivElement>(null);
  const setId = useId();
  // One step up or down: a finger can't land on one value of a long range, so the slider has fine
  // control beside it. Rounded to the step's own decimals so 0.05 steps don't drift.
  const nudge = (dir: 1 | -1) => {
    if (call.kind !== 'set' || result) return;
    const digits = String(call.step).split('.')[1]?.length ?? 0;
    setValue(v => Math.min(call.max, Math.max(call.min, Number((v + dir * call.step).toFixed(digits)))));
    setTouched(true);
  };
  const answer: CaseAnswer | null = call.kind === 'pick' ? (multi ? (picks.length ? { picks } : null) : pick ? { pick } : null) : touched ? { value } : null;
  const shownAnswer = result ? answer : call.kind === 'set' ? { value } : answer;

  const run = () => {
    if (!answer || result) return;
    const judged = judgeCase(c, answer);
    onCommit(answer, judged.success, Date.now() - opened.current);
    setResult({ outcome: judged.outcome, success: judged.success, given: answerWords(c, answer) });
  };

  useEffect(() => {
    if (!result) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setT(1); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const k = Math.min(1, (now - start) / RUN_MS); setT(k); if (k < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    // A hidden tab pauses animation frames: finish anyway.
    const done = window.setTimeout(() => setT(1), RUN_MS + 400);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(done); };
  }, [result]);
  useEffect(() => {
    if (result && t >= 1 && !settled.current) { settled.current = true; onSettled?.(result.success); }
  }, [result, t, onSettled]);

  const done = !!result && t >= 1;
  // What happened and why are the point of the run: bring the call, the outcome line and the reveal
  // into view, under the sticky bar, ahead of whatever the screen shows below them. A beat later, so
  // the end the screen adds below (the patch) is there to scroll into.
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => after.current?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(id);
  }, [done]);
  const options = call.kind === 'pick' ? call.options : [];
  const wide = useMemo(() => options.length > 3 || options.some(o => o.label.length > 14), [options]);

  return (
    <div className={`case case--${layout}${result ? ' is-running' : ''}${done ? ` is-done ${result!.success ? 'is-right' : 'is-wrong'}` : ''}`} data-case={c.id} data-case-engine={c.model.engine} data-case-phase={done ? 'done' : result ? 'running' : 'setup'}>
      {c.setting && <p className="case__setting">{c.setting}</p>}
      {layout === 'mission' && <h1 className="case__title">{c.title}</h1>}
      <p className="case__scenario">{c.scenario}</p>
      <p className="case__ask">{c.ask}</p>

      <div className="case__picture"><Picture c={c} answer={shownAnswer} outcome={result?.outcome ?? null} t={t} /></div>

      {call.kind === 'pick' ? (
        <div className={`case__options${wide || multi ? ' is-grid' : ''}${multi ? ' is-multi' : ''}`} role={multi ? 'group' : 'radiogroup'} aria-label={c.ask}>
          {options.map(o => multi ? (
            <button key={o.id} type="button" role="checkbox" aria-checked={picks.includes(o.id)} disabled={!!result} onClick={() => setPicks(list => list.includes(o.id) ? list.filter(id => id !== o.id) : [...list, o.id])} data-case-option={o.id}>{o.label}</button>
          ) : (
            <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} disabled={!!result} onClick={() => setPick(o.id)} data-case-option={o.id}>{o.label}</button>
          ))}
        </div>
      ) : (
        <div className="case__set">
          <label className="case__set-head" htmlFor={setId}><span>{call.label}</span><b>{touched || result ? valueWords(call, value) : '—'}</b></label>
          <div className="case__set-row">
            <button type="button" className="case__step" aria-label={`Less: ${call.label}`} disabled={!!result || value <= call.min} onClick={() => nudge(-1)} data-case-step="down">−</button>
            <input id={setId} type="range" min={call.min} max={call.max} step={call.step} value={value} disabled={!!result}
              onChange={e => { setValue(Number(e.target.value)); setTouched(true); }} data-case-set />
            <button type="button" className="case__step" aria-label={`More: ${call.label}`} disabled={!!result || value >= call.max} onClick={() => nudge(1)} data-case-step="up">+</button>
          </div>
          {call.ends && <span className="case__ends"><span>{call.ends[0]}</span><span>{call.ends[1]}</span></span>}
        </div>
      )}

      {!result && (
        <div className="case__go">
          <button type="button" className="case__run" disabled={!answer} onClick={run} data-action="case-run">{c.run}</button>
        </div>
      )}

      {result && (
        <div ref={after} className="case__after" aria-live="polite">
          <p className="case__yours">You called {result.given}.</p>
          {done && <>
            <p className="case__line" data-case-result={result.success ? 'right' : 'wrong'}>{result.outcome.line}</p>
            <p className="case__reveal">{c.reveal}</p>
          </>}
        </div>
      )}
    </div>
  );
}
