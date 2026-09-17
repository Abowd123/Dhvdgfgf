/* ═══ أدوات المناطق ═══
   الخبز أمرٌ يُنفَّذ مرّة، ونتيجته كائن مستقلّ — لا كشفٌ يُعاد
   في كلّ رسمة، ولا حدود وهمية تُخترع ليقتنع كاشف. */
import {S} from "../core/state.js";
import {sqm,m2} from "../core/units.js";
import {addArea,regionAt,areaAt,areaById,rebake,isStale,
        netArea,FILLS} from "../core/areas.js";
import {regionLoops,loopOpen,loopOpenAt} from "../core/render.js";
import {vis} from "../core/layers.js";
import {pArea,centroid} from "../core/geom.js";
import {defTool,H,rec,dirty,ov,ovOn,pvText} from "./registry.js";

const GRN="#5cd98e";
const visW=()=>vis("A-WALL")||vis("A-WALL-LOW");

defTool({
 id:"area", alias:"a منطقه غرفه", label:"منطقة",
 hint:"انقر داخل حلقة مغلقة · Enter ينهي",
 opts:[
  {k:"name", label:"الاسم",       type:"text",def:""},
  {k:"num",  label:"رقّم تلقائياً",type:"chk", def:1},
  {k:"showArea",label:"أظهر المساحة",type:"chk",def:1},
  {k:"fill", label:"التعبئة",     type:"sel",
   items:Object.keys(FILLS).map(k=>[k,FILLS[k]]), def:"tint"}],
 steps:[
  {p:"انقر داخل المنطقة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    /* الهندسة لا تُخفى، لكن الخبز من جدرانٍ لا تراها يوقعك في
       حلقةٍ لا تفهم مصدرها — فالتنبيه لازم */
    if(!visW())
     H.rep("wr","طبقة الجدران مخفيّة — الخبز يقرأ الجدران كلّها "
      +"على أي حال. أظهرها لترى ما تخبزه.");
    const ex=areaAt(p[0],p[1]);
    if(ex)throw new Error(`توجد ${ex.id} هنا — احذفها أو حدّثها`);
    const ring=regionAt(regionLoops(),p[0],p[1]);
    if(!ring){
     /* السببُ ليس دائماً جداراً مفتوحاً: قد يكون الاتحادُ نفسه
        لم يُخَط. وبعد اللحم لا يقع ذلك لتفاوتٍ دون المليمترين،
        فإن وقع فالمدخلُ معطوبٌ فعلاً — والموضعُ يُقال، لأن
        «أغلق الجدران» بلا مكانٍ نصيحةٌ لا تُنفَّذ. */
     const g=loopOpen(), at=loopOpenAt();
     throw new Error(
      "لا حلقة مغلقة تحيط بهذه النقطة — أغلق الجدران أوّلاً "
      +"(المعيَّنات الحمراء تدلّ على الأطراف غير المتّصلة)"
      +(g?` · وفي اتحاد الأجسام ${g} قطعةً لم تُخَط`
        +(at?` — آخرُها عند (${m2(at[0])}، ${m2(at[1])})`:"")
        +". أزِح أحد الجدارَين هناك بخطوة الالتقاط ثم أعِد "
        +"المحاولة." : ""));
    }
    let nm=String(ov("area","name")||"").trim();
    if(ovOn("area","num")){
     const n=S.areas.length+1;
     nm=nm?`${nm} ${n}`:`منطقة ${n}`;
    }
    const a=addArea(ring,nm,{
     showArea:ovOn("area","showArea")?1:0,
     fill:ov("area","fill")});
    rec(ctx,a,"areas");
    H.rep("ok",`${a.id} ${a.name} · ${sqm(netArea(a))} م² · `
     +`${a.ring.length} ضلعاً · خُبزت كائناً مستقلّاً`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const ring=regionAt(regionLoops(),g[0],g[1]);
  if(!ring)return [];
  const o=[];
  for(let i=0;i<ring.length;i++)
   o.push({t:"l",a:ring[i],b:ring[(i+1)%ring.length],c:GRN});
  o.push(pvText(centroid(ring),
   `${sqm(Math.abs(pArea(ring)))} م² · ${ring.length} ضلعاً`,GRN));
  return o;
 }});

/* ═══ تحديث المناطق المحدَّدة ═══
   يعيد الخبز بأمرك، ويذكر فرق المساحة.
   destruct: يعيد خبز حلقاتٍ قائمة — فلا يُصدِره المزوّد بلا
   تصريحٍ من المستخدم. */
defTool({
 id:"arearef", alias:"ar حدث تحديث", label:"تحديث المناطق",
 hint:"يعيد خبز المحدَّد من الهندسة الحالية",
 destruct:1,
 opts:[],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="area");
  const T=L.length?L.map(s=>areaById(s.id)).filter(Boolean)
   :S.areas.filter(isStale);
  if(!T.length){
   H.rep("in",L.length?"لا منطقة محدَّدة"
    :"لا منطقة قديمة تحتاج تحديثاً");
   return false;
  }
  const loops=regionLoops();
  let n=0, fail=0;
  T.forEach(a=>{
   try{
    const r=rebake(a,loops);
    n++;
    const d=r.after-r.before;
    H.rep("ok",`${a.id} ${a.name}: ${sqm(r.before)} → `
     +`${sqm(r.after)} م²`
     +(Math.abs(d)>1?` (${d>0?"+":""}${sqm(d)})`:" (بلا تغيّر)"));
   }catch(e){fail++; H.rep("er",e.message)}
  });
  if(n)dirty(ctx);
  H.rep(fail?"wr":"ok",`حُدّثت ${n} منطقة`
   +(fail?` · تعذّرت ${fail}`:"")
   +(L.length?"":" (كانت قديمة)"));
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});
