/* ═══ مسار التصدير الواحد ═══
   أربعةُ أزرارٍ كانت تُكرِّر خمسة أشياء: النطاق · التسمية · الحصيلة ·
   التحذيرات · التنزيل. والتكرارُ انجرف: warnClip في الأربعة
   وsayNotes في اثنين، وزرّان غير متزامنَين واثنان متزامنان، وواحدٌ
   يُعطِّل نفسه أثناء العمل وثلاثةٌ لا.

   وثلاثةُ قراراتٍ مُعلَنة:

   ١ · لا طبعَ من هنا. run تُعيد قائمةَ رسائل {lv,s} والواجهة تطبعها —
       فاستيرادُ ui/bus من io هو الاعتمادُ المعكوس نفسه الذي أُصلح في
       الدفعة ٧ب. والمكسب الثاني أن المسار يُختبَر في node بلا واجهة.

   ٢ · لا تنزيلَ من هنا. تُعيد الحِمل واسمَه ونوعَه، والواجهة تُنزِّله —
       فالتنزيل حدثُ متصفّحٍ لا صيغةَ ملفّ.

   ٣ · ترتيب الرسائل مُعلَن: الحصيلة أوّلاً (تُسمّي الملفّ فيُعرَف عمّا
       يُتكلَّم) · ثم ما فُقِد أو عُطِب · ثم ما يُشرَح. والفقدُ قبل
       الشرح لأن أخطر ما في التصدير أن تمضي وأنت تحسبه تمّ.

   والمشروع (‏xSave) ليس مخرَجاً فلا يمرّ بهنا: يحمل كل شيء بلا هيئةٍ
   ولا نطاقٍ ولا مقياس — الإخفاء عرضٌ لا حذف، والملفّ يحمل المخفيّ. */
import {S} from "../core/state.js";
import {clamp,dim2,m2} from "../core/units.js";
import {humanSize} from "./project.js";
import {scene,sceneBBox,sceneBBoxInk,
        sceneBBoxPlot} from "../core/render.js";
import {sheetRect} from "../core/sheet.js";
import {vis,plots,anyHidden,hiddenCount,
        hiddenLayers} from "../core/layers.js";
import {toDXFBytes,dxfStats} from "./dxf.js";
import {toSVG} from "./svg.js";
import {toPNGBlob} from "./png.js";
import {toPDFz} from "./pdf.js";

/* ═══ جدول الصيغ ═══
   قرارٌ معلَنٌ لا سلوكٌ مُستنتَج — كجدول CAPS في io/style.js.
   paper=0 لـDXF بقصد: هو فضاءُ نموذجٍ بالمليمتر لا صفحةً، فمقاس
   الورقة لا معنى له فيه. والورقة تُصدَّر إليه هندسةً (خطوطُ إطارها
   وبلوكها في المشهد) لا وسمَ صفحة. */
export const FMT={
 dxf:{ext:"dxf", mime:"application/dxf",  n:"DXF R2000",
      vector:1, paper:0, notes:1},
 svg:{ext:"svg", mime:"image/svg+xml",    n:"SVG متّجه",
      vector:1, paper:1, notes:1},
 png:{ext:"png", mime:"image/png",        n:"PNG",
      vector:0, paper:1, notes:1},
 pdf:{ext:"pdf", mime:"application/pdf",  n:"PDF متّجه",
      vector:1, paper:1, notes:1}
};

/* ═══ المقاسات الاسمية ═══
   تكرارٌ مُعلَنٌ لجدول core/sheet.js: sheetRect يعيد المليمتر
   النموذجيَّ مُدوَّراً (مقاسٌ × مقياسٌ ثم تدوير)، والصفحة تحتاج
   الاسميَّ نفسه — و٤١٩٫٩٨ مم ليست A3 عند الطابعة.
   وحالةٌ في run.js تفحص أن الجدولين يتّفقان لكل مقاسٍ واتجاه، فلا
   ينجرف أحدهما عن الآخر بلا أن يسقط الاختبار. */
const APS={A0:[841,1189],A1:[594,841],A2:[420,594],
 A3:[297,420],A4:[210,297]};
export function paperMM(){
 const a=APS[S.sheet.size]||APS.A3;
 return (S.sheet.orient==="p")
  ? {w:a[0],h:a[1],n:S.sheet.size,or:"عمودي"}
  : {w:a[1],h:a[0],n:S.sheet.size,or:"أفقي"};
}
export const onSheet=()=>!!(+S.sheet.on&&vis("A-SHET"));

