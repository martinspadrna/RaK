-- RaK 1.7.44 TEST DB-only regression. Synthetic values only; no production data changed.
BEGIN;
DO $smoke$
DECLARE
  fixture record;
  actual boolean;
BEGIN
  FOR fixture IN
    SELECT * FROM (VALUES
      ('phone_plus', 'Kontakt: +420 777 123 456', true),
      ('phone_00420', 'Telefon 00420-777-123-456', true),
      ('phone_national', 'Telefon: 777 123 456', true),
      ('phone_mobile', 'mobil 777123456', true),
      ('os_diacritics', 'Osobní číslo: 12345', true),
      ('os_ascii', 'osobni cislo 987654', true),
      ('os_abbrev', 'OS č. 1234567', true),
      ('email', 'test@example.cz', true),
      ('bearer', 'Bearer abcdefghijklmnopqrstu', true),
      ('no_false_positive', 'Index 4 777 123 456', false),
      ('machine', 'MSKC04 index 420 - 777 / 123 kusů', false),
      ('unlabelled_id', '123456789', false),
      ('normal_note', 'Odstávka frézky, ranní směna', false)
    ) AS sample(label, value, expected)
  LOOP
    SELECT private.rak_rotation_has_restricted_public_value(
      jsonb_build_object('months', jsonb_build_object('9/26',
        jsonb_build_object('notes', jsonb_build_array(jsonb_build_object('text', fixture.value)))))
    ) INTO actual;
    IF actual IS DISTINCT FROM fixture.expected THEN
      RAISE EXCEPTION 'Rotation public guard regression: %', fixture.label;
    END IF;
  END LOOP;
  IF has_function_privilege('anon','private.rak_rotation_has_restricted_public_value(jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role must not call the private validator';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rotation_state
      WHERE private.rak_rotation_has_restricted_public_value(payload)
         OR private.rak_rotation_has_restricted_public_value(coalesce(meta,'{}'::jsonb))) THEN
    RAISE EXCEPTION 'Existing rotation violates privacy guard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rotation_state WHERE key='main' AND revision > 0) THEN
    RAISE EXCEPTION 'Rotation revision unavailable';
  END IF;
END;
$smoke$;
ROLLBACK;
