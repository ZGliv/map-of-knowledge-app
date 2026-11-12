// Readable text from a Wikipedia HTML extract, with formulas kept instead of flattened.
// The plain-text extract turns 2<sup>8</sup> = 256 into "28 = 256" and E = mc<sup>2</sup> into
// "E = mc2", and drops every sentence that holds a formula. Here a simple formula becomes text a
// reader can follow (2⁸ = 256, H₂O, a/b, √x); one too big to write on a line becomes FORMULA, which
// carries braces so the sentence splitter drops that sentence as before.

export const FORMULA = '{formula}';

const VOID = new Set(['br', 'hr', 'img', 'wbr', 'meta', 'link', 'input', 'col', 'mspace', 'mglyph', 'none', 'mprescripts']);
const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'dl', 'dd', 'dt', 'table', 'tr', 'blockquote', 'pre', 'figure', 'section']);
const SKIP = new Set(['style', 'script', 'annotation', 'annotation-xml', 'mphantom']);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', minus: '−', times: '×', hellip: '…' };
export const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
  if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  return ENTITIES[code.toLowerCase()] ?? whole;
});

/** A forgiving tree of the markup: { tag, attrs, children } with text nodes as strings. */
export function parse(html) {
  const root = { tag: '#root', attrs: '', children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*)>|[^<]+|</g;
  for (const match of html.matchAll(re)) {
    const [token, name, attrs = ''] = match;
    const top = stack.at(-1);
    if (token.startsWith('<!--')) continue;
    if (!name) { top.children.push(decode(token)); continue; }
    const tag = name.toLowerCase();
    if (token[1] === '/') {
      const at = stack.findLastIndex(node => node.tag === tag);
      if (at > 0) stack.length = at;
      continue;
    }
    const node = { tag, attrs, children: [] };
    top.children.push(node);
    if (!VOID.has(tag) && !attrs.trim().endsWith('/')) stack.push(node);
  }
  return root;
}

// Small letters only where phone system fonts draw them well (checked at 375px: no ⱼ, which renders spaced).
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', d: 'ᵈ', e: 'ᵉ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', s: 'ₛ', t: 'ₜ', x: 'ₓ' };
const single = text => /^[\p{L}\p{N}.]+$/u.test(text) || /^[−-]?\d+([.,]\d+)?$/.test(text);
const script = (text, map, mark) => {
  const plain = text.replace(/\s+/g, '');
  if (!plain) return '';
  if ([...plain].every(char => map[char])) return [...plain].map(char => map[char]).join('');
  return `${mark}${single(plain) ? plain : `(${plain})`}`;
};
export const superscript = text => script(text, SUP, '^');
export const subscript = text => script(text, SUB, '_');

/**
 * The same notation applied to text written before it: C_n → Cₙ, C_nH_(2n+2) → CₙH₂ₙ₊₂, 2^k → 2ᵏ,
 * a^(p−1) → aᵖ⁻¹, f (x) → f(x), | c₀ | → |c₀|. A script with any character lacking a small form stays.
 */
export function tidyNotation(text) {
  const swap = (map, mark) => (whole, inner) => [...inner].every(char => map[char]) ? [...inner].map(char => map[char]).join('') : whole;
  return text
    .replace(/(?<=[\p{L}\p{N})])_\(([^()\s]{1,12})\)/gu, swap(SUB))
    .replace(/(?<=[\p{L}\p{N})])_([A-Za-z0-9]{1,4})(?![\p{L}\p{N}])/gu, swap(SUB))
    // A one-character index right before the next capital, as in a formula: C_nH₂ₙ₊₂ → CₙH₂ₙ₊₂.
    .replace(/(?<=[\p{L}\p{N})])_([a-z0-9])(?=[A-Z])/gu, swap(SUB))
    .replace(/(?<=[\p{L}\p{N})])\^\(([^()\s]{1,12})\)/gu, swap(SUP))
    .replace(/(?<=[\p{L}\p{N})])\^([A-Za-z0-9]{1,3}|[−-][A-Za-z0-9]{1,3})(?![\p{L}\p{N}(])/gu, swap(SUP))
    .replace(/\b([fgh]) \(([a-zA-Z])\)/g, '$1($2)')
    .replace(/\| ([^|\s][^|]{0,10}?) \|/g, '|$1|');
}

const textOf = node => typeof node === 'string' ? node : SKIP.has(node.tag) ? '' : node.children.map(textOf).join('');
const wrap = text => /[\s+−\-=×·/]/.test(text.trim()) && !/^\(.*\)$/.test(text.trim()) ? `(${text.trim()})` : text.trim();
const BIG_OPERATOR = /^(∑|∏|∫|∮|⋃|⋂|lim|max|min|sup|inf)$/;
const ACCENT = { '¯': '̄', '‾': '̄', '^': '̂', 'ˆ': '̂', '˙': '̇', '→': '⃗', '~': '̃', '˜': '̃' };
// "|" is left out: it is a bracket (|c₀|²), not an operator.
const SPACED = new Set(['=', '+', '−', '-', '×', '÷', '·', '<', '>', '≤', '≥', '≈', '≠', '≡', '→', '⇒', '⇔', '↦', '±', '∈', '∉', '⊂', '⊆', '∪', '∩', '∝', '≅', '∼']);

