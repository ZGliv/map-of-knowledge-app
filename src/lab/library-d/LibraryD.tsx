import { Fragment, memo, useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal, flushSync } from 'react-dom';
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
} from '../library-c/collections';
import { begunPlaces, piecesOf, UNPLACED, type Piece } from '../library-c/mosaic';
import {
  allPlaces, dayKey, fold, logRows, monthsOf, newestFirst, openMonths, ownStep, placeIndex, placeSteps, rowsWithin, searchLibrary, SHELVES, stepFor, STEP_WORDS, things, todayLine, withToday, wordsOf,
  type DayGroup, type LogRow, type MonthGroup, type PlaceEntry, type Shelf, type Step, type SubjectEntry,
} from './logbook';
import { isLabHash } from './route';
import './library-d.css';

/*
 * Prototype D of the Library: the Logbook. What the learner keeps, as a dated record: one hairline
 * spine down the page, months as chapters headed by the places proved in them, days in the margin,
 * and one row per thing on the day it was last touched. The spine takes a place's colour only on a
 * day that place was proved. A second way in, by place, is one tap away (the Places tab on a phone,
 * a rail on a desktop), where each field carries one quiet next step, where the learner left off, and a
 * Refresh wherever one is due. Real records only: the library,
 * notebook, ledgers, reel shelf, Watch's memory and the collections, through their own modules.
 */

export interface LibraryDProps {
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

type Screen = { kind: 'home' } | { kind: 'place'; id: string } | { kind: 'collection'; id: string };
type Tab = 'all' | 'places' | 'collections' | Shelf;
/** Kept across visits within a session: where the learner was, and how far down. */
const kept = { stack: [{ kind: 'home' }] as Screen[], tab: 'all' as Tab, scroll: new Map<string, number>(), expanded: new Set<string>() };

const NEUTRAL = '#9b9387';
const nameOf = (id: string) => id === UNPLACED ? 'Not placed yet' : catalog.get(id)?.name ?? id;
const hueOf = (id: string | null | undefined) => (id && id !== UNPLACED && catalog.get(id) ? territoryColor(id) : NEUTRAL);
const hue = (id: string | null | undefined) => ({ ['--hue' as string]: hueOf(id) }) as CSSProperties;
const sameYear = (date: Date, now: number) => date.getFullYear() === new Date(now).getFullYear();
const shortDate = (iso: string, now: number) => { const date = new Date(iso); return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear(date, now) ? undefined : 'numeric' }); };
const monthName = (month: Pick<MonthGroup, 'year' | 'month'>) => new Date(month.year, month.month, 1).toLocaleDateString(undefined, { month: 'long' });
const screenKey = (screen: Screen, tab: Tab) => screen.kind === 'home' ? `home:${tab}` : `${screen.kind}:${screen.id}`;
const placeCount = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

/** A callback that keeps one identity across renders and always calls the latest `fn`, so memoised rows never redraw for a new closure. */
function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}

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

function Icon({ name }: { name: 'map' | 'plus' | 'back' | 'search' | 'close' | 'check' }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'map' && <path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5ZM9 4v13.5M15 6.5V20" />}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'check' && <path d="m6 12.5 4 4 8-9" />}
  </svg>;
}

/** A place's colour as a dot: filled once proved there, a ring before. Never the land's shape. */
function Dot({ id, proved }: { id: string | null; proved: boolean }) {
  return <i className={`ld-dot${proved ? '' : ' is-open'}`} style={hue(id)} aria-hidden="true" />;
}

/** The words of `text` that begin with a searched word, marked. */
function Marked({ text, terms }: { text: string; terms: readonly string[] }) {
  if (!terms.length) return <>{text}</>;
  const parts = text.split(/([\p{L}\p{N}]+)/u);
  return <>{parts.map((part, i) => i % 2 === 1 && terms.some(term => fold(part).startsWith(term)) ? <mark key={i}>{part}</mark> : part)}</>;
}

