import { catalog } from './catalog';
import type { KnowledgeNode } from '../spatial/types';

/** Demo coloring is a separate ledger. It never establishes learning evidence. */
export const DEMO_STORAGE_KEY = 'mok-next.demo-progress.v1';
export const MAX_DEMO_COMPLETIONS = 10_000;
const MAX_IMPORT_CHARACTERS = 6_000_000;
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface DemoProgress {
  version: 1;
  completedIds: string[];
  locationId: string;
}

export function createDemoProgress(): DemoProgress {
  return { version: 1, completedIds: [], locationId: catalog.root.id };
}

function problem(message: string): never { throw new Error(message); }
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Browser storage could not be accessed.';
}
function identifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512 || value.trim() !== value) {
    problem(`${name} must be a nonempty map ID of at most 512 characters.`);
  }
  return value;
}

function isTerminal(nodeId: string): boolean {
  const node = catalog.get(nodeId);
  return !!node && node.id !== catalog.root.id && catalog.getChildren(node).length === 0;
}

function terminalLeaves(node: KnowledgeNode): string[] {
  const children = catalog.getChildren(node);
  return children.length ? children.flatMap(terminalLeaves) : [node.id];
}

function validate(value: unknown, recoverCatalogChanges = false): { data: DemoProgress; changes: string[]; carried: number } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) problem('A demo map save must be an object.');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) problem(`Unsupported demo save version "${String(raw.version)}". The original should be kept for migration.`);
  if (!Array.isArray(raw.completedIds)) problem('A demo map save must contain a completedIds array. Learning saves belong to the separate learning prototype.');
  if (raw.completedIds.length > MAX_DEMO_COMPLETIONS) problem('This demo save exceeds the 10,000-ID limit. No saved coloring has been discarded.');

  const completedIds: string[] = [];
  const seen = new Set<string>();
  let missing = 0;
  let expanded = 0;
  for (const value of raw.completedIds) {
    const id = identifier(value, 'Completed node');
    if (seen.has(id)) continue;
    seen.add(id);
    const node = catalog.get(id);
    if (!node) {
      if (!recoverCatalogChanges) problem(`Unknown map node "${id}". This file does not match the current catalog.`);
      missing += 1;
    } else if (!isTerminal(id)) {
      if (!recoverCatalogChanges) problem(`"${node.name}" is a region, not a terminal leaf. Only individual terminal leaves can be marked.`);
      // The atlas grew beneath a marked leaf: the mark carries to every leaf it now holds, so nothing is lost.
      for (const leaf of terminalLeaves(node)) if (!seen.has(leaf)) { seen.add(leaf); completedIds.push(leaf); }
      expanded += 1;
    } else completedIds.push(id);
  }

  let locationId = identifier(raw.locationId, 'Saved location');
  const changes: string[] = [];
  if (missing) changes.push(`${missing} unavailable marked ${missing === 1 ? 'leaf was' : 'leaves were'} omitted`);
  if (completedIds.length > MAX_DEMO_COMPLETIONS) problem('Carrying marks to the map\'s new leaves would exceed the 10,000-ID limit. The original is kept.');
  if (!catalog.get(locationId)) {
    if (!recoverCatalogChanges) problem(`Unknown saved location "${locationId}".`);
    locationId = catalog.root.id;
    changes.push('the saved location is unavailable, so the map opened at the world view');
  }
  return { data: { version: 1, completedIds, locationId }, changes, carried: expanded };
}

function parseJson(text: string): unknown {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_CHARACTERS) problem('This demo import is too large. The limit is 6 million characters and 10,000 completed IDs.');
  try { return JSON.parse(text); } catch { return problem('This is not valid JSON. Choose a demo map exported by this prototype.'); }
}

export function parseDemoProgress(text: string): DemoProgress {
  return validate(parseJson(text)).data;
}

export function exportDemoProgress(data: DemoProgress): string {
  return JSON.stringify(validate(data).data, null, 2);
}

