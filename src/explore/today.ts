import { REELS } from './deck';
import { isDay, isPlayableReel } from './reelShape';
import type { EngineReel, Reel } from './types';

// Today's set: what the Reels tab plays first. The reel engine (scripts/reels) publishes one dated
// deck a day, public/explore/decks/<YYYY-MM-DD>.json, holding that day's new reels and the evergreen
// reels to mix in; the app fetches it lazily. After it the Reels tab keeps going through every other
// premade reel (reelQueue: the evergreen deck, then earlier decks' reels still live) and ends once
// they are all behind you.
//   - Expired reels drop out: a date-bound reel shows from its `from` day up to, not on, `expires`.
//   - A missing deck falls back to the latest one of the last week (its expired reels dropped),
//     and with none at all, or offline, to the evergreen deck alone, exactly as before decks existed.
// Days are the viewer's local calendar days. `?day=YYYY-MM-DD` previews another day's set.

export const DECK_SCHEMA = 'mok.deck/1';
/** How far back a missing day may borrow a deck. */
export const LOOKBACK_DAYS = 7;
/** One evergreen reel after every this many new ones. */
const EVERY = 2;

export interface DatedDeck {
  schema: typeof DECK_SCHEMA;
  /** The day it was made for. */
  date: string;
  /** When it was published (ISO time). */
  made: string;
  /** The day's reels, strongest first. */
  reels: EngineReel[];
  /** Evergreen reel IDs (explore/deck.ts) to mix in. */
  evergreen: string[];
}

export interface DeckIndex { schema: 'mok.decks/1'; dates: string[] }

