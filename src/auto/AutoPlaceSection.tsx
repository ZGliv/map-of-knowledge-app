import { useEffect, useMemo, useState } from 'react';
import { hashString } from '../spatial/deterministic';
import { recordGuess } from '../shelf/store';
import { QUICK_PASS, QUICK_SIZE, type AutoPlace, type QuickItem } from './types';
import './auto.css';

const cache = new Map<string, Promise<AutoPlace | null>>();
/** A place's generated page, or null when it has none. Fetched once per place. */
export function loadAutoPlace(nodeId: string): Promise<AutoPlace | null> {
  let known = cache.get(nodeId);
  if (!known) {
    known = fetch(`/auto/${nodeId}.json`)
      .then(response => response.ok && response.headers.get('content-type')?.includes('json') ? response.json() as Promise<AutoPlace> : null)
      .catch(() => null);
    cache.set(nodeId, known);
  }
  return known;
}

let index: Promise<ReadonlySet<string>> | null = null;
/** Every place with a generated page, from /auto/index.json (empty when there is none). */
export function useAutoIndex(): ReadonlySet<string> {
  const [places, setPlaces] = useState<ReadonlySet<string>>(EMPTY);
  useEffect(() => {
    index ??= fetch('/auto/index.json')
      .then(response => response.ok && response.headers.get('content-type')?.includes('json') ? response.json() as Promise<{ places?: string[] }> : null)
      .then(data => new Set(data?.places ?? []) as ReadonlySet<string>, () => EMPTY);
    let live = true;
    void index.then(set => { if (live) setPlaces(set); });
    return () => { live = false; };
  }, []);
  return places;
}
const EMPTY: ReadonlySet<string> = new Set();

export function useAutoPlace(nodeId: string): AutoPlace | null {
  const [state, setState] = useState<{ nodeId: string; place: AutoPlace | null }>({ nodeId, place: null });
  useEffect(() => {
    let live = true;
    if (!nodeId) return;
    void loadAutoPlace(nodeId).then(place => { if (live) setState({ nodeId, place }); });
    return () => { live = false; };
  }, [nodeId]);
  return state.nodeId === nodeId ? state.place : null;
}

const shuffled = <T,>(list: readonly T[], seed: string): T[] => [...list]
  .map((value, index) => ({ value, rank: hashString(`${seed}:${index}`) }))
  .sort((a, b) => a.rank - b.rank)
  .map(({ value }) => value);

function QuickCheck({ place, proven, onProve }: { place: AutoPlace; proven: boolean; onProve: () => void }) {
  const [round, setRound] = useState(0);
  const items = useMemo(() => shuffled(place.items, `${place.nodeId}:${round}`).slice(0, QUICK_SIZE), [place, round]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const answered = items.filter(item => picks[item.id]).length;
  const right = items.filter(item => picks[item.id] === item.answer).length;
  const finished = answered === items.length;
  useEffect(() => { if (finished && right >= QUICK_PASS) onProve(); }, [finished, right, onProve]);
  return <div className="auto-check" data-auto-check>
    {items.map(item => <Question key={`${round}:${item.id}`} item={item} seed={`${place.nodeId}:${round}`} pick={picks[item.id]} onPick={id => setPicks(all => ({ ...all, [item.id]: id }))} />)}
    {finished && <div className="auto-check-end" role="status">
      <strong>{right} of {items.length}{right >= QUICK_PASS ? ' · Passed' : ''}</strong>
      {right < QUICK_PASS && !proven && <button type="button" className="hub-secondary" data-action="auto-retry" onClick={() => { setPicks({}); setRound(value => value + 1); }}>Try again</button>}
    </div>}
  </div>;
}

function Question({ item, seed, pick, onPick }: { item: QuickItem; seed: string; pick?: string; onPick: (id: string) => void }) {
  const options = useMemo(() => shuffled(item.options, `${seed}:${item.id}`), [item, seed]);
  return <fieldset className="auto-question">
    <legend>{item.prompt}</legend>
    {options.map(option => <button
      type="button" key={option.id} disabled={!!pick} data-action="auto-option"
      className={`auto-option${pick && option.id === item.answer ? ' is-right' : ''}${pick === option.id && option.id !== item.answer ? ' is-wrong' : ''}`}
      onClick={() => { recordGuess(item.id, option.id === item.answer); onPick(option.id); }}
    >{option.label}</button>)}
    {pick && <p className="auto-explain">{item.explain}</p>}
  </fieldset>;
}

export type AutoPart = 'about' | 'quiz' | 'all';

export interface AutoPlaceSectionProps {
  place: AutoPlace;
  proven: boolean;
  /** A place with a hand-built lesson or check keeps that as its one way to prove it: no quiz here. */
  ownProof?: boolean;
  onProve: () => void;
  /** Unused: the pack opens from the place's shelf (src/hub/PlaceShelf.tsx). */
  onOpenPack?: (place: AutoPlace) => void;
  /** 'about' is the picture, facts and source; 'quiz' the optional Quiz me; 'all' both. The hub
   * shows the about part above the shelf and the quiz below it. */
  part?: AutoPart;
}

/** The generated part of a place's page: its picture, the facts, where it comes from, and an
 * optional quiz. Passing the quiz proves the place (it lights on the map); every answer also counts
 * as a guess toward the place's glow. */
export function AutoPlaceSection({ place, proven, ownProof = false, onProve, part = 'all' }: AutoPlaceSectionProps) {
  const [checking, setChecking] = useState(false);
  useEffect(() => setChecking(false), [place.nodeId]);
  const about = part !== 'quiz' && <section className="hub-section auto-place" data-hub-section="auto" aria-label={`About ${place.name}`}>
    {place.image && <figure className="auto-figure">
      <img src={place.image.src} alt={place.image.alt} loading="lazy" />
      <figcaption><a href={place.image.page} target="_blank" rel="noreferrer">{place.image.credit} · {place.image.license}</a></figcaption>
    </figure>}
    <dl className="auto-facts">{place.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    <p className="auto-source"><a href={place.source.url} target="_blank" rel="noreferrer">{place.source.title}, Wikipedia</a> · CC BY-SA</p>
  </section>;
  const quiz = part !== 'about' && !ownProof && place.items.length > 0 && <section className="hub-section auto-quiz" data-hub-section="auto-quiz" aria-labelledby="auto-quiz-title">
    <header className="auto-quiz-head">
      <h2 id="auto-quiz-title">Quiz me</h2>
      <span>Optional</span>
    </header>
    <p className="auto-quiz-lead">{Math.min(QUICK_SIZE, place.items.length)} quick questions on {place.name}. Get {QUICK_PASS} right and it lights up on the map. Skip it if you like; nothing is lost.</p>
    {!checking && <button type="button" className="hub-secondary" data-action="auto-check" onClick={() => setChecking(true)}>{proven ? 'Quiz me again' : 'Quiz me'}</button>}
    {checking && <QuickCheck place={place} proven={proven} onProve={onProve} />}
  </section>;
  return <>{about}{quiz}</>;
}
