/* ═══ سجلّ الأدوات ═══
   الأداة = خيارات + خطوات + معاينة. تبقى فعّالة بعد كل عنصر
   حتى Esc، وخياراتها لزجة بين الجلسات.

   الخطوة: {p, k?, loop?, min?, restart?, base?, ent?, ang?,
            confirm?, opts?, each?}
   لا يوجد نظام سكربت: سطر الإدخال يقبل إحداثيات وأسماء أدوات فقط. */

import {S,snapshot,pushHistory,touch,autosave} from "../core/state.js";
import {norm,M,Mx,Nx,m2,clamp} from "../core/units.js";
import {parsePt,angOf,lenOf,D2R} from "../core/coords.js";
import {findById,shapeOf} from "../core/ents.js";
import {jrAdd,jrTaint} from "../core/journal.js";
/* لا دورة: ents.js لا يستورد tools/* */

export const H={
 draw:()=>{}, rep:()=>{}, prompt:()=>{}, refresh:()=>{},
 hit:()=>null, sel:()=>[], setSel:()=>{}, del:()=>null};

/* وضع الدفعة: تنفيذٌ متسلسل بخطوة تراجعٍ واحدة يديرها المُنادي */
export const BATCH={on:0};
export const setBatch=v=>{BATCH.on=v?1:0};

export const TOOLS={};
export const T={id:null,def:null,steps:null,i:0,ctx:null,
 snap:null,ghost:null,lock:null,lenLock:null,last:null,lastArg:null,
 hist:[]};

export function defTool(d){
 TOOLS[d.id]=d;
 (d.alias||"").split(/\s+/).filter(Boolean)
  .forEach(a=>{TOOLS[norm(a)]=d});
 return d;
}
export const findTool=n=>TOOLS[norm(n||"")]||null;
export const toolList=()=>[...new Set(Object.values(TOOLS))];
export const active=()=>!!T.def;
export const step=()=>T.steps?T.steps[T.i]:null;

/* ═══ الأداة الهادمة ═══
   تقصّ أو تحرّك ما هو مرسوم سلفاً. العلَم مُعلَنٌ في تعريف الأداة
   فلا تتخلّف قائمةٌ ثانية عن السجلّ — وكان جدولٌ يدويّ في
   ai/plan.js يفوته «نقل» و«دوران» و«مرآة»، وثلاثتها تحرّك ما هو
   مرسوم. ويُعلَن في lang.js فيراه المزوّد نصّاً، والبوّابة تقرؤه
   كوداً — والتعليمات يمكن التحدّث حولها، والكود لا.
   وموضعُه بعد toolList بقصد: destructList تنادِيه. */
export const isDestruct=d=>!!(d&&d.destruct);
export const destructList=()=>toolList()
 .filter(d=>d&&d.id&&d.destruct)
 .map(d=>({id:d.id,label:d.label}));

