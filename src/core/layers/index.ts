import science from './science.json';
import technology from './technology.json';
import humanities from './humanities.json';
import society from './society.json';
import mathematics from './mathematics.json';
import arts from './arts.json';
import earth from './earth.json';
import economics from './economics.json';

/**
 * The atlas's general layers: for each parent ID, the names of the territories under it, so that
 * every subject runs at least four levels deep below its fields. Pure data; the catalog adds each
 * child as `${parentId}.${slug(name)}`. Places that hold content are never parents here.
 */
export const ATLAS_LAYERS: Readonly<Record<string, readonly string[]>> = {
  ...science, ...technology, ...humanities, ...society, ...mathematics, ...arts, ...earth, ...economics,
};
