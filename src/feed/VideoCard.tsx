import { memo, useState, type CSSProperties } from 'react';
import { catalog } from '../core/catalog';
import { territoryColor } from '../core/territoryTheme';
import type { FeedVideo } from './pool';
import { MIN_POSTER_WIDTH, posterUrls } from './youtube';

// One video, phone first: the frame the feed's one player sits in (vertical for Shorts, wide for
// the rest; its poster shows until the player arrives), and as little over it as will do: the place
// chip that flies the atlas there with the channel in small type beside it, the title (up to two
// lines), and a rail of two controls, Save and Sound. With Watch's overlay on (WATCH_OVERLAY,
// youtube.ts) the frame fills the screen and these float over it, as on a short-video app; with it
// off they sit beneath the frame.

export type CardMode = 'active' | 'near' | 'far';

export interface VideoCardProps {
  video: FeedVideo;
  /** Its shape (width over height): the pool's, or the one its portrait poster showed (FeedPanel). */
  aspect: number;
  channel: string;
  mode: CardMode;
  /** The learner's sound choice (explore/sound.ts). */
  sound: boolean;
  /** Sound is on but this browser wants a tap first: the button asks (a pulse; "Tap for sound" to a screen reader). */
  soundBlocked: boolean;
  /** Kept in the Library. */
  saved: boolean;
  onPlace: (video: FeedVideo) => void;
  onSave: (video: FeedVideo) => void;
  onSound: () => void;
  /** A Short's poster showed a shape other than the pool's (every Short is listed as 9:16). */
  onAspect: (videoId: string, aspect: number) => void;
}

export function RailIcon({ name }: { name: 'save' | 'saved' | 'sound' | 'muted' }) {
  const common = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'save': return <svg {...common}><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" /></svg>;
    case 'saved': return <svg {...common}><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" fill="currentColor" /></svg>;
    case 'sound': return <svg {...common}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
    case 'muted': return <svg {...common}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></svg>;
  }
}

/** The poster, with a fallback when a Short has no full-size portrait thumbnail. That full-size frame
 * (posterUrls' first for a Short) has the video's own shape, so it also says when a Short is not
 * 9:16 (square, 4:3): the pool lists every Short as 9:16, because that is all oEmbed reports. */
function Poster({ video, eager, onAspect }: { video: FeedVideo; eager: boolean; onAspect: VideoCardProps['onAspect'] }) {
  const sources = posterUrls(video, 'full');
  const [index, setIndex] = useState(0);
  const next = () => setIndex(i => Math.min(i + 1, sources.length - 1));
  const loaded = (img: HTMLImageElement) => {
    if (img.naturalWidth < MIN_POSTER_WIDTH) { next(); return; }
    const shape = img.naturalWidth / img.naturalHeight;
    if (video.short && index === 0 && Math.abs(shape - video.aspect) > 0.03) onAspect(video.id, Math.round(shape * 1000) / 1000);
  };
  return <img className="feed-poster" src={sources[index]} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
    onLoad={event => loaded(event.currentTarget)} onError={next} />;
}

export const VideoCard = memo(function VideoCard({ video, aspect, channel, mode, sound, soundBlocked, saved, onPlace, onSave, onSound, onAspect }: VideoCardProps) {
  const place = catalog.get(video.places[0]);
  const tall = aspect < 1;
  // The poster again, blurred behind a wide video when it floats in the middle of a tall screen.
  const style = { '--place-color': territoryColor(video.places[0]), '--frame-aspect': String(aspect), '--backdrop': `url("${posterUrls(video, 'card')[0]}")` } as CSSProperties;
  const audible = sound && !soundBlocked;
  return <article className={`feed-card feed-video ${tall ? 'is-tall' : 'is-wide'}`} style={style} data-video-id={video.id} data-mode={mode} aria-label={video.title}>
    <div className="feed-stage">
      <div className="feed-frame" data-frame={video.id}>
        <Poster video={video} eager={mode !== 'far'} onAspect={onAspect} />
      </div>
    </div>
    <div className="feed-shade" aria-hidden="true" />
    <div className="feed-meta">
      <div className="feed-line">
        <button type="button" className="feed-chip" onClick={() => onPlace(video)} data-action="feed-place" data-node-id={video.places[0]} aria-label={`Show ${place?.name ?? 'this place'} on the map`}>
          <i aria-hidden="true" /><span>{place?.name}</span>
        </button>
        {channel && <span className="feed-channel">{channel}</span>}
      </div>
      <h2 className="feed-title">{video.title}</h2>
    </div>
    <div className="feed-actions">
      <button type="button" className={`feed-action${saved ? ' is-on' : ''}`} onClick={() => onSave(video)} aria-pressed={saved} aria-label={saved ? 'Saved: change where' : 'Save'} data-action="feed-save"><RailIcon name={saved ? 'saved' : 'save'} /></button>
      <button type="button" className={`feed-action${audible ? ' is-on' : ''}${soundBlocked ? ' is-asking' : ''}`} onClick={onSound} aria-pressed={audible} aria-label={soundBlocked ? 'Tap for sound' : audible ? 'Turn sound off' : 'Turn sound on'} data-action="feed-sound" data-sound-control=""><RailIcon name={audible ? 'sound' : 'muted'} /></button>
    </div>
  </article>;
});
