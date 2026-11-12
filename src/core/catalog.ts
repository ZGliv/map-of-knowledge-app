import {SAMPLE_TERRITORIES,slug} from './sampleTerritories';
import {BIOLOGY_FIELDS,BIOLOGY_ID,EVOLUTION_ID,EVOLUTION_OVERVIEW,EVOLUTION_TERRITORIES,evolutionTerritoryId} from './evolution';
import {BLACK_DEATH,HISTORY_ID,MEDIEVAL_WORLD} from './history';
import {CHARTED_LEAVES,leafId} from './places';
import {ATLAS_LAYERS} from './layers';
import {NodeStore} from '../spatial/NodeStore';
import type {KnowledgeNode} from '../spatial/types';
import type {ObjectiveKey} from './contracts';
export interface AtlasNode extends KnowledgeNode { subtitle?:string; description?:string; objective?:ObjectiveKey; motif?:number; sample?:boolean }
const definitions: [string,string,string[]][] = [
 ['science','Science',['Physics','Biology','Chemistry','Astronomy','Medicine']],
 ['technology','Technology',['Computing','Engineering','Materials','Energy','Networks']],
 ['humanities','Humanities',['History','Philosophy','Languages','Literature','Archaeology']],
 ['society','Society',['Psychology','Sociology','Politics','Anthropology','Education']],
 ['mathematics','Mathematics',['Foundations','Algebra','Geometry','Analysis','Probability','Logic']],
 ['arts','Arts',['Music','Visual Arts','Architecture','Theatre','Design']],
 ['earth','Earth',['Climate','Oceans','Geology','Ecology','Geography']],
 ['economics','Economics',['Markets','Exchange','Money','Institutions','Decision Theory']],
];
export const concepts:{key:ObjectiveKey;title:string;subtitle:string;objectiveTitle:string;future:string[]}[]=[
 {key:'pair-surplus',title:'Correspondence',subtitle:'One thing for another',objectiveTitle:'Pairing & surplus',future:['Relations','Infinite sets']},
 {key:'quantity-symbol',title:'Number',subtitle:'Giving quantity a name',objectiveTitle:'Quantity & symbol',future:['Numeral systems','Place value']},
 {key:'count-invariance',title:'Cardinality',subtitle:'What stays the same',objectiveTitle:'Quantity under change',future:['Sets','Conservation']},
 {key:'zero-empty',title:'Zero',subtitle:'A place for nothing',objectiveTitle:'The empty collection',future:['Additive identity','Signed numbers']},
 {key:'equal-units',title:'Unitizing',subtitle:'Choosing what counts as one',objectiveTitle:'Repeated equal units',future:['Composite units','Scaling']},
 {key:'unit-path',title:'Number Line',subtitle:'Number becomes position',objectiveTitle:'Steps from an origin',future:['Negative positions','Real numbers']},
 {key:'measure-interval',title:'Measurement',subtitle:'The space between marks',objectiveTitle:'Origin, unit & interval',future:['Dimensional analysis','Precision']},
 {key:'quarter-unit-path',title:'Fractions',subtitle:'Beyond a whole',objectiveTitle:'Quarter units past one',future:['Equivalent fractions','Rational arithmetic']},
];
export const MATH_ID='knowledge.mathematics';
export const FOUNDATIONS_ID=MATH_ID+'.foundations';
export const conceptNodeId=(key:ObjectiveKey)=>FOUNDATIONS_ID+'.'+key;
export const objectiveNodeId=(key:ObjectiveKey)=>conceptNodeId(key)+'.demonstration';
export class CatalogStore extends NodeStore {
 override readonly root:AtlasNode={id:'knowledge',name:'The map',parentId:null,depth:0,index:0,weight:1,subtitle:'A world of connected ideas'};
 private readonly catalog=new Map<string,AtlasNode>();
 private readonly edges=new Map<string,AtlasNode[]>();
 constructor(){
  super(); this.catalog.set(this.root.id,this.root);
  const add=(parent:AtlasNode,id:string,name:string,extra:Partial<AtlasNode>={})=>{
   if(this.catalog.has(id))throw Error('Duplicate map identity '+id);
   const list=this.edges.get(parent.id)||[];
   const node:AtlasNode={id,name,parentId:parent.id,depth:parent.depth+1,index:list.length,weight:1,...extra};
   list.push(node);this.edges.set(parent.id,list);this.catalog.set(id,node);return node;
  };
  definitions.forEach(([key,name,branches],i)=>{
   const subject=add(this.root,'knowledge.'+key,name,{motif:i,subtitle:key==='mathematics'?'A lesson is waiting':'A territory to explore'});
   branches.forEach(branch=>{
    const region=add(subject,subject.id+'.'+branch.toLowerCase().replaceAll(' ','-'),branch,{motif:i});
    if(branch==='Foundations') concepts.forEach(c=>{
     const concept=add(region,conceptNodeId(c.key),c.title,{subtitle:c.subtitle,motif:4});
     add(concept,objectiveNodeId(c.key),c.objectiveTitle,{objective:c.key,subtitle:'Interactive encounter',motif:4});
     c.future.forEach(name=>add(concept,concept.id+'.'+name.toLowerCase().replaceAll(' ','-'),name,{subtitle:'A further question'}));
    });
   });
  });
  // Biology's fields, with Evolution charted: twelve headline territories (core/evolution.ts).
  const biology=this.catalog.get(BIOLOGY_ID)!;
  for(const field of BIOLOGY_FIELDS){
   const node=add(biology,`${BIOLOGY_ID}.${field.key}`,field.name,{motif:biology.motif,...(field.key==='evolution'?{description:EVOLUTION_OVERVIEW}:{})});
   if(node.id===EVOLUTION_ID)for(const t of EVOLUTION_TERRITORIES)add(node,evolutionTerritoryId(t.key),t.name,{motif:biology.motif,subtitle:t.code,description:t.claim});
  }
  // History's first charted idea, the Black Death, under the Medieval World (core/history.ts).
  const history=this.catalog.get(HISTORY_ID)!;
  const medieval=add(history,MEDIEVAL_WORLD.id,MEDIEVAL_WORLD.name,{motif:history.motif});
  add(medieval,BLACK_DEATH.id,BLACK_DEATH.name,{motif:history.motif,description:BLACK_DEATH.claim});
  // Places the generator charted (core/places.ts), each a leaf under an existing node.
  for(const leaf of CHARTED_LEAVES){const parent=this.catalog.get(leaf.parent);if(!parent)throw Error('Unknown parent '+leaf.parent);add(parent,leafId(leaf),leaf.name,{motif:parent.motif,description:leaf.claim})}
  for(const sample of SAMPLE_TERRITORIES){
   let parent=this.catalog.get(`knowledge.${sample.subject}.${sample.parent}`)!;
   for(const names of sample.levels){
    const kids=names.map(name=>add(parent,parent.id+'.'+slug(name),name,{motif:parent.motif,sample:true,subtitle:'Illustrative map content'}));
    parent=kids[0];
   }
  }
  // General layers under every field (core/layers), parents before children.
  for(const [parentId,names] of Object.entries(ATLAS_LAYERS).sort(([a],[b])=>a.split('.').length-b.split('.').length)){
   const parent=this.catalog.get(parentId);if(!parent)throw Error('Unknown layer parent '+parentId);
   for(const name of names)add(parent,parent.id+'.'+slug(name),name,{motif:parent.motif,subtitle:'A territory to explore'});
  }
 }
 override get(id:string):AtlasNode|undefined{return this.catalog.get(id)}
 override getChildren(node:KnowledgeNode):readonly AtlasNode[]{return this.edges.get(node.id)||[]}
 override getParent(node:KnowledgeNode):AtlasNode|null{return node.parentId?this.catalog.get(node.parentId)||null:null}
 override getPath(node:KnowledgeNode):readonly AtlasNode[]{const path:AtlasNode[]=[];let n=this.get(node.id);while(n){path.unshift(n);n=n.parentId?this.get(n.parentId):undefined}return path}
 override childCount(node:KnowledgeNode){return this.getChildren(node).length}
 override get generatedCount(){return this.catalog.size}
 all(){return [...this.catalog.values()]}
}
export const catalog=new CatalogStore();
