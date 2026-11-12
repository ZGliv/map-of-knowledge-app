export interface LearningSource { id:string; title:string; url:string; excerpt:string }
export interface DiscoveryVisual { kind:'pulse'|'fraction'|'motion'|'sorting'|'network'|'comparison'; values:number[]; labels:string[] }
export interface DiscoveryChallenge { id:string; prompt:string; choices:{id:string;label:string}[]; correctId:string; hints:string[]; explanation:string; visual:DiscoveryVisual }
export interface Discovery { id:string; title:string; question:string; subject:string; topicId:string; footprintId:string; minutes:number; summary:string; insight:string; sourceIds:string[]; connections:string[]; prerequisites:string[]; challenges:[DiscoveryChallenge,DiscoveryChallenge,...DiscoveryChallenge[]] }
export interface LearnerProfile { name:string; goal:string; interests:string[]; minutes:number }
export interface LearningAttempt { id:string; discoveryId:string; challengeId:string; answerId:string; assisted:boolean; passed:boolean; at:string; phase:'probe'|'transfer' }
export interface AttemptInput { discoveryId:string; challengeId:string; answerId:string; assisted:boolean; phase:'probe'|'transfer' }
export interface LearnerState { version:1; profile:LearnerProfile; profileUpdatedAt:string; attempts:LearningAttempt[]; visitedIds:string[]; updatedAt:string }
export interface FrontierSuggestion { discovery:Discovery; reason:string; kind:'begin'|'bridge'|'connect'|'revisit'|'stretch' }
export interface GuideMessage { role:'user'|'assistant'; text:string }
export interface GuideReply { text:string; mode:'local'|'cloud'|'offline'; model:string; sourceIds:string[]; usage?:{inputTokens:number;outputTokens:number;costUsd:number}; warning?:string }
export interface GuideStatus { available:boolean; mode:'local'|'cloud'|'offline'; model:string; spentUsd:number; limitUsd:number; requests:number; reason?:string }
