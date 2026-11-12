import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Atlas} from './components/Atlas';
import {Encounter} from './components/Encounter';
import {catalog,FOUNDATIONS_ID,MATH_ID,concepts,objectiveNodeId,conceptNodeId,type AtlasNode} from './core/catalog';
import {blankAttempt,type Activity,type AttemptState,type Evidence,type ObjectiveKey,type SaveData} from './core/contracts';
import {ACTIVITIES,OBJECTIVES,SYNTHESIS,getActivity,freshCheck,getActivityById} from './core/curriculum';
import {evaluate,qualifiedObjectives} from './core/learning';
import {loadSave,writeSave,parseImport,exportSave,addEvidence,getDueObjectives} from './core/persistence';
import './components/encounter.css';

type Session={activity:Activity;state:AttemptState;assisted:boolean;result:boolean|null;nonce:number};
const icon=(name:'search'|'back'|'close'|'arrow'|'menu'|'light')=><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{name==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>:name==='back'?<path d="m14 5-7 7 7 7M7 12h14"/>:name==='close'?<path d="m6 6 12 12M6 18 18 6"/>:name==='arrow'?<path d="M3 12h17m-7-7 7 7-7 7"/>:name==='menu'?<><path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2" fill="#101817"/><circle cx="15" cy="16" r="2" fill="#101817"/></>:<><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3Z"/></>}</svg>;

export function LearningApp(){
 const loaded=useMemo(()=>loadSave(),[]);
 const [save,setSave]=useState<SaveData>(loaded.data);
 const saveRef=useRef(save);saveRef.current=save;
 const [warning,setWarning]=useState<string|null>(loaded.warning);
 const initialId=useRef(catalog.get(save.locationId)?save.locationId:'knowledge');
 const [location,setLocation]=useState<AtlasNode>(catalog.get(initialId.current)||catalog.root);
 const [request,setRequest]=useState<{id:string;nonce:number}|null>(null);
 const [busy,setBusy]=useState(false);
 const [session,setSession]=useState<Session|null>(null);
 const [restored,setRestored]=useState<ObjectiveKey|null>(null);
 const [search,setSearch]=useState(false);
 const [query,setQuery]=useState('');
 const [settings,setSettings]=useState(false);
 const [info,setInfo]=useState(false);
 const [toast,setToast]=useState('');
 const [importText,setImportText]=useState('');
 const pendingActivity=useRef<Activity|null>(null);
 const encounterVersion=useRef(0);
 const headingRef=useRef<HTMLButtonElement>(null);
 const encounterLayerRef=useRef<HTMLDivElement>(null);
 const initialLocationReported=useRef(false);
 const qualified=useMemo(()=>qualifiedObjectives(save.evidence),[save.evidence]);
 const completedIds=useMemo(()=>qualified.map(objectiveNodeId),[qualified]);
 const due=useMemo(()=>getDueObjectives(save.evidence),[save.evidence]);
 const commit=useCallback((fn:(s:SaveData)=>SaveData)=>setSave(s=>{const next=fn(s);return {...next,updatedAt:new Date().toISOString()}}),[]);
 useEffect(()=>{const timer=setTimeout(()=>{const error=writeSave(save);if(error)setWarning(error)},150);return()=>clearTimeout(timer)},[save]);
 useEffect(()=>{const flush=()=>{writeSave(saveRef.current)};window.addEventListener('pagehide',flush);return()=>window.removeEventListener('pagehide',flush)},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(timer)},[toast]);
 const navigate=useCallback((id:string)=>{setSession(null);setRestored(null);setSearch(false);setInfo(false);setRequest({id,nonce:Date.now()+Math.random()})},[]);
 const onLocationChange=useCallback((node:AtlasNode)=>{
  setLocation(node);commit(s=>({...s,locationId:node.id}));
  if(node.objective){
   const key=node.objective;const old=saveRef.current.encounter;let activity=pendingActivity.current;
   if(!activity||activity.objective!==key)activity=old&&getActivityById(old.activityId)?.objective===key?getActivityById(old.activityId)!:getActivity(key,qualifiedObjectives(saveRef.current.evidence).includes(key)?'retrieval':'practice');
   pendingActivity.current=null;
   const resume=old?.activityId===activity.id&&old.contentVersion===activity.contentVersion;
   setSession({activity,state:resume?old!.state:blankAttempt(),assisted:resume?old!.assisted:false,result:null,nonce:++encounterVersion.current});
  }else setSession(null);
  if(initialLocationReported.current&&document.activeElement?.tagName!=='BODY') requestAnimationFrame(()=>headingRef.current?.focus({preventScroll:true}));
  initialLocationReported.current=true;
 },[commit]);
 const start=useCallback((key:ObjectiveKey,diagnostic=false)=>{
  pendingActivity.current=getActivity(key,diagnostic?'transfer':qualifiedObjectives(saveRef.current.evidence).includes(key)?'retrieval':'practice');
  if(location.id===objectiveNodeId(key)){const a=pendingActivity.current;pendingActivity.current=null;setRestored(null);setSession({activity:a,state:blankAttempt(),assisted:false,result:null,nonce:++encounterVersion.current})}
  else navigate(objectiveNodeId(key));
 },[location.id,navigate]);
 const exitEncounter=()=>{navigate(location.parentId||FOUNDATIONS_ID)};
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){
    if(search){setSearch(false);return}if(settings){setSettings(false);return}if(info){setInfo(false);return}
    if(!busy&&location.parentId){e.preventDefault();navigate(location.parentId)}
   }
   if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSearch(v=>!v)}
  };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[search,settings,info,busy,location,navigate]);
 useEffect(()=>{
  if(!search&&!settings&&!info)return;
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
  const focusables=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,summary,a[href]')||[]).filter(el=>el.getClientRects().length);
  requestAnimationFrame(()=>{const items=focusables();(items.find(el=>el.tagName==='INPUT'&&(el as HTMLInputElement).type!=='file')||items[0])?.focus()});
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=focusables();const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||!dialog?.contains(document.activeElement))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||!dialog?.contains(document.activeElement))){e.preventDefault();first?.focus()}};
  document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);previous?.focus({preventScroll:true})};
 },[search,settings,info]);
 useEffect(()=>{if(session)requestAnimationFrame(()=>{if(encounterLayerRef.current)encounterLayerRef.current.scrollTop=0})},[session?.nonce]);
 const onStateChange=useCallback((state:AttemptState,assisted:boolean)=>{
  setSession(current=>{if(!current)return current;return {...current,state,assisted}});
 },[]);
 useEffect(()=>{if(!session)return;commit(s=>({...s,encounter:{activityId:session.activity.id,state:session.state,assisted:session.assisted,contentVersion:session.activity.contentVersion}}))},[session?.activity.id,session?.state,session?.assisted,commit]);
 const submit=(state:AttemptState,assisted:boolean)=>{
  if(!session)return {passed:false,criteria:{},feedback:'Choose an encounter first.'};
  const evaluation=evaluate(session.activity,state);
  const event:Evidence={eventId:`attempt:${session.nonce}:${crypto.randomUUID()}`,objectiveId:`demo.math.v1.${session.activity.objective}`,activityId:session.activity.id,contentVersion:session.activity.contentVersion,representationId:session.activity.representationId,phase:session.activity.phase,assisted,criterionResults:evaluation.criteria,occurredAt:new Date().toISOString()};
  try{const next=addEvidence(saveRef.current,event);setSave(next)}catch(error){setWarning(error instanceof Error?error.message:'This observation could not be saved.');return {...evaluation,passed:false,feedback:'This observation could not be recorded. Export your map before continuing.'}}
  setSession(s=>s?{...s,state,assisted,result:evaluation.passed}:s);
  return evaluation;
 };
 const advance=()=>{
  if(!session)return;const {activity,assisted}=session;
  if(activity.phase==='practice'||assisted){
   const a=assisted&&activity.phase!=='practice'?freshCheck(activity.objective,1+(Date.now()%9999)):getActivity(activity.objective,'transfer');
   setSession({activity:a,state:blankAttempt(),assisted:false,result:null,nonce:++encounterVersion.current});return;
  }
  setRestored(activity.objective);setSession(null);commit(s=>({...s,encounter:null}));
 };
 const exportProgress=()=>{
  try{const blob=new Blob([exportSave(save)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-map-of-knowledge.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Your map has been exported.');}catch(error){setToast(error instanceof Error?error.message:'The map could not be exported.')}
 };
 const importProgress=()=>{try{const imported=parseImport(importText);setSave(imported);setImportText('');setSettings(false);setToast('Your map has been restored.');pendingActivity.current=null;navigate(catalog.get(imported.locationId)?imported.locationId:'knowledge')}catch(error){setToast(error instanceof Error?error.message:'This save could not be read.')}};
 const searchResults=catalog.all().filter(n=>n.depth>0&&(!query||n.name.toLowerCase().includes(query.toLowerCase()))).slice(0,query?18:8);
 const route=concepts.map(c=>c.key);const next=route.find(k=>!qualified.includes(k));
 const mapOnly=!session&&!restored&&catalog.getChildren(location).length===0&&!location.objective;
 const preferred:ObjectiveKey=qualified.includes('measure-interval')&&!qualified.includes('quarter-unit-path')?'quarter-unit-path':location.id==='knowledge'||location.id===MATH_ID?next&&qualified.includes('measure-interval')?next:'measure-interval':next||'quarter-unit-path';
 const interrupted=save.encounter?getActivityById(save.encounter.activityId):undefined;
 const resume=()=>{if(!interrupted)return;pendingActivity.current=interrupted;navigate(objectiveNodeId(interrupted.objective))};
 useEffect(()=>{
  const w=window as Window&{render_game_to_text?:()=>string;advanceTime?:(ms:number)=>Promise<void>};
  w.render_game_to_text=()=>JSON.stringify({coordinateSystem:'SVG screen pixels; origin top-left; x right, y down',location:{id:location.id,name:location.name},navigating:busy,regions:catalog.getChildren(location).map(n=>({id:n.id,name:n.name,playable:!!n.objective})),activity:session?{...session.activity,attempt:session.state,assisted:session.assisted,result:session.result}:null,restored,qualified,due,saveWarning:warning});
  w.advanceTime=async ms=>{await new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>{if(now-start>=Math.min(ms,10000))resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)})};
  return()=>{delete w.render_game_to_text;delete w.advanceTime};
 },[location,busy,session,restored,qualified,due,warning]);
 return <div className={`app-shell${session?' in-encounter':''}`}>
  <header className="app-header">
   <button className="brand" onClick={()=>navigate('knowledge')} aria-label="Map of Knowledge home"><span className="brand-mark"><i/><i/><i/></span><span>Map of Knowledge<small>AN ATLAS OF UNDERSTANDING</small></span></button>
   <div className="header-tools"><span className="earned-count" title="Independently demonstrated objectives">{icon('light')}<b>{qualified.length}</b><span> illuminated</span></span><button className="icon-button" onClick={()=>setSearch(true)} aria-label="Search the atlas">{icon('search')}</button><button className="icon-button" onClick={()=>setSettings(true)} aria-label="Your map and settings">{icon('menu')}</button></div>
  </header>
  <div className="location-bar"><button ref={headingRef} className="location-back" onClick={()=>location.parentId?navigate(location.parentId):setInfo(true)} disabled={busy} aria-label={location.parentId?'Return to '+catalog.get(location.parentId)?.name:'About this atlas'}>{location.parentId?icon('back'):<span className="location-dot"/>}<span>{location.parentId?catalog.get(location.parentId)?.name:'THE ATLAS'}</span></button><span className="location-current">{location.depth>0?location.name:'Follow your curiosity'}</span><span className="location-depth">{String(location.depth).padStart(2,'0')} / {location.objective?'ENCOUNTER':'EXPLORE'}</span></div>
  <div className={`atlas-stage${session||restored?' has-encounter':''}`}>
   <Atlas initialId={initialId.current} request={request} completedIds={completedIds} onLocationChange={onLocationChange} onBusy={setBusy}/>
   {busy&&<span className="travel-caption">Following the connection</span>}
   {session&&!busy&&<div className="encounter-layer" ref={encounterLayerRef}><Encounter key={`${session.activity.id}:${session.nonce}`} activity={session.activity} initialState={session.state} initialAssisted={session.assisted} onStateChange={onStateChange} onSubmit={submit} onContinue={advance} onExit={exitEncounter} alreadyQualified={qualified.includes(session.activity.objective)}/></div>}
   {restored&&!busy&&<section className="restoration" aria-live="polite"><div className="restoration-emblem"><span/><span/><span/>{icon('light')}</div><p className="eyebrow">A CONNECTION MADE</p><h1>A little more<br/>of the world makes sense.</h1><p className="restoration-detail">{OBJECTIVES.find(o=>o.key===restored)?.statement}</p><span className="evidence-seal">{icon('light')} Independently demonstrated</span><button className="primary-button" onClick={()=>navigate(FOUNDATIONS_ID)}>See your light on the map {icon('arrow')}</button><button className="text-button" onClick={()=>navigate('knowledge')}>Pull back to the whole atlas</button></section>}
   {mapOnly&&!busy&&<section className="unexplored"><p className="eyebrow">A PLACE ON THE MAP</p><h1>{location.name}</h1><p>This territory has a place in the atlas.<br/>Its learning encounters are still to come.</p><button className="primary-button" onClick={()=>navigate(FOUNDATIONS_ID)}>Explore Mathematics {icon('arrow')}</button><button className="text-button" onClick={()=>navigate(location.parentId||'knowledge')}>Return to this region</button></section>}
  </div>
  {!session&&!restored&&!mapOnly&&<footer className={`expedition-dock${busy?' is-travelling':''}`}>
   <div className="dock-intro"><p className="eyebrow">{qualified.length?'YOUR LESSON CONTINUES':'YOUR FIRST LESSON'} <span>MATHEMATICS</span></p><h1>{location.id==='knowledge'||location.id===MATH_ID?'Two correct measurements disagree.':location.depth===3?location.subtitle:qualified.length?'A small light. A new way forward.':'The ideas beneath every number.'}</h1><p>{location.depth===3?'Choose an encounter in this region, or take an independent check.':qualified.length?`${qualified.length} of 8 narrow objectives illuminated. Every light is something you have shown.`:'Change the unit. Shift the origin. Discover what a measurement really means.'}</p></div>
   <div className="dock-actions"><button className="primary-button" disabled={busy} onClick={()=>interrupted&&location.depth!==3?resume():start(location.depth===3?concepts.find(c=>conceptNodeId(c.key)===location.id)!.key:preferred)}> {interrupted&&location.depth!==3?'Resume encounter':location.depth===3?'Begin encounter':qualified.length?'Continue exploring':'Find out why'} {icon('arrow')}</button><button className="text-button" disabled={busy} onClick={()=>{if(due.length)start(due[0]);else if(location.depth===3)start(concepts.find(c=>conceptNodeId(c.key)===location.id)!.key,true);else {pendingActivity.current=SYNTHESIS;navigate(objectiveNodeId(SYNTHESIS.objective))}}}>{due.length?'Refresh a connection':location.depth===3?'Try an independent check':'Already know this? Take the challenge'}</button></div>
  </footer>}
  {warning&&<div className="save-warning" role="alert">{warning}<button onClick={()=>setWarning(null)} aria-label="Dismiss save warning">×</button></div>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {search&&<div className="modal-backdrop" onClick={()=>setSearch(false)}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the atlas" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>Where does your curiosity lead?</h2><button className="icon-button" onClick={()=>setSearch(false)} aria-label="Close search">{icon('close')}</button></div><label className="search-input">{icon('search')}<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search an idea or territory"/></label><p className="eyebrow">{query?'PLACES IN THE ATLAS':'START EXPLORING'}</p><div className="search-results">{searchResults.map(n=><button key={n.id} onClick={()=>navigate(n.id)}><span>{n.name}<small>{catalog.get(n.parentId!)?.name}</small></span><span>{n.objective?'Encounter':catalog.getChildren(n).length?'Region':'Map only'} {icon('arrow')}</span></button>)}{!searchResults.length&&<p>No territory matches that search yet.</p>}</div></section></div>}
  {settings&&<div className="modal-backdrop" onClick={()=>setSettings(false)}><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="Your map" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>Your map, kept with you.</h2><button className="icon-button" onClick={()=>setSettings(false)} aria-label="Close settings">{icon('close')}</button></div><p>Your progress is saved in this browser. Export a copy to carry your earned light to another device.</p><div className="progress-ledger">{concepts.map(c=><div key={c.key}><span>{qualified.includes(c.key)?'✦':'·'} {c.title}</span><small>{qualified.includes(c.key)?'Demonstrated':'Open to explore'}</small></div>)}</div><button className="primary-button" onClick={exportProgress}>Export your map {icon('arrow')}</button><details><summary>Import a saved map</summary><label className="file-import">Choose exported file<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)file.text().then(setImportText)}}/></label><textarea aria-label="Saved map JSON" placeholder="Or paste your exported map here" value={importText} onChange={e=>setImportText(e.target.value)}/><button className="secondary-button" disabled={!importText} onClick={importProgress}>Import map</button></details><p className="fine-print">Illumination records demonstrated understanding. Refresh prompts use provisional 1, 3 and 7 day intervals. This is a working learning prototype.</p></section></div>}
  {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="About the atlas" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>Knowledge has a landscape.</h2><button className="icon-button" onClick={()=>setInfo(false)} aria-label="Close about">{icon('close')}</button></div><p>Enter a territory. Follow an idea into a smaller idea. Demonstrate something you understand, and its own small piece of the atlas lights up.</p><p>Eight broad territories give the world its shape. Mathematics contains the first playable lesson: eight precise encounters about number, units and measurement.</p><p>A light is evidence of a specific understanding. There will always be more territory beyond it.</p><button className="primary-button" onClick={()=>{setInfo(false);start('measure-interval')}}>Begin with a question {icon('arrow')}</button></section></div>}
 </div>
}
