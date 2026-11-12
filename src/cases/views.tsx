// What each case engine draws: the situation before the run, and the run itself as `t` goes 0 → 1.
// Every number on screen comes from the engine's outcome (cases/engines.ts).
import { useMemo } from 'react';
import { dialAngle, clockSeconds, formatClock } from '../expeditions/sims/deepTimeMath';
import { boxesByLook, expected, expected2, joinPair, phenotype, phenotype2, punnett } from '../expeditions/sims/cross';
import { CrossGrid } from '../expeditions/sims/CrossGrid';
import { mating, survival, offspring, sample as sampleCurve } from '../expeditions/sims/tradeoffModel';
import { layout, mrca, parseNewick, pathTo, type TreeNode } from '../expeditions/sims/tree';
import { outline } from '../expeditions/sims/nesting';
import { Aligned, CodonTable, Strand, type Mark } from '../expeditions/sims/SequenceParts';
import { changeSpan, EFFECT_WORDS, read, type Change, type Reading } from '../expeditions/sims/sequence';
import { crossClassOf, midSentence, type Outcome } from './engines';
import type { CaseAnswer, ChartModel, ClockModel, CrossModel, NestModel, PopulationModel, SequenceModel, TradeoffModel, TreeModel } from './types';

export interface ViewProps<M> { model: M; answer: CaseAnswer | null; outcome: Outcome | null; t: number }

const W = 343;
const pctOf = (x: number) => Math.round(x * 100);
const picked = (answer: CaseAnswer | null) => answer && 'pick' in answer ? answer.pick : null;
const valued = (answer: CaseAnswer | null) => answer && 'value' in answer ? answer.value : null;
/** Deme colours: the place's accent, then two steps away from it. */
const HUES = ['var(--accent)', 'hsl(calc(var(--hue) + 150) 40% 66%)', 'hsl(calc(var(--hue) + 60) 42% 66%)', 'hsl(calc(var(--hue) - 70) 40% 70%)', 'var(--pale)'];

function Dots({ share, n, color }: { share: number; n: number; color: string }) {
  const on = Math.round(share * n);
  return <span className="case-dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} style={i < on ? { background: color } : undefined} />)}</span>;
}

// ---------------------------------------------------------------- population

