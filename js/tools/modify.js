/* ═══ أدوات التعديل ═══
   كلّها تعمل على تحديد قائم أو على عناصر تنقرها صراحةً.
   لا حدود ضمنية ولا «كل الجدران» — تحدّد الحدّ بيدك.
   الفتحات تتبع النسخ افتراضاً، ويمنعها خيار في الشريط،
   والسجل يذكر عددها دائماً.

   النقل والنسخ والدوران والمرآة تعمل على الأنواع كلّها.
   والإزاحة والقطع والقصّ والتمديد والشدّ واللحم للجدران وحدها. */
import {S,touch} from "../core/state.js";
import {m2,m3,mnum,clamp,norm,pt2,arrow,dim2} from "../core/units.js";
import {angOf} from "../core/coords.js";
import {wallById,wallLen,dir,MINW} from "../core/walls.js";
import {NAME,COLL,findById,pickEnts,delSay} from "../core/ents.js";
import {pickable} from "../core/layers.js";
import {FLD,readField,applyField,fldName} from "../core/batch.js";
import {grab,segsOf,moveAll,copyAll,rotP,rotateAll,mirrorAll,
        offsetWall,breakWall,trimWall,extendWall,
        stretchGrab,stretchApply,stretchPrev,
        arrayRect,arrayPolar,chamferPlan,chamferApply,
        weldPlan,weldApply,WHY} from "../core/modify.js";
import {defTool,H,T,rec,dirty,finish,pushSteps,nextStep,
        ov,ovLen,ovNum,ovOn,pvLine,pvRect,pvBand} from "./registry.js";

const GRN="#5cd98e", YEL="#ffd06b", RED="#ff6f6f";
const OPTS_OPEN={k:"opens",label:"انسخ الفتحات",type:"chk",def:1};

/* التحديد المطلوب — يُقرأ مرّة عند بدء الأداة */
function needSel(ctx,msg,wallOnly){
 let L=H.sel();
 if(wallOnly)L=L.filter(s=>s.k==="wall");
 if(!L.length){
  H.rep("wr",msg||(wallOnly
   ? "حدّد جدراناً أولاً ثم نفّذ الأداة"
   : "حدّد عناصر أولاً ثم نفّذ الأداة"));
  return false;
 }
 ctx.v.list=L;
 ctx.v.G=grab(L);
 if(!ctx.v.G.length){
  H.rep("wr","لا عنصر قابل للتحويل — المخفيّ والمقفل خارج");
  return false;
 }
 return true;
}
const sayR=(r,verb)=>{
 const P=[`${r.walls} عنصر`];
 if(r.opens)P.push(`${r.opens} فتحة`);
 H.rep("ok",`${verb} ${P.join(" و ")}`);
 (r.refused||[]).slice(0,6).forEach(x=>H.rep("wr",
  `  رُفض ${x} — التحويل يفسد قياسه`));
 if((r.refused||[]).length>6)
  H.rep("in",`  … و ${r.refused.length-6} رفضاً آخر`);
};
/* ═══ نقل ═══ */
/* هادمة: تحرّك ما هو مرسوم سلفاً */
defTool({
 id:"move", alias:"m انقل", label:"نقل",
 destruct:1,
 hint:"نقطة أساس ثم وجهة — المحدّد وحده يتحرّك",
 opts:[],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"نقطة الوجهة أو الإزاحة", base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const n=moveAll(ctx.v.G,p[0]-a[0],p[1]-a[1]);
    dirty(ctx);
    H.rep("ok",`نُقل ${n} عنصر ${pt2([p[0]-a[0],p[1]-a[1]])} م`
     +` · الفتحات تبعت جدرانها`);
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const o=[pvLine(a,g,YEL)];
  segsOf(ctx.v.G).forEach(s=>o.push(
   pvLine([s[0][0]+dx,s[0][1]+dy],[s[1][0]+dx,s[1][1]+dy],GRN)));
  return o;
 }});

/* ═══ نسخ ═══ */
/* ليست هادمة: تُنشئ نسخاً ولا تمسّ الأصل */
defTool({
 id:"copy", alias:"cp انسخ", label:"نسخ",
 hint:"نقطة أساس ثم نقطة لكل نسخة · Enter ينهي",
 opts:[
  {k:"n",label:"عدد النسخ",type:"num",def:1,hint:"لكل نقرة"},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"نقطة النسخة (Enter ينهي)", loop:1, base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const r=copyAll(ctx.v.G,p[0]-a[0],p[1]-a[1],
     Math.round(ovNum("copy","n"))||1, ovOn("copy","opens"));
    /* النسخ كائنات جديدة — تُسجَّل ليتراجع عنها Esc أو U */
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    sayR(r,"نُسخ");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const n=clamp(Math.round(ovNum("copy","n"))||1,1,20);
  const o=[pvLine(a,g,YEL)];
  for(let i=1;i<=n;i++)
   segsOf(ctx.v.G).forEach(s=>o.push(pvLine(
    [s[0][0]+dx*i,s[0][1]+dy*i],[s[1][0]+dx*i,s[1][1]+dy*i],GRN)));
  return o;
 }});

