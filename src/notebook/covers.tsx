import { useState, type CSSProperties } from 'react';
import { territoryColor } from '../core/territoryTheme';
import type { SavedLink } from './libraryStore';
import { coverUrl } from './openLibrary';

/** Small line icons, drawn like the rest of the Library's. */
export type GlyphName = 'search' | 'plus' | 'close' | 'link' | 'back' | 'chevron' | 'upload' | 'external' | 'check' | 'arrow';
export function Glyph({ name }: { name: GlyphName }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></>}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'close' && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    {name === 'back' && <path d="M14.5 6 8.5 12l6 6" />}
    {name === 'chevron' && <path d="m9.5 6 6 6-6 6" />}
    {name === 'arrow' && <path d="M5 12h13m-5-5 5 5-5 5" />}
    {name === 'check' && <path d="m5.5 12.5 4 4 9-9.5" />}
    {name === 'upload' && <><path d="M12 15V4.5m-4.5 4.5L12 4.5 16.5 9" /><path d="M5 14.5v4a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-4" /></>}
    {name === 'external' && <><path d="M13.5 5.5H18.5V10.5" /><path d="M18.5 5.5 11 13" /><path d="M16.5 13.5v4a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V9.5A1.5 1.5 0 0 1 7 8h4" /></>}
    {name === 'link' && <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>}
  </svg>;
}

export const hueStyle = (nodeId: string | null | undefined) => (nodeId ? { ['--place' as string]: territoryColor(nodeId) } as CSSProperties : undefined);
const toneOf = (key: string) => [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;

export type CoverSize = 'small' | 'medium' | 'large';

/** A typographic cover: the title and maker on a tone of their own. Every item has one. */
export function TypeCover({ title, creator, tone, size = 'medium' }: { title: string; creator: string; tone: string; size?: CoverSize }) {
  return <span className={`lib-cover is-${size}`} style={{ ['--cover' as string]: `hsl(${toneOf(tone)} 32% 30%)` } as CSSProperties} aria-hidden="true">
    <b>{title}</b>{size !== 'small' && <small>{creator}</small>}
  </span>;
}

/** An item's cover: Open Library's when it has one (by cover ID, straight from covers.openlibrary.org),
 * else the typographic one, which also stands in while the image loads and if it fails. */
export function ItemCover({ title, creator, cover, tone, size = 'medium' }: { title: string; creator: string; cover: number | null; tone: string; size?: CoverSize }) {
  const [state, setState] = useState<'loading' | 'shown' | 'failed'>('loading');
  if (!cover || state === 'failed') return <TypeCover title={title} creator={creator} tone={tone} size={size} />;
  return <span className={`lib-cover is-${size} is-photo${state === 'shown' ? ' is-shown' : ''}`} style={{ ['--cover' as string]: `hsl(${toneOf(tone)} 32% 30%)` } as CSSProperties} aria-hidden="true">
    {state !== 'shown' && <b>{title}</b>}
    <img src={coverUrl(cover, size === 'large' ? 'L' : 'M')} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onLoad={event => setState(event.currentTarget.naturalWidth > 1 ? 'shown' : 'failed')} onError={() => setState('failed')} />
  </span>;
}

/** A saved link's thumbnail: the page's own image when it named one, else the link mark in its place's color. */
export function LinkThumb({ link, size = 'small' }: { link: SavedLink; size?: 'small' | 'wide' }) {
  const [failed, setFailed] = useState(false);
  const image = link.preview?.image;
  if (image && !failed) return <span className={`lib-link-thumb is-${size}`} style={hueStyle(link.nodeId)} aria-hidden="true">
    <img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  </span>;
  return <span className={`lib-link-mark${size === 'wide' ? ' is-wide' : ''}`} style={hueStyle(link.nodeId)} aria-hidden="true"><Glyph name="link" /></span>;
}
