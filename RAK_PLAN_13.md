# RaK – závazný plán 13 oblastí, kontrolní úkoly a průběžný postup

**Výchozí audit: 21. 9. 2026.** Repo `martinspadrna/RaK`, výchozí `development` SHA `ae0ed9d5cacffbabe38486b171a8793ee281d6a4`, poslední ověřená funkční testovací verze `1.7.69` na commitu `1693c8631c13d6e381e44a96810a55140ad6aa62`; technická verze musí zůstat `1.7.0`. Tento dokument je změna plánu, **nikoli dokončená oprava aplikace nebo nový release**. `main` a produkční Supabase beze změn. Podrobné provedení stabilizace: [RAK_STABILIZATION_PLAN.md](RAK_STABILIZATION_PLAN.md); historický stav a důkazy: [RAK_PLAN_17068_STATUS.md](RAK_PLAN_17068_STATUS.md) a předchozí stavové soubory. Stabilizační milníky S1–S6 jsou podúkoly níže uvedených oblastí, **ne čtrnáctý bod**.

## 0. Jak budeme počítat a aktualizovat procenta

- Každá položka `[x]` je **doložená splněná akceptační podmínka**, `[ ]` je nesplněná nebo nedostatečně doložená. Všechny podmínky v jednom bodě mají stejnou váhu; `% = zaškrtnuté / celkem × 100`, zaokrouhleno na celé procento. Neodhadovat podle počtu commitů, napsaného kódu nebo toho, že CI jednou zezelenalo.
- Jakmile regresní chyba zpochybní dříve splněnou podmínku, okamžitě ji odškrtnout a procento snížit. Splnění se váže ke konkrétnímu důkazu a prostředí, ne k tvrzení v changelogu. Budeme průběžně zapisovat datum, SHA, CI run, Vercel stav a výsledek relevantního testu. Nedoložené = nesplněné.
- **100 % znamená všechny podmínky opravdu splněné**, u oblastí s provozem i fyzický Safari / skutečný test, kde to bod vyžaduje. Jediná výjimka P0.2: **100 % je dokončení a zdokumentování rozhodnutí přijmout riziko; není to 100% zabezpečení veřejných dat.** Technická bilance se počítá odděleně.
- Nic nemažeme z plánu jen proto, že to nejde ověřit bez uživatelské akce, autentizovaných tokenů, zařízení nebo nákladů; označíme blokátor a zachováme položku otevřenou. Přijaté riziko lze uzavřít pouze výslovným rozhodnutím vlastníka s popisem dopadu.
- Pro každý realizační balík aktualizovat v tomto **jednom kanonickém dokumentu** checkboxy, procenta, důkazy, nově odhalené regrese a nejbližší kroky. Historické soubory jsou archiv, nesmí řídit současný stav. Průběžný report: hotovo / nově ověřeno / zbývá / celkové body / přesný SHA / CI / Vercel / konkrétní iPhone test.

## Přehled k výchozímu auditu

| Bod | Výsledek | Procento | Povaha stavu |
|---|---|---:|---|
| P0.1 | Účty a data pracovníků | **80 % (4/5)** | Otevřeno, OS-only omezení trvá |
| P0.2 | Soukromí sdílené rotace | **100 % (5/5)** | Uzavřeno **pouze rozhodnutím o přijatém riziku** |
| P0.3 | API, exporty a historické klienty | **80 % (4/5)** | Otevřeno |
| P0.4 | Role vlastníka a administrátorů | **80 % (4/5)** | Otevřeno |
| P1.1 | Databázová oprávnění, RLS a RPC | **80 % (4/5)** | Otevřeno |
| P1.2 | Administrátorské heslo, relace a zařízení | **80 % (4/5)** | Otevřeno |
| P1.3 | Reprodukovatelný build, testy a verze | **100 % (6/6)** | Uzavřeno; kanonický build, stabilní testy, jednotná metadata a regresní parita |
| P1.4 | CI před nasazením, rollout a rollback | **100 % (6/6)** | Uzavřeno; automatický auditní řetězec konkrétního releasu je doložen |
| P1.5 | Úplné zálohy a prokazatelná obnova | **43 % (3/7)** | Otevřeno; shadow restore není úplná obnova |
| P2.1 | Výkon startu PWA | **20 % (1/5)** | Otevřeno |
| P2.2 | Rozložení, DOM, CSS a interakce | **40 % (2/5)** | Otevřeno |
| P2.3 | Offline, fronta, verze a konflikty | **25 % (2/8)** | **Otevřeno; fyzický iPhone selhal i na 1.7.77, další pokusy jsou rozhodnutím vlastníka odloženy** |
| P2.4 | Bezpečná diagnostika a průběžná kvalita | **33 % (2/6)** | Otevřeno |

**Bilance: 3/13 uzavřeny (P0.2 rozhodnutím o riziku, P1.3 a P1.4 technicky), 10/13 otevřených.** Procenta nejsou obecnou známkou bezpečnosti ani příslibem bezchybnosti.

---

## P0 · Bezpečnost a soukromí

### P0.1 – Účty a data pracovníků · **80 % (4/5)**

Cíl: omezit zbytečné zveřejňování osobních údajů bez změny vlastníkem schváleného přihlášení zaměstnanců.

- [x] Zabránit anonymnímu čtení celého adresáře zaměstnanců; ověřeno dosavadními API a anonymními HTTP kontrolami.
- [x] Omezit vyhledání účtu přes lookup v2 a zachovat běžné přihlášení výhradně OS číslem.
- [x] Projít staré exporty, předchozí PWA/service worker a zálohy z hlediska dostupnosti adresáře, kontaktů a citlivých metadat; zdokumentovat, co nelze vzít zpět z Git historie či už stažených kopií.
- [x] Ověřit povolené a zakázané datové cesty se skutečnými podepsanými owner/admin/deputy JWT i anonymní relací; nikdy nevystavovat token v logu.
- [ ] Přidat dlouhodobé regresní kontroly rozsahu osobních polí v odpovědích a exportech, včetně negativních případů.

