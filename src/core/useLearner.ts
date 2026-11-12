import {useCallback,useEffect,useRef,useState} from 'react';
import {LEARNER_KEY,loadLearner,saveLearner,mergeLearner,recordAttempt,visitDiscovery,updateProfile,parseLearner,exportLearner} from './learner';
import type {AttemptInput,LearnerProfile,LearnerState} from './guideTypes';

function persistedLearner(){
 // An absent record is not a freshly edited default profile. In particular,
 // quota failures before the first save must not overwrite an unsaved profile.
 try{if(globalThis.localStorage.getItem(LEARNER_KEY)===null)return {data:null,warning:null}}
 catch{/* loadLearner supplies a useful browser-storage warning. */}
 return loadLearner();
}
export function useLearner(){
 const [initial]=useState(()=>loadLearner());
 const [learner,setLearner]=useState(initial.data);
 const [learnerWarning,setLearnerWarning]=useState<string|null>(initial.warning);
 const current=useRef(learner);
 const apply=useCallback((change:(state:LearnerState)=>LearnerState,replaceInvalid=false)=>{
  const disk=persistedLearner();
  const base=disk.warning||!disk.data?current.current:mergeLearner(current.current,disk.data);
  const next=change(base);
  // Validate before adopting; failed writes retain the full session for export.
  exportLearner(next);
  const warning=saveLearner(next,undefined,{replaceInvalid});
  current.current=next;setLearner(next);setLearnerWarning(warning);
  return next;
 },[]);
 useEffect(()=>{
  const sync=(event:StorageEvent)=>{
   if(event.key!==LEARNER_KEY&&event.key!==null)return;
   const disk=persistedLearner();if(disk.warning){setLearnerWarning(disk.warning);return}
   if(!disk.data)return;
   try{const next=mergeLearner(current.current,disk.data);current.current=next;setLearner(next)}catch(error){setLearnerWarning(error instanceof Error?error.message:'Learning memory could not be combined. Export your current session to keep it.')}
  };
  window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 return {learner,learnerWarning,
  record:useCallback((input:AttemptInput)=>apply(state=>recordAttempt(state,input)),[apply]),
  visit:useCallback((id:string)=>apply(state=>visitDiscovery(state,id)),[apply]),
  update:useCallback((profile:Partial<LearnerProfile>)=>apply(state=>updateProfile(state,profile)),[apply]),
  importMemory:useCallback((raw:string)=>{const incoming=parseLearner(raw);apply(state=>mergeLearner(state,incoming),true)},[apply]),
  exportMemory:useCallback(()=>exportLearner(current.current),[]),
 };
}
