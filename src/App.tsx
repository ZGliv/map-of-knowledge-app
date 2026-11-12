import {Suspense,use,useCallback,useEffect,useMemo,useRef,useState,type ComponentType,type CSSProperties,type JSX,type ReactNode} from 'react';
import {PartBoundary} from './components/PartBoundary';
import {Atlas} from './components/Atlas';
// Stylesheets of the lazy parts stay here, in their original place in the cascade: the theme files after them override them.
import './components/learning-expedition.css';
import {AppMenu} from './components/AppMenu';
import {useLearner} from './core/useLearner';
import {retrieveNotebookContext} from './core/learningContext';
import {getEarnedIds,getFrontier} from './core/learner';
import {continueDiscovery} from './core/learningJourney';
import {DISCOVERIES,getDiscovery,LEARNING_SOURCES,retrieveSources} from './core/discoveries';
import {getGuideStatus,askGuide} from './core/guideClient';
import type {GuideMessage,GuideStatus} from './core/guideTypes';
import {SpectrumPreviewControl} from './components/SpectrumPreviewControl';
import {SPECTRUM_SAMPLE_IDS,type SpectrumPreviewMode} from './core/spectrumPreview';
import {createNotebook,loadNotebook,saveNotebook,NOTEBOOK_STORAGE_KEY,upsertNotebookEntry,deleteNotebookEntry,exportNotebook,parseNotebook,type NotebookEntry,type NotebookEntryInput,type Notebook} from './core/notebook';
import {catalog,type AtlasNode} from './core/catalog';
import {SAMPLE_TERRITORIES,sampleLeaf} from './core/sampleTerritories';
import {territoryColor} from './core/territoryTheme';
import {useAtlasAtmosphere} from './core/useAtlasAtmosphere';
import {AtlasLocationBar} from './components/AtlasLocationBar';
import {ShellBar} from './components/ShellBar';
import {getExplorationContext} from './core/explorationContext';
import {otherActivity} from './core/activity';
import {loadFeedMemory} from './feed/memory';
/** What Watch remembers doing, for telling a break from a day spent watching. */
const feedActivity=()=>{const memory=loadFeedMemory();return {watched:memory.watched,feedAt:memory.at}};
import {createDemoProgress,loadDemoProgress,writeDemoProgress,toggleDemoCompletion,exportDemoProgress,parseDemoProgress} from './core/demoProgress';
const STARLIGHT='#b9c8ff';
import {EVOLUTION_ID} from './core/evolution';
import './hub/hub.css';
import {useAtlasRoute,type AtlasRoute} from './hub/route';
import {NAV_MODE,PlacePeek} from './hub/PlacePeek';
import {AutoPlaceSection,useAutoIndex,useAutoPlace} from './auto/AutoPlaceSection';
import {useAutoProof} from './auto/proof';
import type {AutoPlace} from './auto/types';
import {loadShelf,markComplete,markDone as markShelfDone,mergeShelf,shelfFrom,useShelf} from './shelf/store';
import {EMPTY_SHELF_INDEX,useShelfIndex} from './shelf/shelfIndex';
import {computeFill,formatPercent,glowFromGuesses,newlyComplete,sameFill,sameSet} from './shelf/fill';
import {packId as packItemId,reelItemId} from './shelf/types';
import './shelf/shelf.css';
import {useLibraryLab as useLibraryCLab} from './lab/library-c/route';
import {useLibraryDLab} from './lab/library-d/route';
import {useLibraryLab as useLibraryELab} from './lab/library-e/route';
import {useLibraryLab as useLibraryFLab} from './lab/library-f/route';
import './discoveries/discoveries.css';
import './explore/explore.css';
import type {ExploreTab} from './explore/ExplorePage';
import type {TodaysSet} from './explore/today';
import type {EngineReel,Reel} from './explore/types';
import {keepSaved,loadKeptReels,saveKeptReels} from './explore/keptReels';
import {installSoundUnlock,soundStatus} from './explore/sound';
import {firstUnwatched,loadReelShelf,markWatched,pinPlaces,removePin,saveReelShelf,savePin,type ReelShelf} from './explore/pins';
import {feedSignals} from './feed/signals';
import {videoIdFromUrl} from './feed/youtube';
import {usePoolIds} from './feed/usePool';
import type {Learnable} from './discoveries/model';
import {PACK_PLACES,packPlace,packPlaceAt} from './expeditions/manifest';
import {EXPEDITION_LEDGER_KEY,bestLevel,getExpeditionEarnedIds,loadExpeditionLedger,markSeen,mergeExpeditionLedgers,readExpeditionLedger,recordRun,saveExpeditionLedger,type ExpeditionLedger} from './expeditions/ledger';
import {CHECK_LEDGER_KEY,appendCheckEvents,loadCheckLedger,mergeCheckLedgers,readCheckLedger,saveCheckLedger,type CheckEvent} from './checks/ledger';
import {rememberCheckColor,rememberedCheckColor} from './checks/coloredCache';
import {LIBRARY_STORAGE_KEY,cycleReading,libraryInFile,linkPlaces,liveLinks,loadLibrary,mergeLibraries,readLibrary,removeLink,saveLibrary,saveLink,shelfReading,withLibrary,type LibraryStore} from './notebook/libraryStore';
import {stuckEntryId} from './notebook/journal';
import type {LinkDraft} from './notebook/LinkSheet';
import {useLibraryLab} from './lab/library-b/labRoute';
import {loadContent,loadedContent,type Content} from './contentLoader';
// Hidden prototype: #/lab/library-a shows Library prototype A in place of the Library tab (src/lab/library-a).
import {useLibraryALab} from './lab/library-a/route';
import {closeLibraryPicker,openLibraryPicker,openLibraryPrototype,useLibraryPicker} from './lab/library/picker';
// Everything off the first map paint is its own chunk, each behind its own Suspense so the
// map never blanks while one loads. All of them but the labs are fetched once the map has painted.
const LAZY_LOADERS:(()=>Promise<unknown>)[]=[];
// Once a part has loaded it renders straight away: React.lazy would still suspend on first use,
// and React holds a revealed Suspense boundary back for up to 300 ms. A chunk that fails to load
// (gone after a deploy, or offline) never empties the app: see PartBoundary. A failed prefetch is
// forgotten, so the first use loads it again. A render keeps its one attempt: a fresh promise on every
// render would keep the part suspended, its error never shown (and the browser keeps a failed module
// for the life of the page, so a second attempt could not load it anyway).
function lazyPart<P extends object>(load:()=>Promise<ComponentType<P>>,{prefetch=true,fallback=null}:{prefetch?:boolean;fallback?:ReactNode}={}){
 let loaded:ComponentType<P>|null=null,pending:Promise<ComponentType<P>>|null=null,attempt:Promise<ComponentType<P>>|null=null;
 const fetch=()=>pending??=load().then(component=>loaded=component,error=>{pending=null;throw error});
 if(prefetch)LAZY_LOADERS.push(fetch);
 function Part(props:P){const Component=loaded??use(attempt??=fetch());return <Component {...(props as P&JSX.IntrinsicAttributes)}/>}
 return (props:P)=><PartBoundary><Suspense fallback={fallback}><Part {...(props as P&JSX.IntrinsicAttributes)}/></Suspense></PartBoundary>;
}
// The labs are never among the parts every visitor prefetches.
const LAB={prefetch:false};
const LibraryPicker=lazyPart(()=>import('./lab/library/LibraryPicker').then(m=>m.LibraryPicker),LAB);
const LibraryA=lazyPart(()=>import('./lab/library-a/LibraryA').then(m=>m.LibraryA),LAB);
const ExpeditionScreen=lazyPart(()=>import('./expeditions/ExpeditionScreen').then(m=>m.ExpeditionScreen));
const CheckScreen=lazyPart(()=>import('./checks/CheckScreen').then(m=>m.CheckScreen));
const newEventId=()=>typeof globalThis.crypto?.randomUUID==='function'?globalThis.crypto.randomUUID():`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const MissionScreen=lazyPart(()=>import('./cases/MissionScreen').then(m=>m.MissionScreen));
const Hub=lazyPart(()=>import('./hub/Hub').then(m=>m.Hub));
const ExplorePage=lazyPart(()=>import('./explore/ExplorePage').then(m=>m.ExplorePage));
const DiscoveriesPage=lazyPart(()=>import('./discoveries/DiscoveriesPage').then(m=>m.DiscoveriesPage));
// The Watch feed (src/feed): Explore's first tab.
const FeedPanel=lazyPart(()=>import('./feed/FeedPanel').then(m=>m.FeedPanel));
// A place's shelf on its hub: its fill bar and everything pinned to it (src/hub/PlaceShelf, src/shelf).
const PlaceShelf=lazyPart(()=>import('./hub/PlaceShelf').then(m=>m.PlaceShelf));
// Prototype B of the Library, "The Index", at the hidden #/lab/library-b (src/lab/library-b).
const LibraryIndex=lazyPart(()=>import('./lab/library-b/LibraryIndex').then(m=>m.LibraryIndex),LAB);
// Prototype C of the Library, the Mosaic, at the hidden address #/lab/library-c (src/lab/library-c).
const LibraryC=lazyPart(()=>import('./lab/library-c/LibraryC').then(m=>m.LibraryC),LAB);
// Prototype D of the Library, the Logbook, at the hidden address #/lab/library-d (src/lab/library-d).
const LibraryD=lazyPart(()=>import('./lab/library-d/LibraryD').then(m=>m.LibraryD),LAB);
// The Library tab: "Your Library" (src/lab/library-e), also at its old lab address #/lab/library-e.
const LibraryE=lazyPart(()=>import('./lab/library-e/LibraryE').then(m=>m.LibraryE));
// Prototype F of the Library, the Edition, at the hidden address #/lab/library-f (src/lab/library-f).
const LibraryF=lazyPart(()=>import('./lab/library-f/LibraryF').then(m=>m.LibraryF),LAB);
const NotebookReflection=lazyPart(()=>import('./components/NotebookReflection').then(m=>m.NotebookReflection));
const NotebookEditor=lazyPart(()=>import('./components/NotebookEditor').then(m=>m.NotebookEditor));
const LearningExpedition=lazyPart(()=>import('./components/LearningExpedition').then(m=>m.LearningExpedition));
const GuideConversation=lazyPart(()=>import('./components/AtlasGuide').then(m=>m.GuideConversation));
const LearnerMemory=lazyPart(()=>import('./components/AtlasGuide').then(m=>m.LearnerMemory));
const GuideEconomics=lazyPart(()=>import('./components/AtlasGuide').then(m=>m.GuideEconomics));
/** Warm every lazy chunk after the first map paint, so the first tap on a hub, a tab or a dialog is instant. */
function prefetchParts(){for(const load of LAZY_LOADERS)void load().catch(()=>{})}
/** Reels left in the Reels tab at or below which earlier decks' reels are fetched (once). */
const EARLIER_WHEN_LEFT=4;
/** The same IDs keep the same array, so recomputing evidence to the same answer never redraws the map. */
function useStableList(list:string[]):string[]{const kept=useRef(list);if(kept.current!==list&&(kept.current.length!==list.length||kept.current.some((id,index)=>id!==list[index])))kept.current=list;return kept.current}
/** The same, for any value with its own test of sameness (the shelf's fill map and charted set). */
function useStable<T>(value:T,same:(a:T,b:T)=>boolean):T{const kept=useRef(value);if(kept.current!==value&&!same(kept.current,value))kept.current=value;return kept.current}
/** Places with hand-built content (lessons, discoveries): charted on the map even without a generated page. */
const HAND_BUILT=[...PACK_PLACES.map(place=>place.nodeId),...DISCOVERIES.map(discovery=>discovery.footprintId)];
const LearningApp=lazyPart(()=>import('./LearningApp').then(module=>module.LearningApp),{prefetch:false,fallback:<p className="loading-sketch">Opening the learning sketch…</p>});
const Icon=({name}:{name:'search'|'back'|'close'|'arrow'|'menu'|'light'|'book'|'map'|'plus'|'more'|'play'|'reel'})=><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{name==='reel'?<><rect x="5.5" y="2.75" width="13" height="18.5" rx="2.6"/><path d="M10.4 9.3v5.4l4.4-2.7Z" fill="currentColor" stroke="none"/></>:name==='more'?<path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"/>:name==='play'?<path d="M9 6.8v10.4l8.2-5.2Z" fill="currentColor" stroke="none"/>:name==='book'?<><path d="M4 4h6q2 0 2 2v15q0-3-3-3H4ZM20 4h-6q-2 0-2 2v15q0-3 3-3h5Z"/></>:name==='map'?<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15"/></>:name==='plus'?<path d="M12 5v14M5 12h14"/>:name==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>:name==='back'?<path d="m14 5-7 7 7 7M7 12h14"/>:name==='close'?<path d="m6 6 12 12M6 18 18 6"/>:name==='arrow'?<path d="M3 12h17m-7-7 7 7-7 7"/>:name==='menu'?<><path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2" style={{fill:'var(--icon-knob,#0a0d1a)'}}/><circle cx="15" cy="16" r="2" style={{fill:'var(--icon-knob,#0a0d1a)'}}/></>:<path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3Z"/>}</svg>;
const SEARCH_SHORTCUT=typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform)?'⌘K':'Ctrl K';
export function App(){return new URLSearchParams(window.location.search).has('learning')?<LearningApp/>:<MapPrototype/>}

function MapPrototype(){
 const loaded=useMemo(()=>loadDemoProgress(),[]);
 const [demo,setDemo]=useState(loaded.data);
 const notebookLoaded=useMemo(()=>loadNotebook(),[]);
 const [notebook,setNotebook]=useState(notebookLoaded.data);
 // Saved links and reading marks (notebook/libraryStore.ts), beside the notebook under their own key.
 const libraryLoaded=useMemo(()=>loadLibrary(),[]);
 const [library,setLibrary]=useState<LibraryStore>(libraryLoaded.data);
 const libraryRef=useRef(library);libraryRef.current=library;
 const libraryBlocked=useRef(libraryLoaded.blocked);
 const getLibrary=useCallback(()=>libraryRef.current,[]);
 const memory=useLearner();const {learner,learnerWarning}=memory;
 const ledgerLoaded=useMemo(()=>loadExpeditionLedger(),[]);
 const [ledger,setLedger]=useState(ledgerLoaded.data);
 const ledgerRef=useRef(ledger);
 // "Prove it" check answers (checks/ledger.ts), a sibling record that never rewrites the expedition one.
 const checksLoaded=useMemo(()=>loadCheckLedger(),[]);
 const [checks,setChecks]=useState(checksLoaded.data);
 const checksRef=useRef(checks);
 // The packs and banks (content.ts) load after the first map paint; everything that needs them waits.
 const [content,setContent]=useState<Content|null>(loadedContent);
 const [contentAttempt,setContentAttempt]=useState(0);
 // What passed checks color. A pass is regraded from its bank, so until the banks load the map
 // paints the remembered copy; with no valid copy it waits for the banks rather than paint a guess.
 const rememberedColor=useMemo(()=>rememberedCheckColor(checksLoaded.data),[checksLoaded]);
 const checkColor=useMemo(()=>content?content.checkEarnedIds(checks):rememberedColor,[content,checks,rememberedColor]);
 const mapReady=checkColor!==null;
 useEffect(()=>{if(content&&checkColor)rememberCheckColor(checks,checkColor)},[content,checks,checkColor]);
 useEffect(()=>{
  if(content)return;let live=true;let retry:ReturnType<typeof setTimeout>|undefined;
  const load=()=>{void loadContent().then(next=>{if(live)setContent(next)},()=>{if(live)retry=setTimeout(()=>setContentAttempt(n=>n+1),4000)})};
  // Straight away when the map is waiting for the banks; otherwise once it has painted.
  const frame=mapReady?requestAnimationFrame(()=>setTimeout(load,0)):(load(),0);
  return()=>{live=false;cancelAnimationFrame(frame);clearTimeout(retry)};
 },[content,mapReady,contentAttempt]);
 // The clock checks are judged by; refreshed whenever evidence changes or the page comes back.
 const [now,setNow]=useState(()=>Date.now());
 // The freshness glow on proved places (checks/freshness.ts), rounded so the map redraws only when it visibly changes.
 // The shelf (src/shelf): what the learner has finished on this device, and every place's core minutes.
 const itemShelf=useShelf();const loadedShelfIndex=useShelfIndex();const shelfIndex=loadedShelfIndex??EMPTY_SHELF_INDEX;
 // Until the index is here the map keeps its older paint: drawn from an empty index, nearly all of it would show as fog, then repaint.
 const shelfReady=loadedShelfIndex!==null;
 // Right first guesses raise a place's glow too (shelf/fill.ts glowFromGuesses), merged by max.
 const glowKey=useMemo(()=>[...glowFromGuesses(itemShelf.guesses,shelfIndex.quick,new Map(content?[...content.freshnessByNode(ledger,checks,now)].map(([id,f])=>[id,f.glow]):[]))].map(([id,g])=>`${id}=${g.toFixed(2)}`).sort().join('|'),[content,ledger,checks,now,itemShelf.guesses,shelfIndex]);
 const glow=useMemo(()=>new Map<string,number>(glowKey?glowKey.split('|').map(pair=>{const at=pair.lastIndexOf('=');return [pair.slice(0,at),Number(pair.slice(at+1))]}):[]),[glowKey]);
 const {route,go,leave,toMap}=useAtlasRoute();
 const routeRef=useRef(route);routeRef.current=route;
 const [guideStatus,setGuideStatus]=useState<GuideStatus>({available:false,mode:'offline',model:'',spentUsd:0,limitUsd:15,requests:0});
 const [activeDiscoveryId,setActiveDiscoveryId]=useState<string|null>(null);
 const activeDiscovery=activeDiscoveryId?getDiscovery(activeDiscoveryId):undefined;
 const earnedIds=useMemo(()=>getEarnedIds(learner),[learner]);
 // Evidence lights its own pieces beside discovery footprints: Understood expedition runs and passed checks, one list.
 const expeditionEarnedIds=useStableList(useMemo(()=>[...new Set([...getExpeditionEarnedIds(ledger),...(checkColor??[])])],[ledger,checkColor]));
 const allEarnedIds=useMemo(()=>[...new Set([...earnedIds,...expeditionEarnedIds])],[earnedIds,expeditionEarnedIds]);
 const {proofs:autoProofs,proven:autoProven,prove:proveAuto}=useAutoProof();
 const mapCompletedIds=useMemo(()=>[...new Set([...demo.completedIds,...allEarnedIds,...autoProven])],[demo.completedIds,allEarnedIds,autoProven]);
 // How much of each place is filled in: finished core minutes, with everything completed before the shelf lit in full.
 const completeIds=useMemo(()=>Object.keys(itemShelf.state.complete),[itemShelf.state.complete]);
 // Demo marks colour the map but are mock: a place with one inside is never recorded complete.
 const mockIds=useMemo(()=>{const real=new Set([...allEarnedIds,...autoProven]);return demo.completedIds.filter(id=>!real.has(id))},[demo.completedIds,allEarnedIds,autoProven]);
 const fillResult=useMemo(()=>computeFill({nodes:catalog.all(),core:shelfIndex.core,done:itemShelf.done,legacy:mapCompletedIds,mock:mockIds,complete:completeIds,handBuilt:HAND_BUILT}),[shelfIndex,itemShelf.done,mapCompletedIds,mockIds,completeIds]);
 // The latch: a place whose content is all finished stays at 100% for good, so content added to it later never takes its fill away.
 // Only once the index has loaded; a latched place is never full again, so this settles after one write.
 useEffect(()=>{if(shelfReady)markComplete(newlyComplete(fillResult,itemShelf.state.complete))},[shelfReady,fillResult,itemShelf.state.complete]);
 const mapFill=useStable(fillResult.fill,sameFill);
 const charted=useStable(fillResult.charted,sameSet);
 const mapFilled=formatPercent(fillResult.fill.get(catalog.root.id)??0);
 const [autoPack,setAutoPack]=useState<AutoPlace|null>(null);
 const refreshGuide=useCallback(()=>{void getGuideStatus().then(setGuideStatus)},[]);
 useEffect(()=>{const controller=new AbortController();void getGuideStatus(controller.signal).then(setGuideStatus).catch(()=>{});return()=>controller.abort()},[]);
 useEffect(()=>{const timer=setTimeout(prefetchParts,600);return()=>clearTimeout(timer)},[]);
 const notebookUnsaved=useRef(false);
 const notebookPendingBase=useRef<string|null>(null);
 const [view,setView]=useState<'atlas'|'explore'|'notebook'>('atlas');
 const labA=useLibraryALab(()=>setView('notebook'),view,route);
 const labB=useLibraryLab();const inLabB=!!labB;
 useEffect(()=>{if(inLabB)setView('notebook')},[inLabB]);
 const labC=useLibraryCLab(view,()=>setView('notebook'),route);
 const labD=useLibraryDLab(view,()=>setView('notebook'),route);
 const labE=useLibraryELab(view,()=>setView('notebook'),route);
 const labF=useLibraryFLab(view,()=>setView('notebook'),route);
 const libraryPicker=useLibraryPicker();
 // Explore: which side of its switch is showing and which reel is on screen. Sound is one preference
 // for Watch and Reels, on by default (explore/sound.ts); the first tap anywhere unlocks it.
 const [exploreTab,setExploreTab]=useState<ExploreTab>('feed');
 useEffect(()=>installSoundUnlock(),[]);
 // A video asked for by name (a hub's Watch row): the Watch feed opens at it.
 const [feedRequest,setFeedRequest]=useState<{videoId:string;nonce:number}|null>(null);
 // A reel opened by name (a hub's reel row, the Library): it plays from its start, even one seen before.
 const [reelOpened,setReelOpened]=useState<{id:string;nonce:number}|null>(null);
 const shelfLoaded=useMemo(()=>loadReelShelf(),[]);
 const [shelf,setShelf]=useState<ReelShelf>(shelfLoaded);
 const shelfRef=useRef(shelf);shelfRef.current=shelf;
 // The Reels tab holds every premade reel (explore/today.ts reelQueue): today's set (the day's dated
 // deck woven with evergreen reels, or the evergreen deck alone when there is none), then the evergreen
 // reels not in it, then earlier decks' reels still live, fetched once the learner nears the end.
 // The first reel is chosen once it has loaded (null until then).
 const [feed,setFeed]=useState<TodaysSet|null>(null);
 const [feedReels,setFeedReels]=useState<readonly Reel[]|null>(null);
 const earlierAsked=useRef(false);
 useEffect(()=>{if(!content||feed)return;let live=true;const watched=shelfRef.current.watched;void content.loadTodaysSet(watched).then(async set=>{
  let reels=content.reelQueue([set.reels,content.REELS],watched);
  // Every one of them watched already: reach back to earlier decks before choosing where to open.
  if(reels.every(reel=>watched.includes(reel.id))){earlierAsked.current=true;reels=content.reelQueue([reels,await content.loadEarlierReels(set)],watched)}
  if(live){setFeed(set);setFeedReels(reels)}
 });return()=>{live=false}},[content,feed]);
 const [reelAt,setReelAt]=useState<number|null>(null);
 useEffect(()=>{if(feedReels&&reelAt===null)setReelAt(firstUnwatched(feedReels.map(reel=>reel.id),shelfRef.current))},[feedReels,reelAt]);
 useEffect(()=>{if(earlierAsked.current||!content||!feed||!feedReels||reelAt===null||feedReels.length-reelAt>EARLIER_WHEN_LEFT)return;earlierAsked.current=true;void content.loadEarlierReels(feed).then(more=>{if(more.length)setFeedReels(reels=>reels&&content.reelQueue([reels,more],shelfRef.current.watched))})},[content,feed,feedReels,reelAt]);
 // Saved reels from a dated deck, copied whole (explore/keptReels.ts): once the deck moves on they
 // stay on their hubs and in the Library. A copy is taken while the Reels tab holds the reel.
 const [keptReels,setKeptReels]=useState<readonly EngineReel[]>(()=>loadKeptReels());
 const keptRef=useRef(keptReels);
 useEffect(()=>{const next=keepSaved(keptRef.current,shelf.pinned.map(pin=>pin.id),(feedReels??[]).filter(reel=>!content?.getReel(reel.id)));if(next===keptRef.current)return;keptRef.current=next;setKeptReels(next);const error=saveKeptReels(next);if(error)setWarning(error)},[shelf.pinned,feedReels,content]);
 /** A reel by ID, wherever it is: the Reels tab, the evergreen deck, or a kept copy. */
 const reelById=useCallback((id:string):Reel|undefined=>feedReels?.find(reel=>reel.id===id)??content?.getReel(id)??keptReels.find(reel=>reel.id===id),[feedReels,content,keptReels]);
 // Where saved reels sit: the places chosen for each on the Save sheet, else its own.
 const pinnedReelPlaces=useStableList(useMemo(()=>shelf.pinned.flatMap(pin=>{const reel=reelById(pin.id);return reel?pinPlaces(pin,reel.nodeId):[...(pin.places??[])]}),[shelf.pinned,reelById]));
 // Once opened, Explore stays mounted (hidden) so coming back resumes the same reel where it was.
 const [exploreOpened,setExploreOpened]=useState(false);
 useEffect(()=>{if(view==='explore')setExploreOpened(true)},[view]);
 const updateShelf=useCallback((change:(shelf:ReelShelf)=>ReelShelf)=>{const next=change(shelfRef.current);if(next===shelfRef.current)return;shelfRef.current=next;setShelf(next);const error=saveReelShelf(next);if(error)setWarning(error)},[]);
 const saveReelPin=useCallback((id:string,places:string[])=>updateShelf(current=>savePin(current,id,places)),[updateShelf]);
 const removeReelPin=useCallback((id:string)=>updateShelf(current=>removePin(current,id)),[updateShelf]);
 const finishReel=useCallback((id:string)=>{updateShelf(current=>markWatched(current,id));markShelfDone(reelItemId(id))},[updateShelf]);
 /** The last screen under an expedition, so leaving one opened from Explore returns there. */
 const baseRouteRef=useRef<AtlasRoute>({kind:'map'});
 const [editor,setEditor]=useState<{entry?:NotebookEntry;kind?:'idea'|'question';title?:string;nodeId?:string}>({});
 const demoRef=useRef(demo);demoRef.current=demo;
 const initialId=useRef(demo.locationId);
 const {atmosphereRef,initialAtmosphere,paintAtmosphere}=useAtlasAtmosphere(initialId.current);
 const [location,setLocation]=useState<AtlasNode>(catalog.get(initialId.current)||catalog.root);
 const [request,setRequest]=useState<{id:string;nonce:number}|null>(null);
 const [busy,setBusy]=useState(false);
 const [colorPreview,setColorPreview]=useState<SpectrumPreviewMode>('off');
 const [warning,setWarning]=useState<string|null>(loaded.warning||notebookLoaded.warning||ledgerLoaded.warning||checksLoaded.warning||libraryLoaded.warning);
 const [dialog,setDialog]=useState<'menu'|'search'|'settings'|'about'|'capture'|'reflect'|'expedition'|'guide'|'memory'|'economics'|null>(null);
 const [query,setQuery]=useState('');
 const [toast,setToast]=useState('');
 const [newlyMarked,setNewlyMarked]=useState(false);
 const [importText,setImportText]=useState('');
 const [confirmReset,setConfirmReset]=useState(false);
 const headingRef=useRef<HTMLHeadingElement>(null);
 const leafRef=useRef<HTMLElement>(null);
 const children=catalog.getChildren(location);
 const isLeaf=children.length===0&&location.id!==catalog.root.id;
 const leafPack=isLeaf?packPlaceAt(location.id):undefined;
 const leafExpedition=leafPack?content?.expeditionAt(location.id):undefined;
 // An expedition's leaf panel waits for its pack, so it never shows a half-filled card.
 const leafReady=mapReady&&(!leafPack||!!leafExpedition);
 const inEvolution=location.id.startsWith(EVOLUTION_ID+'.');
 const isSamplePiece=isLeaf&&location.depth>2&&!leafPack&&!inEvolution;
 const completed=demo.completedIds.includes(location.id);
 const subject=location.id.split('.')[1]||'technology';
 // Starlight at the world view; inside a territory, that territory's own light.
 const accent=location.depth===0?STARLIGHT:territoryColor(location.id);
 const exploration=useMemo(()=>getExplorationContext(location,learner,notebook.entries,expeditionEarnedIds),[learner,location,notebook.entries,expeditionEarnedIds]);
 const continuing=useMemo(()=>continueDiscovery(learner),[learner]);
 const suggestions=useMemo(()=>{
  if(location.depth!==0||!continuing)return exploration.suggestions;
  const resumed={discovery:continuing,kind:'revisit' as const,reason:'Pick up your saved learning. Your answers and any help you used are remembered.',proximity:'inside' as const,scopeLabel:'Continue your discovery'};
  return [resumed,...exploration.suggestions.filter(s=>s.discovery.id!==continuing.id)];
 },[continuing,exploration.suggestions,location.depth]);
 // Everything else done on this device (videos watched, pins, notes, reading), so a day spent watching is never met as a break.
 const activity=useMemo(()=>otherActivity({learner,entries:notebook.entries,library,shelf,...feedActivity()},now),[learner,notebook.entries,library,shelf,now]);
 const autoIndex=useAutoIndex();
 const hubInput=useMemo(()=>({learner,ledger,earnedIds:[...allEarnedIds,...autoProven],entries:notebook.entries,checks,now,activity,generated:autoIndex}),[learner,ledger,allEarnedIds,autoProven,notebook.entries,checks,now,activity,autoIndex]);
 // The single next step for this place, the same one its hub leads with (floats over the map on desktop).
 const next=useMemo(()=>content?content.nextStepFor(location,hubInput):null,[content,location,hubInput]);
 const leafDiscovery=DISCOVERIES.find(d=>d.footprintId===location.id);
 const leafDescription=leafPack||inEvolution?location.description??leafExpedition?.pack.question:leafDiscovery?leafDiscovery.summary:isSamplePiece&&newlyMarked?'This piece is now filled. Pull back to see it light up on the map.':location.description;
 const learningCounts=useMemo(()=>{const counts:Record<string,number>={};for(const id of allEarnedIds){const node=catalog.get(id);if(node)for(const ancestor of catalog.getPath(node))counts[ancestor.id]=(counts[ancestor.id]||0)+1}return counts},[allEarnedIds]);
 const frontierIds=useMemo(()=>{const ids=new Set<string>();const mark=(id:string)=>{const node=catalog.get(id);if(node)for(const ancestor of catalog.getPath(node))ids.add(ancestor.id)};for(const {discovery} of suggestions)mark(discovery.footprintId);for(const place of PACK_PLACES)if(!expeditionEarnedIds.includes(place.nodeId))mark(place.nodeId);return ids},[suggestions,expeditionEarnedIds]);
 const hubNode=route.kind==='hub'?catalog.get(route.nodeId):undefined;
 const learnables=useMemo(()=>content?content.buildLearnables(learner,ledger,expeditionEarnedIds):null,[content,learner,ledger,expeditionEarnedIds]);
 // With nothing in progress, the Discoveries page leads with the step the map itself suggests.
 const worldNext=useMemo(()=>view==='explore'&&content?content.nextStepFor(catalog.root,hubInput):null,[content,view,hubInput]);
 const discoveriesLead=content&&learnables?content.leadFor(learnables,worldNext):null;
 const autoPlace=useAutoPlace(hubNode?.id??'');
 const hubModel=useMemo(()=>view==='atlas'&&hubNode&&content?content.buildHub(hubNode,hubInput):null,[content,view,hubNode,hubInput]);
 // The ?nav= prototype: the place in view's page, offered from the map's lower edge.
 const peekModel=useMemo(()=>NAV_MODE!=='off'&&view==='atlas'&&location.depth>0&&content?content.buildHub(location as AtlasNode,hubInput):null,[content,view,location,hubInput]);
 // In the sheet, the map stays in reach: touching another place lowers the sheet as the camera flies.
 useEffect(()=>{if(NAV_MODE==='sheet'&&busy&&route.kind==='hub')toMap()},[busy,route.kind,toMap]);
 const activeExpedition=route.kind==='expedition'?content?.getExpedition(route.packId):undefined;
 const activeCheck=route.kind==='check'&&content?.bankFor(route.nodeId)?catalog.get(route.nodeId):undefined;
 const activeMission=route.kind==='mission'&&content?.hasCases(route.nodeId)?catalog.get(route.nodeId):undefined;
 const checkHome=route.kind==='check'||route.kind==='mission'?catalog.get(route.from??'')??catalog.get(route.nodeId)??catalog.root:catalog.root;
 const expeditionHome=route.kind==='expedition'&&activeExpedition?catalog.get(route.from??'')??catalog.getParent(catalog.get(activeExpedition.nodeId)!)??catalog.root:catalog.root;
 const proveItLater=useCallback((nodeId:string)=>{void loadContent().then(loaded=>loaded.proveIt(nodeId),()=>{})},[]);
 const searchFold=(text:string)=>text.toLowerCase().replace(/[-‐‑–—]/g,' ');
 const searchResults=catalog.all().filter(n=>n.depth>0&&(!query||searchFold(n.name).includes(searchFold(query)))).slice(0,query?24:8);
 const navigate=useCallback((id:string)=>{if(routeRef.current.kind!=='map')toMap();setView('atlas');setDialog(null);setNewlyMarked(false);setRequest({id,nonce:Date.now()+Math.random()})},[toMap]);
 /** Explore's scope moves the map's place, as navigate does, without leaving Explore: the hidden map flies, and its new place is the scope. */
 const scopeTo=useCallback((id:string)=>{setDialog(null);setNewlyMarked(false);setRequest({id,nonce:Date.now()+Math.random()})},[]);
 const openHub=useCallback((id:string)=>{setDialog(null);setView('atlas');go({kind:'hub',nodeId:id})},[go]);
 const openExpedition=useCallback((packId:string,from:string)=>{setDialog(null);go({kind:'expedition',packId,beat:0,from})},[go]);
 const openCheck=useCallback((nodeId:string,from:string)=>{setDialog(null);go({kind:'check',nodeId,from})},[go]);
 // A place is proved by its next new case (a field mission); once none is left, in words.
 const openProve=useCallback((nodeId:string,from:string)=>{setDialog(null);go({kind:loadedContent()?.nextCase(nodeId,checksRef.current)?'mission':'check',nodeId,from})},[go]);
 // Opened from Explore (its list, or Prove it on a reel), an expedition or a check returns there; otherwise to its place's hub.
 // Opened from the Library (a finished book's new case, a lab prototype's case or lesson), it returns to the Library.
 const exitCheck=useCallback(()=>leave(view==='explore'||view==='notebook'?baseRouteRef.current:{kind:'hub',nodeId:checkHome.id}),[leave,checkHome.id,view]);
 const exitExpedition=useCallback(()=>leave(view==='explore'||view==='notebook'?baseRouteRef.current:{kind:'hub',nodeId:expeditionHome.id}),[leave,expeditionHome.id,view]);
 useEffect(()=>{if(route.kind!=='expedition'&&route.kind!=='check'&&route.kind!=='mission')baseRouteRef.current=route},[route]);
 const updateLedger=useCallback((change:(ledger:ExpeditionLedger)=>ExpeditionLedger)=>{
  // Start from what is on disk too, so another tab's results are never overwritten.
  const disk=readExpeditionLedger();const base=disk?mergeExpeditionLedgers(ledgerRef.current,disk):ledgerRef.current;
  const nextLedger=change(base);ledgerRef.current=nextLedger;setLedger(nextLedger);
  const error=saveExpeditionLedger(nextLedger);if(error)setWarning(error);
 },[]);
 const answerExpedition=useCallback((packId:string,gradeId:string)=>updateLedger(current=>markSeen(current,packId,gradeId)),[updateLedger]);
 const recordCheck=useCallback((events:CheckEvent[])=>{
  // Merged with what is on disk first, so another tab's answers are never overwritten.
  try{const disk=readCheckLedger();const base=disk?mergeCheckLedgers(checksRef.current,disk):checksRef.current;const nextChecks=appendCheckEvents(base,events);checksRef.current=nextChecks;setChecks(nextChecks);const error=saveCheckLedger(nextChecks);if(error)setWarning(error)}catch(error){setWarning(error instanceof Error?error.message:'This answer could not be kept.')}
 },[]);
 const finishExpedition=useCallback((run:Parameters<typeof recordRun>[1])=>{try{updateLedger(current=>recordRun(current,run))}catch(error){setWarning(error instanceof Error?error.message:'This result could not be kept.')}},[updateLedger]);
 /** Discoveries open from their own place's hub, with the discovery as its next step. */
 const startDiscovery=useCallback((id:string)=>{const discovery=getDiscovery(id);if(discovery)openHub(discovery.topicId)},[openHub]);
 const nextAction=next?next.kind==='welcome'?{title:next.items[0].node.name,minutes:2,meta:'Welcome back',verb:'Refresh',color:territoryColor(next.items[0].node.id),run:()=>openProve(next.items[0].node.id,next.items[0].node.id)}:next.kind==='check'?{title:next.item.node.name,minutes:2,meta:'Ready to refresh',verb:'Refresh',color:territoryColor(next.item.node.id),run:()=>openProve(next.item.node.id,next.item.node.id)}:next.kind==='expedition'?{title:next.item.expedition.pack.title,minutes:next.item.expedition.pack.minutes,verb:next.item.level==='Understood'?'Play again':next.item.level?'Try again':'Begin',color:territoryColor(next.item.expedition.nodeId),run:()=>openExpedition(next.item.expedition.pack.id,location.id)}:{title:next.item.discovery.title,minutes:next.item.discovery.minutes,verb:next.item.resume?'Continue':next.item.earned?'Revisit':'Begin',color:territoryColor(next.item.discovery.topicId),run:()=>startDiscovery(next.item.discovery.id)}:null;
 const onLocationChange=useCallback((node:AtlasNode)=>{setLocation(node);setDemo(s=>({...s,locationId:node.id}));setNewlyMarked(false);requestAnimationFrame(()=>{if(leafRef.current)leafRef.current.scrollTop=0})},[]);
 useEffect(()=>{const timer=setTimeout(()=>{const error=writeDemoProgress(demo);if(error)setWarning(error)},120);return()=>clearTimeout(timer)},[demo]);
 useEffect(()=>{const flush=()=>writeDemoProgress(demoRef.current);window.addEventListener('pagehide',flush);return()=>window.removeEventListener('pagehide',flush)},[]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key!==CHECK_LEDGER_KEY&&event.key!==null)return;const disk=readCheckLedger();if(!disk)return;const merged=mergeCheckLedgers(checksRef.current,disk);checksRef.current=merged;setChecks(merged)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 useEffect(()=>{setNow(Date.now())},[ledger,checks,route]);
 useEffect(()=>{const wake=()=>{if(document.visibilityState==='visible')setNow(Date.now())};document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);return()=>{document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake)}},[]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key!==EXPEDITION_LEDGER_KEY&&event.key!==null)return;const disk=readExpeditionLedger();if(!disk)return;const merged=mergeExpeditionLedgers(ledgerRef.current,disk);ledgerRef.current=merged;setLedger(merged)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 // An unknown place or expedition in the address falls back to the map.
 useEffect(()=>{if((route.kind==='hub'&&!hubNode)||(route.kind==='expedition'&&!packPlace(route.packId)))go({kind:'map'},'replace')},[route,hubNode,go]);
 // A check for a place without a bank opens that place's hub instead; an unknown place, the map.
 useEffect(()=>{if(content&&route.kind==='mission'&&!activeMission)go(catalog.get(route.nodeId)?{kind:'check',nodeId:route.nodeId,from:route.from}:{kind:'map'},'replace')},[content,route,activeMission,go]);
 useEffect(()=>{if(content&&route.kind==='check'&&!activeCheck)go(catalog.get(route.nodeId)?{kind:'hub',nodeId:route.nodeId}:{kind:'map'},'replace')},[content,route,activeCheck,go]);
 // A hub belongs to the Atlas tab, even when a payoff link opens one from elsewhere.
 useEffect(()=>{if(route.kind==='hub')setView('atlas')},[route]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer)},[toast]);
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   // The Library prototype picker sits over everything: Escape closes it and nothing reaches the page under it.
   if(libraryPicker){if(e.key==='Escape'){e.preventDefault();closeLibraryPicker()}return}
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setDialog(v=>v==='search'?null:'search')}
   if(e.key==='Escape'){if(dialog){setDialog(null);return}if(route.kind==='expedition'||route.kind==='check'||route.kind==='mission')return;if(route.kind==='hub'){e.preventDefault();navigate(route.nodeId);return}if(view==='atlas'&&location.parentId){e.preventDefault();navigate(location.parentId)}}
  };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[dialog,location,busy,navigate,view,route,libraryPicker]);
 useEffect(()=>{
  if(!dialog)return;const previous=document.activeElement as HTMLElement|null;
  const modal=document.querySelector<HTMLElement>('[role="dialog"],[role="menu"]');
  const items=()=>Array.from(modal?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,a[href]')||[]).filter(el=>{
   if(!el.getClientRects().length||el.closest('[inert],[hidden]'))return false;
   if(el instanceof HTMLInputElement&&(el.type==='hidden'||el.type==='radio'&&!el.checked))return false;
   for(let parent=el.parentElement;parent&&parent!==modal;parent=parent.parentElement){if(parent instanceof HTMLDetailsElement&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(el))return false}
   return true;
  });
  requestAnimationFrame(()=>{const all=items();(all.find(el=>el.tagName==='TEXTAREA'||el instanceof HTMLInputElement&&['text','search','url','email'].includes(el.type))||all[0])?.focus()});
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const all=items();if(!all.length)return;e.preventDefault();const index=all.indexOf(document.activeElement as HTMLElement);all[(index+(e.shiftKey?-1:1)+all.length)%all.length]?.focus()};
  document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);previous?.focus({preventScroll:true})};
 },[dialog]);
 useEffect(()=>{if(isLeaf&&!busy&&leafReady){requestAnimationFrame(()=>headingRef.current?.focus({preventScroll:true}))}},[location.id,isLeaf,busy,leafReady]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key!==NOTEBOOK_STORAGE_KEY&&event.key!==null)return;if(notebookUnsaved.current){setWarning('The notebook changed in another tab. Your unsaved ideas are still here; export your notebook to keep a copy.');return}try{setNotebook(event.newValue?parseNotebook(event.newValue):createNotebook())}catch{setWarning('A notebook update could not be read. Your current session is still available to export.')}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key!==LIBRARY_STORAGE_KEY&&event.key!==null)return;if(libraryBlocked.current)return;const disk=readLibrary();if(!disk)return;const merged=mergeLibraries(libraryRef.current,disk);libraryRef.current=merged;setLibrary(merged)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const initial=learner.profile.name.trim().charAt(0).toUpperCase();
 const saveTrouble=!!(warning||learnerWarning||notebookUnsaved.current);
 const latestNotebook=()=>{if(notebookUnsaved.current)return notebook;const current=loadNotebook();return current.warning?notebook:current.data};
 const noteCounts=useMemo(()=>{const counts:Record<string,number>={};for(const entry of notebook.entries){const places=new Set<string>();for(const id of entry.nodeIds){const n=catalog.get(id);if(n)for(const ancestor of catalog.getPath(n))places.add(ancestor.id)}for(const id of places)counts[id]=(counts[id]||0)+1}return counts},[notebook]);
 const openCapture=(kind:'idea'|'question'='idea',title='',nodeId=location.id)=>{setEditor({kind,title,nodeId});setDialog('capture')};
 const editEntry=(entry:NotebookEntry)=>{setEditor({entry});setDialog('capture')};
 const persistNotebook=(next:Notebook,message:string)=>{
  exportNotebook(next);
  const current=loadNotebook();const fingerprint=JSON.stringify(current.data);
  if(notebookUnsaved.current&&(current.warning||fingerprint!==notebookPendingBase.current)){
   setNotebook(next);setWarning('Another tab changed the saved notebook. Your edits are kept in this session. Export this copy, then reload and import it to combine your notes.');setToast('Your session is preserved. Export it before reloading.');return;
  }
  const error=saveNotebook(next);const wasUnsaved=notebookUnsaved.current;notebookUnsaved.current=Boolean(error);notebookPendingBase.current=error?fingerprint:null;setNotebook(next);
  if(error){setWarning(error);setToast('Kept in this session. Export your notebook to keep a copy.')}else{if(wasUnsaved)setWarning(null);setToast(message)}
 };
 const checkEditorSnapshot=(current:Notebook,id:string)=>{
  const original=editor.entry;if(!original||original.id!==id)return;
  const saved=current.entries.find(entry=>entry.id===id);
  if(!saved||JSON.stringify(saved)!==JSON.stringify(original))throw new Error('This entry changed or was removed in another tab. Copy your draft, then close and reopen the entry before saving.');
 };
 const saveEntry=(input:NotebookEntryInput)=>{const latest=latestNotebook();if(input.id)checkEditorSnapshot(latest,input.id);const next=upsertNotebookEntry(latest,input);persistNotebook(next,input.id?'Your idea has been updated.':'Added to your notebook.');setDialog(null)};
 const removeEntry=(id:string)=>{const latest=latestNotebook();checkEditorSnapshot(latest,id);persistNotebook(deleteNotebookEntry(latest,id),'Removed from your notebook.');setDialog(null)};
 const reflectEntry=(entry:NotebookEntry)=>{setEditor({entry});setDialog('reflect')};
 const saveReflection=(reflection:string)=>{const original=editor.entry;if(!original)return;const latest=latestNotebook();const entry=latest.entries.find(item=>item.id===original.id);if(!entry)throw new Error('This note was removed elsewhere. Close this reflection and check your notebook.');const date=new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});const body=`${entry.body}${entry.body?'\n\n':''}Reflection · ${date}\n${reflection.trim()}`;const next=upsertNotebookEntry(latest,{...entry,body,evidence:entry.kind==='question'?'encountered':entry.evidence==='applied'?'applied':'explained'});persistNotebook(next,'Reflection added. Your original note is preserved.');setDialog(null)};
 /** Links and marks: merged with what is on disk first, so another tab's saves are never overwritten.
  * An unreadable saved record is never written over; changes then last for the session and export. */
 const updateLibrary=(change:(current:LibraryStore)=>LibraryStore):string|null=>{
  let next:LibraryStore;
  try{const disk=libraryBlocked.current?null:readLibrary();next=change(disk?mergeLibraries(libraryRef.current,disk):libraryRef.current)}catch(error){return error instanceof Error?error.message:'This could not be saved.'}
  libraryRef.current=next;setLibrary(next);
  const error=libraryBlocked.current?'Saving links is blocked because the saved record could not be read. The original is untouched. Export your session before closing.':saveLibrary(next);
  if(error){setWarning(error);setToast('Kept in this session. Export your library to keep a copy.')}
  return null;
 };
 const saveLinkDraft=(draft:LinkDraft)=>{const problem=updateLibrary(current=>saveLink(current,draft));if(!problem)setToast(draft.id?'Link updated.':'Saved to your library.');return problem};
 const removeSavedLink=(id:string)=>{updateLibrary(current=>removeLink(current,id));setToast('Link removed.')};
 const cycleWork=(workId:string)=>{updateLibrary(current=>cycleReading(current,workId))};
 /** The optional "what stuck" line, kept as a notebook entry tied to its run or check. */
 const keepStuck=(source:'run'|'check',id:string,nodeId:string,line:string,label:string):string|null=>{
  try{const latest=latestNotebook();const entryId=stuckEntryId(source,id);const existing=latest.entries.find(entry=>entry.id===entryId);
   const next=upsertNotebookEntry(latest,{id:entryId,title:line.slice(0,160),body:existing?.body??'',sourceUrl:'',sourceLabel:label,kind:'idea',evidence:'explained',nodeIds:catalog.get(nodeId)?[nodeId]:[],createdAt:existing?.createdAt});
   persistNotebook(next,'Kept in your library.');return null}catch(error){return error instanceof Error?error.message:'This line could not be kept.'}
 };
 const exportNotes=()=>{const explored=loadShelf();const file=withLibrary(JSON.parse(exportNotebook(notebook)),libraryRef.current);const blob=new Blob([JSON.stringify(Object.keys(explored.done).length||Object.keys(explored.guesses).length||Object.keys(explored.complete).length?{...file,shelf:explored}:file,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-knowledge-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Notebook exported.')};
 const importNotes=(raw:string)=>{
  const incoming=parseNotebook(raw);const incomingLibrary=libraryInFile(raw);const current=loadNotebook();const entries=new Map<string,NotebookEntry>();
  for(const book of [current.data,latestNotebook(),incoming])for(const entry of book.entries){const previous=entries.get(entry.id);if(!previous||entry.updatedAt>previous.updatedAt)entries.set(entry.id,entry)}
  const next={version:1 as const,entries:[...entries.values()]};exportNotebook(next);
  const error=saveNotebook(next,undefined,{replaceInvalid:true});notebookUnsaved.current=Boolean(error);notebookPendingBase.current=error?JSON.stringify(current.data):null;setNotebook(next);
  if(error){setWarning(error);throw new Error(error)}
  if(incomingLibrary){const disk=readLibrary();const merged=mergeLibraries(mergeLibraries(libraryRef.current,disk??libraryRef.current),incomingLibrary);libraryRef.current=merged;setLibrary(merged);const problem=saveLibrary(merged,undefined,{replaceInvalid:true});libraryBlocked.current=false;if(problem){setWarning(problem);throw new Error(problem)}}
  // What was finished (src/shelf), when the file carries it: merged in, nothing here lost.
  try{const shelfInFile=(JSON.parse(raw) as {shelf?:unknown}).shelf;if(shelfInFile)mergeShelf(shelfFrom(shelfInFile))}catch{/* parseNotebook has already read this file */}
  setWarning(null);setToast('Imported. Everything already here was kept.')
 };
 const openLearnable=(item:Learnable)=>item.kind==='expedition'?openExpedition(item.id,catalog.getParent(catalog.get(item.nodeId)!)?.id??catalog.root.id):openDiscovery(item.id);
 const openDiscovery=(id:string)=>{if(!getDiscovery(id))return;try{memory.visit(id);setActiveDiscoveryId(id);setDialog('expedition')}catch(error){setToast(error instanceof Error?error.message:'This discovery could not be opened.')}};
 const guideSources=(message:string)=>{const found=retrieveSources(message,dialog==='expedition'?activeDiscovery?.topicId:location.id);if(dialog==='expedition'&&activeDiscovery){for(const source of LEARNING_SOURCES.filter(s=>activeDiscovery.sourceIds.includes(s.id)))if(!found.some(s=>s.id===source.id))found.unshift(source)}return found.slice(0,3)};
 const ask=async(message:string,history:GuideMessage[]=[],signal?:AbortSignal)=>{
  const topicId=dialog==='expedition'&&activeDiscovery?activeDiscovery.topicId:location.id;
  const recent=learner.attempts.slice(-12).map(a=>{const d=getDiscovery(a.discoveryId);return `${d?.title}: ${!a.answerId?'asked for support':a.passed?a.assisted?'correct with support':a.phase==='transfer'?'fresh example independently correct':'initial probe correct':'incorrect attempt'} (${a.phase}, ${a.at.slice(0,10)})`}).join('\n');
  const reply=await askGuide({message,topicId,profile:learner.profile,evidenceSummary:`${recent||'No learning evidence yet. Do not assume prior mastery.'}\nSuggested available discoveries:\n${getFrontier(learner,topicId,3).map(s=>`${s.discovery.title}: ${s.reason}`).join('\n')}`,sources:guideSources(message),notes:retrieveNotebookContext(notebook,topicId,message),history},signal);
  refreshGuide();return reply;
 };
 const exportMemory=()=>{const blob=new Blob([memory.exportMemory()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-learning-memory.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Learning memory exported.')};
 const finishDiscovery=()=>{if(!activeDiscovery)return;const node=catalog.get(activeDiscovery.footprintId);navigate(node?.parentId||activeDiscovery.topicId);setToast(earnedIds.includes(activeDiscovery.footprintId)?'A fresh example, understood. This exact piece has earned its color.':'A useful step forward. Your practice and support are remembered.')};
 const changeView=(nextView:'atlas'|'explore'|'notebook')=>{if(route.kind!=='map')toMap();setView(nextView);setDialog(null)};
 /** Explore at one reel: from a hub's reel row or a pinned reel. */
/** A reel not in the Reels tab (one already watched, on a hub row) joins it at the front for this visit. */
 const openReel=(id:string)=>{if(!feedReels)return;const index=feedReels.findIndex(reel=>reel.id===id);const extra=index<0?reelById(id):undefined;if(index<0&&!extra)return;if(extra)setFeedReels([extra,...feedReels]);setReelOpened({id,nonce:Date.now()});setExploreTab('reels');setReelAt(Math.max(0,index));changeView('explore')};
 /** Explore's Watch feed at one video: from a hub's Watch row. */
 const openVideo=(videoId:string)=>{setFeedRequest({videoId,nonce:Date.now()});setExploreTab('feed');changeView('explore')};
 /** The Watch checkpoint's optional "what stuck" line, kept as a notebook idea at its place. */
 const keepWatchLine=(nodeId:string,line:string):string|null=>{try{const latest=latestNotebook();persistNotebook(upsertNotebookEntry(latest,{title:line.slice(0,160),body:'',sourceUrl:'',sourceLabel:'Watch',kind:'idea',evidence:'explained',nodeIds:catalog.get(nodeId)?[nodeId]:[]}),'Kept in your library.');return null}catch(error){return error instanceof Error?error.message:'This line could not be kept.'}};
 // The Library's content, with the kept copies of saved dated reels beside the evergreen deck.
 const libraryContent=useMemo(()=>{if(!content)return null;const base=content.journalContent;const more=keptReels.filter(reel=>!base.reels.some(item=>item.id===reel.id)).map(content.reelLite);return more.length?{...base,reels:[...base.reels,...more]}:base},[content,keptReels]);
 // A place's reels: those saved here first (wherever they were made), then the rest made here or inside it.
 const reelCards=(nodeId:string)=>{const inside=(id:string)=>id===nodeId||id.startsWith(nodeId+'.');const savedHere=shelf.pinned.filter(pin=>pinPlaces(pin,reelById(pin.id)?.nodeId).some(inside)).map(pin=>pin.id);const reels=content?.reelsWithin(nodeId)??[];const extra=savedHere.filter(id=>!reels.some(reel=>reel.id===id)).flatMap(id=>{const reel=reelById(id);return reel&&inside(reel.nodeId)?[reel]:[]});const all=[...extra,...reels];return all.length?[...all].sort((a,b)=>Number(savedHere.includes(b.id))-Number(savedHere.includes(a.id))):[]};
 // Videos saved under a place or inside it, newest first: they lead its Watch row (and leave its list of links).
 // A saved link is a Watch video only when Watch can play it (its ID is in the pool): a YouTube link saved by hand stays in the hub's links.
 // The row itself drops IDs outside its pool, so its saved cards are there on its first render, never slid in after.
 const watchIds=usePoolIds(!!hubModel);
 const isWatchVideo=(url:string)=>{const id=videoIdFromUrl(url);return !!id&&(!watchIds||watchIds.has(id))};
 const savedVideosAt=(nodeId:string)=>liveLinks(library).filter(link=>linkPlaces(link).some(id=>id===nodeId||id.startsWith(nodeId+'.'))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).flatMap(link=>{const id=videoIdFromUrl(link.url);return id?[id]:[]});
 // The open hub's shelf extras, kept as the same arrays between renders so its video ranking is not redone each time.
 const hubId=hubModel?.node.id;
 const hubSavedVideos=useMemo(()=>hubId?savedVideosAt(hubId):[],[hubId,library]);
 const hubReels=useMemo(()=>hubId?reelCards(hubId):[],[hubId,shelf,content,reelById]);
 const hubPinnedReels=useMemo(()=>shelf.pinned.map(item=>item.id),[shelf]);
 // The learner's places, most telling first: what the Save sheet suggests beside a reel's own.
 const exploreMine=useMemo(()=>{const signals=feedSignals({location:location.id,ledger,checks,entries:notebook.entries,savedPlaces:liveLinks(library).flatMap(linkPlaces),pinnedReelPlaces});return [...new Set([signals.focus,...signals.recent,...signals.pinned,...signals.lit].filter((id):id is string=>!!id))]},[location.id,ledger,checks,notebook.entries,library,pinnedReelPlaces]);
 const toggle=()=>{try{setDemo(toggleDemoCompletion(demo,location.id));setNewlyMarked(!completed)}catch(e){setWarning(e instanceof Error?e.message:'This piece could not be marked.')}};
 const exportMap=()=>{try{const blob=new Blob([exportDemoProgress(demo)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-atlas-demo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Demo map exported.')}catch(e){setWarning(e instanceof Error?e.message:'Export failed.')}};
 const importMap=()=>{try{const saved=parseDemoProgress(importText);setDemo(saved);setImportText('');navigate(saved.locationId);setToast('Demo map restored.')}catch(e){setToast(e instanceof Error?e.message:'This map could not be read.')}};
 useEffect(()=>{
  const w=window as Window&{render_game_to_text?:()=>string;advanceTime?:(ms:number)=>Promise<void>};
  w.render_game_to_text=()=>JSON.stringify({mode:'map-prototype',workspace:view,explore:{tab:exploreTab,reelIndex:reelAt,reelId:reelAt!==null?feedReels?.[reelAt]?.id??null:null,day:feed?.day??null,deck:feed?.deck??null,today:feed?.reels.map(reel=>reel.id)??null,feed:feedReels?.map(reel=>reel.id)??null,sound:soundStatus(),pinned:shelf.pinned.map(item=>item.id),watched:shelf.watched},learning:{earnedIds,attempts:learner.attempts,visitedIds:learner.visitedIds,profile:learner.profile,activeDiscoveryId,frontier:suggestions.map(s=>({id:s.discovery.id,reason:s.reason})),guide:guideStatus},notebook:{entries:notebook.entries.map(({id,title,kind,evidence,nodeIds})=>({id,title,kind,evidence,nodeIds})),localOnly:true},atmosphere:{hue:Number(atmosphereRef.current?.dataset.atlasHue||atmosphereRef.current?.style.getPropertyValue('--atlas-hue')||153),tint:Number(atmosphereRef.current?.dataset.atlasTint||atmosphereRef.current?.style.getPropertyValue('--atlas-tint')||0),followsCamera:true},exploration:{earnedCount:exploration.earnedCount,noteCount:exploration.noteCount,suggestions:suggestions.map(s=>({id:s.discovery.id,proximity:s.proximity,label:s.scopeLabel}))},coordinateSystem:'SVG CSS pixels; origin top-left, x right, y down',location:{id:location.id,name:location.name,depth:location.depth},navigating:busy,regions:children.map(n=>({id:n.id,name:n.name,color:territoryColor(n.id),terminal:!catalog.getChildren(n).length})),demo:{completedIds:demo.completedIds,completedHere:completed,mockOnly:true},leaf:isLeaf,dialog,route,hub:hubModel?{nodeId:hubModel.node.id,next:hubModel.next?.kind==='expedition'?hubModel.next.item.expedition.pack.id:hubModel.next?.kind==='check'?`check:${hubModel.next.item.node.id}`:hubModel.next?.kind==='welcome'?`welcome:${hubModel.next.items.map(item=>item.node.id).join(',')}`:hubModel.next?.item.discovery.id??null,check:hubModel.check,freshness:hubModel.freshness,children:hubModel.children.length,progress:hubModel.progress}:null,checks:{events:checks.events.length,sessions:checks.events.filter(e=>e.t==='finish').map(e=>({node:e.node,at:e.at}))},glow:Object.fromEntries(glow),shelf:{done:Object.keys(itemShelf.state.done).length,guesses:Object.keys(itemShelf.state.guesses).length,complete:Object.keys(itemShelf.state.complete).length,places:Object.keys(shelfIndex.core).length,mapFilled,charted:charted.size},next:next?next.kind==='welcome'?`welcome:${next.items.map(item=>item.node.id).join(',')}`:next.kind==='check'?`${next.item.purpose}:${next.item.node.id}`:next.kind:null,expeditions:{earnedIds:expeditionEarnedIds,runs:ledger.runs.map(({packId,level,at})=>({packId,level,at})),seen:ledger.seen},preview:{enabled:colorPreview!=='off',mode:colorPreview,sampleIds:SPECTRUM_SAMPLE_IDS},saveWarning:warning});
  w.advanceTime=ms=>new Promise<void>(resolve=>{const start=performance.now();const frame=(now:number)=>now-start>=Math.min(ms,10000)?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame)});
  return()=>{delete w.render_game_to_text;delete w.advanceTime};
 },[location,busy,children,demo,completed,isLeaf,dialog,warning,colorPreview,notebook,view,learner,earnedIds,activeDiscoveryId,suggestions,guideStatus,route,hubModel,expeditionEarnedIds,ledger,checks,exploreTab,reelAt,feed,feedReels,shelf,glow,next,itemShelf,shelfIndex,mapFilled,charted]);
 return <><div ref={atmosphereRef} className="app-shell map-prototype studio-shell" style={{...initialAtmosphere,'--territory':accent} as CSSProperties} inert={!!activeExpedition||!!activeCheck}>
  <ShellBar searchOnly={view==='explore'} initial={initial} menuOpen={dialog==='menu'} searchShortcut={SEARCH_SHORTCUT} onHome={()=>navigate(catalog.root.id)} onSearch={()=>setDialog('search')} onMenu={()=>setDialog(v=>v==='menu'?null:'menu')}>
   {view==='atlas'&&(hubNode?<AtlasLocationBar node={hubNode} busy={false} onNavigate={id=>navigate(id===hubNode.parentId?hubNode.id:id)} onOpen={()=>navigate(hubNode.id)} action={<button className="atlas-open-place atlas-show-map" onClick={()=>navigate(hubNode.id)} data-action="hub-map" aria-label={`Show ${hubNode.depth?hubNode.name:'the atlas'} on the map`}><Icon name="map"/><span className="atlas-open-label">Map</span></button>}/>:<AtlasLocationBar node={location} busy={busy} onNavigate={navigate} onOpen={()=>openHub(location.id)} action={location.depth===0&&shelfReady&&charted.size?<button className="atlas-open-place" disabled={busy} onClick={()=>openHub(location.id)} data-action="open-place" aria-label={`Open the atlas overview. You've filled ${mapFilled} of the map`} title={`You've filled ${mapFilled} of the map`}><span className="atlas-open-label"><span className="shelf-map-overview">Overview</span><span className="shelf-map-fill" data-map-fill="">{mapFilled.replace('under ','<')}</span></span><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5"/></svg></button>:undefined}/>)}
  </ShellBar>
  <div className="studio-body">
  <aside className="studio-sidebar" aria-label="Workspace navigation">
   <nav className="studio-nav"><button aria-current={view==='atlas'?'page':undefined} onClick={()=>changeView('atlas')} aria-label="Map" title="Map"><Icon name="map"/><span>Map</span></button><button aria-current={view==='explore'?'page':undefined} onClick={()=>changeView('explore')} data-action="open-explore" aria-label="Explore" title="Explore"><Icon name="reel"/><span>Explore</span><small>{allEarnedIds.length||''}</small></button><button aria-label="Open library" title="Library" aria-current={view==='notebook'?'page':undefined} onClick={()=>changeView('notebook')} data-action="open-notebook"><Icon name="book"/><span>Library</span><small>{notebook.entries.length+liveLinks(library).length||''}</small></button></nav>
   <div className="studio-territories" role="group" aria-label="Territories">{catalog.getChildren(catalog.root).map(node=><button key={node.id} onClick={()=>navigate(node.id)} aria-current={(location.id===node.id||location.id.startsWith(node.id+'.'))&&view==='atlas'?'location':undefined}><i style={{background:territoryColor(node.id)}}/><span>{node.name}</span>{learningCounts[node.id]?<small aria-label={`${learningCounts[node.id]} earned`}>{learningCounts[node.id]}</small>:null}</button>)}</div>
   {shelfReady&&<p className="shelf-map-total is-side" data-map-total="">You've filled <b>{mapFilled}</b> of the map</p>}
  </aside>
  <main className="studio-main">
  {/* A place's page hides the map, except as the ?nav=sheet prototype's sheet, which leaves it in view and in reach above. */}
  <div className={`map-workspace${view!=='atlas'||(hubNode&&NAV_MODE!=='sheet')?' workspace-hidden':''}`} inert={view!=='atlas'||(!!hubNode&&NAV_MODE!=='sheet')} aria-hidden={view!=='atlas'||(!!hubNode&&NAV_MODE!=='sheet')}>
  <div className="studio-map-row"><div className={`atlas-stage${isLeaf?' has-encounter':''}`}>{shelfReady&&location.depth>0&&<p className="shelf-map-total is-stage" data-map-total="">You've filled <b>{mapFilled}</b> of the map</p>}{mapReady&&<Atlas initialId={initialId.current} request={request} completedIds={mapCompletedIds} fill={shelfReady?mapFill:undefined} charted={shelfReady?charted:undefined} glow={glow} learningCounts={learningCounts} frontierIds={frontierIds} colorPreview={colorPreview} noteCounts={noteCounts} onLocationChange={onLocationChange} onBusy={setBusy} onAtmosphereFrame={paintAtmosphere}/>}
   <SpectrumPreviewControl mode={colorPreview} onChange={setColorPreview}/>
   {isLeaf&&!busy&&leafReady&&<section ref={leafRef} className={`mock-leaf${completed?' is-marked':''}`} aria-labelledby="mock-title">
    <div className="mock-content"><div className="mock-diagram" aria-hidden="true"><svg viewBox="0 0 180 140"><path className="mock-outline" d="M29 24 85 12 150 38 161 100 109 128 35 106 16 65Z"/><path className="mock-piece" d="M85 12 99 59 69 95 35 106 16 65 29 24Z"/><path className="mock-inner" d="M99 59 150 38M99 59 135 92 161 100M69 95 109 128M135 92 109 128"/><circle cx="84" cy="75" r="2"/></svg></div>
    <h1 id="mock-title" ref={headingRef} tabIndex={-1}>{location.name}</h1>{leafDescription&&<p className="mock-description">{leafDescription}</p>}
    {leafDiscovery&&<div className="learning-leaf-entry"><p>{earnedIds.includes(leafDiscovery.footprintId)?'You demonstrated this on a fresh example. Revisit the discovery or explore its connections.':leafDiscovery.question}</p><button className="primary-button" onClick={()=>openDiscovery(leafDiscovery.id)} data-action="leaf-discovery">{earnedIds.includes(leafDiscovery.footprintId)?'Revisit this discovery':'Try this discovery'} <Icon name="arrow"/></button></div>}
    {leafExpedition&&<div className="learning-leaf-entry"><p>{leafExpedition.pack.title}<small>{leafExpedition.code?`${leafExpedition.code} · `:''}{leafExpedition.pack.minutes} min</small></p><button className="primary-button" onClick={()=>openExpedition(leafExpedition.pack.id,location.id)} data-action="leaf-expedition">{bestLevel(ledger,leafExpedition.pack.id)==='Understood'?'Play again':'Begin lesson'} <Icon name="arrow"/></button></div>}
    {isSamplePiece&&(!completed?<button className={`${leafDiscovery?'secondary-button':'primary-button'} demo-primary`} onClick={toggle} data-action="complete-demo">Complete this sample <Icon name="light"/></button>:<button className="primary-button demo-primary" onClick={()=>navigate(location.parentId!)} data-action="see-piece">See this piece in its region <Icon name="back"/></button>)}
    <button className="leaf-capture-button" onClick={()=>openCapture()}><Icon name="plus"/>Add your understanding</button>
    {isSamplePiece&&completed&&<button className="text-button undo-demo" onClick={toggle} data-action="undo-demo">Undo this demo completion</button>}</div>
   </section>}
   {nextAction&&!isLeaf&&<button className={`atlas-next${busy?' is-travelling':''}`} disabled={busy} onClick={nextAction.run} style={{'--next-color':nextAction.color} as CSSProperties} aria-label={`${nextAction.verb}: ${nextAction.title}, ${nextAction.minutes} minutes`} title={`${nextAction.verb} · ${nextAction.minutes} min`} data-action="next-step"><span className="atlas-next-play" aria-hidden="true"><Icon name="play"/></span><span className="atlas-next-title">{nextAction.title}</span><span className="atlas-next-meta" aria-hidden="true">{'meta' in nextAction?nextAction.meta:`${nextAction.minutes} min`}</span></button>}
  </div>
  </div>
  </div>
  {NAV_MODE!=='off'&&view==='atlas'&&<PlacePeek model={peekModel} mode={NAV_MODE} hidden={busy||!!hubNode||isLeaf} onOpen={()=>openHub(location.id)}/>}
  {hubModel&&<Hub autoCharted={autoIndex.has(hubModel.node.id)} autoOverview={autoPlace?.summary.map(line=>line.text).join(' ')} auto={autoPlace&&<AutoPlaceSection place={autoPlace} ownProof={!!content?.bankFor(autoPlace.nodeId)||hubModel.expeditions.some(item=>item.expedition.nodeId===autoPlace.nodeId)} proven={autoProven.includes(autoPlace.nodeId)} onProve={()=>proveAuto(autoPlace.nodeId,'check')}/>} shelf={shelfReady?<PlaceShelf placeId={hubModel.node.id} place={autoPlace} shelf={itemShelf} fill={fillResult} onOpenPack={setAutoPack} onOpenVideo={openVideo} savedVideos={hubSavedVideos} reels={hubReels} pinnedReels={hubPinnedReels} onOpenReel={openReel}/>:<></>} sheet={NAV_MODE==='sheet'} model={hubModel} onOpenHub={openHub} onMap={navigate} onBeginExpedition={packId=>openExpedition(packId,hubModel.node.id)} onBeginCheck={nodeId=>openProve(nodeId,hubModel.node.id)} onBeginDiscovery={openDiscovery} onCapture={(kind,nodeId)=>openCapture(kind,'',nodeId)} onOpenNote={editEntry} links={liveLinks(library).filter(link=>!isWatchVideo(link.url)&&linkPlaces(link).some(id=>id===hubModel.node.id||id.startsWith(hubModel.node.id+'.')))} reading={shelfReading(library)} onCycleReading={cycleWork}/>}
  {(view==='explore'||exploreOpened)&&reelAt!==null&&feed&&feedReels&&<ExplorePage hidden={view!=='explore'} tab={exploreTab} onTab={setExploreTab} reels={feedReels} reelIndex={reelAt} onReelIndex={setReelAt} active={view==='explore'&&!activeExpedition&&!activeCheck&&!activeMission&&!dialog&&!libraryPicker} shelf={shelf} opened={reelOpened} mine={exploreMine} onSavePin={saveReelPin} onRemovePin={removeReelPin} onFinished={finishReel} onTag={navigate} onProveIt={proveItLater} onOpenAtlas={()=>navigate(catalog.root.id)} list={learnables?<DiscoveriesPage model={learnables} lead={discoveriesLead} onOpen={openLearnable} onShowOnMap={navigate} onOpenHub={openHub} title="Lessons"/>:null} scope={location.id} onScope={scopeTo}
   feed={<FeedPanel scope={location.id} itemShelf={itemShelf} onScope={scopeTo} onOpenPlace={openHub} fill={shelfReady?fillResult:undefined} reels={feedReels} reelShelf={shelf} onReelFinished={finishReel} onSaveReel={saveReelPin} onRemoveReel={removeReelPin} active={view==='explore'&&exploreTab==='feed'&&!activeExpedition&&!activeCheck&&!activeMission&&!dialog&&!libraryPicker} location={location.id} ledger={ledger} checks={checks} entries={notebook.entries} links={liveLinks(library)} pinnedReelPlaces={pinnedReelPlaces} request={feedRequest} onPlace={navigate} onProveIt={proveItLater} onSaveVideo={saveLinkDraft} onRemoveLink={removeSavedLink} onKeepLine={keepWatchLine} onOpenAtlas={()=>navigate(catalog.root.id)} onOpenList={()=>setExploreTab('list')}/>}/>}
  {view==='notebook'&&labA&&!labB&&<div className="notebook-workspace lxa-workspace"><Suspense fallback={null}><LibraryA exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onCreate={(kind,nodeId)=>openCapture(kind,'',nodeId??location.id)} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onProve={nodeId=>openProve(nodeId,nodeId)} onLesson={(packId,nodeId)=>openExpedition(packId,catalog.get(nodeId)?.parentId??catalog.root.id)} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onImport={importNotes}/></Suspense></div>}
  {view==='notebook'&&labB&&<div className="notebook-workspace lbx-workspace"><Suspense fallback={null}><LibraryIndex place={labB.place} exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onCreate={(kind,nodeId)=>openCapture(kind,'',nodeId??location.id)} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenLesson={openExpedition}/></Suspense></div>}
  {labC&&<Suspense fallback={null}><LibraryC exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenExpedition={packId=>openExpedition(packId,packPlace(packId)?.nodeId??catalog.root.id)}/></Suspense>}
  {labD&&<Suspense fallback={null}><LibraryD exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenExpedition={packId=>openExpedition(packId,packPlace(packId)?.nodeId??catalog.root.id)}/></Suspense>}
  {labE&&<Suspense fallback={null}><LibraryE autoProofs={autoProofs} exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenExpedition={packId=>openExpedition(packId,packPlace(packId)?.nodeId??catalog.root.id)}/></Suspense>}
  {labF&&<Suspense fallback={null}><LibraryF exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenExpedition={packId=>openExpedition(packId,packPlace(packId)?.nodeId??catalog.root.id)}/></Suspense>}
  {view==='notebook'&&!labA&&!labB&&!labC&&!labD&&!labE&&!labF&&<LibraryE autoProofs={autoProofs} exp={ledger} checks={checks} now={now} entries={notebook.entries} shelf={shelf} library={library} content={libraryContent} onEdit={editEntry} onNavigate={navigate} onOpenReel={openReel} onOpenVideo={openVideo} onSaveLink={saveLinkDraft} onRemoveLink={removeSavedLink} onLibraryChange={updateLibrary} getLibrary={getLibrary} onTryCase={nodeId=>openProve(nodeId,nodeId)} onOpenExpedition={packId=>openExpedition(packId,packPlace(packId)?.nodeId??catalog.root.id)}/>}
  </main></div>
  <nav className={`studio-mobile-nav${view==='explore'&&exploreTab!=='list'?' is-over-reel':''}`} aria-label="Mobile workspace" data-map-obstacle=""><button aria-current={view==='atlas'?'page':undefined} onClick={()=>changeView('atlas')}><Icon name="map"/>Map</button><button aria-current={view==='explore'?'page':undefined} onClick={()=>changeView('explore')} aria-label="Explore" data-action="open-explore-mobile"><Icon name="reel"/>Explore</button><button aria-current={view==='notebook'?'page':undefined} onClick={()=>changeView('notebook')} aria-label="Open library" data-action="open-notebook-mobile"><Icon name="book"/>Library</button></nav>
  {learnerWarning&&<div className="save-warning" role="alert">{learnerWarning}<button onClick={()=>setDialog('memory')}>Export memory</button></div>}
  {warning&&<div className="save-warning" role="alert">{warning}<button onClick={()=>setWarning(null)} aria-label="Dismiss warning">×</button></div>}{toast&&<div className="toast" role="status">{toast}</div>}
  {dialog==='menu'&&<AppMenu previewOn={colorPreview!=='off'} saveStatus={saveTrouble?'Saving needs attention':'Saved on this device'} saveNeedsAttention={saveTrouble} onGuide={()=>{refreshGuide();setDialog('guide')}} onCapture={()=>openCapture()} onTogglePreview={()=>{const on=colorPreview==='off';setColorPreview(on?'sample':'off');if(on)changeView('atlas');else setDialog(null)}} onMemory={()=>setDialog('memory')} onSettings={()=>setDialog('settings')} onAbout={()=>setDialog('about')} onLibraryPrototypes={()=>{setDialog(null);openLibraryPicker()}} onClose={()=>setDialog(null)}/>}
  {libraryPicker&&<Suspense fallback={null}><LibraryPicker onChoose={openLibraryPrototype} onClose={closeLibraryPicker}/></Suspense>}
  {dialog&&dialog!=='menu'&&<div className="modal-backdrop" onClick={()=>setDialog(null)}><section className={dialog==='expedition'?'settings-dialog expedition-dialog':dialog==='guide'?'settings-dialog guide-dialog':dialog==='search'?'search-dialog':dialog==='capture'||dialog==='reflect'?'settings-dialog capture-dialog':'settings-dialog'} role="dialog" aria-modal="true" aria-label={dialog==='expedition'?activeDiscovery?.title:dialog==='guide'?'Your learning guide':dialog==='memory'?'Your learning memory':dialog==='economics'?'Usage and cost':dialog==='reflect'?'Revisit an idea':dialog==='capture'?(editor.entry?'Edit notebook entry':editor.kind==='question'?'Keep a question':'Capture an idea'):dialog==='search'?'Search the atlas':dialog==='settings'?'Your map and settings':'How the color grows'} onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{dialog==='expedition'?'Follow a question.':dialog==='guide'?'Your learning guide.':dialog==='memory'?'A guide that gets to know you.':dialog==='economics'?'A little curiosity. A clear budget.':dialog==='reflect'?'Revisit your understanding':dialog==='capture'?(editor.entry?'Your notebook entry':editor.kind==='question'?'Keep a question':'Capture an idea'):dialog==='search'?'Where would you like to go?':dialog==='settings'?'Your atlas, your learning.':'How your atlas works.'}</h2><button className="icon-button" onClick={()=>setDialog(null)} aria-label="Close dialog"><Icon name="close"/></button></div>
   {dialog==='expedition'&&activeDiscovery?<LearningExpedition guideStatus={guideStatus} key={activeDiscovery.id} discovery={activeDiscovery} sources={LEARNING_SOURCES.filter(source=>activeDiscovery.sourceIds.includes(source.id))} learner={learner} onRecordAttempt={memory.record} onComplete={finishDiscovery} onClose={()=>setDialog(null)} onFollow={openDiscovery} onCapture={()=>openCapture('idea',activeDiscovery.title,activeDiscovery.topicId)} onAsk={(message,signal)=>ask(message,[],signal)}/>:dialog==='guide'?<GuideConversation status={guideStatus} topicName={location.depth?location.name:'All knowledge'} onAsk={ask} onSources={guideSources} onMemory={()=>setDialog('memory')} onStart={openDiscovery} suggestions={suggestions} next={nextAction?{label:`${nextAction.verb}: ${nextAction.title}`,run:nextAction.run}:undefined}/>:dialog==='memory'?<LearnerMemory warning={learnerWarning} learner={learner} onUpdate={memory.update} onExport={exportMemory} onImport={memory.importMemory}/>:dialog==='economics'?<GuideEconomics status={guideStatus} onRefresh={refreshGuide}/>:dialog==='reflect'&&editor.entry?<NotebookReflection key={editor.entry.id} entry={editor.entry} onSave={saveReflection} onClose={()=>setDialog(null)}/>:dialog==='capture'?<NotebookEditor key={editor.entry?.id||`${editor.kind}-${editor.nodeId}-${editor.title}`} entry={editor.entry} initialKind={editor.kind} initialTitle={editor.title} initialNodeId={editor.nodeId||location.id} onSave={saveEntry} onDelete={removeEntry} onClose={()=>setDialog(null)}/>:dialog==='search'?<><label className="search-input"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search an idea or territory" aria-label="Search an idea or territory"/></label><p className="eyebrow">{query?'PLACES IN THE ATLAS':'EIGHT CONNECTED TERRITORIES'}</p><div className="search-results">{searchResults.map(n=><button key={n.id} onClick={()=>navigate(n.id)}><span><i className="subject-dot" style={{background:territoryColor(n.id)}}/>{n.name}<small>{catalog.get(n.parentId!)?.name}</small></span><span>{catalog.getChildren(n).length?'Explore':packPlaceAt(n.id)?'Lesson':DISCOVERIES.some(d=>d.footprintId===n.id)?'Discovery':'Preview'}<Icon name="arrow"/></span></button>)}{!searchResults.length&&<p>No matching place.</p>}</div></>:dialog==='settings'?<><p>{earnedIds.length} discovery footprints earned from fresh, independent examples. Your learning memory, notebook, and map are saved on this device. {demo.completedIds.length>0?`${demo.completedIds.length} earlier demo marks are also visible; these are separate from earned understanding.`:'The color preview is separate from your learning evidence.'}</p><div className="studio-settings-learning"><button className="secondary-button" onClick={()=>{setExploreTab('list');changeView('explore')}}>Your discoveries</button><button className="secondary-button" onClick={()=>setDialog('memory')} data-action="open-memory">Learning memory</button><button className="secondary-button" onClick={()=>{refreshGuide();setDialog('economics')}} data-action="open-economics">Usage & cost</button></div><div className="learning-backup-panel"><h3>Keep your learning with you</h3><p>This browser is your only copy. Download both files before clearing browser data or switching devices. Each file can be merged back using its existing import controls.</p><div><button className="secondary-button" onClick={exportMemory} data-action="backup-memory">Export learning memory</button><button className="secondary-button" onClick={exportNotes} data-action="backup-notebook">Export notebook</button></div><p className="fine-print">Memory contains your profile and attempts. Notebook contains your notes and reflections. Downloads may include personal information; keep them somewhere private.</p></div><div className="studio-settings-notebook"><h3>Your notebook</h3><p>{notebook.entries.length} ideas and questions · saved on this device</p><button className="secondary-button" onClick={()=>changeView('notebook')}>Open your notebook</button><button className="text-button" disabled={!notebook.entries.length} onClick={exportNotes}>Export notebook</button></div><div className="subject-ledger">{SAMPLE_TERRITORIES.map(s=>{const node=catalog.get('knowledge.'+s.subject)!;const count=demo.completedIds.filter(id=>id.startsWith(node.id+'.')).length;return <button key={s.subject} onClick={()=>navigate(sampleLeaf(s.subject))}><i className="subject-dot" style={{background:territoryColor(node.id)}}/><span>{node.name}</span><small>{count?`${count} colored`:'Try a deep sample'}</small><Icon name="arrow"/></button>})}</div><button className="primary-button" onClick={exportMap}>Export demo map <Icon name="arrow"/></button><details><summary>Import a demo map</summary><label className="file-import">Choose an exported file<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)file.text().then(setImportText)}}/></label><textarea aria-label="Demo map JSON" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Or paste a saved demo map"/><button className="secondary-button" disabled={!importText} onClick={importMap}>Import demo map</button></details><details><summary>Reset demo coloring</summary><p className="fine-print">This only clears mock completions. The earlier learning history is kept separately.</p>{!confirmReset?<button className="secondary-button" onClick={()=>setConfirmReset(true)}>Clear demo marks…</button>:<button className="secondary-button" onClick={()=>{setDemo({...createDemoProgress(),locationId:location.id});setConfirmReset(false);setToast('Demo coloring cleared.')}}>Clear {demo.completedIds.length} demo marks</button>}</details><a className="learning-sketch-link" href="?learning=1">Open the earlier learning sketch ↗</a></>:<><p>Each territory has a spectrum of related colors. Smaller fields inherit a narrower part of that spectrum. At a shared border, each side keeps its own color.</p><div className="color-explainer" aria-hidden="true"><span/><span/><i/></div><p>Demonstrating a fresh example independently fills only that piece. Zoom out: its true footprint shrinks with the map, down to a pixel-sized light. Nearby pieces stay dark. Opening content or asking the guide for help does not automatically earn color.</p><p>Use Preview color in the menu to see a few sample areas or the whole spectrum. The preview never adds completion marks.</p><p>Your notebook accepts ideas from anywhere: videos, books, conversations, or your own experiments. Connect an entry to several territories. Record what you encountered, explained, or applied. These are your own reflections, not automated assessments.</p><button className="primary-button" onClick={()=>navigate(sampleLeaf(subject))}>Follow one idea <Icon name="arrow"/></button><p className="fine-print">Nine discoveries are currently authored. The rest of the map is an invitation to explore; it does not claim to contain a complete curriculum. Demo marks are not assessments of understanding.</p></>}
  </section></div>}
 </div>
 {autoPack?.pack&&<Suspense fallback={null}><ExpeditionScreen key={autoPack.pack.id} expedition={{pack:autoPack.pack,nodeId:autoPack.nodeId}} seen={[]} exitLabel={autoPack.name} onExit={()=>setAutoPack(null)} onOpen={()=>{}} onOpenPlace={nodeId=>{setAutoPack(null);openHub(nodeId)}} onAnswer={()=>{}} onFinish={({summary})=>{markShelfDone(packItemId(autoPack.nodeId));if(summary.level==='Understood')proveAuto(autoPack.nodeId,'lesson')}}/></Suspense>}
 {activeExpedition&&route.kind==='expedition'&&<Suspense fallback={null}><ExpeditionScreen key={activeExpedition.pack.id} expedition={activeExpedition} start={route.beat} seen={ledger.seen[activeExpedition.pack.id]??[]} exitLabel={view==='explore'?'Explore':view==='notebook'?'Library':expeditionHome.depth?expeditionHome.name:'the atlas'} onExit={exitExpedition} onOpen={packId=>go({kind:'expedition',packId,beat:0,from:expeditionHome.id},'replace')} onOpenPlace={nodeId=>go({kind:'hub',nodeId},'replace')} onAnswer={answerExpedition} onFinish={finishExpedition} onStuck={({runId,line})=>keepStuck('run',runId,activeExpedition.nodeId,line,activeExpedition.pack.title)} check={content?.bankFor(activeExpedition.nodeId)?{status:content.checkStatus(activeExpedition.nodeId,ledger,checks,now),lit:allEarnedIds.includes(activeExpedition.nodeId),open:()=>go({kind:'check',nodeId:activeExpedition.nodeId,from:expeditionHome.id},'replace')}:undefined} newCase={(()=>{const node=activeExpedition.nodeId;const c=content&&content.caseClosesRun(node,ledger,checks,now)?content.nextCase(node,checks):undefined;return c&&content?{case:c,play:(answer,success,ms)=>recordCheck([{t:'case',id:newEventId(),session:newEventId(),node,case:c.id,answer,success,via:'expedition',ms:Math.round(ms),at:new Date().toISOString()}]),nextAt:()=>content.nextCaseAt(node,ledgerRef.current,checksRef.current,Date.now()),last:content.isLastCase(c.id)}:undefined})()}/></Suspense>}
 {activeMission&&route.kind==='mission'&&<Suspense fallback={null}><MissionScreen key={route.nodeId} nodeId={route.nodeId} exp={ledger} checks={checks} now={now} exitLabel={view==='explore'?'Explore':view==='notebook'?'Library':checkHome.depth?checkHome.name:'the atlas'} onRecord={recordCheck} onExit={exitCheck} onWords={content?.bankFor(route.nodeId)?()=>go({kind:'check',nodeId:route.nodeId,from:route.from},'replace'):undefined} onStuck={({session,nodeId,line})=>keepStuck('check',session,nodeId,line,catalog.get(nodeId)?.name??'New case')}/></Suspense>}
 {activeCheck&&route.kind==='check'&&<Suspense fallback={null}><CheckScreen key={route.nodeId} nodeId={route.nodeId} exp={ledger} checks={checks} now={now} exitLabel={view==='explore'?'Explore':view==='notebook'?'Library':checkHome.depth?checkHome.name:'the atlas'} onRecord={recordCheck} onExit={exitCheck} onStuck={({session,nodeId,line})=>keepStuck('check',session,nodeId,line,'In words')} onOpenExpedition={packId=>go({kind:'expedition',packId,beat:0,from:checkHome.id},'replace')}/></Suspense>}
 </>
}
