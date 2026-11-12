import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { catalog } from '../core/catalog';
import { Glyph, hueStyle, ItemCover, LinkThumb } from './covers';
import type { PlaceState, WorkItem } from './journal';
import {
  addNote, domainOf, kindVerbs, LIBRARY_LIMITS, linkPlaces, notesFor, removeEntry, removeNote, setPlaces, setStatus,
  type ItemNote, type ItemStatus, type LibraryStore, type SavedLink,
} from './libraryStore';
import { usePoolIds } from '../feed/usePool';
import { videoIdFromUrl } from '../feed/youtube';
import { workUrl } from './openLibrary';
import { itemUrl } from './wikidata';

/*
 * One item's page: its cover and what it is, your status and dates, where it sits on your map,
 * the passages and thoughts you kept from it, and — once it is finished and its place has new
 * cases — one quiet offer to prove what it taught.
 */

export type SheetItem =
  | { kind: 'work'; work: WorkItem }
  | { kind: 'link'; link: SavedLink };

export interface ItemSheetProps {
  item: SheetItem;
  library: LibraryStore;
  /** A place's state on your map, for its chip. */
  placeState: (nodeId: string) => PlaceState;
  /** The place (of these) whose next new case can be offered, if any. */
  caseOffer: (nodeIds: readonly string[]) => string | undefined;
  onChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  /** Add a work that is not in the library yet (a search result) with this status. */
  onAdd?: (status: ItemStatus) => string | null;
  onTryCase: (nodeId: string) => void;
  onShowPlace: (nodeId: string) => void;
  onEditLink: (link: SavedLink) => void;
  /** Play a saved video in Watch. */
  onOpenVideo?: (videoId: string) => void;
  onClose: () => void;
}

const nameOf = (id: string) => catalog.get(id)?.name ?? id;
const parentOf = (id: string) => { const node = catalog.get(id); return node?.parentId && node.depth > 1 ? nameOf(node.parentId) : ''; };
const when = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};
const STATUSES: readonly ItemStatus[] = ['want', 'started', 'finished', 'stopped'];

export function statusWord(kind: WorkItem['kind'], status: ItemStatus): string {
  const verbs = kindVerbs(kind);
  return status === 'want' ? 'Want' : status === 'started' ? verbs.doing : status === 'finished' ? (kind === 'book' ? 'Finished' : verbs.done) : 'Stopped';
}

/** Keep focus inside a sheet, close it on Escape, and give focus back to what opened it. */
export function useSheetFocus(ref: React.RefObject<HTMLElement | null>, onClose: () => void, focusFirst?: () => HTMLElement | null | undefined) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    (focusFirst?.() ?? ref.current)?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab' || !ref.current) return;
      const all = [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
      if (!all.length) return;
      const index = all.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && (index <= 0)) { event.preventDefault(); all.at(-1)!.focus(); }
      else if (!event.shiftKey && index === all.length - 1) { event.preventDefault(); all[0].focus(); }
    };
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('keydown', key, true); opener?.focus?.({ preventScroll: true }); };
    // Focus moves once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function PlaceChip({ nodeId, state, onShow, onRemove }: { nodeId: string; state: PlaceState; onShow: () => void; onRemove?: () => void }) {
  return <span className={`lib-place-chip is-on${state ? ` is-${state}` : ''}`} style={hueStyle(nodeId)} data-node-id={nodeId}>
    <button type="button" onClick={onShow} data-action="item-place" data-node-id={nodeId}><i aria-hidden="true" />{nameOf(nodeId)}{parentOf(nodeId) && <small>{parentOf(nodeId)}</small>}</button>
    {onRemove && <button type="button" className="lib-chip-x" onClick={onRemove} aria-label={`Take ${nameOf(nodeId)} off this item`} data-action="item-place-remove"><Glyph name="close" /></button>}
  </span>;
}