**Dokončení:** všechny soukromé údaje mimo výslovně přijatý rozsah veřejné rotace chráněné a prověřené napříč novým i historickým klientem. **Omezení:** zaměstnancům nepřidávat hesla, e-maily, OTP ani vlastní Supabase Auth účty.

### P0.2 – Sdílená rotace a soukromí · **100 % (5/5; rozhodnutí, ne technická ochrana)**

Cíl: explicitně uzavřít konflikt mezi OS-only přístupem, společným/offline rozpisem a důvěrností dat; nepředstírat zabezpečení, které neexistuje.

- [x] Potvrzené rozhodnutí: běžní zaměstnanci se přihlašují pouze OS číslem, bez hesla/e-mailu/OTP/Auth registrace.
- [x] Zdokumentováno, že společný rozpis/offline režim vyžaduje v současném modelu veřejné čtení.
- [x] Soukromá `importMeta`, kontakty a autorství administrátora odděleny od veřejného rozpisu.
- [x] Zbytkové riziko výslovně pojmenováno: anonymně dostupná jména, běžné absence a zhruba 24 měsíců historie; OS číslo samo neověřuje identitu.
- [x] Stanoveno pravidlo: citlivé důvody absencí se do veřejné tabulky neukládají; případné jiné řešení vyžaduje novou domluvu s vlastníkem.

**Dokončení:** rozhodnutí uzavřeno, **ne** tvrzení, že jména a absence jsou soukromé. Nový nález širšího úniku patří zpět do P0.1/P0.3/P1.1 a může vyžadovat nové rozhodnutí.

### P0.3 – API, exporty a staré klienty · **80 % (4/5)**

- [x] Omezené login/legacy admin API, allowlist reportů a testovací HTTP sondy anonymního a neplatného JWT (dosavadní sada 18 kontrol).
- [x] Kontroly formátu ZIP, manifestu, kontrolních součtů/CRC a povolených typů souborů existují.
- [x] Reálně vyzkoušet owner/admin/deputy JWT, odmítnutí cizího účtu a přístup k privilegovaným exportům/API.
- [ ] Ověřit soukromé stažení a otevření zálohy na skutečném iPhonu, bez úniku do veřejných umístění.
- [x] Prověřit staré PWA/cache, chování chráněné Vercel preview URL a API/exporty ze starších buildů; regresní testy nesmějí obejít autorizaci.


**Kompletní audit zachovaných development preview, exportů a PWA 23. 9. 2026:** Vercel eviduje 34 deploymentů; z 18 development pokusů je 13 READY, čtyři ERROR a jeden CANCELED. Všech 13 READY buildů (`3c040643`, `cd6e8b89`, `630c1d0e`, `23b14e6b`, `2e710506`, `e0ea3d0a`, `445f6d18`, `173d57fd`, `b828a5e6`, `9eced072`, `50795a7c`, `7698b442`, `f2e064f8`) bylo prověřeno přes autentizovaný Vercel CLI bez shareable parametru: hlavní HTML, `sw.js`, manifest a `export.js` vracely HTTP 200; oba vyřazené endpointy `/api/admin-users` a `/api/rotation-absence-calendar` HTTP 410; konfigurace obsahovala pouze TEST `cgshssdjgzzuprlwnabl` a nikoli produkční `bkqamcbkiwumsvelahxr`. Přímý anonymní vstup na každý preview origin skončil HTTP 302 na `vercel.com/sso-api`; query parametry nebyly logovány. Starý i současný zdroj service workeru ignoruje cizí origin a `/api/`, necachuje odpovědi `no-store`/`private` a neobsahuje produkční ID ani Supabase runtime cache. Historické Vercel API před vyřazením ověřovalo bearer token přes `/auth/v1/user`, databázovou roli a owner gate. Běžný ZIP export balí zdroj aplikace a aktuální rotaci; při výjimečném selhání načtení čistého `index.html` může použít klon živého DOM, proto se i tento stažený ZIP musí považovat za soukromý. Owner disaster-recovery ZIP záměrně obsahuje provozní osobní data a sanitizované Auth údaje, je chráněn owner-only RPC a po stažení jej nelze vzdáleně odvolat. Stejně nelze přepsat Git historii ani prohlásit za smazané dříve stažené ZIPy či PWA cache na cizích zařízeních; žádné mazání historie nebo uživatelských dat neproběhlo. Tím jsou historické podmínky P0.1 a P0.3 doložené a oba body se zvyšují na 80 % (4/5). Automatická dlouhodobá regrese rozsahu osobních polí a fyzické soukromé otevření backup ZIPu na iPhonu zůstávají otevřené.
**Dokončení:** každý export/API má zdokumentovaný datový rozsah a pozitivní i negativní test ve skutečném prostředí.

### P0.4 – Role vlastníka a administrátorů · **80 % (4/5)**

- [x] Existuje logika odvolávání autentizovaných relací a přístupové diagnostiky bez zveřejňování tokenů.
- [x] Existuje testovací SQL matice oprávnění v rollback transakci / syntetických rolích.
- [x] Otestovat skutečné přihlášení owner, admin a deputy s platnými podepsanými relacemi.
- [x] Ověřit hranice rolí: cizí účet, běžný zaměstnanec, anonymní přístup a odvolaná relace nesmějí získat privilegované operace.
- [ ] Zopakovat přihlášení, správu a odvolání zařízení na skutečném iPhonu v Safari/PWA.

**Dokončení:** pro každou roli doložené povolené i zakázané akce, bez změny OS-only režimu zaměstnanců.

## P1 · Architektura, spolehlivost a obnova

### P1.1 – Databázová oprávnění, RLS a RPC · **80 % (4/5)**

- [x] Základní RLS a omezení veřejného přístupu nad současným souborem přibližně 20 tabulek; dosavadní testovací anonymní sondy.
- [x] Syntetická SQL role matrix a kontrola privátních nastavení bez trvalých testovacích zápisů.
- [x] Provést autorizované pozitivní/negativní kontroly se skutečnými JWT všech privilegovaných rolí.
- [x] Zinventarizovat všechny privilegované RPC (včetně `SECURITY DEFINER`), `GRANT`, RLS a všechny veřejné cesty zapisující do provozních tabulek; vyhodnotit křížový přístup účtů.
- [ ] Každou nutnou úpravu politik nasadit nejprve do TEST s migrací, testem i reverzním postupem; ověřit, že nepoškodila běžný provoz.

