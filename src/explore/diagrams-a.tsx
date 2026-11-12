import type { ReactNode } from 'react';
import { describeSpan, formatClock, clockSeconds, DAY_SECONDS, secondsBeforeMidnight } from '../expeditions/sims/deepTimeMath';
import { ratioText, sample, seeded } from '../expeditions/sims/cross';
import { alleleFor, dominantShare, step as selectionStep } from '../expeditions/sims/selection';
import { layout, mrca, parseNewick, type TreeNode } from '../expeditions/sims/tree';
import './diagrams-a.css';

// Code-drawn figures for the E01–E04 and E06 reels, painted the same way as diagrams.tsx:
// React draws each figure once, then `paintDiagramA` moves it on the reel's clock (p is progress
// 0–1 through the frame, ms the reel's clock) by writing SVG attributes directly. Within a reel,
// a step starts where the step before it ends. Every number a figure shows is computed here from
// the expedition sims' own maths (tree, cross, selection, deepTimeMath) or is a count the pack
// quotes from its source; nothing is typed in to look right.

export type DiagramA =
  | { name: 'tree'; step: 'grow' | 'spin' | 'lungfish' | 'trace' | 'turn' | 'whale' | 'cow' }
  | { name: 'peas'; step: 'cross' | 'self' | 'count' | 'plantA' | 'plantB' }
  | { name: 'blend'; step: 'paint' | 'genes' }
  | { name: 'moths'; step: 'rise' | 'fall' }
  | { name: 'drift'; step: 'squeeze' | 'regrow' }
  | { name: 'jackpot'; step: 'samples' | 'cultures' | 'early' }
  | { name: 'clock'; step: 'day' | 'life' | 'late' | 'zoom' | 'blink' }
  | { name: 'rocks'; step: 'settle' | 'tilt' | 'cover' };

const W = 360;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const f1 = (v: number) => v.toFixed(1);
const f3 = (v: number) => clamp(v).toFixed(3);
const set = (el: Element | null | undefined, attrs: Record<string, string | number>) => {
  if (!el) return;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
};
const parts = (root: SVGSVGElement, name: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-part="${name}"]`));
const one = (root: SVGSVGElement, name: string) => root.querySelector<SVGElement>(`[data-part="${name}"]`);
const text = (el: Element | null | undefined, value: string) => { if (el && el.textContent !== value) el.textContent = value; };

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return <svg className="reel-diagram-svg dga" viewBox={`0 10 ${W} 450`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>{children}</svg>;
}

/* ───────────── E01: a real tree of eleven living animals ───────────── */

/** Open Tree of Life synthesis opentree16.1 (CC0), turned as E01's first tree shows it.
 * A test proves it is the same tree as the pack's pinned one. */
export const E01_TREE = '(Carcharodon_carcharias,(Salmo_salar,(Lepidosiren_paradoxa,(((((Balaenoptera_musculus,Hippopotamus_amphibius),Bos_taurus),Homo_sapiens),((Passer_domesticus,Crocodylus_niloticus),Podarcis_muralis)),Rana_temporaria))));';
const TIP_NAMES: Record<string, string> = {
  Carcharodon_carcharias: 'Shark', Salmo_salar: 'Salmon', Lepidosiren_paradoxa: 'Lungfish', Rana_temporaria: 'Frog',
  Podarcis_muralis: 'Lizard', Crocodylus_niloticus: 'Crocodile', Passer_domesticus: 'Sparrow', Homo_sapiens: 'Human',
  Bos_taurus: 'Cow', Hippopotamus_amphibius: 'Hippo', Balaenoptera_musculus: 'Blue whale',
};
const TREE = parseNewick(E01_TREE);
const PLACED = layout(TREE);
const NODES = Array.from(PLACED.values());
const DEPTH = Math.max(...NODES.map(node => node.x));
const TIPS_X = 226;
const treeX = (level: number) => 30 + (level / DEPTH) * (TIPS_X - 30);
const treeY = (row: number) => 50 + row * 36.4;
const PARENT = new Map<string, string>();
const DESCENDANTS = new Map<string, string[]>();
const indexTree = (node: TreeNode): string[] => {
  const below = node.children.flatMap(child => { PARENT.set(child.id, node.id); return [child.id, ...indexTree(child)]; });
  DESCENDANTS.set(node.id, below);
  return below;
};
indexTree(TREE);
const TIP_IDS = NODES.filter(node => node.tip).sort((a, b) => a.y - b.y).map(node => node.id);
const BRANCH_IDS = NODES.filter(node => node.id !== TREE.id).map(node => node.id);
const T = { lungfish: 'Lepidosiren_paradoxa', salmon: 'Salmo_salar', cow: 'Bos_taurus', human: 'Homo_sapiens', whale: 'Balaenoptera_musculus', hippo: 'Hippopotamus_amphibius' };
/** Where branches join: computed from the tree, so a highlight can only ever land on a real shared ancestor. */
export const E01_JOINS = {
  lungfishCow: mrca(TREE, T.lungfish, T.cow).id,
  lungfishSalmon: mrca(TREE, T.lungfish, T.salmon).id,
  whaleHippo: mrca(TREE, T.whale, T.hippo).id,
  whaleCow: mrca(TREE, T.whale, T.cow).id,
  humanCow: mrca(TREE, T.human, T.cow).id,
};

type TreeStep = Extract<DiagramA, { name: 'tree' }>['step'];
type Window = [number, number];
const DONE: Window = [-2, -1];
interface TreeLook {
  grow?: boolean;
  /** Spinning a branch point turns everything below it over, like a hanging mobile. */
  spins: { node: string; at: Window }[];
  focus: { tip: string; strong: boolean; at: Window }[];
  routes: { from: string; to: string; strong: boolean; at: Window }[];
}
const LUNG_ROUTES: TreeLook['routes'] = [
  { from: T.lungfish, to: E01_JOINS.lungfishCow, strong: true, at: [0.04, 0.3] },
  { from: T.cow, to: E01_JOINS.lungfishCow, strong: true, at: [0.22, 0.48] },
  { from: T.salmon, to: E01_JOINS.lungfishSalmon, strong: false, at: [0.6, 0.86] },
];
const LUNG_FOCUS: TreeLook['focus'] = [{ tip: T.lungfish, strong: true, at: DONE }, { tip: T.salmon, strong: false, at: DONE }];
const WHALE_ROUTES: TreeLook['routes'] = [
  { from: T.whale, to: E01_JOINS.whaleHippo, strong: true, at: [0.18, 0.5] },
  { from: T.hippo, to: E01_JOINS.whaleHippo, strong: true, at: [0.3, 0.62] },
];
const TREE_LOOKS: Record<TreeStep, TreeLook> = {
  grow: { grow: true, spins: [], focus: [], routes: [] },
  spin: { spins: [{ node: TREE.id, at: [0.06, 0.42] }, { node: E01_JOINS.humanCow, at: [0.56, 0.9] }], focus: [], routes: [] },
  lungfish: { spins: [], focus: [{ tip: T.lungfish, strong: true, at: [0.08, 0.3] }, { tip: T.salmon, strong: false, at: [0.32, 0.54] }], routes: [] },
  trace: { spins: [], focus: [...LUNG_FOCUS, { tip: T.cow, strong: true, at: [0.24, 0.46] }], routes: LUNG_ROUTES },
  turn: { spins: [{ node: E01_JOINS.lungfishCow, at: [0.16, 0.66] }], focus: [...LUNG_FOCUS, { tip: T.cow, strong: true, at: DONE }], routes: LUNG_ROUTES.map(route => ({ ...route, at: DONE })) },
  whale: { spins: [], focus: [{ tip: T.whale, strong: true, at: [0.06, 0.26] }, { tip: T.hippo, strong: true, at: [0.18, 0.38] }], routes: WHALE_ROUTES },
  cow: {
    spins: [],
    focus: [{ tip: T.whale, strong: true, at: DONE }, { tip: T.hippo, strong: true, at: DONE }, { tip: T.cow, strong: false, at: [0.2, 0.42] }],
    routes: [...WHALE_ROUTES.map(route => ({ ...route, at: DONE })), { from: T.cow, to: E01_JOINS.whaleCow, strong: false, at: [0.3, 0.66] }],
  },
};

function treeYs(look: TreeLook, p: number) {
  const ys = new Map(NODES.map(node => [node.id, treeY(node.y)]));
  const squash = new Map<string, number>();
  for (const spin of look.spins) {
    const s = ease(span(p, spin.at[0], spin.at[1]));
    if (s <= 0) continue;
    // Turn about the middle of the branch's own tips, so the branch spins in place.
    const below = DESCENDANTS.get(spin.node)!, tips = below.filter(id => TIP_NAMES[id]).map(id => ys.get(id)!);
    const c = (Math.min(...tips) + Math.max(...tips)) / 2, k = Math.cos(Math.PI * s);
    for (const id of [spin.node, ...below]) {
      ys.set(id, c + (ys.get(id)! - c) * k);
      if (s < 1) squash.set(id, Math.min(squash.get(id) ?? 1, Math.abs(k)));
    }
  }
  return { ys, squash };
}
const nodeX = (id: string) => treeX(PLACED.get(id)!.x);
function routePath(from: string, to: string, ys: Map<string, number>) {
  let d = `M${f1(nodeX(from))} ${f1(ys.get(from)!)}`;
  for (let at = from; at !== to;) { const up = PARENT.get(at)!; d += `H${f1(nodeX(up))}V${f1(ys.get(up)!)}`; at = up; }
  return d;
}

function Tree({ step }: { step: TreeStep }) {
  const look = TREE_LOOKS[step];
  return <Frame label="A family tree of eleven living animals: shark, salmon, lungfish, frog, lizard, crocodile, sparrow, human, cow, hippo and blue whale">
    <defs><clipPath id={`dga-grow-${step}`}><rect data-part="grow" x="0" y="0" width={look.grow ? 0 : W} height="470" /></clipPath></defs>
    <g clipPath={`url(#dga-grow-${step})`}>
      <path data-part="root" className="dga-branch" d="" />
      {BRANCH_IDS.map(id => <path key={id} data-part="branch" data-id={id} className="dga-branch" d="" />)}
      {look.routes.map((route, i) => <path key={i} data-part="route" className={`dga-route${route.strong ? ' is-strong' : ''}`} d="" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />)}
      {look.routes.map((route, i) => <circle key={i} data-part="join" className={`dga-join${route.strong ? ' is-strong' : ''}`} r="0" />)}
      {TIP_IDS.map(id => <circle key={id} data-part="tip-dot" data-id={id} className="dga-tip-dot" cx={TIPS_X} r="2.6" />)}
      {TIP_IDS.map(id => <text key={id} data-part="tip" data-id={id} className="dga-tip" x={TIPS_X + 9}>{TIP_NAMES[id]}</text>)}
      {TIP_IDS.map(id => <text key={id} data-part="tip-focus" data-id={id} className="dga-tip is-focus" x={TIPS_X + 9} opacity="0">{TIP_NAMES[id]}</text>)}
    </g>
    <line data-part="today" x1={TIPS_X} x2={TIPS_X} y1="36" y2="428" className="dga-today" opacity="0" />
    <text data-part="today-label" x={TIPS_X} y="29" textAnchor="middle" className="dga-small" opacity="0">alive today</text>
  </Frame>;
}

