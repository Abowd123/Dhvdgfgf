/* ═══ سجلّ الأنواع ═══
   جدولٌ بدل ثماني سلاسل من الشروط. قبله كانت إضافة نوعٍ تعني
   تعديل ents.js في ثمانية مواضع و layers.js في موضعين
   و modify.js في موضع — وأيُّ موضعٍ يُنسى يعطب صامتاً: كيانٌ
   يُرسَم ولا يُحدَّد، أو يُحدَّد ولا يُحذَف.
   بعده: نوعٌ واحد = سطرٌ واحد هنا.

   وهو جدولٌ خالص لا يعرف الطبقات ولا حالتها: التصفية سياسةٌ
   تسكن ents.js، فلا دورةَ استيراد مع layers.js — بل layers.js
   يقرأ منه lay(e) فيسقط عنه معرفة الأنواع كلّها.

   الترتيبان مقصودان:
     hitO  ترتيب الإصابة — الأصغر أوّلاً فلا يحجب الجدارُ فتحته.
     pick  ترتيب العدّ والتقرير — يخدم pickInRect و allEnts
           و delSay و groupOrder، فلا أربع قوائم تتفرّق. */
import {S} from "./state.js";
import {clamp,deg} from "./units.js";
import {pip,nearOnSeg,bboxOf} from "./geom.js";
import {dir,band,wallById,wallLen,wallAt,delWall,
        isLow} from "./walls.js";
import {opensOf,openById,openPt,span,sAt,delOpen,nearestFree,okOf,
        MINW,EDGE} from "./opens.js";
import {areaById,areaAt,delArea,labelPt} from "./areas.js";
import {dimById,chainById,annoById,dimGeom,dimMid,chainPt,
        chainBounds,annoPt,delDim,delChain,delAnno,
        posFromPt} from "./dims.js";
import {colById,colPoly,colW,delCol} from "./cols.js";
import {fixById,fixPoly,fixW,fixD,frameOf,delFix} from "./fixt.js";
import {stById,stPoly,stGeom,delStair,SMIN_W} from "./stairs.js";

const R=v=>Math.round(v);
export const ENT={};
export function defEnt(d){ENT[d.k]=d; return d}

/* ═══ الجدار ═══ */
defEnt({k:"wall",coll:"walls",n:"جدار",pre:"W",pick:1,hitO:7,
 /* bump: أيَّ نسخةٍ يُقدّم تعديلُه — geom يُبطِل الاتحاد والحلقات
    وشبكة الأطراف والمراسي والبصمات · open الأجسام وحدها ·
    view لا شيء منها. والمجهول يُعَدّ geom: الافتراض آمن. */
 bump:"geom",
 byId:wallById,
 lay:w=>isLow(w)?"A-WALL-LOW":"A-WALL",
 /* wallAt يفضّل الأقرب إلى المحور ولا يقبل مرشِّحاً — فإن كان
    الأفضل مخفيّاً أو مقفلاً يُتخطّى النوع كلّه، كما كان */
 hit:(x,y,T,tol,ok,cand)=>wallAt(x,y,tol,cand),
 shape:w=>({t:"seg",a:w.a,b:w.b}),
 outline:w=>band(w),
 grips:w=>[{p:w.a.slice(),k:"a"},
  {p:[R((w.a[0]+w.b[0])/2),R((w.a[1]+w.b[1])/2)],k:"mid"},
  {p:w.b.slice(),k:"b"}],
 grab:w=>({e:w,a:w.a.slice(),b:w.b.slice()}),
 drag(o,g,p,dx,dy){
  const w=o.e;
  if(g.k==="a")w.a=[p[0],p[1]];
  else if(g.k==="b")w.b=[p[0],p[1]];
  else{w.a=[o.a[0]+dx,o.a[1]+dy]; w.b=[o.b[0]+dx,o.b[1]+dy]}
 },
 move(o,dx,dy){
  o.e.a=[o.a[0]+dx,o.a[1]+dy];
  o.e.b=[o.b[0]+dx,o.b[1]+dy];
 },
 del:delWall,
 /* حذف الجدار يحذف فتحاته: الحاضن زال فلا معنى لبقائها،
    ويُبلَّغ العدد لأنه فقدٌ لم تطلبه صراحة */
 cascade(ids){
  const kill=S.opens.filter(o=>ids.has(o.wall));
  S.opens=S.opens.filter(o=>!ids.has(o.wall));
  return {opens:kill.length};
 }});

