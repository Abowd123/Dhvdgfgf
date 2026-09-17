/* ═══ الدرج ═══
   قِلعة مستقيمة: مسار سيرٍ من a إلى b وعرضٌ w وعددُ قوائم n.
   القياسات تُحسَب وتُعرَض ولا تُصحَّح: القائمة والنائمة و2ق+ن
   تُفحَص في inspect.js، فتُنبّه ولا تعدّل n ولا الطول.

   الأصل الفعليّ ثلاث كمّيات مخزَّنة: a, b, n. كل ما عداها مشتقّ
   عند الرسم. */
import {S,touchView,txtH} from "./state.js";
import {newId,clamp,D2R,R2D,deg,m2,m3,ltr,rng3} from "./units.js";
import {dist,pip,bboxOf} from "./geom.js";

const R=v=>Math.round(v);
export const stById=id=>S.stairs.find(s=>s.id===id)||null;
export const SMIN_W=600, SMIN_L=600;

/* المدى المريح — يُقاس ولا يُفرَض */
export const RISE_OK=[150,200];
export const TREAD_MIN=250;
export const RULE_OK=[580,650];        /* 2ق + ن */

export function stGeom(st){
 if(!st||!st.a||!st.b)return null;
 const dx=st.b[0]-st.a[0], dy=st.b[1]-st.a[1];
 const L=Math.hypot(dx,dy);
 if(L<1)return null;
 const ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
 const hw=Math.max(SMIN_W,st.w)/2;
 const n=clamp(R(st.n)||2,2,80);
 const treads=n-1;                     /* آخر قائمة تصل البسطة */
 const tread=L/treads;
 const H=Math.max(200,+st.h||S.meta.wallH);
 const rise=H/n;
 const P=(s,v)=>[R(st.a[0]+ux*s+nx*v), R(st.a[1]+uy*s+ny*v)];
 return {L,ux,uy,nx,ny,hw,n,treads,tread,rise,H,P,
  ang:deg(Math.atan2(uy,ux)*R2D)};
}
export const stPoly=st=>{
 const g=stGeom(st);
 if(!g)return null;
 return [g.P(0,-g.hw),g.P(g.L,-g.hw),g.P(g.L,g.hw),g.P(0,g.hw)];
};
export const stBBox=st=>bboxOf(stPoly(st)||[]);
export const stAt=(x,y)=>{
 for(const s of S.stairs){
  const p=stPoly(s);
  if(p&&pip(p,x,y))return s;
 }
 return null;
};
export function addStair(a,b,w,n,ex){
 const A=[R(a[0]),R(a[1])], B=[R(b[0]),R(b[1])];
 const L=dist(A,B);
 if(L<SMIN_L)
  throw new Error(`طول القِلعة ${m3(L)} م — الأدنى ${m3(SMIN_L)} م`);
 const st={id:newId("S"),a:A,b:B,
  w:clamp(R(w||1000),SMIN_W,6000),
  n:clamp(R(n)||12,2,80),
  up:(ex&&ex.up==="dn")?"dn":"up",
  cut:0};
 if(ex){
  if(ex.h)st.h=clamp(R(ex.h),200,8000);
  if(ex.cut!=null)st.cut=clamp(+ex.cut||0,0,0.95);
 }
 S.stairs.push(st); touchView();
 return st;
}
export function delStair(st){
 const i=S.stairs.indexOf(st);
 if(i<0)return false;
 S.stairs.splice(i,1); touchView();
 return true;
}
/* ═══ الفحص — يقيس ولا يعدّل ═══ */
export function stCheck(st){
 const g=stGeom(st);
 if(!g)return {ok:0,msgs:["قِلعة صفرية الطول"],
  rise:0,tread:0,rule:0,n:0,treads:0};
 const m=[];
 const rule=2*g.rise+g.tread;
 if(g.rise<RISE_OK[0]||g.rise>RISE_OK[1])
  m.push(`القائمة ${m3(g.rise)} م خارج المدى المريح `
   +`${rng3(RISE_OK[0],RISE_OK[1],"م")}`);
 if(g.tread<TREAD_MIN)
  m.push(`النائمة ${m3(g.tread)} م أقلّ من ${m3(TREAD_MIN)} م`);
 if(rule<RULE_OK[0]||rule>RULE_OK[1])
  m.push(`قاعدة 2ق+ن = ${m3(rule)} م خارج `
   +`${rng3(RULE_OK[0],RULE_OK[1],"م")}`);
 if(st.w<900)
  m.push(`العرض ${m3(st.w)} م أقلّ من 0.900 م`);
 return {ok:m.length?0:1, msgs:m,
  rise:g.rise, tread:g.tread, rule, n:g.n, treads:g.treads};
}
/* ═══ الأوّليات ═══
   خطّ القطع: ما بعده يُرسَم متقطّعاً — الطابق الأعلى لا يظهر مصمَّتاً. */
