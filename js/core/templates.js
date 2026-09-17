/* ═══ قوالب مشاريع جاهزة ═══ */
const T = new Map();
export function defineTemplate(t) { if (!t || !t.name) throw new Error("template: name"); T.set(t.name, t); return t; }
export const templateList = () => [...T.values()].map(t => ({ name: t.name, title: t.title || t.name }));
export const getTemplate = name => T.get(name) || null;
export function build(name) {
  const t = T.get(name); if (!t) return null;
  return typeof t.build === "function" ? t.build() : JSON.parse(JSON.stringify(t.seed || {}));
}
export function apply(name, hooks) {
  const seed = build(name); if (!seed || !hooks) return null;
  (seed.walls || []).forEach(w => hooks.addWall?.(w));
  (seed.blocks || []).forEach(b => hooks.addBlock?.(b));
  if (seed.meta && hooks.setMeta) hooks.setMeta(seed.meta);
  return seed;
}
const room = (w, h, th = 150) => [
  { a: [0, 0], b: [w, 0], th }, { a: [w, 0], b: [w, h], th },
  { a: [w, h], b: [0, h], th }, { a: [0, h], b: [0, 0], th }
];
export function installDefaults() {
  defineTemplate({ name: "room", title: "غرفة مستطيلة", build: () => ({
    walls: room(4000, 3000), blocks: [{ block: "door", x: 1600, y: 0, rot: 0 }], meta: { scale: 50 }
  })});
  defineTemplate({ name: "studio", title: "استوديو", build: () => ({
    walls: room(6000, 4000), blocks: [
      { block: "door", x: 2500, y: 0, rot: 0 }, { block: "window", x: 4300, y: 4000, rot: 0 }
    ], meta: { scale: 75 }
  })});
  defineTemplate({ name: "office", title: "مكتب", build: () => ({
    walls: [...room(8000, 5000), { a: [5000, 0], b: [5000, 5000], th: 150 }],
    blocks: [
      { block: "door", x: 2000, y: 0, rot: 0 }, { block: "door", x: 5600, y: 2500, rot: Math.PI / 2 },
      { block: "window", x: 6300, y: 5000, rot: 0 }
    ], meta: { scale: 100 }
  })});
}