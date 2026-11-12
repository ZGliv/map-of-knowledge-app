import { useEffect, useId, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { catalog } from '../core/catalog';
import { Glyph, hueStyle } from './covers';
import { PlaceFinder, useSheetFocus } from './ItemSheet';
import { domainOf, LIBRARY_LIMITS, normalizeUrl, type LinkPreview, type SavedLink } from './libraryStore';
import { suggestPlaces } from './placeMap';

export interface LinkDraft { id?: string; url: string; note: string; nodeId: string | null; places?: readonly string[]; preview?: LinkPreview | null }

const nameOf = (id: string) => catalog.get(id)?.name ?? id;
const placeTrail = (id: string) => { const node = catalog.get(id); return node?.parentId ? nameOf(node.parentId) : ''; };

/** A pasted "Title https://…" (what share sheets produce) splits into the link and its line. */
export function splitPaste(text: string): { url: string; note: string } | null {
  const match = text.match(/https?:\/\/\S+/i);
  if (!match) return null;
  const note = text.replace(match[0], ' ').replace(/\s+/g, ' ').replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, '');
  return { url: match[0], note };
}

// --- what the page says about itself -------------------------------------------------------

const SEEN = new Map<string, LinkPreview | null>();
const clip = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const httpsOnly = (value: unknown) => { if (typeof value !== 'string') return null; try { const url = new URL(value); return url.protocol === 'https:' && url.href.length <= LIBRARY_LIMITS.url ? url.href : null; } catch { return null; } };

/** Ask the server (api/unfurl.mjs) what a page says about itself. Null when it can't say: the link
 * then shows as its domain and the link mark, as it always has. */
