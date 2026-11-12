import { useEffect, useRef, useState } from 'react';
import { isOtherLab } from '../library/picker';

/**
 * #/lab/library-a: a hidden route that shows prototype A in place of the Library tab. Once opened it
 * stays on for the visit, so flying to the Atlas, playing a video or proving a place and coming back
 * to the Library tab lands in the prototype again. A reload without the address shows the real Library,
 * so the address is put back whenever the Library returns without one (after a case or a lesson).
 */
export const LIBRARY_A_HASH = '#/lab/library-a';
const isLab = (hash = typeof window !== 'undefined' ? window.location.hash : '') => /^#\/lab\/library-a\/?$/.test(hash);
let opened = false;

/** `view` is App's tab; `route` is App's route, a new object whenever it changes. */
export function useLibraryALab(onOpen: () => void, view: string, route: unknown): boolean {
  const [on, setOn] = useState(() => (opened ||= isLab()));
  const open = useRef(onOpen);
  open.current = onOpen;
  useEffect(() => {
    const sync = () => {
      if (isLab()) { opened = true; setOn(true); open.current(); return; }
      // The prototype picker or a sibling prototype: step aside until this address is opened again.
      if (isOtherLab(window.location.hash, isLab)) { opened = false; setOn(false); }
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => {
    if (on && view === 'notebook' && !window.location.hash) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${LIBRARY_A_HASH}`);
  }, [on, view, route]);
  return on;
}
