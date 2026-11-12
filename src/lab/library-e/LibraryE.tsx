import { memo, startTransition, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import type { NotebookEntry } from '../../core/notebook';
import type { CheckLedger } from '../../checks/ledger';
import type { CheckSession, CheckStatus } from '../../checks/progress';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import { packPlace } from '../../expeditions/manifest';
import type { ReelShelf } from '../../explore/pins';
import { commonsAtWidth } from '../../explore/media';
import { loadFeedMemory } from '../../feed/memory';
import { usePoolIds } from '../../feed/usePool';
import { loadContent, loadedContent, type Content } from '../../contentLoader';
import { AddSheet, type FoundItem } from '../../notebook/AddSheet';
import { connectEnricher, libraryEnricher, waitingEntries } from '../../notebook/enrich';
import { ItemSheet, useSheetFocus, type SheetItem } from '../../notebook/ItemSheet';
import type { AutoProof } from '../../auto/proof';
import { buildJournal, territoryState, within, type JournalContent, type WorkItem } from '../../notebook/journal';
import { entryAt, setStatus, upsertEntry, type ItemStatus, type LibraryStore, type SavedLink } from '../../notebook/libraryStore';
import { LinkSheet, type LinkDraft } from '../../notebook/LinkSheet';
import { entryFromBook } from '../../notebook/openLibrary';
import { mapPlaces } from '../../notebook/placeMap';
import { entryFromScreen } from '../../notebook/wikidata';
import '../../notebook/library.css';
import {
  createCollection, liveCollections, loadCollections, mergeCollections, readCollections, removeCollection, renameCollection, saveCollections, setCollectionItems,
  COLLECTIONS_KEY, type Collection, type CollectionStore,
} from '../library-c/collections';
import { begunPlaces, piecesOf, proofFor, type Piece } from '../library-c/mosaic';
import {
  activityOf, byRecent, bylineOf, chipOf, chipsFor, CHIP_WORD, hayOf, highlight, kindWord, lettered, matchScore, placeAction, placeBook, proofLine, provedOrder, stepWord, termsOf, things,
  type Chip, type Hay, type PlaceAction, type PlaceInfo,
} from './model';
import './library-e.css';
import { LAB_HASH } from './route';

/*
 * Prototype E of the Library, "Your Library": the learner's things kept the way a music app keeps a
 * library, in MoK's warm ink and book face. Kind chips at the top, a shelf of places (round pictures)
 * and collections (four-up squares), then one list sorted Recent or A–Z. Behind the shelf, every place
 * by subject and field with whole counts. The Atlas shows only as a place's own colour: a ring round a
 * place proved, and in every row the place it lives in, its dot filled once that land is lit.
 * Real records only: the library, notebook, ledgers, reel shelf and Watch's memory, through their own
 * modules; it writes only collections (library-c/collections.ts) and the library's own sheets.
 */

export interface LibraryEProps {
  /** Places proved on their generated pages. */
  autoProofs?: readonly AutoProof[];
  exp: ExpeditionLedger;
  checks: CheckLedger;
  now?: number;
  entries: readonly NotebookEntry[];
  shelf: ReelShelf;
  library: LibraryStore;
  content: JournalContent | null;
  onEdit: (entry: NotebookEntry) => void;
  /** Fly the Atlas to a place. */
  onNavigate: (nodeId: string) => void;
  onOpenReel: (reelId: string) => void;
  onOpenVideo: (videoId: string) => void;
  onSaveLink: (draft: LinkDraft) => string | null;
  onRemoveLink: (id: string) => void;
  onLibraryChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  getLibrary: () => LibraryStore;
  /** A place's next case, its check, or its refresh. */
  onTryCase: (nodeId: string) => void;
  onOpenExpedition: (packId: string) => void;
}

type Screen = { kind: 'home' } | { kind: 'index' } | { kind: 'place'; id: string } | { kind: 'collection'; id: string } | { kind: 'unplaced' };
type Sort = 'recent' | 'az' | 'refresh';

/** Kept across visits within a session: where the learner was, how far down, which chip and order. */
let keptStack: Screen[] = [{ kind: 'home' }];
let keptScrolls: number[] = [0];
let keptChip: Chip | null = null;
const keptSort: Partial<Record<Chip | 'all', Sort>> = {};
/** The search, kept the same way: a result opened and come back from still shows its search. */
let keptQuery = '';
const NO_TERMS: readonly string[] = [];

const SHELF_MAX = 14;
const SHELF_COLLECTIONS = 4;
/** Rows drawn at a time as a list scrolls: small enough that adding a page never stalls a frame for long. */
const PAGE = 30;
const hueOf = (id: string | null | undefined) => (id && catalog.get(id) && catalog.get(id)!.depth > 0 ? territoryColor(id) : '#9b9387');
const hue = (id: string | null | undefined) => ({ ['--hue' as string]: hueOf(id) }) as CSSProperties;
const nameOf = (id: string) => catalog.get(id)?.name ?? id;
// One formatter each for this year's dates and older ones: building one per date froze long lists.
let dayFormats: { thisYear: Intl.DateTimeFormat; older: Intl.DateTimeFormat } | null = null;
const day = (iso: string) => {
  dayFormats ??= { thisYear: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }), older: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) };
  const d = new Date(iso);
  return (d.getFullYear() === new Date().getFullYear() ? dayFormats.thisYear : dayFormats.older).format(d);
};
/** The region a deep place sits in (Physics for Acceleration), when it is deeper than a region. */
const regionOf = (id: string) => { const node = catalog.get(id); return node && node.depth > 2 ? catalog.getPath(node)[2].name : ''; };
/** The places above one, nearest first, short of the atlas itself: "Evolution · Biology · Science". */
const pathOf = (id: string, max = 2) => { const node = catalog.get(id); return node ? catalog.getPath(node).slice(1, -1).reverse().slice(0, max).map(n => n.name) : []; };

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const list = matchMedia(query);
    const change = () => setOn(list.matches);
    change();
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, [query]);
  return on;
}

// --- small pieces --------------------------------------------------------------------------------

type IconName = 'plus' | 'back' | 'chevron' | 'search' | 'close' | 'sort' | 'map' | 'refresh' | 'check' | 'book' | 'play' | 'edit' | 'case' | 'miss';
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'chevron' && <path d="m9.5 6 6 6-6 6" />}
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'sort' && <path d="M8 18V6m0 0L5 9m3-3 3 3M16 6v12m0 0-3-3m3 3 3-3" />}
    {name === 'map' && <path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5ZM9 4v13.5M15 6.5V20" />}
    {name === 'refresh' && <><path d="M19 12a7 7 0 1 1-2.05-4.95" /><path d="M19 4.5V9h-4.5" /></>}
    {name === 'check' && <path d="m5.5 12.5 4 4 9-9.5" />}
    {name === 'book' && <path d="M12 7.2C10.2 5.8 7.4 5.3 4 5.6v12.2c3.4-.3 6.2.2 8 1.6 1.8-1.4 4.6-1.9 8-1.6V5.6c-3.4-.3-6.2.2-8 1.6Zm0 0v12.2" />}
    {name === 'play' && <path d="M9 6.8v10.4l8.2-5.2Z" fill="currentColor" stroke="none" />}
    {name === 'edit' && <path d="m14.5 6 3.5 3.5M5 19l1-4.5L15.8 4.7a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L9.5 18Z" />}
    {name === 'case' && <><circle cx="12" cy="12" r="7.5" /><path d="M12 8.5V12l2.5 1.5" /></>}
    {name === 'miss' && <path d="M8 12h8" />}
  </svg>;
}

