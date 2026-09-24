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


### TEST hardening zápisu `loginNumber` – 2026-09-23

Živá rekurzivní matice ukázala, že RLS již vnořené `loginNumber` před anonymním/unsigned čtením skrývá, ale společný serverový guard `private.rak_rotation_has_restricted_public_key(jsonb)` jej neřadil mezi zakázané klíče pro nové veřejné `machine_settings`. Nešlo o aktuální anonymní čtecí únik; šlo o zbytečnou závislost na RLS místo obrany už při zápisu.

Do TEST byla proto přes `apply_migration` aplikována migrace `20260923045532_rak_block_login_number_in_public_machine_settings`. Přidává normalizovaný klíč `loginnumber` do stejného serverového denylistu jako `accountnumber`, `employeeid`, kontakty, tokeny a další soukromé identifikátory. Soukromé kategorie/klíče, zejména `WORKER_ROSTER_SETTINGS`, zůstávají explicitně oddělené a nejsou tímto pravidlem převáděny na veřejné. Produkční Supabase nebyla změněna.

Ověření po migraci: rekurzivní matice odmítla všech osm identit už na zápisové hranici; integrovaná public-data matice potvrdila 3 veřejně čitelné tabulky, 6 záměrných anonymních RPC, nulové přímé tabulkové zápisy pro `anon`/`authenticated`, nulový veřejný Storage a zachování live oznámení/legacy rotace; public-surface matice znovu potvrdila owner/anon oddělení. Privacy matice byla přepsána z vkládání dnes již zakázaných veřejných roster payloadů na očekávání `check_violation` a prošla proti TEST. Reverzní postup pouze pro TEST: obnovit přesnou předchozí definici `private.rak_rotation_has_restricted_public_key(jsonb)` z migrace `20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql` a znovu spustit uvedené matice; produkce se tímto postupem nemění.
## Kompletní audit zachovaných development preview, historických exportů a PWA – 2026-09-23

Read-only audit proběhl na development HEAD `60b2a137c92dcbe486b68727edd6f5ff572c9e76`. Vercel evidoval 34 deploymentů: 18 development pokusů (13 READY, čtyři ERROR a jeden CANCELED) a 16 READY main deploymentů. Main ani produkční runtime nebyl volán jako testovací cíl a nic na Vercelu se neměnilo.

Všech 13 zachovaných READY development buildů (`3c040643`, `cd6e8b89`, `630c1d0e`, `23b14e6b`, `2e710506`, `e0ea3d0a`, `445f6d18`, `173d57fd`, `b828a5e6`, `9eced072`, `50795a7c`, `7698b442`, `f2e064f8`) prošlo stejnou maticí. Přes autentizovaný `vercel curl`, bez shareable parametru a bez logování těl soukromých odpovědí, vrátily `/`, `/sw.js`, `/manifest.webmanifest` a `/export.js` HTTP 200; `/api/admin-users` a `/api/rotation-absence-calendar` HTTP 410. Každý `supabase-config.js` obsahoval TEST `cgshssdjgzzuprlwnabl`, nikoli produkční `bkqamcbkiwumsvelahxr`. Žádný kontrolovaný `sw.js` neobsahoval produkční ID ani řetězec Supabase runtime originu. Přímý anonymní požadavek na kořen každého immutable preview skončil HTTP 302 na sanitizovaný cíl `vercel.com/sso-api`; query parametry přesměrování nebyly vypsány.

Online historie zdrojů potvrdila, že starý i současný service worker přijímá jen GET stejného originu, cizí origin ignoruje, `/api/` vůbec neobsluhuje a odpovědi `no-store`/`private` neukládá. Před vyřazením na SHA `bb4d652dff55` ověřovala historická Vercel API bearer relaci přes Supabase `/auth/v1/user`, databázovou roli a u správy účtů owner gate; od vyřazení vracejí jen 410 s `Cache-Control: no-store`.

`export.js` je export zdrojového aplikačního ZIPu, nikoli volání databázového adresáře. Přidává aktuální rotaci do `data.js`; od 1.7.78 při selhání načtení čistého `index.html` bezpečně skončí před vytvořením ZIPu a nepoužije klon živého DOM. Úspěšně vytvořený ZIP s aktuální rotací musí zůstat soukromý. Úplný owner disaster-recovery ZIP záměrně obsahuje provozní osobní data a allowlist sanitizovaných Auth polí včetně e-mailu/telefonu, ale vylučuje hesla, potvrzovací/recovery tokeny, access/refresh tokeny, aktivní relace a `rak_admin_secrets`; přístup zůstává owner-only a skutečná podepsaná role matrix jej ostatním rolím odmítla.

Nevratné omezení: Git historii nelze tímto auditem přepsat a dříve stažené ZIPy, owner zálohy ani PWA/cache na jiných zařízeních nelze vzdáleně prohlásit za smazané nebo je odvolat. Žádné mazání Git historie, Safari/PWA dat, fronty ani uživatelských souborů neproběhlo. Historické checkboxy P0.1 a P0.3 byly tímto auditem doloženy na 80 % (4/5).

## Uzavření dlouhodobé privacy regrese P0.1 – 2026-09-23

