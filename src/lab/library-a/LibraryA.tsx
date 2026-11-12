import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { catalog } from '../../core/catalog';
import { exportNotebook, type NotebookEntry } from '../../core/notebook';
import { territoryColor } from '../../core/territoryTheme';
import type { CheckLedger } from '../../checks/ledger';
import { Motif } from '../../components/MapDetails';
import { loadedContent } from '../../contentLoader';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import { packPlace } from '../../expeditions/manifest';
import { commonsAtWidth } from '../../explore/media';
import type { ReelShelf } from '../../explore/pins';
import { loadFeedMemory } from '../../feed/memory';
import { usePoolIds } from '../../feed/usePool';
import { AddSheet, type FoundItem } from '../../notebook/AddSheet';
import { connectEnricher, libraryEnricher } from '../../notebook/enrich';
import { ItemSheet, PlaceFinder, useSheetFocus, type SheetItem } from '../../notebook/ItemSheet';
import { buildJournal, territoryState, type JournalContent, type PlaceState, type WorkItem } from '../../notebook/journal';
import { entryAt, liveLinks, setStatus, upsertEntry, withLibrary, type ItemStatus, type LibraryStore, type SavedLink } from '../../notebook/libraryStore';
import { LinkSheet, type LinkDraft } from '../../notebook/LinkSheet';
import { entryFromBook } from '../../notebook/openLibrary';
import { mapPlaces, suggestPlaces } from '../../notebook/placeMap';
import { entryFromScreen } from '../../notebook/wikidata';
import '../../notebook/library.css';
import {
  createExhibition, EXHIBITIONS_KEY, exhibitionsInFile, hang, liveExhibitions, loadExhibitions, mergeExhibitions, readExhibitions, removeExhibition,
  saveExhibitions, takeDown, updateExhibition, withExhibitions, type ExhibitionStore,
} from './exhibitionStore';
import { buildGallery, hangingIn, searchGallery, type Exhibition, type Gallery, type PackInfo, type Piece, type PieceKind, type Plate, type ProofStop } from './gallery';
import { MapMark } from './MapMark';
import './library-a.css';

/*
 * Library, prototype A: exhibitions. The Library opens as an editorial index of exhibitions: the ones
 * the learner makes (a question or a theme) and the ones MoK suggests from what they have (a field they
 * are active in, a cluster of saves around a place). Inside, an exhibition hangs its pieces in a
 * designed order and ends in proof. Every piece and exhibition carries its places' colours and map
 * marks; a place flies the Atlas there, a video plays in Watch, a reel in Reels, a case or a lesson
 * opens in place.
 */

export interface LibraryAProps {
  exp: ExpeditionLedger;
  checks: CheckLedger;
  now: number;
  entries: readonly NotebookEntry[];
  shelf: ReelShelf;
  library: LibraryStore;
  content: JournalContent | null;
  onCreate: (kind: 'idea' | 'question', nodeId?: string) => void;
  onEdit: (entry: NotebookEntry) => void;
  /** Fly the Atlas to a place. */
  onNavigate: (nodeId: string) => void;
  onOpenReel: (reelId: string) => void;
  onOpenVideo: (videoId: string) => void;
  /** A place's next new case (or its questions when no case is left). */
  onProve: (nodeId: string) => void;
  /** A place's lesson. */
  onLesson: (packId: string, nodeId: string) => void;
  onSaveLink: (draft: LinkDraft) => string | null;
  onRemoveLink: (id: string) => void;
  onLibraryChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  getLibrary: () => LibraryStore;
  onImport: (raw: string) => void | Promise<void>;
}

type CatalogueKind = 'all' | 'video' | 'work' | 'reel' | 'link' | 'note';
type Page = { kind: 'index' } | { kind: 'exhibition'; id: string } | { kind: 'item'; key: string } | { kind: 'catalogue'; filter: CatalogueKind };

const nameOf = (id: string) => catalog.get(id)?.name ?? id;
const short = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
const longDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
const hue = (nodeId: string | null | undefined) => (nodeId ? { ['--place' as string]: territoryColor(nodeId) } as CSSProperties : undefined);
const toneOf = (key: string) => [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
const isLit = (state: PlaceState | undefined) => state === 'lit' || state === 'lasting';
const CATALOGUE: readonly [CatalogueKind, string, readonly PieceKind[]][] = [
  ['all', 'Everything', ['video', 'book', 'screen', 'reel', 'link', 'idea', 'question']],
  ['video', 'Videos', ['video']], ['work', 'Books and films', ['book', 'screen']], ['reel', 'Reels', ['reel']], ['link', 'Links', ['link']], ['note', 'Notes', ['idea', 'question']],
];
const KIND_WORD: Record<PieceKind, string> = { video: 'Video', reel: 'Reel', book: 'Book', screen: 'Film', link: 'Link', idea: 'Idea', question: 'Question' };
const STEP_WORD = { saved: 'Saved', started: 'Started', finished: 'Finished', proved: 'Proved' } as const;
const STOP = new Set('about after again also among and are because been before being between both but can could did does doing done each for from had has have how into its just more most much not now off once only other our out over same should some such than that the their them then there these they this those through too under until very was were what when where which while who why will with would you your'.split(' '));

/** A word as it is compared: lower case, without a plural ending. */
const stem = (word: string) => word.replace(/(?<=..)(ies|es|s)$/, '');
const wordsOf = (text: string) => text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
/** The words of a question that say what it is about. */
const keywords = (text: string) => [...new Set(wordsOf(text).filter(w => w.length > 3 && !STOP.has(w)).map(stem))].filter(w => w.length > 2);
/** Pieces that share a question's words (whole words: "genes" finds "gene", never "generations"), the closest first. */
function related(gallery: Gallery, text: string, limit = 12): Piece[] {
  const words = keywords(text);
  if (!words.length) return [];
  const score = (p: Piece) => { const hay = new Set(wordsOf(`${p.title} ${p.byline} ${p.item.text}`).map(stem)); return words.filter(w => hay.has(w)).length; };
  return gallery.pieces.map(p => [p, score(p)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || b[0].latest.localeCompare(a[0].latest)).slice(0, limit).map(([p]) => p);
}

// --- small parts --------------------------------------------------------------------------------

type IconName = 'search' | 'plus' | 'close' | 'back' | 'arrow' | 'play' | 'check' | 'external' | 'chevron';
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'chevron' && <path d="m9.5 6 6 6-6 6" />}
    {name === 'arrow' && <path d="M5 12h13m-5-5 5 5-5 5" />}
    {name === 'check' && <path d="m5.5 12.5 4 4 9-9.5" />}
    {name === 'play' && <path d="M9 6.8v10.4l8.2-5.2Z" fill="currentColor" stroke="none" />}
    {name === 'external' && <><path d="M13.5 5.5H18.5V10.5" /><path d="M18.5 5.5 11 13" /><path d="M16.5 13.5v4a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V9.5A1.5 1.5 0 0 1 7 8h4" /></>}
  </svg>;
}

/** The sizes worth trying for an image, best first, each falling back to the next: for a large panel,
 * YouTube's big widescreen frames before hqdefault (whose letterbox bars are cropped away), a larger
 * Commons thumbnail and Open Library's large cover; for a row, mqdefault, which every video has.
 * YouTube answers a missing frame with a small placeholder. */