/* ═══ دوران ═══ */
function applyRot(ctx){
 const c=ctx.pts[0];
 const d=(ctx.v.a1||0)-(ctx.v.a0||0);
 const r=rotateAll(ctx.v.G,c,d,ovOn("rotate","copy"),
  ovOn("rotate","opens"));
 if(ovOn("rotate","copy"))
  (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
 else dirty(ctx);
 H.rep("ok",`دُوِّر ${r.walls} عنصر ${d.toFixed(1)}°`
  +(r.opens?` · ${r.opens} فتحة`:"")
  +(ovOn("rotate","copy")?" (نسخة)":""));
 (r.refused||[]).forEach(x=>H.rep("wr",
  `  رُفض ${x} — البُعد الأفقي أو الرأسي لا يدور إلا بمضاعفات 90°`));
}
defTool({
 id:"rotate", alias:"ro دور تدوير", label:"دوران",
 destruct:1,
 hint:"نقطة الدوران ثم الزاوية · R للزاوية المرجعية",
 opts:[
  {k:"copy",label:"نسخة",type:"chk",def:0},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الدوران"},
  {p:"الزاوية أو انقر الاتجاه", k:"a1", ang:1,
   opts:{r:{n:"مرجع",run(){
    pushSteps([
     {p:"الزاوية المرجعية",k:"a0",ang:1},
     {p:"الزاوية الجديدة",k:"a1",ang:1,each(c){applyRot(c)}}]);
    nextStep();
   }}},
   each(ctx){applyRot(ctx)}}],
 prev(ctx,g){
  if(!ctx.v.G||!ctx.pts.length||!g)return [];
  const c=ctx.pts[0];
  const a=angOf(c,g)-(ctx.v.a0||0);
  const o=[pvLine(c,g,YEL)];
  segsOf(ctx.v.G).forEach(s=>o.push(
   pvLine(rotP(s[0],c,a),rotP(s[1],c,a),GRN)));
  return o;
 }});

/* ═══ مرآة ═══ */
/* هادمة: «أبقِ الأصل» خيارٌ قد يُطفأ */
defTool({
 id:"mirror", alias:"mr مراه اعكس", label:"مرآة",
 destruct:1,
 hint:"نقطتان على محور المرآة · جهة فتح الأبواب تُقلَب",
 opts:[
  {k:"keep",label:"أبقِ الأصل",type:"chk",def:1},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"أول نقطة على محور المرآة"},
  {p:"ثاني نقطة على المحور", base:0,
   each(ctx,p){
    const keep=ovOn("mirror","keep");
    const r=mirrorAll(ctx.v.G,ctx.pts[0],p,keep,
     ovOn("mirror","opens"));
    if(keep)(r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    else dirty(ctx);
    H.rep("ok",`انعكس ${r.walls} عنصر`
     +(r.opens?` و ${r.opens} فتحة`:"")
     +(keep?" · بقي الأصل":""));
    (r.refused||[]).forEach(x=>H.rep("wr",
     `  رُفض ${x} — يحتاج محوراً قائماً أو قطرياً`));
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(P.length===1&&g)return [pvLine(P[0],g,YEL)];
  if(P.length<2)return [];
  const a=P[0], b=P[1];
  const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy);
  const o=[pvLine(a,b,YEL)];
  if(L<1)return o;
  const ux=dx/L, uy=dy/L;
  const M=p=>{
   const px=p[0]-a[0], py=p[1]-a[1], t=px*ux+py*uy;
   return [Math.round(a[0]+2*ux*t-px),Math.round(a[1]+2*uy*t-py)];
  };
  segsOf(ctx.v.G).forEach(s=>o.push(pvLine(M(s[0]),M(s[1]),GRN)));
  return o;
 }});

/* ═══ إزاحة ═══ */
/* ليست هادمة: تُنشئ موازياً ولا تمسّ الأصل */
defTool({
 id:"offset", alias:"of ازح موازي", label:"إزاحة",
 hint:"اختر جداراً ثم انقر الجهة · Enter ينهي",
 opts:[
  {k:"d",    label:"المسافة م",type:"len",def:"1"},
  {k:"clear",label:"صافية",    type:"chk",def:0,
   hint:"بين الوجهَين لا المحورين"},
  {k:"t",    label:"سماكة الجديد م",type:"len",def:"",
   hint:"فارغ = مثل الأصل"},
  OPTS_OPEN],
 steps:[
  {p:"اختر الجدار", ent:"wall", entName:"جدار", k:"w"},
  {p:"انقر الجهة (Enter ينهي)", base:"none", loop:1,
   each(ctx,p){
    const w=wallById(ctx.v.w.id);
    if(!w)throw new Error("الجدار غير موجود");
    const u=dir(w);
    if(!u)throw new Error("الجدار صفري");
    const sg=(u.nx*(p[0]-w.a[0])+u.ny*(p[1]-w.a[1]))>0?1:-1;
    const t=ovLen("offset","t");
    const r=offsetWall(w.id, ovLen("offset","d"), sg,
     ovOn("offset","clear"), t||null, null,
     ovOn("offset","opens"));
    rec(ctx,r.wall,"walls");
    /* السلسلة: الجديد يصير أصلاً للإزاحة التالية */
    ctx.v.w={k:"wall",id:r.wall.id};
    H.rep("ok",`${r.wall.id} موازٍ ${m2(r.d)} م `
     +`${ovOn("offset","clear")?"صافياً":"محورياً"}`
     +(r.opens?` · ${r.opens} فتحة`:"")
     +` · الأطراف لم تُلحَم — استعمل «لحم» إن أردت`);
   }}],
 prev(ctx,g){
  const s=ctx.v.w;
  if(!s||!g)return [];
  const w=wallById(s.id);
  if(!w)return [];
  const u=dir(w);
  if(!u)return [];
  const sg=(u.nx*(g[0]-w.a[0])+u.ny*(g[1]-w.a[1]))>0?1:-1;
  const t2=ovLen("offset","t")||w.t;
  const D=ovLen("offset","d")
   +(ovOn("offset","clear")?(w.t+t2)/2:0);
  const px=u.nx*sg*D, py=u.ny*sg*D;
  return [pvBand([w.a[0]+px,w.a[1]+py],[w.b[0]+px,w.b[1]+py],
   t2, GRN)];
 }});

/* ═══ قطع ═══ */
defTool({
 id:"break", alias:"br اقطع", label:"قطع",
 destruct:1,
 hint:"جدار ثم نقطة القطع · الفتحة العابرة تُحذَف ويُذكر عددها",
 opts:[],
 steps:[
  {p:"اختر الجدار", ent:"wall", entName:"جدار", k:"w"},
  {p:"نقطة القطع", base:"none", restart:1,
   each(ctx,p){
    const r=breakWall(ctx.v.w.id,p);
    rec(ctx,r.nw,"walls");
    H.rep(r.lost?"wr":"ok",
     `قُطع إلى ${m2(r.a)} + ${m2(r.b)} م → ${r.nw.id}`
     +(r.moved?` · ${r.moved} فتحة انتقلت`:"")
     +(r.lost?` · حُذفت ${r.lost} فتحة تعبر نقطة القطع`:""));
   }}],
 prev(ctx,g){
  const s=ctx.v.w;
  if(!s||!g)return [];
  const w=wallById(s.id);
  if(!w)return [];
  const u=dir(w);
  if(!u)return [];
  const t=clamp((g[0]-w.a[0])*u.ux+(g[1]-w.a[1])*u.uy,0,u.L);
  const q=[w.a[0]+u.ux*t, w.a[1]+u.uy*t];
  const h=Math.max(w.t,300);
  return [pvLine([q[0]+u.nx*h,q[1]+u.ny*h],
                 [q[0]-u.nx*h,q[1]-u.ny*h],RED)];
 }});

/* ═══ قصّ ═══ */
defTool({
 id:"trim", alias:"tr قص", label:"قصّ",
 destruct:1,
 hint:"حدّد الحدود بالنقر (Enter ينهي) ثم انقر الجزء المُزال",
 opts:[],
 steps:[
  {p:"انقر حدّاً (Enter ينهي التحديد)",
   ent:"wall", entName:"جدار", loop:1, min:1,
   each(ctx,hit){
    (ctx.v.cut=ctx.v.cut||[]).push(hit.id);
    H.rep("in",`${hit.id} حدّ قصّ · المجموع ${ctx.v.cut.length}`);
   }},
  {p:"انقر الجزء المراد إزالته",
   ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit,p){
    const r=trimWall(hit.id,ctx.v.cut,p);
    dirty(ctx);
    const AR={start:"من البداية",end:"من النهاية",
     mid:"وسطاً — صار جدارين"};
    if(r.nw)rec(ctx,r.nw,"walls");
    H.rep(r.lost?"wr":"ok",
     `قُصّ ${hit.id} ${AR[r.mode]} · ${m2(r.cut)} م`
     +(r.lost?` · حُذفت ${r.lost} فتحة في المقطوع`:""));
   }}]});

/* ═══ تمديد ═══ */
defTool({
 id:"extend", alias:"ex مدد وسع", label:"تمديد",
 destruct:1,
 hint:"حدّد الحدود بالنقر (Enter ينهي) ثم انقر الطرف المُمَدّ",
 opts:[],
 steps:[
  {p:"انقر حدّاً (Enter ينهي التحديد)",
   ent:"wall", entName:"جدار", loop:1, min:1,
   each(ctx,hit){
    (ctx.v.bnd=ctx.v.bnd||[]).push(hit.id);
    H.rep("in",`${hit.id} حدّ · المجموع ${ctx.v.bnd.length}`);
   }},
  {p:"انقر الطرف المراد تمديده",
   ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit,p){
    const r=extendWall(hit.id,ctx.v.bnd,p);
    dirty(ctx);
    H.rep("ok",`مُدّد ${hit.id} `
     +`${r.mode==="end"?"من النهاية":"من البداية"} · `
     +`+${m2(r.add)} م`);
   }}]});