Vydaný runtime 1.7.82 na SHA `1c6dc4e12eb4b1519e910a3b00bc64a1f5895767` obsahuje od funkčního SHA `62ced2d549b76f190748b6bbc1c9f77106b71ad0` fail-closed export bez klonování živého DOM. Dlouhodobé povinné kontroly zahrnují záporný VM scénář selhání čistého `index.html`, statický zákaz návratu DOM fallbacku a rekurzivní kontrolu osobních klíčů ve veřejných nastaveních i neplatných login odpovědích.

Actions #243 / run `35889947003` prošel včetně `npm run check`, dvou čistých kanonických buildů, ZIP/CRC, Chromium/offline a živého TEST HTTP auditu. Artefakt `rak-release-evidence-1c6dc4e12eb4b1519e910a3b00bc64a1f5895767` má výsledek PASS; Vercel deployment `dpl_6m3mDvWpRAXNRKhR1LaceaJnx7jd` je READY a odpovídá témuž SHA. Immutable i stabilní alias vrací release 1.7.82 / technickou 1.7.0, TEST `cgshssdjgzzuprlwnabl` a neobsahuje produkční `bkqamcbkiwumsvelahxr`. `main` a produkční deployment se nezměnily. P0.1 je tím uzavřeno na 100 % (5/5). P0.3 zůstává 80 % (4/5), protože fyzické soukromé stažení a otevření owner backup ZIPu na iPhonu nebylo doloženo.

Read-only Supabase CLI kontrola TEST projektu `cgshssdjgzzuprlwnabl` vrátila prázdný seznam dostupných záloh, vypnuté PITR, `walg_enabled=true` a region `eu-central-1`. Tento stav nelze vydávat za dostupný bod obnovy. Neproběhl restore, nevznikl nový projekt a produkční Supabase nebyla dotčena. P1.5 zůstává 43 %; jeho další uzavření vyžaduje předem schválený oddělený projekt, skutečnou obnovu a porovnání dat/Auth/Storage/rolí.
## Připravenost oddělené obnovy TEST – 2026-09-23

Čtecí inventář nezměnil žádný Supabase zdroj. `supabase backups list --project-ref cgshssdjgzzuprlwnabl` vrátil `backups=[]`, `pitr_enabled=false`, `walg_enabled=true`, region `eu-central-1`; `supabase branches list --project-ref cgshssdjgzzuprlwnabl` vrátil `null`. TEST tedy nemá dostupný deklarovaný bod obnovy, PITR ani preview větev. Produkční projekt `bkqamcbkiwumsvelahxr` nebyl čten ani měněn.

### Volba bezpečného cíle

| Cíl | Co může prokázat | Omezení | Rozhodnutí |
|---|---|---|---|
| nový oddělený recovery projekt | nezávislou obnovu databáze, Auth, Storage, funkcí a konfigurace | může vytvořit náklady; vytvoření vyžaduje výslovný souhlas vlastníka | jediný přijatelný cíl pro uzavření P1.5 |
| Supabase preview větev | migrace a schéma v izolaci | podle dokumentace je ve výchozím stavu bez dat a Storage objektů; používání větví je zpoplatněná funkcionalita | pouze doplňková zkouška, nikoli plná obnova |
| původní TEST projekt | žádný nezávislý důkaz obnovy | zásah by mohl přepsat jediný existující TEST stav | nepoužívat jako cíl restore |

