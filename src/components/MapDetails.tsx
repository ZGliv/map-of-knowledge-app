import { territoryColor } from '../core/territoryTheme';
import { polygonPath, type SpatialLayoutEngine } from '../spatial/SpatialLayoutEngine';
import { clipCameraRegions } from '../spatial/CameraGeometry';
import type { Point, RegionLayout } from '../spatial/types';
import type { CatalogStore, AtlasNode } from '../core/catalog';
import { outlinePoints, type ShapeScope } from '../spatial/MapShape';
import { Glyph, type GlyphKit } from '../atlasArt/Glyph';

/** A rectangle in the map's own coordinates. */
export interface MapRect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

/**
 * Where names, motifs and captions may go, in the map's own coordinates. The map runs full-bleed:
 * the frame is the screen inside the device's insets (on a desktop, below its top bar), and the
 * obstacles are the controls that float over it (a phone's capsules), each avoided as the rectangle
 * it really covers rather than as a band across the screen.
 */
export interface MapSafeArea extends MapRect { readonly obstacles?: readonly MapRect[] }

const SAFE_GAP = 6; // a label block keeps this much clear of a bar or a floating control

export interface LabelLayout { readonly x: number; readonly y: number; readonly lines: string[]; readonly labelSize: number; readonly small: boolean; readonly compact: boolean; readonly caption: boolean; readonly motif: boolean }

const EDGE = 9; // a label keeps this far inside its territory's outline (curves, glow, stroke)
const EDGE_Y = 7; // and this far above or below it, where a curved border sags into the territory
const CAPTION_HALF = 40; // the caption is set later; its widest form ("A next discovery") is ~80px

type Spans = [number, number][];

/** Where a horizontal line at y is inside an outline (even-odd), as sorted spans. */
function spansAt(outline: readonly Point[], y: number): Spans {
 const xs: number[] = [];
 outline.forEach((a, i) => {
  const b = outline[(i + 1) % outline.length];
  // Half-open on y so a vertex shared by two edges counts once.
  if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
 });
 xs.sort((p, q) => p - q);
 const spans: Spans = [];
 for (let i = 0; i + 1 < xs.length; i += 2) spans.push([xs[i], xs[i + 1]]);
 return spans;
}

const intersectSpans = (a: Spans, b: Spans): Spans => {
 const out: Spans = [];
 for (const [l0, r0] of a) for (const [l1, r1] of b) { const l = Math.max(l0, l1), r = Math.min(r0, r1); if (l <= r) out.push([l, r]); }
 return out;
};

/** Spans less the open interval (l, r). */
const subtractSpan = (spans: Spans, l: number, r: number): Spans => {
 const out: Spans = [];
 for (const [a, b] of spans) {
  if (r <= a || l >= b) { out.push([a, b]); continue; }
  if (a < l) out.push([a, l]);
  if (r < b) out.push([r, b]);
 }
 return out;
};

/**
 * Where a territory's outline (the drawn, curved one, which may dip inward) covers the whole band
 * top..bottom: the outline sampled every few pixels down the band, and the spans common to all.
 */
export function bandSpans(outline: readonly Point[], top: number, bottom: number): Spans {
 let spans: Spans = [[-Infinity, Infinity]];
 const ys = [top, bottom, ...outline.filter(p => p[1] > top && p[1] < bottom).map(p => p[1])];
 for (let y = top + 3; y < bottom; y += 3) ys.push(y);
 for (const y of ys) { spans = intersectSpans(spans, spansAt(outline, y)); if (!spans.length) break; }
 return spans;
}

/** How far a block centred at x sticks out of its territory: the worst part's shortfall. */
function overflowOf(outline: readonly Point[], parts: [number, number, number][], cy: number, x: number): number {
 let worst = 0;
 for (const [t, b, half] of parts) {
  const spans = bandSpans(outline, cy + t, cy + b);
  const best = spans.length ? Math.min(...spans.map(([l, r]) => Math.max(0, l - (x - half)) + Math.max(0, x + half - r))) : 2 * half;
  worst = Math.max(worst, best);
 }
 return worst;
}

