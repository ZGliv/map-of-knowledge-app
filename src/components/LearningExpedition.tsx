import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { AttemptInput, Discovery, DiscoveryChallenge, DiscoveryVisual, GuideReply, GuideStatus, LearnerState, LearningSource } from '../core/guideTypes';
import './learning-expedition.css';
import { discoveryJourney } from '../core/learningJourney';
import { getDiscovery } from '../core/discoveries';

export interface LearningExpeditionProps {
  discovery: Discovery;
  sources: LearningSource[];
  learner: LearnerState;
  guideStatus?: GuideStatus;
  onRecordAttempt: (input: AttemptInput) => LearnerState;
  onComplete: () => void;
  onClose: () => void;
  onFollow: (discoveryId: string) => void;
  onCapture?: () => void;
  onAsk: (message: string, signal?: AbortSignal) => Promise<GuideReply>;
}

type Stage = 'intro' | 'probe' | 'transfer' | 'complete';

function Arrow({ direction = 'right' }: { direction?: 'right' | 'down' }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={direction === 'down' ? { transform: 'rotate(90deg)' } : undefined}><path d="M4 12h15M13 5l7 7-7 7" /></svg>;
}

function PulseVisual({ visual }: { visual: DiscoveryVisual }) {
  const beats = Math.max(1, Math.min(8, visual.values[0] || 4));
  const subdivisions = Math.max(1, Math.min(4, visual.values[1] || 2));
  const ticks = beats * subdivisions;
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [audioError, setAudioError] = useState('');
  const context = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const cancelled = useRef(false);

  function stop() {
    cancelled.current = true;
    cancelAnimationFrame(frame.current);
    const current = context.current;
    context.current = null;
    if (current && current.state !== 'closed') void current.close().catch(() => {});
    setPlaying(false);
    setActive(-1);
  }
  useEffect(() => () => {
    cancelled.current = true;
    cancelAnimationFrame(frame.current);
    if (context.current && context.current.state !== 'closed') void context.current.close().catch(() => {});
  }, []);

  async function play() {
    if (playing) { stop(); return; }
    setAudioError('');
    cancelled.current = false;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Audio is unavailable here. You can still explore the visual pattern.');
      const audio = new AudioContextClass();
      context.current = audio;
      await audio.resume();
      if (cancelled.current || context.current !== audio) return;
      const start = audio.currentTime + 0.08;
      const interval = 0.29;
      const total = ticks * 2;
      for (let i = 0; i < total; i++) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const time = start + i * interval;
        oscillator.frequency.value = i % subdivisions === 0 ? 420 : 710;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(i % subdivisions === 0 ? 0.055 : 0.028, time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.1);
      }
      setPlaying(true);
      const animate = () => {
        if (cancelled.current) return;
        const elapsed = audio.currentTime - start;
        if (elapsed >= total * interval) { stop(); return; }
        setActive(elapsed >= 0 ? Math.floor(elapsed / interval) % ticks : -1);
        frame.current = requestAnimationFrame(animate);
      };
      frame.current = requestAnimationFrame(animate);
    } catch (error) {
      stop();
      setAudioError(error instanceof Error ? error.message : 'Audio could not start. The visual pattern is still available.');
    }
  }

  return <div className="exp-visual exp-pulse">
    <div className="exp-visual-heading"><span>Hear the pattern</span><span>{beats} beats · {subdivisions} subdivisions</span></div>
    <div className="exp-pulse-grid" style={{ gridTemplateColumns: `repeat(${ticks}, minmax(0, 1fr))` }} aria-label={`${beats} beats, each split into ${subdivisions} equal parts`}>
      {Array.from({ length: ticks }, (_, i) => <div className={`exp-pulse-tick ${i % subdivisions === 0 ? 'is-beat' : ''} ${active === i ? 'is-playing' : ''}`} key={i}><i /><span>{visual.labels[i] || (i % subdivisions === 0 ? String(Math.floor(i / subdivisions) + 1) : '·')}</span></div>)}
    </div>
    <button className="exp-play" type="button" onClick={() => void play()} aria-pressed={playing} data-action="play-pattern"><span aria-hidden="true">{playing ? '■' : '▶'}</span>{playing ? 'Stop pattern' : 'Play pattern'}<small>Sound on · low volume</small></button>
    {audioError && <p className="exp-error" role="alert">{audioError}</p>}
  </div>;
}

