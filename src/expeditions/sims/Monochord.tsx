import { useEffect, useRef, useState } from 'react';
import type { SimBeat } from '../content/types';
import { pluck } from '../engine/audio';
import { useBeat } from '../engine/context';
import { Credit } from '../blocks/ui';

// Pythagoras' one-string instrument. An open reference string, and a second
// string whose vibrating length you set with a movable bridge.

type Target = { n: number; d: number; name: string };
const NUT = 70, END = 930, SPAN = END - NUT;
const TOL = 0.009;

export type Params = { base: number; media: string; targets: Target[]; divisions: number };
export function Monochord({ beat }: { beat: SimBeat }) {
  const { done, media } = useBeat();
  const p = beat.params as Params;
  const [length, setLength] = useState(0.86);
  const [found, setFound] = useState<Target[]>([]);
  const [ringing, setRinging] = useState<{ open: number; stopped: number }>({ open: 0, stopped: 0 });
  const [stuck, setStuck] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => { const id = window.setTimeout(() => setStuck(true), 40000); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (found.length === p.targets.length) done(); }, [found, p.targets.length, done]);

  // Strings shimmer while they ring.
  useEffect(() => {
    if (!ringing.open && !ringing.stopped) return;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      setPhase(now / 1000);
      if (now - Math.max(ringing.open, ringing.stopped) < 2200) raf = requestAnimationFrame(loop);
      else setRinging({ open: 0, stopped: 0 });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ringing]);

  const near = p.targets.find(t => Math.abs(length - t.n / t.d) < TOL);
  const play = (which: 'open' | 'stopped' | 'both') => {
    const now = performance.now();
    const freqs = which === 'open' ? [p.base] : which === 'stopped' ? [p.base / length] : [p.base, p.base / length];
    pluck(freqs);
    setRinging({ open: which !== 'stopped' ? now : 0, stopped: which !== 'open' ? now : 0 });
    if (which === 'both' && near && !found.includes(near)) setFound(f => [...f, near]);
  };

  const fromPointer = (clientX: number) => {
    const el = svg.current; if (!el) return;
    const box = el.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * 1000;
    setLength(Math.max(0.3, Math.min(0.97, (x - NUT) / SPAN)));
  };

  const wave = (y: number, x0: number, x1: number, started: number, freqScale: number) => {
    if (!started) return `M${x0},${y} L${x1},${y}`;
    const age = (performance.now() - started) / 1000;
    const amp = 9 * Math.exp(-age * 2.2) * Math.sin(phase * 40 * freqScale);
    return `M${x0},${y} Q${(x0 + x1) / 2},${y + amp * 2} ${x1},${y}`;
  };

  const bridgeX = NUT + length * SPAN;
  const reveal = (t: Target) => found.includes(t);
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="mono">
        <svg ref={svg} viewBox="0 0 1000 330" className="mono__svg"
          onPointerDown={e => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e.clientX); }}
          onPointerMove={e => { if (dragging.current) fromPointer(e.clientX); }}
          onPointerUp={() => { dragging.current = false; }}>
          <rect x="40" y="40" width="920" height="210" rx="6" className="mono__box" />
          <circle cx="500" cy="148" r="20" className="mono__rose" />
          {/* Open string */}
          <text x={NUT} y="74" className="mono__tag">Open string</text>
          <path d={wave(98, NUT, END, ringing.open, 1)} className="mono__string" />
          <rect x={NUT - 6} y="86" width="6" height="24" className="mono__nut" />
          <rect x={END} y="86" width="6" height="24" className="mono__nut" />
          {/* Bridged string */}
          <text x={NUT} y="176" className="mono__tag">Bridged string</text>
          <path d={wave(198, NUT, bridgeX, ringing.stopped, 1 / length)} className="mono__string mono__string--live" />
          <line x1={bridgeX} y1="198" x2={END} y2="198" className="mono__string mono__string--dead" />
          <rect x={NUT - 6} y="186" width="6" height="24" className="mono__nut" />
          <rect x={END} y="186" width="6" height="24" className="mono__nut" />
          <g className="mono__bridge" transform={`translate(${bridgeX},198)`}>
            <path d="M-13,26 L0,0 L13,26 Z" />
            <rect x="-22" y="-60" width="44" height="120" fill="transparent" />
          </g>
          {/* Twelve divisions, as on the old diagrams */}
          {Array.from({ length: p.divisions + 1 }, (_, k) => {
            const x = NUT + (k / p.divisions) * SPAN;
            return <line key={k} x1={x} y1="262" x2={x} y2={k % 3 === 0 ? 276 : 270} className="mono__tick" />;
          })}
          {p.targets.filter(reveal).map(t => {
            const x = NUT + (t.n / t.d) * SPAN;
            return (
              <g key={t.name} className="mono__found" transform={`translate(${x},0)`}>
                <line x1="0" y1="220" x2="0" y2="262" />
                <text x="0" y="300" textAnchor="middle">{t.name}</text>
              </g>
            );
          })}
        </svg>
        <label className="mono__slider">
          <span>Vibrating length</span>
          <input type="range" min={0.3} max={0.97} step={0.001} value={length} onChange={e => setLength(Number(e.target.value))} />
          <output>{length.toFixed(3)}{near ? ` ≈ ${near.n}/${near.d}` : ''}</output>
        </label>
        <div className="mono__actions">
          <button type="button" onClick={() => play('open')}>Pluck open</button>
          <button type="button" onClick={() => play('stopped')}>Pluck bridged</button>
          <button type="button" className="is-primary" onClick={() => play('both')}>Pluck both</button>
        </div>
      </div>
      <div className="mono__tally">
        {p.targets.map((t, i) => (
          <span key={t.name} className={reveal(t) ? 'is-found' : ''}>{reveal(t) ? `${t.name} · length ${t.n}/${t.d} → pitch ${t.d}:${t.n}` : `Calm spot ${i + 1}`}</span>
        ))}
      </div>
      {stuck && found.length < p.targets.length && (
        <p className="nudge">Stuck? Each calm spot sits exactly on one of the twelve tick marks.
          {' '}<button type="button" className="text-button" onClick={() => { const next = p.targets.find(t => !found.includes(t))!; setLength(next.n / next.d); }}>Move me to one</button></p>
      )}
      <figure className={`figure figure--side${media(p.media).tone === 'ink' ? ' is-ink' : ''}`}>
        <img src={media(p.media).src} alt={media(p.media).alt} />
        <figcaption>The same instrument in 1624, divided into the ratios you’re hunting. <Credit media={p.media} /></figcaption>
      </figure>
    </section>
  );
}
