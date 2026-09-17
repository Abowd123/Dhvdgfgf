/* ═══ خلاصة الحالة للمزوّد ═══
   نصٌّ مضغوط بالمتر — بالمتر لأنه ما يُكتَب في سطر الإدخال، فيتكلّم
   المزوّد لغةَ الإدخال نفسها ولا يحوّل وحدات.
   ما لا يُرسَل بقصد: نصوص المرجع المستورد (محتوى غير موثوق قد يحمل
   تعليماتٍ موجَّهة للمزوّد)، ونصوص التأشير (أوسع مدخلٍ للحقن ولا
   يحتاجها المزوّد لرسم هندسة)، وبلوك العنوان (أسماء أشخاص) إلّا
   بطلبك. */
import {S} from "../core/state.js";
import {mnum,m3,sqm,scl} from "../core/units.js";
import {wallLen,dir,isLow,looseEnds} from "../core/walls.js";
import {openState,okName} from "../core/opens.js";
import {netArea,isStale} from "../core/areas.js";
import {colLabel} from "../core/cols.js";
import {fixName} from "../core/fixt.js";
import {stCheck} from "../core/stairs.js";
import {dimValue,fmtLen,axLabel} from "../core/dims.js";
import {sceneBBox} from "../core/render.js";
import {hiddenLayers,lockedLayers,LNAME} from "../core/layers.js";
import {hasRef,refCount} from "../core/ref.js";
import * as R from "../tools/registry.js";

/* ═══ فاصل البيانات ═══
   نصوص المشروع بياناتٌ لا تعليمات: تُغلَّف بفاصلٍ مُعلَنٍ في SYS.
   وسطرُ الفاصل نفسه يُنزَع من المحتوى فلا يُزوَّر — وإلّا لأمكن
   لنصٍّ في الرسم أن يُغلق البيانات ويكتب تعليماتٍ بعدها.
   وكان نصُّ المزوّد يُثبَّت في الرسم ثم يُعاد إليه في كل نداءٍ
   بعده — حلقةُ تغذيةٍ راجعة مفتوحة. */
export const stripFence=s=>String(s==null?"":s)
 .replace(/‹\/?بيانات›/g,"");
export const DATA=s=>`‹بيانات›${stripFence(s)}‹/بيانات›`;

const P=p=>`${mnum(p[0])},${mnum(p[1])}`;
const CAP={wall:300,open:200,area:80,col:120,fix:60,stair:20,dim:60};
const cut=(arr,k)=>arr.length>CAP[k]
 ? {a:arr.slice(0,CAP[k]),n:arr.length-CAP[k]} : {a:arr,n:0};