function FractionVisual({ visual }: { visual: DiscoveryVisual }) {
  const numerator = Math.max(0, visual.values[0] || 0);
  const denominator = Math.max(1, Math.min(12, visual.values[1] || 4));
  const wholes = Math.min(4, Math.max(2, Math.ceil(numerator / denominator)));
  const [guides, setGuides] = useState(true);
  return <div className="exp-visual exp-fraction">
    <div className="exp-visual-heading"><span>One length, equal parts</span><button type="button" className="exp-visual-toggle" aria-pressed={guides} onClick={() => setGuides(value => !value)}>{guides ? 'Hide' : 'Show'} whole-unit guides</button></div>
    <div className="exp-fraction-wholes" style={{ gridTemplateColumns: `repeat(${wholes}, minmax(0, 1fr))` }}>
      {Array.from({ length: wholes }, (_, whole) => <div className={`exp-fraction-whole ${guides ? 'with-guides' : ''}`} key={whole}><div className="exp-fraction-parts" style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}>{Array.from({ length: denominator }, (_, part) => <span key={part} className={whole * denominator + part < numerator ? 'is-filled' : ''} />)}</div><span className="exp-fraction-label">{guides ? `${whole} → ${whole + 1}` : ' '}</span></div>)}
    </div>
    <p>{numerator} shaded pieces. Every {denominator} pieces make one whole.</p>
  </div>;
}

function MotionVisual({ visual }: { visual: DiscoveryVisual }) {
  const values = visual.values.length > 1 ? visual.values : [0, 1];
  const [sample, setSample] = useState(0);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = maximum - minimum || 1;
  const point = (value: number, index: number) => ({ x: 40 + index * 370 / (values.length - 1), y: 139 - (value - minimum) / range * 110 });
  const points = values.map(point);
  return <div className="exp-visual exp-motion">
    <div className="exp-visual-heading"><span>Position over time</span><span>Drag to inspect a sample</span></div>
    <svg viewBox="0 0 450 178" role="img" aria-label={`Positions at consecutive one-second samples: ${values.join(', ')} metres`}>
      {[0, 0.5, 1].map(fraction => <g key={fraction}><line x1="40" x2="418" y1={139 - fraction * 110} y2={139 - fraction * 110} className="exp-chart-grid" /><text x="29" y={143 - fraction * 110} textAnchor="end">{Number((minimum + range * fraction).toFixed(1))}</text></g>)}
      <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} className="exp-chart-line" />
      {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={i === sample ? 6 : 3.5} className={i === sample ? 'exp-chart-active' : 'exp-chart-dot'} /><text x={p.x} y="163" textAnchor="middle">{visual.labels[i] || `${i} s`}</text></g>)}
    </svg>
    <label className="exp-sample-slider"><span>At {visual.labels[sample] || `${sample} s`} <strong>{values[sample]} m</strong></span><input aria-label="Inspect time sample" type="range" min="0" max={values.length - 1} step="1" value={sample} onChange={event => setSample(Number(event.target.value))} /></label>
  </div>;
}

function SortingVisual({ visual }: { visual: DiscoveryVisual }) {
  const groups = Array.from(new Set(visual.labels));
  const [inspected, setInspected] = useState(-1);
  return <div className="exp-visual exp-sorting">
    <div className="exp-visual-heading"><span>Two sorted runs</span><span>Tap a value to inspect</span></div>
    {(groups.length ? groups : ['Left', 'Right']).map((group, groupIndex) => <div className="exp-sort-row" key={group}><span>{group}</span><div>{visual.values.map((value, index) => (visual.labels[index] || (index < visual.values.length / 2 ? 'Left' : 'Right')) === group ? <button type="button" key={index} onClick={() => setInspected(index)} className={`${inspected === index ? 'is-inspected' : ''} tone-${groupIndex}`} aria-pressed={inspected === index}>{value}</button> : null)}</div></div>)}
    <p>{inspected < 0 ? 'Each run is already ordered. Look at the values at the front.' : `${visual.values[inspected]} belongs to the ${visual.labels[inspected]?.toLowerCase() || 'selected'} run. The order inside each run stays fixed.`}</p>
  </div>;
}

