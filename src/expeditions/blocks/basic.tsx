import { useEffect, useRef, useState } from 'react';
import type { Confidence, CoverBeat, FootageBeat, PredictBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Diagram } from './Diagram';
import { Choices, Confident, Credit, Verdict } from './ui';

export function Cover({ beat }: { beat: CoverBeat }) {
  const { media, done, pack } = useBeat();
  const m = media(beat.media);
  const [fx, fy] = beat.focus ?? [50, 50];
  useEffect(() => { done(); }, [done]);
  return (
    <section className={`cover${m.tone === 'ink' ? ' cover--ink' : ''}`}>
      <img src={m.src} alt={m.alt} style={{ objectPosition: `${fx}% ${fy}%` }} />
      <div className="cover__text">
        <h1>{beat.title}</h1>
        <p className="cover__hook">{beat.hook}</p>
        <p className="cover__meta">About {pack.minutes} minutes</p>
        {beat.note && <p className="cover__meta cover__note">{beat.note}</p>}
      </div>
      <div className="cover__credit"><Credit media={beat.media} /></div>
    </section>
  );
}

export function Predict({ beat }: { beat: PredictBeat }) {
  const { record, evidenceFor, done, media } = useBeat();
  const prior = evidenceFor(beat.gradeId);
  const [picks, setPicks] = useState<Record<string, string>>(prior?.parts ?? {});
  const locked = !!prior;
  const complete = beat.parts.every(p => picks[p.id]);
  const correct = beat.parts.every(p => picks[p.id] === p.answer);
  // With an explanation the key is shown at once; without one, a footage beat reveals it later.
  const reveal = locked && !!beat.explain;
  const commit = (confidence: Confidence) => {
    record({
      gradeId: beat.gradeId, transfer: !!beat.transfer, confidence, prompt: beat.prompt, parts: picks, correct,
      chosen: beat.parts.map(p => `${p.label}: ${p.choices.find(c => c.id === picks[p.id])?.label}`).join(' · '),
    });
    done();
  };
  const misses = beat.parts.flatMap(p => {
    const c = p.choices.find(x => x.id === picks[p.id]);
    return c && c.id !== p.answer && c.feedback ? [c.feedback] : [];
  });
  const m = beat.media ? media(beat.media) : null;
  return (
    <section className="beat">
      <h2 className="lede">{beat.prompt}</h2>
      {m && beat.media && <figure className={`figure${m.backdrop ? ' figure--paper' : ''}`}><img src={m.src} alt={m.alt} /><Credit media={beat.media} /></figure>}
      {beat.diagram && <Diagram spec={beat.diagram} revealed={reveal} />}
      {beat.parts.map(part => (
        <div className="part" key={part.id}>
          {part.label && <h3>{part.label}</h3>}
          <Choices columns={part.choices.every(c => c.label.length <= 28)} choices={part.choices} value={picks[part.id] ?? null} locked={locked}
            answer={reveal ? part.answer : null} onPick={id => setPicks(p => ({ ...p, [part.id]: id }))} />
        </div>
      ))}
      {complete && !locked && <Confident onCommit={commit} />}
      {locked && !beat.explain && <Verdict correct={null}>Hold that thought. The footage decides.</Verdict>}
      {reveal && (
        <Verdict correct={correct}>
          {misses.map(f => <p key={f} className="feedback">{f}</p>)}
          <p>{beat.explain}</p>
        </Verdict>
      )}
    </section>
  );
}

export function Footage({ beat }: { beat: FootageBeat }) {
  const { media, done, evidenceFor, pack } = useBeat();
  const m = media(beat.media);
  const video = useRef<HTMLVideoElement>(null);
  const [watched, setWatched] = useState(false);
  const [failed, setFailed] = useState(false);
  const finish = () => { setWatched(true); done(); };
  const reveal = beat.reveal;
  const prior = reveal ? evidenceFor(reveal.predictGrade) : undefined;
  const predict = reveal ? pack.beats.find(b => b.kind === 'predict' && b.gradeId === reveal.predictGrade) as PredictBeat | undefined : undefined;
  const part = reveal ? predict?.parts.find(p => p.id === reveal.part) : undefined;
  const said = reveal ? part?.choices.find(c => c.id === prior?.parts?.[reveal.part]) : undefined;
  const poster = beat.poster ? media(beat.poster).src : undefined;
  // A browser can claim a format and then fail to decode it (iOS Safari and VP9 WebM). That error
  // lands on the video, not the source, and the browser never moves on by itself: drop the source
  // that failed and try the next one, and only show the still once every source has failed.
  const all = m.sources?.length ? m.sources : [{ src: m.src, type: '' }];
  const [dead, setDead] = useState<string[]>([]);
  const live = all.filter(s => !dead.includes(s.src));
  useEffect(() => { if (dead.length) video.current?.load(); }, [dead]);
  const fail = (src: string) => {
    const left = live.filter(s => s.src !== src && !src.endsWith(s.src));
    if (!src || !left.length) { setFailed(true); finish(); }
    else if (left.length < live.length) setDead(d => [...d, ...live.filter(s => !left.includes(s)).map(s => s.src)]);
  };
  return (
    <section className="beat beat--wide">
      <div className="footage">
        {failed ? (
          poster ? <img src={poster} alt={m.alt} /> : <p className="footage__failed">This clip will not play here. <a href={m.page} target="_blank" rel="noreferrer">Watch it on Wikimedia Commons</a>.</p>
        ) : (
          <video ref={video} controls playsInline preload="metadata" poster={poster}
            onTimeUpdate={e => { const v = e.currentTarget; if (!watched && v.duration && v.currentTime / v.duration > 0.8) finish(); }}
            onEnded={finish} onError={e => fail(e.currentTarget.currentSrc)}>
            {live.map(s => <source key={s.src} src={s.src} type={s.type || undefined} onError={() => fail(s.src)} />)}
          </video>
        )}
      </div>
      <div className="footage__caption">
        <p>{beat.caption}</p>
        <Credit media={beat.media} />
      </div>
      {!watched && <button type="button" className="text-button" onClick={finish}>I’ve seen it</button>}
      {watched && part && reveal && (
        <Verdict correct={said ? said.id === part.answer : null} title={said ? `You said “${said.label}”` : 'The result'}>
          {reveal.text}
        </Verdict>
      )}
    </section>
  );
}