/* ═══ الفتحة ═══ */
defEnt({k:"open",coll:"opens",n:"فتحة",pre:"O",pick:2,hitO:6,
 bump:"open",
 byId:openById,
 lay:o=>okOf(o.kind).lay,
 /* منطقة الإصابة تختلف عن الشكل: openPt يُزيح بالمحاذاة، ونصفُ
    العرض يدخل في نصف قطر الإصابة — فتُعلَن للفهرس صريحاً */
 hbox(o){
  const w=wallById(o.wall);
  if(!w)return null;
  const [a,b]=span(o);
  const B=bboxOf([openPt(w,a),openPt(w,b),openPt(w,o.s)]);
  if(!B)return null;
  const r=o.w/2;
  return {x0:B.x0-r,y0:B.y0-r,x1:B.x1+r,y1:B.y1+r};
 },
 hit(x,y,T,tol,ok,cand){
  for(const o of (cand||S.opens)){
   if(!ok(o.id))continue;
   const w=wallById(o.wall);
   if(!w)continue;
   const c=openPt(w,o.s);
   if(Math.hypot(x-c[0],y-c[1])<Math.max(o.w/2,T))return o;
  }
  return null;
 },
 shape(o){
  const w=wallById(o.wall);
  if(!w)return null;
  const d=dir(w);
  if(!d)return null;
  const [a,b]=span(o);
  return {t:"seg",
   a:[R(w.a[0]+d.ux*a),R(w.a[1]+d.uy*a)],
   b:[R(w.a[0]+d.ux*b),R(w.a[1]+d.uy*b)]};
 },
 grips(o){
  const w=wallById(o.wall);
  if(!w)return [];
  const [a,b]=span(o);
  return [{p:openPt(w,o.s),k:"c"},
          {p:openPt(w,a),k:"e0"},
          {p:openPt(w,b),k:"e1"}];
 },
 grab:o=>({e:o,s:o.s,w:o.w}),
 drag(o,g,p){
  const op=o.e, w=wallById(op.wall);
  if(!w)return;
  const s=sAt(w,p), L=wallLen(w);
  if(g.k==="c"){
   /* الفترات الحرّة لا الغلاف: السحب لا يعبر فتحةً قائمة.
      يتوقّف عند الحدّ ولا يرفض — التوقّف مرئيٌّ فلا مفاجأة فيه.
      وكان القصّ على [lo,hi] يُنشئ clash في أشهر تفاعلٍ في
      البرنامج، بينما مقبض الحدّ والمُثبِّت وaddOpen يرفضونه. */
   const q=nearestFree(w,op.w,s,op);
   if(q!=null)op.s=q;
   return;
  }
  /* حدّ الفتحة: يغيّر العرض والمركز معاً والطرف الآخر ثابت */
  const fix=(g.k==="e0")?(o.s+o.w/2):(o.s-o.w/2);
  let lo=Math.min(fix,s), hi=Math.max(fix,s);
  lo=Math.max(lo,EDGE); hi=Math.min(hi,L-EDGE);
  if(hi-lo<MINW)return;
  const nw=R(hi-lo), ns=R((lo+hi)/2);
  for(const x of opensOf(w.id)){
   if(x===op)continue;
   const [a,b]=span(x);
   if(ns-nw/2<b-1&&a<ns+nw/2-1)return;
  }
  op.w=nw; op.s=ns;
 },
 move(o,dx,dy){
  /* الفتحة تنزلق على جدارها — الإزاحة تُسقَط على مساره، ثم
     تُقصَر على الفترة الحرّة لا على الغلاف */
  const w=wallById(o.e.wall);
  if(!w)return;
  const d=dir(w);
  if(!d)return;
  const q=nearestFree(w,o.e.w,R(o.s+dx*d.ux+dy*d.uy),o.e);
  if(q!=null)o.e.s=q;
 },
 del:delOpen,
 noDup:1});          /* تُنسَخ مع جدارها لا وحدها */

