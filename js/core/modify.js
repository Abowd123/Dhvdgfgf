/* ═══ التحويلات وعمليات التعديل ═══
   المبدأ: كل تحويل يُحسب من لقطة الأصل لا من الحالة الجارية، فتصير
   المعاينة الحيّة صحيحة والسحب المتكرّر لا يتراكم.
   ولا عملية هنا تُنفَّذ بلا أمر صريح على تحديد صريح.

   النقل والنسخ يعملان على كل الأنواع. الدوران والمرآة يعملان على
   الجميع، ويرفضان البُعد والسلسلة إن كان التحويل يفسد قياسهما —
   فلا يُعرَض رقمٌ خاطئ بهيئة يقين.
   والإزاحة والقطع والقصّ والتمديد والشدّ واللحم للجدران وحدها. */
import {S,touch} from "./state.js";
import {newId,clamp,D2R,R2D,deg,m2,m3} from "./units.js";
import {dist,lineX,nearOnSeg,mid,bboxOf} from "./geom.js";
import {dir,wallById,wallLen,band,addWall,MINW} from "./walls.js";
import {opensOf,openById,span,delOpen} from "./opens.js";
import {areaById} from "./areas.js";
import {dimById,chainById,annoById} from "./dims.js";
import {colById} from "./cols.js";
import {fixById} from "./fixt.js";
import {stById} from "./stairs.js";
import {grabOf,entOf,moveEnt,shapeOf,outlineOf,NAME} from "./ents.js";
import {pickable} from "./layers.js";
import {ENT} from "./entreg.js";

const R=v=>Math.round(v);
const P2=p=>[R(p[0]),R(p[1])];

/* ═══ اللقطة الجماعية ═══
   الفتحة لا تُلقَط: s نسبيّ فتتبع جدارها مجّاناً. */
export function grab(list){
 const out=[];
 (list||[]).forEach(s=>{
  if(!s||s.k==="open")return;
  if(!pickable(s))return;
  const o=grabOf(s);
  if(o)out.push({s,o});
 });
 return out;
}
export const segsOf=G=>(G||[])
 .filter(g=>g.s.k==="wall"&&g.o.a)
 .map(g=>[g.o.a,g.o.b]);

/* ═══ التكرار ═══
   الجدار حاضنٌ فيسحب فتحاته؛ والفتحة لا تُنسَخ وحدها لأنها لا
   تقوم بلا حاضن. وما عداهما نسخةٌ بمعرّفٍ جديد، وحقولٌ تُطرَح
   بالإعلان (dupDrop) لا بشرطٍ هنا. */
export function dupEnt(s,withOpens){
 const e=entOf(s);
 if(!e)return null;
 const d=ENT[s.k];
 if(!d||d.noDup)return null;
 const cp=JSON.parse(JSON.stringify(e));
 cp.id=newId(d.pre);
 if(s.k==="wall"){
  S.walls.push(cp);
  let no=0;
  if(withOpens!==false){
   opensOf(s.id).forEach(o=>{
    S.opens.push(Object.assign({},o,{id:newId("O"),wall:cp.id}));
    no++;
   });
  }
  touch();
  return {e:cp,opens:no};
 }
 (d.dupDrop||[]).forEach(k=>{delete cp[k]});
 S[d.coll].push(cp);
 touch();
 return {e:cp,opens:0};
}
export const dupWall=(id,withOpens)=>{
 const r=dupEnt({k:"wall",id},withOpens);
 return r?{wall:r.e,opens:r.opens}:null;
};
/* ═══ النقل ═══ */
export function moveAll(G,dx,dy){
 (G||[]).forEach(({s,o})=>moveEnt(s,o,dx,dy));
 touch();
 return (G||[]).length;
}
/* ═══ نسخةٌ واحدةٌ محوَّلة ═══
   التحويلُ من لقطة الأصل لا من النسخة المتحرّكة، وxf يقع على
   المقبض المنسوخ. قلبُ copyAll والمصفوفتين معاً — فالقاعدةُ في
   موضعٍ واحد. */
