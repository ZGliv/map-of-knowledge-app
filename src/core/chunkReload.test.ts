import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import { CHECK_REUSE_MS, CHUNK_RELOAD_KEY, RELOAD_LIMIT_WINDOW_MS, RELOAD_STALLED_MS, createReloadGuard, installChunkReload, isChunkLoadError, type Outcome, type ReloadDeps } from './chunkReload';
import { AppBoundary, PartBoundary } from '../components/PartBoundary';

const A = '/assets/index-AAAA1111.js';
const B = '/assets/index-BBBB2222.js';
const C = '/assets/index-CCCC3333.js';
const D = '/assets/index-DDDD4444.js';
const html = (entry: string) => `<!doctype html><html><head><script type="module" crossorigin src="${entry}"></script></head><body><div id="root"></div></body></html>`;
const memory = () => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map }; };

interface Page { running: string | null; serving: string | (() => Promise<{ ok: boolean; text: string }>); typing?: boolean; at: number; storage: ReturnType<typeof memory> | null }
/** One open page: the build it runs, what the server serves, and a clock the test moves. */
function page(options: Partial<Page> & { storage?: ReturnType<typeof memory> | null } = {}) {
  const state: Page = { running: A, serving: B, typing: false, at: 1_000_000, storage: memory(), ...options };
  const reload = vi.fn();
  const timers: { run: () => void; at: number }[] = [];
  const fetchPage = vi.fn(async () => typeof state.serving === 'function' ? state.serving() : { ok: true, text: html(state.serving) });
  const deps: ReloadDeps = {
    running: () => state.running, fetchPage, typing: () => !!state.typing, now: () => state.at,
    storage: () => state.storage, reload, later: (run, ms) => { timers.push({ run, at: state.at + ms }); },
  };
  const advance = (ms: number) => { state.at += ms; for (const timer of timers.splice(0)) if (timer.at <= state.at) timer.run(); else timers.push(timer); };
  return { guard: createReloadGuard(deps), reload, fetchPage, state, advance };
}
const record = (storage: ReturnType<typeof memory>) => JSON.parse(storage.map.get(CHUNK_RELOAD_KEY) ?? 'null') as { for: string; at: number[] } | null;

