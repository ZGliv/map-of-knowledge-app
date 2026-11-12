// A deploy removes the build this page started on: Vercel keeps no old chunks, so the first load of a
// part not fetched yet (a lab, the picker, the packs) fails, and the iPhone app (the live site in remote
// mode) stays on the old build until it is quit. A failed chunk therefore asks the server which build is
// live (index.html names its main script) and reloads onto it only when that is another build. Never for
// a failure on the same build (a glitch, a bad chunk, a bug: the callers' own handling runs), never when
// the server does not answer (a reload there loses the whole app), never while the learner is typing,
// at most once for each build and at most twice in ten minutes (sessionStorage), so nothing can loop.

/** sessionStorage key: the build this tab last reloaded for, and when it reloaded automatically. */
export const CHUNK_RELOAD_KEY = 'mok.chunkReload';
export const RELOAD_LIMIT = 2;
export const RELOAD_LIMIT_WINDOW_MS = 10 * 60_000;
/** A reload asked for this long ago with the page still here did not happen (a dead network the phone
 * calls online): the parts waiting on it show their button again. */
export const RELOAD_STALLED_MS = 8_000;
/** How long the server gets to answer before it counts as unreachable. */
export const CHECK_TIMEOUT_MS = 6_000;
/** A load failing in the background (the packs retry every 4 s) reuses an answer this recent. */
export const CHECK_REUSE_MS = 10_000;

/** What the server says: another build is live, this one still is, or no answer. */
export type Build = 'new' | 'same' | 'unreachable';
/** After a failed chunk: a reload is under way, or the page stays (the server answered, or did not). */
export type Outcome = 'reloading' | 'reachable' | 'unreachable';

/** The main script's address in index.html (Vite names it /assets/index-<hash>.js). */
export const ENTRY_PATTERN = /\/assets\/index-[\w-]+\.js/;

export interface ReloadDeps {
  /** The main script this page runs, or null when it has none of the build's (the dev server). */
  running: () => string | null;
  /** index.html as the server has it now. Throws when the server cannot be reached. */
  fetchPage: () => Promise<{ ok: boolean; text: string }>;
  /** True while the learner is typing or has typed text not yet saved. */
  typing: () => boolean;
  now: () => number;
  /** null when storage is unavailable: then no automatic reload, since nothing could stop a loop. */
  storage: () => Pick<Storage, 'getItem' | 'setItem'> | null;
  reload: () => void;
  later: (run: () => void, ms: number) => void;
}

/** Text the learner writes (search boxes aside): the field in focus counts, and so does any shown one
 * holding text, since a capture or edit form keeps its words only on the page. */
const FIELD = 'textarea, input:not([type]), input[type=text], input[type=url], input[type=email]';

function typingInDocument(): boolean {
  try {
    const active = document.activeElement;
    if (active instanceof HTMLElement && (active.matches(FIELD) || active.isContentEditable)) return true;
    return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(FIELD)].some(field => field.value.trim() !== '' && field.getClientRects().length > 0);
  } catch { return false; }
}

async function fetchIndex(): Promise<{ ok: boolean; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch('/', { cache: 'no-store', signal: controller.signal });
    return { ok: response.ok, text: response.ok ? await response.text() : '' };
  } finally { clearTimeout(timer); }
}

const browser: ReloadDeps = {
  running: () => {
    const src = typeof document === 'undefined' ? null : document.querySelector<HTMLScriptElement>('script[type=module][src*="/assets/index-"]')?.src;
    if (!src) return null;
    try { return new URL(src).pathname.match(ENTRY_PATTERN)?.[0] ?? null; } catch { return null; }
  },
  fetchPage: fetchIndex,
  typing: typingInDocument,
  now: () => Date.now(),
  storage: () => { try { return window.sessionStorage; } catch { return null; } },
  reload: () => window.location.reload(),
  later: (run, ms) => { setTimeout(run, ms); },
};

interface Stamp { for: string; at: number[] }
function readStamp(raw: string | null): Stamp {
  try {
    const value = raw ? JSON.parse(raw) as Partial<Stamp> : null;
    return { for: typeof value?.for === 'string' ? value.for : '', at: Array.isArray(value?.at) ? value.at.filter((t): t is number => typeof t === 'number') : [] };
  } catch { return { for: '', at: [] }; }
}

