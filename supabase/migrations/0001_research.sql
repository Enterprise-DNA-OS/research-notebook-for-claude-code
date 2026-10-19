create function stamp_research() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table projects (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, owner text not null,
 jurisdiction text not null check(jurisdiction in ('AU','NZ')), storage_ref text, policy_ref text, retain_until date,
 backup_verified_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index projects_code_ci on projects(lower(code));
create table protocols (
 id uuid primary key default gen_random_uuid(), code text not null, version integer not null check(version>0), title text not null, body text not null,
 author text not null, retired boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(code,version)
);
create unique index protocols_code_version_ci on protocols(lower(code),version);
create table experiments (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null, project_id uuid not null references projects,
 protocol_id uuid not null references protocols, owner text not null, hypothesis text not null, due_on date not null,
 state text not null default 'planned' check(state in ('planned','running','ready','closed')),
 revision integer not null default 0, conclusion text, closed_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index experiments_code_ci on experiments(lower(code));
create table entries (
 id uuid primary key default gen_random_uuid(), experiment_id uuid not null references experiments,
 kind text not null check(kind in ('observation','result','deviation','correction')), body text not null,
 observed_on date not null, author text not null, supersedes uuid unique references entries,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table artifacts (
 id uuid primary key default gen_random_uuid(), experiment_id uuid not null references experiments, label text not null,
 location text not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), captured_on date not null, recorded_by text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(experiment_id,location,sha256)
);
create table reviews (
 id uuid primary key default gen_random_uuid(), experiment_id uuid not null references experiments, revision integer not null,
 reviewer text not null, decision text not null check(decision in ('accepted','changes')), evidence_ref text not null,
 snapshot jsonb not null, snapshot_hash text not null check(snapshot_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(experiment_id,revision)
);
create table actions (
 id uuid primary key default gen_random_uuid(), code text not null unique, experiment_id uuid not null references experiments,
 description text not null, owner text not null, due_on date not null, resolved_on date, resolution text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((resolved_on is null and resolution is null) or (resolved_on is not null and length(trim(resolution))>0))
);
create unique index actions_code_ci on actions(lower(code));
create table archives (
 id uuid primary key default gen_random_uuid(), code text not null unique, project_id uuid not null references projects,
 source_system text not null default 'labarchives', manifest_hash text not null, imported_by text not null,
 acknowledged_by text, reconciliation_ref text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index archives_code_ci on archives(lower(code));
create table archive_files (
 id uuid primary key default gen_random_uuid(), archive_id uuid not null references archives,
 relative_path text not null, sha256 text not null, bytes bigint not null check(bytes>=0), content_base64 text not null,
 title text, extracted_text text, missing_links jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(archive_id,relative_path)
);
create table audit (
 id uuid primary key default gen_random_uuid(), table_name text not null, record_id uuid not null, operation text not null,
 actor text not null, before_row jsonb, after_row jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function research_audit() returns trigger language plpgsql as $$
declare who text; begin
 who := current_setting('research.actor',true);
 if who is null or length(trim(who))=0 then raise exception 'research.actor is required'; end if;
 insert into audit(table_name,record_id,operation,actor,before_row,after_row)
 values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,who,case when TG_OP<>'INSERT' then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);
 return coalesce(new,old); end $$;
create function research_immutable() returns trigger language plpgsql as $$ begin raise exception '% records are append-only',TG_TABLE_NAME; end $$;
create function research_entry_guard() returns trigger language plpgsql as $$
declare e experiments; prior entries; begin
 select * into e from experiments where id=new.experiment_id for update;
 if e.state not in ('planned','running') then raise exception 'Reopen the experiment before changing its record'; end if;
 if TG_TABLE_NAME='entries' then
   if new.supersedes is not null then
     select * into prior from entries where id=new.supersedes;
     if prior.experiment_id<>new.experiment_id then raise exception 'Correction belongs to another experiment'; end if;
     if new.kind<>'correction' then raise exception 'A superseding entry must be a correction'; end if;
   elsif new.kind='correction' then raise exception 'Correction requires a prior entry'; end if;
 end if;
 update experiments set revision=revision+1, state='running' where id=e.id;
 return new; end $$;
create trigger entry_guard before insert on entries for each row execute function research_entry_guard();
create trigger artifact_guard before insert on artifacts for each row execute function research_entry_guard();
DO $$ declare t text; begin
 foreach t in array array['projects','protocols','experiments','entries','artifacts','reviews','actions','archives','archive_files'] loop
 execute format('create trigger stamp before update on %I for each row execute function stamp_research()',t);
 execute format('create trigger audit_change after insert or update or delete on %I for each row execute function research_audit()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['entries','artifacts','reviews','archive_files','audit'] loop
 execute format('create trigger immutable before update or delete on %I for each row execute function research_immutable()',t);
 end loop;
end $$;
alter table audit enable row level security;
revoke all on audit from public;
create view experiment_position with (security_invoker=true) as
 select e.id,e.code,e.title,p.code as project,e.owner,e.state,e.due_on,
 greatest(0,current_date-e.due_on) as days_overdue,e.revision,
 q.code||' v'||q.version as protocol,q.retired as protocol_retired,
 (select count(*) from entries n where n.experiment_id=e.id) as entries,
 (select count(*) from artifacts a where a.experiment_id=e.id) as artifacts,
 (select count(*) from actions a where a.experiment_id=e.id and a.resolved_on is null) as open_actions,
 coalesce((select r.decision from reviews r where r.experiment_id=e.id and r.revision=e.revision),'not reviewed') as current_review,
 e.updated_at,e.conclusion
 from experiments e join projects p on p.id=e.project_id join protocols q on q.id=e.protocol_id;
create view research_attention with (security_invoker=true) as
 select code,owner,'Experiment overdue' as issue,due_on as due_date from experiments where state<>'closed' and due_on<current_date
 union all select e.code,e.owner,'No activity in 14 days',(select max(n.observed_on) from entries n where n.experiment_id=e.id)+14 from experiments e where e.state<>'closed' and coalesce((select max(n.observed_on) from entries n where n.experiment_id=e.id),e.created_at::date)<current_date-14
 union all select a.code,a.owner,'Action overdue',a.due_on from actions a where resolved_on is null and due_on<current_date
 union all select e.code,e.owner,'Retired protocol in active work',e.due_on from experiments e join protocols p on p.id=e.protocol_id where p.retired and e.state<>'closed'
 union all select a.code,a.imported_by,'Imported archive needs reconciliation',a.created_at::date from archives a where reconciliation_ref is null;
create view research_compliance with (security_invoker=true) as
 select p.code,'AU-R8 / local storage control' as rule,'Missing storage location or retention policy' as finding from projects p where nullif(trim(storage_ref),'') is null or nullif(trim(policy_ref),'') is null or retain_until is null
 union all select p.code,'Local backup policy','Backup verification absent or older than 30 days' from projects p where backup_verified_on is null or backup_verified_on<current_date-30
 union all select p.code,'Local retention policy','Retention date reached; owner review required' from projects p where retain_until<=current_date
 union all select e.code,'AU-R22 / record completeness','Completed work has no retained raw evidence' from experiments e where state in ('ready','closed') and not exists(select 1 from artifacts a where a.experiment_id=e.id)
 union all select e.code,'Local review policy','Closed experiment lacks acceptance of current revision' from experiments e where state='closed' and not exists(select 1 from reviews r where r.experiment_id=e.id and r.revision=e.revision and r.decision='accepted')
 union all select a.code,'AU-R22 / archive reconciliation','Archive not reconciled against original notebook' from archives a where reconciliation_ref is null
 union all select a.code,'AU-R22 / archive reconciliation','Export contains missing local links' from archives a where exists(select 1 from archive_files f where f.archive_id=a.id and jsonb_array_length(f.missing_links)>0);
revoke all on experiment_position,research_attention,research_compliance from public;
create function protocol_version_guard() returns trigger language plpgsql as $$ begin
 if TG_OP='DELETE' then raise exception 'Protocol versions cannot be deleted'; end if;
 if (new.code,new.version,new.title,new.body,new.author) is distinct from (old.code,old.version,old.title,old.body,old.author) then raise exception 'Write a new protocol version instead'; end if;
 return new; end $$;
create trigger protocol_guard before update or delete on protocols for each row execute function protocol_version_guard();