/** The parts of a label block around its anchor y: [top, bottom, half width] each. */
export function blockParts(lines: string[], labelSize: number, small: boolean, compact: boolean, motif: boolean, caption: boolean): [number, number, number][] {
 const first = (small ? 0 : 8) - (lines.length - 1) * (labelSize + 4) / 2;
 const parts: [number, number, number][] = lines.map((line, i) => [first + i * (labelSize + 4) - labelSize, first + i * (labelSize + 4) + labelSize * .24, line.length * labelSize * .30 + 3]);
 // The motif's drawing is a ring about 3/4 of its box.
 if (motif) { const size = compact ? 43 : 58, r = size * .38; parts.push([-(compact ? 36 : 43) - r, -(compact ? 36 : 43) + r, r]); }
 if (caption) { const base = first + lines.length * (labelSize + 4) + 6; parts.push([base - 7, base + 2, CAPTION_HALF]); }
 return parts;
}

/**
 * Where a territory's name goes: its centroid, or, when the frame cuts part of the territory off,
 * the centre of the part you can see. The whole block (motif, name, caption) then has to sit inside
 * the territory, which clips it, inside the frame and clear of every floating control; if it does
 * not fit there it moves to the nearest place it does, and only then sheds the caption, then the
 * motif, then a size of type.
 */
export function labelLayout(region:RegionLayout,viewport:{width:number;height:number},safe?:MapSafeArea|null,outline:readonly Point[]=region.polygon):LabelLayout{
 let [x,y]:Point=region.centroid;
 if(safe&&region.bounds&&(region.bounds.y<safe.y0||region.bounds.y+region.bounds.height>safe.y1||region.bounds.x<safe.x0||region.bounds.x+region.bounds.width>safe.x1)){
  const visible=clipCameraRegions([region],[[safe.x0,safe.y0],[safe.x0,safe.y1],[safe.x1,safe.y1],[safe.x1,safe.y0]])[0];
  if(visible)[x,y]=visible.centroid;
 }
 const compact=viewport.width<600;const small=region.area<(compact?13500:26000);
 const baseSize=viewport.height<240?12:compact?(small?13:16):(small?17:21);
 const wrap=(labelSize:number,narrow=false)=>{
  const maxWidth=narrow?0:Math.max(24,Math.min(region.bounds.width*.70,(x-8)*2,(viewport.width-x-8)*2));
  const lines:string[]=[''];region.node.name.split(' ').forEach(w=>{const last=lines.length-1;if((lines[last].length+w.length+1)*labelSize*.60>maxWidth&&lines[last])lines.push(w);else lines[last]+=(lines[last]?' ':'')+w});
  return {lines,canCaption:!small&&lines.length<=2&&maxWidth>=110};
 };
 const {lines,canCaption}=wrap(baseSize);
 const y0=safe?safe.y0+SAFE_GAP:0,y1=safe?safe.y1-SAFE_GAP:viewport.height;
 const x0=Math.max(8,safe?safe.x0:0),x1=Math.min(viewport.width-8,safe?safe.x1:viewport.width);
 const obstacles=safe?.obstacles??[];
 const variants:{size:number;motif:boolean;caption:boolean;narrow?:boolean}[]=[
  {size:baseSize,motif:!small,caption:canCaption},{size:baseSize,motif:!small,caption:false},
  {size:baseSize,motif:false,caption:false},{size:baseSize,motif:false,caption:false,narrow:true},
  {size:baseSize-2,motif:false,caption:false,narrow:true},{size:Math.max(9,baseSize-4),motif:false,caption:false,narrow:true},
 ];
 // The least-bad place, should nothing fit (a sliver of a territory): the smallest overflow.
 let best:{overflow:number;layout:LabelLayout}|null=null;
 for(const v of variants){
  const ls=v.size===baseSize&&!v.narrow?lines:wrap(v.size,v.narrow).lines;
  const parts=blockParts(ls,v.size,small,compact,v.motif,v.caption);
  const top=Math.min(...parts.map(p=>p[0])),bottom=Math.max(...parts.map(p=>p[1]));
  const lo=y0-top,hi=y1-bottom;if(lo>hi)continue;
  // Try the anchor first, then step outward from it (nearest first) across the open band.
  const start=Math.max(lo,Math.min(hi,y));
  for(let step=0;step<=Math.max(start-lo,hi-start)+3;step+=3)for(const cy of step?[start-step,start+step]:[start]){
   if(cy<lo||cy>hi)continue;
   // The centres that keep every part inside the outline and the screen, as spans.
   let room:Spans=[[x0,x1]];
   for(const [t,b,half] of parts){
    const inside=bandSpans(outline,cy+t-EDGE_Y,cy+b+EDGE_Y).map(([l,r]):[number,number]=>[l+EDGE+half,r-EDGE-half]).filter(([l,r])=>l<=r);
    room=intersectSpans(room,[...inside.map(([l,r]):[number,number]=>[Math.max(l,x0+half),Math.min(r,x1-half)]).filter(([l,r])=>l<=r)]);
    // A floating control in this part's band rules out the centres that would put the part under it.
    for(const o of obstacles)if(cy+t-SAFE_GAP<o.y1&&cy+b+SAFE_GAP>o.y0)room=subtractSpan(room,o.x0-SAFE_GAP-half,o.x1+SAFE_GAP+half);
    if(!room.length)break;
   }
   const near=room.map(([l,r])=>Math.max(l,Math.min(r,x))).sort((p,q)=>Math.abs(p-x)-Math.abs(q-x))[0];
   const layout={x:near??x,y:cy,lines:ls,labelSize:v.size,small,compact,caption:v.caption,motif:v.motif};
   if(near!==undefined)return layout;
   // A sliver of a territory: the least overflow, but never under a floating control.
   const covered=obstacles.some(o=>parts.some(([t,b,half])=>cy+t-SAFE_GAP<o.y1&&cy+b+SAFE_GAP>o.y0&&x-half-SAFE_GAP<o.x1&&x+half+SAFE_GAP>o.x0));
   if(!room.length&&!covered){const overflow=overflowOf(outline,parts,cy,x);if(!best||overflow<best.overflow)best={overflow,layout};}
  }
 }
 if(best)return best.layout;
 return {x,y:Math.max(y0,Math.min(y1,y)),lines,labelSize:baseSize,small,compact,caption:false,motif:false};
}

