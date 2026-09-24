-- PostgreSQL has no jsonb_object_length function. Count object keys explicitly
-- when creating the automatic backup that precedes a schedule save.

create or replace function public.rak_admin_save_rotation_v2(
  p_key text,
  p_payload jsonb,
  p_meta jsonb default '{}'::jsonb,
  p_expected_revision bigint default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_row public.rotation_state%rowtype;
  next_revision bigint;
  profile public.rak_admin_profiles%rowtype;
  safe_key text := coalesce(nullif(trim(p_key), ''), 'main');
begin
  perform private.rak_require_admin(false);
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 8000000 then
    raise exception 'Invalid rotation payload' using errcode = '22023';
  end if;

  select * into profile from public.rak_admin_profiles where user_id = (select auth.uid());
  select * into current_row
  from public.rotation_state as state
  where state.key = safe_key
  for update;

  if current_row.key is not null then
    if p_expected_revision is null or p_expected_revision <> current_row.revision then
      raise exception 'Rotation was changed on another device'
        using errcode = '40001', detail = jsonb_build_object('expected', p_expected_revision, 'actual', current_row.revision)::text;
    end if;
    insert into public.rak_rotation_backups_v2 (
      rotation_key,
      payload,
      meta,
      revision,
      source,
      month_key,
      month_count,
      daymod_count,
      created_by,
      created_by_account_id,
      replaced_at
    ) values (
      current_row.key,
      current_row.payload,
      coalesce(current_row.meta, '{}'::jsonb),
      current_row.revision,
      left(coalesce(p_meta ->> 'source', 'save'), 120),
      left(coalesce(p_meta ->> 'monthKey', p_meta ->> 'month_key', ''), 20),
      case
        when jsonb_typeof(current_row.payload -> 'months') = 'object'
          then (select count(*)::integer from jsonb_object_keys(current_row.payload -> 'months'))
        else 0
      end,
      case
        when jsonb_typeof(current_row.payload -> 'dayMods') = 'object'
          then (select count(*)::integer from jsonb_object_keys(current_row.payload -> 'dayMods'))
        else 0
      end,
      profile.user_id,
      profile.account_id,
      now()
    );
    next_revision := current_row.revision + 1;
    update public.rotation_state as state
    set payload = p_payload,
        meta = coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('revision', next_revision, 'savedBy', profile.account_id),
        revision = next_revision,
        updated_at = now()
    where state.key = safe_key
    returning * into current_row;
  else
    if p_expected_revision is not null and p_expected_revision <> 0 then
      raise exception 'Rotation revision does not exist' using errcode = '40001';
    end if;
    next_revision := 1;
    insert into public.rotation_state (key, payload, meta, revision, updated_at)
    values (
      safe_key,
      p_payload,
      coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('revision', next_revision, 'savedBy', profile.account_id),
      next_revision,
      now()
    )
    returning * into current_row;
  end if;

  perform private.rak_write_admin_audit(
    'rotation.save',
    'rotation_state',
    safe_key,
    jsonb_build_object('revision', current_row.revision, 'source', coalesce(p_meta ->> 'source', ''))
  );
  return jsonb_build_object(
    'ok', true,
    'key', current_row.key,
    'payload', current_row.payload,
    'meta', current_row.meta,
    'revision', current_row.revision,
    'updated_at', current_row.updated_at
  );
end;
$$;

revoke all on function public.rak_admin_save_rotation_v2(text, jsonb, jsonb, bigint) from public;
grant execute on function public.rak_admin_save_rotation_v2(text, jsonb, jsonb, bigint) to authenticated;
