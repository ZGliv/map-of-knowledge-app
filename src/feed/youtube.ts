// The YouTube source, kept in one place so it can be swapped: thumbnails from i.ytimg.com, the
// official IFrame Player on youtube-nocookie.com, and the link out. Nothing else in the feed
// knows it is YouTube.
//
// The player is YouTube's own iframe, created by us (so we control its attributes) and then
// driven through the IFrame Player API: plays inline on iOS and sends the page's origin as its
// Referer (YouTube refuses embeds without one). With WATCH_OVERLAY off it is never covered by our
// own controls; with it on, Watch draws over it (FeedPanel, feed.css .feed.is-overlay).

import type { FeedVideo } from './pool';

export const PROVIDER = 'youtube';
export const EMBED_HOST = 'https://www.youtube-nocookie.com';
export const PRECONNECT = ['https://i.ytimg.com', EMBED_HOST, 'https://www.youtube.com'];

/** Thumbnails, best first. A Short's full-size portrait frame (oar2; its custom oardefault is
 * missing for about a third of them) and then hqdefault, which everything has. A missing one may
 * still answer with a small placeholder, so callers treat anything narrower than MIN_POSTER_WIDTH
 * as missing. */
export function posterUrls(video: Pick<FeedVideo, 'id' | 'short'>, size: 'full' | 'card'): string[] {
  const base = `https://i.ytimg.com/vi/${video.id}`;
  if (video.short && size === 'full') return [`${base}/oar2.jpg`, `${base}/hqdefault.jpg`];
  return [`${base}/hqdefault.jpg`];
}
export const MIN_POSTER_WIDTH = 200;
/** The shape a video's frame and the player are laid out by. The pool lists shapes rounded (a 16:9
 * video as 1.77), and at 1.77 the player is a hair taller than the video it holds, so YouTube's black
 * showed as a line along a wide video's edge: anything that close to 16:9 is laid out at 16:9. */
export const frameAspect = (listed: number): number => Math.abs(listed - 16 / 9) < 0.01 ? 16 / 9 : listed;

export const watchUrl = (video: Pick<FeedVideo, 'id' | 'short'>) => video.short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`;
/** The address a pinned video is saved under in the Library (one form, so pins are found again). */
export const libraryUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
export const videoIdFromUrl = (url: string): string | null => url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;

// YouTube's developer policies forbid overlays on its embedded player in public apps; MoK is personal-use only, so set this false if it goes public.
/** Watch fills the screen like a short-video app: the player covers it, cropped to fill, a clear tap
 * layer pauses and plays it, and our caption and rail of controls float over it. */
export const WATCH_OVERLAY = true;

/** The player's address. `autoplay` (the default) starts it by itself, before the API is listening. */
export function embedSrc(videoId: string, { muted, origin, start = 0, autoplay = true }: { muted: boolean; origin: string; start?: number; autoplay?: boolean }): string {
  const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', autoplay: autoplay ? '1' : '0', mute: muted ? '1' : '0', rel: '0', iv_load_policy: '3', origin, widget_referrer: origin });
  if (start >= 1) params.set('start', String(Math.floor(start)));
  // Under the overlay the player takes no touches, so its own controls could only get in the way.
  if (WATCH_OVERLAY) params.set('controls', '0');
  return `${EMBED_HOST}/embed/${videoId}?${params}`;
}

// --- The IFrame Player API, loaded once --------------------------------------------------------

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (element: HTMLIFrameElement | HTMLElement, options: { events: Record<string, (event: { data: number; target: YTPlayer }) => void> }) => YTPlayer;
}
type YTWindow = Window & { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };

export const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

/** Where a player was last seen in the video it holds. */
export interface PlayerMark { videoId: string; time: number; duration: number }
/** How near its end a video must have been seen, and how near its start it must be now, for the
 * jump between them to be a loop (a third of the video, for one under nine seconds). */
export const LOOP_SPAN_S = 3;
/** In some sessions YouTube loops a Short instead of ending it, as its own Shorts player does: from
 * its last moments it jumps back to the start and plays on, and ENDED is never reported (seen on
 * 2026-10-27 in some sessions and not others, then for every Short in that session; long videos
 * still end).
 * Seen near its end and now back near its start, the same video, with no load or seek from the
 * feed in between (the feed forgets its mark whenever it loads or seeks): it has ended. */
export function loopedToStart(mark: PlayerMark | null, videoId: string, time: number): boolean {
  if (!mark || mark.videoId !== videoId || !(mark.duration > 0)) return false;
  const span = Math.min(LOOP_SPAN_S, mark.duration / 3);
  return mark.time >= mark.duration - span && time < span && time < mark.time;
}

let api: Promise<YTNamespace> | null = null;
/** The API, loaded once. A load that fails (either of its two scripts) is forgotten, so the next
 * call tries again from the start; so is one given up on with forgetPlayerApi. */
export function loadPlayerApi(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  return api ??= new Promise<YTNamespace>((resolve, reject) => {
    // A half-loaded API (its loader ran, the player script never arrived) makes a new loader do
    // nothing: start clean.
    if (w.YT && !w.YT.Player) w.YT = undefined;
    document.getElementById('www-widgetapi-script')?.remove();
    const done = () => document.removeEventListener('error', onScriptError, true);
    const fail = () => { done(); api = null; reject(new Error('The video player could not load.')); };
    // The loader adds YouTube's player script itself, and that script's failure reports nowhere else.
    const onScriptError = (event: Event) => { if ((event.target as Element | null)?.id === 'www-widgetapi-script') fail(); };
    document.addEventListener('error', onScriptError, true);
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { previous?.(); done(); if (w.YT?.Player) resolve(w.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
}
/** Tell a player the API does not have yet to do something, with the message the API itself
 * would send. It cannot answer, so this can only steer it (used to keep such a player quiet). */
export function commandPlayer(frame: HTMLIFrameElement | null, func: 'pauseVideo' | 'mute'): void {
  try { frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), EMBED_HOST); } catch { /* gone */ }
}
/** Give up on a load still waiting (a stalled request): the next player asks again. */
export function forgetPlayerApi(): void {
  if (!(window as YTWindow).YT?.Player) api = null;
}

/** Warm the connections a first play will need. Safe to call more than once. */
export function preconnect(): void {
  for (const href of PRECONNECT) {
    if (document.head.querySelector(`link[rel=preconnect][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = '';
    document.head.appendChild(link);
  }
}
