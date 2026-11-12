import type { DiagramSpec } from '../content/types';
import { Replica } from './Replica';

// Figures drawn from data instead of image files: no licence to track, nothing
// to crop, and they can change once the learner has committed to an answer.

export function Diagram({ spec, revealed }: { spec: DiagramSpec; revealed: boolean }) {
  if (spec.kind === 'replica') return <Replica spec={spec} />;
  return spec.kind === 'bands' ? <Bands spec={spec} /> : <Karyotype spec={spec} revealed={revealed} />;
}

/** A dish with mirrored bands that get stronger towards the middle. */
function Bands({ spec }: { spec: Extract<DiagramSpec, { kind: 'bands' }> }) {
  const order = [...spec.bands, ...spec.bands.slice(0, -1).reverse()];
  const W = 600, H = 260, pad = 6, w = (W - pad * 2) / order.length;
  const depth = (i: number) => spec.bands.indexOf(order[i]) / (spec.bands.length - 1);
  return (
    <figure className="diagram">
      <figcaption className="diagram__title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 44}`} role="img" aria-label={`${spec.title}: bands ${order.join(', ')}`}>
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="10" className="diagram__dish" />
        {order.map((label, i) => (
          <g key={i}>
            <rect x={pad + i * w} y={pad} width={w - 1.5} height={H - pad * 2} className="diagram__band" style={{ fillOpacity: 0.06 + depth(i) * 0.62 }} />
            <text x={pad + i * w + w / 2} y={H + 32} textAnchor="middle" className="diagram__label">{label}</text>
          </g>
        ))}
        {[0, order.length - 1].map(i => (
          <g key={`seed${i}`} className="diagram__seed">
            {Array.from({ length: 8 }, (_, k) => <ellipse key={k} cx={pad + i * w + w / 2 + (k % 2 ? 7 : -7)} cy={28 + k * 29} rx="7" ry="3.5" />)}
          </g>
        ))}
      </svg>
      <p className="diagram__note">{spec.note}</p>
    </figure>
  );
}

/** Rows of chromosome pairs; after the answer, the marked ones line up to show the join. */
function Karyotype({ spec, revealed }: { spec: Extract<DiagramSpec, { kind: 'karyotype' }>; revealed: boolean }) {
  // Twelve pairs to a line, so each chromosome stays big enough to see on a phone.
  const W = 600, perLine = 12, lineH = 92, step = W / perLine;
  const blockH = (pairs: number) => 40 + Math.ceil(pairs / perLine) * lineH;
  const tops = spec.rows.map((_, r) => spec.rows.slice(0, r).reduce((sum, row) => sum + blockH(row.pairs), 0));
  const rowsH = spec.rows.reduce((sum, row) => sum + blockH(row.pairs), 0);
  const capsule = (x: number, y: number, h: number, on: boolean, key: string) => (
    <g key={key} className={`diagram__chrom${on ? ' is-on' : ''}`}>
      <rect x={x} y={y} width="13" height={h * 0.38} rx="6.5" />
      <rect x={x} y={y + h * 0.38 + 3} width="13" height={h * 0.62 - 3} rx="6.5" />
    </g>
  );
  return (
    <figure className="diagram">
      <svg viewBox={`0 0 ${W} ${rowsH + (revealed ? 200 : 0)}`} role="img" aria-label={spec.rows.map(r => `${r.label}: ${r.pairs} pairs`).join('; ')}>
        {spec.rows.map((row, r) => (
          <g key={row.label}>
            <text x="4" y={tops[r] + 26} className="diagram__row">{row.label} · {row.pairs} pairs</text>
            {Array.from({ length: row.pairs }, (_, i) => {
              const h = 72 - i * 1.6, on = revealed && row.mark.includes(i);
              const x = 10 + (i % perLine) * step, y = tops[r] + 40 + Math.floor(i / perLine) * lineH + (72 - h);
              return <g key={i}>{capsule(x, y, h, on, 'a')}{capsule(x + 17, y, h, on, 'b')}</g>;
            })}
          </g>
        ))}
        {revealed && (() => {
          const y = rowsH + 10, a = 260, b = 225, x0 = 20;
          return (
            <g className="diagram__fusion">
              <text x="4" y={y + 22} className="diagram__row">{spec.fused.from}</text>
              <rect x={x0} y={y + 36} width={a} height="22" rx="11" className="diagram__bar" />
              <rect x={x0 + a + 18} y={y + 36} width={b} height="22" rx="11" className="diagram__bar" />
              <text x="4" y={y + 100} className="diagram__row">{spec.fused.into}</text>
              <rect x={x0} y={y + 114} width={a + b} height="22" rx="11" className="diagram__bar is-human" />
              <line x1={x0 + a} x2={x0 + a} y1={y + 106} y2={y + 144} className="diagram__seam" />
              <circle cx={x0 + a * 0.4} cy={y + 125} r="7" className="diagram__centro" />
              <circle cx={x0 + a + b * 0.45} cy={y + 125} r="7" className="diagram__centro is-ghost" />
              <text x={x0 + a} y={y + 172} textAnchor="middle" className="diagram__callout">1</text>
              <text x={x0 + a + b * 0.45} y={y + 172} textAnchor="middle" className="diagram__callout">2</text>
            </g>
          );
        })()}
      </svg>
      {revealed && <ol className="diagram__notes">{spec.fused.notes.map(n => <li key={n}>{n}</li>)}</ol>}
    </figure>
  );
}
