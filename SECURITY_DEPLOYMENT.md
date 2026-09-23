# RaK – bezpečné nasazení a rollback (development 1.7.51)

Tento postup nahrazuje zastaralý návod pro starou verzi aplikace. Platí pro **development** s testovací Supabase `cgshssdjgzzuprlwnabl`. Produkční `main`, jeho alias ani produkční databázi `bkqamcbkiwumsvelahxr` neměnit bez výslovného souhlasu vlastníka. Žádné service-role klíče, hesla, tokeny, soukromé ICS adresy ani OS číslo konkrétního člověka nepatří do repozitáře.

## Před změnou

1. Zjisti přesný `development` SHA a poslední Vercel preview deployment ve stavu `READY`; poznamenej oba identifikátory mimo veřejné logy s osobními daty. Zkontroluj, že `main` má stejný SHA jako před prací.
2. Ověř stav testovací Supabase, počet záloh, aktuální revizi rotace a seznam aplikovaných migrací. Aktuální snapshot/ZIP je přístupný jen vlastníkovi s platnou Auth relací; ZIP není veřejná záloha.
3. Změny seskup do jednoho tematického commitu, výhradně na `development`. Neměň autentizaci běžných zaměstnanců: **OS číslo bez dalšího hesla**. Správci používají samostatné heslo a Auth relaci.
4. DDL aplikuj pouze v testovací databázi, migraci vždy ulož do Git repozitáře. Neprováděj destruktivní změny před izolovaným testem obnovy.

## Build, testy a zveřejnění preview

1. CI musí sestavit `npm run vercel-build` **dvakrát**; oba průchody spouští `npm run check` a critical runtime smoke. Následují závěrečné release gates a skutečný HTTP audit anonymních/nesprávných tokenů výhradně proti testovací Supabase.
2. Od verze 1.7.51 se zdrojový ZIP pro vlastníkovu zálohu vytváří pouze z povoleného seznamu Git souborů. `node tools/backup-source-integrity-17051.mjs` musí potvrdit přesný Git SHA, shodu všech souborů v ZIP s inventářem a neporušené CRC. Není to náhrada za vyzkoušení výsledného ZIP na iPhonu.
3. Na Vercelu ověř `READY`, `aliasError=null`, branch `development` a přesný SHA shodný s úspěšným CI. Přes preview alias načti `/supabase-config.js`: musí uvádět aktuální číslo verze, testovací Supabase a shodný PWA build marker. Neodvozuj úspěch pouze ze zelené značky v GitHubu.
4. Na iPhonu ověř pouze oblasti změněné daným balíkem. U změn aktualizační logiky navíc zavři/spusť PWA a zkus starou cache; fyzický test se nikdy nevydává za provedený automatickým CI.

## Soukromí, export a obnova

- Rotace včetně jmen, absencí a běžných poznámek za **24 měsíců je stále anonymně čitelná**: rozhodnutí o OS-only provozu přijímá toto riziko. Citlivé důvody absencí do veřejné rotace neukládej. Soukromé `importMeta` a audit autorství patří mimo veřejný payload.
- Vlastnická kompletní ZIP záloha obsahuje sanitizovaná Auth metadata, nikoli funkční hesla, aktivní relace, tajné klíče ani kompletní platformní Auth dump. Výraz „úplná“ označuje připravený obnovovací balík s těmito výjimkami; samotné rozbalení není důkaz plné obnovitelnosti.
- Před produkčním cutoverem vyzkoušej **obnovu ZIP do nového izolovaného projektu**: schéma a migrace, data, soukromé importy, zásadní počty/revize, Storage, nové Auth účty, kritické čtení a chráněné zápisy. Dokud to neproběhne, P1.5 zůstává otevřený.
- Dřívější veřejné commity mohou obsahovat starší návody či identifikátory. Oprava současného souboru nemaže historii GitHubu a OS číslo neposkytuje ověřenou totožnost.

## Nouzový návrat (rollback)

