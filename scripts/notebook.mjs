#!/usr/bin/env node
import { getDb } from './lib/db.mjs';
import { READS, run } from './lib/domain.mjs';
import { table, truncate } from './lib/format.mjs';
export function format(result){
 if(Array.isArray(result)&&result.every(x=>x&&typeof x==='object'&&!Array.isArray(x))){if(!result.length)return '  (none)';if(result[0].question)return result.map(x=>x.question+'\n'+format(x.rows)).join('\n\n');return table(result,Object.keys(result[0]).map(key=>({key,label:key,width:60,format:v=>typeof v==='object'?JSON.stringify(v):truncate(v??'',60)})));}
 return JSON.stringify(result,null,2);
}
const args=process.argv.slice(2);
if(!args.length||args.includes('--help')){
 console.log('Research Notebook CLI\nReads: '+Object.keys(READS).join(', '));
 console.log('Other reads: experiment <id>, insights, search <text>, verify-archive <id>, export [--out=file]\nChanges: add-project, set-retention, add-protocol, retire-protocol, add-experiment, log, correct, attach, add-action, resolve-action, submit, review, close, reopen, change-protocol, reconcile-archive\nImport: import labarchives <extracted-folder> --project=code --code=archive-code --actor=name [--dry-run]\nDrafts: draft-weekly-review, draft-handover <experiment>\nAll commands support --json. Mutations require --actor=name. See docs/cli.md for fields.');
}else{
 let db;try{db=await getDb();const result=await run(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
