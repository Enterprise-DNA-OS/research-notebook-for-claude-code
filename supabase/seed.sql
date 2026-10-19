BEGIN;
select set_config('research.actor','Fictional demo seed',true);
DO $$ BEGIN
IF EXISTS(select 1 from projects where id='10000000-0000-0000-0000-000000000001') THEN RETURN; END IF;
insert into projects(id,code,name,owner,jurisdiction,storage_ref,policy_ref,retain_until,backup_verified_on) values
('10000000-0000-0000-0000-000000000001','COAT','Coastal coating research','Mira Chen','NZ','Private archive: coatings','RND-RET-01',current_date+1825,current_date-7),
('10000000-0000-0000-0000-000000000002','FIBRE','Plant fibre packaging','Noah Patel','AU',null,null,null,current_date-45) on conflict do nothing;
insert into protocols(id,code,version,title,body,author,retired) values
('20000000-0000-0000-0000-000000000001','ADHESION',1,'Coating adhesion comparison','Record specimen preparation, observations and source file references. This is a fictional record template, not an experimental procedure.','Mira Chen',false),
('20000000-0000-0000-0000-000000000002','FIBRE-LOG',1,'Fibre batch observation','Record batch reference and observations. Fictional demonstration only.','Noah Patel',true) on conflict do nothing;
insert into experiments(id,code,title,project_id,protocol_id,owner,hypothesis,due_on) values
('30000000-0000-0000-0000-000000000001','COAT-01','Coating adhesion baseline','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Mira Chen','Compare retained observations between two fictional formulations.',current_date-9),
('30000000-0000-0000-0000-000000000002','COAT-02','Coating repeatability','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Aroha Bell','Check whether repeat records support the same conclusion.',current_date+4),
('30000000-0000-0000-0000-000000000003','FIBRE-01','Fibre packaging baseline','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Noah Patel','Compare documented behaviour across fictional fibre batches.',current_date-3) on conflict do nothing;
insert into entries(id,experiment_id,kind,body,observed_on,author) values
('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','observation','Specimen A shows edge separation in the fictional record.',current_date-12,'Mira Chen'),
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','result','Repeat record is ready for an independent review.',current_date-2,'Aroha Bell'),
('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','deviation','Original source file reference is still missing.',current_date-24,'Noah Patel') on conflict do nothing;
insert into artifacts(id,experiment_id,label,location,sha256,captured_on,recorded_by) values
('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','Fictional observations','examples/observations.txt','d0efa69552284125a8a2d7bda9008e02d702aae41457db73fa2444058f9c6202',current_date-2,'Aroha Bell') on conflict do nothing;
insert into actions(id,code,experiment_id,description,owner,due_on) values
('60000000-0000-0000-0000-000000000001','ACT-01','30000000-0000-0000-0000-000000000001','Locate the original adhesion observations','Mira Chen',current_date-5),
('60000000-0000-0000-0000-000000000002','ACT-02','30000000-0000-0000-0000-000000000003','Replace the retired record template','Noah Patel',current_date+2) on conflict do nothing;
update experiments set state='ready',conclusion='Fictional repeat observations recorded for review.',revision=revision+1 where code='COAT-02';
END $$;
COMMIT;