1. Při chybě zastav další změny a ověř stav posledního úspěšného preview deploymentu a jeho kompatibilitu se současným schématem testovací DB. Zachovej aktuální snapshot a revizi; nepřepisuj rotaci jen kvůli chybě klienta.
2. Pro rollback aplikace na `development` zvol nový reverzní commit nebo návrat ke kompatibilnímu již ověřenému artefaktu. Nepoužívej `git push --force` ani přepis `main`. Ověř znovu dvojí build, testy, Vercel `READY`, SHA a testovací konfiguraci.
3. Nevracej databázové migrace smazáním tabulek. Je-li změna schématu nekompatibilní, připrav samostatnou dopřednou opravnou migraci a ověř ji v izolovaném projektu. Obnovu dat dělej ze schváleného snapshotu a kontroluj konflikty revizí.
4. Produkční rollback ani změnu aliasu nikdy nespouštěj automaticky; vyžadují výslovné svolení vlastníka, kompletní produkční zálohu a samostatné ověření.

**Stav:** tento dokument je aktuální provozní postup pro preview; skutečný produkční rollback, fyzický iPhone a izolovaná plná obnova zůstávají samostatnými neuzavřenými testy.
## Audit bezpečnostní plochy TEST – 2026-09-23

Rozsah auditu je přesný Git SHA `b52745fe6c84a58b3187bc0f5fdd39593c9df59f`, větev `development` a pouze TEST Supabase `cgshssdjgzzuprlwnabl`. Produkční projekt `bkqamcbkiwumsvelahxr`, `main`, produkční alias a produkční deployment nebyly změněny. Audit je nedestruktivní: nevytvořil DB zápis, nezobrazil podepsaný uživatelský JWT a nepoužil service-role klíč.

### Živý inventář TEST

- `supabase gen types` vrátil 20 tabulek: `announcements`, `app_keepalive`, `bug_reports`, `game_accounts`, `game_invites`, `game_sessions`, `game_stats`, `gomoku_wins`, `machine_settings`, `machine_settings_backups`, `rak_admin_audit_log`, `rak_admin_devices`, `rak_admin_profiles`, `rak_admin_secrets`, `rak_admin_settings_backups`, `rak_rotation_backups_v2`, `rotation_entries`, `rotation_months`, `rotation_state`, `rotation_state_backups`.
- Typové API vystavuje 24 RPC: `rak_admin_account_requires_auth`, `rak_admin_list_audit_v2`, `rak_admin_list_bug_reports_v2`, `rak_admin_list_rotation_backups_v2`, `rak_admin_restore_rotation_backup_v2`, `rak_admin_save_announcement_v2`, `rak_admin_save_machine_settings_v2`, `rak_admin_save_rotation_month_entries_v2`, `rak_admin_save_rotation_v2`, `rak_admin_touch_device`, `rak_admin_update_bug_report_v2`, `rak_admin_upsert_application_account`, `rak_admin_write_audit_v2`, `rak_app_keepalive`, `rak_lookup_account_for_login_v1`, `rak_lookup_account_for_login_v2`, `rak_owner_create_settings_backup_v2`, `rak_owner_delete_settings_backup_v2`, `rak_owner_get_settings_backup_v2`, `rak_owner_list_admin_devices`, `rak_owner_list_admin_profiles`, `rak_owner_list_settings_backups_v2`, `rak_owner_revoke_admin_device`, `rak_submit_bug_report_v2`.
- Aktivní RaK Edge Functions: `rak-admin-users` v5, `rak-absence-calendar` v3, `rak-test-seed-once` v2 a `rak-test-secret-check` v4; všechny mají `verify_jwt=true`. První dvě odmítly anonymní i záměrně neplatný JWT HTTP 401. Testovací seed/secret funkce nebyly volány.
- Statický průchod všech 48 migrací identifikoval 33 posledních zdrojových definic `rak_*` jako `SECURITY DEFINER`: `rak_admin_account_requires_auth`, `rak_admin_auth_capabilities`, `rak_admin_cleanup_expired_game_invites_v2`, `rak_admin_clear_announcement_v2`, `rak_admin_context`, `rak_admin_delete_bug_report_v2`, `rak_admin_list_application_accounts_v1`, `rak_admin_list_audit_v2`, `rak_admin_list_bug_reports_v2`, `rak_admin_list_rotation_backups_v2`, `rak_admin_restore_rotation_backup_v2`, `rak_admin_save_announcement_v2`, `rak_admin_save_machine_settings_v2`, `rak_admin_save_rotation_month_entries_v2`, `rak_admin_save_rotation_v2`, `rak_admin_touch_device`, `rak_admin_update_bug_report_v2`, `rak_admin_upsert_application_account`, `rak_admin_write_audit_v2`, `rak_app_keepalive`, `rak_lookup_account_for_login_v1`, `rak_lookup_account_for_login_v2`, `rak_owner_complete_backup_v1`, `rak_owner_create_settings_backup_v2`, `rak_owner_delete_settings_backup_v2`, `rak_owner_get_settings_backup_v2`, `rak_owner_list_admin_devices`, `rak_owner_list_admin_profiles`, `rak_owner_list_settings_backups_v2`, `rak_owner_revoke_admin_device`, `rak_read_rotation_v1`, `rak_submit_bug_report_v2`, `rak_submit_gomoku_win_v2`. Jde o inventář zdrojových migrací, nikoli náhradu za dotaz do živého `pg_catalog`.