Oficiální omezení, která musí důkaz respektovat: [Database Backups](https://supabase.com/docs/guides/platform/backups) nezahrnují samotné Storage objekty a stažené fyzické zálohy neobnovují hesla vlastních databázových rolí. [Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project) je beta; po klonu je nutné samostatně znovu nastavit Storage objekty, Edge Functions, Auth/API klíče, Realtime, rozšíření a další konfiguraci. Branching je podle [dokumentace](https://supabase.com/docs/guides/deployment/branching) data-less a storage-less ve výchozím stavu a podle [účtování](https://supabase.com/docs/guides/platform/manage-your-usage/branching) může přidat hodinové náklady.

### Připravený nedestruktivní postup po schválení

1. Na přesném schváleném Git SHA zaznamenat seznam migrací, tabulek, funkcí, RLS/policies, Auth profilů, Storage bucketů a objektů; do logů nepsat tajné klíče, hesla ani podepsané JWT.
2. Vytvořit nový oddělený recovery projekt pouze po výslovném souhlasu s případným nákladem. Původní TEST zůstane zdrojem jen pro čtení a nebude se mazat ani přepisovat.
3. Aplikovat migrace z přesného SHA a obnovit databázová data. Auth identity znovu bezpečně založit nebo převést podle podporovaného postupu; hesla, tokeny a aktivní relace nepovažovat za součást owner ZIP.
4. Storage objekty přenést samostatně a porovnat jejich názvy, velikosti a hashe; databázová záloha sama přenáší nanejvýš metadata.
5. Nasadit Edge Functions a znovu nastavit Auth, API klíče, Realtime a ostatní projektovou konfiguraci pouze pro recovery projekt.
6. Porovnat počty a deterministické hashe kritických tabulek, migrace, revize rotace, role/RLS a Storage. Spustit negativní anonymní/neplatný JWT test a pozitivní role matrix owner/admin/deputy/cizí účet/odvolaná relace bez zveřejnění tokenů.
7. Spustit aplikační smoke proti recovery projektu bez změny stabilního development aliasu. Při neshodě výsledek označit jako neúspěšný, recovery projekt izolovat a zachovat auditní záznam; žádný automatický zásah do původního TEST ani produkce.

Dokud není tento postup skutečně proveden a porovnán, P1.5 zůstává 43 % (3/7). Tento dokumentační balík nevytváří Vercel deployment a nezvyšuje verzi.

## Podepsaná role matrix TEST – 2026-09-23

Rozsah: přesný development SHA `72d1fd7870a917728967a1f1487c757e2b6684bc`, výhradně TEST `cgshssdjgzzuprlwnabl`. Čtyři náhodné dočasné Auth účty dostaly role owner/admin/deputy nebo žádný admin profil (cizí účet). Hesla, API klíče, access/refresh tokeny, JWT payloady a osobní odpovědi z exportu nebyly vypsány do logu ani uloženy do Git.

- skutečně podepsané owner/admin/deputy JWT prošly `rak_admin_context` a vracely přesnou roli; cizí JWT a anonymní požadavek byly odmítnuty;
- `rak_owner_list_admin_profiles` a `rak_owner_complete_backup_v1` byly povoleny pouze ownerovi; admin, deputy a cizí účet byly odmítnuty a obsah owner zálohy nebyl logován;
- Edge Function `rak-admin-users` s akcí `list-admin-directory` povolila owner/admin a odmítla deputy/cizí účet;
- owner odvolal dočasné deputy zařízení; původní podepsaný deputy JWT i pokus stejné relace znovu registrovat zařízení byly odmítnuty;
- samostatná zkouška prokázala rozdíl mezi odvoláním relace a hesla: starý token zůstal odmítnutý, nové přihlášení stejným platným heslem vytvořilo nový token/session a nový session-device záznam byl povolen;
- první rychlý doplňkový pokus vrátil owner kontext HTTP 401 před viditelností nové session; blok `finally` odstranil oba účty. Jediný řízený opakovaný pokus nejprve ověřil session v `auth.sessions` a pak prošel;
- po obou zkouškách bylo znovu přesně 3 Auth uživatelů a 3 admin profilů; žádný dočasný účet ani profil nezůstal. Syntetický audit odvolání neobsahuje osobní údaje.

```json
{"schema":"rak.signed-role-matrix.v1","git_sha":"72d1fd7870a917728967a1f1487c757e2b6684bc","supabase_project":"cgshssdjgzzuprlwnabl","checks":20,"roles":["owner","admin","deputy","foreign","anonymous","revoked"],"owner_backup_body_logged":false,"jwt_logged":false,"temporary_auth_users_before":3,"temporary_auth_users_after":3,"temporary_profiles_before":3,"temporary_profiles_after":3,"relogin":{"old_revoked_token_denied":true,"same_password_new_session_allowed":true,"new_session_registered":true}}
```

### Navazující katalog a advisor

Živý katalog potvrdil u všech 41 nalezených RaK `SECURITY DEFINER` funkcí vlastníka `postgres` a pevný prázdný `search_path`; jedna funkce bez textového volání standardního gate používá ekvivalentní `private.rak_is_admin()`. Security advisor vrátil 55 položek: 19 INFO `rls_enabled_no_policy`, 5 WARN pro záměrné anonymní `SECURITY DEFINER` endpointy, 30 WARN pro authenticated `SECURITY DEFINER` RPC a 1 WARN pro vypnutou ochranu uniklých hesel. Veřejný legacy admin-check je už na živé DB omezený na 300 požadavků/h globálně a 60/h na volajícího. Ochrana proti uniklým heslům je podle [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security) dostupná až od Pro plánu; vlastník povolil jen bezplatné řešení, proto nebyla zapnuta.

### Dopad do plánu

- P0.1: 60 % (3/5); P0.3: 60 % (3/5).
- P0.4: 80 % (4/5); zbývá fyzický Safari/PWA test.
- P1.1: 80 % (4/5); zbývá pravidlo pro případné další nutné politiky/migrace, produkce beze změny.
- P1.2: 80 % (4/5); zbývá fyzický Safari/PWA test relací a UX odmítnutí.
- P1.5: 43 % (3/7). Dva vlastní Free projekty obsazují bezplatné sloty; dva další viditelné projekty patří jinému účtu. Nebyl vytvořen ani pozastaven projekt, větev, PITR nebo placený add-on.

## Produkční release bundle 1.7.83 – připraveno, nenasazeno

Stav k 24. 9. 2026: **PREPARED_NOT_AUTHORIZED**. Tato kapitola je auditovatelný podklad, nikoli souhlas s produkčním zápisem. `main`, produkční alias, produkční deployment, produkční Supabase a její Edge Functions se smějí změnit až po novém jednoznačném potvrzení vlastníka. Druhá databázová fáze vyžaduje další potvrzení po fyzické přejímce první fáze. Nikdy se nesmí zveřejnit Vercel shareable parametr, heslo, tajný klíč ani podepsaný JWT.

### Neměnné vstupy a zjištěný stav

- Zdroj aplikace je funkční runtime SHA `7d6684d8027d0a08b8d8596d35fe73f3b0d1fbec`; dokumentační development základ před tímto balíkem byl `6ce08336d99319963ad2d680b7901032acbb42ee`.
- Viditelná verze zůstává `1.7.83`, technická `1.7.0`, cache `v1.7.83`, build `v1.7.83-about-release1`. Produkční propagace už ověřeného TEST releasu není nová funkční verze.
- Produkční Supabase je výhradně `bkqamcbkiwumsvelahxr`; TEST je `cgshssdjgzzuprlwnabl`. Záměna projektů je důvod okamžitě skončit.
- Produkční DB před vydáním končí RaK migrací `20260915193102 rak_owner_complete_backup_v1`. Chybí jí mimo jiné `rak_lookup_account_for_login_v1/v2`, `rak_admin_list_application_accounts_v1`, role `deputy`, session-device unikátnost a pozdější privacy guardy.
- Čtecí preflight našel 1 řádek rotace, nulové zakázané identity/kontakty/tokeny, nulové `current_employee_name`, nulová neplatná základní i měsíční struktura ve 106 zálohách, nulové duplicitní budoucí device klíče a nulové odvolané device řádky bez aktéra. Jeden `importMeta` je očekávaně přesunut migrací `20260919111542` do soukromé tabulky. V `machine_settings` je 32 soukromých řádků, které se nesmějí mazat; druhá fáze je pouze skryje veřejným rolím.
- Produkční Security Advisor před vydáním eviduje 13 INFO `rls_enabled_no_policy`, 4 WARN anonymních a 27 WARN authenticated `SECURITY DEFINER` endpointů a 1 WARN bezplatně nedostupné ochrany uniklých hesel. Po každé DB fázi se advisor spustí znovu a neznámé zvýšení znamená FAIL.
- Produkční Vercel zůstává na READY `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`.
- Aktivní produkční `rak-admin-users` je verze 7 s platform hash `33bcdcf464438c3357cb7a50b4bdcace737d775b2cd7bef8f1aef44730c7a32d`. Cílový zdroj na přesném SHA má SHA-256 `a49e6cf5cab1215365a8a56743fa8b8c3f63931704ab6a25ab0f6209989b3348`.

### Reconciliace Git historie

Tento dokumentační commit má mít prvního rodiče aktuální `development` a druhého rodiče `ceca9f9644da3dc41059c5d232661d27bc6dba18`. Strom aplikace zůstává stromem development; žádná main větev se tím nemění. Pět main-only commitů je tím historicky zachováno:

| main-only commit | Rozhodnutí v cílovém stromu |
|---|---|
| `18308f78` a `75f0672a` | staré minimum hesla 8/6 je vědomě nahrazeno jednotným minimem 12 v klientu i Edge Function |
| `c8e220f2` | kalírna je zachována současnou implementací v `rotation-tasks.js`, `kalirna-daymod-override.js` a regresních testech |
| `def12642` | předchozí produkční propagace je historicky zachována; nová propagace znovu vytvoří samostatný produkční konfigurační commit |
| `ceca9f96` | legacy smoke marker je zachován jako komentovaný kompatibilní marker v současném `supabase-config.js` |

### Fail-closed pořadí po prvním produkčním souhlasu

1. Znovu online ověřit přesná SHA `development` a `main`, READY rollback deployment, aktivní Edge verzi/hash, poslední produkční migraci a všechny výše uvedené preflight počty. Jakákoli neshoda zastaví vydání.
2. Vytvořit produkční konfigurační commit s rodičem tohoto reconciliovaného development commitu. Z `supabase-config.js` převzít produkční URL a publishable key z přesného stávajícího main, odstranit pouze TEST reset admin runtime, ponechat metadata `1.7.83/1.7.0` a všechny funkční vrstvy. Do `vercel.json` přidat `"main": false` vedle `"development": false`, aby samotný zápis do main nespustil deployment.
3. Posunout `main` pouze fast-forward na tento produkční konfigurační commit. Žádný deployment ještě nevytvářet.
4. Ručně spustit existující workflow `RaK development validation` na přesném main SHA. Jeho `verify` musí být SUCCESS; `release-preview` se při `workflow_dispatch` nespustí. Dva čisté buildy, npm check, ZIP/CRC, Chromium/offline a HTTP TEST audit musí projít beze změny testů.
5. Aplikovat jen databázovou **fázi A** níže. Každá migrace musí být načtena z přesného zdrojového SHA a její SHA-256 se musí shodovat s manifestem. Před prvním souborem změnit constraint rolí z `owner/admin` na `owner/admin/deputy` pouze pokud se jeho aktuální definice přesně rovná auditovanému baseline; jinak FAIL.
6. Nasadit cílový zdroj `rak-admin-users` s `verify_jwt=true`; zkontrolovat nový platform hash a negativní anonymous/invalid-JWT test bez vypsání tokenu. `rak-absence-calendar` se nemění.
7. Teprve nyní vytvořit jeden ruční Vercel preview deployment z prebuilt artefaktu přesného zeleného main SHA. Nehýbat produkčním aliasem. Ověřit READY, přesné SHA, `1.7.83/1.7.0`, přítomnost produkčního ID, nepřítomnost TEST ID, `/`, `sw.js`, metadata, manifest a API 401/403/410 kontrakty.
8. Po úspěšném immutable smoke přesunout pouze produkční alias na kandidáta. Stabilní development alias se nemění.
9. Uživatel fyzicky ověří na iPhonu online přihlášení běžného uživatele, owner/admin přihlášení a zařízení, stránku „O aplikaci“, načtení Rotace a jeden restart instalované PWA bez mazání dat. Chromium se za tento test nevydává.
10. Během přejímky se **fáze B neprovádí**. Při chybě se produkční alias vrátí na `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1`; fáze A zachovává legacy čtení, takže tento rollback cíl zůstává kompatibilní. Pokud problém souvisí s Edge Function, znovu se nasadí níže uložený zdroj verze 7.
11. Teprve po fyzickém PASS a druhém výslovném potvrzení se aplikují soubory fáze B, které uzavřou staré veřejné čtecí cesty a přidají privacy guardy. Po této fázi už starý deployment není automaticky bezpečný aplikační rollback; návrat vyžaduje nejdřív obnovu zachycených grantů/policies/funkcí, nikdy mazání dat.

**Doplněk produkčního preflightu 24. 9. 2026:** čtecí katalogová kontrola zjistila v `public.gomoku_wins` 101 historických řádků z období 26. 5.–23. 6. 2026. Vlastník potvrdil, že jde o historii odstraněných Her. Původní guard správně odmítl pokračovat, protože očekával prázdnou tabulku. Revidovaný soubor `20260918193324...` žádný řádek nemaže ani nemění; před uzavřením SELECT fail-closed ověří, že `anon` ani `authenticated` nemají zápisový grant ani EXECUTE na legacy zápisové RPC, a že už proběhl privacy cutover adresáře účtů. Historické řádky zůstávají zachované pro service-role/owner zálohu. Produkční aplikace 1.7.83 herní UI neobsahuje; kompatibilní bridge není aktivním volajícím. Fáze B se přesto nesmí provést bez úplného fyzického iPhone PASS a výslovného potvrzení vlastníka.
12. Vytvořit strojový release evidence artefakt s main SHA, Actions runem, dvěma buildy, DB migracemi a jejich hashy, Edge verzí/hash, Vercel deployment ID/READY/SHA, HTTP metadaty, aliasem a konkrétními rollback cíli. Neúplný nebo neznámý stav je FAIL.

Povinný SQL guard před změnou role constraintu:

~~~sql
DO $guard$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_definition
  FROM pg_constraint
  WHERE conrelid = 'public.rak_admin_profiles'::regclass
    AND conname = 'rak_admin_profiles_role_check';
  IF v_definition IS DISTINCT FROM
     'CHECK ((role = ANY (ARRAY[''owner''::text, ''admin''::text])))' THEN
    RAISE EXCEPTION 'Unexpected production admin role baseline';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rak_admin_profiles
             WHERE role NOT IN ('owner','admin')) THEN
    RAISE EXCEPTION 'Unexpected production admin role data';
  END IF;
