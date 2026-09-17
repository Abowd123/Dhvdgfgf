/* ═══ القماش: العرض والتفاعل ═══
   يقرأ قائمة أوّليات المشهد نفسها التي تُصدَّر، ويُفوّض كل ما يتعلّق
   بالكيانات إلى ents.js — فإضافة نوعٍ لا تعني تعديل هذا الملفّ.
   العالم بالمليمتر و Y للأعلى · الشاشة بالبكسل و Y للأسفل. */

import {S,txtH,edit,touch,snapshot,pushHistory,
        autosave} from "../core/state.js";
import {m2,mm,clamp,deg,D2R,scl} from "../core/units.js";
import {scene,sceneBBox,sceneBBoxAll} from "../core/render.js";
import {looseEnds,isLow} from "../core/walls.js";
import {osnap,osOn,MODES,MNAME} from "../core/osnap.js";
import {constrain} from "../core/coords.js";
import {vis,pickable,resolve} from "../core/layers.js";
import * as E from "../core/ents.js";
import * as R from "../tools/registry.js";
import {HOOK} from "./bus.js";
import {pal,layCss,primCss,setPal,themeName} from "./theme.js";
import {UIS} from "./store.js";
import {bump} from "../core/perf.js";
import {isInserting, onMove as onBlockMove, onClick as onBlockClick,
        ghost as blockGhost} from "../tools/blocks.js";
import {drawInstance} from "./blockdraw.js";
import {draw as drawUnderlay} from "../core/underlay.js";
import {jrTaint} from "../core/journal.js";

export const cv=document.getElementById("cv");
const ctx=cv.getContext("2d");

export const V={k:0.05,cx:0,cy:0,w:0,h:0,dpr:1};
export const UI={SELS:[],SEL:null,guides:[],track:null,osnap:null,
 marq:null,grips:[],hot:null,hov:null,pre:null,preP:null,free:null};

export const W2S=(x,y)=>[(x-V.cx)*V.k+V.w/2, V.h/2-(y-V.cy)*V.k];
export const S2W=(px,py)=>[V.cx+(px-V.w/2)/V.k, V.cy-(py-V.h/2)/V.k];

export function resize(){
 const r=cv.parentElement.getBoundingClientRect();
 V.dpr=Math.min(2,window.devicePixelRatio||1);
 V.w=Math.max(200,Math.round(r.width));
 V.h=Math.max(160,Math.round(r.height));
 cv.width=Math.round(V.w*V.dpr);
 cv.height=Math.round(V.h*V.dpr);
 cv.style.width=V.w+"px";
 cv.style.height=V.h+"px";
 ctx.setTransform(V.dpr,0,0,V.dpr,0,0);
 draw();
}
export function fitBox(B,pad){
 vPush();
 if(!B){V.k=0.05;V.cx=0;V.cy=0;draw();return}
 const w=Math.max(1000,B.x1-B.x0), h=Math.max(1000,B.y1-B.y0);
 const p=(pad==null?0.07:pad);
 V.k=clamp(Math.min(V.w/(w*(1+p*2)), V.h/(h*(1+p*2))),1e-5,3);
 V.cx=(B.x0+B.x1)/2; V.cy=(B.y0+B.y1)/2;
 draw();
}
export const fit=()=>fitBox(sceneBBoxAll());
export function zoomAt(px,py,f){
 vEpoch();
 const b=S2W(px,py);
 V.k=clamp(V.k*f,1e-5,3);
 const a=S2W(px,py);
 V.cx+=b[0]-a[0]; V.cy+=b[1]-a[1];
 draw();
}
export function panBy(dx,dy){vEpoch(); V.cx-=dx/V.k; V.cy+=dy/V.k; draw()}

/* ═══ تاريخ المنظر ═══
   عهدٌ لكل حركةٍ متّصلة: العجلة والتحريك تُسجّلان مرّةً عند بدء
   الحركة لا مع كل بكسل، والعمليات المنفصلة تُسجّل لحظتها. */
const VH=[];
let vLast=0;
function vPush(){
 const c={k:V.k,cx:V.cx,cy:V.cy};
 const p=VH[VH.length-1];
 if(p&&Math.abs(p.k-c.k)<1e-12&&p.cx===c.cx&&p.cy===c.cy)return;
 VH.push(c);
 if(VH.length>40)VH.shift();
}
function vEpoch(){
 const t=Date.now();
 if(t-vLast>500)vPush();
 vLast=t;
}
export const canPrev=()=>VH.length>0;
export function zoomPrev(){
 const v=VH.pop();
 if(!v)return false;
 V.k=v.k; V.cx=v.cx; V.cy=v.cy;
 draw();
 return true;
}
/* ═══ أوضاع التنقّل ═══ لا تُنشئ شيئاً ولا تعدّل بياناتٍ ═══ */
export const NAV={mode:null};
export const navMode=()=>NAV.mode;
export function navSet(m){
 NAV.mode=(m==="zw"||m==="pan")?m:null;
 cv.style.cursor=NAV.mode==="pan"?"grab"
  :(NAV.mode==="zw"?"crosshair":"crosshair");
 if(!NAV.mode)UI.zwin=null;
 draw();
 return NAV.mode;
}
export function setTheme(t){
 const v=setPal(t);
 Object.keys(PAT).forEach(k=>{delete PAT[k]});
 draw();
 return v;
}