export function toggleDemoCompletion(data: DemoProgress, nodeId: string): DemoProgress {
  const current = validate(data).data;
  identifier(nodeId, 'Completed node');
  if (!catalog.get(nodeId)) problem(`Unknown map node "${nodeId}".`);
  if (!isTerminal(nodeId)) problem('Only terminal leaves can be marked. Regions and their ancestors keep their own unmarked geography.');
  if (current.completedIds.includes(nodeId)) {
    return { ...current, completedIds: current.completedIds.filter(id => id !== nodeId) };
  }
  if (current.completedIds.length >= MAX_DEMO_COMPLETIONS) problem('The demo save has reached its 10,000-ID limit. Export it before adding more; existing marks were kept.');
  return { ...current, completedIds: [...current.completedIds, nodeId] };
}

function browserStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  try { if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage; } catch { /* Privacy settings may deny the getter. */ }
  return problem('Browser storage is unavailable. Export the demo map to keep this session.');
}

/** Keep the exact old bytes before allowing any replacement save. */
function quarantine(storage: StorageLike, original: string): string {
  const base = `${DEMO_STORAGE_KEY}.quarantine.${Date.now()}`;
  let key = base;
  for (let suffix = 1; storage.getItem(key) !== null; suffix += 1) {
    if (suffix > 100) problem('Recovery storage already contains too many copies. The original is untouched.');
    key = `${base}.${suffix}`;
  }
  storage.setItem(key, original);
  if (storage.getItem(key) !== original) problem('Could not verify the recovery copy. The original is untouched.');
  storage.removeItem(DEMO_STORAGE_KEY);
  if (storage.getItem(DEMO_STORAGE_KEY) !== null) problem('Could not release the original save. Replacement saves remain blocked.');
  return key;
}

export function loadDemoProgress(storage?: StorageLike): { data: DemoProgress; warning: string | null } {
  let target: StorageLike;
  let original: string | null;
  try {
    target = browserStorage(storage);
    original = target.getItem(DEMO_STORAGE_KEY);
  } catch (error) {
    return { data: createDemoProgress(), warning: `${errorMessage(error)} New demo coloring may only last for this session.` };
  }
  if (original === null) return { data: createDemoProgress(), warning: null };

  let data = createDemoProgress();
  let warning: string;
  try {
    const parsed = validate(parseJson(original), true);
    data = parsed.data;
    if (!parsed.changes.length) {
      // Marks carried to new leaves are saved in their new form; nothing to tell the learner.
      if (parsed.carried) try { target.setItem(DEMO_STORAGE_KEY, JSON.stringify(data)); } catch { /* the next save writes it */ }
      return { data, warning: null };
    }
    warning = `The catalog has changed: ${parsed.changes.join('; ')}. Other known leaf marks were kept.`;
  } catch (error) {
    warning = `The demo save could not be loaded. ${errorMessage(error)} A fresh demo has opened.`;
  }
  try {
    const recoveryKey = quarantine(target, original);
    return { data, warning: `${warning} The original is preserved in browser storage as ${recoveryKey}.` };
  } catch (error) {
    return { data, warning: `${warning} Recovery failed: ${errorMessage(error)} The original is protected and replacement saves are blocked. Export this session to keep new marks.` };
  }
}

export function writeDemoProgress(data: DemoProgress, storage?: StorageLike): string | null {
  try {
    const next = JSON.stringify(validate(data).data);
    const target = browserStorage(storage);
    const original = target.getItem(DEMO_STORAGE_KEY);
    if (original !== null) {
      try { parseDemoProgress(original); } catch {
        return 'Saving is blocked to protect an invalid or outdated demo save. Export this session, then reload to recover the original safely.';
      }
    }
    target.setItem(DEMO_STORAGE_KEY, next);
    if (target.getItem(DEMO_STORAGE_KEY) !== next) return 'The browser did not retain this demo save. Export a copy before closing.';
    return null;
  } catch (error) {
    return `The demo map could not be saved: ${errorMessage(error)} Export a copy before closing.`;
  }
}
