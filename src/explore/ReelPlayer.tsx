import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { pushRoute } from '../hub/route';
import { timelineFor } from './deck';
import { paintDiagram, ReelDiagramView } from './diagrams';
import { commonsAtWidth, softCopy, softCopyNow } from './media';
import { splitLines } from './narrationText';
import { audible, narration, pauseScore, playWithSound, score as scoreElement, setSound, useSound } from './sound';
import type { ImageFrame, Reel, ReelMedia } from './types';

// One reel, full bleed: it plays the moment it is on screen (opened, or scrolled to), the story on
// its own clock, then an end card. Its prediction never holds it back: the question floats lightly
// near the top for the opening seconds, a tap on a choice keeps the guess (recalled where the story
// settles it) and ignoring it is fine. The clock is the narration when sound is heard (captions follow
// the voice exactly) and a timer when it is off or refused; either way the camera, the diagrams and
// the progress line are painted from it directly, so a playing reel re-renders only when its frame,
// its spoken line or the question's moment changes. Sound is Explore's one preference, and every reel
// shares one narration element (sound.ts). Over it, only the place chip, the caption and a rail of
// Save and Sound. Nothing here records evidence: a guess is kept only in this component's memory.

export type ReelMode = 'active' | 'near' | 'far';
type Phase = 'story' | 'end';
type Size = { w: number; h: number };

/** The question shows from the start until this long before the frame that settles it, at most
 * GUESS_MAX_MS; a window shorter than GUESS_MIN_MS is no window, and the question stays away. */
const GUESS_LEAD_MS = 1200;
const GUESS_MAX_MS = 9000;
const GUESS_MIN_MS = 2500;
/** A choice stays lit this long before the question fades. */
const CHOSEN_MS = 650;
export const guessWindow = (revealStart: number) => { const until = Math.min(revealStart - GUESS_LEAD_MS, GUESS_MAX_MS); return until >= GUESS_MIN_MS ? until : 0; };

export interface ReelPlayerProps {
  reel: Reel;
  mode: ReelMode;
  /** Kept in the Library (pinned). */
  saved: boolean;
  /** The tagged place: its name, its path and its territory color; `hub` when it has nothing to prove yet. */
  place: { name: string; path: string; color: string; hub?: boolean; lesson?: { packId: string; title: string; minutes: number } };
  /** Save: the sheet of places it fits. */
  onSave: (reelId: string) => void;
  /** Changes when the reel is opened by name: it starts again from the top. */
  restart?: number;
  onTag: (nodeId: string) => void;
  onProveIt: (nodeId: string) => void;
  onFinished: (reelId: string) => void;
}

const BASE = import.meta.env.BASE_URL;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;

/** A picture's layer: shown whole (contain) it fills the width over a backdrop, a blurred copy of itself,
 * only where the file may be altered (public domain or CC0, validate.ts's rule for ink, and not an inked
 * engraving) and Commons serves it small; any other shows over the reel's own night (explore.css). The
 * backdrop is made from Commons' 60 px copy (media.ts softCopy), and the layer carries it once it is. */
const BACKDROP_WIDTH = 60;
function backdropOf(media: ReelMedia): string | null {
  if (media.fit !== 'contain' || media.tone === 'ink' || (media.license !== 'Public domain' && media.license !== 'CC0')) return null;
  const small = commonsAtWidth(media.src, BACKDROP_WIDTH);
  return small === media.src ? null : small;
}
function layerOf(media: ReelMedia, backdrops: Readonly<Record<string, string>>): { className: string; style?: CSSProperties } {
  if (media.fit !== 'contain') return { className: media.tone === 'ink' ? ' is-ink' : '' };
  const backdrop = backdrops[media.src];
  return backdrop
    ? { className: ' is-contain has-backdrop', style: { '--reel-backdrop': `url("${backdrop}")` } as CSSProperties }
    : { className: ` is-contain${media.tone === 'ink' ? ' is-ink' : ''}` };
}
/** The backdrops of a reel's whole pictures, by picture: those made already at once, the rest as they
 * come. A poster far down the feed needs only its hero's. */
