import { useEffect, useMemo, useState } from 'react';
import type { Choice, Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Choices, Confident, Credit, Verdict } from '../blocks/ui';
import { copies, expected, punnett, ratioText, sample, seeded, tally, phenotype, alleles, type Locus, boxesByLook, expected2, joinPair, phenotype2, sample2, splitPair, type Gene } from './cross';
import { CrossGrid } from './CrossGrid';
import './PeaCross.css';

// A pea garden on one gene. The learner commits to a prediction, then makes the cross;
// every seed in the tray is drawn by sims/cross.ts (one factor at random from each
// parent), so the counts and ratios on screen are computed, never typed.

type Ask = { gradeId: string; transfer?: boolean; prompt: string; choices: Choice[]; answer: string; explain: string };
type Step = {
  id: string;
  title: string;
  parents: [string, string];
  parentNames: [string, string];
  action: string;
  seeds: number;
  ask: Ask;
  /** What the step's text says to expect, in quarters per visible trait (e.g. { R: 3, r: 1 }).
   * With the beat's `second` gene, in sixteenths per combination (e.g. { 'R|Y': 9, 'R|y': 3, … }).
   * The validator recomputes it from the cross, so prose and model can't drift apart. */
  expect?: Record<string, number>;
  /** Count a crop as large as a real one, and set it beside the real count. One gene only. */
  scaleUp?: { count: number; action: string; realLabel: string; real: Record<string, number> };
  /** With the beat's `second` gene: the two parents' genotypes for it, in `parents` order. */
  second?: [string, string];
  /** What this step's offspring are called, when it isn't the beat's `noun`: ['egg', 'eggs']. */
  noun?: [string, string];
};

/** How the second gene's looks are drawn: a ring around the first gene's shape, solid, dashed or
 * none, so a two-gene tray never depends on colour. */
export type RingLook = 'ring' | 'dashed' | 'none';
export type PeaCrossParams = {
  locus: Locus;
  /** Visible trait key (from cross.ts phenotype) → how it is named and drawn. */
  traits: Record<string, { label: string; look: TraitLook }>;
  steps: Step[];
  seed: string;
  figure?: { media: string; caption: string };
  /** What one offspring is called, singular and plural. Peas by default: ['seed', 'seeds']. */
  noun?: [string, string];
  /** What the large count is called, e.g. "Your garden". */
  yours?: string;
  /** The line under the square when "each parent passes on one of its two factors" is not what
   * happens (one old DNA strand plus one new one, say). `{ratio}` is the computed share. `false`
   * leaves the square without a line, when the step's explanation already says how copies pass. */
  note?: string | false;
  /** Strand copying, not a cross (cross.ts copies): every step's tray holds the exact shares, the
   * two "parents" are never drawn as a pair to cross, and there is no Punnett square, so nothing on
   * screen assumes how the strands are handed out before the learner has said. */
  copying?: boolean;
  /** A second gene on another chromosome pair, dealt separately from the first (cross.ts expected2):
   * its locus and looks, once for the beat. Every step then names its parents' genotypes for it
   * (`step.second`), the tray draws both genes, and the square has sixteen equally likely boxes. An
   * X-linked first gene pairs with an ordinary second one; two genes on one chromosome never do. */
  second?: { locus: Locus; traits: Record<string, { label: string; ring: RingLook }> };
};

/** How a visible trait is drawn. Peas have their own shapes; any other trait is a dot that is
 * full, half-filled or empty, so three traits (red, pink, white flowers; roan coats; blood
 * groups) read apart without relying on colour. */
export type TraitLook = 'round' | 'wrinkled' | 'full' | 'half' | 'none';

