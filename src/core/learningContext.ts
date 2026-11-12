import type {Notebook} from './notebook';
const STOP=new Set(['the','and','for','that','this','with','from','what','how','does','about','have','something','please','could','would','your','you','can','learned','learn','help']);
/** A small personal library benefits from inspectable lexical retrieval. Notes
 * remain user-authored context; retrieving one never grades an understanding. */
export function retrieveNotebookContext(notebook:Notebook,topicId:string,query:string){
 const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].filter(term=>!STOP.has(term));
 return notebook.entries.map((entry,index)=>{
  const title=entry.title.toLowerCase();const body=entry.body.toLowerCase();
  const lexical=terms.reduce((score,term)=>score+(title.includes(term)?4:0)+(body.includes(term)?1:0),0);
  const related=topicId!=='knowledge'&&entry.nodeIds.some(id=>id===topicId||id.startsWith(topicId+'.')||topicId.startsWith(id+'.')&&id!=='knowledge');
  return {entry,index,score:lexical+(related?3:0)};
 }).filter(item=>item.score>0||topicId==='knowledge'&&terms.length===0).sort((a,b)=>b.score-a.score||b.entry.updatedAt.localeCompare(a.entry.updatedAt)||a.index-b.index).slice(0,3).map(({entry})=>({title:entry.title.slice(0,160),body:entry.body.slice(0,1500)}));
}
