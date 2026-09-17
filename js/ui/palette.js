/* ═══ لوحة الأوامر ═══
   فهرس واحد للأدوات والأفعال والمقاسات والقوالب وسجلّ الأوامر. */
import * as R from "../tools/registry.js";
import {allItems} from "./ribbon/schema.js";
import {runSpec} from "./ribbon/wire.js";
import {HOOK} from "./bus.js";
import {SIZES,TPL,applySize} from "../tools/presets.js";
import {parsePlan,planReady} from "../ai/plan.js";
import {trial,commit,rollback} from "../ai/run.js";
import {V} from "./canvas.js";
import {JR,jrText,jrPlan,jrClear,jrCount,jrTainted,jrMute} from "../core/journal.js";
import {snapTake,snapList,snapRestore,snapsLoad} from "../io/snaps.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;")
 .replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const KB={ض:"q",ص:"w",ث:"e",ق:"r",ف:"t",غ:"y",ع:"u",ه:"i",
 خ:"o",ح:"p",ش:"a",س:"s",ي:"d",ب:"f",ل:"g",ا:"h",ت:"j",
 ن:"k",م:"l",ئ:"z",ء:"x",ؤ:"c",ر:"v",ى:"n",ة:"m",
 ج:"[",د:"]",ك:";",ط:"'",و:",",ز:".",ظ:"/"};
const toLat=s=>[...String(s||"")].map(c=>KB[c]===undefined?c:KB[c]).join("");
const norm=s=>String(s==null?"":s).toLowerCase()
 .replace(/[\u064B-\u0652\u0670\u0640]/g,"")
 .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
 .replace(/\s+/g," ").trim();
