/* ═══ الحالة · التاريخ ═══
   لا كاش استنتاج هنا: VER عدّاد نسخة يُبطِل كاش العرض وحده.
   كل تعديل يمرّ بـ edit() فيصير ذرّياً وله خطوة تراجع واحدة.
   الطبقات جدولٌ حيّ في S.layers (انظر core/layers.js) — بياناتُ
   مشروعٍ لا تفضيلَ نافذة، لأن إخفاء طبقةٍ يغيّر ما يُصدَّر. */
import {clamp,deg,setIdc,idc,bumpIdc,idNum} from "./units.js";
import * as Store from "../io/store.js";
import {DEFLAYS} from "./laydef.js";
export {LAYERS} from "./laydef.js";   /* توافقٌ لمن كان يستورده هنا */
/* دورةٌ ظاهرية (layers.js يستورد S وVER وtouch من هنا) مقبولةٌ في
   وحدات ES: normLays لا تُنادى وقت التحميل بل من ensureShape —
   أي بعد اكتمال الوحدتين. */
import * as LY from "./layers.js";

export const LSK=Store.LSK;   /* أُبقي للتوافق مع من يستورده */
export const saveMode=()=>Store.mode();

export const COLLS=["walls","opens","areas","dims","chains","anno",
 "cols","fixt","stairs"];
const KEYS=["meta"].concat(COLLS,
 ["grid","opt","rb","os","pol","sheet","title","layers","layst","ref",
  "blocks"]);

export const DEF=()=>({
 meta:{name:"PLAN",scale:100,txtMM:2.2,
  tExt:250,tInt:150,tLow:200,lowH:1000,wallH:3000,
  snap:50,dimDec:2,dimTick:"slash",north:0,
  date:new Date().toISOString().slice(0,10)},
 walls:[],opens:[],areas:[],dims:[],chains:[],anno:[],
  cols:[],fixt:[],stairs:[],blocks:[],
 grid:{xs:[],ys:[]},
 opt:{joins:1,fill:"none",colSolo:0},
 rb:{ortho:1,snap:1,polar:0,grips:1,ends:1,grid:1,gsnap:1,paths:1,
  dyn:1},
 os:{end:1,mid:1,int:1,per:1,near:0,nod:1,ref:1},
 pol:{inc:15,extra:[]},
 sheet:{on:0,size:"A3",orient:"l",margin:12,tb:1,north:1,
  cx:null,cy:null},
 title:{proj:"",owner:"",loc:"",sheet:"A-101",rev:"0",by:""},
 /* الطبقات بياناتُ مشروع: تُحفَظ وتدخل التاريخ لأنها تغيّر ما
    يُصدَّر — لا تفضيلَ نافذة. وS.lay القديم يُطوى فيها بالهجرة. */
 layers:DEFLAYS(),
 layst:{},
 ref:{name:"",units:"",uf:1,enc:"",guessed:0,
  tr:{k:1,rot:0,dx:0,dy:0},ents:[],src:{},off:{},
  skip:{},trunc:0,approx:{}}
});
export const S=DEF();
let blockSeq=1;

/* ═══ ثلاث نسخ ═══
   n  عامّة: تتقدّم بكل تعديل. يقرأها كاش المشهد والفهرس المكاني —
      وهما يتبعان كل شيء يُرسَم أو يُصاب.
   g  هندسية: الجدران والأعمدة وخيار الدمج. وهي وحدها ما يُبطِل
      polyBool وحلقات المناطق وشبكة الأطراف وشبكة المراسي
      وبصمات المناطق وجدول الطبقات.
   o  الفتحات: تُطرَح من الأجسام ولا تُبطِل الحلقات.

   والسبب: سحب مقبض بُعدٍ كان يعيد بناء اتحاد ألف مضلّعٍ في كل
   إطار، وstampOf لكل منطقة، وشبكتَي الأطراف والمراسي، وكاش
   الألوان. والفصل يجعل الكلفة تتبع ما تغيّر فعلاً.

   وtouch يُقدّم n وg معاً بقصد — لا n وحده كما يبدو أوّل النظر:
   سبعةُ مواضع تُعدّل هندسةً بـtouch (applyField · اللوحة المفردة ·
   stretchApply · edit · finish · ops · trace)، فلو كان الافتراض
   سريعاً لأخرج أحدُها مشهداً قديماً. والافتراض الآمن يجعل النسيان
   يُكلِّف أداءً لا صحّة، والإعلان في المواضع الحارّة وحدها:
   سحبُ المقابض وبنّاؤو المجموعات. */
