/* ═══ القياس ═══
   عدّاداتٌ لا مؤقّتات: عددُ إعادات البناء وعددُ اختبارات التقاطع
   لا يتبدّلان بحاسبٍ آخر، والمللي ثانية يتبدّل بكل شيء. والدفعة
   الثامنة كلّها عن «ما يُبطَل»، فقياسُه هو التحقّق منها.

   ومُطفأٌ افتراضاً فكلفته صفر: bump يفحص علماً واحداً ويعود.
   ويستورد geom.js وحده — وهو ورقةٌ في الشجرة، فلا دورة. */
import {PERF as G, perfReset as gReset,
        WELD as GEOW} from "./geom.js";

export const P={on:0, frame:0, scene:0, bodies:0, loops:0, stamp:0,
 band:0, filter:0, prims:0};
export function perfClear(){
 P.frame=0; P.scene=0; P.bodies=0; P.loops=0; P.stamp=0;
 P.band=0; P.filter=0; P.prims=0;
 gReset();
 return P;
}
export function perfOn(v){
 P.on=v?1:0;
 if(P.on)perfClear();
 return P.on;
}
export const bump=(k,n)=>{
 if(P.on)P[k]=(P[k]||0)+((n==null)?1:n);
};

export function perfReport(){
 const L=[];
 L.push(`إطار ${P.frame} · مشهد ${P.scene} · أجسام ${P.bodies}`
  +` · حلقات ${P.loops} · بصمة ${P.stamp}`);
 L.push(`نطاقاتٌ مُعاد بناؤها ${P.band} · ${P.prims} أوّلية`
  +` · تصفية ${P.filter}`);
 L.push(`اتحاد ${G.union} · شظايا ${G.frags} ⇒ ${G.kept} مُبقاة`
  +` · حلقات ${G.rings}`);
 L.push(`اختبار تقاطع ${G.pairs.toLocaleString("en")}`
  +` · احتواء ${G.pip.toLocaleString("en")}`
  +` · خلايا ${G.cells}`);
 /* اللحم عملٌ عاديّ لا عطب: كلُّ زاويةٍ كسريّة تُنتِجه، فيُقال
    في القياس ولا يُقال في التصدير — والتقريرُ الذي يُطلَق دائماً
    لا يُقرأ أبداً. */
 if(G.weld||G.dup||G.nil)
  L.push(`عُقدٌ مُلحَمة ${G.weld} · قطعٌ مكرّرة ${G.dup}`
   +` · صفريّة ${G.nil} (حدُّ اللحم ${GEOW} مم)`);
 if(G.ms>1)L.push(`زمن الاتحاد ${Math.round(G.ms)} مس`);
 if(G.open){
  L.push(`⚠ ${G.open} قطعةً لم تُخَط — مدخلٌ معطوبٌ لا تفاوتُ `
   +`تدوير: اللحم يبلغ ${GEOW} مم`);
  if(G.openAt)L.push(`   آخرُ موضعٍ: `
   +`(${Math.round(G.openAt[0])}، ${Math.round(G.openAt[1])}) مم`);
 }
 return L.join("\n");
}