function copyOne(s,o,withOpens,xf){
 const r=dupEnt(s,withOpens);
 if(!r)return null;
 const ns={k:s.k,id:r.e.id};
 const g=grabOf(ns);
 if(g){
  Object.keys(o).forEach(k=>{if(k!=="e")g[k]=o[k]});
  xf(ns,g);
 }
 return {ns,opens:r.opens};
}
export function copyAll(G,dx,dy,n,withOpens){
 n=clamp(R(n||1),1,200);
 if((G||[]).length*n>500)throw new Error("أكثر من 500 نسخة");
 let nw=0, no=0;
 const made=[];
 for(let i=1;i<=n;i++){
  (G||[]).forEach(({s,o})=>{
   const q=copyOne(s,o,withOpens,(ns,g)=>moveEnt(ns,g,dx*i,dy*i));
   if(!q)return;
   nw++; no+=q.opens; made.push(q.ns);
  });
 }
 touch();
 return {walls:nw,opens:no,made};
}
/* ═══ الدوران ═══ */
export const rotP=(p,c,degv)=>{
 const a=degv*D2R, ca=Math.cos(a), sa=Math.sin(a);
 const dx=p[0]-c[0], dy=p[1]-c[1];
 return [R(c[0]+dx*ca-dy*sa), R(c[1]+dx*sa+dy*ca)];
};
const q90=a=>{
 const d=deg(a);
 return (Math.abs(d%90)<0.01)?Math.round(d/90)%4:-1;
};
/* ═══ من يقبل دوراناً حرّاً ═══
   البُعدُ الأفقيُّ والرأسيُّ والسلسلةُ لا تدور إلّا بمضاعفات ٩٠° —
   فلا يُعرَض رقمٌ خاطئ بهيئة يقين. والقاعدةُ تُقرأ مرّتين: rotEnt
   عند التحويل، وcanRotate للترشيح قبل أن تُنشَأ نسخةٌ تُرفَض. */
const rotOk=(k,kind,degv)=>{
 if(k==="dim")return (kind==="al")||q90(degv)>=0;
 if(k==="chain")return q90(degv)>=0;
 return true;
};
export const canRotate=(s,degv)=>{
 const e=entOf(s);
 return !!e&&rotOk(s&&s.k,e.kind,degv);
};
/* يعيد true إن طُبِّق · false إن رُفض (يُبلَّغ باسمه) */
function rotEnt(s,o,c,a){
 const e=o.e;
 if(s.k==="wall"||s.k==="stair"){
  e.a=rotP(o.a,c,a); e.b=rotP(o.b,c,a);
  return true;
 }
 if(s.k==="area"){
  e.ring=o.ring.map(p=>rotP(p,c,a));
  if(o.lp)e.lp=rotP(o.lp,c,a);
  return true;
 }
 if(s.k==="col"){
  const p=rotP([o.x,o.y],c,a);
  e.x=p[0]; e.y=p[1];
  if(e.kind!=="circ")e.rot=deg(o.rot+a);
  return true;
 }
 if(s.k==="fix"){
  const p=rotP([o.x,o.y],c,a);
  e.x=p[0]; e.y=p[1];
  e.rot=deg(o.rot+a);
  return true;
 }
 if(s.k==="anno"){
  if(o.pts){e.pts=o.pts.map(p=>rotP(p,c,a)); return true}
  const p=rotP([o.x,o.y],c,a);
  e.x=p[0]; e.y=p[1];
  if(e.kind==="text")e.rot=deg((e.rot||0)+a);
  return true;
 }
 if(s.k==="dim"){
  if(!rotOk("dim",o.kind,a))return false;
  if(o.kind==="al"){
   e.a=rotP(o.a,c,a); e.b=rotP(o.b,c,a);
   return true;
  }
  /* نقطةٌ على خطّ البُعد تدور معه، فيُستخرَج pos الجديد منها */
  const ref=(o.kind==="h")?[o.a[0],o.pos]:[o.pos,o.a[1]];
  const M=rotP(ref,c,a);
  e.a=rotP(o.a,c,a); e.b=rotP(o.b,c,a);
  if(q90(a)%2===1)e.kind=(o.kind==="h")?"v":"h";
  e.pos=(e.kind==="h")?M[1]:M[0];
  return true;
 }
 if(s.k==="chain"){
  if(!rotOk("chain",null,a))return false;
  const b=rotP(o.base,c,a);
  const p0=rotP(chainRef(o),c,a);
  e.base=b;
  if(q90(a)%2===1)e.axis=(e.axis==="h")?"v":"h";
  e.pos=(e.axis==="h")?p0[1]:p0[0];
  /* الاتجاه قد ينقلب: القيَم مكتوبة فلا تُمَسّ، والأساس يُصحَّح */
  return true;
 }
 return false;
}
const chainRef=o=>(o.axis==="h")
 ? [o.base[0],o.pos] : [o.pos,o.base[1]];

