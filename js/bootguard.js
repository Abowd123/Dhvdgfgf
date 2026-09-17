/* ═══ حرس الإقلاع ═══
   أوّل ما يُحمَّل، وورقةٌ في شجرة الاعتماد. يمسك عطب التحميل وعطب
   البناء وأيَّ وعدٍ مرفوض، ويكتب سبباً مرئياً — فالشاشة البيضاء
   الصامتة أسوأ ما قد يقع في برنامجٍ يحمل عمل المستخدم.

   ومنفذ إنقاذ: ?safe يتجاهل تفضيلات الواجهة والجلسة المحفوظة ولا
   يمحوهما — فتُفتَح النسخة السليمة ويُحفَظ الملفّ ثم يُصلَح ما فسد. */

export const SAFE=/[?&]safe\b/.test(location.search);
let DONE=false, SHOWN=false;

const box=()=>{
 let b=document.getElementById("bootErr");
 if(b)return b;
 b=document.createElement("div");
 b.id="bootErr";
 b.setAttribute("dir","rtl");
 b.style.cssText="position:fixed;inset-inline:0;inset-block-start:0;"
  +"z-index:9999;background:#3a1c1c;color:#ffd9d9;"
  +"border-block-end:1px solid #6b2b2b;padding:10px 14px;"
  +"font:13px/1.6 Tahoma,Arial,sans-serif;max-block-size:60vh;"
  +"overflow:auto;white-space:pre-wrap";
 (document.body||document.documentElement).appendChild(b);
 return b;
};
export function fatal(msg,where){
 SHOWN=true;
 const b=box();
 const line=(where?`[${where}] `:"")+String(msg==null?"":msg);
 b.appendChild(document.createTextNode(line+"\n"));
 if(!b.dataset.tail){
  b.dataset.tail="1";
  const a=document.createElement("div");
  a.style.cssText="margin-block-start:8px;color:#ffb3b3";
  a.textContent=SAFE
   ? "أنت في وضع الإنقاذ سلفاً — احفظ ملفّاً إن ظهر رسمك."
   : "جرّب وضع الإنقاذ: أضِف ?safe إلى العنوان — "
     +"يتجاهل التفضيلات المحفوظة ولا يمحوها.";
  b.appendChild(a);
 }
 return false;
}
/* يُنادى من آخر boot() فيُلغي المرقب */
export const bootOk=()=>{DONE=true};

addEventListener("error",e=>{
 if(DONE&&SHOWN)return;
 const m=e.error&&e.error.stack
  ? String(e.error.stack).split("\n").slice(0,3).join("\n")
  : (e.message||"عطبٌ غير موصوف");
 fatal(m,"تحميل");
},true);
addEventListener("unhandledrejection",e=>{
 const r=e.reason;
 fatal((r&&r.message)||String(r),"وعدٌ مرفوض");
});
/* مرقب: يمسك فشل جلب وحدةٍ — لا يفير error على النافذة */
setTimeout(()=>{
 if(DONE||SHOWN)return;
 fatal("لم يكتمل الإقلاع خلال عشر ثوان — تعذّر تحميل وحدةٍ؟ "
  +"افتح وحدة التحكّم لترى الملفّ المفقود.","مرقب");
},10000);