/** A thing's picture at its own shape: a frame, a cover, a reel, a page. A book with no cover is set in type. */
function Thumb({ piece, className }: { piece: Piece; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : piece.image;
  const reel = piece.item.kind === 'reel' ? piece.item.reel : null;
  return <span className={`ld-th is-${piece.kind}${src ? ' has-img' : ''}${className ? ` ${className}` : ''}`} style={hue(piece.nodeIds[0])} aria-hidden="true">
    {src
      ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={reel?.position ? { objectPosition: reel.position } : undefined}
        onLoad={e => { if (e.currentTarget.naturalWidth < 2) setFailed(true); }} onError={() => setFailed(true)} />
      : piece.kind === 'link' ? <b>{(piece.byline || piece.title).replace(/^www\./, '').charAt(0).toUpperCase()}</b>
        : <b>{piece.title}</b>}
  </span>;
}

/** What a row needs from the page. Kept stable across renders, so memoised rows redraw only when their own data changes. */
interface Ctx {
  readonly now: number;
  readonly terms: readonly string[];
  readonly proved: (nodeId: string) => boolean;
  readonly open: (row: LogRow) => void;
  /** A place's next step; null on a place page, whose head carries it. */
  readonly step: (nodeId: string) => Step | null;
  readonly run: (step: Step) => void;
  readonly place: (nodeId: string) => void;
  readonly held: (collectionId: string) => readonly Piece[];
}

/** The dot between two parts of a line, kept on the end of the first, so a wrapped line never starts with one. */
const Sep = () => <span className="ld-sep" aria-hidden="true">{'\u00a0\u00b7 '}</span>;

/** The place a thing sits in, kept whole: on a narrow line it moves under the words rather than being cut. */
function PlaceChip({ id, ctx }: { id: string | null; ctx: Ctx }) {
  if (!id) return null;
  return <span className="ld-pl"><Dot id={id} proved={ctx.proved(id)} /><em>{nameOf(id)}</em></span>;
}

function StepButton({ step, ctx, named = false }: { step: Step; ctx: Ctx; named?: boolean }) {
  const words = STEP_WORDS[step.kind];
  return <button type="button" className="ld-step" onClick={() => ctx.run(step)} data-step={step.kind} data-node-id={step.nodeId} aria-label={`${words}: ${nameOf(step.nodeId)}`}>
    {words}{named && <span>{'\u00a0\u00b7 '}{nameOf(step.nodeId)}</span>}
  </button>;
}

/** One line of the record. `dated` puts its day in its meta (search results, which run off the spine). */
const Entry = memo(function Entry({ row, ctx, dated = false }: { row: LogRow; ctx: Ctx; dated?: boolean }) {
  const when = dated ? <><Sep />{shortDate(row.at, ctx.now)}</> : null;
  if (row.kind === 'thing' && row.piece) {
    const piece = row.piece;
    const note = piece.kind === 'idea' || piece.kind === 'question';
    return <li className={`ld-e is-thing is-${piece.kind}${note ? ' is-note' : ''}`}>
      <button type="button" className="ld-e-main" onClick={() => ctx.open(row)} data-row={row.key} data-kind={piece.kind}>
        {!note && <span className="ld-e-pic"><Thumb piece={piece} /></span>}
        <span className="ld-e-text">
          <span className="ld-e-t"><Marked text={row.title} terms={ctx.terms} />{row.byline && <i> {row.byline}</i>}</span>
          <span className="ld-e-m"><span className="ld-e-w">{row.verb}{when}</span><PlaceChip id={row.nodeId} ctx={ctx} /></span>
        </span>
      </button>
    </li>;
  }
  if (row.kind === 'proved' || row.kind === 'lasting' || row.kind === 'refreshed') {
    return <li className={`ld-e is-proof is-${row.kind}`} style={hue(row.nodeId)}>
      <button type="button" className="ld-e-main" onClick={() => ctx.open(row)} data-row={row.key} data-kind={row.kind}>
        <span className="ld-e-text">
          <span className="ld-e-p"><span className="ld-e-pn">{row.title}</span></span>
          <span className="ld-e-m"><span className="ld-e-w"><span className="ld-verb">{row.verb}</span>{row.detail && <><Sep />{row.detail}</>}{when}</span></span>
          {row.byline && <span className="ld-e-q">{row.byline}</span>}
        </span>
      </button>
    </li>;
  }
  if (row.kind === 'explored') {
    const step = row.nodeId && !ctx.proved(row.nodeId) ? ctx.step(row.nodeId) : null;
    const own = step && row.nodeId && within(step.nodeId, row.nodeId) ? step : null;
    return <li className="ld-e is-explored" style={hue(row.nodeId)}>
      <button type="button" className="ld-e-main" onClick={() => ctx.open(row)} data-row={row.key} data-kind="explored">
        <span className="ld-e-text">
          <span className="ld-e-p is-quiet"><Dot id={row.nodeId} proved={false} /><span className="ld-e-pn">{row.title}</span></span>
          <span className="ld-e-m"><span className="ld-e-w">{row.verb}<Sep />{row.detail}{when}</span></span>
        </span>
      </button>
      {own && <StepButton step={own} ctx={ctx} />}
    </li>;
  }
  if (row.kind === 'stuck' || row.kind === 'changed') {
    return <li className={`ld-e is-${row.kind}${row.kind === 'stuck' ? ' is-note' : ''}`}>
      <button type="button" className="ld-e-main" onClick={() => ctx.open(row)} data-row={row.key} data-kind={row.kind}>
        <span className="ld-e-text">
          <span className="ld-e-t"><Marked text={row.title} terms={ctx.terms} /></span>
          {row.kind === 'changed' && row.detail && <span className="ld-e-now">{row.detail}</span>}
          <span className="ld-e-m"><span className="ld-e-w">{row.verb}{when}</span><PlaceChip id={row.nodeId} ctx={ctx} /></span>
        </span>
      </button>
    </li>;
  }
  if (row.kind === 'collection' && row.collectionId) {
    const pictured = ctx.held(row.collectionId).filter(p => p.image).slice(0, 4);
    return <li className="ld-e is-collection">
      <button type="button" className="ld-e-main" onClick={() => ctx.open(row)} data-row={row.key} data-kind="collection">
        <span className="ld-e-pic"><span className="ld-th is-coll">{pictured.map(piece => <Thumb key={piece.key} piece={piece} className="is-tile" />)}</span></span>
        <span className="ld-e-text">
          <span className="ld-e-t is-serif"><Marked text={row.title} terms={ctx.terms} /></span>
          <span className="ld-e-m"><span className="ld-e-w">{row.verb}{when}<Sep />{things(row.count ?? 0).replace(' ', '\u00a0')}</span></span>
        </span>
      </button>
    </li>;
  }
  return null;
});

type Today = ReturnType<typeof todayLine>;

/**
 * The head of today: each place ready to refresh, or the one place where the learner left off. A place's
 * name opens its page, as everywhere else; the step beside it is the one thing that starts a case.
 */
function TodayEntry({ line, ctx }: { line: NonNullable<Today>; ctx: Ctx }) {
  const steps: Step[] = line.kind === 'ready' ? line.nodeIds.map(nodeId => ({ kind: 'refresh', nodeId })) : [line.step];
  return <li className="ld-e is-today" data-today={line.kind === 'ready' ? 'ready' : 'step'}>
    {steps.map(step => <span key={step.nodeId} className="ld-today-row" style={hue(step.nodeId)}>
      <button type="button" className="ld-today-name" onClick={() => ctx.place(step.nodeId)} data-today-place={step.nodeId}>
        <Dot id={step.nodeId} proved={step.kind === 'refresh'} />{nameOf(step.nodeId)}
      </button>
      <StepButton step={step} ctx={ctx} />
    </span>)}
  </li>;
}

const DayRow = memo(function DayRow({ day, ctx, today, isToday, children }: { day: Pick<DayGroup, 'key' | 'date' | 'rows' | 'lit'>; ctx: Ctx; today?: NonNullable<Today> | null; isToday: boolean; children?: ReactNode }) {
  return <li className={`ld-day${day.lit ? ' is-lit' : ''}${isToday ? ' is-today' : ''}`} style={day.lit ? hue(day.lit) : undefined} data-day={day.key}>
    <p className="ld-date"><small>{isToday ? 'Today' : day.date.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>{day.date.getDate()}</b></p>
    <ul className="ld-entries">
      {today && <TodayEntry line={today} ctx={ctx} />}
      {day.rows.map(row => <Entry key={row.key} row={row} ctx={ctx} />)}
      {children}
    </ul>
  </li>;
});

function Proved({ ids, ctx }: { ids: readonly string[]; ctx: Ctx }) {
  if (!ids.length) return null;
  return <span className="ld-proved"><span>Proved</span>{ids.map(id => <span key={id} className="ld-lit"><Dot id={id} proved={ctx.proved(id)} />{nameOf(id)}</span>)}</span>;
}

const thingCount = (month: MonthGroup) => month.rows.filter(row => row.kind === 'thing').length;

/**
 * Months as chapters. The newest are open; older ones fold to one line (their count, the places
 * proved in them and a strip of their pictures) and open in place. Memoised: scrolling and the
 * floating month never redraw it, and opening a month draws only that month's rows.
 */
const Logbook = memo(function Logbook({ rows, ctx, today = null, began = false, expanded, onExpand, children }: {
  rows: readonly LogRow[]; ctx: Ctx; today?: Today; began?: boolean; expanded: ReadonlySet<string>; onExpand: (key: string) => void; children?: ReactNode;
}) {
  // A row dated after now counts as today (monthsOf), and today's line has exactly one day to sit on (withToday).
  const months = useMemo(() => monthsOf(rows, ctx.now), [rows, ctx.now]);
  const pinned = !!(today || children);
  const list = useMemo(() => pinned ? withToday(months, ctx.now) : months, [months, pinned, ctx.now]);
  const todayKey = dayKey(new Date(ctx.now));
  const open = openMonths(list);
  for (const key of expanded) open.add(key);
  const first = rows.at(-1);
  return <div className="ld-log">
    {list.map((month, i) => {
      const year = i > 0 && month.year !== list[i - 1].year ? <p className="ld-year">{month.year}</p> : null;
      const name = monthName(month);
      const count = thingCount(month);
      if (!open.has(month.key)) {
        const pictured = month.rows.flatMap(row => row.piece?.image ? [row.piece] : []).slice(0, 9);
        return <Fragment key={month.key}>{year}<section className="ld-month is-folded" data-month={month.key} data-label={`${name} ${month.year}`} data-folded="">
          <button type="button" className="ld-fold" onClick={() => onExpand(month.key)} aria-expanded="false">
            <span className="ld-fold-head"><span className="ld-fold-name">{name} <span>{month.year}</span></span>{count > 0 && <small>{things(count)}</small>}</span>
            <Proved ids={month.proved} ctx={ctx} />
            {pictured.length > 0 && <span className="ld-strip">{pictured.map(piece => <Thumb key={piece.key} piece={piece} className="is-strip" />)}</span>}
          </button>
        </section></Fragment>;
      }
      return <Fragment key={month.key}>{year}<section className="ld-month" data-month={month.key} data-label={`${name} ${month.year}`}>
        <header className="ld-month-top">
          <div className="ld-month-head"><h2>{name} <span>{month.year}</span></h2>{count > 0 && <small>{things(count)}</small>}</div>
          {month.proved.length > 0 && <p className="ld-month-proved"><Proved ids={month.proved} ctx={ctx} /></p>}
        </header>
        <ol className="ld-days">
          {month.days.map((day, d) => <DayRow key={day.key} day={day} ctx={ctx} isToday={day.key === todayKey} today={day.key === todayKey ? today : null}>{d === 0 && day.key === todayKey ? children : null}</DayRow>)}
        </ol>
      </section></Fragment>;
    })}
    {began && first && <p className="ld-began"><span>Began {new Date(first.at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: sameYear(new Date(first.at), ctx.now) ? undefined : 'numeric' })}</span></p>}
  </div>;
});

/**
 * The month whose chapter is under the top edge, floating in the top row on a phone; it opens the months.
 * It keeps its own state and its own scroll listener, so a new month redraws this button and nothing else.
 * Centred, as wide as the room between the shell's capsules allows; where a month and its year do not fit
 * (a 320 px phone), the month alone.
 */
const MonthPill = memo(function MonthPill({ scroller, watch, hidden, onOpen }: { scroller: RefObject<HTMLDivElement | null>; watch: string; hidden: boolean; onOpen: () => void }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const find = () => {
      frame = 0;
      const line = el.getBoundingClientRect().top + parseFloat(getComputedStyle(el).paddingTop || '0') + 6;
      let current: HTMLElement | null = null;
      for (const section of el.querySelectorAll<HTMLElement>('[data-month]')) { if (section.getBoundingClientRect().top <= line) current = section; else break; }
      const head = current?.querySelector('.ld-month-head,.ld-fold-head');
      setLabel(current && head && head.getBoundingClientRect().bottom < line ? current.dataset.label ?? null : null);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(find); };
    find();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [scroller, watch]);

  const shown = label !== null;
  const [room, setRoom] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!shown) return;
    const measure = () => {
      const mid = document.documentElement.clientWidth / 2;
      let half = mid - 16;
      for (const capsule of document.querySelectorAll<HTMLElement>('.shell-lead,.shell-bar-tools')) {
        const box = capsule.getBoundingClientRect();
        if (!box.width || getComputedStyle(capsule).visibility === 'hidden') continue;
        if (box.right <= mid) half = Math.min(half, mid - box.right - 8);
        else if (box.left >= mid) half = Math.min(half, box.left - mid - 8);
      }
      setRoom(Math.max(0, Math.floor(half * 2)));
    };
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [shown]);

  const button = useRef<HTMLButtonElement>(null);
  const [fit, setFit] = useState<{ key: string; short: boolean } | null>(null);
  const fitKey = `${label}|${room}`;
  useLayoutEffect(() => {
    const el = button.current;
    if (!el || !label || fit?.key === fitKey) return;
    setFit({ key: fitKey, short: el.scrollWidth > el.clientWidth + 1 });
  }, [fitKey, label, fit]);

  if (!label || hidden) return null;
  const text = fit?.key === fitKey && fit.short ? label.replace(/\s+\d{4}$/, '') : label;
  return createPortal(<button ref={button} type="button" className="ld-month-pill" onClick={onOpen} data-action="ld-month-pill" aria-label={`${label}: jump to a month`}
    style={room !== null ? { maxWidth: room } : undefined}>{text}</button>, document.body);
});