export const VER={n:0,g:0,o:0};
S.__ver=0;
export const touch    =()=>{VER.n++; VER.g++; S.__ver=VER.n};
export const touchGeom=()=>{VER.n++; VER.g++; S.__ver=VER.n};
export const touchOpen=()=>{VER.n++; VER.o++; S.__ver=VER.n};
export const touchView=()=>{VER.n++;          S.__ver=VER.n};
export const txtH=()=>Math.max(1,S.meta.txtMM*Math.max(1,S.meta.scale));
const PT=p=>[Math.round((p&&+p[0])||0),Math.round((p&&+p[1])||0)];

/* ═══ التطبيع الدفاعي ═══
   يُصلح ملفّاً محرَّراً يدوياً، ولا يمسّ هندسةً رسمها المستخدم. */
export function ensureShape(){
 /* الطبقات أوّلاً: يقرأها العدّ والتصفية وresolve، فلا يجوز أن
    يسبقها شيء */
 LY.normLays();
 const d=DEF();
 S.meta=Object.assign(d.meta,S.meta||{});
 S.meta.scale=clamp(parseInt(S.meta.scale,10)||100,1,5000);
 S.meta.txtMM=clamp(+S.meta.txtMM||2.2,0.5,20);
 S.meta.tExt=Math.max(50,+S.meta.tExt||250);
 S.meta.tInt=Math.max(50,+S.meta.tInt||150);
 S.meta.tLow=Math.max(50,+S.meta.tLow||200);
 S.meta.wallH=clamp(+S.meta.wallH||3000,1500,8000);
 S.meta.lowH=clamp(Math.round(+S.meta.lowH||1000),200,S.meta.wallH-200);
 S.meta.snap=clamp(+S.meta.snap||50,1,5000);
 S.meta.dimDec=clamp(parseInt(S.meta.dimDec,10),0,3);
 if(!isFinite(S.meta.dimDec))S.meta.dimDec=2;
 if(!/^(slash|arrow)$/.test(S.meta.dimTick))S.meta.dimTick="slash";
 /* زاوية الشمال: بياناتُ مشروعٍ لا تفضيلَ عرض — تُصدَّر مع اللوحة */
 S.meta.north=deg(+S.meta.north||0);

 COLLS.forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
  /* ═══ مثيلات العناصر ═══
     الكتلة تعريفٌ ثابت خارج الحالة، والمثيل بيانات مشروع صريحة. */
  if(!Array.isArray(S.blocks))S.blocks=[];
  S.blocks=S.blocks.filter(b=>b&&typeof b.block==="string"
   &&isFinite(+b.x)&&isFinite(+b.y));
  S.blocks.forEach(b=>{
   b.x=+b.x||0; b.y=+b.y||0;
   b.rot=isFinite(+b.rot)?+b.rot:0;
   b.scale=(isFinite(+b.scale)&&+b.scale>0)?+b.scale:1;
   b.mirror=b.mirror?1:0;
   b.layer=String(b.layer==null?"0":b.layer).slice(0,80)||"0";
   if(b.id==null)b.id="b"+(++blockSeq);
  });
 S.grid=Object.assign({xs:[],ys:[]},S.grid||{});
 ["xs","ys"].forEach(k=>{
  if(!Array.isArray(S.grid[k]))S.grid[k]=[];
  S.grid[k]=[...new Set(S.grid[k].filter(v=>isFinite(v))
   .map(v=>Math.round(v)))].sort((a,b)=>a-b);
 });
 S.opt=Object.assign(d.opt,S.opt||{});
 if(!/^(none|hatch|solid)$/.test(S.opt.fill))S.opt.fill="none";
 S.opt.joins=S.opt.joins?1:0;
 S.opt.colSolo=S.opt.colSolo?1:0;
 S.rb=Object.assign(d.rb,S.rb||{});
 /* المفاتيح الجديدة تأخذ افتراضها من d.rb — فالملفّ القديم
    يبقى على سلوكه: شبكةٌ تُرسَم وتُلتقَط ومساراتٌ تُرى */
 ["grid","gsnap","paths","dyn"].forEach(k=>{S.rb[k]=S.rb[k]?1:0});
 S.os=Object.assign(d.os,S.os||{});
 S.os.ref=(S.os.ref==null)?1:(S.os.ref?1:0);
 S.pol=Object.assign(d.pol,S.pol||{});
 S.pol.inc=clamp(parseInt(S.pol.inc,10)||15,1,90);
 if(!Array.isArray(S.pol.extra))S.pol.extra=[];
 if(S.rb.polar&&S.rb.ortho)S.rb.ortho=0;

 /* ═══ الجدران ═══ */
 const WT={ext:1,int:1,low:1}, AL={c:1,l:1,r:1};
 S.walls=S.walls.filter(w=>w&&Array.isArray(w.a)&&Array.isArray(w.b)
  &&isFinite(w.a[0])&&isFinite(w.b[1]));
 S.walls.forEach(w=>{
  if(!WT[w.type])w.type="int";
  if(!AL[w.align])w.align="c";
  const df=(w.type==="ext")?S.meta.tExt
   :((w.type==="low")?S.meta.tLow:S.meta.tInt);
  w.t=clamp(Math.round(+w.t||df),50,1000);
  w.a=PT(w.a); w.b=PT(w.b);
  if(w.type==="low")w.h=Math.max(200,Math.round(+w.h||S.meta.lowH));
  else delete w.h;
 });
 /* ═══ الفتحات ═══
    تُحذف اليتيمة — حاضنها زال. ولا يُقلَّم موضعها:
    الخارجة عن مدى جدارها تُبلَّغ ولا تُصلَح.
    والحدود العليا هي حدود المُثبِّتات نفسها (batch.js): قيدٌ
    بمنفذَين يُخرج قيمةً لا تُرى ثم تمنع تعديل جدارها. */
 const OKV={door:1,double:1,sliding:1,window:1,fixed:1,
  opening:1,arch:1,niche:1};
 const WMAP=new Map(S.walls.map(w=>[w.id,w]));
 S.opens=S.opens.filter(o=>o&&WMAP.has(o.wall));
 S.opens.forEach(o=>{
  if(!OKV[o.kind])o.kind="door";
  o.s=Math.round(+o.s||0);
  o.w=Math.max(100,Math.round(+o.w||900));
  o.h=clamp(Math.round(+o.h||2100),100,6000);
  o.sill=clamp(Math.round(+o.sill||0),0,6000);
  o.hinge=(o.hinge==="end")?"end":"start";
  o.swing=(o.swing==="right")?"right":"left";
  if(o.pan!=null)o.pan=clamp(Math.round(o.pan),1,6);
  if(o.dep!=null){
   /* الجدار موجودٌ يقيناً: اليتيمة حُذفت قبل هذا السطر */
   const W2=WMAP.get(o.wall);
   const mx=Math.max(20,((W2&&W2.t)||150)-40);
   o.dep=clamp(Math.round(o.dep),20,mx);
  }
  if(o.face)o.face=(o.face==="r")?"r":"l";
 });
 /* ═══ المناطق ═══
    حلقات مخزَّنة. لا تُعاد حساباً ولا تُقلَّم — الاتّساق
    يُبلَّغ عنه بالبصمة في areas.js، ولا يُصلَح خلسة. */
 S.areas=S.areas.filter(a=>a&&Array.isArray(a.ring));
 S.areas.forEach(a=>{
  a.ring=a.ring
   .filter(p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]))
   .map(PT);
  a.name=String(a.name==null?"":a.name).slice(0,40);
  a.stamp=String(a.stamp||"");
  a.showArea=a.showArea?1:0;
  if(!/^(none|tint|hatch)$/.test(a.fill))a.fill="tint";
  if(a.lp&&isFinite(a.lp[0])&&isFinite(a.lp[1]))a.lp=PT(a.lp);
  else delete a.lp;
 });
 S.areas=S.areas.filter(a=>a.ring.length>2);

 /* ═══ الأبعاد ═══
    نقطتان صريحتان وموضعُ خطٍّ صريح. لا ترتبط بجدار،
    فلا تُحذَف ولا تُزحَف — «المعلَّق» يُبلَّغ عنه في dims.js. */
 S.dims=S.dims.filter(x=>x&&Array.isArray(x.a)&&Array.isArray(x.b)
  &&isFinite(x.a[0])&&isFinite(x.b[1]));
 S.dims.forEach(x=>{
  if(!/^(h|v|al)$/.test(x.kind))x.kind="h";
  x.a=PT(x.a); x.b=PT(x.b);
  x.pos=Math.round(+x.pos||0);
  if(x.txt!=null){
   x.txt=String(x.txt).slice(0,24);
   if(!x.txt)delete x.txt;
  }
 });
 /* ═══ السلاسل ═══ قيَم مكتوبة — لا تُطابَق ولا تُصحَّح */
 S.chains=S.chains.filter(c=>c&&Array.isArray(c.base)
  &&Array.isArray(c.vals));
 S.chains.forEach(c=>{
  c.axis=(c.axis==="v")?"v":"h";
  c.base=PT(c.base);
  c.pos=Math.round(+c.pos||0);
  c.vals=c.vals.map(v=>Math.max(10,Math.round(+v||0))).slice(0,60);
  c.total=c.total?1:0;
 });
 S.chains=S.chains.filter(c=>c.vals.length);

 /* ═══ النصوص والقوائد والمناسيب ═══ */
 const AKV={text:1,lead:1,level:1};
 S.anno=S.anno.filter(a=>a&&AKV[a.kind]);
 S.anno.forEach(a=>{
  if(a.kind==="lead"){
   a.pts=(Array.isArray(a.pts)?a.pts:[])
    .filter(p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]))
    .map(PT);
  }else{
   a.x=Math.round(+a.x||0);
   a.y=Math.round(+a.y||0);
  }
  if(a.kind==="level"){
   a.z=Math.round(+a.z||0);
   a.pre=String(a.pre==null?"":a.pre).slice(0,8);
  }else{
   a.s=String(a.s==null?"":a.s).slice(0,120);
   a.hm=clamp(+a.hm||1,0.4,6);
  }
  if(a.kind==="text"){
   a.rot=deg(+a.rot||0);
   if(!/^(bl|bc|ml|mc)$/.test(a.al))a.al="bc";
  }
 });
 S.anno=S.anno.filter(a=>(a.kind==="lead")
  ? (a.pts.length>1&&a.s)
  : (a.kind==="level"?true:!!a.s));

 /* ═══ الأعمدة ═══ الدمج عرضٌ لا تعديل، فلا يُخزَّن منه شيء */
 S.cols=S.cols.filter(c=>c&&isFinite(c.x)&&isFinite(c.y));
 S.cols.forEach(c=>{
  c.kind=(c.kind==="circ")?"circ":"rect";
  c.x=Math.round(c.x); c.y=Math.round(c.y);
  c.w=clamp(Math.round(+c.w||300),100,4000);
  c.h=(c.kind==="circ")?c.w:clamp(Math.round(+c.h||c.w),100,4000);
  c.rot=(c.kind==="circ")?0:deg(+c.rot||0);
  if(!/^(conc|steel|stone)$/.test(c.type))c.type="conc";
  if(c.tag!=null){
   c.tag=String(c.tag).slice(0,10);
   if(!c.tag)delete c.tag;
  }
 });
 /* ═══ الأدوات الصحية ═══ إحداثيات صريحة — لا رابطة تُحفَظ */
 const FKV={wc:1,bidet:1,ur:1,lav:1,sink:1,shower:1,tub:1,wm:1,fd:1};
 S.fixt=S.fixt.filter(f=>f&&FKV[f.kind]
  &&isFinite(f.x)&&isFinite(f.y));
 S.fixt.forEach(f=>{
  f.x=Math.round(f.x); f.y=Math.round(f.y);
  f.rot=deg(+f.rot||0);
  f.w=clamp(Math.round(+f.w||400),80,4000);
  f.d=clamp(Math.round(+f.d||400),80,4000);
  if(f.mir)f.mir=1; else delete f.mir;
 });
 /* ═══ الدرج ═══ a و b و n هي الأصل، وما عداها مشتقّ */
 S.stairs=S.stairs.filter(s=>s&&Array.isArray(s.a)&&Array.isArray(s.b)
  &&isFinite(s.a[0])&&isFinite(s.b[1]));
 S.stairs.forEach(s=>{
  s.a=PT(s.a); s.b=PT(s.b);
  s.w=clamp(Math.round(+s.w||1000),600,6000);
  s.n=clamp(Math.round(+s.n||12),2,80);
  s.up=(s.up==="dn")?"dn":"up";
  s.cut=clamp(+s.cut||0,0,0.95);
  if(s.h!=null){
   s.h=clamp(Math.round(s.h),200,8000);
   if(!s.h)delete s.h;
  }
 });
 /* ═══ الورقة والعنوان ═══ */
 S.sheet=Object.assign(d.sheet,S.sheet||{});
 if(!/^A[0-4]$/.test(S.sheet.size))S.sheet.size="A3";
 S.sheet.orient=(S.sheet.orient==="p")?"p":"l";
 S.sheet.margin=clamp(+S.sheet.margin||12,0,60);
 S.sheet.on=S.sheet.on?1:0;
 S.sheet.tb=S.sheet.tb?1:0;
 S.sheet.north=S.sheet.north?1:0;
 ["cx","cy"].forEach(k=>{
  S.sheet[k]=(S.sheet[k]!=null&&isFinite(S.sheet[k]))
   ? Math.round(S.sheet[k]) : null;
 });
 S.title=Object.assign(d.title,S.title||{});
 ["proj","owner","loc","sheet","rev","by"].forEach(k=>{
  S.title[k]=String(S.title[k]==null?"":S.title[k]).slice(0,60);
 });
 /* ═══ المرجع ═══ جامد: يُطبَّع شكلاً ولا يُصلَح هندسةً ═══
    والحدود هي حدود القارئ نفسها (io/dxfin.js): ملفُّ مشروعٍ
    محرَّرٌ يدوياً منفذٌ ثانٍ إلى الحالة، فلا يُترَك بلا سقف —
    مضلّعٌ بعشرة ملايين رأسٍ يمرّ من هنا كما يمرّ من هناك.
    وهويّة مصفوفة الكيانات تُحفَظ إن لم يُنبَذ منها شيء: مخزنُ
    نسخ المرجع (REFS) يوازن بالهويّة، فإعادةُ بناءٍ بلا سببٍ
    تُنشئ نسخةً زائدة مع كل تراجع، وثمانيةُ تراجعاتٍ تُزحِم
    الحدَّ فتُفقَد نسخةٌ يشير إليها تاريخٌ قائم. */
 const CO=1e9, RPTS=20000;
 const okp=p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1])
  &&Math.abs(p[0])<=CO&&Math.abs(p[1])<=CO;
 S.ref=Object.assign(d.ref,S.ref||{});
 S.ref.tr=Object.assign({k:1,rot:0,dx:0,dy:0},S.ref.tr||{});
 S.ref.tr.k=clamp(+S.ref.tr.k||1,1e-4,1e4);
 S.ref.tr.rot=deg(+S.ref.tr.rot||0);
 S.ref.tr.dx=Math.round(+S.ref.tr.dx||0);
 S.ref.tr.dy=Math.round(+S.ref.tr.dy||0);
 const RT={l:1,p:1,a:1,t:1,x:1};
 const RE=Array.isArray(S.ref.ents)?S.ref.ents:[];
 let RK=RE.filter(e=>e&&RT[e.t]);
 if(RK.length>60000)RK=RK.slice(0,60000);
 RK.forEach(e=>{
  e.sl=String(e.sl==null?"0":e.sl).slice(0,80)||"0";
  if(e.t==="l"){e.a=PT(e.a); e.b=PT(e.b)}
  else if(e.t==="p")e.pts=(Array.isArray(e.pts)?e.pts:[])
   .filter(p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]))
   .slice(0,RPTS)          /* السقف نفسه: MAXPTS في القارئ */
   .map(PT);
  else if(e.t==="a"){
   e.c=PT(e.c);
   /* قيمةٌ خارج المدى تُقسَر: صندوقٌ هائل يصفّر التكبير وتخلو
      الشاشة بلا رسالة */
   e.r=clamp(Math.round(+e.r||1),1,CO);
   e.a0=deg(+e.a0||0); e.a1=deg(+e.a1||0);
  }
  else if(e.t==="t"){
   e.p=PT(e.p);
   e.s=String(e.s==null?"":e.s).slice(0,200);
   e.h=clamp(Math.round(+e.h||100),1,1e7);
   e.rot=deg(+e.rot||0);
  }else e.p=PT(e.p);
 });
 RK=RK.filter(e=>e.t!=="p"||e.pts.length>1)
      .filter(e=>e.t!=="t"||e.s)
      /* الطبقة الثالثة: PT يعيد [0,0] لما لا يُفهَم، فالنقطة
         المعطوبة تصير أصلاً ولا تُنبَذ — والفلترة هنا تنبذها */
      .filter(e=>{
       if(e.t==="l")return okp(e.a)&&okp(e.b);
       if(e.t==="p")return true;         /* رؤوسه مُقصَّاة أعلاه */
       if(e.t==="a")return okp(e.c);
       return okp(e.p);
      });
 S.ref.ents=(RK.length===RE.length)?RE:RK;
 S.ref.src={};
 S.ref.ents.forEach(e=>{
  S.ref.src[e.sl]=(S.ref.src[e.sl]||0)+1});
 const OF={};
 Object.keys(S.ref.off||{}).forEach(k=>{
  if(S.ref.src[k])OF[k]=1});
 S.ref.off=OF;

 COLLS.forEach(k=>S[k].forEach(e=>bumpIdc(idNum(e.id))));
 return S;
}
/* ═══ المرجع خارج اللقطة ═══
   كيانات المرجع جامدةٌ بالتصميم: لا يتغيّر منها إلّا tr و off.
   فتسلسلُها في كل خطوةِ تراجعٍ كان يضاعف كلفة كل نقرةٍ بحجم
   الملفّ المستورد — ستّون ألف كيانٍ في مئة خطوة، وثلاث مئة
   ميغابايت في الذاكرة، ومقارنةُ نصٍّ بحجم ميغابايت في pushHistory.
   والكيانات تتبدّل بحدثَين صريحَين فقط: setRef و clearRef.

   الحلّ مشاركةٌ بنيوية: الخطوات تحمل رقم نسخةٍ، والمحتوى في مخزنٍ
   واحد. وأمّا tr و off فيدخلان اللقطة كاملَين — فمحاذاةٌ واحدةٌ
   تُتراجَع عنها.

   عدّادان لا واحد: ver تصاعديٌّ لا يعود، وcur نسخةُ الحالة الآن.
   والفصل لازم — التراجع يعيد cur إلى نسخةٍ سابقة، ولو أعاد
   الترقيم معها لكتب استيرادٌ جديدٌ فوق نسخةٍ يشير إليها تاريخٌ
   قائم. */