/** Choose places by name: atlas places only, never the illustrative samples. */
export function PlaceFinder({ exclude, onPick, autoFocus = true }: { exclude: readonly string[]; onPick: (nodeId: string) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const choices = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    return catalog.all().filter(n => n.depth > 0 && !(n as { sample?: boolean }).sample && !exclude.includes(n.id) && n.name.toLocaleLowerCase().includes(q))
      .sort((a, b) => Number(b.name.toLocaleLowerCase().startsWith(q)) - Number(a.name.toLocaleLowerCase().startsWith(q)) || a.depth - b.depth || a.name.localeCompare(b.name)).slice(0, 8);
  }, [query, exclude]);
  return <div className="lib-place-search">
    <input type="search" placeholder="Find a place" value={query} onChange={event => setQuery(event.target.value)} aria-label="Find a place on the map" data-action="item-place-search" autoFocus={autoFocus} enterKeyHint="search" />
    {choices.map(n => <button key={n.id} type="button" className="lib-row is-button" onClick={() => { onPick(n.id); setQuery(''); }} data-action="item-place-choice" data-node-id={n.id}>
      <span className="lib-place-dot" style={hueStyle(n.id)} aria-hidden="true" />
      <span className="lib-row-main"><strong>{n.name}</strong><small>{parentOf(n.id) || (n.parentId ? nameOf(n.parentId) : '')}</small></span>
    </button>)}
  </div>;
}

function Notes({ target, library, onChange }: { target: string; library: LibraryStore; onChange: ItemSheetProps['onChange'] }) {
  const notes = notesFor(library, target);
  const [draft, setDraft] = useState<{ id?: string; kind: ItemNote['kind']; text: string; where: string } | null>(null);
  const [error, setError] = useState('');
  const id = useId();
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const problem = onChange(current => addNote(current, { id: draft.id, target, kind: draft.kind, text: draft.text, where: draft.where }));
    if (problem) setError(problem); else { setDraft(null); setError(''); }
  };
  return <section className="lib-item-notes" aria-labelledby={`${id}-head`} data-item-notes="">
    <h3 id={`${id}-head`}>Passages and thoughts{notes.length > 0 && <small>{notes.length}</small>}</h3>
    {notes.map(note => draft?.id === note.id ? null : <article key={note.id} className={`lib-kept is-${note.kind}`} data-note-id={note.id}>
      {note.kind === 'quote' ? <blockquote>{note.text}</blockquote> : <p>{note.text}</p>}
      <footer>
        {note.where && <span>{note.where}</span>}
        <span>{when(note.createdAt)}</span>
        <button type="button" className="lib-quiet" onClick={() => setDraft({ id: note.id, kind: note.kind, text: note.text, where: note.where ?? '' })} data-action="edit-note">Edit</button>
      </footer>
    </article>)}
    {draft ? <form className="lib-kept-form" onSubmit={save} data-note-form="">
      <label className="sr-only" htmlFor={`${id}-text`}>{draft.kind === 'quote' ? 'The passage' : 'Your thought'}</label>
      <textarea id={`${id}-text`} autoFocus rows={draft.kind === 'quote' ? 4 : 3} maxLength={LIBRARY_LIMITS.noteText} value={draft.text}
        placeholder={draft.kind === 'quote' ? 'The passage, word for word' : 'What it made you think'} onChange={event => setDraft({ ...draft, text: event.target.value })} data-action="note-text" />
      <div className="lib-kept-row">
        <input type="text" value={draft.where} maxLength={LIBRARY_LIMITS.where} placeholder={draft.kind === 'quote' ? 'Page' : 'Where (optional)'} aria-label="Page or place in the work" onChange={event => setDraft({ ...draft, where: event.target.value })} data-action="note-where" />
        {draft.id && <button type="button" className="lib-quiet is-danger" onClick={() => { onChange(current => removeNote(current, draft.id!)); setDraft(null); }} data-action="remove-note">Remove</button>}
        <button type="button" className="lib-quiet" onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
        <button type="submit" className="lib-open" disabled={!draft.text.trim()} data-action="save-note">Keep</button>
      </div>
      {error && <p className="lib-error" role="alert">{error}</p>}
    </form> : <div className="lib-kept-add">
      <button type="button" className="lib-quiet" onClick={() => setDraft({ kind: 'quote', text: '', where: '' })} data-action="add-quote"><Glyph name="plus" />A passage</button>
      <button type="button" className="lib-quiet" onClick={() => setDraft({ kind: 'note', text: '', where: '' })} data-action="add-thought"><Glyph name="plus" />A thought</button>
    </div>}
  </section>;
}

