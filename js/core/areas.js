/* ═══ المناطق المخبوزة ═══
   المنطقة كائن صريح: حلقة إحداثيات مخزَّنة، لا استنتاج يُعاد.
   تنقر داخل حلقة مغلقة مرّة، فتُخبَز مضلعاً يُسمّى ويُقاس ويُحرَّر
   بمقابضه. تغيير جدار لا يحرّكها: يجعلها «قديمة» بحدٍّ متقطّع،
   وأنت تحدّثها أو تثبّت بصمتها أو تتركها.

   لا تستورد render.js: الحلقات تُمرَّر إليها وسيطاً، فلا دورة.
   ولا sindex.js: فهرس صناديق الأجسام في walls.js — وهي تستورده
   سلفاً، فلا اتجاهَ يُقلَب. */
import {S,VER,touchView} from "./state.js";
import {newId,clamp,sqm,m2,m3} from "./units.js";
import {pArea,ccw,centroid,perim,pip,bboxOf,bboxHit,
        cleanRing} from "./geom.js";
import {band,wallsIn} from "./walls.js";
import {bump} from "./perf.js";

const R=v=>Math.round(v);
export const MINA=250000;          /* أصغر منطقة مقبولة: ٠٫٢٥ م² */
export const FILLS={none:"بلا",tint:"صبغة",hatch:"هاشور"};
export const areaById=id=>S.areas.find(a=>a.id===id)||null;

/* ═══ المساحة والمحيط ═══
   صافية بين الوجوه الداخلية، لأن الحلقة هي حدّ الفراغ نفسه. */
export const netArea=a=>Math.abs(pArea((a&&a.ring)||[]));
export const netPerim=a=>perim((a&&a.ring)||[]);
export const labelPt=a=>(a.lp?a.lp.slice():centroid(a.ring||[]));

/* ═══ البصمة ═══
   بصمة الجدران المجاورة للحلقة. حسّاسة بقصد: تُنبّه ولا تُصلح.
   لا تعرف الفتحات — الباب لا يغيّر امتداد الغرفة.
   ولا تعرف حالة العرض — إخفاء طبقة ليس تغييراً هندسياً. */
const hash=s=>{
 let h=0x811c9dc5;
 for(let i=0;i<s.length;i++){
  h^=s.charCodeAt(i);
  h=(h*0x01000193)>>>0;
 }
 return h.toString(36);
};
export function stampOf(ring){
 const b=bboxOf(ring);
 if(!b)return "";
 const pad=400;
 const Rc={x0:b.x0-pad,y0:b.y0-pad,x1:b.x1+pad,y1:b.y1+pad};
 const parts=[];
 /* المرشَّحون من فهرس الأجسام: جدارٌ صندوقه لا يلمس الحلقة لا
    يمكن أن يجاورها. والفحص بعده هو الفحص نفسه حرفاً بحرف،
    فالبصمة لا تتبدّل — ولو تبدّلت لصارت كل منطقةٍ محفوظة
    «قديمة» بمجرّد فتح الملفّ. */
 wallsIn(Rc).forEach(w=>{
  const wb=bboxOf(band(w)||[w.a,w.b]);
  if(!wb||!bboxHit(wb,Rc,0))return;
  parts.push(`${w.id}:${w.a[0]},${w.a[1]},${w.b[0]},${w.b[1]},`
   +`${w.t},${w.align},${w.type}`);
 });
 parts.sort();
 return parts.length?hash(parts.join("|")):"—";
}
/* ═══ كاش البصمة ═══
   isStale كان يُنادى مرّتين لكل منطقة في areaPrims، ثم في scene،
   ثم في inspect — أربع مرّاتٍ لكل منطقة في كل إطار.

   والمفتاح شيئان: النسخة الهندسية (تغيّر الجدران) وتوقيعُ الحلقة
   (تحرّك رأسٍ أو نقل المنطقة). والثاني لازم لأن سحب رأس منطقةٍ
   يغيّر جوارها ولا يُقدّم النسخة الهندسية — فمفتاحٌ بها وحدها
   يعرضها قديمةً وهي ليست، أو بالعكس. وتوقيعُ الحلقة رخيصٌ
   (ثمانية أزواج) مقابل stampOf التي تمسح الجوار وتبني band.

   وما يُخزَّن هو البصمة المحسوبة لا نتيجةُ المقارنة: فتثبيتُ
   البصمة (restamp) يقلب الجواب بلا إبطالٍ يدويّ. */
const SC=new Map();
const ringSig=r=>{
 const R2=r||[];
 let s=R2.length+":";
 for(let i=0;i<R2.length;i++)s+=R2[i][0]+","+R2[i][1]+";";
 return s;
};
export function stampNow(a){
 if(!a)return "";
 const rs=ringSig(a.ring);
 const hit=SC.get(a.id);
 if(hit&&hit.g===VER.g&&hit.rs===rs)return hit.sp;
 const sp=stampOf(a.ring);
 bump("stamp");
 if(SC.size>600)SC.clear();      /* لا ينمو بلا حدّ */
 SC.set(a.id,{g:VER.g,rs,sp});
 return sp;
}
export const isStale=a=>!!a&&a.stamp!==stampNow(a);
export const staleAreas=()=>S.areas.filter(isStale);
/* العدّ يمسح S.areas لا الكاش: منطقةٌ محذوفة تبقى في الكاش،
   ولو عُدَّ منه لأُبلِغتَ عن قديمةٍ لا وجود لها. */
export const staleCount=()=>{
 let n=0;
 S.areas.forEach(a=>{if(isStale(a))n++});
 return n;
};
export const stampStats=()=>({n:SC.size});
export const restamp=a=>{a.stamp=stampOf(a.ring); touchView(); return a};

