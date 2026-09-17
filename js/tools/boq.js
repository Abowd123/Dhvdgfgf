/* ═══ أمر جدول الكميات ═══
   أداةٌ فوريّة بلا خطوات — كarearef: منطقُها في start وتعود
   false، فلا تدخل وضعَ التقاط نقاط.

   ولا تعدّل شيئاً: لا rec ولا dirty، ولا edit في core/state.
   فالقراءةُ لا تدخل التاريخ، وضغطُ التراجع بعدها يتراجع عمّا
   قبلها — وهو الصواب. */
import {S} from "../core/state.js";
import {boq,boqLine} from "../core/boq.js";
import {toCSV,csvName} from "../io/boq.js";
import {dl} from "../io/project.js";
import {sqm,m2} from "../core/units.js";
import {price} from "../core/pricing.js";
import {boqToCSV} from "../io/boqcsv.js";
import {defTool,H,ovOn} from "./registry.js";

defTool({
 id:"boq", alias:"كميات جدولكميات",
 label:"جدول الكميات",
 hint:"يقرأ الحالة الحالية ويصدّر CSV",
 opts:[
  {k:"save", label:"نزّل الملفّ", type:"chk", def:1},
  {k:"price",label:"أضف التسعير والضريبة",type:"chk",def:1}],
 start(ctx){
  const B=boq();
  if(!B.walls.n&&!B.opens.total&&!B.areas.n){
   H.rep("in","المشروع فارغ — لا كميّات تُحصى");
   return false;
  }
  /* الحصيلةُ تُقال دائماً، والتنزيلُ خيار: من أراد النظرَ وحده
     أطفأ الخيار فقرأ الأسطر في اللوحة بلا ملفّ. */
  H.rep("ok",boqLine(B));
  B.areas.rows.forEach(r=>{
   H.rep(r.stale?"wr":"in",`${r.id} ${r.name}: `
    +`${sqm(r.area)} م²${r.stale?" · قديمة":""}`);
  });
  B.opens.rows.forEach(r=>{
   H.rep("in",`${r.name}: ${r.n}`);
  });
  B.walls.rows.forEach(r=>{
   H.rep("in",`${r.name}: ${m2(r.len)} م · `
    +`سماكة ${m2(r.t)} م${r.tn>1?` (${r.tn} سماكات)`:""}`);
  });
   const C=toCSV(B);
  C.notes.forEach(s=>H.rep("wr",s));
  if(ovOn("boq","save")){
   const nm=csvName(B);
    let text=C.txt, finalName=nm;
    if(ovOn("boq","price")){
     const items=[
      ...B.walls.rows.map(r=>({key:"wall",qty:r.face/1000000})),
      ...B.areas.rows.map(r=>({key:"area",qty:r.area/1000000})),
      ...B.opens.rows.map(r=>({key:/window|fixed/.test(r.kind)?"window":"door",qty:r.n}))
     ];
     const P=price(items);
     text=boqToCSV(P); finalName=nm.replace(/\.csv$/i,"-مسعّر.csv");
     H.rep("ok",`الإجمالي المسعّر: ${P.total.toFixed(2)} ${P.currency}`);
    }
    const size=dl(finalName,text,"text/csv;charset=utf-8");
    H.rep("ok",`نُزّل ${finalName} · ${size} بايت`);
  }
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});
