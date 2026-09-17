/* ═══ اللقطات الزمنية ═══
   نسخة كاملة تعبر إغلاق الصفحة. الاستعادة تمرّ بـ edit() لتصبح
   خطوة تراجع واحدة، وتبقى قائمة الفهرس خفيفة في localStorage. */
import {S,pack,loadState,edit,editFailed} from "../core/state.js";
import {snapPut,snapGet,snapDel} from "./store.js";

const K="mistar.snaps";
export const SNAP={max:12,list:[]};
const read=()=>{
 try{const a=JSON.parse(localStorage.getItem(K)||"[]");return Array.isArray(a)?a:[]}
 catch(e){return []}
};
const write=a=>{try{localStorage.setItem(K,JSON.stringify(a))}catch(e){}};
export const snapList=()=>SNAP.list.slice();
export const snapsLoad=()=>{SNAP.list=read();return SNAP.list};
export async function snapTake(why){
 if(!S.walls.length&&!S.areas.length)return {ok:0,err:"فارغ"};
 const id="s"+Date.now();
 const r=await snapPut(id,pack());
 if(!r.ok)return r;
 SNAP.list.unshift({id,t:Date.now(),why:String(why||"يدوية").slice(0,40),
  w:S.walls.length,o:S.opens.length,a:S.areas.length});
 while(SNAP.list.length>SNAP.max){
  const old=SNAP.list.pop(); await snapDel(old.id);
 }
 write(SNAP.list);
 return {ok:1,id};
}
export async function snapRestore(id){
 const d=await snapGet(id);
 if(!d||!Array.isArray(d.walls))return {ok:0,err:"اللقطة مفقودة"};
 edit(()=>{loadState(d,false)},"استعادة لقطة");
 if(editFailed())return {ok:0,err:"تعذّر التطبيق"};
 return {ok:1,w:d.walls.length};
}
export async function snapDrop(id){
 await snapDel(id);
 SNAP.list=SNAP.list.filter(x=>x.id!==id); write(SNAP.list);
}
let T=null,lastV=-1;
export function snapAutoStart(min){
 if(T)clearInterval(T);
 lastV=S.__ver;
 T=setInterval(()=>{
  if(S.__ver===lastV)return;
  lastV=S.__ver; snapTake("تلقائية");
 },Math.max(2,+min||10)*60000);
}