**Dokončení:** bezpečnost stojí na serverových pravidlech, nikoli jen na skrytých tlačítkách; přijatá výjimka veřejného čtení rozpisu je jasně oddělená. Produkční DB bez výslovného schválení neměnit.

### P1.2 – Administrátorské heslo, relace a zařízení · **80 % (4/5)**

- [x] Oddělené administrátorské Auth relace navázané na uživatele, session a zařízení; omezený bootstrap.
- [x] Obnovení již odvolané relace je blokováno.
- [x] Ověřit podpisy a expiraci na skutečných owner/admin/deputy relacích v TEST.
- [x] Ověřit odvolání na druhém zařízení a přesně rozlišit „odvolaná relace“ versus „nové přihlášení se stále platným heslem“.
- [ ] Reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.

**Dokončení:** konzistentní serverová ochrana i po restartu a odvolání, nikoli pouze klientský příznak `adminUnlocked`.


**Společný bezpečnostní audit 23. 9. 2026:** proti přesnému SHA `b52745fe6c84a58b3187bc0f5fdd39593c9df59f` a výhradně TEST `cgshssdjgzzuprlwnabl` proběhla čtecí inventura 20 tabulek, 24 RPC vystavených typovým API, 48 migračních souborů a čtyř RaK Edge Functions. Actions run #202 na témže SHA doložil 18 anonymních/neplatných-JWT HTTP sond bez zápisu; navíc ruční sondy odmítly anonymní i záměrně neplatný JWT na `rak-admin-users` a `rak-absence-calendar` HTTP 401. Navazující živý katalogový audit na development HEAD `a9486dc5f38e06a2957d8a6d09c14b17eb346655` ověřil přímo v TEST `pg_catalog`, `pg_policies` a tabulková GRANT oprávnění: všech 20 veřejných tabulek má RLS zapnuté; `anon` ani `authenticated` nemají na veřejných tabulkách přímý `INSERT`/`UPDATE`/`DELETE`; anonymní RPC allowlist tvoří přesně šest funkcí. Pět z nich je záměrně veřejných `SECURITY DEFINER` endpointů (`rak_admin_account_requires_auth`, `rak_app_keepalive`, login V1/V2 a `rak_submit_bug_report_v2`), šestá `rak_admin_auth_capabilities` není SECURITY DEFINER. Drift testu byl opraven přidáním záměrně veřejného, rate-limitovaného `rak_lookup_account_for_login_v2`; opravená rollback-only matice byla před commitem spuštěna přímo proti TEST a prošla: anonymní i unsigned-authenticated kontext neviděl maskovaná admin nastavení, ověřená owner session se syntetickými request claims je viděla a transakce byla vrácena. Supabase security advisor tyto veřejné SECURITY DEFINER funkce správně hlásí jako body k vědomému posouzení; současný provozní model je používá jako omezené veřejné API a bez důkazu se jejich EXECUTE grant neruší. Skutečně podepsaná end-to-end role matrix owner/admin/deputy/cizí/odvolaná relace stále chybí, proto P0.1, P0.3, P0.4, P1.1 a P1.2 zůstávají procentně beze změny. Žádný platný JWT, service-role klíč ani osobní obsah nebyl zapsán do logu nebo repozitáře.

**Doplnění bezpečnostního balíku 23. 9. 2026:** živé regresní matice odhalily skutečnou defense-in-depth mezeru: RLS už skryla vnořené `loginNumber`, ale zápisový guard veřejných `machine_settings` tento klíč ještě neodmítal. Kandidát byl nejprve ověřen v transakci s `ROLLBACK` a poté nasazen pouze do TEST migrací `20260923045532_rak_block_login_number_in_public_machine_settings`. Po změně je všech osm testovaných rekurzivních identit (`appAccounts`, `applicationAccounts`, `workers`, `loginNumber`, `accountNumber`, `roster`, `employees`, `staff`) odmítnuto už při zápisu do veřejné kategorie; soukromý `WORKER_ROSTER_SETTINGS` zůstává oddělený. Současně byly matice opraveny tak, aby neobcházely přísnější serverovou ochranu, veřejný RPC allowlist počítal šest záměrných funkcí a test už neobsahoval natvrdo konkrétní owner OS číslo. `security-recursive-worker-matrix.sql`, `security-public-data-matrix.sql`, `security-public-surface-matrix.sql` a upravená privacy matice prošly proti TEST; všechny testovací zápisy byly rollback-only. Procenta zůstávají beze změny, protože stále chybí skutečně podepsaná end-to-end role matrix.

**Podepsaná TEST role matrix 23. 9. 2026:** na přesném development SHA `72d1fd7870a917728967a1f1487c757e2b6684bc` vznikly pouze po dobu testu náhodné Auth účty owner/admin/deputy/cizí účet a skutečné Supabase relace. Dvacet kontrol potvrdilo role v `rak_admin_context`, odmítnutí anonymního a cizího účtu, owner-only seznam profilů a kompletní owner zálohu, povolení `rak-admin-users` jen owner/admin a odmítnutí deputy/cizího účtu. Owner odvolal dočasné deputy zařízení; původní podepsaný token i jeho opětovná registrace byly odmítnuty. Doplňková zkouška po explicitním ověření existence session potvrdila, že nové přihlášení stejným stále platným heslem vytvoří novou povolenou relaci, zatímco starý token zůstane blokovaný. První rychlý doplňkový pokus narazil před viditelností session na HTTP 401, bezpečně uklidil oba účty a nebyl vydán za úspěch; jediný řízený opakovaný pokus prošel. Po každé zkoušce se Auth uživatelé i admin profily vrátili z 3 na 3. Klíče, hesla, JWT ani osobní odpovědi nebyly logovány. Běžný zaměstnanec zůstává OS-only bez Auth tokenu, takže pro privilegované RPC odpovídá již ověřenému anonymnímu kontextu. Tím se P0.1 a P0.3 zvyšují na 60 % a P0.4, P1.1 a P1.2 na 80 %; fyzický Safari/PWA test zůstává otevřený.