describe('reloading onto a new build after a chunk fails to load', () => {
  it('reloads when the server serves another build, and records which', async () => {
    const p = page();
    expect(await p.guard.afterChunkFailure()).toBe('reloading');
    expect(p.reload).toHaveBeenCalledTimes(1);
    expect(record(p.state.storage!)).toEqual({ for: B, at: [1_000_000] });
    // A second failure on the same page while the reload is under way reloads nothing more, and asks nothing.
    expect(await p.guard.afterChunkFailure()).toBe('reloading');
    expect(p.reload).toHaveBeenCalledTimes(1);
    expect(p.fetchPage).toHaveBeenCalledTimes(1);
  });

  it('never reloads for a failure on the build that is still live (a glitch, a bad chunk)', async () => {
    const p = page({ serving: A });
    expect(await p.guard.afterChunkFailure()).toBe('reachable');
    expect(p.reload).not.toHaveBeenCalled();
    expect(p.state.storage!.map.size).toBe(0);
  });

  it('never reloads when the server does not answer, answers an error, or answers a page that is not the app', async () => {
    for (const serving of [
      async () => { throw new TypeError('Load failed'); },
      async () => ({ ok: false, text: '' }),
      async () => ({ ok: true, text: '<html><body>Sign in to the Wi-Fi</body></html>' }),
    ]) {
      const p = page({ serving });
      expect(await p.guard.afterChunkFailure()).toBe('unreachable');
      expect(await p.guard.reloadWhenReachable()).toBe('unreachable');
      expect(p.reload).not.toHaveBeenCalled();
      expect(p.state.storage!.map.size).toBe(0);
    }
  });

  it('a page with no build of its own (the dev server) never reloads by itself', async () => {
    const p = page({ running: null });
    expect(await p.guard.afterChunkFailure()).toBe('reachable');
    expect(p.reload).not.toHaveBeenCalled();
  });

  it('never loops: once for each build, so a reload that lands on the old page again stops there', async () => {
    const storage = memory();
    expect(await page({ storage }).guard.afterChunkFailure()).toBe('reloading');
    // The reload came back on build A (a cached page): B is still live, and this tab already reloaded for it.
    const again = page({ storage, at: 1_000_500 });
    expect(await again.guard.afterChunkFailure()).toBe('reachable');
    expect(again.reload).not.toHaveBeenCalled();
    // On B now, a deploy of C is a new build: one more reload.
    const onB = page({ storage, running: B, serving: C, at: 1_060_000 });
    expect(await onB.guard.afterChunkFailure()).toBe('reloading');
    expect(record(storage)).toEqual({ for: C, at: [1_000_000, 1_060_000] });
  });

  it('at most two automatic reloads in ten minutes, then none until the window passes', async () => {
    const storage = memory();
    await page({ storage, running: A, serving: B }).guard.afterChunkFailure();
    await page({ storage, running: B, serving: C, at: 1_100_000 }).guard.afterChunkFailure();
    const third = page({ storage, running: C, serving: D, at: 1_200_000 });
    expect(await third.guard.afterChunkFailure()).toBe('reachable');
    expect(third.reload).not.toHaveBeenCalled();
    const later = page({ storage, running: C, serving: D, at: 1_000_000 + RELOAD_LIMIT_WINDOW_MS });
    expect(await later.guard.afterChunkFailure()).toBe('reloading');
  });

  it('a record from the future (the clock moved back) does not block for ever', async () => {
    const storage = memory();
    storage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ for: C, at: [5_000_000, 5_000_001] }));
    expect(await page({ storage }).guard.afterChunkFailure()).toBe('reloading');
    expect(record(storage)).toEqual({ for: B, at: [1_000_000] });
  });

  it('an unreadable record counts as none', async () => {
    const storage = memory();
    storage.setItem(CHUNK_RELOAD_KEY, '{nope');
    expect(await page({ storage }).guard.afterChunkFailure()).toBe('reloading');
  });

  it('never reloads by itself while the learner is typing: the button reloads when they choose', async () => {
    const p = page({ typing: true });
    expect(await p.guard.afterChunkFailure()).toBe('reachable');
    expect(p.reload).not.toHaveBeenCalled();
    expect(p.state.storage!.map.size).toBe(0);
    expect(await p.guard.reloadWhenReachable()).toBe('reloading');
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads by itself when it could not stop a loop: storage missing or throwing', async () => {
    expect(await page({ storage: null }).guard.afterChunkFailure()).toBe('reachable');
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, map: new Map() };
    const p = page({ storage: throwing as unknown as ReturnType<typeof memory> });
    expect(await p.guard.afterChunkFailure()).toBe('reachable');
    expect(p.reload).not.toHaveBeenCalled();
  });

  it('the button reloads whatever build is live once the server answers, never offline', async () => {
    const same = page({ serving: A });
    expect(await same.guard.reloadWhenReachable()).toBe('reloading');
    expect(same.reload).toHaveBeenCalledTimes(1);
    // The button is the learner's choice: it is not counted against the automatic reloads.
    expect(same.state.storage!.map.size).toBe(0);
  });

  it('a reload that never happens (the page is still here) lets go, and the parts waiting on it hear so', async () => {
    const p = page();
    const heard = vi.fn();
    const stop = p.guard.onStalled(heard);
    expect(await p.guard.afterChunkFailure()).toBe('reloading');
    p.advance(RELOAD_STALLED_MS - 1);
    expect(heard).not.toHaveBeenCalled();
    p.advance(1);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    // Not latched: the button can reload again; the automatic reload for B was spent.
    expect(await p.guard.afterChunkFailure()).toBe('reachable');
    expect(await p.guard.reloadWhenReachable()).toBe('reloading');
    expect(p.reload).toHaveBeenCalledTimes(2);
  });

  it('asks once for failures at the same moment, and a background failure reuses a recent answer', async () => {
    const p = page({ serving: A });
    const answers = await Promise.all([p.guard.afterChunkFailure({ background: true }), p.guard.afterChunkFailure(), p.guard.afterChunkFailure({ background: true })]);
    expect(answers).toEqual<Outcome[]>(['reachable', 'reachable', 'reachable']);
    expect(p.fetchPage).toHaveBeenCalledTimes(1);
    p.advance(CHECK_REUSE_MS - 1);
    await p.guard.afterChunkFailure({ background: true });
    expect(p.fetchPage).toHaveBeenCalledTimes(1);
    // Someone waiting on a part always asks afresh; so does a background failure once the answer is old.
    await p.guard.afterChunkFailure();
    expect(p.fetchPage).toHaveBeenCalledTimes(2);
    p.advance(CHECK_REUSE_MS);
    p.state.serving = B;
    expect(await p.guard.afterChunkFailure({ background: true })).toBe('reloading');
    expect(p.fetchPage).toHaveBeenCalledTimes(3);
  });

  it('tells a failed chunk from a bug, in each engine’s words', () => {
    for (const message of [
      'Importing a module script failed.',
      'Failed to fetch dynamically imported module: https://map-of-knowledge.vercel.app/assets/LibraryD-BQZ_vMcb.js',
      'error loading dynamically imported module: https://map-of-knowledge.vercel.app/assets/Hub-DtynLShx.js',
      'Unable to preload CSS for https://map-of-knowledge.vercel.app/assets/LibraryD-CAWeGgh-.css',
      "'text/html' is not a valid JavaScript MIME type.",
    ]) expect(isChunkLoadError(new TypeError(message)), message).toBe(true);
    for (const error of [new TypeError("undefined is not an object (evaluating 'a.b')"), new Error('Load failed'), null, undefined, 42]) expect(isChunkLoadError(error)).toBe(false);
  });

  it('listens for Vite’s preload error: a failed chunk asks in the background, a module that threw is left alone', () => {
    const target = new EventTarget();
    const afterChunkFailure = vi.fn(async () => 'reachable' as const);
    installChunkReload(target as unknown as Window, { afterChunkFailure });
    const failed = Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: new TypeError('Importing a module script failed.') });
    target.dispatchEvent(failed);
    expect(afterChunkFailure).toHaveBeenCalledTimes(1);
    expect(afterChunkFailure).toHaveBeenCalledWith({ background: true });
    // Not prevented, so the import still rejects and its caller still sees the error.
    expect(failed.defaultPrevented).toBe(false);
    // Vite reports a module that threw while it ran the same way: that is a bug, not a deploy.
    const bug = new TypeError("undefined is not an object (evaluating 'a.b')");
    target.dispatchEvent(Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: bug }));
    expect(afterChunkFailure).toHaveBeenCalledTimes(1);
    expect(isChunkLoadError(bug)).toBe(false);
  });
});

