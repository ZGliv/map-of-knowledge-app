import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalog } from './catalog';
import { createDemoProgress, DEMO_STORAGE_KEY, exportDemoProgress, loadDemoProgress, MAX_DEMO_COMPLETIONS, parseDemoProgress, toggleDemoCompletion, writeDemoProgress } from './demoProgress';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const leaves = () => catalog.all().filter(node => node.id !== catalog.root.id && catalog.getChildren(node).length === 0);
const branches = () => catalog.all().filter(node => catalog.getChildren(node).length > 0);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('demo marks stay separate from real learning evidence', () => {
  it('uses its own key and never reads, modifies, or exports learning evidence', () => {
    const storage = new MemoryStorage();
    const learning = JSON.stringify({ evidence: [{ eventId: 'earned', objectiveId: 'real-learning' }] });
    storage.setItem('mok-next.save.v1', learning);
    const read = vi.spyOn(storage, 'getItem');
    const write = vi.spyOn(storage, 'setItem');
    const remove = vi.spyOn(storage, 'removeItem');
    const fresh = loadDemoProgress(storage);
    const marked = toggleDemoCompletion(fresh.data, leaves()[0].id);
    expect(writeDemoProgress(marked, storage)).toBeNull();
    expect(read.mock.calls.every(([key]) => key.startsWith(DEMO_STORAGE_KEY))).toBe(true);
    expect(write.mock.calls.every(([key]) => key.startsWith(DEMO_STORAGE_KEY))).toBe(true);
    expect(remove).not.toHaveBeenCalled();
    expect(storage.values.get('mok-next.save.v1')).toBe(learning);
    expect(exportDemoProgress(marked)).not.toContain('evidence');
    expect(parseDemoProgress(exportDemoProgress(marked))).toEqual(marked);
  });

  it('toggles a leaf immutably and never adds completed ancestors', () => {
    const fresh = createDemoProgress();
    const leaf = leaves()[0];
    const marked = toggleDemoCompletion(fresh, leaf.id);
    expect(fresh.completedIds).toEqual([]);
    expect(marked.completedIds).toEqual([leaf.id]);
    for (const ancestor of catalog.getPath(leaf).slice(0, -1)) expect(marked.completedIds).not.toContain(ancestor.id);
    expect(toggleDemoCompletion(marked, leaf.id)).toEqual(fresh);
  });

  it('does not mark a parent even when every descendant leaf is marked', () => {
    const parent = branches().find(node => node.id !== catalog.root.id)!;
    const descendantIds = leaves().filter(leaf => catalog.getPath(leaf).some(node => node.id === parent.id)).map(node => node.id);
    let progress = createDemoProgress();
    for (const id of descendantIds) progress = toggleDemoCompletion(progress, id);
    expect(progress.completedIds).toEqual(descendantIds);
    expect(progress.completedIds).not.toContain(parent.id);
  });

  it('preserves stable leaf IDs and map location across browser saves', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    const data = { ...toggleDemoCompletion(createDemoProgress(), leaves()[0].id), locationId: leaves()[0].id };
    expect(writeDemoProgress(data)).toBeNull();
    expect(loadDemoProgress()).toEqual({ data, warning: null });
  });
});

