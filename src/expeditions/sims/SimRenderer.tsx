import type { ReactElement } from 'react';
import type { SimBeat } from '../content/types';
import { archetypeOf, type ArchetypeId } from './archetypes';
import { DeepTime } from './DeepTime';
import { DriftLab } from './DriftLab';
import { DropTower } from './DropTower';
import { Fluctuation } from './Fluctuation';
import { LifeChart } from './LifeChart';
import { LineageRewind } from './LineageRewind';
import { Monochord } from './Monochord';
import { MothHunt } from './MothHunt';
import { NestTest } from './NestTest';
import { PeaCross } from './PeaCross';
import { SequenceLab } from './SequenceLab';
import { SpreadMap } from './SpreadMap';
import { TradeOff } from './TradeOff';
import { TreeSpin } from './TreeSpin';
import { WaveMixer } from './WaveMixer';

type Render = (beat: SimBeat) => ReactElement;

// One renderer per archetype (sims/archetypes.ts). An archetype with several engines picks the
// engine's view by the beat's `sim`; a new engine joins its archetype here and in the catalogue.
const RENDERERS: Record<ArchetypeId, Render> = {
  population: beat => beat.sim === 'mothHunt' ? <MothHunt beat={beat} /> : beat.sim === 'driftLab' ? <DriftLab beat={beat} /> : <Fluctuation beat={beat} />,
  tree: beat => beat.sim === 'treeSpin' ? <TreeSpin beat={beat} /> : <LineageRewind beat={beat} />,
  grouping: beat => <NestTest beat={beat} />,
  timescale: beat => <DeepTime beat={beat} />,
  spread: beat => <SpreadMap beat={beat} />,
  tradeoff: beat => <TradeOff beat={beat} />,
  cross: beat => <PeaCross beat={beat} />,
  chart: beat => <LifeChart beat={beat} />,
  motion: beat => <DropTower beat={beat} />,
  ratio: beat => beat.sim === 'monochord' ? <Monochord beat={beat} /> : <WaveMixer beat={beat} />,
  sequence: beat => <SequenceLab beat={beat} />,
};

export function SimRenderer({ beat }: { beat: SimBeat }) {
  return RENDERERS[archetypeOf(beat.sim).id](beat);
}
