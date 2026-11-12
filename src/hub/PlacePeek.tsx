import type { HubModel } from './hubModel';

/**
 * Prototype switch for how a place's page is reached from the map, read once at load from `?nav=`:
 * - pill (default): a plain "Intro to …" button floats above the tab bar and opens the page
 * - off: only the capsule's chevron opens the page
 * - sheet: a card rests above the tab bar; it opens the page as a sheet over the lower map, which stays
 *   in view and in reach above it (touching another place there lowers the sheet and flies)
 */
export type NavMode = 'off' | 'pill' | 'sheet';
export const NAV_MODE: NavMode = (() => {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get('nav');
    return value === 'off' || value === 'sheet' ? value : 'pill';
  } catch { return 'pill'; }
})();

const minutesOf = (model: HubModel): number | null => {
  const next = model.next;
  if (next?.kind === 'expedition') return next.item.expedition.pack.minutes;
  if (next?.kind === 'discovery') return next.item.discovery.minutes;
  return null;
};

/** The way into a place's page, resting over the map's lower edge. Always mounted (hidden while the
 * camera moves), so the map's names keep clear of it. */
export function PlacePeek({ model, mode, hidden, onOpen }: { model: HubModel | null; mode: Exclude<NavMode, 'off'>; hidden: boolean; onOpen: () => void }) {
  const name = model?.node.name ?? '';
  const visible = !!model && !hidden;
  if (mode === 'pill') return <button
    type="button" className={`place-peek is-pill${visible ? '' : ' is-hidden'}`} data-map-obstacle data-action="place-intro"
    onClick={onOpen} tabIndex={visible ? 0 : -1} aria-hidden={!visible}
  >Intro to {name}<span aria-hidden="true"> →</span></button>;
  const minutes = model ? minutesOf(model) : null;
  return <button
    type="button" className={`place-peek is-card${visible ? '' : ' is-hidden'}`} data-map-obstacle data-action="place-intro"
    onClick={onOpen} tabIndex={visible ? 0 : -1} aria-hidden={!visible}
  >
    <i className="place-peek-handle" aria-hidden="true" />
    <span className="place-peek-title">Intro to {name}</span>
    <span className="place-peek-line">{model?.overview}</span>
    {minutes ? <span className="place-peek-meta">{minutes} min to start</span> : null}
  </button>;
}