/* ═══ المنطقة ═══ */
defEnt({k:"area",coll:"areas",n:"منطقة",pre:"A",pick:6,hitO:9,
 bump:"view",
 byId:areaById,
 lay:()=>"A-AREA",
 hit:(x,y,T,tol,ok,cand)=>areaAt(x,y,cand),
 shape:a=>({t:"poly",pts:a.ring}),
 outline:a=>a.ring,
 grips(a){
  const g=[{p:labelPt(a),k:"L"}];
  if(a.ring.length<=40)
   a.ring.forEach((p,i)=>g.push({p:p.slice(),k:"v"+i}));
  return g;
 },
 grab:a=>({e:a,ring:a.ring.map(p=>p.slice()),
  lp:a.lp?a.lp.slice():null, lc:labelPt(a)}),
 drag(o,g,p){
  const a=o.e;
  /* سحب التسمية يجعل موضعها صريحاً، فلا تزحف بعدها أبداً */
  if(g.k==="L"){a.lp=[p[0],p[1]]; return}
  const i=parseInt(g.k.slice(1),10);
  if(!(i>=0&&i<a.ring.length))return;
  a.ring[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  o.e.ring=o.ring.map(p=>[p[0]+dx,p[1]+dy]);
  if(o.lp)o.e.lp=[o.lp[0]+dx,o.lp[1]+dy];
 },
 del:delArea});

/* ═══ البُعد ═══ */
defEnt({k:"dim",coll:"dims",n:"بُعد",pre:"D",pick:7,hitO:4,
 bump:"view",
 byId:dimById,
 lay:()=>"A-DIMS",
 hit(x,y,T,tol,ok,cand){
  for(const d of (cand||S.dims)){
   if(!ok(d.id))continue;
   const g=dimGeom(d);
   if(g&&nearOnSeg(g.p1,g.p2,x,y).d<T)return d;
  }
  return null;
 },
 shape(d){
  const g=dimGeom(d);
  return g?{t:"seg",a:g.p1,b:g.p2}:null;
 },
 grips:d=>[{p:d.a.slice(),k:"a"},{p:d.b.slice(),k:"b"},
  {p:dimMid(d),k:"pos"}],
 grab:d=>({e:d,kind:d.kind,a:d.a.slice(),b:d.b.slice(),pos:d.pos}),
 drag(o,g,p){
  const d=o.e;
  if(g.k==="a")d.a=[p[0],p[1]];
  else if(g.k==="b")d.b=[p[0],p[1]];
  else d.pos=posFromPt(d.kind,d.a,d.b,p);
 },
 move(o,dx,dy){
  o.e.a=[o.a[0]+dx,o.a[1]+dy];
  o.e.b=[o.b[0]+dx,o.b[1]+dy];
  o.e.pos=(o.e.kind==="h")?(o.pos+dy)
   :((o.e.kind==="v")?(o.pos+dx):o.pos);
 },
 del:delDim});

/* ═══ السلسلة ═══ */
defEnt({k:"chain",coll:"chains",n:"سلسلة",pre:"C",pick:8,hitO:5,
 bump:"view",
 byId:chainById,
 lay:()=>"A-DIMS",
 hit(x,y,T,tol,ok,cand){
  for(const c of (cand||S.chains)){
   if(!ok(c.id))continue;
   const B=chainBounds(c);
   if(B.length<2)continue;
   if(nearOnSeg(chainPt(c,B[0]),chainPt(c,B[B.length-1]),x,y).d<T)
    return c;
  }
  return null;
 },
 shape(c){
  const B=chainBounds(c);
  return {t:"seg",a:chainPt(c,B[0]),b:chainPt(c,B[B.length-1])};
 },
 grips(c){
  const B=chainBounds(c);
  return [{p:chainPt(c,B[0]),k:"base"},
          {p:chainPt(c,B[B.length-1]),k:"end"}];
 },
 grab:c=>({e:c,axis:c.axis,base:c.base.slice(),pos:c.pos}),
 drag(o,g,p,dx,dy){
  /* الطرفان يحرّكان السلسلة كاملةً: القيَم مكتوبة ولا تُشَدّ */
  const c=o.e;
  c.base=[o.base[0]+dx,o.base[1]+dy];
  c.pos=(c.axis==="h")?p[1]:p[0];
 },
 move(o,dx,dy){
  o.e.base=[o.base[0]+dx,o.base[1]+dy];
  o.e.pos=(o.e.axis==="h")?(o.pos+dy):(o.pos+dx);
 },
 del:delChain});

/* ═══ التأشير ═══ */
defEnt({k:"anno",coll:"anno",n:"تأشير",pre:"T",pick:9,hitO:3,
 bump:"view",
 byId:annoById,
 lay:()=>"A-ANNO",
 /* القائد يُصاب على كل قطعةٍ من مساره، لا على وترِ طرفيه */
 hbox:a=>(a.kind==="lead")?bboxOf(a.pts):null,
 hit(x,y,T,tol,ok,cand){
  for(const a of (cand||S.anno)){
   if(!ok(a.id))continue;
   const p=annoPt(a);
   if(Math.hypot(x-p[0],y-p[1])<T*1.2)return a;
   if(a.kind==="lead"){
    for(let i=0;i<a.pts.length-1;i++)
     if(nearOnSeg(a.pts[i],a.pts[i+1],x,y).d<T)return a;
   }
  }
  return null;
 },
 shape(a){
  if(a.kind==="lead")
   return {t:"seg",a:a.pts[0],b:a.pts[a.pts.length-1]};
  return {t:"pt",p:[a.x,a.y]};
 },
 grips(a){
  if(a.kind!=="lead")return [{p:[a.x,a.y],k:"p"}];
  return a.pts.map((p,i)=>({p:p.slice(),k:"p"+i}));
 },
 grab:a=>({e:a,x:a.x,y:a.y,
  pts:a.pts?a.pts.map(p=>p.slice()):null}),
 drag(o,g,p){
  const a=o.e;
  if(a.kind!=="lead"){a.x=p[0]; a.y=p[1]; return}
  const i=parseInt(g.k.slice(1),10);
  if(i>=0&&i<a.pts.length)a.pts[i]=[p[0],p[1]];
 },
 move(o,dx,dy){
  if(o.pts)o.e.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);
  else{o.e.x=o.x+dx; o.e.y=o.y+dy}
 },
 del:delAnno});

