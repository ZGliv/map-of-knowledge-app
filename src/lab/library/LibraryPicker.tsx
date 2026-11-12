import { useEffect, useRef } from 'react';
import { LIBRARY_PROTOTYPES } from './picker';
import './picker.css';

export interface LibraryPickerProps {
  onChoose: (hash: string) => void;
  onClose: () => void;
}

/** Temporary: the Library prototypes by name. Reached from the app menu. */
export function LibraryPicker({ onChoose, onClose }: LibraryPickerProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus({ preventScroll: true }); }, []);
  return <div className="lib-picker" role="dialog" aria-modal="true" aria-labelledby="lib-picker-title" tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    // Focus stays on the picker's own buttons.
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    if (!buttons.length) return;
    event.preventDefault();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
  }}>
    <div className="lib-picker-page">
      <header>
        <h1 id="lib-picker-title">Library prototypes</h1>
        <button type="button" className="lib-picker-close" aria-label="Close" onClick={onClose} data-action="close-library-prototypes">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
        </button>
      </header>
      <ul>
        {LIBRARY_PROTOTYPES.map((prototype, index) => <li key={prototype.id}>
          <button type="button" ref={index === 0 ? first : undefined} onClick={() => onChoose(prototype.hash)} data-action={`open-library-${prototype.id}`}>{prototype.name}</button>
        </li>)}
      </ul>
    </div>
  </div>;
}
