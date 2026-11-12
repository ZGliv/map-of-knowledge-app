import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { SaveSheet } from '../feed/SaveSheet';
import { isPinned, pinPlaces, type ReelShelf } from './pins';
import { expeditionAt, expeditionsWithin } from '../expeditions/registry';
import { proveItRoute } from './proveIt';
import { ReelPlayer, type ReelMode } from './ReelPlayer';
import { narration, pauseScore } from './sound';
import type { Reel } from './types';

// The vertical pager: one reel per screen, CSS scroll-snap, and a quiet end page. The reel on screen
// plays, at once (opened from a hub or the Library, or scrolled to); its neighbours mount and load
// their images so a swipe never waits; the rest are a single lazy still. Save opens the sheet of
// places a reel fits (feed/SaveSheet), kept on the reel shelf (pins.ts). It holds every premade reel (today's set, then the evergreen deck, then
// earlier decks' reels still live: explore/today.ts reelQueue), never repeats, and ends once
// they are all behind you.

export interface ReelFeedProps {
  /** Every premade reel, in order (explore/today.ts reelQueue). */
  reels: readonly Reel[];
  index: number;
  onIndexChange: (index: number) => void;
  /** False when another screen covers the feed: everything pauses. */
  active: boolean;
  shelf: ReelShelf;
  /** A reel opened by name (a hub's reel row, the Library): it plays from its start. */
  opened?: { id: string; nonce: number } | null;
  /** The learner's places, most telling first: what the Save sheet suggests beside a reel's own. */
  mine: readonly string[];
  /** Save a reel under these places (or move it there). */
  onSavePin: (reelId: string, places: string[]) => void;
  onRemovePin: (reelId: string) => void;
  onFinished: (reelId: string) => void;
  onTag: (nodeId: string) => void;
  onProveIt: (nodeId: string) => void;
  onOpenList: () => void;
  onOpenAtlas: () => void;
  /** The map's place the reels are scoped to (none: the whole map). */
  scopeName?: string;
  /** Scoped: the way out at the end, one level up, and to the whole map. */
  widen?: { label: string; onClick: () => void; whole: () => void } | null;
}

/** A reel's place as its player shows it (also used by Watch, where reels are mixed into the feed). */
export const reelPlace = (nodeId: string) => {
  const node = catalog.get(nodeId);
  const path = node ? catalog.getPath(node).slice(1) : [];
  // A place with no case, check or expedition yet: the end card offers its hub instead.
  // The lesson that teaches this place (or the first one inside it), offered first: a reel is the hook,
  // the lesson is where the idea is learned.
  const pack = (expeditionAt(nodeId) ?? expeditionsWithin(nodeId)[0])?.pack;
  const lesson = pack ? { packId: pack.id, title: pack.title, minutes: pack.minutes } : undefined;
  return { name: node?.name ?? '', path: path.slice(0, -1).map(step => step.name).join(' › '), color: territoryColor(nodeId), hub: proveItRoute(nodeId).kind === 'hub', lesson };
};

