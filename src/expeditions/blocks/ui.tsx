import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Choice, Confidence } from '../content/types';
import { CONFIDENCE, useBeat } from '../engine/context';

export function Credit({ media }: { media: string }) {
  const { media: get } = useBeat();
  const m = get(media);
  return <a className="credit" href={m.page} target="_blank" rel="noreferrer">{m.credit}</a>;
}

export function Choices({ choices, value, onPick, locked, answer, columns }: {
  choices: Choice[]; value: string | null; onPick: (id: string) => void; locked?: boolean; answer?: string | null; columns?: boolean;
}) {
  return (
    <div className={`choices${columns ? ' choices--row' : ''}`} role="radiogroup">
      {choices.map(choice => {
        const state = locked && answer
          ? choice.id === answer ? 'right' : choice.id === value ? 'wrong' : 'idle'
          : choice.id === value ? 'picked' : 'idle';
        return (
          <button key={choice.id} type="button" role="radio" aria-checked={choice.id === value}
            className={`choice choice--${state}`} disabled={locked} onClick={() => onPick(choice.id)}>
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

/** Appears once an answer is chosen. Picking a confidence commits the answer. */
export function Confident({ onCommit, label = 'How sure are you?' }: { onCommit: (c: Confidence) => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, []);
  return (
    <div ref={ref} className="confidence">
      <span>{label}</span>
      <div>
        {CONFIDENCE.map(c => <button key={c.id} type="button" onClick={() => onCommit(c.id)}>{c.label}</button>)}
      </div>
    </div>
  );
}

export function Verdict({ correct, children, title }: { correct: boolean | null; children?: ReactNode; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, []);
  return (
    <div ref={ref} className={`verdict verdict--${correct === null ? 'neutral' : correct ? 'right' : 'wrong'}`} role="status">
      <strong>{title ?? (correct === null ? 'Locked in' : correct ? 'Right' : 'Not quite')}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

/** One choice + confidence + verdict. Shared by sources, sims and simple questions. */
export function Question({ gradeId, transfer, prompt, choices, answer, explain, columns, onDone }: {
  gradeId: string; transfer?: boolean; prompt: string; choices: Choice[]; answer: string; explain?: ReactNode; columns?: boolean; onDone?: () => void;
}) {
  const { record, evidenceFor } = useBeat();
  const prior = evidenceFor(gradeId);
  const [pick, setPick] = useState<string | null>(prior ? choices.find(c => c.label === prior.chosen)?.id ?? null : null);
  const [locked, setLocked] = useState(!!prior);
  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId, transfer: !!transfer, correct: pick === answer, confidence, prompt, chosen: choices.find(c => c.id === pick)!.label });
    setLocked(true);
    onDone?.();
  };
  return (
    <div className="question">
      <p className="question__prompt">{prompt}</p>
      <Choices choices={choices} value={pick} onPick={setPick} locked={locked} answer={locked ? answer : null} columns={columns} />
      {pick && !locked && <Confident onCommit={commit} />}
      {locked && (
        <Verdict correct={pick === answer}>
          {pick !== answer && choices.find(c => c.id === pick)?.feedback && <p className="feedback">{choices.find(c => c.id === pick)!.feedback}</p>}
          {typeof explain === 'string' ? <p>{explain}</p> : explain}
        </Verdict>
      )}
    </div>
  );
}

export function PlayButton({ onClick, label = 'Play' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="play" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor" /></svg>
      <span>{label}</span>
    </button>
  );
}
