/* ═══ ناقل الأحداث — يكسر الاعتماد الدائري بين القماش واللوحات ═══ */
export const HOOK={
 props:()=>{}, refresh:()=>{}, status:()=>{},
 report:()=>{}, prompt:()=>{}, toggles:()=>{}, help:()=>{},
 defs:()=>{}, ws:()=>{}, ctx:()=>false,
 layCtl:()=>{}, ctxPanel:()=>{},
 clean:()=>{}          /* مالكه wire.setClean — والإرساء يطلبه */
};
