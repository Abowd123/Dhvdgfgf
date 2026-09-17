/* ═══ فكّ الإحداثيات · التقييد الزاوي ═══
   مساعدة إدخال خالصة: تعينك على إصابة النقطة التي قصدتها،
   ولا تُعدّل شيئاً بعد وقوعها. */
import {M,norm,D2R,R2D,deg} from "./units.js";
export {D2R,R2D};

export const polar=(o,L,a)=>
 [Math.round(o[0]+L*Math.cos(a*D2R)),Math.round(o[1]+L*Math.sin(a*D2R))];
export const angOf=(a,b)=>deg(Math.atan2(b[1]-a[1],b[0]-a[0])*R2D);
export const lenOf=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);

/* 3,4 مطلق · @5,3 نسبي · 5<45 قطبي · @5<45 قطبي نسبي
   5 مسافة في الاتجاه الحالي · <45 قفل زاوية · 3x4 مقاس */
export function parsePt(s,base,dir){
 s=norm(s).replace(/\s+/g,"");
 if(!s)return null;
 let rel=false;
 if(s[0]==="@"){
  rel=true; s=s.slice(1);
  if(!base)return {k:"err",m:"@ يحتاج نقطة أساس"};
 }
 let m=/^<(-?\d+(?:\.\d+)?)$/.exec(s);
 if(m)return {k:"ang",a:+m[1]};
 m=/^(-?\d*\.?\d+(?:mm|cm|m|مم|سم|م)?)<(-?\d+(?:\.\d+)?)$/.exec(s);
 if(m){
  const L=M(m[1]), o=rel?base:[0,0];
  return {k:"pt",p:polar(o,L,+m[2])};
 }
 m=/^(-?\d*\.?\d+)[,](-?\d*\.?\d+)$/.exec(s);
 if(m){
  const x=M(m[1]), y=M(m[2]);
  return {k:"pt",p:rel?[Math.round(base[0]+x),Math.round(base[1]+y)]
                      :[x,y]};
 }
 m=/^(-?\d*\.?\d+)[x*](-?\d*\.?\d+)$/.exec(s);
 if(m)return {k:"dim",w:M(m[1]),d:M(m[2])};
 m=/^(-?\d*\.?\d+(?:mm|cm|m|مم|سم|م)?)$/.exec(s);
 if(m){
  const L=M(m[1]);
  if(!base)return {k:"len",L};
  if(!dir)return {k:"err",m:"حرّك المؤشر لتحديد الاتجاه ثم اكتب المسافة"};
  return {k:"pt",dde:1,
   p:[Math.round(base[0]+dir[0]*L),Math.round(base[1]+dir[1]*L)]};
 }
 return null;
}
export function trackAngles(mode,inc,extra){
 if(mode==="ortho")return [0,90,180,270];
 if(mode!=="polar")return null;
 const st=Math.max(1,Math.min(90,inc||15)), A=[];
 for(let a=0;a<360;a+=st)A.push(a);
 (extra||[]).forEach(v=>{const x=deg(+v); if(!A.includes(x))A.push(x)});
 return A.sort((a,b)=>a-b);
}
/* يقيّد p على أقرب زاوية متاحة — إسقاط عمودي */
export function constrain(base,p,mode,inc,extra,tolDeg){
 if(!base)return null;
 const A=trackAngles(mode,inc,extra); if(!A)return null;
 const dx=p[0]-base[0], dy=p[1]-base[1];
 if(Math.hypot(dx,dy)<1)return null;
 const a=deg(Math.atan2(dy,dx)*R2D);
 let best=null,bd=1e9;
 A.forEach(t=>{
  let d=Math.abs(t-a); if(d>180)d=360-d;
  if(d<bd){bd=d;best=t}
 });
 if(best==null)return null;
 const tol=(tolDeg!=null)?tolDeg
  :((mode==="ortho")?90:Math.min(12,(inc||15)/2));
 if(bd>tol)return null;
 const ux=Math.cos(best*D2R), uy=Math.sin(best*D2R);
 const t=dx*ux+dy*uy;
 return {a:best,L:t,
  p:[Math.round(base[0]+ux*t),Math.round(base[1]+uy*t)]};
}
