// The Wikipedia articles a provenance label names. Shared by the reel validator's context and the
// reel engine's evergreen source (scripts/reels/sources/evergreen.mjs, run by Node with type
// stripping, so this file must stay import-free).
//
//   'Wikipedia: Fungus (rev 1380255362); Opisthokont (rev 1363243090); Chitin (lead)'
//       → Fungus, Opisthokont, Chitin
//   'Wikipedia: Black Death; Black Death in Italy / France'  → Black Death, Black Death in Italy, Black Death in France
//   'Wikipedia: Dominance (genetics)'                         → Dominance (genetics)
//   'Nachman, Hoekstra & D’Agostino 2003, PNAS …; Wikipedia: Rock pocket mouse'  → Rock pocket mouse
// A label that names no Wikipedia article gives none.

/** Words that mark a parenthesis as a note about the source, not part of an article's title. */
const ASIDE = /\b(rev|section|sections|lead|quoting|citing|column|values|abstract|scan|caption|patterns|predecessors|table|fetched)\b/i;
/** A citation of a paper, not an article title. */
const CITATION = /doi:|\bet al\.|\b\d+:\d+|\bPMC\d|PubMed/;

/** Keep a short disambiguator like "(genetics)"; drop notes like "(rev. 123)" or "(Extinction patterns; Mammals)". */
function withoutAsides(text: string): string {
  let depth = 0, out = '', inner = '';
  for (const ch of text) {
    if (ch === '(') { if (depth) inner += ch; depth += 1; continue; }
    if (ch === ')' && depth) {
      depth -= 1;
      if (depth) { inner += ch; continue; }
      const note = inner.trim();
      const keep = note.split(/\s+/).length <= 3 && !/[\d;"“”]/.test(note) && !ASIDE.test(note);
      if (keep) out += `(${note})`;
      inner = '';
      continue;
    }
    if (depth) inner += ch; else out += ch;
  }
  return out;
}

export function wikipediaTitles(label: string): string[] {
  const at = label.indexOf('Wikipedia:');
  if (at < 0) return [];
  const titles: string[] = [];
  for (const raw of withoutAsides(label.slice(at + 'Wikipedia:'.length)).split(';')) {
    const part = raw.replace(/\s+/g, ' ').trim().replace(/[.,:]+$/, '');
    if (!part || CITATION.test(part)) continue;
    const [first, ...variants] = part.split(' / ').map(s => s.trim());
    titles.push(first);
    // "Black Death in Italy / France": each variant replaces the first title's last word.
    const stem = first.split(' ').slice(0, -1).join(' ');
    for (const variant of variants) if (variant) titles.push(stem ? `${stem} ${variant}` : variant);
  }
  return [...new Set(titles)];
}

/** The title, then what to try if Wikipedia has no such article: without its parenthesis, then
 * only what comes before a comma ("Extinction event, table of extinction proportions"). */
export function titleVariants(title: string): string[] {
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const head = bare.split(',')[0].trim();
  return [...new Set([title, bare, head].filter(Boolean))];
}

/** The form a cite takes: typographic apostrophes and underscores folded, first letter capital. */
export function normaliseTitle(title: string): string {
  const plain = title.replace(/[’‘]/g, "'").replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export const wikipediaCite = (title: string) => `Wikipedia: ${normaliseTitle(title)}`;