const RCAP=8;
let refVer=0, refCur=0;
const REFS=new Map();
let ONREF=null;
export const setRefLost=f=>{ONREF=(typeof f==="function")?f:null};
export const refVersion=()=>refCur;
export const refStore=()=>({n:REFS.size,ver:refVer,cur:refCur});

function refTrim(){
 /* لا تنمو بلا حدّ: أقدمُ نسخةٍ لا تشير إليها الحالة تُنسى.
    والمرجع الواحد نسختان في العادة (قبل الاستيراد وبعده). */
 while(REFS.size>RCAP){
  let old=null;
  for(const k of REFS.keys()){if(k!==refCur){old=k; break}}
  if(old==null)break;
  REFS.delete(old);
 }
}
export function refBump(){
 refVer++; refCur=refVer;
 REFS.set(refCur,(S.ref&&S.ref.ents)||[]);
 refTrim();
 return refCur;
}
/* ═══ التاريخ ═══ */
const MAX=100, HIST={u:[],r:[]};
/* تسمياتٌ موازية لسجلّ التراجع — اختياريّة، لا تُغيّر توقيع من
   ينادي pushHistory(snap) بلا تسمية. لوحة السجل المرئية (انظر
   ui/historypanel.js) تقرأ منها. */
const HLBL={u:[],r:[]};
const DEF_LBL="تعديل";
export function pack(){
 const o={};
 KEYS.forEach(k=>{o[k]=S[k]});
 o._idc=idc();
 return o;
}
export function snapshot(){
 const o=pack();
 const ents=(o.ref&&o.ref.ents)||[];
 if(ents.length){
  /* الهويّة هي الميزان: مصفوفةٌ جديدة تعني محتوىً جديداً — وقد
     تأتي من استيرادٍ لم يُعلن نسخته، أو من فتح ملفّ. */
  if(REFS.get(refCur)!==ents)refBump();
  o.ref=Object.assign({},o.ref,{ents:[],__rv:refCur});
 }
 return JSON.stringify(o);
}
function apply(d){
 if(!d)return;
 KEYS.forEach(k=>{if(d[k]!==undefined)S[k]=d[k]});
 /* لقطةٌ كاملة: كل شيء تبدّل يقيناً — الجدران والفتحات والطبقات.
    والكاشات المفتاحيّة (بصمة المناطق) تتّكل على هذا. */
 VER.g++; VER.o++;
 /* استرجاع الكيانات من مخزن النسخ. وإن ضاعت النسخة (تجاوزت
    الحدّ) فالمرجع يزول ويُبلَّغ — ولا تُخترَع كياناتٌ.
    والمصفوفة مشتركةٌ مع المخزن: لا مسارَ يُدخل فيها أو يُخرج،
    فsetRef وclearRef يستبدلانها استبدالاً. */
 if(d.ref&&d.ref.__rv!=null){
  const e=REFS.get(d.ref.__rv);
  S.ref=Object.assign({},d.ref,{ents:e||[]});
  delete S.ref.__rv;
  refCur=d.ref.__rv;
  if(!e&&ONREF)ONREF(d.ref.__rv);
 }
 setIdc(d._idc||0);
 ensureShape();
}
export function pushHistory(snap,label){
 if(!snap)return;
 if(HIST.u[HIST.u.length-1]===snap)return;
 HIST.u.push(snap); HLBL.u.push(label||DEF_LBL);
 if(HIST.u.length>MAX){HIST.u.shift(); HLBL.u.shift()}
 HIST.r.length=0; HLBL.r.length=0;
}
export const canUndo=()=>HIST.u.length>0;
export const canRedo=()=>HIST.r.length>0;
export const clearHistory=()=>{
 HIST.u.length=0; HIST.r.length=0; HLBL.u.length=0; HLBL.r.length=0;
};
/* ═══ الخط الزمني — للوحة السجل المرئية ═══
   past: من الأقدم إلى الأحدث · future: ما أُعيد التراجع عنه، من
   الأقرب إلى الأبعد. current = عدد خطوات past (موضع المؤشّر). */
