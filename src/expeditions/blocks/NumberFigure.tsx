import { useEffect, useState } from 'react';
import type { Variant } from '../engine/variants';
import './NumberFigureApart.css';

// Numbers become pictures: the learner's answer and the true answer drawn to
// the same scale, so "how wrong" is something you can see.

export function NumberFigure({ variant, guess, revealed }: { variant: Variant; guess: number | null; revealed: boolean }) {
  const f = variant.figure;
  if (!f) return null;
  if (f.kind === 'drop') return <Well key={variant.key} depth={variant.answer} seconds={f.seconds} moon={f.surface === 'moon'} guess={guess} revealed={revealed} />;
  if (f.kind === 'growth') return <Growth key={variant.key} doublings={f.doublings} minutes={f.minutes} guess={guess} revealed={revealed} />;
  if (f.kind === 'decay') return <Decay key={variant.key} halvings={f.halvings} halfLife={f.halfLife} unit={f.unit} guess={guess} revealed={revealed} />;
  if (f.kind === 'ponds') return <Ponds key={variant.key} total={f.total} expected={f.expected} run={f.run} unit={variant.unit} revealed={revealed} />;
  if (f.kind === 'apart') return <Apart key={variant.key} split={f.split} a={f.a} b={f.b} unit={f.unit} guess={guess} revealed={revealed} />;
  return <StringLine key={variant.key} total={f.total} frets={f.frets} answer={variant.answer} guess={guess} revealed={revealed} />;
}

// One cell, then two, then four: the dish fills in doublings, and a ruler counts them.
// The ruler is spaced by doublings, so a guess that is "only" a few doublings short shows how far off it is.
function Growth({ doublings, minutes, guess, revealed }: { doublings: number; minutes: number; guess: number | null; revealed: boolean }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!revealed) { setK(0); return; }
    let step = 0;
    const id = window.setInterval(() => { step += 1; setK(step); if (step >= doublings) window.clearInterval(id); }, 320);
    return () => window.clearInterval(id);
  }, [revealed, doublings]);
  const total = 2 ** doublings;
  const shown = 2 ** k;
  const cols = 2 ** Math.ceil(doublings / 2), rows = Math.max(1, total / cols);
  const box = 236, cell = box / cols, top = 26;
  const h = Math.max(cell * rows, 40);
  const ruleY = top + h + 44, x0 = 22, x1 = 258, x = (d: number) => x0 + (d / doublings) * (x1 - x0);
  const label = (d: number) => (2 ** d).toLocaleString('en-US');
  const guessD = guess !== null && guess >= 1 ? Math.log2(guess) : null;
  const elapsed = k * minutes;
  return (
    <svg className="numfig numfig--growth" viewBox={`0 0 280 ${ruleY + 46}`} role="img" aria-label={`${total} cells after ${doublings} doublings`}>
      <rect x={x0 - 1} y={top - 1} width={box + 2} height={h + 2} rx="4" className="numfig__dish" />
      {Array.from({ length: Math.min(shown, total) }, (_, i) => {
        const cx = x0 + (i % cols) * cell, cy = top + Math.floor(i / cols) * cell;
        return <rect key={i} x={cx + cell * 0.12} y={cy + cell * 0.3} width={cell * 0.76} height={cell * 0.4} rx={cell * 0.2} className="numfig__cell" />;
      })}
      <text x={x0} y="16" className="numfig__scale">{revealed ? `${elapsed >= 60 ? `${Math.floor(elapsed / 60)} h ${elapsed % 60 ? `${elapsed % 60} min` : ''}` : `${elapsed} min`} · ${shown.toLocaleString('en-US')} cells` : '1 cell'}</text>
      {!revealed && <text x={x0 + box / 2} y={top + h / 2 + 22} textAnchor="middle" className="numfig__ask">?</text>}
      <line x1={x0} x2={x1} y1={ruleY} y2={ruleY} className="numfig__rule" />
      {Array.from({ length: doublings + 1 }, (_, d) => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={ruleY - 5} y2={ruleY + 5} className={`numfig__tick${revealed && d <= k ? ' is-on' : ''}`} />
          {(d === 0 || d === doublings || d % 3 === 0) && <text x={x(d)} y={ruleY + 20} textAnchor="middle" className="numfig__scale">{label(d)}</text>}
        </g>
      ))}
      <text x={x0} y={ruleY + 38} className="numfig__scale">each tick = one doubling ({minutes} min)</text>
      {guessD !== null && (
        <g className="numfig__guess"><line x1={x(Math.min(guessD, doublings + 0.4))} x2={x(Math.min(guessD, doublings + 0.4))} y1={ruleY - 16} y2={ruleY} /><text x={x(Math.min(guessD, doublings + 0.4))} y={ruleY - 20} textAnchor="middle">{guessD > doublings + 0.4 ? 'you ›' : 'you'}</text></g>
      )}
    </svg>
  );
}

