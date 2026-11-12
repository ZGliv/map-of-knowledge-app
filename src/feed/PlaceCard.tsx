import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAutoPlace } from '../auto/AutoPlaceSection';
import type { AutoPlace, QuickItem } from '../auto/types';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import { pushRoute } from '../hub/route';
import { Reader } from '../shelf/Reader';
import type { ShelfApi } from '../shelf/store';
import { CARD_MINUTES, cardId, readId } from '../shelf/types';
import { pickGuess } from './guess';
import { hashString } from './rng';

// A place card in Watch: one place's generated page (/auto/<placeId>.json) as a vertical card. It
// always opens on the place: its picture and name. Under them, the lightest of its quick questions
// not answered yet (guess.ts) may sit as an optional guess (tap, see the answer and why, or skip it);
// then the two or three lines that explain the place, its facts, and where to go from here: the
// long read, the place itself, and the source. Four seconds on screen with those lines showing marks
// the card done, which fills a minute of the map for good: the guess itself never does.

/** Time on screen that counts as having read the card. */
export const CARD_DWELL_MS = 4000;

export interface PlaceCardProps {
  placeId: string;
  /** Loaded and drawn (the card on screen and its neighbours); otherwise only a still. */
  near: boolean;
  /** The card on screen, with the feed live: its dwell counts. */
  onScreen: boolean;
  shelf?: ShelfApi;
}

const shuffled = <T,>(list: readonly T[], seed: string): T[] => [...list]
  .map((value, index) => ({ value, rank: hashString(`${seed}:${index}`) }))
  .sort((a, b) => a.rank - b.rank)
  .map(({ value }) => value);

export const PlaceCard = memo(function PlaceCard({ placeId, near, onScreen, shelf }: PlaceCardProps) {
  // Loaded once it comes near, and kept while the card stays mounted.
  const wanted = useRef(false);
  if (near) wanted.current = true;
  const place = useAutoPlace(wanted.current ? placeId : '');
  const node = catalog.get(placeId);
  const name = place?.name ?? node?.name ?? '';
  const trail = node ? catalog.getPath(node).slice(1, -1).map(step => step.name).join(' › ') : '';
  const color = territoryColor(placeId);
  const shelfRef = useRef(shelf);
  shelfRef.current = shelf;

  // The card's own done: once, with a quiet "+1 min" the first time it lands.
  const [landed, setLanded] = useState(false);
  const finish = () => {
    const live = shelfRef.current;
    if (!live || live.isDone(cardId(placeId))) return;
    live.markDone(cardId(placeId));
    setLanded(true);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (!landed) return;
    const id = window.setTimeout(() => setLanded(false), 2600);
    return () => window.clearTimeout(id);
  }, [landed]);

  // The guess: the lightest question not answered yet, chosen once per card and kept while it is answered.
  const [guess, setGuess] = useState<QuickItem | null | undefined>(undefined);
  useEffect(() => {
    if (!place || guess !== undefined) return;
    setGuess(pickGuess(place.items, id => !!shelfRef.current?.guessFor(id)));
  }, [place, guess]);
  const [phase, setPhase] = useState<'guess' | 'card'>('guess');
  const [pick, setPick] = useState<string | null>(null);
  const answer = (optionId: string) => {
    if (!guess || pick) return;
    setPick(optionId);
    shelfRef.current?.recordGuess(guess.id, optionId === guess.answer);
  };
  // The place's own lines are showing: no guess (once that is settled), or past it.
  const about = guess === null || (!!guess && phase === 'card');

  // On screen for CARD_DWELL_MS with its lines showing (seen at least 60% by its own observer, with the feed live).
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { for (const entry of entries) setSeen(entry.isIntersecting && entry.intersectionRatio >= 0.6); }, { threshold: [0, 0.6, 1] });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const counting = onScreen && seen && !!place && about;
  useEffect(() => {
    if (!counting) return;
    const id = window.setTimeout(() => finishRef.current(), CARD_DWELL_MS);
    return () => window.clearTimeout(id);
  }, [counting]);

  const [reading, setReading] = useState(false);
  const done = !!shelf?.isDone(cardId(placeId));
  const style = { '--place-color': color } as CSSProperties;

  if (!place) return <article ref={root} className="feed-card place-card is-still" style={style} data-place-card={placeId} aria-label={name}>
    <div className="place-card-still"><span>{trail}</span><h2>{name}</h2></div>
  </article>;

  const asking = !!guess && phase === 'guess';
  // In the flow of the card, beside its buttons, never over its words.
  const pill = landed && <p className="place-card-landed" role="status" data-card-landed="">+{CARD_MINUTES} min on the map</p>;
  return <article ref={root} className={`feed-card place-card${asking ? ' is-guess' : ''}`} style={style} data-place-card={placeId} data-done={done || undefined} aria-label={name}>
    <div className="place-card-body">
      {place.image && <figure className="place-card-figure">
        <img src={place.image.src} alt={place.image.alt} loading="lazy" decoding="async" draggable={false} />
        <figcaption><a href={place.image.page} target="_blank" rel="noreferrer">{place.image.credit} · {place.image.license}</a></figcaption>
      </figure>}
      <div className="place-card-text">
        {trail && <p className="place-card-trail">{trail}</p>}
        <h2 className="place-card-name">{place.name}</h2>
        {asking ? <Guess key={guess.id} item={guess} seed={placeId} pick={pick} onPick={answer} onNext={() => setPhase('card')} />
          : <About place={place} />}
      </div>
      {!asking && <>
        <div className="place-card-actions">
          {place.read && <button type="button" className="reel-prove" onClick={() => setReading(true)} data-action="card-read">Read, {place.read.minutes} min</button>}
          <button type="button" className={place.read ? 'reel-again' : 'reel-prove'} onClick={() => pushRoute({ kind: 'hub', nodeId: place.nodeId })} data-action="card-open-place">Open place</button>
          {pill}
        </div>
        <p className="place-card-source">From <a href={place.source.url} target="_blank" rel="noreferrer" title={place.source.title}>Wikipedia</a>, CC BY-SA</p>
      </>}
    </div>
    {reading && place.read && <Reader place={place} onClose={() => setReading(false)} onDone={() => shelfRef.current?.markDone(readId(placeId))} />}
  </article>;
});

