import type { DiagramSpec } from '../content/types';

// Replica plating, drawn from data: one plain dish, a velvet pad, and copies stamped onto
// treated dishes. Colonies that survive on a copy sit where the pack's `spots` say, the same
// place on every copy, which is the whole argument.

type Spec = Extract<DiagramSpec, { kind: 'replica' }>;

function Plate({ cx, cy, r, label, spots, lawn }: { cx: number; cy: number; r: number; label: string; spots: [number, number][]; lawn?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="replica__rim" />
      <circle cx={cx} cy={cy} r={r - 4} className={lawn ? 'replica__lawn' : 'replica__agar'} />
      {spots.map(([sx, sy], i) => <circle key={i} cx={cx + (sx - 0.5) * 1.5 * r} cy={cy + (sy - 0.5) * 1.5 * r} r={r * 0.09} className="replica__colony" />)}
      <text x={cx} y={cy + r + 26} textAnchor="middle" className="diagram__label replica__label">{label}</text>
    </g>
  );
}

export function Replica({ spec }: { spec: Spec }) {
  const W = 600, r = 64, top = 92;
  const n = spec.copies.length;
  const step = (W - 2 * r - 20) / Math.max(1, n - 1);
  return (
    <figure className="diagram">
      <figcaption className="diagram__title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${W} 420`} role="img" aria-label={`${spec.source}, copied onto ${n} dishes: ${spec.copies.join(', ')}. Colonies grow at the same ${spec.spots.length} places on every copy.`}>
        <Plate cx={W / 2} cy={top} r={r} label={spec.source} spots={[]} lawn />
        {spec.copies.map((label, i) => {
          const cx = r + 10 + i * step;
          return (
            <g key={label}>
              <line x1={W / 2} y1={top + r + 36} x2={cx} y2={300 - r - 8} className="replica__path" />
              <Plate cx={cx} cy={300} r={r} label={label} spots={spec.spots} />
            </g>
          );
        })}
      </svg>
      <p className="diagram__note">{spec.note}</p>
    </figure>
  );
}