/* ═══ خيارات الأدوات — لزجة ═══ */
const OKEY="mistar.opts";
export const OPT={};
export function loadOpts(){
 try{
  const raw=localStorage.getItem(OKEY);
  if(raw)Object.assign(OPT,JSON.parse(raw)||{});
 }catch(e){}
 toolList().forEach(d=>{
  const o=OPT[d.id]=OPT[d.id]||{};
  (d.opts||[]).forEach(f=>{if(o[f.k]===undefined)o[f.k]=f.def});
 });
}
export function saveOpts(){
 try{localStorage.setItem(OKEY,JSON.stringify(OPT))}catch(e){}
}
export function setOpt(tid,k,v){
 (OPT[tid]=OPT[tid]||{})[k]=v;
 saveOpts();
}
/* قارئات القيَم — يستعملها كل أمر رسم */
export const ov=(tid,k)=>{
 const o=OPT[tid]||{};
 return (o[k]===undefined)?null:o[k];
};
export const ovLen=(tid,k)=>M(String(ov(tid,k)==null?"":ov(tid,k)));
export const ovNum=(tid,k)=>{
 const v=parseFloat(ov(tid,k));
 return isFinite(v)?v:0;
};
export const ovOn=(tid,k)=>{
 const v=ov(tid,k);
 return v===1||v===true||v==="1"||v==="true";
};
/* ═══ نقطة الأساس والاتجاه ═══ */
export function baseOf(){
 const st=step();
 if(!st)return null;
 const P=T.ctx?T.ctx.pts:[];
 if(st.base==="none")return null;
 if(typeof st.base==="number")
  return P[st.base<0?P.length+st.base:st.base]||null;
 return P.length?P[P.length-1]:null;
}
export function dirOf(){
 const b=baseOf();
 if(!b)return null;
 if(T.lock!=null)
  return [Math.cos(T.lock*D2R),Math.sin(T.lock*D2R)];
 if(!T.ghost)return null;
 const dx=T.ghost[0]-b[0], dy=T.ghost[1]-b[1];
 const L=Math.hypot(dx,dy);
 return L>1?[dx/L,dy/L]:null;
}
export function promptText(){
 const st=step();
 if(!st)return {tool:"",p:"أداة:",live:""};
 let p=st.p;
 if(st.opts)p+=" ["+Object.keys(st.opts)
  .map(k=>`${st.opts[k].n}(${k.toUpperCase()})`).join("/")+"]";
 const b=baseOf();
 let live="";
 if(b&&T.ghost){
  live=`${(lenOf(b,T.ghost)/1000).toFixed(3)} م  `
      +`${angOf(b,T.ghost).toFixed(1)}°`;
  if(T.lock!=null)live+=`  ⟨قفل ${T.lock}°⟩`;
  if(T.lenLock!=null)live+=`  ⟨طول ${(T.lenLock/1000).toFixed(3)}⟩`;
 }
 return {tool:T.def.label||T.id,p:p+":",live};
}
/* ═══ الدخول والخروج ═══ */
function reset(){
 T.id=null; T.def=null; T.steps=null; T.i=0;
 T.ctx=null; T.snap=null; T.lock=null; T.lenLock=null; T.ghost=null;
}
/* الوسيط: سطر الإدخال يقتطعه بعد اسم الأداة، والأداة تقرؤه من
   ctx.arg. ومن لا يعرفه يتجاهله — فالتعديل لا يمسّ أداةً قائمة. */
export function begin(id,arg){
 const d=(id&&typeof id==="object")?id:findTool(id);
 if(!d){H.rep("wr",`أداة غير معروفة: ${id}`);return false}
 if(T.def)cancel(true);
 T.def=d; T.id=d.id;
 T.steps=(d.steps||[]).slice();
 T.i=0; T.lock=null; T.lenLock=null; T.ghost=null;
 T.ctx={pts:[],v:{},n:0,made:[],
  arg:(arg==null||arg==="")?null:arg};
 T.snap=snapshot();
 T.last=d.id; T.lastArg=T.ctx.arg;
 jrAdd(d.id);
 if(T.ctx.arg)jrTaint("وسيط أداة");
 if(d.start){
  let ok=true;
  try{ok=d.start(T.ctx)}
  catch(e){H.rep("er",e.message);ok=false}
  if(ok===false){
   /* أمرٌ لحظيّ أو تحديدٌ ناقص: نُثبّت ما صنعه إن صنع */
   const n=T.ctx?T.ctx.made.length:0;
   const sn=T.snap, lbl=d.label||d.id;
   reset();
   if(n){
    touch();
    if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
   }
   H.prompt(); H.draw();
   return true;
  }
 }
 H.prompt(); H.draw();
 return true;
}
export function finish(msg){
 const ctx=T.ctx, sn=T.snap, d=T.def, lbl=(d&&(d.label||d.id))||null;
 reset();
 if(d&&d.done&&ctx){try{d.done(ctx)}catch(e){H.rep("er",e.message)}}
 const n=ctx?ctx.made.length:0;
 if(n){
  touch();
  if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
 }
 if(msg)H.rep(n?"ok":"in",msg);
 H.prompt(); H.draw();
}
export function cancel(quiet){
 const ctx=T.ctx, sn=T.snap, lbl=(T.def&&(T.def.label||T.def.id))||null;
 const n=(ctx&&ctx.made.length)||0;
 reset();
 if(ctx)jrAdd("esc");
 if(n){
  touch();
  if(!BATCH.on){pushHistory(sn,lbl); H.refresh(); autosave()}
 }
 if(!quiet)H.rep("in",n?`أُلغي — بقي ${n} عنصر`:"أُلغي");
 H.prompt(); H.draw();
}
/* restart: الأداة تعيد نفسها من الخطوة الأولى بعد كل عنصر —
   تنفيذاً لقاعدة «الأداة تبقى فعّالة حتى Esc» */