/* ═══ الالتقاط والتقييد ═══ */
let shift=false;
export const setShift=v=>{shift=!!v};
export const snapMode=()=>{
 if((!!S.rb.ortho)!==(!!shift))return "ortho";
 return (+S.rb.polar)?"polar":null;
};
export function snap(x,y,from){
 UI.guides=[]; UI.osnap=null; UI.track=null;
 const st=Math.max(1,S.meta.snap);
 const tol=16/V.k;
 if(+S.rb.snap&&osOn()){
  const o=osnap(x,y,tol,from);
  if(o){UI.osnap=o;return o.p}
 }
 let p=(+S.rb.gsnap)
  ? [Math.round(x/st)*st, Math.round(y/st)*st]
  : [Math.round(x), Math.round(y)];
 /* ═══ القفل ═══
    زاويةٌ مقفلة أو طولٌ مقفل أو كلاهما. والطول وحده يتبع اتجاه
    المؤشّر بعد تقييده بالتعامد أو القطبي إن كانا مُشغَّلين. */
 const AL=R.T.lock, LL=R.T.lenLock;
 if(from&&(AL!=null||LL!=null)){
  let ux,uy;
  if(AL!=null){ux=Math.cos(AL*D2R); uy=Math.sin(AL*D2R)}
  else{
   const dx=x-from[0], dy=y-from[1], Ld=Math.hypot(dx,dy);
   if(Ld<1)return [from[0],from[1]];
   ux=dx/Ld; uy=dy/Ld;
   const md0=snapMode();
   if(md0){
    const c0=constrain(from,[x,y],md0,S.pol.inc,S.pol.extra);
    if(c0){ux=Math.cos(c0.a*D2R); uy=Math.sin(c0.a*D2R)}
   }
  }
  const t=(LL!=null)?LL:((x-from[0])*ux+(y-from[1])*uy);
  p=[Math.round(from[0]+ux*t),Math.round(from[1]+uy*t)];
  UI.track={from,a:deg(Math.atan2(uy,ux)*180/Math.PI),p};
  return p;
 }
 const md=snapMode();
 if(from&&md){
  const c=constrain(from,[x,y],md,S.pol.inc,S.pol.extra);
  if(c){UI.track={from,a:c.a,p:c.p}; return c.p}
 }
 return p;
}
/* ═══ التحديد — يُفوّض إلى ents ═══ */
export const hitTest=(x,y)=>E.hitTest(x,y,14/V.k);
/* موضعٌ تمثيليّ للكيان — لتثبيت البطاقات قربه */
export function shapeOfSel(s){
 const poly=E.outlineOf(s);
 if(poly&&poly.length){
  let x=0,y=0;
  poly.forEach(p=>{x+=p[0];y+=p[1]});
  return [x/poly.length,y/poly.length];
 }
 const sh=E.shapeOf(s);
 if(!sh)return null;
 if(sh.t==="pt")return sh.p.slice();
 if(sh.t==="seg")return [(sh.a[0]+sh.b[0])/2,(sh.a[1]+sh.b[1])/2];
 const P=sh.pts||[];
 if(!P.length)return null;
 let x=0,y=0;
 P.forEach(p=>{x+=p[0];y+=p[1]});
 return [x/P.length,y/P.length];
}
const same=(a,b)=>a&&b&&a.k===b.k&&a.id===b.id;
const inSel=s=>UI.SELS.some(x=>same(x,s));
export function setSel(list,primary){
 UI.SELS=list||[];
 UI.SEL=primary||(UI.SELS.length?UI.SELS[UI.SELS.length-1]:null);
 rebuildGrips();
 HOOK.props();
}
export const selList=()=>UI.SELS.slice();
export function toggleSel(s){
 if(inSel(s)){
  const L=UI.SELS.filter(x=>!same(x,s));
  setSel(L,L[L.length-1]);
 }else setSel(UI.SELS.concat([s]),s);
}
export function selectAll(){
 setSel(E.pickEnts());
 draw();
 return UI.SELS.length;
}
/* يُنادى بعد أي تبديل طبقة: ما صار مخفيّاً أو مقفلاً يخرج */
export function pruneSel(){
 const before=UI.SELS.length;
 const keep=UI.SELS.filter(pickable);
 if(keep.length!==before)
  setSel(keep,keep[keep.length-1]||null);
 return before-keep.length;
}
export function delSel(){
 const L=selList();
 if(!L.length)return null;
 const r=edit(()=>E.delEnts(L),"حذف");
 setSel([],null);
 draw();
 return r||null;
}
export function rebuildGrips(){
 UI.grips=[];
 if(!+S.rb.grips)return;
 if(!UI.SELS.length||UI.SELS.length>30)return;
 UI.SELS.forEach(s=>E.gripsOf(s).forEach(g=>UI.grips.push({...g,s})));
}
export function gripAt(px,py){
 let best=null,bd=8;
 UI.grips.forEach(g=>{
  const q=W2S(g.p[0],g.p[1]);
  const d=Math.hypot(q[0]-px,q[1]-py);
  if(d<bd){bd=d;best=g}
 });
 return best;
}
/* ═══ الرسم ═══ */
function drawGrid(){
 const st=Math.max(1,S.meta.snap);
 let s=st;
 while(s*V.k<9)s*=2;
 if(s*V.k<9)return;
 const a=S2W(0,V.h), b=S2W(V.w,0);
 const x0=Math.floor(a[0]/s)*s, x1=Math.ceil(b[0]/s)*s;
 const y0=Math.floor(a[1]/s)*s, y1=Math.ceil(b[1]/s)*s;
 if((x1-x0)/s>4000||(y1-y0)/s>4000)return;
 const P=pal();
 const big=s*10;
 ctx.save(); ctx.lineWidth=1;
 for(let x=x0;x<=x1;x+=s){
  const p=W2S(x,0);
  ctx.strokeStyle=(Math.abs(x%big)<1)?P.gMajor:P.gMinor;
  ctx.beginPath();ctx.moveTo(p[0],0);ctx.lineTo(p[0],V.h);ctx.stroke();
 }
 for(let y=y0;y<=y1;y+=s){
  const p=W2S(0,y);
  ctx.strokeStyle=(Math.abs(y%big)<1)?P.gMajor:P.gMinor;
  ctx.beginPath();ctx.moveTo(0,p[1]);ctx.lineTo(V.w,p[1]);ctx.stroke();
 }
 const o=W2S(0,0);
 ctx.strokeStyle=P.gAxis; ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(0,o[1]);ctx.lineTo(V.w,o[1]);
 ctx.moveTo(o[0],0);ctx.lineTo(o[0],V.h);ctx.stroke();
 ctx.restore();
}
const PAT={};
function patFor(scr){
 const key=themeName()+"|"+Math.round(scr);
 if(PAT[key])return PAT[key];
 const s=clamp(Math.round(scr),4,90);
 const c=document.createElement("canvas");
 c.width=c.height=s;
 const x=c.getContext("2d");
 x.strokeStyle=pal().hatch; x.lineWidth=1;
 x.beginPath();x.moveTo(0,s);x.lineTo(s,0);x.stroke();
 PAT[key]=ctx.createPattern(c,"repeat");
 return PAT[key];
}
function lwOf(L){
 const w=resolve(L,themeName()).lw;
 return clamp((w||25)/100*V.k*S.meta.scale*0.5,0.7,6);
}
function paint(P){
 /* ١ — صبغة المناطق أسفل كل شيء */
 P.forEach(g=>{
  if(g.t!=="fill")return;
  const r=g.ring;
  if(!r||r.length<3)return;
  ctx.save(); ctx.beginPath();
  r.forEach((q,i)=>{
   const p=W2S(q[0],q[1]);
   if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]);
  });
  ctx.closePath();
  ctx.fillStyle=(g.style==="hatch")
   ?patFor(Math.max(5,txtH()*2*V.k))
   :pal().tint;
  ctx.fill();
  ctx.restore();
 });
 /* ٢ — الهاشور */
 P.forEach(g=>{
  if(g.t!=="hatch")return;
  const loops=(g.loops||[]).filter(l=>l&&l.length>2);
  if(!loops.length)return;
  ctx.save(); ctx.beginPath();
  loops.forEach(lp=>{
   lp.forEach((q,i)=>{
    const p=W2S(q[0],q[1]);
    if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]);
   });
   ctx.closePath();
  });
  ctx.fillStyle=(g.pat==="SOLID")?pal().solid
   :patFor(Math.max(4,(g.sc||300)*V.k));
  ctx.fill("evenodd");
  ctx.restore();
 });
 /* ٣ — الخطوط والنصوص */
 P.forEach(g=>{
  if(g.t==="hatch"||g.t==="fill")return;
  const L=g.L||"0";
  const R=resolve(L,themeName());
  const css=primCss(g);
  ctx.save();
  ctx.strokeStyle=css; ctx.fillStyle=css;
  ctx.lineWidth=(g.bad||g.warn)?1.6:lwOf(L);
  if(R.a<1)ctx.globalAlpha=R.a;
  /* دَشّ الأوّلية الصريح (تحذيرٌ · معطوبٌ · هامشٌ خفيف) يسبق دَشّ
     الطبقة — وإلّا فشُرَط الطبقة بالمليمتر الورقي، كارتفاع النصّ
     تماماً، تُضرَب بالمقياس ثم بمقياس الشاشة. */
  const dash=g.dash
   ? g.dash.map(v=>Math.max(1,v*V.k))
   : (R.dash.length
      ? R.dash.map(v=>Math.max(0.5,v*S.meta.scale*V.k))
      : []);
  ctx.setLineDash(dash);
  if(g.t==="line"){
   const a=W2S(g.a[0],g.a[1]), b=W2S(g.b[0],g.b[1]);
   ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
   ctx.stroke();
  }else if(g.t==="poly"){
   if(!g.pts||g.pts.length<2){ctx.restore();return}
   ctx.beginPath();
   g.pts.forEach((q,i)=>{
    const p=W2S(q[0],q[1]);
    if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]);
   });
   if(g.cl!==0)ctx.closePath();
   ctx.stroke();
  }else if(g.t==="arc"){
   const c=W2S(g.cx,g.cy), r=g.r*V.k;
   if(r<0.4){ctx.restore();return}
   /* Y مقلوب: الزوايا تُعكس */
   ctx.beginPath();
   ctx.arc(c[0],c[1],r,-g.a1*Math.PI/180,-g.a0*Math.PI/180);
   ctx.stroke();
  }else if(g.t==="text"){
   const px=g.h*V.k;
   if(px<4.5){ctx.restore();return}
   const p=W2S(g.x,g.y);
   ctx.translate(p[0],p[1]);
   const rt=deg(g.rot||0);
   if(rt)ctx.rotate(-rt*Math.PI/180);
   ctx.font=`${px.toFixed(1)}px Tahoma,Arial`;
   ctx.direction="rtl";
   ctx.textAlign=/l$/.test(g.al||"")?"left"
    :(/r$/.test(g.al||"")?"right":"center");
   ctx.textBaseline=/^m/.test(g.al||"")?"middle":"alphabetic";
   ctx.setLineDash([]);
   ctx.fillText(String(g.s),0,0);
  }
  ctx.restore();
 });
 ctx.setLineDash([]);
}
/* المسار المرسوم — خفيفاً ليُرى الفرق بينه وبين الجسم */
function drawPaths(){
 if(V.k<0.006)return;
 if(!vis("A-WALL")&&!vis("A-WALL-LOW"))return;
 ctx.save();
 ctx.setLineDash([4,4]); ctx.lineWidth=1;
 ctx.strokeStyle=pal().path;
 S.walls.forEach(w=>{
  if(w.align==="c")return;
  if(!vis(isLow(w)?"A-WALL-LOW":"A-WALL"))return;
  const a=W2S(w.a[0],w.a[1]), b=W2S(w.b[0],w.b[1]);
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
  ctx.stroke();
 });
 ctx.restore();
}
/* معيَّن أحمر على الطرف غير المتّصل — علامة لا تعديل */
function drawEnds(){
 if(!+S.rb.ends)return;
 if(!vis("A-WALL")&&!vis("A-WALL-LOW"))return;
 const L=looseEnds(2);
 if(!L.length||L.length>400)return;
 ctx.save();
 ctx.strokeStyle=pal().loose; ctx.lineWidth=1.4;
 L.forEach(e=>{
  const p=W2S(e.p[0],e.p[1]), r=4.5;
  ctx.beginPath();
  ctx.moveTo(p[0],p[1]-r);ctx.lineTo(p[0]+r,p[1]);
  ctx.lineTo(p[0],p[1]+r);ctx.lineTo(p[0]-r,p[1]);
  ctx.closePath();ctx.stroke();
 });
 ctx.restore();
}
/* الإبراز قبل النقر — يوفّر نقرةً خاطئة، خصوصاً أن الإصابة تفضّل
   الأصغر فقد لا يكون ما تظنّه. لا يُرسَم لما هو محدَّد سلفاً. */
