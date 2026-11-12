import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { catalog } from '../core/catalog';
import { EVOLUTION_ROUTE, EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import type { NotebookEntry } from '../core/notebook';
import type { CheckLedger } from '../checks/ledger';
import type { ExpeditionLedger } from '../expeditions/ledger';
import type { ReelShelf } from '../explore/pins';
import { AddSheet, type FoundItem } from './AddSheet';
import { Glyph, hueStyle, ItemCover, LinkThumb } from './covers';
import { connectEnricher, libraryEnricher, waitingEntries, type EnrichProgress } from './enrich';
import type { ImportPlan } from './importCsv';
import { ItemSheet, statusWord, type SheetItem } from './ItemSheet';
import {
  buildJournal, byPlace, isMine, placeRows, scopeTerritories, searchLibrary, territoryState, within, WORLD_ID,
  type Change, type Journal, type JournalContent, type JournalRow, type LibraryFilter, type LibraryItem, type PlaceState, type ReelLite, type WorkItem,
} from './journal';
import {
  domainOf, entryAt, hasLibraryData, kindVerbs, liveItems, liveLinks, nextStatus, notesFor, setStatus, upsertEntry,
  type ItemStatus, type LibraryStore, type SavedLink,
} from './libraryStore';
import { LinkSheet, type LinkDraft } from './LinkSheet';
import { MindMap, PlaceGlyph } from './MindMap';
import { entryFromBook } from './openLibrary';
import { mapPlaces } from './placeMap';
import { entryFromScreen } from './wikidata';
import { WorldMap } from './WorldMap';
import './library.css';

export interface LibraryWorkspaceProps {
  exp: ExpeditionLedger;
  checks: CheckLedger;
  entries: readonly NotebookEntry[];
  shelf: ReelShelf;
  library: LibraryStore;
  content: JournalContent | null;
  /** The app's clock, for the freshness glow. */
  now?: number;
  onCreate: (kind: 'idea' | 'question', nodeId?: string) => void;
  onEdit: (entry: NotebookEntry) => void;
  onReflect: (entry: NotebookEntry) => void;
  /** Show a place on the atlas. */
  onNavigate: (nodeId: string) => void;
  /** Open a place's page. */
  onOpenPlace: (nodeId: string) => void;
  onOpenReel: (reelId: string) => void;
  /** Play a saved video in Watch. */
  onOpenVideo?: (videoId: string) => void;
  onExport: () => void;
  onImport: (raw: string) => void | Promise<void>;
  /** Returns an error message, or null once kept. */
  onSaveLink: (draft: LinkDraft) => string | null;
  onRemoveLink: (id: string) => void;
  /** Change the library (items, notes, links): merged with what is on disk and saved. Returns an error message or null. */
  onLibraryChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  /** The library as App holds it now, for work that outlives this tab's view (covers arriving). */
  getLibrary: () => LibraryStore;
  /** Open a place's next new case. */
  onTryCase: (nodeId: string) => void;
}

const FILTERS: readonly [LibraryFilter, string][] = [
  ['all', 'All'], ['place', 'Places'], ['reel', 'Reels'], ['work', 'Books & films'], ['link', 'Links'], ['idea', 'Ideas'], ['question', 'Questions'], ['changed', 'Changed your mind'],
];
const WORK_STATUSES: readonly [ItemStatus | 'all', string][] = [['all', 'Everything'], ['started', 'Now'], ['finished', 'Done'], ['want', 'Next'], ['stopped', 'Set down']];
const GROUP_TITLES: Record<LibraryItem['kind'], string> = { place: 'Places', changed: 'Changed your mind', idea: 'Ideas', question: 'Questions', link: 'Links', reel: 'Reels', work: 'Books & films' };
const STATE_WORD: Record<NonNullable<PlaceState>, string> = { lasting: 'Lasting', lit: 'Lit', underway: 'Underway', read: 'Read about' };
const nameOf = (id: string) => id === WORLD_ID ? 'All knowledge' : catalog.get(id)?.name ?? id;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const PAGE = 60;

/** Kept across visits within a session: the map the learner chose to look at. */
let chosenMap: string | null = null;

// --- small pieces ------------------------------------------------------------------------------

function ReelThumb({ reel }: { reel: ReelLite }) {
  return <span className={`lib-reel-thumb${reel.ink ? ' is-ink' : ''}${reel.contain ? ' is-contain' : ''}`} style={hueStyle(reel.nodeId)} aria-hidden="true">
    {reel.image && <img src={reel.image} alt="" loading="lazy" decoding="async" style={reel.contain ? undefined : { objectPosition: reel.position }} />}
  </span>;
}

function Flip({ change }: { change: Change }) {
  return <div className="lib-flip">
    <s>{change.was}</s>
    {change.now && <span>{change.now}</span>}
  </div>;
}

function WorkCover({ work, size = 'medium' }: { work: WorkItem; size?: 'small' | 'medium' | 'large' }) {
  return <ItemCover title={work.title} creator={work.creator} cover={work.cover} tone={work.key} size={size} />;
}

/** "Finished reading May 4", "Watching since Oct 2", "Want to read": where the learner is with it. */
function workLine(work: WorkItem): string {
  const verbs = kindVerbs(work.kind);
  const entry = work.entry;
  if (!entry) return work.shelf ? `${work.shelf.format} · ${work.shelf.hours}` : work.format;
  switch (entry.status) {
    case 'want': return verbs.want;
    case 'started': return entry.startedAt ? `${verbs.doing} since ${day(entry.startedAt)}` : verbs.doing;
    case 'finished': return entry.finishedAt ? `${verbs.done} ${day(entry.finishedAt)}` : verbs.done;
    case 'stopped': return 'Set down';
  }
}

/** The row's one step: add it (as wanted), or move it on to reading, then finished. */
function StepButton({ work, onStep }: { work: WorkItem; onStep: (work: WorkItem, next: ItemStatus) => void }) {
  const next = work.status === null ? 'want' : nextStatus(work.status);
  if (!work.status) return <button type="button" className="lib-icon lib-add-found" onClick={() => onStep(work, 'want')} aria-label={`Add ${work.title} to your list`} data-action="cycle-reading" data-work-key={work.key}><Glyph name="plus" /></button>;
  return <button type="button" className={`lib-step is-${work.status}`} disabled={!next} onClick={() => next && onStep(work, next)}
    aria-label={next ? `${work.title}: ${statusWord(work.kind, work.status)}. Mark as ${statusWord(work.kind, next).toLowerCase()}` : `${work.title}: ${statusWord(work.kind, work.status)}`} data-action="cycle-reading" data-work-key={work.key}>
    {work.status === 'finished' && <Glyph name="check" />}{statusWord(work.kind, work.status)}
  </button>;
}

function CaseOffer({ nodeId, onTry }: { nodeId: string; onTry: (nodeId: string) => void }) {
  return <button type="button" className="lib-case-offer is-inline" style={hueStyle(nodeId)} onClick={() => onTry(nodeId)} data-action="try-case" data-node-id={nodeId}>
    <span>Try a new case</span><b>{nameOf(nodeId)}</b><Glyph name="arrow" />
  </button>;
}

// --- rows ------------------------------------------------------------------------------------

interface RowHandlers {
  props: LibraryWorkspaceProps;
  onPlace: (id: string) => void;
  onEditLink: (link: SavedLink) => void;
  onOpenItem: (key: string) => void;
  onStep: (work: WorkItem, next: ItemStatus) => void;
  offer: { key: string; nodeId: string } | null;
  query: string;
}

function NoteRow({ entry, onEdit, onReflect, onNavigate }: { entry: NotebookEntry } & Pick<LibraryWorkspaceProps, 'onEdit' | 'onReflect' | 'onNavigate'>) {
  const body = entry.body.replace(/\s+/g, ' ');
  const source = entry.sourceLabel || domainOf(entry.sourceUrl);
  return <article className={`lib-row lib-note${entry.kind === 'question' ? ' is-question' : ''}`} data-entry-id={entry.id}>
    <span className="lib-note-mark" aria-hidden="true">{entry.kind === 'question' ? '?' : ''}</span>
    <div className="lib-row-main">
      <h3><button type="button" onClick={() => onEdit(entry)} data-action="open-entry">{entry.title}</button></h3>
      {body && <p className="lib-row-detail">{body.length > 150 ? `${body.slice(0, 150)}…` : body}</p>}
      <p className="lib-row-meta">
        <span>{entry.kind === 'question' ? 'Question' : 'Idea'} · {day(entry.updatedAt)}</span>
        {source && <span>{source}</span>}
        {entry.nodeIds.map(id => catalog.get(id) && <button key={id} type="button" className="lib-topic" style={hueStyle(id)} onClick={() => onNavigate(id)} data-action="notebook-navigate" data-node-id={id}>{nameOf(id)}</button>)}
      </p>
    </div>
    <div className="lib-row-actions">
      <button type="button" className="lib-quiet" onClick={() => onReflect(entry)} data-action="reflect-entry" aria-label={`Revisit ${entry.title}`}>Revisit</button>
      <button type="button" className="lib-quiet" onClick={() => onEdit(entry)} data-action="edit-entry" aria-label={`Edit ${entry.title}`}>Edit</button>
    </div>
  </article>;
}

/** The passage behind a search hit, when the words were found in one. */
function keptMatch(library: LibraryStore, key: string, query: string): string | null {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!terms.length) return null;
  const note = notesFor(library, key).find(n => terms.some(t => n.text.toLocaleLowerCase().includes(t)));
  if (!note) return null;
  const at = Math.max(0, note.text.toLocaleLowerCase().indexOf(terms.find(t => note.text.toLocaleLowerCase().includes(t))!) - 40);
  return `${at > 0 ? '…' : ''}${note.text.slice(at, at + 140).trim()}${note.text.length > at + 140 ? '…' : ''}`;
}

