import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DocFrame, DocumentaryBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Credit } from './ui';

// A "documentary" is a film made from data: archival images, a focal point and
// zoom per caption, timed text, optional narration and a period score. Any pack
// with public-domain images gets one without filming anything.

type Size = { w: number; h: number };

function placement(stage: Size, natural: Size, frame: DocFrame) {
  const s = Math.max(stage.w / natural.w, stage.h / natural.h);
  const dw = natural.w * s, dh = natural.h * s;
  const z = frame.zoom;
  const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
  const tx = clamp(-z * (frame.x / 100 - 0.5) * dw, Math.max(0, (z * dw - stage.w) / 2));
  const ty = clamp(-z * (frame.y / 100 - 0.5) * dh, Math.max(0, (z * dh - stage.h) / 2));
  return { dw, dh, transform: `translate(${tx}px, ${ty}px) scale(${z})` };
}

export function Documentary({ beat }: { beat: DocumentaryBeat }) {
  const { media, done } = useBeat();
  const stageRef = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const score = useRef<HTMLAudioElement>(null);
  const motion = useRef<Animation | null>(null);
  const [stage, setStage] = useState<Size>({ w: 0, h: 0 });
  const [natural, setNatural] = useState<Record<string, Size>>({});
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(false);
  const [music, setMusic] = useState(!!beat.score);
  const [finished, setFinished] = useState(false);
  const frames = beat.frames;
  const frame = frames[index];

  const finish = useCallback(() => { setFinished(true); setPlaying(false); done(); }, [done]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setStage({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pan and zoom the active frame from where the previous frame left off.
  useEffect(() => {
    const el = imgs.current[index];
    const size = natural[frame.media];
    if (!el || !size || !stage.w) return;
    const to = placement(stage, size, frame);
    const prev = frames[index - 1];
    const from = prev && prev.media === frame.media
      ? placement(stage, size, prev)
      : placement(stage, size, { ...frame, zoom: Math.max(1, frame.zoom * 0.9) });
    el.style.width = `${to.dw}px`; el.style.height = `${to.dh}px`;
    el.style.left = `${(stage.w - to.dw) / 2}px`; el.style.top = `${(stage.h - to.dh) / 2}px`;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = el.animate([{ transform: from.transform }, { transform: to.transform }],
      { duration: reduce ? 1 : frame.seconds * 1000, easing: 'cubic-bezier(.33,.0,.3,1)', fill: 'forwards' });
    motion.current = animation;
    return () => { animation.cancel(); motion.current = null; };
  }, [index, natural, stage, frame, frames]);

  // Pausing freezes the camera where it is; resuming finishes the same frame.
  useEffect(() => {
    const animation = motion.current;
    if (animation) { if (playing) animation.play(); else animation.pause(); }
    if (!playing) return;
    const elapsed = Number(animation?.currentTime ?? 0);
    const id = window.setTimeout(() => {
      if (index < frames.length - 1) setIndex(index + 1); else finish();
    }, Math.max(300, frame.seconds * 1000 - elapsed));
    return () => window.clearTimeout(id);
  }, [index, playing, frame.seconds, frames.length, finish]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!voice || !playing) return;
    const line = new SpeechSynthesisUtterance(frame.text);
    line.lang = 'en-US';
    line.rate = 0.96;
    window.speechSynthesis.speak(line);
  }, [voice, playing, index, frame.text]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    const el = score.current;
    if (!el) return;
    el.volume = 0.32;
    if (music && playing && !finished) void el.play().catch(() => setMusic(false)); else el.pause();
  }, [music, playing, finished]);

  const go = (next: number) => { setIndex(Math.max(0, Math.min(frames.length - 1, next))); setPlaying(true); setFinished(false); };

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <div className={`doc${media(frame.media).tone === 'ink' ? ' is-ink' : ''}`} ref={stageRef}>
        {frames.map((f, i) => {
          const m = media(f.media);
          return (
            <img key={i} ref={el => { imgs.current[i] = el; }} src={m.src} alt={m.alt} draggable={false}
              className={`doc__layer${i === index ? ' is-active' : ''}${m.tone === 'ink' ? ' is-ink' : ''}`}
              onLoad={e => { const t = e.currentTarget; setNatural(n => n[f.media] ? n : { ...n, [f.media]: { w: t.naturalWidth, h: t.naturalHeight } }); }} />
          );
        })}
        <button type="button" className="doc__tap doc__tap--prev" aria-label="Previous" onClick={() => go(index - 1)} />
        <button type="button" className="doc__tap doc__tap--next" aria-label="Next" onClick={() => index < frames.length - 1 ? go(index + 1) : finish()} />
        <p className="doc__caption" key={index}>{frame.text}</p>
        <div className="doc__progress" aria-hidden="true">
          {frames.map((f, i) => (
            <i key={i} className={i < index ? 'is-done' : i === index ? 'is-now' : ''}
              style={i === index ? { animationDuration: `${f.seconds}s`, animationPlayState: playing ? 'running' : 'paused' } : undefined} />
          ))}
        </div>
      </div>
      <div className="doc__controls">
        <button type="button" onClick={() => finished ? go(0) : setPlaying(p => !p)}>{finished ? 'Replay' : playing ? 'Pause' : 'Play'}</button>
        <button type="button" aria-pressed={voice} onClick={() => setVoice(v => !v)}>{voice ? 'Narration on' : 'Narrate'}</button>
        {beat.score && <button type="button" aria-pressed={music} onClick={() => setMusic(v => !v)}>{music ? 'Music on' : 'Music off'}</button>}
        {!finished && <button type="button" className="text-button" onClick={finish}>Skip</button>}
        <span className="doc__credit"><Credit media={frame.media} />{beat.score && <Credit media={beat.score} />}</span>
      </div>
      {beat.score && (
        <audio ref={score} loop preload="none">
          {media(beat.score).sources?.map(s => <source key={s.src} src={s.src} type={s.type} />)}
        </audio>
      )}
    </section>
  );
}
