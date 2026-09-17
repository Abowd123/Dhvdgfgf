/* ═══ جدول الكميات ═══
   تقريرٌ يُجمَع عند الطلب: لا حقل يُخزَّن، ولا شيء يُصلَح.
   كجدول المساحات في areas.js وجدول الفتحات في opens.js —
   الحالةُ هي الأصل، والجدولُ قراءةٌ لها في لحظة.

   ولا DOM هنا ولا تنزيل ولا تنسيق: المليمتر يخرج كما هو،
   والقسمةُ على ألفٍ أو مليون شأنُ من يعرض. فمن يختبر يقارن
   أعداداً صحيحة لا نصوصاً تُقرَّب — والتقريب في مكانٍ واحد
   (io/boq.js) لا في اثنين يفترقان.

   القديمة تدخل: حذفُها يجعل المجموع كذبة، وإدخالُها بلا علامة
   يجعله كذبةً أخرى. فتدخل بعلامة — كما يُبلِّغ arearef ولا يُصلح. */
import {S} from "./state.js";
import {netArea,netPerim,isStale} from "./areas.js";
import {okName,okOf,panOf} from "./opens.js";
import {wallLen,WTYPE,isLow,lowH} from "./walls.js";

/* ═══ الأشيع ═══
   السماكةُ الأكثر تكراراً في النوع. وعند التعادل تُختار الأكبر:
   قرارٌ صريح لا ترتيبُ مصفوفة — فجدارٌ يُحذَف ويُعاد لا يقلب
   الجواب. وn عددُ السماكات المختلفة: واحدةٌ تعني نوعاً متجانساً،
   وأكثرُ تعني أن «الأشيع» يخفي تنوّعاً — فيُقال. */
export function modeOf(vals){
 const m=new Map();
 (vals||[]).forEach(v=>{
  const k=Math.round(+v||0);
  m.set(k,(m.get(k)||0)+1);
 });
 let best=0, bn=-1;
 m.forEach((c,k)=>{
  if(c>bn||(c===bn&&k>best)){bn=c; best=k}
 });
 return {v:m.size?best:0, n:m.size};
}
/* ═══ المناطق ═══
   المساحةُ صافيةٌ بين الوجوه الداخلية — netArea هي هي، لا حساب
   ثانٍ يفترق عنها. والمحيطُ معها لأنه يُقاس من الحلقة نفسها. */
export function areaRows(){
 const rows=S.areas.map(a=>({
  id:a.id,
  name:a.name||"(بلا اسم)",
  area:netArea(a),
  perim:netPerim(a),
  stale:isStale(a)?1:0}));
 rows.sort((x,y)=>(y.area-x.area)||x.id.localeCompare(y.id));
 return {rows,
  total:rows.reduce((s,r)=>s+r.area,0),
  stale:rows.reduce((s,r)=>s+r.stale,0),
  n:rows.length};
}
/* ═══ الفتحات ═══
   تُجمَع بالنوع وحده — لا بالمقاس. فجدول الكميات يسأل «كم باباً
   مفرداً؟» لا «كم باباً بعرض ٩٠٠؟»؛ ذاك سؤالُ openSchedule وله
   جوابُه هناك بمقاسه ورمزه.

   والمساحة الإجمالية تُذكَر لأنها الكميّةُ التي تُشترى: زجاجٌ
   بالمتر المربّع، وحشوةُ بابٍ كذلك. وأصغرُ وأكبرُ عرضٍ يقولان
   إن كان النوع متجانساً. */