export function historyTimeline(){
 return {past:HLBL.u.slice(), future:HLBL.r.slice().reverse(),
  current:HLBL.u.length};
}
/* ينقل المؤشّر إلى الخطوة n (0=البداية). يُنادي undo()/redo()
   الحقيقيّتين خطوةً خطوة فيبقى التخزين والحفظ التلقائي سليمَين. */
export function historyJumpTo(n){
 const total=HIST.u.length+HIST.r.length;
 n=Math.max(0,Math.min(n,total));
 while(HIST.u.length>n){if(!undo())break}
 while(HIST.u.length<n){if(!redo())break}
}

let AFTER=()=>{}, ONERR=()=>{};
export const setAfterEdit=f=>{AFTER=(typeof f==="function")?f:(()=>{})};
export const setEditError=f=>{ONERR=(typeof f==="function")?f:(()=>{})};

export function undo(){
 if(!HIST.u.length)return false;
 const cur=snapshot();
 apply(JSON.parse(HIST.u.pop()));
 const lbl=HLBL.u.pop()||DEF_LBL;
 HIST.r.push(cur); HLBL.r.push(lbl);
 if(HIST.r.length>MAX){HIST.r.shift(); HLBL.r.shift()}
 touch(); AFTER(true); autosave();
 return true;
}
export function redo(){
 if(!HIST.r.length)return false;
 const cur=snapshot();
 apply(JSON.parse(HIST.r.pop()));
 const lbl=HLBL.r.pop()||DEF_LBL;
 HIST.u.push(cur); HLBL.u.push(lbl);
 if(HIST.u.length>MAX){HIST.u.shift(); HLBL.u.shift()}
 touch(); AFTER(true); autosave();
 return true;
}
/* تعديل ذرّي: الفشل يُرجَع إلى اللقطة ويُبلَّغ — لا حالة نصف معدَّلة */
let FAILED=false;
/* هل أخفق آخر edit()؟ — يُسأل مباشرةً بعده وحده.
   لم نُعِد قيمةً مميّزة لأن كل مستدعٍ يقرأ العائد قيمةً شرعية،
   فأيُّ رمزٍ نعيده يصير صادقاً في شرطٍ قائم. */