/** Search results: the first ones at once, more as the list nears its end, so a one-letter search paints quickly. */
const PAGE = 40;
function ResultRows({ rows, ctx, root }: { rows: readonly LogRow[]; ctx: Ctx; root: RefObject<HTMLDivElement | null> }) {
  const [limit, setLimit] = useState(PAGE);
  const more = useRef<HTMLLIElement>(null);
  const left = rows.length > limit;
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') { setLimit(rows.length); return; }
    const watch = new IntersectionObserver(seen => { if (seen.some(entry => entry.isIntersecting)) setLimit(n => n + PAGE * 2); }, { root: root.current, rootMargin: '0px 0px 900px 0px' });
    watch.observe(el);
    return () => watch.disconnect();
  }, [root, left, limit, rows.length]);
  return <ul className="ld-list">
    {rows.slice(0, limit).map(row => <Entry key={row.key} row={row} ctx={ctx} dated />)}
    {left && <li ref={more} className="ld-more" aria-hidden="true" />}
  </ul>;
}

// --- places --------------------------------------------------------------------------------------

const PROVED_STATES = new Set(['ready', 'lasting', 'proved']);

/** A place in a list: its dot, name and state, and the step the list gives it (the caller decides which). */
function PlaceRow({ entry, ctx, field = false, step = null, onOpen }: { entry: PlaceEntry; ctx: Ctx; field?: boolean; step?: Step | null; onOpen: (id: string) => void }) {
  const sub = field && entry.state === 'kept' ? '' : entry.status;
  return <div className={`ld-prow${field ? ' is-field' : ''}`} style={hue(entry.id)}>
    <button type="button" className="ld-prow-main" onClick={() => onOpen(entry.id)} data-place-row={entry.id}>
      <Dot id={entry.id === UNPLACED ? null : entry.id} proved={PROVED_STATES.has(entry.state)} />
      <span className="ld-prow-text"><b><Marked text={entry.name} terms={ctx.terms} /></b>{sub && <small>{sub}</small>}</span>
      {field && entry.count > 0 && <i>{entry.count}</i>}
    </button>
    {step && <StepButton step={step} ctx={ctx} named={step.nodeId !== entry.id} />}
  </div>;
}