/* ═══ شدّ ═══ */
defTool({
 id:"stretch", alias:"str شد", label:"شدّ",
 destruct:1,
 hint:"إطار يحوي الأطراف · ثم أساس ووجهة",
 opts:[],
 steps:[
  {p:"الزاوية الأولى لإطار الشدّ"},
  {p:"الزاوية المقابلة", base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const r={x0:Math.min(a[0],p[0]),y0:Math.min(a[1],p[1]),
             x1:Math.max(a[0],p[0]),y1:Math.max(a[1],p[1])};
    ctx.v.G=stretchGrab(r);
    if(!ctx.v.G.length)throw new Error("لا أطراف داخل الإطار");
    const both=ctx.v.G.filter(g=>g.a&&g.b).length;
    H.rep("in",`${ctx.v.G.length} جدار متأثّر`
     +(both?` · ${both} منها بطرفَيه (سينتقل كاملاً)`:""));
   }},
  {p:"نقطة الأساس", base:"none"},
  {p:"نقطة الوجهة أو الإزاحة", base:2,
   each(ctx,p){
    const b=ctx.pts[2];
    const n=stretchApply(ctx.v.G,p[0]-b[0],p[1]-b[1]);
    dirty(ctx);
    H.rep("ok",`شُدّ ${n} جدار ${pt2([p[0]-b[0],p[1]-b[1]])} م`
     +` · الفتحات لم تُمَسّ`);
   }}],
 prev(ctx,g){
  const P=ctx.pts;
  if(!g)return [];
  if(P.length===1)return [pvRect(P[0],g,GRN)];
  if(P.length===3&&ctx.v.G){
   const o=stretchPrev(ctx.v.G,g[0]-P[2][0],g[1]-P[2][1])
    .map(s=>pvLine(s[0],s[1],GRN));
   o.push(pvLine(P[2],g,YEL));
   return o;
  }
  return [];
 }});

