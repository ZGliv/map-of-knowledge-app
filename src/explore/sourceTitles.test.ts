import { describe, expect, it } from 'vitest';
import { normaliseTitle, titleVariants, wikipediaCite, wikipediaTitles } from './sourceTitles';

describe('the articles a provenance label names', () => {
  it('splits lists and drops notes about the source', () => {
    expect(wikipediaTitles('Wikipedia: Fungus (rev 1380255362); Opisthokont (rev 1363243090); Chitin (lead)')).toEqual(['Fungus', 'Opisthokont', 'Chitin']);
    expect(wikipediaTitles('Wikipedia: Genetic drift (Population bottleneck; Founder effect sections)')).toEqual(['Genetic drift']);
    expect(wikipediaTitles('Wikipedia: Carnivora ("Crown carnivorans first appeared around 42 million years ago"); Feliformia')).toEqual(['Carnivora', 'Feliformia']);
  });

  it('keeps a disambiguator that is part of the title', () => {
    expect(wikipediaTitles('Wikipedia: Dominance (genetics)')).toEqual(['Dominance (genetics)']);
    expect(wikipediaTitles('Wikipedia: Lucy (Australopithecus)')).toEqual(['Lucy (Australopithecus)']);
  });

  it('expands "X in A / B" lists and finds Wikipedia after other citations', () => {
    expect(wikipediaTitles('Wikipedia: Black Death; Black Death in Italy / France')).toEqual(['Black Death', 'Black Death in Italy', 'Black Death in France']);
    expect(wikipediaTitles('Nachman, Hoekstra & D’Agostino 2003, PNAS 100:5268 (abstract); Wikipedia: Rock pocket mouse')).toEqual(['Rock pocket mouse']);
    expect(wikipediaTitles('Wikipedia: Tiktaalik; Daeschler, Shubin & Jenkins 2006, Nature 440:757, doi:10.1038/nature04639')).toEqual(['Tiktaalik']);
  });

  it('names none when the label is not Wikipedia', () => {
    expect(wikipediaTitles('Code: src/expeditions/sims/deepTimeMath.ts')).toEqual([]);
    expect(wikipediaTitles('Hutton, Theory of the Earth vol. 1 (1795), Project Gutenberg #12861')).toEqual([]);
  });

  it('tries the title, then without its parenthesis, then before a comma; cites fold apostrophes', () => {
    expect(titleVariants('Ape (Hominoidea)')).toEqual(['Ape (Hominoidea)', 'Ape']);
    expect(titleVariants('Extinction event, table of extinction proportions')).toEqual(['Extinction event, table of extinction proportions', 'Extinction event']);
    expect(normaliseTitle('hutton’s_Unconformity')).toBe("Hutton's Unconformity");
    expect(wikipediaCite('Galileo’s Leaning Tower of Pisa experiment')).toBe("Wikipedia: Galileo's Leaning Tower of Pisa experiment");
  });
});
