import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { catalog } from '../../core/catalog';
import { territoryColor } from '../../core/territoryTheme';
import type { NotebookEntry } from '../../core/notebook';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import type { ReelShelf } from '../../explore/pins';
import { loadFeedMemory } from '../../feed/memory';
import { usePoolIds } from '../../feed/usePool';
import { loadContent, loadedContent, type Content } from '../../contentLoader';
import { AddSheet, type FoundItem } from '../../notebook/AddSheet';
import { connectEnricher, libraryEnricher, waitingEntries } from '../../notebook/enrich';
import { ItemSheet, useSheetFocus, type SheetItem } from '../../notebook/ItemSheet';
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
} from './collections';
import { MapMark } from './MapMark';
import {
  areaOf, areasOf, begunPlaces, bindName, fieldPieces, fitMosaic, indexOf, matches, MOSAIC_MAX, piecesOf, placesOf, proofFor, recent, splitRegions, splitTiles, stageCap, tileMatch, tileName, touchedBy, UNPLACED, walks,
  type Area, type Box, type Mark, type Piece, type Place, type Proof, type Stage, STAGES,
} from './mosaic';
import './library-c.css';

/*
 * Prototype C of the Library: the Mosaic. What the learner keeps, as a flat grid of tiles cut from
 * the atlas's territories: one per field, sized by what is there, coloured by its land; the fields
 * that do not make a tile are an index under it. A tile opens into its places; a place into its
 * pieces, as a catalogue that ends in proof. Real records only: the library, notebook, ledgers, reel
 * shelf and Watch's memory, through their own modules.
 */

export interface LibraryCProps {
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
  /** A place's next case (or its refresh). */
  onTryCase: (nodeId: string) => void;
  onOpenExpedition: (packId: string) => void;
}

type Screen = { kind: 'home' } | { kind: 'area'; id: string } | { kind: 'place'; area: string; id: string } | { kind: 'collection'; id: string };
/** Kept across visits within a session: where the learner was in the Library. */
let keptStack: Screen[] = [{ kind: 'home' }];
let keptScroll = 0;

/** A tapped tile, where it stood on screen: the next level grows out of it. */
interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

const NEUTRAL = '#8f8b84';
const nameOf = (id: string) => catalog.get(id)?.name ?? id;
const parentName = (id: string) => { const node = catalog.get(id); return node?.parentId && node.depth > 1 ? nameOf(node.parentId) : ''; };
const hueOf = (id: string | null | undefined) => (id && id !== UNPLACED && catalog.get(id) ? territoryColor(id) : NEUTRAL);
const hue = (id: string | null | undefined) => ({ ['--hue' as string]: hueOf(id) }) as CSSProperties;
const day = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };

const STAGE_WORDS: Record<Piece['kind'], Record<Stage, string>> = {
  book: { saved: 'Saved', started: 'Reading', finished: 'Read', proved: 'Proved' },
  film: { saved: 'Saved', started: 'Watching', finished: 'Watched', proved: 'Proved' },
  video: { saved: 'Saved', started: 'Watched', finished: 'Watched', proved: 'Proved' },
  reel: { saved: 'Saved', started: 'Watched', finished: 'Watched', proved: 'Proved' },
  link: { saved: 'Saved', started: 'Saved', finished: 'Saved', proved: 'Saved' },
  idea: { saved: 'Written', started: 'Written', finished: 'Written', proved: 'Written' },
  question: { saved: 'Asked', started: 'Asked', finished: 'Asked', proved: 'Asked' },
};
const KIND_WORD: Record<Piece['kind'], string> = { book: 'Book', film: 'Film', video: 'Video', reel: 'Reel', link: 'Link', idea: 'Note', question: 'Question' };
const kindWord = (piece: Piece) => piece.item.kind === 'work' && piece.kind === 'film' ? piece.item.work.format : KIND_WORD[piece.kind];

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

function useSize(ref: React.RefObject<HTMLElement | null>): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize(current => { const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight); return current && current.w === w && current.h === h ? current : { w, h }; });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

// --- small pieces --------------------------------------------------------------------------------

function Icon({ name }: { name: 'play' | 'map' | 'plus' | 'back' | 'search' | 'close' | 'arrow' | 'check' }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'play' && <path d="M9 6.8v10.4l8.2-5.2Z" fill="currentColor" stroke="none" />}
    {name === 'map' && <path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5ZM9 4v13.5M15 6.5V20" />}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'arrow' && <path d="M5 12h13m-5-5 5 5-5 5" />}
    {name === 'check' && <path d="m6 12.5 4 4 8-9" />}
  </svg>;
}

/**
 * A piece's picture: its own image, or a typographic one in its place's colour. `natural` shows the
 * image whole at its own proportions (a cover is never cropped); `large` asks for its biggest copy.
 */
function Picture({ piece, className, natural = false, large = false }: { piece: Piece; className?: string; natural?: boolean; large?: boolean }) {
  const [failed, setFailed] = useState(0);
  const sources = [large ? piece.large : null, piece.image].filter((src, i, all): src is string => !!src && all.indexOf(src) === i);
  const src = sources[failed];
  const note = piece.kind === 'idea' || piece.kind === 'question';
  return <span className={`lc-pic is-${piece.kind}${src ? ' has-img' : ''}${natural ? ' is-natural' : ''}${className ? ` ${className}` : ''}`} style={hue(piece.nodeIds[0])} aria-hidden="true">
    {src
      ? <img key={src} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={e => { if (e.currentTarget.naturalWidth < 2) setFailed(n => n + 1); }} onError={() => setFailed(n => n + 1)} />
      : note ? <span className="lc-pic-quote">{piece.kind === 'question' ? '?' : '“'}</span> : <span className="lc-pic-type"><b>{piece.title}</b></span>}
    {(piece.kind === 'video' || piece.kind === 'reel') && <span className="lc-pic-play"><Icon name="play" /></span>}
  </span>;
}