function useBackdrops(reel: Reel, heroOnly: boolean): Readonly<Record<string, string>> {
  const [backdrops, setBackdrops] = useState<Readonly<Record<string, string>>>(() => Object.fromEntries(Object.values(reel.media).flatMap(media => {
    const small = backdropOf(media), url = small && softCopyNow(small);
    return url ? [[media.src, url]] : [];
  })));
  useEffect(() => {
    let live = true;
    for (const media of heroOnly ? [reel.media[reel.hero]] : Object.values(reel.media)) {
      const small = media && backdropOf(media);
      if (small) void softCopy(small).then(url => { if (live && url) setBackdrops(current => current[media.src] === url ? current : { ...current, [media.src]: url }); });
    }
    return () => { live = false; };
  }, [reel, heroOnly]);
  return backdrops;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Cover the stage with the image, then aim the camera at the frame's focal point and zoom
 * without ever showing past the image's edge (as the expedition's documentary block does). */
function camera(stage: Size, natural: Size, frame: Pick<ImageFrame, 'x' | 'y' | 'zoom'>) {
  const s = Math.max(stage.w / natural.w, stage.h / natural.h);
  const dw = natural.w * s, dh = natural.h * s, z = frame.zoom;
  const limit = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  return {
    dw, dh, z,
    tx: limit(-z * (frame.x / 100 - 0.5) * dw, Math.max(0, (z * dw - stage.w) / 2)),
    ty: limit(-z * (frame.y / 100 - 0.5) * dh, Math.max(0, (z * dh - stage.h) / 2)),
  };
}

function Icon({ name }: { name: 'save' | 'saved' | 'sound' | 'muted' | 'play' | 'check' | 'map' | 'replay' }) {
  const common = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'save': return <svg {...common}><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" /></svg>;
    case 'saved': return <svg {...common}><path d="M7 3.8h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.8a1 1 0 0 1 1-1Z" fill="currentColor" /></svg>;
    case 'sound': return <svg {...common}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
    case 'muted': return <svg {...common}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></svg>;
    case 'play': return <svg {...common} strokeWidth={0}><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" /></svg>;
    case 'check': return <svg {...common} width={16} height={16} strokeWidth={2.2}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
    case 'map': return <svg {...common} width={18} height={18}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15" /></svg>;
    case 'replay': return <svg {...common} width={18} height={18}><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" /></svg>;
  }
}