const YOUTUBE = /^https:\/\/i\.ytimg\.com\/vi\/([\w-]{11})\/(?:hq|mq|sd|maxres)default\.jpg$/;
const OPEN_LIBRARY_M = /^(https:\/\/covers\.openlibrary\.org\/b\/id\/\d+)-M(\.jpg.*)$/;
function framesOf(src: string, large: boolean): string[] {
  const id = src.match(YOUTUBE)?.[1];
  if (id && !large) return [`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  if (id) return [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hq720.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  if (!large) return [src];
  const commons = commonsAtWidth(src, 960);
  if (commons !== src) return [commons, src];
  const book = src.match(OPEN_LIBRARY_M);
  return book ? [`${book[1]}-L${book[2]}`, src] : [src];
}

/** An image that steps aside when it fails (a YouTube placeholder counts as failing). With `fit`, one
 * smaller than its panel is shown at its own size, as an object, never stretched soft. */
function Img({ src, fallback = null, large = false, fit = false }: { src: string; fallback?: ReactNode; large?: boolean; fit?: boolean }) {
  const frames = useMemo(() => framesOf(src, large), [src, large]);
  const [at, setAt] = useState(0);
  const [small, setSmall] = useState<number | null>(null);
  useEffect(() => { setAt(0); setSmall(null); }, [src]);
  if (at >= frames.length) return <>{fallback}</>;
  const youtube = frames.length > 1 && YOUTUBE.test(src);
  const next = () => setAt(i => i + 1);
  const letterbox = youtube && frames[at].endsWith('/hqdefault.jpg');
  return <img key={frames[at]} src={frames[at]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
    className={[letterbox ? 'is-letterbox' : '', small ? 'is-small' : ''].filter(Boolean).join(' ') || undefined}
    style={small ? { ['--natural' as string]: `${small}px` } as CSSProperties : undefined}
    onError={next} onLoad={event => {
      const img = event.currentTarget;
      if (img.naturalWidth < (youtube ? 200 : 2)) return next();
      const box = img.parentElement?.clientWidth ?? 0;
      if (fit && box && img.naturalWidth < box) setSmall(img.naturalWidth);
    }} />;
}

function TypeCover({ title, creator, tone }: { title: string; creator?: string; tone: string }) {
  return <span className="lxa-type" style={{ ['--tone' as string]: `${toneOf(tone)}` } as CSSProperties}><b>{title}</b>{creator && <small>{creator}</small>}</span>;
}

function PlateView({ plate, large }: { plate: Plate; large: boolean }) {
  if (plate.kind === 'type') return <span className="lxa-plate is-type"><TypeCover title={plate.title} creator={plate.creator} tone={plate.tone} /></span>;
  if (plate.kind === 'cover') return <span className="lxa-plate is-cover"><Img src={plate.src} large={large} fallback={<TypeCover title={plate.title} tone={plate.src} />} /></span>;
  // A video frame hangs whole, as a print on the ground: its lettering is never cut.
  if (plate.kind === 'frame') return <span className="lxa-plate is-frame"><span className="lxa-frame"><Img src={plate.src} large={large} /></span></span>;
  return <span className="lxa-plate is-photo"><Img src={plate.src} large={large} fit /></span>;
}

function Collage({ plates, variant, max = 4, nodeId }: { plates: readonly Plate[]; variant: 'lead' | 'card' | 'hero'; max?: number; nodeId?: string }) {
  const shown = plates.slice(0, max);
  return <div className={`lxa-collage is-${variant} has-${shown.length}`} aria-hidden="true" style={hue(nodeId)}>
    {shown.map((plate, i) => <PlateView key={i} plate={plate} large={variant !== 'card' && i < 2} />)}
    {!shown.length && nodeId && <MapMark nodeId={nodeId} size={variant === 'card' ? 72 : 140} />}
  </div>;
}

/** Saved → Started → Finished → Proved, as four marks on a line; the proved mark in its place's colour. */
function PathDots({ piece }: { piece: Piece }) {
  if (!piece.path.length) return null;
  return <span className="lxa-path" style={hue(piece.provedIn)} role="img" aria-label={piece.path.map(m => `${STEP_WORD[m.step]}${m.done ? '' : ' not yet'}`).join(', ')}>
    {piece.path.map(m => <i key={m.step} className={`${m.done ? 'is-done' : ''} is-${m.step}`} />)}
  </span>;
}

function pathWord(piece: Piece): string {
  if (!piece.path.length) return piece.kind === 'question' ? 'Question' : 'Idea';
  const [saved, started, finished, proved] = piece.path;
  const watchKind = piece.kind === 'video' || piece.kind === 'reel' || piece.kind === 'screen';
  if (proved.done) return `Proved${proved.at ? ` ${short(proved.at)}` : ''}`;
  if (finished.done) return `${piece.kind === 'book' ? 'Finished' : watchKind ? 'Watched' : 'Finished'}${finished.at ? ` ${short(finished.at)}` : ''}`;
  if (started.done) return piece.kind === 'book' ? 'Reading' : piece.kind === 'screen' ? 'Watching' : 'Started';
  return `Saved ${short(saved.at)}`;
}

function Thumb({ piece, playIcon = true }: { piece: Piece; playIcon?: boolean }) {
  const cls = piece.kind === 'video' ? 'is-wide' : piece.kind === 'reel' ? 'is-tall' : piece.kind === 'book' || piece.kind === 'screen' ? 'is-book' : 'is-square';
  const fallback = piece.kind === 'book' || piece.kind === 'screen' ? <TypeCover title={piece.title} tone={piece.key} />
    : piece.kind === 'idea' || piece.kind === 'question' ? <span className="lxa-thumb-note">{piece.kind === 'question' ? '?' : '“'}</span>
      : <span className="lxa-thumb-mark" style={hue(piece.nodeIds[0])} />;
  return <span className={`lxa-thumb ${cls}`} style={hue(piece.nodeIds[0])} aria-hidden="true">
    {piece.image ? <Img src={piece.image} fallback={fallback} /> : fallback}
    {playIcon && piece.kind === 'video' && <i className="lxa-play"><Icon name="play" /></i>}
  </span>;
}

function Marks({ places, status, size = 22, limit = 3 }: { places: readonly string[]; status: (id: string) => PlaceState; size?: number; limit?: number }) {
  return <span className="lxa-marks">{places.slice(0, limit).map(id => <MapMark key={id} nodeId={id} state={status(id)} size={size} />)}</span>;
}

function proofLine(ex: Exhibition): { text: string; nodeId: string } | null {
  const ready = ex.proof.find(stop => stop.ready);
  if (ready) return { text: `Ready to refresh · ${nameOf(ready.nodeId)}`, nodeId: ready.nodeId };
  const proved = ex.proof.filter(stop => isLit(stop.state));
  if (proved.length) return { text: `Proved · ${proved.map(stop => nameOf(stop.nodeId)).join(', ')}`, nodeId: proved[0].nodeId };
  return null;
}

// --- sheets -------------------------------------------------------------------------------------

function Sheet({ label, onClose, children, wide }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSheetFocus(ref, onClose, () => ref.current?.querySelector<HTMLElement>('[data-autofocus]'));
  return <div className="lxa-backdrop" onClick={onClose}>
    <section ref={ref} className={`lxa-sheet${wide ? ' is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={event => event.stopPropagation()}>
      <span className="lxa-grab" aria-hidden="true" />
      <button type="button" className="lxa-icon lxa-sheet-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      {children}
    </section>
  </div>;
}

/** The places a question seems to be about, from its words and from the things that share them: the most
 * particular first. */
function placesFor(title: string, near: readonly Piece[]): string[] {
  const fromWords = title.trim().length > 3 ? suggestPlaces(title, '', 3) : [];
  const tally = new Map<string, number>();
  for (const piece of near) for (const id of piece.nodeIds) tally.set(id, (tally.get(id) ?? 0) + 1);
  const fromThings = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  return [...new Set([...fromWords, ...fromThings])].filter(id => catalog.get(id)).sort((a, b) => (catalog.get(b)?.depth ?? 0) - (catalog.get(a)?.depth ?? 0));
}

/** A question or a theme: the places it seems to be about and the things you have that share its words. */
function NewExhibition({ gallery, initial, hangKey, onCreate }: {
  gallery: Gallery; initial: string; hangKey?: string;
  onCreate: (input: { title: string; places: string[]; items: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial);
  // Places the learner turned on or off; the rest follow the question (the two most particular are on).
  const [placesSet, setPlacesSet] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [extra, setExtra] = useState<string[]>([]);
  const [itemsOff, setItemsOff] = useState<ReadonlySet<string>>(new Set());
  const [finding, setFinding] = useState(false);
  const near = useMemo(() => related(gallery, title, 8), [gallery, title]);
  const places = useMemo(() => [...new Set([...extra, ...placesFor(title, near)])].slice(0, 6), [title, near, extra]);
  const isOn = (id: string) => placesSet.get(id) ?? (extra.includes(id) || places.filter(p => !extra.includes(p)).indexOf(id) < 2);
  const chosen = places.filter(isOn);
  const items = [...new Set([...(hangKey ? [hangKey] : []), ...near.map(p => p.key)])].filter(key => !itemsOff.has(key));
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onCreate({ title: title.trim(), places: chosen.slice(0, 4), items }); };
  const toggle = <T,>(set: ReadonlySet<T>, value: T) => { const next = new Set(set); if (next.has(value)) next.delete(value); else next.add(value); return next; };
  return <form className="lxa-new" onSubmit={submit} data-new-exhibition="">
    <textarea className="lxa-question" rows={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value.replace(/\n/g, ' '))}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (title.trim()) submit(event); } }}
      placeholder="A question or a theme" aria-label="A question or a theme" data-autofocus="" data-action="exhibition-title" />
    {title.trim().length > 2 && <>
      <div className="lxa-new-group">
        <h3>About</h3>
        <div className="lxa-chips">
          {places.map(id => <button key={id} type="button" className={`lxa-chip${isOn(id) ? ' is-on' : ''}`} style={hue(id)} onClick={() => setPlacesSet(map => new Map(map).set(id, !isOn(id)))} aria-pressed={isOn(id)} data-action="exhibition-place" data-node-id={id}>
            <MapMark nodeId={id} size={20} />{nameOf(id)}
          </button>)}
          <button type="button" className="lxa-chip is-quiet" onClick={() => setFinding(f => !f)} aria-expanded={finding}><Icon name="plus" />Place</button>
        </div>
        {finding && <PlaceFinder exclude={places} onPick={id => { setExtra(list => [...list, id]); setFinding(false); }} />}
      </div>
      {near.length > 0 && <div className="lxa-new-group">
        <h3>From your library</h3>
        <ul className="lxa-pick-list">{near.map(piece => <li key={piece.key}>
          <button type="button" className={`lxa-pick${itemsOff.has(piece.key) ? '' : ' is-on'}`} onClick={() => setItemsOff(set => toggle(set, piece.key))} aria-pressed={!itemsOff.has(piece.key)} data-action="exhibition-piece">
            <Thumb piece={piece} /><span className="lxa-row-text"><strong>{piece.title}</strong><small>{KIND_WORD[piece.kind]} · {piece.byline}</small></span>
            <span className="lxa-tick" aria-hidden="true"><Icon name="check" /></span>
          </button>
        </li>)}</ul>
      </div>}
    </>}
    <footer className="lxa-sheet-foot">
      <button type="submit" className="lxa-btn is-solid" disabled={!title.trim()} data-action="create-exhibition">Begin it</button>
    </footer>
  </form>;
}

