import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { LIBRARY_LIMITS } from '../notebook/libraryStore';
import { searchPlaces, suggestPlaces, type SaveLookup } from './saveTo';
import './save.css';

// Save, from Watch or Reels: a small sheet with the two or three places this video or reel fits best
// (saveTo.ts), the best already chosen, any of them a tap to add or drop, and a search for any other
// place, up to SAVE_MAX_PLACES (once full, the rest wait until one is dropped). One tap on Save keeps
// it in the Library under the chosen places; if that fails, the sheet stays open and says why. Opened
// on something already saved, it shows where it is and can take it out. No explainer text. It is drawn
// into the app's shell (where the atlas tokens live), over everything, the tab capsule included.

/** A thing is saved under at most this many places: a saved link's own and up to four more (the
 * reel shelf keeps as many). */
export const SAVE_MAX_PLACES = 1 + LIBRARY_LIMITS.linkPlaces;

export const saveLookup: SaveLookup = {
  get: id => catalog.get(id),
  all: () => catalog.all(),
  children: id => { const node = catalog.get(id); return node ? catalog.getChildren(node) : []; },
};

/** A place's way down from its territory, without the place itself: "Science › Biology". */
export function trailOf(id: string): string {
  const node = catalog.get(id);
  if (!node) return '';
  return catalog.getPath(node).slice(1, -1).slice(-2).map(step => step.name).join(' › ');
}

export interface SaveSheetProps {
  /** Its own places, primary first. */
  tagged: readonly string[];
  /** Its title and what you learn, for matching place names. */
  text: string;
  /** The learner's places, most telling first. */
  mine: readonly string[];
  /** Where it is saved now, or null when it is not. */
  saved: readonly string[] | null;
  /** Keep it under `places` (at most SAVE_MAX_PLACES): an error message, or nothing once kept. */
  onSave: (places: string[]) => string | null | void;
  onRemove: () => void;
  onClose: () => void;
}

function Check() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
}

export function SaveSheet({ tagged, text, mine, saved, onSave, onRemove, onClose }: SaveSheetProps) {
  const suggestions = useMemo(() => suggestPlaces({ tagged, text, mine }, saveLookup, 3), [tagged, text, mine]);
  const [chosen, setChosen] = useState<string[]>(() => saved?.length ? saved.slice(0, SAVE_MAX_PLACES) : suggestions.slice(0, 1));
  const [extra, setExtra] = useState<string[]>(() => (saved ?? []).filter(id => !suggestions.includes(id)));
  const [query, setQuery] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const full = chosen.length >= SAVE_MAX_PLACES;
  const found = useMemo(() => searchPlaces(query, saveLookup, 6), [query]);
  const sheet = useRef<HTMLElement>(null);
  const shown = [...suggestions, ...extra];

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const toggle = (id: string) => { setProblem(null); setChosen(list => list.includes(id) ? list.filter(item => item !== id) : list.length < SAVE_MAX_PLACES ? [...list, id] : list); };
  const add = (id: string) => {
    if (full && !chosen.includes(id)) return;
    setProblem(null);
    if (!shown.includes(id)) setExtra(list => [...list, id]);
    setChosen(list => list.includes(id) ? list : [...list, id]);
    setQuery('');
  };
  // In the order shown: suggestions first, the best of them leading.
  const save = () => {
    const places = shown.filter(id => chosen.includes(id)).slice(0, SAVE_MAX_PLACES);
    if (!places.length) return;
    const refused = onSave(places);
    if (typeof refused === 'string' && refused) setProblem(refused);
  };

  return createPortal(<div className="save-scrim" onClick={onClose} data-save-scrim="">
    <section ref={sheet} className="save-sheet" role="dialog" aria-modal="true" aria-label="Save to" tabIndex={-1} onClick={event => event.stopPropagation()} data-save-sheet={saved ? 'saved' : 'new'}>
      <h2 className="save-title">Save to</h2>
      <ul className="save-places">
        {shown.map(id => {
          const on = chosen.includes(id);
          return <li key={id} style={{ '--place-color': territoryColor(id) } as CSSProperties}>
            <button type="button" className={`save-place${on ? ' is-on' : ''}`} onClick={() => toggle(id)} aria-pressed={on} disabled={!on && full} data-action="save-place" data-node-id={id}>
              <i aria-hidden="true" />
              <span><b>{catalog.get(id)?.name ?? id}</b>{trailOf(id) && <small>{trailOf(id)}</small>}</span>
              <span className="save-tick" aria-hidden="true">{on && <Check />}</span>
            </button>
          </li>;
        })}
      </ul>
      <label className="save-search">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></svg>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Another place" aria-label="Find another place" enterKeyHint="search" autoComplete="off" disabled={full} data-action="save-search" />
      </label>
      {found.length > 0 && !full && <ul className="save-found" aria-label="Places">
        {found.map(node => <li key={node.id} style={{ '--place-color': territoryColor(node.id) } as CSSProperties}>
          <button type="button" onClick={() => add(node.id)} data-action="save-found" data-node-id={node.id}><i aria-hidden="true" /><span><b>{node.name}</b>{trailOf(node.id) && <small>{trailOf(node.id)}</small>}</span></button>
        </li>)}
      </ul>}
      {problem && <p className="save-problem" role="alert" data-save-problem="">{problem}</p>}
      <div className="save-actions">
        {saved && <button type="button" className="save-remove" onClick={onRemove} data-action="save-remove">Remove</button>}
        <button type="button" className="save-confirm" onClick={save} disabled={!chosen.length} data-action="save-confirm">Save</button>
      </div>
    </section>
  </div>, document.querySelector('.studio-shell') ?? document.body);
}
