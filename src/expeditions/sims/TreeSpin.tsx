import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Choice, Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Confident, Credit, Question, Verdict } from '../blocks/ui';
import { closer, closestRelatives, find, layout, mrca, parseNewick, rotate, tipsOf, type TreeNode } from './tree';
import './TreeSpin.css';

// A family tree you can turn in your hands. Tap a branch point and its two branches
// swap sides; the learner sees the order of names change while every relationship
// stays put. Questions are keyed from the tree's shape (sims/tree.ts), never typed.

type Task =
  | { kind: 'closer'; gradeId: string; transfer?: boolean; ask: string; of: string; options: [string, string]; tie: string; feedback?: Record<string, string>; explain: string }
  | { kind: 'spin'; gradeId: string; transfer?: boolean; prompt: string; minSpins: number; ask: string; choices: Choice[]; answer: string; explain: string }
  | { kind: 'tapTip'; gradeId: string; transfer?: boolean; ask: string; of: string; explain: string }
  | { kind: 'tapNode'; gradeId: string; transfer?: boolean; ask: string; pair: [string, string]; explain: string };

export type TreeSpinParams = {
  /** The tree as drawn at the start. Its shape must equal `pinned` (tested); only the branch order differs. */
  newick: string;
  /** The tree exactly as fetched from its source, unary nodes collapsed. */
  pinned: string;
  tips: Record<string, string>;
  /** Shown under the tree. */
  credit: string;
  tasks: Task[];
  /** A photo set beside the tree, shown whole. */
  figure?: { media: string; caption: string };
};

const W = 600, ROW = 56, TOP = 22, LABEL = 190, LEFT = 22;
type Point = { x: number; y: number };

function useReducedMotion() {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
}

