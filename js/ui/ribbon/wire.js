/* ═══ موصِّل الشريط ═══
   الأدوات تُنادى مباشرةً. وكل ما عداها ينقر زرَّه القائم في
   اللوحة الجانبية بعد فتح قسمه — فلا منطقَ مكرّراً، ولوحةٌ واحدة
   هي المرجع، ويرى المستخدم أين يسكن الأمر فيتعلّم موضعه.
   ولهذا يبقى #tools في الشجرة مخفيّاً: معالجه هو المرجع. */
import {RIBBON,CTX} from "./schema.js";
import {buildRibbon,buildQAT,setTab,curTab,setCtx,setMin,
        syncRibbon,syncRibbonTogs,showKT,invalidateSync,
        ctxOf} from "./render.js";
import {UIS,uiSet,saveUI} from "../store.js";
import {renderVisible,markDirty} from "../panels.js";
import * as R from "../../tools/registry.js";
import {draw,selList,setTheme as setCanvasTheme} from "../canvas.js";
import {HOOK} from "../bus.js";
import {revealPanel,dockClean,wsMenuOpen,wsApply,dockStats,
        openPanel,closePanel,toFloat,setAuto,setMode,
        layout} from "../dock.js";
import {PANELS,ZONES} from "../layout.js";
import {cmdMenu,setCmdMode,CMODES,applyCmd} from "../cmdline.js";
import {qpToggle,quickSel} from "../quickprops.js";
import {stSheet,stLock,custOpen} from "../statusbar.js";
import {runInspect} from "../inspector.js";
import {syncOverlay} from "../overlay.js";

const $=s=>document.querySelector(s);
const focusCl=()=>{const c=$("#clIn"); if(c)c.focus()};
const rtlDoc=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";

/* ═══ إظهار لوحة ═══
   الشريط لا يعرف أين تسكن اللوحة: يطلب إظهارها، والإرساء يفتح
   عمودها أو يكشف شارتها أو يقدّم نافذتها. */
export function revealSec(sec){
 return revealPanel(sec);
}
/* ═══ الوكالة ═══
   لا يُنقَر زرٌّ معطَّل — الرسالة أوضح من نقرةٍ لا تفعل شيئاً. */
function proxy(sel,sec){
 if(sec)revealSec(sec);
 const el=document.querySelector(sel);
 if(!el){HOOK.report("wr",`لا زرَّ «${sel}» — لوحته غير مبنيّة`);
  return false}
 if(el.disabled){HOOK.report("in","غير متاح الآن"); return false}
 el.click();
 return true;
}
const P=(sel,sec)=>()=>proxy(sel,sec);

