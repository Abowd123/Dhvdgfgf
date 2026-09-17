import assert from "node:assert/strict";
import { defineBlock, makeInstance, explode, bbox, installDefaults, blockList, toJSON, fromJSON, hasBlock } from "../core/blocks.js";
let p = 0, f = 0;
const test = (n, fn) => { try { fn(); p++; console.log("✓ " + n); } catch (e) { f++; console.error("✗ " + n + " → " + (e.message || e)); } };
const approx = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≈ ${b}`);
test("تعريف كتلة وإدراج مثيل", () => {
  defineBlock({ name: "seg", title: "قطعة", prims: [{ t: "line", a: [0, 0], b: [1000, 0] }] });
  assert.ok(hasBlock("seg"));
  const pr = explode(makeInstance("seg", { x: 2000, y: 3000 }));
  assert.deepEqual(pr[0].a, [2000, 3000]); assert.deepEqual(pr[0].b, [3000, 3000]);
});
test("الدوران 90°", () => { const pr = explode(makeInstance("seg", { rot: Math.PI / 2 })); approx(pr[0].b[0], 0); approx(pr[0].b[1], 1000); });
test("المقياس والمرآة", () => { approx(explode(makeInstance("seg", { scale: 2 }))[0].b[0], 2000); approx(explode(makeInstance("seg", { mirror: true }))[0].b[0], -1000); });
test("المكتبة المدمجة", () => { installDefaults(); const names = blockList().map(b => b.name); ["door", "window", "table"].forEach(n => assert.ok(names.includes(n))); });
test("صندوق الإحاطة", () => { const bb = bbox(makeInstance("seg")); approx(bb.minX, 0); approx(bb.maxX, 1000); });
test("الحفظ والاسترجاع", () => { const snap = toJSON(); fromJSON({ defs: [] }); assert.equal(hasBlock("seg"), false); fromJSON(snap); assert.equal(hasBlock("seg"), true); });
console.log(`\n${p} ناجح، ${f} فاشل`); process.exit(f ? 1 : 0);