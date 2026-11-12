import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Confidence, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Choices, Confident, Verdict } from '../blocks/ui';
import {
  BASES, EFFECT_WORDS, applyChange, capFirst, chainWords, changeSpan, labOutcome, read,
  type Change, type LabStep, type Reading,
} from './sequence';
import { Aligned, CodonTable, Paired, Strand, TreeFigure, type Mark, type TreeReveal } from './SequenceParts';

// The sequence lab: letters you can read, copy, change and compare. Each step shows a strand,
// asks for a prediction, then runs the operation in sims/sequence.ts: the RNA, the chain, the
// effect of a change and the differences on screen are all computed from the letters, never typed.
// A step can stay open afterwards, so the learner changes letters and watches the chain re-read.

export type Params = {
  steps: LabStep[];
  /** Offer the codon table on reading steps (default true). */
  table?: boolean;
  /** A sourced tree, drawn only after every step has run: what the counts point to, shown last. */
  reveal?: TreeReveal;
};

const RUN_MS = 1600;

function useRun(ran: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!ran) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setT(1); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const k = Math.min(1, (now - start) / RUN_MS); setT(k); if (k < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    // A hidden tab pauses animation frames: finish anyway.
    const done = window.setTimeout(() => setT(1), RUN_MS + 300);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(done); };
  }, [ran]);
  return t;
}

/** Marks for a change, on the letters before it (what will go) and after it (what arrived). */
function changeMarks(c: Change): { before: Record<number, Mark>; after: Record<number, Mark> } {
  const { from, removed, added } = changeSpan(c);
  const before: Record<number, Mark> = {}, after: Record<number, Mark> = {};
  if (c.kind === 'sub') { before[from] = 'changed'; after[from] = 'changed'; }
  for (let i = 0; i < removed && c.kind === 'del'; i++) before[from + i] = 'gone';
  for (let i = 0; i < added && c.kind === 'ins'; i++) after[from + i] = 'new';
  return { before, after };
}

const changedWords = (before: Reading, after: Reading) => new Set(after.words.flatMap((w, k) => before.words[k]?.symbol === w.symbol && before.words[k]?.word.length === w.word.length ? [] : [k]));
const show = (letters: string, kind: LabStep['kind']) => kind === 'dna' ? letters.replaceAll('U', 'T') : letters.replaceAll('T', 'U');

function changeWords(c: Change, letters: string, kind: LabStep['kind']): string {
  if (c.kind === 'sub') return `Letter ${c.at}: ${show(letters[c.at - 1], kind)} becomes ${show(c.to, kind)}`;
  if (c.kind === 'del') return c.count === 1 ? `Letter ${c.at}, ${show(letters[c.at - 1], kind)}, is lost` : `Letters ${c.at}–${c.at + c.count - 1}, ${show(letters.slice(c.at - 1, c.at - 1 + c.count), kind)}, are lost`;
  return `${show(c.letters, kind)} slips in before letter ${c.at}`;
}

