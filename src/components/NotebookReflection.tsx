import { useId, useState, type FormEvent } from 'react';
import type { NotebookEntry } from '../core/notebook';

export interface NotebookReflectionProps {
  entry: NotebookEntry;
  onSave: (reflection: string) => void;
  onClose: () => void;
}

function safeSourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}

/** Reflection body only. The parent supplies the dialog and preserves the original note on save. */
export function NotebookReflection({ entry, onSave, onClose }: NotebookReflectionProps) {
  const [reflection, setReflection] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const sourceUrl = safeSourceUrl(entry.sourceUrl);
  const sourceLabel = entry.sourceLabel || (sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : '');

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reflection.trim() || !revealed) return;
    setError('');
    try { onSave(reflection.trim()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Your reflection could not be saved. Please try again.'); }
  }

  return (
    <form className="recall-workspace" onSubmit={save}>
      <header className="recall-header">
        <p className="recall-kicker">A moment to revisit</p>
        <h2>What stayed with you?</h2>
        <p>{entry.kind === 'question' ? 'Take another look at the question. What is your best answer now, and what still feels uncertain?' : 'Before looking back, explain the idea in your own words. What do you remember, and where does it get fuzzy?'}</p>
      </header>
      <div className="recall-subject">
        <span>{entry.kind === 'question' ? 'Your question' : 'The idea you kept'}</span>
        <h3>{entry.title}</h3>
      </div>
      <div className="recall-field">
        <label htmlFor={`${id}-reflection`}>Your reflection</label>
        <textarea id={`${id}-reflection`} className="recall-textarea" rows={6} value={reflection} onChange={event => setReflection(event.target.value)} maxLength={5000} placeholder={entry.kind === 'question' ? 'I think… I still wonder…' : 'The way I would explain it now…'} data-action="reflection-body"/>
        <p className="recall-hint">A few honest sentences are enough. You can keep writing after you compare.</p>
      </div>

      {!revealed ? (
        <button type="button" className="recall-compare" aria-controls={`${id}-original`} aria-expanded={false} onClick={() => setRevealed(true)} data-action="reveal-note">Compare with your note<span aria-hidden="true">↓</span></button>
      ) : (
        <section id={`${id}-original`} className="recall-original" aria-label="Your original note" aria-live="polite">
          <p className="recall-kicker">Your original note</p>
          <h3>{entry.title}</h3>
          {entry.body ? <p className="recall-original-body" style={{ whiteSpace: 'pre-wrap' }}>{entry.body}</p> : <p className="recall-original-empty">You saved this {entry.kind === 'question' ? 'question' : 'idea'} without additional notes.</p>}
          {sourceLabel && (sourceUrl ? <a className="recall-source" href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel}<span aria-hidden="true">↗</span></a> : <span className="recall-source">{sourceLabel}</span>)}
          <p className="recall-prompt">What would you add, clarify, or change? You can update your reflection above.</p>
        </section>
      )}

      {error && <p className="recall-notice" role="alert">{error}</p>}
      <footer className="recall-footer">
        <p>Your reflection is added to this entry. The original stays.</p>
        <div className="recall-actions">
          <button type="button" className="recall-secondary" onClick={onClose}>Close</button>
          <button type="submit" className="recall-primary" disabled={!revealed || !reflection.trim()} data-action="save-reflection">Save reflection<span aria-hidden="true">↗</span></button>
        </div>
      </footer>
    </form>
  );
}