/* ═══ إيجاد الحلقة المحيطة ═══
   حلقاتُ الأجسام تُقرأ بالتناوب — وهو ما يفعله الطلاءُ نفسه
   بـfill("evenodd"): عددٌ فرديٌّ من الحلقات الحاوية يعني صمتاً،
   وزوجيٌّ فراغاً حدُّه أعمقُها. والحلقاتُ الحاويةُ لنقطةٍ واحدة
   متداخلةٌ حتماً — مخرَجُ اتحادٍ لا تتقاطع حلقاتُه — فأصغرُها
   مساحةً هو أعمقُها.

   وكان «الأصغرُ مساحةً» وحدَه ثلاثةَ أعطاب: مركزُ عمودٍ منفردٍ
   يُعيد حلقتَه (٠٫١٦ م²) فترفضها addArea بحدِّ ٠٫٢٥، وجسمُ
   الجدار يُعيد قِشرةَ البناء كلَّها فتُخبَز منطقةٌ بمساحة المبنى،
   ورebake لغرفةٍ قطبُها في الصمت يعيد الخبزَ على القِشرة بلا كلمة. */
export function regionAt(loops,x,y){
 let n=0, best=null, ba=1/0;
 (loops||[]).forEach(lp=>{
  if(!lp||lp.length<3)return;
  if(!pip(lp,x,y))return;
  n++;
  const ar=Math.abs(pArea(lp));
  if(ar<ba){ba=ar; best=lp}
 });
 if(!n||(n&1))return null;          /* لا حلقةَ · أو صمت */
 return best.map(p=>[R(p[0]),R(p[1])]);
}
export const areaAt=(x,y,list)=>{
 let best=null, ba=1/0;
 (list||S.areas).forEach(a=>{
  if(!pip(a.ring,x,y))return;
  const ar=netArea(a);
  if(ar<ba){ba=ar;best=a}
 });
 return best;
};
/* ═══ الخبز ═══ */
export function addArea(ring,name,ex){
 const r=cleanRing(ccw(ring||[]),2);
 if(r.length<3)throw new Error("الحلقة أقلّ من ثلاثة أضلاع");
 const ar=Math.abs(pArea(r));
 if(ar<MINA)
  throw new Error(`المنطقة ${sqm(ar)} م² — الأصغر المقبول `
   +`${sqm(MINA)} م²`);
 const a={id:newId("A"),ring:r,name:String(name||"").slice(0,40),
  stamp:stampOf(r),showArea:1,fill:"tint"};
 if(ex){
  if(ex.showArea===0)a.showArea=0;
  if(FILLS[ex.fill])a.fill=ex.fill;
 }
 S.areas.push(a); touchView();
 return a;
}
export function delArea(a){
 const i=S.areas.indexOf(a);
 if(i<0)return false;
 S.areas.splice(i,1); touchView();
 return true;
}
/* إعادة الخبز من الهندسة الحالية · الاسم والخيارات تبقى.
   القطب المحسوب مرجعُ البحث؛ الموضع الصريح للاسم لا يُمَسّ. */
export function rebake(a,loops){
 const c=centroid(a.ring);
 const r=regionAt(loops,c[0],c[1]);
 if(!r)throw new Error(`${a.id}: لا حلقة مغلقة عند قطبها — `
  +`أغلق الجدران أو حرّك المنطقة`);
 const ar=Math.abs(pArea(r));
 if(ar<MINA)throw new Error(`${a.id}: الحلقة الجديدة ${sqm(ar)} م² فقط`);
 const before=netArea(a);
 a.ring=cleanRing(ccw(r),2);
 a.stamp=stampOf(a.ring);
 touchView();
 return {before,after:netArea(a)};
}
/* ═══ جدول المساحات ═══ */
export function schedule(){
 const rows=S.areas.map(a=>({id:a.id,
  name:a.name||"(بلا اسم)",
  ar:netArea(a), pr:netPerim(a), stale:isStale(a)}));
 rows.sort((x,y)=>y.ar-x.ar);
 return {rows,total:rows.reduce((s,r)=>s+r.ar,0)};
}
/* ═══ الأوّليات ═══
   القديمة: حدّ متقطّع وشارة — لا شيء يُصلَح خلسة.
   وisStale يُنادى مرّةً واحدة هنا فيُقرأ من الكاش. */
export function areaPrims(a,txtH){
 const out=[];
 const st=isStale(a);
 if(a.fill!=="none")
  out.push({t:"fill",L:"A-AREA",ring:a.ring,style:a.fill,aid:a.id});
 out.push({t:"poly",L:"A-AREA",pts:a.ring,cl:1,aid:a.id,
  dash:st?[420,300]:null, warn:st?1:0});
 const h=txtH, c=labelPt(a);
 const two=!!(a.name&&a.showArea);
 if(a.name)
  out.push({t:"text",L:"A-AREA",s:a.name,x:c[0],
   y:R(c[1]+(two?h*0.35:-h*0.5)),h,al:"mc",aid:a.id,
   warn:st?1:0});
 if(a.showArea)
  out.push({t:"text",L:"A-AREA",s:`${sqm(netArea(a))} م²`,
   x:c[0], y:R(c[1]-(two?h*1.35:h*0.5)), h:h*0.82, al:"mc",
   aid:a.id, warn:st?1:0});
 if(st)
  out.push({t:"text",L:"A-AREA",s:"قديمة",
   x:c[0], y:R(c[1]+(a.name?h*1.9:h*1.1)), h:h*0.7, al:"mc",
   aid:a.id, warn:1});
 return out;
}
export const areaLabel=a=>`${a.name||"(بلا اسم)"} · ${sqm(netArea(a))} م²`
 +(isStale(a)?" · قديمة":"");