function paintTree(root: SVGSVGElement, step: TreeStep, p: number) {
  const look = TREE_LOOKS[step];
  const { ys, squash } = treeYs(look, p);
  const rootY = ys.get(TREE.id)!;
  set(one(root, 'root'), { d: `M${f1(treeX(0) - 18)} ${f1(rootY)}H${f1(treeX(0))}` });
  parts(root, 'branch').forEach(el => {
    const id = el.dataset.id!, up = PARENT.get(id)!;
    set(el, { d: `M${f1(nodeX(up))} ${f1(ys.get(up)!)}V${f1(ys.get(id)!)}H${f1(nodeX(id))}` });
  });
  const grown = look.grow ? ease(span(p, 0.04, 0.74)) : 1;
  set(one(root, 'grow'), { width: f1(grown * W) });
  const today = look.grow ? span(p, 0.74, 0.9) : 1;
  set(one(root, 'today'), { opacity: f3(today * 0.7) });
  set(one(root, 'today-label'), { opacity: f3(today) });
  const focus = new Map<string, { value: number; strong: boolean }>();
  for (const item of look.focus) focus.set(item.tip, { value: ease(span(p, item.at[0], item.at[1])), strong: item.strong });
  const anyFocus = [...focus.values()].some(item => item.value > 0);
  for (const el of [...parts(root, 'tip'), ...parts(root, 'tip-focus'), ...parts(root, 'tip-dot')]) {
    const id = el.dataset.id!, y = ys.get(id)!, turned = 0.3 + 0.7 * (squash.get(id) ?? 1);
    const f = focus.get(id);
    if (el.tagName === 'circle') { set(el, { cy: f1(y) }); continue; }
    set(el, { y: f1(y + 5) });
    if (el.dataset.part === 'tip') set(el, { opacity: f3(turned * (anyFocus && !f ? 0.5 : 0.86)) });
    else set(el, { opacity: f3(turned * (f?.value ?? 0)), class: `dga-tip is-focus${f?.strong ? ' is-strong' : ''}` });
  }
  const routes = parts(root, 'route'), joins = parts(root, 'join');
  look.routes.forEach((route, i) => {
    const drawn = ease(span(p, route.at[0], route.at[1]));
    set(routes[i], { d: routePath(route.from, route.to, ys), 'stroke-dashoffset': f3(1 - drawn) });
    set(joins[i], { cx: f1(nodeX(route.to)), cy: f1(ys.get(route.to)!), r: f1(6 * ease(span(drawn, 0.82, 1))) });
  });
}

/* ───────────── E02: Mendel's peas ───────────── */

type PeaStep = Extract<DiagramA, { name: 'peas' }>['step'];
const PEA_LOCUS = { R: 1, r: 0 };
/** The second generation: 100 seeds from round hybrids crossed with themselves, drawn by the pack's
 * own cross model. Seeded so the grid lands on the expected one in four. */
const SELF_SEEDS = (() => {
  for (let k = 0; ; k += 1) {
    const seeds = sample('Rr', 'Rr', 100, PEA_LOCUS, seeded(`reel-e02-self-${k}`)).map(g => (g === 'rr' ? 'wrinkled' : 'round'));
    if (seeds.filter(s => s === 'wrinkled').length === 25) return seeds;
  }
})();
/** Mendel's own counts (Bateson's translation): experiment 1 and two single plants. */
export const MENDEL = { round: 5474, wrinkled: 1850, plants: 253, plantA: [43, 2], plantB: [14, 15] } as const;
const shuffleWith = (n: number, seed: string) => {
  const rand = seeded(seed), order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
};
const podSeeds = ([round, wrinkled]: readonly number[], seed: string) => {
  const order = shuffleWith(round + wrinkled, seed);
  return order.map(i => (i < round ? 'round' : 'wrinkled'));
};
const PLANT_A = podSeeds(MENDEL.plantA, 'reel-e02-plant-a');
const PLANT_B = podSeeds(MENDEL.plantB, 'reel-e02-plant-b');