// A fork: two living groups at the top, their last shared ancestor at the bottom.
// Once answered, both branches light, each labelled with the same span of time.
function Apart({ split, a, b, unit, guess, revealed }: { split: number; a: string; b: string; unit: string; guess: number | null; revealed: boolean }) {
  const top = 46, fork = 236, left = 60, right = 220, mid = 140;
  const along = guess !== null && guess > 0 ? Math.min(1, guess / (2 * split)) : 0;
  return (
    <svg className="numfig numfig--apart" viewBox="0 0 280 300" role="img" aria-label={`${a} and ${b}, split ${split} ${unit} ago`}>
      <text x={left} y={top - 16} textAnchor="middle" className="numfig__tip">{a}</text>
      <text x={right} y={top - 16} textAnchor="middle" className="numfig__tip">{b}</text>
      <path d={`M${left},${top} L${mid},${fork}`} className={`numfig__branch${revealed ? ' is-on' : ''}`} />
      <path d={`M${right},${top} L${mid},${fork}`} className={`numfig__branch${revealed ? ' is-on' : ''}`} />
      <line x1={mid} x2={mid} y1={fork} y2={fork + 34} className="numfig__branch" />
      <circle cx={mid} cy={fork} r="7" className="numfig__fork" />
      <text x={mid} y={fork + 54} textAnchor="middle" className="numfig__scale">last shared ancestor · {split} {unit} ago</text>
      {revealed && <>
        <text x={(left + mid) / 2 - 16} y={(top + fork) / 2} textAnchor="end" className="numfig__span">{split}</text>
        <text x={(right + mid) / 2 + 16} y={(top + fork) / 2} className="numfig__span">{split}</text>
      </>}
      {!revealed && along > 0 && (
        <g className="numfig__guess"><circle cx={left + (mid - left) * Math.min(1, along * 2)} cy={top + (fork - top) * Math.min(1, along * 2)} r="5" />{along > 0.5 && <circle cx={mid + (right - mid) * (1 - (along - 0.5) * 2)} cy={fork - (fork - top) * (along - 0.5) * 2} r="5" />}</g>
      )}
    </svg>
  );
}

