/* ═══ لوحة الأوامر ═══ بحثٌ ضبابيّ عربي/إنجليزي فوق سجلّ الأدوات
   الحقيقي (tools/registry.js: toolList/begin) — لا قائمة أوامر
   وهميّة موازية. تقبل أيضاً أفعالاً على مستوى التطبيق (تراجع،
   حفظ...) تُحقَن من app.js عبر initCmdPalette({extra}). */
import {toolList,begin,active,cancel} from "../tools/registry.js";
import {HOOK} from "./bus.js";

const ID="cmdPal";
let root=null,inputEl=null,listEl=null,mounted=false,extra=[],items=[],sel=0;

const nz=s=>String(s||"").toLowerCase().trim();
function score(q,name){
 q=nz(q); name=nz(name); if(!q)return 0;
 let i=0,sc=0,run=0;
 for(let j=0;j<name.length&&i<q.length;j++){
  if(name[j]===q[i]){i++; run++; sc+=2+run; if(j===0)sc+=4;}
  else run=0;
 }
 return i===q.length?sc-(name.length-q.length):-1;
}
function buildIndex(){
 const fromTools=toolList().map(d=>({
  id:"tool:"+d.id, label:d.label||d.id, hint:d.hint||"",
  names:[d.label,...(String(d.alias||"").split(/\s+/).filter(Boolean))],
  run:()=>{ if(active())cancel(true); begin(d.id); }
 }));
 items=fromTools.concat(extra.map(x=>({
  id:"ext:"+x.id, label:x.label, hint:x.hint||"",
  names:[x.label,...(x.aliases||[])], run:x.run
 })));
}
function suggest(q,limit=9){
 if(!nz(q))return items.slice(0,limit);
 const out=[];
 for(const it of items){
  let best=-1;
  for(const n of it.names)best=Math.max(best,score(q,n));
  if(best>=0)out.push({...it,score:best});
 }
 return out.sort((a,b)=>b.score-a.score).slice(0,limit);
}

function injectCss(){
 if(document.getElementById("cp-css"))return;
 const css=`
#${ID}-ov{position:fixed; inset:0; z-index:70; display:flex; align-items:flex-start;
 justify-content:center; padding-block-start:min(14vh,140px); background:rgba(0,0,0,.4)}
#${ID}-ov[hidden]{display:none}
#${ID}{width:min(440px,92vw); max-height:60vh; display:flex; flex-direction:column;
 background:var(--bg2,#1a1d21); color:var(--fg,#e9edf2);
 border:1px solid var(--ln,#2a2f36); border-radius:var(--r3,10px);
 box-shadow:var(--sh3,0 18px 48px rgba(0,0,0,.5)); overflow:hidden;
 font:13px/1.5 var(--ui,system-ui,sans-serif)}
#${ID} input{width:100%; box-sizing:border-box; padding:11px 12px; font-size:14px;
 background:var(--bg3,#20242a); color:var(--fg,#e9edf2); border:0;
 border-bottom:1px solid var(--ln,#2a2f36); outline:0}
#${ID} .cp-list{list-style:none; margin:0; padding:4px; overflow-y:auto}
#${ID} .cp-it{display:flex; align-items:baseline; gap:8px; padding:7px 10px;
 border-radius:6px; cursor:pointer; color:var(--fg2,#c4ccd6)}
#${ID} .cp-it .lbl{font-weight:600; color:inherit}
#${ID} .cp-it .hint{flex:1; text-align:end; color:var(--fg3,#8a929c); font-size:11.5px;
 white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
#${ID} .cp-it.sel{background:var(--acq,rgba(110,168,254,.18)); color:var(--acf,#fff)}
#${ID} .cp-empty{padding:18px 12px; text-align:center; color:var(--fg3,#8a929c)}`;
 const st=document.createElement("style"); st.id="cp-css"; st.textContent=css;
 document.head.appendChild(st);
}
function build(){
 injectCss();
 let ov=document.getElementById(ID+"-ov");
 if(!ov){
  ov=document.createElement("div"); ov.id=ID+"-ov"; ov.hidden=true; ov.setAttribute("dir","rtl");
  ov.innerHTML=
   `<div id="${ID}" role="dialog" aria-label="لوحة الأوامر">
      <input type="text" placeholder="اكتب اسم أداة أو أمراً… (خط، جدار، move)"
       spellcheck="false" autocomplete="off">
      <ul class="cp-list"></ul>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener("mousedown",e=>{ if(e.target===ov)close(); });
 }
 root=ov; inputEl=root.querySelector("input"); listEl=root.querySelector(".cp-list");
 inputEl.addEventListener("input",()=>render(inputEl.value));
 inputEl.addEventListener("keydown",onKey);
 listEl.addEventListener("click",e=>{
  const it=e.target.closest("[data-i]"); if(it)run(+it.dataset.i);
 });
 mounted=true;
}
let shown=[];
function render(q){
 shown=suggest(q); sel=0;
 listEl.innerHTML=shown.length? shown.map((it,i)=>
  `<li class="cp-it${i===0?" sel":""}" data-i="${i}">
    <span class="lbl">${esc(it.label)}</span>
    <span class="hint">${esc(it.hint)}</span></li>`).join("")
  : `<li class="cp-empty">لا نتائج</li>`;
}
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function run(i){
 const it=shown[i]; if(!it)return;
 close();
 try{ it.run(); }
 catch(e){ if(HOOK&&HOOK.report)HOOK.report("er",e.message||String(e)); }
}
function move(d){
 if(!shown.length)return;
 sel=(sel+d+shown.length)%shown.length;
 [...listEl.children].forEach((li,i)=>li.classList.toggle("sel",i===sel));
 listEl.children[sel]?.scrollIntoView({block:"nearest"});
}
function onKey(e){
 if(e.key==="Escape"){ e.preventDefault(); close(); return; }
 if(e.key==="ArrowDown"){ e.preventDefault(); move(1); return; }
 if(e.key==="ArrowUp"){ e.preventDefault(); move(-1); return; }
 if(e.key==="Enter"){ e.preventDefault(); run(sel); return; }
}
function close(){ if(root)root.hidden=true; }

export function initCmdPalette(opts){
 extra=(opts&&opts.extra)||[];
 buildIndex();
}
export function openCmdPalette(){
 if(!mounted)build();
 buildIndex();
 root.hidden=false; inputEl.value=""; render(""); inputEl.focus();
}
export function closeCmdPalette(){ close(); }
export const cmdPaletteOpen=()=>!!(root&&!root.hidden);
export function toggleCmdPalette(){
 if(!mounted)build();
 if(root.hidden)openCmdPalette(); else close();
}