export async function unfurlLink(url: string, signal?: AbortSignal): Promise<LinkPreview | null> {
  if (SEEN.has(url)) return SEEN.get(url)!;
  try {
    const response = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`, { signal, credentials: 'omit' });
    const body = response.ok ? await response.json() as Record<string, unknown> : null;
    const seen = body?.ok ? { title: clip(body.title, LIBRARY_LIMITS.previewTitle), description: clip(body.description, LIBRARY_LIMITS.previewText), siteName: clip(body.siteName, LIBRARY_LIMITS.siteName), image: httpsOnly(body.image), at: new Date().toISOString() } : null;
    SEEN.set(url, seen && (seen.title || seen.description) ? seen : null);
  } catch (error) {
    if (signal?.aborted) return null;
    SEEN.set(url, null);
  }
  return SEEN.get(url) ?? null;
}

/** The preview for an address, fetched once the learner stops typing. */
export function useUnfurl(url: string | null, initial?: LinkPreview): { preview: LinkPreview | null; loading: boolean } {
  const [state, setState] = useState<{ url: string | null; preview: LinkPreview | null; loading: boolean }>({ url, preview: initial ?? null, loading: false });
  useEffect(() => {
    if (!url) { setState({ url, preview: null, loading: false }); return; }
    if (initial && state.url === url && state.preview) return;
    const controller = new AbortController();
    setState(current => ({ url, preview: current.url === url ? current.preview : null, loading: true }));
    const timer = setTimeout(() => {
      void unfurlLink(url, controller.signal).then(preview => { if (!controller.signal.aborted) setState({ url, preview, loading: false }); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
    // Only the address decides whether to look again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return { preview: state.url === url ? state.preview : null, loading: state.url === url && state.loading };
}

// --- the fields ----------------------------------------------------------------------------

/** What a link is (the page's own preview, the learner's line) and where it goes on the map: its own
 * place, and any further ones it was saved under (a video saved from Watch), each a tap to take off.
 * None clears them all. */
export function LinkFields({ url, note, onNote, nodeId, onPlace, more = [], onMore, touchedPlace, preview, loading, error, noteId }: {
  url: string; note: string; onNote: (note: string) => void; nodeId: string | null; onPlace: (nodeId: string | null, byHand: boolean) => void;
  more?: readonly string[]; onMore?: (places: string[]) => void;
  touchedPlace: boolean; preview: LinkPreview | null; loading: boolean; error: string; noteId: string;
}) {
  const [choosing, setChoosing] = useState(false);
  const normalized = normalizeUrl(url);
  // Suggest a place from the learner's line first, then the page's own words and the address.
  const suggestions = useMemo(() => {
    let pageWords = preview ? `${preview.title} ${preview.description}` : '';
    try { pageWords += ` ${decodeURIComponent(new URL(normalized ?? '').pathname).replace(/[/_-]+/g, ' ')}`; } catch { /* not a link yet */ }
    return suggestPlaces(note, pageWords);
  }, [note, preview, normalized]);
  useEffect(() => { if (!touchedPlace) onPlace(suggestions[0] ?? null, false); }, [suggestions, touchedPlace, onPlace]);
  const choose = (next: string | null) => { onPlace(next, true); setChoosing(false); };
  const others = more.filter(id => id !== nodeId);
  const none = () => { choose(null); onMore?.([]); };
  return <>
    {normalized && <div className={`lib-preview${preview ? ' is-seen' : ''}${loading ? ' is-loading' : ''}`} data-link-preview={preview ? 'seen' : loading ? 'loading' : 'plain'}>
      {preview?.image ? <span className="lib-link-thumb is-small" aria-hidden="true"><img src={preview.image} alt="" referrerPolicy="no-referrer" /></span> : <span className="lib-link-mark" style={hueStyle(nodeId)} aria-hidden="true"><Glyph name="link" /></span>}
      <span className="lib-row-main">
        <strong>{preview?.title || domainOf(normalized)}</strong>
        <small>{preview ? [preview.siteName, preview.description].filter(Boolean).join(' · ') : domainOf(normalized)}</small>
      </span>
    </div>}
    <label className="lib-field" htmlFor={noteId}>
      <span className="sr-only">What is this?</span>
      <input id={noteId} type="text" placeholder={preview?.title ? 'What is it to you?' : 'What is this?'} value={note} maxLength={LIBRARY_LIMITS.note} onChange={event => onNote(event.target.value)} data-action="link-note" enterKeyHint="done" />
    </label>
    <div className="lib-place-pick">
      {nodeId
        ? <button type="button" className="lib-place-chip is-on" style={hueStyle(nodeId)} onClick={() => setChoosing(c => !c)} data-action="link-place" data-node-id={nodeId} aria-expanded={choosing}>
          <i aria-hidden="true" />{nameOf(nodeId)}<small>{placeTrail(nodeId)}</small>
        </button>
        : <button type="button" className="lib-place-chip" onClick={() => setChoosing(c => !c)} data-action="link-place" aria-expanded={choosing}>Add a place</button>}
      {others.map(id => <span key={id} className="lib-place-chip is-on" style={hueStyle(id)} data-node-id={id} data-link-more="">
        <i aria-hidden="true" />{nameOf(id)}<small>{placeTrail(id)}</small>
        <button type="button" className="lib-chip-x" onClick={() => onMore?.(more.filter(item => item !== id))} aria-label={`Take ${nameOf(id)} off this link`} data-action="link-place-remove"><Glyph name="close" /></button>
      </span>)}
      {(nodeId || others.length > 0) && <button type="button" className="lib-quiet" onClick={none} aria-label="No place">None</button>}
    </div>
    {!choosing && suggestions.filter(s => s !== nodeId && !others.includes(s)).length > 0 && <div className="lib-suggest">
      {suggestions.filter(s => s !== nodeId && !others.includes(s)).slice(0, 3).map(s => <button key={s} type="button" className="lib-place-chip" style={hueStyle(s)} onClick={() => choose(s)} data-action="link-suggestion" data-node-id={s}><i aria-hidden="true" />{nameOf(s)}</button>)}
    </div>}
    {choosing && <PlaceFinder exclude={nodeId ? [nodeId, ...others] : others} onPick={choose} />}
    {error && <p className="lib-error" id={`${noteId}-error`} role="alert">{error}</p>}
  </>;
}

/** The link fields' state: the line, the place (suggested until chosen by hand), its further places and the preview. */
export function useLinkDraft(url: string, link?: SavedLink, initialNodeId: string | null = null) {
  const [note, setNote] = useState(link?.note ?? '');
  const [nodeId, setNodeId] = useState<string | null>(link ? link.nodeId : initialNodeId);
  const [more, setMore] = useState<string[]>(() => [...(link?.places ?? [])]);
  const [touchedPlace, setTouchedPlace] = useState(!!link || !!initialNodeId);
  const normalized = normalizeUrl(url);
  const { preview, loading } = useUnfurl(normalized, link?.url === normalized ? link?.preview : undefined);
  const onPlace = useMemo(() => (next: string | null, byHand: boolean) => { setNodeId(next); if (byHand) setTouchedPlace(true); }, []);
  return { note, setNote, nodeId, onPlace, more, setMore, touchedPlace, preview, loading, normalized };
}

/** Editing a saved link (or saving one to a place): the address, its line, its place. */
export function LinkSheet({ link, initialNodeId, onSave, onRemove, onClose }: {
  link?: SavedLink;
  initialNodeId: string | null;
  onSave: (draft: LinkDraft) => string | null;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(link?.url ?? '');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const draft = useLinkDraft(url, link, initialNodeId);
  const urlInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  useSheetFocus(form, onClose, () => urlInput.current);

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const split = splitPaste(event.clipboardData.getData('text'));
    if (!split) return;
    event.preventDefault();
    setUrl(split.url);
    if (split.note && !draft.note) draft.setNote(split.note.slice(0, LIBRARY_LIMITS.note));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.normalized) { setError('Paste a complete web address, such as https://example.org/page.'); urlInput.current?.focus(); return; }
    // Every place it now has, so a place taken off (or None) is really gone.
    const problem = onSave({ id: link?.id, url, note: draft.note, nodeId: draft.nodeId, places: draft.more.filter(place => place !== draft.nodeId), preview: draft.preview ?? (link && link.url === draft.normalized ? link.preview : null) });
    if (problem) setError(problem); else onClose();
  };

  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <form ref={form} className="lib-sheet lib-link-sheet" role="dialog" aria-modal="true" aria-label={link ? 'Edit a saved link' : 'Save a link'} onClick={event => event.stopPropagation()} onSubmit={submit} noValidate data-link-sheet="">
      <span className="lib-grab" aria-hidden="true" />
      <label className="lib-field" htmlFor={`${id}-url`}>
        <span className="sr-only">Link</span>
        <input ref={urlInput} id={`${id}-url`} type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Paste a link" value={url}
          onChange={event => { setUrl(event.target.value); setError(''); }} onPaste={paste} data-action="link-url" aria-invalid={!!error} aria-describedby={error ? `${id}-note-error` : undefined} />
        {draft.normalized && <small className="lib-domain">{domainOf(draft.normalized)}</small>}
      </label>
      <LinkFields url={url} note={draft.note} onNote={draft.setNote} nodeId={draft.nodeId} onPlace={draft.onPlace} more={draft.more} onMore={draft.setMore} touchedPlace={draft.touchedPlace} preview={draft.preview} loading={draft.loading} error={error} noteId={`${id}-note`} />
      <footer className="lib-sheet-foot">
        {link && (confirmRemove
          ? <button type="button" className="lib-quiet is-danger" onClick={() => { onRemove(link.id); onClose(); }} data-action="remove-link">Remove it</button>
          : <button type="button" className="lib-quiet" onClick={() => setConfirmRemove(true)} data-action="confirm-remove-link">Remove</button>)}
        <button type="button" className="lib-quiet" onClick={onClose}>Cancel</button>
        <button type="submit" className="lib-open" data-action="save-link">Save</button>
      </footer>
    </form>
  </div>;
}
