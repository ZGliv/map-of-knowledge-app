import type { AutoLink, AutoLinkKind, AutoPlace } from '../auto/types';
import { videoIdFromUrl } from '../feed/youtube';
import type { PlaceProgress } from '../shelf/fill';
import { CARD_MINUTES, cardId, linkItemId, packId, readId, type CoreKind } from '../shelf/types';

/** What a place's shelf lists, pure: its core items (they fill the map), its links out, and its
 * progress split into the place itself and everything inside it. */

export interface CoreRow { id: string; kind: CoreKind; title: string; minutes: number }
export interface LinkRow { id: string; link: AutoLink }
/** Finished and total core minutes, and their share (0..1). */
export interface Tally { done: number; core: number; fill: number }

/** The place's own card, read and pack, in that order; only what its generated page has. */
export function coreRows(place: AutoPlace | null, placeId: string): CoreRow[] {
  if (!place || place.nodeId !== placeId) return [];
  return [
    { id: cardId(placeId), kind: 'card', title: 'Place card', minutes: CARD_MINUTES },
    ...(place.read && place.read.minutes > 0 ? [{ id: readId(placeId), kind: 'read' as const, title: 'The full read', minutes: place.read.minutes }] : []),
    ...(place.pack ? [{ id: packId(placeId), kind: 'pack' as const, title: place.pack.title, minutes: place.pack.minutes }] : []),
  ];
}

/** Is this a plain https address? The pipeline only publishes those; anything else (a stale or
 * hand-edited page with javascript: or data:) is never rendered as a link. */
export function isHttps(url: string): boolean {
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

/** Links out, one per id, each with its shelf item id. Only https links. */
export function linkRows(place: AutoPlace | null, placeId: string): LinkRow[] {
  if (!place || place.nodeId !== placeId || !place.links) return [];
  const seen = new Set<string>();
  return place.links.flatMap(link => !link.id || !link.url || !isHttps(link.url) || seen.has(link.id) || !seen.add(link.id) ? [] : [{ id: linkItemId(placeId, link.id), link }]);
}

/** Links out split by the Watch group: a YouTube link to a video the group shows plays there instead
 * (`watching`: its video ids), so it is not listed twice; the rest stay links. */
export function splitLinks(rows: readonly LinkRow[], watching: ReadonlySet<string>): { links: LinkRow[]; inWatch: Map<string, LinkRow> } {
  const links: LinkRow[] = [], inWatch = new Map<string, LinkRow>();
  for (const row of rows) {
    const video = videoIdFromUrl(row.link.url);
    if (video && watching.has(video)) inWatch.set(video, row); else links.push(row);
  }
  return { links, inWatch };
}

const tally = (done: number, core: number): Tally => ({ done, core, fill: core > 0 ? Math.min(1, done / core) : 0 });

/** The place's own core minutes and those of everything inside it. `subtree` is placeProgress for the
 * place (its own and its descendants' minutes together). A subtree finished in full (or lit by older
 * progress) counts the place's own items finished too. `inside` is null when nothing inside has core minutes. */
export function splitProgress(rows: readonly CoreRow[], isDone: (id: string) => boolean, subtree: PlaceProgress): { own: Tally | null; inside: Tally | null } {
  const ownCore = rows.reduce((sum, row) => sum + row.minutes, 0);
  const complete = subtree.core > 0 && subtree.done >= subtree.core;
  const ownDone = complete ? ownCore : rows.reduce((sum, row) => sum + (isDone(row.id) ? row.minutes : 0), 0);
  const insideCore = subtree.core - ownCore;
  const inside = insideCore >= 0.5 ? tally(Math.max(0, Math.min(insideCore, subtree.done - ownDone)), insideCore) : null;
  return { own: ownCore > 0 ? tally(ownDone, ownCore) : null, inside };
}

/** A fill share as the hub says it: a whole percent, and never "0" once anything is finished. */
export function percentLabel(fill: number): string {
  const percent = Math.round(fill * 100);
  return fill > 0 && percent === 0 ? 'under 1%' : `${percent}%`;
}

/** Minutes as the hub says them, to a tenth. */
export function minutesLabel(value: number, unit = 'core minute'): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
}

export const LINK_KIND: Record<AutoLinkKind, string> = { book: 'Book', course: 'Course', video: 'Video', documentary: 'Documentary', article: 'Article', primary: 'Source' };
