import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { AutoPlace } from '../auto/types';
import { ReelCards } from '../explore/ReelCards';
import type { Reel } from '../explore/types';
import { usePlaceVideos, WatchCards } from '../feed/WatchRow';
import { formatPercent, placeProgress, type FillResult } from '../shelf/fill';
import { Reader } from '../shelf/Reader';
import type { ShelfApi } from '../shelf/store';
import { cardId, readId, reelItemId, videoItemId } from '../shelf/types';
import { coreRows, LINK_KIND, linkRows, minutesLabel, percentLabel, splitLinks, splitProgress, type CoreRow, type Tally } from './shelfModel';
import '../shelf/shelf.css';

/** How long a place's page is open before its card counts as read: the same 4 seconds as a card in the feed (feed/PlaceCard CARD_DWELL_MS). */
export const CARD_SECONDS = 4;

export interface PlaceShelfProps {
  placeId: string;
  /** The place's generated page, once loaded (null where it has none). */
  place: AutoPlace | null;
  shelf: ShelfApi;
  fill: FillResult;
  onOpenPack: (place: AutoPlace) => void;
  /** Opens the Watch feed at a video. Without it the shelf has no Watch group. */
  onOpenVideo?: (videoId: string) => void;
  /** Videos the learner saved under this place or inside it, newest first: listed ahead of the rest. */
  savedVideos?: readonly string[];
  /** Reels inside this place (App's reel cards for the hub). */
  reels?: readonly Reel[];
  pinnedReels?: readonly string[];
  onOpenReel?: (reelId: string) => void;
}

const NO_IDS: readonly string[] = [];

