import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../../core/catalog';
import type { NotebookEntry } from '../../core/notebook';
import type { CheckLedger } from '../../checks/ledger';
import type { ExpeditionLedger } from '../../expeditions/ledger';
import type { ReelShelf } from '../../explore/pins';
import { loadContent, loadedContent, type Content } from '../../contentLoader';
import { loadFeedMemory } from '../../feed/memory';
import { usePoolIds } from '../../feed/usePool';
import { AddSheet, type FoundItem } from '../../notebook/AddSheet';
import { connectEnricher, libraryEnricher } from '../../notebook/enrich';
import { ItemSheet, type SheetItem } from '../../notebook/ItemSheet';
import { territoryState, type JournalContent, type WorkItem } from '../../notebook/journal';
import { entryAt, liveLinks, setStatus, upsertEntry, type ItemStatus, type LibraryStore, type SavedLink } from '../../notebook/libraryStore';
import { LinkSheet, type LinkDraft } from '../../notebook/LinkSheet';
import { entryFromBook } from '../../notebook/openLibrary';
import { mapPlaces } from '../../notebook/placeMap';
import { entryFromScreen } from '../../notebook/wikidata';
import '../../notebook/library.css';
import { Chapter, chapterLit, type Handlers } from './book';
import { buildIndex, chapterRows, coverPlaces, filterIndex, matchCount, type IndexChapter, type IndexItem, type LibraryIndex as Book } from './indexModel';
import { goLab, leaveLab, parseLabHash } from './labRoute';
import { hue, Icon, MapMark } from './marks';
import { PlacePage } from './PlacePage';
import { nearestProof, proofAt, type Proof, type ProofInput } from './proof';
import { LazyRow, Tile } from './tiles';
import './index.css';

export interface LibraryIndexProps {
  /** The place page open, or null for the index. */
  place: string | null;
  exp: ExpeditionLedger;
  checks: CheckLedger;
  entries: readonly NotebookEntry[];
  shelf: ReelShelf;
  library: LibraryStore;
  content: JournalContent | null;
  now?: number;
  onCreate: (kind: 'idea' | 'question', nodeId?: string) => void;
  onEdit: (entry: NotebookEntry) => void;
  /** Fly the atlas to a place. */
  onNavigate: (nodeId: string) => void;
  onOpenReel: (reelId: string) => void;
  onOpenVideo?: (videoId: string) => void;
  onSaveLink: (draft: LinkDraft) => string | null;
  onRemoveLink: (id: string) => void;
  onLibraryChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  getLibrary: () => LibraryStore;
  /** A place's next case (or its questions). */
  onTryCase: (nodeId: string) => void;
  /** A place's lesson. */
  onOpenLesson: (packId: string, from: string) => void;
}

/** The packs, banks and reels, once loaded (they usually are by the time the Library opens). */
export function useContentModule(): Content | null {
  const [content, setContent] = useState<Content | null>(loadedContent);
  useEffect(() => { if (!content) void loadContent().then(setContent, () => {}); }, [content]);
  return content;
}

const FOLDED_KEY = 'mok-lab-library-b.folded';
const readFolded = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(FOLDED_KEY) || '[]') as string[]); } catch { return new Set(); } };
const writeFolded = (folded: ReadonlySet<string>) => { try { localStorage.setItem(FOLDED_KEY, JSON.stringify([...folded])); } catch { /* a private window keeps it for the visit */ } };
/*
 * Where the index was, kept while a place page or another tab is open: the part of the book at the
 * top of the screen (a chapter, section or entry) and how far its top sat from the chrome's edge,
 * plus the raw offset for the head of the page above the first chapter. Rows draw as they near the
 * screen, so on the way back the rows above can stand at other heights than they did; finding the
 * same part again lands on the same lines in every engine.
 */