/* ═══ لحم — معاينة ثم تأكيد ═══
   العقد يقول: لا يتحرّك إحداثيٌّ إلا بأمرك. فالخطة تُعرَض بالمليمتر
   قبل التنفيذ، والتنفيذ لا يتجاوزها. */
defTool({
 id:"weld", alias:"wl لحم", label:"لحم",
 destruct:1,
 hint:"يعرض ما سيتحرّك ثم ينتظر تأكيدك",
 opts:[{k:"tol",label:"التفاوت م",type:"len",def:"0.03"}],
 start(ctx){
  const L=H.sel().filter(s=>s.k==="wall");
  if(!L.length){
   H.rep("wr","حدّد جدرانَ اللحم أولاً — اللحم لا يعمل على الكل");
   return false;
  }
  const plan=weldPlan(L.map(s=>s.id), ovLen("weld","tol"));
  if(!plan.moves.length){
   H.rep("in",`لا طرف يحتاج لحماً عند تفاوت `
    +`${m2(plan.tol)} م · جرّب تفاوتاً أوسع`);
   return false;
  }
  ctx.v.plan=plan;
  H.rep("wr",`${plan.moves.length} طرف سيتحرّك — راجع القائمة `
   +`ثم Enter للتأكيد أو Esc للإلغاء:`);
  plan.moves.slice(0,24).forEach(m=>H.rep("in",
   `  ${m.id}/${m.end}  ${m2(m.d)} م  `
   +arrow(pt2(m.from), pt2(m.to))
   +`  ${WHY[m.why]||m.why}`));
  if(plan.moves.length>24)
   H.rep("in",`  … و ${plan.moves.length-24} طرفاً آخر`);
  return true;
 },
 steps:[
  {p:"Enter يؤكّد اللحم · Esc يلغي", confirm:1,
   each(ctx){
    const r=weldApply(ctx.v.plan);
    dirty(ctx);
    H.rep("ok",`لُحم ${r.moved} طرف`);
    if(r.short.length)
     H.rep("wr",`${r.short.length} جدار صار أقصر من الحدّ الأدنى `
      +`(${r.short.slice(0,6).join(" ")}) — لم يُحذَف، احذفه بيدك `
      +`إن شئت`);
   }}],
 prev(ctx){
  const P=ctx.v.plan;
  if(!P)return [];
  /* السهم من الموضع الحالي إلى المخطَّط — تراه قبل التنفيذ */
  return P.moves.map(m=>pvLine(m.from,m.to,RED));
 }});