function drawPre(){
 const s=UI.pre;
 if(!s)return;
 if(UI.SELS.some(x=>x.k===s.k&&x.id===s.id))return;
 const poly=E.outlineOf(s), sh=poly?null:E.shapeOf(s);
 const PC=pal();
 ctx.save(); ctx.setLineDash([]);
 ctx.strokeStyle=PC.pre; ctx.lineWidth=2.6;
 const path=pts=>{
  ctx.beginPath();
  pts.forEach((q,i)=>{
   const t=W2S(q[0],q[1]);
   if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
  });
 };
 if(poly&&poly.length>2){path(poly); ctx.closePath(); ctx.stroke()}
 else if(sh&&sh.t==="seg"){path([sh.a,sh.b]); ctx.stroke()}
 else if(sh&&sh.t==="poly"&&sh.pts&&sh.pts.length>2){
  path(sh.pts); ctx.closePath(); ctx.stroke();
 }else if(sh&&sh.t==="pt"){
  const c=W2S(sh.p[0],sh.p[1]);
  ctx.beginPath(); ctx.arc(c[0],c[1],9,0,7); ctx.stroke();
 }
 const P=UI.preP;
 if(P){
  const nm=`${s.id} ${E.NAME[s.k]||s.k}`;
  ctx.font="11px Tahoma"; ctx.direction="rtl";
  ctx.textAlign="left"; ctx.textBaseline="top";
  const w=ctx.measureText(nm).width+9;
  ctx.fillStyle=PC.chip;
  ctx.fillRect(P[0]+13,P[1]-19,w,16);
  ctx.strokeStyle=PC.preLn; ctx.lineWidth=1;
  ctx.strokeRect(P[0]+13,P[1]-19,w,16);
  ctx.fillStyle=PC.preTx;
  ctx.fillText(nm,P[0]+17,P[1]-16);
 }
 ctx.restore();
}
function drawSel(){
 if(!UI.SELS.length)return;
 const P=pal();
 ctx.save(); ctx.setLineDash([]);
 UI.SELS.forEach(s=>{
  const prim=same(s,UI.SEL);
  ctx.strokeStyle=prim?P.sel:P.sel2;
  ctx.lineWidth=prim?2.2:1.5;
  const poly=E.outlineOf(s);
  if(poly&&poly.length>2){
   ctx.beginPath();
   poly.forEach((q,i)=>{
    const t=W2S(q[0],q[1]);
    if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
   });
   ctx.closePath(); ctx.stroke();
   return;
  }
  const sh=E.shapeOf(s);
  if(!sh)return;
  if(sh.t==="seg"){
   const a=W2S(sh.a[0],sh.a[1]), b=W2S(sh.b[0],sh.b[1]);
   ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
   ctx.stroke();
  }else if(sh.t==="pt"){
   const c=W2S(sh.p[0],sh.p[1]);
   ctx.beginPath();ctx.arc(c[0],c[1],10,0,7);ctx.stroke();
  }else if(sh.t==="poly"&&sh.pts&&sh.pts.length>2){
   ctx.beginPath();
   sh.pts.forEach((q,i)=>{
    const t=W2S(q[0],q[1]);
    if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
   });
   ctx.closePath(); ctx.stroke();
  }
 });
 ctx.restore();
 drawGrips();
}
function drawGrips(){
 if(!UI.grips.length)return;
 const P=pal();
 ctx.save(); ctx.setLineDash([]); ctx.lineWidth=1.2;
 UI.grips.forEach(g=>{
  const q=W2S(g.p[0],g.p[1]);
  const hot=UI.hot&&UI.hot.s.id===g.s.id&&UI.hot.k===g.k;
  const hov=!hot&&UI.hov&&UI.hov.s.id===g.s.id&&UI.hov.k===g.k;
  const r=(hot||hov)?5:3.5;
  ctx.fillStyle=hot?P.gripHot:(hov?P.gripHov:P.grip);
  ctx.strokeStyle=P.gripLn;
  ctx.fillRect(q[0]-r,q[1]-r,r*2,r*2);
  ctx.strokeRect(q[0]-r,q[1]-r,r*2,r*2);
 });
 ctx.restore();
}
function drawTrack(){
 const t=UI.track;
 if(!t)return;
 const L=9e5, r=t.a*Math.PI/180;
 const b0=W2S(t.from[0]-Math.cos(r)*L, t.from[1]-Math.sin(r)*L);
 const b1=W2S(t.from[0]+Math.cos(r)*L, t.from[1]+Math.sin(r)*L);
 const P=pal();
 ctx.save();
 ctx.strokeStyle=(Math.abs(t.a%90)<0.01)?P.trkO:P.trkP;
 ctx.setLineDash([5,5]); ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(b0[0],b0[1]);ctx.lineTo(b1[0],b1[1]);
 ctx.stroke();
 ctx.restore();
}
function drawOsnap(){
 const o=UI.osnap;
 if(!o)return;
 const s=W2S(o.p[0],o.p[1]), r=6.5;
 const mk=(MODES.find(m=>m.k===o.m)||{}).mk;
 const P=pal();
 ctx.save();
 ctx.strokeStyle=P.snap; ctx.fillStyle=P.snap;
 ctx.lineWidth=1.8; ctx.setLineDash([]);
 ctx.beginPath();
 if(mk==="sq")ctx.rect(s[0]-r,s[1]-r,r*2,r*2);
 else if(mk==="tri"){
  ctx.moveTo(s[0],s[1]-r-1);ctx.lineTo(s[0]+r+1,s[1]+r);
  ctx.lineTo(s[0]-r-1,s[1]+r);ctx.closePath();
 }else if(mk==="x"){
  ctx.moveTo(s[0]-r,s[1]-r);ctx.lineTo(s[0]+r,s[1]+r);
  ctx.moveTo(s[0]-r,s[1]+r);ctx.lineTo(s[0]+r,s[1]-r);
 }else if(mk==="plus"){
  ctx.rect(s[0]-r,s[1]-r,r*2,r*2);
  ctx.moveTo(s[0]-r,s[1]);ctx.lineTo(s[0]+r,s[1]);
  ctx.moveTo(s[0],s[1]-r);ctx.lineTo(s[0],s[1]+r);
 }else if(mk==="per"){
  ctx.moveTo(s[0]-r,s[1]-r);ctx.lineTo(s[0]-r,s[1]+r);
  ctx.lineTo(s[0]+r,s[1]+r);
  ctx.moveTo(s[0]-r,s[1]);ctx.lineTo(s[0],s[1]);
  ctx.lineTo(s[0],s[1]+r);
 }else if(mk==="ref"){
  /* المرجع: معيَّن مجوَّف — يُميّزه عن نقاط رسمك */
  ctx.moveTo(s[0],s[1]-r);ctx.lineTo(s[0]+r,s[1]);
  ctx.lineTo(s[0],s[1]+r);ctx.lineTo(s[0]-r,s[1]);
  ctx.closePath();
 }else{
  ctx.moveTo(s[0]-r,s[1]-r);ctx.lineTo(s[0]+r,s[1]-r);
  ctx.lineTo(s[0]-r,s[1]+r);ctx.lineTo(s[0]+r,s[1]+r);
  ctx.closePath();
 }
 ctx.stroke();
 const nm=MNAME[o.m]||"";
 ctx.font="11px Tahoma";
 ctx.direction="rtl";
 ctx.textAlign="left"; ctx.textBaseline="top";
 const w=ctx.measureText(nm).width+9;
 ctx.fillStyle=P.chip;
 ctx.fillRect(s[0]+r+4,s[1]+r+2,w,16);
 ctx.strokeStyle=P.snapLn; ctx.lineWidth=1;
 ctx.strokeRect(s[0]+r+4,s[1]+r+2,w,16);
 ctx.fillStyle=P.snap;
 ctx.fillText(nm,s[0]+r+8,s[1]+r+5);
 ctx.restore();
}
function drawPreview(){
 const PL=pal();
 if(UI.free&&UI.free.length>1){
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth=1.8;
  ctx.strokeStyle=PL.grip;
  ctx.beginPath();
  UI.free.forEach((q,i)=>{
   const t=W2S(q[0],q[1]);
   if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
  });
  ctx.stroke(); ctx.restore();
 }
 (UI.guides||[]).forEach(g=>{
  const a=W2S(g[0][0],g[0][1]), b=W2S(g[1][0],g[1][1]);
  ctx.save(); ctx.setLineDash([3,4]); ctx.lineWidth=1;
  ctx.strokeStyle=PL.guide;
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
  ctx.stroke();
  ctx.restore();
 });
 drawTrack();
 if(UI.marq){
  const a=W2S(UI.marq.a[0],UI.marq.a[1]);
  const b=W2S(UI.marq.b[0],UI.marq.b[1]);
  const win=UI.marq.win;
  ctx.save();
  ctx.setLineDash(win?[]:[6,4]);
  ctx.strokeStyle=win?PL.win:PL.cross;
  ctx.fillStyle=win?PL.winF:PL.crossF;
  ctx.lineWidth=1.2;
  const x=Math.min(a[0],b[0]), y=Math.min(a[1],b[1]);
  ctx.fillRect(x,y,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  ctx.strokeRect(x,y,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  ctx.setLineDash([]);
  ctx.font="11px Tahoma"; ctx.direction="rtl";
  ctx.fillStyle=ctx.strokeStyle;
  ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText(win?"نافذة — احتواء كامل":"قطع — تلامس",x+5,y+4);
  ctx.restore();
 }
 const P=R.preview();
 if(P.length){
  ctx.save(); ctx.lineWidth=1.6;
  P.forEach(g=>{
   const col=g.c||PL.grip;
   ctx.strokeStyle=col; ctx.setLineDash([6,4]);
   if(g.t==="l"){
    const a=W2S(g.a[0],g.a[1]), b=W2S(g.b[0],g.b[1]);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
    ctx.stroke();
    const L=Math.hypot(g.b[0]-g.a[0],g.b[1]-g.a[1]);
    if(L*V.k>30){
     const t=(L/1000).toFixed(2);
     ctx.setLineDash([]);
     ctx.font="12px Consolas,monospace";
     ctx.direction="ltr";
     ctx.textAlign="center"; ctx.textBaseline="bottom";
     const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
     const w=ctx.measureText(t).width+8;
     ctx.fillStyle=PL.chip2;
     ctx.fillRect(mx-w/2,my-17,w,16);
     ctx.fillStyle=col;
     ctx.fillText(t,mx,my-4);
    }
   }else if(g.t==="r"){
    const a=W2S(g.a[0],g.a[1]), b=W2S(g.b[0],g.b[1]);
    ctx.strokeRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),
     Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    ctx.setLineDash([]);
    ctx.font="12px Consolas,monospace";
    ctx.direction="ltr";
    ctx.textAlign="left"; ctx.fillStyle=col;
    ctx.fillText(
     `${(Math.abs(g.b[0]-g.a[0])/1000).toFixed(2)} × `
     +`${(Math.abs(g.b[1]-g.a[1])/1000).toFixed(2)} م`,
     Math.min(a[0],b[0])+6, Math.min(a[1],b[1])-7);
   }else if(g.t==="b"){
    /* معاينة جسم الجدار بسماكته */
    const dx=g.b[0]-g.a[0], dy=g.b[1]-g.a[1];
    const L=Math.hypot(dx,dy);
    if(L<1)return;
    const nx=-dy/L*(g.w/2), ny=dx/L*(g.w/2);
    const Q=[[g.a[0]+nx,g.a[1]+ny],[g.b[0]+nx,g.b[1]+ny],
             [g.b[0]-nx,g.b[1]-ny],[g.a[0]-nx,g.a[1]-ny]];
    ctx.setLineDash([]); ctx.lineWidth=1.1;
    ctx.strokeStyle=PL.cross;
    ctx.beginPath();
    Q.forEach((q,i)=>{
     const t=W2S(q[0],q[1]);
     if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
    });
    ctx.closePath(); ctx.stroke();
   }else if(g.t==="pg"){
    if(!g.pts||g.pts.length<2)return;
    ctx.beginPath();
    g.pts.forEach((q,i)=>{
     const t=W2S(q[0],q[1]);
     if(i)ctx.lineTo(t[0],t[1]); else ctx.moveTo(t[0],t[1]);
    });
    if(g.cl!==0)ctx.closePath();
    ctx.stroke();
   }else if(g.t==="tx"){
    const t=W2S(g.p[0],g.p[1]);
    ctx.setLineDash([]);
    ctx.font="12px Consolas,monospace";
    ctx.direction="rtl"; ctx.textAlign="center";
    ctx.textBaseline="middle";
    const w=ctx.measureText(g.s).width+10;
    ctx.fillStyle=PL.chip2;
    ctx.fillRect(t[0]-w/2,t[1]-9,w,18);
    ctx.fillStyle=col;
    ctx.fillText(String(g.s),t[0],t[1]);
   }
  });
  ctx.restore();
 }
 if(R.T.ghost){
  const s=W2S(R.T.ghost[0],R.T.ghost[1]);
  ctx.save(); ctx.setLineDash([]);
  ctx.strokeStyle=PL.ghost; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(s[0],s[1],5,0,7);ctx.stroke();
  ctx.restore();
 }
 if(UI.zwin){
  const a=W2S(UI.zwin.a[0],UI.zwin.a[1]);
  const b=W2S(UI.zwin.b[0],UI.zwin.b[1]);
  ctx.save();
  ctx.setLineDash([5,4]); ctx.lineWidth=1.3;
  ctx.strokeStyle=PL.win; ctx.fillStyle=PL.winF;
  const x=Math.min(a[0],b[0]), y=Math.min(a[1],b[1]);
  ctx.fillRect(x,y,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  ctx.strokeRect(x,y,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  ctx.restore();
 }
 drawOsnap();
}
function drawScaleBar(){
 const want=110/V.k;
 const pow=Math.pow(10,Math.floor(Math.log10(want)));
 let s=pow;
 [1,2,5,10].some(f=>{if(pow*f>=want){s=pow*f;return true}return false});
 const px=s*V.k;
 if(px<20||px>V.w*0.6)return;
 const x=V.w-px-16, y=V.h-16;
 const P=pal();
 ctx.save();
 ctx.strokeStyle=P.bar; ctx.fillStyle=P.bar;
 ctx.lineWidth=1.4; ctx.setLineDash([]);
 ctx.beginPath();
 ctx.moveTo(x,y-5);ctx.lineTo(x,y);ctx.lineTo(x+px,y);
 ctx.lineTo(x+px,y-5);
 ctx.stroke();
 ctx.font="10.5px Tahoma";
 ctx.textAlign="center"; ctx.textBaseline="bottom";
 ctx.direction="rtl";
 ctx.fillText((s/1000)+" م",x+px/2,y-7);
 ctx.direction="ltr";
 ctx.textAlign="right";
 ctx.fillText(scl(S.meta.scale),V.w-16,y-22);
 ctx.direction="rtl";
 ctx.restore();
}
let RQ=false;
export function draw(){
 bump("frame");
 if(RQ)return;
 RQ=true;
 requestAnimationFrame(()=>{RQ=false;paintAll()});
}
function paintAll(){
 const P=pal();
 ctx.clearRect(0,0,V.w,V.h);
 ctx.fillStyle=P.bg; ctx.fillRect(0,0,V.w,V.h);
  drawUnderlay(ctx,p=>W2S(p[0],p[1]),V.k);
 if(+S.rb.grid)drawGrid();
 let sc=null;
 try{sc=scene()}
 catch(e){
  ctx.fillStyle=P.er; ctx.font="13px Tahoma";
  ctx.direction="rtl";
  ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText("تعذّر بناء المشهد: "+e.message,12,12);
  return;
 }
 paint(sc.P);
 const bg=blockGhost();
 if(bg)drawInstance(ctx,bg,p=>W2S(p[0],p[1]),{ghost:true});
 if(+S.rb.paths)drawPaths();
 drawEnds();
 drawPre();
 rebuildGrips();
 drawSel();
 drawPreview();
 drawScaleBar();
}
/* ═══ الفأرة ═══ */
let panning=null, drag=null;
const GN={a:"البداية",b:"النهاية",mid:"الجسم",
 c:"المركز",e0:"الحدّ الأول",e1:"الحدّ الثاني",
 L:"التسمية",pos:"موضع الخطّ",base:"الأساس",end:"النهاية",
 p:"الموضع",r:"القطر",sz:"المقاس",rot:"الدوران",w:"العرض"};
const gname=k=>GN[k]||(/^v\d+$/.test(k)?"رأس":
 (/^p\d+$/.test(k)?"نقطة":k));

function onDown(e){
 cv.focus(); UI.pre=null;
 /* الزرّ الأيمن يحرّك في وضع «Enter» وحده — وفي وضع القائمة لا
    يجوز التمييز بين نقرةٍ وسحبةٍ لأن contextmenu يقع قبل الحركة
    أو بعدها بحسب النظام. */
 if(e.button===1||(e.button===2&&UIS.rclick==="enter")){
  panning=[e.clientX,e.clientY];
  return;
 }
 if(e.button!==0)return;
 if(NAV.mode==="pan"){
  panning=[e.clientX,e.clientY];
  cv.style.cursor="grabbing";
  return;
 }
 if(NAV.mode==="zw"){
  const p=S2W(e.offsetX,e.offsetY);
  drag={zwin:true,a:p};
  UI.zwin={a:p,b:p};
  draw();
  return;
 }
 const raw=S2W(e.offsetX,e.offsetY);
  if(isInserting()){
   onBlockClick(raw);
   return;
  }
 if(R.active()){
  const stp=R.step();
  if(stp&&stp.freehand){
   drag={free:[[Math.round(raw[0]),Math.round(raw[1])]]};
   UI.free=drag.free;
   draw(); return;
  }
  R.feedPoint(snap(raw[0],raw[1],R.baseOf()));
  HOOK.prompt();
  return;
 }
 const gr=gripAt(e.offsetX,e.offsetY);
 if(gr){
  UI.hot=gr;
  drag={grip:gr,start:snap(raw[0],raw[1],null),moved:false,
   snap:snapshot(),o:E.grabOf(gr.s)};
  HOOK.status(`مقبض ${gname(gr.k)} من ${gr.s.id}`);
  draw(); return;
 }
 const hit=hitTest(raw[0],raw[1]);
 if(!hit){
  const p=snap(raw[0],raw[1],null);
  drag={marq:true,a:p,add:e.shiftKey};
  UI.marq={a:p,b:p,win:true};
  if(!e.shiftKey)setSel([],null);
  draw(); return;
 }
 if(e.shiftKey){toggleSel(hit);draw();return}
 const multi=inSel(hit)&&UI.SELS.length>1;
 if(!multi)setSel([hit],hit);
 else{UI.SEL=hit;HOOK.props()}
 const p=snap(raw[0],raw[1],null);
 /* الحرس الأخير قبل التحويل: ما لا يُحدَّد لا يُعدَّل ولا يُحرَّك،
    ولو وصل إلى التحديد من مسارٍ لا يصفّي. */
 const L2=UI.SELS.filter(pickable);
 if(L2.length<UI.SELS.length)
  HOOK.status(`${UI.SELS.length-L2.length} عنصراً مخفيّاً أو `
   +`مقفلاً لن يتحرّك`);
 drag={move:1,start:p,moved:false,snap:snapshot(),
  list:L2.map(s=>({s,o:E.grabOf(s)})).filter(x=>x.o)};
 draw();
}
function onMove(e){
 if(panning){
  panBy(e.clientX-panning[0], e.clientY-panning[1]);
  panning=[e.clientX,e.clientY];
  return;
 }
 const raw=S2W(e.offsetX,e.offsetY);
 const st=document.getElementById("stPos");
 if(st)st.textContent=`${m2(raw[0])} , ${m2(raw[1])} م`;
 UI.pre=null; UI.preP=[e.offsetX,e.offsetY];
  if(isInserting()){
   onBlockMove(raw);
   return;
  }
 if(drag&&drag.zwin){
  UI.zwin={a:drag.a,b:raw};
  draw(); return;
 }
 if(drag&&drag.free){
  const q=drag.free[drag.free.length-1];
  if(Math.hypot(raw[0]-q[0],raw[1]-q[1])>Math.max(15,2.5/V.k))
   drag.free.push([Math.round(raw[0]),Math.round(raw[1])]);
  draw(); return;
 }

 if(drag&&drag.marq){
  const p=snap(raw[0],raw[1],null);
  UI.marq={a:drag.a,b:p,win:p[0]>=drag.a[0]};
  draw(); return;
 }
 if(drag&&drag.grip){
  const base=/^(mid|c|p|L|base)$/.test(drag.grip.k)
   ? drag.start : null;
  const p=snap(raw[0],raw[1],base);
  if(!drag.moved){
   pushHistory(drag.snap,"تعديل مقبض"); drag.moved=true;
   /* النسخة تُحسَب مرّةً عند بدء السحب لا في كل إطار: سحبُ بُعدٍ
      أو نصٍّ لا يُبطِل اتحاد الأجسام ولا الحلقات ولا البصمات */
   drag.tf=E.touchFn(E.bumpOf([drag.grip.s]));
  }
  E.dragGrip(drag.grip,drag.o,p,
   p[0]-drag.start[0],p[1]-drag.start[1]);
  (drag.tf||touch)();
  draw(); return;
 }
 if(drag&&drag.move){
  const p=snap(raw[0],raw[1],null);
  const dx=p[0]-drag.start[0], dy=p[1]-drag.start[1];
  if(!drag.moved){
   if(Math.hypot(dx,dy)<Math.max(2,4/V.k))return;
   pushHistory(drag.snap,"تحريك"); drag.moved=true;
   drag.tf=E.touchFn(E.bumpOf(drag.list.map(x=>x.s)));
  }
  drag.list.forEach(({s,o})=>E.moveEnt(s,o,dx,dy));
  (drag.tf||touch)();
  draw(); return;
 }
 if(R.active()){
  const st=R.step();
  /* خطوة تنتظر عنصراً ⇒ أبرِز المرشَّح تحت المؤشّر قبل النقر */
  if(st&&st.ent)UI.pre=E.hitTest(raw[0],raw[1],14/V.k);
  R.T.ghost=snap(raw[0],raw[1],R.baseOf());
  HOOK.prompt(); draw(); return;
 }
 UI.hov=gripAt(e.offsetX,e.offsetY);
 if(!UI.hov)UI.pre=hitTest(raw[0],raw[1]);
 R.T.ghost=null;
 snap(raw[0],raw[1],null);
 cv.style.cursor=NAV.mode?(NAV.mode==="pan"?"grab":"crosshair")
  :(UI.hov?"pointer":(UI.pre?"pointer":"crosshair"));
 draw();
}
function onUp(){
 if(drag&&drag.zwin){
  const a=drag.a, b=UI.zwin?UI.zwin.b:a;
  drag=null; UI.zwin=null;
  const r={x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),
           x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])};
  if((r.x1-r.x0)*V.k>8&&(r.y1-r.y0)*V.k>8)fitBox(r,0.02);
  navSet(null);
  HOOK.status("");
  draw(); return;
 }
 if(NAV.mode==="pan"&&panning){
  panning=null; cv.style.cursor="grab"; return;
 }
 if(drag&&drag.free){
  const P=drag.free;
  drag=null; UI.free=null;
  if(P.length>1)R.feedStroke(P);
  HOOK.prompt(); draw(); return;
 }
 if(drag&&drag.marq&&UI.marq){
  const a=UI.marq.a, b=UI.marq.b;
  const r={x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),
           x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])};
  if((r.x1-r.x0)*V.k>5||(r.y1-r.y0)*V.k>5){
   const out=E.pickInRect(r,UI.marq.win,drag.add,UI.SELS);
   setSel(out,out[out.length-1]);
   HOOK.status(out.length?`${out.length} عنصر محدد`
    :"لا عنصر داخل الإطار");
  }
  UI.marq=null; drag=null; draw(); return;
 }
 if(drag&&(drag.grip||drag.move)){
  UI.hot=null;
  if(drag.moved){
   jrTaint(drag.grip?"سحب مقبض":"سحب مباشر");
   touch();HOOK.refresh();autosave();
  }
  drag=null; rebuildGrips(); draw(); return;
 }
 drag=null; panning=null;
}
/* التسجيل بعد التعريف — مسارٌ واحد للفأرة واللمس والقلم */
cv.addEventListener("mousedown",onDown);
cv.addEventListener("mousemove",onMove);
addEventListener("mouseup",onUp);