export interface TodaysSet {
  /** The local day the set is for. */
  day: string;
  /** The deck it came from, or null when it is the evergreen deck alone. */
  deck: string | null;
  reels: readonly Reel[];
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The local calendar day, YYYY-MM-DD. */
export const localDay = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
export { isDay };
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Shown on `day`: from its first day up to, and not including, its expiry. */
export const isLive = (reel: Pick<EngineReel, 'from' | 'expires'>, day: string) => reel.from <= day && (reel.expires === undefined || day < reel.expires);

/** A fetched deck, or null if it is not one. Malformed reels inside are dropped. */
export function parseDeck(value: unknown): DatedDeck | null {
  const deck = value as Partial<DatedDeck> | null;
  if (!deck || deck.schema !== DECK_SCHEMA || !isDay(deck.date) || !Array.isArray(deck.reels)) return null;
  return {
    schema: DECK_SCHEMA,
    date: deck.date,
    made: typeof deck.made === 'string' ? deck.made : '',
    reels: deck.reels.filter(isPlayableReel),
    evergreen: Array.isArray(deck.evergreen) ? deck.evergreen.filter((id): id is string => typeof id === 'string') : [],
  };
}

/** The feed for `day`: the deck's live reels with its evergreen picks woven in (one after every two
 * new reels), an already-watched pick swapped for the next evergreen reel not yet watched. With no
 * deck, or nothing in it still live, the evergreen deck alone. */
export function todaysSet(deck: DatedDeck | null, day: string, evergreen: readonly Reel[], watched: readonly string[] = []): Reel[] {
  const fresh = deck ? deck.reels.filter(reel => isLive(reel, day)) : [];
  if (!fresh.length) return [...evergreen];
  const taken = new Set<string>(fresh.map(reel => reel.id));
  const picks: Reel[] = [];
  for (const id of deck!.evergreen) {
    const named = evergreen.find(reel => reel.id === id);
    if (!named || taken.has(named.id)) continue;
    const pick = watched.includes(named.id) ? evergreen.find(reel => !watched.includes(reel.id) && !taken.has(reel.id)) ?? named : named;
    if (taken.has(pick.id)) continue;
    taken.add(pick.id);
    picks.push(pick);
  }
  const out: Reel[] = [];
  fresh.forEach((reel, index) => {
    out.push(reel);
    if ((index + 1) % EVERY === 0 && picks.length) out.push(picks.shift()!);
  });
  return [...out, ...picks];
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export interface LoadOptions { day?: string; base?: string; fetch?: Fetch; timeoutMs?: number }

async function getJson(url: string, get: Fetch, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) return null; // out of time: stop asking
  try {
    const res = await get(url, { signal, cache: 'no-cache' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/** Today's deck, else the latest in the last week, else null. */
export async function findDeck(day: string, base: string, get: Fetch, signal: AbortSignal): Promise<DatedDeck | null> {
  // The index comes first, so a day the engine skipped is never asked for (and never logs a 404).
  const index = await getJson(`${base}index.json`, get, signal) as Partial<DeckIndex> | null;
  const oldest = addDays(day, -LOOKBACK_DAYS);
  const dates = (Array.isArray(index?.dates) ? index.dates : []).filter(isDay).filter(date => date <= day && date >= oldest).sort().reverse();
  for (const date of [...new Set(dates)]) {
    const deck = parseDeck(await getJson(`${base}${date}.json`, get, signal));
    if (deck && deck.date === date) return deck;
  }
  return null;
}

/** How far back the Reels tab reaches for earlier decks' reels, after today's set and the evergreen deck. */
export const EARLIER_DAYS = 14;

/** The reels of decks before today's set that are still live on `day`: newest deck first, each
 * reel once. Today's own deck and any later one are left out. */
export function earlierReels(decks: readonly (DatedDeck | null)[], day: string, deck: string | null): EngineReel[] {
  const before = deck ?? day;
  const seen = new Set<string>();
  return decks.filter((d): d is DatedDeck => !!d && d.date < before).sort((a, b) => b.date.localeCompare(a.date))
    .flatMap(d => d.reels.filter(reel => {
      if (!isLive(reel, day) || seen.has(reel.id)) return false;
      seen.add(reel.id);
      return true;
    }));
}

/** The Reels tab's last reels, after today's set and the evergreen deck: earlier decks of the last
 * EARLIER_DAYS days, read from the index. Never rejects: offline or slow, there are none. */
export async function loadEarlierReels(set: Pick<TodaysSet, 'day' | 'deck'>, options: Omit<LoadOptions, 'day'> = {}): Promise<EngineReel[]> {
  const base = options.base ?? `${import.meta.env.BASE_URL}explore/decks/`;
  const get = options.fetch ?? ((url, init) => fetch(url, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
  try {
    const index = await getJson(`${base}index.json`, get, controller.signal) as Partial<DeckIndex> | null;
    const oldest = addDays(set.day, -EARLIER_DAYS), before = set.deck ?? set.day;
    const dates = (Array.isArray(index?.dates) ? index.dates : []).filter(isDay).filter(date => date < before && date >= oldest);
    const decks = await Promise.all([...new Set(dates)].map(async date => { const deck = parseDeck(await getJson(`${base}${date}.json`, get, controller.signal)); return deck?.date === date ? deck : null; }));
    return earlierReels(decks, set.day, set.deck);
  } catch { return []; } finally { clearTimeout(timer); }
}

/** The Reels tab's order: every premade reel, once. The first tier (today's set) comes whole, its
 * watched reels kept in place (the tab opens at the first one not watched); each later tier (the
 * evergreen deck, then earlier decks' reels) follows without the reels already watched. */
export function reelQueue<T extends { id: string }>(tiers: readonly (readonly T[])[], watched: readonly string[] = []): T[] {
  const seen = new Set<string>(), done = new Set(watched);
  return tiers.flatMap((tier, index) => tier.filter(reel => {
    if (seen.has(reel.id) || (index > 0 && done.has(reel.id))) return false;
    seen.add(reel.id);
    return true;
  }));
}

const requestedDay = () => {
  try { const day = new URLSearchParams(globalThis.location?.search ?? '').get('day'); return isDay(day) ? day : undefined; } catch { return undefined; }
};

let pending: Promise<TodaysSet> | null = null;

/** Load today's set once per session (it is the same all day). Never rejects: any failure, or a
 * slow network, falls back to the evergreen deck. */
export function loadTodaysSet(watched: readonly string[] = [], options: LoadOptions = {}): Promise<TodaysSet> {
  const fresh = !!(options.day || options.base || options.fetch);
  if (pending && !fresh) return pending;
  const run = (async () => {
    const day = options.day ?? requestedDay() ?? localDay();
    const base = options.base ?? `${import.meta.env.BASE_URL}explore/decks/`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
    const deck = await findDeck(day, base, options.fetch ?? ((url, init) => fetch(url, init)), controller.signal).catch(() => null).finally(() => clearTimeout(timer));
    return { day, deck: deck?.date ?? null, reels: todaysSet(deck, day, REELS, watched) };
  })();
  if (!fresh) pending = run;
  return run;
}
