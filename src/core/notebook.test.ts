import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NOTEBOOK_LIMITS, NOTEBOOK_STORAGE_KEY, createNotebook, deleteNotebookEntry, exportNotebook,
  getNotebookEntriesForNode, loadNotebook, parseNotebook, saveNotebook, upsertNotebookEntry,
  type Notebook, type NotebookEntry, type NotebookEntryInput,
} from './notebook';

const START = '2026-09-07T12:00:00.000Z';
const LATER = '2026-09-08T12:00:00.000Z';
const music = 'knowledge.arts.music';
const physics = 'knowledge.science.physics';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function draft(overrides: Partial<NotebookEntryInput> = {}): NotebookEntryInput {
  return {
    title: 'Why does the same note sound different on different instruments?',
    body: 'My current explanation: the fundamental can match while the overtones differ.',
    sourceUrl: 'https://example.com/acoustics', sourceLabel: 'Class notes',
    kind: 'question', evidence: 'explained', nodeIds: [music, physics], ...overrides,
  };
}

function savedEntry(overrides: Partial<NotebookEntry> = {}): NotebookEntry {
  return { ...draft(), id: 'entry-1', createdAt: START, updatedAt: START, ...overrides } as NotebookEntry;
}

function book(...entries: NotebookEntry[]): Notebook { return { version: 1, entries }; }

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('personal notebook', () => {
  it('creates, persists, exports, and restores real notes independently of learning progress', () => {
    const storage = new MemoryStorage();
    storage.setItem('mok-next.save.v1', 'untouched-learning-save');
    vi.useFakeTimers().setSystemTime(START);
    const original = createNotebook();
    const updated = upsertNotebookEntry(original, draft());
    expect(original.entries).toEqual([]);
    expect(updated.entries[0]).toMatchObject({ ...draft(), createdAt: START, updatedAt: START });
    expect(updated.entries[0].id).toBeTruthy();
    expect(saveNotebook(updated, storage)).toBeNull();
    expect(loadNotebook(storage)).toEqual({ data: updated, warning: null });
    expect(parseNotebook(exportNotebook(updated))).toEqual(updated);
    expect(storage.getItem('mok-next.save.v1')).toBe('untouched-learning-save');
  });

  it('preserves entry identity and creation time when its explanation or reflection changes', () => {
    vi.useFakeTimers().setSystemTime(LATER);
    const original = book(savedEntry());
    const edited = upsertNotebookEntry(original, draft({ id: 'entry-1', body: 'I tested this by comparing two instrument recordings.', evidence: 'applied', createdAt: LATER }));
    expect(edited.entries).toHaveLength(1);
    expect(edited.entries[0]).toMatchObject({ id: 'entry-1', createdAt: START, updatedAt: LATER, evidence: 'applied' });
    expect(original.entries[0].evidence).toBe('explained');
    vi.setSystemTime('2025-01-01T00:00:00.000Z');
    expect(upsertNotebookEntry(edited, draft({ id: 'entry-1' })).entries[0].updatedAt).toBe(LATER);
  });

  it('gives distinct entries independent IDs and deletes only the selected entry', () => {
    let current = upsertNotebookEntry(createNotebook(), draft());
    current = upsertNotebookEntry(current, draft());
    expect(new Set(current.entries.map((entry) => entry.id)).size).toBe(2);
    const removedId = current.entries[0].id;
    const result = deleteNotebookEntry(current, removedId);
    expect(result.entries.map((entry) => entry.id)).toEqual([current.entries[1].id]);
    expect(current.entries).toHaveLength(2);
  });

  it('places one entry in several areas, deduplicates tags, and queries actual ancestry', () => {
    const one = savedEntry({ nodeIds: [music, physics, music] });
    const two = savedEntry({ id: 'entry-2', nodeIds: ['knowledge.arts'], updatedAt: LATER });
    const three = savedEntry({ id: 'entry-3', nodeIds: [] });
    const current = parseNotebook(JSON.stringify(book(one, two, three)));
    expect(current.entries[0].nodeIds).toEqual([music, physics]);
    expect(getNotebookEntriesForNode(current, 'knowledge.arts').map((entry) => entry.id)).toEqual(['entry-2', 'entry-1']);
    expect(getNotebookEntriesForNode(current, 'knowledge.science').map((entry) => entry.id)).toEqual(['entry-1']);
    expect(getNotebookEntriesForNode(current, 'knowledge.arts', false).map((entry) => entry.id)).toEqual(['entry-2']);
    expect(getNotebookEntriesForNode(current, 'knowledge').map((entry) => entry.id)).toEqual(['entry-2', 'entry-1']);
    expect(getNotebookEntriesForNode(current, 'knowledge.art')).toEqual([]);
    expect(current.entries.map((entry) => entry.id)).toEqual(['entry-1', 'entry-2', 'entry-3']);
  });

  it('supports a brief unplaced thought without a fabricated source or explanation', () => {
    const entry = upsertNotebookEntry(createNotebook(), draft({ title: '  A question for later  ', body: '', sourceUrl: '', sourceLabel: '', nodeIds: [], kind: 'idea', evidence: 'encountered' })).entries[0];
    expect(entry).toMatchObject({ title: 'A question for later', body: '', sourceUrl: '', nodeIds: [] });
  });
});