/* ═══ اللمس والقلم ═══
   اللوح هو الجهاز الطبيعي لرسم مخطّطٍ في الموقع، ولم يكن يعمل:
   كل التفاعل أحداث فأرة. وPointer Events تُغذّي المعالِجات نفسها
   فلا منطق ثانٍ يتخلّف عن الأول.

   الإصبع الواحد يرسم ويحدّد كالفأرة تماماً. والإصبعان تنقّلٌ لا
   رسم: يُلغيان ما بدأه الأول لأن نيّتهما التكبير والتحريك.
   والضغط المطوّل بديلُ الزرّ الأيمن — فلا قائمة سياق بلا فأرة. */
const PT=new Map();
let gest=null, lp=null;
const pdist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pmid=(a,b)=>[(a.x+b.x)/2,(a.y+b.y)/2];

function abortDrag(){
 if(drag&&drag.moved){onUp(); return}   /* ما تحرّك يُنهى نظامياً */
 drag=null; panning=null;
 UI.marq=null; UI.free=null; UI.zwin=null;
 draw();
}
const lpClear=()=>{if(lp){clearTimeout(lp.t); lp=null}};
function lpStart(e){
 lpClear();
 const x=e.clientX, y=e.clientY;
 lp={x,y,t:setTimeout(()=>{
  lp=null;
  if(drag&&drag.moved)return;          /* سحبٌ جارٍ لا ضغطة */
  abortDrag();
  if(HOOK.ctx)HOOK.ctx(x,y);
 },550)};
}