export function openRows(){
 const G=new Map();
 S.opens.forEach(o=>{
  const k=o.kind;
  let r=G.get(k);
  if(!r){
   r={kind:k, name:okName(k), n:0, ar:0,
    wMin:1/0, wMax:0, hMin:1/0, hMax:0, pan:0};
   G.set(k,r);
  }
  r.n++;
  r.ar+=(+o.w||0)*(+o.h||0);
  if(o.w<r.wMin)r.wMin=o.w;
  if(o.w>r.wMax)r.wMax=o.w;
  if(o.h<r.hMin)r.hMin=o.h;
  if(o.h>r.hMax)r.hMax=o.h;
  if(okOf(k).pan)r.pan+=panOf(o);
 });
 const rows=[...G.values()].map(r=>{
  if(!isFinite(r.wMin))r.wMin=0;
  if(!isFinite(r.hMin))r.hMin=0;
  return r;
 });
 /* الترتيب بالعدد نازلاً ثم بالمفتاح — لا بترتيب S.opens، فلا
    يتبدّل الجدولُ بإضافةِ فتحةٍ لا تغيّر شيئاً في العدّ */
 rows.sort((a,b)=>(b.n-a.n)||a.kind.localeCompare(b.kind));
 return {rows,
  total:S.opens.length,
  ar:rows.reduce((s,r)=>s+r.ar,0),
  n:rows.length};
}
/* ═══ الجدران ═══
   الطولُ مجموعُ wallLen على المسار المرسوم — لا على محور الجسم
   ولا على الوجه. فالمسارُ هو ما رُسم، وما عداه اشتقاقٌ يختلف
   بالمحاذاة.

   والفتحاتُ لا تُطرَح: طرحُها يحتاج ارتفاعَ الجدار وارتفاعَ كل
   فتحةٍ وجلستَها، وذلك حسابُ حجومٍ لا أطوال. فيُذكَر عددُ فتحات
   النوع تنبيهاً، ويُترَك الطرحُ لمن يريده صريحاً.

   وارتفاعُ السترة من w.h لا من meta.wallH — والباقي من
   meta.wallH، فهو ارتفاعُ الجدار المعلَن. */
export function wallRows(){
 const G=new Map();
 const byId=new Map();
 S.walls.forEach(w=>byId.set(w.id,w));
 const opn=new Map();
 S.opens.forEach(o=>{
  const w=byId.get(o.wall);
  if(!w)return;                      /* اليتيمة لا تُحسَب */
  const t=w.type;
  opn.set(t,(opn.get(t)||0)+1);
 });
 S.walls.forEach(w=>{
  const t=w.type;
  let r=G.get(t);
  if(!r){
   r={type:t, name:(WTYPE[t]||{}).n||t, n:0, len:0,
    ts:[], hs:[], t:0, tn:0, h:0, opens:0};
   G.set(t,r);
  }
  r.n++;
  r.len+=wallLen(w);
  r.ts.push(w.t);
  r.hs.push(isLow(w)?lowH(w):(+S.meta.wallH||3000));
 });
 const rows=[...G.values()].map(r=>{
  const M=modeOf(r.ts);
  r.t=M.v; r.tn=M.n;
  r.h=modeOf(r.hs).v;
  r.len=Math.round(r.len);
  /* المساحة السطحية بالوجه الواحد · بالسماكة الأشيع لا بكلٍّ
     على حدة — فمن أراد الحجم بالضبط قرأ الجدران واحداً واحداً */
  r.face=Math.round(r.len*r.h);
  r.vol=Math.round(r.len*r.h*r.t);
  r.opens=opn.get(r.type)||0;
  delete r.ts; delete r.hs;
  return r;
 });
 const ORD={ext:0,int:1,low:2};
 rows.sort((a,b)=>((ORD[a.type]==null?9:ORD[a.type])
  -(ORD[b.type]==null?9:ORD[b.type]))||a.type.localeCompare(b.type));
 return {rows,
  len:rows.reduce((s,r)=>s+r.len,0),
  face:rows.reduce((s,r)=>s+r.face,0),
  vol:rows.reduce((s,r)=>s+r.vol,0),
  n:S.walls.length};
}
/* ═══ الجدول كاملاً ═══
   ثلاثة أقسام وترويسة. والترويسة من meta لا من التاريخ الحيّ:
   جدولان يُبنيان من الحالة نفسها يتطابقان — فلو حملا وقتَ البناء
   لاختلفا في حرفٍ لا معنى له. وdate حقلُ مشروعٍ قائم في meta. */
export function boq(){
 return {
  name:String(S.meta.name||"PLAN"),
  scale:+S.meta.scale||100,
  date:String(S.meta.date||""),
  wallH:+S.meta.wallH||3000,
  areas:areaRows(),
  opens:openRows(),
  walls:wallRows()};
}
/* سطرُ حصيلةٍ للوحة الحالة — نصٌّ واحد لا كائن */
export const boqLine=B=>`${B.walls.n} جداراً · `
 +`${B.opens.total} فتحة · ${B.areas.n} منطقة`
 +(B.areas.stale?` · ${B.areas.stale} قديمة`:"");
