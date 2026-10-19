import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, READS, QUESTIONS, hash } from './lib/domain.mjs';
process.on('uncaughtException', e => { console.error(e.message); console.error(e.stack?.split('\n').slice(1,5).join('\n')); process.exitCode=1; });
const tmp=mkdtempSync(path.join(os.tmpdir(),'research-smoke-'));
process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
let db;let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const today=new Date().toISOString().slice(0,10),actor='--actor=Test operator';
const invoke=(args)=>run(db,args);
async function rejects(args,re){await assert.rejects(()=>invoke(args),re);checks++;}
function child(script,args=[],status=0){const r=spawnSync(process.execPath,[script,...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(r.status,status,r.stderr||r.stdout);return r;}
try{
 db=await getDb();eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);await seed(db);
 const before=await invoke(['export']);await seed(db);eq((await invoke(['export'])).records,before.records,'Seed repeat must not change records');
 for(const cmd of Object.keys(READS))ok(Array.isArray(await invoke([cmd])),cmd);
 const insights=await invoke(['insights']);eq(insights.length,10);eq(QUESTIONS.length,10);
 ok((await invoke(['attention'])).some(x=>x.issue==='No activity in 14 days'));ok((await invoke(['compliance'])).length>=2);
 eq((await invoke(['experiment','coat-01'])).experiment.code,'COAT-01');await rejects(['experiment','coat'],/Ambiguous/);await rejects(['experiment','none'],/No matching/);
 await rejects(['projects','extra'],/positional/);await rejects(['projects','--typo'],/Unknown option/);await rejects(['projects','--json','--json'],/Repeated/);
 await rejects(['add-project','--code=BAD'],/actor/);
 await invoke(['add-project','--code=TEST','--name=Test project','--owner=Owner','--jurisdiction=AU',actor]);
 await invoke(['set-retention','TEST','--storage=private archive','--policy=TEST-RET','--until=2035-01-01',`--backup-verified=${today}`,actor]);
 await rejects(['set-retention','TEST','--storage=x','--policy=y','--until=2026-02-30',`--backup-verified=${today}`,actor],/Invalid date/);
 const proto=path.join(tmp,'protocol.txt');writeFileSync(proto,'A fictional record template, not scientific instructions.');
 const [p]=await invoke(['add-protocol','--code=TEST-P','--version=1','--title=Test protocol',`--file=${proto}`,actor]);
 const [p2]=await invoke(['add-protocol','--code=TEST-P','--version=2','--title=Revised protocol',`--file=${proto}`,actor]);
 await rejects(['retire-protocol','test-p',actor],/Ambiguous/);await invoke(['retire-protocol',p.id,actor]);
 const add=['add-experiment','--code=TEST-01','--title=Test experiment','--project=test','--owner=Owner','--hypothesis=Compare fictional records',`--due=${today}`,actor];
 await rejects([...add,`--protocol=${p.id}`],/retired/);await invoke([...add,`--protocol=${p2.id}`]);
 await rejects(['submit','TEST-01','--conclusion=Ready',actor],/observations/);
 const [entry]=await invoke(['log','TEST-01','--kind=observation','--text=<script>alert(1)</script> observed',`--date=${today}`,actor]);
 await rejects(['log','TEST-01','--kind=observation','--text=x','--date=2999-01-01',actor],/future/);
 await invoke(['correct','TEST-01',`--supersedes=${entry.id}`,'--text=Corrected fictional observation',`--date=${today}`,actor]);
 await rejects(['correct','COAT-01',`--supersedes=${entry.id}`,'--text=Wrong experiment',`--date=${today}`,actor],/another experiment|unique constraint/);
 const evidence=path.join(tmp,'evidence.txt');writeFileSync(evidence,'Retained fictional source record');
 await invoke(['attach','TEST-01','--label=Source',`--file=${evidence}`,`--date=${today}`,actor]);
 eq((await invoke(['verify-evidence','TEST-01']))[0].ok,true);writeFileSync(evidence,'Modified');eq((await invoke(['verify-evidence','TEST-01']))[0].ok,false);writeFileSync(evidence,'Retained fictional source record');
 await invoke(['add-action','TEST-01','--code=TEST-A','--text=Resolve before review','--owner=Owner',`--due=${today}`,actor]);
 await invoke(['submit','TEST-01','--conclusion=Ready for review',actor]);
 await rejects(['log','TEST-01','--kind=observation','--text=x',`--date=${today}`,actor],/Reopen/);
 await rejects(['review','TEST-01','--decision=accepted','--evidence=review-1','--actor=owner'],/own work/);
 await rejects(['review','TEST-01','--decision=accepted','--evidence=review-1',actor],/contributing author/);
 await rejects(['review','TEST-01','--decision=accepted','--evidence=review-1','--actor=Reviewer'],/open actions/);
 await invoke(['resolve-action','TEST-A','--resolution=Verified evidence',actor]);await rejects(['resolve-action','TEST-A','--resolution=Again',actor],/already resolved/);
 await invoke(['review','TEST-01','--decision=accepted','--evidence=review-1','--actor=Reviewer']);
 await invoke(['close','TEST-01',actor]);eq((await invoke(['experiment','TEST-01'])).experiment.state,'closed');
 await invoke(['reopen','TEST-01','--reason=Additional observation',actor]);eq((await invoke(['experiments'])).find(e=>e.code==='TEST-01').current_review,'not reviewed');
 await invoke(['change-protocol','TEST-01',`--protocol=${p2.id}`,'--reason=Explicit protocol confirmation',actor]);
 await invoke(['submit','TEST-01','--conclusion=Revised conclusion',actor]);await rejects(['close','TEST-01',actor],/not been accepted/);
 await invoke(['review','TEST-01','--decision=changes','--evidence=review-2','--actor=Reviewer']);await rejects(['close','TEST-01',actor],/not been accepted/);
 await invoke(['reopen','TEST-01','--reason=Address review',actor]);
 for(const table of ['entries','artifacts','reviews','archive_files','audit']){
  if(table==='archive_files')continue;
  await assert.rejects(()=>db.exec(`update ${table} set updated_at=now()`),/append-only/);checks++;
 }
 await assert.rejects(()=>db.query('update protocols set body=$2 where id=$1',[p2.id,'Overwrite']),/new protocol version/);checks++;
 const source=path.join(REPO_ROOT,'examples/offline-notebook');const imp=['import','labarchives',source,'--project=TEST','--code=IMPORT',actor];
 const dry=await invoke([...imp,'--dry-run']);eq(dry.files,3);eq((await invoke(['archives'])).length,0);
 const im=await invoke(imp);eq(im.files,3);eq(im.missing_local_links,1);eq((await invoke(imp)).unchanged,true);
 const verification=await invoke(['verify-archive','IMPORT']);eq(verification.ok,true);ok((await invoke(['search','edge separation'])).some(x=>x.kind==='archive'));
 const modified=path.join(tmp,'modified');cpSync(source,modified,{recursive:true});writeFileSync(path.join(modified,'files/observations.txt'),'Different export');
 await rejects(['import','labarchives',modified,'--project=TEST','--code=IMPORT',actor],/Conflicting/);eq((await invoke(['archives'])).length,1);
 await rejects(['import','labarchives',source,'--project=TEST','--code=IMPORT','--dry-run=false',actor],/without a value/);
 await assert.rejects(()=>db.exec('update archive_files set bytes=0'),/append-only/);checks++;
 await invoke(['reconcile-archive','IMPORT','--evidence=Reconciled page count; missing image acknowledged',actor]);
 ok((await invoke(['compliance'])).some(x=>x.finding==='Export contains missing local links'),'Acknowledgement must not hide missing links');
 const exp=await invoke(['export']);const af=exp.records.archive_files.find(f=>f.relative_path==='files/observations.txt');eq(Buffer.from(af.content_base64,'base64').toString(),readFileSync(path.join(source,'files/observations.txt'),'utf8'));eq(hash(Buffer.from(af.content_base64,'base64')),af.sha256);
 const out=path.join(tmp,'export.json');await invoke(['export',`--out=${out}`]);eq(JSON.parse(readFileSync(out)).format,'research-notebook-v1');await rejects(['export',`--out=${out}`],/EEXIST/);
 for(const args of [['draft-weekly-review'],['draft-handover','TEST-01']]){const d=await invoke(args);eq(d.sent,false);ok(readFileSync(d.file,'utf8').startsWith('# DRAFT'));}
 // Restricted roles cannot read operational views even when view access is granted.
 await db.exec('create role research_reader; grant usage on schema public to research_reader; grant select on experiment_position to research_reader; set role research_reader');
 await assert.rejects(()=>db.query('select * from experiment_position'),/permission denied/);checks++;await db.exec('reset role');
 await db.close();db=null;
 eq(JSON.parse(child('scripts/notebook.mjs',['projects','--json']).stdout).length,3);
 ok(child('scripts/notebook.mjs',['experiment','coat'],1).stderr.includes('Ambiguous'));
 child('scripts/notebook.mjs',['--help']);child('scripts/view.mjs');child('scripts/docs.mjs');
 const html=readFileSync(path.join(tmp,'docs-out/experiment-record',readdirSync(path.join(tmp,'docs-out/experiment-record')).find(x=>x.startsWith('test-01'))),'utf8');
 ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));ok(!html.includes('<script>alert(1)</script>'));eq(readdirSync(path.join(tmp,'views')).length,3);
 console.log(`PASS: ${checks} assertions; ${Object.keys(READS).length} read commands, ten insights, all changes, archive preservation, review controls, isolated rendering and CLI failures.`);
}finally{await db?.close();rmSync(tmp,{recursive:true,force:true});}
