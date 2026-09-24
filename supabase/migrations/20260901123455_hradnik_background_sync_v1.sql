select cron.unschedule(jobid) from cron.job where jobname = 'hradnik_catalog_daily_sync';
select cron.schedule('hradnik_catalog_daily_sync','0 3 * * *', $$select net.http_post(
  url := 'https://bkqamcbkiwumsvelahxr.supabase.co/functions/v1/hradnik-sync',
  headers := jsonb_build_object('Content-Type','application/json','x-hradnik-sync-key',(select sync_key from public.hradnik_sync_control where id=true)),
  body := '{}'::jsonb,
  timeout_milliseconds := 15000
)$$);;
