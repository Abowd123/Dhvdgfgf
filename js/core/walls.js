/* ═══ الجدران ═══
   الجدار كائن صريح: مسار a→b وسماكة ومحاذاة.
   لا heal · لا لحم تلقائي · لا تقريب صامت — ما رسمته هو ما يُخزَّن.

   align: أي وجه يقع عليه المسار المرسوم
     c  المسار في المنتصف
     l  المسار على الوجه الأيسر  (الجسم يمتدّ يميناً)
     r  المسار على الوجه الأيمن  (الجسم يمتدّ يساراً)
   واليسار واليمين بالنسبة لاتجاه الرسم a→b. */
import {S,VER,touchGeom} from "./state.js";
import {newId,R2D,clamp,m2,m3} from "./units.js";
import {bandPoly,nearOnSeg,pip,dist,bboxOf,distSeg} from "./geom.js";

const R=v=>Math.round(v);
export const MINW=50;                 /* أقصر جدار مقبول */
export const TMIN=50, TMAX=1000;      /* حدود السماكة */

export const WTYPE={
 ext:{n:"خارجي",lay:"A-WALL"},
 int:{n:"داخلي",lay:"A-WALL"},
 low:{n:"سترة", lay:"A-WALL-LOW"}};
export const ALIGN={c:"مركزي",l:"الوجه الأيسر",r:"الوجه الأيمن"};
export const isWType=t=>!!WTYPE[t];
export const isLow=w=>!!(w&&w.type==="low");
export const lowH=w=>Math.max(200,Math.round(+(w&&w.h)||1000));

export function dir(w){
 if(!w||!w.a||!w.b)return null;
 const dx=w.b[0]-w.a[0], dy=w.b[1]-w.a[1], L=Math.hypot(dx,dy);
 if(L<1e-6)return null;
 const ux=dx/L, uy=dy/L;
 return {ux,uy,nx:-uy,ny:ux,L,ang:Math.atan2(uy,ux)*R2D};
}
export const wallLen=w=>(w&&w.a&&w.b)
 ? Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]) : 0;

/* إزاحة محور الجسم عن المسار على العمود الأيسر n=(-uy,ux) */
export const alignOff=w=>{
 const t=(w&&w.t)||0;
 return (w.align==="l")?(-t/2):((w.align==="r")?(t/2):0);
};
/* الخطّ المركزي الفعلي — عليه تُقاس الفتحات */
export function centerLine(w){
 const d=dir(w);
 if(!d)return null;
 const o=alignOff(w);
 return {a:[w.a[0]+d.nx*o, w.a[1]+d.ny*o],
         b:[w.b[0]+d.nx*o, w.b[1]+d.ny*o]};
}
/* جسم الجدار مستطيلاً — بلا أي تعديل على البيانات */
export function band(w){
 const c=centerLine(w);
 if(!c)return null;
 return bandPoly(c.a[0],c.a[1],c.b[0],c.b[1],w.t);
}
/* وجهَا الجدار قطعتين — لأدوات القياس والمرجع */
export function faces(w){
 const c=centerLine(w), d=dir(w);
 if(!c||!d)return null;
 const h=w.t/2;
 return {
  l:[[R(c.a[0]+d.nx*h),R(c.a[1]+d.ny*h)],
     [R(c.b[0]+d.nx*h),R(c.b[1]+d.ny*h)]],
  r:[[R(c.a[0]-d.nx*h),R(c.a[1]-d.ny*h)],
     [R(c.b[0]-d.nx*h),R(c.b[1]-d.ny*h)]]};
}
/* ═══ خريطة المعرّفات ═══
   على النسخة الهندسية: تحرّكُ بُعدٍ أو نصٍّ لا يبنيها من جديد. */
let MAP=null, MVER=-1;
export function wallById(id){
 if(MVER!==VER.g){
  MAP=new Map();
  S.walls.forEach(w=>MAP.set(w.id,w));
  MVER=VER.g;
 }
 return MAP.get(id)||null;
}
export function addWall(a,b,t,type,align,h){
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 if(Math.hypot(B[0]-A[0],B[1]-A[1])<MINW)
  throw new Error("الطول أقل من 5 سم");
 const ty=isWType(type)?type:"int";
 const df=(ty==="ext")?S.meta.tExt
  :((ty==="low")?S.meta.tLow:S.meta.tInt);
 const w={id:newId("W"),a:A,b:B,
  t:clamp(R(t||df),TMIN,TMAX), type:ty,
  align:ALIGN[align]?align:"c"};
 if(ty==="low")w.h=Math.max(200,R(h||S.meta.lowH));
 S.walls.push(w); touchGeom();
 return w;
}
export function delWall(w){
 const i=S.walls.indexOf(w);
 if(i<0)return false;
 S.walls.splice(i,1); touchGeom();
 return true;
}
/* إصابة: داخل الجسم أوّلاً، وإلا قرب المسار بتفاوت الشاشة.
   list مرشَّحو الفهرس — والغياب يعني المسح الكامل. */
