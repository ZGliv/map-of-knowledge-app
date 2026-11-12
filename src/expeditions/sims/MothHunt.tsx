import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Choice, Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Choices, Confident, Verdict } from '../blocks/ui';
import { seeded } from './cross';
import { alleleFor, birdPicks, birdSurvival, dominantShare, shownCount, step as nextGeneration, survivalFrom, type Form, type Tally } from './selection';
import './MothHunt.css';

// Be the bird. Moths rest on bark; the learner catches some, the rest breed. One gene
// decides the colour and the dominant form is the dark one (sims/selection.ts). The
// script in the pack decides the order of hunts, questions and fast-forwards, so the
// same engine can stage any camouflage-and-predator story.

type Bark = 'soot' | 'lichen';
type Ask = { do: 'ask'; gradeId: string; transfer?: boolean; prompt: string; choices: Choice[]; answer: string; explain: string; reveal: 'now' | 'later' };
type ScriptStep =
  | { do: 'hunt'; bark: Bark; text: string }
  | Ask
  | { do: 'forward'; bark: Bark; until: number; rising: boolean; max: number; button: string; reached: string; notReached: string }
  | { do: 'say'; bark: Bark; text: string; button: string };

export type MothHuntParams = {
  /** Share of moths showing the dominant (dark) form at the start. */
  start: number;
  shown: number;
  catches: number;
  /** The stand-in bird: how many times more easily it finds each form on each bark. */
  visible: Record<Bark, Record<Form, number>>;
  forms: Record<Form, string>;
  barks: Record<Bark, string>;
  seed: string;
  script: ScriptStep[];
  /** What the model leaves out, said once under the chart. */
  note?: string;
};

/** Positions are fractions of the bark (0–1), so a resize never strands a moth. */
type Moth = { u: number; v: number; rot: number; form: Form; caught: boolean };
type Gen = { share: number; bark: Bark; hunted: boolean; forms?: Form[] };

const PALETTE: Record<Bark, { base: string; marks: string[]; cracks: string }> = {
  soot: { base: '#36332f', marks: ['#2a2826', '#433f3a', '#2f2d2a', '#4a4641'], cracks: '#1f1d1b' },
  lichen: { base: '#c2c0b2', marks: ['#d9d6c8', '#b4b6a5', '#a6a995', '#e2dfd2', '#cfd1c0', '#9c9f8c'], cracks: '#7c796f' },
};