function RelationshipVisual({ visual, revealed }: { visual: DiscoveryVisual; revealed: boolean }) {
  const [selected, setSelected] = useState(-1);
  const numeric = visual.values.length > 0 && visual.kind === 'comparison';
  const maximum = Math.max(1, ...visual.values);
  return <div className={`exp-visual exp-relationship ${numeric ? 'has-bars' : ''}`}>
    <div className="exp-visual-heading"><span>{visual.kind === 'network' ? revealed ? 'Follow the relationship' : 'Look at the organisms' : 'Compare the pieces'}</span><span>Tap to focus</span></div>
    <div className="exp-relationship-items">{(visual.labels.length ? visual.labels : visual.values.map(String)).map((label, index) => <div className="exp-relationship-piece" key={`${label}-${index}`}><button type="button" aria-pressed={selected === index} onClick={() => setSelected(selected === index ? -1 : index)} className={selected === index ? 'is-inspected' : ''}>{numeric && <i style={{ height: `${28 + (visual.values[index] || 0) / maximum * 68}px` }} aria-hidden="true" />}{numeric && <strong>{visual.values[index]}</strong>}<span>{label}</span></button>{visual.kind === 'network' && revealed && index < visual.labels.length - 1 && <Arrow />}</div>)}</div>
    {visual.kind === 'network' && <p>{revealed ? 'Arrows follow the direction of energy transfer.' : 'Use the feeding relationships in the question to work out how these organisms connect.'}</p>}
  </div>;
}

function ChallengeVisual({ visual, revealed }: { visual: DiscoveryVisual; revealed: boolean }) {
  if (visual.kind === 'pulse') return <PulseVisual visual={visual} />;
  if (visual.kind === 'fraction') return <FractionVisual visual={visual} />;
  if (visual.kind === 'motion') return <MotionVisual visual={visual} />;
  if (visual.kind === 'sorting') return <SortingVisual visual={visual} />;
  return <RelationshipVisual visual={visual} revealed={revealed} />;
}