### Negativní testy a veřejné zápisové cesty

Actions [run #202](https://github.com/martinspadrna/RaK/actions/runs/35810827612) na přesném SHA uspěl a provedl 18 živých sond proti TEST. Anonymní čtení adresáře účtů, admin zařízení, reportů, owner záloh, rotačních záloh a admin tajemství bylo odmítnuto HTTP 401. Stejně byly odmítnuty `rak_admin_context`, úplný owner export, admin directory RPC a owner device RPC. Úmyslně veřejná rotace a filtrovaná veřejná nastavení vrátila HTTP 200; 20 vrácených nastavení neobsahovalo privátní kategorie. Neplatné login vstupy vrátily sanitizované výsledky, neplatný keepalive a report HTTP 400 a padělaný JWT HTTP 401. Test nelogoval těla soukromých odpovědí, přihlašovací údaje ani platný JWT.

Úmyslné anonymní zápisy jsou omezeny na validačně svázané RPC `rak_app_keepalive` a `rak_submit_bug_report_v2`; negativní vstupy byly odmítnuty před zápisem. Kritické klientské zápisy rotace, měsíčních položek, nastavení strojů, oznámení a administrátorských reportů používají secure RPC gate. Platné zápisy jednotlivých rolí ani křížový přístup účtů nebyly bez odpovídajících TEST relací provedeny.

Nález uzavřen: živý `pg_catalog` potvrdil šest anonymně spustitelných `rak_*` RPC. `rak_lookup_account_for_login_v2` je podle migrace záměrný OS-only login helper, který dědí globální/per-caller limity V1 a po úspěšném vyhledání přidává pouze příznak `requiresAdminAuth`; nejde o ověření identity. `tools/security-public-surface-matrix.sql` byl proto srovnán se skutečným zamýšleným allowlistem a opravená rollback-only matice byla přímo proti TEST úspěšná: anon i authenticated bez request claims nevidí maskovaná admin nastavení, ověřený owner kontext je vidí a transakce byla vrácena. Tato oprava mění regresní očekávání podle již existujícího bezpečnostního kontraktu, nikoli runtime oprávnění.

### Osobní údaje, exporty a cache

- `rak-admin-users` vyžaduje platného uživatele, serverový `rak_admin_context` a roli owner/admin; deputy je vyloučen. Adresář vrací pouze `account_id`, `display_name`, `role`, `enabled`. Změny účtů jsou dále owner-only.
- `rak-absence-calendar` vyžaduje platného uživatele a roli owner/admin, povoluje jen GET/HEAD, omezuje odpověď na 2 MB a stahuje pouze z `calendar.google.com` s omezenými redirecty.
- Staré Vercel endpointy `/api/admin-users` a `/api/rotation-absence-calendar` jsou vyřazené a vracejí `410` s `Cache-Control: no-store`.
- Běžný export `export.js` balí zdrojové soubory podle manifestu; nepřidává živý databázový snapshot. Admin export zapisuje do soukromého souboru aktivní ID administrátorského účtu a označení role, což je osobní metadata určené pro administrátorský kontext.
- Owner disaster-recovery ZIP je dvakrát chráněn: kontrolou owner UI a owner-only RPC `rak_owner_complete_backup_v1`. Obsahuje sanitizované Auth údaje v allowlistu včetně e-mailu/telefonu a sanitizovaných identit, tedy skutečná osobní data. Výslovně zakazuje `encrypted_password`, potvrzovací/recovery tokeny, access/refresh tokeny a aktivní relace; tato záloha musí zůstat soukromá.
- Současný service worker obsluhuje jen GET na stejném originu, cizí origin ignoruje, `/api/` necachuje a odpovědi `no-store`/`private` neukládá. Předchozí stažené ZIPy, dříve nainstalované PWA cache a veřejnou Git historii nelze tímto auditem vzdáleně odvolat ani prohlásit za smazané.

### Připravená role matrix a neověřené položky

| Aktér | Negativní/pozitivní důkaz | Stav 2026-09-23 |
|---|---|---|
| anonymní | 18 PostgREST/RPC sond + 2 Edge Functions | doloženo pro kontrolované cesty |
| neplatný/padělaný JWT | PostgREST a 2 Edge Functions HTTP 401 | doloženo pro kontrolované cesty |
| owner | rollback-only SQL umí použít živou session a syntetické claims, ale neověřuje podpis externího JWT | nepovažovat za end-to-end ověřené |
| admin | serverové kontroly a zdrojový kontrakt existují | chybí skutečný podepsaný TEST JWT |
| deputy | má být vyloučen z owner/admin Edge Functions | chybí skutečný podepsaný TEST JWT |
| běžný uživatel | přihlášení je záměrně OS-only, bez Supabase Auth/JWT | není ekvivalentem role `authenticated`; privilegia nutno testovat zvlášť |
| cizí účet | očekává se odmítnutí vazby/profilu | chybí bezpečný TEST účet a podepsaná relace |
| odvolaná relace | existují statické a SQL regresní kontroly | chybí end-to-end druhé zařízení a skutečný odvolaný JWT |

Navazující živý katalogový audit na development HEAD `a9486dc5f38e06a2957d8a6d09c14b17eb346655` už ověřil přímo v TEST `pg_proc`/funkční EXECUTE, `pg_policies`, stav RLS a tabulková GRANT oprávnění. Všech 20 tabulek v `public` má RLS zapnuté. Přímé tabulkové zápisové granty `INSERT`/`UPDATE`/`DELETE` pro `anon` a `authenticated` jsou prázdné; veřejné zápisy tedy zůstávají svázané RPC. Anonymní EXECUTE allowlist je přesně šest funkcí: `rak_admin_account_requires_auth`, `rak_admin_auth_capabilities`, `rak_app_keepalive`, `rak_lookup_account_for_login_v1`, `rak_lookup_account_for_login_v2`, `rak_submit_bug_report_v2`. Supabase security advisor hlásí pět z nich jako anonymně dostupné `SECURITY DEFINER`; to je u těchto omezených veřejných endpointů vědomý návrh a každý z nich musí zůstat v regresním allowlistu, nikoli být automaticky umlčen. Advisor současně uvádí INFO pro RLS tabulky bez policies; u těchto tabulek nejsou přímé anon/authenticated granty a přístup je veden přes chráněná RPC. Stále chybí pozitivní end-to-end role matrix se skutečně podepsanými TEST JWT owner/admin/deputy/cizího účtu a odvolané relace; syntetické request claims nejsou důkaz podpisu. Proto P0.1, P0.3, P0.4, P1.1 a P1.2 zůstávají otevřené se stejnými procenty. Produkční DB se kvůli tomu nemění.
