import { isWithinTerritory } from '../core/explorationContext';
import type { Level } from '../expeditions/engine/evidence';
import { bestLevel, getExpeditionEarnedIds, type ExpeditionLedger } from '../expeditions/ledger';
import { EXPEDITIONS, getExpedition } from '../expeditions/registry';
import { casesFor, hasCases, judgedSuccess, nextCase } from '../cases';
import type { CaseAnswer } from '../cases/types';
import { bankFor, bankItem, preparedBanks, type BankItem } from './banks';
import { drawCheck, type DrawnItem } from './draw';
import { breakBefore, freshnessFrom, welcomeBackSet, type Freshness } from './freshness';
import { grade, misconceptionOf } from './grade';
import type { CheckAttemptEvent, CheckLedger } from './ledger';
import { CHECK_POLICY, judge, type Verdict } from './rule';

const DAY = 24 * 60 * 60 * 1000;
export type NodeLevel = Level | 'Lasting';

export interface ScoredAttempt {
  event: CheckAttemptEvent;
  entry: BankItem | undefined;
  /** Regraded from the answer key, never read from storage. */
  correct: boolean;
  /** The first time this family was ever answered. Later answers are logged, not counted. */
  counted: boolean;
}
/** A new case played: one call against a computed outcome (cases/). */
export interface PlayedCase {
  caseId: string;
  answer: CaseAnswer;
  /** Rerun from the case's seed and judged afresh, never read from storage. */
  success: boolean;
  /** The first time this case was played. A replay knows the outcome, so it never counts. */
  counted: boolean;
  via: 'expedition' | 'mission';
}
export interface CheckSession { session: string; node: string; at: string; attempts: ScoredAttempt[]; verdict: Verdict; played?: PlayedCase }

/** Every finished check, oldest first, judged afresh from the item bank. */
export function checkSessions(ledger: CheckLedger): CheckSession[] {
  const attempts = ledger.events.filter((e): e is CheckAttemptEvent => e.t === 'attempt');
  const firstSession = new Map<string, string>();
  for (const a of attempts) if (!firstSession.has(a.family)) firstSession.set(a.family, a.session);
  const bySession = new Map<string, CheckAttemptEvent[]>();
  for (const a of attempts) bySession.set(a.session, [...(bySession.get(a.session) ?? []), a]);
  const sessions: CheckSession[] = [];
  for (const finish of ledger.events) {
    if (finish.t !== 'finish') continue;
    const given = bySession.get(finish.session) ?? [];
    const scored = finish.items.map(itemId => given.find(a => a.item === itemId)).filter((a): a is CheckAttemptEvent => !!a).map((event): ScoredAttempt => {
      const entry = bankItem(event.item);
      return { event, entry, correct: entry ? grade(entry.item, event.answer, event.variant) : event.correct, counted: firstSession.get(event.family) === event.session };
    });
    const judged = scored.filter(a => a.counted && a.entry).map(a => ({
      transfer: a.entry!.transfer, guessP: a.entry!.guessP, correct: a.correct, confidence: a.event.confidence,
      misconception: misconceptionOf(a.entry!.item, a.event.answer),
    }));
    // A session is judged only when every item it showed was answered.
    const complete = scored.length === finish.items.length;
    sessions.push({ session: finish.session, node: finish.node, at: finish.at, attempts: scored, verdict: complete ? judge(judged) : { passed: false, reasons: ['too-many-missed'] } });
  }
  // New cases: each play is its own session. Only an unassisted first play of a case is proof.
  const firstPlay = new Map<string, string>();
  for (const e of ledger.events) if (e.t === 'case' && !firstPlay.has(e.case)) firstPlay.set(e.case, e.id);
  for (const e of ledger.events) {
    if (e.t !== 'case') continue;
    const success = judgedSuccess(e.case, e.answer) ?? e.success;
    const counted = firstPlay.get(e.case) === e.id;
    const passed = success && counted;
    sessions.push({ session: e.session, node: e.node, at: e.at, attempts: [], verdict: { passed, reasons: passed ? [] : ['transfer-missed'] }, played: { caseId: e.case, answer: e.answer, success, counted, via: e.via } });
  }
  return sessions.sort((a, b) => a.at.localeCompare(b.at));
}

