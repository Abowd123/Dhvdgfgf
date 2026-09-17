/* ═══ مصيّر الشريط ═══
   يُبنى مرّةً واحدة، ولا يُهدَم إلّا عند تبديل القشرة أو ظهور
   تبويبٍ سياقيّ. والمزامنة تقارن ولا تبني — لأن syncPrompt تُنادى
   مع كل حركة مؤشّر، وهي العلّة التي أصلحتها و٠ في شريط الخيارات
   فلا تُعاد هنا.

   الحالة كلّها في السمات (data-*) لا في متغيّراتٍ موازية، فلا
   يفترق المرسوم عن المخزَّن. */
import {RIBBON,CTX,QAT} from "./schema.js";
import {icon} from "../icons.js";
import {UIS} from "../store.js";
import * as R from "../../tools/registry.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ic=(n,s)=>UIS.icons?icon(n,s):"";
const AR="٠١٢٣٤٥٦٧٨٩";
export const arNum=s=>String(s).replace(/\d/g,d=>AR[+d]);

/* هويّة العنصر: أمرٌ أو فعلٌ أو مفتاح — واحدةٌ لا تلتبس */
const idOf=it=>it.cmd!=null?`c:${it.cmd}`
 :(it.act?`a:${it.act}`:(it.tog?`t:${it.tog}`:""));
const attrOf=it=>it.cmd!=null?`data-cmd="${esc(it.cmd)}"`
 :(it.act?`data-act="${esc(it.act)}"`
 :(it.tog?`data-tog="${esc(it.tog)}"`:""));

function btn(it,big){
 const cls=big?"rbBig":"rbSm";
 const sz=big?24:16;
 const g=ic(it.ico,sz);
 return `<button type="button" class="${cls}" ${attrOf(it)} `
  +`data-key="${esc(idOf(it))}" title="${esc(it.n)}">`
  +(g||`<span class="noic" aria-hidden="true"></span>`)
  +`<span class="lb">${esc(it.n)}</span></button>`;
}
const itemHtml=it=>it.group
 ? `<div class="rbCol">${it.group.map(x=>btn(x,0)).join("")}</div>`
 : btn(it,!!it.big);

function panelHtml(tid,p){
 return `<section class="rbp" data-panel="${esc(tid)}/${esc(p.id)}" `
  +`role="group" aria-label="${esc(p.n)}">`
  +`<div class="rbpBody">${(p.items||[]).map(itemHtml).join("")}</div>`
  +`<div class="rbpFoot"><span>${esc(p.n)}</span>`
  +(p.dlg?`<button type="button" class="rbDlg" `
    +`data-act="dlg:${esc(p.dlg)}" title="افتح اللوحة" `
    +`aria-label="افتح لوحة ${esc(p.n)}">◥</button>`:"")
  +`</div></section>`;
}
function tabBtn(t,ctx){
 return `<button type="button" class="rbTab${ctx?" ctx":""}" `
  +`role="tab" id="rbT-${esc(t.id)}" aria-controls="rbP-${esc(t.id)}" `
  +`aria-selected="false" tabindex="-1" data-tab="${esc(t.id)}">`
  +`<span class="tn">${esc(t.n)}</span>`
  +(t.kt?`<span class="kt" hidden>${arNum(t.kt)}</span>`:"")
  +`</button>`;
}
const paneHtml=t=>`<div class="rbPane" id="rbP-${esc(t.id)}" `
 +`role="tabpanel" aria-labelledby="rbT-${esc(t.id)}" hidden>`
 +(t.panels||[]).map(p=>panelHtml(t.id,p)).join("")+`</div>`;

/* التبويب السياقي واحدٌ يتبدّل محتواه — لا تسعةٌ تُبنى وتُخفى */
let ctxKind=null;

