/* ═══ الأدوات الصحية والمطبخية ═══
   رموزٌ فوق الجسم لا جزءٌ منه: لا تدخل الاتحاد ولا تقطع جداراً ولا
   تُطرَح منه — لأنها أثاثٌ لا بناء.

   الإطار المحلّي: الأصل ظهر الأداة (ما يلاصق الجدار)، u على عرضها
   و v إلى الأمام. فوضعها على جدار يعني ضبط دورانها وحده.
   والإلصاق أمرٌ يُنفَّذ عند الوضع، لا رابطةٌ تُحفَظ. */
import {S,touchView} from "./state.js";
import {newId,clamp,D2R,deg,m2,dm2} from "./units.js";
import {pip,bboxOf,bboxHit,nearOnSeg,distSeg,segSeg,
        convexHit} from "./geom.js";
import {band} from "./walls.js";

const R=v=>Math.round(v);
export const FK={
 wc:    {n:"كرسي إفرنجي", w:400,  d:700},
 bidet: {n:"شطّاف",        w:380,  d:600},
 ur:    {n:"مبولة",        w:380,  d:350},
 lav:   {n:"مغسلة",        w:550,  d:450},
 sink:  {n:"حوض مطبخ",     w:800,  d:500},
 shower:{n:"دُش",           w:900,  d:900},
 tub:   {n:"بانيو",        w:1700, d:750},
 wm:    {n:"غسّالة",        w:600,  d:600},
 fd:    {n:"صفاية أرضية",  w:150,  d:150}
};
export const FKINDS=Object.keys(FK);
export const fkOf=k=>FK[k]||FK.wc;
export const fixById=id=>S.fixt.find(f=>f.id===id)||null;
export const fixW=f=>Math.max(80,+((f&&f.w))||fkOf(f&&f.kind).w);
export const fixD=f=>Math.max(80,+((f&&f.d))||fkOf(f&&f.kind).d);
export const fixName=f=>fkOf(f&&f.kind).n;

/* الإطار: P(u,v) — u على العرض من المركز، v من الظهر إلى الأمام */
export function frameOf(f){
 const a=(f.rot||0)*D2R, ca=Math.cos(a), sa=Math.sin(a);
 const m=(f.mir?-1:1);
 return (u,v)=>[R(f.x+(u*m)*ca-v*sa), R(f.y+(u*m)*sa+v*ca)];
}
export function fixPoly(f){
 const P=frameOf(f), w=fixW(f)/2, d=fixD(f);
 return [P(-w,0),P(w,0),P(w,d),P(-w,d)];
}
export const fixBBox=f=>bboxOf(fixPoly(f));
export const fixCenter=f=>{
 const P=frameOf(f);
 return P(0,fixD(f)/2);
};
export const fixAt=(x,y)=>{
 let best=null,ba=1/0;
 S.fixt.forEach(f=>{
  if(!pip(fixPoly(f),x,y))return;
  const a=fixW(f)*fixD(f);
  if(a<ba){ba=a;best=f}
 });
 return best;
};
export function addFix(kind,p,rot,ex){
 const K=FK[kind]?kind:"wc";
 const d=fkOf(K);
 const f={id:newId("F"),kind:K,x:R(p[0]),y:R(p[1]),
  rot:deg(+rot||0), w:d.w, d:d.d};
 if(ex){
  if(ex.w)f.w=clamp(R(ex.w),80,4000);
  if(ex.d)f.d=clamp(R(ex.d),80,4000);
  if(ex.mir)f.mir=1;
 }
 S.fixt.push(f); touchView();
 return f;
}
export function delFix(f){
 const i=S.fixt.indexOf(f);
 if(i<0)return false;
 S.fixt.splice(i,1); touchView();
 return true;
}
/* ═══ الإسناد إلى جدار ═══
   يبحث عن أقرب وجهِ جدارٍ ويعيد الموضع والدوران — أمرٌ يُنفَّذ عند
   الوضع، لا رابطةٌ تُحفَظ. الأداة بعده إحداثيات صريحة. */
export function snapToWall(p,tol){
 const T=Math.max(50,tol||1200);
 let best=null, bd=T;
 S.walls.forEach(w=>{
  const bp=band(w);
  if(!bp)return;
  for(let i=0;i<bp.length;i++){
   const A=bp[i], B=bp[(i+1)%bp.length];
   const r=nearOnSeg(A,B,p[0],p[1]);
   if(r.d>=bd)continue;
   const dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy);
   if(L<1)continue;
   /* العمود الداخل إلى الفراغ: من الوجه نحو النقطة */
   let nx=-dy/L, ny=dx/L;
   if((p[0]-r.p[0])*nx+(p[1]-r.p[1])*ny<0){nx=-nx;ny=-ny}
   bd=r.d;
   best={p:[R(r.p[0]),R(r.p[1])],
    rot:deg(Math.atan2(ny,nx)*180/Math.PI-90),
    wall:w.id, d:R(r.d)};
  }
 });
 return best;
}
/* المسافةُ بين قطعتين — الظهرُ مع وجه الجدار. محلّيّةٌ لا مُصدَّرة:
   عقدُ هذا الملفّ لا عقدُ الهندسة. */
