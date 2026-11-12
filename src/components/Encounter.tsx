import { useEffect, useId, useRef, useState } from 'react';
import { blankAttempt, type Activity, type AttemptState, type CollectionActivity, type Evaluation, type PairActivity, type RulerActivity } from '../core/contracts';
import { OBJECTIVES, SOURCES } from '../core/curriculum';
import './encounter.css';

export interface EncounterProps {
  activity: Activity;
  initialState?: AttemptState;
  initialAssisted?: boolean;
  onStateChange: (state: AttemptState, assisted: boolean) => void;
  onSubmit: (state: AttemptState, assisted: boolean) => Evaluation;
  onContinue: () => void;
  onExit: () => void;
  alreadyQualified?: boolean;
}

/** Coordinates and lengths in the contract are exact quarter ticks. */
const quarterLabel = (ticks: number): string => {
  const value = Math.abs(ticks);
  const whole = Math.floor(value / 4);
  const part = ['', '¼', '½', '¾'][value % 4] ?? String((value % 4) / 4);
  return `${ticks < 0 ? '−' : ''}${whole || !part ? whole : ''}${part}`;
};

const plural = (word: string, count: number): string => count === 1 ? word : `${word}s`;

function PairInstrument({ activity, state, locked, change }: {
  activity: PairActivity; state: AttemptState; locked: boolean; change: (patch: Partial<AttemptState>) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('Choose one on the left, then one on the right.');
  const rows = Math.max(activity.sources, activity.receivers);
  const height = Math.max(230, rows * 44 + 18);
  const pointY = (index: number, count: number) => count === 1 ? height / 2 : 25 + index * (height - 50) / (count - 1);
  const sourceName = (index: number) => `${activity.sourceLabel} ${index + 1}`;
  const receiverName = (index: number) => `${activity.receiverLabel} ${index + 1}`;
  const selectReceiver = (receiverId: string) => {
    if (!selected) { setNotice(`Choose a ${activity.sourceLabel} on the left first.`); return; }
    const owner = Object.entries(state.pairs).find(([, target]) => target === receiverId)?.[0];
    if (owner && owner !== selected) { setNotice(`That ${activity.receiverLabel} already has a connection. Choose another, or remove its existing pair.`); return; }
    change({ pairs: { ...state.pairs, [selected]: receiverId } });
    setSelected(null);
    setNotice('Connection made. Each object can belong to only one pair.');
  };
  return <div className="enc-pair">
    <div className="enc-model-labels"><span>{plural(activity.sourceLabel, activity.sources)}</span><span>{plural(activity.receiverLabel, activity.receivers)}</span></div>
    <div className="enc-pair-field" style={{ height }} aria-label="One-to-one connection instrument">
      <svg className="enc-pair-lines" viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="48" x2="48" y1="14" y2={height - 14} className="enc-guide-line" />
        <line x1="272" x2="272" y1="14" y2={height - 14} className="enc-guide-line" />
        {Object.entries(state.pairs).map(([source, receiver]) => {
          const start = Number(source.slice(1)); const end = Number(receiver.slice(1));
          if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0 || start >= activity.sources || end >= activity.receivers) return null;
          const a = pointY(start, activity.sources); const b = pointY(end, activity.receivers);
          return <path key={source} d={`M 48 ${a} C 130 ${a},190 ${b},272 ${b}`} className={`enc-connection${selected === source ? ' is-selected' : ''}`} />;
        })}
      </svg>
      {Array.from({ length: activity.sources }, (_, i) => {
        const id = `s${i}`; const target = state.pairs[id];
        return <button key={id} type="button" className={`enc-object enc-object--source${target ? ' is-connected' : ''}${selected === id ? ' is-selected' : ''}`} style={{ top: pointY(i, activity.sources) }} disabled={locked}
          aria-label={`Select ${sourceName(i)}${target ? `, connected to ${receiverName(Number(target.slice(1)))}` : ', unpaired'}`} aria-pressed={selected === id} data-source={id}
          onClick={() => { setSelected(selected === id ? null : id); setNotice(target ? 'Choose another receiver to move this connection, or remove the pair.' : `Now choose a ${activity.receiverLabel}.`); }}>
          <span className="enc-object-mark">{i + 1}</span>
        </button>;
      })}
      {Array.from({ length: activity.receivers }, (_, i) => {
        const id = `r${i}`; const source = Object.entries(state.pairs).find(([, target]) => target === id)?.[0];
        return <button key={id} type="button" className={`enc-object enc-object--receiver${source ? ' is-connected' : ''}`} style={{ top: pointY(i, activity.receivers) }} disabled={locked}
          aria-label={`Connect to ${receiverName(i)}${source ? `, paired with ${sourceName(Number(source.slice(1)))}` : ', unpaired'}`} data-receiver={id} onClick={() => selectReceiver(id)}><span className="enc-object-mark">{i + 1}</span></button>;
      })}
    </div>
    <div className="enc-pair-caption"><span aria-live="polite">{selected ? notice : `${Object.keys(state.pairs).length} ${plural('connection', Object.keys(state.pairs).length)} · one object, one pair`}</span>{selected && state.pairs[selected] && <button className="enc-text-button" type="button" disabled={locked} onClick={() => { const pairs = { ...state.pairs }; delete pairs[selected]; change({ pairs }); setSelected(null); }}>Remove pair</button>}</div>
    <fieldset className="enc-choices"><legend>Which side has something left over?</legend><div className="enc-choice-row">
      {(['sources', 'neither', 'receivers'] as const).map(value => <button key={value} type="button" aria-pressed={state.surplus === value} disabled={locked} className={`enc-choice${state.surplus === value ? ' is-selected' : ''}`} data-surplus={value} onClick={() => change({ surplus: value })}>{value === 'neither' ? 'Neither' : plural(value === 'sources' ? activity.sourceLabel : activity.receiverLabel, 2)}</button>)}
    </div></fieldset>
    <p className="enc-sr" aria-live="polite">{notice}</p>
  </div>;
}

