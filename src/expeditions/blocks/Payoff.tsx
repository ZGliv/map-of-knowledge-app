import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PayoffBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { summarize, type Evidence, type Level, type Summary } from '../engine/evidence';
import { CaseView } from '../../cases/CaseView';
import { nextLine } from '../../cases/nextLine';
import { StuckLine } from '../../notebook/StuckLine';
import { Patch } from './Patch';
import { revealPatch } from './revealPatch';

const longDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const capped = (level: Level): Level => level === 'Understood' ? 'Familiar' : level;

/**
 * The expedition's end. Where the place has new cases, the last beat is one: the learner makes a
 * call in a situation the expedition never showed, runs it, and the map lights right here when the
 * call holds. The case decides Understood; the expedition's own answers can reach Familiar.
 */
export function Payoff({ beat, evidence }: { beat: PayoffBeat; evidence: Evidence[] }) {
  const { pack, done, open, openPlace, finish, check, keepStuck, newCase } = useBeat();
  const summary = useMemo(() => summarize(pack, evidence), [pack, evidence]);
  const [settled, setSettled] = useState<boolean | null>(null);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [lit, setLit] = useState(false);
  const reported = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const report = useCallback((s: Summary) => { if (!reported.current && evidence.length) { reported.current = true; finish(s); } }, [finish, evidence.length]);
  const reportRef = useRef(report);
  reportRef.current = report;

  // Without a case the run is reported as the payoff first shows; with one, when the case settles
  // (or, if the learner leaves first, as it closes, short of Understood).
  useEffect(() => { if (!newCase) report(summary); }, [newCase, report, summary]);
  const latest = useRef(summary);
  latest.current = summary;
  // Checked a tick later, so React's development double mount (unmount, then mount again) never reports.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.setTimeout(() => { if (!mounted.current && newCase) reportRef.current({ ...latest.current, level: capped(latest.current.level) }); }, 0);
    };
  }, [newCase]);

  // With a case, the way on opens once it has run: until then the run button is the only call to act.
  useEffect(() => { if (!newCase || settled !== null) done(); }, [done, newCase, settled]);
  const showEnd = !newCase || settled !== null;
  // The case itself scrolls its outcome into view when it settles; the patch follows below it.
  useEffect(() => {
    if (!showEnd) return;
    const id = window.setTimeout(() => setLit(true), 250);
    return () => window.clearTimeout(id);
  }, [showEnd]);
  // After a right call, once the case's own scroll has finished, the patch it lit is lifted clear of
  // the Continue bar, but only as far as it needs: a long outcome and reveal can push it under the bar.
  useEffect(() => settled ? revealPatch(end.current) : undefined, [settled]);

  const onSettled = useCallback((success: boolean) => {
    setSettled(success);
    report({ ...summary, level: success ? 'Understood' : capped(summary.level) });
    // Read from the record the call was just written to: the refresh ladder after a right call, a
    // couple of days after a miss, and no date at all once nothing is left to play.
    setNextAt(newCase?.nextAt?.() ?? null);
  }, [report, summary, newCase]);

  const level: Level = newCase ? (settled ? 'Understood' : capped(summary.level)) : summary.level;
  const fill = level === 'Understood' || check?.lit ? 1 : level === 'Familiar' ? 0.5 : 0.18;
  // Places without cases keep the question bank, offered quietly.
  const offer = !newCase && check?.status.kind === 'ready' && !(check.status.purpose === 'prove' && summary.level === 'Understood') ? check : null;

  return (
    <section className={`beat payoff${newCase ? ' payoff--case' : ''}`}>
      {newCase && <CaseView c={newCase.case} onCommit={newCase.play} onSettled={onSettled} />}
      {showEnd && <div ref={end} className="payoff__end" data-payoff-level={level}>
        <Patch label={pack.path.at(-1) ?? ''} fill={lit ? fill : 0} />
        <p className="payoff__place">{pack.path.join('  ›  ')}</p>
        <h2 className="payoff__idea">{beat.idea}</h2>
        {keepStuck && evidence.length > 0 && <StuckLine onKeep={keepStuck} />}
        {nextAt && <p className="payoff__note" data-payoff-next={settled ? 'lasting' : 'retry'}>{nextLine(!!settled, !newCase?.last, longDate(nextAt))}</p>}
        {offer && (
          <ul className="connections payoff__check">
            <li>
              <div><b>{offer.status.kind === 'ready' && offer.status.purpose !== 'prove' ? 'Try it fresh again' : 'Try it fresh'}</b><span>New problems · 2 min</span></div>
              <button type="button" onClick={offer.open} data-action="payoff-check">Begin</button>
            </li>
          </ul>
        )}

        <h3 className="payoff__next">Nearby on the map</h3>
        <ul className="connections">
          {beat.connections.map(conn => (
            <li key={conn.title}>
              <div><b>{conn.title}</b><span>{conn.place}</span></div>
              {conn.to ? <button type="button" onClick={() => open(conn.to!)}>Go</button>
                : conn.node ? <button type="button" onClick={() => openPlace(conn.node!)}>Visit</button>
                  : <span className="connections__dim">Unexplored</span>}
            </li>
          ))}
        </ul>
      </div>}
    </section>
  );
}
