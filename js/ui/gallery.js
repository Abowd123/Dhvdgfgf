/* ═══ واجهة معرض القوالب والكتل الذكية ═══
   نافذةٌ عائمة بتبويبين: قوالب جاهزة (مبانٍ كاملة) وكتل بارامترية
   (عناصر مفردة). كل بطاقة تُدرِج عند النقر مباشرة عند نقطة الأصل
   [0,0] وتمرّ عبر المدقّق (validate) قبل أي كتابة في الحالة. */
import {templateList, placeTemplate} from "../ai/templates_lib.js";
import {blockList, placeBlock} from "../ai/smartblocks.js";

export function createGallery(opts={}) {
  const onDone = typeof opts.onDone === "function" ? opts.onDone : ()=>{};

  const root = document.createElement("div");
  root.className = "gal"; root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "معرض القوالب والكتل");
  root.dir = "rtl"; root.hidden = true;

  root.innerHTML = `
    <div class="gal-head">
      <div class="gal-tabs" role="tablist">
        <button class="gal-tab is-on" data-tab="tpl" role="tab">قوالب جاهزة</button>
        <button class="gal-tab" data-tab="blk" role="tab">كتل بارامترية</button>
      </div>
      <button class="gal-close" type="button" aria-label="إغلاق">×</button>
    </div>
    <div class="gal-grid" role="tabpanel"></div>
  `;

  (opts.mount || document.body).appendChild(root);
  const grid = root.querySelector(".gal-grid");
  let tab = "tpl";

  function card(item, kind) {
    const c = document.createElement("button");
    c.className = "gal-card"; c.type = "button";
    c.innerHTML = `<span class="gal-card-title">${item.label}</span>
      <span class="gal-card-cat">${item.cat || ""}</span>
      <span class="gal-card-desc">${item.desc || (item.blocks ? item.blocks + " كتل" : "")}</span>`;

    c.addEventListener("click", () => {
      const rep = kind === "tpl"
        ? placeTemplate(item.id, {commit:true})
        : placeBlock(item.id, [0,0], null, {commit:true});
      onDone(item, rep);
      close();
    });
    return c;
  }

  function render() {
    grid.innerHTML = "";
    const items = tab === "tpl" ? templateList : blockList;
    items.forEach(it => grid.appendChild(card(it, tab)));

    root.querySelectorAll(".gal-tab").forEach(t => {
      t.classList.toggle("is-on", t.dataset.tab === tab);
      t.setAttribute("aria-selected", t.dataset.tab === tab ? "true" : "false");
    });
  }

  root.querySelectorAll(".gal-tab").forEach(t => {
    t.addEventListener("click", () => { tab = t.dataset.tab; render(); });
  });

  root.querySelector(".gal-close").addEventListener("click", () => close());
  window.addEventListener("keydown", e => { if (e.key === "Escape" && !root.hidden) close(); });

  function open() { root.hidden = false; render(); }
  function close() { root.hidden = true; }

  return { root, open, close, toggle: () => root.hidden ? open() : close() };
}