function Tick() {
  return <span className="place-shelf-tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}

function Bar({ value, label, thin }: { value: number; label: string; thin?: boolean }) {
  const percent = Math.round(value * 100);
  return <div className={`place-shelf-bar${thin ? ' is-thin' : ''}`} style={{ '--shelf-fill': value } as CSSProperties} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i /></div>;
}

function Group({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return <div className="place-shelf-group" data-shelf-group={id} role="group" aria-labelledby={`place-shelf-${id}`}>
    <header className="place-shelf-group-head"><h3 id={`place-shelf-${id}`}>{title}</h3>{note && <span>{note}</span>}</header>
    {children}
  </div>;
}

const tallyLine = (tally: Tally) => <>{percentLabel(tally.fill)}, <span>{Math.round(tally.done * 10) / 10} of {minutesLabel(tally.core)}</span></>;

/** A place's shelf: how much of it is explored, then everything pinned to it. Core items (card, read,
 * pack) fill the map; videos, reels and links out are extras with a done state of their own. */
export function PlaceShelf({ placeId, place, shelf, fill, onOpenPack, onOpenVideo, savedVideos = NO_IDS, reels = [], pinnedReels = NO_IDS, onOpenReel }: PlaceShelfProps) {
  const [reading, setReading] = useState(false);
  const own = place?.nodeId === placeId ? place : null;
  const rows = useMemo(() => coreRows(own, placeId), [own, placeId]);
  const watch = usePlaceVideos(placeId, savedVideos, !!onOpenVideo);
  // A YouTube link the Watch group shows plays there, not again under Links out; marked done as a link, it is done there too.
  const { links, inWatch } = useMemo(() => splitLinks(linkRows(own, placeId), new Set(onOpenVideo && watch.pool ? watch.videos.map(video => video.id) : [])), [own, placeId, onOpenVideo, watch.pool, watch.videos]);
  const savedSet = useMemo(() => new Set(savedVideos), [savedVideos]);
  const doneVideos = useMemo(() => new Set(watch.videos.filter(video => shelf.isDone(videoItemId(video.id)) || (inWatch.has(video.id) && shelf.isDone(inWatch.get(video.id)!.id))).map(video => video.id)), [watch.videos, inWatch, shelf]);
  const doneReels = useMemo(() => new Set(reels.filter(reel => shelf.isDone(reelItemId(reel.id))).map(reel => reel.id)), [reels, shelf]);
  const reelsDone = doneReels.size;
  const cardDone = shelf.isDone(cardId(placeId));

  // The card is this page (its summary, picture and facts): a few seconds here reads it.
  useEffect(() => {
    if (!own || cardDone) return;
    const timer = setTimeout(() => shelf.markDone(cardId(placeId)), CARD_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [own, cardDone, placeId, shelf.markDone]);
  useEffect(() => setReading(false), [placeId]);

  const progress = placeProgress(fill, placeId);
  const showVideos = !!onOpenVideo && !!watch.pool && watch.videos.length > 0;
  const showReels = !!onOpenReel && reels.length > 0;
  const extras = showVideos || showReels || links.length > 0;
  if (!progress.charted && !own && !extras) return null;

  const root = placeId === fill.root;
  // Latched complete: the percentage stays at 100%, and anything added since is listed to finish if they like.
  const latched = fill.latched.has(placeId);
  const fresh = latched ? rows.filter(row => !shelf.isDone(row.id)) : [];
  // The headline is fill(place): the place and everything inside it, the same number that colours the
  // map. The page's own card, read and pack get a second line when there is more inside.
  const { own: mine, inside } = splitProgress(rows, shelf.isDone, progress);
  const count = rows.length + (showVideos ? watch.total : 0) + (showReels ? reels.length : 0) + links.length;
  const action = (row: CoreRow, done: boolean) => row.kind === 'read' ? { label: done ? 'Read again' : 'Read', run: () => setReading(true) }
    : row.kind === 'pack' && own ? { label: done ? 'Play again' : 'Start', run: () => onOpenPack(own) } : null;
  const titleOf = (row: CoreRow) => `${row.title}, ${Math.round(row.minutes * 10) / 10} min`;
  const metaOf = (row: CoreRow) => row.kind === 'card' ? 'The summary, picture and facts on this page' : row.kind === 'read' ? `The whole story of ${own?.name ?? 'this place'}, from Wikipedia` : 'Interactive, at your own pace';

  return <section className="hub-section place-shelf" aria-labelledby="hub-place-shelf" data-hub-section="place-shelf">
    <header className="hub-section-head"><h2 id="hub-place-shelf">Shelf</h2>{count > 0 && <span>{String(count).padStart(2, '0')}</span>}</header>

    {root ? <div className="place-shelf-fill">
      <p>You've filled {formatPercent(progress.fill)} of the map{progress.core > 0 && <span>, {Math.round(progress.done * 10) / 10} of {minutesLabel(progress.core)}</span>}</p>
      <Bar value={progress.fill} label="Map filled" />
    </div> : latched ? <div className="place-shelf-fill" data-shelf-fill="place" data-shelf-complete="">
      <p>Complete{fresh.length > 0 && <span>. New since you finished: {fresh.map(titleOf).join(' · ')}</span>}</p>
      <Bar value={1} label="Explored" />
    </div> : progress.fill >= 1 ? <div className="place-shelf-fill" data-shelf-fill="place">
      <p>Explored 100%</p>
      <Bar value={1} label="Explored" />
    </div> : progress.core > 0 ? <>
      <div className="place-shelf-fill" data-shelf-fill="place">
        <p>Explored {tallyLine(progress)}</p>
        <Bar value={progress.fill} label="Explored" />
      </div>
      {mine && inside && <div className="place-shelf-fill is-inside" data-shelf-fill="own">
        <p>This page: {tallyLine(mine)}</p>
        <Bar value={mine.fill} label="This page explored" thin />
      </div>}
    </> : progress.charted && <div className="place-shelf-fill"><p><span>Finish a lesson here to fill it in</span></p></div>}

    {rows.length > 0 && <Group id="core" title="In the app" note="Fills the map">
      <ul className="place-shelf-items">{rows.map(row => {
        const done = shelf.isDone(row.id);
        const button = action(row, done);
        return <li key={row.id} className={done ? 'is-done' : undefined} data-shelf-item={row.id}>
          <Tick />
          <span className="place-shelf-title"><strong>{titleOf(row)}</strong><small>{metaOf(row)}</small></span>
          <span className="place-shelf-side">
            {done ? <span className="hub-status is-earned">Done</span> : latched && <span className="hub-status" data-shelf-new="">New</span>}
            {button && <button type="button" className="hub-secondary" onClick={button.run} data-action={`shelf-${row.kind}`}>{button.label}</button>}
          </span>
        </li>;
      })}</ul>
    </Group>}

    {extras && <p className="place-shelf-extras">Extras below are yours to enjoy. They don't change the percentage.</p>}

    {showVideos && watch.pool && <Group id="watch" title="Watch" note={`${doneVideos.size ? `${doneVideos.size} of ${watch.videos.length} done · ` : ''}Extra`}>
      <WatchCards nodeId={placeId} videos={watch.videos} channels={watch.pool.channels} watched={watch.watched} saved={savedSet} done={doneVideos} onOpen={onOpenVideo!} />
    </Group>}

    {showReels && <Group id="reels" title="Reels" note={`${reelsDone ? `${reelsDone} of ${reels.length} done · ` : ''}Extra`}>
      <ReelCards reels={reels} pinnedIds={pinnedReels} doneIds={doneReels} onOpen={onOpenReel!} context="hub" />
    </Group>}

    {links.length > 0 && <Group id="links" title="Links out" note="Extra">
      <ul className="place-shelf-items place-shelf-links">{links.map(({ id, link }) => {
        const done = shelf.isDone(id);
        const meta = [link.by, link.minutes ? `${Math.round(link.minutes)} min` : null, link.license ?? null].filter(Boolean).join(' · ');
        return <li key={id} className={done ? 'is-done' : undefined} data-shelf-item={id}>
          <Tick />
          <span className="place-shelf-title">
            <span className="place-shelf-kind">{LINK_KIND[link.kind] ?? 'Link'}</span>
            <a href={link.url} target="_blank" rel="noopener noreferrer" data-action="shelf-link-open">{link.title}<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="sr-only"> (opens in a new tab)</span></a>
            {meta && <small>{meta}</small>}
            {link.note && <small className="place-shelf-note">{link.note}</small>}
          </span>
          <span className="place-shelf-side">
            <button type="button" className={`hub-secondary place-shelf-done${done ? ' is-done' : ''}`} aria-pressed={done} disabled={done} onClick={() => shelf.markDone(id)} data-action="shelf-link-done" aria-label={done ? `${link.title}: done` : `Mark ${link.title} done`}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>{done ? 'Done' : 'Mark done'}
            </button>
          </span>
        </li>;
      })}</ul>
    </Group>}

    {reading && own?.read && <Reader place={own} onClose={() => setReading(false)} onDone={() => shelf.markDone(readId(placeId))} />}
  </section>;
}