END
$guard$;
ALTER TABLE public.rak_admin_profiles
  DROP CONSTRAINT rak_admin_profiles_role_check;
ALTER TABLE public.rak_admin_profiles
  ADD CONSTRAINT rak_admin_profiles_role_check
  CHECK (role IN ('owner','admin','deputy'));
~~~

### Strojově čitelný manifest

~~~json
{
  "schema": "rak.production-release-bundle.v1",
  "status": "PREPARED_NOT_AUTHORIZED",
  "prepared_at": "2026-09-24",
  "source_development_sha": "6ce08336d99319963ad2d680b7901032acbb42ee",
  "reconciled_main_parent": "ceca9f9644da3dc41059c5d232661d27bc6dba18",
  "runtime_sha": "7d6684d8027d0a08b8d8596d35fe73f3b0d1fbec",
  "display_version": "1.7.83",
  "technical_version": "1.7.0",
  "production_supabase": "bkqamcbkiwumsvelahxr",
  "test_supabase": "cgshssdjgzzuprlwnabl",
  "production_vercel_before": {
    "deployment_id": "dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1",
    "runtime_sha": "e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9",
    "state": "READY"
  },
  "production_edge_before": {
    "slug": "rak-admin-users",
    "version": 7,
    "platform_sha256": "33bcdcf464438c3357cb7a50b4bdcace737d775b2cd7bef8f1aef44730c7a32d"
  },
  "target_edge_source": {
    "path": "supabase/functions/rak-admin-users/index.ts",
    "sha256": "a49e6cf5cab1215365a8a56743fa8b8c3f63931704ab6a25ab0f6209989b3348"
  },
  "phase_a": [
    {
      "path": "supabase/migrations/20260918162343_rak_security_remove_bootstrap_and_bound_keepalive.sql",
      "sha256": "7dfc274cf588df2d1844c99a30fc23dbde6942bac9bbcaa541e238693915fbac"
    },
    {
      "path": "supabase/migrations/20260918163543_rak_limit_anonymous_reports_and_keepalive_devices.sql",
      "sha256": "b4648e8b5166d07a49094a7bdb03120e6f5fae6671742c3bdd0c65f2e33b8732"
    },
    {
      "path": "supabase/migrations/20260918164116_rak_admin_context_require_verified_session.sql",
      "sha256": "80f734b5c2649e31e1e981515d16bd0e2bf4035ce1eb839f02e5f0e3108f7cc1"
    },
    {
      "path": "supabase/migrations/20260918171858_rak_login_and_admin_directory_rpcs_stage.sql",
      "sha256": "65290cbe1d60f6fac986abf042bdf4f7a1c216228ca9c5a2772540a6fdd2617b"
    },
    {
      "path": "supabase/migrations/20260918180344_rak_cut_over_account_privacy_and_limit_public_lookup.sql",
      "take_before": "-- Eliminate unrestricted REST/GraphQL bulk reads; admin RPC remains role+session checked.",
      "sha256": "72b5bd408e421a79aeb79a29033eecef2cfb483cf9897d993760cdb62cc5f7b5",
      "bytes": 4328
    },
    {
      "path": "supabase/migrations/20260919141936_rak_bounded_admin_gate_and_login_v2.sql",
      "sha256": "3688af74fbd7947fac7385ad0ede0893214bfa2d4b8572c579d92d0056e8253b"
    },
    {
      "path": "supabase/migrations/20260919161000_rak_17048_admin_device_sessions_and_revocation.sql",
      "sha256": "c78fcbf8573442fdbcefa4551418e3d821b95a90d7172379ddd23657e9d75f51"
    },
    {
      "path": "supabase/migrations/20260919161500_rak_17048_admin_device_conflict_constraint_fix.sql",
      "sha256": "cab84188a67517f6d0a691a94f3a734a9cec269d13c17c3d48886275a76694bc"
    },
    {
      "path": "supabase/migrations/20260919165000_rak_17049_bug_report_device_info_allowlist.sql",
      "sha256": "03977a3ddce431454f2c5775a504f0925c53e8e0244f9f90db20d8098c4c8c4d"
    }
  ],
  "phase_b": [
    {
      "path": "supabase/migrations/20260918174200_close_unused_rotation_month_entry_reads.sql",
      "sha256": "c302fcf56217ba4460cb29371ea910ad68fb2af7b60c8a52226b91fefa2b673d"
    },
    {
      "path": "supabase/migrations/20260918180344_rak_cut_over_account_privacy_and_limit_public_lookup.sql",
      "sha256": "2bc9bde83ae072d007c9a4d8d6b82cf4cd71d5d699828226113de4c86ea466aa"
    },
    {
      "path": "supabase/migrations/20260918193324_rak_close_retired_gomoku_public_read.sql",
      "sha256": "dd8ebf4e9f40c835f32373155e5e52bf20bf324f97bdaf675d3f6e756ca23431"
    },
    {
      "path": "supabase/migrations/20260918195107_rak_stage_verified_employee_rotation_reader.sql",
      "sha256": "fc772c5ae2c7945265f36f5cb6d0dc4ff384ee6c4e9cecf48836951523e45ac8"
    },
    {
      "path": "supabase/migrations/20260918200612_rak_hide_legacy_rotation_backups_from_public_reads.sql",
      "sha256": "3fa30258bfbfc3033e63b2565042feeeb1fffa42e08373d0f0b725834993d706"
    },
    {
      "path": "supabase/migrations/20260918203159_rak_hide_legacy_admin_change_log_from_public_reads.sql",
      "sha256": "9f2388a3782b1f376fbf9ef7f7a494f77f8c2e352fb441454df2b731f1980399"
    },
    {
      "path": "supabase/migrations/20260918204000_rak_whitelist_owner_backup_auth_metadata.sql",
      "sha256": "e7d15c61925c2d5420073f697e9c69c343a336eefe902347466250a4e36eea19"
    },
    {
      "path": "supabase/migrations/20260918211310_rak_machine_settings_protect_admin_json_types.sql",
      "sha256": "0f02813a28736052005a1b32a3719bd7faf066d09ef194f83162fdf9d2fd6ae7"
    },
    {
      "path": "supabase/migrations/20260918214441_rak_hide_worker_roster_from_public_reads.sql",
      "sha256": "9f7f6fcc549da08de35ab16bdfb3e4ae6040c2f58820da5d871a3751745851bf"
    },
    {
      "path": "supabase/migrations/20260918220431_rak_announcements_hide_inactive_from_public_reads.sql",
      "sha256": "4ac7a4c030525d5ff427bc016fa4bdf1e0166217cab59d219d076af54e96e1bc"
    },
    {
      "path": "supabase/migrations/20260918220817_rak_machine_settings_hide_disguised_roster_payloads.sql",
      "sha256": "df85a1d2f60e2ae6373b454062de9031831bc79db1140018083258da75dc133d"
    },
    {
      "path": "supabase/migrations/20260919054241_rak_recursive_worker_privacy_and_profile_based_admin_lookup.sql",
      "sha256": "91b38fdae597379efd503b2e2ebfaa4b57c0dc42103876f4eb7c853c07544d7e"
    },
    {
      "path": "supabase/migrations/20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard.sql",
      "sha256": "266089cc952a115766bdb9f61b5e3718dc33a542b884112f8ffedddb58f777e7"
    },
    {
      "path": "supabase/migrations/20260919060210_rak_announcements_only_live_public_read.sql",
      "sha256": "d11759c96df83d9391f8be91080e9e8fc7b98a7ac4565161430b6a5c6d608fef"
    },
    {
      "path": "supabase/migrations/20260919062619_rak_worker_verified_email_recovery_staging.sql",
      "sha256": "04a77f17bd149bb16c820f09a8f3d7049da44a788f361da9bd633eda6158c488"
    },
    {
      "path": "supabase/migrations/20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql",
      "sha256": "19fb991ef8eec8d5f21de604f6276b106dada90c4c0cb02de0976d36141a1195"
    },
    {
      "path": "supabase/migrations/20260919081521_rak_public_rotation_reject_secret_text_values.sql",
      "sha256": "1f19c97c76133f94440788f9cde6f79e5dd5dfee48bebc6575050dd3838b84da"
    },
    {
      "path": "supabase/migrations/20260919085101_rak_public_rotation_remove_admin_actor_metadata.sql",
      "sha256": "8aa45e4483ac80aa7be0e3aafc05054da531332846712e19299960ac1d7c1c33"
    },
    {
      "path": "supabase/migrations/20260919111542_rak_rotation_archive_import_provenance.sql",
      "sha256": "95085f897a3a11a97fd0d2b58ee326703e60cb559edf0a25925131d70aa3568a"
    },
    {
      "path": "supabase/migrations/20260919132743_rak_owner_complete_backup_include_private_rotation_import_provenance.sql",
      "sha256": "d78f23ede03cedda160dc9e9514f831b9893e798a9c7efc6c3ff115c6d7254f9"
    },
    {
      "path": "supabase/migrations/20260919140220_rak_public_rotation_contact_os_guard_v3.sql",
      "sha256": "31136345c31de05d93b77fcfdd289c9a025199f345a7397b7dfe08d8f9ee5d29"
    },
    {
      "path": "supabase/migrations/20260919145342_rak_17046_telemetry_admission_and_backup_integrity.sql",
      "sha256": "3a2bbd491b1f2dfeb1505ed17a7b7f29324f561003784e85398ac4f2e1c97541"
    },
    {
      "path": "supabase/migrations/20260919153000_rak_17047_privacy_keys_machine_guard_backup_months.sql",
      "sha256": "6db9a6538e5b92621a89fb10e588195664f2026552a0a53b982b50257bcd4fd1"
    },
    {
      "path": "supabase/migrations/20260919185000_rak_17050_case_insensitive_private_settings_rls.sql",
      "sha256": "fee7b20d1ba13e35e42790e91387d55bda2b6369a9d25b913b5fe8b1701b5c0d"
    },
    {
      "path": "supabase/migrations/20260923045532_rak_block_login_number_in_public_machine_settings.sql",
      "sha256": "33ae1a1879a1489b8add38c5c1976b13589cf7f53f8dd4e2bcd6ba5c755f78fc"
    }
  ],
  "secrets_or_signed_jwt_in_artifact": false,
  "shareable_link_parameter_in_artifact": false
}
~~~