const dotPosition = (index: number, count: number, arrangement: CollectionActivity['arrangement']): [number, number] => {
  if (count === 1) return [160, 118];
  if (arrangement === 'ring') { const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, count); return [160 + Math.cos(angle) * 87, 118 + Math.sin(angle) * 77]; }
  if (arrangement === 'scatter') {
    const points: [number, number][] = [[73,68],[158,52],[246,83],[104,130],[200,146],[60,187],[264,190],[164,211],[265,40],[44,119],[154,165],[221,107]];
    return points[index % points.length];
  }
  const columns = Math.min(4, Math.ceil(Math.sqrt(count))); const rowCount = Math.ceil(count / columns);
  return [160 + (index % columns - (columns - 1) / 2) * 53, 118 + (Math.floor(index / columns) - (rowCount - 1) / 2) * 53];
};

function CollectionInstrument({ activity, state, locked, change }: {
  activity: CollectionActivity; state: AttemptState; locked: boolean; change: (patch: Partial<AttemptState>) => void;
}) {
  const count = state.revealed ? Math.max(0, activity.initial + activity.change) : activity.initial;
  const arrangement = state.revealed && activity.rearrange ? (activity.arrangement === 'ring' ? 'grid' : 'ring') : activity.arrangement;
  return <div className="enc-collection">
    <div className="enc-model-labels"><span>{state.revealed ? 'After the change' : 'Before the change'}</span><span className="enc-model-detail">{state.revealed ? 'Look closely' : 'Observe → predict → test'}</span></div>
    <svg className={`enc-collection-model${state.revealed ? ' is-revealed' : ''}`} viewBox="0 0 320 250" role="img" aria-label={`${state.revealed ? 'After' : 'Before'}: ${count} objects in a ${arrangement} arrangement.`}>
      <circle cx="160" cy="118" r="105" className="enc-orbit" />
      <path d="M160 5v9 M160 222v9 M47 118h9 M264 118h9" className="enc-guide-line" />
      {Array.from({ length: count }, (_, i) => { const [x, y] = dotPosition(i, count, arrangement); return <g key={i} className="enc-dot" style={{ transform: `translate(${x}px,${y}px)` }}><circle r="16" className="enc-dot-halo" /><circle r="7" className="enc-dot-core" /><circle r="2" className="enc-dot-center" /></g>; })}
      {count === 0 && <><circle cx="160" cy="118" r="24" className="enc-empty-ring" /><text x="160" y="161" className="enc-svg-label" textAnchor="middle">An empty collection</text></>}
      {state.revealed && <text x="160" y="245" textAnchor="middle" className="enc-svg-label">{count} {plural('object', count)} afterward</text>}
    </svg>
    <fieldset className="enc-choices"><legend>{state.revealed ? 'Your prediction' : 'How many will there be afterward?'}</legend><div className="enc-choice-row">
      {activity.answerOptions.map(value => <button key={value} type="button" className={`enc-choice enc-choice--number${state.answer === value ? ' is-selected' : ''}`} aria-pressed={state.answer === value} disabled={locked || state.revealed} data-answer={value} onClick={() => change({ answer: value })}>{value}</button>)}
    </div></fieldset>
    {!state.revealed && <button type="button" className="enc-reveal-button" disabled={locked || state.answer === null} onClick={() => change({ revealed: true })} data-action="reveal"><span>{activity.actionLabel}</span><span aria-hidden="true">↗</span></button>}
    {state.revealed && <p className="enc-instrument-note">Your prediction is held. Compare it with the changed collection, then check your reasoning.</p>}
  </div>;
}

