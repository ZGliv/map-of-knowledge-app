// Deep time squeezed into one day. Earth forms at midnight and "now" is the next midnight;
// every clock time a learner sees is computed here from an age in millions of years.

export const DAY_SECONDS = 86_400;

/** Clock seconds after midnight for an event `ma` million years ago, given Earth's age in Ma. */
export function clockSeconds(ma: number, earthMa: number): number {
  return ((earthMa - ma) / earthMa) * DAY_SECONDS;
}

/** The age in Ma that a clock time stands for. */
export function maAtClock(seconds: number, earthMa: number): number {
  return earthMa * (1 - seconds / DAY_SECONDS);
}

/** How many clock seconds before midnight something `years` ago falls. */
export function secondsBeforeMidnight(years: number, earthMa: number): number {
  return (years / (earthMa * 1e6)) * DAY_SECONDS;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "21:08", or "23:59:54" with seconds. Rounds down, so an event never shows past midnight. */
export function formatClock(seconds: number, withSeconds = false): string {
  const s = Math.max(0, Math.min(DAY_SECONDS - (withSeconds ? 1 : 60), Math.floor(seconds)));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}`;
}

/** A short duration in words: "about 6 seconds", "1.5 thousandths of a second", "2 hours 10 minutes". */
export function describeSpan(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
    return `${h} hour${h === 1 ? '' : 's'}${m ? ` ${m} minute${m === 1 ? '' : 's'}` : ''}`;
  }
  if (seconds >= 60) { const m = Math.round(seconds / 60); return `${m} minute${m === 1 ? '' : 's'}`; }
  if (seconds >= 1) { const s = Math.round(seconds); return `${s} second${s === 1 ? '' : 's'}`; }
  const ms = seconds * 1000;
  return `${ms >= 10 ? Math.round(ms) : Number(ms.toFixed(1))} thousandths of a second`;
}

/** Distance in clock hours from a tap to a date range [olderMa, youngerMa]; 0 when inside it. */
export function hoursFromRange(tapSeconds: number, range: [number, number], earthMa: number): number {
  const a = clockSeconds(range[0], earthMa), b = clockSeconds(range[1], earthMa);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const off = tapSeconds < lo ? lo - tapSeconds : tapSeconds > hi ? tapSeconds - hi : 0;
  return off / 3600;
}

/** Angle on a 24-hour dial (radians, 0 at the top, clockwise) and back. */
export const dialAngle = (seconds: number) => (seconds / DAY_SECONDS) * 2 * Math.PI;
export function secondsFromPoint(dx: number, dy: number): number {
  // dy grows downward on screen; atan2(dx, -dy) is 0 at 12 o'clock and runs clockwise.
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += 2 * Math.PI;
  return (a / (2 * Math.PI)) * DAY_SECONDS;
}
