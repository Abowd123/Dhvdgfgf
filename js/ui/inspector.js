/* ═══ لوحة الفاحص والورقة والمرجع والتصدير ═══
   الفاحص يُنفَّذ بزرّ. كل سطر قابل للنقر يحدّد العنصر ويقفز إليه،
   ولا يعدّل شيئاً. */
import {S,edit,editFailed} from "../core/state.js";
import {m2,m3,clamp,dim2,dm2,scl} from "../core/units.js";
import {inspect,SEV} from "../core/inspect.js";
import {openSchedule,okName,OK} from "../core/opens.js";
import {schedule,netArea,netPerim,isStale} from "../core/areas.js";
/* ═══ التصدير ═══ الفاحص لا يعرف صيغةً: المصدِّر يعرفها وحده ═══ */
import * as EX from "../io/export.js";
import {scene,sceneBBox} from "../core/render.js";
import {paperMM,SNAMES,fitsSheet} from "../core/sheet.js";
import {anyHidden,pickable} from "../core/layers.js";
import {hasRef,refCount,clearRef,resetRef,srcList,srcOn,srcSet,
        srcShown,isIdent,refTr,refSnapCount,refStats,setRef,
        KIND} from "../core/ref.js";
import {parseDXF,decodeDXF,skipSummary,MAXENT,MAXPTS,
        MAXCO} from "../io/dxfin.js";
import {toJSON,fromJSON,dl,pickFile,pickBin,
        humanSize} from "../io/project.js";
import {setSel,fitBox,draw,V} from "./canvas.js";
import {HOOK} from "./bus.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

let LAST=null;

export function runInspect(){
 LAST=inspect(sceneBBox());
 renderFindings();
 const {er,wr}=LAST;
 HOOK.report(er?"er":(wr?"wr":"ok"),
  (er||wr||LAST.in)
   ? `الفاحص: ${er} خطأ · ${wr} تنبيه · ${LAST.in} ملاحظة`
   : "الفاحص: لا ملاحظات");
 return LAST;
}
export const clearFindings=()=>{LAST=null; renderFindings()};