/**
 * A field and its places. A field with places carries no step of its own; of its places, those ready to
 * refresh carry Refresh and the one where the learner left off carries its step. A field with no places
 * of its own carries its own step.
 */
function FieldItem({ field, ctx, onOpen }: { field: PlaceEntry; ctx: Ctx; onOpen: (id: string) => void }) {
  const steps = field.places.length ? placeSteps(field, ctx.step) : null;
  return <li className="ld-field">
    <PlaceRow entry={field} ctx={ctx} field step={steps ? null : ownStep(field, ctx.step)} onOpen={onOpen} />
    {steps && <ul className="ld-inner">{field.places.map(place => <li key={place.id}><PlaceRow entry={place} ctx={ctx} step={steps.get(place.id) ?? null} onOpen={onOpen} /></li>)}</ul>}
  </li>;
}

/** The second way in, as the atlas files it: subjects, their regions, a region's fields, a field's places, each with its state and next step. */
function PlacesIndex({ index, ctx, onOpen, compact = false }: { index: readonly SubjectEntry[]; ctx: Ctx; onOpen: (id: string) => void; compact?: boolean }) {
  return <div className={`ld-index${compact ? ' is-compact' : ''}`} data-index="">
    {index.map(subject => subject.id === UNPLACED
      ? <section key={subject.id} className="ld-subject is-unplaced" aria-label={subject.name}>
        <button type="button" className="ld-subject-row" onClick={() => onOpen(UNPLACED)} data-place-row={UNPLACED}><h2>{subject.name}</h2><i>{subject.regions[0]?.entry.count}</i></button>
      </section>
      : <section key={subject.id} className="ld-subject" aria-label={subject.name}>
        <h2>{subject.name}</h2>
        <ul>
          {subject.regions.map(({ entry, split }) => split
            ? <li key={entry.id} className="ld-region">
              <button type="button" className="ld-region-head" onClick={() => onOpen(entry.id)} data-place-row={entry.id}><span><Marked text={entry.name} terms={ctx.terms} /></span><i>{entry.count || ''}</i></button>
              <ul>{entry.places.map(field => <FieldItem key={field.id} field={field} ctx={ctx} onOpen={onOpen} />)}</ul>
            </li>
            : <FieldItem key={entry.id} field={entry} ctx={ctx} onOpen={onOpen} />)}
        </ul>
      </section>)}
  </div>;
}

// --- collections ---------------------------------------------------------------------------------

function CollectionList({ shelf, onOpen, onNew }: { shelf: readonly { collection: Collection; pieces: readonly Piece[] }[]; onOpen: (id: string) => void; onNew: () => void }) {
  return <div className="ld-colls">
    <ul>
      {shelf.map(({ collection, pieces }) => <li key={collection.id}>
        <button type="button" className="ld-coll" onClick={() => onOpen(collection.id)} data-collection={collection.id}>
          <span className="ld-coll-text"><b>{collection.name}</b><small>{things(pieces.length)}</small></span>
          <span className="ld-coll-strip">{pieces.filter(p => p.image).slice(0, 4).map(piece => <Thumb key={piece.key} piece={piece} className="is-strip" />)}</span>
        </button>
      </li>)}
    </ul>
    <button type="button" className="ld-quiet" onClick={onNew} data-action="ld-collection-new"><Icon name="plus" />New collection</button>
  </div>;
}