let kept: { at: string | null; offset: number; top: number } = { at: null, offset: 0, top: 0 };
/** The line just under the chrome, where the page's reading starts (the workspace's scroll padding). */
const lineOf = (box: HTMLElement) => box.getBoundingClientRect().top + (parseFloat(getComputedStyle(box).scrollPaddingTop) || 0);
function keepPlace(box: HTMLElement, page: HTMLElement) {
  const line = lineOf(box);
  let at: string | null = null, offset = 0;
  // Parts are in reading order, so the last one starting at or above the line is the one on screen.
  for (const part of page.querySelectorAll<HTMLElement>('[data-lbx-at]')) {
    const top = part.getBoundingClientRect().top;
    if (top > line + 1) break;
    at = part.dataset.lbxAt ?? null;
    offset = top - line;
  }
  kept = { at, offset, top: box.scrollTop };
}
/** The scroll offset that puts the kept part back where it was. */
function keptTop(box: HTMLElement, page: HTMLElement): number {
  const part = kept.at ? page.querySelector<HTMLElement>(`[data-lbx-at="${CSS.escape(kept.at)}"]`) : null;
  return part ? box.scrollTop + part.getBoundingClientRect().top - lineOf(box) - kept.offset : kept.top;
}
/** Bring a part of the book under the chrome. The smooth scroll's target is measured before rows on
 * the way draw themselves, so once it comes to rest the part is set exactly on the line. A touch or
 * wheel on the way hands the page back to the reader. */
function land(box: HTMLElement, part: HTMLElement) {
  part.scrollIntoView({ block: 'start', behavior: 'smooth' });
  let stopped = false, last = Number.NaN, still = 0, frames = 0;
  const stop = () => { stopped = true; };
  box.addEventListener('touchstart', stop, { once: true, passive: true });
  box.addEventListener('wheel', stop, { once: true, passive: true });
  const done = () => { box.removeEventListener('touchstart', stop); box.removeEventListener('wheel', stop); };
  const check = () => {
    if (stopped || ++frames > 180) return done();
    if (box.scrollTop === last) still++; else { still = 0; last = box.scrollTop; }
    if (still < 8) { requestAnimationFrame(check); return; }
    const off = part.getBoundingClientRect().top - lineOf(box);
    if (Math.abs(off) > 2) box.scrollTop += off;
    done();
  };
  requestAnimationFrame(check);
}

function Contents({ book, onChapter, onTerritory, searching }: { book: Book; onChapter: (chapter: IndexChapter) => void; onTerritory: (nodeId: string) => void; searching: boolean }) {
  const present = new Map(book.chapters.map(chapter => [chapter.nodeId, chapter]));
  return <nav className="lbx-contents" aria-label="Contents">
    <h2>Contents</h2>
    <ol>{catalog.getChildren(catalog.root).map(node => {
      const chapter = present.get(node.id);
      if (searching && !chapter) return null;
      return <li key={node.id} className={chapter ? undefined : 'is-blank'} style={hue(node.id)}>
        <button type="button" onClick={() => chapter ? onChapter(chapter) : onTerritory(node.id)} data-lbx-contents={node.id}>
          <span className="lbx-num">{node.index + 1}</span>
          <span className="lbx-contents-name"><b>{node.name}</b>{chapter && <small>{chapter.sections.map(s => s.name).join(' · ')}</small>}</span>
          <span className="lbx-leader" aria-hidden="true"><i /></span>
          <MapMark nodeId={node.id} mark={chapter && chapterLit(chapter) ? 'proved' : null} size={20} />
        </button>
      </li>;
    })}</ol>
  </nav>;
}

function Recent({ items, onAdd, handlers }: { items: readonly IndexItem[]; onAdd: () => void; handlers: Handlers }) {
  const add = <button type="button" className="lbx-tile lbx-add" onClick={onAdd} aria-label="Add a book, film or link" data-action="lbx-add"><span className="lbx-face"><Icon name="plus" size={22} /></span></button>;
  if (!items.length) return <section className="lbx-recent" aria-label="Add">
    <div className="lbx-empty-add">{add}<span>A book, a film, a link</span></div>
  </section>;
  return <section className="lbx-recent" aria-labelledby="lbx-recent-title">
    <h2 id="lbx-recent-title">Recent</h2>
    <div className="lbx-recent-row">
      {add}
      {items.map(item => <Tile key={item.key} item={item} onOpen={handlers.openItem} caption />)}
    </div>
  </section>;
}

// --- the page ----------------------------------------------------------------------------------