### P1.3 – Reprodukovatelný build, testy a jednotná verze · **100 % (6/6)**

**Systémový problém:** řetězec `tools/development-version-17048.mjs` přepisuje soubory po verzích; historické VM testy vyřezávají úseky podle textových komentářů. Nová funkce mezi značkami už opakovaně rozbila staré testy. Úspěšný build 1.7.69 neznamená vyřešenou architekturu.

- [x] Základní úplné CI: dvě sestavení, `npm run check`, kritické a historické testy, CRC, Chromium/offline, TEST HTTP a opakované benchmarky; úspěšný referenční běh pro commit `1693c863`.
- [x] Přidána dočasná pojistka proti růstu verzovaných přepisovacích skriptů nad 1.7.69 a preflight kontrola politiky sestavení.
- [x] **S2 – jeden neměnný zdrojový strom:** převést transformovaný stav do normálních zdrojových modulů; build píše pouze do odděleného výstupu a nemění zdrojové soubory ani Git pracovní strom. Neztratit verzi 1.7.69 jako referenci.
- [x] **S3 – stabilní testy:** křehké soukromé VM a výřezy mezi komentáři v gate testech 1.7.57–1.7.69 byly nahrazeny sdílenou runtime fixture, pojmenovanými deklaracemi, syntakticky vymezenými podmínkami a skutečnými browser testy; bezpečnostní a provozní scénáře zůstaly zachovány.
- [x] Jediný zdroj metadat verze/build ID; HTML, aplikace, SW, build manifest, cache a technická verze `1.7.0` čtou společný metadatový modul. Dva čisté buildy stejného SHA porovnává kanonický build a CI dovoluje jen výslovně deklarovaný proměnný ZIP.
- [x] Prokázána regresní parita před/po migraci pro data, rotaci, exporty, offline, oprávnění, rollback a rychlost. Strojově čitelný manifest mapuje referenční 1.7.69 na současné důkazy a CI kontroluje jejich skutečné zapojení po dvou čistých kanonických buildech bez dalšího verzovaného přepisovacího skriptu.

**Dokončení:** další funkční úpravy už nevyžadují nový `development-version-17xxx.mjs` ani přepis historických gate testů při každé verzi. Do migrace nový řetězec neprodlužovat a nezkracovat testy kvůli zelenému CI.

### P1.4 – Ověření před nasazením, deployment a rollback · **100 % (6/6)**