export function rotateAll(G,c,degv,copy,withOpens){
 let nw=0,no=0,ref=[];
 const work=copy?[]:null;
 if(copy){
  (G||[]).forEach(({s,o})=>{
   const r=dupEnt(s,withOpens);
   if(!r)return;
   const ns={k:s.k,id:r.e.id};
   const g=grabOf(ns);
   if(!g)return;
   Object.keys(o).forEach(k=>{if(k!=="e")g[k]=o[k]});
   work.push({s:ns,o:g});
   no+=r.opens;
  });
 }
 (work||G||[]).forEach(({s,o})=>{
  if(rotEnt(s,o,c,degv))nw++;
  else ref.push(`${s.id} ${NAME[s.k]||s.k}`);
 });
 touch();
 return {walls:nw,opens:no,refused:ref,
  made:work?work.map(x=>x.s):[]};
}
/* ═══ المرآة ═══
   الانعكاس يقلب اتجاه المسار، فالمحاذاة l تصير r وبالعكس ليبقى
   الجسم على الوجه نفسه هندسياً. وجهة فتح الباب تُقلَب لأنها
   تُقاس من عمود المسار. والأداة تُعكَس بعلم mir. */
const flipAlign=a=>(a==="l")?"r":((a==="r")?"l":"c");
function mirEnt(s,o,M,axisKind,rotDelta){
 const e=o.e;
 if(s.k==="wall"){
  e.a=M(o.a); e.b=M(o.b);
  e.align=flipAlign(e.align);
  opensOf(e.id).forEach(op=>{
   op.swing=(op.swing==="left")?"right":"left";
   if(op.face)op.face=(op.face==="l")?"r":"l";
  });
  return true;
 }
 if(s.k==="stair"){e.a=M(o.a); e.b=M(o.b); return true}
 if(s.k==="area"){
  e.ring=o.ring.map(M).reverse();
  if(o.lp)e.lp=M(o.lp);
  return true;
 }
 if(s.k==="col"){
  const p=M([o.x,o.y]);
  e.x=p[0]; e.y=p[1];
  if(e.kind!=="circ")e.rot=deg(rotDelta-o.rot);
  return true;
 }
 if(s.k==="fix"){
  const p=M([o.x,o.y]);
  e.x=p[0]; e.y=p[1];
  e.rot=deg(rotDelta-o.rot);
  if(e.mir)delete e.mir; else e.mir=1;
  return true;
 }
 if(s.k==="anno"){
  if(o.pts){e.pts=o.pts.map(M); return true}
  const p=M([o.x,o.y]);
  e.x=p[0]; e.y=p[1];
  if(e.kind==="text")e.rot=deg(rotDelta-(e.rot||0));
  return true;
 }
 if(s.k==="dim"){
  if(o.kind==="al"){e.a=M(o.a); e.b=M(o.b); return true}
  if(!axisKind)return false;      /* h/v تحتاج محوراً قائماً */
  const A=M(o.a), B=M(o.b);
  const Q=M((o.kind==="h")?[o.a[0],o.pos]:[o.pos,o.a[1]]);
  e.a=A; e.b=B;
  if(axisKind==="d")e.kind=(o.kind==="h")?"v":"h";
  e.pos=(e.kind==="h")?Q[1]:Q[0];
  return true;
 }
 if(s.k==="chain"){
  if(!axisKind)return false;
  const b=M(o.base);
  const q=M(chainRef(o));
  e.base=b;
  if(axisKind==="d")e.axis=(e.axis==="h")?"v":"h";
  e.pos=(e.axis==="h")?q[1]:q[0];
  return true;
 }
 return false;
}
export function mirrorAll(G,a,b,keep,withOpens){
 const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
 if(L<1)throw new Error("محور المرآة صفري");
 const ux=dx/L, uy=dy/L;
 const M=p=>{
  const px=p[0]-a[0], py=p[1]-a[1], t=px*ux+py*uy;
  return [R(a[0]+2*ux*t-px), R(a[1]+2*uy*t-py)];
 };
 /* محور قائم؟ h ⇒ أفقي/رأسي يبقى · d ⇒ قطريّ يبدّل */
 const ang=deg(Math.atan2(uy,ux)*R2D);
 /* تفاوتٌ حول المضاعف من الجهتين — 89.9999 محورٌ قائم */
 const at=(v,m)=>{const r=((v%m)+m)%m; return Math.min(r,m-r)<0.01};
 const m90=at(ang,90), m45=at(ang-45,90);
 const axisKind=m90?"s":(m45?"d":null);
 const rotDelta=2*ang;                /* θ' = 2α − θ */
 let nw=0,no=0,ref=[];
 const work=keep?[]:null;
 if(keep){
  (G||[]).forEach(({s,o})=>{
   const r=dupEnt(s,withOpens);
   if(!r)return;
   const ns={k:s.k,id:r.e.id};
   const g=grabOf(ns);
   if(!g)return;
   Object.keys(o).forEach(k=>{if(k!=="e")g[k]=o[k]});
   work.push({s:ns,o:g});
   no+=r.opens;
  });
 }
 (work||G||[]).forEach(({s,o})=>{
  if(mirEnt(s,o,M,axisKind,rotDelta))nw++;
  else ref.push(`${s.id} ${NAME[s.k]||s.k}`);
 });
 touch();
 return {walls:nw,opens:no,refused:ref,
  made:work?work.map(x=>x.s):[]};
}
/* ═══ الإزاحة ═══ على عمود المسار · clear يجعل المسافة صافية ═══ */
export function offsetWall(id,d,side,clear,t,type,withOpens){
 const w=wallById(id);
 if(!w)throw new Error("الجدار غير موجود");
 const u=dir(w);
 if(!u)throw new Error("الجدار صفري");
 const t2=clamp(R(t||w.t),50,1000);
 const D=d+(clear?(w.t+t2)/2:0);
 const sg=(side<0)?-1:1;
 const px=u.nx*sg*D, py=u.ny*sg*D;
 const r=dupWall(id,withOpens);
 if(!r)throw new Error("تعذّر النسخ");
 r.wall.a=[R(w.a[0]+px),R(w.a[1]+py)];
 r.wall.b=[R(w.b[0]+px),R(w.b[1]+py)];
 r.wall.t=t2;
 if(type)r.wall.type=type;
 touch();
 return {wall:r.wall,opens:r.opens,d:D};
}
/* ═══ الفتحات عند تقصير الجدار ═══
   لا زحف أبداً: ما يقع في المقطوع يُحذَف، وما يبقى لا يُمَسّ.
   ولا نقلّم موضع الباقي ولو صار خارج المدى — العلامة الحمراء
   تخبرك، وأنت تقرّر. */
