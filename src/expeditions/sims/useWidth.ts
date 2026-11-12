import { useLayoutEffect, useState, type RefObject } from 'react';

/** The rendered width of an element, so an SVG can be drawn in real pixels and its text stays
 * readable at phone width instead of shrinking with a fixed viewBox. */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 640): number {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
