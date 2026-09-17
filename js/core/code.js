/* ═══ فاحص الاشتراطات ═══
   الفاحص الحالي يفحص الهندسة: أطرافٌ لا تلتقي، فتحةٌ تخرج عن
   جدارها، منطقةٌ قديمة. وهذه طبقةٌ ثانية تفحص التصميم نفسه:
   أعرضُ البابُ كافٍ؟ أللغرفة ضوءٌ وتهوية؟ أالممرّ يمرّ منه اثنان؟

   والعقد نفسه يسري: يخبر ولا يصلح، وكل نتيجةٍ تقفز إلى موضعها.

   القيَم أدناه إرشاديةٌ لا نصّ نظام: تُعدَّل لتطابق الكود المعتمد
   في بلدك ومشروعك. وهي بالمليمتر كبقيّة الحالة. */
import {S} from "./state.js";
import {m2,m3,sqm} from "./units.js";
import {pip,bboxOf,centroid} from "./geom.js";
import {wallById} from "./walls.js";
import {openPt,okName} from "./opens.js";
import {netArea,labelPt} from "./areas.js";

const K="mistar.code";
export const CODE={
 on:1,
 doorW:800,      /* باب غرفة */
 doorWet:700,    /* باب دورة مياه */
 doorExt:900,    /* باب على جدار خارجي */
 doorH:2000,
 sillLow:800,    /* جلسة أدنى منها تحتاج حماية */
 light:0.10,     /* مساحة الزجاج ÷ مساحة الأرضية */
 vent:0.05,      /* القابل للفتح ÷ مساحة الأرضية */
 roomMin:6e6,    /* ٦ م² بالمليمتر المربّع */
 wetMin:1.5e6,
 corrW:1000,
 ceilH:2600};

const KEYS=Object.keys(CODE);
export function loadCode(){
 if(typeof localStorage==="undefined")return CODE;
 try{
  const d=JSON.parse(localStorage.getItem(K)||"null")||{};
  KEYS.forEach(k=>{if(typeof d[k]==="number")CODE[k]=d[k]});
 }catch(e){}
 return CODE;
}
export function saveCode(){
 if(typeof localStorage==="undefined")return;
 try{localStorage.setItem(K,JSON.stringify(CODE))}catch(e){}
}

/* ═══ الربط بين الفتحة والمنطقة ═══
   المنطقة حلقةٌ على أوجه الجدران، والفتحة نقطةٌ على مسار جدارها —
   فالقرب من الحلقة هو الانتماء. تفاوتٌ بسماكة الجدار لأن المسار
   قد يكون محورياً والحلقة على الوجه. */
function segD(p,a,b){
 const dx=b[0]-a[0], dy=b[1]-a[1];
 const L2=dx*dx+dy*dy;
 if(L2<1)return Math.hypot(p[0]-a[0],p[1]-a[1]);
 let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2;
 t=t<0?0:(t>1?1:t);
 return Math.hypot(p[0]-a[0]-dx*t, p[1]-a[1]-dy*t);
}
function onRing(ring,p,tol){
 for(let i=0;i<ring.length;i++){
  if(segD(p,ring[i],ring[(i+1)%ring.length])<=tol)return true;
 }
 return false;
}
/* تصنيفٌ بالاسم: الفراغات تُسمّى بالعربية، والاسم أصدق دليلٍ
   متاح على وظيفة الفراغ. ما لا يُعرَف لا يُحاسَب بقاعدةٍ خاصّة. */
const CLS=[
 [/(دوره|دورة|حمام|حمّام|مرحاض|بانيو|wc)/i,"wet"],
 [/(ممر|ممشى|بهو|مدخل|درج)/i,"corr"],
 [/(مطبخ)/i,"kitchen"],
 [/(نوم|مجلس|صاله|صالة|معيشه|معيشة|مكتب|غرف)/i,"room"]];
const classOf=a=>{
 const n=String(a.name||"");
 for(const [rx,c] of CLS)if(rx.test(n))return c;
 return "";
};
const GLASS=/^(window|fixed)$/;
const DOORS=/^(door|double|sliding)$/;

