import { memo, type CSSProperties } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';

// Where a scoped feed runs out: nothing charted in this place yet, charted only by its lessons (no
// cards, reels or videos), every card and reel in it seen, all of it explored (filled in full), or
// everything new seen for now. It offers a wider view: one level up, or the whole map, and the place's
// own page where that is where the rest of it is. At the top of the map there is nothing wider, so it
// offers the atlas and the lessons instead.

export type ScopeCardKind = 'empty' | 'lessons' | 'seen' | 'complete' | 'end';

export interface ScopeCardProps {
  kind: ScopeCardKind;
  scope: string;
  /** The place one level up, or null at the top of the map. */
  parent: string | null;
  onScope?: (id: string) => void;
  onOpenAtlas: () => void;
  onOpenList: () => void;
  /** Open the scope's own page (its shelf and lessons). */
  onOpenPlace?: (id: string) => void;
  /** 'seen' and 'complete': carry on below, where the place's cards come round again. */
  onContinue?: () => void;
}

export const ScopeCard = memo(function ScopeCard({ kind, scope, parent, onScope, onOpenAtlas, onOpenList, onOpenPlace, onContinue }: ScopeCardProps) {
  const root = catalog.root.id;
  const scoped = scope !== root;
  const name = scoped ? catalog.get(scope)?.name ?? '' : 'the map';
  const parentName = parent === root ? 'the whole map' : parent ? catalog.get(parent)?.name ?? '' : '';
  const heading = kind === 'empty' ? `Nothing charted in ${name} yet.`
    : kind === 'lessons' ? `No cards or videos in ${name} yet.`
      : kind === 'seen' ? `You’ve seen every card in ${name}.`
        : kind === 'complete' ? `You’ve explored all of ${name}.`
          : scoped ? `That’s everything in ${name} for now.` : 'That’s everything new for now.';
  const note = kind === 'empty' ? 'Widen the view to find places with something to explore.'
    : kind === 'lessons' ? `Its lessons fill it in. Open ${name} to start one.`
      : kind === 'seen' ? (scoped ? `Its reads and lessons fill in the rest. Open ${name} to find them.` : 'The reads and lessons on each place fill in the rest.')
        : kind === 'complete' ? 'It stays filled in on your map. Widen the view for more, or look again below.' : null;
  const again = (kind === 'complete' || kind === 'seen') && onContinue;
  const open = (kind === 'lessons' || kind === 'seen') && scoped && onOpenPlace;
  return <div className={`feed-end scope-card scope-card--${kind}`} data-scope-card={kind} style={{ '--place-color': scoped ? territoryColor(scope) : 'var(--starlight)' } as CSSProperties}>
    <span className="reel-finale-mark" aria-hidden="true"><i /><i /><i /></span>
    <div className="scope-card-words">
      <h2>{heading}</h2>
      {note && <p>{note}</p>}
    </div>
    <div className="reel-finale-actions">
      {scoped && onScope ? <>
        {open && <button type="button" className="reel-prove" onClick={() => onOpenPlace(scope)} data-action="scope-open-place">Open {name}</button>}
        {parent && parent !== root && <button type="button" className={open ? 'reel-again' : 'reel-prove'} onClick={() => onScope(parent)} data-action="scope-widen">Widen to {parentName}</button>}
        <button type="button" className={(parent && parent !== root) || open ? 'reel-again' : 'reel-prove'} onClick={() => onScope(root)} data-action="scope-whole-map">Whole map</button>
        {again && <button type="button" className="reel-again" onClick={onContinue} data-action="scope-again">Look again</button>}
      </> : <>
        <button type="button" className="reel-prove" onClick={onOpenAtlas} data-action="feed-end-atlas">Open the atlas</button>
        <button type="button" className="reel-again" onClick={onOpenList} data-action="feed-end-list">Browse lessons</button>
        {again && <button type="button" className="reel-again" onClick={onContinue} data-action="scope-again">Look again</button>}
      </>}
    </div>
  </div>;
});
