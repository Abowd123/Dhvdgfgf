/* ═══ مخزن الواجهة ═══
   حالة النافذة لا حالة الرسم: مفتاحٌ منفصل لا يدخل pack() ولا
   التاريخ ولا ملفّ المشروع. فتح لوحةٍ ليس تعديلاً على المخطط،
   وحفظ المشروع لا يحمل تفضيلات نافذتك إلى حاسبٍ آخر.

   وS.lay يبقى في المشروع لأن إخفاء طبقةٍ يغيّر ما يُصدَّر — فهو
   حالة رسم. هذا هو الفرق بين المخزنَين، وهو صريح لا ضمنيّ. */

const KEY="mistar.ui";

export const DEFUI=()=>({
 shell:"classic",     /* classic | ribbon — يفعّله المرحلة و١ */
 theme:"dark",        /* dark | light */
 icons:1,
 tab:"home",          /* آخر تبويبٍ نشط */
 ribbonMin:0,         /* الشريط مطويّ */
 clean:0,             /* الشاشة النظيفة */
 ctxAuto:0,           /* الانتقال التلقائي إلى التبويب السياقي */
 layout:null,         /* يُطبَّع في dock.js — DEFLAY مصنعه */
 ws:{},               /* أسطح عملٍ محفوظة بالاسم */
 wsCur:"",            /* السطح الجاري */
 logH:120,
 stHide:{},           /* معرّف عنصرٍ في شريط الحالة ⇒ 1 مخفيّ */
 views:[],            /* مناظر مسمّاة — إحداثيُّ عرضٍ لا بياناتُ رسم */
 compass:1, vpLabel:1, navbar:1, lockUI:0,
 cmdMode:"bottom", cmdOpa:100, cmdX:24, cmdY:0, cmdW:620,
 rclick:"auto",       /* auto | enter | menu */
 qp:1, qpFree:0, qpX:16, qpY:16
});
export const UIS=DEFUI();
let FAIL=0;

export function loadUI(skip){
 if(skip)return false;              /* وضع الإنقاذ: المصنع وحده */
 if(typeof localStorage==="undefined")return false;
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return false;
  const d=JSON.parse(raw);
  if(!d||typeof d!=="object")return false;
  const def=DEFUI();
  Object.keys(def).forEach(k=>{
   if(d[k]!==undefined&&typeof d[k]===typeof def[k])UIS[k]=d[k];
  });
  if(!/^(classic|ribbon)$/.test(UIS.shell))UIS.shell="classic";
  if(!/^(dark|light)$/.test(UIS.theme))UIS.theme="dark";
  UIS.icons=UIS.icons?1:0;
  if(typeof UIS.tab!=="string"||!/^[\w-]{1,16}$/.test(UIS.tab))
   UIS.tab="home";
  ["ribbonMin","clean","ctxAuto"].forEach(k=>{UIS[k]=UIS[k]?1:0});
  UIS.logH=Math.max(0,Math.min(400,+UIS.logH||120));
  /* بعد — الكائن المستوي وحده: المصفوفة تمرّ من typeof فيدخل
     `ws:[]` فيُعطب Object.keys ويُفرغ أسطح العمل صامتاً */
  const plain=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
  if(!plain(UIS.layout))UIS.layout=null;
  if(!plain(UIS.ws))UIS.ws={};
  UIS.ws=Object.fromEntries(Object.entries(UIS.ws).slice(0,24));
  UIS.wsCur=String(UIS.wsCur||"").slice(0,32);
  if(!plain(UIS.stHide))UIS.stHide={};
  UIS.views=(Array.isArray(UIS.views)?UIS.views:[])
   .filter(v=>v&&typeof v.n==="string"&&isFinite(v.k)
    &&isFinite(v.cx)&&isFinite(v.cy)).slice(0,24);
  ["compass","vpLabel","navbar","lockUI"]
   .forEach(k=>{UIS[k]=UIS[k]?1:0});
  if(!/^(bottom|top|float)$/.test(UIS.cmdMode))UIS.cmdMode="bottom";
  if(!/^(auto|enter|menu)$/.test(UIS.rclick))UIS.rclick="auto";
  UIS.cmdOpa=Math.max(40,Math.min(100,+UIS.cmdOpa||100));
  ["qp","qpFree"].forEach(k=>{UIS[k]=UIS[k]?1:0});
  ["cmdX","cmdY","cmdW","qpX","qpY"].forEach(k=>{
   UIS[k]=isFinite(+UIS[k])?Math.round(+UIS[k]):0;
  });
  return true;
 }catch(e){return false}
}
let T=null, ONFAIL=null, WARNED=false;
/* الفشل يُقال مرّةً: الصمت هو ما كان يُفقِد المستخدم تخطيطه بلا
   كلمة، فيكتشفه في الإقلاع التالي — وuiFailed كان يُقرأ في boot
   وحده، فامتلاءٌ وسط الجلسة لا يُبلَّغ عنه أبداً. */
export const setUiError=f=>{ONFAIL=(typeof f==="function")?f:null};
export function saveUI(){
 if(typeof localStorage==="undefined")return;
 if(T)clearTimeout(T);
 T=setTimeout(()=>{
  T=null;
  try{
   localStorage.setItem(KEY,JSON.stringify(UIS));
   FAIL=0;
  }catch(e){
   FAIL++;
   if(!WARNED&&ONFAIL){
    WARNED=true;
    ONFAIL((e&&e.name)||"خطأ");
   }
  }
 },500);
}
export const uiFailed=()=>FAIL;

export function uiSet(k,v){
 if(!(k in UIS))return false;
 UIS[k]=v; saveUI();
 return true;
}
/* ═══ انفتاح اللوحات ═══
   يسكن في layout.p[id].o — مصدرٌ واحد. وpanels.js يكتب هنا عند
   كل طيٍّ أو فتح، فلا يفترق المرسوم عن المحفوظ. */
const pOf=id=>{
 if(!UIS.layout||!UIS.layout.p)return null;
 return UIS.layout.p[id]||null;
};
export function secSet(id,open){
 const p=pOf(id);
 if(!p)return;
 p.o=open?1:0;
 saveUI();
}
export const secOpen=(id,def)=>{
 const p=pOf(id);
 return p?!!p.o:!!def;
};
export function resetUI(){
 const d=DEFUI();
 Object.keys(d).forEach(k=>{UIS[k]=d[k]});
 saveUI();
}