function CollectionSheet({ collection, pieces, ctx, onSave, onRemove, onClose }: {
  collection: Collection | null; pieces: readonly Piece[]; ctx: Ctx;
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
  const terms = wordsOf(query);
  const list = terms.length ? pieces.filter(piece => { const words = wordsOf(`${piece.title} ${piece.byline} ${piece.text}`); return terms.every(term => words.some(word => word.startsWith(term))); }) : pieces;
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet ld-sheet" role="dialog" aria-modal="true" aria-label={collection ? 'Edit collection' : 'New collection'} tabIndex={-1} onClick={e => e.stopPropagation()} data-picker={collection ? 'edit' : 'new'}>
      <span className="lib-grab" aria-hidden="true" />
      <header className="ld-sheet-head">
        <label htmlFor={nameId} className="sr-only">Name</label>
        <input id={nameId} ref={nameField} className="ld-name-field" value={name} onChange={e => setName(e.target.value)} placeholder="Name this collection" maxLength={80} data-action="ld-collection-name" />
        <button type="button" className="ld-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <label className="ld-search is-sheet"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in your library" aria-label="Find in your library" /></label>
      <ul className="ld-pick">
        {list.map(piece => { const on = chosen.includes(piece.key); return <li key={piece.key}>
          <button type="button" aria-pressed={on} onClick={() => toggle(piece.key)} data-pick={piece.key}>
            {piece.kind === 'idea' || piece.kind === 'question' ? <span className="ld-pick-quote" aria-hidden="true">{piece.kind === 'question' ? '?' : '“'}</span> : <Thumb piece={piece} />}
            <span className="ld-e-text"><span className="ld-e-t">{piece.title}</span><span className="ld-e-m"><span className="ld-e-w">{shortDate(piece.lastAt || piece.at, ctx.now)}</span><PlaceChip id={piece.nodeIds[0] ?? null} ctx={ctx} /></span></span>
            <span className={`ld-tick${on ? ' is-on' : ''}`}>{on && <Icon name="check" />}</span>
          </button>
        </li>; })}
      </ul>
      {problem && <p className="ld-problem" role="alert">{problem}</p>}
      <footer className="lib-sheet-foot ld-sheet-foot">
        {onRemove && (confirm
          ? <button type="button" className="ld-quiet is-danger" onClick={onRemove} data-action="ld-collection-remove-confirm">Delete this collection</button>
          : <button type="button" className="ld-quiet" onClick={() => setConfirm(true)} data-action="ld-collection-remove">Delete</button>)}
        <button type="button" className="ld-solid" disabled={!name.trim()} onClick={() => { const error = onSave(name, chosen); if (error) setProblem(error); }} data-action="ld-collection-save">{collection ? 'Done' : 'Create'}</button>
      </footer>
    </section>
  </div>;
}

/** The months, to jump to one: the logbook's contents. */
function MonthsSheet({ months, ctx, onJump, onClose }: { months: readonly MonthGroup[]; ctx: Ctx; onJump: (key: string) => void; onClose: () => void }) {
  const sheet = useRef<HTMLElement>(null);
  useSheetFocus(sheet, onClose);
  return <div className="lib-sheet-backdrop" onClick={onClose}>
    <section ref={sheet} className="lib-sheet ld-sheet ld-months-sheet" role="dialog" aria-modal="true" aria-label="Months" tabIndex={-1} onClick={e => e.stopPropagation()} data-sheet="months">
      <span className="lib-grab" aria-hidden="true" />
      <ul className="ld-contents">
        {months.map((month, i) => <Fragment key={month.key}>
          {i > 0 && month.year !== months[i - 1].year && <li className="ld-contents-year">{month.year}</li>}
          <li><button type="button" onClick={() => onJump(month.key)} data-jump={month.key}>
            <span className="ld-contents-name">{monthName(month)} <span>{month.year}</span></span><i>{thingCount(month) || ''}</i>
            {month.proved.length > 0 && <Proved ids={month.proved} ctx={ctx} />}
          </button></li>
        </Fragment>)}
      </ul>
    </section>
  </div>;
}

// --- the page ------------------------------------------------------------------------------------

export function LibraryD(props: LibraryDProps) {
  const { exp, checks, entries, shelf, library, content } = props;
  const [mountedAt] = useState(Date.now);
  const now = props.now ?? mountedAt;
  const journal = useMemo(() => buildJournal({ exp, checks, entries, shelf, library, content, now }), [exp, checks, entries, shelf, library, content, now]);
  const watchIds = usePoolIds(true);
  // Watch's memory of what was watched through; read again whenever the records change.
  const watched = useMemo(() => loadFeedMemory().watched, [journal]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = useMemo(() => piecesOf(journal, { watchIds, watched, reelsWatched: shelf.watched }), [journal, watchIds, watched, shelf.watched]);
  const pieceByKey = useMemo(() => new Map(pieces.map(p => [p.key, p])), [pieces]);
  const begun = useMemo(() => begunPlaces(exp, checks), [exp, checks]);
  const phone = useMedia('(max-width: 800px)');
  const wide = useMedia('(min-width: 1181px)');

  // The content chunk (packs, cases and the refresh ladder): what a next step and a refresh can offer.
  const [loaded, setLoaded] = useState<Content | null>(loadedContent);
  useEffect(() => { if (!loaded) void loadContent().then(setLoaded, () => {}); }, [loaded]);
  const hasCase = useCallback((nodeId: string) => !!loaded && loaded.hasCases(nodeId) && !!loaded.nextCase(nodeId, checks), [loaded, checks]);
  const refreshes = useMemo(() => {
    if (!loaded) return undefined;
    const out = new Map<string, readonly string[]>();
    for (const [nodeId, fresh] of loaded.freshnessByNode(exp, checks, now)) out.set(nodeId, fresh.refreshTimes);
    return out;
  }, [loaded, exp, checks, now]);

  // Covers for books brought in from an import or the shelf arrive in the background, as on the Library tab.
  connectEnricher(props.getLibrary, change => { props.onLibraryChange(change); });
  const enricher = libraryEnricher();
  useEffect(() => { if (waitingEntries(props.getLibrary()).length) void enricher.start(); }, [enricher, props.getLibrary]);

  // Collections: their own record (lab/library-c/collections.ts), merged with what another tab saved.
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
  const live = useMemo(() => liveCollections(collections), [collections]);
  const shelfOf = useMemo(() => live.map(c => ({ collection: c, pieces: c.items.map(key => pieceByKey.get(key)).filter((p): p is Piece => !!p) })), [live, pieceByKey]);

  // The record, its places and today's line.
  const rows = useMemo(() => logRows({ journal, pieces, refreshes, collections: live, now }), [journal, pieces, refreshes, live, now]);
  const index = useMemo(() => placeIndex(journal, pieces, begun, rows, now), [journal, pieces, begun, rows, now]);
  const entryById = useMemo(() => new Map(allPlaces(index).map(entry => [entry.id, entry])), [index]);
  const today = useMemo(() => todayLine(rows, journal.status, begun, hasCase), [rows, journal.status, begun, hasCase]);
  const proved = useCallback((nodeId: string) => !!journal.status.get(nodeId)?.litAt, [journal.status]);
  const stepOf = useCallback((nodeId: string) => stepFor(nodeId, journal.status, hasCase, begun), [journal.status, hasCase, begun]);
  const run = useStable((step: Step) => { if (step.kind === 'lesson' && step.packId) props.onOpenExpedition(step.packId); else props.onTryCase(step.nodeId); });

  // Where the learner is.
  const [stack, setStackState] = useState<Screen[]>(kept.stack);
  const [tab, setTabState] = useState<Tab>(kept.tab);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(kept.expanded);
  const scroller = useRef<HTMLDivElement>(null);
  const screen = stack[stack.length - 1];
  const setStack = (next: Screen[]) => { kept.stack = next; setStackState(next); };
  const setTab = (next: Tab) => { kept.tab = next; setTabState(next); };
  const push = (next: Screen) => { kept.scroll.delete(screenKey(next, tab)); setStack([...stack, next]); };
  const pop = () => setStack(stack.length > 1 ? stack.slice(0, -1) : [{ kind: 'home' }]);
  const expand = useCallback((key: string) => setExpanded(current => { const next = new Set(current); next.add(key); kept.expanded = next; return next; }), []);
  const openPlace = useStable((nodeId: string) => { setQuery(''); setItemKey(null); setPreview(null); push({ kind: 'place', id: nodeId }); });

  // Search: word beginnings ("gene" finds "genetics"), whole words first; results leave the spine. The field
  // answers each key at once; the results follow a beat behind (a deferred value), so typing never waits on them.
  const [query, setQuery] = useState('');
  const sought = useDeferredValue(query);
  const terms = useMemo(() => wordsOf(sought), [sought]);
  const searching = terms.length > 0;
  const results = useMemo(() => searching ? searchLibrary(sought, rows, index) : null, [searching, sought, rows, index]);
  const searchField = useRef<HTMLInputElement>(null);

  const viewKey = searching ? 'search' : screenKey(screen, tab);
  const viewKeyRef = useRef(viewKey);
  viewKeyRef.current = viewKey;
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = kept.scroll.get(viewKey) ?? 0; }, [viewKey]);
  useEffect(() => { if (!searching) kept.scroll.delete('search'); }, [searching]);

  // The shell's magnifier searches the Library while the Library shows.
  const openSearch = useCallback(() => {
    flushSync(() => { kept.stack = [{ kind: 'home' }]; setStackState(kept.stack); });
    scroller.current?.scrollTo({ top: 0 });
    searchField.current?.focus();
  }, []);
  // The Library tab tapped while the Logbook already shows: back to its front page, as iOS does; tapped
  // again there, back to the top. Not while a case or a lesson has the screen (the address is theirs then):
  // that tap only closes them and comes back where the learner was.
  const tabTap = useStable(() => {
    if (!isLabHash(window.location.hash) || document.querySelector('.lib-sheet-backdrop,[role=dialog]')) return;
    if (stack.length > 1 || query) { setQuery(''); setStack([{ kind: 'home' }]); return; }
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  });
  useEffect(() => {
    const button = document.querySelector<HTMLElement>('[data-action="open-search"]');
    const label = button?.getAttribute('aria-label') ?? null;
    button?.setAttribute('aria-label', 'Search your library');
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-action="open-notebook-mobile"],[data-action="open-notebook"]')) { tabTap(); return; }
      if (!event.target.closest('[data-action="open-search"]')) return;
      event.preventDefault();
      event.stopPropagation();
      openSearch();
    };
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('click', click, true); if (button && label) button.setAttribute('aria-label', label); };
  }, [openSearch, tabTap]);

  // Sheets.
  const [itemKey, setItemKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoundItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [linkSheet, setLinkSheet] = useState<{ link?: SavedLink; nodeId?: string | null } | null>(null);
  const [picker, setPicker] = useState<{ id: string | null } | null>(null);
  const [monthsOpen, setMonthsOpen] = useState(false);
  const sheetOpen = adding || !!itemKey || !!preview || !!linkSheet || !!picker || monthsOpen;

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('.lib-sheet-backdrop,[role=dialog]')) return;
      if (query && document.activeElement === searchField.current) { setQuery(''); return; }
      if (stack.length > 1) pop();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // A screen whose place or collection is gone (removed elsewhere) falls back home.
  useEffect(() => {
    if (screen.kind === 'collection' && !live.some(c => c.id === screen.id)) setStack([{ kind: 'home' }]);
  }, [screen, live]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** Every row opens the real thing: a video in Watch, a reel in Reels, a note in its editor, a book or a link in its sheet, a proof on its place. */
  const openRow = useStable((row: LogRow) => {
    if (row.kind === 'collection' && row.collectionId) { setQuery(''); push({ kind: 'collection', id: row.collectionId }); return; }
    const piece = row.piece;
    if (!piece) { if (row.nodeId) openPlace(row.nodeId); return; }
    const item = piece.item;
    if (piece.kind === 'video' && piece.videoId) props.onOpenVideo(piece.videoId);
    else if (item.kind === 'reel') props.onOpenReel(item.reel.id);
    else if (item.kind === 'idea' || item.kind === 'question') props.onEdit(item.entry);
    else { setPreview(null); setItemKey(piece.key); }
  });

  const held = useCallback((id: string) => shelfOf.find(s => s.collection.id === id)?.pieces ?? [], [shelfOf]);
  const ctx: Ctx = useMemo(() => ({ now, terms, proved, open: openRow, step: stepOf, run, place: openPlace, held }), [now, terms, proved, openRow, stepOf, run, openPlace, held]);
  // On a place page its head carries the one next step, so the rows under it carry none.
  const quietCtx: Ctx = useMemo(() => ({ ...ctx, step: () => null }), [ctx]);
  const railCtx: Ctx = useMemo(() => ({ ...ctx, terms: [] }), [ctx]);

  // Where the learner is in each view, kept for coming back. The floating month listens for itself (MonthPill).
  const onScroll = (event: React.UIEvent<HTMLDivElement>) => { kept.scroll.set(viewKeyRef.current, event.currentTarget.scrollTop); };
  const openMonthsSheet = useCallback(() => setMonthsOpen(true), []);

  // Jumping to a month: opened if folded, then brought to the top edge.
  const [jump, setJump] = useState<string | null>(null);
  const jumpTo = (key: string) => {
    setMonthsOpen(false);
    if (screen.kind !== 'home' || tab === 'places' || tab === 'collections' || searching) { setQuery(''); setStack([{ kind: 'home' }]); setTab('all'); }
    expand(key);
    setJump(key);
  };
  useLayoutEffect(() => {
    if (!jump) return;
    const el = scroller.current;
    const section = el?.querySelector<HTMLElement>(`[data-month="${jump}"]`);
    if (el && section) el.scrollTop += section.getBoundingClientRect().top - el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).paddingTop || '0') - 4;
    setJump(null);
  }, [jump]);

  // --- what shows ---
  const thingRows = useMemo(() => rows.filter(row => row.kind === 'thing'), [rows]);
  const nothing = rows.length === 0 && index.length === 0;
  const shelves = SHELVES.filter(s => thingRows.some(row => row.shelf === s.id));
  const tabs: { id: Tab; label: string; count?: number }[] = nothing ? [] : [
    { id: 'all', label: 'All', count: thingRows.length },
    ...(index.length ? [{ id: 'places' as Tab, label: 'Places', count: allPlaces(index).filter(e => e.id !== UNPLACED).length }] : []),
    ...shelves.map(s => ({ id: s.id as Tab, label: s.label, count: thingRows.filter(row => row.shelf === s.id).length })),
    ...(pieces.length ? [{ id: 'collections' as Tab, label: 'Collections', count: live.length || undefined }] : []),
  ];
  const activeTab: Tab = tabs.some(t => t.id === tab) ? tab : 'all';
  const shown = useMemo(() => activeTab === 'all' ? rows : rows.filter(row => row.shelf === activeTab), [activeTab, rows]);
  const allMonths = useMemo(() => monthsOf(rows, now), [rows, now]);

  const addButton = <button type="button" className="ld-add" onClick={() => setAdding(true)} aria-label="Add to your library" data-action="ld-add"><Icon name="plus" /></button>;
  const search = <label className={`ld-search${searching ? ' is-on' : ''}`}>
    <Icon name="search" />
    <input ref={searchField} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your library" aria-label="Search your library" enterKeyHint="search" autoComplete="off" spellCheck={false} data-action="ld-search" />
    {query && <button type="button" className="ld-clear" onClick={() => { setQuery(''); searchField.current?.focus(); }} aria-label="Clear search"><Icon name="close" /></button>}
  </label>;
  const onMap = (nodeId: string, label = 'On the map') => <button type="button" className="ld-pill" onClick={() => props.onNavigate(nodeId)} data-action="ld-on-map" data-node-id={nodeId}><Icon name="map" />{label}</button>;
  const empty = <Logbook rows={[]} ctx={ctx} expanded={expanded} onExpand={expand}>
    <li className="ld-e is-today is-empty"><button type="button" className="ld-quiet" onClick={() => setAdding(true)} data-action="ld-add-first"><Icon name="plus" />Add a book, a film or a link</button></li>
  </Logbook>;

  const resultsView = results && <div className="ld-results" aria-live="polite" data-results="">
    <p className="ld-found">{results.rows.length || results.places.length
      ? [results.rows.length ? things(results.rows.length) : '', results.places.length ? placeCount(results.places.length) : ''].filter(Boolean).join(' and ')
      : `Nothing matches “${sought.trim()}”`}</p>
    {results.places.length > 0 && <section className="ld-sec" aria-label="Places"><h2>Places</h2><div className="ld-index is-flat">{results.places.map(entry => <PlaceRow key={entry.id} entry={entry} ctx={ctx} step={ownStep(entry, stepOf)} onOpen={openPlace} />)}</div></section>}
    {results.rows.length > 0 && <section className="ld-sec" aria-label="Things"><h2>Things</h2><ResultRows key={sought} rows={results.rows} ctx={ctx} root={scroller} /></section>}
  </div>;

  const homeBody = (): ReactNode => {
    if (nothing) return empty;
    if (activeTab === 'places') return <><PlacesIndex index={index} ctx={ctx} onOpen={openPlace} />{onMap(journal.field.nodeId)}</>;
    if (activeTab === 'collections') return <CollectionList shelf={shelfOf} onOpen={id => push({ kind: 'collection', id })} onNew={() => setPicker({ id: null })} />;
    return <Logbook rows={shown} ctx={ctx} today={activeTab === 'all' ? today : null} began={activeTab === 'all'} expanded={expanded} onExpand={expand} />;
  };

  const back = <button type="button" className="ld-back" onClick={pop} data-action="ld-back"><Icon name="back" /><span>{stack.length > 2 && stack[stack.length - 2].kind === 'place' ? nameOf((stack[stack.length - 2] as { id: string }).id) : 'Library'}</span></button>;

  let page: ReactNode = null;
  if (screen.kind === 'place') {
    const id = screen.id;
    const node = catalog.get(id);
    const entry = entryById.get(id);
    const own = journal.status.get(id);
    const here = id === UNPLACED ? rows.filter(row => row.kind === 'thing' && !row.nodeId) : rowsWithin(rows, id);
    const loose = id === UNPLACED || entry ? null : stepOf(id);
    const step = id === UNPLACED ? null : entry ? ownStep(entry, stepOf) : loose && within(loose.nodeId, id) ? loose : null;
    const status = loaded && own?.litAt ? loaded.checkStatus(id, exp, checks, now) : null;
    const next = status?.kind === 'waiting' ? status.dueAt : status?.kind === 'lasting' ? status.refreshAt : status?.kind === 'cooling' ? status.readyAt : undefined;
    const stateLine = own?.litAt
      ? [own.ready ? 'Ready to refresh' : own.lastingAt ? 'Lasting' : 'Proved', `proved ${shortDate(own.litAt, now)}`, !own.ready && next ? `next refresh ${shortDate(next, now)}` : ''].filter(Boolean).join(' · ')
      : entry?.status ?? (territoryState(journal.status, id) === 'underway' ? 'Begun, not proved yet' : things(here.filter(r => r.kind === 'thing').length));
    const inner = entry?.places ?? [];
    page = <div className="ld-place" data-screen="place" data-place={id} style={hue(id)}>
      {back}
      <header className="ld-place-head">
        {node && node.depth > 1 && <p className="ld-path">{catalog.getPath(node).slice(1, -1).map(n => n.name).join(' · ')}</p>}
        <h1>{nameOf(id)}</h1>
        <p className="ld-state"><Dot id={id === UNPLACED ? null : id} proved={!!own?.litAt || (entry ? PROVED_STATES.has(entry.state) : false)} /><em>{stateLine}</em></p>
        {id !== UNPLACED && <div className="ld-place-actions">{onMap(id)}{step && <StepButton step={step} ctx={ctx} named={step.nodeId !== id} />}</div>}
      </header>
      {inner.length > 0 && <section className="ld-sec ld-here" aria-label="Places here"><h2>Places here</h2><div className="ld-index is-flat">{inner.map(place => {
        // The head carries the one next step; a place here carries only a refresh that is due besides it.
        const due = ownStep(place, stepOf);
        return <PlaceRow key={place.id} entry={place} ctx={ctx} step={due?.kind === 'refresh' && due.nodeId !== step?.nodeId ? due : null} onOpen={openPlace} />;
      })}</div></section>}
      {here.length > 0 && <Logbook rows={here} ctx={quietCtx} expanded={expanded} onExpand={expand} />}
    </div>;
  } else if (screen.kind === 'collection') {
    const entry = shelfOf.find(s => s.collection.id === screen.id);
    if (entry) {
      const { collection, pieces: held } = entry;
      const keys = new Set(held.map(p => p.key));
      const places = [...new Set(held.flatMap(p => p.nodeIds.slice(0, 1)))];
      page = <div className="ld-place ld-collection" data-screen="collection" data-collection={collection.id}>
        {back}
        <header className="ld-place-head">
          <h1>{collection.name}</h1>
          <p className="ld-state is-chips"><span>{things(held.length)}</span>{places.slice(0, 6).map(id => <span key={id} className="ld-pl"><Dot id={id} proved={proved(id)} /><em>{nameOf(id)}</em></span>)}</p>
          <div className="ld-place-actions"><button type="button" className="ld-pill" onClick={() => setPicker({ id: collection.id })} data-action="ld-collection-edit">Edit</button></div>
        </header>
        {held.length > 0 && <Logbook rows={rows.filter(row => row.kind === 'thing' && keys.has(row.key)).sort(newestFirst)} ctx={ctx} expanded={expanded} onExpand={expand} />}
      </div>;
    }
  }
  if (!page) {
    page = phone
      ? <div className={`ld-home${searching ? ' is-searching' : ''}`} data-screen="home">
        <header className="ld-head"><h1>Library</h1>{addButton}</header>
        {!nothing && search}
        {!nothing && !searching && <nav className="ld-tabs" aria-label="Library">
          {tabs.map(t => <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => setTab(t.id)} data-tab={t.id}>{t.label}</button>)}
        </nav>}
        {searching ? resultsView : homeBody()}
      </div>
      : <div className="ld-home" data-screen="home">{searching ? resultsView : homeBody()}</div>;
  } else if (searching && !phone) {
    page = <div className="ld-home" data-screen="home">{resultsView}</div>;
  }

  const rail = !phone && <aside className="ld-rail" aria-label="Library">
    <header className="ld-head"><h1>Library</h1>{addButton}</header>
    {!nothing && search}
    {!nothing && <nav className="ld-kinds" aria-label="Kinds">
      {tabs.filter(t => t.id !== 'collections' && (t.id !== 'places' || !wide)).map(t => <button key={t.id} type="button" aria-pressed={screen.kind === 'home' && !searching && activeTab === t.id}
        onClick={() => { setQuery(''); setStack([{ kind: 'home' }]); setTab(t.id); }} data-tab={t.id}><span>{t.label}</span>{t.count ? <i>{t.count}</i> : null}</button>)}
    </nav>}
    {allMonths.length > 1 && <section className="ld-rail-sec" aria-label="Contents"><h3>Contents</h3><ul className="ld-contents is-rail">
      {allMonths.map(month => <li key={month.key}><button type="button" onClick={() => jumpTo(month.key)} data-jump={month.key}><span className="ld-contents-name">{monthName(month)} <span>{month.year}</span></span><i>{thingCount(month) || ''}</i></button></li>)}
    </ul></section>}
    {pieces.length > 0 && <section className="ld-rail-sec" aria-label="Collections"><h3>Collections</h3>
      <ul className="ld-rail-colls">{shelfOf.map(({ collection, pieces: held }) => <li key={collection.id}><button type="button" aria-pressed={screen.kind === 'collection' && screen.id === collection.id}
        onClick={() => { setQuery(''); setStack([{ kind: 'home' }, { kind: 'collection', id: collection.id }]); }} data-collection={collection.id}><span>{collection.name}</span><i>{held.length}</i></button></li>)}</ul>
      <button type="button" className="ld-quiet" onClick={() => setPicker({ id: null })} data-action="ld-collection-new"><Icon name="plus" />New collection</button>
    </section>}
  </aside>;
  const side = !phone && wide && !nothing && index.length > 0 && <aside className="ld-side" aria-label="Places">
    <h3>Places</h3>
    <PlacesIndex index={index} ctx={railCtx} onOpen={nodeId => { setQuery(''); setStack([{ kind: 'home' }, { kind: 'place', id: nodeId }]); }} compact />
    {onMap(journal.field.nodeId)}
  </aside>;

  return <div className="ld" data-lab="library-d">
    <div className="notebook-workspace ld-scroll" ref={scroller} onScroll={onScroll} data-workspace="library-d">
      <div className={`ld-page${phone ? '' : ' is-desk'}`}>
        {notice && <p className="ld-problem" role="status">{notice}<button type="button" className="ld-icon" onClick={() => setNotice('')} aria-label="Dismiss"><Icon name="close" /></button></p>}
        {rail}
        <div className="ld-main">{page}</div>
        {side}
      </div>
    </div>

    {phone && <MonthPill scroller={scroller} watch={`${viewKey}|${expanded.size}|${rows.length}`} hidden={sheetOpen} onOpen={openMonthsSheet} />}

    {/* The add, item and link sheets are the Library tab's own, styled under its .lib scope. */}
    <div className="lib ld-sheets">
      {adding && <AddSheet library={library} initialNodeId={screen.kind === 'place' && catalog.get(screen.id) ? screen.id : null}
        onSaveLink={props.onSaveLink} onAdd={addFound} onChange={props.onLibraryChange}
        onOpenFound={found => { setItemKey(null); setPreview(found); }} onOpenItem={key => { setPreview(null); setItemKey(key); }}
        onImported={() => { setAdding(false); void enricher.start(); }} onClose={() => setAdding(false)} />}
      {sheetItem && <ItemSheet item={sheetItem} library={library} placeState={nodeId => territoryState(journal.status, nodeId)}
        caseOffer={nodeIds => content?.caseOffer(nodeIds, checks)} onChange={props.onLibraryChange}
        onAdd={preview ? status => { const result = addFound(preview, status); if ('error' in result) return result.error; setPreview(null); setItemKey(result.key); return null; } : undefined}
        onTryCase={props.onTryCase} onShowPlace={nodeId => { setAdding(false); openPlace(nodeId); }}
        onEditLink={link => { setItemKey(null); setLinkSheet({ link }); }} onOpenVideo={props.onOpenVideo} onClose={() => { setItemKey(null); setPreview(null); }} />}
      {linkSheet && <LinkSheet link={linkSheet.link} initialNodeId={linkSheet.nodeId ?? null} onSave={props.onSaveLink} onRemove={props.onRemoveLink} onClose={() => setLinkSheet(null)} />}
      {monthsOpen && <MonthsSheet months={allMonths} ctx={ctx} onJump={jumpTo} onClose={() => setMonthsOpen(false)} />}
      {picker && <CollectionSheet collection={picker.id ? live.find(c => c.id === picker.id) ?? null : null} ctx={ctx}
        pieces={[...pieces].sort((a, b) => (b.lastAt || b.at).localeCompare(a.lastAt || a.at))}
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
    </div>
  </div>;
}