function StepPanel({ step, table, onDone }: { step: LabStep; table: boolean; onDone: () => void }) {
  const { record, evidenceFor } = useBeat();
  const { ask, op } = step;
  const prior = evidenceFor(ask.gradeId);
  const [pick, setPick] = useState<string | null>(prior ? ask.choices.find(c => c.label === prior.chosen)?.id ?? null : null);
  const [ran, setRan] = useState(false);
  const t = useRun(ran);
  const outcome = useMemo(() => labOutcome(step), [step]);
  const committed = !!evidenceFor(ask.gradeId);
  const finished = ran && t >= 1;
  useEffect(() => { if (finished) onDone(); }, [finished, onDone]);

  // Play: once the run is over, letters can be changed and the chain re-read live.
  const base = op.do === 'change' ? outcome.effect!.letters : step.letters;
  const from = op.do === 'translate' || op.do === 'change' ? op.from : 'start';
  const [edits, setEdits] = useState<Change[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const edited = useMemo(() => edits.reduce(applyChange, base), [edits, base]);
  const playing = !!step.play && finished && (op.do === 'translate' || op.do === 'change');
  const playFrom = typeof from === 'number' ? from : 'start';
  const playReading = useMemo(() => playing ? read(edited, { from: playFrom }) : null, [playing, edited, playFrom]);
  const edit = (c: Change) => { setEdits(list => [...list, c]); setSelected(null); };

  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: ask.gradeId, transfer: !!ask.transfer, correct: pick === ask.answer, confidence, prompt: ask.prompt, chosen: ask.choices.find(c => c.id === pick)!.label });
  };
  const chosen = ask.choices.find(c => c.id === pick);
  const letters = show(step.letters, step.kind);

  let stage: ReactNode = null;
  if (op.do === 'transcribe') {
    const rna = outcome.rna!;
    stage = <Paired top={letters} bottom={rna} shown={ran ? Math.ceil(t * rna.length) : 0} labels={[step.label, 'RNA']} />;
  } else if (op.do === 'translate') {
    const reading = outcome.reading!;
    const words = ran ? Math.ceil(t * reading.words.length) : 0;
    stage = playing && playReading
      ? <Strand letters={show(edited, step.kind)} reading={playReading} changed={changedWords(reading, playReading)} onTap={setSelected} selected={selected} label={step.label} />
      : <Strand letters={letters} reading={ran ? reading : null} shownWords={words} label={step.label} />;
  } else if (op.do === 'change') {
    const fx = outcome.effect!;
    const marks = changeMarks(op.change);
    const words = ran ? Math.ceil(t * fx.after.words.length) : 0;
    stage = <>
      <Strand letters={letters} reading={fx.before} marks={marks.before} label={`${step.label}, as it was`} />
      <p className="seqlab__change">{changeWords(op.change, step.letters, step.kind)}</p>
      {ran && !playing && <Strand letters={show(fx.letters, step.kind)} reading={fx.after} shownWords={words} marks={marks.after} changed={finished ? changedWords(fx.before, fx.after) : undefined} label="After the change" />}
      {playing && playReading && <Strand letters={show(edited, step.kind)} reading={playReading} changed={changedWords(fx.before, playReading)} onTap={setSelected} selected={selected} label="After the change" />}
    </>;
  } else {
    stage = <Aligned rows={(outcome.rows ?? []).map(r => ({ ...r, letters: show(r.letters, step.kind) }))} group={op.group ?? 10} marked={finished} />;
  }

  const readout = (() => {
    if (!finished) return null;
    if (op.do === 'transcribe') return null;
    // One pair a line: six pairs as one run-on line are unreadable on a phone.
    if (op.do === 'compare') return <ul className="seqlab__pairs">{outcome.table!.map(r => <li key={`${r.a}|${r.b}`}>{capFirst(labelOf(step, r.a))} and {labelOf(step, r.b)}: <b>{r.d}</b> {r.d === 1 ? 'difference' : 'differences'}</li>)}</ul>;
    const r = playReading ?? outcome.reading!;
    const fx = op.do === 'change' && !edits.length ? outcome.effect!.effect : null;
    return <p className="seqlab__readout">{r.chain ? chainWords(r.chain) : 'No chain'}{r.chain ? ` · ${r.chain.length} amino acid${r.chain.length === 1 ? '' : 's'}` : ''}{r.stop ? '' : r.start >= 0 ? ' · no stop codon yet' : ''}{fx ? <> · <b>{EFFECT_WORDS[fx]}</b></> : null}</p>;
  })();

  const alphabet = BASES[step.kind];
  const editedLetters = show(edited, step.kind);
  return (
    <div className="seqlab__step" data-seq-step={step.id}>
      <h3 className="seqlab__title">{step.title}</h3>
      <div className="seqlab__stage">
        {stage}
        {readout}
        {playing && selected !== null && (
          <div className="seqlab__picker" role="group" aria-label={`Change letter ${selected + 1}`}>
            <span>Letter {selected + 1} · {editedLetters[selected]}</span>
            {[...alphabet].filter(b => b !== editedLetters[selected]).map(b => <button key={b} type="button" onClick={() => edit({ kind: 'sub', at: selected + 1, to: b })} data-seq-to={b}>{b}</button>)}
            <button type="button" className="is-text" onClick={() => edit({ kind: 'del', at: selected + 1, count: 1 })}>Remove</button>
            <button type="button" className="is-text" onClick={() => edit({ kind: 'ins', at: selected + 1, letters: editedLetters[selected] })}>Double it</button>
          </div>
        )}
        {playing && edits.length > 0 && <button type="button" className="seqlab__reset" onClick={() => { setEdits([]); setSelected(null); }}>Put it back</button>}
        {table && (op.do === 'translate' || op.do === 'change') && <CodonTable kind={step.kind} />}
      </div>

      <div className="question">
        <p className="question__prompt">{ask.prompt}</p>
        <Choices choices={ask.choices} value={pick} onPick={setPick} locked={committed} answer={finished ? ask.answer : null} />
        {pick && !committed && <Confident onCommit={commit} />}
      </div>

      {committed && !ran && <button type="button" className="seqlab__go" onClick={() => setRan(true)} data-action="seq-run">{step.action}</button>}

      {finished && (
        <Verdict correct={chosen ? chosen.id === ask.answer : null} title={chosen ? `You said “${chosen.label}”` : undefined}>
          {chosen?.feedback && chosen.id !== ask.answer && <p className="feedback">{chosen.feedback}</p>}
          <p>{ask.explain}</p>
        </Verdict>
      )}
    </div>
  );
}

function labelOf(step: LabStep, id: string): string {
  if (step.op.do !== 'compare') return id;
  return id === step.op.first ? step.label : step.op.with.find(s => s.id === id)?.label ?? id;
}

export function SequenceLab({ beat }: { beat: SimBeat }) {
  const { done } = useBeat();
  const p = beat.params as unknown as Params;
  const [finished, setFinished] = useState(0);
  // A step opens once the one before it has run.
  const open = p.steps.slice(0, finished + 1);
  useEffect(() => { if (finished >= p.steps.length) done(); }, [finished, p.steps.length, done]);
  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="seqlab">
        {open.map((step, i) => <StepPanel key={step.id} step={step} table={p.table !== false} onDone={() => setFinished(f => Math.max(f, i + 1))} />)}
        {p.reveal && finished >= p.steps.length && <TreeFigure reveal={p.reveal} />}
      </div>
    </section>
  );
}
