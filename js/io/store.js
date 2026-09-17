/* ═══ التخزين الدائم ═══
   IndexedDB أوّلاً و localStorage بديلاً. ثلاثة مكاسب:

   ١ · لا حدَّ عملياً — كان الحدّ ٥ م.ب، ومرجعٌ مستورد بستّين ألف
       كيانٍ يتجاوزه، فيفشل الحفظ التلقائي.
   ٢ · لا JSON.stringify — النسخ البنيوي يقبل الكائن كما هو، فيسقط
       تسلسلُ كل شيءٍ كل سبعمئة مللي.
   ٣ · الفشل يُقال. كان catch(e){} صامتاً، فيفقد المستخدم الحفظ
       التلقائي ولا يعلم.

   وليس فيه استيرادٌ واحد بقصد: ورقةٌ في شجرة الاعتماد، فاستيراده
   من core/state.js لا يصنع دورةً ولا يقلب اتجاهاً. */

const DB="mistar", STORE="state", SNAPS="snaps", KEY="doc", DBV=2;
export const LSK="mistar.v1";

let dbP=null, MODE="?", FAIL=0, LAST="";
export const mode=()=>MODE;
export const failed=()=>FAIL;

function open(){
 if(dbP)return dbP;
 dbP=new Promise(res=>{
  if(typeof indexedDB==="undefined"){MODE="ls"; res(null); return}
  let rq;
  /* المتصفّح في وضعٍ خاصّ قد يرمي من الفتح نفسه لا من الحدث */
  try{rq=indexedDB.open(DB,DBV)}
  catch(e){MODE="ls"; res(null); return}
  rq.onupgradeneeded=()=>{
   const d=rq.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE);
   if(!d.objectStoreNames.contains(SNAPS))d.createObjectStore(SNAPS);
  };
  rq.onsuccess=()=>{MODE="idb"; res(rq.result)};
  rq.onerror  =()=>{MODE="ls";  res(null)};
  rq.onblocked=()=>{MODE="ls";  res(null)};
 });
 return dbP;
}
/* ═══ الطابع والعلامة ═══
   الطابع يحكم بين النسختين: الكتابة الأخيرة عند الإغلاق تقع في
   localStorage، فلا يجوز أن تحجبها نسخةٌ أقدم في IndexedDB.
   و__lite يقول إن النسخة منقوصة، فلا تحجب كاملةً أقدم منها:
   الأحدث ليس الأصحّ إن كان ناقصاً. وكان غيابُ هذه العلامة يُفقِد
   المرجعَ المستورد كلَّه عند أول إغلاقٍ لا يتّسع فيه localStorage. */
const stamp=(o,lite)=>{
 const r=Object.assign({},o,{__t:Date.now()});
 if(lite)r.__lite=1; else delete r.__lite;
 return r;
};
/* المرجع وحده هو ما يُنقَص، فدمجُه من النسخة الكاملة يُتِمّ الناقصة.
   ويُعاد كائنٌ جديد: النسختان المقروءتان لا تُمَسّان. */
