/* ═══ الطبقات: الجدول الحيّ والسياسة ═══
   الجدول بياناتُ مشروع: يُحفَظ في الملفّ ويدخل التاريخ، لأن إخفاء
   طبقةٍ أو وزنَ خطّها يغيّر ما يُصدَّر — فهو حالةُ رسمٍ لا حالة
   نافذة.

   وresolve هي المكسب الأكبر: مصدرٌ واحد للون والوزن والنوع
   والشفافية يقرأه القماش والمصدِّرون الأربعة. كان لكلٍّ نسخته
   (LAYERS.css · theme.PRINT · LAYERS.c)، وكانت تنجرف.

   والهندسة لا تُخفى: regionLoops (في render.js) لا يقرأ هذا
   الملفّ أصلاً. */
import {S,VER,touch} from "./state.js";
import {LAYERS as BASE,PRN,LT,LWS,ORDER,DESC,AUX,
        DEFLAYS,layRow,ltOf,lwOk} from "./laydef.js";
import {ENT,ORD} from "./entreg.js";

export {LT,LWS,AUX,ltOf,lwOk,DESC};
export const HEX=/^#[0-9a-fA-F]{6}$/;
export const isInternal=L=>/^__/.test(String(L||""));

/* ═══ الوصول ═══ فهرسٌ بالاسم مُكاشٌ على النسخة الهندسية ═══
   جدول الطبقات بياناتُ مشروع: كلُّ كاتبٍ فيه ينادي invalidate
   صريحاً (setLay · showAll · isolate · stateApply · resetLays)،
   ولقطةُ التاريخ تُقدّم النسخة الهندسية. فالمفتاح g لا n —
   وكان n يُفرِغ كاش الألوان في كل إطارٍ أثناء سحب بُعد، وهو
   يُنادى لكل أوّلية. */
let IX=null, IXV=-1;
function index(){
 if(IXV===VER.g&&IX)return IX;
 IX=new Map();
 (S.layers||[]).forEach(l=>IX.set(l.n,l));
 IXV=VER.g;
 return IX;
}
export const LAYS=()=>S.layers||[];
export const layNames=()=>LAYS().map(l=>l.n);
export const layOf=n=>index().get(n)||null;
export const hasLay=n=>index().has(n);
export const layLabel=n=>{
 const l=layOf(n);
 return l?(l.d||n):(DESC[n]||n);
};
export const LNAME=layLabel;   /* توافقٌ لمن كان يستوردها بهذا الاسم */

/* ═══ السياسة ═══
   الطبقة المجهولة تُرى ولا تُقفَل: كيانٌ على طبقةٍ حُذفت لا يُختفي
   صامتاً — يبقى مرئياً حتى تقرّر فيه. والتشخيص الداخلي (__) يُرى
   دائماً ولا يُقفَل أبداً. */
export const vis=n=>{
 if(isInternal(n))return true;
 const l=layOf(n);
 return l?!l.off:true;
};
export const locked=n=>{
 if(isInternal(n))return false;
 const l=layOf(n);
 return l?!!l.lk:false;
};
export const plots=n=>{
 if(isInternal(n))return false;
 const l=layOf(n);
 return l?!!l.plot:true;
};
export function layOfEnt(s){
 if(!s)return null;
 const d=ENT[s.k];
 if(!d)return null;
 const e=d.byId(s.id);
 return e?d.lay(e):null;
}
/* ما لا يُحدَّد لا يُعدَّل ولا يُحذَف — حرسٌ في موضعٍ واحد */
export function pickable(s){
 const L=layOfEnt(s);
 if(!L)return true;
 return vis(L)&&!locked(L);
}
export const entVis=s=>{
 const L=layOfEnt(s);
 return L?vis(L):false;
};
export const entLocked=s=>{
 const L=layOfEnt(s);
 return L?locked(L):false;
};
export const anyHidden=()=>LAYS().some(l=>l.off);
export const anyLocked=()=>LAYS().some(l=>l.lk);
export const hiddenLayers=()=>LAYS().filter(l=>l.off).map(l=>l.n);
export const lockedLayers=()=>LAYS().filter(l=>l.lk).map(l=>l.n);
export const noPlotLayers=()=>LAYS().filter(l=>!l.off&&!l.plot)
 .map(l=>l.n);

/* ═══ العدّ ═══ */
export function layCounts(){
 const c={};
 const inc=L=>{if(L)c[L]=(c[L]||0)+1};
 ORD.forEach(d=>(S[d.coll]||[]).forEach(e=>inc(d.lay(e))));
 c["A-GRID"]=S.grid.xs.length+S.grid.ys.length;
 c["A-WALL-PATT"]=(S.opt.fill!=="none")?(c["A-WALL"]||0):0;
 c["A-REFR"]=(S.ref&&S.ref.ents)?S.ref.ents.length:0;
 c["A-SHET"]=+S.sheet.on?1:0;
 return c;
}
/* عدد الكيانات المستثناة من العرض والتصدير */
export function hiddenCount(){
 const c=layCounts();
 let n=0;
 LAYS().forEach(l=>{
  if(l.off&&l.n!=="A-WALL-PATT")n+=(c[l.n]||0);
 });
 return n;
}
export function noPlotCount(){
 const c=layCounts();
 let n=0;
 noPlotLayers().forEach(L=>{
  if(L==="A-WALL-PATT")return;
  n+=(c[L]||0);
 });
 return n;
}
/* الأوّليات المرئيّة وحدها — الترتيب يبقى كما بُني */
export const filterPrims=P=>(P||[]).filter(g=>vis(g.L||"0"));