function Pea({ look, part, x, y, scale = 1, extra }: { look: 'round' | 'wrinkled'; part: string; x: number; y: number; scale?: number; extra?: Record<string, string | number> }) {
  return <g data-part={part} data-x={x} data-y={y} data-s={scale} transform={`translate(${x} ${y}) scale(0)`} {...extra}>
    {look === 'round'
      ? <><circle r="9.6" className="dga-pea" /><ellipse cx="-3.4" cy="-3.8" rx="2.8" ry="1.9" className="dga-pea-shine" /></>
      : <><path d="M-9 -2 C-10 -8 -4 -11 0 -9 C3 -11 9 -9 9 -4 C11 0 9 6 5 8 C2 11 -3 10 -6 8 C-10 6 -11 2 -9 -2 Z" className="dga-pea is-wrinkled" />
        <path d="M-5 -5 C-2 -3 -3 1 -6 3 M2 -7 C0 -3 3 0 1 4 M6 -2 C4 1 6 4 3 7" className="dga-pea-crease" /></>}
    {look === 'wrinkled' && <circle r="13.5" className="dga-pea-ring" data-ring="1" opacity="0" />}
  </g>;
}
const placePea = (el: Element, scale: number, dx = 0, dy = 0, x?: number, y?: number) => {
  const g = el as SVGGElement;
  const px = x ?? Number(g.dataset.x), py = y ?? Number(g.dataset.y);
  set(g, { transform: `translate(${f1(px + dx)} ${f1(py + dy)}) scale(${(Number(g.dataset.s) * scale).toFixed(3)})` });
};
const HYBRIDS = Array.from({ length: 12 }, (_, i) => ({ x: 80 + (i % 6) * 40, y: 206 + Math.floor(i / 6) * 44 }));
const HYBRIDS_UP = Array.from({ length: 12 }, (_, i) => ({ x: 48 + i * 24, y: 68 }));
const GRID = Array.from({ length: 100 }, (_, i) => ({ x: 45 + (i % 10) * 30, y: 128 + Math.floor(i / 10) * 30 }));
const podGrid = (n: number, x0: number) => Array.from({ length: n }, (_, i) => ({ x: x0 + (i % 5) * 24, y: 112 + Math.floor(i / 5) * 24 }));

function Peas({ step }: { step: PeaStep }) {
  if (step === 'count') {
    return <Frame label={`Mendel’s count: ${MENDEL.round.toLocaleString('en-US')} round seeds and ${MENDEL.wrinkled.toLocaleString('en-US')} wrinkled, ${ratioText(MENDEL.round, MENDEL.wrinkled)}`}>
      <text x={W / 2} y="92" textAnchor="middle" className="dga-small" data-part="count-head" opacity="0">{`${(MENDEL.round + MENDEL.wrinkled).toLocaleString('en-US')} seeds from ${MENDEL.plants} plants`}</text>
      <Pea look="round" part="count-pea" x={52} y={170} scale={1.3} />
      <Pea look="wrinkled" part="count-pea" x={52} y={262} scale={1.3} />
      <rect data-part="bar" x="78" y="152" height="36" width="0" rx="5" className="dga-bar" />
      <rect data-part="bar" x="78" y="244" height="36" width="0" rx="5" className="dga-bar is-accent" />
      <text data-part="bar-label" x="84" y="140" className="dga-label" opacity="0">0 round</text>
      <text data-part="bar-label" x="84" y="232" className="dga-label" opacity="0">0 wrinkled</text>
      <text data-part="ratio" x={W / 2} y="372" textAnchor="middle" className="dga-big" opacity="0">{ratioText(MENDEL.round, MENDEL.wrinkled)}</text>
    </Frame>;
  }
  if (step === 'plantA' || step === 'plantB') {
    const a = podGrid(PLANT_A.length, 52), b = podGrid(PLANT_B.length, 212);
    return <Frame label={`Two of Mendel’s hybrid plants: one gave ${MENDEL.plantA[0]} round seeds and ${MENDEL.plantA[1]} wrinkled, another ${MENDEL.plantB[0]} round and ${MENDEL.plantB[1]} wrinkled`}>
      <Pea look="round" part="legend" x={104} y={50} scale={0.9} />
      <text x="118" y="55" className="dga-small" data-part="legend-text">round</text>
      <Pea look="wrinkled" part="legend" x={196} y={50} scale={0.9} />
      <text x="210" y="55" className="dga-small" data-part="legend-text">wrinkled</text>
      <rect x="34" y="92" width="132" height="236" rx="18" className="dga-pod" data-part="pod" />
      <rect x="194" y="92" width="132" height="236" rx="18" className="dga-pod" data-part="pod" opacity={step === 'plantA' ? 0 : 1} />
      {PLANT_A.map((look, i) => <Pea key={`a${i}`} look={look as 'round' | 'wrinkled'} part="seed-a" x={a[i].x} y={a[i].y} scale={0.95} />)}
      {PLANT_B.map((look, i) => <Pea key={`b${i}`} look={look as 'round' | 'wrinkled'} part="seed-b" x={b[i].x} y={b[i].y} scale={0.95} />)}
      <text data-part="pod-label" x="100" y="366" textAnchor="middle" className="dga-big is-mid" opacity="0">{`${MENDEL.plantA[0]} : ${MENDEL.plantA[1]}`}</text>
      <text data-part="pod-label" x="260" y="366" textAnchor="middle" className="dga-big is-mid" opacity="0">{`${MENDEL.plantB[0]} : ${MENDEL.plantB[1]}`}</text>
    </Frame>;
  }
  return <Frame label={step === 'cross' ? 'A round-seeded pea crossed with a wrinkled-seeded one: every seed of the cross is round' : 'The round hybrids pollinate themselves: about one seed in four comes back wrinkled'}>
    <Pea look="round" part="parent" x={118} y={78} scale={1.9} />
    <Pea look="wrinkled" part="parent" x={242} y={78} scale={1.9} />
    <text data-part="times" x="180" y="86" textAnchor="middle" className="dga-label" opacity="0">×</text>
    <path data-part="bracket" d="M118 108V134H242V108M180 134V170" className="dga-bracket" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    {HYBRIDS.map((h, i) => <Pea key={`h${i}`} look="round" part="hybrid" x={h.x} y={h.y} scale={1.3} />)}
    {step === 'self' && SELF_SEEDS.map((look, i) => <Pea key={`s${i}`} look={look as 'round' | 'wrinkled'} part="grid" x={GRID[i].x} y={GRID[i].y} scale={0.95} />)}
  </Frame>;
}

function paintPeas(root: SVGSVGElement, step: PeaStep, p: number) {
  if (step === 'count') {
    const head = span(p, 0.02, 0.16), grow = ease(span(p, 0.14, 0.78));
    set(one(root, 'count-head'), { opacity: f3(head) });
    parts(root, 'count-pea').forEach((el, i) => placePea(el, ease(span(p, 0.06 + i * 0.06, 0.2 + i * 0.06))));
    const [round, wrinkled] = parts(root, 'bar');
    const max = 250;
    set(round, { width: f1(max * grow) });
    set(wrinkled, { width: f1(max * (MENDEL.wrinkled / MENDEL.round) * grow) });
    const [roundLabel, wrinkledLabel] = parts(root, 'bar-label');
    set(roundLabel, { opacity: f3(span(p, 0.14, 0.22)) }); set(wrinkledLabel, { opacity: f3(span(p, 0.14, 0.22)) });
    text(roundLabel, `${Math.round(MENDEL.round * grow).toLocaleString('en-US')} round`);
    text(wrinkledLabel, `${Math.round(MENDEL.wrinkled * grow).toLocaleString('en-US')} wrinkled`);
    set(one(root, 'ratio'), { opacity: f3(ease(span(p, 0.8, 0.94))) });
    return;
  }
  if (step === 'plantA' || step === 'plantB') {
    const fill = (name: string, from: number, to: number) => {
      const seeds = parts(root, name);
      seeds.forEach((el, i) => {
        const t = from + ((to - from) * i) / seeds.length;
        placePea(el, ease(span(p, t, t + 0.08)));
      });
    };
    parts(root, 'legend').forEach(el => placePea(el, 1));
    if (step === 'plantA') { fill('seed-a', 0.08, 0.7); parts(root, 'seed-b').forEach(el => placePea(el, 0)); }
    else { parts(root, 'seed-a').forEach(el => placePea(el, 1)); fill('seed-b', 0.08, 0.7); }
    const [la, lb] = parts(root, 'pod-label');
    set(la, { opacity: f3(step === 'plantA' ? ease(span(p, 0.74, 0.88)) : 1) });
    set(lb, { opacity: f3(step === 'plantB' ? ease(span(p, 0.74, 0.88)) : 0) });
    const pods = parts(root, 'pod');
    set(pods[1], { opacity: f3(step === 'plantB' ? span(p, 0, 0.1) : 0) });
    // The wrinkled seeds of the plant being counted light up once it is full.
    const ring = step === 'plantA' ? 'seed-a' : 'seed-b';
    for (const name of ['seed-a', 'seed-b']) parts(root, name).forEach(el => set(el.querySelector('[data-ring]'), { opacity: f3(name === ring ? ease(span(p, 0.74, 0.86)) : name === 'seed-a' ? 1 : 0) }));
    return;
  }
  const parents = parts(root, 'parent'), hybrids = parts(root, 'hybrid');
  if (step === 'cross') {
    parents.forEach((el, i) => placePea(el, ease(span(p, 0.04 + i * 0.08, 0.2 + i * 0.08))));
    set(one(root, 'times'), { opacity: f3(span(p, 0.2, 0.3)) });
    set(one(root, 'bracket'), { 'stroke-dashoffset': f3(1 - ease(span(p, 0.3, 0.5))) });
    hybrids.forEach((el, i) => placePea(el, ease(span(p, 0.46 + i * 0.024, 0.56 + i * 0.024))));
    return;
  }
  // self: the cross clears, the hybrids rise into one row, and their seeds fill the grid.
  const clear = ease(span(p, 0.02, 0.18));
  parents.forEach(el => placePea(el, 1 - clear));
  set(one(root, 'times'), { opacity: f3(1 - clear) });
  set(one(root, 'bracket'), { 'stroke-dashoffset': f3(clear) });
  const rise = ease(span(p, 0.08, 0.28));
  hybrids.forEach((el, i) => {
    const from = HYBRIDS[i], to = HYBRIDS_UP[i];
    placePea(el, mix(1, 0.62, rise), 0, 0, mix(from.x, to.x, rise), mix(from.y, to.y, rise));
  });
  const grid = parts(root, 'grid');
  grid.forEach((el, i) => {
    const t = 0.3 + 0.5 * (i / grid.length);
    placePea(el, ease(span(p, t, t + 0.06)));
    set(el.querySelector('[data-ring]'), { opacity: f3(ease(span(p, 0.84, 0.96))) });
  });
}

