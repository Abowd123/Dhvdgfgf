/* ═══ الفاحص ═══
   يُنفَّذ بزرّ لا مع كل رسمة، ويجمع كل ما تفرّق من ملاحظات في قائمة
   واحدة قابلة للنقر. لا يصلح شيئاً ولا يحذف ولا يزحف — يخبرك
   وأنت تقرّر. هذا بديل validate() الذي كان يجري مع كل تحديث. */
import {S} from "./state.js";
import {m2,m3,sqm,pt2} from "./units.js";
import {pip,bboxOf,bboxHit,pArea,centroid} from "./geom.js";
import {looseEnds,wallLen,wallById,MINW} from "./walls.js";
import {badOpens,openState,opensOf,span,okName} from "./opens.js";
import {isStale,netArea,labelPt} from "./areas.js";
import {looseDims,isOverridden,dimValue,fmtLen,dimMid,
        chainCompare,chainPt,chainBounds,chainSum} from "./dims.js";
import {colOnWall,colsOverlap,colPoly,colBBox,
        colLabel} from "./cols.js";
import {fixOnWall,fixOverlap,fixBBox,fixCenter,
        fixName} from "./fixt.js";
import * as SI from "./sindex.js";
import {stCheck,stGeom} from "./stairs.js";
import {fitsSheet} from "./sheet.js";
import {hiddenLayers,lockedLayers,LNAME,hiddenCount,
        layCounts} from "./layers.js";
import {hasRef,refStats} from "./ref.js";
import {skipSummary} from "../io/dxfin.js";
import {CODE,codeCheck} from "./code.js";

export const SEV={er:"خطأ",wr:"تنبيه",in:"ملاحظة"};

