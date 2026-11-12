import { useMemo, useSyncExternalStore } from 'react';
import type { ShelfGuess, ShelfState } from './types';

/** What the learner has finished and guessed, on this device. Same storage-event pattern as auto/proof.ts. */
export const SHELF_KEY = 'mok-shelf-v1';

export const emptyShelf = (): ShelfState => ({ version: 1, done: {}, guesses: {}, complete: {} });

const isIso = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const earlier = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b);

/** A stored shelf, or an empty one: unreadable JSON and malformed entries are dropped, never thrown. */
export function parseShelf(raw: string | null | undefined): ShelfState {
  if (!raw) return emptyShelf();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return emptyShelf(); }
  return shelfFrom(value);
}

/** Validates any value as a shelf (also used for the shelf inside an exported file). */
export function shelfFrom(value: unknown): ShelfState {
  if (!value || typeof value !== 'object') return emptyShelf();
  const { done, guesses, complete } = value as { done?: unknown; guesses?: unknown; complete?: unknown };
  const cleanGuesses: Record<string, ShelfGuess> = {};
  if (guesses && typeof guesses === 'object') for (const [id, guess] of Object.entries(guesses)) {
    if (id && guess && typeof guess === 'object' && typeof (guess as ShelfGuess).right === 'boolean' && isIso((guess as ShelfGuess).at)) cleanGuesses[id] = { right: (guess as ShelfGuess).right, at: (guess as ShelfGuess).at };
  }
  return { version: 1, done: stamps(done), guesses: cleanGuesses, complete: stamps(complete) };
}

/** An id-to-timestamp map, keeping only well-formed entries. */
function stamps(value: unknown): Record<string, string> {
  const clean: Record<string, string> = {};
  if (value && typeof value === 'object') for (const [id, at] of Object.entries(value)) if (id && isIso(at)) clean[id] = at;
  return clean;
}

/** `into` with every stamp of `from` added, the earlier kept where both have one; null when nothing changes. */
function mergeStamps(into: Readonly<Record<string, string>>, from: Readonly<Record<string, string>>): Record<string, string> | null {
  let merged: Record<string, string> | null = null;
  for (const [id, at] of Object.entries(from)) {
    const next = into[id] ? earlier(into[id], at) : at;
    if (next !== into[id]) (merged ??= { ...into })[id] = next;
  }
  return merged;
}

/** Two shelves as one: every done, guess and completed place kept; where both have one, the earlier wins. */
export function mergeShelves(a: ShelfState, b: ShelfState): ShelfState {
  const done = mergeStamps(a.done, b.done);
  const complete = mergeStamps(a.complete, b.complete);
  let guesses: Record<string, ShelfGuess> | null = null;
  for (const [id, guess] of Object.entries(b.guesses)) {
    const mine = a.guesses[id];
    if (!mine || (Date.parse(guess.at) < Date.parse(mine.at))) (guesses ??= { ...a.guesses })[id] = guess;
  }
  return done || guesses || complete ? { version: 1, done: done ?? a.done, guesses: guesses ?? a.guesses, complete: complete ?? a.complete } : a;
}

/** The shelf with an item done. Already done: the same object (the first time is kept). */
export function withDone(state: ShelfState, itemId: string, at = new Date().toISOString()): ShelfState {
  if (!itemId || state.done[itemId]) return state;
  return { ...state, done: { ...state.done, [itemId]: at } };
}

/** The shelf with a guess recorded. Already guessed: the same object (the first answer wins). */
export function withGuess(state: ShelfState, quickItemId: string, right: boolean, at = new Date().toISOString()): ShelfState {
  if (!quickItemId || state.guesses[quickItemId]) return state;
  return { ...state, guesses: { ...state.guesses, [quickItemId]: { right, at } } };
}

/** The shelf with places recorded complete. Nothing new: the same object (the first time is kept). */
export function withComplete(state: ShelfState, placeIds: Iterable<string>, at = new Date().toISOString()): ShelfState {
  let complete: Record<string, string> | null = null;
  for (const id of placeIds) if (id && !state.complete[id]) (complete ??= { ...state.complete })[id] = at;
  return complete ? { ...state, complete } : state;
}

// The live store: one per page, shared by every useShelf().
let current: ShelfState | null = null;
const listeners = new Set<() => void>();
let syncing = false;

function readDisk(): ShelfState {
  try { return parseShelf(localStorage.getItem(SHELF_KEY)); } catch { return emptyShelf(); }
}
function emit() { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent) {
  if (event.key !== SHELF_KEY && event.key !== null) return;
  const next = mergeShelves(loadShelf(), readDisk());
  if (next !== current) { current = next; emit(); }
}

/** The shelf as it is now (read from this device once, then kept live). */
export function loadShelf(): ShelfState {
  current ??= readDisk();
  return current;
}

function update(change: (state: ShelfState) => ShelfState) {
  // Merged with what is on disk first, so another tab's progress is never written over.
  const base = mergeShelves(loadShelf(), readDisk());
  const next = change(base);
  if (next !== base) {
    try { localStorage.setItem(SHELF_KEY, JSON.stringify(next)); } catch { /* private mode: it lasts this visit */ }
  }
  if (next !== current) { current = next; emit(); }
}

/** Marks an item finished, for good. */
export function markDone(itemId: string): void { update(state => withDone(state, itemId)); }
/** Records the first answer to a quick question. */
export function recordGuess(quickItemId: string, right: boolean): void { update(state => withGuess(state, quickItemId, right)); }
/** Records places complete, for good. */
export function markComplete(placeIds: readonly string[]): void { if (placeIds.length) update(state => withComplete(state, placeIds)); }
/** Folds a shelf in (an imported file): nothing already here is lost. */
export function mergeShelf(incoming: ShelfState): void { update(state => mergeShelves(state, incoming)); }

/** Calls back on every change, here or in another tab. Returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!syncing && typeof window !== 'undefined') { window.addEventListener('storage', onStorage); syncing = true; }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && syncing) { window.removeEventListener('storage', onStorage); syncing = false; }
  };
}

/** What useShelf() gives: the same object until the shelf changes. */
export interface ShelfApi {
  state: ShelfState;
  done: ReadonlySet<string>;
  guesses: ShelfState['guesses'];
  isDone: (itemId: string) => boolean;
  markDone: (itemId: string) => void;
  recordGuess: (quickItemId: string, right: boolean) => void;
  guessFor: (quickItemId: string) => ShelfGuess | undefined;
}

export function useShelf(): ShelfApi {
  const state = useSyncExternalStore(subscribe, loadShelf, loadShelf);
  return useMemo(() => {
    const done: ReadonlySet<string> = new Set(Object.keys(state.done));
    return { state, done, guesses: state.guesses, isDone: id => done.has(id), markDone, recordGuess, guessFor: id => state.guesses[id] };
  }, [state]);
}