/** Hang things in an exhibition, or take them down. */
function HangSheet({ gallery, exhibition, onToggle, onAddNew, onClose }: { gallery: Gallery; exhibition: Exhibition; onToggle: (key: string, on: boolean) => void; onAddNew: () => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inside = new Set(exhibition.pieces.map(p => p.key));
  const list = query.trim() ? searchGallery(gallery, query).pieces : [...gallery.pieces].sort((a, b) => Number(inside.has(b.key)) - Number(inside.has(a.key)) || b.latest.localeCompare(a.latest));
  return <Sheet label={`Hang in ${exhibition.title}`} onClose={onClose}>
    <h2 className="lxa-sheet-title">{exhibition.title}</h2>
    <label className="lxa-search is-sheet"><Icon name="search" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find in your library" aria-label="Find in your library" data-autofocus="" data-action="hang-search" /></label>
    <button type="button" className="lxa-pick is-new" onClick={onAddNew} data-action="hang-new"><span className="lxa-thumb is-square lxa-plus"><Icon name="plus" /></span><span className="lxa-row-text"><strong>Something new</strong><small>A book, film or link</small></span></button>
    <ul className="lxa-pick-list">{list.slice(0, 80).map(piece => <li key={piece.key}>
      <button type="button" className={`lxa-pick${inside.has(piece.key) ? ' is-on' : ''}`} onClick={() => onToggle(piece.key, !inside.has(piece.key))} aria-pressed={inside.has(piece.key)} data-action="hang-piece" data-key={piece.key}>
        <Thumb piece={piece} /><span className="lxa-row-text"><strong>{piece.title}</strong><small>{KIND_WORD[piece.kind]} · {piece.nodeIds.map(nameOf).join(', ')}</small></span>
        <span className="lxa-tick" aria-hidden="true"><Icon name="check" /></span>
      </button>
    </li>)}</ul>
  </Sheet>;
}

function EditSheet({ exhibition, onSave, onRemove, onClose }: { exhibition: Exhibition; onSave: (patch: { title: string; intro: string; places: string[] }) => void; onRemove: () => void; onClose: () => void }) {
  const [title, setTitle] = useState(exhibition.title);
  const [intro, setIntro] = useState(exhibition.stored?.intro ?? '');
  const [places, setPlaces] = useState<string[]>([...(exhibition.stored?.places ?? [])]);
  const [finding, setFinding] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return <Sheet label="Edit the exhibition" onClose={onClose}>
    <form className="lxa-new" onSubmit={event => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), intro: intro.trim(), places }); }}>
      <textarea className="lxa-question" rows={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value.replace(/\n/g, ' '))} aria-label="Title" data-autofocus="" />
      <input className="lxa-line" value={intro} maxLength={280} onChange={event => setIntro(event.target.value)} placeholder="One line under the title" aria-label="One line under the title" />
      <div className="lxa-new-group">
        <h3>About</h3>
        <div className="lxa-chips">
          {places.map(id => <span key={id} className="lxa-chip is-on" style={hue(id)}><MapMark nodeId={id} size={20} />{nameOf(id)}<button type="button" className="lxa-chip-x" onClick={() => setPlaces(list => list.filter(p => p !== id))} aria-label={`Not about ${nameOf(id)}`}><Icon name="close" /></button></span>)}
          {places.length < 4 && <button type="button" className="lxa-chip is-quiet" onClick={() => setFinding(f => !f)} aria-expanded={finding}><Icon name="plus" />Place</button>}
        </div>
        {finding && <PlaceFinder exclude={places} onPick={id => { setPlaces(list => [...list, id]); setFinding(false); }} />}
      </div>
      <footer className="lxa-sheet-foot">
        {confirm ? <button type="button" className="lxa-text-button is-danger" onClick={onRemove} data-action="remove-exhibition">Take it down</button>
          : <button type="button" className="lxa-text-button" onClick={() => setConfirm(true)}>Remove</button>}
        <button type="submit" className="lxa-btn is-solid" disabled={!title.trim()} data-action="save-exhibition">Save</button>
      </footer>
    </form>
  </Sheet>;
}

// --- rows -----------------------------------------------------------------------------------------

interface Actions {
  /** Open a piece's own page. */
  openPiece: (piece: Piece) => void;
  /** Play a video in Watch or a reel in Reels, when the piece is one. */
  playOf: (piece: Piece) => (() => void) | null;
  openExhibition: (id: string) => void;
  openCatalogue: (kind: CatalogueKind) => void;
  status: (nodeId: string) => PlaceState;
  props: LibraryAProps;
}

/** A thumbnail; a video's or a reel's plays it where it plays, while the rest of the row opens its page. */
function ThumbSlot({ piece, actions }: { piece: Piece; actions: Actions }) {
  const play = actions.playOf(piece);
  return <span className="lxa-thumb-slot">
    <Thumb piece={piece} playIcon={false} />
    {play && <button type="button" className="lxa-thumb-play" onClick={play} aria-label={`${piece.kind === 'reel' ? 'Play' : 'Watch'} ${piece.title}`} data-action="play-piece" data-key={piece.key}><i className="lxa-play"><Icon name="play" /></i></button>}
  </span>;
}

function PieceRow({ piece, actions, place = true, kept = true }: { piece: Piece; actions: Actions; place?: boolean; kept?: boolean }) {
  const quote = kept ? piece.kept.find(note => note.kind === 'quote') ?? piece.kept[0] : undefined;
  return <div className={`lxa-row is-${piece.kind}`} style={hue(piece.nodeIds[0])} data-key={piece.key}>
    <ThumbSlot piece={piece} actions={actions} />
    <button type="button" className="lxa-row-text" onClick={() => actions.openPiece(piece)} data-action="open-piece" data-key={piece.key}>
      <strong>{piece.title}</strong>
      <small>{piece.byline}</small>
      {quote && <q>{quote.text.length > 120 ? `${quote.text.slice(0, 118)}…` : quote.text}</q>}
      <span className="lxa-row-meta"><PathDots piece={piece} /><small>{pathWord(piece)}</small>{place && piece.nodeIds[0] && <small className="lxa-row-place"><MapMark nodeId={piece.nodeIds[0]} state={actions.status(piece.nodeIds[0])} size={16} />{nameOf(piece.nodeIds[0])}</small>}</span>
    </button>
  </div>;
}

function NoteCard({ piece, actions }: { piece: Piece; actions: Actions }) {
  const entry = piece.item.kind === 'idea' || piece.item.kind === 'question' ? piece.item.entry : null;
  return <button type="button" className={`lxa-note is-${piece.kind}`} style={hue(piece.nodeIds[0])} onClick={() => actions.openPiece(piece)} data-action="open-note" data-key={piece.key}>
    <span className="lxa-note-text"><b>{piece.title}</b>{entry?.body && <small>{entry.body.replace(/\s+/g, ' ').slice(0, 140)}</small>}<small className="lxa-note-meta">{piece.kind === 'question' ? 'A question' : 'An idea'} · {short(piece.at)}</small></span>
  </button>;
}

function ReelCard({ piece, actions }: { piece: Piece; actions: Actions }) {
  return <div className="lxa-reel" style={hue(piece.nodeIds[0])} data-key={piece.key}>
    <ThumbSlot piece={piece} actions={actions} />
    <button type="button" className="lxa-reel-text" onClick={() => actions.openPiece(piece)} data-action="open-reel" data-key={piece.key}>
      <strong>{piece.title}</strong>
    </button>
    <span className="lxa-row-meta"><PathDots piece={piece} /><small>{pathWord(piece)}</small></span>
  </div>;
}

