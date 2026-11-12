export type ObjectiveKey = 'pair-surplus'|'quantity-symbol'|'count-invariance'|'zero-empty'|'equal-units'|'unit-path'|'measure-interval'|'quarter-unit-path';
export type Phase = 'practice'|'transfer'|'retrieval';
export interface Objective { key: ObjectiveKey; id:string; title:string; statement:string; prerequisites:ObjectiveKey[]; criteria:string[]; sourceRefs:string[]; version:string }
export interface ActivityBase { id:string; objective:ObjectiveKey; phase:Phase; title:string; prompt:string; hint:string; explanation:string; representationId:string; contentVersion:string }
export interface PairActivity extends ActivityBase { kind:'pair'; sources:number; receivers:number; sourceLabel:string; receiverLabel:string }
export interface CollectionActivity extends ActivityBase { kind:'collection'; initial:number; change:number; rearrange:boolean; arrangement:'ring'|'grid'|'scatter'; answerOptions:string[]; correctAnswer:string; actionLabel:string }
export interface RulerActivity extends ActivityBase { kind:'ruler'; start:number; end:number; targetUnit:number; originOptions:number[]; unitOptions:number[]; answerOptions:string[]; correctAnswer:string; unitLabel:string }
export type Activity = PairActivity|CollectionActivity|RulerActivity;
export interface AttemptState { pairs:Record<string,string>; surplus:'sources'|'receivers'|'neither'|null; origin:number|null; unit:number|null; answer:string|null; revealed:boolean }
export interface Evaluation { passed:boolean; criteria:Record<string,'satisfied'|'unsatisfied'|'unobserved'>; feedback:string }
export interface Evidence { eventId:string; objectiveId:string; activityId:string; contentVersion:string; representationId:string; phase:Phase; assisted:boolean; criterionResults:Evaluation['criteria']; occurredAt:string }
export interface EncounterSave { activityId:string; state:AttemptState; assisted:boolean; contentVersion:string }
export interface SaveData { version:1; evidence:Evidence[]; locationId:string; encounter:EncounterSave|null; updatedAt:string }
export const blankAttempt = ():AttemptState => ({pairs:{},surplus:null,origin:null,unit:null,answer:null,revealed:false});