let BODY=null,NT=-1,LIST=[],IDX=0,OPEN=0;
const box=()=>$("#palette");
function score(hay,q){
 if(!q)return 0;
 if(hay.startsWith(q))return 1000-hay.length;
 const i=hay.indexOf(q);
 if(i>=0)return 700-i-hay.length*.1;
 let s=0,j=0,run=0;
 for(const ch of q){
  const k=hay.indexOf(ch,j); if(k<0)return 0;
  run=k===j?run+1:0; s+=10+run*6-Math.min(k-j,20)*.5; j=k+1;
 }
 return s;
}
function build(){
 const n=R.toolList().length;
 if(BODY&&n===NT)return BODY;
 NT=n; const out=[];
 R.toolList().filter(d=>d&&d.id).forEach(d=>{
  const al=Object.keys(R.TOOLS).filter(k=>R.TOOLS[k]===d&&k!==d.id);
  out.push({kind:"cmd",key:d.id,label:d.label,sub:[d.id,...al].join(" · "),
   hay:norm([d.id,d.label,...al,d.hint||""].join(" ")),
   destruct:!!d.destruct});
 });
 const seen=new Set(["delSel"]);
 allItems().filter(i=>(i.act||i.cmd)&&!seen.has(i.act||i.cmd)).forEach(i=>{
  const key=i.act||i.cmd; seen.add(key);
  out.push({kind:i.act?"act":"cmd",key,label:i.n||key,sub:"أمر",
   hay:norm(`${i.n||""} ${key}`)});
 });
 SIZES.forEach(p=>out.push({kind:"size",key:p.id,ref:p,label:p.label,
  sub:`${p.sub} · ${p.tool}`,hay:norm(`${p.label} ${p.cat} ${p.sub} ${p.tool}`)}));
 TPL.forEach(t=>out.push({kind:"tpl",key:t.id,ref:t,label:t.label,sub:t.sub,
  hay:norm(`${t.label} ${t.sub} قالب`)}));
 const fn=[
  {key:"jr.copy",label:"سجلّ الأوامر: انسخه",sub:"نصّ أسطرٍ بنحو سطر الإدخال",fn:jrCopy},
  {key:"jr.replay",label:"سجلّ الأوامر: أعِد تشغيله",sub:"يُنفَّذ على الحالة الجارية",fn:jrReplay},
  {key:"jr.clear",label:"سجلّ الأوامر: امسحه",sub:"يبدأ التسجيل من الآن",fn:()=>{
   jrClear();HOOK.report("in","مُسح سجلّ الأوامر");
  }},
  {key:"snap.now",label:"لقطة الآن",sub:"نسخة كاملة تعبر إغلاق الصفحة",fn:snapNow},
  {key:"snap.list",label:"استعادة لقطة…",sub:"آخر ١٢ لقطة · الاستعادة خطوة تراجع",fn:paletteSnaps}
 ];
 fn.forEach(f=>out.push({kind:"fn",key:f.key,ref:f,label:f.label,sub:f.sub,hay:norm(f.label+" "+f.sub)}));
 BODY=out; return BODY;
}
function rank(raw){
 const q=norm(raw),qa=norm(toLat(raw));
 return build().map(it=>({it,s:Math.max(score(it.hay,q),qa!==q?score(it.hay,qa):0)}))
  .filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,12);
}
function render(){
 const B=box(); if(!B)return;
 B.querySelector(".pl").innerHTML=LIST.length
  ?LIST.map((x,i)=>`<div class="it${i===IDX?" sel":""}" data-i="${i}">
    <span class="lb">${esc(x.it.label)}${x.it.destruct?' <b class="dg">هادم</b>':""}</span>
    <span class="sb">${esc(x.it.sub)}</span></div>`).join("")
  :`<div class="nm">لا نتيجة</div>`;
}
export function paletteClose(){
 const B=box(); if(!B||!OPEN)return;
 OPEN=0; B.hidden=true; $("#clIn")?.focus();
}
export function paletteOpen(){
 const B=box(); if(!B)return;
 OPEN=1; B.hidden=false; const inp=B.querySelector("input");
 inp.value=""; IDX=0; LIST=build().filter(x=>["wall","rect","door","win","area","dim",
  "move","copy","offset","measure"].includes(x.key)).map(it=>({it,s:1}));
 render(); inp.focus();
}
export const paletteToggle=()=>OPEN?paletteClose():paletteOpen();
export const paletteIsOpen=()=>!!OPEN;
function runTpl(t){
 const at=[Math.round(V.cx/100)/10,Math.round(V.cy/100)/10];
 const p=parsePlan("```plan\n"+t.lines(at).join("\n")+"\n```",1,400);
 if(!planReady(p)){HOOK.report("er",`«${t.label}» مرفوض: `+(p.errs[0]||"سطر غير مفهوم"));return}
 const r=trial(p.lines,{stopOnError:1});
 if(r.errs){rollback(r);HOOK.report("er",`تعذّر «${t.label}» — أُرجع كل شيء`);return}
 const n=commit(r);HOOK.report("ok",`${t.label} · ${n} كياناً · Ctrl+Z يتراجع عنها`);
 HOOK.refresh(1);
}
function jrCopy(){
 const n=jrCount();
 if(!n){HOOK.report("in","السجلّ فارغ");return}
 if(navigator.clipboard?.writeText)
  navigator.clipboard.writeText(jrText()).then(
   ()=>HOOK.report("ok",`نُسخ ${n} سطراً${jrTainted()?" · مشوب":""}`),
   ()=>HOOK.report("er","تعذّر النسخ — المتصفّح منع الحافظة"));
 else HOOK.report("er","الحافظة غير متاحة");
}
function jrReplay(){
 const n=jrCount();
 if(!n){HOOK.report("in","السجلّ فارغ");return}
 if(jrTainted()&&!confirm(`السجلّ مشوب بـ ${jrTainted()} عملية لا يُعبّر عنها بسطر. الإعادة ستختلف. متابعة؟`))return;
 const p=parsePlan(jrPlan(),1,JR.max);
 if(!planReady(p)){HOOK.report("er",`السجلّ غير قابل للإعادة: `+(p.errs[0]||"سطر غير مفهوم"));return}
 jrMute(1); let r=null; try{r=trial(p.lines,{stopOnError:1})}finally{jrMute(0)}
 if(!r||r.errs){if(r)rollback(r);HOOK.report("er","تعذّرت الإعادة — أُرجع كل شيء");return}
 const made=commit(r);HOOK.report("ok",`أُعيد ${r.ran} سطراً · ${made} كياناً`);
 HOOK.refresh(1);
}
async function snapNow(){
 const r=await snapTake("يدوية");
 HOOK.report(r.ok?"ok":"wr",r.ok?`أُخذت لقطة · ${snapList().length} من 12 محفوظة`
  :(r.err==="فارغ"?"لا شيء يُلتقط — المشروع فارغ":"تعذّرت اللقطة — IndexedDB غير متاح"));
}
export function paletteSnaps(){
 paletteOpen(); const L=snapList();
 if(!L.length){HOOK.report("in","لا لقطات بعد — «لقطة الآن» تأخذ أولها");paletteClose();return}
 LIST=L.map(m=>({s:1,it:{kind:"snapr",key:m.id,ref:m,
  label:`${new Date(m.t).toLocaleString("ar")} · ${m.why}`,
  sub:`${m.w} جدار · ${m.o} فتحة · ${m.a} منطقة`}})); IDX=0; render();
}
export function wirePalette(){
 const B=box(); if(!B)return;
 B.innerHTML=`<div class="pw" role="dialog" aria-modal="true" aria-label="لوحة الأوامر">
  <input type="text" spellcheck="false" autocomplete="off" placeholder="اكتب اسم أداة أو أمر…">
  <div class="pl"></div><div class="ft">↑↓ تنقّل · Enter ينفّذ · Esc يغلق</div></div>`;
 B.hidden=true; const inp=B.querySelector("input");
 inp.addEventListener("input",()=>{LIST=rank(inp.value);IDX=0;render()});
 inp.addEventListener("keydown",e=>{
  e.stopPropagation();
  if(e.key==="Escape"){e.preventDefault();paletteClose();return}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(LIST.length)
   {IDX=(IDX+(e.key==="ArrowDown"?1:-1)+LIST.length)%LIST.length;render()}return}
  if(e.key==="Enter"){e.preventDefault();run(LIST[IDX])}
 });
 B.querySelector(".pl").addEventListener("mousedown",e=>{
  const it=e.target.closest("[data-i]");if(it){e.preventDefault();run(LIST[+it.dataset.i])}
 });
 B.addEventListener("mousedown",e=>{if(e.target===B)paletteClose()});
 snapsLoad();
}
function run(x){
 if(!x)return; paletteClose();
 if(x.it.kind==="cmd"){R.histAdd(x.it.key);R.begin(x.it.key);HOOK.prompt();return}
 if(x.it.kind==="act"){runSpec({act:x.it.key});return}
 if(x.it.kind==="size"){applySize(x.it.ref);HOOK.report("in",`${x.it.label} — انقر الموضع`);HOOK.prompt();return}
 if(x.it.kind==="tpl"){runTpl(x.it.ref);return}
 if(x.it.kind==="fn"){x.it.ref.fn();return}
 if(x.it.kind==="snapr"){
  const m=x.it.ref;
  if(!confirm(`استعادة لقطة ${new Date(m.t).toLocaleString("ar")}؟\nعملك الحالي يُستبدل، و Ctrl+Z يعيده.`))return;
  snapRestore(m.id).then(r=>{if(r.ok){HOOK.report("ok",`استُعيدت اللقطة · ${r.w} جدار`);HOOK.refresh(1)}
   else HOOK.report("er",r.err)});
 }
}