- [x] Je doložen proces kontroly přesného Git SHA, Actions SUCCESS, Vercel READY a HTTP/testovací konfigurace na referenčním release 1.7.69.
- [x] Existuje nedestruktivní rollback preflight a kontrola politiky přeskočení nerelease/test-only změn.
- [x] **S4 – brána před releasem:** automatické Vercel Git deploymenty pro `development` jsou v `vercel.json` vypnuté a CI změnu hlídá samostatným kontraktem. SHA `50795a7cd13c0733523b0cb5decabeed00b838bf` nevytvořil před CI žádný deployment; teprve po Actions runu `35606650384` SUCCESS byl přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, READY se stejným SHA, platným development aliasem a HTTP 200. `main` zůstal beze změny.
- [x] Fail-closed pravidla dovolují přeskočit Vercel build pouze přesně vyjmenovaným dokumentačním souborům; změna workflow, spustitelného testu, nástroje, konfigurace, runtime nebo neznámé cesty vždy vyžádá build.
- [x] Bezpečně proveden skutečný PREVIEW rollback přes izolovaný dočasný alias: před, během i po návratu aplikace odpověděla HTTP 200; rollback mířil na READY deployment SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c`, návrat na READY SHA `7698b442e8826cff94127611db62e459f70199fc`; dočasný alias byl odstraněn a development/main/produkční aliasy zůstaly beze změny.
- [x] Automatický fail-closed řetězec je doložen na konkrétním release SHA `630c1d0e3a85d16498af4e4e622198cdb55066f0`: Actions [run #201](https://github.com/martinspadrna/RaK/actions/runs/35809836817) SUCCESS spojil povinné kontroly a dva čisté kanonické buildy s preview `dpl_E6wuKEDamizLudSyqoT1VRn6u6Jo`, READY na témže SHA. Neměnný deployment i stabilní development alias prošly HTTP kontrolou HTML, `sw.js`, release metadat `1.7.77`/`1.7.0`/`v1.7.77-pwa-durable-rotation1` a TEST Supabase `cgshssdjgzzuprlwnabl`; produkční ID `bkqamcbkiwumsvelahxr` ve výstupu chybí. Artefakt `rak-release-evidence-630c1d0e3a85d16498af4e4e622198cdb55066f0` je uchován 90 dní. Konkrétní nedestruktivní rollback cíl je READY `dpl_C8CgASwYwFpBLyLcNkdQwfa5v6TW` na SHA `23b14e6b70460819df2508f1710cf697dd907046`; postup ověří cíl, přepne pouze stabilní development alias a znovu zkontroluje HTML, SW, metadata a TEST izolaci. `main` ani produkční deployment se nezměnily.

**Dokončení:** vadný commit se nesmí automaticky nasadit před úspěšným CI; rollback je prakticky vyzkoušen, ne jen popsán.

### P1.5 – Úplné zálohy a ověřitelná obnova · **43 % (3/7)**

- [x] Záloha zdrojů a owner ZIP mají inventář, manifest a CRC; zahrnuta kontrola zdrojových Git blobů.
- [x] Zpracován inventář databázového schématu, Auth, Storage a rozdělení TEST/produkce.
- [x] Ověřen nedestruktivní shadow/rollback-only pokus a kontrakt; **není to nezávislá plná obnova**.
- [ ] Bezpečně obnovit všechna potřebná TEST data a schéma do odděleného projektu po výslovném schválení případných nákladů; žádné mazání originálu.
- [ ] Ověřit obnovu Auth, Storage, rolí/RLS, pořadí migrací a relevantních revizí dat; zdokumentovat omezení zálohování přihlašovacích údajů.
- [ ] Fyzicky stáhnout a soukromě otevřít ZIP na iPhonu a ověřit integritu.
- [ ] Provedený restore porovnat kontrolními počty, hashi a funkčními testy; mít zkušební návrat a postup při selhání.


**Čtecí kontrola záloh TEST 23. 9. 2026:** `supabase backups list --project-ref cgshssdjgzzuprlwnabl` vrátil `backups=[]`, `pitr_enabled=false`, `walg_enabled=true`, region `eu-central-1`. Zapnutá interní WAL-G schopnost bez uvedené obnovitelné zálohy ani PITR není důkaz obnovy. Nebyl vytvořen nový projekt, nic nebylo obnoveno ani smazáno; P1.5 proto zůstává 43 %.

**Připravenost oddělené obnovy 23. 9. 2026:** čtecí příkaz `supabase branches list --project-ref cgshssdjgzzuprlwnabl` vrátil `null`, tedy TEST nemá žádnou preview větev. Preview větev není náhradou plné obnovy: podle [Supabase Branching](https://supabase.com/docs/guides/deployment/branching) je ve výchozím stavu bez produkčních dat a bez Storage objektů a její provoz může být zpoplatněn. [Databázové zálohy](https://supabase.com/docs/guides/platform/backups) neobsahují samotné Storage objekty ani obnovitelné přihlašovací údaje vlastních rolí. [Obnova do nového projektu](https://supabase.com/docs/guides/platform/clone-project) je beta a vyžaduje samostatně obnovit Storage objekty, Edge Functions, Auth nastavení/API klíče, Realtime a další konfiguraci. Proto je předem připravená schvalovací brána: po výslovném souhlasu vytvořit nový oddělený recovery projekt, zachovat originální TEST beze změny, obnovit a porovnat DB/Auth/Storage/role; větev lze použít nanejvýš k doplňkovému testu schématu. Bez skutečného výsledku se checkboxy ani 43 % nemění.

**Rozhodnutí o nákladech 23. 9. 2026:** vlastník povolil pouze bezplatnou variantu. Dva vlastní aktivní Free projekty už obsazují oba bezplatné sloty; další dva viditelné projekty patří jinému účtu a nejsou recovery cílem RaK. Žádný nový projekt, placená větev, PITR ani add-on proto nevznikl a žádný existující projekt nebude kvůli testu pozastaven. P1.5 zůstává 43 %.
**Dokončení:** lze doložit, že jsme obnovili použitelnou oddělenou instanci, ne pouze vygenerovali ZIP nebo spustili transakci ROLLBACK.

## P2 · Mobil, offline a provozní kvalita

### P2.1 – Výkon a start PWA · **20 % (1/5)**

- [x] Automatizovaný Chromium start a tři nezávislá měření v CI.
- [ ] Opakovaně změřit skutečný iPhone Safari/PWA na studeném a teplém startu.
- [ ] Stanovit a vynucovat smysluplné časové/velikostní rozpočty se záznamem baseline a odchylek.
- [ ] Změřit offline start, návrat online, aktualizaci SW a chování při pomalé síti.
- [ ] Po stabilizaci architektury potvrdit, že výkon a první vykreslení po migraci nemají regresi vůči 1.7.69.

**Dokončení:** opakovatelné měření a nepřekročené prahy na reálném telefonu i CI.

### P2.2 – Rozložení, CSS, DOM a interakce · **40 % (2/5)**

- [x] Chromium ověřuje Home, navigaci, mobilní viewport a offline návrat.
- [x] Existují regresní kontroly geometrie TO/MO, absence a přetečení pro emulované rozměry.
- [ ] Reálné iPhone screenshoty světlého/tmavého režimu, safe-area, klávesnice, spodní navigace, editace tabulek a exportu.
- [ ] Proklik rolí owner/admin/deputy/běžný uživatel; ověřit DOM události a skutečné interakce, ne jen přítomnost textu v HTML.
- [ ] Porovnat před/po migraci kritické obrazovky a přidat stabilní regresní testy bez křehkých textových výřezů.

**Dokončení:** žádné kritické překryvy, uříznutá tlačítka či nefunkční akce na fyzickém iPhonu.

### P2.3 – Offline, lokální fronta, aktualizace a konflikty · **25 % (2/8)**

**Aktuální uživatelská závada:** fyzický iPhone po releasu 1.7.79 potvrdil dvě oddělené věci. Falešný „Konflikt synchronizace“ už po návratu online a restartu nevzniká, takže oddělení offline cache od synchronizační fronty se chová správně. Samotná Rotace však po studeném startu bez internetu stále není načtená. Zároveň po zapnutí internetu běžící aplikace hlásí „Supabase není připojena“ až do restartu. Zpřísněný Chromium test následně prokázal, že nová 1.7.80 umí obnovit persisted Rotaci při cold-offline startu i po smazání běžné HTTP cache; selhal až reconnect, protože test záměrně blokuje všechna externí HTTPS a Supabase SDK bylo stále startovací závislostí na jsDelivr. Finální návrh 1.7.80 proto odstraňuje tuto závislost úplně: přesně `@supabase/supabase-js@2.110.7` se při canonical buildu bere z npm, jeho UMD soubor se fail-closed ověří SHA-384 proti známému SRI hashi a publikuje jako `vendor/supabase-2.110.7.js`. Service worker ho má v `WARM_START` i `OFFLINE_REQUIRED`, takže SDK i sync vrstva jsou same-origin a dostupné při studeném offline startu. Reconnect loader zůstává jako pojistka a po `online` události umí znovu aktivovat synchronizaci bez reloadu. **P2.3 zůstává na 25 %, dokud fyzický iPhone nepotvrdí správný offline rozpis i reconnect bez restartu; implementace ani Chromium PASS samy o sobě bod neuzavírají.**

- [x] Pravdivé online/cache stavy, retry a ochrana historických/neznámých úloh v místní frontě před tichou ztrátou.
- [x] Ochrana editovaných návrhů před opožděnou síťovou odpovědí a jednotkové testy selektivního lokálního mazání.
- [ ] **S5 – zjistit skutečnou příčinu iPhonu:** bezpečně rozlišit jiné zadržené úlohy, zbývající rozpisovou položku, opakované založení konfliktu, `storageIssue` a neaktuální UI stav; jen počty a sanitizované typy, bez osobních údajů.
- [ ] Před případným vyřazením **jediné konkrétní** konfliktní položky poskytnout privátní export původních bajtů, read-only kontrolu serveru, jasný důsledek a potvrzení; zachovat ostatní frontu a data.
- [ ] Zpracovat konflikty podle typu (rozpis / stroj / ostatní), bez automatického přepisu novějších online dat a bez falešného zeleného stavu.
- [ ] Zavést a otestovat serverově atomický CAS / revizi pro relevantní zápisy, včetně konkurence dvou zařízení; samotná shoda čísla revize bez obsahu nedovoluje přepsání.
- [ ] Ověřit staré PWA/service worker, dvojí instanci, aktualizace a offline→online bez reprodukce starého konfliktu či ztráty dat.
- [ ] Na fyzickém iPhonu potvrdit: po legitimním vyřešení konflikt zmizí a nevrátí se po restartu; online rozpis, jiná fronta a neodeslané údaje zůstanou konzistentní.

**Důkaz balíku 1.7.71:** regresní brána `release-gate-17071.test.mjs` rozlišuje shodný a skutečně odlišný profil, zachovává pravé administrátorské konflikty a bezpečně uklízí pouze historický automatický `local-seed`. Skutečný mobilní Chromium test ukládá značkovací Rotaci, restartuje aplikaci offline, načte Rotaci i sync moduly z cache a po návratu online požaduje nulový počet konfliktů. Fyzický test iPhonu na 1.7.77 neprošel ani přes stabilní sdílený development odkaz; nejde tedy o potvrzenou opravu a procento se nezvyšuje.

**Dokončení:** popsaná závada reprodukována a odstraněna bez plošného mazání Safari/PWA a bez neověřených serverových zápisů. Dokud trvá, P2.3 nesmí být uzavřen.

### P2.4 – Diagnostika, soukromí telemetrie a nepřetržitá kvalita · **33 % (2/6)**

- [x] Existuje čtecí diagnostika Auth, typů/počtů fronty a základní kategorizace chyb bez potřeby vystavovat syrové payloady.
- [x] Chromium/offline kontroly a měření výkonu dávají opakovatelné základní provozní signály.
- [ ] Zviditelnit konkrétní sanitizovanou příčinu konfliktní hlášky na problematickém iPhonu; rozlišit stav aplikace, fronty a chybu úložiště.
- [ ] Auditovat, že logy, reporty, telemetrie, screenshoty a exporty neobsahují tokeny, OS čísla, jména nebo obsah rozpisů mimo určený soukromý kontext.
- [ ] Zajistit verifikaci skutečných rolových JWT a konkrétní diagnostiku odmítnutých operací bez prozrazení přihlašovacích údajů.
- [ ] Zavést měřitelné výkonnostní/konfliktní prahy, periodické regresní testy a jednoznačné výsledky PASS/FAIL; pouhé upozornění nesmí být hlášeno jako úspěch.

**Dokončení:** příčinu provozní chyby lze najít bez prohlížení nebo mazání cizích dat; testy skutečně blokují nebezpečný release.

---

## Pořadí práce – žádné další vrstvení záplat

1. **P1.4 dokončeno:** automatický důkazní řetězec releasu je povinnou fail-closed bránou každého dalšího funkčního releasu.
2. **P0.1/P0.3/P0.4/P1.1/P1.2:** společný bezpečnostní balík v TEST: inventář privilegovaných RPC, `SECURITY DEFINER`, `GRANT`, RLS a veřejných zápisových cest; negativní anonymní/neplatné JWT, rozsah osobních údajů, staré klienty/exporty/cache a skutečná role matrix owner/admin/deputy/běžný uživatel/cizí účet/odvolaná relace. Podepsané JWT nikdy nelogovat.
3. **P1.5:** pokračovat přípravou obnovy a kontrolami záloh; placený nebo nový oddělený projekt až po předchozím souhlasu vlastníka.
4. **P2.3 znovu aktivováno pokynem vlastníka 23. 9. 2026:** opravit persistence/arbitráž jako jednu klientskou vrstvu, nemazat frontu ani uživatelská data a nevydávat stav za opravený bez fyzického iPhone testu.
5. **P2.1/P2.2/P2.4:** měřené Safari, vizuální a provozní regrese a bezpečná diagnostika po prioritním bezpečnostním balíku.

**Pravidlo dodávky:** tematické balíky a minimum commitů/deploymentů. Před releasem syntax + relevantní unit/integrace + dvě čisté sestavy + legacy/security/offline/browser testy + ZIP/CRC + TEST HTTP; po releasu přesný SHA, Actions SUCCESS, Vercel READY se stejným SHA, HTTP a zaměřený iPhone checklist. Nikdy nezaměňovat „test prošel v Chromiu“ s „ověřeno na iPhonu“. Produkční `main` ani produkční Supabase neupravovat bez výslovného souhlasu. Žádná destruktivní akce bez předchozí zálohy, ověřeného cíle a vědomého potvrzení.

## Záznam aktualizací

- **23. 9. 2026 – fyzický iPhone odhalil Vercel Deployment Protection jako blokátor developmentu:** i přes READY preview a zelené autentizované CI vracel stabilní development alias anonymním požadavkům na `app.js`, `supabase-config.js`, release metadata a self-hosted Supabase vendor HTTP 302 na Vercel SSO s `Cache-Control: no-store`. Na iPhonu se proto otevřelo HTML, ale online runtime nebyl kompletní: Supabase hlásila odpojení, aktualizace se nespustila a přihlášení nemohlo vyhledat osobní číslo. Release pipeline nově vytváří `alias-protection-override` pouze pro stabilní development alias; projektová ochrana a produkční alias zůstávají beze změny. Následný release se smí považovat za úspěšný jen pokud anonymní HTTP bez Vercel tokenu vrátí 200 pro HTML, SW, metadata, TEST Supabase config, `app.js` a Supabase vendor. P2.3 zůstává 25 % do opakovaného fyzického iPhone testu.

- **23. 9. 2026 – 1.7.80 převedena na self-hosted Supabase SDK:** zpřísněný browser test už prokázal cold-offline obnovu Rotace bez běžné HTTP cache, ale reconnect odhalil zbylou externí startovací závislost na jsDelivr. Místo povolení CDN v testu se Supabase JS 2.110.7 nyní při canonical buildu bere z přesně pinované npm dependency, ověřuje se SHA-384 proti dosavadnímu SRI a publikuje do `vendor/supabase-2.110.7.js`. Vendor je povinný v public outputu, `WARM_START` i `OFFLINE_REQUIRED`; `index.html` už pro Supabase nepoužívá externí CDN. Tím cold-offline start ani reconnect nejsou závislé na třetí straně. P2.3 zůstává 25 % do fyzického iPhone PASS.

- **23. 9. 2026 – připraven release 1.7.80 pro skutečný cold-offline boot a reconnect bez reloadu:** fyzický iPhone potvrdil, že 1.7.79 odstranil falešný konflikt po návratu online, ale offline Rotace stále nebyla dostupná a Supabase po zapnutí internetu zůstávala odpojená do restartu aplikace. Příčina reconnectu je externí Supabase SDK z CDN, jehož neúspěšný offline `<script>` se sám neopakoval; offline Rotace navíc nesmí čekat na background warmup sync vrstvy. 1.7.80 proto čeká na aplikaci persisted Rotace při offline bootu a po `online` události znovu načte Supabase SDK + sync bez reloadu. Browser test před offline reloadem maže HTTP cache, takže už nemůže uspět jen díky předem nacachovanému CDN skriptu. P2.3 zůstává 25 % do fyzického iPhone PASS; `main` a produkční Supabase beze změn.

- **23. 9. 2026 – release 1.7.79, systémová oprava offline persistence Rotace:** online snapshot se ukládá přes jediný ověřovaný kontrakt do localStorage i samostatné CacheStorage, obě kopie nesou porovnatelné `revision`/`savedAt`/fingerprint metadata a po zápisu se skutečně zpětně čtou. Offline start vybírá nejnovější důvěryhodný kandidát místo pevného localStorage-first pořadí a případnou starší druhou kopii bezpečně opraví bez zápisu do synchronizační fronty. Sanitizovaná diagnostika zpřístupňuje pouze existenci, zdroj, revizi, stáří, počet kopií a agregovaný stav fronty. Browser test záměrně vytváří stale localStorage proti novější durable kopii a vyžaduje opravu. P2.3 zůstává 25 % do fyzického iPhone potvrzení; `main` a produkční Supabase beze změn.

- **23. 9. 2026 – P1.4 dokončeno automatickým auditním řetězcem konkrétního releasu:** release SHA `630c1d0e3a85d16498af4e4e622198cdb55066f0` prošel Actions [runem #201](https://github.com/martinspadrna/RaK/actions/runs/35809836817) SUCCESS. Povinné syntax/check/unit/integrace, security a offline regrese, ZIP/manifest/CRC, skutečný Chromium smoke, TEST HTTP a dva čisté kanonické buildy proběhly před finálním preview deploymentem. Deployment `dpl_E6wuKEDamizLudSyqoT1VRn6u6Jo` je READY se stejným SHA; stabilní development alias ukazuje na tento deployment. HTTP ověřilo `1.7.77`, technickou `1.7.0`, build `v1.7.77-pwa-durable-rotation1`, TEST Supabase `cgshssdjgzzuprlwnabl` a nepřítomnost produkčního ID `bkqamcbkiwumsvelahxr`. Strojový artefakt `rak-release-evidence-630c1d0e3a85d16498af4e4e622198cdb55066f0` (ID `10729621310`) je uložen do 22. 12. 2026 a obsahuje návrat na READY `dpl_C8CgASwYwFpBLyLcNkdQwfa5v6TW` / SHA `23b14e6b70460819df2508f1710cf697dd907046`. `main` zůstal `ceca9f9644da3dc41059c5d232661d27bc6dba18`; produkční alias zůstal na `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`. P1.4 stoupá na 100 % (6/6). Současně je zaznamenán neúspěšný fyzický iPhone test 1.7.77: studený start instalované PWA v režimu letadlo Rotaci nenačetl a po návratu online vznikl konflikt; P2.3 zůstává 25 % a je rozhodnutím vlastníka odloženo. Tato následná změna plánu je pouze dokumentační, verzi nezvyšuje a nový Vercel deployment nevytváří.
- **22. 9. 2026 – release 1.7.77 pro skutečný offline start PWA a fail-closed deploy policy ověřen a nasazen:** online načtená Rotace se vedle kanonického `localStorage` zrcadlí do samostatné trvalé CacheStorage, která není verzovanou SW cache; studený offline start umí z této kopie obnovit lokální stav. Offline nebo chybné čtení vzhledu účtu je výslovně označeno jako nedostupné a nesmí založit automatický zápis. Starší nekritická položka vzhledu se po ověření novějšího serverového stavu ukončí bez globálního konfliktu. Chromium test už nemaže problém ručním vložením do `localStorage`: ukládá přes aplikační API, lokální kopii odstraní a vyžaduje obnovu z CacheStorage. Vercel skip policy nyní dovoluje přeskočit build jen přesně vyjmenovaným dokumentům; workflow, testy, nástroje a neznámé cesty vždy build spustí, takže P1.4 stoupá na 83 % (5/6). Fyzický iPhone zůstává povinným neuzavřeným důkazem; `main` a produkční Supabase beze změn. Runtime SHA `445f6d180efaae8e02d6a3dc8fa8c8195663f5a5` prošel Actions runem `35784911598` (#192) SUCCESS. Preview `dpl_Erg2nVhGsQtdgpRk81wBz7A9tPcy` je READY, `aliasError` je prázdný a odpovídá témuž SHA; autentizovaný HTTP průchod ověřil metadata `1.7.77` / `1.7.0` / `v1.7.77-pwa-durable-rotation1` a TEST Supabase. Neautentizovaný development alias zůstává chráněn přihlášením Vercel.
- **22. 9. 2026 – P1.3 dokončeno regresní paritou:** strojově čitelný manifest `tools/regression-parity.json` váže referenční release 1.7.69 na sedm povinných oblastí: data, rotaci, exporty, offline, oprávnění, rollback a rychlost. `tools/regression-parity-contract.test.mjs` ověřuje existenci původních důkazů, zachování současných scénářů a jejich skutečné spuštění v `npm run check` nebo povinném CI. Současně hlídá dva čisté kanonické buildy, čistý Git strom a zákaz `development-version-17070.mjs`. Referenční Actions run `35750687960` pro SHA `173d57fdf2c0e6dc8af5abcf9928240c383e5649` prošel všemi build, runtime, offline Chromium, benchmark, ZIP/CRC a TEST HTTP kroky; odpovídající preview `dpl_FKtZmysaTpjWibxTAzRyVP1shzkw` je READY a development alias vrací HTTP 200 s verzí 1.7.76. P1.3 je 100 % (6/6). Jde o testovací a dokumentační uzavření již nasazeného releasu 1.7.76, proto se verze znovu nezvyšuje a nevytváří další deployment. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – jednotná metadata releasu 1.7.76:** nový `rak-release-metadata.js` je jediným spustitelným zdrojem viditelné verze, technické verze, cache verze a build ID. Načítá se před prvním rozhodnutím v HTML, používá jej aplikace, Supabase konfigurace, service worker i kanonický build a je součástí offline jádra. Historické release gate testy 1.7.71–1.7.75 používají společný metadatový kontrakt místo ručních seznamů následníků; nová brána 1.7.76 zakazuje kopie aktuální identity v runtime/build souborech. P1.3 se zvyšuje na 83 % (5/6); zbývá úplná regresní parita před/po migraci včetně fyzického iPhonu. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – S3 dokončeno pro historické runtime gate testy:** zbývající testy 1.7.57–1.7.66 přešly na společnou `runtime-vm-fixture.mjs`; používají pojmenované deklarace a syntakticky vymezené podmínkové bloky. Geometrii absence a MO/TO nadále ověřují skutečné Chromium testy, zatímco jednotkové kontrakty už nespouštějí jednotlivé řádky vyříznuté podle komentářů. CI kontrakt nyní hlídá celý rozsah 1.7.57–1.7.69 proti návratu soukromého `node:vm`, `runInNewContext` a lokálních source-slicerů. P1.3 se zvyšuje na 67 % (4/6); sjednocení metadat verze a úplná regresní parita zůstávají otevřené. Jde pouze o testovací infrastrukturu, proto viditelná aplikace zůstává 1.7.75 a nový Vercel deployment se nevytváří. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – S3, první stabilní testovací fixture:** testy 1.7.67–1.7.69 používají společnou browser/VM fixture, explicitně pojmenované deklarace a syntakticky vymezené podmínkové bloky místo výřezů mezi komentářovými značkami. Fixture má vlastní negativní testy a CI kontrakt zakazuje návrat soukromých VM/excerpt implementací v migrovaných gate testech. Historické scénáře zůstaly zachované; S3 zůstává otevřené, dokud stejným způsobem nepřejdou starší gate testy 1.7.57–1.7.66. P1.3 proto zůstává 50 % (3/6). Viditelná verze zůstává 1.7.70, protože balík nemění runtime aplikace ani nevytváří nový deployment. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – S2, kanonické zdroje a izolovaný výstup:** ověřený artefakt funkčního stavu 1.7.69 z běhu na SHA `5d14e396c4d0ff2dc249e4fff2dbb9418e182898` byl po kontrole manifestu a SHA-256 převeden do kanonických zdrojů a pro nový preview release přímo označen jako 1.7.70 (`v1.7.70-canonical-source1`). Veřejný build nyní pracuje v `.rak-canonical-build/work`, publikuje do `.rak-dist`, hlídá čistý Git strom a porovnává dva průchody; ZIP je jediný výslovně deklarovaný proměnný artefakt. Historický přepisovací řetězec zůstal zmrazený jako kompatibilní překladač, nevznikl žádný 1.7.70 patch. P1.3 se zvyšuje na 50 % (3/6); S3 a sjednocení metadat zůstávají otevřené. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – skutečná CI-before-deploy brána:** commit `50795a7cd13c0733523b0cb5decabeed00b838bf` vypnul automatické Vercel Git deploymenty pouze pro `development` a přidal kontrakt brány do povinného CI preflightu. Push nevytvořil žádný Vercel deployment; po Actions runu `35606650384` SUCCESS (run #135) byl ručně přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, který je READY na témže SHA, development alias má `aliasError: null` a odpovídá HTTP 200 (`text/html`, 53 265 B). P1.4 se zvyšuje na 67 % (4/6). Obecná branch/ruleset ochrana, odolnost proti změně workflow a automatické ukládání úplného důkazního řetězce budoucích releasů zůstávají otevřené. Produkční deployment zůstává READY na main SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`; produkční Supabase beze změn.
- **21. 9. 2026 – stabilní opakovaný build a ověřený preview rollback:** development SHA `7698b442e8826cff94127611db62e459f70199fc`, Actions run `35601348892` SUCCESS; tři shodné build průchody doložily digest `3dd1b5351a3e695523e2cf07d050da624cf7bdcd77c8b995bf17f2f052b1fac1`. Vercel development deployment `dpl_CDWKvYAjTnA9kM4xe9SJweD3gQuW` je READY na stejném SHA. Izolovaný preview alias byl ověřen před rollbackem, během přepnutí na READY SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c` i po návratu (vždy HTTP 200, `text/html`, 53 102 B) a následně odstraněn. P1.4 se zvyšuje na 50 % (3/6); striktní CI-before-deploy brána zůstává otevřená. `main` a produkční Supabase beze změn.
- **21. 9. 2026 – nový měřitelný plán:** zachováno všech 13 oblastí; P1.3 zůstává otevřený; přidána kontrolovatelná podkritéria a procenta, S1–S6 mapovány dovnitř plánu. Nejedná se o dodání nové funkcionality ani o potvrzení opravy konfliktu. Další aktualizace zapisovat do tohoto souboru, s evidence pro změny `[x]` i procent.
