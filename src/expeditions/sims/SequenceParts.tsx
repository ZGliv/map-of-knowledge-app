import { useMemo, useState } from 'react';
import { STANDARD_CODE, capFirst, symbolShort, type Reading } from './sequence';
import { layout, parseNewick, tipsOf } from './tree';
import './SequenceLab.css';

// How letter strings are drawn, for the sequence lab and its cases. Letters are tiles in a mono
// face; a reading groups them into words with each word's symbol beneath, so "three letters, one
// amino acid" is something you see. Groups never break across lines, so a 375px phone shows four
// codons a row, and two strands stacked in one column always line up.

export type Mark = 'changed' | 'gone' | 'new';

const baseClass = (ch: string) => `seq-tile is-${/[ACGTU]/.test(ch) ? ch.toLowerCase() : 'x'}`;

function Tile({ ch, index, mark, tap, selected, dim }: { ch: string; index: number; mark?: Mark; tap?: (i: number) => void; selected?: boolean; dim?: boolean }) {
  const cls = `${baseClass(ch)}${mark ? ` is-${mark}` : ''}${selected ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`;
  if (tap) return <button type="button" className={cls} onClick={() => tap(index)} aria-label={`Letter ${index + 1}, ${ch}`} aria-pressed={!!selected} data-seq-letter={index + 1}>{ch}</button>;
  return <span className={cls}>{ch}</span>;
}

export interface StrandProps {
  /** Letters as shown (T for DNA, U for RNA). */
  letters: string;
  /** When given, letters are grouped into its words with each word's symbol beneath. */
  reading?: Reading | null;
  /** Words whose symbol is showing (the run reveals them one by one). Default: all. */
  shownWords?: number;
  /** Without a reading: letters per group (0 keeps one unbroken run of tiles). */
  group?: number;
  marks?: Readonly<Record<number, Mark>>;
  /** Word indexes whose symbol differs from the chain it is set against. */
  changed?: ReadonlySet<number>;
  /** Letters shown, 0-based [from, to); the rest fold into a count. */
  window?: [number, number];
  /** Number shown on the first word, when the letters are an excerpt (default 1). */
  firstWord?: number;
  onTap?: (index: number) => void;
  selected?: number | null;
  label?: string;
}

/** One strand. With a reading: lead letters, then one group per word, then any tail. */
export function Strand({ letters, reading, shownWords, group = 0, marks = {}, changed, window: win, firstWord = 1, onTap, selected, label }: StrandProps) {
  const all: { start: number; end: number; word?: number }[] = [];
  if (reading && reading.start >= 0) {
    // Letters outside the reading still fall in threes in its frame (dimmed, no symbol), so the
    // learner can count on past a stop codon or back from the start.
    const size = reading.words[0]?.word.length ?? 3;
    if (reading.start % size) all.push({ start: 0, end: reading.start % size });
    for (let i = reading.start % size; i < reading.start; i += size) all.push({ start: i, end: i + size });
    reading.words.forEach((w, k) => all.push({ start: w.at, end: w.at + w.word.length, word: k }));
    const last = reading.words.at(-1);
    for (let i = last ? last.at + last.word.length : reading.start; i < letters.length; i += size) all.push({ start: i, end: Math.min(letters.length, i + size) });
  } else {
    const size = group > 0 ? group : 1;
    for (let i = 0; i < letters.length; i += size) all.push({ start: i, end: Math.min(letters.length, i + size) });
  }
  // A window keeps whole words: a codon is never cut in half.
  const [from, to] = win ?? [0, letters.length];
  const units = all.filter(u => u.end > from && u.start < to);
  const hiddenBefore = units[0]?.start ?? 0, hiddenAfter = letters.length - (units.at(-1)?.end ?? letters.length);
  const shown = shownWords ?? Infinity;
  return (
    <div className="seq-strand" role="group" aria-label={label ?? 'Letters'}>
      {label && <p className="seq-strand__label">{capFirst(label)}</p>}
      <div className={`seq-strand__body${reading ? ' is-read' : ''}${!reading && !group ? ' is-run' : ''}`}>
        {hiddenBefore > 0 && <span className="seq-fold">{hiddenBefore.toLocaleString('en-US')} letters</span>}
        {units.map(u => {
          const tiles = Array.from({ length: u.end - u.start }, (_, j) => {
            const i = u.start + j;
            return <Tile key={i} ch={letters[i]} index={i} mark={marks[i]} tap={onTap} selected={selected === i} dim={!!reading && u.word === undefined} />;
          });
          const word = u.word !== undefined && reading ? reading.words[u.word] : null;
          if (!word) return u.end - u.start > 1 ? <span key={u.start} className="seq-group">{tiles}</span> : tiles[0];
          const k = u.word!, on = k < shown, sym = word.symbol;
          return (
            <span key={u.start} className={`seq-word${on ? ' is-on' : ''}${sym === '*' ? ' is-stop' : ''}${k === 0 ? ' is-first' : ''}${changed?.has(k) ? ' is-changed' : ''}`} data-seq-word={k + firstWord}>
              <span className="seq-group">{tiles}</span>
              <span className="seq-symbol">{on ? symbolShort(sym) : '\u00a0'}</span>
            </span>
          );
        })}
        {hiddenAfter > 0 && <span className="seq-fold">{hiddenAfter.toLocaleString('en-US')} letters</span>}
      </div>
    </div>
  );
}

