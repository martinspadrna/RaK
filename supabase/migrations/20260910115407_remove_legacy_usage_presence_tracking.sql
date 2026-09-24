drop function if exists public.rak_admin_service_snapshot_v2();
drop function if exists public.rak_admin_usage_presence_v2(integer);
drop function if exists public.rak_usage_presence_admin(integer);
drop function if exists public.rak_usage_presence_touch(jsonb);

drop table if exists public.app_usage_events;
drop table if exists public.app_usage_devices;
drop table if exists public.rak_usage_presence;;
