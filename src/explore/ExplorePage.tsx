import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DeepSpaceBackdrop } from '../components/DeepSpace';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { isRootScope, scopeReels } from '../feed/cards';
import { askScope, useScope } from '../feed/scope';
import type { ReelShelf } from './pins';
import { ReelFeed } from './ReelFeed';
import type { Reel } from './types';
import './explore.css';

// Watch (the video feed, src/feed) is the third tab: mounted here through the `feed` slot below.
export type ExploreTab = 'feed' | 'reels' | 'list';

export interface ExplorePageProps {
  /** Kept mounted but out of sight while another tab is showing. */
  hidden: boolean;
  tab: ExploreTab;
  onTab: (tab: ExploreTab) => void;
  /** Every premade reel: today's set, then the evergreen deck, then earlier decks' (explore/today.ts reelQueue). */
  reels: readonly Reel[];
  reelIndex: number;
  onReelIndex: (index: number) => void;
  /** False while another screen (an expedition, a dialog) covers Explore. */
  active: boolean;
  shelf: ReelShelf;
  /** A reel opened by name: it plays from its start. */
  opened: { id: string; nonce: number } | null;
  /** The learner's places, most telling first, for the Save sheet's suggestions. */
  mine: readonly string[];
  onSavePin: (reelId: string, places: string[]) => void;
  onRemovePin: (reelId: string) => void;
  onFinished: (reelId: string) => void;
  onTag: (nodeId: string) => void;
  onProveIt: (nodeId: string) => void;
  onOpenAtlas: () => void;
  /** The full list of expeditions and discoveries (today's Discoveries page). */
  list: ReactNode;
  /** The Watch feed (src/feed/FeedPanel): YouTube only. Stays mounted, hidden, while another tab shows. */
  feed?: ReactNode;
  /** The map's current place (App's location.id): the feed shows only what is pinned inside it. */
  scope?: string;
  /** Move the scope (and the map) to this place, e.g. one level up or back to the whole map. */
  onScope?: (id: string) => void;
}

/** Explore: the Watch feed (YouTube), MoK's own premade reels, or every expedition in one list,
 * switched at the top. Sound is one preference across the first two (sound.ts). */
export function ExplorePage({ hidden, tab, onTab, reels, reelIndex, onReelIndex, active, shelf, opened, mine, onSavePin, onRemovePin, onFinished, onTag, onProveIt, onOpenAtlas, list, feed, scope, onScope: setScope }: ExplorePageProps) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const roomy = size.width > 800;
  // Zoom is the filter: the Reels tab plays only reels pinned inside the map's place (and a reel
  // opened by name, wherever it is). The index stays the app's, into every reel: mapped both ways.
  const top = catalog.root.id;
  const mapScope = isRootScope(scope, top) ? top : scope!;
  const here = useScope(mapScope);
  const onScope = useMemo(() => setScope && ((id: string) => { askScope(id, mapScope); setScope(id); }), [setScope, mapScope]);
  const scoped = useMemo(() => {
    const inside = new Set(scopeReels(reels, here, top).map(reel => reel.id));
    return reels.flatMap((reel, at) => inside.has(reel.id) || reel.id === opened?.id ? [{ reel, at }] : []);
  }, [reels, here, top, opened?.id]);
  const scopedReelList = useMemo(() => scoped.map(item => item.reel), [scoped]);
  const localIndex = Math.max(0, scoped.findIndex(item => item.at >= reelIndex)) + (scoped.length && scoped.every(item => item.at < reelIndex) ? scoped.length : 0);
  // The scoped end page stands just after the scope's last reel, so widening carries on from there.
  // No reels in scope: the app's place in its queue stays where it was.
  const onLocalIndex = useCallback((local: number) => {
    if (!scoped.length) return;
    onReelIndex(local < scoped.length ? scoped[local].at : Math.min(reels.length, scoped[scoped.length - 1].at + 1));
  }, [onReelIndex, scoped, reels.length]);
  const node = here === top ? null : catalog.get(here);
  const parent = node?.parentId ?? null;
  const widen = node && onScope ? { label: parent && parent !== top ? `Widen to ${catalog.get(parent)?.name ?? ''}` : 'Whole map', onClick: () => onScope(parent ?? top), whole: () => onScope(top) } : null;
  return <div ref={root} className={`explore-workspace is-${tab}${hidden ? ' is-hidden' : ''}${onScope ? ' has-scope' : ''}`} data-workspace="explore" data-explore-tab={tab} inert={hidden} aria-hidden={hidden || undefined}>
    {tab !== 'list' && roomy && size.height > 0 && <DeepSpaceBackdrop width={size.width} height={size.height} />}
    <div className="explore-switch" role="tablist" aria-label="Explore">
      {feed && <button type="button" role="tab" aria-selected={tab === 'feed'} onClick={() => onTab('feed')} data-action="explore-feed">Watch</button>}
      <button type="button" role="tab" aria-selected={tab === 'reels'} onClick={() => onTab('reels')} data-action="explore-reels">Reels</button>
      <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => onTab('list')} data-action="explore-list">Lessons</button>
    </div>
    {tab !== 'list' && onScope && <nav className={`explore-scope${node ? ' is-scoped' : ''}`} aria-label="What the feed shows" data-explore-scope={here}
      style={node ? { '--place-color': territoryColor(here) } as CSSProperties : undefined}>
      {node && <button type="button" className="explore-scope-up" onClick={() => onScope(parent ?? top)} data-action="scope-up"
        aria-label={parent && parent !== top ? `Up one level, to ${catalog.get(parent)?.name ?? ''}` : 'Up to the whole map'} title={parent && parent !== top ? `Up to ${catalog.get(parent)?.name ?? ''}` : 'Whole map'}>
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg>
      </button>}
      <span className="explore-scope-name">{node && <i aria-hidden="true" />}<span>{node ? node.name : 'Whole map'}</span></span>
      {node && <button type="button" className="explore-scope-all" onClick={() => onScope(top)} data-action="scope-whole-map">Whole map</button>}
    </nav>}
    {feed && <div className="explore-feed" role="tabpanel" aria-label="Watch" hidden={tab !== 'feed'}>{feed}</div>}
    {tab === 'feed' ? null : tab === 'reels'
      ? <div className="explore-reels" role="tabpanel" aria-label="Reels">
        <ReelFeed reels={scopedReelList} index={localIndex} onIndexChange={onLocalIndex} active={active} shelf={shelf} opened={opened} mine={mine}
          onSavePin={onSavePin} onRemovePin={onRemovePin} onFinished={onFinished} onTag={onTag} onProveIt={onProveIt}
          onOpenList={() => onTab('list')} onOpenAtlas={onOpenAtlas} scopeName={node?.name} widen={widen} />
      </div>
      : <div className="explore-list" role="tabpanel" aria-label="Lessons">{list}</div>}
  </div>;
}