function dropOpensIn(id,lo,hi){
 const kill=opensOf(id).filter(o=>{
  const [a,b]=span(o);
  return a<hi-1&&lo<b-1;
 });
 kill.forEach(o=>delOpen(o));
 return kill.length;
}
function shiftOpensTo(id,newId2,lo,hi,ds){
 let n=0;
 opensOf(id).forEach(o=>{
  const [a,b]=span(o);
  if(a<lo-1||b>hi+1)return;
  o.wall=newId2;
  o.s=R(o.s-ds);
  n++;
 });
 return n;
}
/* ═══ القطع عند نقطة ═══ */
export function breakWall(id,p){
 const w=wallById(id);
 if(!w)throw new Error("الجدار غير موجود");
 const u=dir(w);
 if(!u)throw new Error("الجدار صفري");
 const s=R((p[0]-w.a[0])*u.ux+(p[1]-w.a[1])*u.uy);
 if(s<MINW||s>u.L-MINW)
  throw new Error(`نقطة القطع على ${m2(s)} م — يجب أن تبعد `
   +`${m2(MINW)} م عن الطرفين على الأقل`);
 /* الفتحة التي تعبر نقطة القطع تُحذَف: لا تنتمي إلى أحدهما */
 const lost=dropOpensIn(id,s,s);
 const n=Object.assign({},w,{id:newId("W"),
  a:[R(w.a[0]+u.ux*s),R(w.a[1]+u.uy*s)], b:w.b.slice()});
 S.walls.push(n);
 const moved=shiftOpensTo(id,n.id,s,u.L,s);
 w.b=n.a.slice();
 touch();
 return {nw:n,a:s,b:u.L-s,lost,moved};
}
/* ═══ القصّ ═══ الحدّ صريح دائماً — لا «كل الجدران» ضمنياً ═══ */
export function trimWall(id,cuts,p){
 const w=wallById(id);
 if(!w)throw new Error("الجدار غير موجود");
 const u=dir(w);
 if(!u)throw new Error("الجدار صفري");
 const T=[];
 (cuts||[]).forEach(c=>{
  const o=wallById(c);
  if(!o||o.id===id)return;
  const x=lineX(w.a,w.b,o.a,o.b);
  if(!x)return;
  /* التقاطع يجب أن يقع على جسم الحدّ نفسه لا على امتداده */
  if(nearOnSeg(o.a,o.b,x[0],x[1]).d>2)return;
  const s=R((x[0]-w.a[0])*u.ux+(x[1]-w.a[1])*u.uy);
  if(s>2&&s<u.L-2)T.push(s);
 });
 if(!T.length)
  throw new Error("لا حدّ من المحدَّدة يعبر هذا الجدار");
 T.sort((a,b)=>a-b);
 const sp=clamp((p[0]-w.a[0])*u.ux+(p[1]-w.a[1])*u.uy,0,u.L);
 let lo=null, hi=null;
 T.forEach(v=>{
  if(v<=sp&&(lo==null||v>lo))lo=v;
  if(v>=sp&&(hi==null||v<hi))hi=v;
 });
 const gl=(lo!=null), gh=(hi!=null);
 if(!gl&&!gh)throw new Error("انقر على جزء بين حدَّين أو خارجهما");
 if(gl&&gh){
  if(hi-lo<20)throw new Error("الجزء المحدَّد أرقّ من 2 سم");
  const lost=dropOpensIn(id,lo,hi);
  const n=Object.assign({},w,{id:newId("W"),
   a:[R(w.a[0]+u.ux*hi),R(w.a[1]+u.uy*hi)], b:w.b.slice()});
  S.walls.push(n);
  const moved=shiftOpensTo(id,n.id,hi,u.L,hi);
  w.b=[R(w.a[0]+u.ux*lo),R(w.a[1]+u.uy*lo)];
  touch();
  return {mode:"mid",cut:hi-lo,nw:n,lost,moved};
 }
 if(!gl){
  const lost=dropOpensIn(id,0,hi);
  let moved=0;
  opensOf(id).forEach(o=>{o.s=R(o.s-hi); moved++});
  w.a=[R(w.a[0]+u.ux*hi),R(w.a[1]+u.uy*hi)];
  touch();
  return {mode:"start",cut:hi,lost,moved};
 }
 const lost=dropOpensIn(id,lo,u.L);
 w.b=[R(w.a[0]+u.ux*lo),R(w.a[1]+u.uy*lo)];
 touch();
 return {mode:"end",cut:u.L-lo,lost,moved:0};
}
/* ═══ التمديد ═══ */
export function extendWall(id,bnds,p){
 const w=wallById(id);
 if(!w)throw new Error("الجدار غير موجود");
 const u=dir(w);
 if(!u)throw new Error("الجدار صفري");
 const atEnd=((p[0]-w.a[0])*u.ux+(p[1]-w.a[1])*u.uy)>u.L/2;
 let best=null;
 (bnds||[]).forEach(c=>{
  const o=wallById(c);
  if(!o||o.id===id)return;
  const x=lineX(w.a,w.b,o.a,o.b);
  if(!x)return;
  if(nearOnSeg(o.a,o.b,x[0],x[1]).d>2)return;
  const s=(x[0]-w.a[0])*u.ux+(x[1]-w.a[1])*u.uy;
  if(atEnd){if(s>u.L+10&&(best==null||s<best))best=s}
  else{if(s<-10&&(best==null||s>best))best=s}
 });
 if(best==null)
  throw new Error("لا حدّ من المحدَّدة في هذا الاتجاه");
 if(atEnd){
  w.b=[R(w.a[0]+u.ux*best),R(w.a[1]+u.uy*best)];
  touch();
  return {mode:"end",add:best-u.L};
 }
 const add=-best;
 w.a=[R(w.a[0]+u.ux*best),R(w.a[1]+u.uy*best)];
 /* الفتحات تُقاس من البداية، فتُزاح بمقدار التمديد */
 opensOf(id).forEach(o=>{o.s=R(o.s+add)});
 touch();
 return {mode:"start",add};
}
/* ═══ الشدّ بإطار ═══
   الأطراف داخل الإطار تتحرّك وحدها. الفتحات لا تُمَسّ: ما خرج
   عن المدى يظهر معطوباً وأنت تقرّر. */
