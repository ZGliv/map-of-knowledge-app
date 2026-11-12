// The patch of map this idea owns, with its neighbours still dim. It fills as the idea is proved:
// the reward is the map lighting, here and on the atlas.
function hex(cx: number, cy: number, r: number, seed: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    const wobble = 1 + 0.07 * Math.sin(seed * 12.9898 + k * 78.233);
    return `${(cx + Math.cos(a) * r * wobble).toFixed(1)},${(cy + Math.sin(a) * r * wobble).toFixed(1)}`;
  }).join(' ');
}

/** `core` marks Lasting: a white core inside the lit cell (plan §2.3). `glow` is the freshness rim,
 * 0 to 1 (checks/freshness.ts): it re-lights when a refresh is made, and never touches the fill. */
export function Patch({ label, fill, core = false, glow }: { label: string; fill: number; core?: boolean; glow?: number }) {
  const r = 44, d = Math.sqrt(3) * r;
  // Long names wrap inside the cell, a word at a time, about 11 characters a line.
  const lines = label.split(' ').reduce<string[]>((out, word) => {
    const last = out.at(-1);
    if (last && (last + ' ' + word).length <= 11) out[out.length - 1] = `${last} ${word}`; else out.push(word);
    return out;
  }, []);
  const neighbours = Array.from({ length: 6 }, (_, k) => [200 + Math.cos((k * Math.PI) / 3) * d, 118 + Math.sin((k * Math.PI) / 3) * d]);
  return (
    <svg className={`patch${fill >= 1 ? ' is-lit' : ''}`} viewBox="40 0 320 236" role="img" aria-label={`${label}: ${core ? 'Lasting' : fill >= 1 ? 'lit' : fill > 0.2 ? 'partly lit' : 'not lit yet'}`} data-patch-fill={fill}>
      {neighbours.map(([x, y], i) => <polygon key={i} points={hex(x, y, r - 2, i + 1)} className="patch__cell" />)}
      <polygon points={hex(200, 118, r - 2, 0)} className="patch__home" style={{ fillOpacity: fill }} />
      {glow !== undefined && <polygon points={hex(200, 118, r + 5, 0)} className="patch__glow" style={{ opacity: glow }} data-patch-glow={glow} />}
      {core && <polygon points={hex(200, 100, 12, 3)} className="patch__core" />}
      <text x="200" y={(core ? 134 : 122) - (lines.length - 1) * 7} textAnchor="middle" className="patch__label">{lines.map((line, i) => <tspan key={i} x="200" dy={i ? 14 : 0}>{line}</tspan>)}</text>
    </svg>
  );
}
