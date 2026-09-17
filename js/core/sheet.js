/* ═══ الورقة وبلوك العنوان ═══
   يُبنى كلّه بالمليمتر النموذجي: مقاس الورقة × المقياس. فيمرّ في
   خطّ الأنابيب نفسه، ويُصدَّر مع كل شيء، ولا فضاء ورقة منفصل.
   لا يستورد render.js — الصندوق يُمرَّر وسيطاً، فلا دورة. */
import {S,txtH} from "./state.js";
import {clamp,m2,m3,mnum,deg,D2R,scl,dim2} from "./units.js";

const R=v=>Math.round(v);
/* المقاسات بالمليمتر · أفقياً (عرض × ارتفاع) */
export const SIZES={
 A4:[297,210], A3:[420,297], A2:[594,420],
 A1:[841,594], A0:[1189,841]};
export const SNAMES=Object.keys(SIZES);

export function paperMM(){
 const s=SIZES[S.sheet.size]||SIZES.A3;
 return (S.sheet.orient==="p")?[s[1],s[0]]:[s[0],s[1]];
}
/* مقاس الورقة محوَّلاً إلى مليمتر نموذجي */
export function paperModel(){
 const k=Math.max(1,S.meta.scale);
 const p=paperMM();
 return [p[0]*k, p[1]*k];
}
/* ═══ مستطيل الورقة في إحداثيات النموذج ═══
   المركز من S.sheet.cx/cy إن ضُبط، وإلا مركز الرسم. */
export function sheetRect(bbox){
 const [W,H]=paperModel();
 let cx=S.sheet.cx, cy=S.sheet.cy;
 if(cx==null||cy==null){
  if(bbox){cx=(bbox.x0+bbox.x1)/2; cy=(bbox.y0+bbox.y1)/2}
  else{cx=W/2; cy=H/2}
 }
 return {x0:R(cx-W/2), y0:R(cy-H/2),
         x1:R(cx+W/2), y1:R(cy+H/2), W, H};
}
export const innerRect=r=>{
 const m=Math.max(0,S.sheet.margin)*Math.max(1,S.meta.scale);
 return {x0:r.x0+m, y0:r.y0+m, x1:r.x1-m, y1:r.y1-m};
};
/* هل يقع الرسم كلّه داخل الإطار الداخلي؟ */
export function fitsSheet(bbox){
 if(!bbox)return {ok:1,over:0};
 const i=innerRect(sheetRect(bbox));
 const over=Math.max(0, i.x0-bbox.x0, bbox.x1-i.x1,
                        i.y0-bbox.y0, bbox.y1-i.y1);
 return {ok:over<=0?1:0, over:R(over)};
}
/* ═══ بلوك العنوان ═══
   عمود واحد أسفل يمين الإطار الداخلي · الصفوف بالمليمتر الورقي. */
const TB_W=180;
export function titleRows(){
 const t=S.title||{};
 return [
  {n:"المشروع", v:t.proj||"—", h:11, big:1},
  {n:"المالك",  v:t.owner||"—", h:8},
  {n:"الموقع",  v:t.loc||"—",  h:8},
  {n:"اسم اللوحة", v:S.meta.name||"—", h:11, big:1},
  {n:"المقياس · التاريخ",
   v:`${scl(S.meta.scale)}   ·   ${S.meta.date||""}`, h:9},
  {n:"اللوحة · المراجعة · الرسم",
   v:`${t.sheet||"—"}   ·   ${t.rev||"0"}   ·   ${t.by||"—"}`, h:9}];
}
/* ═══ سهم الشمال ═══
   رمزٌ حقيقي في زاوية الإطار الداخلي، زاويته S.meta.north مقيسةً
   عكس الساعة من الشمال. يُصدَّر مع كل شيء لأنه أوّلياتٌ لا شارةُ
   شاشة — والشارة في الواجهة مؤشّرٌ عليه لا بديلٌ عنه. */
export function northPrims(i,k){
 if(!+S.sheet.north)return [];
 const L="A-SHET", out=[];
 const r=8*k, pad=13*k;
 const cx=R(i.x0+pad), cy=R(i.y0+pad);
 const a=(90+(+S.meta.north||0))*D2R;
 const ux=Math.cos(a), uy=Math.sin(a);
 const nx=-uy, ny=ux;
 const P=(u,v)=>[R(cx+ux*u+nx*v), R(cy+uy*u+ny*v)];
 out.push({t:"arc",L,cx,cy,r:R(r),a0:0,a1:359.9,sheet:1});
 /* رأسٌ مصمَّت وذيلٌ مشروح — يُقرأ اتجاهه بلا لبس */
 out.push({t:"poly",L,sheet:1,cl:1,
  pts:[P(r*1.05,0),P(-r*0.3,r*0.42),P(-r*0.3,-r*0.42)]});
 out.push({t:"line",L,sheet:1,a:P(-r*0.3,0),b:P(-r*1.05,0)});
 out.push({t:"text",L,sheet:1,s:"ش",
  x:P(r*1.75,0)[0], y:R(P(r*1.75,0)[1]-k*1.2),
  h:R(k*3.4), al:"mc"});
 return out;
}
/* ═══ أوّليات الورقة ═══ */
export function sheetPrims(bbox){
 if(!+S.sheet.on)return [];
 const k=Math.max(1,S.meta.scale);
 const r=sheetRect(bbox), i=innerRect(r);
 const L="A-SHET", out=[];
 const RC=q=>[[R(q.x0),R(q.y0)],[R(q.x1),R(q.y0)],
              [R(q.x1),R(q.y1)],[R(q.x0),R(q.y1)]];
 out.push({t:"poly",L,pts:RC(r),cl:1,sheet:1});
 out.push({t:"poly",L,pts:RC(i),cl:1,sheet:1});
 northPrims(i,k).forEach(g=>out.push(g));
 if(!+S.sheet.tb)return out;

 const rows=titleRows();
 const totH=rows.reduce((s,x)=>s+x.h,0);
 const w=TB_W*k, H=totH*k;
 const x0=i.x1-w, x1=i.x1, yb=i.y0;
 out.push({t:"poly",L,sheet:1,cl:1,pts:[
  [R(x0),R(yb)],[R(x1),R(yb)],[R(x1),R(yb+H)],[R(x0),R(yb+H)]]});
 /* الصفوف من الأسفل إلى الأعلى بترتيب معكوس */
 let y=yb;
 const lab=k*2.0, val=k*3.2, valBig=k*4.6;
 for(let n=rows.length-1;n>=0;n--){
  const rw=rows[n], hh=rw.h*k;
  if(n<rows.length-1)
   out.push({t:"line",L,sheet:1,
    a:[R(x0),R(y)], b:[R(x1),R(y)]});
  out.push({t:"text",L,sheet:1,s:rw.n,
   x:R(x1-k*2.5), y:R(y+hh-lab*1.35), h:R(lab), al:"br"});
  out.push({t:"text",L,sheet:1,s:rw.v,
   x:R(x1-k*2.5), y:R(y+k*1.8),
   h:R(rw.big?valBig:val), al:"br"});
  y+=hh;
 }
 return out;
}