function WorkRow({ work, handlers }: { work: WorkItem; handlers: RowHandlers }) {
  const kept = handlers.query ? keptMatch(handlers.props.library, work.key, handlers.query) : null;
  const offer = handlers.offer?.key === work.key ? handlers.offer.nodeId : null;
  return <div className="lib-row-wrap" data-work-key={work.key} data-work-id={work.shelf?.id}>
    <div className="lib-row lib-work-row">
      <button type="button" className="lib-row-open" onClick={() => handlers.onOpenItem(work.key)} data-action="open-item">
        <WorkCover work={work} size="small" />
        <span className="lib-row-main">
          <strong>{work.title}</strong>
          <small>{[work.creator, work.year].filter(Boolean).join(' · ')}</small>
          {kept ? <small className="lib-row-kept">“{kept}”</small> : <small className={work.entry ? 'is-marked' : undefined}>{workLine(work)}</small>}
        </span>
      </button>
      <StepButton work={work} onStep={handlers.onStep} />
    </div>
    {offer && <CaseOffer nodeId={offer} onTry={handlers.props.onTryCase} />}
  </div>;
}

function LinkRow({ link, handlers }: { link: SavedLink; handlers: RowHandlers }) {
  const title = link.note || link.preview?.title || domainOf(link.url);
  const kept = handlers.query ? keptMatch(handlers.props.library, `link:${link.id}`, handlers.query) : null;
  return <div className="lib-row" data-link-id={link.id}>
    <button type="button" className="lib-row-open" onClick={() => handlers.onOpenItem(`link:${link.id}`)} data-action="open-link-item">
      <LinkThumb link={link} />
      <span className="lib-row-main">
        <strong>{title}</strong>
        {kept ? <small className="lib-row-kept">“{kept}”</small> : <small>{link.preview?.siteName || domainOf(link.url)}{link.nodeId ? ` · ${nameOf(link.nodeId)}` : ''}</small>}
      </span>
    </button>
    <button type="button" className="lib-quiet" onClick={() => handlers.onEditLink(link)} data-action="edit-link" aria-label={`Edit ${title}`}>Edit</button>
  </div>;
}

