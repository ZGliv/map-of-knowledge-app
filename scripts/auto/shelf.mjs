// Writes public/auto/shelf.json: each generated place's core minutes [card, read, pack] and its
// number of quick questions, for the client's fill (src/shelf/fill.ts). Plain node, no Vite.
//   node scripts/auto/shelf.mjs [publicAutoDir]
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const CARD_MINUTES=1;
const SKIP=new Set(['index.json','shelf.json']);
const minutes=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:0;

/** The index for every place JSON in the directory, keys sorted so the file only changes when a place does. */
export function buildShelfIndex(publicAutoDir){
 const core={},quick={};
 const files=readdirSync(publicAutoDir).filter(name=>name.endsWith('.json')&&!SKIP.has(name)).sort();
 for(const name of files){
  let place;try{place=JSON.parse(readFileSync(join(publicAutoDir,name),'utf8'))}catch{continue}
  if(place?.schema!=='mok.auto/1'||typeof place.nodeId!=='string')continue;
  core[place.nodeId]=[CARD_MINUTES,minutes(place.read?.minutes),minutes(place.pack?.minutes)];
  if(Array.isArray(place.items)&&place.items.length)quick[place.nodeId]=place.items.length;
 }
 const sorted=object=>Object.fromEntries(Object.keys(object).sort().map(key=>[key,object[key]]));
 return {schema:'mok.shelf/1',core:sorted(core),quick:sorted(quick)};
}

/** One place per line: small diffs, still plain JSON. */
export function formatShelfIndex(index){
 const block=object=>{const keys=Object.keys(object);return keys.length?`{\n${keys.map(key=>`  ${JSON.stringify(key)}: ${JSON.stringify(object[key])}`).join(',\n')}\n }`:'{}'};
 return `{\n "schema": ${JSON.stringify(index.schema)},\n "core": ${block(index.core)},\n "quick": ${block(index.quick)}\n}\n`;
}

export function writeShelfIndex(publicAutoDir){
 const index=buildShelfIndex(publicAutoDir);
 writeFileSync(join(publicAutoDir,'shelf.json'),formatShelfIndex(index));
 return index;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=resolve(process.argv[2]??fileURLToPath(new URL('../../public/auto/',import.meta.url)));
 const index=writeShelfIndex(dir);
 const places=Object.values(index.core);
 console.log(`shelf.json: ${places.length} places, ${places.filter(m=>m[1]).length} with a read, ${places.filter(m=>m[2]).length} with a pack`);
}
