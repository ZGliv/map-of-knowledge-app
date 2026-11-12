import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { catalog } from '../core/catalog';
import { EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import { bankFor } from '../checks/banks';
import type { CaseEvent, CheckEvent, CheckLedger } from '../checks/ledger';
import { checkStatus, nextCaseAt, nextCaseOf, nodeProgress } from '../checks/progress';
import { newId } from '../checks/session';
import type { ExpeditionLedger } from '../expeditions/ledger';
import { expeditionAt } from '../expeditions/registry';
import { Patch } from '../expeditions/blocks/Patch';
import { revealPatch } from '../expeditions/blocks/revealPatch';
import { StuckLine } from '../notebook/StuckLine';
import { CaseView } from './CaseView';
import { nextCase } from '.';
import { nextLine } from './nextLine';
import type { CaseAnswer } from './types';
import '../expeditions/expedition.css';

const longDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

export interface MissionScreenProps {
  nodeId: string;
  exp: ExpeditionLedger;
  checks: CheckLedger;
  now: number;
  exitLabel: string;
  onRecord: (events: CheckEvent[]) => void;
  onExit: () => void;
  /** The question bank for this place, for anyone who would rather do it in words. */
  onWords?: () => void;
  onStuck?: (mission: { session: string; nodeId: string; line: string }) => string | null;
}

/** What the place claims, from its territory or its bank. */
function claimOf(nodeId: string): string | undefined {
  return EVOLUTION_TERRITORIES.find(t => evolutionTerritoryId(t.key) === nodeId)?.claim ?? bankFor(nodeId)?.claim;
}

/**
 * A field mission: one new case, played on its own from a place's hub. It lights a place the
 * learner skipped, retries after a miss, or (a week after the place lit) makes it Lasting.
 */
export function MissionScreen({ nodeId, exp, checks, now, exitLabel, onRecord, onExit, onWords, onStuck }: MissionScreenProps) {
  const node = catalog.get(nodeId);
  const name = node?.name ?? '';
  // Fixed when the screen opens: playing writes to the record, which must not swap the case.
  const [start] = useState(() => ({ status: checkStatus(nodeId, exp, checks, now), c: nextCase(nodeId, checks), litBefore: !!nodeProgress(nodeId, exp, checks).understoodAt }));
  const [session] = useState(newId);
  const [settled, setSettled] = useState<boolean | null>(null);
  const [lit, setLit] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const { status, c, litBefore } = start;
  const playable = status.kind === 'ready' && status.via === 'case' && !!c;
  const lasting = status.kind === 'ready' && status.purpose === 'lasting';
  const refresh = status.kind === 'ready' && status.purpose === 'refresh';
  // The glow before this case (checks/freshness.ts).
  const [glowBefore] = useState(() => nodeProgress(nodeId, exp, checks, undefined, now).freshness?.glow ?? 0);
  const hue = expeditionAt(nodeId)?.pack.hue;

  useEffect(() => {
    const previous = document.title;
    const opener = document.activeElement as HTMLElement | null;
    document.title = `${name} · Map of Knowledge`;
    shell.current?.focus({ preventScroll: true });
    return () => { document.title = previous; opener?.focus?.({ preventScroll: true }); };
  }, [name]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onExit]);

  const commit = useCallback((answer: CaseAnswer, success: boolean, ms: number) => {
    if (!c) return;
    const event: CaseEvent = { t: 'case', id: newId(), session, node: nodeId, case: c.id, answer, success, via: 'mission', ms: Math.round(ms), at: new Date().toISOString() };
    onRecord([event]);
  }, [c, session, nodeId, onRecord]);
  const onSettled = useCallback((success: boolean) => setSettled(success), []);
  // The case scrolls its own outcome into view when it settles; the patch follows below it.
  useEffect(() => {
    if (settled === null) return;
    const id = window.setTimeout(() => setLit(true), 250);
    return () => window.clearTimeout(id);
  }, [settled]);
  // A right call lights the patch: lift it into view if the outcome pushed it below the screen.
  useEffect(() => settled ? revealPatch(end.current) : undefined, [settled]);

  const fill = settled || litBefore ? 1 : 0.18;
  // Once the call is on the record: the day the next case opens (on the refresh ladder after a right
  // call, a couple of days after a miss), or nothing when no case or question is left.
  const nextAt = settled === null ? null : nextCaseAt(nodeId, exp, checks, now);
  // After the place's last case, what opens next is a check in words, not another case.
  const caseLeft = !!nextCase(nodeId, checks);
  const opens = nextCaseOf(status);
  const opensLine = opens ? `Your next new case opens ${longDate(Date.parse(opens))}.` : '';
  const waitingLine = status.kind === 'lasting' ? `Lasting since ${shortDate(status.at)}.${opensLine ? ` ${opensLine}` : ''}`
    : opensLine || 'Every case written for this place so far has been played.';
  const phase = !playable ? status.kind : settled === null ? 'playing' : settled ? (lasting ? 'lasting' : refresh ? 'refreshed' : 'lit') : 'missed';
  // The glow re-lights on a right call; a miss leaves it (and the color) exactly as it was.
  const glow = lit && settled ? 1 : glowBefore;

  return createPortal(
    <div ref={shell} className="expedition-shell mission-shell" role="dialog" aria-modal="true" aria-label={name} tabIndex={-1} style={hue !== undefined ? { ['--hue' as string]: hue } : undefined} data-mission-node={nodeId} data-mission-phase={phase}>
      <div className="player hued mission" style={hue !== undefined ? { ['--hue' as string]: hue } : undefined}>
        <header className="player__bar">
          <button type="button" className="icon" aria-label={`Back to ${exitLabel}`} onClick={onExit} data-action="mission-close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <p className="player__path"><span className="player__here">{name}</span></p>
          <span />
        </header>
        <main className="beat mission__body">
          {playable ? <CaseView c={c!} onCommit={commit} onSettled={onSettled} layout="mission" /> : (
            <div className="mission__end">
              <Patch label={name} fill={litBefore ? 1 : 0.18} core={status.kind === 'lasting'} glow={litBefore ? glowBefore : undefined} />
              <h1 className="mission__name">{name}</h1>
              <p className="payoff__note">{waitingLine}</p>
            </div>
          )}
          {playable && settled !== null && (
            <div ref={end} className="mission__end" data-mission-result={phase}>
              <Patch label={name} fill={lit ? fill : litBefore ? 1 : 0} core={(lit && !!settled && lasting) || refresh} glow={litBefore || (lit && settled) ? glow : undefined} />
              <h1 className="mission__name">{name}</h1>
              {claimOf(nodeId) && <p className="mission__claim">{claimOf(nodeId)}</p>}
              {settled && onStuck && <StuckLine onKeep={line => onStuck({ session, nodeId, line })} />}
              {nextAt && <p className="payoff__note">{nextLine(!!settled, caseLeft, longDate(nextAt))}</p>}
            </div>
          )}
          <p className="mission__foot">
            <button type="button" className="text-button" onClick={onExit} data-action="mission-done">Back to {exitLabel}</button>
            {onWords && settled === null && <button type="button" className="text-button" onClick={onWords} data-action="mission-words">Try it in words</button>}
          </p>
        </main>
      </div>
    </div>,
    document.body,
  );
}
