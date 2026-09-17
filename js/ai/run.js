/* ═══ التنفيذ ثم الإرجاع ═══
   الخطة تُنفَّذ فعلاً — لا معاينةً تقريبية — ثم تراها مرسومةً
   وتقرّر. الإرجاع من لقطةٍ كاملة، فلا حالة نصف معدَّلة.
   خطوة تراجعٍ واحدة للخطة كلّها: setBatch يُسكِت تاريخ كل أداة. */
import {S,COLLS,snapshot,loadState,pushHistory,touch,
        autosave} from "../core/state.js";
import * as R from "../tools/registry.js";

const count=()=>COLLS.reduce((n,k)=>n+(S[k]||[]).length,0);

export function trial(lines,opt){
 const O=Object.assign({stopOnError:1},opt||{});
 const before=snapshot(), n0=count();
 const res=[];
 R.setBatch(1);
 try{
  for(const L of lines){
   if(L.bad){res.push({...L,err:L.bad,skipped:1}); continue}
   try{
    if(L.kind==="enter")R.enter();
    else if(L.kind==="esc")R.cancel(true);
    else if(L.kind==="tool")R.begin(L.tool);
    else{
     const ok=R.feedText(L.s);
     if(ok===false)throw new Error("رُفض الإدخال");
    }
    res.push({...L,ok:1});
   }catch(e){
    res.push({...L,err:e.message||String(e)});
    if(O.stopOnError)break;
   }
  }
  if(R.active())R.cancel(true);
 }finally{R.setBatch(0)}
 touch();
 return {before, res, made:count()-n0,
  errs:res.filter(x=>x.err).length,
  ran:res.filter(x=>x.ok).length};
}
export function commit(t){
 pushHistory(t.before);
 touch(); autosave();
 return t.made;
}
export function rollback(t){
 loadState(JSON.parse(t.before),false);
 touch();
 return t.made;
}
