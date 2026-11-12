import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { token as css } from '../engine/tokens';

// A strobe photograph you can re-shoot. Same physics engine works for any
// "drop / throw / fall with drag" topic: change g, height, objects and drag.

type World = { id: string; label: string; g: number; air: boolean; flash: number };
type Path = { t: number[]; y: number[]; land: number };

function fall(g: number, height: number, terminal: number | null): Path {
  const dt = 1 / 2000;
  const t = [0], y = [0];
  let v = 0, d = 0, time = 0;
  while (d < height && time < 30) {
    const a = terminal ? g * (1 - (v * v) / (terminal * terminal)) : g;
    v += a * dt; d += v * dt; time += dt;
    t.push(time); y.push(Math.min(d, height));
  }
  return { t, y, land: time };
}

function at(path: Path, time: number): number {
  if (time >= path.land) return path.y[path.y.length - 1];
  const i = Math.min(path.t.length - 1, Math.max(0, Math.round(time * 2000)));
  return path.y[i];
}


function hammer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.translate(x, y);
  ctx.beginPath(); ctx.roundRect(-16 * s, -6 * s, 32 * s, 12 * s, 3 * s); ctx.fill();
  ctx.fillRect(-2.5 * s, -36 * s, 5 * s, 31 * s);
  ctx.restore();
}

function feather(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number, tilt: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(tilt);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.2 * s;
  ctx.beginPath(); ctx.moveTo(0, 8 * s);
  ctx.bezierCurveTo(-11 * s, -6 * s, -9 * s, -26 * s, 0, -38 * s);
  ctx.bezierCurveTo(9 * s, -26 * s, 11 * s, -6 * s, 0, 8 * s); ctx.globalAlpha = alpha * 0.55; ctx.fill();
  ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(0, 14 * s); ctx.lineTo(0, -38 * s); ctx.stroke();
  ctx.restore();
}

