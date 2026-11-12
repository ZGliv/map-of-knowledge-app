// A saved record can name a place the atlas no longer has: held, renamed or removed. It must never fail
// the whole record (the Library would lose everything), and it must never be lost either (the place may
// come back). So a record shows only the places that exist, and keeps its stored place fields under
// HELD to write back exactly as they were. The key is a symbol: spreads carry it along with the record,
// JSON.stringify never writes it, and Object.keys never shows it.

export const HELD: unique symbol = Symbol('held places');

export const sameList = <T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean = Object.is): boolean =>
  a.length === b.length && a.every((x, i) => same(x, b[i]));
