import { memo, useState, type CSSProperties, type FormEvent } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { SessionMap } from './SessionMap';

// Every eighth card: where this session went, on the map, and one way to turn it into something:
// a new case where one exists, or else an optional line on what stuck. No counts, no streaks.

export type CheckpointOffer = { kind: 'case'; nodeId: string } | { kind: 'stuck'; nodeId: string };

export interface CheckpointCardProps {
  places: readonly string[];
  offer: CheckpointOffer | null;
  onPlace: (nodeId: string) => void;
  onCase: (nodeId: string) => void;
  /** Returns an error message, or null once kept. */
  onKeep: (nodeId: string, line: string) => string | null;
  onContinue: () => void;
}

export const CheckpointCard = memo(function CheckpointCard({ places, offer, onPlace, onCase, onKeep, onContinue }: CheckpointCardProps) {
  const [line, setLine] = useState('');
  const [kept, setKept] = useState<string | null>(null);
  const [error, setError] = useState('');
  const offerPlace = offer ? catalog.get(offer.nodeId) : undefined;
  const keep = (event: FormEvent) => {
    event.preventDefault();
    if (!offer || !line.trim()) return;
    const problem = onKeep(offer.nodeId, line.trim());
    if (problem) setError(problem); else { setKept(line.trim()); setError(''); }
  };
  return <article className="feed-card feed-checkpoint" data-checkpoint={offer?.kind ?? 'none'} aria-label="Where this session went" style={{ '--place-color': offer ? territoryColor(offer.nodeId) : 'var(--starlight)' } as CSSProperties}>
    <div className="feed-checkpoint-map"><SessionMap places={places} /></div>
    {places.length > 0 && <ul className="feed-checkpoint-places" aria-label="Places this session">
      {places.slice(0, 6).map(id => <li key={id} style={{ '--place-color': territoryColor(id) } as CSSProperties}>
        <button type="button" className="feed-chip" onClick={() => onPlace(id)} data-action="checkpoint-place" data-node-id={id}><i aria-hidden="true" /><span>{catalog.get(id)?.name}</span></button>
      </li>)}
    </ul>}
    <div className="feed-offer">
      {offer?.kind === 'case' && <>
        <p className="feed-offer-place">{offerPlace?.name}</p>
        <button type="button" className="reel-prove" onClick={() => onCase(offer.nodeId)} data-action="checkpoint-case" data-node-id={offer.nodeId}>Try a new case</button>
      </>}
      {offer?.kind === 'stuck' && (kept
        ? <p className="feed-kept" data-checkpoint-kept>“{kept}”<small>{offerPlace?.name}</small></p>
        : <form className="feed-stuck" onSubmit={keep}>
          <input value={line} onChange={event => setLine(event.target.value)} maxLength={160} placeholder="What stuck?" aria-label={`What stuck, about ${offerPlace?.name ?? 'this'}`} enterKeyHint="done" data-action="checkpoint-stuck" />
          <button type="submit" disabled={!line.trim()} data-action="checkpoint-keep">Keep</button>
          {error && <p className="feed-stuck-error" role="alert">{error}</p>}
        </form>)}
      <button type="button" className="feed-continue" onClick={onContinue} data-action="checkpoint-continue">Keep watching</button>
    </div>
  </article>;
});
