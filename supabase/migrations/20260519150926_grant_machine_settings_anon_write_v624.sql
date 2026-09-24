grant select, insert, update on table public.machine_settings to anon;
grant select, insert, update on table public.machine_settings to authenticated;

drop policy if exists "machine_settings_anon_write_v624" on public.machine_settings;
create policy "machine_settings_anon_write_v624"
on public.machine_settings
for insert
to anon
with check (true);

drop policy if exists "machine_settings_anon_update_v624" on public.machine_settings;
create policy "machine_settings_anon_update_v624"
on public.machine_settings
for update
to anon
using (true)
with check (true);;