export function TreeSpin({ beat }: { beat: SimBeat }) {
  const { done, record, evidenceFor, media } = useBeat();
  const p = beat.params as unknown as TreeSpinParams;
  const [tree, setTree] = useState<TreeNode>(() => parseNewick(p.newick));
  const [spins, setSpins] = useState(0);
  const answered = (t: Task) => !!evidenceFor(t.gradeId);
  const active = p.tasks.find(t => !answered(t));
  const selecting = active && (active.kind === 'tapTip' || active.kind === 'tapNode');
  const [pick, setPick] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => { if (!active) done(); }, [active, done]);
  useEffect(() => { setPick(null); }, [active?.gradeId]);

  // Positions tween from the old layout to the new one whenever the tree is turned.
  const target = useMemo(() => layout(tree), [tree]);
  const depth = useMemo(() => Math.max(...[...target.values()].map(n => n.x)), [target]);
  const toPoint = useCallback((x: number, y: number): Point => ({ x: LEFT + (x / depth) * (W - LABEL - LEFT - 14), y: TOP + y * ROW + ROW / 2 }), [depth]);
  const [shown, setShown] = useState<Map<string, Point>>(() => new Map([...target.values()].map(n => [n.id, toPoint(n.x, n.y)])));
  const from = useRef(shown);
  from.current = shown;
  useEffect(() => {
    const goal = new Map([...target.values()].map(n => [n.id, toPoint(n.x, n.y)]));
    if (reduce) { setShown(goal); return; }
    const start = performance.now(), begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 420), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setShown(new Map([...goal].map(([id, g]) => { const b = begin.get(id) ?? g; return [id, { x: b.x + (g.x - b.x) * e, y: b.y + (g.y - b.y) * e }]; })));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, toPoint, reduce]);

  const tips = tipsOf(tree);
  const H = TOP * 2 + tips.length * ROW + 26;
  const label = (id: string) => p.tips[id] ?? id.replace(/_/g, ' ');

  // What the finished questions light up: the answer's common ancestor, and the learner's picks.
  const lit = useMemo(() => {
    const strong = new Set<string>(), soft = new Set<string>();
    for (const t of p.tasks) {
      if (!answered(t)) continue;
      if (t.kind === 'closer') {
        const key = closer(tree, t.of, t.options[0], t.options[1]);
        if (key !== 'tie') { strong.add(mrca(tree, t.of, key).id); soft.add(mrca(tree, t.of, key === t.options[0] ? t.options[1] : t.options[0]).id); }
      }
      if (t.kind === 'tapNode') strong.add(mrca(tree, t.pair[0], t.pair[1]).id);
    }
    return { strong, soft };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, p.tasks, evidenceFor]);

  const keyOf = (t: Task): string[] => t.kind === 'tapTip' ? closestRelatives(tree, t.of) : t.kind === 'tapNode' ? [mrca(tree, t.pair[0], t.pair[1]).id] : [];

  const spin = (id: string) => { setTree(t => rotate(t, id)); setSpins(n => n + 1); };
  const tapNode = (id: string) => {
    if (selecting && active?.kind === 'tapNode') setPick(id);
    else if (!selecting) spin(id);
  };
  const tapTip = (id: string) => { if (selecting && active?.kind === 'tapTip' && id !== active.of) setPick(id); };

  // Touch: the nearest branch point (or row) to the finger, so small targets stay easy to hit.
  const svg = useRef<SVGSVGElement>(null);
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svg.current; if (!el) return;
    const box = el.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W, y = ((e.clientY - box.top) / box.height) * H;
    if (selecting && active?.kind === 'tapTip') {
      const row = Math.floor((y - TOP) / ROW);
      if (row >= 0 && row < tips.length) tapTip(tips[row]);
      return;
    }
    let best: string | null = null, bestD = 44;
    for (const n of target.values()) {
      if (n.tip) continue;
      const pt = shown.get(n.id); if (!pt) continue;
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d < bestD) { bestD = d; best = n.id; }
    }
    if (best) tapNode(best);
  };
  const keyed = (act: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };

  const commitTap = (t: Task, confidence: Confidence) => {
    if (!pick) return;
    const keys = keyOf(t);
    record({ gradeId: t.gradeId, transfer: !!t.transfer, correct: keys.includes(pick), confidence, prompt: t.ask,
      parts: { pick }, chosen: t.kind === 'tapTip' ? label(pick) : `the branch point joining ${tipsOf(find(tree, pick)!).map(label).join(', ')}` });
  };

  const paths: string[] = [];
  for (const n of target.values()) {
    if (n.tip) continue;
    const a = shown.get(n.id)!;
    const ys = n.children.map(c => shown.get(c)!.y);
    paths.push(`M${a.x},${Math.min(...ys)}V${Math.max(...ys)}`);
    for (const c of n.children) { const b = shown.get(c)!; paths.push(`M${a.x},${b.y}H${b.x}`); }
  }
  const rootPt = shown.get(tree.id)!;

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      {p.figure && (
        <figure className="figure figure--side treespin__figure">
          <img src={media(p.figure.media).src} alt={media(p.figure.media).alt} />
          <figcaption>{p.figure.caption} <Credit media={p.figure.media} /></figcaption>
        </figure>
      )}
      <div className={`treespin${selecting ? ' is-selecting' : ''}`}>
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Family tree of ${tips.map(label).join(', ')}`} onPointerUp={onPointerUp}>
          <path d={`M${LEFT - 14},${rootPt.y}H${rootPt.x}`} className="treespin__line" />
          {paths.map((d, i) => <path key={i} d={d} className="treespin__line" />)}
          {[...target.values()].filter(n => !n.tip).map(n => {
            const pt = shown.get(n.id)!;
            const state = lit.strong.has(n.id) ? ' is-key' : lit.soft.has(n.id) ? ' is-soft' : '';
            const picked = pick === n.id ? ' is-picked' : '';
            const graded = !active && p.tasks.some(t => t.kind === 'tapNode' && evidenceFor(t.gradeId)?.parts?.pick === n.id && !keyOf(t).includes(n.id)) ? ' is-miss' : '';
            return (
              <g key={n.id} className={`treespin__node${state}${picked}${graded}`} transform={`translate(${pt.x},${pt.y})`}
                role="button" tabIndex={0} aria-label={`${selecting ? 'Choose' : 'Turn'} the branch point joining ${tipsOf(find(tree, n.id)!).map(label).join(', ')}`}
                onKeyDown={keyed(() => tapNode(n.id))}>
                <circle r="11" />
              </g>
            );
          })}
          {tips.map(id => {
            const pt = shown.get(id)!;
            const focus = active && 'of' in active && active.of === id;
            const pair = active?.kind === 'tapNode' && active.pair.includes(id);
            const pickedTip = pick === id;
            return (
              <g key={id} className={`treespin__tip${focus || pair ? ' is-focus' : ''}${pickedTip ? ' is-picked' : ''}`} transform={`translate(${pt.x},${pt.y})`}
                role={selecting && active?.kind === 'tapTip' ? 'button' : undefined} tabIndex={selecting && active?.kind === 'tapTip' ? 0 : undefined}
                onKeyDown={selecting && active?.kind === 'tapTip' ? keyed(() => tapTip(id)) : undefined}>
                <rect x="10" y={-ROW / 2 + 4} width={LABEL - 10} height={ROW - 8} rx="4" className="treespin__row" />
                <circle r="5" className="treespin__dot" />
                <text x="20" y="8">{label(id)}</text>
              </g>
            );
          })}
          <text x={LEFT - 12} y={H - 8} className="treespin__axis">Older</text>
          <text x={W - LABEL + 6} y={H - 8} className="treespin__axis">Alive today</text>
        </svg>
      </div>
      <p className="stage__note">{p.credit}</p>
      <details className="treespin__list">
        <summary>The same tree as an outline</summary>
        <ul className="treespin__outline"><Outline node={tree} label={label} /></ul>
      </details>

      {p.tasks.filter(t => answered(t) || t === active).map(t => (
        <div key={t.gradeId} className="treespin__task">
          {t.kind === 'closer' && (
            <Question gradeId={t.gradeId} transfer={t.transfer} prompt={t.ask} columns
              choices={[...t.options.map(id => ({ id, label: label(id), feedback: t.feedback?.[id] })), { id: 'tie', label: t.tie, feedback: t.feedback?.tie }]}
              answer={closer(tree, t.of, t.options[0], t.options[1])} explain={t.explain} />
          )}
          {t.kind === 'spin' && (spins >= t.minSpins || answered(t)
            ? <Question gradeId={t.gradeId} transfer={t.transfer} prompt={t.ask} choices={t.choices} answer={t.answer} explain={t.explain} />
            : <p className="question__prompt">{t.prompt}{spins > 0 && <span className="treespin__count"> {spins} of {t.minSpins}</span>}</p>)}
          {(t.kind === 'tapTip' || t.kind === 'tapNode') && (
            <div className="question">
              <p className="question__prompt">{t.ask}</p>
              {!answered(t) && pick && <Confident onCommit={c => commitTap(t, c)} />}
              {answered(t) && <Verdict correct={!!evidenceFor(t.gradeId)?.correct}>{t.explain}</Verdict>}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}


function Outline({ node, label }: { node: TreeNode; label: (id: string) => string }) {
  if (!node.children.length) return <li>{label(node.id)}</li>;
  return (
    <li className="treespin__group">
      <span>{tipsOf(node).length} share one ancestor:</span>
      <ul>{node.children.map(c => <Outline key={c.id} node={c} label={label} />)}</ul>
    </li>
  );
}