/* ───────────── E02: blending against factors ───────────── */

type BlendStep = Extract<DiagramA, { name: 'blend' }>['step'];
const BLEND = { rows: 6, cols: 8, x0: 62, dx: 38, y0: 64, dy: 64, r: 12 };
/** The paint-pot lineage: the new trait's carrier and one descendant per generation, halving each time. */
const PAINT_PATH = [3, 4, 2, 5, 3, 4];
/** Factors: s shows the trait at full strength, c carries it hidden, '.' is ordinary. */
const GENE_ROWS = ['...s....', '..c..c..', '.c..c.c.', 'c..s.c..', '.c.c..s.', 'cs..c.sc'];
const FRACTIONS = ['1', '½', '¼', '⅛', '1/16', '1/32'];

function Blend({ step }: { step: BlendStep }) {
  return <Frame label={step === 'paint' ? 'If heredity blended like paint, a new trait would be halved every generation until it vanished' : 'With factors that pass on whole, a new trait hides in carriers and turns up again at full strength'}>
    {Array.from({ length: BLEND.rows }, (_, r) => <g key={r} data-part="row" opacity="0">
      {step === 'paint' && <text x="26" y={BLEND.y0 + r * BLEND.dy + 5} textAnchor="middle" className="dga-small">{FRACTIONS[r]}</text>}
      {Array.from({ length: BLEND.cols }, (_, c) => {
        const cx = BLEND.x0 + c * BLEND.dx, cy = BLEND.y0 + r * BLEND.dy;
        const kind = step === 'paint' ? (PAINT_PATH[r] === c ? 'trait' : 'plain') : ({ s: 'shows', c: 'carrier', '.': 'plain' } as const)[GENE_ROWS[r][c] as 's' | 'c' | '.'];
        return <g key={c}>
          <circle cx={cx} cy={cy} r={BLEND.r} className="dga-person" />
          {kind === 'trait' && <circle cx={cx} cy={cy} r={BLEND.r} className="dga-person is-trait" opacity={1 / 2 ** r} />}
          {kind === 'shows' && <circle cx={cx} cy={cy} r={BLEND.r} className="dga-person is-trait" />}
          {kind === 'carrier' && <circle cx={cx} cy={cy} r={BLEND.r - 4} className="dga-carrier" />}
        </g>;
      })}
    </g>)}
    {step === 'paint' && <path data-part="lineage" className="dga-lineage" d={PAINT_PATH.map((c, r) => `${r ? 'L' : 'M'}${BLEND.x0 + c * BLEND.dx} ${BLEND.y0 + r * BLEND.dy}`).join('')} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />}
  </Frame>;
}

function paintBlend(root: SVGSVGElement, _step: BlendStep, p: number) {
  parts(root, 'row').forEach((row, r) => set(row, { opacity: f3(ease(span(p, 0.06 + r * 0.13, 0.16 + r * 0.13))) }));
  set(one(root, 'lineage'), { 'stroke-dashoffset': f3(1 - ease(span(p, 0.06, 0.82))) });
}

/* ───────────── E03: Manchester's peppered moths ───────────── */

type MothStep = Extract<DiagramA, { name: 'moths' }>['step'];
/** One generation a year, 1848 to 1895: the share of black moths under the one-gene selection model
 * (black dominant), tuned so a rare black form reaches the 98% that was recorded in 1895. */
