import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { catalog } from '../../core/catalog';
import { coverUrl } from '../../notebook/openLibrary';
import { domainOf } from '../../notebook/libraryStore';
import type { IndexItem } from './indexModel';
import { hue, Icon } from './marks';
import { PROOF_WORD, type Proof } from './proof';

/*
 * The things themselves, as small as a catalogue prints them: a book or film by its cover, a video
 * by its frame, a reel by its still, a link by its page's image (or its site, set in type), a note by
 * its mark. Every tile carries its place's color in a hairline.
 */

const toneOf = (key: string) => [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;

/** An image that steps aside for its typeset stand-in when it fails or turns out to be a blank. */
function Picture({ src, position, contain, fallback }: { src: string; position?: string; contain?: boolean; fallback: ReactNode }) {
  const [state, setState] = useState<'loading' | 'shown' | 'failed'>('loading');
  if (state === 'failed') return <>{fallback}</>;
  return <>
    {state !== 'shown' && fallback}
    <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={state === 'shown' ? 'is-shown' : undefined}
      style={contain ? { objectFit: 'contain' } : position ? { objectPosition: position } : undefined}
      onLoad={event => setState(event.currentTarget.naturalWidth > 2 ? 'shown' : 'failed')} onError={() => setState('failed')} />
  </>;
}

function TypeFace({ title, by, tone }: { title: string; by?: string; tone: string }) {
  return <span className="lbx-typeface" style={{ ['--tone' as string]: `hsl(${toneOf(tone)} 22% 24%)` } as CSSProperties}><b>{title}</b>{by && <small>{by}</small>}</span>;
}

export const placeName = (item: IndexItem) => item.nodeIds[0] ? catalog.get(item.nodeIds[0])?.name ?? '' : '';

/** The picture of one thing, at the tile's size. */
export function ItemFace({ item }: { item: IndexItem }) {
  switch (item.kind) {
    case 'work': {
      const { work } = item;
      const face = <TypeFace title={work.title} by={work.creator} tone={work.key} />;
      return <span className={`lbx-face is-cover is-${work.kind}`}>{work.cover ? <Picture src={coverUrl(work.cover, 'M')} fallback={face} /> : face}</span>;
    }
    case 'video':
      return <span className="lbx-face is-video">
        <Picture src={`https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`} fallback={<TypeFace title={item.title} tone={item.key} />} />
        <i className="lbx-play" aria-hidden="true"><Icon name="play" size={12} /></i>
      </span>;
    case 'reel':
      return <span className={`lbx-face is-reel${item.reel.ink ? ' is-ink' : ''}`}>
        {item.reel.image ? <Picture src={item.reel.image} position={item.reel.position} contain={item.reel.ink} fallback={<TypeFace title={item.title} tone={item.key} />} /> : <TypeFace title={item.title} tone={item.key} />}
        <i className="lbx-play is-reel" aria-hidden="true"><Icon name="reel" size={13} /></i>
      </span>;
    case 'link': {
      const site = item.link.preview?.siteName || domainOf(item.link.url).replace(/^en\./, '');
      const face = <span className="lbx-site"><b>{item.title}</b><small><Icon name="link" size={11} /><span>{site}</span></small></span>;
      return <span className="lbx-face is-link">{item.link.preview?.image ? <Picture src={item.link.preview.image} fallback={face} /> : face}</span>;
    }
    case 'idea': case 'question':
      return <span className={`lbx-face is-note is-${item.kind}`}><b aria-hidden="true">{item.kind === 'question' ? '?' : '“'}</b><span>{item.title}</span></span>;
  }
}

const KIND_WORD: Record<IndexItem['kind'], string> = { work: '', video: 'Video', reel: 'Reel', link: 'Link', idea: 'Note', question: 'Question' };
export const kindWord = (item: IndexItem) => item.kind === 'work' ? item.work.format : KIND_WORD[item.kind];

export function Tile({ item, onOpen, caption, hueId }: { item: IndexItem; onOpen: (item: IndexItem) => void; caption?: boolean; hueId?: string }) {
  const label = `${item.title}${caption ? '' : `, ${kindWord(item)}`}`;
  return <button type="button" className={`lbx-tile is-${item.kind}`} style={hue(hueId ?? item.nodeIds[0])} onClick={() => onOpen(item)} aria-label={label} title={caption ? undefined : item.title} data-lbx-item={item.key}>
    <ItemFace item={item} />
    {caption && <span className="lbx-caption"><b>{item.title}</b><small>{placeName(item) || kindWord(item)}</small></span>}
  </button>;
}

const HEXAGON = 'M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6Z';

export function ProofTile({ proof, here, onOpen }: { proof: Proof; here: string; onOpen: (proof: Proof) => void }) {
  const elsewhere = proof.nodeId !== here;
  const name = catalog.get(proof.nodeId)?.name ?? '';
  return <button type="button" className={`lbx-tile lbx-proof is-${proof.kind}`} style={hue(proof.nodeId)} onClick={() => onOpen(proof)}
    aria-label={`${PROOF_WORD[proof.kind]}: ${name}`} data-lbx-proof={proof.kind} data-node-id={proof.nodeId}>
    <span className="lbx-face">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={HEXAGON} fill={proof.kind === 'proved' ? 'currentColor' : 'none'} fillOpacity=".35" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
      <em>{PROOF_WORD[proof.kind]}</em>
      {elsewhere && <small>{name}</small>}
    </span>
  </button>;
}

/** A thing whose cover sits at another place in the book: its title set in type, and where to find it. */
export function RefTile({ item, at, onOpen }: { item: IndexItem; at: string; onOpen: (item: IndexItem) => void }) {
  const place = catalog.get(at)?.name ?? '';
  return <button type="button" className={`lbx-tile lbx-ref is-${item.kind}`} style={hue(at)} onClick={() => onOpen(item)} aria-label={`${item.title}, see ${place}`} data-lbx-item={item.key} data-lbx-ref={at}>
    <span className="lbx-face"><b>{item.title}</b><small><i>see</i> {place}</small></span>
  </button>;
}

/** Where the atlas has no lesson or case to offer yet: the end of the section, said plainly. */
export function NoProofTile({ nodeId }: { nodeId: string }) {
  return <span className="lbx-tile lbx-proof is-none" style={hue(nodeId)} data-lbx-proof="none" data-node-id={nodeId}>
    <span className="lbx-face">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={HEXAGON} fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity=".7" strokeLinejoin="round" /></svg>
      <em>No lesson yet</em>
    </span>
  </span>;
}

/** A row of tiles that draws itself only as it nears the screen, so a long index stays light. */
export function LazyRow({ children, className = '' }: { children: () => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near || !ref.current) return;
    // The page scrolls inside its workspace, so that is the root the margin must widen (a scroll
    // container clips what the viewport's margin would otherwise reach).
    const root = ref.current.closest<HTMLElement>('.notebook-workspace');
    const watcher = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setNear(true); watcher.disconnect(); } }, { root, rootMargin: '900px 0px' });
    watcher.observe(ref.current);
    return () => watcher.disconnect();
  }, [near]);
  return <div ref={ref} className={`lbx-row ${className}`} data-lbx-row={near ? 'drawn' : 'waiting'}>{near ? children() : null}</div>;
}