export interface NodeProgress {
  /** When the idea was first proved, by an Understood expedition run or a passed check. */
  understoodAt: string | null;
  /** When a check passed at least 7 days after that: the first refresh (checks/freshness.ts). */
  lastingAt: string | null;
  /** The freshness glow and refresh ladder. Null until the idea is proved. Never changes the color. */
  freshness: Freshness | null;
  /** The most recent finished check for this node. */
  latest: CheckSession | null;
  level: NodeLevel | null;
}

export function nodeProgress(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, sessions = checkSessions(checks), now = Date.now()): NodeProgress {
  const mine = sessions.filter(s => s.node === nodeId);
  const expedition = [...exp.runs].filter(run => run.level === 'Understood' && getExpedition(run.packId)?.nodeId === nodeId).map(run => run.at).sort()[0] ?? null;
  const passes = mine.filter(s => s.verdict.passed).map(s => s.at);
  const firstPass = passes[0] ?? null;
  const understoodAt = [expedition, firstPass].filter((at): at is string => !!at).sort()[0] ?? null;
  const lastingAt = understoodAt
    ? mine.find(s => s.verdict.passed && Date.parse(s.at) - Date.parse(understoodAt) >= CHECK_POLICY.lastingDays * DAY)?.at ?? null
    : null;
  // The proofs on the refresh ladder: every passed check or new case, and the first Understood run
  // only when it is what lit the place. A run after a case had already lit it is not a step (a
  // replay never is either): only a case or check can make a place Lasting, so the ladder starts at
  // `understoodAt` and its first step is exactly `lastingAt`.
  const proofs = [...(expedition && (!firstPass || expedition <= firstPass) ? [expedition] : []), ...passes];
  const packLevels = [...exp.runs].filter(run => getExpedition(run.packId)?.nodeId === nodeId).map(run => bestLevel(exp, run.packId));
  const level: NodeLevel | null = lastingAt ? 'Lasting' : understoodAt ? 'Understood' : packLevels.includes('Familiar') ? 'Familiar' : packLevels.length ? 'Glimpsed' : null;
  return { understoodAt, lastingAt, freshness: freshnessFrom(proofs, now), latest: mine.at(-1) ?? null, level };
}

/** Families this learner has answered anywhere: in an expedition or in a check. */
export function seenFamilies(exp: ExpeditionLedger, checks: CheckLedger): Set<string> {
  const seen = new Set<string>();
  for (const bank of preparedBanks()) for (const gradeId of exp.seen[bank.pack] ?? []) {
    const family = bank.expeditionFamilies[gradeId];
    if (family) seen.add(family);
  }
  for (const e of checks.events) if (e.t === 'attempt') seen.add(e.family);
  return seen;
}

/** prove: light the place. lasting: its first refresh, a week on. refresh: every one after that. */
export type CheckPurpose = 'prove' | 'lasting' | 'refresh';
/** How a ready place is proved: a new case (the default), or the question bank when no case is left. */
export type ProveVia = 'case' | 'questions';
export type CheckStatus =
  | { kind: 'none' }
  | { kind: 'ready'; purpose: CheckPurpose; via: ProveVia }
  | { kind: 'waiting'; dueAt: string }
  | { kind: 'cooling'; readyAt: string; purpose: CheckPurpose }
  /** Lasting and fresh: `refreshAt` is when its next refresh falls due. */
  | { kind: 'lasting'; at: string; refreshAt?: string }
  | { kind: 'exhausted' };

/** What is left to prove a place with: an unplayed case, else a check its question bank can still draw. */
function proveVia(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger): ProveVia | null {
  if (nextCase(nodeId, checks)) return 'case';
  const bank = bankFor(nodeId);
  return bank && drawCheck(bank, seenFamilies(exp, checks), 'probe') ? 'questions' : null;
}

