import type { GuideMessage, GuideReply, GuideStatus, LearnerProfile, LearningSource } from './guideTypes';

export interface GuideRequest {
  message:string;
  topicId:string;
  profile:LearnerProfile;
  evidenceSummary:string;
  sources:LearningSource[];
  notes:{title:string;body:string}[];
  history:GuideMessage[];
  requestId?:string;
}

export class GuideClientError extends Error {
  constructor(message:string, public code:string, public status:number) { super(message); this.name='GuideClientError'; }
}

function accessHeaders():Record<string,string> {
  // An optional private demo token stays in this tab, never in a URL or bundle.
  // It is unrelated to an AI provider key; those only exist on the server.
  try { const token=sessionStorage.getItem('mok-guide-access'); return token ? {'X-MOK-Access':token} : {}; }
  catch { return {}; }
}

export async function getGuideStatus(signal?:AbortSignal):Promise<GuideStatus> {
  try {
    const response=await fetch('/api/guide', {headers:accessHeaders(), signal, cache:'no-store'});
    if(!response.ok) {
      const data=await response.json().catch(()=>({}));
      return {available:false,mode:'offline',model:'',spentUsd:0,limitUsd:15,requests:0,reason:typeof data.error==='string'?data.error:'Your AI guide is not connected yet. The discoveries still work.'};
    }
    const data:unknown=await response.json();
    if(!data || typeof data!=='object' || !('available' in data) || typeof data.available!=='boolean' || !('mode' in data) || !['local','cloud','offline'].includes(String(data.mode))) throw new Error('Invalid guide status');
    return data as GuideStatus;
  } catch(error) {
    if(signal?.aborted) throw error;
    return {available:false,mode:'offline',model:'',spentUsd:0,limitUsd:15,requests:0,reason:'Your AI guide is not connected yet. The discoveries still work.'};
  }
}

export async function askGuide(input:GuideRequest, signal?:AbortSignal):Promise<GuideReply> {
  const requestId=input.requestId || crypto.randomUUID();
  const payload={...input,requestId,
    history:input.history.slice(-6).map(item=>({...item,text:item.text.slice(0,1800)})),
    notes:input.notes.slice(0,4).map(note=>({title:note.title.slice(0,160),body:note.body.slice(0,1500)})),
    sources:input.sources.slice(0,6).map(source=>({...source,excerpt:source.excerpt.slice(0,1800)})),
    evidenceSummary:input.evidenceSummary.slice(0,2400),
  };
  let response:Response;
  try { response=await fetch('/api/guide', {method:'POST',headers:{'Content-Type':'application/json',...accessHeaders()},body:JSON.stringify(payload),signal}); }
  catch(error) { if(signal?.aborted) throw error; throw new GuideClientError('The guide connection was interrupted. Your progress is safe.','connection_error',0); }
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new GuideClientError(typeof data?.error==='string'?data.error:'The guide could not answer that question.',typeof data?.code==='string'?data.code:'guide_error',response.status);
  if(!data || typeof data.text!=='string' || !['local','cloud'].includes(data.mode) || !Array.isArray(data.sourceIds)) throw new GuideClientError('The guide returned an incomplete answer.','invalid_reply',502);
  // Even an upstream response cannot manufacture a link in this client.
  return {...data,sourceIds:data.sourceIds.filter((id:unknown)=>typeof id==='string' && input.sources.some(source=>source.id===id))} as GuideReply;
}