export function PeaShape({ look, size = 22 }: { look: TraitLook; size?: number }) {
  if (look === 'full' || look === 'half' || look === 'none') return (
    <svg className={`pea pea--dot pea--${look}`} viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true">
      <circle r="9.5" className="pea__ring" />
      {look === 'full' && <circle r="9.5" className="pea__fill" />}
      {look === 'half' && <path d="M0 -9.5 A9.5 9.5 0 0 1 0 9.5 Z" className="pea__fill" />}
    </svg>
  );
  return (
    <svg className={`pea pea--${look}`} viewBox="-12 -12 24 24" width={size} height={size} aria-hidden="true">
      {look === 'round'
        ? <><circle r="10" className="pea__body" /><ellipse cx="-3.5" cy="-4" rx="3" ry="2" className="pea__shine" /></>
        : <><path d="M-9 -2 C-10 -8 -4 -11 0 -9 C3 -11 9 -9 9 -4 C11 0 9 6 5 8 C2 11 -3 10 -6 8 C-10 6 -11 2 -9 -2 Z" className="pea__body" />
          <path d="M-5 -5 C-2 -3 -3 1 -6 3 M2 -7 C0 -3 3 0 1 4 M6 -2 C4 1 6 4 3 7" className="pea__crease" /></>}
    </svg>
  );
}

