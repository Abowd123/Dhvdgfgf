/* ═══ حفظ المشروع وفتحه · التنزيل · اختيار الملفّ ═══
   الملفّ نصٌّ صريح: كل ما رسمته وكل خياراتك، بلا حقل مشتقّ واحد. */
import {S,pack,loadState,ensureShape,clearHistory,
        LSK} from "../core/state.js";
import {toJSON as blocksJSON,fromJSON as blocksLoad} from "../core/blocks.js";
import {toJSON as priceJSON,fromJSON as priceLoad} from "../core/pricing.js";
import {toJSON as ulJSON,fromJSON as ulLoad} from "../core/underlay.js";

/* تبقى النسخة 1 لأجل توافق ملفات المشروع واختبارات المستورد الحالية؛
   الحقول الإضافية اختيارية وتُقرأ بلا كسر للملفات القديمة. */
export const VERSION=1;

export function toJSON(){
 const d=pack();
  return JSON.stringify(Object.assign({
  __app:"mistar", __ver:VERSION,
   __saved:new Date().toISOString()},d,{
   blockDefs:blocksJSON(), pricing:priceJSON(), underlay:ulJSON()}),null,1);
}
export function fromJSON(txt){
 let d=null;
 try{d=JSON.parse(txt)}
 catch(e){throw new Error("الملفّ ليس JSON صالحاً")}
 if(!d||typeof d!=="object")throw new Error("الملفّ فارغ");
 if(d.__app&&d.__app!=="mistar")
  throw new Error(`الملفّ من «${d.__app}» لا من مِسطَر`);
 if(!Array.isArray(d.walls))
  throw new Error("لا مصفوفة جدران — ليس ملفّ مِسطَر");
 loadState(d,true);
  /* توافق مع النسخة الأولى من اقتراح العناصر التي سمت التعريفات blocks. */
  if(d.blockDefs)blocksLoad(d.blockDefs);
  else if(d.blocks&&typeof d.blocks==="object"&&!Array.isArray(d.blocks))
   blocksLoad(d.blocks);
  if(d.pricing)priceLoad(d.pricing);
  if(d.underlay)ulLoad(d.underlay);
 ensureShape();
 clearHistory();
 return {walls:S.walls.length, opens:S.opens.length,
  areas:S.areas.length, dims:S.dims.length,
  chains:S.chains.length, anno:S.anno.length,
  cols:S.cols.length, fixt:S.fixt.length,
  stairs:S.stairs.length,
   blocks:Array.isArray(S.blocks)?S.blocks.length:0,
  ref:(S.ref&&S.ref.ents)?S.ref.ents.length:0,
  ver:d.__ver||0};
}
export function dl(name,data,mime){
 const b=(data instanceof Blob)?data
  :new Blob([data],{type:mime||"application/octet-stream"});
 const u=URL.createObjectURL(b);
 const a=document.createElement("a");
 a.href=u; a.download=name;
 document.body.appendChild(a);
 a.click();
 setTimeout(()=>{URL.revokeObjectURL(u); a.remove()},1200);
 return b.size;
}
/* ═══ سقف الحجم ═══
   pairs(txt) يبني مصفوفةً من زوجٍ لكل سطرَين، فملفٌّ ٢٠٠ م.ب يعطي
   ملايين المصفوفات قبل أن يبدأ التحويل — والخيط الرئيسي محتجزٌ بلا
   مؤشّرٍ ولا إلغاء. فالسؤال قبل القراءة لا بعدها. */
export const MAXFILE=24*1024*1024;      /* ٢٤ م.ب */

export function pickFile(cb,max){
 const i=document.createElement("input");
 i.type="file"; i.accept=".json,.mistar,application/json";
 i.onchange=()=>{
  const f=i.files&&i.files[0];
  if(!f){cb(null,null);return}
  const lim=max||MAXFILE;
  if(f.size>lim&&!confirm(
   `الملفّ ${humanSize(f.size)} — أكبر من ${humanSize(lim)}. `
   +`متابعة؟`)){cb(null,null); return}
  const r=new FileReader();
  r.onload=()=>cb(String(r.result||""),f.name);
  r.onerror=()=>cb(null,null);
  r.readAsText(f,"utf-8");
 };
 i.click();
}
/* قارئ ثنائي — DXF قد يكون CP1256 فلا يُقرأ نصّاً مباشرةً */
export function pickBin(accept,cb,max){
 const i=document.createElement("input");
 i.type="file";
 i.accept=accept||".dxf";
 i.onchange=()=>{
  const f=i.files&&i.files[0];
  if(!f){cb(null,null);return}
  const lim=max||MAXFILE;
  if(f.size>lim&&!confirm(
   `الملفّ ${humanSize(f.size)} — أكبر من ${humanSize(lim)}. `
   +`تحليله قد يُجمِّد الصفحة دقائق ولا يمكن إلغاؤه. متابعة؟`)){
   cb(null,null); return;
  }
  const r=new FileReader();
  r.onload=()=>cb(r.result,f.name);
  r.onerror=()=>cb(null,null);
  r.readAsArrayBuffer(f);
 };
 i.click();
}
export const humanSize=n=>(n<1024)?`${n} بايت`
 :((n<1048576)?`${(n/1024).toFixed(1)} ك.ب`
 :`${(n/1048576).toFixed(2)} م.ب`);