function restart(){
 T.i=0; T.lock=null; T.lenLock=null; T.ghost=null;
 if(T.ctx){T.ctx.pts.length=0; T.ctx.v={}; T.ctx.n=0}
 H.prompt();
}
function advance(){
 const st=step();
 if(st&&st.restart){restart(); return}
 if(st&&st.loop){T.ctx.n++; T.lock=null; T.lenLock=null;
  H.prompt(); return}
 T.i++; T.lock=null; T.lenLock=null;
 if(!step())finish(); else H.prompt();
}
export const nextStep=advance;
/* إدراج خطوات فرعية بعد الجارية — للأدوات المتفرّعة مثل rotate R */
export const pushSteps=arr=>{
 if(T.steps)T.steps.splice(T.i+1,0,...(arr||[]));
};
export const rec=(ctx,e,coll)=>{
 if(e&&ctx)ctx.made.push({id:e.id,coll:coll||"walls"});
 return e;
};
export const dirty=ctx=>{if(ctx)ctx.made.push({id:"~",coll:"__"})};

/* ═══ الإدخال بالكتابة على خطوات الكيانات ═══
   يشترك فيه النقر والكتابة: النقر يعطي hit مباشرة، والكتابة
   تحلّ المعرّف أولاً ثم تمرّ بالمسار نفسه (entVia والرفض). */
const entPt=hit=>{
 const sh=shapeOf(hit);
 if(!sh)return null;
 if(sh.t==="pt")return sh.p.slice();
 if(sh.t==="seg")return [Math.round((sh.a[0]+sh.b[0])/2),
                         Math.round((sh.a[1]+sh.b[1])/2)];
 const P=sh.pts||[];
 if(!P.length)return null;
 return [Math.round(P.reduce((s,p)=>s+p[0],0)/P.length),
         Math.round(P.reduce((s,p)=>s+p[1],0)/P.length)];
};
/* نقطة على مسار الكيان بمسافةٍ من بدايته · السالب من نهايته */
const entAlong=(hit,v)=>{
 const sh=shapeOf(hit);
 if(!sh||sh.t!=="seg")
  throw new Error("المسافة على المسار للجدران والدرج وحدها");
 const dx=sh.b[0]-sh.a[0], dy=sh.b[1]-sh.a[1];
 const L=Math.hypot(dx,dy);
 if(L<1)throw new Error("مسارٌ صفري");
 const t=clamp((v<0)?(L+v):v,0,L);
 return [Math.round(sh.a[0]+dx/L*t), Math.round(sh.a[1]+dy/L*t)];
};
function useEnt(st,hit,p){
 if(st.ent!==1&&hit.k!==st.ent){
  /* entVia: بديلٌ مصرَّح به — النقر على فتحةٍ يعني جدارها */
  const via=st.entVia&&st.entVia[hit.k];
  const alt=via?via(hit):null;
  if(!alt)throw new Error(`انقر على ${st.entName||st.ent}`
   +" — أو اكتب معرّفه");
  hit=alt;
 }
 T.ctx.v[st.k||"ent"]=hit;
 if(st.each)st.each(T.ctx,hit,p||entPt(hit));
 advance();
}

/* ═══ التغذية ═══ */
export function feedPoint(p){
 const st=step();
 if(!st)return false;
 if(st.confirm){
  H.rep("wr","هذه الخطوة تحتاج Enter للتأكيد لا نقرة");
  return false;
 }
 try{
  if(st.ent){
   const hit=H.hit(p[0],p[1]);
   if(!hit)throw new Error("لا عنصر هنا");
   useEnt(st,hit,p);
  }else if(st.ang){
   const b=baseOf();
   if(!b)throw new Error("لا نقطة أساس للزاوية");
   const a=angOf(b,p);
   T.ctx.v[st.k||"a"]=a;
   if(st.each)st.each(T.ctx,a);
   advance();
  }else{
   T.ctx.pts.push(p);
   if(st.k)T.ctx.v[st.k]=p;
   if(st.each)st.each(T.ctx,p);
   advance();
  }
 }catch(e){H.rep("er",e.message); H.prompt(); H.draw(); return false}
  jrAdd(`${(p[0]/1000).toFixed(3)},${(p[1]/1000).toFixed(3)}`);
  H.draw(); return true;
}
/* ═══ الضربة الحرّة ═══
   الخطوة تبقى فعّالة: الرسم يتراكم حتى Enter، ولا يُنشأ شيء منه. */
