drop policy if exists "machine_settings_anon_write_v622" on public.machine_settings;
create policy "machine_settings_anon_write_v622"
on public.machine_settings
for all
to anon
using (true)
with check (true);;