cv.addEventListener("pointerdown",e=>{
 if(e.pointerType==="mouse")return;     /* للفأرة معالجُها */
 e.preventDefault();
 if(cv.setPointerCapture)cv.setPointerCapture(e.pointerId);
 PT.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
 if(PT.size===1){
  cv.focus();
  if(!R.active())lpStart(e);            /* لا قائمة وسط أداة */
  onDown(e);
  return;
 }
 if(PT.size===2){
  lpClear();
  abortDrag();
  const [a,b]=[...PT.values()];
  gest={d:pdist(a,b), k:V.k, m:pmid(a,b)};
 }
},{passive:false});

cv.addEventListener("pointermove",e=>{
 if(e.pointerType==="mouse")return;
 const p=PT.get(e.pointerId);
 if(!p)return;
 e.preventDefault();
 p.x=e.offsetX; p.y=e.offsetY;
 if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>8)lpClear();
 if(PT.size>=2&&gest){
  const [a,b]=[...PT.values()];
  const d=pdist(a,b), m=pmid(a,b);
  /* نسبةٌ مطلقة من بداية الإيماءة لا تراكمية: القرص ثم الفتح
     يعود إلى المقياس نفسه بلا انجراف */
  if(gest.d>8&&d>8){
   const f=(d/gest.d)*(gest.k/V.k);
   if(f>0.01&&Math.abs(f-1)>1e-4)zoomAt(m[0],m[1],f);
  }
  panBy(m[0]-gest.m[0], m[1]-gest.m[1]);
  gest.m=m;
  return;
 }
 onMove(e);
},{passive:false});

