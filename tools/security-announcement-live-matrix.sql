-- RaK TEST: only currently valid announcements are public. Rollback-only fixtures.
BEGIN;
DO $setup$ DECLARE claims text; BEGIN
 IF (SELECT count(*) FROM public.announcements WHERE is_active IS TRUE)<>0 THEN RAISE EXCEPTION 'Live notice exists: choose non-disruptive test window'; END IF;
 SELECT pg_catalog.jsonb_build_object('sub',p.user_id,'session_id',s.id,'role','authenticated')::text INTO claims FROM public.rak_admin_profiles p JOIN auth.sessions s ON s.user_id=p.user_id WHERE p.role='owner' AND p.enabled ORDER BY s.created_at DESC LIMIT 1;
 IF claims IS NULL THEN RAISE EXCEPTION 'Owner session unavailable'; END IF;
 PERFORM pg_catalog.set_config('rak.notice_owner',claims,true);
 PERFORM pg_catalog.set_config('rak.notice_total',(SELECT count(*)::text FROM public.announcements),true);
 INSERT INTO public.announcements(title,message,is_active,starts_at,ends_at) VALUES
 ('RAK_LIVE_V4_ROLLBACK','synthetic live notice',true,pg_catalog.now()-interval '1 hour',pg_catalog.now()+interval '1 hour'),
 ('RAK_SCHEDULED_V4_ROLLBACK','synthetic future draft',false,pg_catalog.now()+interval '1 day',pg_catalog.now()+interval '2 days'),
 ('RAK_EXPIRED_V4_ROLLBACK','synthetic expired draft',false,pg_catalog.now()-interval '2 days',pg_catalog.now()-interval '1 day'),
 ('RAK_ARCHIVE_V4_ROLLBACK','synthetic inactive draft',false,NULL,NULL);
END $setup$;
SET LOCAL ROLE anon;
DO $live$ BEGIN IF (SELECT count(*) FROM public.announcements WHERE title LIKE 'RAK_%_V4_ROLLBACK')<>1 THEN RAISE EXCEPTION 'Anon must see only live notice'; END IF; END $live$;
RESET ROLE;
UPDATE public.announcements SET starts_at=pg_catalog.now()+interval '1 day',ends_at=pg_catalog.now()+interval '2 days' WHERE title='RAK_LIVE_V4_ROLLBACK';
SET LOCAL ROLE anon;
DO $future$ BEGIN IF EXISTS(SELECT 1 FROM public.announcements WHERE title LIKE 'RAK_%_V4_ROLLBACK') THEN RAISE EXCEPTION 'Future notice exposed'; END IF; END $future$;
RESET ROLE;
UPDATE public.announcements SET starts_at=pg_catalog.now()-interval '2 days',ends_at=pg_catalog.now()-interval '1 day' WHERE title='RAK_LIVE_V4_ROLLBACK';
SET LOCAL ROLE anon;
DO $expired$ BEGIN IF EXISTS(SELECT 1 FROM public.announcements WHERE title LIKE 'RAK_%_V4_ROLLBACK') THEN RAISE EXCEPTION 'Expired notice exposed'; END IF; END $expired$;
RESET ROLE;
UPDATE public.announcements SET starts_at=pg_catalog.now()-interval '1 hour',ends_at=pg_catalog.now()+interval '1 hour' WHERE title='RAK_LIVE_V4_ROLLBACK';
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claims','{}',true);
DO $unsigned$ BEGIN IF (SELECT count(*) FROM public.announcements WHERE title LIKE 'RAK_%_V4_ROLLBACK')<>1 THEN RAISE EXCEPTION 'Unsigned notice visibility incorrect'; END IF; END $unsigned$;
SELECT pg_catalog.set_config('request.jwt.claims',pg_catalog.current_setting('rak.notice_owner'),true);
DO $owner$ BEGIN IF (SELECT count(*) FROM public.announcements)<>pg_catalog.current_setting('rak.notice_total')::int+4 THEN RAISE EXCEPTION 'Owner lost scheduled/archive visibility'; END IF; END $owner$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: public reads current only; future, expired, inactive hidden; unsigned and owner scoped; all notice fixtures rolled back' AS result;
