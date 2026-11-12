import { useId } from 'react';
import type { IndexChapter, IndexEntry, IndexItem, IndexSection, Mark } from './indexModel';
import { hue, Icon, MapMark, MARK_WORD } from './marks';
import type { Proof } from './proof';
import { LazyRow, NoProofTile, ProofTile, RefTile, Tile } from './tiles';

/*
 * The parts of the book, shared by the index and a place's own page: a chapter (a territory), its
 * sections (fields) and their entries (places), each with the row of things kept there. A thing kept
 * at several places shows its cover once and is a "see" cross-reference everywhere else. Every
 * section ends in proof: a place's own lesson or case, else the nearest one beside it, else, where
 * the atlas has none to offer yet, a mark that says so.
 */

/** How a section ends: a proof, the honest mark that there is none yet, or nothing (not known yet). */
export type Closing = Proof | 'none' | null;

export interface Handlers {
  openItem: (item: IndexItem) => void;
  openPlace: (nodeId: string) => void;
  openProof: (proof: Proof) => void;
  proof: (nodeId: string) => Proof | null;
  /** The proof that closes a section with none of its own. */
  closing: (nodeId: string) => Closing;
  /** Where a thing's cover sits on this page (elsewhere it is a cross-reference). */
  coverAt: (itemKey: string) => string | undefined;
}

const ROW_MAX = 12;
const LIT: readonly Mark[] = ['proved', 'lasting', 'refresh'];

/** The things kept at one place, as tiles (covers first, then cross-references), ending in its proof
 * and, past a dozen, the way to all of them. */
export function ItemRow({ nodeId, items, proof, handlers }: { nodeId: string; items: readonly IndexItem[]; proof: Closing; handlers: Handlers }) {
  if (!items.length && !proof) return null;
  return <LazyRow>{() => {
    const covers = items.filter(item => (handlers.coverAt(item.key) ?? nodeId) === nodeId);
    const refs = items.filter(item => (handlers.coverAt(item.key) ?? nodeId) !== nodeId);
    const shown = [...covers, ...refs].slice(0, ROW_MAX);
    return <>
      {shown.map(item => covers.includes(item)
        ? <Tile key={item.key} item={item} onOpen={handlers.openItem} hueId={nodeId} />
        : <RefTile key={item.key} item={item} at={handlers.coverAt(item.key)!} onOpen={handlers.openItem} />)}
      {items.length > ROW_MAX && <button type="button" className="lbx-tile lbx-more" style={hue(nodeId)} onClick={() => handlers.openPlace(nodeId)} data-action="lbx-more"><span className="lbx-face"><em>All {items.length}</em></span></button>}
      {proof === 'none' ? <NoProofTile nodeId={nodeId} /> : proof && <ProofTile proof={proof} here={nodeId} onOpen={handlers.openProof} />}
    </>;
  }}</LazyRow>;
}

export function EntryLine({ entry, handlers, sub }: { entry: IndexEntry; handlers: Handlers; sub?: boolean }) {
  return <button type="button" className={`lbx-line${sub ? ' is-sub' : ''}`} style={hue(entry.nodeId)} onClick={() => handlers.openPlace(entry.nodeId)} data-lbx-entry={entry.nodeId}>
    <span className="lbx-name">{entry.trail.length > 0 && <small>{entry.trail.join(' · ')} · </small>}{entry.name}</span>
    <span className="lbx-leader" aria-hidden="true"><i /></span>
    {entry.mark && <em className={`lbx-mark is-${entry.mark}`}>{MARK_WORD[entry.mark]}</em>}
    <MapMark nodeId={entry.nodeId} mark={entry.mark} />
  </button>;
}

const entryHasProof = (entry: IndexEntry, handlers: Handlers): boolean => !!handlers.proof(entry.nodeId) || entry.sub.some(sub => entryHasProof(sub, handlers));

export function Entry({ entry, handlers, closing }: { entry: IndexEntry; handlers: Handlers; closing: Closing }) {
  const lastSub = entry.sub.at(-1);
  return <li className="lbx-entry" data-lbx-at={entry.nodeId}>
    <EntryLine entry={entry} handlers={handlers} />
    <ItemRow nodeId={entry.nodeId} items={entry.items} proof={handlers.proof(entry.nodeId) ?? (!lastSub ? closing : null)} handlers={handlers} />
    {entry.sub.length > 0 && <ol className="lbx-sub">{entry.sub.map(sub => <li key={sub.nodeId} className="lbx-entry is-sub" data-lbx-at={sub.nodeId}>
      <EntryLine entry={sub} handlers={handlers} sub />
      <ItemRow nodeId={sub.nodeId} items={sub.items} proof={handlers.proof(sub.nodeId) ?? (sub === lastSub ? closing : null)} handlers={handlers} />
    </li>)}</ol>}
  </li>;
}

/** A section's entries, its closing proof found once for all of them. */
export function Entries({ entries, scope, handlers }: { entries: readonly IndexEntry[]; scope: string; handlers: Handlers }) {
  const closing = entries.some(entry => entryHasProof(entry, handlers)) ? null : handlers.closing(scope);
  return <ol className="lbx-entries">{entries.map((entry, i) => <Entry key={entry.nodeId} entry={entry} handlers={handlers} closing={i === entries.length - 1 ? closing : null} />)}</ol>;
}

export function Section({ section, handlers }: { section: IndexSection; handlers: Handlers }) {
  const closing = !section.entries.length ? handlers.closing(section.nodeId) : null;
  return <section className="lbx-section" style={hue(section.nodeId)} data-lbx-section={section.nodeId} data-lbx-at={section.nodeId}>
    <h3><button type="button" onClick={() => handlers.openPlace(section.nodeId)}>{section.name}</button></h3>
    <ItemRow nodeId={section.nodeId} items={section.items} proof={closing} handlers={handlers} />
    {section.entries.length > 0 && <Entries entries={section.entries} scope={section.nodeId} handlers={handlers} />}
  </section>;
}

export const chapterLit = (chapter: IndexChapter) => chapter.sections.some(s => LIT.includes(s.mark) || s.entries.some(e => LIT.includes(e.mark) || e.sub.some(x => LIT.includes(x.mark))));

export function Chapter({ chapter, handlers, folded, onFold }: { chapter: IndexChapter; handlers: Handlers; folded: boolean; onFold: () => void }) {
  const body = useId();
  return <section className={`lbx-chapter${folded ? ' is-folded' : ''}`} style={hue(chapter.nodeId)} id={`lbx-chapter-${chapter.number}`} data-lbx-chapter={chapter.nodeId} data-lbx-at={chapter.nodeId}>
    <header className="lbx-chapter-head">
      <button type="button" className="lbx-chapter-title" onClick={() => handlers.openPlace(chapter.nodeId)}>
        <span className="lbx-num">{chapter.number}</span>
        <h2>{chapter.name}</h2>
      </button>
      <button type="button" className="lbx-fold" onClick={onFold} aria-expanded={!folded} aria-controls={body} aria-label={`${folded ? 'Open' : 'Fold'} ${chapter.name}`} data-action="lbx-fold"><Icon name="fold" /></button>
    </header>
    {folded
      ? <p className="lbx-folded" id={body}>{chapter.sections.map(s => s.name).join(' · ')}</p>
      : <div id={body}>
        <ItemRow nodeId={chapter.nodeId} items={chapter.items} proof={!chapter.sections.length ? handlers.closing(chapter.nodeId) : null} handlers={handlers} />
        {chapter.sections.map(section => <Section key={section.nodeId} section={section} handlers={handlers} />)}
      </div>}
  </section>;
}