export type Params = { height: number; worlds: World[]; featherTerminal: number; strobe: { ask: string; choices: Choice[]; answer: string; explain: string } };
export function DropTower({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as Params;
  const [worldId, setWorldId] = useState(p.worlds[0].id);
  const world = p.worlds.find(w => w.id === worldId)!;
  const paths = useMemo(() => ({
    hammer: fall(world.g, p.height, null),
    feather: fall(world.g, p.height, world.air ? p.featherTerminal : null),
  }), [world, p.height, p.featherTerminal]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(true);
  const [result, setResult] = useState<{ world: string; hammer: number; feather: number } | null>(null);
  const [goalMet, setGoalMet] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [width, setWidth] = useState(640);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const height = Math.round(Math.max(360, Math.min(470, width * 0.64)));

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const draw = useCallback((now: number) => {
    const el = canvas.current; if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = width * dpr; el.height = height * dpr;
    const ctx = el.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const text = css('--text'), muted = css('--muted'), rule = css('--rule'), accent = css('--accent'), faint = css('--faint');
    ctx.clearRect(0, 0, width, height);
    const top = 62, bottom = height - 40, scale = (bottom - top) / p.height;
    const s = Math.max(0.8, Math.min(1.1, width / 640));
    const lanes = { hammer: width * 0.42, feather: width * 0.72 };

    // Ruler
    ctx.strokeStyle = rule; ctx.fillStyle = muted; ctx.font = `12px ${css('--sans')}`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(52, top); ctx.lineTo(52, bottom); ctx.stroke();
    for (let m = 0; m <= p.height + 1e-6; m += 0.2) {
      const yy = top + m * scale;
      ctx.beginPath(); ctx.moveTo(46, yy); ctx.lineTo(58, yy); ctx.stroke();
      ctx.fillText(`${m.toFixed(1)} m`, 4, yy + 4);
    }
    // Release bar and ground
    ctx.strokeStyle = faint; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(70, top); ctx.lineTo(width - 16, top); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = rule; ctx.fillRect(70, bottom + 10, width - 86, 2);

    const tau = world.flash;
    const show = answered && !world.air;
    for (const key of ['hammer', 'feather'] as const) {
      const path = paths[key]; const x = lanes[key];
      const t = Math.min(now, path.land);
      // Strobe ghosts
      const flashes: number[] = [];
      for (let k = 0; k * tau <= t + 1e-9; k++) flashes.push(at(path, k * tau));
      flashes.forEach((d, k) => {
        const yy = top + d * scale;
        if (key === 'hammer') hammer(ctx, x, yy + 6 * s, s, text, 0.22); else feather(ctx, x, yy + 8 * s, s, accent, 0.25, 0);
        if (show && key === 'hammer' && k > 0) {
          const gap = (d - flashes[k - 1]) / (flashes[1] - flashes[0]);
          ctx.fillStyle = accent; ctx.font = `600 ${13 * s}px ${css('--sans')}`; ctx.textAlign = 'right';
          ctx.fillText(String(Math.round(gap)), x - 30 * s, top + ((d + flashes[k - 1]) / 2) * scale + 11 * s);
          ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.font = `${12 * s}px ${css('--sans')}`;
          ctx.fillText(`${Math.round(d / flashes[1])}`, x + 26 * s, top + d * scale + 11 * s);
          ctx.textAlign = 'start';
        }
      });
      const d = at(path, t);
      const yy = top + d * scale;
      const sway = key === 'feather' && world.air && t < path.land ? Math.sin(t * 3.4) * 12 * s : 0;
      if (key === 'hammer') hammer(ctx, x, yy + 6 * s, s, text, 1); else feather(ctx, x + sway, yy + 8 * s, s, accent, 1, sway / 60);
      ctx.fillStyle = muted; ctx.font = `${12 * s}px ${css('--sans')}`; ctx.textAlign = 'center';
      ctx.fillText(key === 'hammer' ? 'Hammer' : 'Feather', x, 20);
      if (now >= path.land) { ctx.fillStyle = text; ctx.font = `600 ${13 * s}px ${css('--sans')}`; ctx.fillText(`${path.land.toFixed(2)} s`, x, bottom + 32); }
      ctx.textAlign = 'start';
    }
    if (show) {
      ctx.fillStyle = muted; ctx.font = `${11 * s}px ${css('--sans')}`; ctx.textAlign = 'right';
      ctx.fillText('gap', lanes.hammer - 30 * s, 38); ctx.textAlign = 'left'; ctx.fillText('total', lanes.hammer + 26 * s, 38); ctx.textAlign = 'start';
    }
  }, [width, height, p.height, paths, world, answered]);

  useEffect(() => { draw(time); }, [draw, time]);

  const drop = () => {
    if (running) return;
    setRunning(true); setResult(null);
    const end = Math.max(paths.hammer.land, paths.feather.land) + 0.05;
    const speed = slow ? 0.3 : 1;
    let start = 0;
    const tick = (stamp: number) => {
      if (!start) start = stamp;
      const t = ((stamp - start) / 1000) * speed;
      setTime(Math.min(t, end));
      if (t < end) requestAnimationFrame(tick);
      else {
        setRunning(false);
        setResult({ world: world.label, hammer: paths.hammer.land, feather: paths.feather.land });
        if (Math.abs(paths.hammer.land - paths.feather.land) < 0.005) setGoalMet(true);
      }
    };
    requestAnimationFrame(tick);
  };

  const pick = (id: string) => { if (running) return; setWorldId(id); setTime(0); setResult(null); };
  const together = result && Math.abs(result.hammer - result.feather) < 0.005;

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="sim-toolbar">
        <div className="segmented" role="radiogroup" aria-label="Where">
          {p.worlds.map(w => <button key={w.id} type="button" role="radio" aria-checked={w.id === worldId} onClick={() => pick(w.id)}>{w.label}</button>)}
        </div>
        <label className="toggle"><input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)} /> Slow motion</label>
      </div>
      <div className="stage" ref={wrap}>
        <canvas ref={canvas} style={{ width: '100%', height }} aria-label={`Drop tower on ${world.label}`} />
        <button type="button" className="stage__go" onClick={drop} disabled={running}>{running ? 'Falling…' : time > 0 ? 'Drop again' : 'Drop'}</button>
      </div>
      <p className="stage__note">Flashes every {world.flash} s{world.air ? ' · air slows the feather' : ' · no air'}</p>
      {result && (
        <p className={`readout${together ? ' is-goal' : ''}`}>
          {together ? 'Same moment. ' : ''}Hammer {result.hammer.toFixed(2)} s · Feather {result.feather.toFixed(2)} s
        </p>
      )}
      {goalMet && (
        <Question gradeId={beat.grades?.[0].gradeId ?? 'strobe-gaps'} prompt={p.strobe.ask} choices={p.strobe.choices} answer={p.strobe.answer}
          explain={p.strobe.explain} onDone={() => { setAnswered(true); setWorldId(w => p.worlds.find(x => x.id === w)?.air ? 'vacuum' : w); done(); }} />
      )}
    </section>
  );
}
