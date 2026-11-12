import { territoryPalette } from '../core/territoryTheme';

/** The same inherited spectrum supplies borders, earned pieces and previews. */
export function TerritoryGradient({ id, nodeId }: { id: string; nodeId: string }) {
  const palette = territoryPalette(nodeId);
  return <linearGradient id={id} x1="0%" y1="12%" x2="100%" y2="88%" colorInterpolation="sRGB">
    <stop offset="0" stopColor={palette.start}/>
    <stop offset=".5" stopColor={palette.middle}/>
    <stop offset="1" stopColor={palette.end}/>
  </linearGradient>;
}
