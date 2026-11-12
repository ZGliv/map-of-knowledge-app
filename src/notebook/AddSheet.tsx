import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import { Glyph, ItemCover } from './covers';
import { applyImport, IMPORT_LIMITS, parseLibraryCsv, type ImportPlan, type ParsedImport } from './importCsv';
import { statusWord, useSheetFocus } from './ItemSheet';
import { domainOf, liveItems, LIBRARY_LIMITS, nextStatus, normalizeUrl, setStatus, entryKey, type ItemStatus, type LibraryEntry, type LibraryStore } from './libraryStore';
import { LinkFields, splitPaste, useLinkDraft, type LinkDraft } from './LinkSheet';
import { CatalogError, sameBook, searchBooks, type BookResult } from './openLibrary';
import { sameScreen, searchScreen, type ScreenResult } from './wikidata';

/*
 * The + sheet: add anything. Type to search books (Open Library) and films, documentaries, series,
 * podcasts and courses (Wikidata); paste a link to save it with what the page says about itself; or
 * bring a Goodreads or StoryGraph export in.
 */

export type FoundItem = BookResult | ScreenResult;
export const foundKey = (found: FoundItem) => found.source === 'ol' ? `ol:${found.workId}` : `wd:${found.qid}`;

export interface AddSheetProps {
  library: LibraryStore;
  initialNodeId: string | null;
  onSaveLink: (draft: LinkDraft) => string | null;
  /** Add a found item with a status; returns its library key, or an error. */
  onAdd: (found: FoundItem, status: ItemStatus) => { key: string } | { error: string };
  onChange: (change: (library: LibraryStore) => LibraryStore) => string | null;
  onOpenFound: (found: FoundItem) => void;
  onOpenItem: (key: string) => void;
  /** Further ways in, shown above the import before anything is typed. */
  more?: ReactNode;
  /** The import is in the library: close, and show the map filling in. */
  onImported: (summary: { plan: ImportPlan; source: ParsedImport['source']; lookup: string[] }) => void;
  onClose: () => void;
}

type Search = { query: string; books: BookResult[] | null; screen: ScreenResult[] | null; failed: string[] };