const YOUTUBE = /^https:\/\/i\.ytimg\.com\/vi\/([\w-]{11})\/(?:hq|mq|sd|maxres)default\.jpg$/;
/** Any video's frame, YouTube's or a page's that is one (a saved link to a video carries its thumbnail). */
const VIDEO_FRAME = /^https:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\//;
const OPEN_LIBRARY_M = /^(https:\/\/covers\.openlibrary\.org\/b\/id\/\d+)-M(\.jpg.*)$/;
/** The copies worth trying, best first: YouTube's small frame before its letterboxed one, and for a
 * large picture a larger Commons thumbnail or Open Library's large cover. Commons serves thumbnails
 * only at its standard widths (330, 500 and 960 among them; 640 is refused with a 400). */
function framesOf(src: string, large: boolean): string[] {
  const id = src.match(YOUTUBE)?.[1];
  if (id) return large ? [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`] : [`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  if (!large) return [src];
  const commons = commonsAtWidth(src, 500);
  if (commons !== src) return [commons, src];
  const book = src.match(OPEN_LIBRARY_M);
  return book ? [`${book[1]}-L${book[2]}`, src] : [src];
}

/** A picture that steps aside for its fallback when it fails (YouTube's grey placeholder counts as failing). */
function Img({ src, large = false, fallback = null }: { src: string; large?: boolean; fallback?: ReactNode }) {
  const frames = useMemo(() => framesOf(src, large), [src, large]);
  const [at, setAt] = useState(0);
  const [was, setWas] = useState(src);
  if (was !== src) { setWas(src); setAt(0); }
  if (at >= frames.length) return <>{fallback}</>;
  const youtube = YOUTUBE.test(frames[at]);
  return <img key={frames[at]} src={frames[at]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
    onError={() => setAt(i => i + 1)} onLoad={event => { if (event.currentTarget.naturalWidth < (youtube ? 200 : 2)) setAt(i => i + 1); }} />;
}

/** A cover set in type: the title (and who made it) on a ground tinted by the place it lives in. */
function TypeCover({ title, byline, nodeId }: { title: string; byline?: string; nodeId?: string }) {
  return <span className="le-type" style={hue(nodeId)}><b>{title}</b>{byline && <small>{byline}</small>}</span>;
}

/** A thing's artwork in a row or a cell, shaped by what it is: a book stands as a cover, a film as a
 * poster, a reel as a tall still, a video and a link as a square frame. Notes have none: their words are their face. */
function Art({ piece, cell = false }: { piece: Piece; cell?: boolean }) {
  const shape = piece.kind === 'book' || piece.kind === 'film' ? 'is-cover' : piece.kind === 'reel' ? 'is-reel' : 'is-frame';
  const fallback = <TypeCover title={piece.title} byline={piece.kind === 'book' || piece.kind === 'film' ? bylineOf(piece) : piece.kind === 'link' ? piece.byline : undefined} nodeId={piece.nodeIds[0]} />;
  return <span className={`le-art ${shape} is-${piece.kind}${cell ? ' is-cell' : ''}`} aria-hidden="true">
    {piece.image ? <Img src={piece.image} large={cell} fallback={fallback} /> : fallback}
    {piece.kind === 'video' && !cell && <i className="le-play"><Icon name="play" size={14} /></i>}
  </span>;
}

/** A title with the search's matches set bold. */
function Marked({ text, terms }: { text: string; terms: readonly string[] }) {
  if (!terms.length) return <>{text}</>;
  return <>{highlight(text, terms).map((part, i) => part.hit ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>)}</>;
}

/** A place's picture in a circle. Proved: a ring in its own colour. Ready to refresh: the ring broken,
 * and a refresh mark on it. Without a picture, its name set in type. */
function Disc({ place, picture, size }: { place: PlaceInfo; picture: string | null; size: 'row' | 'shelf' | 'hero' | 'small' }) {
  const state = place.proof ? (place.proof.ready ? ' is-ready' : ' is-proved') : '';
  const type = <span className="le-disc-type"><b>{place.name}</b></span>;
  return <span className={`le-disc is-${size}${state}`} style={hue(place.id)} aria-hidden="true">
    <span className="le-disc-face">{picture ? <Img src={picture} large={size === 'hero'} fallback={type} /> : type}</span>
    {place.proof?.ready && size !== 'small' && <i className="le-badge"><Icon name="refresh" size={size === 'hero' ? 20 : 13} /></i>}
  </span>;
}

/** A collection's cover: its first four pictures, two by two; a cell with no picture sets its thing's title in type. */
function FourUp({ pieces, size }: { pieces: readonly Piece[]; size: 'row' | 'shelf' | 'hero' }) {
  const pictured = pieces.filter(p => p.image && p.kind !== 'idea' && p.kind !== 'question');
  const rest = pieces.filter(p => !pictured.includes(p));
  const cells = [...pictured, ...rest].slice(0, 4);
  if (!cells.length) return <span className={`le-four is-${size} is-empty`} aria-hidden="true" />;
  return <span className={`le-four is-${size}`} aria-hidden="true">
    {[0, 1, 2, 3].map(i => { const piece = cells[i]; return <span key={i} className={`le-four-cell${piece ? ` is-${piece.kind}` : ''}`} style={hue(piece?.nodeIds[0])}>
      {piece && (piece.image && piece.kind !== 'idea' && piece.kind !== 'question'
        ? <Img src={piece.image} large={size === 'hero'} fallback={<TypeCover title={piece.title} nodeId={piece.nodeIds[0]} />} />
        : <TypeCover title={piece.title} nodeId={piece.nodeIds[0]} />)}
    </span>; })}
  </span>;
}

/** The place a thing lives in, and whether that land is lit on the Atlas: the dot is filled once the place is proved. */
function Where({ place, ready }: { place: PlaceInfo; ready?: boolean }) {
  const lit = !!place.proof;
  return <span className="le-where" style={hue(place.id)}>
    <i className={`le-land${lit ? ' is-lit' : ''}`} />
    <span className="le-where-name">{place.name}</span>
    {ready && place.proof?.ready && <em>ready to refresh</em>}
  </span>;
}

// --- rows ----------------------------------------------------------------------------------------

interface RowContext {
  readonly place: (id: string) => PlaceInfo;
  readonly terms: readonly string[];
  readonly wide: boolean;
  readonly onOpen: (piece: Piece) => void;
}

/** One thing: its artwork, its title, what it is, who made it and how far it got, and where it lives.
 * A note or a question has no artwork: its own words, set in the book face, are the row. Memoised, with
 * a context that holds still, so a list that grows by a page draws only the rows it adds. */
const Row = memo(function Row({ piece, context, home, here = false }: { piece: Piece; context: RowContext; home?: string; here?: boolean }) {
  const note = piece.kind === 'idea' || piece.kind === 'question';
  const at = piece.nodeIds[0] && catalog.get(piece.nodeIds[0]) ? piece.nodeIds[0] : null;
  const place = at && at !== home ? context.place(at) : null;
  const meta = note ? [kindWord(piece), day(piece.at)] : [kindWord(piece), bylineOf(piece), stepWord(piece)];
  const title = <span className={note ? `le-words is-${piece.kind}` : 'le-title'}><Marked text={piece.title} terms={context.terms} /></span>;
  if (context.wide) {
    return <li className={`le-row is-${piece.kind}`}>
      <button type="button" onClick={() => context.onOpen(piece)} data-piece={piece.key} data-kind={piece.kind}>
        <span className="le-cell-art">{!note && <Art piece={piece} />}</span>
        <span className="le-cell-title">{title}{!note && <small className="le-meta">{[bylineOf(piece), stepWord(piece)].filter(Boolean).join(' · ')}</small>}</span>
        {!here && <span className="le-cell-place">{place ? <Where place={place} ready /> : at && at === home ? null : <span className="le-faint">Not placed</span>}</span>}
        <span className="le-cell-kind">{kindWord(piece)}</span>
        <span className="le-cell-added">{day(piece.at)}</span>
      </button>
    </li>;
  }
  return <li className={`le-row is-${piece.kind}`}>
    <button type="button" onClick={() => context.onOpen(piece)} data-piece={piece.key} data-kind={piece.kind}>
      {!note && <Art piece={piece} />}
      <span className="le-row-text">
        {title}
        <small className="le-meta">{meta.filter(Boolean).join(' · ')}</small>
        {place && <Where place={place} ready />}
      </span>
    </button>
  </li>;
});

/** A run of rows, one page of a long list. Memoised: as the list grows, the page draws only its newest
 * run, and the runs already drawn are left alone. */
const RowRun = memo(function RowRun({ pieces, context, home, here }: { pieces: readonly Piece[]; context: RowContext; home?: string; here?: boolean }) {
  return <>{pieces.map(piece => <Row key={piece.key} piece={piece} context={context} home={home} here={here} />)}</>;
});

/** A letter of the A–Z and its titles, memoised the same way. */
const LetterGroup = memo(function LetterGroup({ letter, pieces, context }: { letter: string; pieces: readonly Piece[]; context: RowContext }) {
  return <section className="le-letter-group">
    <h3 className="le-letter">{letter}</h3>
    <ol className="le-list">{pieces.map(piece => <Row key={piece.key} piece={piece} context={context} />)}</ol>
  </section>;
});

/** A list cut into pages of PAGE. */
function pagesOf<T>(list: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += PAGE) out.push(list.slice(i, i + PAGE));
  return out;
}
/** The pages drawn so far: whole runs, so a run already on the page keeps its props. */
const runsOf = (pages: readonly (readonly Piece[])[], shown: number, context: RowContext, home?: string, here?: boolean) =>
  pages.slice(0, Math.ceil(shown / PAGE)).map((run, i) => <RowRun key={i} pieces={run} context={context} home={home} here={here} />);

/** A place as a row: its round picture, its name, what it holds and how far its proof is. */
function PlaceRow({ place, picture, terms = [], line, onOpen, action }: {
  place: PlaceInfo; picture: string | null; terms?: readonly string[]; line: string; onOpen: () => void; action?: ReactNode;
}) {
  return <li className={`le-row is-place${place.proof?.ready ? ' is-due' : ''}`}>
    <button type="button" onClick={onOpen} data-place={place.id}>
      <Disc place={place} picture={picture} size="row" />
      <span className="le-row-text">
        <span className="le-title"><Marked text={place.name} terms={terms} /></span>
        <small className={`le-meta${place.proof?.ready ? ' is-due' : ''}`}>{line}</small>
      </span>
    </button>
    {action && <span className="le-row-action">{action}</span>}
  </li>;
}

function useGrow(total: number, key: string, root: React.RefObject<HTMLElement | null>): { shown: number; sentinel: ReactNode } {
  const [shown, setShown] = useState(PAGE);
  const [was, setWas] = useState(key);
  if (was !== key) { setWas(key); setShown(PAGE); }
  const ref = useRef<HTMLDivElement>(null);
  const more = shown < total;
  useEffect(() => {
    const el = ref.current;
    if (!el || !more || typeof IntersectionObserver !== 'function') return;
    // A transition: the next page is drawn between frames, and a scroll never waits on it.
    const observer = new IntersectionObserver(found => { if (found.some(f => f.isIntersecting)) startTransition(() => setShown(n => n + PAGE)); }, { root: root.current, rootMargin: '900px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [more, shown, root]);
  return { shown, sentinel: more ? <div ref={ref} className="le-more" aria-hidden="true" /> : null };
}

// --- sheets ----------------------------------------------------------------------------------------

function PickerSheet({ collection, pieces, place, onSave, onRemove, onClose }: {
  collection: Collection | null; pieces: readonly Piece[]; place: (id: string) => PlaceInfo;
  onSave: (name: string, items: string[]) => string | null; onRemove?: () => void; onClose: () => void;
}) {
  const sheet = useRef<HTMLElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  useSheetFocus(sheet, onClose, () => nameField.current);
  const [name, setName] = useState(collection?.name ?? '');
  const [chosen, setChosen] = useState<string[]>([...(collection?.items ?? [])]);
  const [query, setQuery] = useState('');
  const [problem, setProblem] = useState('');
  const [confirm, setConfirm] = useState(false);
  const nameId = useId();
  const terms = termsOf(query);
  const list = terms.length ? pieces.filter(p => matchScore(hayOf(p.title, [], [p.text]), terms) > 0) : pieces;
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet le-sheet" role="dialog" aria-modal="true" aria-label={collection ? 'Edit collection' : 'New collection'} tabIndex={-1} onClick={e => e.stopPropagation()} data-picker={collection ? 'edit' : 'new'}>
      <span className="lib-grab" aria-hidden="true" />
      <header className="le-sheet-head">
        <label htmlFor={nameId} className="sr-only">Name</label>
        <input id={nameId} ref={nameField} className="le-name-field" value={name} onChange={e => setName(e.target.value)} placeholder="Name this collection" maxLength={80} data-action="collection-name" />
        <button type="button" className="le-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <label className="le-field is-sheet"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in your library" aria-label="Find in your library" /></label>
      <ul className="le-pick">
        {list.map(piece => { const on = chosen.includes(piece.key); const at = piece.nodeIds[0] && catalog.get(piece.nodeIds[0]) ? piece.nodeIds[0] : null; return <li key={piece.key}>
          <button type="button" aria-pressed={on} onClick={() => toggle(piece.key)} data-pick={piece.key}>
            {piece.kind === 'idea' || piece.kind === 'question' ? <span className="le-pick-note" /> : <Art piece={piece} />}
            <span className="le-row-text"><span className={piece.kind === 'idea' || piece.kind === 'question' ? 'le-words' : 'le-title'}>{piece.title}</span><small className="le-meta">{[kindWord(piece), at ? place(at).name : ''].filter(Boolean).join(' · ')}</small></span>
            <span className={`le-tick${on ? ' is-on' : ''}`}>{on && <Icon name="check" size={15} />}</span>
          </button>
        </li>; })}
      </ul>
      {problem && <p className="le-problem" role="alert">{problem}</p>}
      <footer className="lib-sheet-foot le-sheet-foot">
        {onRemove && (confirm
          ? <button type="button" className="le-text is-danger" onClick={onRemove} data-action="collection-remove-confirm">Delete this collection</button>
          : <button type="button" className="le-text" onClick={() => setConfirm(true)} data-action="collection-remove">Delete</button>)}
        <button type="button" className="le-pill is-solid" disabled={!name.trim()} onClick={() => { const error = onSave(name, chosen); if (error) setProblem(error); }} data-action="collection-save">{collection ? 'Done' : 'Create'}</button>
      </footer>
    </section>
  </div>;
}

// --- the page ------------------------------------------------------------------------------------

type Hit = { kind: 'piece'; piece: Piece; score: number; at: string } | { kind: 'place'; place: PlaceInfo; score: number; at: string } | { kind: 'collection'; collection: Collection; pieces: Piece[]; score: number; at: string };

export function LibraryE(props: LibraryEProps) {
  const { exp, checks, entries, shelf, library, content, now, autoProofs } = props;
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now, autoProofs }), [exp, checks, entries, shelf, library, content, now, autoProofs]);
  const watchIds = usePoolIds(true);
  // Watch's memory of what was watched through; read again whenever the records change.
  const watched = useMemo(() => loadFeedMemory().watched, [journal]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => piecesOf(journal, { watchIds, watched, reelsWatched: shelf.watched }), [journal, watchIds, watched, shelf.watched]);
  const activity = useMemo(() => activityOf(exp, checks), [exp, checks]);
  const sessions = useMemo<CheckSession[]>(() => content ? content.checkSessions(checks) : [], [content, checks]);
  // The newest proof at each place: an Understood lesson or a passed check or case.
  const latestProof = useMemo(() => {
    const out = new Map<string, string>();
    const note = (nodeId: string | undefined, at: string) => { if (nodeId && (!out.has(nodeId) || out.get(nodeId)! < at)) out.set(nodeId, at); };
    for (const run of exp.runs) if (run.level === 'Understood') note(packPlace(run.packId)?.nodeId, run.at);
    for (const session of sessions) if (session.verdict.passed) note(session.node, session.at);
    return out;
  }, [exp, sessions]);
  const book = useMemo(() => placeBook(pieces, journal.status, activity, latestProof), [pieces, journal.status, activity, latestProof]);
  const begun = useMemo(() => begunPlaces(exp, checks), [exp, checks]);
  const wide = !useMedia('(max-width: 800px)');
  const pieceByKey = useMemo(() => new Map(pieces.map(p => [p.key, p])), [pieces]);

  // The content chunk (packs, banks, cases): what a place can offer, and its lesson's picture.
  const [loaded, setLoaded] = useState<Content | null>(loadedContent);
  useEffect(() => { if (!loaded) void loadContent().then(setLoaded, () => {}); }, [loaded]);
  const clock = now ?? Date.now();
  const statusOf = useCallback((nodeId: string): CheckStatus | null => loaded ? loaded.checkStatus(nodeId, exp, checks, clock) : null, [loaded, exp, checks, clock]);

  // The latest props, for handlers that hold still across renders (a row's tap, the enricher's hooks).
  const latest = useRef(props);
  latest.current = props;
  // Covers for books brought in from an import arrive in the background, as on the Library tab.
  useEffect(() => { connectEnricher(() => latest.current.getLibrary(), change => { latest.current.onLibraryChange(change); }); }, []);
  const enricher = libraryEnricher();
  useEffect(() => { if (waitingEntries(props.getLibrary()).length) void enricher.start(); }, [enricher, props.getLibrary]);

  // A place's pictures, best first: its lesson's cover; stills from reels made for it, from the learner's
  // own reels there and from reels made inside it (photographs before diagrams, which want to be seen
  // whole); then covers and pages' own pictures. Never a video's frame: thumbnails carry big words that a
  // circle cuts to fragments ("RETRACTED", "TRACT"). With nothing, the place's name set in type.
  const reels = content?.reels;
  const pictures = useMemo(() => new Map<string, readonly string[]>(), [loaded, reels, book]); // eslint-disable-line react-hooks/exhaustive-deps
  const picturesOf = useCallback((nodeId: string): readonly string[] => {
    const known = pictures.get(nodeId);
    if (known) return known;
    const found: string[] = [];
    const expedition = loaded?.expeditionAt(nodeId);
    const cover = expedition?.pack.beats.find(beat => beat.kind === 'cover');
    const media = cover && cover.kind === 'cover' ? expedition!.pack.media[cover.media] : undefined;
    if (media?.src) found.push(commonsAtWidth(media.src, 330));
    const held = book.piecesIn(nodeId);
    const here = (reels ?? []).filter(reel => reel.image && reel.nodeId === nodeId);
    const kept = held.flatMap(piece => piece.item.kind === 'reel' && piece.image ? [{ image: piece.image, contain: !!piece.item.reel.contain }] : []);
    const inside = (reels ?? []).filter(reel => reel.image && reel.nodeId !== nodeId && within(reel.nodeId, nodeId));
    const stills = [...here, ...kept, ...inside];
    for (const still of stills) if (!still.contain) found.push(still.image!);
    for (const still of stills) if (still.contain) found.push(still.image!);
    for (const piece of held) if (piece.image && (piece.kind === 'book' || piece.kind === 'film' || piece.kind === 'link') && !VIDEO_FRAME.test(piece.image)) found.push(piece.image);
    const list = [...new Set(found)].slice(0, 8);
    pictures.set(nodeId, list);
    return list;
  }, [pictures, loaded, reels, book]);
  /** Pictures for the places on one screen: each its best one not already shown there. */
  const shownPictures = new Set<string>();
  const pictureOf = (nodeId: string): string | null => {
    const list = picturesOf(nodeId);
    const pick = list.find(src => !shownPictures.has(src)) ?? list[0] ?? null;
    if (pick) shownPictures.add(pick);
    return pick;
  };

  // Collections: their own record, merged with what another tab saved.
  const collectionsLoaded = useMemo(() => loadCollections(), []);
  const [collections, setCollections] = useState<CollectionStore>(collectionsLoaded.data);
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;
  const blocked = useRef(collectionsLoaded.blocked);
  const [notice, setNotice] = useState(collectionsLoaded.warning ?? '');
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== COLLECTIONS_KEY && event.key !== null) return;
      const disk = readCollections();
      if (disk) setCollections(current => mergeCollections(current, disk));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const changeCollections = (change: (record: CollectionStore) => CollectionStore): string | null => {
    let next: CollectionStore;
    try { const disk = blocked.current ? null : readCollections(); next = change(disk ? mergeCollections(collectionsRef.current, disk) : collectionsRef.current); } catch (error) { return error instanceof Error ? error.message : 'This could not be saved.'; }
    collectionsRef.current = next;
    setCollections(next);
    const error = blocked.current ? 'Saving collections is blocked because the saved record could not be read. The original is untouched.' : saveCollections(next);
    if (error) setNotice(error);
    return null;
  };
  const shelved = useMemo(() => liveCollections(collections).map(c => ({ collection: c, pieces: c.items.map(key => pieceByKey.get(key)).filter((p): p is Piece => !!p) })), [collections, pieceByKey]);

  // Where the learner is, and how far down each screen they were.
  const [stack, setStackState] = useState<Screen[]>(keptStack);
  const scroller = useRef<HTMLDivElement>(null);
  const restore = useRef<number | null>(null);
  const setStack = (next: Screen[]) => { keptStack = next; setStackState(next); };
  const screen = stack[stack.length - 1];
  const push = (next: Screen) => {
    keptScrolls = [...keptScrolls.slice(0, stack.length - 1), scroller.current?.scrollTop ?? 0, 0];
    restore.current = 0;
    setStack([...stack, next]);
  };
  const pop = () => {
    const depth = Math.max(1, stack.length - 1);
    restore.current = keptScrolls[depth - 1] ?? 0;
    keptScrolls = keptScrolls.slice(0, depth);
    setStack(stack.length > 1 ? stack.slice(0, -1) : [{ kind: 'home' }]);
  };
  useLayoutEffect(() => {
    if (restore.current === null || !scroller.current) return;
    scroller.current.scrollTop = restore.current;
    restore.current = null;
  }, [stack]);
  // Coming back to the tab: the screen and the scroll it was left at.
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = keptScrolls[keptStack.length - 1] ?? 0; }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.lib-sheet-backdrop,[role=dialog]') && stack.length > 1) pop(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // A screen whose collection or place is gone (changed in another tab) falls back home.
  useEffect(() => {
    if ((screen.kind === 'collection' && !liveCollections(collections).some(c => c.id === screen.id)) || (screen.kind === 'place' && !catalog.get(screen.id))) setStack([{ kind: 'home' }]);
  }, [screen, collections]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chips and order.
  const provedList = useMemo(() => book.proved(), [book]);
  const chips = useMemo(() => chipsFor(pieces, provedList.length), [pieces, provedList]);
  const [chip, setChipState] = useState<Chip | null>(() => keptChip);
  const activeChip = chip && chips.includes(chip) ? chip : null;
  const setChip = (next: Chip | null) => { keptChip = next; setChipState(next); scroller.current?.scrollTo({ top: 0 }); };
  const sortKeyOf = activeChip ?? 'all';
  const [sorts, setSorts] = useState<Partial<Record<Chip | 'all', Sort>>>(() => ({ ...keptSort }));
  const sort: Sort = sorts[sortKeyOf] ?? (activeChip === 'proved' ? 'refresh' : 'recent');
  const flipSort = () => {
    const next: Sort = sort === 'az' ? (activeChip === 'proved' ? 'refresh' : 'recent') : 'az';
    keptSort[sortKeyOf] = next;
    setSorts({ ...keptSort });
  };

  // Search: one for the whole library. On a phone it opens from the shell's own magnifier (which
  // searches the Library while the Library shows) and takes the head of the page.
  const [query, setQueryState] = useState(() => keptQuery);
  const setQuery = useCallback((next: string) => { keptQuery = next; setQueryState(next); }, []);
  const [searchOpen, setSearchOpen] = useState(() => !!keptQuery);
  const searchField = useRef<HTMLInputElement>(null);
  const terms = useMemo(() => termsOf(query), [query]);
  const searching = terms.length > 0;
  const openSearch = useCallback(() => {
    flushSync(() => { keptStack = [{ kind: 'home' }]; keptScrolls = [0]; setStackState(keptStack); setSearchOpen(true); });
    searchField.current?.focus();
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  const closeSearch = () => { setQuery(''); setSearchOpen(false); searchField.current?.blur(); };
  // The Library tab, tapped while Your Library shows, closes the search, as the other prototypes' tab does. Not
  // while a case or a lesson has the screen (the address is theirs then), nor over a sheet.
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-action="open-notebook-mobile"],[data-action="open-notebook"]')) return;
      if (window.location.hash.split('?')[0].replace(/\/$/, '') !== LAB_HASH || document.querySelector('.lib-sheet-backdrop,[role=dialog]')) return;
      if (query || searchOpen) closeSearch();
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  });
  useEffect(() => {
    const button = document.querySelector<HTMLElement>('[data-action="open-search"]');
    const label = button?.getAttribute('aria-label') ?? null;
    button?.setAttribute('aria-label', 'Search your library');
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-action="open-search"]')) return;
      event.preventDefault();
      event.stopPropagation();
      openSearch();
    };
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('click', click, true); if (button && label) button.setAttribute('aria-label', label); };
  }, [openSearch]);
  // The words each thing is searched by, as its row shows them: its title; who made it, what it is and the
  // place it lives in; and, out of sight, the rest of its words and the places above that one.
  const hays = useMemo(() => new Map<string, Hay>(pieces.map(p => {
    const at = p.nodeIds[0] && catalog.get(p.nodeIds[0]) ? p.nodeIds[0] : null;
    return [p.key, hayOf(p.title, [bylineOf(p), kindWord(p), at ? nameOf(at) : ''], [p.text, ...(at ? pathOf(at, 4) : [])])];
  })), [pieces]);
  const hits = useMemo((): Hit[] => {
    if (!searching) return [];
    const out: Hit[] = [];
    for (const piece of pieces) { const score = matchScore(hays.get(piece.key)!, terms); if (score) out.push({ kind: 'piece', piece, score, at: piece.lastAt }); }
    // A place's row prints the place above it; the rest of its path is out of sight.
    for (const place of book.all()) { const path = pathOf(place.id, 4); const score = matchScore(hayOf(place.name, ['Place', path[0]], path.slice(1)), terms); if (score) out.push({ kind: 'place', place, score, at: place.lastAt }); }
    for (const { collection, pieces: held } of shelved) { const score = matchScore(hayOf(collection.name, ['Collection']), terms); if (score) out.push({ kind: 'collection', collection, pieces: held, score, at: collection.updatedAt }); }
    return out.sort((a, b) => b.score - a.score || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  }, [searching, terms, pieces, hays, book, shelved]);

  // Sheets.
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [picker, setPicker] = useState<{ id: string | null } | null>(null);

  const openPiece = useCallback((piece: Piece) => {
    const item = piece.item;
    const now = latest.current;
    if (piece.kind === 'video' && piece.videoId) now.onOpenVideo(piece.videoId);
    else if (item.kind === 'reel') now.onOpenReel(item.reel.id);
    else if (item.kind === 'idea' || item.kind === 'question') now.onEdit(item.entry);
    else { setPreview(null); setItemKey(piece.key); }
  }, []);
  // The search stays as it was: Back from a result comes back to the same results.
  const openPlace = (id: string) => push({ kind: 'place', id });
  const openCollection = (id: string) => push({ kind: 'collection', id });
  const runAction = (nodeId: string, action: PlaceAction) => { if (action.kind === 'lesson') props.onOpenExpedition(action.packId); else props.onTryCase(nodeId); };

  const works = useMemo(() => journal.items.flatMap(item => item.kind === 'work' ? [item.work] : []), [journal]);
  const sheetItem: SheetItem | null = useMemo(() => {
    if (itemKey?.startsWith('link:')) { const item = journal.items.find(i => i.key === itemKey); return item?.kind === 'link' ? { kind: 'link', link: item.link } : null; }
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
  }, [itemKey, preview, journal, works]);
  const addFound = (found: FoundItem, status: ItemStatus): { key: string } | { error: string } => {
    const at = new Date().toISOString();
    const entry = found.source === 'ol' ? entryFromBook(found, status, at) : entryFromScreen(found, status, at);
    const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
    const problem = props.onLibraryChange(current => entryAt(current, key) ? setStatus(current, key, status, at) : upsertEntry(current, entry, at));
    return problem ? { error: problem } : { key };
  };

  // Matches are marked only in the results themselves.
  const rowTerms = screen.kind === 'home' ? terms : NO_TERMS;
  const rowContext = useMemo<RowContext>(() => ({ place: book.info, terms: rowTerms, wide, onOpen: openPiece }), [book, rowTerms, wide, openPiece]);
  /** What a place shows under its name on a cover or in the index. */
  const caption = (place: PlaceInfo) => place.proof?.ready ? 'Ready to refresh' : place.proof ? `Proved ${day(place.proof.at)}` : place.count ? things(place.count) : place.begun ? 'Begun' : '';
  const summary = (place: PlaceInfo) => [
    place.count ? things(place.count) : '',
    place.proof ? (place.proof.ready ? 'ready to refresh' : `proved ${day(place.proof.at)}`) : place.provedInside ? `${place.provedInside} proved` : place.begun ? 'begun' : '',
    place.readyInside ? `${place.readyInside} to refresh` : '',
  ].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase());

  const listKey = `${screen.kind}|${'id' in screen ? screen.id : ''}|${activeChip}|${sort}|${terms.join(' ')}`;
  const homeList: Piece[] = useMemo(() => {
    const list = activeChip && activeChip !== 'proved' ? pieces.filter(p => chipOf(p) === activeChip) : [...pieces];
    return list.sort(byRecent);
  }, [pieces, activeChip]);
  const homePages = useMemo(() => pagesOf(homeList), [homeList]);
  const azGroups = useMemo(() => sort === 'az' ? lettered(homeList) : [], [homeList, sort]);
  const filteredHits = activeChip ? hits.filter(hit => hit.kind === 'piece' ? chipOf(hit.piece) === activeChip : hit.kind === 'place' ? activeChip === 'proved' && !!hit.place.proof : false) : hits;
  const screenHeld = useMemo(() => screen.kind === 'place' && catalog.get(screen.id) ? book.piecesIn(screen.id) : [], [screen, book]);
  const heldPages = useMemo(() => pagesOf(screenHeld), [screenHeld]);
  const growTotal = screen.kind === 'place' ? screenHeld.length : screen.kind !== 'home' ? 0 : searching ? filteredHits.length : activeChip === 'proved' ? 0 : homeList.length;
  const { shown, sentinel } = useGrow(growTotal, listKey, scroller);

  const back = (label?: string) => {
    const previous = stack[stack.length - 2];
    const text = label ?? (previous?.kind === 'place' ? nameOf(previous.id) : previous?.kind === 'index' ? 'Places' : previous?.kind === 'collection' ? shelved.find(s => s.collection.id === previous.id)?.collection.name ?? 'Library' : 'Library');
    return <button type="button" className="le-back" onClick={pop} data-action="le-back"><Icon name="back" /><span>{text}</span></button>;
  };
  const addButton = wide
    ? <button type="button" className="le-pill" onClick={() => setAdding(true)} data-action="le-add"><Icon name="plus" size={16} />Add</button>
    : <button type="button" className="le-ring" onClick={() => setAdding(true)} aria-label="Add to your library" data-action="le-add"><Icon name="plus" /></button>;
  const searchBox = <label className="le-field">
    <Icon name="search" />
    <input ref={searchField} value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setSearchOpen(true)} placeholder="Search your library" aria-label="Search your library" enterKeyHint="search" autoComplete="off" data-action="le-search" />
    {query && <button type="button" className="le-icon is-small" onClick={() => { setQuery(''); searchField.current?.focus(); }} aria-label="Clear search"><Icon name="close" size={16} /></button>}
  </label>;
  const tableHead = wide && <div className="le-thead" aria-hidden="true"><span /><span>Title</span><span>Place</span><span>Kind</span><span>Added</span></div>;
  /** A table whose things all live in the one place it is about: no Place column. */
  const hereHead = wide && <div className="le-thead is-here" aria-hidden="true"><span /><span>Title</span><span>Kind</span><span>Added</span></div>;
  const refreshPill = (place: PlaceInfo) => place.proof?.ready
    ? <button type="button" className="le-pill is-small" onClick={() => props.onTryCase(place.id)} data-action="le-refresh" data-node-id={place.id}>Refresh</button>
    : undefined;

  /** The shelf: places ready to refresh, then the learner's collections (the newest few, so a long run of
   * places never pushes them off the first row), then places by what was done last. */
  const shelfItems = useMemo(() => {
    const places = book.shelf(SHELF_MAX).map(place => ({ kind: 'place' as const, place, ready: !!place.proof?.ready }));
    const held = [...shelved].sort((a, b) => (a.collection.updatedAt < b.collection.updatedAt ? 1 : a.collection.updatedAt > b.collection.updatedAt ? -1 : 0)).slice(0, SHELF_COLLECTIONS).map(entry => ({ kind: 'collection' as const, ...entry, ready: false }));
    return [...places.filter(p => p.ready), ...held, ...places.filter(p => !p.ready)].slice(0, SHELF_MAX);
  }, [book, shelved]);
  const shelfView = (items: typeof shelfItems) => <ul className="le-shelf">
    {items.map(item => item.kind === 'place'
      ? <li key={`p:${item.place.id}`}><button type="button" className={`le-cover is-place${item.ready ? ' is-due' : ''}`} onClick={() => openPlace(item.place.id)} data-place={item.place.id} data-shelf="place">
        <Disc place={item.place} picture={pictureOf(item.place.id)} size="shelf" />
        <span className="le-cover-title">{item.place.name}</span>
        <span className="le-cover-meta">{caption(item.place)}</span>
      </button></li>
      : <li key={`c:${item.collection.id}`}><button type="button" className="le-cover is-collection" onClick={() => openCollection(item.collection.id)} data-collection={item.collection.id} data-shelf="collection">
        <FourUp pieces={item.pieces} size="shelf" />
        <span className="le-cover-title">{item.collection.name}</span>
        <span className="le-cover-meta">{things(item.pieces.length)}</span>
      </button></li>)}
  </ul>;

  const nothing = pieces.length === 0 && book.touched.size === 0 && shelved.length === 0;
  let page: ReactNode = null;

  if (screen.kind === 'home') {
    const phoneSearch = !wide && (searchOpen || searching);
    const sortWord = sort === 'az' ? 'A–Z' : sort === 'refresh' ? 'Refresh first' : 'Recent';
    let list: ReactNode;
    if (searching) {
      list = filteredHits.length ? <ol className="le-list is-results" aria-live="polite">
        {filteredHits.slice(0, shown).map(hit => hit.kind === 'piece' ? <Row key={hit.piece.key} piece={hit.piece} context={rowContext} />
          : hit.kind === 'place' ? <PlaceRow key={`p:${hit.place.id}`} place={hit.place} picture={pictureOf(hit.place.id)} terms={terms} line={['Place', summary(hit.place), pathOf(hit.place.id, 1)[0]].filter(Boolean).join(' · ')} onOpen={() => openPlace(hit.place.id)} />
            : <li key={`c:${hit.collection.id}`} className="le-row is-collection"><button type="button" onClick={() => openCollection(hit.collection.id)} data-collection={hit.collection.id}>
              <FourUp pieces={hit.pieces} size="row" />
              <span className="le-row-text"><span className="le-title"><Marked text={hit.collection.name} terms={terms} /></span><small className="le-meta">Collection · {things(hit.pieces.length)}</small></span>
            </button></li>)}
      </ol> : <p className="le-none">Nothing matches “{query.trim()}”.</p>;
    } else if (activeChip === 'proved') {
      const ordered = provedOrder(provedList, sort === 'az' ? 'az' : 'refresh');
      list = <ol className="le-list is-proved">
        {ordered.map(place => <PlaceRow key={place.id} place={place} picture={pictureOf(place.id)}
          line={[place.proof!.ready ? 'Ready to refresh' : `Proved ${day(place.proof!.at)}`, pathOf(place.id, 1)[0]].filter(Boolean).join(' · ')}
          onOpen={() => openPlace(place.id)} action={refreshPill(place)} />)}
      </ol>;
    } else if (sort === 'az') {
      // Each letter as far as the list has grown: a letter wholly drawn keeps its own array, so only the letter at the edge draws again.
      const groups: ReactNode[] = [];
      let left = shown;
      for (const group of azGroups) {
        if (left <= 0) break;
        const items = group.items.length <= left ? group.items : group.items.slice(0, left);
        left -= items.length;
        groups.push(<LetterGroup key={group.letter} letter={group.letter} pieces={items} context={rowContext} />);
      }
      list = <div className="le-az">{groups}</div>;
    } else {
      list = <ol className="le-list">{runsOf(homePages, shown, rowContext)}</ol>;
    }
    page = <div className={`le-home${phoneSearch ? ' is-searching' : ''}`} data-screen="home">
      {phoneSearch
        ? <header className="le-head is-search">{searchBox}<button type="button" className="le-text le-cancel" onClick={closeSearch} data-action="le-search-cancel">Cancel</button></header>
        : <header className="le-head"><h1>Library</h1>{addButton}</header>}
      {nothing ? <p className="le-none is-empty">Nothing kept yet.</p> : <>
        {chips.length > 1 && <div className="le-chips" role="toolbar" aria-label="Show">
          {activeChip
            ? <><button type="button" className="le-chip is-clear" onClick={() => setChip(null)} aria-label="Show everything" data-action="le-chip-clear"><Icon name="close" size={16} /></button>
              <button type="button" className="le-chip is-on" aria-pressed="true" onClick={() => setChip(null)} data-chip={activeChip}>{CHIP_WORD[activeChip]}</button></>
            : chips.map(c => <button key={c} type="button" className="le-chip" aria-pressed="false" onClick={() => setChip(c)} data-chip={c}>{CHIP_WORD[c]}</button>)}
        </div>}
        {!activeChip && !searching && !phoneSearch && shelfItems.length > 0 && <section className="le-shelf-section" aria-label="Places and collections">
          <h2 className="le-sec"><button type="button" onClick={() => push({ kind: 'index' })} data-action="le-index">{shelved.length ? 'Places and collections' : 'Places'}<Icon name="chevron" size={16} /></button></h2>
          {shelfView(shelfItems)}
        </section>}
        {(wide || !searching) && <div className="le-sortbar">
          {wide && searchBox}
          {!searching && <button type="button" className="le-sort" onClick={flipSort} data-action="le-sort" data-sort={sort}><Icon name="sort" size={16} />{sortWord}</button>}
        </div>}
        {(activeChip !== 'proved' || searching) && tableHead}
        {list}
        {sentinel}
      </>}
    </div>;
  } else if (screen.kind === 'index') {
    const subjects = book.subjects();
    page = <div className="le-index" data-screen="index">
      {back('Library')}
      <h1 className="le-page-title">{shelved.length ? 'Places and collections' : 'Places'}</h1>
      <section className="le-index-section" aria-label="Collections">
        {shelved.length > 0 && <h2 className="le-sec">Collections</h2>}
        <ol className="le-list">
          {shelved.map(({ collection, pieces: held }) => <li key={collection.id} className="le-row is-collection"><button type="button" onClick={() => openCollection(collection.id)} data-collection={collection.id}>
            <FourUp pieces={held} size="row" />
            <span className="le-row-text"><span className="le-title">{collection.name}</span><small className="le-meta">{[things(held.length), (() => { const n = new Set(held.flatMap(p => p.nodeIds.slice(0, 1))).size; return n ? `${n} ${n === 1 ? 'place' : 'places'}` : ''; })()].filter(Boolean).join(' · ')}</small></span>
          </button></li>)}
          {pieces.length > 0 && <li className="le-row is-new"><button type="button" onClick={() => setPicker({ id: null })} data-action="collection-new">
            <span className="le-new-art"><Icon name="plus" /></span><span className="le-row-text"><span className="le-title">New collection</span></span>
          </button></li>}
        </ol>
      </section>
      {subjects.map(subject => <section key={subject.id} className="le-subject" style={hue(subject.id)} data-subject={subject.id}>
        <h2 className="le-sec is-subject"><button type="button" onClick={() => openPlace(subject.id)}>{subject.name}</button><span className="le-count">{summary(subject)}</span></h2>
        <ol className="le-list">
          {book.children(subject.id).map(field => { const inside = book.children(field.id); return <li key={field.id} className="le-field-entry">
            <ol className="le-list"><PlaceRow place={field} picture={pictureOf(field.id)} line={[summary(field), regionOf(field.id)].filter(Boolean).join(' · ')} onOpen={() => openPlace(field.id)} /></ol>
            {inside.length > 0 && <ul className="le-inside">
              {inside.slice(0, 5).map(place => <li key={place.id}><button type="button" onClick={() => openPlace(place.id)} data-place={place.id}>
                <i className={`le-land${place.proof ? ' is-lit' : ''}`} style={hue(place.id)} /><span className="le-inside-name">{place.name}</span>{place.proof?.ready && <em>ready to refresh</em>}<span className="le-count">{place.count ? things(place.count) : place.proof ? `Proved ${day(place.proof.at)}` : ''}</span>
              </button></li>)}
              {inside.length > 5 && <li><button type="button" className="le-all" onClick={() => openPlace(field.id)}>All {inside.length} places</button></li>}
            </ul>}
          </li>; })}
        </ol>
      </section>)}
      {book.unplaced.length > 0 && <section className="le-subject">
        <h2 className="le-sec is-subject"><button type="button" onClick={() => push({ kind: 'unplaced' })} data-action="le-unplaced">Not placed yet</button><span className="le-count">{things(book.unplaced.length)}</span></h2>
      </section>}
    </div>;
  } else if (screen.kind === 'unplaced') {
    page = <div className="le-place" data-screen="unplaced">
      {back()}
      <h1 className="le-page-title">Not placed yet</h1>
      {tableHead}
      <ol className="le-list">{[...book.unplaced].sort(byRecent).map(piece => <Row key={piece.key} piece={piece} context={rowContext} />)}</ol>
    </div>;
  } else if (screen.kind === 'place' && catalog.get(screen.id)) {
    const place = book.info(screen.id);
    const node = catalog.get(screen.id)!;
    const heroPicture = pictureOf(place.id);
    const own = journal.status.get(place.id);
    const status = statusOf(place.id);
    const expedition = loaded?.expeditionAt(place.id);
    const tried = !!expedition && exp.runs.some(run => run.packId === expedition.pack.id);
    const ownProof = !!expedition || (!!status && status.kind !== 'none');
    const action = ownProof ? placeAction(status, expedition?.pack.id ?? null, tried, !!own?.litAt) : null;
    const record = ownProof ? [
      ...exp.runs.filter(run => packPlace(run.packId)?.nodeId === place.id).map(run => ({ key: run.id, at: run.at, kind: 'lesson' as const, packId: run.packId, title: `Lesson · ${run.level}`,
        sub: [day(run.at), run.firstTry.total ? `${run.firstTry.right} of ${run.firstTry.total} first try` : '', run.transfer.total ? (run.transfer.right === run.transfer.total ? (run.transfer.total === 2 ? 'both new cases' : `all ${run.transfer.total} new cases`) : `${run.transfer.right} of ${run.transfer.total} new cases`) : ''].filter(Boolean).join(' · ') })),
      ...sessions.filter(s => s.node === place.id).map(s => ({ key: s.session, at: s.at, kind: s.verdict.passed ? 'passed' as const : 'missed' as const, packId: '',
        title: s.played ? (s.verdict.passed ? 'New case solved' : 'New case missed') : (s.verdict.passed ? 'Check passed' : 'Check missed'),
        sub: [day(s.at), s.verdict.passed && own?.lastingAt === s.at ? 'Lasting' : ''].filter(Boolean).join(' · ') })),
    ].sort((a, b) => b.at.localeCompare(a.at)) : [];
    const latest = sessions.filter(s => s.node === place.id && s.verdict.passed).at(-1)?.at;
    const line = ownProof ? proofLine(status, own, place.begun, day, latest) : place.proof ? `Proved ${day(place.proof.at)}` : '';
    const inside = book.children(place.id);
    const held = screenHeld;
    const allHere = held.every(piece => piece.nodeIds[0] === place.id);
    // A place with no lesson or check of its own: what is proved or begun inside it, or the proof nearest it.
    const insideProof = ownProof ? [] : book.all().filter(p => p.id !== place.id && within(p.id, place.id) && (p.proof || p.begun))
      .sort((a, b) => Number(!!b.proof?.ready) - Number(!!a.proof?.ready) || b.lastAt.localeCompare(a.lastAt));
    const suggestion = !ownProof && !insideProof.length && loaded
      ? proofFor([place.id], journal.status, nodeId => loaded.hasCases(nodeId) && !!loaded.nextCase(nodeId, checks), begun) : null;
    const suggestedPack = suggestion?.packId ? loaded?.getExpedition(suggestion.packId)?.pack : undefined;
    const pill = (a: PlaceAction, nodeId: string, small = false) => {
      const words = a.kind === 'refresh' ? 'Refresh' : a.kind === 'lesson' ? 'Lesson' : 'Try a case';
      return <button type="button" className={`le-pill${small ? ' is-small' : ''}${a.kind === 'refresh' && !small ? ' is-solid' : ''}`} onClick={() => runAction(nodeId, a)} data-action={`le-${a.kind}`} data-node-id={nodeId}>
        {!small && <Icon name={a.kind === 'refresh' ? 'refresh' : a.kind === 'lesson' ? 'book' : 'case'} size={16} />}{words}
      </button>;
    };
    const lessonWords = action?.kind === 'lesson' && expedition ? `${expedition.pack.title}${expedition.pack.minutes ? ` · ${expedition.pack.minutes} min` : ''}` : '';
    const proofSection = (record.length > 0 || insideProof.length > 0 || suggestion) ? <section className="le-section le-proof" aria-label="Proof">
        <h2 className="le-sec">Proof</h2>
        <ol className="le-list">
          {record.map(entry => <li key={entry.key} className={`le-row is-record is-${entry.kind}`}>
            {entry.kind === 'lesson'
              ? <button type="button" onClick={() => props.onOpenExpedition(entry.packId)} data-record="lesson" data-pack={entry.packId}>
                <span className="le-mark"><Icon name="book" /></span><span className="le-row-text"><span className="le-title">{entry.title}</span><small className="le-meta">{entry.sub}</small></span>
              </button>
              : <div className="le-record" data-record={entry.kind}>
                <span className={`le-mark${entry.kind === 'passed' ? ' is-passed' : ''}`}><Icon name={entry.kind === 'passed' ? 'check' : 'miss'} /></span><span className="le-row-text"><span className="le-title">{entry.title}</span><small className="le-meta">{entry.sub}</small></span>
              </div>}
          </li>)}
          {insideProof.slice(0, 12).map(p => { const pack = loaded?.expeditionAt(p.id)?.pack.id ?? null; const a = p.proof?.ready ? { kind: 'refresh' as const } : !p.proof ? placeAction(statusOf(p.id), pack, !!pack && exp.runs.some(run => run.packId === pack), false) : null;
            return <PlaceRow key={p.id} place={p} picture={pictureOf(p.id)} line={[p.proof ? (p.proof.ready ? 'Ready to refresh' : `Proved ${day(p.proof.at)}`) : 'Begun', pathOf(p.id, 1)[0] !== place.name ? pathOf(p.id, 1)[0] : ''].filter(Boolean).join(' · ')}
              onOpen={() => openPlace(p.id)} action={a ? pill(a, p.id, true) : undefined} />; })}
          {suggestion && (suggestion.kind === 'lesson' || suggestion.kind === 'case') && <PlaceRow place={book.info(suggestion.nodeId)} picture={pictureOf(suggestion.nodeId)}
            line={suggestion.kind === 'lesson' ? [`Lesson`, suggestedPack?.title, suggestedPack?.minutes ? `${suggestedPack.minutes} min` : ''].filter(Boolean).join(' · ') : 'A new case'}
            onOpen={() => openPlace(suggestion.nodeId)} action={pill(suggestion.kind === 'lesson' && suggestion.packId ? { kind: 'lesson', packId: suggestion.packId } : { kind: 'case' }, suggestion.nodeId, true)} />}
        </ol>
      </section> : null;
    const hero = <header className="le-hero">
        <Disc place={place} picture={heroPicture} size="hero" />
        <div className="le-hero-text">
          <h1>{place.name}</h1>
          <p className="le-path">{[...(node.depth > 1 ? pathOf(place.id, 3) : []), place.count ? things(place.count) : ''].filter(Boolean).join(' · ')}</p>
          {line && <p className={`le-proofline${place.proof?.ready ? ' is-due' : ''}`}>{line}</p>}
          {lessonWords && <p className="le-path">{lessonWords}</p>}
          <div className="le-actions">
            {action && pill(action, place.id)}
            <button type="button" className="le-pill" onClick={() => props.onNavigate(place.id)} data-action="le-fly"><Icon name="map" size={16} />On the map</button>
            <button type="button" className="le-ring" onClick={() => setLinkSheet({ nodeId: place.id })} aria-label="Save a link here" data-action="le-save-here"><Icon name="plus" /></button>
          </div>
        </div>
      </header>;
    // On a wide screen the proof stands beside the picture; on a phone it follows the things kept here,
    // or comes first when the place has no lesson or check of its own.
    const beside = wide && !!proofSection;
    page = <div className="le-place" data-screen="place" data-place={place.id} style={hue(place.id)}>
      {back()}
      {beside ? <div className="le-place-top">{hero}{proofSection}</div> : hero}
      {inside.length > 0 && <section className="le-section" aria-label="Places inside">
        <h2 className="le-sec">Places</h2>
        <ul className="le-shelf">{inside.map(p => <li key={p.id}><button type="button" className={`le-cover is-place${p.proof?.ready ? ' is-due' : ''}`} onClick={() => openPlace(p.id)} data-place={p.id}>
          <Disc place={p} picture={pictureOf(p.id)} size="shelf" /><span className="le-cover-title">{p.name}</span><span className="le-cover-meta">{caption(p)}</span>
        </button></li>)}</ul>
      </section>}
      {!beside && !ownProof && proofSection}
      {held.length > 0 && <section className="le-section" aria-label="Everything here">
        {(inside.length > 0 || (!ownProof && !beside)) && <h2 className="le-sec">{things(held.length)}</h2>}
        {allHere ? hereHead : tableHead}
        <ol className={`le-list${allHere ? ' is-here' : ''}`}>{runsOf(heldPages, shown, rowContext, place.id, allHere)}</ol>
        {sentinel}
      </section>}
      {!beside && ownProof && proofSection}
    </div>;
  } else if (screen.kind === 'collection') {
    const entry = shelved.find(s => s.collection.id === screen.id);
    if (entry) {
      const { collection, pieces: held } = entry;
      const places = [...new Set(held.flatMap(p => p.nodeIds.slice(0, 1)).filter(id => catalog.get(id)))];
      page = <div className="le-collection" data-screen="collection" data-collection={collection.id}>
        {back('Library')}
        <header className="le-hero is-collection">
          <FourUp pieces={held} size="hero" />
          <div className="le-hero-text">
            <h1>{collection.name}</h1>
            <p className="le-path">{['Collection', things(held.length), `since ${day(collection.createdAt)}`].join(' · ')}</p>
            {places.length > 0 && <p className="le-reach">{places.map((id, i) => <span key={id}>{i > 0 && ' · '}<button type="button" onClick={() => openPlace(id)} data-place={id}>{nameOf(id)}</button></span>)}</p>}
            <div className="le-actions">
              <button type="button" className="le-pill" onClick={() => setPicker({ id: collection.id })} data-action="collection-edit"><Icon name="edit" size={16} />Edit</button>
            </div>
          </div>
        </header>
        {held.length > 0 && <>{tableHead}<ol className="le-list">{held.map(piece => <Row key={piece.key} piece={piece} context={rowContext} />)}</ol></>}
      </div>;
    }
  }

  return <div className="le" data-lab="library-e">
    <div className="notebook-workspace le-scroll" ref={scroller} onScroll={e => { keptScrolls[stack.length - 1] = e.currentTarget.scrollTop; }} data-workspace="library-e">
      <div className="le-page">
        {notice && <p className="le-problem" role="status">{notice}<button type="button" className="le-icon is-small" onClick={() => setNotice('')} aria-label="Dismiss"><Icon name="close" size={16} /></button></p>}
        {page}
      </div>
    </div>

    {/* The add, item and link sheets are the Library tab's own, styled under its .lib scope. */}
    <div className="lib le-sheets">
      {adding && <AddSheet library={library} initialNodeId={screen.kind === 'place' ? screen.id : null}
        onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
        onOpenFound={found => { setItemKey(null); setPreview(found); }} onOpenItem={key => { setPreview(null); setItemKey(key); }}
        onImported={() => { setAdding(false); void enricher.start(); }} onClose={() => setAdding(false)} />}
      {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(journal.status, nodeId)}
        caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
        onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
        onTryCase={props.onTryCase} onShowPlace={nodeId => { setAdding(false); setItemKey(null); setPreview(null); openPlace(nodeId); }}
        onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
      {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </div>
    {picker && <PickerSheet collection={picker.id ? liveCollections(collections).find(c => c.id === picker.id) ?? null : null} pieces={[...pieces].sort(byRecent)} place={book.info}
      onClose={() => setPicker(null)}
      onRemove={picker.id ? () => { changeCollections(record => removeCollection(record, picker.id!)); setPicker(null); setStack([{ kind: 'home' }]); keptScrolls = [0]; } : undefined}
      onSave={(name, items) => {
        if (picker.id) {
          const id = picker.id;
          const problem = changeCollections(record => setCollectionItems(renameCollection(record, id, name), id, items));
          if (!problem) setPicker(null);
          return problem;
        }
        let made = '';
        const problem = changeCollections(record => { const result = createCollection(record, { name, items }); made = result.id; return result.record; });
        if (!problem) { setPicker(null); push({ kind: 'collection', id: made }); }
        return problem;
      }} />}
  </div>;
}
