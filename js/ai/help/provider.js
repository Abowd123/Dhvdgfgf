/* ═══ المزوّد الاحتياطي ═══ يُستدعى عند فشل المطابقة المحلية.
   سياقٌ مقيّد (toolsSpec فقط، لا حالة مشروع). يعيد استخدام net.ask. */
import {ask, ready} from "../net.js";
import {toolsSpec} from "../lang.js";

function helpSystem(){
 return `أنت «مرشد استخدام» داخل تطبيق «مِسطَر» لرسم المخططات المعمارية.`
  +` مهمّتك شرح كيفية استخدام الأداة خطوةً بخطوة بالعربية.`
  +`\n\nقواعد صارمة:`
  +`\n· اشرح الخطوات فقط — لا تُخرِج أوامر ولا كتل plan/ops ولا كوداً.`
  +`\n· لا تدّعِ وجود أداةٍ ليست في القائمة أدناه.`
  +`\n· إن لم تعرف، قل ذلك واقترح أقرب أداةٍ موجودة.`
  +`\n· أجب بإيجازٍ ووضوح بالعربية.`
  +`\n\nالأدوات المتاحة (لا غيرها):\n${toolsSpec()}`;
}
export const providerReady=()=>ready();
export async function askProvider(question){
 if(!ready())
  throw new Error("المزوّد غير مُهيَّأ — فعّله من لوحة «المساعد».");
 const q=String(question||"").trim().slice(0,500);
 const {txt,ms}=await ask(helpSystem(),q);
 return {text:String(txt||"").trim(),ms};
}
