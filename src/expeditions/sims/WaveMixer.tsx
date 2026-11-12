import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { playInterval } from '../engine/audio';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { token as css } from '../engine/tokens';

// An oscilloscope for two notes. The top trace shows each note alone; the bottom
// trace is what reaches your ear. Brackets mark where the combined shape repeats.

type Preset = { label: string; ratio: [number, number] };

export type Params = { base: number; presets: Preset[]; question: { ask: string; choices: Choice[]; answer: string; explain: string } };
export function WaveMixer({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as Params;
  const [preset, setPreset] = useState(p.presets[0]);
  const [tried, setTried] = useState<Set<string>>(new Set([p.presets[0].label]));
  const [width, setWidth] = useState(640);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const height = 250;
  const [hi, lo] = preset.ratio;
  const window_ = 6; // lower-note waves on screen

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const draw = useCallback((shift: number) => {
    const el = canvas.current; if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = width * dpr; el.height = height * dpr;
    const ctx = el.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const accent = css('--accent'), pale = css('--pale'), text = css('--bright'), rule = css('--rule'), muted = css('--muted');
    const left = 8, right = width - 8, span = right - left;
    const rows = { solo: 62, sum: 175 };
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    for (const y of [rows.solo, rows.sum]) { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
    const trace = (f: (u: number) => number, y: number, amp: number, color: string, w: number, alpha = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.beginPath();
      for (let px = 0; px <= span; px += 1) {
        const u = (px / span) * window_ + shift; // u counts lower-note waves
        const v = f(u);
        if (px === 0) ctx.moveTo(left + px, y - v * amp); else ctx.lineTo(left + px, y - v * amp);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    const low = (u: number) => Math.sin(2 * Math.PI * u);
    const high = (u: number) => Math.sin(2 * Math.PI * u * hi / lo);
    trace(low, rows.solo, 34, accent, 1.6, 0.9);
    trace(high, rows.solo, 34, pale, 1.2, 0.75);
    trace(u => (low(u) + high(u)) / 2, rows.sum, 52, text, 2.2);
    // Repeat markers: the shape repeats every `lo` lower-note waves.
    ctx.font = `12px ${css('--sans')}`; ctx.fillStyle = muted;
    if (lo <= window_) {
      ctx.setLineDash([4, 5]); ctx.strokeStyle = accent; ctx.lineWidth = 1;
      const first = Math.ceil(shift / lo) * lo;
      for (let k = first; k <= shift + window_; k += lo) {
        const x = left + ((k - shift) / window_) * span;
        ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, height - 22); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillText(lo === 1 ? 'Repeats every wave of the low note' : `Repeats every ${lo} waves of the low note`, left, height - 6);
    } else {
      ctx.fillText(`Repeats only every ${lo} waves of the low note, far off this screen`, left, height - 6);
    }
    ctx.fillText('Each note alone', left, 14); ctx.fillText('What reaches your ear', left, rows.sum - 66);
  }, [width, hi, lo]);

  useEffect(() => {
    let raf = 0; const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = (now: number) => { draw(reduce ? 0 : ((now - start) / 1000) * 0.25); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const choose = (pr: Preset) => { setPreset(pr); setTried(t => new Set(t).add(pr.label)); playInterval(p.base, pr.ratio); };

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="sim-toolbar">
        <div className="segmented segmented--wrap" role="radiogroup" aria-label="Pair">
          {p.presets.map(pr => (
            <button key={pr.label} type="button" role="radio" aria-checked={pr.label === preset.label} onClick={() => choose(pr)}>
              {pr.label}<small>{pr.ratio[0]}:{pr.ratio[1]}</small>
            </button>
          ))}
        </div>
        <button type="button" className="hear" onClick={() => playInterval(p.base, preset.ratio)}>Hear {preset.label.toLowerCase()}</button>
      </div>
      <div className="stage" ref={wrap}>
        <canvas ref={canvas} style={{ width: '100%', height }} aria-label={`Waveforms for ${preset.label}`} />
      </div>
      {tried.size >= 3 ? (
        <Question gradeId={beat.grades?.[0].gradeId ?? 'pattern-repeat'} prompt={p.question.ask} choices={p.question.choices} answer={p.question.answer}
          explain={p.question.explain} columns onDone={done} />
      ) : <p className="stage__note">Try a few more pairs, then a question.</p>}
    </section>
  );
}
