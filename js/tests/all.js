/* ═══ مشغّل الملفّات ═══
   كل ملفٍّ عمليّةٌ منفصلة، لأن كلاً منها يختم بـprocess.exit —
   واستيرادُه في عمليّةٍ واحدة يقتلها عند أوّل ختام.
   والجمعُ بالنمط لا بقائمة: ملفٌّ جديد يُشغَّل بلا تسجيل. */
import {spawnSync} from "node:child_process";
import {readdirSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const files=["run.js"].concat(
 readdirSync(here).filter(f=>/\.test\.js$/.test(f)).sort());
let bad=0;
files.forEach(f=>{
 console.log(`\n══════════ ${f} ══════════`);
 const r=spawnSync(process.execPath,[join(here,f)],{stdio:"inherit"});
 if(r.status)bad++;
});
console.log(`\n${files.length-bad}/${files.length} ملفّاً نجح`);
process.exit(bad?1:0);
