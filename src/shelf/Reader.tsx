import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AutoPlace } from '../auto/types';
import './shelf.css';

/** Share of the read's minutes the Reader must be open before reaching the end counts as reading it. */
export const READ_SHARE = 0.2;

export interface ReaderProps {
  place: AutoPlace;
  onClose: () => void;
  /** Called once: the end was reached and the Reader has been open long enough. */
  onDone: () => void;
}

/** A place's long read, full screen: its picture, its paragraphs, and where it comes from. */
export function Reader({ place, onClose, onDone }: ReaderProps) {
  const read = place.read;
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const opened = useRef(Date.now());
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const target = end.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setReachedEnd(true); }, { root: scroller.current, threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!reachedEnd || !read || finished.current) return;
    const wait = Math.max(0, read.minutes * 60_000 * READ_SHARE - (Date.now() - opened.current));
    const timer = setTimeout(() => { if (finished.current) return; finished.current = true; onDoneRef.current(); }, wait);
    return () => clearTimeout(timer);
  }, [reachedEnd, read]);

  if (!read) return null;
  const host = document.querySelector<HTMLElement>('.studio-shell') ?? document.body;
  return createPortal(<div className="shelf-reader" role="dialog" aria-modal="true" aria-labelledby="shelf-reader-title" data-reader={place.nodeId}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); onClose(); } }}>
    <header className="shelf-reader-bar">
      <span className="shelf-reader-meta">{read.minutes} min read</span>
      <button type="button" ref={close} className="shelf-reader-close" onClick={onClose} aria-label="Close the read" data-action="reader-close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
    </header>
    <div className="shelf-reader-scroll" ref={scroller}>
      <article className="shelf-reader-page">
        <h1 id="shelf-reader-title">{place.name}</h1>
        {place.image && <figure className="shelf-reader-figure">
          <img src={place.image.src} alt={place.image.alt} />
          <figcaption><a href={place.image.page} target="_blank" rel="noreferrer">{place.image.credit} · {place.image.license}</a></figcaption>
        </figure>}
        {read.paragraphs.map((paragraph, index) => <section key={index} className="shelf-reader-part">
          {paragraph.heading && <h2>{paragraph.heading}</h2>}
          <p>{paragraph.text}</p>
        </section>)}
        <div ref={end} className="shelf-reader-end" data-reader-end="">
          <p className="shelf-reader-source">From <a href={place.source.url} target="_blank" rel="noreferrer" title={place.source.title}>Wikipedia</a>, CC BY-SA</p>
          <button type="button" className="hub-secondary" onClick={onClose}>Back to {place.name}</button>
        </div>
      </article>
    </div>
  </div>, host);
}