function ItemRow({ item, handlers }: { item: LibraryItem; handlers: RowHandlers }) {
  const { props, onPlace } = handlers;
  switch (item.kind) {
    case 'idea': case 'question':
      return <NoteRow entry={item.entry} onEdit={props.onEdit} onReflect={props.onReflect} onNavigate={props.onNavigate} />;
    case 'place':
      return <button type="button" className="lib-row is-button" style={hueStyle(item.nodeId)} onClick={() => onPlace(item.nodeId)} data-action="open-place" data-place-id={item.nodeId}>
        {item.state === 'lit' || item.state === 'lasting' ? <PlaceGlyph nodeId={item.nodeId} size={40} /> : <span className={`lib-place-dot${item.state ? ` is-${item.state}` : ''}`} aria-hidden="true" />}
        <span className="lib-row-main"><strong>{item.title}</strong><small>{item.detail}</small></span>
        {item.state && <span className={`lib-state is-${item.state}`}>{STATE_WORD[item.state]}</span>}
      </button>;
    case 'reel':
      return <button type="button" className="lib-row is-button" onClick={() => props.onOpenReel(item.reel.id)} data-action="library-reel" data-reel-id={item.reel.id}>
        <ReelThumb reel={item.reel} />
        <span className="lib-row-main"><strong>{item.title}</strong><small>{item.detail}{item.pinnedAt ? ` · kept ${day(item.pinnedAt)}` : ''}</small></span>
      </button>;
    case 'work':
      return <WorkRow work={item.work} handlers={handlers} />;
    case 'link':
      return <LinkRow link={item.link} handlers={handlers} />;
    case 'changed':
      return <button type="button" className="lib-row is-button is-flip" style={hueStyle(item.change.nodeId)} onClick={() => onPlace(item.change.nodeId)} data-action="open-change">
        <span className="lib-row-main">
          <small className="lib-what">{nameOf(item.change.nodeId)} · {day(item.change.missedAt)} → {day(item.change.rightAt)}</small>
          <Flip change={item.change} />
        </span>
      </button>;
  }
}

