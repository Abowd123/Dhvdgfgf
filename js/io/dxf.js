/* ═══ كاتب DXF يدوياً ═══
   يقرأ أوّليات المشهد نفسها التي تُرسَم على الشاشة، فلا يفترق
   المُصدَّر عن المعروض. والهيئة من io/style.js — مصدرٌ واحد يقرأه
   الأربعة.

   ثلاثة قرارات مصرَّح بها:
   · الشرطة المتقطّعة تُكسَر إلى قطعٍ حقيقية بأطوالها المرسومة، بدل
     تعريف LTYPE بأنماط — أثقل ملفّاً وأصدق تمثيلاً. وهي تُطبَّق
     لشرطة الطبقة أيضاً بعد اليوم: كانت تُهمَل هنا وتُطبَّق في SVG
     وPNG، فالمخرَجان يختلفان في الشكل نفسه.
   · الهاشور يُولَّد خطوطاً مقصوصة على الحلقات، لأن HATCH ليست في
     R12 ولا نكتبها في R2000. النتيجة هندسة صريحة يقرأها كل برنامج.
   · الإصدار AC1015 لا AC1009: كنّا نكتب وزن الخطّ (370) و$INSUNITS
     وهما بعد R12، فالإعلان كان أقدم من المحتوى. */
/* الجدولُ الحيُّ لا المصنع: لونٌ يضبطه المستخدم كان يظهر
   على الشاشة ولا يصل الملفّ. */
import {S} from "../core/state.js";
import {resolve,plots} from "../core/layers.js";
import {styleOf,fillOf,hatchOf,hatchLines,ctxOf} from "./style.js";
import {encode} from "./cp1256.js";
export {hatchLines};          /* من كان يستوردها من هنا يبقى عاملاً */

const F=(v,n)=>{
 const x=(+v||0).toFixed(n==null?4:n);
 return (/^-0\.0+$/.test(x))?x.slice(1):x;
};
const L2=(c,v)=>`${c}\n${v}\n`;
/* لونٌ حقيقيّ لـ420: ACI ٢٥٦ لوناً لا تحمل ما يختاره المستخدم */
const rgb24=css=>{
 const s=String(css||"#000000").replace("#","");
 const n=(s.length===3)
  ? s.split("").map(c=>parseInt(c+c,16))
  : [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),
     parseInt(s.slice(4,6),16)];
 const v=n.map(x=>isFinite(x)?Math.max(0,Math.min(255,x)):0);
 return ((v[0]<<16)|(v[1]<<8)|v[2]);
};

/* ═══ الشرطة → قطع حقيقية ═══ خاصّةٌ بـDXF فتبقى هنا ═══ */
export function dashSegs(a,b,pat){
 const P=(pat||[]).map(v=>Math.max(1,+v||0)).filter(v=>v>0);
 if(!P.length)return [[a,b]];
 const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
 if(L<1)return [[a,b]];
 const ux=dx/L, uy=dy/L, out=[];
 let s=0, i=0, on=true, guard=0;
 while(s<L&&guard++<20000){
  const d=Math.min(P[i%P.length],L-s);
  if(on&&d>0.4)out.push([
   [a[0]+ux*s, a[1]+uy*s],
   [a[0]+ux*(s+d), a[1]+uy*(s+d)]]);
  s+=d; i++; on=!on;
 }
 return out.length?out:[[a,b]];
}
/* ═══ كيانات DXF ═══ */
const eLine=(lay,a,b)=>L2(0,"LINE")+L2(8,lay)
 +L2(10,F(a[0]))+L2(20,F(a[1]))+L2(30,"0.0")
 +L2(11,F(b[0]))+L2(21,F(b[1]))+L2(31,"0.0");

const ePoly=(lay,pts,closed)=>{
 let s=L2(0,"POLYLINE")+L2(8,lay)+L2(66,"1")
  +L2(10,"0.0")+L2(20,"0.0")+L2(30,"0.0")
  +L2(70,closed?"1":"0");
 pts.forEach(p=>{s+=L2(0,"VERTEX")+L2(8,lay)
  +L2(10,F(p[0]))+L2(20,F(p[1]))+L2(30,"0.0")});
 return s+L2(0,"SEQEND")+L2(8,lay);
};
const eArc=(lay,cx,cy,r,a0,a1)=>{
 const sw=((a1-a0)%360+360)%360;
 if(sw<0.05||sw>359.95)
  return L2(0,"CIRCLE")+L2(8,lay)
   +L2(10,F(cx))+L2(20,F(cy))+L2(30,"0.0")
   +L2(40,F(Math.max(0.01,r)));
 return L2(0,"ARC")+L2(8,lay)
  +L2(10,F(cx))+L2(20,F(cy))+L2(30,"0.0")
  +L2(40,F(Math.max(0.01,r)))+L2(50,F(a0,3))+L2(51,F(a1,3));
};
/* 72: 0 يسار · 1 وسط · 2 يمين   |   73: 0 قاعدة · 2 وسط */
const JU={bl:[0,0],bc:[1,0],br:[2,0],ml:[0,2],mc:[1,2],mr:[2,2]};
const eText=(lay,g)=>{
 const j=JU[g.al]||JU.bc;
 let s=L2(0,"TEXT")+L2(8,lay)
  +L2(10,F(g.x))+L2(20,F(g.y))+L2(30,"0.0")
  +L2(40,F(Math.max(1,g.h)))
  +L2(1,String(g.s).replace(/[\r\n]+/g," "))
  +L2(7,"STANDARD");
 if(g.rot)s+=L2(50,F(g.rot,3));
 if(j[0]||j[1]){
  s+=L2(72,String(j[0]));
  s+=L2(11,F(g.x))+L2(21,F(g.y))+L2(31,"0.0");
  if(j[1])s+=L2(73,String(j[1]));
 }
 return s;
};
/* ═══ التحويل من أوّلية إلى كيانات ═══
   الهيئة من المُحلّ: st.cut يعني «طبِّق الشرطة بالتقطيع»، فالقرار
   في style.js لا هنا — وكان النصّ يقرأ resolve بنفسه فيختلف عن
   الإعلان الذي يُبلَّغ للمستخدم. */
