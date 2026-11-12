import { cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { AutoPlaceSection, type AutoPart, type AutoPlaceSectionProps } from '../auto/AutoPlaceSection';
import { SUBJECT_THEMES, territoryColor, territoryPalette } from '../core/territoryTheme';
import type { NotebookEntry } from '../core/notebook';
import { bankFor } from '../checks/banks';
import { nextCaseOf, type CheckStatus } from '../checks/progress';
import { coverOf } from '../expeditions/registry';
import { domainOf, type ReadingMark, type SavedLink } from '../notebook/libraryStore';
import { workVerbs } from '../notebook/journal';
import type { HubChild, HubDiscovery, HubExpedition, HubModel, NextStep } from './hubModel';
import './hub.css';

export interface HubProps {
  /** The place's generated page, where it has one. An AutoPlaceSection is shown in two parts around
   * the shelf: its picture and facts above, its optional quiz below. */
  auto?: ReactNode;
  /** What the place is, from its generated page, in place of the stock line. */
  autoOverview?: string;
  /** The place has a generated page (known before the page itself has loaded, so nothing flashes). */
  autoCharted?: boolean;
  /** The ?nav=sheet prototype: the page rises over the lower map instead of covering it. */
  sheet?: boolean;
  model: HubModel;
  onOpenHub: (nodeId: string) => void;
  onMap: (nodeId: string) => void;
  onBeginExpedition: (packId: string) => void;
  /** Prove a node: its field mission when it has new cases, else the question bank. */
  onBeginCheck: (nodeId: string) => void;
  onBeginDiscovery: (discoveryId: string) => void;
  onCapture: (kind: 'idea' | 'question', nodeId: string) => void;
  onOpenNote: (entry: NotebookEntry) => void;
  /** This place's reels (Explore), as their own section. Only without a `shelf`: the shelf lists them. */
  reels?: ReactNode;
  reelCount?: number;
  /** This place's videos (src/feed/WatchRow), as their own section. Only without a `shelf`: the shelf lists them. */
  watch?: ReactNode;
  /** Links the learner saved to this place or inside it. */
  links?: readonly SavedLink[];
  /** Reading marks on shelf works, by work ID. */
  reading?: Readonly<Record<string, ReadingMark>>;
  onCycleReading?: (workId: string) => void;
  /** The place's shelf (src/hub/PlaceShelf.tsx): its fill bar and everything pinned to it, videos and
   * reels included, so `watch` and `reels` are not shown beside it. */
  shelf?: ReactNode;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const pad = (count: number) => String(count).padStart(2, '0');
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const isDue = (check?: CheckStatus | null) => check?.kind === 'ready' && check.purpose !== 'prove';
/** The freshness glow as a small lit mark: its light is the glow (checks/freshness.ts). */
const Glow = ({ glow }: { glow: number }) => <i className="hub-glow" aria-hidden="true" style={{ ['--glow' as string]: glow }} />;

function Section({ id, title, count, children, wide }: { id: string; title: string; count?: number; children: ReactNode; wide?: boolean }) {
  return <section className={`hub-section${wide ? ' hub-section--wide' : ''}`} aria-labelledby={`hub-${id}`} data-hub-section={id}>
    <header className="hub-section-head"><h2 id={`hub-${id}`}>{title}</h2>{count !== undefined && <span>{pad(count)}</span>}</header>
    {children}
  </section>;
}

function Status({ level, earned, charted = true }: { level?: string | null; earned?: boolean; charted?: boolean }) {
  if (!charted) return <span className="hub-status is-uncharted">Not charted yet</span>;
  if (level === 'Lasting') return <span className="hub-status is-earned">Lasting</span>;
  if (earned || level === 'Understood') return <span className="hub-status is-earned">Understood</span>;
  if (level === 'Familiar') return <span className="hub-status is-familiar">Familiar</span>;
  if (level === 'Glimpsed') return <span className="hub-status">Glimpsed</span>;
  return null;
}

function Cover({ item, className }: { item: HubExpedition; className: string }) {
  const cover = coverOf(item.expedition.pack);
  if (!cover) return null;
  return <div className={`${className}${cover.media.tone === 'ink' ? ' is-ink' : ''}`} style={{ ['--hue' as string]: item.expedition.pack.hue }}>
    <img src={cover.media.src} alt="" loading="lazy" style={{ objectPosition: `${cover.focus[0]}% ${cover.focus[1]}%` }} />
  </div>;
}

function NextCard({ next, onBeginExpedition, onBeginDiscovery, onBeginCheck, onOpenHub }: { next: NextStep } & Pick<HubProps, 'onBeginExpedition' | 'onBeginDiscovery' | 'onBeginCheck' | 'onOpenHub'>) {
  if (next.kind === 'welcome') {
    return <article className="hub-next hub-welcome" data-hub-next="welcome">
      <div className="hub-next-body">
        <h2>Welcome back</h2>
        <p className="hub-next-meta"><span>Ready to refresh</span></p>
        <ul className="hub-welcome-list">{next.items.map(({ node, expedition, level }) => <li key={node.id} style={{ '--hub-dot': territoryColor(node.id) } as CSSProperties}>
          {expedition ? <Cover item={{ expedition, level }} className="hub-welcome-media" /> : <span className="hub-welcome-media is-blank" aria-hidden="true" />}
          <button type="button" className="hub-welcome-place" onClick={() => onOpenHub(node.id)} data-action="hub-welcome-place" data-node-id={node.id}>
            <strong>{node.name}</strong>
          </button>
          <button type="button" className="hub-secondary hub-chevron" onClick={() => onBeginCheck(node.id)} data-action="hub-welcome-refresh" data-node-id={node.id} aria-label={`Refresh ${node.name}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </li>)}</ul>
      </div>
    </article>;
  }
  if (next.kind === 'check') {
    const { node, expedition, level, newCase, purpose } = next.item;
    const bank = bankFor(node.id);
    return <article className={`hub-next${expedition ? ' has-cover' : ''}`} data-hub-next="check" data-check-node={node.id}>
      {expedition && <Cover item={{ expedition, level }} className="hub-next-media" />}
      <div className="hub-next-body">
        <button type="button" className="hub-next-place" onClick={() => onOpenHub(node.id)}>{expedition?.code ? `${expedition.code} · ` : ''}{node.name}</button>
        <h2>{newCase?.title ?? 'Try it fresh'}</h2>
        {newCase ? <p className="hub-next-question">{newCase.setting ? `${newCase.setting}. ` : ''}{bank?.claim}</p> : bank && <p className="hub-next-question">{bank.claim}</p>}
        <p className="hub-next-meta" data-purpose={purpose}><span>Ready to refresh</span><Status level={level} /></p>
        <button type="button" className="hub-primary" onClick={() => onBeginCheck(node.id)} data-action="hub-begin-check" data-node-id={node.id}>{newCase ? 'Refresh' : 'Begin'}</button>
      </div>
    </article>;
  }
  if (next.kind === 'expedition') {
    const { expedition, level, check } = next.item;
    const { pack } = expedition;
    return <article className="hub-next has-cover" data-hub-next={pack.id}>
      <Cover item={next.item} className="hub-next-media" />
      <div className="hub-next-body">
        <button type="button" className="hub-next-place" onClick={() => onOpenHub(expedition.nodeId)}>{expedition.code ? `${expedition.code} · ` : ''}{pack.path.at(-1)}</button>
        <h2>{pack.title}</h2>
        <p className="hub-next-question">{pack.question}</p>
        <p className="hub-next-meta"><span>{pack.minutes} min</span>{level && <Status level={level} />}</p>
        <div className="hub-next-actions">
          <button type="button" className="hub-primary" onClick={() => onBeginExpedition(pack.id)} data-action="hub-begin-expedition" data-pack-id={pack.id}>{level === 'Understood' || level === 'Lasting' ? 'Play again' : level ? 'Try again' : 'Begin lesson'}</button>
          {check?.kind === 'ready' && <button type="button" className="hub-link" onClick={() => onBeginCheck(expedition.nodeId)} data-action="hub-go-further" data-node-id={expedition.nodeId}>{check.via === 'case' ? 'Go further' : 'Try it fresh'}</button>}
        </div>
      </div>
    </article>;
  }
  const { discovery, earned, resume } = next.item;
  return <article className="hub-next" data-hub-next={discovery.id} style={{ '--hub-dot': territoryColor(discovery.topicId) } as CSSProperties}>
    <div className="hub-next-body">
      <button type="button" className="hub-next-place" onClick={() => onOpenHub(discovery.topicId)}>{discovery.subject} · discovery</button>
      <h2>{discovery.title}</h2>
      <p className="hub-next-question">{discovery.question}</p>
      <p className="hub-next-summary">{discovery.summary}</p>
      <p className="hub-next-meta"><span>{discovery.minutes} min</span><span>{plural(discovery.challenges.length, 'step')}</span>{earned && <Status earned />}</p>
      <button type="button" className="hub-primary" onClick={() => onBeginDiscovery(discovery.id)} data-action="hub-begin-discovery" data-discovery-id={discovery.id}>{resume ? 'Continue learning' : earned ? 'Revisit' : 'Begin'}</button>
    </div>
  </article>;
}

function ChildCard({ child, onOpenHub }: { child: HubChild; onOpenHub: (id: string) => void }) {
  const meta = [child.childCount ? plural(child.childCount, 'region') : null, child.charted ? plural(child.charted, 'piece') + ' charted' : null, child.notes ? plural(child.notes, 'note') : null].filter(Boolean).join(' · ');
  return <button type="button" className="hub-child" onClick={() => onOpenHub(child.node.id)} data-action="hub-child" data-node-id={child.node.id} style={{ '--hub-dot': territoryColor(child.node.id) } as CSSProperties}>
    <i aria-hidden="true" />
    <strong>{child.node.name}</strong>
    <small>{meta || 'Not charted yet'}</small>
    {child.charted > 0 && <span className="hub-child-meter" aria-label={`${child.earned} of ${child.charted} earned`}><b style={{ width: `${(child.earned / child.charted) * 100}%` }} /></span>}
  </button>;
}

function TerritoryRow({ child, onOpenHub, onBeginExpedition, onBeginCheck }: { child: HubChild; onOpenHub: (id: string) => void; onBeginExpedition: (id: string) => void; onBeginCheck: (id: string) => void }) {
  const territory = child.territory!;
  const item = child.expedition;
  return <li className={`hub-territory${item ? ' is-charted' : ''}`} data-node-id={child.node.id} style={{ '--hub-dot': territoryColor(child.node.id) } as CSSProperties}>
    {item ? <Cover item={item} className="hub-territory-media" /> : <span className="hub-territory-blank" aria-hidden="true" />}
    <button type="button" className="hub-territory-text" onClick={() => onOpenHub(child.node.id)} data-action="hub-territory">
      <span className="hub-territory-eyebrow">{territory.code}</span>
      <span className="hub-territory-name">{child.node.name}</span>
      <span className="hub-territory-claim">{territory.claim}</span>
      {item && <span className="hub-territory-pack">{item.expedition.pack.title} · {item.expedition.pack.minutes} min</span>}
    </button>
    <span className="hub-territory-side">
      <Status level={item?.level} charted={!!item} />
      {isDue(child.check) ? <button type="button" className="hub-secondary" onClick={() => onBeginCheck(child.node.id)} data-action="hub-territory-check" data-node-id={child.node.id} aria-label={`Refresh ${child.node.name}`}>Refresh</button>
        : item && <button type="button" className="hub-secondary" onClick={() => onBeginExpedition(item.expedition.pack.id)} data-action="hub-territory-begin" data-pack-id={item.expedition.pack.id}>{item.level === 'Understood' || item.level === 'Lasting' ? 'Play again' : 'Begin'}</button>}
    </span>
  </li>;
}

function ExpeditionCard({ item, onBeginExpedition, onOpenHub }: { item: HubExpedition } & Pick<HubProps, 'onBeginExpedition' | 'onOpenHub'>) {
  const { pack } = item.expedition;
  return <article className="hub-expedition" data-pack-id={pack.id}>
    <button type="button" className="hub-expedition-play" onClick={() => onBeginExpedition(pack.id)} data-action="hub-expedition" aria-label={`Begin ${pack.title}`}>
      <Cover item={item} className="hub-expedition-media" />
      <span className="hub-expedition-title">{pack.title}</span>
      <span className="hub-expedition-question">{pack.question}</span>
    </button>
    <footer>
      <button type="button" className="hub-link" onClick={() => onOpenHub(item.expedition.nodeId)}>{pack.path.slice(-2).join(' › ')}</button>
      <span>{pack.minutes} min</span>
      <Status level={item.level} />
    </footer>
  </article>;
}

function DiscoveryRow({ item, onBeginDiscovery }: { item: HubDiscovery; onBeginDiscovery: (id: string) => void }) {
  const { discovery } = item;
  return <li style={{ '--hub-dot': territoryColor(discovery.topicId) } as CSSProperties}>
    <button type="button" className="hub-row" onClick={() => onBeginDiscovery(discovery.id)} data-action="hub-discovery" data-discovery-id={discovery.id}>
      <i aria-hidden="true" />
      <span><strong>{discovery.title}</strong><small>{discovery.question}</small></span>
      <span className="hub-row-side">{item.resume ? <span className="hub-status is-familiar">In progress</span> : item.earned ? <Status earned /> : `${discovery.minutes} min`}</span>
    </button>
  </li>;
}

/** A full page for one place on the map, at any depth. Contents come only from real data.
 * Its way back to the map lives in the shell's top bar, beside the place's trail. */
export function Hub({ sheet = false, model, onOpenHub, onMap, onBeginExpedition, onBeginCheck, onBeginDiscovery, onCapture, onOpenNote, auto, autoOverview, autoCharted, reels, reelCount, watch, links = [], reading = {}, onCycleReading, shelf }: HubProps) {
  const { node, path, parent, progress, next, children, siblings, expeditions, discoveries, library, notes, connections, territory, introduction } = model;
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [node.id]);
  const palette = node.depth === 0 ? null : territoryPalette(node.id);
  const spectrum = palette ? `linear-gradient(90deg, ${palette.start}, ${palette.middle}, ${palette.end})` : `linear-gradient(90deg, ${SUBJECT_THEMES.map(subject => subject.color).join(', ')})`;
  const style = { '--hub-color': node.depth === 0 ? '#d6b96f' : territoryColor(node.id), '--hub-spectrum': spectrum } as CSSProperties;
  const name = node.depth ? node.name : 'The map';
  const territories = children.filter(child => child.territory);
  const places = children.filter(child => !child.territory);
  // Lessons that already appear as territory rows are not repeated as cards.
  const cards = expeditions.filter(item => !territories.some(child => child.node.id === item.expedition.nodeId) && item.expedition.nodeId !== node.id);
  // A place with a generated page is charted: it has its own way to prove it.
  const unchartedHere = !next && !children.length && !auto && !autoCharted;
  // The next new case, whenever one is promised: after a miss, a week after the place lit, or its next
  // refresh. Once every case here is played, that date opens a check in words (as nextLine says).
  const nextCaseAt = model.check ? nextCaseOf(model.check) : undefined;
  const autoPart = (part: AutoPart) => isValidElement<AutoPlaceSectionProps>(auto) && auto.type === AutoPlaceSection ? cloneElement(auto, { part }) : part === 'about' ? auto : null;

  return <div className={`hub-workspace${sheet ? ' is-sheet' : ''}`} ref={scroller} style={style} data-hub-node={node.id}>
    <article className="hub-page" aria-labelledby="hub-title">
      <header className="hub-hero">
        <nav className="hub-trail" aria-label="Path through the atlas">
          {path.slice(0, -1).map(step => <button type="button" key={step.id} onClick={() => onOpenHub(step.id)} data-action="hub-ancestor" data-node-id={step.id}>{step.depth ? step.name : 'The atlas'}</button>)}
          {territory && <span className="hub-trail-code">{territory.code}</span>}
        </nav>
        <h1 id="hub-title" ref={heading} tabIndex={-1}>{name}</h1>
        <div className="hub-spectrum" aria-hidden="true" />
        <p className="hub-overview">{autoOverview ?? model.overview}</p>
        <dl className="hub-stats">
          {progress.charted > 0 ? <div data-hub-stat="earned" data-glow={model.freshness?.glow}><dt>Earned</dt><dd>{model.freshness && model.freshness.glow > 0.01 && <Glow glow={model.freshness.glow} />}{progress.earned}<small> of {progress.charted}</small></dd></div> : <div><dt>Charted</dt><dd className="is-quiet">Not yet</dd></div>}
          {progress.familiar > 0 && <div><dt>Familiar</dt><dd>{progress.familiar}</dd></div>}
          {model.lastingAt && <div data-hub-stat="lasting"><dt>Lasting</dt><dd className="is-quiet">Since {day(model.lastingAt)}</dd></div>}
          {nextCaseAt && <div data-hub-stat="next-check"><dt>{model.caseLeft ? 'Next case' : 'Next check'}</dt><dd className="is-quiet">{day(nextCaseAt)}</dd></div>}
          <div><dt>Your notes</dt><dd>{progress.notes}</dd></div>
        </dl>
        {territories.length > 0 && <ol className="hub-strip" aria-label={`${territories.filter(child => child.expedition).length} of ${territories.length} territories charted`}>
          {territories.map(child => <li key={child.node.id} title={child.node.name} className={child.expedition?.level === 'Understood' || child.expedition?.level === 'Lasting' ? 'is-earned' : child.expedition ? 'is-charted' : ''} style={child.glow ? { ['--glow' as string]: child.glow } : undefined}><span className="sr-only">{child.node.name}</span></li>)}
        </ol>}
      </header>

      {next && <section className="hub-section hub-section--next" aria-label="Next step" data-hub-section="next">
        <NextCard next={next} onBeginExpedition={onBeginExpedition} onBeginDiscovery={onBeginDiscovery} onBeginCheck={onBeginCheck} onOpenHub={onOpenHub} />
      </section>}
      {unchartedHere && <section className="hub-section hub-section--next" aria-label="Not charted yet" data-hub-section="uncharted">
        <div className="hub-uncharted"><span className="hub-status is-uncharted">Not charted yet</span><p>No lesson reaches {name} yet. What do you already know about it?</p><button type="button" className="hub-secondary" onClick={() => onCapture('idea', node.id)}>Capture what you know</button></div>
      </section>}

      {shelf ? <>
        {autoPart('about')}
        {shelf}
        {autoPart('quiz')}
      </> : <>
        {auto}
        {reels && <Section id="reels" title="Reels" count={reelCount} wide>{reels}</Section>}
        {watch}
      </>}

      {territories.length > 0 && <Section id="territories" title={`Inside ${name}`} count={territories.length} wide>
        <ol className="hub-territories">{territories.map(child => <TerritoryRow key={child.node.id} child={child} onOpenHub={onOpenHub} onBeginExpedition={onBeginExpedition} onBeginCheck={onBeginCheck} />)}</ol>
      </Section>}

      {places.length > 0 && <Section id="inside" title={`Inside ${name}`} count={places.length} wide>
        <div className="hub-children">{places.map(child => <ChildCard key={child.node.id} child={child} onOpenHub={onOpenHub} />)}</div>
      </Section>}

      {cards.length > 0 && <Section id="expeditions" title="Lessons" count={cards.length} wide>
        <div className="hub-expeditions">{cards.map(item => <ExpeditionCard key={item.expedition.pack.id} item={item} onBeginExpedition={onBeginExpedition} onOpenHub={onOpenHub} />)}</div>
      </Section>}

      {discoveries.length > 0 && <Section id="discoveries" title="Discoveries" count={discoveries.length}>
        <ul className="hub-list">{discoveries.map(item => <DiscoveryRow key={item.discovery.id} item={item} onBeginDiscovery={onBeginDiscovery} />)}</ul>
      </Section>}

      {introduction && <Section id="ideas" title="Key ideas">
        <dl className="hub-ideas">{introduction.ideas.map(idea => <div key={idea.title}><dt>{idea.title}</dt><dd>{idea.description}</dd></div>)}</dl>
        <div className="hub-thought">
          <p className="hub-thought-prompt">{introduction.example.prompt}</p>
          <details><summary>One way to think about it</summary><p>{introduction.example.reflection}</p></details>
        </div>
      </Section>}

      {library.length > 0 && <Section id="shelf" title={territory ? 'On the shelf' : 'The Core shelf'} count={library.length}>
        <ul className="hub-shelf">{library.map(work => <li key={work.id} data-work-id={work.id}>
          <div className="hub-shelf-main">
            <strong>{work.title}</strong>
            <span className="hub-shelf-by">{work.creator} · {work.year}</span>
            <p>{work.why}</p>
            {work.pairedWith && <p className="hub-shelf-pair">Read with <a href={work.pairedWith.url} target="_blank" rel="noreferrer">{work.pairedWith.title}</a>, {work.pairedWith.creator}, {work.pairedWith.year}</p>}
          </div>
          <div className="hub-shelf-side">
            <span>{work.format}</span>
            <span>{work.hours}</span>
            {work.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}
            {onCycleReading && (() => {
              const mark = reading[work.id];
              const verbs = workVerbs(work);
              const label = !mark ? verbs.doing : mark.state === 'started' ? `${verbs.doing} · mark finished` : mark.finishedAt ? `${verbs.done} ${day(mark.finishedAt)}` : verbs.done;
              return <button type="button" className={`hub-reading${mark ? ` is-${mark.state}` : ''}`} onClick={() => onCycleReading(work.id)} data-action="hub-reading" data-work-id={work.id} aria-pressed={!!mark}>{label}</button>;
            })()}
          </div>
        </li>)}</ul>
      </Section>}

      <Section id="notes" title="Your notes" count={progress.notes}>
        {notes.length > 0 && <ul className="hub-list">{notes.map(entry => <li key={entry.id}>
          <button type="button" className="hub-row" onClick={() => onOpenNote(entry)} data-action="hub-note" data-entry-id={entry.id}>
            <i aria-hidden="true" className="hub-note-mark">{entry.kind === 'question' ? '?' : '·'}</i>
            <span><strong>{entry.title}</strong><small>{entry.kind === 'question' ? 'Question' : 'Idea'} · {new Date(entry.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>
          </button>
        </li>)}</ul>}
        {links.length > 0 && <ul className="hub-list" data-hub-links="">{links.map(link => <li key={link.id}>
          <a className="hub-row" href={link.url} target="_blank" rel="noopener noreferrer" data-action="hub-link" data-link-id={link.id}>
            <svg aria-hidden="true" className="hub-link-mark" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>
            <span><strong>{link.note || domainOf(link.url)}</strong><small>{domainOf(link.url)} · {day(link.createdAt)}</small></span>
          </a>
        </li>)}</ul>}
        <div className="hub-note-actions">
          <button type="button" className="hub-secondary" onClick={() => onCapture('question', node.id)} data-action="hub-keep-question">Keep a question</button>
          <button type="button" className="hub-link" onClick={() => onCapture('idea', node.id)} data-action="hub-capture-idea">Capture an idea</button>
        </div>
      </Section>

      {siblings.length > 0 && parent && <Section id="nearby" title={`Elsewhere in ${parent.depth ? parent.name : 'the map'}`} count={siblings.length} wide>
        <div className="hub-children">{siblings.map(child => <ChildCard key={child.node.id} child={child} onOpenHub={onOpenHub} />)}</div>
      </Section>}

      {connections.length > 0 && <Section id="connections" title="Connections" count={connections.length}>
        <ul className="hub-list hub-list--split">{connections.map(connection => <li key={connection.label} style={{ '--hub-dot': territoryColor(connection.nodeId) } as CSSProperties}>
          <button type="button" className="hub-row" onClick={() => onOpenHub(connection.nodeId)} data-action="hub-connection" data-node-id={connection.nodeId}>
            <i aria-hidden="true" />
            <span><strong>{connection.label}</strong><small>{connection.path}</small></span>
          </button>
        </li>)}</ul>
      </Section>}

      <footer className="hub-footer">
        <button type="button" className="hub-primary" onClick={() => onMap(node.id)} data-action="hub-map-footer">Show {name} on the map</button>
        {parent && <button type="button" className="hub-link" onClick={() => onOpenHub(parent.id)} data-action="hub-parent">{parent.depth ? parent.name : 'The atlas'}</button>}
      </footer>
    </article>
  </div>;
}