/** A dated journal line: the day, what happened, and what to show beside it. */
function DatedRow({ row, showMonth, handlers }: { row: JournalRow; showMonth: boolean; handlers: RowHandlers }) {
  const { props } = handlers;
  const date = new Date(row.at);
  const item = row.item;
  const open = () => {
    if (!item) return;
    if (item.kind === 'reel') props.onOpenReel(item.reel.id);
    else if (item.kind === 'idea' || item.kind === 'question') props.onEdit(item.entry);
    else if (item.kind === 'link') handlers.onOpenItem(`link:${item.link.id}`);
    else if (item.kind === 'work') handlers.onOpenItem(item.work.key);
  };
  const clickable = item && ['reel', 'idea', 'question', 'link', 'work'].includes(item.kind);
  const thumb = item?.kind === 'reel' ? <ReelThumb reel={item.reel} /> : item?.kind === 'work' ? <WorkCover work={item.work} size="small" /> : row.lit && row.nodeId ? <PlaceGlyph nodeId={row.nodeId} size={46} /> : item?.kind === 'link' ? <LinkThumb link={item.link} /> : null;
  return <>
    {showMonth && <h3 className="lib-month">{date.toLocaleDateString(undefined, { month: 'long', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}</h3>}
    <article className={`lib-dated${row.lit ? ' is-lit' : ''}`} style={hueStyle(row.nodeId)} data-row={row.key}>
      <time dateTime={row.at}><b>{date.getDate()}</b><small>{date.toLocaleDateString(undefined, { weekday: 'short' })}</small></time>
      <div className="lib-row-main">
        <p className="lib-what">{row.what}</p>
        {row.change ? <><p className="lib-prompt">{row.change.prompt}</p><Flip change={row.change} /></>
          : clickable ? <h4><button type="button" onClick={open}>{row.title}</button></h4> : <h4>{row.title}</h4>}
        {row.detail && <p className="lib-row-detail">{row.detail}</p>}
        {row.quote && <blockquote>{row.quote}</blockquote>}
      </div>
      {thumb}
    </article>
  </>;
}

function DatedRows({ rows, handlers }: { rows: readonly JournalRow[]; handlers: RowHandlers }) {
  return <div className="lib-dated-list">{rows.map((row, i) => {
    const month = (iso: string) => iso.slice(0, 7);
    return <DatedRow key={row.key} row={row} handlers={handlers} showMonth={i === 0 || month(rows[i - 1].at) !== month(row.at)} />;
  })}</div>;
}

// --- the place sheet ---------------------------------------------------------------------------

function PlaceSheet({ journal, nodeId, handlers, canShowInside, onClose, onAddLink, onShowInside }: {
  journal: Journal; nodeId: string; handlers: RowHandlers; canShowInside: boolean; onClose: () => void; onAddLink: () => void; onShowInside: () => void;
}) {
  const { props } = handlers;
  const node = catalog.get(nodeId);
  const sheet = useRef<HTMLElement>(null);
  const status = journal.status.get(nodeId);
  const state = territoryState(journal.status, nodeId);
  const rows = useMemo(() => placeRows(journal, nodeId), [journal, nodeId]);
  const also = useMemo(() => journal.items.filter(item => (item.kind === 'reel' || item.kind === 'work') && (!isMine(item) || (item.kind === 'work' && item.work.status === 'want')) && item.nodeIds.some(id => within(id, nodeId))), [journal, nodeId]);
  const readHere = useMemo(() => journal.items.filter(item => item.kind === 'work' && item.work.status && item.work.status !== 'want' && item.nodeIds.some(id => within(id, nodeId))).length, [journal, nodeId]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheet.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('keydown', key, true); opener?.focus?.({ preventScroll: true }); };
  }, [onClose]);
  if (!node) return null;
  const reading = readHere ? `Read about in ${readHere} ${readHere === 1 ? 'item' : 'items'}` : '';
  const lit = status?.lastingAt ? `Lit ${day(status.litAt!)} · Lasting ${day(status.lastingAt)}` : status?.litAt ? `Lit ${day(status.litAt)}` : null;
  const when = lit ? (status?.ready ? `${lit} · Ready to refresh` : lit) : state === 'underway' ? 'Underway' : state === 'read' ? '' : 'Not explored yet';
  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet" role="dialog" aria-modal="true" aria-label={node.name} tabIndex={-1} style={hueStyle(nodeId)} onClick={event => event.stopPropagation()} data-place-sheet={nodeId}>
      <span className="lib-grab" aria-hidden="true" />
      <header className="lib-sheet-head">
        {(state === 'lit' || state === 'lasting') && <PlaceGlyph nodeId={nodeId} size={54} />}
        <div><h2>{node.name}</h2><p className={state ? `is-${state}` : undefined}>{[when, reading].filter(Boolean).join(' · ')}</p></div>
        <button type="button" className="lib-icon" onClick={onClose} aria-label="Close"><Glyph name="close" /></button>
      </header>
      {(node as { description?: string }).description && <p className="lib-claim">{(node as { description?: string }).description}</p>}
      {rows.length > 0 && <DatedRows rows={rows.slice(0, 40)} handlers={handlers} />}
      {also.length > 0 && <section className="lib-also"><h3>Also here</h3>{also.slice(0, 8).map(item => <ItemRow key={item.key} item={item} handlers={{ ...handlers, onPlace: () => undefined }} />)}</section>}
      <footer className="lib-sheet-foot">
        <button type="button" className="lib-quiet" onClick={onAddLink} data-action="sheet-add-link"><Glyph name="plus" />Save a link here</button>
        {canShowInside && <button type="button" className="lib-quiet" onClick={onShowInside} data-action="sheet-show-map">Your map of it</button>}
        <button type="button" className="lib-open" onClick={() => props.onOpenPlace(nodeId)} data-action="sheet-open-place">Open {node.name}</button>
      </footer>
    </section>
  </div>;
}

// --- the page ----------------------------------------------------------------------------------

function Shelf({ id, title, count, onMore, actions, children }: { id: string; title: string; count?: number; onMore?: () => void; actions?: ReactNode; children: ReactNode }) {
  const head = useId();
  return <section className="lib-shelf" aria-labelledby={head} data-notebook-section={id}>
    <header>
      <h2 id={head}>{onMore ? <button type="button" onClick={onMore}>{title}</button> : title}{count !== undefined && count > 0 && <small>{count}</small>}</h2>
      {actions}
    </header>
    {children}
  </section>;
}

function CoverStrip({ works, onOpen, more }: { works: readonly WorkItem[]; onOpen: (key: string) => void; more?: { count: number; onMore: () => void } }) {
  return <ul className="lib-strip is-covers">
    {works.map(work => <li key={work.key}>
      <button type="button" className="lib-cover-card" onClick={() => onOpen(work.key)} data-action="open-item" data-work-key={work.key} aria-label={work.title}>
        <WorkCover work={work} />
        <span className="lib-cover-title">{work.title}</span>
        <span>{workLine(work)}</span>
      </button>
    </li>)}
    {more && more.count > 0 && <li><button type="button" className="lib-cover-more" onClick={more.onMore}>All {more.count}</button></li>}
  </ul>;
}