export function codeCheck(){
 const F=[];
 const add=(sev,code,msg,k,id,p)=>F.push({sev,code,msg,k,id,
  p:p?[Math.round(p[0]),Math.round(p[1])]:null});
 if(!+CODE.on)return F;

 if(S.meta.wallH&&S.meta.wallH<CODE.ceilH)
  add("wr","c-ceil",
   `ارتفاع الدور ${m2(S.meta.wallH)} م دون الحدّ الإرشادي `
   +`${m2(CODE.ceilH)} م`,null,null,null);

 /* الربط يُبنى مرّةً: الفتحة قد تخصّ منطقتين (باب بينهما) */
 const inArea=new Map();          /* معرّف المنطقة ← فتحاتها */
 const ofOpen=new Map();          /* معرّف الفتحة ← مناطقها */
 S.areas.forEach(a=>inArea.set(a.id,[]));
 S.opens.forEach(o=>{
  const w=wallById(o.wall);
  if(!w)return;
  const q=openPt(w,o.s);
  const tol=Math.max(w.t,200);
  S.areas.forEach(a=>{
   if(!a.ring||a.ring.length<3)return;
   if(!onRing(a.ring,q,tol))return;
   inArea.get(a.id).push({o,w});
   const L=ofOpen.get(o.id)||[];
   L.push(a); ofOpen.set(o.id,L);
  });
 });

 /* ═══ الأبواب ═══ */
 S.opens.filter(o=>DOORS.test(o.kind)).forEach(o=>{
  const w=wallById(o.wall);
  if(!w)return;
  const p=openPt(w,o.s);
  const AS=ofOpen.get(o.id)||[];
  const wet=AS.some(a=>classOf(a)==="wet");
  const ext=(w.type==="ext");
  const min=ext?CODE.doorExt:(wet?CODE.doorWet:CODE.doorW);
  const why=ext?"على جدار خارجي":(wet?"لدورة مياه":"لغرفة");
  if(o.w<min)add(ext?"wr":"in","c-dw",
   `${o.id} ${okName(o.kind)}: عرضه ${m2(o.w)} م — الحدّ `
   +`الإرشادي ${m2(min)} م ${why}`,"open",o.id,p);
  if(o.h<CODE.doorH)add("in","c-dh",
   `${o.id}: ارتفاعه ${m2(o.h)} م دون ${m2(CODE.doorH)} م`,
   "open",o.id,p);
 });

 /* ═══ الشبابيك: الجلسة المنخفضة ═══ */
 S.opens.filter(o=>GLASS.test(o.kind)).forEach(o=>{
  if(o.sill>=CODE.sillLow)return;
  const w=wallById(o.wall);
  add("in","c-sill",
   `${o.id} ${okName(o.kind)}: جلسته ${m2(o.sill)} م دون `
   +`${m2(CODE.sillLow)} م — يحتاج حمايةً أو زجاجاً أمان`,
   "open",o.id,w?openPt(w,o.s):null);
 });

 /* ═══ المناطق: المساحة والضوء والتهوية والعرض ═══ */
 S.areas.forEach(a=>{
  if(!a.ring||a.ring.length<3)return;
  const cls=classOf(a);
  const A=netArea(a);
  const at=labelPt(a)||centroid(a.ring);
  const nm=a.name||a.id;

  if(cls==="room"&&A<CODE.roomMin)add("wr","c-amin",
   `${a.id} ${nm}: ${sqm(A)} م² دون الحدّ الإرشادي `
   +`${sqm(CODE.roomMin)} م² للغرفة`,"area",a.id,at);
  if(cls==="wet"&&A<CODE.wetMin)add("in","c-amin",
   `${a.id} ${nm}: ${sqm(A)} م² دون ${sqm(CODE.wetMin)} م² `
   +`لدورة المياه`,"area",a.id,at);

  /* الممرّ: أدنى ضلعٍ لصندوقه المحيط تقريبٌ معلَن، لا قياسُ عرضٍ
     حقيقي لمضلّعٍ منحرف. يُنبّه ولا يُجزَم. */
  if(cls==="corr"){
   const b=bboxOf(a.ring);
   const wdt=b?Math.min(b.x1-b.x0,b.y1-b.y0):0;
   if(wdt&&wdt<CODE.corrW)add("wr","c-corr",
    `${a.id} ${nm}: أضيق بُعدٍ لصندوقه ${m2(wdt)} م دون `
    +`${m2(CODE.corrW)} م — تقريبٌ من الصندوق المحيط، تحقّق `
    +`بالقياس`,"area",a.id,at);
  }
  if(cls!=="room"&&cls!=="kitchen")return;

  /* الضوء من الزجاج على الجدران الخارجية وحدها */
  const L=inArea.get(a.id)||[];
  const gl=L.filter(x=>GLASS.test(x.o.kind)&&x.w.type==="ext")
   .reduce((s,x)=>s+x.o.w*x.o.h,0);
  const vt=L.filter(x=>x.o.kind==="window"&&x.w.type==="ext")
   .reduce((s,x)=>s+x.o.w*x.o.h,0);
  if(!A)return;
  if(gl/A<CODE.light)add(gl?"wr":"er","c-light",
   `${a.id} ${nm}: زجاج ${sqm(gl)} م² على أرضية ${sqm(A)} م² `
   +`= ${(gl/A*100).toFixed(1)}% دون `
   +`${(CODE.light*100).toFixed(0)}% للإضاءة`
   +(gl?"":" — لا شباك على جدارٍ خارجي"),"area",a.id,at);
  else if(vt/A<CODE.vent)add("wr","c-vent",
   `${a.id} ${nm}: القابل للفتح ${sqm(vt)} م² `
   +`= ${(vt/A*100).toFixed(1)}% دون `
   +`${(CODE.vent*100).toFixed(0)}% للتهوية — الثابت لا يُهوّي`,
   "area",a.id,at);
 });
 return F;
}