export function stretchGrab(r){
 const G=[];
 const inR=p=>p[0]>=r.x0&&p[0]<=r.x1&&p[1]>=r.y0&&p[1]<=r.y1;
 S.walls.forEach(w=>{
  if(!pickable({k:"wall",id:w.id}))return;
  const a=inR(w.a), b=inR(w.b);
  if(a||b)G.push({e:w,a,b,o:{a:w.a.slice(),b:w.b.slice()}});
 });
 return G;
}
export function stretchApply(G,dx,dy){
 (G||[]).forEach(g=>{
  if(g.a)g.e.a=[g.o.a[0]+dx,g.o.a[1]+dy];
  if(g.b)g.e.b=[g.o.b[0]+dx,g.o.b[1]+dy];
 });
 touch();
 return (G||[]).length;
}
export const stretchPrev=(G,dx,dy)=>(G||[]).map(g=>[
 g.a?[g.o.a[0]+dx,g.o.a[1]+dy]:g.o.a,
 g.b?[g.o.b[0]+dx,g.o.b[1]+dy]:g.o.b]);

/* ═══ اللحم — يخطّط ثم يُنفَّذ بعد التأكيد ═══
   weldPlan يعيد قائمة كل طرف سيتحرّك ومقدار حركته، فتراها قبل
   الموافقة. weldApply لا يفعل إلّا ما في الخطة.

   node  طرفان حرّان متقاربان ⇒ يلتقيان في نقطة واحدة
   axis  طرف قريب من محور جدار محدَّد ⇒ يُسقَط على تقاطع المحورين
   tee   طرف قريب من جسم جدار ⇒ يُسقَط عمودياً على مساره       */
