import { useState, type ReactNode } from 'react';
import type { SourceBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from './ui';

// A primary source with tappable marginalia. Marks are written inline in the
// pack as [[phrase|noteId]], so a generator only has to choose phrases and notes.

function marked(text: string, open: Set<string>, toggle: (id: string) => void): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\[\[(.+?)\|(.+?)\]\]/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    parts.push(text.slice(last, m.index));
    const id = m[2];
    parts.push(
      // A span keeps the phrase inside the sentence's line flow; buttons can't wrap inline.
      <span key={id} role="button" tabIndex={0} className={`mark${open.has(id) ? ' is-open' : ''}`} aria-expanded={open.has(id)}
        onClick={() => toggle(id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); } }}>{m[1]}</span>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export function Source({ beat }: { beat: SourceBeat }) {
  const { done } = useBeat();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <section className="beat">
      <header className="source-head">
        <h2>{beat.source.title}</h2>
        <p>{beat.source.detail} · <a href={beat.source.page} target="_blank" rel="noreferrer">Read the original</a></p>
      </header>
      <div className="manuscript">
        {beat.passage.map((para, i) => {
          const ids = [...para.matchAll(/\[\[.+?\|(.+?)\]\]/g)].map(m => m[1]).filter(id => open.has(id));
          return (
            <div key={i} className="manuscript__para">
              <p className={i === 0 ? 'has-initial' : ''}>{marked(para, open, toggle)}</p>
              {ids.map(id => <aside key={id} className="gloss">{beat.notes[id]}</aside>)}
            </div>
          );
        })}
      </div>
      <Question gradeId={beat.gradeId} transfer={beat.transfer} prompt={beat.question.prompt}
        choices={beat.question.choices} answer={beat.question.answer} explain={beat.question.explain} onDone={done} />
    </section>
  );
}