export function wallAt(x,y,tol,list){
 let best=null,bd=1/0;
 (list||S.walls).forEach(w=>{
  const p=band(w);
  if(p&&pip(p,x,y)){
   const c=centerLine(w);
   const d=nearOnSeg(c.a,c.b,x,y).d;
   if(d<bd){bd=d;best=w}
   return;
  }
  const r=nearOnSeg(w.a,w.b,x,y);
  if(r.d<(tol||200)&&r.d<bd){bd=r.d;best=w}
 });
 return best;
}
export const wallsBBox=()=>{
 const P=[];
 S.walls.forEach(w=>{
  const p=band(w);
  if(p)p.forEach(q=>P.push(q));
  else{P.push(w.a);P.push(w.b)}
 });
 return bboxOf(P);
};
/* ═══ فهرس صناديق الأجسام ═══
   شبكةٌ بخلايا مترين — كشبكة الأطراف وشبكة المراسي، وبعقدها:
   تُبنى مرّةً لكل نسخةٍ هندسية.

   تخدم بصمة المناطق: كانت تمسح S.walls كلَّها وتبني band لكلٍّ،
   لكل منطقةٍ في كل إطار — خمسون منطقةً وثلاث مئة جدارٍ = ١٥٠٠٠
   بناء band. وموضعها هنا لا في core/sindex لأن areas → sindex
   → entreg → areas دورةٌ حقيقية: جسم entreg يُنفَّذ أوّلاً فيقع
   areaById في نطاق التصريح المؤقّت. والمشروع يتجنّبها سلفاً
   بتمرير المرشَّحين وسيطاً (colOnWall · fixOnWall). */
const BCELL=2000;
let BG=null, BGV=-1;
function bandGrid(){
 if(BGV===VER.g&&BG)return BG;
 const g=new Map(), big=[];
 const put=(k,i)=>{
  let a=g.get(k);
  if(!a){a=[]; g.set(k,a)}
  a.push(i);
 };
 S.walls.forEach((w,i)=>{
  const b=bboxOf(band(w)||[w.a,w.b]);
  if(!b){big.push(i); return}
  const x0=Math.floor(b.x0/BCELL), x1=Math.floor(b.x1/BCELL);
  const y0=Math.floor(b.y0/BCELL), y1=Math.floor(b.y1/BCELL);
  /* الجدار الممتدّ لا يُحشَر في مئة خليّة: يُفحَص دائماً */
  if((x1-x0+1)*(y1-y0+1)>64){big.push(i); return}
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++)
   put(cx+","+cy,i);
 });
 BG={g,big}; BGV=VER.g;
 return BG;
}
/* الجدران التي قد يلمس جسمها الصندوق — مرشَّحون لا قرار.
   والترتيب بترتيب S.walls فلا يتبدّل جوابٌ يعتمد عليه، ولا
   تتبدّل بصمةُ منطقةٍ محفوظة. */
export function wallsIn(box){
 if(!box)return S.walls.slice();
 const {g,big}=bandGrid();
 const x0=Math.floor(box.x0/BCELL), x1=Math.floor(box.x1/BCELL);
 const y0=Math.floor(box.y0/BCELL), y1=Math.floor(box.y1/BCELL);
 if((x1-x0+1)*(y1-y0+1)>4096)return S.walls.slice();
 const seen=new Set(big);
 for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){
  const a=g.get(cx+","+cy);
  if(a)a.forEach(i=>seen.add(i));
 }
 return [...seen].sort((a,b)=>a-b).map(i=>S.walls[i]);
}
export const bandGridStats=()=>{
 const {g,big}=bandGrid();
 return {cells:g.size,big:big.length,ver:BGV};
};
/* ═══ الأطراف غير المتّصلة — معلومة عرض لا تعديل ═══
   الطرف حرّ إن لم يلامس مسار جدار آخر بتفاوت مذكور.
   تُرسَم عليه علامة، ولا يُلحَم إلا بأمرك على تحديد صريح.

   كاش على النسخة الهندسية وعلى تفاوت الاستدعاء معاً — يُستدعى مع
   كل حركة مؤشّر عبر drawEnds. وكان على النسخة العامّة، فيُعاد
   بناؤه مع كل إطارٍ أثناء سحب أي شيء. */
const ECELL=2000;
function segGrid(){
 const g=new Map();
 const put=(k,i)=>{
  let a=g.get(k);
  if(!a){a=[]; g.set(k,a)}
  a.push(i);
 };
 S.walls.forEach((w,i)=>{
  const x0=Math.floor(Math.min(w.a[0],w.b[0])/ECELL);
  const x1=Math.floor(Math.max(w.a[0],w.b[0])/ECELL);
  const y0=Math.floor(Math.min(w.a[1],w.b[1])/ECELL);
  const y1=Math.floor(Math.max(w.a[1],w.b[1])/ECELL);
  /* جدارٌ ممتدّ جدّاً يُفحَص دائماً بدل أن يُحشَر في مئة خليّة */
  if((x1-x0+1)*(y1-y0+1)>64){put("*",i); return}
  for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++)
   put(cx+","+cy,i);
 });
 return g;
}
let LCACHE=null, LVER=-1, LTOL=null;
export function looseEnds(tol){
 const T=Math.max(1,tol==null?2:tol);
 if(LVER===VER.g&&LTOL===T&&LCACHE)return LCACHE;
 const G=segGrid();
 const r=Math.ceil(T/ECELL);
 const test=(list,p,skip)=>{
  if(!list)return false;
  for(const j of list){
   if(j===skip)continue;
   const w=S.walls[j];
   if(distSeg(w.a,w.b,p[0],p[1])<=T)return true;
  }
  return false;
 };
 const free=(p,skip)=>{
  const cx=Math.floor(p[0]/ECELL), cy=Math.floor(p[1]/ECELL);
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)
   if(test(G.get((cx+i)+","+(cy+j)),p,skip))return false;
  return !test(G.get("*"),p,skip);
 };
 const out=[];
 S.walls.forEach((w,i)=>{
  [["a",w.a],["b",w.b]].forEach(([k,p])=>{
   if(!free(p,i))return;
   out.push({id:w.id,end:k,p:p.slice(),w});
  });
 });
 LCACHE=out; LVER=VER.g; LTOL=T;
 return LCACHE;
}