/* كل نتيجة: {sev, code, msg, k, id, p} — p هدف القفز */
export function inspect(bbox,opt){
 const O=Object.assign({endTol:2,dimTol:30,chainTol:60},opt||{});
 const F=[];
 const add=(sev,code,msg,k,id,p)=>F.push({sev,code,msg,k,id,
  p:p?[Math.round(p[0]),Math.round(p[1])]:null});

 /* ١ — أطراف الجدران غير المتّصلة */
 looseEnds(O.endTol).forEach(e=>add("wr","end",
  `${e.id}: طرف ${e.end==="a"?"البداية":"النهاية"} لا يلامس شيئاً `
  +`${pt2(e.p)}`,
  "wall",e.id,e.p));

 /* ٢ — جدران أقصر من الحدّ الأدنى أو صفرية */
 S.walls.forEach(w=>{
  const L=wallLen(w);
  if(L<1)add("er","w0",`${w.id}: جدار صفري الطول`,
   "wall",w.id,w.a);
  else if(L<MINW)add("wr","wshort",
   `${w.id}: طوله ${m3(L)} م — أقصر من الحدّ الأدنى `
   +`${m3(MINW)} م`,"wall",w.id,w.a);
 });
 /* ٣ — جدران متطابقة تماماً */
 const seen=new Map();
 S.walls.forEach(w=>{
  const a=`${w.a[0]},${w.a[1]}`, b=`${w.b[0]},${w.b[1]}`;
  const k=(a<b)?`${a}|${b}`:`${b}|${a}`;
  if(seen.has(k))add("wr","wdup",
   `${w.id}: مسارُه مطابق لـ ${seen.get(k)} تماماً — جدار مكرَّر؟`,
   "wall",w.id,w.a);
  else seen.set(k,w.id);
 });
 /* ٤ — الفتحات المعطوبة */
 badOpens().forEach(o=>{
  const st=openState(o);
  const w=wallById(o.wall);
  const p=w?[(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2]:null;
  const T={over:"تخرج عن مدى جدارها",
   clash:"تتراكب مع فتحة أخرى على الجدار نفسه",
   orphan:"جدارها غير موجود"};
  add(st==="orphan"?"er":"wr","open",
   `${o.id} ${okName(o.kind)}: ${T[st]||st} — لم تُزحَف ولم `
   +`تُقلَّم`,"open",o.id,p);
 });
 /* ٥ — المناطق: القديمة والمتراكبة وبلا اسم */
 S.areas.forEach(a=>{
  if(isStale(a))add("wr","astale",
   `${a.id} ${a.name||""}: قديمة — تغيّر جدار يجاورها. الحلقة `
   +`المخزَّنة ${sqm(netArea(a))} م² لم تُمَسّ`,
   "area",a.id,labelPt(a));
  if(!a.name)add("in","aname",
   `${a.id}: بلا اسم · ${sqm(netArea(a))} م²`,
   "area",a.id,labelPt(a));
 });
 SI.forPairs("area",(A,B)=>{
  const ba=bboxOf(A.ring), bb=bboxOf(B.ring);
  if(!ba||!bb||!bboxHit(ba,bb,-1))return;
  const c=centroid(B.ring);
  if(pip(A.ring,c[0],c[1]))add("wr","aover",
   `${B.id} ${B.name||""} داخل ${A.id} ${A.name||""} — `
   +`منطقتان متراكبتان`,"area",B.id,c);
 });
 /* ٦ — الأبعاد المعلَّقة والمكتوبة يدوياً */
 looseDims(O.dimTol).forEach(d=>add("wr","dloose",
  `${d.id}: طرفٌ لا يصادف هندسةً — البُعد ${fmtLen(dimValue(d))} م `
  +`لم يُزحَف ولم يُحذَف`,"dim",d.id,dimMid(d)));
 S.dims.filter(isOverridden).forEach(d=>add("wr","dtxt",
  `${d.id}: نصّ بديل «${d.txt}» يُعرَض بدل المقاس الحقيقي `
  +`${fmtLen(dimValue(d))} م`,"dim",d.id,dimMid(d)));

 /* ٧ — السلاسل المخالفة للهندسة (تقرير) */
 S.chains.forEach(c=>{
  const r=chainCompare(c,O.chainTol);
  if(!r.off)return;
  const B=chainBounds(c);
  add("in","coff",
   `${c.id}: ${r.off} من ${r.rows.length} حدّاً خارج التفاوت — `
   +`المجموع المكتوب ${fmtLen(chainSum(c))} م`,
   "chain",c.id,chainPt(c,B[Math.floor(B.length/2)]));
 });
 /* ٨ — الأعمدة */
 S.cols.forEach(c=>{
  const b=colBBox(c);
  const on=colOnWall(c,2,b?SI.entsIn(SI.expand(b,4),"wall"):null);
  if(!on)add("in","kfree",
   `${c.id}${c.tag?" "+c.tag:""}: عمود منفرد لا يلامس جداراً — `
   +`${colLabel(c)}`,"col",c.id,[c.x,c.y]);
  /* المساحة لا تخصم العمود المنفرد: تُبلَّغ ولا تُخصَم */
  if(!on)SI.entsAt(c.x,c.y,0,"area").forEach(a=>{
   if(!pip(a.ring,c.x,c.y))return;
   add("in","kinarea",
    `${c.id}${c.tag?" "+c.tag:""} داخل ${a.id} ${a.name||""} — `
    +`المساحة المعروضة لا تخصمه `
    +`(${sqm(Math.abs(pArea(colPoly(c))))} م²)`,
    "col",c.id,[c.x,c.y]);
  });
 });
 SI.forPairs("col",(a,b)=>{
  if(!colsOverlap(a,b))return;
  add("wr","kover",
   `${a.id} و ${b.id} متراكبان — مقصود أم سهو؟`,
   "col",b.id,[b.x,b.y]);
 });

 /* ٩ — الأدوات الصحية */
 S.fixt.forEach(f=>{
  const b=fixBBox(f);
  const W=b?SI.entsIn(SI.expand(b,200),"wall"):null;
  if(!fixOnWall(f,150,W))add("in","ffree",
   `${f.id} ${fixName(f)}: ظهرها لا يلاصق جداراً`,
   "fix",f.id,fixCenter(f));
 });
 SI.forPairs("fix",(a,b)=>{
  if(!fixOverlap(a,b))return;
  add("wr","fover",
   `${a.id} ${fixName(a)} تتراكب مع ${b.id} ${fixName(b)}`,
   "fix",b.id,fixCenter(b));
 });

 /* ١٠ — الدرج: يُقاس ويُبلَّغ ولا يُصحَّح */
 S.stairs.forEach(t=>{
  const c=stCheck(t);
  const g=stGeom(t);
  const p=g?g.P(g.L/2,0):t.a;
  c.msgs.forEach(m=>add("wr","stair",`${t.id}: ${m}`,
   "stair",t.id,p));
  if(c.ok)add("in","stairok",
   `${t.id}: ${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م `
   +`· 2ق+ن ${m3(c.rule)} م — داخل المدى المريح`,
   "stair",t.id,p);
 });
 /* ١١ — الطبقات المخفيّة والمقفلة
    ليس عيباً، لكنه سببٌ لغياب ما تتوقّع رؤيته. */
 const HD=hiddenLayers(), C=layCounts();
 if(HD.length){
  add("wr","lhid",
   `${HD.length} طبقة مخفيّة (${HD.map(LNAME).join(" · ")}) — `
   +`${hiddenCount()} كياناً لن يُرسَم ولن يُصدَّر`,null,null,null);
  HD.forEach(L=>{
   if(!(C[L]>0))return;
   add("in","lhidn",`${LNAME(L)}: ${C[L]} كياناً مخفيّاً`,
    null,null,null);
  });
 }
 const LK=lockedLayers();
 if(LK.length)add("in","llock",
  `${LK.length} طبقة مقفلة (${LK.map(LNAME).join(" · ")}) — `
  +`تُرى ولا تُحدَّد`,null,null,null);

 /* ١٢ — المرجع */
 if(hasRef()){
  const r=refStats();
  add("in","refn",
   `المرجع «${r.name||"بلا اسم"}»: ${r.n} كياناً على `
   +`${r.layers} طبقة (${r.shownLayers} ظاهرة) · الترميز `
   +`${r.enc} · جامدٌ لا يدخل الاتحاد ولا المساحات`,
   null,null,null);
  if(r.guessed&&Math.abs(r.k-1)<1e-9)
   add("wr","refunit",
    `وحدة المرجع مجهولة في الملفّ وفُرضت مليمتراً، ولم تُعايره `
    +`بعد — استعمل «معايرة المرجع» بمسافةٍ تعرفها قبل أن تقيس `
    +`عليه`,null,null,null);
  if(r.trunc)
   add("wr","reftrunc",
    `استُثني ${r.trunc} كياناً لتجاوز الحدّ — المرجع منقوص`,
    null,null,null);
  const sk=skipSummary(r.skip);
  if(sk)add("in","refskip",
   `تُخطّي من المرجع: ${sk}`,null,null,null);
  const ap=r.approx||{}, A=[];
  if(ap.spline)A.push(`${ap.spline} منحنى SPLINE (متقطّع)`);
  if(ap.ellipse)A.push(`${ap.ellipse} قطع ناقص`);
  if(ap.arc)A.push(`${ap.arc} قوساً بمقياس غير متساوٍ`);
  if(A.length)add("in","refapx",
   `تقريباتٌ في المرجع: ${A.join(" · ")}`,null,null,null);
  if(r.bbox&&bbox){
   const gap=Math.max(r.bbox.x0-bbox.x1, bbox.x0-r.bbox.x1,
                      r.bbox.y0-bbox.y1, bbox.y0-r.bbox.y1);
   if(gap>500000)add("wr","reffar",
    `المرجع يبعد عن رسمك ${m2(gap)} م — حاذِه أو انقله`,
    null,null,null);
  }
 }
 /* ١٣ — الورقة */
 if(+S.sheet.on){
  const f=fitsSheet(bbox);
  if(!f.ok)add("wr","sheet",
   `الرسم يتجاوز الإطار الداخلي بـ ${m2(f.over)} م — كبّر الورقة `
   +`أو صغّر المقياس أو أزِح الورقة`,null,null,null);
 }
 /* ١٤ — لا شيء مرسوم */
 if(!S.walls.length&&!S.cols.length)
  add("in","empty","لا جدران ولا أعمدة في المشروع",
   null,null,null);

 /* ١٥ — الاشتراطات: طبقةٌ ثانية تفحص التصميم لا الهندسة.
    نتائجها بالشكل نفسه فتقفز إلى مواضعها كبقيّة الملاحظات. */
 if(+CODE.on)codeCheck().forEach(f=>F.push(f));

 const ORD={er:0,wr:1,in:2};
 F.sort((a,b)=>ORD[a.sev]-ORD[b.sev]||a.code.localeCompare(b.code));
 return {list:F,
  er:F.filter(x=>x.sev==="er").length,
  wr:F.filter(x=>x.sev==="wr").length,
  in:F.filter(x=>x.sev==="in").length};
}