// --- proof ------------------------------------------------------------------------------------

function proofState(stop: ProofStop): string {
  if (stop.ready) return `Proved ${short(stop.litAt)} · Ready to refresh`;
  if (stop.lastingAt) return `Proved ${short(stop.litAt)} · Lasting since ${short(stop.lastingAt)}`;
  if (stop.litAt) return `Proved ${short(stop.litAt)}`;
  if (stop.state === 'underway') return 'Underway, not proved yet';
  return 'Not proved yet';
}

function ProveIt({ stops, checks, packAt, actions }: { stops: readonly ProofStop[]; checks: CheckLedger; packAt: (nodeId: string) => PackInfo | undefined; actions: Actions }) {
  const content = loadedContent();
  if (!stops.length) return null;
  return <section className="lxa-prove" aria-label="Prove it" data-prove="">
    <h2 className="lxa-h2">Prove it</h2>
    {stops.map(stop => {
      const c = content?.nextCase(stop.nodeId, checks);
      // A place with a case or a check proves itself there; one with only a lesson, in the lesson; one
      // with neither, in your own words.
      const checked = !!c || !!content?.bankFor(stop.nodeId);
      const pack = packAt(stop.nodeId);
      const lit = isLit(stop.state);
      const lesson = stop.packId ? () => actions.props.onLesson(stop.packId!, stop.nodeId) : null;
      const prove = checked ? () => actions.props.onProve(stop.nodeId) : lesson ?? (() => actions.props.onCreate('idea', stop.nodeId));
      const minutes = pack?.minutes ? ` · ${pack.minutes} min` : '';
      const label = checked ? stop.ready ? 'Refresh with a new case' : lit ? 'Another case' : c ? 'Try the case' : 'Prove it' : lesson ? `Lesson${minutes}` : 'Prove it in words';
      return <article key={stop.nodeId} className={`lxa-prove-stop${stop.ready ? ' is-ready' : lit ? ' is-proved' : ''}`} style={hue(stop.nodeId)} data-node-id={stop.nodeId}>
        <button type="button" className="lxa-prove-mark" onClick={() => actions.props.onNavigate(stop.nodeId)} aria-label={`Show ${nameOf(stop.nodeId)} on the Atlas`} data-action="prove-place">
          <MapMark nodeId={stop.nodeId} state={stop.state} size={56} ring={stop.ready} />
        </button>
        <div className="lxa-prove-text">
          <h3>{nameOf(stop.nodeId)}</h3>
          <p className="lxa-prove-state">{proofState(stop)}</p>
          {c ? <p className="lxa-prove-case"><em>{c.title}</em>{c.setting ? ` · ${c.setting}` : ''}</p> : <p className="lxa-prove-case">{(catalog.get(stop.nodeId) as { description?: string } | undefined)?.description}</p>}
          <div className="lxa-prove-actions">
            <button type="button" className="lxa-btn is-solid" onClick={prove} data-action={checked ? 'prove' : lesson ? 'lesson' : 'prove-words'} data-node-id={stop.nodeId} data-pack-id={checked ? undefined : stop.packId ?? undefined}>{label}</button>
            {checked && !lit && lesson && <button type="button" className="lxa-btn" onClick={lesson} data-action="lesson" data-pack-id={stop.packId!}>Lesson{minutes}</button>}
          </div>
        </div>
      </article>;
    })}
  </section>;
}

// --- pages ------------------------------------------------------------------------------------

function ExhibitionCard({ ex, actions, variant = 'card' }: { ex: Exhibition; actions: Actions; variant?: 'card' | 'lead' }) {
  const proof = proofLine(ex);
  return <button type="button" className={`lxa-card is-${variant}`} onClick={() => actions.openExhibition(ex.id)} data-action="open-exhibition" data-exhibition={ex.id} style={hue(ex.places[0])}>
    <Collage plates={ex.images} variant={variant === 'lead' ? 'lead' : 'card'} max={variant === 'lead' ? 4 : 3} nodeId={ex.places[0]} />
    <span className="lxa-card-text">
      <strong className="lxa-card-title">{ex.title}</strong>
      {variant === 'lead' && ex.intro && <span className="lxa-card-intro">{ex.intro}</span>}
      <span className="lxa-card-meta"><Marks places={ex.places} status={actions.status} size={variant === 'lead' ? 26 : 20} /><small>{ex.pieces.length} {ex.pieces.length === 1 ? 'piece' : 'pieces'}{ex.source === 'around' ? ` · ${ex.places.map(nameOf).join(', ')}` : ''}</small></span>
      {proof && <small className="lxa-card-proof" style={hue(proof.nodeId)}>{proof.text}</small>}
    </span>
  </button>;
}

function MapStrip({ stops, onNavigate, status }: { stops: readonly ProofStop[]; onNavigate: (id: string) => void; status: (id: string) => PlaceState }) {
  if (!stops.length) return null;
  return <nav className="lxa-map" aria-label="Your map">
    <button type="button" className="lxa-map-head" onClick={() => onNavigate(catalog.root.id)} data-action="map-atlas"><span>Your map</span><Icon name="arrow" /></button>
    <div className="lxa-map-row">{stops.map(stop => <button key={stop.nodeId} type="button" className={`lxa-map-stop${stop.ready ? ' is-ready' : ''}`} style={hue(stop.nodeId)} onClick={() => onNavigate(stop.nodeId)} data-action="map-place" data-node-id={stop.nodeId}>
      <MapMark nodeId={stop.nodeId} state={status(stop.nodeId)} size={38} ring={stop.ready} />
      <span><b>{nameOf(stop.nodeId)}</b><small>{stop.ready ? 'Ready to refresh' : stop.state === 'lasting' ? 'Lasting' : isLit(stop.state) ? `Proved ${short(stop.litAt)}` : 'Underway'}</small></span>
    </button>)}</div>
  </nav>;
}

const WINGS = catalog.getChildren(catalog.root).map(node => node.id);

function Empty({ onQuestion, onNavigate }: { onQuestion: (title: string) => void; onNavigate: (id: string) => void }) {
  const [title, setTitle] = useState('');
  return <div className="lxa-empty" data-empty="">
    <form className="lxa-empty-ask" onSubmit={event => { event.preventDefault(); if (title.trim()) onQuestion(title.trim()); }}>
      <textarea rows={2} value={title} maxLength={160} onChange={event => setTitle(event.target.value.replace(/\n/g, ' '))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (title.trim()) onQuestion(title.trim()); } }}
        placeholder="What do you want to understand?" aria-label="What do you want to understand?" data-action="empty-question" />
      {title.trim() && <button type="submit" className="lxa-btn is-solid" data-action="empty-begin">Begin it</button>}
    </form>
    <ul className="lxa-wings">{WINGS.map(id => <li key={id}>
      <button type="button" className="lxa-wing" style={{ ...hue(id), color: territoryColor(id) }} onClick={() => onNavigate(id)} data-action="wing" data-node-id={id}>
        <svg className="lxa-wing-motif" width="52" height="52" viewBox="-26 -26 52 52" aria-hidden="true"><Motif kind={(catalog.get(id) as { motif?: number } | undefined)?.motif} size={52} /></svg>
        <span>{nameOf(id)}</span>
      </button>
    </li>)}</ul>
  </div>;
}