/* ═══ resolve ═══
   mode: dark | light | plot
   يعيد ما يحتاجه الرسم والتصدير معاً:
     css    لونٌ نصّي
     aci    رقم DXF
     lw     وزنٌ بمئات المليمتر (0 = افتراضي)
     lt     مفتاح النوع · dxf اسمه · dash شُرَطُه بالمليمتر الورقي
     op     شفافية ٠–٩٠٪ · a معامل الرسم
     off · lk · plot
   ومُكاشٌ على النسخة والوضع: يُنادى لكل أوّليةٍ في كل إطار. */
const RC=new Map();
let RCV=-1;
function fresh(){
 if(RCV!==VER.g){RC.clear(); RCV=VER.g}
 return RC;
}
/* ثابتٌ واحدٌ يُعاد لكل طبقةٍ مجهولة — مجمَّدٌ لئلا يُفسِده مَن
   يعدّله ظنّاً أنه نسخةٌ خاصّة به؛ وله n كما للمسار السليم، وإلا
   عادت resolve(L).n بـundefined للمجهولة وحدها. */
const MISS=Object.freeze({n:null,css:"#e8eef4",aci:7,lw:0,lt:"solid",
 dxf:"CONTINUOUS",dash:[],op:0,a:1,off:0,lk:0,plot:1,miss:1});

export function resolve(n,mode){
 const m=(mode==="plot"||mode==="light")?mode:"dark";
 const k=m+"|"+n;
 const C=fresh();
 const hit=C.get(k);
 if(hit)return hit;
 const l=layOf(n);
 if(!l){C.set(k,MISS); return MISS}
 const t=ltOf(l.lt);
 const op=Math.max(0,Math.min(90,+l.op||0));
 const r={
  n,
  css:(m==="dark")?l.col:l.pcol,
  aci:l.aci, lw:l.lw|0,
  lt:l.lt, dxf:t.dxf, dash:t.mm,
  op, a:1-op/100,
  off:!!l.off, lk:!!l.lk, plot:!!l.plot};
 C.set(k,r);
 return r;
}
/* ═══ نسخة الجدول ═══
   تصفيةُ الأوّليات تتبع جدولَ الطبقات وحده، وكلُّ كاتبٍ فيه يُنادي
   invalidate صريحاً (setLay · showAll · isolate · plotAll ·
   stateApply · resetLays · normLays). فلو صُفِّيت على VER.g لأُعيدت
   تصفيةُ ستّين ألف أوّليةٍ مرجعية في كل إطارٍ من سحب جدار. */
let LV=1;
export const layVer=()=>LV;
export const invalidate=()=>{LV++; RCV=-1; IXV=-1};

/* ═══ الكتابة ═══
   لا تُنادى داخل edit(): المستدعي يلفّها كما يلفّ أي تعديل، فتدخل
   التاريخَ خطوةً واحدة ولو غيّرتَ عدّة حقول. */
const FLD={
 col:v=>HEX.test(String(v))?String(v).toLowerCase():null,
 pcol:v=>HEX.test(String(v))?String(v).toLowerCase():null,
 aci:v=>{const n=Math.round(+v); return (n>=0&&n<=256)?n:null},
 lw:v=>lwOk(v),
 lt:v=>LT[v]?v:null,
 op:v=>{const n=Math.round(+v||0); return Math.max(0,Math.min(90,n))},
 off:v=>(v?1:0), lk:v=>(v?1:0), plot:v=>(v?1:0),
 d:v=>String(v==null?"":v).slice(0,48)
};
export function setLay(n,f,v){
 const l=layOf(n);
 if(!l)return false;
 const fn=FLD[f];
 if(!fn)return false;
 const nv=fn(v);
 if(nv===null||nv===undefined)return false;
 /* القفل على طبقةٍ مساعدة بلا معنى: لا كياناتَ تُحدَّد عليها */
 if(f==="lk"&&AUX.has(n))return false;
 if(l[f]===nv)return true;
 l[f]=nv;
 invalidate();
 touch();
 return true;
}
export function showAll(){
 let n=0;
 LAYS().forEach(l=>{if(l.off){l.off=0; n++}});
 if(n){invalidate(); touch()}
 return n;
}
export function unlockAll(){
 let n=0;
 LAYS().forEach(l=>{if(l.lk){l.lk=0; n++}});
 if(n){invalidate(); touch()}
 return n;
}
export function plotAll(){
 let n=0;
 LAYS().forEach(l=>{if(!l.plot){l.plot=1; n++}});
 if(n){invalidate(); touch()}
 return n;
}
/* عزل: يُخفي ما عدا المذكورة — ويُعاد بـ showAll */
export function isolate(keep){
 const K=new Set(Array.isArray(keep)?keep:[keep]);
 let n=0;
 LAYS().forEach(l=>{
  const off=K.has(l.n)?0:1;
  if(l.off!==off){l.off=off; n++}
 });
 if(n){invalidate(); touch()}
 return n;
}
export function resetLays(){
 S.layers=DEFLAYS();
 invalidate(); touch();
 return S.layers.length;
}
export const toggleOff =L=>{const r=setLay(L,"off",vis(L)?1:0); return r};
export const toggleLock=L=>{const r=setLay(L,"lk",locked(L)?0:1); return r};

