/* ═══ الحفظ التلقائي والاستعادة (وحدة مستقلّة اختيارية) ═══
   يخزّن لقطة الحالة في IndexedDB دورياً وعند التغيّر، ويستعيدها بعد
   التعطّل. محليٌّ بالكامل (لا يُرسَل ولا يُصدَّر). لا يفرض شكلاً على S:
   يتلقّى serialize/restore بالحقن فلا يكسر تغليف الحالة.

   ⚠ ملاحظة تكامل: مشروع مِسطَر يملك بالفعل نظام حفظٍ تلقائي كاملاً
   في core/state.js (pack/snapshot/restore/autosave/saveNow) المبنيّ
   على io/store.js والمربوط في app.js حالياً. هذه الوحدة إضافةٌ
   منفصلة (قاعدة IndexedDB مختلفة) ولم تُربَط تلقائياً بـ app.js
   تفادياً لتشغيل نظامي حفظٍ متنافسين. اربطها يدوياً فقط إن كنت
   تنوي استبدال النظام القائم أو استخدامها لغرضٍ آخر (كمسوَّدات
   منفصلة مثلاً). */
const DB="mistar.autosave", STORE="snapshots", KEY="current", DB_VERSION=1;

function openDB(){
 return new Promise((res,rej)=>{
  if(typeof indexedDB==="undefined"){ rej(new Error("لا IndexedDB")); return; }
  const rq=indexedDB.open(DB,DB_VERSION);
  rq.onupgradeneeded=()=>{ const db=rq.result;
   if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
  rq.onsuccess=()=>res(rq.result);
  rq.onerror=()=>rej(rq.error||new Error("فشل فتح القاعدة"));
 });
}
async function idbPut(key,val){ const db=await openDB();
 return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(val,key);
  tx.oncomplete=()=>{ db.close(); res(true); };
  tx.onerror=()=>{ db.close(); rej(tx.error); }; }); }
async function idbGet(key){ const db=await openDB();
 return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readonly");
  const rq=tx.objectStore(STORE).get(key);
  rq.onsuccess=()=>{ db.close(); res(rq.result||null); };
  rq.onerror=()=>{ db.close(); rej(rq.error); }; }); }
async function idbDel(key){ const db=await openDB();
 return new Promise((res)=>{ const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).delete(key);
  tx.oncomplete=()=>{ db.close(); res(true); };
  tx.onerror=()=>{ db.close(); res(false); }; }); }

export function createAutosave(opts={}){
 const serialize=opts.serialize; const restore=opts.restore;
 if(typeof serialize!=="function")
  throw new Error("createAutosave يحتاج serialize()");
 const interval=Math.max(2000, opts.interval||8000);
 let timer=null, dirty=false, last=0, saving=false;

 async function save(force){
  if(saving) return; if(!force && !dirty) return;
  saving=true; dirty=false;
  try{ const snap={ v:1, ts:Date.now(),
    meta:(opts.meta?opts.meta():null), data:serialize() };
   await idbPut(KEY, snap); last=snap.ts; }
  catch(e){ dirty=true; }
  finally{ saving=false; }
 }
 return {
  markDirty(){ dirty=true; },
  saveNow(){ return save(true); },
  start(){ if(timer) return;
   timer=setInterval(()=>save(false), interval);
   window.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden") save(true); });
   window.addEventListener("beforeunload",()=>{ save(true); }); },
  stop(){ if(timer){ clearInterval(timer); timer=null; } },
  async peek(){ const s=await idbGet(KEY).catch(()=>null);
   return s?{ts:s.ts, meta:s.meta}:null; },
  async recover(){ const s=await idbGet(KEY).catch(()=>null);
   if(!s||!s.data) return false;
   if(typeof restore==="function"){ restore(s.data); return true; }
   return false; },
  clear(){ return idbDel(KEY); },
  get lastSaved(){ return last; }
 };
}
