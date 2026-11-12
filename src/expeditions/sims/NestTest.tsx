import { useMemo, useState } from 'react';
import type { Choice, SimBeat } from '../content/types';
import { useBeat } from '../engine/context';
import { Question } from '../blocks/ui';
import { crossings, outline, placeFind, type Taxon, type Trait } from './nesting';
import './NestTest.css';

// Groups inside groups. The learner switches on shared traits one at a time and watches
// each group land inside the last. Then a test: which new find would have nowhere to go?

export type Params = {
  taxa: Taxon[];
  traits: Trait[];
  /** Said once every trait is showing. */
  allOn: string;
  /** `label` names the find in the question; `short` names it in the tree. */
  candidates: (Taxon & { short: string; verdict: string })[];
  questions: { gradeId: string; prompt: string; choices: Choice[]; answer: string; explain: string }[];
  credit: string;
};

const ROW = 34, INDENT = 16;

export function NestTest({ beat }: { beat: SimBeat }) {
  const { done, evidenceFor } = useBeat();
  const p = beat.params as unknown as Params;
  const q = p.questions[0];
  const answered = !!evidenceFor(q.gradeId);
  const [shown, setShown] = useState<string[]>(answered ? p.traits.map(t => t.id) : [p.traits[0].id]);
  const [findId, setFindId] = useState<string | null>(null);
  const allOn = shown.length === p.traits.length;
  const find = p.candidates.find(c => c.id === findId) ?? null;
  const ordered = p.traits.map(t => t.id).filter(id => shown.includes(id));
  const placed = useMemo(() => find ? placeFind(p.taxa, ordered, find) : null, [find, p.taxa, ordered]);
  const taxa = useMemo(() => find && placed ? [...p.taxa.slice(0, placed.slot), { ...find, label: find.short }, ...p.taxa.slice(placed.slot)] : p.taxa, [find, placed, p.taxa]);
  const rows = useMemo(() => outline(taxa, ordered), [taxa, ordered]);
  const crossed = new Set(crossings(taxa, ordered).flat());
  const label = (id: string) => p.traits.find(t => t.id === id)!.label;
  const toggle = (id: string) => setShown(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const maxDepth = Math.max(0, ...rows.map(r => r.depth));

  return (
    <section className="beat beat--wide">
      <h2 className="beat__heading">{beat.title}</h2>
      <p className="goal">{beat.goal}</p>
      <div className="nest">
        <div className="nest__traits" role="group" aria-label="Shared traits">
          {p.traits.map(t => (
            <button key={t.id} type="button" className="nest__trait" aria-pressed={shown.includes(t.id)} onClick={() => toggle(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="nest__tree" style={{ height: rows.length * ROW + 6, ['--indent' as string]: `${INDENT}px` }} role="list" aria-label="Animals grouped by shared traits">
          {rows.map((row, i) => {
            const key = row.kind === 'group' ? `g-${row.trait}` : `t-${row.taxon.id}`;
            if (row.kind === 'group') {
              const cross = crossed.has(row.trait);
              // Two crossing groups at the same depth would share one bar; nudge the later one so both show.
              const nudge = cross ? rows.slice(0, i).filter(r => r.kind === 'group' && r.depth === row.depth && crossed.has(r.trait)).length * 9 : 0;
              return (
                <div key={key} className={`nest__group${cross ? ' is-cross' : ''}`} style={{ top: i * ROW, left: row.depth * INDENT + nudge }} role="listitem">
                  <span className="nest__name">{label(row.trait)}</span>
                  <i className="nest__bar" style={{ height: Math.max(ROW, (row.end - i) * ROW - ROW / 2 + 4) }} aria-hidden="true" />
                </div>
              );
            }
            const isFind = find && row.taxon.id === find.id;
            return (
              <div key={key} className={`nest__taxon${isFind ? (placed?.fits ? ' is-find is-fits' : ' is-find is-breaks') : ''}`} style={{ top: i * ROW, left: Math.min(row.depth, maxDepth) * INDENT + 10 }} role="listitem">
                {row.taxon.label}
              </div>
            );
          })}
        </div>
        {find && <p className={`nest__verdict${placed?.fits ? '' : ' is-breaks'}`} aria-live="polite">{find.verdict}</p>}
        {!find && allOn && <p className="nest__verdict">{p.allOn}</p>}
        {answered && (
          <div className="nest__finds" role="radiogroup" aria-label="Add a find">
            {p.candidates.map(c => (
              <button key={c.id} type="button" role="radio" aria-checked={c.id === findId} className={`chip${c.id === findId ? ' is-on' : ''}`} onClick={() => setFindId(id => id === c.id ? null : c.id)}>{c.label}</button>
            ))}
          </div>
        )}
        <div className="sr-only"><table>
          <caption>Which animals share which traits</caption>
          <thead><tr><th>Animal</th>{p.traits.map(t => <th key={t.id}>{t.label}</th>)}</tr></thead>
          <tbody>{p.taxa.map(t => <tr key={t.id}><td>{t.label}</td>{p.traits.map(tr => <td key={tr.id}>{t.traits.includes(tr.id) ? 'yes' : 'no'}</td>)}</tr>)}</tbody>
        </table></div>
      </div>
      {allOn && (
        <Question gradeId={q.gradeId} transfer={beat.grades?.find(g => g.gradeId === q.gradeId)?.transfer} prompt={q.prompt} choices={q.choices} answer={q.answer}
          explain={q.explain} onDone={() => { setFindId(q.answer); done(); }} />
      )}
      <p className="credit-line">{p.credit}</p>
    </section>
  );
}
