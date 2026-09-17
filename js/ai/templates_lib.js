/* ═══ معرض القوالب الجاهزة ═══
   يستخدم الكتل البارامترية في smartblocks.js لتكوين نماذج أكبر
   (شقق، فلل، مكاتب). القوالب هنا لا تستعمل كتلة البابِ ذات
   المرحلتين، فتُثبَّت عملياتها كلها في نداءٍ واحد. */
import {blockOps} from "./smartblocks.js";
import {validate} from "./ops.js";
import {runOps} from "./opsrun.js";

export const TEMPLATES = {
  apt_small: { id: "apt_small", label: "شقة صغيرة", cat:"سكني",
    desc: "صالة + غرفة نوم + مطبخ + حمام (7×8)",
    place: [
      {block: "room", at: [0,0], params: {w:4, h:4, name: "صالة"}},
      {block: "room", at: [4,0], params: {w:4, h:4, name: "غرفة"}},
      {block: "kitchen", at: [0,4], params: {w:3, h:3}},
      {block: "bath", at: [3,4], params: {w:1.5, h:2}}
    ]
  },
  villa_gf: { id: "villa_gf", label: "فيلا دور أرضي مبسط", cat:"سكني",
    desc: "مجلس + صالة + مطبخ + طعام ضيوف (10×12)",
    place: [
      {block: "room", at: [0,0], params: {w:5, h:6, name: "مجلس"}},
      {block: "room", at: [5,0], params: {w:5, h:6, name: "صالة"}},
      {block: "kitchen", at: [0,6], params: {w:4, h:4}},
      {block: "bath", at: [4,6], params: {w:1.5, h:2}},
      {block: "room", at: [6,6], params: {w:4, h:4, name: "طعام"}}
    ]
  },
  office: { id: "office", label: "مكتب مفتوح + غرفة اجتماعات", cat:"تجاري",
    desc: "مساحة عمل مفتوحة + غرفة اجتماعات (8×10)",
    place: [
      {block: "room", at: [0,0], params: {w:6, h:8, name: "مكتب"}},
      {block: "room", at: [6,0], params: {w:4, h:4, name: "اجتماعات"}},
      {block: "bath", at: [6,5], params: {w:1.5, h:2}}
    ]
  }
};

export const templateList = Object.values(TEMPLATES)
  .map(t => ({id: t.id, label: t.label, cat: t.cat, desc: t.desc, blocks: t.place.length}));

export function template(templateId) {
  const t = TEMPLATES[templateId];
  if (!t) return {ops:[], unknown: templateId};
  const ops = [];
  t.place.forEach(item => {
    const built = blockOps(item.block, item.at, item.params);
    ops.push(...(built.ops || []));
  });
  return {ops};
}

export function placeTemplate(templateId, {commit=false}={}) {
  const {ops, unknown} = template(templateId);
  if (unknown) return {error: `قالب غير معروف: ${unknown}`, ops:[], valid:false};
  const {ok, bad} = validate(ops);
  const report = {template: templateId, generated: ops.length, valid: ok.length, rejected: bad};
  if (commit && ok.length) { report.result = runOps(ok); report.committed = true; }
  return report;
}
