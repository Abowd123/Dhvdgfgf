/* ═══ أداة إدراج العناصر ═══ */
import { makeInstance } from "../core/blocks.js";
import { edit } from "../core/state.js";
import { H } from "./registry.js";

let hooks = null;
let active = null;

export function initBlockTool(h) { hooks = h || null; }
export const isInserting = () => !!active;
export const ghost = () => active;
const snap = w => (hooks && hooks.snap && hooks.snap(w)) || w;
const defaultLayer = () => typeof hooks?.defaultLayer === "function"
  ? hooks.defaultLayer() : (hooks?.defaultLayer || "0");

export function startInsert(name, opts = {}) {
  active = {
    block: name, x: 0, y: 0,
    rot: Number.isFinite(+opts.rot) ? +opts.rot : 0,
    scale: Number.isFinite(+opts.scale) && +opts.scale > 0 ? +opts.scale : 1,
    mirror: !!opts.mirror, layer: opts.layer || defaultLayer()
  };
  H.rep?.("in", "إدراج: انقر للموضع · R تدوير · M مرآة · Esc إلغاء");
  hooks?.redraw?.();
  return active;
}

export function onMove(world) {
  if (!active) return;
  const p = snap(world);
  active.x = p[0] ?? p.x ?? 0;
  active.y = p[1] ?? p.y ?? 0;
  hooks?.redraw?.();
}

export function onClick(world) {
  if (!active) return null;
  const p = snap(world);
  const x = p[0] ?? p.x ?? 0, y = p[1] ?? p.y ?? 0;
  const inst = makeInstance(active.block, {
    x, y, rot: active.rot, scale: active.scale,
    mirror: active.mirror, layer: active.layer
  });
  edit(() => hooks?.addInstance?.(inst), "إدراج " + active.block);
  H.rep?.("in", "أُدرج عنصر");
  hooks?.redraw?.();
  return inst;
}

export function onKey(e) {
  if (!active) return false;
  if (e.key === "Escape") { cancel(); return true; }
  if (e.key === "r" || e.key === "R") {
    active.rot += (e.shiftKey ? -1 : 1) * Math.PI / 2;
    hooks?.redraw?.(); return true;
  }
  if (e.key === "m" || e.key === "M") {
    active.mirror = !active.mirror;
    hooks?.redraw?.(); return true;
  }
  if (e.key === "+" || e.key === "=") {
    active.scale *= 1.1; hooks?.redraw?.(); return true;
  }
  if (e.key === "-" || e.key === "_") {
    active.scale /= 1.1; hooks?.redraw?.(); return true;
  }
  return false;
}

export function cancel() {
  active = null;
  H.rep?.("in", "أُلغي الإدراج");
  hooks?.redraw?.();
}