/* ═══ جدول الأفعال ═══ كلّها وكالةٌ إلّا ما لا زرَّ له ═══ */
export const ACT={
 /* الملفّ والتصدير */
 fnew:  P("#bNew","state"),
 xOpen: P("#xOpen","export"),
 xSave: P("#xSave","export"),
 xDxf:  P("#xDxf","export"),
 xSvg:  P("#xSvg","export"),
 xPng:  P("#xPng","export"),
 xPdf:  P("#xPdf","export"),
 asCsv: P("#bAsCsv","sched"),
 osCsv: P("#bOsCsv","osched"),

 /* المرجع */
 rImp:  P("#rImp","ref"),
 rClr:  P("#rClr","ref"),
 rRst:  P("#rRst","ref"),

 /* الطبقات والفحص */
 lAll:    P("#lAll","lays"),
 lUnlock: P("#lUnlock","lays"),
 inspect: P("#bInsp","insp"),

 /* العامّة */
 undo: P("#bUndo"),
 redo: P("#bRedo"),
 fit:  P("#bFit"),
 help: P("#bHelp"),

 /* الورقة والمحاور والافتراضات */
 shCenter: P("#shCenter","sheet"),
 axClr:    P("#bAxClr","axes"),
 dRst:     P("#dRst","defs"),
 osPop:    P("#osBtn"),

 /* ═══ المسح الكامل ═══
    لا زرَّ له في اللوحة فهو الأصل هنا. ولا سبيل إليه قبل اليوم
    إلّا من أدوات المطوّر — وهو مطلبٌ عمليّ لمن يستعمل حاسباً
    مشتركاً. والوعد يُذكَر بتفصيله لأنه لا يُتراجَع عنه. */
 purgeAll: ()=>{
  if(!confirm("مسحُ كلِّ ما هو محفوظ في هذا المتصفّح؟\n\n"
   +"• المشروع الجاري وجلسته\n"
   +"• تفضيلات الواجهة وأسطح العمل والمناظر\n"
   +"• خيارات الأدوات وافتراضاتها\n"
   +"• إعداد المزوّد ومفتاحه\n\n"
   +"لا يمسّ الملفّات التي حفظتها على قرصك. "
   +"احفظ مشروعك أوّلاً إن أردت الإبقاء عليه."))return;
  import("../../io/store.js")
   .then(M=>M.purge())
   .then(r=>{
    HOOK.report("ok",`مُسح ${r.keys.length} مفتاحاً`
     +(r.idb?" وقاعدة البيانات":"")
     +" — أعِد تحميل الصفحة للبدء من المصنع");
   })
   .catch(e=>HOOK.report("er","المسح: "+String(e.message||e)));
 },

 /* ═══ القياس ═══
    نقرةٌ أولى تُشغِّله، وثانيةٌ تعرض الحصيلة وتُطفئه. ومُطفأٌ
    افتراضاً فلا كلفةَ لمن لا يسأل. */
 perfShow: ()=>{
  import("../../core/perf.js").then(M=>{
   if(!M.P.on){
    M.perfOn(1);
    HOOK.report("in","القياس مُشتغِل — حرّك شيئاً أو اسحب مقبضاً، "
     +"ثم اختر «القياس» مرّةً أخرى للحصيلة");
    return;
   }
   M.perfReport().split("\n").forEach(l=>{
    HOOK.report(/^⚠/.test(l)?"wr":"in",l);
   });
   M.perfOn(0);
   HOOK.report("ok","أُطفئ القياس");
  }).catch(e=>HOOK.report("er","القياس: "+String(e.message||e)));
 },

 /* السياقية — أزرارٌ تظهر بحسب المحدَّد */
 delSel:    P("#pDel","props"),
 renumCols: P("[data-brenum]","props"),
 clrDimTxt: P("[data-bcleartxt]","props"),
 nameSeq:   P("[data-bname]","props"),
 fixSnap:   P("[data-fsnap]","props"),

 /* فتح اللوحات */
 propsDlg: ()=>revealSec("props"),
 laysDlg:  ()=>revealSec("lays"),
 schedDlg: ()=>revealSec("sched"),
 oschedDlg:()=>revealSec("osched"),
 refDlg:   ()=>revealSec("ref"),
 sheetDlg: ()=>revealSec("sheet"),
 inspDlg:  ()=>revealSec("insp"),
 projDlg:  ()=>revealSec("proj"),
 defsDlg:  ()=>revealSec("defs"),
 stateDlg: ()=>revealSec("state"),
 aiDlg:    ()=>revealSec("ai"),

 /* القشرة — لا زرَّ لها في اللوحة فهي الأصل هنا */
 rbMin: ()=>setMin(!UIS.ribbonMin),
 clean: ()=>setClean(!UIS.clean),
 theme: ()=>setTheme(UIS.theme==="dark"?"light":"dark"),
 shell: ()=>setShell(UIS.shell==="ribbon"?"classic":"ribbon")
 ,
 /* ═══ و٢ — الإرساء وأسطح العمل ═══ */
 wsMenu: ()=>{
  const b=document.querySelector('[data-act="wsMenu"]');
  const mid=innerWidth/2;
  const r=b?b.getBoundingClientRect()
   :{bottom:120,["l"+"eft"]:mid,["r"+"ight"]:mid};
  wsMenuOpen(rtlDoc()?r.left:r.right,r.bottom);
 },
 wsArch:  ()=>wsApply("arch"),
 wsAnnot: ()=>wsApply("annot"),
 wsOut:   ()=>wsApply("out"),
 dockAutoS: ()=>setAuto("s",!layout().auto.s),
 dockAutoE: ()=>setAuto("e",!layout().auto.e),
 dockTabS:  ()=>setMode("s",layout().mode.s==="acc"?"tab":"acc"),
 dockTabE:  ()=>setMode("e",layout().mode.e==="acc"?"tab":"acc")
 ,
 /* ═══ و٤ ═══ */
 cmdMode: ()=>{
  const b=document.querySelector('[data-act="cmdMode"]');
  const r=b?b.getBoundingClientRect()
   :{left:innerWidth/2,right:innerWidth/2,top:innerHeight-40};
  cmdMenu(rtlDoc()?r.left:r.right,r.top);
 },
 cmdFloat:  ()=>setCmdMode("float"),
 cmdBottom: ()=>setCmdMode("bottom"),
 qpTog:     ()=>qpToggle(),
 rclick: ()=>{
  const O=["auto","enter","menu"];
  const N={auto:"تلقائي — Enter مع أداة وقائمةٌ في السكون",
   enter:"Enter دائماً",menu:"قائمة دائماً"};
  const i=(O.indexOf(UIS.rclick)+1)%O.length;
  uiSet("rclick",O[i]);
  HOOK.report("in",`الزرّ الأيمن: ${N[O[i]]}`);
 },

 /* ═══ شريط الحالة ═══ يملك أفعاله، وتُعلَن هنا فيبقى الجدول واحداً */
 stSheet: ()=>stSheet(),
 stLock:  ()=>stLock(),
 stScale: ()=>revealSec("proj"),
 stWarn:  ()=>{runInspect(); revealSec("insp")},
 stCust:  ()=>{
  const b=document.querySelector('[data-act="stCust"]');
  const r=b?b.getBoundingClientRect()
   :{top:innerHeight-30,left:innerWidth/2,right:innerWidth/2};
  custOpen(rtlDoc()?r.left:r.right, r.top);
 }
};
/* ═══ السِّمة والشاشة النظيفة والقشرة ═══ */
export function setTheme(t){
 const v=(t==="light")?"light":"dark";
 uiSet("theme",v);
 setCanvasTheme(v);          /* يضبط data-theme ويُبطل كاش النقوش */
 HOOK.report("in",`السِّمة: ${v==="light"?"فاتحة":"داكنة"}`);
}
export function setClean(on){
 const v=on?1:0;
 uiSet("clean",v);
 document.documentElement.classList.toggle("clean",!!v);
 dockClean();                    /* مزامنةٌ فقط — العلَم مملوكٌ هنا */
 applyCmd();                     /* سطر الأوامر والسجل: مالكهما cmdline */
 const rb=$("#ribbon");
 if(rb&&UIS.shell==="ribbon")rb.hidden=!!v;
 const tb=$("#tools");
 if(tb&&UIS.shell==="classic")tb.hidden=!!v;
 quickSel();                     /* البطاقة السريعة تختفي وتعود */
 syncOverlay();                  /* البوصلة وبطاقة المنظور */
 dispatchEvent(new Event("resize"));
 HOOK.report("in",v?"شاشة نظيفة · Ctrl+0 يعيد الواجهة"
  :"عادت الواجهة");
}
export function setShell(s){
 const v=(s==="ribbon")?"ribbon":"classic";
 uiSet("shell",v);
 const rb=$("#ribbon"), tb=$("#tools");
 if(v==="ribbon"){
  if(rb&&!rb.dataset.built){buildRibbon(); rb.dataset.built="1"}
  setMin(UIS.ribbonMin);
  if(rb)rb.hidden=!!UIS.clean;
  if(tb)tb.hidden=true;
  invalidateSync();
  syncRibbon(); syncRibbonTogs(); ribbonSel();
 }else{
  if(rb)rb.hidden=true;
  if(tb)tb.hidden=!!UIS.clean;
 }
 document.documentElement.dataset.shell=v;
 dispatchEvent(new Event("resize"));
 HOOK.report("in",`القشرة: ${v==="ribbon"?"شريط ربّون":"مسطّحة"}`);
 return v;
}
/* ═══ التبويب السياقي من التحديد ═══ */
let lastSig=null;
export function ribbonSel(){
 if(UIS.shell!=="ribbon"){lastSig=null; return}
 const L=selList();
 let kind=null;
 if(L.length){
  kind=L[0].k;
  for(const s of L)if(s.k!==kind){kind=null; break}
 }
 const sig=kind?(kind+":"+L.length):"";
 if(sig===lastSig)return;
 lastSig=sig;
 setCtx(CTX[kind]?kind:null);
 invalidateSync();
 syncRibbon();
}
/* ═══ التنفيذ ═══
   runSpec يقبل الوصف مباشرةً، فتشترك فيه قائمةُ السياق والشريط
   وقائمةُ التطبيق — مُنفِّذٌ واحد لا ثلاثة. */
