import type { SpectrumPreviewMode } from '../core/spectrumPreview';

export function SpectrumPreviewControl({ mode, onChange }: {
  mode: SpectrumPreviewMode;
  onChange: (mode: SpectrumPreviewMode) => void;
}) {
  const enabled = mode !== 'off';
  // Switched on from the menu; the map only carries this control while a preview is showing.
  if (!enabled) return null;
  return <aside className={`spectrum-control${enabled ? ' is-open' : ''}`} aria-label="Temporary color preview">
    <button className="spectrum-toggle" role="switch" aria-label="Preview color" aria-checked={enabled} data-action="color-preview"
      onClick={() => onChange(enabled ? 'off' : 'sample')}>
      <i className="spectrum-swatch" aria-hidden="true"/>
      <span>{enabled ? 'Preview' : 'Preview color'}</span>
      <span className="spectrum-switch" aria-hidden="true"><i/></span>
    </button>
    {enabled && <div className="spectrum-options">
      <div className="spectrum-modes" role="group" aria-label="Preview coverage">
        <button aria-pressed={mode === 'sample'} data-action="preview-sample" onClick={() => onChange('sample')}>Random areas</button>
        <button aria-pressed={mode === 'all'} data-action="preview-all" onClick={() => onChange('all')}>Whole map</button>
      </div>
      <p className="sr-only" role="status">Preview only · your progress stays yours</p>
    </div>}
  </aside>;
}