export function LibraryIndex(props: LibraryIndexProps) {
  const { exp, checks, entries, shelf, library, content, now } = props;
  const contentModule = useContentModule();
  const poolIds = usePoolIds(true);
  const watched = useMemo(() => loadFeedMemory().watched, [library]);
  const book = useMemo(() => buildIndex({ exp, checks, entries, shelf, library, content, now, watched }), [exp, checks, entries, shelf, library, content, now, watched]);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterIndex(book, query), [book, query]);
  const searching = !!query.trim();
  const [folded, setFolded] = useState<ReadonlySet<string>>(readFolded);
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState<{ nodeId: string | null } | null>(null);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const searchId = useId();

  // Covers and subjects for imported books arrive in the background, as on the Library tab.
  connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); });

  // The index keeps its place while a place page or another tab is open; a place page opens at its top.
  const scroller = () => root.current?.closest<HTMLElement>('.notebook-workspace') ?? null;
  useLayoutEffect(() => {
    const box = scroller(), page = root.current;
    if (!box || !page) return;
    if (props.place) { box.scrollTop = 0; return; }
    box.scrollTop = keptTop(box, page);
    // Rows near the screen draw over the next frames; keep the part on its line while they do,
    // unless the reader has already moved.
    let set = box.scrollTop, frames = 0, raf = 0;
    const hold = () => {
      if (box.scrollTop !== set || ++frames > 24) return;
      const top = keptTop(box, page);
      if (Math.abs(top - box.scrollTop) > 1) { box.scrollTop = top; set = box.scrollTop; }
      raf = requestAnimationFrame(hold);
    };
    raf = requestAnimationFrame(hold);
    return () => cancelAnimationFrame(raf);
  }, [props.place]);
  useEffect(() => {
    const box = scroller(), page = root.current;
    if (!box || !page || props.place) return;
    let raf = 0;
    const keep = () => { if (page.dataset.lbxPage === 'index') keepPlace(box, page); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; keep(); }); };
    box.addEventListener('scroll', onScroll, { passive: true });
    // A tap that leaves the index (a place, a reel, a video) is measured before it acts.
    page.addEventListener('click', keep, true);
    return () => { box.removeEventListener('scroll', onScroll); page.removeEventListener('click', keep, true); cancelAnimationFrame(raf); };
  }, [props.place]);

  const lit = useCallback((nodeId: string) => !!book.status.get(nodeId)?.litAt, [book]);
  const proofInput: ProofInput = useMemo(() => ({ exp, checks, now: now ?? Date.now(), lit }), [exp, checks, now, lit]);
  const proofs = useMemo(() => new Map<string, Proof | null>(), [contentModule, proofInput]);
  const nearests = useMemo(() => new Map<string, Proof | null>(), [contentModule, proofInput]);
  // A thing kept at several places shows its cover once, at its own first place; elsewhere, "see".
  const covers = useMemo(() => coverPlaces(chapterRows(shown.chapters)), [shown]);
  const handlers: Handlers = useMemo(() => ({
    proof: nodeId => { if (!contentModule) return null; if (!proofs.has(nodeId)) proofs.set(nodeId, proofAt(contentModule, nodeId, proofInput)); return proofs.get(nodeId)!; },
    closing: nodeId => {
      if (!contentModule) return null;
      if (!nearests.has(nodeId)) nearests.set(nodeId, nearestProof(contentModule, nodeId, proofInput));
      return nearests.get(nodeId) ?? 'none';
    },
    coverAt: key => covers.get(key),
    openPlace: nodeId => goLab({ place: nodeId }),
    openProof: proof => {
      if (proof.kind === 'lesson' && proof.packId) props.onOpenLesson(proof.packId, proof.nodeId);
      else if (proof.kind === 'proved') goLab({ place: proof.nodeId });
      else props.onTryCase(proof.nodeId);
    },
    openItem: item => {
      switch (item.kind) {
        case 'video': if (props.onOpenVideo && poolIds?.has(item.videoId)) props.onOpenVideo(item.videoId); else { setPreview(null); setItemKey(item.key); } break;
        case 'reel': props.onOpenReel(item.reel.id); break;
        case 'idea': case 'question': props.onEdit(item.entry); break;
        default: setPreview(null); setItemKey(item.key);
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [contentModule, proofInput, proofs, nearests, covers, poolIds, props.onOpenLesson, props.onTryCase, props.onOpenVideo, props.onOpenReel, props.onEdit]);

  const toggleFold = (nodeId: string) => setFolded(current => { const next = new Set(current); if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId); writeFolded(next); return next; });
  const toChapter = (chapter: IndexChapter) => {
    if (folded.has(chapter.nodeId)) toggleFold(chapter.nodeId);
    requestAnimationFrame(() => { const box = scroller(), part = document.getElementById(`lbx-chapter-${chapter.number}`); if (box && part) land(box, part); });
  };

  // Adding: the Library's own + sheet, its search results and its link sheet.
  const addFound = (found: FoundItem, status: ItemStatus): { key: string } | { error: string } => {
    const at = new Date().toISOString();
    const entry = found.source === 'ol' ? entryFromBook(found, status, at) : entryFromScreen(found, status, at);
    const key = entry.ids.shelf ? `work:${entry.ids.shelf}` : `entry:${entry.id}`;
    const problem = props.onLibraryChange(current => { const existing = entryAt(current, key); return existing ? setStatus(current, key, status, at) : upsertEntry(current, entry, at); });
    return problem ? { error: problem } : { key };
  };
  const works = useMemo(() => book.journal.items.flatMap(item => item.kind === 'work' ? [item.work] : []), [book]);
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
  }, [itemKey, preview, works, library]);

  const place = props.place && catalog.get(props.place) ? props.place : null;
  // Escape on a place's page goes back to the index (a sheet or dialog open over it takes Escape first,
  // and a case or lesson opened from the page, which stays under it, takes it for its own exit).
  useEffect(() => {
    if (!place) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && parseLabHash(window.location.hash) && !document.querySelector('.lib-sheet-backdrop,.modal-backdrop')) leaveLab({ place: null }); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [place]);
  const empty = !book.recent.length && !book.chapters.length;
  const count = searching ? matchCount(shown) : 0;

  return <div ref={root} className={`lbx${place ? ' is-place' : ''}${empty ? ' is-empty' : ''}`} data-lab="library-b" data-lbx-page={place ?? 'index'}>
    {place
      ? <PlacePage nodeId={place} book={book} content={contentModule} journalContent={content} exp={exp} checks={checks} now={now ?? Date.now()} watched={watched} handlers={handlers}
        onBack={() => leaveLab({ place: null })} onNavigate={props.onNavigate} onOpenVideo={props.onOpenVideo} onOpenReel={props.onOpenReel}
        onAddLink={nodeId => setLinkSheet({ nodeId })} onNote={nodeId => props.onCreate('idea', nodeId)} />
      : <article className="lbx-book">
        <header className="lbx-mast">
          <h1>Library</h1>
          {!empty && <label className="lbx-search" htmlFor={searchId}>
            <Icon name="search" />
            <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the index" aria-label="Search the index" autoComplete="off" enterKeyHint="search" data-action="lbx-search" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16} /></button>}
          </label>}
        </header>

        {!searching && <Recent items={book.recent.slice(0, 14)} onAdd={() => setAdding({ nodeId: null })} handlers={handlers} />}
        {searching && <p className="lbx-found" role="status">{count ? `${count} ${count === 1 ? 'thing' : 'things'} for “${query.trim()}”` : `Nothing in the index for “${query.trim()}”`}</p>}

        <div className="lbx-body">
          {!searching && <Contents book={shown} searching={false} onChapter={toChapter} onTerritory={props.onNavigate} />}
          <div className="lbx-chapters" key={searching ? `q:${query.trim()}` : 'all'}>
            {shown.chapters.map(chapter => <Chapter key={chapter.nodeId} chapter={chapter} handlers={handlers} folded={!searching && folded.has(chapter.nodeId)} onFold={() => toggleFold(chapter.nodeId)} />)}
            {shown.unplaced.length > 0 && <section className="lbx-chapter is-unplaced" data-lbx-chapter="unplaced" data-lbx-at="unplaced">
              <header className="lbx-chapter-head"><div className="lbx-chapter-title"><h2>Not on the map yet</h2></div></header>
              <LazyRow>{() => shown.unplaced.map(item => <Tile key={item.key} item={item} onOpen={handlers.openItem} />)}</LazyRow>
            </section>}
          </div>
        </div>
      </article>}

    {/* The Library's own sheets, in the Library's own styles. */}
    <div className="lib lbx-sheets">
    {adding && <AddSheet library={library} initialNodeId={adding.nodeId} onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
      onOpenFound={found => { setItemKey(null); setPreview(found); }} onOpenItem={key => { setPreview(null); setItemKey(key); }}
      onImported={() => { setAdding(null); void libraryEnricher().start(); }} onClose={() => setAdding(null)} />}
    {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(book.status, nodeId)}
      caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
      onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
      onTryCase={props.onTryCase} onShowPlace={nodeId => { setItemKey(null); setPreview(null); setAdding(null); goLab({ place: nodeId }); }}
      onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
    {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
    </div>
  </div>;
}
