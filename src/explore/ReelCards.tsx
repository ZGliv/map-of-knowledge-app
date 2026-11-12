import type { CSSProperties } from 'react';
import { territoryColor } from '../core/territoryTheme';
import { commonsAtWidth } from './media';
import type { Reel } from './types';

// A compact row of portrait reel cards, for a place's hub and for pinned reels in the notebook.
// Each card opens Explore at that reel.

export interface ReelCardsProps {
  reels: readonly Reel[];
  pinnedIds: readonly string[];
  onOpen: (reelId: string) => void;
  /** Where the row lives, for test hooks: 'hub' or 'notebook'. */
  context: 'hub' | 'notebook';
  /** Reels finished (the shelf's reel:<id> items): marked done on their card. */
  doneIds?: ReadonlySet<string>;
}

function DoneMark() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PinMark() {
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" fill="currentColor" /></svg>;
}

export function ReelCards({ reels, pinnedIds, onOpen, context, doneIds }: ReelCardsProps) {
  return <ul className="reel-cards" data-reel-cards={context}>
    {reels.map(reel => {
      const hero = reel.media[reel.hero];
      const first = reel.frames[0];
      const focus = first.media ? `${first.x}% ${first.y}%` : undefined;
      const pinned = pinnedIds.includes(reel.id);
      const done = !!doneIds?.has(reel.id);
      return <li key={reel.id} style={{ '--reel-color': territoryColor(reel.nodeId) } as CSSProperties}>
        <button type="button" className="reel-card" onClick={() => onOpen(reel.id)} data-action={`${context}-reel`} data-reel-id={reel.id} data-done={done || undefined} aria-label={`Watch ${reel.title}${pinned ? ', pinned' : ''}${done ? ', done' : ''}`}>
          <span className={`reel-card-media${hero.fit === 'contain' ? ' is-contain' : ''}${hero.tone === 'ink' ? ' is-ink' : ''}`} aria-hidden="true">
            <img src={commonsAtWidth(hero.src)} alt="" loading="lazy" decoding="async" style={hero.fit === 'contain' ? undefined : { objectPosition: focus }} />
          </span>
          <span className="reel-card-title">{reel.title}</span>
          {done ? <span className="reel-card-pin reel-card-done" title="Done"><DoneMark /></span> : pinned && <span className="reel-card-pin" title="Pinned"><PinMark /></span>}
        </button>
      </li>;
    })}
  </ul>;
}
