-- RaK TEST ONLY. Publish active announcements, not archived/inactive drafts.
-- Admin/owner can still read historical rows through their verified Auth session.
DO $guard$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname='rak_announcements_public_read_v2' AND cmd='SELECT' AND qual='true') <> 1
 THEN RAISE EXCEPTION 'Unexpected announcement read policy baseline'; END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND cmd='SELECT') <> 1
 THEN RAISE EXCEPTION 'Unexpected additional announcement read policy'; END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements' AND column_name='is_active' AND data_type='boolean') <> 1
 THEN RAISE EXCEPTION 'Announcement active flag missing'; END IF;
END $guard$;

DROP POLICY rak_announcements_public_read_v2 ON public.announcements;

CREATE POLICY rak_announcements_active_public_read_v3
 ON public.announcements FOR SELECT TO anon
 USING (is_active IS TRUE);

CREATE POLICY rak_announcements_active_or_admin_read_v3
 ON public.announcements FOR SELECT TO authenticated
 USING (is_active IS TRUE OR (SELECT private.rak_is_admin()));

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='announcements' AND policyname IN ('rak_announcements_active_public_read_v3','rak_announcements_active_or_admin_read_v3') AND cmd='SELECT') <> 2
 THEN RAISE EXCEPTION 'Announcement read policies missing'; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
