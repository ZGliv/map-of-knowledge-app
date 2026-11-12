import { describe, expect, it } from 'vitest';
import { REELS } from './deck';
import { addDays, DECK_SCHEMA, EARLIER_DAYS, earlierReels, findDeck, isLive, loadEarlierReels, loadTodaysSet, localDay, parseDeck, reelQueue, todaysSet, type DatedDeck } from './today';
import type { EngineReel, Reel } from './types';

// Today's set: which reels the Reels tab plays first on a given day; and the Reels tab's whole order
// after it (the evergreen deck, then earlier decks' reels still live).

const decks = import.meta.glob('../../public/explore/decks/*.json', { eager: true, import: 'default' });
const real = parseDeck(Object.entries(decks).find(([path]) => /\d{4}-\d{2}-\d{2}\.json$/.test(path))![1])!;
const fresh = (id: string, from: string, expires?: string): EngineReel => ({ ...structuredClone(real.reels[0]), id, from, ...(expires ? { expires } : { expires: undefined }) });
const deck = (date: string, reels: EngineReel[], evergreen: string[] = []): DatedDeck => ({ schema: DECK_SCHEMA, date, made: '', reels, evergreen });
const ids = (reels: readonly Reel[]) => reels.map(reel => reel.id);
const evergreen = REELS.slice(0, 6);

