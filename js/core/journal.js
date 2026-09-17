/* ═══ سجلّ الأوامر ═══
   نسخة نصية أمينة لما يُدخل المستخدم. العمليات التي لا يمكن تمثيلها
   بسطر إدخال تُسجّل كشائبة بدلاً من أن توهم بإعادة مطابقة. */
export const JR={lines:[],taint:[],max:4000};
let MUTE=0;

export const jrMute=v=>{MUTE=v?1:0};
export function jrAdd(s){
 if(MUTE)return;
 s=String(s==null?"":s).trim();
 if(!s)return;
 if(s==="esc"&&JR.lines[JR.lines.length-1]==="esc")return;
 JR.lines.push(s);
 if(JR.lines.length>JR.max)JR.lines.shift();
}
export function jrTaint(why){
 if(MUTE)return;
 const at=JR.lines.length;
 const last=JR.taint[JR.taint.length-1];
 if(last&&last.why===why&&last.at===at)return;
 JR.taint.push({at,why:String(why||"عملية غير قابلة للتمثيل")});
 if(JR.taint.length>200)JR.taint.shift();
}
export const jrClear=()=>{JR.lines.length=0;JR.taint.length=0};
export const jrCount=()=>JR.lines.length;
export const jrTainted=()=>JR.taint.length;
export function jrText(){
 const H=[`# سجلّ مِسطَر — ${JR.lines.length} سطراً`];
 if(JR.taint.length){
  const w=[...new Set(JR.taint.map(t=>t.why))].join(" · ");
  H.push(`# مشوب: ${w} — لا يُعبَّر عنها بسطر، فالإعادة تختلف`);
 }
 return H.concat(JR.lines).join("\n");
}
export const jrPlan=()=>"```plan\n"+JR.lines.join("\n")+"\n```";