/* ═══ كسرُ الركن — معاينةٌ ثم تأكيد ═══
   كاللحم: الخطّة تُعرَض بالمليمتر قبل التنفيذ، والتنفيذُ لا
   يتجاوزها. وانقر كلَّ جدارٍ في الجهة التي تريد إبقاءها. */
defTool({
 id:"chamfer", alias:"chm شطف كسر_الركن", label:"كسر الركن",
 destruct:1,
 hint:"انقر الجدارين في جهتهما المُبقاة — تُعرَض الخطّة ثم تنتظر",
 opts:[
  {k:"d", label:"المسافة م",       type:"len", def:"0.5"},
  {k:"d2",label:"مسافة الثاني م",  type:"len", def:"",
   hint:"فارغ = مثل الأولى"}],
 steps:[
  {p:"انقر الجدار الأول في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w1",
   each(ctx,hit,p){ctx.v.p1=p}},
  {p:"انقر الجدار الثاني في جهته المُبقاة",
   ent:"wall", entName:"جدار", k:"w2",
   each(ctx,hit,p){
    const d=ovLen("chamfer","d");
    const pl=chamferPlan(ctx.v.w1.id,hit.id,d,
     ovLen("chamfer","d2")||d, ctx.v.p1, p);
    ctx.v.plan=pl;
    H.rep("wr","الخطّة — راجعها ثم Enter للتأكيد أو Esc للإلغاء:");
    [pl.a,pl.b].forEach(x=>H.rep("in",
     `  ${x.id}/${x.end}  ${m3(x.d)} م من الركن  `
     +arrow(pt2(x.from),pt2(x.to))
     +(x.grow>0.5?`  (يُمَدّ ${m3(x.grow)} م ليبلغ الركن)`:"")
     +`  يبقى ${m3(x.remain)} م`));
    H.rep("in",`  الضلعُ الجديد ${m3(pl.len)} م · الزاوية `
     +`${pl.ang}° · سماكتُه ${m3(pl.t)} م مركزيةً`);
   }},
  {p:"Enter يؤكّد كسرَ الركن · Esc يلغي", confirm:1,
   each(ctx){
    const r=chamferApply(ctx.v.plan);
    dirty(ctx);
    rec(ctx,r.wall,"walls");
    H.rep(r.lost?"wr":"ok",
     `${r.wall.id} ضلعُ الكسر ${m3(r.len)} م`
     +(r.lost?` · حُذفت ${r.lost} فتحة في المقطوع`:"")
     +` · الأطرافُ لم تُلحَم — استعمل «لحم» إن أردت`);
   }}],
 prev(ctx,g){
  const draw=q=>[pvLine(q.a.to,q.b.to,GRN),
   pvLine(q.a.from,q.a.to,RED), pvLine(q.b.from,q.b.to,RED)];
  if(ctx.v.plan)return draw(ctx.v.plan);
  /* قبل النقرة الثانية: الخطّةُ تُحسَب من الجدار تحت المؤشّر،
     فترى الركنَ قبل أن تنقره. والمتعذّرُ لا يُرسَم. */
  if(!ctx.v.w1||!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="wall"||h.id===ctx.v.w1.id)return [];
  const d=ovLen("chamfer","d");
  return draw(chamferPlan(ctx.v.w1.id,h.id,d,
   ovLen("chamfer","d2")||d, ctx.v.p1, g));
 }});

/* ═══ المصفوفة المستطيلة ═══
   الأصلُ خليّةٌ في الشبكة، والتباعدُ من نقرتَيك لا من حقلٍ — فتراه
   قبل أن يقع. وتعمل على ما يعمل عليه «نسخ»: كلُّ الأنواع، والفتحةُ
   تتبع جدارها ولا تُنسَخ وحدها. */
