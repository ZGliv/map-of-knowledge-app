import {describe,it,expect} from 'vitest';
import {CatalogStore} from './catalog';
import {SAMPLE_TERRITORIES,sampleLeaf} from './sampleTerritories';
import {territoryHueRange} from './territoryTheme';
import {SpatialLayoutEngine} from '../spatial/SpatialLayoutEngine';
import {projectCompletion} from '../spatial/CompletionProjection';

describe('deep illustrative map routes',()=>{
 it('reaches one meaningful terminal sample at the end of every subject route',()=>{
  const store=new CatalogStore();expect(SAMPLE_TERRITORIES).toHaveLength(8);
  for(const sample of SAMPLE_TERRITORIES){
   const leaf=store.get(sampleLeaf(sample.subject))!;
   expect(leaf.depth).toBe(sample.levels.length+2);expect(leaf.depth).toBeGreaterThanOrEqual(5);expect(store.getChildren(leaf)).toHaveLength(0);
   const path=store.getPath(leaf);expect(path).toHaveLength(leaf.depth+1);
   const leafHues=territoryHueRange(leaf.id);const subjectHues=territoryHueRange(`knowledge.${sample.subject}`);
   expect(leafHues[0]).toBeGreaterThanOrEqual(subjectHues[0]);expect(leafHues[1]).toBeLessThanOrEqual(subjectHues[1]);
   // No place on a route holds a single place: zooming into it would go nowhere.
   for(const node of path.slice(2,-1))expect(store.getChildren(node).length).toBeGreaterThanOrEqual(2);
  }
 });
 it('projects samples into tiny real footprints without coloring their ancestors',()=>{
  const store=new CatalogStore();const engine=new SpatialLayoutEngine();
  for(const [width,height] of [[390,523],[1440,588]]){
   const clip=[[0,0],[0,height],[width,height],[width,0]] as const;
   for(const sample of SAMPLE_TERRITORIES){
    const id=sampleLeaf(sample.subject);const mark=projectCompletion({store,layoutEngine:engine,scope:store.root,clip,completedId:id})!;
    expect(mark.nodeId).toBe(id);expect(mark.relativeDepth).toBe(sample.levels.length+2);
    expect(mark.estimatedArea).toBeGreaterThan(0);expect(mark.estimatedArea).toBeLessThan(64); // a dot under 8 px square at the world view, even on the shallowest route
    expect(mark.centroid.every(Number.isFinite)).toBe(true);
   }
  }
 });
});
