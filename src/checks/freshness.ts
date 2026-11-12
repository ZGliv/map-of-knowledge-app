// Keeping what you learn: the freshness of a proven place, apart from its color.
//
// Color is permanent (plan §1.3, promise 2): once a place is proved it stays lit, whatever happens
// later. Freshness is a separate glow on top of it. Each successful proof re-lights the glow, and it
// dims until the place's next refresh falls due. Refreshes follow plain spacing: 7, 21, 60 and then
// every 180 days after the last successful proof (the exact ladder barely matters; spacing does).
// The first rung is the existing Lasting check, so Lasting is simply "refreshed once".
//
// A refresh that is due makes the place "ready to refresh" while there is a case or question left to
// refresh it with (checks/progress.ts checkStatus). Missing one changes nothing: no color is lost and
// the ladder never steps back; the next new case simply opens a couple of days later.
//
// Pure and dependency-free (no banks, no registry), so the Library and the map can use it cheaply:
// callers pass the proof times they already know, and the clock.

const DAY = 24 * 60 * 60 * 1000;

/** Days from the last successful proof to the next refresh, by refreshes already made. The last rung repeats. */
export const REFRESH_DAYS = [7, 21, 60, 180] as const;

export const WELCOME_BACK = {
  /** A break this long, or longer, since the learner last did anything (proving, watching, pinning,
   * writing, reading) is met with a welcome-back set. */
  breakDays: 14,
  /** Activity closer together than this is one visit: the welcome stays for the rest of the visit. */
  visitHours: 6,
  /** The set is small on purpose. */
  max: 3,
} as const;

export interface Freshness {
  /** The first proof: when the place lit. */
  readonly litAt: string;
  /** The last proof that moved the ladder on (the first proof, until a refresh is made). */
  readonly lastAt: string;
  /** Refreshes made so far. One means Lasting. */
  readonly refreshes: number;
  /** When each refresh was made, oldest first. The first is the Lasting one. */
  readonly refreshTimes: readonly string[];
  /** When the next refresh falls due. */
  readonly dueAt: string;
  /** True once `dueAt` has passed (the clock alone: whether anything is left to refresh it with is
   * checkStatus's call, so only that ever says "Ready to refresh"). */
  readonly ready: boolean;
  /** The freshness glow, 1 just after a proof, easing to 0 when the next refresh falls due. */
  readonly glow: number;
}

/** Days until the next refresh after this many refreshes. */
export const refreshInterval = (refreshes: number): number => REFRESH_DAYS[Math.min(refreshes, REFRESH_DAYS.length - 1)];

/**
 * Walk a place's successful proofs (any order; duplicates are fine) up the ladder. A proof counts as a
 * refresh only once the current rung has fallen due, so proving it again the next day neither
 * advances nor resets anything. Null when the place has never been proved.
 */
export function freshnessFrom(proofTimes: readonly string[], now: number): Freshness | null {
  const times = [...new Set(proofTimes)].filter(t => !Number.isNaN(Date.parse(t))).sort();
  if (!times.length) return null;
  let last = times[0];
  const refreshTimes: string[] = [];
  for (const t of times.slice(1)) {
    if (Date.parse(t) - Date.parse(last) >= refreshInterval(refreshTimes.length) * DAY) { refreshTimes.push(t); last = t; }
  }
  const from = Date.parse(last);
  const due = from + refreshInterval(refreshTimes.length) * DAY;
  const span = due - from;
  // Ease out: bright for most of the interval, settling as the refresh comes due.
  const left = Math.min(1, Math.max(0, (due - now) / span));
  const glow = now < from ? 1 : Math.round(Math.sqrt(left) * 1000) / 1000;
  return { litAt: times[0], lastAt: last, refreshes: refreshTimes.length, refreshTimes, dueAt: new Date(due).toISOString(), ready: now >= due, glow };
}

/**
 * The break before this visit: walk back from now through the learner's activity while it stays
 * within one visit; a gap of `breakDays` or more is a break. Returns when the learner was last here
 * before the break and when this visit began, or null (no break, or a learner with no history).
 */
export function breakBefore(activity: readonly string[], now: number): { lastSeen: string; visitFrom: number } | null {
  const times = activity.map(t => Date.parse(t)).filter(t => Number.isFinite(t) && t <= now).sort((a, b) => b - a);
  let cursor = now;
  for (const t of times) {
    const gap = cursor - t;
    if (gap >= WELCOME_BACK.breakDays * DAY) return { lastSeen: new Date(t).toISOString(), visitFrom: cursor };
    if (gap > WELCOME_BACK.visitHours * 60 * 60 * 1000) return null;
    cursor = t;
  }
  return null;
}

/**
 * The welcome-back set: places ready to refresh when the visit began, the ones that have waited
 * longest first, at most WELCOME_BACK.max. It is chosen once per visit and only ever shrinks.
 */
export function welcomeBackSet(ready: readonly { nodeId: string; dueAt: string }[]): string[] {
  return [...ready].sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.nodeId.localeCompare(b.nodeId)).slice(0, WELCOME_BACK.max).map(r => r.nodeId);
}