function emit(g,SO){
 const lay=g.L||"0";
 if(g.t==="hatch"){
  const hs=hatchOf(g,"dxf",SO);
  if(hs.skip)return "";
  const parts=[];
  hs.sets.forEach(([ang,d])=>{
   const H2=hatchLines(g.loops,ang,d);
   SO.hatchCut=(SO.hatchCut||0)+H2.cut;
   H2.lines.forEach(q=>{parts.push(eLine(lay,q[0],q[1]))});
  });
  return parts.join("");
 }
 if(g.t==="fill"){
  const f=fillOf(g,"dxf",SO);
  if(f.skip)return "";
  const r=g.ring||[];
  if(r.length<3)return "";
  if(f.hatch){
   /* المنطقة المهشَّرة: خطوطٌ مولَّدة كالثلاثة الآخرين — وكان
      يُصدَّر حدُّها وحده فتختفي تعبئتها من DXF دون غيره */
   const H2=hatchLines([r],45,f.sp);
   SO.hatchCut=(SO.hatchCut||0)+H2.cut;
   return H2.lines.map(q=>eLine(lay,q[0],q[1])).join("");
  }
  /* الصبغة الشفافة: حدُّها يُصدَّر خطاً — والعجز مُعلَنٌ في notes */
  return ePoly(lay,r,1);
 }
 const st=styleOf(g,"dxf",SO);
 if(st.skip)return "";
 const dash=(st.dash&&st.dash.length&&st.cut)?st.dash:null;
 if(g.t==="line"){
  if(dash)return dashSegs(g.a,g.b,dash)
   .map(s=>eLine(lay,s[0],s[1])).join("");
  return eLine(lay,g.a,g.b);
 }
 if(g.t==="poly"){
  const pts=g.pts||[];
  if(pts.length<2)return "";
  if(!dash)return ePoly(lay,pts,g.cl!==0);
  const parts=[];
  const n=(g.cl!==0)?pts.length:pts.length-1;
  for(let i=0;i<n;i++)
   dashSegs(pts[i],pts[(i+1)%pts.length],dash)
    .forEach(q=>{parts.push(eLine(lay,q[0],q[1]))});
  return parts.join("");
 }
 if(g.t==="arc")return eArc(lay,g.cx,g.cy,g.r,g.a0,g.a1);
 if(g.t==="text")return eText(lay,g);
 return "";
}
/* ═══ الملفّ الكامل ═══ */
export function toDXF(prims,bbox,opt){
 const O=opt||{};
 const k=Math.max(1,S.meta.scale);
 /* px=1: DXF يعمل في وحدات النموذج · showWarn=0: التسليم للعميل
    لا يحمل ألوان تشخيص، وCAPS.dxf.warn=0 على أي حال */
 const SO=ctxOf("dxf",{dark:0,k,px:1,minLw:0,
  notes:O.notes||[], showWarn:false, hatchCut:0,
  hs:Math.max(8,(S.meta.txtMM*k)*2.5)});
 /* طبقةٌ لا يُطبَع منها شيءٌ لا تُعلَن: emit يُسقِط أوّلياتها
    فيخرج إعلانٌ لطبقةٍ فارغة. */
 const used=new Set();
 (prims||[]).forEach(g=>{
  const n=g.L||"0";
  if(plots(n))used.add(n);
 });
 const B=bbox||{x0:0,y0:0,x1:1000,y1:1000};
 let s="";
 /* الترويسة */
 s+=L2(0,"SECTION")+L2(2,"HEADER")
  /* AC1015 (R2000) لا AC1009 (R12): وزن الخطّ (370) و$INSUNITS
     كلاهما بعد R12، فالإعلان كان أقدم من المحتوى. والبنية نفسها
     مقبولةٌ في R15 حرفاً بحرف — ولا HATCH فيها على أي حال،
     فالقرار المُعلَن (هاشورٌ خطوطاً) قائم. */
  +L2(9,"$ACADVER")+L2(1,"AC1015")
  /* البايتات بهذه الصفحة فعلاً — انظر toDXFBytes.
     تمريرُ نصٍّ إلى Blob كان يجعل الإعلان كاذباً والعربية
     خربشةً في أوتوكاد. */
  +L2(9,"$DWGCODEPAGE")+L2(3,"ANSI_1256")
  +L2(9,"$INSUNITS")+L2(70,"4")
  +L2(9,"$INSBASE")+L2(10,"0.0")+L2(20,"0.0")+L2(30,"0.0")
  +L2(9,"$EXTMIN")+L2(10,F(B.x0))+L2(20,F(B.y0))+L2(30,"0.0")
  +L2(9,"$EXTMAX")+L2(10,F(B.x1))+L2(20,F(B.y1))+L2(30,"0.0")
  +L2(9,"$LUNITS")+L2(70,"2")
  +L2(9,"$LTSCALE")+L2(40,"1.0")
  +L2(9,"$TEXTSTYLE")+L2(7,"STANDARD")
  +L2(0,"ENDSEC");
 /* الجداول */
 s+=L2(0,"SECTION")+L2(2,"TABLES");
 s+=L2(0,"TABLE")+L2(2,"LTYPE")+L2(70,"1")
  +L2(0,"LTYPE")+L2(2,"CONTINUOUS")+L2(70,"0")
  +L2(3,"Solid line")+L2(72,"65")+L2(73,"0")+L2(40,"0.0")
  +L2(0,"ENDTAB");
 s+=L2(0,"TABLE")+L2(2,"LAYER")+L2(70,String(used.size+1))
  +L2(0,"LAYER")+L2(2,"0")+L2(70,"0")+L2(62,"7")
  +L2(6,"CONTINUOUS");
 used.forEach(n=>{
  if(n==="0")return;
  /* الجدولُ الحيُّ لا المصنع — وكان styleOf يقرأ الحيَّ وهذا
     الجدولُ يقرأ المصنع، فينجرفان لحظةَ يُعدَّل لونٌ أو وزن. */
  const r=resolve(n,"plot");
  /* 70 بت ٤ = مقفلة: تُرى ولا تُلمَس عند من يفتح رسمك.
     والشرطةُ تبقى CONTINUOUS هنا لأننا نقطّعها قطعاً حقيقية
     (CAPS.dxf.cut) — فلو أعلنّا نمطاً لطُبِّق مرّتين.
     و370 سالبةٌ ثلاثاً تعني «افتراضيّ» في DXF، وهو معنى صفرٍ
     في جدولنا (LWS[0] = افتراضي). */
  s+=L2(0,"LAYER")+L2(2,n)+L2(70,r.lk?"4":"0")
   +L2(62,String(r.aci||7))
   +L2(420,String(rgb24(r.css)))
   +L2(6,"CONTINUOUS")
   +L2(370,(r.lw|0)?String(r.lw|0):"-3");
 });
 s+=L2(0,"ENDTAB");
 s+=L2(0,"TABLE")+L2(2,"STYLE")+L2(70,"1")
  +L2(0,"STYLE")+L2(2,"STANDARD")+L2(70,"0")
  +L2(40,"0.0")+L2(41,"1.0")+L2(50,"0.0")+L2(71,"0")
  +L2(42,"2.5")+L2(3,"txt")+L2(4,"")
  +L2(0,"ENDTAB");
 s+=L2(0,"ENDSEC");
 /* الكيانات — join لا s+=: لوحةٌ فيها هاشور تُخرِج مئات الآلاف
    من الأسطر، والإضافة المتكرّرة تبني سلسلةً عملاقة نسخةً نسخة */
 s+=L2(0,"SECTION")+L2(2,"ENTITIES");
 const parts=[];
 (prims||[]).forEach(g=>{const e=emit(g,SO); if(e)parts.push(e)});
 s+=parts.join("")+L2(0,"ENDSEC")+L2(0,"EOF");
 if(O.notes&&SO.hatchCut)O.hatchCut=SO.hatchCut;
 return s;
}
/* ═══ الملفّ بايتاتٍ ═══
   الترويسة تُعلن ANSI_1256، فالبايتات يجب أن تكون بها. وBlob
   يُرمِّز السلاسل UTF-8 دائماً، فلو مرّرنا نصّاً لكان الإعلان
   كاذباً والعربية خربشةً في أوتوكاد — والدورة الداخلية سليمةٌ
   ومغلقةٌ على نفسها فلا تظهر العلّة إلّا حين يفتح رسمَك غيرك.
   ويُعاد عددُ ما لم يُرمَّز وما فُقِد من الهيئة فيُقال للمستخدم. */
export function toDXFBytes(prims,bbox){
 const notes=[];
 const O={notes};
 const txt=toDXF(prims,bbox,O);
 const r=encode(txt);
 return {bytes:r.bytes, bad:r.bad, chars:txt.length, notes,
  hatchCut:O.hatchCut||0};
}
export const dxfStats=prims=>{
 const by={};
 (prims||[]).forEach(g=>{by[g.t]=(by[g.t]||0)+1});
 return by;
};