function renderFindings(){
 const box=$("#insp");
 if(!box)return;
 if(!LAST){
  box.innerHTML=`<p class="hint">اضغط «افحص» — لا شيء يُفحَص `
   +`تلقائياً مع كل رسمة</p>`;
  return;
 }
 if(!LAST.list.length){
  box.innerHTML=`<p class="hint" style="color:var(--ok)">`
   +`لا ملاحظات · المخطط سليم بحسب الفحوص المتاحة</p>`;
  return;
 }
 const CL={er:"var(--er)",wr:"var(--wr)",in:"var(--fg2)"};
 box.innerHTML=`<p class="hint">${LAST.er} خطأ · ${LAST.wr} تنبيه `
  +`· ${LAST.in} ملاحظة — انقر السطر للقفز</p>`
  +LAST.list.slice(0,120).map((f,i)=>
   `<div class="ro" data-ins="${i}" style="cursor:pointer;`
   +`margin:2px 0;color:${CL[f.sev]}">`
   +`${esc(SEV[f.sev])}: ${esc(f.msg)}</div>`).join("")
  +(LAST.list.length>120
   ? `<p class="hint">… و ${LAST.list.length-120} ملاحظة أخرى</p>`
   : "")
  +`<p class="hint">الفاحص لا يصلح شيئاً — يخبرك وأنت تقرّر</p>`;
}
/* ═══ الورقة ═══ */
export function syncSheet(){
 if(!$("#shOn"))return;
 $("#shOn").checked=!!+S.sheet.on;
 $("#shSize").value=S.sheet.size;
 $("#shOr").value=S.sheet.orient;
 $("#shMar").value=S.sheet.margin;
 $("#shTb").checked=!!+S.sheet.tb;
 const t=S.title||{};
 $("#tProj").value=t.proj||"";
 $("#tOwner").value=t.owner||"";
 $("#tLoc").value=t.loc||"";
 $("#tSheet").value=t.sheet||"";
 $("#tRev").value=t.rev||"";
 $("#tBy").value=t.by||"";
 const p=paperMM();
 const f=fitsSheet(sceneBBox());
 const el=$("#shInfo");
 if(el)el.innerHTML=`${esc(dim2(p[0],p[1],"مم"))} · ${esc(scl(S.meta.scale))} `
  +`⇒ ${esc(dim2((p[0]*S.meta.scale/1000).toFixed(1),
      (p[1]*S.meta.scale/1000).toFixed(1),"م"))} نموذجياً`
  +(+S.sheet.on
   ? (f.ok?`<br><span style="color:var(--ok)">الرسم داخل الإطار`
     +`</span>`
     :`<br><span class="warn">يتجاوز الإطار بـ ${m2(f.over)} م`
     +`</span>`)
   : "");
}
/* ═══ المرجع ═══ */
export function renderRef(){
 const box=$("#rInfo"), lay=$("#rLays");
 if(!box)return;
 if(!hasRef()){
  box.innerHTML=`<span class="hint">لا مرجع — «استورد DXF» يضع `
   +`الملفّ خلفيةً للقياس والالتقاط</span>`;
  if(lay)lay.innerHTML="";
  return;
 }
 const r=refStats(), t=refTr();
 const by=Object.keys(r.by).map(k=>`${r.by[k]} ${KIND[k]||k}`)
  .join(" · ");
 box.innerHTML=`<b>${esc(r.name||"بلا اسم")}</b><br>`
  +`${r.n} كياناً (${by})<br>`
  +`الوحدة: ${esc(r.units)}`
  +(r.guessed?` <span class="warn">(مفترضة)</span>`:"")
  +` · الترميز ${esc(r.enc)}<br>`
  +`التحويل: ×${t.k.toFixed(5)} · ${t.rot.toFixed(2)}° · `
  +`${m2(t.dx)},${m2(t.dy)} م`
  +(isIdent()?` <span class="hint">(لم يُحاذَ بعد)</span>`:"")
  +`<br>${refSnapCount()} نقطة التقاط`
  +(r.trunc?`<br><span class="warn">استُثني ${r.trunc} كياناً `
   +`لتجاوز الحدّ</span>`:"");
 if(!lay)return;
 const L=srcList();
 lay.innerHTML=`<p class="hint">طبقات الملفّ `
  +`(${srcShown()}/${L.length}) — الإخفاء هنا داخل المرجع وحده`
  +`</p>`
  +L.slice(0,60).map(n=>{
   const on=srcOn(n);
   return `<div style="display:flex;gap:5px;align-items:center;`
    +`margin:1px 0;opacity:${on?1:.45}">`
    +`<button data-rsrc="${esc(n)}" style="width:22px;`
    +`padding:1px 0;flex:none">${on?"◉":"○"}</button>`
    +`<span style="flex:1;font-size:11px;overflow:hidden;`
    +`text-overflow:ellipsis;white-space:nowrap">${esc(n)}</span>`
    +`<span class="ro" style="font-size:10.5px">`
    +`${S.ref.src[n]}</span></div>`;
  }).join("")
  +(L.length>60?`<p class="hint">… و ${L.length-60} طبقة</p>`:"");
}
/* ═══ التوصيل ═══ */
export function wireInspector(){
 const box=$("#insp");
 if(box)box.addEventListener("click",e=>{
  const t=e.target.closest("[data-ins]");
  if(!t||!LAST)return;
  const f=LAST.list[+t.dataset.ins];
  if(!f)return;
  /* القفز يقع دائماً — ترى موضع الملاحظة ولو كان مقفلاً.
     والتحديد يمرّ بالحرس نفسه: ما لا يُحدَّد لا يُسحَب. */
  if(f.k&&f.id){
   const s={k:f.k,id:f.id};
   if(pickable(s))setSel([s],s);
   else HOOK.report("in",`${f.id} على طبقةٍ مخفيّة أو مقفلة — `
    +`قُفِز إلى موضعه ولم يُحدَّد`);
  }
  if(f.p){
   const r=Math.max(1500,2200/Math.max(1e-6,V.k));
   fitBox({x0:f.p[0]-r,y0:f.p[1]-r,x1:f.p[0]+r,y1:f.p[1]+r},0.1);
  }
  draw();
  HOOK.status(f.msg);
 });
 $("#bInsp").onclick=()=>runInspect();

 /* ═══ CSV ═══ BOM لأجل إكسل العربي · CRLF لأجل ويندوز ═══ */
 const csv=rows=>"\uFEFF"+rows.map(r=>r.map(c=>{
  const s=String(c==null?"":c);
  return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
 }).join(",")).join("\r\n")+"\r\n";

 $("#bOsCsv").onclick=()=>{
  const d=openSchedule();
  if(!d.rows.length){HOOK.report("in","لا فتحات");return}
  const R2=[["الرمز","النوع","العرض م","الارتفاع م","الجلسة م",
   "المصاريع","عمق الكوّة م","العدد","المعرّفات"]];
  d.rows.forEach(r=>R2.push([r.mark,okName(r.kind),m2(r.w),m2(r.h),
   m2(r.sill),r.pan,r.dep?m2(r.dep):"",r.n,r.ids.join(" ")]));
  R2.push(["","المجموع","","","","","",d.total,""]);
  const n=dl(EX.safeName(S.meta.name+"-فتحات","csv"),csv(R2),
   "text/csv;charset=utf-8");
  HOOK.report("ok",`جدول الفتحات · ${d.rows.length} نوعاً · `
   +`${humanSize(n)}`);
 };
 $("#bAsCsv").onclick=()=>{
  const d=schedule();
  if(!d.rows.length){HOOK.report("in","لا مناطق");return}
  const R2=[["المنطقة","المساحة م²","المحيط م","الحالة"]];
  d.rows.forEach(r=>R2.push([r.name,(r.ar/1e6).toFixed(2),
   m3(r.pr),r.stale?"قديمة":"مطابقة"]));
  R2.push(["المجموع",(d.total/1e6).toFixed(2),"",""]);
  const n=dl(EX.safeName(S.meta.name+"-مساحات","csv"),csv(R2),
   "text/csv;charset=utf-8");
  HOOK.report("ok",`جدول المساحات · ${d.rows.length} منطقة · `
   +`${humanSize(n)}`);
 };
 /* ═══ التصدير ═══
    زرٌّ واحدٌ أربع مرّات: النطاق والتسمية والحصيلة والتحذيرات في
    io/export.js، وهنا التنزيل وحده. وكانت خمسةُ أشياءَ مكرّرةً
    أربع مرّات، فانجرفت: warnClip في الأربعة وsayNotes في اثنين،
    وزرّان غير متزامنَين واثنان متزامنان.
    والخيارات قراءةٌ واحدة: «ألوان التنبيه» مُطفأٌ افتراضاً لأن
    التسليم للعميل لا يحمل ألوان تشخيص. */
 const wantWarn=()=>!!($("#xWarn")&&$("#xWarn").checked);
 const wantDark=()=>!!($("#xDark")&&$("#xDark").checked);
 const dpiOf=()=>clamp(parseInt(($("#xDpi")||{}).value,10)||300,
  72,1200);
 const syncExport=()=>{
  const el=$("#xInfo");
  if(el)el.textContent=EX.summary();
 };
 const BTN={xDxf:"dxf",xSvg:"svg",xPng:"png",xPdf:"pdf"};
 const busy=v=>Object.keys(BTN).forEach(id=>{
  const b=$("#"+id);
  if(b)b.disabled=!!v;
 });
 Object.keys(BTN).forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onclick=async()=>{
   const fmt=BTN[id];
   busy(1);
   HOOK.status(`يُبنى ${EX.FMT[fmt].n}…`);
   try{
    const r=await EX.run(fmt,{dark:wantDark(),
     showWarn:wantWarn(), dpi:dpiOf()});
    if(r.ok)dl(r.name, r.blob||r.raw, r.mime);
    r.report.forEach(m=>HOOK.report(m.lv,m.s));
   }catch(e){
    HOOK.report("er",`${EX.FMT[fmt].n}: `+String(e.message||e));
   }
   busy(0);
   syncExport();
  };
 });
 /* السطر يُحدَّث عند فتح القسم وبعد كل تصدير وبعد تغيّر الورقة:
    مقاسُها واتجاهُها ورقمُ اللوحة كلُّها فيه. */
 const sec=document.querySelector('details[data-sec="export"]');
 if(sec)sec.addEventListener("toggle",syncExport);
 syncExport();

 $("#xSave").onclick=()=>{
  const n=dl(EX.safeName(S.meta.name,"json"),toJSON(),
   "application/json");
  HOOK.report("ok",`حُفظ المشروع · ${humanSize(n)}`);
  if(anyHidden()||hasRef())HOOK.report("in",
   "الملفّ يحمل كل شيء بما فيه المخفيّ والمرجع — الإخفاء عرضٌ "
   +"لا حذف. وهو ليس مخرَجاً: بلا هيئةٍ ولا نطاقٍ ولا مقياس.");
 };
 $("#xOpen").onclick=()=>{
  pickFile((txt,name)=>{
   if(txt==null){HOOK.report("wr","لم يُقرأ ملفّ");return}
   if((S.walls.length||S.cols.length)
    &&!confirm("فتح ملفّ؟ سيُفقد غير المحفوظ."))return;
   try{
    const r=fromJSON(txt);
    LAST=null;
    HOOK.refresh(1);
    HOOK.report("ok",`فُتح ${name} · ${r.walls} جدار · `
     +`${r.opens} فتحة · ${r.cols} عمود · ${r.areas} منطقة · `
     +`${r.dims} بُعد`+(r.ref?` · مرجع ${r.ref} كياناً`:""));
    syncExport();
    import("./canvas.js").then(C=>C.fit());
   }catch(e){HOOK.report("er",e.message)}
  });
 };
 /* ═══ الورقة ═══ */
 $("#shOn").onchange=()=>{
  edit(()=>{S.sheet.on=$("#shOn").checked?1:0});
  HOOK.refresh(0);
  syncExport();
 };
 ["shSize","shOr","shMar","shTb"].forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onchange=()=>{
   edit(()=>{
    S.sheet.size=SNAMES.includes($("#shSize").value)
     ? $("#shSize").value : "A3";
    S.sheet.orient=($("#shOr").value==="p")?"p":"l";
    S.sheet.margin=clamp(parseFloat($("#shMar").value)||12,0,60);
    S.sheet.tb=$("#shTb").checked?1:0;
   });
   HOOK.refresh(0);
   syncExport();
  };
 });
 $("#shCenter").onclick=()=>{
  edit(()=>{S.sheet.cx=null; S.sheet.cy=null});
  HOOK.report("in","الورقة تُتَمركَز على الرسم");
  HOOK.refresh(0);
  syncExport();
 };
 ["tProj","tOwner","tLoc","tSheet","tRev","tBy"].forEach(id=>{
  const el=$("#"+id);
  if(!el)return;
  el.onchange=()=>{
   edit(()=>{
    S.title.proj=$("#tProj").value.slice(0,60);
    S.title.owner=$("#tOwner").value.slice(0,60);
    S.title.loc=$("#tLoc").value.slice(0,60);
    S.title.sheet=$("#tSheet").value.slice(0,16);
    S.title.rev=$("#tRev").value.slice(0,8);
    S.title.by=$("#tBy").value.slice(0,30);
   });
   HOOK.refresh(0);
   syncExport();      /* رقمُ اللوحة والمراجعة في اسم الملفّ */
  };
  el.onkeydown=e=>{
   if(e.key==="Escape"){el.blur();return}
   e.stopPropagation();
  };
 });
 /* ═══ المرجع ═══ */
 $("#rImp").onclick=()=>{
  pickBin(".dxf",(buf,name)=>{
   if(!buf){HOOK.report("wr","لم يُقرأ ملفّ");return}
   try{
    const {txt,enc}=decodeDXF(buf);
    const u=$("#rUnit").value;
    const res=parseDXF(txt,{unit:u?parseFloat(u):null,
     cap:MAXENT});
    res.enc=enc;
    if(!res.ents.length)
     throw new Error("لم يُنتج الملفّ كياناً واحداً مقروءاً");
    edit(()=>setRef(res,name));
    HOOK.report("ok",`استُورد ${name} · ${res.ents.length} كياناً `
     +`على ${Object.keys(res.src).length} طبقة · الوحدة `
     +`${res.units.name}${res.guessed?" (مفترضة)":""} · `
     +`الترميز ${enc} · ${humanSize(buf.byteLength||0)}`);
    /* التوقّف يُعلَن أوّلاً: المرجع منقوصٌ بقدرٍ لا يُعرَف، فلا
       يُقاس عليه — وأخطر ما في القراءة أن تمضي وأنت تحسبها تمّت */
    if(res.stop)HOOK.report("er",
     res.stop==="ops"
      ? `تُوقّف التحليل عند ${res.ops.toLocaleString("en")} عملية — `
        +`الملفّ يحوي بلوكاتٍ متعشّقة عميقاً أو مصفوفاتٍ ضخمة. `
        +`المرجع منقوصٌ بقدرٍ لا يُعرَف — لا تقِس عليه.`
      : `تُوقّف التحليل بعد ${Math.round(res.ms/1000)} ثانية — `
        +`الملفّ أكبر مما يُحلَّل في المتصفّح. جرّب حفظه من `
        +`برنامجك بعد حذف ما لا تحتاجه.`);
    if(res.clipped)HOOK.report("wr",
     `${res.clipped} كياناً قُصَّت رؤوسه عند ${MAXPTS} — `
     +`مضلّعاتٌ بعشرات الآلاف من النقاط لا تُقاس عليها`);
    const sk2=res.skip["قيمة خارج المدى"];
    if(sk2)HOOK.report("wr",`${sk2} كياناً نُبِذ لقيَمٍ خارج `
     +`المدى (±${(MAXCO/1e6).toFixed(0)} كم) — وحدةٌ خاطئة أو `
     +`ملفٌّ معطوب`);
    const sk=skipSummary(res.skip,["قيمة خارج المدى"]);
    if(sk)HOOK.report("in",`تُخطّي: ${sk}`);
    if(res.trunc)HOOK.report("wr",`استُثني ${res.trunc} كياناً `
     +`لتجاوز الحدّ (${MAXENT}) — المرجع منقوص`);
    if(res.approx.spline)HOOK.report("in",
     `${res.approx.spline} منحنى SPLINE رُسم متقطّعاً — `
     +`التقطيع علامةُ التقريب`);
    if(res.guessed)HOOK.report("wr",
     "وحدة الملفّ مجهولة وفُرضت مليمتراً — عاير المرجع بمسافةٍ "
     +"تعرفها قبل أن تقيس عليه");
    HOOK.report("in","المرجع جامد: لا يُحدَّد ولا يدخل المساحات. "
     +"استعمل «محاذاة» لتضعه في موضعه.");
    HOOK.refresh(1);
    import("./canvas.js").then(C=>C.fit());
   }catch(e){HOOK.report("er","DXF: "+e.message)}
  });
 };
 $("#rClr").onclick=()=>{
  if(!hasRef()){HOOK.report("in","لا مرجع");return}
  if(!confirm(`إزالة المرجع (${refCount()} كياناً)؟ `
   +`رسمك لا يتأثّر.`))return;
  const n=edit(()=>clearRef());
  if(editFailed())return;
  HOOK.report("ok",`أُزيل المرجع · ${n} كياناً · الملفّ يصغر`);
  HOOK.refresh(1);
 };
 $("#rRst").onclick=()=>{
  if(!hasRef())return;
  edit(()=>resetRef());
  HOOK.report("in","صُفّر تحويل المرجع — عاد إلى إحداثياته "
   +"المستوردة");
  HOOK.refresh(0);
 };
 const rl=$("#rLays");
 if(rl)rl.addEventListener("click",e=>{
  const n=e.target.dataset.rsrc;
  if(!n)return;
  const on=edit(()=>srcSet(n,srcOn(n)));
  if(editFailed())return;
  HOOK.report("in",`طبقة المرجع «${n}»: ${on?"ظاهرة":"مخفيّة"}`);
  HOOK.refresh(0);
 });
}
