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