class Complex extends Error {}
const elements = node => node.children.filter(child => typeof child !== 'string');

function math(node) {
  if (typeof node === 'string') return node;
  if (SKIP.has(node.tag)) return '';
  const kids = elements(node);
  switch (node.tag) {
    case 'mi': case 'mn': case 'ms': return textOf(node).trim();
    case 'mtext': return textOf(node).replace(/\s+/g, ' ');
    case 'mo': {
      const op = textOf(node).trim();
      if (BIG_OPERATOR.test(op)) throw new Complex();
      if (op === ',' || op === ';') return `${op} `;
      // Invisible function application and times: f(x) and 5x, never "f (x)" or "5 x".
      if (op === '⁡' || op === '⁢') return '';
      if (op === '⁣') return ' ';
      return SPACED.has(op) ? ` ${op} ` : op;
    }
    case 'mspace': return ' ';
    case 'msup': return math(kids[0]) + superscript(math(kids[1]));
    case 'msub': return math(kids[0]) + subscript(math(kids[1]));
    case 'msubsup': return math(kids[0]) + subscript(math(kids[1])) + superscript(math(kids[2]));
    case 'mfrac': {
      if (/linethickness="0/.test(node.attrs)) throw new Complex(); // binomial coefficients and the like
      return `${wrap(math(kids[0]))}/${wrap(math(kids[1]))}`;
    }
    case 'msqrt': return `√${wrap(kids.map(math).join(''))}`;
    case 'mroot': return `${superscript(math(kids[1]))}√${wrap(math(kids[0]))}`;
    case 'mover': {
      const mark = textOf(kids[1]).trim();
      if (ACCENT[mark] && textOf(kids[0]).trim().length === 1) return math(kids[0]) + ACCENT[mark];
      if (mark === '⏞') return math(kids[0]);
      throw new Complex();
    }
    case 'munder': {
      const mark = textOf(kids[1]).trim();
      if (mark === '⏟') return math(kids[0]);
      if (kids[0]?.tag === 'munder' && textOf(elements(kids[0])[1] ?? '').trim() === '⏟') return `${math(kids[0])} (${math(kids[1]).trim()})`;
      if (kids[0]?.tag === 'mrow' && elements(kids[0]).length === 1 && elements(kids[0])[0].tag === 'munder') return math({ ...node, children: [elements(kids[0])[0], kids[1]] });
      throw new Complex();
    }
    case 'mfenced': {
      const open = node.attrs.match(/open="([^"]*)"/)?.[1] ?? '(';
      const close = node.attrs.match(/close="([^"]*)"/)?.[1] ?? ')';
      return `${open}${kids.map(math).join(', ')}${close}`;
    }
    case 'mtable': case 'mtr': case 'mtd': case 'mmultiscripts': case 'menclose': case 'munderover': case 'mlongdiv': case 'mstack':
      throw new Complex();
    default: return node.children.map(math).join('');
  }
}

// A minus sign right after an operator, a bracket or the start is a negative sign: "x = −1", not "x = − 1".
export const tightenMinus = text => text.replace(/(^|[=(\[,<>≤≥≠≈×·+]\s?)\s*−\s+(?=[\p{L}\p{N}(√])/gu, '$1−');

/** One formula as a line of text, or FORMULA when it cannot be written on a line. */
export function formula(node) {
  try {
    const text = tightenMinus(math(node).replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+([,.;:])/g, '$1').trim());
    return text && text.length <= 60 ? text : FORMULA;
  } catch (error) {
    if (error instanceof Complex) return FORMULA;
    throw error;
  }
}

function render(node, out) {
  // A line break inside a paragraph's markup is only layout; paragraphs end at block tags.
  if (typeof node === 'string') { out.push(node.replace(/\s*\n\s*/g, ' ')); return; }
  if (SKIP.has(node.tag)) return;
  if (node.tag === 'math') {
    const text = formula(node);
    const block = /display="block"|mwe-math-element-block/.test(node.attrs);
    out.push(block ? ` ${text} ` : text);
    return;
  }
  if (node.tag === 'sup') { out.push(superscript(plain(node))); return; }
  if (node.tag === 'sub') { out.push(subscript(plain(node))); return; }
  if (node.tag === 'br') { out.push('\n'); return; }
  const block = BLOCK.has(node.tag);
  if (block) out.push('\n');
  for (const child of node.children) render(child, out);
  if (block) out.push('\n');
}
const plain = node => { const out = []; for (const child of node.children) render(child, out); return out.join(''); };

/** The extract as lines of text: one per paragraph, heading or list item, like the plain-text extract. */
export function htmlToText(html) {
  const out = [];
  render(parse(html), out);
  return out.join('').split('\n').map(line => line.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n');
}