/* ═══ حالات الطبقات ═══
   لقطةٌ مسمّاة للحقول التي يُحتمَل تبديلها بين مراحل العمل. لا
   تحمل الوصف ولا الاسم: هيئةٌ لا هويّة. */
const SNAPF=["off","lk","plot","col","pcol","lw","lt","op"];
export const layStates=()=>Object.keys(S.layst||{});
export function stateSave(name){
 const nm=String(name||"").trim().slice(0,32);
 if(!nm)return false;
 S.layst=S.layst||{};
 const o={};
 LAYS().forEach(l=>{
  const r={};
  SNAPF.forEach(f=>{r[f]=l[f]});
  o[l.n]=r;
 });
 S.layst[nm]=o;
 touch();
 return nm;
}
export function stateApply(name){
 const o=(S.layst||{})[name];
 if(!o)return 0;
 let n=0;
 LAYS().forEach(l=>{
  const r=o[l.n];
  if(!r)return;
  SNAPF.forEach(f=>{
   if(r[f]===undefined)return;
   const nv=FLD[f]?FLD[f](r[f]):r[f];
   if(nv===null||nv===undefined)return;
   if(l[f]!==nv){l[f]=nv; n++}
  });
 });
 if(n){invalidate(); touch()}
 return n;
}
export function stateDel(name){
 if(!S.layst||!S.layst[name])return false;
 delete S.layst[name];
 touch();
 return true;
}
/* ═══ التطبيع ═══ يُنادى من ensureShape ═══
   جدولٌ محرَّرٌ يدوياً أو من إصدارٍ أقدم يُصلَح شكلاً: الناقص يُستكمل
   من مصنعه، والمجهول يُنبَذ، والترتيب يبقى كما حفظه المستخدم. */
export function normLays(){
 const def=DEFLAYS();
 const D=new Map(def.map(l=>[l.n,l]));
 const src=Array.isArray(S.layers)?S.layers:[];
 const out=[], seen=new Set();
 src.forEach(raw=>{
  if(!raw||typeof raw!=="object")return;
  const n=String(raw.n||"");
  if(!D.has(n)||seen.has(n))return;   /* مجهولةٌ أو مكرّرة */
  seen.add(n);
  const base=D.get(n), l={n};
  Object.keys(FLD).forEach(f=>{
   const v=(raw[f]===undefined)?base[f]:FLD[f](raw[f]);
   l[f]=(v===null||v===undefined)?base[f]:v;
  });
  if(AUX.has(n))l.lk=0;
  out.push(l);
 });
 /* المفقودة تُضاف في موضعها من الترتيب المصنعي */
 def.forEach((l,i)=>{
  if(seen.has(l.n))return;
  const at=out.findIndex(x=>def.findIndex(y=>y.n===x.n)>i);
  if(at<0)out.push(l); else out.splice(at,0,l);
 });
 S.layers=out;
 /* ═══ الهجرة ═══
    S.lay القديم كان {اسم:{off,lock}} — يُطوى في الجدول ثم يُطرَح.
    ويُقرأ مرّةً واحدة، فمشروعٌ محفوظٌ قبل هذه الخطوة يفتح على
    حالة طبقاته نفسها لا على المصنع. */
 if(S.lay&&typeof S.lay==="object"){
  const IX2=new Map(S.layers.map(l=>[l.n,l]));
  Object.keys(S.lay).forEach(n=>{
   const l=IX2.get(n);
   const o=S.lay[n];
   if(!l||!o||typeof o!=="object")return;
   if(o.off!==undefined)l.off=o.off?1:0;
   if(o.lock!==undefined&&!AUX.has(n))l.lk=o.lock?1:0;
  });
  delete S.lay;
 }
 if(!S.layst||typeof S.layst!=="object")S.layst={};
 Object.keys(S.layst).forEach(k=>{
  if(!S.layst[k]||typeof S.layst[k]!=="object")delete S.layst[k];
 });
 invalidate();
 return S.layers.length;
}
