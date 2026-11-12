import { memo, useEffect, useRef, useState } from 'react';
import { applySound, attachYouTube, audible, detachYouTube, getSound, justUnmuted, mutePlayer, refuseSound, soundAllowed, soundChosenInPlayer, useSound } from '../explore/sound';
import { commandPlayer, embedSrc, forgetPlayerApi, loadPlayerApi, loopedToStart, STATE, WATCH_OVERLAY, type PlayerMark, type YTPlayer } from './youtube';

// The feed's one YouTube player. It is created once and then handed each new video, because
// starting a player costs a phone far more than switching what it plays (about 430 ms of main
// thread at 4× CPU slowdown, against under 60 ms). It plays with Explore's sound (explore/sound.ts),
// applied again after every load and every play. When the browser refuses sound without a tap
// (iOS Safari), it plays muted and the sound button asks for one. Only a video that has loaded and
// still will not start can be a refusal: one that is slow (buffering), or whose load died with the
// network (YouTube knows a video's length once it has loaded it, refused or not), is not. With
// Watch's overlay off nothing is drawn over it; with it on (WATCH_OVERLAY, youtube.ts) the feed lays
// a clear tap layer, its caption and its rail over it, and every player it builds, a rebuilt one
// included, is sized by feed.css's .feed.is-overlay rules and takes no touches.
//
// A player that never gets going (YouTube unreachable when Watch opened, its page an error, a
// request that stalls) says so through onStuck while the feed wants it to play, and the feed builds
// a fresh one in its place: one new iframe per failure, each waiting a little longer, never one per visit.
// A ready player whose video died with the network (a swipe while offline) loads that video again
// once the network is back, where the learner was.
//
// A video YouTube loops instead of ending (some sessions loop every Short, never saying ENDED:
// loopedToStart, youtube.ts) has ended all the same: the player is held at its start and onEnded
// is said, so the feed moves on from a Short as it does from one that ends.

export interface VideoPlayerProps {
  videoId: string;
  title: string;
  /** Seconds in, to pick up where the learner left off. */
  start: number;
  /** Play when true; pause when false. */
  playing: boolean;
  /** This video is playing: said as it starts, and again each second it plays. */
  onPlaying: (videoId: string) => void;
  /** Played to its end (under Watch's overlay it is hidden then, its card's poster showing): a play starts it from the top. */
  onEnded: (videoId: string) => void;
  onProgress: (videoId: string, seconds: number, duration: number) => void;
  /** YouTube's own error for this video (it cannot be played here): the feed skips it. */
  onError: (videoId: string, code: number) => void;
  /** This player will not start: build a new one. Only said while it is meant to play. */
  onStuck: () => void;
  /** Players built before this one that never started: each new one is given longer. */
  attempt: number;
}

/** How long a start with sound may take before it is looked at again. */
const CHECK_MS = 2500;
/** Looks at a player that has not started at all before it counts as refused. */
const UNSTARTED_CHECKS = 2;
/** Looks a buffering start gets before it is left alone: a slow network, not a refusal. */
const BUFFERING_CHECKS = 6;
/** The soonest a player that failed is replaced, doubling with each failure in a row (3, 6, 12, 24, 48 s). */
const RETRY_MS = 3000;
/** A player whose page has loaded and whose API is listening, but which has not said it is ready
 * this long after: its page is an error page (the embed failed to load). */
const ANSWER_MS = 8000;
/** A player not ready this long after it was built: a stalled load (doubling with each retry, 20 s to 160 s). */
const STALL_MS = 20000;
/** How often a player the API does not have yet is told to stay paused, and for how long after its page loads. */
const QUIET_MS = 250;
const QUIET_FOR_MS = 20000;