function Well({ depth, seconds, moon, guess, revealed }: { depth: number; seconds: number; moon: boolean; guess: number | null; revealed: boolean }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!revealed) { setP(0); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (seconds * 1000));
      setP(t * t); // distance grows with time squared
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, seconds]);
  const max = Math.max(depth, guess ?? 0) * 1.12 || 1;
  const top = 40, bottom = 300, y = (d: number) => top + (d / max) * (bottom - top);
  const stoneY = y(revealed ? depth * p : 0);
  const step = max > 40 ? 10 : max > 12 ? 5 : max > 4 ? 1 : 0.5;
  return (
    <svg className="numfig numfig--well" viewBox="0 0 260 320" role="img" aria-label={`A ${depth.toFixed(1)} metre drop`}>
      <rect x="0" y={top - 6} width="86" height="6" className={moon ? 'numfig__regolith' : 'numfig__ground'} />
      <rect x="150" y={top - 6} width="110" height="6" className={moon ? 'numfig__regolith' : 'numfig__ground'} />
      <rect x="86" y={top} width="64" height={bottom - top + 10} className="numfig__shaft" />
      {Array.from({ length: Math.floor(max / step) }, (_, k) => (k + 1) * step).map(m => (
        <g key={m}><line x1="152" x2="160" y1={y(m)} y2={y(m)} className="numfig__tick" /><text x="166" y={y(m) + 4} className="numfig__scale">{m} m</text></g>
      ))}
      {revealed && <line x1="86" x2="150" y1={y(depth)} y2={y(depth)} className="numfig__floor" />}
      {guess !== null && guess > 0 && (
        <g className="numfig__guess"><line x1="70" x2="150" y1={y(guess)} y2={y(guess)} /><text x="6" y={y(guess) + 4}>you</text></g>
      )}
      <circle cx="118" cy={stoneY - 7} r="7" className="numfig__stone" />
      {!revealed && <text x="118" y={(top + bottom) / 2} textAnchor="middle" className="numfig__ask">?</text>}
    </svg>
  );
}

function StringLine({ total, frets, answer, guess, revealed }: { total: number; frets: boolean; answer: number; guess: number | null; revealed: boolean }) {
  // Measured from the bridge: the part that vibrates runs from the bridge to the finger.
  const left = 30, right = 610, x = (mm: number) => left + (mm / total) * (right - left);
  const fretAt = (k: number) => total * 2 ** (-k / 12);
  return (
    <svg className="numfig numfig--string" viewBox="0 0 640 130" role="img" aria-label={`String of ${total} millimetres`}>
      {frets && Array.from({ length: 15 }, (_, i) => i + 1).map(k => (
        <g key={k}>
          <line x1={x(fretAt(k))} x2={x(fretAt(k))} y1="42" y2="72" className="numfig__fret" />
          {[3, 5, 7, 9, 12].includes(k) && <text x={x(fretAt(k))} y="90" textAnchor="middle" className="numfig__fretno">{k}</text>}
        </g>
      ))}
      <rect x={left - 8} y="40" width="8" height="34" className="numfig__nut" />
      <rect x={right} y="40" width="8" height="34" className="numfig__nut" />
      <line x1={left} x2={right} y1="57" y2="57" className="numfig__string" />
      <text x={left} y="26" className="numfig__scale">bridge</text>
      <text x={right + 8} y="26" textAnchor="end" className="numfig__scale">nut · {total} mm</text>
      {revealed && <line x1={left} x2={x(answer)} y1="57" y2="57" className="numfig__vibrating" />}
      {revealed && <g className="numfig__answer"><circle cx={x(answer)} cy="57" r="6" /><text x={x(answer)} y="118" textAnchor="middle">{Math.round(answer)} mm</text></g>}
      {guess !== null && guess > 0 && guess <= total * 1.05 && (
        <g className="numfig__guess"><line x1={x(guess)} x2={x(guess)} y1="34" y2="80" /><text x={x(guess)} y="28" textAnchor="middle">you</text></g>
      )}
    </svg>
  );
}