export function runSpec(sp){
 if(!sp)return false;
 if(sp.cmd!==undefined&&sp.cmd!==null){
  if(!sp.cmd)R.cancel(true); else R.begin(sp.cmd);
  HOOK.prompt(); draw(); focusCl();
  return true;
 }
 if(sp.tog){
  const t=document.querySelector(sp.tog);
  if(t)t.click();
  syncRibbonTogs();
  return true;
 }
 const act=sp.act;
 if(!act)return false;
 if(act.startsWith("dlg:")){revealSec(act.slice(4)); return true}
 const fn=ACT[act];
 if(!fn){HOOK.report("wr",`فعلٌ غير معروف: ${act}`); return false}
 try{fn()}
 catch(e){HOOK.report("er",String(e.message||e))}
 return true;
}
export function runItem(el){
 if(!el)return false;
 if(el.dataset.act==="wsMenu")el.dataset.wsx="1";
 return runSpec({cmd:el.dataset.cmd,act:el.dataset.act,
  tog:el.dataset.tog});
}
/* ═══ التوصيل ═══ */
export function wireRibbon(){
 const rb=$("#ribbon");
 if(!rb)return false;

 rb.addEventListener("click",e=>{
  const tab=e.target.closest("[data-tab]");
  if(tab){setTab(tab.dataset.tab); saveUI(); return}
  if(e.target.closest("#rbToggle")){setMin(!UIS.ribbonMin);
   saveUI(); dispatchEvent(new Event("resize")); return}
  runItem(e.target.closest("[data-cmd],[data-act],[data-tog]"));
 });
 /* نقرتان على التبويب النشط تطويان — كما في أوتوكاد */
 rb.addEventListener("dblclick",e=>{
  const tab=e.target.closest("[data-tab]");
  if(!tab)return;
  e.preventDefault();
  if(tab.dataset.tab===curTab()){setMin(!UIS.ribbonMin); saveUI();
   dispatchEvent(new Event("resize"))}
 });
 /* الأسهم بين التبويبات · وMenu/Home/End — ARIA كاملة */
 const tabList=()=>[...rb.querySelectorAll(".rbTab")];
 rb.addEventListener("keydown",e=>{
  const T=tabList();
  const i=T.findIndex(b=>b===document.activeElement);
  if(i<0)return;
  /* RTL: السهم الأيمن يتقدّم في القراءة العربية */
  const step=(e.key==="ArrowLeft")?1:((e.key==="ArrowRight")?-1:0);
  let j=-1;
  if(step)j=(i+step+T.length)%T.length;
  else if(e.key==="Home")j=0;
  else if(e.key==="End")j=T.length-1;
  else return;
  e.preventDefault();
  T[j].focus();
  setTab(T[j].dataset.tab); saveUI();
 });
 const q=$("#qat");
 if(q)q.addEventListener("click",e=>{
  runItem(e.target.closest("[data-act]"));
 });
 wireKT();
 return true;
}
/* ═══ KeyTips ═══
   Alt وحده يُظهر الدلائل، ثم رقمٌ مفردٌ ينتقل — لا Alt+رقم لأن
   المتصفّح يحتجزه. والأرقام أثبت من الحروف في لوحةٍ عربية: مفتاحها
   الفيزيائي واحدٌ في كل تخطيط، فنقرأ e.code لا e.key.
   ونُنصت في طور الالتقاط لنسبق قاعدة app.js التي تُرسل كل حرفٍ
   مطبوعٍ إلى سطر الإدخال. */
