// Falling from rest, in a vacuum or in air. Pure: the drop-tower sim draws it, the motion case
// engine (cases/engines.ts) computes outcomes from it.
//
// In a vacuum a body gains g metres per second every second, so after t seconds it has fallen
// ½ g t². In air, drag grows with the square of the speed until it balances the pull at the body's
// terminal speed vt; the closed forms are v = vt·tanh(g t / vt) and d = (vt² / g)·ln cosh(g t / vt).

/** ln(cosh x) without overflow for large x. */
const logCosh = (x: number) => Math.abs(x) + Math.log1p(Math.exp(-2 * Math.abs(x))) - Math.LN2;

/** Metres fallen from rest after `t` seconds, under `g` m/s², with an optional terminal speed in m/s. */
export function fallDistance(g: number, t: number, terminal?: number): number {
  if (t <= 0) return 0;
  if (!terminal) return 0.5 * g * t * t;
  return (terminal * terminal / g) * logCosh(g * t / terminal);
}

/** Speed in m/s after `t` seconds of falling from rest. */
export function fallSpeed(g: number, t: number, terminal?: number): number {
  if (t <= 0) return 0;
  return terminal ? terminal * Math.tanh(g * t / terminal) : g * t;
}

/** Seconds to fall `height` metres from rest. */
export function fallTime(g: number, height: number, terminal?: number): number {
  if (height <= 0) return 0;
  if (!terminal) return Math.sqrt(2 * height / g);
  // acosh(e^y) = y + ln(1 + √(1 − e^(−2y))), stable for large y.
  const y = g * height / (terminal * terminal);
  return (terminal / g) * (y + Math.log1p(Math.sqrt(1 - Math.exp(-2 * y))));
}

/** Scale marks for a drop drawn to scale: round metres (never fractions of the drop, which would
 * mark quarter- and half-drop answers), the top and the bottom. */
export function dropTicks(height: number): number[] {
  const step = [5, 10, 25, 50, 100, 250, 500].find(x => height / x <= 6) ?? 1000;
  return [...Array.from({ length: Math.floor(height / step) + 1 }, (_, i) => i * step).filter(d => height - d > step * 0.4), height];
}