export interface ReloadGuard {
  /** A chunk failed to load. Reloads when the server serves another build and a reload is allowed.
   * `background`: no one is waiting on it, so a recent answer will do. */
  afterChunkFailure: (options?: { background?: boolean }) => Promise<Outcome>;
  /** The learner asked to reload: reloads whatever build is live, once the server answers. */
  reloadWhenReachable: () => Promise<Outcome>;
  /** Called when a reload asked for did not happen; returns the unsubscribe. */
  onStalled: (listener: () => void) => () => void;
}

export function createReloadGuard(deps: ReloadDeps): ReloadGuard {
  let reloading = false;
  let asking: Promise<{ build: Build; live: string | null }> | null = null;
  let last: { at: number; build: Build; live: string | null } | null = null;
  const stalled = new Set<() => void>();

  const ask = () => asking ??= (async () => {
    let answer: { build: Build; live: string | null };
    try {
      const page = await deps.fetchPage();
      const live = page.ok ? page.text.match(ENTRY_PATTERN)?.[0] ?? null : null;
      const running = deps.running();
      // A server error, or a page that is not this app's (a captive portal's sign-in page), is no page to
      // reload onto. With no build entry of its own (the dev server) this page compares nothing.
      answer = !page.ok || (running && !live) ? { build: 'unreachable', live: null } : { build: running && live !== running ? 'new' : 'same', live };
    } catch { answer = { build: 'unreachable', live: null }; }
    last = { at: deps.now(), ...answer };
    return answer;
  })().finally(() => { asking = null; });

  const start = () => {
    reloading = true;
    deps.reload();
    deps.later(() => { reloading = false; for (const listener of [...stalled]) listener(); }, RELOAD_STALLED_MS);
  };

  /** One automatic reload for this build, and no more than the limit in the window. */
  const allowed = (live: string): boolean => {
    try {
      const storage = deps.storage();
      if (!storage) return false;
      const record = readStamp(storage.getItem(CHUNK_RELOAD_KEY));
      const now = deps.now();
      if (record.for === live) return false;
      const recent = record.at.filter(t => t <= now && now - t < RELOAD_LIMIT_WINDOW_MS);
      if (recent.length >= RELOAD_LIMIT) return false;
      storage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ for: live, at: [...recent, now] }));
      return true;
    } catch { return false; }
  };

  return {
    async afterChunkFailure({ background = false } = {}) {
      if (reloading) return 'reloading';
      const now = deps.now();
      const answer = background && last && now >= last.at && now - last.at < CHECK_REUSE_MS ? last : await ask();
      if (reloading) return 'reloading';
      if (answer.build === 'unreachable') return 'unreachable';
      if (answer.build === 'new' && answer.live && !deps.typing() && allowed(answer.live)) { start(); return 'reloading'; }
      return 'reachable';
    },
    async reloadWhenReachable() {
      if (reloading) return 'reloading';
      const answer = await ask();
      if (reloading) return 'reloading';
      if (answer.build === 'unreachable') return 'unreachable';
      start();
      return 'reloading';
    },
    onStalled(listener) { stalled.add(listener); return () => { stalled.delete(listener); }; },
  };
}

export const reloadGuard = createReloadGuard(browser);

const CHUNK_MESSAGE = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|Failed to load module script|is not a valid JavaScript MIME type/i;

/** A failed load of one of the app's own chunks (a script or its stylesheet), as opposed to a bug. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return CHUNK_MESSAGE.test(message);
}

/** Vite dispatches 'vite:preloadError' when a dynamic import rejects: a chunk or its stylesheet that did
 * not load, but also a module that threw while it ran. Only the first asks about a new build; the error
 * still rejects the import (no preventDefault), so every caller keeps its own handling, and a bug is
 * thrown on as a bug. */
export function installChunkReload(target: Pick<Window, 'addEventListener'> = window, guard: Pick<ReloadGuard, 'afterChunkFailure'> = reloadGuard): void {
  target.addEventListener('vite:preloadError', event => {
    if (isChunkLoadError((event as Event & { payload?: unknown }).payload)) void guard.afterChunkFailure({ background: true });
  });
}