function ptEnd(e){
 if(e.pointerType==="mouse")return;
 PT.delete(e.pointerId);
 if(PT.size<2)gest=null;
 if(PT.size===0){lpClear(); onUp()}
}
cv.addEventListener("pointerup",ptEnd);
cv.addEventListener("pointercancel",ptEnd);

cv.addEventListener("contextmenu",e=>{
 e.preventDefault();
 const m=UIS.rclick||"auto";
 const wantMenu=(m==="menu")||(m==="auto"&&!R.active());
 if(wantMenu&&HOOK.ctx&&HOOK.ctx(e.clientX,e.clientY))return;
 if(R.active())R.enter();
 else if(R.T.last)R.begin(R.T.last);
 HOOK.prompt(); draw();
});
cv.addEventListener("wheel",e=>{
 e.preventDefault();
 /* قرص لوحة اللمس يصل ctrl+wheel — خطوةٌ أنعم من عجلة الفأرة */
 const f=e.ctrlKey?(1+Math.min(0.25,Math.abs(e.deltaY)*0.01))
                  :1.12;
 zoomAt(e.offsetX,e.offsetY,e.deltaY<0?f:1/f);
},{passive:false});
cv.addEventListener("dragover",e=>e.preventDefault());
cv.addEventListener("drop",e=>{
 e.preventDefault();
 const name=e.dataTransfer?.getData("application/x-mistar-block");
 if(!name)return;
 const p=S2W(e.offsetX,e.offsetY);
 import("../tools/blocks.js").then(({startInsert})=>{
  startInsert(name); onBlockMove(p); onBlockClick(p);
 });
});
cv.addEventListener("mouseleave",()=>{
 UI.pre=null; UI.hov=null; draw();
});