describe('demo import boundaries', () => {
  it('deduplicates marked leaves without changing their order', () => {
    const [a, b] = leaves();
    const imported = parseDemoProgress(JSON.stringify({ ...createDemoProgress(), completedIds: [a.id, b.id, a.id] }));
    expect(imported.completedIds).toEqual([a.id, b.id]);
  });

  it('rejects unknown nodes, branches, unknown location, and learning-save format', () => {
    expect(() => toggleDemoCompletion(createDemoProgress(), 'knowledge.invented')).toThrow(/Unknown map node/);
    expect(() => toggleDemoCompletion(createDemoProgress(), catalog.root.id)).toThrow(/Only terminal leaves/);
    expect(() => parseDemoProgress(JSON.stringify({ ...createDemoProgress(), completedIds: [branches()[0].id] }))).toThrow(/region, not a terminal leaf/);
    expect(() => parseDemoProgress(JSON.stringify({ ...createDemoProgress(), completedIds: ['knowledge.invented'] }))).toThrow(/Unknown map node/);
    expect(() => parseDemoProgress(JSON.stringify({ ...createDemoProgress(), locationId: 'knowledge.invented' }))).toThrow(/Unknown saved location/);
    expect(() => parseDemoProgress(JSON.stringify({ version: 1, evidence: [], locationId: catalog.root.id }))).toThrow(/separate learning prototype/);
  });

  it.each([
    ['unsupported version', { ...createDemoProgress(), version: 2 }, /Unsupported demo save version/],
    ['non-string ID', { ...createDemoProgress(), completedIds: [42] }, /nonempty map ID/],
    ['whitespace ID', { ...createDemoProgress(), completedIds: [' knowledge.science'] }, /nonempty map ID/],
    ['missing location', { version: 1, completedIds: [] }, /Saved location/],
    ['array envelope', [], /must be an object/],
  ])('rejects %s', (_label, input, expected) => {
    expect(() => parseDemoProgress(JSON.stringify(input))).toThrow(expected);
  });

  it('rejects oversized input before silently dropping any IDs', () => {
    const input = { ...createDemoProgress(), completedIds: Array.from({ length: MAX_DEMO_COMPLETIONS + 1 }, () => leaves()[0].id) };
    expect(() => parseDemoProgress(JSON.stringify(input))).toThrow(/10,000-ID limit/);
    expect(() => parseDemoProgress(' '.repeat(6_000_001))).toThrow(/too large/);
    expect(() => parseDemoProgress('{broken')).toThrow(/not valid JSON/);
  });
});

describe('catalog changes and damaged local data', () => {
  it('carries a mark on a node that became a region to every leaf it now holds, quietly', () => {
    const storage = new MemoryStorage();
    const leaf = leaves()[0];
    const formerLeaf = branches().find(node => node.id !== catalog.root.id && !leaf.id.startsWith(`${node.id}.`))!;
    const original = JSON.stringify({ ...createDemoProgress(), completedIds: [leaf.id, formerLeaf.id] });
    storage.setItem(DEMO_STORAGE_KEY, original);
    const result = loadDemoProgress(storage);
    expect(result.warning).toBeNull();
    expect(result.data.completedIds[0]).toBe(leaf.id);
    const carried = result.data.completedIds.slice(1);
    expect(carried.length).toBeGreaterThan(0);
    expect(carried.every(id => id.startsWith(`${formerLeaf.id}.`) && !catalog.getChildren(catalog.get(id)!).length)).toBe(true);
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY)!).completedIds).toEqual(result.data.completedIds);
    expect(writeDemoProgress(result.data, storage)).toBeNull();
  });

  it('recovers known marks when a saved leaf or location disappears', () => {
    const storage = new MemoryStorage();
    const leaf = leaves()[0];
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 1, completedIds: ['knowledge.removed', leaf.id], locationId: 'knowledge.removed' }));
    const result = loadDemoProgress(storage);
    expect(result.data).toEqual({ version: 1, completedIds: [leaf.id], locationId: catalog.root.id });
    expect(result.warning).toMatch(/unavailable marked leaf/);
    expect(result.warning).toMatch(/world view/);
  });

  it('preserves exact damaged bytes before opening a fresh demo', () => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, '{damaged');
    const result = loadDemoProgress(storage);
    expect(result.data).toEqual(createDemoProgress());
    expect(result.warning).toMatch(/original is preserved/);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
    expect([...storage.values.entries()].some(([key, value]) => key.startsWith(`${DEMO_STORAGE_KEY}.quarantine.`) && value === '{damaged')).toBe(true);
  });

  it('blocks replacement when the recovery copy cannot be stored', () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify({ ...createDemoProgress(), version: 0 });
    storage.setItem(DEMO_STORAGE_KEY, original);
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(loadDemoProgress(storage).warning).toMatch(/replacement saves are blocked/);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(original);
    expect(writeDemoProgress(createDemoProgress(), storage)).toMatch(/blocked to protect/);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(original);
  });

  it('reports storage denial and never reports a silent failed write as saved', () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Access denied'); });
    expect(loadDemoProgress(storage).warning).toMatch(/Access denied/);
    vi.restoreAllMocks();
    vi.spyOn(storage, 'setItem').mockImplementation(() => undefined);
    expect(writeDemoProgress(createDemoProgress(), storage)).toMatch(/did not retain/);
  });
});