defTool({
 id:"array", alias:"arr مصفوفه", label:"مصفوفة",
 hint:"أساسٌ ثم ركنُ الخليّة · الصفوفُ والأعمدةُ من الشريط",
 opts:[
  {k:"nx",label:"الأعمدة",type:"num",def:3},
  {k:"ny",label:"الصفوف", type:"num",def:1},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"نقطة الأساس"},
  {p:"ركن الخليّة (تباعد X و Y)", base:0,
   each(ctx,p){
    const a=ctx.pts[0];
    const r=arrayRect(ctx.v.G,
     Math.round(ovNum("array","nx")), Math.round(ovNum("array","ny")),
     p[0]-a[0], p[1]-a[1], ovOn("array","opens"));
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    H.rep("ok",`${dim2(r.nx,r.ny)} · ${r.cells} خليّةً منسوخة · `
     +`${r.walls} عنصر`+(r.opens?` و ${r.opens} فتحة`:""));
    if(ctx.v.G.some(x=>x.s.k==="col"))
     H.rep("in","  وأوسامُ الأعمدة لا تُنسَخ — "
      +"استعمل «أعد الترقيم» على المحدَّد");
   }}],
 prev(ctx,g){
  if(!ctx.pts.length||!g)return [];
  const a=ctx.pts[0], dx=g[0]-a[0], dy=g[1]-a[1];
  const NX=clamp(Math.round(ovNum("array","nx"))||1,1,100);
  const NY=clamp(Math.round(ovNum("array","ny"))||1,1,100);
  const S2=segsOf(ctx.v.G);
  const k=Math.max(120,Math.hypot(dx,dy)*0.05);
  const o=[pvLine(a,g,YEL)];
  let budget=700;                   /* المعاينةُ في كل إطار */
  for(let j=0;j<NY&&budget>0;j++)for(let i=0;i<NX&&budget>0;i++){
   if(!i&&!j)continue;
   const px=a[0]+dx*i, py=a[1]+dy*j;
   /* صليبٌ لكل خليّة: يُرى ولو كان المحدَّد بلا مسارات */
   o.push(pvLine([px-k,py],[px+k,py],YEL));
   o.push(pvLine([px,py-k],[px,py+k],YEL));
   budget-=2;
   S2.forEach(s=>{
    if(budget--<=0)return;
    o.push(pvLine([s[0][0]+dx*i,s[0][1]+dy*j],
                  [s[1][0]+dx*i,s[1][1]+dy*j],GRN));
   });
  }
  return o;
 }});

/* ═══ المصفوفة القطبية ═══
   نقرةٌ واحدةٌ: المركز. والعددُ والزاويةُ من الشريط، والخطوةُ
   تُقال في السجلّ فلا تُخمَّن. */
defTool({
 id:"arraypolar", alias:"arrp مصفوفه_قطبيه", label:"مصفوفة قطبية",
 hint:"انقر مركز الدوران — العددُ والزاويةُ من الشريط",
 opts:[
  {k:"n",    label:"عدد التكرارات",     type:"num",def:6},
  {k:"total",label:"الزاوية الإجمالية °",type:"num",def:360,
   hint:"٣٦٠ توزّع دورةً كاملة · وما دونها تمتدّ من الأصل إلى "
    +"آخر نسخة"},
  {k:"rot",  label:"دوّر النسخ",type:"chk",def:1,
   hint:"مطفأً يدور الموضعُ وتبقى الهيئة"},
  OPTS_OPEN],
 start(ctx){return needSel(ctx)},
 steps:[
  {p:"مركز الدوران",
   each(ctx,p){
    const r=arrayPolar(ctx.v.G,p, ovNum("arraypolar","total"),
     Math.round(ovNum("arraypolar","n")),
     ovOn("arraypolar","rot"), ovOn("arraypolar","opens"));
    (r.made||[]).forEach(s=>rec(ctx,{id:s.id},COLL[s.k]));
    H.rep("ok",`${r.n} تكراراً حول ${pt2(p)} م · الخطوة `
     +`${r.step}°${r.full?" (دورةٌ كاملة)":""} · ${r.walls} عنصر`
     +(r.opens?` و ${r.opens} فتحة`:""));
    (r.refused||[]).slice(0,6).forEach(x=>H.rep("wr",
     `  تُخطّي ${x} — لا يدور إلّا بمضاعفات 90°`));
    if((r.refused||[]).length>6)
     H.rep("in",`  … و ${r.refused.length-6} تخطّياً آخر`);
    if(ctx.v.G.some(x=>x.s.k==="col"))
     H.rep("in","  وأوسامُ الأعمدة لا تُنسَخ — "
      +"استعمل «أعد الترقيم» على المحدَّد");
   }}],
 prev(ctx,g){
  if(!g||!ctx.v.G)return [];
  const N=clamp(Math.round(ovNum("arraypolar","n"))||2,2,200);
  const T=ovNum("arraypolar","total")||0;
  const full=Math.abs(Math.abs(T)-360)<0.05;
  const st=T/(full?N:Math.max(1,N-1));
  const rot=ovOn("arraypolar","rot");
  const S2=segsOf(ctx.v.G);
  const o=[pvLine([g[0]-300,g[1]],[g[0]+300,g[1]],YEL),
           pvLine([g[0],g[1]-300],[g[0],g[1]+300],YEL)];
  let budget=700;
  for(let k=1;k<N&&budget>0;k++){
   const a=st*k;
   S2.forEach(s=>{
    if(budget--<=0)return;
    if(rot){
     o.push(pvLine(rotP(s[0],g,a),rotP(s[1],g,a),GRN));
     return;
    }
    /* بلا دوران: الموضعُ يدور والهيئةُ تبقى — والمرجعُ منتصفُ
       المسار، وهو مركزُ صندوقه في الجدار. */
    const an=[(s[0][0]+s[1][0])/2,(s[0][1]+s[1][1])/2];
    const q=rotP(an,g,a);
    const ddx=q[0]-an[0], ddy=q[1]-an[1];
    o.push(pvLine([s[0][0]+ddx,s[0][1]+ddy],
                  [s[1][0]+ddx,s[1][1]+ddy],GRN));
   });
  }
  return o;
 }});