function RulerInstrument({ activity, state, locked, change }: {
  activity: RulerActivity; state: AttemptState; locked: boolean; change: (patch: Partial<AttemptState>) => void;
}) {
  const minimum = Math.min(0, activity.start, ...activity.originOptions);
  const maximum = Math.max(activity.end + 2, ...activity.originOptions.map(value => value + 2));
  const x = (tick: number) => 28 + (tick - minimum) / Math.max(1, maximum - minimum) * 264;
  const rulerOrigin = state.origin ?? activity.originOptions[0] ?? minimum;
  const rulerUnit = state.unit ?? activity.unitOptions[0] ?? 4;
  const stepCount = Math.min(64, Math.floor((maximum - rulerOrigin) / Math.max(1, rulerUnit)));
  const axisStep = maximum - minimum > 24 ? 4 : maximum - minimum > 12 ? 2 : 1;
  const axisTicks = Array.from({ length: Math.floor((maximum - minimum) / axisStep) + 1 }, (_, i) => minimum + i * axisStep);
  return <div className="enc-ruler">
    <div className="enc-model-labels"><span>The span</span><span className="enc-model-detail">{quarterLabel(activity.start)} → {quarterLabel(activity.end)}</span></div>
    <svg className="enc-ruler-model" viewBox="0 0 320 195" role="img" aria-label={`Span from ${activity.start / 4} to ${activity.end / 4}. Measuring origin ${state.origin === null ? 'not selected' : state.origin / 4}, unit width ${state.unit === null ? 'not selected' : state.unit / 4}.`}>
      <line x1="28" x2="292" y1="38" y2="38" className="enc-axis" />
      {axisTicks.map(tick => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={tick % 4 === 0 ? 31 : 34} y2="44" className="enc-axis" />{(maximum - minimum <= 12 || tick % 4 === 0) && <text x={x(tick)} y="21" textAnchor="middle" className="enc-svg-label">{quarterLabel(tick)}</text>}</g>)}
      <rect x={x(activity.start)} y="62" width={x(activity.end) - x(activity.start)} height="25" rx="3" className="enc-span" />
      <line x1={x(activity.start)} x2={x(activity.start)} y1="52" y2="150" className="enc-target-guide" />
      <line x1={x(activity.end)} x2={x(activity.end)} y1="52" y2="150" className="enc-target-guide" />
      <g className={`enc-unit-ruler${state.origin === null || state.unit === null ? ' is-preview' : ''}`}>
        {Array.from({ length: stepCount }, (_, i) => <rect key={i} x={x(rulerOrigin + i * rulerUnit) + 1} y="107" width={Math.max(0, x(rulerOrigin + (i + 1) * rulerUnit) - x(rulerOrigin + i * rulerUnit) - 2)} height="22" rx="2" className={i % 2 ? 'enc-unit-alt' : 'enc-unit'} />)}
        {Array.from({ length: stepCount + 1 }, (_, i) => <line key={i} x1={x(rulerOrigin + i * rulerUnit)} x2={x(rulerOrigin + i * rulerUnit)} y1="103" y2="133" className="enc-ruler-tick" />)}
        <path d={`M${x(rulerOrigin) - 5} 143l5 -6l5 6Z`} className="enc-origin-marker" />
        <text x={x(rulerOrigin)} y="163" textAnchor="middle" className="enc-svg-label">origin</text>
      </g>
      <text x="160" y="188" textAnchor="middle" className="enc-svg-label">Each segment is one chosen unit</text>
    </svg>
    <div className="enc-ruler-controls">
      <fieldset className="enc-choices"><legend><span className="enc-step-number">1</span> Place the origin</legend><div className="enc-choice-row">{activity.originOptions.map(value => <button key={value} type="button" className={`enc-choice${state.origin === value ? ' is-selected' : ''}`} aria-label={`Origin at ${value / 4}`} aria-pressed={state.origin === value} disabled={locked} data-origin={value} onClick={() => change({ origin: value })}>{quarterLabel(value)}</button>)}</div></fieldset>
      <fieldset className="enc-choices"><legend><span className="enc-step-number">2</span> Choose a unit width</legend><div className="enc-choice-row">{activity.unitOptions.map(value => <button key={value} type="button" className={`enc-choice${state.unit === value ? ' is-selected' : ''}`} aria-label={`Unit width ${value / 4}`} aria-pressed={state.unit === value} disabled={locked} data-unit={value} onClick={() => change({ unit: value })}>{quarterLabel(value)}<span className="enc-choice-suffix">unit</span></button>)}</div></fieldset>
      <fieldset className="enc-choices"><legend><span className="enc-step-number">3</span> How many {plural(activity.unitLabel, 2)}?</legend><div className="enc-choice-row">{activity.answerOptions.map(value => <button key={value} type="button" className={`enc-choice enc-choice--number${state.answer === value ? ' is-selected' : ''}`} aria-pressed={state.answer === value} disabled={locked} data-answer={value} onClick={() => change({ answer: value })}>{value}</button>)}</div></fieldset>
    </div>
  </div>;
}

