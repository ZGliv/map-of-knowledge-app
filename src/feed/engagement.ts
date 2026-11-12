// What one impression says: the learner never presses a "like" or "not for me", so the feed reads
// what they did instead. Pure. An impression is everything that happened while one video was on
// screen (and anything done to it from there, like saving it or opening its place).
//
//   a glance       under GLANCE_MS on screen, flicked past in a run of swipes: says nothing
//   a quick skip   under QUICK_SKIP_MS and barely played: a strong no
//   partway        the share played (or, for a long video, the minutes): mostly a soft no
//   through        to the end, or nearly: yes
//   again          played again after it ended: a strong yes
//   saved          kept in the Library: the strongest yes
//   opened place   its place chip tapped: a yes about its place
//   sound          turned off during it: a little less of a yes; heard through to the end: a touch more

export const GLANCE_MS = 700;
export const QUICK_SKIP_MS = 2500;

export interface Impression {
  /** Time on screen while the feed was live (not while away or hidden). */
  dwellMs: number;
  /** The furthest point played, in seconds. */
  playedS: number;
  /** The video's length as the player reported it, or 0 when it never said. */
  durationS: number;
  /** Played to its end at least once. */
  ended: boolean;
  /** Played again from the top after ending (a tap, or a loop). */
  replays: number;
  short: boolean;
  saved: boolean;
  openedPlace: boolean;
  /** The learner turned sound off while it played. */
  muted: boolean;
  /** Heard (sound on) while it played. */
  heard: boolean;
}

export const emptyImpression = (short: boolean): Impression => ({ dwellMs: 0, playedS: 0, durationS: 0, ended: false, replays: 0, short, saved: false, openedPlace: false, muted: false, heard: false });

export type Verdict =
  | { kind: 'glance' }
  | { kind: 'skip' | 'partway' | 'through'; r: number; w: number };

/** The share of the video played: by its length when known, else by time on screen against a typical length. */
export function playedShare(imp: Pick<Impression, 'playedS' | 'durationS' | 'dwellMs' | 'short' | 'ended'>): number {
  if (imp.ended) return 1;
  if (imp.durationS > 0) return Math.min(1, imp.playedS / imp.durationS);
  return Math.min(1, Math.max(imp.playedS, imp.dwellMs / 1000) / (imp.short ? 40 : 300));
}

/** Watched through: to the end or nearly, or three minutes of a long one. */
export const isThrough = (imp: Pick<Impression, 'playedS' | 'durationS' | 'dwellMs' | 'short' | 'ended'>) => imp.ended || playedShare(imp) >= 0.85 || (!imp.short && imp.playedS >= 180);

export function judge(imp: Impression): Verdict {
  const acted = imp.saved || imp.openedPlace || imp.replays > 0;
  if (!acted && imp.dwellMs < GLANCE_MS) return { kind: 'glance' };
  if (!acted && imp.dwellMs < QUICK_SKIP_MS && imp.playedS < 2) return { kind: 'skip', r: 0, w: 1.6 };
  const through = isThrough(imp);
  const share = playedShare(imp);
  // Partway: leaving a Short before its end is a no, softer the further it got (half of it is still
  // under even); a few minutes of a long video is a fair yes.
  let r = through ? 1 : Math.max(share ** 1.5, imp.short ? 0 : 0.6 * Math.min(1, imp.playedS / 180));
  let w = 1;
  if (imp.replays > 0) { r = 1; w += 0.6 * Math.min(2, imp.replays); }
  if (imp.saved) { r = 1; w += 2; }
  if (imp.openedPlace) { r = Math.max(r, 0.8); w += 0.5; }
  if (imp.muted) r *= 0.85;
  else if (imp.heard && through) w += 0.1;
  return { kind: through || r >= 0.999 ? 'through' : 'partway', r: Math.max(0, Math.min(1, r)), w };
}

/** A learning action at a place, as evidence about it: starting something, or proving it. */
export const LEARNING = { started: { r: 1, w: 1.5 }, proved: { r: 1, w: 2.5 } } as const;