export const MOTHS = { from: 1848, to: 1895, start: 0.01, end: 0.98, cleanAir: 1956, decline: 1970 } as const;
const selectRun = (share0: number, gens: number, survive: (s: number) => { dominant: number; recessive: number }, s: number) => {
  const out = [share0];
  let p = alleleFor(share0);
  for (let g = 0; g < gens; g += 1) { p = selectionStep(p, survive(s)); out.push(dominantShare(p)); }
  return out;
};
const solve = (target: number, run: (s: number) => number[], rising: boolean) => {
  let lo = 0, hi = 0.99;
  for (let k = 0; k < 60; k += 1) {
    const mid = (lo + hi) / 2, end = run(mid).at(-1)!;
    if ((end < target) === rising) lo = mid; else hi = mid;
  }
  return run((lo + hi) / 2);
};
const RISE = solve(MOTHS.end, s => selectRun(MOTHS.start, MOTHS.to - MOTHS.from, x => ({ dominant: 1, recessive: 1 - x }), s), true);
const DECLINE_YEARS = 45;
const FALL = [
  ...Array.from({ length: MOTHS.decline - MOTHS.cleanAir }, () => MOTHS.end),
  ...solve(0.1, s => selectRun(MOTHS.end, DECLINE_YEARS, x => ({ dominant: 1 - x, recessive: 1 }), s), false),
];
export const MOTH_CURVES = { rise: RISE, fall: FALL };
const CHART = { x0: 58, x1: 318, y0: 292, y1: 84 };
const STRIP = Array.from({ length: 20 }, (_, i) => ({ x: 54 + (i % 10) * 28, y: 360 + Math.floor(i / 10) * 40 }));
const STRIP_ORDER = shuffleWith(20, 'reel-e03-strip');
const curvePath = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${f1(mix(CHART.x0, CHART.x1, i / (values.length - 1)))} ${f1(mix(CHART.y0, CHART.y1, v))}`).join('');
const MOTH_PATH = 'M0 -4.5 Q-6 -5.5 -13 2 Q-12 6.5 -7 7 Q-3 7.5 0 4.5 Q3 7.5 7 7 Q12 6.5 13 2 Q6 -5.5 0 -4.5 Z';

function Moths({ step }: { step: MothStep }) {
  const values = step === 'rise' ? RISE : FALL;
  const declineX = mix(CHART.x0, CHART.x1, (MOTHS.decline - MOTHS.cleanAir) / (FALL.length - 1));
  return <Frame label={step === 'rise' ? `Black peppered moths around Manchester: rare in ${MOTHS.from}, 98 in every 100 by ${MOTHS.to}` : `After the Clean Air Act of ${MOTHS.cleanAir}, black moths decline from about ${MOTHS.decline}`}>
    <g data-part="axes" opacity="0">
      <path d={`M${CHART.x0} ${CHART.y1 - 10}V${CHART.y0}H${CHART.x1 + 6}`} className="dga-axis" />
      <text x={CHART.x0} y={CHART.y1 - 18} className="dga-small">share of moths that are black</text>
      <text x={CHART.x0} y={CHART.y0 + 22} textAnchor="middle" className="dga-small">{step === 'rise' ? MOTHS.from : MOTHS.cleanAir}</text>
      {step === 'rise'
        ? <text x={CHART.x1} y={CHART.y0 + 22} textAnchor="middle" className="dga-small">{MOTHS.to}</text>
        : <><text x={declineX} y={CHART.y0 + 22} textAnchor="middle" className="dga-small">{MOTHS.decline}</text><line x1={declineX} x2={declineX} y1={CHART.y0} y2={CHART.y0 + 6} className="dga-axis" /></>}
    </g>
    <path data-part="curve" d={curvePath(values)} className="dga-curve" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    <circle data-part="marker" r="5" className="dga-marker" cx={CHART.x0} cy={CHART.y0} opacity="0" />
    {step === 'rise' && <text data-part="end-label" x={CHART.x1 - 4} y={mix(CHART.y0, CHART.y1, MOTHS.end) - 12} textAnchor="end" className="dga-label" opacity="0">98%</text>}
    <rect x="30" y="334" width="300" height="92" rx="10" className="dga-bark" />
    {STRIP.map((at, i) => <g key={i} transform={`translate(${at.x} ${at.y}) scale(1.05)`}><path data-part="moth" d={MOTH_PATH} className="dga-moth" /><path d="M0 -4 V5" className="dga-moth-body" /></g>)}
  </Frame>;
}

function paintMoths(root: SVGSVGElement, step: MothStep, p: number) {
  const values = step === 'rise' ? RISE : FALL;
  set(one(root, 'axes'), { opacity: f3(step === 'rise' ? span(p, 0, 0.12) : 1) });
  const drawn = step === 'rise' ? span(p, 0.12, 0.88) : span(p, 0.06, 0.9);
  set(one(root, 'curve'), { 'stroke-dashoffset': f3(1 - drawn) });
  const at = drawn * (values.length - 1), i = Math.floor(at), share = mix(values[i], values[Math.min(values.length - 1, i + 1)], at - i);
  set(one(root, 'marker'), { cx: f1(mix(CHART.x0, CHART.x1, drawn)), cy: f1(mix(CHART.y0, CHART.y1, share)), opacity: f3(step === 'rise' ? span(p, 0.1, 0.16) : 1) });
  set(one(root, 'end-label'), { opacity: f3(span(p, 0.88, 0.96)) });
  const black = Math.min(19, Math.max(1, Math.round(share * 20)));
  parts(root, 'moth').forEach((el, k) => set(el, { class: `dga-moth${STRIP_ORDER[k] < black ? ' is-black' : ''}` }));
}

/* ───────────── E04: twenty to forty seals ───────────── */

type DriftStep = Extract<DiagramA, { name: 'drift' }>['step'];
const FIELD = Array.from({ length: 160 }, (_, i) => {
  const rand = seeded(`reel-e04-field-${i}`);
  return { x: 46 + (i % 10) * 30 + (Math.floor(i / 10) % 2) * 9 + (rand() - 0.5) * 8, y: 46 + Math.floor(i / 10) * 23.5 + (rand() - 0.5) * 6 };
});
const VERSIONS = 6;
/** A Wright–Fisher squeeze in miniature: 24 survivors picked at random, then six generations in which
 * every gene copy is drawn at random from the last. Seeded to a run where luck alone leaves two versions. */
export const SQUEEZE = (() => {
  for (let k = 0; ; k += 1) {
    const rand = seeded(`reel-e04-squeeze-${k}`);
    const colors = FIELD.map(() => Math.floor(rand() * VERSIONS));
    const survivors = shuffleWith(FIELD.length, `reel-e04-survivors-${k}`).slice(0, 24).sort((a, b) => a - b);
    const generations = [survivors.map(i => colors[i])];
    for (let g = 0; g < 6; g += 1) generations.push(generations[g].map(() => generations[g][Math.floor(rand() * 24)]));
    const kinds = (row: number[]) => new Set(row).size;
    if (kinds(generations[0]) >= 5 && kinds(generations[6]) === 2 && kinds(generations[5]) === 3) {
      const last = generations[6];
      const regrown = FIELD.map((_, i) => { const at = survivors.indexOf(i); return at >= 0 ? last[at] : last[Math.floor(rand() * 24)]; });
      return { colors, survivors, generations, regrown };
    }
  }
})();
const CLUSTER = Array.from({ length: 24 }, (_, i) => ({ x: 105 + (i % 6) * 30, y: 196 + Math.floor(i / 6) * 30 }));
const REGROW_ORDER = FIELD.map((at, i) => ({ i, d: Math.hypot(at.x - 180, at.y - 230) })).sort((a, b) => a.d - b.d).map(item => item.i);

function Drift({ step }: { step: DriftStep }) {
  return <Frame label={step === 'squeeze' ? 'A population of many gene versions shrinks to a few dozen animals, and over a few generations chance leaves only two versions' : 'The population grows back to its old size, but with only the two versions that chance kept'}>
    {FIELD.map((at, i) => <circle key={i} data-part="dot" cx={at.x} cy={at.y} r="7" className={`dga-dot is-v${SQUEEZE.colors[i]}`} />)}
  </Frame>;
}

function paintDrift(root: SVGSVGElement, step: DriftStep, p: number) {
  const dots = parts(root, 'dot');
  const { survivors, generations, colors, regrown } = SQUEEZE;
  if (step === 'squeeze') {
    const fade = ease(span(p, 0.1, 0.3)), gather = ease(span(p, 0.24, 0.42));
    const gen = Math.max(0, Math.min(6, Math.floor((p - 0.42) / 0.085) + 1));
    dots.forEach((el, i) => {
      const at = survivors.indexOf(i);
      if (at < 0) { set(el, { r: f1(7 * (1 - fade)), class: `dga-dot is-v${colors[i]}` }); return; }
      const pulse = gen > 0 ? 1 + 0.35 * Math.max(0, 1 - ((p - 0.42) % 0.085) / 0.04) * (generations[gen][at] !== generations[gen - 1][at] ? 1 : 0) : 1;
      set(el, { cx: f1(mix(FIELD[i].x, CLUSTER[at].x, gather)), cy: f1(mix(FIELD[i].y, CLUSTER[at].y, gather)), r: f1(7 * pulse), class: `dga-dot is-v${generations[gen][at]}` });
    });
    return;
  }
  const spread = ease(span(p, 0.04, 0.4));
  dots.forEach((el, i) => {
    const at = survivors.indexOf(i);
    if (at >= 0) { set(el, { cx: f1(mix(CLUSTER[at].x, FIELD[i].x, spread)), cy: f1(mix(CLUSTER[at].y, FIELD[i].y, spread)), r: 7, class: `dga-dot is-v${regrown[i]}` }); return; }
    const t = 0.2 + 0.6 * (REGROW_ORDER.indexOf(i) / FIELD.length);
    set(el, { cx: FIELD[i].x, cy: FIELD[i].y, r: f1(7 * ease(span(p, t, t + 0.08))), class: `dga-dot is-v${regrown[i]}` });
  });
}

/* ───────────── E04: Luria and Delbrück's jackpots ───────────── */

type JackpotStep = Extract<DiagramA, { name: 'jackpot' }>['step'];
/** Luria & Delbrück 1943, tables 1 and 2: resistant colonies per sample. */
export const LURIA_DELBRUCK = {
  oneCulture: [14, 15, 13, 21, 15, 14, 26, 16, 20, 13],
  twentyCultures: [1, 0, 3, 0, 0, 5, 0, 5, 0, 6, 107, 0, 0, 0, 1, 0, 0, 64, 0, 35],
} as const;
const BARS = { base: 360, tall: 250 };
const barH = (n: number) => (n / 107) * BARS.tall;
const LINEAGE = { levels: 5, top: 74, gap: 50 };

function Jackpot({ step }: { step: JackpotStep }) {
  if (step === 'early') {
    const trees = [{ x0: 22, mutant: { level: 1, index: 1 }, label: 'an early change' }, { x0: 192, mutant: { level: 5, index: 21 }, label: 'a late change' }];
    const nodeAt = (x0: number, level: number, index: number) => ({ x: x0 + ((index + 0.5) * 146) / 2 ** level, y: LINEAGE.top + level * LINEAGE.gap });
    return <Frame label="Two cultures growing by doubling: a resistant cell that appears early leaves a big resistant family; one that appears late leaves one cell">
      {trees.map((tree, t) => <g key={t}>
        {Array.from({ length: LINEAGE.levels }, (_, level) => Array.from({ length: 2 ** level }, (_, index) => [0, 1].map(side => {
          const from = nodeAt(tree.x0, level, index), to = nodeAt(tree.x0, level + 1, index * 2 + side);
          const resistant = level + 1 >= tree.mutant.level && Math.floor((index * 2 + side) / 2 ** (level + 1 - tree.mutant.level)) === tree.mutant.index;
          return <line key={`${level}-${index}-${side}`} data-part="edge" data-level={level} data-resistant={resistant ? 1 : 0} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="dga-edge" opacity="0" />;
        })))}
        {Array.from({ length: 32 }, (_, index) => {
          const at = nodeAt(tree.x0, 5, index);
          const resistant = Math.floor(index / 2 ** (5 - tree.mutant.level)) === tree.mutant.index;
          return <circle key={index} data-part="leaf" data-resistant={resistant ? 1 : 0} cx={at.x} cy={at.y} r="2.4" className="dga-leaf" opacity="0" />;
        })}
        <circle data-part="cell" cx={nodeAt(tree.x0, 0, 0).x} cy={LINEAGE.top} r="5" className="dga-leaf" opacity="0" />
        <circle data-part="mutation" cx={nodeAt(tree.x0, tree.mutant.level, tree.mutant.index).x} cy={nodeAt(tree.x0, tree.mutant.level, tree.mutant.index).y} r="0" className="dga-mutation" />
        <text data-part="tree-label" x={tree.x0 + 73} y="374" textAnchor="middle" className="dga-label" opacity="0">{tree.label}</text>
      </g>)}
    </Frame>;
  }
  const counts = step === 'samples' ? LURIA_DELBRUCK.oneCulture : LURIA_DELBRUCK.twentyCultures;
  const width = step === 'samples' ? 20 : 10, gap = step === 'samples' ? 9 : 4.5;
  const x0 = W / 2 - (counts.length * width + (counts.length - 1) * gap) / 2;
  return <Frame label={step === 'samples' ? `Ten samples of one culture: ${counts.join(', ')} resistant colonies` : `Twenty separate cultures: ${counts.join(', ')} resistant colonies`}>
    <text x={W / 2} y="62" textAnchor="middle" className="dga-label" data-part="title" opacity="0">{step === 'samples' ? 'one flask, sampled ten times' : 'twenty separate flasks'}</text>
    <line x1="28" x2="332" y1={BARS.base} y2={BARS.base} className="dga-axis" />
    {counts.map((n, i) => <g key={i}>
      <rect data-part="flask" x={x0 + i * (width + gap)} y={BARS.base + 5} width={width} height="4" rx="2" className="dga-flask" opacity="0" />
      <rect data-part="bar" data-n={n} x={x0 + i * (width + gap)} width={width} y={BARS.base} height="0" rx="2" className={`dga-bar${n > 30 ? ' is-accent' : ''}`} />
      {(step === 'samples' || n > 30) && <text data-part="count" x={x0 + i * (width + gap) + width / 2} y={BARS.base - barH(n) - 8} textAnchor="middle" className="dga-small" opacity="0">{n}</text>}
    </g>)}
  </Frame>;
}

function paintJackpot(root: SVGSVGElement, step: JackpotStep, p: number) {
  if (step === 'early') {
    set(parts(root, 'cell')[0], { opacity: f3(span(p, 0, 0.08)) }); set(parts(root, 'cell')[1], { opacity: f3(span(p, 0, 0.08)) });
    const light = ease(span(p, 0.6, 0.86));
    parts(root, 'edge').forEach(el => {
      const level = Number(el.dataset.level);
      set(el, { opacity: f3(span(p, 0.06 + level * 0.1, 0.14 + level * 0.1)), class: `dga-edge${el.dataset.resistant === '1' && light > 0.5 ? ' is-resistant' : ''}` });
    });
    parts(root, 'leaf').forEach(el => set(el, { opacity: f3(span(p, 0.5, 0.58)), class: `dga-leaf${el.dataset.resistant === '1' && light > 0.5 ? ' is-resistant' : ''}` }));
    parts(root, 'mutation').forEach(el => set(el, { r: f1(7 * ease(span(p, 0.58, 0.68))) }));
    parts(root, 'tree-label').forEach(el => set(el, { opacity: f3(span(p, 0.8, 0.92)) }));
    return;
  }
  set(one(root, 'title'), { opacity: f3(span(p, 0, 0.1)) });
  const bars = parts(root, 'bar');
  bars.forEach((el, i) => {
    const t = 0.08 + (0.5 * i) / bars.length, h = barH(Number(el.dataset.n)) * ease(span(p, t, t + 0.18));
    set(el, { y: f1(BARS.base - h), height: f1(h) });
  });
  parts(root, 'flask').forEach(el => set(el, { opacity: f3(span(p, 0.04, 0.12)) }));
  parts(root, 'count').forEach(el => set(el, { opacity: f3(span(p, 0.7, 0.8)) }));
}

/* ───────────── E06: Earth's history in one day ───────────── */

type ClockStep = Extract<DiagramA, { name: 'clock' }>['step'];
const EARTH_MA = 4540;
/** The pack's own events, in millions of years ago; their clock times come from deepTimeMath. */
export const CLOCK_EVENTS = [
  { ma: 3500, label: 'first signs of life' },
  { ma: 600, label: 'large, complex life' },
  { ma: 233, label: 'first dinosaurs' },
  { ma: 66, label: 'the asteroid' },
] as const;
const EVENT_SECONDS = CLOCK_EVENTS.map(event => clockSeconds(event.ma, EARTH_MA));
export const OUR_SPECIES_SECONDS = secondsBeforeMidnight(300_000, EARTH_MA);
export const HUMAN_LIFE_SECONDS = secondsBeforeMidnight(80, EARTH_MA);
export const MA_PER_HOUR = EARTH_MA / 24;
const DIAL = { cx: 180, cy: 190, r: 128 };
const onDial = (seconds: number, r: number = DIAL.r) => {
  const a = (seconds / DAY_SECONDS) * 2 * Math.PI;
  return { x: DIAL.cx + r * Math.sin(a), y: DIAL.cy - r * Math.cos(a) };
};
const sector = (seconds: number) => {
  if (seconds <= 0) return '';
  const s = Math.min(seconds, DAY_SECONDS - 60), end = onDial(s);
  return `M${DIAL.cx} ${DIAL.cy}L${DIAL.cx} ${DIAL.cy - DIAL.r}A${DIAL.r} ${DIAL.r} 0 ${s > DAY_SECONDS / 2 ? 1 : 0} 1 ${f1(end.x)} ${f1(end.y)}Z`;
};
const RULER = { x0: 40, x1: 320, y: 318 };
/** Where the hand is, step by step: [start, end] of each sweep in clock seconds, with its window. */
const SWEEPS: Record<ClockStep, { from: number; to: number; at: Window }[]> = {
  day: [{ from: 0, to: DAY_SECONDS, at: [0.14, 0.86] }],
  life: [{ from: 0, to: EVENT_SECONDS[0], at: [0.04, 0.34] }, { from: EVENT_SECONDS[0], to: EVENT_SECONDS[1], at: [0.46, 0.8] }],
  late: [{ from: EVENT_SECONDS[1], to: EVENT_SECONDS[2], at: [0.04, 0.34] }, { from: EVENT_SECONDS[2], to: EVENT_SECONDS[3], at: [0.46, 0.8] }],
  zoom: [{ from: EVENT_SECONDS[3], to: DAY_SECONDS - OUR_SPECIES_SECONDS, at: [0.02, 0.2] }],
  blink: [{ from: DAY_SECONDS - OUR_SPECIES_SECONDS, to: DAY_SECONDS - OUR_SPECIES_SECONDS, at: DONE }],
};
const handAt = (step: ClockStep, p: number) => {
  let seconds = SWEEPS[step][0].from;
  for (const sweep of SWEEPS[step]) if (p >= sweep.at[0]) seconds = mix(sweep.from, sweep.to, ease(span(p, sweep.at[0], sweep.at[1])));
  return seconds;
};

function Clock({ step }: { step: ClockStep }) {
  const label = { day: 'A 24-hour clock standing for all 4.54 billion years of Earth’s history', life: 'The clock hand reaches the first signs of life, then large, complex life', late: 'The clock hand reaches the first dinosaurs, then the asteroid', zoom: 'The last minute before midnight: our species appears about six seconds before it', blink: 'The last second before midnight: a whole human life is the final one and a half thousandths of it' }[step];
  const zoomed = step === 'zoom' || step === 'blink';
  return <Frame label={label}>
    <g data-part="dial">
      <circle cx={DIAL.cx} cy={DIAL.cy} r={DIAL.r} className="dga-dial" />
      <path data-part="sector" d="" className="dga-sector" />
      {Array.from({ length: 24 }, (_, h) => {
        const a = onDial(h * 3600, DIAL.r), b = onDial(h * 3600, DIAL.r - (h % 6 ? 6 : 13));
        return <line key={h} x1={f1(a.x)} y1={f1(a.y)} x2={f1(b.x)} y2={f1(b.y)} className="dga-tick" />;
      })}
      {[['midnight', 0], ['6 am', 6], ['noon', 12], ['6 pm', 18]].map(([name, h]) => {
        const at = onDial(Number(h) * 3600, DIAL.r - 30);
        return <text key={name} x={f1(at.x)} y={f1(at.y + 5)} textAnchor="middle" className="dga-small">{name}</text>;
      })}
      {CLOCK_EVENTS.map((event, i) => { const at = onDial(EVENT_SECONDS[i]); return <circle key={event.ma} data-part="event" cx={f1(at.x)} cy={f1(at.y)} r="0" className="dga-event" />; })}
      <line data-part="hand" x1={DIAL.cx} y1={DIAL.cy} x2={DIAL.cx} y2={DIAL.cy - DIAL.r + 14} className="dga-hand" />
      <circle cx={DIAL.cx} cy={DIAL.cy} r="4" className="dga-hand-hub" />
    </g>
    <text data-part="readout" x={W / 2} y="368" textAnchor="middle" className="dga-big is-mid" opacity={zoomed ? 0 : 1}>00:00</text>
    <text data-part="readout-label" x={W / 2} y="396" textAnchor="middle" className="dga-label" opacity="0"> </text>
    {zoomed && <g data-part="ruler" opacity="0">
      <path data-part="fan" d="" className="dga-fan" />
      <line x1={RULER.x0} x2={RULER.x1} y1={RULER.y} y2={RULER.y} className="dga-axis" />
      {Array.from({ length: 11 }, (_, k) => <line key={k} data-part="ruler-tick" x1={mix(RULER.x0, RULER.x1, k / 10)} x2={mix(RULER.x0, RULER.x1, k / 10)} y1={RULER.y - (k % 5 ? 5 : 10)} y2={RULER.y + (k % 5 ? 5 : 10)} className="dga-tick" />)}
      <text data-part="ruler-from" x={RULER.x0} y={RULER.y + 30} textAnchor="middle" className="dga-small">{step === 'zoom' ? '23:59:00' : '23:59:59'}</text>
      <text x={RULER.x1} y={RULER.y + 30} textAnchor="middle" className="dga-small">midnight</text>
      <text data-part="ruler-title" x={W / 2} y={RULER.y - 26} textAnchor="middle" className="dga-label">{step === 'zoom' ? 'the last minute' : 'the last second'}</text>
      {step === 'zoom' && <g data-part="species" opacity="0">
        <circle cx={f1(mix(RULER.x0, RULER.x1, 1 - OUR_SPECIES_SECONDS / 60))} cy={RULER.y} r="6" className="dga-event" />
        <text x={f1(mix(RULER.x0, RULER.x1, 1 - OUR_SPECIES_SECONDS / 60))} y={RULER.y + 58} textAnchor="end" className="dga-label is-accent">{`our species, ${formatClock(DAY_SECONDS - OUR_SPECIES_SECONDS, true)}`}</text>
        <line x1={f1(mix(RULER.x0, RULER.x1, 1 - OUR_SPECIES_SECONDS / 60))} x2={f1(mix(RULER.x0, RULER.x1, 1 - OUR_SPECIES_SECONDS / 60))} y1={RULER.y + 8} y2={RULER.y + 42} className="dga-pointer" />
      </g>}
      {step === 'blink' && <g data-part="life" opacity="0">
        <line x1={RULER.x1} x2={RULER.x1} y1={RULER.y - 14} y2={RULER.y + 14} className="dga-hand" />
        <path d={`M${RULER.x1 - 2} ${RULER.y + 18}L${RULER.x1 - 40} ${RULER.y + 50}`} className="dga-pointer" />
        <text x={RULER.x1 - 44} y={RULER.y + 58} textAnchor="end" className="dga-label is-accent">one human life:</text>
        <text x={RULER.x1 - 44} y={RULER.y + 78} textAnchor="end" className="dga-label is-accent">{describeSpan(HUMAN_LIFE_SECONDS)}</text>
      </g>}
    </g>}
  </Frame>;
}

function paintClock(root: SVGSVGElement, step: ClockStep, p: number) {
  const seconds = handAt(step, p);
  const tip = onDial(seconds, DIAL.r - 14);
  set(one(root, 'hand'), { x2: f1(tip.x), y2: f1(tip.y) });
  const sectorFade = step === 'day' ? 1 - span(p, 0.88, 0.98) : 1;
  set(one(root, 'sector'), { d: sector(seconds), opacity: f3(sectorFade) });
  set(one(root, 'dial'), { opacity: f3(step === 'day' ? span(p, 0, 0.12) : 1) });
  parts(root, 'event').forEach((el, i) => {
    const reached = step === 'day' ? 0 : seconds >= EVENT_SECONDS[i] - 1 ? 1 : 0;
    set(el, { r: f1(reached * 6) });
  });
  const readout = one(root, 'readout'), label = one(root, 'readout-label');
  if (step === 'day') {
    text(readout, formatClock(seconds));
    const done = span(p, 0.88, 0.96);
    text(label, done > 0 ? `each hour ≈ ${Math.round(MA_PER_HOUR / 10) * 10} million years` : ' ');
    set(label, { opacity: f3(done) });
    if (done > 0.5) text(readout, '00:00');
    return;
  }
  if (step === 'life' || step === 'late') {
    text(readout, formatClock(seconds));
    const last = [...EVENT_SECONDS.keys()].filter(i => seconds >= EVENT_SECONDS[i] - 1).at(-1);
    text(label, last === undefined ? ' ' : CLOCK_EVENTS[last].label);
    set(label, { opacity: last === undefined ? 0 : 1 });
    return;
  }
  // zoom and blink: the dial steps back and a ruler opens on the final minute, then the final second.
  const back = step === 'zoom' ? ease(span(p, 0.12, 0.4)) : 1;
  set(one(root, 'dial'), { transform: `translate(${f1(mix(0, 108, back))} ${f1(mix(0, -78, back))}) scale(${mix(1, 0.4, back).toFixed(3)})`, 'transform-origin': `${DIAL.cx}px ${DIAL.cy}px` });
  set(one(root, 'ruler'), { opacity: f3(step === 'zoom' ? span(p, 0.34, 0.5) : 1) });
  const dialTop = { x: DIAL.cx + 108, y: DIAL.cy - 78 - DIAL.r * 0.4 };
  set(one(root, 'fan'), { d: `M${f1(dialTop.x - 1.5)} ${f1(dialTop.y)}L${RULER.x0} ${RULER.y - 1}M${f1(dialTop.x + 1.5)} ${f1(dialTop.y)}L${RULER.x1} ${RULER.y - 1}`, opacity: f3(step === 'zoom' ? span(p, 0.4, 0.55) * 0.5 : 0.5) });
  set(one(root, 'species'), { opacity: f3(ease(span(p, 0.58, 0.74))) });
  set(one(root, 'life'), { opacity: f3(ease(span(p, 0.42, 0.6))) });
  set(readout, { opacity: 0 }); set(label, { opacity: 0 });
}

/* ───────────── E06: Siccar Point ───────────── */

type RockStep = Extract<DiagramA, { name: 'rocks' }>['step'];
/** Ages from the pack's provenance (Wikipedia: Hutton’s Unconformity). */
export const SICCAR = { grey: 435, red: 370 } as const;
const ROCK = { x0: 30, x1: 330, floor: 408, flatTop: 250, wornTop: 282 };
const GREY_BANDS = 34, BAND = 22;
const PIVOT = { x: 180, y: 330 };
const RED_BANDS = 4, RED = 21;
/** The rugged top of the upturned rock before it is worn flat: fixed heights, not random. */
const RUGGED = [0, 18, -6, 26, 6, 30, 2, 22, -4, 16, 8, 28, 0];

function Rocks({ step }: { step: RockStep }) {
  const bands = Array.from({ length: GREY_BANDS }, (_, i) => i - Math.floor(GREY_BANDS / 2));
  return <Frame label={{ settle: `Grey layers settle flat on a deep sea floor, about ${SICCAR.grey} million years ago`, tilt: 'The grey layers are tilted until they stand on end, and their tops are worn down flat', cover: `Red sandstone settles across the worn tops, about ${SICCAR.red} million years ago: some ${SICCAR.grey - SICCAR.red} million years later` }[step]}>
    <defs>
      <clipPath id={`dga-rock-${step}`}><path data-part="rock-clip" d="" /></clipPath>
    </defs>
    <rect data-part="sea" x={ROCK.x0} y="40" width={ROCK.x1 - ROCK.x0} height={ROCK.floor - 40} rx="6" className="dga-sea" />
    <g clipPath={`url(#dga-rock-${step})`}>
      <g data-part="grey">
        {bands.map(k => <rect key={k} data-part="band" data-k={k} x="-160" y={PIVOT.y - BAND / 2 + k * BAND} width="680" height={BAND} className={`dga-grey${k % 2 ? ' is-alt' : ''}`} />)}
      </g>
    </g>
    {Array.from({ length: RED_BANDS }, (_, i) => <path key={i} data-part="red" d="" className={`dga-red${i % 2 ? ' is-alt' : ''}`} opacity="0" />)}
    <line x1={ROCK.x0} x2={ROCK.x1} y1={ROCK.floor} y2={ROCK.floor} className="dga-axis" />
    <text data-part="grey-label" x={W / 2} y={ROCK.floor + 28} textAnchor="middle" className="dga-label" opacity="0">{`grey rock, about ${SICCAR.grey} million years old`}</text>
    <text data-part="red-label" x={W / 2} y="62" textAnchor="middle" className="dga-label is-red" opacity="0">{`red sandstone, about ${SICCAR.red} million`}</text>
    <text data-part="gap-label" x={W / 2} y="88" textAnchor="middle" className="dga-label is-accent" opacity="0">{`${SICCAR.grey - SICCAR.red} million years between them`}</text>
  </Frame>;
}

