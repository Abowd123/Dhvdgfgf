/* ═══ مخطّط الشريط ═══
   وصفٌ لا كود: كل تبويبٍ ولوحٍ وزرّ سطرٌ في هذا الملفّ، فتحريك
   أمرٍ لا يمسّ المصيّر ولا الموصِّل.

   ثلاثة أنواعٍ من العناصر، ولا رابع:
     {cmd}  أداة مسجَّلة — تُنادى بـ R.begin مباشرةً
     {act}  نقرٌ بالوكالة على زرٍّ قائم في اللوحة الجانبية
     {tog}  مفتاح حالةٍ يعكس حالة هدفه ويُبدّلها بنقره
     {dlg}  يفتح قسم اللوحة الجانبية ويُظهره
   والوكالة قصدٌ لا اختصار: لا منطقَ مكرّراً، ولوحةٌ واحدة هي
   المرجع، والمستخدم يرى أين يسكن الأمر.

   {group:[…]} عمودٌ من ثلاثة أزرارٍ صغيرة على الأكثر.
   big:1 زرٌّ كبير بأيقونةٍ فوق تسميته.

   قاعدة الموضع الواحد تسري على الأوامر، ويُستثنى تبويب «رئيسي»
   صريحاً: هو سطح تسريعٍ لأشيع الأدوات، وموضعها الأساسي تبويبها. */

const G=(...items)=>({group:items});