function WorkPage({ work, props }: { work: WorkItem; props: ItemSheetProps }) {
  const { library, onChange } = props;
  const entry = work.entry;
  const [choosing, setChoosing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const editable = !!entry && !work.shelf;
  const kept = !!entry || !!work.shelf;
  const places = work.nodeIds;
  const offer = work.status === 'finished' ? props.caseOffer(places) : undefined;
  const choose = (status: ItemStatus) => {
    setError('');
    const problem = entry || work.shelf ? onChange(current => setStatus(current, work.key, status)) : props.onAdd?.(status) ?? null;
    if (problem) setError(problem);
  };
  const place = (next: string[]) => { if (!entry) return; const problem = onChange(current => setPlaces(current, entry.id, next)); if (problem) setError(problem); };
  const source = entry?.ids.ol ? { label: 'Open Library', url: workUrl(entry.ids.ol) } : entry?.ids.wd ? { label: 'Wikidata', url: itemUrl(entry.ids.wd) } : null;
  const dates = entry ? [
    `Added ${when(entry.addedAt)}`,
    entry.startedAt && (entry.status !== 'want') ? `Started ${when(entry.startedAt)}` : '',
    entry.finishedAt && entry.status === 'finished' ? `${kindVerbs(work.kind).done.replace(' reading', '')} ${when(entry.finishedAt)}` : '',
    entry.rating ? `Rated ${entry.rating} of 5` : '',
  ].filter(Boolean) : [];
  return <>
    <header className="lib-item-head">
      <ItemCover title={work.title} creator={work.creator} cover={work.cover} tone={work.key} size="large" />
      <div>
        <h2>{work.title}</h2>
        <p className="lib-item-by">{[work.creator, work.year].filter(Boolean).join(' · ')}</p>
        <p className="lib-item-format">{work.shelf ? `${work.format} · ${work.shelf.hours}` : work.format}</p>
      </div>
    </header>
    {work.shelf && <p className="lib-claim">{work.shelf.why}</p>}

    <div className="lib-status" role="radiogroup" aria-label="Your status">
      {STATUSES.map(status => <button key={status} type="button" role="radio" aria-checked={work.status === status} className={work.status === status ? 'is-on' : undefined} onClick={() => choose(status)} data-action="item-status" data-status={status}>{statusWord(work.kind, status)}</button>)}
    </div>
    {dates.length > 0 && <p className="lib-item-dates">{dates.join(' · ')}</p>}
    {error && <p className="lib-error" role="alert">{error}</p>}

    {offer && <button type="button" className="lib-case-offer" style={hueStyle(offer)} onClick={() => props.onTryCase(offer)} data-action="try-case" data-node-id={offer}>
      <span>Try a new case</span><b>{nameOf(offer)}</b><Glyph name="arrow" />
    </button>}

    <section className="lib-item-places" aria-label="On your map">
      <h3>On your map</h3>
      <div className="lib-place-pick">
        {places.length ? places.map(nodeId => <PlaceChip key={nodeId} nodeId={nodeId} state={props.placeState(nodeId)} onShow={() => props.onShowPlace(nodeId)} onRemove={editable ? () => place(places.filter(id => id !== nodeId)) : undefined} />)
          : <span className="lib-quiet-note">Not placed</span>}
        {editable && places.length < LIBRARY_LIMITS.chosenPlaces && <button type="button" className="lib-quiet" onClick={() => setChoosing(c => !c)} aria-expanded={choosing} data-action="item-place-add"><Glyph name="plus" />Place</button>}
        {editable && places.length > 0 && <button type="button" className="lib-quiet" onClick={() => place([])} data-action="item-place-clear">Clear</button>}
      </div>
      {choosing && <PlaceFinder exclude={places} onPick={nodeId => { place([...places, nodeId]); setChoosing(false); }} />}
    </section>

    {kept && <Notes target={work.key} library={library} onChange={onChange} />}

    <footer className="lib-sheet-foot">
      {entry && (confirmRemove
        ? <button type="button" className="lib-quiet is-danger" onClick={() => { onChange(current => work.shelf ? setStatus(current, work.key, null) : removeEntry(current, entry.id)); props.onClose(); }} data-action="remove-item">{work.shelf ? 'Take it off' : 'Remove it'}</button>
        : <button type="button" className="lib-quiet" onClick={() => setConfirmRemove(true)} data-action="confirm-remove-item">{work.shelf ? 'Off your list' : 'Remove'}</button>)}
      {work.shelf?.links.map(l => <a key={l.url} className="lib-quiet" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}<Glyph name="external" /></a>)}
      {source && !work.shelf?.links.some(l => l.label === source.label) && <a className="lib-quiet" href={source.url} target="_blank" rel="noopener noreferrer" data-action="item-source">{source.label}<Glyph name="external" /></a>}
    </footer>
  </>;
}