function caption(territories: readonly { name: string; state: PlaceState }[], world: boolean): string {
  const lit = territories.filter(t => t.state === 'lit' || t.state === 'lasting');
  const underway = territories.filter(t => t.state === 'underway');
  const read = territories.filter(t => t.state === 'read');
  const parts = [
    lit.length ? `${lit.length} of ${territories.length} lit` : '',
    underway.length === 1 ? `${underway[0].name} underway` : underway.length ? `${underway.length} underway` : '',
    read.length ? `${read.length} read about` : '',
  ].filter(Boolean);
  return parts.join(' · ') || (world ? 'Nothing here yet' : 'Nothing lit yet');
}

function EnrichLine({ progress, summary, count }: { progress: EnrichProgress; summary: { added: number; placed: number; source: string } | null; count: { done: number; total: number } }) {
  const active = progress.state === 'running' || (progress.state === 'paused' && progress.waiting > 0);
  if (!active && !summary) return null;
  if (!active && summary) return <p className="lib-enrich is-done" role="status" data-enrich="done">{summary.added} from {summary.source} · {summary.placed} on your map</p>;
  const left = progress.waiting;
  const { done, total } = count;
  const share = total ? Math.min(1, done / total) : 0;
  const words = progress.state === 'running' ? `Finding covers and places · ${done} of ${total}`
    : progress.reason === 'offline' ? `Paused while offline · ${left} left`
      : progress.reason === 'elsewhere' ? 'Finishing in another tab'
        : `Open Library is busy · ${left} left`;
  return <div className={`lib-enrich is-${progress.state}`} role="status" data-enrich={progress.state}>
    <span className="lib-enrich-bar" aria-hidden="true"><i style={{ width: `${Math.round(share * 100)}%` }} /></span>
    <span>{words}</span>
  </div>;
}