/* ═══ النطاق ═══
   نُقل من ui/inspector: قرارُ نطاقٍ لا قرارُ زرّ — والدليل أنه كان
   يُقرَأ أربع مرّات ويُعدَّل مرّتين (الدفعتان ٧أ و٩).
   وصندوقُ ما يُطبَع لا ما يُرى: طبقةٌ أُوقِف طبعها كانت تُوسِّع
   الورقة فتخرج بهامشٍ خالٍ. والمخفيّ خارج الاثنين أصلاً — الصناديق
   تُحسَب بعد التصفية منذ الدفعة ٩. */
export function exportBox(){
 if(onSheet())
  return {box:sheetRect(sceneBBox()),pad:0,mode:"sheet"};
 const B=sceneBBoxPlot();
 const pad=Math.max(1,S.meta.scale)*8;
 return {box:B||{x0:0,y0:0,x1:1000,y1:1000},pad,mode:"fit"};
}
const padded=(B,pad)=>pad
 ? {x0:B.x0-pad,y0:B.y0-pad,x1:B.x1+pad,y1:B.y1+pad} : B;

/* ═══ الاحتواء ═══
   الورقة تقصّ ما خرج عنها، والقياسُ على صندوق الحبر بلا الورقة —
   وإلّا قِيسَت الورقة مقابل نفسها فلا تتجاوز أبداً.
   ويُعاد عددُ الورقات ومقياسٌ يكفي: «كبّر أو صغّر» نصيحةٌ بلا رقم،
   والرقم هو ما يُنفَّذ. */
const SCALES=[20,25,50,100,200,250,500,1000,1250,2500,5000];
export function fits(){
 if(!onSheet())return null;
 const p=paperMM(), k=Math.max(1,S.meta.scale);
 const r=sheetRect(sceneBBox()), ink=sceneBBoxInk();
 if(!r||!ink)return null;
 const over=Math.max(0, r.x0-ink.x0, ink.x1-r.x1,
                        r.y0-ink.y0, ink.y1-r.y1);
 const iw=(ink.x1-ink.x0)/1, ih=(ink.y1-ink.y0)/1;
 const nx=Math.max(1,Math.ceil(iw/(p.w*k)));
 const ny=Math.max(1,Math.ceil(ih/(p.h*k)));
 /* أصغرُ مقياسٍ قياسيّ يتّسع — بهامشٍ ٢٪ فلا يلامس الحدّ */
 const need=Math.max(iw/p.w, ih/p.h)*1.02;
 const fitK=SCALES.find(s=>s>=need)||Math.ceil(need/100)*100;
 return {over, nx, ny, n:nx*ny, fitK, paper:p};
}
/* ═══ الصفحة ═══
   اسميّةٌ حين تكون الورقة قائمةً والصيغة تحمل صفحة. والهندسة
   تُتَمركَز فيها: فرقُ التدوير دون المليمتر ويُقسَم على الجانبين،
   والنسبة تبقى 1:k بالضبط — لا 1:k±خطأً. */
export function pageOf(fmt){
 const F=FMT[fmt];
 if(!F||!F.paper||!onSheet())return null;
 const p=paperMM();
 return {w:p.w, h:p.h, name:p.n, or:p.or};
}
/* ═══ التسمية ═══
   في موضعٍ واحد للأربعة. وبلوكُ العنوان يدخلها: رقمُ اللوحة
   والمراجعة يُطبَعان على الورق، فثلاثُ لوحاتٍ من مشروعٍ واحد كانت
   تخرج بثلاثة أسماء متطابقة.
   والحرس على أسماء الملفّات لا على النصّ: ما يمنعه ويندوز
   (< > : " / \ | ? *) والمحارف الضابطة والنقطة الأخيرة والأسماء
   المحجوزة. والعربية تبقى كما هي — لا تحويلَ إلى لاتينية. */
