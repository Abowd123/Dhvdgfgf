/* ═══ شريط الأدوات وشريط خياراتها ═══
   الخيارات تُقرأ عند إنشاء العنصر لا قبله ولا بعده،
   فتغييرها وسط سلسلة يسري على القطعة التالية وحدها.

   ملاحظة أداء وسلوك: HOOK.prompt() تُنادى من mousemove مع كل حركة
   مؤشّر أثناء أي أداة. فكان الشريط يُهدَم ويُبنى ستّين مرّةً في
   الثانية، ويسرق التركيز من حقلٍ تكتب فيه إن حرّكتَ الفأرة.
   فانقسم قسمين:
     buildOptbar  يهدم ويبني — عند تغيّر الأداة أو تغيّر الحقول
                  الظاهرة (بصمةٌ تُقارَن، لا تخمين).
     syncOptbar   يحدّث القيَم بمقارنةٍ فلا يهدم شيئاً، ويتخطّى
                  العنصر المركَّز عليه فلا يُكتَب فوق ما تكتبه. */
import {S} from "../core/state.js";
import * as R from "../tools/registry.js";
import {icon} from "./icons.js";
import {UIS} from "./store.js";
import {HOOK} from "./bus.js";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s)
 .replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ic=(n,s)=>UIS.icons?icon(n,s||15):"";

/* ترتيب الظهور · @ يعني أمراً لا أداة */
const BAR=[
 {cmd:"",       label:"تحديد", title:"Esc", ico:"select"},
 {cmd:"sel",    label:"تحديد بالمعرّف",title:"SE", ico:"selid"},
 {sp:1},
 {cmd:"wall",   label:"جدار",   title:"W",  ico:"wall"},
 {cmd:"rect",   label:"مستطيل", title:"R",  ico:"rect"},
 {cmd:"col",    label:"عمود",   title:"K",  ico:"col"},
 {cmd:"gridcols",label:"أعمدة المحاور",title:"GK", ico:"gridcols"},
 {sp:1},
 {cmd:"door",   label:"باب",    title:"D",  ico:"door"},
 {cmd:"win",    label:"شباك",   title:"N",  ico:"window"},
 {cmd:"opening",label:"فتحة",   title:"OP", ico:"opening"},
 {cmd:"niche",  label:"كوّة",    title:"",   ico:"niche"},
 {sp:1},
 {cmd:"stair",  label:"درج",    title:"ST", ico:"stair"},
 {cmd:"wc",     label:"كرسي",   title:"",   ico:"wc"},
 {cmd:"lav",    label:"مغسلة",  title:"",   ico:"lav"},
 {cmd:"shower", label:"دُش",     title:"",   ico:"shower"},
 {cmd:"sink",   label:"مجلى",   title:"",   ico:"sink"},
 {sp:1},
 {cmd:"area",   label:"منطقة",  title:"A",  ico:"area"},
 {cmd:"arearef",label:"حدّث",    title:"AR", ico:"arearef"},
 {sp:1},
 {cmd:"move",   label:"نقل",    title:"M",  ico:"move"},
 {cmd:"copy",   label:"نسخ",    title:"CP", ico:"copy"},
 {cmd:"rotate", label:"دوران",  title:"RO", ico:"rotate"},
 {cmd:"mirror", label:"مرآة",   title:"MR", ico:"mirror"},
 {cmd:"offset", label:"إزاحة",  title:"OF", ico:"offset"},
 {sp:1},
 {cmd:"break",  label:"قطع",    title:"BR", ico:"brk"},
 {cmd:"divide", label:"قسمة",   title:"DV", ico:"divide"},
 {cmd:"trim",   label:"قصّ",     title:"TR", ico:"trim"},
 {cmd:"extend", label:"تمديد",  title:"EX", ico:"extend"},
 {cmd:"stretch",label:"شدّ",     title:"STR",ico:"stretch"},
 {cmd:"weld",   label:"لحم",    title:"WL", ico:"weld"},
 {cmd:"match",  label:"مطابقة", title:"MA", ico:"match"},
 {sp:1},
 {cmd:"dim",    label:"بُعد",    title:"D1", ico:"dim"},
 {cmd:"chain",  label:"سلسلة",  title:"CH", ico:"chain"},
 {cmd:"text",   label:"نصّ",     title:"T",  ico:"text"},
 {cmd:"lead",   label:"قائد",   title:"LE", ico:"lead"},
 {cmd:"level",  label:"منسوب",  title:"LV", ico:"level"},
 {cmd:"axis",   label:"محور",   title:"AX", ico:"axis"},
 {sp:1},
 {cmd:"measure",label:"قياس",   title:"MI", ico:"measure"},
 {cmd:"@insp",  label:"افحص",   title:"F7", ico:"inspect"}
];

let TBTN=null, lastCur=null;