export function buildRibbon(){
 const rb=$("#ribbon");
 if(!rb)return 0;
 rb.innerHTML=`
<div id="rbTabs" role="tablist" aria-label="شريط الأوامر">
 ${RIBBON.map(t=>tabBtn(t)).join("")}
 <span class="gap"></span>
 <button type="button" id="rbToggle" class="rbTgl"
  title="اطوِ الشريط · Ctrl+F1" aria-label="اطوِ الشريط">▲</button>
</div>
<div id="rbPanes">${RIBBON.map(paneHtml).join("")}</div>`;
 ctxKind=null;
 setTab(RIBBON.some(t=>t.id===UIS.tab)?UIS.tab:"home",1);
 return RIBBON.length;
}
export function buildQAT(){
 const q=$("#qat");
 if(!q)return 0;
 q.innerHTML=QAT.map(it=>it.sep?`<span class="dv"></span>`
  :`<button type="button" data-act="${esc(it.act)}" `
   +`data-key="a:${esc(it.act)}" title="${esc(it.n)}" `
   +`aria-label="${esc(it.n)}">${ic(it.ico,16)}</button>`).join("");
 return QAT.filter(x=>!x.sep).length;
}
/* ═══ التبويبات ═══ */
export function setTab(id,quiet){
 const rb=$("#ribbon");
 if(!rb)return false;
 const tabs=[...rb.querySelectorAll(".rbTab")];
 if(!tabs.some(b=>b.dataset.tab===id))return false;
 tabs.forEach(b=>{
  const on=b.dataset.tab===id;
  b.setAttribute("aria-selected",on?"true":"false");
  b.tabIndex=on?0:-1;
  b.classList.toggle("on",on);
 });
 [...rb.querySelectorAll(".rbPane")].forEach(p=>{
  p.hidden=(p.id!=="rbP-"+id);
 });
 if(!quiet&&!id.startsWith("ctx"))UIS.tab=id;
 return true;
}
export const curTab=()=>{
 const b=document.querySelector("#ribbon .rbTab.on");
 return b?b.dataset.tab:null;
};
/* ═══ التبويب السياقي ═══
   kind=null يزيله. والعودة إلى تبويب المستخدم عند الزوال — لا
   يبقى الشريط على لوحٍ فارغ. */
export function setCtx(kind){
 const rb=$("#ribbon");
 if(!rb)return;
 if(kind===ctxKind)return;
 const old=rb.querySelector('[data-tab="ctx"]');
 const oldPane=document.getElementById("rbP-"+"ctx");
 if(!kind||!CTX[kind]){
  ctxKind=null;
  if(old){
   const wasOn=old.classList.contains("on");
   old.remove();
   if(oldPane)oldPane.remove();
   if(wasOn)setTab(RIBBON.some(t=>t.id===UIS.tab)?UIS.tab:"home",1);
  }
  return;
 }
 const d=CTX[kind];
 const t={id:"ctx",n:d.n,panels:d.panels};
 const wasOn=!!(old&&old.classList.contains("on"));
 if(old)old.remove();
 if(oldPane)oldPane.remove();
 $("#rbTabs").insertAdjacentHTML("afterbegin",tabBtn(t,1));
 $("#rbPanes").insertAdjacentHTML("beforeend",paneHtml(t));
 ctxKind=kind;
 /* الانتقال التلقائي مرّةً عند أول تحديد فقط — لا يُقفز
    بالمستخدم كلّما بدّل نوع المحدَّد */
 if(wasOn||UIS.ctxAuto)setTab("ctx",1);
}
export const ctxOf=()=>ctxKind;

/* ═══ الطيّ ═══ */
export function setMin(v){
 const rb=$("#ribbon");
 if(!rb)return;
 const on=v?1:0;
 rb.classList.toggle("min",!!on);
 UIS.ribbonMin=on;
 const t=$("#rbToggle");
 if(t){
  t.textContent=on?"▼":"▲";
  t.title=(on?"افتح الشريط":"اطوِ الشريط")+" · Ctrl+F1";
 }
}
/* ═══ المزامنة ═══ رخيصةٌ بقصد: تُنادى مع كل حركة مؤشّر ═══ */
let lastCur=null, BTN=null;
export function invalidateSync(){BTN=null; lastCur=null}

export function syncRibbon(){
 if(UIS.shell!=="ribbon")return;
 if(!BTN)BTN=[...document.querySelectorAll("#ribbon [data-cmd]")];
 const cur=R.active()?R.T.def.id:"";
 if(cur===lastCur)return;
 lastCur=cur;
 BTN.forEach(b=>b.classList.toggle("on",b.dataset.cmd===cur));
}
/* حالة المفاتيح تُقرأ من هدفها — مصدرٌ واحد لا نسخةٌ ثانية */
export function syncRibbonTogs(){
 if(UIS.shell!=="ribbon")return;
 document.querySelectorAll("#ribbon [data-tog]").forEach(b=>{
  const t=document.querySelector(b.dataset.tog);
  if(!t){b.disabled=true; return}
  const on=(t.type==="checkbox")?t.checked:t.classList.contains("on");
  b.classList.toggle("on",!!on);
 });
 ["undo","redo"].forEach(k=>{
  const src=document.querySelector("#b"+k[0].toUpperCase()+k.slice(1));
  if(!src)return;
  document.querySelectorAll(`[data-act="${k}"]`)
   .forEach(b=>{b.disabled=src.disabled});
 });
}
/* ═══ KeyTips ═══ */
export function showKT(on){
 document.querySelectorAll("#ribbon .kt, #appBtn .kt")
  .forEach(e=>{e.hidden=!on});
 document.documentElement.classList.toggle("kt",!!on);
}