export const editFailed=()=>FAILED;

export function edit(fn,label){
 const sn=snapshot();
 FAILED=false;
 let out=null;
 try{out=fn()}
 catch(e){
  apply(JSON.parse(sn));
  touch(); AFTER(true);
  FAILED=true;
  ONERR((e&&e.message)?e.message:String(e));
  return undefined;
 }
 pushHistory(sn,label); touch(); AFTER(false); autosave();
 return out;
}
/* ═══ الحفظ التلقائي ═══
   يُنادى متزامناً من كل تعديل، ويكتب لاحقاً. والكتابةُ الجارية لا
   تُقاطَع: ما يقع أثناءها يُعلَّم ويُكتَب بعدها — فلا تُفقَد آخر
   لمسة، ولا تتزاحم معاملتان على السجلّ نفسه. */
let AT=null, BUSY=false, DIRTY=false, SEALED=false;
let ONSAVE=()=>{};
export const setSaveError=f=>{
 ONSAVE=(typeof f==="function")?f:(()=>{});
};
async function flush(){
 AT=null;
 if(SEALED)return;              /* saveNow كتبت الأخيرة — لا تُسبَق */
 if(BUSY){DIRTY=true; return}
 if(!DIRTY)return;
 DIRTY=false; BUSY=true;
 let r;
 try{r=await Store.save(pack())}
 catch(e){r={ok:0,via:"?",err:(e&&e.message)||String(e)}}
 BUSY=false;
 if(SEALED)return;              /* أُغلق الباب أثناء الكتابة */
 if(!r.ok)ONSAVE(r);
 if(DIRTY&&!AT)AT=setTimeout(flush,700);
}
export function autosave(){
 DIRTY=true;
 SEALED=false;              /* تعديلٌ جديد: الصفحة عادت */
 if(AT)clearTimeout(AT);
 AT=setTimeout(flush,700);
}
/* ═══ الكتابة الأخيرة ═══
   تُنادى عند الإغلاق والإخفاء. تكتب متزامناً وتُغلق الباب: كتابةٌ
   آجلة كانت قيد التنفيذ تحمل لقطةً أقدم، فلو أكملت بعدها لكتبت
   فوق الأحدث — وهو الفقد نفسه الذي بُنيت هذه الدالّة لمنعه. */