/* ═══ مطابقة الخصائص ═══
   تقرأ حقول المصدر بـ readField ثم تكتبها بـ applyField، فتنالها
   المُثبِّتات نفسها: ما لا يملكه الهدف يُتخطّى، وما يُرفَض يُذكَر
   بسببه — لا كتابة عمياء.
   النصّ البديل للبُعد لا يُنسَخ افتراضاً: نسخُ رقمٍ يدويّ إلى بُعدٍ
   آخر يعرض مقاساً كاذباً بهيئة يقين. */
defTool({
 id:"match", alias:"ma مطابقه انسخ_الخصائص", label:"مطابقة",
 destruct:1,
 hint:"انقر المصدر ثم الأهداف من نوعه · Enter ينهي",
 opts:[{k:"txt",label:"انسخ النصّ البديل",type:"chk",def:0,
  hint:"للأبعاد — مطفأ لئلّا يُنسَخ رقمٌ يدويّ"}],
 steps:[
  {p:"انقر العنصر المصدر", ent:1, k:"src",
   each(ctx,hit){
    const K=hit.k;
    if(!FLD[K])
     throw new Error(`${NAME[K]||K} بلا حقول تُنسَخ`);
    const drop=ovOn("match","txt")?[]:["txt"];
    const F=[];
    FLD[K].forEach(f=>{
     if(drop.includes(f.k))return;
     const r=readField(K,[hit],f.k);
     if(!r.own)return;
     /* الطول يُقرأ مليمتراً ويُكتَب متراً — M() يفهم الرقم متراً */
     F.push({k:f.k,n:f.n,
      raw:(f.t==="len")?mnum(r.value):r.value});
    });
    if(!F.length)throw new Error(`${hit.id} بلا حقول يملكها`);
    ctx.v.kind=K; ctx.v.flds=F;
    H.rep("in",`المصدر ${hit.id} ${NAME[K]||K} · ${F.length} حقلاً: `
     +F.map(f=>f.n).join(" · "));
   }},
  {p:"انقر الهدف (Enter ينهي)", ent:1, loop:1,
   each(ctx,hit){
    const K=ctx.v.kind;
    if(hit.k!==K)
     throw new Error(`المصدر ${NAME[K]||K} — انقر ${NAME[K]||K} `
      +`مثله`);
    if(hit.id===ctx.v.src.id)
     throw new Error("هذا هو المصدر نفسه");
    let done=0;
    const ref=[];
    ctx.v.flds.forEach(f=>{
     try{
      const r=applyField(K,[hit],f.k,f.raw);
      if(r.done)done++;
      r.refused.forEach(x=>ref.push(`${f.n}: ${x.msg}`));
     }catch(e){ref.push(`${f.n}: ${e.message}`)}
    });
    if(done)dirty(ctx);
    H.rep(ref.length?"wr":"ok",
     `${hit.id} ← ${ctx.v.src.id} · ${done} من `
     +`${ctx.v.flds.length} حقلاً`);
    ref.slice(0,5).forEach(m=>H.rep("er","  "+m));
    if(ref.length>5)H.rep("in",`  … و ${ref.length-5} رفضاً آخر`);
   }}]});

/* ═══ قسمة الجدار ═══
   قطعٌ متكرّر عند نقاطٍ محسوبة على مسار الأصل — بعقد breakWall
   نفسها: الفتحة العابرة نقطة القطع تُحذَف ويُذكَر عددها، والباقية
   تنتقل بموضعها معادَ القياس من البداية الجديدة. */
