/* ═══ حوار استعادة ما بعد التعطّل (لوحدة persist.js الاختيارية) ═══
   يُعرَض عند الإقلاع إن وُجدت لقطةٌ محفوظة. يرث theme.css.
   ⚠ غير مربوطٍ تلقائياً بـ app.js — انظر ملاحظة التكامل في
   core/persist.js قبل استخدامه، فمِسطَر لديه استعادة جلسةٍ فعليّة
   مبنيّة أصلاً في core/state.js. */
export function maybeOfferRecovery(autosave){
 return autosave.peek().then(info=>{
  if(!info) return false;
  return new Promise(res=>{
   const ov=document.createElement("div");
   ov.className="rc-overlay"; ov.dir="rtl";
   const when=new Date(info.ts).toLocaleString("ar");
   ov.innerHTML=`
    <div class="rc-box" role="dialog" aria-modal="true"
      aria-label="استعادة عمل سابق">
      <h3 class="rc-title">وُجد عملٌ غير محفوظ</h3>
      <p class="rc-msg">هناك نسخةٌ محفوظة تلقائياً من ${when}.
        هل تريد استعادتها؟</p>
      <div class="rc-btns">
        <button class="rc-yes">استعادة</button>
        <button class="rc-no">تجاهل</button>
      </div>
    </div>`;
   document.body.appendChild(ov);
   const done=(v)=>{ ov.remove(); res(v); };
   ov.querySelector(".rc-yes").addEventListener("click",async()=>{
    await autosave.recover(); done(true); });
   ov.querySelector(".rc-no").addEventListener("click",()=>{
    autosave.clear(); done(false); });
  });
 });
}