export function buildTools(){
 $("#tools").innerHTML=BAR.map(b=>b.sp?`<span class="sp"></span>`
  :`<button data-cmd="${esc(b.cmd)}" title="${esc(b.title||"")}">`
   +`${ic(b.ico)}<span>${esc(b.label)}</span></button>`).join("")
  +`<span class="gap"></span>`
  +`<button id="bLall" title="Ctrl+Shift+L">${ic("layers")}`
   +`<span>أظهر الكل</span></button>`
  +`<button id="bUndo" title="تراجع · Ctrl+Z" aria-label="تراجع"`
   +` class="ico">${ic("undo")||"↶"}</button>`
  +`<button id="bRedo" title="إعادة · Ctrl+Shift+Z" aria-label="إعادة"`
   +` class="ico">${ic("redo")||"↷"}</button>`
  +`<button id="bFit" title="ملاءمة العرض">${ic("fit")}`
   +`<span>ملاءمة</span></button>`
  +`<button id="bHelp" title="المساعدة · F1" aria-label="المساعدة"`
   +` class="ico">${ic("help")||"؟"}</button>`;
 TBTN=null; lastCur=null;
}
/* ═══ إبراز الأداة النشطة — لا يعمل إلّا إن تغيّرت ═══ */
export function syncTools(){
 if(!TBTN)TBTN=[...document.querySelectorAll("#tools [data-cmd]")];
 const cur=R.active()?R.T.def.id:"";
 if(cur===lastCur)return;
 lastCur=cur;
 TBTN.forEach(b=>b.classList.toggle("on",b.dataset.cmd===cur));
}
/* ═══ شريط الخيارات ═══ */
const visFields=d=>{
 const o=R.OPT[d.id]||{};
 return (d.opts||[]).filter(f=>!f.when||f.when(o));
};
/* البصمة: الأداة + مفاتيح الحقول الظاهرة. تغيّرها وحده يوجب البناء */
const sigOf=d=>d?(d.id+"|"+visFields(d).map(f=>f.k).join(",")):"";
let barSig=null;

function ctlOf(f,v){
 const tag=`data-ok="${esc(f.k)}"`;
 if(f.type==="sel")
  return `<span class="of"><span>${esc(f.label)}</span>`
   +`<select ${tag}>`
   +f.items.map(([iv,it])=>`<option value="${esc(iv)}"`
    +`${String(iv)===String(v)?" selected":""}>${esc(it)}</option>`)
    .join("")+`</select></span>`;
 if(f.type==="chk")
  return `<label class="chk"><input type="checkbox" ${tag}`
   +`${(v===1||v===true||v==="1")?" checked":""}> `
   +`${esc(f.label)}</label>`;
 if(f.type==="num")
  return `<span class="of"><span>${esc(f.label)}</span>`
   +`<input class="num" type="number" ${tag} `
   +`value="${esc(v)}" step="0.1"></span>`;
 return `<span class="of"><span>${esc(f.label)}</span>`
  +`<input class="num" type="text" ${tag} value="${esc(v)}"></span>`;
}
export function buildOptbar(){
 const box=$("#optbar");
 if(!box)return;
 const d=R.T.def;
 barSig=sigOf(d);
 if(!d){
  box.innerHTML=`<span class="tl">تحديد</span>`
   +`<span class="hint">انقر عنصراً · اسحب إطاراً على الفراغ · `
   +`Shift+نقر يضيف · اسحب المقابض · Ctrl+A يحدّد المرئيّ</span>`;
  return;
 }
 const o=R.OPT[d.id]||{};
 box.innerHTML=`<span class="tl">${esc(d.label)}</span>`
  +visFields(d).map(f=>ctlOf(f,o[f.k])).join("")
  +(d.hint?`<span class="hint">${esc(d.hint)}</span>`:"");
}
/* تحديث القيَم بلا هدم · يُنادى مع كل حركة مؤشّر فلا يجوز أن يبني */
export function syncOptbar(){
 const d=R.T.def;
 if(sigOf(d)!==barSig){buildOptbar(); return}
 if(!d)return;
 const box=$("#optbar");
 if(!box)return;
 const o=R.OPT[d.id]||{};
 const A=document.activeElement;
 box.querySelectorAll("[data-ok]").forEach(el=>{
  if(el===A)return;              /* لا نكتب فوق ما يكتبه المستخدم */
  const v=o[el.dataset.ok];
  if(el.type==="checkbox"){
   const on=(v===1||v===true||v==="1");
   if(el.checked!==on)el.checked=on;
   return;
  }
  const s=String(v==null?"":v);
  if(el.value!==s)el.value=s;
 });
}
$("#optbar").addEventListener("change",e=>{
 const k=e.target.dataset.ok;
 if(!k||!R.T.def)return;
 const v=(e.target.type==="checkbox")?(e.target.checked?1:0)
  :e.target.value;
 R.setOpt(R.T.def.id,k,v);
 syncOptbar();      /* يعيد البناء وحده إن ظهر حقلٌ شرطيّ أو اختفى */
 HOOK.prompt();
 HOOK.defs();       /* لوحة الافتراضات تُظهر القيمة نفسها */
});
/* منع تسرّب المفاتيح من حقول الخيارات إلى الاختصارات */
$("#optbar").addEventListener("keydown",e=>{
 if(e.key==="Escape"){e.target.blur();return}
 e.stopPropagation();
});