export function LibraryWorkspace(props: LibraryWorkspaceProps) {
  const { exp, checks, entries, shelf, library, content, now } = props;
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now }), [exp, checks, entries, shelf, library, content, now]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [workStatus, setWorkStatus] = useState<ItemStatus | 'all'>('all');
  const [scope, setScope] = useState<string | null>(null);
  const [mapAt, setMapAtState] = useState<string | null>(chosenMap && catalog.get(chosenMap) ? chosenMap : null);
  const [view, setView] = useState<'map' | 'places'>('map');
  const [sheet, setSheet] = useState<string | null>(null);
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState<{ nodeId: string | null } | null>(null);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [notice, setNotice] = useState('');
  const [importing, setImporting] = useState(false);
  const [allNotes, setAllNotes] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [offer, setOffer] = useState<{ key: string; nodeId: string } | null>(null);
  // A row moved on from inside a status filter stays in view until the filter changes.
  const [stepped, setStepped] = useState<ReadonlySet<string>>(new Set());
  const [imported, setImported] = useState<{ added: number; source: string; ids: string[]; total: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const searchId = useId();

  // Covers and subjects for imported books arrive in the background, in this tab or another.
  connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); });
  const enricher = libraryEnricher();
  const [progress, setProgress] = useState<EnrichProgress>(enricher.progress);
  useEffect(() => enricher.subscribe(setProgress), [enricher]);
  useEffect(() => {
    if (waitingEntries(props.getLibrary()).length) void enricher.start();
    const online = () => { if (waitingEntries(props.getLibrary()).length) void enricher.start(); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [enricher, props.getLibrary]);

  const setMapAt = (id: string | null) => { chosenMap = id; setMapAtState(id); };
  const mapId = mapAt ?? journal.field.nodeId;
  const territories = useMemo(() => mapId === journal.field.nodeId ? journal.field.territories : scopeTerritories(journal.status, mapId), [journal, mapId]);
  const trail = mapId === WORLD_ID ? [] : [WORLD_ID, ...(catalog.get(mapId) ? catalog.getPath(catalog.get(mapId)!).slice(1, -1).map(n => n.id) : [])];

  const browsing = !query.trim() && filter === 'all' && !scope;
  const results = useMemo(() => {
    if (browsing) return [];
    const found = searchLibrary(journal, { query, filter, place: scope });
    return filter === 'work' && workStatus !== 'all' ? found.filter(item => item.kind === 'work' && (item.work.status === workStatus || stepped.has(item.key))) : found;
  }, [browsing, journal, query, filter, scope, workStatus, stepped]);
  const groups = useMemo(() => {
    const map = new Map<LibraryItem['kind'], LibraryItem[]>();
    for (const item of results) map.set(item.kind, [...(map.get(item.kind) ?? []), item]);
    return [...map];
  }, [results]);
  useEffect(() => { setShown(PAGE); setStepped(new Set()); setOffer(null); }, [query, filter, scope, workStatus]);

  const notes = entries.filter(entry => !entry.id.startsWith('stuck.')).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const kept = journal.items.filter((item): item is Extract<LibraryItem, { kind: 'reel' }> => item.kind === 'reel' && !!item.pinnedAt).sort((a, b) => b.pinnedAt!.localeCompare(a.pinnedAt!));
  const pinnedFallback = !content && shelf.pinned.length > 0;
  const works = journal.items.filter((item): item is Extract<LibraryItem, { kind: 'work' }> => item.kind === 'work').map(item => item.work);
  const by = (status: ItemStatus, date: (w: WorkItem) => string | undefined) => works.filter(w => w.status === status).sort((a, b) => (date(b) ?? '').localeCompare(date(a) ?? '') || a.title.localeCompare(b.title));
  const readingNow = by('started', w => w.entry?.startedAt ?? w.entry?.addedAt);
  const finished = by('finished', w => w.entry?.finishedAt ?? w.entry?.addedAt);
  const wanted = by('want', w => w.entry?.addedAt);
  const links = liveLinks(library).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lit = territories.filter(t => t.state === 'lit' || t.state === 'lasting');
  const places = useMemo(() => byPlace(journal, territories), [journal, territories]);
  const nothingYet = !journal.status.size && !notes.length && !links.length && !liveItems(library).length && !shelf.pinned.length;
  const firstPlace = (() => { const code = EVOLUTION_ROUTE[0]; const t = EVOLUTION_TERRITORIES.find(x => x.code === code); return t ? evolutionTerritoryId(t.key) : null; })();

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setNotice('');
    setImporting(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a backup smaller than 5 MB.');
      await props.onImport(await file.text());
      setNotice('Imported. Everything already here is kept.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'This file could not be imported. Try a library JSON backup.');
    } finally { setImporting(false); }
  }
  function exportAll() {
    setNotice('');
    try { props.onExport(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Your library could not be exported. Please try again.'); }
  }
  const openPlace = useCallback((nodeId: string) => setSheet(nodeId), []);
  const editLink = (link: SavedLink) => setLinkSheet({ link });
  const openItem = (key: string) => { setPreview(null); setItemKey(key); };
  const step = (work: WorkItem, next: ItemStatus) => {
    const problem = props.onLibraryChange(current => setStatus(current, work.key, next));
    if (problem) { setNotice(problem); return; }
    setStepped(current => new Set([...current, work.key]));
    // Finishing something whose place has new cases: one quiet offer, right there.
    const nodeId = next === 'finished' ? content?.caseOffer(work.nodeIds, checks) : undefined;
    setOffer(nodeId ? { key: work.key, nodeId } : null);
  };
  const addFound = (found: FoundItem, status: ItemStatus): { key: string } | { error: string } => {
    const now = new Date().toISOString();
    const entry = found.source === 'ol' ? entryFromBook(found, status, now) : entryFromScreen(found, status, now);
    const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
    const problem = props.onLibraryChange(current => {
      const existing = entryAt(current, key);
      return existing ? setStatus(current, key, status, now) : upsertEntry(current, entry, now);
    });
    return problem ? { error: problem } : { key };
  };
  const handlers: RowHandlers = { props, onPlace: openPlace, onEditLink: editLink, onOpenItem: openItem, onStep: step, offer, query };

  // The item page: a work or a link from the journal (kept live as the library changes), or a search result not added yet.
  const sheetItem: SheetItem | null = useMemo(() => {
    if (itemKey?.startsWith('link:')) { const link = liveLinks(library).find(l => `link:${l.id}` === itemKey); return link ? { kind: 'link', link } : null; }
    if (itemKey) { const work = works.find(w => w.key === itemKey); return work ? { kind: 'work', work } : null; }
    if (preview) {
      const places = preview.source === 'ol' ? mapPlaces({ title: preview.title, subjects: preview.subjects }) : mapPlaces({ title: preview.title, mainSubjects: preview.mainSubjects, genres: preview.genres, pageText: preview.description });
      const work: WorkItem = {
        key: preview.source === 'ol' ? `entry:ol-${preview.workId}` : `entry:wd-${preview.qid}`, shelf: null, entry: null, title: preview.title, creator: preview.creator, year: preview.year,
        kind: preview.source === 'ol' ? 'book' : preview.kind, format: preview.source === 'ol' ? 'Book' : preview.format, cover: preview.source === 'ol' ? preview.cover : null,
        status: null, nodeIds: places.map(p => p.nodeId), url: null,
      };
      return { kind: 'work', work };
    }
    return null;
  // works is derived from journal on every render; journal and library are what change it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, preview, journal, library]);

  const onImported = ({ plan, source, lookup }: { plan: ImportPlan; source: 'goodreads' | 'storygraph'; lookup: string[] }) => {
    setAdding(null);
    setMapAt(null);
    setView('map');
    setImported({ added: plan.added, source: source === 'goodreads' ? 'Goodreads' : 'The StoryGraph', ids: lookup, total: lookup.length });
    void enricher.start();
    // Back to the top, where the map is: the first thing an import should show is the learner's map.
    requestAnimationFrame(() => mapRef.current?.closest<HTMLElement>('.notebook-workspace')?.scrollTo({ top: 0, behavior: 'smooth' }));
  };
  const summary = imported && progress.state === 'done' ? {
    added: imported.added, source: imported.source,
    placed: imported.ids.filter(id => (library.items.find(item => item.id === id)?.places.length ?? 0) > 0).length,
  } : null;

  const map = <section className={`lib-mine${browsing ? '' : ' is-searching'}`} aria-label="Your map" ref={mapRef}>
    {trail.length > 0 && <nav className="lib-trail" aria-label="Your map, wider">
      {trail.map(id => <button key={id} type="button" onClick={() => setMapAt(id)} data-action="map-up" data-node-id={id}>{nameOf(id)}</button>)}
    </nav>}
    <header className="lib-mine-head">
      <h2><button type="button" onClick={() => setScope(mapId === WORLD_ID ? null : mapId)} data-action="scope-field">{nameOf(mapId)}</button></h2>
      <p>{caption(territories, mapId === WORLD_ID)}</p>
      <div className="lib-views" role="group" aria-label="View">
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')} data-action="view-map">Map</button>
        <button type="button" aria-pressed={view === 'places'} onClick={() => setView('places')} data-action="view-places">By place</button>
      </div>
    </header>
    {view === 'map'
      ? <div className="lib-map-frame">{mapId === WORLD_ID
        ? <WorldMap fields={territories} selected={sheet} onSelect={openPlace} />
        : <MindMap fieldId={mapId} territories={territories} selected={sheet} onSelect={openPlace} />}</div>
      : places.length ? <div className="lib-places">{places.map(place => <button key={place.nodeId} type="button" className="lib-row is-button" style={hueStyle(place.nodeId)} onClick={() => openPlace(place.nodeId)} data-action="open-place" data-place-id={place.nodeId}>
        {place.state === 'lit' || place.state === 'lasting' ? <PlaceGlyph nodeId={place.nodeId} size={40} /> : <span className={`lib-place-dot${place.state ? ` is-${place.state}` : ''}`} aria-hidden="true" />}
        <span className="lib-row-main"><strong>{place.name}</strong><small>{[place.state && STATE_WORD[place.state], place.count ? `${place.count} kept` : ''].filter(Boolean).join(' · ')}</small></span>
      </button>)}</div>
        : <div className="lib-places is-empty">{territories.slice(0, 24).map(t => <button key={t.nodeId} type="button" className="lib-row is-button" onClick={() => openPlace(t.nodeId)} data-action="open-place" data-place-id={t.nodeId}><span className="lib-place-dot" aria-hidden="true" /><span className="lib-row-main"><strong>{t.name}</strong></span></button>)}</div>}
    <EnrichLine progress={progress} summary={summary} count={imported
      ? { total: imported.ids.length, done: imported.ids.filter(id => library.items.find(item => item.id === id)?.enrich !== 'pending').length }
      : { total: progress.total, done: progress.finished }} />
    {nothingYet && firstPlace && <button type="button" className="lib-way-in" style={hueStyle(firstPlace)} onClick={() => props.onOpenPlace(firstPlace)} data-action="library-begin">Begin with {nameOf(firstPlace)}</button>}
  </section>;

  return (
    <section className="lib" data-workspace="notebook">
      <header className="lib-head">
        <h1>Library</h1>
      </header>

      <div className="lib-layout">
        <div className="lib-find">
          <label className="lib-search" htmlFor={searchId}>
            <Glyph name="search" />
            <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your books, films, links, notes, places" aria-label="Search your library" data-action="notebook-search" enterKeyHint="search" autoComplete="off" />
            {query && <button type="button" className="lib-icon" onClick={() => setQuery('')} aria-label="Clear search"><Glyph name="close" /></button>}
          </label>
          <div className="lib-kinds" role="group" aria-label="Show">
            {FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'is-active' : undefined} aria-pressed={filter === value} onClick={() => setFilter(value)} data-action="notebook-filter" data-filter={value}>{label}</button>)}
          </div>
          {filter === 'work' && <div className="lib-kinds is-sub" role="group" aria-label="Where you are with them">
            {WORK_STATUSES.map(([value, label]) => <button key={value} type="button" className={workStatus === value ? 'is-active' : undefined} aria-pressed={workStatus === value} onClick={() => setWorkStatus(value)} data-action="work-status-filter" data-status={value}>{label}</button>)}
          </div>}
          {scope && <p className="lib-scope" style={hueStyle(scope)}>In {nameOf(scope)}<button type="button" className="lib-icon" onClick={() => setScope(null)} aria-label={`Search everywhere, not only in ${nameOf(scope)}`}><Glyph name="close" /></button></p>}
          {notice && <p className="notebook-notice lib-notice" role="status">{notice}</p>}
        </div>

        {map}

        <div className="lib-content">
          {browsing ? <>
            {readingNow.length > 0 && <Shelf id="reading-now" title="Reading and watching" count={readingNow.length} onMore={() => { setFilter('work'); setWorkStatus('started'); }}>
              <CoverStrip works={readingNow.slice(0, 16)} onOpen={openItem} more={readingNow.length > 16 ? { count: readingNow.length, onMore: () => { setFilter('work'); setWorkStatus('started'); } } : undefined} />
            </Shelf>}

            {(kept.length > 0 || pinnedFallback) && <Shelf id="pinned-reels" title="Reels you kept" count={kept.length || shelf.pinned.length} onMore={() => setFilter('reel')}>
              <ul className="lib-strip">{kept.map(item => <li key={item.key}>
                <button type="button" className="lib-reel-card" onClick={() => props.onOpenReel(item.reel.id)} data-action="notebook-reel" data-reel-id={item.reel.id} aria-label={`Watch ${item.title}`}>
                  <ReelThumb reel={item.reel} /><span>{item.title}</span>
                </button>
              </li>)}</ul>
            </Shelf>}

            {journal.changes.length > 0 && <Shelf id="changed" title="Changed your mind" count={journal.changes.length} onMore={() => setFilter('changed')}>
              {journal.changes.slice(0, 2).map(change => <button key={change.key} type="button" className="lib-row is-button is-flip" style={hueStyle(change.nodeId)} onClick={() => openPlace(change.nodeId)} data-action="open-change">
                <span className="lib-row-main"><Flip change={change} /><small className="lib-what">{nameOf(change.nodeId)} · {day(change.rightAt)}</small></span>
              </button>)}
            </Shelf>}

            {finished.length > 0 && <Shelf id="read-watched" title="Read and watched" count={finished.length} onMore={() => { setFilter('work'); setWorkStatus('finished'); }}>
              <CoverStrip works={finished.slice(0, 16)} onOpen={openItem} more={finished.length > 16 ? { count: finished.length, onMore: () => { setFilter('work'); setWorkStatus('finished'); } } : undefined} />
            </Shelf>}

            {wanted.length > 0 && <Shelf id="next" title="Next" count={wanted.length} onMore={() => { setFilter('work'); setWorkStatus('want'); }}>
              <CoverStrip works={wanted.slice(0, 16)} onOpen={openItem} more={wanted.length > 16 ? { count: wanted.length, onMore: () => { setFilter('work'); setWorkStatus('want'); } } : undefined} />
            </Shelf>}

            {links.length > 0 && <Shelf id="links" title="Saved links" count={links.length} onMore={() => setFilter('link')}>
              {links.slice(0, 4).map(link => <LinkRow key={link.id} link={link} handlers={handlers} />)}
            </Shelf>}

            <Shelf id="notes" title="Ideas and questions" count={notes.length} actions={<div className="lib-shelf-actions">
              <button type="button" className="lib-quiet" onClick={() => props.onCreate('idea')} data-action="create-entry"><Glyph name="plus" />Idea</button>
              <button type="button" className="lib-quiet" onClick={() => props.onCreate('question')} data-action="create-question"><Glyph name="plus" />Question</button>
            </div>}>
              {notes.slice(0, allNotes ? undefined : 12).map(entry => <NoteRow key={entry.id} entry={entry} onEdit={props.onEdit} onReflect={props.onReflect} onNavigate={props.onNavigate} />)}
              {notes.length > 12 && !allNotes && <button type="button" className="lib-quiet lib-more" onClick={() => setAllNotes(true)}>All {notes.length}</button>}
            </Shelf>

            {journal.rows.length > 0 && <Shelf id="journal" title="Lately">
              <DatedRows rows={journal.rows.filter(row => row.item?.kind !== 'idea' && row.item?.kind !== 'question').slice(0, 30)} handlers={handlers} />
            </Shelf>}
          </> : <div className="lib-results" aria-live="polite">
            {groups.length === 0 && <p className="lib-none">Nothing matches{query ? ` “${query.trim()}”` : ''}.</p>}
            {groups.map(([kind, items]) => {
              const limit = kind === 'place' && filter === 'all' ? 6 : shown;
              return <section key={kind} className="lib-group" data-group={kind}>
                <h2>{GROUP_TITLES[kind]}<small>{items.length}</small></h2>
                {items.slice(0, limit).map(item => <ItemRow key={item.key} item={item} handlers={handlers} />)}
                {kind === 'place' && filter === 'all' && items.length > 6 && <button type="button" className="lib-quiet lib-more" onClick={() => setFilter('place')}>All {items.length} places</button>}
                {!(kind === 'place' && filter === 'all') && items.length > limit && <button type="button" className="lib-quiet lib-more" onClick={() => setShown(n => n + PAGE * 2)}>More</button>}
              </section>;
            })}
          </div>}

          <footer className="lib-foot">
            <button type="button" disabled={importing} onClick={() => fileInput.current?.click()} data-action="notebook-import">{importing ? 'Importing…' : 'Import'}</button>
            <button type="button" disabled={!entries.length && !hasLibraryData(library)} onClick={exportAll} data-action="notebook-export">Export</button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Import a notebook backup" onChange={importFile} />
          </footer>
        </div>
      </div>

      <button type="button" className="lib-add" onClick={() => setAdding({ nodeId: scope })} aria-label="Add to your library" data-action="add-link"><Glyph name="plus" /></button>

      {sheet && <PlaceSheet journal={journal} nodeId={sheet} handlers={handlers} canShowInside={catalog.getChildren(catalog.get(sheet)!).length > 0 && sheet !== mapId}
        onClose={() => setSheet(null)} onAddLink={() => setLinkSheet({ nodeId: sheet })}
        onShowInside={() => { setMapAt(sheet); setView('map'); setSheet(null); requestAnimationFrame(() => mapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); }} />}
      {adding && <AddSheet library={library} initialNodeId={adding.nodeId} onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
        onOpenFound={found => { setItemKey(null); setPreview(found); }} onOpenItem={openItem} onImported={onImported} onClose={() => setAdding(null)} />}
      {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(journal.status, nodeId)}
        caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
        onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
        onTryCase={props.onTryCase} onShowPlace={nodeId => { setItemKey(null); setPreview(null); setAdding(null); setSheet(nodeId); }}
        onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
      {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </section>
  );
}
