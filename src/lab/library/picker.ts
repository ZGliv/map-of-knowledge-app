import { useEffect, useState } from 'react';

/*
 * Temporary: the Library prototypes behind one picker at #/lab/library, opened from the app
 * menu so the TestFlight app (which has no address bar) reaches them too. Opening the picker sets
 * whichever prototype was showing aside, and closing it returns to the real Library; each prototype
 * steps aside for any other #/lab/ address (see their route modules).
 */

export const PICKER_HASH = '#/lab/library';
export const LIBRARY_PROTOTYPES = [
  { id: 'd', name: 'The Logbook', hash: '#/lab/library-d' },
  { id: 'e', name: 'Your Library', hash: '#/lab/library-e' },
  { id: 'f', name: 'The Edition', hash: '#/lab/library-f' },
  { id: 'a', name: 'Exhibitions', hash: '#/lab/library-a' },
  { id: 'c', name: 'The Mosaic', hash: '#/lab/library-c' },
] as const;

/** A lab address other than the one a prototype owns: the picker, or a sibling prototype. */
export const isOtherLab = (hash: string, own: (hash: string) => boolean): boolean => /^#\/lab\//.test(hash) && !own(hash);

export const isPickerHash = (hash: string): boolean => hash.split('?')[0].replace(/\/$/, '') === PICKER_HASH;

// Every listener in the app (the atlas router and the three prototypes) re-reads the address on
// hashchange, so a pushed or replaced address announces itself the same way a typed one does.
function goHash(hash: string, mode: 'push' | 'replace'): void {
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const openLibraryPicker = (): void => goHash(PICKER_HASH, 'push');
export const openLibraryPrototype = (hash: string): void => goHash(hash, 'push');
export const closeLibraryPicker = (): void => goHash('', 'replace');

/** Whether the address is the picker. One instance, in App. */
export function useLibraryPicker(): boolean {
  const [open, setOpen] = useState(() => isPickerHash(window.location.hash));
  useEffect(() => {
    const sync = () => setOpen(isPickerHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  return open;
}