export function feedStroke(pts){
 const st=step();
 if(!st||!st.freehand)return false;
 const P=(pts||[])
  .filter(p=>p&&isFinite(p[0])&&isFinite(p[1]))
  .map(p=>[Math.round(p[0]),Math.round(p[1])]);
 if(P.length<2)return false;
 try{
  if(st.each)st.each(T.ctx,P);
  T.ctx.n++;
 }catch(e){H.rep("er",e.message)}
 H.prompt(); H.draw();
 return true;
}
export function feedText(s){
 const st=step();
 if(!st)return false;
 s=String(s==null?"":s).trim();
 if(!s)return enter();
 if(st.opts){
  const k=norm(s);
  if(k.length===1&&st.opts[k]){
   try{st.opts[k].run(T.ctx)}
   catch(e){H.rep("er",e.message)}
   H.prompt(); H.draw(); return true;
  }
 }
 try{
  /* خطوة نصٍّ حرّ — تُستعملها أداة التحديد وأدوات التأشير */
  if(st.text){
   if(st.each)st.each(T.ctx,s);
   jrAdd(s);
   advance();
   H.draw(); return true;
  }
  /* ضبط خيار الأداة من سطر الإدخال: t=0.2 · type=ext · chain=0 */
  const oa=/^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(s);
  if(oa&&T.def){
   const f=(T.def.opts||[]).find(x=>
    x.k.toLowerCase()===oa[1].toLowerCase());
   if(f){
    let v=oa[2].trim();
    if(f.type==="chk")v=/^(1|on|y|yes|نعم)$/i.test(v)?1:0;
    else if(f.type==="sel"){
     if(!(f.items||[]).some(([iv])=>String(iv)===v))
      throw new Error(`«${v}» ليس من: `
       +(f.items||[]).map(x=>x[0]).join(" · "));
    }else if(f.type==="len"){
     if(v!==""&&Mx(v)==null)throw new Error(`«${v}» ليس طولاً`);
    }else if(f.type==="num"){
     if(v!==""&&Nx(v)==null)throw new Error(`«${v}» ليس رقماً`);
    }
    setOpt(T.def.id,f.k,v);
    jrAdd(`${f.k}=${v}`);
    H.rep("in",`${f.label}: `
     +((f.type==="chk")?(v?"مُشغّل":"مُوقف"):v));
    H.prompt(); H.draw(); return true;
   }
  }
  /* خطوة الزاوية تقبل رقماً مباشراً */
  if(st.ang){
   const v=parseFloat(s);
   if(!isFinite(v))throw new Error(`«${s}» ليست زاوية`);
   T.ctx.v[st.k||"a"]=v;
   jrAdd(String(v));
   if(st.each)st.each(T.ctx,v);
   advance();
   H.draw(); return true;
  }
  /* خطوة كيان: W7 يعني منتصفه · W7@2.4 مسافةٌ على مساره */
  if(st.ent){
   const m=/^([A-Za-z]+\d+)(?:@(-?\d*\.?\d+))?$/.exec(s);
   const hit=m?findById(m[1]):null;
   if(!hit)throw new Error("هذه الخطوة تحتاج نقرة على عنصر — أو "
    +"اكتب معرّفه مثل W7 أو W7@2.4");
   jrAdd(s);
   useEnt(st,hit,(m[2]!=null)?entAlong(hit,M(m[2])):null);
   H.draw(); return true;
  }
  const q=parsePt(s,baseOf(),dirOf());
  if(!q){
   /* اسم أداةٍ صريح وسط أداة ⇒ تبديل لا رفض.
      begin يلغي الحالية ويُثبّت ما صنعتَه قبلها. */
   const d=(s.length>1)?findTool(s):null;
   if(d){histAdd(s); begin(d); return true}
   throw new Error(`«${s}» ليست إحداثياً ولا اسم أداة`);
  }
  if(q.k==="err")throw new Error(q.m);
  if(q.k==="ang"){
   T.lock=q.a;
   H.rep("in",`زاوية مقفلة ${q.a}°`);
   H.prompt(); H.draw(); return true;
  }
  if(q.k==="len")throw new Error("حدّد نقطة الأساس أولاً");
  if(q.k==="dim"){
   const b=baseOf();
   if(!b)throw new Error("المقاس يحتاج نقطة أساس");
   const sx=(T.ghost&&T.ghost[0]<b[0])?-1:1;
   const sy=(T.ghost&&T.ghost[1]<b[1])?-1:1;
   return feedPoint([b[0]+q.w*sx,b[1]+q.d*sy]);
  }
  return feedPoint(q.p);
 }catch(e){H.rep("er",e.message); H.prompt(); H.draw(); return false}
}
export function enter(){
 const st=step();
 if(!st){
  /* الإعادة تحمل الوسيط: بعد «ELEV S» تعيد الجنوبية لا الخيار
     الافتراضي */
  if(T.last){begin(T.last,T.lastArg); return true}
  return false;
 }
 if(st.confirm){
  if(st.each){
   try{st.each(T.ctx)}
   catch(e){H.rep("er",e.message); return false}
  }
  T.i++; jrAdd("."); T.lock=null; T.lenLock=null;
  if(!step())finish(); else {H.prompt(); H.draw()}
  return true;
 }
 if(st.loop){
  if(st.min&&T.ctx.n<st.min){
   H.rep("wr",`تحتاج ${st.min} على الأقل`);
   return false;
  }
  T.i++; jrAdd("."); T.lock=null; T.lenLock=null;
  if(!step())finish(); else {H.prompt(); H.draw()}
  return true;
 }
 H.rep("wr",`${T.def.label}: ${st.p} مطلوب`);
 return false;
}
export function undoStep(){
 jrTaint("تراجع خطوة داخل أداة");
 const ctx=T.ctx;
 if(!ctx)return false;
 if(ctx.made.length){
  const m=ctx.made.pop();
  if(m.coll!=="__"&&Array.isArray(S[m.coll]))
   S[m.coll]=S[m.coll].filter(e=>e.id!==m.id);
  if(ctx.pts.length>1)ctx.pts.pop();
  if(ctx.n>0)ctx.n--;
  touch(); H.rep("in","تراجع خطوة"); H.prompt(); H.draw();
  return true;
 }
 if(ctx.pts.length){ctx.pts.pop(); H.prompt(); H.draw(); return true}
 return false;
}
export function preview(){
 const d=T.def;
 if(!d||!d.prev||!T.ctx)return [];
 try{return d.prev(T.ctx,T.ghost)||[]}
 catch(e){return []}
}
export const pvLine=(a,b,c)=>({t:"l",a,b,c});
export const pvRect=(a,b,c)=>({t:"r",a,b,c});
export const pvBand=(a,b,t,c)=>({t:"b",a,b,w:t,c});
export const pvPoly=(pts,c,cl)=>({t:"pg",pts,c,cl:cl===0?0:1});
export const pvText=(p,s,c)=>({t:"tx",p,s,c});

export function histAdd(s){
 s=String(s||"").trim();
 if(!s)return;
 if(T.hist[T.hist.length-1]===s)return;
 T.hist.push(s);
 if(T.hist.length>60)T.hist.shift();
}

/* ═══ القفل من الإدخال الحركي ═══
   قيمةٌ يكتبها المستخدم فتُقيّد المؤشّر حتى ينقر — مساعدةُ إدخال
   خالصة، لا تعدّل شيئاً بعد وقوع النقطة. */
export function lockLen(mm){
 T.lenLock=(mm==null)?null:Math.max(1,Math.round(mm));
 H.prompt(); H.draw();
 return T.lenLock;
}
export function lockAng(a){
 T.lock=(a==null)?null:a;
 H.prompt(); H.draw();
 return T.lock;
}