describe('PartBoundary', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  const chunk = () => new TypeError('Importing a module script failed.');
  /** A boundary that has caught `error`, with setState applied at once (it is never mounted here). */
  function failed(error: unknown, guard?: Partial<NonNullable<ConstructorParameters<typeof PartBoundary>[0]['guard']>>) {
    vi.stubGlobal('addEventListener', vi.fn());
    vi.stubGlobal('removeEventListener', vi.fn());
    const full = { afterChunkFailure: vi.fn(async (): Promise<Outcome> => 'reachable'), reloadWhenReachable: vi.fn(async (): Promise<Outcome> => 'unreachable'), onStalled: vi.fn(() => () => {}), ...guard };
    const boundary = new PartBoundary({ children: 'the part', guard: full });
    boundary.setState = (patch => { boundary.state = { ...boundary.state, ...(patch as object) }; }) as typeof boundary.setState;
    boundary.componentDidMount();
    boundary.state = { ...boundary.state, ...PartBoundary.getDerivedStateFromError(error) };
    boundary.componentDidCatch(error);
    return { boundary, guard: full };
  }
  const label = (node: unknown) => (isValidElement(node) ? (node as ReactElement<{ children: string }>).props.children : node);
  const settled = () => new Promise(resolve => setTimeout(resolve, 0));

  it('renders the part until something fails', () => {
    expect(new PartBoundary({ children: 'the part' }).render()).toBe('the part');
  });

  it('throws any other error on, as if it were not there, and asks nothing', () => {
    const bug = new TypeError("undefined is not an object (evaluating 'a.b')");
    const { boundary, guard } = failed(bug);
    expect(() => boundary.render()).toThrow(bug);
    expect(guard.afterChunkFailure).not.toHaveBeenCalled();
  });

  it('a failed chunk: nothing while it asks or reloads, else one button, Reload when the server answers', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const reachable = failed(chunk());
    expect(reachable.boundary.render()).toBeNull();
    await settled();
    expect(label(reachable.boundary.render())).toBe('Reload');
    const unreachable = failed(chunk(), { afterChunkFailure: vi.fn(async (): Promise<Outcome> => 'unreachable') });
    await settled();
    expect(label(unreachable.boundary.render())).toBe('Try again');
    const reloading = failed(chunk(), { afterChunkFailure: vi.fn(async (): Promise<Outcome> => 'reloading') });
    await settled();
    expect(reloading.boundary.render()).toBeNull();
  });

  it('offline it reads Try again; back online only the label changes, nothing reloads by itself', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { boundary, guard } = failed(chunk(), { afterChunkFailure: vi.fn(async (): Promise<Outcome> => 'unreachable') });
    await settled();
    expect(label(boundary.render())).toBe('Try again');
    vi.stubGlobal('navigator', { onLine: true });
    (boundary as unknown as { relabel: (event: Event) => void }).relabel(new Event('online'));
    expect(label(boundary.render())).toBe('Reload');
    expect(guard.reloadWhenReachable).not.toHaveBeenCalled();
  });

  it('the button reloads once the server answers; when it does not, the button stays', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { boundary, guard } = failed(chunk());
    await settled();
    const button = boundary.render() as ReactElement<{ onClick: () => void; disabled: boolean }>;
    button.props.onClick();
    expect((boundary.render() as ReactElement<{ disabled: boolean }>).props.disabled).toBe(true);
    await settled();
    expect(guard.reloadWhenReachable).toHaveBeenCalledTimes(1);
    expect(label(boundary.render())).toBe('Try again');
  });

  it('a reload that never happens brings the button back', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    let stalled = () => {};
    const { boundary } = failed(chunk(), { afterChunkFailure: vi.fn(async (): Promise<Outcome> => 'reloading'), onStalled: vi.fn((listener: () => void) => { stalled = listener; return () => {}; }) });
    await settled();
    expect(boundary.render()).toBeNull();
    stalled();
    expect(label(boundary.render())).toBe('Reload');
  });
});

describe('AppBoundary', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('an error nothing else caught leaves one Reload button, and is still reported', () => {
    const reported = vi.fn();
    vi.stubGlobal('reportError', reported);
    const boundary = new AppBoundary({ children: 'the app' });
    expect(boundary.render()).toBe('the app');
    const bug = new TypeError('boom');
    boundary.state = { ...boundary.state, ...AppBoundary.getDerivedStateFromError() };
    boundary.componentDidCatch(bug);
    expect(reported).toHaveBeenCalledWith(bug);
    const button = boundary.render() as ReactElement<{ children: string }>;
    expect(button.props.children).toBe('Reload');
  });
});
