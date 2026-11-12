import type { KeyboardEvent, ReactNode } from 'react';

type Glyph = 'guide' | 'capture' | 'swatch' | 'memory' | 'backup' | 'about' | 'shelf';

const paths: Record<Glyph, ReactNode> = {
  guide: <path d="M12 3.5v17M4.6 7.75l14.8 8.5M4.6 16.25l14.8-8.5" />,
  capture: <path d="M12 5v14M5 12h14" />,
  swatch: <><circle cx="12" cy="12" r="7.5" /><path d="M12 4.5a7.5 7.5 0 0 1 0 15Z" fill="currentColor" stroke="none" opacity=".55" /></>,
  memory: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 19.5c1.1-3.4 3.7-5.2 6.5-5.2s5.4 1.8 6.5 5.2" /></>,
  backup: <path d="M12 4.5v10.5m-4.25-4.25L12 15l4.25-4.25M5 19.5h14" />,
  about: <><circle cx="12" cy="12" r="8.25" /><path d="M12 11v5.25M12 7.9v.1" /></>,
  shelf: <path d="M5 4.5v15M9.5 4.5v15M14 5.2l4.6 14M4 19.5h16" />,
};

function Glyph({ name }: { name: Glyph }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">{paths[name]}</svg>;
}

export interface AppMenuProps {
  previewOn: boolean;
  /** Plain status for where learning is kept, e.g. "Saved on this device". */
  saveStatus: string;
  saveNeedsAttention: boolean;
  onGuide: () => void;
  onCapture: () => void;
  onTogglePreview: () => void;
  onMemory: () => void;
  onSettings: () => void;
  onAbout: () => void;
  /** Temporary: the Library prototype picker (src/lab/library). */
  onLibraryPrototypes?: () => void;
  onClose: () => void;
}

/** The single account menu: everything that used to sit beside the map as separate controls. */
export function AppMenu({ previewOn, saveStatus, saveNeedsAttention, onGuide, onCapture, onTogglePreview, onMemory, onSettings, onAbout, onLibraryPrototypes, onClose }: AppMenuProps) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const target = event.key === 'ArrowDown' ? items[(index + 1) % items.length]
      : event.key === 'ArrowUp' ? items[(index - 1 + items.length) % items.length]
      : event.key === 'Home' ? items[0]
      : event.key === 'End' ? items.at(-1)
      : undefined;
    if (target) { event.preventDefault(); target.focus(); }
  };
  const item = (glyph: Glyph, label: string, onSelect: () => void, action: string) =>
    <button type="button" role="menuitem" className="app-menu-item" onClick={onSelect} data-action={action}><Glyph name={glyph} /><span>{label}</span></button>;
  return <div className="app-menu-layer" onClick={onClose}>
    <div className="app-menu" onClick={event => event.stopPropagation()}>
      <div role="menu" aria-label="Menu" onKeyDown={move}>
        {item('guide', 'Ask your guide', onGuide, 'open-guide')}
        {item('capture', 'Capture an idea', onCapture, 'capture-idea')}
        <hr />
        <button type="button" role="menuitemcheckbox" aria-checked={previewOn} className="app-menu-item" onClick={onTogglePreview} data-action="color-preview">
          <Glyph name="swatch" /><span>Preview color</span><i className="app-menu-switch" aria-hidden="true" />
        </button>
        {item('memory', 'Learning memory', onMemory, 'open-memory')}
        {item('backup', 'Backup & settings', onSettings, 'open-backup')}
        {item('about', 'How color grows', onAbout, 'about-map')}
        {onLibraryPrototypes && <><hr />{item('shelf', 'Library prototypes', onLibraryPrototypes, 'open-library-prototypes')}</>}
      </div>
      <p className={`app-menu-status${saveNeedsAttention ? ' needs-attention' : ''}`}><i aria-hidden="true" />{saveStatus}</p>
    </div>
  </div>;
}