export function weldPlan(ids,tol){
 const T=clamp(tol||30,1,2000);
 const W=(ids||[]).map(id=>wallById(id)).filter(Boolean);
 const ends=[];
 W.forEach(w=>{
  ends.push({w,k:"a",p:w.a.slice()});
  ends.push({w,k:"b",p:w.b.slice()});
 });
 const shared=e=>ends.some(x=>x!==e&&x.w!==e.w&&dist(x.p,e.p)<=1);
 const moves=[], done=new Set();
 const key=e=>e.w.id+"/"+e.k;

 /* ١ — أزواج الأطراف المتقاربة: نقطة واحدة في المنتصف */
 for(let i=0;i<ends.length;i++){
  const e=ends[i];
  if(done.has(key(e))||shared(e))continue;
  let best=null,bd=T;
  for(let j=0;j<ends.length;j++){
   const f=ends[j];
   if(f===e||f.w===e.w||done.has(key(f))||shared(f))continue;
   const d=dist(e.p,f.p);
   if(d>0.5&&d<=bd){bd=d;best=f}
  }
  if(!best)continue;
  const m=[R((e.p[0]+best.p[0])/2), R((e.p[1]+best.p[1])/2)];
  [e,best].forEach(x=>{
   const d=dist(x.p,m);
   if(d>0.5)moves.push({id:x.w.id,end:x.k,from:x.p.slice(),
    to:m.slice(),d:R(d),why:"node"});
   done.add(key(x));
  });
 }
 /* ٢ — الطرف على محور جدار محدَّد: تقاطع المحورين */
 ends.forEach(e=>{
  if(done.has(key(e))||shared(e))return;
  let best=null,bd=T;
  W.forEach(o=>{
   if(o===e.w)return;
   const r=nearOnSeg(o.a,o.b,e.p[0],e.p[1]);
   if(r.d>bd||r.d<=0.5)return;
   if(r.t<=0.002||r.t>=0.998)return;
   const x=lineX(e.w.a,e.w.b,o.a,o.b);
   const q=x||r.p;
   const d=dist(e.p,q);
   if(d<=T&&d>0.5&&d<bd){bd=d;best={q,why:"axis"}}
   else if(r.d<bd){bd=r.d;best={q:r.p,why:"tee"}}
  });
  if(!best)return;
  moves.push({id:e.w.id,end:e.k,from:e.p.slice(),
   to:P2(best.q),d:R(dist(e.p,best.q)),why:best.why});
  done.add(key(e));
 });
 return {moves,tol:T};
}
export function weldApply(plan){
 let n=0;
 ((plan&&plan.moves)||[]).forEach(m=>{
  const w=wallById(m.id);
  if(!w)return;
  /* الأمان: لا نُطبّق إلّا إن كان الطرف ما زال حيث خُطِّط له */
  const cur=(m.end==="a")?w.a:w.b;
  if(dist(cur,m.from)>1)return;
  if(m.end==="a")w.a=m.to.slice(); else w.b=m.to.slice();
  n++;
 });
 /* الجدار الذي صار أقصر من الحدّ الأدنى يُبلَّغ ولا يُحذَف */
 const short=S.walls.filter(w=>wallLen(w)<MINW).map(w=>w.id);
 touch();
 return {moved:n,short};
}
export const WHY={node:"طرفان يلتقيان",axis:"إسقاط على محور",
 tee:"إسقاط على جسم"};

/* ═══ المصفوفة المستطيلة ═══
   ما يقبله copy بحرفه: كلُّ نوعٍ يقبله dupEnt. والفتحةُ ليست منه
   (noDup) — تُنسَخ مع جدارها لا وحدها، فتتبعه مجّاناً.
   والأصلُ خليّةٌ في الشبكة لا نسخةٌ زائدة عليها. */
export function arrayRect(G,nx,ny,dx,dy,withOpens){
 const NX=clamp(R(nx||1),1,100), NY=clamp(R(ny||1),1,100);
 const cop=NX*NY-1;
 if(cop<1)
  throw new Error("صفٌّ واحدٌ وعمودٌ واحد — لا نسخةَ تُنشَأ");
 /* تباعدٌ صفرٌ على محورٍ فيه أكثر من خليّة ⇒ نسخٌ متراكبةٌ صامتة */
 if(NX>1&&!dx)
  throw new Error(`تباعد X صفرٌ مع ${NX} أعمدة — النسخُ تتراكب`);
 if(NY>1&&!dy)
  throw new Error(`تباعد Y صفرٌ مع ${NY} صفوف — النسخُ تتراكب`);
 const src=(G||[]);
 if(src.length*cop>500)
  throw new Error(`${src.length*cop} نسخة — الحدّ 500`);
 let nw=0, no=0;
 const made=[];
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
  if(!i&&!j)continue;                /* موضعُ الأصل */
  src.forEach(({s,o})=>{
   const q=copyOne(s,o,withOpens,(ns,g)=>moveEnt(ns,g,dx*i,dy*j));
   if(!q)return;
   nw++; no+=q.opens; made.push(q.ns);
  });
 }
 touch();
 return {walls:nw,opens:no,made,cells:cop,nx:NX,ny:NY};
}
/* نقطةٌ مرجعيةٌ للكيان — مركزُ صندوقه. تخدم التوزيعَ بلا دوران:
   الموضعُ يدور والهيئةُ تبقى، وهو ما يُطلَب لعمودٍ حول قوس. */
