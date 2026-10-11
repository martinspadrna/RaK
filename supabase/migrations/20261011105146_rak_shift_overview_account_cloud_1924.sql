-- TEST: private account backup, accessed only through verified owner RPCs.
create table public.rak_shift_overviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  shift_code text not null check (shift_code ~ '^[ABCD]:(ranni|nocni)(8|12)$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 200000),
  revision bigint not null default 1 check (revision > 0),
  mutation_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, shift_date, shift_code)
);
alter table public.rak_shift_overviews enable row level security;
revoke all on public.rak_shift_overviews from public, anon, authenticated;

create function public.rak_list_shift_overviews() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ctx jsonb; result jsonb;
begin
  ctx := public.rak_admin_context();
  if ctx->>'role' <> 'owner' then raise exception 'Owner authentication required' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) - 'user_id' order by r.shift_date desc, r.shift_code), '[]'::jsonb)
    into result from public.rak_shift_overviews r where r.user_id = (ctx->>'user_id')::uuid;
  return result;
end $$;

create function public.rak_save_shift_overview(p_date date, p_shift text, p_payload jsonb,
  p_expected_revision bigint, p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ctx jsonb; uid uuid; saved public.rak_shift_overviews%rowtype;
begin
  ctx := public.rak_admin_context();
  if ctx->>'role' <> 'owner' then raise exception 'Owner authentication required' using errcode = '42501'; end if;
  uid := (ctx->>'user_id')::uuid;
  if p_date is null or p_shift is null or p_shift !~ '^[ABCD]:(ranni|nocni)(8|12)$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 200000
    or p_payload->>'date' is distinct from p_date::text or p_payload->>'shift' is distinct from p_shift
    or p_expected_revision is null or p_expected_revision < 0 or p_mutation_id is null then
    raise exception 'Invalid shift overview' using errcode = '22023';
  end if;
  -- Serializes each account/date/shift, including inserts and lost-response retries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || '|' || p_date::text || '|' || p_shift, 0));
  select * into saved from public.rak_shift_overviews
    where user_id = uid and shift_date = p_date and shift_code = p_shift;
  if found then
    if saved.mutation_id = p_mutation_id and saved.payload = p_payload then
      return jsonb_build_object('ok', true, 'row', to_jsonb(saved) - 'user_id');
    end if;
    if saved.revision <> p_expected_revision then
      return jsonb_build_object('ok', false, 'conflict', true, 'row', to_jsonb(saved) - 'user_id');
    end if;
    update public.rak_shift_overviews set payload = p_payload, revision = revision + 1,
      mutation_id = p_mutation_id, updated_at = clock_timestamp()
      where user_id = uid and shift_date = p_date and shift_code = p_shift returning * into saved;
  else
    if p_expected_revision <> 0 then return jsonb_build_object('ok', false, 'conflict', true); end if;
    insert into public.rak_shift_overviews(user_id, shift_date, shift_code, payload, mutation_id)
      values(uid, p_date, p_shift, p_payload, p_mutation_id) returning * into saved;
  end if;
  return jsonb_build_object('ok', true, 'row', to_jsonb(saved) - 'user_id');
end $$;
revoke all on function public.rak_list_shift_overviews() from public, anon;
revoke all on function public.rak_save_shift_overview(date, text, jsonb, bigint, uuid) from public, anon;
grant execute on function public.rak_list_shift_overviews() to authenticated;
grant execute on function public.rak_save_shift_overview(date, text, jsonb, bigint, uuid) to authenticated;