describe('notebook import validation', () => {
  it.each([
    'javascript:alert(1)', 'data:text/html,<h1>Hi</h1>', 'file:///tmp/notes', '//example.com',
    'ftp://example.com', '/relative', 'https:example.com', 'https://exa\nmple.com',
  ])('rejects non-HTTP links or malformed URLs: %s', (sourceUrl) => {
    expect(() => parseNotebook(JSON.stringify(book(savedEntry({ sourceUrl }))))).toThrow(/Source URL/);
  });

  it.each(['', 'https://example.com/watch?v=a&time=2#note', 'http://localhost:4178/', ' HTTPS://example.com/ '])('accepts blank or HTTP(S) source URLs: %s', (sourceUrl) => {
    expect(parseNotebook(JSON.stringify(book(savedEntry({ sourceUrl })))).entries[0].sourceUrl).toBe(sourceUrl.trim());
  });

  it.each([
    ['blank map area', { nodeIds: [''] }, /Map area ID/],
    ['unknown reflection', { evidence: 'mastered' }, /reflection/],
    ['unknown entry kind', { kind: 'lesson' }, /Entry kind/],
    ['empty title', { title: '   ' }, /cannot be empty/],
    ['long title', { title: 'a'.repeat(NOTEBOOK_LIMITS.title + 1) }, /Entry title/],
    ['long body', { body: 'a'.repeat(NOTEBOOK_LIMITS.body + 1) }, /Entry body/],
    ['long label', { sourceLabel: 'a'.repeat(NOTEBOOK_LIMITS.sourceLabel + 1) }, /Source label/],
    ['long URL', { sourceUrl: `https://example.com/${'a'.repeat(NOTEBOOK_LIMITS.sourceUrl)}` }, /Source URL/],
    ['too many areas', { nodeIds: Array.from({ length: NOTEBOOK_LIMITS.nodeIds + 1 }, () => music) }, /at most/],
    ['non-array areas', { nodeIds: music }, /at most/],
    ['invalid ID', { id: '<entry>' }, /Entry ID/],
    ['invalid date', { createdAt: '2026-02-30T12:00:00.000Z' }, /timestamp/],
    ['missing date', { updatedAt: undefined }, /updatedAt/],
    ['reversed dates', { updatedAt: '2026-01-01T00:00:00.000Z' }, /earlier/],
  ])('rejects %s without mutating existing notes', (_label, overrides, error) => {
    const original = book(savedEntry());
    expect(() => parseNotebook(JSON.stringify(book(savedEntry(overrides as Partial<NotebookEntry>))))).toThrow(error);
    expect(original).toEqual(book(savedEntry()));
  });

  it('rejects malformed envelopes, future versions, oversized files, and excessive entry counts', () => {
    expect(() => parseNotebook('{broken')).toThrow(/valid JSON/);
    expect(() => parseNotebook('[]')).toThrow(/must be an object/);
    expect(() => parseNotebook(JSON.stringify({ version: 2, entries: [] }))).toThrow(/Unsupported notebook version/);
    expect(() => parseNotebook(JSON.stringify({ version: 1, entries: {} }))).toThrow(/must be an array/);
    expect(() => parseNotebook(' '.repeat(NOTEBOOK_LIMITS.importLength + 1))).toThrow(/too large/);
    expect(() => parseNotebook(JSON.stringify(book(...Array.from({ length: NOTEBOOK_LIMITS.entries + 1 }, () => savedEntry()))))).toThrow(/at most/);
  });

  it('deduplicates identical entry IDs but rejects conflicting versions atomically', () => {
    expect(parseNotebook(JSON.stringify(book(savedEntry(), savedEntry()))).entries).toHaveLength(1);
    expect(() => parseNotebook(JSON.stringify(book(savedEntry(), savedEntry({ body: 'A different explanation' }))))).toThrow(/Conflicting entries/);
  });

  it('validates direct edits and exports too, so callers cannot silently save invalid data', () => {
    expect(() => upsertNotebookEntry(createNotebook(), draft({ nodeIds: ['unrecognized'] }))).toThrow(/Unknown map area/);
    expect(() => exportNotebook(book(savedEntry({ sourceUrl: 'javascript:alert(1)' })))).toThrow(/Source URL/);
  });
});

