export type Content = typeof import('./content');

let loaded: Content | null = null;
let pending: Promise<Content> | null = null;

/** The packs and banks, once they have loaded; null before. */
export const loadedContent = (): Content | null => loaded;

/** Load the packs and banks once. A failed fetch is forgotten, so the next call tries again. */
export function loadContent(): Promise<Content> {
  return pending ??= import('./content').then(module => (loaded = module), error => { pending = null; throw error; });
}
