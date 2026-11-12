import { useId, useState, type FormEvent } from 'react';
import './stuck.css';

/** One optional line at the end of an expedition or a passed check. Kept in the library. */
export function StuckLine({ onKeep, initial = '' }: { onKeep: (line: string) => string | null; initial?: string }) {
  const [line, setLine] = useState(initial);
  const [kept, setKept] = useState(initial);
  const [error, setError] = useState('');
  const id = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = line.trim().replace(/\s+/g, ' ');
    if (!text) return;
    const problem = onKeep(text);
    if (problem) setError(problem); else { setKept(text); setError(''); }
  };
  if (kept && kept === line.trim().replace(/\s+/g, ' ')) {
    return <div className="stuck is-kept" data-stuck="kept">
      <blockquote>{kept}</blockquote>
      <button type="button" onClick={() => setKept('')} data-action="stuck-edit">Edit</button>
    </div>;
  }
  return <form className="stuck" onSubmit={submit} data-stuck="">
    <label htmlFor={id} className="sr-only">What stuck with you?</label>
    <input id={id} type="text" maxLength={160} value={line} onChange={event => setLine(event.target.value)} placeholder="What stuck with you?" enterKeyHint="done" autoComplete="off" data-action="stuck-input" />
    {line.trim() && <button type="submit" data-action="stuck-keep">Keep</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
