import { useEffect, useMemo, useState } from 'react';
import { loadedPool, loadPool, type FeedPool } from './pool';

/** The Watch pool, or null until it has loaded (it loads, once, as soon as `enabled`). Once any part
 * of the app has loaded it, every caller has it on its first render: a hub opened after Watch never
 * waits a render for the pool (and never draws its Watch row twice). */
export function usePool(enabled = true): FeedPool | null {
  const [pool, setPool] = useState<FeedPool | null>(loadedPool);
  const current = pool ?? loadedPool();
  useEffect(() => {
    if (!enabled || current) return;
    let live = true;
    void loadPool().then(next => { if (live) setPool(next); }, () => {});
    return () => { live = false; };
  }, [enabled, current]);
  return current;
}

/** The IDs of the videos Watch can play, or null until the pool has loaded. A YouTube link is a Watch
 * video only when its ID is one of them: a video saved by hand, or one since dropped from the pool,
 * stays an ordinary link. */
export function usePoolIds(enabled = true): ReadonlySet<string> | null {
  const pool = usePool(enabled);
  return useMemo(() => pool ? new Set(pool.videos.map(video => video.id)) : null, [pool]);
}