/** A piece's path: only the steps the learner took with it, and the word for the last. A link and a note have no steps, only their day. */
function PathLine({ piece }: { piece: Piece }) {
  const at = STAGES.indexOf(piece.stage);
  const date = piece.dates[piece.stage];
  const word = STAGE_WORDS[piece.kind][piece.stage];
  return <span className="lc-path" style={hue(piece.nodeIds[0])} aria-label={`${word}${date ? ` ${day(date)}` : ''}`} data-stage={walks(piece) ? piece.stage : 'kept'}>
    {walks(piece) && <span className="lc-path-steps" aria-hidden="true">{STAGES.map((stage, i) => <i key={stage} className={i <= at ? 'is-on' : undefined} />)}</span>}
    <span>{word}{date ? ` ${day(date)}` : ''}</span>
  </span>;
}

/** Proof as small squares: filled for a proved place (dimmer as its proof ages), hollow when it is ready to refresh. */
function Marks({ marks, max = 8, note = '' }: { marks: readonly Mark[]; max?: number; note?: string }) {
  if (!marks.length) return null;
  return <span className="lc-marks" aria-hidden="true">
    {marks.slice(0, max).map(mark => <i key={mark.nodeId} className={mark.ready ? 'is-ready' : mark.lasting ? 'is-lasting' : undefined} style={mark.ready ? undefined : { opacity: 0.55 + 0.45 * mark.glow }} />)}
    {note && <em>{note}</em>}
  </span>;
}

// --- the mosaic ----------------------------------------------------------------------------------

interface TileModel {
  readonly id: string;
  readonly weight: number;
  readonly name: string;
  readonly sub: string;
  /** The atlas node behind its colour and its map mark. */
  readonly nodeId: string | null;
  readonly pieces: readonly Piece[];
  readonly marks: readonly Mark[];
  /** What a tile with nothing kept says instead of covers: how far its places are. */
  readonly state: string;
  /** How much of its colour it takes: proved land is lighter than land only kept. */
  readonly tone: number;
  readonly hit?: boolean;
  readonly dim?: boolean;
  readonly label: string;
}

/** Proved places light a tile, begun ones less: a field's tiles are told apart by what was done there. */
const toneOf = (marks: number, underway: number) => marks ? 38 + 3 * Math.min(3, marks - 1) : underway ? 32 : 27;

const ASPECT: Record<Piece['kind'], number> = { book: 0.66, film: 0.68, video: 1.6, reel: 0.72, link: 1.3, idea: 0.8, question: 0.8 };

function Tile({ tile, box, onOpen }: { tile: TileModel; box: Box; onOpen: (tile: TileModel, rect: Rect) => void }) {
  const named = tileName(box, tile.name, !!tile.nodeId);
  const { tile: size, pad, markSize, showMark, nameSize, lines } = named;
  const head = named.head + (tile.marks.length ? 16 : 0);
  // What is left under the name is the plate: covers, or the first title set in type. Covers come
  // before the tile's second line: on a short tile the line steps aside for them.
  const inner = box.h - pad * 2 - head;
  const showSub = !!tile.sub && size !== 's' && inner - 20 >= (tile.pieces.some(p => p.image) ? 46 : 24);
  const free = inner - (showSub ? 20 : 0) - 8;
  const cap = size === 'xl' ? Math.max(100, Math.min(170, box.h * 0.42)) : size === 'l' ? 78 : 58;
  const plate = free >= 34 ? Math.round(Math.min(cap, free)) : 0;
  const thumbs = useMemo(() => {
    if (!plate) return [] as Piece[];
    const width = box.w - pad * 2;
    const most = size === 'xl' ? 6 : size === 'l' ? 5 : 4;
    const out: Piece[] = [];
    let used = 0;
    for (const piece of tile.pieces.filter(p => p.image)) {
      const w = Math.round(plate * ASPECT[piece.kind]);
      if (used + w > width) { if (out.length) break; continue; }
      out.push(piece);
      used += w + 4;
      if (out.length >= most) break;
    }
    return out;
  }, [plate, box.w, pad, size, tile.pieces]);
  const first = tile.pieces[0];
  const quoteLines = Math.max(1, Math.min(3, Math.floor(Math.max(free, 17) / 18)));
  // With no pictures and the room for more than one title, the tile lists its titles, newest first, as a card in a catalogue drawer.
  const titles = !thumbs.length && tile.pieces.length > 1 && free >= 60 ? tile.pieces.slice(0, Math.min(8, Math.floor((free - 4) / 21))) : [];
  return <button type="button" className={`lc-tile is-${size}${tile.hit ? ' is-hit' : ''}${tile.dim ? ' is-dim' : ''}`}
    style={{ ...hue(tile.nodeId), left: box.x, top: box.y, width: box.w, height: box.h, ['--pad' as string]: `${pad}px`, ['--tone' as string]: `${tile.tone}%` }}
    onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onOpen(tile, { x: r.left, y: r.top, w: r.width, h: r.height }); }} aria-label={tile.label} data-tile={tile.id}>
    <span className="lc-tile-head">
      <span className="lc-tile-name" style={{ fontSize: nameSize, WebkitLineClamp: lines }}>{bindName(tile.name)}</span>
      {showMark && <MapMark nodeId={tile.nodeId!} size={markSize} />}
    </span>
    {showSub && <span className="lc-tile-sub">{tile.sub}</span>}
    <Marks marks={tile.marks} max={size === 's' ? 4 : 8} note={(size === 'xl' || size === 'l') && box.w - pad * 2 >= 10 * Math.min(8, tile.marks.length) + 100 && tile.marks.some(m => m.ready) ? 'Ready to refresh' : ''} />
    {thumbs.length > 0
      ? <span className="lc-plate" style={{ height: plate }}>{thumbs.map(piece => <Picture key={piece.key} piece={piece} className="lc-thumb" />)}</span>
      : titles.length > 1 ? <span className="lc-tile-titles">{titles.map(piece => <span key={piece.key}>{piece.title}</span>)}</span>
      : first ? <span className="lc-tile-quote" style={{ WebkitLineClamp: quoteLines }}>{first.title}</span>
        : tile.state ? <span className="lc-tile-quote is-state">{tile.state}</span> : null}
  </button>;
}

