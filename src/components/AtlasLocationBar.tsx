import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { catalog, type AtlasNode } from '../core/catalog';

/** Where you are, and one way into the place's hub. Back and the trail stay live mid-flight: a click redirects the camera. */
export function AtlasLocationBar({ node, busy, onNavigate, onOpen, action }: {
  node: AtlasNode;
  busy: boolean;
  onNavigate: (id: string) => void;
  onOpen: () => void;
  /** Replaces the Open pill, e.g. a hub's way back to the map. */
  action?: ReactNode;
}) {
  const trail = catalog.getPath(node);
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [node.id]);
  const name = node.depth ? node.name : 'All knowledge';
  return <nav className={`location-bar atlas-location-bar${node.parentId ? '' : ' is-world'}`} aria-label="Your location">
    {node.parentId && <button className="location-back atlas-step-back" onClick={() => onNavigate(node.parentId!)}
      aria-label={`Return to ${catalog.get(node.parentId)?.name}`} data-action="parent-return">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h15"/></svg>
    </button>}
    <div className="atlas-location-trail" ref={scrollRef}>
      {trail.slice(0, -1).map(ancestor => <span className="atlas-ancestor" key={ancestor.id}>
        <button onClick={() => onNavigate(ancestor.id)} aria-label={`Go to ${ancestor.depth ? ancestor.name : 'the whole map'}`} data-action="breadcrumb-navigate" data-node-id={ancestor.id}>{ancestor.depth ? ancestor.name : 'All knowledge'}</button>
        <span className="atlas-path-separator" aria-hidden="true">/</span>
      </span>)}
      <span className="location-current atlas-current-place" aria-current="location">
        <i className="atlas-current-light" aria-hidden="true"/><span>{name}</span>
      </span>
    </div>
    {action ?? <button className={`atlas-open-place${node.depth ? ' is-place' : ''}`} disabled={busy} onClick={onOpen} data-action="open-place" aria-label={node.depth ? `Open ${node.name}` : 'Open the atlas overview'}>
      <span className="atlas-open-label">{node.depth ? <>Open<span className="atlas-open-name"> {node.name}</span></> : 'Overview'}</span>
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5"/></svg>
    </button>}
  </nav>;
}