export function PopulationView({ model, outcome, t }: ViewProps<PopulationModel>) {
  const G = model.generations;
  const g = outcome ? Math.round(t * G) : 0;
  const run = outcome?.run.engine === 'population' ? outcome.run : null;
  const h = 150, px = (i: number) => 4 + (i / G) * (W - 8), py = (v: number) => 8 + (1 - v) * (h - 16);
  const sizeOf = (d: PopulationModel['demes'][number]) => d.size === 'large' ? 1e6 : d.size;
  const biggest = Math.max(...model.demes.map(sizeOf));
  return (
    <div className="case-pop">
      {run && <p className="case-gen"><b>{g}</b><span>of {G} generations</span></p>}
      <div className="case-demes">
        {model.demes.map((d, k) => {
          const share = run ? run.demes[k].runs[0][g] : model.start;
          // Dots scale with the population (by area), so a small island looks small beside a big one.
          const n = Math.max(6, Math.min(48, Math.round(48 * Math.sqrt(sizeOf(d) / biggest))));
          return <figure key={d.id}><Dots share={share} n={n} color={HUES[k % HUES.length]} /><figcaption>{d.label}{run ? ` · ${pctOf(share)}%` : ''}</figcaption></figure>;
        })}
      </div>
      {run && (
        <svg className="case-chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={outcome!.line}>
          <line x1="0" x2={W} y1={py(1)} y2={py(1)} className="case-grid" /><line x1="0" x2={W} y1={py(0)} y2={py(0)} className="case-grid" />
          <text x={W - 4} y={py(1) + 12} textAnchor="end" className="case-tick">every {model.who.one}</text>
          <text x={W - 4} y={py(0) - 4} textAnchor="end" className="case-tick">none</text>
          {run.demes.map((d, k) => d.runs.map((path, r) => (
            <path key={`${k}-${r}`} d={path.slice(0, g + 1).map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join('')} style={{ stroke: HUES[k % HUES.length] }} className={d.runs.length > 1 ? 'case-run is-thin' : 'case-run'} />
          )))}
        </svg>
      )}
      {run && model.demes.length > 1 && <p className="case-legend">{model.demes.map((d, k) => <span key={d.id}><i style={{ background: HUES[k % HUES.length] }} />{d.label}{run.demes[k].runs.length > 1 ? ` · ${run.demes[k].runs.length} runs` : ''}</span>)}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- trade-off

export function TradeoffView({ model, answer, outcome, t }: ViewProps<TradeoffModel>) {
  const h = 160, px = (v: number) => 6 + v * (W - 12), py = (v: number) => 12 + (1 - v) * (h - 26);
  const run = outcome?.run.engine === 'tradeoff' ? outcome.run : null;
  const peak = useMemo(() => Math.max(...sampleCurve(x => offspring(x, model.setting, model.mating), 100).map(([, y]) => y)), [model]);
  const line = (f: (x: number) => number) => sampleCurve(f, 80).map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('');
  const young = (x: number) => (offspring(x, model.setting, model.mating) / peak) * 0.82;
  const value = valued(answer);
  const g = run ? Math.round(t * model.generations) : 0;
  const mean = run ? run.means[g] : model.start;
  return (
    <svg className="case-trade" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`${model.benefit} rises and ${model.cost} falls from ${model.trait.low} to ${model.trait.high}`}>
      <path d={line(x => mating(x, model.mating))} className="case-curve is-benefit" />
      <path d={line(x => survival(x, model.setting) / model.setting.base)} className="case-curve is-cost" />
      <text x={px(0.86)} y={Math.max(12, py(mating(0.86, model.mating)) - 8)} textAnchor="end" className="case-tick is-label">{model.benefit}</text>
      <text x={px(0.07)} y={py(survival(0.07, model.setting) / model.setting.base) + 20} textAnchor="start" className="case-tick is-label">{model.cost}</text>
      {run && <g style={{ opacity: Math.min(1, t * 2) }}>
        <path d={`${line(young)}L${px(1)},${py(0)}L${px(0)},${py(0)}Z`} className="case-fill" />
        <path d={line(young)} className="case-curve is-young" />
        <line x1={px(run.best)} x2={px(run.best)} y1={py(0)} y2={py(1)} className="case-best" />
      </g>}
      {value !== null && <line x1={px(value)} x2={px(value)} y1={py(0)} y2={py(1)} className="case-mark" />}
      <circle cx={px(mean)} cy={py(0) - 1} r="5" className="case-pop-dot" />
    </svg>
  );
}

// ---------------------------------------------------------------- cross

const TONES = ['var(--accent)', 'hsl(36 62% 64%)', 'hsl(calc(var(--hue) + 150) 40% 66%)', 'var(--pale)'];

export function CrossView(props: ViewProps<CrossModel>) {
  if (props.model.second) return <CrossTwoGenes {...props} />;
  const { model, outcome, t } = props;
  const run = outcome?.run.engine === 'cross' ? outcome.run : null;
  const traits = Object.keys(model.traits);
  const tone = (trait: string) => TONES[traits.indexOf(trait) % TONES.length];
  const shown = run ? Math.round(t * run.brood.length) : 0;
  const counts: Record<string, number> = {};
  if (run) for (const g of run.brood.slice(0, shown)) { const ph = phenotype(g, model.locus); counts[ph] = (counts[ph] ?? 0) + 1; }
  const square = run && t >= 1 && !model.copying ? punnett(model.parents[0], model.parents[1], model.locus) : null;
  const want = expected(model.parents[0], model.parents[1], model.locus);
  return (
    <div className="case-cross">
      {model.spots
        ? <p className="case-parents is-spots">{model.spots.map(label => <span key={label}>{label}</span>)}</p>
        : !model.copying && <p className="case-parents">{model.parents.map((g, i) => <span key={i}>{!model.parentLabels && <i style={{ background: tone(phenotype(g, model.locus)) }} />}{model.parentLabels?.[i] ?? model.traits[phenotype(g, model.locus)]}</span>)}</p>}
      {run && <>
        <div className="case-brood" aria-hidden="true">{run.brood.slice(0, shown).map((g, i) => <i key={i} style={{ background: tone(phenotype(g, model.locus)) }} />)}</div>
        <p className="case-tally">{traits.filter(tr => want[tr] || counts[tr]).map(tr => <span key={tr}><i style={{ background: tone(tr) }} />{model.traits[tr]} <b>{counts[tr] ?? 0}</b></span>)}</p>
      </>}
      {square && (
        <table className="case-square" aria-label="Every pairing, equally likely">
          <tbody>{square.map((row, r) => <tr key={r}>{row.map((g, c) => <td key={c}><i style={{ background: tone(phenotype(g, model.locus)) }} />{model.traits[phenotype(g, model.locus)]}</td>)}</tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

/** Class colours for two genes: up to six classes, so six tones that stay apart on any place hue.
 * Five coloured tones on five hues (the accent, its opposite, a quarter turn each way, and three
 * eighths of a turn back) and pale, the accent's hue washed almost to grey, so no two coloured tones
 * share a hue. The one-gene TONES are left as they are. */
const TONES2 = ['var(--accent)', 'hsl(calc(var(--hue) + 180) 48% 68%)', 'hsl(calc(var(--hue) + 90) 46% 64%)', 'hsl(calc(var(--hue) - 90) 42% 72%)', 'var(--pale)', 'hsl(calc(var(--hue) - 135) 52% 62%)'];

/** Two genes: the parents (or four spots) before the run; a tray and tally by class during it; the
 * sixteen equally likely boxes once it is done. Nothing about shares shows before the run ends. */
function CrossTwoGenes({ model, outcome, t }: ViewProps<CrossModel>) {
  const s = model.second!;
  const run = outcome?.run.engine === 'cross' ? outcome.run : null;
  const keys = Object.keys(s.classes);
  const classOf = crossClassOf(s);
  const tone = (key: string | undefined) => TONES2[Math.max(0, keys.indexOf(key ?? '')) % TONES2.length];
  const shown = run ? Math.round(t * run.brood.length) : 0;
  const counts: Record<string, number> = {};
  if (run) for (const g of run.brood.slice(0, shown)) { const k = classOf[phenotype2(g, model.locus, s.locus)]; counts[k] = (counts[k] ?? 0) + 1; }
  const focus = new Set(model.focus.split(','));
  const done = !!run && t >= 1;
  const made = done ? expected2({ locus: model.locus, parents: model.parents }, { locus: s.locus, parents: s.parents }) : {};
  const n16 = [...focus].reduce((sum, c) => sum + (made[c] ?? 0), 0);
  return (
    <div className="case-cross is-two">
      {model.spots && s.spots
        ? <p className="case-parents is-spots is-four">{[...model.spots, ...s.spots].map(label => <span key={label}>{label}</span>)}</p>
        : <p className="case-parents">{model.parents.map((g, i) => <span key={i}>{model.parentLabels?.[i] ?? `${model.traits[phenotype(g, model.locus)]}, ${midSentence(s.traits[phenotype(s.parents[i], s.locus)])}`}</span>)}</p>}
      {run && <>
        <div className="case-brood" aria-hidden="true">{run.brood.slice(0, shown).map((g, i) => <i key={i} style={{ background: tone(classOf[phenotype2(g, model.locus, s.locus)]) }} />)}</div>
        <p className="case-tally">{keys.map(k => <span key={k}><i style={{ background: tone(k) }} />{s.classes[k]} <b>{counts[k] ?? 0}</b></span>)}</p>
      </>}
      {done && (
        <CrossGrid
          rows={boxesByLook(model.parents[0], model.parents[1], model.locus, Object.keys(model.traits)).map(g => phenotype(g, model.locus))}
          cols={boxesByLook(s.parents[0], s.parents[1], s.locus, Object.keys(s.traits)).map(g => phenotype(g, s.locus))}
          rowLabel={k => model.traits[k] ?? k} colLabel={k => s.traits[k] ?? k}
          cell={(r, c) => <i className="case-cell" style={{ background: tone(classOf[joinPair(r, c)]) }} />}
          marked={(r, c) => focus.has(joinPair(r, c))}
          label={`Sixteen equally likely combinations: ${midSentence(s.classes[model.focus])} in ${n16}`} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tree

const descendants = (node: TreeNode): string[] => node.children.flatMap(child => [child.id, ...descendants(child)]);

export function TreeView({ model, answer, outcome, t }: ViewProps<TreeModel>) {
  const root = useMemo(() => parseNewick(model.newick), [model.newick]);
  const placed = useMemo(() => layout(root), [root]);
  const tips = [...placed.values()].filter(p => p.tip);
  const depth = Math.max(...[...placed.values()].map(p => p.x));
  const rowH = 30, h = tips.length * rowH + 8, labelW = 128;
  const px = (x: number) => 8 + (x / depth) * (W - labelW - 16), py = (y: number) => 18 + y * rowH;
  const run = outcome?.run.engine === 'tree' ? outcome.run : null;
  // The run winds the case's own line back toward where it meets `than`. Everything that joins it
  // before that point lights: the group closer to it than `than` is.
  const clade = run ? pathTo(mrca(root, model.of, model.than), model.of)[1] : null;
  const stop = clade ? placed.get(clade.id)!.x : 0;
  const cursor = depth - t * (depth - stop);
  const inside = clade ? new Set([clade.id, ...descendants(clade)]) : new Set<string>();
  const reached = run ? [
    ...pathTo(root, model.of).filter(n => placed.get(n.id)!.x >= cursor).map(n => n.id),
    ...(t >= 1 ? inside : []),
  ] : [];
  const chosen = answer && 'picks' in answer ? answer.picks : [];
  return (
    <svg className="case-tree" viewBox={`0 0 ${W} ${h}`} role="img" aria-label="A family tree of the organisms in this case">
      {[...placed.values()].filter(p => !p.tip).map(p => {
        const kids = p.children.map(id => placed.get(id)!);
        const lit = (id: string) => reached.includes(p.id) && reached.includes(id);
        const litKids = kids.filter(k => lit(k.id));
        return <g key={p.id}>
          <line x1={px(p.x)} x2={px(p.x)} y1={py(Math.min(...kids.map(k => k.y)))} y2={py(Math.max(...kids.map(k => k.y)))} className="case-branch" />
          {litKids.length > 0 && <line x1={px(p.x)} x2={px(p.x)} y1={py(Math.min(p.y, ...litKids.map(k => k.y)))} y2={py(Math.max(p.y, ...litKids.map(k => k.y)))} className="case-branch is-lit" />}
          {kids.map(k => <line key={k.id} x1={px(p.x)} x2={px(k.x)} y1={py(k.y)} y2={py(k.y)} className={`case-branch${lit(k.id) ? ' is-lit' : ''}`} />)}
        </g>;
      })}
      {tips.map(p => (
        <text key={p.id} x={px(p.x) + 6} y={py(p.y) + 4} className={`case-tip${p.id === model.of ? ' is-of' : ''}${p.id === model.than ? ' is-than' : ''}${chosen.includes(p.id) ? ' is-picked' : ''}${run && t >= 1 && run.closer.includes(p.id) ? ' is-closest' : ''}`}>{model.tips[p.id]}</text>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- clock

export function ClockView({ model, answer, outcome, t }: ViewProps<ClockModel>) {
  const R = 118, c = W / 2, cy = R + 14;
  const at = (seconds: number, r: number) => { const a = dialAngle(seconds) - Math.PI / 2; return [c + Math.cos(a) * r, cy + Math.sin(a) * r] as const; };
  const value = valued(answer);
  const run = outcome?.run.engine === 'clock' ? outcome.run : null;
  const truth = run ? run.hours * 3600 * Math.min(1, t) : null;
  const hand = (seconds: number, cls: string) => { const [x, y] = at(seconds, R - 10); return <line x1={c} y1={cy} x2={x} y2={y} className={cls} />; };
  return (
    <svg className="case-clock" viewBox={`0 0 ${W} ${cy * 2}`} role="img" aria-label={`Earth’s history as one day, midnight to midnight`}>
      <circle cx={c} cy={cy} r={R} className="case-dial" />
      {Array.from({ length: 24 }, (_, i) => { const [x1, y1] = at(i * 3600, R); const [x2, y2] = at(i * 3600, R - (i % 6 ? 5 : 10)); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="case-grid" />; })}
      {[0, 6, 12, 18].map(hr => { const [x, y] = at(hr * 3600, R - 22); return <text key={hr} x={x} y={y + 4} textAnchor="middle" className="case-tick">{String(hr).padStart(2, '0')}:00</text>; })}
      {model.landmarks.map(l => { const s = clockSeconds(l.ma, model.earthMa); const [x, y] = at(s, R); return <circle key={l.label} cx={x} cy={y} r="3" className="case-landmark"><title>{l.label}</title></circle>; })}
      {value !== null && hand(value * 3600, 'case-hand is-yours')}
      {truth !== null && hand(truth, 'case-hand is-true')}
      {truth !== null && t >= 1 && <text x={c} y={cy + 34} textAnchor="middle" className="case-clock-time">{formatClock(truth)}</text>}
      <circle cx={c} cy={cy} r="3.5" className="case-pin" />
    </svg>
  );
}

/** Landmarks under the dial, so a learner has bearings without hovering. */
export function ClockLandmarks({ model }: { model: ClockModel }) {
  return <ul className="case-landmarks">{model.landmarks.map(l => <li key={l.label}><b>{formatClock(clockSeconds(l.ma, model.earthMa))}</b> {l.label}</li>)}</ul>;
}

// ---------------------------------------------------------------- nest

export function NestView({ model, outcome, t }: ViewProps<NestModel>) {
  const rows = useMemo(() => outline(model.taxa, model.traits.map(tr => tr.id)), [model]);
  const label = (id: string) => model.traits.find(tr => tr.id === id)?.label ?? id;
  const run = outcome?.run.engine === 'nest' ? outcome.run : null;
  return (
    <div className="case-nest">
      <ul className="case-outline">{rows.map((row, i) => row.kind === 'group'
        ? <li key={i} className="is-group" style={{ paddingLeft: row.depth * 14 }}>{label(row.trait)}</li>
        : <li key={i} style={{ paddingLeft: row.depth * 14 + 10 }}>{row.taxon.label}</li>)}</ul>
      <ul className="case-finds">{model.candidates.map(c => {
        const settled = run && t >= 1;
        const homeless = settled && run.homeless.includes(c.id);
        return <li key={c.id} className={homeless ? 'is-homeless' : ''}>
          <b>{c.label}</b>
          <span>{settled ? (homeless ? 'Nowhere to go' : 'Slots in') : c.traits.map(label).join(' · ') || 'none of these traits'}</span>
        </li>;
      })}</ul>
    </div>
  );
}

// ---------------------------------------------------------------- chart

export function ChartView({ model, answer, outcome, t }: ViewProps<ChartModel>) {
  const run = outcome?.run.engine === 'chart' ? outcome.run : null;
  const top = Math.max(...model.bars.map(b => b.value));
  const pick = picked(answer);
  return (
    <div className="case-chartwrap"><div className="case-bars" role="img" aria-label={run ? outcome!.line : 'Bars that rise when you run it'}>
      {model.bars.map(b => (
        <figure key={b.id} className={`${b.id === pick ? 'is-picked' : ''}${run && t >= 1 && run.order[0] === b.id ? ' is-top' : ''}`}>
          <span><i style={{ height: `${run ? (b.value / top) * 100 * Math.min(1, t) : 0}%` }} />{run && t >= 1 && <b>{b.value.toLocaleString('en-US')}</b>}</span>
          <figcaption>{b.label}</figcaption>
        </figure>
      ))}
    </div><p className="case-unit">{model.unit}</p></div>
  );
}

// ---------------------------------------------------------------- sequence

function marksFor(c: Change | undefined, side: 'before' | 'after'): Record<number, Mark> {
  if (!c) return {};
  const { from, removed, added } = changeSpan(c);
  const out: Record<number, Mark> = {};
  if (c.kind === 'sub') out[from] = 'changed';
  if (side === 'before') for (let i = 0; i < removed && c.kind === 'del'; i++) out[from + i] = 'gone';
  if (side === 'after') for (let i = 0; i < added && c.kind === 'ins'; i++) out[from + i] = 'new';
  return out;
}
const differing = (before: Reading, after: Reading) => new Set(after.words.flatMap((w, k) => before.words[k]?.symbol === w.symbol ? [] : [k]));
const shown = (letters: string, kind: SequenceModel['kind']) => kind === 'dna' ? letters.replaceAll('U', 'T') : letters;

export function SequenceView({ model, answer, outcome, t }: ViewProps<SequenceModel>) {
  const run = outcome?.run.engine === 'sequence' ? outcome.run : null;
  const first = model.seqs[0];
  const before = useMemo(() => run?.before ?? read(first.letters, { from: model.from }), [run, first.letters, model.from]);
  if (model.measure === 'closest' || model.measure === 'differences') {
    return <div className="case-seq"><Aligned rows={model.seqs.map(s => ({ ...s, letters: shown(s.letters, model.kind) }))} group={10} marked={!!run && t >= 1} /></div>;
  }
  const firstWord = (model.firstResidue ?? 1) - (model.trimFirst ? 1 : 0);
  // Which change is on screen: the one the case reads, or the one the learner picked among several.
  const changes = model.changes ?? [];
  const pickId = answer && 'pick' in answer ? answer.pick : null;
  const active = model.measure === 'same' ? changes.find(c => c.id === pickId) : changes[0];
  const k = active ? changes.indexOf(active) : -1;
  const after = run && k >= 0 ? run.afters[k] : null;
  const win: [number, number] | undefined = model.window ? [model.window[0] - 1, model.window[1]] : undefined;
  // After the run the changed letters replace the old ones. The window stretches to the new stop
  // when reading ran on past the old one, or when the new stop lies just beyond it.
  const stopEnd = after?.reading.stop ? after.reading.stop.at + 3 : after?.letters.length ?? 0;
  const afterWin: [number, number] | undefined = win && after
    ? [win[0], after.effect === 'stop-lost' || stopEnd - win[1] <= 60 ? Math.max(win[1], stopEnd) : win[1]]
    : undefined;
  const words = after ? Math.ceil(Math.min(1, t) * after.reading.words.length) : 0;
  return (
    <div className="case-seq">
      {after
        ? <Strand letters={shown(after.letters, model.kind)} reading={after.reading} shownWords={words} marks={marksFor(active?.change, 'after')} changed={t >= 1 ? differing(before, after.reading) : undefined}
            window={afterWin} firstWord={firstWord} label="After the change" />
        : <Strand letters={shown(first.letters, model.kind)} reading={before} marks={marksFor(active?.change, 'before')} window={win} firstWord={firstWord} label={first.label} />}
      {/* The options already list the changes; after the run each one carries what it did. */}
      {model.measure === 'same' && run && t >= 1 && <ul className="case-seq__changes">{changes.map((c, i) => (
        <li key={c.id} className={c.id === pickId ? 'is-picked' : ''}><span>{c.label}</span><b>{EFFECT_WORDS[run.afters[i].effect]}</b></li>
      ))}</ul>}
      {model.measure !== 'same' && active && <p className="case-seq__change">{active.label}</p>}
      <CodonTable kind={model.kind} />
    </div>
  );
}
