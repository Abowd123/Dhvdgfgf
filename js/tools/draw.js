/* ═══ أدوات الرسم ═══
   كل أداة تُنشئ ما طلبتَه بالحرف: جدار واحد بسماكته ومحاذاته،
   ولا لحم ولا كائن مشتقّ ولا تعديل على ما سبق. */
import {S} from "../core/state.js";
import {m2,m3,mm,dm2} from "../core/units.js";
import {addWall,ALIGN,dir,wallLen} from "../core/walls.js";
import {defTool,H,rec,finish,undoStep,ov,ovLen,ovOn,
        pvLine,pvRect,pvBand} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", PNK="#ff8f8f";
const TY=[["int","داخلي"],["ext","خارجي"],["low","سترة"]];
const AL=[["c","مركزي"],["l","الوجه الأيسر"],["r","الوجه الأيمن"]];

/* ═══ جدار ═══ */
function mkWall(ctx,a,b){
 const w=addWall(a,b,
  ovLen("wall","t"), ov("wall","type"), ov("wall","align"),
  ovLen("wall","h"));
 rec(ctx,w,"walls");
 const d=dir(w);
 H.rep("ok",`${w.id} · ${m2(wallLen(w))} م · `
  +`${d?d.ang.toFixed(1):"0"}° · ${mm(w.t).toFixed(2)} م `
  +`${ALIGN[w.align]}`
  +(w.type==="low"?` · سترة ${m2(w.h)} م`:""));
 return w;
}
defTool({
 id:"wall", alias:"w جدار خط", label:"جدار",
 hint:"نقطتان لكل جدار · C يغلق · U يتراجع خطوة",
 opts:[
  {k:"t",    label:"السماكة م", type:"len", def:"0.15"},
  {k:"type", label:"النوع",     type:"sel", items:TY, def:"int"},
  {k:"align",label:"المسار على",type:"sel", items:AL, def:"c",
   hint:"يسار ويمين بالنسبة لاتجاه الرسم"},
  {k:"h",    label:"ارتفاع السترة م", type:"len", def:"1",
   when:o=>o.type==="low"},
  {k:"chain",label:"متّصل",     type:"chk", def:1}],
 steps:[
  {p:"نقطة البداية"},
  {p:"النقطة التالية", loop:1, base:-1,
   opts:{
    c:{n:"إغلاق",run(ctx){
     if(ctx.pts.length<3)throw new Error("الإغلاق يحتاج ثلاث نقاط");
     mkWall(ctx,ctx.pts[ctx.pts.length-1],ctx.pts[0]);
     finish("أُغلق المضلع");
    }},
    u:{n:"تراجع",run(){undoStep()}}},
   each(ctx,p){
    const P=ctx.pts;
    if(P.length<2)return;
    mkWall(ctx,P[P.length-2],p);
    /* غير المتّصل: كل جدار مستقلّ بنقطتيه */
    if(!ovOn("wall","chain")){
     ctx.pts.length=0;
     ctx.pts.push(p);
    }
   }}],
 prev(ctx,g){
  const o=[], P=ctx.pts, t=ovLen("wall","t")||150;
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],"#4b5a6b"));
  if(P.length&&g){
   o.push(pvBand(P[P.length-1],g,t,GRN));
   o.push(pvLine(P[P.length-1],g,YEL));
  }
  return o;
 }});

/* ═══ مستطيل ═══
   المحاذاة تُطبَّق على كل ضلع بحيث تنتظم كلها إلى الداخل أو الخارج.
   الاتجاه يُوحَّد عكس عقارب الساعة، فيكون «اليسار» هو الخارج. */
defTool({
 id:"rect", alias:"r مستطيل", label:"مستطيل",
 hint:"ركنان متقابلان · أو اكتب مقاساً مثل 9x14",
 opts:[
  {k:"t",    label:"السماكة م", type:"len", def:"0.25"},
  {k:"type", label:"النوع",     type:"sel", items:TY, def:"ext"},
  {k:"align",label:"القياس",    type:"sel",
   items:[["c","محوري"],["l","داخلي صافٍ"],["r","خارجي كلّي"]],
   def:"c"}],
 steps:[
  {p:"الركن الأول"},
  {p:"الركن المقابل أو المقاس", base:0, restart:1,
   each(ctx,p){
    const a=ctx.pts[0];
    const x0=Math.min(a[0],p[0]), x1=Math.max(a[0],p[0]);
    const y0=Math.min(a[1],p[1]), y1=Math.max(a[1],p[1]);
    if(x1-x0<500||y1-y0<500)
     throw new Error("المستطيل أصغر من 0.50 م");
    const t=ovLen("rect","t"), ty=ov("rect","type");
    const al=ov("rect","align");
    /* عكس الساعة مع Y للأعلى: الداخل يسار كل ضلعٍ موجَّه.
       فalign=l يعني المسار على الوجه الداخلي والجسم يمتدّ خارجاً
       ⇒ المقاس المرسوم هو الصافي. وr عكسه: المقاس كلّيّ. */
    const Q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    for(let i=0;i<4;i++)rec(ctx,
     addWall(Q[i],Q[(i+1)%4],t,ty,al),"walls");
    const nm={c:"محورياً",l:"صافياً",r:"كلّياً"}[al];
    H.rep("ok",`4 جدران · ${dm2(x1-x0,y1-y0,"م")} ${nm}`);
   }}],
 prev(ctx,g){
  return (ctx.pts.length&&g)?[pvRect(ctx.pts[0],g,GRN)]:[];
 }});

/* ═══ قياس — لا يُنشئ شيئاً ═══ */
defTool({
 id:"measure", alias:"mi قياس مسافه", label:"قياس",
 hint:"نقاط متتالية · Enter ينهي ويعرض النتيجة",
 opts:[],
 steps:[
  {p:"النقطة الأولى"},
  {p:"النقطة التالية (Enter ينهي)", loop:1, base:-1}],
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],PNK));
  return o;
 },
 done(ctx){
  const P=ctx.pts;
  if(P.length<2)return;
  let tot=0;
  for(let i=0;i<P.length-1;i++)
   tot+=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);
  let s=`المسافة ${m3(tot)} م`;
  if(P.length===2){
   const a=((Math.atan2(P[1][1]-P[0][1],P[1][0]-P[0][0])
    *180/Math.PI)%360+360)%360;
   s+=` · الزاوية ${a.toFixed(1)}°`;
  }
  if(P.length>3){
   let ar=0;
   for(let i=0,n=P.length;i<n;i++){
    const q=P[i], r=P[(i+1)%n];
    ar+=q[0]*r[1]-r[0]*q[1];
   }
   s+=` · المساحة ${(Math.abs(ar/2)/1e6).toFixed(3)} م²`;
  }
  H.rep("ok",s);
 }});