// Radioactive decay as 64 atoms: each half-life, half of the atoms still waiting decay.
// Which atoms go is fixed by a scramble, so replaying looks the same.
function Decay({ halvings, halfLife, unit, guess, revealed }: { halvings: number; halfLife: number; unit: string; guess: number | null; revealed: boolean }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!revealed) { setK(0); return; }
    let step = 0;
    const id = window.setInterval(() => { step += 1; setK(step); if (step >= halvings) window.clearInterval(id); }, 650);
    return () => window.clearInterval(id);
  }, [revealed, halvings]);
  const N = 64, cols = 8, cell = 26, x0 = 22, y0 = 30;
  // Atom i decays in half-life h when its rank falls in that half of the survivors.
  const rank = Array.from({ length: N }, (_, i) => (i * 37) % N);
  const decaysAt = (i: number) => { let alive = N; for (let h = 1; h <= 8; h++) { alive /= 2; if (rank[i] >= alive) return h; } return 99; };
  const left = N / 2 ** k;
  const ruleY = y0 + cols * cell + 34, rx0 = 22, rx1 = 258;
  const x = (h: number) => rx0 + (h / Math.max(halvings, 1)) * (rx1 - rx0);
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 3 });
  const guessH = guess !== null && guess > 0 ? guess / halfLife : null;
  return (
    <svg className="numfig numfig--decay" viewBox={`0 0 280 ${ruleY + 46}`} role="img" aria-label={`${halvings} half-lives: ${left} of ${N} parent atoms left`}>
      <text x={x0} y="18" className="numfig__scale">{revealed ? `${k} half-li${k === 1 ? 'fe' : 'ves'} · ${left} of ${N} left` : `${N} atoms when the crystal formed`}</text>
      {Array.from({ length: N }, (_, i) => (
        <circle key={i} cx={x0 + (i % cols) * cell + cell / 2} cy={y0 + Math.floor(i / cols) * cell + cell / 2} r={8}
          className={revealed && decaysAt(i) <= k ? 'numfig__daughter' : 'numfig__parent'} />
      ))}
      <line x1={rx0} x2={rx1} y1={ruleY} y2={ruleY} className="numfig__rule" />
      {Array.from({ length: halvings + 1 }, (_, h) => (
        <g key={h}>
          <line x1={x(h)} x2={x(h)} y1={ruleY - 5} y2={ruleY + 5} className={`numfig__tick${revealed && h <= k ? ' is-on' : ''}`} />
          <text x={x(h)} y={ruleY + 20} textAnchor="middle" className="numfig__scale">{h === 0 ? '0' : fmt(h * halfLife)}</text>
        </g>
      ))}
      <text x={rx0} y={ruleY + 38} className="numfig__scale">{unit}; each tick is one half-life</text>
      {guessH !== null && guessH <= halvings + 0.6 && (
        <g className="numfig__guess"><line x1={x(guessH)} x2={x(guessH)} y1={ruleY - 16} y2={ruleY} /><text x={x(guessH)} y={ruleY - 20} textAnchor="middle">you</text></g>
      )}
    </svg>
  );
}

// Populations as circles: on reveal, the expected number fill, and one seeded run of the model
// is shown beside it, so the gap between expectation and any single run is visible.
function Ponds({ total, expected, run, unit, revealed }: { total: number; expected: number; run: number; unit: string; revealed: boolean }) {
  const cols = Math.min(10, total), rows = Math.ceil(total / cols), cell = 26, x0 = 12;
  const block = (y: number, filled: number, label: string) => (
    <g>
      <text x={x0} y={y - 8} className="numfig__scale">{label}</text>
      {Array.from({ length: total }, (_, i) => (
        <circle key={i} cx={x0 + (i % cols) * cell + cell / 2} cy={y + Math.floor(i / cols) * cell + cell / 2} r={9} className={i < filled ? 'numfig__parent' : 'numfig__empty'} />
      ))}
    </g>
  );
  const h = rows * cell;
  return (
    <svg className="numfig numfig--ponds" viewBox={`0 0 ${x0 * 2 + cols * cell} ${revealed ? h * 2 + 80 : h + 40}`} role="img"
      aria-label={revealed ? `${expected} of ${total} ${unit} expected; one model run gave ${run}` : `${total} ${unit}`}>
      {block(24, revealed ? Math.round(expected) : 0, revealed ? `Expected: ${expected} of ${total}` : `${total} ${unit}`)}
      {revealed && block(h + 64, run, `One run of the model: ${run} of ${total}`)}
    </svg>
  );
}