export const VideoPlayer = memo(function VideoPlayer(props: VideoPlayerProps) {
  const { videoId, title, start, playing } = props;
  const hear = audible(useSound());
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const live = useRef(props);
  live.current = props;
  /** The video the player holds now (the iframe's first one, then each one loaded into it). */
  const current = useRef(videoId);
  // Which video has reached the screen: a new one stays hidden (its card's poster shows) until it plays.
  const [shownId, setShownId] = useState<string | null>(null);
  // The first address decides how it starts; later videos and sound changes go through the API. A
  // player built after one that failed waits for the API to start it (see keepQuiet).
  const [src] = useState(() => embedSrc(videoId, { muted: !audible(getSound()), origin: window.location.origin, start, autoplay: props.attempt === 0 }));
  const check = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The last fall back to muted may have been a slow start, not a refusal: try sound once it plays. */
  const retry = useRef(false);
  const mutedTicks = useRef(0);
  const unmutedTicks = useRef(0);
  /** When the feed last paused the player itself: that pause's own report may land after the next play. */
  const pausedAt = useRef(0);
  // An ended video is not playing, and pausing one makes YouTube's next play stop at 0:00, paused.
  const pause = (target: YTPlayer) => { clearTimeout(check.current); pausedAt.current = Date.now(); if (target.getPlayerState() !== STATE.ENDED) target.pauseVideo(); };
  /** When the video the player holds was last loaded, and when the network was last seen down (its
   * 'offline', and the 'online' that ends it): down since the load, what it was fetching died. */
  const loadedAt = useRef(Date.now());
  const downAt = useRef(0);
  /** The current video was loaded again after stalling with no word from the network (once per video). */
  const stallReloaded = useRef(false);
  /** Where the player was last seen in its video, for telling a loop from a play (loopedToStart).
   * Forgotten whenever the feed loads or seeks, and at an end. */
  const mark = useRef<PlayerMark | null>(null);
  /** Look where the player is: back at the start from its last moments, unasked, it looped instead
   * of ending, so it is held there (as an ended video waits) and has ended. True when it looped. */
  const looped = (target: YTPlayer): boolean => {
    let time: number, duration: number;
    try { time = target.getCurrentTime(); duration = target.getDuration(); } catch { return false; }
    if (!loopedToStart(mark.current, current.current, time)) {
      // Only while playing: a late PAUSED from the video just swiped away would mark the next one with its tail.
      if (duration > 0 && target.getPlayerState() === STATE.PLAYING) mark.current = { videoId: current.current, time, duration };
      return false;
    }
    mark.current = null;
    pause(target);
    if (WATCH_OVERLAY) setShownId(null);
    live.current.onEnded(current.current);
    return true;
  };

  // --- A player that never gets going --------------------------------------------------------------
  const builtAt = useRef(Date.now());
  /** When the iframe's page finished loading, and when the API took the iframe over. */
  const pageAt = useRef(0);
  const apiAt = useRef(0);
  /** Known not to start: the API failed to load, or the network came back after it was built. */
  const failed = useRef(false);
  const stuckCheck = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Before the API has it, a first player starts by itself (autoplay), and the app can neither see
  // nor steer it. One the feed does not want playing (Watch left before it was ready), or whose API
  // failed (it is about to be replaced), is told to pause by message, every QUIET_MS until the API
  // takes it over, for as long as it might still start itself. Only once its page has loaded: a
  // command that arrives before YouTube's own player is up throws inside its page.
  const quiet = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const keepQuiet = () => {
    clearInterval(quiet.current);
    if (live.current.attempt > 0) return;
    const until = Date.now() + QUIET_FOR_MS;
    const hush = () => {
      if (ready.current || (live.current.playing && !failed.current) || Date.now() > until) { clearInterval(quiet.current); return; }
      if (pageAt.current) commandPlayer(frame.current, 'pauseVideo');
    };
    hush();
    quiet.current = setInterval(hush, QUIET_MS);
  };
  /** While meant to play and not ready: say so once this player has had its chance. */
  const watchReady = (now = false) => {
    clearTimeout(stuckCheck.current);
    if (ready.current || !live.current.playing) return;
    const backoff = 2 ** Math.min(live.current.attempt, 4);
    const soonest = builtAt.current + RETRY_MS * backoff;
    const stalled = builtAt.current + STALL_MS * Math.min(backoff, 8);
    const unanswered = pageAt.current && apiAt.current ? Math.max(pageAt.current, apiAt.current) + ANSWER_MS : Infinity;
    const due = now ? 0 : failed.current ? soonest : Math.max(soonest, Math.min(stalled, unanswered));
    stuckCheck.current = setTimeout(() => {
      if (ready.current || !live.current.playing) return;
      // A request still hanging would keep the next player waiting on it too.
      if (!apiAt.current) forgetPlayerApi();
      live.current.onStuck();
    }, Math.max(0, due - Date.now()));
  };

  /** Muted, still playing, asking for a tap. `sure` when the browser said so itself. */
  const fallBack = (target: YTPlayer, sure: boolean) => {
    clearTimeout(check.current);
    refuseSound();
    retry.current = !sure;
    mutePlayer(target);
    if (live.current.playing) target.playVideo();
  };
  /** Load the video the player holds again, where the learner was. */
  const reload = (target: YTPlayer) => {
    const at = target.getCurrentTime();
    loadedAt.current = Date.now();
    mark.current = null;
    target.loadVideoById({ videoId: current.current, startSeconds: at >= 1 ? at : live.current.start });
    applySound(target);
    watchStart(target);
  };
  /** After the feed asks it to play: started, only slow (buffering), a load that died (its video
   * never arrived), or, with sound on, refused? Any report of playing ends the watch. */
  const watchStart = (target: YTPlayer, looks = 0) => {
    clearTimeout(check.current);
    check.current = setTimeout(() => {
      if (!live.current.playing || player.current !== target) return;
      const state = target.getPlayerState();
      if (state === STATE.PLAYING || state === STATE.ENDED) return;
      // Offline nothing can start: the network's return looks again.
      if (navigator.onLine === false) return;
      if (downAt.current > loadedAt.current) { reload(target); return; }
      const arrived = target.getDuration() > 0;
      if (state === STATE.BUFFERING || !arrived) {
        if (looks < BUFFERING_CHECKS) watchStart(target, looks + 1);
        // Still nothing after all that, and no word from the network: a stalled load. Once more.
        else if (!arrived && !stallReloaded.current) { stallReloaded.current = true; reload(target); }
        return;
      }
      // Loaded and not started: ask again once (a play can be swallowed), then take it as refused.
      if (looks + 1 < UNSTARTED_CHECKS) { target.playVideo(); watchStart(target, looks + 1); }
      else if (audible(getSound())) fallBack(target, false);
    }, CHECK_MS);
  };
  const play = (target: YTPlayer) => {
    // Its video died with the network while Watch was away, and the network is back: load it again.
    if (downAt.current > loadedAt.current && navigator.onLine !== false && !(target.getDuration() > 0)) { reload(target); return; }
    applySound(target);
    // Come back to after it ended: from the top, said outright.
    if (target.getPlayerState() === STATE.ENDED) { mark.current = null; target.seekTo(0, true); }
    target.playVideo();
    watchStart(target);
  };

  useEffect(() => {
    let cancelled = false;
    void loadPlayerApi().then(YT => {
      if (cancelled || !frame.current) return;
      player.current = new YT.Player(frame.current, {
        events: {
          onReady: ({ target }) => {
            ready.current = true;
            clearTimeout(stuckCheck.current);
            attachYouTube(target, () => live.current.playing);
            if (current.current !== live.current.videoId) { current.current = live.current.videoId; loadedAt.current = Date.now(); mark.current = null; target.loadVideoById({ videoId: live.current.videoId, startSeconds: live.current.start }); }
            if (!live.current.playing) { applySound(target); pause(target); return; }
            play(target);
          },
          onAutoplayBlocked: ({ target }) => { if (!cancelled && audible(getSound())) fallBack(target, true); },
          onStateChange: ({ data, target }) => {
            if (cancelled) return;
            // Back at the start from its last moments, unasked: YouTube looped it rather than ending it.
            if ((data === STATE.PLAYING || data === STATE.BUFFERING || data === STATE.PAUSED) && looped(target)) return;
            if (data === STATE.PLAYING) {
              clearTimeout(check.current);
              setShownId(current.current);
              live.current.onPlaying(current.current);
              // Playing muted after a start that may only have been slow: try sound once.
              if (retry.current) { retry.current = false; setTimeout(() => { if (!cancelled && live.current.playing) soundAllowed(); }, 1000); }
            }
            // Paused right after being unmuted, while meant to play, and not by the feed: the browser refused the sound.
            if (data === STATE.PAUSED && live.current.playing && audible(getSound()) && justUnmuted() && Date.now() - pausedAt.current > 1000) fallBack(target, true);
            // Ended: YouTube puts its own end screen up (a replay button, related videos). Under Watch's
            // overlay it is hidden, so the card's poster shows instead until the next play.
            if (data === STATE.ENDED) { mark.current = null; if (WATCH_OVERLAY) setShownId(null); live.current.onEnded(current.current); }
          },
          onError: ({ data }) => { if (!cancelled) live.current.onError(current.current, data); },
        },
      });
      apiAt.current = Date.now();
      watchReady();
    }, () => {
      // YouTube unreachable: nothing is wrong with the video, so it is not marked broken.
      if (cancelled) return;
      failed.current = true;
      keepQuiet();
      watchReady();
    });
    // The network came back: anything this player was loading failed while it was gone. Not ready
    // yet: build another. Ready, and its video never arrived: load it again now. Ready mid-video:
    // look in a moment, and load it again if it has not picked up by itself (it usually does).
    const online = () => {
      downAt.current = Date.now();
      if (!ready.current) { failed.current = true; keepQuiet(); watchReady(true); return; }
      const target = player.current;
      if (!target || !live.current.playing) return;
      const state = target.getPlayerState(), arrived = target.getDuration() > 0;
      // Playing, finished, or paused by the learner: nothing to pick up.
      if (state === STATE.PLAYING || state === STATE.ENDED || (state === STATE.PAUSED && arrived)) return;
      if (arrived) watchStart(target);
      else reload(target);
    };
    const offline = () => { downAt.current = Date.now(); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      clearTimeout(check.current);
      clearTimeout(stuckCheck.current);
      clearInterval(quiet.current);
      ready.current = false;
      if (player.current) detachYouTube(player.current);
      try { player.current?.destroy(); } catch { /* already gone */ }
      player.current = null;
    };
  }, []);

  // A new video: switch what the player holds, hidden until it is really playing.
  useEffect(() => {
    const target = player.current;
    if (!target || !ready.current || current.current === videoId) return;
    current.current = videoId;
    loadedAt.current = Date.now();
    stallReloaded.current = false;
    mark.current = null;
    if (playing) { target.loadVideoById({ videoId, startSeconds: start }); applySound(target); watchStart(target); }
    else target.cueVideoById({ videoId, startSeconds: start });
  }, [videoId]);

  useEffect(() => {
    const target = player.current;
    if (!target || !ready.current) { watchReady(); if (!playing) keepQuiet(); return; }
    if (playing) play(target);
    else pause(target);
  }, [playing]);

  // The sound changed (a sound button, a tap that unlocked it, a refusal): apply it at once.
  useEffect(() => {
    const target = player.current;
    if (!target || !ready.current) { if (!hear && pageAt.current) commandPlayer(frame.current, 'mute'); return; }
    applySound(target);
    if (hear && live.current.playing && target.getPlayerState() !== STATE.ENDED) { target.playVideo(); watchStart(target); }
  }, [hear]);

  // Once a second while playing: progress (the feed decides when a video counts as watched), the
  // video shown, and the player kept honest with the sound buttons. Muted while sound is on: apply it again, and if
  // it stays muted, ask for a tap. Unmuted in YouTube's own player: that is the learner's choice.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const target = player.current;
      if (!target || !ready.current || target.getPlayerState() !== STATE.PLAYING) return;
      // A loop that no state change reported (the start already buffered) is seen here.
      if (looped(target)) return;
      // Playing before the API was listening (autoplay can beat the handshake), so no state change
      // ever said so: show it now rather than leave it playing behind its poster, and say it plays.
      setShownId(current.current);
      live.current.onPlaying(current.current);
      live.current.onProgress(current.current, target.getCurrentTime(), target.getDuration());
      const muted = target.isMuted(), sound = getSound();
      mutedTicks.current = audible(sound) && muted ? mutedTicks.current + 1 : 0;
      unmutedTicks.current = !audible(sound) && !muted ? unmutedTicks.current + 1 : 0;
      if (mutedTicks.current === 1) applySound(target);
      if (mutedTicks.current >= 2) { mutedTicks.current = 0; refuseSound(); }
      if (unmutedTicks.current >= 2) { unmutedTicks.current = 0; if (sound.on) soundAllowed(); else soundChosenInPlayer(); }
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  return <iframe
    ref={frame}
    className={`feed-player${shownId === videoId ? ' is-shown' : ''}`}
    src={src}
    title={title}
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
    onLoad={() => { pageAt.current = Date.now(); if (!ready.current && (!live.current.playing || failed.current)) keepQuiet(); watchReady(); }}
    data-player={videoId}
  />;
});