function anchorOf(s){
 const bx=r=>{
  const b=bboxOf(r||[]);
  return b?[R((b.x0+b.x1)/2),R((b.y0+b.y1)/2)]:null;
 };
 const o=outlineOf(s);
 if(o&&o.length){
  const p=bx(o);
  if(p)return p;
 }
 const sh=shapeOf(s);
 if(!sh)return null;
 if(sh.t==="pt")return sh.p.slice();
 if(sh.t==="seg")return mid(sh.a,sh.b).map(R);
 return bx(sh.pts);
}
/* ═══ المصفوفة القطبية ═══
   الدورانُ يمرّ بـrotateAll فينال قاعدتَها: ما لا يدور بهذه الزاوية
   يُرفَض ويُسمّى. والترشيحُ على الخطوة قبل النسخ لا مع كل تكرار —
   مصفوفةٌ ناقصةٌ أسوأُ من مصفوفةٍ مرفوضة، ونسخةٌ مرفوضةٌ تبقى في
   موضع الأصل أسوأُ منهما.

   والخطوةُ مُشتقّةٌ ومُعلَنة: دورةٌ كاملةٌ تُقسَم على العدد فلا
   تتراكب الأخيرةُ على الأصل، وما دونها يمتدّ من الأصل إلى آخر
   نسخةٍ فيبلغ الزاويةَ المطلوبة بالضبط. */
export function arrayPolar(G,c,total,n,rot,withOpens){
 const N=clamp(R(n||2),2,200);
 const T=+total||0;
 if(Math.abs(T)<0.01)
  throw new Error("الزاوية الإجمالية صفر — لا توزيعَ يقع");
 const full=Math.abs(Math.abs(T)-360)<0.05;
 const stepA=T/(full?N:(N-1));
 const cop=N-1;
 const src=[], ref=[];
 (G||[]).forEach(g=>{
  if(rot&&!canRotate(g.s,stepA)){
   ref.push(`${g.s.id} ${NAME[g.s.k]||g.s.k}`);
   return;
  }
  src.push(g);
 });
 if(!src.length)
  throw new Error(`لا عنصرَ يقبل التوزيعَ بخطوة `
   +`${stepA.toFixed(1)}° — البُعدُ الأفقيُّ والرأسيُّ والسلسلةُ `
   +`لا تدور إلّا بمضاعفات 90°`);
 if(src.length*cop>500)
  throw new Error(`${src.length*cop} نسخة — الحدّ 500`);
 let nw=0, no=0;
 const made=[];
 for(let k=1;k<=cop;k++){
  const a=stepA*k;
  if(rot){
   const r=rotateAll(src,c,a,1,withOpens);
   nw+=r.walls; no+=r.opens;
   (r.made||[]).forEach(x=>made.push(x));
   continue;
  }
  src.forEach(({s,o})=>{
   const an=anchorOf(s);
   const q=copyOne(s,o,withOpens,(ns,g)=>{
    if(!an)return;
    const p=rotP(an,c,a);
    moveEnt(ns,g,p[0]-an[0],p[1]-an[1]);
   });
   if(!q)return;
   nw++; no+=q.opens; made.push(q.ns);
  });
 }
 touch();
 return {walls:nw,opens:no,made,refused:ref,
  step:Math.round(stepA*100)/100, n:N, full};
}

/* ═══ كسرُ الركن ═══ يخطّط ثم يُنفَّذ بعد التأكيد ═══
   ولِمَ ضلعٌ مستقيمٌ لا قوس؟ الجدارُ في هذا المشروع نقطتان
   وسماكة — لا انحناءَ في بياناته. فقوسٌ يُطلى ولا يُبنى يجعل
   المساحةَ تُحسَب على ركنٍ حادٍّ وتُرى مدوّرةً، وهو نقضُ عقد
   «ما تراه هو ما يُصدَّر». وتقريبُه أضلاعاً يُنتِج عشراتَ جدرانٍ
   دون MINW، كلُّ واحدٍ منها معرّفٌ في الفهرس وتحذيرٌ في الفاحص.

   والجهةُ المُبقاةُ من نقرتك: عند تقاطعٍ في الوسط أربعةُ أركان،
   والنقرةُ تحسم أيَّها — كما في القصّ. والمقاسُ يُقاس من الركن
   لا من الطرف، فحدُّ الرفض مقدارُ ما يبقى فعلاً.

   d1 للأول وd2 للثاني — والخطّةُ تُعرَض بالمليمتر قبل التنفيذ،
   والتنفيذُ لا يتجاوزها. */