### Poznámka k fázi A

Výřez z `20260918180344...` končí těsně před markerem uvedeným v manifestu. Jeho přesný UTF-8 obsah má 4328 bajtů a SHA-256 `72b5bd408e421a79aeb79a29033eecef2cfb483cf9897d993760cdb62cc5f7b5`. Vytvoří omezené login tabulky a RPC, ale záměrně ještě neprovede `REVOKE SELECT` ani odstranění legacy policy. Celý soubor se použije až ve fázi B. Jakýkoli jiný výřez je FAIL.

### Rollback zdroj aktivní produkční Edge Function před vydáním

Následující zdroj byl přečten z aktivní produkční verze 7 při přípravě balíku. Neobsahuje literal tajného klíče, hesla ani JWT. Před nasazením nové verze se musí aktivní verze/hash znovu shodovat; jinak se tento rollback podklad nesmí použít bez nového auditu.

~~~typescript
import { withSupabase } from "npm:@supabase/server@1.4.1";

const ALLOWED_ORIGIN = "https://skoda-spada.vercel.app";
const RAK_PRODUCTION_ORIGINS = new Set([ALLOWED_ORIGIN, "https://rak.vercel.app"]);

function originAllowed(req: Request) {
  const origin = String(req.headers.get("origin") || "").trim();
  return !origin || RAK_PRODUCTION_ORIGINS.has(origin);
}

