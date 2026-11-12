// Writes public/auto/videos.json: every YouTube link on a published place as a Watch video pinned to
// its place(s), for the client to add to its pool (src/feed/pool.ts mergeLinkVideos). Plain node, no Vite.
//   node scripts/auto/videos.mjs [publicAutoDir]
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const MAX_PLACES=3;
/** The pool's shape for a wide video (src/feed/pool.json lists 16:9 as 1.77). */
const WIDE_ASPECT=1.77;
const SKIP=new Set(['index.json','shelf.json','videos.json']);

/** A YouTube video's 11-character id from a watch, youtu.be, shorts or embed address; null for anything else (a playlist, a channel). */
export const youtubeId=url=>{
 let parsed;try{parsed=new URL(url)}catch{return null}
 if(parsed.protocol!=='https:')return null;
 const host=parsed.hostname.replace(/^(www|m)\./,'');
 const id=host==='youtu.be'?parsed.pathname.slice(1):host==='youtube.com'||host==='youtube-nocookie.com'?(parsed.pathname==='/watch'?parsed.searchParams.get('v'):parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]):null;
 return id&&/^[\w-]{11}$/.test(id)?id:null;
};

const depth=id=>id.split('.').length;
const text=value=>typeof value==='string'?value.trim():'';

/** The videos from places ({nodeId, links}): one per YouTube id, its places deepest first (at most
 * three), its title, channel and line from the deepest place's link. Sorted by id. */
export function buildLinkVideos(places){
 const byId=new Map();
 for(const place of places){
  if(typeof place?.nodeId!=='string'||!Array.isArray(place.links))continue;
  for(const link of place.links){
   const id=youtubeId(text(link?.url)),title=text(link?.title),by=text(link?.by);
   if(!id||!title||!by)continue;
   const seen=byId.get(id)??[];
   if(!seen.some(entry=>entry.place===place.nodeId))seen.push({place:place.nodeId,link});
   byId.set(id,seen);
  }
 }
 const channels={},videos=[];
 for(const id of [...byId.keys()].sort()){
  const entries=byId.get(id).sort((a,b)=>depth(b.place)-depth(a.place)||(a.place<b.place?-1:1));
  const {link}=entries[0];
  const minutes=entries.map(entry=>entry.link.minutes).find(value=>typeof value==='number'&&Number.isFinite(value)&&value>0);
  const channel=`by:${text(link.by)}`;
  channels[channel]={name:text(link.by)};
  videos.push({id,channel,title:text(link.title),learn:text(link.note),places:entries.slice(0,MAX_PLACES).map(entry=>entry.place),short:false,aspect:WIDE_ASPECT,duration:minutes?Math.round(minutes*60):null,published:null});
 }
 return {schema:'mok.videos/1',channels:Object.fromEntries(Object.keys(channels).sort().map(key=>[key,channels[key]])),videos};
}

/** The videos for every published place JSON in the directory. */
export function buildVideoIndex(publicAutoDir){
 const places=[];
 for(const name of readdirSync(publicAutoDir).filter(name=>name.endsWith('.json')&&!SKIP.has(name)).sort()){
  let place;try{place=JSON.parse(readFileSync(join(publicAutoDir,name),'utf8'))}catch{continue}
  if(place?.schema==='mok.auto/1')places.push(place);
 }
 return buildLinkVideos(places);
}

/** One channel and one video per line: small diffs, still plain JSON. */
export function formatVideoIndex(index){
 const lines=(entries,indent)=>entries.length?`\n${entries.map(entry=>`${indent}${entry}`).join(',\n')}\n `:'';
 const channels=Object.keys(index.channels).map(key=>`${JSON.stringify(key)}: ${JSON.stringify(index.channels[key])}`);
 return `{\n "schema": ${JSON.stringify(index.schema)},\n "channels": {${lines(channels,'  ')}},\n "videos": [${lines(index.videos.map(video=>JSON.stringify(video)),'  ')}]\n}\n`;
}

export function writeVideoIndex(publicAutoDir){
 const index=buildVideoIndex(publicAutoDir);
 writeFileSync(join(publicAutoDir,'videos.json'),formatVideoIndex(index));
 return index;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=resolve(process.argv[2]??fileURLToPath(new URL('../../public/auto/',import.meta.url)));
 const index=writeVideoIndex(dir);
 const places=new Set(index.videos.flatMap(video=>video.places));
 console.log(`videos.json: ${index.videos.length} videos from ${Object.keys(index.channels).length} channels on ${places.size} places, ${index.videos.filter(video=>video.places.length>1).length} on more than one`);
}