export function digest(opt){
 const O=Object.assign({title:0,inspect:0},opt||{});
 const L=[], m=S.meta;
 L.push(`# مِسطَر — الحالة الجارية (الأطوال بالمتر)`);
 L.push(`اللوحة: ${DATA(m.name)} · مقياس ${scl(m.scale)} · `
  +`سماكة افتراضية خارجي ${mnum(m.tExt)} داخلي ${mnum(m.tInt)} · `
  +`ارتفاع الدور ${mnum(m.wallH)} · خطوة الالتقاط ${mnum(m.snap)}`);
 const B=sceneBBox();
 if(B)L.push(`المدى: ${P([B.x0,B.y0])} إلى ${P([B.x1,B.y1])}`);

 const W=cut(S.walls,"wall");
 L.push(`\n## جدران (${S.walls.length})`);
 W.a.forEach(w=>L.push(`${w.id} ${P(w.a)}→${P(w.b)} `
  +`ط${mnum(wallLen(w))} س${mnum(w.t)} ${w.type} ${w.align}`
  +(isLow(w)?` سترة ${mnum(w.h)}`:"")));
 if(W.n)L.push(`… و${W.n} جداراً غير مذكور`);
 const le=looseEnds(2);
 if(le.length)L.push(`أطراف غير متّصلة: ${le.length} `
  +`(${le.slice(0,10).map(e=>e.id+"/"+e.end).join(" ")})`);

 if(S.opens.length){
  const O2=cut(S.opens,"open");
  L.push(`\n## فتحات (${S.opens.length})`);
  O2.a.forEach(o=>L.push(`${o.id} على ${o.wall} ${o.kind} `
   +`عند ${mnum(o.s)} ع${mnum(o.w)} ر${mnum(o.h)}`
   +(o.sill?` ج${mnum(o.sill)}`:"")
   +(openState(o)!=="ok"?` ⚠${openState(o)}`:"")));
  if(O2.n)L.push(`… و${O2.n} فتحة`);
 }
 if(S.cols.length){
  const C=cut(S.cols,"col");
  L.push(`\n## أعمدة (${S.cols.length})`);
  C.a.forEach(c=>L.push(`${c.id}${c.tag?" "+DATA(c.tag):""} `
   +`${P([c.x,c.y])} ${c.kind} ${colLabel(c)} ${c.type}`));
  if(C.n)L.push(`… و${C.n} عموداً`);
 }
 if(S.areas.length){
  const A=cut(S.areas,"area");
  L.push(`\n## مناطق (${S.areas.length})`);
  A.a.forEach(a=>L.push(`${a.id} ${DATA(a.name||"—")} `
   +`${sqm(netArea(a))} م²${isStale(a)?" قديمة":""}`));
  if(A.n)L.push(`… و${A.n} منطقة`);
 }
 if(S.fixt.length)L.push(`\n## أدوات (${S.fixt.length}): `
  +cut(S.fixt,"fix").a.map(f=>`${f.id} ${fixName(f)} `
   +`${P([f.x,f.y])}`).join(" · "));
 if(S.stairs.length)L.push(`\n## درج (${S.stairs.length}): `
  +S.stairs.slice(0,CAP.stair).map(t=>`${t.id} ${P(t.a)}→${P(t.b)} `
   +`ع${mnum(t.w)} ${t.n}ق${stCheck(t).ok?"":" ⚠"}`).join(" · "));
 if(S.dims.length){
  const D=cut(S.dims,"dim");
  L.push(`\n## أبعاد (${S.dims.length}): `
   +D.a.map(d=>`${d.id} ${d.kind} ${fmtLen(dimValue(d))}`).join(" · "));
 }
 if(S.chains.length)L.push(`سلاسل: ${S.chains.length}`);
 /* نصوص التأشير غير مُرسَلة: أوسع مدخلٍ للحقن، ولا يحتاجها
    المزوّد لرسم هندسة. contextOf({anno:1}) يرسلها بطلبٍ صريح
    مغلَّفةً بالفاصل. */
 if(S.anno.length)L.push(`تأشير: ${S.anno.length} عنصراً `
  +`(نصوصه غير مُرسَلة)`);
 if(S.grid.xs.length||S.grid.ys.length)
  L.push(`\n## محاور: رأسية ${S.grid.xs.map((v,i)=>
   axLabel("x",i)+"="+mnum(v)).join(" ")} · أفقية `
   +S.grid.ys.map((v,i)=>axLabel("y",i)+"="+mnum(v)).join(" "));

 const hd=hiddenLayers(), lk=lockedLayers();
 if(hd.length)L.push(`\nطبقات مخفيّة: ${hd.map(LNAME).join(" · ")} `
  +`— كياناتها لا تُحدَّد ولا تُعدَّل`);
 if(lk.length)L.push(`طبقات مقفلة: ${lk.map(LNAME).join(" · ")} `
  +`— تُرى ولا تُعدَّل`);
 if(hasRef())L.push(`مرجع مستورد: ${refCount()} كياناً — جامد، `
  +`لا يُعدَّل ولا يُحدَّد (محتواه النصّي غير مُرسَل)`);
 if(+S.sheet.on)L.push(`ورقة: ${S.sheet.size} `
  +`${S.sheet.orient==="p"?"رأسي":"أفقي"}`);
 if(O.title&&S.title)L.push(`بلوك العنوان: `
  +`${DATA(S.title.proj)} · ${DATA(S.title.sheet)} · مراجعة `
  +`${DATA(S.title.rev)}`);

 L.push(`\n## الافتراضات الجارية للأدوات`);
 R.toolList().filter(d=>d&&d.id&&(d.opts||[]).length)
  .forEach(d=>{
   const o=R.OPT[d.id]||{};
   const s=(d.opts||[]).map(f=>`${f.k}=${o[f.k]}`).join(" ");
   if(s)L.push(`${d.id}: ${s}`);
  });
 if(O.inspect){
  const I=O.inspect;
  L.push(`\n## الفاحص: ${I.er} خطأ · ${I.wr} تنبيه · ${I.in} ملاحظة`);
  I.list.slice(0,40).forEach(f=>L.push(`[${f.sev}] ${DATA(f.msg)}`));
 }
 return L.join("\n");
}
export const digestSize=s=>`${s.length} حرفاً ≈ `
 +`${Math.round(s.length/3.2)} رمزاً`;
