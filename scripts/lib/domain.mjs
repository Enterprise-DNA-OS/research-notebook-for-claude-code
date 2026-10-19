import { readFileSync, readdirSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { load } from 'cheerio';
import { REPO_ROOT } from './db.mjs';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const READS = {
 projects:'select code,name,owner,jurisdiction,storage_ref,policy_ref,retain_until,backup_verified_on from projects order by code',
 protocols:'select id,code,version,title,author,retired from protocols order by code,version',
 experiments:'select code,title,project,owner,state,due_on,protocol,current_review from experiment_position order by code',
 'experiment-week':"select code,owner,state,due_on,entries,artifacts,open_actions from experiment_position where state<>'closed' order by due_on,code",
 'review-queue':"select code,title,owner,revision,current_review,open_actions from experiment_position where state='ready' order by due_on,code",
 'evidence-gaps':"select code,owner,state,entries,artifacts,protocol_retired from experiment_position where state<>'closed' and (entries=0 or artifacts=0 or protocol_retired) order by code",
 'protocol-review':"select e.code,e.owner,e.protocol,e.state from experiment_position e where protocol_retired and state<>'closed' order by code",
 actions:'select a.code,e.code as experiment,a.description,a.owner,a.due_on,a.resolved_on,a.resolution from actions a join experiments e on e.id=a.experiment_id order by a.due_on,a.code',
 attention:'select * from research_attention order by due_date,code,issue',
 compliance:'select * from research_compliance order by code,rule,finding',
 archives:'select a.code,p.code as project,a.imported_by,a.acknowledged_by,a.reconciliation_ref,count(f.id) as files,sum(f.bytes) as bytes from archives a join projects p on p.id=a.project_id left join archive_files f on f.archive_id=a.id group by a.id,p.code order by a.code',
 'archive-gaps':"select a.code,f.relative_path,f.missing_links from archive_files f join archives a on a.id=f.archive_id where jsonb_array_length(f.missing_links)>0 order by a.code,f.relative_path",
 'retention-review':'select code,owner,policy_ref,storage_ref,retain_until,backup_verified_on from projects where retain_until is null or retain_until<=current_date+90 or backup_verified_on is null or backup_verified_on<current_date-30 order by code',
 'owner-workload':"select owner,count(*) as active_experiments,count(*) filter(where due_on<current_date) as overdue,sum(open_actions) as open_actions from experiment_position where state<>'closed' group by owner order by owner",
 audit:'select table_name,record_id,operation,actor,created_at from audit order by created_at,id'
};
export const QUESTIONS = [
 ['Which overdue experiments also lack raw evidence?',"select code,owner,days_overdue from experiment_position where state<>'closed' and days_overdue>0 and artifacts=0 order by code"],
 ['Whose review queue still contains open actions?',"select code,owner,open_actions from experiment_position where state='ready' and open_actions>0 order by code"],
 ['Which active experiments use retired protocols?',READS['protocol-review']],
 ['Which projects have no documented retention decision?',"select code,owner from projects where retain_until is null or policy_ref is null order by code"],
 ['Which experiment records contain deviations?',"select distinct e.code,e.owner from experiments e join entries n on n.experiment_id=e.id where n.kind='deviation' order by e.code"],
 ['Which researchers have overdue work and unresolved actions?',"select owner,count(*) as experiments,sum(open_actions) as actions from experiment_position where state<>'closed' and days_overdue>0 and open_actions>0 group by owner order by owner"],
 ['Which archived notebooks still need reconciliation?',"select code,imported_by from archives where reconciliation_ref is null order by code"],
 ['Which exported pages refer to missing files?',READS['archive-gaps']],
 ['Which projects combine evidence gaps with an overdue backup check?',"select p.code,count(e.id) as experiments from projects p join experiments e on e.project_id=p.id where (p.backup_verified_on is null or p.backup_verified_on<current_date-30) and not exists(select 1 from artifacts a where a.experiment_id=e.id) group by p.code order by p.code"],
 ['Which closed records lack acceptance of their current revision?',"select code,owner,revision,current_review from experiment_position where state='closed' and current_review<>'accepted' order by code"]
];
export function parseArgs(args) {
 const pos=[],o={}; for(const a of args) {if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(Object.hasOwn(o,k))throw Error(`Repeated option --${k}`);o[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {pos,o};
}
function keys(o,allowed=[]){for(const k of Object.keys(o))if(!['json',...allowed].includes(k))throw Error(`Unknown option --${k}`);}
function req(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k}= is required`);return o[k].trim();}
function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error(`Invalid date: ${s}`);return s;}
function day(){return new Date().toISOString().slice(0,10);}
function past(s){s=date(s);if(s>day())throw Error('Recorded dates cannot be in the future');return s;}
function noExtra(pos,n){if(pos.length!==n)throw Error('Unexpected or missing positional argument; see --help');}
export async function resolve(db,kind,term){
 const cols={projects:['code','name'],protocols:['code','title'],experiments:['code','title'],actions:['code','description'],archives:['code'],entries:['id::text']}[kind];
 if(!cols||typeof term!=='string'||!term.trim())throw Error(`${kind} identifier is required`);
 const fields=[...new Set(['id::text',...cols])];
 let rows=await db.query(`select * from ${kind} where ${fields.map(c=>`lower(${c})=lower($1)`).join(' or ')} order by id`,[term]);
 if(rows.length!==1){if(!rows.length)rows=await db.query(`select * from ${kind} where ${fields.map(c=>`left(lower(${c}),length($1))=lower($1)`).join(' or ')} order by id`,[term]);}
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}: ${rows.map(x=>`${x.id} ${x.code||''} ${x.version?'v'+x.version:''} ${x.title||x.name||''}`).join('; ')}`:`No matching ${kind}: ${term}`);
 return rows[0];
}
async function transaction(db,actor,fn,{dry=false}={}){
 if(typeof actor!=='string'||!actor.trim())throw Error('--actor= is required for changes');
 await db.exec('BEGIN');try{await db.query("select set_config('research.actor',$1,true)",[actor.trim()]);const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}
}
async function lockExperiment(db,term){const e=await resolve(db,'experiments',term);return (await db.query('select * from experiments where id=$1 for update',[e.id]))[0];}
async function record(db,e){return {experiment:e,protocol:(await db.query('select * from protocols where id=$1',[e.protocol_id]))[0],entries:await db.query('select * from entries where experiment_id=$1 order by created_at,id',[e.id]),artifacts:await db.query('select * from artifacts where experiment_id=$1 order by created_at,id',[e.id]),actions:await db.query('select * from actions where experiment_id=$1 order by created_at,id',[e.id])};}
const TABLES=['projects','protocols','experiments','entries','artifacts','reviews','actions','archives','archive_files','audit'];
function scanArchive(root){
 root=path.resolve(root);if(lstatSync(root).isSymbolicLink()||!lstatSync(root).isDirectory())throw Error('Archive must be an extracted directory, not a symlink');
 const files=[],seen=new Set();let total=0;
 const walk=dir=>{for(const name of readdirSync(dir).sort()){
  const full=path.join(dir,name),stat=lstatSync(full);if(stat.isSymbolicLink())throw Error('Symlinks are not accepted in archives');
  if(stat.isDirectory()){walk(full);continue;}if(!stat.isFile())throw Error('Archive contains a non-regular file');
  const rel=path.relative(root,full).split(path.sep).join('/');if(seen.has(rel.toLowerCase()))throw Error('Archive paths collide on Windows');seen.add(rel.toLowerCase());
  if(/[<>:"|?*\\]/.test(rel)||rel.split('/').some(x=>/[. ]$/.test(x)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(x)))throw Error(`Non-portable archive path: ${rel}`);
  total+=stat.size;if(stat.size>50*1024*1024||total>200*1024*1024||files.length>=5000)throw Error('Archive limit exceeded: 50 MB per file, 200 MB total, 5000 files; split the export');
  const data=readFileSync(full);files.push({relative_path:rel,sha256:hash(data),bytes:data.length,content_base64:data.toString('base64'),title:null,extracted_text:null,missing_links:[]});
 }};walk(root);
 if(!files.some(f=>f.relative_path==='notebook_home_page.html'))throw Error('Expected notebook_home_page.html at the archive root');
 const paths=new Set(files.map(f=>f.relative_path));
 for(const f of files){if(!/\.x?html?$/i.test(f.relative_path))continue;
  const $=load(Buffer.from(f.content_base64,'base64').toString('utf8'));f.title=$('title').first().text().trim()||f.relative_path;
  const missing=new Set();$('[href],[src]').each((_,el)=>{for(const attr of ['href','src']){let v=$(el).attr(attr);if(!v||v.startsWith('#')||/^[a-z][a-z0-9+.-]*:/i.test(v)||v.startsWith('//'))continue;
   v=v.split(/[?#]/)[0];if(!v)continue;try{v=decodeURIComponent(v);}catch{missing.add(v);continue;}
   const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(f.relative_path),v));if(v.startsWith('/')||resolved.startsWith('../')||!paths.has(resolved))missing.add(v);
  }});f.missing_links=[...missing].sort();$('script,style,noscript,nav').remove();f.extracted_text=$('body').text().replace(/\s+/g,' ').trim();
 }
 return {files,manifest:hash(JSON.stringify(files.map(f=>[f.relative_path,f.sha256,f.bytes])))};
}
export async function run(db,args){
 const {pos,o}=parseArgs(args);const [cmd,sub,...rest]=pos;
 if(READS[cmd]){noExtra(pos,1);keys(o);return db.query(READS[cmd]);}
 if(cmd==='insights'){noExtra(pos,1);keys(o);const out=[];for(const [question,sql] of QUESTIONS)out.push({question,rows:await db.query(sql)});return out;}
 if(cmd==='experiment'){noExtra(pos,2);keys(o);const e=await resolve(db,'experiments',sub);return {...await record(db,e),reviews:await db.query('select * from reviews where experiment_id=$1 order by created_at,id',[e.id])};}
 if(cmd==='search'){
  noExtra(pos,2);keys(o);if(!sub.trim())throw Error('Search text is required');
  return db.query(`select 'entry' as kind,e.code as record,n.body as text from entries n join experiments e on e.id=n.experiment_id where strpos(lower(n.body),lower($1))>0 union all select 'archive',a.code||'/'||f.relative_path,f.extracted_text from archive_files f join archives a on a.id=f.archive_id where strpos(lower(f.extracted_text),lower($1))>0 order by kind,record`,[sub]);
 }
 if(cmd==='verify-evidence'){
  noExtra(pos,2);keys(o);const e=await resolve(db,'experiments',sub);const out=[];
  for(const a of await db.query('select * from artifacts where experiment_id=$1 order by label,id',[e.id])){
   try{const f=path.resolve(REPO_ROOT,a.location);out.push({label:a.label,location:a.location,ok:hash(readFileSync(f))===a.sha256,status:'file checked'});}catch{out.push({label:a.label,location:a.location,ok:false,status:'file unavailable'});}
  }return out;
 }
 if(cmd==='verify-archive'){
  noExtra(pos,2);keys(o);const a=await resolve(db,'archives',sub);const files=await db.query('select relative_path,sha256,bytes,content_base64 from archive_files where archive_id=$1 order by relative_path',[a.id]);
  const failures=files.filter(f=>hash(Buffer.from(f.content_base64,'base64'))!==f.sha256||Buffer.from(f.content_base64,'base64').length!==Number(f.bytes)).map(f=>f.relative_path);
  const manifest=hash(JSON.stringify(files.map(f=>[f.relative_path,f.sha256,Number(f.bytes)])));
  return {archive:a.code,files:files.length,ok:!failures.length&&manifest===a.manifest_hash,failures,manifest_matches:manifest===a.manifest_hash};
 }
 if(cmd==='export'){
  noExtra(pos,1);keys(o,['out']);const out={format:'research-notebook-v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');try{for(const t of TABLES)out.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  if(o.out){const f=path.resolve(req(o,'out'));mkdirSync(path.dirname(f),{recursive:true});const data=JSON.stringify(out,null,2)+'\n';writeFileSync(f,data,{flag:'wx',mode:0o600});return {file:f,sha256:hash(data),counts:Object.fromEntries(Object.entries(out.records).map(([k,v])=>[k,v.length]))};}return out;
 }
 if(cmd==='draft-weekly-review'||cmd==='draft-handover'){
  noExtra(pos,cmd==='draft-handover'?2:1);keys(o);const sections=cmd==='draft-handover'?[['Experiment',await run(db,['experiment',sub])]]:[['Attention',await run(db,['attention'])],['Review queue',await run(db,['review-queue'])],['Evidence gaps',await run(db,['evidence-gaps'])]];
  const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');mkdirSync(dir,{recursive:true});const file=path.join(dir,`${cmd}-${randomUUID()}.md`);
  writeFileSync(file,'# DRAFT: Research review\n\nCheck original evidence before sharing.\n\n'+sections.map(([title,rows])=>`## ${title}\n\n\x60\x60\x60json\n${JSON.stringify(rows,null,2)}\n\x60\x60\x60`).join('\n\n')+'\n',{flag:'wx',mode:0o600});return {file,sent:false};
 }
 if(cmd==='import'){
  noExtra(pos,3);if(sub!=='labarchives')throw Error('Supported source: labarchives');keys(o,['actor','project','code','dry-run']);
  if(o['dry-run']!==undefined&&o['dry-run']!==true)throw Error('Use --dry-run without a value');
  const scan=scanArchive(rest[0]);scan.files.sort((a,b)=>a.relative_path<b.relative_path?-1:a.relative_path>b.relative_path?1:0);scan.manifest=hash(JSON.stringify(scan.files.map(f=>[f.relative_path,f.sha256,f.bytes])));
  return transaction(db,o.actor,async()=>{
   const p=await resolve(db,'projects',req(o,'project'));const code=req(o,'code');
   const [prior]=await db.query('select * from archives where lower(code)=lower($1)',[code]);
   if(prior){if(prior.manifest_hash!==scan.manifest||prior.project_id!==p.id)throw Error('Conflicting archive code; preserve the old archive and use a new code for a new export');return {archive:code,unchanged:true,files:scan.files.length,dry_run:!!o['dry-run']};}
   const [a]=await db.query('insert into archives(code,project_id,manifest_hash,imported_by) values($1,$2,$3,$4) returning id',[code,p.id,scan.manifest,o.actor]);
   for(const f of scan.files)await db.query('insert into archive_files(archive_id,relative_path,sha256,bytes,content_base64,title,extracted_text,missing_links) values($1,$2,$3,$4,$5,$6,$7,$8)',[a.id,f.relative_path,f.sha256,f.bytes,f.content_base64,f.title,f.extracted_text,JSON.stringify(f.missing_links)]);
   return {archive:code,files:scan.files.length,missing_local_links:scan.files.reduce((n,f)=>n+f.missing_links.length,0),reconciliation_required:true,dry_run:!!o['dry-run']};
  },{dry:!!o['dry-run']});
 }
 return transaction(db,o.actor,async()=>{
  if(cmd==='add-project'){
   noExtra(pos,1);keys(o,['actor','code','name','owner','jurisdiction']);return db.query('insert into projects(code,name,owner,jurisdiction) values($1,$2,$3,$4) returning *',[req(o,'code'),req(o,'name'),req(o,'owner'),req(o,'jurisdiction')]);
  }
  if(cmd==='set-retention'){
   noExtra(pos,2);keys(o,['actor','storage','policy','until','backup-verified']);const p=await resolve(db,'projects',sub);
   return db.query('update projects set storage_ref=$2,policy_ref=$3,retain_until=$4,backup_verified_on=$5 where id=$1 returning code,storage_ref,policy_ref,retain_until,backup_verified_on',[p.id,req(o,'storage'),req(o,'policy'),date(req(o,'until')),past(req(o,'backup-verified'))]);
  }
  if(cmd==='add-protocol'){
   noExtra(pos,1);keys(o,['actor','code','version','title','file']);const v=req(o,'version');if(!/^[1-9]\d*$/.test(v))throw Error('Version must be a positive integer');
   const body=readFileSync(req(o,'file'),'utf8');if(!body.trim())throw Error('Protocol file is empty');
   return db.query('insert into protocols(code,version,title,body,author) values($1,$2,$3,$4,$5) returning id,code,version',[req(o,'code'),v,req(o,'title'),body,o.actor]);
  }
  if(cmd==='retire-protocol'){
   noExtra(pos,2);keys(o,['actor']);const p=await resolve(db,'protocols',sub);return db.query('update protocols set retired=true where id=$1 returning code,version,retired',[p.id]);
  }
  if(cmd==='add-experiment'){
   noExtra(pos,1);keys(o,['actor','code','title','project','protocol','owner','hypothesis','due']);const p=await resolve(db,'projects',req(o,'project')),q=await resolve(db,'protocols',req(o,'protocol'));
   if(q.retired)throw Error('Cannot start an experiment on a retired protocol');
   return db.query('insert into experiments(code,title,project_id,protocol_id,owner,hypothesis,due_on) values($1,$2,$3,$4,$5,$6,$7) returning id,code,state',[req(o,'code'),req(o,'title'),p.id,q.id,req(o,'owner'),req(o,'hypothesis'),date(req(o,'due'))]);
  }
  if(cmd==='reconcile-archive'){
   noExtra(pos,2);keys(o,['actor','evidence']);const a=await resolve(db,'archives',sub);const verification=await run(db,['verify-archive',a.id]);if(!verification.ok)throw Error('Archive integrity verification failed');
   return db.query('update archives set acknowledged_by=$2,reconciliation_ref=$3 where id=$1 returning code,acknowledged_by,reconciliation_ref',[a.id,o.actor,req(o,'evidence')]);
  }
  if(cmd==='resolve-action'){
   noExtra(pos,2);keys(o,['actor','resolution']);const a=await resolve(db,'actions',sub);await lockExperiment(db,a.experiment_id);
   if(a.resolved_on)throw Error('Action already resolved');await db.query('update experiments set revision=revision+1 where id=$1',[a.experiment_id]);return db.query('update actions set resolved_on=current_date,resolution=$2 where id=$1 returning code,resolved_on,resolution',[a.id,req(o,'resolution')]);
  }
  const e=await lockExperiment(db,sub);noExtra(pos,2);
  if(cmd==='log'||cmd==='correct'){
   keys(o,['actor','kind','text','date','supersedes']);if(cmd==='log'&&o.supersedes)throw Error('Use correct for corrections');
   const prior=cmd==='correct'?await resolve(db,'entries',req(o,'supersedes')):null;
   return db.query('insert into entries(experiment_id,kind,body,observed_on,author,supersedes) values($1,$2,$3,$4,$5,$6) returning id,kind,body',[e.id,cmd==='correct'?'correction':req(o,'kind'),req(o,'text'),past(req(o,'date')),o.actor,prior?.id||null]);
  }
  if(cmd==='attach'){
   keys(o,['actor','label','file','date']);const f=path.resolve(req(o,'file'));if(lstatSync(f).size>50*1024*1024)throw Error('Evidence hash input exceeds 50 MB; retain it separately and customise for streamed hashing');if(!lstatSync(f).isFile()||lstatSync(f).isSymbolicLink())throw Error('Evidence must be a regular file');
   return db.query('insert into artifacts(experiment_id,label,location,sha256,captured_on,recorded_by) values($1,$2,$3,$4,$5,$6) returning label,location,sha256',[e.id,req(o,'label'),f,hash(readFileSync(f)),past(req(o,'date')),o.actor]);
  }
  if(cmd==='add-action'){
   keys(o,['actor','code','text','owner','due']);if(!['planned','running'].includes(e.state))throw Error('Reopen before adding actions');
   return db.query('insert into actions(code,experiment_id,description,owner,due_on) values($1,$2,$3,$4,$5) returning code,description,due_on',[req(o,'code'),e.id,req(o,'text'),req(o,'owner'),date(req(o,'due'))]);
  }
  if(cmd==='submit'){
   keys(o,['actor','conclusion']);if(!['planned','running'].includes(e.state))throw Error('Only active experiments can be submitted');
   const data=await record(db,e);if(!data.entries.length||!data.artifacts.length||data.protocol.retired)throw Error('Submission needs observations, raw evidence and a current protocol');
   return db.query("update experiments set state='ready',conclusion=$2,revision=revision+1 where id=$1 returning code,state,revision",[e.id,req(o,'conclusion')]);
  }
  if(cmd==='review'){
   keys(o,['actor','decision','evidence']);if(e.state!=='ready')throw Error('Review requires a submitted experiment');
   if(e.owner.trim().toLowerCase()===o.actor.trim().toLowerCase())throw Error('Experiment owner cannot review their own work');
   const snap=await record(db,e);if(snap.entries.some(n=>n.author.trim().toLowerCase()===o.actor.trim().toLowerCase()))throw Error('A contributing author cannot be the independent reviewer');
   if(snap.actions.some(a=>!a.resolved_on)&&req(o,'decision')==='accepted')throw Error('Resolve open actions before acceptance');
   if(snap.protocol.retired)throw Error('Retired protocol requires reopening and an explicit protocol change');
   const data=JSON.stringify(snap);return db.query('insert into reviews(experiment_id,revision,reviewer,decision,evidence_ref,snapshot,snapshot_hash) values($1,$2,$3,$4,$5,$6,$7) returning id,decision,revision',[e.id,e.revision,o.actor,req(o,'decision'),req(o,'evidence'),data,hash(data)]);
  }
  if(cmd==='close'){
   keys(o,['actor']);if(e.state!=='ready')throw Error('Only reviewed, submitted experiments can close');
   const [r]=await db.query("select * from reviews where experiment_id=$1 and revision=$2 and decision='accepted'",[e.id,e.revision]);
   if(!r)throw Error('Current revision has not been accepted');const [protocol]=await db.query('select retired from protocols where id=$1',[e.protocol_id]);if(protocol.retired)throw Error('Protocol was retired; reopen for review');
   const open=await db.query('select id from actions where experiment_id=$1 and resolved_on is null',[e.id]);if(open.length)throw Error('Open actions block closure');
   return db.query("update experiments set state='closed',closed_on=current_date where id=$1 returning code,state,closed_on",[e.id]);
  }
  if(cmd==='reopen'){
   keys(o,['actor','reason']);if(!['ready','closed'].includes(e.state))throw Error('Only submitted or closed experiments need reopening');
   await db.query("update experiments set state='running',closed_on=null,revision=revision+1 where id=$1",[e.id]);
   return db.query("insert into entries(experiment_id,kind,body,observed_on,author) values($1,'deviation',$2,current_date,$3) returning id,body",[e.id,'Reopened: '+req(o,'reason'),o.actor]);
  }
  if(cmd==='change-protocol'){
   keys(o,['actor','protocol','reason']);if(!['planned','running'].includes(e.state))throw Error('Reopen before changing protocol');const q=await resolve(db,'protocols',req(o,'protocol'));if(q.retired)throw Error('Protocol is retired');
   await db.query('update experiments set protocol_id=$2,revision=revision+1 where id=$1',[e.id,q.id]);
   return db.query("insert into entries(experiment_id,kind,body,observed_on,author) values($1,'deviation',$2,current_date,$3) returning id,body",[e.id,`Protocol changed from ${e.protocol_id} to ${q.id}: ${req(o,'reason')}`,o.actor]);
  }
  throw Error(`Unknown command: ${cmd}; run --help`);
 });
}