/** Memoized: a swipe re-renders the feed, and only the reels whose mode changed should follow. */
export const ReelPlayer = memo(function ReelPlayer({ reel, mode, saved, place, onSave, onTag, onProveIt, onFinished, restart = 0 }: ReelPlayerProps) {
  const timeline = useMemo(() => timelineFor(reel), [reel]);
  const backdrops = useBackdrops(reel, mode === 'far');
  const sound = useSound();
  // Off, or refused until a tap: the story runs on its timer, captions only.
  const muted = !audible(sound);
  const soundAsking = sound.on && sound.blocked;
  const audio = useMemo(narration, []);
  const audioUrl = timeline.audio ? `${BASE}${timeline.audio}` : null;
  const active = mode === 'active';
  const [phase, setPhase] = useState<Phase>('story');
  const [choice, setChoice] = useState<string | null>(null);
  // The question's window, on the reel's own clock: open from the start until shortly before the
  // frame that settles it. `guessing` follows the clock (set from paint, only when it changes).
  const guessUntil = useMemo(() => guessWindow(timeline.frames[reel.prediction.reveal]?.start ?? 0), [timeline, reel.prediction.reveal]);
  const [guessing, setGuessing] = useState(guessUntil > 0);
  const guessingRef = useRef(guessing);
  const [chosenAt, setChosenAt] = useState<number | null>(null);
  const [frame, setFrame] = useState(0);
  const [line, setLine] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sized, setSized] = useState(0); // bumps when a stage or image size arrives
  const stageRef = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const natural = useRef<Record<string, Size>>({});
  const stage = useRef<Size>({ w: 0, h: 0 });
  const clock = useRef(0);
  const frameRef = useRef(0);
  const lineRef = useRef(0);
  const applied = useRef<string[]>([]);
  const reduce = useMemo(reducedMotion, []);
  const playing = active && phase === 'story' && !paused;

  // Sizes: the stage, and each image once it has loaded.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      stage.current = { w: entry.contentRect.width, h: entry.contentRect.height };
      applied.current = [];
      setSized(n => n + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Draw frame `f` at progress `p`: the camera on a still, or the diagram's moment. */
  const paintFrame = useCallback((f: number, p: number, t: number) => {
    const spec = reel.frames[f];
    if (!spec) return;
    if (spec.diagram) {
      const svg = layers.current[f]?.querySelector('svg');
      if (svg) paintDiagram(svg, spec.diagram, reduce ? 1 : p, reduce ? 0 : t);
      return;
    }
    const media = reel.media[spec.media];
    const img = imgs.current[f];
    const size = natural.current[spec.media];
    if (!img || !size || !stage.current.w || media.fit === 'contain') return;
    const to = camera(stage.current, size, spec);
    const prev = reel.frames[f - 1];
    const from = prev?.media === spec.media ? camera(stage.current, size, prev) : camera(stage.current, size, { ...spec, zoom: Math.max(1, spec.zoom * 0.88) });
    const key = `${to.dw.toFixed(1)}x${to.dh.toFixed(1)}`;
    if (applied.current[f] !== key) {
      Object.assign(img.style, { width: `${to.dw}px`, height: `${to.dh}px`, left: `${(stage.current.w - to.dw) / 2}px`, top: `${(stage.current.h - to.dh) / 2}px` });
      applied.current[f] = key;
    }
    const e = reduce ? 1 : ease(p);
    const mix = (a: number, b: number) => a + (b - a) * e;
    img.style.transform = `translate3d(${mix(from.tx, to.tx).toFixed(2)}px, ${mix(from.ty, to.ty).toFixed(2)}px, 0) scale(${mix(from.z, to.z).toFixed(4)})`;
  }, [reel, reduce]);

  /** Everything that follows the clock, for time `t` in ms. */
  const paint = useCallback((t: number) => {
    const frames = timeline.frames;
    let f = frames.findIndex(item => t < item.end);
    if (f < 0) f = frames.length - 1;
    const current = frames[f];
    let l = 0;
    current.lines.forEach((item, i) => { if (t >= item.start - 90) l = i; });
    const moved = f !== frameRef.current;
    if (moved) { frameRef.current = f; setFrame(f); }
    if (moved || l !== lineRef.current) { lineRef.current = l; setLine(l); }
    const p = clamp((t - current.start) / Math.max(1, current.end - current.start));
    const open = guessUntil > 0 && t < guessUntil;
    if (open !== guessingRef.current) { guessingRef.current = open; setGuessing(open); }
    paintFrame(f, p, t);
    bars.current.forEach((bar, k) => { if (bar) bar.style.transform = `scaleX(${k < f ? 1 : k === f ? p.toFixed(4) : 0})`; });
  }, [timeline, paintFrame, guessUntil]);

  // While paused or offscreen keep the current moment drawn (and the frames to come at their start).
  useEffect(() => {
    if (mode === 'far') return;
    reel.frames.forEach((spec, i) => { if (i && spec.diagram) paintFrame(i, 0, 0); });
    paint(clock.current);
  }, [mode, phase, sized, paint, paintFrame, reel]);

  /** Start, move or stop the narration to match the clock. Safe to call inside a tap, which is
   * what lets iOS play it; a refusal outside one asks for a tap (sound.ts) while captions keep time. */
  const syncAudio = useCallback((shouldPlay: boolean, mutedNow = muted) => {
    if (!audio || !audioUrl) return;
    const ours = audio.dataset.reel === reel.id;
    if (!shouldPlay || mutedNow) { if (ours) audio.pause(); return; }
    if (!ours) { audio.src = audioUrl; audio.dataset.reel = reel.id; }
    if (Math.abs(audio.currentTime * 1000 - clock.current) > 250) {
      try { audio.currentTime = clock.current / 1000; } catch { /* not seekable yet; the clock waits for it */ }
    }
    playWithSound(audio);
  }, [audio, audioUrl, reel.id, muted]);

  const syncScore = useCallback((shouldPlay: boolean, mutedNow = muted) => {
    if (!reel.score) return;
    if (!shouldPlay || mutedNow) { pauseScore(); return; }
    const element = scoreElement(reel.score.src);
    if (element) playWithSound(element);
  }, [reel.score, muted]);
  useEffect(() => () => { if (reel.score) pauseScore(); }, [reel.score]);

  const finish = useCallback(() => {
    clock.current = timeline.duration;
    paint(timeline.duration - 1);
    setPhase('end');
    onFinished(reel.id);
  }, [timeline.duration, paint, onFinished, reel.id]);

  // The clock: narration time when it is playing and healthy, a timer otherwise.
  useEffect(() => {
    syncAudio(playing);
    syncScore(playing);
    if (!playing) return;
    let last = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      let t = clock.current;
      const voiced = !muted && audio && audioUrl && audio.dataset.reel === reel.id;
      if (voiced && !audio.paused && audio.readyState >= 2 && !audio.error) t = audio.currentTime * 1000;
      else {
        t += dt;
        if (voiced && !audio.error && audio.readyState >= 1 && Math.abs(audio.currentTime * 1000 - t) > 400) {
          try { audio.currentTime = t / 1000; } catch { /* keep going on the timer */ }
        }
      }
      if (t >= timeline.duration - 30) { finish(); return; }
      clock.current = t;
      paint(t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, muted, audio, audioUrl, reel.id, timeline.duration, paint, finish, syncAudio, syncScore]);

  // Space pauses the reel on screen; M toggles sound.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      if (event.key === ' ' && phase === 'story') { event.preventDefault(); togglePause(); }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // A guess: kept, lit for a moment, then the question goes. The story never stopped for it.
  const pick = (id: string) => {
    if (choice) return;
    setChoice(id);
    setChosenAt(Date.now());
  };
  useEffect(() => {
    if (chosenAt === null) return;
    const id = window.setTimeout(() => setChosenAt(null), CHOSEN_MS);
    return () => window.clearTimeout(id);
  }, [chosenAt]);
  const togglePause = () => {
    if (phase !== 'story') return;
    const next = !paused;
    setPaused(next);
    if (!next) { syncAudio(true); syncScore(true); }
  };
  // Heard: off. Off, or refused ("Tap for sound"): on, inside this tap.
  const toggleMute = () => {
    const next = !muted;
    setSound(!next);
    if (phase === 'story' && !paused) { syncAudio(true, next); syncScore(true, next); }
  };
  const replay = () => {
    clock.current = 0;
    frameRef.current = -1;
    applied.current = [];
    setPaused(false);
    setPhase('story');
    paint(0);
    syncAudio(true);
    syncScore(true);
  };

  // Opened by name: from the top, playing (a reel seen before, or ended, included).
  const restarted = useRef(restart);
  useEffect(() => {
    if (restart === restarted.current) return;
    restarted.current = restart;
    clock.current = 0;
    frameRef.current = -1;
    applied.current = [];
    setPaused(false);
    setPhase('story');
    paint(0);
    // The narration may be mid-reel from before: bring it back to the top with the clock.
    syncAudio(active);
    syncScore(active);
  }, [restart, paint, syncAudio, syncScore, active]);

  const credits = useMemo(() => {
    const seen = new Map<string, { label: string; page: string }>();
    for (const media of Object.values(reel.media)) if (!seen.has(media.page)) seen.set(media.page, { label: `${media.credit} · ${media.license}`, page: media.page });
    if (reel.score) seen.set(reel.score.page, { label: `Music: ${reel.score.credit} · ${reel.score.license}`, page: reel.score.page });
    return [...seen.values()];
  }, [reel]);

  const spec = reel.frames[frame];
  const captionLines = splitLines(spec.text);
  const picked = reel.prediction.choices.find(item => item.id === choice);
  const right = choice === reel.prediction.answer;
  const showGuess = phase === 'story' && picked && frame >= reel.prediction.reveal;
  const asking = phase === 'story' && guessing && (!choice || chosenAt !== null);
  const heroMedia = reel.media[reel.hero];
  const heroLayer = layerOf(heroMedia, backdrops);
  const style = { '--reel-color': place.color } as CSSProperties;

  if (mode === 'far') {
    return <div className="reel" style={style} data-reel-id={reel.id} data-phase="poster">
      <div className="reel-stage" ref={stageRef}>
        <div className={`reel-layer is-active${heroLayer.className}`} style={heroLayer.style}>
          <img src={heroMedia.src} alt="" loading="lazy" decoding="async" className="reel-poster" style={heroMedia.fit === 'contain' || !reel.frames[0].media ? undefined : { objectPosition: `${reel.frames[0].x}% ${reel.frames[0].y}%` }} />
        </div>
      </div>
    </div>;
  }

  return <div className={`reel is-${phase}${paused ? ' is-paused' : ''}`} style={style} data-reel-id={reel.id} data-phase={phase} data-frame={frame} aria-roledescription="reel" aria-label={reel.title}>
    <div className="reel-stage" ref={stageRef}>
      {reel.frames.map((item, i) => {
        const on = i === frame;
        if (item.diagram) return <div key={i} ref={el => { layers.current[i] = el; }} className={`reel-layer reel-diagram${on ? ' is-active' : ''}`} aria-hidden={!on}>
          <ReelDiagramView diagram={item.diagram} />
        </div>;
        const media = reel.media[item.media];
        const layer = layerOf(media, backdrops);
        return <div key={i} ref={el => { layers.current[i] = el; }} className={`reel-layer${on ? ' is-active' : ''}${layer.className}`} style={layer.style}>
          <img ref={el => { imgs.current[i] = el; }} src={media.src} alt={on ? media.alt : ''} draggable={false} decoding="async"
            onLoad={event => {
              const el = event.currentTarget;
              if (!natural.current[item.media]) { natural.current[item.media] = { w: el.naturalWidth, h: el.naturalHeight }; setSized(n => n + 1); }
            }} />
        </div>;
      })}
      <div className="reel-shade" aria-hidden="true" />
    </div>

    {phase === 'story' && <button type="button" className="reel-tap" onClick={togglePause} aria-label={paused ? 'Play' : 'Pause'} data-action="reel-pause" />}
    {paused && phase === 'story' && <span className="reel-paused" aria-hidden="true"><Icon name="play" /></span>}

    {asking && <div className={`reel-predict${choice ? ' is-chosen' : ''}`} data-reel-part="prediction">
      <p className="reel-predict-prompt">{reel.prediction.prompt}</p>
      <div className="reel-choices" role="group" aria-label="Your guess">
        {reel.prediction.choices.map(item => <button key={item.id} type="button" className={`reel-choice${choice === item.id ? ' is-on' : ''}`} onClick={() => pick(item.id)} aria-pressed={choice === item.id} data-action="reel-predict" data-choice={item.id}>{item.label}</button>)}
      </div>
    </div>}

    {phase === 'story' && <div className="reel-story" data-reel-part="story">
      {showGuess && <p className={`reel-guess${right ? ' is-right' : ''}`} data-reel-part="guess">{right && <Icon name="check" />}<span>You guessed</span> {picked.label}</p>}
      <button type="button" className="reel-tag" onClick={() => onTag(reel.nodeId)} data-action="reel-tag-story" aria-label={`Show ${place.name} on the map`}><i aria-hidden="true" />{place.name}</button>
      <p className="reel-caption" key={frame} aria-live="polite">
        {captionLines.map((text, i) => <span key={i} className={i < line ? 'is-said' : i === line ? 'is-saying' : 'is-coming'}>{text} </span>)}
      </p>
      {spec.media && <p className="reel-credit">{reel.media[spec.media].credit}</p>}
    </div>}

    {phase === 'end' && <div className="reel-end" data-reel-part="end">
      <p className="reel-end-idea">{reel.takeaway}</p>
      <button type="button" className="reel-place" onClick={() => onTag(reel.nodeId)} data-action="reel-tag" data-node-id={reel.nodeId}>
        <i aria-hidden="true" /><span><strong>{place.name}</strong><small>{place.path}</small></span><Icon name="map" />
      </button>
      <div className="reel-end-actions">
        {place.lesson && <button type="button" className="reel-prove" onClick={() => pushRoute({ kind: 'expedition', packId: place.lesson!.packId, beat: 0, from: reel.nodeId })} data-action="reel-lesson" data-pack-id={place.lesson.packId}>{place.lesson.title} · {place.lesson.minutes} min</button>}
        {!place.lesson && <button type="button" className="reel-prove" onClick={() => onProveIt(reel.nodeId)} data-action={place.hub ? 'reel-hub' : 'prove-it'} data-node-id={reel.nodeId}>{place.hub ? `Open ${place.name}` : 'Try a new case'}</button>}
        <button type="button" className="reel-again" onClick={replay} data-action="reel-replay"><Icon name="replay" />Watch again</button>
      </div>
      <ul className="reel-credits" aria-label="Credits">
        {credits.map(item => <li key={item.page}><a href={item.page} target="_blank" rel="noreferrer">{item.label}</a></li>)}
        {audioUrl && <li>Voice: synthetic, Piper with the LJ Speech voice · Public domain</li>}
      </ul>
    </div>}

    <div className="reel-rail">
      <button type="button" className={`reel-rail-button${muted ? ' is-muted' : ''}${soundAsking && phase === 'story' ? ' is-asking' : ''}`} onClick={toggleMute} aria-pressed={!muted} aria-label={soundAsking ? 'Tap for sound' : muted ? 'Turn sound on' : 'Turn sound off'} data-action="reel-sound" data-sound-control="">
        <Icon name={muted ? 'muted' : 'sound'} />
      </button>
      <button type="button" className={`reel-rail-button${saved ? ' is-on' : ''}`} onClick={() => onSave(reel.id)} aria-pressed={saved} aria-label={saved ? `${reel.title}: saved, change where` : `Save ${reel.title}`} data-action="reel-save">
        <Icon name={saved ? 'saved' : 'save'} />
      </button>
    </div>

    <div className="reel-progress" aria-hidden="true">
      {reel.frames.map((_, i) => <i key={i}><b ref={el => { bars.current[i] = el; }} /></i>)}
    </div>
  </div>;
});