describe('notebook storage integrity', () => {
  it('returns a blank notebook for an empty store without writing anything', () => {
    const storage = new MemoryStorage();
    expect(loadNotebook(storage)).toEqual({ data: createNotebook(), warning: null });
    expect(storage.values.size).toBe(0);
  });

  // (A map area the atlas no longer has is not unreadable: see the last describe.)
  it.each(['{damaged', JSON.stringify({ version: 9, entries: [] }), JSON.stringify(book(savedEntry({ nodeIds: [42 as unknown as string] })))])('leaves an unreadable original untouched and blocks subsequent saves', (raw) => {
    const storage = new MemoryStorage();
    storage.setItem(NOTEBOOK_STORAGE_KEY, raw);
    const writer = vi.spyOn(storage, 'setItem');
    const loaded = loadNotebook(storage);
    expect(loaded.data).toEqual(createNotebook());
    expect(loaded.warning).toMatch(/original is untouched/);
    expect(saveNotebook(book(savedEntry()), storage)).toMatch(/blocked/);
    expect(writer).not.toHaveBeenCalled();
    expect(storage.getItem(NOTEBOOK_STORAGE_KEY)).toBe(raw);
    expect(parseNotebook(exportNotebook(book(savedEntry())))).toEqual(book(savedEntry()));
  });

  it('refuses to replace valid persisted data with an invalid in-memory edit', () => {
    const storage = new MemoryStorage();
    saveNotebook(book(savedEntry()), storage);
    const original = storage.getItem(NOTEBOOK_STORAGE_KEY);
    expect(saveNotebook(book(savedEntry({ kind: 'fake' as never })), storage)).toMatch(/could not be saved/);
    expect(storage.getItem(NOTEBOOK_STORAGE_KEY)).toBe(original);
  });

  it('permits an explicit recovery import only after preserving the unreadable original', () => {
    const storage = new MemoryStorage();
    vi.useFakeTimers().setSystemTime(START);
    const recoveryKey = `${NOTEBOOK_STORAGE_KEY}.recovery.${Date.parse(START)}`;
    storage.setItem(recoveryKey, 'an older recovery copy');
    storage.setItem(NOTEBOOK_STORAGE_KEY, '{damaged');
    expect(saveNotebook(book(savedEntry()), storage, { replaceInvalid: true })).toBeNull();
    expect(loadNotebook(storage)).toEqual({ data: book(savedEntry()), warning: null });
    expect(storage.getItem(recoveryKey)).toBe('an older recovery copy');
    expect(storage.getItem(`${recoveryKey}.1`)).toBe('{damaged');
  });

  it('leaves an unreadable original untouched when the recovery copy cannot be stored', () => {
    const storage = new MemoryStorage();
    storage.setItem(NOTEBOOK_STORAGE_KEY, '{damaged');
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw Error('Quota exceeded'); });
    expect(saveNotebook(book(savedEntry()), storage, { replaceInvalid: true })).toMatch(/Quota exceeded/);
    expect(storage.getItem(NOTEBOOK_STORAGE_KEY)).toBe('{damaged');
    const ignored = new MemoryStorage();
    ignored.setItem(NOTEBOOK_STORAGE_KEY, '{damaged');
    vi.spyOn(ignored, 'setItem').mockImplementation(() => {});
    expect(saveNotebook(book(savedEntry()), ignored, { replaceInvalid: true })).toMatch(/Could not verify a recovery copy/);
    expect(ignored.getItem(NOTEBOOK_STORAGE_KEY)).toBe('{damaged');
  });

  it('reports unavailable or full storage and never pretends a write persisted', () => {
    const denied = new MemoryStorage();
    vi.spyOn(denied, 'getItem').mockImplementation(() => { throw Error('Access denied'); });
    expect(loadNotebook(denied).warning).toMatch(/Access denied/);
    expect(saveNotebook(createNotebook(), denied)).toMatch(/Access denied/);
    const full = new MemoryStorage();
    vi.spyOn(full, 'setItem').mockImplementation(() => { throw Error('Quota exceeded'); });
    expect(saveNotebook(book(savedEntry()), full)).toMatch(/Quota exceeded/);
    const ignored = new MemoryStorage();
    vi.spyOn(ignored, 'setItem').mockImplementation(() => {});
    expect(saveNotebook(book(savedEntry()), ignored)).toMatch(/did not retain/);
  });

  it('uses browser storage when present and explains session-only mode otherwise', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    expect(saveNotebook(book(savedEntry()))).toBeNull();
    expect(loadNotebook().data).toEqual(book(savedEntry()));
    vi.stubGlobal('localStorage', undefined);
    expect(loadNotebook().warning).toMatch(/unavailable/);
    expect(saveNotebook(createNotebook())).toMatch(/unavailable/);
  });
});

