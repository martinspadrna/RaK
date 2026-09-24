-- RaK TEST ONLY: announcement history and scheduled notices are visible only to verified admins.
-- A published notice is public only inside its validity interval; current active notices without dates stay readable.
DO $guard$ BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_active_public_read_v3','rak_announcements_active_or_admin_read_v3'))<>2
 THEN RAISE EXCEPTION 'Unexpected announcement policy baseline'; END IF;
 IF EXISTS(SELECT 1 FROM public.announcements WHERE is_active IS TRUE AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at<=starts_at)
 THEN RAISE EXCEPTION 'Invalid scheduled notice interval, review first'; END IF;
END $guard$;
DROP POLICY rak_announcements_active_public_read_v3 ON public.announcements;
DROP POLICY rak_announcements_active_or_admin_read_v3 ON public.announcements;
CREATE POLICY rak_announcements_live_public_read_v4 ON public.announcements FOR SELECT TO anon
 USING (is_active IS TRUE AND (starts_at IS NULL OR starts_at<=pg_catalog.now()) AND (ends_at IS NULL OR ends_at>pg_catalog.now()));
CREATE POLICY rak_announcements_live_or_admin_read_v4 ON public.announcements FOR SELECT TO authenticated
 USING ((is_active IS TRUE AND (starts_at IS NULL OR starts_at<=pg_catalog.now()) AND (ends_at IS NULL OR ends_at>pg_catalog.now())) OR (SELECT private.rak_is_admin()));
DO $verify$ BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_live_public_read_v4','rak_announcements_live_or_admin_read_v4'))<>2 THEN RAISE EXCEPTION 'Live notice RLS missing'; END IF;
 IF has_table_privilege('anon','public.announcements','UPDATE') OR has_table_privilege('anon','public.announcements','DELETE') THEN RAISE EXCEPTION 'Public announcement write grant unexpected'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';