export function Motif({kind=4,size=54}:{kind?:number;size?:number}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:.8};
 return <svg x={-size/2} y={-size/2} width={size} height={size} viewBox="-40 -40 80 80" aria-hidden="true">
  {kind===0?<g {...common}><ellipse rx="30" ry="12" transform="rotate(30)"/><ellipse rx="30" ry="12" transform="rotate(90)"/><ellipse rx="30" ry="12" transform="rotate(150)"/><circle r="2" fill="currentColor"/></g>:
  kind===1?<g {...common}>{[-18,0,18].map(x=>[-18,0,18].map(y=><g key={`${x}${y}`}><path d={`M${x} ${y}H18M${x} ${y}V18`} opacity=".5"/><circle cx={x} cy={y} r="2.5" fill="currentColor"/></g>))}</g>:
  kind===2?<g {...common}><path d="M-24 25V-22Q-12-30 0-21Q12-30 24-22V25Q12 17 0 25Q-12 17-24 25ZM0-21V25"/>{[-12,-4,4,12].map(y=><path key={y} d={`M-18 ${y}q7-3 12 0m12 0q7-3 12 0`}/>)}</g>:
  kind===3?<g {...common}><circle r="9"/>{[0,60,120,180,240,300].map(a=><g key={a} transform={`rotate(${a})`}><path d="M0-10V-22"/><circle cy="-27" r="4"/></g>)}</g>:
  kind===4?<g {...common}><circle r="28"/><path d="M0-28L24.25 14H-24.25ZM-28 0H28M0-28V28"/><circle r="14"/><circle r="2" fill="currentColor"/></g>:
  kind===5?<g {...common}>{[-18,-9,0,9,18].map((x,i)=><path key={x} d={`M${x} ${-(12+((i+1)%3)*7)}V${12+((i+1)%3)*7}`}/>)}<path d="M-30 0H30" opacity=".4"/></g>:
  kind===6?<g {...common}>{[28,21,14,7].map(r=><ellipse key={r} rx={r} ry={r*.65} transform="rotate(-20)"/>)}<path d="M-32 16L32-16"/></g>:
  <g {...common}><path d="M-27 24V-24M-27 24H28M-23 15L-12 3L-1 8L13-13L26-22"/>{[[-12,3],[-1,8],[13,-13]].map(([x,y])=><circle key={x} cx={x} cy={y} r="2" fill="currentColor"/>)}</g>}
 </svg>
}
export function MapDetails({learningCounts,frontierIds,noteCounts,regions,store,engine,viewport,hoveredId,completedIds,charted,minimal=false,opacity=1,detailRegions,shapes,safe,placeLabel,glyphs}:{learningCounts?:Readonly<Record<string,number>>;frontierIds?:ReadonlySet<string>;noteCounts?:Readonly<Record<string,number>>;regions:readonly RegionLayout[];store:CatalogStore;engine:SpatialLayoutEngine;viewport:{width:number;height:number};hoveredId:string|null;completedIds:readonly string[];/** Places with something to explore; given, every other place is captioned "Uncharted". */charted?:ReadonlySet<string>;minimal?:boolean;opacity?:number;detailRegions?:ReadonlyMap<string,readonly RegionLayout[]>;shapes?:ShapeScope;safe?:MapSafeArea|null;/** During a flight: labels placed once per leg, so no frame lays them out. */placeLabel?:(region:RegionLayout)=>LabelLayout|undefined;/** Each place's own emblem in place of its subject's motif (the ?art= prototype). */glyphs?:GlyphKit|null}){
 return <g className="map-details" pointerEvents="none" aria-hidden="true" opacity={opacity}>
 {regions.map(region=>{
  const node=region.node as AtlasNode; const kids=store.getChildren(node);
  const detail=minimal?[]:detailRegions?.get(node.id)??engine.layout(node,kids,region.polygon);
  const {x,y,lines,labelSize,small,compact,caption,motif}=placeLabel?.(region)??labelLayout(region,viewport,safe,shapes?.cells.get(node.id)?outlinePoints(shapes.cells.get(node.id)!):undefined);
  const labelY=y+(small?0:8)-(lines.length-1)*(labelSize+4)/2;
  const isActive=node.id.includes('mathematics');const restored=completedIds.some(id=>id===node.id||id.startsWith(node.id+'.'));
  const status=learningCounts?.[node.id]||noteCounts?.[node.id];const uncharted=!!charted&&!charted.has(node.id)&&!status;
  return <g key={node.id} className={`${hoveredId===node.id?'is-hovered':''} ${isActive?'is-playable':''}${uncharted?' is-uncharted':''}`}>
   <defs><clipPath id={'clip-'+node.id}><path d={shapes?.cells.get(node.id)?.path??polygonPath(region.polygon)}/></clipPath></defs>
   <g clipPath={`url(#clip-${node.id})`}>
    <g className="map-contours">{(()=>{const inner=shapes&&detail.length?shapes.inside(node.id,detail):undefined;return detail.map(r=><path key={r.node.id} d={inner?.get(r.node.id)?.path??polygonPath(r.polygon)}/>)})()}</g>
    {motif&&(glyphs?<g transform={`translate(${x},${y-(compact?36:43)})`}><Glyph kit={glyphs} nodeId={node.id} size={compact?43:58} color={territoryColor(node.id)}/></g>
     :<g transform={`translate(${x},${y-(compact?36:43)})`} className="map-motif" style={{color:territoryColor(node.id)}}><Motif kind={node.motif} size={compact?43:58}/></g>)}
    <g transform={`translate(${x},${labelY})`} textAnchor="middle">
     {lines.map((line,i)=><text className="region-title" key={i} y={i*(labelSize+4)} style={{fontSize:labelSize}}>{line}</text>)}
     {/* Personal status (earned pieces, notes) always shows; generic hints only light up on the territory you point at. */}
     {caption&&uncharted&&<text className="region-caption is-uncharted is-hint" y={lines.length*(labelSize+4)+6}>Uncharted</text>}
     {caption&&!uncharted&&<text className={`region-caption ${learningCounts?.[node.id]||noteCounts?.[node.id]&&!frontierIds?.has(node.id)?'is-status':'is-hint'}`} style={{fill:territoryColor(node.id)}} y={lines.length*(labelSize+4)+6}>{learningCounts?.[node.id]?`${learningCounts[node.id]} piece${learningCounts[node.id]===1?'':'s'} earned`:frontierIds?.has(node.id)?'A next discovery':noteCounts?.[node.id]?`${noteCounts[node.id]} note${noteCounts[node.id]===1?'':'s'}`:kids.length?node.depth===1?'Explore':`${kids.length} regions`:'Content preview'}</text>}

    </g>
   </g>
  </g>
 })}
 </g>
}