/** Where a node's check stands at `now`. Pure: the clock is passed in, so tests can move it. */
export function checkStatus(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions = checkSessions(checks)): CheckStatus {
  if (!bankFor(nodeId) && !casesFor(nodeId).length) return { kind: 'none' };
  const progress = nodeProgress(nodeId, exp, checks, sessions, now);
  const fresh = progress.freshness;
  const left = proveVia(nodeId, exp, checks);
  if (progress.lastingAt && fresh) {
    // Lasting stays Lasting. When its next refresh falls due, a new case re-lights the glow. With
    // every case and question spent there is nothing to refresh with, so it has no next date at all:
    // the place keeps everything it has.
    const lasting: CheckStatus = left ? { kind: 'lasting', at: progress.lastingAt, refreshAt: fresh.dueAt } : { kind: 'lasting', at: progress.lastingAt };
    if (!fresh.ready || !left) return lasting;
    const latest = progress.latest;
    if (latest && !latest.verdict.passed && latest.at >= fresh.dueAt) {
      const ready = Date.parse(latest.at) + CHECK_POLICY.retryAfterDays * DAY;
      if (now < ready) return { kind: 'cooling', readyAt: new Date(ready).toISOString(), purpose: 'refresh' };
    }
    return { kind: 'ready', purpose: 'refresh', via: left };
  }
  // Nothing left to try: no date is promised for a case that does not exist.
  if (!left) return { kind: 'exhausted' };
  const purpose: CheckPurpose = progress.understoodAt ? 'lasting' : 'prove';
  if (progress.understoodAt) {
    const due = Date.parse(progress.understoodAt) + CHECK_POLICY.lastingDays * DAY;
    if (now < due) return { kind: 'waiting', dueAt: new Date(due).toISOString() };
  }
  const latest = progress.latest;
  if (latest && !latest.verdict.passed) {
    const ready = Date.parse(latest.at) + CHECK_POLICY.retryAfterDays * DAY;
    if (now < ready) return { kind: 'cooling', readyAt: new Date(ready).toISOString(), purpose };
  }
  return { kind: 'ready', purpose, via: left };
}

/** Whether a run of this place's expedition should end on its next new case: always until the place
 * is proved, and after that only when a refresh (Lasting included) is due. A replay on a place that
 * is not due ends on the payoff, so it never spends a case the ladder cannot use. */
export function caseClosesRun(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number): boolean {
  const sessions = checkSessions(checks);
  if (!nodeProgress(nodeId, exp, checks, sessions, now).understoodAt) return true;
  const status = checkStatus(nodeId, exp, checks, now, sessions);
  return status.kind === 'ready' && status.via === 'case';
}

/** The day a status promises the next new case: a week after the place lit, a couple of days after a
 * miss, or its next refresh. Undefined when one is ready now, or when nothing is left to play. */
export function nextCaseOf(status: CheckStatus): string | undefined {
  return status.kind === 'waiting' ? status.dueAt : status.kind === 'cooling' ? status.readyAt : status.kind === 'lasting' ? status.refreshAt : undefined;
}

/** When this place's next new case opens, as the record now stands (see nextCaseOf), or null. */
export function nextCaseAt(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number): number | null {
  const at = nextCaseOf(checkStatus(nodeId, exp, checks, now));
  return at ? Date.parse(at) : null;
}

/** A fresh check for this learner, or the reason there isn't one now. */
export function startCheck(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number, session: string):
  { status: CheckStatus; items: DrawnItem[] | null } {
  const status = checkStatus(nodeId, exp, checks, now);
  const bank = bankFor(nodeId);
  if (status.kind !== 'ready' || !bank) return { status, items: null };
  // The question bank is the fallback: it opens whenever asked (accessibility), cases or not.
  const items = drawCheck(bank, seenFamilies(exp, checks), session);
  return items ? { status, items } : { status: { kind: 'exhausted' }, items: null };
}

/** Nodes a passed check has colored. */
export function checkEarnedIds(checks: CheckLedger): string[] {
  return [...new Set(checkSessions(checks).filter(s => s.verdict.passed).map(s => s.node))];
}

/** Every node colored by evidence: Understood expeditions and passed checks, one mechanism. */
export function earnedNodeIds(exp: ExpeditionLedger, checks: CheckLedger): string[] {
  return [...new Set([...getExpeditionEarnedIds(exp), ...checkEarnedIds(checks)])];
}

export function nodeLevel(nodeId: string, exp: ExpeditionLedger, checks: CheckLedger): NodeLevel | null {
  return nodeProgress(nodeId, exp, checks).level;
}