function safeSourceUrl(raw: string) {
  try { const url = new URL(raw); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}

/** The parent owns the dialog shell and the atlas camera. This component owns one encounter. */
export function LearningExpedition(props: LearningExpeditionProps) {
  return <ExpeditionBody key={props.discovery.id} {...props} />;
}

function ExpeditionBody({ discovery, sources, learner, guideStatus, onRecordAttempt, onComplete, onClose, onFollow, onCapture, onAsk }: LearningExpeditionProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [resumeIndex] = useState(() => discoveryJourney(discovery, learner).resumeIndex);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [answerWasAssisted, setAnswerWasAssisted] = useState(false);
  const [submittedEventId, setSubmittedEventId] = useState<string | null>(null);
  const [exampleWasSeen, setExampleWasSeen] = useState(false);
  const [error, setError] = useState('');
  const [earnedNow, setEarnedNow] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [coachReply, setCoachReply] = useState<GuideReply | null>(null);
  const [coachError, setCoachError] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const assistance = useRef(new Set<string>());
  const seen = useRef(new Set<string>());
  const ownEvents = useRef(new Set<string>());
  const request = useRef<AbortController | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const challenge: DiscoveryChallenge = discovery.challenges[challengeIndex];
  const history = learner.attempts.filter(attempt => attempt.discoveryId === discovery.id);
  const earnedBefore = useRef(history.some(attempt => attempt.phase === 'transfer' && attempt.passed && !attempt.assisted));
  const currentQualified = history.some(attempt => attempt.phase === 'transfer' && attempt.passed && !attempt.assisted);
  const hasNewUnderstanding = earnedNow && currentQualified && history.some(attempt => ownEvents.current.has(attempt.id) && attempt.phase === 'transfer' && attempt.passed && !attempt.assisted);
  const stillPreviouslyEarned = currentQualified && (earnedBefore.current || history.some(attempt => !ownEvents.current.has(attempt.id) && attempt.phase === 'transfer' && attempt.passed && !attempt.assisted));
  const effectiveAnswerWasAssisted = history.find(attempt => attempt.id === submittedEventId)?.assisted ?? answerWasAssisted;
  const phase = challengeIndex === 0 ? 'probe' : 'transfer';
  const assisted = assistance.current.has(challenge.id) || history.some(attempt => attempt.challengeId === challenge.id);
  const relevantSources = sources.filter(source => discovery.sourceIds.includes(source.id));
  const guideContext = `${discovery.title}\nCurrent question: ${challenge.prompt}\n${choice ? `My current choice: ${challenge.choices.find(answer => answer.id === choice)?.label || choice}.\n` : ''}${feedback ? `The app's feedback: ${challenge.explanation}\n` : ''}My question: `;
  const guideMessageLimit = Math.max(100, Math.min(1800, 2000 - guideContext.length));
  const guideAvailable = guideStatus?.available !== false;
  const freshTransfer = discovery.challenges.findIndex((candidate, index) => index > 0 && !seen.current.has(candidate.id) && !history.some(attempt => attempt.challengeId === candidate.id));

  useEffect(() => () => { const current = request.current; request.current = null; current?.abort(); }, []);
  useEffect(() => {
    if (stage === 'probe' || stage === 'transfer') questionRef.current?.focus({ preventScroll: true });
  }, [stage, challengeIndex]);

  function record(answerId: string, supported: boolean) {
    // The parent catches up with other tabs before writing. Its canonical event
    // can therefore be assisted even when this rendered question was not.
    const next = onRecordAttempt({ discoveryId: discovery.id, challengeId: challenge.id, answerId, assisted: supported, phase });
    const canonical = next.attempts.filter(attempt => attempt.discoveryId === discovery.id && attempt.challengeId === challenge.id && attempt.answerId === answerId && attempt.phase === phase).at(-1);
    if (!canonical) throw new Error('This attempt was not returned by your learning memory. Please try again.');
    if (next.attempts.some(attempt => attempt.discoveryId === discovery.id && attempt.phase === 'transfer' && attempt.passed && !attempt.assisted && attempt.id !== canonical.id && !ownEvents.current.has(attempt.id))) earnedBefore.current = true;
    ownEvents.current.add(canonical.id);
    seen.current.add(challenge.id);
    return canonical;
  }
  function markSupport() {
    if (!assistance.current.has(challenge.id)) {
      record('', true);
      assistance.current.add(challenge.id);
    }
  }
  function showHint() {
    setError('');
    try { markSupport(); setHintCount(count => Math.min(count + 1, challenge.hints.length)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Your progress could not be saved. Please try again.'); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!choice || feedback === 'correct' || coachBusy) return;
    setError('');
    try {
      const canonical = record(choice, assisted);
      setAnswerWasAssisted(canonical.assisted);
      setSubmittedEventId(canonical.id);
      if (!canonical.passed || canonical.assisted) assistance.current.add(challenge.id);
      if (canonical.passed && phase === 'transfer' && !canonical.assisted) setEarnedNow(true);
      setFeedback(canonical.passed ? 'correct' : 'incorrect');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your attempt could not be saved. Please try again.'); }
  }
  function moveTo(index: number) {
    request.current?.abort();
    request.current = null;
    setCoachBusy(false);
    setCoachReply(null);
    setCoachError('');
    setCoachMessage('');
    setCoachOpen(false);
    setExampleWasSeen(seen.current.has(discovery.challenges[index].id) || history.some(attempt => attempt.challengeId === discovery.challenges[index].id));
    setChallengeIndex(index);
    setStage(index === 0 ? 'probe' : 'transfer');
    setChoice('');
    setFeedback(null);
    setHintCount(0);
    setAnswerWasAssisted(false);
    setSubmittedEventId(null);
    setError('');
  }
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!coachMessage.trim() || coachBusy) return;
    if (!guideAvailable) { setCoachError(guideStatus?.reason || 'The AI guide is not connected here. You can use the built-in hints to keep exploring.'); return; }
    setCoachError('');
    if (guideContext.length + coachMessage.trim().length > 2000) { setCoachError('Please shorten your question a little so it fits with this activity.'); return; }
    try { if (stage === 'probe' || stage === 'transfer') markSupport(); }
    catch (failure) { setCoachError(failure instanceof Error ? failure.message : 'Your learning history could not be updated. Please try again.'); return; }
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setCoachBusy(true);
    setCoachReply(null);
    const timer = window.setTimeout(() => controller.abort('timeout'), 90000);
    try {
      const reply = await onAsk(guideContext + coachMessage.trim(), controller.signal);
      if (request.current === controller && !controller.signal.aborted) setCoachReply(reply);
    } catch (failure) {
      if (request.current === controller) setCoachError(controller.signal.aborted ? controller.signal.reason === 'timeout' ? 'The guide took too long. You can retry, or use a hint to keep exploring.' : 'Stopped. The built-in hints are still here when you need them.' : failure instanceof Error ? failure.message : 'The guide could not reply. Please try again, or use a hint.');
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) { request.current = null; setCoachBusy(false); }
    }
  }
  function cancelGuide() { request.current?.abort(); }

  return <div className="learning-expedition" data-discovery-id={discovery.id} data-stage={stage} data-challenge-id={challenge.id} data-challenge-index={challengeIndex}>
    <div className="exp-meta"><span className="exp-subject">{discovery.subject}</span><span>{discovery.minutes} min · guided exploration</span></div>
    <ol className="exp-route" aria-label="Exploration progress">
      {['Notice', 'Try', 'Connect'].map((label, index) => <li key={label} className={(stage === 'intro' ? 0 : stage === 'probe' ? 1 : 2) === index ? 'is-current' : (stage === 'intro' ? 0 : stage === 'probe' ? 1 : 2) > index ? 'is-past' : ''}><i aria-hidden="true" />{label}</li>)}
    </ol>

    {stage === 'intro' ? <section className="exp-intro">
      <p className="exp-kicker">A question worth following</p>
      <h2>{discovery.question}</h2>
      <p className="exp-intro-summary">{discovery.summary}</p>
      <div className="exp-intro-art" aria-hidden="true"><svg viewBox="0 0 470 95"><path className="exp-art-path" d="M20 64 C80 64 62 22 129 22 S204 68 245 54 S325 9 364 27 S413 64 448 35" /><circle cx="20" cy="64" r="5" /><circle cx="129" cy="22" r="7" /><circle cx="245" cy="54" r="6" /><circle cx="364" cy="27" r="8" /><circle cx="448" cy="35" r="5" /><circle className="exp-art-halo" cx="364" cy="27" r="18" /></svg><span>One idea can open a new direction.</span></div>
      <div className="exp-insight"><span>Start here</span><p>{discovery.insight}</p></div>
      <footer className="exp-actions"><span>{resumeIndex!==null?'Your earlier answers and any support are remembered.':freshTransfer > 0 ? 'A small experiment, then a fresh example.' : 'Revisit the idea at your own pace.'}</span><button type="button" className="exp-primary" data-action="start-expedition" onClick={() => moveTo(resumeIndex??0)}>{resumeIndex!==null?'Continue where I left off':'Let’s explore'}<Arrow /></button></footer>{resumeIndex!==null&&<button type="button" className="exp-return" onClick={()=>moveTo(0)}>Revisit the starting question</button>}
    </section> : stage === 'complete' ? <section className={`exp-complete ${hasNewUnderstanding ? 'is-earned' : ''}`} aria-live="polite">
      <div className="exp-earned-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <p className="exp-kicker">{hasNewUnderstanding ? 'Understanding leaves a trace' : 'Every exploration has a place'}</p>
      <h2>{stillPreviouslyEarned ? 'A connection worth revisiting.' : hasNewUnderstanding ? 'A new piece of understanding.' : 'Explored with support.'}</h2>
      <p>{stillPreviouslyEarned ? hasNewUnderstanding ? 'You solved another fresh example independently. Your map keeps the original footprint and adds this evidence to its story.' : 'Your independent evidence stays on the map. This visit adds to the story of how you understand the idea.' : hasNewUnderstanding ? 'You worked through a fresh example without a hint. Your map can now hold that evidence as a small, lasting footprint.' : 'Hints and feedback helped you work through this idea. Your exploration is recorded; independent color comes from a fresh example you solve yourself.'}</p>
      <div className="exp-evidence-note"><span>{discovery.title}</span><strong>{hasNewUnderstanding ? 'Fresh example · independently solved' : 'Exploration saved'}</strong></div>
      {freshTransfer > 0 && !hasNewUnderstanding && <button type="button" className="exp-fresh" data-action="next-challenge" onClick={() => moveTo(freshTransfer)}>Try a fresh example without a hint<Arrow /></button>}
      {!hasNewUnderstanding && freshTransfer < 0 && !stillPreviouslyEarned && <p className="exp-fine">You’ve seen the examples in this exploration. Come back to practise, or follow another question below. Repeating a revealed answer won’t be counted as new independent evidence.</p>}
      {onCapture&&<div className="exp-capture-next"><h3>What connected for you?</h3><p>Keep the idea in your own words, or leave a question for your next visit.</p><button type="button" className="exp-secondary" data-action="capture-discovery" onClick={onCapture}>Add to my notebook<Arrow/></button></div>}
      <button type="button" className="exp-primary exp-complete-button" data-action="complete-expedition" onClick={onComplete}>See it on my map<Arrow /></button>
      {discovery.connections.length > 0 && <div className="exp-connections"><p>Follow your curiosity</p>{discovery.connections.map(connection => <button key={connection} type="button" data-action="follow-discovery" data-discovery-id={connection} onClick={() => onFollow(connection)}>{getDiscovery(connection)?.title||connection}<Arrow /></button>)}</div>}
    </section> : <section className="exp-challenge">
      <div className="exp-challenge-eyebrow"><p className="exp-kicker">{phase === 'probe' ? 'Try the idea' : exampleWasSeen ? 'Revisit with support' : 'A fresh example'}</p><span>{phase === 'probe' ? '01' : `0${challengeIndex + 1}`}</span></div>
      <h2 ref={questionRef} tabIndex={-1}>{challenge.prompt}</h2>
      <ChallengeVisual key={challenge.id} visual={challenge.visual} revealed={feedback !== null} />
      <form className="exp-answer-form" onSubmit={submit}>
        <fieldset disabled={feedback === 'correct'}><legend className="exp-sr-only">Choose your answer</legend><div className={`exp-choices ${challenge.choices.every(answer => answer.label.length <= 22) ? 'has-short-choices' : ''}`}>{challenge.choices.map((answer, index) => <label className={`exp-choice ${choice === answer.id ? 'is-selected' : ''} ${feedback === 'correct' && choice === answer.id ? 'is-correct' : ''}`} key={answer.id}><input type="radio" name={`${id}-answer`} value={answer.id} checked={choice === answer.id} onChange={() => { setChoice(answer.id); setFeedback(null); }} data-action="answer-choice" data-choice-id={answer.id} /><span className="exp-choice-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span><span>{answer.label}</span><i aria-hidden="true" /></label>)}</div></fieldset>
        {hintCount > 0 && <div className="exp-hints" aria-live="polite">{challenge.hints.slice(0, hintCount).map((hint, index) => <p key={index}><span>Hint {index + 1}</span>{hint}</p>)}</div>}
        {feedback && <div className={`exp-feedback ${feedback}`} role="status"><strong>{feedback === 'correct' ? effectiveAnswerWasAssisted ? 'That follows. You worked it through.' : 'Yes. You found the relationship.' : 'Take another look at the relationship.'}</strong><p>{challenge.explanation}</p>{feedback === 'incorrect' && <span>This example is now practice with support. A different example can show what you can do independently.</span>}</div>}
        {error && <p className="exp-error" role="alert">{error}</p>}
        <div className="exp-challenge-actions">{feedback !== 'correct' ? <><button type="button" className="exp-hint-button" data-action="request-hint" onClick={showHint} disabled={hintCount >= challenge.hints.length || coachBusy}>{hintCount === 0 ? 'A small hint' : hintCount < challenge.hints.length ? 'Another hint' : 'All hints shown'}<span aria-hidden="true">?</span></button><button type="submit" className="exp-primary" disabled={!choice || coachBusy} data-action="submit-answer">{feedback === 'incorrect' ? 'Try this answer' : 'See if it holds'}<Arrow /></button></> : <><span className="exp-support-label">{effectiveAnswerWasAssisted ? 'Worked through with support' : 'An independent attempt'}</span>{phase === 'probe' ? <button type="button" className="exp-primary" data-action="next-challenge" onClick={() => moveTo(freshTransfer > 0 ? freshTransfer : 1)}>{freshTransfer > 0 ? 'Try a fresh example' : 'Revisit an example'}<Arrow /></button> : <button type="button" className="exp-primary" data-action="next-challenge" onClick={() => setStage('complete')}>See what changed<Arrow /></button>}</>}</div>
      </form>
      <div className="exp-coach"><button type="button" className="exp-coach-toggle" aria-expanded={coachOpen} aria-controls={`${id}-coach`} onClick={() => setCoachOpen(open => !open)}><span className="exp-guide-symbol" aria-hidden="true">✧</span><span>Think it through with your guide<small>A different explanation, a connection, or a question.</small></span><span aria-hidden="true">{coachOpen ? '−' : '+'}</span></button>
        {coachOpen && <div id={`${id}-coach`} className="exp-coach-body">{!guideAvailable && <div className="exp-coach-offline" role="status"><strong>The AI guide is not connected here.</strong><p>{guideStatus?.reason || 'Your discoveries and built-in hints still work. Opening this panel does not change your learning evidence.'}</p></div>}<form onSubmit={ask}><label htmlFor={`${id}-message`}>What would help this make sense?</label><textarea id={`${id}-message`} rows={3} value={coachMessage} onChange={event => setCoachMessage(event.target.value)} maxLength={guideMessageLimit} placeholder="Connect this to something I already know…" data-action="guide-message" disabled={coachBusy || !guideAvailable} /><div className="exp-coach-actions"><span>{guideAvailable ? 'Guide help makes this a supported attempt.' : 'The small hints above are still available.'}</span>{coachBusy ? <button type="button" className="exp-secondary" onClick={cancelGuide}>Stop</button> : <button type="submit" className="exp-secondary" disabled={!coachMessage.trim() || !guideAvailable} data-action="ask-guide">Ask my guide<Arrow /></button>}</div></form>{coachBusy && <p className="exp-guide-wait" role="status"><i />Your guide is thinking through the idea…</p>}{coachError && <p className="exp-error" role="alert">{coachError}</p>}{coachReply && <div className="exp-guide-reply" aria-live="polite"><span>{coachReply.mode === 'local' ? 'Local AI guide' : coachReply.mode === 'cloud' ? 'AI guide' : 'Built-in guide'}</span><p>{coachReply.text}</p>{coachReply.warning && <small>{coachReply.warning}</small>}{coachReply.sourceIds.length > 0 && <div className="exp-guide-sources">{sources.filter(source => coachReply.sourceIds.includes(source.id)).map(source => safeSourceUrl(source.url) ? <a key={source.id} href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : null)}</div>}</div>}</div>}
      </div>
    </section>}
    {relevantSources.length > 0 && <details key={`${stage}-${challenge.id}`} className="exp-sources" onToggle={event => { if (event.currentTarget.open && (stage === 'probe' || stage === 'transfer') && feedback !== 'correct') { try { markSupport(); } catch (failure) { event.currentTarget.open = false; setError(failure instanceof Error ? failure.message : 'Your learning history could not be updated.'); } } }}><summary>Explore the sources<span>{relevantSources.length} references</span></summary><div>{relevantSources.map(source => <article key={source.id}>{safeSourceUrl(source.url) ? <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true">↗</span></a> : <strong>{source.title}</strong>}<p>{source.excerpt}</p></article>)}</div></details>}
    {stage !== 'complete' && <button type="button" className="exp-return" onClick={onClose}>Return to the map</button>}
  </div>;
}
