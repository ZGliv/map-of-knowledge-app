import { useEffect, useRef, useState } from 'react';
import { isOtherLab } from '../library/picker';

/*
 * The hidden lab address for prototype C, #/lab/library-c: the Library tab, drawn as the Mosaic.
 * The atlas route parser (hub/route.ts) reads the address as the map, so App's own screens are
 * untouched. Opening the address shows the Library tab, and for the rest of the visit the Library
 * tab stays the Mosaic: a video played in Watch or a place flown to on the Atlas comes back to it.
 * The address follows the tab: it is set while the Library shows (and put back after a case or a
 * lesson, which replace it for a while) and taken off on the other tabs.
 */

export const LAB_HASH = '#/lab/library-c';
const atLab = () => window.location.hash.split('?')[0] === LAB_HASH;
const address = (hash: string) => `${window.location.pathname}${window.location.search}${hash}`;

/** Whether the Mosaic is showing. `view` is App's tab; `route` is App's route, a new object whenever it changes. */
export function useLibraryLab(view: string, showLibrary: () => void, route: unknown): boolean {
  const [on, setOn] = useState(atLab);
  const show = useRef(showLibrary);
  show.current = showLibrary;
  useEffect(() => {
    const sync = () => {
      if (atLab()) { setOn(true); show.current(); }
      // The prototype picker or a sibling prototype: step aside until this address is opened again.
      else if (isOtherLab(window.location.hash, hash => hash.split('?')[0] === LAB_HASH)) setOn(false);
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => {
    if (!on) return;
    if (view === 'notebook' && !window.location.hash) window.history.replaceState(window.history.state, '', address(LAB_HASH));
    else if (view !== 'notebook' && atLab()) window.history.replaceState(window.history.state, '', address(''));
  }, [on, view, route]);
  return on && view === 'notebook';
}