export function ReelFeed({ reels, index, onIndexChange, active, shelf, opened = null, mine, onSavePin, onRemovePin, onFinished, onTag, onProveIt, onOpenList, onOpenAtlas, scopeName, widen }: ReelFeedProps) {
  const pager = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index);
  // Neighbours mount a moment after a swipe settles, so loading the next reel never lands mid-scroll.
  const [warm, setWarm] = useState(index);
  useEffect(() => {
    const id = window.setTimeout(() => startTransition(() => { setWarm(visible); onIndexChange(visible); }), 320);
    return () => window.clearTimeout(id);
  }, [visible, onIndexChange]);
  const [awake, setAwake] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const places = useMemo(() => new Map(reels.map(reel => [reel.id, reelPlace(reel.nodeId)])), [reels]);
  const pages = reels.length + 1; // the reels, then the end page

  // The narration element is shared and outlives this feed (sound.ts): leaving, it only falls quiet.
  const quiet = useCallback(() => { narration()?.pause(); pauseScore(); }, []);
  useEffect(() => quiet, [quiet]);
  useEffect(() => {
    const sync = () => setAwake(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => { if (!active || !awake) quiet(); }, [active, awake, quiet]);

  const scrollToPage = useCallback((page: number, smooth = true) => {
    const el = pager.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pages - 1, page));
    el.scrollTo({ top: target * el.clientHeight, behavior: smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }, [pages]);

  // Open at the requested reel, and follow requests made from outside (a hub's reel row, which may
  // also put a reel in front of the set: the browser's scroll anchoring would keep the old one in view).
  useLayoutEffect(() => {
    const el = pager.current;
    if (!el) return;
    if (Math.round(el.scrollTop / Math.max(1, el.clientHeight)) !== index) {
      el.scrollTop = index * el.clientHeight;
      setVisible(index);
    }
  }, [index, reels]);

  // The page at least 60% on screen is the one that plays. Watched again whenever the reels change, not
  // only their count: a new scope can swap them for as many others, and a page nobody observes never plays.
  const pageKeys = reels.map(reel => reel.id).join('|');
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
        setVisible(Number((entry.target as HTMLElement).dataset.page));
      }
    }, { root: el, threshold: [0.6] });
    el.querySelectorAll('[data-page]').forEach(page => observer.observe(page));
    return () => observer.disconnect();
  }, [pages, pageKeys]);

  // A page stays put when the window changes size.
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const observer = new ResizeObserver(() => { el.scrollTop = visible * el.clientHeight; });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'j') { event.preventDefault(); scrollToPage(visible + 1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k') { event.preventDefault(); scrollToPage(visible - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, visible, scrollToPage]);

  const [saving, setSaving] = useState<Reel | null>(null);
  const openSave = useCallback((reelId: string) => setSaving(reels.find(reel => reel.id === reelId) ?? null), [reels]);
  const closeSave = useCallback(() => setSaving(null), []);
  const savingPin = saving ? shelf.pinned.find(pin => pin.id === saving.id) : undefined;

  const modeOf = (page: number): ReelMode => {
    if (page === visible && active && awake) return 'active';
    return page === visible || Math.abs(page - warm) <= 1 ? 'near' : 'far';
  };

  return <div className="reel-feed" data-reel-index={visible}>
    <div className="reel-pager" ref={pager} tabIndex={-1} aria-label="Reels">
      {reels.map((reel, page) => <section key={reel.id} className="reel-page" data-page={page} aria-label={`${reel.title}, reel ${page + 1} of ${reels.length}`}>
        <ReelPlayer reel={reel} mode={modeOf(page)} saved={isPinned(shelf, reel.id)} place={places.get(reel.id)!} restart={opened?.id === reel.id ? opened.nonce : 0}
          onSave={openSave} onTag={onTag} onProveIt={onProveIt} onFinished={onFinished} />
      </section>)}
      <section className="reel-page reel-page--end" data-page={reels.length} aria-label="End of the reels">
        <div className="reel-finale">
          <span className="reel-finale-mark" aria-hidden="true"><i /><i /><i /></span>
          <h2>{scopeName ? reels.length ? `That’s every reel in ${scopeName}.` : `No reels in ${scopeName} yet.` : 'That’s every reel for now.'}</h2>
          <div className="reel-finale-actions">
            {widen ? <>
              <button type="button" className="reel-prove" onClick={widen.onClick} data-action="reels-end-widen">{widen.label}</button>
              {widen.label !== 'Whole map' && <button type="button" className="reel-again" onClick={widen.whole} data-action="reels-end-whole-map">Whole map</button>}
            </> : <>
              <button type="button" className="reel-prove" onClick={onOpenAtlas} data-action="reels-end-atlas">Open the atlas</button>
              <button type="button" className="reel-again" onClick={onOpenList} data-action="reels-end-list">Browse lessons</button>
            </>}
          </div>
        </div>
      </section>
    </div>
    {saving && <SaveSheet key={saving.id} tagged={[saving.nodeId]} text={`${saving.title} ${saving.takeaway}`} mine={mine}
      saved={savingPin ? pinPlaces(savingPin, saving.nodeId) : null}
      onSave={places => { onSavePin(saving.id, places); setSaving(null); }} onRemove={() => { onRemovePin(saving.id); setSaving(null); }} onClose={closeSave} />}
    <div className="reel-steps" aria-label="Move between reels">
      <button type="button" onClick={() => scrollToPage(visible - 1)} disabled={visible === 0} aria-label="Previous reel" data-action="reel-previous">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
      </button>
      <button type="button" onClick={() => scrollToPage(visible + 1)} disabled={visible >= pages - 1} aria-label="Next reel" data-action="reel-next">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
  </div>;
}
