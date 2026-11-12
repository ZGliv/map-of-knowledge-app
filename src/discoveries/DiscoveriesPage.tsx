import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor, territoryPalette } from '../core/territoryTheme';
import { coverOf } from '../expeditions/registry';
import { learnableVerb, type Learnable, type LearnablesModel, type LearnableStatus } from './model';
import './discoveries.css';

export interface DiscoveriesPageProps {
  model: LearnablesModel;
  /** Shown first when nothing is in progress: the same next step the map suggests. */
  lead: Learnable | null;
  onOpen: (item: Learnable) => void;
  onShowOnMap: (nodeId: string) => void;
  onOpenHub: (nodeId: string) => void;
  /** The page's heading; Explore calls this list Lessons. */
  title?: string;
}

const STATUS_LABEL: Record<LearnableStatus, string | null> = { new: null, 'in-progress': 'In progress', glimpsed: 'Glimpsed', familiar: 'Familiar', understood: 'Understood' };
const pad = (count: number) => String(count).padStart(2, '0');
/** The two most specific names of a place, as the hub's cards print it. */
const placeOf = (nodeId: string) => {
  const node = catalog.get(nodeId);
  return node ? catalog.getPath(node).slice(1).slice(-2).map(step => step.name) : [];
};
const colorOf = (item: Learnable) => territoryColor(item.kind === 'discovery' ? item.discovery.topicId : item.nodeId);

function Status({ status }: { status: LearnableStatus }) {
  const label = STATUS_LABEL[status];
  return label ? <span className={`learnable-status is-${status}`}>{label}</span> : null;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></svg>;
}

/** One emblem per authored discovery, drawn from what it asks you to look at. */
const EMBLEMS: Record<string, ReactNode> = {
  'rhythm-between-beats': <><path d="M12 20v24M24 20v24M36 20v24M48 20v24" /><path d="M18 27v10M30 27v10M42 27v10M54 27v10" opacity=".55" /></>,
  'motion-as-slope': <><path d="M12 12v40h42" opacity=".5" /><path d="M16 46 29 36l12-9 11-11" /><circle cx="29" cy="36" r="2.2" fill="currentColor" /><circle cx="41" cy="27" r="2.2" fill="currentColor" /><circle cx="52" cy="16" r="2.2" fill="currentColor" /></>,
  'merge-without-searching': <><path d="M8 20h14q8 0 12 12M8 44h14q8 0 12-12M34 32h22" /><circle cx="12" cy="20" r="2" fill="currentColor" /><circle cx="18" cy="44" r="2" fill="currentColor" /><circle cx="46" cy="32" r="2" fill="currentColor" /><circle cx="54" cy="32" r="2" fill="currentColor" /></>,
  'speech-has-geography': <><path d="M12 42q2-22 22-24q14-1 20 10" /><path d="M16 44q10-9 24-5" opacity=".6" /><circle cx="25" cy="24" r="2.4" fill="currentColor" /><path d="M54 36q4 4 0 8M58 32q7 8 0 16" opacity=".5" /></>,
  'memory-as-connections': <><path d="M18 42Q22 20 46 22" /><circle cx="18" cy="42" r="5" /><circle cx="46" cy="22" r="5" /><g fill="currentColor" opacity=".5"><circle cx="9" cy="31" r="1.6" /><circle cx="27" cy="52" r="1.6" /><circle cx="55" cy="36" r="1.6" /><circle cx="38" cy="10" r="1.6" /></g></>,
  'proof-by-rearranging': <><path d="M12 12h40v40H12Z" opacity=".5" /><path d="M24 12 52 24 40 52 12 40Z" /></>,
  'follow-the-energy': <><path d="M8 40q6-18 20-14q-4 14-20 14Z" /><path d="M8 40 22 30" opacity=".5" /><path d="M32 33h8m-3-3 3 3-3 3" /><circle cx="50" cy="33" r="6" /></>,
  'choices-have-shadows': <><circle cx="38" cy="36" r="17" opacity=".3" /><circle cx="30" cy="30" r="17" /><path d="M30 30V18M30 30l8 5" /></>,
  'fractions-past-one': <><path d="M8 40h50" opacity=".5" /><path d="M10 34v10M19 37v4M28 37v4M37 37v4M46 30v14M55 37v4" /><path d="M10 34q4.5-9 9 0q4.5-9 9 0q4.5-9 9 0q4.5-9 9 0q4.5-9 9 0" opacity=".75" /></>,
};

/** An expedition's cover still, or a discovery's emblem on its territory's light. A pointer
 * shortcut beside the item's real button, so it stays out of the tab order. */
function Cover({ item, className, onClick }: { item: Learnable; className: string; onClick: () => void }) {
  if (item.kind === 'expedition') {
    const cover = coverOf(item.expedition.pack);
    if (cover) return <div className={`${className} learnable-cover${cover.media.tone === 'ink' ? ' is-ink' : ''}`} style={{ ['--hue' as string]: item.expedition.pack.hue }} aria-hidden="true" onClick={onClick}>
      <img src={cover.media.src} alt="" loading="lazy" style={{ objectPosition: `${cover.focus[0]}% ${cover.focus[1]}%` }} />
    </div>;
  }
  const palette = territoryPalette(item.kind === 'discovery' ? item.discovery.topicId : item.nodeId);
  return <div className={`${className} learnable-art`} style={{ '--art-a': palette.start, '--art-b': palette.end, '--art-c': palette.middle } as CSSProperties} aria-hidden="true" onClick={onClick}>
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{EMBLEMS[item.id] ?? <circle cx="32" cy="32" r="12" />}</svg>
  </div>;
}

