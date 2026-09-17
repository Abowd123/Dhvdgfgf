/* ═══ أدوات التأشير ═══
   البُعد ثلاث نقرات: طرف، طرف، موضع الخطّ — كلّها صريحة.
   السلسلة تُبنى من قيَم تكتبها، لا من مطابقة تُخمَّن. */
import {S} from "../core/state.js";
import {m2,m3,M,clamp,mnum} from "../core/units.js";
import {addDim,posFromPt,dimValue,fmtLen,dimGeom,DK,
        parseVals,addChain,chainSum,chainCompare,
        addText,addLead,addLevel,addAxis,
        axLabel,levelStr} from "../core/dims.js";
import {defTool,H,rec,dirty,ov,ovLen,ovNum,ovOn,
        pvLine} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", PNK="#ff9aa2";

/* ═══ بُعد ═══ */
defTool({
 id:"dim", alias:"d1 بعد قياسات", label:"بُعد",
 hint:"طرف · طرف · موضع الخطّ",
 opts:[
  {k:"kind",label:"النوع",type:"sel",
   items:[["h","أفقي"],["v","رأسي"],["al","محاذٍ"]],def:"h"},
  {k:"txt", label:"نصّ بديل",type:"text",def:"",
   hint:"يُعرَض بدل المقاس مع علامة *"}],
 steps:[
  {p:"الطرف الأول"},
  {p:"الطرف الثاني", base:0},
  {p:"موضع خطّ البُعد", base:"none", restart:1,
   each(ctx,p){
    const a=ctx.pts[0], b=ctx.pts[1];
    const kind=ov("dim","kind");
    const d=addDim(kind,a,b,posFromPt(kind,a,b,p),
     String(ov("dim","txt")||"").trim());
    rec(ctx,d,"dims");
    H.rep("ok",`${d.id} ${DK[d.kind]} ${fmtLen(dimValue(d))} م`
     +(d.txt?` · نصّ بديل «${d.txt}» — علامة * تدلّ عليه`:""));
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvLine(P[0],g,YEL)];
  if(P.length>=2){
   const kind=ov("dim","kind");
   const gm=dimGeom({kind,a:P[0],b:P[1],
    pos:posFromPt(kind,P[0],P[1],g)});
   if(!gm)return [pvLine(P[0],P[1],YEL)];
   return [pvLine(P[0],P[1],"#4b5a6b"),
           pvLine(gm.p1,gm.p2,GRN),
           pvLine(P[0],gm.p1,"#3d4a58"),
           pvLine(P[1],gm.p2,"#3d4a58")];
  }
  return [];
 }});

/* ═══ سلسلة أبعاد بقيَم مكتوبة ═══ */
defTool({
 id:"chain", alias:"ch سلسله", label:"سلسلة",
 hint:"اكتب القيَم في الشريط ثم انقر البداية وموضع الخطّ",
 opts:[
  {k:"vals", label:"القيَم م",type:"text",def:"",
   hint:"مثل: 3 2.5 4 · أو 3*4 لتكرار"},
  {k:"axis", label:"المحور",type:"sel",
   items:[["h","أفقي"],["v","رأسي"]],def:"h"},
  {k:"total",label:"خطّ المجموع",type:"chk",def:1}],
 start(ctx){
  try{ctx.v.vals=parseVals(ov("chain","vals"))}
  catch(e){H.rep("er",e.message); return false}
  H.rep("in",`${ctx.v.vals.length} قيمة · المجموع `
   +`${fmtLen(ctx.v.vals.reduce((s,v)=>s+v,0))} م`);
  return true;
 },
 steps:[
  {p:"نقطة بداية السلسلة"},
  {p:"موضع خطّ السلسلة", base:0, restart:1,
   each(ctx,p){
    const ax=ov("chain","axis");
    const c=addChain(ax,ctx.pts[0],(ax==="h")?p[1]:p[0],
     ctx.v.vals, ovOn("chain","total")?1:0);
    rec(ctx,c,"chains");
    H.rep("ok",`${c.id} ${ctx.v.vals.length} قيمة · `
     +`${fmtLen(chainSum(c))} م · القيَم كما كتبتها`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g||!ctx.v.vals)return [];
  const ax=ov("chain","axis");
  const b=ctx.pts[0];
  const pos=(ax==="h")?g[1]:g[0];
  const pt=v=>(ax==="h")?[b[0]+v,pos]:[pos,b[1]+v];
  const o=[pvLine(b,pt(0),"#3d4a58")];
  let s=0;
  ctx.v.vals.forEach(v=>{
   o.push(pvLine(pt(s),pt(s+v),GRN));
   s+=v;
  });
  return o;
 }});

/* ═══ مقارنة السلسلة بالهندسة — تقرير ═══ */
defTool({
 id:"chaincmp", alias:"cc قارن", label:"قارن السلسلة",
 hint:"يعرض فرق كل حدٍّ عن أقرب عقدة — بلا تعديل",
 opts:[{k:"tol",label:"التفاوت م",type:"len",def:"0.06"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="chain");
  if(!L.length){H.rep("wr","حدّد سلسلة أولاً");return false}
  L.forEach(s=>{
   const c=S.chains.find(x=>x.id===s.id);
   if(!c)return;
   const r=chainCompare(c,ovLen("chaincmp","tol"));
   H.rep(r.off?"wr":"ok",
    `${c.id}: المجموع ${fmtLen(r.sum)} م · `
    +`${r.off?`${r.off} حدّاً خارج التفاوت`:"كل الحدود مطابقة"}`);
   r.rows.forEach(x=>{
    if(x.ok)return;
    H.rep("in",`  الحدّ ${x.i}: على ${m3(x.at)} م · `
     +`أقرب عقدة ${x.near==null?"—":m3(x.near)} م · `
     +`الفرق ${x.d==null?"—":m3(x.d)} م`);
   });
  });
  H.rep("in","تقرير فقط — لم تُعدَّل قيمة واحدة");
  return false;
 },
 steps:[]});

/* ═══ نصّ ═══ */
defTool({
 id:"text", alias:"t نص", label:"نصّ",
 hint:"اكتب النصّ في الشريط ثم انقر موضعه · Enter ينهي",
 opts:[
  {k:"s",  label:"النصّ",type:"text",def:""},
  {k:"hm", label:"الحجم ×",type:"num",def:1},
  {k:"rot",label:"الدوران °",type:"num",def:0},
  {k:"al", label:"المحاذاة",type:"sel",
   items:[["bc","وسط"],["bl","يسار"],["mc","وسط أوسط"]],def:"bc"}],
 steps:[
  {p:"موضع النصّ (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const a=addText(p,ov("text","s"),ovNum("text","hm"),
     ovNum("text","rot"),ov("text","al"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} «${a.s}»`);
   }}]});

/* ═══ قائد ═══ */
defTool({
 id:"lead", alias:"le قائد", label:"قائد",
 hint:"رأس السهم ثم كسرات ثم Enter · النصّ من الشريط",
 opts:[
  {k:"s", label:"النصّ",type:"text",def:""},
  {k:"hm",label:"الحجم ×",type:"num",def:1}],
 steps:[
  {p:"رأس السهم"},
  {p:"نقطة الكسر (Enter ينهي القائد)", loop:1, base:-1, min:1}],
 done(ctx){
  if(ctx.pts.length<2)return;
  const a=addLead(ctx.pts,ov("lead","s"),ovNum("lead","hm"));
  rec(ctx,a,"anno");
  H.rep("ok",`${a.id} قائد «${a.s}» · ${ctx.pts.length} نقطة`);
 },
 prev(ctx,g){
  const P=ctx.pts.concat(g?[g]:[]), o=[];
  for(let i=0;i<P.length-1;i++)o.push(pvLine(P[i],P[i+1],PNK));
  return o;
 }});

/* ═══ منسوب ═══ */
defTool({
 id:"level", alias:"lv منسوب", label:"منسوب",
 hint:"انقر الموضع · القيمة من الشريط · Enter ينهي",
 opts:[
  {k:"z",  label:"المنسوب م",type:"text",def:"0"},
  {k:"pre",label:"سابقة",   type:"text",def:"",hint:"مثل: ت.م"}],
 steps:[
  {p:"موضع المنسوب (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const raw=String(ov("level","z")||"0").trim();
    const neg=/^-/.test(raw);
    const z=M(raw.replace(/^-/,""))*(neg?-1:1);
    const a=addLevel(p,z,ov("level","pre"));
    rec(ctx,a,"anno");
    H.rep("ok",`${a.id} ${levelStr(a)}`);
   }}]});

/* ═══ محور ═══ */
defTool({
 id:"axis", alias:"ax محور", label:"محور",
 hint:"انقر موضع المحور · Enter ينهي",
 opts:[
  {k:"dir",label:"الاتجاه",type:"sel",
   items:[["x","رأسي (حرف)"],["y","أفقي (رقم)"]],def:"x"}],
 steps:[
  {p:"موضع المحور (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const d=ov("axis","dir");
    const v=addAxis(d,(d==="x")?p[0]:p[1]);
    dirty(ctx);
    const A=(d==="y")?S.grid.ys:S.grid.xs;
    H.rep("ok",`محور ${axLabel(d,A.indexOf(v))} على `
     +`${m3(v)} م · ${A.length} محوراً`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const d=ov("axis","dir"), L=9e5;
  return [(d==="x")
   ? pvLine([g[0],g[1]-L],[g[0],g[1]+L],YEL)
   : pvLine([g[0]-L,g[1]],[g[0]+L,g[1]],YEL)];
 }});