function StepPanel({ step, p, onDone }: { step: Step; p: PeaCrossParams; onDone: () => void }) {
  const { record, evidenceFor, media } = useBeat();
  const prior = evidenceFor(step.ask.gradeId);
  const [pick, setPick] = useState<string | null>(prior ? step.ask.choices.find(c => c.label === prior.chosen)?.id ?? null : null);
  const [ran, setRan] = useState(false);
  const [big, setBig] = useState(false);
  const [shownSeeds, setShownSeeds] = useState(0);
  const locus = p.locus;
  const crop = useMemo(() => (p.copying ? copies : sample)(step.parents[0], step.parents[1], step.seeds, locus, seeded(`${p.seed}:${step.id}`)), [step, locus, p.seed, p.copying]);
  const counts = useMemo(() => tally(crop, locus), [crop, locus]);
  const bigCounts = useMemo(() => step.scaleUp ? tally(sample(step.parents[0], step.parents[1], step.scaleUp.count, locus, seeded(`${p.seed}:${step.id}:big`)), locus) : null, [step, locus, p.seed]);
  const want = expected(step.parents[0], step.parents[1], locus);
  const square = punnett(step.parents[0], step.parents[1], locus);
  const order = Object.keys(p.traits);
  const trait = (genotype: string) => p.traits[phenotype(genotype, locus)];

  useEffect(() => {
    if (!ran) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShownSeeds(crop.length); return; }
    let n = 0;
    const id = window.setInterval(() => { n = Math.min(crop.length, n + Math.max(1, Math.round(crop.length / 24))); setShownSeeds(n); if (n >= crop.length) window.clearInterval(id); }, 40);
    return () => window.clearInterval(id);
  }, [ran, crop.length]);
  const grown = ran && shownSeeds >= crop.length;
  useEffect(() => { if (grown && (!step.scaleUp || big)) onDone(); }, [grown, big, step.scaleUp, onDone]);

  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: step.ask.gradeId, transfer: !!step.ask.transfer, correct: pick === step.ask.answer, confidence, prompt: step.ask.prompt, chosen: step.ask.choices.find(c => c.id === pick)!.label });
  };
  const committed = !!evidenceFor(step.ask.gradeId);
  const chosen = step.ask.choices.find(c => c.id === pick);

  const line = (c: Record<string, number>) => order.filter(k => c[k]).map(k => `${p.traits[k].label} ${c[k].toLocaleString('en-US')}`).join(' · ');
  const ratio = (c: Record<string, number>) => order.length === 2 ? ratioText(c[order[0]] ?? 0, c[order[1]] ?? 0) : '';
  const kinds = order.filter(k => want[k]);
  const [one, many] = step.noun ?? p.noun ?? ['seed', 'seeds'];
  const quarter = kinds.length === 1 ? `every ${one} ${p.traits[kinds[0]].label.toLowerCase()}` : `${kinds.map(k => `${want[k]} ${p.traits[k].label.toLowerCase()}`).join(' to ')} in every four`;

  return (
    <div className="peacross__step">
      <h3 className="peacross__title">{step.title}</h3>
      {!p.copying && <div className="peacross__parents" aria-label={`${step.parentNames[0]} crossed with ${step.parentNames[1]}`}>
        {step.parents.map((g, k) => (
          <div key={k} className="peacross__parent">
            <PeaShape look={trait(g).look} size={54} />
            <span>{step.parentNames[k]}</span>
            {ran && <code>{g}</code>}
          </div>
        )).flatMap((el, k) => k ? [<span key="x" className="peacross__times" aria-hidden="true">×</span>, el] : [el])}
      </div>}

      <div className="question">
        <p className="question__prompt">{step.ask.prompt}</p>
        <Choices choices={step.ask.choices} value={pick} onPick={setPick} locked={committed} answer={grown ? step.ask.answer : null} />
        {pick && !committed && <Confident onCommit={commit} />}
      </div>

      {committed && !ran && <button type="button" className="peacross__go" onClick={() => setRan(true)} data-action="pea-cross">{step.action}</button>}

      {ran && (
        <div className="peacross__result">
          <div className="peacross__tray" role="img" aria-label={`${crop.length} ${many}: ${line(counts)}`}>
            {crop.slice(0, shownSeeds).map((g, k) => <PeaShape key={k} look={trait(g).look} size={crop.length > 40 ? 18 : 26} />)}
          </div>
          {grown && (<>
            <p className="readout">{line(counts)}{ratio(counts) && counts[order[1]] ? ` · ${ratio(counts)}` : ''}</p>
            {!p.copying && <table className="peacross__square" aria-label="Punnett square">
              <thead>
                <tr><th colSpan={2} /><th colSpan={2}>{step.parentNames[0]}</th></tr>
                <tr><th colSpan={2} />{[0, 1].map(c => <th key={c} className="peacross__allele">{alleles(step.parents[0], locus)[c]}</th>)}</tr>
              </thead>
              <tbody>
                {[0, 1].map(r => (
                  <tr key={r}>
                    {r === 0 && <th rowSpan={2} className="peacross__side"><span>{step.parentNames[1]}</span></th>}
                    <th className="peacross__allele">{alleles(step.parents[1], locus)[r]}</th>
                    {[0, 1].map(c => { const g = square[c][r]; return <td key={c}><PeaShape look={trait(g).look} size={22} /><code>{g}</code></td>; })}
                  </tr>
                ))}
              </tbody>
            </table>}
            {p.note !== false && <p className="stage__note">{p.note ? p.note.replace('{ratio}', quarter) : `Each parent passes on one of its two factors, picked at random. The four boxes are equally likely: ${quarter}.`}</p>}
            <Verdict correct={chosen ? chosen.id === step.ask.answer : null} title={chosen ? `You said “${chosen.label}”` : undefined}>
              {chosen?.feedback && chosen.id !== step.ask.answer && <p className="feedback">{chosen.feedback}</p>}
              <p>{step.ask.explain}</p>
            </Verdict>
            {step.scaleUp && !big && <button type="button" className="peacross__go" onClick={() => setBig(true)} data-action="pea-scale">{step.scaleUp.action}</button>}
            {step.scaleUp && big && bigCounts && (
              <div className="peacross__compare">
                {[{ label: `${p.yours ?? 'Your garden'}, ${step.scaleUp.count.toLocaleString('en-US')} ${many}`, c: bigCounts }, { label: step.scaleUp.realLabel, c: step.scaleUp.real }].map(row => {
                  const total = order.reduce((s, k) => s + (row.c[k] ?? 0), 0);
                  return (
                    <div key={row.label} className="peacross__bar">
                      <span>{row.label}</span>
                      <div className="peacross__fill" aria-hidden="true">{order.map(k => <i key={k} className={`is-${p.traits[k].look}`} style={{ width: `${((row.c[k] ?? 0) / total) * 100}%` }} />)}</div>
                      <b>{line(row.c)} · {ratio(row.c)}</b>
                    </div>
                  );
                })}
              </div>
            )}
            {step.scaleUp && big && p.figure && (
              <figure className="figure peacross__figure">
                <img src={media(p.figure.media).src} alt={media(p.figure.media).alt} />
                <figcaption>{p.figure.caption} <Credit media={p.figure.media} /></figcaption>
              </figure>
            )}
          </>)}
        </div>
      )}
    </div>
  );
}