/** A tile that cannot show its whole name leaves the mosaic: `onDrop` hands those to the index under it. The
 * stage's height never follows what was dropped, or dropping and growing would chase each other. */
function Mosaic({ tiles, level, from, cap, onOpen, onDrop }: { tiles: readonly TileModel[]; level: string; from: Rect | null; cap: number | null; onOpen: (tile: TileModel, rect: Rect) => void; onDrop: (level: string, ids: string[]) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const size = useSize(frame);
  const phone = useMedia('(max-width: 800px)');
  const { boxes, dropped } = useMemo(() => size ? fitMosaic(tiles, size.w, size.h, phone ? 6 : 8) : { boxes: [] as Box[], dropped: [] as TileModel[] }, [tiles, size, phone]);
  const droppedKey = dropped.map(t => t.id).join(' ');
  useEffect(() => { onDrop(level, droppedKey ? droppedKey.split(' ') : []); }, [level, droppedKey, onDrop]);
  const byId = new Map(tiles.map(t => [t.id, t]));
  // The new level starts where the tapped tile stood on screen, and grows to fill the frame.
  const [origin, setOrigin] = useState<CSSProperties | null>(null);
  const measured = !!size;
  useLayoutEffect(() => {
    if (!from || !measured || !frame.current) return;
    const at = frame.current.getBoundingClientRect();
    if (!at.width || !at.height) return;
    setOrigin({ transform: `translate(${from.x - at.left}px, ${from.y - at.top}px) scale(${from.w / at.width}, ${from.h / at.height})`, transition: 'none' });
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setOrigin(null)); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [level, from, measured]);
  return <div className="lc-stage" style={cap ? { ['--cap' as string]: `${cap}px` } : undefined} data-tiles={tiles.length}>
    <div className="lc-frame" ref={frame}>
      <div key={level} className={`lc-layer${from ? (origin ? ' is-entering' : ' is-zoomed') : ' is-back'}`} style={origin ?? undefined}>
        {boxes.map(box => { const tile = byId.get(box.id); return tile ? <Tile key={box.id} tile={tile} box={box} onOpen={onOpen} /> : null; })}
      </div>
    </div>
  </div>;
}

/** The fields (or places) that did not make a tile: an index, each with its map mark and a few covers. */
function IndexRow({ id, name, sub, pieces, onOpen }: { id: string; name: string; sub: string; pieces: readonly Piece[]; onOpen: () => void }) {
  // Three covers, or two when they are wide frames: the name always keeps its room.
  const pictured = pieces.filter(p => p.image);
  const covers = pictured.slice(0, pictured.slice(0, 3).some(p => p.kind === 'video' || p.kind === 'link') ? 2 : 3);
  return <li className="lc-index-row" style={hue(id)}>
    <button type="button" onClick={onOpen} data-index={id}>
      <span className="lc-index-mark">{catalog.get(id) ? <MapMark nodeId={id} size={30} /> : <i />}</span>
      <span className="lc-index-main"><strong>{name}</strong>{(sub || (!covers.length && pieces[0])) && <small>{sub || pieces[0].title}</small>}</span>
      <span className="lc-index-covers">{covers.map(piece => <Picture key={piece.key} piece={piece} className="lc-index-pic" />)}</span>
    </button>
  </li>;
}

function Index<T extends { id: string; name: string; pieces: readonly Piece[] }>({ title, groups, onOpen, limit = 6 }: { title: string; groups: { subjectId: string; name: string; entries: T[] }[]; onOpen: (entry: T) => void; limit?: number }) {
  const [all, setAll] = useState(false);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  let left = all ? Infinity : limit;
  const shown = groups.map(group => { const entries = group.entries.slice(0, Math.max(0, left)); left -= entries.length; return { ...group, entries }; }).filter(g => g.entries.length);
  const grouped = groups.length > 1;
  return <section className="lc-index" aria-label={title} data-index-count={total}>
    <h2>{title}</h2>
    {shown.map(group => <div key={group.subjectId} className="lc-index-group">
      {grouped && <h3>{group.name}</h3>}
      <ul>{group.entries.map(entry => <IndexRow key={entry.id} id={entry.id} name={entry.name} sub={grouped ? parentName(entry.id) === group.name ? '' : parentName(entry.id) : parentName(entry.id)} pieces={entry.pieces} onOpen={() => onOpen(entry)} />)}</ul>
    </div>)}
    {total > limit && !all && <button type="button" className="lc-quiet lc-more" onClick={() => setAll(true)} data-action="index-all">Show all</button>}
  </section>;
}

// --- lists -------------------------------------------------------------------------------------

function CatalogueRow({ piece, showPlace, onOpen }: { piece: Piece; showPlace?: boolean; onOpen: (piece: Piece) => void }) {
  return <li className="lc-row">
    <button type="button" onClick={() => onOpen(piece)} data-piece={piece.key}>
      <Picture piece={piece} className="lc-row-pic" />
      <span className="lc-row-main">
        <strong>{piece.title}</strong>
        <small>{[piece.byline, kindWord(piece), showPlace && piece.nodeIds[0] ? nameOf(piece.nodeIds[0]) : ''].filter(Boolean).join(' · ')}</small>
        <PathLine piece={piece} />
      </span>
      {piece.nodeIds[0] ? <span className="lc-row-mark" style={hue(piece.nodeIds[0])}><MapMark nodeId={piece.nodeIds[0]} size={30} /></span> : <span />}
    </button>
  </li>;
}

function Catalogue({ pieces, showPlace, onOpen, limit }: { pieces: readonly Piece[]; showPlace?: boolean; onOpen: (piece: Piece) => void; limit?: number }) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? pieces.slice(0, limit) : pieces;
  return <>
    <ol className="lc-catalogue">{shown.map(piece => <CatalogueRow key={piece.key} piece={piece} showPlace={showPlace} onOpen={onOpen} />)}</ol>
    {limit && !all && pieces.length > limit && <button type="button" className="lc-quiet lc-more" onClick={() => setAll(true)}>Show all</button>}
  </>;
}