/* ═══ التبويبات الثابتة ═══ */
export const RIBBON=[
{id:"home", n:"رئيسي", kt:"1", panels:[
 {id:"draw", n:"رسم", dlg:"proj", items:[
  {cmd:"wall", n:"جدار",   ico:"wall", big:1},
  {cmd:"rect", n:"مستطيل", ico:"rect", big:1},
  G({cmd:"col",     n:"عمود",         ico:"col"},
    {cmd:"gridcols",n:"أعمدة المحاور",ico:"gridcols"},
    {cmd:"area",    n:"منطقة",        ico:"area"})]},

 {id:"mod", n:"تعديل", items:[
  {cmd:"move", n:"نقل", ico:"move", big:1},
  {cmd:"copy", n:"نسخ", ico:"copy", big:1},
  G({cmd:"rotate",n:"دوران",ico:"rotate"},
    {cmd:"mirror",n:"مرآة", ico:"mirror"},
    {cmd:"offset",n:"إزاحة",ico:"offset"}),
  G({cmd:"trim",   n:"قصّ",   ico:"trim"},
    {cmd:"extend", n:"تمديد",ico:"extend"},
    {cmd:"stretch",n:"شدّ",   ico:"stretch"}),
  G({cmd:"break", n:"قطع",  ico:"brk"},
    {cmd:"divide",n:"قسمة", ico:"divide"},
    {cmd:"weld",  n:"لحم",  ico:"weld"}),
  G({cmd:"match",n:"مطابقة",       ico:"match"},
    {cmd:"sel",  n:"تحديد بالمعرّف",ico:"selid"},
    {cmd:"del",  n:"حذف",           ico:"del"}),
  G({cmd:"chamfer",   n:"كسر الركن",     ico:"chamfer"},
    {cmd:"array",     n:"مصفوفة",        ico:"array"},
    {cmd:"arraypolar",n:"مصفوفة قطبية",ico:"arraypol"})]},

 {id:"lay", n:"الطبقات", dlg:"lays", items:[
  {act:"laysDlg", n:"مدير الطبقات", ico:"layers", big:1},
  G({act:"lAll",   n:"أظهر الكل",  ico:"grid"},
    {act:"lUnlock",n:"افتح المقفل",ico:"unlock"})]},

 {id:"ann", n:"تأشير", dlg:"props", items:[
  {cmd:"dim",  n:"بُعد", ico:"dim",  big:1},
  {cmd:"text", n:"نصّ",  ico:"text", big:1},
  G({cmd:"chain",n:"سلسلة",ico:"chain"},
    {cmd:"lead", n:"قائد", ico:"lead"},
    {cmd:"level",n:"منسوب",ico:"level"})]},

 {id:"tool", n:"أدوات", items:[
  {cmd:"measure",n:"قياس", ico:"measure",big:1},
  {act:"inspect",n:"افحص", ico:"inspect",big:1},
  G({act:"undo",n:"تراجع", ico:"undo"},
    {act:"redo",n:"إعادة", ico:"redo"},
    {act:"fit", n:"ملاءمة",ico:"fit"})]}]},

{id:"arch", n:"معماري", kt:"2", panels:[
 {id:"walls", n:"جدران", items:[
  {cmd:"wall",  n:"جدار",  ico:"wall", big:1},
  {cmd:"rect",  n:"مستطيل",ico:"rect", big:1},
  G({cmd:"offset",n:"إزاحة",ico:"offset"},
    {cmd:"divide",n:"قسمة", ico:"divide"},
    {cmd:"weld",  n:"لحم",  ico:"weld"}),
  G({cmd:"chamfer",n:"كسر الركن",ico:"chamfer"})]},

 {id:"opens", n:"فتحات", items:[
  {cmd:"door", n:"باب",  ico:"door",  big:1},
  {cmd:"win",  n:"شباك", ico:"window",big:1},
  G({cmd:"fixed",  n:"شباك ثابت", ico:"fixed"},
    {cmd:"opening",n:"فتحة صافية",ico:"opening"},
    {cmd:"arch",   n:"مقنطرة",    ico:"arch"}),
  G({cmd:"niche",n:"كوّة",ico:"niche"})]},

 {id:"parts", n:"أجزاء", items:[
  {cmd:"stair",   n:"درج",  ico:"stair",   big:1},
  {cmd:"col",     n:"عمود", ico:"col",     big:1},
  {cmd:"gridcols",n:"أعمدة المحاور",ico:"gridcols",big:1}]},

 {id:"fixt", n:"صحية", items:[
  G({cmd:"wc",   n:"كرسي", ico:"wc"},
    {cmd:"lav",  n:"مغسلة",ico:"lav"},
    {cmd:"bidet",n:"شطّاف", ico:"bidet"}),
  G({cmd:"shower",n:"دُش",  ico:"shower"},
    {cmd:"tub",   n:"بانيو",ico:"tub"},
    {cmd:"fd",    n:"صفاية",ico:"fd"}),
  G({cmd:"sink",n:"مجلى",  ico:"sink"},
    {cmd:"wm",   n:"غسّالة",ico:"wm"},
    {cmd:"ur",   n:"مبولة",ico:"ur"})]},

 {id:"areas", n:"مناطق", dlg:"sched", items:[
  {cmd:"area",   n:"منطقة",ico:"area",   big:1},
  {cmd:"arearef",n:"تحديث",ico:"arearef",big:1},
  G({act:"asCsv",   n:"جدول المساحات",ico:"csv"},
    {act:"schedDlg",n:"اللوحة",       ico:"table"})]}]},

{id:"ins", n:"إدراج", kt:"3", panels:[
 {id:"ref", n:"المرجع", dlg:"ref", items:[
  {act:"rImp", n:"استورد DXF",ico:"ref",big:1},
  G({cmd:"refalign",n:"محاذاة", ico:"refalign"},
    {cmd:"refcal",  n:"معايرة", ico:"refcal"},
    {cmd:"refmove", n:"نقل",    ico:"refmove"}),
  G({act:"rRst",n:"صفّر التحويل",ico:"undo"},
    {act:"rClr",n:"أزِل المرجع", ico:"del"})]},

 {id:"data", n:"بيانات", items:[
  {act:"schedDlg", n:"جدول المساحات",ico:"table",big:1},
  {act:"oschedDlg",n:"جدول الفتحات", ico:"table",big:1},
  G({act:"asCsv",n:"مساحات CSV",ico:"csv"},
    {act:"osCsv",n:"فتحات CSV", ico:"csv"})]},

 {id:"axg", n:"المحاور", dlg:"axes", items:[
  {cmd:"axis", n:"محور",ico:"axis",big:1},
  G({cmd:"gridcols",n:"أعمدة المحاور",ico:"gridcols"},
    {act:"axClr",   n:"امسح المحاور", ico:"del"})]}]},

{id:"annt", n:"تأشير", kt:"4", panels:[
 {id:"dims", n:"أبعاد", items:[
  {cmd:"dim",  n:"بُعد",  ico:"dim",  big:1},
  {cmd:"chain",n:"سلسلة",ico:"chain",big:1},
  G({cmd:"chaincmp",n:"قارن السلسلة",ico:"chaincmp"},
    {cmd:"measure", n:"قياس",         ico:"measure"})]},

 {id:"txt", n:"نصوص", items:[
  {cmd:"text", n:"نصّ",  ico:"text", big:1},
  {cmd:"lead", n:"قائد",ico:"lead", big:1},
  G({cmd:"level",n:"منسوب",ico:"level"},
    {cmd:"axis", n:"محور", ico:"axis"})]},

 {id:"sty", n:"الهيئة", dlg:"proj", items:[
  {act:"projDlg",n:"إعداد المشروع",  ico:"props",big:1},
  {act:"defsDlg",n:"افتراضات الأدوات",ico:"shell",big:1}]}]},

{id:"view", n:"عرض", kt:"5", panels:[
 {id:"nav", n:"تنقّل", items:[
  {act:"fit",  n:"ملاءمة",     ico:"fit",  big:1},
  {act:"clean",n:"شاشة نظيفة", ico:"clean",big:1},
  G({act:"rbMin",n:"اطوِ الشريط",ico:"rbmin"},
    {act:"theme",n:"السِّمة",     ico:"theme"},
    {act:"shell",n:"القشرة",     ico:"shell"})]},

 {id:"aids", n:"مساعدات", items:[
  G({tog:'[data-rb="ortho"]',n:"تعامد", ico:"ortho"},
    {tog:'[data-rb="polar"]',n:"قطبي",  ico:"polar"},
    {tog:'[data-rb="snap"]', n:"التقاط",ico:"osnap"}),
  G({tog:'[data-rb="grips"]',n:"مقابض", ico:"grips"},
    {tog:'[data-rb="ends"]', n:"أطراف", ico:"ends"},
    {act:"osPop",            n:"أنماط الالتقاط",ico:"osnap"})]},

 {id:"inp", n:"الإدخال", items:[
  G({tog:'[data-rb="dyn"]',n:"إدخال حركي",ico:"dyn"},
    {act:"qpTog", n:"خصائص سريعة",ico:"qp"},
    {act:"rclick",n:"الزرّ الأيمن", ico:"ctx"}),
  G({act:"cmdMode",  n:"موضع سطر الأوامر",ico:"cmdl"},
    {act:"cmdFloat", n:"سطر أوامر عائم",  ico:"float"},
    {act:"cmdBottom",n:"أعِده إلى الأسفل",ico:"down"})]},

 {id:"disp", n:"عرض الأجسام", dlg:"proj", items:[
  G({tog:"#oJoins",n:"دمج الأركان",     ico:"weld"},
    {tog:"#oSolo", n:"أعمدة مستقلّة",   ico:"col"},
    {act:"projDlg",n:"تعبئة الجدران …",ico:"props"})]},

 {id:"pan", n:"لوحات", items:[
  G({act:"propsDlg",n:"الخصائص",ico:"panel"},
    {act:"laysDlg", n:"الطبقات",ico:"layers"},
    {act:"inspDlg", n:"الفاحص", ico:"inspect"}),
  G({act:"refDlg",  n:"المرجع",ico:"ref"},
    {act:"sheetDlg",n:"الورقة",ico:"sheet"},
    {act:"stateDlg",n:"الحالة",ico:"grid"}),
  G({act:"schedDlg", n:"جدول المساحات",ico:"table"},
    {act:"oschedDlg",n:"جدول الفتحات", ico:"table"},
    {act:"defsDlg",  n:"الافتراضات",   ico:"shell"}),
  G({act:"aiDlg",n:"المساعد",ico:"ai"})]},

 {id:"dock", n:"الإرساء", items:[
  {act:"wsMenu",n:"أسطح العمل",ico:"ws",big:1},
  G({act:"wsArch", n:"معماري",ico:"wall"},
    {act:"wsAnnot",n:"تأشير", ico:"dim"},
    {act:"wsOut",  n:"إخراج", ico:"xport"}),
  G({act:"dockAutoS",n:"إخفاء العمود الأيمن",ico:"autohide"},
    {act:"dockTabS", n:"تبويبات الأيمن",     ico:"tabs"}),
  G({act:"dockAutoE",n:"إخفاء العمود الأيسر",ico:"autohide"},
    {act:"dockTabE", n:"تبويبات الأيسر",     ico:"tabs"})]}]},

{id:"mng", n:"إدارة", kt:"6", panels:[
 {id:"laym", n:"الطبقات", dlg:"lays", items:[
  {act:"laysDlg",n:"مدير الطبقات",ico:"layers",big:1},
  G({act:"lAll",   n:"أظهر الكل",  ico:"grid"},
    {act:"lUnlock",n:"افتح المقفل",ico:"unlock"})]},

 {id:"chk", n:"التدقيق", dlg:"insp", items:[
  {act:"inspect",n:"افحص",ico:"inspect",big:1}]},

 {id:"prj", n:"المشروع", dlg:"defs", items:[
  {act:"fnew",    n:"مشروع جديد",     ico:"fnew", big:1},
  {act:"defsDlg", n:"افتراضات الأدوات",ico:"shell",big:1},
  G({act:"dRst",n:"أعِد المصنع",ico:"undo"},
    {act:"undo", n:"تراجع",     ico:"undo"},
    {act:"redo", n:"إعادة",     ico:"redo"})]}]},

{id:"out", n:"إخراج", kt:"7", panels:[
 {id:"sht", n:"الورقة", dlg:"sheet", items:[
  {act:"sheetDlg",n:"الورقة والعنوان",ico:"sheet",big:1},
  G({act:"shCenter",n:"تمركز على الرسم",ico:"fit"})]},

 {id:"exp", n:"التصدير", dlg:"export", items:[
  {act:"xDxf",n:"DXF",ico:"dxf",big:1},
  {act:"xSvg",n:"SVG",ico:"svg",big:1},
  G({act:"xPng",n:"PNG",ico:"png"},
    {act:"xPdf",n:"PDF",ico:"pdf"}),
  G({act:"asCsv",n:"مساحات CSV",ico:"csv"},
    {act:"osCsv",n:"فتحات CSV", ico:"csv"})]},

 {id:"fil", n:"الملفّ", items:[
  {act:"xSave",n:"احفظ",ico:"save",big:1},
  {act:"xOpen",n:"افتح", ico:"open",big:1},
  {act:"fnew", n:"جديد", ico:"fnew",big:1}]}]}
];