describe('days', () => {
  it('are local calendar days, and add up across month ends', () => {
    expect(localDay(new Date(2026, 9, 23, 23, 59))).toBe('2026-10-23');
    expect(localDay(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('a reel is live from its first day up to, not on, its expiry', () => {
    const reel = { from: '2026-10-23', expires: '2026-10-24' };
    expect(isLive(reel, '2026-10-22')).toBe(false);
    expect(isLive(reel, '2026-10-23')).toBe(true);
    expect(isLive(reel, '2026-10-24')).toBe(false);
    expect(isLive({ from: '2026-10-23' }, '2027-05-01')).toBe(true);
  });
});

describe('a fetched deck', () => {
  it('is read only when it is one, and its malformed reels are dropped', () => {
    expect(parseDeck(null)).toBeNull();
    expect(parseDeck({ schema: 'mok.deck/0', date: '2026-10-23', reels: [] })).toBeNull();
    expect(parseDeck('<!doctype html>')).toBeNull();
    const broken = { ...real.reels[0], id: 'broken', hero: 'nope' };
    const parsed = parseDeck({ schema: DECK_SCHEMA, date: '2026-10-23', reels: [real.reels[0], broken, { id: 'half' }], evergreen: ['x', 3] });
    expect(ids(parsed!.reels)).toEqual([real.reels[0].id]);
    expect(parsed!.evergreen).toEqual(['x']);
  });

  it('every published deck reads back whole, and the index lists each one', () => {
    const index = Object.entries(decks).find(([path]) => path.endsWith('/index.json'))![1] as { dates: string[] };
    const dated = Object.entries(decks).filter(([path]) => /\d{4}-\d{2}-\d{2}\.json$/.test(path));
    expect(dated.length).toBeGreaterThanOrEqual(3);
    for (const [path, value] of dated) {
      const parsed = parseDeck(value)!;
      expect(parsed.reels.length, path).toBe((value as { reels: unknown[] }).reels.length);
      expect(index.dates).toContain(parsed.date);
      expect(parsed.reels.every(reel => isLive(reel, parsed.date)), path).toBe(true);
    }
  });
});

describe('today’s set', () => {
  it('with no deck, is the evergreen deck as it always was', () => {
    expect(ids(todaysSet(null, '2026-10-23', evergreen))).toEqual(ids(evergreen));
  });

  it('weaves one evergreen reel in after every two new ones', () => {
    const day = deck('2026-10-23', [fresh('n1', '2026-10-23'), fresh('n2', '2026-10-23'), fresh('n3', '2026-10-23'), fresh('n4', '2026-10-23'), fresh('n5', '2026-10-23')], [evergreen[0].id, evergreen[1].id, evergreen[2].id]);
    expect(ids(todaysSet(day, '2026-10-23', evergreen))).toEqual(['n1', 'n2', evergreen[0].id, 'n3', 'n4', evergreen[1].id, 'n5', evergreen[2].id]);
  });

  it('drops reels that expired or have not started, and falls back to evergreen when none are left', () => {
    const day = deck('2026-10-23', [fresh('gone', '2026-10-22', '2026-10-23'), fresh('stays', '2026-10-21'), fresh('later', '2026-10-25')], [evergreen[3].id]);
    expect(ids(todaysSet(day, '2026-10-23', evergreen))).toEqual(['stays', evergreen[3].id]);
    const allGone = deck('2026-10-23', [fresh('gone', '2026-10-22', '2026-10-23')], [evergreen[3].id]);
    expect(ids(todaysSet(allGone, '2026-10-23', evergreen))).toEqual(ids(evergreen));
  });

  it('swaps an evergreen pick already watched for the first one not yet watched, and ignores unknown ids', () => {
    const day = deck('2026-10-23', [fresh('n1', '2026-10-23'), fresh('n2', '2026-10-23')], [evergreen[2].id, 'no-such-reel']);
    expect(ids(todaysSet(day, '2026-10-23', evergreen, [evergreen[2].id, evergreen[0].id]))).toEqual(['n1', 'n2', evergreen[1].id]);
  });
});

describe('finding the deck', () => {
  const served = (files: Record<string, unknown>) => async (url: string) => {
    const name = url.split('/').pop()!;
    if (!(name in files)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(files[name]), { status: 200 });
  };
  const signal = new AbortController().signal;
  const day = (date: string) => deck(date, [fresh(`${date}-a`, date)]);

  it('takes the day’s own deck', async () => {
    expect((await findDeck('2026-10-24', '/decks/', served({ '2026-10-24.json': day('2026-10-24'), 'index.json': { dates: ['2026-10-24'] } }), signal))!.date).toBe('2026-10-24');
  });

  it('borrows the latest earlier deck of the past week when the day’s is missing, never a later one', async () => {
    const files = { 'index.json': { dates: ['2026-10-10', '2026-10-21', '2026-10-22', '2026-10-25'] }, '2026-10-21.json': day('2026-10-21'), '2026-10-22.json': day('2026-10-22'), '2026-10-25.json': day('2026-10-25') };
    expect((await findDeck('2026-10-23', '/decks/', served(files), signal))!.date).toBe('2026-10-22');
    expect(await findDeck('2026-10-30', '/decks/', served({ 'index.json': { dates: ['2026-10-10'] }, '2026-10-10.json': day('2026-10-10') }), signal)).toBeNull();
  });

  it('asks only for decks the index lists, so a skipped day requests nothing that is missing', async () => {
    const asked: string[] = [];
    const files = { 'index.json': { dates: ['2026-10-24', '2026-10-25'] }, '2026-10-24.json': day('2026-10-24'), '2026-10-25.json': day('2026-10-25') };
    const get = served(files);
    expect((await findDeck('2026-10-26', '/decks/', url => { asked.push(url.split('/').pop()!); return get(url); }, signal))!.date).toBe('2026-10-25');
    expect(asked).toEqual(['index.json', '2026-10-25.json']);
  });

  it('never fails: a broken network or a page that is not a deck gives the evergreen deck', async () => {
    const down = async () => { throw new TypeError('offline'); };
    const set = await loadTodaysSet([], { day: '2026-10-23', fetch: down });
    expect(set.deck).toBeNull();
    expect(ids(set.reels)).toEqual(ids(REELS));
    const html = await loadTodaysSet([], { day: '2026-10-23', fetch: async () => new Response('<!doctype html>', { status: 200 }) });
    expect(html.deck).toBeNull();
  });

  it('gives up on a slow network and plays the evergreen deck', async () => {
    const slow = (_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    const set = await loadTodaysSet([], { day: '2026-10-23', fetch: slow, timeoutMs: 50 });
    expect(set.deck).toBeNull();
  });

  it('plays a real dated deck on its own day', async () => {
    const files = Object.fromEntries(Object.entries(decks).map(([path, value]) => [path.split('/').pop()!, value]));
    const set = await loadTodaysSet([], { day: real.date, fetch: served(files) });
    expect(set.deck).toBe(real.date);
    expect(set.reels[0].id).toBe(real.reels[0].id);
    expect(set.reels.length).toBe(real.reels.length + real.evergreen.length);
  });
});

describe('earlier decks, for the Reels tab past today’s set', () => {
  const served = (files: Record<string, unknown>) => async (url: string) => {
    const name = url.split('/').pop()!;
    if (!(name in files)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(files[name]), { status: 200 });
  };
  const files = {
    'index.json': { dates: ['2026-10-01', '2026-10-20', '2026-10-21', '2026-10-23', '2026-10-25'] },
    '2026-10-01.json': deck('2026-10-01', [fresh('2026-10-01-old', '2026-10-01')]),
    '2026-10-20.json': deck('2026-10-20', [fresh('2026-10-20-gone', '2026-10-20', '2026-10-21'), fresh('2026-10-20-kept', '2026-10-20')]),
    '2026-10-21.json': deck('2026-10-21', [fresh('2026-10-21-week', '2026-10-21', '2026-10-30'), fresh('2026-10-21-kept', '2026-10-21')]),
    '2026-10-23.json': deck('2026-10-23', [fresh('2026-10-23-today', '2026-10-23')]),
    '2026-10-25.json': deck('2026-10-25', [fresh('2026-10-25-later', '2026-10-25')]),
  };

  it('are the live reels of the decks before today’s, newest first, from the last two weeks', async () => {
    expect(EARLIER_DAYS).toBe(14);
    const reels = await loadEarlierReels({ day: '2026-10-23', deck: '2026-10-23' }, { fetch: served(files) });
    // Expired, too old, today's own and later decks' reels all stay out.
    expect(ids(reels)).toEqual(['2026-10-21-week', '2026-10-21-kept', '2026-10-20-kept']);
  });

  it('start before the deck today’s set borrowed, and before the day itself when there was none', async () => {
    expect(ids(await loadEarlierReels({ day: '2026-10-23', deck: '2026-10-21' }, { fetch: served(files) }))).toEqual(['2026-10-20-kept']);
    expect(ids(await loadEarlierReels({ day: '2026-10-24', deck: null }, { fetch: served(files) }))).toEqual(['2026-10-23-today', '2026-10-21-week', '2026-10-21-kept', '2026-10-20-kept']);
  });

  it('never fail: offline, slow or not a deck, there are none', async () => {
    expect(await loadEarlierReels({ day: '2026-10-23', deck: null }, { fetch: async () => { throw new TypeError('offline'); } })).toEqual([]);
    const slow = (_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    expect(await loadEarlierReels({ day: '2026-10-23', deck: null }, { fetch: slow, timeoutMs: 50 })).toEqual([]);
    expect(await loadEarlierReels({ day: '2026-10-23', deck: null }, { fetch: async () => new Response('<!doctype html>', { status: 200 }) })).toEqual([]);
  });

  it('never repeat a reel two decks share', () => {
    const shared = fresh('shared', '2026-10-20');
    expect(ids(earlierReels([deck('2026-10-20', [shared]), deck('2026-10-21', [shared, fresh('own', '2026-10-21')]), null], '2026-10-23', '2026-10-23'))).toEqual(['shared', 'own']);
  });

  it('on the last published day, are the earlier published decks’ reels still live', async () => {
    const published = Object.fromEntries(Object.entries(decks).map(([path, value]) => [path.split('/').pop()!, value]));
    const index = published['index.json'] as { dates: string[] };
    const last = [...index.dates].sort().at(-1)!;
    const want = [...index.dates].sort().reverse().filter(date => date < last).flatMap(date => parseDeck(published[`${date}.json`])!.reels.filter(reel => isLive(reel, last)).map(reel => reel.id));
    const reels = await loadEarlierReels({ day: last, deck: last }, { fetch: served(published) });
    expect(want.length).toBeGreaterThan(0);
    expect(ids(reels)).toEqual(want);
  });
});

describe('the Reels tab', () => {
  const day = '2026-10-25';
  const today = todaysSet(deck(day, [fresh('d-1', day), fresh('d-2', day), fresh('d-3', day)], [evergreen[1].id]), day, REELS);
  const earlier = [fresh('e-1', '2026-10-24'), fresh('e-2', '2026-10-23')];

  it('holds every premade reel once: today’s set first, then the evergreen deck, then earlier decks’', () => {
    const queue = reelQueue([today, REELS, earlier]);
    expect(ids(queue.slice(0, today.length))).toEqual(ids(today));
    expect(ids(queue.slice(today.length, -2))).toEqual(ids(REELS.filter(reel => !ids(today).includes(reel.id))));
    expect(ids(queue.slice(-2))).toEqual(['e-1', 'e-2']);
    expect(new Set(ids(queue)).size).toBe(queue.length);
    expect(queue).toHaveLength(today.length + REELS.length - 1 + earlier.length);
  });

  it('keeps today’s set whole, and leaves reels already watched out of the tiers after it', () => {
    const watched = ['d-2', evergreen[3].id, 'e-2'];
    const queue = ids(reelQueue([today, REELS, earlier], watched));
    expect(queue.slice(0, today.length)).toEqual(ids(today));
    expect(queue).not.toContain(evergreen[3].id);
    expect(queue).not.toContain('e-2');
    expect(queue).toContain('e-1');
  });

  it('takes reels arriving later onto the end, without moving the ones already there', () => {
    const first = reelQueue([today, REELS], [evergreen[0].id]);
    const later = reelQueue([first, [...earlier, REELS[2]]], [evergreen[0].id, 'e-1']);
    expect(ids(later.slice(0, first.length))).toEqual(ids(first));
    expect(ids(later.slice(first.length))).toEqual(['e-2']);
  });

  it('with no deck, is the evergreen deck alone, then earlier decks’', () => {
    expect(ids(reelQueue([todaysSet(null, day, REELS), REELS, earlier]))).toEqual([...ids(REELS), 'e-1', 'e-2']);
  });
});
