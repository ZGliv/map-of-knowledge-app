// New cases for the hand-written places, by pack ID. Generated places carry their cases inline in
// their bundle (places/generated/). Each file is pure data, checked by validatePlace (cases.*).
import type { PlaceCase } from '../types';
import { E01_CASES } from './evolution-e01';
import { E02_CASES } from './evolution-e02';
import { E03_CASES } from './evolution-e03';
import { E04_CASES } from './evolution-e04';
import { E05_CASES } from './evolution-e05';
import { E06_CASES } from './evolution-e06';
import { E07_CASES } from './evolution-e07';
import { E08_CASES } from './evolution-e08';
import { E09_CASES } from './evolution-e09';
import { E10_CASES } from './evolution-e10';
import { E11_CASES } from './evolution-e11';
import { E12_CASES } from './evolution-e12';
import { HISTORY_CASES } from './history';
import { MUSIC_CASES } from './music';
import { PHYSICS_CASES } from './physics';

export const LEGACY_CASES: Readonly<Record<string, readonly PlaceCase[]>> = {
  'evolution-e01': E01_CASES, 'evolution-e02': E02_CASES, 'evolution-e03': E03_CASES, 'evolution-e04': E04_CASES,
  'evolution-e05': E05_CASES, 'evolution-e06': E06_CASES, 'evolution-e07': E07_CASES, 'evolution-e08': E08_CASES,
  'evolution-e09': E09_CASES, 'evolution-e10': E10_CASES, 'evolution-e11': E11_CASES, 'evolution-e12': E12_CASES,
  physics: PHYSICS_CASES, music: MUSIC_CASES, history: HISTORY_CASES,
};
