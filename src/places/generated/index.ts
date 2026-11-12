import type { PlaceBundle } from '../contract';
import { place as geneticsDna } from './genetics-dna';
import { place as geneticsDominance } from './genetics-dominance';
import { place as geneticsGeneRegulation } from './genetics-gene-regulation';
import { place as geneticsMeiosis } from './genetics-meiosis';
import { place as geneticsSexLinked } from './genetics-sex-linked';
import { place as geneticsGeneToProtein } from './genetics-gene-to-protein';
import { place as geneticsGenomes } from './genetics-genomes';

/** Every place the generator made (scripts/generate/scaffold.mjs adds a line here). */
export const GENERATED_PLACES: readonly PlaceBundle[] = [
  geneticsDna,
  geneticsDominance,
  geneticsGeneRegulation,
  geneticsMeiosis,
  geneticsSexLinked,
  geneticsGeneToProtein,
  geneticsGenomes,
];