function paintBark(ctx: CanvasRenderingContext2D, w: number, h: number, bark: Bark, seed: string) {
  const rng = seeded(`${seed}:${bark}`);
  const pal = PALETTE[bark];
  ctx.fillStyle = pal.base; ctx.fillRect(0, 0, w, h);
  // Blotches: lichen patches on clean bark, soot smears on dirty bark.
  for (let k = 0; k < (w * h) / 900; k++) {
    ctx.fillStyle = pal.marks[Math.floor(rng() * pal.marks.length)];
    ctx.globalAlpha = 0.35 + rng() * 0.5;
    const x = rng() * w, y = rng() * h, r = 3 + rng() * (bark === 'lichen' ? 16 : 10);
    ctx.beginPath();
    for (let a = 0; a < 7; a++) { const ang = (a / 7) * Math.PI * 2, rr = r * (0.6 + rng() * 0.6); ctx[a ? 'lineTo' : 'moveTo'](x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 1.4); }
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Vertical fissures in the bark.
  ctx.strokeStyle = pal.cracks; ctx.lineCap = 'round';
  for (let k = 0; k < w / 14; k++) {
    let x = rng() * w, y = -10;
    ctx.lineWidth = 0.6 + rng() * 2.2; ctx.globalAlpha = 0.5 + rng() * 0.4;
    ctx.beginPath(); ctx.moveTo(x, y);
    while (y < h + 10) { y += 8 + rng() * 22; x += (rng() - 0.5) * 7; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Fine speckle.
  for (let k = 0; k < (w * h) / 160; k++) {
    ctx.fillStyle = rng() < 0.5 ? pal.cracks : pal.marks[0];
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillRect(rng() * w, rng() * h, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}

function paintMoth(ctx: CanvasRenderingContext2D, m: Moth, x: number, y: number, size: number, seed: number) {
  const rng = seeded(`moth${seed}`);
  const dark = m.form === 'dominant';
  ctx.save(); ctx.translate(x, y); ctx.rotate(m.rot);
  const w = size / 2, h = size * 0.5;
  // A peppered moth at rest holds its wings flat in a broad triangle.
  const wing = (side: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.42);
    ctx.quadraticCurveTo(side * w * 0.45, -h * 0.3, side * w, h * 0.12);
    ctx.quadraticCurveTo(side * w * 0.95, h * 0.42, side * w * 0.62, h * 0.52);
    ctx.quadraticCurveTo(side * w * 0.3, h * 0.6, 0, h * 0.42);
    ctx.closePath();
  };
  for (const side of [-1, 1]) {
    wing(side);
    ctx.fillStyle = dark ? '#272523' : '#d6d2c4'; ctx.fill();
    ctx.save(); wing(side); ctx.clip();
    if (dark) {
      ctx.strokeStyle = '#3b3834'; ctx.lineWidth = 0.7;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * w, -h * 0.4 + k * h * 0.4); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#3f3c36';
      for (let k = 0; k < 16; k++) { const r = 0.5 + rng() * 1.1; ctx.globalAlpha = 0.55 + rng() * 0.45; ctx.fillRect(side * rng() * w - (side < 0 ? 0 : r), -h * 0.6 + rng() * h * 1.1, r, r); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  ctx.fillStyle = dark ? '#1b1a19' : '#8c877b';
  ctx.beginPath(); ctx.ellipse(0, h * 0.05, size * 0.06, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function placeMoths(forms: Form[], aspect: number, rng: () => number): Moth[] {
  // Spread moths out: each takes the best of a few random spots, judged in screen proportions.
  const out: Moth[] = [];
  const gap = 0.12;
  for (const form of forms) {
    let best: Moth | null = null, bestD = -1;
    for (let tries = 0; tries < 40; tries++) {
      const m = { u: rng(), v: rng(), rot: (rng() - 0.5) * 0.9, form, caught: false };
      const d = Math.min(Infinity, ...out.map(o => Math.hypot(o.u - m.u, (o.v - m.v) / aspect)));
      if (d >= gap) { best = m; break; }
      if (d > bestD) { bestD = d; best = m; }
    }
    out.push(best!);
  }
  return out;
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
const pct = (share: number) => `${Math.round(share * 100)}%`;

export function MothHunt({ beat }: { beat: SimBeat }) {
  const { done, record, evidenceFor } = useBeat();
  const p = beat.params as unknown as MothHuntParams;
  const rng = useMemo(() => seeded(p.seed), [p.seed]);
  const [at, setAt] = useState(0);
  const [allele, setAllele] = useState(() => alleleFor(p.start));
  const [gens, setGens] = useState<Gen[]>(() => [{ share: p.start, bark: 'soot', hunted: false }]);
  const [moths, setMoths] = useState<Moth[]>([]);
  const [forwardResult, setForwardResult] = useState<Record<number, { n: number; reached: boolean; share: number }>>({});
  const [running, setRunning] = useState(false);
  const [pecks, setPecks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [width, setWidth] = useState(640);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const barkCache = useRef<{ key: string; img: HTMLCanvasElement } | null>(null);
  const height = Math.round(Math.max(300, Math.min(440, width * 0.92)));
  const size = Math.max(22, Math.min(34, width / 13));
  const pad = size * 0.75;
  const px = (m: Moth) => ({ x: pad + m.u * (width - 2 * pad), y: pad + m.v * (height - 2 * pad) });
  const last = p.script.length - 1;
  const current = p.script[Math.min(at, last)];
  // The bark is set by the latest step that names one; questions keep the bark they were asked on.
  const bark: Bark = (() => { for (let k = Math.min(at, last); k >= 0; k--) { const s = p.script[k]; if (s.do !== 'ask') return s.bark; } return 'soot'; })();
  // The run is over when the last step has played out (a final fast run keeps its result on screen).
  const finished = at > last || (at === last && current.do === 'forward' && !!forwardResult[at]);
  const share = dominantShare(allele);
  const caught = moths.filter(m => m.caught).length;
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // A new hunt: sample this generation's moths from the population and scatter them.
  useEffect(() => {
    if (at > last || current.do !== 'hunt') return;
    const dark = shownCount(share, p.shown, rng);
    const forms = shuffled([...Array(dark).fill('dominant'), ...Array(p.shown - dark).fill('recessive')] as Form[], rng);
    setMoths(placeMoths(forms, width / height, rng));
    setGens(g => { const last = g[g.length - 1]; return [...g.slice(0, -1), { ...last, bark: current.bark, hunted: true, forms }]; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  const draw = useCallback(() => {
    const el = canvas.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = width * dpr; el.height = height * dpr;
    const ctx = el.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const key = `${bark}:${width}:${height}`;
    if (barkCache.current?.key !== key) {
      const off = document.createElement('canvas'); off.width = width * dpr; off.height = height * dpr;
      const o = off.getContext('2d')!; o.setTransform(dpr, 0, 0, dpr, 0, 0); paintBark(o, width, height, bark, p.seed);
      barkCache.current = { key, img: off };
    }
    ctx.drawImage(barkCache.current.img, 0, 0, width, height);
    moths.forEach((m, i) => { if (!m.caught) { const { x, y } = px(m); paintMoth(ctx, m, x, y, size, i + gens.length * 97); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, bark, moths, size, p.seed, gens.length]);
  useEffect(() => { draw(); }, [draw]);

  const hunting = at <= last && current.do === 'hunt' && caught < p.catches && moths.length > 0;

  const endHunt = useCallback((final: Moth[]) => {
    const count = (form: Form, onlyCaught: boolean) => final.filter(m => m.form === form && (!onlyCaught || m.caught)).length;
    const tally: Tally = { shown: { dominant: count('dominant', false), recessive: count('recessive', false) }, caught: { dominant: count('dominant', true), recessive: count('recessive', true) } };
    const b = (current as { bark: Bark }).bark;
    const next = nextGeneration(allele, survivalFrom([tally]));
    setAllele(next);
    setGens(g => [...g, { share: dominantShare(next), bark: b, hunted: false }]);
    window.setTimeout(() => setAt(a => a + 1), reduce ? 50 : 650);
  }, [allele, current, reduce]);

  // The live moths, read by taps and by the stand-in bird's delayed catches.
  const peckId = useRef(0);
  const mothsRef = useRef<Moth[]>([]);
  mothsRef.current = moths;
  const catchMoth = useCallback((index: number) => {
    const ms = mothsRef.current;
    if (!ms[index] || ms[index].caught || ms.filter(m => m.caught).length >= p.catches) return;
    const next = ms.map((m, i) => i === index ? { ...m, caught: true } : m);
    mothsRef.current = next;
    setMoths(next);
    const spot = px(ms[index]);
    peckId.current += 1;
    const id = peckId.current;
    setPecks(pk => [...pk.slice(-5), { id, x: spot.x, y: spot.y }]);
    if (next.filter(x => x.caught).length >= p.catches) endHunt(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.catches, endHunt, width, height, size]);

  // A click, not a pointerdown: on a phone, starting a scroll over the bark shouldn't catch a moth.
  const onTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hunting) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width, y = ((e.clientY - box.top) / box.height) * height;
    let best = -1, bestD = Math.max(22, size * 0.95);
    moths.forEach((m, i) => { if (!m.caught) { const p2 = px(m); const d = Math.hypot(p2.x - x, p2.y - y); if (d < bestD) { bestD = d; best = i; } } });
    if (best >= 0) catchMoth(best);
  };

  const birdHunts = () => {
    if (!hunting) return;
    const left = moths.map((m, i) => ({ m, i })).filter(({ m }) => !m.caught);
    const picks = birdPicks(left.map(({ m }) => m.form), p.visible[bark], p.catches - caught, rng).map(k => left[k].i);
    picks.forEach((index, k) => window.setTimeout(() => catchMoth(index), reduce ? 0 : 160 * (k + 1)));
  };

  // The fast run: the stand-in bird keeps hunting, a generation at a time, until the stop rule.
  const forward = (s: Extract<ScriptStep, { do: 'forward' }>) => {
    if (running) return;
    setRunning(true);
    let q = allele, n = 0;
    const out: Gen[] = [];
    const reached = (v: number) => s.rising ? dominantShare(v) >= s.until : dominantShare(v) <= s.until;
    // The long run uses the stand-in bird's expected catches, so it is the same every time.
    while (n < s.max && !reached(q)) {
      q = nextGeneration(q, birdSurvival(dominantShare(q), p.shown, p.catches, p.visible[s.bark]));
      out.push({ share: dominantShare(q), bark: s.bark, hunted: false });
      n++;
    }
    const base = gens;
    const finish = () => {
      setAllele(q);
      // Show the population as it now is, resting on the bark.
      const dark = shownCount(dominantShare(q), p.shown, rng);
      setMoths(placeMoths(shuffled([...Array(dark).fill('dominant'), ...Array(p.shown - dark).fill('recessive')] as Form[], rng), width / height, rng));
      setForwardResult(r => ({ ...r, [at]: { n, reached: reached(q), share: dominantShare(q) } }));
      setRunning(false);
    };
    if (reduce) { setGens([...base, ...out]); finish(); return; }
    let k = 0;
    const id = window.setInterval(() => {
      k = Math.min(out.length, k + Math.max(1, Math.ceil(out.length / 30)));
      setGens([...base, ...out.slice(0, k)]);
      if (k >= out.length) { window.clearInterval(id); finish(); }
    }, 60);
  };

  // Coming back to a run already answered, Continue is open at once; otherwise it opens at the end.
  const [returning] = useState(() => p.script.every(s => s.do !== 'ask' || !!evidenceFor(s.gradeId)));
  useEffect(() => { if (finished || returning) done(); }, [finished, returning, done]);

  // The question whose answer waits for the next fast run, if any.
  const pendingFor = (index: number) => {
    for (let k = index - 1; k >= 0; k--) { const s = p.script[k]; if (s.do === 'forward') return null; if (s.do === 'ask' && s.reveal === 'later') return s; }
    return null;
  };

  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => { if (at <= last && current.do === 'hunt' && at > 0) stage.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }, [at, current, finished, reduce]);

  const hunted = gens.filter(g => g.forms);
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="mothhunt__bar">
        <span>{p.barks[bark]}</span>
        <span>Generation {gens.length} · {pct(share)} {p.forms.dominant}</span>
      </div>
      <div className={`mothhunt__stage${hunting ? ' is-hunting' : ''}`} ref={wrap}>
        <div ref={stage} />
        <canvas ref={canvas} style={{ width: '100%', height }} onClick={onTap}
          aria-label={`${p.barks[bark]} with ${moths.filter(m => !m.caught).length} moths resting on it`} role="img" />
        {pecks.map(pk => <i key={pk.id} className="mothhunt__peck" style={{ left: `${(pk.x / width) * 100}%`, top: pk.y }} onAnimationEnd={() => setPecks(x => x.filter(y => y.id !== pk.id))} />)}
      </div>

      <div className="mothhunt__panel">
        {at <= last && current.do === 'hunt' && (
          <>
            <p className="mothhunt__text">{current.text}</p>
            <div className="mothhunt__row">
              <span className="readout">{caught < p.catches ? `Caught ${caught} of ${p.catches}` : 'Full. The survivors breed.'}</span>
              {hunting && <button type="button" className="text-button" onClick={birdHunts} data-action="moth-bird">Let a bird hunt</button>}
            </div>
          </>
        )}
        {at <= last && current.do === 'ask' && <AskPanel key={current.gradeId} ask={current} onNext={() => setAt(a => a + 1)} record={record} prior={evidenceFor(current.gradeId)} />}
        {at <= last && current.do === 'say' && (
          <>
            <p className="mothhunt__text">{current.text}</p>
            <button type="button" className="mothhunt__go" onClick={() => { setGens(g => [...g.slice(0, -1), { ...g[g.length - 1], bark: current.bark }]); setAt(a => a + 1); }}>{current.button}</button>
          </>
        )}
        {current.do === 'forward' && at <= last && (() => {
          const res = forwardResult[at];
          const pending = pendingFor(at);
          const prior = pending ? evidenceFor(pending.gradeId) : undefined;
          const said = pending?.choices.find(c => c.label === prior?.chosen);
          return (
            <>
              {!res && <button type="button" className="mothhunt__go" onClick={() => forward(current)} disabled={running} data-action="moth-forward">{running ? 'Hunting…' : current.button}</button>}
              {res && (<>
                <p className="mothhunt__text">{fill(res.reached ? current.reached : current.notReached, { n: res.n, pct: pct(res.share), years: '' })}</p>
                {pending && (
                  <Verdict correct={said ? said.id === pending.answer : null} title={said ? `You said “${said.label}”` : undefined}>
                    {said?.feedback && said.id !== pending.answer && <p className="feedback">{said.feedback}</p>}
                    <p>{pending.explain}</p>
                  </Verdict>
                )}
                {at < last && <button type="button" className="mothhunt__go" onClick={() => setAt(a => a + 1)}>Go on</button>}
              </>)}
            </>
          );
        })()}
      </div>

      {hunted.length > 0 && (
        <div className="mothhunt__strips" aria-label="The moths of each generation you hunted">
          {hunted.map((g, i) => (
            <div key={i} className="mothhunt__strip">
              <span>{p.barks[g.bark]}, generation {gens.indexOf(g) + 1}</span>
              <div>{[...g.forms!].sort().reverse().map((f, k) => <i key={k} className={f === 'dominant' ? 'is-dark' : 'is-pale'} />)}</div>
            </div>
          ))}
        </div>
      )}
      <Chart gens={gens} label={p.forms.dominant} barks={p.barks} />
      {p.note && <p className="stage__note">{p.note}</p>}
      <details className="mothhunt__table">
        <summary>The numbers behind the chart</summary>
        <table>
          <thead><tr><th>Generation</th><th>Bark</th><th>{p.forms.dominant[0].toUpperCase() + p.forms.dominant.slice(1)} moths</th></tr></thead>
          <tbody>{gens.map((g, i) => <tr key={i}><td>{i + 1}</td><td>{p.barks[g.bark]}</td><td>{pct(g.share)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

function AskPanel({ ask, onNext, record, prior }: { ask: Ask; onNext: () => void; record: ReturnType<typeof useBeat>['record']; prior: ReturnType<ReturnType<typeof useBeat>['evidenceFor']> }) {
  const [pick, setPick] = useState<string | null>(prior ? ask.choices.find(c => c.label === prior.chosen)?.id ?? null : null);
  const committed = !!prior;
  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: ask.gradeId, transfer: !!ask.transfer, correct: pick === ask.answer, confidence, prompt: ask.prompt, chosen: ask.choices.find(c => c.id === pick)!.label });
    if (ask.reveal === 'later') onNext();
  };
  const chosen = ask.choices.find(c => c.id === pick);
  return (
    <div className="question">
      <p className="question__prompt">{ask.prompt}</p>
      <Choices choices={ask.choices} value={pick} onPick={setPick} locked={committed} answer={committed && ask.reveal === 'now' ? ask.answer : null} />
      {pick && !committed && <Confident onCommit={commit} />}
      {committed && ask.reveal === 'now' && (
        <>
          <Verdict correct={chosen?.id === ask.answer}>
            {chosen?.feedback && chosen.id !== ask.answer && <p className="feedback">{chosen.feedback}</p>}
            <p>{ask.explain}</p>
          </Verdict>
          <button type="button" className="mothhunt__go" onClick={onNext}>Go on</button>
        </>
      )}
      {committed && ask.reveal === 'later' && <button type="button" className="mothhunt__go" onClick={onNext}>Go on</button>}
    </div>
  );
}

function Chart({ gens, label, barks }: { gens: Gen[]; label: string; barks: Record<Bark, string> }) {
  const W = 600, H = 200, L = 44, R = 12, T = 14, B = 30;
  const n = Math.max(gens.length, 10);
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R), y = (s: number) => T + (1 - s) * (H - T - B);
  const line = gens.map((g, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(g.share).toFixed(1)}`).join('');
  const change = gens.findIndex((g, i) => i > 0 && g.bark !== gens[i - 1].bark);
  return (
    <figure className="mothhunt__chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Share of ${label} moths over ${gens.length} generations, now ${pct(gens.at(-1)!.share)}`}>
        {[0, 0.5, 1].map(s => <g key={s}><line x1={L} x2={W - R} y1={y(s)} y2={y(s)} className="mothhunt__grid" /><text x={L - 8} y={y(s) + 5} textAnchor="end" className="mothhunt__tick">{s * 100}%</text></g>)}
        {change > 0 && <g><line x1={x(change - 0.5)} x2={x(change - 0.5)} y1={T} y2={H - B} className="mothhunt__change" /><text x={x(change - 0.5) + 6} y={T + 12} className="mothhunt__tick">{barks[gens[change].bark]}</text></g>}
        <path d={line} className="mothhunt__line" />
        {gens.map((g, i) => g.forms ? <circle key={i} cx={x(i)} cy={y(g.share)} r="4.5" className="mothhunt__dot" /> : null)}
        <text x={L} y={H - 8} className="mothhunt__tick">Generation 1</text>
        <text x={W - R} y={H - 8} textAnchor="end" className="mothhunt__tick">{gens.length}</text>
      </svg>
      <figcaption>Share of moths that are {label}, generation by generation.</figcaption>
    </figure>
  );
}
