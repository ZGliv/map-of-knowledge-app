import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { createRandom } from '../spatial/deterministic';
import { territoryColor } from '../core/territoryTheme';
import { CONFIDENCE } from '../expeditions/engine/context';
import type { Confidence } from '../expeditions/content/types';
import type { ExpeditionLedger } from '../expeditions/ledger';
import { getExpedition } from '../expeditions/registry';
import { scrambled } from '../expeditions/blocks/exercises';
import { bankFor } from './banks';
import { seeded, type DrawnItem } from './draw';
import { checkVariant } from './generators';
import { describe, grade } from './grade';
import type { CheckEvent, CheckLedger } from './ledger';
import { checkSessions, nodeProgress, startCheck, type CheckStatus } from './progress';
import { CHECK_POLICY, type MissReason } from './rule';
import { StuckLine } from '../notebook/StuckLine';
import { attemptEvent, finishEvent, newId } from './session';
import type { CheckAnswer, ChoiceItem, FlawItem, MatchItem, NumberItem, OrderItem } from './types';
import './check.css';

export interface CheckScreenProps {
  nodeId: string;
  exp: ExpeditionLedger;
  checks: CheckLedger;
  now: number;
  /** Where the last button returns to, e.g. "New species". */
  exitLabel: string;
  onRecord: (events: CheckEvent[]) => void;
  onExit: () => void;
  onOpenExpedition: (packId: string) => void;
  /** Keep the optional "what stuck" line after a pass. Returns an error, or null. */
  onStuck?: (check: { session: string; nodeId: string; line: string }) => string | null;
}

const DAY = 24 * 60 * 60 * 1000;
const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