function LinkPage({ link, props }: { link: SavedLink; props: ItemSheetProps }) {
  const seen = link.preview;
  const places = linkPlaces(link);
  // A video Watch can play (one saved from Watch) plays in Watch; any other YouTube link opens YouTube.
  const youtube = videoIdFromUrl(link.url);
  const poolIds = usePoolIds(!!youtube && !!props.onOpenVideo);
  const video = youtube && poolIds?.has(youtube) ? youtube : null;
  const title = link.note || seen?.title || domainOf(link.url);
  return <>
    {seen?.image && <LinkThumb link={link} size="wide" />}
    <header className="lib-item-head is-link">
      {!seen?.image && <LinkThumb link={link} />}
      <div>
        <h2>{title}</h2>
        <p className="lib-item-by">{seen?.siteName || domainOf(link.url)}{link.note && seen?.title && seen.title !== link.note ? ` · ${seen.title}` : ''}</p>
        <p className="lib-item-format">Saved {when(link.createdAt)}</p>
      </div>
    </header>
    {seen?.description && <p className="lib-claim">{seen.description}</p>}
    {video && props.onOpenVideo
      ? <button type="button" className="lib-open lib-item-open" onClick={() => props.onOpenVideo!(video)} data-action="open-video">Watch</button>
      : <a className="lib-open lib-item-open" href={link.url} target="_blank" rel="noopener noreferrer" data-action="open-link">Open {domainOf(link.url)}<Glyph name="external" /></a>}
    <section className="lib-item-places" aria-label="On your map">
      <h3>On your map</h3>
      <div className="lib-place-pick">
        {places.length ? places.map(id => <PlaceChip key={id} nodeId={id} state={props.placeState(id)} onShow={() => props.onShowPlace(id)} />) : <span className="lib-quiet-note">Not placed</span>}
        <button type="button" className="lib-quiet" onClick={() => props.onEditLink(link)} data-action="item-edit-link">Change</button>
      </div>
    </section>
    <Notes target={`link:${link.id}`} library={props.library} onChange={props.onChange} />
    <footer className="lib-sheet-foot">
      <button type="button" className="lib-quiet" onClick={() => props.onEditLink(link)} data-action="item-edit-link-foot">Edit</button>
    </footer>
  </>;
}

export function ItemSheet(props: ItemSheetProps) {
  const sheet = useRef<HTMLElement>(null);
  useSheetFocus(sheet, props.onClose);
  const label = props.item.kind === 'work' ? props.item.work.title : props.item.link.note || domainOf(props.item.link.url);
  const hue = props.item.kind === 'work' ? props.item.work.nodeIds[0] : props.item.link.nodeId;
  return <div className="lib-sheet-backdrop" onClick={props.onClose}>
    <section ref={sheet} className="lib-sheet lib-item" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} style={hueStyle(hue)} onClick={event => event.stopPropagation()}
      data-item-sheet={props.item.kind === 'work' ? props.item.work.key : `link:${props.item.link.id}`}>
      <span className="lib-grab" aria-hidden="true" />
      <button type="button" className="lib-icon lib-sheet-close" onClick={props.onClose} aria-label="Close"><Glyph name="close" /></button>
      {props.item.kind === 'work' ? <WorkPage work={props.item.work} props={props} /> : <LinkPage link={props.item.link} props={props} />}
    </section>
  </div>;
}