export function saveNow(){
 if(AT){clearTimeout(AT); AT=null}
 if(!DIRTY&&!BUSY){SEALED=true; return {ok:1,via:"skip"}}
 DIRTY=false; SEALED=true;
 return Store.flushSync(pack());
}
/* الصفحة عادت (visibilitychange ⇒ visible): يُفتَح الباب */
export function saveResume(){
 if(!SEALED)return false;
 SEALED=false;
 if(DIRTY)autosave();
 return true;
}
export function loadState(d,resetHist){
 apply(d||DEF());
 if(resetHist)clearHistory();
 touch();
 return S;
}
export function newState(){
 setIdc(0);
 loadState(DEF(),true);
 DIRTY=false; SEALED=false;
 if(AT){clearTimeout(AT); AT=null}
 Store.del();
 AFTER(true);
 return S;
}
/* ═══ الاستعادة ═══
   تعيد اسم المصدر ("idb" · "ls" · "migrate") أو كائناً
   {via:"healed",refs} أو false. والسلسلة صادقة، فمن كان يفحص
   صحّتها يبقى على حاله — والمستدعي يقرأ had.via أو had. */
export async function restore(){
 let r=null;
 try{r=await Store.load()}
 catch(e){return false}
 if(!r||!r.data||!Array.isArray(r.data.walls))return false;
 loadState(r.data,true);
 /* الترميم والهجرة يُثبَّتان في IndexedDB فوراً، فلا يُعاد
    الترميم في كل إقلاع */
 if(r.via==="migrate"||r.via==="healed")autosave();
 return (r.via==="healed")
  ? {via:"healed",refs:r.refs||0} : r.via;
}