/** A still sky, painted once: the atlas's world-view stars, far behind the question. */
function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = w * ratio; canvas.height = h * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      const random = createRandom('map-of-knowledge/check-sky');
      for (let i = 0; i < Math.round((w * h) / 4200); i++) {
        const tint = random();
        ctx.fillStyle = `rgba(${tint < .7 ? '236,241,255' : tint < .9 ? '200,216,255' : '255,236,214'},${(.06 + random() ** 1.8 * .4).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(random() * w, random() * h, .3 + random() * .7, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, []);
  return <canvas ref={ref} className="check-sky" aria-hidden="true" />;
}

// The patch of map this idea owns, its neighbours dim; the same figure as the expedition payoff.
function hex(cx: number, cy: number, r: number, seed: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    const wobble = 1 + 0.07 * Math.sin(seed * 12.9898 + k * 78.233);
    return `${(cx + Math.cos(a) * r * wobble).toFixed(1)},${(cy + Math.sin(a) * r * wobble).toFixed(1)}`;
  }).join(' ');
}
function Patch({ label, state }: { label: string; state: 'dim' | 'lit' | 'lasting' }) {
  const r = 30, d = Math.sqrt(3) * r;
  const [lit, setLit] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => setLit(true), 300); return () => window.clearTimeout(id); }, []);
  return (
    <svg className={`check-patch is-${state}${lit ? ' is-on' : ''}`} viewBox="70 40 260 156" role="img" aria-label={`${label}: ${state === 'dim' ? 'not yet colored' : state === 'lasting' ? 'Lasting' : 'Understood'}`}>
      {Array.from({ length: 6 }, (_, k) => <polygon key={k} points={hex(200 + Math.cos((k * Math.PI) / 3) * d, 118 + Math.sin((k * Math.PI) / 3) * d, r - 2, k + 1)} className="check-patch__cell" />)}
      <polygon points={hex(200, 118, r - 2, 0)} className="check-patch__home" />
      {state === 'lasting' && <circle cx="200" cy="118" r="7" className="check-patch__core" />}
    </svg>
  );
}

function Options({ items, value, onPick, marker }: { items: { id: string; label: string }[]; value: string | null; onPick: (id: string) => void; marker: 'ring' | 'letter' }) {
  return (
    <ul className={`check-options is-${marker}`} role="radiogroup">
      {items.map((option, i) => (
        <li key={option.id}>
          <button type="button" role="radio" aria-checked={value === option.id} className={value === option.id ? 'is-picked' : ''} onClick={() => onPick(option.id)}>
            <i aria-hidden="true">{marker === 'letter' ? String.fromCharCode(97 + i) : ''}</i>
            <span>{option.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ChoiceView({ item, seed, value, onChange }: { item: ChoiceItem; seed: string; value: CheckAnswer | null; onChange: (a: CheckAnswer | null) => void }) {
  // Shuffled per check, so the key's position tells nothing.
  const options = useMemo(() => {
    const random = seeded(`${seed}:${item.id}`);
    return [...item.options].map(o => ({ o, k: random() })).sort((a, b) => a.k - b.k).map(({ o }) => o);
  }, [item, seed]);
  return <Options items={options} value={value && 'pick' in value ? value.pick : null} onPick={pick => onChange({ pick })} marker="ring" />;
}

function FlawView({ item, value, onChange }: { item: FlawItem; value: CheckAnswer | null; onChange: (a: CheckAnswer | null) => void }) {
  return <Options items={item.steps.map(s => ({ id: s.id, label: s.text }))} value={value && 'pick' in value ? value.pick : null} onPick={pick => onChange({ pick })} marker="letter" />;
}

function OrderView({ item, value, onChange }: { item: OrderItem; value: CheckAnswer | null; onChange: (a: CheckAnswer | null) => void }) {
  const seq = value && 'seq' in value ? value.seq : [];
  const pool = useMemo(() => scrambled(item.items, item.answer, item.id), [item]);
  const label = (id: string) => item.items.find(i => i.id === id)!.label;
  const set = (next: string[]) => onChange({ seq: next });
  return (
    <div className="check-order">
      <p className="check-order__end">{item.ends[0]}</p>
      <ol className="check-order__placed">
        {seq.map((id, i) => (
          <li key={id}><button type="button" onClick={() => set(seq.filter(x => x !== id))} aria-label={`${label(id)}, place ${i + 1}. Remove`}><b>{i + 1}</b><span>{label(id)}</span></button></li>
        ))}
        {Array.from({ length: item.items.length - seq.length }, (_, i) => <li key={`empty-${i}`} className="is-empty"><b>{seq.length + i + 1}</b></li>)}
      </ol>
      <p className="check-order__end">{item.ends[1]}</p>
      {seq.length < item.items.length && (
        <ul className="check-order__pool">
          {pool.filter(i => !seq.includes(i.id)).map(i => <li key={i.id}><button type="button" onClick={() => set([...seq, i.id])}>{i.label}</button></li>)}
        </ul>
      )}
    </div>
  );
}

function MatchView({ item, value, onChange }: { item: MatchItem; value: CheckAnswer | null; onChange: (a: CheckAnswer | null) => void }) {
  const pairs = value && 'pairs' in value ? value.pairs : {};
  const assign = (left: string, right: string) => {
    // One-to-one unless the labels are buckets several items can share.
    const kept = item.buckets ? pairs : Object.fromEntries(Object.entries(pairs).filter(([, r]) => r !== right));
    onChange({ pairs: { ...kept, [left]: right } });
  };
  return (
    <ul className={`check-match${item.buckets ? ' is-buckets' : ''}`}>
      {item.left.map(l => (
        <li key={l.id}>
          <p>{l.label}</p>
          <div role="radiogroup" aria-label={l.label}>
            {item.right.map(r => (
              <button key={r.id} type="button" role="radio" aria-checked={pairs[l.id] === r.id} className={pairs[l.id] === r.id ? 'is-picked' : ''} onClick={() => assign(l.id, r.id)}>{r.label}</button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function NumberView({ item, variant, value, onChange }: { item: NumberItem; variant: number; value: CheckAnswer | null; onChange: (a: CheckAnswer | null) => void }) {
  const v = useMemo(() => checkVariant(item, variant), [item, variant]);
  const [text, setText] = useState(value && 'value' in value ? String(value.value) : '');
  return (
    <label className="check-number">
      <span className="sr-only">Your answer in {v.unit}</span>
      <input inputMode="decimal" autoComplete="off" value={text} placeholder="0" onChange={e => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(/,/g, '').replace(/\s/g, ''));
        onChange(e.target.value.trim() !== '' && Number.isFinite(n) ? { value: n } : null);
      }} />
      <span className="check-number__unit">{v.unit}</span>
    </label>
  );
}

const promptOf = (d: DrawnItem) => d.entry.item.kind === 'number' ? checkVariant(d.entry.item, d.variant).prompt : d.entry.item.prompt;
const complete = (d: DrawnItem, a: CheckAnswer | null) => {
  if (!a) return false;
  const item = d.entry.item;
  if (item.kind === 'order') return 'seq' in a && a.seq.length === item.items.length;
  if (item.kind === 'match') return 'pairs' in a && item.left.every(l => a.pairs[l.id]);
  return true;
};

const MISS_LINES: Record<MissReason, string> = {
  'transfer-missed': 'A new situation went the wrong way.',
  'too-many-missed': 'Too few answers were right this time.',
  guessed: 'Right answers marked as guesses can’t count.',
  'sure-misconception': 'One answer you were certain of is a common mix-up.',
};

interface Given { drawn: DrawnItem; answer: CheckAnswer; confidence: Confidence }

/** One reason, the most useful first. */
const REASON_ORDER: MissReason[] = ['sure-misconception', 'guessed', 'too-many-missed', 'transfer-missed'];

/** The key for one answer, kept short: a numbered list for an order, only the wrong pairs for a match. */
function Key({ given }: { given: Given }) {
  const { item } = given.drawn.entry;
  const right = grade(item, given.answer, given.drawn.variant);
  if (item.kind === 'order') {
    return right ? null : <ol className="check-review__list">{item.answer.map(id => <li key={id}>{item.items.find(i => i.id === id)!.label}</li>)}</ol>;
  }
  if (item.kind === 'match') {
    const pairs = 'pairs' in given.answer ? given.answer.pairs : {};
    const label = (id?: string) => item.right.find(r => r.id === id)?.label ?? '–';
    const wrong = item.left.filter(l => pairs[l.id] !== item.pairs[l.id]);
    return wrong.length ? <ul className="check-review__list">{wrong.map(l => <li key={l.id}>{l.label}: <b>{label(item.pairs[l.id])}</b>, not {label(pairs[l.id])}</li>)}</ul> : null;
  }
  const words = describe(item, given.answer, given.drawn.variant);
  const flaw = item.kind === 'flaw';
  return <>{!right && <p><b>{flaw ? 'You picked' : 'You said'}</b> {words.given}</p>}<p><b>{flaw ? 'The broken step' : right ? 'Your answer' : 'Answer'}</b> {words.key}</p></>;
}

function Unavailable({ status, title, packId, exitLabel, onExit, onOpenExpedition, understoodAt }: { status: CheckStatus; title: string; packId: string; exitLabel: string; understoodAt: string | null } & Pick<CheckScreenProps, 'onExit' | 'onOpenExpedition'>) {
  const pack = getExpedition(packId)?.pack;
  const line = status.kind === 'waiting' ? `${understoodAt ? `Proved ${shortDate(understoodAt)}. ` : ''}You can try again on ${longDate(status.dueAt)}.`
    : status.kind === 'cooling' ? `You can try again on ${longDate(status.readyAt)}.`
      : status.kind === 'lasting' ? `Lasting since ${shortDate(status.at)}.${status.refreshAt ? ` You can try again on ${longDate(status.refreshAt)}.` : ''}`
        : status.kind === 'exhausted' ? 'You’ve worked through everything written for this idea so far.'
          : 'Nothing to try here yet.';
  return (
    <section className="check-stage check-intro">
      <Patch label={title} state={status.kind === 'lasting' ? 'lasting' : status.kind === 'waiting' ? 'lit' : 'dim'} />
      <h1>{title}</h1>
      <p className="check-line">{line}</p>
      <div className="check-actions">
        <button type="button" className="check-primary" onClick={onExit} data-action="check-exit">Back to {exitLabel}</button>
        {status.kind === 'cooling' && pack && <button type="button" className="check-secondary" onClick={() => onOpenExpedition(packId)}>Replay {pack.title}</button>}
      </div>
    </section>
  );
}

/** The question-bank way to prove a place (the fallback to new cases): a few fresh problems, no hints, no going back, a confidence tap on each. */
export function CheckScreen({ nodeId, exp, checks, now, exitLabel, onRecord, onExit, onOpenExpedition, onStuck }: CheckScreenProps) {
  const bank = bankFor(nodeId)!;
  const [session] = useState(newId);
  // Drawn once when the screen opens; answers given now can't reshuffle the questions.
  const [start] = useState(() => startCheck(nodeId, exp, checks, now, session));
  const [phase, setPhase] = useState<'intro' | 'asking' | 'done'>('intro');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<CheckAnswer | null>(null);
  const [given, setGiven] = useState<Given[]>([]);
  const shownAt = useRef(0);
  const shell = useRef<HTMLDivElement>(null);
  const items = start.items;
  const color = territoryColor(nodeId);
  const pack = getExpedition(bank.pack)?.pack;

  useEffect(() => {
    const previous = document.title;
    const opener = document.activeElement as HTMLElement | null;
    document.title = `Prove it: ${bank.title} · Map of Knowledge`;
    shell.current?.focus({ preventScroll: true });
    return () => { document.title = previous; opener?.focus?.({ preventScroll: true }); };
  }, [bank.title]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onExit]);
  useEffect(() => { shownAt.current = performance.now(); shell.current?.scrollTo({ top: 0 }); }, [index, phase]);

  const commit = useCallback((confidence: Confidence) => {
    if (!items || !answer) return;
    const drawn = items[index];
    const when = new Date().toISOString();
    const events: CheckEvent[] = [attemptEvent({ session, node: nodeId, drawn, answer, confidence, ms: performance.now() - shownAt.current, at: when })];
    const last = index === items.length - 1;
    if (last) events.push(finishEvent({ session, node: nodeId, items, at: when }));
    // Written before anything is revealed; nothing here can be taken back.
    onRecord(events);
    setGiven(list => [...list, { drawn, answer, confidence }]);
    setAnswer(null);
    if (last) setPhase('done'); else setIndex(i => i + 1);
  }, [items, answer, index, session, nodeId, onRecord]);

  const style = { '--check-color': color } as CSSProperties;
  const progress = nodeProgress(nodeId, exp, checks);
  let body;
  if (!items) {
    body = <Unavailable status={start.status} title={bank.title} packId={bank.pack} exitLabel={exitLabel} onExit={onExit} onOpenExpedition={onOpenExpedition} understoodAt={progress.understoodAt} />;
  } else if (phase === 'intro') {
    body = (
      <section className="check-stage check-intro">
        <Patch label={bank.title} state={progress.understoodAt ? 'lit' : 'dim'} />
        <h1>{bank.title}</h1>
        <p className="check-claim">{bank.claim}</p>
        <p className="check-meta">{items.length} problems · about {items.length > 3 ? 3 : 2} minutes</p>
        <div className="check-actions">
          <button type="button" className="check-primary" onClick={() => setPhase('asking')} data-action="check-begin">Begin</button>
        </div>
      </section>
    );
  } else if (phase === 'asking') {
    const drawn = items[index];
    const item = drawn.entry.item;
    const ready = complete(drawn, answer);
    body = (
      <section className="check-stage check-question" key={index} data-check-item={item.id} data-check-kind={item.kind} data-check-variant={drawn.variant}>
        <h2 className="check-prompt">{promptOf(drawn)}</h2>
        {item.kind === 'choice' && <ChoiceView item={item} seed={session} value={answer} onChange={setAnswer} />}
        {item.kind === 'flaw' && <FlawView item={item} value={answer} onChange={setAnswer} />}
        {item.kind === 'order' && <OrderView item={item} value={answer} onChange={setAnswer} />}
        {item.kind === 'match' && <MatchView item={item} value={answer} onChange={setAnswer} />}
        {item.kind === 'number' && <NumberView item={item} variant={drawn.variant} value={answer} onChange={setAnswer} />}
        <div className={`check-sure${ready ? ' is-ready' : ''}`} aria-hidden={!ready}>
          <p>How sure are you?</p>
          <div>{CONFIDENCE.map(c => <button key={c.id} type="button" disabled={!ready} onClick={() => commit(c.id)} data-confidence={c.id}>{c.label}</button>)}</div>
        </div>
      </section>
    );
  } else {
    body = <Result nodeId={nodeId} session={session} given={given} checks={checks} exp={exp} purpose={start.status.kind === 'ready' ? start.status.purpose : 'prove'} exitLabel={exitLabel} onExit={onExit} onOpenExpedition={onOpenExpedition} packTitle={pack?.title} onStuck={onStuck} />;
  }

  return createPortal(
    <div ref={shell} className="check-shell" role="dialog" aria-modal="true" aria-label={`Prove it: ${bank.title}`} tabIndex={-1} style={style} data-check-node={nodeId} data-check-phase={items ? phase : start.status.kind}>
      <Sky />
      <header className="check-bar">
        <button type="button" className="check-close" aria-label={`Back to ${exitLabel}`} onClick={onExit} data-action="check-close">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <p className="check-bar__place">{bank.title}</p>
        {items && <ol className="check-ticks" aria-label={phase === 'asking' ? `Problem ${index + 1} of ${items.length}` : undefined}>
          {items.map((_, i) => <li key={i} className={phase === 'done' || i < index ? 'is-done' : phase === 'asking' && i === index ? 'is-now' : ''} />)}
        </ol>}
      </header>
      <main className="check-main">{body}</main>
    </div>,
    document.body,
  );
}

function Result({ nodeId, session, given, checks, exp, purpose, exitLabel, onExit, onOpenExpedition, packTitle, onStuck }: {
  nodeId: string; session: string; given: Given[]; checks: CheckLedger; exp: ExpeditionLedger; purpose: 'prove' | 'lasting' | 'refresh'; exitLabel: string; packTitle?: string;
} & Pick<CheckScreenProps, 'onExit' | 'onOpenExpedition' | 'onStuck'>) {
  const bank = bankFor(nodeId)!;
  // The verdict comes from the stored record, judged the same way the map judges it.
  const stored = checkSessions(checks).find(s => s.session === session);
  const passed = stored?.verdict.passed ?? false;
  const reasons = stored?.verdict.reasons ?? [];
  const progress = nodeProgress(nodeId, exp, checks);
  const lasting = passed && purpose === 'lasting' && !!progress.lastingAt;
  // A refresh re-lights the glow; the color was never in question.
  const refreshed = passed && purpose === 'refresh';
  const readyAt = stored ? new Date(Date.parse(stored.at) + CHECK_POLICY.retryAfterDays * DAY).toISOString() : null;
  const sure = given.filter(g => g.confidence !== 'guess');
  const sureRight = sure.filter(g => grade(g.drawn.entry.item, g.answer, g.drawn.variant)).length;
  return (
    <section className={`check-stage check-result ${passed ? 'is-passed' : 'is-missed'}`} data-check-result={passed ? (lasting ? 'lasting' : refreshed ? 'refreshed' : 'passed') : 'missed'}>
      <Patch label={bank.title} state={lasting || refreshed ? 'lasting' : passed || progress.understoodAt ? 'lit' : 'dim'} />
      <h1>{lasting ? 'Lasting' : refreshed ? 'Fresh again' : passed ? 'Understood' : 'Not yet'}</h1>
      <p className="check-line">
        {lasting ? `A week on, ${bank.title} is still yours.` : refreshed ? `${bank.title} glows on your map again.` : passed ? `${bank.title} is colored on your map.` : progress.understoodAt ? `${bank.title} stays colored on your map.` : 'Nothing you’ve earned is lost.'}
        {!passed && readyAt && ` You can try again on ${longDate(readyAt)}.`}
      </p>
      {!passed && reasons.length > 0 && <p className="check-reason">{MISS_LINES[REASON_ORDER.find(r => reasons.includes(r))!]}</p>}
      <p className="check-claim">{bank.claim}</p>
      {passed && onStuck && <StuckLine onKeep={line => onStuck({ session, nodeId, line })} />}

      <h2 className="check-review__title">{passed ? 'What you proved' : 'Your answers'}</h2>
      <ul className="check-review">
        {given.map(g => {
          const { item } = g.drawn.entry;
          const right = grade(item, g.answer, g.drawn.variant);
          const working = item.kind === 'number' ? checkVariant(item, g.drawn.variant).working : null;
          return (
            <li key={item.id} className={right ? 'is-right' : 'is-wrong'} data-review-item={item.id}>
              <details open={!right}>
                <summary>
                  <span className="check-review__mark">{right ? (g.confidence === 'guess' ? 'Right, guessed' : 'Right') : 'Missed'}</span>
                  <span className="check-review__claim">{item.claim}</span>
                </summary>
                <div className="check-review__body">
                  {item.kind === 'number' && <p className="check-review__prompt">{promptOf(g.drawn)}</p>}
                  <Key given={g} />
                  {working && <p className="check-review__working">{working}</p>}
                  <p>{item.explain}</p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="check-calibration">{sure.length ? `When you felt sure, you were right ${sureRight} of ${sure.length} times.` : 'You marked every answer as a guess.'}</p>

      <div className="check-actions">
        <button type="button" className="check-primary" onClick={onExit} data-action="check-done">Back to {exitLabel}</button>
        {!passed && packTitle && <button type="button" className="check-secondary" onClick={() => onOpenExpedition(bank.pack)} data-action="check-replay">Replay {packTitle}</button>}
      </div>
    </section>
  );
}