function IndexPage({ gallery, actions, query, setQuery, onNew, onBeginNow, onAdd, onBackup, onRestore, busy }: {
  gallery: Gallery; actions: Actions; query: string; setQuery: (q: string) => void; onNew: (title?: string) => void; onBeginNow: (title: string) => void; onAdd: () => void;
  onBackup: () => void; onRestore: () => void; busy: boolean;
}) {
  const searchId = useId();
  const found = useMemo(() => searchGallery(gallery, query), [gallery, query]);
  const empty = !gallery.pieces.length && !gallery.mine.length;
  const counts = CATALOGUE.slice(1).map(([kind, label, kinds]) => [kind, label, gallery.pieces.filter(p => kinds.includes(p.kind)).length] as const).filter(([, , n]) => n > 0);
  const mine = gallery.mine.filter(ex => ex.id !== gallery.lead?.id);
  const suggested = gallery.suggested.filter(ex => ex.id !== gallery.lead?.id);
  return <div className="lxa-index" data-page="index">
    <header className="lxa-head">
      <h1>Library</h1>
      <div className="lxa-head-tools">
        {!empty && <label className="lxa-search" htmlFor={searchId}>
          <Icon name="search" />
          <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search everything" aria-label="Search your library" enterKeyHint="search" autoComplete="off" data-action="lxa-search" />
          {query && <button type="button" className="lxa-icon" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" /></button>}
        </label>}
        <button type="button" className="lxa-icon is-ring" onClick={onAdd} aria-label="Add to your library" data-action="lxa-add"><Icon name="plus" /></button>
      </div>
    </header>

    {empty ? <Empty onQuestion={onBeginNow} onNavigate={actions.props.onNavigate} /> : query.trim() ? <div className="lxa-results" aria-live="polite" data-results="">
      {query.trim().length > 2 && !found.exhibitions.some(ex => ex.title.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) && <button type="button" className="lxa-begin" onClick={() => onNew(query.trim())} data-action="search-begin">
        <span className="lxa-begin-mark"><Icon name="plus" /></span><span><small>Begin an exhibition</small><b>{query.trim()}</b></span>
      </button>}
      {found.exhibitions.length > 0 && <section><h2 className="lxa-h2">Exhibitions</h2><div className="lxa-grid">{found.exhibitions.map(ex => <ExhibitionCard key={ex.id} ex={ex} actions={actions} />)}</div></section>}
      {found.pieces.length > 0 && <section><h2 className="lxa-h2">In your library</h2><div className="lxa-rows">{found.pieces.slice(0, 40).map(piece => piece.kind === 'idea' || piece.kind === 'question' ? <NoteCard key={piece.key} piece={piece} actions={actions} /> : <PieceRow key={piece.key} piece={piece} actions={actions} />)}</div></section>}
      {found.places.length > 0 && <section><h2 className="lxa-h2">On the Atlas</h2><div className="lxa-places">{found.places.map(id => <button key={id} type="button" className="lxa-place" style={hue(id)} onClick={() => actions.props.onNavigate(id)} data-action="search-place" data-node-id={id}>
        <MapMark nodeId={id} state={actions.status(id)} size={34} /><span><b>{nameOf(id)}</b><small>{catalog.get(id)?.parentId ? nameOf(catalog.get(id)!.parentId!) : ''}</small></span><Icon name="arrow" />
      </button>)}</div></section>}
      {!found.exhibitions.length && !found.pieces.length && !found.places.length && <p className="lxa-none">Nothing matches “{query.trim()}”.</p>}
    </div> : <>
      <MapStrip stops={gallery.map} onNavigate={actions.props.onNavigate} status={actions.status} />
      {gallery.lead && <section className="lxa-lead" aria-label="Lead exhibition"><ExhibitionCard ex={gallery.lead} actions={actions} variant="lead" /></section>}

      {gallery.lately.length > 0 && <section className="lxa-lately" aria-labelledby={`${searchId}-lately`}>
        <h2 className="lxa-h2" id={`${searchId}-lately`}>Lately</h2>
        <ul>{gallery.lately.map(piece => <li key={piece.key}><button type="button" className={`lxa-lately-item is-${piece.kind}`} style={hue(piece.nodeIds[0])} onClick={() => actions.openPiece(piece)} data-action="open-lately" data-key={piece.key}>
          <Thumb piece={piece} /><span>{piece.title}</span><small>{KIND_WORD[piece.kind]}</small>
        </button></li>)}</ul>
      </section>}

      <section className="lxa-shelf" aria-labelledby={`${searchId}-mine`}>
        <header className="lxa-section-head"><h2 className="lxa-h2" id={`${searchId}-mine`}>Yours</h2></header>
        {mine.length > 0 && <div className="lxa-grid">
          {mine.map(ex => <ExhibitionCard key={ex.id} ex={ex} actions={actions} />)}
          <button type="button" className="lxa-card is-new" onClick={() => onNew()} data-action="new-exhibition-tile">
            <span className="lxa-collage is-card is-blank"><Icon name="plus" /></span>
            <span className="lxa-card-text"><strong className="lxa-card-title">A question of your own</strong></span>
          </button>
        </div>}
        <button type="button" className={`lxa-begin is-quiet${mine.length ? ' has-tile' : ''}`} onClick={() => onNew()} data-action="new-exhibition">
          <span className="lxa-begin-mark"><Icon name="plus" /></span><span><b>A question of your own</b></span>
        </button>
      </section>

      {suggested.length > 0 && <section className="lxa-shelf" aria-labelledby={`${searchId}-suggested`}>
        <header className="lxa-section-head"><h2 className="lxa-h2" id={`${searchId}-suggested`}>Suggested</h2></header>
        <div className="lxa-grid">{suggested.map(ex => <ExhibitionCard key={ex.id} ex={ex} actions={actions} />)}</div>
      </section>}

      {counts.length > 0 && <section className="lxa-catalogue-index" aria-labelledby={`${searchId}-catalogue`}>
        <header className="lxa-section-head"><h2 className="lxa-h2" id={`${searchId}-catalogue`}>Catalogue</h2></header>
        <ul>{counts.map(([kind, label, count]) => <li key={kind}><button type="button" onClick={() => actions.openCatalogue(kind)} data-action="open-catalogue" data-kind={kind}>
          <span>{label}</span><small>{count}</small><Icon name="chevron" />
        </button></li>)}</ul>
      </section>}
    </>}

    <footer className="lxa-foot">
      <button type="button" onClick={onBackup} data-action="lxa-backup">Back up</button>
      <button type="button" onClick={onRestore} disabled={busy} data-action="lxa-restore">{busy ? 'Restoring…' : 'Restore'}</button>
    </footer>
  </div>;
}

function BackBar({ label, onBack, children }: { label: string; onBack: () => void; children?: ReactNode }) {
  return <div className="lxa-bar">
    <button type="button" className="lxa-back" onClick={onBack} data-action="lxa-back"><Icon name="back" /><span>{label}</span></button>
    {children && <div className="lxa-bar-tools">{children}</div>}
  </div>;
}

function ExhibitionPage({ ex, actions, checks, packAt, onBack, onHang, onEdit, onKeep }: {
  ex: Exhibition; actions: Actions; checks: CheckLedger; packAt: (nodeId: string) => PackInfo | undefined;
  onBack: () => void; onHang: () => void; onEdit: () => void; onKeep: () => void;
}) {
  // The date is said once: in its line when the line says it, else beside its count.
  const since = ex.since && !ex.introDated ? `Since ${longDay(ex.since)}` : '';
  // The places it gathers around are its links below, so its line keeps only when it began.
  const intro = ex.introDated && ex.links.length && ex.since ? `Gathered since ${longDay(ex.since)}.` : ex.intro;
  const passages = ex.pieces.flatMap(p => p.kept.filter(k => k.kind === 'quote').map(k => ({ piece: p, note: k })));
  return <article className="lxa-ex" style={hue(ex.places[0])} data-page="exhibition" data-exhibition={ex.id}>
    <BackBar label="Library" onBack={onBack}>
      {ex.source === 'mine'
        ? <><button type="button" className="lxa-btn" onClick={onHang} data-action="hang"><Icon name="plus" />Add</button><button type="button" className="lxa-btn" onClick={onEdit} data-action="edit-exhibition">Edit</button></>
        : <button type="button" className="lxa-btn" onClick={onKeep} data-action="keep-exhibition">Keep as yours</button>}
    </BackBar>
    <Collage plates={ex.hero} variant="hero" nodeId={ex.places[0]} />
    <div className="lxa-ex-body">
      <header className="lxa-ex-head">
        <h1>{ex.title}</h1>
        {intro && <p className="lxa-intro">{intro}</p>}
        {ex.links.length > 0 && <div className="lxa-ex-places">{ex.links.map(id => <button key={id} type="button" className="lxa-place-link" style={hue(id)} onClick={() => actions.props.onNavigate(id)} data-action="exhibition-place" data-node-id={id}>
          <MapMark nodeId={id} state={actions.status(id)} size={30} /><span>{nameOf(id)}</span>
        </button>)}</div>}
        <p className="lxa-ex-meta">{[ex.pieces.length ? `${ex.pieces.length} ${ex.pieces.length === 1 ? 'piece' : 'pieces'}` : '', since].filter(Boolean).join(' · ')}</p>
      </header>
      <div className="lxa-ex-seq">
        {ex.sections.map(section => <section key={section.id} className={`lxa-sec is-${section.id}`} data-section={section.id}>
          <h2 className="lxa-h2">{section.title}</h2>
          {section.id === 'reel'
            ? <div className="lxa-reels">{section.pieces.map(piece => <ReelCard key={piece.key} piece={piece} actions={actions} />)}</div>
            : section.id === 'note'
              ? <div className="lxa-notes">{section.pieces.map(piece => <NoteCard key={piece.key} piece={piece} actions={actions} />)}</div>
              : <div className="lxa-rows">{section.pieces.map(piece => <PieceRow key={piece.key} piece={piece} actions={actions} kept={!piece.kept.some(k => k.kind === 'quote')} place={ex.places.length !== 1 || !piece.nodeIds.every(id => id === ex.places[0])} />)}</div>}
        </section>)}
        {passages.length > 0 && <section className="lxa-sec is-kept" data-section="passages">
          <h2 className="lxa-h2">Passages</h2>
          <div className="lxa-quotes">{passages.map(({ piece: p, note: k }) => <blockquote key={k.id} style={hue(p.nodeIds[0])}>
            <p>{k.text}</p><footer><button type="button" onClick={() => actions.openPiece(p)}>{p.title}</button>{k.where ? `, ${k.where}` : ''}</footer>
          </blockquote>)}</div>
        </section>}
        {ex.lessons.length > 0 && <section className="lxa-sec is-lessons" data-section="lessons">
          <h2 className="lxa-h2">Lessons</h2>
          <div className="lxa-rows">{ex.lessons.map(lesson => <button key={lesson.packId} type="button" className="lxa-row is-lesson" style={hue(lesson.nodeId)} onClick={() => actions.props.onLesson(lesson.packId, lesson.nodeId)} data-action="open-lesson" data-pack-id={lesson.packId}>
            <span className="lxa-thumb is-wide">{lesson.image ? <Img src={lesson.image} /> : <MapMark nodeId={lesson.nodeId} state={lesson.state} size={64} />}</span>
            <span className="lxa-row-text"><strong>{lesson.title}</strong><small>{nameOf(lesson.nodeId)}{lesson.minutes ? ` · ${lesson.minutes} min` : ''}</small><span className="lxa-row-meta"><small>{isLit(lesson.state) ? 'Understood' : lesson.state === 'underway' ? 'Begun' : 'Not begun'}</small></span></span>
          </button>)}</div>
        </section>}
        {ex.source === 'mine' && !ex.pieces.length && <p className="lxa-none">Nothing hangs here yet. <button type="button" className="lxa-text-button" onClick={onHang}>Add something</button></p>}
        <ProveIt stops={ex.proof} checks={checks} packAt={packAt} actions={actions} />
      </div>
    </div>
  </article>;
}

function ItemPage({ piece, gallery, actions, onBack, backLabel, onDetails, onHangIn }: {
  piece: Piece; gallery: Gallery; actions: Actions; onBack: () => void; backLabel: string;
  onDetails: () => void; onHangIn: () => void;
}) {
  const { props } = actions;
  const hanging = hangingIn(gallery, piece.key);
  const suggestedIn = gallery.suggested.filter(ex => ex.pieces.some(p => p.key === piece.key));
  const work = piece.item.kind === 'work' ? piece.item.work : null;
  const link = piece.item.kind === 'link' ? piece.item.link : null;
  const reel = piece.item.kind === 'reel' ? piece.item.reel : null;
  const note = piece.item.kind === 'idea' || piece.item.kind === 'question' ? piece.item.entry : null;
  const proveAt = piece.provedIn ?? piece.nodeIds.find(id => loadedContent()?.hasCases(id)) ?? null;
  const format = work ? work.format : KIND_WORD[piece.kind];
  const play = actions.playOf(piece);
  return <article className={`lxa-item is-${piece.kind}`} style={hue(piece.nodeIds[0])} data-page="item" data-key={piece.key}>
    <BackBar label={backLabel} onBack={onBack} />
    <div className={`lxa-item-top${note ? ' is-text' : ''}`}>
      {!note && <figure className={`lxa-item-plate is-${piece.kind}`}>
        {piece.image ? <Img src={piece.image} large fit={piece.kind === 'link'} fallback={<TypeCover title={piece.title} creator={piece.byline} tone={piece.key} />} /> : <TypeCover title={piece.title} creator={piece.byline} tone={piece.key} />}
        {play && <button type="button" className="lxa-item-play" onClick={play} aria-label={`${reel ? 'Play' : 'Watch'} ${piece.title}`} data-action="item-play"><Icon name="play" /></button>}
      </figure>}
      <div className="lxa-item-text">
        <p className="lxa-item-format">{format}{work?.year ? ` · ${work.year}` : ''}{note ? ` · ${longDay(note.createdAt)}` : ''}</p>
        <h1>{piece.title}</h1>
        {note ? note.body && <p className="lxa-item-body">{note.body}</p> : <p className="lxa-item-by">{work ? work.creator : piece.byline}</p>}
        {/* The path is a record, read only: a status changes in Notes and details. */}
        {piece.path.length > 0 && <ol className="lxa-track" style={hue(piece.provedIn ?? piece.nodeIds[0])} aria-label="Its path">
          {piece.path.map(mark => {
            const tryCase = mark.step === 'proved' && !mark.done && proveAt ? () => props.onProve(proveAt) : undefined;
            const content = <><i aria-hidden="true" /><b>{STEP_WORD[mark.step]}</b><small>{mark.done ? mark.at ? short(mark.at) : <Icon name="check" /> : tryCase ? 'Try a case' : '—'}</small></>;
            return <li key={mark.step} className={`${mark.done ? 'is-done' : ''} is-${mark.step}`}>
              {tryCase ? <button type="button" onClick={tryCase} data-action="item-prove" data-node-id={proveAt!}>{content}</button> : <span>{content}</span>}
            </li>;
          })}
        </ol>}
        <div className="lxa-item-actions">
          {piece.videoId && play && <button type="button" className="lxa-btn is-solid" onClick={play} data-action="item-watch"><Icon name="play" />Watch</button>}
          {reel && play && <button type="button" className="lxa-btn is-solid" onClick={play} data-action="item-reel"><Icon name="play" />Play</button>}
          {link && !piece.videoId && <a className="lxa-btn is-solid" href={link.url} target="_blank" rel="noopener noreferrer" data-action="item-open-link">Open {link.preview?.siteName || piece.byline}<Icon name="external" /></a>}
          {(work || link) && <button type="button" className="lxa-btn" onClick={onDetails} data-action="item-details">Notes and details</button>}
          {note && <button type="button" className="lxa-btn" onClick={() => props.onEdit(note)} data-action="item-edit-note">Edit</button>}
        </div>
      </div>
    </div>

    <div className="lxa-item-cols">
      <section className="lxa-item-sec" aria-label="On your map">
        <h2 className="lxa-h2">On your map</h2>
        {piece.nodeIds.length ? piece.nodeIds.map(id => <button key={id} type="button" className="lxa-place" style={hue(id)} onClick={() => props.onNavigate(id)} data-action="item-place" data-node-id={id}>
          <MapMark nodeId={id} state={actions.status(id)} size={40} /><span><b>{nameOf(id)}</b><small>{isLit(actions.status(id)) ? piece.provedIn === id ? 'Proved' : 'Proved here' : actions.status(id) === 'underway' ? 'Underway' : catalog.get(id)?.parentId ? nameOf(catalog.get(id)!.parentId!) : ''}</small></span><Icon name="arrow" />
        </button>) : <p className="lxa-none">Not placed.</p>}
      </section>

      <section className="lxa-item-sec" aria-label="Hanging in">
        <h2 className="lxa-h2">Hanging in</h2>
        {[...hanging, ...suggestedIn].map(ex => <button key={ex.id} type="button" className="lxa-hung" onClick={() => actions.openExhibition(ex.id)} data-action="item-exhibition" data-exhibition={ex.id}>
          <Collage plates={ex.images} variant="card" max={1} nodeId={ex.places[0]} /><span><b>{ex.title}</b><small>{ex.source === 'mine' ? `${ex.pieces.length} pieces` : 'Suggested'}</small></span>
        </button>)}
        <button type="button" className="lxa-text-button" onClick={onHangIn} data-action="item-hang-in"><Icon name="plus" />Hang it in an exhibition</button>
      </section>
    </div>

    {piece.kept.length > 0 && <section className="lxa-item-sec" aria-label="Passages and thoughts">
      <h2 className="lxa-h2">Passages and thoughts</h2>
      <div className="lxa-quotes">{piece.kept.map(k => k.kind === 'quote'
        ? <blockquote key={k.id}><p>{k.text}</p>{k.where && <footer>{k.where}</footer>}</blockquote>
        : <p key={k.id} className="lxa-thought">{k.text}</p>)}</div>
    </section>}
  </article>;
}

function CataloguePage({ gallery, filter, setFilter, actions, onBack }: { gallery: Gallery; filter: CatalogueKind; setFilter: (f: CatalogueKind) => void; actions: Actions; onBack: () => void }) {
  const kinds = CATALOGUE.find(([k]) => k === filter)![2];
  const list = gallery.pieces.filter(p => kinds.includes(p.kind)).sort((a, b) => b.at.localeCompare(a.at));
  return <div className="lxa-catalogue" data-page="catalogue" data-filter={filter}>
    <BackBar label="Library" onBack={onBack} />
    <header className="lxa-cat-head">
      <h1>Catalogue</h1>
      <nav className="lxa-tabs" aria-label="Show">{CATALOGUE.map(([kind, label, k]) => {
        const count = gallery.pieces.filter(p => k.includes(p.kind)).length;
        return count || kind === 'all' ? <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)} data-action="catalogue-tab" data-kind={kind}>{label}<small>{count}</small></button> : null;
      })}</nav>
    </header>
    <div className="lxa-table" role="list">
      {list.map(piece => <div key={piece.key} role="listitem">{piece.kind === 'idea' || piece.kind === 'question'
        ? <NoteCard piece={piece} actions={actions} />
        : <PieceRow piece={piece} actions={actions} />}</div>)}
    </div>
  </div>;
}