export function Encounter({ activity, initialState, initialAssisted = false, onStateChange, onSubmit, onContinue, onExit, alreadyQualified }: EncounterProps) {
  const [state, setState] = useState<AttemptState>(() => initialState ?? blankAttempt());
  const [assisted, setAssisted] = useState(initialAssisted);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const headingId = useId(); const hintId = useId();
  const activityId = useRef(activity.id);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (activityId.current === activity.id) return;
    activityId.current = activity.id;
    setState(initialState ?? blankAttempt()); setAssisted(initialAssisted); setEvaluation(null); setHintOpen(false);
    heading.current?.focus({ preventScroll: true });
  }, [activity.id, initialState, initialAssisted]);
  const change = (patch: Partial<AttemptState>) => {
    const next = { ...state, ...patch }; setState(next); setEvaluation(null); onStateChange(next, assisted);
  };
  const showHint = () => {
    if (!hintOpen) { setAssisted(true); onStateChange(state, true); }
    setHintOpen(!hintOpen);
  };
  const submit = () => {
    const result = onSubmit(state, assisted); setEvaluation(result);
    if (!result.passed) { setAssisted(true); onStateChange(state, true); }
    requestAnimationFrame(() => feedback.current?.focus({ preventScroll: true }));
  };
  const retry = () => {
    const next = activity.kind === 'collection' ? { ...state, answer: null, revealed: false } : state;
    setState(next); setEvaluation(null); setAssisted(true); onStateChange(next, true);
  };
  const passed = evaluation?.passed === true;
  const ready = activity.kind === 'pair' ? state.surplus !== null && Object.keys(state.pairs).length > 0 : activity.kind === 'collection' ? state.answer !== null && state.revealed : state.origin !== null && state.unit !== null && state.answer !== null;
  const phaseLabel = activity.phase === 'practice' ? 'An idea to investigate' : activity.phase === 'transfer' ? 'Try it in a new setting' : 'Bring the idea back';
  const sourceIds = OBJECTIVES.find(objective => objective.key === activity.objective)?.sourceRefs ?? [];
  return <section className="encounter" aria-labelledby={headingId} data-activity-id={activity.id} data-activity-kind={activity.kind} data-phase={activity.phase}>
    <header className="enc-heading"><p className="enc-eyebrow">{phaseLabel}<span>{activity.phase === 'practice' ? '01 / discover' : activity.phase === 'transfer' ? '02 / demonstrate' : '03 / remember'}</span></p><h1 id={headingId} ref={heading} tabIndex={-1}>{activity.title}</h1><p className="enc-prompt">{activity.prompt}</p></header>
    <div className="enc-instrument" key={activity.id}>
      {activity.kind === 'pair' && <PairInstrument activity={activity} state={state} locked={passed} change={change} />}
      {activity.kind === 'collection' && <CollectionInstrument activity={activity} state={state} locked={passed} change={change} />}
      {activity.kind === 'ruler' && <RulerInstrument activity={activity} state={state} locked={passed} change={change} />}
    </div>
    <footer className="enc-footer">
      {evaluation && <div ref={feedback} tabIndex={-1} className={`enc-feedback${passed ? ' is-passed' : ''}`} role="status"><span className="enc-feedback-title">{passed ? assisted ? 'Good repair. Make it yours next.' : alreadyQualified ? 'The idea is still yours.' : 'You found the relationship.' : 'One part needs another look.'}</span><p>{evaluation.feedback}</p>{passed && <p className="enc-explanation">{activity.explanation}</p>}</div>}
      {passed ? <button type="button" className="enc-primary" data-action="continue" onClick={onContinue}><span>{assisted ? 'Continue with a fresh check' : activity.phase === 'practice' ? 'Try it independently' : 'See it on the map'}</span><span aria-hidden="true">↗</span></button> : activity.kind === 'collection' && state.revealed && evaluation ? <button type="button" className="enc-primary" onClick={retry} data-action="retry"><span>Make a new prediction</span><span aria-hidden="true">↻</span></button> : <button type="button" className="enc-primary" disabled={!ready} data-action="check" onClick={submit}><span>Check my reasoning</span><span aria-hidden="true">↗</span></button>}
      <div className="enc-secondary-actions"><button type="button" className="enc-text-button" onClick={onExit}>Save & return</button>{!passed && <button type="button" className="enc-text-button" aria-expanded={hintOpen} aria-controls={hintId} onClick={showHint}>{hintOpen ? 'Close hint' : 'A little guidance'}</button>}</div>
      {hintOpen && !passed && <div className="enc-hint" id={hintId}><span className="enc-eyebrow">A useful way to look</span><p>{activity.hint}</p><small>This is supported practice. You can try a fresh example independently afterward.</small></div>}
      <details className="enc-sources"><summary>Where this idea comes from</summary>{SOURCES.filter(source => sourceIds.includes(source.id)).map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span></a><small>{source.note}</small></p>)}</details>
    </footer>
  </section>;
}