function PlaceButton({ item, onShowOnMap }: { item: Learnable; onShowOnMap: (nodeId: string) => void }) {
  const place = placeOf(item.nodeId);
  const leaf = place.at(-1) ?? '';
  return <button type="button" className="learnable-place" onClick={() => onShowOnMap(item.nodeId)} data-action="discoveries-show-on-map" data-node-id={item.nodeId} aria-label={`Show ${leaf} on the map`} title="Show on the map">
    <PinIcon /><span>{place.length > 1 && <span className="learnable-place-parent">{place[0]} › </span>}{leaf}</span>
  </button>;
}

function LeadCard({ item, onOpen, onShowOnMap }: { item: Learnable } & Pick<DiscoveriesPageProps, 'onOpen' | 'onShowOnMap'>) {
  return <article className="discoveries-lead" style={{ '--item-color': colorOf(item) } as CSSProperties} data-learnable-id={item.id}>
    <Cover item={item} className="discoveries-lead-media" onClick={() => onOpen(item)} />
    <div className="discoveries-lead-body">
      <h3>{item.title}</h3>
      <p className="discoveries-lead-question">{item.question}</p>
      <p className="learnable-meta"><span>{item.minutes} min</span><PlaceButton item={item} onShowOnMap={onShowOnMap} /><Status status={item.status} /></p>
      <button type="button" className="discoveries-primary" onClick={() => onOpen(item)} data-action="discoveries-lead" data-learnable-id={item.id}>{learnableVerb(item)}</button>
    </div>
  </article>;
}

function Row({ item, onOpen, onShowOnMap }: { item: Learnable } & Pick<DiscoveriesPageProps, 'onOpen' | 'onShowOnMap'>) {
  return <li className={`learnable is-${item.status}`} style={{ '--item-color': colorOf(item) } as CSSProperties} data-learnable-id={item.id} data-learnable-kind={item.kind}>
    <Cover item={item} className="learnable-thumb" onClick={() => onOpen(item)} />
    <button type="button" className="learnable-open" onClick={() => onOpen(item)} data-action="discoveries-open" aria-label={`${learnableVerb(item)}: ${item.title}`}>
      <strong>{item.title}</strong><span>{item.question}</span>
    </button>
    <p className="learnable-meta"><span>{item.minutes} min</span><PlaceButton item={item} onShowOnMap={onShowOnMap} /><Status status={item.status} /></p>
  </li>;
}

/** Everything that can be learned right now, and where you stand with each. */
export function DiscoveriesPage({ model, lead, onOpen, onShowOnMap, onOpenHub, title = 'Discoveries' }: DiscoveriesPageProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const { continuing, territories, counts } = model;
  const first = continuing[0] ?? lead;
  const rest = continuing.slice(1);
  return <div className="discoveries-workspace" data-workspace="discoveries">
    <article className="discoveries-page" aria-labelledby="discoveries-title">
      <header className="discoveries-hero">
        <h1 id="discoveries-title" ref={heading} tabIndex={-1}>{title}</h1>
        <dl className="discoveries-stats">
          <div><dt>Understood</dt><dd>{counts.understood}<small> of {counts.total}</small></dd></div>
          {counts.familiar > 0 && <div><dt>Familiar</dt><dd>{counts.familiar}</dd></div>}
          {counts.inProgress > 0 && <div><dt>In progress</dt><dd>{counts.inProgress}</dd></div>}
        </dl>
        <ol className="discoveries-strip" aria-hidden="true">
          {territories.flatMap(group => group.items).map(item => <li key={`${item.kind}:${item.id}`} className={`is-${item.status}`} style={{ '--item-color': colorOf(item) } as CSSProperties} title={item.title} />)}
        </ol>
      </header>

      {first && <section className="discoveries-section discoveries-section--lead" aria-labelledby="discoveries-continue" data-discoveries-section={continuing.length ? 'continue' : 'start'}>
        <header className="discoveries-section-head"><h2 id="discoveries-continue">{continuing.length ? 'Continue' : 'Start here'}</h2>{continuing.length > 1 && <span>{pad(continuing.length)}</span>}</header>
        <LeadCard item={first} onOpen={onOpen} onShowOnMap={onShowOnMap} />
        {rest.length > 0 && <ul className="learnable-list">{rest.map(item => <Row key={`${item.kind}:${item.id}`} item={item} onOpen={onOpen} onShowOnMap={onShowOnMap} />)}</ul>}
      </section>}

      <section className="discoveries-section" aria-labelledby="discoveries-territories" data-discoveries-section="territories">
        <header className="discoveries-section-head"><h2 id="discoveries-territories">By territory</h2><span>{pad(counts.total)}</span></header>
        {territories.map(group => <section key={group.node.id} className="discoveries-territory" style={{ '--item-color': territoryColor(group.node.id) } as CSSProperties} aria-labelledby={`territory-${group.node.id}`} data-territory={group.node.id}>
          <h3 id={`territory-${group.node.id}`}>
            <button type="button" onClick={() => onOpenHub(group.node.id)} data-action="discoveries-territory"><i aria-hidden="true" />{group.node.name}</button>
            <span aria-label={`${group.understood} of ${group.items.length} understood`}>{group.understood}<small>/{group.items.length}</small></span>
          </h3>
          <ul className="learnable-list">{group.items.map(item => <Row key={`${item.kind}:${item.id}`} item={item} onOpen={onOpen} onShowOnMap={onShowOnMap} />)}</ul>
        </section>)}
      </section>
    </article>
  </div>;
}
