/** Charted leaves outside Evolution: one line per generated place (scripts/generate/scaffold.mjs
 * writes them). The catalog adds each leaf under its parent, and the map's manifest lights it
 * before the packs load. Pure data: the catalog imports this file. */

export interface ChartedLeaf {
  /** An existing atlas node the leaf hangs under, e.g. Genetics & Genomes. */
  readonly parent: string;
  /** Stable map key; the node ID is `${parent}.${key}`. */
  readonly key: string;
  readonly name: string;
  /** The idea the place proves, one sentence. */
  readonly claim: string;
  /** The place's pack and bundle ID (places/generated/<packId>.ts). */
  readonly packId: string;
}

export const CHARTED_LEAVES: readonly ChartedLeaf[] = [
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'dna', name: 'DNA', claim: 'Genes are stretches of DNA, and DNA copies itself by base pairing: A with T, C with G.', packId: 'genetics-dna' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'dominance', name: 'Dominance', claim: 'Dominance describes how two versions of a gene show up together: neither blends away, and dominant does not mean stronger or more common.', packId: 'genetics-dominance' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'gene-regulation', name: 'Gene switches', claim: 'Almost every cell in a body carries the same genome; cells differ because they switch different genes on and off.', packId: 'genetics-gene-regulation' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'meiosis', name: 'Meiosis and shuffling', claim: 'Meiosis halves the chromosome set and shuffles it, dealing each pair out separately and swapping stretches between partners, so siblings differ.', packId: 'genetics-meiosis' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'sex-linked', name: 'Sex-linked traits', claim: 'Genes on the X chromosome pass differently to sons and daughters: a man’s one X shows whatever it carries, while a woman needs a colour-blind copy on both, so red-green colour blindness is far more common in men.', packId: 'genetics-sex-linked' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'gene-to-protein', name: 'From gene to protein', claim: 'A gene is copied into RNA, and the RNA is read three letters at a time into the chain of amino acids that makes a protein.', packId: 'genetics-gene-to-protein' },
  { parent: 'knowledge.science.biology.genetics-genomes', key: 'genomes', name: 'Reading genomes', claim: 'A genome is the complete DNA of an organism, and comparing genomes letter by letter shows how closely living things are related.', packId: 'genetics-genomes' },
];

export const leafId = (leaf: ChartedLeaf) => `${leaf.parent}.${leaf.key}`;