/* ═══ التبويبات السياقية ═══
   تظهر عند تحديدٍ متجانس، وتزول بزواله. أوامرها هي أوامر النوع
   لا أكثر — فلا يظهر «إزاحة» عند تحديد بُعد. */
const CTX_COMMON=(kind)=>({id:"ctx-act", n:"المحدَّد", items:[
 {act:"propsDlg",n:"الخصائص",ico:"props",big:1},
 {act:"delSel",  n:"حذف",    ico:"del",  big:1}]});

export const CTX={
 wall:{n:"جدار", panels:[
  {id:"cw1", n:"تعديل الجدار", items:[
   {cmd:"offset",n:"إزاحة",ico:"offset",big:1},
   {cmd:"weld",  n:"لحم",  ico:"weld",  big:1},
   {cmd:"chamfer",n:"كسر الركن",ico:"chamfer",big:1},
   G({cmd:"break", n:"قطع",  ico:"brk"},
     {cmd:"divide",n:"قسمة", ico:"divide"},
     {cmd:"trim",  n:"قصّ",   ico:"trim"}),
   G({cmd:"extend", n:"تمديد",ico:"extend"},
     {cmd:"stretch",n:"شدّ",   ico:"stretch"},
     {cmd:"match",  n:"مطابقة",ico:"match"})]},
  {id:"cw2", n:"فتحات عليه", items:[
   G({cmd:"door",n:"باب", ico:"door"},
     {cmd:"win", n:"شباك",ico:"window"},
     {cmd:"niche",n:"كوّة",ico:"niche"})]},
  CTX_COMMON("wall")]},

 open:{n:"فتحة", panels:[
  {id:"co1", n:"الفتحة", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1},
   G({act:"oschedDlg",n:"جدول الفتحات",ico:"table"},
     {act:"osCsv",    n:"CSV",          ico:"csv"})]},
  CTX_COMMON("open")]},

 area:{n:"منطقة", panels:[
  {id:"ca1", n:"المنطقة", items:[
   {cmd:"arearef",n:"تحديث",ico:"arearef",big:1},
   G({act:"nameSeq", n:"سمِّ بالتسلسل",  ico:"renum"},
     {act:"schedDlg",n:"جدول المساحات",ico:"table"},
     {act:"asCsv",   n:"CSV",           ico:"csv"})]},
  CTX_COMMON("area")]},

 dim:{n:"بُعد", panels:[
  {id:"cd1", n:"البُعد", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1},
   G({act:"clrDimTxt",n:"امسح النصّ البديل",ico:"del"})]},
  CTX_COMMON("dim")]},

 chain:{n:"سلسلة", panels:[
  {id:"cc1", n:"السلسلة", items:[
   {cmd:"chaincmp",n:"قارن بالهندسة",ico:"chaincmp",big:1}]},
  CTX_COMMON("chain")]},

 anno:{n:"تأشير", panels:[
  {id:"ct1", n:"التأشير", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1}]},
  CTX_COMMON("anno")]},

 col:{n:"عمود", panels:[
  {id:"ck1", n:"العمود", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1},
   G({act:"renumCols",n:"أعد الترقيم",ico:"renum"}),
   G({cmd:"array",     n:"مصفوفة",       ico:"array"},
     {cmd:"arraypolar",n:"مصفوفة قطبية",ico:"arraypol"})]},
  CTX_COMMON("col")]},

 fix:{n:"أداة صحية", panels:[
  {id:"cf1", n:"الأداة", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1},
   G({act:"fixSnap",n:"ألصِق بأقرب جدار",ico:"weld"})]},
  CTX_COMMON("fix")]},

 stair:{n:"درج", panels:[
  {id:"cs1", n:"الدرج", items:[
   {cmd:"match",n:"مطابقة",ico:"match",big:1}]},
  CTX_COMMON("stair")]}
};
/* ═══ شريط الوصول السريع ═══ */
export const QAT=[
 {act:"fnew", n:"جديد", ico:"fnew"},
 {act:"xOpen",n:"افتح", ico:"open"},
 {act:"xSave",n:"احفظ", ico:"save"},
 {act:"xPdf", n:"طبع PDF",ico:"print"},
 {sep:1},
 {act:"undo",n:"تراجع", ico:"undo"},
 {act:"redo",n:"إعادة", ico:"redo"},
 {sep:1},
 {act:"fit",  n:"ملاءمة",ico:"fit"},
 {act:"inspect",n:"افحص",ico:"inspect"}
];
/* ═══ استخلاصٌ للفحص الساكن ═══ */
const walk=(items,fn)=>(items||[]).forEach(it=>{
 if(it.group)walk(it.group,fn); else fn(it);
});
export function allItems(){
 const out=[];
 const tabs=RIBBON.concat(Object.keys(CTX).map(k=>CTX[k]));
 tabs.forEach(t=>(t.panels||[]).forEach(p=>walk(p.items,i=>out.push(i))));
 walk(QAT,i=>{if(!i.sep)out.push(i)});
 return out;
}
export const ribbonCmds=()=>[...new Set(allItems()
 .filter(i=>i.cmd).map(i=>i.cmd))];
export const ribbonActs=()=>[...new Set(allItems()
 .filter(i=>i.act).map(i=>i.act))];
export const ribbonIcons=()=>[...new Set(allItems()
 .filter(i=>i.ico).map(i=>i.ico))];
export const ribbonDlgs=()=>[...new Set([]
 .concat(...RIBBON.map(t=>(t.panels||[]).map(p=>p.dlg)))
 .filter(Boolean))];
export const tabIds=()=>RIBBON.map(t=>t.id);
export const panelIdList=()=>[]
 .concat(...RIBBON.map(t=>(t.panels||[]).map(p=>t.id+"/"+p.id)));
