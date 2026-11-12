import type { ReactNode } from 'react';
import { runsOf } from './cross';
import './CrossGrid.css';

// The sixteen equally likely boxes of a two-gene cross. Rows are the first gene's four boxes and
// columns the second's (cross.ts boxesByLook), so multiplying is area: a band three rows tall
// crossed with a band one column wide covers three cells. Equal looks share one header, and a
// cell carries no text: what it is reads off its row and column. Used by a new case's picture
// (cases/views.tsx) and the pea-cross sim (PeaCross.tsx).

export interface CrossGridProps {
  /** The first gene's four boxes, as phenotype keys in drawing order. */
  rows: string[];
  /** The second gene's four boxes, likewise. */
  cols: string[];
  rowLabel: (key: string) => string;
  colLabel: (key: string) => string;
  /** What one box draws, from its two looks. */
  cell: (row: string, col: string) => ReactNode;
  /** Boxes the call is about, ringed. */
  marked?: (row: string, col: string) => boolean;
  label: string;
}

export function CrossGrid({ rows, cols, rowLabel, colLabel, cell, marked, label }: CrossGridProps) {
  const rowRuns = runsOf(rows), colRuns = runsOf(cols);
  const rowStarts = new Map<number, number>();
  rowRuns.reduce((at, [, n]) => { rowStarts.set(at, n); return at + n; }, 0);
  const colStarts = new Set<number>();
  colRuns.reduce((at, [, n]) => { colStarts.add(at); return at + n; }, 0);
  return (
    <table className="cross-grid" aria-label={label}>
      <colgroup><col className="cross-grid__heads" />{cols.map((_, i) => <col key={i} />)}</colgroup>
      <thead><tr><td />{colRuns.map(([key, n], i) => <th key={i} colSpan={n} scope="colgroup">{colLabel(key)}</th>)}</tr></thead>
      <tbody>{rows.map((row, r) => (
        <tr key={r} className={rowStarts.has(r) && r ? 'is-group' : undefined}>
          {rowStarts.has(r) && <th rowSpan={rowStarts.get(r)} scope="rowgroup">{rowLabel(row)}</th>}
          {cols.map((col, c) => <td key={c} className={[colStarts.has(c) && c ? 'is-group' : '', marked?.(row, col) ? 'is-marked' : ''].filter(Boolean).join(' ') || undefined}>{cell(row, col)}</td>)}
        </tr>
      ))}</tbody>
    </table>
  );
}