/** The guess, under the place's name: optional, light, Skip always in reach. Answered, it keeps the
 * right option (and the one picked, quietly) with why, then goes on to the place. */
function Guess({ item, seed, pick, onPick, onNext }: { item: QuickItem; seed: string; pick: string | null; onPick: (id: string) => void; onNext: () => void }) {
  const options = useMemo(() => shuffled(item.options, `${seed}:${item.id}`), [item, seed]);
  const right = pick === item.answer;
  return <div className={`place-card-guess${pick ? ' is-answered' : ''}`}>
    <div className="place-card-guess-head">
      <span>Quick guess</span>
      {!pick && <button type="button" className="place-card-skip" onClick={onNext} data-action="card-skip">Skip<span aria-hidden="true"> →</span></button>}
    </div>
    <fieldset className="place-card-question">
      <legend>{item.prompt}</legend>
      <div className="place-card-options">
        {options.filter(option => !pick || option.id === item.answer || option.id === pick).map(option => <button type="button" key={option.id} disabled={!!pick} data-action="card-guess" data-option={option.id}
          className={`place-card-option${pick && option.id === item.answer ? ' is-answer' : ''}${pick === option.id ? ' is-picked' : ''}`}
          onClick={() => onPick(option.id)}>{option.label}</button>)}
      </div>
    </fieldset>
    {pick && <div className="place-card-reveal" role="status">
      <p>{right && <strong>Right. </strong>}{item.explain}</p>
      <button type="button" className="reel-prove place-card-next" onClick={onNext} data-action="card-continue">Continue</button>
    </div>}
  </div>;
}

/** What the place is: two or three lines, and up to three facts. */
function About({ place }: { place: AutoPlace }) {
  return <>
    <div className="place-card-summary">{place.summary.slice(0, 3).map((line, index) => <p key={index}>{line.text}</p>)}</div>
    {place.facts.length > 0 && <dl className="place-card-facts">
      {place.facts.slice(0, 3).map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
    </dl>}
  </>;
}
