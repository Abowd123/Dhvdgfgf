/* ═══ لوحة السجل ═══ سجلّ تراجع/إعادة مرئي — قفزٌ لأي خطوة.
   تعتمد على core/state.js الحقيقي (historyTimeline/historyJumpTo/
   canUndo/canRedo/undo/redo) — لا سجلّ ثانٍ، ولا لقطة مستقلّة.
   تُستدعى refreshHistoryPanel() من نفس معاودة setAfterEdit في
   app.js، فتبقى متزامنةً مع كل تعديلٍ أو تراجعٍ أو إعادة. */
import {historyTimeline,historyJumpTo,canUndo,canRedo,undo,redo}
 from "../core/state.js";
import {HOOK} from "./bus.js";

const ID="histPanel";
let root=null,listEl=null,countEl=null,mounted=false;
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function injectCss(){
 if(document.getElementById("hp-css"))return;
 const css=`
#${ID}{position:fixed; inset-block:56px auto; inset-inline-end:12px; z-index:40;
 width:250px; max-height:min(62vh,540px); display:flex; flex-direction:column;
 background:var(--bg2,#1a1d21); color:var(--fg,#e9edf2);
 border:1px solid var(--ln,#2a2f36); border-radius:var(--r3,8px);
 box-shadow:var(--sh3,0 12px 34px rgba(0,0,0,.42)); overflow:hidden;
 font:12.5px/1.5 var(--ui,system-ui,sans-serif)}
#${ID}[hidden]{display:none}
#${ID} .hp-h{display:flex; align-items:center; gap:8px; padding:8px 10px;
 background:var(--bg3,#20242a); border-bottom:1px solid var(--ln,#2a2f36)}
#${ID} .hp-title{font-weight:600}
#${ID} .hp-count{color:var(--fg3,#8a929c); font:11px var(--mono,monospace)}
#${ID} .hp-x{margin-inline-start:auto; background:none; border:0; cursor:pointer;
 color:var(--fg3,#8a929c); font-size:14px; line-height:1; padding:2px 5px; border-radius:4px}
#${ID} .hp-x:hover{background:var(--hov,rgba(255,255,255,.07)); color:var(--fg,#e9edf2)}
#${ID} .hp-body{overflow-y:auto; flex:1}
#${ID} .hp-list{list-style:none; margin:0; padding:4px}
#${ID} .hp-it{display:flex; align-items:center; gap:8px; padding:6px 9px;
 border-radius:6px; cursor:pointer; color:var(--fg2,#c4ccd6)}
#${ID} .hp-it:hover{background:var(--hov,rgba(255,255,255,.07)); color:var(--fg,#e9edf2)}
#${ID} .hp-it .dot{width:8px; height:8px; border-radius:50%; flex:none;
 border:1.5px solid var(--fg3,#8a929c)}
#${ID} .hp-it.cur{background:var(--acq,rgba(110,168,254,.15)); color:var(--acf,#fff)}
#${ID} .hp-it.cur .dot{background:var(--ac,#6ea8fe); border-color:var(--ac,#6ea8fe)}
#${ID} .hp-it.future{opacity:.6}
#${ID} .hp-it .lbl{flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
#${ID} .hp-it .n{color:var(--fg3,#8a929c); font:11px var(--mono,monospace)}
#${ID} .hp-empty{padding:20px 12px; text-align:center; color:var(--fg3,#8a929c)}
#${ID} .hp-f{display:flex; gap:6px; padding:8px; background:var(--bg3,#20242a);
 border-top:1px solid var(--ln,#2a2f36)}
#${ID} .hp-f button{flex:1; padding:5px 6px; cursor:pointer; font-size:11.5px;
 color:var(--fg2,#c4ccd6); background:var(--bg2,#1a1d21);
 border:1px solid var(--ln2,#333a42); border-radius:6px}
#${ID} .hp-f button:hover:not(:disabled){background:var(--hov,rgba(255,255,255,.07)); color:var(--fg,#e9edf2)}
#${ID} .hp-f button:disabled{opacity:.4; cursor:default}`;
 const st=document.createElement("style"); st.id="hp-css"; st.textContent=css;
 document.head.appendChild(st);
}
function build(){
 injectCss();
 root=document.getElementById(ID);
 if(!root){
  root=document.createElement("aside");
  root.id=ID; root.hidden=true; root.setAttribute("dir","rtl");
  root.innerHTML=
   `<header class="hp-h"><span class="hp-title">السجل</span>
      <span class="hp-count"></span>
      <button type="button" class="hp-x" data-act="close" title="إغلاق">✕</button></header>
    <div class="hp-body"><ul class="hp-list"></ul></div>
    <footer class="hp-f">
      <button type="button" data-act="undo" title="تراجع">↶ تراجع</button>
      <button type="button" data-act="redo" title="إعادة">↷ إعادة</button></footer>`;
  document.body.appendChild(root);
 }
 listEl=root.querySelector(".hp-list"); countEl=root.querySelector(".hp-count");
 root.addEventListener("click",onClick);
}
export function refreshHistoryPanel(){
 if(!mounted||!root||root.hidden)return;
 const {past,future,current}=historyTimeline();
 const steps=past.concat(future); const total=steps.length;
 countEl.textContent=total?`${current}/${total}`:"";
 root.querySelector('[data-act="undo"]').disabled=!canUndo();
 root.querySelector('[data-act="redo"]').disabled=!canRedo();
 if(!total){listEl.innerHTML=`<li class="hp-empty">لا خطوات بعد — ابدأ الرسم</li>`; return}
 const rows=[];
 for(let a=total;a>=1;a--){
  const cls=a===current?"cur":(a>current?"future":"");
  rows.push(`<li class="hp-it ${cls}" data-jump="${a}" title="${esc(steps[a-1])}">
   <span class="dot"></span><span class="lbl">${esc(steps[a-1])}</span><span class="n">${a}</span></li>`);
 }
 rows.push(`<li class="hp-it ${current===0?"cur":""}" data-jump="0" title="الحالة الأولية">
  <span class="dot"></span><span class="lbl">البداية</span><span class="n">0</span></li>`);
 listEl.innerHTML=rows.join("");
}
function onClick(e){
 const act=e.target.closest("[data-act]");
 if(act){
  if(act.dataset.act==="close")return closeHistoryPanel();
  if(act.dataset.act==="undo"){undo(); refreshHistoryPanel(); return}
  if(act.dataset.act==="redo"){redo(); refreshHistoryPanel(); return}
 }
 const it=e.target.closest("[data-jump]");
 if(it){
  const n=+it.dataset.jump; historyJumpTo(n);
  if(HOOK&&HOOK.report)HOOK.report("in",`السجل: انتقال إلى الخطوة ${n}`);
  refreshHistoryPanel();
 }
}
export function initHistoryPanel(){
 if(mounted)return;
 build(); mounted=true;
}
export function openHistoryPanel(){
 if(!mounted)initHistoryPanel();
 root.hidden=false; refreshHistoryPanel();
}
export function closeHistoryPanel(){ if(root)root.hidden=true; }
export function toggleHistoryPanel(){
 if(!mounted)initHistoryPanel();
 root.hidden=!root.hidden;
 if(!root.hidden)refreshHistoryPanel();
}
export const historyPanelOpen=()=>!!(root&&!root.hidden);
