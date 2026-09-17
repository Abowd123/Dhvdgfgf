/* ═══ المزوّد ═══ الموضع الوحيد الذي يخرج منه شيء من هذا الجهاز.
   الإعداد في localStorage لا في المشروع — فلا يُحفَظ ولا يُصدَّر.
   واجهة OpenAI-متوافقة، فتصلح لـ OpenAI و Groq و OpenRouter
   و Ollama و llama.cpp المحلّيين بلا تغيير كود. */
const K="mistar.ai";
export const AI={url:"http://localhost:11434/v1/chat/completions",
 key:"", model:"", temp:0, vision:0, maxLines:200, on:0,
 keep:0,              /* الافتراضي: المفتاح للجلسة وحدها */
 wantIns:0, wantTtl:0};

/* قائمةُ سماحٍ للمفاتيح: مخزنٌ معطوب أو محرَّرٌ يدوياً لا يحقن
   حقولاً لا نعرفها في كائنٍ يُرسَل جسمُه في كل نداء */
const KEYS=["url","key","model","temp","vision","maxLines","on",
 "keep","wantIns","wantTtl"];

export function loadAI(){
 if(typeof localStorage==="undefined")return AI;
 try{
  const raw=localStorage.getItem(K);
  if(!raw)return AI;
  const d=JSON.parse(raw)||{};
  KEYS.forEach(k=>{if(d[k]!==undefined)AI[k]=d[k]});
  AI.url=String(AI.url||"").slice(0,300);
  AI.key=String(AI.key||"");
  AI.model=String(AI.model||"").slice(0,80);
  AI.temp=Math.max(0,Math.min(1,+AI.temp||0));
  AI.maxLines=Math.max(1,Math.min(2000,+AI.maxLines||200));
  ["vision","on","keep","wantIns","wantTtl"]
   .forEach(k=>{AI[k]=AI[k]?1:0});
  delete AI.__ok;          /* موافقةُ جلسةٍ لا تُستعاد */
 }catch(e){}
 return AI;
}
export function saveAI(){
 if(typeof localStorage==="undefined")return;
 try{
  const o={};
  KEYS.forEach(k=>{o[k]=AI[k]});
  if(!AI.keep)o.key="";      /* لا يُكتَب على القرص */
  localStorage.setItem(K,JSON.stringify(o));
 }catch(e){}
}
export const ready=()=>!!(AI.on&&AI.url&&AI.model);
export const isLocal=()=>/^https?:\/\/(localhost|127\.|\[::1\])/
 .test(AI.url);
/* عنوانٌ محرَّرٌ يدوياً قد لا يُحلَّل، ولا يجوز أن يُسقط الحوار */
export const hostOf=()=>{
 try{return new URL(AI.url).host}
 catch(e){return String(AI.url||"—").slice(0,60)}
};
let CTRL=null;
export const abort=()=>{if(CTRL){CTRL.abort(); CTRL=null}};
export async function ask(sys,user,img){
 if(!ready())throw new Error("المزوّد غير مُهيَّأ — اضبطه في لوحة "
  +"«المساعد»");
 abort();
 CTRL=new AbortController();
 const content=img
  ? [{type:"text",text:user},
     {type:"image_url",image_url:{url:img}}]
  : user;
 const t0=performance.now();
 let r;
 try{
  r=await fetch(AI.url,{method:"POST",signal:CTRL.signal,
   headers:Object.assign({"content-type":"application/json"},
    AI.key?{authorization:"Bearer "+AI.key}:{}),
   body:JSON.stringify({model:AI.model,
    temperature:+AI.temp||0,
    messages:[{role:"system",content:sys},
              {role:"user",content}]})});
 }catch(e){
  if(e.name==="AbortError")throw new Error("أُلغي الطلب");
  throw new Error("تعذّر الوصول إلى المزوّد: "+e.message
   +(isLocal()?" — هل الخدمة المحلّية تعمل؟":""));
 }
 CTRL=null;
 if(!r.ok){
  const t=await r.text().catch(()=>"");
  throw new Error(`المزوّد ${r.status}: ${t.slice(0,180)}`);
 }
 const j=await r.json();
 const msg=j.choices&&j.choices[0]&&j.choices[0].message;
 if(!msg||msg.content==null)throw new Error("ردٌّ بلا محتوى");
 return {txt:String(msg.content), usage:j.usage||null,
  ms:Math.round(performance.now()-t0)};
}
