/* ═══ التقاط الكائنات ═══
   طبقة إدخال خالصة: تعينك على إصابة نقطة موجودة، ولا تحرّك شيئاً.
   المرجع المستورد يدخل المرشّحين آخراً وبتحيّزٍ مقصود ضدّه — نقطةُ
   جدارٍ رسمتَه تفوز على نقطة مرجعٍ استوردتَه عند التساوي. */
import {S} from "./state.js";
import {clamp} from "./units.js";
import {nearOnSeg,lineX,dist,bboxHit,bboxOf} from "./geom.js";
import {dir,centerLine,band,faces,isLow} from "./walls.js";
import {opensOf,span,openPt} from "./opens.js";
import {colPoly,colById} from "./cols.js";
import {stPoly} from "./stairs.js";
import {vis} from "./layers.js";
import {refSnap} from "./ref.js";
import * as SI from "./sindex.js";

export const MODES=[
 {k:"end", n:"نهاية", mk:"sq"},
 {k:"mid", n:"منتصف", mk:"tri"},
 {k:"int", n:"تقاطع", mk:"x"},
 {k:"nod", n:"عقدة",  mk:"plus"},
 {k:"per", n:"عمودي", mk:"per"},
 {k:"near",n:"أقرب",  mk:"near"},
 {k:"ref", n:"مرجع",  mk:"ref"}];
export const MNAME={};
MODES.forEach(m=>{MNAME[m.k]=m.n});
export const osOn=()=>MODES.some(m=>+S.os[m.k]);
export const osSummary=()=>{
 const on=MODES.filter(m=>+S.os[m.k]);
 return on.length?on.map(m=>m.n).join(" · "):"لا أنماط";
};
/* الالتقاط على ما تراه: الطبقة المخفيّة لا تُلتقَط نقاطها */
const visW=w=>vis(isLow(w)?"A-WALL-LOW":"A-WALL");
const wallsVis=list=>(list||S.walls).filter(visW);

export function osnap(x,y,tol,from){
 if(!osOn())return null;
 const best={};
 const T=(m,p,ex)=>{
  if(!+S.os[m])return;
  const d=Math.hypot(p[0]-x,p[1]-y);
  if(d>tol)return;
  if(!best[m]||d<best[m].d)
   best[m]=Object.assign(
    {m,d,p:[Math.round(p[0]),Math.round(p[1])]},ex||{});
 };
 /* المرشَّحون من الفهرس: نقطةٌ داخل تفاوتٍ تعني صندوقاً يقع فيه
    الكيان — فما خرج عنه لا يمكن أن يُلتقَط، والباقي يُفحَص كما كان */
 const box=SI.boxAt(x,y,tol);
 const WV=wallsVis(SI.entsIn(box,"wall"));
 /* الالتقاط على المسار المرسوم وعلى الوجهَين المحسوبَين */
 WV.forEach(w=>{
  T("end",w.a); T("end",w.b);
  T("mid",[(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2]);
  const F=faces(w);
  if(F){
   [F.l,F.r].forEach(f=>{
    T("end",f[0]); T("end",f[1]);
    T("mid",[(f[0][0]+f[1][0])/2,(f[0][1]+f[1][1])/2]);
   });
  }
  const d=dir(w);
  if(!d)return;
  const s=(x-w.a[0])*d.ux+(y-w.a[1])*d.uy;
  if(s>=0&&s<=d.L)T("near",[w.a[0]+d.ux*s,w.a[1]+d.uy*s]);
  if(from){
   const t=clamp((from[0]-w.a[0])*d.ux+(from[1]-w.a[1])*d.uy,0,d.L);
   T("per",[w.a[0]+d.ux*t,w.a[1]+d.uy*t],{from});
  }
  /* حدود الفتحات: مواضع مفيدة للقياس والرسم */
  opensOf(w.id).forEach(o=>{
   const [a,b]=span(o);
   T("end",openPt(w,a)); T("end",openPt(w,b));
   T("mid",openPt(w,o.s));
  });
 });
 /* أركان الأعمدة ومراكزها */
 if(vis("A-COLS"))SI.entsIn(box,"col").forEach(c=>{
  const p=colPoly(c);
  if(!p)return;
  T("nod",[c.x,c.y]);
  if(c.kind!=="circ")p.forEach(q=>T("end",q));
 });
 /* أركان الدرج */
 if(vis("A-STRS"))SI.entsIn(box,"stair").forEach(s=>{
  const p=stPoly(s);
  if(!p)return;
  p.forEach(q=>T("end",q));
  T("end",s.a); T("end",s.b);
 });
 /* رؤوس المناطق */
 if(vis("A-AREA"))SI.entsIn(box,"area").forEach(a=>{
  a.ring.forEach(q=>T("end",q));
 });
 /* تقاطع محاور الجدران — على المسارات لا الوجوه */
 if(+S.os.int){
  const near=wallsVis(SI.entsIn(SI.boxAt(x,y,tol*4),"wall"))
   .filter(w=>nearOnSeg(w.a,w.b,x,y).d<tol*4)
   .slice(0,50);
  for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){
   const p=lineX(near[i].a,near[i].b,near[j].a,near[j].b);
   if(!p)continue;
   const on=q=>nearOnSeg(q.a,q.b,p[0],p[1]).d<2;
   if(on(near[i])&&on(near[j]))T("int",p);
  }
 }
 /* عقد شبكة المحاور — الترشيح على المحور قبل التقاطع، فلا يُضرَب
    عددُ الحروف في عدد الأرقام */
 if(vis("A-GRID")){
  const X=S.grid.xs.filter(v=>Math.abs(v-x)<=tol);
  const Y=S.grid.ys.filter(v=>Math.abs(v-y)<=tol);
  X.forEach(gx=>Y.forEach(gy=>T("nod",[gx,gy])));
 }

 /* المرجع آخر المرشّحين وبتحيّزٍ ضدّه ×1.05 */
 if(+S.os.ref&&vis("A-REFR")){
  const rf=refSnap(x,y,tol);
  if(rf&&(!best.ref||rf.d*1.05<best.ref.d))
   best.ref={m:"ref",d:rf.d*1.05,p:rf.p,kind:rf.kind};
 }
 for(const m of MODES)if(best[m.k])return best[m.k];
 return null;
}
