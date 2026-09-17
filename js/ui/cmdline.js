/* ═══ سطر الأوامر: الموضع والسجل ═══
   العُقَد تُنقَل ولا تُبنى — كعقد dock.js نفسه: #cmdWrap ينتقل بين
   أسفل اللوحة وأعلاها ونافذةٍ عائمة، فيحفظ مستمعيه وقيمة الحقل
   وموضع تمرير السجل. وإعادة بنائه كانت ستُفقِد ما يكتبه المستخدم
   وسط أمر. */
import {UIS,uiSet,saveUI} from "./store.js";
import {icon} from "./icons.js";
import {HOOK} from "./bus.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ic=(n,s)=>UIS.icons?icon(n,s||14):"";
const rtl=()=>getComputedStyle(document.documentElement)
 .direction==="rtl";
const cl=(v,a,b)=>v<a?a:(v>b?b:v);

export const CMODES={bottom:"أسفل اللوحة",top:"أعلى اللوحة",
 float:"نافذة عائمة"};
export const LOGH={0:"بلا سجل",84:"منخفض",120:"متوسط",200:"مرتفع"};
export const OPAS={100:"معتم",88:"شفافية خفيفة",72:"شفافية أوسع"};

/* ═══ التطبيق ═══ */
export function applyCmd(){
 const w=$("#cmdWrap"), work=$("#work"), fl=$("#cmdFloat"),
       stage=$("#stage"), lg=$("#log");
 if(!w||!work)return;
 const m=CMODES[UIS.cmdMode]?UIS.cmdMode:"bottom";
 w.dataset.mode=m;
 if(m==="float"){
  fl.appendChild(w);
  placeCmd();
 }else if(m==="top"){
  work.insertBefore(w,stage);
 }else{
  work.appendChild(w);
 }
 if(lg){
  const h=LOGH[UIS.logH]!==undefined?+UIS.logH:120;
  lg.hidden=(h===0)||!!UIS.clean;
  if(h>0)lg.style.height=h+"px";
 }
 w.style.setProperty("--cmdOpa",String((+UIS.cmdOpa||100)/100));
 w.hidden=!!UIS.clean;
 dispatchEvent(new Event("resize"));
}
function placeCmd(){
 const w=$("#cmdWrap");
 if(!w||UIS.cmdMode!=="float")return;
 const W=innerWidth, H=innerHeight;
 UIS.cmdW=Math.round(cl(+UIS.cmdW||620,320,Math.max(360,W-40)));
 UIS.cmdX=Math.round(cl(+UIS.cmdX||24,-UIS.cmdW+120,Math.max(0,W-140)));
 UIS.cmdY=Math.round(cl(+UIS.cmdY||(H-220),40,Math.max(60,H-90)));
 w.style.insetInlineStart=UIS.cmdX+"px";
 w.style.insetBlockStart=UIS.cmdY+"px";
 w.style.inlineSize=UIS.cmdW+"px";
}
export function setCmdMode(m){
 if(!CMODES[m])return false;
 uiSet("cmdMode",m);
 applyCmd();
 HOOK.report("in",`سطر الأوامر: ${CMODES[m]}`);
 const c=$("#clIn");
 if(c)c.focus();
 return true;
}
export function setLogH(h){
 uiSet("logH",+h||0);
 applyCmd();
 HOOK.report("in",`السجل: ${LOGH[+h]||h+" بكسل"}`);
}
export function setCmdOpa(v){
 uiSet("cmdOpa",cl(Math.round(+v||100),40,100));
 applyCmd();
}
export function clearLog(){
 const lg=$("#log");
 if(lg)lg.innerHTML="";
 HOOK.report("in","فُرّغ السجل");
}
/* ═══ القائمة ═══ */
export function cmdMenu(x,y){
 const m=$("#cMenu");
 if(!m)return;
 const row=(a,n,i,on)=>`<button type="button" class="pmI" `
  +`data-cma="${esc(a)}">${ic(i)}<span>${esc(n)}</span>`
  +`<span class="ky">${on?"●":""}</span></button>`;
 m.innerHTML=`<div class="pmH">سطر الأوامر</div>`
  +Object.keys(CMODES).map(k=>row("m:"+k,CMODES[k],
   k==="float"?"float":(k==="top"?"up":"down"),
   UIS.cmdMode===k)).join("")
  +`<div class="pmS"></div>`
  +Object.keys(LOGH).map(k=>row("h:"+k,LOGH[k],"cmdl",
   String(UIS.logH)===k)).join("")
  +`<div class="pmS"></div>`
  +Object.keys(OPAS).map(k=>row("o:"+k,OPAS[k],"opa",
   String(UIS.cmdOpa)===k)).join("")
  +`<div class="pmS"></div>`
  +`<button type="button" class="pmI" data-cma="clr">`
  +`${ic("clear")}<span>فرّغ السجل</span></button>`;
 m.hidden=false;
 const w=m.offsetWidth||230, h=m.offsetHeight||330;
 m.style.insetInlineStart=Math.round(
  cl(rtl()?(innerWidth-x-4):(x-w+4),4,innerWidth-w-4))+"px";
 m.style.insetBlockStart=Math.round(cl(y-h-6,4,innerHeight-h-8))+"px";
}
export const cmdMenuClose=()=>{
 const m=$("#cMenu");
 if(m)m.hidden=true;
};
function cmdRun(a){
 cmdMenuClose();
 const m=/^m:(\w+)$/.exec(a);
 if(m)return setCmdMode(m[1]);
 const h=/^h:(\d+)$/.exec(a);
 if(h)return setLogH(h[1]);
 const o=/^o:(\d+)$/.exec(a);
 if(o)return setCmdOpa(o[1]);
 if(a==="clr")return clearLog();
}
/* ═══ التوصيل ═══ */
let DRG=null;
export function wireCmd(){
 const bar=$("#cmdline");
 if(!bar)return false;
 if(!$("#clMenuBtn"))bar.insertAdjacentHTML("beforeend",
  `<button type="button" id="clMenuBtn" title="موضع سطر الأوامر"`
  +` aria-label="خيارات سطر الأوامر">⋮</button>`);
 document.addEventListener("click",e=>{
  if(e.target.closest("#clMenuBtn")){
   const r=e.target.closest("#clMenuBtn").getBoundingClientRect();
   cmdMenu(rtl()?r.left:r.right,r.top);
   return;
  }
  const a=e.target.closest("[data-cma]");
  if(a)cmdRun(a.dataset.cma);
 });
 addEventListener("mousedown",e=>{
  const m=$("#cMenu");
  if(m&&!m.hidden&&!m.contains(e.target)
   &&!e.target.closest("#clMenuBtn"))cmdMenuClose();
  /* السحب في الوضع العائم: من الشريط لا من الحقل */
  if(UIS.cmdMode!=="float"||UIS.lockUI)return;
  const b=e.target.closest("#cmdline");
  if(!b||e.target.closest("input,button"))return;
  DRG={px:e.clientX,py:e.clientY,x:+UIS.cmdX||24,y:+UIS.cmdY||0,on:0};
  document.documentElement.classList.add("dragging");
 },true);
 addEventListener("mousemove",e=>{
  if(!DRG)return;
  const dx=e.clientX-DRG.px, dy=e.clientY-DRG.py;
  if(!DRG.on&&Math.hypot(dx,dy)<4)return;
  DRG.on=1;
  UIS.cmdX=Math.round(DRG.x+(rtl()?-dx:dx));
  UIS.cmdY=Math.round(DRG.y+dy);
  placeCmd();
 });
 addEventListener("mouseup",()=>{
  if(!DRG)return;
  const on=DRG.on;
  DRG=null;
  document.documentElement.classList.remove("dragging");
  if(on)saveUI();
 });
 addEventListener("keydown",e=>{
  const m=$("#cMenu");
  if(e.key==="Escape"&&m&&!m.hidden){
   e.preventDefault(); e.stopPropagation(); cmdMenuClose();
  }
 },true);
 addEventListener("resize",()=>placeCmd());
 if(typeof ResizeObserver!=="undefined"){
  const w=$("#cmdWrap");
  let t=null;
  new ResizeObserver(()=>{
   if(UIS.cmdMode!=="float")return;
   UIS.cmdW=Math.round(w.offsetWidth);
   if(t)clearTimeout(t);
   t=setTimeout(()=>{t=null; saveUI()},400);
  }).observe(w);
 }
 applyCmd();
 return true;
}
