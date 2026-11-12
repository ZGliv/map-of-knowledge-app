import { useMemo, useState } from 'react';
import type { Confidence, FlawBeat, MatchBeat, NumberBeat, OrderBeat, SoundSpec, SpotBeat } from '../content/types';
import { playInterval } from '../engine/audio';
import { useBeat } from '../engine/context';
import { isClose, makeVariant } from '../engine/variants';
import { NumberFigure } from './NumberFigure';
import { Confident, Credit, PlayButton, Verdict } from './ui';

const sound = (s?: SoundSpec) => s && (() => playInterval(s.base, s.ratio));

/** A stable shuffle keyed by the grade, never equal to the answer: packs list items in
 * answer order, so showing them as authored would let tapping top to bottom pass. */
export function scrambled<T extends { id: string }>(items: T[], answer: string[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const next = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  if (out.length > 1 && out.every((item, i) => item.id === answer[i])) out.push(out.shift()!);
  return out;
}

export function Order({ beat }: { beat: OrderBeat }) {
  const { record, done, evidenceFor } = useBeat();
  const prior = evidenceFor(beat.gradeId);
  const [seq, setSeq] = useState<string[]>(prior?.parts?.seq ? prior.parts.seq.split('|') : []);
  const [locked, setLocked] = useState(!!prior);
  const shuffled = useMemo(() => scrambled(beat.items, beat.answer, beat.gradeId), [beat]);
  const pool = shuffled.filter(i => !seq.includes(i.id));
  const label = (id: string) => beat.items.find(i => i.id === id)!;
  const correct = seq.join() === beat.answer.join();
  const commit = (confidence: Confidence) => {
    record({ gradeId: beat.gradeId, transfer: !!beat.transfer, correct, confidence, prompt: beat.prompt,
      parts: { seq: seq.join('|') }, chosen: seq.map(id => label(id).label).join(' → ') });
    setLocked(true); done();
  };
  const row = (id: string, placed: boolean, index?: number) => {
    const item = label(id);
    const play = sound(item.sound);
    const state = locked && index !== undefined ? (beat.answer[index] === id ? 'right' : 'wrong') : '';
    return (
      <li key={id} className={`order__item ${state}`}>
        {play && <PlayButton onClick={play} label="Listen" />}
        <button type="button" className="order__label" disabled={locked}
          onClick={() => setSeq(s => placed ? s.filter(x => x !== id) : [...s, id])}>
          {item.label}
        </button>
        {!locked && <span className="order__hint">{placed ? 'Remove' : 'Place next'}</span>}
      </li>
    );
  };
  const { media } = useBeat();
  const fig = beat.media ? media(beat.media) : null;
  return (
    <section className="beat">
      <h2 className="lede">{beat.prompt}</h2>
      {fig && beat.media && <figure className={`figure${fig.backdrop ? ' figure--paper' : ''}${fig.tone === 'ink' ? ' is-ink' : ''}`}><img src={fig.src} alt={fig.alt} /><Credit media={beat.media} /></figure>}
      <div className="order">
        <div className="order__slots">
          <span className="order__end">{beat.ends[0]}</span>
          <ol>{seq.map((id, i) => row(id, true, i))}{Array.from({ length: beat.items.length - seq.length }, (_, i) => <li key={`e${i}`} className="order__empty" />)}</ol>
          <span className="order__end">{beat.ends[1]}</span>
        </div>
        {pool.length > 0 && <ul className="order__pool">{pool.map(i => row(i.id, false))}</ul>}
      </div>
      {!locked && seq.length === beat.items.length && <Confident onCommit={commit} />}
      {locked && (
        <Verdict correct={correct}>
          {!correct && <p className="answer-line">Expected: {beat.answer.map(id => label(id).label).join(' → ')}</p>}
          <p>{beat.explain}</p>
        </Verdict>
      )}
    </section>
  );
}

export function Match({ beat }: { beat: MatchBeat }) {
  const { record, done, evidenceFor } = useBeat();
  const prior = evidenceFor(beat.gradeId);
  const [pairs, setPairs] = useState<Record<string, string>>(prior?.parts ?? {});
  const [locked, setLocked] = useState(!!prior);
  const complete = beat.left.every(l => pairs[l.id]);
  const correct = beat.left.every(l => pairs[l.id] === beat.pairs[l.id]);
  // One-to-one by default; with buckets, several items can share a label.
  const assign = (left: string, right: string) => setPairs(p => {
    const next = beat.buckets ? p : Object.fromEntries(Object.entries(p).filter(([, r]) => r !== right));
    return { ...next, [left]: right };
  });
  const { media } = useBeat();
  const fig = beat.media ? media(beat.media) : null;
  const commit = (confidence: Confidence) => {
    record({ gradeId: beat.gradeId, transfer: !!beat.transfer, correct, confidence, prompt: beat.prompt, parts: pairs,
      chosen: beat.left.map(l => `${l.label} → ${beat.right.find(r => r.id === pairs[l.id])?.label}`).join(' · ') });
    setLocked(true); done();
  };
  return (
    <section className="beat">
      <h2 className="lede">{beat.prompt}</h2>
      {fig && beat.media && <figure className={`figure${fig.backdrop ? ' figure--paper' : ''}`}><img src={fig.src} alt={fig.alt} /><Credit media={beat.media} /></figure>}
      <ul className={`match${beat.buckets ? ' match--buckets' : ''}`}>
        {beat.left.map(l => {
          const play = sound(l.sound);
          return (
            <li key={l.id} className={locked ? (pairs[l.id] === beat.pairs[l.id] ? 'right' : 'wrong') : ''}>
              <div className="match__left">{play && <PlayButton onClick={play} label="Listen" />}<span>{l.label}</span></div>
              <div className="match__right" role="radiogroup" aria-label={`Answer for ${l.label}`}>
                {beat.right.map(r => (
                  <button key={r.id} type="button" role="radio" aria-checked={pairs[l.id] === r.id} disabled={locked}
                    className={`chip${pairs[l.id] === r.id ? ' is-on' : ''}${locked && beat.pairs[l.id] === r.id ? ' is-answer' : ''}${locked && pairs[l.id] === r.id && beat.pairs[l.id] !== r.id ? ' is-miss' : ''}`}
                    onClick={() => assign(l.id, r.id)}>{r.label}</button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {!locked && complete && <Confident onCommit={commit} />}
      {locked && <Verdict correct={correct}>{beat.explain}</Verdict>}
    </section>
  );
}

export function Spot({ beat }: { beat: SpotBeat }) {
  const { record, done, evidenceFor, media } = useBeat();
  const prior = evidenceFor(beat.gradeId);
  const [pick, setPick] = useState<string | null>(prior?.parts?.pick ?? null);
  const [locked, setLocked] = useState(!!prior);
  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: beat.gradeId, transfer: !!beat.transfer, correct: pick === beat.answer, confidence, prompt: beat.prompt,
      parts: { pick }, chosen: beat.options.find(o => o.id === pick)!.label });
    setLocked(true); done();
  };
  const { from, to, band } = beat.timeline;
  const pos = (year: number) => `${((year - from) / (to - from)) * 100}%`;
  return (
    <section className="beat beat--wide">
      <h2 className="lede">{beat.prompt}</h2>
      <div className="spot">
        {beat.options.map(o => {
          const m = media(o.media);
          const state = locked ? (o.id === beat.answer ? 'right' : o.id === pick ? 'wrong' : '') : pick === o.id ? 'picked' : '';
          return (
            <button key={o.id} type="button" className={`spot__card ${state}`} disabled={locked} onClick={() => setPick(o.id)} aria-pressed={pick === o.id}>
              <img src={m.src} alt={m.alt} style={o.focus ? { objectPosition: `${o.focus[0]}% ${o.focus[1]}%` } : undefined} />
              <span className="spot__label">{o.label}</span>
              {locked && <span className="spot__year">{o.yearLabel ?? m.date}</span>}
            </button>
          );
        })}
      </div>
      {!locked && pick && <Confident onCommit={commit} />}
      {locked && (
        <>
          <div className="timeline" aria-label={`Timeline ${from} to ${to}`}>
            <div className="timeline__band" style={{ left: pos(band[0]), width: `calc(${pos(band[1])} - ${pos(band[0])})` }}><span>{band[2]}</span></div>
            {beat.options.map(o => (
              <div key={o.id} className={`timeline__mark${o.id === beat.answer ? ' is-answer' : ''}`} style={{ left: pos(o.year) }}>
                <img src={media(o.media).src} alt="" /><span>{o.year}</span>
              </div>
            ))}
            <span className="timeline__tick" style={{ left: 0 }}>{from}</span>
            <span className="timeline__tick" style={{ left: '100%' }}>{to}</span>
          </div>
          <Verdict correct={pick === beat.answer}>{beat.explain}</Verdict>
          <div className="spot__credits">{beat.options.map(o => <Credit key={o.id} media={o.media} />)}</div>
        </>
      )}
    </section>
  );
}

export function Flaw({ beat }: { beat: FlawBeat }) {
  const { record, done, evidenceFor } = useBeat();
  const prior = evidenceFor(beat.gradeId);
  const [pick, setPick] = useState<string | null>(prior?.parts?.pick ?? null);
  const [locked, setLocked] = useState(!!prior);
  const commit = (confidence: Confidence) => {
    if (!pick) return;
    record({ gradeId: beat.gradeId, transfer: !!beat.transfer, correct: pick === beat.answer, confidence, prompt: beat.prompt,
      parts: { pick }, chosen: beat.steps.find(s => s.id === pick)!.text });
    setLocked(true); done();
  };
  return (
    <section className="beat">
      <h2 className="lede">{beat.prompt}</h2>
      <ol className="flaw">
        {beat.steps.map(s => {
          const state = locked ? (s.id === beat.answer ? 'broken' : s.id === pick ? 'wrong' : 'holds') : pick === s.id ? 'picked' : '';
          return (
            <li key={s.id}>
              <button type="button" className={`flaw__step ${state}`} disabled={locked} onClick={() => setPick(s.id)} aria-pressed={pick === s.id}>
                {s.text}
                {locked && <em>{s.id === beat.answer ? 'Doesn’t hold' : 'Holds'}</em>}
              </button>
            </li>
          );
        })}
      </ol>
      {!locked && pick && <Confident label="Is this the broken step? How sure?" onCommit={commit} />}
      {locked && <Verdict correct={pick === beat.answer}>{beat.explain}</Verdict>}
    </section>
  );
}

export function NumberIn({ beat }: { beat: NumberBeat }) {
  const { record, done } = useBeat();
  const [n, setN] = useState(0);
  const variant = useMemo(() => makeVariant(beat.generator, beat.params, n), [beat, n]);
  const [value, setValue] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'open' | 'confidence' | 'wrong' | 'right' | 'shown'>('open');
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const parsed = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(parsed);
  const shown = (x: number) => x.toFixed(variant.digits);

  const check = (c: Confidence) => {
    const ok = isClose(parsed, variant);
    const conf = confidence ?? c;
    setConfidence(conf);
    // Only the first variant's first try is evidence; later tries and fresh ones are practice.
    if (n === 0) record({ gradeId: beat.gradeId, transfer: !!beat.transfer, correct: ok, confidence: conf, assisted: tries > 0, prompt: `${variant.prompt} ${variant.ask}`, chosen: `${value} ${variant.unit}` });
    setTries(t => t + 1);
    if (ok) { setState('right'); done(); } else if (tries >= 1) { setState('shown'); done(); } else setState('wrong');
  };
  const fresh = () => { setN(x => x + 1); setValue(''); setTries(0); setState('open'); setConfidence(null); };

  const revealed = state === 'right' || state === 'shown';
  return (
    <section className="beat beat--wide">
      <div className="numwrap">
        <div>
          <h2 className="lede">{variant.prompt} {variant.ask}</h2>
          {variant.aside && <p className="aside">{variant.aside}</p>}
          {n > 0 && <p className="practice-tag">Fresh question · practice</p>}
          <form className="number" onSubmit={e => { e.preventDefault(); if (valid && state === 'open') setState('confidence'); if (valid && state === 'wrong') check(confidence ?? 'fair'); }}>
            <input inputMode="decimal" autoComplete="off" aria-label="Your answer" value={value} disabled={revealed}
              onChange={e => { setValue(e.target.value); if (state === 'confidence') setState('open'); }} placeholder="0" />
            <span>{variant.unit}</span>
            {(state === 'open' || state === 'wrong') && <button type="submit" disabled={!valid}>{state === 'wrong' ? 'Try again' : 'Check'}</button>}
          </form>
          {state === 'confidence' && <Confident onCommit={check} />}
          {state === 'wrong' && <Verdict correct={false}>{variant.hint}</Verdict>}
          {revealed && (
            <Verdict correct={state === 'right'} title={state === 'right' ? (tries > 1 ? 'Right, on the second try' : 'Right') : `It’s ${shown(variant.answer)} ${variant.unit}`}>
              <p className="working">{variant.working}</p>
              <button type="button" className="text-button" onClick={fresh}>Try a fresh one</button>
            </Verdict>
          )}
        </div>
        <NumberFigure variant={variant} guess={valid ? parsed : null} revealed={revealed} />
      </div>
    </section>
  );
}
