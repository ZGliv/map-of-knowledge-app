import { describe, expect, it } from 'vitest';
import { FORMULA, htmlToText, subscript, superscript, tidyNotation } from './wikitext.mjs';

const m = inner => `<math xmlns="http://www.w3.org/1998/Math/MathML" class="mwe-math-element mwe-math-element-inline"><mrow><mstyle displaystyle="true" scriptlevel="0">${inner}</mstyle></mrow></math>`;

describe('htmlToText', () => {
  it('keeps superscripts and subscripts instead of flattening them', () => {
    expect(htmlToText('<p>Here 2<sup>8</sup> = 256, and water is H<sub>2</sub>O.</p>')).toBe('Here 2⁸ = 256, and water is H₂O.');
    expect(htmlToText('<p>Mass and energy: <i>E</i> = <i>mc</i><sup>2</sup>.</p>')).toBe('Mass and energy: E = mc².');
    expect(htmlToText('<p><span><i>b</i><sup><i>n</i></sup></span> grows.</p>')).toBe('bⁿ grows.');
  });

  it('uses small letters where phone fonts have them, ^ and _ where they do not', () => {
    expect(superscript('x')).toBe('ˣ');
    expect(superscript('p−1')).toBe('ᵖ⁻¹');
    expect(subscript('2n+2')).toBe('₂ₙ₊₂');
    expect(superscript('q')).toBe('^q');
    expect(subscript('j')).toBe('_j');
    expect(superscript('q+1')).toBe('^(q+1)');
    expect(superscript('−9')).toBe('⁻⁹');
  });

  it('tidies text written with the older notation', () => {
    expect(tidyNotation('pK_a and C_nH_(2n+2) and 2^k − 1 and a^(p−1) − 1')).toBe('pKₐ and CₙH₂ₙ₊₂ and 2ᵏ − 1 and aᵖ⁻¹ − 1');
    expect(tidyNotation('f (x) = x² and | c₀ |² here')).toBe('f(x) = x² and |c₀|² here');
    expect(tidyNotation('SS_res stays, x_j stays, 2^(3²) stays')).toBe('SS_res stays, x_j stays, 2^(3²) stays');
    expect(tidyNotation('A plain sentence (with brackets) stays.')).toBe('A plain sentence (with brackets) stays.');
  });

  it('turns simple MathML into a line a reader can follow', () => {
    expect(htmlToText(`<p>Define ${m('<msup><mi>b</mi><mrow><mi>x</mi></mrow></msup>')} for any base.</p>`)).toBe('Define bˣ for any base.');
    expect(htmlToText(`<p>So ${m('<mfrac><mn>1</mn><mn>2</mn></mfrac><mo>+</mo><mfrac><mi>a</mi><mrow><mi>b</mi><mo>+</mo><mn>1</mn></mrow></mfrac>')} holds.</p>`)).toBe('So 1/2 + a/(b + 1) holds.');
    expect(htmlToText(`<p>Root ${m('<msqrt><mn>2</mn></msqrt>')} is irrational.</p>`)).toBe('Root √2 is irrational.');
    expect(htmlToText(`<p>Here ${m('<msub><mi>x</mi><mn>1</mn></msub><mo>,</mo><msub><mi>x</mi><mn>2</mn></msub>')} are roots.</p>`)).toBe('Here x₁, x₂ are roots.');
    expect(htmlToText(`<p>Mean ${m('<mover><mi>x</mi><mo>¯</mo></mover>')} here.</p>`)).toBe('Mean x̄ here.');
  });

  it('writes a negative sign tight against its number', () => {
    expect(htmlToText(`<p>Then ${m('<mi>x</mi><mo>=</mo><mo>−</mo><mn>1</mn>')} works.</p>`)).toBe('Then x = −1 works.');
    expect(htmlToText(`<p>And ${m('<mi>a</mi><mo>−</mo><mi>b</mi>')} stays.</p>`)).toBe('And a − b stays.');
    expect(htmlToText(`<p>Start ${m('<mo>−</mo><mi>x</mi><mo>+</mo><mn>2</mn>')} ok.</p>`)).toBe('Start −x + 2 ok.');
  });

  it('keeps an underbraced product with its label', () => {
    const product = '<msup><mi>b</mi><mi>n</mi></msup><mo>=</mo><munder><mrow><munder><mrow><mi>b</mi><mo>×</mo><mo>⋯</mo><mo>×</mo><mi>b</mi></mrow><mo>⏟</mo></munder></mrow><mrow><mi>n</mi><mtext> times</mtext></mrow></munder>';
    expect(htmlToText(`<p>That is ${m(product)}.</p>`)).toBe('That is bⁿ = b × ⋯ × b (n times).');
  });

  it('marks formulas too big for a line so their sentence is dropped', () => {
    expect(htmlToText(`<p>Sum ${m('<munderover><mo>∑</mo><mi>i</mi><mi>n</mi></munderover><mi>i</mi>')} here.</p>`)).toBe(`Sum ${FORMULA} here.`);
    expect(htmlToText(`<p>Matrix ${m('<mtable><mtr><mtd><mn>1</mn></mtd></mtr></mtable>')}.</p>`)).toBe(`Matrix ${FORMULA}.`);
    expect(htmlToText(`<p>Choose ${m('<mfrac linethickness="0"><mi>n</mi><mi>k</mi></mfrac>')}.</p>`)).toBe(`Choose ${FORMULA}.`);
  });

  it('gives one line per paragraph and heading, joining markup line breaks', () => {
    expect(htmlToText('<p>First part\nstill first.</p>\n<h2>Notation</h2>\n<p>Second &amp; last.</p>')).toBe('First part still first.\nNotation\nSecond & last.');
    expect(htmlToText('<ul><li>One item.</li><li>Two item.</li></ul>')).toBe('One item.\nTwo item.');
  });
});