/* ═══ العمود ═══ */
defEnt({k:"col",coll:"cols",n:"عمود",pre:"K",pick:3,hitO:2,
 bump:"geom",
 byId:colById,
 lay:()=>"A-COLS",
 hit(x,y,T,tol,ok,cand){
  for(const c of (cand||S.cols)){
   if(!ok(c.id))continue;
   const p=colPoly(c);
   if(p&&pip(p,x,y))return c;
  }
  return null;
 },
 shape:c=>({t:"poly",pts:colPoly(c)}),
 outline:c=>colPoly(c),
 grips(c){
  const g=[{p:[c.x,c.y],k:"c"}];
  if(c.kind==="circ")g.push({p:[R(c.x+colW(c)/2),c.y],k:"r"});
  else{
   const p=colPoly(c);
   g.push({p:p[2].slice(),k:"sz"});
   g.push({p:[R((p[1][0]+p[2][0])/2),R((p[1][1]+p[2][1])/2)],
    k:"rot"});
  }
  return g;
 },
 grab:c=>({e:c,x:c.x,y:c.y,w:c.w,h:c.h,rot:c.rot}),
 drag(o,g,p){
  const c=o.e;
  if(g.k==="c"){c.x=p[0]; c.y=p[1]; return}
  if(g.k==="r"){
   c.w=clamp(R(Math.hypot(p[0]-c.x,p[1]-c.y)*2),100,4000);
   c.h=c.w; return;
  }
  if(g.k==="rot"){
   c.rot=deg(Math.round(
    Math.atan2(p[1]-c.y,p[0]-c.x)*180/Math.PI*10)/10);
   return;
  }
  /* المقاس من الرُّكن: يُقاس في الإطار المحلّي فلا يتأثّر بالدوران */
  const a=(c.rot||0)*Math.PI/180;
  const dxl=(p[0]-c.x)*Math.cos(a)+(p[1]-c.y)*Math.sin(a);
  const dyl=-(p[0]-c.x)*Math.sin(a)+(p[1]-c.y)*Math.cos(a);
  c.w=clamp(R(Math.abs(dxl)*2),100,4000);
  c.h=clamp(R(Math.abs(dyl)*2),100,4000);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del:delCol,
 dupDrop:["tag"]});   /* الوسم لا يُنسَخ — يُرقَّم */

/* ═══ الأداة الصحية ═══ */
defEnt({k:"fix",coll:"fixt",n:"أداة",pre:"F",pick:4,hitO:1,
 bump:"view",
 byId:fixById,
 lay:()=>"A-FIXT",
 hit(x,y,T,tol,ok,cand){
  for(const f of (cand||S.fixt)){
   if(!ok(f.id))continue;
   if(pip(fixPoly(f),x,y))return f;
  }
  return null;
 },
 shape:f=>({t:"poly",pts:fixPoly(f)}),
 outline:f=>fixPoly(f),
 grips(f){
  const P=frameOf(f);
  return [{p:[f.x,f.y],k:"c"},
          {p:P(0,fixD(f)),k:"rot"},
          {p:P(fixW(f)/2,fixD(f)),k:"sz"}];
 },
 grab:f=>({e:f,x:f.x,y:f.y,w:f.w,d:f.d,rot:f.rot}),
 drag(o,g,p){
  const f=o.e;
  if(g.k==="c"){f.x=p[0]; f.y=p[1]; return}
  if(g.k==="rot"){
   f.rot=deg(Math.round(
    (Math.atan2(p[1]-f.y,p[0]-f.x)*180/Math.PI-90)*10)/10);
   return;
  }
  const a=(f.rot||0)*Math.PI/180;
  const u=(p[0]-f.x)*Math.cos(a)+(p[1]-f.y)*Math.sin(a);
  const v=-(p[0]-f.x)*Math.sin(a)+(p[1]-f.y)*Math.cos(a);
  f.w=clamp(R(Math.abs(u)*2),80,4000);
  f.d=clamp(R(Math.abs(v)),80,4000);
 },
 move(o,dx,dy){o.e.x=o.x+dx; o.e.y=o.y+dy},
 del:delFix});

/* ═══ الدرج ═══ */
defEnt({k:"stair",coll:"stairs",n:"درج",pre:"S",pick:5,hitO:8,
 bump:"view",
 byId:stById,
 lay:()=>"A-STRS",
 hit(x,y,T,tol,ok,cand){
  for(const t of (cand||S.stairs)){
   if(!ok(t.id))continue;
   const p=stPoly(t);
   if(p&&pip(p,x,y))return t;
  }
  return null;
 },
 shape(t){
  const p=stPoly(t);
  return p?{t:"poly",pts:p}:null;
 },
 outline:t=>stPoly(t),
 grips(t){
  const g=stGeom(t);
  if(!g)return [];
  return [{p:t.a.slice(),k:"a"},{p:t.b.slice(),k:"b"},
          {p:g.P(g.L/2,0),k:"mid"},
          {p:g.P(g.L/2,g.hw),k:"w"}];
 },
 grab:t=>({e:t,a:t.a.slice(),b:t.b.slice(),w:t.w}),
 drag(o,g,p,dx,dy){
  const t=o.e;
  if(g.k==="a"){t.a=[p[0],p[1]]; return}
  if(g.k==="b"){t.b=[p[0],p[1]]; return}
  if(g.k==="mid"){
   t.a=[o.a[0]+dx,o.a[1]+dy];
   t.b=[o.b[0]+dx,o.b[1]+dy];
   return;
  }
  const G=stGeom({a:o.a,b:o.b,w:o.w,n:t.n});
  if(!G)return;
  const v=(p[0]-o.a[0])*G.nx+(p[1]-o.a[1])*G.ny;
  t.w=clamp(R(Math.abs(v)*2),SMIN_W,6000);
 },
 move(o,dx,dy){
  o.e.a=[o.a[0]+dx,o.a[1]+dy];
  o.e.b=[o.b[0]+dx,o.b[1]+dy];
 },
 del:delStair});

/* ═══ الترتيبان ═══ تُبنى مرّةً بعد الإعلان كلّه ═══ */
const V=Object.keys(ENT).map(k=>ENT[k]);
export const ORD =V.slice().sort((a,b)=>a.pick-b.pick);
export const HORD=V.slice().sort((a,b)=>a.hitO-b.hitO);
export const KINDS=ORD.map(d=>d.k);
export const COLL=ORD.reduce((o,d)=>{o[d.k]=d.coll; return o},{});
export const NAME=ORD.reduce((o,d)=>{o[d.k]=d.n;    return o},{});
export const entDef=k=>ENT[k]||null;