/** Every place that can be proved: bank order first, then places with new cases and no bank. */
function provableNodes(): string[] {
  return [...new Set([...preparedBanks().map(bank => bank.node), ...EXPEDITIONS.filter(e => hasCases(e.nodeId)).map(e => e.nodeId)])];
}

/** Nodes in or below `withinId` whose Lasting check or next refresh is ready now, in bank order. */
export function dueChecks(withinId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions = checkSessions(checks)): string[] {
  return provableNodes()
    .filter(node => isWithinTerritory(node, withinId))
    .filter(node => { const s = checkStatus(node, exp, checks, now, sessions); return s.kind === 'ready' && s.purpose !== 'prove'; });
}

/** The freshness of every proved place, by node. Pure: the clock is passed in. */
export function freshnessByNode(exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions = checkSessions(checks)): Map<string, Freshness> {
  const out = new Map<string, Freshness>();
  for (const nodeId of earnedFrom(exp, sessions)) {
    const fresh = nodeProgress(nodeId, exp, checks, sessions, now).freshness;
    if (fresh) out.set(nodeId, fresh);
  }
  return out;
}
const earnedFrom = (exp: ExpeditionLedger, sessions: CheckSession[]) =>
  new Set([...getExpeditionEarnedIds(exp), ...sessions.filter(s => s.verdict.passed).map(s => s.node)]);

/** Everything the learner has proved or played, by time: expedition runs and every check or case event. */
export function activityTimes(exp: ExpeditionLedger, checks: CheckLedger): string[] {
  return [...exp.runs.map(run => run.at), ...checks.events.map(e => e.at)];
}

/** Places whose Lasting check or next refresh is ready now, anywhere on the atlas, in bank order. */
const readyToRefresh = (exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions: CheckSession[]) =>
  provableNodes().filter(node => { const s = checkStatus(node, exp, checks, now, sessions); return s.kind === 'ready' && s.purpose !== 'prove'; });

export interface WelcomeVisit {
  /** When the learner was last here before the break. */
  lastSeen: string;
  /** When this visit began. */
  visitFrom: number;
  /** The visit's places still to refresh, the ones that waited longest first. */
  nodes: string[];
}

/**
 * The visit after a break of WELCOME_BACK.breakDays or more, or null when there was no break.
 * `elsewhere` is everything else the learner did on this device (core/activity.ts), so a day spent
 * watching is not a break. The set is the visit's own: chosen once, across the whole atlas, from
 * where things stood when the visit began (at most three), so every hub and the map agree on it and
 * proving something new never changes it. A place opened during the visit has had its turn.
 */
export function welcomeVisit(exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions = checkSessions(checks), elsewhere: readonly string[] = []): WelcomeVisit | null {
  const pause = breakBefore([...activityTimes(exp, checks), ...elsewhere], now);
  if (!pause) return null;
  const before = (at: string) => Date.parse(at) < pause.visitFrom;
  // Sessions before the visit judge exactly as they did then: a first play is always the earliest.
  const then = { exp: { ...exp, runs: exp.runs.filter(run => before(run.at)) }, checks: { ...checks, events: checks.events.filter(e => before(e.at)) }, sessions: sessions.filter(s => before(s.at)) };
  const ready = readyToRefresh(then.exp, then.checks, pause.visitFrom, then.sessions)
    .map(node => ({ nodeId: node, dueAt: nodeProgress(node, then.exp, then.checks, then.sessions, pause.visitFrom).freshness?.dueAt ?? '' }));
  const tried = new Set(sessions.filter(s => !before(s.at)).map(s => s.node));
  return { lastSeen: pause.lastSeen, visitFrom: pause.visitFrom, nodes: welcomeBackSet(ready).filter(node => !tried.has(node)) };
}

/** The welcome-back visit's places in or below `withinId`, or null when there was no break or none is left here. */
export function welcomeBack(withinId: string, exp: ExpeditionLedger, checks: CheckLedger, now: number, sessions = checkSessions(checks), elsewhere: readonly string[] = []):
  { lastSeen: string; nodes: string[] } | null {
  const visit = welcomeVisit(exp, checks, now, sessions, elsewhere);
  const nodes = visit?.nodes.filter(node => isWithinTerritory(node, withinId)) ?? [];
  return visit && nodes.length ? { lastSeen: visit.lastSeen, nodes } : null;
}
