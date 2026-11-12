import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CheckLedger } from '../checks/ledger';
import { catalog } from '../core/catalog';
import type { NotebookEntry } from '../core/notebook';
import { loadContent, loadedContent, type Content } from '../contentLoader';
import type { ExpeditionLedger } from '../expeditions/ledger';
import { audible, getSound, heardBy, playInTap, setSound, unlock, useSound } from '../explore/sound';
import { isPinned, pinPlaces, type ReelShelf } from '../explore/pins';
import { reelPlace } from '../explore/ReelFeed';
import { ReelPlayer } from '../explore/ReelPlayer';
import type { Reel } from '../explore/types';
import type { LinkDraft } from '../notebook/LinkSheet';
import { placeProgress, type FillResult } from '../shelf/fill';
import { loadShelfIndex } from '../shelf/shelfIndex';
import type { ShelfApi } from '../shelf/store';
import { reelItemId, videoItemId, type ShelfIndex } from '../shelf/types';
import { cardQueue, isRootScope, parentScope, scopeReels, scopeState, scopeVideos } from './cards';
import { CheckpointCard, type CheckpointOffer } from './CheckpointCard';
import { emptyImpression, isThrough, judge, type Impression } from './engagement';
import { applyLearning, loadFeedMemory, markBroken, migrateLegacy, recordImpression, saveFeedMemory, startSession, type FeedMemory } from './memory';
import { isWithin } from './places';
import { loadPool, type FeedPool, type FeedVideo } from './pool';
import { PlaceCard } from './PlaceCard';
import { createPlan, extendPlan, planStartingWith, replanAfter, type PlanContext, type PlanState } from './recommend';
import { SaveSheet } from './SaveSheet';
import { askScope, useScope } from './scope';
import { ScopeCard } from './ScopeCard';
import { feedSignals, learningEvents } from './signals';
import { VideoCard, type CardMode } from './VideoCard';
import { VideoPlayer } from './VideoPlayer';
import { frameAspect, libraryUrl, posterUrls, preconnect, videoIdFromUrl, WATCH_OVERLAY } from './youtube';
import './feed.css';

// Explore's Watch feed: an endless vertical pager of short educational videos from the
// allowlist, with MoK's own reels and place cards mixed in, and a checkpoint every eighth card.
// Zoom is the filter: only videos whose primary place lies inside the map's current place
// (`scope`), with that place's cards (PlaceCard, cards.ts) mixed in, about one per two videos, and
// its reels about one per six, or cards and reels alone where the place has no videos (or the videos
// could not load). There are no feedback buttons: the feed reads what the learner does with each card (how
// long it stays on screen, how much of the video plays, a quick skip, a replay, a save, its place
// opened, sound turned off) as one impression (engagement.ts), and once the card is left the
// interest model learns from it (memory.ts, interest.ts) and the cards after the one on screen are
// planned again (recommend.ts). Everything it learns stays on this device. Save keeps a video in the
// Library under the places it fits (SaveSheet). Sound is Explore's one preference (explore/sound.ts).
// Watching never colors land: only proof does.

export interface FeedPanelProps {
  /** On screen with nothing over it: the player may play. */
  active: boolean;
  location: string;
  ledger: ExpeditionLedger;
  checks: CheckLedger;
  entries: readonly NotebookEntry[];
  /** The Library's live saved links (a saved video is one, under one or more places). */
  links: readonly { id: string; url: string; nodeId: string | null; places?: readonly string[]; updatedAt: string }[];
  /** The places of the learner's pinned reels: they count toward what Watch recommends. */
  pinnedReelPlaces: readonly string[];
  /** Open at this video (from a hub's Watch row or the Library), even if watched before. */
  request: { videoId: string; nonce: number } | null;
  onPlace: (nodeId: string) => void;
  onProveIt: (nodeId: string) => void;
  /** Keep a video in the Library (or move it): an error message, or null once kept. */
  onSaveVideo: (draft: LinkDraft) => string | null;
  onRemoveLink: (id: string) => void;
  /** Keep the checkpoint's "what stuck" line in the notebook; an error message or null. */
  onKeepLine: (nodeId: string, line: string) => string | null;
  onOpenAtlas: () => void;
  onOpenList: () => void;
  /** The map's current place (App's location.id): only videos, reels and cards pinned inside it. */
  scope?: string;
  /** The learner's shelf store (src/shelf/store.ts useShelf()). */
  itemShelf?: ShelfApi;
  /** Move the scope (and the map) to this place. */
  onScope?: (id: string) => void;
  /** Open a place's own page (its shelf and lessons). */
  onOpenPlace?: (id: string) => void;
  /** How much of each place is filled in (shelf/fill.ts), once the shelf index has loaded. */
  fill?: FillResult;
  /** Every MoK reel (App's reel queue): the ones inside the scope are mixed into the feed. */
  reels?: readonly Reel[];
  /** The learner's reel shelf (pins), for a reel's saved mark. */
  reelShelf?: ReelShelf;
  /** A reel played to its end: done on its place's shelf. */
  onReelFinished?: (reelId: string) => void;
  onSaveReel?: (reelId: string, places: string[]) => void;
  onRemoveReel?: (reelId: string) => void;
}

