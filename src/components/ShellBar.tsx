import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';

export interface ShellBarProps {
  /** The place: the map's or hub's location bar, or nothing on a page of its own. */
  children?: ReactNode;
  /** Search alone, at the trailing end: Explore, where the picture is the screen (no brand, no menu). */
  searchOnly?: boolean;
  initial: string;
  menuOpen: boolean;
  searchShortcut: string;
  onHome: () => void;
  onSearch: () => void;
  onMenu: () => void;
}

/**
 * The app's only top bar: the brand (home), where you are, search and the one menu.
 * On a phone it is two floating groups over the full-screen map, the brand and the place leading
 * and the tools trailing, with nothing between them; the map keeps its names clear of both
 * (data-map-obstacle). On a desktop the lead dissolves (display: contents) into one full-width bar.
 * On Explore (searchOnly) it is search alone, at the trailing end, as on a short-video app: the brand
 * and the menu stay on Atlas and the Library, where everything the menu holds is reached.
 */
export function ShellBar({ children, searchOnly = false, initial, menuOpen, searchShortcut, onHome, onSearch, onMenu }: ShellBarProps) {
  return <header className={`shell-bar${searchOnly ? ' is-search-only' : ''}`}>
    {!searchOnly && <div className="shell-lead" data-map-obstacle="">
      <button type="button" className="shell-brand" onClick={onHome} aria-label="Map of Knowledge home" title="All knowledge" data-action="brand-home">
        <span className="brand-mark" aria-hidden="true"><BrandMark /></span>
        <span className="shell-brand-name">Map of Knowledge</span>
      </button>
      <div className="shell-bar-place">{children}</div>
    </div>}
    <div className="shell-bar-tools" data-map-obstacle="">
      <button type="button" className="shell-search" onClick={onSearch} aria-label="Search the atlas" aria-keyshortcuts="Meta+K Control+K" title={`Search · ${searchShortcut}`} data-action="open-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          {/* Over a video the glyph's dark edge: the same lens and handle as one wider stroke beneath it. */}
          {searchOnly && <path className="shell-search-edge" d="M17 10.5a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0M16 16l4.5 4.5" />}
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" />
        </svg>
        <kbd aria-hidden="true">{searchShortcut}</kbd>
      </button>
      {!searchOnly && <button type="button" className="shell-menu" onClick={onMenu} aria-label="Open menu" aria-haspopup="menu" aria-expanded={menuOpen} data-action="open-menu">
        {initial ? <span>{initial}</span> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" /></svg>}
      </button>}
    </div>
  </header>;
}