export function chamferPlan(id1,id2,d1,d2,p1,p2){
 const w1=wallById(id1), w2=wallById(id2);
 if(!w1||!w2)throw new Error("الجدار غير موجود");
 if(w1===w2)throw new Error("الجداران واحدٌ — انقر جدارين مختلفين");
 const u1=dir(w1), u2=dir(w2);
 if(!u1||!u2)throw new Error("جدارٌ صفريُّ الطول");
 const X=lineX(w1.a,w1.b,w2.a,w2.b);
 if(!X)throw new Error(`${id1} و ${id2} متوازيان — لا ركنَ بينهما`);
 const D1=Math.max(1,R(d1||0)), D2=Math.max(1,R(d2||d1||0));
 const side=(w,u,d,p)=>{
  const s =(X[0]-w.a[0])*u.ux+(X[1]-w.a[1])*u.uy;
  const sc=(p[0]-w.a[0])*u.ux+(p[1]-w.a[1])*u.uy;
  const keepB=sc>s;                 /* النقرةُ بعد الركن ⇒ يُبقى ما بعده */
  const sg=keepB?1:-1;              /* من الركن إلى ما يُبقى */
  return {id:w.id, d, L:R(u.L),
   end:keepB?"a":"b",
   from:(keepB?w.a:w.b).slice(),
   to:[R(X[0]+u.ux*sg*d), R(X[1]+u.uy*sg*d)],
   cut:R(s+sg*d),                   /* المعاملُ الجديد للطرف المتحرّك */
   remain:keepB?(u.L-s-d):(s-d),
   grow:keepB?Math.max(0,-s):Math.max(0,s-u.L),
   dirIn:[u.ux*sg,u.uy*sg]};
 };
 const A=side(w1,u1,D1,p1||mid(w1.a,w1.b));
 const B=side(w2,u2,D2,p2||mid(w2.a,w2.b));
 const cs=A.dirIn[0]*B.dirIn[0]+A.dirIn[1]*B.dirIn[1];
 const ang=Math.acos(clamp(cs,-1,1))*R2D;
 if(ang<5||ang>175)
  throw new Error(`الجداران يلتقيان بزاوية ${ang.toFixed(1)}° — `
   +`لا ركنَ يُكسَر`);
 [A,B].forEach(x=>{
  if(x.remain<MINW)
   throw new Error(`${x.id}: يبقى منه ${m3(x.remain)} م بعد `
    +`الكسر — الأدنى ${m3(MINW)} م. صغّر المسافة، أو انقره في `
    +`الجهة التي تريد إبقاءها`);
 });
 const len=dist(A.to,B.to);
 if(len<MINW)
  throw new Error(`ضلعُ الكسر ${m3(len)} م — الأدنى ${m3(MINW)} م`);
 return {a:A,b:B,X:P2(X),len:R(len),
  ang:Math.round(ang*10)/10, t:w1.t, type:w1.type};
}
export function chamferApply(plan){
 const P=plan||{}, A=P.a, B=P.b;
 if(!A||!B)throw new Error("لا خطّةَ كسر");
 const W1=wallById(A.id), W2=wallById(B.id);
 if(!W1||!W2)throw new Error("الجدارُ لم يبقَ — أعِد الأداة");
 /* الأمان: لا يُنفَّذ إلّا إن كان الطرفان حيث خُطِّط لهما —
    والفحصُ قبل أيِّ كتابة، فلا حالةَ نصفَ مكسورة. */
 [[W1,A],[W2,B]].forEach(([w,x])=>{
  if(dist((x.end==="a")?w.a:w.b,x.from)>1)
   throw new Error(`${x.id} تحرّك بعد التخطيط — أعِد الأداة`);
 });
 let lost=0;
 [[W1,A],[W2,B]].forEach(([w,x])=>{
  if(x.end==="a"){
   /* البدايةُ تتحرّك: ما قبلها يُطرَح، والباقي يُقاس من موضعها
      الجديد — عقدُ trimWall نفسه. */
   lost+=dropOpensIn(w.id,0,x.cut);
   opensOf(w.id).forEach(o=>{o.s=R(o.s-x.cut)});
   w.a=x.to.slice();
  }else{
   lost+=dropOpensIn(w.id,x.cut,x.L);
   w.b=x.to.slice();
  }
 });
 const nw=addWall(A.to,B.to,P.t,P.type,"c");
 touch();
 return {wall:nw,lost,len:P.len};
}
