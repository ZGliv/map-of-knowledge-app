import { useEffect, useRef, useState } from 'react';
import type { Confidence, DialogueBeat, DialogueChoicePoint, DialogueLine } from '../content/types';
import { useBeat } from '../engine/context';
import { Confident } from './ui';

// A primary source, staged as a conversation. The learner takes one part and
// has to supply that character's moves before the real text answers back.

type Shown =
  | { type: 'line'; line: DialogueLine }
  | { type: 'pick'; point: DialogueChoicePoint; choice: string; correct: boolean };

const isPoint = (item: DialogueBeat['script'][number]): item is DialogueChoicePoint => 'gradeId' in item;

export function Dialogue({ beat }: { beat: DialogueBeat }) {
  const { record, done } = useBeat();
  const [cursor, setCursor] = useState(0);
  const [shown, setShown] = useState<Shown[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const queue = useRef<DialogueLine[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const item = beat.script[cursor];
  const waiting = item && isPoint(item) && queue.current.length === 0 && !typing;

  // Reveal scripted lines one at a time, paced by the length of the last line.
  useEffect(() => {
    let id = 0;
    const later = (ms: number, act: () => void) => {
      setTyping(true);
      id = window.setTimeout(() => { act(); setTyping(false); }, ms);
    };
    const last = shown[shown.length - 1];
    const reading = last?.type === 'line' ? Math.min(4200, 900 + last.line.text.length * 22) : 650;
    if (queue.current.length) {
      const next = queue.current[0];
      later(650, () => { queue.current.shift(); setShown(s => [...s, { type: 'line', line: next }]); });
    } else if (!item) {
      done();
    } else if (!isPoint(item)) {
      later(shown.length === 0 ? 300 : reading, () => { setShown(s => [...s, { type: 'line', line: item }]); setCursor(c => c + 1); });
    }
    return () => { window.clearTimeout(id); };
    // Re-plan only when the conversation itself moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, shown.length]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [shown.length, pending, waiting]);

  const commit = (point: DialogueChoicePoint, confidence: Confidence) => {
    if (!pending) return;
    const choice = point.choices.find(c => c.id === pending)!;
    const correct = pending === point.answer;
    record({ gradeId: point.gradeId, transfer: !!point.transfer, correct, confidence, prompt: point.ask, chosen: choice.label });
    setShown(s => [...s, { type: 'pick', point, choice: choice.label, correct }]);
    queue.current.push(...point.then);
    setPending(null);
    setCursor(c => c + 1);
  };

  const showAll = () => {
    // Fast-forward narration only; choice points still wait for the learner.
    const add: Shown[] = queue.current.splice(0).map(line => ({ type: 'line', line }));
    let c = cursor;
    while (beat.script[c] && !isPoint(beat.script[c])) { add.push({ type: 'line', line: beat.script[c] as DialogueLine }); c++; }
    setShown(s => [...s, ...add]); setCursor(c); setTyping(false);
  };

  return (
    <section className="beat">
      <header className="source-head">
        <h2>{beat.source.title}</h2>
        <p>{beat.source.detail} · <a href={beat.source.page} target="_blank" rel="noreferrer">Read the original</a></p>
        <ul className="cast">
          {Object.entries(beat.cast).map(([id, c]) => (
            <li key={id} className={id === beat.learner ? 'is-you' : ''}><b>{c.name}</b> {c.note}</li>
          ))}
        </ul>
      </header>
      <div className="thread">
        {shown.map((s, i) => s.type === 'line' ? (
          <div key={i} className={`bubble${s.line.who === beat.learner ? ' bubble--you' : ''}`}>
            <span className="bubble__who">{beat.cast[s.line.who]?.name ?? s.line.who}{s.line.who === beat.learner && shown[i - 1]?.type === 'pick' ? ' · the real reply' : ''}</span>
            <p>{s.line.text}</p>
          </div>
        ) : (
          <div key={i} className={`bubble bubble--you bubble--pick ${s.correct ? 'is-right' : 'is-wrong'}`}>
            <span className="bubble__who">{s.point.ask} {s.correct ? '· yes' : '· not where it goes'}</span>
            <p>{s.choice}</p>
          </div>
        ))}
        {typing && <div className="typing" aria-label="typing"><i /><i /><i /></div>}
        {waiting && isPoint(item) && (
          <div className="reply">
            <p className="reply__ask">{item.ask}</p>
            <div className="reply__options">
              {item.choices.map(c => (
                <button key={c.id} type="button" className={pending === c.id ? 'is-picked' : ''} onClick={() => setPending(c.id)}>{c.label}</button>
              ))}
            </div>
            {pending && <Confident onCommit={c => commit(item, c)} />}
          </div>
        )}
        <div ref={end} />
      </div>
      {item && !isPoint(item) && <button type="button" className="text-button" onClick={showAll}>Show the next lines now</button>}
    </section>
  );
}