function responseHeaders(req: Request) {
  const headers: Record<string, string> = {
    "cache-control": "no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "vary": "Origin",
    "x-content-type-options": "nosniff",
  };
  const origin = String(req.headers.get("origin") || "").trim();
  if (origin === ALLOWED_ORIGIN) {
    headers["access-control-allow-origin"] = ALLOWED_ORIGIN;
  } else if (RAK_PRODUCTION_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function jsonResponse(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders(req) });
}

function validAccountId(value: unknown) {
  const accountId = String(value || "").trim();
  return /^\d{4,12}$/.test(accountId) && accountId !== "9811" ? accountId : "";
}

const authenticatedFetch = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (!originAllowed(req)) return jsonResponse(req, 403, { ok: false, error: "origin_not_allowed" });
  if (req.method !== "POST") return jsonResponse(req, 405, { ok: false, error: "method_not_allowed" });

  const { data: owner, error: ownerError } = await ctx.supabase.rpc("rak_admin_context");
  if (ownerError || !owner || (owner.role !== "owner" && owner.role !== "admin")) {
    return jsonResponse(req, 403, { ok: false, error: "admin_permission_required" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { ok: false, error: "invalid_request" });
  }

  const action = String(body.action || "");
  if (action === "change-own-password") {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || currentPassword.length > 128 || newPassword.length < 6 || newPassword.length > 128) {
      return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });
    }
    if (currentPassword === newPassword) {
      return jsonResponse(req, 400, { ok: false, error: "password_unchanged" });
    }
    const accountEmail = `${String(owner.account_id || "").trim()}@admin.rak.local`;
    const { data: verified, error: verifyError } = await ctx.supabase.auth.signInWithPassword({ email: accountEmail, password: currentPassword });
    if (verifyError || String(verified && verified.user && verified.user.id || "") !== String(owner.user_id || "")) {
      return jsonResponse(req, 403, { ok: false, error: "invalid_current_password" });
    }
    const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(String(owner.user_id || ""), { password: newPassword });
    if (updateError) return jsonResponse(req, 500, { ok: false, error: "password_update_failed" });
    return jsonResponse(req, 200, { ok: true });
  }

  if (action === "list-admin-directory") {
    const { data: profiles, error: profilesError } = await ctx.supabaseAdmin
      .from("rak_admin_profiles")
      .select("account_id,display_name,role,enabled")
      .in("role", ["owner", "admin"])
      .order("account_id", { ascending: true });
    if (profilesError) return jsonResponse(req, 500, { ok: false, error: "admin_directory_load_failed" });
    return jsonResponse(req, 200, { ok: true, profiles: profiles || [] });
  }

  if (owner.role !== "owner") {
    return jsonResponse(req, 403, { ok: false, error: "owner_permission_required" });
  }

  if (action === "change-owner-password") {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || currentPassword.length > 128 || newPassword.length < 6 || newPassword.length > 128) {
      return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });
    }
    if (currentPassword === newPassword) {
      return jsonResponse(req, 400, { ok: false, error: "password_unchanged" });
    }
    const ownerEmail = `${String(owner.account_id || "").trim()}@admin.rak.local`;
    const { data: verified, error: verifyError } = await ctx.supabase.auth.signInWithPassword({
      email: ownerEmail,
      password: currentPassword,
    });
    if (verifyError || String(verified && verified.user && verified.user.id || "") !== String(owner.user_id || "")) {
      return jsonResponse(req, 403, { ok: false, error: "invalid_current_password" });
    }
    const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(String(owner.user_id || ""), {
      password: newPassword,
    });
    if (updateError) return jsonResponse(req, 500, { ok: false, error: "password_update_failed" });
    return jsonResponse(req, 200, { ok: true });
  }

  const accountId = validAccountId(body.accountId);
  const displayName = String(body.displayName || "").trim().slice(0, 120);
  const password = String(body.password || "");
  const enabled = body.enabled !== false;
  if (!accountId || !displayName) {
    return jsonResponse(req, 400, { ok: false, error: "invalid_admin_profile" });
  }
  if (password && (password.length < 6 || password.length > 128)) {
    return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });
  }

  try {
    const { data: existing, error: lookupError } = await ctx.supabaseAdmin
      .from("rak_admin_profiles")
      .select("user_id,account_id,display_name,role,enabled")
      .eq("account_id", accountId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let userId = String(existing && existing.user_id || "");
    if (!userId) {
      if (!password) return jsonResponse(req, 400, { ok: false, error: "password_required_for_new_admin" });
      const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
        email: `${accountId}@admin.rak.local`,
        password,
        email_confirm: true,
        app_metadata: { rak_account_id: accountId, rak_role: "admin" },
        user_metadata: { display_name: displayName },
      });
      if (createError) throw createError;
      userId = String(created && created.user && created.user.id || "");
      if (!userId) throw new Error("auth_user_create_missing_id");
    } else if (password) {
      const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        app_metadata: { rak_account_id: accountId, rak_role: "admin" },
        user_metadata: { display_name: displayName },
      });
      if (updateError) throw updateError;
    }

    const { data: profile, error: profileError } = await ctx.supabaseAdmin
      .from("rak_admin_profiles")
      .upsert({
        user_id: userId,
        account_id: accountId,
        display_name: displayName,
        role: "admin",
        enabled,
        created_by: owner.user_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id" })
      .select("account_id,display_name,role,enabled")
      .single();
    if (profileError) throw profileError;

    return jsonResponse(req, 200, { ok: true, profile });
  } catch {
    return jsonResponse(req, 500, { ok: false, error: "admin_user_save_failed" });
  }
});

export default {
  fetch(req: Request, context: unknown) {
    if (req.method === "OPTIONS") {
      if (!originAllowed(req)) return jsonResponse(req, 403, { ok: false, error: "origin_not_allowed" });
      return new Response(null, {
        status: 204,
        headers: {
          ...responseHeaders(req),
          "access-control-allow-headers": "authorization, apikey, content-type",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-max-age": "600",
        },
      });
    }
    return authenticatedFetch(req, context);
  },
};

~~~