defTool({
 id:"divide", alias:"dv اقسم قسمه", label:"قسمة",
 destruct:1,
 hint:"اختر جداراً — يُقسَم أجزاءً متساوية · Enter ينهي",
 opts:[{k:"n",label:"عدد الأجزاء",type:"num",def:2}],
 steps:[
  {p:"اختر الجدار المقسوم", ent:"wall", entName:"جدار", loop:1,
   each(ctx,hit){
    const n=clamp(Math.round(ovNum("divide","n"))||2,2,40);
    const w=wallById(hit.id);
    if(!w)throw new Error("الجدار غير موجود");
    const u=dir(w);
    if(!u)throw new Error("الجدار صفري");
    const seg=u.L/n;
    if(seg<MINW)
     throw new Error(`الجزء ${m3(seg)} م — الأدنى ${m3(MINW)} م · `
      +`الأقصى ${Math.floor(u.L/MINW)} جزءاً`);
    const A=w.a.slice();
    let cur=hit.id, lost=0, moved=0;
    for(let i=1;i<n;i++){
     const r=breakWall(cur,
      [Math.round(A[0]+u.ux*seg*i), Math.round(A[1]+u.uy*seg*i)]);
     rec(ctx,r.nw,"walls");
     lost+=r.lost; moved+=r.moved;
     cur=r.nw.id;
    }
    H.rep(lost?"wr":"ok",
     `قُسِم ${hit.id} إلى ${dim2(n,m3(seg),"م")}`
     +(moved?` · ${moved} فتحة انتقلت`:"")
     +(lost?` · حُذفت ${lost} فتحة تعبر نقاط القطع`:"")
     +` · الأطراف لم تُلحَم`);
   }}],
 prev(ctx,g){
  if(!g)return [];
  const h=H.hit(g[0],g[1]);
  if(!h||h.k!=="wall")return [];
  const w=wallById(h.id), u=w&&dir(w);
  if(!u)return [];
  const n=clamp(Math.round(ovNum("divide","n"))||2,2,40);
  const seg=u.L/n, t=Math.max(w.t,300), o=[];
  const c=(seg<MINW)?RED:GRN;
  for(let i=1;i<n;i++){
   const q=[w.a[0]+u.ux*seg*i, w.a[1]+u.uy*seg*i];
   o.push(pvLine([q[0]+u.nx*t,q[1]+u.ny*t],
                 [q[0]-u.nx*t,q[1]-u.ny*t],c));
  }
  return o;
 }});

/* ═══ تحديد بالمعرّف ═══
   أدوات التعديل تقرأ تحديداً قائماً، ولم يكن للتحديد طريقٌ إلا
   الفأرة. هذه تُكملها: تحدّد بالكتابة ثم تنقل أو تنسخ. */
/* ليست هادمة: تقرأ وتكتب في التحديد ولا تمسّ هندسةً */
defTool({
 id:"sel", alias:"se اختر تحديد", label:"تحديد بالمعرّف",
 hint:"W3 · O5 · -K2 يزيل · «الكل» · Enter ينهي",
 opts:[],
 steps:[{p:"معرّف عنصر (Enter ينهي)", text:1, loop:1,
  each(ctx,tok){
   const t=String(tok||"").trim();
   if(!t)return;
   if(/^(الكل|كلها|all)$/.test(norm(t))){
    const L=pickEnts();
    H.setSel(L);
    H.rep("ok",`${L.length} عنصر محدَّد`);
    return;
   }
   const neg=/^-/.test(t);
   const f=findById(t.replace(/^[-+]/,""));
   if(!f)throw new Error(`لا عنصر بالمعرّف «${t}»`);
   if(!pickable(f))throw new Error(`${f.id} مخفيّ أو مقفل`);
   const L=H.sel().filter(x=>!(x.k===f.k&&x.id===f.id));
   if(!neg)L.push(f);
   H.setSel(L);
   H.rep("in",`${neg?"أُزيل":"أُضيف"} ${f.id} `
    +`${NAME[f.k]||f.k} · المجموع ${L.length}`);
  }}]});

/* ═══ حذف ═══
   كان الحذف مفتاحاً في app.js وفعلاً في القائمة السياقية وحدهما:
   لا سطر إدخال يحذف، ولا خطّة مساعدٍ تحذف، ولا لوحة أوامر تجده.
   إدخاله السجلّ يُنيله ما ينال بقيّة الأوامر — اسمٌ يُكتَب، وعلَمٌ
   هادم تقرؤه البوّابة، وموضعٌ في الشريط.

   والتنفيذ يُفوَّض إلى delSel نفسه: لا منطق حذفٍ ثانٍ يتخلّف عن
   الأول. وهو يمرّ بـ edit() فيدير لقطته وتاريخه — فلا dirty(ctx)
   هنا، وإلّا دُفعت خطوتا تراجعٍ لعمليةٍ واحدة. */
defTool({
 id:"del", alias:"احذف امسح حذف", label:"حذف",
 destruct:1,
 hint:"يحذف التحديد القائم · Ctrl+Z يستعيده",
 opts:[],
 start(ctx){
  if(!H.sel().length){
   H.rep("wr","حدّد عناصر أولاً — الحذف يقع على التحديد");
   return false;
  }
  const r=H.del();
  if(!r){
   H.rep("wr","لم يُحذف شيء — المخفيّ والمقفل خارج التحديد");
   return false;
  }
  H.rep("ok","حُذف "+delSay(r)
   +(r.skipped?` · تُخطّي ${r.skipped}`:""));
  return false;                    /* أمر لحظي — لا خطوات */
 },
 steps:[]});