function ProofBlock({ proof, loaded, onRun }: { proof: Proof; loaded: Content | null; onRun: (proof: Proof) => void }) {
  const place = nameOf(proof.nodeId);
  const pack = proof.packId ? loaded?.getExpedition(proof.packId)?.pack : undefined;
  const words = proof.kind === 'refresh' ? { title: place, sub: 'Ready to refresh · one new case', verb: 'Refresh' }
    : proof.kind === 'lesson' ? { title: pack?.title ?? place, sub: [`Lesson · ${place}`, pack ? `${pack.minutes} min` : ''].filter(Boolean).join(' · '), verb: 'Begin' }
      : proof.kind === 'case' ? { title: place, sub: 'A new case to prove it', verb: 'Try a case' }
        : { title: pack?.title ?? place, sub: `Proved · play the lesson again`, verb: 'Play again' };
  return <button type="button" className={`lc-proof is-${proof.kind}`} style={hue(proof.nodeId)} onClick={() => onRun(proof)} data-proof={proof.kind} data-node-id={proof.nodeId} aria-label={`${words.verb}: ${words.title}`}>
    <MapMark nodeId={proof.nodeId} size={46} />
    <span className="lc-proof-main"><strong>{words.title}</strong><small>{words.sub}</small></span>
    <span className="lc-proof-go"><span>{words.verb}</span><Icon name="arrow" /></span>
  </button>;
}

function Back({ label, onBack }: { label: string; onBack: () => void }) {
  return <button type="button" className="lc-back" onClick={onBack} data-action="lc-back"><Icon name="back" /><span>{label}</span></button>;
}

// --- collections -------------------------------------------------------------------------------

/** A collection's first pictures, whole, standing side by side on its ground like books on a shelf. */
function Collage({ pieces }: { pieces: readonly Piece[] }) {
  const shown = pieces.filter(p => p.image).slice(0, 3);
  return <span className="lc-collage" aria-hidden="true" style={hue(pieces[0]?.nodeIds[0])}>
    {shown.length ? shown.map(piece => <Picture key={piece.key} piece={piece} natural={piece.kind !== 'video'} className="lc-collage-pic" />)
      : pieces[0] ? <span className="lc-collage-title">{pieces[0].title}</span> : null}
  </span>;
}

/** The fields a collection reaches into: each by its own map mark and name. */
function Hues({ ids }: { ids: readonly string[] }) {
  return <span className="lc-hues">{ids.slice(0, 5).map(id => <span key={id} style={hue(id)}>{catalog.get(id) ? <MapMark nodeId={id} size={22} /> : <i />}{id === UNPLACED ? 'Not placed' : nameOf(id)}</span>)}</span>;
}