export function stPrims(st){
 const g=stGeom(st);
 if(!g)return [];
 const L="A-STRS", out=[], h=txtH();
 const P=g.P;
 const cut=(st.cut>0.02)?g.L*st.cut:0;
 const dash=[h*1.5,h*0.9];
 const push=(a,b,beyond)=>out.push(beyond
  ? {t:"line",L,a,b,dash,sid:st.id}
  : {t:"line",L,a,b,sid:st.id});

 /* الجانبان */
 [-g.hw,g.hw].forEach(v=>{
  if(cut){
   push(P(0,v),P(cut,v),0);
   push(P(cut,v),P(g.L,v),1);
  }else push(P(0,v),P(g.L,v),0);
 });
 /* النائمات */
 for(let i=0;i<=g.treads;i++){
  const s=g.tread*i;
  push(P(s,-g.hw),P(s,g.hw), (cut&&s>cut)?1:0);
 }
 /* خطّ القطع: شرطتان مائلتان */
 if(cut){
  const d=g.hw*0.30, k=g.hw*0.34;
  out.push({t:"line",L,sid:st.id,
   a:P(cut-d,-g.hw*1.15), b:P(cut+d,g.hw*1.15)});
  out.push({t:"line",L,sid:st.id,
   a:P(cut-d+k,-g.hw*1.15), b:P(cut+d+k,g.hw*1.15)});
 }
 /* سهم الاتجاه على محور السير */
 const s0=g.tread*0.55;
 const s1=(cut?cut:g.L)-g.tread*0.55;
 if(s1>s0+h){
  const A=(st.up==="up")?P(s0,0):P(s1,0);
  const B=(st.up==="up")?P(s1,0):P(s0,0);
  out.push({t:"line",L,a:A,b:B,sid:st.id});
  const dx=B[0]-A[0], dy=B[1]-A[1], D=Math.hypot(dx,dy)||1;
  const ux=dx/D, uy=dy/D, nx=-uy, ny=ux, k=h*0.62;
  out.push({t:"poly",L,cl:1,sid:st.id,pts:[[B[0],B[1]],
   [R(B[0]-ux*k*1.9+nx*k*0.44),R(B[1]-uy*k*1.9+ny*k*0.44)],
   [R(B[0]-ux*k*1.9-nx*k*0.44),R(B[1]-uy*k*1.9-ny*k*0.44)]]});
  out.push({t:"arc",L,cx:A[0],cy:A[1],r:R(h*0.28),
   a0:0,a1:359.9,sid:st.id});
 }
 /* البطاقة */
 let rot=g.ang;
 if(rot>90.001&&rot<=270)rot=deg(rot+180);
 const m=P(g.L/2, g.hw+h*0.45);
 out.push({t:"text",L,sid:st.id,
  s:ltr(`${g.n} × ${m3(g.rise)} = ${m3(g.H)}`)+` م  `
   +`${st.up==="up"?"صاعد":"هابط"}`,
  x:m[0],y:m[1],h:h*0.9,al:"bc",rot});
 return out;
}
export const stLabel=st=>{
 const c=stCheck(st);
 return `${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م`;
};