let KT=false, altOnly=false;
function ktOff(){if(!KT)return; KT=false; showKT(false)}

function wireKT(){
 addEventListener("keydown",e=>{
  if(e.key==="Alt"&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
   if(!e.repeat)altOnly=true;
   return;
  }
  altOnly=false;
  if(!KT)return;
  if(e.key==="Escape"){e.preventDefault(); e.stopPropagation();
   ktOff(); return}
  const m=/^Digit([0-9])$/.exec(e.code||"");
  if(m&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
   e.preventDefault(); e.stopPropagation();
   const d=m[1];
   ktOff();
   if(d==="0"){const b=$("#appBtn"); if(b)b.click(); return}
   const t=RIBBON.find(x=>x.kt===d);
   if(t){setTab(t.id); saveUI();
    const b=document.querySelector(`[data-tab="${t.id}"]`);
    if(b)b.focus();
   }
   return;
  }
  ktOff();               /* أي مفتاحٍ آخر يُغلق ويمرّ */
 },true);

 addEventListener("keyup",e=>{
  if(e.key!=="Alt")return;
  if(!altOnly)return;
  altOnly=false;
  e.preventDefault();
  if(UIS.shell!=="ribbon")return;
  KT=!KT;
  showKT(KT);
 },true);

 addEventListener("mousedown",()=>ktOff(),true);
 addEventListener("blur",()=>ktOff());
}
export const ktOn=()=>KT;

/* ═══ الارتفاع ═══
   الشاشة القصيرة تُطوى مرّةً واحدة ولا تُقاوَم بعدها: إن فتحها
   المستخدم بقيت مفتوحة. */
let autoDone=false;
export function autoFit(){
 if(UIS.shell!=="ribbon"||autoDone)return;
 if(innerHeight<760&&!UIS.ribbonMin){
  autoDone=true;
  setMin(1); saveUI();
  HOOK.report("in","طُوي الشريط لضيق الشاشة · Ctrl+F1 يفتحه");
 }
}
