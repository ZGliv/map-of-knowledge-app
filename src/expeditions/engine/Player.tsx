import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Beat, Pack } from '../content/types';
import { Cover, Footage, Predict } from '../blocks/basic';
import { Dialogue } from '../blocks/Dialogue';
import { Documentary } from '../blocks/Documentary';
import { Flaw, Match, NumberIn, Order, Spot } from '../blocks/exercises';
import { Payoff } from '../blocks/Payoff';
import { Source } from '../blocks/Source';
import { SimRenderer } from '../sims/SimRenderer';
import { stopAll } from './audio';
import { BeatContext, type BeatApi, type NewCase, type PayoffCheck } from './context';
import type { Evidence, Summary } from './evidence';

function render(beat: Beat, evidence: Evidence[]) {
  switch (beat.kind) {
    case 'cover': return <Cover beat={beat} />;
    case 'predict': return <Predict beat={beat} />;
    case 'footage': return <Footage beat={beat} />;
    case 'documentary': return <Documentary beat={beat} />;
    case 'dialogue': return <Dialogue beat={beat} />;
    case 'source': return <Source beat={beat} />;
    case 'order': return <Order beat={beat} />;
    case 'match': return <Match beat={beat} />;
    case 'spot': return <Spot beat={beat} />;
    case 'flaw': return <Flaw beat={beat} />;
    case 'number': return <NumberIn beat={beat} />;
    case 'payoff': return <Payoff beat={beat} evidence={evidence} />;
    case 'sim': return <SimRenderer beat={beat} />;
  }
}

export interface PlayerProps {
  pack: Pack;
  start?: number;
  /** Where Back and the last button return to, e.g. "Evolution". */
  exitLabel: string;
  /** Grades answered in an earlier session. Their answers were revealed, so they count as assisted. */
  seenBefore: ReadonlySet<string>;
  onExit: () => void;
  onOpen: (packId: string) => void;
  onOpenPlace: (nodeId: string) => void;
  onAnswer: (gradeId: string) => void;
  onFinish: (summary: Summary) => void;
  /** The node's "Prove it" check, offered on the payoff. */
  check?: PayoffCheck;
  /** The new case that ends the run, when the place has one left. */
  newCase?: NewCase;
  keepStuck?: (line: string) => string | null;
}

/** The lesson's raw data, for authors reviewing a pack: only on the dev server or with ?data in the address. */
const SHOW_DATA = import.meta.env.DEV || (() => { try { return new URLSearchParams(globalThis.location?.search ?? '').has('data'); } catch { return false; } })();

export function Player({ pack, start = 0, exitLabel, seenBefore, onExit, onOpen, onOpenPlace, onAnswer, onFinish, check, newCase, keepStuck }: PlayerProps) {
  // #/expedition/<id>/3 opens beat 3 directly, for reviewing one screen at a time.
  const [index, setIndex] = useState(Math.min(start, pack.beats.length - 1));
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [finished, setFinished] = useState<Set<number>>(new Set());
  const [data, setData] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const beat = pack.beats[index];
  const last = index === pack.beats.length - 1;
  const ready = finished.has(index);

  const done = useCallback(() => setFinished(s => s.has(index) ? s : new Set(s).add(index)), [index]);
  const record = useCallback<BeatApi['record']>(e => {
    // The first answer is the evidence. Later attempts never overwrite it, and a
    // grade whose answer was revealed in an earlier session cannot count as unaided.
    setEvidence(list => list.some(x => x.gradeId === e.gradeId) ? list : [...list, { ...e, assisted: (e.assisted ?? false) || seenBefore.has(e.gradeId), at: Date.now() }]);
    onAnswer(e.gradeId);
  }, [seenBefore, onAnswer]);
  const api = useMemo<BeatApi>(() => ({
    pack, done, record, open: onOpen, openPlace: onOpenPlace, finish: onFinish, check, newCase, keepStuck,
    media: id => { const m = pack.media[id]; if (!m) throw new Error(`Missing media ${id}`); return m; },
    evidenceFor: id => evidence.find(e => e.gradeId === id),
  }), [pack, done, record, onOpen, onOpenPlace, onFinish, check, newCase, keepStuck, evidence]);

  const go = useCallback((next: number) => {
    stopAll();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIndex(Math.max(0, Math.min(pack.beats.length - 1, next)));
    top.current?.closest('.expedition-shell')?.scrollTo({ top: 0 });
  }, [pack.beats.length]);
  const advance = useCallback(() => { if (!ready) return; if (last) onExit(); else go(index + 1); }, [ready, last, onExit, go, index]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
      if (e.key === 'Escape') { if (data) setData(false); else onExit(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [advance, go, index, onExit, data]);
  useEffect(() => () => stopAll(), []);

  return (
    <div className={`player hued player--${beat.kind}`} style={{ ['--hue' as string]: pack.hue }} ref={top} data-pack={pack.id} data-beat={index}>
      <header className="player__bar">
        <button type="button" className="icon" aria-label={`Back to ${exitLabel}`} onClick={onExit} data-action="expedition-exit">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <p className="player__path">{pack.path.slice(1).map((name, i, all) => i === all.length - 1
          ? <span key={i} className="player__here">{name}</span>
          : <span key={i} style={{ order: all.length - 1 - i }}>{name}<span className="player__sep">›</span></span>)}</p>
        {SHOW_DATA && <button type="button" className="text-button player__data" aria-pressed={data} onClick={() => setData(v => !v)}>Data</button>}
      </header>
      <div className="progress" aria-hidden="true">
        {pack.beats.map((b, i) => <i key={i} className={i < index ? 'is-done' : i === index ? 'is-now' : ''} title={b.kind} />)}
      </div>

      <main className="player__scene" key={index}>
        <BeatContext.Provider value={api}>{render(beat, evidence)}</BeatContext.Provider>
      </main>

      <footer className="player__foot">
        {index > 0 && <button type="button" className="text-button" onClick={() => go(index - 1)}>Back</button>}
        <button type="button" className="continue" disabled={!ready} onClick={advance} data-action="expedition-continue">
          {index === 0 ? 'Begin' : last ? `Back to ${exitLabel}` : 'Continue'}
        </button>
      </footer>

      {data && (
        <aside className="data" aria-label="This screen as data">
          <header>
            <b>This screen is data</b>
            <span>beat {index + 1} of {pack.beats.length} · kind “{beat.kind}”</span>
            <button type="button" className="icon" aria-label="Close" onClick={() => setData(false)}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </header>
          <pre>{JSON.stringify(beat, null, 2)}</pre>
          {evidence.length > 0 && (<>
            <b className="data__sub">Evidence so far</b>
            <pre>{JSON.stringify(evidence.map(({ gradeId, correct, confidence, assisted, transfer }) => ({ gradeId, correct, confidence, assisted, transfer })), null, 2)}</pre>
          </>)}
        </aside>
      )}
    </div>
  );
}