describe('a map area the atlas no longer has (held, renamed or removed)', () => {
  const GONE = 'knowledge.science.physics.gone-area';
  // Exactly as saveNotebook writes it, so the round trip can be compared byte for byte.
  const stored = { id: 'entry-1', title: 'Overtones', body: 'Why a violin and a flute differ.', sourceUrl: '', sourceLabel: '', kind: 'idea', evidence: 'explained', nodeIds: [GONE, music], createdAt: START, updatedAt: START };
  const RAW = JSON.stringify({ version: 1, entries: [stored] }, null, 2);

  it('the notebook still loads, with the missing area simply absent', () => {
    const storage = new MemoryStorage();
    storage.setItem(NOTEBOOK_STORAGE_KEY, RAW);
    const { data, warning } = loadNotebook(storage);
    expect(warning).toBeNull();
    expect(data.entries[0]).toMatchObject({ id: 'entry-1', nodeIds: [music] });
    expect(getNotebookEntriesForNode(data, music).map(e => e.id)).toEqual(['entry-1']);
    expect(storage.getItem(NOTEBOOK_STORAGE_KEY)).toBe(RAW);
  });

  it('a save writes it back byte for byte; an edit keeps the area unless its areas change', () => {
    const storage = new MemoryStorage();
    storage.setItem(NOTEBOOK_STORAGE_KEY, RAW);
    const { data } = loadNotebook(storage);
    expect(saveNotebook(data, storage)).toBeNull();
    expect(storage.getItem(NOTEBOOK_STORAGE_KEY)).toBe(RAW);
    vi.useFakeTimers({ now: new Date(LATER) });
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data.entries[0];
    const retitled = upsertNotebookEntry(data, { ...rest, id: 'entry-1', title: 'Overtones, again', nodeIds: [music] });
    expect(JSON.parse(exportNotebook(retitled)).entries[0]).toMatchObject({ title: 'Overtones, again', nodeIds: [GONE, music] });
    const moved = upsertNotebookEntry(data, { ...rest, id: 'entry-1', nodeIds: [physics] });
    expect(JSON.parse(exportNotebook(moved)).entries[0].nodeIds).toEqual([physics]);
    // Deleting another entry leaves it as it was.
    const other = upsertNotebookEntry(data, draft({ id: 'entry-2' }));
    expect(JSON.parse(exportNotebook(deleteNotebookEntry(other, 'entry-2')))).toEqual(JSON.parse(RAW));
  });

  it('an entry whose only area is gone saves an edit with no areas, and keeps its area', () => {
    const only = { ...stored, nodeIds: [GONE] };
    const storage = new MemoryStorage();
    storage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify({ version: 1, entries: [only] }, null, 2));
    const { data } = loadNotebook(storage);
    expect(data.entries[0].nodeIds).toEqual([]);
    vi.useFakeTimers({ now: new Date(LATER) });
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data.entries[0];
    const fixed = upsertNotebookEntry(data, { ...rest, id: 'entry-1', title: 'Overtones, spelled right', nodeIds: [] });
    expect(JSON.parse(exportNotebook(fixed)).entries[0]).toMatchObject({ title: 'Overtones, spelled right', nodeIds: [GONE] });
  });

  it('two stored copies of one ID that differ only in a gone area are a conflict, never one dropped quietly', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ ...stored, nodeIds: [GONE, music] }, { ...stored, nodeIds: [music] }] });
    expect(() => parseNotebook(raw)).toThrow(/Conflicting entries share ID/);
    // Exact copies are still one entry.
    expect(parseNotebook(JSON.stringify({ version: 1, entries: [stored, stored] })).entries).toHaveLength(1);
  });
});
