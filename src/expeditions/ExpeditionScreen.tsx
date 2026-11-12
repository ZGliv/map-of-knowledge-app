import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Player } from './engine/Player';
import type { NewCase, PayoffCheck } from './engine/context';
import type { Summary } from './engine/evidence';
import type { Expedition } from './registry';
import './expedition.css';

export interface ExpeditionScreenProps {
  expedition: Expedition;
  start?: number;
  /** Grades answered in earlier sessions, read once when the screen opens. */
  seen: readonly string[];
  exitLabel: string;
  onExit: () => void;
  onOpen: (packId: string) => void;
  onOpenPlace: (nodeId: string) => void;
  onAnswer: (packId: string, gradeId: string) => void;
  onFinish: (run: { id: string; packId: string; summary: Summary }) => void;
  /** The node's "Prove it" check, offered on the payoff. */
  check?: PayoffCheck;
  /** The place's next unplayed case, read once when the screen opens: it ends the run. */
  newCase?: NewCase;
  /** Keep the optional "what stuck" line for this run. Returns an error, or null. */
  onStuck?: (run: { runId: string; packId: string; line: string }) => string | null;
}

const newRunId = () => typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** The lab's player, full screen above the atlas. Its theme is scoped to .expedition-shell. */
export function ExpeditionScreen({ expedition, start, seen, exitLabel, onExit, onOpen, onOpenPlace, onAnswer, onFinish, check, newCase, onStuck }: ExpeditionScreenProps) {
  const { pack } = expedition;
  const [seenBefore] = useState(() => new Set(seen));
  const [runId] = useState(newRunId);
  // Fixed for the whole run: once played, the record moves on to the next case, but this run keeps its own.
  const [thisCase] = useState(() => newCase);
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.title;
    const opener = document.activeElement as HTMLElement | null;
    document.title = `${pack.title} · Map of Knowledge`;
    shell.current?.focus({ preventScroll: true });
    return () => { document.title = previous; opener?.focus?.({ preventScroll: true }); };
  }, [pack.title]);
  const answer = useCallback((gradeId: string) => onAnswer(pack.id, gradeId), [onAnswer, pack.id]);
  const keepStuck = useMemo(() => onStuck ? (line: string) => onStuck({ runId, packId: pack.id, line }) : undefined, [onStuck, runId, pack.id]);
  const finish = useCallback((summary: Summary) => onFinish({ id: runId, packId: pack.id, summary }), [onFinish, pack.id, runId]);
  return createPortal(
    <div ref={shell} className="expedition-shell" role="dialog" aria-modal="true" aria-label={pack.title} tabIndex={-1} style={{ ['--hue' as string]: pack.hue }} data-expedition={pack.id}>
      <Player pack={pack} start={start} exitLabel={exitLabel} seenBefore={seenBefore} onExit={onExit} onOpen={onOpen} onOpenPlace={onOpenPlace} onAnswer={answer} onFinish={finish} check={check} newCase={thisCase} keepStuck={keepStuck} />
    </div>,
    document.body,
  );
}
