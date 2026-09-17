/* ═══ مواضع اللوحات وأسطح العمل ═══
   سجلٌّ للموضع وحده. الرسم في panels.js، والتسمية في اللوحة نفسها
   (نصّ summary) فلا تُكتَب مرّتين ولا تتخلّف إحداهما عن الأخرى.
   المعرّفات هي data-sec القائمة في props.js — وdom.js يقابل
   القائمتين فلا تنفرد إحداهما بعنصر.

   الأعمدة: s بداية السطر (يمين في العربية) · e نهايته.
   وz للوحة: s | e | f عائمة | x مغلقة. */

export const PANELS=[
 {id:"proj",   ico:"props",   z:"s", o:1},
 {id:"lays",   ico:"layers",  z:"s", o:1},
 {id:"props",  ico:"panel",   z:"s", o:1},
 {id:"sched",  ico:"table",   z:"s", o:0},
 {id:"osched", ico:"table",   z:"s", o:0},
 {id:"axes",   ico:"axis",    z:"s", o:0},
 {id:"ref",    ico:"ref",     z:"s", o:0},
 {id:"sheet",  ico:"sheet",   z:"s", o:0},
 {id:"insp",   ico:"inspect", z:"s", o:1},
 {id:"export", ico:"xport",   z:"s", o:0},
 {id:"defs",   ico:"shell",   z:"s", o:0},
 {id:"ai",     ico:"ai",      z:"s", o:0},
 {id:"state",  ico:"grid",    z:"s", o:1}
];
export const pIds=()=>PANELS.map(p=>p.id);
export const pDef=id=>PANELS.find(p=>p.id===id)||null;
export const isPanel=id=>!!pDef(id);

export const ZONES=["s","e"];
export const ZN={s:"العمود الأيمن",e:"العمود الأيسر",
 f:"عائمة",x:"مغلقة"};
export const MODES={acc:"أقسام",tab:"تبويبات"};
export const WMIN=210, WMAX=560;

/* ═══ أسطح العمل المدمجة ═══
   s و e قائمتان مرتَّبتان · ما لم يُذكَر فيهما مغلق · open ما يُفتَح.
   والقصد أن كل سطحٍ يعرض ما يخصّ عمله ويُغلق ما عداه — لا لوحةً
   تُبنى لتُخفى. */
export const WS={
 arch:{n:"معماري", shell:"ribbon", tab:"arch", clean:0,
  zw:{s:312,e:270}, mode:{s:"acc",e:"acc"}, auto:{s:0,e:0},
  s:["proj","lays","props","insp","ai","state"], e:[],
  open:["lays","props","insp"]},

 annot:{n:"تأشير", shell:"ribbon", tab:"annt", clean:0,
  zw:{s:300,e:288}, mode:{s:"acc",e:"tab"}, auto:{s:0,e:0},
  s:["props","lays","state"], e:["sched","osched","axes"],
  open:["props","sched","osched","axes"]},

 out:{n:"إخراج", shell:"ribbon", tab:"out", clean:0,
  zw:{s:312,e:264}, mode:{s:"acc",e:"acc"}, auto:{s:0,e:0},
  s:["sheet","export","state"], e:["insp","lays"],
  open:["sheet","export","insp"]},

 full:{n:"كامل", shell:"ribbon", tab:"home", clean:0,
  zw:{s:312,e:270}, mode:{s:"acc",e:"acc"}, auto:{s:0,e:0},
  s:["proj","lays","props","sched","osched","axes","ai"],
  e:["ref","sheet","insp","export","defs","state"],
  open:["lays","props","insp","state"]},

 bare:{n:"بلا شريط", shell:"classic", tab:"home", clean:0,
  zw:{s:288,e:264}, mode:{s:"acc",e:"acc"}, auto:{s:1,e:0},
  s:["props","lays","insp","state"], e:[],
  open:["props","lays"]}
};

/* ═══ التخطيط الافتراضي ═══ يوافق ما كان قبل و٢ حرفياً ═══ */
export const DEFLAY=()=>({
 zw:{s:312,e:270},
 mode:{s:"acc",e:"acc"},
 auto:{s:0,e:0},
 cur:{s:null,e:null},          /* اللوحة الجارية في وضع التبويبات */
 p:PANELS.reduce((a,p)=>{
  a[p.id]={z:p.z,i:PANELS.indexOf(p),o:p.o,
   x:120,y:110,w:320,h:300,max:0};
  return a;
 },{})
});
/* ═══ التطبيع الدفاعي ═══
   تخطيطٌ محرَّر يدوياً أو من إصدارٍ أقدم يُصلَح شكلاً: لوحةٌ مجهولة
   تُنبذ، وناقصةٌ تُستكمل من مصنعها. */
export function normLay(L){
 const d=DEFLAY();
 const o={zw:{},mode:{},auto:{},cur:{},p:{}};
 const num=(v,a,b,f)=>{
  const n=Math.round(+v);
  return isFinite(n)?Math.max(a,Math.min(b,n)):f;
 };
 ZONES.forEach(z=>{
  o.zw[z]=num(L&&L.zw&&L.zw[z],WMIN,WMAX,d.zw[z]);
  const m=L&&L.mode&&L.mode[z];
  o.mode[z]=MODES[m]?m:"acc";
  o.auto[z]=(L&&L.auto&&L.auto[z])?1:0;
  const c=L&&L.cur&&L.cur[z];
  o.cur[z]=isPanel(c)?c:null;
 });
 PANELS.forEach(p=>{
  const s=(L&&L.p&&L.p[p.id])||{};
  const z=/^(s|e|f|x)$/.test(s.z)?s.z:p.z;
  o.p[p.id]={z,
   i:num(s.i,0,999,PANELS.indexOf(p)),
   o:(s.o===undefined)?p.o:(s.o?1:0),
   x:num(s.x,-4000,8000,120), y:num(s.y,0,8000,110),
   w:num(s.w,220,1200,320), h:num(s.h,120,2000,300),
   max:s.max?1:0};
 });
 return o;
}
export const wsNorm=w=>{
 if(!w||typeof w!=="object")return null;
 const F=id=>isPanel(id);
 return {n:String(w.n||"سطح").slice(0,32),
  shell:(w.shell==="classic")?"classic":"ribbon",
  tab:String(w.tab||"home").slice(0,16),
  clean:w.clean?1:0,
  zw:{s:+w.zw?.s||312, e:+w.zw?.e||270},
  mode:{s:MODES[w.mode?.s]?w.mode.s:"acc",
        e:MODES[w.mode?.e]?w.mode.e:"acc"},
  auto:{s:w.auto?.s?1:0, e:w.auto?.e?1:0},
  s:(Array.isArray(w.s)?w.s:[]).filter(F),
  e:(Array.isArray(w.e)?w.e:[]).filter(F),
  open:(Array.isArray(w.open)?w.open:[]).filter(F)};
};
