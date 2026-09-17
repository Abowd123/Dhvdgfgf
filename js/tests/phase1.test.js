/* ═══ اختبارات المرحلة 1: المدقّق (lint) + الحفظ الاحتياطي (persist) ═══
   بأسلوب المعمل الذاتي (كما في help.test.js) لا vitest — المشروع
   بلا اعتماديات عمداً. lint.js يُختبَر على حالةٍ حقيقية (S وaddWall
   وaddStair الحقيقيّان)، لا سجلٌّ مُصطنَع. persist.js يحتاج IndexedDB
   فقط، فيُلبَس شِبهاً صغيراً محلّياً هنا (لا في harness.js العام،
   إذ لا وحدة نواةٍ أخرى تحتاجه).

   التشغيل:  node js/tests/phase1.test.js                          */
import {shim,group,groupAsync,ok,eq,deep,summary} from "./harness.js";
shim();

const {S,touchGeom}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");
const {addStair}=await import("../core/stairs.js");
const {lint,lintText}=await import("../ai/lint.js");

function resetState(){
 S.walls.length=0; S.opens.length=0; S.areas.length=0; S.stairs.length=0;
 touchGeom();   /* يُبطل كاش looseEnds — تعديلٌ مباشر على المصفوفة
                   لا يزيد VER.g تلقائياً كما يفعل addWall/delWall */
}

group("lint — على النواة الحقيقية",()=>{
 resetState();
 let rep=lint();
 ok(rep.ok,"حالةٌ فارغة = لا مشاكل");
 eq(rep.counts.total,0,"لا ملاحظات على رسمٍ فارغ");
 ok(lintText(rep).includes("سليم"),"lintText يبشّر بالسلامة");

 resetState();
 addWall([0,0],[3000,0],200,"int","c");   /* جدارٌ منعزل: طرفان طليقان */
 rep=lint();
 ok(rep.counts.warn>0,"جدارٌ منعزل يُنتج تحذيراً");
 ok(rep.issues.some(i=>i.code==="loose-ends"),"مصنّفٌ loose-ends");

 resetState();
 S.opens.push({id:"O1",wall:"لا-وجود-لهذا-الجدار"});   /* يتيمة */
 rep=lint();
 ok(rep.counts.err>0,"فتحةٌ يتيمة تُنتج خطأً");
 const bad=rep.issues.find(i=>i.code==="open-state");
 ok(!!bad&&bad.refs.includes("O1"),"مرجع الفتحة اليتيمة مذكور");

 resetState();
 S.areas.push({id:"A1",name:"مجلس",ring:[]});   /* حلقةٌ فارغة = صفرية */
 rep=lint();
 ok(rep.issues.some(i=>i.code==="area-open"),"مساحةٌ صفرية تُصنَّف area-open");

 resetState();
 addStair([1000,6000],[3000,6000],700,20,{h:3000});   /* عرضٌ أقلّ من الحدّ */
 rep=lint();
 ok(rep.issues.some(i=>i.code==="stair-check"),"درجٌ ضيّق يُصنَّف stair-check");

 resetState();
 ok(lint().ok,"إعادة الضبط تعيد الحالة للسلامة — لا تسريبَ بين الحالات");
});

await groupAsync("createAutosave — بشِبه IndexedDB محلّي",async()=>{
 /* ═══ شِبهُ IndexedDB الأدنى ═══ مخزنٌ واحد، وأربع عمليّات فقط —
    ما يستعمله persist.js بالضبط. */
 const store=new Map();
 globalThis.indexedDB={
  open(){
   const rq={};
   setTimeout(()=>{
    rq.result={
     objectStoreNames:{contains:()=>true},
     createObjectStore(){},
     transaction(){
      return {
       objectStore(){
        return {
         put:(v,k)=>{store.set(k,v)},
         get:(k)=>{
          const r={};
          setTimeout(()=>{r.result=store.get(k); r.onsuccess&&r.onsuccess()});
          return r;
         },
         delete:(k)=>{store.delete(k)}
        };
       },
       set oncomplete(f){setTimeout(f)},
       set onerror(f){}
      };
     },
     close(){}
    };
    rq.onsuccess&&rq.onsuccess();
   });
   return rq;
  }
 };
 if(!globalThis.document)globalThis.document={visibilityState:"visible",
  addEventListener(){}};
 if(!globalThis.window)globalThis.window={addEventListener(){}};

 const {createAutosave}=await import("../core/persist.js");

 let threw=false;
 try{createAutosave({})}catch(e){threw=true}
 ok(threw,"يرفض إن غاب serialize()");

 const as=createAutosave({serialize:()=>({walls:[1,2]}),
  restore(){}, meta:()=>({name:"ل"})});
 await as.saveNow();
 const info=await as.peek();
 ok(!!info,"saveNow يخزّن و peek يجد لقطة");
 eq(info.meta.name,"ل","الفوقيّة تُحفَظ مع اللقطة");

 let restored=null;
 const as2=createAutosave({serialize:()=>({x:5}),
  restore(d){restored=d}});
 await as2.saveNow();
 await as2.recover();
 deep(restored,{x:5},"recover يستدعي restore() بالبيانات المحفوظة");
});

process.exit(summary());
