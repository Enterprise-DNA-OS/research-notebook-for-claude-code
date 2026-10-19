import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
const keep=process.argv.includes('--keep');
const tmp=mkdtempSync(path.join(os.tmpdir(),'research-demo-'));
process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
const capture=process.argv.find(a=>a.startsWith('--capture='))?.slice(10);if(capture)mkdirSync(capture,{recursive:true});
let db;
function child(script,args=[]){const r=spawnSync(process.execPath,[script,...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout.trim();}
try{
 db=await getDb();await migrate(db);await seed(db);await db.close();db=null;
 console.log('Fictional research data. No live database connection.');
 console.log(child('scripts/notebook.mjs',['import','labarchives','examples/offline-notebook','--project=COAT','--code=DEMO-ARCHIVE','--actor=Demo operator']));
 for(const cmd of ['attention','review-queue','evidence-gaps']){const output=child('scripts/notebook.mjs',[cmd]);console.log('\n'+cmd+'\n'+output);if(capture)writeFileSync(path.join(capture,cmd+'.txt'),output+'\n');}
 console.log(child('scripts/view.mjs'));console.log(child('scripts/docs.mjs'));
 if(keep)console.log('DEMO_DIR='+tmp);
}finally{await db?.close();if(!keep)rmSync(tmp,{recursive:true,force:true});}
