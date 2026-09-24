-- RaK 1.6 – keep the test/staging Realtime publication aligned with RaK-main.
-- Idempotent by design: on production this becomes a no-op when the tables are
-- already members of supabase_realtime.

do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach v_table in array array[
    'announcements',
    'game_accounts',
    'game_invites',
    'game_sessions',
    'game_stats',
    'gomoku_wins',
    'machine_settings',
    'rotation_entries',
    'rotation_months',
    'rotation_state'
  ]
  loop
    if to_regclass('public.' || v_table) is not null
       and not exists (
         select 1
         from pg_publication p
         join pg_publication_rel pr on pr.prpubid = p.oid
         join pg_class c on c.oid = pr.prrelid
         join pg_namespace n on n.oid = c.relnamespace
         where p.pubname = 'supabase_realtime'
           and n.nspname = 'public'
           and c.relname = v_table
       ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
