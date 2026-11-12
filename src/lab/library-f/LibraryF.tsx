import { startTransition, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import type { NotebookEntry } from '../../core/notebook';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import { packPlace } from '../../expeditions/manifest';
import { loadKeptReels } from '../../explore/keptReels';
import { commonsAtWidth } from '../../explore/media';
import type { ReelShelf } from '../../explore/pins';
import type { Reel } from '../../explore/types';
import { loadFeedMemory } from '../../feed/memory';
import { usePoolIds } from '../../feed/usePool';
import { loadContent, loadedContent, type Content } from '../../contentLoader';
import { AddSheet, type FoundItem } from '../../notebook/AddSheet';
import { connectEnricher, libraryEnricher, waitingEntries } from '../../notebook/enrich';
import { ItemSheet, useSheetFocus, type SheetItem } from '../../notebook/ItemSheet';
import { buildJournal, territoryState, type JournalContent, type WorkItem } from '../../notebook/journal';
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
import { begunPlaces, piecesOf, proofFor, splitRegions, touchedBy, UNPLACED, type Piece, type Proof } from '../library-c/mosaic';
import {
  collectionOrder, countsOf, DESK_CAPS, fieldsOf, groupsOf, hasStanding, hitOf, indexOf, isNote, isWork, issueOf, keptIn, markParts, nameOf, newest, pageOf, PHONE_CAPS, pictured, placeOf,
  searchEdition, shownIn, stepFor, whyOf, wordsOf, workStatus,
  type EditionInput, type Field, type Found, type IndexGroup, type Lead, type Section, type Shelf, type Standing, type StandingWord,
} from './edition';
import './library-f.css';

/*
 * Prototype F of the Library: the Edition. The learner's library set as an issue of a magazine: a
 * nameplate and a dateline, the newest question as the cover story, contents, their collections,
 * then a section for each of the few fields touched most recently (in the atlas's own order, each cut
 * from the same template), the other fields at the back under their subjects, and an index of
 * everything, nested as the atlas nests it, one tap from the masthead.
 * Real records only, read through their own modules; the only things written are collections and
 * what the Library's own sheets write.
 */

/** From this width of its own (not the window's: a desktop's sidebar takes some), the issue sets as a broadsheet. */
const DESK_WIDTH = 1040;
/** Search lists this many things, then offers the rest. */
const FOUND_ROWS = 40;
const FOUND_PLACES = 12;

export interface LibraryFProps {
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
  /** A place's next case, or its refresh. */
  onTryCase: (nodeId: string) => void;
  onOpenExpedition: (packId: string) => void;
}

type Screen = { kind: 'home' } | { kind: 'index' } | { kind: 'shelf'; id: string } | { kind: 'collection'; id: string };
/** Where the learner was, kept across visits within a session: each screen and how far down it was read. */
const kept: { stack: Screen[]; scrolls: number[] } = { stack: [{ kind: 'home' }], scrolls: [0] };

const NEUTRAL = '#9b9387';
const hueOf = (id: string | null | undefined) => (id && id !== UNPLACED && catalog.get(id) ? territoryColor(id) : NEUTRAL);
const hue = (id: string | null | undefined) => ({ ['--hue' as string]: hueOf(id) }) as CSSProperties;

// --- words ---------------------------------------------------------------------------------------

const DAY = 864e5;
const dayIndex = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 6e4) / DAY);
function when(iso: string, now: number): string {
  const t = Date.parse(iso);
  const gap = dayIndex(now) - dayIndex(t);
  if (gap <= 0) return 'today';
  if (gap === 1) return 'yesterday';
  const d = new Date(t);
  if (gap < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}
const longDate = (now: number) => new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const formatOf = (p: Piece) => (p.item.kind === 'work' ? p.item.work.format : '');
const isBook = (p: Piece) => p.item.kind === 'work' && p.item.work.kind === 'book';
/** A book or film's state, as a word: what it is to the learner now. */
function stateWord(p: Piece): string {
  const status = workStatus(p);
  if (!status) return '';
  if (isBook(p)) return { want: 'To read', started: 'Reading', finished: 'Finished', stopped: 'Stopped' }[status];
  if (p.item.kind === 'work' && p.item.work.kind === 'podcast') return { want: 'To hear', started: 'Listening', finished: 'Heard', stopped: 'Stopped' }[status];
  return { want: 'To watch', started: 'Watching', finished: 'Watched', stopped: 'Stopped' }[status];
}
const seen = (p: Piece) => p.stage === 'finished' || p.stage === 'proved';
const standingWord = (s: StandingWord | null) => (s === 'ready' ? 'ready to refresh' : s ?? '');

/** What a found thing's small line says: what it is or who made it, and where it was kept. Marked where the query begins a word. */
function FoundMeta({ piece, now, query }: { piece: Piece; now: number; query: string }) {
  const at = placeOf(piece);
  const by = bylineOf(piece);
  const parts: ReactNode[] = isNote(piece) ? [piece.kind === 'question' ? 'Your question' : 'Your note', when(piece.at, now)] : [by ? <Marked text={by} query={query} /> : piece.kind === 'reel' ? 'Reel' : piece.kind === 'video' ? 'Video' : piece.kind === 'link' ? 'Page' : formatOf(piece)];
  if (at) parts.push(<span className="ed-hue" style={hue(at)}><Marked text={nameOf(at)} query={query} /></span>);
  return <span className="ed-meta">{parts.filter(Boolean).map((part, i) => <span key={i}>{i > 0 && ' · '}{part}</span>)}</span>;
}
/** The maker a found thing's small line prints, if any. */
const bylineOf = (p: Piece) => (isNote(p) || p.kind === 'reel' ? '' : p.byline);

/** The small line under a title: what it is and where it came from. Never above the title. */
function Meta({ piece, now, place = true, extra }: { piece: Piece; now: number; place?: boolean; extra?: string }) {
  const at = placeOf(piece);
  const where = place && at ? <span className="ed-hue" style={hue(at)}>{nameOf(at)}</span> : null;
  let parts: ReactNode[];
  if (piece.kind === 'question' || piece.kind === 'idea') parts = [piece.kind === 'question' ? 'Your question' : 'Your note', when(piece.at, now), where];
  else if (piece.kind === 'reel') parts = ['Reel', where ?? (seen(piece) ? 'watched' : '')];
  else if (piece.kind === 'video') parts = [piece.byline || 'Video', seen(piece) ? 'watched' : ''];
  else if (piece.kind === 'link') parts = [piece.byline || 'Page'];
  else parts = [piece.byline || formatOf(piece)];
  if (extra) parts.push(extra);
  const shown = parts.filter(Boolean);
  return <span className="ed-meta">{shown.map((part, i) => <span key={i}>{i > 0 && ' · '}{part}</span>)}</span>;
}

// --- icons -------------------------------------------------------------------------------------

function Icon({ name }: { name: 'search' | 'plus' | 'map' | 'play' | 'back' | 'close' | 'check' }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'map' && <path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20zM9 4v13.5M15 6.5V20" />}
    {name === 'play' && <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />}
    {name === 'back' && <path d="m14.5 6-6 6 6 6" />}
    {name === 'close' && <path d="m7 7 10 10M17 7 7 17" />}
    {name === 'check' && <path d="m6 12.5 4 4 8-9" />}
  </svg>;
}

// --- pictures ----------------------------------------------------------------------------------

const LETTERBOXED = /\/(hq|sd)?default\.jpg/;

/** An image tried source by source: one that fails, or comes back as a stand-in too small to be the
 * real thing, gives way to the next. `onSize` hears the natural size of the one that loads. */
function Img({ sources, min = 2, onSize, onFail }: { sources: readonly string[]; min?: number; onSize?: (w: number, h: number) => void; onFail?: () => void }) {
  const [at, setAt] = useState(0);
  const src = sources[at];
  useEffect(() => { if (!src) onFail?.(); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!src) return null;
  return <img key={src} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={LETTERBOXED.test(src) ? 'is-letterbox' : undefined}
    onLoad={e => { const img = e.currentTarget; if (img.naturalWidth < min) setAt(n => n + 1); else onSize?.(img.naturalWidth, img.naturalHeight); }}
    onError={() => setAt(n => n + 1)} />;
}

/** A book or film's cover, or one set in type in its place's colour when it has none. */
function Cover({ piece, large = false, className = '' }: { piece: Piece; large?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const sources = [large ? piece.large : null, piece.image].filter((s, i, all): s is string => !!s && all.indexOf(s) === i);
  return <span className={`ed-cover ${className}`} style={hue(placeOf(piece))} aria-hidden="true">
    {sources.length && !failed ? <Img key={sources.join(' ')} sources={sources} onFail={() => setFailed(true)} /> : <span className="ed-type"><b>{piece.title}</b>{piece.byline && <small>{piece.byline}</small>}</span>}
  </span>;
}

/** A video's frame, a reel's still or a page's picture, in a 16:9 frame. */
function Frame({ piece, sources, className = '' }: { piece: Piece; sources?: readonly string[]; className?: string }) {
  const [failed, setFailed] = useState(false);
  const list = sources ?? (piece.image ? [piece.image] : []);
  if (!list.length || failed) return null;
  return <span className={`ed-frame${piece.kind === 'link' ? ' is-page' : ''} ${className}`} aria-hidden="true">
    <Img key={list.join(' ')} sources={list} min={piece.kind === 'video' ? 200 : 2} onFail={() => setFailed(true)} />
    {(piece.kind === 'video' || piece.kind === 'reel') && <span className="ed-play"><Icon name="play" /></span>}
  </span>;
}

/**
 * A picture that leads a block: across the column (out to the screen's edges on a phone) when its
 * source is sharp enough for that, otherwise at no more than half its own pixel width, so nothing is
 * ever drawn larger than it is. `sources` start with the largest copy there is.
 */
function Figure({ piece, sources, bleed, chip, className }: { piece: Piece; sources: readonly string[]; /** How far it reaches past its column, both sides together. */ bleed: number; chip?: ReactNode; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ big: boolean; w: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const expected = piece.kind === 'reel' || piece.kind === 'video';
  const big = fit ? fit.big : expected;
  if (!sources.length || failed) return null;
  return <span ref={ref} className={`${className} ${big ? 'is-big' : 'is-small'}${piece.kind === 'link' ? ' is-page' : ''}`} style={!big && fit ? { maxWidth: Math.round(fit.w / 2) } : undefined}>
    <span className="ed-fig-frame">
      <Img key={sources.join(' ')} sources={sources} min={piece.kind === 'video' ? 200 : 2} onFail={() => setFailed(true)} onSize={w => {
        // Sharp enough to cross the column: at least three quarters of a pixel per device pixel there.
        const column = (ref.current?.parentElement?.clientWidth ?? 0) + bleed;
        const density = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        setFit({ big: w >= column * density * 0.75, w });
      }} />
    </span>
    {chip}
  </span>;
}

// --- the page ------------------------------------------------------------------------------------

/** An element's own width, kept current. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function LibraryF(props: LibraryFProps) {
  const { exp, checks, entries, shelf, library, content } = props;
  const now = props.now ?? Date.now();
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now: props.now }), [exp, checks, entries, shelf, library, content, props.now]);
  const watchIds = usePoolIds(true);
  // Watch's memory of what was watched through; read again whenever the records change.
  const watched = useMemo(() => loadFeedMemory().watched, [journal]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => piecesOf(journal, { watchIds, watched, reelsWatched: shelf.watched }), [journal, watchIds, watched, shelf.watched]);
  const begun = useMemo(() => begunPlaces(exp, checks), [exp, checks]);
  const input: EditionInput = useMemo(() => {
    const activity = new Map<string, string>();
    const note = (nodeId: string | undefined, at: string) => { if (nodeId && at > (activity.get(nodeId) ?? '')) activity.set(nodeId, at); };
    for (const run of exp.runs) note(packPlace(run.packId)?.nodeId, run.at);
    for (const event of checks.events) note(event.node, event.at);
    return { pieces, status: journal.status, begun, split: splitRegions(touchedBy(journal, pieces, begun)), activity };
  }, [pieces, journal, begun, exp, checks]);
  const fields = useMemo(() => fieldsOf(input), [input]);
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root);
  const desk = width >= DESK_WIDTH;
  const wide = width >= 600;
  const issue = useMemo(() => issueOf(fields, pieces, input.split, desk ? DESK_CAPS : PHONE_CAPS, props.now ?? Date.now()), [fields, pieces, input.split, desk, props.now]);
  const byKey = useMemo(() => new Map(pieces.map(p => [p.key, p])), [pieces]);
  /** Things kept in each field and place, everything inside it counted: what its page lists. */
  const counts = useMemo(() => countsOf(pieces), [pieces]);
  const index = useMemo(() => indexOf(input), [input]);
  const backIndex = useMemo(() => indexOf(input, new Set(issue.back.map(f => f.id))), [input, issue.back]);
  /** How far a leading picture reaches past its column: out to the screen's edges, except on a broadsheet. */
  const bleed = desk ? 0 : 32;

  // The content chunk (packs, cases and the reels themselves): what a place's name can open, and a reel's own large picture.
  const [loaded, setLoaded] = useState<Content | null>(loadedContent);
  useEffect(() => { if (!loaded) void loadContent().then(setLoaded, () => {}); }, [loaded]);
  const hasCase = useCallback((nodeId: string) => !!loaded && loaded.hasCases(nodeId) && !!loaded.nextCase(nodeId, checks), [loaded, checks]);
  const keptReels = useMemo(() => loadKeptReels(), []);
  const reelOf = useCallback((id: string): Reel | undefined => loaded?.getReel(id) ?? keptReels.find(r => r.id === id), [loaded, keptReels]);
  /** A piece's picture at its largest first: a reel's own hero image, a video's full-size frame. */
  const largeOf = useCallback((p: Piece): string[] => {
    const list: (string | null | undefined)[] = [];
    if (p.kind === 'video' && p.videoId) list.push(`https://i.ytimg.com/vi/${p.videoId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg`);
    // Wide enough to cross the column at a tablet's or a desktop's width, not only a phone's.
    if (p.item.kind === 'reel') { const reel = reelOf(p.item.reel.id); const heroSrc = reel?.media[reel.hero]?.src; if (heroSrc) list.push(commonsAtWidth(heroSrc, wide ? 1280 : 960), heroSrc); }
    list.push(p.large, p.image);
    return list.filter((s, i): s is string => !!s && list.indexOf(s) === i);
  }, [reelOf, wide]);
  const dekOf = useCallback((p: Piece): string => {
    if (p.item.kind === 'reel') return reelOf(p.item.reel.id)?.takeaway ?? '';
    if (p.item.kind === 'link') return p.item.link.preview?.description ?? '';
    return '';
  }, [reelOf]);

  // Covers for books brought in by an import or from the shelf arrive in the background, as on the Library tab.
  connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); });
  const enricher = libraryEnricher();
  useEffect(() => { if (waitingEntries(props.getLibrary()).length) void enricher.start(); }, [enricher, props.getLibrary]);

  // Collections: their own record (library-c/collections.ts), merged with what another tab saved.
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
  const shelfCollections = useMemo(() => collectionOrder(liveCollections(collections)).map(collection => ({ collection, pieces: collection.items.map(key => byKey.get(key)).filter((p): p is Piece => !!p) })), [collections, byKey]);

  // Where the learner is: a stack of screens, each remembering how far down it was read.
  const [stack, setStackState] = useState<Screen[]>(kept.stack);
  const scroller = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<number | null>(kept.scrolls[kept.stack.length - 1] ?? 0);
  const screen = stack[stack.length - 1];
  const setStack = (next: Screen[], scroll: number) => {
    kept.scrolls[stack.length - 1] = scroller.current?.scrollTop ?? 0;
    kept.stack = next;
    kept.scrolls.length = next.length;
    restoreTo.current = scroll;
    setStackState(next);
  };
  const push = (next: Screen) => { setStack([...stack, next], 0); };
  const pop = () => { const next = stack.length > 1 ? stack.slice(0, -1) : [{ kind: 'home' } as Screen]; setStack(next, kept.scrolls[next.length - 1] ?? 0); };
  useLayoutEffect(() => {
    if (restoreTo.current === null || !scroller.current) return;
    scroller.current.scrollTop = restoreTo.current;
    restoreTo.current = null;
  });
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.lib-sheet-backdrop,[role=dialog]') && stack.length > 1) pop(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // A field's or a place's page: everything kept in it. A screen whose collection or page is gone (removed elsewhere) falls back home.
  const here = useMemo(() => (screen.kind === 'shelf' ? pageOf(screen.id, input) : null), [screen, input]);
  const gone = (screen.kind === 'collection' && !liveCollections(collections).some(c => c.id === screen.id)) || (screen.kind === 'shelf' && !here);
  useEffect(() => { if (gone) setStack([{ kind: 'home' }], 0); }, [gone]); // eslint-disable-line react-hooks/exhaustive-deps
  const nothing = pieces.length === 0 && fields.length === 0;
  // Search: one field in the masthead for the whole library. The shell's magnifier brings it up (an empty
  // library has nothing to search, so the magnifier then opens the shell's own search).
  // The field keeps its own letters, so a keystroke paints at once; the page follows as a transition.
  const [query, setQuery] = useState('');
  // Bumped to set the field again from empty: it holds its own letters (SearchField).
  const [searchKey, setSearchKey] = useState(0);
  const searchField = useRef<HTMLInputElement>(null);
  const openSearch = useCallback(() => {
    flushSync(() => { kept.stack = [{ kind: 'home' }]; kept.scrolls = [0]; restoreTo.current = 0; setStackState(kept.stack); });
    searchField.current?.focus();
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    if (nothing) return;
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
  }, [openSearch, nothing]);
  const found = useMemo(() => (wordsOf(query).length ? searchEdition(query, pieces, index, shelfCollections.map(s => s.collection)) : null), [query, pieces, index, shelfCollections]);
  const searching = !!found;
  // The Library tab, tapped while the Library shows: back to the issue with the search cleared, or (on it) back to its top.
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-action="open-notebook-mobile"],[data-action="open-notebook"]')) return;
      if (stack.length > 1 || query) {
        if (query) { setQuery(''); setSearchKey(k => k + 1); }
        setStack([{ kind: 'home' }], 0);
      } else scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  });

  // Sheets.
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  /** Every piece opens the real thing: Watch, Reels, the note, or the Library's own item page. */
  const openPiece = (piece: Piece) => {
    const item = piece.item;
    if (piece.kind === 'video' && piece.videoId) props.onOpenVideo(piece.videoId);
    else if (item.kind === 'reel') props.onOpenReel(item.reel.id);
    else if (item.kind === 'idea' || item.kind === 'question') props.onEdit(item.entry);
    else { setPreview(null); setItemKey(piece.key); }
  };
  const openShelf = (id: string) => { setItemKey(null); setPreview(null); push({ kind: 'shelf', id }); };
  const runStep = (nodeId: string, standing: 'ready' | 'begun' | 'proved') => {
    const step = stepFor(nodeId, standing, hasCase);
    if (step.kind === 'atlas') props.onNavigate(nodeId);
    else if (step.kind === 'lesson') props.onOpenExpedition(step.packId);
    else props.onTryCase(nodeId);
  };
  const runProof = (proof: Proof) => { if ((proof.kind === 'lesson' || proof.kind === 'again') && proof.packId) props.onOpenExpedition(proof.packId); else props.onTryCase(proof.nodeId); };

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
  const addFound = (item: FoundItem, status: ItemStatus): { key: string } | { error: string } => {
    const at = new Date().toISOString();
    const entry = item.source === 'ol' ? entryFromBook(item, status, at) : entryFromScreen(item, status, at);
    const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
    const problem = props.onLibraryChange(current => entryAt(current, key) ? setStatus(current, key, status, at) : upsertEntry(current, entry, at));
    return problem ? { error: problem } : { key };
  };

  // --- blocks ---

  const onMap = (id: string) => id !== UNPLACED && catalog.get(id)
    ? <button type="button" className="ed-onmap" style={hue(id)} onClick={() => props.onNavigate(id)} data-action="ed-on-map" data-node-id={id}><Icon name="map" />On the map</button>
    : null;

  const standingLines = (standing: Standing, scope: string) => {
    if (!hasStanding(standing)) return null;
    const line = (label: string, ids: readonly string[], kind: 'ready' | 'proved' | 'begun') => {
      if (!ids.length) return null;
      const shown = ids.slice(0, 4);
      return <div className={`is-${kind}`}>
        <dt>{label}</dt>
        <dd>{shown.map(id => <button type="button" key={id} style={hue(id)} onClick={() => runStep(id, kind)} data-standing={kind} data-node-id={id}>{nameOf(id)}</button>)}
          {ids.length > shown.length && <button type="button" className="is-more" onClick={() => openShelf(scope)}>{ids.length - shown.length} more</button>}</dd>
      </div>;
    };
    return <dl className="ed-standing">
      {line('Ready to refresh', standing.ready, 'ready')}
      {line('Proved', standing.proved, 'proved')}
      {line('Begun', standing.begun, 'begun')}
    </dl>;
  };

  const brief = (piece: Piece) => <li key={piece.key}>
    <button type="button" className={`ed-brief${piece.image ? '' : ' is-text'}`} onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind}>
      <span className="ed-brief-text"><span className="ed-h4">{piece.title}</span><Meta piece={piece} now={now} /></span>
      {piece.image && <Frame piece={piece} />}
    </button>
  </li>;

  const readingRow = (piece: Piece) => <li key={piece.key}>
    <button type="button" className="ed-row" onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind}>
      <Cover piece={piece} />
      <span className="ed-row-main"><span className="ed-h4">{piece.title}</span><Meta piece={piece} now={now} /></span>
      <span className={`ed-state${workStatus(piece) === 'started' ? ' is-now' : ''}`}>{stateWord(piece)}</span>
    </button>
  </li>;

  const readingTitle = (list: readonly Piece[]) => list.every(isBook) ? 'Reading list' : list.some(isBook) ? 'Books and films' : 'Films';

  const quoteBlock = (piece: Piece) => <div className="ed-quote" style={hue(placeOf(piece))}>
    <button type="button" onClick={() => openPiece(piece)} data-piece={piece.key} data-kind="idea">
      <span className="ed-bq">{piece.title}</span>
      <Meta piece={piece} now={now} />
    </button>
  </div>;

  const questionBlock = (piece: Piece) => <div className="ed-open">
    <button type="button" onClick={() => openPiece(piece)} data-piece={piece.key} data-kind="question">
      <span className="ed-open-q">{piece.title}</span>
      <Meta piece={piece} now={now} />
    </button>
  </div>;

  const featureBlock = (piece: Piece) => {
    // A book or film leads with its cover, set on the page as a cover is, never cut to a frame.
    if (isWork(piece)) return <article className="ed-feat is-work">
      <button type="button" onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind} data-feature="">
        <span className="ed-feat-cover"><Cover piece={piece} large /></span>
        <span className="ed-h3">{piece.title}</span>
        <Meta piece={piece} now={now} extra={stateWord(piece)} />
      </button>
    </article>;
    const dek = dekOf(piece);
    return <article className="ed-feat">
      <button type="button" onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind} data-feature="">
        <Figure piece={piece} sources={largeOf(piece)} bleed={bleed} className="ed-feat-fig" chip={(piece.kind === 'video' || piece.kind === 'reel') && <span className="ed-play is-big"><Icon name="play" /></span>} />
        <span className="ed-h3">{piece.title}</span>
        <Meta piece={piece} now={now} />
        {dek && <span className="ed-dek">{dek}</span>}
      </button>
    </article>;
  };

  const sectionBlock = (section: Section) => {
    const { field } = section;
    // The field's page holds everything in it: the count it prints is what "All" opens.
    const total = counts.get(field.id) ?? 0;
    const feature = section.feature && featureBlock(section.feature);
    const quote = section.quote && quoteBlock(section.quote);
    const briefs = section.briefs.length > 0 && <ul className={`ed-briefs${desk && section.feature ? ' is-row' : ''}`}>{section.briefs.map(brief)}</ul>;
    const reading = section.reading.length > 0 && <div className="ed-list"><h3>{readingTitle(section.reading)}</h3><ul>{section.reading.map(readingRow)}</ul></div>;
    const standing = standingLines(field.standing, field.id);
    const question = section.question && questionBlock(section.question);
    const body = desk
      ? <>
        <div className="ed-col">{feature}{briefs}</div>
        <div className="ed-col">{quote}{question}</div>
        <div className="ed-col">{reading}{standing}</div>
      </>
      : <>{feature}{quote}{briefs}{reading}{standing}{question}</>;
    return <section key={field.id} className="ed-sec" id={`ed-${field.id}`} data-section={field.id} style={hue(field.id)}>
      <header className="ed-sec-head">
        <h2><button type="button" onClick={() => openShelf(field.id)} data-shelf-link={field.id}>{field.name}</button></h2>
        {onMap(field.id)}
        <p className="ed-meta">{[field.path, total ? count(total, 'piece') : ''].filter(Boolean).join(' · ')}</p>
      </header>
      <div className="ed-sec-body">{body}</div>
      {total > shownIn(section) && <button type="button" className="ed-all" onClick={() => openShelf(field.id)} data-action="ed-all" data-shelf-link={field.id}>All {total} in {field.name}</button>}
    </section>;
  };

  const leadBlock = (lead: Lead) => {
    const { head, picture, story, placeId } = lead;
    const asQuestion = head.kind === 'question' || head.kind === 'idea';
    const where = placeId ?? (lead.fieldId !== UNPLACED ? lead.fieldId : null);
    const total = where ? counts.get(where) ?? 0 : 0;
    const onPage = where ? [head, picture, ...story].filter((p): p is Piece => !!p && keptIn(p, where)).length : 0;
    // A field with its own section in the issue says "All N in it" there, once; the lead leaves it to it.
    const sectioned = !!where && issue.sections.some(section => section.field.id === where);
    let figure: ReactNode = null;
    if (picture && isWork(picture)) {
      figure = <button type="button" className="ed-lead-cover" onClick={() => openPiece(picture)} data-piece={picture.key} data-kind={picture.kind} aria-label={picture.title}><Cover piece={picture} large /></button>;
    } else if (picture) {
      // The whole picture opens what it shows; another thing's picture carries its title as a label.
      const label = picture !== head ? <span className="ed-chip">{(picture.kind === 'reel' || picture.kind === 'video') && <Icon name="play" />}<span>{picture.title}</span></span> : null;
      figure = <button type="button" className="ed-lead-pic" onClick={() => openPiece(picture)} data-piece={picture.key} data-kind={picture.kind} aria-label={label ? undefined : picture.title}>
        <Figure piece={picture} sources={largeOf(picture)} bleed={bleed} className="ed-lead-fig" chip={label} />
      </button>;
    }
    return <article className={`ed-lead${figure ? '' : ' is-plain'}`} style={hue(placeId)} data-lead={head.key}>
      {figure}
      <div className="ed-lead-text">
        <h2><button type="button" onClick={() => openPiece(head)} data-piece={head.key} data-kind={head.kind}>{head.title}</button></h2>
        {asQuestion ? <Meta piece={head} now={now} /> : <Meta piece={head} now={now} extra={isWork(head) ? stateWord(head) : ''} />}
        {story.length > 0 && <ul className={`ed-story is-${story.length}`}>{story.map(p => <li key={p.key}>
          <button type="button" onClick={() => openPiece(p)} data-piece={p.key} data-kind={p.kind}>
            {isWork(p) ? <Cover piece={p} /> : p.image ? <Frame piece={p} className="is-story" /> : null}
            <span className="ed-h4">{p.title}</span>
            <span className="ed-meta">{isWork(p) ? stateWord(p) : p.kind === 'reel' ? 'Reel' : p.kind === 'video' ? (seen(p) ? 'Watched' : 'Video') : p.byline}</span>
          </button>
        </li>)}</ul>}
        {where && <div className="ed-lead-foot">
          {total > onPage && !sectioned ? <button type="button" className="ed-quiet" onClick={() => openShelf(where)} data-shelf-link={where}>All {total} in {nameOf(where)}</button> : <span />}
          {onMap(where)}
        </div>}
      </div>
    </article>;
  };

  const strip = (held: readonly Piece[]) => {
    const pics = held.filter(p => isWork(p) || p.image).slice(0, desk ? 9 : 6);
    if (!pics.length) return null;
    return <span className="ed-strip" aria-hidden="true">{pics.map(p => isWork(p) ? <Cover key={p.key} piece={p} /> : <Frame key={p.key} piece={p} className={p.kind === 'video' ? 'is-wide' : 'is-tall'} />)}</span>;
  };

  // Collections show once there is one; a new one is made from the index.
  const collectionsBlock = shelfCollections.length > 0 && <section className="ed-collections" aria-label="Collections">
    <div className="ed-block-head"><h2>Collections</h2><button type="button" className="ed-quiet" onClick={() => setEditing({ id: null })} data-action="ed-collection-new"><Icon name="plus" />New</button></div>
    <div className="ed-colls">{shelfCollections.map(({ collection, pieces: held }) => <button type="button" key={collection.id} className="ed-coll" onClick={() => push({ kind: 'collection', id: collection.id })} data-collection={collection.id}>
      <span className="ed-h3">{collection.name}</span>
      <span className="ed-meta">{count(held.length, 'piece')} · made {when(collection.createdAt, now)}</span>
      {strip(held)}
    </button>)}</div>
  </section>;

  const toc = (list: readonly Field[], onOpen: (field: Field) => void, attr: string) => <div className="ed-toc">{list.map(field => <button type="button" key={field.id} onClick={() => onOpen(field)} {...{ [attr]: field.id }}>
    <span>{field.name}</span><small>{counts.get(field.id) || ''}</small>
  </button>)}</div>;

  /** Subjects, then their fields, then the places inside, nested as the atlas nests them; each opens everything in it. */
  const indexList = (groups: readonly IndexGroup[], attr: 'data-index' | 'data-back') => groups.map(group => <section key={group.id} className="ed-index-group" data-index-group={group.id}>
    <h2><button type="button" onClick={() => openShelf(group.id)} {...{ [attr]: group.id }}><span>{group.name}</span><small>{group.count || ''}</small></button></h2>
    {group.rows.length > 0 && <ul>{group.rows.map(row => <li key={row.id} className={`is-level-${Math.min(row.level, 2)}`} style={{ ...hue(row.id), ['--level' as string]: row.level }}>
      <button type="button" onClick={() => openShelf(row.id)} {...{ [attr]: row.id }}><span>{row.name}</span><small>{row.count || standingWord(row.standing)}</small></button>
    </li>)}</ul>}
  </section>);

  const jumpTo = (id: string) => { document.getElementById(`ed-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };

  const row = (piece: Piece) => <li key={piece.key}>
    <button type="button" className={`ed-row is-${piece.kind}${isNote(piece) ? ' is-note' : ''}`} onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind}>
      {isWork(piece) ? <Cover piece={piece} /> : piece.image ? <Frame piece={piece} className="is-thumb" /> : <span className="ed-row-none" />}
      <span className="ed-row-main"><span className="ed-h4">{piece.title}</span><Meta piece={piece} now={now} /></span>
      {isWork(piece) && <span className={`ed-state${workStatus(piece) === 'started' ? ' is-now' : ''}`}>{stateWord(piece)}</span>}
    </button>
  </li>;

  /** A found thing: its title, maker and place marked where the query begins a word, and, when none of those
   * is why it was found, a few words of what was. */
  const foundRow = (piece: Piece, q: string) => {
    const at = placeOf(piece);
    const why = whyOf(piece, q, [bylineOf(piece), at ? nameOf(at) : '']);
    return <li key={piece.key}>
      <button type="button" className={`ed-row is-${piece.kind}${isNote(piece) ? ' is-note' : ''}`} onClick={() => openPiece(piece)} data-piece={piece.key} data-kind={piece.kind}>
        {isWork(piece) ? <Cover piece={piece} /> : piece.image ? <Frame piece={piece} className="is-thumb" /> : <span className="ed-row-none" />}
        <span className="ed-row-main"><span className="ed-h4"><Marked text={piece.title} query={q} /></span><FoundMeta piece={piece} now={now} query={q} />{why && <span className="ed-why"><Marked text={why} query={q} /></span>}</span>
        {isWork(piece) && <span className={`ed-state${workStatus(piece) === 'started' ? ' is-now' : ''}`}>{stateWord(piece)}</span>}
      </button>
    </li>;
  };

  const back = (label?: string) => {
    const previous = stack[stack.length - 2];
    const name = label ?? (!previous || previous.kind === 'home' ? 'Library' : previous.kind === 'index' ? 'Index' : previous.kind === 'shelf' ? nameOf(previous.id) : shelfCollections.find(s => s.collection.id === previous.id)?.collection.name ?? 'Library');
    return <button type="button" className="ed-back" onClick={pop} data-action="ed-back"><Icon name="back" /><span>{name}</span></button>;
  };

  let page: ReactNode = null;
  if (screen.kind === 'home') {
    const sections = issue.sections;
    page = <div className="ed-home" data-screen="home">
      <header className="ed-mast">
        <h1>Library</h1>
        <button type="button" className="ed-plus" onClick={() => setAdding(true)} aria-label="Add to your library" data-action="ed-add"><Icon name="plus" /></button>
        {!nothing && <SearchField key={searchKey} inputRef={searchField} initial={query} onQuery={setQuery} />}
        <div className="ed-dateline">
          <span><span className="ed-date">{longDate(now)}</span>{pieces.length > 0 && <span className="ed-count"> · {count(pieces.length, 'piece')}</span>}</span>
          {!nothing && <button type="button" onClick={() => push({ kind: 'index' })} data-action="ed-index">Index</button>}
        </div>
        {!searching && issue.ready.length > 0 && <div className="ed-due">
          <span>Ready to refresh</span>
          {issue.ready.map(id => <button type="button" key={id} style={hue(id)} onClick={() => runStep(id, 'ready')} data-refresh={id}>{nameOf(id)}</button>)}
        </div>}
      </header>
      {nothing ? <nav className="ed-empty" data-empty="">
        <div className="ed-toc">{catalog.getChildren(catalog.root).map(subject => <button type="button" key={subject.id} style={hue(subject.id)} onClick={() => props.onNavigate(subject.id)} data-subject={subject.id}>
          <span>{subject.name}</span><Icon name="map" />
        </button>)}</div>
      </nav> : found ? <SearchResults key={query} found={found} query={query} onShelf={openShelf} onCollection={id => push({ kind: 'collection', id })} row={foundRow} />
        : <>
          {issue.lead && leadBlock(issue.lead)}
          {(sections.length + issue.back.length >= 3 && sections.length > 0 || collectionsBlock) && <div className="ed-pair">
            {sections.length + issue.back.length >= 3 && sections.length > 0 && <nav className="ed-contents" aria-label="Contents">
              <div className="ed-block-head"><h2>Contents</h2></div>
              {toc(sections.map(s => s.field), field => jumpTo(field.id), 'data-contents')}
            </nav>}
            {collectionsBlock}
          </div>}
          {sections.map(sectionBlock)}
          {backIndex.length > 0 && <nav className="ed-further" aria-label="Also in the library">
            <div className="ed-block-head"><h2>Also in the library</h2></div>
            <div className="ed-index-list">{indexList(backIndex, 'data-back')}</div>
          </nav>}
        </>}
    </div>;
  } else if (screen.kind === 'index') {
    const places = index.reduce((n, group) => n + group.rows.length, 0);
    page = <div className="ed-index" data-screen="index">
      {back()}
      <header className="ed-page-head">
        <h1>Index</h1>
        <p className="ed-meta">{[count(index.filter(g => g.id !== UNPLACED).length, 'subject'), places ? count(places, 'place') : '', count(pieces.length, 'piece')].filter(Boolean).join(' · ')}</p>
      </header>
      <div className="ed-index-list">{indexList(index, 'data-index')}</div>
      <section className="ed-index-group is-collections" data-index-group="collections">
        <h2 className="ed-index-label"><span>Collections</span><button type="button" className="ed-quiet" onClick={() => setEditing({ id: null })} data-action="ed-collection-new"><Icon name="plus" />New collection</button></h2>
        {shelfCollections.length > 0 && <ul>{shelfCollections.map(({ collection, pieces: held }) => <li key={collection.id}>
          <button type="button" onClick={() => push({ kind: 'collection', id: collection.id })} data-collection={collection.id}><span>{collection.name}</span><small>{held.length}</small></button>
        </li>)}</ul>}
      </section>
    </div>;
  } else if (screen.kind === 'shelf') {
    if (here) page = <ShelfPage shelf={here} total={counts.get(here.id) ?? here.pieces.length} back={back()} onMap={onMap(here.id)} standing={standingLines(here.standing, here.id)}
      proof={here.id !== UNPLACED ? proofFor([here.id], journal.status, hasCase, begun) : null} loaded={loaded} onProof={runProof} onShelf={openShelf} row={row}
      onSaveHere={here.id !== UNPLACED ? () => setLinkSheet({ nodeId: here.id }) : undefined} />;
  } else if (screen.kind === 'collection') {
    const entry = shelfCollections.find(s => s.collection.id === screen.id);
    if (entry) page = <CollectionPage collection={entry.collection} held={entry.pieces} now={now} back={back()} status={journal.status} onEdit={() => setEditing({ id: entry.collection.id })}
      onOpen={openPiece} onPlace={id => props.onNavigate(id)} largeOf={largeOf} dekOf={dekOf} bleed={bleed} />;
  }

  return <div className="ed" ref={root} data-lab="library-f">
    <div className="notebook-workspace ed-scroll" ref={scroller} onScroll={e => { kept.scrolls[kept.stack.length - 1] = e.currentTarget.scrollTop; }} data-workspace="library-f">
      <div className="ed-page">
        {notice && <p className="ed-notice" role="status">{notice}<button type="button" className="ed-icon" onClick={() => setNotice('')} aria-label="Dismiss"><Icon name="close" /></button></p>}
        {page}
      </div>
    </div>

    {/* The add, item and link sheets are the Library tab's own, styled under its .lib scope. */}
    <div className="lib ed-sheets">
      {adding && <AddSheet library={library} initialNodeId={screen.kind === 'shelf' && catalog.get(screen.id) ? screen.id : null}
        onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
        onOpenFound={item => { setItemKey(null); setPreview(item); }} onOpenItem={key => { setPreview(null); setItemKey(key); }}
        onImported={() => { setAdding(false); void enricher.start(); }} onClose={() => setAdding(false)} />}
      {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(journal.status, nodeId)}
        caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
        onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
        onTryCase={props.onTryCase} onShowPlace={nodeId => { setAdding(false); if (pageOf(nodeId, input)) openShelf(nodeId); else { setItemKey(null); setPreview(null); props.onNavigate(nodeId); } }}
        onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
      {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </div>
    {editing && <CollectionSheet collection={editing.id ? liveCollections(collections).find(c => c.id === editing.id) ?? null : null} pieces={[...pieces].sort(newest)} now={now}
      onClose={() => setEditing(null)}
      onRemove={editing.id ? () => { changeCollections(record => removeCollection(record, editing.id!)); setEditing(null); setStack([{ kind: 'home' }], 0); } : undefined}
      onSave={(name, items) => {
        if (editing.id) {
          const id = editing.id;
          const problem = changeCollections(record => setCollectionItems(renameCollection(record, id, name), id, items));
          if (!problem) setEditing(null);
          return problem;
        }
        let made = '';
        const problem = changeCollections(record => { const result = createCollection(record, { name, items }); made = result.id; return result.record; });
        if (!problem) { setEditing(null); push({ kind: 'collection', id: made }); }
        return problem;
      }} />}
  </div>;
}

// --- search ------------------------------------------------------------------------------------

/** The masthead's search field. It holds its own letters and hands each change to the page as a transition, so
 * typing never waits for the page (an issue of hundreds of things) to set again. */
function SearchField({ inputRef, initial, onQuery }: { inputRef: RefObject<HTMLInputElement | null>; initial: string; onQuery: (query: string) => void }) {
  const [value, setValue] = useState(initial);
  const change = (next: string) => { setValue(next); startTransition(() => onQuery(next)); };
  return <label className="ed-search">
    <Icon name="search" />
    <input ref={inputRef} type="search" value={value} onChange={e => change(e.target.value)} placeholder="Search everything" aria-label="Search your library" enterKeyHint="search" autoComplete="off" spellCheck={false} data-action="ed-search" />
    {value && <button type="button" className="ed-clear" onClick={() => { change(''); inputRef.current?.focus(); }} aria-label="Clear search" data-action="ed-search-clear"><Icon name="close" /></button>}
  </label>;
}

function Marked({ text, query }: { text: string; query: string }) {
  return <>{markParts(text, query).map((part, i) => part.mark ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>)}</>;
}

function SearchResults({ found, query, onShelf, onCollection, row }: {
  found: Found; query: string; onShelf: (id: string) => void; onCollection: (id: string) => void; row: (piece: Piece, query: string) => ReactNode;
}) {
  // The first of each list at once; the rest when asked for, so a short query never sets hundreds of rows.
  const [allPlaces, setAllPlaces] = useState(false);
  const [allPieces, setAllPieces] = useState(false);
  const places = allPlaces ? found.places : found.places.slice(0, FOUND_PLACES);
  const pieces = allPieces ? found.pieces : found.pieces.slice(0, FOUND_ROWS);
  return <div className="ed-results" aria-live="polite" data-results={found.total}>
    {found.total === 0 ? <p className="ed-none">Nothing in the library matches “{query.trim()}”.</p> : <p className="ed-results-count">{count(found.total, 'match', 'matches')}</p>}
    {found.places.length > 0 && <section className="ed-rgroup" aria-label="Places">
      <h2>Places</h2>
      <ul>{places.map(place => <li key={place.id}>
        <button type="button" className="ed-rrow" style={hue(place.id)} onClick={() => onShelf(place.id)} data-result-shelf={place.id}>
          <span className="ed-row-main"><span className="ed-h4"><Marked text={place.name} query={query} /></span>{place.path && <span className="ed-meta">{place.path}</span>}</span>
          <span className="ed-count">{place.count || ''}</span>
        </button>
      </li>)}</ul>
      {places.length < found.places.length && <button type="button" className="ed-all" onClick={() => setAllPlaces(true)} data-action="ed-all-places">All {found.places.length} places</button>}
    </section>}
    {found.collections.length > 0 && <section className="ed-rgroup" aria-label="Collections">
      <h2>Collections</h2>
      <ul>{found.collections.map(({ collection }) => <li key={collection.id}>
        <button type="button" className="ed-rrow" onClick={() => onCollection(collection.id)} data-result-collection={collection.id}>
          <span className="ed-row-main"><span className="ed-h4"><Marked text={collection.name} query={query} /></span><span className="ed-meta">{count(collection.items.length, 'piece')}</span></span>
        </button>
      </li>)}</ul>
    </section>}
    {found.pieces.length > 0 && <section className="ed-rgroup" aria-label="In the library">
      <h2>In the library</h2>
      <ul className="ed-rows">{pieces.map(({ piece }) => row(piece, query))}</ul>
      {pieces.length < found.pieces.length && <button type="button" className="ed-all" onClick={() => setAllPieces(true)} data-action="ed-all-found">All {found.pieces.length}</button>}
    </section>}
  </div>;
}

// --- a subject, field or place, in full ----------------------------------------------------------

function ShelfPage({ shelf, total, back, onMap, standing, proof, loaded, onProof, onShelf, row, onSaveHere }: {
  shelf: Shelf; total: number; back: ReactNode; onMap: ReactNode; standing: ReactNode; proof: Proof | null; loaded: Content | null;
  onProof: (proof: Proof) => void; onShelf: (id: string) => void; row: (piece: Piece) => ReactNode; onSaveHere?: () => void;
}) {
  // Everything inside it: what is kept on it first, then a subject's or region's fields, or a field's places, in atlas order.
  const groups = useMemo(() => groupsOf(shelf), [shelf]);
  const pack = proof?.packId ? loaded?.getExpedition(proof.packId)?.pack : undefined;
  // The next step, unless a standing line above already offers it.
  const repeats = !!proof && ((proof.kind === 'refresh' && shelf.standing.ready.includes(proof.nodeId)) || (proof.kind === 'case' && shelf.standing.begun.includes(proof.nodeId)));
  const step = proof && !repeats && (proof.kind === 'refresh' ? { label: 'Ready to refresh', title: nameOf(proof.nodeId) }
    : proof.kind === 'lesson' ? { label: 'Lesson', title: pack?.title ?? nameOf(proof.nodeId) }
      : proof.kind === 'case' ? { label: 'A new case', title: nameOf(proof.nodeId) }
        : { label: 'Play again', title: pack?.title ?? nameOf(proof.nodeId) });
  return <div className="ed-shelf" data-screen="shelf" data-shelf={shelf.id} style={hue(shelf.id)}>
    {back}
    <header className="ed-page-head">
      <h1>{shelf.name}</h1>
      <p className="ed-meta">{[shelf.path, total ? count(total, 'piece') : ''].filter(Boolean).join(' · ')}</p>
      <div className="ed-page-tools">{onMap}{onSaveHere && <button type="button" className="ed-quiet" onClick={onSaveHere} data-action="ed-save-here"><Icon name="plus" />Save a link here</button>}</div>
    </header>
    {(standing || step) && <div className="ed-shelf-standing">
      {standing}
      {step && proof && <dl className="ed-standing is-step"><div><dt>{step.label}</dt><dd><button type="button" onClick={() => onProof(proof)} data-proof={proof.kind} data-node-id={proof.nodeId}>{step.title}</button></dd></div></dl>}
    </div>}
    {groups.map(group => <section key={group.id} className="ed-group" data-group={group.id}>
      {groups.length > 1 && (group.id === shelf.id
        ? <h2 className="ed-group-h">{shelf.name}</h2>
        : <h2 className="ed-group-h"><button type="button" onClick={() => onShelf(group.id)} data-shelf-link={group.id}>{nameOf(group.id)}</button><small>{group.pieces.length}</small></h2>)}
      <ul className="ed-rows">{group.pieces.map(p => row(p))}</ul>
    </section>)}
  </div>;
}

// --- a collection, as a long read ----------------------------------------------------------------

function CollectionPage({ collection, held, now, back, status, onEdit, onOpen, onPlace, largeOf, dekOf, bleed }: {
  collection: Collection; held: readonly Piece[]; now: number; back: ReactNode; status: ReadonlyMap<string, { litAt: string | null }>;
  onEdit: () => void; onOpen: (piece: Piece) => void; onPlace: (id: string) => void; largeOf: (p: Piece) => string[]; dekOf: (p: Piece) => string; bleed: number;
}) {
  const places = [...new Set(held.map(placeOf).filter((id): id is string => !!id))];
  const proved = places.filter(id => status.get(id)?.litAt);
  return <div className="ed-collection" data-screen="collection" data-collection-page={collection.id} style={hue(places[0])}>
    <div className="ed-article-tools">{back}<button type="button" className="ed-pill" onClick={onEdit} data-action="ed-collection-edit">Edit</button></div>
    <header className="ed-article-head">
      <h1>{collection.name}</h1>
      <p className="ed-meta">Made {when(collection.createdAt, now)} · {count(held.length, 'piece')}</p>
      {proved.length > 0 && <p className="ed-article-places"><span>Proved</span>{proved.map(id => <button type="button" key={id} style={hue(id)} onClick={() => onPlace(id)} data-standing="proved" data-node-id={id}>{nameOf(id)}</button>)}</p>}
    </header>
    {held.length ? <div className="ed-article">{held.map(p => {
      if (isNote(p)) return <button type="button" key={p.key} className="ed-art is-note" style={hue(placeOf(p))} onClick={() => onOpen(p)} data-piece={p.key} data-kind={p.kind}><span className="ed-bq">{p.title}</span><Meta piece={p} now={now} /></button>;
      if (isWork(p)) return <button type="button" key={p.key} className="ed-art is-work" onClick={() => onOpen(p)} data-piece={p.key} data-kind={p.kind}><Cover piece={p} large /><span><span className="ed-h3">{p.title}</span><Meta piece={p} now={now} extra={stateWord(p)} /></span></button>;
      if (pictured(p)) { const dek = dekOf(p); return <button type="button" key={p.key} className="ed-art is-picture" onClick={() => onOpen(p)} data-piece={p.key} data-kind={p.kind}>
        <Figure piece={p} sources={largeOf(p)} bleed={bleed} className="ed-art-fig" chip={(p.kind === 'video' || p.kind === 'reel') && <span className="ed-play is-big"><Icon name="play" /></span>} />
        <span className="ed-h3">{p.title}</span><Meta piece={p} now={now} />{dek && <span className="ed-dek">{dek}</span>}
      </button>; }
      return <button type="button" key={p.key} className="ed-art is-text" onClick={() => onOpen(p)} data-piece={p.key} data-kind={p.kind}><span className="ed-h3">{p.title}</span><Meta piece={p} now={now} /></button>;
    })}</div> : <button type="button" className="ed-quiet ed-fill" onClick={onEdit}><Icon name="plus" />Add things</button>}
  </div>;
}

// --- making and editing a collection -------------------------------------------------------------

function CollectionSheet({ collection, pieces, now, onSave, onRemove, onClose }: {
  collection: Collection | null; pieces: readonly Piece[]; now: number;
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
  const q = wordsOf(query);
  const list = q.length ? pieces.filter(p => hitOf(q, wordsOf(`${p.title} ${p.byline} ${p.text}`)) > 0) : pieces;
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  return <div className="lib-sheet-backdrop ed-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet ed-sheet" role="dialog" aria-modal="true" aria-label={collection ? 'Edit collection' : 'New collection'} tabIndex={-1} onClick={e => e.stopPropagation()} data-collection-sheet={collection ? 'edit' : 'new'}>
      <span className="lib-grab" aria-hidden="true" />
      <header className="ed-sheet-head">
        <label htmlFor={nameId} className="sr-only">Name</label>
        <input id={nameId} ref={nameField} className="ed-name-field" value={name} onChange={e => setName(e.target.value)} placeholder="Name this collection" maxLength={80} data-action="ed-collection-name" />
        <button type="button" className="ed-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <label className="ed-search is-sheet"><Icon name="search" /><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in your library" aria-label="Find in your library" /></label>
      <ul className="ed-pick">
        {list.map(piece => { const on = chosen.includes(piece.key); return <li key={piece.key}>
          <button type="button" aria-pressed={on} onClick={() => toggle(piece.key)} data-pick={piece.key}>
            <span className="ed-row-main"><span className="ed-h4">{piece.title}</span><Meta piece={piece} now={now} /></span>
            <span className={`ed-tick${on ? ' is-on' : ''}`}>{on && <Icon name="check" />}</span>
          </button>
        </li>; })}
      </ul>
      {problem && <p className="ed-notice" role="alert">{problem}</p>}
      <footer className="lib-sheet-foot ed-sheet-foot">
        {onRemove && (confirm
          ? <button type="button" className="ed-quiet is-danger" onClick={onRemove} data-action="ed-collection-remove-confirm">Delete this collection</button>
          : <button type="button" className="ed-quiet" onClick={() => setConfirm(true)} data-action="ed-collection-remove">Delete</button>)}
        <button type="button" className="ed-solid" disabled={!name.trim()} onClick={() => { const error = onSave(name, chosen); if (error) setProblem(error); }} data-action="ed-collection-save">{collection ? 'Done' : 'Create'}</button>
      </footer>
    </section>
  </div>;
}
