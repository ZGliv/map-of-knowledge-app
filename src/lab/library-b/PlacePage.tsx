import { useMemo, useState } from 'react';
import { catalog } from '../../core/catalog';
import type { CheckLedger } from '../../checks/ledger';
import type { Content } from '../../contentLoader';
import { bestLevel, type ExpeditionLedger } from '../../expeditions/ledger';
import { usePool } from '../../feed/usePool';
import { videosFor, watchScope } from '../../feed/WatchRow';
import { within, type JournalContent } from '../../notebook/journal';
import { Entries, Section, type Handlers } from './book';
import { coverPlaces, entryRows, itemsWithin, sectionRows, sliceAt, type IndexItem, type LibraryIndex, type PathStep } from './indexModel';
import { hue, Icon, Locator, MapMark, MARK_WORD } from './marks';
import { proofAt, PROOF_WORD, type Proof } from './proof';
import { ItemFace, kindWord } from './tiles';

/*
 * One place, laid out like a catalogue page: where it sits (a locator from the map, and the way back
 * to it), what it claims, everything you have there, the proof it offers (its lesson and its case),
 * and what Watch and Reels hold for it. A field or a territory opens the same page, with its part of
 * the index inside.
 */

const day = (iso: string) => { const date = new Date(iso); return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
const STEP_WORD = { saved: 'Saved', started: 'Started', finished: 'Finished', proved: 'Proved' } as const;
const LIST_PAGE = 30;

/** Saved → Started → Finished → Proved: the steps reached in full, the rest faint. */
export function PathLine({ item }: { item: IndexItem }) {
  const words = (step: PathStep) => step.step === 'saved' && (item.kind === 'idea' || item.kind === 'question') ? 'Written'
    : step.step === 'finished' && (item.kind === 'video' || item.kind === 'reel') ? 'Watched' : STEP_WORD[step.step];
  return <ol className="lbx-path" aria-label="Its path">
    {item.path.map(step => <li key={step.step} className={step.reached ? 'is-reached' : undefined} data-step={step.step}>
      {words(step)}{step.reached && step.at ? <time dateTime={step.at}> {day(step.at)}</time> : null}
    </li>)}
  </ol>;
}

function ThingRow({ item, onOpen }: { item: IndexItem; onOpen: (item: IndexItem) => void }) {
  const detail = item.kind === 'work' ? [item.work.creator, item.work.year].filter(Boolean).join(' · ') || item.work.format
    : item.kind === 'reel' ? 'Reel' : item.detail;
  return <li>
    <button type="button" className={`lbx-thing is-${item.kind}`} style={hue(item.nodeIds[0])} onClick={() => onOpen(item)} data-lbx-item={item.key}>
      <span className="lbx-thing-face"><ItemFace item={item} /></span>
      <span className="lbx-thing-text">
        <b>{item.title}</b>
        <small>{detail}{item.kind === 'work' ? ` · ${kindWord(item)}` : ''}</small>
        <PathLine item={item} />
      </span>
    </button>
  </li>;
}

function Notes({ items, onOpen }: { items: readonly IndexItem[]; onOpen: (item: IndexItem) => void }) {
  return <ul className="lbx-notes">{items.map(item => item.kind === 'idea' || item.kind === 'question' ? <li key={item.key}>
    <button type="button" onClick={() => onOpen(item)} data-lbx-item={item.key}>
      <blockquote className={item.kind === 'question' ? 'is-question' : undefined}>{item.title}</blockquote>
      {item.entry.body.trim() && <p>{item.entry.body.replace(/\s+/g, ' ').slice(0, 220)}{item.entry.body.length > 220 ? '…' : ''}</p>}
      <small>{item.kind === 'question' ? 'Your question' : 'Your note'} · {day(item.entry.createdAt)}</small>
    </button>
  </li> : null)}</ul>;
}

function ProofList({ proofs, exp, here, onOpen }: { proofs: readonly Proof[]; exp: ExpeditionLedger; here: string; onOpen: (proof: Proof) => void }) {
  return <ul className="lbx-proofs">{proofs.map(proof => {
    const name = catalog.get(proof.nodeId)?.name ?? '';
    const level = proof.packId ? bestLevel(exp, proof.packId) : null;
    return <li key={proof.nodeId} style={hue(proof.nodeId)}>
      <button type="button" onClick={() => onOpen(proof)} data-lbx-proof={proof.kind} data-node-id={proof.nodeId}>
        <MapMark nodeId={proof.nodeId} mark={proof.kind === 'proved' ? 'proved' : proof.kind === 'refresh' ? 'refresh' : null} size={26} />
        <span>
          <b>{proof.lesson?.title ?? name}</b>
          <small>{[proof.lesson && proof.nodeId !== here ? name : '', proof.lesson ? `${proof.lesson.minutes} min` : '', level ?? ''].filter(Boolean).join(' · ')}</small>
        </span>
        <em className={`is-${proof.kind}`}>{PROOF_WORD[proof.kind]}</em>
      </button>
    </li>;
  })}</ul>;
}

/** What Watch holds for the place, beyond the videos already kept here (and their other cuts, such
 * as a channel's Short of the same title). */
/** A video title as the strip compares it: the same words, whatever their case and spacing. */
const titleKey = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** `saved`: every video kept anywhere in the library. None of them is offered again, nor any video
 * of the same title (a channel's Short of it), and the strip names each title once. */
function WatchStrip({ nodeId, saved, onOpen, watched }: { nodeId: string; saved: readonly { videoId: string; title: string }[]; onOpen: (videoId: string) => void; watched: Readonly<Record<string, string>> }) {
  const pool = usePool();
  const videos = useMemo(() => {
    if (!pool) return [];
    const scope = watchScope(nodeId, pool.videos);
    if (!scope) return [];
    const kept = new Set(saved.map(video => video.videoId));
    const titles = new Set([...saved.map(video => titleKey(video.title)), ...pool.videos.flatMap(video => kept.has(video.id) ? [titleKey(video.title)] : [])]);
    return videosFor(scope, pool.videos, watched).filter(video => {
      const title = titleKey(video.title);
      if (kept.has(video.id) || titles.has(title)) return false;
      titles.add(title);
      return true;
    }).slice(0, 12);
  }, [pool, nodeId, saved, watched]);
  if (!videos.length || !pool) return null;
  return <section className="lbx-part" aria-labelledby={`lbx-watch-${nodeId}`}>
    <h2 id={`lbx-watch-${nodeId}`}>Watch</h2>
    <div className="lbx-strip">{videos.map(video => <button key={video.id} type="button" className="lbx-still" onClick={() => onOpen(video.id)} data-lbx-video={video.id}>
      <span className="lbx-face is-video"><img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="is-shown" /><i className="lbx-play" aria-hidden="true"><Icon name="play" size={12} /></i></span>
      <b>{video.title}</b>
      <small>{pool.channels[video.channel]?.name ?? ''}</small>
    </button>)}</div>
  </section>;
}

export interface PlacePageProps {
  nodeId: string;
  book: LibraryIndex;
  content: Content | null;
  journalContent: JournalContent | null;
  exp: ExpeditionLedger;
  checks: CheckLedger;
  now: number;
  watched: Readonly<Record<string, string>>;
  handlers: Handlers;
  onBack: () => void;
  onNavigate: (nodeId: string) => void;
  onOpenVideo?: (videoId: string) => void;
  onOpenReel: (reelId: string) => void;
  onAddLink: (nodeId: string) => void;
  onNote: (nodeId: string) => void;
}

export function PlacePage({ nodeId, book, content, exp, checks, now, watched, handlers, onBack, onNavigate, onOpenVideo, onOpenReel, onAddLink, onNote }: PlacePageProps) {
  const node = catalog.get(nodeId)!;
  const trail = catalog.getPath(node).slice(1, -1);
  const parent = node.parentId ? catalog.get(node.parentId) : undefined;
  const status = book.status.get(nodeId) ?? null;
  const slice = sliceAt(book, nodeId);
  const leaf = !catalog.getChildren(node).length;
  const mine = useMemo(() => itemsWithin(book, nodeId), [book, nodeId]);
  // A leaf shows all it holds; a wider place shows what sits at it, and the rest by place inside.
  const here = leaf ? mine : mine.filter(item => item.nodeIds.includes(nodeId));
  const things = here.filter(item => item.kind !== 'idea' && item.kind !== 'question');
  const notes = here.filter(item => item.kind === 'idea' || item.kind === 'question');
  const [shown, setShown] = useState(LIST_PAGE);
  const changes = book.journal.changes.filter(change => within(change.nodeId, nodeId));
  const lit = (id: string) => !!book.status.get(id)?.litAt;
  const input = { exp, checks, now, lit };
  const own = content ? proofAt(content, nodeId, input) : null;
  // Its lessons and cases: its own, or (for a wider place) the charted places inside it, in route order.
  const proofs = useMemo(() => !content ? [] : own ? [own] : content.EXPEDITIONS.filter(e => within(e.nodeId, nodeId)).slice(0, 8).map(e => proofAt(content, e.nodeId, input)).filter((p): p is Proof => !!p),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [content, nodeId, own, exp, checks, now, book]);
  const nextCase = content && own && own.kind !== 'lesson' && own.kind !== 'proved' ? content.nextCase(nodeId, checks) : undefined;
  const check = content?.checkStatus(nodeId, exp, checks, now);
  const at = node.depth >= 4 ? slice?.sub : node.depth === 3 ? slice?.entry : node.depth === 2 ? slice?.section : undefined;
  const mark = at?.mark ?? null;
  const statusLine = [
    mark ? MARK_WORD[mark] : '',
    status?.litAt ? `proved ${day(status.litAt)}` : '',
    check?.kind === 'lasting' && check.refreshAt && !status?.ready ? `next refresh ${day(check.refreshAt)}` : check?.kind === 'waiting' ? `next refresh ${day(check.dueAt)}` : '',
  ].filter(Boolean).join(' · ');
  // Inside, a thing kept at several of these places shows its cover once and "see" elsewhere.
  const inside = useMemo(() => !slice || leaf ? [] : slice.sub ? [] : slice.entry ? entryRows(slice.entry.sub) : slice.section ? entryRows(slice.section.entries) : sectionRows(slice.chapter.sections), [slice, leaf]);
  const insideHandlers: Handlers = useMemo(() => { const covers = coverPlaces(inside); return { ...handlers, coverAt: key => covers.get(key) }; }, [handlers, inside]);
  const savedVideos = useMemo(() => book.recent.flatMap(item => item.kind === 'video' ? [{ videoId: item.videoId, title: item.title }] : []), [book]);
  const reels = useMemo(() => content ? content.reelsWithin(nodeId).slice(0, 10).map(content.reelLite) : [], [content, nodeId]);
  // Only a place's own description: a subtitle such as "A territory to explore" is filler, not a claim.
  const description = node.description;

  return <article className="lbx-place" style={hue(nodeId)} data-lbx-place={nodeId}>
    <nav className="lbx-crumbs" aria-label="Where it is">
      <button type="button" className="lbx-back" onClick={onBack} data-action="lbx-back"><Icon name="back" size={16} />Library</button>
      {trail.map(step => <button key={step.id} type="button" onClick={() => handlers.openPlace(step.id)} style={hue(step.id)}>{step.name}</button>)}
    </nav>

    <div className="lbx-place-grid">
      <header className="lbx-place-head">
        <h1>{node.name}</h1>
        {statusLine && <p className={`lbx-status${mark ? ` is-${mark}` : ''}`}>{statusLine}</p>}
        {parent && <button type="button" className="lbx-locator" onClick={() => onNavigate(nodeId)} aria-label={`See ${node.name} on the map`} data-action="lbx-locator">
          <Locator nodeId={nodeId} />
        </button>}
        <button type="button" className="lbx-onmap" onClick={() => onNavigate(nodeId)} data-action="lbx-see-on-map"><Icon name="map" size={16} />See on the map<Icon name="arrow" size={15} /></button>
        {description && <p className="lbx-claim">{description}</p>}
        {content && <section className="lbx-part is-proof" aria-labelledby={`lbx-prove-${nodeId}`}>
          <h2 id={`lbx-prove-${nodeId}`}>Prove it</h2>
          {proofs.length > 0
            ? <ProofList proofs={proofs} exp={exp} here={nodeId} onOpen={handlers.openProof} />
            : <p className="lbx-proofs is-none" data-lbx-proof="none"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".7" strokeLinejoin="round" /></svg><span>No lesson here yet</span></p>}
          {nextCase && <p className="lbx-case-note">Next case · <i>{nextCase.title}</i>{nextCase.setting ? ` · ${nextCase.setting}` : ''}</p>}
        </section>}
      </header>

      <div className="lbx-place-body">
        {things.length > 0 && <section className="lbx-part" aria-labelledby={`lbx-kept-${nodeId}`}>
          <h2 id={`lbx-kept-${nodeId}`}>{leaf ? 'Kept here' : `Kept in ${node.name}`}</h2>
          <ul className="lbx-things">{things.slice(0, shown).map(item => <ThingRow key={item.key} item={item} onOpen={handlers.openItem} />)}</ul>
          {things.length > shown && <button type="button" className="lbx-quiet" onClick={() => setShown(n => n + LIST_PAGE * 2)}>More</button>}
        </section>}

        {notes.length > 0 && <section className="lbx-part" aria-labelledby={`lbx-notes-${nodeId}`}>
          <h2 id={`lbx-notes-${nodeId}`}>Notes</h2>
          <Notes items={notes} onOpen={handlers.openItem} />
        </section>}

        {slice && !leaf && <section className="lbx-part is-inside" aria-labelledby={`lbx-inside-${nodeId}`}>
          <h2 id={`lbx-inside-${nodeId}`}>Inside</h2>
          {slice.sub ? null
            : slice.entry ? <Entries entries={slice.entry.sub} scope={nodeId} handlers={insideHandlers} />
              : slice.section ? <Entries entries={slice.section.entries} scope={nodeId} handlers={insideHandlers} />
                : slice.chapter.sections.map(section => <Section key={section.nodeId} section={section} handlers={insideHandlers} />)}
        </section>}

        {changes.length > 0 && <section className="lbx-part" aria-labelledby={`lbx-changed-${nodeId}`}>
          <h2 id={`lbx-changed-${nodeId}`}>Changed your mind</h2>
          <ul className="lbx-changes">{changes.slice(0, 6).map(change => <li key={change.key}>
            <p className="lbx-prompt">{change.prompt}</p>
            <p><s>{change.was}</s>{change.now && <span>{change.now}</span>}</p>
            <small>{day(change.missedAt)} → {day(change.rightAt)}</small>
          </li>)}</ul>
        </section>}

        {!things.length && !notes.length && !(slice && !leaf) && <p className="lbx-blank">Nothing kept here yet.</p>}

        {onOpenVideo && <WatchStrip nodeId={nodeId} saved={savedVideos} watched={watched} onOpen={onOpenVideo} />}

        {reels.length > 0 && <section className="lbx-part" aria-labelledby={`lbx-reels-${nodeId}`}>
          <h2 id={`lbx-reels-${nodeId}`}>Reels</h2>
          <div className="lbx-strip is-reels">{reels.map(reel => <button key={reel.id} type="button" className="lbx-still is-reel" onClick={() => onOpenReel(reel.id)} data-lbx-reel={reel.id}>
            <span className={`lbx-face is-reel${reel.ink ? ' is-ink' : ''}`}>{reel.image && <img src={reel.image} alt="" loading="lazy" decoding="async" className="is-shown" style={reel.ink ? { objectFit: 'contain' } : { objectPosition: reel.position }} />}<i className="lbx-play is-reel" aria-hidden="true"><Icon name="reel" size={13} /></i></span>
            <b>{reel.title}</b>
          </button>)}</div>
        </section>}

        <footer className="lbx-place-foot">
          <button type="button" className="lbx-quiet" onClick={() => onAddLink(nodeId)} data-action="lbx-add-link"><Icon name="plus" size={16} />Save a link here</button>
          <button type="button" className="lbx-quiet" onClick={() => onNote(nodeId)} data-action="lbx-add-note"><Icon name="plus" size={16} />Write a note</button>
        </footer>
      </div>
    </div>
  </article>;
}