/** Search both catalogs as the learner types; the newer search always wins. */
function useCatalogSearch(query: string): Search {
  const [search, setSearch] = useState<Search>({ query: '', books: null, screen: null, failed: [] });
  useEffect(() => {
    const words = query.trim();
    if (words.length < 2) { setSearch({ query: '', books: null, screen: null, failed: [] }); return; }
    const controller = new AbortController();
    setSearch(current => current.query === words ? current : { query: words, books: null, screen: null, failed: [] });
    const timer = setTimeout(() => {
      const fail = (which: string) => (error: unknown) => {
        if (error instanceof CatalogError && error.kind === 'aborted') return;
        if (!controller.signal.aborted) setSearch(current => current.query === words ? { ...current, failed: [...current.failed, which] } : current);
      };
      searchBooks(words, { signal: controller.signal }).then(books => { if (!controller.signal.aborted) setSearch(current => current.query === words ? { ...current, books } : current); }, fail('books'));
      searchScreen(words, { signal: controller.signal }).then(screen => { if (!controller.signal.aborted) setSearch(current => current.query === words ? { ...current, screen } : current); }, fail('screen'));
    }, 380);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  return search;
}

function FoundRow({ found, mine, onAdd, onStep, onOpen }: { found: FoundItem; mine: LibraryEntry | undefined; onAdd: () => void; onStep: () => void; onOpen: () => void }) {
  const kind = found.source === 'ol' ? 'book' : found.kind;
  const format = found.source === 'ol' ? 'Book' : found.format;
  const step = mine ? nextStatus(mine.status) : null;
  return <div className="lib-row lib-found" data-found={foundKey(found)}>
    <button type="button" className="lib-found-open" onClick={onOpen} data-action="open-found">
      <ItemCover title={found.title} creator={found.creator} cover={found.source === 'ol' ? found.cover : null} tone={foundKey(found)} size="small" />
      <span className="lib-row-main">
        <strong>{found.title}</strong>
        <small>{[found.creator, found.year, format].filter(Boolean).join(' · ')}</small>
        {found.source === 'wd' && found.description && <small className="lib-found-about">{found.description}</small>}
      </span>
    </button>
    {mine
      ? <button type="button" className={`lib-step is-${mine.status}`} onClick={onStep} disabled={!step} aria-label={step ? `${found.title}: ${statusWord(kind, mine.status)}. Mark as ${statusWord(kind, step).toLowerCase()}` : `${found.title}: ${statusWord(kind, mine.status)}`} data-action="found-status">
        {mine.status === 'finished' && <Glyph name="check" />}{statusWord(kind, mine.status)}
      </button>
      : <button type="button" className="lib-icon lib-add-found" onClick={onAdd} aria-label={`Add ${found.title}`} data-action="add-found"><Glyph name="plus" /></button>}
  </div>;
}

function ImportView({ parsed, plan, busy, onCancel, onConfirm }: { parsed: ParsedImport; plan: ImportPlan; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const name = parsed.source === 'goodreads' ? 'Goodreads' : 'The StoryGraph';
  const counts = [
    plan.byStatus.finished && `${plan.byStatus.finished} read`, plan.byStatus.started && `${plan.byStatus.started} reading`,
    plan.byStatus.want && `${plan.byStatus.want} to read`, plan.byStatus.stopped && `${plan.byStatus.stopped} set down`,
  ].filter(Boolean).join(' · ');
  return <div className="lib-import" data-import-plan="">
    <h2>{name}</h2>
    <p className="lib-import-count"><b>{parsed.rows.length}</b> {parsed.rows.length === 1 ? 'book' : 'books'}</p>
    <p className="lib-import-detail">{counts}</p>
    {(plan.updated > 0 || plan.unchanged > 0) && <p className="lib-import-detail">{plan.updated + plan.unchanged} already in your library{plan.updated ? `, ${plan.updated} brought up to date` : ''}</p>}
    {plan.skipped > 0 && <p className="lib-import-detail">{plan.skipped} left out: removed here before, or past what one library holds</p>}
    {parsed.skipped > 0 && <p className="lib-import-detail">{parsed.skipped} {parsed.skipped === 1 ? 'row' : 'rows'} without a title</p>}
    <footer className="lib-sheet-foot">
      <button type="button" className="lib-quiet" onClick={onCancel}>Cancel</button>
      <button type="button" className="lib-open" onClick={onConfirm} disabled={busy || plan.added + plan.updated === 0} data-action="confirm-import">
        {plan.added ? `Add ${plan.added} ${plan.added === 1 ? 'book' : 'books'}` : plan.updated ? 'Bring up to date' : 'Nothing new'}
      </button>
    </footer>
  </div>;
}

export function AddSheet(props: AddSheetProps) {
  const { library } = props;
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState<{ parsed: ParsedImport; plan: ImportPlan } | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLFormElement>(null);
  const id = useId();
  useSheetFocus(sheet, props.onClose, () => field.current);

  const url = normalizeUrl(input);
  const linkMode = !!url;
  const draft = useLinkDraft(linkMode ? input : '', undefined, props.initialNodeId);
  const search = useCatalogSearch(linkMode || importing ? '' : input);
  const items = useMemo(() => liveItems(library), [library]);
  const mineFor = (found: FoundItem) => items.find(entry => found.source === 'ol' ? sameBook(entry, found) : sameScreen(entry, found));

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const split = splitPaste(event.clipboardData.getData('text'));
    if (!split) return;
    event.preventDefault();
    setInput(split.url);
    if (split.note && !draft.note) draft.setNote(split.note.slice(0, LIBRARY_LIMITS.note));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (importing) return;
    if (!url) {
      setError(input.trim() ? 'Choose a result, or paste a complete web address.' : 'Paste a link, or search for a book, film or podcast.');
      field.current?.focus();
      return;
    }
    const problem = props.onSaveLink({ url: input, note: draft.note, nodeId: draft.nodeId, preview: draft.preview });
    if (problem) setError(problem); else props.onClose();
  };
  const add = (found: FoundItem) => { const result = props.onAdd(found, 'want'); if ('error' in result) setError(result.error); };
  const step = (entry: LibraryEntry) => { const next = nextStatus(entry.status); if (next) { const problem = props.onChange(current => setStatus(current, entryKey(entry), next)); if (problem) setError(problem); } };

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    setError('');
    try {
      if (chosen.size > IMPORT_LIMITS.bytes) throw new Error('This file is larger than 10 MB. Export it again, or split it.');
      const parsed = parseLibraryCsv(await chosen.text());
      setImporting({ parsed, plan: applyImport(library, parsed).plan });
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'This file could not be read.'); }
  }
  function confirmImport() {
    if (!importing) return;
    setBusy(true);
    let result: ReturnType<typeof applyImport> | null = null;
    const problem = props.onChange(current => { result = applyImport(current, importing.parsed); return result.library; });
    setBusy(false);
    if (problem || !result) { setError(problem ?? 'This import could not be kept.'); return; }
    const done = result as ReturnType<typeof applyImport>;
    props.onImported({ plan: done.plan, source: importing.parsed.source, lookup: done.lookup });
  }

  const results: { title: string; list: FoundItem[] | null; failed: boolean; group: string }[] = [
    { title: 'Books', list: search.books, failed: search.failed.includes('books'), group: 'books' },
    { title: 'Films, series, podcasts and courses', list: search.screen, failed: search.failed.includes('screen'), group: 'screen' },
  ];
  const searching = !linkMode && input.trim().length >= 2;

  return <div className="lib-sheet-backdrop" onClick={props.onClose}>
    <form ref={sheet} className="lib-sheet lib-add-sheet" role="dialog" aria-modal="true" aria-label="Add to your library" onClick={event => event.stopPropagation()} onSubmit={submit} noValidate data-link-sheet="" data-add-sheet={importing ? 'import' : linkMode ? 'link' : searching ? 'search' : 'start'}>
      <span className="lib-grab" aria-hidden="true" />
      {importing ? <ImportView parsed={importing.parsed} plan={importing.plan} busy={busy} onCancel={() => setImporting(null)} onConfirm={confirmImport} /> : <>
        <label className="lib-field lib-add-field" htmlFor={`${id}-q`}>
          <Glyph name={linkMode ? 'link' : 'search'} />
          <span className="sr-only">Search, or paste a link</span>
          <input ref={field} id={`${id}-q`} type="text" inputMode={linkMode ? 'url' : 'search'} autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off"
            placeholder="Search books, films, podcasts, or paste a link" value={input} enterKeyHint={linkMode ? 'done' : 'search'}
            onChange={event => { setInput(event.target.value); setError(''); }} onPaste={paste} data-action="link-url" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
          {linkMode ? <small className="lib-domain">{domainOf(url!)}</small> : input && <button type="button" className="lib-icon" onClick={() => { setInput(''); field.current?.focus(); }} aria-label="Clear"><Glyph name="close" /></button>}
        </label>

        {linkMode && <LinkFields url={input} note={draft.note} onNote={draft.setNote} nodeId={draft.nodeId} onPlace={draft.onPlace} touchedPlace={draft.touchedPlace} preview={draft.preview} loading={draft.loading} error="" noteId={`${id}-note`} />}

        {searching && <div className="lib-found-list" aria-live="polite">
          {results.map(group => <section key={group.group} className="lib-group" data-found-group={group.group}>
            <h2>{group.title}{group.list && group.list.length > 0 && <small>{group.list.length}</small>}</h2>
            {group.list === null && !group.failed && <p className="lib-searching" aria-label="Searching"><span /><span /><span /></p>}
            {group.failed && <p className="lib-none is-small">{group.group === 'books' ? 'Open Library' : 'Wikidata'} could not be reached.</p>}
            {group.list?.length === 0 && <p className="lib-none is-small">Nothing found.</p>}
            {group.list?.map(found => {
              const mine = mineFor(found);
              return <FoundRow key={foundKey(found)} found={found} mine={mine} onAdd={() => add(found)} onStep={() => mine && step(mine)} onOpen={() => mine ? props.onOpenItem(entryKey(mine)) : props.onOpenFound(found)} />;
            })}
          </section>)}
        </div>}

        {!linkMode && !searching && <div className="lib-add-start">
          {props.more}
          <button type="button" className="lib-row is-button" onClick={() => file.current?.click()} data-action="import-csv">
            <span className="lib-link-mark" aria-hidden="true"><Glyph name="upload" /></span>
            <span className="lib-row-main"><strong>Import from Goodreads or StoryGraph</strong><small>Their CSV export</small></span>
          </button>
          <input ref={file} type="file" accept=".csv,text/csv" hidden aria-label="Import a Goodreads or StoryGraph export" onChange={chooseFile} />
        </div>}

        {error && <p className="lib-error" id={`${id}-error`} role="alert">{error}</p>}
        {!searching && <footer className="lib-sheet-foot">
          <button type="button" className="lib-quiet" onClick={props.onClose}>Cancel</button>
          <button type="submit" className="lib-open" data-action="save-link">Save</button>
        </footer>}
      </>}
    </form>
  </div>;
}