function paintRocks(root: SVGSVGElement, step: RockStep, p: number) {
  // Settling: the layers that will show land one at a time, from the bottom up.
  const visible = (k: number) => PIVOT.y - BAND / 2 + k * BAND >= ROCK.flatTop - 1 && PIVOT.y + BAND / 2 + k * BAND <= ROCK.floor + BAND;
  const shown = parts(root, 'band').filter(el => visible(Number(el.dataset.k))).sort((a, b) => Number(b.dataset.k) - Number(a.dataset.k));
  parts(root, 'band').forEach(el => {
    if (step !== 'settle') { set(el, { transform: '', opacity: 1 }); return; }
    const order = shown.indexOf(el);
    if (order < 0) { set(el, { opacity: 0 }); return; }
    const t = ease(span(p, 0.06 + order * 0.11, 0.2 + order * 0.11));
    set(el, { transform: `translate(0 ${f1(-170 * (1 - t))})`, opacity: f3(t) });
  });
  const tilt = step === 'settle' ? 0 : step === 'tilt' ? ease(span(p, 0.06, 0.5)) : 1;
  set(one(root, 'grey'), { transform: `rotate(${f1(82 * tilt)} ${PIVOT.x} ${PIVOT.y})` });
  // The rock's top: flat under the sea, pushed up rugged while it tilts, then worn down flat.
  const worn = step === 'settle' ? 0 : step === 'tilt' ? ease(span(p, 0.54, 0.94)) : 1;
  const lift = step === 'tilt' ? Math.min(ease(span(p, 0.06, 0.4)), 1) : step === 'cover' ? 1 : 0;
  const top = RUGGED.map((h, i) => {
    const x = mix(ROCK.x0, ROCK.x1, i / (RUGGED.length - 1));
    const rugged = ROCK.flatTop - 46 - h;
    const y = step === 'settle' ? ROCK.flatTop : mix(mix(ROCK.flatTop, rugged, lift), ROCK.wornTop, worn);
    return `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
  }).join('');
  set(one(root, 'rock-clip'), { d: `${top}L${ROCK.x1} ${ROCK.floor}L${ROCK.x0} ${ROCK.floor}Z` });
  set(one(root, 'sea'), { opacity: f3(step === 'settle' ? 1 : step === 'tilt' ? 1 - span(p, 0.1, 0.4) : 0) });
  set(one(root, 'grey-label'), { opacity: f3(step === 'settle' ? span(p, 0.78, 0.9) : 1) });
  // Red sand: flat layers settling one at a time on the worn surface.
  parts(root, 'red').forEach((el, i) => {
    const t = step === 'cover' ? ease(span(p, 0.06 + i * 0.12, 0.2 + i * 0.12)) : 0;
    const bottom = ROCK.wornTop - i * RED, drop = -120 * (1 - t);
    set(el, { d: `M${ROCK.x0} ${f1(bottom + drop)}L${ROCK.x1} ${f1(bottom - 6 + drop)}L${ROCK.x1} ${f1(bottom - 6 - RED + drop)}L${ROCK.x0} ${f1(bottom - RED + drop)}Z`, opacity: f3(t) });
  });
  set(one(root, 'red-label'), { opacity: f3(step === 'cover' ? span(p, 0.6, 0.72) : 0) });
  set(one(root, 'gap-label'), { opacity: f3(step === 'cover' ? span(p, 0.74, 0.86) : 0) });
}

/* ───────────── dispatch ───────────── */

export function ReelDiagramViewA({ diagram }: { diagram: DiagramA }) {
  switch (diagram.name) {
    case 'tree': return <Tree step={diagram.step} />;
    case 'peas': return <Peas step={diagram.step} />;
    case 'blend': return <Blend step={diagram.step} />;
    case 'moths': return <Moths step={diagram.step} />;
    case 'drift': return <Drift step={diagram.step} />;
    case 'jackpot': return <Jackpot step={diagram.step} />;
    case 'clock': return <Clock step={diagram.step} />;
    case 'rocks': return <Rocks step={diagram.step} />;
  }
}

export function paintDiagramA(root: SVGSVGElement, diagram: DiagramA, p: number): void {
  switch (diagram.name) {
    case 'tree': return paintTree(root, diagram.step, p);
    case 'peas': return paintPeas(root, diagram.step, p);
    case 'blend': return paintBlend(root, diagram.step, p);
    case 'moths': return paintMoths(root, diagram.step, p);
    case 'drift': return paintDrift(root, diagram.step, p);
    case 'jackpot': return paintJackpot(root, diagram.step, p);
    case 'clock': return paintClock(root, diagram.step, p);
    case 'rocks': return paintRocks(root, diagram.step, p);
  }
}