const BADN=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
export function safeName(s,ext){
 let n=String(s==null?"":s)
  .replace(/[\u0000-\u001f\u007f]/g,"")
  .replace(/[<>:"/\\|?*]/g,"-")
  .replace(/[\u200e\u200f\u2066-\u2069]/g,"")
  .replace(/\s+/g,"-")
  .replace(/-{2,}/g,"-")
  .replace(/^[-.\s]+|[-.\s]+$/g,"")
  .slice(0,90);
 if(!n||BADN.test(n))n="لوحة";
 if(!ext)return n;
 const e=String(ext).replace(/^\./,"");
 return new RegExp(`\\.${e}$`,"i").test(n)?n:`${n}.${e}`;
}
export function fileName(fmt){
 const t=S.title||{};
 const P=[String(S.meta.name||"PLAN").trim()||"PLAN"];
 const sh=String(t.sheet||"").trim();
 const rv=String(t.rev||"").trim();
 if(sh)P.push(sh);
 if(rv&&rv!=="0")P.push("مر"+rv);
 return safeName(P.join("-"),FMT[fmt]?FMT[fmt].ext:"txt");
}
/* ═══ الخطّة ═══ ما سيُنتَج بلا إنتاج — تقرؤه الواجهة قبل النقر ═══ */
export function plan(fmt){
 const F=FMT[fmt]||FMT.pdf;
 const {box,pad,mode}=exportBox();
 return {fmt, name:fileName(fmt), mode, box, pad,
  page:pageOf(fmt), scale:Math.max(1,S.meta.scale),
  fit:fits(), vector:!!F.vector};
}
export function summary(){
 const k=Math.max(1,S.meta.scale);
 const f=fits();
 const L=[];
 if(onSheet()){
  const p=paperMM();
  L.push(`الورقة ${p.n} ${p.or} ${dim2(p.w,p.h,"مم")}`);
 }else L.push("النطاق: كل ما يُطبَع + هامش");
 L.push(`1:${k}`);
 L.push(`«${fileName("pdf").replace(/\.pdf$/,"")}»`);
 if(f&&f.over>0)
  L.push(`⚠ يتجاوز ${m2(f.over)} م — ${f.n} ورقة أو 1:${f.fitK}`);
 return L.join(" · ");
}
/* ═══ التحذيرات المشتركة ═══
   الفقدُ أوّلاً ثم العطب: الأوّل يُنقِص ما يخرج، والثاني يُخرِج
   ما ليس صحيحاً — وكلاهما يقع في مسار التسليم للعميل. */
function lossOf(fmt,pl){
 const out=[], c=scene();
 if(pl.mode==="sheet"&&pl.fit&&pl.fit.over>0)
  out.push({lv:"wr",s:`يتجاوز الورقة بـ ${m2(pl.fit.over)} م `
   +`فيُقصّ في المخرَج — بهذا المقياس يحتاج `
   +`${pl.fit.nx}×${pl.fit.ny} ورقة. كبّر الورقة أو انزل إلى `
   +`1:${pl.fit.fitK} أو أزِحها.`});
 if(anyHidden())
  out.push({lv:"wr",s:`${hiddenCount()} طبقةً مخفيّة ليست في `
   +`${FMT[fmt].n}: ${hiddenLayers().join(" · ")} — الإخفاء عرضٌ `
   +`لا حذف، وملفّ المشروع يحملها`});
 const np=[...new Set((c.P||[]).map(g=>g.L||"0"))]
  .filter(n=>!plots(n));
 if(np.length)
  out.push({lv:"in",s:`طبقاتٌ تُرى ولا تُطبَع فاستُثنيت: `
   +`${np.join(" · ")}`});
 /* عطبُ الرسم — يُقال قبل التنزيل لا بعده */
 if(c.bad)out.push({lv:"wr",s:`${c.bad} فتحةً معطوبة (خارج جدارها `
  +`أو متراكبة) صُدِّرت كما هي`});
 if(c.over)out.push({lv:"wr",s:`${c.over} بُعداً نصُّه مُستبدَل — `
  +`الرقم المطبوع لا يطابق الهندسة`});
 if(c.stale)out.push({lv:"wr",s:`${c.stale} منطقةً قديمة: بصمة `
  +`جوارها تبدّلت ومساحتُها لم تُحدَّث`});
 if(c.loose)out.push({lv:"in",s:`${c.loose} بُعداً معلَّقاً — طرفٌ `
  +`لا يصادف عقدةً ولا وجهاً`});
 if(c.open)out.push({lv:"wr",s:`${c.open} قطعةً لم تُخَط في اتحاد `
  +`الأجسام — جداران يتلامسان بمقدارٍ دون المليمتر، فحدٌّ ينفتح`});
 return out;
}
const pageStr=pl=>pl.page
 ? `${pl.page.name} ${pl.page.or} ${dim2(pl.page.w,pl.page.h,"مم")}`
 : null;
const sizeOf=v=>{
 if(!v)return 0;
 if(typeof v==="string")
  return (typeof TextEncoder!=="undefined")
   ? new TextEncoder().encode(v).length : v.length;
 if(v.length!=null)return v.length;
 if(v.size!=null)return v.size;
 return 0;
};
const blobOf=(raw,mime)=>(typeof Blob==="undefined")
 ? null : new Blob([raw],{type:mime});

/* ═══ التنفيذ ═══
   تعيد {ok · name · mime · blob · raw · size · report · plan}.
   وترمي فيما لا يُتوقَّع وحده؛ وما يُتوقَّع فشلُه (قماشٌ يتجاوز حدَّه)
   يعود ok:0 برسالةٍ تقول ما يُفعَل. */
export async function run(fmt,opt){
 const F=FMT[fmt];
 if(!F)throw new Error(`صيغةٌ مجهولة: ${fmt}`);
 const O=Object.assign({dark:0,showWarn:false,dpi:300},opt||{});
 const pl=plan(fmt);
 const P=scene().P;
 const bb=padded(pl.box,pl.pad);
 const name=pl.name;
 const notes=[], extra=[];
 let raw=null, blob=null, head="";

 if(fmt==="dxf"){
  const r=toDXFBytes(P,bb);
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً تجاوز حدّ الخطوط فلم يُصدَّر`});
  if(r.bad)extra.push({lv:"wr",s:`${r.bad} محرفاً لا وجود له في `
   +`CP1256 وكُتب «؟» — صفحةُ الرمز تحمل العربية والفرنسية ولا `
   +`تحمل ما عداهما. للنصّ الكامل استعمل SVG.`});
  const st=dxfStats(P);
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))} · فضاء `
   +`النموذج بالمليمتر · `
   +Object.keys(st).map(k=>`${st[k]} ${k}`).join(" · ");
  notes.push("الشرطة مُقطَّعة قطعاً حقيقية · الهاشور خطوط مولَّدة "
   +"(HATCH غير مكتوبة) · الترميز CP1256 بايتاً بايتاً");
 }
 else if(fmt==="svg"){
  const r=toSVG(P,pl.box,{pad:pl.pad,dark:O.dark?1:0,
   showWarn:!!O.showWarn, page:pl.page});
  raw=r.txt; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً لم يُصدَّر`});
  /* الحجم بايتاتٌ لا محارف: العربية محرفان في UTF-8، وطولُ
     السلسلة كان يُنقِص الرقم إلى الثلث في لوحةٍ عربية */
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))}`
   +(pageStr(pl)?` · ${pageStr(pl)}`:"")+` · 1:${pl.scale}`;
  notes.push("العربية نصٌّ متّجه بخطّ النظام — لا صورةَ ولا تنقيط");
 }
 else if(fmt==="png"){
  const dpi=clamp(parseInt(O.dpi,10)||300,72,1200);
  const nn=[];
  const {blob:b,info}=await toPNGBlob(P,pl.box,
   {pad:pl.pad,dpi,dark:O.dark?1:0,notes:nn,
    showWarn:!!O.showWarn, page:pl.page});
  nn.forEach(m=>notes.push(m));
  if(!b)return {ok:0,fmt,name,plan:pl,report:[{lv:"er",
   s:"تعذّر التنقيط — الأبعاد تتجاوز حدّ القماش في هذا "
    +"المتصفّح. قلّل الدقّة أو صغّر النطاق."}]};
  blob=b; raw=null;
  head=`${F.n} · ${name} · ${dim2(info.px,info.py,"بكسل")} · `
   +`${info.dpi} نقطة/بوصة · ${humanSize(sizeOf(b))}`
   +(pageStr(pl)?` · ${pageStr(pl)}`:"");
  if(info.scaled)extra.push({lv:"in",s:`خُفِّضت الدقّة من ${dpi} `
   +`لحدّ الأبعاد والمساحة`});
 }
 else{
  const r=await toPDFz(P,pl.box,{pad:pl.pad,
   showWarn:!!O.showWarn, page:pl.page,
   info:{title:S.meta.name, sheet:S.title.sheet,
    rev:S.title.rev, by:S.title.by, proj:S.title.proj}});
  raw=r.bytes; blob=blobOf(raw,F.mime);
  (r.notes||[]).forEach(m=>notes.push(m));
  if(r.hatchCut)extra.push({lv:"wr",s:`هاشورٌ في ${r.hatchCut} `
   +`موضعاً لم يُصدَّر`});
  head=`${F.n} · ${name} · ${humanSize(sizeOf(raw))} · `
   +(pageStr(pl)||dim2(r.pw.toFixed(0),r.ph.toFixed(0),"مم"))
   +` · 1:${pl.scale}`
   +(r.zip?` · ضُغِط المحتوى `
     +`${(r.zip.from/Math.max(1,r.zip.to)).toFixed(1)}×`:"");
  if(r.arabic)notes.push(`${r.arabic} نصّاً عربياً أُدرج قناعاً `
   +`بلون طبقته (${r.images} قناعاً فريداً) — الخطوط القياسية لا `
   +`تحمل العربية. للنصّ المتّجه استعمل SVG.`);
 }
 const report=[{lv:"ok",s:head}]
  .concat(extra, lossOf(fmt,pl),
   notes.map(s=>({lv:"in",s:`${FMT[fmt].n}: ${s}`})));
 return {ok:1, fmt, name, mime:F.mime, blob, raw,
  size:sizeOf(raw||blob), report, plan:pl};
}