/** Two strands letter for letter, one column per letter, grouped so they wrap together. */
export function Paired({ top, bottom, shown, labels, group = 3 }: { top: string; bottom: string; shown: number; labels: [string, string]; group?: number }) {
  const cols = Array.from({ length: Math.ceil(top.length / group) }, (_, g) => g * group);
  return (
    <div className="seq-paired" role="group" aria-label={`${labels[0]} above, ${labels[1]} below`}>
      <p className="seq-legend"><span>Above: {capFirst(labels[0])}</span><span>Below: {capFirst(labels[1])}</span></p>
      <div className="seq-strand__body">
        {cols.map(at => (
          <span key={at} className="seq-pair">
            {Array.from({ length: Math.min(group, top.length - at) }, (_, j) => {
              const i = at + j;
              return (
                <span key={i} className="seq-col">
                  <span className={baseClass(top[i])}>{top[i]}</span>
                  <span className="seq-rung" aria-hidden="true" />
                  {i < shown ? <span className={`${baseClass(bottom[i])} is-made`}>{bottom[i]}</span> : <span className="seq-tile is-empty" aria-hidden="true">·</span>}
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Several strings lined up, one column per position, with the columns that differ marked. Every
 * row of every block starts with its number in the legend, so no row order has to be held in mind. */
export function Aligned({ rows, group = 10, marked }: { rows: { id: string; label: string; letters: string }[]; group?: number; marked: boolean }) {
  const n = Math.max(...rows.map(r => r.letters.length));
  const differs = (i: number) => new Set(rows.map(r => r.letters[i] ?? '')).size > 1;
  const cols = Array.from({ length: Math.ceil(n / group) }, (_, g) => g * group);
  return (
    <div className="seq-aligned" role="group" aria-label={rows.map(r => capFirst(r.label)).join(', ')}>
      <ol className="seq-legend is-rows">{rows.map(r => <li key={r.id}>{capFirst(r.label)}</li>)}</ol>
      <div className="seq-strand__body">
        {cols.map(at => (
          <span key={at} className="seq-block">
            {rows.map((r, k) => (
              <span key={r.id} className="seq-group" data-row={k + 1}>
                <span className="seq-rownum" aria-hidden="true">{k + 1}</span>
                {Array.from({ length: Math.min(group, n - at) }, (_, j) => {
                  const i = at + j, ch = r.letters[i] ?? ' ';
                  return <span key={i} className={`${baseClass(ch)}${ch === '-' ? ' is-gap' : ''}${marked && differs(i) ? ' is-diff' : ''}`}>{ch}</span>;
                })}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

const ORDER = 'UCAG';

/** The 64 codons, first letter down the side, second across the top: a reference, opened on tap. */
export function CodonTable({ kind = 'rna' }: { kind?: 'dna' | 'rna' }) {
  const [open, setOpen] = useState(false);
  const show = (s: string) => kind === 'dna' ? s.replaceAll('U', 'T') : s;
  return (
    <div className="seq-table">
      <button type="button" className="seq-table__toggle" aria-expanded={open} onClick={() => setOpen(o => !o)} data-action="seq-table">Codon table</button>
      {open && (
        <table className="seq-table__grid">
          <tbody>
            {[...ORDER].flatMap(first => [...ORDER].map(third => (
              <tr key={first + third} className={third === 'U' ? 'is-block' : undefined}>
                {[...ORDER].map(second => {
                  const codon = first + second + third, sym = STANDARD_CODE[codon];
                  return <td key={codon} className={sym === '*' ? 'is-stop' : codon === 'AUG' ? 'is-start' : undefined}><code>{show(codon)}</code> {symbolShort(sym)}</td>;
                })}
              </tr>
            )))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** A family tree from a citable source, drawn once the letters have been compared: the reveal. */
export interface TreeReveal {
  /** Heading above the tree. */
  title: string;
  /** The tree as fetched (Open Tree of Life induced subtree, unary nodes collapsed). */
  newick: string;
  /** Tip ID → name on screen. */
  tips: Record<string, string>;
  /** Tips whose letters the lab lined up; they stand out. */
  marked?: string[];
  /** Shown under the tree. */
  credit: string;
}

const TW = 600, TROW = 50, TTOP = 20, TLABEL = 290, TLEFT = 14;

/** A still tree, branch points on the left and the living tips on the right. Nothing to tap. */
export function TreeFigure({ reveal }: { reveal: TreeReveal }) {
  const root = useMemo(() => parseNewick(reveal.newick), [reveal.newick]);
  const placed = useMemo(() => layout(root), [root]);
  const depth = Math.max(...[...placed.values()].map(n => n.x));
  const pt = (x: number, y: number) => ({ x: TLEFT + (x / depth) * (TW - TLABEL - TLEFT - 12), y: TTOP + y * TROW + TROW / 2 });
  const tips = tipsOf(root);
  const H = TTOP * 2 + tips.length * TROW;
  const marked = new Set(reveal.marked ?? []);
  const lines: string[] = [];
  for (const n of placed.values()) {
    if (n.tip) continue;
    const a = pt(n.x, n.y), kids = n.children.map(id => placed.get(id)!);
    lines.push(`M${a.x},${Math.min(...kids.map(k => pt(k.x, k.y).y))}V${Math.max(...kids.map(k => pt(k.x, k.y).y))}`);
    for (const k of kids) { const b = pt(k.x, k.y); lines.push(`M${a.x},${b.y}H${b.x}`); }
  }
  const top = pt(placed.get(root.id)!.x, placed.get(root.id)!.y);
  return (
    <figure className="seq-tree" data-seq-reveal>
      <h3 className="seqlab__title">{reveal.title}</h3>
      <svg viewBox={`0 0 ${TW} ${H}`} role="img" aria-label={`Family tree of ${tips.map(id => reveal.tips[id] ?? id).join(', ')}`}>
        <path d={`M${TLEFT - 10},${top.y}H${top.x}`} className="seq-tree__line" />
        {lines.map((d, i) => <path key={i} d={d} className="seq-tree__line" />)}
        {tips.map(id => {
          const p = pt(placed.get(id)!.x, placed.get(id)!.y);
          return (
            <g key={id} className={`seq-tree__tip${marked.has(id) ? ' is-marked' : ''}`} transform={`translate(${p.x},${p.y})`}>
              <circle r="5" />
              <text x="14" y="8">{reveal.tips[id] ?? id}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="seq-tree__credit">{reveal.credit}</figcaption>
    </figure>
  );
}