const segGap=(p,q,a,b)=>segSeg(p,q,a,b)?0
 :Math.min(distSeg(a,b,p[0],p[1]), distSeg(a,b,q[0],q[1]),
           distSeg(p,q,a[0],a[1]), distSeg(p,q,b[0],b[1]));

export function fixOnWall(f,tol,walls){
 const T=(tol==null)?120:tol;
 const P=frameOf(f), w=fixW(f)/2;
 const p=P(-w,0), q=P(w,0);      /* الظهرُ قطعةٌ لا ثلاثُ نقاط:
    ثلاثُ عيّناتٍ تفوت جداراً قصيراً يقع بينها. */
 const fb=bboxOf([p,q]);
 for(const wl of (walls||S.walls)){
  const bp=band(wl);
  if(!bp)continue;
  const wb=bboxOf(bp);
  if(!wb||!bboxHit(wb,fb,T))continue;
  for(let i=0;i<bp.length;i++)
   if(segGap(p,q,bp[i],bp[(i+1)%bp.length])<=T)return wl.id;
 }
 return null;
}
export function fixOverlap(a,b){
 const A=fixPoly(a), B=fixPoly(b);
 if(!bboxHit(bboxOf(A),bboxOf(B),-1))return false;
 return convexHit(A,B,-1);
}
/* ═══ الرموز ═══ */
const ELL=(P,cu,cv,ru,rv,n)=>{
 const out=[], N=n||20;
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2;
  out.push(P(cu+ru*Math.cos(a), cv+rv*Math.sin(a)));
 }
 return out;
};
export function fixPrims(f){
 const L="A-FIXT", out=[], P=frameOf(f);
 const w=fixW(f), d=fixD(f), hw=w/2;
 const LN=(a,b)=>out.push({t:"line",L,a,b,fid:f.id});
 const PL=(pts,cl)=>out.push({t:"poly",L,pts,
  cl:cl===0?0:1,fid:f.id});
 const AR=(c,r)=>out.push({t:"arc",L,cx:c[0],cy:c[1],
  r:R(Math.max(2,r)),a0:0,a1:359.9,fid:f.id});
 const K=f.kind;

 if(K==="wc"||K==="bidet"){
  /* خزّان عند الظهر ثم قصعة بيضاوية */
  const tk=d*0.20;
  PL([P(-hw,0),P(hw,0),P(hw,tk),P(-hw,tk)],1);
  PL(ELL(P,0,tk+(d-tk)*0.52,hw*0.92,(d-tk)*0.50,22),1);
  if(K==="wc")LN(P(0,tk),P(0,tk+(d-tk)*0.12));
  return out;
 }
 if(K==="ur"){
  PL([P(-hw,0),P(hw,0),P(hw,d*0.30),
      P(hw*0.62,d*0.86),P(0,d),P(-hw*0.62,d*0.86),
      P(-hw,d*0.30)],1);
  PL(ELL(P,0,d*0.46,hw*0.52,d*0.30,16),1);
  return out;
 }
 if(K==="lav"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  PL(ELL(P,0,d*0.52,hw*0.74,d*0.34,22),1);
  AR(P(0,d*0.52),Math.min(hw,d)*0.07);
  LN(P(0,0),P(0,d*0.12));                   /* الخلّاط */
  return out;
 }
 if(K==="sink"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const g=Math.min(w,d)*0.08;
  PL([P(-hw+g,g),P(hw-g,g),P(hw-g,d-g),P(-hw+g,d-g)],1);
  AR(P(-w*0.22,d*0.5),Math.min(hw,d)*0.06);
  AR(P( w*0.22,d*0.5),Math.min(hw,d)*0.06);
  LN(P(0,0),P(0,g*1.4));
  return out;
 }
 if(K==="shower"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  LN(P(-hw,0),P(hw,d)); LN(P(hw,0),P(-hw,d));
  AR(P(0,d*0.5),Math.min(hw,d)*0.11);
  return out;
 }
 if(K==="tub"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  const g=Math.min(w,d)*0.09;
  PL(ELL(P,0,d*0.5,hw-g,d*0.5-g,26),1);
  AR(P(-hw+g*2.2,d*0.5),Math.min(hw,d)*0.06);
  return out;
 }
 if(K==="wm"){
  PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
  AR(P(0,d*0.55),Math.min(hw,d)*0.42);
  LN(P(-hw,d*0.18),P(hw,d*0.18));
  return out;
 }
 /* صفاية أرضية */
 PL([P(-hw,0),P(hw,0),P(hw,d),P(-hw,d)],1);
 LN(P(-hw,0),P(hw,d)); LN(P(hw,0),P(-hw,d));
 return out;
}
export const fixLabel=f=>`${fixName(f)} ${dm2(fixW(f),fixD(f),"م")}`;
