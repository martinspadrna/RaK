-- Run in TEST. All fixture users, sessions and records roll back.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  sa uuid := gen_random_uuid(); sb uuid := gen_random_uuid(); sc uuid := gen_random_uuid();
  mutation uuid := gen_random_uuid(); answer jsonb; payload jsonb;
begin
  insert into auth.users(id) values(a),(b),(c);
  insert into auth.sessions(id,user_id,created_at) values(sa,a,now()),(sb,b,now()),(sc,c,now());
  insert into public.rak_admin_profiles(user_id,account_id,display_name,role,enabled)
    values(a,'9999999901','Cloud fixture A','owner',true),(b,'9999999902','Cloud fixture B','foreman',true),
      (c,'9999999903','Cloud fixture C','admin',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa,'role','authenticated')::text,true);
  payload := '{"date":"2026-10-11","shift":"B:nocni12","nitrogen":"999"}'::jsonb;
  answer := public.rak_save_shift_overview('2026-10-11','B:nocni12',payload,0,mutation);
  if answer->>'ok' <> 'true' or answer->'row'->>'revision' <> '1' then raise exception 'Insert failed'; end if;
  answer := public.rak_save_shift_overview('2026-10-11','B:nocni12',payload,0,mutation);
  if answer->'row'->>'revision' <> '1' then raise exception 'Retry was not idempotent'; end if;
  answer := public.rak_save_shift_overview('2026-10-11','B:nocni12',payload || '{"nitrogen":"1000"}',0,gen_random_uuid());
  if answer->>'conflict' <> 'true' then raise exception 'Stale save overwrote newer data'; end if;
  answer := public.rak_save_shift_overview('2026-10-11','B:nocni12',payload || '{"nitrogen":"1000"}',1,gen_random_uuid());
  if answer->'row'->>'revision' <> '2' then raise exception 'CAS update failed'; end if;
  if jsonb_array_length(public.rak_list_shift_overviews()) <> 1 then raise exception 'Own read failed'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb,'role','authenticated')::text,true);
  if jsonb_array_length(public.rak_list_shift_overviews()) <> 0 then raise exception 'Foreign account leak'; end if;
  perform public.rak_admin_touch_device('fixture-foreman-device','Fixture','1.9.26');
  begin perform public.rak_owner_list_admin_profiles(); raise exception 'Foreman owner directory accepted';
    exception when insufficient_privilege then null; end;
  begin perform public.rak_admin_list_audit_v2(1); raise exception 'Foreman admin audit accepted';
    exception when insufficient_privilege then null; end;
  answer := public.rak_save_shift_overview('2026-10-11','B:nocni12',payload,0,gen_random_uuid());
  if answer->'row'->>'revision' <> '1' then raise exception 'Account key isolation failed'; end if;
  begin
    perform public.rak_save_shift_overview('2026-10-12','B:nocni12',payload,0,gen_random_uuid());
    raise exception 'Wrong date accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.rak_save_shift_overview('2026-10-11','B:nocni12',payload || jsonb_build_object('huge',repeat('x',200001)),1,gen_random_uuid());
    raise exception 'Oversized payload accepted';
  exception when invalid_parameter_value then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'session_id',sc,'role','authenticated')::text,true);
  begin perform public.rak_list_shift_overviews(); raise exception 'Non-owner read accepted';
    exception when insufficient_privilege then null; end;
  begin perform public.rak_save_shift_overview('2026-10-11','B:nocni12',payload,0,gen_random_uuid()); raise exception 'Non-owner write accepted';
    exception when insufficient_privilege then null; end;
  update auth.sessions set created_at = now() - interval '1 day' where id = sa;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'session_id',sa,'role','authenticated')::text,true);
  begin perform public.rak_list_shift_overviews(); raise exception 'Unregistered old session accepted';
    exception when insufficient_privilege then null; end;
  update public.rak_admin_profiles set enabled = false where user_id = b;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'session_id',sb,'role','authenticated')::text,true);
  begin perform public.rak_list_shift_overviews(); raise exception 'Disabled owner accepted';
    exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.rak_list_shift_overviews(); raise exception 'Unauthenticated read accepted';
    exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','public.rak_shift_overviews','SELECT')
    or has_table_privilege('anon','public.rak_shift_overviews','SELECT')
    or has_function_privilege('anon','public.rak_list_shift_overviews()','EXECUTE')
    or has_function_privilege('anon','public.rak_save_shift_overview(date,text,jsonb,bigint,uuid)','EXECUTE')
    then raise exception 'Excess grants'; end if;
  if not (select relrowsecurity from pg_class where oid='public.rak_shift_overviews'::regclass) then raise exception 'Missing RLS'; end if;
end $$;
rollback;
select 'PASS: account isolation, auth, owner/foreman gate, CAS, idempotency, size/date validation, grants and RLS; fixtures rolled back' as result;
