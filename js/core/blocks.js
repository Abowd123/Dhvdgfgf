/* ═══ مكتبة العناصر/الرموز (Blocks) ═══
   الكتلة مجموعة أوّليات محلية بالمليمتر. المثيل مرجع وتحويل
   (موضع/دوران/مقياس/مرآة/طبقة)، وexplode يعيد أوّليات عالمية. */

const DEFS = new Map();
let seq = 1;

export function defineBlock(def) {
  if (!def || !def.name) throw new Error("block: name مطلوب");
  const d = { base: [0, 0], prims: [], ...def };
  if (!Array.isArray(d.prims)) d.prims = [];
  DEFS.set(String(d.name), d);
  return d;
}
export const getBlock = name => DEFS.get(name) || null;
export const hasBlock = name => DEFS.has(name);
export const blockList = () =>
  [...DEFS.values()].map(d => ({ name: d.name, title: d.title || d.name }));
export const removeBlock = name => DEFS.delete(name);

export function defineFromPrims(name, title, prims, base = [0, 0]) {
  const local = (prims || []).map(p => translate(p, -(base[0] || 0), -(base[1] || 0)));
  return defineBlock({ name, title, prims: local, base: [0, 0] });
}

export function makeInstance(name, opts = {}) {
  if (!DEFS.has(name)) throw new Error("block غير معرّف: " + name);
  return {
    id: opts.id || "b" + seq++,
    block: name,
    x: Number.isFinite(+opts.x) ? +opts.x : 0,
    y: Number.isFinite(+opts.y) ? +opts.y : 0,
    rot: Number.isFinite(+opts.rot) ? +opts.rot : 0,
    scale: Number.isFinite(+opts.scale) && +opts.scale > 0 ? +opts.scale : 1,
    mirror: !!opts.mirror,
    layer: opts.layer || "0"
  };
}

function xform(inst) {
  const c = Math.cos(inst.rot || 0), s = Math.sin(inst.rot || 0);
  const k = Number.isFinite(+inst.scale) && +inst.scale > 0 ? +inst.scale : 1;
  const mx = inst.mirror ? -1 : 1;
  return ([px, py]) => {
    const lx = px * k * mx, ly = py * k;
    return [inst.x + lx * c - ly * s, inst.y + lx * s + ly * c];
  };
}

function arcPts(c, r, a0, a1) {
  const span = a1 - a0;
  const n = Math.max(2, Math.ceil(Math.abs(span) / (Math.PI / 12)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + span * i / n;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

export function explode(inst) {
  const def = DEFS.get(inst && inst.block);
  if (!def) return [];
  const T = xform(inst), out = [];
  for (const p of def.prims) {
    if (p.t === "line") {
      out.push({ t: "line", a: T(p.a), b: T(p.b), layer: inst.layer });
    } else if (p.t === "pline") {
      out.push({ t: "pline", pts: p.pts.map(T), closed: !!p.closed, layer: inst.layer });
    } else if (p.t === "circle") {
      out.push({ t: "pline", pts: arcPts(p.c, p.r, 0, Math.PI * 2).map(T), closed: true, layer: inst.layer });
    } else if (p.t === "arc") {
      out.push({ t: "pline", pts: arcPts(p.c, p.r, p.a0, p.a1).map(T), closed: false, layer: inst.layer });
    }
  }
  return out;
}

export function bbox(inst) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of explode(inst)) {
    const pts = p.t === "line" ? [p.a, p.b] : p.pts;
    for (const [x, y] of pts) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

export const toJSON = () => ({ defs: [...DEFS.values()] });
export function fromJSON(data) {
  if (!data || !Array.isArray(data.defs)) return;
  DEFS.clear();
  data.defs.forEach(d => defineBlock(d));
}

function translate(p, dx, dy) {
  const t = ([x, y]) => [x + dx, y + dy];
  if (p.t === "line") return { ...p, a: t(p.a), b: t(p.b) };
  if (p.t === "pline") return { ...p, pts: p.pts.map(t) };
  if (p.t === "circle" || p.t === "arc") return { ...p, c: t(p.c) };
  return p;
}

export function installDefaults() {
  [
    { name: "door", title: "باب مفرد", prims: [
      { t: "line", a: [0, 0], b: [0, 900] },
      { t: "arc", c: [0, 0], r: 900, a0: 0, a1: Math.PI / 2 }
    ]},
    { name: "window", title: "نافذة", prims: [
      { t: "line", a: [0, 0], b: [1200, 0] },
      { t: "line", a: [0, 200], b: [1200, 200] },
      { t: "line", a: [0, 100], b: [1200, 100] }
    ]},
    { name: "table", title: "طاولة", prims: [
      { t: "pline", pts: [[0, 0], [1200, 0], [1200, 700], [0, 700]], closed: true }
    ]}
  ].forEach(defineBlock);
}