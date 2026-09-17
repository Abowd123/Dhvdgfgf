/* ═══ لوحة العناصر: نقر أو سحب لبدء إدراج كتلة ═══ */
import { blockList, makeInstance, explode, bbox } from "../core/blocks.js";
import { startInsert } from "../tools/blocks.js";
import { pal } from "./theme.js";

const ID = "blkPanel";
let root = null, listEl = null, mounted = false;

function injectCss() {
  if (document.getElementById("blk-css")) return;
  const css = `
#${ID}{position:fixed;inset-block:56px auto;inset-inline-start:12px;z-index:38;
 width:194px;max-height:min(70vh,560px);display:flex;flex-direction:column;
 background:var(--bg2,#1a1d21);color:var(--fg,#e9edf2);
 border:1px solid var(--ln,#2a2f36);border-radius:8px;
 box-shadow:0 12px 34px rgba(0,0,0,.42);overflow:hidden;font:12.5px/1.4 var(--ui,system-ui,sans-serif)}
#${ID}[hidden]{display:none}#${ID} .blk-h{display:flex;align-items:center;padding:8px 10px;
 background:var(--bg3,#20242a);border-bottom:1px solid var(--ln,#2a2f36)}
#${ID} .blk-title{font-weight:600}#${ID} .blk-x{margin-inline-start:auto;background:none;border:0;
 cursor:pointer;color:var(--fg3,#8a929c);font-size:14px;padding:2px 5px}
#${ID} .blk-body{overflow-y:auto;padding:8px;display:grid;grid-template-columns:repeat(2,1fr);
 gap:6px;align-content:start}#${ID} .blk-it{display:flex;flex-direction:column;align-items:center;
 gap:4px;padding:6px 4px;cursor:pointer;border-radius:7px;color:var(--fg2,#c4ccd6);
 background:var(--bg2,#1a1d21);border:1px solid var(--ln2,#333a42)}
#${ID} .blk-it:hover{border-color:var(--ac,#6ea8fe);color:var(--fg,#e9edf2)}
#${ID} .blk-th{width:100%;height:38px;border-radius:5px;background:var(--bg3,#20242a)}
#${ID} .blk-lbl{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}`;
  const st = document.createElement("style");
  st.id = "blk-css"; st.textContent = css; document.head.appendChild(st);
}

function thumb(name) {
  const w = 46, h = 38, pad = 6, cv = document.createElement("canvas");
  cv.width = w; cv.height = h; cv.className = "blk-th";
  const ctx = cv.getContext("2d"), inst = makeInstance(name), prims = explode(inst), bb = bbox(inst);
  const bw = Math.max(1e-6, bb.maxX - bb.minX), bh = Math.max(1e-6, bb.maxY - bb.minY);
  const s = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh);
  const ox = (w - bw * s) / 2 - bb.minX * s, oy = (h - bh * s) / 2 - bb.minY * s;
  const T = ([x, y]) => [ox + x * s, h - (oy + y * s)];
  ctx.strokeStyle = pal().dflt || "#e9edf2"; ctx.lineWidth = 1.2;
  for (const p of prims) {
    ctx.beginPath();
    if (p.t === "line") { const a = T(p.a), b = T(p.b); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    else { p.pts.forEach((pt, i) => { const q = T(pt); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); if (p.closed) ctx.closePath(); }
    ctx.stroke();
  }
  return cv;
}

function build() {
  injectCss();
  root = document.getElementById(ID);
  if (!root) {
    root = document.createElement("aside");
    root.id = ID; root.hidden = true; root.dir = "rtl";
    root.innerHTML = `<header class="blk-h"><span class="blk-title">العناصر</span>
      <button class="blk-x" data-act="close" title="إغلاق">✕</button></header><div class="blk-body"></div>`;
    document.body.appendChild(root);
  }
  listEl = root.querySelector(".blk-body");
  root.addEventListener("click", onClick);
}
function render() {
  if (!listEl) return;
  listEl.innerHTML = "";
  for (const b of blockList()) {
    const it = document.createElement("button");
    it.className = "blk-it"; it.dataset.name = b.name; it.title = b.title; it.draggable = true;
    it.appendChild(thumb(b.name));
    const lbl = document.createElement("span"); lbl.className = "blk-lbl"; lbl.textContent = b.title;
    it.appendChild(lbl);
    it.addEventListener("dragstart", e => e.dataTransfer.setData("application/x-mistar-block", b.name));
    listEl.appendChild(it);
  }
}
function onClick(e) {
  const act = e.target.closest("[data-act]");
  if (act?.dataset.act === "close") return closeBlockPanel();
  const it = e.target.closest(".blk-it");
  if (it) startInsert(it.dataset.name);
}
export function initBlockPanel() { if (mounted) return; build(); mounted = true; render(); }
export function openBlockPanel() { if (!mounted) initBlockPanel(); root.hidden = false; render(); }
export function closeBlockPanel() { if (root) root.hidden = true; }
export function toggleBlockPanel() { if (!mounted) initBlockPanel(); root.hidden = !root.hidden; if (!root.hidden) render(); }