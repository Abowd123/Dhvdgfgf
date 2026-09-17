/* ═══ صورة مرجعية للتتبّع والمعايرة ═══ */
const st = { src: null, img: null, x: 0, y: 0, mpp: 0.01, rot: 0, opacity: 0.5, visible: true, locked: false, w: 0, h: 0 };
let notify = () => {};
export const state = () => ({ ...st });
export const onChange = fn => { notify = fn || (() => {}); };
export function setImage(src) {
  st.src = src;
  if (typeof Image === "undefined") { notify(); return; }
  const im = new Image();
  im.onload = () => { st.img = im; st.w = im.naturalWidth; st.h = im.naturalHeight; notify(); };
  im.src = src;
}
export const setOpacity = v => { st.opacity = Math.min(1, Math.max(0, +v || 0)); notify(); };
export const setVisible = v => { st.visible = !!v; notify(); };
export const setLocked = v => { st.locked = !!v; notify(); };
export const move = (x, y) => { if (!st.locked) { st.x = +x || 0; st.y = +y || 0; notify(); } };
export const setRotation = r => { st.rot = +r || 0; notify(); };
export const setScale = mpp => { st.mpp = Math.max(1e-9, +mpp || st.mpp); notify(); };
export function calibrate(p1, p2, realMeters) {
  const cur = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (cur <= 0 || realMeters <= 0) return st.mpp;
  st.mpp *= realMeters / cur; notify(); return st.mpp;
}
export function draw(ctx, worldToScreen, pxPerWorld) {
  if (!st.visible || !st.img) return;
  const o = worldToScreen([st.x, st.y]);
  const sw = st.w * st.mpp * pxPerWorld, sh = st.h * st.mpp * pxPerWorld;
  ctx.save(); ctx.globalAlpha = st.opacity; ctx.translate(o[0], o[1]); ctx.rotate(-st.rot);
  ctx.drawImage(st.img, 0, -sh, sw, sh); ctx.restore();
}
export const toJSON = () => ({ src: st.src, x: st.x, y: st.y, mpp: st.mpp, rot: st.rot, opacity: st.opacity, visible: st.visible });
export function fromJSON(d) {
  if (!d) return;
  Object.assign(st, { x: d.x || 0, y: d.y || 0, mpp: d.mpp || 0.01, rot: d.rot || 0, opacity: d.opacity ?? 0.5, visible: d.visible !== false });
  if (d.src) setImage(d.src);
}