function PickerSheet({ title, collection, pieces, onSave, onRemove, onClose }: {
  title: string; collection: Collection | null; pieces: readonly Piece[];
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
  const list = query.trim() ? pieces.filter(p => matches(p, query)) : pieces;
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet lc-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={e => e.stopPropagation()} data-picker={collection ? 'edit' : 'new'}>
      <span className="lib-grab" aria-hidden="true" />
      <header className="lc-sheet-head">
        <label htmlFor={nameId} className="sr-only">Name</label>
        <input id={nameId} ref={nameField} className="lc-name-field" value={name} onChange={e => setName(e.target.value)} placeholder="Name this collection" maxLength={80} data-action="collection-name" />
        <button type="button" className="lc-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <label className="lc-search is-sheet"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in your library" aria-label="Find in your library" /></label>
      <ul className="lc-pick">
        {list.map(piece => { const on = chosen.includes(piece.key); return <li key={piece.key}>
          <button type="button" aria-pressed={on} onClick={() => toggle(piece.key)} data-pick={piece.key}>
            <Picture piece={piece} className="lc-pick-pic" />
            <span className="lc-row-main"><strong>{piece.title}</strong><small>{[kindWord(piece), piece.nodeIds[0] ? nameOf(piece.nodeIds[0]) : ''].filter(Boolean).join(' · ')}</small></span>
            <span className={`lc-tick${on ? ' is-on' : ''}`} style={hue(piece.nodeIds[0])}>{on && <Icon name="check" />}</span>
          </button>
        </li>; })}
      </ul>
      {problem && <p className="lc-problem" role="alert">{problem}</p>}
      <footer className="lib-sheet-foot lc-sheet-foot">
        {onRemove && (confirm
          ? <button type="button" className="lc-quiet is-danger" onClick={onRemove} data-action="collection-remove-confirm">Delete this collection</button>
          : <button type="button" className="lc-quiet" onClick={() => setConfirm(true)} data-action="collection-remove">Delete</button>)}
        <button type="button" className="lc-solid" disabled={!name.trim()} onClick={() => { const error = onSave(name, chosen); if (error) setProblem(error); }} data-action="collection-save">{collection ? 'Done' : 'Create'}</button>
      </footer>
    </section>
  </div>;
}

/** A collection's first picture, whole, on a paper ground: a cover at its own size (never past its source), a video at 16:9. */
function Lead({ piece, onOpen }: { piece: Piece; onOpen: (piece: Piece) => void }) {
  return <button type="button" className={`lc-lead is-${piece.kind}`} style={hue(piece.nodeIds[0])} onClick={() => onOpen(piece)} data-piece={piece.key} data-lead="">
    <span className="lc-lead-ground"><Picture piece={piece} natural={piece.kind !== 'video'} large className="lc-lead-pic" /></span>
    <span className="lc-wall-cap">{piece.nodeIds[0] && <MapMark nodeId={piece.nodeIds[0]} size={24} />}<strong>{piece.title}</strong><small>{[piece.byline, piece.nodeIds[0] ? nameOf(piece.nodeIds[0]) : ''].filter(Boolean).join(' · ')}</small><PathLine piece={piece} /></span>
  </button>;
}

/** An empty library: the whole atlas, its subjects in its own order, each an even tile with its mark. */
function EmptyAtlas({ onOpen }: { onOpen: (nodeId: string) => void }) {
  return <ul className="lc-empty" data-empty="">
    {catalog.getChildren(catalog.root).map(subject => <li key={subject.id}>
      <button type="button" className="lc-tile is-ghost" style={hue(subject.id)} onClick={() => onOpen(subject.id)} aria-label={`${subject.name}: show it on the atlas`} data-tile={subject.id}>
        <span className="lc-tile-name">{subject.name}</span>
        <MapMark nodeId={subject.id} size={44} />
      </button>
    </li>)}
  </ul>;
}

// --- the page ------------------------------------------------------------------------------------

export function LibraryC(props: LibraryCProps) {
  const { exp, checks, entries, shelf, library, content, now } = props;
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now }), [exp, checks, entries, shelf, library, content, now]);
  const watchIds = usePoolIds(true);
  // Watch's memory of what was watched through; read again whenever the records change.
  const watched = useMemo(() => loadFeedMemory().watched, [journal]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => piecesOf(journal, { watchIds, watched, reelsWatched: shelf.watched }), [journal, watchIds, watched, shelf.watched]);
  const begun = useMemo(() => begunPlaces(exp, checks), [exp, checks]);
  const areas = useMemo(() => areasOf(journal, pieces, begun), [journal, pieces, begun]);
  const phone = useMedia('(max-width: 800px)');
  const home = useMemo(() => splitTiles(areas, phone ? MOSAIC_MAX.phone : MOSAIC_MAX.desktop), [areas, phone]);
  const pieceByKey = useMemo(() => new Map(pieces.map(p => [p.key, p])), [pieces]);
  const split = useMemo(() => splitRegions(touchedBy(journal, pieces, begun)), [pieces, journal, begun]);
  /** The field a piece sits in: the field of the place it was kept under. */
  const areasOfPiece = useCallback((piece: Piece) => [piece.nodeIds[0] ? areaOf(piece.nodeIds[0], split) ?? UNPLACED : UNPLACED], [split]);
  const placesCache = useMemo(() => new Map<string, Place[]>(), [journal, begun]); // eslint-disable-line react-hooks/exhaustive-deps
  const placesIn = useCallback((area: Area) => { let list = placesCache.get(area.id); if (!list) { list = placesOf(area, journal, begun); placesCache.set(area.id, list); } return list; }, [placesCache, journal, begun]);

  // The content chunk (packs and cases): what a proof can offer.
  const [loaded, setLoaded] = useState<Content | null>(loadedContent);
  useEffect(() => { if (!loaded) void loadContent().then(setLoaded, () => {}); }, [loaded]);
  const hasCase = useCallback((nodeId: string) => !!loaded && loaded.hasCases(nodeId) && !!loaded.nextCase(nodeId, checks), [loaded, checks]);
  const runProof = (proof: Proof) => { if ((proof.kind === 'lesson' || proof.kind === 'again') && proof.packId) props.onOpenExpedition(proof.packId); else props.onTryCase(proof.nodeId); };

  // Covers for books brought in from an import or the shelf arrive in the background, as on the Library tab.
  connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); });
  const enricher = libraryEnricher();
  useEffect(() => { if (waitingEntries(props.getLibrary()).length) void enricher.start(); }, [enricher, props.getLibrary]);

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
  const shelfOf = useMemo(() => liveCollections(collections).map(c => ({ collection: c, pieces: c.items.map(key => pieceByKey.get(key)).filter((p): p is Piece => !!p) })), [collections, pieceByKey]);

  // Tiles a mosaic had no room to name: they join the index under it.
  const [dropped, setDropped] = useState<{ level: string; ids: readonly string[] }>({ level: '', ids: [] });
  const onDrop = useCallback((level: string, ids: string[]) => setDropped(current => current.level === level && current.ids.join(' ') === ids.join(' ') ? current : { level, ids }), []);
  const droppedAt = (level: string) => dropped.level === level ? dropped.ids : [];

  // Where the learner is.
  const [stack, setStackState] = useState<Screen[]>(keptStack);
  const [from, setFrom] = useState<Rect | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const setStack = (next: Screen[]) => { keptStack = next; setStackState(next); };
  const screen = stack[stack.length - 1];
  const push = (next: Screen, zoom: Rect | null = null) => { setFrom(zoom); setStack([...stack, next]); scroller.current?.scrollTo({ top: 0 }); };
  const pop = () => { setFrom(null); setStack(stack.length > 1 ? stack.slice(0, -1) : [{ kind: 'home' }]); scroller.current?.scrollTo({ top: 0 }); };
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = keptScroll; }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.lib-sheet-backdrop,[role=dialog]') && stack.length > 1) pop(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // A screen whose collection is gone (removed in another tab) falls back home.
  useEffect(() => {
    if (screen.kind === 'collection' && !liveCollections(collections).some(c => c.id === screen.id)) setStack([{ kind: 'home' }]);
  }, [screen, collections]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search: one search for the whole library. On a phone it opens from the shell's own magnifier (which
  // searches the Library while the Library shows) and lays its results directly under the field.
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const searching = query.trim().length > 0;
  const openSearch = useCallback(() => {
    flushSync(() => { keptStack = [{ kind: 'home' }]; setStackState(keptStack); setSearchOpen(true); });
    searchField.current?.focus();
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  const closeSearch = () => { setQuery(''); setLit(null); setSearchOpen(false); searchField.current?.blur(); };
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

  // Sheets.
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [picker, setPicker] = useState<{ id: string | null } | null>(null);

  const openPiece = (piece: Piece) => {
    const item = piece.item;
    if (piece.kind === 'video' && piece.videoId) props.onOpenVideo(piece.videoId);
    else if (item.kind === 'reel') props.onOpenReel(item.reel.id);
    else if (item.kind === 'idea' || item.kind === 'question') props.onEdit(item.entry);
    else { setPreview(null); setItemKey(piece.key); }
  };
  /** A field opens on its places; with one place and nothing kept on the field itself, straight on that place. */
  const areaScreens = (area: Area): Screen[] => {
    const places = placesIn(area);
    return places.length === 1 && !fieldPieces(area).length ? [{ kind: 'place', area: area.id, id: places[0].id }] : [{ kind: 'area', id: area.id }];
  };
  const openArea = (area: Area, rect: Rect | null) => {
    const next = areaScreens(area);
    setQuery(''); setLit(null); setSearchOpen(false);
    push(next[0], next[0].kind === 'area' && placesIn(area).length >= 2 ? rect : null);
  };
  /** A place's page, from anywhere (an item's place chip): inside the field that holds it. */
  const openPlaceAt = (nodeId: string) => {
    const areaId = areaOf(nodeId, split);
    const area = areas.find(a => a.id === areaId);
    if (!area) { props.onNavigate(nodeId); return; }
    const place = placesIn(area).find(p => within(nodeId, p.id)) ?? null;
    const into = areaScreens(area);
    setItemKey(null); setPreview(null); setFrom(null);
    setStack([{ kind: 'home' }, ...(into[0].kind === 'place' ? into : place ? [into[0], { kind: 'place' as const, area: area.id, id: place.id }] : into)]);
    scroller.current?.scrollTo({ top: 0 });
  };

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

  // --- tiles for each level ---
  const label = (name: string, list: readonly Piece[], marks: readonly Mark[]) => [name, list.length ? `${list.length} kept` : '', marks.length ? `${marks.length} proved` : '', marks.some(m => m.ready) ? 'ready to refresh' : ''].filter(Boolean).join(', ');
  const stateOf = (marks: readonly Mark[], underway: number) => marks.length ? `Proved ${day(marks[marks.length - 1].litAt)}` : underway ? 'Begun' : '';
  const areaTile = (area: Area): TileModel => {
    const found = searching ? tileMatch(area, query) : null;
    const node = catalog.get(area.id);
    return {
      id: area.id, weight: area.weight, name: area.name, sub: node && node.depth > 1 ? parentName(area.id) : '',
      nodeId: area.id === UNPLACED ? null : area.id, pieces: found ? found.pieces : area.pieces, marks: area.marks, state: stateOf(area.marks, area.underway),
      tone: area.id === UNPLACED ? 26 : toneOf(area.marks.length, area.underway), hit: !!found?.hit, dim: !!found && !found.hit, label: label(area.name, area.pieces, area.marks),
    };
  };
  const placeTile = (area: Area, place: Place): TileModel => {
    const node = catalog.get(place.id);
    const between = node ? catalog.getPath(node).filter(n => n.depth > (catalog.get(area.id)?.depth ?? 0) && n.id !== place.id).map(n => n.name).join(' · ') : '';
    return {
      id: place.id, weight: place.weight, name: place.name, sub: between, nodeId: place.id, pieces: place.pieces, marks: place.marks, state: stateOf(place.marks, place.underway),
      tone: toneOf(place.marks.length, place.underway), label: label(place.name, place.pieces, place.marks),
    };
  };

  const openTile = (tile: TileModel, rect: Rect) => {
    if (screen.kind === 'home') { const area = areas.find(a => a.id === tile.id); if (area) openArea(area, rect); return; }
    if (screen.kind === 'area') push({ kind: 'place', area: screen.id, id: tile.id });
  };

  const currentArea = screen.kind === 'area' || screen.kind === 'place' ? areas.find(a => a.id === (screen.kind === 'area' ? screen.id : screen.area)) ?? null : null;
  // A field that has emptied (its things removed elsewhere) goes back to the mosaic.
  useEffect(() => { if ((screen.kind === 'area' || screen.kind === 'place') && !currentArea) setStack([{ kind: 'home' }]); }, [screen, currentArea]); // eslint-disable-line react-hooks/exhaustive-deps
  const backLabel = () => { const previous = stack[stack.length - 2]; return previous?.kind === 'area' ? nameOf(previous.id) : 'Library'; };

  const nothing = pieces.length === 0 && areas.length === 0;
  const results = searching ? pieces.filter(p => matches(p, query)) : [];
  const litAreas = searching ? areas.filter(a => results.some(p => a.pieces.includes(p))) : [];
  const shownResults = lit ? results.filter(p => areasOfPiece(p)[0] === lit) : results;
  const showSearch = !nothing && (!phone || searchOpen || searching);
  const search = <label className="lc-search">
    <Icon name="search" />
    <input ref={searchField} value={query} onChange={e => { setQuery(e.target.value); setLit(null); }} onFocus={() => setSearchOpen(true)} placeholder="Search your library" aria-label="Search your library" enterKeyHint="search" autoComplete="off" data-action="lc-search" />
    {query && <button type="button" className="lc-icon is-small" onClick={() => { setQuery(''); setLit(null); searchField.current?.focus(); }} aria-label="Clear search"><Icon name="close" /></button>}
  </label>;
  const addButton = <button type="button" className="lc-add" onClick={() => setAdding(true)} aria-label="Add to your library" data-action="lc-add"><Icon name="plus" /></button>;
  const recentSection = (limit: number) => pieces.length > 0 && <section className="lc-section lc-recent" aria-label="Recent">
    <h2>Recent</h2>
    <Catalogue pieces={recent(pieces)} showPlace onOpen={openPiece} limit={limit} />
  </section>;
  const collectionsSection = !nothing && <section className="lc-collections" aria-label="Collections">
    <header><h2>Collections</h2>{shelfOf.length > 0 && <button type="button" className="lc-quiet" onClick={() => setPicker({ id: null })} data-action="collection-new"><Icon name="plus" />New</button>}</header>
    <ul className="lc-shelf">
      {shelfOf.map(({ collection, pieces: held }) => <li key={collection.id}>
        <button type="button" className="lc-card" onClick={() => push({ kind: 'collection', id: collection.id })} data-collection={collection.id}>
          <Collage pieces={held} />
          <span className="lc-card-title">{collection.name}</span>
          <Hues ids={[...new Set(held.flatMap(areasOfPiece))]} />
        </button>
      </li>)}
      {!shelfOf.length && <li><button type="button" className="lc-card is-new" onClick={() => setPicker({ id: null })} data-action="collection-new-card"><span className="lc-collage is-new"><Icon name="plus" /></span><span className="lc-card-title">New collection</span></button></li>}
    </ul>
  </section>;

  let page: ReactNode;
  if (screen.kind === 'home') {
    const homeRest = [...home.rest, ...home.tiles.filter(area => droppedAt('home').includes(area.id))];
    const phoneSearch = phone && (searchOpen || searching);
    page = <div className={`lc-home${phoneSearch ? ' is-searching' : ''}`} data-screen="home">
      <header className="lc-head">
        <h1>Library</h1>
        {showSearch && search}
        {phoneSearch ? <button type="button" className="lc-quiet lc-cancel" onClick={closeSearch} data-action="lc-search-cancel">Cancel</button> : addButton}
      </header>
      {nothing ? <div className="lc-empty-stage">
        <EmptyAtlas onOpen={props.onNavigate} />
      </div> : phoneSearch ? <div className="lc-search-page">
        {searching && litAreas.length > 0 && <ul className="lc-lit" aria-label="Fields with a match">
          {litAreas.map(area => <li key={area.id} style={hue(area.id === UNPLACED ? null : area.id)}>
            <button type="button" aria-pressed={lit === area.id} onClick={() => setLit(current => current === area.id ? null : area.id)} data-lit={area.id}>
              {catalog.get(area.id) ? <MapMark nodeId={area.id} size={20} /> : <i />}{area.name}
            </button>
          </li>)}
        </ul>}
        {searching
          ? <section className="lc-results" aria-live="polite">{shownResults.length ? <Catalogue pieces={shownResults} showPlace onOpen={openPiece} /> : <p className="lc-none">Nothing kept matches “{query.trim()}”.</p>}</section>
          : recentSection(8)}
      </div> : <>
        <div className="lc-home-main">
          <Mosaic tiles={home.tiles.map(areaTile)} level="home" from={null} cap={stageCap(home.tiles.length, phone)} onOpen={openTile} onDrop={onDrop} />
          {!searching && homeRest.length > 0 && <Index title="Also in your library" groups={indexOf(homeRest)} onOpen={area => openArea(area, null)} />}
        </div>
        <div className="lc-home-side">
          {searching
            ? <section className="lc-results" aria-live="polite">{results.length ? <Catalogue pieces={results} showPlace onOpen={openPiece} /> : <p className="lc-none">Nothing kept matches “{query.trim()}”.</p>}</section>
            : <>{recentSection(phone ? 5 : 6)}{collectionsSection}</>}
        </div>
      </>}
    </div>;
  } else if (screen.kind === 'area' && currentArea) {
    const area = currentArea;
    const places = placesIn(area);
    const own = fieldPieces(area);
    const level = splitTiles(places, phone ? 6 : 9);
    const asMosaic = places.length >= 2;
    const listed = (asMosaic ? [...level.rest, ...level.tiles.filter(place => droppedAt(area.id).includes(place.id))] : [...places]).sort((a, b) => a.name.localeCompare(b.name));
    const proof = proofFor([...places.map(p => p.id), ...(own.length && area.id !== UNPLACED ? [area.id] : [])], journal.status, hasCase, begun);
    page = <div className={`lc-area${from ? ' is-zooming' : ''}`} data-screen="area" data-area={area.id} style={hue(area.id === UNPLACED ? null : area.id)}>
      <Back label={backLabel()} onBack={pop} />
      <header className="lc-head is-area">
        <div className="lc-title">
          <h1>{area.name}</h1>
          {catalog.get(area.id) && <p>{catalog.getPath(catalog.get(area.id)!).slice(1, -1).map(n => n.name).join(' · ')}</p>}
        </div>
        {catalog.get(area.id) && <button type="button" className="lc-atlas" onClick={() => props.onNavigate(area.id)} data-action="lc-show-atlas" aria-label={`Show ${area.name} on the atlas`}><MapMark nodeId={area.id} size={phone ? 62 : 72} whole /><span>Atlas</span></button>}
      </header>
      <div className="lc-body">
        <div className="lc-body-main">
          {asMosaic && <Mosaic tiles={level.tiles.map(place => placeTile(area, place))} level={area.id} from={from} cap={stageCap(level.tiles.length, phone)} onOpen={openTile} onDrop={onDrop} />}
          {listed.length > 0 && <Index title={asMosaic ? 'More places' : 'Places'} groups={[{ subjectId: area.id, name: area.name, entries: listed }]}
            onOpen={place => push({ kind: 'place', area: area.id, id: place.id })} limit={asMosaic ? 6 : 12} />}
        </div>
        <div className="lc-side">
          {area.pieces.length > 0 && <section className="lc-section"><h2>Everything here</h2><Catalogue pieces={area.pieces} showPlace onOpen={openPiece} limit={12} /></section>}
          {proof && <ProofBlock proof={proof} loaded={loaded} onRun={runProof} />}
        </div>
      </div>
    </div>;
  } else if (screen.kind === 'place' && currentArea) {
    const place = placesIn(currentArea).find(p => p.id === screen.id);
    const node = catalog.get(screen.id);
    if (place && node) {
      const own = journal.status.get(place.id);
      const state = territoryState(journal.status, place.id);
      const lead = place.marks.find(m => m.nodeId === place.id) ?? place.marks[place.marks.length - 1];
      const status = own?.litAt ? [`Proved ${day(own.litAt)}`, own.lastingAt ? 'lasting' : '', own.ready ? 'ready to refresh' : ''].filter(Boolean).join(' · ')
        : lead ? `${nameOf(lead.nodeId)} proved ${day(lead.litAt)}${lead.ready ? ' · ready to refresh' : ''}`
          : state === 'underway' ? 'Begun, not proved yet' : 'Not proved yet';
      const proof = proofFor([place.id], journal.status, hasCase, begun);
      const claim = (node as { description?: string }).description;
      page = <div className="lc-place" data-screen="place" data-place={place.id} style={hue(place.id)}>
        <Back label={backLabel()} onBack={pop} />
        <div className="lc-place-grid">
          <header className="lc-hero">
            <div className="lc-hero-top">
              <p>{catalog.getPath(node).slice(1, -1).map(n => n.name).join(' · ')}</p>
              <MapMark nodeId={place.id} size={phone ? 92 : 128} whole />
            </div>
            <h1>{place.name}</h1>
            {claim && <p className="lc-claim">{claim}</p>}
            <p className={`lc-status${own?.litAt || lead ? ' is-proved' : ''}${own?.ready || lead?.ready ? ' is-ready' : ''}`}><Marks marks={place.marks} />{status}</p>
            <div className="lc-hero-actions">
              <button type="button" className="lc-quiet" onClick={() => props.onNavigate(place.id)} data-action="lc-fly"><Icon name="map" />On the atlas</button>
              <button type="button" className="lc-quiet" onClick={() => setLinkSheet({ nodeId: place.id })} data-action="lc-save-here"><Icon name="plus" />Save a link here</button>
            </div>
          </header>
          <div className="lc-place-list">
            {place.pieces.length > 0 ? <Catalogue pieces={place.pieces} onOpen={openPiece} /> : <p className="lc-none">Nothing kept here yet.</p>}
            {proof && <ProofBlock proof={proof} loaded={loaded} onRun={runProof} />}
          </div>
        </div>
      </div>;
    }
  } else if (screen.kind === 'collection') {
    const entry = shelfOf.find(s => s.collection.id === screen.id);
    if (entry) {
      const { collection, pieces: held } = entry;
      const areaIds = [...new Set(held.flatMap(areasOfPiece))];
      const proof = proofFor([...new Set(held.flatMap(p => p.nodeIds.slice(0, 1)))], journal.status, hasCase, begun);
      const leadPiece = held.find(p => p.image) ?? null;
      const rest = held.filter(p => p !== leadPiece);
      page = <div className="lc-collection" data-screen="collection" data-collection={collection.id} style={hue(areaIds[0])}>
        <Back label="Library" onBack={pop} />
        <header className="lc-head is-collection">
          <div className="lc-title"><h1>{collection.name}</h1>{areaIds.length > 0 && <Hues ids={areaIds} />}</div>
          <button type="button" className="lc-quiet" onClick={() => setPicker({ id: collection.id })} data-action="collection-edit">Edit</button>
        </header>
        {held.length ? <div className="lc-collection-body">
          {leadPiece && <Lead piece={leadPiece} onOpen={openPiece} />}
          {rest.length > 0 && <ul className="lc-wall">
            {rest.map(piece => <li key={piece.key} className={`is-${piece.kind}`} style={hue(piece.nodeIds[0])}>
              <button type="button" onClick={() => openPiece(piece)} data-piece={piece.key}>
                {piece.kind === 'idea' || piece.kind === 'question'
                  ? <span className="lc-wall-note">{piece.title}</span>
                  : <Picture piece={piece} natural={piece.kind !== 'video'} large className="lc-wall-pic" />}
                <span className="lc-wall-cap">{piece.nodeIds[0] && <MapMark nodeId={piece.nodeIds[0]} size={22} />}{piece.kind !== 'idea' && piece.kind !== 'question' && <strong>{piece.title}</strong>}<small>{[piece.kind === 'idea' || piece.kind === 'question' ? kindWord(piece) : piece.byline, piece.nodeIds[0] ? nameOf(piece.nodeIds[0]) : ''].filter(Boolean).join(' · ')}</small><PathLine piece={piece} /></span>
              </button>
            </li>)}
          </ul>}
        </div> : <button type="button" className="lc-quiet lc-fill" onClick={() => setPicker({ id: collection.id })}><Icon name="plus" />Add things</button>}
        {proof && held.length > 0 && <ProofBlock proof={proof} loaded={loaded} onRun={runProof} />}
      </div>;
    }
  }

  return <div className="lc" data-lab="library-c">
    <div className="notebook-workspace lc-scroll" ref={scroller} onScroll={e => { keptScroll = e.currentTarget.scrollTop; }} data-workspace="library-c">
      <div className="lc-page">
        {notice && <p className="lc-problem" role="status">{notice}<button type="button" className="lc-icon is-small" onClick={() => setNotice('')} aria-label="Dismiss"><Icon name="close" /></button></p>}
        {page}
      </div>
    </div>

    {/* The add, item and link sheets are the Library tab's own, styled under its .lib scope. */}
    <div className="lib lc-sheets">
    {adding && <AddSheet library={library} initialNodeId={screen.kind === 'place' ? screen.id : screen.kind === 'area' && catalog.get(screen.id) ? screen.id : null}
      onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
      onOpenFound={found => { setItemKey(null); setPreview(found); }} onOpenItem={key => { setPreview(null); setItemKey(key); }}
      onImported={() => { setAdding(false); void enricher.start(); }} onClose={() => setAdding(false)} />}
    {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(journal.status, nodeId)}
      caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
      onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
      onTryCase={props.onTryCase} onShowPlace={nodeId => { setAdding(false); openPlaceAt(nodeId); }}
      onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
    {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </div>
    {picker && <PickerSheet title={picker.id ? 'Edit collection' : 'New collection'} collection={picker.id ? liveCollections(collections).find(c => c.id === picker.id) ?? null : null} pieces={recent(pieces, pieces.length)}
      onClose={() => setPicker(null)}
      onRemove={picker.id ? () => { changeCollections(record => removeCollection(record, picker.id!)); setPicker(null); setStack([{ kind: 'home' }]); } : undefined}
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