const NO_REELS: readonly Reel[] = [];
const FAILED_POOL: FeedPool = { version: 1, builtAt: '', channels: {}, videos: [] };

const AHEAD = 6;

/** What the learner is doing with the card on screen: its live time on screen so far (`since` is
 * when the current live stretch began), and the rest of the impression. `continued`: picked up again
 * after the page was hidden, its first part already kept, so only a new act (an end, a save, a
 * replay, its place opened) counts. */
interface OnScreen { index: number; videoId: string | null; since: number | null; total: number; imp: Impression; continued: boolean }

export function FeedPanel(props: FeedPanelProps) {
  const { active, request, itemShelf } = props;
  const mapScope = isRootScope(props.scope, catalog.root.id) ? catalog.root.id : props.scope!;
  const scope = useScope(mapScope);
  const onScope = useMemo(() => props.onScope && ((id: string) => { askScope(id, mapScope); props.onScope!(id); }), [props.onScope, mapScope]);
  const [pool, setPool] = useState<FeedPool | null>(null);
  const [shelfIndex, setShelfIndex] = useState<ShelfIndex | null>(null);
  const [content, setContent] = useState<Content | null>(loadedContent);
  const [failed, setFailed] = useState(false);
  // A new session: time away since the model last learned is forgetting.
  const [memory, setMemory] = useState<FeedMemory>(() => startSession(loadFeedMemory()));
  const memoryRef = useRef(memory);
  const [plan, setPlan] = useState<PlanState>(createPlan);
  const planRef = useRef(plan);
  planRef.current = plan;
  const [visible, setVisible] = useState(0);
  const visibleRef = useRef(0);
  visibleRef.current = visible;
  const [warm, setWarm] = useState(0);
  const [touched, setTouched] = useState<string[]>([]);
  const sound = useSound();
  const [awake, setAwake] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const [seed] = useState(() => Date.now().toString(36));
  const pager = useRef<HTMLDivElement>(null);
  const placeLayerRef = useRef<(index: number) => void>(() => {});
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    preconnect();
    let live = true;
    // Videos that could not load leave the feed to its cards and reels: an empty pool, and a notice only when there are none.
    void loadPool().then(next => { if (live) setPool(next); }, () => { if (live) { setPool(FAILED_POOL); setFailed(true); } });
    void loadShelfIndex().then(next => { if (live) setShelfIndex(next); });
    if (!loadedContent()) void loadContent().then(next => { if (live) setContent(next); }, () => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const sync = () => setAwake(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const remember = useCallback((change: (memory: FeedMemory) => FeedMemory) => {
    const next = change(memoryRef.current);
    if (next === memoryRef.current) return;
    memoryRef.current = next;
    setMemory(next);
    saveFeedMemory(next);
  }, []);

  const channelOk = useMemo(() => pool ? new Set(Object.keys(pool.channels)) : new Set<string>(), [pool]);
  const allVideos = useMemo(() => pool?.videos.filter(video => channelOk.has(video.channel)) ?? [], [pool, channelOk]);
  // Zoom is the filter: only videos whose primary place is inside the scope.
  const videos = useMemo(() => scopeVideos(allVideos, scope, catalog.root.id), [allVideos, scope]);
  const done = itemShelf?.done;
  const cards = useMemo(() => shelfIndex ? cardQueue({ core: shelfIndex.core, scope, done: done ?? new Set(), seed, root: catalog.root.id }) : [], [shelfIndex, scope, done, seed]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  // The reels inside the scope, the ones not yet done first.
  const allReels = props.reels ?? NO_REELS;
  const reels = useMemo(() => {
    const inside = scopeReels(allReels, scope, catalog.root.id);
    const finished = (reel: Reel) => !!done?.has(reelItemId(reel.id));
    return [...inside.filter(reel => !finished(reel)), ...inside.filter(finished)];
  }, [allReels, scope, done]);
  const reelsRef = useRef(reels);
  reelsRef.current = reels;
  const progress = props.fill ? placeProgress(props.fill, scope) : null;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const savedPlaces = useMemo(() => props.links.flatMap(link => [...(link.nodeId ? [link.nodeId] : []), ...(link.places ?? [])]), [props.links]);
  const signals = useMemo(() => feedSignals({
    location: props.location, ledger: props.ledger, checks: props.checks, entries: props.entries, savedPlaces, pinnedReelPlaces: props.pinnedReelPlaces,
  }), [props.location, props.ledger, props.checks, props.entries, savedPlaces, props.pinnedReelPlaces]);
  // The learner's own places, most telling first: what the Save sheet suggests beside a video's own.
  const mine = useMemo(() => [...new Set([signals.focus, ...signals.recent, ...signals.pinned, ...signals.lit].filter((id): id is string => !!id))], [signals]);
  const contextRef = useRef<PlanContext | null>(null);
  contextRef.current = pool ? { pool: videos, signals, memory, seed, cards, reels } : null;

  // Planned against the memory as it is this moment (an impression just kept is in it before the next render).
  const grow = useCallback((state: PlanState, count = AHEAD) => contextRef.current ? extendPlan({ ...contextRef.current, memory: memoryRef.current }, state, count) : state, []);

  // Version 1's record joins the model once the pool is here to read it by.
  useEffect(() => {
    if (!pool || !memoryRef.current.legacy) return;
    const byId = new Map(allVideos.map(video => [video.id, video]));
    remember(current => migrateLegacy(current, byId));
  }, [pool, allVideos, remember]);
  // Learning actions (an expedition or case started or proved, a check) are evidence about their places.
  useEffect(() => { remember(current => applyLearning(current, learningEvents(props.ledger, props.checks))); }, [props.ledger, props.checks, remember]);

  // The first cards, once the pool is here (and again for a video asked for by name, which starts
  // the feed at that video). The pager may be out of sight when the request comes (a hub's Watch row,
  // the Library): a hidden pager takes no scroll, so going back to the top waits until it is shown.
  const started = useRef(false);
  const handled = useRef<number | null>(null);
  const toTop = useRef(false);
  /** The furthest card reached: cards up to it are kept when the plan is made again. */
  const furthest = useRef(0);
  // A new scope (the map moved, or the header widened it) starts the feed again from the top.
  const plannedScope = useRef<string | null>(null);
  // The videos arriving on a retry after they failed start it again too.
  const plannedPool = useRef<FeedPool | null>(null);
  const plannedFor = useRef(signals.focus);
  useEffect(() => {
    if (!pool || !shelfIndex) return;
    const asked = request && handled.current !== request.nonce ? allVideos.find(video => video.id === request.videoId) : undefined;
    if (request) handled.current = request.nonce;
    const rescoped = started.current && (plannedScope.current !== scope || plannedPool.current !== pool);
    if (!asked && started.current && !rescoped) return;
    plannedScope.current = scope;
    plannedPool.current = pool;
    plannedFor.current = signals.focus;
    if (started.current) {
      flushRef.current();
      setVisible(0); setWarm(0);
      furthest.current = 0;
      toTop.current = true;
      if (pager.current) pager.current.scrollTop = 0;
    }
    started.current = true;
    if (asked) { setPlan(grow(planStartingWith(asked))); return; }
    // Every card and reel here seen already: said first (explored in full, or where the rest is), then they come round again.
    const complete = scopeState(cardsRef.current, propsRef.current.itemShelf?.done ?? new Set(), videos.length, reelsRef.current.map(reel => reel.id)) === 'complete';
    setPlan(grow(complete ? { items: [{ kind: 'scope', key: 'scope-complete' }], asked: null } : createPlan()));
  }, [pool, shelfIndex, request, allVideos, videos, scope, grow, signals.focus]);
  useLayoutEffect(() => {
    const el = pager.current;
    if (!toTop.current || !el || !el.clientHeight) return;
    toTop.current = false;
    el.scrollTop = 0;
    setVisible(0);
  });

  // Keep a few cards ahead of the one on screen.
  useEffect(() => {
    if (!pool || !started.current) return;
    if (plan.items.at(-1)?.kind === 'end' || visible < plan.items.length - 3) return;
    setPlan(current => grow(current));
  }, [visible, plan.items, pool, grow]);

  // The place in view changed while the feed was away: plan the cards after the next one again.
  useEffect(() => {
    if (!active || plannedFor.current === signals.focus) return;
    plannedFor.current = signals.focus;
    setPlan(current => grow(replanAfter(current, Math.max(visibleRef.current + 1, furthest.current))));
  }, [active, signals.focus, grow]);

  // Neighbours warm a moment after a swipe settles, so loading the next card never lands mid-scroll.
  useEffect(() => {
    const id = window.setTimeout(() => startTransition(() => setWarm(visible)), 320);
    return () => window.clearTimeout(id);
  }, [visible]);

  // Which card is on screen: the one at least 60% visible. Watched again whenever the cards change,
  // not only their count: a replan (after each card left) swaps the cards after this one for as many
  // new ones, and a card nobody observes would never become the one on screen.
  const pageKeys = plan.items.map(item => item.key).join('|');
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= 0.6) { const page = Number((entry.target as HTMLElement).dataset.page); startTransition(() => setVisible(page)); }
    }, { root: el, threshold: [0.6] });
    el.querySelectorAll('[data-page]').forEach(page => observer.observe(page));
    return () => observer.disconnect();
  }, [pageKeys]);

  // A card stays put when the window changes size.
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const observer = new ResizeObserver(() => { el.scrollTop = visibleRef.current * el.clientHeight; placeLayerRef.current(visibleRef.current); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToPage = useCallback((page: number, smooth = true) => {
    const el = pager.current;
    if (!el) return;
    const target = Math.max(0, Math.min(planRef.current.items.length - 1, page));
    el.scrollTo({ top: target * el.clientHeight, behavior: smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }, []);

  // What the learner does with the card on screen, kept as one impression and learned from once the
  // card is left (after the swipe has come to rest, so no bookkeeping lands mid-scroll). Time counts
  // only while the feed is live. A card judged (more than a glance) joins this session's places, and
  // the cards after the furthest one reached are planned again with what the model just learned.
  const onScreen = useRef<OnScreen | null>(null);
  const live = active && awake;
  const liveRef = useRef(live);
  liveRef.current = live;
  const startOnScreen = (index: number, isLive: boolean, continued = false): OnScreen => {
    const item = planRef.current.items[index];
    const video = item?.kind === 'video' ? item.video : null;
    return { index, videoId: video?.id ?? null, since: isLive ? Date.now() : null, total: 0, imp: emptyImpression(video?.short ?? true), continued };
  };
  const finish = useCallback((record: OnScreen, replan = true) => {
    const item = planRef.current.items[record.index];
    const total = record.total + (record.since === null ? 0 : Date.now() - record.since);
    if (item?.kind !== 'video' || item.video.id !== record.videoId) return;
    const imp = { ...record.imp, dwellMs: total };
    if (record.continued && !(imp.ended || imp.saved || imp.openedPlace || imp.replays)) return;
    if (judge(imp).kind === 'glance') return;
    const place = item.video.places[0];
    setTouched(list => [place, ...list.filter(id => id !== place)].slice(0, 24));
    remember(memory => recordImpression(memory, item.video, imp));
    // Watched through: the video is done on the shelf of its place (it never changes fill).
    if (isThrough(imp)) propsRef.current.itemShelf?.markDone(videoItemId(item.video.id));
    if (!replan) return;
    // Mid-swipe, the card coming into view stays as it is too.
    const el = pager.current;
    const settled = !el || !el.clientHeight || Math.abs(el.scrollTop - visibleRef.current * el.clientHeight) < 2;
    const keep = Math.max(visibleRef.current + (settled ? 0 : 1), furthest.current);
    setPlan(current => current.items.at(-1)?.kind === 'end' && current.items.length <= keep + 1 ? current : grow(replanAfter(current, keep)));
  }, [remember, grow]);
  /** Keep the card on screen's impression now (the plan is about to change under it). */
  const flushRef = useRef(() => {});
  flushRef.current = () => { const record = onScreen.current; if (record) finish(record, false); onScreen.current = null; };
  // The card on screen: a new index, or a new card at the same index (the first cards arriving, a
  // video asked for by name), starts a new impression; the one left is learned from.
  const visibleItem = plan.items[visible];
  const visibleId = visibleItem?.kind === 'video' ? visibleItem.video.id : visibleItem?.key ?? null;
  useEffect(() => {
    const previous = onScreen.current;
    const item = planRef.current.items[visible];
    const id = item?.kind === 'video' ? item.video.id : null;
    const moved = !previous || previous.index !== visible || previous.videoId !== id;
    if (previous && moved && previous.videoId) {
      const left = { ...previous, total: previous.total + (previous.since === null ? 0 : Date.now() - previous.since), since: null };
      window.setTimeout(() => finish(left), 700);
    }
    furthest.current = Math.max(furthest.current, visible);
    if (moved) onScreen.current = startOnScreen(visible, live);
    else if (live && previous.since === null) onScreen.current = { ...previous, since: Date.now() };
    else if (!live && previous.since !== null) onScreen.current = { ...previous, since: null, total: previous.total + Date.now() - previous.since };
  }, [visible, visibleId, live, finish]);
  // The page hidden (the app sent to the background, maybe never to return): what the card on screen
  // has shown so far is kept now, and anything after picks up from there.
  useEffect(() => {
    if (awake) return;
    const record = onScreen.current;
    if (!record) return;
    finish(record, false);
    onScreen.current = startOnScreen(record.index, false, true);
  }, [awake, finish]);
  /** The impression of the card on screen, when it is this video. */
  const impressionOf = (videoId: string) => onScreen.current?.videoId === videoId ? onScreen.current.imp : null;

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'j') { event.preventDefault(); scrollToPage(visibleRef.current + 1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k') { event.preventDefault(); scrollToPage(visibleRef.current - 1); }
      // Space is the tap's key. When this key's own unlock made the video heard (sound.ts), it has done its work.
      if (WATCH_OVERLAY && event.key === ' ' && planRef.current.items[visibleRef.current]?.kind === 'video') { event.preventDefault(); if (!heardBy(event)) tapVideoRef.current(event.isTrusted); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, scrollToPage]);

  // --- What a card can ask for --------------------------------------------------------------------
  // A move on that comes due while Watch is out of sight (a Short that ended as the learner left) is
  // owed until Watch is back: an out-of-sight pager cannot scroll.
  const [owed, setOwed] = useState<number | null>(null);
  const advanceFrom = useCallback((index: number, delay: number) => {
    window.setTimeout(() => {
      if (visibleRef.current !== index) return;
      if (liveRef.current) scrollToPage(index + 1);
      else setOwed(index);
    }, delay);
  }, [scrollToPage]);
  // The place chip: a yes about its place, then the atlas flies there.
  const openPlace = useCallback((video: FeedVideo) => {
    const imp = impressionOf(video.id);
    if (imp) imp.openedPlace = true;
    propsRef.current.onPlace(video.places[0]);
  }, []);
  // Save: the sheet of places it fits; kept in the Library as a link under the chosen places, with
  // its own thumbnail, title and channel, so the Library and the hubs can show it.
  const savedLink = useCallback((videoId: string) => propsRef.current.links.find(link => videoIdFromUrl(link.url) === videoId), []);
  const [saving, setSaving] = useState<FeedVideo | null>(null);
  const openSave = useCallback((video: FeedVideo) => setSaving(video), []);
  const closeSave = useCallback(() => setSaving(null), []);
  const saveTo = (video: FeedVideo, places: string[]): string | null => {
    const existing = savedLink(video.id);
    const channel = pool?.channels[video.channel]?.name ?? '';
    const problem = propsRef.current.onSaveVideo({
      id: existing?.id, url: libraryUrl(video.id), note: video.title.slice(0, 200), nodeId: places[0], places: places.slice(1),
      preview: { title: video.title.slice(0, 300), description: video.learn.slice(0, 500), siteName: (channel || 'YouTube').slice(0, 100), image: posterUrls(video, 'card')[0], at: new Date().toISOString() },
    });
    if (problem) return problem;
    const imp = impressionOf(video.id);
    if (imp) imp.saved = true;
    setSaving(null);
    return null;
  };
  // Taken out again while it is still the card on screen: that save says nothing after all.
  const unsave = (video: FeedVideo) => {
    const existing = savedLink(video.id);
    if (existing) propsRef.current.onRemoveLink(existing.id);
    const imp = impressionOf(video.id);
    if (imp) imp.saved = false;
    setSaving(null);
  };
  // Off, or refused by the browser ("Tap for sound"): on. On and heard: off. Inside the tap. Turned
  // off while a video plays: a little less of a yes for it.
  const toggleSound = useCallback(() => {
    const next = !audible(getSound());
    if (!next) { const record = onScreen.current; if (record?.videoId) record.imp.muted = true; }
    setSound(next);
  }, []);

  // --- The one player ---------------------------------------------------------------------------
  // It lives inside the pager, so it scrolls away with its card like the card itself; once a swipe
  // settles on a video it moves (hidden) to that card's frame and is handed the new video.
  const resume = useRef(new Map<string, number>());
  const [layer, setLayer] = useState<{ index: number; video: FeedVideo; top: number; left: number; width: number; height: number } | null>(null);
  const placeLayer = useCallback((index: number) => {
    const el = pager.current;
    const item = planRef.current.items[index];
    const box = el?.querySelector<HTMLElement>(`.feed-page[data-page="${index}"] .feed-frame`);
    if (!el || !box || item?.kind !== 'video') return;
    const outer = el.getBoundingClientRect(), r = box.getBoundingClientRect();
    // Whole pixels, a hair over the frame, so no sliver of the poster shows at an edge.
    const top = Math.floor(r.top - outer.top + el.scrollTop), left = Math.floor(r.left - outer.left);
    setLayer({ index, video: item.video, top, left, width: Math.ceil(r.right - outer.left) - left, height: Math.ceil(r.bottom - outer.top + el.scrollTop) - top });
  }, []);
  placeLayerRef.current = placeLayer;
  // A Short whose poster showed it is not 9:16 (square, 4:3) is sized and laid out by that shape, so
  // it is never letterboxed: under 1 it covers the screen, otherwise it sits full width like a wide video.
  const [aspects, setAspects] = useState<Readonly<Record<string, number>>>({});
  const aspectOf = (video: FeedVideo) => frameAspect(aspects[video.id] ?? video.aspect);
  const onAspect = useCallback((videoId: string, aspect: number) => setAspects(current => current[videoId] === aspect ? current : { ...current, [videoId]: aspect }), []);
  // Out of sight (another tab, the atlas, the Library, a hidden page) the player stays, paused and
  // hidden: a new one would need the browser's leave to play with sound all over again (iOS Safari
  // asks for a fresh tap per player), and starting one costs a phone far more than resuming it.
  // Only a player that never got going (YouTube unreachable as Watch opened) is replaced: by one
  // fresh player, built when the old one says it is stuck while it should be playing.
  const [build, setBuild] = useState({ id: 0, failed: 0 });
  const onPlayerStuck = useCallback(() => setBuild(current => ({ id: current.id + 1, failed: current.failed + 1 })), []);
  useEffect(() => {
    if (!live || planRef.current.items[visible]?.kind !== 'video') return;
    const id = window.setTimeout(() => placeLayer(visible), 220);
    return () => window.clearTimeout(id);
  }, [visible, live, plan.items, placeLayer, aspects]);
  const layerAspect = layer ? aspectOf(layer.video) : 1;
  const onVisibleVideo = layer !== null && layer.index === visible && plan.items[visible]?.kind === 'video' && plan.items[visible].key === `video-${layer.video.id}`;
  // Watch is back with a move on owed: make it (once the pager has its size and place back), and
  // keep the ended video still meanwhile. If the pager cannot move, the card simply plays again.
  useEffect(() => {
    if (owed === null) return;
    if (visible !== owed) { setOwed(null); return; }
    if (!live) return;
    const move = window.setTimeout(() => scrollToPage(owed + 1), 120);
    const giveUp = window.setTimeout(() => setOwed(current => current === owed && visibleRef.current === owed ? null : current), 2000);
    return () => { window.clearTimeout(move); window.clearTimeout(giveUp); };
  }, [owed, visible, live, scrollToPage]);
  const videoAt = useCallback((videoId: string) => planRef.current.items.findIndex(item => item.kind === 'video' && item.video.id === videoId), []);
  // Under the overlay, a long video played to its end on screen waits behind its poster with Reels'
  // play mark (the player hides YouTube's own end screen), and one tap plays it from the top. A swipe
  // away, or leaving Watch, lets go of it: met again, it plays from the top by itself.
  const [ended, setEnded] = useState<string | null>(null);
  const endedRef = useRef(ended);
  endedRef.current = ended;
  useEffect(() => { if (!live) setEnded(null); }, [live]);
  const onPlayerEnded = useCallback((videoId: string) => {
    const index = videoAt(videoId);
    const item = planRef.current.items[index];
    resume.current.delete(videoId);
    if (item?.kind !== 'video') return;
    const imp = impressionOf(videoId);
    if (imp) { imp.ended = true; if (imp.durationS > 0) imp.playedS = imp.durationS; }
    if (item.video.short) advanceFrom(index, 700);
    else if (WATCH_OVERLAY && index === visibleRef.current && liveRef.current) setEnded(videoId);
  }, [videoAt, advanceFrom]);
  const onPlayerProgress = useCallback((videoId: string, seconds: number, duration: number) => {
    resume.current.set(videoId, seconds);
    const imp = impressionOf(videoId);
    if (!imp) return;
    imp.playedS = Math.max(imp.playedS, seconds);
    if (duration > 0) imp.durationS = duration;
    if (audible(getSound())) imp.heard = true;
  }, []);
  const onPlayerError = useCallback((videoId: string) => {
    remember(memory => markBroken(memory, videoId));
    advanceFrom(videoAt(videoId), 1200);
  }, [remember, advanceFrom, videoAt]);
  /** The last video the player said was playing: one not started yet still shows its poster. */
  const playedRef = useRef<string | null>(null);
  const onPlaying = useCallback((videoId: string) => { playedRef.current = videoId; }, []);

  // A tap on the video (or Space) pauses it and the next one plays it, for the video on screen only:
  // a swipe away lets go, so a video met again plays. Sound comes first, by sound.ts's rules:
  //   - while the browser is refusing sound ("Tap for sound") the tap brings it back, remembered;
  //   - the first tap in the app is also the unlock, and when that is what made the playing video
  //     heard (it was muted), that is all the tap does: a learner who could not hear it yet is not
  //     left with a paused video. Already heard, the first tap pauses like any other.
  // A tap on a video that has ended plays it from the top. A tap on one that has not started yet (its
  // poster still up) is not a pause: it is the unlock, and a play said inside the tap.
  // The tap layer is a sound control (data-sound-control) so the app-wide unlock leaves its taps to
  // it, and a held video stays held: nothing that brings sound back plays it (sound.ts wantsPlay).
  const [held, setHeld] = useState<string | null>(null);
  const heldRef = useRef(held);
  heldRef.current = held;
  useEffect(() => { setHeld(null); setEnded(null); }, [visible]);
  const toggleHold = useCallback(() => {
    const item = planRef.current.items[visibleRef.current];
    if (item?.kind === 'video') setHeld(current => current === item.video.id ? null : item.video.id);
  }, []);
  const asking = sound.on && sound.blocked;
  /** `trusted`: a real tap or key, which may unlock sound (a script's click may not). */
  const tapVideo = useCallback((trusted: boolean) => {
    const now = getSound();
    if (now.on && now.blocked) { toggleSound(); return; }
    const item = planRef.current.items[visibleRef.current];
    if (item?.kind !== 'video') return;
    const id = item.video.id;
    // Played again from the top: a strong yes.
    if (endedRef.current === id) { if (trusted) unlock(); const imp = impressionOf(id); if (imp) imp.replays++; setEnded(null); return; }
    if (playedRef.current !== id && heldRef.current !== id) { if (trusted) playInTap(); return; }
    if (trusted && unlock()) return;
    toggleHold();
  }, [toggleSound, toggleHold]);
  const tapVideoRef = useRef(tapVideo);
  tapVideoRef.current = tapVideo;

  // The checkpoint's one offer: a new case at (or inside, or above) a place this session touched.
  const caseable = useMemo(() => content ? catalog.all().filter(node => content.hasCases(node.id) || !!content.bankFor(node.id) || !!content.expeditionAt(node.id)).map(node => node.id) : [], [content]);
  const offer = useMemo((): CheckpointOffer | null => {
    for (const place of touched) {
      const hit = caseable.find(id => id === place) ?? caseable.find(id => isWithin(id, place)) ?? caseable.find(id => isWithin(place, id));
      if (hit) return { kind: 'case', nodeId: hit };
    }
    return touched[0] ? { kind: 'stuck', nodeId: touched[0] } : null;
  }, [touched, caseable]);

  const modeOf = (index: number): CardMode => index === visible ? 'active' : Math.abs(index - warm) <= 2 ? 'near' : 'far';

  // A reel in the feed: its player, saved mark and Save sheet, as on the Reels tab.
  const reelPlaces = useMemo(() => new Map(reels.map(reel => [reel.id, reelPlace(reel.nodeId)])), [reels]);
  const [savingReel, setSavingReel] = useState<Reel | null>(null);
  const openSaveReel = useCallback((reelId: string) => setSavingReel(reelsRef.current.find(reel => reel.id === reelId) ?? null), []);
  const finishReel = useCallback((reelId: string) => propsRef.current.onReelFinished?.(reelId), []);
  const savingReelPin = savingReel ? props.reelShelf?.pinned.find(pin => pin.id === savingReel.id) : undefined;

  // Nothing to show at all in this scope: charted only by its lessons, or not charted.
  const nothing = !cards.length && !videos.length && !reels.length;
  if (failed && shelfIndex && nothing) return <div className="feed feed--empty" data-feed="failed"><p>The videos could not load.</p><button type="button" className="reel-again" onClick={() => { setFailed(false); void loadPool().then(setPool, () => setFailed(true)); }}>Try again</button></div>;
  const endKind = (index: number) => index > 0 || !nothing ? 'end' : progress?.charted ? 'lessons' : 'empty';

  return <div className={`feed${WATCH_OVERLAY ? ' is-overlay' : ''}`} data-feed={pool && shelfIndex ? 'ready' : 'loading'} data-scope={scope} data-visible={visible} data-count={plan.items.length} data-sound={audible(sound) ? 'on' : sound.on ? 'asking' : 'off'}>
    <div className="feed-pager" ref={pager} tabIndex={-1} aria-label="Watch" style={layer ? { '--player-aspect': String(layerAspect) } as CSSProperties : undefined}>
      {plan.items.map((item, index) => {
        const far = Math.abs(index - visible) > 3;
        return <section key={item.key} className={`feed-page feed-page--${item.kind}`} data-page={index} data-kind={item.kind} data-lane={item.kind === 'video' ? item.lane : undefined}>
          {far ? null
            : item.kind === 'video' ? <VideoCard video={item.video} aspect={aspectOf(item.video)} onAspect={onAspect} channel={pool?.channels[item.video.channel]?.name ?? ''} mode={modeOf(index)}
              sound={sound.on} soundBlocked={sound.on && sound.blocked} saved={!!savedLink(item.video.id)}
              onPlace={openPlace} onSave={openSave} onSound={toggleSound} />
            : item.kind === 'checkpoint' ? <CheckpointCard places={touched} offer={offer} onPlace={props.onPlace} onCase={props.onProveIt} onKeep={props.onKeepLine} onContinue={() => scrollToPage(index + 1)} />
            : item.kind === 'card' ? <PlaceCard placeId={item.placeId} near={Math.abs(index - warm) <= 2 || index === visible} onScreen={live && index === visible} shelf={itemShelf} />
            : item.kind === 'reel' ? <ReelPlayer reel={item.reel} mode={index === visible && live ? 'active' : Math.abs(index - warm) <= 1 || index === visible ? 'near' : 'far'}
              saved={!!props.reelShelf && isPinned(props.reelShelf, item.reel.id)} place={reelPlaces.get(item.reel.id) ?? reelPlace(item.reel.nodeId)}
              onSave={openSaveReel} onTag={props.onPlace} onProveIt={props.onProveIt} onFinished={finishReel} />
            : item.kind === 'scope' || item.kind === 'end' ? <ScopeCard kind={item.kind === 'scope' ? (progress && progress.fill >= 1 ? 'complete' : 'seen') : endKind(index)}
              scope={scope} parent={parentScope(scope, catalog.root.id)} onScope={onScope} onOpenAtlas={props.onOpenAtlas} onOpenList={props.onOpenList} onOpenPlace={props.onOpenPlace} onContinue={() => scrollToPage(index + 1)} />
            : null}
        </section>;
      })}
      {layer && <div className={`feed-player-layer ${layerAspect < 1 ? 'is-tall' : 'is-wide'}`} data-for={layer.index} data-video-id={layer.video.id}
        style={{ top: layer.top, left: layer.left, width: layer.width, height: layer.height, visibility: onVisibleVideo && live ? 'inherit' : 'hidden' }}>
        <VideoPlayer key={build.id} attempt={build.failed} videoId={layer.video.id} title={layer.video.title} start={resume.current.get(layer.video.id) ?? 0}
          playing={live && onVisibleVideo && owed !== visible && held !== layer.video.id && ended !== layer.video.id}
          onPlaying={onPlaying} onEnded={onPlayerEnded} onProgress={onPlayerProgress} onError={onPlayerError} onStuck={onPlayerStuck} />
        {WATCH_OVERLAY && <button type="button" className="feed-tap" onClick={event => tapVideo(event.nativeEvent.isTrusted)}
          aria-label={asking ? 'Tap for sound' : ended === layer.video.id ? 'Replay' : held === layer.video.id ? 'Play' : 'Pause'}
          data-action="feed-pause" data-sound-control="" />}
        {WATCH_OVERLAY && (held === layer.video.id || ended === layer.video.id) && <span className="reel-paused" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" /></svg>
        </span>}
      </div>}
    </div>
    {saving && <SaveSheet key={saving.id} tagged={saving.places} text={`${saving.title} ${saving.learn}`} mine={mine}
      saved={(() => { const link = savedLink(saving.id); return link ? [...(link.nodeId ? [link.nodeId] : []), ...(link.places ?? [])] : null; })()}
      onSave={places => saveTo(saving, places)} onRemove={() => unsave(saving)} onClose={closeSave} />}
    {savingReel && <SaveSheet key={`reel-${savingReel.id}`} tagged={[savingReel.nodeId]} text={`${savingReel.title} ${savingReel.takeaway}`} mine={mine}
      saved={savingReelPin ? pinPlaces(savingReelPin, savingReel.nodeId) : null}
      onSave={places => { propsRef.current.onSaveReel?.(savingReel.id, places); setSavingReel(null); return null; }}
      onRemove={() => { propsRef.current.onRemoveReel?.(savingReel.id); setSavingReel(null); }} onClose={() => setSavingReel(null)} />}
    <div className="reel-steps" aria-label="Move between cards">
      <button type="button" onClick={() => scrollToPage(visible - 1)} disabled={visible === 0} aria-label="Previous" data-action="feed-previous">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
      </button>
      <button type="button" onClick={() => scrollToPage(visible + 1)} disabled={visible >= plan.items.length - 1} aria-label="Next" data-action="feed-next">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
  </div>;
}