/** A first-gene shape inside a second-gene ring. Every shape sits in the same box, ringed or not. */
function PeaPair({ look, ring, size = 22 }: { look: TraitLook; ring: RingLook; size?: number }) {
  return <span className={`pea2 pea2--${ring}`}><PeaShape look={look} size={size} /></span>;
}

const lower = (label: string) => /^\p{Lu}[\p{Lu}\d]/u.test(label) ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`;

/** One step of a two-gene beat: the same flow as a one-gene step (predict, commit, grow, read), with
 * each offspring drawn for both genes and the square grown to sixteen boxes. */
function TwoGeneStep({ step, p, onDone }: { step: Step; p: PeaCrossParams; onDone: () => void }) {
  const { record, evidenceFor } = useBeat();
  const second = p.second!;
  const prior = evidenceFor(step.ask.gradeId);
  const [pick, setPick] = useState<string | null>(prior ? step.ask.choices.find(c => c.label === prior.chosen)?.id ?? null : null);
  const [ran, setRan] = useState(false);
  const [shownSeeds, setShownSeeds] = useState(0);
  // checkSimBeat refuses a two-gene step without its own second-gene parents, so step.second is always set here.
  const genes = useMemo((): [Gene, Gene] => [{ locus: p.locus, parents: step.parents }, { locus: second.locus, parents: step.second! }], [p.locus, second.locus, step]);
  const crop = useMemo(() => sample2(genes[0], genes[1], step.seeds, seeded(`${p.seed}:${step.id}`)), [genes, step.seeds, step.id, p.seed]);
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const g of crop) { const k = phenotype2(g, genes[0].locus, genes[1].locus); out[k] = (out[k] ?? 0) + 1; }
    return out;
  }, [crop, genes]);
  const want = expected2(genes[0], genes[1]);
  const order = Object.keys(p.traits).flatMap(k1 => Object.keys(second.traits).map(k2 => joinPair(k1, k2))).filter(k => want[k] || counts[k]);
  const name = (combo: string) => { const [k1, k2] = splitPair(combo); return `${p.traits[k1]?.label ?? k1}, ${lower(second.traits[k2]?.label ?? k2)}`; };
  const pair = (genotype: string, size: number) => {
    const [k1, k2] = splitPair(phenotype2(genotype, genes[0].locus, genes[1].locus));
    return <PeaPair look={p.traits[k1]?.look ?? 'none'} ring={second.traits[k2]?.ring ?? 'none'} size={size} />;
  };

  useEffect(() => {
    if (!ran) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShownSeeds(crop.length); return; }
    let n = 0;
    const id = window.setInterval(() => { n = Math.min(crop.length, n + Math.max(1, Math.round(crop.length / 24))); setShownSeeds(n); if (n >= crop.length) window.clearInterval(id); }, 40);
    return () => window.clearInterval(id);
  }, [ran, crop.length]);
  const grown = ran && shownSeeds >= crop.length;
  useEffect(() => { if (grown) onDone(); }, [grown, onDone]);

  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: step.ask.gradeId, transfer: !!step.ask.transfer, correct: pick === step.ask.answer, confidence, prompt: step.ask.prompt, chosen: step.ask.choices.find(c => c.id === pick)!.label });
  };
  const committed = !!evidenceFor(step.ask.gradeId);
  const chosen = step.ask.choices.find(c => c.id === pick);
  const [, many] = step.noun ?? p.noun ?? ['seed', 'seeds'];
  const line = order.filter(k => counts[k]).map(k => `${name(k)} ${counts[k].toLocaleString('en-US')}`).join(' · ');
  const parts = order.filter(k => want[k]).map(k => `${want[k]} ${lower(name(k))}`);
  // Each name already holds a comma ("round, green"), so the list is split by semicolons.
  const sixteen = `${parts.length > 1 ? `${parts.slice(0, -1).join('; ')}; and ${parts.at(-1)}` : parts.join('')} in every sixteen`;

  return (
    <div className="peacross__step">
      <h3 className="peacross__title">{step.title}</h3>
      <div className="peacross__parents" aria-label={`${step.parentNames[0]} crossed with ${step.parentNames[1]}`}>
        {step.parents.map((g, k) => (
          <div key={k} className="peacross__parent">
            {pair(joinPair(g, genes[1].parents[k]), 48)}
            <span>{step.parentNames[k]}</span>
            {ran && <code>{g} {genes[1].parents[k]}</code>}
          </div>
        )).flatMap((el, k) => k ? [<span key="x" className="peacross__times" aria-hidden="true">×</span>, el] : [el])}
      </div>

      <div className="question">
        <p className="question__prompt">{step.ask.prompt}</p>
        <Choices choices={step.ask.choices} value={pick} onPick={setPick} locked={committed} answer={grown ? step.ask.answer : null} />
        {pick && !committed && <Confident onCommit={commit} />}
      </div>

      {committed && !ran && <button type="button" className="peacross__go" onClick={() => setRan(true)} data-action="pea-cross">{step.action}</button>}

      {ran && (
        <div className="peacross__result">
          <div className="peacross__tray" role="img" aria-label={`${crop.length} ${many}: ${line}`}>
            {crop.slice(0, shownSeeds).map((g, k) => <span key={k}>{pair(g, crop.length > 40 ? 16 : 22)}</span>)}
          </div>
          {grown && (<>
            <p className="readout">{line}</p>
            <CrossGrid
              rows={boxesByLook(step.parents[0], step.parents[1], p.locus, Object.keys(p.traits)).map(g => phenotype(g, p.locus))}
              cols={boxesByLook(genes[1].parents[0], genes[1].parents[1], second.locus, Object.keys(second.traits)).map(g => phenotype(g, second.locus))}
              rowLabel={k => p.traits[k]?.label ?? k} colLabel={k => second.traits[k]?.label ?? k}
              cell={(r, c) => <PeaPair look={p.traits[r]?.look ?? 'none'} ring={second.traits[c]?.ring ?? 'none'} size={16} />}
              label={`Sixteen equally likely combinations: ${sixteen}`} />
            {p.note !== false && <p className="stage__note">{p.note ? p.note.replace('{ratio}', sixteen) : `Each parent passes on one copy of each gene, and the two genes are dealt separately. The sixteen boxes are equally likely: ${sixteen}.`}</p>}
            <Verdict correct={chosen ? chosen.id === step.ask.answer : null} title={chosen ? `You said “${chosen.label}”` : undefined}>
              {chosen?.feedback && chosen.id !== step.ask.answer && <p className="feedback">{chosen.feedback}</p>}
              <p>{step.ask.explain}</p>
            </Verdict>
          </>)}
        </div>
      )}
    </div>
  );
}

export function PeaCross({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as unknown as PeaCrossParams;
  const [finished, setFinished] = useState<number>(0);
  // A step opens once the one before it has been grown.
  const open = p.steps.slice(0, finished + 1);
  useEffect(() => { if (finished >= p.steps.length) done(); }, [finished, p.steps.length, done]);
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="peacross">
        {open.map((step, i) => p.second
          ? <TwoGeneStep key={step.id} step={step} p={p} onDone={() => setFinished(f => Math.max(f, i + 1))} />
          : <StepPanel key={step.id} step={step} p={p} onDone={() => setFinished(f => Math.max(f, i + 1))} />)}
      </div>
    </section>
  );
}
