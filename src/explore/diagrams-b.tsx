import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { geoConicConformal, geoEquirectangular, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import land50Url from 'world-atlas/land-50m.json?url';
import land110Url from 'world-atlas/land-110m.json?url';
import type { Pack } from '../expeditions/content/types';
import { evolutionE08 } from '../expeditions/content/evolution-e08';
import { evolutionE09 } from '../expeditions/content/evolution-e09';
import { evolutionE11 } from '../expeditions/content/evolution-e11';
import { evolutionE12 } from '../expeditions/content/evolution-e12';
import { history } from '../expeditions/content/history';
import { layout as treeLayout, type Tree } from '../expeditions/sims/rewind';
import { best, mating, offspring, survival, type Mating, type Setting } from '../expeditions/sims/tradeoffModel';
import './diagrams-b.css';

// Code-drawn figures for the E08, E09, E11, E12 and Black Death reels, built like explore/diagrams:
// React draws each figure once per frame, and `paintDiagramB` moves it on the reel's clock by
// writing SVG attributes directly. Wherever a figure shows data, the data is read from the
// expedition pack itself (the extinction table, the ape tree, the trade-off settings, the nested
// traits, the spread maps), so a reel's picture can never disagree with its expedition.
// Each step starts where the step before it ends, so consecutive frames cross-fade cleanly.

export type DiagramB =
  | { name: 'iridium'; step: 'italy' | 'world' }
  | { name: 'crater'; step: 'buried' | 'core' }
  | { name: 'extinctions'; step: 'rise' | 'permian' }
  | { name: 'rewind'; step: 'today' | 'join' | 'both' | 'deep' }
  | { name: 'spread'; map: 'plague'; step: 'messina' | 'race' | 'coast' | 'moscow' }
  | { name: 'spread'; map: 'africa'; step: 'origins' | 'asia' | 'wave' | 'world' }
  | { name: 'tails'; step: 'four' | 'swap' | 'nests' }
  | { name: 'tradeoff'; step: 'costs' | 'peak' | 'falls' }
  | { name: 'eyes'; step: 'spot' | 'cup' | 'pinhole' | 'camera' }
  | { name: 'nest'; step: 'backbone' | 'limbs' | 'split' | 'misfit' };

const W = 360;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const f1 = (v: number) => v.toFixed(1);
const f3 = (v: number) => v.toFixed(3);
const set = (el: Element | null | undefined, attrs: Record<string, string | number>) => {
  if (!el) return;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
};
const parts = (root: SVGSVGElement, name: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-part="${name}"]`));
const part = (root: SVGSVGElement, name: string) => root.querySelector<SVGElement>(`[data-part="${name}"]`);
/** Draw a stroke on: elements carry pathLength="1" and strokeDasharray="1". */
const draw = (el: Element | null | undefined, t: number) => set(el, { 'stroke-dashoffset': f3(1 - clamp(t)) });

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return <svg className="reel-diagram-svg dgb" viewBox={`0 10 ${W} 450`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>{children}</svg>;
}

/** A sim's params from a pack, so a figure is drawn from the same data the expedition uses. */
function simParams<T>(pack: Pack, sim: string, pick: (params: Record<string, unknown>) => boolean = () => true): T {
  for (const beat of pack.beats) if (beat.kind === 'sim' && beat.sim === sim && pick(beat.params)) return beat.params as T;
  throw new Error(`${pack.id} has no ${sim} sim`);
}

/* ─── E08: iridium in the boundary clay ───────────────────────────────────────────────────────
   Multiples of the normal level, from Alvarez et al. 1980 (abstract, PubMed 17783054): about 30
   in Italy, 160 in Denmark, 20 in New Zealand. */
const IRIDIUM = [
  { label: 'Normal', value: 1 },
  { label: 'Italy', value: 30 },
  { label: 'Denmark', value: 160 },
  { label: 'New Zealand', value: 20 },
];
const IR = { base: 356, top: 104, x0: 66, dx: 76, w: 48 };
const irHeight = (value: number) => Math.max(3, (value / 160) * (IR.base - IR.top));

function Iridium() {
  return <Frame label="Iridium in the boundary clay as bars: the normal level, then about 30 times it in Italy, 160 times in Denmark and 20 times in New Zealand">
    <text x={W / 2} y="44" textAnchor="middle" className="dgb-title">Iridium in the boundary clay</text>
    <text x={W / 2} y="66" textAnchor="middle" className="dgb-note">times the normal level</text>
    <line x1="22" x2="338" y1={IR.base} y2={IR.base} className="dgb-axis" />
    {IRIDIUM.map((bar, i) => <g key={bar.label} data-part="ir-bar" opacity="0">
      <rect data-part="ir-rect" x={IR.x0 + i * IR.dx - IR.w / 2} y={IR.base} width={IR.w} height="0" rx="3" className={i ? 'dgb-bar is-hot' : 'dgb-bar'} />
      <text data-part="ir-value" x={IR.x0 + i * IR.dx} y={IR.base - 10} textAnchor="middle" className="dgb-value">1×</text>
      <text x={IR.x0 + i * IR.dx} y={IR.base + 26} textAnchor="middle" className="dgb-label">{bar.label}</text>
    </g>)}
  </Frame>;
}

function paintIridium(root: SVGSVGElement, step: string, p: number) {
  const groups = parts(root, 'ir-bar'), rects = parts(root, 'ir-rect'), values = parts(root, 'ir-value');
  const italy = step === 'italy';
  const grow = italy ? [ease(span(p, 0.05, 0.25)), ease(span(p, 0.3, 0.72)), 0, 0] : [1, 1, ease(span(p, 0.08, 0.55)), ease(span(p, 0.45, 0.85))];
  const show = italy ? [span(p, 0, 0.12), span(p, 0.26, 0.34), 0, 0] : [1, 1, span(p, 0.04, 0.12), span(p, 0.41, 0.49)];
  IRIDIUM.forEach((bar, i) => {
    const h = irHeight(bar.value) * grow[i];
    set(groups[i], { opacity: f3(show[i]) });
    set(rects[i], { y: f1(IR.base - h), height: f1(h) });
    set(values[i], { y: f1(IR.base - h - 10) });
    if (values[i]) values[i].textContent = `${Math.max(1, Math.round(bar.value * grow[i]))}×`;
  });
}

/* ─── E08: the buried crater, in cross-section (depth exaggerated) ─────────────────────────── */
const CR = { surface: 156, layer: 218, ctrl: 372, left: 54, right: 306, drill: 196, hit: 300 };
const CR_BOWL = `M${CR.left} ${CR.layer} C${CR.left + 40} ${CR.ctrl} ${CR.right - 40} ${CR.ctrl} ${CR.right} ${CR.layer}`;
const CR_FLOOR = 0.25 * CR.layer + 0.75 * CR.ctrl;

function Crater() {
  const strata = (CR.layer - CR.surface) / 3;
  return <Frame label="A cross-section under Yucatán: a crater about 200 kilometres across, buried under about a kilometre of younger rock">
    <text x={W / 2} y="44" textAnchor="middle" className="dgb-title">Under Yucatán</text>
    <text x={W / 2} y="66" textAnchor="middle" className="dgb-note">cross-section, depth not to scale</text>
    <g data-part="cr-layers" opacity="0">
      <rect x="12" y={CR.layer} width="336" height={CR_FLOOR + 74 - CR.layer} className="dgb-bedrock" />
      {[0, 1, 2].map(i => <rect key={i} x="12" y={CR.surface + i * strata} width="336" height={strata + 0.5} className={`dgb-strata is-${i}`} />)}
      <line x1="12" x2="348" y1={CR.surface} y2={CR.surface} className="dgb-surface" />
      <text x="338" y={CR.surface + 26} textAnchor="end" className="dgb-label">younger rock</text>
      <text x="338" y={CR.surface + 45} textAnchor="end" className="dgb-note">about 1 km thick</text>
    </g>
    <path data-part="cr-fill" d={`${CR_BOWL}Z`} className="dgb-breccia" opacity="0" />
    <path data-part="cr-bowl" d={CR_BOWL} className="dgb-bowl" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    <g data-part="cr-size" opacity="0">
      <path d={`M${CR.left} ${CR_FLOOR + 30}v-10M${CR.left} ${CR_FLOOR + 25}H${CR.right}M${CR.right} ${CR_FLOOR + 30}v-10`} className="dgb-bracket" />
      <text x={W / 2} y={CR_FLOOR + 50} textAnchor="middle" className="dgb-label">crater, about 200 km across</text>
    </g>
    <g data-part="cr-sinks" opacity="0">
      {[CR.left, CR.right].map(x => <path key={x} d={`M${x - 11} ${CR.surface}q11 10 22 0`} className="dgb-sink" />)}
      <text x={CR.left - 12} y={CR.surface - 14} className="dgb-note">ring of sinkholes</text>
    </g>
    <line data-part="cr-drill" x1={CR.drill} x2={CR.drill} y1={CR.surface - 18} y2={CR.surface - 18} className="dgb-drill" opacity="0" />
    <g data-part="cr-shock" opacity="0" transform={`translate(${CR.drill} ${CR.hit})`}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return <line key={i} x1={f1(Math.cos(a) * 6)} y1={f1(Math.sin(a) * 6)} x2={f1(Math.cos(a) * 17)} y2={f1(Math.sin(a) * 17)} className="dgb-burst" />;
      })}
    </g>
    <text data-part="cr-shock-label" x={CR.drill - 16} y={CR.hit - 26} textAnchor="end" className="dgb-label" opacity="0">shock-damaged rock</text>
  </Frame>;
}

function paintCrater(root: SVGSVGElement, step: string, p: number) {
  const buried = step === 'buried';
  set(part(root, 'cr-layers'), { opacity: f3(buried ? ease(span(p, 0, 0.22)) : 1) });
  draw(part(root, 'cr-bowl'), buried ? ease(span(p, 0.24, 0.66)) : 1);
  set(part(root, 'cr-fill'), { opacity: f3(buried ? 0.95 * ease(span(p, 0.52, 0.76)) : 0.95) });
  set(part(root, 'cr-size'), { opacity: f3(buried ? ease(span(p, 0.64, 0.8)) : 1) });
  set(part(root, 'cr-sinks'), { opacity: f3(buried ? ease(span(p, 0.8, 0.94)) : 1) });
  const down = buried ? 0 : ease(span(p, 0.06, 0.58));
  set(part(root, 'cr-drill'), { y2: f1(mix(CR.surface - 18, CR.hit, down)), opacity: buried ? 0 : 1 });
  const shock = buried ? 0 : span(p, 0.58, 0.72);
  set(part(root, 'cr-shock'), { opacity: f3(shock), transform: `translate(${CR.drill} ${CR.hit}) scale(${f3(0.5 + 0.7 * shock)})` });
  set(part(root, 'cr-shock-label'), { opacity: f3(buried ? 0 : ease(span(p, 0.68, 0.84))) });
}

/* ─── E08: the extinction chart, from the pack's own table (Sepkoski 1996 genus losses) ──────── */
type LifeEvent = { id: string; name: string; short: string; ma: number; value: number; big?: boolean };
type LifeParams = { span: [number, number]; max: number; eras: { name: string; from: number; to: number }[]; events: LifeEvent[] };
const LIFE = simParams<LifeParams>(evolutionE08, 'lifeChart');
const EX = { x0: 46, x1: 338, base: 370, top: 100 };
const exX = (ma: number) => EX.x0 + ((LIFE.span[0] - ma) / (LIFE.span[0] - LIFE.span[1])) * (EX.x1 - EX.x0);
const exHeight = (value: number) => (value / LIFE.max) * (EX.base - EX.top);
const EX_EVENTS = [...LIFE.events].sort((a, b) => b.ma - a.ma);
const EX_WORST = EX_EVENTS.reduce((a, b) => (b.big && b.value > a.value ? b : a));

function Extinctions() {
  const worst = EX_WORST;
  return <Frame label={`Bars of sea-animal genera lost in fifteen extinctions over ${LIFE.span[0]} million years; the big five stand out, and the end-Permian is tallest at ${worst.value}%`}>
    <g data-part="ex-frame" opacity="0">
      <text x={W / 2} y="44" textAnchor="middle" className="dgb-title">Sea-animal genera lost</text>
      <text data-part="ex-sub" x={W / 2} y="65" textAnchor="middle" className="dgb-note">the big five, and smaller crashes</text>
      {[0, LIFE.max / 2, LIFE.max].map(v => <g key={v}>
        <line x1={EX.x0} x2={EX.x1} y1={EX.base - exHeight(v)} y2={EX.base - exHeight(v)} className={v ? 'dgb-grid' : 'dgb-axis'} />
        <text x={EX.x0 - 6} y={EX.base - exHeight(v) + 4} textAnchor="end" className="dgb-tick">{v}%</text>
      </g>)}
      {LIFE.eras.map((era, i) => <g key={era.name}>
        <rect x={exX(era.from)} y={EX.base + 8} width={exX(era.to) - exX(era.from)} height="18" className={`dgb-era${i % 2 ? ' is-alt' : ''}`} />
        <text x={(exX(era.from) + exX(era.to)) / 2} y={EX.base + 21} textAnchor="middle" className="dgb-era-label">{era.name}</text>
      </g>)}
      {[500, 400, 300, 200, 100, 0].map(ma => <text key={ma} x={exX(ma)} y={EX.base + 46} textAnchor="middle" className="dgb-tick">{ma}</text>)}
      <text x={(EX.x0 + EX.x1) / 2} y={EX.base + 68} textAnchor="middle" className="dgb-note">million years ago</text>
    </g>
    {EX_EVENTS.map(ev => <rect key={ev.id} data-part="ex-bar" x={exX(ev.ma) - (ev.big ? 5 : 1.5)} y={EX.base} width={ev.big ? 10 : 3} height="0" rx={ev.big ? 2 : 1} className={`dgb-bar${ev.big ? ' is-hot' : ' is-dim'}`} />)}
    {EX_EVENTS.filter(ev => ev.big).map(ev => <text key={ev.id} data-part="ex-label" x={exX(ev.ma)} y={EX.base - exHeight(ev.value) - 7} textAnchor={ev.ma < 100 ? 'end' : 'middle'} dx={ev.ma < 100 ? 8 : 0} className="dgb-small" opacity="0">{ev.short}</text>)}
    <g data-part="ex-callout" opacity="0">
      <text x={exX(worst.ma) + 13} y={EX.base - exHeight(worst.value) + 14} className="dgb-label">End-Permian</text>
      <text x={exX(worst.ma) + 13} y={EX.base - exHeight(worst.value) + 32} className="dgb-note">{worst.ma} million years ago</text>
      <text x={exX(worst.ma) + 13} y={EX.base - exHeight(worst.value) + 50} className="dgb-note">{worst.value}% of genera lost</text>
    </g>
  </Frame>;
}

function paintExtinctions(root: SVGSVGElement, step: string, p: number, ms: number) {
  const rise = step === 'rise';
  set(part(root, 'ex-frame'), { opacity: f3(rise ? ease(span(p, 0, 0.12)) : 1) });
  const bars = parts(root, 'ex-bar'), labels = parts(root, 'ex-label');
  const fade = rise ? 1 : 1 - 0.68 * ease(span(p, 0.04, 0.3));
  let big = 0;
  EX_EVENTS.forEach((ev, i) => {
    const t = rise ? ease(span(p, 0.12 + i * 0.044, 0.3 + i * 0.044)) : 1;
    const h = exHeight(ev.value) * t;
    const worst = ev.id === EX_WORST.id;
    const glow = worst && !rise ? 0.82 + 0.18 * Math.sin(ms / 380) : 1;
    set(bars[i], { y: f1(EX.base - h), height: f1(h), opacity: f3(worst ? glow : fade) });
    if (ev.big) {
      const shown = rise ? span(p, 0.26 + i * 0.044, 0.36 + i * 0.044) : 1;
      set(labels[big], { opacity: f3(worst && !rise ? 1 - span(p, 0.05, 0.2) : shown * (worst ? 1 : fade)) });
      big += 1;
    }
  });
  set(part(root, 'ex-callout'), { opacity: f3(rise ? 0 : ease(span(p, 0.22, 0.42))) });
}

/* ─── E09: wind the ape tree back (Yoo et al. 2025 split dates, from the pack) ──────────────── */
type RewindParams = { tree: Tree; max: number; ticks: number[]; unit: string };
const REWIND = simParams<RewindParams>(evolutionE09, 'lineageRewind');
const RW_LAYOUT = treeLayout(REWIND.tree);
const RW = { x0: 262, x1: 30, row0: 104, dy: 60, axis: 386 };
const rwX = (t: number) => RW.x0 - (t / REWIND.max) * (RW.x0 - RW.x1);
const rwY = (id: string) => RW.row0 + RW_LAYOUT.y[id] * RW.dy;
const RW_NODES = Object.keys(RW_LAYOUT.y);
const RW_SPLIT = (a: string, b: string) => REWIND.tree.splits.find(s => [a, b].every(id => s.children.includes(id)))!;
const RW_PAN = RW_SPLIT('chimp', 'bonobo');
const RW_JOIN = RW_SPLIT('human', RW_PAN.id);
const RW_GORILLA = REWIND.tree.splits.find(s => s.children.includes('gorilla'))!;
const RW_ORANG = REWIND.tree.splits.find(s => s.children.includes('orangutan'))!;
/** The two lines that run from the human–chimpanzee ancestor to today. */
const RW_BOTH = new Set(['human', 'chimp', RW_PAN.id]);
const RW_CURSOR: Record<string, [number, number]> = { today: [0, 1.1], join: [1.1, RW_JOIN.about + 0.4], both: [RW_JOIN.about + 0.4, RW_JOIN.about + 0.4], deep: [RW_JOIN.about + 0.4, REWIND.max] };
const RW_TITLE: Record<string, string> = {
  today: 'Five living great apes',
  join: 'Our line meets the chimpanzees’',
  both: `Each line: about ${RW_JOIN.about} million years`,
  deep: 'Further back: gorillas, then orangutans',
};

function Rewind({ step }: { step: string }) {
  const tipLabel = (id: string) => REWIND.tree.tips.find(tip => tip.id === id)!.label;
  return <Frame label="A family tree of the great apes, wound back in time: humans and chimpanzees meet at a shared ancestor about six million years ago">
    <text x={W / 2} y="46" textAnchor="middle" className="dgb-title">{RW_TITLE[step]}</text>
    <g data-part="rw-axis" opacity="0">
      <line x1={rwX(REWIND.max)} x2={rwX(0)} y1={RW.axis} y2={RW.axis} className="dgb-axis" />
      {REWIND.ticks.map(t => <g key={t}>
        <line x1={rwX(t)} x2={rwX(t)} y1={RW.axis} y2={RW.axis + 6} className="dgb-axis" />
        <text x={rwX(t)} y={RW.axis + 22} textAnchor="middle" className="dgb-tick">{t === 0 ? 'today' : t}</text>
      </g>)}
      <text x={(rwX(REWIND.max) + rwX(0)) / 2} y={RW.axis + 42} textAnchor="middle" className="dgb-note">{REWIND.unit}</text>
    </g>
    {RW_NODES.map(id => <line key={id} data-part="rw-seg" data-node={id} x1={rwX(RW_LAYOUT.t[id])} x2={rwX(RW_LAYOUT.t[id])} y1={rwY(id)} y2={rwY(id)} className="dgb-lineage" />)}
    {REWIND.tree.splits.map(s => <line key={s.id} data-part="rw-join" data-node={s.id} x1={rwX(s.about)} x2={rwX(s.about)} y1={rwY(s.children[0])} y2={rwY(s.children[1])} className="dgb-lineage" opacity="0" />)}
    {REWIND.tree.tips.map(tip => <g key={tip.id} data-part="rw-tip" opacity="0">
      <circle cx={rwX(0)} cy={rwY(tip.id)} r="4.5" className="dgb-tip" />
      <text x={rwX(0) + 11} y={rwY(tip.id) + 5} className={tip.id === 'human' || tip.id === 'chimp' ? 'dgb-label' : 'dgb-label is-soft'}>{tipLabel(tip.id)}</text>
    </g>)}
    <circle data-part="rw-ancestor" cx={rwX(RW_JOIN.about)} cy={rwY(RW_JOIN.id)} r="0" className="dgb-ancestor" />
    <text data-part="rw-anc-1" x={rwX(RW_JOIN.about) - 12} y={rwY(RW_JOIN.id) - 14} textAnchor="end" className="dgb-label" opacity="0">last shared ancestor</text>
    <text data-part="rw-anc-2" x={rwX(RW_JOIN.about) - 12} y={rwY(RW_JOIN.id) + 24} textAnchor="end" className="dgb-note" opacity="0">about {RW_JOIN.about} million years ago</text>
    <text data-part="rw-gorilla" x={rwX(RW_GORILLA.about) - 7} y={rwY(RW_GORILLA.id) - 9} textAnchor="end" className="dgb-note" opacity="0">about {Math.round(RW_GORILLA.about)}</text>
    <text data-part="rw-orang" x={rwX(RW_ORANG.about) + 8} y={rwY(RW_ORANG.id) + 22} className="dgb-note" opacity="0">about {Math.round(RW_ORANG.about)}</text>
  </Frame>;
}

function paintRewind(root: SVGSVGElement, step: string, p: number, ms: number) {
  const [c0, c1] = RW_CURSOR[step];
  const cursor = mix(c0, c1, ease(span(p, 0.1, 0.85)));
  const today = step === 'today';
  set(part(root, 'rw-axis'), { opacity: f3(today ? ease(span(p, 0, 0.2)) : 1) });
  parts(root, 'rw-tip').forEach((tip, i) => set(tip, { opacity: f3(today ? ease(span(p, 0.05 + i * 0.07, 0.25 + i * 0.07)) : 1) }));
  const hot = step === 'both' ? ease(span(p, 0.08, 0.35)) : step === 'deep' ? 1 - ease(span(p, 0, 0.25)) : 0;
  parts(root, 'rw-seg').forEach(seg => {
    const id = seg.dataset.node!;
    const start = RW_LAYOUT.t[id];
    const parent = RW_LAYOUT.parent[id];
    const end = parent ? RW_LAYOUT.t[parent] : cursor;
    const on = cursor > start;
    set(seg, { x2: f1(rwX(on ? Math.min(cursor, end) : start)), opacity: on ? 1 : 0, class: RW_BOTH.has(id) && hot > 0.5 ? 'dgb-lineage is-hot' : 'dgb-lineage' });
  });
  parts(root, 'rw-join').forEach(join => {
    const split = REWIND.tree.splits.find(s => s.id === join.dataset.node)!;
    set(join, { opacity: f3(clamp((cursor - split.about) / 0.35)) });
  });
  const met = clamp((cursor - RW_JOIN.about) / 0.35);
  const pulse = step === 'join' || step === 'both' ? 1 + 0.18 * Math.sin(ms / 300) : 1;
  set(part(root, 'rw-ancestor'), { r: f1(6.5 * met * pulse) });
  const deep = step === 'deep' ? ease(span(p, 0, 0.3)) : 0;
  set(part(root, 'rw-anc-1'), { opacity: f3(met * (1 - 0.55 * deep)) });
  set(part(root, 'rw-anc-2'), { opacity: f3(met * (1 - deep)) });
  set(part(root, 'rw-gorilla'), { opacity: f3(clamp((cursor - RW_GORILLA.about) / 0.8)) });
  set(part(root, 'rw-orang'), { opacity: f3(clamp((cursor - RW_ORANG.about) / 0.8)) });
}

/* ─── E09 and the Black Death: a spread map, played on the reel's clock ───────────────────────
   Places, dates, routes and sea waypoints come from each pack's spreadMap beat. Land is drawn
   once; the camera moves by transforming it, and places, routes and labels are placed in screen
   space so text stays the same size at any zoom. */
type When = string | number;
type MapPlace = { id: string; name: string; lat: number; lon: number; when: When; label: string; from?: string | string[]; via?: string; path?: number[][]; labelSide?: 'left' };
type Pt = [number, number];
type View = [number, number, number, number];
interface SpreadStep { t: [When, When]; view: string; names: string[] }
interface SpreadModel {
  places: MapPlace[];
  landUrl: string;
  projection: GeoProjection;
  tick: (when: When) => number;
  clock: (t: number) => string;
  date: (place: MapPlace) => string;
  views: Record<string, View>;
  steps: Record<string, SpreadStep>;
  order: string[];
  /** How long a route takes to draw in, and how long a new place pulses, in clock units. */
  lead: number;
  legend: boolean;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthTick = (when: When) => { const [y, m] = String(when).split('-').map(Number); return y * 12 + (m - 1); };
const monthName = (t: number) => `${MONTHS[((Math.floor(t) % 12) + 12) % 12]} ${Math.floor(Math.floor(t) / 12)}`;
const yearsAgo = (kyr: number) => `${Math.round(kyr * 1000).toLocaleString('en-US')} years ago`;
const MAP_BOX = { x0: 12, y0: 62, x1: 348, y1: 440 };

function project(projection: GeoProjection, lonLat: Pt): Pt { return projection(lonLat) as Pt; }
function viewOf(projection: GeoProjection, points: Pt[]): View {
  const xy = points.map(pt => project(projection, pt));
  return [Math.min(...xy.map(q => q[0])), Math.min(...xy.map(q => q[1])), Math.max(...xy.map(q => q[0])), Math.max(...xy.map(q => q[1]))];
}

const SPREAD_CACHE: Partial<Record<'plague' | 'africa', SpreadModel>> = {};
function spreadModel(map: 'plague' | 'africa'): SpreadModel {
  const cached = SPREAD_CACHE[map];
  if (cached) return cached;
  let model: SpreadModel;
  if (map === 'plague') {
    const params = simParams<{ places: MapPlace[] }>(history, 'spreadMap', p => p.mode === 'play');
    const continent: Pt[] = [[-10, 29.5], [42, 29.5], [42, 63.5], [-10, 63.5], [16, 65.5]];
    const projection = geoConicConformal().parallels([38, 60]).rotate([-14, 0]).fitExtent([[0, 0], [1000, 1000]], { type: 'MultiPoint', coordinates: continent });
    const full = viewOf(projection, continent);
    projection.clipExtent([[full[0] - 120, full[1] - 120], [full[2] + 120, full[3] + 120]]);
    const at = (id: string) => params.places.find(pl => pl.id === id)!;
    const italy = viewOf(projection, ['messina', 'marseille', 'rome', 'genoa'].flatMap(id => [[at(id).lon - 3, at(id).lat - 2.2], [at(id).lon + 3, at(id).lat + 2.2]] as Pt[]));
    model = {
      places: params.places, landUrl: land50Url, projection, tick: monthTick, clock: monthName,
      date: place => monthName(monthTick(place.when)),
      views: { full, italy },
      steps: {
        messina: { t: ['1346-12', '1347-10'], view: 'full', names: ['kaffa', 'constantinople', 'messina'] },
        race: { t: ['1347-10', '1348-08'], view: 'italy', names: ['messina', 'marseille', 'rome'] },
        coast: { t: ['1348-08', '1349-10'], view: 'full', names: ['weymouth', 'bergen'] },
        moscow: { t: ['1349-10', '1353-03'], view: 'full', names: ['kaffa', 'moscow'] },
      },
      order: ['messina', 'race', 'coast', 'moscow'],
      lead: 1.6, legend: true,
    };
  } else {
    const params = simParams<{ places: MapPlace[] }>(evolutionE09, 'spreadMap');
    const bbox: Pt[] = [[-19, -50], [-34, 70]];
    const projection = geoEquirectangular().rotate([-150, 0]).fitExtent([[0, 0], [1000, 1000]], { type: 'MultiPoint', coordinates: bbox });
    const box = (west: number, south: number, east: number, north: number): Pt[] => [[west, south], [east, south], [east, north], [west, north]];
    model = {
      places: params.places, landUrl: land110Url, projection, tick: when => -Number(when), clock: t => yearsAgo(t < -20 ? Math.round(-t / 5) * 5 : Math.round(-t * 2) / 2),
      date: place => place.label,
      views: { africa: viewOf(projection, box(-20, -36, 54, 38)), levant: viewOf(projection, box(-20, -36, 64, 44)), oldworld: viewOf(projection, box(-20, -46, 158, 62)), world: viewOf(projection, box(-19, -50, 326, 70)) },
      steps: {
        origins: { t: [320, 225], view: 'africa', names: ['irhoud', 'omo'] },
        asia: { t: [225, 120], view: 'levant', names: ['misliya'] },
        wave: { t: [120, 39], view: 'oldworld', names: ['madjedbebe', 'bachokiro', 'tianyuan'] },
        world: { t: [39, 10], view: 'world', names: ['monteverde'] },
      },
      order: ['origins', 'asia', 'wave', 'world'],
      lead: 20, legend: false,
    };
  }
  SPREAD_CACHE[map] = model;
  return model;
}

const LAND_CACHE = new Map<string, GeoPermissibleObjects>();
async function loadLand(url: string): Promise<GeoPermissibleObjects> {
  const cached = LAND_CACHE.get(url);
  if (cached) return cached;
  const topo = await (await fetch(url)).json();
  const collection = feature(topo, topo.objects.land) as unknown as { features: { geometry: { type: string; coordinates: number[][][][] } }[] };
  // Antarctica lies off every map here, and its pole-wrapping ring can flood a rotated world map.
  for (const item of collection.features) if (item.geometry.type === 'MultiPolygon') item.geometry.coordinates = item.geometry.coordinates.filter(poly => Math.max(...poly[0].map(pt => pt[1])) > -60);
  const land = collection as unknown as GeoPermissibleObjects;
  LAND_CACHE.set(url, land);
  return land;
}

const originsOf = (place: MapPlace) => (place.from === undefined ? [] : Array.isArray(place.from) ? place.from : [place.from]);
/** Each place's arrival route: origin, sea waypoints ([lat, lon] in the packs), destination, as lon/lat. */
function routesOf(model: SpreadModel) {
  const byId = new Map(model.places.map(pl => [pl.id, pl]));
  return model.places.flatMap(pl => originsOf(pl).map(from => {
    const o = byId.get(from)!;
    const waypoints = originsOf(pl).length === 1 ? (pl.path ?? []) : [];
    const points: Pt[] = [[o.lon, o.lat], ...waypoints.map(([lat, lon]) => [lon, lat] as Pt), [pl.lon, pl.lat]];
    return { id: `${from}-${pl.id}`, to: pl, from: o, via: pl.via ?? 'land', points: points.map(pt => project(model.projection, pt)) };
  }));
}

function smooth(points: Pt[]): string {
  if (points.length === 2) return `M${f1(points[0][0])} ${f1(points[0][1])}L${f1(points[1][0])} ${f1(points[1][1])}`;
  let d = `M${f1(points[0][0])} ${f1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

function Spread({ map, step }: { map: 'plague' | 'africa'; step: string }) {
  const model = spreadModel(map);
  const [land, setLand] = useState<GeoPermissibleObjects | null>(() => LAND_CACHE.get(model.landUrl) ?? null);
  useEffect(() => {
    let live = true;
    if (!land) void loadLand(model.landUrl).then(value => { if (live) setLand(value); }).catch(() => { /* the map still plays without coastlines */ });
    return () => { live = false; };
  }, [land, model.landUrl]);
  const landPath = useMemo(() => (land ? geoPath(model.projection)(land) ?? '' : ''), [land, model.projection]);
  const routes = useMemo(() => routesOf(model), [model]);
  const names = model.steps[step].names;
  return <Frame label={map === 'plague' ? 'A map of Europe: the plague spreading from Kaffa by sea around the Mediterranean and up the Atlantic coast, and only later overland to Moscow' : 'A world map: sites of our species lighting up, from Africa to Asia, Australia, Europe and the Americas'}>
    <g data-part="mp-land"><path d={landPath} className="dgb-land" /></g>
    {routes.map(route => <path key={route.id} data-part="mp-route" data-route={route.id} d="" className={`dgb-route is-${route.via === 'sea' ? 'sea' : 'land'}`} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />)}
    {model.places.map(pl => <g key={pl.id} data-part="mp-place" data-place={pl.id} opacity="0">
      <circle data-part="mp-pulse" r="0" className="dgb-pulse" />
      <circle data-part="mp-dot" r="4" className="dgb-place" />
    </g>)}
    {model.places.filter(pl => names.includes(pl.id)).map(pl => <g key={pl.id} data-part="mp-label" data-place={pl.id} opacity="0">
      <text data-part="mp-name" className="dgb-place-name" textAnchor={pl.labelSide === 'left' ? 'end' : 'start'}>{pl.name}</text>
      <text data-part="mp-date" className="dgb-place-date" textAnchor={pl.labelSide === 'left' ? 'end' : 'start'}>{model.date(pl)}</text>
    </g>)}
    <rect x="0" y="10" width={W} height="46" className="dgb-veil" />
    <text data-part="mp-clock" x="16" y="42" className="dgb-clock">{model.clock(model.tick(model.steps[step].t[0]))}</text>
    {model.legend && <g className="dgb-legend">
      <line x1="236" x2="254" y1="27" y2="27" className="dgb-route is-sea" />
      <text x="260" y="31" className="dgb-note">by sea</text>
      <line x1="236" x2="254" y1="45" y2="45" className="dgb-route is-land" />
      <text x="260" y="49" className="dgb-note">by land</text>
    </g>}
  </Frame>;
}

function paintSpread(root: SVGSVGElement, map: 'plague' | 'africa', step: string, p: number) {
  const model = spreadModel(map);
  const index = model.order.indexOf(step);
  const spec = model.steps[step];
  const before = model.steps[model.order[Math.max(0, index - 1)]];
  // The camera: from the previous step's view to this one's, in the first part of the frame.
  const from = model.views[before.view], to = model.views[spec.view];
  const c = ease(span(p, 0, 0.38));
  const bw = MAP_BOX.x1 - MAP_BOX.x0, bh = MAP_BOX.y1 - MAP_BOX.y0;
  const fit = (v: View) => Math.min(bw / (v[2] - v[0]), bh / (v[3] - v[1]));
  const k = Math.exp(mix(Math.log(fit(from)), Math.log(fit(to)), c));
  const cx = mix((from[0] + from[2]) / 2, (to[0] + to[2]) / 2, c), cy = mix((from[1] + from[3]) / 2, (to[1] + to[3]) / 2, c);
  const tx = (MAP_BOX.x0 + MAP_BOX.x1) / 2 - k * cx, ty = (MAP_BOX.y0 + MAP_BOX.y1) / 2 - k * cy;
  const screen = ([x, y]: Pt): Pt => [tx + k * x, ty + k * y];
  set(part(root, 'mp-land'), { transform: `translate(${f1(tx)} ${f1(ty)}) scale(${k.toFixed(5)})` });
  // The clock.
  const t0 = model.tick(spec.t[0]), t1 = model.tick(spec.t[1]);
  const t = mix(t0, t1, span(p, 0.05, 0.7));
  const clock = part(root, 'mp-clock');
  if (clock) clock.textContent = model.clock(t);
  for (const route of routesOf(model)) {
    const el = root.querySelector(`[data-route="${route.id}"]`);
    const arrive = model.tick(route.to.when), leave = model.tick(route.from.when);
    const lead = Math.min(model.lead, arrive - leave);
    const progress = lead > 0 ? clamp((t - (arrive - lead)) / lead) : t >= arrive ? 1 : 0;
    set(el, { d: smooth(route.points.map(screen)), 'stroke-dashoffset': f3(1 - progress), opacity: progress > 0 ? 1 : 0 });
  }
  const byId = new Map(model.places.map(pl => [pl.id, pl]));
  parts(root, 'mp-place').forEach(group => {
    const pl = byId.get(group.dataset.place!)!;
    const [x, y] = screen(project(model.projection, [pl.lon, pl.lat]));
    const age = t - model.tick(pl.when);
    const lit = age >= 0;
    set(group, { opacity: lit ? 1 : 0, transform: `translate(${f1(x)} ${f1(y)})` });
    const q = lit ? clamp(age / model.lead) : 1;
    set(group.querySelector('[data-part="mp-pulse"]'), { r: f1(4 + 15 * q), opacity: f3(1 - q) });
  });
  parts(root, 'mp-label').forEach(group => {
    const pl = byId.get(group.dataset.place!)!;
    const [x, y] = screen(project(model.projection, [pl.lon, pl.lat]));
    const age = t - model.tick(pl.when);
    const left = pl.labelSide === 'left' ? x > 130 : x > W - 130;
    const lx = x + (left ? -9 : 9);
    const anchor = left ? 'end' : 'start';
    set(group.querySelector('[data-part="mp-name"]'), { x: f1(lx), y: f1(y - 2), 'text-anchor': anchor });
    set(group.querySelector('[data-part="mp-date"]'), { x: f1(lx), y: f1(y + 13), 'text-anchor': anchor });
    set(group, { opacity: f3(age >= 0 ? clamp(age / (model.lead * 0.5) + 0.35) : 0) });
  });
}

/* ─── E11: Andersson's widowbird tails (Andersson 1982) ───────────────────────────────────────
   Four matched males: shortened, cut and glued back, untouched, lengthened. Tail lengths are to
   scale against a half-metre tail: cut to about 14 cm, lengthened by 20 to 30 cm. */
const TL = { branch: 104, xs: [56, 140, 224, 308], normal: 160, short: 45, long: 240 };
const tailPath = (x: number, length: number, k: number) => {
  const y0 = TL.branch - 6, end = y0 + length;
  return `M${x + 9} ${y0}C${x + 18 + k * 5} ${y0 + length * 0.35} ${x + 8 + k * 9} ${y0 + length * 0.7} ${x + 12 + k * 6} ${f1(end)}`;
};
const TL_LABELS = [['cut short'], ['cut and', 'glued back'], ['left alone'], ['lengthened']];

function Tails() {
  return <Frame label="Four male widowbirds on a branch: one tail cut short, one cut and glued back, one left alone, and one lengthened with the cut feathers">
    <text data-part="tl-title" x={W / 2} y="40" textAnchor="middle" className="dgb-title">36 males, 9 groups of 4</text>
    <line x1="18" x2="342" y1={TL.branch} y2={TL.branch} className="dgb-branch" />
    {TL.xs.map((x, i) => <g key={i} data-part="tl-bird" opacity="0">
      {[-1, 0, 1].map(k => <path key={k} data-part={`tl-tail-${i}`} data-k={k} d={tailPath(x, TL.normal, k)} className="dgb-tail" />)}
      <ellipse cx={x} cy={TL.branch - 12} rx="15" ry="9.5" className="dgb-bird" />
      <ellipse cx={x + 3} cy={TL.branch - 15} rx="5" ry="3.2" className="dgb-patch" />
      <circle cx={x - 13} cy={TL.branch - 20} r="6.5" className="dgb-bird" />
      <path d={`M${x - 19} ${TL.branch - 21}l-7 2.5 7 2.2Z`} className="dgb-beak" />
      <g data-part="tl-label" opacity="0">
        {TL_LABELS[i].map((line, j) => <text key={j} x={x} y={362 + j * 16} textAnchor="middle" className="dgb-small is-strong">{line}</text>)}
      </g>
    </g>)}
    <path data-part="tl-piece" d="" className="dgb-tail is-moving" opacity="0" />
    <g data-part="tl-cut" opacity="0">
      <path d={`M${TL.xs[0]} ${TL.branch + TL.short - 6}l24 0`} className="dgb-cut" />
      <path d={`M${TL.xs[1] + 2} ${TL.branch + 70}l24 0`} className="dgb-cut" />
    </g>
    <circle data-part="tl-glue" cx={TL.xs[1] + 15} cy={TL.branch + 70} r="3.5" className="dgb-glue" opacity="0" />
    <g data-part="tl-win" opacity="0">
      <circle cx={TL.xs[3]} cy={TL.branch - 14} r="26" className="dgb-halo" />
      <text x={TL.xs[3]} y="56" textAnchor="middle" className="dgb-label is-hot">most nests</text>
    </g>
    <g data-part="tl-same" opacity="0">
      {[TL.xs[0], TL.xs[2]].map(x => <text key={x} x={x} y="56" textAnchor="middle" className="dgb-small">the same</text>)}
    </g>
  </Frame>;
}

function paintTails(root: SVGSVGElement, step: string, p: number) {
  const birds = parts(root, 'tl-bird');
  const four = step === 'four', swap = step === 'swap';
  birds.forEach((bird, i) => set(bird, { opacity: f3(four ? ease(span(p, 0.04 + i * 0.08, 0.24 + i * 0.08)) : 1) }));
  // Tail lengths: grow in, then the swap moves feathers from bird 1 to bird 4.
  const grow = four ? ease(span(p, 0.2, 0.62)) : 1;
  const move = swap ? ease(span(p, 0.22, 0.62)) : step === 'nests' ? 1 : 0;
  const lengths = [mix(TL.normal, TL.short, move), TL.normal, TL.normal, mix(TL.normal, TL.long, swap ? ease(span(p, 0.55, 0.72)) : step === 'nests' ? 1 : 0)];
  TL.xs.forEach((x, i) => parts(root, `tl-tail-${i}`).forEach(tail => set(tail, { d: tailPath(x, lengths[i] * grow, Number(tail.dataset.k)) })));
  // The cut piece flies from bird 1 to the end of bird 4's tail.
  const fly = swap ? span(p, 0.22, 0.62) : 0;
  const piece = part(root, 'tl-piece');
  if (fly > 0 && fly < 1) {
    const x = mix(TL.xs[0], TL.xs[3], ease(fly)), y = mix(TL.branch + TL.short, TL.branch + TL.normal - 6, ease(fly)) - Math.sin(Math.PI * fly) * 40;
    set(piece, { d: `M${f1(x + 12)} ${f1(y)}c4 34 -2 66 2 ${TL.long - TL.normal}`, opacity: 1 });
  } else set(piece, { opacity: 0 });
  set(part(root, 'tl-cut'), { opacity: f3(swap ? span(p, 0.04, 0.12) * (1 - span(p, 0.5, 0.62)) : 0) });
  set(part(root, 'tl-glue'), { opacity: f3(swap ? span(p, 0.4, 0.5) : step === 'nests' ? 1 : 0) });
  parts(root, 'tl-label').forEach((label, i) => set(label, { opacity: f3(four ? 0 : swap ? span(p, 0.62 + i * 0.06, 0.74 + i * 0.06) : 1) }));
  set(part(root, 'tl-win'), { opacity: f3(step === 'nests' ? ease(span(p, 0.12, 0.4)) : 0) });
  set(part(root, 'tl-title'), { opacity: f3(step === 'nests' ? 1 - ease(span(p, 0, 0.12)) : 1) });
  set(part(root, 'tl-same'), { opacity: f3(step === 'nests' ? ease(span(p, 0.45, 0.7)) : 0) });
}

/* ─── E11: what colour costs (the pack's trade-off model; a teaching model, not data) ─────── */
type TradeParams = { trait: { name: string; low: string; high: string }; curves: { survival: string; mating: string; offspring: string }; settings: Setting[]; mating: Mating; start: string };
const TRADE = simParams<TradeParams>(evolutionE11, 'tradeOff');
const TR_MANY = TRADE.settings.find(s => s.id === TRADE.start)!;
const TR_FEW = TRADE.settings.find(s => s.id !== TRADE.start)!;
const TR = { x0: 40, x1: 330, top: 150, base: 372 };
const trX = (x: number) => TR.x0 + x * (TR.x1 - TR.x0);
const trY = (y: number) => TR.base - y * (TR.base - TR.top);
const trSetting = (t: number): Setting => ({ id: 'mix', label: '', base: mix(TR_MANY.base, TR_FEW.base, t), rate: mix(TR_MANY.rate, TR_FEW.rate, t) });
/** Young are drawn against the best male in the same stream, as the expedition's sim does. */
const trYoung = (x: number, s: Setting) => offspring(x, s, TRADE.mating) / (offspring(best(s, TRADE.mating), s, TRADE.mating) / 0.9);
const trCurve = (f: (x: number) => number) => Array.from({ length: 61 }, (_, i) => { const x = i / 60; return `${i ? 'L' : 'M'}${f1(trX(x))} ${f1(trY(f(x)))}`; }).join('');

function Guppy() {
  return <g data-part="tr-guppy" transform="translate(70 72)">
    <path d="M-34 0C-22 -15 14 -15 26 -3L44 -16L40 0L44 16L26 3C14 15 -22 15 -34 0Z" className="dgb-fish" />
    <circle cx="-26" cy="-2" r="2.2" className="dgb-fish-eye" />
    <circle data-part="tr-spot" cx="-6" cy="-3" r="5" className="dgb-spot is-orange" opacity="0" />
    <circle data-part="tr-spot" cx="8" cy="3" r="4" className="dgb-spot is-black" opacity="0" />
    <circle data-part="tr-spot" cx="18" cy="-4" r="3.5" className="dgb-spot is-blue" opacity="0" />
    <path data-part="tr-spot" d="M30 -4L42 -12L40 0Z" className="dgb-spot is-orange" opacity="0" />
  </g>;
}

function TradeOff({ step }: { step: string }) {
  return <Frame label="A teaching model: as a male guppy's colour increases, his chance of living to breed falls and his chance of being chosen rises; the young he leaves peak in between, and the peak moves toward more colour where there are no predators">
    <Guppy />
    <text data-part="tr-where" x="126" y="70" className="dgb-small is-strong">{step === 'falls' ? 'above the falls: no pike cichlids' : 'below the falls: pike cichlids'}</text>
    <text x="126" y="88" className="dgb-footnote">a teaching model, not measurements</text>
    <g data-part="tr-legend">
      {([['is-survival', TRADE.curves.survival], ['is-mating', TRADE.curves.mating], ['is-young', TRADE.curves.offspring]] as const).map(([kind, label], i) => <g key={kind} transform={`translate(${[36, 146, 286][i]} 120)`}>
        <line x1="0" x2="16" y1="-4" y2="-4" className={`dgb-curve ${kind}`} />
        <text x="22" y="0" className="dgb-small">{label.toLowerCase()}</text>
      </g>)}
    </g>
    <g data-part="tr-axes" opacity="0">
      <line x1={TR.x0} x2={TR.x1} y1={TR.base} y2={TR.base} className="dgb-axis" />
      <text x={TR.x0} y={TR.base + 22} className="dgb-tick">{TRADE.trait.low}</text>
      <text x={TR.x1} y={TR.base + 22} textAnchor="end" className="dgb-tick">{TRADE.trait.high}</text>
      <text x={(TR.x0 + TR.x1) / 2} y={TR.base + 22} textAnchor="middle" className="dgb-note">{TRADE.trait.name.toLowerCase()}</text>
    </g>
    <path data-part="tr-survival" d="" className="dgb-curve is-survival" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    <path data-part="tr-mating" d={trCurve(x => mating(x, TRADE.mating))} className="dgb-curve is-mating" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    <path data-part="tr-young" d="" className="dgb-curve is-young" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
    <line data-part="tr-marker" x1="0" x2="0" y1={TR.base} y2={TR.base} className="dgb-marker" opacity="0" />
    <circle data-part="tr-peak" r="0" className="dgb-peak" />
    <text data-part="tr-l-young" className="dgb-label is-hot" textAnchor="middle" opacity="0">most young</text>
  </Frame>;
}

function paintTradeOff(root: SVGSVGElement, step: string, p: number) {
  const costs = step === 'costs', falls = step === 'falls';
  const shift = falls ? ease(span(p, 0.1, 0.62)) : 0;
  const s = trSetting(shift);
  set(part(root, 'tr-axes'), { opacity: f3(costs ? ease(span(p, 0, 0.15)) : 1) });
  set(part(root, 'tr-survival'), { d: trCurve(x => survival(x, s)) });
  draw(part(root, 'tr-survival'), costs ? ease(span(p, 0.14, 0.48)) : 1);
  draw(part(root, 'tr-mating'), costs ? ease(span(p, 0.5, 0.86)) : 1);
  set(part(root, 'tr-legend'), { opacity: f3(costs ? span(p, 0.1, 0.3) : 1) });
  set(part(root, 'tr-young'), { d: trCurve(x => trYoung(x, s)) });
  draw(part(root, 'tr-young'), costs ? 0 : step === 'peak' ? ease(span(p, 0.08, 0.52)) : 1);
  const peak = best(s, TRADE.mating);
  const mark = costs ? 0 : step === 'peak' ? ease(span(p, 0.52, 0.72)) : 1;
  const px = trX(peak), py = trY(trYoung(peak, s));
  set(part(root, 'tr-marker'), { x1: f1(px), x2: f1(px), y2: f1(mix(TR.base, py, mark)), opacity: mark > 0 ? 1 : 0 });
  set(part(root, 'tr-peak'), { cx: f1(px), cy: f1(py), r: f1(6 * mark) });
  set(part(root, 'tr-l-young'), { x: f1(px), y: f1(py - 14), opacity: f3(mark) });
  set(part(root, 'tr-where'), { opacity: f3(falls ? span(p, 0.05, 0.25) : costs ? span(p, 0, 0.15) : 1) });
  // The guppy wears the colour the marker points at.
  const colour = costs ? 0.15 : clamp(mix(0.15, peak / Math.max(0.01, best(TR_FEW, TRADE.mating)), mark));
  parts(root, 'tr-spot').forEach((spot, i) => set(spot, { opacity: f3(clamp(colour * 1.4 - i * 0.18)) }));
}

/* ─── E12: steps toward an eye, in living animals (Wikipedia: Evolution of the eye) ──────────
   One sheet of light-sensitive cells folds into a cup, closes to a pinhole and gains a lens.
   The shape is a circular arc around a fixed back point; each step sets its half-angle and radius. */
type EyeStep = 'spot' | 'cup' | 'pinhole' | 'camera';
const EYE = { back: 322, cy: 238 };
const EYE_SHAPES: Record<EyeStep, { phi: number; rho: number }> = {
  spot: { phi: 0.3, rho: 330 },
  cup: { phi: 1.32, rho: 118 },
  pinhole: { phi: 2.93, rho: 100 },
  camera: { phi: 2.62, rho: 100 },
};
const EYE_ORDER: EyeStep[] = ['spot', 'cup', 'pinhole', 'camera'];
const EYE_TEXT: Record<EyeStep, [string, string]> = {
  spot: ['Eyespot', 'light or dark · nearly every animal group'],
  cup: ['Pit eye', 'which way the light comes from · some snails'],
  pinhole: ['Pinhole eye', 'a dim image · the nautilus'],
  camera: ['Camera eye', 'a lens sharpens it · us, and octopuses'],
};
const SUN: Pt = [52, 104];
const OBJECT = { x: 42, top: 220, bottom: 256 };
const eyeCenter = (shape: { rho: number }) => EYE.back - shape.rho;
const eyePoint = (shape: { phi: number; rho: number }, t: number, extra = 0): Pt => [eyeCenter(shape) + (shape.rho + extra) * Math.cos(t), EYE.cy + (shape.rho + extra) * Math.sin(t)];
function eyeArc(shape: { phi: number; rho: number }, extra = 0, from = -shape.phi, to = shape.phi, n = 48): string {
  let d = '';
  for (let i = 0; i <= n; i++) { const [x, y] = eyePoint(shape, from + ((to - from) * i) / n, extra); d += `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }
  return d;
}
const eyeRim = (shape: { phi: number; rho: number }) => eyePoint(shape, shape.phi);
/** Where a ray from `a` through `b` meets the back of the eye. */
function hitBack(shape: { phi: number; rho: number }, a: Pt, b: Pt): Pt {
  const [cx, cy] = [eyeCenter(shape), EYE.cy];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const fx = a[0] - cx, fy = a[1] - cy;
  const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - shape.rho * shape.rho;
  const s = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
  return [a[0] + s * dx, a[1] + s * dy];
}
function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
/** Which stretches of the retina the sun can reach without the eye's own wall in the way. */
function litRuns(shape: { phi: number; rho: number }, n = 60): [number, number][] {
  const ts = Array.from({ length: n + 1 }, (_, i) => -shape.phi + (2 * shape.phi * i) / n);
  const pts = ts.map(t => eyePoint(shape, t));
  const lit = pts.map((q, i) => !pts.some((_, j) => j < n && Math.abs(j - i) > 1 && j + 1 !== i && crosses(SUN, q, pts[j], pts[j + 1])));
  const runs: [number, number][] = [];
  lit.forEach((on, i) => { if (on && (i === 0 || !lit[i - 1])) runs.push([ts[i], ts[i]]); if (on) runs[runs.length - 1][1] = ts[i]; });
  return runs;
}

function Eyes({ step }: { step: EyeStep }) {
  const shape = EYE_SHAPES[step];
  const [title, sub] = EYE_TEXT[step];
  const rim = eyeRim(shape);
  const aperture: Pt = [rim[0], EYE.cy];
  const tip: Pt = [OBJECT.x, OBJECT.top], foot: Pt = [OBJECT.x, OBJECT.bottom];
  const imaging = step === 'pinhole' || step === 'camera';
  const lensR = shape.rho * Math.sin(shape.phi) * 0.92;
  const lensX = rim[0] + 4;
  const imageTip = hitBack(shape, tip, imaging ? [lensX, EYE.cy] : aperture), imageFoot = hitBack(shape, foot, imaging ? [lensX, EYE.cy] : aperture);
  let rays: [Pt, Pt][] = [];
  let lit: [number, number][] = [];
  if (step === 'spot' || step === 'cup') {
    lit = step === 'spot' ? [[-shape.phi, shape.phi]] : litRuns(shape);
    const targets = lit.flatMap(([a, b]) => [0.15, 0.5, 0.85].map(f => eyePoint(shape, a + (b - a) * f)));
    rays = targets.map(q => [SUN, q]);
  } else if (step === 'pinhole') {
    rays = [[tip, imageTip], [foot, imageFoot]];
  } else {
    for (const [from, to] of [[tip, imageTip], [foot, imageFoot]] as [Pt, Pt][]) for (const dy of [-0.7, 0, 0.7]) {
      const through: Pt = [lensX, EYE.cy + dy * lensR];
      rays.push([from, through], [through, to]);
    }
  }
  return <Frame label={`${title}: ${sub}`}>
    <text x={W / 2} y="44" textAnchor="middle" className="dgb-title">{title}</text>
    <text x={W / 2} y="65" textAnchor="middle" className="dgb-note">{sub}</text>
    {!imaging && <g className="dgb-sun-glyph" transform={`translate(${SUN[0]} ${SUN[1]})`}>
      <circle r="11" className="dgb-sun" />
      {Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={f1(Math.cos(a) * 16)} y1={f1(Math.sin(a) * 16)} x2={f1(Math.cos(a) * 22)} y2={f1(Math.sin(a) * 22)} className="dgb-sun-ray" />; })}
    </g>}
    {imaging && <path d={`M${OBJECT.x} ${OBJECT.bottom}V${OBJECT.top}M${OBJECT.x - 7} ${OBJECT.top + 9}L${OBJECT.x} ${OBJECT.top}L${OBJECT.x + 7} ${OBJECT.top + 9}`} className="dgb-object" />}
    <path data-part="ey-water" d="" className="dgb-water" />
    <path data-part="ey-wall" d="" className="dgb-wall" />
    <path data-part="ey-retina" d="" className="dgb-retina" />
    <g data-part="ey-after" opacity="0">
      {rays.map(([a, b], i) => <line key={i} x1={f1(a[0])} y1={f1(a[1])} x2={f1(b[0])} y2={f1(b[1])} className="dgb-ray" />)}
      {lit.map(([a, b], i) => <path key={i} d={eyeArc(shape, 0, a, b, 24)} className="dgb-retina is-lit" />)}
      {imaging && <path d={`M${f1(imageFoot[0])} ${f1(imageFoot[1])}L${f1(imageTip[0])} ${f1(imageTip[1])}`} className={`dgb-image${step === 'pinhole' ? ' is-dim' : ''}`} />}
    </g>
    {step === 'camera' && <ellipse data-part="ey-lens" cx={f1(lensX)} cy={EYE.cy} rx={f1(lensR * 0.55)} ry={f1(lensR)} className="dgb-lens" opacity="0" />}
  </Frame>;
}

function paintEyes(root: SVGSVGElement, step: EyeStep, p: number) {
  const prev = EYE_SHAPES[EYE_ORDER[Math.max(0, EYE_ORDER.indexOf(step) - 1)]], next = EYE_SHAPES[step];
  const m = ease(span(p, 0.04, 0.42));
  const shape = { phi: mix(prev.phi, next.phi, m), rho: mix(prev.rho, next.rho, m) };
  set(part(root, 'ey-retina'), { d: eyeArc(shape) });
  set(part(root, 'ey-wall'), { d: eyeArc(shape, 9) });
  set(part(root, 'ey-water'), { d: `${eyeArc(shape)}Z`, opacity: f3(clamp((shape.phi - 1.6) / 1.2)) });
  set(part(root, 'ey-after'), { opacity: f3(ease(span(p, 0.46, 0.68))) });
  set(part(root, 'ey-lens'), { opacity: f3(ease(span(p, 0.3, 0.5))) });
}

/* ─── E12: groups inside groups (the pack's nested-trait table) ────────────────────────────── */
type NestParams = { taxa: { id: string; label: string; traits: string[] }[]; traits: { id: string; label: string }[] };
const NEST = simParams<NestParams>(evolutionE12, 'nestTest');
const NEST_BOX: Record<string, [number, number, number, number]> = {
  backbone: [10, 24, 350, 412], limbs: [22, 84, 338, 400], amnion: [34, 144, 326, 388], feathers: [46, 206, 156, 376], hair: [168, 206, 314, 376],
};
const NEST_AT: Record<string, Pt> = {
  shark: [112, 64], salmon: [248, 64], frog: [180, 124], lizard: [122, 184], crocodile: [238, 184], pigeon: [101, 300], mouse: [241, 284], human: [241, 320],
};
const NEST_STEP: Record<string, string[]> = { backbone: ['backbone'], limbs: ['limbs', 'amnion'], split: ['feathers', 'hair'], misfit: [] };
const NEST_ORDER = ['backbone', 'limbs', 'split', 'misfit'];

function Nest() {
  const label = (id: string) => (id === 'hair' ? 'Hair and milk' : NEST.traits.find(t => t.id === id)!.label);
  return <Frame label="Animals sorted by shared traits: backbone, then four limbs, then an amniotic sac, then feathers or hair; every group sits inside a bigger one, and a furry, feathered, milk-fed animal would have nowhere to go">
    {Object.entries(NEST_BOX).map(([id, [x0, y0, x1, y1]]) => <g key={id}>
      <rect data-part="ns-box" data-trait={id} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="14" className="dgb-group" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
      <text data-part="ns-label" data-trait={id} x={x0 + 11} y={y0 + 18} className="dgb-group-label" opacity="0">{label(id)}</text>
    </g>)}
    {NEST.taxa.map(taxon => <text key={taxon.id} data-part="ns-animal" x={NEST_AT[taxon.id]?.[0] ?? 0} y={NEST_AT[taxon.id]?.[1] ?? 0} textAnchor="middle" className="dgb-animal" opacity="0">{taxon.label}</text>)}
    <g data-part="ns-misfit" opacity="0">
      <rect x="-46" y="-34" width="92" height="68" rx="12" className="dgb-misfit" />
      <text y="-8" textAnchor="middle" className="dgb-small is-strong">feathers</text>
      <text y="8" textAnchor="middle" className="dgb-small is-strong">+ fur</text>
      <text y="24" textAnchor="middle" className="dgb-small is-strong">+ milk</text>
    </g>
    <path data-part="ns-cross" d="M150 214l60 60M210 214l-60 60" className="dgb-cross" opacity="0" />
  </Frame>;
}

function paintNest(root: SVGSVGElement, step: string, p: number) {
  const index = NEST_ORDER.indexOf(step);
  const doneBefore = new Set(NEST_ORDER.slice(0, index).flatMap(s => NEST_STEP[s]));
  const now = NEST_STEP[step];
  const progress = (trait: string) => {
    if (doneBefore.has(trait)) return 1;
    const k = now.indexOf(trait);
    if (k < 0) return 0;
    const start = step === 'backbone' ? 0.42 : 0.06 + k * 0.38;
    return ease(span(p, start, start + 0.34));
  };
  parts(root, 'ns-box').forEach(box => {
    const t = progress(box.dataset.trait!);
    draw(box, t);
    const glow = step === 'split' ? span(p, 0.8, 0.9) * (1 - span(p, 0.95, 1)) : 0;
    set(box, { class: glow > 0.3 ? 'dgb-group is-hot' : 'dgb-group', 'fill-opacity': f3(t) });
  });
  const dim = step === 'misfit' ? 1 - 0.5 * ease(span(p, 0.05, 0.25)) : 1;
  parts(root, 'ns-label').forEach(label => set(label, { opacity: f3(span(progress(label.dataset.trait!), 0.55, 1) * dim) }));
  parts(root, 'ns-animal').forEach((animal, i) => set(animal, { opacity: f3((step === 'backbone' ? ease(span(p, 0.02 + i * 0.045, 0.16 + i * 0.045)) : 1) * dim) }));
  // The misfit drops in, tries both boxes, and has nowhere to go.
  const drop = step === 'misfit' ? ease(span(p, 0.06, 0.3)) : 0;
  const sway = step === 'misfit' ? Math.sin(span(p, 0.3, 0.78) * Math.PI * 3) * 42 * (1 - span(p, 0.7, 0.78)) : 0;
  set(part(root, 'ns-misfit'), { opacity: f3(drop), transform: `translate(${f1(180 + sway)} ${f1(mix(140, 244, drop))})` });
  set(part(root, 'ns-cross'), { opacity: f3(step === 'misfit' ? ease(span(p, 0.8, 0.92)) : 0) });
}

export function ReelDiagramViewB({ diagram }: { diagram: DiagramB }) {
  switch (diagram.name) {
    case 'iridium': return <Iridium />;
    case 'crater': return <Crater />;
    case 'extinctions': return <Extinctions />;
    case 'rewind': return <Rewind step={diagram.step} />;
    case 'spread': return <Spread map={diagram.map} step={diagram.step} />;
    case 'tails': return <Tails />;
    case 'tradeoff': return <TradeOff step={diagram.step} />;
    case 'eyes': return <Eyes step={diagram.step} />;
    case 'nest': return <Nest />;
  }
}

/** Draw one moment of a diagram: `p` is progress through its frame, `ms` the reel's clock. */
export function paintDiagramB(root: SVGSVGElement, diagram: DiagramB, p: number, ms: number): void {
  switch (diagram.name) {
    case 'iridium': return paintIridium(root, diagram.step, p);
    case 'crater': return paintCrater(root, diagram.step, p);
    case 'extinctions': return paintExtinctions(root, diagram.step, p, ms);
    case 'rewind': return paintRewind(root, diagram.step, p, ms);
    case 'spread': return paintSpread(root, diagram.map, diagram.step, p);
    case 'tails': return paintTails(root, diagram.step, p);
    case 'tradeoff': return paintTradeOff(root, diagram.step, p);
    case 'eyes': return paintEyes(root, diagram.step, p);
    case 'nest': return paintNest(root, diagram.step, p);
  }
}