const heal=(lite,full)=>{
 if(!lite||!lite.__lite||!full||!full.ref)return lite;
 const n=(full.ref.ents||[]).length;
 if(!n)return lite;
 const o=Object.assign({},lite,{ref:full.ref});
 delete o.__lite;
 o.__healed=n;
 return o;
};
function saveLS(o){
 if(typeof localStorage==="undefined")return {ok:0,via:"none"};
 try{
  const s=JSON.stringify(o);
  localStorage.setItem(LSK,s);
  FAIL=0; LAST="ls";
  return {ok:1,via:"ls",bytes:s.length};
 }catch(e){
  FAIL++;
  return {ok:0,via:"ls",err:(e&&e.name)||"خطأ",
   refs:(o&&o.ref&&o.ref.ents)?o.ref.ents.length:0};
 }
}
export async function save(obj){
 const o=stamp(obj);                /* كاملةٌ صريحاً — بلا __lite */
 const d=await open();
 if(d){
  try{
   await new Promise((res,rej)=>{
    const tx=d.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(o,KEY);
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error);
    tx.onabort =()=>rej(tx.error);
   });
   FAIL=0; LAST="idb";
   return {ok:1,via:"idb"};
  }catch(e){MODE="ls"}     /* الحصّة أو التلف ⇒ نهبط ونُبلّغ */
 }
 return saveLS(o);
}
export async function load(){
 let idb=null, ls=null;
 const d=await open();
 if(d){
  try{
   idb=await new Promise((res,rej)=>{
    const tx=d.transaction(STORE,"readonly");
    const rq=tx.objectStore(STORE).get(KEY);
    rq.onsuccess=()=>res(rq.result||null);
    rq.onerror  =()=>rej(rq.error);
   });
  }catch(e){}
 }
 if(typeof localStorage!=="undefined"){
  try{
   const raw=localStorage.getItem(LSK);
   if(raw){
    const o=JSON.parse(raw);
    if(o&&Array.isArray(o.walls))ls=o;
   }
  }catch(e){}
 }
 const tI=(idb&&+idb.__t)||0, tL=(ls&&+ls.__t)||0;
 /* الناقصة الأحدث تُرمَّم من الكاملة الأقدم: رسمك من الأحدث،
    والمرجع من الأقدم — فلا يُفقَد أيٌّ منهما.
    والشرط الزمنيّ لازم: الترميم يُثبَّت في IndexedDB فوراً فيصير
    أحدث، فلو رمّمنا بلا شرطٍ لتكرّر التنبيه في كل إقلاع. */
 if(ls&&ls.__lite&&idb&&tL>tI){
  const h=heal(ls,idb);
  if(h.__healed)return {data:h,via:"healed",refs:h.__healed};
 }
 if(idb&&ls&&idb.__lite&&!ls.__lite&&tI>=tL){
  /* الحالة المقابلة: idb ناقصة وls كاملة */
  const h=heal(idb,ls);
  if(h.__healed)return {data:h,via:"healed",refs:h.__healed};
 }
 if(idb&&(!ls||tI>=tL))return {data:idb,via:"idb"};
 /* migrate لا تُعلَن إلّا إن كان IndexedDB متاحاً ولا شيء فيه —
    وهو معنى الكلمة. وكانت تُعلَن كلَّ إقلاعٍ لأن flushSync يجعل
    ls أحدث دائماً، فيُكتَب IndexedDB ولا يُقرَأ في المسار المعتاد
    — وهو الغرض المُعلَن للملفّ كلّه. */
 if(ls)return {data:ls,via:(d&&!idb)?"migrate":"ls"};
 return null;
}
export async function del(){
 const d=await open();
 if(d){
  try{
   await new Promise(res=>{
    const tx=d.transaction(STORE,"readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete=res; tx.onerror=res; tx.onabort=res;
   });
  }catch(e){}
 }
 try{localStorage.removeItem(LSK)}catch(e){}
}
/* ═══ الكتابة الأخيرة ═══
   عند إغلاق الصفحة لا يُعتمَد على IndexedDB: معاملاته غير متزامنة
   وقد تُقطَع. فنكتب متزامناً في localStorage بطابعٍ أحدث.
   وإن لم يتّسع: نكتب بلا المرجع المستورد ونُعلِّمها منقوصةً — فيبقى
   رسمك كلّه، ويُرمَّم المرجع من الكاملة عند الفتح. الصمت هنا هو
   الخطأ الحقيقي، وحجبُ الكاملة بالمنقوصة أسوأ منه. */
export function flushSync(obj){
 if(typeof localStorage==="undefined")return {ok:0,via:"none"};
 try{
  localStorage.setItem(LSK,JSON.stringify(stamp(obj)));
  return {ok:1,via:"ls"};
 }catch(e){}
 const n=(obj&&obj.ref&&obj.ref.ents)?obj.ref.ents.length:0;
 try{
  const lite=stamp(Object.assign({},obj,
   {ref:Object.assign({},obj.ref||{},{ents:[]})}),1);
  localStorage.setItem(LSK,JSON.stringify(lite));
  return {ok:1,via:"ls",lite:1,refs:n};
 }catch(e2){FAIL++; return {ok:0,via:"ls",err:(e2&&e2.name)||"خطأ"}}
}
/* ═══ المسح الكامل ═══
   كل ما يُخزّنه البرنامج في هذا المتصفّح: المشروع وجلسته وتفضيلات
   الواجهة وأسطح العمل وخيارات الأدوات وإعداد المزوّد ومفتاحه.
   ولا سبيل إليه من الواجهة قبل الدفعة ٤ إلّا من أدوات المطوّر — وهو
   مطلبٌ عمليّ لمن يستعمل حاسباً مشتركاً.
   ولا يمسّ ما حفظه المستخدم ملفّاً على قرصه. */
export const LSKEYS=[LSK,"mistar.ui","mistar.opts","mistar.ai",
 "mistar.snaps","mistar.code"];
export async function purge(){
 const out={ls:0,idb:0,keys:[]};
 if(typeof localStorage!=="undefined")LSKEYS.forEach(k=>{
  try{
   if(localStorage.getItem(k)==null)return;
   localStorage.removeItem(k);
   out.ls++; out.keys.push(k);
  }catch(e){}
 });
 try{await del()}catch(e){}
 /* الاتّصال يُغلَق قبل الحذف: قاعدةٌ مفتوحة تحجب deleteDatabase */
 try{
  const d=await open();
  if(d&&d.close)d.close();
 }catch(e){}
 dbP=null; MODE="?";
 try{
  if(typeof indexedDB!=="undefined"&&indexedDB.deleteDatabase){
   indexedDB.deleteDatabase(DB);
   out.idb=1;
  }
 }catch(e){}
 return out;
}

/* ═══ اللقطات ═══ */
export async function snapPut(id,obj){
 const d=await open();
 if(!d)return {ok:0,via:"none"};
 try{
  await new Promise((res,rej)=>{
   const tx=d.transaction(SNAPS,"readwrite");
   tx.objectStore(SNAPS).put(obj,id);
   tx.oncomplete=res; tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error);
  });
  return {ok:1,via:"idb"};
 }catch(e){return {ok:0,via:"idb",err:(e&&e.name)||"خطأ"}}
}
export async function snapGet(id){
 const d=await open();
 if(!d)return null;
 try{
  return await new Promise((res,rej)=>{
   const tx=d.transaction(SNAPS,"readonly");
   const rq=tx.objectStore(SNAPS).get(id);
   rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error);
  });
 }catch(e){return null}
}
export async function snapDel(id){
 const d=await open();
 if(!d)return;
 try{
  await new Promise(res=>{
   const tx=d.transaction(SNAPS,"readwrite");
   tx.objectStore(SNAPS).delete(id);
   tx.oncomplete=res; tx.onerror=res; tx.onabort=res;
  });
 }catch(e){}
}
