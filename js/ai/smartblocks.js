/* ═══ مكتبة الكتل الذكية البارامترية ═══
   كل كتلة تصف كيف تُبنى (جدران + منطقة اختيارية)، وتمرّ عبر نفس
   مدقِّق مسار المزوّد (validate/runOps في ops.js وopsrun.js) —
   فلا فرق بين ما يُدرجه المستخدم من هنا وما يقترحه المزوّد؛ كلاهما
   يمرّان بالحرس نفسه (EDGE وMINW ورفض التراكب...).

   الأبواب حالةٌ خاصّة: عملية "open" تحتاج معرّف جدارٍ قائم (مثل
   W7)، والمعرّف لا يُعرَف إلا بعد إدراج الجدار فعلياً. لذا تُبنى
   كتلة البابِ على مرحلتين: تُثبَّت الجدران أولاً، ثم يُقرأ معرّف
   الجدار المُدرَج من نتيجة runOps ليُبنى عليه عملية الفتح وتُثبَّت
   في خطوة ثانية. كل كتلةٍ أخرى بلا باب تبقى مرحلةً واحدة. */
import {validate} from "./ops.js";
import {runOps} from "./opsrun.js";

/* دالة مساعدة لبناء جدران مستطيل. الجدار الأول (فهرس 0) هو الضلع
   الجنوبي من [x,y] إلى [x1,y] — وهو الذي تُفتَح فيه الأبواب. */
function rect(org, w, h, {t=0.2, type="int", align="c"}={}) {
  const [x,y] = org, x1 = x+w, y1 = y+h;
  return [
    {op:"wall", a:[x,y], b:[x1,y], t, type, align},
    {op:"wall", a:[x1,y], b:[x1,y1], t, type, align},
    {op:"wall", a:[x1,y1], b:[x,y1], t, type, align},
    {op:"wall", a:[x,y1], b:[x,y], t, type, align}
  ];
}

export const BLOCKS = {
  room: { id: "room", label: "غرفة", cat:"معماري",
    params: {w:4, h:4, name:""}, def:{w:4, h:4, name:""},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.2, type:"ext"});
      if (String(p.name).trim()) {
        ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:String(p.name).trim()});
      }
      return {ops};
    }
  },
  iconDoor: { id: "iconDoor", label: "غرفة بباب", cat:"معماري",
    params: {w:4, h:4, dX:0.9, dMin:0.6, name:"غرفة"}, def:{w:4, h:4, dX:0.9, dMin:0.6, name:"غرفة"},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.2, type:"ext"});
      /* عرض الباب مضبوطٌ بين حدّ أدنى (dMin) وأقلّ قليلاً من طول
         الجدار الجنوبي (p.w) حتى لا يُرفَض لعدم كفاية الحافة (EDGE) */
      const doorW = Math.min(Math.max(+p.dX || 0.9, +p.dMin || 0.4), Math.max(0.4, p.w - 0.4));
      const door = {wallIndex: 0, at: p.w/2, w: doorW, kind: "door"};
      return {ops, door};
    }
  },
  bath: { id: "bath", label: "حمام صغير", cat:"معماري",
    params: {w:1.5, h:2}, def:{w:1.5, h:2},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.15, type:"int"});
      ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:"حمام"});
      return {ops};
    }
  },
  kitchen: { id: "kitchen", label: "مطبخ", cat:"معماري",
    params: {w:3, h:2}, def:{w:3, h:2},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.15, type:"int"});
      ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:"مطبخ"});
      return {ops};
    }
  }
  /* لا كتلة لشبكة أعمدة: مفردات ops.js مغلقةٌ بقصد ولا تحوي عملية
     إنشاء عمود (field يُعدِّل عموداً قائماً فقط) — فأي كتلةٍ كهذه
     سترفض ١٠٠٪ من عملياتها. أُسقِطت بدل أن تعرض زراً لا يعمل. */
};

export const blockList = Object.values(BLOCKS)
  .map(b => ({id: b.id, label: b.label, cat: b.cat, params: b.params}));

/* يبني عمليات الكتلة دون تثبيت — للمعاينة أو للاستخدام من قِبل
   القوالب. يعيد {ops, door?, unknown?} */
export function blockOps(blockId, org, params) {
  const b = BLOCKS[blockId];
  if (!b) return {ops:[], unknown: blockId};
  const v = (params && typeof params === "object") ? {...b.def, ...params} : b.def;
  return b.build(org, v);
}

export function placeBlock(blockId, org, params, {commit=false}={}) {
  const b = BLOCKS[blockId];
  if (!b) return {error: `كتلة غير معروفة: ${blockId}`, ops:[], valid:false};
  const built = blockOps(blockId, org, params);
  const ops = built.ops || [];
  const {ok, bad} = validate(ops);
  const report = {block: blockId, generated: ops.length, valid: ok.length, rejected: bad};
  if (!commit || !ok.length) return report;

  report.result = runOps(ok);
  report.committed = true;

  /* المرحلة الثانية: البحث عن معرّف الجدار المُدرَج فعلياً ثم فتح
     الباب عليه. لو رُفض الجدار المقصود (نادرٌ مع الأبعاد الافتراضية)
     فلن يُوجَد معرّفٌ مطابق ويُترَك الباب دون إدراج مع بيان السبب. */
  if (built.door && report.result && Array.isArray(report.result.made)) {
    const wallIds = report.result.made.filter(m => m.k === "wall").map(m => m.id);
    const wallId = wallIds[built.door.wallIndex];
    if (wallId) {
      const doorOp = {op:"open", wall: wallId, at: built.door.at,
        kind: built.door.kind || "door", w: built.door.w};
      const dv = validate([doorOp]);
      if (dv.ok.length) {
        report.doorResult = runOps(dv.ok);
      } else {
        report.doorRejected = dv.bad;
      }
    } else {
      report.doorRejected = [{i:0, why:"الجدار المقصود للباب لم يُدرَج"}];
    }
  }
  return report;
}
