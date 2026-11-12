import type { ReelShelf } from '../explore/pins';
import type { LibraryStore } from '../notebook/libraryStore';
import type { LearnerState } from './guideTypes';
import type { NotebookEntry } from './notebook';

/** The newest times kept: far more than one visit ever holds. */
const KEEP = 2000;

export interface ActivityInput {
  learner?: LearnerState;
  entries?: readonly NotebookEntry[];
  library?: LibraryStore;
  shelf?: ReelShelf;
  /** Watch videos by ID → when each was watched through (feed/memory.ts). */
  watched?: Readonly<Record<string, string>>;
  /** When the Watch feed last learned from a video, watched through or not (feed/memory.ts `at`). */
  feedAt?: string | null;
}

/**
 * Everything else the learner did on this device, by time: videos watched, reels pinned, discovery
 * answers, notes, saved links and reading. Proving things is read from its own records
 * (checks/progress.ts activityTimes); together they tell a break from a day spent watching
 * (checks/freshness.ts WELCOME_BACK). Background work, such as a cover found for an imported book,
 * is not the learner and is left out. Times after `now` are dropped; the newest come last.
 */
export function otherActivity({ learner, entries = [], library, shelf, watched = {}, feedAt }: ActivityInput, now: number): string[] {
  const times: string[] = [
    ...Object.values(watched),
    feedAt,
    ...(shelf?.pinned.map(pin => pin.at) ?? []),
    ...(learner?.attempts.map(attempt => attempt.at) ?? []),
    ...entries.flatMap(entry => [entry.createdAt, entry.updatedAt]),
    ...(library?.links.flatMap(link => [link.createdAt, link.updatedAt, link.removedAt]) ?? []),
    ...(library?.items.flatMap(item => [item.createdAt, item.startedAt, item.finishedAt, item.removedAt]) ?? []),
    ...(library?.notes.flatMap(note => [note.createdAt, note.updatedAt, note.removedAt]) ?? []),
  ].filter((at): at is string => typeof at === 'string');
  return times.filter(at => { const ms = Date.parse(at); return Number.isFinite(ms) && ms <= now; }).sort().slice(-KEEP);
}