// --- the Library ----------------------------------------------------------------------------------

/** Where the learner was, kept for the visit: a video played or a place flown to from an exhibition
 * comes back to that exhibition, at the same scroll. */
const visit: { stack: Page[]; scroll: number; catalogue: CatalogueKind } = { stack: [{ kind: 'index' }], scroll: 0, catalogue: 'all' };

export function LibraryA(props: LibraryAProps) {
  const { exp, checks, now, entries, shelf, library, content } = props;
  const rootRef = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Your exhibitions: their own versioned record, merged with what is on disk before every save.
  const loaded = useMemo(() => loadExhibitions(), []);
  const [store, setStore] = useState<ExhibitionStore>(loaded.data);
  const storeRef = useRef(store);
  storeRef.current = store;
  const blocked = useRef(loaded.blocked);
  const [toast, setToast] = useState(loaded.warning ?? '');
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);
  const changeStore = useCallback((edit: (current: ExhibitionStore) => ExhibitionStore, message?: string): boolean => {
    let next: ExhibitionStore;
    try {
      const disk = blocked.current ? null : readExhibitions();
      next = edit(disk ? mergeExhibitions(storeRef.current, disk) : storeRef.current);
    } catch (error) { setToast(error instanceof Error ? error.message : 'That could not be kept.'); return false; }
    storeRef.current = next;
    setStore(next);
    const error = blocked.current ? 'Saving your exhibitions is blocked because the saved record could not be read. Back up before closing.' : saveExhibitions(next);
    setToast(error ?? message ?? '');
    return true;
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if ((event.key !== EXHIBITIONS_KEY && event.key !== null) || blocked.current) return;
      const disk = readExhibitions();
      if (!disk) return;
      const merged = mergeExhibitions(storeRef.current, disk);
      storeRef.current = merged;
      setStore(merged);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // The model: every record, as exhibitions.
  const [stack, setStack] = useState<Page[]>(visit.stack);
  useEffect(() => { visit.stack = stack; }, [stack]);
  useEffect(() => {
    const scroller = rootRef.current?.closest<HTMLElement>('.notebook-workspace');
    if (!scroller) return;
    const top = visit.scroll;
    requestAnimationFrame(() => scroller.scrollTo({ top }));
    const keep = () => { visit.scroll = scroller.scrollTop; };
    scroller.addEventListener('scroll', keep, { passive: true });
    return () => scroller.removeEventListener('scroll', keep);
  }, []);
  const page = stack[stack.length - 1];
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now }), [exp, checks, entries, shelf, library, content, now]);
  // What Watch remembers (watched through, seen), read again whenever the clock or the page moves.
  const feed = useMemo(() => loadFeedMemory(), [now, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const poolIds = usePoolIds(true);
  const packAt = useCallback((nodeId: string): PackInfo | undefined => {
    const expedition = content ? loadedContent()?.expeditionAt(nodeId) : undefined;
    if (!expedition) return undefined;
    const cover = expedition.pack.beats.find(beat => beat.kind === 'cover');
    const media = cover && cover.kind === 'cover' ? expedition.pack.media[cover.media] : undefined;
    return { packId: expedition.pack.id, title: expedition.pack.title, question: expedition.pack.question, minutes: expedition.pack.minutes, image: media?.src ? commonsAtWidth(media.src, 500) : null };
  }, [content]);
  // When each place was proved (every Understood lesson and passed check, oldest first), and where a lesson
  // or a check was begun at all.
  const proofs = useMemo(() => {
    const times = new Map<string, string[]>();
    const tried = new Set<string>();
    const add = (nodeId: string, at: string) => times.set(nodeId, [...(times.get(nodeId) ?? []), at]);
    for (const run of exp.runs) { const nodeId = packPlace(run.packId)?.nodeId; if (!nodeId) continue; tried.add(nodeId); if (run.level === 'Understood') add(nodeId, run.at); }
    for (const session of content?.checkSessions(checks) ?? []) { tried.add(session.node); if (session.verdict.passed) add(session.node, session.at); }
    for (const list of times.values()) list.sort();
    return { times, tried };
  }, [exp, checks, content]);
  const gallery = useMemo(() => buildGallery({
    journal, library, exhibitions: store, watchedVideos: feed.watched, seenVideos: feed.seen, watchedReels: shelf.watched,
    isWatchVideo: poolIds ? id => poolIds.has(id) : undefined, packAt, provedTimes: nodeId => proofs.times.get(nodeId) ?? [], tried: proofs.tried,
  }), [journal, library, store, feed, shelf.watched, poolIds, packAt, proofs]);
  const status = useCallback((nodeId: string) => territoryState(journal.status, nodeId), [journal]);

  // Pages: a stack, so Back returns to where you were, and coming back from a case or a lesson lands on the same page.
  const scrollTop = () => requestAnimationFrame(() => rootRef.current?.closest('.notebook-workspace')?.scrollTo({ top: 0 }));
  const push = (next: Page) => { setStack(list => [...list, next]); scrollTop(); };
  const back = () => { setStack(list => list.length > 1 ? list.slice(0, -1) : list); scrollTop(); };
  const replace = (next: Page) => setStack(list => [...list.slice(0, -1), next]);
  const [query, setQuery] = useState('');
  const [catalogueFilter, setCatalogueFilterState] = useState<CatalogueKind>(visit.catalogue);
  const setCatalogueFilter = (kind: CatalogueKind) => { visit.catalogue = kind; setCatalogueFilterState(kind); };

  // Sheets.
  const [newSheet, setNewSheet] = useState<{ title: string; hangKey?: string } | null>(null);
  const [hangSheet, setHangSheet] = useState<string | null>(null);
  const [editSheet, setEditSheet] = useState<string | null>(null);
  const [hangIn, setHangIn] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ nodeId: string | null; exhibition?: string } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const all = [...gallery.mine, ...gallery.suggested];
  const exhibitionById = (id: string) => all.find(ex => ex.id === id);
  const storedId = (id: string) => id.startsWith('mine:') ? id.slice(5) : null;

  const actions: Actions = {
    props, status,
    openExhibition: id => push({ kind: 'exhibition', id }),
    openCatalogue: kind => { setCatalogueFilter(kind); push({ kind: 'catalogue', filter: kind }); },
    // Every piece opens its own page; a video's or a reel's thumbnail plays it in Explore.
    openPiece: piece => push({ kind: 'item', key: piece.key }),
    playOf: piece => {
      if (piece.videoId) { const id = piece.videoId; return () => props.onOpenVideo(id); }
      if (piece.item.kind === 'reel') { const id = piece.item.reel.id; return () => props.onOpenReel(id); }
      return null;
    },
  };

  const begin = (input: { title: string; places: string[]; items: string[] }, hangKey?: string) => {
    let made = '';
    const ok = changeStore(current => { const result = createExhibition(current, { ...input, items: [...new Set([...(hangKey ? [hangKey] : []), ...input.items])] }); made = result.id; return result.store; }, `Begun: ${input.title}`);
    if (!ok) return;
    setNewSheet(null);
    setHangIn(null);
    setQuery('');
    push({ kind: 'exhibition', id: `mine:${made}` });
  };
  // From the empty Library: begun at once, about the places its words suggest (editable on its page).
  const beginNow = (title: string) => {
    const near = related(gallery, title, 8);
    begin({ title, places: placesFor(title, near).slice(0, 2), items: near.map(p => p.key) });
  };
  const keep = (ex: Exhibition) => {
    let made = '';
    const ok = changeStore(current => { const result = createExhibition(current, { title: ex.title, intro: ex.source === 'around' ? ex.intro : '', places: [...ex.places], from: ex.id }); made = result.id; return result.store; }, 'Kept as yours');
    if (ok) replace({ kind: 'exhibition', id: `mine:${made}` });
  };
  const toggleHang = (exId: string, key: string, on: boolean) => {
    const id = storedId(exId);
    if (!id) return;
    changeStore(current => on ? hang(current, id, key) : takeDown(current, id, key));
  };

  // Adding through the Library's own + sheet: a found book or film becomes an entry, then hangs where it was added.
  const addFound = (found: FoundItem, itemStatus: ItemStatus): { key: string } | { error: string } => {
    const at = new Date().toISOString();
    const entry = found.source === 'ol' ? entryFromBook(found, itemStatus, at) : entryFromScreen(found, itemStatus, at);
    const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
    const problem = props.onLibraryChange(current => entryAt(current, key) ? setStatus(current, key, itemStatus, at) : upsertEntry(current, entry, at));
    if (problem) return { error: problem };
    const into = adding?.exhibition && storedId(adding.exhibition);
    if (into) changeStore(current => hang(current, into, key), 'Hung in the exhibition');
    return { key };
  };
  const saveLink = (draft: LinkDraft) => {
    const before = new Set(liveLinks(props.getLibrary()).map(l => l.id));
    const problem = props.onSaveLink(draft);
    const into = adding?.exhibition && storedId(adding.exhibition);
    if (!problem && into && !draft.id) {
      const made = liveLinks(props.getLibrary()).find(l => !before.has(l.id));
      if (made) changeStore(current => hang(current, into, `link:${made.id}`), 'Hung in the exhibition');
    }
    return problem;
  };

  // Detail sheet for a work or a link: the Library's own item sheet, with status, passages, places.
  const pieceByKey = (key: string) => gallery.byKey.get(key);
  const sheetItem: SheetItem | null = useMemo(() => {
    if (detail) {
      const piece = gallery.byKey.get(detail);
      if (piece?.item.kind === 'work') return { kind: 'work', work: piece.item.work };
      if (piece?.item.kind === 'link') return { kind: 'link', link: piece.item.link };
    }
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
  }, [detail, preview, gallery]);

  function backup() {
    try {
      const file = withExhibitions(withLibrary(JSON.parse(exportNotebook({ version: 1, entries: [...entries] })), props.getLibrary()), storeRef.current);
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-knowledge-library.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast('Backed up: notebook, library and exhibitions.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'The backup could not be made.'); }
  }
  async function restore(file: File) {
    setRestoring(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a backup smaller than 5 MB.');
      const raw = await file.text();
      const incoming = exhibitionsInFile(raw);
      await props.onImport(raw);
      if (incoming) {
        const disk = readExhibitions();
        const merged = mergeExhibitions(mergeExhibitions(storeRef.current, disk ?? storeRef.current), incoming);
        storeRef.current = merged;
        setStore(merged);
        const problem = saveExhibitions(merged, undefined, { replaceInvalid: true });
        blocked.current = false;
        if (problem) throw new Error(problem);
      }
      setToast('Restored. Everything already here was kept.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'This file could not be restored.'); } finally { setRestoring(false); }
  }

  const ex = page.kind === 'exhibition' ? exhibitionById(page.id) : undefined;
  const piece = page.kind === 'item' ? pieceByKey(page.key) : undefined;
  // A page whose exhibition or piece has gone (taken down, removed elsewhere) steps back.
  useEffect(() => { if (content && ((page.kind === 'exhibition' && !ex) || (page.kind === 'item' && !piece))) back(); });
  const backLabel = stack.length > 1 ? (() => { const prev = stack[stack.length - 2]; return prev.kind === 'exhibition' ? exhibitionById(prev.id)?.title ?? 'Back' : prev.kind === 'catalogue' ? 'Catalogue' : 'Library'; })() : 'Library';
  const shortLabel = backLabel.length > 28 ? `${backLabel.slice(0, 26)}…` : backLabel;

  return <section ref={rootRef} className="lib lxa" data-lab="library-a">
    {page.kind === 'index' && <IndexPage gallery={gallery} actions={actions} query={query} setQuery={setQuery}
      onNew={title => setNewSheet({ title: title ?? '' })} onBeginNow={beginNow} onAdd={() => setAdding({ nodeId: null })}
      onBackup={backup} onRestore={() => fileInput.current?.click()} busy={restoring} />}
    {page.kind === 'exhibition' && ex && <ExhibitionPage key={ex.id} ex={ex} actions={actions} checks={checks} packAt={packAt} onBack={back}
      onHang={() => setHangSheet(ex.id)} onEdit={() => setEditSheet(ex.id)} onKeep={() => keep(ex)} />}
    {page.kind === 'item' && piece && <ItemPage key={piece.key} piece={piece} gallery={gallery} actions={actions} onBack={back} backLabel={shortLabel}
      onDetails={() => setDetail(piece.key)} onHangIn={() => setHangIn(piece.key)} />}
    {page.kind === 'catalogue' && <CataloguePage gallery={gallery} filter={catalogueFilter} setFilter={setCatalogueFilter} actions={actions} onBack={back} />}

    <input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Restore a Library backup" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void restore(file); }} />

    {newSheet && <Sheet label="New exhibition" onClose={() => setNewSheet(null)}>
      <NewExhibition gallery={gallery} initial={newSheet.title} hangKey={newSheet.hangKey} onCreate={input => begin(input, newSheet.hangKey)} />
    </Sheet>}
    {hangSheet && exhibitionById(hangSheet) && <HangSheet gallery={gallery} exhibition={exhibitionById(hangSheet)!} onToggle={(key, on) => toggleHang(hangSheet, key, on)}
      onAddNew={() => { const target = exhibitionById(hangSheet)!; setHangSheet(null); setAdding({ nodeId: target.places[0] ?? null, exhibition: target.id }); }} onClose={() => setHangSheet(null)} />}
    {editSheet && exhibitionById(editSheet)?.stored && <EditSheet exhibition={exhibitionById(editSheet)!} onClose={() => setEditSheet(null)}
      onSave={patch => { const id = storedId(editSheet)!; if (changeStore(current => updateExhibition(current, id, patch), 'Saved')) setEditSheet(null); }}
      onRemove={() => { const id = storedId(editSheet)!; if (changeStore(current => removeExhibition(current, id), 'Taken down')) { setEditSheet(null); back(); } }} />}
    {hangIn && pieceByKey(hangIn) && <Sheet label="Hang it in an exhibition" onClose={() => setHangIn(null)}>
      <h2 className="lxa-sheet-title">{pieceByKey(hangIn)!.title}</h2>
      {liveExhibitions(store).length > 0 && <ul className="lxa-pick-list">{gallery.mine.map(mine => {
        const on = mine.pieces.some(p => p.key === hangIn);
        return <li key={mine.id}><button type="button" className={`lxa-pick${on ? ' is-on' : ''}`} onClick={() => toggleHang(mine.id, hangIn, !on)} aria-pressed={on} data-action="hang-in" data-exhibition={mine.id}>
          <Collage plates={mine.images} variant="card" max={1} /><span className="lxa-row-text"><strong>{mine.title}</strong><small>{mine.pieces.length} pieces</small></span>
          <span className="lxa-tick" aria-hidden="true"><Icon name="check" /></span>
        </button></li>;
      })}</ul>}
      <button type="button" className="lxa-pick is-new" onClick={() => { const key = hangIn; setHangIn(null); setNewSheet({ title: '', hangKey: key }); }} data-action="hang-in-new">
        <span className="lxa-thumb is-square lxa-plus"><Icon name="plus" /></span><span className="lxa-row-text"><strong>A new exhibition</strong><small>A question or a theme</small></span>
      </button>
    </Sheet>}

    {/* The Library's own sheets, in this page's colours. */}
    <div className="lxa-host">
      {adding && <AddSheet library={library} initialNodeId={adding.nodeId} onSaveLink={saveLink} onAdd={addFound} onChange={props.onLibraryChange}
        more={adding.exhibition ? undefined : <>
          <button type="button" className="lib-row is-button lxa-add-note" onClick={() => { setAdding(null); props.onCreate('idea'); }} data-action="add-idea">
            <span className="lib-link-mark" aria-hidden="true">“</span><span className="lib-row-main"><strong>An idea</strong></span>
          </button>
          <button type="button" className="lib-row is-button lxa-add-note" onClick={() => { setAdding(null); props.onCreate('question'); }} data-action="add-question">
            <span className="lib-link-mark" aria-hidden="true">?</span><span className="lib-row-main"><strong>A question</strong></span>
          </button>
        </>}
        onOpenFound={found => { setDetail(null); setPreview(found); }} onOpenItem={key => { setAdding(null); if (gallery.byKey.has(key)) push({ kind: 'item', key }); }}
        onImported={() => { setAdding(null); connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); }); void libraryEnricher().start(); setToast('Imported. Covers and places arrive over the next minutes.'); }}
        onClose={() => setAdding(null)} />}
      {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={status} caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
        onAdd={preview ? itemStatus => { const result = addFound(preview, itemStatus); if ('error' in result) return result.error; setPreview(null); setAdding(null); push({ kind: 'item', key: result.key }); return null; } : undefined}
        onTryCase={props.onProve} onShowPlace={nodeId => { setDetail(null); setPreview(null); props.onNavigate(nodeId); }}
        onEditLink={link => { setDetail(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setDetail(null); setPreview(null); }} />}
      {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </div>

    {toast && <p className="lxa-toast" role="status">{toast}</p>}
  </section>;
}

