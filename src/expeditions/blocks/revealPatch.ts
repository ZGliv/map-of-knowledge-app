// A right call lights the place's patch below the case's outcome. The case scrolls its outcome into
// view first (CaseView, 80 ms after the run settles); a long outcome and reveal can leave the lit
// cell under the fixed Continue bar, so it is then lifted toward the room its scroll-margin-bottom
// keeps above that bar (expedition.css). The lift stops before the outcome line's first words would
// pass under the sticky chrome at the top (the bar, and in the player the progress strip below it):
// what happened stays readable, and the cell shows at least in part. On a phone the "You called"
// line above the outcome can pass under that chrome; it turns solid once a case is done
// (expedition.css), so the call is covered rather than showing through the breadcrumb or title.

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The nearest ancestor that scrolls (the expedition shell), else the page. */
function scrollerOf(el: Element): Element {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if ((y === 'auto' || y === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Lift `end`'s lit cell into view once the case's own scroll is done. Returns the cleanup for an effect. */
export function revealPatch(end: HTMLElement | null): () => void {
  const id = window.setTimeout(() => {
    const cell = end?.querySelector('.patch .patch__home');
    if (!end || !cell) return;
    const scroller = scrollerOf(end);
    const bottom = Math.min(window.innerHeight, scroller === document.scrollingElement ? window.innerHeight : scroller.getBoundingClientRect().bottom);
    const need = cell.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(cell).scrollMarginBottom) || 0) - bottom;
    if (need <= 0) return;
    const line = end.parentElement?.querySelector('.case__line');
    const chrome = [...(end.closest('.expedition-shell')?.querySelectorAll('.player__bar, .player > .progress') ?? [])];
    const top = Math.max(0, ...chrome.map(el => el.getBoundingClientRect().bottom));
    const room = line ? line.getBoundingClientRect().top - top - 4 : need;
    const lift = Math.min(need, Math.max(0, room));
    if (lift > 0) scroller.scrollBy({ top: lift, behavior: reduced() ? 'auto' : 'smooth' });
  }, 900);
  return () => window.clearTimeout(id);
}
